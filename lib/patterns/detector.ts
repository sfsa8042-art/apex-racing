/**
 * lib/patterns/detector.ts
 *
 * Cross-session pattern detection.
 * Analyses the lap history to find recurring issues, improving areas,
 * and persistent problems. Generates personalised coach notes.
 */

import type { LapHistoryEntry } from "@/types/extended";
import type { LapAnalysisResult, AnalysisInsight } from "@/types/telemetry";
import type { RecurringPattern, PatternReport, PatternCategory } from "@/types/extended";
import { loadHistory } from "@/lib/progress/tracker";

const PATTERN_KEY = "apex_patterns";
const HISTORY_WINDOW = 10;  // Look at last N sessions for pattern detection

// ─── Storage ──────────────────────────────────────────────────────────────────

interface StoredIssue {
  sessionId:    string;
  uploadedAt:   string;
  issueType:    string;
  category:     PatternCategory;
  timeCostMs:   number;
  segmentLabel: string;
}

interface IssueStore {
  issues: StoredIssue[];
}

function loadIssueStore(): IssueStore {
  if (typeof window === "undefined") return { issues: [] };
  try {
    const raw = localStorage.getItem(PATTERN_KEY);
    return raw ? JSON.parse(raw) : { issues: [] };
  } catch { return { issues: [] }; }
}

function saveIssueStore(store: IssueStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PATTERN_KEY, JSON.stringify(store));
  } catch {}
}

// ─── Persist current lap's issues ────────────────────────────────────────────

export function persistIssues(sessionId: string, result: LapAnalysisResult): void {
  const store = loadIssueStore();
  const now   = new Date().toISOString();

  const newIssues: StoredIssue[] = result.insights
    .filter((i) => i.severity === "critical" || i.severity === "warning")
    .map((ins) => ({
      sessionId,
      uploadedAt:   now,
      issueType:    (ins as any).type ?? ins.category,
      category:     ins.category as PatternCategory,
      timeCostMs:   ins.timeCostMs,
      segmentLabel: ins.titleRu?.split(":")[0] ?? ins.category,
    }));

  // Keep last 200 issues (20 sessions × 10 issues each)
  store.issues = [...newIssues, ...store.issues].slice(0, 200);
  saveIssueStore(store);
}

// ─── Pattern analysis ─────────────────────────────────────────────────────────

/** Groups issues by type and counts occurrences across unique sessions */
function groupByType(issues: StoredIssue[]): Map<string, StoredIssue[]> {
  const map = new Map<string, StoredIssue[]>();
  for (const issue of issues) {
    const key = issue.issueType;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(issue);
  }
  return map;
}

/** Determines if a pattern is improving over time (cost trending down) */
function isTrendingDown(issues: StoredIssue[]): boolean {
  if (issues.length < 3) return false;
  const sorted = [...issues].sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  );
  const firstHalf  = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

  const avgFirst  = firstHalf.reduce((s, i) => s + i.timeCostMs, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, i) => s + i.timeCostMs, 0) / secondHalf.length;

  return avgSecond < avgFirst * 0.85;  // 15%+ improvement
}

const TYPE_DESCRIPTIONS: Record<string, { en: string; note: (segs: string[]) => string }> = {
  early_brake: {
    en: "Braking too early",
    note: (segs) => segs.length > 1
      ? `This is a recurring pattern across ${segs.join(", ")}. Pick a single brake marker in each corner and commit to it.`
      : `You consistently brake early at ${segs[0]}. Move your brake point 5–8m later over the next 3 sessions.`,
  },
  late_throttle: {
    en: "Late throttle application",
    note: (segs) => `Delayed throttle at ${segs.slice(0, 2).join(" and ")} — this compounds on straights. The apex speed is good; trust the exit earlier.`,
  },
  low_apex_speed: {
    en: "Low apex speed",
    note: (segs) => `Corner entry speed at ${segs[0]} has been low across multiple sessions. Check if your brake release is too abrupt.`,
  },
  speed_deficit: {
    en: "Speed deficit in corners",
    note: () => "Consistent corner speed deficit suggests a setup issue or early apex pattern. Review your line geometry.",
  },
  consistent: {
    en: "Good consistency",
    note: () => "Your consistency is a real strength — keep building on it.",
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function analysePatterns(): PatternReport {
  const store   = loadIssueStore();
  const history = loadHistory();

  const recentIssues = store.issues.slice(0, HISTORY_WINDOW * 12);
  const grouped = groupByType(recentIssues);

  const patterns: RecurringPattern[] = [];

  for (const [issueType, issues] of Array.from(grouped.entries())) {
    // Only flag as a pattern if it appeared in 3+ unique sessions
    const uniqueSessions = new Set(issues.map((i) => i.sessionId)).size;
    if (uniqueSessions < 3) continue;

    const category  = issues[0].category;
    const avgCostMs = Math.round(issues.reduce((s: number, i: StoredIssue) => s + i.timeCostMs, 0) / issues.length);
      const segSet    = new Set(issues.map((i: StoredIssue) => i.segmentLabel));
      const segments  = Array.from(segSet).slice(0, 4);
    const improving = isTrendingDown(issues);

    const sorted = [...issues].sort(
      (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );

    const meta = TYPE_DESCRIPTIONS[issueType];

    patterns.push({
      id:          `pattern_${issueType}`,
      category,
      issueType,
      occurrences: uniqueSessions,
      avgCostMs,
      firstSeen:   sorted[0].uploadedAt,
      lastSeen:    sorted[sorted.length - 1].uploadedAt,
      improving,
      segments,
      descriptionEn: meta?.en ?? issueType.replace(/_/g, " "),
      coachNote:     meta?.note(segments) ?? `Seen in ${uniqueSessions} sessions across ${segments.join(", ")}.`,
    });
  }

  // Sort by cost descending
  patterns.sort((a, b) => b.avgCostMs - a.avgCostMs);

  const improvingAreas   = patterns.filter((p) => p.improving).map((p) => p.descriptionEn);
  const persistentIssues = patterns.filter((p) => !p.improving && p.occurrences >= 4).map((p) => p.descriptionEn);

  return {
    patterns,
    strongestPattern: patterns[0] ?? null,
    improvingAreas,
    persistentIssues,
    sessionCount: history.length,
  };
}
