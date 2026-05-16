"use client";
/**
 * LiveTrackMap v4 — Top-tier premium track visualization.
 *
 * Features:
 * • Photorealistic-style track surface (grass → gravel → kerb → asphalt)
 * • Gap ribbon: filled area between trajectories coloured by time (red=loss, green=gain)
 * • Distance boards (100m / 50m markers) at each brake zone
 * • Δ-time callouts at corners
 * • Top-down GT3 car silhouette with brake lights & glow
 * • Predictive zoom: viewport leads the car
 * • Mini-map thumbnail in corner
 * • Traction circle overlay
 * • Corner type colour coding
 */

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { getSmoothedLine, getCircuit } from "@/lib/tracks/geometry";
import { cn } from "@/lib/utils";
import type { Vec2 } from "@/lib/tracks/geometry";
import type { TelemetryRow } from "@/types/telemetry";
import type { SegmentAnalysis, DeltaResult } from "@/types/telemetry";

// ─── Canvas ───────────────────────────────────────────────────────────────────
const W = 1000, H = 580, PAD = 55;

function sv(v: Vec2): [number, number]   { return [v.x * W, (1 - v.y) * H]; }
function sxy(x: number, y: number): [number, number] { return [x * W, (1 - y) * H]; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ─── Colours ──────────────────────────────────────────────────────────────────
function spdClr(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const ST: [number, [number,number,number]][] = [
    [0.00, [20,50,200]], [0.24, [10,145,240]], [0.50, [40,210,65]],
    [0.67, [225,220,15]], [0.83, [255,105,0]], [1.00, [255,22,22]],
  ];
  for (let i = 0; i < ST.length - 1; i++) {
    const [t0,c0] = ST[i], [t1,c1] = ST[i+1];
    if (t >= t0 && t <= t1) {
      const f = (t-t0)/(t1-t0);
      return `rgb(${c0.map((v,j)=>Math.round(v+(c1[j]-v)*f)).join(",")})`;
    }
  }
  return "rgb(255,22,22)";
}

function deltaClr(ds: number): string {
  // ds = cumulative delta seconds at this point (positive = losing time)
  if (ds > 0.15)  return "rgba(248,113,113,0.55)";  // significant loss
  if (ds > 0.05)  return "rgba(251,146,60,0.40)";   // minor loss
  if (ds < -0.05) return "rgba(163,230,53,0.45)";   // gaining
  return "rgba(255,255,255,0.10)";                   // neutral
}

const CORNER_CLR: Record<string, string> = {
  hairpin:"#f87171", chicane:"#fb923c",
  slow:"#fbbf24",    medium:"#a3e635", fast:"#34d399",
};

// ─── Path ─────────────────────────────────────────────────────────────────────
function mkPath(pts: Vec2[], skip = 1, close = false): string {
  if (pts.length < 2) return "";
  const s = pts.filter((_,i) => i%skip===0);
  const [x0,y0] = sv(s[0]);
  let d = `M ${x0.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i < s.length; i++) {
    const [px,py] = sv(s[i-1]), [cx,cy] = sv(s[i]);
    d += ` Q ${px.toFixed(1)} ${py.toFixed(1)}, ${((px+cx)/2).toFixed(1)} ${((py+cy)/2).toFixed(1)}`;
  }
  if (close) d += " Z";
  return d;
}

// ─── Normal helper ────────────────────────────────────────────────────────────
function trackNormal(track: Vec2[], idx: number): [number,number] {
  const n   = track.length;
  const pt  = track[idx];
  const nxt = track[(idx+2)%n];
  const dx  = nxt.x-pt.x, dy = nxt.y-pt.y;
  const len = Math.sqrt(dx*dx+dy*dy)||1e-6;
  return [-dy/len, dx/len];   // left-of-travel normal
}

// ─── Synthesise trajectory ────────────────────────────────────────────────────
function synthTraj(rows: TelemetryRow[], track: Vec2[], totalDist: number): Vec2[] {
  if (!track.length||!rows.length) return [];
  const n = track.length;
  return rows.filter((_,i)=>i%4===0).map(r => {
    const frac = Math.max(0,Math.min(1,(r.lapDist??0)/Math.max(totalDist,1)));
    const idx  = Math.min(Math.round(frac*n),n-1);
    const [nx,ny] = trackNormal(track,idx);
    const steer = Math.max(-1,Math.min(1,(r.steerAngle??0)/200));
    const off   = -steer*0.027;
    return { x: track[idx].x+nx*off, y: track[idx].y+ny*off };
  });
}

// ─── Gap ribbon polygon ───────────────────────────────────────────────────────
/** Build a polygon that fills the space between two trajectory arrays */
function gapPolygon(
  user: Vec2[], ref: Vec2[],
  delta: DeltaResult | undefined,
  totalPoints: number,
): { path: string; color: string }[] {
  if (!user.length||!ref.length) return [];
  const minLen = Math.min(user.length, ref.length);
  const CHUNK = 8;
  const result: { path: string; color: string }[] = [];

  for (let start = 0; start < minLen - CHUNK; start += CHUNK) {
    const end = Math.min(start + CHUNK + 1, minLen);
    // Forward pass (user)
    const fwd  = user.slice(start, end).map(p => sv(p));
    // Reverse pass (ref)
    const rev  = ref.slice(start, end).reverse().map(p => sv(p));
    const pts  = [...fwd, ...rev];
    if (pts.length < 3) continue;

    const d = `M ${pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")} Z`;

    // Get delta at midpoint
    const midIdx = Math.round(((start + end) / 2 / minLen) * (delta?.cumulativeDeltaS.length ?? 1));
    const ds = delta?.cumulativeDeltaS[Math.min(midIdx, (delta?.cumulativeDeltaS.length??1)-1)] ?? 0;

    result.push({ path: d, color: deltaClr(ds) });
  }
  return result;
}

// ─── ViewBox type ─────────────────────────────────────────────────────────────
type VB = { x:number; y:number; w:number; h:number };
function vbClose(a:VB,b:VB,e=0.5) {
  return Math.abs(a.x-b.x)<e&&Math.abs(a.y-b.y)<e&&Math.abs(a.w-b.w)<e&&Math.abs(a.h-b.h)<e;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface LiveTrackMapProps {
  trackId:          string;
  userRows:         TelemetryRow[];
  refRows?:         TelemetryRow[];
  cursorProgress?:  number | null;
  segmentAnalyses?: SegmentAnalysis[];
  delta?:           DeltaResult;
  className?:       string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LiveTrackMap({
  trackId, userRows, refRows, cursorProgress,
  segmentAnalyses, delta, className,
}: LiveTrackMapProps) {
  const track   = useMemo(() => getSmoothedLine(trackId, 24) ?? [], [trackId]);
  const circuit = useMemo(() => getCircuit(trackId), [trackId]);
  const n       = track.length;
  const tw      = (circuit?.trackWidthNorm ?? 0.022) * W;

  const totalDist = userRows.at(-1)?.lapDist ?? 0;
  const maxSpd    = useMemo(() => userRows.reduce((m,r)=>Math.max(m,r.speed),100), [userRows]);

  const userTraj = useMemo(() => synthTraj(userRows,track,totalDist), [userRows,track,totalDist]);
  const refTraj  = useMemo(() => refRows ? synthTraj(refRows,track,totalDist) : [], [refRows,track,totalDist]);

  // Speed segments on user trajectory
  const trajSegs = useMemo(() => {
    if (!userTraj.length) return [];
    return userTraj.slice(0,-1).map((pt,i) => {
      const row = userRows[Math.min(i*4,userRows.length-1)];
      const [x1,y1] = sv(pt), [x2,y2] = sv(userTraj[i+1]);
      return { x1,y1,x2,y2, c: spdClr(row.speed/maxSpd) };
    });
  }, [userTraj,userRows,maxSpd]);

  // Gap ribbon
  const gapRibbon = useMemo(
    () => gapPolygon(userTraj, refTraj, delta, n),
    [userTraj, refTraj, delta, n]
  );

  // ── Cursor / car data ────────────────────────────────────────────────────────
  const cursorData = useMemo(() => {
    if (cursorProgress==null||!n) return null;
    const idx = Math.min(Math.round(cursorProgress*n),n-1);
    const [nx,ny] = trackNormal(track,idx);
    const ri  = Math.min(Math.round(cursorProgress*userRows.length),userRows.length-1);
    const row = userRows[ri];
    const steer = Math.max(-1,Math.min(1,(row?.steerAngle??0)/200));
    const carPt = { x: track[idx].x+nx*(-steer*0.027), y: track[idx].y+ny*(-steer*0.027) };
    const nxt = track[(idx+3)%n];
    const dx  = nxt.x-track[idx].x, dy = nxt.y-track[idx].y;
    const len = Math.sqrt(dx*dx+dy*dy)||1;
    const headAngle = Math.atan2(-(dy/len),dx/len)*180/Math.PI;

    // Look ahead for predictive zoom: what's the track doing 0.8s ahead?
    const lookAheadFrac = Math.min(1,(cursorProgress)+(row?.speed??100)/(totalDist||4000)*0.8);
    const laIdx = Math.min(Math.round(lookAheadFrac*n),n-1);
    const lookAheadPt = track[laIdx];

    return {
      pt: carPt, idx, headAngle,
      speed: row?.speed??0, throttle: row?.throttle??0,
      brake: row?.brake??0, gear: row?.gear??1,
      latG: row?.lateralG??0,
      spdFrac: (row?.speed??0)/maxSpd,
      lookAheadPt,
    };
  }, [cursorProgress,track,userRows,n,maxSpd,totalDist]);

  // ── Zoom ─────────────────────────────────────────────────────────────────────
  const fullVb = useMemo(():VB => {
    if (!track.length) return {x:0,y:0,w:W,h:H};
    const xs=track.map(p=>p.x*W), ys=track.map(p=>(1-p.y)*H);
    return {
      x:Math.min(...xs)-PAD, y:Math.min(...ys)-PAD,
      w:Math.max(...xs)-Math.min(...xs)+PAD*2,
      h:Math.max(...ys)-Math.min(...ys)+PAD*2,
    };
  }, [track]);

  const [vb,setVb]   = useState<VB>(fullVb);
  const targetVb     = useRef<VB>(fullVb);
  const rafId        = useRef<number>(0);
  const animating    = useRef(false);

  const startAnim = useCallback(() => {
    if (animating.current) return;
    animating.current = true;
    const step = () => {
      setVb(prev => {
        const T = 0.055;
        const next:VB = {
          x:lerp(prev.x,targetVb.current.x,T), y:lerp(prev.y,targetVb.current.y,T),
          w:lerp(prev.w,targetVb.current.w,T), h:lerp(prev.h,targetVb.current.h,T),
        };
        if (vbClose(next,targetVb.current)) { animating.current=false; return targetVb.current; }
        rafId.current = requestAnimationFrame(step);
        return next;
      });
    };
    rafId.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (!cursorData||!n) { targetVb.current=fullVb; startAnim(); return; }
    const ri   = Math.min(Math.round((cursorProgress??0)*userRows.length),userRows.length-1);
    const spd  = userRows[ri]?.speed??200;
    const brk  = userRows[ri]?.brake??0;
    const cf   = Math.max(0,Math.min(1,(1-spd/maxSpd)*0.6+(brk/100)*0.4));
    const zoom = 1.0+cf*3.0;     // 1× (straight) → 4× (hard braking)
    const tw2  = fullVb.w/zoom, th2 = fullVb.h/zoom;

    // Predictive: center slightly ahead of car
    const [cx,cy] = sv(cursorData.pt);
    const [lx,ly] = sv(cursorData.lookAheadPt);
    const pcx = cx*0.4+lx*0.6;    // 60% towards lookahead
    const pcy = cy*0.4+ly*0.6;

    targetVb.current = {
      x:Math.max(fullVb.x,Math.min(fullVb.x+fullVb.w-tw2,pcx-tw2/2)),
      y:Math.max(fullVb.y,Math.min(fullVb.y+fullVb.h-th2,pcy-th2/2)),
      w:tw2, h:th2,
    };
    startAnim();
  }, [cursorData,fullVb,cursorProgress,userRows,maxSpd,n,startAnim]);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  // Trail
  const [trail,setTrail] = useState<{p:Vec2,c:string}[]>([]);
  useEffect(() => {
    if (!cursorData) { setTrail([]); return; }
    setTrail(prev => [...prev,{p:cursorData.pt,c:spdClr(cursorData.spdFrac)}].slice(-20));
  }, [cursorData]);

  // ── Scale helpers (adapt to zoom level) ──────────────────────────────────────
  const zF   = fullVb.w/Math.max(vb.w,1);
  const ss   = (v:number) => Math.max(0.4,v/zF);
  const fs   = (v:number) => Math.max(5,v/zF);
  const stw  = tw*zF;   // scaled track width

  const ID   = `ltm-${trackId}`;
  const vbStr = `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`;
  const miniVbStr = `${fullVb.x} ${fullVb.y} ${fullVb.w} ${fullVb.h}`;

  if (!track.length) return null;

  return (
    <div className={cn("relative overflow-hidden bg-[#05050d] select-none", className)}>

      {/* ── MAIN SVG ──────────────────────────────────────────────────────────── */}
      <svg viewBox={vbStr} className="w-full h-full" style={{display:"block"}}>
        <defs>
          <filter id={`${ID}-car`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="11" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`${ID}-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`${ID}-sm`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id={`${ID}-bg`} cx="50%" cy="45%" r="75%">
            <stop offset="0%"   stopColor="#0e0e1c"/>
            <stop offset="100%" stopColor="#05050d"/>
          </radialGradient>
        </defs>

        {/* 1 · Background */}
        <rect width={W} height={H} fill={`url(#${ID}-bg)`}/>
        {[...Array(14)].map((_,i)=>[...Array(9)].map((_,j)=>(
          <circle key={`d${i}${j}`}
            cx={(i/13)*W} cy={(j/8)*H} r={ss(0.65)}
            fill="#141428" opacity="0.5"/>
        )))}

        {/* 2 · Grass / gravel */}
        <path d={mkPath(track,1,true)} fill="none"
          stroke="#09140a" strokeWidth={stw*3.5}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* 3 · Track shadow */}
        <path d={mkPath(track,1,true)} fill="none"
          stroke="rgba(0,0,0,0.8)" strokeWidth={stw+ss(18)}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* 4 · Kerb (painted edge at brake zones) */}
        {circuit?.corners?.filter(c=>c.brakeZone).map((corner,ci) => {
          const cIdx   = Math.round(corner.lapFrac*n);
          const span   = Math.round(0.042*n);
          const kw     = circuit.trackWidthNorm*0.72*W;
          const kStripe = ss(6);
          const kDash   = ss(9);

          // Build kerb on both sides
          const sides = [1,-1] as const;
          return sides.map((side,si) => {
            const pts: string[] = [];
            for (let k = cIdx-span; k <= cIdx+span; k++) {
              const idx = ((k%n)+n)%n;
              const pt  = track[idx];
              const [nx,ny] = trackNormal(track,idx);
              const [sx,sy] = sxy(pt.x+nx*kw/W*side, pt.y+ny*kw/H*side);
              pts.push(`${k===cIdx-span?"M":"L"} ${sx.toFixed(1)} ${sy.toFixed(1)}`);
            }
            return (
              <g key={`k${ci}${si}`}>
                <path d={pts.join(" ")} fill="none"
                  stroke="#dd1111" strokeWidth={kStripe}
                  strokeLinecap="round"
                  strokeDasharray={`${kDash},${kDash}`} opacity="0.65"/>
                <path d={pts.join(" ")} fill="none"
                  stroke="#ffffff" strokeWidth={kStripe*0.55}
                  strokeLinecap="round"
                  strokeDasharray={`${kDash},${kDash}`}
                  strokeDashoffset={kDash} opacity="0.3"/>
              </g>
            );
          });
        })}

        {/* 5 · White track edge lines */}
        <path d={mkPath(track,1,true)} fill="none"
          stroke="#252535" strokeWidth={stw+ss(5)}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* 6 · Asphalt surface */}
        <path d={mkPath(track,1,true)} fill="none"
          stroke="#17171f" strokeWidth={stw}
          strokeLinejoin="round" strokeLinecap="round"/>

        {/* 7 · Rubber on racing line */}
        <path d={mkPath(track,1,true)} fill="none"
          stroke="#0f0f16" strokeWidth={stw*0.28}
          strokeLinejoin="round" strokeLinecap="round" opacity="0.7"/>

        {/* 8 · Centre dashes */}
        <path d={mkPath(track,1,true)} fill="none"
          stroke="#ffffff" strokeWidth={ss(0.9)}
          strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray={`${ss(9)},${ss(16)}`} opacity="0.035"/>

        {/* 9 · Distance boards at brake zones */}
        {circuit?.corners?.filter(c=>c.brakeZone).map(corner => {
          const BOARDS: [number,string,string][] = [
            [-0.018,"100","rgba(255,255,255,0.7)"],
            [-0.010,"50", "rgba(255,255,255,0.55)"],
          ];
          return BOARDS.map(([offset,label,stroke]) => {
            const bIdx = Math.round((corner.lapFrac+offset)*n);
            const sIdx = ((bIdx%n)+n)%n;
            const pt   = track[sIdx];
            if (!pt) return null;
            const [nx,ny] = trackNormal(track,sIdx);
            const bw  = ss(5), bh = ss(12);
            const boardOffX = nx * circuit!.trackWidthNorm * 0.75;
            const boardOffY = ny * circuit!.trackWidthNorm * 0.75;
            const [sx,sy] = sxy(pt.x + boardOffX, pt.y + boardOffY);
            const fSize = fs(7.5);
            return (
              <g key={`bd${corner.id}${label}`}>
                <rect x={sx-bw/2} y={sy-bh/2} width={bw} height={bh}
                  rx={ss(1)} fill="rgba(255,255,255,0.07)"
                  stroke={stroke} strokeWidth={ss(0.7)}/>
                <text x={sx} y={sy+fSize*0.38} textAnchor="middle"
                  fill={stroke} fontSize={fSize}
                  fontFamily="'JetBrains Mono',monospace"
                  fontWeight="900">{label}</text>
              </g>
            );
          });
        })}

        {/* 10 · Gap ribbon */}
        {gapRibbon.map((seg,i) => (
          <path key={`gr${i}`} d={seg.path}
            fill={seg.color} stroke="none"/>
        ))}

        {/* 11 · Ref trajectory */}
        {refTraj.length > 0 && (
          <>
            <path d={mkPath(refTraj,1)} fill="none"
              stroke="#1d4ed8" strokeWidth={ss(8)} opacity="0.12"
              strokeLinejoin="round" strokeLinecap="round"
              filter={`url(#${ID}-glow)`}/>
            <path d={mkPath(refTraj,1)} fill="none"
              stroke="#93c5fd" strokeWidth={ss(2.0)} opacity="0.55"
              strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={`${ss(6.5)},${ss(4)}`}/>
          </>
        )}

        {/* 12 · User trajectory glow + line */}
        {trajSegs.length > 0 && (
          <>
            {trajSegs.map((s,i) => (
              <line key={`ug${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={s.c} strokeWidth={ss(10)} strokeLinecap="round" opacity="0.10"/>
            ))}
            {trajSegs.map((s,i) => (
              <line key={`ul${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke={s.c} strokeWidth={ss(3.6)} strokeLinecap="round" opacity="0.96"/>
            ))}
          </>
        )}

        {/* 13 · Start/finish */}
        {track.length > 2 && (() => {
          const [x0,y0]=sv(track[0]), [x1,y1]=sv(track[1]);
          const dx=x1-x0,dy=y1-y0,len=Math.sqrt(dx*dx+dy*dy)||1;
          const ext=stw*0.58, px=-dy/len*ext, py=dx/len*ext;
          return (
            <g>
              {/* Checker squares */}
              {[-1,0,1].map(k => (
                <rect key={k}
                  x={x0+px*k*0.5-ss(2)} y={y0+py*k*0.5-ss(2)}
                  width={ss(4)} height={ss(4)}
                  fill={k%2===0?"#fff":"#000"} opacity="0.45"/>
              ))}
              <line x1={x0-px} y1={y0-py} x2={x0+px} y2={y0+py}
                stroke="#fff" strokeWidth={ss(2.2)} opacity="0.45"
                strokeDasharray={`${ss(3.5)},${ss(3)}`}/>
              <text x={x0-px-ss(9)} y={y0-py+fs(4)}
                textAnchor="end" fill="#fff" fontSize={fs(7.5)}
                fontFamily="'JetBrains Mono',monospace" fontWeight="900" opacity="0.4">SF</text>
            </g>
          );
        })()}

        {/* 14 · Sector markers */}
        {circuit?.sectorMarkers?.slice(1).map(sm => {
          const idx = Math.round(sm.lapFrac*n)%n;
          const pt  = track[idx];
          if (!pt) return null;
          const [sx,sy]=sv(pt), [nx2,ny2]=sv(track[(idx+1)%n]);
          const ang=Math.atan2(ny2-sy,nx2-sx)+Math.PI/2;
          const ext=stw*0.62;
          return (
            <g key={`sm${sm.sectorIdx}`}>
              <line
                x1={sx+Math.cos(ang)*ext} y1={sy+Math.sin(ang)*ext}
                x2={sx-Math.cos(ang)*ext} y2={sy-Math.sin(ang)*ext}
                stroke="#facc15" strokeWidth={ss(2.2)} opacity="0.6"
                strokeDasharray={`${ss(3)},${ss(2)}`}/>
              <circle cx={sx+Math.cos(ang)*(ext+ss(14))} cy={sy+Math.sin(ang)*(ext+ss(14))}
                r={ss(10)} fill="rgba(250,204,21,0.12)"
                stroke="rgba(250,204,21,0.45)" strokeWidth={ss(0.9)}/>
              <text x={sx+Math.cos(ang)*(ext+ss(14))} y={sy+Math.sin(ang)*(ext+ss(14))+fs(3.5)}
                textAnchor="middle" fill="#facc15" fontSize={fs(8)}
                fontFamily="'JetBrains Mono',monospace" fontWeight="900">
                S{sm.sectorIdx+1}
              </text>
            </g>
          );
        })}

        {/* 15 · Corner labels + delta callouts */}
        {circuit?.corners?.map(corner => {
          const idx = Math.round(corner.lapFrac*n)%n;
          const pt  = track[idx];
          if (!pt) return null;
          const [lx,ly]=sv(pt);
          if (lx<vb.x-40||lx>vb.x+vb.w+40||ly<vb.y-40||ly>vb.y+vb.h+40) return null;
          const isActive = cursorData&&Math.abs((cursorProgress??0)-corner.lapFrac)<0.058;
          const col   = CORNER_CLR[corner.type]??"#a3e635";
          const r     = ss(isActive?16:11);
          const fSize = fs(isActive?10:8.5);

          // Time loss annotation from segmentAnalyses
          const seg = segmentAnalyses?.find(sa => Math.abs((sa.segment.startDist + sa.segment.endDist) / 2 / totalDist - corner.lapFrac) < 0.08);
          const deltaS = seg ? (seg.deltaMs / 1000) : null;

          // Label offset: push away from track centre
          const [cx2,cy2]=[vb.x+vb.w/2,vb.y+vb.h/2];
          const ddx=lx-cx2, ddy=ly-cy2;
          const ddl=Math.sqrt(ddx*ddx+ddy*ddy)||1;
          const offM=ss(28);
          const [ox,oy]=[ddx/ddl*offM, ddy/ddl*offM];

          return (
            <g key={corner.id} filter={isActive?`url(#${ID}-sm)`:undefined}>
              <circle cx={lx} cy={ly} r={r}
                fill={`${col}${isActive?"22":"12"}`}
                stroke={col} strokeWidth={ss(isActive?1.6:0.9)}
                opacity={isActive?0.95:0.6}/>
              <text x={lx+ox} y={ly+oy+fSize*0.4}
                textAnchor="middle"
                fill={isActive?"#fff":col} fontSize={fSize}
                fontFamily="'JetBrains Mono',monospace"
                fontWeight="800" opacity={isActive?1:0.75}>
                {corner.label.split(" ")[0]}
              </text>
              {/* Delta callout */}
              {deltaS !== null && isActive && (
                <>
                  <rect x={lx+ox-ss(22)} y={ly+oy+fSize*1.1}
                    width={ss(44)} height={fs(13)} rx={ss(3)}
                    fill="rgba(5,5,14,0.9)"
                    stroke={deltaS>0?"rgba(248,113,113,0.5)":"rgba(163,230,53,0.5)"}
                    strokeWidth={ss(0.7)}/>
                  <text x={lx+ox} y={ly+oy+fSize*1.1+fs(9.5)}
                    textAnchor="middle"
                    fill={deltaS>0?"#f87171":"#a3e635"}
                    fontSize={fs(9)} fontFamily="'JetBrains Mono',monospace"
                    fontWeight="800">
                    {deltaS>0?"+":""}{deltaS.toFixed(3)}s
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* 16 · Car trail */}
        {cursorData&&trail.slice(0,-1).map(({p,c},i) => {
          const [tx,ty]=sv(p);
          return <circle key={`tr${i}`} cx={tx} cy={ty}
            r={ss(1.5+i*0.6)} fill={c} opacity={((i+1)/trail.length)*0.5}/>;
        })}

        {/* 17 · Car silhouette + HUD badge */}
        {cursorData&&(()=>{
          const [cx,cy]=sv(cursorData.pt);
          const {headAngle,speed,throttle,brake,gear,latG,spdFrac}=cursorData;
          const col = brake>40?"#f87171":throttle>55?"#a3e635":"#facc15";
          const isBraking = brake>15;

          // Traction circle
          const gNorm = Math.min(1,Math.abs(latG)/3.5);
          const circ  = 2*Math.PI*ss(34);

          // Badge position
          const midX=vb.x+vb.w/2, midY=vb.y+vb.h/2;
          const bx = cx<midX ? cx+ss(30) : cx-ss(95);
          const by = cy<midY ? cy-ss(10) : cy-ss(56);
          const bw=ss(65), bh=ss(52), br=ss(5);
          const f1=fs(14), f2=fs(8.5), f3=fs(7.5), f4=fs(7);

          return (
            <g>
              {/* Traction circle */}
              <circle cx={cx} cy={cy} r={ss(34)}
                fill="transparent" stroke={col} strokeWidth={ss(0.7)} opacity="0.1"/>
              <circle cx={cx} cy={cy} r={ss(34)}
                fill="transparent" stroke={col} strokeWidth={ss(1.4)}
                strokeDasharray={`${circ*gNorm} ${circ}`}
                strokeDashoffset={circ*0.25} opacity="0.45" strokeLinecap="round"
                style={{transform:`rotate(${headAngle-90}deg)`,transformOrigin:`${cx}px ${cy}px`}}/>

              {/* Outer glow */}
              <circle cx={cx} cy={cy} r={ss(22)}
                fill={`${col}0e`} stroke={`${col}28`} strokeWidth={ss(1.5)}
                filter={`url(#${ID}-glow)`}/>
              <circle cx={cx} cy={cy} r={ss(14)}
                fill={`${col}1a`} stroke={`${col}55`} strokeWidth={ss(1.5)}/>

              {/* Car body rotated to heading */}
              <g transform={`rotate(${headAngle},${cx},${cy})`}>
                {/* Main body */}
                <rect x={cx-ss(5.5)} y={cy-ss(15)}
                  width={ss(11)} height={ss(24)} rx={ss(3.5)}
                  fill={col} opacity="0.88"/>
                {/* Front wing */}
                <rect x={cx-ss(8)} y={cy-ss(17.5)}
                  width={ss(16)} height={ss(3)} rx={ss(1.2)}
                  fill={col} opacity="0.7"/>
                {/* Rear diffuser */}
                <rect x={cx-ss(7)} y={cy+ss(9)}
                  width={ss(14)} height={ss(3.5)} rx={ss(1.2)}
                  fill={col} opacity="0.55"/>
                {/* Cockpit */}
                <ellipse cx={cx} cy={cy-ss(2)}
                  rx={ss(3.5)} ry={ss(5.5)}
                  fill="rgba(0,0,0,0.55)"/>
                {/* Wheels */}
                {[[-ss(7.5),-ss(10)],[ss(4.5),-ss(10)],[-ss(7.5),ss(6)],[ss(4.5),ss(6)]].map(([tx,ty2],i) => (
                  <rect key={i} x={cx+tx} y={cy+ty2}
                    width={ss(4.5)} height={ss(6.5)} rx={ss(1.2)}
                    fill="#222230" stroke="#3a3a50" strokeWidth={ss(0.4)}/>
                ))}
                {/* Brake lights when braking */}
                {isBraking && (
                  <>
                    <rect x={cx-ss(6)} y={cy+ss(7)}
                      width={ss(4)} height={ss(2.5)} rx={ss(0.8)}
                      fill="#ff2222" opacity="0.9"
                      filter={`url(#${ID}-sm)`}/>
                    <rect x={cx+ss(2)} y={cy+ss(7)}
                      width={ss(4)} height={ss(2.5)} rx={ss(0.8)}
                      fill="#ff2222" opacity="0.9"
                      filter={`url(#${ID}-sm)`}/>
                  </>
                )}
              </g>

              {/* Core glow dot */}
              <circle cx={cx} cy={cy} r={ss(5.5)}
                fill={col} stroke="#04040c" strokeWidth={ss(2.5)}
                filter={`url(#${ID}-car)`}/>

              {/* ── HUD Badge ──────────────────────────────────────────────── */}
              <rect x={bx} y={by} width={bw} height={bh} rx={br}
                fill="rgba(3,3,11,0.96)" stroke={`${col}55`} strokeWidth={ss(0.8)}/>

              {/* Speed large */}
              <text x={bx+bw*0.45} y={by+bh*0.42} textAnchor="middle"
                fill={col} fontSize={f1}
                fontFamily="'JetBrains Mono',monospace" fontWeight="900">
                {Math.round(speed)}
              </text>
              <text x={bx+bw*0.45} y={by+bh*0.60} textAnchor="middle"
                fill="#2a2a42" fontSize={f3}
                fontFamily="'JetBrains Mono',monospace">km/h</text>

              {/* Gear */}
              <rect x={bx+bw*0.70} y={by+bh*0.08}
                width={bw*0.26} height={bh*0.30} rx={ss(3.5)}
                fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"
                strokeWidth={ss(0.4)}/>
              <text x={bx+bw*0.83} y={by+bh*0.27} textAnchor="middle"
                fill="#9898b8" fontSize={f2}
                fontFamily="'JetBrains Mono',monospace" fontWeight="900">
                {gear<0?"R":gear===0?"N":gear}
              </text>

              {/* Throttle */}
              <rect x={bx+ss(4)} y={by+bh*0.70} width={bw-ss(8)} height={ss(4)} rx={ss(1.5)}
                fill="rgba(74,222,128,0.12)"/>
              <rect x={bx+ss(4)} y={by+bh*0.70} width={(bw-ss(8))*throttle/100} height={ss(4)} rx={ss(1.5)}
                fill="#4ade80"/>
              {/* Brake */}
              <rect x={bx+ss(4)} y={by+bh*0.86} width={bw-ss(8)} height={ss(4)} rx={ss(1.5)}
                fill="rgba(248,113,113,0.12)"/>
              <rect x={bx+ss(4)} y={by+bh*0.86} width={(bw-ss(8))*brake/100} height={ss(4)} rx={ss(1.5)}
                fill="#f87171"/>
            </g>
          );
        })()}
      </svg>

      {/* ── MINI-MAP ─────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-8 right-3 w-24 h-16 pointer-events-none">
        <svg viewBox={miniVbStr} className="w-full h-full opacity-60">
          {/* Mini track */}
          <path d={mkPath(track,2,true)}
            fill="none" stroke="#333348" strokeWidth={tw*1.2}
            strokeLinejoin="round" strokeLinecap="round"/>
          <path d={mkPath(track,2,true)}
            fill="none" stroke="#1e1e2a" strokeWidth={tw}
            strokeLinejoin="round" strokeLinecap="round"/>
          {/* User traj */}
          {trajSegs.slice(0,-1).map((s,i)=>(
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke={s.c} strokeWidth={tw*0.55} strokeLinecap="round" opacity="0.85"/>
          ))}
          {/* Car dot */}
          {cursorData && (() => {
            const [mx,my]=sv(cursorData.pt);
            return <circle cx={mx} cy={my} r={tw*0.9} fill="#a3e635"/>;
          })()}
          {/* Viewport indicator */}
          <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h}
            fill="rgba(163,230,53,0.05)"
            stroke="rgba(163,230,53,0.35)" strokeWidth={tw*0.5}/>
        </svg>
      </div>

      {/* ── DOM overlays ──────────────────────────────────────────────────────── */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"/>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.16em]">
          {circuit?.countryEmoji && `${circuit.countryEmoji} `}
          {circuit?.name ?? trackId.toUpperCase()}
        </span>
        {circuit?.lengthKm && (
          <span className="text-[8px] font-mono text-zinc-700">{circuit.lengthKm} km</span>
        )}
      </div>

      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke="#a3e635" strokeWidth="2.5"/></svg>
          <span className="text-[8px] font-mono text-zinc-500">Ваша линия</span>
        </div>
        {refTraj.length>0&&(
          <div className="flex items-center gap-1.5">
            <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5,3"/></svg>
            <span className="text-[8px] font-mono text-zinc-500">Оптимальная</span>
          </div>
        )}
        {gapRibbon.length>0&&(
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{background:"linear-gradient(135deg,rgba(248,113,113,0.6),rgba(163,230,53,0.5))"}}/>
            <span className="text-[8px] font-mono text-zinc-500">Дельта зона</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-0.5 pointer-events-none">
        {["#143cc8","#0a96f0","#28d248","#dcd814","#ff6e00","#ff1616"].map((c,i)=>(
          <div key={i} style={{background:c,width:13,height:5,borderRadius:2}}/>
        ))}
        <span className="text-[7px] font-mono text-zinc-700 ml-1.5 opacity-60">медленно → торможение</span>
      </div>
    </div>
  );
}
