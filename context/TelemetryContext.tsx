"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ParsedLap, LapAnalysisResult, UploadState } from "@/types/telemetry";
import type {
  WowSummary, DriverProfile, ProgressSummary, TrackHeatmapData,
  PatternReport, CoachMessage, NextAction, LevelProgress, DriverRank,
} from "@/types/extended";
import { parseFile } from "@/lib/telemetry/parser";
import { analyseLap, buildChartChannels } from "@/lib/telemetry/analyzer";
import { buildSyntheticReference } from "@/lib/telemetry/reference";
import { detectDriverProfile } from "@/lib/driver/profile";
import { buildHistoryEntry, computeProgress, saveEntry, buildWowSummary } from "@/lib/progress/tracker";
import { buildHeatmapData } from "@/lib/telemetry/heatmap";
import { persistIssues, analysePatterns } from "@/lib/patterns/detector";
import { buildCoachMessage, buildNextActions, getPositiveFeedback } from "@/lib/coach/voice";
import { updateGoalsFromAnalysis, getActiveGoals } from "@/lib/goals/store";
import { computeLevelProgress, computeRank, awardLapXP } from "@/lib/ranking/system";
import { updateDailyGoalFromAnalysis } from "@/lib/daily/goals";

type ChartChannels = ReturnType<typeof buildChartChannels>;

interface TelemetryContextValue {
  uploadState:    UploadState;
  refLap:         ParsedLap | null;
  chartChannels:  ChartChannels | null;
  driverProfile:  DriverProfile | null;
  wowSummary:     WowSummary | null;
  progress:       ProgressSummary | null;
  heatmapData:    TrackHeatmapData | null;
  patternReport:  PatternReport | null;
  coachMessage:   CoachMessage | null;
  nextActions:    NextAction[];
  positives:      string[];
  levelProgress:  LevelProgress | null;
  driverRank:     DriverRank | null;
  showWow:        boolean;
  dismissWow:     () => void;
  handleFile:     (file: File) => Promise<void>;
  reset:          () => void;
  loadSampleData: () => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

const INITIAL: UploadState = {
  status: "idle", error: null, filename: null, parsedLap: null, analysisResult: null,
};

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [uploadState,   setUploadState]   = useState<UploadState>(INITIAL);
  const [refLap,        setRefLap]        = useState<ParsedLap | null>(null);
  const [chartChannels, setChartCh]       = useState<ChartChannels | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [wowSummary,    setWowSummary]    = useState<WowSummary | null>(null);
  const [progress,      setProgress]      = useState<ProgressSummary | null>(null);
  const [heatmapData,   setHeatmapData]   = useState<TrackHeatmapData | null>(null);
  const [patternReport, setPatternReport] = useState<PatternReport | null>(null);
  const [coachMessage,  setCoachMessage]  = useState<CoachMessage | null>(null);
  const [nextActions,   setNextActions]   = useState<NextAction[]>([]);
  const [positives,     setPositives]     = useState<string[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [driverRank,    setDriverRank]    = useState<DriverRank | null>(null);
  const [showWow,       setShowWow]       = useState(false);

  const run = useCallback(async (parsed: ParsedLap, filename: string) => {
    setUploadState((s) => ({ ...s, status: "analyzing", parsedLap: parsed }));

    // ── Detect track from filename and fetch community reference ──
    const trackMap: Record<string, string> = {
      nurburgring: "nurburgring", monza: "monza", spa: "spa",
      silverstone: "silverstone", suzuka: "suzuka", imola: "imola", barcelona: "barcelona",
    };
    const nameLower  = filename.toLowerCase();
    const detectedTrack = Object.keys(trackMap).find(k => nameLower.includes(k)) ?? "monza";

    let ref: ParsedLap;
    let refSource: "community" | "synthetic" = "synthetic";
    try {
      const r = await fetch(`/api/reference/laps?track=${detectedTrack}`);
      const d = await r.json();
      if (d.found && d.csv) {
        const blob = new Blob([d.csv], { type: "text/csv" });
        const file = new File([blob], `${detectedTrack}_reference.csv`);
        const { parseFile } = await import("@/lib/telemetry/parser");
        ref = await parseFile(file);
        refSource = "community";
      } else {
        ref = buildSyntheticReference(parsed);
      }
    } catch {
      ref = buildSyntheticReference(parsed);
    }
    setRefLap(ref);

    const result   = analyseLap(parsed, ref);
    const channels = buildChartChannels(parsed, ref);
    setChartCh(channels);

    const profile = detectDriverProfile(parsed, result.segmentAnalyses);
    setDriverProfile(profile);

    // ── Auto-submit to community reference if it could be top lap ──
    try {
      const { csv: parsedCsv } = await (async () => {
        const resp = await fetch("/api/sessions?all=1").catch(() => ({ ok: false }));
        return { csv: null };
      })();
      // Build CSV from parsed lap for submission
      const csvLines = ["time,speed,throttle,brake,gear,rpm,steerAngle,lateralG,longitudinalG"];
      parsed.rows.forEach(r => {
        csvLines.push(`${r.time.toFixed(3)},${r.speed.toFixed(1)},${r.throttle.toFixed(1)},${r.brake.toFixed(1)},${r.gear},${r.rpm ?? 0},${(r.steerAngle ?? 0).toFixed(2)},${(r.lateralG ?? 0).toFixed(4)},0`);
      });
      if (csvLines.length > 200) {
        fetch("/api/reference/laps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            track: detectedTrack,
            lapTimeMs: parsed.lapTimeMs,
            csv: csvLines.join("\n"),
            car: filename.includes("porsche") ? "Porsche 992 GT3" :
                 filename.includes("mercedes") ? "Mercedes AMG GT3" :
                 filename.includes("mclaren") ? "McLaren 720S GT3" :
                 filename.includes("ferrari") ? "Ferrari 296 GT3" : "GT3",
          }),
        }).catch(() => {});
      }
    } catch {}

    const entry    = buildHistoryEntry(filename, result, parsed.lapTimeMs, profile.style);
    const prog     = computeProgress(entry);
    const isFirst  = prog.entries.length <= 1;
    saveEntry(entry);
    setProgress(prog);

    // Award XP for this lap
    awardLapXP(result, prog.improvementMs, isFirst);

    persistIssues(entry.id, result);
    const patterns = analysePatterns();
    setPatternReport(patterns);

    const coach = buildCoachMessage(result, prog, profile, patterns);
    setCoachMessage(coach);

    const hasGoals = getActiveGoals().length > 0;
    const actions  = buildNextActions(result, patterns, hasGoals);
    setNextActions(actions);

    setPositives(getPositiveFeedback(result));
    updateGoalsFromAnalysis(result, parsed.lapTimeMs);
    updateDailyGoalFromAnalysis(result);

    // Level + rank
    const lvl  = computeLevelProgress(profile);
    const rank = computeRank(result, parsed.lapTimeMs);
    setLevelProgress(lvl);
    setDriverRank(rank);

    const wow = buildWowSummary(result, prog, profile);
    setWowSummary(wow);

    const segLabels = result.segmentAnalyses.map((sa) => ({
      startDist: sa.segment.startDist, label: sa.segment.label,
    }));
    setHeatmapData(buildHeatmapData(parsed.rows, result.delta, segLabels));

    setUploadState({
      status: "done", error: null, filename,
      parsedLap: parsed, analysisResult: result,
    });

    setTimeout(() => setShowWow(true), 300);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setUploadState((s) => ({ ...s, status: "error", error: "File too large (max 50 MB)" }));
      return;
    }
    setUploadState({ status: "parsing", error: null, filename: file.name, parsedLap: null, analysisResult: null });
    try {
      await run(await parseFile(file), file.name);
    } catch (err) {
      setUploadState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : "Parse error" }));
    }
  }, [run]);

  const loadSampleData = useCallback(async () => {
    setUploadState({ status: "parsing", error: null, filename: "sample_lap.csv", parsedLap: null, analysisResult: null });
    try {
      const { SAMPLE_REFERENCE_CSV } = await import("@/lib/telemetry/reference");
      const base = await parseFile(new File([new Blob([SAMPLE_REFERENCE_CSV], { type: "text/csv" })], "sample_lap.csv"));
      const brakingEvents = base.channelStats.brakingEvents;
      const rows = base.rows.map((r, i) => {
        const near = brakingEvents.some((ev) => i >= ev.startIdx - 6 && i < ev.startIdx);
        return { ...r, speed: r.speed * 0.965, brake: near ? Math.min(100, r.brake + 18) : r.brake, throttle: (i > 8 && i < 18) ? Math.max(0, r.throttle - 22) : r.throttle };
      });
      let dist = 0; rows[0].lapDist = 0;
      for (let i = 1; i < rows.length; i++) {
        dist += ((rows[i].speed + rows[i-1].speed) / 2 / 3.6) * (rows[i].time - rows[i-1].time);
        rows[i].lapDist = dist;
      }
      await run({
        ...base, rows, lapTimeMs: Math.round(base.lapTimeMs * 1.028),
        id: `sample_${Date.now()}`,
        channelStats: { ...base.channelStats, maxSpeed: Math.max(...rows.map((r) => r.speed)), minSpeed: Math.min(...rows.map((r) => r.speed)) },
      }, "sample_lap.csv");
    } catch (err) {
      setUploadState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : "Sample load error" }));
    }
  }, [run]);

  const reset      = useCallback(() => {
    setUploadState(INITIAL); setRefLap(null); setChartCh(null);
    setDriverProfile(null); setWowSummary(null); setProgress(null);
    setHeatmapData(null); setPatternReport(null); setCoachMessage(null);
    setNextActions([]); setPositives([]); setLevelProgress(null); setDriverRank(null);
    setShowWow(false);
  }, []);

  const dismissWow = useCallback(() => setShowWow(false), []);

  return (
    <TelemetryContext.Provider value={{
      uploadState, refLap, chartChannels, driverProfile, wowSummary, progress,
      heatmapData, patternReport, coachMessage, nextActions, positives,
      levelProgress, driverRank, showWow, dismissWow, handleFile, reset, loadSampleData,
    }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useTelemetry must be used within TelemetryProvider");
  return ctx;
}
