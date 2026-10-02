"use client";
import { useCopy, useLang, locales } from "../../shared/i18n/react";

import { useState } from "react";
import { Target, Zap, CheckCircle, ChevronRight, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyGoal, DailyChallenge } from "@/types/extended";
import { completeChallenge } from "@/lib/daily/goals";

interface DailyGoalCardProps {
  goal:       DailyGoal;
  challenge:  DailyChallenge;
  onRefresh?: () => void;
  className?: string;
}

const DIFFICULTY_STYLE = {
  easy:   "text-lime-400 bg-lime-400/10 border-lime-400/25",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/25",
  hard:   "text-red-400 bg-red-400/10 border-red-400/25",
};

export function DailyGoalCard({ goal, challenge, onRefresh, className }: DailyGoalCardProps) {
  const copy = useCopy();
  const { lang: displayLang } = useLang();
  const [challengeDone, setChallengeDone] = useState(challenge.completed);

  const handleChallengeComplete = () => {
    completeChallenge();
    setChallengeDone(true);
    onRefresh?.();
  };

  return (
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Flame size={14} className="text-orange-400" />
        <p className="text-xs font-medium text-zinc-300">{copy("ui.563")}</p>
        <span className="text-[10px] font-mono text-zinc-600 ml-auto">
          {copy(new Date().toLocaleDateString(locales[displayLang], { weekday: "short", month: "short", day: "numeric" }))}
        </span>
      </div>

      {/* Daily goal */}
      <div className={cn(
        "p-4 border-b border-zinc-800",
        goal.completed && "opacity-70"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            goal.completed ? "bg-lime-400/15" : "bg-zinc-800"
          )}>
            {goal.completed
              ? <CheckCircle size={15} className="text-lime-400" />
              : <Target size={15} className="text-zinc-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{copy("ui.564")}</p>
              <div className="flex items-center gap-0.5 text-[10px] font-mono text-yellow-400">
                <Zap size={9} />
                +{copy(goal.xpReward)} {copy(" XP")}</div>
            </div>
            <p className={cn(
              "text-sm font-medium mb-1",
              goal.completed ? "text-lime-400 line-through" : "text-zinc-200"
            )}>
              {copy(goal.titleEn)}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">{copy(goal.descriptionEn)}</p>
          </div>
        </div>

        {!goal.completed && (
          <a href="/telemetry"
            className="flex items-center gap-1.5 mt-3 text-xs text-lime-400 hover:text-lime-300 font-mono transition-colors">
            {copy("Start now ")}<ChevronRight size={11} />
          </a>
        )}
      </div>

      {/* Daily challenge */}
      <div className={cn("p-4", challengeDone && "opacity-70")}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono",
            challengeDone ? "bg-lime-400/15 text-lime-400" : "bg-zinc-800 text-zinc-500"
          )}>
            {copy(challengeDone ? "✓" : "!")}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{copy("ui.566")}</p>
              <span className={cn(
                "text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border",
                DIFFICULTY_STYLE[challenge.difficulty]
              )}>
                {copy(challenge.difficulty)}
              </span>
              <div className="flex items-center gap-0.5 text-[10px] font-mono text-yellow-400 ml-auto">
                <Zap size={9} />
                +{copy(challenge.xpReward)} {copy(" XP")}</div>
            </div>
            <p className={cn(
              "text-sm font-medium mb-1",
              challengeDone ? "text-lime-400 line-through" : "text-zinc-200"
            )}>
              {copy(challenge.titleEn)}
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">{copy(challenge.taskEn)}</p>
          </div>
        </div>

        {!challengeDone && (
          <button
            onClick={handleChallengeComplete}
            className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors"
          >
            <CheckCircle size={11} />
            {copy("ui.567")}</button>
        )}
      </div>
    </div>
  );
}
