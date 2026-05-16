/**
 * analyzer.ts — Segment-based lap analysis engine v3.
 * Pipeline:
 *  1. Detect segments on user + reference lap
 *  2. Compute real delta via delta.ts
 *  3. Per-segment rules with root-cause deduplication
 *  4. Flat AnalysisInsight[] sorted by time cost
 *  5. Optimal lap calculation
 *  6. Weighted scoring system
 */

import type {
  ParsedLap, TelemetryRow, LapAnalysisResult, AnalysisInsight,
  SectorAnalysis, SegmentAnalysis, SegmentInsight, TrackSegment, OptimalLap, SubScores,
} from "@/types/telemetry";
import { computeDelta, deltaPerSegment } from "./delta";
import { detectSegments, matchSegments } from "./segments";

// ─── Resampling ───────────────────────────────────────────────────────────────

export function resampleByDistance(rows: TelemetryRow[], points = 200) {
  const totalDist = rows[rows.length - 1].lapDist ?? 0;
  const ch = { speed: [] as number[], throttle: [] as number[], brake: [] as number[], gear: [] as number[] };
  for (let i = 0; i < points; i++) {
    const d = totalDist === 0 ? 0 : (i / (points - 1)) * totalDist;
    let lo = 0, hi = rows.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if ((rows[mid].lapDist ?? 0) < d) lo = mid; else hi = mid;
    }
    const dLo = rows[lo].lapDist ?? 0, dHi = rows[hi].lapDist ?? 0;
    const t = dHi === dLo ? 0 : (d - dLo) / (dHi - dLo);
    const L = (a: number, b: number) => a + (b - a) * t;
    ch.speed.push(L(rows[lo].speed, rows[hi].speed));
    ch.throttle.push(L(rows[lo].throttle, rows[hi].throttle));
    ch.brake.push(L(rows[lo].brake, rows[hi].brake));
    ch.gear.push(Math.round(L(rows[lo].gear, rows[hi].gear)));
  }
  return ch;
}

// ─── Sector utilities ─────────────────────────────────────────────────────────

const S_BOUNDS = [0, 0.33, 0.66, 1.0];

function sectorForFrac(f: number): number {
  return f < S_BOUNDS[1] ? 0 : f < S_BOUNDS[2] ? 1 : 2;
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
      if (Math.abs((rows[i].lapDist ?? 0) - target) < Math.abs((rows[best].lapDist ?? 0) - target)) best = i;
    }
    crossings.push(rows[best].time);
  }
  return [
    (crossings[0] - rows[0].time) * 1000,
    (crossings[1] - crossings[0]) * 1000,
    (crossings[2] - crossings[1]) * 1000,
  ];
}

// ─── Academy mapping ──────────────────────────────────────────────────────────

const ACM: Record<string, { id: string; titleRu: string }> = {
  early_brake:    { id: "m3",  titleRu: "Основы торможения" },
  late_brake:     { id: "m3",  titleRu: "Основы торможения" },
  low_apex_speed: { id: "m7",  titleRu: "Трейл-брейкинг" },
  late_throttle:  { id: "m4",  titleRu: "Управление газом" },
  early_throttle: { id: "m8",  titleRu: "Оптимизация выхода" },
  speed_deficit:  { id: "m7",  titleRu: "Трейл-брейкинг" },
  brake_pressure: { id: "m3",  titleRu: "Основы торможения" },
  entry_speed:    { id: "m2",  titleRu: "Точка торможения" },
};

// ─── Corner classification ────────────────────────────────────────────────────

type CornerClass = "slow" | "medium" | "fast";

function classifyCorner(apexSpeed: number): CornerClass {
  if (apexSpeed < 80)  return "slow";
  if (apexSpeed < 150) return "medium";
  return "fast";
}

function speedFactor(speed: number): number {
  if (speed > 180) return 1.6;
  if (speed > 130) return 1.2;
  if (speed > 80)  return 1.0;
  return 0.7;
}

// ─── Row helpers ──────────────────────────────────────────────────────────────

function rowsInSeg(rows: TelemetryRow[], seg: TrackSegment): TelemetryRow[] {
  return rows.filter(r => {
    const d = r.lapDist ?? 0;
    return d >= seg.startDist - 5 && d <= seg.endDist + 5;
  });
}

function rowsInRange(rows: TelemetryRow[], start: number, end: number): TelemetryRow[] {
  return rows.filter(r => { const d = r.lapDist ?? 0; return d >= start && d <= end; });
}

function peakBrake(rows: TelemetryRow[]): number {
  return rows.reduce((m, r) => Math.max(m, r.brake), 0);
}

function findBrakeReleasePoint(rows: TelemetryRow[], apexDist: number): number {
  // Walk backwards from apex to find last point where brake > 5%
  const before = rows.filter(r => (r.lapDist ?? 0) <= apexDist).reverse();
  const lastBrake = before.find(r => r.brake > 5);
  return lastBrake?.lapDist ?? apexDist;
}

function findThrottleOpenPoint(rows: TelemetryRow[], apexDist: number): number {
  // Find first point after apex where throttle > 15%
  const after = rows.filter(r => (r.lapDist ?? 0) >= apexDist);
  const firstThrottle = after.find(r => r.throttle > 15);
  return firstThrottle?.lapDist ?? apexDist;
}

// ─── Rule interface ───────────────────────────────────────────────────────────

interface RuleInput {
  userSeg:    TrackSegment;
  refSeg:     TrackSegment;
  userRows:   TelemetryRow[];  // full lap rows
  refRows:    TelemetryRow[];
  segUserRows: TelemetryRow[]; // rows just in this segment
  segRefRows:  TelemetryRow[];
  segDeltaMs: number;
  totalDist:  number;
  cornerClass: CornerClass;
}

// ─── Rules ────────────────────────────────────────────────────────────────────

function ruleEarlyBrake(inp: RuleInput): SegmentInsight | null {
  const { userSeg, refSeg, totalDist, cornerClass } = inp;
  if (!userSeg.brakeStartDist || !refSeg.brakeStartDist) return null;

  const uFrac = userSeg.brakeStartDist / (inp.userRows.at(-1)?.lapDist ?? 1);
  const rFrac = refSeg.brakeStartDist   / (inp.refRows.at(-1)?.lapDist ?? 1);
  const diffM = (rFrac - uFrac) * totalDist;

  const minDiff = cornerClass === "slow" ? 8 : cornerClass === "medium" ? 12 : 18;
  if (diffM < minDiff) return null;

  const sf = speedFactor(userSeg.maxSpeed);
  const baseCost = cornerClass === "fast" ? 9 : 7;
  const costMs = Math.round(Math.min(diffM * baseCost * sf, 360));

  const entrySpeed = Math.round(userSeg.maxSpeed);
  const refEntry   = Math.round(refSeg.maxSpeed);

  const hint = cornerClass === "fast"
    ? `На скоростном повороте раннее торможение снижает стабильность. Держи высокое начальное давление, укорачивай зону торможения.`
    : cornerClass === "slow"
    ? `В медленном повороте важна точность — подвигай точку на ${Math.round(diffM/3)} м вперёд за раз.`
    : `Сдвинь точку торможения на ${Math.round(diffM * 0.4)} м вперёд. Тормози жёстче в начале зоны.`;

  return {
    type: "early_brake",
    descriptionRu:
      `Торможение на ${Math.round(diffM)} м раньше референса. ` +
      `Скорость въезда: ${entrySpeed} км/ч (референс: ${refEntry} км/ч). ${hint}`,
    timeCostMs: costMs,
    academyModuleId: ACM.early_brake.id,
    academyModuleTitleRu: ACM.early_brake.titleRu,
    userValue: entrySpeed,
    refValue: refEntry,
    unit: "км/ч",
  };
}

function ruleLowApexSpeed(inp: RuleInput): SegmentInsight | null {
  const { userSeg, refSeg, cornerClass } = inp;
  const uApex = userSeg.apexSpeed ?? userSeg.minSpeed;
  const rApex = refSeg.apexSpeed  ?? refSeg.minSpeed;
  const diff  = rApex - uApex;

  if (diff < 4) return null;

  // Larger impact at slow corners (more effect on exit speed)
  const msCostPerKmh = cornerClass === "slow" ? 22 : cornerClass === "medium" ? 18 : 12;
  const costMs = Math.round(Math.min(diff * msCostPerKmh, 350));

  const cause = (() => {
    if (inp.userSeg.brakeStartDist && inp.refSeg.brakeStartDist) {
      const uFrac = inp.userSeg.brakeStartDist / (inp.userRows.at(-1)?.lapDist ?? 1);
      const rFrac = inp.refSeg.brakeStartDist  / (inp.refRows.at(-1)?.lapDist ?? 1);
      const diffBrake = (rFrac - uFrac) * inp.totalDist;
      if (diffBrake > 10) return "Возможная причина — раннее торможение.";
    }
    return "Возможные причины: широкая траектория или недостаточное трейл-брейкинг.";
  })();

  return {
    type: "low_apex_speed",
    descriptionRu:
      `Минимальная скорость апекса: ${Math.round(uApex)} км/ч (референс: ${Math.round(rApex)} км/ч, −${Math.round(diff)} км/ч). ` +
      `Каждый потерянный км/ч в апексе несёт потерю ~${msCostPerKmh} мс. ${cause}`,
    timeCostMs: costMs,
    academyModuleId: ACM.low_apex_speed.id,
    academyModuleTitleRu: ACM.low_apex_speed.titleRu,
    userValue: Math.round(uApex),
    refValue: Math.round(rApex),
    unit: "км/ч",
  };
}

function ruleLateThrottle(inp: RuleInput): RuleInput extends { userSeg: TrackSegment } ? SegmentInsight | null : never {
  const { userSeg, refSeg, totalDist, cornerClass } = inp;
  if (!userSeg.throttleOpenDist || !refSeg.throttleOpenDist) return null as any;

  const uFrac = userSeg.throttleOpenDist / (inp.userRows.at(-1)?.lapDist ?? 1);
  const rFrac = refSeg.throttleOpenDist  / (inp.refRows.at(-1)?.lapDist ?? 1);
  const diffM = (uFrac - rFrac) * totalDist;

  const minDiff = cornerClass === "slow" ? 7 : 10;
  if (diffM < minDiff) return null as any;

  // Cost scales with straight length after corner
  const nextStraightDist = (inp.userRows.at(-1)?.lapDist ?? 0) - userSeg.endDist;
  const sFactor = Math.min(1.6, 1 + nextStraightDist / 400);
  const costMs = Math.round(Math.min(diffM * 6 * sFactor, 300));

  const uThrottleDist = Math.round(userSeg.throttleOpenDist - (userSeg.apexDist ?? (userSeg.startDist + userSeg.endDist) / 2));
  const hint = uThrottleDist > 20
    ? `Газ открывается на ${uThrottleDist} м после апекса — начни прогрессивно сразу в апексе.`
    : `Открывай газ на ${Math.round(diffM)} м раньше — даже 15% тяги помогает стабилизировать машину.`;

  return {
    type: "late_throttle" as const,
    descriptionRu:
      `Газ на ${Math.round(diffM)} м позже референса. Апекс: ${Math.round(userSeg.minSpeed)} км/ч. ${hint}`,
    timeCostMs: costMs,
    academyModuleId: ACM.late_throttle.id,
    academyModuleTitleRu: ACM.late_throttle.titleRu,
    userValue: Math.round(diffM),
    refValue: 0,
    unit: "м",
  } as any;
}

function ruleInsufficientPeakBrake(inp: RuleInput): SegmentInsight | null {
  if (inp.cornerClass === "fast") return null; // fast corners often don't need max brake

  const uPeak = peakBrake(inp.segUserRows);
  const rPeak = peakBrake(inp.segRefRows);

  // Only flag if reference uses significantly more brake (threshold braking technique)
  if (rPeak < 70) return null;          // ref doesn't use max brake either
  if (uPeak < 20) return null;          // user not braking here at all — probably not matched right
  const diff = rPeak - uPeak;
  if (diff < 20) return null;           // less than 20% difference — not significant

  const costMs = Math.round(Math.min(diff * 1.5, 120)); // softer penalty — style choice

  const suggestedPeak = Math.round(rPeak);
  const currentPeak   = Math.round(uPeak);

  return {
    type: "early_brake" as const,
    descriptionRu:
      `Пиковое давление тормоза: ${currentPeak}% против ${suggestedPeak}% у референса. ` +
      `GT3 требует максимального давления (${suggestedPeak}%+) в первые метры зоны торможения, ` +
      `затем плавное снижение. Это сокращает длину тормозного пути и позволяет тормозить позже.`,
    timeCostMs: costMs,
    academyModuleId: ACM.brake_pressure.id,
    academyModuleTitleRu: ACM.brake_pressure.titleRu,
    userValue: currentPeak,
    refValue: suggestedPeak,
    unit: "%",
  };
}

function ruleCoasting(inp: RuleInput): SegmentInsight | null {
  if (inp.cornerClass === "fast") return null;

  const apexDist    = inp.userSeg.apexDist   ?? (inp.userSeg.startDist + inp.userSeg.endDist) / 2;
  const refApexDist = inp.refSeg.apexDist    ?? (inp.refSeg.startDist  + inp.refSeg.endDist)  / 2;

  // Find where braking ends (last brake > 5% before apex)
  const userBrakeRelease = findBrakeReleasePoint(inp.segUserRows, apexDist);
  const refBrakeRelease  = findBrakeReleasePoint(inp.segRefRows,  refApexDist);

  // Find where throttle opens (first throttle > 15% after apex)
  const userThrottleOpen = findThrottleOpenPoint(inp.segUserRows, apexDist);
  const refThrottleOpen  = findThrottleOpenPoint(inp.segRefRows,  refApexDist);

  // Dead zone = from brake release to throttle open
  const userDeadM = Math.max(0, userThrottleOpen - userBrakeRelease);
  const refDeadM  = Math.max(0, refThrottleOpen  - refBrakeRelease);
  const extraCoastM = userDeadM - refDeadM;

  if (extraCoastM < 12) return null;

  const costMs = Math.round(Math.min(extraCoastM * 5.5, 200));

  return {
    type: "late_throttle" as const,
    descriptionRu:
      `Выбег ${Math.round(userDeadM)} м без тормоза и газа (референс: ${Math.round(refDeadM)} м). ` +
      `"Мёртвая зона" теряет ${Math.round(extraCoastM)} м скорости даром. ` +
      `Используй трейл-брейкинг до апекса или открывай газ сразу после отпускания тормоза.`,
    timeCostMs: costMs,
    academyModuleId: "trail_braking",
    academyModuleTitleRu: "Трейл-брейкинг",
    userValue: Math.round(userDeadM),
    refValue: Math.round(refDeadM),
    unit: "м",
  };
}

function ruleTrailBraking(inp: RuleInput): SegmentInsight | null {
  const apexDist    = inp.userSeg.apexDist   ?? (inp.userSeg.startDist + inp.userSeg.endDist) / 2;
  const refApexDist = inp.refSeg.apexDist    ?? (inp.refSeg.startDist  + inp.refSeg.endDist)  / 2;

  const userBrakeRelease = findBrakeReleasePoint(inp.segUserRows, apexDist);
  const refBrakeRelease  = findBrakeReleasePoint(inp.segRefRows,  refApexDist);

  const userTrailM = apexDist    - userBrakeRelease;
  const refTrailM  = refApexDist - refBrakeRelease;
  const trailDiff  = refTrailM   - userTrailM;  // positive = ref trails more

  if (trailDiff < 15) return null;

  const costMs = Math.round(Math.min(trailDiff * 4.5, 160));

  return {
    type: "late_brake" as const,
    descriptionRu:
      `Трейл-брейкинг: референс держит тормоз на ${Math.round(trailDiff)} м ближе к апексу (${Math.round(refTrailM)} м vs ${Math.round(userTrailM)} м). ` +
      `Плавное снижение давления к апексу помогает повернуть без недостаточной поворачиваемости.`,
    timeCostMs: costMs,
    academyModuleId: "trail_braking",
    academyModuleTitleRu: "Трейл-брейкинг",
    userValue: Math.round(userTrailM),
    refValue: Math.round(refTrailM),
    unit: "м трейл",
  };
}

function ruleSlowExitSpeed(inp: RuleInput): SegmentInsight | null {
  // Compare speed in the last 20% of the corner (exit zone)
  const exitStart = inp.userSeg.startDist + (inp.userSeg.endDist - inp.userSeg.startDist) * 0.75;
  const uExitRows = rowsInRange(inp.userRows, exitStart, inp.userSeg.endDist);
  const rExitRows = rowsInRange(inp.refRows,
    inp.refSeg.startDist + (inp.refSeg.endDist - inp.refSeg.startDist) * 0.75,
    inp.refSeg.endDist);

  if (uExitRows.length === 0 || rExitRows.length === 0) return null;

  const uExit = Math.max(...uExitRows.map(r => r.speed));
  const rExit = Math.max(...rExitRows.map(r => r.speed));
  const diff  = rExit - uExit;

  if (diff < 6) return null;

  // Only flag if apex speed was fine (otherwise low apex covers it)
  const uApex = inp.userSeg.apexSpeed ?? inp.userSeg.minSpeed;
  const rApex = inp.refSeg.apexSpeed  ?? inp.refSeg.minSpeed;
  if ((rApex - uApex) >= 4) return null;

  const costMs = Math.round(Math.min(diff * 13, 200));

  return {
    type: "speed_deficit" as const,
    descriptionRu:
      `Скорость выхода: ${Math.round(uExit)} км/ч (референс: ${Math.round(rExit)} км/ч, −${Math.round(diff)} км/ч). ` +
      `Апекс в порядке, но машина набирает скорость медленнее. ` +
      `Проверь момент открытия газа и плавность разворачивания руля.`,
    timeCostMs: costMs,
    userValue: Math.round(uExit),
    refValue: Math.round(rExit),
    unit: "км/ч выход",
  };
}

function ruleGoodSegment(inp: RuleInput): SegmentInsight | null {
  if (inp.segDeltaMs > 60) return null;
  const uApex = Math.round(inp.userSeg.apexSpeed ?? inp.userSeg.minSpeed);
  return {
    type: "good_segment",
    descriptionRu: inp.segDeltaMs <= 0
      ? `Опережаете референс на ${Math.abs(inp.segDeltaMs)} мс! Апекс: ${uApex} км/ч.`
      : `Хороший поворот — разрыв всего ${inp.segDeltaMs} мс. Апекс: ${uApex} км/ч.`,
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
  const cornerClass   = classifyCorner(userSeg.apexSpeed ?? userSeg.minSpeed);
  const segUserRows   = rowsInSeg(userRows, userSeg);
  const segRefRows    = refSeg ? rowsInSeg(refRows, refSeg) : [];
  const insights: SegmentInsight[] = [];

  if (refSeg && userSeg.type === "corner" && segUserRows.length > 0 && segRefRows.length > 0) {
    const inp: RuleInput = {
      userSeg, refSeg, userRows, refRows, segUserRows, segRefRows,
      segDeltaMs, totalDist, cornerClass,
    };

    const earlyBrake    = ruleEarlyBrake(inp);
    const lowApex       = ruleLowApexSpeed(inp);
    const lateThrottle  = ruleLateThrottle(inp) as SegmentInsight | null;
    const peakBrakeR    = ruleInsufficientPeakBrake(inp);
    const coasting      = ruleCoasting(inp);
    const trailBrake    = ruleTrailBraking(inp);
    const slowExit      = ruleSlowExitSpeed(inp);
    const good          = ruleGoodSegment(inp);

    // Root-cause logic:
    // - earlyBrake often explains lowApex → suppress lowApex if brake is bigger cause
    // - coasting explains lateThrottle → suppress lateThrottle if coasting is bigger
    // - trailBrake and coasting are often same root → show only the more expensive one
    const earlyExplainsApex = earlyBrake && lowApex && (earlyBrake.timeCostMs ?? 0) * 0.7 >= (lowApex.timeCostMs ?? 0);
    const coastingExplainsLate = coasting && lateThrottle && (coasting.timeCostMs ?? 0) >= (lateThrottle.timeCostMs ?? 0) * 0.8;
    const preferCoastOverTrail = coasting && trailBrake;

    if (earlyBrake)                                       insights.push(earlyBrake);
    if (peakBrakeR && !earlyBrake)                        insights.push(peakBrakeR);
    if (trailBrake && !earlyBrake && !preferCoastOverTrail) insights.push(trailBrake);
    if (coasting)                                         insights.push(coasting);
    if (lateThrottle && !coastingExplainsLate)            insights.push(lateThrottle);
    if (lowApex && !earlyExplainsApex)                    insights.push(lowApex);
    if (slowExit && !lowApex)                             insights.push(slowExit);

    // Keep max 2 per corner, most expensive first
    insights.sort((a, b) => (b.timeCostMs ?? 0) - (a.timeCostMs ?? 0));
    if (insights.length > 2) insights.splice(2);

    if (good && insights.length === 0) insights.push(good);
  }

  const deltaFraction = totalLoss > 0 ? Math.max(0, segDeltaMs) / totalLoss : 0;

  return {
    segment: userSeg, refSegment: refSeg,
    userTimeMs: userSeg.timeMs, refTimeMs: refSeg?.timeMs ?? userSeg.timeMs,
    deltaMs: segDeltaMs, insights, deltaFraction,
  };
}

// ─── Flat insight builder ─────────────────────────────────────────────────────

function segmentInsightToFlat(si: SegmentInsight, seg: TrackSegment, totalDist: number): AnalysisInsight {
  const sevMap: Record<SegmentInsight["type"], AnalysisInsight["severity"]> = {
    early_brake:    si.timeCostMs > 180 ? "critical" : "warning",
    late_brake:     si.timeCostMs > 150 ? "critical" : "warning",
    low_apex_speed: si.timeCostMs > 200 ? "critical" : "warning",
    late_throttle:  si.timeCostMs > 150 ? "critical" : "warning",
    early_throttle: "warning",
    speed_deficit:  "warning",
    consistent:     "info",
    good_segment:   "good",
  };

  const catMap: Record<SegmentInsight["type"], AnalysisInsight["category"]> = {
    early_brake:    "brake",
    late_brake:     "brake",
    low_apex_speed: "speed",
    late_throttle:  "throttle",
    early_throttle: "throttle",
    speed_deficit:  "speed",
    consistent:     "consistency",
    good_segment:   "general",
  };

  const typeLabels: Record<SegmentInsight["type"], string> = {
    early_brake:    "раннее торможение",
    late_brake:     "трейл-брейкинг",
    low_apex_speed: "низкий апекс",
    late_throttle:  "поздний газ",
    early_throttle: "ранний газ",
    speed_deficit:  "низкая скорость",
    consistent:     "стабильный",
    good_segment:   "хороший",
  };

  return {
    id: `${si.type}_${seg.id}`,
    severity: sevMap[si.type],
    category: catMap[si.type],
    titleRu: `${seg.label}: ${typeLabels[si.type]}`,
    descriptionRu: si.descriptionRu,
    timeCostMs: si.timeCostMs,
    sectorIdx: sectorForFrac(seg.startDist / totalDist),
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

// ─── Optimal lap ──────────────────────────────────────────────────────────────

function buildOptimalLap(
  userSegments: TrackSegment[],
  segmentAnalyses: SegmentAnalysis[],
  lapTimeMs: number,
): OptimalLap {
  let theoreticalBestMs = 0;
  const contributions: OptimalLap["segmentContributions"] = [];

  segmentAnalyses.forEach(sa => {
    const bestMs = Math.min(sa.userTimeMs, sa.refTimeMs);
    theoreticalBestMs += bestMs;
    const gain = sa.userTimeMs - bestMs;
    if (gain > 10) contributions.push({ segmentLabel: sa.segment.label, gainMs: gain });
  });

  const matched = new Set(segmentAnalyses.map(sa => sa.segment.id));
  userSegments.forEach(seg => { if (!matched.has(seg.id)) theoreticalBestMs += seg.timeMs; });

  const potentialGainMs = Math.max(0, lapTimeMs - theoreticalBestMs);
  contributions.sort((a, b) => b.gainMs - a.gainMs);

  const bestStr  = formatMs(theoreticalBestMs);
  const gainStr  = (potentialGainMs / 1000).toFixed(3);
  const top3     = contributions.slice(0, 3).map(c => `${c.segmentLabel} (−${(c.gainMs/1000).toFixed(3)}с)`).join(", ");

  return {
    theoreticalBestMs, currentBestMs: lapTimeMs, potentialGainMs,
    segmentContributions: contributions.slice(0, 5),
    summaryRu:
      `Теоретический лучший круг: ${bestStr} (потенциал −${gainStr}с). ` +
      (top3 ? `Главные резервы: ${top3}.` : "Вы близко к пределу — отличная работа!"),
  };
}

function formatMs(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2,"0")}.${String(ms % 1000).padStart(3,"0")}`;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function analyseLap(userLap: ParsedLap, refLap: ParsedLap): LapAnalysisResult {
  const userTotalDist = userLap.rows.at(-1)?.lapDist ?? 0;
  const refTotalDist  = refLap.rows.at(-1)?.lapDist  ?? userTotalDist;
  const totalDist     = Math.max(userTotalDist, refTotalDist, 500);

  const userSegments  = detectSegments(userLap.rows);
  const refSegments   = detectSegments(refLap.rows);
  const delta         = computeDelta(userLap.rows, refLap.rows);

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

  const segDeltasMs = deltaPerSegment(
    delta,
    userSegments.map(s => ({ startDist: s.startDist, endDist: s.endDist })),
    totalDist
  );

  const matches = matchSegments(userSegments, refSegments, userTotalDist, refTotalDist);
  const totalLoss = Math.max(1, delta.totalDeltaMs);

  const segmentAnalyses: SegmentAnalysis[] = matches.map(([ui, ri]) => {
    const userSeg = userSegments[ui];
    const refSeg  = ri >= 0 ? refSegments[ri] : null;
    return analyseSegment(userSeg, refSeg, segDeltasMs[ui], userLap.rows, refLap.rows, totalDist, totalLoss);
  });

  const rawInsights: AnalysisInsight[] = [];
  segmentAnalyses.forEach(sa =>
    sa.insights.forEach(si =>
      rawInsights.push(segmentInsightToFlat(si, sa.segment, totalDist))
    )
  );

  rawInsights.sort((a, b) => {
    const o: Record<string, number> = { critical: 0, warning: 1, info: 2, good: 3 };
    if (o[a.severity] !== o[b.severity]) return o[a.severity] - o[b.severity];
    return b.timeCostMs - a.timeCostMs;
  });

  const optimalLap = buildOptimalLap(userSegments, segmentAnalyses, userLap.lapTimeMs);

  // ── Scoring ────────────────────────────────────────────────────────────────
  const corners       = segmentAnalyses.filter(s => s.segment.type === "corner");
  const cornerWeights = new Map(corners.map(sa => {
    const apex = sa.segment.apexSpeed ?? sa.segment.minSpeed;
    return [sa.segment.id, apex < 80 ? 1.5 : apex < 130 ? 1.0 : 0.6];
  }));

  const lapTimeS   = userLap.lapTimeMs / 1000;
  const deltaS     = Math.max(0, delta.totalDeltaMs / 1000);
  const efficiency = lapTimeS > 0 ? Math.max(0, (lapTimeS - deltaS) / lapTimeS) : 1;

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

  const wCost = (cat: AnalysisInsight["category"]) =>
    rawInsights.filter(i => i.category === cat && i.severity !== "good")
      .reduce((s, i) => s + i.timeCostMs * (cornerWeights.get(i.segmentId ?? "") ?? 1), 0);

  const costToScore = (cost: number, budget: number) =>
    Math.max(20, Math.min(100, Math.round(100 - (cost / budget) * 80)));

  const brakingScore     = costToScore(wCost("brake"),    280);
  const throttleScore    = costToScore(wCost("throttle"), 230);
  const linesScore       = costToScore(wCost("speed"),    190);
  const weightedGood     = corners.reduce((s, sa) =>
    s + (sa.deltaMs < 80 ? (cornerWeights.get(sa.segment.id) ?? 1) : 0), 0);
  const weightedTotal    = corners.reduce((s, sa) => s + (cornerWeights.get(sa.segment.id) ?? 1), 0);
  const consistencyScore = Math.max(20, Math.min(100,
    Math.round(20 + 80 * (weightedTotal > 0 ? weightedGood / weightedTotal : 1))
  ));

  const subScores: SubScores = {
    braking: brakingScore, throttle: throttleScore, lines: linesScore, consistency: consistencyScore,
  };

  const catCosts: Record<string, number> = {};
  rawInsights.filter(i => i.severity !== "good").forEach(i => {
    catCosts[i.category] = (catCosts[i.category] ?? 0) + i.timeCostMs;
  });
  const dominantWeakness = (
    Object.entries(catCosts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  ) as AnalysisInsight["category"] | null;

  // ── Pattern detection ────────────────────────────────────────────────────
  const patterns: string[] = [];
  const strengthMessages: string[] = [];

  // Pattern: repeated early braking in slow corners
  const earlyBrakeCorners = segmentAnalyses.filter(sa =>
    sa.insights.some(i => i.type === "early_brake") &&
    classifyCorner(sa.segment.apexSpeed ?? sa.segment.minSpeed) === "slow"
  );
  if (earlyBrakeCorners.length >= 2) {
    patterns.push(`Раннее торможение в ${earlyBrakeCorners.length} из медленных поворотов — это паттерн, не изолированная ошибка. Фокус на общей технике торможения.`);
  }

  // Pattern: late throttle everywhere
  const lateThrottleCorners = segmentAnalyses.filter(sa =>
    sa.insights.some(i => i.type === "late_throttle")
  );
  if (lateThrottleCorners.length >= 3) {
    patterns.push(`Поздний газ в ${lateThrottleCorners.length} поворотах — вероятно тактика вождения, а не ошибка в отдельном повороте. Пересмотри момент открытия газа системно.`);
  }

  // Pattern: consistent coasting
  const coastingCorners = segmentAnalyses.filter(sa =>
    sa.insights.some(i => i.descriptionRu?.includes("Выбег"))
  );
  if (coastingCorners.length >= 2) {
    patterns.push(`Выбег (без тормоза и газа) в ${coastingCorners.length} поворотах — трейл-брейкинг до апекса устранит это полностью.`);
  }

  // Pattern: low apex speed across corners
  const lowApexCorners = segmentAnalyses.filter(sa =>
    sa.insights.some(i => i.type === "low_apex_speed")
  );
  if (lowApexCorners.length >= 3) {
    const avgLoss = Math.round(lowApexCorners.reduce((s, sa) => {
      const ins = sa.insights.find(i => i.type === "low_apex_speed");
      return s + ((ins?.timeCostMs ?? 0));
    }, 0) / lowApexCorners.length);
    patterns.push(`Низкая скорость в апексе в ${lowApexCorners.length} поворотах (средняя потеря ${avgLoss} мс на поворот). Проверь технику входа в повороты.`);
  }

  // Strengths
  const goodSegments = segmentAnalyses.filter(sa => sa.deltaMs <= 30 && sa.segment.type === "corner");
  if (goodSegments.length >= 2) {
    const names = goodSegments.slice(0, 3).map(sa => sa.segment.label).join(", ");
    strengthMessages.push(`Сильные повороты: ${names} — твоя техника здесь близка к референсу`);
  }
  const bestSector = sectors.length > 0 ? [...sectors].sort((a, b) => a.deltaMs - b.deltaMs)[0] : null;
  if (bestSector) {
    strengthMessages.push(`Лучший сектор S${bestSector.sectorIdx + 1}: потеря всего ${(bestSector.deltaMs / 1000).toFixed(3)}с`);
  }

  return {
    lapId: userLap.id,
    totalTimeDeltaMs: delta.totalDeltaMs,
    sectors, insights: rawInsights, segmentAnalyses,
    delta, optimalLap, overallScore, subScores, dominantWeakness,
    patterns, strengthMessages,
  };
}

// ─── Chart channels ───────────────────────────────────────────────────────────

export function buildChartChannels(userLap: ParsedLap, refLap: ParsedLap, POINTS = 300) {
  const user = resampleByDistance(userLap.rows, POINTS);
  const ref  = resampleByDistance(refLap.rows,  POINTS);
  const maxSpeed = Math.max(...user.speed, ...ref.speed, 1);

  const delta = computeDelta(userLap.rows, refLap.rows);
  const dPts  = delta.cumulativeDeltaS.length;
  const resampledDelta: number[] = Array.from({ length: POINTS }, (_, i) => {
    const src = Math.min(dPts - 1, Math.round((i / (POINTS - 1)) * (dPts - 1)));
    return delta.cumulativeDeltaS[src];
  });

  const dMin = Math.min(...resampledDelta);
  const dMax = Math.max(...resampledDelta, 0.05);
  const dRange = dMax - dMin;
  const zeroNorm = dRange > 0 ? (0 - dMin) / dRange : 0.5;

  return [
    { id: "speed",    label: "Скорость", unit: "км/ч", color: "#a3e635",
      data: user.speed.map(v => v / maxSpeed),    refData: ref.speed.map(v => v / maxSpeed),
      min: 0, max: 1, rawData: user.speed, rawRefData: ref.speed },
    { id: "throttle", label: "Газ",      unit: "%",    color: "#4ade80",
      data: user.throttle.map(v => v / 100),      refData: ref.throttle.map(v => v / 100),
      min: 0, max: 1 },
    { id: "brake",    label: "Тормоз",   unit: "%",    color: "#f87171",
      data: user.brake.map(v => v / 100),         refData: ref.brake.map(v => v / 100),
      min: 0, max: 1 },
    { id: "delta",    label: "Дельта",   unit: "с",    color: "#60a5fa",
      data: resampledDelta.map(v => dRange > 0 ? (v - dMin) / dRange : zeroNorm),
      refData: new Array(POINTS).fill(zeroNorm),
      min: dMin, max: dMax, rawData: resampledDelta,
      rawRefData: new Array(POINTS).fill(0), zeroLine: zeroNorm },
  ];
}
