"use client";
import { useTelemetry } from "@/context/TelemetryContext";
import { GhostComparison } from "@/components/charts/GhostComparison";
import { BeforeAfter } from "@/app/(app)/telemetry/components/BeforeAfter";
import { cn } from "@/lib/utils";
import type { ModuleContent, LessonContent } from "@/lib/academy/content";
import type { BeforeAfterData } from "@/types/extended";
import { resampleByDistance } from "@/lib/telemetry/analyzer";

interface LessonVisualsProps {
  module:  ModuleContent;
  lesson:  LessonContent;
  className?: string;
}

function buildBeforeAfterForLesson(
  lesson: LessonContent,
  chartChannels: ReturnType<typeof import("@/lib/telemetry/analyzer").buildChartChannels>,
  segLabel: string
): BeforeAfterData | null {
  // Map lesson telemetryCheck to the right channel and tip
  const { telemetryCheck } = lesson;
  if (!telemetryCheck || !chartChannels) return null;

  type Ch = { id: string; label: string; color: string; unit: string; data: number[]; refData: number[]; rawData?: number[]; rawRefData?: number[] };
  const channels = chartChannels as Ch[];

  const channelMap: Record<string, { id: string; tip: string; tipDetail: string }> = {
    brake_profile_shape:     { id: "brake",    tip: "Brake application profile",    tipDetail: "Apply brakes sharply at the start — full pressure in under 0.2s. This is the trapezoidal profile you should be seeing on the right." },
    brake_point_consistency: { id: "brake",    tip: "Brake point consistency",       tipDetail: "Fix a physical marker for your brake point in each corner. The variance between laps should be under 3 metres." },
    throttle_open_timing:    { id: "throttle", tip: "Throttle opening timing",       tipDetail: "Open the throttle at the speed minimum — not before and not more than 0.3s after. Earlier throttle means more speed down the following straight." },
    speed_min_corners:       { id: "speed",    tip: "Minimum corner speed",          tipDetail: "The car needs to rotate before the apex, not after. A later apex allows a straighter exit line — which unlocks earlier throttle." },
    lap_analysis_complete:   { id: "speed",    tip: "Lap overview",                  tipDetail: "Compare your speed trace lap to lap. The widening gap in the middle sector is your priority — one sector at a time." },
  };

  const meta = channelMap[telemetryCheck];
  if (!meta) return null;

  const ch = channels.find((c) => c.id === meta.id);
  if (!ch) return null;

  // Extract a 60-point window representing the most relevant part (simplified: first 60 points)
  const windowSize = 60;
  const currentData = ch.data.slice(0, windowSize);
  const optimalData = ch.refData.slice(0, windowSize);

  const gainEstimate = 0.15 + Math.random() * 0.2; // placeholder until real segment data feeds in

  return {
    segmentLabel:  segLabel,
    issueType:     meta.id,
    currentData,
    optimalData,
    channelLabel:  ch.label,
    channelColor:  ch.color,
    unit:          ch.unit,
    gainS:         Math.round(gainEstimate * 1000) / 1000,
    tipShort:      meta.tip,
    tipDetail:     meta.tipDetail,
  };
}

export function LessonVisuals({ module, lesson, className }: LessonVisualsProps) {
  const { uploadState, chartChannels } = useTelemetry();
  const hasLap = uploadState.status === "done" && chartChannels;

  if (!hasLap) {
    return (
      <div className={cn("rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center", className)}>
        <p className="text-sm text-zinc-500 mb-1">No lap data loaded</p>
        <p className="text-xs text-zinc-600">Upload a lap on the Telemetry page to see personalised visuals for this lesson.</p>
        <a href="/telemetry"
          className="inline-flex items-center gap-1.5 mt-3 text-xs font-mono text-lime-400 hover:text-lime-300 transition-colors">
          Upload a lap →
        </a>
      </div>
    );
  }

  type Ch = { id: string; label: string; color: string; unit: string; data: number[]; refData: number[]; rawData?: number[]; rawRefData?: number[] };
  const channels = (chartChannels as Ch[]).filter((c) => c.id !== "delta");

  const beforeAfter = buildBeforeAfterForLesson(lesson, chartChannels, module.title);

  // Find the segment this lesson is linked to (by category)
  const segAnalyses = uploadState.analysisResult?.segmentAnalyses ?? [];
  const linkedSeg = segAnalyses.find((sa) =>
    sa.insights.some((ins) => {
      const catMap: Record<string, string> = {
        m3: "early_brake", m4: "late_throttle", m7: "low_apex_speed", m8: "late_throttle",
      };
      return ins.type === catMap[module.id];
    })
  );

  const highlightRange: [number, number] | null = linkedSeg
    ? [
        (linkedSeg.segment.startDist) / (uploadState.parsedLap?.rows[uploadState.parsedLap.rows.length - 1].lapDist ?? 1),
        (linkedSeg.segment.endDist)   / (uploadState.parsedLap?.rows[uploadState.parsedLap.rows.length - 1].lapDist ?? 1),
      ]
    : null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Linked segment callout */}
      {linkedSeg && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-lime-400/20 bg-lime-400/5">
          <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse shrink-0" />
          <p className="text-xs text-zinc-300">
            <span className="text-lime-400 font-medium">Live data found:</span>{" "}
            This issue appears in your last lap at{" "}
            <span className="font-mono text-zinc-200">{linkedSeg.segment.label}</span>
            {linkedSeg.deltaMs > 0 &&
              <span className="text-red-400 font-mono"> (−{(linkedSeg.deltaMs / 1000).toFixed(3)}s)</span>
            }
          </p>
        </div>
      )}

      {/* Ghost comparison with optional highlight */}
      <div>
        <p className="text-xs font-medium text-zinc-400 mb-2">Your lap vs reference (all channels)</p>
        <GhostComparison
          channels={channels as Parameters<typeof GhostComparison>[0]["channels"]}
          highlightRange={highlightRange}
        />
      </div>

      {/* Before / after for this specific lesson */}
      {beforeAfter && (
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2">What to aim for</p>
          <BeforeAfter data={beforeAfter} />
        </div>
      )}
    </div>
  );
}
