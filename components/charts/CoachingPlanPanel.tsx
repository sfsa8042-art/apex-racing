"use client";
import { useCopy } from "../../shared/i18n/react";

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
  const copy = useCopy();
  const meta = CAT_META[priority.category];
  return (
    <div className="px-4 py-3.5 border-b border-zinc-800/40 last:border-0">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-mono font-black"
          style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
          {copy(priority.rank)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-bold text-zinc-100 leading-tight">{copy(priority.title)}</p>
            <div className="shrink-0 text-right">
              <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">{copy("ui.439")}</p>
              <p className="text-sm font-mono font-bold tabular-nums" style={{ color: meta.color }}>
                −{copy((priority.targetDeltaMs/1000).toFixed(3))}{copy("ui.106")}</p>
            </div>
          </div>

          {/* Corners affected */}
          {priority.cornerLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mb-2.5">
              <span className="text-xs font-mono text-zinc-400 uppercase mr-1">{copy("ui.440")}</span>
              {priority.cornerLabels.map((label, i) => (
                <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                  {copy(label)}
                </span>
              ))}
            </div>
          )}

          {/* Step-by-step plan */}
          <details open={priority.rank === 1}>
            <summary className="cursor-pointer py-2 text-xs text-zinc-300">{copy("Action plan")}</summary>
          <div className="space-y-1.5">
            {priority.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/40">
                <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-mono text-zinc-400 font-bold">{copy(i+1)}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{copy(step)}</p>
              </div>
            ))}
          </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export function CoachingPlanPanel({ plan }: { plan: CoachingPlan }) {
  const copy = useCopy();
  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-zinc-800/60 bg-gradient-to-b from-lime-400/5 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-xl bg-lime-400/12 border border-lime-400/30 flex items-center justify-center">
            <Target size={13} className="text-lime-400"/>
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-100">{copy("ui.441")}</p>
            <p className="text-xs text-zinc-400">{copy("ui.442")}{copy(plan.priorities.length)} {copy(" фокус на улучшение")}</p>
          </div>
        </div>

        {plan.estimatedGainMs > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-lime-400/8 border border-lime-400/20">
            <TrendingDown size={11} className="text-lime-400"/>
            <p className="text-xs text-lime-300 flex-1">{copy(plan.focusMessage)}</p>
          </div>
        )}
      </div>

      {/* Priorities */}
      {plan.priorities.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center px-4 space-y-3">
          <CheckCircle2 size={28} className="text-lime-400"/>
          <div>
            <p className="text-sm font-semibold text-zinc-200">{copy("ui.444")}</p>
            <p className="text-xs text-zinc-400 mt-1">{copy("ui.445")}</p>
          </div>
        </div>
      ) : (
        plan.priorities.map((p, i) => <PriorityCard key={i} priority={p}/>)
      )}
    </div>
  );
}
