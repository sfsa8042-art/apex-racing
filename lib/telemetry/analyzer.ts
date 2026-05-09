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
  SectorAnalysis, SegmentAnalysis, SegmentInsight, TrackSegment, OptimalLap,
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

interface SegmentRuleInput {
  userSeg:    TrackSegment;
  refSeg:     TrackSegment;
  userRows:   TelemetryRow[];
  refRows:    TelemetryRow[];
  segDeltaMs: number;         // from real delta calculation
  totalDist:  number;
}

function ruleEarlyBrake(inp: SegmentRuleInput): SegmentInsight | null {
  const { userSeg, refSeg, totalDist } = inp;
  if (!userSeg.brakeStartDist || !refSeg.brakeStartDist) return null;

  // Normalise to common scale
  const uBrakeFrac = userSeg.brakeStartDist / (inp.userRows[inp.userRows.length - 1].lapDist ?? 1);
  const rBrakeFrac = refSeg.brakeStartDist   / (inp.refRows[inp.refRows.length  - 1].lapDist ?? 1);
  const diffM = (rBrakeFrac - uBrakeFrac) * totalDist;   // positive = user brakes earlier

  if (diffM < 12) return null;

  const costMs = Math.round(Math.min(diffM * 11, 350));   // ~11 ms per metre, capped
  const module = ACADEMY_MAP["early_brake"];
  return {
    type: "early_brake",
    descriptionRu:
      `Вы тормозите на ${Math.round(diffM)} м раньше референса. ` +
      `Скорость въезда: ${Math.round(userSeg.maxSpeed)} км/ч (референс: ${Math.round(refSeg.maxSpeed)} км/ч). ` +
      `Попробуйте тормозить позже с более высоким начальным давлением.`,
    timeCostMs: costMs,
    academyModuleId: module.id,
    academyModuleTitleRu: module.titleRu,
    userValue: Math.round(diffM),
    refValue: 0,
    unit: "м",
  };
}

function ruleLateThrottle(inp: SegmentRuleInput): SegmentInsight | null {
  const { userSeg, refSeg, totalDist } = inp;
  if (!userSeg.throttleOpenDist || !refSeg.throttleOpenDist) return null;

  const uFrac = userSeg.throttleOpenDist / (inp.userRows[inp.userRows.length - 1].lapDist ?? 1);
  const rFrac = refSeg.throttleOpenDist   / (inp.refRows[inp.refRows.length  - 1].lapDist ?? 1);
  const diffM = (uFrac - rFrac) * totalDist;   // positive = user opens throttle later

  if (diffM < 10) return null;

  const costMs = Math.round(Math.min(diffM * 9, 280));
  const module = ACADEMY_MAP["late_throttle"];
  return {
    type: "late_throttle",
    descriptionRu:
      `Газ открывается на ${Math.round(diffM)} м позже референса. ` +
      `Скорость при открытии: ${Math.round(userSeg.minSpeed)} км/ч. ` +
      `Раннее открытие газа даст дополнительную скорость на всей следующей прямой.`,
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

  // Time cost: each km/h in a corner ≈ 25 ms (increases with corner radius)
  const costMs = Math.round(Math.min(diff * 25, 400));
  const module = ACADEMY_MAP["low_apex_speed"];
  return {
    type: "low_apex_speed",
    descriptionRu:
      `Скорость в апексе: ${Math.round(uApex)} км/ч (референс: ${Math.round(rApex)} км/ч). ` +
      `Разница ${Math.round(diff)} км/ч. ` +
      `Возможные причины: слишком ранний апекс или избыточное торможение перед поворотом.`,
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
  const insights: SegmentInsight[] = [];

  if (refSeg && userSeg.type === "corner") {
    const inp: SegmentRuleInput = { userSeg, refSeg, userRows, refRows, segDeltaMs, totalDist };
    const earlyBrake = ruleEarlyBrake(inp);
    const lateThrottle = ruleLateThrottle(inp);
    const lowApex = ruleLowApexSpeed(inp);
    const good = ruleGoodSegment(inp);

    if (earlyBrake)   insights.push(earlyBrake);
    if (lateThrottle) insights.push(lateThrottle);
    if (lowApex)      insights.push(lowApex);
    if (good && !earlyBrake && !lateThrottle && !lowApex) insights.push(good);
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

  // ── 8. Score & dominant weakness ──
  const penaltySeconds = Math.max(0, delta.totalDeltaMs / 1000);
  const overallScore = Math.max(0, Math.min(100, Math.round(100 - penaltySeconds * 7)));

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
