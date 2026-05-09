"use client";
import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { TelemetryChannel } from "@/types";

interface TelemetryChartProps {
  channels: TelemetryChannel[];
  visibleChannels: string[];
  height?: number;
  className?: string;
}

const PADDING = { top: 12, right: 16, bottom: 28, left: 40 };

export function TelemetryChart({ channels, visibleChannels, height = 220, className }: TelemetryChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; values: { label: string; value: string; color: string }[] } | null>(null);

  const width = 800;
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const visible = channels.filter((ch) => visibleChannels.includes(ch.id));

  const toX = (i: number, total: number) => PADDING.left + (i / (total - 1)) * chartW;
  const toY = (v: number, min: number, max: number) =>
    PADDING.top + chartH - ((v - min) / (max - min)) * chartH;

  const buildPath = (data: number[], ch: TelemetryChannel) => {
    if (!data.length) return "";
    return data
      .map((v, i) => {
        const x = toX(i, data.length);
        const y = toY(v, ch.min, ch.max);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const dataX = relX - PADDING.left;
    const dataLen = channels[0]?.data.length ?? 100;
    const idx = Math.min(dataLen - 1, Math.max(0, Math.round((dataX / chartW) * (dataLen - 1))));
    setCursor(idx);
    setTooltip({
      x: relX,
      y: 0,
      values: visible.map((ch) => ({
        label: ch.label,
        color: ch.color,
        value: ch.id === "speed"
          ? `${(ch.data[idx] * 280).toFixed(0)} km/h`
          : ch.id === "delta"
          ? `${ch.data[idx].toFixed(3)}s`
          : `${(ch.data[idx] * 100).toFixed(0)}%`,
      })),
    });
  }, [channels, visible, chartW]);

  return (
    <div className={cn("relative telemetry-chart-wrapper select-none", className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setCursor(null); setTooltip(null); }}
        role="img"
        aria-label="Telemetry chart showing speed, throttle, brake and delta time channels"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => {
          const y = PADDING.top + (1 - v) * chartH;
          return (
            <g key={v}>
              <line x1={PADDING.left} y1={y} x2={width - PADDING.right} y2={y}
                stroke="#27272a" strokeWidth="1" />
              <text x={PADDING.left - 6} y={y + 4} textAnchor="end"
                className="fill-zinc-600 font-mono" fontSize="9">
                {(v * 100).toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const x = PADDING.left + (pct / 100) * chartW;
          return (
            <g key={pct}>
              <line x1={x} y1={PADDING.top} x2={x} y2={PADDING.top + chartH}
                stroke="#27272a" strokeWidth="1" strokeDasharray="3,4" />
              <text x={x} y={height - 6} textAnchor="middle"
                className="fill-zinc-600 font-mono" fontSize="9">
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Reference lap paths */}
        {visible.map((ch) => (
          <path
            key={`ref-${ch.id}`}
            d={buildPath(ch.refData, ch)}
            fill="none"
            stroke={ch.color}
            strokeWidth="1"
            strokeOpacity="0.25"
            strokeDasharray="4,4"
          />
        ))}

        {/* User lap paths */}
        {visible.map((ch) => (
          <path
            key={`user-${ch.id}`}
            d={buildPath(ch.data, ch)}
            fill="none"
            stroke={ch.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Cursor line */}
        {cursor !== null && (
          <line
            x1={toX(cursor, channels[0]?.data.length ?? 100)}
            y1={PADDING.top}
            x2={toX(cursor, channels[0]?.data.length ?? 100)}
            y2={PADDING.top + chartH}
            stroke="#a3e635"
            strokeWidth="1"
            strokeOpacity="0.6"
          />
        )}

        {/* Cursor dots */}
        {cursor !== null && visible.map((ch) => (
          <circle
            key={`dot-${ch.id}`}
            cx={toX(cursor, ch.data.length)}
            cy={toY(ch.data[cursor], ch.min, ch.max)}
            r="3"
            fill={ch.color}
            stroke="#09090b"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && tooltip.values.length > 0 && (
        <div
          className="absolute top-2 pointer-events-none z-10 rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm px-3 py-2 shadow-xl"
          style={{ left: tooltip.x > 600 ? tooltip.x - 130 : tooltip.x + 12 }}
        >
          <div className="space-y-1">
            {tooltip.values.map((v) => (
              <div key={v.label} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: v.color }} />
                <span className="text-zinc-500 font-mono w-14">{v.label}</span>
                <span className="font-mono tabular text-zinc-100 font-medium">{v.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
