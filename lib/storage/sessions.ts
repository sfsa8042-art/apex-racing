/**
 * lib/storage/sessions.ts
 *
 * MVP session storage using the local filesystem.
 * Sessions are stored as JSON files under /uploads/sessions/.
 * In production, replace with a real DB (Postgres, SQLite, etc.)
 */

import { writeFile, readFile, readdir, mkdir } from "fs/promises";
import { existsSync }  from "fs";
import path            from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionStatus = "pending" | "processing" | "ready" | "error";

export interface TelemetrySession {
  id:             string;
  userId:         string;
  filename:       string;
  originalPath:   string;          // path on the desktop
  storedPath:     string;          // path on the server
  sizeBytes:      number;
  format:         "csv" | "json";
  source:         "desktop" | "browser";
  status:         SessionStatus;
  uploadedAt:     string;          // ISO 8601
  processedAt:    string | null;
  lapTimeMs:      number | null;
  totalDeltaMs:   number | null;
  overallScore:   number | null;
  insightsCount:  number | null;
  error:          string | null;
  /** Track / car detected from filename heuristics */
  detectedTrack:  string | null;
  detectedCar:    string | null;
}

// ─── Paths ────────────────────────────────────────────────────────────────────

function getStorageRoot(): string {
  // Use project root in dev, /tmp in test environments
  return process.env.APEX_STORAGE_PATH
    ?? path.join(process.cwd(), "uploads");
}

function sessionDir(): string {
  return path.join(getStorageRoot(), "sessions");
}

function fileDir(): string {
  return path.join(getStorageRoot(), "files");
}

async function ensureDirs() {
  await mkdir(sessionDir(), { recursive: true });
  await mkdir(fileDir(),    { recursive: true });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function saveSession(session: TelemetrySession): Promise<void> {
  await ensureDirs();
  const p = path.join(sessionDir(), `${session.id}.json`);
  await writeFile(p, JSON.stringify(session, null, 2), "utf8");
}

export async function getSession(id: string): Promise<TelemetrySession | null> {
  const p = path.join(sessionDir(), `${id}.json`);
  if (!existsSync(p)) return null;
  const raw = await readFile(p, "utf8");
  return JSON.parse(raw) as TelemetrySession;
}

export async function updateSession(
  id:      string,
  updates: Partial<TelemetrySession>
): Promise<TelemetrySession | null> {
  const existing = await getSession(id);
  if (!existing) return null;
  const updated  = { ...existing, ...updates };
  await saveSession(updated);
  return updated;
}

export async function listSessions(userId?: string): Promise<TelemetrySession[]> {
  try {
    await ensureDirs();
    const files = await readdir(sessionDir());
    const sessions: TelemetrySession[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(path.join(sessionDir(), file), "utf8");
        const s   = JSON.parse(raw) as TelemetrySession;
        if (!userId || s.userId === userId) sessions.push(s);
      } catch {
        // Corrupt file — skip
      }
    }

    return sessions.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  } catch {
    // Directory doesn't exist yet or filesystem unavailable — return empty
    return [];
  }
}

export async function storeFile(buffer: Buffer, filename: string): Promise<string> {
  await ensureDirs();
  // Sanitise filename to prevent path traversal
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ts   = Date.now();
  const dest = path.join(fileDir(), `${ts}_${safe}`);
  await writeFile(dest, buffer);
  return dest;
}

// ─── Heuristics ───────────────────────────────────────────────────────────────

export function detectTrackFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  const knownTracks: [string, string][] = [
    ["monza", "Монца"], ["spa",  "Спа"], ["silverstone", "Сильверстоун"],
    ["nurburgring", "Нюрбургринг"], ["barcelona", "Барселона"],
    ["zandvoort", "Зандворт"], ["budapest", "Будапешт"],
    ["mugello", "Муджелло"], ["suzuka", "Сузука"],
    ["interlagos", "Интерлагос"],
  ];
  for (const [key, name] of knownTracks) {
    if (lower.includes(key)) return name;
  }
  return null;
}

export function detectCarFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  const knownCars: [string, string][] = [
    ["porsche", "Porsche 992 GT3 R"], ["ferrari", "Ferrari 296 GT3"],
    ["bmw", "BMW M4 GT3"],             ["mercedes", "AMG GT3"],
    ["audi", "Audi R8 LMS"],           ["lamborghini", "Lamborghini Huracán GT3"],
  ];
  for (const [key, name] of knownCars) {
    if (lower.includes(key)) return name;
  }
  return null;
}
