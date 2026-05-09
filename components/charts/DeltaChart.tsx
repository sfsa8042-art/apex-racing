"use client";
import { useRef, useState, useCallback } from "react";
import type { DeltaResult } from "@/types/telemetry";

interface DeltaChartProps {
  delta: DeltaResult;
  totalDistM: number;
  height?: number;
  className?: string;
  highlightSegment?: { startDist: number; endDist: number } | null;
}

const PAD = { top: 16, right: 12, bottom: 28, left: 44 };

export function DeltaChart({ delta, totalDistM, height = 160, className, highlightSegment }: DeltaChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorIdx, setCursorIdx] = useState<number | null>(null);

  const W = 800; const cW = W - PAD.left - PAD.right; const cH = height - PAD.top - PAD.bottom;
  const pts = delta.cumulativeDeltaS.length;
  const raw = delta.cumulativeDeltaS;
  const minV = Math.min(...raw, -0.05);
  const maxV = Math.max(...raw,  0.05);
  const rangeV = maxV - minV;

  const toX = (i: number) => PAD.left + (i / (pts - 1)) * cW;
  const toY = (v: number) => PAD.top + cH - ((v - minV) / rangeV) * cH;
  const zeroY = toY(0);
  const worstDelta = raw[delta.worstIdx];

  function buildSegments(): React.ReactNode[] {
    const els: React.ReactNode[] = [];
    let sign = raw[0] >= 0 ? "r" : "g";
    let buf: string[] = [];
    let fillBuf: string[] = [];
    let segStart = 0;

    const flush = (endI: number) => {
      if (buf.length < 2) return;
      const color = sign === "r" ? "#f87171" : "#4ade80";
      const fillColor = sign === "r" ? "rgba(248,113,113,0.12)" : "rgba(74,222,128,0.12)";
      const x0 = toX(segStart).toFixed(1); const x1 = toX(endI).toFixed(1);
      const closed = [...fillBuf, `${x1},${zeroY.toFixed(1)}`, `${x0},${zeroY.toFixed(1)}`];
      els.push(<polygon key={`f${els.length}`} points={closed.join(" ")} fill={fillColor} />);
      els.push(<polyline key={`l${els.length}`} points={buf.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />);
    };

    for (let i = 0; i < pts; i++) {
      const s = raw[i] >= 0 ? "r" : "g";
      if (s !== sign && buf.length > 0) {
        if (i > 0) {
          const v0 = raw[i-1], v1 = raw[i];
          const cx = toX(i - 1 + v0/(v0-v1)).toFixed(1);
          buf.push(`${cx},${zeroY.toFixed(1)}`); fillBuf.push(`${cx},${zeroY.toFixed(1)}`);
          flush(i-1);
          buf = [`${cx},${zeroY.toFixed(1)}`]; fillBuf = [`${cx},${zeroY.toFixed(1)}`]; segStart = i;
        }
        sign = s;
      }
      const pt = `${toX(i).toFixed(1)},${toY(raw[i]).toFixed(1)}`;
      buf.push(pt); fillBuf.push(pt);
    }
    flush(pts - 1);
    return els;
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * W - PAD.left;
    setCursorIdx(Math.min(pts - 1, Math.max(0, Math.round((relX / cW) * (pts - 1)))));
  }, [cW, pts]);

  const gridVals = [-0.5, -0.25, 0, 0.25, 0.5, 0.75, 1.0].filter(v => v >= minV && v <= maxV);

  return (
    <div className={className} style={{ position: "relative" }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`}
        className="w-full h-full cursor-crosshair select-none"
        onMouseMove={handleMouseMove} onMouseLeave={() => setCursorIdx(null)}
        aria-label="График дельта-времени" role="img">

        {gridVals.map((v) => {
          const y = toY(v);
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={W-PAD.right} y2={y}
                stroke={v === 0 ? "#52525b" : "#27272a"} strokeWidth={v === 0 ? 1.5 : 0.5} />
              <text x={PAD.left-4} y={y+4} textAnchor="end" fontSize="9"
                fill={v === 0 ? "#a1a1aa" : "#52525b"} fontFamily="monospace">
                {v === 0 ? "±0" : `${v>0?"+":""}${v.toFixed(2)}`}
              </text>
            </g>
          );
        })}

        {[0, 0.25, 0.5, 0.75, 1.0].map((frac) => {
          const x = PAD.left + frac * cW;
          return (
            <g key={frac}>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top+cH} stroke="#27272a" strokeWidth="0.5" strokeDasharray="3,4" />
              <text x={x} y={height-6} textAnchor="middle" fontSize="9" fill="#52525b" fontFamily="monospace">
                {((frac * totalDistM)/1000).toFixed(2)} км
              </text>
            </g>
          );
        })}

        {highlightSegment && totalDistM > 0 && (() => {
          const x1 = PAD.left + (highlightSegment.startDist / totalDistM) * cW;
          const x2 = PAD.left + (highlightSegment.endDist   / totalDistM) * cW;
          return <rect x={x1} y={PAD.top} width={Math.max(2, x2 - x1)} height={cH}
            fill="#fbbf24" fillOpacity="0.10" stroke="#fbbf24" strokeWidth="0.5" strokeOpacity="0.5" />;
        })()}

        {buildSegments()}

        <line x1={PAD.left} y1={zeroY} x2={W-PAD.right} y2={zeroY} stroke="#52525b" strokeWidth="1.5" />

        <line x1={toX(delta.worstIdx)} y1={PAD.top} x2={toX(delta.worstIdx)} y2={PAD.top+cH}
          stroke="#f87171" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="4,3" />
        <text x={toX(delta.worstIdx)} y={PAD.top+10} textAnchor="middle" fontSize="8"
          fill="#f87171" fontFamily="monospace">−{worstDelta.toFixed(3)}с</text>

        {cursorIdx !== null && (
          <>
            <line x1={toX(cursorIdx)} y1={PAD.top} x2={toX(cursorIdx)} y2={PAD.top+cH}
              stroke="#a3e635" strokeWidth="1" strokeOpacity="0.7" />
            <circle cx={toX(cursorIdx)} cy={toY(raw[cursorIdx])} r="4"
              fill={raw[cursorIdx] >= 0 ? "#f87171" : "#4ade80"} stroke="#09090b" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {cursorIdx !== null && (
        <div className="absolute top-1 pointer-events-none z-10 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur px-3 py-2 text-xs font-mono shadow-xl"
          style={{ left: cursorIdx > pts*0.7 ? "auto" : `${(toX(cursorIdx)/W*100)+1}%`, right: cursorIdx > pts*0.7 ? "8px" : "auto" }}>
          <div className="text-zinc-500 mb-0.5">{Math.round(delta.distanceM[cursorIdx])} м</div>
          <div className={raw[cursorIdx] >= 0 ? "text-red-400" : "text-lime-400"}>
            {raw[cursorIdx] >= 0 ? "+" : ""}{raw[cursorIdx].toFixed(3)} с
          </div>
          <div className="text-zinc-600 text-[10px] mt-0.5">
            {raw[cursorIdx] >= 0 ? "теряете время" : "выигрываете время"}
          </div>
        </div>
      )}
    </div>
  );
}
