/**
 * lib/daily/goals.ts
 *
 * Generates personalised daily goals and challenges from real telemetry data.
 * Daily goals are generated fresh each day and stored in localStorage.
 * If the user's worst issue is braking, today's goal is about braking — not generic.
 */

import type { DailyGoal, DailyChallenge } from "@/types/extended";
import type { LapAnalysisResult } from "@/types/telemetry";
import { loadHistory } from "@/lib/progress/tracker";

const DAILY_KEY = "apex_daily";

interface DailyStore {
  goal:       DailyGoal | null;
  challenge:  DailyChallenge | null;
  date:       string;  // YYYY-MM-DD
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadDaily(): DailyStore {
  if (typeof window === "undefined") return { goal: null, challenge: null, date: "" };
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? JSON.parse(raw) : { goal: null, challenge: null, date: "" };
  } catch { return { goal: null, challenge: null, date: "" }; }
}

function saveDaily(store: DailyStore): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(store)); } catch {}
}

// ─── Goal generators ──────────────────────────────────────────────────────────

function makeTimeGoal(targetMs: number): DailyGoal {
  return {
    id:           `daily_${today()}`,
    date:         today(),
    type:         "time_improvement",
    titleEn:      `Gain ${(targetMs / 1000).toFixed(1)}s today`,
    descriptionEn: `Upload a lap that's ${(targetMs / 1000).toFixed(1)}s faster than your previous session.`,
    targetValue:  targetMs,
    unit:         "ms",
    completed:    false,
    completedAt:  null,
    xpReward:     150,
  };
}

function makeSegmentGoal(segment: string, issueType: string): DailyGoal {
  const descriptions: Record<string, string> = {
    early_brake:    `Focus on braking later in ${segment}. Use a fixed reference point.`,
    late_throttle:  `Open throttle earlier at ${segment}. Hit the gas at the apex, not after.`,
    low_apex_speed: `Carry more speed through ${segment}. Small: nail the release on entry.`,
    speed_deficit:  `Find more speed in ${segment} — check your line through the apex.`,
  };

  return {
    id:            `daily_${today()}`,
    date:          today(),
    type:          "segment_focus",
    titleEn:       `Master ${segment}`,
    descriptionEn: descriptions[issueType] ?? `Focus on improving your time in ${segment}.`,
    targetValue:   1,
    unit:          "segment",
    completed:     false,
    completedAt:   null,
    xpReward:      120,
    segment,
  };
}

function makeConsistencyGoal(): DailyGoal {
  return {
    id:           `daily_${today()}`,
    date:         today(),
    type:         "consistency",
    titleEn:      "3 clean laps in a row",
    descriptionEn: "Upload 3 laps and keep your best time within 0.5s across all three.",
    targetValue:  3,
    unit:         "laps",
    completed:    false,
    completedAt:  null,
    xpReward:     100,
  };
}

function makeUploadGoal(): DailyGoal {
  return {
    id:           `daily_${today()}`,
    date:         today(),
    type:         "upload",
    titleEn:      "Upload your first lap",
    descriptionEn: "Drive any lap and upload the telemetry to get your personalised analysis.",
    targetValue:  1,
    unit:         "lap",
    completed:    false,
    completedAt:  null,
    xpReward:     75,
  };
}

// ─── Challenge generators ─────────────────────────────────────────────────────

const CHALLENGES: DailyChallenge[] = [
  {
    id: "ch_brake_late",
    date: today(),
    titleEn: "Brake 5m later",
    taskEn: "Pick your hardest braking zone. Move the brake point 5m later than usual. Upload the lap.",
    completed: false, xpReward: 100, difficulty: "medium",
  },
  {
    id: "ch_smooth_throttle",
    date: today(),
    titleEn: "No throttle corrections",
    taskEn: "Drive 3 laps keeping your throttle applications smooth — no micro-corrections on exit.",
    completed: false, xpReward: 80, difficulty: "easy",
  },
  {
    id: "ch_10_laps",
    date: today(),
    titleEn: "10-lap endurance",
    taskEn: "Complete 10 consecutive laps. Focus on consistency — lap-to-lap variance below 0.5s.",
    completed: false, xpReward: 150, difficulty: "hard",
  },
  {
    id: "ch_study_sector",
    date: today(),
    titleEn: "Study your worst sector",
    taskEn: "Open the Segment Analysis and identify your single most costly corner. Set it as your focus.",
    completed: false, xpReward: 60, difficulty: "easy",
  },
  {
    id: "ch_new_track",
    date: today(),
    titleEn: "Try a different car",
    taskEn: "Upload a lap in a car you haven't used recently. Compare how the telemetry differs.",
    completed: false, xpReward: 90, difficulty: "easy",
  },
];

function pickChallenge(): DailyChallenge {
  // Deterministic from date so everyone gets the same challenge today
  const dayHash = today().split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const idx = dayHash % CHALLENGES.length;
  return { ...CHALLENGES[idx], id: `ch_${today()}`, date: today() };
}

// ─── Main API ─────────────────────────────────────────────────────────────────

export function getDailyLoop(): { goal: DailyGoal; challenge: DailyChallenge } {
  const store = loadDaily();

  // Reuse today's goals if they exist
  if (store.date === today() && store.goal && store.challenge) {
    return { goal: store.goal, challenge: store.challenge };
  }

  // Generate fresh daily content
  const history = loadHistory();
  let goal: DailyGoal;

  if (history.length === 0) {
    goal = makeUploadGoal();
  } else if (history.length === 1) {
    // First return visit — aim for a small improvement
    goal = makeTimeGoal(300);
  } else {
    // Pick goal based on worst recurring issue
    const lastEntry = history[0];
    if (lastEntry.topIssue && lastEntry.topIssue !== "general") {
      // Find which segment this issue occurred in (simplified: use "your key corner")
      goal = makeSegmentGoal("your key corner", lastEntry.topIssue);
    } else {
      // Alternate between time goal and consistency goal
      const dayHash = today().split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      goal = dayHash % 2 === 0 ? makeTimeGoal(200) : makeConsistencyGoal();
    }
  }

  const challenge = pickChallenge();
  const newStore: DailyStore = { goal, challenge, date: today() };
  saveDaily(newStore);

  return { goal, challenge };
}

/** Generate daily goal from a fresh lap analysis (replaces generic goal) */
export function updateDailyGoalFromAnalysis(result: LapAnalysisResult): DailyGoal | null {
  const topIssue = result.insights.find(
    (i) => i.severity === "critical" || i.severity === "warning"
  );
  if (!topIssue) return null;

  const segLabel = result.segmentAnalyses
    .filter((sa) => sa.deltaMs > 0)
    .sort((a, b) => b.deltaMs - a.deltaMs)[0]?.segment.label ?? "your key corner";

  const goal = makeSegmentGoal(segLabel, (topIssue as any).type ?? "general");

  const store = loadDaily();
  store.goal = goal;
  store.date = today();
  saveDaily(store);

  return goal;
}

export function completeDailyGoal(): void {
  const store = loadDaily();
  if (store.goal) {
    store.goal.completed   = true;
    store.goal.completedAt = new Date().toISOString();
    saveDaily(store);
  }
}

export function completeChallenge(): void {
  const store = loadDaily();
  if (store.challenge) {
    store.challenge.completed = true;
    saveDaily(store);
  }
}
