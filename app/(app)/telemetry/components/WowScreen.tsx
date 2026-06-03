"use client";
import { useState } from "react";
import { ArrowRight, BookOpen, TrendingDown, TrendingUp, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WowSummary, DriverProfile, LevelProgress, DriverRank } from "@/types/extended";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { RankCard } from "@/components/ui/RankCard";

interface WowScreenProps {
  summary:       WowSummary;
  onDismiss:     () => void;
  lapTimeStr:    string;
  levelProgress?: LevelProgress | null;
  driverRank?:    DriverRank | null;
  xpEarned?:      number;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "#a3e635" : score >= 50 ? "#facc15" : "#f87171";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#27272a" strokeWidth="7" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-[10px] text-zinc-500 font-mono -mt-0.5">score</span>
      </div>
    </div>
  );
}

function ProfileBadge({ profile }: { profile: DriverProfile }) {
  const colors: Record<string, string> = {
    aggressive:   "border-red-400/30 bg-red-400/8 text-red-400",
    smooth:       "border-lime-400/30 bg-lime-400/8 text-lime-400",
    inconsistent: "border-yellow-400/30 bg-yellow-400/8 text-yellow-400",
    developing:   "border-blue-400/30 bg-blue-400/8 text-blue-400",
  };
  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono", colors[profile.style])}>
      <span>{profile.emoji}</span>
      <span>{profile.styleLabel}</span>
    </div>
  );
}

function IssuePill({ issue, idx }: { issue: WowSummary["topThreeIssues"][number]; idx: number }) {
  const colors = ["border-red-400/30 bg-red-400/8 text-red-300", "border-yellow-400/30 bg-yellow-400/8 text-yellow-300", "border-zinc-600 bg-zinc-800 text-zinc-400"];
  return (
    <div className={cn("rounded-lg border p-3", colors[idx] ?? colors[2])}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <span className="text-[10px] font-mono opacity-70">{issue.segmentLabel}</span>
          <p className="text-sm font-medium leading-snug">{issue.descriptionShort}</p>
        </div>
        <span className="text-sm font-mono font-bold shrink-0">{issue.metricRu ?? `−${issue.lossS.toFixed(3)}с`}</span>
      </div>
      {issue.academyLink && (
        <a href={issue.academyLink}
          className="inline-flex items-center gap-1 text-[11px] font-mono opacity-80 hover:opacity-100 transition-opacity mt-1">
          <BookOpen size={10} />
          {issue.academyTitle ?? "Разобрать"} →
        </a>
      )}
    </div>
  );
}

export function WowScreen({ summary, onDismiss, lapTimeStr, levelProgress, driverRank, xpEarned }: WowScreenProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4" style={{animation:"fadeIn 0.25s ease both"}}>
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden" style={{animation:"modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both"}}>

        {/* Header strip */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Круг проанализирован</p>
              <h2 className="text-2xl font-bold text-zinc-100 leading-tight">{summary.headline}</h2>
              <p className="text-sm text-zinc-400 mt-1">{summary.subheadline}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
            <ScoreRing score={summary.overallScore} />
            {xpEarned && xpEarned > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/30 text-[11px] font-mono text-yellow-400 animate-fade-in">
                <span>⚡</span>+{xpEarned} XP
              </div>
            )}
          </div>
          </div>

          {/* Key numbers strip */}
          <div className="flex items-center gap-5 mt-4 flex-wrap">
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Ваш круг</p>
              <p className="text-xl font-mono tabular font-semibold text-lime-400">{lapTimeStr}</p>
            </div>
            {summary.hasReference ? (
              <>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">vs Эталон</p>
                  <p className={cn("text-xl font-mono tabular font-semibold flex items-center gap-1",
                    summary.totalLossS > 0.05 ? "text-red-400" : "text-lime-400")}>
                    {summary.totalLossS > 0.05
                      ? <><TrendingDown size={16} /> +{summary.totalLossSFormatted}с</>
                      : <><TrendingUp size={16} /> Впереди!</>
                    }
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Потенциал</p>
                  <p className="text-xl font-mono tabular font-semibold text-yellow-400">
                    −{summary.potentialGainS.toFixed(3)}с
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Плавность</p>
                  <p className="text-xl font-mono tabular font-semibold text-lime-400">
                    {summary.smoothnessScore ?? "—"}<span className="text-sm text-zinc-500">/100</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Замечаний</p>
                  <p className="text-xl font-mono tabular font-semibold text-yellow-400">
                    {summary.issuesCount ?? 0}
                  </p>
                </div>
              </>
            )}
            <div className="ml-auto">
              <ProfileBadge profile={summary.profile} />
            </div>
          </div>
        </div>

        {/* Main: top issues */}
        <div className="px-6 py-4 space-y-2">
          <p className="text-xs font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <TrendingDown size={13} className="text-red-400" />
            {summary.hasReference ? "Где теряешь время" : "На что обратить внимание"}
          </p>
          {summary.topThreeIssues.map((issue, i) => (
            <IssuePill key={i} issue={issue} idx={i} />
          ))}
        </div>

        {/* Good areas */}
        {summary.goodAreas.length > 0 && (
          <div className="px-6 pb-2">
            <div className="rounded-lg border border-lime-400/20 bg-lime-400/5 px-3 py-2">
              <p className="text-xs text-lime-400 font-medium mb-1">
                ✓ Хорошо получается: {summary.goodAreas.join(" и ")}
              </p>
              <p className="text-[11px] text-zinc-400">{summary.profile.styleDescription}</p>
            </div>
          </div>
        )}

        {/* Expandable profile detail */}
        <button onClick={() => setShowDetails((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-3 border-t border-zinc-800 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <span className="font-mono">Профиль пилота</span>
          {showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showDetails && (
          <div className="px-6 pb-4 animate-slide-up">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Уверенность в торможении", value: summary.profile.brakeConfidence },
                { label: "Контроль газа",  value: summary.profile.throttleControl },
                { label: "Скорость в поворотах",      value: summary.profile.cornerSpeed },
                { label: "Стабильность",       value: summary.profile.consistency },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-800 rounded-lg p-2.5">
                  <p className="text-[10px] font-mono text-zinc-500 mb-1">{label}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full",
                        value >= 70 ? "bg-lime-400" : value >= 50 ? "bg-yellow-400" : "bg-red-400"
                      )} style={{ width: `${value}%` }} />
                    </div>
                    <span className="text-xs font-mono tabular text-zinc-300 w-6 text-right">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Motivational footer + CTA */}
        <div className="px-6 pb-6 pt-2 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-4 leading-relaxed">{summary.motivationalLine}</p>
          <div className="flex gap-2">
            <button onClick={onDismiss}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 text-sm font-semibold transition-colors">
              <Zap size={14} />
              Полный анализ
              <ArrowRight size={14} />
            </button>
            <a href="/engineer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-lime-400/30 bg-lime-400/8 hover:bg-lime-400/15 text-lime-400 text-sm transition-colors font-medium">
              🎧 Спросить инженера
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
