"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, Check, Info, Flag } from "lucide-react";
import { mockTracks } from "@/lib/mockData";
import { useLang, useCopy } from "@/context/LanguageContext";
import { catalogCopy } from "@/lib/catalog/copy";
import { CircuitDrawing, CountryFlag, sectorColors } from "@/components/catalog/CatalogVisuals";
import { TrackGallery, TrackThumb } from "@/components/catalog/TrackGallery";
import styles from "@/components/catalog/Catalog.module.css";
import type { Track } from "@/types";

function TrackDetail({ track }: { track: Track }) {
  const { lang } = useLang();
  const c = catalogCopy[lang];
  const copy = useCopy();
  const [sector, setSector] = useState<number>();
  const difficulty = { easy: c.easy, medium: c.moderate, hard: c.hard, expert: c.expert };
  return <article className={styles.detail} aria-label={track.name}>
    <div className={styles.hero}>
      <div className={styles.heroHeading}>
        <div className={styles.meta}><CountryFlag code={track.countryCode}/>{copy(track.country)}<span aria-hidden="true">/</span><span>{c.difficulty}: {difficulty[track.difficulty]}</span></div>
        <h2 className={styles.heroTitle}>{track.name}</h2>
      </div>
      <div className={styles.map}>
        <CircuitDrawing id={track.id} label={`${c.layout}: ${track.name}`} sector={sector}/>
        <div className={styles.mapCaption}><span>{c.schematic}</span><span>{sector ? `S${sector}` : c.fullLap}</span></div>
      </div>
      <dl className={styles.stats}>
        <div className={styles.stat}><dt>{c.length}</dt><dd>{track.lengthKm.toLocaleString(lang === "ru" ? "ru-RU" : "en-GB", { minimumFractionDigits: 3 })}<small>{c.km}</small></dd></div>
        <div className={styles.stat}><dt>{c.corners}</dt><dd>{track.corners}</dd></div>
        <div className={styles.stat}><dt>{c.sectors}</dt><dd>{track.sectors.length.toString().padStart(2, "0")}</dd></div>
      </dl>
      <TrackGallery trackId={track.id} />
    </div>
    <div className={styles.tabs} role="group" aria-label={c.explore}>
      <button className={styles.tab} aria-pressed={sector === undefined} onClick={() => setSector(undefined)}>{c.fullLap}</button>
      {track.sectors.map((s, i) => <button key={s.id} className={styles.tab} aria-pressed={sector === s.id} onClick={() => setSector(s.id)}><span style={{ color: sectorColors[i] }}>●</span> S{s.id}</button>)}
    </div>
    <section><h3 className={styles.sectionTitle}>{c.character}</h3><div className={styles.chips}>{track.keyCharacteristics.map(item => <span key={item} className={styles.chip}>{copy(item)}</span>)}</div></section>
    <section>
      <h3 className={styles.sectionTitle}>{c.sectorGuide}</h3>
      <div className={styles.stack}>{track.sectors.map((s, i) => <button key={s.id} className={styles.sector} aria-pressed={sector === s.id} onClick={() => setSector(sector === s.id ? undefined : s.id)}>
        <div className={styles.sectorHead}><span className={styles.sectorNumber} style={{ color: sectorColors[i] }}>S{s.id}</span><div><h4 className={styles.sectorName}>{copy(s.name)}</h4><p className={styles.body}>{copy(s.description)}</p></div></div>
        <div className={styles.sectorCorners} aria-label={c.keyCorners}>{s.corners.map(corner => <span key={corner}>{corner}</span>)}</div>
      </button>)}</div>
    </section>
    <p className={styles.notice}><Info size={16}/>{c.noTiming}</p>
    <section className={styles.callout}><div><h3>{c.prepare}</h3><p className={styles.body}>{c.prepareHint}</p></div><Link href="/telemetry" className={styles.action}>{c.analyze}<ArrowUpRight size={17}/></Link></section>
  </article>;
}

export default function TracksPage() {
  const { lang } = useLang();
  const copy = useCopy();
  const c = catalogCopy[lang];
  const [selected, setSelected] = useState(mockTracks[0]);
  const [collapsed, setCollapsed] = useState(true);
  const [query, setQuery] = useState("");
  const visible = mockTracks.filter(t => `${t.name} ${t.id} ${t.country} ${copy(t.country)} ${copy(t.name)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>{c.library}</p><h1 className={styles.title}>{c.tracks}</h1><p className={styles.intro}>{c.trackIntro}</p></div><span className={styles.count}><strong>{mockTracks.length.toString().padStart(2, "0")}</strong><Flag size={17} className="inline" aria-hidden="true"/></span></header>
    <div className={styles.layout}>
      <aside data-collapsed={collapsed} className={styles.rail} aria-label={c.tracks}>
        <button className={styles.mobilePicker} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><span>{selected.name}</span><span>{copy(collapsed ? "Change selection" : "Close list")}</span></button>
        <div className={styles.railContent}>
        <label className={styles.search}><Search size={17} className="shrink-0"/><input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label={c.searchTracks} placeholder={c.searchTracks}/></label>
        <p className={styles.resultCount} role="status">{c.results}: {visible.length} / {mockTracks.length}</p>
        <div className={styles.list}>{visible.map(track => <button key={track.id} className={styles.choice} aria-pressed={selected.id === track.id} onClick={() => { setSelected(track); setCollapsed(true); }}>
          <TrackThumb trackId={track.id} />
          <div className={styles.choiceBody}><div className={styles.choiceTop}><span className="flex items-center gap-2"><CountryFlag code={track.countryCode}/>{copy(track.country)}</span>{selected.id === track.id && <Check size={15} className="text-lime-400" aria-label={c.selected}/>}</div><h2 className={styles.choiceName}>{track.name}</h2><div className={styles.choiceMeta}><span>{track.lengthKm} {c.km}</span><span>{c.corners}: {track.corners}</span></div></div>
        </button>)}</div>
        {!visible.length && <div className={styles.empty}><strong>{c.empty}</strong>{c.emptyHint}<button onClick={() => setQuery("")} className={styles.clear}>{c.clear}</button></div>}
        </div>
      </aside>
      <TrackDetail key={selected.id} track={selected}/>
    </div>
  </div>;
}
