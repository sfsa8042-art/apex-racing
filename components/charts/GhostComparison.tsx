"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface GhostChannel {
  id:       string;
  label:    string;
  unit:     string;
  color:    string;
  data:     number[];     // normalised 0–1
  refData:  number[];
  rawData:  number[];
  rawRefData: number[];
}

interface GhostComparisonProps {
  channels:       GhostChannel[];
  className?:     string;
  highlightRange?: [number, number] | null;  // [startFrac, endFrac] to highlight
}

const W = 800;
const H_PER_CHANNEL = 80;
const PAD = { left: 10, right: 10, top: 8, bottom: 8 };

function buildPath(data: number[], h: number, drawW: number): string {
  return data.map((v, i) => {
    const x = PAD.left + (i / (data.length - 1)) * drawW;
    const y = PAD.top  + (1 - v) * (h - PAD.top - PAD.bottom);
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function ChannelRow({ ch, h, highlightRange }: {
  ch: GhostChannel; h: number; highlightRange?: [number, number] | null;
}) {
  const drawW = W - PAD.left - PAD.right;

  const userPath = buildPath(ch.data, h, drawW);
  const refPath  = buildPath(ch.refData, h, drawW);

  const hlX1 = highlightRange ? PAD.left + highlightRange[0] * drawW : null;
  const hlX2 = highlightRange ? PAD.left + highlightRange[1] * drawW : null;

  // Compute difference area to shade
  const diffPoints: string[] = [];
  const refPointsRev: string[] = [];
  ch.data.forEach((uv, i) => {
    const rv = ch.refData[i];
    const x  = (PAD.left + (i / (ch.data.length - 1)) * drawW).toFixed(1);
    const uy = (PAD.top + (1 - uv) * (h - PAD.top - PAD.bottom)).toFixed(1);
    const ry = (PAD.top + (1 - rv) * (h - PAD.top - PAD.bottom)).toFixed(1);
    diffPoints.push(`${x},${uy}`);
    refPointsRev.unshift(`${x},${ry}`);
  });

  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full" style={{ height: h }}>
      {/* Highlight zone */}
      {hlX1 !== null && hlX2 !== null && (
        <rect x={hlX1} y={0} width={hlX2 - hlX1} height={h}
          fill="rgba(163,230,53,0.06)" stroke="rgba(163,230,53,0.2)" strokeWidth="0.5" />
      )}

      {/* Difference fill */}
      <polygon
        points={[...diffPoints, ...refPointsRev].join(" ")}
        fill={`${ch.color}18`}
      />

      {/* Reference (dashed, dimmer) */}
      <path d={refPath} fill="none" stroke={ch.color} strokeWidth="1.5" strokeOpacity="0.35" strokeDasharray="5,4" />

      {/* User lap */}
      <path d={userPath} fill="none" stroke={ch.color} strokeWidth="2.5" strokeLinejoin="round" />

      {/* Channel label */}
      <text x={PAD.left + 4} y={PAD.top + 13} fontSize="9" fill={ch.color}
        fontFamily="monospace" fontWeight="500" opacity="0.8">
        {ch.label.toUpperCase()}
      </text>
    </svg>
  );
}

export function GhostComparison({ channels, className, highlightRange }: GhostComparisonProps) {
  const [activeChannels, setActiveChannels] = useState(
    () => new Set(channels.filter((c) => c.id !== "delta").map((c) => c.id))
  );

  const toggle = (id: string) => {
    setActiveChannels((prev) => {
      const next = new Set(prev);
      if (next.has(id) && next.size > 1) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visible = channels.filter((c) => activeChannels.has(c.id) && c.id !== "delta");

  return (
    <div className={cn("space-y-1", className)}>
      {/* Toggle buttons */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className="text-[10px] font-mono text-zinc-600 mr-1">CHANNELS</span>
        {channels.filter((c) => c.id !== "delta").map((ch) => (
          <button key={ch.id} onClick={() => toggle(ch.id)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-all",
              activeChannels.has(ch.id)
                ? "border-zinc-600 bg-zinc-800 text-zinc-200"
                : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
            )}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: activeChannels.has(ch.id) ? ch.color : "#52525b" }} />
            {ch.label}
          </button>
        ))}
        <div className="flex items-center gap-3 ml-auto text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-zinc-400 rounded" />
            <span className="text-zinc-500">You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#71717a" strokeWidth="1.5" strokeDasharray="4,3"/></svg>
            <span className="text-zinc-500">Reference</span>
          </div>
        </div>
      </div>

      {/* Stacked channel rows */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden divide-y divide-zinc-800">
        {visible.map((ch) => (
          <div key={ch.id}>
            <ChannelRow ch={ch} h={H_PER_CHANNEL} highlightRange={highlightRange} />
          </div>
        ))}
      </div>

      {highlightRange && (
        <p className="text-[11px] font-mono text-lime-400/70 text-center mt-1">
          Highlighted: selected segment
        </p>
      )}
    </div>
  );
}
