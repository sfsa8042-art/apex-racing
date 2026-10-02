/**
 * Track-path derivation.
 *
 * Builds the 2-D shape of a circuit from a single lap's telemetry — no
 * pre-drawn silhouette, no external map, works for ANY track and sim.
 *
 *  1. If the lap carries world coordinates (posX/posY), use them directly.
 *  2. Otherwise dead-reckon the path: a cornering car's lateral acceleration
 *     equals v·ω (ω = yaw rate), so ω = aLat / v. Integrate ω → heading, then
 *     integrate the velocity vector → x/y. Falls back to steering angle when no
 *     lateral-G channel is present.
 *
 * A small closure correction distributes the accumulated integration drift so
 * the loop joins up cleanly, and the result is normalised into a 0–1 box with
 * aspect ratio preserved.
 */

import type { TelemetryRow } from "@/types/telemetry";

export interface TrackPath {
  points: { x: number; y: number }[];   // normalised 0–1, Y up
  closed: boolean;
  source: "position" | "derived";
  // fraction (0–1 of lap distance) for each point, for cursor/segment mapping
  frac: number[];
}

const G = 9.81;
const STEER_GAIN = 0.0085;   // deg→yaw scale when only steering is available (empirical)

function bbox(pts: { x: number; y: number }[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// Distribute closing drift across all points so the loop joins, then normalise
// into a 0–1 box (aspect preserved, centred).
function finalize(
  raw: { x: number; y: number }[],
  frac: number[],
  source: TrackPath["source"],
): TrackPath {
  const n = raw.length;
  // closure correction
  const drift = { x: raw[n - 1].x - raw[0].x, y: raw[n - 1].y - raw[0].y };
  const driftMag = Math.hypot(drift.x, drift.y);
  const span = Math.hypot(bbox(raw).w, bbox(raw).h) || 1;
  const corrected = raw.map((p, i) => {
    const t = i / (n - 1);
    return { x: p.x - drift.x * t, y: p.y - drift.y * t };
  });
  // normalise
  const b = bbox(corrected);
  const scale = Math.max(b.w, b.h) || 1;
  const offX = (scale - b.w) / 2;
  const offY = (scale - b.h) / 2;
  const points = corrected.map(p => ({
    x: (p.x - b.minX + offX) / scale,
    y: (p.y - b.minY + offY) / scale,
  }));
  // closed if drift was small relative to track size
  const closed = driftMag / span < 0.25;
  return { points, closed, source, frac };
}

export function deriveTrackPath(rows: TelemetryRow[]): TrackPath | null {
  if (!rows || rows.length < 12) return null;

  const total = rows[rows.length - 1]?.lapDist ?? 0;
  const fracOf = (r: TelemetryRow, i: number) =>
    total > 0 ? (r.lapDist ?? 0) / total : i / (rows.length - 1);

  // 1. Real world coordinates present?
  const posCount = rows.filter(r => typeof r.posX === "number" && typeof r.posY === "number").length;
  if (posCount > rows.length * 0.8) {
    const raw = rows.map(r => ({ x: r.posX as number, y: r.posY as number }));
    return finalize(raw, rows.map(fracOf), "position");
  }

  // 2. Dead reckoning — need speed + (lateralG or steerAngle)
  const hasLat = rows.some(r => typeof r.lateralG === "number" && Math.abs(r.lateralG as number) > 0.02);
  const hasSteer = rows.some(r => typeof r.steerAngle === "number" && Math.abs(r.steerAngle as number) > 0.5);
  if (!hasLat && !hasSteer) return null;

  let heading = 0, x = 0, y = 0;
  const raw: { x: number; y: number }[] = [{ x, y }];
  const frac: number[] = [fracOf(rows[0], 0)];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i], p = rows[i - 1];
    const dt = Math.min(0.2, Math.max(1e-3, r.time - p.time));
    const vms = Math.max(0.5, r.speed / 3.6);
    let yaw = 0;
    if (hasLat && typeof r.lateralG === "number") {
      yaw = (r.lateralG * G) / vms;            // rad/s
    } else if (typeof r.steerAngle === "number") {
      yaw = r.steerAngle * STEER_GAIN * vms;   // rough
    }
    heading += yaw * dt;
    x += Math.cos(heading) * vms * dt;
    y += Math.sin(heading) * vms * dt;
    raw.push({ x, y });
    frac.push(fracOf(r, i));
  }

  return finalize(raw, frac, "derived");
}

// Resample a TrackPath to N evenly-spaced points (by index) for smooth drawing.
export function resamplePath(path: TrackPath, n = 240): { x: number; y: number }[] {
  const src = path.points;
  if (src.length <= n) return src;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (src.length - 1);
    const lo = Math.floor(t), hi = Math.min(src.length - 1, lo + 1);
    const f = t - lo;
    out.push({ x: src[lo].x + (src[hi].x - src[lo].x) * f, y: src[lo].y + (src[hi].y - src[lo].y) * f });
  }
  return out;
}

// Point on the path at lap fraction (0–1), for the moving car marker.
export function pointAtFrac(path: TrackPath, f: number): { x: number; y: number } {
  const fr = path.frac;
  if (!fr.length) return { x: 0.5, y: 0.5 };
  const target = Math.max(0, Math.min(1, f));
  let lo = 0, hi = fr.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (fr[mid] < target) lo = mid; else hi = mid; }
  const span = fr[hi] - fr[lo] || 1;
  const t = (target - fr[lo]) / span;
  const a = path.points[lo], b = path.points[hi];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
