"use client";
/**
 * LiveTrackMap — Revolutionary track visualization component.
 *
 * Features:
 * • Player trajectory (synthesized from steering angle + lap distance)
 * • Reference / optimal trajectory (from reference lap)
 * • Speed-colored track surface
 * • Animated car marker that tracks cursor position
 * • Dynamic zoom: tight on corners, wide on straights
 * • Corner labels, sector lines, braking zone markers
 */

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { getSmoothedLine, getCircuit } from "@/lib/tracks/geometry";
import { cn } from "@/lib/utils";
import type { Vec2 } from "@/lib/tracks/geometry";
import type { TelemetryRow } from "@/types/telemetry";

// ── SVG canvas ────────────────────────────────────────────────────────────────
const VW = 900, VH = 520;

function toSVG(v: Vec2): [number, number] {
  return [v.x * VW, (1 - v.y) * VH];
}

// ── Speed colour ──────────────────────────────────────────────────────────────
function speedColour(speed: number, maxSpeed: number): string {
  const t = Math.max(0, Math.min(1, speed / Math.max(maxSpeed, 1)));
  const stops: [number, [number, number, number]][] = [
    [0.00, [30,  60, 200]],   // very slow — deep blue
    [0.30, [20, 160, 240]],   // slow — cyan
    [0.55, [80, 220, 90]],    // medium — lime
    [0.70, [220, 220, 20]],   // fast — yellow
    [0.85, [255, 120,  0]],   // braking — orange
    [1.00, [255,  30, 30]],   // hard brake — red
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return `rgb(${Math.round(c0[0]+(c1[0]-c0[0])*f)},${Math.round(c0[1]+(c1[1]-c0[1])*f)},${Math.round(c0[2]+(c1[2]-c0[2])*f)})`;
    }
  }
  return "rgb(255,30,30)";
}

// ── Trajectory synthesis ──────────────────────────────────────────────────────
/** Synthesise approximate car track position from lapDist + steering angle */
function synthesiseTraj(
  rows:     TelemetryRow[],
  smoothed: Vec2[],
  totalDist: number,
): Vec2[] {
  if (!smoothed.length || !rows.length) return [];
  const n = smoothed.length;

  return rows.filter((_, i) => i % 4 === 0).map(r => {   // every 4th row → ~6Hz
    const frac   = (r.lapDist ?? 0) / Math.max(totalDist, 1);
    const idx    = Math.min(Math.round(frac * n), n - 1);
    const pt     = smoothed[idx];
    const next   = smoothed[(idx + 2) % n];

    // Track tangent direction
    const dx = next.x - pt.x, dy = next.y - pt.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 0.001;

    // Normal to track (points left of travel direction)
    const nx = -dy / len, ny = dx / len;

    // Lateral offset from steering angle: 90° steer ≈ max track width
    const maxOffset = 0.028;                               // ~3% of normalised space
    const steer = (r.steerAngle ?? 0) / 180;              // normalise to [-1, +1]
    const offset = -steer * maxOffset;                     // negative because steer is inverted

    return { x: pt.x + nx * offset, y: pt.y + ny * offset };
  });
}

// ── Smooth path string ────────────────────────────────────────────────────────
function smoothPathFromVec2(pts: Vec2[], closed = false): string {
  if (pts.length < 2) return "";
  const s = pts.filter((_, i) => i % 2 === 0); // thin out
  let d = `M ${(s[0].x * VW).toFixed(1)} ${((1 - s[0].y) * VH).toFixed(1)}`;
  for (let i = 1; i < s.length; i++) {
    const [x1, y1] = toSVG(s[i]);
    const [px, py] = toSVG(s[i - 1]);
    const cpx = (px + x1) / 2, cpy = (py + y1) / 2;
    d += ` Q ${px.toFixed(1)} ${py.toFixed(1)}, ${cpx.toFixed(1)} ${cpy.toFixed(1)}`;
  }
  if (closed) {
    const [x0, y0] = toSVG(s[0]);
    d += ` Z`;
  }
  return d;
}

// ── Lerp helper ───────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ── Component ─────────────────────────────────────────────────────────────────
interface LiveTrackMapProps {
  trackId:         string;
  userRows:        TelemetryRow[];
  refRows?:        TelemetryRow[];
  cursorProgress?: number | null;
  className?:      string;
  height?:         number;
}

export function LiveTrackMap({
  trackId, userRows, refRows, cursorProgress, className, height = 480,
}: LiveTrackMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Track data ──────────────────────────────────────────────────────────────
  const smoothed = useMemo(() => getSmoothedLine(trackId, 20) ?? [], [trackId]);
  const circuit  = useMemo(() => getCircuit(trackId), [trackId]);
  const totalDist = userRows.at(-1)?.lapDist ?? 0;
  const maxSpeed  = useMemo(() => Math.max(...userRows.map(r => r.speed), 100), [userRows]);

  // ── Synthesised trajectories ────────────────────────────────────────────────
  const userTraj = useMemo(() => synthesiseTraj(userRows, smoothed, totalDist), [userRows, smoothed, totalDist]);
  const refTraj  = useMemo(() => refRows ? synthesiseTraj(refRows, smoothed, totalDist) : [], [refRows, smoothed, totalDist]);

  // ── Speed-coloured segments on user trajectory ──────────────────────────────
  const trajSegments = useMemo(() => {
    if (!userTraj.length) return [];
    return userTraj.slice(0, -1).map((pt, i) => {
      const rowIdx = Math.min(i * 4, userRows.length - 1);
      const spd = userRows[rowIdx]?.speed ?? 0;
      const [x1, y1] = toSVG(pt);
      const [x2, y2] = toSVG(userTraj[i + 1]);
      return { x1, y1, x2, y2, color: speedColour(spd, maxSpeed) };
    });
  }, [userTraj, userRows, maxSpeed]);

  // ── Cursor / car position ───────────────────────────────────────────────────
  const cursorData = useMemo(() => {
    if (cursorProgress == null || !smoothed.length) return null;
    const n = smoothed.length;
    const idx = Math.min(Math.round(cursorProgress * n), n - 1);
    const pt  = smoothed[idx];

    // Synthesise car position with steering at this point
    const rowIdx    = Math.min(Math.round(cursorProgress * userRows.length), userRows.length - 1);
    const row       = userRows[rowIdx];
    const nextPt    = smoothed[(idx + 2) % n];
    const dx = nextPt.x - pt.x, dy = nextPt.y - pt.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 0.001;
    const nx = -dy / len, ny = dx / len;
    const steer  = (row?.steerAngle ?? 0) / 180;
    const offset = -steer * 0.028;
    const carPt  = { x: pt.x + nx * offset, y: pt.y + ny * offset };

    const angle = Math.atan2(-(dy / len), dx / len) * 180 / Math.PI;
    const speed = row?.speed ?? 0;
    const throttle = row?.throttle ?? 0;
    const brake    = row?.brake ?? 0;

    return { pt: carPt, idx, angle, speed, throttle, brake };
  }, [cursorProgress, smoothed, userRows]);

  // ── Dynamic zoom ─────────────────────────────────────────────────────────────
  // Lerped viewBox: tight on corners, full view on straights
  const [vb, setVb] = useState({ x: 0, y: 0, w: VW, h: VH });
  const targetVb = useRef({ x: 0, y: 0, w: VW, h: VH });
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    if (!cursorData || !smoothed.length) {
      targetVb.current = { x: 0, y: 0, w: VW, h: VH };
      return;
    }

    const [cx, cy] = toSVG(cursorData.pt);
    const rowIdx   = Math.min(Math.round((cursorProgress ?? 0) * userRows.length), userRows.length - 1);
    const spd      = userRows[rowIdx]?.speed ?? 200;
    const brake    = userRows[rowIdx]?.brake ?? 0;

    // Zoom: tighter when braking (entering corner) or going slow (mid-corner)
    const isCorner = spd < maxSpeed * 0.7 || brake > 20;
    const zF       = isCorner ? 3.2 : 1.2;

    const tw = VW / zF;
    const th = VH / zF;
    targetVb.current = {
      x: Math.max(0, Math.min(VW - tw, cx - tw / 2)),
      y: Math.max(0, Math.min(VH - th, cy - th / 2)),
      w: tw, h: th,
    };
  }, [cursorData, smoothed, cursorProgress, userRows, maxSpeed]);

  useEffect(() => {
    const animate = () => {
      setVb(prev => {
        const t = 0.06; // lerp speed
        const next = {
          x: lerp(prev.x, targetVb.current.x, t),
          y: lerp(prev.y, targetVb.current.y, t),
          w: lerp(prev.w, targetVb.current.w, t),
          h: lerp(prev.h, targetVb.current.h, t),
        };
        // Stop if converged
        if (Math.abs(next.x - targetVb.current.x) < 0.3 &&
            Math.abs(next.w - targetVb.current.w) < 0.3) return targetVb.current;
        return next;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Trail ────────────────────────────────────────────────────────────────────
  const [trail, setTrail] = useState<Vec2[]>([]);
  useEffect(() => {
    if (!cursorData) { setTrail([]); return; }
    setTrail(prev => {
      const next = [...prev, cursorData.pt].slice(-12);
      return next;
    });
  }, [cursorData]);

  if (!smoothed.length) return null;

  const viewBox = `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-[#0a0a0c]", className)}
      style={{ height }}>

      <svg ref={svgRef} viewBox={viewBox} className="w-full h-full"
        style={{ transition: "none" }}>
        <defs>
          {/* Glow filters */}
          <filter id="ltm-glow-car" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id="ltm-glow-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          {/* Track asphalt gradient */}
          <linearGradient id="ltm-asphalt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a1e"/>
            <stop offset="100%" stopColor="#141418"/>
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={VW} height={VH} fill="#080810"/>

        {/* Subtle grid */}
        {Array.from({length: 9}, (_, i) => (
          <line key={`g${i}`} x1={(i/8)*VW} y1={0} x2={(i/8)*VW} y2={VH}
            stroke="#0f0f18" strokeWidth="1"/>
        ))}

        {/* ── Track surface (wide asphalt band) ──────────────────────────── */}
        <path d={smoothPathFromVec2(smoothed, true)}
          fill="none" stroke="#1c1c22" strokeWidth="52"
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* Kerb outer edge */}
        <path d={smoothPathFromVec2(smoothed, true)}
          fill="none" stroke="#252530" strokeWidth="54"
          strokeLinejoin="round" strokeLinecap="round" opacity="0.5"/>

        {/* Track surface */}
        <path d={smoothPathFromVec2(smoothed, true)}
          fill="none" stroke="url(#ltm-asphalt)" strokeWidth="50"
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* Centre line (faint) */}
        <path d={smoothPathFromVec2(smoothed, true)}
          fill="none" stroke="#ffffff" strokeWidth="0.4"
          strokeLinejoin="round" strokeLinecap="round" strokeDasharray="8,16" opacity="0.06"/>

        {/* ── Reference / optimal trajectory ─────────────────────────────── */}
        {refTraj.length > 0 && (
          <path d={smoothPathFromVec2(refTraj, false)}
            fill="none" stroke="#60a5fa" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray="6,5" opacity="0.55"/>
        )}

        {/* ── User trajectory — speed coloured ───────────────────────────── */}
        {trajSegments.map((seg, i) => (
          <line key={i} x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
            stroke={seg.color} strokeWidth="3.5"
            strokeLinecap="round" opacity="0.9"/>
        ))}

        {/* ── Sector markers ──────────────────────────────────────────────── */}
        {circuit?.sectorMarkers?.map(sm => {
          const idx = Math.round(sm.lapFrac * smoothed.length) % smoothed.length;
          const pt  = smoothed[idx];
          if (!pt) return null;
          const [sx, sy] = toSVG(pt);
          const next = smoothed[(idx + 1) % smoothed.length];
          const [nx_, ny_] = toSVG(next);
          const ang = Math.atan2(ny_ - sy, nx_ - sx);
          const perp = ang + Math.PI / 2;
          return (
            <g key={sm.sectorIdx}>
              <line
                x1={sx + Math.cos(perp) * 28} y1={sy + Math.sin(perp) * 28}
                x2={sx - Math.cos(perp) * 28} y2={sy - Math.sin(perp) * 28}
                stroke="#facc15" strokeWidth="2" opacity="0.7"/>
              <text x={sx + Math.cos(perp) * 36} y={sy + Math.sin(perp) * 36 + 4}
                textAnchor="middle" fill="#facc15" fontSize="9"
                fontFamily="'JetBrains Mono', monospace" fontWeight="700" opacity="0.8">
                S{sm.sectorIdx + 1}
              </text>
            </g>
          );
        })}

        {/* ── Corner labels ────────────────────────────────────────────────── */}
        {circuit?.corners?.map(corner => {
          const idx = Math.round(corner.lapFrac * smoothed.length) % smoothed.length;
          const pt  = smoothed[idx];
          if (!pt) return null;
          const [lx, ly] = toSVG(pt);
          const isHighlighted = cursorData && Math.abs(cursorProgress! - corner.lapFrac) < 0.06;
          return (
            <g key={corner.id}>
              <circle cx={lx} cy={ly} r={isHighlighted ? 12 : 9}
                fill={corner.brakeZone ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.05)"}
                stroke={corner.brakeZone ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.15)"}
                strokeWidth="1" filter={isHighlighted ? "url(#ltm-glow-soft)" : undefined}/>
              <text x={lx} y={ly + 3.5} textAnchor="middle"
                fill={isHighlighted ? "#fff" : "#a1a1aa"}
                fontSize={isHighlighted ? "8" : "7"}
                fontFamily="'JetBrains Mono', monospace" fontWeight="700">
                {corner.label}
              </text>
            </g>
          );
        })}

        {/* ── Start/finish line ────────────────────────────────────────────── */}
        {smoothed.length > 2 && (() => {
          const p0 = smoothed[0], p1 = smoothed[1];
          const [x0, y0] = toSVG(p0);
          const [x1, y1] = toSVG(p1);
          const dx = x1 - x0, dy = y1 - y0;
          const len = Math.sqrt(dx*dx + dy*dy);
          const px = -dy/len*30, py = dx/len*30;
          return (
            <g>
              <line x1={x0-px} y1={y0-py} x2={x0+px} y2={y0+py}
                stroke="#fff" strokeWidth="3" strokeDasharray="5,4" opacity="0.6"/>
              <text x={x0+px+8} y={y0+py+3} fill="#fff" fontSize="8"
                fontFamily="'JetBrains Mono', monospace" fontWeight="700" opacity="0.5">SF</text>
            </g>
          );
        })()}

        {/* ── Car trail ────────────────────────────────────────────────────── */}
        {cursorData && trail.slice(0, -1).map((pt, i) => {
          const [tx, ty] = toSVG(pt);
          const opacity = (i + 1) / trail.length * 0.4;
          const r = 1.5 + i * 0.5;
          return <circle key={i} cx={tx} cy={ty} r={r} fill="#a3e635" opacity={opacity}/>;
        })}

        {/* ── Car marker ──────────────────────────────────────────────────── */}
        {cursorData && (() => {
          const [cx, cy] = toSVG(cursorData.pt);
          const { angle, speed, throttle, brake } = cursorData;
          const carColor = brake > 30 ? "#f87171" : throttle > 60 ? "#a3e635" : "#facc15";

          // Dynamic badge position (avoid going out of current viewport)
          const badgeRight = cx < vb.x + vb.w * 0.65;
          const bx = badgeRight ? cx + 24 : cx - 82;
          const by = cy > vb.y + vb.h * 0.8 ? cy - 30 : cy;

          return (
            <g>
              {/* Outer glow ring */}
              <circle cx={cx} cy={cy} r={26}
                fill={`${carColor}10`} stroke={`${carColor}30`} strokeWidth="1.5"/>
              {/* Mid ring */}
              <circle cx={cx} cy={cy} r={17}
                fill={`${carColor}18`} stroke={`${carColor}55`} strokeWidth="1.5"
                filter="url(#ltm-glow-soft)"/>
              {/* Direction arrow body */}
              <g transform={`rotate(${angle}, ${cx}, ${cy})`}>
                <polygon
                  points={`${cx},${cy - 14} ${cx - 7},${cy + 8} ${cx},${cy + 4} ${cx + 7},${cy + 8}`}
                  fill={carColor} opacity="0.9"/>
              </g>
              {/* Core dot */}
              <circle cx={cx} cy={cy} r={7}
                fill={carColor} stroke="#09090b" strokeWidth="2.5"
                filter="url(#ltm-glow-car)"/>

              {/* Speed / status badge */}
              <rect x={bx} y={by - 12} width={58} height={26} rx="5"
                fill="rgba(9,9,11,0.92)" stroke={`${carColor}60`} strokeWidth="0.8"/>
              <text x={bx + 29} y={by - 1} textAnchor="middle"
                fill={carColor} fontSize="11" fontFamily="'JetBrains Mono', monospace"
                fontWeight="800">{Math.round(speed)}</text>
              <text x={bx + 29} y={by + 10} textAnchor="middle"
                fill="#52525b" fontSize="7.5" fontFamily="'JetBrains Mono', monospace">km/h</text>

              {/* Throttle / brake mini bars */}
              <rect x={bx + 2} y={by + 15} width={24} height={3} rx="1.5"
                fill="rgba(74,222,128,0.2)"/>
              <rect x={bx + 2} y={by + 15} width={24 * throttle / 100} height={3} rx="1.5"
                fill="#4ade80"/>
              <rect x={bx + 32} y={by + 15} width={24} height={3} rx="1.5"
                fill="rgba(248,113,113,0.2)"/>
              <rect x={bx + 32} y={by + 15} width={24 * brake / 100} height={3} rx="1.5"
                fill="#f87171"/>
            </g>
          );
        })()}
      </svg>

      {/* ── Speed legend ─────────────────────────────────────────────────────── */}
      <div className="absolute bottom-2 left-3 flex items-center gap-0.5 opacity-60">
        {["#1e3cc8","#14a0dc","#50dc5a","#dcdc14","#ff7800","#ff1e1e"].map((c, i) => (
          <div key={i} style={{ background: c, width: 18, height: 5 }}/>
        ))}
        <span className="text-[8px] font-mono text-zinc-600 ml-1">Медленно → Торможение</span>
      </div>

      {/* ── Track name ───────────────────────────────────────────────────────── */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-lime-400"/>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
          {circuit?.name ?? trackId.toUpperCase()}
        </span>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-2 right-3 flex flex-col gap-1 items-end">
        <div className="flex items-center gap-1.5">
          <svg width="20" height="3">
            <line x1="0" y1="1.5" x2="20" y2="1.5" stroke="#a3e635" strokeWidth="2.5"/>
          </svg>
          <span className="text-[8px] font-mono text-zinc-500">Ваша траектория</span>
        </div>
        {refTraj.length > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="20" height="3">
              <line x1="0" y1="1.5" x2="20" y2="1.5" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4,3"/>
            </svg>
            <span className="text-[8px] font-mono text-zinc-500">Оптимальная</span>
          </div>
        )}
      </div>
    </div>
  );
}
