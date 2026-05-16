"use client";
/**
 * LiveTrackMap v3 — Premium track visualization.
 *
 * Visual layers (back→front):
 *   1. Dark space background + dot grid
 *   2. Grass / gravel runoff (wide soft stroke)
 *   3. Track shadow / depth
 *   4. Painted kerbs — alternating red/white at brake zones
 *   5. White track boundary lines
 *   6. Asphalt surface (dark grey)
 *   7. Tyre rubber marks (very subtle darker centre)
 *   8. White centre dashes (faint)
 *   9. Reference / optimal racing line (blue dashes + glow)
 *  10. User racing line — speed-heat coloured with glow
 *  11. Divergence zones (where lines separate)
 *  12. Sector markers + SF line
 *  13. Corner labels with type colour
 *  14. Braking zone markers (distance boards)
 *  15. Car trail
 *  16. Car — top-down silhouette with G-force ring
 *  17. Speed/telemetry badge
 */

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { getSmoothedLine, getCircuit } from "@/lib/tracks/geometry";
import { cn } from "@/lib/utils";
import type { Vec2, CornerAnnotation } from "@/lib/tracks/geometry";
import type { TelemetryRow } from "@/types/telemetry";

// ── Canvas constants ──────────────────────────────────────────────────────────
const W = 1000, H = 580;
function sv(v: Vec2): [number, number] {
  return [v.x * W, (1 - v.y) * H];
}
function svRaw(x: number, y: number): [number, number] {
  return [x * W, (1 - y) * H];
}

// ── Colour helpers ────────────────────────────────────────────────────────────
function spdClr(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const STOPS: [number, [number, number, number]][] = [
    [0.00, [20,   50, 200]],  // deep blue
    [0.25, [10,  150, 240]],  // cyan
    [0.52, [50,  210,  70]],  // lime
    [0.68, [220, 220,  20]],  // yellow
    [0.84, [255, 110,   0]],  // orange
    [1.00, [255,  25,  25]],  // red
  ];
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i], [t1, c1] = STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * f)).join(",")})`;
    }
  }
  return "rgb(255,25,25)";
}

// ── Corner type → colour ──────────────────────────────────────────────────────
const CORNER_CLR: Record<string, string> = {
  hairpin: "#f87171",
  chicane: "#fb923c",
  slow:    "#fbbf24",
  medium:  "#a3e635",
  fast:    "#34d399",
};

// ── Smooth path from Vec2 array ───────────────────────────────────────────────
function mkPath(pts: Vec2[], skip = 1, close = false): string {
  if (pts.length < 2) return "";
  const s = pts.filter((_, i) => i % skip === 0);
  const [x0, y0] = sv(s[0]);
  let d = `M ${x0.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i < s.length; i++) {
    const [px, py] = sv(s[i - 1]);
    const [cx2, cy2] = sv(s[i]);
    d += ` Q ${px.toFixed(1)} ${py.toFixed(1)}, ${((px+cx2)/2).toFixed(1)} ${((py+cy2)/2).toFixed(1)}`;
  }
  if (close) d += " Z";
  return d;
}

// ── Synthesise car trajectory ─────────────────────────────────────────────────
function synthTraj(rows: TelemetryRow[], track: Vec2[], totalDist: number): Vec2[] {
  if (!track.length || !rows.length) return [];
  const n = track.length;
  return rows.filter((_, i) => i % 5 === 0).map(r => {
    const frac = Math.max(0, Math.min(1, (r.lapDist ?? 0) / Math.max(totalDist, 1)));
    const idx  = Math.min(Math.round(frac * n), n - 1);
    const pt   = track[idx];
    const nxt  = track[(idx + 2) % n];
    const dx = nxt.x - pt.x, dy = nxt.y - pt.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    const nx = -dy / len, ny = dx / len;   // left-of-travel normal
    // Steer: positive = turning right → car drifts left toward inside
    const steer = Math.max(-1, Math.min(1, (r.steerAngle ?? 0) / 200));
    const off   = -steer * 0.026;
    return { x: pt.x + nx * off, y: pt.y + ny * off };
  });
}

// ── Lerp / viewBox helpers ────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
type VB = { x: number; y: number; w: number; h: number };
function vbClose(a: VB, b: VB, e = 0.4) {
  return Math.abs(a.x-b.x)<e && Math.abs(a.y-b.y)<e && Math.abs(a.w-b.w)<e && Math.abs(a.h-b.h)<e;
}

// ── Kerb stripe path at a corner ──────────────────────────────────────────────
function kerbPath(
  track: Vec2[], lapFrac: number, extSide: 1 | -1,
  widthFrac: number, spanFrac = 0.045,
): string {
  const n = track.length;
  const cIdx = Math.round(lapFrac * n);
  const halfSpan = Math.round(spanFrac * n / 2);
  const pts: string[] = [];

  for (let i = cIdx - halfSpan; i <= cIdx + halfSpan; i++) {
    const idx = ((i % n) + n) % n;
    const pt  = track[idx];
    const nxt = track[(idx + 1) % n];
    const dx  = nxt.x - pt.x, dy = nxt.y - pt.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    const nx = -dy / len, ny = dx / len;
    const ox = pt.x + nx * widthFrac * extSide;
    const oy = pt.y + ny * widthFrac * extSide;
    const [sx, sy] = svRaw(ox, oy);
    pts.push(`${i === cIdx - halfSpan ? "M" : "L"} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
  }
  return pts.join(" ");
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface LiveTrackMapProps {
  trackId:         string;
  userRows:        TelemetryRow[];
  refRows?:        TelemetryRow[];
  cursorProgress?: number | null;
  className?:      string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function LiveTrackMap({ trackId, userRows, refRows, cursorProgress, className }: LiveTrackMapProps) {
  // ── Data ────────────────────────────────────────────────────────────────────
  const track   = useMemo(() => getSmoothedLine(trackId, 24) ?? [], [trackId]);
  const circuit = useMemo(() => getCircuit(trackId), [trackId]);
  const n       = track.length;
  const tw      = (circuit?.trackWidthNorm ?? 0.022) * W;   // track width in SVG units

  const totalDist = userRows.at(-1)?.lapDist ?? 0;
  const maxSpd    = useMemo(() => userRows.reduce((m, r) => Math.max(m, r.speed), 100), [userRows]);

  // ── Trajectories ────────────────────────────────────────────────────────────
  const userTraj = useMemo(() => synthTraj(userRows, track, totalDist), [userRows, track, totalDist]);
  const refTraj  = useMemo(() => refRows ? synthTraj(refRows, track, totalDist) : [], [refRows, track, totalDist]);

  // Speed-coloured line segments
  const trajSegs = useMemo(() => {
    if (!userTraj.length) return [];
    return userTraj.slice(0, -1).map((pt, i) => {
      const row = userRows[Math.min(i * 5, userRows.length - 1)];
      const [x1, y1] = sv(pt);
      const [x2, y2] = sv(userTraj[i + 1]);
      return { x1, y1, x2, y2, c: spdClr(row.speed / maxSpd), brake: row.brake > 20 };
    });
  }, [userTraj, userRows, maxSpd]);

  // Divergence zones: where user and ref are far apart
  const divergeZones = useMemo(() => {
    if (!userTraj.length || !refTraj.length) return [];
    const zones: { x: number; y: number; r: number }[] = [];
    const step = Math.min(userTraj.length, refTraj.length);
    for (let i = 0; i < step; i++) {
      const u = userTraj[i], r = refTraj[Math.min(i, refTraj.length - 1)];
      const dx = (u.x - r.x) * W, dy = (u.y - r.y) * H;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > tw * 0.4) {
        const [cx, cy] = sv(u);
        if (!zones.length || Math.hypot(cx - zones.at(-1)!.x, cy - zones.at(-1)!.y) > tw * 0.8) {
          zones.push({ x: cx, y: cy, r: Math.min(dist * 0.5, tw * 0.7) });
        }
      }
    }
    return zones;
  }, [userTraj, refTraj, tw]);

  // ── Cursor / car ─────────────────────────────────────────────────────────────
  const cursorData = useMemo(() => {
    if (cursorProgress == null || !n) return null;
    const idx = Math.min(Math.round(cursorProgress * n), n - 1);
    const pt  = track[idx];
    const nxt = track[(idx + 2) % n];
    const dx  = nxt.x - pt.x, dy = nxt.y - pt.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    const nx  = -dy / len, ny = dx / len;
    const ri  = Math.min(Math.round(cursorProgress * userRows.length), userRows.length - 1);
    const row = userRows[ri];
    const steer = Math.max(-1, Math.min(1, (row?.steerAngle ?? 0) / 200));
    const carPt = { x: pt.x + nx * (-steer * 0.026), y: pt.y + ny * (-steer * 0.026) };
    const headAngle = Math.atan2(-(dy / len), dx / len) * 180 / Math.PI;

    // Lateral G: side of the traction circle the car is using
    const latG = row?.lateralG ?? 0;

    return {
      pt: carPt, trackPt: pt, idx, headAngle,
      speed: row?.speed ?? 0,
      throttle: row?.throttle ?? 0,
      brake: row?.brake ?? 0,
      gear: row?.gear ?? 1,
      latG,
      spdFrac: (row?.speed ?? 0) / maxSpd,
    };
  }, [cursorProgress, track, userRows, n, maxSpd]);

  // ── Dynamic zoom ──────────────────────────────────────────────────────────────
  const fullVb = useMemo((): VB => {
    if (!track.length) return { x: 0, y: 0, w: W, h: H };
    const pad = 50;
    const xs = track.map(p => p.x * W), ys = track.map(p => (1 - p.y) * H);
    return {
      x: Math.min(...xs) - pad, y: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }, [track]);

  const [vb, setVb] = useState<VB>(fullVb);
  const targetVb    = useRef<VB>(fullVb);
  const rafId       = useRef<number>(0);
  const isAnimating = useRef(false);

  const startAnim = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    const step = () => {
      setVb(prev => {
        const T = 0.06;
        const next: VB = {
          x: lerp(prev.x, targetVb.current.x, T),
          y: lerp(prev.y, targetVb.current.y, T),
          w: lerp(prev.w, targetVb.current.w, T),
          h: lerp(prev.h, targetVb.current.h, T),
        };
        if (vbClose(next, targetVb.current)) {
          isAnimating.current = false;
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
    const [cx, cy] = sv(cursorData.pt);
    const ri   = Math.min(Math.round((cursorProgress ?? 0) * userRows.length), userRows.length - 1);
    const spd  = userRows[ri]?.speed ?? 200;
    const brk  = userRows[ri]?.brake ?? 0;
    const cf   = Math.max(0, Math.min(1, (1 - spd / maxSpd) * 0.65 + (brk / 100) * 0.35));
    const zoom = 1.0 + cf * 2.8;       // 1× full → 3.8× tight corner
    const tw2  = fullVb.w / zoom;
    const th2  = fullVb.h / zoom;
    targetVb.current = {
      x: Math.max(fullVb.x, Math.min(fullVb.x + fullVb.w - tw2, cx - tw2 / 2)),
      y: Math.max(fullVb.y, Math.min(fullVb.y + fullVb.h - th2, cy - th2 / 2)),
      w: tw2, h: th2,
    };
    startAnim();
  }, [cursorData, fullVb, cursorProgress, userRows, maxSpd, n, startAnim]);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  // ── Trail ────────────────────────────────────────────────────────────────────
  const [trail, setTrail] = useState<{ pt: Vec2; c: string }[]>([]);
  useEffect(() => {
    if (!cursorData) { setTrail([]); return; }
    setTrail(p => [
      ...p, { pt: cursorData.pt, c: spdClr(cursorData.spdFrac) }
    ].slice(-18));
  }, [cursorData]);

  // ── Derived measurements ──────────────────────────────────────────────────────
  const zF         = fullVb.w / Math.max(vb.w, 1);    // zoom factor (>1 = zoomed in)
  const scaledTW   = tw * zF;                           // track width in pixels at current zoom
  const fs         = (v: number) => Math.max(6, v / zF);   // font/stroke size helper
  const ss         = (v: number) => Math.max(0.5, v / zF); // stroke size helper

  const viewBox    = `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`;

  if (!track.length) return null;

  // ── SVG def IDs ───────────────────────────────────────────────────────────────
  const ID = `ltm-${trackId}`;

  return (
    <div className={cn("relative overflow-hidden bg-[#06060e] select-none", className)}>
      <svg viewBox={viewBox} className="w-full h-full" style={{ display: "block" }}>
        <defs>
          {/* Filters */}
          <filter id={`${ID}-car-glow`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="12" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`${ID}-line-glow`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`${ID}-soft`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Gradient fills */}
          <radialGradient id={`${ID}-bg`} cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#0e0e1a"/>
            <stop offset="100%" stopColor="#06060e"/>
          </radialGradient>
        </defs>

        {/* ── 1. Background ──────────────────────────────────────────────────── */}
        <rect width={W} height={H} fill={`url(#${ID}-bg)`}/>
        {[...Array(16)].map((_, i) => [...Array(10)].map((_, j) => (
          <circle key={`d${i}${j}`}
            cx={(i / 15) * W} cy={(j / 9) * H}
            r={ss(0.7)} fill="#15152a" opacity="0.55"/>
        )))}

        {/* ── 2. Grass runoff ─────────────────────────────────────────────────── */}
        <path d={mkPath(track, 1, true)}
          fill="none" stroke="#0a1a0a"
          strokeWidth={scaledTW * 3.2}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* ── 3. Track shadow ─────────────────────────────────────────────────── */}
        <path d={mkPath(track, 1, true)}
          fill="none" stroke="rgba(0,0,0,0.75)"
          strokeWidth={scaledTW + ss(16)}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* ── 4. Kerb stripes ─────────────────────────────────────────────────── */}
        {circuit?.corners?.filter(c => c.brakeZone).map((corner, ci) => {
          const kw = (circuit.trackWidthNorm * 0.55) * W; // kerb on track edge
          const STRIPE_W = ss(5);
          const kPath1 = kerbPath(track, corner.lapFrac, -1, circuit.trackWidthNorm * 0.68, 0.04);
          const kPath2 = kerbPath(track, corner.lapFrac,  1, circuit.trackWidthNorm * 0.68, 0.04);
          return (
            <g key={`k${ci}`}>
              {/* Inside kerb — painted red/white */}
              <path d={kPath1} fill="none"
                stroke="#cc2222" strokeWidth={STRIPE_W * 1.3}
                strokeLinejoin="round" strokeLinecap="round"
                strokeDasharray={`${ss(8)},${ss(8)}`} opacity="0.6"/>
              <path d={kPath1} fill="none"
                stroke="#ffffff" strokeWidth={STRIPE_W * 0.7}
                strokeLinejoin="round" strokeLinecap="round"
                strokeDasharray={`${ss(8)},${ss(8)}`}
                strokeDashoffset={ss(8)} opacity="0.35"/>
            </g>
          );
        })}

        {/* ── 5. Track boundary lines ─────────────────────────────────────────── */}
        <path d={mkPath(track, 1, true)}
          fill="none" stroke="#2e2e3e"
          strokeWidth={scaledTW + ss(4)}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* ── 6. Asphalt surface ──────────────────────────────────────────────── */}
        <path d={mkPath(track, 1, true)}
          fill="none" stroke="#18181f"
          strokeWidth={scaledTW}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* ── 7. Rubber / tyre mark centre strip ─────────────────────────────── */}
        <path d={mkPath(track, 1, true)}
          fill="none" stroke="#111116"
          strokeWidth={scaledTW * 0.3}
          strokeLinejoin="round" strokeLinecap="round" opacity="0.6"/>

        {/* ── 8. Centre dashes ────────────────────────────────────────────────── */}
        <path d={mkPath(track, 1, true)}
          fill="none" stroke="#ffffff"
          strokeWidth={ss(0.9)}
          strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={`${ss(10)},${ss(16)}`} opacity="0.04"/>

        {/* ── 9. Divergence zones ─────────────────────────────────────────────── */}
        {divergeZones.map((z, i) => (
          <circle key={`dz${i}`} cx={z.x} cy={z.y} r={z.r * 1.5}
            fill="rgba(251,191,36,0.04)" stroke="rgba(251,191,36,0.18)"
            strokeWidth={ss(1)} filter={`url(#${ID}-soft)`}/>
        ))}

        {/* ── 10. Ref / optimal trajectory ──────────────────────────────────────── */}
        {refTraj.length > 0 && (
          <>
            <path d={mkPath(refTraj, 1)}
              fill="none" stroke="#3b82f6"
              strokeWidth={ss(7)} opacity="0.12"
              strokeLinejoin="round" strokeLinecap="round"
              filter={`url(#${ID}-line-glow)`}/>
            <path d={mkPath(refTraj, 1)}
              fill="none" stroke="#60a5fa"
              strokeWidth={ss(2.2)} opacity="0.55"
              strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={`${ss(7)},${ss(4.5)}`}/>
          </>
        )}

        {/* ── 11. User trajectory ─────────────────────────────────────────────── */}
        {trajSegs.length > 0 && (
          <>
            {/* Outer glow */}
            {trajSegs.map((s, i) => (
              <line key={`ug${i}`}
                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={s.c} strokeWidth={ss(10)}
                strokeLinecap="round" opacity="0.1"/>
            ))}
            {/* Main coloured line */}
            {trajSegs.map((s, i) => (
              <line key={`ul${i}`}
                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={s.c} strokeWidth={ss(3.8)}
                strokeLinecap="round" opacity="0.95"/>
            ))}
          </>
        )}

        {/* ── 12. Start/finish line ───────────────────────────────────────────── */}
        {track.length > 2 && (() => {
          const [x0, y0] = sv(track[0]);
          const [x1, y1] = sv(track[1]);
          const dx = x1-x0, dy = y1-y0;
          const len = Math.sqrt(dx*dx+dy*dy) || 1;
          const ext = scaledTW * 0.55;
          const px = -dy/len*ext, py = dx/len*ext;
          return (
            <g>
              <line x1={x0-px} y1={y0-py} x2={x0+px} y2={y0+py}
                stroke="#ffffff" strokeWidth={ss(2.5)} opacity="0.5"
                strokeDasharray={`${ss(4)},${ss(3)}`}/>
              <text x={x0-px-ss(8)} y={y0-py+fs(4)} textAnchor="end"
                fill="#ffffff" fontSize={fs(8)} opacity="0.4"
                fontFamily="'JetBrains Mono',monospace" fontWeight="800">SF</text>
            </g>
          );
        })()}

        {/* ── 13. Sector markers ──────────────────────────────────────────────── */}
        {circuit?.sectorMarkers?.slice(1).map(sm => {
          const idx = Math.round(sm.lapFrac * n) % n;
          const pt  = track[idx];
          if (!pt) return null;
          const [sx, sy] = sv(pt);
          const nxt = track[(idx + 1) % n];
          const [nx2, ny2] = sv(nxt);
          const ang = Math.atan2(ny2-sy, nx2-sx) + Math.PI/2;
          const ext = scaledTW * 0.6;
          return (
            <g key={`sm${sm.sectorIdx}`}>
              <line
                x1={sx+Math.cos(ang)*ext} y1={sy+Math.sin(ang)*ext}
                x2={sx-Math.cos(ang)*ext} y2={sy-Math.sin(ang)*ext}
                stroke="#facc15" strokeWidth={ss(2)} opacity="0.65"
                strokeDasharray={`${ss(3)},${ss(2)}`}/>
              <circle cx={sx+Math.cos(ang)*(ext+ss(12))} cy={sy+Math.sin(ang)*(ext+ss(12))}
                r={ss(9)} fill="rgba(250,204,21,0.15)" stroke="rgba(250,204,21,0.45)"
                strokeWidth={ss(0.8)}/>
              <text x={sx+Math.cos(ang)*(ext+ss(12))} y={sy+Math.sin(ang)*(ext+ss(12))+fs(3.5)}
                textAnchor="middle" fill="#facc15" fontSize={fs(8.5)}
                fontFamily="'JetBrains Mono',monospace" fontWeight="900">
                S{sm.sectorIdx+1}
              </text>
            </g>
          );
        })}

        {/* ── 14. Corner labels ───────────────────────────────────────────────── */}
        {circuit?.corners?.map(corner => {
          const idx = Math.round(corner.lapFrac * n) % n;
          const pt  = track[idx];
          if (!pt) return null;
          const [lx, ly] = sv(pt);
          // Clip to viewport
          if (lx < vb.x-30 || lx > vb.x+vb.w+30 || ly < vb.y-30 || ly > vb.y+vb.h+30) return null;
          const isActive = cursorData && Math.abs((cursorProgress ?? 0) - corner.lapFrac) < 0.055;
          const col   = CORNER_CLR[corner.type] ?? "#a3e635";
          const r     = ss(isActive ? 15 : 11);
          const fSize = fs(isActive ? 9.5 : 8);
          const label = corner.label.length > 5 ? corner.label.split(" ")[0] : corner.label;
          // Place label away from centre
          const nxt = track[(idx + 3) % n];
          const [nx2, ny2] = sv(nxt);
          const dx = lx - (vb.x + vb.w/2), dy = ly - (vb.y + vb.h/2);
          const len = Math.sqrt(dx*dx + dy*dy) || 1;
          const offx = dx/len * ss(26), offy = dy/len * ss(26);
          return (
            <g key={corner.id}
              filter={isActive ? `url(#${ID}-soft)` : undefined}>
              <circle cx={lx} cy={ly} r={r}
                fill={`${col}18`} stroke={col}
                strokeWidth={ss(isActive ? 1.5 : 1)} opacity={isActive ? 0.9 : 0.55}/>
              <text x={lx+offx} y={ly+offy+fSize*0.38}
                textAnchor="middle" fill={isActive ? "#fff" : col}
                fontSize={fSize} fontFamily="'JetBrains Mono',monospace"
                fontWeight="800" opacity={isActive ? 1 : 0.7}>
                {label}
              </text>
              {isActive && corner.brakeZone && (
                <text x={lx+offx} y={ly+offy+fSize*1.5}
                  textAnchor="middle" fill="#f87171"
                  fontSize={fs(7)} fontFamily="'JetBrains Mono',monospace"
                  fontWeight="600" opacity="0.8">⬛ тормоз</text>
              )}
            </g>
          );
        })}

        {/* ── 15. Car trail ───────────────────────────────────────────────────── */}
        {cursorData && trail.slice(0, -1).map(({ pt, c }, i) => {
          const [tx, ty] = sv(pt);
          const a = ((i + 1) / trail.length) * 0.5;
          const r = ss(1.4 + i * 0.55);
          return <circle key={`tr${i}`} cx={tx} cy={ty} r={r} fill={c} opacity={a}/>;
        })}

        {/* ── 16. Car silhouette ───────────────────────────────────────────────── */}
        {cursorData && (() => {
          const [cx, cy] = sv(cursorData.pt);
          const { headAngle, speed, throttle, brake, gear, latG, spdFrac } = cursorData;
          const col = brake > 35 ? "#f87171" : throttle > 50 ? "#a3e635" : "#facc15";

          // Traction circle — shows how close to limit the car is
          const gTotal = Math.min(1, Math.abs(latG) / 3.5);

          // G-force direction indicator
          const gAng = latG > 0
            ? headAngle - 90    // turning left
            : headAngle + 90;   // turning right

          // Badge position — keep inside viewport
          const midX = vb.x + vb.w / 2, midY = vb.y + vb.h / 2;
          const bOffX = cx < midX ? ss(28) : ss(-88);
          const bOffY = cy < midY ? ss(-8) : ss(-52);
          const bx = cx + bOffX, by = cy + bOffY;
          const bw = ss(60), bh = ss(50), br = ss(5);
          const fSz1 = fs(13), fSz2 = fs(8.5), fSz3 = fs(7.5);

          return (
            <g>
              {/* Traction circle background */}
              <circle cx={cx} cy={cy} r={ss(32)}
                fill="transparent" stroke={col} strokeWidth={ss(0.8)} opacity="0.1"/>
              {/* Traction usage arc */}
              <circle cx={cx} cy={cy} r={ss(32)}
                fill="transparent" stroke={col} strokeWidth={ss(1.2)}
                strokeDasharray={`${ss(32 * 2 * Math.PI * gTotal)},${ss(32 * 2 * Math.PI)}`}
                strokeDashoffset={ss(32 * 2 * Math.PI * 0.25)}
                opacity="0.4" strokeLinecap="round"
                style={{ transform: `rotate(${headAngle-90}deg)`, transformOrigin: `${cx}px ${cy}px` }}/>
              {/* Outer glow ring */}
              <circle cx={cx} cy={cy} r={ss(20)}
                fill={`${col}10`} stroke={`${col}25`}
                strokeWidth={ss(1.5)} filter={`url(#${ID}-soft)`}/>
              {/* Inner ring */}
              <circle cx={cx} cy={cy} r={ss(13)}
                fill={`${col}18`} stroke={`${col}55`} strokeWidth={ss(1.5)}/>

              {/* Car body — top-down silhouette */}
              <g transform={`rotate(${headAngle}, ${cx}, ${cy})`}>
                {/* Main body */}
                <rect x={cx - ss(5)} y={cy - ss(14)} width={ss(10)} height={ss(22)}
                  rx={ss(3)} fill={col} opacity="0.88"/>
                {/* Cockpit darker zone */}
                <rect x={cx - ss(3.5)} y={cy - ss(6)} width={ss(7)} height={ss(9)}
                  rx={ss(2)} fill="rgba(0,0,0,0.4)"/>
                {/* Front wing */}
                <rect x={cx - ss(7)} y={cy - ss(16)} width={ss(14)} height={ss(3)}
                  rx={ss(1)} fill={col} opacity="0.7"/>
                {/* Rear diffuser */}
                <rect x={cx - ss(6)} y={cy + ss(8)} width={ss(12)} height={ss(3)}
                  rx={ss(1)} fill={col} opacity="0.55"/>
                {/* Tyres */}
                {[[-ss(7),-ss(9)],[ss(5),-ss(9)],[-ss(7),ss(5)],[ss(5),ss(5)]].map(([tx,ty],i) => (
                  <rect key={i} x={cx+tx} y={cy+ty} width={ss(4)} height={ss(6)}
                    rx={ss(1)} fill="#333344" stroke="#555566" strokeWidth={ss(0.5)}/>
                ))}
              </g>

              {/* Core dot / car glow */}
              <circle cx={cx} cy={cy} r={ss(5)}
                fill={col} stroke="#060608" strokeWidth={ss(2.5)}
                filter={`url(#${ID}-car-glow)`}/>

              {/* ── Badge ──────────────────────────────────────────────────── */}
              <rect x={bx} y={by} width={bw} height={bh} rx={br}
                fill="rgba(4,4,12,0.95)" stroke={`${col}55`} strokeWidth={ss(0.8)}/>

              {/* Speed */}
              <text x={bx+bw/2} y={by+bh*0.38} textAnchor="middle"
                fill={col} fontSize={fSz1}
                fontFamily="'JetBrains Mono',monospace" fontWeight="900">
                {Math.round(speed)}
              </text>
              <text x={bx+bw/2} y={by+bh*0.57} textAnchor="middle"
                fill="#3f3f5a" fontSize={fSz2}
                fontFamily="'JetBrains Mono',monospace">km/h</text>

              {/* Gear badge */}
              <rect x={bx+bw*0.68} y={by+bh*0.06} width={bw*0.28} height={bh*0.28} rx={br*0.6}
                fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"
                strokeWidth={ss(0.5)}/>
              <text x={bx+bw*0.82} y={by+bh*0.25} textAnchor="middle"
                fill="#a1a1aa" fontSize={fSz2}
                fontFamily="'JetBrains Mono',monospace" fontWeight="800">
                {gear < 0 ? "R" : gear === 0 ? "N" : gear}
              </text>

              {/* Throttle bar */}
              <rect x={bx+ss(4)} y={by+bh*0.70} width={bw-ss(8)} height={ss(3.5)} rx={ss(1.5)}
                fill="rgba(74,222,128,0.15)"/>
              <rect x={bx+ss(4)} y={by+bh*0.70} width={(bw-ss(8))*throttle/100} height={ss(3.5)} rx={ss(1.5)}
                fill="#4ade80"/>
              {/* Brake bar */}
              <rect x={bx+ss(4)} y={by+bh*0.85} width={bw-ss(8)} height={ss(3.5)} rx={ss(1.5)}
                fill="rgba(248,113,113,0.15)"/>
              <rect x={bx+ss(4)} y={by+bh*0.85} width={(bw-ss(8))*brake/100} height={ss(3.5)} rx={ss(1.5)}
                fill="#f87171"/>
            </g>
          );
        })()}
      </svg>

      {/* ── DOM overlays ──────────────────────────────────────────────────────── */}

      {/* Track name + country */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"/>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.18em]">
          {circuit?.countryEmoji && <span className="mr-1">{circuit.countryEmoji}</span>}
          {circuit?.name ?? trackId.toUpperCase()}
        </span>
        {circuit?.lengthKm && (
          <span className="text-[8px] font-mono text-zinc-700">{circuit.lengthKm} km</span>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <svg width="22" height="4">
            <line x1="0" y1="2" x2="22" y2="2" stroke="#a3e635" strokeWidth="3"/>
          </svg>
          <span className="text-[8px] font-mono text-zinc-500">Ваша линия</span>
        </div>
        {refTraj.length > 0 && (
          <div className="flex items-center gap-1.5">
            <svg width="22" height="4">
              <line x1="0" y1="2" x2="22" y2="2" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="5,3"/>
            </svg>
            <span className="text-[8px] font-mono text-zinc-500">Оптимальная</span>
          </div>
        )}
        {divergeZones.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-yellow-400/40 bg-yellow-400/10"/>
            <span className="text-[8px] font-mono text-zinc-500">Отклонение</span>
          </div>
        )}
      </div>

      {/* Speed colour legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-0.5 pointer-events-none">
        {["#143cc8","#0a96f0","#32d250","#dcdc14","#ff6e00","#ff1919"].map((c, i) => (
          <div key={i} style={{ background: c, width: 14, height: 5, borderRadius: 2 }}/>
        ))}
        <span className="text-[7px] font-mono text-zinc-700 ml-1.5 opacity-70">медленно → торможение</span>
      </div>

      {/* Zoom level */}
      <div className="absolute bottom-3 right-3 pointer-events-none">
        <span className="text-[8px] font-mono text-zinc-800">
          {zF > 1.3 ? `${zF.toFixed(1)}×` : ""}
        </span>
      </div>
    </div>
  );
}
