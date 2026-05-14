"use client";
import React, { useState, useCallback } from "react";
import {
  Upload, RefreshCw, AlertCircle, Zap, BarChart2,
  Map, Layers, Activity, ChevronRight, TrendingDown, TrendingUp,
  Gauge, Clock, Flame,
} from "lucide-react";
import { TelemetryChart }  from "@/components/charts/TelemetryChart";
import { DeltaChart }      from "@/components/charts/DeltaChart";
import { SegmentPanel }    from "@/components/charts/SegmentPanel";
import { TrackHeatmap }    from "@/components/charts/TrackHeatmap";
import { GhostComparison } from "@/components/charts/GhostComparison";
import { WowScreen }       from "./components/WowScreen";
import { CoachPanel }      from "./components/CoachPanel";
import { BeforeAfter }     from "./components/BeforeAfter";
import { useLang }         from "@/context/LanguageContext";
import { useTelemetry }    from "@/context/TelemetryContext";
import { cn }              from "@/lib/utils";
import type { AnalysisInsight } from "@/types/telemetry";

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmtMs = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2,"0")}.${String(ms % 1000).padStart(3,"0")}`;

const scoreColor = (v: number) =>
  v >= 90 ? "text-lime-400" : v >= 75 ? "text-yellow-400" : "text-red-400";
const scoreBg = (v: number) =>
  v >= 90 ? "bg-lime-400/10 border-lime-400/25" : v >= 75 ? "bg-yellow-400/10 border-yellow-400/25" : "bg-red-400/10 border-red-400/25";

type Ch = { id: string; label: string; color: string; unit: string;
  data: number[]; refData: number[]; min: number; max: number; };
type RightTab = "segments" | "insights" | "coach";
type LeftView  = "channels" | "heatmap" | "ghost";

// ─── IDLE / UPLOAD STATE ──────────────────────────────────────────────────────
interface DesktopSession { id: string; filename: string; uploadedAt: string; }

function formatAge(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ч`;
  return `${Math.floor(hrs / 24)} дн`;
}

function DesktopUploads({ onFile }: { onFile: (f: File) => void }) {
  const [sessions, setSessions] = React.useState<DesktopSession[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading]   = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetch_ = async () => {
      try {
        const r = await fetch("/api/sessions?all=1");
        if (!r.ok) return;
        const { sessions: all } = await r.json();
        setSessions((all ?? [])
          .sort((a: DesktopSession, b: DesktopSession) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
          .slice(0, 10));
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 15000);
    return () => clearInterval(t);
  }, []);

  const load = async (s: DesktopSession) => {
    setLoading(s.id);
    try {
      const r = await fetch(`/api/sessions/${s.id}/file`);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      onFile(new File([blob], s.filename, { type: "text/plain" }));
    } catch { alert("Файл недоступен. Загрузи вручную."); }
    finally { setLoading(null); }
  };

  if (!sessions.length) return null;
  const latest = sessions[0];

  return (
    <div className="w-full max-w-lg rounded-2xl border border-zinc-700 overflow-hidden bg-zinc-900/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-lime-400">Загрузки от десктопа</p>
          <p className="text-[11px] text-zinc-400 font-mono truncate">{latest.filename}</p>
        </div>
        <button onClick={() => load(latest)} disabled={loading === latest.id}
          className="px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50 shrink-0">
          {loading === latest.id ? "…" : "Открыть"}
        </button>
        {sessions.length > 1 && (
          <button onClick={() => setExpanded(v => !v)}
            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 shrink-0 px-1">
            {expanded ? "▲" : `▼ ${sessions.length - 1}`}
          </button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
          {sessions.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40">
              <span className="text-[10px] font-mono text-zinc-600 w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-zinc-300 truncate">{s.filename}</p>
                <p className="text-[10px] text-zinc-600">{formatAge(s.uploadedAt)} назад</p>
              </div>
              <button onClick={() => load(s)} disabled={loading === s.id}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-50">
                {loading === s.id ? "…" : "Открыть"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IdleState({ onFile, onSample }: { onFile: (f: File) => void; onSample: () => void }) {
  const [dragging, setDragging] = React.useState(false);
  const ref = React.useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => ref.current?.click()}
        className={cn(
          "w-full max-w-lg rounded-2xl border-2 border-dashed flex flex-col items-center gap-4 py-16 px-8 cursor-pointer transition-all",
          dragging
            ? "border-lime-400 bg-lime-400/5"
            : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/40"
        )}
      >
        <input ref={ref} type="file" className="hidden" accept=".csv,.json,.txt,.ld"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all",
          dragging ? "bg-lime-400/15 border border-lime-400/30" : "bg-zinc-800 border border-zinc-700")}>
          <Upload size={28} className={dragging ? "text-lime-400" : "text-zinc-400"} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-200 mb-1">Перетащи файл круга сюда</p>
          <p className="text-xs text-zinc-500">CSV · JSON · .ld · любой симулятор</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={e => { e.stopPropagation(); onSample(); }}
            className="text-xs text-zinc-500 hover:text-lime-400 transition-colors font-mono underline underline-offset-2">
            Загрузить пример →
          </button>
        </div>
      </div>

      {/* Desktop uploads */}
      <DesktopUploads onFile={onFile} />

      {/* Tips */}
      <div className="flex items-center gap-6 text-[11px] text-zinc-600 font-mono">
        {["iRacing .ibt", "ACC CSV", "MoTeC .ld", "rFactor 2"].map(s => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-zinc-700" />{s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ value, label, size = 52 }: { value: number; label: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const stroke = circ * (1 - value / 100);
  const color = value >= 90 ? "#a3e635" : value >= 75 ? "#facc15" : "#f87171";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272a" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={stroke}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold font-mono" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── INSIGHT ITEM ─────────────────────────────────────────────────────────────
function InsightRow({ ins, selected, onSelect }: {
  ins: AnalysisInsight & { _segLabel?: string }; selected: boolean; onSelect: () => void;
}) {
  const cat = ins.category;
  const colors: Record<string, { dot: string; ring: string }> = {
    brake:    { dot: "bg-red-400",    ring: "border-red-400/30" },
    throttle: { dot: "bg-green-400",  ring: "border-green-400/30" },
    speed:    { dot: "bg-yellow-400", ring: "border-yellow-400/30" },
    good:     { dot: "bg-lime-400",   ring: "border-lime-400/30" },
  };
  const c = colors[cat] ?? { dot: "bg-zinc-400", ring: "border-zinc-700" };

  return (
    <button onClick={onSelect}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-zinc-800/60 transition-all",
        selected ? "bg-zinc-800/60" : "hover:bg-zinc-800/30"
      )}>
      <div className="flex items-start gap-3">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", c.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{(ins as any)._segLabel}</span>
            {ins.timeCostMs > 0 && (
              <span className="text-[10px] font-mono text-red-400 ml-auto shrink-0">
                −{(ins.timeCostMs / 1000).toFixed(3)}с
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">{ins.descriptionRu}</p>
        </div>
      </div>
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function TelemetryPage() {
  const { t } = useLang();
  const {
    uploadState, chartChannels, handleFile, reset, loadSampleData,
    driverProfile, wowSummary, heatmapData, showWow, dismissWow,
    coachMessage, nextActions,
  } = useTelemetry();
  const { status, error, filename, parsedLap, analysisResult } = uploadState;

  const [visibleCh, setVisibleCh] = useState(["speed", "throttle", "brake", "delta"]);
  const [rightTab, setRightTab]   = useState<RightTab>("segments");
  const [leftView, setLeftView]   = useState<LeftView>("channels");
  const [selIns, setSelIns]       = useState<(AnalysisInsight & { _segLabel?: string }) | null>(null);

  const toggleCh = (id: string) =>
    setVisibleCh(prev => prev.includes(id)
      ? prev.length > 1 ? prev.filter(c => c !== id) : prev
      : [...prev, id]);

  const channels = (chartChannels as Ch[] | null) ?? [];
  const lapTimeStr = parsedLap ? fmtMs(parsedLap.lapTimeMs) : "—";
  const refTimeMs  = analysisResult ? parsedLap!.lapTimeMs - analysisResult.totalTimeDeltaMs : 0;
  const refTimeStr = refTimeMs ? fmtMs(refTimeMs) : "—";
  const gapMs      = analysisResult?.totalTimeDeltaMs ?? 0;
  const totalDistM = parsedLap ? (parsedLap.rows.at(-1)?.lapDist ?? 0) : 0;

  const allInsights = (analysisResult?.segmentAnalyses
    .flatMap(sa => sa.insights.map(i => ({ ...i, segment: sa.segment.label })))
    .filter(i => i.type !== "good_segment") ?? []) as any[];

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">

      {/* ── WOW OVERLAY ─────────────────────────────────────────────────────── */}
      {showWow && wowSummary && (
        <WowScreen summary={wowSummary} onDismiss={dismissWow}
          lapTimeStr={lapTimeStr} levelProgress={null} driverRank={null} xpEarned={50} />
      )}

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-11 border-b border-zinc-800/80 shrink-0 bg-zinc-950">
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Телеметрия</span>

        {status === "done" && filename && (
          <>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60">
              <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
              <span className="text-[11px] font-mono text-zinc-300 max-w-[180px] truncate">{filename}</span>
            </div>
          </>
        )}

        <div className="flex-1" />

        {status === "done" && (
          <>
            {/* View switcher */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
              {([["channels", Activity, "Каналы"], ["heatmap", Map, "Карта"], ["ghost", Layers, "Ghost"]] as const).map(([v, Icon, label]) => (
                <button key={v} onClick={() => setLeftView(v as LeftView)}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                    leftView === v ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>
                  <Icon size={11} />{label}
                </button>
              ))}
            </div>

            {/* Channel toggles */}
            {leftView === "channels" && (
              <div className="flex items-center gap-1">
                {channels.map(ch => (
                  <button key={ch.id} onClick={() => toggleCh(ch.id)}
                    className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition-all",
                      visibleCh.includes(ch.id)
                        ? "bg-zinc-800 border-zinc-600 text-zinc-200"
                        : "border-zinc-800 text-zinc-600 hover:border-zinc-700")}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: visibleCh.includes(ch.id) ? ch.color : "#52525b" }} />
                    {ch.label}
                  </button>
                ))}
              </div>
            )}

            <div className="w-px h-4 bg-zinc-800" />
            <button onClick={reset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700">
              <RefreshCw size={11} /> Новый круг
            </button>
          </>
        )}

        {(status === "idle" || status === "error") && (
          <button onClick={() => {
            const i = document.createElement("input"); i.type = "file"; i.accept = ".csv,.json,.txt,.ld";
            i.onchange = e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); };
            i.click();
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-semibold transition-all">
            <Upload size={12} /> Загрузить
          </button>
        )}
      </div>

      {/* ── IDLE / ERROR ─────────────────────────────────────────────────────── */}
      {(status === "idle" || status === "error") && (
        <div className="flex-1 flex flex-col min-h-0">
          {status === "error" && (
            <div className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-red-400/25 bg-red-400/6">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-300 flex-1">{error}</p>
              <button onClick={reset} className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800">Повтор</button>
            </div>
          )}
          <IdleState onFile={handleFile} onSample={loadSampleData} />
        </div>
      )}

      {/* ── PROCESSING ───────────────────────────────────────────────────────── */}
      {(status === "parsing" || status === "analyzing") && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-lime-400/30 border-t-lime-400 animate-spin mx-auto" />
            <p className="text-sm font-mono text-zinc-400">
              {status === "parsing" ? "Парсинг данных…" : "Анализ круга…"}
            </p>
          </div>
        </div>
      )}

      {/* ── ANALYSIS VIEW ────────────────────────────────────────────────────── */}
      {status === "done" && analysisResult && channels.length > 0 && (
        <div className="flex-1 flex min-h-0 overflow-hidden">

          {/* ══ LEFT: DATA CANVAS ══════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

            {/* ── METRICS STRIP ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-0 shrink-0 border-b border-zinc-800/60 bg-zinc-950/80">

              {/* Lap times */}
              <div className="flex items-center gap-6 px-5 py-3 border-r border-zinc-800/60">
                <div>
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">Ваш круг</p>
                  <p className="text-xl font-mono font-bold text-lime-400 tabular-nums">{lapTimeStr}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">Референс</p>
                  <p className="text-xl font-mono font-semibold text-zinc-300 tabular-nums">{refTimeStr}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">Разрыв</p>
                  <p className={cn("text-xl font-mono font-bold tabular-nums",
                    gapMs > 0 ? "text-red-400" : "text-lime-400")}>
                    {gapMs > 0 ? "+" : ""}{(gapMs / 1000).toFixed(3)}с
                  </p>
                </div>
              </div>

              {/* Sector deltas */}
              {analysisResult.sectors.length > 0 && (
                <div className="flex items-center gap-4 px-5 py-3 border-r border-zinc-800/60">
                  {analysisResult.sectors.map(s => (
                    <div key={s.sectorIdx}>
                      <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-0.5">S{s.sectorIdx + 1}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono tabular-nums text-zinc-200">
                          {(s.userTimeMs / 1000).toFixed(3)}
                        </span>
                        <span className={cn("text-[11px] font-mono tabular-nums",
                          s.deltaMs > 0 ? "text-red-400" : "text-lime-400")}>
                          {s.deltaMs > 0 ? "+" : ""}{(s.deltaMs / 1000).toFixed(3)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Scores */}
              <div className="flex items-center gap-4 px-5 py-2 border-r border-zinc-800/60">
                <ScoreRing value={analysisResult.overallScore} label="Общий" />
                {analysisResult.subScores && (
                  <>
                    <ScoreRing value={analysisResult.subScores.braking}     label="Торм"  size={44} />
                    <ScoreRing value={analysisResult.subScores.throttle}    label="Газ"   size={44} />
                    <ScoreRing value={analysisResult.subScores.lines}       label="Линии" size={44} />
                    <ScoreRing value={analysisResult.subScores.consistency} label="Пост"  size={44} />
                  </>
                )}
              </div>

              {/* Stats */}
              {parsedLap && (
                <div className="flex items-center gap-4 px-5 py-3 flex-1">
                  {[
                    { icon: Flame, label: "MAX SPEED", value: `${Math.round(parsedLap.channelStats.maxSpeed)} km/h`, color: "text-lime-400" },
                    { icon: BarChart2, label: "AVG THROTTLE", value: `${Math.round(parsedLap.channelStats.avgThrottle)}%`, color: "text-green-400" },
                    { icon: Clock, label: "BRAKE ZONES", value: parsedLap.channelStats.brakingEvents.length, color: "text-red-400" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Icon size={9} className={color} />
                        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">{label}</p>
                      </div>
                      <p className={cn("text-sm font-mono font-semibold tabular-nums", color)}>{value}</p>
                    </div>
                  ))}
                  {/* Optimal gain */}
                  {analysisResult.optimalLap.potentialGainMs > 0 && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border border-lime-400/20 bg-lime-400/6">
                      <Zap size={11} className="text-lime-400" />
                      <div>
                        <p className="text-[9px] font-mono text-zinc-500 uppercase">Потенциал</p>
                        <p className="text-sm font-mono font-bold text-lime-400">
                          −{(analysisResult.optimalLap.potentialGainMs / 1000).toFixed(3)}с
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── CHART CANVAS ──────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {leftView === "channels" && (
                <div className="space-y-0">
                  {/* Main channels */}
                  <TelemetryChart
                    channels={channels as any}
                    visibleChannels={visibleCh}
                    className="w-full rounded-none border-0 border-b border-zinc-800/60"
                  />

                  {/* Delta chart */}
                  <div className="bg-zinc-950">
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800/40">
                      <BarChart2 size={11} className="text-blue-400" />
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Delta Time</span>
                      <div className="flex items-center gap-3 ml-auto text-[10px] font-mono">
                        <span className="text-red-400 flex items-center gap-1">
                          <TrendingDown size={9} /> Отставание
                        </span>
                        <span className="text-lime-400 flex items-center gap-1">
                          <TrendingUp size={9} /> Опережение
                        </span>
                      </div>
                    </div>
                    <DeltaChart delta={analysisResult.delta} totalDistM={totalDistM}
                      height={140} className="w-full" />
                  </div>

                  {/* Optimal lap banner */}
                  {analysisResult.optimalLap.summaryRu && (
                    <div className="flex items-center gap-4 px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/40">
                      <Zap size={14} className="text-lime-400 shrink-0" />
                      <p className="text-xs text-zinc-300 flex-1">{analysisResult.optimalLap.summaryRu}</p>
                      {analysisResult.optimalLap.segmentContributions.slice(0, 3).map(c => (
                        <span key={c.segmentLabel}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 shrink-0">
                          {c.segmentLabel} −{(c.gainMs / 1000).toFixed(3)}с
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {leftView === "heatmap" && heatmapData && (
                <div className="p-4 space-y-4">
                  <TrackHeatmap data={heatmapData}
                    segmentAnalyses={analysisResult.segmentAnalyses} trackId="monza" height={340} />
                  {analysisResult.segmentAnalyses.filter(sa => sa.segment.type === "corner" && sa.deltaMs > 0)
                    .sort((a, b) => b.deltaMs - a.deltaMs).slice(0, 3).map(sa => (
                    <div key={sa.segment.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900">
                      <div className="w-8 h-8 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center shrink-0">
                        <TrendingDown size={14} className="text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-zinc-200">{sa.segment.label}</p>
                        <p className="text-[11px] text-zinc-500">{sa.insights[0]?.descriptionRu?.slice(0, 80)}…</p>
                      </div>
                      <p className="text-red-400 font-mono text-sm font-bold">−{(sa.deltaMs / 1000).toFixed(3)}с</p>
                    </div>
                  ))}
                </div>
              )}

              {leftView === "ghost" && channels.length > 0 && (
                <div className="p-4 space-y-4">
                  <GhostComparison channels={channels.filter(c => c.id !== "delta") as any} />
                  {(() => {
                    const top = analysisResult.segmentAnalyses
                      .filter(sa => sa.segment.type === "corner" && sa.insights.length)
                      .sort((a, b) => b.deltaMs - a.deltaMs)[0];
                    const ins = top?.insights[0];
                    if (!ins || ins.type === "good_segment") return null;
                    const chId = ins.type.includes("brake") ? "brake" : ins.type.includes("throttle") ? "throttle" : "speed";
                    const ch = channels.find(c => c.id === chId);
                    if (!ch) return null;
                    const total = parsedLap?.rows.at(-1)?.lapDist ?? 1;
                    const si = Math.round((top.segment.startDist / total) * ch.data.length);
                    const ei = Math.min(si + 60, Math.round((top.segment.endDist / total) * ch.data.length));
                    return (
                      <div>
                        <p className="text-xs font-medium text-zinc-400 mb-2">Главная проблема — до/после</p>
                        <BeforeAfter data={{
                          segmentLabel: top.segment.label, issueType: ins.type,
                          currentData: ch.data.slice(si, ei), optimalData: ch.refData.slice(si, ei),
                          channelLabel: ch.label, channelColor: ch.color, unit: ch.unit,
                          gainS: ins.timeCostMs / 1000, tipShort: ins.type.replace(/_/g, " "),
                          tipDetail: ins.descriptionRu,
                        }} />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* ══ RIGHT: ANALYSIS PANEL ══════════════════════════════════════════ */}
          <div className="w-96 shrink-0 border-l border-zinc-800/60 flex flex-col bg-zinc-950">

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-zinc-800/60">
              {([
                ["segments", "Участки"],
                ["insights", "Инсайты"],
                ["coach",    "Тренер"],
              ] as const).map(([k, label]) => (
                <button key={k} onClick={() => setRightTab(k)}
                  className={cn("flex-1 py-3 text-xs font-medium transition-colors relative",
                    rightTab === k ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>
                  {label}
                  {rightTab === k && (
                    <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-lime-400 rounded-t" />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {rightTab === "segments" && (
                <SegmentPanel
                  segmentAnalyses={analysisResult.segmentAnalyses}
                  totalTimeDeltaMs={analysisResult.totalTimeDeltaMs}
                />
              )}

              {rightTab === "insights" && (
                <div className="flex flex-col">
                  {/* Summary */}
                  <div className="px-4 py-3 border-b border-zinc-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-zinc-300">Анализ круга</p>
                      <span className={cn("text-xs font-mono font-bold", gapMs > 0 ? "text-red-400" : "text-lime-400")}>
                        {gapMs > 0 ? "−" : "+"}{Math.abs(gapMs / 1000).toFixed(3)}с
                      </span>
                    </div>
                    {analysisResult.dominantWeakness && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/6 border border-red-400/15">
                        <AlertCircle size={11} className="text-red-400 shrink-0" />
                        <p className="text-[11px] text-red-300">
                          Главная слабость: <strong>{analysisResult.dominantWeakness}</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Issues */}
                  {allInsights.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center px-4">
                      <div className="text-4xl mb-3">🏆</div>
                      <p className="text-sm font-medium text-zinc-300">Отличный круг!</p>
                      <p className="text-xs text-zinc-500 mt-1">Существенных ошибок не найдено</p>
                    </div>
                  ) : allInsights.map((ins, i) => (
                    <InsightRow key={i} ins={ins}
                      selected={selIns === ins}
                      onSelect={() => setSelIns(selIns === ins ? null : ins)} />
                  ))}

                  {/* Expanded insight */}
                  {selIns && (
                    <div className="mx-3 mb-3 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                      <p className="text-xs text-zinc-300 leading-relaxed">{selIns.descriptionRu}</p>
                      {selIns.timeCostMs > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full transition-all"
                              style={{ width: `${Math.min(100, selIns.timeCostMs / 4)}%` }} />
                          </div>
                          <span className="text-[11px] font-mono text-red-400 shrink-0">
                            −{(selIns.timeCostMs / 1000).toFixed(3)}с
                          </span>
                        </div>
                      )}
                      {selIns.academyModuleTitleRu && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                          <ChevronRight size={9} className="text-lime-400" />
                          <span>Академия: </span>
                          <span className="text-lime-400">{selIns.academyModuleTitleRu}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {rightTab === "coach" && (
                <CoachPanel
                  message={coachMessage ?? { tone: "analytical", headline: "Анализ завершён", body: "", actionLine: "" }}
                  positives={[]}
                  patterns={null}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
