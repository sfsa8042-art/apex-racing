"use client";
/**
 * LiveTrackMap v6 — performance-optimized.
 *
 * Key perf fixes vs v5:
 *  • Static SVG layer (track, kerbs, trajectory, ribbon, corners, sectors) is
 *    memoized with useMemo and does NOT depend on cursor → reused as the same
 *    element tree on cursor moves, so React skips deep-diffing hundreds of nodes.
 *  • Cursor is rAF-throttled internally → reacts at most once per frame instead
 *    of on every mousemove event.
 *  • Trajectory segment count is capped (~120) regardless of lap length.
 *  Only the car + trail layer re-renders while scrubbing.
 */

import { useMemo, useEffect, useRef, useState } from "react";
import { getSmoothedLine, getCircuit } from "@/lib/tracks/geometry";
import { deriveTrackPath } from "@/lib/telemetry/trackpath";
import { cn } from "@/lib/utils";
import type { Vec2 } from "@/lib/tracks/geometry";
import type { TelemetryRow, SegmentAnalysis, DeltaResult } from "@/types/telemetry";

const W = 1000, H = 580, PAD = 55;
const MAX_SEG = 120;                       // cap trajectory segments
function sv(v: Vec2): [number, number]   { return [v.x * W, (1 - v.y) * H]; }
function sxy(x: number, y: number): [number, number] { return [x * W, (1 - y) * H]; }

function spdClr(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const ST: [number, [number,number,number]][] = [
    [0.00,[20,50,200]],[0.24,[10,145,240]],[0.50,[40,210,65]],
    [0.67,[225,220,15]],[0.83,[255,105,0]],[1.00,[255,22,22]],
  ];
  for (let i=0;i<ST.length-1;i++){const [t0,c0]=ST[i],[t1,c1]=ST[i+1];
    if(t>=t0&&t<=t1){const f=(t-t0)/(t1-t0);
      return `rgb(${c0.map((v,j)=>Math.round(v+(c1[j]-v)*f)).join(",")})`;}}
  return "rgb(255,22,22)";
}
function deltaClr(ds:number):string{
  if(ds>0.15)return "rgba(248,113,113,0.5)";
  if(ds>0.05)return "rgba(251,146,60,0.38)";
  if(ds<-0.05)return "rgba(163,230,53,0.42)";
  return "rgba(255,255,255,0.08)";
}
const CORNER_CLR:Record<string,string>={hairpin:"#f87171",chicane:"#fb923c",slow:"#fbbf24",medium:"#a3e635",fast:"#34d399"};

function mkPath(pts:Vec2[],skip=1,close=false):string{
  if(pts.length<2)return "";
  const s=pts.filter((_,i)=>i%skip===0);
  const [x0,y0]=sv(s[0]);let d=`M ${x0.toFixed(1)} ${y0.toFixed(1)}`;
  for(let i=1;i<s.length;i++){const [px,py]=sv(s[i-1]),[cx,cy]=sv(s[i]);
    d+=` Q ${px.toFixed(1)} ${py.toFixed(1)}, ${((px+cx)/2).toFixed(1)} ${((py+cy)/2).toFixed(1)}`;}
  if(close)d+=" Z";return d;
}
function trackNormal(track:Vec2[],idx:number):[number,number]{
  const n=track.length,pt=track[idx],nxt=track[(idx+2)%n];
  const dx=nxt.x-pt.x,dy=nxt.y-pt.y,len=Math.sqrt(dx*dx+dy*dy)||1e-6;
  return [-dy/len,dx/len];
}
function smoothSignal(vals:number[],window=9):number[]{
  if(vals.length<3)return vals;
  const half=Math.floor(window/2);
  return vals.map((_,i)=>{let sum=0,cnt=0;
    for(let k=-half;k<=half;k++){const j=i+k;if(j>=0&&j<vals.length){sum+=vals[j];cnt++;}}
    return sum/cnt;});
}
function smoothPath(pts:Vec2[],samples=5):Vec2[]{
  if(pts.length<3)return pts;
  const out:Vec2[]=[];const n=pts.length;
  for(let i=0;i<n-1;i++){
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(n-1,i+2)];
    for(let s=0;s<samples;s++){const t=s/samples,t2=t*t,t3=t2*t;
      out.push({
        x:0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y:0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
      });}}
  return out;
}

/** Cap-aware trajectory synthesis. */
function synthTraj(rows:TelemetryRow[],track:Vec2[],totalDist:number,maxOffset:number):Vec2[]{
  if(!track.length||!rows.length)return [];
  const n=track.length;
  const stride=Math.max(4,Math.ceil(rows.length/MAX_SEG));   // cap point count
  const sampled=rows.filter((_,i)=>i%stride===0);
  const steers=smoothSignal(sampled.map(r=>Math.max(-1,Math.min(1,(r.steerAngle??0)/220))),9);
  const raw=sampled.map((r,i)=>{
    const frac=Math.max(0,Math.min(1,(r.lapDist??0)/Math.max(totalDist,1)));
    const idx=Math.min(Math.round(frac*n),n-1);
    const [nx,ny]=trackNormal(track,idx);
    const off=-steers[i]*maxOffset;
    return {x:track[idx].x+nx*off,y:track[idx].y+ny*off};
  });
  return smoothPath(raw,4);
}

type VB={x:number;y:number;w:number;h:number};

interface LiveTrackMapProps{
  trackId:string;userRows:TelemetryRow[];refRows?:TelemetryRow[];
  cursorProgress?:number|null;segmentAnalyses?:SegmentAnalysis[];delta?:DeltaResult;
  onCornerClick?:(segmentId:string)=>void;selectedSegmentId?:string|null;className?:string;
}

export function LiveTrackMap({
  trackId,userRows,refRows,cursorProgress,segmentAnalyses,delta,
  onCornerClick,selectedSegmentId,className,
}:LiveTrackMapProps){
  // Track shape: derived from THIS lap's telemetry (works for any track/sim,
  // no F1 silhouette). Falls back to stored geometry only if the lap lacks the
  // channels needed to reconstruct the path.
  const derived=useMemo(()=>deriveTrackPath(userRows),[userRows]);
  const geomTrack=useMemo(()=>getSmoothedLine(trackId,24)??[],[trackId]);
  const usingDerived=!!(derived&&derived.points.length>10);
  const track=useMemo(()=> usingDerived ? derived!.points.map(p=>({x:p.x,y:p.y})) : geomTrack,[usingDerived,derived,geomTrack]);
  const circuit=useMemo(()=>usingDerived?null:getCircuit(trackId),[usingDerived,trackId]);
  const n=track.length;
  const twNorm=circuit?.trackWidthNorm??0.022;
  const tw=twNorm*W;
  const maxOffset=usingDerived?0:twNorm*0.9;

  const totalDist=userRows.at(-1)?.lapDist??0;
  const maxSpd=useMemo(()=>userRows.reduce((m,r)=>Math.max(m,r.speed),100),[userRows]);

  // In derived mode the centerline IS the driven line → no steering offset.
  const userTraj=useMemo(()=> usingDerived ? track : synthTraj(userRows,track,totalDist,maxOffset),[usingDerived,track,userRows,totalDist,maxOffset]);
  const refTraj=useMemo(()=>refRows?synthTraj(refRows,track,totalDist,twNorm*0.72):[],[refRows,track,totalDist,twNorm]);

  const trajSegs=useMemo(()=>{
    if(!userTraj.length||!userRows.length)return [];
    return userTraj.slice(0,-1).map((pt,i)=>{
      const frac=i/userTraj.length;
      const row=userRows[Math.min(Math.round(frac*userRows.length),userRows.length-1)];
      const [x1,y1]=sv(pt),[x2,y2]=sv(userTraj[i+1]);
      return {x1,y1,x2,y2,c:spdClr(row.speed/maxSpd)};
    });
  },[userTraj,userRows,maxSpd]);

  const gapRibbon=useMemo(()=>{
    if(!userTraj.length||!refTraj.length)return [];
    const minLen=Math.min(userTraj.length,refTraj.length);
    const CHUNK=10;const result:{path:string;color:string}[]=[];
    for(let start=0;start<minLen-CHUNK;start+=CHUNK){
      const end=Math.min(start+CHUNK+1,minLen);
      const fwd=userTraj.slice(start,end).map(p=>sv(p));
      const rev=refTraj.slice(start,end).reverse().map(p=>sv(p));
      const pts=[...fwd,...rev];if(pts.length<3)continue;
      const d=`M ${pts.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(" L ")} Z`;
      const midIdx=Math.round(((start+end)/2/minLen)*((delta?.cumulativeDeltaS.length??1)));
      const ds=delta?.cumulativeDeltaS[Math.min(midIdx,(delta?.cumulativeDeltaS.length??1)-1)]??0;
      result.push({path:d,color:deltaClr(ds)});
    }
    return result;
  },[userTraj,refTraj,delta]);

  // ViewBox — full track always (no zoom)
  const vb=useMemo<VB>(()=>{
    if(!track.length)return {x:0,y:0,w:W,h:H};
    const xs=track.map(p=>p.x*W),ys=track.map(p=>(1-p.y)*H);
    return {x:Math.min(...xs)-PAD,y:Math.min(...ys)-PAD,
      w:Math.max(...xs)-Math.min(...xs)+PAD*2,h:Math.max(...ys)-Math.min(...ys)+PAD*2};
  },[track]);

  // Corner markers: from this lap's detected corners in derived mode, else from
  // stored circuit geometry. Unified shape so the label rendering is identical.
  const cornerMarkers=useMemo(()=>{
    if(usingDerived){
      return (segmentAnalyses??[]).filter(sa=>sa.segment.type==="corner").map(sa=>({
        id:sa.segment.id, label:sa.segment.label, type:"medium",
        lapFrac:((sa.segment.startDist+sa.segment.endDist)/2)/(totalDist||1),
        segId:sa.segment.id as string|undefined,
      }));
    }
    return (circuit?.corners??[]).map(c=>({
      id:c.id, label:c.label, type:c.type as string, lapFrac:c.lapFrac, segId:undefined as string|undefined,
    }));
  },[usingDerived,segmentAnalyses,circuit,totalDist]);

  const ID=`ltm-${trackId}`;

  // ── rAF-throttled cursor: coalesce rapid mousemove into one update/frame ──
  const [dispCursor,setDispCursor]=useState<number|null>(cursorProgress??null);
  const cursorRaf=useRef<number>(0);
  useEffect(()=>{
    cancelAnimationFrame(cursorRaf.current);
    cursorRaf.current=requestAnimationFrame(()=>setDispCursor(cursorProgress??null));
    return ()=>cancelAnimationFrame(cursorRaf.current);
  },[cursorProgress]);

  // Cursor / car data — depends on throttled dispCursor only
  const cursorData=useMemo(()=>{
    if(dispCursor==null||!n)return null;
    const idx=Math.min(Math.round(dispCursor*n),n-1);
    const [nx,ny]=trackNormal(track,idx);
    const ri=Math.min(Math.round(dispCursor*userRows.length),userRows.length-1);
    const row=userRows[ri];
    const steer=Math.max(-1,Math.min(1,(row?.steerAngle??0)/220));
    const carPt={x:track[idx].x+nx*(-steer*maxOffset),y:track[idx].y+ny*(-steer*maxOffset)};
    const nxt=track[(idx+3)%n];
    const dx=nxt.x-track[idx].x,dy=nxt.y-track[idx].y,len=Math.sqrt(dx*dx+dy*dy)||1;
    const headAngle=Math.atan2(-(dy/len),dx/len)*180/Math.PI;
    return {pt:carPt,idx,headAngle,speed:row?.speed??0,throttle:row?.throttle??0,
      brake:row?.brake??0,gear:row?.gear??1,latG:row?.lateralG??0,spdFrac:(row?.speed??0)/maxSpd};
  },[dispCursor,track,userRows,n,maxSpd,maxOffset]);

  // Trail
  const [trail,setTrail]=useState<{p:Vec2,c:string}[]>([]);
  useEffect(()=>{if(!cursorData){setTrail([]);return;}
    setTrail(prev=>[...prev,{p:cursorData.pt,c:spdClr(cursorData.spdFrac)}].slice(-16));},[cursorData]);

  // ── STATIC LAYER — memoized, independent of cursor ───────────────────────────
  // Re-renders only when track/trajectory/selection/geometry changes, NOT on scrub.
  const staticLayer=useMemo(()=>{
    if(!track.length)return null;
    return (
      <g>
        {/* Background */}
        <rect width={W} height={H} fill={`url(#${ID}-bg)`}/>
        {/* Grass */}
        <path d={mkPath(track,1,true)} fill="none" stroke="#09140a" strokeWidth={tw*3.5} strokeLinejoin="round" strokeLinecap="round"/>
        {/* Shadow */}
        <path d={mkPath(track,1,true)} fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth={tw+18} strokeLinejoin="round" strokeLinecap="round"/>
        {/* Kerbs at brake zones */}
        {circuit?.corners?.filter(c=>c.brakeZone).map((corner,ci)=>{
          const cIdx=Math.round(corner.lapFrac*n),span=Math.round(0.04*n),kw=twNorm*0.72;
          return ([1,-1] as const).map((side,si)=>{
            const pts:string[]=[];
            for(let k=cIdx-span;k<=cIdx+span;k++){const idx=((k%n)+n)%n;const pt=track[idx];
              const [nx,ny]=trackNormal(track,idx);const [sx,sy]=sxy(pt.x+nx*kw*side,pt.y+ny*kw*side);
              pts.push(`${k===cIdx-span?"M":"L"} ${sx.toFixed(1)} ${sy.toFixed(1)}`);}
            return (<g key={`k${ci}${si}`}>
              <path d={pts.join(" ")} fill="none" stroke="#dd1111" strokeWidth={6} strokeLinecap="round" strokeDasharray="9,9" opacity="0.6"/>
              <path d={pts.join(" ")} fill="none" stroke="#ffffff" strokeWidth={3.3} strokeLinecap="round" strokeDasharray="9,9" strokeDashoffset="9" opacity="0.3"/>
            </g>);});
        })}
        {/* Edge / asphalt / rubber */}
        <path d={mkPath(track,1,true)} fill="none" stroke="#252535" strokeWidth={tw+5} strokeLinejoin="round" strokeLinecap="round"/>
        <path d={mkPath(track,1,true)} fill="none" stroke="#17171f" strokeWidth={tw} strokeLinejoin="round" strokeLinecap="round"/>
        <path d={mkPath(track,1,true)} fill="none" stroke="#0f0f16" strokeWidth={tw*0.28} strokeLinejoin="round" strokeLinecap="round" opacity="0.7"/>

        {/* Gap ribbon */}
        {gapRibbon.map((seg,i)=>(<path key={`gr${i}`} d={seg.path} fill={seg.color} stroke="none"/>))}

        {/* Ref line */}
        {refTraj.length>0&&(<>
          <path d={mkPath(refTraj,1)} fill="none" stroke="#1d4ed8" strokeWidth={8} opacity="0.12" strokeLinejoin="round" strokeLinecap="round" filter={`url(#${ID}-glow)`}/>
          <path d={mkPath(refTraj,1)} fill="none" stroke="#93c5fd" strokeWidth={2.2} opacity="0.6" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="7,4.5"/>
        </>)}

        {/* User line (glow + main) */}
        {trajSegs.map((s,i)=>(<line key={`ug${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c} strokeWidth={9} strokeLinecap="round" opacity="0.1"/>))}
        {trajSegs.map((s,i)=>(<line key={`ul${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c} strokeWidth={3.4} strokeLinecap="round" opacity="0.95"/>))}

        {/* Start/finish */}
        {track.length>2&&(()=>{
          const [x0,y0]=sv(track[0]),[x1,y1]=sv(track[1]);
          const dx=x1-x0,dy=y1-y0,len=Math.sqrt(dx*dx+dy*dy)||1,ext=tw*0.58;
          const px=-dy/len*ext,py=dx/len*ext;
          return (<g>
            <line x1={x0-px} y1={y0-py} x2={x0+px} y2={y0+py} stroke="#fff" strokeWidth={2.2} opacity="0.45" strokeDasharray="3.5,3"/>
            <text x={x0-px-9} y={y0-py+4} textAnchor="end" fill="#fff" fontSize={8} fontFamily="monospace" fontWeight="900" opacity="0.4">SF</text>
          </g>);})()}

        {/* Sector markers */}
        {circuit?.sectorMarkers?.slice(1).map(sm=>{
          const idx=Math.round(sm.lapFrac*n)%n,pt=track[idx];if(!pt)return null;
          const [sx,sy]=sv(pt),[nx2,ny2]=sv(track[(idx+1)%n]);
          const ang=Math.atan2(ny2-sy,nx2-sx)+Math.PI/2,ext=tw*0.62;
          return (<g key={`sm${sm.sectorIdx}`}>
            <line x1={sx+Math.cos(ang)*ext} y1={sy+Math.sin(ang)*ext} x2={sx-Math.cos(ang)*ext} y2={sy-Math.sin(ang)*ext} stroke="#facc15" strokeWidth={2.2} opacity="0.6" strokeDasharray="3,2"/>
            <circle cx={sx+Math.cos(ang)*(ext+14)} cy={sy+Math.sin(ang)*(ext+14)} r={10} fill="rgba(250,204,21,0.12)" stroke="rgba(250,204,21,0.45)" strokeWidth={0.9}/>
            <text x={sx+Math.cos(ang)*(ext+14)} y={sy+Math.sin(ang)*(ext+14)+3.5} textAnchor="middle" fill="#facc15" fontSize={8} fontFamily="monospace" fontWeight="900">S{sm.sectorIdx+1}</text>
          </g>);})}

        {/* Corner labels (clickable). Highlight on SELECTION only (cursor highlight
            dropped for perf — car already shows cursor position). */}
        {cornerMarkers.map(cm=>{
          const idx=Math.round(cm.lapFrac*n)%n,pt=track[idx];if(!pt)return null;
          const [lx,ly]=sv(pt);
          const seg=cm.segId
            ? segmentAnalyses?.find(sa=>sa.segment.id===cm.segId)
            : segmentAnalyses?.find(sa=>Math.abs((sa.segment.startDist+sa.segment.endDist)/2/totalDist-cm.lapFrac)<0.08);
          const isSelected=!!seg&&selectedSegmentId===seg.segment.id;
          const col=isSelected?"#a3e635":(CORNER_CLR[cm.type]??"#a3e635");
          const r=isSelected?15:11,fSize=isSelected?10:8.5;
          const deltaS=seg&&seg.refSegment?(seg.deltaMs/1000):null;
          const [cx2,cy2]=[vb.x+vb.w/2,vb.y+vb.h/2];
          const ddx=lx-cx2,ddy=ly-cy2,ddl=Math.sqrt(ddx*ddx+ddy*ddy)||1;
          const [ox,oy]=[ddx/ddl*26,ddy/ddl*26];
          return (<g key={cm.id}
            filter={isSelected?`url(#${ID}-sm)`:undefined}
            style={{cursor:onCornerClick&&seg?"pointer":"default"}}
            onClick={()=>{if(onCornerClick&&seg)onCornerClick(seg.segment.id);}}>
            <circle cx={lx} cy={ly} r={22} fill="transparent" pointerEvents="all"/>
            <circle cx={lx} cy={ly} r={r} fill={`${col}${isSelected?"26":"12"}`} stroke={col} strokeWidth={isSelected?1.8:0.9} opacity={isSelected?0.95:0.6}/>
            <text x={lx+ox} y={ly+oy+fSize*0.4} textAnchor="middle" fill={isSelected?"#fff":col} fontSize={fSize} fontFamily="monospace" fontWeight="800" opacity={isSelected?1:0.7}>{cm.label.split(" ")[0]}{cm.label.match(/\d+/)?" "+cm.label.match(/\d+/)![0]:""}</text>
            {deltaS!==null&&isSelected&&(<>
              <rect x={lx+ox-22} y={ly+oy+fSize*1.1} width={44} height={13} rx={3} fill="rgba(5,5,14,0.9)" stroke={deltaS>0?"rgba(248,113,113,0.5)":"rgba(163,230,53,0.5)"} strokeWidth={0.7}/>
              <text x={lx+ox} y={ly+oy+fSize*1.1+9.5} textAnchor="middle" fill={deltaS>0?"#f87171":"#a3e635"} fontSize={9} fontFamily="monospace" fontWeight="800">{deltaS>0?"+":""}{deltaS.toFixed(3)}s</text>
            </>)}
          </g>);})}
      </g>
    );
  },[track,trajSegs,refTraj,gapRibbon,circuit,cornerMarkers,vb,selectedSegmentId,segmentAnalyses,totalDist,n,tw,twNorm,ID,onCornerClick]);

  if(!track.length)return null;
  const vbStr=`${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`;
  const miniVbStr=`${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  return (
    <div className={cn("relative overflow-hidden bg-[#05050d] select-none",className)}>
      <svg viewBox={vbStr} className="w-full h-full" style={{display:"block"}}>
        <defs>
          <filter id={`${ID}-car`} x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="11" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id={`${ID}-glow`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id={`${ID}-sm`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <radialGradient id={`${ID}-bg`} cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#0e0e1c"/><stop offset="100%" stopColor="#05050d"/></radialGradient>
        </defs>

        {/* Memoized static content — reused as same element tree on cursor moves */}
        {staticLayer}

        {/* Trail (dynamic) */}
        {cursorData&&trail.slice(0,-1).map(({p,c},i)=>{const [tx,ty]=sv(p);
          return <circle key={`tr${i}`} cx={tx} cy={ty} r={1.5+i*0.6} fill={c} opacity={((i+1)/trail.length)*0.5}/>;})}

        {/* Car (dynamic) */}
        {cursorData&&(()=>{
          const [cx,cy]=sv(cursorData.pt);
          const {headAngle,speed,throttle,brake,gear,latG}=cursorData;
          const col=brake>40?"#f87171":throttle>55?"#a3e635":"#facc15";
          const isBraking=brake>15;
          const gNorm=Math.min(1,Math.abs(latG)/3.5),circ=2*Math.PI*34;
          const midX=vb.x+vb.w/2,midY=vb.y+vb.h/2;
          const bx=cx<midX?cx+30:cx-95,by=cy<midY?cy-10:cy-56;
          const bw=65,bh=52,br=5,f1=14,f2=8.5,f3=7.5;
          return (<g>
            <circle cx={cx} cy={cy} r={34} fill="transparent" stroke={col} strokeWidth={0.7} opacity="0.1"/>
            <circle cx={cx} cy={cy} r={34} fill="transparent" stroke={col} strokeWidth={1.4} strokeDasharray={`${circ*gNorm} ${circ}`} strokeDashoffset={circ*0.25} opacity="0.45" strokeLinecap="round" style={{transform:`rotate(${headAngle-90}deg)`,transformOrigin:`${cx}px ${cy}px`}}/>
            <circle cx={cx} cy={cy} r={22} fill={`${col}0e`} stroke={`${col}28`} strokeWidth={1.5} filter={`url(#${ID}-glow)`}/>
            <circle cx={cx} cy={cy} r={14} fill={`${col}1a`} stroke={`${col}55`} strokeWidth={1.5}/>
            <g transform={`rotate(${headAngle},${cx},${cy})`}>
              <rect x={cx-5.5} y={cy-15} width={11} height={24} rx={3.5} fill={col} opacity="0.88"/>
              <rect x={cx-8} y={cy-17.5} width={16} height={3} rx={1.2} fill={col} opacity="0.7"/>
              <rect x={cx-7} y={cy+9} width={14} height={3.5} rx={1.2} fill={col} opacity="0.55"/>
              <ellipse cx={cx} cy={cy-2} rx={3.5} ry={5.5} fill="rgba(0,0,0,0.55)"/>
              {[[-7.5,-10],[4.5,-10],[-7.5,6],[4.5,6]].map(([tx,ty2],i)=>(
                <rect key={i} x={cx+tx} y={cy+ty2} width={4.5} height={6.5} rx={1.2} fill="#222230" stroke="#3a3a50" strokeWidth={0.4}/>))}
              {isBraking&&(<>
                <rect x={cx-6} y={cy+7} width={4} height={2.5} rx={0.8} fill="#ff2222" opacity="0.9" filter={`url(#${ID}-sm)`}/>
                <rect x={cx+2} y={cy+7} width={4} height={2.5} rx={0.8} fill="#ff2222" opacity="0.9" filter={`url(#${ID}-sm)`}/>
              </>)}
            </g>
            <circle cx={cx} cy={cy} r={5.5} fill={col} stroke="#04040c" strokeWidth={2.5} filter={`url(#${ID}-car)`}/>
            <rect x={bx} y={by} width={bw} height={bh} rx={br} fill="rgba(3,3,11,0.96)" stroke={`${col}55`} strokeWidth={0.8}/>
            <text x={bx+bw*0.45} y={by+bh*0.42} textAnchor="middle" fill={col} fontSize={f1} fontFamily="monospace" fontWeight="900">{Math.round(speed)}</text>
            <text x={bx+bw*0.45} y={by+bh*0.60} textAnchor="middle" fill="#2a2a42" fontSize={f3} fontFamily="monospace">km/h</text>
            <rect x={bx+bw*0.70} y={by+bh*0.08} width={bw*0.26} height={bh*0.30} rx={3.5} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.4}/>
            <text x={bx+bw*0.83} y={by+bh*0.27} textAnchor="middle" fill="#9898b8" fontSize={f2} fontFamily="monospace" fontWeight="900">{gear<0?"R":gear===0?"N":gear}</text>
            <rect x={bx+4} y={by+bh*0.70} width={bw-8} height={4} rx={1.5} fill="rgba(74,222,128,0.12)"/>
            <rect x={bx+4} y={by+bh*0.70} width={(bw-8)*throttle/100} height={4} rx={1.5} fill="#4ade80"/>
            <rect x={bx+4} y={by+bh*0.86} width={bw-8} height={4} rx={1.5} fill="rgba(248,113,113,0.12)"/>
            <rect x={bx+4} y={by+bh*0.86} width={(bw-8)*brake/100} height={4} rx={1.5} fill="#f87171"/>
          </g>);})()}
      </svg>

      {/* Mini-map (static-ish; cheap) */}
      <div className="absolute bottom-8 right-3 w-24 h-16 pointer-events-none">
        <svg viewBox={miniVbStr} className="w-full h-full opacity-60">
          <path d={mkPath(track,2,true)} fill="none" stroke="#333348" strokeWidth={tw*1.2} strokeLinejoin="round" strokeLinecap="round"/>
          <path d={mkPath(track,2,true)} fill="none" stroke="#1e1e2a" strokeWidth={tw} strokeLinejoin="round" strokeLinecap="round"/>
          {cursorData&&(()=>{const [mx,my]=sv(cursorData.pt);return <circle cx={mx} cy={my} r={tw*0.9} fill="#a3e635"/>;})()}
        </svg>
      </div>

      {/* Overlays */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"/>
        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.16em]">
          {circuit?.countryEmoji&&`${circuit.countryEmoji} `}{circuit?.name??trackId.toUpperCase()}</span>
        {circuit?.lengthKm&&(<span className="text-[8px] font-mono text-zinc-700">{circuit.lengthKm} km</span>)}
      </div>
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke="#a3e635" strokeWidth="2.5"/></svg>
          <span className="text-[8px] font-mono text-zinc-500">Ваша линия</span></div>
        {refTraj.length>0&&(<div className="flex items-center gap-1.5">
          <svg width="20" height="3"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="5,3"/></svg>
          <span className="text-[8px] font-mono text-zinc-500">Оптимальная</span></div>)}
      </div>
      <div className="absolute bottom-3 left-3 flex items-center gap-0.5 pointer-events-none">
        {["#143cc8","#0a96f0","#28d248","#dcd814","#ff6e00","#ff1616"].map((c,i)=>(
          <div key={i} style={{background:c,width:13,height:5,borderRadius:2}}/>))}
        <span className="text-[7px] font-mono text-zinc-700 ml-1.5 opacity-60">медленно → торможение</span>
      </div>
    </div>
  );
}
