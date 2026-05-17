"use client";
/**
 * CoachingPlanPanel — Track Titan-style "Today's Focus"
 * Top-3 priorities with 3-step action plan each.
 */

import { cn } from "@/lib/utils";
import type { CoachingPlan, CoachingPriority } from "@/types/telemetry";
import { Target, Flag, CheckCircle2, ChevronRight, TrendingDown } from "lucide-react";

const CAT_META = {
  brake:       { color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)", label: "Торможение" },
  throttle:    { color: "#a3e635", bg: "rgba(163,230,53,0.06)",  border: "rgba(163,230,53,0.2)",  label: "Газ"        },
  line:        { color: "#facc15", bg: "rgba(250,204,21,0.06)",  border: "rgba(250,204,21,0.2)",  label: "Линия"      },
  consistency: { color: "#60a5fa", bg: "rgba(96,165,250,0.06)",  border: "rgba(96,165,250,0.2)",  label: "Постоянство" },
} as const;

function PriorityCard({ priority }: { priority: CoachingPriority }) {
  const meta = CAT_META[priority.category];
  return (
    <div className="px-4 py-3.5 border-b border-zinc-800/40 last:border-0">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-mono font-black"
          style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
          {priority.rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-bold text-zinc-100 leading-tight">{priority.title}</p>
            <div className="shrink-0 text-right">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">потенциал</p>
              <p className="text-sm font-mono font-bold tabular-nums" style={{ color: meta.color }}>
                −{(priority.targetDeltaMs/1000).toFixed(3)}с
              </p>
            </div>
          </div>

          {/* Corners affected */}
          {priority.cornerLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-2.5">
              <span className="text-[9px] font-mono text-zinc-600 uppercase mr-1">в:</span>
              {priority.cornerLabels.map((label, i) => (
                <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Step-by-step plan */}
          <div className="space-y-1.5">
            {priority.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/40">
                <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[8px] font-mono text-zinc-500 font-bold">{i+1}</span>
                </div>
                <p className="text-[10.5px] text-zinc-300 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoachingPlanPanel({ plan }: { plan: CoachingPlan }) {
  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-800/60 bg-gradient-to-b from-lime-400/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-xl bg-lime-400/12 border border-lime-400/30 flex items-center justify-center">
            <Target size={13} className="text-lime-400"/>
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-100">План следующей сессии</p>
            <p className="text-[10px] text-zinc-500">Top-{plan.priorities.length} фокус на улучшение</p>
          </div>
        </div>

        {plan.estimatedGainMs > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lime-400/8 border border-lime-400/20">
            <TrendingDown size={11} className="text-lime-400"/>
            <p className="text-[11px] text-lime-300 flex-1">{plan.focusMessage}</p>
          </div>
        )}
      </div>

      {/* Priorities */}
      {plan.priorities.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center px-4 space-y-3">
          <CheckCircle2 size={28} className="text-lime-400"/>
          <div>
            <p className="text-sm font-semibold text-zinc-200">Стабильный круг</p>
            <p className="text-xs text-zinc-500 mt-1">Продолжай работать над постоянством</p>
          </div>
        </div>
      ) : (
        plan.priorities.map((p, i) => <PriorityCard key={i} priority={p}/>)
      )}
    </div>
  );
}
