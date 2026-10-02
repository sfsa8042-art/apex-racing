/**
 * lib/setup/engine.ts
 *
 * Rule-based track+condition setup recommendation engine.
 * Produces concrete, actionable setup changes per car/track/condition combo.
 */

export type Condition = "dry" | "wet" | "intermediate";

export interface SetupRecommendation {
  parameter:    string;
  change:       string;       // concrete instruction: "Increase by 2 clicks" / "+0.5 PSI"
  reason:       string;       // why this helps on this track
  category:     "aero" | "suspension" | "differential" | "brake" | "tyres";
  impact:       "high" | "medium" | "low";
}

export interface TrackSetupPlan {
  trackId:      string;
  trackName:    string;
  carId:        string;
  condition:    Condition;
  recommendations: SetupRecommendation[];
  keySummary:   string;       // one-line overview
}

// ─── Track characteristics ────────────────────────────────────────────────────

interface TrackCharacteristic {
  highspeed:     boolean;  // majority of lap at >200 km/h
  tightCornered: boolean;  // many slow corners
  heavyBraking:  boolean;  // several hard braking zones
  longestStraight: number; // metres
  downforceLevel: "low" | "medium" | "high";
}

const TRACK_CHARS: Record<string, TrackCharacteristic> = {
  monza:       { highspeed: true,  tightCornered: false, heavyBraking: true,  longestStraight: 1100, downforceLevel: "low"    },
  spa:         { highspeed: true,  tightCornered: false, heavyBraking: true,  longestStraight: 750,  downforceLevel: "medium" },
  silverstone: { highspeed: true,  tightCornered: false, heavyBraking: false, longestStraight: 600,  downforceLevel: "medium" },
  nurburgring: { highspeed: false, tightCornered: true,  heavyBraking: true,  longestStraight: 550,  downforceLevel: "high"   },
};

// ─── Car-specific modifier ─────────────────────────────────────────────────────

const CAR_TENDENCY: Record<string, { oversteers: boolean; stiff: boolean }> = {
  porsche_992_gt3r:  { oversteers: false, stiff: true  },
  ferrari_296_gt3:   { oversteers: true,  stiff: false },
  bmw_m4_gt3:        { oversteers: false, stiff: true  },
  mercedes_amg_gt3:  { oversteers: false, stiff: false },
};

// ─── Rule generators ──────────────────────────────────────────────────────────

function aeroRules(tc: TrackCharacteristic, carId: string, cond: Condition): SetupRecommendation[] {
  const recs: SetupRecommendation[] = [];

  if (tc.downforceLevel === "low") {
    recs.push({
      parameter: "Rear wing",
      change:    "Reduce to minimum or -3 clicks from baseline",
      reason:    "Long straights — drag reduction is worth more than cornering stability here.",
      category:  "aero", impact: "high",
    });
    recs.push({
      parameter: "Front splitter",
      change:    "Lower 1 click to balance reduced rear downforce",
      reason:    "Maintains front-rear aero balance with reduced rear wing.",
      category:  "aero", impact: "medium",
    });
  } else if (tc.downforceLevel === "high") {
    recs.push({
      parameter: "Rear wing",
      change:    "Maximum or +3 clicks from baseline",
      reason:    "Tight, slow corners need download for stability under braking.",
      category:  "aero", impact: "high",
    });
  }

  if (cond === "wet") {
    recs.push({
      parameter: "Rear wing",
      change:    "+2–3 clicks vs dry setup",
      reason:    "Wet conditions require more downforce to compensate for reduced mechanical grip.",
      category:  "aero", impact: "high",
    });
  }

  return recs;
}

function brakeRules(tc: TrackCharacteristic, carId: string, cond: Condition): SetupRecommendation[] {
  const recs: SetupRecommendation[] = [];
  const car = CAR_TENDENCY[carId];

  if (tc.heavyBraking) {
    recs.push({
      parameter: "Brake bias",
      change:    car?.stiff ? "Move 0.5% rearward" : "Keep baseline — adjust if locking front",
      reason:    "Heavy braking zones — prevents front lockup on hard stops.",
      category:  "brake", impact: "medium",
    });
    recs.push({
      parameter: "Brake duct opening",
      change:    "Open by 2 steps",
      reason:    "Extended braking phases generate heat — increased cooling protects consistency.",
      category:  "brake", impact: "medium",
    });
  }

  if (cond === "wet") {
    recs.push({
      parameter: "Brake bias",
      change:    "Move 1.0–1.5% rearward vs dry",
      reason:    "Front tyres have less grip — rearward bias prevents snap lockups.",
      category:  "brake", impact: "high",
    });
    recs.push({
      parameter: "ABS threshold",
      change:    "Reduce by 10–15% if adjustable",
      reason:    "Lower threshold allows ABS to intervene earlier in low-grip conditions.",
      category:  "brake", impact: "medium",
    });
  }

  return recs;
}

function differentialRules(tc: TrackCharacteristic, carId: string): SetupRecommendation[] {
  const recs: SetupRecommendation[] = [];
  const car = CAR_TENDENCY[carId];

  if (tc.tightCornered) {
    recs.push({
      parameter: "Differential lock (entry)",
      change:    car?.oversteers ? "Reduce by 5% for better rotation" : "Reduce by 3% to sharpen turn-in",
      reason:    "Slow corners reward rotation — lower entry lock allows the car to pivot more freely.",
      category:  "differential", impact: "high",
    });
  }

  if (tc.highspeed) {
    recs.push({
      parameter: "Differential lock (exit)",
      change:    "Increase by 5% to prevent wheelspin on corner exits",
      reason:    "High exit speeds expose traction limits — more lock provides stability under power.",
      category:  "differential", impact: "medium",
    });
  }

  return recs;
}

function tyreRules(cond: Condition, tc: TrackCharacteristic): SetupRecommendation[] {
  const recs: SetupRecommendation[] = [];

  if (cond === "dry") {
    recs.push({
      parameter: "Tyre pressures (front)",
      change:    tc.highspeed ? "27.0–27.5 PSI hot" : "27.5–28.0 PSI hot",
      reason:    tc.highspeed ? "High-speed circuits generate more tyre heat — slightly lower cold to hit window." : "Technical circuits require more precision — maintain nominal operating pressure.",
      category:  "tyres", impact: "high",
    });
    recs.push({
      parameter: "Tyre pressures (rear)",
      change:    "25.5–26.5 PSI hot",
      reason:    "Rear pressures lower than front prevents rear degradation under traction forces.",
      category:  "tyres", impact: "high",
    });
  } else if (cond === "wet") {
    recs.push({
      parameter: "Tyre pressures (all)",
      change:    "Increase cold pressures by +1.5–2 PSI vs dry baseline",
      reason:    "Wet tyres don't generate as much heat — higher cold pressure maintains operating window.",
      category:  "tyres", impact: "high",
    });
  } else {
    recs.push({
      parameter: "Tyre compound",
      change:    "Intermediate compound — monitor drying line",
      reason:    "Intermediate conditions are fluid — swap to dry when a clear dry line forms.",
      category:  "tyres", impact: "high",
    });
  }

  return recs;
}

function suspensionRules(tc: TrackCharacteristic, cond: Condition): SetupRecommendation[] {
  const recs: SetupRecommendation[] = [];

  if (cond === "wet") {
    recs.push({
      parameter: "Ride height (front + rear)",
      change:    "+2–3 mm vs dry",
      reason:    "Higher ride height improves aquaplaning resistance through standing water.",
      category:  "suspension", impact: "medium",
    });
    recs.push({
      parameter: "Anti-roll bars",
      change:    "Soften by 1–2 clicks front and rear",
      reason:    "Softer ARBs allow better mechanical grip over inconsistent wet surfaces.",
      category:  "suspension", impact: "medium",
    });
  }

  return recs;
}

// ─── Key summary ──────────────────────────────────────────────────────────────

function buildSummary(tc: TrackCharacteristic, cond: Condition): string {
  const parts: string[] = [];
  if (tc.downforceLevel === "low") parts.push("minimal aero");
  if (tc.downforceLevel === "high") parts.push("maximum downforce");
  if (tc.heavyBraking) parts.push("brake cooling priority");
  if (cond === "wet") parts.push("wet weather adjustments throughout");
  if (cond === "intermediate") parts.push("watch the drying line");
  return parts.length > 0
    ? `Focus on: ${parts.join(", ")}.`
    : "Balanced setup — start from baseline and adjust to feel.";
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getTrackSetupPlan(
  carId:   string,
  trackId: string,
  condition: Condition = "dry"
): TrackSetupPlan {
  const tc        = TRACK_CHARS[trackId] ?? TRACK_CHARS["monza"];
  const trackName = trackId.charAt(0).toUpperCase() + trackId.slice(1);

  const recs: SetupRecommendation[] = [
    ...aeroRules(tc, carId, condition),
    ...brakeRules(tc, carId, condition),
    ...differentialRules(tc, carId),
    ...tyreRules(condition, tc),
    ...suspensionRules(tc, condition),
  ];

  return {
    trackId, trackName, carId, condition,
    recommendations: recs,
    keySummary: buildSummary(tc, condition),
  };
}
