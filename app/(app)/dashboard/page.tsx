"use client";

import { useCopy } from "../../../shared/i18n/react";
import { useEffect, useState } from "react";
import {
  Upload, ChevronRight, ArrowRight, TrendingDown, TrendingUp, Zap, User, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { cn } from "@/lib/utils";
import { loadHistory } from "@/lib/progress/tracker";
import { computeStreak } from "@/lib/progress/streak";
import { analysePatterns } from "@/lib/patterns/detector";
import { computeLevelProgress, computeRank } from "@/lib/ranking/system";
import { useLang } from "@/context/LanguageContext";
import { useTelemetry } from "@/context/TelemetryContext";
import type { LapHistoryEntry, StreakData, LevelProgress, DriverRank } from "@/types/extended";
import { CoachToneIcon, Flame } from "@/lib/ui/icons";
import Link from "next/link";

function SessionRow({ entry }: { entry: LapHistoryEntry }) {
  const copy = useCopy();
  const fmtMs = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  return (
    <div className="flex items-center gap-3 border-b border-zinc-800/80 px-1 py-3 last:border-0">
      <div
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          entry.overallScore >= 70 ? "bg-lime-400" : entry.overallScore >= 50 ? "bg-amber-400" : "bg-red-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-zinc-200">{copy(fmtMs(entry.lapTimeMs))}</span>
          {entry.track && <span className="truncate text-xs text-zinc-400">{copy(entry.track)}</span>}
        </div>
        <p className="font-mono text-[11px] text-zinc-400">{copy(entry.uploadedAt.slice(0, 10))}</p>
      </div>
      <p className="font-mono text-xs tabular text-zinc-400">
        {copy("Score ")}{copy(entry.overallScore)}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const copy = useCopy();
  const { t } = useLang();
  const {
    uploadState, coachMessage, nextActions,
    levelProgress: ctxLevel, driverRank: ctxRank, driverProfile,
  } = useTelemetry();

  const [history, setHistory] = useState<LapHistoryEntry[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [levelProg, setLevelProg] = useState<LevelProgress | null>(null);
  const [rank, setRank] = useState<DriverRank | null>(null);

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    setStreak(computeStreak());
    setLevelProg(ctxLevel ?? computeLevelProgress(driverProfile));
    if (uploadState.analysisResult && uploadState.parsedLap) {
      setRank(ctxRank ?? computeRank(uploadState.analysisResult, uploadState.parsedLap.lapTimeMs));
    }
  }, [uploadState, ctxLevel, ctxRank, driverProfile]);

  const hasLap = uploadState.status === "done" && uploadState.analysisResult;
  const latestEntry = history[0];
  const improvement = history.length >= 2 ? history[1].lapTimeMs - history[0].lapTimeMs : null;
  const patterns = analysePatterns();

  const fmtMs = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;

  const primaryAction = nextActions[0];
  const patternNote =
    patterns.strongestPattern && patterns.sessionCount >= 3
      ? patterns.strongestPattern.descriptionEn
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 animate-fade-in sm:p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="apex-eyebrow mb-2">{copy("ui.029")}</p>
          <h1 className="apex-page-title">
            {copy(hasLap ? coachMessage?.headline ?? t.dashboard.welcomeBack : t.dashboard.welcomeBack)}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            {copy(
              hasLap
                ? coachMessage?.body
                : history.length > 0
                  ? `${copy("Local analyses")}: ${history.length}`
                  : t.dashboard.noLapYet,
            )}
          </p>
        </div>
        <Link href="/telemetry" className="shrink-0">
          <Button variant="primary" size="md">
            <Upload size={14} />{copy("ui.030")}
          </Button>
        </Link>
      </header>

      {/* Empty state — one job */}
      {!hasLap && history.length === 0 && (
        <section className="border-y border-zinc-800 py-10">
          <p className="font-display text-lg font-semibold text-zinc-100">{copy("ui.327")}</p>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">{copy("ui.328")}</p>
          <ol className="mt-8 space-y-5">
            {[
              { n: "01", t: "ui.327", d: "ui.328" },
              { n: "02", t: "ui.329", d: "ui.330" },
              { n: "03", t: "ui.333", d: "ui.334" },
            ].map(({ n, t: title, d }) => (
              <li key={n} className="flex gap-4">
                <span className="w-8 shrink-0 font-mono text-xs font-bold text-lime-400">{copy(n)}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{copy(title)}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{copy(d)}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/telemetry" className="mt-8 inline-flex">
            <Button variant="primary" size="lg">
              <Upload size={16} />{copy("ui.044")}
            </Button>
          </Link>
        </section>
      )}

      {/* Filled — next action first */}
      {hasLap && coachMessage && primaryAction && (
        <section className="border border-lime-400/25 bg-lime-400/5 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-lime-400/25 bg-lime-400/10">
              <CoachToneIcon tone={coachMessage.tone} size={18} className="text-lime-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-lime-400/70">{copy("ui.034")}</p>
              <p className="text-sm font-medium text-zinc-100">{copy(primaryAction.headlineEn)}</p>
              <p className="mt-1 text-xs text-zinc-400">{copy(coachMessage.actionLine)}</p>
              {patternNote && (
                <p className="mt-2 text-xs text-amber-400/90">{copy(patternNote)}</p>
              )}
            </div>
            <Link href={primaryAction.href} className="shrink-0">
              <Button variant="primary" size="sm">
                {copy(primaryAction.cta)} <ChevronRight size={12} />
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Last lap summary */}
      {(hasLap || latestEntry) && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="apex-eyebrow mb-1">{copy("Your progress")}</p>
              <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">
                {copy(hasLap ? uploadState.filename ?? "Latest lap" : "Latest lap")}
              </h2>
            </div>
            <Link href="/telemetry" className="font-mono text-[11px] text-zinc-400 transition-colors hover:text-lime-400">
              <span className="inline-flex items-center gap-1">
                <Activity size={12} />{copy("ui.030")}
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 sm:grid-cols-4">
            <div className="bg-zinc-950 p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">{copy("Latest lap")}</p>
              <p className="mt-2 font-mono text-xl font-semibold tabular text-lime-400">
                {copy(latestEntry ? fmtMs(latestEntry.lapTimeMs) : "—")}
              </p>
            </div>
            <div className="bg-zinc-950 p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">{copy(t.dashboard.stats.latestScore)}</p>
              <p className="mt-2 font-mono text-xl font-semibold tabular text-zinc-100">
                {copy(latestEntry?.overallScore ?? "—")}
              </p>
            </div>
            <div className="bg-zinc-950 p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">{copy("Delta")}</p>
              <p className={cn(
                "mt-2 font-mono text-xl font-semibold tabular",
                hasLap && uploadState.analysisResult!.totalTimeDeltaMs > 0 ? "text-red-400" : "text-lime-400",
              )}>
                {copy(
                  hasLap
                    ? `${uploadState.analysisResult!.totalTimeDeltaMs > 0 ? "+" : ""}${(uploadState.analysisResult!.totalTimeDeltaMs / 1000).toFixed(3)}s`
                    : "—",
                )}
              </p>
            </div>
            <div className="bg-zinc-950 p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">{copy("Local analyses")}</p>
              <p className="mt-2 font-mono text-xl font-semibold tabular text-zinc-100">{copy(history.length)}</p>
            </div>
          </div>

          {improvement !== null && Math.abs(improvement) > 50 && (
            <div className={cn(
              "mt-3 flex items-center gap-2 text-sm",
              improvement > 0 ? "text-lime-400" : "text-red-400",
            )}>
              {improvement > 0
                ? <TrendingUp size={15} className="shrink-0" />
                : <TrendingDown size={15} className="shrink-0" />}
              <span>
                {copy(
                  improvement > 0
                    ? `${(improvement / 1000).toFixed(3)}s gained since last session`
                    : `${(Math.abs(improvement) / 1000).toFixed(3)}s slower this session — check the analysis`,
                )}
              </span>
              {improvement > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs text-zinc-400">
                  <Zap size={11} />{copy(Math.min(500, Math.round(improvement * 0.1)))} XP
                </span>
              )}
            </div>
          )}
        </section>
      )}

      {/* Compact progress strip */}
      {(levelProg ?? ctxLevel) && (
        <section className="flex flex-wrap items-center gap-3 border-y border-zinc-800 py-4">
          <LevelBadge progress={(levelProg ?? ctxLevel)!} compact />
          {streak && streak.currentStreak > 0 && (
            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-amber-400">
              <Flame size={13} aria-hidden="true" />
              {copy(streak.currentStreak)}{copy("ui.031")}
            </div>
          )}
          {(rank ?? ctxRank) && (
            <span className="font-mono text-xs text-zinc-400">
              {copy("Top ")}{copy((rank ?? ctxRank)!.percentile)}%
            </span>
          )}
          <Link
            href="/profile"
            className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-zinc-400 transition-colors hover:text-zinc-400"
          >
            <User size={11} />{copy("ui.032")}
          </Link>
        </section>
      )}

      {/* Recent sessions — max 3 */}
      {history.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">{copy("Local analysis history")}</h2>
            <Link href="/sessions">
              <Button variant="ghost" size="sm">
                {copy("Saved uploads")}<ArrowRight size={12} />
              </Button>
            </Link>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-zinc-400">{copy("Analyses in this browser. Uploaded files are listed separately in Sessions.")}</p>
          <div>
            {history.slice(0, 3).map((entry) => (
              <SessionRow key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
