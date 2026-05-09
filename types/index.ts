// ─── User & Auth ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  avatar?: string;
  tier: "free" | "pro" | "coach_plus";
  skillLevel: "beginner" | "intermediate" | "advanced";
  joinedAt: string;
}

export interface UserStats {
  bestLapTime: string;
  totalLaps: number;
  hoursOnTrack: number;
  improvedTracks: number;
  currentStreak: number;
  weeklyUploads: number;
}

// ─── Academy ────────────────────────────────────────────────────────────────

export type ModuleStatus = "locked" | "available" | "in_progress" | "completed";
export type SkillTier = "beginner" | "intermediate" | "advanced";

export interface Lesson {
  id: string;
  title: string;
  durationMin: number;
  type: "video" | "exercise" | "task";
  completed: boolean;
}

export interface Module {
  id: string;
  number: number;
  title: string;
  description: string;
  tier: SkillTier;
  lessonsCount: number;
  completedLessons: number;
  durationMin: number;
  status: ModuleStatus;
  telemetryMetric?: string;
  lessons: Lesson[];
  badge?: string;
}

// ─── Telemetry ───────────────────────────────────────────────────────────────

export type InsightSeverity = "critical" | "warning" | "info";

export interface TelemetryInsight {
  id: string;
  title: string;
  description: string;
  corner: string;
  timeCostMs: number;
  severity: InsightSeverity;
  channel: "brake" | "throttle" | "racing_line" | "speed" | "gear";
  academyModuleId?: string;
  academyModuleTitle?: string;
}

export interface Lap {
  id: string;
  track: string;
  car: string;
  lapTime: string;
  lapTimeMs: number;
  date: string;
  sim: "iRacing" | "ACC" | "rFactor2" | "LMU";
  isPersonalBest: boolean;
  isReference: boolean;
  deltaVsRef: number;
  sectors: SectorTime[];
}

export interface SectorTime {
  sector: number;
  time: string;
  deltaMs: number;
}

export interface TelemetryChannel {
  id: string;
  label: string;
  unit: string;
  color: string;
  data: number[];
  refData: number[];
  min: number;
  max: number;
}

// ─── Tracks ──────────────────────────────────────────────────────────────────

export interface TrackSector {
  id: number;
  name: string;
  description: string;
  yourTime: string;
  refTime: string;
  deltaMs: number;
  corners: string[];
}

export interface Track {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  lengthKm: number;
  corners: number;
  lapRecord: string;
  yourBest?: string;
  deltaVsRecord?: number;
  sectors: TrackSector[];
  difficulty: "easy" | "medium" | "hard" | "expert";
  keyCharacteristics: string[];
}

// ─── Cars ────────────────────────────────────────────────────────────────────

export interface SetupHint {
  parameter: string;
  recommendation: string;
  impact: "high" | "medium" | "low";
  category: "suspension" | "aero" | "differential" | "brake" | "tyres";
}

export interface Car {
  id: string;
  name: string;
  manufacturer: string;
  class: string;
  powerHp: number;
  weightKg: number;
  topSpeedKmh: number;
  acceleration0to100: number;
  drivetrain: "RWD" | "AWD" | "FWD";
  description: string;
  strengths: string[];
  weaknesses: string[];
  setupHints: SetupHint[];
  yourBestLap?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface RecentSession {
  id: string;
  track: string;
  car: string;
  date: string;
  bestLap: string;
  laps: number;
  improvement: number | null;
  sim: "iRacing" | "ACC" | "rFactor2" | "LMU";
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  track: string;
  targetDelta: number;
  yourDelta: number | null;
  endsAt: string;
  participants: number;
  yourRank: number | null;
}

export interface NextAction {
  type: "watch_module" | "upload_lap" | "practice_task" | "complete_exercise";
  title: string;
  description: string;
  moduleId?: string;
  priority: "high" | "medium" | "low";
}
