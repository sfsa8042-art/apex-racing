"use client";
import { useCopy } from "../../../../shared/i18n/react";

import { useState } from "react";
import { ChevronDown, ChevronUp, Star, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CoachMessage, PatternReport } from "@/types/extended";
import { CoachToneIcon } from "@/lib/ui/icons";

interface CoachPanelProps {
  message:       CoachMessage;
  positives:     string[];
  patterns:      PatternReport | null;
  className?:    string;
}

const TONE_BORDER: Record<CoachMessage["tone"], string> = {
  celebratory: "border-lime-400/30 bg-lime-400/5",
  encouraging: "border-lime-400/20 bg-lime-400/5",
  direct:      "border-zinc-700 bg-zinc-800/40",
  analytical:  "border-zinc-700 bg-zinc-900/60",
};

const TONE_ACCENT: Record<CoachMessage["tone"], string> = {
  celebratory: "text-lime-400",
  encouraging: "text-lime-400",
  direct:      "text-zinc-200",
  analytical:  "text-zinc-300",
};

export function CoachPanel({ message, positives, patterns, className }: CoachPanelProps) {
  const copy = useCopy();
  const [showPatterns, setShowPatterns] = useState(false);
  const hasPatterns = patterns && patterns.patterns.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main coach message */}
      <div className={cn("rounded-xl border p-4", TONE_BORDER[message.tone])}>
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-current/5", TONE_ACCENT[message.tone])}>
            <CoachToneIcon tone={message.tone} size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-semibold mb-1", TONE_ACCENT[message.tone])}>
              {copy(message.headline)}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed mb-2">
              {copy(message.body)}
            </p>
            <div className="pt-2 border-t border-zinc-700/50">
              <p className="text-xs text-zinc-300 leading-relaxed">
                <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mr-2">{copy("ui.146")}</span>
                {copy(message.actionLine)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Positive highlights */}
      {positives.length > 0 && (
        <div className="rounded-xl border border-lime-400/15 bg-lime-400/4 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Star size={12} className="text-lime-400" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-lime-400/80">
              {copy("ui.147")}</p>
          </div>
          <ul className="space-y-1.5">
            {positives.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                <span className="text-lime-400 mt-0.5 shrink-0">✓</span>
                {copy(line)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pattern insights (collapsible) */}
      {hasPatterns && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <button
            onClick={() => setShowPatterns((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
          >
            <AlertCircle size={14} className="text-yellow-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-300">
                {copy(patterns.persistentIssues.length > 0
                  ? `Pattern detected: ${patterns.strongestPattern?.descriptionEn}`
                  : "Cross-session patterns")
                }
              </p>
              <p className="text-[11px] text-zinc-500">
                {copy(patterns.sessionCount)} {copy(" sessions analysed · ")}{copy(patterns.patterns.length)} {copy(" pattern")}{copy(patterns.patterns.length !== 1 ? "s" : "")} {copy(" found")}</p>
            </div>
            {showPatterns ? <ChevronUp size={13} className="text-zinc-600 shrink-0" /> : <ChevronDown size={13} className="text-zinc-600 shrink-0" />}
          </button>

          {showPatterns && (
            <div className="px-4 pb-4 space-y-3 animate-slide-up">
              {/* Improving areas */}
              {patterns.improvingAreas.length > 0 && (
                <div className="rounded-lg bg-lime-400/6 border border-lime-400/15 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp size={11} className="text-lime-400" />
                    <p className="text-[10px] font-mono text-lime-400 uppercase tracking-widest">{copy("ui.151")}</p>
                  </div>
                  {patterns.improvingAreas.map((area, i) => (
                    <p key={i} className="text-xs text-zinc-300">{copy(area)}</p>
                  ))}
                </div>
              )}

              {/* Top patterns */}
              {patterns.patterns.slice(0, 3).map((pattern) => (
                <div key={pattern.id} className={cn(
                  "rounded-lg border p-3",
                  pattern.improving ? "border-lime-400/20 bg-lime-400/4" : "border-yellow-400/20 bg-yellow-400/4"
                )}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-zinc-200">{copy(pattern.descriptionEn)}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {pattern.improving && <span className="text-[10px] text-lime-400 font-mono">{copy("ui.152")}</span>}
                      <span className="text-[10px] text-zinc-500 font-mono">{copy(pattern.occurrences)} {copy(" sessions")}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{copy(pattern.coachNote)}</p>
                  {pattern.segments.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {pattern.segments.map((seg) => (
                        <span key={seg} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                          {copy(seg)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
