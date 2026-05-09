/**
 * delta.ts — Real delta-time calculation between two laps.
 *
 * Algorithm:
 * 1. Both laps are interpolated to DELTA_POINTS evenly-spaced distance steps.
 * 2. At each distance step d, the time for each lap to reach d is recovered
 *    by integrating dt = dd / v(d).  This is exact for the piecewise-linear
 *    speed interpolation we already have.
 * 3. Δt(d) = t_user(d) − t_ref(d).  Positive = user is slower at that point.
 * 4. A Gaussian kernel smooths the instantaneous Δt for visual clarity.
 */

import type { TelemetryRow, DeltaResult } from "@/types/telemetry";

export const DELTA_POINTS = 500; // resolution — 500 points over full lap

// ─── Core interpolation helper ────────────────────────────────────────────────

/**
 * Builds a look-up: for every target distance d, what is the elapsed lap time?
 * Uses speed integration: time to travel a segment = distance / avg_speed.
 */
function buildTimeAtDistance(rows: TelemetryRow[], points: number): number[] {
  const totalDist = rows[rows.length - 1].lapDist ?? 0;
  if (totalDist === 0) {
    // Fall back to linear time scaling when no distance data
    const lapTime = rows[rows.length - 1].time;
    return Array.from({ length: points }, (_, i) => (i / (points - 1)) * lapTime);
  }

  const step = totalDist / (points - 1);
  const result: number[] = new Array(points);
  result[0] = rows[0].time;

  let rowIdx = 0; // current position in the rows array

  for (let i = 1; i < points; i++) {
    const targetDist = i * step;

    // Advance rowIdx until rows[rowIdx+1].lapDist >= targetDist
    while (
      rowIdx < rows.length - 2 &&
      (rows[rowIdx + 1].lapDist ?? 0) < targetDist
    ) {
      rowIdx++;
    }

    const r0 = rows[rowIdx];
    const r1 = rows[Math.min(rowIdx + 1, rows.length - 1)];

    const d0 = r0.lapDist ?? 0;
    const d1 = r1.lapDist ?? 0;
    const t0 = r0.time;
    const t1 = r1.time;

    if (d1 <= d0) {
      result[i] = t0;
      continue;
    }

    // Linear interpolation of time vs distance within this segment
    const t = (targetDist - d0) / (d1 - d0);
    result[i] = t0 + t * (t1 - t0);
  }

  return result;
}

// ─── Gaussian smoother ────────────────────────────────────────────────────────

function gaussianSmooth(arr: number[], sigma: number): number[] {
  const radius = Math.ceil(sigma * 2.5);
  const kernel: number[] = [];
  let kernelSum = 0;
  for (let k = -radius; k <= radius; k++) {
    const w = Math.exp(-(k * k) / (2 * sigma * sigma));
    kernel.push(w);
    kernelSum += w;
  }
  const normKernel = kernel.map((w) => w / kernelSum);

  return arr.map((_, i) => {
    let val = 0;
    for (let k = -radius; k <= radius; k++) {
      const j = Math.min(arr.length - 1, Math.max(0, i + k));
      val += arr[j] * normKernel[k + radius];
    }
    return val;
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeDelta(userRows: TelemetryRow[], refRows: TelemetryRow[]): DeltaResult {
  const userTotalDist = userRows[userRows.length - 1].lapDist ?? 0;
  const refTotalDist  = refRows[refRows.length - 1].lapDist ?? 0;

  // Use the shorter lap's distance as the common x-axis
  // (avoids extrapolation beyond track end)
  const commonDist = Math.min(userTotalDist, refTotalDist);
  const pts = DELTA_POINTS;

  // Build time-at-distance arrays
  const userTimeAtDist = buildTimeAtDistance(userRows, pts);
  const refTimeAtDist  = buildTimeAtDistance(refRows,  pts);

  // Distance axis
  const step = commonDist / (pts - 1);
  const distanceM = Array.from({ length: pts }, (_, i) => i * step);

  // Cumulative delta: Δt(d) = t_user(d) – t_ref(d)
  const cumulativeDeltaS = userTimeAtDist.map((ut, i) => ut - refTimeAtDist[i]);

  // Instantaneous delta: derivative of cumulative (forward difference)
  const instantDeltaS: number[] = new Array(pts).fill(0);
  for (let i = 1; i < pts; i++) {
    instantDeltaS[i] = cumulativeDeltaS[i] - cumulativeDeltaS[i - 1];
  }
  instantDeltaS[0] = instantDeltaS[1];

  // Smooth for chart colouring (sigma = 8 steps ≈ ~1.6% of lap)
  const smoothedDeltaS = gaussianSmooth(instantDeltaS, 8);

  const totalDeltaMs = Math.round(cumulativeDeltaS[pts - 1] * 1000);

  // Worst point: maximum cumulative delta (furthest behind reference)
  const worstIdx = cumulativeDeltaS.reduce(
    (best, v, i) => (v > cumulativeDeltaS[best] ? i : best),
    0
  );

  // Best point: minimum cumulative delta (furthest ahead of reference)
  const bestIdx = cumulativeDeltaS.reduce(
    (best, v, i) => (v < cumulativeDeltaS[best] ? i : best),
    0
  );

  return { distanceM, cumulativeDeltaS, instantDeltaS, smoothedDeltaS, totalDeltaMs, worstIdx, bestIdx };
}

/**
 * Given a DeltaResult and a list of segment distance boundaries,
 * returns the delta contribution (ms) for each segment.
 * Positive = user lost time in that segment.
 */
export function deltaPerSegment(
  delta: DeltaResult,
  segments: Array<{ startDist: number; endDist: number }>,
  totalLapDist: number
): number[] {
  const pts = delta.distanceM.length;

  return segments.map(({ startDist, endDist }) => {
    const startFrac = startDist / totalLapDist;
    const endFrac   = endDist   / totalLapDist;

    const startIdx = Math.max(0, Math.round(startFrac * (pts - 1)));
    const endIdx   = Math.min(pts - 1, Math.round(endFrac   * (pts - 1)));

    if (endIdx <= startIdx) return 0;

    const deltaAtStart = delta.cumulativeDeltaS[startIdx];
    const deltaAtEnd   = delta.cumulativeDeltaS[endIdx];

    return Math.round((deltaAtEnd - deltaAtStart) * 1000); // ms
  });
}

/**
 * Build chart-ready data for the delta visualisation.
 * Returns normalised [0–1] delta values plus raw seconds for tooltips.
 */
export function buildDeltaChartData(delta: DeltaResult): {
  normalisedDelta: number[];
  rawDeltaS: number[];
  zeroLine: number;
  minDeltaS: number;
  maxDeltaS: number;
} {
  const raw = delta.cumulativeDeltaS;
  const minDeltaS = Math.min(...raw);
  const maxDeltaS = Math.max(...raw);
  const range = Math.max(maxDeltaS - minDeltaS, 0.01);

  const normalisedDelta = raw.map((v) => (v - minDeltaS) / range);
  const zeroLine = (0 - minDeltaS) / range;

  return { normalisedDelta, rawDeltaS: raw, zeroLine, minDeltaS, maxDeltaS };
}
