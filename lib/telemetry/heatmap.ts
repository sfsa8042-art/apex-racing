/**
 * lib/telemetry/heatmap.ts
 *
 * Converts delta-time data + telemetry position (x,y or synthesised)
 * into a normalised set of HeatmapPoint[] for track visualisation.
 *
 * Strategy:
 *  1. If lapRows contain posX/posY → use directly, normalise to 0-1 canvas space
 *  2. Fallback → synthesise a plausible oval/circuit shape from lap distance
 *     using a parametric curve that resembles a typical circuit layout
 */

import type { TelemetryRow, DeltaResult } from "@/types/telemetry";
import type { HeatmapPoint, TrackHeatmapData } from "@/types/extended";
import { DELTA_POINTS } from "./delta";

// ─── Normalisation ────────────────────────────────────────────────────────────

function normaliseCoords(
  points: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = Math.max(maxX - minX, 1);
  const rangeY = Math.max(maxY - minY, 1);

  // Preserve aspect ratio — pad the shorter axis
  const scale = Math.min(1 / rangeX, 1 / rangeY);

  return points.map((p) => ({
    x: (p.x - minX) * scale,
    y: (p.y - minY) * scale,
  }));
}

// ─── GPS path ─────────────────────────────────────────────────────────────────

function extractGPSPath(rows: TelemetryRow[]): Array<{ x: number; y: number }> | null {
  // Need at least 70% of rows with valid coordinates
  const withCoords = rows.filter(
    (r) => r.posX !== undefined && r.posY !== undefined &&
           isFinite(r.posX!) && isFinite(r.posY!)
  );
  if (withCoords.length < rows.length * 0.7) return null;
  return withCoords.map((r) => ({ x: r.posX!, y: r.posY! }));
}

// ─── Synthesised path ─────────────────────────────────────────────────────────

/**
 * Generates a plausible race circuit outline from lap distance.
 * Uses a parametric curve with multiple frequency components to create
 * a realistic-looking asymmetric circuit — not a simple oval.
 */
function synthesisePath(totalDist: number, sampleCount: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < sampleCount; i++) {
    const t = (i / sampleCount) * Math.PI * 2;

    // Primary oval component
    let x = Math.cos(t);
    let y = Math.sin(t) * 0.65;

    // Add circuit-like irregularities (chicanes, hairpins, fast corners)
    x += 0.18 * Math.cos(2.1 * t);
    y += 0.14 * Math.sin(3.3 * t);
    x += 0.08 * Math.cos(5.7 * t);
    y += 0.06 * Math.sin(4.9 * t);

    // Asymmetry — makes it feel like a real circuit, not an oval
    x += 0.25 * Math.cos(t) * Math.sin(0.5 * t);

    points.push({ x, y });
  }

  return points;
}

// ─── Delta mapping ────────────────────────────────────────────────────────────

/**
 * Maps delta values (DELTA_POINTS resolution) onto the position path
 * (which may have different sample count). Uses linear interpolation.
 */
function mapDeltaToPath(
  path:   Array<{ x: number; y: number }>,
  delta:  DeltaResult,
  rows:   TelemetryRow[],
): HeatmapPoint[] {
  const totalDist = rows[rows.length - 1].lapDist ?? 0;
  const n = path.length;

  const maxLoss = Math.max(...delta.cumulativeDeltaS, 0.001);
  const minDelta = Math.min(...delta.cumulativeDeltaS);

  return path.map((pos, i) => {
    const frac = i / (n - 1);
    const distM = frac * totalDist;

    // Find matching delta index
    const dIdx = Math.min(
      delta.distanceM.length - 1,
      Math.round(frac * (delta.distanceM.length - 1))
    );
    const deltaS = delta.cumulativeDeltaS[dIdx];

    // Intensity: how much time are we losing here relative to the worst point?
    // Positive delta = losing time = high intensity
    const intensity = deltaS > 0
      ? Math.min(1, deltaS / maxLoss)
      : 0;

    return {
      x: pos.x,
      y: pos.y,
      dist: distM,
      deltaS,
      intensity,
    };
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildHeatmapData(
  rows:  TelemetryRow[],
  delta: DeltaResult,
  segmentLabels?: Array<{ startDist: number; label: string }>
): TrackHeatmapData {
  const totalDist = rows[rows.length - 1].lapDist ?? 0;

  const gpsPath = extractGPSPath(rows);
  const hasRealGPS = gpsPath !== null;

  const HEATMAP_POINTS = 300;

  let rawPath: Array<{ x: number; y: number }>;
  if (gpsPath) {
    // Downsample GPS path to HEATMAP_POINTS
    const step = Math.max(1, Math.floor(gpsPath.length / HEATMAP_POINTS));
    rawPath = gpsPath.filter((_, i) => i % step === 0).slice(0, HEATMAP_POINTS);
  } else {
    rawPath = synthesisePath(totalDist, HEATMAP_POINTS);
  }

  // Normalise to 0-1 coordinate space
  const normPath = normaliseCoords(rawPath);

  // Map delta values
  const points = mapDeltaToPath(normPath, delta, rows);

  // Attach segment labels if provided
  if (segmentLabels && segmentLabels.length > 0) {
    points.forEach((pt) => {
      const seg = segmentLabels.find((s, i) => {
        const next = segmentLabels[i + 1];
        return pt.dist >= s.startDist && (!next || pt.dist < next.startDist);
      });
      if (seg) pt.label = seg.label;
    });
  }

  const maxLossS = Math.max(...points.map((p) => p.deltaS), 0.001);

  return { points, maxLossS, totalDistM: totalDist, hasRealGPS };
}

/**
 * Returns a colour hex string for a given intensity (0–1).
 * Green → Yellow → Red gradient, similar to F1 TV delta visualisation.
 */
export function intensityToColor(intensity: number, alpha = 1): string {
  const i = Math.max(0, Math.min(1, intensity));

  let r: number, g: number, b: number;

  if (i < 0.5) {
    // Green → Yellow
    const t = i / 0.5;
    r = Math.round(t * 255);
    g = 200;
    b = 0;
  } else {
    // Yellow → Red
    const t = (i - 0.5) / 0.5;
    r = 255;
    g = Math.round((1 - t) * 200);
    b = 0;
  }

  if (alpha === 1) return `rgb(${r},${g},${b})`;
  return `rgba(${r},${g},${b},${alpha})`;
}
