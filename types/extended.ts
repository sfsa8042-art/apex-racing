// ─── Existing types re-exported for convenience ──────────────────────────────
export * from "./telemetry";

// ─── Driver Profile ───────────────────────────────────────────────────────────

export type DrivingStyle = "aggressive" | "smooth" | "inconsistent" | "developing";

export interface DriverProfile {
  style:              DrivingStyle;
  styleLabel:         string;
  styleDescription:   string;
  brakeConfidence:    number;   // 0–100: consistency of brake points
  throttleControl:    number;   // 0–100: smoothness of throttle application
  cornerSpeed:        number;   // 0–100: ability to maintain speed through corners
  consistency:        number;   // 0–100: lap-to-lap variance
  overallRating:      number;   // 0–100: weighted composite
  strengths:          string[];
  areasToImprove:     string[];
  emoji:              string;
}

// ─── Progress History ─────────────────────────────────────────────────────────

export interface LapHistoryEntry {
  id:           string;
  filename:     string;
  uploadedAt:   string;         // ISO 8601
  lapTimeMs:    number;
  totalDeltaMs: number;
  overallScore: number;
  track:        string | null;
  car:          string | null;
  profileStyle: DrivingStyle;
  topIssue:     string | null;   // e.g. "early braking"
}

export interface ProgressSummary {
  entries:            LapHistoryEntry[];
  bestLapTimeMs:      number | null;
  latestDeltaMs:      number | null;
  improvementMs:      number | null;   // positive = improved (faster)
  improvementMessage: string;
  trend:              "improving" | "declining" | "stable" | "first";
  scoreHistory:       number[];
  lapTimeHistory:     number[];
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export interface HeatmapPoint {
  x:         number;    // normalised 0–1 track position X
  y:         number;    // normalised 0–1 track position Y
  dist:      number;    // metres from start
  deltaS:    number;    // cumulative delta at this point (seconds, positive = losing)
  intensity: number;    // 0–1 normalised loss intensity for colour mapping
  label?:    string;    // optional segment label
}

export interface TrackHeatmapData {
  points:      HeatmapPoint[];
  maxLossS:    number;
  totalDistM:  number;
  /** Whether we have real GPS coordinates or are using synthesised position */
  hasRealGPS:  boolean;
}

// ─── Wow Screen ───────────────────────────────────────────────────────────────

export interface WowSummary {
  headline:           string;   // "You're losing 1.24s on this lap"
  subheadline:        string;   // "Most of it comes from Turn 3 and the final chicane"
  totalLossS:         number;
  totalLossSFormatted: string;  // "1.240"
  worstSegmentLabel:  string;
  worstSegmentLossS:  number;
  topThreeIssues:     WowIssue[];
  goodAreas:          string[];
  motivationalLine:   string;   // "This is fixable in 2 sessions."
  potentialGainS:     number;
  overallScore:       number;
  profile:            DriverProfile;
  hasReference:       boolean;     // false → diagnostic mode (no reference lap)
  smoothnessScore?:   number;      // diagnostic mode input smoothness 0–100
  issuesCount?:       number;      // diagnostic mode number of technique findings
}

export interface WowIssue {
  segmentLabel: string;
  issueType:    string;
  descriptionShort: string;
  lossS:        number;
  metricRu?:    string;   // diagnostic mode: measured value instead of a time loss
  academyLink:  string | null;
  academyTitle: string | null;
}

// ─── Before / After ───────────────────────────────────────────────────────────

export interface BeforeAfterData {
  segmentLabel:   string;
  issueType:      string;
  currentData:    number[];     // resampled channel data (user)
  optimalData:    number[];     // resampled channel data (reference)
  channelLabel:   string;       // "Brake", "Throttle", "Speed"
  channelColor:   string;
  unit:           string;
  gainS:          number;       // time gain if corrected
  tipShort:       string;
  tipDetail:      string;
}

// ─── Pattern Detection ────────────────────────────────────────────────────────

export type PatternCategory = "brake" | "throttle" | "speed" | "consistency";

export interface RecurringPattern {
  id:           string;
  category:     PatternCategory;
  issueType:    string;          // e.g. "early_brake"
  occurrences:  number;          // how many laps this appeared in
  avgCostMs:    number;          // average time cost across sessions
  firstSeen:    string;          // ISO date
  lastSeen:     string;
  improving:    boolean;         // cost going down over time?
  segments:     string[];        // e.g. ["Turn 3", "Turn 7"]
  descriptionEn: string;
  coachNote:    string;          // personalised insight
}

export interface PatternReport {
  patterns:         RecurringPattern[];
  strongestPattern: RecurringPattern | null;
  improvingAreas:   string[];
  persistentIssues: string[];
  sessionCount:     number;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export type GoalType = "lap_time" | "sector_delta" | "segment_skill" | "consistency";
export type GoalStatus = "active" | "achieved" | "abandoned";

export interface Goal {
  id:          string;
  type:        GoalType;
  titleEn:     string;
  descriptionEn: string;
  targetValue: number;           // seconds for time goals, score for skill goals
  currentValue: number | null;
  startValue:  number | null;    // baseline at goal creation
  status:      GoalStatus;
  createdAt:   string;
  achievedAt:  string | null;
  track:       string | null;
  deadline:    string | null;    // ISO date, optional
  progress:    number;           // 0–100 %
}

export interface GoalStore {
  goals:       Goal[];
  updatedAt:   string;
}

// ─── Coach Voice ──────────────────────────────────────────────────────────────

export type CoachTone = "encouraging" | "direct" | "analytical" | "celebratory";

export interface CoachMessage {
  tone:        CoachTone;
  headline:    string;
  body:        string;
  actionLine:  string;         // specific next step
  emoji?:      string;
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export interface StreakData {
  currentStreak:  number;      // consecutive days with a lap uploaded
  longestStreak:  number;
  totalSessions:  number;
  lastActivity:   string | null;
  consistencyPct: number;      // % of last 14 days with activity
  isActiveToday:  boolean;
}

// ─── Next Action ──────────────────────────────────────────────────────────────

export interface NextAction {
  priority:    1 | 2 | 3;
  type:        "watch_lesson" | "practice_drill" | "upload_lap" | "set_goal" | "review_segment";
  headlineEn:  string;
  detailEn:    string;
  cta:         string;
  href:        string;
  estimateMin: number;         // time commitment
  gainS?:      number;         // estimated lap gain if completed
}

// ─── XP & Level System ────────────────────────────────────────────────────────

export type DriverLevel =
  | "Rookie"
  | "Amateur"
  | "Intermediate"
  | "Advanced"
  | "Pro"
  | "Elite";

export interface XPEvent {
  type:      "upload" | "improvement" | "lesson" | "streak" | "goal" | "first_lap";
  gainXP:    number;
  label:     string;
  timestamp: string;
}

export interface LevelProgress {
  level:          DriverLevel;
  levelIndex:     number;          // 0-5
  currentXP:      number;
  xpForThisLevel: number;          // XP earned within the current level
  xpToNextLevel:  number;          // XP required to reach next level
  progressPct:    number;          // 0–100 within current level
  totalXP:        number;
  recentEvents:   XPEvent[];
  skillTags:      SkillTag[];
}

export interface SkillTag {
  skill:     string;               // "Brake Control", "Cornering", etc.
  level:     "weak" | "ok" | "strong";
  score:     number;               // 0–100
  improving: boolean;
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

export interface DriverRank {
  percentile:       number;        // 0–100: faster than N% of drivers
  rankLabel:        string;        // "Top 15%"
  estimatedRank:    number;        // e.g. 847 out of 5000
  totalDrivers:     number;
  trackSpecific:    TrackRank[];
  tier:             RankTier;
  isEstimated:      boolean;       // true = simulated until server data available
}

export type RankTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export interface TrackRank {
  track:       string;
  percentile:  number;
  lapTimeMs:   number;
  refTimeMs:   number;
  deltaMs:     number;
}

// ─── Daily Loop ───────────────────────────────────────────────────────────────

export type DailyGoalType = "time_improvement" | "segment_focus" | "consistency" | "upload";

export interface DailyGoal {
  id:            string;
  date:          string;           // YYYY-MM-DD
  type:          DailyGoalType;
  titleEn:       string;
  descriptionEn: string;
  targetValue:   number;
  unit:          string;
  completed:     boolean;
  completedAt:   string | null;
  xpReward:      number;
  segment?:      string;           // e.g. "Turn 3"
}

export interface DailyChallenge {
  id:            string;
  date:          string;
  titleEn:       string;
  taskEn:        string;
  completed:     boolean;
  xpReward:      number;
  difficulty:    "easy" | "medium" | "hard";
}

// ─── Share Card ───────────────────────────────────────────────────────────────

export interface SharePayload {
  lapTimeStr:    string;
  deltaStr:      string;
  score:         number;
  level:         DriverLevel;
  percentile:    number;
  track:         string | null;
  improvements:  string[];
  filename:      string;
  timestamp:     string;
}
