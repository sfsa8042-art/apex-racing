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
type RightTab = "segments" | "insights" | "coach" | "engineer";
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


// ─── INLINE ENGINEER TAB ─────────────────────────────────────────────────────
function EngineerInlineTab({ analysisResult, lapTimeStr }: {
  analysisResult: import("@/types/telemetry").LapAnalysisResult;
  lapTimeStr: string;
}) {
  const [messages, setMessages] = React.useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const context = React.useMemo(() => {
    const issues = analysisResult.segmentAnalyses
      .flatMap(sa => sa.insights)
      .filter(i => i.type !== "good_segment")
      .slice(0, 5)
      .map(i => i.descriptionRu)
      .join("; ");
    return `Время круга: ${lapTimeStr}. Скор: ${analysisResult.overallScore}/100. Проблемы: ${issues}`;
  }, [analysisResult, lapTimeStr]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user" as const, content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextSummary: context, message: text, history: messages, personality: "calm", lang: "ru" }),
      });
      const data = await res.json();
      if (data.reply) setMessages([...history, { role: "assistant", content: data.reply }]);
    } catch {}
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  React.useEffect(() => {
    if (!messages.length) {
      fetch(`/api/engineer?ctx=${encodeURIComponent(context)}&lang=ru`)
        .then(r => r.json())
        .then(d => { if (d.briefing) setMessages([{ role: "assistant", content: d.briefing }]); })
        .catch(() => {});
    }
  }, []);

  const QUICK = ["Где я теряю больше всего?", "Как улучшить апекс?", "Советы по торможению"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-lime-400/15 border border-lime-400/25 flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={10} className="text-lime-400" />
              </div>
            )}
            <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed",
              m.role === "user"
                ? "bg-zinc-800 text-zinc-200 rounded-tr-sm"
                : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-sm")}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-lime-400/15 border border-lime-400/25 flex items-center justify-center shrink-0">
              <Zap size={10} className="text-lime-400" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl rounded-tl-sm px-3 py-2">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {messages.length < 2 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)}
              className="text-[10px] font-mono px-2 py-1 rounded-lg border border-zinc-700 text-zinc-400 hover:border-lime-400/30 hover:text-lime-400 transition-all">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-zinc-800 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send(input)}
          placeholder="Задай вопрос..."
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-lime-400/40 transition-colors"
        />
        <button onClick={() => send(input)} disabled={!input.trim() || loading}
          className="w-8 h-8 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 flex items-center justify-center disabled:opacity-40 transition-all">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
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
  const [cursorProg, setCursorProg] = useState<number | null>(null);

  const toggleCh = (id: string) =>
    setVisibleCh(prev => prev.includes(id)
      ? prev.length > 1 ? prev.filter(c => c !== id) : prev
      : [...prev, id]);

  const channels = (chartChannels as Ch[] | null) ?? [];
  const lapTimeStr = parsedLap ? fmtMs(parsedLap.lapTimeMs) : "—";
  const refTimeMs  = analysisResult ? parsedLap!.lapTimeMs - analysisResult.totalTimeDeltaMs : 0;

  // Detect track from filename
  const detectedTrackId = React.useMemo(() => {
    const name = (filename ?? "").toLowerCase();
    const map: Record<string, string> = {
      nurburgring: "nurburgring", nürburgring: "nurburgring",
      monza: "monza", spa: "spa", silverstone: "silverstone",
      suzuka: "suzuka", imola: "imola", barcelona: "barcelona",
      catalunya: "barcelona", hungaroring: "monza", zandvoort: "spa",
    };
    return Object.entries(map).find(([k]) => name.includes(k))?.[1] ?? "monza";
  }, [filename]);
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
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* ══ LEFT: CHANNELS (full height) ══════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-zinc-800/60">

            {/* Compact header */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-zinc-800/60 shrink-0 bg-zinc-950/95 backdrop-blur-sm overflow-x-auto">
              {/* Times */}
              <div className="flex items-center gap-3 shrink-0">
                <div>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Ваш круг</p>
                  <p className="text-lg font-mono font-bold text-lime-400 tabular-nums leading-tight">{lapTimeStr}</p>
                </div>
                <div className="w-px h-8 bg-zinc-800" />
                <div>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Референс</p>
                  <p className="text-lg font-mono font-semibold text-zinc-400 tabular-nums leading-tight">{refTimeStr}</p>
                </div>
                <div className="w-px h-8 bg-zinc-800" />
                <div>
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Разрыв</p>
                  <p className={cn("text-lg font-mono font-bold tabular-nums leading-tight",
                    gapMs > 0 ? "text-red-400" : "text-lime-400")}>
                    {gapMs > 0 ? "+" : ""}{(gapMs/1000).toFixed(3)}с
                  </p>
                </div>
              </div>

              <div className="w-px h-8 bg-zinc-800 shrink-0" />

              {/* Sector deltas */}
              {analysisResult.sectors.map(s => (
                <div key={s.sectorIdx} className="shrink-0">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase">S{s.sectorIdx+1}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono tabular-nums text-zinc-300">{(s.userTimeMs/1000).toFixed(3)}</span>
                    <span className={cn("text-[10px] font-mono", s.deltaMs > 0 ? "text-red-400" : "text-lime-400")}>
                      {s.deltaMs > 0 ? "+" : ""}{(s.deltaMs/1000).toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}

              <div className="w-px h-8 bg-zinc-800 shrink-0" />

              {/* Score rings */}
              <div className="flex items-center gap-2 shrink-0">
                <ScoreRing value={analysisResult.overallScore} label="Score" size={48} />
                {analysisResult.subScores && (
                  <>
                    <ScoreRing value={analysisResult.subScores.braking}     label="Торм" size={38} />
                    <ScoreRing value={analysisResult.subScores.throttle}    label="Газ"  size={38} />
                    <ScoreRing value={analysisResult.subScores.lines}       label="Лин"  size={38} />
                    <ScoreRing value={analysisResult.subScores.consistency} label="Пост" size={38} />
                  </>
                )}
              </div>

              <div className="flex-1" />

              {/* Channel toggles */}
              <div className="flex items-center gap-1 shrink-0">
                {channels.map(ch => (
                  <button key={ch.id} onClick={() => toggleCh(ch.id)}
                    className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition-all font-mono",
                      visibleCh.includes(ch.id)
                        ? "bg-zinc-800 border-zinc-600 text-zinc-200"
                        : "border-zinc-800/80 text-zinc-600 hover:border-zinc-700")}>
                    <div className="w-1.5 h-1.5 rounded-full"
                      style={{ background: visibleCh.includes(ch.id) ? ch.color : "#52525b" }} />
                    {ch.id.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* View switch */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                {([["channels", Activity], ["heatmap", Map], ["ghost", Layers]] as const).map(([v, Icon]) => (
                  <button key={v} onClick={() => setLeftView(v as LeftView)}
                    className={cn("p-1.5 rounded-md transition-all",
                      leftView === v ? "bg-zinc-700 text-zinc-100" : "text-zinc-600 hover:text-zinc-300")}>
                    <Icon size={12} />
                  </button>
                ))}
              </div>
            </div>

            {/* CHANNELS */}
            {leftView === "channels" && (
              <div className="flex-1 overflow-y-auto min-h-0">
                <TelemetryChart
                  channels={channels as any}
                  visibleChannels={visibleCh}
                  className="w-full rounded-none border-0"
                  onCursorChange={setCursorProg}
                />
                {/* Delta */}
                <div className="border-t border-zinc-800/60">
                  <div className="flex items-center gap-2 px-4 py-1.5 border-b border-zinc-800/40 bg-zinc-950/60">
                    <BarChart2 size={10} className="text-blue-400" />
                    <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Delta Time</span>
                    <span className="ml-auto text-[9px] font-mono text-red-400 flex items-center gap-1">
                      <TrendingDown size={8}/> Отставание
                    </span>
                    <span className="text-[9px] font-mono text-lime-400 flex items-center gap-1">
                      <TrendingUp size={8}/> Опережение
                    </span>
                  </div>
                  <DeltaChart delta={analysisResult.delta} totalDistM={totalDistM} height={100} className="w-full" />
                </div>
                {/* Mini channel charts 2-col */}
                {channels.filter(ch => visibleCh.includes(ch.id) && ch.id !== "delta").length > 0 && (
                  <div className="grid grid-cols-2 gap-px bg-zinc-800/40 border-t border-zinc-800/60">
                    {channels.filter(ch => visibleCh.includes(ch.id) && ch.id !== "delta").map(ch => (
                      <div key={ch.id} className="bg-zinc-950">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-zinc-800/40">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: ch.color }} />
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: ch.color }}>{ch.label}</span>
                          <span className="text-[9px] font-mono text-zinc-600 ml-auto">{ch.unit}</span>
                        </div>
                        <TelemetryChart channels={[ch] as any} visibleChannels={[ch.id]} height={110} className="rounded-none border-0" />
                      </div>
                    ))}
                  </div>
                )}
                {/* Optimal lap */}
                {analysisResult.optimalLap.potentialGainMs > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/30">
                    <Zap size={12} className="text-lime-400 shrink-0" />
                    <p className="text-xs text-zinc-400 flex-1 leading-relaxed">{analysisResult.optimalLap.summaryRu}</p>
                    <div className="shrink-0 text-right">
                      <p className="text-[9px] font-mono text-zinc-600">Потенциал</p>
                      <p className="text-sm font-mono font-bold text-lime-400">−{(analysisResult.optimalLap.potentialGainMs/1000).toFixed(3)}с</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HEATMAP FULLSCREEN */}
            {leftView === "heatmap" && heatmapData && (
              <div className="flex-1 min-h-0 p-3">
                <TrackHeatmap data={heatmapData}
                  segmentAnalyses={analysisResult.segmentAnalyses}
                  trackId={detectedTrackId} cursorProgress={cursorProg}
                  className="w-full h-full rounded-xl" />
              </div>
            )}

            {/* GHOST */}
            {leftView === "ghost" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <GhostComparison channels={channels.filter(c => c.id !== "delta") as any} />
              </div>
            )}
          </div>

          {/* ══ RIGHT: MAP (large hero) + ANALYSIS ════════════════════════════ */}
          <div className="w-[380px] shrink-0 flex flex-col bg-zinc-950 overflow-hidden">

            {/* LARGE MAP */}
            {heatmapData && (
              <div className="shrink-0 p-3 pb-2">
                <TrackHeatmap
                  data={heatmapData}
                  segmentAnalyses={analysisResult.segmentAnalyses}
                  trackId={detectedTrackId}
                  height={320}
                  cursorProgress={cursorProg}
                  className="w-full rounded-2xl ring-1 ring-zinc-800/80"
                />
              </div>
            )}

            {/* Stats strip */}
            {parsedLap && (
              <div className="flex items-center justify-around px-3 py-2 border-t border-b border-zinc-800/60 shrink-0 bg-zinc-900/40">
                {[
                  { label: "MAX SPD", val: `${Math.round(parsedLap.channelStats.maxSpeed)}`, unit: "km/h", color: "text-lime-400" },
                  { label: "AVG GAS", val: `${Math.round(parsedLap.channelStats.avgThrottle)}`, unit: "%", color: "text-green-400" },
                  { label: "BRAKES", val: `${parsedLap.channelStats.brakingEvents.length}`, unit: "zones", color: "text-red-400" },
                ].map(({ label, val, unit, color }) => (
                  <div key={label} className="text-center">
                    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">{label}</p>
                    <p className={cn("text-sm font-mono font-bold tabular-nums", color)}>
                      {val}<span className="text-[9px] text-zinc-600 ml-0.5">{unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Analysis tabs */}
            <div className="flex border-b border-zinc-800/60 shrink-0">
              {([
                ["segments", "Участки"],
                ["insights", "Инсайты"],
                ["engineer", "AI ✦"],
                ["coach",    "Тренер"],
              ] as const).map(([k, label]) => (
                <button key={k} onClick={() => setRightTab(k)}
                  className={cn("flex-1 py-2.5 text-[11px] font-medium transition-colors relative",
                    rightTab === k ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
                    k === "engineer" && rightTab === k ? "text-lime-400" : "")}>
                  {label}
                  {rightTab === k && (
                    <div className={cn("absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-t",
                      k === "engineer" ? "bg-lime-400" : "bg-zinc-400")} />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {rightTab === "segments" && (
                <SegmentPanel
                  segmentAnalyses={analysisResult.segmentAnalyses}
                  totalTimeDeltaMs={analysisResult.totalTimeDeltaMs}
                />
              )}

              {rightTab === "insights" && (
                <div>
                  <div className="px-4 py-3 border-b border-zinc-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-zinc-300">Анализ круга</p>
                      <span className={cn("text-xs font-mono font-bold", gapMs > 0 ? "text-red-400" : "text-lime-400")}>
                        {gapMs > 0 ? "−" : "+"}{Math.abs(gapMs/1000).toFixed(3)}с
                      </span>
                    </div>
                    {analysisResult.dominantWeakness && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-400/6 border border-red-400/15">
                        <AlertCircle size={11} className="text-red-400 shrink-0" />
                        <p className="text-[11px] text-red-300">Главная слабость: <strong>{analysisResult.dominantWeakness}</strong></p>
                      </div>
                    )}
                  </div>
                  {allInsights.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center px-4">
                      <div className="text-4xl mb-3">🏆</div>
                      <p className="text-sm font-medium text-zinc-300">Отличный круг!</p>
                    </div>
                  ) : allInsights.map((ins: any, i: number) => (
                    <InsightRow key={i} ins={ins} selected={selIns === ins}
                      onSelect={() => setSelIns(selIns === ins ? null : ins)} />
                  ))}
                  {selIns && (
                    <div className="mx-3 my-2 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                      <p className="text-xs text-zinc-300 leading-relaxed">{(selIns as any).descriptionRu}</p>
                      {(selIns as any).timeCostMs > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full"
                              style={{ width: `${Math.min(100, (selIns as any).timeCostMs/4)}%` }} />
                          </div>
                          <span className="text-[11px] font-mono text-red-400 shrink-0">
                            −{((selIns as any).timeCostMs/1000).toFixed(3)}с
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {rightTab === "engineer" && (
                <EngineerInlineTab analysisResult={analysisResult} lapTimeStr={lapTimeStr} />
              )}

              {rightTab === "coach" && (
                <CoachPanel
                  message={coachMessage ?? { tone: "analytical", headline: "Анализ завершён", body: "", actionLine: "" }}
                  positives={[]} patterns={null}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
