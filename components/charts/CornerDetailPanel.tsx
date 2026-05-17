"use client";
/**
 * CornerDetailPanel — Delta-style 4-phase corner breakdown
 * Braking → Entry → Apex → Exit, with delta + advice for each.
 */

import { cn } from "@/lib/utils";
import type { CornerDetail, PhaseAnalysis } from "@/types/telemetry";
import { ChevronRight, Activity, Target, Flag, Zap } from "lucide-react";

const PHASE_META = {
  braking: { label: "Торможение", icon: Activity, color: "#f87171" },
  entry:   { label: "Вход",       icon: Target,   color: "#fb923c" },
  apex:    { label: "Апекс",      icon: Flag,     color: "#facc15" },
  exit:    { label: "Выход",      icon: Zap,      color: "#a3e635" },
} as const;

function PhaseRow({ phase, data }: { phase: keyof typeof PHASE_META; data: PhaseAnalysis }) {
  const meta = PHASE_META[phase];
  const Icon = meta.icon;
  const isLoss = data.status === "loss";
  const isGain = data.status === "gain";
  const dotMs = Math.abs(data.deltaMs);
  const barWidth = Math.min(100, dotMs / 5);

  return (
    <div className="px-4 py-3 border-b border-zinc-800/40 last:border-0">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}40` }}>
          <Icon size={12} style={{ color: meta.color }}/>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: meta.color }}>{meta.label}</span>
        <span className={cn("ml-auto text-xs font-mono font-bold tabular-nums",
          isLoss ? "text-red-400" : isGain ? "text-lime-400" : "text-zinc-500")}>
          {data.deltaMs > 0 ? "−" : data.deltaMs < 0 ? "+" : ""}{(Math.abs(data.deltaMs)/1000).toFixed(3)}с
        </span>
      </div>

      {/* Delta bar */}
      {dotMs > 5 && (
        <div className="h-0.5 rounded-full bg-zinc-800 mb-2 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${barWidth}%`,
              background: isLoss ? "#f87171" : "#a3e635",
              opacity: 0.7,
            }}/>
        </div>
      )}

      {/* User vs Ref values */}
      <div className="grid grid-cols-2 gap-2 mb-2 text-[10px]">
        <div>
          <span className="text-zinc-600 font-mono">ВЫ:</span>
          <p className="text-zinc-300 mt-0.5">{data.userValueRu}</p>
        </div>
        <div>
          <span className="text-zinc-600 font-mono">REF:</span>
          <p className="text-zinc-400 mt-0.5">{data.refValueRu}</p>
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
        <ChevronRight size={9} className="text-zinc-500 shrink-0 mt-0.5"/>
        <p className="text-[10px] text-zinc-400 leading-relaxed">{data.hintRu}</p>
      </div>
    </div>
  );
}

export function CornerDetailPanel({ detail }: { detail: CornerDetail }) {
  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-bold text-zinc-100">{detail.cornerLabel}</p>
          <span className={cn("text-base font-mono font-bold tabular-nums",
            detail.totalDeltaMs > 0 ? "text-red-400" : "text-lime-400")}>
            {detail.totalDeltaMs > 0 ? "+" : ""}{(detail.totalDeltaMs/1000).toFixed(3)}с
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
          4-фазный разбор
        </p>
      </div>

      {/* Phases */}
      <PhaseRow phase="braking" data={detail.phases.braking}/>
      <PhaseRow phase="entry"   data={detail.phases.entry}/>
      <PhaseRow phase="apex"    data={detail.phases.apex}/>
      <PhaseRow phase="exit"    data={detail.phases.exit}/>
    </div>
  );
}
