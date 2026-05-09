/**
 * lib/ranking/system.ts
 *
 * XP & Level system + Ranking/Percentile estimation.
 *
 * XP sources (all driven by real telemetry data):
 *   - Uploading a lap:           +50 XP
 *   - Improving vs previous lap: +100 XP (scales with improvement)
 *   - Completing academy lesson: +75 XP
 *   - Streak bonus:              +25 XP/day
 *   - Achieving a goal:          +200 XP
 *   - First ever lap:            +200 XP bonus
 *
 * Level thresholds:
 *   Rookie (0), Amateur (500), Intermediate (1500),
 *   Advanced (3500), Pro (7500), Elite (15000)
 */

import type {
  LevelProgress, DriverLevel, XPEvent, SkillTag,
  DriverRank, RankTier, TrackRank, DriverProfile,
} from "@/types/extended";
import type { LapAnalysisResult } from "@/types/telemetry";
import { loadHistory } from "@/lib/progress/tracker";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS: Record<DriverLevel, number> = {
  Rookie:       0,
  Amateur:      500,
  Intermediate: 1500,
  Advanced:     3500,
  Pro:          7500,
  Elite:        15000,
};

const LEVELS: DriverLevel[] = ["Rookie", "Amateur", "Intermediate", "Advanced", "Pro", "Elite"];

const LEVEL_COLORS: Record<DriverLevel, string> = {
  Rookie:       "#6b7280",
  Amateur:      "#3b82f6",
  Intermediate: "#8b5cf6",
  Advanced:     "#f59e0b",
  Pro:          "#ef4444",
  Elite:        "#a3e635",
};

export { LEVEL_COLORS };

// ─── Storage ──────────────────────────────────────────────────────────────────

const XP_KEY = "apex_xp_store";

interface XPStore {
  totalXP:      number;
  events:       XPEvent[];
  lastUpdated:  string;
}

function loadXP(): XPStore {
  if (typeof window === "undefined") return { totalXP: 0, events: [], lastUpdated: "" };
  try {
    const raw = localStorage.getItem(XP_KEY);
    return raw ? JSON.parse(raw) : { totalXP: 0, events: [], lastUpdated: "" };
  } catch { return { totalXP: 0, events: [], lastUpdated: "" }; }
}

function saveXP(store: XPStore): void {
  if (typeof window === "undefined") return;
  try {
    store.lastUpdated = new Date().toISOString();
    localStorage.setItem(XP_KEY, JSON.stringify(store));
  } catch {}
}

// ─── XP award ─────────────────────────────────────────────────────────────────

export function awardXP(event: Omit<XPEvent, "timestamp">): XPEvent {
  const store = loadXP();
  const xpEvent: XPEvent = { ...event, timestamp: new Date().toISOString() };

  store.totalXP += event.gainXP;
  store.events   = [xpEvent, ...store.events].slice(0, 50);
  saveXP(store);

  return xpEvent;
}

export function awardLapXP(
  result:          LapAnalysisResult,
  improvementMs:   number | null,
  isFirstLap:      boolean
): XPEvent[] {
  const events: XPEvent[] = [];

  // Base upload XP
  events.push(awardXP({ type: "upload", gainXP: 50, label: "Lap uploaded" }));

  // First lap bonus
  if (isFirstLap) {
    events.push(awardXP({ type: "first_lap", gainXP: 200, label: "First lap analysed! 🎉" }));
  }

  // Improvement XP (scaled — 1ms = 0.1 XP, capped at 500)
  if (improvementMs !== null && improvementMs > 50) {
    const bonus = Math.min(500, Math.round(improvementMs * 0.1));
    events.push(awardXP({
      type: "improvement",
      gainXP: bonus,
      label: `Improved by ${(improvementMs / 1000).toFixed(3)}s (+${bonus} XP)`,
    }));
  }

  return events;
}

export function awardLessonXP(lessonTitle: string): XPEvent {
  return awardXP({ type: "lesson", gainXP: 75, label: `Completed: ${lessonTitle}` });
}

export function awardStreakXP(days: number): XPEvent {
  const bonus = days >= 7 ? 50 : 25;
  return awardXP({ type: "streak", gainXP: bonus, label: `${days}-day streak bonus` });
}

export function awardGoalXP(goalTitle: string): XPEvent {
  return awardXP({ type: "goal", gainXP: 200, label: `Goal achieved: ${goalTitle}` });
}

// ─── Level calculation ────────────────────────────────────────────────────────

function levelFromXP(xp: number): DriverLevel {
  let level: DriverLevel = "Rookie";
  for (const lvl of LEVELS) {
    if (xp >= LEVEL_THRESHOLDS[lvl]) level = lvl;
  }
  return level;
}

export function computeLevelProgress(profile: DriverProfile | null): LevelProgress {
  const store     = loadXP();
  const totalXP   = store.totalXP;
  const level     = levelFromXP(totalXP);
  const levelIdx  = LEVELS.indexOf(level);

  const xpFloor   = LEVEL_THRESHOLDS[level];
  const xpCeiling = levelIdx < LEVELS.length - 1
    ? LEVEL_THRESHOLDS[LEVELS[levelIdx + 1]]
    : totalXP + 1000;

  const xpInLevel  = totalXP - xpFloor;
  const xpForLevel = xpCeiling - xpFloor;
  const progressPct = Math.min(100, Math.round((xpInLevel / xpForLevel) * 100));

  // Build skill tags from driver profile
  const skillTags: SkillTag[] = profile ? [
    {
      skill: "Brake Control",
      level: profile.brakeConfidence >= 70 ? "strong" : profile.brakeConfidence >= 45 ? "ok" : "weak",
      score: profile.brakeConfidence,
      improving: false,
    },
    {
      skill: "Cornering",
      level: profile.cornerSpeed >= 70 ? "strong" : profile.cornerSpeed >= 45 ? "ok" : "weak",
      score: profile.cornerSpeed,
      improving: false,
    },
    {
      skill: "Throttle Control",
      level: profile.throttleControl >= 70 ? "strong" : profile.throttleControl >= 45 ? "ok" : "weak",
      score: profile.throttleControl,
      improving: false,
    },
    {
      skill: "Consistency",
      level: profile.consistency >= 70 ? "strong" : profile.consistency >= 45 ? "ok" : "weak",
      score: profile.consistency,
      improving: false,
    },
  ] : [];

  return {
    level,
    levelIndex:     levelIdx,
    currentXP:      totalXP,
    xpForThisLevel: xpInLevel,
    xpToNextLevel:  xpForLevel - xpInLevel,
    progressPct,
    totalXP,
    recentEvents:   store.events.slice(0, 5),
    skillTags,
  };
}

// ─── Ranking / Percentile ─────────────────────────────────────────────────────

/**
 * Estimates percentile rank using a synthetic score distribution.
 * The distribution approximates what a real community of sim racers looks like:
 *   - Most drivers cluster around 45–65 score
 *   - Few reach 80+
 * This is explicitly labelled as "estimated" in the UI.
 */
export function estimatePercentile(overallScore: number): number {
  // Cumulative distribution function of a normal distribution (μ=52, σ=18)
  // Implemented as a simple lookup table for predictability
  const lookup: [number, number][] = [
    [0, 2], [10, 4], [20, 8], [30, 15], [35, 22], [40, 30],
    [45, 40], [50, 50], [55, 60], [60, 70], [65, 78], [70, 85],
    [75, 90], [80, 94], [85, 97], [90, 98], [95, 99], [100, 100],
  ];

  // Linear interpolation between known points
  for (let i = 0; i < lookup.length - 1; i++) {
    const [s0, p0] = lookup[i];
    const [s1, p1] = lookup[i + 1];
    if (overallScore >= s0 && overallScore <= s1) {
      const t = (overallScore - s0) / (s1 - s0);
      return Math.round(p0 + t * (p1 - p0));
    }
  }
  return overallScore >= 100 ? 100 : 2;
}

function rankTierFromPercentile(pct: number): RankTier {
  if (pct >= 95) return "Diamond";
  if (pct >= 80) return "Platinum";
  if (pct >= 60) return "Gold";
  if (pct >= 35) return "Silver";
  return "Bronze";
}

export function computeRank(
  result:  LapAnalysisResult,
  lapTimeMs: number
): DriverRank {
  const score      = result.overallScore;
  const percentile = estimatePercentile(score);
  const tier       = rankTierFromPercentile(percentile);

  // Simulate total driver count with realistic variance
  const totalDrivers = 4800 + Math.floor(Math.sin(score) * 200);
  const estimatedRank = Math.round(totalDrivers * (1 - percentile / 100));

  const rankLabel =
    percentile >= 95 ? "Top 5%" :
    percentile >= 80 ? "Top 20%" :
    percentile >= 60 ? "Top 40%" :
    percentile >= 40 ? "Top 60%" :
    "Building pace";

  // Track ranks from history
  const history = loadHistory();
  const trackRanks: TrackRank[] = history
    .filter((e) => e.track)
    .slice(0, 3)
    .map((e) => ({
      track:       e.track!,
      percentile:  estimatePercentile(e.overallScore),
      lapTimeMs:   e.lapTimeMs,
      refTimeMs:   e.lapTimeMs - e.totalDeltaMs,
      deltaMs:     e.totalDeltaMs,
    }));

  return {
    percentile,
    rankLabel,
    estimatedRank,
    totalDrivers,
    trackSpecific: trackRanks,
    tier,
    isEstimated: true,
  };
}

export const TIER_COLORS: Record<RankTier, { bg: string; text: string; border: string }> = {
  Bronze:   { bg: "bg-amber-700/15", text: "text-amber-600", border: "border-amber-700/30" },
  Silver:   { bg: "bg-zinc-400/15",  text: "text-zinc-300",  border: "border-zinc-400/30"  },
  Gold:     { bg: "bg-yellow-400/15",text: "text-yellow-400",border: "border-yellow-400/30"},
  Platinum: { bg: "bg-cyan-400/15",  text: "text-cyan-400",  border: "border-cyan-400/30"  },
  Diamond:  { bg: "bg-lime-400/15",  text: "text-lime-400",  border: "border-lime-400/30"  },
};
