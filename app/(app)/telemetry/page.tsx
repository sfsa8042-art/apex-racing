"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Upload, RefreshCw, AlertCircle, Zap, BarChart2, ChevronDown,
  Map, Layers, Activity, ChevronRight, TrendingDown, TrendingUp,
  Clock, Target, Cpu, MessageCircle, ArrowRight, CheckCircle2,
} from "lucide-react";
import { TelemetryChart }  from "@/components/charts/TelemetryChart";
import { LiveTrackMap }    from "@/components/charts/LiveTrackMap";
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
import type { AnalysisInsight, LapAnalysisResult } from "@/types/telemetry";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMs = (ms: number) =>
  `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,"0")}.${String(ms%1000).padStart(3,"0")}`;

type Ch = { id: string; label: string; color: string; unit: string;
  data: number[]; refData: number[]; min: number; max: number; };
type RightTab = "segments"|"insights"|"engineer"|"coach";
type LeftView  = "channels"|"heatmap"|"ghost";

// ── Score Ring (animated on mount) ───────────────────────────────────────────
function ScoreRing({ value, label, size = 52, animate = true }: {
  value: number; label: string; size?: number; animate?: boolean;
}) {
  const r     = (size - 8) / 2;
  const circ  = 2 * Math.PI * r;
  const color = value >= 90 ? "#a3e635" : value >= 75 ? "#facc15" : "#f87171";
  const [pct, setPct] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setPct(value), 80);
    return () => clearTimeout(t);
  }, [value, animate]);

  const stroke = circ * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272a" strokeWidth="5" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={stroke} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-bold font-mono leading-none" style={{ fontSize: size * 0.22, color }}>{value}</span>
        </div>
      </div>
      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Desktop uploads list ──────────────────────────────────────────────────────
interface DS { id: string; filename: string; uploadedAt: string; }

function age(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "только что"; if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} ч`;
  return `${Math.floor(h/24)} дн`;
}

function DesktopUploads({ onFile }: { onFile:(f:File)=>void }) {
  const [sessions, setSessions] = useState<DS[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading]   = useState<string|null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/sessions?all=1");
        if (!r.ok) return;
        const { sessions: all } = await r.json();
        setSessions((all ?? []).sort((a:DS,b:DS) =>
          new Date(b.uploadedAt).getTime()-new Date(a.uploadedAt).getTime()).slice(0,10));
      } catch {}
    };
    load(); const t = setInterval(load,15000); return ()=>clearInterval(t);
  }, []);

  const open = async (s: DS) => {
    setLoading(s.id);
    try {
      const r = await fetch(`/api/sessions/${s.id}/file`);
      if (!r.ok) throw new Error();
      onFile(new File([await r.blob()], s.filename, { type:"text/plain" }));
    } catch { alert("Файл недоступен. Загрузи вручную."); }
    finally { setLoading(null); }
  };

  if (!sessions.length) return null;
  const latest = sessions[0];

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-700/80 overflow-hidden bg-zinc-900/40 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-lime-400/12 border border-lime-400/25 flex items-center justify-center shrink-0">
          <Cpu size={12} className="text-lime-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-lime-400 mb-0.5">Desktop загрузки</p>
          <p className="text-[10px] text-zinc-400 font-mono truncate">{latest.filename}</p>
        </div>
        <button onClick={() => open(latest)} disabled={loading === latest.id}
          className="px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-bold transition-all shrink-0 disabled:opacity-50">
          {loading === latest.id ? "…" : "Открыть"}
        </button>
        {sessions.length > 1 && (
          <button onClick={() => setExpanded(v=>!v)}
            className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 shrink-0">
            {expanded ? "▲" : `+${sessions.length-1}`}
          </button>
        )}
      </div>
      {expanded && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/50 max-h-48 overflow-y-auto">
          {sessions.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-800/30 transition-colors">
              <span className="text-[10px] font-mono text-zinc-700 w-4 shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono text-zinc-300 truncate">{s.filename}</p>
                <p className="text-[10px] text-zinc-600">{age(s.uploadedAt)} назад</p>
              </div>
              <button onClick={() => open(s)} disabled={loading===s.id}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 disabled:opacity-50 transition-all shrink-0">
                {loading===s.id ? "…" : "Открыть"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Idle state ────────────────────────────────────────────────────────────────
function IdleState({ onFile, onSample }: { onFile:(f:File)=>void; onSample:()=>void }) {
  const [dragging, setDragging] = useState(false);
  const inputId = "telemetry-file-input";

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) onFile(f);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); };
  const handleChange   = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) { onFile(f); e.target.value = ""; }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-10 relative overflow-hidden">
      {/* Dot-grid background */}
      <div className="absolute inset-0 opacity-[0.018] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, #a3e635 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-lime-400/20 to-transparent pointer-events-none" />

      {/* Hidden file input */}
      <input
        id={inputId}
        type="file"
        accept=".csv,.json,.txt,.ld"
        onChange={handleChange}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
      />

      {/* Drop zone — label wraps so clicking anywhere triggers picker */}
      <label
        htmlFor={inputId}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "w-full max-w-md rounded-3xl border-2 border-dashed flex flex-col items-center gap-5 py-16 px-8 cursor-pointer transition-all duration-300 select-none",
          dragging
            ? "border-lime-400 bg-lime-400/6 scale-[1.01]"
            : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-500 hover:bg-zinc-900/30"
        )}>
        <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300",
          dragging ? "bg-lime-400/15 border border-lime-400/40 scale-110" : "bg-zinc-900 border border-zinc-700")}>
          <Upload size={32} className={dragging ? "text-lime-400" : "text-zinc-400"} />
        </div>
        <div className="text-center space-y-2 pointer-events-none">
          <p className="text-base font-semibold text-zinc-200">
            {dragging ? "Отпусти файл здесь" : "Перетащи файл или нажми здесь"}
          </p>
          <p className="text-sm text-zinc-500">CSV · JSON · .ld · любой симулятор</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 pointer-events-none">
          {["iRacing", "ACC", "MoTeC", "rFactor 2"].map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <span className="text-zinc-800">·</span>}
              <span>{s}</span>
            </React.Fragment>
          ))}
        </div>
      </label>

      {/* Separate sample button — not inside label, no picker conflict */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSample()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-700 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all">
          <Target size={13} /> Загрузить пример
        </button>
      </div>

      <DesktopUploads onFile={onFile} />
    </div>
  );
}


// ── Processing state ──────────────────────────────────────────────────────────
function ProcessingState({ status }: { status: string }) {
  const steps = [
    { id: "parsing",   label: "Чтение данных",  icon: Cpu },
    { id: "analyzing", label: "Анализ круга",    icon: Activity },
  ];
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-8">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-lime-400 animate-spin" />
          <div className="absolute inset-2 rounded-full border border-zinc-800/50" />
        </div>
        <div className="space-y-3">
          {steps.map(({ id, label, icon: Icon }) => (
            <div key={id} className={cn("flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all",
              status === id
                ? "bg-zinc-900 border border-zinc-700"
                : steps.findIndex(s=>s.id===status) > steps.findIndex(s=>s.id===id)
                  ? "opacity-40" : "opacity-20")}>
              <Icon size={14} className={status===id ? "text-lime-400" : "text-zinc-500"} />
              <span className={cn("text-sm font-mono", status===id ? "text-zinc-200" : "text-zinc-500")}>
                {label}
              </span>
              {status===id && (
                <div className="flex gap-0.5 ml-auto">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1 h-1 rounded-full bg-lime-400 animate-bounce"
                      style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              )}
              {steps.findIndex(s=>s.id===status) > steps.findIndex(s=>s.id===id) && (
                <CheckCircle2 size={12} className="text-lime-400 ml-auto" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Insight row ───────────────────────────────────────────────────────────────
const CAT_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  brake:    { color:"#f87171", bg:"rgba(248,113,113,0.06)", border:"rgba(248,113,113,0.15)", label:"Торможение" },
  throttle: { color:"#4ade80", bg:"rgba(74,222,128,0.06)",  border:"rgba(74,222,128,0.15)",  label:"Газ" },
  speed:    { color:"#facc15", bg:"rgba(250,204,21,0.06)",  border:"rgba(250,204,21,0.15)",  label:"Линия" },
  good:     { color:"#a3e635", bg:"rgba(163,230,53,0.06)",  border:"rgba(163,230,53,0.15)",  label:"Хорошо" },
};

function InsightCard({ ins, selected, onSelect, rank }: {
  ins: AnalysisInsight & { _segLabel?: string };
  selected: boolean; onSelect: ()=>void; rank: number;
}) {
  const cat = CAT_CONFIG[ins.category] ?? CAT_CONFIG.speed;
  const costS = (ins.timeCostMs / 1000).toFixed(3);
  const maxCost = 500; // ms
  const barWidth = Math.min(100, ins.timeCostMs / maxCost * 100);

  return (
    <button onClick={onSelect}
      className={cn("w-full text-left transition-all duration-200 border-b last:border-0",
        selected ? "bg-zinc-800/70" : "hover:bg-zinc-900/60")}
      style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          {/* Rank */}
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: cat.bg, border: `1px solid ${cat.border}` }}>
            <span className="text-[9px] font-bold font-mono" style={{ color: cat.color }}>{rank}</span>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {/* Header */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-600">
                {ins._segLabel ?? ""}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
              {ins.timeCostMs > 0 && (
                <span className="text-[10px] font-mono font-bold ml-auto shrink-0"
                  style={{ color: cat.color }}>−{costS}с</span>
              )}
            </div>

            {/* Description */}
            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
              {ins.descriptionRu}
            </p>

            {/* Cost bar */}
            {ins.timeCostMs > 0 && (
              <div className="h-0.5 rounded-full bg-zinc-800 mt-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, background: cat.color, opacity: 0.7 }} />
              </div>
            )}
          </div>
        </div>

        {/* Expanded detail */}
        {selected && (
          <div className="mt-3 ml-8 space-y-2">
            <p className="text-[11px] text-zinc-300 leading-relaxed">{ins.descriptionRu}</p>
            {ins.academyModuleTitleRu && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-lime-400/80">
                <ArrowRight size={9} />
                <span>Академия: {ins.academyModuleTitleRu}</span>
              </div>
            )}
            {ins.userValue !== undefined && ins.refValue !== undefined && (
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <span className="text-zinc-500">Вы: <span className="text-zinc-200">{ins.userValue} {ins.unit}</span></span>
                <span className="text-zinc-500">Ref: <span className="text-lime-400">{ins.refValue} {ins.unit}</span></span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Engineer inline chat ──────────────────────────────────────────────────────
function EngineerChat({ analysisResult, lapTimeStr, parsedLap, filename }: {
  analysisResult: LapAnalysisResult; lapTimeStr: string;
  parsedLap?: import("@/types/telemetry").ParsedLap | null;
  filename?: string | null;
}) {
  const [msgs, setMsgs] = useState<{role:"user"|"assistant";content:string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefingDone, setBriefingDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const ctx = React.useMemo(() => {
    // Build rich structured context for the AI engineer
    const topInsights = analysisResult.segmentAnalyses
      .flatMap(sa => sa.insights.filter(i => i.type !== "good_segment").map(i => ({
        corner: sa.segment.label,
        type: i.type,
        costMs: i.timeCostMs,
        description: i.descriptionRu,
      })))
      .sort((a, b) => b.costMs - a.costMs)
      .slice(0, 5);

    // Build structured context string directly
    const lines: string[] = [];
    const trackMap: Record<string,string> = {
      nurburgring:"Nürburgring", monza:"Monza", spa:"Spa-Francorchamps",
      silverstone:"Silverstone", suzuka:"Suzuka", imola:"Imola", barcelona:"Barcelona",
    };
    const tl = (filename ?? "").toLowerCase();
    const trackName = Object.entries(trackMap).find(([k]) => tl.includes(k))?.[1] ?? "Unknown";
    const carName = tl.includes("porsche") ? "Porsche 992 GT3" :
      tl.includes("mercedes") ? "Mercedes AMG GT3" :
      tl.includes("mclaren") ? "McLaren 720S GT3" :
      tl.includes("ferrari") ? "Ferrari 296 GT3" : "GT3";

    lines.push(`TRACK: ${trackName.toUpperCase()} | CAR: ${carName.toUpperCase()}`);
    if (parsedLap) {
      const ms = parsedLap.lapTimeMs;
      const lts = `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,"0")}.${String(ms%1000).padStart(3,"0")}`;
      const refMs = analysisResult.totalTimeDeltaMs > 0 ? ms - analysisResult.totalTimeDeltaMs : 0;
      const refs = refMs > 0 ? `${Math.floor(refMs/60000)}:${String(Math.floor((refMs%60000)/1000)).padStart(2,"0")}.${String(refMs%1000).padStart(3,"0")}` : "—";
      lines.push(`LAP: ${lts} | REF: ${refs} | GAP: +${(analysisResult.totalTimeDeltaMs/1000).toFixed(3)}s`);
    }
    lines.push(`SCORE: ${analysisResult.overallScore}/100`);
    if (analysisResult.subScores) {
      const {braking,throttle,lines:l,consistency} = analysisResult.subScores;
      lines.push(`SCORES: Braking ${braking} | Throttle ${throttle} | Lines ${l} | Consistency ${consistency}`);
    }
    if (analysisResult.sectors.length > 0) {
      lines.push("SECTORS: " + analysisResult.sectors.map(s =>
        `S${s.sectorIdx+1}: ${(s.deltaMs>0?"+":"")}${(s.deltaMs/1000).toFixed(3)}s`).join(" | "));
    }
    lines.push("TOP ISSUES:");
    topInsights.slice(0,5).forEach((ins,i) => {
      lines.push(`  ${i+1}. [${ins.corner}] ${ins.type} — ${(ins.costMs/1000).toFixed(3)}s — ${ins.description.slice(0,80)}`);
    });
    if (analysisResult.patterns?.length) {
      lines.push("PATTERNS: " + analysisResult.patterns.join(" | "));
    }
    if (analysisResult.strengthMessages?.length) {
      lines.push("STRENGTHS: " + analysisResult.strengthMessages.join(" | "));
    }
    if (analysisResult.optimalLap.potentialGainMs > 0) {
      lines.push(`POTENTIAL: -${(analysisResult.optimalLap.potentialGainMs/1000).toFixed(3)}s available`);
    }
    return lines.join("\n");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisResult, lapTimeStr, parsedLap, filename]);

  useEffect(() => {
    if (briefingDone) return;
    setBriefingDone(true);
    fetch(`/api/engineer?ctx=${encodeURIComponent(ctx)}&lang=ru`)
      .then(r=>r.json())
      .then(d=>{ if(d.briefing) setMsgs([{ role:"assistant", content:d.briefing }]); })
      .catch(()=>{});
  }, []);

  const send = async (text: string) => {
    if (!text.trim()||loading) return;
    const history = [...msgs, { role:"user" as const, content:text }];
    setMsgs(history); setInput(""); setLoading(true);
    try {
      const r = await fetch("/api/engineer", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ contextSummary:ctx, message:text, history:msgs, personality:"calm", lang:"ru" }),
      });
      const d = await r.json();
      if (d.reply) setMsgs([...history, { role:"assistant", content:d.reply }]);
    } catch {}
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}), 50);
  };

  const QUICK = ["Где теряю больше всего?", "Как улучшить апекс?", "Советы по торможению", "Лучший поворот?"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role==="user" ? "justify-end" : "justify-start")}>
            {m.role==="assistant" && (
              <div className="w-6 h-6 rounded-full bg-lime-400/12 border border-lime-400/25 flex items-center justify-center shrink-0 mt-1">
                <Zap size={10} className="text-lime-400" />
              </div>
            )}
            <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed",
              m.role==="user"
                ? "bg-zinc-700/60 text-zinc-200 rounded-tr-sm border border-zinc-600/40"
                : "bg-zinc-900/80 border border-zinc-800 text-zinc-300 rounded-tl-sm")}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-lime-400/12 border border-lime-400/25 flex items-center justify-center shrink-0">
              <Zap size={10} className="text-lime-400" />
            </div>
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
              <div className="flex gap-1">
                {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{animationDelay:`${i*120}ms`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {msgs.length < 2 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)}
              className="text-[10px] font-mono px-2.5 py-1.5 rounded-xl border border-zinc-700/80 text-zinc-400 hover:border-lime-400/30 hover:text-lime-400 hover:bg-lime-400/5 transition-all">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-zinc-800/60 flex gap-2">
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send(input)}
          placeholder="Задай вопрос инженеру…"
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-[11px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-lime-400/40 transition-colors font-mono" />
        <button onClick={()=>send(input)} disabled={!input.trim()||loading}
          className="w-9 h-9 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 flex items-center justify-center disabled:opacity-40 transition-all">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function TelemetryPage() {
  const { t } = useLang();
  const {
    uploadState, chartChannels, handleFile, reset, loadSampleData,
    driverProfile, wowSummary, heatmapData, showWow, dismissWow,
    coachMessage, nextActions, refLap,
  } = useTelemetry();
  const { status, error, filename, parsedLap, analysisResult } = uploadState;

  const [visibleCh, setVisibleCh] = useState(["speed","throttle","brake","delta"]);
  const [rightTab,  setRightTab]  = useState<RightTab>("insights");
  const [leftView,  setLeftView]  = useState<LeftView>("channels");
  const [selIns,    setSelIns]    = useState<(AnalysisInsight&{_segLabel?:string})|null>(null);
  const [cursorProg, setCursorProg] = useState<number|null>(null);

  const toggleCh = (id: string) =>
    setVisibleCh(p => p.includes(id) ? p.length>1?p.filter(c=>c!==id):p : [...p,id]);

  const channels   = (chartChannels as Ch[]|null) ?? [];
  const lapTimeStr = parsedLap ? fmtMs(parsedLap.lapTimeMs) : "—";
  const refTimeMs  = analysisResult ? parsedLap!.lapTimeMs - analysisResult.totalTimeDeltaMs : 0;
  const refTimeStr = refTimeMs ? fmtMs(refTimeMs) : "—";
  const gapMs      = analysisResult?.totalTimeDeltaMs ?? 0;
  const totalDistM = parsedLap?.rows.at(-1)?.lapDist ?? 0;

  const detectedTrackId = React.useMemo(() => {
    const name = (filename ?? "").toLowerCase();
    const map: Record<string,string> = {
      nurburgring:"nurburgring", monza:"monza", spa:"spa",
      silverstone:"silverstone", suzuka:"suzuka", imola:"imola", barcelona:"barcelona",
    };
    return Object.entries(map).find(([k])=>name.includes(k))?.[1] ?? "monza";
  }, [filename]);

  const allInsights = (analysisResult?.segmentAnalyses
    .flatMap(sa=>sa.insights.map(i=>({...i,_segLabel:sa.segment.label})))
    .filter(i=>i.type!=="good_segment") ?? []) as any[];

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">

      {showWow && wowSummary && (
        <WowScreen summary={wowSummary} onDismiss={dismissWow}
          lapTimeStr={lapTimeStr} levelProgress={null} driverRank={null} xpEarned={50} />
      )}

      {/* ── NAV BAR ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 h-10 border-b border-zinc-800/70 shrink-0 bg-zinc-950/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-zinc-600" />
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Телеметрия</span>
        </div>

        {status === "done" && filename && (
          <>
            <div className="text-zinc-800">/</div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/60 border border-zinc-700/50">
              <div className="w-1 h-1 rounded-full bg-lime-400" />
              <span className="text-[10px] font-mono text-zinc-300 max-w-[220px] truncate">{filename}</span>
            </div>
          </>
        )}

        <div className="flex-1" />

        {status==="done" && (
          <>
            {/* View switcher */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800/80">
              {([["channels",Activity,"Каналы"],["heatmap",Map,"Карта"],["ghost",Layers,"Ghost"]] as const).map(([v,Icon,lbl])=>(
                <button key={v} onClick={()=>setLeftView(v as LeftView)}
                  className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                    leftView===v?"bg-zinc-800 text-zinc-100":"text-zinc-500 hover:text-zinc-300")}>
                  <Icon size={11}/>{lbl}
                </button>
              ))}
            </div>
            <button onClick={reset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all border border-transparent hover:border-zinc-700/60">
              <RefreshCw size={10}/> Сброс
            </button>
          </>
        )}

        {(status==="idle"||status==="error") && (
          <button onClick={()=>{
            const i=document.createElement("input");i.type="file";i.accept=".csv,.json,.txt,.ld";
            i.onchange=e=>{const f=(e.target as HTMLInputElement).files?.[0];if(f)handleFile(f);};i.click();
          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-[11px] font-semibold transition-all">
            <Upload size={11}/> Загрузить
          </button>
        )}
      </div>

      {/* ── STATES ──────────────────────────────────────────────────────────── */}
      {(status==="idle"||status==="error") && (
        <div className="flex-1 flex flex-col min-h-0">
          {status==="error" && (
            <div className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-red-400/20 bg-red-400/5">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-300 flex-1">{error}</p>
              <button onClick={reset} className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-zinc-800">Повтор</button>
            </div>
          )}
          <IdleState onFile={handleFile} onSample={loadSampleData} />
        </div>
      )}

      {(status==="parsing"||status==="analyzing") && (
        <ProcessingState status={status} />
      )}

      {/* ── ANALYSIS ────────────────────────────────────────────────────────── */}
      {status==="done" && analysisResult && channels.length>0 && (
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* ══ LEFT ══════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-zinc-800/60">

            {/* Metrics strip */}
            <div className="flex items-center gap-0 shrink-0 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm overflow-x-auto">

              {/* Times */}
              <div className="flex items-stretch gap-0 border-r border-zinc-800/60 shrink-0">
                {[
                  { label:"ВАШ КРУГ", time:lapTimeStr, color:"text-lime-400", size:"text-xl" },
                  { label:"РЕФЕРЕНС", time:refTimeStr, color:"text-zinc-400", size:"text-lg" },
                ].map(({label,time,color,size})=>(
                  <div key={label} className="px-5 py-3 border-r border-zinc-800/40 last:border-r-0">
                    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.15em] mb-1">{label}</p>
                    <p className={cn("font-mono font-bold tabular-nums leading-none", color, size)}>{time}</p>
                  </div>
                ))}
                <div className="px-5 py-3">
                  <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.15em] mb-1">РАЗРЫВ</p>
                  <p className={cn("font-mono font-bold tabular-nums leading-none text-xl",
                    gapMs>0?"text-red-400":"text-lime-400")}>
                    {gapMs>0?"+":""}{(gapMs/1000).toFixed(3)}с
                  </p>
                </div>
              </div>

              {/* Sectors */}
              {analysisResult.sectors.length>0 && (
                <div className="flex items-stretch border-r border-zinc-800/60 shrink-0">
                  {analysisResult.sectors.map(s=>(
                    <div key={s.sectorIdx} className="px-4 py-3 border-r border-zinc-800/40 last:border-r-0">
                      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.15em] mb-1">S{s.sectorIdx+1}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-mono tabular-nums text-zinc-200">{(s.userTimeMs/1000).toFixed(3)}</span>
                        <span className={cn("text-[10px] font-mono tabular-nums",s.deltaMs>0?"text-red-400":"text-lime-400")}>
                          {s.deltaMs>0?"+":""}{(s.deltaMs/1000).toFixed(3)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Scores */}
              <div className="flex items-center gap-2.5 px-4 py-2 border-r border-zinc-800/60 shrink-0">
                <ScoreRing value={analysisResult.overallScore} label="Score" size={52} />
                {analysisResult.subScores && (
                  <>
                    <ScoreRing value={analysisResult.subScores.braking}     label="Торм" size={40}/>
                    <ScoreRing value={analysisResult.subScores.throttle}    label="Газ"  size={40}/>
                    <ScoreRing value={analysisResult.subScores.lines}       label="Лин"  size={40}/>
                    <ScoreRing value={analysisResult.subScores.consistency} label="Пост" size={40}/>
                  </>
                )}
              </div>

              {/* Stats + potential */}
              <div className="flex items-center gap-5 px-5 py-3 flex-1 min-w-0">
                {parsedLap && [
                  { lbl:"MAX SPD", val:`${Math.round(parsedLap.channelStats.maxSpeed)}`, unit:"km/h", c:"text-lime-400" },
                  { lbl:"AVG GAS", val:`${Math.round(parsedLap.channelStats.avgThrottle)}`, unit:"%",   c:"text-green-400" },
                  { lbl:"BRAKES",  val:`${parsedLap.channelStats.brakingEvents.length}`,   unit:"зон",  c:"text-red-400" },
                ].map(({lbl,val,unit,c})=>(
                  <div key={lbl}>
                    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.15em] mb-0.5">{lbl}</p>
                    <p className={cn("text-sm font-mono font-bold leading-none tabular-nums",c)}>
                      {val}<span className="text-[9px] text-zinc-600 ml-0.5">{unit}</span>
                    </p>
                  </div>
                ))}
                {analysisResult.optimalLap.potentialGainMs>0 && (
                  <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl border border-lime-400/20 bg-lime-400/5 shrink-0">
                    <Zap size={11} className="text-lime-400"/>
                    <div>
                      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.15em]">Потенциал</p>
                      <p className="text-sm font-mono font-bold text-lime-400 leading-none">
                        −{(analysisResult.optimalLap.potentialGainMs/1000).toFixed(3)}с
                      </p>
                    </div>
                  </div>
                )}

                {/* Channel toggles */}
                <div className="flex items-center gap-1 ml-4 pl-4 border-l border-zinc-800/60 shrink-0">
                  {channels.map(ch=>(
                    <button key={ch.id} onClick={()=>toggleCh(ch.id)}
                      className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono border transition-all",
                        visibleCh.includes(ch.id)
                          ? "bg-zinc-800/80 border-zinc-600/60 text-zinc-200"
                          : "border-zinc-800 text-zinc-600 hover:border-zinc-700")}>
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{background:visibleCh.includes(ch.id)?ch.color:"#52525b"}}/>
                      {ch.id.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* REVOLUTIONARY LAYOUT: Map left, Charts right */}
            {leftView==="channels" && (
              <div className="flex-1 min-h-0 flex overflow-hidden">

                {/* ── LEFT: LIVE TRACK MAP (hero) ───────────────────────── */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-zinc-800/40">
                  <div className="flex-1 min-h-0">
                    <LiveTrackMap
                      trackId={detectedTrackId}
                      userRows={parsedLap?.rows ?? []}
                      refRows={refLap?.rows}
                      cursorProgress={cursorProg}
                      className="w-full h-full rounded-none"
                    />
                  </div>
                </div>

                {/* ── RIGHT: CHANNELS CHARTS ───────────────────────────── */}
                <div className="w-[340px] shrink-0 flex flex-col overflow-y-auto bg-zinc-950">
                  {/* Main channels */}
                  <TelemetryChart
                    channels={channels as any} visibleChannels={visibleCh}
                    className="w-full rounded-none border-0"
                    onCursorChange={setCursorProg} />

                  {/* Delta */}
                  <div className="border-t border-zinc-800/60">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/90">
                      <BarChart2 size={9} className="text-blue-400"/>
                      <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Delta</span>
                      <span className="ml-auto text-[9px] font-mono text-red-400">
                        <TrendingDown size={8} className="inline"/> Потеря
                      </span>
                    </div>
                    <DeltaChart delta={analysisResult.delta} totalDistM={totalDistM} height={80} className="w-full"/>
                  </div>

                  {/* Per-channel mini */}
                  {channels.filter(ch=>visibleCh.includes(ch.id)&&ch.id!=="delta").map(ch=>(
                    <div key={ch.id} className="border-t border-zinc-800/40">
                      <div className="flex items-center gap-1.5 px-3 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{background:ch.color}}/>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{color:ch.color}}>{ch.label}</span>
                        <span className="text-[9px] font-mono text-zinc-600 ml-auto">{ch.unit}</span>
                      </div>
                      <TelemetryChart channels={[ch] as any} visibleChannels={[ch.id]} height={80} className="rounded-none border-0"/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {leftView==="heatmap" && heatmapData && (
              <div className="flex-1 min-h-0 p-4">
                <TrackHeatmap data={heatmapData} segmentAnalyses={analysisResult.segmentAnalyses}
                  trackId={detectedTrackId} cursorProgress={cursorProg} className="w-full h-full rounded-2xl"/>
              </div>
            )}

            {leftView==="ghost" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <GhostComparison channels={channels.filter(c=>c.id!=="delta") as any}/>
              </div>
            )}
          </div>

          {/* ══ RIGHT ════════════════════════════════════════════════════════= */}
          <div className="w-[380px] shrink-0 flex flex-col bg-zinc-950 overflow-hidden">

            {/* Live map */}
            {heatmapData && (
              <div className="shrink-0 p-3 pb-2 border-b border-zinc-800/60">
                <TrackHeatmap data={heatmapData} segmentAnalyses={analysisResult.segmentAnalyses}
                  trackId={detectedTrackId} height={300} cursorProgress={cursorProg}
                  className="w-full rounded-2xl ring-1 ring-zinc-800/60"/>
              </div>
            )}

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-zinc-800/60 bg-zinc-950">
              {([
                ["segments","Участки"],["insights","Инсайты"],["engineer","AI ✦"],["coach","Тренер"],
              ] as const).map(([k,lbl])=>(
                <button key={k} onClick={()=>setRightTab(k)}
                  className={cn("flex-1 py-2.5 text-[11px] font-medium transition-colors relative",
                    rightTab===k?"text-zinc-100":"text-zinc-500 hover:text-zinc-300")}>
                  {lbl}
                  {rightTab===k && (
                    <div className={cn("absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-t",
                      k==="engineer"?"bg-lime-400":"bg-zinc-400")}/>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {rightTab==="segments" && (
                <SegmentPanel segmentAnalyses={analysisResult.segmentAnalyses}
                  totalTimeDeltaMs={analysisResult.totalTimeDeltaMs}/>
              )}

              {rightTab==="insights" && (
                <div>
                  {/* Summary header */}
                  <div className="px-4 py-3 border-b border-zinc-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-zinc-300">
                        {allInsights.length} проблем найдено
                      </p>
                      <span className={cn("text-xs font-mono font-bold",gapMs>0?"text-red-400":"text-lime-400")}>
                        {gapMs>0?"−":"+"}{Math.abs(gapMs/1000).toFixed(3)}с
                      </span>
                    </div>
                    {analysisResult.dominantWeakness && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-400/5 border border-red-400/15">
                        <AlertCircle size={11} className="text-red-400 shrink-0"/>
                        <p className="text-[11px] text-red-300">
                          Главная слабость: <strong>{analysisResult.dominantWeakness}</strong>
                        </p>
                      </div>
                    )}
                  </div>

                  {allInsights.length===0 ? (
                    <div className="flex flex-col items-center py-12 text-center px-4 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                        <CheckCircle2 size={22} className="text-lime-400"/>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">Отличный круг!</p>
                        <p className="text-xs text-zinc-500 mt-1">Существенных ошибок не найдено</p>
                      </div>
                    </div>
                  ) : allInsights.map((ins: any, i: number) => (
                    <InsightCard key={i} ins={ins} rank={i+1}
                      selected={selIns===ins}
                      onSelect={()=>setSelIns(selIns===ins?null:ins)}/>
                  ))}
                </div>
              )}

              {rightTab==="engineer" && (
                <EngineerChat analysisResult={analysisResult} lapTimeStr={lapTimeStr} parsedLap={parsedLap} filename={filename}/>
              )}

              {rightTab==="coach" && (
                <CoachPanel
                  message={coachMessage ?? {tone:"analytical",headline:"Анализ завершён",body:"",actionLine:""}}
                  positives={[]} patterns={null}/>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
