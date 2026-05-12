"use client";
import { useState } from "react";
import { MapPin, Clock, ChevronRight, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TrackRenderer } from "@/components/charts/TrackRenderer";
import { mockTracks } from "@/lib/mockData";
import { useLang } from "@/context/LanguageContext";
import { cn, deltaColor } from "@/lib/utils";
import type { Track } from "@/types";
import Link from "next/link";

// Track id → circuit id mapping
const TRACK_TO_CIRCUIT: Record<string, string> = {
  monza: "monza", spa: "spa", silverstone: "silverstone",
  nurburgring: "nurburgring", suzuka: "suzuka",
  imola: "imola", barcelona: "barcelona",
};

function guessCircuitId(track: Track): string {
  const name = track.id.toLowerCase();
  for (const [k, v] of Object.entries(TRACK_TO_CIRCUIT)) {
    if (name.includes(k)) return v;
  }
  return "monza";
}

const DIFFICULTY_CONFIG = {
  easy:   { label: "Easy",   color: "text-lime-400",   bg: "bg-lime-400/10",   border: "border-lime-400/30"   },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  hard:   { label: "Hard",   color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" },
  expert: { label: "Expert", color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30"    },
};

function TrackCard({ track, isSelected, onSelect }: {
  track: Track; isSelected: boolean; onSelect: () => void;
}) {
  const { t } = useLang();
  const diff = DIFFICULTY_CONFIG[track.difficulty];
  const circuitId = guessCircuitId(track);

  return (
    <div onClick={onSelect}
      className={cn(
        "rounded-xl border p-3 cursor-pointer transition-all overflow-hidden",
        isSelected ? "border-lime-400/40 bg-zinc-900 ring-1 ring-lime-400/20" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      )}>
      {/* Mini track preview */}
      <div className="mb-3 rounded-lg overflow-hidden">
        <TrackRenderer trackId={circuitId} height={90} compact showSectors={false}/>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-base">
          {track.countryCode === "IT" ? "🇮🇹" : track.countryCode === "BE" ? "🇧🇪" : track.countryCode === "GB" ? "🇬🇧" : track.countryCode === "JP" ? "🇯🇵" : "🇩🇪"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-semibold text-zinc-100 leading-snug">{track.name.split(" ").slice(0, 3).join(" ")}</p>
            <div className={cn("text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0", diff.color, diff.bg, diff.border)}>
              {diff.label}
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{track.country} · {track.lengthKm}km</p>
          <div className="flex items-center gap-3 mt-1.5">
            {track.yourBest ? (
              <span className="text-xs font-mono tabular text-zinc-300">{track.yourBest}</span>
            ) : (
              <span className="text-xs text-zinc-600 font-mono">{t.tracks.noLap}</span>
            )}
            {track.deltaVsRecord !== undefined && (
              <span className={cn("text-xs font-mono tabular", deltaColor(track.deltaVsRecord))}>
                {track.deltaVsRecord > 0 ? "+" : ""}{(track.deltaVsRecord / 1000).toFixed(3)}s
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrackDetail({ track }: { track: Track }) {
  const { t } = useLang();
  const diff = DIFFICULTY_CONFIG[track.difficulty];
  const circuitId = guessCircuitId(track);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={13} className="text-zinc-500"/>
              <p className="text-xs text-zinc-500">{track.country}</p>
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">{track.name}</h2>
          </div>
          <div className={cn("text-xs font-mono px-2 py-1 rounded-lg border", diff.color, diff.bg, diff.border)}>
            {diff.label}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: t.tracks.length,    value: `${track.lengthKm} km` },
            { label: t.tracks.corners,   value: track.corners },
            { label: t.tracks.lapRecord, value: track.lapRecord },
            { label: t.tracks.yourBest,  value: track.yourBest ?? "—" },
          ].map(({ label, value }) => (
            <div key={String(label)} className="rounded-lg bg-zinc-800 px-3 py-2">
              <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-0.5">{label}</p>
              <p className="text-sm font-mono tabular font-medium text-zinc-200">{value}</p>
            </div>
          ))}
        </div>

        {track.deltaVsRecord !== undefined && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700">
            <TrendingUp size={13} className="text-lime-400 shrink-0"/>
            <p className="text-xs text-zinc-400">
              {t.tracks.gapToRef.replace("{s}", `${Math.abs(track.deltaVsRecord / 1000).toFixed(3)}s`)}
            </p>
          </div>
        )}
      </div>

      {/* HIGH-QUALITY TRACK MAP — TrackRenderer instead of TrackMap */}
      <div>
        <TrackRenderer
          trackId={circuitId}
          height={260}
          showSectors
          className="shadow-xl"
        />
      </div>

      {/* Characteristics */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-medium text-zinc-400 mb-3">Track Characteristics</p>
        <div className="flex flex-wrap gap-2">
          {track.keyCharacteristics.map((char) => (
            <span key={char} className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300">{char}</span>
          ))}
        </div>
      </div>

      {/* Sectors */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-xs font-medium text-zinc-300">Sector Breakdown</p>
        </div>
        <div className="divide-y divide-zinc-800">
          {track.sectors.map((sector) => (
            <div key={sector.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold",
                    sector.id === 1 ? "bg-lime-400/15 text-lime-400" : sector.id === 2 ? "bg-yellow-400/15 text-yellow-400" : "bg-red-400/15 text-red-400"
                  )}>S{sector.id}</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{sector.name}</p>
                    <p className="text-xs text-zinc-500">{sector.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  {[
                    { key:"your", label:"Your time", val:sector.yourTime, cls:"text-zinc-200" },
                    { key:"ref",  label:"Reference",  val:sector.refTime,  cls:"text-zinc-400" },
                    { key:"dlt",  label:"Delta",       val:`${sector.deltaMs > 0 ? "+" : ""}${(sector.deltaMs/1000).toFixed(3)}s`, cls:deltaColor(sector.deltaMs) },
                  ].map(({key,label,val,cls}) => (
                    <div key={key}>
                      <p className="text-[10px] font-mono text-zinc-600 mb-0.5">{label}</p>
                      <p className={cn("text-sm font-mono tabular font-medium", cls)}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {sector.corners.map((corner) => (
                  <span key={corner} className="text-[11px] text-zinc-500 font-mono px-2 py-0.5 rounded bg-zinc-800">{corner}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-2">
        <Link href="/telemetry" className="flex-1">
          <Button variant="primary" className="w-full">
            <Activity size={14}/>
            {t.tracks.analyzeHere.replace("{name}", track.name.split(" ")[0])}
            <ChevronRight size={14}/>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function TracksPage() {
  const { t } = useLang();
  const [selected, setSelected] = useState<Track>(mockTracks[0]);

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-5">
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">{t.tracks.title}</p>
        <h1 className="text-2xl font-semibold text-zinc-100">{t.tracks.subtitle}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t.tracks.available.replace("{n}", String(mockTracks.length))}</p>
      </div>

      <div className="flex gap-6">
        {/* Track list */}
        <div className="w-72 xl:w-80 shrink-0 space-y-3 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {mockTracks.map((track) => (
            <TrackCard key={track.id} track={track} isSelected={selected?.id === track.id} onSelect={() => setSelected(track)}/>
          ))}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {selected && <TrackDetail track={selected}/>}
        </div>
      </div>
    </div>
  );
}
