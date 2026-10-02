/**
 * lib/coach/voice.ts
 *
 * Generates coach messages with personality:
 * - Mixes encouragement with critique
 * - Adapts tone to driver style and situation
 * - Never robotic — always specific and human
 */

import type { DriverProfile, DrivingStyle, CoachMessage, CoachTone, PatternReport } from "@/types/extended";
import type { LapAnalysisResult, AnalysisInsight } from "@/types/telemetry";
import type { ProgressSummary } from "@/types/extended";

// ─── Tone selection ────────────────────────────────────────────────────────────

function selectTone(
  progress: ProgressSummary,
  result:   LapAnalysisResult,
  profile:  DriverProfile
): CoachTone {
  if (progress.trend === "improving" && (progress.improvementMs ?? 0) > 200) return "celebratory";
  if (result.overallScore >= 80) return "encouraging";
  if (profile.style === "inconsistent") return "analytical";
  if (result.totalTimeDeltaMs > 2000) return "direct";
  return "encouraging";
}

// ─── Opening lines by tone ────────────────────────────────────────────────────

const OPENINGS: Record<CoachTone, string[]> = {
  celebratory: [
    "That's real progress.",
    "That's what improvement looks like.",
    "You're actually getting faster.",
  ],
  encouraging: [
    "Solid session.",
    "Good work today.",
    "Some genuinely positive things here.",
    "You're building something.",
  ],
  direct: [
    "Let's be honest about this lap.",
    "Here's where the time is going.",
    "The data is clear.",
  ],
  analytical: [
    "The pattern is interesting here.",
    "Let's look at what the data says.",
    "There's something worth focusing on.",
  ],
};

// ─── Style-specific advice adaptations ────────────────────────────────────────

function styleContext(style: DrivingStyle): string {
  const map: Record<DrivingStyle, string> = {
    aggressive:   "Your instincts are good — the speed is there. It's about channelling that aggression more precisely.",
    smooth:       "Your smoothness is a genuine asset. Now push the limits of it — later braking, earlier gas.",
    inconsistent: "The pace is hiding in there — the inconsistency is masking it. One thing at a time.",
    developing:   "You're in the right phase. Keep the feedback loop tight — small corrections compound fast.",
  };
  return map[style];
}

// ─── Positive detection ────────────────────────────────────────────────────────

function findPositiveHighlights(
  result:   LapAnalysisResult,
  progress: ProgressSummary
): string[] {
  const positives: string[] = [];

  // Good segments
  const goodSegs = result.segmentAnalyses
    .filter((sa) => sa.deltaMs <= 50 && sa.insights.some((i) => i.type === "good_segment"))
    .slice(0, 2);

  for (const seg of goodSegs) {
    positives.push(`${seg.segment.label} — you're at reference pace or better`);
  }

  // Improvement vs previous
  if ((progress.improvementMs ?? 0) > 50) {
    positives.push(`${(progress.improvementMs! / 1000).toFixed(3)}s gained since last session`);
  }

  // Score milestone
  if (result.overallScore >= 80) positives.push("overall score in the top range");
  if (result.overallScore >= 70 && result.overallScore < 80) positives.push("solid overall score");

  return positives;
}

// ─── Specific action lines ─────────────────────────────────────────────────────

function buildActionLine(
  result:   LapAnalysisResult,
  patterns: PatternReport | null
): string {
  // Find the highest-cost critical insight
  const topIssue = result.insights.find((i) => i.severity === "critical");
  if (!topIssue) {
    // If no critical issues, address the highest warning
    const topWarning = result.insights.find((i) => i.severity === "warning");
    if (topWarning) {
      return `Focus: ${topWarning.titleRu}. This is where the next ${(topWarning.timeCostMs / 1000).toFixed(2)}s are hiding.`;
    }
    return "Keep doing what you're doing — you're at reference pace in most areas.";
  }

  const costStr = (topIssue.timeCostMs / 1000).toFixed(2);

  // Pattern-aware action
  if (patterns?.strongestPattern && patterns.strongestPattern.issueType === (topIssue as any).type) {
    const occ = patterns.strongestPattern.occurrences;
    return `This is a recurring issue (${occ} sessions). Dedicate the next session entirely to this one corner.`;
  }

  const actionMap: Record<string, string> = {
    early_brake:    `Move the brake point at ${topIssue.titleRu?.split(":")[0]} 5–8m later. That alone recovers ${costStr}s.`,
    late_throttle:  `Open throttle earlier at the apex. You're leaving ${costStr}s per lap on the table here.`,
    low_apex_speed: `Work on releasing the brakes more progressively on entry. Apex speed is the bottleneck.`,
    speed_deficit:  `Try a softer brake release through the corner — you're scrubbing ${costStr}s in speed loss.`,
  };

  return actionMap[(topIssue as any).type] ?? `Address ${topIssue.titleRu?.split(":")[0] ?? "the main issue"} — it's costing you ${costStr}s.`;
}

// ─── Main message builder ──────────────────────────────────────────────────────

export function buildCoachMessage(
  result:   LapAnalysisResult,
  progress: ProgressSummary,
  profile:  DriverProfile,
  patterns: PatternReport | null
): CoachMessage {
  const tone      = selectTone(progress, result, profile);
  const openings  = OPENINGS[tone];
  const opening   = openings[Math.floor(Math.random() * openings.length)];
  const positives = findPositiveHighlights(result, progress);
  const action    = buildActionLine(result, patterns);

  let body = "";

  if (tone === "celebratory" && progress.improvementMs) {
    body = `You're ${(progress.improvementMs / 1000).toFixed(3)}s faster than last session. ${styleContext(profile.style)}`;
  } else if (positives.length > 0) {
    body = `${positives[0]}. ${styleContext(profile.style)}`;
  } else {
    body = styleContext(profile.style);
  }

  const emojiMap: Record<CoachTone, string> = {
    celebratory: "🏆",
    encouraging: "🟢",
    direct:      "📊",
    analytical:  "🔍",
  };

  return {
    tone,
    headline: opening,
    body,
    actionLine: action,
    emoji: emojiMap[tone],
  };
}

// ─── Next actions generator ────────────────────────────────────────────────────

export function buildNextActions(
  result:   LapAnalysisResult,
  patterns: PatternReport | null,
  hasGoals: boolean
): import("@/types/extended").NextAction[] {
  const actions: import("@/types/extended").NextAction[] = [];

  // Action 1: Address top issue with a specific drill or lesson
  const topIssue = result.insights.find(
    (i) => i.severity === "critical" || i.severity === "warning"
  );

  if (topIssue) {
    const costStr = (topIssue.timeCostMs / 1000).toFixed(3);
    const isPattern = patterns?.patterns.some(
      (p) => p.issueType === (topIssue as any).type
    );

    actions.push({
      priority:    1,
      type:        topIssue.academyModuleId ? "watch_lesson" : "practice_drill",
      headlineEn:  `Fix: ${topIssue.titleRu?.split(":").slice(1).join(":").trim() ?? "main issue"}`,
      detailEn:    isPattern
        ? `This has appeared in ${patterns!.strongestPattern?.occurrences} sessions. Tackle it directly — ${costStr}s available.`
        : `${costStr}s to recover with focused practice on this one issue.`,
      cta:         topIssue.academyModuleId ? "Open lesson" : "Practice now",
      href:        topIssue.academyModuleId ? `/academy?module=${topIssue.academyModuleId}` : "/telemetry",
      estimateMin: 15,
      gainS:       topIssue.timeCostMs / 1000,
    });
  }

  // Action 2: Upload another lap after practice
  actions.push({
    priority:    2,
    type:        "upload_lap",
    headlineEn:  "Drive and verify",
    detailEn:    "Practice the drill above, then upload your next lap to see if it worked.",
    cta:         "Upload lap",
    href:        "/telemetry",
    estimateMin: 30,
  });

  // Action 3: Set a goal if none exist
  if (!hasGoals) {
    actions.push({
      priority:    3,
      type:        "set_goal",
      headlineEn:  "Set a goal",
      detailEn:    "Give yourself a concrete target — it makes every session count.",
      cta:         "Set goal",
      href:        "/dashboard",
      estimateMin: 2,
    });
  }

  return actions.slice(0, 3);
}

// ─── Positive-only feedback lines ─────────────────────────────────────────────

export function getPositiveFeedback(result: LapAnalysisResult): string[] {
  const lines: string[] = [];

  const goodSegs = result.segmentAnalyses.filter(
    (sa) => sa.deltaMs <= 30 && sa.segment.type === "corner"
  );

  if (goodSegs.length > 0) {
    lines.push(`${goodSegs[0].segment.label}: you're matching reference pace here — that's real.`);
  }

  if (goodSegs.length > 1) {
    lines.push(`${goodSegs[1].segment.label}: clean through here too. Don't change this.`);
  }

  const score = result.overallScore;
  if (score >= 85) lines.push("Overall score in the top range — most drivers would be happy with this.");
  else if (score >= 75) lines.push("This is a solid lap. The issues are specific and fixable.");

  const bestSector = result.sectors.sort((a, b) => a.deltaMs - b.deltaMs)[0];
  if (bestSector && bestSector.deltaMs <= 0) {
    lines.push(`Sector ${bestSector.sectorIdx + 1} — you're actually ahead of reference here.`);
  }

  return lines;
}
