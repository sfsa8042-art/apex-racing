/**
 * segments.ts — Automatic track segment detection.
 *
 * A "segment" is either a CORNER or a STRAIGHT.
 *
 * Detection strategy
 * ──────────────────
 * 1. Identify candidate corner regions by finding local speed minima that are
 *    preceded by significant braking and followed by throttle application.
 *    Each such region becomes a CORNER.
 *
 * 2. The gaps between corners are STRAIGHT regions.
 *
 * 3. For each corner we refine three key sub-points:
 *    • brakeStart  — where the brake trace rises above threshold
 *    • apex        — index of minimum speed within the corner region
 *    • throttleOpen— first sustained throttle after the apex
 *
 * 4. Corner boundaries extend:
 *    • From brakeStart (or 30 m before apex if no clear brake)
 *    • To throttleOpen + exit_margin (or 30 m after apex)
 *
 * Tuning constants are defined at the top so they are easy to adjust.
 */

import type { TelemetryRow, TrackSegment } from "@/types/telemetry";

// ─── Tuning ───────────────────────────────────────────────────────────────────

const SPEED_DROP_FOR_CORNER       = 22;   // km/h: GT3 cars carry speed, need higher threshold
const MIN_DIST_BETWEEN_CORNERS    = 55;   // m: allow tighter chicanes
const CORNER_PRE_BRAKE_MARGIN     = 45;   // m: GT3 brakes harder and earlier
const CORNER_POST_THROTTLE_MARGIN = 40;   // m: extend corner end after throttle open
const BRAKE_THRESHOLD_PCT         = 6;    // %: detect light trail braking too
const THROTTLE_OPEN_PCT           = 20;   // %: meaningful throttle application
const STRAIGHT_MIN_SPEED          = 0.72; // fraction of lap max speed

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Nearest row index for a given distance */
function rowAtDist(rows: TelemetryRow[], targetDist: number): number {
  let lo = 0, hi = rows.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if ((rows[mid].lapDist ?? 0) < targetDist) lo = mid; else hi = mid;
  }
  return Math.abs((rows[lo].lapDist ?? 0) - targetDist) <
         Math.abs((rows[hi].lapDist ?? 0) - targetDist) ? lo : hi;
}

/** Gaussian smooth a channel array (sigma in samples) */
function smooth(arr: number[], sigma: number): number[] {
  const r = Math.ceil(sigma * 2);
  const kernel: number[] = [];
  let s = 0;
  for (let k = -r; k <= r; k++) { const w = Math.exp(-(k * k) / (2 * sigma * sigma)); kernel.push(w); s += w; }
  const norm = kernel.map((w) => w / s);
  return arr.map((_, i) => {
    let v = 0;
    for (let k = -r; k <= r; k++) v += arr[Math.min(arr.length - 1, Math.max(0, i + k))] * norm[k + r];
    return v;
  });
}

/** Average of an array slice */
function avg(arr: number[], from: number, to: number): number {
  const sl = arr.slice(from, to + 1);
  return sl.reduce((a, b) => a + b, 0) / (sl.length || 1);
}

// ─── Phase 1: find candidate corner apexes ────────────────────────────────────

interface ApexCandidate {
  idx: number;
  dist: number;
  speed: number;
}

function findApexCandidates(rows: TelemetryRow[], smoothedSpeed: number[]): ApexCandidate[] {
  const n = rows.length;
  const lapMaxSpeed = Math.max(...smoothedSpeed);
  const candidates: ApexCandidate[] = [];

  // Window half-width in samples: 0.5 s at sample rate
  const win = Math.max(8, Math.round(n * 0.015));

  for (let i = win; i < n - win; i++) {
    const v = smoothedSpeed[i];

    // Local minimum check
    let isMin = true;
    for (let j = i - win; j <= i + win; j++) {
      if (smoothedSpeed[j] < v) { isMin = false; break; }
    }
    if (!isMin) continue;

    // Speed drop from recent maximum
    const prevMax = Math.max(...smoothedSpeed.slice(Math.max(0, i - win * 3), i));
    if (prevMax - v < SPEED_DROP_FOR_CORNER) continue;

    // Not too close to a previous candidate
    const dist = rows[i].lapDist ?? 0;
    const last = candidates[candidates.length - 1];
    if (last && dist - last.dist < MIN_DIST_BETWEEN_CORNERS) {
      // Keep the one with lower speed (deeper corner)
      if (v < last.speed) {
        candidates[candidates.length - 1] = { idx: i, dist, speed: v };
      }
      continue;
    }

    candidates.push({ idx: i, dist, speed: v });
  }

  return candidates;
}

// ─── Phase 2: find brake start before a given apex ────────────────────────────

function findBrakeStart(
  rows: TelemetryRow[],
  apexIdx: number,
  lookbackM: number = 150
): number {
  const apexDist = rows[apexIdx].lapDist ?? 0;
  const searchStart = rowAtDist(rows, Math.max(0, apexDist - lookbackM));

  for (let i = apexIdx - 1; i >= searchStart; i--) {
    if (rows[i].brake >= BRAKE_THRESHOLD_PCT && (i === 0 || rows[i - 1].brake < BRAKE_THRESHOLD_PCT)) {
      return i;
    }
  }
  // No clear brake start — use a fixed margin before the apex
  return rowAtDist(rows, Math.max(0, apexDist - CORNER_PRE_BRAKE_MARGIN));
}

// ─── Phase 3: find throttle open after apex ───────────────────────────────────

function findThrottleOpen(
  rows: TelemetryRow[],
  apexIdx: number,
  lookforwardM: number = 120
): number {
  const apexDist = rows[apexIdx].lapDist ?? 0;
  const totalDist = rows[rows.length - 1].lapDist ?? 0;
  const searchEnd = rowAtDist(rows, Math.min(totalDist, apexDist + lookforwardM));

  // Need THROTTLE_OPEN_PCT for at least 3 consecutive samples
  let count = 0;
  for (let i = apexIdx; i <= searchEnd; i++) {
    if (rows[i].throttle >= THROTTLE_OPEN_PCT) {
      count++;
      if (count >= 3) return Math.max(apexIdx, i - 2);
    } else {
      count = 0;
    }
  }
  return rowAtDist(rows, Math.min(totalDist, apexDist + CORNER_POST_THROTTLE_MARGIN));
}

// ─── Phase 4: compute segment stats ──────────────────────────────────────────

function segmentStats(rows: TelemetryRow[], startIdx: number, endIdx: number) {
  const slice = rows.slice(startIdx, endIdx + 1);
  const speeds = slice.map((r) => r.speed);
  const throttles = slice.map((r) => r.throttle);
  const brakes = slice.map((r) => r.brake);
  const timeMs = Math.round((rows[endIdx].time - rows[startIdx].time) * 1000);

  return {
    maxSpeed: Math.max(...speeds),
    minSpeed: Math.min(...speeds),
    avgThrottle: throttles.reduce((a, b) => a + b, 0) / throttles.length,
    avgBrake: brakes.reduce((a, b) => a + b, 0) / brakes.length,
    timeMs: Math.max(timeMs, 1),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function detectSegments(rows: TelemetryRow[]): TrackSegment[] {
  if (rows.length < 20) return [];

  const totalDist = rows[rows.length - 1].lapDist ?? 0;
  const rawSpeed  = rows.map((r) => r.speed);

  // Smooth speed to avoid false minima from noise
  const sigma = Math.max(2, Math.round(rows.length * 0.008));
  const smoothedSpeed = smooth(rawSpeed, sigma);

  const apexes = findApexCandidates(rows, smoothedSpeed);
  if (apexes.length === 0) {
    // No corners found — entire lap is one straight
    return [{
      id: "straight_0",
      type: "straight",
      label: "Прямая",
      startDist: 0, endDist: totalDist,
      startIdx: 0,  endIdx: rows.length - 1,
      ...segmentStats(rows, 0, rows.length - 1),
    }];
  }

  const segments: TrackSegment[] = [];
  let cornerCount = 0;
  let prevSegmentEnd = 0;           // last row index used
  let prevSegmentEndDist = 0;

  for (const apex of apexes) {
    const brakeStartIdx   = findBrakeStart(rows, apex.idx);
    const throttleOpenIdx = findThrottleOpen(rows, apex.idx);

    // Corner start = brake start − pre-brake margin
    const cornerStartDist = Math.max(
      prevSegmentEndDist,
      (rows[brakeStartIdx].lapDist ?? 0) - CORNER_PRE_BRAKE_MARGIN
    );
    const cornerStartIdx = rowAtDist(rows, cornerStartDist);

    // Corner end = throttle open + post-throttle margin
    const cornerEndDist = Math.min(
      totalDist,
      (rows[throttleOpenIdx].lapDist ?? 0) + CORNER_POST_THROTTLE_MARGIN
    );
    const cornerEndIdx = rowAtDist(rows, cornerEndDist);

    // Straight before this corner (if there is a gap)
    if (cornerStartIdx > prevSegmentEnd + 3) {
      const stats = segmentStats(rows, prevSegmentEnd, cornerStartIdx - 1);
      segments.push({
        id: `straight_${segments.length}`,
        type: "straight",
        label: "Прямая",
        startDist: prevSegmentEndDist,
        endDist: cornerStartDist,
        startIdx: prevSegmentEnd,
        endIdx: cornerStartIdx - 1,
        ...stats,
      });
    }

    // The corner itself
    cornerCount++;
    const stats = segmentStats(rows, cornerStartIdx, cornerEndIdx);
    segments.push({
      id: `corner_${cornerCount}`,
      type: "corner",
      label: `Поворот ${cornerCount}`,
      startDist: cornerStartDist,
      endDist: cornerEndDist,
      startIdx: cornerStartIdx,
      endIdx: cornerEndIdx,
      apexIdx: apex.idx,
      apexDist: apex.dist,
      apexSpeed: Math.round(smoothedSpeed[apex.idx] * 10) / 10,
      brakeStartDist: rows[brakeStartIdx].lapDist ?? 0,
      throttleOpenDist: rows[throttleOpenIdx].lapDist ?? 0,
      ...stats,
    });

    prevSegmentEnd = cornerEndIdx;
    prevSegmentEndDist = cornerEndDist;
  }

  // Final straight after last corner
  if (prevSegmentEnd < rows.length - 2) {
    const stats = segmentStats(rows, prevSegmentEnd, rows.length - 1);
    segments.push({
      id: `straight_${segments.length}`,
      type: "straight",
      label: "Прямая",
      startDist: prevSegmentEndDist,
      endDist: totalDist,
      startIdx: prevSegmentEnd,
      endIdx: rows.length - 1,
      ...stats,
    });
  }

  return segments;
}

/**
 * Match user segments to reference segments by relative position on track.
 * Returns pairs [userIdx, refIdx] (−1 if no match).
 */
export function matchSegments(
  userSegments: TrackSegment[],
  refSegments: TrackSegment[],
  userTotalDist: number,
  refTotalDist: number
): Array<[number, number]> {
  return userSegments.map((us, ui) => {
    const uFrac = (us.startDist + us.endDist) / 2 / userTotalDist;

    let bestJ = -1;
    let bestDiff = Infinity;
    refSegments.forEach((rs, ri) => {
      if (rs.type !== us.type) return;
      const rFrac = (rs.startDist + rs.endDist) / 2 / refTotalDist;
      const diff = Math.abs(uFrac - rFrac);
      if (diff < 0.12 && diff < bestDiff) {
        bestDiff = diff;
        bestJ = ri;
      }
    });
    return [ui, bestJ] as [number, number];
  });
}
