/**
 * lib/goals/store.ts
 *
 * Goals system — users set targets and the system tracks progress
 * against real telemetry data uploaded each session.
 */

import type { Goal, GoalStore, GoalType } from "@/types/extended";
import type { LapAnalysisResult } from "@/types/telemetry";

const GOALS_KEY = "apex_goals";

// ─── Storage ──────────────────────────────────────────────────────────────────

export function loadGoals(): GoalStore {
  if (typeof window === "undefined") return { goals: [], updatedAt: new Date().toISOString() };
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : { goals: [], updatedAt: new Date().toISOString() };
  } catch {
    return { goals: [], updatedAt: new Date().toISOString() };
  }
}

function saveGoals(store: GoalStore): void {
  if (typeof window === "undefined") return;
  try {
    store.updatedAt = new Date().toISOString();
    localStorage.setItem(GOALS_KEY, JSON.stringify(store));
  } catch {}
}

// ─── Goal templates ───────────────────────────────────────────────────────────

export interface GoalTemplate {
  type:        GoalType;
  titleEn:     string;
  descriptionEn: string;
  defaultTarget: number;
  unit:        string;
  icon:        string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    type: "lap_time",
    titleEn: "Improve lap time by 0.5s",
    descriptionEn: "Close the gap to your reference lap by half a second",
    defaultTarget: 500,
    unit: "ms",
    icon: "⏱",
  },
  {
    type: "lap_time",
    titleEn: "Break personal best by 1 second",
    descriptionEn: "Set a new personal best — 1 second faster than current",
    defaultTarget: 1000,
    unit: "ms",
    icon: "🏆",
  },
  {
    type: "segment_skill",
    titleEn: "Master braking consistency",
    descriptionEn: "Achieve brake point variance under 3m for 5 consecutive sessions",
    defaultTarget: 75,
    unit: "score",
    icon: "🎯",
  },
  {
    type: "consistency",
    titleEn: "Upload 5 sessions this week",
    descriptionEn: "Build the habit — 5 sessions this week to track real progress",
    defaultTarget: 5,
    unit: "sessions",
    icon: "🔥",
  },
  {
    type: "sector_delta",
    titleEn: "Cut sector 2 loss in half",
    descriptionEn: "Sector 2 is your biggest loss — halve it with focused practice",
    defaultTarget: 50,
    unit: "% reduction",
    icon: "📉",
  },
];

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function createGoal(
  template: GoalTemplate,
  currentLapTimeMs: number | null,
  customTarget?: number
): Goal {
  const id = `goal_${Date.now()}`;
  const target = customTarget ?? template.defaultTarget;

  return {
    id,
    type:           template.type,
    titleEn:        template.titleEn,
    descriptionEn:  template.descriptionEn,
    targetValue:    target,
    currentValue:   null,
    startValue:     currentLapTimeMs,
    status:         "active",
    createdAt:      new Date().toISOString(),
    achievedAt:     null,
    track:          null,
    deadline:       null,
    progress:       0,
  };
}

export function addGoal(goal: Goal): void {
  const store = loadGoals();
  store.goals = [goal, ...store.goals].slice(0, 10);  // max 10 active goals
  saveGoals(store);
}

export function deleteGoal(id: string): void {
  const store = loadGoals();
  store.goals = store.goals.filter((g) => g.id !== id);
  saveGoals(store);
}

export function abandonGoal(id: string): void {
  const store = loadGoals();
  const goal = store.goals.find((g) => g.id === id);
  if (goal) goal.status = "abandoned";
  saveGoals(store);
}

// ─── Progress update from telemetry ──────────────────────────────────────────

export function updateGoalsFromAnalysis(
  result: LapAnalysisResult,
  lapTimeMs: number
): Goal[] {
  const store  = loadGoals();
  const active = store.goals.filter((g) => g.status === "active");
  const achieved: Goal[] = [];

  for (const goal of active) {
    let progress = 0;
    let current  = goal.currentValue;

    switch (goal.type) {
      case "lap_time": {
        if (goal.startValue) {
          const improvement = goal.startValue - lapTimeMs;
          progress = Math.min(100, Math.round((improvement / goal.targetValue) * 100));
          current  = improvement;
        }
        break;
      }

      case "segment_skill": {
        // Map to driver consistency score (0–100)
        const delta = Math.abs(result.totalTimeDeltaMs);
        current  = Math.max(0, 100 - Math.round(delta / 20));
        progress = Math.min(100, Math.round((current / goal.targetValue) * 100));
        break;
      }

      case "sector_delta": {
        // Progress toward reducing sector loss
        const totalLoss = Math.max(0, result.totalTimeDeltaMs);
        const startLoss = (goal.startValue ?? 2000);
        const reduction = startLoss > 0 ? ((startLoss - totalLoss) / startLoss) * 100 : 0;
        progress = Math.min(100, Math.round(reduction));
        current  = Math.round(reduction);
        break;
      }

      default:
        break;
    }

    goal.currentValue = current;
    goal.progress     = Math.max(0, progress);

    if (progress >= 100 && goal.status === "active") {
      goal.status     = "achieved";
      goal.achievedAt = new Date().toISOString();
      achieved.push(goal);
    }
  }

  saveGoals(store);
  return achieved;
}

// ─── Next action from goals ───────────────────────────────────────────────────

export function getActiveGoals(): Goal[] {
  return loadGoals().goals.filter((g) => g.status === "active");
}

export function getMostUrgentGoal(): Goal | null {
  const active = getActiveGoals();
  if (!active.length) return null;
  // Closest to 100% progress
  return active.sort((a, b) => b.progress - a.progress)[0];
}
