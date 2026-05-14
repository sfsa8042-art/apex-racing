"use client";
import { useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TelemetryChannel } from "@/types";

interface TelemetryChartProps {
  channels:        TelemetryChannel[];
  visibleChannels: string[];
  height?:         number;   // overrides default total height if provided
  className?:      string;
}

// ── Layout ────────────────────────────────────────────────────────────────────
const PAD_LEFT   = 56;
const PAD_RIGHT  = 16;
const PAD_TOP    = 4;
const PAD_BOTTOM = 24;
const LANE_GAP   = 2;   // px between lanes
const SVG_W      = 800;

// Lane heights per channel type
const LANE_H: Record<string, number> = {
  speed:    100,
  throttle:  64,
  brake:     64,
  gear:      44,
  delta:     72,
};
const DEFAULT_LANE_H = 60;

// Friendly unit labels & scale per channel
const CHANNEL_META: Record<string, { unit: string; scale: (v: number) => number; fmt: (v: number) => string }> = {
  speed:    { unit: "км/ч", scale: v => v * 280,   fmt: v => v.toFixed(0) },
  throttle: { unit: "%",    scale: v => v * 100,   fmt: v => v.toFixed(0) },
  brake:    { unit: "%",    scale: v => v * 100,   fmt: v => v.toFixed(0) },
  gear:     { unit: "",     scale: v => Math.round(v * 8), fmt: v => v.toFixed(0) },
  delta:    { unit: "с",    scale: v => v,          fmt: v => (v >= 0 ? "+" : "") + v.toFixed(3) },
};

// Color fills for area under curve
const FILL_COLORS: Record<string, string> = {
  speed:    "rgba(163,230,53,0.08)",
  throttle: "rgba(74,222,128,0.12)",
  brake:    "rgba(248,113,113,0.12)",
  gear:     "rgba(167,139,250,0.10)",
  delta:    "rgba(96,165,250,0.10)",
};

export function TelemetryChart({ channels, visibleChannels, height, className }: TelemetryChartProps) {
  const svgRef   = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);

  const visible = channels.filter(ch => visibleChannels.includes(ch.id));

  // ── Compute layout ──────────────────────────────────────────────────────────
  const lanes = useMemo(() => {
    const naturalHeights = visible.map(ch => LANE_H[ch.id] ?? DEFAULT_LANE_H);
    const naturalTotal   = naturalHeights.reduce((s, h) => s + h + LANE_GAP, 0);
    const innerTarget    = height ? height - PAD_TOP - PAD_BOTTOM : naturalTotal;
    const scale          = height ? innerTarget / naturalTotal : 1;

    let y = PAD_TOP;
    return visible.map((ch, i) => {
      const h = Math.round((LANE_H[ch.id] ?? DEFAULT_LANE_H) * scale);
      const lane = { ch, y, h };
      y += h + LANE_GAP;
      return lane;
    });
  }, [visible, height]);

  const totalH = PAD_TOP + lanes.reduce((s, l) => s + l.h + LANE_GAP, 0) + PAD_BOTTOM;
  const chartW = SVG_W - PAD_LEFT - PAD_RIGHT;
  const dataLen = channels[0]?.data.length ?? 100;

  // ── Coordinate helpers ──────────────────────────────────────────────────────
  const toX = (i: number) => PAD_LEFT + (i / (dataLen - 1)) * chartW;

  const scaleVal = (ch: TelemetryChannel, v: number) => {
    const m = CHANNEL_META[ch.id];
    return m ? m.scale(v) : v;
  };

  // Real min/max for each lane considering actual data
  const laneRange = useMemo(() => {
    return lanes.map(({ ch }) => {
      const m = CHANNEL_META[ch.id];
      if (!m) return { min: ch.min, max: ch.max };
      const scaled = ch.data.map(m.scale);
      const refScaled = ch.refData.map(m.scale);
      const all = [...scaled, ...refScaled];
      let min = Math.min(...all);
      let max = Math.max(...all);
      if (ch.id === "delta") { const r = Math.max(Math.abs(min), Math.abs(max), 0.1); min = -r; max = r; }
      if (ch.id === "gear") { min = 0; max = 8; }
      if (ch.id === "speed") { min = 0; }
      if (ch.id === "throttle" || ch.id === "brake") { min = 0; max = 100; }
      return { min, max };
    });
  }, [lanes]);

  const toY = (v: number, laneIdx: number, ch: TelemetryChannel) => {
    const { y, h } = lanes[laneIdx];
    const { min, max } = laneRange[laneIdx];
    const sv = scaleVal(ch, v);
    if (max === min) return y + h / 2;
    const frac = (sv - min) / (max - min);
    return y + h - frac * h;
  };

  // ── Path builders ───────────────────────────────────────────────────────────
  const buildPath = (data: number[], laneIdx: number, ch: TelemetryChannel) => {
    if (!data.length) return "";
    return data.map((v, i) =>
      `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v, laneIdx, ch).toFixed(1)}`
    ).join(" ");
  };

  const buildArea = (data: number[], laneIdx: number, ch: TelemetryChannel) => {
    if (!data.length) return "";
    const { y, h } = lanes[laneIdx];
    const baseline = ch.id === "delta" ? toY(0, laneIdx, ch) : y + h;
    const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v, laneIdx, ch).toFixed(1)}`);
    return `M ${toX(0)},${baseline} L ${pts.join(" L ")} L ${toX(data.length - 1)},${baseline} Z`;
  };

  // ── Mouse handling ──────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const dataX = relX - PAD_LEFT;
    const idx = Math.min(dataLen - 1, Math.max(0, Math.round((dataX / chartW) * (dataLen - 1))));
    setCursor(idx);
  }, [chartW, dataLen]);

  // ── Grid Y ticks per lane ───────────────────────────────────────────────────
  const gridTicks = (laneIdx: number) => {
    const { min, max } = laneRange[laneIdx];
    const range = max - min;
    if (range === 0) return [];
    const step = range > 80 ? 50 : range > 30 ? 25 : range > 10 ? 10 : range > 2 ? 1 : 0.5;
    const ticks: number[] = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max; v += step) {
      if (v > min + 0.01 * range && v < max - 0.01 * range) ticks.push(v);
    }
    return ticks;
  };

  return (
    <div className={cn("relative select-none", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${totalH}`}
        className="w-full"
        style={{ height: totalH }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursor(null)}
        aria-label="Telemetry channels"
      >
        {/* ── Background ──────────────────────────────────────────────────── */}
        <rect x={PAD_LEFT} y={PAD_TOP} width={chartW}
          height={totalH - PAD_TOP - PAD_BOTTOM} fill="transparent" />

        {lanes.map(({ ch, y, h }, li) => (
          <g key={ch.id}>
            {/* Lane background */}
            <rect x={PAD_LEFT} y={y} width={chartW} height={h}
              fill={li % 2 === 0 ? "rgba(24,24,27,0.6)" : "rgba(18,18,20,0.4)"}
              rx="0" />

            {/* Y grid ticks */}
            {gridTicks(li).map(tick => {
              const { y: ly, h: lh } = lanes[li];
              const { min, max } = laneRange[li];
              const fy = ly + lh - ((tick - min) / (max - min)) * lh;
              return (
                <g key={tick}>
                  <line x1={PAD_LEFT} y1={fy} x2={PAD_LEFT + chartW} y2={fy}
                    stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="3,4" />
                  <text x={PAD_LEFT - 6} y={fy + 3.5} textAnchor="end"
                    fill="#71717a" fontSize="10" fontFamily="monospace">
                    {CHANNEL_META[ch.id]?.fmt(tick) ?? tick.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Zero line for delta */}
            {ch.id === "delta" && (() => {
              const { min, max } = laneRange[li];
              const fy = y + h - ((0 - min) / (max - min)) * h;
              return <line x1={PAD_LEFT} y1={fy} x2={PAD_LEFT + chartW} y2={fy}
                stroke="#52525b" strokeWidth="1" />;
            })()}

            {/* Lane label */}
            <text x={PAD_LEFT + 8} y={y + 16}
              fill={ch.color} fontSize="11" fontFamily="monospace"
              fontWeight="700" letterSpacing="0.5" opacity="0.9">
              {ch.label.toUpperCase()}
              {CHANNEL_META[ch.id]?.unit ? ` (${CHANNEL_META[ch.id].unit})` : ""}
            </text>

            {/* Ref area (filled, muted) */}
            <path d={buildArea(ch.refData, li, ch)}
              fill={FILL_COLORS[ch.id] ?? "rgba(255,255,255,0.04)"}
              opacity="0.5" />

            {/* Ref line */}
            <path d={buildPath(ch.refData, li, ch)}
              fill="none" stroke={ch.color} strokeWidth="1.2"
              strokeOpacity="0.3" strokeDasharray="4,3" />

            {/* User area */}
            <path d={buildArea(ch.data, li, ch)}
              fill={FILL_COLORS[ch.id] ?? "rgba(255,255,255,0.06)"}
              opacity="0.6" />

            {/* User line */}
            <path d={buildPath(ch.data, li, ch)}
              fill="none" stroke={ch.color} strokeWidth="2.2"
              strokeLinejoin="round" strokeLinecap="round" />

            {/* Lane bottom border */}
            <line x1={PAD_LEFT} y1={y + h} x2={PAD_LEFT + chartW} y2={y + h}
              stroke="#27272a" strokeWidth="1" />

            {/* Cursor dot */}
            {cursor !== null && cursor < ch.data.length && (
              <circle cx={toX(cursor)} cy={toY(ch.data[cursor], li, ch)}
                r="4.5" fill={ch.color} stroke="#09090b" strokeWidth="2" />
            )}

            {/* Cursor value label */}
            {cursor !== null && cursor < ch.data.length && (() => {
              const val = scaleVal(ch, ch.data[cursor]);
              const fmt = CHANNEL_META[ch.id]?.fmt(val) ?? val.toFixed(1);
              const cx = toX(cursor);
              const cy = toY(ch.data[cursor], li, ch);
              const lx = cx > SVG_W * 0.7 ? cx - 40 : cx + 8;
              return (
                <g>
                  <rect x={lx - 2} y={cy - 10} width={36} height={13}
                    rx="2" fill="#09090b" opacity="0.85" />
                  <text x={lx + 16} y={cy} textAnchor="middle"
                    fill={ch.color} fontSize="11" fontFamily="monospace" fontWeight="700">
                    {fmt}{CHANNEL_META[ch.id]?.unit ? ` ${CHANNEL_META[ch.id].unit}` : ""}
                  </text>
                </g>
              );
            })()}
          </g>
        ))}

        {/* ── Cursor line (spans all lanes) ────────────────────────────────── */}
        {cursor !== null && (
          <line
            x1={toX(cursor)} y1={PAD_TOP}
            x2={toX(cursor)} y2={totalH - PAD_BOTTOM}
            stroke="#a3e635" strokeWidth="1" strokeOpacity="0.5"
          />
        )}

        {/* ── X axis ───────────────────────────────────────────────────────── */}
        {[0, 25, 50, 75, 100].map(pct => {
          const x = PAD_LEFT + (pct / 100) * chartW;
          return (
            <g key={pct}>
              <line x1={x} y1={PAD_TOP} x2={x} y2={totalH - PAD_BOTTOM}
                stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="2,6" opacity="0.4" />
              <text x={x} y={totalH - 8} textAnchor="middle"
                fill="#71717a" fontSize="10" fontFamily="monospace">
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Left axis border */}
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={totalH - PAD_BOTTOM}
          stroke="#3f3f46" strokeWidth="1" />
      </svg>

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-1 pt-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3"
            stroke="#71717a" strokeWidth="1.5" strokeDasharray="4,3"/></svg>
          <span className="text-[10px] font-mono text-zinc-500">Референс</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3"
            stroke="#a3e635" strokeWidth="2"/></svg>
          <span className="text-[10px] font-mono text-zinc-500">Ваш круг</span>
        </div>
        {visible.map(ch => (
          <div key={ch.id} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ background: ch.color }}/>
            <span className="text-[10px] font-mono text-zinc-500">{ch.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
