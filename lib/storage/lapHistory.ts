/**
 * lapHistory.ts — persistent client-side archive of recent laps.
 *
 * Stores the full data of recent laps (not just metadata) in the browser so a
 * lap can be re-opened later and, crucially, used as an honest personal
 * reference ("vs your best lap on this track"). No server round-trip, no
 * fabricated reference.
 *
 * Layout (localStorage):
 *   apex:laps:index      → JSON array of StoredLapMeta (small, newest first)
 *   apex:lap:<id>        → the lap CSV (one key per lap)
 *
 * The index is capped at MAX_LAPS; the oldest laps (and their CSV keys) are
 * evicted first. All writes are quota-safe — on failure the archive simply
 * keeps fewer laps and the app degrades to diagnostic mode.
 */

import type { ParsedLap } from "@/types/telemetry";

const INDEX_KEY = "apex:laps:index";
const LAP_PREFIX = "apex:lap:";
const MAX_LAPS = 20;

export interface StoredLapMeta {
  id:           string;
  filename:     string;
  trackId:      string | null;
  trackName:    string;
  car:          string | null;
  lapTimeMs:    number;
  overallScore: number;
  hasReference: boolean;
  uploadedAt:   string;   // ISO 8601
}

const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

/** Serialize a parsed lap back to a CSV that the parser can re-read. */
export function serializeLap(lap: ParsedLap): string {
  const lines = ["time,speed,throttle,brake,gear,rpm,steerAngle,lateralG,lonG,lapDist,normPos,posX,posY"];
  for (const r of lap.rows) {
    lines.push([
      r.time.toFixed(3),
      r.speed.toFixed(1),
      r.throttle.toFixed(1),
      r.brake.toFixed(1),
      r.gear,
      r.rpm ?? 0,
      (r.steerAngle ?? 0).toFixed(2),
      (r.lateralG ?? 0).toFixed(4),
      (r.lonG ?? 0).toFixed(4),
      (r.lapDist ?? 0).toFixed(1),
      r.normPos != null ? r.normPos.toFixed(5) : "",
      r.posX ?? "",
      r.posY ?? "",
    ].join(","));
  }
  return lines.join("\n");
}

export function listLapHistory(): StoredLapMeta[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as StoredLapMeta[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function getLapCsv(id: string): string | null {
  if (!hasStorage()) return null;
  try { return window.localStorage.getItem(LAP_PREFIX + id); } catch { return null; }
}

/** Fastest stored lap for a track (the personal best), if any. */
export function getBestLap(trackId: string | null): StoredLapMeta | null {
  if (!trackId) return null;
  const laps = listLapHistory().filter((l) => l.trackId === trackId && l.lapTimeMs > 0);
  if (laps.length === 0) return null;
  return laps.reduce((best, l) => (l.lapTimeMs < best.lapTimeMs ? l : best));
}

export function getBestLapCsv(trackId: string | null): { csv: string; lapTimeMs: number } | null {
  const best = getBestLap(trackId);
  if (!best) return null;
  const csv = getLapCsv(best.id);
  return csv ? { csv, lapTimeMs: best.lapTimeMs } : null;
}

function writeIndex(index: StoredLapMeta[]): void {
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

/**
 * Save a lap to the archive. De-duplicates by id, prepends (newest first),
 * caps at MAX_LAPS, and evicts the oldest laps' CSV keys. Quota-safe: on a
 * write failure it drops the oldest extra lap and retries a few times.
 */
export function saveLapToHistory(meta: StoredLapMeta, csv: string): boolean {
  if (!hasStorage() || !csv || !meta.id) return false;
  try {
    let index = listLapHistory().filter((l) => l.id !== meta.id);
    index.unshift(meta);

    // Evict oldest beyond the cap (remove their CSV blobs too).
    while (index.length > MAX_LAPS) {
      const dropped = index.pop();
      if (dropped) { try { window.localStorage.removeItem(LAP_PREFIX + dropped.id); } catch { /* ignore */ } }
    }

    // Write the CSV, shedding old laps if we hit quota.
    let attempts = 0;
    while (true) {
      try {
        window.localStorage.setItem(LAP_PREFIX + meta.id, csv);
        break;
      } catch {
        // quota — drop the oldest lap (not the one we're saving) and retry
        if (index.length <= 1 || attempts++ > MAX_LAPS) return false;
        const oldest = index[index.length - 1];
        if (oldest && oldest.id !== meta.id) {
          index = index.slice(0, -1);
          try { window.localStorage.removeItem(LAP_PREFIX + oldest.id); } catch { /* ignore */ }
        } else break;
      }
    }

    writeIndex(index);
    return true;
  } catch {
    return false;
  }
}

export function removeLap(id: string): void {
  if (!hasStorage()) return;
  try {
    const index = listLapHistory().filter((l) => l.id !== id);
    writeIndex(index);
    window.localStorage.removeItem(LAP_PREFIX + id);
  } catch { /* ignore */ }
}

export function clearLapHistory(): void {
  if (!hasStorage()) return;
  try {
    for (const l of listLapHistory()) window.localStorage.removeItem(LAP_PREFIX + l.id);
    window.localStorage.removeItem(INDEX_KEY);
  } catch { /* ignore */ }
}
