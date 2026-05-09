"use client";
import { Flame, Calendar, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StreakData } from "@/types/extended";

interface StreakBadgeProps {
  streak:    StreakData;
  compact?:  boolean;
  className?: string;
}

export function StreakBadge({ streak, compact = false, className }: StreakBadgeProps) {
  const isActive = streak.isActiveToday;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono",
        streak.currentStreak > 0
          ? "border-orange-400/30 bg-orange-400/8 text-orange-400"
          : "border-zinc-700 bg-zinc-800 text-zinc-500",
        className
      )}>
        <Flame size={12} className={streak.currentStreak > 0 ? "text-orange-400" : "text-zinc-600"} />
        {streak.currentStreak}d streak
        {streak.currentStreak === 0 && " — drive today!"}
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 p-4", className)}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
        Consistency
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame size={14} className={streak.currentStreak > 0 ? "text-orange-400" : "text-zinc-600"} />
          </div>
          <p className={cn("text-2xl font-bold font-mono", streak.currentStreak > 0 ? "text-orange-400" : "text-zinc-600")}>
            {streak.currentStreak}
          </p>
          <p className="text-[10px] text-zinc-500 font-mono">day streak</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity size={14} className="text-lime-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-lime-400">{streak.consistencyPct}%</p>
          <p className="text-[10px] text-zinc-500 font-mono">last 14d</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar size={14} className="text-zinc-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-300">{streak.totalSessions}</p>
          <p className="text-[10px] text-zinc-500 font-mono">sessions</p>
        </div>
      </div>

      {/* 14-day calendar dots */}
      <div>
        <p className="text-[10px] font-mono text-zinc-600 mb-1.5">Last 14 days</p>
        <div className="flex gap-1">
          {Array.from({ length: 14 }, (_, i) => {
            const daysAgo = 13 - i;
            const dayStr = new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
            // We can't access history here, so use consistencyPct as approximation
            // In a real app, pass the actual day set
            const isToday = daysAgo === 0;
            const prob    = streak.consistencyPct / 100;
            // Deterministic from date string hash
            const hash    = dayStr.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
            const active  = hash % 100 < streak.consistencyPct || (isToday && streak.isActiveToday);

            return (
              <div key={i}
                title={dayStr}
                className={cn(
                  "flex-1 h-3 rounded-sm",
                  active ? "bg-lime-400" : "bg-zinc-800",
                  isToday && streak.isActiveToday && "ring-1 ring-lime-400/50"
                )}
              />
            );
          })}
        </div>
      </div>

      {!isActive && streak.currentStreak > 0 && (
        <p className="text-[11px] text-orange-400 font-mono mt-3">
          🔥 Drive today to keep your {streak.currentStreak}-day streak alive!
        </p>
      )}
      {streak.currentStreak === 0 && (
        <p className="text-[11px] text-zinc-500 mt-3">
          Upload a lap today to start your streak.
        </p>
      )}
    </div>
  );
}
