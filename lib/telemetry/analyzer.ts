/**
 * analyzer.ts — Segment-based lap analysis engine.
 *
 * Pipeline:
 *  1. Detect segments on user lap and reference lap
 *  2. Compute real delta via delta.ts
 *  3. For each matched corner segment run per-segment rules
 *  4. Build flat AnalysisInsight[] (for feedback panel)
 *  5. Compute optimal lap from best segments
 *  6. Build chart channels
 */

import type {
  ParsedLap, TelemetryRow, LapAnalysisResult, AnalysisInsight,
  SectorAnalysis, SegmentAnalysis, SegmentInsight, TrackSegment, OptimalLap, SubScores,
} from "@/types/telemetry";
import { computeDelta, deltaPerSegment } from "./delta";
import { detectSegments, matchSegments } from "./segments";

// ─── Resampling helpers ───────────────────────────────────────────────────────

export function resampleByDistance(
  rows: TelemetryRow[],
  points = 200
): { speed: number[]; throttle: number[]; brake: number[]; gear: number[] } {
  const totalDist = rows[rows.length - 1].lapDist ?? 0;
  const channels = { speed: [] as number[], throttle: [] as number[], brake: [] as number[], gear: [] as number[] };

  for (let i = 0; i < points; i++) {
    const targetDist = totalDist === 0 ? 0 : (i / (points - 1)) * totalDist;
    let lo = 0, hi = rows.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if ((rows[mid].lapDist ?? 0) < targetDist) lo = mid; else hi = mid;
    }
    const dLo = rows[lo].lapDist ?? 0;
    const dHi = rows[hi].lapDist ?? 0;
    const t = dHi === dLo ? 0 : (targetDist - dLo) / (dHi - dLo);
    const lerp = (a: number, b: number) => a + (b - a) * t;
    channels.speed.push(lerp(rows[lo].speed, rows[hi].speed));
    channels.throttle.push(lerp(rows[lo].throttle, rows[hi].throttle));
    channels.brake.push(lerp(rows[lo].brake, rows[hi].brake));
    channels.gear.push(Math.round(lerp(rows[lo].gear, rows[hi].gear)));
  }
  return channels;
}

// ─── Sector utilities ─────────────────────────────────────────────────────────

const S_BOUNDS = [0, 0.33, 0.66, 1.0];

function sectorForFrac(f: number): number {
  if (f < S_BOUNDS[1]) return 0;
  if (f < S_BOUNDS[2]) return 1;
  return 2;
}

function computeSectorTimes(rows: TelemetryRow[]): number[] {
  const total = rows[rows.length - 1].lapDist ?? 0;
  if (total === 0) {
    const t = rows[rows.length - 1].time * 1000;
    return [t / 3, t / 3, t / 3];
  }
  const crossings: number[] = [];
  for (let s = 1; s <= 3; s++) {
    const target = S_BOUNDS[s] * total;
    let best = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      if (Math.abs((rows[i].lapDist ?? 0) - target) <
          Math.abs((rows[best].lapDist ?? 0) - target)) best = i;
    }
    crossings.push(rows[best].time);
  }
  return [
    (crossings[0] - rows[0].time) * 1000,
    (crossings[1] - crossings[0]) * 1000,
    (crossings[2] - crossings[1]) * 1000,
  ];
}

// ─── Academy module mapping ───────────────────────────────────────────────────

const ACADEMY_MAP: Record<string, { id: string; titleRu: string }> = {
  early_brake:    { id: "m3", titleRu: "Основы торможения" },
  late_brake:     { id: "m3", titleRu: "Основы торможения" },
  low_apex_speed: { id: "m7", titleRu: "Трейл-брейкинг" },
  late_throttle:  { id: "m4", titleRu: "Управление газом" },
  early_throttle: { id: "m8", titleRu: "Оптимизация выхода" },
  speed_deficit:  { id: "m7", titleRu: "Трейл-брейкинг" },
};

// ─── Per-segment rules ────────────────────────────────────────────────────────

type CornerClass = "slow" | "medium" | "fast";

function classifyCorner(apexSpeed: number): CornerClass {
  if (apexSpeed < 80)  return "slow";    // hairpins, chicanes
  if (apexSpeed < 150) return "medium";  // standard corners
  return "fast";                          // fast sweepers
}

// Speed factor for time cost — braking mistake at higher speed costs more
function speedFactor(speed: number): number {
  if (speed > 180) return 1.6;
  if (speed > 130) return 1.2;
  if (speed > 80)  return 1.0;
  return 0.7;
}

interface SegmentRuleInput {
  userSeg:    TrackSegment;
  refSeg:     TrackSegment;
  userRows:   TelemetryRow[];
  refRows:    TelemetryRow[];
  segDeltaMs: number;         // from real delta calculation
  totalDist:  number;
  cornerClass: CornerClass;
}

function ruleEarlyBrake(inp: SegmentRuleInput): SegmentInsight | null {
  const { userSeg, refSeg, totalDist, cornerClass } = inp;
  if (!userSeg.brakeStartDist || !refSeg.brakeStartDist) return null;

  const uBrakeFrac = userSeg.brakeStartDist / (inp.userRows[inp.userRows.length - 1]?.lapDist ?? 1);
  const rBrakeFrac = refSeg.brakeStartDist   / (inp.refRows[inp.refRows.length  - 1]?.lapDist ?? 1);
  const diffM = (rBrakeFrac - uBrakeFrac) * totalDist;

  // Threshold depends on corner speed — slow corners need less precision
  const minDiff = cornerClass === "slow" ? 8 : cornerClass === "medium" ? 12 : 18;
  if (diffM < minDiff) return null;

  // Speed-weighted cost: braking early at 200+ km/h is more expensive
  const sf = speedFactor(userSeg.maxSpeed);
  const baseCost = cornerClass === "fast" ? 9 : 7;
  const costMs = Math.round(Math.min(diffM * baseCost * sf, 350));

  const hint = cornerClass === "fast"
    ? `На быстром повороте раннее торможение вызывает перегрузку и нестабильность — попробуй тормозить позже с высоким первоначальным давлением.`
    : `Двигай точку торможения вперёд на 5-8 м за раз. В идеале тормозить поздно с коротким, мощным торможением.`;

  const module = ACADEMY_MAP["early_brake"];
  return {
    type: "early_brake",
    descriptionRu:
      `Торможение на ${Math.round(diffM)} м раньше референса (${Math.round(userSeg.maxSpeed)} → ${Math.round(refSeg.maxSpeed)} км/ч). ` + hint,
    timeCostMs: costMs,
    academyModuleId: module.id,
    academyModuleTitleRu: module.titleRu,
    userValue: Math.round(diffM),
    refValue: 0,
    unit: "м",
  };
}

function ruleLateThrottle(inp: SegmentRuleInput): SegmentInsight | null {
  const { userSeg, refSeg, totalDist, cornerClass } = inp;
  if (!userSeg.throttleOpenDist || !refSeg.throttleOpenDist) return null;

  const uFrac = userSeg.throttleOpenDist / (inp.userRows[inp.userRows.length - 1]?.lapDist ?? 1);
  const rFrac = refSeg.throttleOpenDist   / (inp.refRows[inp.refRows.length  - 1]?.lapDist ?? 1);
  const diffM = (uFrac - rFrac) * totalDist;

  const minDiff = cornerClass === "slow" ? 8 : 10;
  if (diffM < minDiff) return null;

  // Cost scales with length of subsequent straight
  const nextStraightDist = (inp.userRows.at(-1)?.lapDist ?? 0) - userSeg.endDist;
  const straightFactor = Math.min(1.5, 1 + nextStraightDist / 500);
  const costMs = Math.round(Math.min(diffM * 6 * straightFactor, 280));

  const hint = cornerClass === "slow"
    ? `На медленном повороте это критично — потеря скорости на выходе тянется на всю следующую прямую.`
    : `Открывай газ сразу в апексе — начни с 20-30% для стабилизации, затем плавно увеличивай.`;

  const module = ACADEMY_MAP["late_throttle"];
  return {
    type: "late_throttle",
    descriptionRu:
      `Газ на ${Math.round(diffM)} м позже чем у референса. Мин. скорость апекс: ${Math.round(userSeg.minSpeed)} км/ч. ` + hint,
    timeCostMs: costMs,
    academyModuleId: module.id,
    academyModuleTitleRu: module.titleRu,
    userValue: Math.round(diffM),
    refValue: 0,
    unit: "м",
  };
}

function ruleLowApexSpeed(inp: SegmentRuleInput): SegmentInsight | null {
  const { userSeg, refSeg } = inp;
  const uApex = userSeg.apexSpeed ?? userSeg.minSpeed;
  const rApex = refSeg.apexSpeed  ?? refSeg.minSpeed;
  const diff  = rApex - uApex;                          // positive = user slower

  if (diff < 4) return null;

  // Time cost: each km/h in a corner ≈ 18 ms (calibrated against real data)
  const costMs = Math.round(Math.min(diff * 18, 320));
  const module = ACADEMY_MAP["low_apex_speed"];
  return {
    type: "low_apex_speed",
    descriptionRu:
      `Минимальная скорость в апексе: ${Math.round(uApex)} км/ч против ${Math.round(rApex)} км/ч у референса (-${Math.round(diff)} км/ч). ` +
      `Каждый км/ч в апексе даёт скорость на всей следующей прямой. ` +
      `Причины: ранний апекс, избыток торможения или недостаточно плавная дуга поворота.`,
    timeCostMs: costMs,
    academyModuleId: module.id,
    academyModuleTitleRu: module.titleRu,
    userValue: Math.round(uApex),
    refValue: Math.round(rApex),
    unit: "км/ч",
  };
}

function ruleGoodSegment(inp: SegmentRuleInput): SegmentInsight | null {
  const { segDeltaMs } = inp;
  if (segDeltaMs > 80) return null;                     // not good enough
  return {
    type: "good_segment",
    descriptionRu:
      segDeltaMs <= 0
        ? `Отличная работа! Вы быстрее референса на ${Math.abs(segDeltaMs)} мс.`
        : `Хороший участок — разрыв с референсом всего ${segDeltaMs} мс.`,
    timeCostMs: 0,
  };
}


function getExitSpeed(rows: TelemetryRow[], seg: TrackSegment): number {
  // Speed at the last 15% of the corner (exit zone)
  const exitStart = seg.startDist + (seg.endDist - seg.startDist) * 0.75;
  const exitRows = rows.filter(r => (r.lapDist ?? 0) >= exitStart && (r.lapDist ?? 0) <= seg.endDist);
  if (exitRows.length === 0) return seg.maxSpeed;
  return Math.max(...exitRows.map(r => r.speed));
}

function ruleSlowExit(inp: SegmentRuleInput): SegmentInsight | null {
  const { userSeg, refSeg, userRows, refRows } = inp;
  if (userSeg.type !== "corner") return null;

  // Compare actual exit speeds (last quarter of corner)
  const uExit = getExitSpeed(userRows, userSeg);
  const rExit = getExitSpeed(refRows, refSeg);
  const diff = rExit - uExit;

  if (diff < 7) return null;
  // Only flag if apex speed is OK (otherwise low apex rule covers it)
  const apexDiff = (refSeg.apexSpeed ?? refSeg.minSpeed) - (userSeg.apexSpeed ?? userSeg.minSpeed);
  if (apexDiff >= 5) return null;

  const costMs = Math.round(Math.min(diff * 14, 220));
  return {
    type: "speed_deficit" as const,
    descriptionRu:
      `Скорость выхода: ${Math.round(uExit)} км/ч (референс: ${Math.round(rExit)} км/ч). ` +
      `Разница ${Math.round(diff)} км/ч снижает скорость на всей следующей прямой. ` +
      `Открывай газ раньше и плавнее сразу после апекса.`,
    timeCostMs: costMs,
  };
}


function ruleNoTrailBraking(inp: SegmentRuleInput): SegmentInsight | null {
  const { userSeg, refSeg, userRows, refRows } = inp;
  if (userSeg.type !== "corner") return null;

  // Check if user releases brakes BEFORE apex vs reference
  const userApexDist = userSeg.apexDist ?? (userSeg.startDist + userSeg.endDist) / 2;
  const refApexDist  = refSeg.apexDist  ?? (refSeg.startDist  + refSeg.endDist)  / 2;

  // Find last braking point before apex (within 80m)
  const findLastBrake = (rows: TelemetryRow[], apexDist: number) => {
    const searchStart = apexDist - 80;
    const relevant = rows.filter(r => {
      const d = r.lapDist ?? 0;
      return d >= searchStart && d <= apexDist;
    });
    // Last row where brake > 5%
    for (let i = relevant.length - 1; i >= 0; i--) {
      if (relevant[i].brake > 5) return relevant[i].lapDist ?? 0;
    }
    return searchStart;
  };

  const uLastBrakeDist = findLastBrake(userRows, userApexDist);
  const rLastBrakeDist = findLastBrake(refRows,  refApexDist);

  // Reference trails brake closer to apex
  const refTrailM = refApexDist - rLastBrakeDist;
  const userTrailM = userApexDist - uLastBrakeDist;
  const trailDiff = refTrailM - userTrailM; // positive = ref brakes later (trail brakes more)

  if (trailDiff < 15) return null; // not significant

  const costMs = Math.round(Math.min(trailDiff * 5, 150));
  return {
    type: "late_brake" as const,
    descriptionRu:
      `Трейл-брейкинг: референс держит тормоз ещё ${Math.round(trailDiff)} м после вас. ` +
      `Плавное снижение давления в тормозах до апекса помогает повернуть и сохранить скорость.`,
    timeCostMs: costMs,
    academyModuleId: "trail_braking",
    academyModuleTitleRu: "Трейл-брейкинг",
  };
}


// Detects "dead zone" — throttle=0 AND brake=0 — between brake release and apex
// This is a common mistake: the car is neither braking nor accelerating → wasted time
function ruleCoasting(inp: SegmentRuleInput): SegmentInsight | null {
  const { userSeg, refSeg, userRows } = inp;
  if (inp.cornerClass === "fast") return null; // fast corners often have natural lift

  // Find the braking zone end (brake drops below 5%)
  const apexDist = userSeg.apexDist ?? (userSeg.startDist + userSeg.endDist) / 2;
  const brakeEnd = userSeg.brakeStartDist ?? userSeg.startDist;

  // Count rows in the "dead zone" (between brake release and throttle open)
  const deadRows = userRows.filter(r => {
    const d = r.lapDist ?? 0;
    return d > brakeEnd && d < apexDist && r.brake < 5 && r.throttle < 8;
  });
  const deadDist = deadRows.length > 0
    ? (deadRows.at(-1)!.lapDist! - deadRows[0]!.lapDist!)
    : 0;

  // Check ref for comparison
  const refApex  = refSeg.apexDist ?? (refSeg.startDist + refSeg.endDist) / 2;
  const refBrakeEnd = refSeg.brakeStartDist ?? refSeg.startDist;
  const refDeadRows = inp.refRows.filter(r => {
    const d = r.lapDist ?? 0;
    return d > refBrakeEnd && d < refApex && r.brake < 5 && r.throttle < 8;
  });
  const refDeadDist = refDeadRows.length > 0
    ? (refDeadRows.at(-1)!.lapDist! - refDeadRows[0]!.lapDist!)
    : 0;

  const extraCoastM = deadDist - refDeadDist;
  if (extraCoastM < 15) return null;

  const costMs = Math.round(Math.min(extraCoastM * 5, 180));
  return {
    type: "late_throttle" as const,
    descriptionRu:
      `Выбег ${Math.round(extraCoastM)} м без тормоза и газа перед апексом (референс: ${Math.round(refDeadDist)} м). ` +
      `Этот "мёртвый" участок замедляет машину без торможения. ` +
      `Используй трейл-брейкинг вплоть до апекса или открывай газ раньше.`,
    timeCostMs: costMs,
    academyModuleId: "trail_braking",
    academyModuleTitleRu: "Трейл-брейкинг",
    userValue: Math.round(deadDist),
    refValue: Math.round(refDeadDist),
    unit: "м",
  };
}

// ─── Segment analysis ─────────────────────────────────────────────────────────

function analyseSegment(
  userSeg:    TrackSegment,
  refSeg:     TrackSegment | null,
  segDeltaMs: number,
  userRows:   TelemetryRow[],
  refRows:    TelemetryRow[],
  totalDist:  number,
  totalLoss:  number,
): SegmentAnalysis {
  const cornerClass = classifyCorner(userSeg.apexSpeed ?? userSeg.minSpeed);
  const insights: SegmentInsight[] = [];

  if (refSeg && userSeg.type === "corner") {
    const inp: SegmentRuleInput = { userSeg, refSeg, userRows, refRows, segDeltaMs, totalDist, cornerClass };
    const earlyBrake    = ruleEarlyBrake(inp);
    const noTrailBrake  = ruleNoTrailBraking(inp);
    const lateThrottle  = ruleLateThrottle(inp);
    const coasting      = ruleCoasting(inp);
    const lowApex       = ruleLowApexSpeed(inp);
    const slowExit      = ruleSlowExit(inp);
    const good          = ruleGoodSegment(inp);

    // Smart deduplication: only show root cause, not downstream effects
    // If early brake explains low apex speed → skip low apex (it's redundant)
    const earlyBrakeCausesLowApex =
      earlyBrake && lowApex &&
      (earlyBrake.timeCostMs ?? 0) > (lowApex.timeCostMs ?? 0) * 0.8;

    // If coasting detected → skip noTrailBrake (same root cause)
    const skipTrailBrake = !!(coasting && noTrailBrake);

    if (earlyBrake)                                    insights.push(earlyBrake);
    if (noTrailBrake && !earlyBrake && !skipTrailBrake) insights.push(noTrailBrake);
    if (coasting && !earlyBrake)                       insights.push(coasting);
    if (lateThrottle)                                  insights.push(lateThrottle);
    if (lowApex && !earlyBrakeCausesLowApex)           insights.push(lowApex);
    if (slowExit && !lowApex)                          insights.push(slowExit);

    // Cap at 2 most expensive insights per corner to avoid information overload
    if (insights.length > 2) {
      insights.sort((a, b) => (b.timeCostMs ?? 0) - (a.timeCostMs ?? 0));
      insights.splice(2);
    }

    if (good && insights.length === 0)                 insights.push(good);
  }

  const deltaFraction = totalLoss > 0 ? Math.max(0, segDeltaMs) / totalLoss : 0;

  return {
    segment: userSeg,
    refSegment: refSeg,
    userTimeMs: userSeg.timeMs,
    refTimeMs: refSeg?.timeMs ?? userSeg.timeMs,
    deltaMs: segDeltaMs,
    insights,
    deltaFraction,
  };
}

// ─── Flat insight builder ─────────────────────────────────────────────────────

function segmentInsightToFlat(
  si: SegmentInsight,
  seg: TrackSegment,
  totalDist: number,
): AnalysisInsight {
  const severityMap: Record<SegmentInsight["type"], AnalysisInsight["severity"]> = {
    early_brake:    si.timeCostMs > 200 ? "critical" : "warning",
    late_brake:     si.timeCostMs > 200 ? "critical" : "warning",
    low_apex_speed: si.timeCostMs > 200 ? "critical" : "warning",
    late_throttle:  si.timeCostMs > 150 ? "critical" : "warning",
    early_throttle: "warning",
    speed_deficit:  "warning",
    consistent:     "info",
    good_segment:   "good",
  };

  const categoryMap: Record<SegmentInsight["type"], AnalysisInsight["category"]> = {
    early_brake:    "brake",
    late_brake:     "brake",
    low_apex_speed: "speed",
    late_throttle:  "throttle",
    early_throttle: "throttle",
    speed_deficit:  "speed",
    consistent:     "consistency",
    good_segment:   "general",
  };

  const fraction = seg.startDist / totalDist;

  return {
    id: `${si.type}_${seg.id}`,
    severity: severityMap[si.type],
    category: categoryMap[si.type],
    titleRu: `${seg.label}: ${labelForType(si.type)}`,
    descriptionRu: si.descriptionRu,
    timeCostMs: si.timeCostMs,
    sectorIdx: sectorForFrac(fraction),
    segmentId: seg.id,
    lapDistStart: seg.startDist,
    lapDistEnd: seg.endDist,
    academyModuleId: si.academyModuleId,
    academyModuleTitleRu: si.academyModuleTitleRu,
    userValue: si.userValue,
    refValue: si.refValue,
    unit: si.unit,
  };
}

function labelForType(t: SegmentInsight["type"]): string {
  const map: Record<SegmentInsight["type"], string> = {
    early_brake:    "раннее торможение",
    late_brake:     "позднее торможение",
    low_apex_speed: "низкая скорость в апексе",
    late_throttle:  "поздний газ на выходе",
    early_throttle: "ранний газ",
    speed_deficit:  "дефицит скорости",
    consistent:     "стабильный участок",
    good_segment:   "хороший участок",
  };
  return map[t] ?? t;
}

// ─── Optimal lap ──────────────────────────────────────────────────────────────

function buildOptimalLap(
  userSegments: TrackSegment[],
  segmentAnalyses: SegmentAnalysis[],
  lapTimeMs: number,
): OptimalLap {
  // For each segment, the "best possible time" = min(userTime, refTime)
  let theoreticalBestMs = 0;
  const contributions: OptimalLap["segmentContributions"] = [];

  segmentAnalyses.forEach((sa) => {
    const bestSegMs = Math.min(sa.userTimeMs, sa.refTimeMs);
    theoreticalBestMs += bestSegMs;
    const gainMs = sa.userTimeMs - bestSegMs;
    if (gainMs > 10) {
      contributions.push({ segmentLabel: sa.segment.label, gainMs });
    }
  });

  // Handle segments with no reference (sum of unmatched user segments)
  const matchedIds = new Set(segmentAnalyses.map((sa) => sa.segment.id));
  userSegments.forEach((seg) => {
    if (!matchedIds.has(seg.id)) theoreticalBestMs += seg.timeMs;
  });

  const potentialGainMs = Math.max(0, lapTimeMs - theoreticalBestMs);

  contributions.sort((a, b) => b.gainMs - a.gainMs);

  const bestTimeStr = formatMs(theoreticalBestMs);
  const gainStr = (potentialGainMs / 1000).toFixed(3);

  return {
    theoreticalBestMs,
    currentBestMs: lapTimeMs,
    potentialGainMs,
    segmentContributions: contributions.slice(0, 5),
    summaryRu:
      `Ваш теоретический лучший круг: ${bestTimeStr}. ` +
      `Потенциал улучшения: ${gainStr} с. ` +
      (contributions.length > 0
        ? `Главный резерв: ${contributions[0].segmentLabel} (${(contributions[0].gainMs / 1000).toFixed(3)} с).`
        : "Отличная работа — вы близко к пределу."),
  };
}

function formatMs(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function analyseLap(userLap: ParsedLap, refLap: ParsedLap): LapAnalysisResult {
  const userTotalDist = userLap.rows[userLap.rows.length - 1].lapDist ?? 0;
  const refTotalDist  = refLap.rows[refLap.rows.length  - 1].lapDist ?? userTotalDist;
  const totalDist     = Math.max(userTotalDist, refTotalDist, 500);

  // ── 1. Segment detection ──
  const userSegments = detectSegments(userLap.rows);
  const refSegments  = detectSegments(refLap.rows);

  // ── 2. Real delta ──
  const delta = computeDelta(userLap.rows, refLap.rows);

  // ── 3. Sector times ──
  const userSectorMs = computeSectorTimes(userLap.rows);
  const refSectorMs  = computeSectorTimes(refLap.rows);
  const sectors: SectorAnalysis[] = userSectorMs.map((uMs, i) => ({
    sectorIdx: i,
    userTimeMs: Math.round(uMs),
    refTimeMs: Math.round(refSectorMs[i]),
    deltaMs: Math.round(uMs - refSectorMs[i]),
    startFraction: S_BOUNDS[i],
    endFraction: S_BOUNDS[i + 1],
  }));

  // ── 4. Per-segment delta ──
  const segDeltasMs = deltaPerSegment(
    delta,
    userSegments.map((s) => ({ startDist: s.startDist, endDist: s.endDist })),
    totalDist
  );

  // ── 5. Match & analyse each segment ──
  const matches = matchSegments(userSegments, refSegments, userTotalDist, refTotalDist);
  const totalLoss = Math.max(1, delta.totalDeltaMs);

  const segmentAnalyses: SegmentAnalysis[] = matches.map(([ui, ri]) => {
    const userSeg = userSegments[ui];
    const refSeg  = ri >= 0 ? refSegments[ri] : null;
    return analyseSegment(
      userSeg, refSeg, segDeltasMs[ui],
      userLap.rows, refLap.rows, totalDist, totalLoss
    );
  });

  // ── 6. Flatten to AnalysisInsight[] ──
  const rawInsights: AnalysisInsight[] = [];
  segmentAnalyses.forEach((sa) => {
    sa.insights.forEach((si) => {
      rawInsights.push(segmentInsightToFlat(si, sa.segment, totalDist));
    });
  });

  // Sort: critical > warning > info > good, then by cost
  rawInsights.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2, good: 3 };
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    return b.timeCostMs - a.timeCostMs;
  });

  // ── 7. Optimal lap ──
  const optimalLap = buildOptimalLap(userSegments, segmentAnalyses, userLap.lapTimeMs);

  // ── 8. Score, sub-scores & dominant weakness ──────────────────────────────
  //
  // Scoring philosophy:
  // - Overall: based on lap time efficiency vs reference
  // - Sub-scores: each is 0-100 based on cost of mistakes in that category
  // - Corners are weighted by how slow they are (slow corners matter more)

  // Corner weighting: slower corners = higher weight (more lap time sensitive)
  const cornerWeights = segmentAnalyses
    .filter(s => s.segment.type === "corner")
    .reduce((map, sa) => {
      const apex = sa.segment.apexSpeed ?? sa.segment.minSpeed;
      const w = apex < 80 ? 1.5 : apex < 130 ? 1.0 : 0.6;
      map.set(sa.segment.id, w);
      return map;
    }, new Map<string, number>());

  // Overall score: based on delta time relative to lap time (more realistic)
  // e.g. 0.5s delta on 100s lap = 99.5% efficiency ≈ score 97
  // e.g. 3s delta on 100s lap = 97% efficiency ≈ score 82
  const lapTimeS   = userLap.lapTimeMs / 1000;
  const deltaS     = Math.max(0, delta.totalDeltaMs / 1000);
  const efficiency = lapTimeS > 0 ? Math.max(0, (lapTimeS - deltaS) / lapTimeS) : 1;

  // Realistic scoring curve for sim racers:
  // < 0.3s delta (99.7%+ eff) → 96-100
  // 0.3-1s delta → 85-96  
  // 1-2s delta   → 70-85
  // 2-4s delta   → 50-70
  // > 4s delta   → < 50
  const overallScore = Math.max(10, Math.min(100, Math.round(
    efficiency > 0.997 ? 96 + (efficiency - 0.997) / 0.003 * 4 :
    efficiency > 0.990 ? 90 + (efficiency - 0.990) / 0.007 * 6 :
    efficiency > 0.980 ? 83 + (efficiency - 0.980) / 0.010 * 7 :
    efficiency > 0.967 ? 75 + (efficiency - 0.967) / 0.013 * 8 :
    efficiency > 0.950 ? 65 + (efficiency - 0.950) / 0.017 * 10 :
    efficiency > 0.930 ? 55 + (efficiency - 0.930) / 0.020 * 10 :
    efficiency > 0.900 ? 40 + (efficiency - 0.900) / 0.030 * 15 :
    efficiency * 44
  )));

  // Sub-scores with corner weighting
  const brakingInsights    = rawInsights.filter(i => i.category === "brake");
  const throttleInsights   = rawInsights.filter(i => i.category === "throttle");
  const speedInsights      = rawInsights.filter(i => i.category === "speed");
  const corners            = segmentAnalyses.filter(s => s.segment.type === "corner");
  const totalCorners       = Math.max(corners.length, 1);

  // Weighted costs — slow corners penalised more
  const weightedCost = (insights: typeof rawInsights) =>
    insights.reduce((sum, i) => {
      const segId = i.segmentId ?? "";
      const w = cornerWeights.get(segId) ?? 1.0;
      return sum + i.timeCostMs * w;
    }, 0);

  // Score formula: 100 - (cost / budget) * scale, clamped 20-100
  const costToScore = (cost: number, budget: number) =>
    Math.max(20, Math.min(100, Math.round(100 - (cost / budget) * 80)));

  const brakingScore     = costToScore(weightedCost(brakingInsights),  300);
  const throttleScore    = costToScore(weightedCost(throttleInsights), 250);
  const linesScore       = costToScore(weightedCost(speedInsights),    200);

  // Consistency: weighted ratio of clean corners (delta < 80ms)
  const weightedGood  = corners.reduce((s, sa) => s + (sa.deltaMs < 80 ? (cornerWeights.get(sa.segment.id) ?? 1) : 0), 0);
  const weightedTotal = corners.reduce((s, sa) => s + (cornerWeights.get(sa.segment.id) ?? 1), 0);
  const consistencyScore = Math.max(20, Math.min(100,
    Math.round(20 + 80 * (weightedTotal > 0 ? weightedGood / weightedTotal : 1))
  ));

  const subScores: SubScores = {
    braking:     brakingScore,
    throttle:    throttleScore,
    lines:       linesScore,
    consistency: consistencyScore,
  };

  const categoryCosts: Record<string, number> = {};
  rawInsights.filter((i) => i.severity !== "good").forEach((i) => {
    categoryCosts[i.category] = (categoryCosts[i.category] ?? 0) + i.timeCostMs;
  });
  const dominantWeakness = (
    Object.entries(categoryCosts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  ) as AnalysisInsight["category"] | null;

  return {
    lapId: userLap.id,
    totalTimeDeltaMs: delta.totalDeltaMs,
    sectors,
    insights: rawInsights,
    segmentAnalyses,
    delta,
    optimalLap,
    overallScore,
    subScores,
    dominantWeakness,
  };
}

// ─── Chart channels ───────────────────────────────────────────────────────────

export function buildChartChannels(userLap: ParsedLap, refLap: ParsedLap, POINTS = 300) {
  const user = resampleByDistance(userLap.rows, POINTS);
  const ref  = resampleByDistance(refLap.rows,  POINTS);
  const maxSpeed = Math.max(...user.speed, ...ref.speed, 1);

  // Use real delta from delta module
  const delta = computeDelta(userLap.rows, refLap.rows);

  // Re-sample delta to POINTS
  const dPts = delta.cumulativeDeltaS.length;
  const resampledDelta: number[] = Array.from({ length: POINTS }, (_, i) => {
    const srcIdx = Math.min(dPts - 1, Math.round((i / (POINTS - 1)) * (dPts - 1)));
    return delta.cumulativeDeltaS[srcIdx];
  });

  const dMin = Math.min(...resampledDelta);
  const dMax = Math.max(...resampledDelta, 0.05);
  const dRange = dMax - dMin;
  const zeroNorm = (0 - dMin) / dRange;

  return [
    {
      id: "speed", label: "Скорость", unit: "км/ч", color: "#a3e635",
      data: user.speed.map((v) => v / maxSpeed),
      refData: ref.speed.map((v) => v / maxSpeed),
      min: 0, max: 1,
      rawData: user.speed,
      rawRefData: ref.speed,
    },
    {
      id: "throttle", label: "Газ", unit: "%", color: "#4ade80",
      data: user.throttle.map((v) => v / 100),
      refData: ref.throttle.map((v) => v / 100),
      min: 0, max: 1,
      rawData: user.throttle,
      rawRefData: ref.throttle,
    },
    {
      id: "brake", label: "Тормоз", unit: "%", color: "#f87171",
      data: user.brake.map((v) => v / 100),
      refData: ref.brake.map((v) => v / 100),
      min: 0, max: 1,
      rawData: user.brake,
      rawRefData: ref.brake,
    },
    {
      id: "delta", label: "Дельта", unit: "с", color: "#60a5fa",
      data: resampledDelta.map((v) => (v - dMin) / dRange),
      refData: new Array(POINTS).fill(zeroNorm),
      min: dMin, max: dMax,
      rawData: resampledDelta,
      rawRefData: new Array(POINTS).fill(0),
      zeroLine: zeroNorm,
    },
  ];
}
