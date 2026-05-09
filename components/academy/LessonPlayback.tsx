"use client";
import { useState } from "react";
import { AlertCircle, CheckCircle, Activity } from "lucide-react";
import { TrackAnimation } from "./TrackAnimation";
import { cn } from "@/lib/utils";
import type { ModuleContent, LessonContent } from "@/lib/academy/content";
import { useTelemetry } from "@/context/TelemetryContext";
import { useLang } from "@/context/LanguageContext";

interface LessonPlaybackProps {
  module:    ModuleContent;
  lesson:    LessonContent;
  className?: string;
}

function guessTrackId(filename: string | null): string {
  if (!filename) return "monza";
  const f = filename.toLowerCase();
  if (f.includes("spa"))    return "spa";
  if (f.includes("silver")) return "silverstone";
  if (f.includes("nür") || f.includes("nurb") || f.includes("nurburg")) return "nurburgring";
  return "monza";
}

const MODULE_FOCUS: Record<string, [number, number]> = {
  m3: [0.05, 0.22],
  m4: [0.20, 0.38],
  m7: [0.05, 0.28],
  m8: [0.22, 0.42],
};

export function LessonPlayback({ module, lesson, className }: LessonPlaybackProps) {
  const { uploadState } = useTelemetry();
  const { t }           = useLang();
  const [tab, setTab]   = useState<"animation" | "data">("animation");

  const hasLap    = uploadState.status === "done" && uploadState.parsedLap;
  const trackId   = guessTrackId(uploadState.filename);
  const focusRange = MODULE_FOCUS[module.id] ?? null;

  const linkedSegment = uploadState.analysisResult?.segmentAnalyses
    .filter(sa => sa.segment.type === "corner" && sa.deltaMs > 0)
    .sort((a, b) => b.deltaMs - a.deltaMs)[0];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Live data callout */}
      {hasLap && linkedSegment && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-lime-400/20 bg-lime-400/5">
          <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shrink-0"/>
          <p className="text-xs text-zinc-300">
            <span className="text-lime-400 font-medium">{t.academy.liveData}:</span>{" "}
            {linkedSegment.segment.label}
            {" — "}
            <span className="text-red-400 font-mono">−{(linkedSegment.deltaMs / 1000).toFixed(3)}s</span>
          </p>
        </div>
      )}

      {/* No-lap prompt */}
      {!hasLap && (
        <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-5 text-center">
          <AlertCircle size={18} className="text-zinc-600 mx-auto mb-2"/>
          <p className="text-sm text-zinc-500 mb-1">{t.academy.noLapLinked}</p>
          <p className="text-xs text-zinc-600 mb-3">{t.academy.noLapLinkedSub}</p>
          <a href="/telemetry" className="text-xs font-mono text-lime-400 hover:text-lime-300 transition-colors">
            {t.academy.uploadLapLink}
          </a>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1">
        {([
          ["animation", t.academy.lesson.animationTitle],
          ["data",      t.academy.lesson.channelDataTitle],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              tab === k ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 border border-zinc-800")}>
            {label}
          </button>
        ))}
      </div>

      {/* Track animation */}
      {tab === "animation" && (
        <div>
          <p className="text-[11px] font-mono text-zinc-500 mb-2">
            {hasLap
              ? `${trackId.charAt(0).toUpperCase() + trackId.slice(1)} · brake/throttle zones`
              : `${module.title} — example layout`
            }
            {focusRange && (
              <span className="ml-2 text-lime-400/80">· focus zone highlighted</span>
            )}
          </p>
          <TrackAnimation
            trackId={trackId}
            userLap={uploadState.parsedLap}
            focusRange={focusRange}
            height={240}
          />
        </div>
      )}

      {/* Channel data */}
      {tab === "data" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          {hasLap && uploadState.analysisResult ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-zinc-400 mb-3">
                {t.academy.lesson.liveDataTitle}
              </p>
              {[
                {
                  label: t.academy.lesson.maxBrake,
                  value: `${Math.round(uploadState.parsedLap!.channelStats.maxBrake)}%`,
                  good: uploadState.parsedLap!.channelStats.maxBrake > 80,
                },
                {
                  label: t.academy.lesson.avgThrottle,
                  value: `${Math.round(uploadState.parsedLap!.channelStats.avgThrottle)}%`,
                  good: uploadState.parsedLap!.channelStats.avgThrottle > 55,
                },
                {
                  label: t.academy.lesson.brakeZones,
                  value: uploadState.parsedLap!.channelStats.brakingEvents.length.toString(),
                  good: true,
                },
                {
                  label: t.academy.lesson.lapScore,
                  value: `${uploadState.analysisResult.overallScore}/100`,
                  good: uploadState.analysisResult.overallScore >= 65,
                },
              ].map(({ label, value, good }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
                  <span className="text-xs text-zinc-400">{label}</span>
                  <div className="flex items-center gap-2">
                    {good
                      ? <CheckCircle size={11} className="text-lime-400"/>
                      : <AlertCircle size={11} className="text-yellow-400"/>
                    }
                    <span className="text-xs font-mono text-zinc-200">{value}</span>
                  </div>
                </div>
              ))}

              {/* Issue linked to this module */}
              {(() => {
                const catMap: Record<string, string> = {
                  m3: "brake", m4: "throttle", m7: "brake", m8: "throttle",
                };
                const cat = catMap[module.id];
                const ins = uploadState.analysisResult!.insights.find(i => i.category === cat && i.severity !== "good");
                if (!ins) return null;
                return (
                  <div className="mt-3 rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3">
                    <p className="text-xs font-medium text-yellow-400 mb-1">
                      {t.academy.lesson.issueDetected}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{ins.descriptionRu}</p>
                    <p className="text-[11px] font-mono text-red-400 mt-1.5">
                      −{(ins.timeCostMs / 1000).toFixed(3)}s {t.academy.lesson.perLap}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 text-center py-4">
              {t.academy.noLapLinkedSub}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
