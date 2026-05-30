// ─── Raw telemetry row ────────────────────────────────────────────────────────

export interface TelemetryRow {
  time: number;       // seconds from lap start
  speed: number;      // km/h
  throttle: number;   // 0–100 %
  brake: number;      // 0–100 %
  gear: number;       // 1–8
  steerAngle?: number;
  rpm?: number;
  lateralG?: number;
  lonG?: number;
  lapDist?: number;   // metres, synthesised if absent
  posX?: number;
  posY?: number;

  // ── Extended channels (ACC v2 desktop capture; absent in older/synthetic data) ──
  normPos?: number;     // normalised car position 0–1 (drift-free lap fraction)
  verticalG?: number;
  clutch?: number;      // 0–100 %
  tc?: number;          // traction-control activity
  abs?: number;         // abs activity
  turboBoost?: number;
  fuel?: number;        // litres
  airTemp?: number;     // °C
  roadTemp?: number;    // °C
  // Per-wheel (FL, FR, RL, RR)
  tyreTempFL?: number;  tyreTempFR?: number;  tyreTempRL?: number;  tyreTempRR?: number;   // °C
  tyrePressFL?: number; tyrePressFR?: number; tyrePressRL?: number; tyrePressRR?: number;  // psi
  brakeTempFL?: number; brakeTempFR?: number; brakeTempRL?: number; brakeTempRR?: number;  // °C
  wheelSlipFL?: number; wheelSlipFR?: number; wheelSlipRL?: number; wheelSlipRR?: number;  // slip ratio
  suspTravelFL?: number; suspTravelFR?: number; suspTravelRL?: number; suspTravelRR?: number; // m
}

// ─── Parsed lap ───────────────────────────────────────────────────────────────

export interface ParsedLap {
  id: string;
  filename: string;
  rows: TelemetryRow[];
  lapTimeMs: number;
  sampleRateHz: number;
  channelStats: ChannelStats;
}

export interface ChannelStats {
  maxSpeed: number;
  minSpeed: number;
  avgThrottle: number;
  maxBrake: number;
  brakingEvents: BrakingEvent[];
  throttleEvents: ThrottleEvent[];
  cornerMinima: CornerMinimum[];
}

// ─── Low-level events ────────────────────────────────────────────────────────

export interface BrakingEvent {
  startIdx: number;
  peakIdx: number;
  endIdx: number;
  startTime: number;
  peakBrake: number;
  entrySpeed: number;
  exitSpeed: number;
  startDist: number;
}

export interface ThrottleEvent {
  openIdx: number;
  openTime: number;
  openDist: number;
  openSpeed: number;
  priorMinSpeedIdx: number;
}

export interface CornerMinimum {
  idx: number;
  time: number;
  dist: number;
  speed: number;
  cornerLabel: string;
}

// ─── Track segments ───────────────────────────────────────────────────────────

export type SegmentType = "corner" | "straight";

export interface TrackSegment {
  id: string;
  type: SegmentType;
  label: string;
  startDist: number;
  endDist: number;
  startIdx: number;
  endIdx: number;
  apexIdx?: number;
  apexDist?: number;
  apexSpeed?: number;
  brakeStartDist?: number;
  throttleOpenDist?: number;
  maxSpeed: number;
  minSpeed: number;
  avgThrottle: number;
  avgBrake: number;
  timeMs: number;
}

// ─── Delta time ───────────────────────────────────────────────────────────────

export interface DeltaResult {
  distanceM: number[];
  cumulativeDeltaS: number[];
  instantDeltaS: number[];
  smoothedDeltaS: number[];
  totalDeltaMs: number;
  worstIdx: number;
  bestIdx: number;
}

// ─── Segment analysis ─────────────────────────────────────────────────────────

export interface SegmentInsight {
  type: "early_brake" | "late_brake" | "low_apex_speed" | "late_throttle" | "early_throttle" | "speed_deficit" | "consistent" | "good_segment";
  descriptionRu: string;
  timeCostMs: number;
  academyModuleId?: string;
  academyModuleTitleRu?: string;
  userValue?: number;
  refValue?: number;
  unit?: string;
}

export interface SegmentAnalysis {
  segment: TrackSegment;
  refSegment: TrackSegment | null;
  userTimeMs: number;
  refTimeMs: number;
  deltaMs: number;
  insights: SegmentInsight[];
  deltaFraction: number;
}

// ─── Optimal lap ──────────────────────────────────────────────────────────────

export interface OptimalLap {
  theoreticalBestMs: number;
  currentBestMs: number;
  potentialGainMs: number;
  segmentContributions: Array<{ segmentLabel: string; gainMs: number }>;
  summaryRu: string;
}

// ─── Flat insights (feedback panel) ──────────────────────────────────────────

export type InsightSeverity = "critical" | "warning" | "info" | "good";

export interface AnalysisInsight {
  id: string;
  severity: InsightSeverity;
  category: "brake" | "throttle" | "speed" | "consistency" | "general";
  titleRu: string;
  descriptionRu: string;
  timeCostMs: number;
  sectorIdx: number;
  segmentId?: string;
  lapDistStart?: number;
  lapDistEnd?: number;
  academyModuleId?: string;
  academyModuleTitleRu?: string;
  userValue?: number;
  refValue?: number;
  unit?: string;
}

export interface SectorAnalysis {
  sectorIdx: number;
  userTimeMs: number;
  refTimeMs: number;
  deltaMs: number;
  startFraction: number;
  endFraction: number;
}


// ─── Per-corner phase analysis (Delta-style 4-phase breakdown) ────────────────
export interface PhaseAnalysis {
  deltaMs:        number;
  status:         "loss" | "gain" | "neutral";
  userValueRu:    string;
  refValueRu:     string;
  hintRu:         string;
}

export interface CornerDetail {
  segmentId:      string;
  cornerLabel:    string;
  totalDeltaMs:   number;
  phases: {
    braking:  PhaseAnalysis;
    entry:    PhaseAnalysis;
    apex:     PhaseAnalysis;
    exit:     PhaseAnalysis;
  };
}

// ─── Coaching plan: top-3 priorities for next session ─────────────────────────
export interface CoachingPriority {
  rank:          1 | 2 | 3;
  title:         string;
  cornerLabels:  string[];
  targetDeltaMs: number;
  category:      "brake" | "throttle" | "line" | "consistency";
  steps:         string[];
}

export interface CoachingPlan {
  priorities:      CoachingPriority[];
  estimatedGainMs: number;
  focusMessage:    string;
}

export interface SubScores {
  braking:     number;  // 0-100
  throttle:    number;  // 0-100
  lines:       number;  // 0-100
  consistency: number;  // 0-100
}

export interface LapAnalysisResult {
  lapId: string;
  totalTimeDeltaMs: number;
  sectors: SectorAnalysis[];
  insights: AnalysisInsight[];
  segmentAnalyses: SegmentAnalysis[];
  delta: DeltaResult;
  optimalLap: OptimalLap;
  overallScore: number;
  subScores: SubScores;
  dominantWeakness: AnalysisInsight["category"] | null;
  patterns?:         string[];
  strengthMessages?: string[];
  cornerDetails?:    CornerDetail[];
  coachingPlan?:     CoachingPlan;
  hasReference:      boolean;                 // true only when compared to a REAL lap
  referenceSource?:  "community" | "personal" | null;
  diagnostics?:      DiagnosticsReport;
}

// ─── Reference-free diagnostics (technique errors from a single lap) ───────────
export type DiagnosticType =
  | "coasting" | "overlap" | "brake_modulation"
  | "snap_throttle" | "steering_correction" | "wheelspin" | "slow_brake_ramp";

export interface Diagnostic {
  id: string;
  type: DiagnosticType;
  severity: "high" | "medium" | "low";
  category: "throttle" | "brake" | "steering" | "traction";
  titleRu: string;
  descriptionRu: string;
  adviceRu: string;
  metricRu: string;            // honest measured value (NOT a fabricated time delta)
  corner?: string;
  startDist: number;
  endDist: number;
  count?: number;
}
export interface DiagnosticsReport {
  diagnostics: Diagnostic[];
  coastingTotalS: number;
  overlapTotalS: number;
  brakeStabs: number;
  smoothnessScore: number;     // 0–100, reference-free
  summaryRu: string;
  hasData: boolean;
}

// ─── Vehicle dynamics (tyres / brakes / suspension / balance) ──────────────────
// Wheel order convention: FL, FR, RL, RR
export interface WheelQuad { fl: number; fr: number; rl: number; rr: number; }

export interface TyreWheelStat {
  avg: number; min: number; max: number;
  inWindowPct: number;          // % of lap inside optimal temperature window
  status: "cold" | "optimal" | "hot";
}
export interface TyreReport {
  temp:  { fl: TyreWheelStat; fr: TyreWheelStat; rl: TyreWheelStat; rr: TyreWheelStat };
  press: WheelQuad;             // average hot pressure per wheel (psi)
  windowLo: number; windowHi: number;     // optimal temp window used
  pressLo: number; pressHi: number;       // optimal pressure window used
  frontRearDelta: number;       // avg front temp − avg rear temp (°C)
  leftRightDelta: number;       // avg left temp − avg right temp (°C)
  tempTrace: { dist: number; fl: number; fr: number; rl: number; rr: number }[];
  summaryRu: string;
}

export interface BrakeReport {
  temp: { fl: TyreWheelStat; fr: TyreWheelStat; rl: TyreWheelStat; rr: TyreWheelStat };
  windowLo: number; windowHi: number;
  overheatZones: { startDist: number; endDist: number; peak: number }[];
  frontRearDelta: number;
  tempTrace: { dist: number; fl: number; fr: number; rl: number; rr: number }[];
  summaryRu: string;
}

export interface SuspWheelStat {
  min: number; max: number; range: number; avg: number;
  bottomingPct: number;         // % of lap near full compression
}
export interface SuspensionReport {
  travel: { fl: SuspWheelStat; fr: SuspWheelStat; rl: SuspWheelStat; rr: SuspWheelStat };
  histogram: { fl: number[]; fr: number[]; rl: number[]; rr: number[] }; // 12 bins each, normalised 0–1
  bins: number;
  bottoming: boolean;
  summaryRu: string;
}

export interface CornerBalance {
  label: string;
  startDist: number; endDist: number;
  balance: number;              // + understeer, − oversteer (slip delta)
  verdict: "understeer" | "oversteer" | "neutral";
}
export interface BalanceReport {
  overall: "understeer" | "oversteer" | "neutral";
  bias: number;                 // −1 (full oversteer) … +1 (full understeer)
  understeerPct: number;        // % of cornering time understeering
  oversteerPct: number;
  trace: { dist: number; balance: number; cornering: boolean }[];
  corners: CornerBalance[];
  summaryRu: string;
}

export interface VehicleReport {
  hasData: boolean;
  tyres?:      TyreReport;
  brakes?:     BrakeReport;
  suspension?: SuspensionReport;
  balance?:    BalanceReport;
}

// ─── Upload state ─────────────────────────────────────────────────────────────

export type UploadStatus = "idle" | "parsing" | "analyzing" | "done" | "error";

export interface UploadState {
  status: UploadStatus;
  error: string | null;
  filename: string | null;
  parsedLap: ParsedLap | null;
  analysisResult: LapAnalysisResult | null;
}
