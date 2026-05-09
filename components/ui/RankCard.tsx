"use client";
import { cn } from "@/lib/utils";
import type { DriverRank } from "@/types/extended";
import { TIER_COLORS } from "@/lib/ranking/system";

interface RankCardProps {
  rank:      DriverRank;
  compact?:  boolean;
  className?: string;
}

function PercentileArc({ percentile }: { percentile: number }) {
  // Semi-circle arc showing percentile
  const R = 44;
  const cx = 56, cy = 56;
  const startAngle = 180;
  const sweepAngle = 180;
  const pctAngle   = (percentile / 100) * sweepAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcX = (angle: number) => cx + R * Math.cos(toRad(angle));
  const arcY = (angle: number) => cy + R * Math.sin(toRad(angle));

  const startX = arcX(startAngle);
  const startY = arcY(startAngle);
  const endAngle = startAngle + pctAngle;
  const endX = arcX(endAngle);
  const endY = arcY(endAngle);
  const largeArc = pctAngle > 180 ? 1 : 0;

  return (
    <svg width={112} height={68} className="overflow-visible">
      {/* Track */}
      <path d={`M ${arcX(180)},${arcY(180)} A ${R},${R} 0 0,1 ${arcX(360)},${arcY(360)}`}
        fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
      {/* Progress */}
      {percentile > 0 && (
        <path d={`M ${startX},${startY} A ${R},${R} 0 ${largeArc},1 ${endX},${endY}`}
          fill="none" stroke="#a3e635" strokeWidth="8" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="20" fontWeight="700"
        fill="#f4f4f5" fontFamily="monospace">{percentile}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9"
        fill="#71717a" fontFamily="monospace">percentile</text>
    </svg>
  );
}

export function RankCard({ rank, compact = false, className }: RankCardProps) {
  const tierStyle = TIER_COLORS[rank.tier];

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono",
        tierStyle.border, tierStyle.bg, tierStyle.text, className
      )}>
        <span className="font-semibold">{rank.tier}</span>
        <span className="opacity-60">·</span>
        <span>Top {100 - rank.percentile}%</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 p-4", className)}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
        Community Ranking
      </p>

      <div className="flex items-start gap-4">
        <PercentileArc percentile={rank.percentile} />

        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "text-sm font-bold font-mono px-2 py-0.5 rounded-md border",
              tierStyle.bg, tierStyle.text, tierStyle.border
            )}>
              {rank.tier}
            </span>
            <span className="text-sm font-medium text-zinc-300">{rank.rankLabel}</span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Faster than <span className="text-zinc-200 font-medium">{rank.percentile}%</span> of drivers.
            Est. rank #{rank.estimatedRank.toLocaleString()} of {rank.totalDrivers.toLocaleString()}.
          </p>

          {rank.isEstimated && (
            <p className="text-[10px] font-mono text-zinc-600 mt-1">
              *Estimated · improves with more sessions
            </p>
          )}
        </div>
      </div>

      {/* Track-specific */}
      {rank.trackSpecific.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">By track</p>
          {rank.trackSpecific.map((tr) => (
            <div key={tr.track} className="flex items-center justify-between py-1">
              <span className="text-xs text-zinc-400">{tr.track}</span>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-zinc-200">{tr.percentile}%ile</span>
                <span className={tr.deltaMs > 0 ? "text-red-400" : "text-lime-400"}>
                  {tr.deltaMs > 0 ? "+" : ""}{(tr.deltaMs / 1000).toFixed(3)}s
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
