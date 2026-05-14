"use client";
import { useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TelemetryChannel } from "@/types";

interface TelemetryChartProps {
  channels:        TelemetryChannel[];
  visibleChannels: string[];
  height?:         number;
  className?:      string;
}

const SVG_W      = 900;
const PAD_L      = 52;
const PAD_R      = 12;
const PAD_T      = 6;
const PAD_B      = 22;
const LANE_GAP   = 1;

const LANE_H: Record<string, number> = {
  speed: 110, throttle: 68, brake: 68, gear: 46, delta: 78,
};

// Channel visual config
const CH: Record<string, {
  label: string; unit: string; color: string; fill: string;
  refColor: string; scale: (v: number) => number; fmt: (v: number) => string;
  min?: number; max?: number;
}> = {
  speed:    { label: "SPEED",    unit: "km/h", color: "#a3e635", fill: "url(#g-speed)",    refColor: "#84cc16", scale: v => v * 300,  fmt: v => v.toFixed(0), min: 0 },
  throttle: { label: "THROTTLE", unit: "%",    color: "#4ade80", fill: "url(#g-throttle)", refColor: "#22c55e", scale: v => v * 100,  fmt: v => v.toFixed(0), min: 0, max: 100 },
  brake:    { label: "BRAKE",    unit: "%",    color: "#f87171", fill: "url(#g-brake)",    refColor: "#ef4444", scale: v => v * 100,  fmt: v => v.toFixed(0), min: 0, max: 100 },
  gear:     { label: "GEAR",     unit: "",     color: "#c084fc", fill: "url(#g-gear)",     refColor: "#a855f7", scale: v => Math.round(v * 8), fmt: v => v.toFixed(0), min: 0, max: 8 },
  delta:    { label: "Δ TIME",   unit: "s",    color: "#60a5fa", fill: "url(#g-delta)",    refColor: "#3b82f6", scale: v => v,        fmt: v => (v >= 0 ? "+" : "") + v.toFixed(3) },
};

// Smooth bezier path (catmull-rom spline approximation)
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  // Downsample for perf — every 3rd point
  const s = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1);
  if (s.length < 2) return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

  let d = `M ${s[0][0].toFixed(1)} ${s[0][1].toFixed(1)}`;
  for (let i = 0; i < s.length - 1; i++) {
    const [x0, y0] = s[Math.max(0, i - 1)];
    const [x1, y1] = s[i];
    const [x2, y2] = s[i + 1];
    const [x3, y3] = s[Math.min(s.length - 1, i + 2)];
    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

export function TelemetryChart({ channels, visibleChannels, height, className }: TelemetryChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);

  const visible = channels.filter(ch => visibleChannels.includes(ch.id));
  const dataLen = channels[0]?.data.length ?? 100;
  const chartW  = SVG_W - PAD_L - PAD_R;

  // ── Lane layout ─────────────────────────────────────────────────────────────
  const lanes = useMemo(() => {
    const naturalH  = visible.map(ch => LANE_H[ch.id] ?? 64);
    const naturalTot = naturalH.reduce((s, h) => s + h + LANE_GAP, 0);
    const innerTarget = height ? height - PAD_T - PAD_B : naturalTot;
    const scale = height && naturalTot > 0 ? innerTarget / naturalTot : 1;

    let y = PAD_T;
    return visible.map((ch, i) => {
      const h = Math.max(40, Math.round((LANE_H[ch.id] ?? 64) * scale));
      const lane = { ch, y, h };
      y += h + LANE_GAP;
      return lane;
    });
  }, [visible, height]);

  const totalH = PAD_T + lanes.reduce((s, l) => s + l.h + LANE_GAP, 0) + PAD_B;

  // ── Coordinate helpers ──────────────────────────────────────────────────────
  const toX = (i: number) => PAD_L + (i / Math.max(1, dataLen - 1)) * chartW;

  const laneRanges = useMemo(() => lanes.map(({ ch }) => {
    const meta = CH[ch.id];
    if (!meta) return { min: ch.min, max: ch.max };
    const scaled = [...ch.data, ...ch.refData].map(meta.scale);
    let lo = Math.min(...scaled);
    let hi = Math.max(...scaled);
    if (meta.min !== undefined) lo = meta.min;
    if (meta.max !== undefined) hi = meta.max;
    if (ch.id === "delta") { const r = Math.max(Math.abs(lo), Math.abs(hi), 0.05); lo = -r; hi = r; }
    if (lo === hi) { lo -= 1; hi += 1; }
    return { min: lo, max: hi };
  }), [lanes]);

  const toY = (v: number, li: number, ch: TelemetryChannel) => {
    const { y, h } = lanes[li];
    const { min, max } = laneRanges[li];
    const sv = CH[ch.id]?.scale(v) ?? v;
    return y + h - Math.max(0, Math.min(1, (sv - min) / (max - min))) * h;
  };

  // ── Path builders ───────────────────────────────────────────────────────────
  const buildSmooth = (data: number[], li: number, ch: TelemetryChannel): string => {
    const pts: [number, number][] = data.map((v, i) => [toX(i), toY(v, li, ch)]);
    return smoothPath(pts);
  };

  const buildArea = (data: number[], li: number, ch: TelemetryChannel): string => {
    if (!data.length) return "";
    const { y, h } = lanes[li];
    const baseline = ch.id === "delta" ? toY(0, li, ch) : y + h;
    const linePts: [number, number][] = data.map((v, i) => [toX(i), toY(v, li, ch)]);
    const line = smoothPath(linePts);
    return `${line} L ${toX(data.length - 1).toFixed(1)} ${baseline.toFixed(1)} L ${toX(0).toFixed(1)} ${baseline.toFixed(1)} Z`;
  };

  // ── Mouse ───────────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const idx = Math.min(dataLen - 1, Math.max(0, Math.round(((px - PAD_L) / chartW) * (dataLen - 1))));
    setCursor(idx);
  }, [chartW, dataLen]);

  // ── Y-axis ticks ────────────────────────────────────────────────────────────
  const yTicks = (li: number) => {
    const { min, max } = laneRanges[li];
    const range = max - min;
    if (range <= 0) return [min, max];
    const steps = [0.001, 0.002, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 200];
    const target = 3;
    const step = steps.find(s => range / s <= target) ?? steps[steps.length - 1];
    const ticks: number[] = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max + 1e-9; v += step) ticks.push(parseFloat(v.toFixed(6)));
    return ticks;
  };

  // cursor X in SVG units
  const cx = cursor !== null ? toX(cursor) : null;

  return (
    <div className={cn("relative select-none rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/60", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_W} ${totalH}`}
        className="w-full"
        style={{ height: totalH }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursor(null)}
        aria-label="Telemetry channels"
      >
        <defs>
          {/* Gradient fills per channel */}
          {Object.entries(CH).map(([id, meta]) => (
            <linearGradient key={id} id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={meta.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
          {/* Ref fill */}
          <pattern id="ref-hatch" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 0,4 L 4,0" stroke="#52525b" strokeWidth="0.5" />
          </pattern>
          {/* Cursor gradient */}
          <linearGradient id="cursor-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* ── Background ──────────────────────────────────────────────────── */}
        <rect x="0" y="0" width={SVG_W} height={totalH} fill="#09090b" />

        {/* ── Lanes ───────────────────────────────────────────────────────── */}
        {lanes.map(({ ch, y, h }, li) => {
          const meta = CH[ch.id];
          if (!meta) return null;
          const ticks = yTicks(li);
          const { min, max } = laneRanges[li];

          return (
            <g key={ch.id}>
              {/* Lane bg */}
              <rect x={PAD_L} y={y} width={chartW} height={h}
                fill={li % 2 === 0 ? "rgba(20,20,22,0.9)" : "rgba(15,15,17,0.9)"} />

              {/* Y grid lines */}
              {ticks.map(tick => {
                const fy = y + h - ((tick - min) / (max - min)) * h;
                if (fy < y + 2 || fy > y + h - 2) return null;
                return (
                  <g key={tick}>
                    <line x1={PAD_L} y1={fy} x2={PAD_L + chartW} y2={fy}
                      stroke="#27272a" strokeWidth="0.6" />
                    <text x={PAD_L - 5} y={fy + 3.5} textAnchor="end"
                      fill="#52525b" fontSize="8.5" fontFamily="'JetBrains Mono', 'Fira Code', monospace">
                      {meta.fmt(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Zero line for delta */}
              {ch.id === "delta" && (() => {
                const zy = y + h - ((0 - min) / (max - min)) * h;
                return <line x1={PAD_L} y1={zy} x2={PAD_L + chartW} y2={zy}
                  stroke="#3f3f46" strokeWidth="1" strokeDasharray="3,3" />;
              })()}

              {/* Ref fill (hatched) */}
              <path d={buildArea(ch.refData, li, ch)}
                fill="#1c1c1e" opacity="0.8" />
              {/* Ref line */}
              <path d={buildSmooth(ch.refData, li, ch)}
                fill="none" stroke={meta.refColor} strokeWidth="1"
                strokeOpacity="0.35" strokeDasharray="5,3" />

              {/* User fill */}
              <path d={buildArea(ch.data, li, ch)} fill={meta.fill} />
              {/* User line */}
              <path d={buildSmooth(ch.data, li, ch)}
                fill="none" stroke={meta.color} strokeWidth="2.2"
                strokeLinejoin="round" strokeLinecap="round" />

              {/* Channel label pill */}
              <rect x={PAD_L + 8} y={y + 6} width={meta.unit ? 78 : 54} height={16}
                rx="4" fill="rgba(9,9,11,0.85)" />
              <circle cx={PAD_L + 18} cy={y + 14} r="3" fill={meta.color} />
              <text x={PAD_L + 24} y={y + 18.5}
                fill={meta.color} fontSize="9" fontFamily="'JetBrains Mono', monospace"
                fontWeight="700" letterSpacing="0.8">
                {meta.label}{meta.unit ? ` · ${meta.unit}` : ""}
              </text>

              {/* Cursor dot + live value */}
              {cx !== null && cursor !== null && cursor < ch.data.length && (() => {
                const cy2 = toY(ch.data[cursor], li, ch);
                const val = meta.scale(ch.data[cursor]);
                const fmted = meta.fmt(val);
                const lx = cx > SVG_W * 0.72 ? cx - 46 : cx + 8;
                return (
                  <>
                    {/* Crosshair dot */}
                    <circle cx={cx} cy={cy2} r="4.5" fill={meta.color} stroke="#09090b" strokeWidth="2" />
                    {/* Value badge */}
                    <rect x={lx - 2} y={cy2 - 11} width={44} height={15} rx="3"
                      fill="rgba(9,9,11,0.92)" stroke={meta.color} strokeWidth="0.5" strokeOpacity="0.6" />
                    <text x={lx + 20} y={cy2 + 0.5} textAnchor="middle"
                      fill={meta.color} fontSize="9.5" fontFamily="'JetBrains Mono', monospace"
                      fontWeight="700">
                      {fmted}{meta.unit ? ` ${meta.unit}` : ""}
                    </text>
                  </>
                );
              })()}

              {/* Bottom border */}
              <line x1={PAD_L} y1={y + h} x2={PAD_L + chartW} y2={y + h}
                stroke="#27272a" strokeWidth="0.8" />
            </g>
          );
        })}

        {/* ── X-axis labels ────────────────────────────────────────────────── */}
        {[0, 25, 50, 75, 100].map(pct => {
          const x = PAD_L + (pct / 100) * chartW;
          return (
            <g key={pct}>
              <line x1={x} y1={PAD_T} x2={x} y2={totalH - PAD_B}
                stroke="#27272a" strokeWidth="0.5" strokeDasharray="3,6" opacity="0.6" />
              <text x={x} y={totalH - 7} textAnchor="middle"
                fill="#52525b" fontSize="8.5" fontFamily="'JetBrains Mono', monospace">
                {pct}%
              </text>
            </g>
          );
        })}

        {/* ── Left axis border ─────────────────────────────────────────────── */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={totalH - PAD_B}
          stroke="#3f3f46" strokeWidth="1" />

        {/* ── Cursor vertical line ─────────────────────────────────────────── */}
        {cx !== null && (
          <rect x={cx - 0.75} y={PAD_T} width={1.5}
            height={totalH - PAD_T - PAD_B} fill="url(#cursor-grad)" />
        )}

        {/* ── Cursor X label ───────────────────────────────────────────────── */}
        {cx !== null && cursor !== null && (() => {
          const pct = ((cursor / (dataLen - 1)) * 100).toFixed(1);
          const lx = cx > SVG_W * 0.85 ? cx - 28 : cx + 4;
          return (
            <g>
              <rect x={lx - 2} y={totalH - PAD_B + 2} width={32} height={12} rx="2"
                fill="#a3e635" opacity="0.9" />
              <text x={lx + 14} y={totalH - PAD_B + 11} textAnchor="middle"
                fill="#09090b" fontSize="8" fontFamily="'JetBrains Mono', monospace"
                fontWeight="800">
                {pct}%
              </text>
            </g>
          );
        })()}
      </svg>

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 px-4 py-2 border-t border-zinc-800/60 bg-zinc-950/60 flex-wrap">
        <div className="flex items-center gap-2">
          <svg width="24" height="5">
            <line x1="0" y1="2.5" x2="24" y2="2.5" stroke="#71717a" strokeWidth="1.5" strokeDasharray="5,3"/>
          </svg>
          <span className="text-[10px] font-mono text-zinc-500 tracking-wide">Референс</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="5">
            <line x1="0" y1="2.5" x2="24" y2="2.5" stroke="#a3e635" strokeWidth="2"/>
          </svg>
          <span className="text-[10px] font-mono text-zinc-500 tracking-wide">Ваш круг</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {visible.map(ch => {
            const m = CH[ch.id];
            if (!m) return null;
            return (
              <div key={ch.id} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: m.color }}/>
                <span className="text-[10px] font-mono tracking-wide" style={{ color: m.color }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
