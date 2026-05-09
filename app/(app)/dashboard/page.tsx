"use client";
import { useEffect, useState } from "react";
import {
  Timer, Layers, Activity, Upload, BookOpen, ChevronRight,
  ArrowRight, TrendingDown, TrendingUp, Zap, User, Radio,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import { GoalsSection } from "@/components/ui/GoalCard";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { RankCard } from "@/components/ui/RankCard";
import { DailyGoalCard } from "@/components/ui/DailyGoalCard";
import { ShareCard } from "@/components/ui/ShareCard";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { cn } from "@/lib/utils";
import { ACADEMY_MODULES } from "@/lib/academy/content";
import { loadProgress, getModuleCompletedCount } from "@/lib/academy/progress";
import { loadHistory } from "@/lib/progress/tracker";
import { computeStreak } from "@/lib/progress/streak";
import { loadGoals } from "@/lib/goals/store";
import { analysePatterns } from "@/lib/patterns/detector";
import { computeLevelProgress, computeRank } from "@/lib/ranking/system";
import { getDailyLoop } from "@/lib/daily/goals";
import { useLang } from "@/context/LanguageContext";
import { useTelemetry } from "@/context/TelemetryContext";
import type { LapHistoryEntry, Goal, StreakData, PatternReport, LevelProgress, DriverRank, DailyGoal, DailyChallenge } from "@/types/extended";
import Link from "next/link";

function ScoreSparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const min = Math.min(...scores); const max = Math.max(...scores, min + 1);
  const W = 80; const H = 28;
  const pts = scores.map((s, i) => `${((i/(scores.length-1))*W).toFixed(1)},${(H - ((s-min)/(max-min))*H).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <polyline points={pts} fill="none" stroke="#a3e635" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={(scores.length-1)/(scores.length-1)*W} cy={H-((scores[scores.length-1]-min)/(max-min))*H} r="3" fill="#a3e635" />
    </svg>
  );
}

function SessionRow({ entry }: { entry: LapHistoryEntry }) {
  const fmtMs = (ms: number) => `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,"0")}.${String(ms%1000).padStart(3,"0")}`;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors">
      <div className={cn("w-2 h-2 rounded-full shrink-0", entry.overallScore >= 70 ? "bg-lime-400" : entry.overallScore >= 50 ? "bg-yellow-400" : "bg-red-400")} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200 font-mono">{fmtMs(entry.lapTimeMs)}</span>
          {entry.track && <span className="text-xs text-zinc-500">{entry.track}</span>}
        </div>
        <p className="text-[11px] text-zinc-600 font-mono">{entry.uploadedAt.slice(0,10)}</p>
      </div>
      <div className="text-right">
        <p className="text-xs font-mono tabular text-zinc-400">Score {entry.overallScore}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLang();
  const { uploadState, coachMessage, patternReport, nextActions, levelProgress: ctxLevel, driverRank: ctxRank, driverProfile } = useTelemetry();
  const [academyProg, setAcademyProg] = useState(() => loadProgress());
  const [history,     setHistory]     = useState<LapHistoryEntry[]>([]);
  const [goals,       setGoals]       = useState<Goal[]>([]);
  const [streak,      setStreak]      = useState<StreakData | null>(null);
  const [levelProg,   setLevelProg]   = useState<LevelProgress | null>(null);
  const [rank,        setRank]        = useState<DriverRank | null>(null);
  const [daily,       setDaily]       = useState<{ goal: DailyGoal; challenge: DailyChallenge } | null>(null);

  const refreshAll = () => {
    setAcademyProg(loadProgress());
    const h = loadHistory();
    setHistory(h);
    setGoals(loadGoals().goals.filter((g) => g.status === "active"));
    setStreak(computeStreak());
    setLevelProg(ctxLevel ?? computeLevelProgress(driverProfile));
    if (uploadState.analysisResult && uploadState.parsedLap) {
      setRank(ctxRank ?? computeRank(uploadState.analysisResult, uploadState.parsedLap.lapTimeMs));
    }
    try { setDaily(getDailyLoop()); } catch {}
  };

  useEffect(() => { refreshAll(); }, [uploadState, ctxLevel, ctxRank]);

  const inProgressModule = ACADEMY_MODULES.find((m) => {
    const c = getModuleCompletedCount(academyProg, m.id, m.lessons.length);
    return c > 0 && c < m.lessons.length;
  });

  const hasLap      = uploadState.status === "done" && uploadState.analysisResult;
  const latestEntry = history[0];
  const scoreHistory = history.map((e) => e.overallScore).reverse();
  const improvement  = history.length >= 2 ? history[1].lapTimeMs - history[0].lapTimeMs : null;
  const patterns     = analysePatterns();

  const fmtMs = (ms: number) =>
    `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,"0")}.${String(ms%1000).padStart(3,"0")}`;

  const sharePayload = hasLap && uploadState.parsedLap && (rank ?? ctxRank) && (levelProg ?? ctxLevel) ? {
    lapTimeStr:   fmtMs(uploadState.parsedLap.lapTimeMs),
    deltaStr:     `${uploadState.analysisResult!.totalTimeDeltaMs > 0 ? "+" : ""}${(uploadState.analysisResult!.totalTimeDeltaMs/1000).toFixed(3)}s`,
    score:        uploadState.analysisResult!.overallScore,
    level:        (levelProg ?? ctxLevel)!.level,
    percentile:   (rank ?? ctxRank)!.percentile,
    track:        null,
    improvements: uploadState.analysisResult!.insights.filter((i) => i.severity === "good").map((i) => i.titleRu),
    filename:     uploadState.filename ?? "",
    timestamp:    new Date().toISOString(),
  } : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <OnboardingFlow />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="text-2xl font-semibold text-zinc-100">
            {hasLap ? coachMessage?.headline ?? t.dashboard.welcomeBack : t.dashboard.welcomeBack}
          </h1>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
            {hasLap ? coachMessage?.body : history.length > 0 ? t.dashboard.sessionsTotal.replace("{n}", String(history.length)) : t.dashboard.noLapYet}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sharePayload && <ShareCard payload={sharePayload} />}
          <Link href="/telemetry">
            <Button variant="primary" size="md"><Upload size={14} />Upload Lap</Button>
          </Link>
        </div>
      </div>

      {/* Level + rank strip */}
      {(levelProg ?? ctxLevel) && (
        <div className="flex items-center gap-3 flex-wrap">
          <LevelBadge progress={(levelProg ?? ctxLevel)!} compact />
          {(rank ?? ctxRank) && <RankCard rank={(rank ?? ctxRank)!} compact />}
          {streak && streak.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-orange-400/30 bg-orange-400/8 text-xs font-mono text-orange-400">
              🔥 {streak.currentStreak}d streak
            </div>
          )}
          <Link href="/profile" className="flex items-center gap-1 text-[11px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors ml-auto">
            <User size={11} />View full profile
          </Link>
        </div>
      )}

      {/* Improvement banner */}
      {improvement !== null && Math.abs(improvement) > 50 && (
        <div className={cn("rounded-xl border p-3 flex items-center gap-3",
          improvement > 0 ? "border-lime-400/25 bg-lime-400/5" : "border-red-400/20 bg-red-400/5")}>
          {improvement > 0 ? <TrendingUp size={15} className="text-lime-400 shrink-0" /> : <TrendingDown size={15} className="text-red-400 shrink-0" />}
          <p className={cn("text-sm font-medium", improvement > 0 ? "text-lime-400" : "text-red-400")}>
            {improvement > 0 ? `${(improvement/1000).toFixed(3)}s gained since last session` : `${(Math.abs(improvement)/1000).toFixed(3)}s slower this session — check the analysis`}
          </p>
          {improvement > 0 && (
            <div className="flex items-center gap-1 text-xs font-mono text-yellow-400 ml-auto">
              <Zap size={11} />{Math.min(500, Math.round(improvement * 0.1))} XP earned
            </div>
          )}
        </div>
      )}

      {/* Next action */}
      {hasLap && coachMessage && nextActions.length > 0 && (
        <div className="rounded-xl border border-lime-400/25 bg-lime-400/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0">{coachMessage.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-lime-400/70 mb-1">Next step</p>
              <p className="text-sm font-medium text-zinc-100 mb-1">{nextActions[0].headlineEn}</p>
              <p className="text-xs text-zinc-400">{coachMessage.actionLine}</p>
            </div>
            <Link href={nextActions[0].href}>
              <Button variant="primary" size="sm" className="shrink-0">{nextActions[0].cta} <ChevronRight size={12} /></Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t.dashboard.stats.bestLap} value={latestEntry ? fmtMs(latestEntry.lapTimeMs) : "—"} subValue={latestEntry?.track ?? t.common.noData} icon={Timer} accentColor="text-lime-400" />
        <StatCard label={t.dashboard.stats.totalLaps} value={history.length} subValue={t.common.allTime} icon={Layers} accentColor="text-zinc-100" />
        <StatCard label={t.dashboard.stats.latestScore} value={latestEntry?.overallScore ?? "—"} subValue={latestEntry ? t.dashboard.stats.outOf : t.dashboard.stats.uploadForScore} icon={Activity}
          trend={improvement !== null && improvement > 0 ? "up" : "neutral"}
          trendValue={improvement !== null ? `${improvement > 0 ? "+" : ""}${(improvement/1000).toFixed(3)}s` : undefined}
          accentColor={latestEntry && latestEntry.overallScore >= 70 ? "text-lime-400" : "text-yellow-400"} />
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Progress</p>
          <ScoreSparkline scores={scoreHistory} />
          {scoreHistory.length < 2 && <p className="text-xs text-zinc-600">Drive 2+ sessions to see trend</p>}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pattern alert */}
          {patterns.strongestPattern && patterns.sessionCount >= 3 && (
            <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg shrink-0">🔍</span>
                <div className="flex-1">
                  <p className="text-[10px] font-mono text-yellow-400/70 uppercase tracking-widest mb-1">Recurring pattern</p>
                  <p className="text-sm font-medium text-zinc-100 mb-1">{patterns.strongestPattern.descriptionEn}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{patterns.strongestPattern.coachNote}</p>
                  {patterns.improvingAreas.length > 0 && (
                    <p className="text-xs text-lime-400 mt-2">↑ Improving: {patterns.improvingAreas[0]}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Academy module */}
          {inProgressModule && (
            <Card>
              <CardHeader>
                <CardTitle label={t.nav.academy}>M{inProgressModule.number}: {inProgressModule.title}</CardTitle>
                <Badge variant="warning">In Progress</Badge>
              </CardHeader>
              <ProgressBar value={getModuleCompletedCount(academyProg, inProgressModule.id, inProgressModule.lessons.length)} max={inProgressModule.lessons.length} animated label={`${getModuleCompletedCount(academyProg, inProgressModule.id, inProgressModule.lessons.length)}/${inProgressModule.lessons.length} lessons`} showLabel className="mb-3" />
              <Link href={`/academy?module=${inProgressModule.id}`}>
                <Button variant="primary" size="sm">Continue lesson <ChevronRight size={12} /></Button>
              </Link>
            </Card>
          )}

          {/* Sessions */}
          <Card>
            <CardHeader>
              <CardTitle label={t.dashboard.stats.totalLaps}>Recent uploads</CardTitle>
              <Link href="/sessions"><Button variant="ghost" size="sm">View all <ArrowRight size={12} /></Button></Link>
            </CardHeader>
            {history.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-zinc-500 mb-3">No sessions yet</p>
                <Link href="/telemetry"><Button variant="secondary" size="sm"><Upload size={13} />Upload your first lap</Button></Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {history.slice(0, 5).map((entry) => <SessionRow key={entry.id} entry={entry} />)}
              </div>
            )}
          </Card>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          {/* Daily loop */}
          {daily && (
            <DailyGoalCard goal={daily.goal} challenge={daily.challenge} onRefresh={refreshAll} />
          )}

          {/* Streak */}
          {streak && <StreakBadge streak={streak} />}

          {/* Goals */}
          <Card>
            <GoalsSection goals={goals} onRefresh={refreshAll} lapTimeMs={latestEntry?.lapTimeMs ?? null} />
          </Card>

          {/* Quick actions */}
          <Card>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">Quick Actions</p>
            <div className="space-y-1">
              {[
                { icon: Upload,   label: "Upload lap",       href: "/telemetry", color: "text-lime-400" },
                { icon: Activity, label: "Open telemetry",   href: "/telemetry", color: "text-blue-400" },
                { icon: BookOpen, label: "Continue academy", href: "/academy",   color: "text-yellow-400" },
                { icon: User,     label: "Driver profile",   href: "/profile",   color: "text-purple-400" },
              ].map(({ icon: Icon, label, href, color }) => (
                <Link key={label} href={href}>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-sm text-left">
                    <Icon size={14} className={color} />
                    {label}
                    <ChevronRight size={12} className="ml-auto text-zinc-700" />
                  </button>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
