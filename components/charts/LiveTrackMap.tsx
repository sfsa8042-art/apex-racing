"use client";
/**
 * LiveTrackMap v2 — Pixel-perfect live track visualization.
 *
 * • Player trajectory (synthesized from steer + lapDist)
 * • Optimal / reference trajectory
 * • Speed-coloured track surface
 * • Animated car marker with direction, speed, throttle/brake
 * • Dynamic zoom: tight on corners (3×), full on straights (1×)
 * • Smooth lerped viewBox animation that halts when converged
 * • Kerb marks, corner labels, sector lines, grass areas
 */

import {
  useMemo, useEffect, useRef, useState, useCallback,
} from "react";
import { getSmoothedLine, getCircuit } from "@/lib/tracks/geometry";
import { cn } from "@/lib/utils";
import type { Vec2 } from "@/lib/tracks/geometry";
import type { TelemetryRow } from "@/types/telemetry";

// ─── Canvas ────────────────────────────────────────────────────────────────────
const W = 900, H = 520;
const PAD = 40;                        // inner margin so track doesn't touch edge
function sv(v: Vec2): [number, number] { return [v.x * W, (1 - v.y) * H]; }

// ─── Speed → colour ────────────────────────────────────────────────────────────
function spdClr(norm: number): string {
  const t = Math.max(0, Math.min(1, norm));
  const STOPS: [number, [number,number,number]][] = [
    [0.00, [20,  50, 200]],
    [0.28, [10, 150, 240]],
    [0.52, [60, 210, 80]],
    [0.68, [220,220, 20]],
    [0.84, [255,110,  0]],
    [1.00, [255, 25, 25]],
  ];
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0,c0] = STOPS[i], [t1,c1] = STOPS[i+1];
    if (t >= t0 && t <= t1) {
      const f = (t-t0)/(t1-t0);
      return `rgb(${c0.map((v,j)=>Math.round(v+(c1[j]-v)*f)).join(",")})`;
    }
  }
  return "#ff1919";
}

// ─── Path from Vec2 array ──────────────────────────────────────────────────────
function pathFrom(pts: Vec2[], skip = 1, close = false): string {
  if (pts.length < 2) return "";
  const s = pts.filter((_,i) => i % skip === 0);
  let d = `M ${(s[0].x*W).toFixed(1)} ${((1-s[0].y)*H).toFixed(1)}`;
  for (let i = 1; i < s.length; i++) {
    const [px,py] = sv(s[i-1]);
    const [cx2,cy2] = sv(s[i]);
    const mx = (px+cx2)/2, my = (py+cy2)/2;
    d += ` Q ${px.toFixed(1)} ${py.toFixed(1)}, ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  if (close) d += " Z";
  return d;
}

// ─── Synthesise trajectory ────────────────────────────────────────────────────
function synthTraj(
  rows:      TelemetryRow[],
  track:     Vec2[],
  totalDist: number,
  scale = 1,
): Vec2[] {
  if (!track.length || !rows.length) return [];
  const n = track.length;
  return rows
    .filter((_, i) => i % 5 === 0)            // thin out — ~5Hz
    .map(r => {
      const frac = totalDist > 0 ? (r.lapDist ?? 0) / totalDist : 0;
      const idx  = Math.min(Math.round(frac * n), n - 1);
      const pt   = track[idx];
      const nxt  = track[(idx + 2) % n];

      const dx = nxt.x - pt.x, dy = nxt.y - pt.y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1e-6;
      // Normal: left of direction of travel
      const nx = -dy/len, ny = dx/len;

      // Steering: + = right turn → car drifts to left side of track
      const steer  = Math.max(-1, Math.min(1, (r.steerAngle ?? 0) / 200));
      const offset = -steer * 0.025 * scale;

      return { x: pt.x + nx * offset, y: pt.y + ny * offset };
    });
}

// ─── Linear interpolation ─────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

interface VB { x:number; y:number; w:number; h:number }
function vbEq(a: VB, b: VB, eps = 0.5) {
  return Math.abs(a.x-b.x)<eps && Math.abs(a.y-b.y)<eps &&
         Math.abs(a.w-b.w)<eps && Math.abs(a.h-b.h)<eps;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface LiveTrackMapProps {
  trackId:         string;
  userRows:        TelemetryRow[];
  refRows?:        TelemetryRow[];
  cursorProgress?: number | null;
  className?:      string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LiveTrackMap({
  trackId, userRows, refRows, cursorProgress, className,
}: LiveTrackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Track data ──────────────────────────────────────────────────────────────
  const track   = useMemo(() => getSmoothedLine(trackId, 22) ?? [], [trackId]);
  const circuit = useMemo(() => getCircuit(trackId), [trackId]);
  const n = track.length;

  const totalDist = userRows.at(-1)?.lapDist ?? 0;
  const maxSpd    = useMemo(() =>
    userRows.reduce((m,r) => Math.max(m, r.speed), 100), [userRows]);

  // ── Trajectories ────────────────────────────────────────────────────────────
  const userTraj = useMemo(() =>
    synthTraj(userRows, track, totalDist, 1), [userRows, track, totalDist]);
  const refTraj  = useMemo(() =>
    refRows ? synthTraj(refRows, track, totalDist, 0.85) : [], [refRows, track, totalDist]);

  // ── Speed-coloured segments on user traj ────────────────────────────────────
  const trajSegs = useMemo(() => {
    if (!userTraj.length) return [];
    return userTraj.slice(0,-1).map((pt, i) => {
      const row = userRows[Math.min(i*5, userRows.length-1)];
      const [x1,y1] = sv(pt);
      const [x2,y2] = sv(userTraj[i+1]);
      return { x1,y1,x2,y2, c: spdClr(row.speed / maxSpd) };
    });
  }, [userTraj, userRows, maxSpd]);

  // ── Cursor data ──────────────────────────────────────────────────────────────
  const cursorData = useMemo(() => {
    if (cursorProgress == null || !n) return null;
    const idx = Math.min(Math.round(cursorProgress * n), n-1);
    const pt  = track[idx];
    const nxt = track[(idx+2) % n];
    const dx  = nxt.x-pt.x, dy = nxt.y-pt.y;
    const len = Math.sqrt(dx*dx+dy*dy)||1e-6;
    const nx  = -dy/len, ny = dx/len;

    const ri    = Math.min(Math.round(cursorProgress * userRows.length), userRows.length-1);
    const row   = userRows[ri];
    const steer = Math.max(-1, Math.min(1, (row?.steerAngle ?? 0) / 200));
    const off   = -steer * 0.025;
    const carPt = { x: pt.x+nx*off, y: pt.y+ny*off };
    const angle = Math.atan2(-(dy/len), dx/len) * 180/Math.PI;

    return {
      pt: carPt, trackPt: pt, idx, angle,
      speed: row?.speed ?? 0,
      throttle: row?.throttle ?? 0,
      brake: row?.brake ?? 0,
      steer: row?.steerAngle ?? 0,
    };
  }, [cursorProgress, track, userRows, n]);

  // ── Dynamic zoom ─────────────────────────────────────────────────────────────
  const fullVb: VB = useMemo(() => {
    // Compute tight bounding box around track
    if (!track.length) return { x:0, y:0, w:W, h:H };
    const xs = track.map(p => p.x*W), ys = track.map(p => (1-p.y)*H);
    const minX = Math.min(...xs)-PAD, maxX = Math.max(...xs)+PAD;
    const minY = Math.min(...ys)-PAD, maxY = Math.max(...ys)+PAD;
    return { x: minX, y: minY, w: maxX-minX, h: maxY-minY };
  }, [track]);

  const [vb, setVb]   = useState<VB>(fullVb);
  const targetVb      = useRef<VB>(fullVb);
  const rafId         = useRef<number>(0);
  const animating     = useRef(false);

  const startAnim = useCallback(() => {
    if (animating.current) return;
    animating.current = true;
    const step = () => {
      setVb(prev => {
        const t = 0.055;
        const next: VB = {
          x: lerp(prev.x, targetVb.current.x, t),
          y: lerp(prev.y, targetVb.current.y, t),
          w: lerp(prev.w, targetVb.current.w, t),
          h: lerp(prev.h, targetVb.current.h, t),
        };
        if (vbEq(next, targetVb.current)) {
          animating.current = false;
          return targetVb.current;
        }
        rafId.current = requestAnimationFrame(step);
        return next;
      });
    };
    rafId.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!cursorData || !n) {
      targetVb.current = fullVb;
      startAnim();
      return;
    }

    const [cx,cy] = sv(cursorData.pt);
    const ri   = Math.min(Math.round((cursorProgress ?? 0) * userRows.length), userRows.length-1);
    const spd  = userRows[ri]?.speed ?? 200;
    const brk  = userRows[ri]?.brake ?? 0;

    // Zoom based on how "cornery" the current position is
    const cornerFactor = Math.max(0, Math.min(1,
      (1 - spd/maxSpd) * 0.7 + (brk/100) * 0.3
    ));
    const zoom = 1.0 + cornerFactor * 2.4;   // 1.0× → 3.4×

    const tw = fullVb.w / zoom;
    const th = fullVb.h / zoom;

    targetVb.current = {
      x: Math.max(fullVb.x, Math.min(fullVb.x+fullVb.w-tw, cx - tw/2)),
      y: Math.max(fullVb.y, Math.min(fullVb.y+fullVb.h-th, cy - th/2)),
      w: tw, h: th,
    };
    startAnim();
  }, [cursorData, fullVb, cursorProgress, userRows, maxSpd, n, startAnim]);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  // ── Trail ────────────────────────────────────────────────────────────────────
  const [trail, setTrail] = useState<Vec2[]>([]);
  useEffect(() => {
    if (!cursorData) { setTrail([]); return; }
    setTrail(p => [...p, cursorData.pt].slice(-14));
  }, [cursorData]);

  // ── Zoom-relative font / stroke sizes ────────────────────────────────────────
  const zoomFac = fullVb.w / vb.w;          // > 1 when zoomed in
  const labelSz  = Math.round(10 / zoomFac * 10) / 10;
  const trackW   = 50 * zoomFac;

  const viewBox = `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`;

  if (!track.length) return null;

  return (
    <div ref={containerRef}
      className={cn("relative overflow-hidden bg-[#07070e] select-none", className)}>
      <svg viewBox={viewBox} className="w-full h-full" style={{ display:"block" }}>
        <defs>
          <filter id="ltm-car-glow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="10" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="ltm-soft-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="ltm-bg" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#0c0c16"/>
            <stop offset="100%" stopColor="#07070e"/>
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={W} height={H} fill="url(#ltm-bg)"/>

        {/* Subtle dot grid */}
        {[...Array(14)].map((_,i) => [...Array(9)].map((_,j) => (
          <circle key={`g${i}${j}`}
            cx={(i/13)*W} cy={(j/8)*H} r={0.6}
            fill="#1a1a2e" opacity="0.6"/>
        )))}

        {/* ── Grass / runoff outside track ─────────────────────────────── */}
        <path d={pathFrom(track, 1, true)}
          fill="none" stroke="#0d1a0d" strokeWidth={trackW * 2.5}
          strokeLinejoin="round" strokeLinecap="round" opacity="0.5"/>

        {/* ── Track layers ──────────────────────────────────────────────── */}
        {/* Drop shadow */}
        <path d={pathFrom(track, 1, true)} fill="none"
          stroke="rgba(0,0,0,0.8)" strokeWidth={trackW + 10}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* White kerb (outer) */}
        <path d={pathFrom(track, 1, true)} fill="none"
          stroke="#2e2e3a" strokeWidth={trackW + 4}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* Asphalt */}
        <path d={pathFrom(track, 1, true)} fill="none"
          stroke="#1a1a21" strokeWidth={trackW}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* Tyre marks (subtle texture) */}
        <path d={pathFrom(track, 1, true)} fill="none"
          stroke="#141418" strokeWidth={trackW * 0.35}
          strokeLinejoin="round" strokeLinecap="round" opacity="0.5"/>

        {/* Centre dashes */}
        <path d={pathFrom(track, 1, true)} fill="none"
          stroke="#ffffff" strokeWidth={0.8}
          strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={`${Math.max(5, 12/zoomFac)},${Math.max(8, 20/zoomFac)}`}
          opacity="0.05"/>

        {/* ── Sector marks ────────────────────────────────────────────────── */}
        {circuit?.sectorMarkers?.map(sm => {
          const idx = Math.round(sm.lapFrac * n) % n;
          const pt  = track[idx];
          if (!pt) return null;
          const [sx, sy] = sv(pt);
          const nxt = track[(idx+1) % n];
          const [nx2, ny2] = sv(nxt);
          const ang = Math.atan2(ny2-sy, nx2-sx) + Math.PI/2;
          const ext = (trackW/2 + 4) / zoomFac;
          const fs  = Math.max(7, labelSz * 0.9);
          return (
            <g key={`sm${sm.sectorIdx}`}>
              <line
                x1={sx+Math.cos(ang)*ext} y1={sy+Math.sin(ang)*ext}
                x2={sx-Math.cos(ang)*ext} y2={sy-Math.sin(ang)*ext}
                stroke="#facc15" strokeWidth={2/zoomFac} opacity="0.75"/>
              <text x={sx+Math.cos(ang)*(ext+8/zoomFac)}
                    y={sy+Math.sin(ang)*(ext+8/zoomFac)+fs*0.4}
                textAnchor="middle" fill="#facc15" fontSize={fs}
                fontFamily="'JetBrains Mono',monospace" fontWeight="800" opacity="0.9">
                S{sm.sectorIdx+1}
              </text>
            </g>
          );
        })}

        {/* ── Start/finish line ────────────────────────────────────────────── */}
        {track.length > 2 && (() => {
          const [x0,y0] = sv(track[0]);
          const [x1,y1] = sv(track[1]);
          const dx=x1-x0, dy=y1-y0, len=Math.sqrt(dx*dx+dy*dy)||1;
          const ext = (trackW/2+2)/zoomFac;
          const px=-dy/len*ext, py=dx/len*ext;
          const fs = Math.max(7, labelSz * 0.85);
          return (
            <g>
              <line x1={x0-px} y1={y0-py} x2={x0+px} y2={y0+py}
                stroke="#fff" strokeWidth={2.5/zoomFac} opacity="0.55"
                strokeDasharray={`${3/zoomFac},${3/zoomFac}`}/>
              <text x={x0+px+8/zoomFac} y={y0+py+fs*0.4}
                fill="#fff" fontSize={fs} fontFamily="'JetBrains Mono',monospace"
                fontWeight="800" opacity="0.45">SF</text>
            </g>
          );
        })()}

        {/* ── Ref trajectory (optimal line) ────────────────────────────────── */}
        {refTraj.length > 0 && (
          <>
            {/* Glow layer */}
            <path d={pathFrom(refTraj, 1, false)} fill="none"
              stroke="#3b82f6" strokeWidth={4/zoomFac}
              strokeLinejoin="round" strokeLinecap="round" opacity="0.15"/>
            {/* Main line */}
            <path d={pathFrom(refTraj, 1, false)} fill="none"
              stroke="#60a5fa" strokeWidth={2.2/zoomFac}
              strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={`${6/zoomFac},${4/zoomFac}`} opacity="0.6"/>
          </>
        )}

        {/* ── User trajectory — speed-coloured ─────────────────────────────── */}
        {trajSegs.length > 0 && (
          <>
            {/* Shadow/glow behind */}
            {trajSegs.map((s,i) => (
              <line key={`gs${i}`}
                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={s.c} strokeWidth={8/zoomFac}
                strokeLinecap="round" opacity="0.12"/>
            ))}
            {/* Main coloured line */}
            {trajSegs.map((s,i) => (
              <line key={`ts${i}`}
                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={s.c} strokeWidth={3.5/zoomFac}
                strokeLinecap="round" opacity="0.95"/>
            ))}
          </>
        )}

        {/* ── Corner labels ────────────────────────────────────────────────── */}
        {circuit?.corners?.map(corner => {
          const idx = Math.round(corner.lapFrac * n) % n;
          const pt  = track[idx];
          if (!pt) return null;
          const [lx,ly] = sv(pt);
          const visible = (
            lx >= vb.x - 20 && lx <= vb.x + vb.w + 20 &&
            ly >= vb.y - 20 && ly <= vb.y + vb.h + 20
          );
          if (!visible) return null;
          const isActive = cursorData &&
            Math.abs((cursorProgress ?? 0) - corner.lapFrac) < 0.05;
          const r  = (isActive ? 13 : 9) / zoomFac;
          const fs = Math.max(6, (isActive ? 9 : 7.5) / zoomFac);
          return (
            <g key={corner.id}
              filter={isActive ? "url(#ltm-soft-glow)" : undefined}>
              <circle cx={lx} cy={ly} r={r}
                fill={corner.brakeZone
                  ? `rgba(248,113,113,${isActive?0.22:0.10})`
                  : `rgba(255,255,255,${isActive?0.12:0.05})`}
                stroke={corner.brakeZone
                  ? `rgba(248,113,113,${isActive?0.7:0.35})`
                  : `rgba(255,255,255,${isActive?0.4:0.15})`}
                strokeWidth={1.2/zoomFac}/>
              <text x={lx} y={ly + fs*0.38} textAnchor="middle"
                fill={isActive ? "#fff" : "#a1a1aa"} fontSize={fs}
                fontFamily="'JetBrains Mono',monospace" fontWeight="800">
                {corner.label}
              </text>
            </g>
          );
        })}

        {/* ── Car trail ────────────────────────────────────────────────────── */}
        {cursorData && trail.slice(0,-1).map((pt, i) => {
          const [tx,ty] = sv(pt);
          const alpha = ((i+1)/trail.length) * 0.45;
          const r = (1.5 + i * 0.6) / zoomFac;
          return <circle key={`tr${i}`} cx={tx} cy={ty} r={r}
            fill="#a3e635" opacity={alpha}/>;
        })}

        {/* ── Car marker ───────────────────────────────────────────────────── */}
        {cursorData && (() => {
          const [cx, cy] = sv(cursorData.pt);
          const { angle, speed, throttle, brake } = cursorData;
          const col = brake > 35 ? "#f87171" : throttle > 50 ? "#a3e635" : "#facc15";
          const z = zoomFac;

          // Badge position — stay inside current viewBox
          const midX = vb.x + vb.w/2, midY = vb.y + vb.h/2;
          const bx = cx < midX ? cx + 22/z : cx - 72/z;
          const by = cy < midY ? cy - 6/z  : cy - 36/z;
          const bw = 50/z, bh = 40/z, br = 4/z;
          const fs1 = 11.5/z, fs2 = 8/z, fs3 = 7/z;

          return (
            <g>
              {/* Outer glow ring */}
              <circle cx={cx} cy={cy} r={28/z}
                fill={`${col}09`} stroke={`${col}22`} strokeWidth={1.5/z}
                filter="url(#ltm-soft-glow)"/>
              {/* Inner ring */}
              <circle cx={cx} cy={cy} r={17/z}
                fill={`${col}16`} stroke={`${col}50`} strokeWidth={1.5/z}/>
              {/* Direction arrow */}
              <g transform={`rotate(${angle}, ${cx}, ${cy})`}>
                <polygon
                  points={`${cx},${cy-15/z} ${cx-8/z},${cy+9/z} ${cx},${cy+4/z} ${cx+8/z},${cy+9/z}`}
                  fill={col} opacity="0.92"/>
              </g>
              {/* Core */}
              <circle cx={cx} cy={cy} r={8/z}
                fill={col} stroke="#060608" strokeWidth={3/z}
                filter="url(#ltm-car-glow)"/>

              {/* Badge */}
              <rect x={bx} y={by} width={bw} height={bh} rx={br}
                fill="rgba(6,6,10,0.94)" stroke={`${col}55`} strokeWidth={0.8/z}/>
              {/* Speed */}
              <text x={bx+bw/2} y={by+bh*0.42} textAnchor="middle"
                fill={col} fontSize={fs1}
                fontFamily="'JetBrains Mono',monospace" fontWeight="900">
                {Math.round(speed)}
              </text>
              <text x={bx+bw/2} y={by+bh*0.62} textAnchor="middle"
                fill="#52525b" fontSize={fs2}
                fontFamily="'JetBrains Mono',monospace">km/h</text>
              {/* Throttle bar */}
              <rect x={bx+3/z} y={by+bh*0.73} width={bw-6/z} height={2.5/z} rx={1/z}
                fill="rgba(74,222,128,0.2)"/>
              <rect x={bx+3/z} y={by+bh*0.73} width={(bw-6/z)*throttle/100} height={2.5/z} rx={1/z}
                fill="#4ade80"/>
              {/* Brake bar */}
              <rect x={bx+3/z} y={by+bh*0.87} width={bw-6/z} height={2.5/z} rx={1/z}
                fill="rgba(248,113,113,0.2)"/>
              <rect x={bx+3/z} y={by+bh*0.87} width={(bw-6/z)*brake/100} height={2.5/z} rx={1/z}
                fill="#f87171"/>
            </g>
          );
        })()}
      </svg>

      {/* ── Overlays ─────────────────────────────────────────────────────────── */}

      {/* Track name */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"/>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.18em]">
          {circuit?.name ?? trackId.toUpperCase()}
        </span>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <svg width="22" height="4">
            <line x1="0" y1="2" x2="22" y2="2" stroke="#a3e635" strokeWidth="2.5"/>
          </svg>
          <span className="text-[8px] font-mono text-zinc-500">Ваша линия</span>
        </div>
        {refTraj.length > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="22" height="4">
              <line x1="0" y1="2" x2="22" y2="2" stroke="#60a5fa" strokeWidth="1.5"
                strokeDasharray="5,3"/>
            </svg>
            <span className="text-[8px] font-mono text-zinc-500">Оптимум</span>
          </div>
        )}
      </div>

      {/* Speed legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-0.5 pointer-events-none opacity-50">
        {["#143cc8","#0a96f0","#3cd250","#dcdc14","#ff6e00","#ff1919"].map((c,i) => (
          <div key={i} style={{ background:c, width:14, height:4, borderRadius:1 }}/>
        ))}
        <span className="text-[7px] font-mono text-zinc-700 ml-1">медленно → торможение</span>
      </div>

      {/* Zoom indicator */}
      {zoomFac > 1.5 && (
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <span className="text-[8px] font-mono text-zinc-700">{zoomFac.toFixed(1)}×</span>
        </div>
      )}
    </div>
  );
}
