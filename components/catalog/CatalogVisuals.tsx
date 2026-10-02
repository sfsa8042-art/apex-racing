"use client";

import { useId } from "react";
import { getCircuit, getSmoothedLine } from "@/lib/tracks/geometry";
import { getTrackLayout } from "@/lib/tracks/database";

export const sectorColors = ["#bef264", "#7dd3fc", "#c4b5fd"];

/** Reuses the circuit library, including its older Nürburgring layout. */
export function CircuitDrawing({ id, label, sector, mini = false }: { id: string; label: string; sector?: number; mini?: boolean }) {
  const circuit = getCircuit(id);
  const fallback = getTrackLayout(id);
  const points = getSmoothedLine(id, 8) ?? fallback?.points.map(p => ({ x: p.x, y: 1 - p.y })) ?? [];
  if (!points.length) return null;
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const width = Math.max(...xs) - minX, height = Math.max(...ys) - minY;
  const scale = Math.min(500 / (width || 1), 260 / (height || 1));
  const xy = (p: { x: number; y: number }) => [50 + (500 - width * scale) / 2 + (p.x - minX) * scale, 30 + (260 - height * scale) / 2 + (height - p.y + minY) * scale];
  const path = points.map((p, i) => `${i ? "L" : "M"}${xy(p).join(",")}`).join(" ") + "Z";
  const boundaries = circuit?.sectorMarkers.map(m => m.lapFrac * 100) ?? fallback?.sectorBoundaries.map(m => m.pointIdx / points.length * 100) ?? [0, 33, 66];
  const start = xy(points[fallback && !circuit ? fallback.sfLineIdx : 0]);
  return <svg viewBox="0 0 600 320" role="img" aria-label={label} className="h-full w-full">
    <path d={path} fill="none" stroke="#303038" strokeWidth={mini ? 12 : 14} strokeLinejoin="round" />
    {mini ? <path d={path} fill="none" stroke="#a1a1aa" strokeWidth="4" strokeLinejoin="round" /> : boundaries.map((begin, i) => <path key={i} d={path} fill="none" pathLength="100" stroke={sectorColors[i]} strokeWidth={sector === i + 1 ? 6 : 4} strokeOpacity={sector && sector !== i + 1 ? .2 : 1} strokeDasharray={`${(boundaries[i + 1] ?? 100) - begin} ${100 - ((boundaries[i + 1] ?? 100) - begin)}`} strokeDashoffset={-begin} strokeLinejoin="round" />)}
    {!mini && <><circle cx={start[0]} cy={start[1]} r="6" fill="#fafafa" stroke="#09090b" strokeWidth="3" /><text x={start[0]} y={start[1] - 14} fill="#e4e4e7" fontSize="13" fontFamily="monospace" textAnchor="middle">S/F</text></>}
  </svg>;
}

export function CountryFlag({ code }: { code: string }) {
  const stripes: Record<string, string[]> = { IT: ["#159765", "#f4f4f5", "#e45459"], BE: ["#27272a", "#facc15", "#ef4444"], DE: ["#27272a", "#e45459", "#facc15"], ES: ["#c52e3e", "#f7c94b", "#c52e3e"] };
  return <svg width="22" height="15" viewBox="0 0 24 16" aria-hidden="true" className="shrink-0 rounded-sm">
    {code === "JP" ? <><path fill="#fafafa" d="M0 0h24v16H0z"/><circle cx="12" cy="8" r="4" fill="#d63e52"/></> : code === "GB" ? <><path fill="#294275" d="M0 0h24v16H0z"/><path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="4"/><path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="6"/><path d="M12 0v16M0 8h24" stroke="#d63e52" strokeWidth="3"/></> : (stripes[code] ?? ["#71717a", "#a1a1aa", "#71717a"]).map((color, i) => <rect key={i} fill={color} x={code === "IT" || code === "BE" ? i * 8 : 0} y={code === "IT" || code === "BE" ? 0 : i * 16 / 3} width={code === "IT" || code === "BE" ? 8 : 24} height={code === "IT" || code === "BE" ? 16 : 16 / 3}/>) }
  </svg>;
}

/** Deliberately stylised, rather than a claim of model-exact body geometry. */
export function CarDrawing({ manufacturer, label, mini = false }: { manufacturer: string; label: string; mini?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const color = manufacturer === "Ferrari" ? "#fb7185" : manufacturer === "BMW" ? "#7dd3fc" : manufacturer === "Mercedes-AMG" ? "#c4b5fd" : "#bef264";
  const roof = manufacturer === "BMW" ? "M200 117 L245 70 Q253 64 275 65 L338 65 Q357 68 395 114" : manufacturer === "Mercedes-AMG" ? "M217 117 L263 81 Q272 74 297 74 L343 79 Q366 88 395 116" : "M190 117 Q225 105 259 76 Q275 65 301 69 Q342 73 384 114";
  return <svg viewBox="0 0 620 240" role="img" aria-label={label}>
    <defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop stopColor={color} stopOpacity=".22"/><stop offset="1" stopColor={color} stopOpacity=".03"/></linearGradient></defs>
    {!mini && <g stroke="#3f3f46" strokeWidth="1"><path d="M55 204H565M55 199v10M565 199v10"/><path d="M70 40v145M65 40h10M65 185h10" strokeDasharray="3 6"/></g>}
    <ellipse cx="312" cy="182" rx="255" ry="13" fill="#000" opacity=".5"/>
    <path d="M76 151L84 128Q123 119 188 115L396 112L491 129Q527 133 546 149L549 170L491 177L126 177L73 169Z" fill={`url(#${uid})`} stroke={color} strokeWidth="2"/>
    <path d={roof} fill={`url(#${uid})`} stroke={color} strokeWidth="2"/>
    <path d="M250 106L276 78L299 78L299 106ZM310 79L333 83L371 107H310Z" fill="#09090b" stroke="#71717a"/>
    <path d="M96 118V93M130 118V93M78 91H150L154 96H78Z" fill="#27272a" stroke={color} strokeWidth="2"/>
    <path d="M207 124H395L416 154H215ZM333 112V162M94 155H113M505 148L529 153M210 172H409" fill="none" stroke={color} strokeOpacity=".5"/>
    <path d="M104 126H130M487 137L524 145" stroke="#f4f4f5" strokeWidth="3"/>
    {[160,455].map(x => <g key={x}><circle cx={x} cy="167" r="34" fill="#09090b" stroke="#52525b" strokeWidth="3"/><circle cx={x} cy="167" r="23" fill="#18181b" stroke="#a1a1aa" strokeWidth="2"/>{[0,60,120].map(a => <path key={a} d={`M${x-20} 167h40`} transform={`rotate(${a} ${x} 167)`} stroke="#71717a" strokeWidth="3"/>)}<circle cx={x} cy="167" r="6" fill={color}/></g>)}
    {!mini && <text x="310" y="226" fill="#71717a" fontFamily="monospace" fontSize="10" letterSpacing="4" textAnchor="middle">APEX / GT3</text>}
  </svg>;
}
