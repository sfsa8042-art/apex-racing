"use client";
import { Zap, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LevelProgress, SkillTag } from "@/types/extended";
import { LEVEL_COLORS } from "@/lib/ranking/system";

interface LevelBadgeProps {
  progress:  LevelProgress;
  compact?:  boolean;
  className?: string;
}

const SKILL_LEVEL_STYLE: Record<SkillTag["level"], string> = {
  strong: "bg-lime-400/15 text-lime-400 border-lime-400/30",
  ok:     "bg-yellow-400/10 text-yellow-400 border-yellow-400/25",
  weak:   "bg-red-400/10 text-red-400 border-red-400/25",
};

function XPBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function LevelBadge({ progress, compact = false, className }: LevelBadgeProps) {
  const color = LEVEL_COLORS[progress.level];

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono",
        "border-zinc-700 bg-zinc-800",
        className
      )}>
        <span style={{ color }} className="font-semibold">{progress.level}</span>
        <div className="w-12 h-1 bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${progress.progressPct}%`, background: color }} />
        </div>
        <span className="text-zinc-500">{progress.totalXP} XP</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 p-4", className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Driver Level</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color }}>{progress.level}</span>
            {progress.levelIndex < 5 && (
              <ChevronRight size={14} className="text-zinc-600" />
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-zinc-500 mb-0.5">Total XP</p>
          <p className="text-xl font-mono font-bold" style={{ color }}>
            {progress.totalXP.toLocaleString()}
          </p>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mb-2">
        <XPBar pct={progress.progressPct} color={color} />
      </div>
      <div className="flex justify-between text-[11px] font-mono text-zinc-500 mb-4">
        <span>{progress.xpForThisLevel.toLocaleString()} XP in level</span>
        {progress.levelIndex < 5 && (
          <span>{progress.xpToNextLevel.toLocaleString()} to {["Amateur","Intermediate","Advanced","Pro","Elite"][progress.levelIndex] ?? ""}</span>
        )}
        {progress.levelIndex === 5 && <span>Elite — maximum level</span>}
      </div>

      {/* Skill tags */}
      {progress.skillTags.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {progress.skillTags.map((tag) => (
              <div key={tag.skill}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-md border",
                  SKILL_LEVEL_STYLE[tag.level]
                )}>
                <div className={cn("w-1.5 h-1.5 rounded-full",
                  tag.level === "strong" ? "bg-lime-400" : tag.level === "ok" ? "bg-yellow-400" : "bg-red-400"
                )} />
                {tag.skill}
                <span className="opacity-60">{tag.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent XP events */}
      {progress.recentEvents.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">Recent XP</p>
          {progress.recentEvents.slice(0, 3).map((ev, i) => (
            <div key={i} className="flex items-center justify-between py-0.5">
              <p className="text-[11px] text-zinc-400">{ev.label}</p>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <Zap size={9} style={{ color }} />
                <span style={{ color }}>+{ev.gainXP}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
