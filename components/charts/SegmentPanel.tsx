"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, TrendingDown, TrendingUp } from "lucide-react";
import type { SegmentAnalysis } from "@/types/telemetry";
import { cn } from "@/lib/utils";

interface SegmentPanelProps {
  segmentAnalyses: SegmentAnalysis[];
  totalTimeDeltaMs: number;
  hasReference?: boolean;
  onSegmentHover?: (sa: SegmentAnalysis | null) => void;
}

function DeltaBar({ deltaMs, maxMs }: { deltaMs: number; maxMs: number }) {
  const pct = Math.min(100, (Math.abs(deltaMs) / Math.max(maxMs, 1)) * 100);
  const isLoss = deltaMs > 0;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", isLoss ? "bg-red-400" : "bg-lime-400")}
          style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-[11px] font-mono tabular w-16 text-right shrink-0", isLoss ? "text-red-400" : "text-lime-400")}>
        {isLoss ? "−" : "+"}{(Math.abs(deltaMs) / 1000).toFixed(3)}с
      </span>
    </div>
  );
}

function InsightRow({ insight }: { insight: SegmentAnalysis["insights"][number] }) {
  const palette: Record<string, string> = {
    early_brake:    "text-red-400 bg-red-400/8 border-red-400/25",
    late_brake:     "text-red-400 bg-red-400/8 border-red-400/25",
    low_apex_speed: "text-yellow-400 bg-yellow-400/8 border-yellow-400/25",
    late_throttle:  "text-orange-400 bg-orange-400/8 border-orange-400/25",
    early_throttle: "text-yellow-400 bg-yellow-400/8 border-yellow-400/25",
    speed_deficit:  "text-yellow-400 bg-yellow-400/8 border-yellow-400/25",
    good_segment:   "text-lime-400 bg-lime-400/8 border-lime-400/25",
    consistent:     "text-blue-400 bg-blue-400/8 border-blue-400/25",
  };
  return (
    <div className={cn("rounded-lg border px-3 py-2.5 text-xs", palette[insight.type] ?? "text-zinc-400 bg-zinc-800 border-zinc-700")}>
      <p className="leading-relaxed">{insight.descriptionRu}</p>
      <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5">
        {insight.userValue !== undefined && insight.refValue !== undefined && (
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-zinc-500">Вы: <span className="text-zinc-200">{insight.userValue} {insight.unit}</span></span>
            <span className="text-zinc-500">Реф: <span className="text-lime-400">{insight.refValue} {insight.unit}</span></span>
          </div>
        )}
        {insight.timeCostMs > 0 && (
          <span className="font-mono text-[10px] text-red-400">−{(insight.timeCostMs / 1000).toFixed(3)}с</span>
        )}
      </div>
      {insight.academyModuleId && (
        <a href="/academy" className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700 hover:border-zinc-500 px-2 py-1 rounded">
          <BookOpen size={10} className="text-lime-400" />
          {insight.academyModuleTitleRu ?? "Пройти урок"}
          <ChevronRight size={9} />
        </a>
      )}
    </div>
  );
}

function SegmentRow({ sa, maxLoss, hasReference }: { sa: SegmentAnalysis; maxLoss: number; hasReference: boolean }) {
  const [open, setOpen] = useState(false);
  const hasInsights = sa.insights.length > 0;
  const isCorner = sa.segment.type === "corner";
  const isLoss = sa.deltaMs > 0;
  const isGood = sa.insights.some((i) => i.type === "good_segment");

  return (
    <div className={cn("border-b border-zinc-800 last:border-0", open && "bg-zinc-800/25")}>
      <button onClick={() => hasInsights && setOpen((o) => !o)}
        className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          hasInsights ? "hover:bg-zinc-800/40 cursor-pointer" : "cursor-default")}>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-mono font-bold",
          isCorner
            ? isGood ? "bg-lime-400/15 text-lime-400" : isLoss ? "bg-red-400/15 text-red-400" : "bg-yellow-400/15 text-yellow-400"
            : "bg-zinc-800 text-zinc-500")}>
          {isCorner ? sa.segment.label.replace("Поворот ", "П") : "→"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-200">{sa.segment.label}</p>
            {hasReference && (
              <div className="flex items-center gap-1.5 text-xs font-mono shrink-0">
                {isLoss ? <TrendingDown size={11} className="text-red-400" /> : <TrendingUp size={11} className="text-lime-400" />}
                <span className={isLoss ? "text-red-400" : "text-lime-400"}>
                  {isLoss ? "−" : "+"}{(Math.abs(sa.deltaMs) / 1000).toFixed(3)}с
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500 font-mono flex-wrap">
            {isCorner && sa.segment.apexSpeed !== undefined && (
              <span>апекс: <span className="text-zinc-300">{Math.round(sa.segment.apexSpeed)} км/ч</span></span>
            )}
            <span>макс: <span className="text-zinc-300">{Math.round(sa.segment.maxSpeed)} км/ч</span></span>
            {sa.insights.filter((i) => i.timeCostMs > 0).length > 0 && (
              <span className="text-red-400">{sa.insights.filter((i) => i.timeCostMs > 0).length} проблем</span>
            )}
          </div>
          {hasReference && <DeltaBar deltaMs={sa.deltaMs} maxMs={maxLoss} />}
        </div>
        {hasInsights && (open ? <ChevronDown size={13} className="text-zinc-500 shrink-0" /> : <ChevronRight size={13} className="text-zinc-600 shrink-0" />)}
      </button>
      {open && hasInsights && (
        <div className="px-4 pb-4 space-y-2 animate-slide-up">
          {sa.insights.map((ins, i) => <InsightRow key={i} insight={ins} />)}
        </div>
      )}
    </div>
  );
}

export function SegmentPanel({ segmentAnalyses, totalTimeDeltaMs, hasReference = true, onSegmentHover }: SegmentPanelProps) {
  const [filter, setFilter] = useState<"all" | "corners" | "straights">("all");
  const corners = segmentAnalyses.filter((sa) => sa.segment.type === "corner");
  const straights = segmentAnalyses.filter((sa) => sa.segment.type === "straight");
  const visible = filter === "corners" ? corners : filter === "straights" ? straights : segmentAnalyses;
  const maxLoss = Math.max(...segmentAnalyses.filter((sa) => sa.deltaMs > 0).map((sa) => sa.deltaMs), 1);
  const totalLossMs = segmentAnalyses.reduce((s, sa) => s + Math.max(0, sa.deltaMs), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-zinc-300">Анализ участков</h3>
          {hasReference
            ? <span className="text-[10px] font-mono text-red-400">−{(totalTimeDeltaMs / 1000).toFixed(3)}с</span>
            : <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">без эталона</span>}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500 mb-2 flex-wrap">
          <span>{corners.length} поворотов</span><span>·</span>
          <span>{straights.length} прямых</span>
          {hasReference && <><span>·</span><span className="text-red-400">−{(totalLossMs / 1000).toFixed(3)}с потеряно</span></>}
          {!hasReference && <><span>·</span><span className="text-zinc-600">объективные замеры</span></>}
        </div>
        <div className="flex gap-1">
          {([["all", "Все"], ["corners", "Повороты"], ["straights", "Прямые"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={cn("px-2 py-0.5 rounded text-[11px] font-mono transition-colors",
                filter === k ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {visible.map((sa) => (
          <div key={sa.segment.id}
            onMouseEnter={() => onSegmentHover?.(sa)}
            onMouseLeave={() => onSegmentHover?.(null)}>
            <SegmentRow sa={sa} maxLoss={maxLoss} hasReference={hasReference} />
          </div>
        ))}
      </div>
    </div>
  );
}
