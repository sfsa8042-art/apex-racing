"use client";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { getSmoothedLine, getCircuit, getPointAtFrac, getHeadingAtFrac } from "@/lib/tracks/geometry";
import type { Vec2 } from "@/lib/tracks/geometry";
import { cn } from "@/lib/utils";

// ─── SVG canvas ───────────────────────────────────────────────────────────────
const W = 900, H = 540;
const MARGIN = 44;

function toPx(p: Vec2): [number, number] {
  return [MARGIN + p.x * (W - MARGIN * 2), MARGIN + (1 - p.y) * (H - MARGIN * 2)];
}

function buildD(pts: Vec2[], close = true): string {
  if (!pts.length) return "";
  const c = pts.map(toPx);
  let d = `M${c[0][0].toFixed(2)},${c[0][1].toFixed(2)}`;
  for (let i = 1; i < c.length; i++) d += ` L${c[i][0].toFixed(2)},${c[i][1].toFixed(2)}`;
  return close ? d + "Z" : d;
}

// 5-stop gradient: deep-green → lime → yellow → orange → red
function heatColor(t: number): string {
  const stops: [number, string][] = [
    [0, "#22c55e"], [0.25, "#a3e635"], [0.5, "#facc15"], [0.75, "#f97316"], [1, "#ef4444"]
  ];
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const f = (clamped - t0) / (t1 - t0);
      const h = (s: string) => parseInt(s, 16);
      const r = (a: string, b: string) => Math.round(h(a) + (h(b) - h(a)) * f);
      const p = (s: string, o: number) => s.slice(o, o + 2);
      const rc = c0.slice(1), bc = c1.slice(1);
      return `#${r(p(rc,0),p(bc,0)).toString(16).padStart(2,"0")}${r(p(rc,2),p(bc,2)).toString(16).padStart(2,"0")}${r(p(rc,4),p(bc,4)).toString(16).padStart(2,"0")}`;
    }
  }
  return "#ef4444";
}

// Perpendicular offset for a point on the smoothed line
function offsetPath(pts: Vec2[], delta: number): Vec2[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len * delta, ny = dx / len * delta;
    // Scale delta from normalised to SVG space
    const sx = nx * (W - MARGIN * 2), sy = ny * (H - MARGIN * 2);
    const [px, py] = toPx(p);
    return { x: (px + sx) / W, y: 1 - (py + sy) / H };
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface HeatPoint { lapFrac: number; intensity: number; deltaS: number }

interface TrackRendererProps {
  trackId?: string;
  heatPoints?: HeatPoint[];
  showHeatmap?: boolean;
  highlightFrac?: [number, number] | null;
  activeLapFrac?: number;
  refLapFrac?: number;
  onCornerClick?: (id: string) => void;
  className?: string;
  height?: number;
  compact?: boolean;
  showSectors?: boolean;
}

const SECTOR_COLORS = ["#a3e635", "#facc15", "#f87171"] as const;

// Gaussian smooth over intensity array
function gaussSmooth(arr: number[], sigma = 10): number[] {
  const r = Math.ceil(sigma * 2.5);
  const k: number[] = []; let ks = 0;
  for (let i = -r; i <= r; i++) { const w = Math.exp(-i*i/(2*sigma*sigma)); k.push(w); ks += w; }
  const kn = k.map(w => w/ks);
  return arr.map((_, i) => {
    let v = 0;
    for (let j = -r; j <= r; j++) v += arr[Math.max(0,Math.min(arr.length-1,i+j))] * kn[j+r];
    return v;
  });
}

export function TrackRenderer({
  trackId = "monza", heatPoints, showHeatmap = false, highlightFrac,
  activeLapFrac, refLapFrac, onCornerClick, className, height = 420,
  compact = false, showSectors = true,
}: TrackRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; sub?: string } | null>(null);
  const [animPulse, setAnimPulse] = useState(0);

  const circuit = useMemo(() => getCircuit(trackId), [trackId]);
  const pts     = useMemo(() => getSmoothedLine(trackId, 20, compact) ?? [], [trackId]);

  // Pulse animation for worst-heat dot
  useEffect(() => {
    if (!showHeatmap) return;
    const id = setInterval(() => setAnimPulse(v => (v + 1) % 60), 50);
    return () => clearInterval(id);
  }, [showHeatmap]);

  // Pre-compute offset paths for track borders
  const { outer, inner, trackW } = useMemo(() => {
    if (!circuit || !pts.length) return { outer: [] as Vec2[], inner: [] as Vec2[], trackW: 12 };
    const tw = circuit.trackWidthNorm;
    return {
      outer: offsetPath(pts, tw * 0.55),
      inner: offsetPath(pts, -tw * 0.55),
      trackW: tw * Math.min(W, H) * 0.78,
    };
  }, [circuit, pts]);

  // Sector segments
  const sectorSegs = useMemo(() => {
    if (!circuit || !pts.length || !showSectors) return [];
    const n = pts.length;
    return circuit.sectorMarkers.map((sm, i) => {
      const endFrac = circuit.sectorMarkers[i + 1]?.lapFrac ?? 1;
      const si = Math.round(sm.lapFrac * n), ei = Math.round(endFrac * n);
      return { pts: pts.slice(si, ei + 1), color: SECTOR_COLORS[i] };
    });
  }, [circuit, pts, showSectors]);

  // Heat segments with gaussian smoothing
  const heatSegs = useMemo(() => {
    if (!heatPoints || !pts.length || !showHeatmap) return [];
    const n = pts.length;
    const raw = pts.map((_, i) => {
      const frac = i / (n - 1);
      const hp = heatPoints.reduce((b, h) =>
        Math.abs(h.lapFrac - frac) < Math.abs(b.lapFrac - frac) ? h : b, heatPoints[0]);
      return hp?.intensity ?? 0;
    });
    const smooth = gaussSmooth(raw, 10);
    return pts.slice(0, -1).map((p, i) => {
      const [x1, y1] = toPx(p), [x2, y2] = toPx(pts[i + 1]);
      return { x1, y1, x2, y2, color: heatColor(smooth[i]), intensity: smooth[i] };
    });
  }, [heatPoints, pts, showHeatmap]);

  // Highlight segment
  const highlightD = useMemo(() => {
    if (!highlightFrac || !pts.length) return null;
    const n = pts.length;
    const sl = pts.slice(Math.round(highlightFrac[0]*n), Math.round(highlightFrac[1]*n)+1);
    return buildD(sl, false);
  }, [highlightFrac, pts]);

  // Car positions
  const carPos  = useMemo(() => activeLapFrac != null && pts.length ? toPx(getPointAtFrac(pts, activeLapFrac)) : null, [pts, activeLapFrac]);
  const carHead = useMemo(() => activeLapFrac != null && pts.length ? getHeadingAtFrac(pts, activeLapFrac) : 0, [pts, activeLapFrac]);
  const refPos  = useMemo(() => refLapFrac  != null && pts.length ? toPx(getPointAtFrac(pts, refLapFrac))  : null, [pts, refLapFrac]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!circuit || !pts.length) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width * W;
    const my = (e.clientY - rect.top) / rect.height * H;
    let bi = 0, bd = Infinity;
    pts.forEach((p, i) => { const [px, py] = toPx(p); const d=(px-mx)**2+(py-my)**2; if(d<bd){bd=d;bi=i;} });
    if (bd > 1200) { setTooltip(null); return; }
    const frac = bi / (pts.length - 1);
    const corner = circuit.corners.find(c => Math.abs(c.lapFrac - frac) < 0.04);
    if (showHeatmap && heatSegs[bi]) {
      const hs = heatSegs[bi];
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 12,
        text: corner?.label ?? `${Math.round(frac * (circuit.lengthKm * 1000))}m`,
        sub: `${hs.intensity > 0 ? "−" : "+"}${Math.abs(heatSegs[bi]?.intensity * 2).toFixed(3)}s` });
    } else if (corner) {
      setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 12,
        text: corner.label,
        sub: corner.brakeZone ? "Зона торможения" : corner.type === "fast" ? "Быстрый поворот" : "Средний поворот" });
    } else setTooltip(null);
  }, [circuit, pts, showHeatmap, heatSegs]);

  if (!circuit || !pts.length) return (
    <div className={cn("rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center", className)} style={{height}}>
      <p className="text-xs text-zinc-600 font-mono">Трасса недоступна: {trackId}</p>
    </div>
  );

  const sfPt = pts[0]; const [sfx, sfy] = toPx(sfPt);
  const pulseR = 12 + Math.sin(animPulse * 0.21) * 4;
  const worstIdx = heatSegs.length ? heatSegs.reduce((bi, s, i) => s.intensity > heatSegs[bi].intensity ? i : bi, 0) : -1;
  const worstPt  = worstIdx >= 0 ? (() => { const [x,y] = [heatSegs[worstIdx].x1, heatSegs[worstIdx].y1]; return [x,y] as [number,number]; })() : null;

  return (
    <div className={cn("relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/60", className)}>
      {/* Header */}
      {!compact && (
        <div className="absolute top-3 left-4 z-10 pointer-events-none">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-600">{circuit.countryEmoji} {circuit.country}</p>
          <p className="text-sm font-semibold text-zinc-300 mt-0.5 leading-tight">{circuit.name}</p>
          <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{circuit.lengthKm} km</p>
        </div>
      )}

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full"
        style={{ height }} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}
        role="img" aria-label={`Track layout: ${circuit.name}`}>
        <defs>
          {/* Subtle tarmac gradient */}
          <radialGradient id={`tarmac-${trackId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2e2e32"/>
            <stop offset="100%" stopColor="#1c1c1f"/>
          </radialGradient>
          {/* Glow filters */}
          <filter id="glow-sm" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-md" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="car-glow" x="-80%" y="-80%" width="360%" height="360%">
            <feGaussianBlur stdDeviation="8" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="shadow-drop">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.5"/>
          </filter>
          <clipPath id={`clip-${trackId}`}>
            <path d={buildD(pts, true)}/>
          </clipPath>
        </defs>

        {/* ── LAYER 0: outer shadow ──────────────────────────────────────────── */}
        <path d={buildD(pts)} fill="none"
          stroke="#000" strokeWidth={trackW * 1.9} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5"/>

        {/* ── LAYER 1: track base (tarmac colour) ───────────────────────────── */}
        <path d={buildD(pts)} fill="none"
          stroke={`url(#tarmac-${trackId})`} strokeWidth={trackW} strokeLinecap="round" strokeLinejoin="round"/>

        {/* ── LAYER 2: subtle track texture (grid-lines effect) ─────────────── */}
        <path d={buildD(pts)} fill="none"
          stroke="#ffffff" strokeWidth={trackW * 0.95} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.016"/>

        {/* ── LAYER 3: sector colouring (when no heatmap) ───────────────────── */}
        {!showHeatmap && sectorSegs.map((seg, i) => (
          <path key={i} d={buildD(seg.pts, false)} fill="none"
            stroke={seg.color} strokeWidth={trackW * 0.6}
            strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.65"/>
        ))}

        {/* ── LAYER 4: heatmap segments (gaussian-smoothed) ─────────────────── */}
        {showHeatmap && heatSegs.map((s, i) => (
          <line key={i} x1={s.x1.toFixed(1)} y1={s.y1.toFixed(1)} x2={s.x2.toFixed(1)} y2={s.y2.toFixed(1)}
            stroke={s.color} strokeWidth={trackW * 0.65} strokeLinecap="round" strokeOpacity="0.9"/>
        ))}

        {/* ── LAYER 5: highlight range ──────────────────────────────────────── */}
        {highlightD && <>
          <path d={highlightD} fill="none" stroke="#a3e635" strokeWidth={trackW * 0.85}
            strokeLinecap="round" strokeOpacity="0.28" filter="url(#glow-sm)"/>
          <path d={highlightD} fill="none" stroke="#a3e635" strokeWidth="2.5"
            strokeLinecap="round" filter="url(#glow-sm)"/>
        </>}

        {/* ── LAYER 6: outer track border ───────────────────────────────────── */}
        <path d={buildD(outer)} fill="none" stroke="rgba(255,255,255,0.09)"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

        {/* ── LAYER 7: inner track border ───────────────────────────────────── */}
        <path d={buildD(inner)} fill="none" stroke="rgba(255,255,255,0.09)"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

        {/* ── LAYER 8: centre racing line (subtle dashes) ───────────────────── */}
        <path d={buildD(pts, true)} fill="none" stroke="rgba(255,255,255,0.055)"
          strokeWidth="1" strokeDasharray="10,12" strokeLinecap="round"/>

        {/* ── LAYER 9: corner kerb stripes ──────────────────────────────────── */}
        {circuit.corners.map(corner => {
          const n = pts.length;
          const idx = Math.min(n-1, Math.round(corner.lapFrac * n));
          const [cx, cy] = toPx(pts[idx]);
          const color = corner.brakeZone ? "#f87171" : corner.type === "fast" ? "#60a5fa" : "#d4d4d8";
          const isHov = hovered === corner.id;
          return (
            <g key={corner.id} style={{cursor: onCornerClick ? "pointer" : "default"}}
              onMouseEnter={() => setHovered(corner.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onCornerClick?.(corner.id)}>
              {/* Larger invisible hit area */}
              <circle cx={cx} cy={cy} r="18" fill="transparent"/>
              {/* Outer ring */}
              <circle cx={cx} cy={cy} r={isHov ? 11 : 7}
                fill="rgba(9,9,11,0.85)" stroke={color} strokeWidth={isHov ? 2 : 1.5}
                filter={isHov ? "url(#glow-sm)" : undefined}
                style={{transition:"r 0.15s,stroke-width 0.15s"}}/>
              {/* Inner dot */}
              <circle cx={cx} cy={cy} r={isHov ? 4 : 2.5} fill={color}/>
              {/* Label */}
              <text x={cx} y={cy - 13} textAnchor="middle" fontSize={isHov ? 10 : 8.5}
                fontWeight="700" fill={isHov ? color : "rgba(255,255,255,0.45)"} fontFamily="monospace"
                style={{transition:"font-size 0.1s"}}>
                {corner.label}
              </text>
            </g>
          );
        })}

        {/* ── LAYER 10: sector markers ──────────────────────────────────────── */}
        {showSectors && circuit.sectorMarkers.map((sm, i) => {
          const n = pts.length;
          const idx = Math.min(n-1, Math.round(sm.lapFrac * n));
          const [sx, sy] = toPx(pts[idx]);
          return (
            <g key={i}>
              <rect x={sx-15} y={sy-11} width={30} height={17} rx={5}
                fill="rgba(9,9,11,0.88)" stroke={SECTOR_COLORS[i]} strokeWidth="0.8" strokeOpacity="0.7"/>
              <text x={sx} y={sy+2.5} textAnchor="middle" fontSize="9.5" fontWeight="800"
                fill={SECTOR_COLORS[i]} fontFamily="monospace">S{i+1}</text>
            </g>
          );
        })}

        {/* ── LAYER 11: S/F line ────────────────────────────────────────────── */}
        {(() => {
          // Perpendicular line across the track at S/F
          const [x, y] = [sfx, sfy];
          const head = getHeadingAtFrac(pts, 0);
          const px = -Math.sin(head) * trackW * 0.65, py = Math.cos(head) * trackW * 0.65;
          return (
            <g>
              <line x1={x-px} y1={y-py} x2={x+px} y2={y+py} stroke="#fff" strokeWidth="3.5" strokeOpacity="0.7"/>
              <text x={x} y={y - trackW * 0.65 - 6} textAnchor="middle" fontSize="8"
                fill="rgba(255,255,255,0.45)" fontFamily="monospace" fontWeight="600">S/F</text>
            </g>
          );
        })()}

        {/* ── LAYER 12: worst heat dot (pulsing) ───────────────────────────── */}
        {showHeatmap && worstPt && (
          <g>
            <circle cx={worstPt[0]} cy={worstPt[1]} r={pulseR}
              fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.35)" strokeWidth="1.2"/>
            <circle cx={worstPt[0]} cy={worstPt[1]} r="5"
              fill="#ef4444" filter="url(#glow-sm)"/>
          </g>
        )}

        {/* ── LAYER 13: ghost/ref car ────────────────────────────────────────── */}
        {refPos && (() => {
          const [rx, ry] = refPos;
          return (
            <g>
              <circle cx={rx} cy={ry} r="9" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
              <circle cx={rx} cy={ry} r="3.5" fill="rgba(255,255,255,0.7)"/>
            </g>
          );
        })()}

        {/* ── LAYER 14: user car ────────────────────────────────────────────── */}
        {carPos && (() => {
          const [cx, cy] = carPos;
          const cos = Math.cos(carHead), sin = Math.sin(carHead);
          const SIZE = 9;
          // Tapered car shape
          const pts2 = [
            [cx + cos*SIZE*2 - sin*0, cy + sin*SIZE*2 + cos*0],
            [cx + cos*SIZE*0.5 + sin*SIZE*0.9, cy + sin*SIZE*0.5 - cos*SIZE*0.9],
            [cx - cos*SIZE*1.2 + sin*SIZE*0.7, cy - sin*SIZE*1.2 - cos*SIZE*0.7],
            [cx - cos*SIZE*1.2 - sin*SIZE*0.7, cy - sin*SIZE*1.2 + cos*SIZE*0.7],
            [cx + cos*SIZE*0.5 - sin*SIZE*0.9, cy + sin*SIZE*0.5 + cos*SIZE*0.9],
          ];
          const poly = pts2.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
          return (
            <g filter="url(#car-glow)">
              <circle cx={cx} cy={cy} r="18" fill="rgba(163,230,53,0.12)"/>
              <polygon points={poly} fill="#a3e635" stroke="#09090b" strokeWidth="1"/>
              <circle cx={cx + cos*SIZE*0.6} cy={cy + sin*SIZE*0.6} r="2.5" fill="rgba(0,0,0,0.5)"/>
            </g>
          );
        })()}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute z-30 pointer-events-none bg-zinc-900/98 border border-zinc-700/80 rounded-xl px-3 py-2 shadow-2xl text-xs font-mono"
          style={{ left: tooltip.x + 14, top: tooltip.y, transform: "translateY(-50%)" }}>
          <p className="text-zinc-100 font-bold">{tooltip.text}</p>
          {tooltip.sub && <p className={cn("mt-0.5", showHeatmap ? "text-red-400" : "text-zinc-500")}>{tooltip.sub}</p>}
        </div>
      )}

      {/* Heatmap legend */}
      {showHeatmap && !compact && (
        <div className="absolute bottom-3 left-4 flex items-center gap-2 text-[10px] font-mono">
          <div className="w-20 h-2 rounded-full" style={{background:"linear-gradient(to right,#22c55e,#a3e635,#facc15,#f97316,#ef4444)"}}/>
          <span className="text-zinc-600">+выигрыш → потеря</span>
        </div>
      )}

      {/* Sector legend */}
      {!showHeatmap && !compact && (
        <div className="absolute bottom-3 right-4 flex gap-2.5">
          {(["S1","S2","S3"] as const).map((s,i) => (
            <div key={s} className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
              <div className="w-3 h-1.5 rounded" style={{background: SECTOR_COLORS[i]}}/>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
