"use client";
import React from "react";
import { useState, useRef, useCallback } from "react";
import {
  Upload, Eye, EyeOff, Settings2, RefreshCw, FileText,
  ChevronRight, AlertCircle, CheckCircle2, TrendingDown,
  Gauge, Zap, BarChart2, Map, Layers, Activity, Radio,
} from "lucide-react";
import { TelemetryChart }  from "@/components/charts/TelemetryChart";
import { DeltaChart }      from "@/components/charts/DeltaChart";
import { SegmentPanel }    from "@/components/charts/SegmentPanel";
import { TrackHeatmap }    from "@/components/charts/TrackHeatmap";
import { GhostComparison } from "@/components/charts/GhostComparison";
import { TrackRenderer } from "@/components/charts/TrackRenderer";
import { useLang } from "@/context/LanguageContext";
import { WowScreen }       from "./components/WowScreen";
import { NextActionPanel }  from "./components/NextAction";
import { CoachPanel }       from "./components/CoachPanel";
import { BeforeAfter }     from "./components/BeforeAfter";
import { Badge }           from "@/components/ui/Badge";
import { Button }          from "@/components/ui/Button";
import { useTelemetry }    from "@/context/TelemetryContext";
import { cn }              from "@/lib/utils";
import type { AnalysisInsight } from "@/types/telemetry";

// ─── Severity helpers ─────────────────────────────────────────────────────────
function useSev(s: string) {
  const { t } = useLang();
  if (s === "critical") return { dot:"bg-red-400",    text:"text-red-400",    label: t.feedback.severity.critical };
  if (s === "warning")  return { dot:"bg-yellow-400", text:"text-yellow-400", label: t.feedback.severity.warning  };
  if (s === "good")     return { dot:"bg-lime-400",   text:"text-lime-400",   label: t.feedback.severity.good     };
  return                       { dot:"bg-blue-400",   text:"text-blue-400",   label: t.feedback.severity.info     };
}

// ─── Upload zone ──────────────────────────────────────────────────────────────
function UploadZone({ onFile, onSample }: { onFile: (f: File) => void; onSample: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) onFile(f);
  }, [onFile]);
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-4">
        <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)} onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn("rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all",
            dragging ? "border-lime-400 bg-lime-400/5" : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50")}>
          <Upload size={28} className={cn("mx-auto mb-3 transition-colors", dragging ? "text-lime-400" : "text-zinc-600")} />
          <p className="text-sm font-medium text-zinc-300 mb-1">Drop your lap file here</p>
          <p className="text-xs text-zinc-600 mb-4">CSV or JSON · time, speed, throttle, brake, gear</p>
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            Choose file
          </Button>
          <input ref={inputRef} type="file" accept=".csv,.json,.txt" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </div>
        <button onClick={onSample}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all">
          <FileText size={14} className="text-lime-400" />Load sample data<ChevronRight size={13} className="text-zinc-600" />
        </button>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">CSV format</p>
          <pre className="text-[11px] font-mono text-zinc-400 leading-relaxed overflow-x-auto">{`time,speed,throttle,brake,gear\n0.00,280,100,0,6\n0.50,248,0,60,5\n1.20,128,5,5,2`}</pre>
        </div>
      </div>
    </div>
  );
}

function ProcessingOverlay({ status }: { status: string }) {
  const labels: Record<string, string> = { parsing: "Reading file...", analyzing: "Analysing lap..." };
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-lime-400 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-zinc-400">{labels[status] ?? "Loading..."}</p>
      </div>
    </div>
  );
}

function InsightCard({ insight, selected, onSelect }: {
  insight: AnalysisInsight; selected: boolean; onSelect: () => void;
}) {
  const s = useSev(insight.severity);
  return (
    <div onClick={onSelect}
      className={cn("px-4 py-3 cursor-pointer transition-all border-b border-zinc-800 last:border-0",
        selected ? "bg-zinc-800/40 border-l-2 border-l-lime-400/40" : "hover:bg-zinc-800/30")}>
      <div className="flex items-start gap-2.5 mb-1">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", s.dot)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-200 leading-snug">{insight.titleRu}</p>
          <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
            Sector {insight.sectorIdx + 1}
            {insight.timeCostMs > 0 && ` · −${(insight.timeCostMs / 1000).toFixed(3)}s`}
          </p>
        </div>
        <span className={cn("text-[10px] font-mono uppercase tracking-wide shrink-0", s.text)}>{s.label}</span>
      </div>
      {selected && (
        <div className="mt-2 space-y-2 animate-slide-up">
          <p className="text-xs text-zinc-400 leading-relaxed">{insight.descriptionRu}</p>
          {insight.userValue !== undefined && insight.refValue !== undefined && (
            <div className="flex gap-3 text-xs font-mono">
              <span className="text-zinc-500">You: <span className="text-zinc-200">{insight.userValue} {insight.unit}</span></span>
              <span className="text-zinc-500">Ref: <span className="text-lime-400">{insight.refValue} {insight.unit}</span></span>
            </div>
          )}
          {insight.academyModuleId && (
            <a href={`/academy?module=${insight.academyModuleId}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-colors">
              <span className="text-[10px] font-mono text-lime-400">→</span>
              <span className="text-xs text-zinc-300">{insight.academyModuleTitleRu ?? "Related lesson"}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

type RightTab = "insights" | "segments" | "coach" | "engineer";
type LeftTab  = "channels" | "heatmap" | "ghost";

// ─── Banner: load latest desktop upload ───────────────────────────────────────
function DesktopUploadBanner({ onFile }: { onFile: (f: File) => void }) {
  const [session,  setSession]  = React.useState<{ id: string; filename: string; uploadedAt: string } | null>(null);
  const [loading,  setLoading]  = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  // Check for recent desktop uploads every 10s
  React.useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/sessions?all=1");
        if (!res.ok) return;
        const { sessions } = await res.json();
        // Find the most recent desktop upload from the last 5 minutes
        const recent = sessions
          ?.filter((s: { source: string; uploadedAt: string }) => s.source === "desktop")
          ?.sort((a: { uploadedAt: string }, b: { uploadedAt: string }) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          )?.[0];
        if (recent) {
          const age = Date.now() - new Date(recent.uploadedAt).getTime();
          if (age < 5 * 60 * 1000) setSession(recent); // within 5 min
        }
      } catch {}
    };
    check();
    const t = setInterval(check, 10_000);
    return () => clearInterval(t);
  }, []);

  const handleLoad = async () => {
    if (!session) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/file`);
      if (!res.ok) throw new Error("Файл недоступен на сервере");
      const blob = await res.blob();
      const file = new File([blob], session.filename, { type: "text/plain" });
      onFile(file);
      setDismissed(true);
    } catch (e) {
      alert("Файл недоступен. Перетащи его вручную на страницу.");
    } finally {
      setFetching(false);
    }
  };

  if (!session || dismissed) return null;

  return (
    <div className="mx-4 mt-3 rounded-xl border border-lime-400/30 bg-lime-400/8 px-4 py-3 flex items-center gap-3 animate-slide-up">
      <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shrink-0"/>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-lime-400">Новый файл от десктопа</p>
        <p className="text-[11px] text-zinc-400 font-mono truncate">{session.filename}</p>
      </div>
      <button onClick={handleLoad} disabled={fetching}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-semibold transition-all shrink-0 disabled:opacity-60">
        {fetching ? "Загрузка…" : "Анализировать"}
      </button>
      <button onClick={() => setDismissed(true)} className="text-zinc-600 hover:text-zinc-400 shrink-0 text-lg leading-none">×</button>
    </div>
  );
}


export default function TelemetryPage() {
  const { t } = useLang();
  const {
    uploadState, chartChannels, handleFile, reset, loadSampleData,
    driverProfile, wowSummary, heatmapData, showWow, dismissWow,
    coachMessage, patternReport, nextActions, positives,
    levelProgress, driverRank,
  } = useTelemetry();
  const { status, error, filename, parsedLap, analysisResult } = uploadState;

  const [visibleChannels, setVisibleChannels] = useState(["speed", "throttle", "brake", "delta"]);
  const [selectedInsight, setSelectedInsight]  = useState<AnalysisInsight | null>(null);
  const [rightTab, setRightTab]  = useState<RightTab>("segments");
  const [leftTab,  setLeftTab]   = useState<LeftTab>("channels");
  const [simpleMode, setSimpleMode] = useState(false);

  const toggleChannel = (id: string) => {
    setVisibleChannels((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((c) => c !== id) : prev) : [...prev, id]
    );
  };

  const fmtMs = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2,"0")}.${String(ms % 1000).padStart(3,"0")}`;

  const lapTimeStr = parsedLap ? fmtMs(parsedLap.lapTimeMs) : "—";
  const refTimeMs  = analysisResult ? parsedLap!.lapTimeMs - analysisResult.totalTimeDeltaMs : 0;
  const refTimeStr = refTimeMs ? fmtMs(refTimeMs) : "—";
  const totalDistM = parsedLap ? (parsedLap.rows[parsedLap.rows.length - 1].lapDist ?? 0) : 0;

  type Ch = { id: string; label: string; color: string; unit: string; data: number[]; refData: number[]; min: number; max: number; rawData?: number[]; rawRefData?: number[] };
  const channels = (chartChannels as Ch[] | null) ?? [];

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Wow screen overlay */}
      {showWow && wowSummary && (
        <WowScreen
          summary={wowSummary}
          onDismiss={dismissWow}
          lapTimeStr={lapTimeStr}
          levelProgress={levelProgress}
          driverRank={driverRank}
          xpEarned={50}
        />
      )}

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3 flex-wrap shrink-0">
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Telemetry Analysis</p>
        <div className="h-4 w-px bg-zinc-800" />
        {status === "done" && filename && (
          <>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-lime-400/30 bg-lime-400/8 text-xs text-lime-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />{filename}
            </div>
            <div className="h-4 w-px bg-zinc-800" />
          </>
        )}
        <div className="flex-1" />

        {/* Simple mode toggle */}
        {status === "done" && (
          <button onClick={() => setSimpleMode((v) => !v)}
            className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all",
              simpleMode ? "border-blue-400/40 bg-blue-400/10 text-blue-400" : "border-zinc-700 text-zinc-500 hover:text-zinc-300")}>
            {simpleMode ? t.common.simple : t.common.detailed}
          </button>
        )}

        {status === "done" && (
          <Button variant="ghost" size="sm" onClick={reset}><RefreshCw size={13} />New lap</Button>
        )}
        {(status === "idle" || status === "error") && (
          <Button variant="primary" size="sm" onClick={() => {
            const inp = document.createElement("input"); inp.type="file"; inp.accept=".csv,.json,.txt";
            inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFile(f); };
            inp.click();
          }}><Upload size={13} />Upload Lap</Button>
        )}
      </div>

      {/* Idle / error */}
      {(status === "idle" || status === "error") && (
        <div className="flex flex-col flex-1 min-h-0">
          {status === "error" && (
            <div className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-red-400/30 bg-red-400/8">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <div><p className="text-xs font-medium text-red-400">Parse error</p><p className="text-xs text-zinc-400 mt-0.5">{error}</p></div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>Retry</Button>
            </div>
          )}
<DesktopUploadBanner onFile={handleFile} />
          <UploadZone onFile={handleFile} onSample={loadSampleData} />
        </div>
      )}

      {(status === "parsing" || status === "analyzing") && <ProcessingOverlay status={status} />}

      {status === "done" && analysisResult && channels.length > 0 && (
        <div className="flex-1 flex min-h-0">
          {/* ── Left: charts ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Summary bar */}
            <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-5 flex-wrap shrink-0">
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Your lap</p>
                <p className="text-lg font-mono tabular font-semibold text-lime-400">{lapTimeStr}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Reference</p>
                <p className="text-lg font-mono tabular font-semibold text-zinc-300">{refTimeStr}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Gap</p>
                <p className={cn("text-lg font-mono tabular font-semibold",
                  analysisResult.totalTimeDeltaMs > 0 ? "text-red-400" : "text-lime-400")}>
                  {analysisResult.totalTimeDeltaMs > 0 ? "+" : ""}
                  {(analysisResult.totalTimeDeltaMs / 1000).toFixed(3)}s
                </p>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              {analysisResult.sectors.map((s) => (
                <div key={s.sectorIdx}>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">S{s.sectorIdx + 1}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono tabular text-zinc-200">
                      {Math.floor(s.userTimeMs / 1000)}.{String(s.userTimeMs % 1000).padStart(3,"0")}
                    </span>
                    <span className={cn("text-xs font-mono tabular", s.deltaMs > 0 ? "text-red-400" : "text-lime-400")}>
                      {s.deltaMs > 0 ? "+" : ""}{(s.deltaMs / 1000).toFixed(3)}s
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex-1" />

              {/* Driver profile pill */}
              {driverProfile && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono">
                  <span>{driverProfile.emoji}</span>
                  <span className="text-zinc-400">{driverProfile.styleLabel}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-lime-400">{driverProfile.overallRating}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700">
                <Gauge size={13} className="text-lime-400" />
                <span className="text-xs font-mono text-zinc-400">Score</span>
                <span className="text-sm font-bold font-mono text-lime-400">{analysisResult.overallScore}</span>
              </div>

              {/* Channel toggles (hidden in simple mode) */}
              {!simpleMode && (
                <div className="flex items-center gap-1">
                  <Settings2 size={12} className="text-zinc-600 mr-1" />
                  {channels.filter((c) => c.id !== "delta" || true).map((ch) => (
                    <button key={ch.id} onClick={() => toggleChannel(ch.id)}
                      className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-all",
                        visibleChannels.includes(ch.id)
                          ? "border-zinc-600 bg-zinc-800 text-zinc-200"
                          : "border-zinc-800 text-zinc-600 hover:border-zinc-700")}>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: visibleChannels.includes(ch.id) ? ch.color : "#52525b" }} />
                      {ch.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* Left-panel view tabs */}
              <div className="flex gap-1 border-b border-zinc-800 pb-3">
                {([
                  ["channels", "Channels",  Activity],
                  ["heatmap",  "Track Map", Map],
                  ["ghost",    "Ghost Comparison", Layers],
                ] as const).map(([k, label, Icon]) => (
                  <button key={k} onClick={() => setLeftTab(k)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      leftTab === k ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>
                    <Icon size={12} />{label}
                  </button>
                ))}
              </div>

              {/* ── CHANNELS VIEW ── */}
              {leftTab === "channels" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono">
                    <div className="flex items-center gap-1.5"><div className="w-6 h-0.5 bg-lime-400 rounded" />Your lap</div>
                    <div className="flex items-center gap-1.5"><div className="w-6 border-t border-dashed border-zinc-500" />Reference</div>
                  </div>

                  {/* Main chart */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                    <div className="px-4 pt-3 pb-1 border-b border-zinc-800">
                      <p className="text-xs font-medium text-zinc-400">All channels · Distance axis</p>
                    </div>
                    <div className="p-4">
                      <TelemetryChart
                        channels={channels as Parameters<typeof TelemetryChart>[0]["channels"]}
                        visibleChannels={visibleChannels}
                        height={simpleMode ? 180 : 260}
                      />
                    </div>
                  </div>

                  {/* Delta chart */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                    <div className="px-4 pt-3 pb-1 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart2 size={13} className="text-blue-400" />
                        <p className="text-xs font-medium text-zinc-400">Delta Time</p>
                        <Badge variant="info">Key</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-red-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" />Losing</span>
                        <span className="text-lime-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-lime-400" />Gaining</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <DeltaChart delta={analysisResult.delta} totalDistM={totalDistM} height={160} className="w-full" />
                    </div>
                  </div>

                  {/* Optimal lap */}
                  <div className="rounded-xl border border-lime-400/20 bg-lime-400/5 p-4">
                    <div className="flex items-start gap-3">
                      <Zap size={16} className="text-lime-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-lime-400/70 mb-1">Optimal Lap</p>
                        <p className="text-sm font-medium text-zinc-100 mb-2">{analysisResult.optimalLap.summaryRu}</p>
                        {analysisResult.optimalLap.segmentContributions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {analysisResult.optimalLap.segmentContributions.map((c) => (
                              <span key={c.segmentLabel}
                                className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                                {c.segmentLabel}: −{(c.gainMs/1000).toFixed(3)}s
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-mono text-zinc-500 mb-0.5">Potential</p>
                        <p className="text-2xl font-mono font-bold text-lime-400">
                          −{(analysisResult.optimalLap.potentialGainMs/1000).toFixed(3)}s
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Per-channel detail (hidden in simple mode) */}
                  {!simpleMode && (
                    <div className="grid grid-cols-2 gap-3">
                      {channels.filter((ch) => visibleChannels.includes(ch.id) && ch.id !== "delta").map((ch) => (
                        <div key={ch.id} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                          <div className="px-4 pt-3 pb-1 border-b border-zinc-800 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: ch.color }} />
                            <p className="text-xs font-medium text-zinc-400">{ch.label}</p>
                            <span className="text-[10px] font-mono text-zinc-600 ml-auto">{ch.unit}</span>
                          </div>
                          <div className="p-3">
                            <TelemetryChart channels={[ch]} visibleChannels={[ch.id]} height={120} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats strip */}
                  {parsedLap && (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: t.telemetry.stats.maxSpeed,    value: `${Math.round(parsedLap.channelStats.maxSpeed)} km/h` },
                        { label: t.telemetry.stats.avgThrottle, value: `${Math.round(parsedLap.channelStats.avgThrottle)}%` },
                        { label: t.telemetry.stats.maxBrake,    value: `${Math.round(parsedLap.channelStats.maxBrake)}%`    },
                        { label: t.telemetry.stats.brakeZones,  value: parsedLap.channelStats.brakingEvents.length },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                          <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-500 mb-1">{label}</p>
                          <p className="text-sm font-mono font-medium text-zinc-200">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── HEATMAP VIEW ── */}
              {leftTab === "heatmap" && heatmapData && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{t.telemetry.trackMap}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Delta time distribution — red zones are where you lose the most time</p>
                    </div>
                  </div>
                  <TrackHeatmap
                    data={heatmapData}
                    segmentAnalyses={analysisResult.segmentAnalyses}
                    trackId="monza"
                    height={340}
                  />
                  {/* Worst segment callout */}
                  {analysisResult.segmentAnalyses.filter((sa) => sa.deltaMs > 0).length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {analysisResult.segmentAnalyses
                        .filter((sa) => sa.segment.type === "corner" && sa.deltaMs > 0)
                        .sort((a,b) => b.deltaMs - a.deltaMs)
                        .slice(0, 3)
                        .map((sa) => (
                          <div key={sa.segment.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                            <p className="text-[10px] font-mono text-zinc-500 mb-1">{sa.segment.label}</p>
                            <p className="text-red-400 font-mono text-sm font-medium">−{(sa.deltaMs/1000).toFixed(3)}s</p>
                            {sa.insights[0] && <p className="text-[11px] text-zinc-500 mt-1">{sa.insights[0].type.replace(/_/g," ")}</p>}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── GHOST COMPARISON VIEW ── */}
              {leftTab === "ghost" && channels.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">Ghost Comparison</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Your lap (solid) vs reference (dashed) — shaded area shows the difference</p>
                    </div>
                  </div>
                  <GhostComparison
                    channels={channels.filter((c) => c.id !== "delta") as Parameters<typeof GhostComparison>[0]["channels"]}
                  />

                  {/* Before / After for top issue */}
                  {(() => {
                    const topIssue = analysisResult.segmentAnalyses
                      .filter((sa) => sa.segment.type === "corner" && sa.insights.length > 0)
                      .sort((a,b) => b.deltaMs - a.deltaMs)[0];
                    const ins = topIssue?.insights[0];
                    if (!ins || ins.type === "good_segment") return null;

                    const chId = ins.type.includes("brake") ? "brake" : ins.type.includes("throttle") ? "throttle" : "speed";
                    const ch = channels.find((c) => c.id === chId);
                    if (!ch) return null;

                    const totalDist = parsedLap?.rows[parsedLap.rows.length - 1].lapDist ?? 1;
                    const startFrac = topIssue.segment.startDist / totalDist;
                    const endFrac   = topIssue.segment.endDist   / totalDist;
                    const startIdx  = Math.round(startFrac * ch.data.length);
                    const endIdx    = Math.round(endFrac   * ch.data.length);
                    const slice     = (arr: number[]) => arr.slice(startIdx, Math.min(endIdx, startIdx + 60));

                    return (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-zinc-400 mb-2">Biggest issue — before / after</p>
                        <BeforeAfter data={{
                          segmentLabel: topIssue.segment.label,
                          issueType:    ins.type,
                          currentData:  slice(ch.data),
                          optimalData:  slice(ch.refData),
                          channelLabel: ch.label,
                          channelColor: ch.color,
                          unit:         ch.unit,
                          gainS:        ins.timeCostMs / 1000,
                          tipShort:     ins.type.replace(/_/g, " "),
                          tipDetail:    ins.descriptionRu,
                        }} />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="w-80 shrink-0 border-l border-zinc-800 flex flex-col">
            <div className="flex border-b border-zinc-800 shrink-0">
              {([["segments",t.telemetry.segments],["insights",t.telemetry.insights],["coach",t.telemetry.coach],["engineer","Engineer"]] as const).map(([k,label]) => (
                <button key={k} onClick={() => setRightTab(k)}
                  className={cn("flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                    rightTab === k ? "bg-zinc-800 text-zinc-100 border-b-2 border-lime-400" : "text-zinc-500 hover:text-zinc-300")}>
                  {label}
                </button>
              ))}
            </div>

            {rightTab === "segments" && (
              <SegmentPanel
                segmentAnalyses={analysisResult.segmentAnalyses}
                totalTimeDeltaMs={analysisResult.totalTimeDeltaMs}
              />
            )}

            {rightTab === "insights" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-medium text-zinc-300">Lap Analysis</h3>
                    <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                      <TrendingDown size={10} />−{(analysisResult.totalTimeDeltaMs/1000).toFixed(3)}s
                    </span>
                  </div>
                  {analysisResult.dominantWeakness && (
                    <p className="text-[11px] font-mono text-yellow-400">
                      Main issue: {analysisResult.dominantWeakness.replace("_"," ")}
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {analysisResult.insights.length === 0 ? (
                    <div className="p-6 text-center">
                      <CheckCircle2 size={20} className="text-lime-400 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">No significant deviations from reference</p>
                    </div>
                  ) : (
                    analysisResult.insights.map((insight) => (
                      <InsightCard key={insight.id} insight={insight}
                        selected={selectedInsight?.id === insight.id}
                        onSelect={() => setSelectedInsight((p) => p?.id === insight.id ? null : insight)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {rightTab === "coach" && coachMessage && (
              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                <CoachPanel
                  message={coachMessage}
                  positives={positives}
                  patterns={patternReport}
                />
                {nextActions.length > 0 && (
                  <NextActionPanel actions={nextActions} />
                )}
              </div>
            )}

            {rightTab === "coach" && !coachMessage && (
              <div className="p-4 text-center text-xs text-zinc-600">
                Upload a lap to get coach feedback.
              </div>
            )}

            {/* AI Engineer link — always visible at bottom of right panel */}
            {uploadState.status === "done" && (
              <div className="border-t border-zinc-800 p-3">
                <a href="/engineer"
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border border-lime-400/25 bg-lime-400/6 hover:bg-lime-400/12 transition-all">
                  <Radio size={14} className="text-lime-400 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-lime-400 leading-none">AI Race Engineer</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Ask about this lap →</p>
                  </div>
                </a>
              </div>
            )}

            {rightTab === "engineer" && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
                  <Radio size={28} className="text-lime-400"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-200 mb-1">AI Race Engineer</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">Telemetry-aware coaching.<br/>Ask about your lap, corner techniques, or setup.</p>
                </div>
                <a href="/engineer" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold text-sm transition-all">
                  Open Engineer <ChevronRight size={14}/>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
