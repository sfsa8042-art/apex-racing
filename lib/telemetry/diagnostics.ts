/**
 * Reference-free driving diagnostics.
 *
 * Finds genuine technique errors from a SINGLE lap — no reference lap, no
 * fabricated "pro" comparison. Every finding is an objectively measurable fact
 * (coasting time, throttle/brake overlap, brake stabs, snap throttle, steering
 * corrections, wheelspin) with an honest measured metric, never a made-up time
 * delta. This is the truthful core the corner / insights / AI views build on.
 */

import type {
  ParsedLap, TelemetryRow, Diagnostic, DiagnosticsReport,
} from "@/types/telemetry";
export type { Diagnostic, DiagnosticsReport, DiagnosticType } from "@/types/telemetry";

// ── Helpers ───────────────────────────────────────────────────────────────────
type Corner = { label: string; startDist: number; endDist: number };

function dt(lap: ParsedLap): number {
  return lap.sampleRateHz > 0 ? 1 / lap.sampleRateHz : 0.02;
}
function distOf(r: TelemetryRow): number { return r.lapDist ?? 0; }

function cornerAt(corners: Corner[] | undefined, d: number): string | undefined {
  if (!corners) return undefined;
  const c = corners.find(c => d >= c.startDist && d <= c.endDist);
  return c?.label;
}

// Local "is the car cornering / should be working" test — used to ignore benign
// straight-line coasting (e.g. brief lift on a straight) and focus on corners.
function corneringMask(rows: TelemetryRow[]): boolean[] {
  // cornering where steering is meaningful OR lateral-G high OR speed is a local dip
  const maxSpeed = rows.reduce((m, r) => Math.max(m, r.speed), 1);
  return rows.map(r => {
    const steer = Math.abs(r.steerAngle ?? 0);
    const lat = Math.abs(r.lateralG ?? 0);
    const slowish = r.speed < maxSpeed * 0.92;
    return steer > 12 || lat > 0.45 || slowish;
  });
}

// ── 1. Coasting — neither throttle nor brake while the car should be loaded ────
function detectCoasting(lap: ParsedLap, corners?: Corner[]): { diags: Diagnostic[]; total: number } {
  const rows = lap.rows, d = dt(lap);
  const corner = corneringMask(rows);
  const diags: Diagnostic[] = [];
  let total = 0;
  let i = 0;
  while (i < rows.length) {
    const r = rows[i];
    const coasting = (r.throttle ?? 0) < 4 && (r.brake ?? 0) < 4 && corner[i];
    if (!coasting) { i++; continue; }
    let j = i;
    while (j < rows.length && (rows[j].throttle ?? 0) < 4 && (rows[j].brake ?? 0) < 4 && corner[j]) j++;
    const durS = (j - i) * d;
    total += durS;
    if (durS >= 0.35) {
      const startDist = distOf(rows[i]), endDist = distOf(rows[j - 1]);
      diags.push({
        id: `coast-${i}`,
        type: "coasting",
        severity: durS >= 0.8 ? "high" : durS >= 0.5 ? "medium" : "low",
        category: "throttle",
        titleRu: "Накат (коастинг)",
        descriptionRu: `${durS.toFixed(1)} с едешь без газа и тормоза${cornerAt(corners, startDist) ? ` в ${cornerAt(corners, startDist)}` : ""}. Машина не загружена — теряешь и скорость, и стабильность.`,
        adviceRu: "Соединяй торможение и газ: отпускай тормоз позже (трейл-брейкинг) и раньше подхватывай газ, чтобы между ними не было паузы.",
        metricRu: `${durS.toFixed(1)} с наката`,
        corner: cornerAt(corners, startDist),
        startDist, endDist,
      });
    }
    i = j;
  }
  return { diags, total };
}

// ── 2. Throttle/brake overlap — both pressed together (beyond trail transition) ─
function detectOverlap(lap: ParsedLap, corners?: Corner[]): { diags: Diagnostic[]; total: number } {
  const rows = lap.rows, d = dt(lap);
  const diags: Diagnostic[] = [];
  let total = 0, i = 0;
  while (i < rows.length) {
    const ov = (rows[i].throttle ?? 0) > 15 && (rows[i].brake ?? 0) > 15;
    if (!ov) { i++; continue; }
    let j = i;
    while (j < rows.length && (rows[j].throttle ?? 0) > 15 && (rows[j].brake ?? 0) > 15) j++;
    const durS = (j - i) * d;
    total += durS;
    if (durS >= 0.3) {
      const startDist = distOf(rows[i]), endDist = distOf(rows[j - 1]);
      diags.push({
        id: `ov-${i}`,
        type: "overlap",
        severity: durS >= 0.6 ? "high" : "medium",
        category: "brake",
        titleRu: "Газ и тормоз вместе",
        descriptionRu: `${durS.toFixed(1)} с одновременно жмёшь газ и тормоз${cornerAt(corners, startDist) ? ` в ${cornerAt(corners, startDist)}` : ""}. Тормоз гасит тягу — мотор и тормоза работают друг против друга.`,
        adviceRu: "Полностью отпускай тормоз перед открытием газа (если это не осознанный лефт-фут на стабилизацию).",
        metricRu: `${durS.toFixed(1)} с наложения`,
        corner: cornerAt(corners, startDist),
        startDist, endDist,
      });
    }
    i = j;
  }
  return { diags, total };
}

// ── 3. Brake modulation — releasing and re-applying inside one braking zone ────
function detectBrakeStabs(lap: ParsedLap, corners?: Corner[]): { diags: Diagnostic[]; stabs: number } {
  const rows = lap.rows;
  const diags: Diagnostic[] = [];
  let stabs = 0, i = 0;
  while (i < rows.length) {
    if ((rows[i].brake ?? 0) < 10) { i++; continue; }
    // find the braking zone
    let j = i;
    while (j < rows.length && (rows[j].brake ?? 0) >= 8) j++;
    // count re-applications: local minima that dip then rise ≥12%
    let reApply = 0, lastPeak = rows[i].brake ?? 0, dipped = false, dipVal = lastPeak;
    for (let k = i; k < j; k++) {
      const b = rows[k].brake ?? 0;
      if (b < dipVal) dipVal = b;
      if (b < lastPeak - 12) dipped = true;
      if (dipped && b > dipVal + 12) { reApply++; dipped = false; lastPeak = b; dipVal = b; }
      lastPeak = Math.max(lastPeak, b);
    }
    if (reApply >= 1) {
      stabs += reApply;
      const startDist = distOf(rows[i]), endDist = distOf(rows[j - 1]);
      diags.push({
        id: `stab-${i}`,
        type: "brake_modulation",
        severity: reApply >= 2 ? "medium" : "low",
        category: "brake",
        titleRu: "Доторможка",
        descriptionRu: `Тормоз отпущен и снова нажат ${reApply}× в одной зоне${cornerAt(corners, startDist) ? ` (${cornerAt(corners, startDist)})` : ""} — нестабильное торможение.`,
        adviceRu: "Тормози один раз: резкий выход на пик, затем плавное снижение. Без повторных нажатий.",
        metricRu: `${reApply}× повторных нажатий`,
        corner: cornerAt(corners, startDist),
        startDist, endDist,
        count: reApply,
      });
    }
    i = j + 1;
  }
  return { diags, stabs };
}

// ── 4. Snap throttle — abrupt throttle spike at low speed (wheelspin risk) ──────
function detectSnapThrottle(lap: ParsedLap, corners?: Corner[]): Diagnostic[] {
  const rows = lap.rows, d = dt(lap);
  const win = Math.max(1, Math.round(0.1 / d)); // 0.1 s window
  const maxSpeed = rows.reduce((m, r) => Math.max(m, r.speed), 1);
  const diags: Diagnostic[] = [];
  for (let i = win; i < rows.length; i++) {
    const rise = (rows[i].throttle ?? 0) - (rows[i - win].throttle ?? 0);
    const lowSpeed = rows[i].speed < maxSpeed * 0.6;
    if (rise > 45 && lowSpeed && (rows[i].throttle ?? 0) > 60) {
      const startDist = distOf(rows[i - win]), endDist = distOf(rows[i]);
      diags.push({
        id: `snap-${i}`,
        type: "snap_throttle",
        severity: rise > 65 ? "medium" : "low",
        category: "throttle",
        titleRu: "Резкое открытие газа",
        descriptionRu: `Газ открыт на +${Math.round(rise)}% за 0.1 с на низкой скорости${cornerAt(corners, startDist) ? ` (${cornerAt(corners, startDist)})` : ""} — риск пробуксовки и потери тяги.`,
        adviceRu: "Прогрессивнее открывай газ на выходе: 20–30% в апексе, затем плавно до полного по мере распрямления руля.",
        metricRu: `+${Math.round(rise)}% за 0.1 с`,
        corner: cornerAt(corners, startDist),
        startDist, endDist,
      });
      i += win * 3; // avoid duplicate flags for the same event
    }
  }
  return diags;
}

// ── 5. Steering corrections — sawing at the wheel mid-corner ────────────────────
function detectSteeringCorrections(lap: ParsedLap, corners?: Corner[]): Diagnostic[] {
  const rows = lap.rows, d = dt(lap);
  if (typeof rows.find(r => r.steerAngle !== undefined)?.steerAngle !== "number") return [];
  const corner = corneringMask(rows);
  const diags: Diagnostic[] = [];
  // group cornering regions, count steering-rate sign changes above noise
  let i = 0;
  while (i < rows.length) {
    if (!corner[i]) { i++; continue; }
    let j = i;
    while (j < rows.length && corner[j]) j++;
    let reversals = 0;
    let prevRate = 0;
    for (let k = i + 1; k < j; k++) {
      const rate = ((rows[k].steerAngle ?? 0) - (rows[k - 1].steerAngle ?? 0)) / d;
      if (Math.abs(rate) < 8) continue;                  // ignore tiny movements (deg/s)
      if (prevRate !== 0 && Math.sign(rate) !== Math.sign(prevRate)) reversals++;
      prevRate = rate;
    }
    const durS = (j - i) * d;
    const rate = durS > 0 ? reversals / durS : 0;   // corrections per second
    // normal cornering ≲1 correction/s (turn-in + unwind). Genuine sawing is rapid.
    if (reversals >= 4 && rate >= 2.5 && durS > 0.5) {
      const startDist = distOf(rows[i]), endDist = distOf(rows[j - 1]);
      diags.push({
        id: `steer-${i}`,
        type: "steering_correction",
        severity: reversals >= 6 ? "medium" : "low",
        category: "steering",
        titleRu: "Подруливания",
        descriptionRu: `${reversals} коррекций рулём${cornerAt(corners, startDist) ? ` в ${cornerAt(corners, startDist)}` : ""} — машина нестабильна или линия неровная.`,
        adviceRu: "Один плавный поворот руля на вход, фиксация у апекса, плавное распрямление. Меньше суеты — стабильнее платформа.",
        metricRu: `${reversals} коррекций`,
        corner: cornerAt(corners, startDist),
        startDist, endDist,
        count: reversals,
      });
    }
    i = j;
  }
  return diags;
}

// ── 6. Wheelspin — rear slip high under power at exit (needs slip data) ─────────
function detectWheelspin(lap: ParsedLap, corners?: Corner[]): Diagnostic[] {
  const rows = lap.rows, d = dt(lap);
  if (typeof rows.find(r => r.wheelSlipRL !== undefined)?.wheelSlipRL !== "number") return [];
  const diags: Diagnostic[] = [];
  let i = 0;
  while (i < rows.length) {
    const rearSlip = ((rows[i].wheelSlipRL ?? 0) + (rows[i].wheelSlipRR ?? 0)) / 2;
    const onPower = (rows[i].throttle ?? 0) > 50;
    if (!(rearSlip > 0.18 && onPower)) { i++; continue; }
    let j = i;
    while (j < rows.length && ((rows[j].wheelSlipRL ?? 0) + (rows[j].wheelSlipRR ?? 0)) / 2 > 0.15 && (rows[j].throttle ?? 0) > 40) j++;
    const durS = (j - i) * d;
    if (durS >= 0.2) {
      const startDist = distOf(rows[i]), endDist = distOf(rows[j - 1]);
      diags.push({
        id: `spin-${i}`,
        type: "wheelspin",
        severity: durS >= 0.5 ? "high" : "medium",
        category: "traction",
        titleRu: "Пробуксовка на выходе",
        descriptionRu: `Задняя ось буксует ${durS.toFixed(1)} с под газом${cornerAt(corners, startDist) ? ` (${cornerAt(corners, startDist)})` : ""} — теряешь тягу и греешь шины.`,
        adviceRu: "Дозируй газ плавнее до распрямления руля; рассмотри короче передачу или больше TC, если пробуксовка повторяется.",
        metricRu: `${durS.toFixed(1)} с пробуксовки`,
        corner: cornerAt(corners, startDist),
        startDist, endDist,
      });
      i = j;
    } else i++;
  }
  return diags;
}

// ── Input smoothness (reference-free) ──────────────────────────────────────────
function smoothness(lap: ParsedLap): number {
  const rows = lap.rows;
  if (rows.length < 3) return 100;
  // mean absolute jerk of throttle + steering, normalised
  let thrJerk = 0, steerJerk = 0, n = 0;
  for (let i = 2; i < rows.length; i++) {
    const t2 = (rows[i].throttle ?? 0) - 2 * (rows[i - 1].throttle ?? 0) + (rows[i - 2].throttle ?? 0);
    thrJerk += Math.abs(t2);
    const s2 = (rows[i].steerAngle ?? 0) - 2 * (rows[i - 1].steerAngle ?? 0) + (rows[i - 2].steerAngle ?? 0);
    steerJerk += Math.abs(s2);
    n++;
  }
  thrJerk /= n; steerJerk /= n;
  // map: low jerk → high score. Tuned so clean inputs ≈ 85-95.
  const thrScore = Math.max(0, 100 - thrJerk * 9);
  const steerScore = Math.max(0, 100 - steerJerk * 4);
  return Math.round(thrScore * 0.55 + steerScore * 0.45);
}

// ── Public entry ────────────────────────────────────────────────────────────────
const SEV_RANK = { high: 0, medium: 1, low: 2 } as const;

export function runDiagnostics(lap: ParsedLap, corners?: Corner[]): DiagnosticsReport {
  if (!lap.rows.length) {
    return { diagnostics: [], coastingTotalS: 0, overlapTotalS: 0, brakeStabs: 0, smoothnessScore: 0, summaryRu: "", hasData: false };
  }

  const coast = detectCoasting(lap, corners);
  const overlap = detectOverlap(lap, corners);
  const stabs = detectBrakeStabs(lap, corners);
  const snap = detectSnapThrottle(lap, corners);
  const steer = detectSteeringCorrections(lap, corners);
  const spin = detectWheelspin(lap, corners);

  const diagnostics = [
    ...coast.diags, ...overlap.diags, ...stabs.diags, ...snap, ...steer, ...spin,
  ].sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.startDist - b.startDist);

  const smooth = smoothness(lap);

  // Honest summary
  const parts: string[] = [];
  const high = diagnostics.filter(d => d.severity === "high").length;
  if (!diagnostics.length) {
    parts.push("Грубых ошибок ввода не найдено — техника чистая.");
  } else {
    if (coast.total > 0.8) parts.push(`Всего ${coast.total.toFixed(1)} с наката за круг — главный резерв.`);
    if (overlap.total > 0.5) parts.push(`${overlap.total.toFixed(1)} с газа с тормозом.`);
    if (stabs.stabs > 0) parts.push(`${stabs.stabs} повторных нажатий на тормоз.`);
    if (high > 0) parts.push(`${high} серьёзных замечаний по технике.`);
    if (parts.length === 0) parts.push(`${diagnostics.length} замечаний по технике.`);
  }
  parts.push(`Плавность ввода: ${smooth}/100.`);

  return {
    diagnostics,
    coastingTotalS: coast.total,
    overlapTotalS: overlap.total,
    brakeStabs: stabs.stabs,
    smoothnessScore: smooth,
    summaryRu: parts.join(" "),
    hasData: true,
  };
}
