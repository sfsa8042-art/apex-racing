/**
 * lib/progress/tracker.ts
 *
 * Persists lap history to localStorage.
 * Computes improvement trends and motivational messaging.
 */

import type { LapAnalysisResult } from "@/types/telemetry";
import type { LapHistoryEntry, ProgressSummary, DrivingStyle } from "@/types/extended";

const STORAGE_KEY = "apex_lap_history_v2"; // v2 = no pre-loaded mock data
const MAX_ENTRIES = 50;

// ─── Storage ──────────────────────────────────────────────────────────────────

export function loadHistory(): LapHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LapHistoryEntry[]) : [];
  } catch { return []; }
}

export function saveEntry(entry: LapHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const history = loadHistory();
    // Prepend newest entry
    const updated = [entry, ...history].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* Storage full or unavailable */ }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Entry builder ────────────────────────────────────────────────────────────

export function buildHistoryEntry(
  filename:   string,
  result:     LapAnalysisResult,
  lapTimeMs:  number,
  style:      DrivingStyle
): LapHistoryEntry {
  const topInsight = result.insights.find((i) => i.severity === "critical" || i.severity === "warning");
  const track = filename.toLowerCase().includes("monza")    ? "Monza"
              : filename.toLowerCase().includes("spa")      ? "Spa"
              : filename.toLowerCase().includes("silver")   ? "Silverstone"
              : filename.toLowerCase().includes("nürburg")  ? "Nürburgring"
              : null;

  return {
    id:           result.lapId,
    filename,
    uploadedAt:   new Date().toISOString(),
    lapTimeMs,
    totalDeltaMs: result.totalTimeDeltaMs,
    overallScore: result.overallScore,
    track,
    car:          null,
    profileStyle: style,
    topIssue:     topInsight?.category ?? null,
  };
}

// ─── Progress summary ─────────────────────────────────────────────────────────

export function computeProgress(
  currentEntry: LapHistoryEntry
): ProgressSummary {
  const history = loadHistory();

  if (history.length === 0) {
    return {
      entries:            [currentEntry],
      bestLapTimeMs:      currentEntry.lapTimeMs,
      latestDeltaMs:      currentEntry.totalDeltaMs,
      improvementMs:      null,
      improvementMessage: "This is your first lap! Drive a few more to track progress.",
      trend:              "first",
      scoreHistory:       [currentEntry.overallScore],
      lapTimeHistory:     [currentEntry.lapTimeMs],
    };
  }

  const all        = [currentEntry, ...history];
  const lapTimes   = all.map((e) => e.lapTimeMs).filter(Boolean);
  const bestLapMs  = Math.min(...lapTimes);
  const prevEntry  = history[0];

  // Improvement vs previous lap: positive = faster
  const improvementMs = prevEntry
    ? prevEntry.lapTimeMs - currentEntry.lapTimeMs
    : null;

  let trend: ProgressSummary["trend"] = "stable";
  if (history.length < 2) trend = "first";
  else if (improvementMs !== null && improvementMs > 100)  trend = "improving";
  else if (improvementMs !== null && improvementMs < -150) trend = "declining";

  const improvementMessage = buildMessage(improvementMs, currentEntry.overallScore, trend);

  return {
    entries:        all.slice(0, 10),
    bestLapTimeMs:  bestLapMs,
    latestDeltaMs:  currentEntry.totalDeltaMs,
    improvementMs,
    improvementMessage,
    trend,
    scoreHistory:   all.slice(0, 10).map((e) => e.overallScore).reverse(),
    lapTimeHistory: all.slice(0, 10).map((e) => e.lapTimeMs).reverse(),
  };
}

function buildMessage(
  improvementMs: number | null,
  score: number,
  trend: ProgressSummary["trend"]
): string {
  if (trend === "first") {
    return score > 70
      ? "Solid first lap! The data is in — let's find where the time is hiding."
      : "Your first lap is analysed. You have real gains waiting in the next session.";
  }

  if (improvementMs === null) return "Keep driving — the trend will show soon.";

  const secs = (Math.abs(improvementMs) / 1000).toFixed(3);

  if (improvementMs > 500)  return `You improved by ${secs}s since last session. Outstanding! 🏆`;
  if (improvementMs > 150)  return `You gained ${secs}s since last session. Clear progress. 🟢`;
  if (improvementMs > 30)   return `Marginally faster (+${secs}s). Small gains compound over time.`;
  if (improvementMs >= -30) return "Essentially the same pace. Consistency is the next step.";
  if (improvementMs >= -150) return `Slightly slower (${secs}s). Check if tyre or fuel conditions changed.`;
  return `This session was ${secs}s slower. Don't worry — use the analysis to find why.`;
}

// ─── Wow summary builder ──────────────────────────────────────────────────────

export function buildWowSummary(
  result:   LapAnalysisResult,
  progress: ProgressSummary,
  profile:  import("@/types/extended").DriverProfile
): import("@/types/extended").WowSummary {
  type WI = import("@/types/extended").WowIssue;
  const r = result as unknown as {
    hasReference?: boolean;
    diagnostics?: {
      diagnostics: { titleRu: string; corner?: string; metricRu: string; severity: string }[];
      smoothnessScore: number;
    };
  };
  const hasReference = r.hasReference ?? false;
  const potentialGainS = result.optimalLap.potentialGainMs / 1000;

  // ── Diagnostic mode: no reference lap. Honest, measured, Russian. ──
  if (!hasReference) {
    const items = r.diagnostics?.diagnostics ?? [];
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const top = [...items].sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3)).slice(0, 3);
    const topThreeIssues: WI[] = top.map((d) => ({
      segmentLabel:     d.corner ?? "",
      issueType:        "diagnostic",
      descriptionShort: d.titleRu,
      lossS:            0,
      metricRu:         d.metricRu,
      academyLink:      null,
      academyTitle:     null,
    }));
    const n = items.length;
    const headline = n === 0
      ? "Чистый круг — грубых ошибок нет"
      : `Найдено ${n} ${pluralRu(n, "замечание", "замечания", "замечаний")} по технике`;
    const subheadline = n === 0
      ? "Техника ровная. Загрузи эталонный круг, чтобы увидеть, где ещё есть время."
      : top[0]
        ? `Главное — ${top[0].titleRu.toLowerCase()}${top[0].corner ? ` (${top[0].corner})` : ""}`
        : "Замечания по технике ввода";
    const motivationalLine = n === 0
      ? "Грубых ошибок ввода нет. Дальше — сравнение с эталоном или твоим лучшим кругом."
      : "Это объективные замеры с твоего круга, без догадок. Исправляй по приоритету.";
    return {
      headline, subheadline,
      totalLossS: 0, totalLossSFormatted: "0.000",
      worstSegmentLabel: top[0]?.corner ?? "", worstSegmentLossS: 0,
      topThreeIssues, goodAreas: [],
      motivationalLine, potentialGainS: 0,
      overallScore: result.overallScore, profile,
      hasReference: false,
      smoothnessScore: r.diagnostics?.smoothnessScore,
      issuesCount: n,
    };
  }

  // ── Reference mode: real reference lap present. Russian. ──
  const totalLossS = Math.max(0, result.totalTimeDeltaMs / 1000);

  const topIssues = result.segmentAnalyses
    .filter((sa) => sa.deltaMs > 50 && sa.segment.type === "corner")
    .sort((a, b) => b.deltaMs - a.deltaMs)
    .slice(0, 3);

  const goodAreas = result.segmentAnalyses
    .filter((sa) => sa.deltaMs <= 80 && sa.insights.some((i) => i.type === "good_segment"))
    .map((sa) => sa.segment.label)
    .slice(0, 2);

  const worstSeg = topIssues[0];
  const topThreeIssues: WI[] = topIssues.map((sa) => {
    const ins = sa.insights.find((i) => i.type !== "good_segment");
    return {
      segmentLabel:     sa.segment.label,
      issueType:        ins?.type ?? "general",
      descriptionShort: ins ? shortDescription(ins.type) : "Потеря времени",
      lossS:            sa.deltaMs / 1000,
      academyLink:      ins?.academyModuleId ? `/academy?module=${ins.academyModuleId}` : null,
      academyTitle:     ins?.academyModuleTitleRu ?? null,
    };
  });

  const motivationalLine = buildMotivation(totalLossS, potentialGainS, profile.style);
  const secondsStr = totalLossS.toFixed(3);
  const headline = totalLossS > 0.05
    ? `Теряешь ${secondsStr}с на круге`
    : "Почти на уровне эталона — отлично!";

  const worstLabel = worstSeg?.segment.label ?? "среднем секторе";
  const secondWorst = topIssues[1]?.segment.label;
  const subheadline = worstSeg
    ? `Больше всего — ${worstLabel}${secondWorst ? ` и ${secondWorst}` : ""}`
    : "Темп ровный по всем секторам";

  return {
    headline, subheadline, totalLossS,
    totalLossSFormatted: secondsStr,
    worstSegmentLabel: worstLabel,
    worstSegmentLossS: (worstSeg?.deltaMs ?? 0) / 1000,
    topThreeIssues, goodAreas, motivationalLine, potentialGainS,
    overallScore: result.overallScore, profile,
    hasReference: true,
  };
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function shortDescription(type: string): string {
  const map: Record<string, string> = {
    early_brake:    "Раннее торможение",
    late_brake:     "Позднее торможение",
    low_apex_speed: "Низкая скорость в апексе",
    late_throttle:  "Поздний газ",
    early_throttle: "Слишком ранний газ",
    speed_deficit:  "Дефицит скорости",
  };
  return map[type] ?? "Ошибка техники";
}

function buildMotivation(totalLossS: number, gainS: number, style: DrivingStyle): string {
  if (totalLossS < 0.3) return "Ты очень близко к эталону. Один сфокусированный заезд закроет разрыв.";
  if (gainS < 0.5)      return `${gainS.toFixed(2)}с потенциала прямо здесь. Это один сфокусированный заезд.`;
  if (style === "aggressive") return `${gainS.toFixed(2)}с на столе. Сгладь выходы — и они твои.`;
  if (style === "smooth")     return `${gainS.toFixed(2)}с потенциала. Двигай точки торможения позже и забирай.`;
  if (style === "inconsistent") return "Сначала стабильность — темп есть, когда он повторяем.";
  return `${gainS.toFixed(2)}с улучшения реальны за следующие два заезда.`;
}
