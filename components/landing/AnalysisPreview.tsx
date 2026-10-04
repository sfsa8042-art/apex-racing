"use client";

import Link from "next/link";
import { ArrowUpRight, Activity, CornerDownRight, Target } from "lucide-react";
import { useCopy } from "@/context/LanguageContext";
import samples from "./samplePedals.json";
import styles from "./AnalysisPreview.module.css";

// Measured pedal values from the first two seconds of SAMPLE_REFERENCE_CSV.
// The corner drawing is an explanatory schematic, not GPS from this file.
export function AnalysisPreview() {
  const copy = useCopy();
  const x = (time: number) => 38 + time * 244;
  const y = (value: number) => 196 - value * 1.42;
  const path = (channel: "throttle" | "brake") => samples.map((row, i) => `${i ? "L" : "M"}${x(row.time)},${y(row[channel])}`).join(" ");
  return <section id="analysis-preview" className={styles.preview} aria-label={copy("Example analysis · demo data")}>
    <header className={styles.toolbar}>
      <div className={styles.brand}><span className={styles.logo}>AP</span><strong>APEX</strong><span className={styles.divider}/><span>{copy("Lap analysis")}</span></div>
      <span className={styles.demo}><span/>{copy("Demo data")}</span>
    </header>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>{copy("From data to your next move")}</p><h3>{copy("One moment. A clear next step.")}</h3></div>
      <span className={styles.file}><Activity size={14}/>{copy("Two seconds of telemetry")}</span>
    </div>
    <div className={styles.workspace}>
      <figure className={styles.corner}>
        <figcaption><CornerDownRight size={15}/>{copy("Corner entry")}<span>01</span></figcaption>
        <svg viewBox="0 0 360 260" role="img" aria-label={copy("Illustrative corner schematic, not recorded GPS")}>
          <defs><pattern id="preview-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#ffffff" strokeOpacity=".035"/></pattern></defs>
          <rect width="360" height="260" fill="url(#preview-grid)"/>
          <path d="M38 216 L119 135 Q201 48 240 109 Q260 148 309 47" fill="none" stroke="#30343a" strokeWidth="44"/>
          <path d="M38 216 L119 135 Q201 48 240 109 Q260 148 309 47" fill="none" stroke="#15181b" strokeWidth="40"/>
          <path d="M38 216 L119 135 Q201 48 240 109 Q260 148 309 47" fill="none" stroke="#61666c" strokeWidth="1" strokeDasharray="4 7"/>
          <path d="M38 216 L119 135 Q201 48 240 109 Q260 148 309 47" fill="none" stroke="#bef264" strokeWidth="3"/>
          <circle cx="116" cy="138" r="22" fill="#bef264" fillOpacity=".08" stroke="#bef264" strokeOpacity=".25"/>
          <circle cx="116" cy="138" r="12" fill="none" stroke="#bef264" strokeOpacity=".45"/>
          <circle cx="116" cy="138" r="6" fill="#bef264" stroke="#10130b" strokeWidth="3"/>
          <path d="M123 134 L152 165 H230" stroke="#a1a1aa" fill="none"/>
          <text x="158" y="184" fill="#e4e4e7" fontSize="12" fontFamily="monospace">{copy("Selected moment")}</text>
          <text x="25" y="245" fill="#71717a" fontSize="10" fontFamily="monospace">{copy("Schematic illustration")}</text>
        </svg>
        <p className={styles.mapNote}>{copy("Spot the input. Understand the technique.")}</p>
      </figure>
      <figure className={styles.chart}>
        <figcaption><span>{copy("Pedal inputs")}</span><div><span className={styles.throttle}>● {copy("Throttle")}</span><span className={styles.brake}>● {copy("preview.brake")}</span></div></figcaption>
        <svg viewBox="0 0 560 235" role="img" aria-label={copy("Throttle and brake over the first two seconds of the sample file")}>
          {[0,50,100].map(value=><g key={value}><line x1="38" x2="526" y1={y(value)} y2={y(value)} stroke="#292c30"/><text x="2" y={y(value)+4} fill="#94999f" fontSize="11">{value}%</text></g>)}
          <rect x={x(.35)} y="40" width="25" height="156" fill="#bef264" fillOpacity=".07"/>
          <path d={`${path("throttle")} L526 196 H38 Z`} fill="#bef264" fillOpacity=".035"/>
          <path d={path("throttle")} fill="none" stroke="#bef264" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d={path("brake")} fill="none" stroke="#f5a38e" strokeWidth="2.5" strokeLinejoin="round"/>
          <line x1={x(.4)} x2={x(.4)} y1="40" y2="196" stroke="#d4d4d8" strokeOpacity=".5" strokeDasharray="3 5"/>
          <circle cx={x(.4)} cy={y(80)} r="4" fill="#bef264" stroke="#101214" strokeWidth="2"/>
          <circle cx={x(.4)} cy={y(5)} r="4" fill="#f5a38e" stroke="#101214" strokeWidth="2"/>
          <rect x={x(.4)-28} y="9" width="56" height="25" rx="6" fill="#bef264" fillOpacity=".12" stroke="#bef264" strokeOpacity=".2"/>
          <text x={x(.4)} y="26" textAnchor="middle" fill="#bef264" fontSize="12" fontFamily="monospace">0.4 {copy("s")}</text>
          {[0,.5,1,1.5,2].map(time=><text key={time} x={x(time)} y="222" fill="#94999f" fontSize="11" textAnchor="middle">{time.toFixed(1)} {copy("s")}</text>)}
        </svg>
        <dl className={styles.readouts}><div><dt>{copy("Selected moment")}</dt><dd>0.4 <small>{copy("s")}</small></dd></div><div><dt>{copy("Throttle")}</dt><dd className={styles.throttle}>80<small>%</small></dd><span className={styles.meter} aria-hidden="true"><span style={{width:"80%",background:"#bef264"}}/></span></div><div><dt>{copy("preview.brake")}</dt><dd className={styles.brake}>5<small>%</small></dd><span className={styles.meter} aria-hidden="true"><span style={{width:"5%",background:"#f5a38e"}}/></span></div></dl>
      </figure>
    </div>
    <div className={styles.insight}>
      <div className={styles.finding}><span className={styles.icon}><Target size={19}/></span><div><p className={styles.eyebrow}>{copy("What the data shows")}</p><h4>{copy("Throttle and brake overlap")}</h4><p>{copy("At this moment, both pedals are pressed. Check whether the overlap is intentional.")}</p></div></div>
      <div className={styles.action}><span className={styles.eyebrow}><span className={styles.step}>→</span>{copy("Try on your next lap")}</span><p>{copy("Release the brake before applying throttle, unless you are deliberately using left-foot braking to balance the car.")}</p></div>
    </div>
    <footer className={styles.footer}><span>{copy("A sample, not a prediction of your lap time.")}</span><Link href="/telemetry">{copy("Analyse my lap")}<ArrowUpRight size={17}/></Link></footer>
  </section>;
}
