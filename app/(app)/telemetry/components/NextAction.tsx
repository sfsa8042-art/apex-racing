"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, Upload, Target, BarChart2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextAction } from "@/types/extended";

interface NextActionPanelProps {
  actions:   NextAction[];
  className?: string;
}

const TYPE_ICON: Record<NextAction["type"], typeof BookOpen> = {
  watch_lesson:    BookOpen,
  practice_drill:  Target,
  upload_lap:      Upload,
  set_goal:        Target,
  review_segment:  BarChart2,
};

const PRIORITY_STYLE = [
  "border-lime-400/30 bg-lime-400/6",     // priority 1
  "border-zinc-700   bg-zinc-800/60",     // priority 2
  "border-zinc-800   bg-zinc-900/80",     // priority 3
];

export function NextActionPanel({ actions, className }: NextActionPanelProps) {
  if (!actions.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
        What to do next
      </p>
      {actions.map((action, i) => {
        const Icon = TYPE_ICON[action.type];
        const style = PRIORITY_STYLE[Math.min(i, 2)];

        return (
          <div key={i} className={cn("rounded-xl border p-4 transition-all", style)}>
            <div className="flex items-start gap-3">
              {/* Priority + icon */}
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                i === 0 ? "bg-lime-400/15" : "bg-zinc-800"
              )}>
                <Icon size={15} className={i === 0 ? "text-lime-400" : "text-zinc-500"} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className={cn("text-sm font-medium leading-snug",
                    i === 0 ? "text-zinc-100" : "text-zinc-300")}>
                    {action.headlineEn}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {action.gainS && action.gainS > 0.05 && (
                      <span className="text-[11px] font-mono text-lime-400 bg-lime-400/10 px-1.5 py-0.5 rounded">
                        +{action.gainS.toFixed(2)}s
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                  {action.detailEn}
                </p>

                <div className="flex items-center gap-3">
                  <Link href={action.href}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                      i === 0
                        ? "bg-lime-400 hover:bg-lime-300 text-zinc-950"
                        : "bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
                    )}>
                    {action.cta}
                    <ArrowRight size={11} />
                  </Link>
                  <span className="flex items-center gap-1 text-[11px] text-zinc-600 font-mono">
                    <Clock size={10} />
                    {action.estimateMin} min
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
