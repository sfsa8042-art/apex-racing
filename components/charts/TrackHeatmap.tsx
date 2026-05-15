"use client";
import { useMemo, useState, useCallback } from "react";
import { getSmoothedLine, getCircuit } from "@/lib/tracks/geometry";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import type { TrackHeatmapData } from "@/types/extended";
import type { SegmentAnalysis } from "@/types/telemetry";

interface TrackHeatmapProps {
  data:             TrackHeatmapData;
  segmentAnalyses:  SegmentAnalysis[];
  trackId?:         string;
  className?:       string;
  height?:          number;
  cursorProgress?:  number | null;
  onSegmentClick?:  (seg: SegmentAnalysis) => void;
}

const W = 800;
const H = 480;

function toSVG(x: number, y: number): [number, number] {
  return [x * W, (1 - y) * H];
}

/**
 * Smooth heat colour: gain (blue/green) → neutral → loss (orange/red)
 * Uses proper colour space blending with 5 control stops.
 */
function heatColor(intensity: number): string {
  const stops: Array<[number, [number, number, number]]> = [
    [0.00, [30,  200, 80 ]],  // gaining — vivid green
    [0.20, [90,  220, 60 ]],  // slight gain
    [0.40, [200, 220, 20 ]],  // neutral-ish yellow
    [0.60, [240, 160, 0  ]],  // losing — orange
    [0.80, [255, 80,  0  ]],  // losing more
    [1.00, [255, 20,  20 ]],  // big loss — red
  ];

  const clamped = Math.max(0, Math.min(1, intensity));

  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const t = (clamped - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
      return `rgb(${r},${g},${b})`;
    }
  }
  return "rgb(255,20,20)";
}

/** Gaussian blur: smooth the intensity array to remove abrupt transitions */
function smoothIntensity(values: number[], sigma = 6): number[] {
  const n = values.length;
  const r = Math.ceil(sigma * 2.5);
  const kernel: number[] = [];
  let ksum = 0;
  for (let k = -r; k <= r; k++) {
    const w = Math.exp(-(k * k) / (2 * sigma * sigma));
    kernel.push(w); ksum += w;
  }
  const norm = kernel.map(w => w / ksum);
  return values.map((_, i) => {
    let v = 0;
    for (let k = -r; k <= r; k++) {
      const j = Math.min(n - 1, Math.max(0, i + k));
      v += values[j] * norm[k + r];
    }
    return v;
  });
}

export function TrackHeatmap({
  data, segmentAnalyses, trackId = "monza", className, height = 360, cursorProgress, onSegmentClick,
}: TrackHeatmapProps) {
  const { t }           = useLang();
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; label: string; deltaS: number; dist: number;
  } | null>(null);

  const circuit   = useMemo(() => getCircuit(trackId),          [trackId]);
  const smoothed  = useMemo(() => getSmoothedLine(trackId, 16), [trackId]);

  // Map heatmap points onto the smoothed track line + smooth intensities
  const heatSegments = useMemo(() => {
    if (!smoothed || !data.points.length) return [];
    const n = smoothed.length;

    // First build raw intensities mapped by lap fraction
    const rawIntensities = smoothed.map((_, i) => {
      const frac = i / (n - 1);
      // Find nearest heatmap data point
      const hp = data.points.reduce((best, p) =>
        Math.abs(p.dist / data.totalDistM - frac) < Math.abs(best.dist / data.totalDistM - frac)
          ? p : best,
        data.points[0]
      );
      return hp ? hp.intensity : 0;
    });

    // Apply Gaussian smoothing to remove hard edges
    const smoothedIntensities = smoothIntensity(rawIntensities, 8);

    return smoothed.slice(0, -1).map((pt, i) => {
      const [x1, y1] = toSVG(pt.x, pt.y);
      const [x2, y2] = toSVG(smoothed[i + 1].x, smoothed[i + 1].y);
      const frac      = i / (n - 1);
      const hp        = data.points.reduce((best, p) =>
        Math.abs(p.dist / data.totalDistM - frac) < Math.abs(best.dist / data.totalDistM - frac)
          ? p : best,
        data.points[0]
      );
      return {
        x1, y1, x2, y2,
        color: heatColor(smoothedIntensities[i]),
        intensity: smoothedIntensities[i],
        deltaS: hp?.deltaS ?? 0,
        dist:   hp?.dist   ?? 0,
      };
    });
  }, [smoothed, data]);

  const trackWidth = useMemo(() => {
    if (!circuit) return 12;
    return circuit.trackWidthNorm * Math.min(W, H) * 0.65;
  }, [circuit]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx   = ((e.clientX - rect.left) / rect.width)  * W;
    const my   = ((e.clientY - rect.top)  / rect.height) * H;

    if (!smoothed) return;

    let best = 0; let bestDist = Infinity;
    smoothed.forEach((pt, i) => {
      const [sx, sy] = toSVG(pt.x, pt.y);
      const d = (sx - mx) ** 2 + (sy - my) ** 2;
      if (d < bestDist) { bestDist = d; best = i; }
    });

    if (bestDist < 800 && heatSegments[best]) {
      const seg  = heatSegments[best];
      const frac = best / smoothed.length;
      const corner = circuit?.corners.find(c =>
        Math.abs(c.lapFrac - frac) < 0.06
      );
      setTooltip({
        x:      e.clientX - rect.left,
        y:      e.clientY - rect.top,
        label:  corner?.label ?? `${Math.round(seg.dist)}m`,
        deltaS: seg.deltaS,
        dist:   seg.dist,
      });
    } else {
      setTooltip(null);
    }
  }, [smoothed, heatSegments, circuit]);

  if (!smoothed || !circuit) {
    return (
      <div className={cn("rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center", className)}
        style={{ height }}>
        <p className="text-xs text-zinc-600 font-mono">No layout: {trackId}</p>
      </div>
    );
  }

  const buildPath = (pts: typeof smoothed, closed = true) => {
    if (!pts.length) return "";
    let d = `M ${(pts[0].x * W).toFixed(1)} ${((1 - pts[0].y) * H).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${(pts[i].x * W).toFixed(1)} ${((1 - pts[i].y) * H).toFixed(1)}`;
    }
    if (closed) d += " Z";
    return d;
  };

  return (
    <div className={cn("relative rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}
        role="img" aria-label="Track heatmap">

        <defs>
          <filter id="htglow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track shadow base */}
        <path d={buildPath(smoothed)} fill="none" stroke="#1a1a1a"
          strokeWidth={trackWidth * 1.6} strokeLinecap="round" strokeLinejoin="round"/>

        {/* Track tarmac */}
        <path d={buildPath(smoothed)} fill="none" stroke="#2a2a2a"
          strokeWidth={trackWidth * 1.2} strokeLinecap="round" strokeLinejoin="round"/>

        {/* Heatmap segments — smooth gradient colouring */}
        {heatSegments.map((seg, i) => (
          <line key={i}
            x1={seg.x1.toFixed(1)} y1={seg.y1.toFixed(1)}
            x2={seg.x2.toFixed(1)} y2={seg.y2.toFixed(1)}
            stroke={seg.color}
            strokeWidth={trackWidth}
            strokeLinecap="round"
            strokeOpacity="0.88"
          />
        ))}

        {/* Track border lines */}
        <path d={buildPath(smoothed)} fill="none" stroke="rgba(255,255,255,0.07)"
          strokeWidth={trackWidth * 1.2 + 2} strokeLinecap="round"/>
        <path d={buildPath(smoothed)} fill="none" stroke="rgba(0,0,0,0.4)"
          strokeWidth={trackWidth * 1.2 - 2} strokeLinecap="round"/>

        {/* Moving cursor dot — synced with telemetry chart */}
        {cursorProgress !== null && cursorProgress !== undefined && (() => {
          const pts = smoothed;
          if (!pts || pts.length < 2) return null;
          const idx = Math.round(cursorProgress * (pts.length - 1));
          const pt  = pts[Math.min(idx, pts.length - 1)];
          if (!pt) return null;
          const [px, py] = toSVG(pt.x, pt.y);
          return (
            <g>
              {/* Outer ring */}
              <circle cx={px} cy={py} r="12" fill="rgba(163,230,53,0.12)"
                stroke="rgba(163,230,53,0.4)" strokeWidth="1.5" />
              {/* Inner dot */}
              <circle cx={px} cy={py} r="5" fill="#a3e635"
                stroke="#09090b" strokeWidth="2" />
              {/* Direction indicator */}
              {idx < pts.length - 2 && (() => {
                const next = pts[Math.min(idx + 3, pts.length - 1)];
                const [nx, ny] = toSVG(next.x, next.y);
                const angle = Math.atan2(ny - py, nx - px) * 180 / Math.PI;
                return (
                  <line x1={px} y1={py}
                    x2={px + Math.cos(angle * Math.PI / 180) * 10}
                    y2={py + Math.sin(angle * Math.PI / 180) * 10}
                    stroke="#a3e635" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                );
              })()}
            </g>
          );
        })()}

        {/* Worst segment pulsing dot */}
        {(() => {
          const worst = heatSegments.reduce((best, seg, i) =>
            seg.intensity > heatSegments[best].intensity ? i : best, 0);
          const seg = heatSegments[worst];
          if (!seg) return null;
          return (
            <g>
              <circle cx={seg.x1} cy={seg.y1} r="14"
                fill="rgba(255,30,30,0.12)" stroke="rgba(255,60,60,0.4)" strokeWidth="1.5">
                <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx={seg.x1} cy={seg.y1} r="5" fill="#f87171"/>
            </g>
          );
        })()}

        {/* S/F line */}
        {(() => {
          const [fx, fy] = toSVG(smoothed[0].x, smoothed[0].y);
          return (
            <g>
              <line x1={fx-8} y1={fy-2} x2={fx+8} y2={fy+2}
                stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
              <text x={fx} y={fy-9} textAnchor="middle" fontSize="9"
                fill="#a1a1aa" fontFamily="monospace">S/F</text>
            </g>
          );
        })()}

        {/* Corner labels from circuit */}
        {circuit.corners.map(corner => {
          const n   = smoothed.length;
          const idx = Math.round(corner.lapFrac * n);
          const pt  = smoothed[Math.min(idx, n - 1)];
          const [cx, cy] = toSVG(pt.x, pt.y);
          // Find heat at this corner
          const frac = idx / n;
          const hp   = data.points.reduce((best, p) =>
            Math.abs(p.dist / data.totalDistM - frac) < Math.abs(best.dist / data.totalDistM - frac)
              ? p : best, data.points[0]);
          const color = hp && hp.intensity > 0.6 ? "#f87171" : hp && hp.intensity < 0.3 ? "#4ade80" : "#a1a1aa";
          return (
            <g key={corner.id}>
              <circle cx={cx} cy={cy} r="5" fill="#09090b" stroke={color} strokeWidth="1.5"/>
              <text x={cx} y={cy - 9} textAnchor="middle" fontSize="9"
                fill={color} fontFamily="monospace" fontWeight="600">
                {corner.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute z-20 pointer-events-none bg-zinc-900/98 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono shadow-2xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <p className="text-zinc-100 font-semibold mb-0.5">{tooltip.label}</p>
          <p className={cn("font-medium", tooltip.deltaS >= 0 ? "text-red-400" : "text-lime-400")}>
            {tooltip.deltaS >= 0 ? "+" : ""}{tooltip.deltaS.toFixed(3)}s
          </p>
          <p className="text-zinc-600 text-[10px] mt-0.5">
            {tooltip.deltaS >= 0 ? t.telemetry.losing : t.telemetry.gaining}
          </p>
        </div>
      )}

      {/* Gradient legend */}
      <div className="absolute bottom-3 left-4 flex items-center gap-3">
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{background:"rgb(30,200,80)"}}/>
            <span className="text-lime-400">{t.telemetry.gaining}</span>
          </div>
          <div className="w-16 h-2 rounded-full" style={{
            background:"linear-gradient(to right, rgb(30,200,80), rgb(200,220,20), rgb(240,160,0), rgb(255,20,20))"
          }}/>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{background:"rgb(255,20,20)"}}/>
            <span className="text-red-400">{t.telemetry.losing}</span>
          </div>
        </div>
      </div>

      {!data.hasRealGPS && (
        <div className="absolute bottom-3 right-4">
          <span className="text-[10px] font-mono text-zinc-700">Approx. layout</span>
        </div>
      )}
    </div>
  );
}
