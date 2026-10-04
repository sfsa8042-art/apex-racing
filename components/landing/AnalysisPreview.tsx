"use client";

import { useState } from "react";
import { useCopy } from "@/context/LanguageContext";
import samples from "./samplePedals.json";

// First two seconds of SAMPLE_REFERENCE_CSV, shipped with the telemetry demo.
export function AnalysisPreview() {
  const copy = useCopy();
  const [index, setIndex] = useState(4);
  const sample = samples[index];
  const x = (time: number) => 44 + time * 248;
  const y = (value: number) => 210 - value * 1.6;
  const path = (channel: "throttle" | "brake") => samples.map((row, i) => `${i ? "L" : "M"}${x(row.time)},${y(row[channel])}`).join(" ");
  return <figure className="rounded-xl border border-zinc-700/70 bg-zinc-950 p-4 sm:p-5">
    <figcaption className="flex flex-wrap justify-between gap-3 text-xs text-zinc-300">
      <span>{copy("Pedal inputs · sample file")}</span>
      <span><span className="text-lime-300">{copy("Throttle")}</span> / <span className="text-red-300">{copy("Brake")}</span></span>
    </figcaption>
    <svg viewBox="0 0 560 245" role="img" aria-label={copy("Throttle and brake over the first two seconds of the sample file")} className="mt-4 w-full">
      {[0,50,100].map(value=><g key={value}><line x1="44" x2="540" y1={y(value)} y2={y(value)} stroke="#27272a"/><text x="8" y={y(value)+4} fill="#a1a1aa" fontSize="12">{value}%</text></g>)}
      <path d={path("throttle")} fill="none" stroke="#bef264" strokeWidth="3" strokeLinejoin="round"/>
      <path d={path("brake")} fill="none" stroke="#fca5a5" strokeWidth="3" strokeLinejoin="round"/>
      <line x1={x(sample.time)} x2={x(sample.time)} y1="35" y2="210" stroke="#e4e4e7" strokeDasharray="4 4"/>
      {[0,1,2].map(time=><text key={time} x={x(time)} y="237" fill="#a1a1aa" fontSize="12" textAnchor="middle">{time} {copy("s")}</text>)}
    </svg>
    <label className="block text-xs text-zinc-300">{copy("Explore a moment")}
      <input type="range" min="0" max={samples.length-1} value={index} onChange={e=>setIndex(Number(e.target.value))} className="mt-2 min-h-8 w-full accent-lime-400"/>
    </label>
    <output className="mt-2 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs" aria-live="polite">
      <span>{sample.time.toFixed(1)} {copy("s")}</span><span className="text-lime-300">{copy("Throttle")}: {sample.throttle}%</span><span className="text-red-300">{copy("Brake")}: {sample.brake}%</span>
    </output>
  </figure>;
}
