/**
 * Telemetry parser — supports CSV and JSON formats.
 *
 * CSV expected columns (case-insensitive, any order):
 *   time, speed, throttle, brake, gear
 *   Optional: steer_angle, lap_dist, pos_x, pos_y
 *
 * JSON expected: array of objects with same fields.
 */

import type { TelemetryRow, ParsedLap, ChannelStats, BrakingEvent, ThrottleEvent, CornerMinimum } from "@/types/telemetry";

// ─── Column name aliases ──────────────────────────────────────────────────────

const ALIASES: Record<string, keyof TelemetryRow> = {
  // time
  time: "time", t: "time", timestamp: "time", elapsed: "time",
  // speed
  speed: "speed", spd: "speed", velocity: "speed", v: "speed",
  speed_kmh: "speed", speed_ms: "speed",
  // throttle
  throttle: "throttle", tps: "throttle", gas: "throttle", accel: "throttle",
  throttle_pct: "throttle",
  // brake
  brake: "brake", brk: "brake", brake_pct: "brake", brake_pressure: "brake",
  // gear
  gear: "gear", g: "gear",
  // optional
  steer_angle: "steerAngle", steer: "steerAngle", steering: "steerAngle",
  lap_dist: "lapDist", lap_distance: "lapDist", dist: "lapDist", distance: "lapDist",
  pos_x: "posX", x: "posX", posx: "posX",
  pos_y: "posY", y: "posY", posy: "posY",
};

function normaliseHeader(h: string): keyof TelemetryRow | null {
  const key = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
  return ALIASES[key] ?? null;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): TelemetryRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV слишком короткий — нужно минимум 2 строки");

  const headers = lines[0].split(",").map(normaliseHeader);

  const timeIdx = headers.indexOf("time");
  const speedIdx = headers.indexOf("speed");
  const throttleIdx = headers.indexOf("throttle");
  const brakeIdx = headers.indexOf("brake");
  const gearIdx = headers.indexOf("gear");

  if (timeIdx === -1) throw new Error("Не найдена колонка 'time' в CSV");
  if (speedIdx === -1) throw new Error("Не найдена колонка 'speed' в CSV");
  if (throttleIdx === -1) throw new Error("Не найдена колонка 'throttle' в CSV");
  if (brakeIdx === -1) throw new Error("Не найдена колонка 'brake' в CSV");

  const rows: TelemetryRow[] = [];
  const missing: number[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(",");

    const time = parseFloat(cells[timeIdx]);
    if (isNaN(time)) { missing.push(i + 1); continue; }

    const speed = parseFloat(cells[speedIdx]);
    // Handle speed in m/s — heuristic: if max raw speed < 100, assume m/s
    const speedFactor = 1; // will normalise after collecting all rows

    const row: TelemetryRow = {
      time,
      speed: isNaN(speed) ? 0 : speed,
      throttle: throttleIdx >= 0 ? Math.min(100, Math.max(0, parseFloat(cells[throttleIdx]) || 0)) : 0,
      brake: brakeIdx >= 0 ? Math.min(100, Math.max(0, parseFloat(cells[brakeIdx]) || 0)) : 0,
      gear: gearIdx >= 0 ? Math.round(parseFloat(cells[gearIdx]) || 1) : 1,
    };

    // optional columns
    headers.forEach((field, colIdx) => {
      if (!field || colIdx === timeIdx) return;
      const val = parseFloat(cells[colIdx]);
      if (!isNaN(val)) {
        if (field === "steerAngle") row.steerAngle = val;
        if (field === "lapDist") row.lapDist = val;
        if (field === "posX") row.posX = val;
        if (field === "posY") row.posY = val;
      }
    });

    rows.push(row);
  }

  if (rows.length === 0) throw new Error("Не удалось распарсить ни одной строки данных");

  // Auto-detect m/s vs km/h: if max speed < 100, it's probably m/s
  const maxRawSpeed = Math.max(...rows.map((r) => r.speed));
  if (maxRawSpeed < 100) {
    rows.forEach((r) => (r.speed = r.speed * 3.6));
  }

  // Auto-detect throttle/brake: if max < 2, assume 0–1 scale
  const maxRawThrottle = Math.max(...rows.map((r) => r.throttle));
  if (maxRawThrottle <= 1.0) {
    rows.forEach((r) => {
      r.throttle = r.throttle * 100;
      r.brake = r.brake * 100;
    });
  }

  // Synthesize lapDist from speed if not present
  if (!rows[0].lapDist) {
    let dist = 0;
    rows[0].lapDist = 0;
    for (let i = 1; i < rows.length; i++) {
      const dt = rows[i].time - rows[i - 1].time;
      const avgSpeed = (rows[i].speed + rows[i - 1].speed) / 2 / 3.6; // m/s
      dist += avgSpeed * dt;
      rows[i].lapDist = dist;
    }
  }

  return rows;
}

// ─── JSON parser ──────────────────────────────────────────────────────────────

function parseJSON(text: string): TelemetryRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Невалидный JSON файл");
  }

  // Support both array and {laps: [...], data: [...]} wrappers
  let rawRows: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawRows = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const candidate = obj.rows ?? obj.data ?? obj.laps ?? obj.telemetry;
    if (Array.isArray(candidate)) {
      rawRows = candidate;
    } else {
      throw new Error("JSON должен содержать массив строк данных");
    }
  }

  if (rawRows.length === 0) throw new Error("JSON файл пуст");

  const rows: TelemetryRow[] = rawRows.map((raw, i) => {
    const r = raw as Record<string, unknown>;
    const num = (keys: string[]): number => {
      for (const k of keys) {
        const v = r[k];
        if (typeof v === "number") return v;
        if (typeof v === "string") { const n = parseFloat(v); if (!isNaN(n)) return n; }
      }
      return 0;
    };

    return {
      time: num(["time", "t", "timestamp", "elapsed"]),
      speed: num(["speed", "spd", "velocity", "v", "speed_kmh"]),
      throttle: Math.min(100, Math.max(0, num(["throttle", "tps", "gas", "accel", "throttle_pct"]))),
      brake: Math.min(100, Math.max(0, num(["brake", "brk", "brake_pct"]))),
      gear: Math.round(num(["gear", "g"])) || 1,
      steerAngle: r.steer_angle !== undefined ? num(["steer_angle", "steer"]) : undefined,
      lapDist: r.lap_dist !== undefined ? num(["lap_dist", "dist", "distance"]) : undefined,
      posX: r.pos_x !== undefined ? num(["pos_x", "x"]) : undefined,
      posY: r.pos_y !== undefined ? num(["pos_y", "y"]) : undefined,
    };
  });

  // Same normalisation as CSV
  const maxSpeed = Math.max(...rows.map((r) => r.speed));
  if (maxSpeed < 100) rows.forEach((r) => (r.speed = r.speed * 3.6));

  const maxThrottle = Math.max(...rows.map((r) => r.throttle));
  if (maxThrottle <= 1.0) rows.forEach((r) => { r.throttle = r.throttle * 100; r.brake = r.brake * 100; });

  if (!rows[0].lapDist) {
    let dist = 0;
    rows[0].lapDist = 0;
    for (let i = 1; i < rows.length; i++) {
      const dt = rows[i].time - rows[i - 1].time;
      const avgSpeed = (rows[i].speed + rows[i - 1].speed) / 2 / 3.6;
      dist += avgSpeed * dt;
      rows[i].lapDist = dist;
    }
  }

  return rows;
}

// ─── Event detectors ──────────────────────────────────────────────────────────

function detectBrakingEvents(rows: TelemetryRow[]): BrakingEvent[] {
  const events: BrakingEvent[] = [];
  const BRAKE_THRESHOLD = 5;   // % — start of braking event
  const BRAKE_END_THRESHOLD = 2; // % — end of braking event

  let inBrake = false;
  let startIdx = 0;
  let peakIdx = 0;
  let peakBrake = 0;

  for (let i = 0; i < rows.length; i++) {
    const b = rows[i].brake;
    if (!inBrake && b >= BRAKE_THRESHOLD) {
      inBrake = true;
      startIdx = i;
      peakIdx = i;
      peakBrake = b;
    } else if (inBrake) {
      if (b > peakBrake) { peakBrake = b; peakIdx = i; }
      if (b < BRAKE_END_THRESHOLD || i === rows.length - 1) {
        events.push({
          startIdx, peakIdx, endIdx: i,
          startTime: rows[startIdx].time,
          peakBrake,
          entrySpeed: rows[startIdx].speed,
          exitSpeed: rows[i].speed,
          startDist: rows[startIdx].lapDist ?? 0,
        });
        inBrake = false;
        peakBrake = 0;
      }
    }
  }
  return events;
}

function detectThrottleEvents(rows: TelemetryRow[]): ThrottleEvent[] {
  const events: ThrottleEvent[] = [];
  // Find each throttle opening after a period of low throttle (corner entry)
  const LOW_THROTTLE = 15;
  const OPEN_THRESHOLD = 20;

  let wasLow = false;
  let minSpeedIdx = 0;
  let minSpeed = Infinity;

  for (let i = 1; i < rows.length; i++) {
    const t = rows[i].throttle;
    if (t < LOW_THROTTLE) {
      wasLow = true;
      if (rows[i].speed < minSpeed) { minSpeed = rows[i].speed; minSpeedIdx = i; }
    } else if (wasLow && t >= OPEN_THRESHOLD) {
      events.push({
        openIdx: i,
        openTime: rows[i].time,
        openDist: rows[i].lapDist ?? 0,
        openSpeed: rows[i].speed,
        priorMinSpeedIdx: minSpeedIdx,
      });
      wasLow = false;
      minSpeed = Infinity;
    }
  }
  return events;
}

function detectCornerMinima(rows: TelemetryRow[]): CornerMinimum[] {
  const minima: CornerMinimum[] = [];
  const WINDOW = 15;       // samples around a local minimum
  const MIN_SPEED_DROP = 20; // km/h drop required to count as corner entry

  // Find local speed minima
  for (let i = WINDOW; i < rows.length - WINDOW; i++) {
    const cur = rows[i].speed;
    let isMin = true;
    for (let j = i - WINDOW; j <= i + WINDOW; j++) {
      if (rows[j].speed < cur) { isMin = false; break; }
    }
    if (!isMin) continue;

    // Confirm it's a real corner (significant speed drop)
    const prevMax = Math.max(...rows.slice(Math.max(0, i - 40), i).map((r) => r.speed));
    if (prevMax - cur < MIN_SPEED_DROP) continue;

    // Skip if too close to previous minimum
    const lastMin = minima[minima.length - 1];
    if (lastMin && (rows[i].lapDist ?? 0) - (lastMin.dist) < 80) continue;

    const cornerNum = minima.length + 1;
    minima.push({
      idx: i,
      time: rows[i].time,
      dist: rows[i].lapDist ?? 0,
      speed: cur,
      cornerLabel: `Поворот ${cornerNum}`,
    });
  }
  return minima;
}

// ─── Channel stats ────────────────────────────────────────────────────────────

function computeChannelStats(rows: TelemetryRow[]): ChannelStats {
  const speeds = rows.map((r) => r.speed);
  return {
    maxSpeed: Math.max(...speeds),
    minSpeed: Math.min(...speeds),
    avgThrottle: rows.reduce((s, r) => s + r.throttle, 0) / rows.length,
    maxBrake: Math.max(...rows.map((r) => r.brake)),
    brakingEvents: detectBrakingEvents(rows),
    throttleEvents: detectThrottleEvents(rows),
    cornerMinima: detectCornerMinima(rows),
  };
}

// ─── Detect sample rate ───────────────────────────────────────────────────────

function detectSampleRate(rows: TelemetryRow[]): number {
  if (rows.length < 2) return 10;
  const diffs = rows.slice(1, 11).map((r, i) => r.time - rows[i].time).filter((d) => d > 0);
  if (!diffs.length) return 10;
  const avgDt = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.round(1 / avgDt);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function parseFile(file: File): Promise<ParsedLap> {
  const text = await file.text();
  const ext = file.name.toLowerCase().split(".").pop();

  let rows: TelemetryRow[];
  if (ext === "json") {
    rows = parseJSON(text);
  } else if (ext === "csv" || ext === "txt") {
    rows = parseCSV(text);
  } else {
    // Try CSV first, then JSON
    try { rows = parseCSV(text); }
    catch { rows = parseJSON(text); }
  }

  if (rows.length < 10) throw new Error("Слишком мало данных — минимум 10 строк");

  const lapTimeMs = Math.round(rows[rows.length - 1].time * 1000);

  return {
    id: `lap_${Date.now()}`,
    filename: file.name,
    rows,
    lapTimeMs,
    sampleRateHz: detectSampleRate(rows),
    channelStats: computeChannelStats(rows),
  };
}

export function lapTimeToString(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ms_ = ms % 1000;
  return `${m}:${s.toString().padStart(2, "0")}.${ms_.toString().padStart(3, "0")}`;
}
