"use client";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { getSmoothedLine, getCircuit } from "@/lib/tracks/geometry";
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

const W = 800, H = 480;

function toSVG(x: number, y: number): [number, number] {
  return [x * W, (1 - y) * H];
}

// Professional speed colour: deep blue → cyan → lime → yellow → orange → red
function speedColor(intensity: number): string {
  const t = Math.max(0, Math.min(1, intensity));
  const stops: [number, [number,number,number]][] = [
    [0.00, [20, 40, 120]],   // slow — deep blue
    [0.25, [20, 160, 220]],  // medium slow — cyan
    [0.50, [80, 220, 100]],  // optimal — lime green
    [0.70, [220, 220, 20]],  // fast — yellow
    [0.85, [255, 120, 0]],   // braking — orange
    [1.00, [255, 30, 30]],   // hard brake — red
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
      const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
      const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
      return `rgb(${r},${g},${b})`;
    }
  }
  return "rgb(255,30,30)";
}

function gaussian(values: number[], sigma = 6): number[] {
  const n = values.length;
  const r = Math.ceil(sigma * 2.5);
  const kernel: number[] = [];
  let ksum = 0;
  for (let i = -r; i <= r; i++) {
    const k = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(k); ksum += k;
  }
  const norm = kernel.map(k => k / ksum);
  return values.map((_, i) => {
    let v = 0;
    for (let j = -r; j <= r; j++) {
      v += (values[(i + j + n) % n] ?? 0) * norm[j + r];
    }
    return v;
  });
}

export function TrackHeatmap({
<<<<<<< HEAD
  data, segmentAnalyses, trackId = "monza", className, height = 360, cursorProgress, onSegmentClick,
=======
  data, segmentAnalyses, trackId = "monza", className, height = 400,
  cursorProgress, onSegmentClick,
>>>>>>> c5c715c (wow telemetry - live map cursor, F1 pit wall layout)
}: TrackHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredSeg, setHoveredSeg] = useState<SegmentAnalysis | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; deltaS: number } | null>(null);
  const [trailHistory, setTrailHistory] = useState<number[]>([]);

  const smoothedRaw = useMemo(() => getSmoothedLine(trackId, 16), [trackId]);
  const smoothed = smoothedRaw ?? [];

  // Build intensities from heatmap data (brake pressure → colour)
  const intensities = useMemo(() => {
    if (!smoothed.length || !data.points.length) return [];
    const n = smoothed.length;
    const totalDist = data.totalDistM || 4000;
    const raw = smoothed.map((_, i) => {
      const dist = (i / n) * totalDist;
      const nearest = data.points.reduce((best, p) =>
        Math.abs(p.dist - dist) < Math.abs(best.dist - dist) ? p : best,
        data.points[0]
      );
      return nearest ? nearest.intensity : 0;
    });
    return gaussian(raw, 8);
  }, [smoothed, data]);

  // Build segment overlap map
  const segmentMap = useMemo(() => {
    if (!smoothed.length) return new Map<number, SegmentAnalysis>();
    const m = new Map<number, SegmentAnalysis>();
    const totalDist = data.totalDistM || 4000;
    segmentAnalyses.forEach(sa => {
      const startFrac = sa.segment.startDist / totalDist;
      const endFrac   = sa.segment.endDist   / totalDist;
      const si = Math.round(startFrac * smoothed.length);
      const ei = Math.round(endFrac   * smoothed.length);
      for (let i = si; i < ei; i++) m.set(i % smoothed.length, sa);
    });
    return m;
  }, [smoothed, segmentAnalyses, data.totalDistM]);

  // Cursor trail effect
  useEffect(() => {
    if (cursorProgress === null || cursorProgress === undefined) {
      setTrailHistory([]);
      return;
    }
    setTrailHistory(prev => {
      const idx = Math.round(cursorProgress * (smoothed.length - 1));
      const next = [...prev, idx].slice(-8);
      return next;
    });
  }, [cursorProgress, smoothed.length]);

  const getCursorPoint = useCallback((progress: number) => {
    if (!smoothed.length) return null;
    const idx = Math.round(progress * (smoothed.length - 1));
    const pt = smoothed[Math.min(idx, smoothed.length - 1)];
    if (!pt) return null;
    return { pt, idx };
  }, [smoothed]);

  if (!smoothed.length) return null;

  // Build coloured segments path data
  const segments = smoothed.map((pt, i) => {
    const next = smoothed[(i + 1) % smoothed.length];
    const [x1, y1] = toSVG(pt.x, pt.y);
    const [x2, y2] = toSVG(next.x, next.y);
    const intensity = intensities[i] ?? 0;
    return { x1, y1, x2, y2, color: speedColor(intensity), idx: i };
  });

  // Cursor position
  const cursorData = cursorProgress != null ? getCursorPoint(cursorProgress) : null;
  const cursorPt   = cursorData?.pt;
  const cursorIdx  = cursorData?.idx ?? 0;
  const [cxSvg, cySvg] = cursorPt ? toSVG(cursorPt.x, cursorPt.y) : [0, 0];

  // Next point for direction arrow
  const nextIdx = (cursorIdx + 3) % smoothed.length;
  const nextPt  = smoothed[nextIdx];
  const [nxSvg, nySvg] = nextPt ? toSVG(nextPt.x, nextPt.y) : [cxSvg + 1, cySvg];
  const angle = Math.atan2(nySvg - cySvg, nxSvg - cxSvg) * 180 / Math.PI;

  // Speed at cursor
  const cursorSpeed = cursorData && data.points.length > 0
    ? (() => {
        const idx = Math.min(Math.round(cursorProgress! * data.points.length), data.points.length - 1);
        const pt = data.points[idx];
        // Use deltaS to show time delta instead of speed
        return pt ? (pt.deltaS >= 0 ? `+${pt.deltaS.toFixed(3)}с` : `${pt.deltaS.toFixed(3)}с`) : "";
      })()
    : "";

  // Worst corner for callout
  const worstCorner = segmentAnalyses
    .filter(sa => sa.segment.type === "corner" && sa.deltaMs > 100)
    .sort((a, b) => b.deltaMs - a.deltaMs)[0];

  return (
    <div className={cn("relative bg-zinc-950 rounded-2xl overflow-hidden", className)}
      style={{ height }}>

      {/* Track SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 0 20px rgba(0,0,0,0.8))" }}
      >
        <defs>
          {/* Glow filter for cursor */}
          <filter id="glow-lime" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Track shadow */}
          <filter id="track-shadow">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#000" floodOpacity="0.8" />
          </filter>
          {/* Radial gradient bg */}
          <radialGradient id="bg-grad" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#111113" />
            <stop offset="100%" stopColor="#09090b" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="url(#bg-grad)" />

        {/* Subtle grid */}
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={(i / 7) * H} x2={W} y2={(i / 7) * H}
            stroke="#1f1f22" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <line key={`v${i}`} x1={(i / 11) * W} y1={0} x2={(i / 11) * W} y2={H}
            stroke="#1f1f22" strokeWidth="0.5" />
        ))}

        {/* ── Track outline (shadow layer) ──────────────────────────────────── */}
        <polyline
          points={smoothed.map(pt => { const [x,y] = toSVG(pt.x, pt.y); return `${x},${y}`; }).join(" ")}
          fill="none" stroke="rgba(0,0,0,0.9)" strokeWidth="22"
          strokeLinejoin="round" strokeLinecap="round" filter="url(#track-shadow)"
        />
        {/* Track base (dark asphalt) */}
        <polyline
          points={smoothed.map(pt => { const [x,y] = toSVG(pt.x, pt.y); return `${x},${y}`; }).join(" ")}
          fill="none" stroke="#1a1a1e" strokeWidth="18"
          strokeLinejoin="round" strokeLinecap="round"
        />
        {/* Track border */}
        <polyline
          points={smoothed.map(pt => { const [x,y] = toSVG(pt.x, pt.y); return `${x},${y}`; }).join(" ")}
          fill="none" stroke="#2f2f35" strokeWidth="18.5"
          strokeLinejoin="round" strokeLinecap="round" opacity="0.5"
        />

        {/* ── Coloured speed heat map ──────────────────────────────────────── */}
        {segments.map(({ x1, y1, x2, y2, color, idx }) => (
          <line key={idx}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth="10"
            strokeLinecap="round"
            opacity={hoveredSeg && segmentMap.get(idx) !== hoveredSeg ? "0.3" : "1"}
          />
        ))}

        {/* ── Segment loss overlays ────────────────────────────────────────── */}
        {segmentAnalyses
          .filter(sa => sa.segment.type === "corner" && sa.deltaMs > 100)
          .map(sa => {
            const totalDist = data.totalDistM || 4000;
            const startFrac = sa.segment.startDist / totalDist;
            const endFrac   = sa.segment.endDist   / totalDist;
            const si = Math.round(startFrac * smoothed.length);
            const ei = Math.round(endFrac   * smoothed.length);
            const midIdx = Math.round((si + ei) / 2) % smoothed.length;
            const [lx, ly] = toSVG(smoothed[midIdx]?.x ?? 0.5, smoothed[midIdx]?.y ?? 0.5);
            const loss = (sa.deltaMs / 1000).toFixed(3);
            const isWorst = sa === worstCorner;
            return (
              <g key={sa.segment.id}
                onMouseEnter={() => { setHoveredSeg(sa); setTooltip({ x: lx, y: ly, label: sa.segment.label, deltaS: sa.deltaMs / 1000 }); }}
                onMouseLeave={() => { setHoveredSeg(null); setTooltip(null); }}
                onClick={() => onSegmentClick?.(sa)}
                style={{ cursor: "pointer" }}>
                {/* Loss indicator circle */}
                <circle cx={lx} cy={ly} r={isWorst ? 14 : 10}
                  fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.6)"
                  strokeWidth={isWorst ? "1.5" : "1"}
                  filter={isWorst ? "url(#glow-soft)" : undefined} />
                <text x={lx} y={ly + 4} textAnchor="middle"
                  fill="#f87171" fontSize={isWorst ? "8" : "7"}
                  fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                  −{loss}
                </text>
              </g>
            );
          })}

<<<<<<< HEAD
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
=======
        {/* ── Finish line ──────────────────────────────────────────────────── */}
>>>>>>> c5c715c (wow telemetry - live map cursor, F1 pit wall layout)
        {(() => {
          const pt0 = smoothed[0];
          const pt1 = smoothed[1];
          if (!pt0 || !pt1) return null;
          const [x0, y0] = toSVG(pt0.x, pt0.y);
          const [x1, y1] = toSVG(pt1.x, pt1.y);
          const dx = x1 - x0, dy = y1 - y0;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = -dy / len * 14, ny = dx / len * 14;
          return (
            <g>
              <line x1={x0 - nx} y1={y0 - ny} x2={x0 + nx} y2={y0 + ny}
                stroke="#ffffff" strokeWidth="3" strokeDasharray="4,4" />
              <text x={x0 + nx + 6} y={y0 + ny + 3}
                fill="#ffffff" fontSize="8" fontFamily="'JetBrains Mono', monospace"
                fontWeight="700" opacity="0.7">SF</text>
            </g>
          );
        })()}

        {/* ── Cursor trail ─────────────────────────────────────────────────── */}
        {cursorPt && trailHistory.slice(0, -1).map((idx, ti) => {
          const trailPt = smoothed[idx];
          if (!trailPt) return null;
          const [tx, ty] = toSVG(trailPt.x, trailPt.y);
          const opacity = (ti + 1) / trailHistory.length * 0.35;
          const r = 2 + ti * 0.5;
          return (
            <circle key={ti} cx={tx} cy={ty} r={r}
              fill="#a3e635" opacity={opacity} />
          );
        })}

        {/* ── Cursor marker ────────────────────────────────────────────────── */}
        {cursorPt && (
          <g transform={`translate(${cxSvg}, ${cySvg})`}>
            {/* Outer glow ring */}
            <circle r="22" fill="rgba(163,230,53,0.06)"
              stroke="rgba(163,230,53,0.2)" strokeWidth="1" />
            {/* Mid ring */}
            <circle r="14" fill="rgba(163,230,53,0.10)"
              stroke="rgba(163,230,53,0.4)" strokeWidth="1.5" />
            {/* Core dot */}
            <circle r="6" fill="#a3e635" stroke="#09090b" strokeWidth="2.5"
              filter="url(#glow-lime)" />
            {/* Direction arrow */}
            <line x1={0} y1={0}
              x2={Math.cos(angle * Math.PI / 180) * 18}
              y2={Math.sin(angle * Math.PI / 180) * 18}
              stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
            {/* Speed badge */}
            {cursorSpeed && (() => {
              const bx = cxSvg > W * 0.7 ? -52 : 20;
              const by = cySvg > H * 0.8 ? -20 : 0;
              return (
                <g transform={`translate(${bx}, ${by})`}>
                  <rect x={0} y={-10} width={46} height={16} rx="4"
                    fill="rgba(9,9,11,0.92)" stroke="rgba(163,230,53,0.5)" strokeWidth="0.8" />
                  <text x={23} y={1} textAnchor="middle"
                    fill="#a3e635" fontSize="9" fontFamily="'JetBrains Mono', monospace"
                    fontWeight="800">{cursorSpeed}</text>
                </g>
              );
            })()}
          </g>
        )}

        {/* ── Tooltip ──────────────────────────────────────────────────────── */}
        {tooltip && (
          <g>
            <rect x={tooltip.x + 12} y={tooltip.y - 20} width={90} height={30} rx="5"
              fill="rgba(9,9,11,0.95)" stroke="rgba(248,113,113,0.4)" strokeWidth="0.8" />
            <text x={tooltip.x + 57} y={tooltip.y - 8} textAnchor="middle"
              fill="#f87171" fontSize="9" fontFamily="'JetBrains Mono', monospace" fontWeight="700">
              {tooltip.label}
            </text>
            <text x={tooltip.x + 57} y={tooltip.y + 5} textAnchor="middle"
              fill="#fca5a5" fontSize="8" fontFamily="'JetBrains Mono', monospace">
              −{tooltip.deltaS.toFixed(3)}с
            </text>
          </g>
        )}
      </svg>

      {/* ── Speed legend ──────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-4 flex items-center gap-0">
        {["#1428C8","#14A0DC","#50DC64","#DCDC14","#FF7800","#FF1E1E"].map((color, i) => (
          <div key={i} className="w-5 h-2" style={{ background: color }} />
        ))}
        <div className="flex items-center gap-3 ml-2">
          <span className="text-[9px] font-mono text-zinc-600">Медленно</span>
          <span className="text-[9px] font-mono text-zinc-600">Торможение</span>
        </div>
      </div>

      {/* ── Track name ────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-4">
        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
          {trackId.toUpperCase()}
        </p>
      </div>

      {/* ── Loss indicator top-right ──────────────────────────────────────── */}
      {worstCorner && (
        <div className="absolute top-3 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[10px] font-mono text-red-400">
            {worstCorner.segment.label} −{(worstCorner.deltaMs / 1000).toFixed(3)}с
          </span>
        </div>
      )}
    </div>
  );
}
