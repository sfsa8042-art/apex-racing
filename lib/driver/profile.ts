/**
 * lib/driver/profile.ts
 *
 * Detects driving style from telemetry signals:
 *   - Brake point consistency  → brakeConfidence
 *   - Throttle application smoothness → throttleControl
 *   - Corner minimum speed retention → cornerSpeed
 *   - Lap-to-lap variance proxy (intra-lap signal variance) → consistency
 */

import type { ParsedLap, SegmentAnalysis } from "@/types/telemetry";
import type { DriverProfile, DrivingStyle } from "@/types/extended";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Counts throttle micro-corrections: rapid sign changes in the throttle derivative */
function countThrottleCorrections(throttle: number[]): number {
  let corrections = 0;
  let prev = throttle[1] - throttle[0];
  for (let i = 2; i < throttle.length; i++) {
    const cur = throttle[i] - throttle[i - 1];
    if (Math.abs(cur) > 3 && cur * prev < 0) corrections++;
    prev = cur;
  }
  return corrections;
}

/** Measures how sharp brake applications are (fast initial rise = confident) */
function measureBrakeSharpness(lap: ParsedLap): number {
  const events = lap.channelStats.brakingEvents;
  if (events.length === 0) return 50;

  const riseRates: number[] = [];
  for (const ev of events) {
    if (ev.peakBrake < 30) continue;
    const riseRows = ev.peakIdx - ev.startIdx;
    if (riseRows <= 0) continue;
    // Rate: brake% per sample
    const rate = ev.peakBrake / riseRows;
    riseRates.push(rate);
  }

  if (riseRates.length === 0) return 50;
  const avgRate = riseRates.reduce((a, b) => a + b, 0) / riseRates.length;

  // Normalise: >15% per sample = very sharp (confident), <3% = gradual
  return clamp(Math.round((avgRate / 15) * 100), 10, 100);
}

/** Measures brake point consistency: low variance = consistent */
function measureBrakeConsistency(lap: ParsedLap, totalDist: number): number {
  const events = lap.channelStats.brakingEvents;
  if (events.length < 3) return 60;

  // Group events into ~10 positional buckets and measure intra-bucket stddev
  const fractions = events.map((e) => e.startDist / totalDist);
  const buckets: Record<number, number[]> = {};
  fractions.forEach((f, i) => {
    const b = Math.floor(f * 10);
    if (!buckets[b]) buckets[b] = [];
    buckets[b].push(events[i].startDist);
  });

  const deviations: number[] = [];
  Object.values(buckets).forEach((dists) => {
    if (dists.length >= 2) deviations.push(stdDev(dists));
  });

  if (deviations.length === 0) return 60;
  const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // <5m stddev = very consistent (score 90+), >30m = inconsistent (score <30)
  return clamp(Math.round(100 - (avgDev / 30) * 70), 10, 100);
}

/** Measures throttle smoothness: fewer corrections = smoother */
function measureThrottleSmoothing(lap: ParsedLap): number {
  const throttles = lap.rows.map((r) => r.throttle);
  const corrections = countThrottleCorrections(throttles);
  // Normalise per 100 samples
  const rate = (corrections / throttles.length) * 100;
  // >5 corrections per 100 samples = rough, <0.5 = very smooth
  return clamp(Math.round(100 - (rate / 5) * 70), 10, 100);
}

/** Measures how well corner speed is maintained vs theoretical max */
function measureCornerSpeed(lap: ParsedLap): number {
  const minima = lap.channelStats.cornerMinima;
  if (minima.length === 0) return 50;

  // Compare each apex speed to the entry speed — bigger drop = lower score
  const retentions: number[] = [];
  for (const cm of minima) {
    // Find entry speed: max speed in 50 rows before apex
    const lookback = lap.rows.slice(Math.max(0, cm.idx - 50), cm.idx);
    if (lookback.length === 0) continue;
    const entrySpeed = Math.max(...lookback.map((r) => r.speed));
    if (entrySpeed < 20) continue;
    retentions.push(cm.speed / entrySpeed);
  }

  if (retentions.length === 0) return 50;
  const avgRetention = retentions.reduce((a, b) => a + b, 0) / retentions.length;

  // 0.85+ = good corner speed, 0.4 = very slow corners
  return clamp(Math.round(((avgRetention - 0.4) / 0.45) * 100), 10, 100);
}

// ─── Style classification ─────────────────────────────────────────────────────

function classifyStyle(
  brakeConfidence: number,
  throttleControl: number,
  consistency: number,
  cornerSpeed: number
): DrivingStyle {
  if (consistency < 40) return "inconsistent";
  if (brakeConfidence > 75 && throttleControl < 55) return "aggressive";
  if (throttleControl > 70 && cornerSpeed > 65 && consistency > 65) return "smooth";
  return "developing";
}

const STYLE_META: Record<DrivingStyle, { label: string; description: string; emoji: string }> = {
  aggressive: {
    label: "Aggressive",
    description: "Strong, committed braking with sharp inputs. Focus on smoothing the throttle exit for more time gains.",
    emoji: "⚡",
  },
  smooth: {
    label: "Smooth",
    description: "Well-controlled inputs and good corner speed retention. Push the brake points later to unlock the next level.",
    emoji: "🟢",
  },
  inconsistent: {
    label: "Inconsistent",
    description: "Good instincts but variability is costing you time. Picking fixed reference points will transform your consistency.",
    emoji: "🔄",
  },
  developing: {
    label: "Developing",
    description: "Building solid fundamentals. Each session you're more precise — keep focusing on one area at a time.",
    emoji: "📈",
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function detectDriverProfile(
  lap: ParsedLap,
  segmentAnalyses: SegmentAnalysis[]
): DriverProfile {
  const totalDist = lap.rows[lap.rows.length - 1].lapDist ?? 1;

  const brakeConfidence = measureBrakeSharpness(lap);
  const consistency     = measureBrakeConsistency(lap, totalDist);
  const throttleControl = measureThrottleSmoothing(lap);
  const cornerSpeed     = measureCornerSpeed(lap);

  const overallRating = Math.round(
    brakeConfidence * 0.25 +
    throttleControl * 0.25 +
    cornerSpeed     * 0.30 +
    consistency     * 0.20
  );

  const style = classifyStyle(brakeConfidence, throttleControl, consistency, cornerSpeed);
  const meta  = STYLE_META[style];

  // Derive strengths / areas
  const metrics: Array<[string, number]> = [
    ["Brake confidence", brakeConfidence],
    ["Throttle control", throttleControl],
    ["Corner speed",     cornerSpeed],
    ["Consistency",      consistency],
  ];
  metrics.sort((a, b) => b[1] - a[1]);

  const strengths       = metrics.slice(0, 2).filter(([, v]) => v > 60).map(([k]) => k);
  const areasToImprove  = metrics.slice(-2).filter(([, v]) => v < 65).map(([k]) => k);

  return {
    style,
    styleLabel:       meta.label,
    styleDescription: meta.description,
    brakeConfidence,
    throttleControl,
    cornerSpeed,
    consistency,
    overallRating,
    strengths,
    areasToImprove,
    emoji: meta.emoji,
  };
}
