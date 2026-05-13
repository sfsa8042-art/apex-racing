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
