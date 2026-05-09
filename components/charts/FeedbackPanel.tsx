import { AlertTriangle, Info, BookOpen, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn, severityConfig } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { TelemetryInsight } from "@/types";

interface FeedbackPanelProps {
  insights: TelemetryInsight[];
  selectedInsightId?: string | null;
  onSelectInsight?: (insight: TelemetryInsight) => void;
}

function InsightIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <AlertTriangle size={13} className="text-red-400 shrink-0" />;
  if (severity === "warning") return <AlertTriangle size={13} className="text-yellow-400 shrink-0" />;
  return <Info size={13} className="text-blue-400 shrink-0" />;
}

export function FeedbackPanel({ insights, selectedInsightId, onSelectInsight }: FeedbackPanelProps) {
  const totalCostMs = insights.reduce((acc, i) => acc + i.timeCostMs, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-medium text-zinc-300">Lap Analysis</h3>
          <span className="text-[10px] font-mono text-red-400">
            Total: –{(totalCostMs / 1000).toFixed(3)}s
          </span>
        </div>
        <p className="text-[11px] text-zinc-500">
          {insights.filter(i => i.severity === "critical").length} critical ·{" "}
          {insights.filter(i => i.severity === "warning").length} warnings ·{" "}
          {insights.filter(i => i.severity === "info").length} info
        </p>
      </div>

      {/* Insights list */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800">
        {insights.map((insight) => {
          const config = severityConfig(insight.severity);
          const isSelected = selectedInsightId === insight.id;
          const isPositive = insight.timeCostMs === 0;

          return (
            <div
              key={insight.id}
              onClick={() => onSelectInsight?.(insight)}
              className={cn(
                "px-4 py-3 cursor-pointer transition-all",
                isSelected ? `${config.bg} border-l-2 ${config.border.replace("border", "border-l")}` : "hover:bg-zinc-800/40",
                isPositive && "opacity-80"
              )}
            >
              <div className="flex items-start gap-2.5 mb-2">
                {isPositive
                  ? <CheckCircle2 size={13} className="text-lime-400 shrink-0 mt-0.5" />
                  : <InsightIcon severity={insight.severity} />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-200 leading-snug">{insight.title}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{insight.corner}</p>
                </div>
                {insight.timeCostMs > 0 && (
                  <span className="text-[11px] font-mono tabular text-red-400 shrink-0">
                    –{(insight.timeCostMs / 1000).toFixed(3)}s
                  </span>
                )}
              </div>

              {isSelected && (
                <div className="mt-2 space-y-3 animate-slide-up">
                  <p className="text-xs text-zinc-400 leading-relaxed">{insight.description}</p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="muted">{insight.channel.replace("_", " ")}</Badge>
                  </div>

                  {insight.academyModuleId && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer hover:border-zinc-600 transition-colors">
                      <BookOpen size={12} className="text-lime-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Fix this</p>
                        <p className="text-xs text-zinc-300 truncate">{insight.academyModuleTitle}</p>
                      </div>
                      <ChevronRight size={12} className="text-zinc-600 shrink-0" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
