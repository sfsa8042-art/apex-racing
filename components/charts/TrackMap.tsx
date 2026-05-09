"use client";
import { useMemo } from "react";
import { getTrackLayout, type TrackPoint } from "@/lib/tracks/database";
import { cn } from "@/lib/utils";

interface TrackMapProps {
  trackId?:     string;
  activeCorner?: string;
  className?:   string;
  /** Optional user racing line points (normalised 0-1) */
  userLine?:    TrackPoint[];
}

const CANVAS_W = 600;
const CANVAS_H = 360;
const MARGIN   = 32;

function toSvg(pt: TrackPoint): [number, number] {
  const drawW = CANVAS_W - MARGIN * 2;
  const drawH = CANVAS_H - MARGIN * 2;
  return [MARGIN + pt.x * drawW, MARGIN + (1 - pt.y) * drawH];
}

function buildPolyline(pts: TrackPoint[]): string {
  return pts.map((p) => {
    const [x, y] = toSvg(p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

const SECTOR_COLORS = ["#a3e635", "#facc15", "#f87171"];

export function TrackMap({ trackId = "monza", activeCorner, className, userLine }: TrackMapProps) {
  const layout = useMemo(() => getTrackLayout(trackId), [trackId]);

  if (!layout) {
    return (
      <div className={cn("rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center", className)}>
        <p className="text-xs text-zinc-600 font-mono">Track layout unavailable</p>
      </div>
    );
  }

  const pts = layout.points;
  const n   = pts.length;

  // Split track into 3 sectors by colour
  const s1End = layout.sectorBoundaries[1]?.pointIdx ?? Math.floor(n * 0.33);
  const s2End = layout.sectorBoundaries[2]?.pointIdx ?? Math.floor(n * 0.66);

  const sector1Pts = pts.slice(0, s1End + 1);
  const sector2Pts = pts.slice(s1End, s2End + 1);
  const sector3Pts = pts.slice(s2End);

  const sfPt = pts[layout.sfLineIdx];
  const [sfX, sfY] = toSvg(sfPt);

  return (
    <div className={cn("relative rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden", className)}>
      <div className="absolute top-3 left-3 z-10">
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">Track Map</p>
        <p className="text-xs font-medium text-zinc-400 mt-0.5">{layout.name}</p>
      </div>

      <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="w-full h-full">
        {/* Background track shadow */}
        <polyline points={buildPolyline(pts)} fill="none" stroke="#27272a" strokeWidth="16"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Sector 1 */}
        <polyline points={buildPolyline(sector1Pts)} fill="none"
          stroke={SECTOR_COLORS[0]} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />
        {/* Sector 2 */}
        <polyline points={buildPolyline(sector2Pts)} fill="none"
          stroke={SECTOR_COLORS[1]} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />
        {/* Sector 3 */}
        <polyline points={buildPolyline(sector3Pts)} fill="none"
          stroke={SECTOR_COLORS[2]} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" />

        {/* User line overlay */}
        {userLine && userLine.length > 1 && (
          <polyline points={buildPolyline(userLine)} fill="none"
            stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
        )}

        {/* Corner markers */}
        {layout.corners.map((corner) => {
          const [cx, cy] = toSvg({ x: corner.x, y: corner.y });
          const isActive = activeCorner === corner.id;
          return (
            <g key={corner.id}>
              <circle cx={cx} cy={cy} r={isActive ? 9 : 5}
                fill={isActive ? "#a3e635" : "#18181b"}
                stroke={isActive ? "#a3e635" : "#52525b"} strokeWidth="1.5" />
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize="9"
                fill={isActive ? "#a3e635" : "#71717a"} fontFamily="monospace" fontWeight="500">
                {corner.label}
              </text>
            </g>
          );
        })}

        {/* S/F line */}
        <g>
          <rect x={sfX - 7} y={sfY - 3} width={14} height={6} rx={2} fill="#ffffff" opacity={0.85} />
          <text x={sfX} y={sfY - 8} textAnchor="middle" fontSize="8" fill="#71717a" fontFamily="monospace">S/F</text>
        </g>

        {/* Sector labels */}
        {layout.sectorBoundaries.slice(0, 3).map((sb, i) => {
          const midIdx = Math.min(pts.length - 1, sb.pointIdx + Math.floor(
            ((layout.sectorBoundaries[i + 1]?.pointIdx ?? pts.length) - sb.pointIdx) / 2
          ));
          const [lx, ly] = toSvg(pts[midIdx]);
          return (
            <g key={i}>
              <rect x={lx - 12} y={ly - 9} width={24} height={14} rx={4}
                fill="#18181b" stroke={SECTOR_COLORS[i]} strokeWidth="0.5" opacity="0.9" />
              <text x={lx} y={ly + 1.5} textAnchor="middle" fontSize="8"
                fontWeight="700" fill={SECTOR_COLORS[i]} fontFamily="monospace">
                S{i + 1}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
          <div className="w-5 h-1 rounded" style={{ background: SECTOR_COLORS[0] }} />S1
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
          <div className="w-5 h-1 rounded" style={{ background: SECTOR_COLORS[1] }} />S2
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
          <div className="w-5 h-1 rounded" style={{ background: SECTOR_COLORS[2] }} />S3
        </div>
      </div>
    </div>
  );
}
