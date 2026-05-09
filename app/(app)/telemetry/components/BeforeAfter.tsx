"use client";
import { cn } from "@/lib/utils";
import type { BeforeAfterData } from "@/types/extended";

interface BeforeAfterProps {
  data:      BeforeAfterData;
  className?: string;
}

const W = 500;
const H = 70;
const PAD = { left: 8, right: 8, top: 8, bottom: 8 };

function MiniChart({ data, color, label }: { data: number[]; color: string; label: string }) {
  const drawW = W - PAD.left - PAD.right;
  const drawH = H - PAD.top - PAD.bottom;
  const path = data.map((v, i) => {
    const x = PAD.left + (i / (data.length - 1)) * drawW;
    const y = PAD.top  + (1 - v) * drawH;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="flex-1">
      <p className="text-[10px] font-mono text-zinc-500 mb-1">{label}</p>
      <div className="rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }}>
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
          {/* Fill under */}
          <path d={`${path} L ${(PAD.left + drawW).toFixed(1)} ${(PAD.top + drawH).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + drawH).toFixed(1)} Z`}
            fill={`${color}18`} />
        </svg>
      </div>
    </div>
  );
}

export function BeforeAfter({ data, className }: BeforeAfterProps) {
  return (
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 p-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">{data.segmentLabel}</p>
          <p className="text-sm font-medium text-zinc-200">{data.tipShort}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-zinc-500 mb-0.5">Gain if fixed</p>
          <p className="text-lg font-mono font-bold text-lime-400">+{data.gainS.toFixed(3)}s</p>
        </div>
      </div>

      {/* Charts side by side */}
      <div className="flex gap-3 mb-3">
        <MiniChart data={data.currentData} color="#f87171" label={`Current — ${data.channelLabel}`} />
        <div className="flex flex-col items-center justify-center px-1">
          <div className="w-px flex-1 bg-zinc-700" />
          <span className="text-lg my-1">→</span>
          <div className="w-px flex-1 bg-zinc-700" />
        </div>
        <MiniChart data={data.optimalData} color="#a3e635" label={`Optimal — ${data.channelLabel}`} />
      </div>

      {/* Detail tip */}
      <p className="text-xs text-zinc-400 leading-relaxed">{data.tipDetail}</p>
    </div>
  );
}
