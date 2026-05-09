/**
 * lib/progress/tracker.ts
 *
 * Persists lap history to localStorage.
 * Computes improvement trends and motivational messaging.
 */

import type { LapAnalysisResult } from "@/types/telemetry";
import type { LapHistoryEntry, ProgressSummary, DrivingStyle } from "@/types/extended";

const STORAGE_KEY = "apex_lap_history";
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
  const topThreeIssues = topIssues.map((sa) => {
    const ins = sa.insights.find((i) => i.type !== "good_segment");
    return {
      segmentLabel:     sa.segment.label,
      issueType:        ins?.type ?? "general",
      descriptionShort: ins ? shortDescription(ins.type) : "Time loss detected",
      lossS:            sa.deltaMs / 1000,
      academyLink:      ins?.academyModuleId ? `/academy?module=${ins.academyModuleId}` : null,
      academyTitle:     ins?.academyModuleTitleRu ?? null,
    };
  });

  const potentialGainS = result.optimalLap.potentialGainMs / 1000;

  const motivationalLine = buildMotivation(totalLossS, potentialGainS, profile.style);

  const secondsStr = totalLossS.toFixed(3);
  const headline = totalLossS > 0.05
    ? `You're losing ${secondsStr}s on this lap`
    : "You're nearly at reference pace — excellent!";

  const worstLabel = worstSeg?.segment.label ?? "the middle sector";
  const secondWorst = topIssues[1]?.segment.label;
  const subheadline = worstSeg
    ? `Most of it comes from ${worstLabel}${secondWorst ? ` and ${secondWorst}` : ""}`
    : "Your pace is consistent across all sectors";

  return {
    headline,
    subheadline,
    totalLossS,
    totalLossSFormatted: secondsStr,
    worstSegmentLabel:   worstLabel,
    worstSegmentLossS:   (worstSeg?.deltaMs ?? 0) / 1000,
    topThreeIssues,
    goodAreas,
    motivationalLine,
    potentialGainS,
    overallScore: result.overallScore,
    profile,
  };
}

function shortDescription(type: string): string {
  const map: Record<string, string> = {
    early_brake:    "Braking too early",
    late_brake:     "Braking too late",
    low_apex_speed: "Low apex speed",
    late_throttle:  "Late throttle application",
    early_throttle: "Throttle too early",
    speed_deficit:  "Speed deficit",
  };
  return map[type] ?? "Technique issue";
}

function buildMotivation(totalLossS: number, gainS: number, style: DrivingStyle): string {
  if (totalLossS < 0.3) return "You're very close to the reference. A focused session should close this gap.";
  if (gainS < 0.5)      return `${gainS.toFixed(2)}s of potential is right there. This is one focused session.`;
  if (style === "aggressive") return `${gainS.toFixed(2)}s is on the table. Smooth the exits and it's yours.`;
  if (style === "smooth")     return `${gainS.toFixed(2)}s potential. Push the braking points and take it.`;
  if (style === "inconsistent") return "Fix the consistency first — the pace is there once it's repeatable.";
  return `${gainS.toFixed(2)}s of improvement is realistic in your next two sessions.`;
}
