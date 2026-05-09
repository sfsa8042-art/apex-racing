/**
 * lib/progress/streak.ts
 * Calculates driving streaks and consistency from lap history.
 */

import type { StreakData } from "@/types/extended";
import { loadHistory } from "@/lib/progress/tracker";

export function computeStreak(): StreakData {
  const history = loadHistory();

  if (history.length === 0) {
    return {
      currentStreak:  0,
      longestStreak:  0,
      totalSessions:  0,
      lastActivity:   null,
      consistencyPct: 0,
      isActiveToday:  false,
    };
  }

  // Get unique days (YYYY-MM-DD)
  const daySet = new Set(
    history.map((e) => e.uploadedAt.slice(0, 10))
);
  const days = Array.from(daySet).sort().reverse() as string[];  // newest first

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const isActiveToday = days[0] === todayStr;

  // Current streak: count consecutive days from today/yesterday
  let currentStreak = 0;
  let checkDate = isActiveToday ? new Date() : new Date(Date.now() - 86_400_000);

  for (const day of days) {
    const checkStr = checkDate.toISOString().slice(0, 10);
    if (day === checkStr) {
      currentStreak++;
      checkDate = new Date(checkDate.getTime() - 86_400_000);
    } else {
      break;
    }
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak    = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  // Consistency: % of last 14 calendar days with at least one session
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - i * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const activeDays   = last14Days.filter((d) => days.includes(d)).length;
  const consistencyPct = Math.round((activeDays / 14) * 100);

  return {
    currentStreak,
    longestStreak,
    totalSessions: history.length,
    lastActivity:  days[0] ?? null,
    consistencyPct,
    isActiveToday,
  };
}
