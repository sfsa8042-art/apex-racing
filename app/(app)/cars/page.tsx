"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Plus, Info, Search, CircleAlert } from "lucide-react";
import { mockCars } from "@/lib/mockData";
import { getTrackSetupPlan, type Condition } from "@/lib/setup/engine";
import { useLang, useCopy } from "@/context/LanguageContext";
import { catalogCopy } from "@/lib/catalog/copy";
import { CarPhoto } from "@/components/catalog/CarPhoto";
import styles from "@/components/catalog/Catalog.module.css";
import type { Car } from "@/types";

const tracks = [{ id: "monza", name: "Monza" }, { id: "spa", name: "Spa-Francorchamps" }, { id: "silverstone", name: "Silverstone" }, { id: "nurburgring", name: "Nürburgring GP" }];

function CarDetail({ car }: { car: Car }) {
  const copy = useCopy();
  const { lang } = useLang();
  const c = catalogCopy[lang];
  const [tab, setTab] = useState<"overview" | "setup" | "trackSetup">("overview");
  const [track, setTrack] = useState("monza");
  const [condition, setCondition] = useState<Condition>("dry");
  const plan = getTrackSetupPlan(car.id, track, condition);
  const drivetrain = car.drivetrain === "RWD" ? c.rearDrive : car.drivetrain === "FWD" ? c.frontDrive : c.allDrive;
  return <article className={styles.detail} aria-label={`${car.manufacturer} ${car.name}`}>
    <div className={styles.hero}>
      <div className={styles.heroHeading}><div className={styles.meta}><span className="text-lime-300 font-medium">{car.manufacturer}</span><span aria-hidden="true">/</span><span>{car.class}</span><span aria-hidden="true">/</span><span>{drivetrain}</span></div><h2 className={styles.heroTitle}>{car.name}</h2><p className={styles.heroDescription}>{copy(car.description)}</p></div>
      <dl className={`${styles.stats} ${styles.statsFour}`}>{[
        { label: c.power, value: car.powerHp, unit: c.hp }, { label: c.weight, value: car.weightKg, unit: c.kg },
        { label: c.speed, value: car.topSpeedKmh, unit: c.kmh }, { label: c.acceleration, value: car.acceleration0to100.toLocaleString(lang), unit: c.sec },
      ].map(stat => <div key={stat.label} className={styles.stat}><dt>{stat.label}</dt><dd>{stat.value}<small>{stat.unit}</small></dd></div>)}</dl>
      <CarPhoto carId={car.id}/>
    </div>
    <p className={styles.notice}><Info size={16}/>{c.specNote}</p>
    <div className={styles.tabs} role="group" aria-label={c.car}>{(["overview", "setup", "trackSetup"] as const).map(item => <button key={item} className={styles.tab} aria-pressed={tab === item} onClick={() => setTab(item)}>{c[item]}</button>)}</div>
    {tab === "overview" ? <div className={styles.twoCols}>
      <section className={styles.panel}><h3 className={`${styles.sectionTitle} flex items-center gap-2`}><Plus size={18} className="text-lime-400"/>{c.strengths}</h3><ul>{car.strengths.map(item => <li key={item}><Check size={15} className="text-lime-400"/>{copy(item)}</li>)}</ul></section>
      <section className={styles.panel}><h3 className={`${styles.sectionTitle} flex items-center gap-2`}><CircleAlert size={18} className="text-amber-300"/>{c.attention}</h3><ul>{car.weaknesses.map(item => <li key={item}><span aria-hidden="true" className="text-amber-300">·</span>{copy(item)}</li>)}</ul></section>
    </div> : <div className={styles.stack}>
      <p className={`${styles.notice} mb-3`}><Info size={16}/>{c.setupNote}</p>
      {tab === "trackSetup" && <>
        <div className={styles.filters}><label>{c.track}<select value={track} onChange={e => setTrack(e.target.value)}>{tracks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>{c.condition}<select value={condition} onChange={e => setCondition(e.target.value as Condition)}>{(["dry", "wet", "intermediate"] as const).map(item => <option key={item} value={item}>{c[item]}</option>)}</select></label></div>
        <div className={`${styles.panel} my-2`}><p className={styles.eyebrow}>{c.focus}</p><p className={styles.body}>{copy(plan.keySummary)}</p></div>
      </>}
      {(tab === "setup" ? car.setupHints.map(h => ({ ...h, reason: h.recommendation, change: "" })) : plan.recommendations).map((item, i) => <section key={`${item.parameter}-${i}`} className={styles.panel}>
        <div className={styles.setupHeading}><div><p className={styles.category}>{c[item.category]}</p><h3>{copy(item.parameter)}</h3></div><span className={styles.impact}>{c[item.impact]}</span></div>
        {item.change && <p className="text-sm text-zinc-100 font-medium mb-2">{copy(item.change)}</p>}<p className={styles.body}>{copy(item.reason)}</p>
      </section>)}
    </div>}
    <section className={styles.callout}><div><h3>{c.prepare}</h3><p className={styles.body}>{c.prepareHint}</p></div><Link href="/telemetry" className={styles.action}>{c.analyze}<ArrowUpRight size={17}/></Link></section>
  </article>;
}

export default function CarsPage() {
  const copy = useCopy();
  const { lang } = useLang();
  const c = catalogCopy[lang];
  const [selected, setSelected] = useState(mockCars[0]);
  const [collapsed, setCollapsed] = useState(true);
  const [query, setQuery] = useState("");
  const visible = mockCars.filter(car => `${car.manufacturer} ${car.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>{c.library}</p><h1 className={styles.title}>{c.cars}</h1><p className={styles.intro}>{c.carIntro}</p></div><span className={styles.count}><strong>{mockCars.length.toString().padStart(2, "0")}</strong>GT3</span></header>
    <div className={styles.layout}>
      <aside data-collapsed={collapsed} className={styles.rail} aria-label={c.cars}>
        <button className={styles.mobilePicker} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><span>{selected.name}</span><span>{copy(collapsed ? "Change selection" : "Close list")}</span></button>
        <div className={styles.railContent}>
        <label className={styles.search}><Search size={17} className="shrink-0"/><input type="search" aria-label={c.searchCars} placeholder={c.searchCars} value={query} onChange={e => setQuery(e.target.value)}/></label>
        <p className={styles.resultCount} role="status">{c.results}: {visible.length} / {mockCars.length}</p>
        <div className={styles.list}>{visible.map(car => <button key={car.id} className={styles.choice} aria-pressed={selected.id === car.id} onClick={() => { setSelected(car); setCollapsed(true); }}>
          <CarPhoto carId={car.id} thumbnail/>
          <div className={styles.choiceBody}><div className={styles.choiceTop}><span>{car.manufacturer}</span>{selected.id === car.id ? <Check size={15} className="text-lime-400" aria-label={c.selected}/> : <span>GT3</span>}</div><h2 className={styles.choiceName}>{car.name}</h2><div className={styles.choiceMeta}><span>{car.powerHp} {c.hp}</span><span>{car.weightKg} {c.kg}</span></div></div>
        </button>)}</div>
        {!visible.length && <div className={styles.empty}><strong>{c.empty}</strong>{c.emptyHint}<button onClick={() => setQuery("")} className={styles.clear}>{c.clear}</button></div>}
        </div>
      </aside>
      <CarDetail key={selected.id} car={selected}/>
    </div>
  </div>;
}
