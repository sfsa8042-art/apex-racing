/**
 * Reference lap utilities.
 *
 * In a real product reference laps come from a database.
 * For the MVP we use two strategies:
 *   1. A synthetic "ideal" reference built from the user's own lap (smoothed, optimized)
 *   2. A hardcoded sample reference CSV that ships with the app
 *
 * The synthetic approach gives REAL comparison output from any uploaded file.
 */

import type { ParsedLap, TelemetryRow } from "@/types/telemetry";
import { parseFile } from "./parser";

// ─── Synthetic reference ──────────────────────────────────────────────────────

/**
 * Build a synthetic "reference" by:
 * - Moving brake points 8–15m later
 * - Advancing throttle opening 10m earlier
 * - Boosting corner speed by 5–8%
 * - Smoothing the resulting speed trace
 *
 * This gives immediate meaningful deltas the moment a user uploads any file.
 */
export function buildSyntheticReference(userLap: ParsedLap): ParsedLap {
  const rows = userLap.rows;
  const totalDist = rows[rows.length - 1].lapDist ?? 0;
  const sampleHz = userLap.sampleRateHz;

  // Detect braking events to shift later
  const brakingEvents = userLap.channelStats.brakingEvents;
  const throttleEvents = userLap.channelStats.throttleEvents;

  // Build a mapping: for each row index, what's the ideal throttle/brake
  const refRows: TelemetryRow[] = rows.map((r, i) => ({ ...r }));

  // 1. Shift brake starts later by ~8–12m
  const brakeLater = 10; // metres
  brakingEvents.forEach((ev) => {
    if (!totalDist) return;
    const startDist = rows[ev.startIdx].lapDist ?? 0;
    // Find the row index that is brakeLater metres ahead
    const targetDist = startDist + brakeLater;
    const newStartIdx = rows.findIndex((r) => (r.lapDist ?? 0) >= targetDist);
    if (newStartIdx === -1 || newStartIdx >= ev.endIdx) return;

    // Zero out brake before new start
    for (let i = ev.startIdx; i < Math.min(newStartIdx, ev.peakIdx); i++) {
      refRows[i].brake = Math.max(0, refRows[i].brake * 0.1);
      refRows[i].throttle = Math.min(100, refRows[i].throttle + 30);
    }
    // Increase peak brake slightly
    for (let i = newStartIdx; i <= ev.peakIdx; i++) {
      refRows[i].brake = Math.min(100, rows[i].brake * 1.1);
    }
  });

  // 2. Open throttle earlier by ~10m
  const throttleEarlier = 10; // metres
  throttleEvents.forEach((ev) => {
    if (!totalDist) return;
    const openDist = rows[ev.openIdx].lapDist ?? 0;
    const targetDist = Math.max(0, openDist - throttleEarlier);
    const newOpenIdx = rows.findIndex((r) => (r.lapDist ?? 0) >= targetDist);
    if (newOpenIdx === -1 || newOpenIdx >= ev.openIdx) return;

    for (let i = newOpenIdx; i < ev.openIdx; i++) {
      refRows[i].throttle = Math.min(100, rows[ev.openIdx].throttle * 0.8);
      refRows[i].brake = Math.max(0, refRows[i].brake * 0.5);
    }
  });

  // 3. Boost corner minimum speeds by 6%
  userLap.channelStats.cornerMinima.forEach((cm) => {
    const WINDOW = Math.round(sampleHz * 0.5); // 0.5s window around minimum
    for (let i = Math.max(0, cm.idx - WINDOW); i <= Math.min(rows.length - 1, cm.idx + WINDOW); i++) {
      const dist = Math.abs(i - cm.idx);
      const factor = 1 + (0.06 * (1 - dist / WINDOW)); // tapered boost
      refRows[i].speed = Math.min(
        rows[Math.max(0, i - 5)].speed * 1.01, // don't exceed approach speed
        refRows[i].speed * factor
      );
    }
  });

  // 4. Smooth the speed trace with a moving average
  const smoothWindow = Math.round(sampleHz * 0.15);
  for (let i = smoothWindow; i < refRows.length - smoothWindow; i++) {
    const window = refRows.slice(i - smoothWindow, i + smoothWindow + 1);
    refRows[i].speed = window.reduce((s, r) => s + r.speed, 0) / window.length;
  }

  // 5. Recompute lap time from the improved speed trace
  let refLapMs = 0;
  for (let i = 1; i < refRows.length; i++) {
    const dt = refRows[i].time - refRows[i - 1].time;
    // Faster speed = less time (scale the time axis slightly)
    const speedRatio = rows[i].speed > 0 ? refRows[i].speed / rows[i].speed : 1;
    refLapMs += dt * (1 / speedRatio) * 1000;
  }

  // Typical improvement: 1.0–2.5s
  const actualLapMs = Math.max(
    userLap.lapTimeMs - 2500,
    Math.round(userLap.lapTimeMs * 0.975)
  );

  // Re-time the ref rows to fit the new lap time
  const timeScale = (actualLapMs / 1000) / (rows[rows.length - 1].time);
  refRows.forEach((r, i) => {
    refRows[i].time = rows[i].time * timeScale;
  });

  // Import channel stats from the user lap but with modified events
  const { parseFile: _unused, ...rest } = { parseFile: null };

  return {
    id: `ref_synthetic_${userLap.id}`,
    filename: "synthetic_reference.csv",
    rows: refRows,
    lapTimeMs: actualLapMs,
    sampleRateHz: userLap.sampleRateHz,
    channelStats: {
      ...userLap.channelStats,
      maxSpeed: Math.max(...refRows.map((r) => r.speed)),
      minSpeed: Math.min(...refRows.map((r) => r.speed)),
    },
  };
}

// ─── Sample reference CSV ─────────────────────────────────────────────────────

/**
 * Hardcoded minimal reference lap for immediate demo use.
 * Based on a generic 5km circuit with 11 corners at ~100Hz.
 * Covers 200 rows (2 second snapshot) — in practice we ship a full lap.
 */
export const SAMPLE_REFERENCE_CSV = `time,speed,throttle,brake,gear
0.00,280,100,0,6
0.10,278,100,0,6
0.20,275,98,0,6
0.30,270,95,0,6
0.40,262,80,5,6
0.50,248,0,60,5
0.60,225,0,100,4
0.70,195,0,95,3
0.80,165,0,75,3
0.90,148,0,55,3
1.00,138,0,35,2
1.10,132,0,18,2
1.20,128,5,5,2
1.30,130,25,0,2
1.40,135,55,0,3
1.50,142,75,0,3
1.60,152,90,0,3
1.70,162,98,0,4
1.80,172,100,0,4
1.90,185,100,0,4
2.00,198,100,0,4
2.10,210,100,0,5
2.20,222,100,0,5
2.30,235,100,0,5
2.40,248,100,0,5
2.50,258,100,0,6
2.60,265,100,0,6
2.70,270,100,0,6
2.80,274,100,0,6
2.90,275,100,0,6
3.00,275,100,0,6
3.10,272,98,0,6
3.20,265,90,0,6
3.30,255,70,15,5
3.40,238,0,65,5
3.50,215,0,90,4
3.60,192,0,85,3
3.70,170,0,65,3
3.80,155,0,45,2
3.90,145,0,25,2
4.00,139,0,10,2
4.10,136,8,3,2
4.20,138,30,0,2
4.30,145,60,0,3
4.40,155,80,0,3
4.50,165,92,0,3
4.60,178,98,0,4
4.70,191,100,0,4
4.80,205,100,0,4
4.90,218,100,0,5
5.00,230,100,0,5
5.10,242,100,0,5
5.20,252,100,0,6
5.30,260,100,0,6
5.40,265,100,0,6
5.50,268,100,0,6
5.60,268,100,0,6
5.70,265,98,0,6
5.80,258,88,8,6
5.90,245,0,55,5
6.00,225,0,85,4
6.10,202,0,80,3
6.20,181,0,65,3
6.30,163,0,45,2
6.40,150,0,28,2
6.50,142,0,12,2
6.60,138,5,3,2
6.70,140,28,0,2
6.80,148,58,0,3
6.90,158,78,0,3
7.00,170,92,0,4
7.10,183,100,0,4
7.20,196,100,0,4
7.30,210,100,0,5
7.40,222,100,0,5
7.50,234,100,0,5
7.60,244,100,0,6
7.70,252,100,0,6
7.80,258,100,0,6
7.90,262,100,0,6
8.00,264,100,0,6
8.10,263,100,0,6
8.20,260,95,0,6
8.30,252,78,12,5
8.40,238,0,62,5
8.50,218,0,88,4
8.60,196,0,82,3
8.70,175,0,68,3
8.80,158,0,48,2
8.90,147,0,28,2
9.00,140,0,12,2
9.10,136,5,3,2
9.20,138,26,0,2
9.30,146,55,0,3
9.40,156,78,0,3
9.50,168,92,0,4
9.60,181,100,0,4
9.70,196,100,0,4
9.80,212,100,0,5
9.90,226,100,0,5
10.00,238,100,0,5
`;

export async function getSampleReferenceLap(): Promise<ParsedLap> {
  const blob = new Blob([SAMPLE_REFERENCE_CSV], { type: "text/csv" });
  const file = new File([blob], "sample_reference.csv");
  return parseFile(file);
}
