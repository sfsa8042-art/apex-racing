"use client";

import { useCopy } from "../../../shared/i18n/react";
import { cn } from "@/lib/utils";
import {
  Zap, Lightbulb, AlertTriangle, CheckCircle2, BarChart2,
  Target, Brain, Trophy, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Stage = "hook"|"concept"|"mistake"|"fix"|"proof"|"drill"|"quiz"|"done";

const STAGES: { id: Stage; label: string; Icon: LucideIcon }[] = [
  { id: "hook",    label: "Зацепка",   Icon: Zap },
  { id: "concept", label: "Концепт",   Icon: Lightbulb },
  { id: "mistake", label: "Ошибка",    Icon: AlertTriangle },
  { id: "fix",     label: "Решение",   Icon: CheckCircle2 },
  { id: "proof",   label: "Данные",    Icon: BarChart2 },
  { id: "drill",   label: "Практика",  Icon: Target },
  { id: "quiz",    label: "Проверка",  Icon: Brain },
  { id: "done",    label: "Готово",    Icon: Trophy },
];

interface StageProgressProps {
  current: Stage;
  completed: Stage[];
  onStageClick?: (s: Stage) => void;
  className?: string;
}

export function StageProgress({ current, completed, onStageClick, className }: StageProgressProps) {
  const copy = useCopy();
  const currentIdx = STAGES.findIndex(s => s.id === current);
  return (
    <div className={cn("flex items-center gap-0.5 overflow-x-auto", className)}>
      {STAGES.map((stage, i) => {
        const isDone = completed.includes(stage.id);
        const isCurrent = stage.id === current;
        const isUnlocked = i <= currentIdx;
        const Icon = stage.Icon;
        return (
          <div key={stage.id} className="flex items-center">
            <button
              onClick={() => isUnlocked && onStageClick?.(stage.id)}
              disabled={!isUnlocked}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[9px] font-mono transition-all",
                isCurrent && "bg-lime-400/15 border border-lime-400/30 text-lime-400",
                isDone && !isCurrent && "text-zinc-400",
                !isDone && !isCurrent && isUnlocked && "text-zinc-500 hover:text-zinc-300",
                !isUnlocked && "text-zinc-700 cursor-not-allowed opacity-40",
              )}
            >
              <span className="leading-none">
                {isDone ? <Check size={14} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
              </span>
              <span className="hidden sm:block whitespace-nowrap">{copy(stage.label)}</span>
            </button>
            {i < STAGES.length - 1 && (
              <div className={cn("w-3 h-px mx-0.5 shrink-0", i < currentIdx ? "bg-lime-400/40" : "bg-zinc-800")}/>
            )}
          </div>
        );
      })}
    </div>
  );
}
