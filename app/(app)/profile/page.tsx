"use client";
import { useState, useEffect } from "react";
import { Activity, TrendingUp, TrendingDown, Minus, Calendar, Zap, Trophy } from "lucide-react";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { RankCard } from "@/components/ui/RankCard";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { ShareCard } from "@/components/ui/ShareCard";
import { cn } from "@/lib/utils";
import { computeLevelProgress } from "@/lib/ranking/system";
import { computeStreak } from "@/lib/progress/streak";
import { loadHistory } from "@/lib/progress/tracker";
import { analysePatterns } from "@/lib/patterns/detector";
import { useTelemetry } from "@/context/TelemetryContext";
import type { LevelProgress, DriverRank, StreakData, LapHistoryEntry } from "@/types/extended";

// ─── Improvement graph (SVG sparkline) ────────────────────────────────────────
function ImprovementGraph({ entries }: { entries: LapHistoryEntry[] }) {
  if (entries.length < 2) return (
    <div className="h-32 flex items-center justify-center">
      <p className="text-xs text-zinc-600">Upload 2+ laps to see your improvement trend</p>
    </div>
  );

  const W = 600; const H = 100;
  const PAD = { left: 8, right: 8, top: 8, bottom: 20 };
  const drawW = W - PAD.left - PAD.right;
  const drawH = H - PAD.top - PAD.bottom;

  const scores = [...entries].reverse().map((e) => e.overallScore);
  const minS = Math.max(0, Math.min(...scores) - 5);
  const maxS = Math.min(100, Math.max(...scores) + 5);

  const toX = (i: number) => PAD.left + (i / (scores.length - 1)) * drawW;
  const toY = (s: number) => PAD.top + drawH - ((s - minS) / (maxS - minS)) * drawH;

  const path = scores.map((s, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(s).toFixed(1)}`).join(" ");
  const area = `${path} L ${toX(scores.length - 1).toFixed(1)} ${(PAD.top + drawH).toFixed(1)} L ${PAD.left.toFixed(1)} ${(PAD.top + drawH).toFixed(1)} Z`;

  const trend = scores[scores.length - 1] - scores[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-zinc-400">Score over time</p>
        <div className={cn("flex items-center gap-1 text-xs font-mono",
          trend > 0 ? "text-lime-400" : trend < 0 ? "text-red-400" : "text-zinc-500")}>
          {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          {trend > 0 ? "+" : ""}{trend.toFixed(0)} pts trend
        </div>
      </div>
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
          {/* Grid */}
          {[25, 50, 75].map((v) => (
            <line key={v} x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
              stroke="#27272a" strokeWidth="0.5" />
          ))}
          {/* Area fill */}
          <path d={area} fill="rgba(163,230,53,0.06)" />
          {/* Line */}
          <path d={path} fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Dots */}
          {scores.map((s, i) => (
            <circle key={i} cx={toX(i)} cy={toY(s)} r="3.5"
              fill={i === scores.length - 1 ? "#a3e635" : "#18181b"}
              stroke="#a3e635" strokeWidth="1.5" />
          ))}
          {/* X labels */}
          {scores.slice(-5).map((_, i) => {
            const idx = Math.max(0, scores.length - 5) + i;
            const entry = [...entries].reverse()[idx];
            return (
              <text key={idx} x={toX(idx)} y={H - 4} textAnchor="middle" fontSize="8"
                fill="#52525b" fontFamily="monospace">
                {entry?.uploadedAt.slice(5, 10) ?? ""}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Session timeline ─────────────────────────────────────────────────────────
function SessionTimeline({ entries }: { entries: LapHistoryEntry[] }) {
  const fmtMs = (ms: number) =>
    `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,"0")}.${String(ms%1000).padStart(3,"0")}`;

  return (
    <div className="space-y-2">
      {entries.slice(0, 10).map((entry, i) => {
        const prev = entries[i + 1];
        const improvement = prev ? prev.lapTimeMs - entry.lapTimeMs : null;
        const isFaster = improvement !== null && improvement > 0;

        return (
          <div key={entry.id} className="flex items-start gap-3 group">
            {/* Timeline dot & line */}
            <div className="flex flex-col items-center shrink-0">
              <div className={cn(
                "w-3 h-3 rounded-full border-2 mt-1",
                i === 0 ? "bg-lime-400 border-lime-400" :
                entry.overallScore >= 70 ? "bg-zinc-400 border-zinc-400" : "bg-zinc-700 border-zinc-700"
              )} />
              {i < entries.length - 1 && (
                <div className="w-px flex-1 bg-zinc-800 mt-1 min-h-[20px]" />
              )}
            </div>

            <div className={cn(
              "flex-1 rounded-xl border p-3 transition-all mb-2",
              i === 0 ? "border-lime-400/20 bg-lime-400/4" : "border-zinc-800 bg-zinc-900"
            )}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono tabular font-semibold text-zinc-100">
                    {fmtMs(entry.lapTimeMs)}
                  </span>
                  {entry.track && (
                    <span className="text-xs text-zinc-500">{entry.track}</span>
                  )}
                  {i === 0 && (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-lime-400 border border-lime-400/30 bg-lime-400/8 px-1.5 py-0.5 rounded">
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {improvement !== null && (
                    <span className={cn("text-xs font-mono tabular",
                      isFaster ? "text-lime-400" : "text-red-400")}>
                      {isFaster ? "+" : ""}{(improvement / 1000).toFixed(3)}s
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-xs font-mono">
                    <div className={cn("w-1.5 h-1.5 rounded-full",
                      entry.overallScore >= 70 ? "bg-lime-400" : entry.overallScore >= 50 ? "bg-yellow-400" : "bg-red-400"
                    )} />
                    <span className="text-zinc-400">{entry.overallScore}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-600 font-mono">
                <Calendar size={9} />
                {new Date(entry.uploadedAt).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                {entry.topIssue && (
                  <span className="capitalize">· {entry.topIssue.replace("_", " ")}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Memory / long-term feedback ──────────────────────────────────────────────
function DriverMemory() {
  const patterns = analysePatterns();
  if (patterns.patterns.length === 0) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Driver Memory</p>
      <div className="space-y-2">
        {patterns.patterns.slice(0, 3).map((p) => (
          <div key={p.id} className={cn(
            "rounded-lg border px-3 py-2.5",
            p.improving ? "border-lime-400/20 bg-lime-400/4" : "border-zinc-700 bg-zinc-800"
          )}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-zinc-200">{p.descriptionEn}</p>
              {p.improving && (
                <span className="text-[10px] font-mono text-lime-400 shrink-0">↑ improving</span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{p.coachNote}</p>
          </div>
        ))}
        {patterns.improvingAreas.length > 0 && (
          <div className="rounded-lg border border-lime-400/20 bg-lime-400/5 px-3 py-2">
            <p className="text-xs text-lime-400">✓ {patterns.improvingAreas.join(", ")} — showing consistent improvement</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { uploadState, driverProfile } = useTelemetry();
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [rank,          setRank]          = useState<DriverRank | null>(null);
  const [streak,        setStreak]        = useState<StreakData | null>(null);
  const [history,       setHistory]       = useState<LapHistoryEntry[]>([]);

  useEffect(() => {
    const profile = driverProfile;
    setLevelProgress(computeLevelProgress(profile));
    setStreak(computeStreak());
    const h = loadHistory();
    setHistory(h);

    if (uploadState.analysisResult) {
      const { computeRank } = require("@/lib/ranking/system");
      setRank(computeRank(uploadState.analysisResult, uploadState.parsedLap?.lapTimeMs ?? 0));
    }
  }, [uploadState, driverProfile]);

  const fmtMs = (ms: number) =>
    `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,"0")}.${String(ms%1000).padStart(3,"0")}`;

  const sharePayload = uploadState.analysisResult && uploadState.parsedLap && rank && levelProgress ? {
    lapTimeStr:   fmtMs(uploadState.parsedLap.lapTimeMs),
    deltaStr:     `${uploadState.analysisResult.totalTimeDeltaMs > 0 ? "+" : ""}${(uploadState.analysisResult.totalTimeDeltaMs/1000).toFixed(3)}s`,
    score:        uploadState.analysisResult.overallScore,
    level:        levelProgress.level,
    percentile:   rank.percentile,
    track:        null,
    improvements: uploadState.analysisResult.insights.filter((i) => i.severity === "good").map((i) => i.titleRu),
    filename:     uploadState.filename ?? "",
    timestamp:    new Date().toISOString(),
  } : null;

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Driver Profile</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center">
              <span className="text-zinc-950 text-sm font-bold">MB</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-100">Marco B.</h1>
              {levelProgress && (
                <p className="text-sm text-zinc-500">{levelProgress.level} · {levelProgress.totalXP.toLocaleString()} XP</p>
              )}
            </div>
          </div>
        </div>
        {sharePayload && <ShareCard payload={sharePayload} />}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left: level + rank */}
        <div className="lg:col-span-1 space-y-4">
          {levelProgress && (
            <LevelBadge progress={levelProgress} />
          )}
          {rank && (
            <RankCard rank={rank} />
          )}
          {streak && (
            <StreakBadge streak={streak} />
          )}
        </div>

        {/* Right: history + memory */}
        <div className="lg:col-span-2 space-y-4">
          {history.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <ImprovementGraph entries={history} />
            </div>
          )}

          <DriverMemory />

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
              <Activity size={13} className="text-lime-400" />
              <p className="text-xs font-medium text-zinc-300">Session Timeline</p>
              <span className="text-[10px] font-mono text-zinc-600 ml-auto">{history.length} sessions</span>
            </div>
            <div className="p-4">
              {history.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4">No sessions yet — upload your first lap</p>
              ) : (
                <SessionTimeline entries={history} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
