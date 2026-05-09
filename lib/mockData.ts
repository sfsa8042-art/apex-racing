import type {
  User, UserStats, Module, Lap, TelemetryChannel, TelemetryInsight,
  Track, Car, RecentSession, WeeklyChallenge, NextAction,
} from "@/types";

// ─── User ────────────────────────────────────────────────────────────────────

export const mockUser: User = {
  id: "usr_01",
  name: "Marco Bianchi",
  tier: "pro",
  skillLevel: "intermediate",
  joinedAt: "2024-01-15",
};

export const mockUserStats: UserStats = {
  bestLapTime: "1:44.832",
  totalLaps: 847,
  hoursOnTrack: 112,
  improvedTracks: 8,
  currentStreak: 6,
  weeklyUploads: 4,
};

// ─── Academy ─────────────────────────────────────────────────────────────────

export const mockModules: Module[] = [
  {
    id: "m1", number: 1, title: "Sim Setup & Peripherals",
    description: "Configure your rig for optimal feedback and control.",
    tier: "beginner", lessonsCount: 4, completedLessons: 4, durationMin: 35,
    status: "completed", badge: "✓",
    lessons: [
      { id: "l1", title: "Wheel & pedal calibration", durationMin: 8, type: "video", completed: true },
      { id: "l2", title: "Force feedback settings", durationMin: 10, type: "video", completed: true },
      { id: "l3", title: "Seat position & ergonomics", durationMin: 7, type: "video", completed: true },
      { id: "l4", title: "Configure your first session", durationMin: 10, type: "task", completed: true },
    ],
  },
  {
    id: "m2", number: 2, title: "Racing Line Theory",
    description: "Understand geometric vs. fastest line and when they differ.",
    tier: "beginner", lessonsCount: 5, completedLessons: 5, durationMin: 42,
    status: "completed", badge: "✓",
    lessons: [
      { id: "l5", title: "Geometric apex explained", durationMin: 9, type: "video", completed: true },
      { id: "l6", title: "Late apex for corner exit", durationMin: 8, type: "video", completed: true },
      { id: "l7", title: "Double-apex corners", durationMin: 7, type: "video", completed: true },
      { id: "l8", title: "Identify the line on 5 corners", durationMin: 10, type: "exercise", completed: true },
      { id: "l9", title: "Drive 10 laps applying the theory", durationMin: 8, type: "task", completed: true },
    ],
  },
  {
    id: "m3", number: 3, title: "Braking Fundamentals",
    description: "Master the straight-line brake point and initial application.",
    tier: "beginner", lessonsCount: 5, completedLessons: 3, durationMin: 48,
    status: "in_progress", telemetryMetric: "Brake_point_distance ±3m vs ref",
    lessons: [
      { id: "l10", title: "Brake point theory", durationMin: 8, type: "video", completed: true },
      { id: "l11", title: "Initial brake application force", durationMin: 9, type: "video", completed: true },
      { id: "l12", title: "Reading brake markers", durationMin: 7, type: "video", completed: true },
      { id: "l13", title: "Match the braking trace exercise", durationMin: 12, type: "exercise", completed: false },
      { id: "l14", title: "Upload 5 laps — braking focus", durationMin: 12, type: "task", completed: false },
    ],
  },
  {
    id: "m4", number: 4, title: "Throttle Control Basics",
    description: "Learn progressive throttle application and avoid wheelspin.",
    tier: "beginner", lessonsCount: 4, completedLessons: 0, durationMin: 38,
    status: "available", telemetryMetric: "Throttle_open_distance ±5m vs ref",
    lessons: [
      { id: "l15", title: "Throttle trace shapes explained", durationMin: 10, type: "video", completed: false },
      { id: "l16", title: "Corner exit minimum speed", durationMin: 9, type: "video", completed: false },
      { id: "l17", title: "Progressive vs. snap throttle", durationMin: 8, type: "exercise", completed: false },
      { id: "l18", title: "5-lap throttle focus task", durationMin: 11, type: "task", completed: false },
    ],
  },
  {
    id: "m5", number: 5, title: "Gear Selection",
    description: "Optimize gear choice for maximum acceleration and stability.",
    tier: "beginner", lessonsCount: 3, completedLessons: 0, durationMin: 28,
    status: "locked",
    lessons: [
      { id: "l19", title: "Gear vs. RPM at corner entry", durationMin: 9, type: "video", completed: false },
      { id: "l20", title: "Engine braking as a tool", durationMin: 9, type: "video", completed: false },
      { id: "l21", title: "Gear selection exercise", durationMin: 10, type: "exercise", completed: false },
    ],
  },
  {
    id: "m6", number: 6, title: "Reading Your First Telemetry",
    description: "Understand channels, axes, and the delta time concept.",
    tier: "beginner", lessonsCount: 4, completedLessons: 0, durationMin: 40,
    status: "locked",
    lessons: [],
  },
  {
    id: "m7", number: 7, title: "Trail Braking",
    description: "Overlap braking and cornering to maximize entry speed.",
    tier: "intermediate", lessonsCount: 5, completedLessons: 0, durationMin: 52,
    status: "locked", telemetryMetric: "Brake_release_gradient ≤ ref × 1.15",
    lessons: [],
  },
  {
    id: "m8", number: 8, title: "Corner Exit Optimization",
    description: "Maximize drive off the corner — the biggest time differentiator.",
    tier: "intermediate", lessonsCount: 5, completedLessons: 0, durationMin: 58,
    status: "locked", telemetryMetric: "Throttle_open_distance within ±3m of ref",
    lessons: [],
  },
  {
    id: "m9", number: 9, title: "Sector Time Analysis",
    description: "Use sector data to diagnose and prioritize improvements.",
    tier: "intermediate", lessonsCount: 4, completedLessons: 0, durationMin: 44,
    status: "locked", lessons: [],
  },
  {
    id: "m10", number: 10, title: "Tyre Management",
    description: "Understand tyre temperature windows and degradation patterns.",
    tier: "intermediate", lessonsCount: 5, completedLessons: 0, durationMin: 55,
    status: "locked", lessons: [],
  },
  {
    id: "m11", number: 11, title: "Setup Basics",
    description: "Ride height, wing angles, and differential fundamentals.",
    tier: "intermediate", lessonsCount: 6, completedLessons: 0, durationMin: 65,
    status: "locked", lessons: [],
  },
  {
    id: "m12", number: 12, title: "Consistency Training",
    description: "Diagnose lap-to-lap variance and build reliable pace.",
    tier: "intermediate", lessonsCount: 4, completedLessons: 0, durationMin: 42,
    status: "locked", telemetryMetric: "Lap-to-lap variance < 3m braking point",
    lessons: [],
  },
  {
    id: "m13", number: 13, title: "Oversteer Management",
    description: "Diagnose and correct snap oversteer through telemetry patterns.",
    tier: "advanced", lessonsCount: 6, completedLessons: 0, durationMin: 70,
    status: "locked", lessons: [],
  },
  {
    id: "m14", number: 14, title: "Advanced Setup Tuning",
    description: "Data-backed setup changes with telemetry verification.",
    tier: "advanced", lessonsCount: 7, completedLessons: 0, durationMin: 85,
    status: "locked", lessons: [],
  },
  {
    id: "m15", number: 15, title: "Race Craft & Tyre Strategy",
    description: "Stint management, undercut timing, and racecraft under pressure.",
    tier: "advanced", lessonsCount: 5, completedLessons: 0, durationMin: 60,
    status: "locked", lessons: [],
  },
  {
    id: "m16", number: 16, title: "Data Engineering",
    description: "Build custom channels, create filters, and analyze multi-lap data.",
    tier: "advanced", lessonsCount: 6, completedLessons: 0, durationMin: 75,
    status: "locked", lessons: [],
  },
];

// ─── Telemetry ────────────────────────────────────────────────────────────────

export const mockLaps: Lap[] = [
  {
    id: "lap_01", track: "Monza", car: "Porsche 992 GT3 R", lapTime: "1:44.832",
    lapTimeMs: 104832, date: "2024-06-14", sim: "ACC", isPersonalBest: true,
    isReference: false, deltaVsRef: -1.241,
    sectors: [
      { sector: 1, time: "0:28.441", deltaMs: -120 },
      { sector: 2, time: "0:42.218", deltaMs: -842 },
      { sector: 3, time: "0:34.173", deltaMs: -279 },
    ],
  },
  {
    id: "lap_02", track: "Monza", car: "Porsche 992 GT3 R", lapTime: "1:45.211",
    lapTimeMs: 105211, date: "2024-06-14", sim: "ACC", isPersonalBest: false,
    isReference: false, deltaVsRef: -1.620,
    sectors: [
      { sector: 1, time: "0:28.612", deltaMs: -291 },
      { sector: 2, time: "0:42.441", deltaMs: -1065 },
      { sector: 3, time: "0:34.158", deltaMs: -264 },
    ],
  },
];

export const mockReferenceTime = "1:43.591";

// Generated telemetry data (simulated realistic lap at Monza)
function generateLapData(baseValues: number[], noise: number = 0): number[] {
  return baseValues.map(v => Math.max(0, Math.min(1, v + (Math.random() - 0.5) * noise)));
}

const SPEED_BASE = [
  0.95, 0.94, 0.90, 0.85, 0.75, 0.60, 0.48, 0.40, 0.38, 0.40, 0.48, 0.58, 0.68,
  0.78, 0.88, 0.95, 0.98, 1.00, 0.99, 0.98, 0.95, 0.90, 0.82, 0.70, 0.58, 0.45,
  0.38, 0.35, 0.38, 0.45, 0.55, 0.65, 0.75, 0.85, 0.93, 0.98, 1.00, 0.99, 0.97,
  0.95, 0.92, 0.88, 0.82, 0.74, 0.64, 0.52, 0.44, 0.40, 0.42, 0.50, 0.60, 0.70,
  0.80, 0.90, 0.96, 0.99, 1.00, 0.99, 0.97, 0.93, 0.88, 0.80, 0.70, 0.58, 0.48,
  0.42, 0.40, 0.42, 0.50, 0.60, 0.72, 0.83, 0.91, 0.97, 1.00, 0.99, 0.97, 0.95,
  0.90, 0.84, 0.76, 0.66, 0.55, 0.44, 0.38, 0.35, 0.38, 0.46, 0.56, 0.68, 0.80,
  0.90, 0.97, 1.00, 0.99, 0.98, 0.97, 0.95, 0.96, 0.97,
];

const THROTTLE_BASE = [
  1.0, 1.0, 0.9, 0.7, 0.2, 0.0, 0.0, 0.0, 0.0, 0.1, 0.4, 0.7, 0.9,
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.6, 0.2, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.1, 0.3, 0.6, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
  0.95, 0.8, 0.5, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.2, 0.5, 0.8, 0.95,
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.7, 0.3, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.2, 0.5, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
  0.9, 0.6, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.4, 0.7, 0.9, 1.0,
  1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
];

const BRAKE_BASE = [
  0.0, 0.0, 0.1, 0.3, 0.8, 1.0, 0.9, 0.7, 0.4, 0.2, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.4, 0.9, 1.0, 0.8, 0.5,
  0.2, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.2, 0.6, 0.95, 1.0, 0.8, 0.5, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.4, 0.9, 1.0, 0.8, 0.5, 0.2,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
  0.1, 0.4, 0.9, 1.0, 0.9, 0.6, 0.3, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0,
  0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
];

const DELTA_BASE = [
  0.00, 0.00, -0.01, -0.02, -0.04, -0.08, -0.12, -0.18, -0.22, -0.25,
  -0.28, -0.30, -0.31, -0.32, -0.32, -0.31, -0.30, -0.28, -0.25, -0.23,
  -0.22, -0.24, -0.30, -0.40, -0.52, -0.65, -0.78, -0.88, -0.92, -0.94,
  -0.93, -0.90, -0.86, -0.81, -0.78, -0.76, -0.75, -0.75, -0.76, -0.78,
  -0.82, -0.90, -1.00, -1.12, -1.22, -1.28, -1.30, -1.28, -1.24, -1.20,
  -1.16, -1.12, -1.09, -1.07, -1.06, -1.05, -1.05, -1.06, -1.08, -1.12,
  -1.18, -1.24, -1.28, -1.30, -1.30, -1.28, -1.25, -1.22, -1.20, -1.19,
  -1.18, -1.18, -1.18, -1.19, -1.20, -1.21, -1.22, -1.24, -1.26, -1.28,
  -1.30, -1.30, -1.29, -1.27, -1.25, -1.24, -1.24, -1.24, -1.24, -1.24,
  -1.24, -1.24, -1.24, -1.24, -1.24, -1.24, -1.24, -1.24, -1.24, -1.24,
];

// User lap is slightly worse than reference in specific areas
const userSpeedOffset = SPEED_BASE.map((v, i) => {
  if (i >= 20 && i <= 28) return v - 0.04; // T1 complex — losing speed
  if (i >= 42 && i <= 50) return v - 0.06; // Lesmo — big loss
  return v;
});

export const mockTelemetryChannels: TelemetryChannel[] = [
  {
    id: "speed", label: "Speed", unit: "km/h", color: "#a3e635",
    data: userSpeedOffset,
    refData: SPEED_BASE,
    min: 0, max: 1,
  },
  {
    id: "throttle", label: "Throttle", unit: "%", color: "#4ade80",
    data: THROTTLE_BASE.map((v, i) => i >= 42 && i <= 48 ? v - 0.15 : v),
    refData: THROTTLE_BASE,
    min: 0, max: 1,
  },
  {
    id: "brake", label: "Brake", unit: "%", color: "#f87171",
    data: BRAKE_BASE.map((v, i) => i >= 18 && i <= 22 ? v + 0.08 : v),
    refData: BRAKE_BASE,
    min: 0, max: 1,
  },
  {
    id: "delta", label: "Delta Time", unit: "s", color: "#60a5fa",
    data: DELTA_BASE,
    refData: new Array(100).fill(0),
    min: -1.5, max: 0.5,
  },
];

export const mockInsights: TelemetryInsight[] = [
  {
    id: "i1", title: "Brake too early at Variante del Rettifilo",
    description: "You initiate braking 9m before the reference point. This costs drive into Curva Grande and compounds into sector 1 loss.",
    corner: "T1 – Variante del Rettifilo", timeCostMs: 312, severity: "critical",
    channel: "brake", academyModuleId: "m3", academyModuleTitle: "Braking Fundamentals",
  },
  {
    id: "i2", title: "Late throttle application at Lesmo 2",
    description: "Throttle opens 0.31s after the minimum speed point. You leave 0.2s per lap on the exit of Lesmo 2 alone.",
    corner: "T8 – Lesmo 2", timeCostMs: 208, severity: "critical",
    channel: "throttle", academyModuleId: "m4", academyModuleTitle: "Throttle Control Basics",
  },
  {
    id: "i3", title: "Corner speed deficit through Curva Parabolica",
    description: "Minimum speed is 7 km/h below reference. Likely caused by early rotation. Exit drive is partially compensating.",
    corner: "T11 – Curva Parabolica", timeCostMs: 185, severity: "warning",
    channel: "speed", academyModuleId: "m8", academyModuleTitle: "Corner Exit Optimization",
  },
  {
    id: "i4", title: "Kerb avoidance at Variante Ascari",
    description: "GPS trace shows consistent 1.2m gap from the kerb. Using the kerb here would recover 0.08s per lap.",
    corner: "T9/10 – Variante Ascari", timeCostMs: 82, severity: "info",
    channel: "racing_line",
  },
  {
    id: "i5", title: "Good: Consistent braking at Curva Grande",
    description: "Braking point variance across 8 laps is only 1.8m. Well within the 3m target. Strong area.",
    corner: "T2 – Curva Grande", timeCostMs: 0, severity: "info",
    channel: "brake",
  },
];

// ─── Tracks ───────────────────────────────────────────────────────────────────

export const mockTracks: Track[] = [
  {
    id: "suzuka",
    name: "Suzuka International Racing Course",
    country: "Japan",
    countryCode: "JP",
    lengthKm: 5.807,
    corners: 18,
    lapRecord: "1:30.983",
    yourBest: undefined,
    deltaVsRecord: undefined,
    difficulty: "expert" as const,
    keyCharacteristics: ["Figure-of-8 layout", "S-curves", "130R", "Spoon Curve", "High-speed flow"],
    sectors: [
      { id:1, name:"T1 to S-Curves", description:"Fast entry complex", yourTime:"—", refTime:"0:31.2", deltaMs:0, corners:["T1","T2","S-Curves"] },
      { id:2, name:"Degner to Spoon", description:"Technical section",  yourTime:"—", refTime:"0:32.4", deltaMs:0, corners:["Degner 1","Degner 2","Hairpin","Spoon"] },
      { id:3, name:"130R to Finish",  description:"High speed finale",   yourTime:"—", refTime:"0:27.4", deltaMs:0, corners:["130R","Casio Chicane"] },
    ],
  },

  {
    id: "imola",
    name: "Autodromo Enzo e Dino Ferrari",
    country: "Italy",
    countryCode: "IT",
    lengthKm: 4.909,
    corners: 19,
    lapRecord: "1:15.484",
    yourBest: undefined,
    deltaVsRecord: undefined,
    difficulty: "hard" as const,
    keyCharacteristics: ["Narrow track", "Tamburello chicane", "Tosa hairpin", "Elevation changes"],
    sectors: [
      { id:1, name:"T1 to Tosa", description:"Tamburello and Villeneuve chicanes", yourTime:"—", refTime:"0:24.8", deltaMs:0, corners:["Tamburello","Villeneuve","Tosa"] },
      { id:2, name:"Piratella to Acque Min.", description:"Uphill technical section", yourTime:"—", refTime:"0:26.1", deltaMs:0, corners:["Piratella","Acque Minerali"] },
      { id:3, name:"Variante Alta to Rivazza", description:"Technical finale", yourTime:"—", refTime:"0:24.5", deltaMs:0, corners:["Variante Alta","Rivazza 1","Rivazza 2"] },
    ],
  },
  {
    id: "barcelona",
    name: "Circuit de Barcelona-Catalunya",
    country: "Spain",
    countryCode: "ES",
    lengthKm: 4.675,
    corners: 14,
    lapRecord: "1:16.330",
    yourBest: undefined,
    deltaVsRecord: undefined,
    difficulty: "medium" as const,
    keyCharacteristics: ["Technical T1", "High-speed esses", "La Caixa", "Long main straight"],
    sectors: [
      { id:1, name:"T1 to Esses", description:"Braking zone and fast complex", yourTime:"—", refTime:"0:25.3", deltaMs:0, corners:["T1","Esses","Repsol"] },
      { id:2, name:"La Caixa to Banc Sabadell", description:"Technical infield", yourTime:"—", refTime:"0:28.4", deltaMs:0, corners:["La Caixa","Banc Sabadell"] },
      { id:3, name:"Campsa to finish", description:"Chicane and main straight", yourTime:"—", refTime:"0:22.6", deltaMs:0, corners:["Campsa","New chicane"] },
    ],
  },
  {
    id: "monza", name: "Autodromo Nazionale Monza", country: "Italy", countryCode: "IT",
    lengthKm: 5.793, corners: 11, lapRecord: "1:43.591", yourBest: "1:44.832",
    deltaVsRecord: -1241, difficulty: "medium",
    keyCharacteristics: ["High speed", "Low downforce", "Heavy braking", "Tyre sensitive"],
    sectors: [
      {
        id: 1, name: "Sector 1", description: "Rettifilo straight, T1 chicane, Curva Grande",
        yourTime: "0:28.441", refTime: "0:28.321", deltaMs: -120,
        corners: ["T1 Variante del Rettifilo", "T2 Curva Grande"],
      },
      {
        id: 2, name: "Sector 2", description: "Lesmo 1 & 2, Variante Ascari",
        yourTime: "0:42.218", refTime: "0:41.376", deltaMs: -842,
        corners: ["T3 Variante della Roggia", "T6/7 Lesmo 1 & 2", "T9/10 Variante Ascari"],
      },
      {
        id: 3, name: "Sector 3", description: "Back straight, Curva Parabolica",
        yourTime: "0:34.173", refTime: "0:33.894", deltaMs: -279,
        corners: ["T11 Curva Parabolica"],
      },
    ],
  },
  {
    id: "spa", name: "Circuit de Spa-Francorchamps", country: "Belgium", countryCode: "BE",
    lengthKm: 7.004, corners: 20, lapRecord: "2:16.841", yourBest: "2:19.112",
    deltaVsRecord: -2271, difficulty: "hard",
    keyCharacteristics: ["Elevation changes", "Weather variable", "High speed corners", "Long lap"],
    sectors: [
      {
        id: 1, name: "Sector 1", description: "La Source, Eau Rouge/Raidillon, Kemmel",
        yourTime: "0:45.221", refTime: "0:44.801", deltaMs: -420,
        corners: ["T1 La Source", "T2/3 Eau Rouge / Raidillon"],
      },
      {
        id: 2, name: "Sector 2", description: "Les Combes through Pouhon",
        yourTime: "0:55.441", refTime: "0:54.112", deltaMs: -1329,
        corners: ["T4/5 Les Combes", "T8 Pouhon"],
      },
      {
        id: 3, name: "Sector 3", description: "Fagnes to Bus Stop",
        yourTime: "0:38.450", refTime: "0:37.928", deltaMs: -522,
        corners: ["T17 Blanchimont", "T18/19 Bus Stop"],
      },
    ],
  },
  {
    id: "silverstone", name: "Silverstone Circuit", country: "United Kingdom", countryCode: "GB",
    lengthKm: 5.891, corners: 18, lapRecord: "1:47.941", yourBest: undefined,
    deltaVsRecord: undefined, difficulty: "hard",
    keyCharacteristics: ["High-speed corners", "Smooth surface", "Windy", "Aerodynamic sensitivity"],
    sectors: [
      {
        id: 1, name: "Sector 1", description: "Copse, Maggotts, Becketts",
        yourTime: "0:30.000", refTime: "0:29.541", deltaMs: -459,
        corners: ["T1 Copse", "T5/6/7 Maggotts/Becketts"],
      },
      {
        id: 2, name: "Sector 2", description: "Hangar straight, Stowe",
        yourTime: "0:32.441", refTime: "0:32.100", deltaMs: -341,
        corners: ["T9 Stowe", "T10/11 Vale / Club"],
      },
      {
        id: 3, name: "Sector 3", description: "Abbey to Luffield",
        yourTime: "0:45.500", refTime: "0:46.300", deltaMs: 800,
        corners: ["T12 Abbey", "T16 Luffield"],
      },
    ],
  },
  {
    id: "nurburgring", name: "Nürburgring GP-Strecke", country: "Germany", countryCode: "DE",
    lengthKm: 5.148, corners: 16, lapRecord: "1:42.601", yourBest: undefined,
    difficulty: "expert",
    keyCharacteristics: ["Technical chicanes", "Fast flowing sections", "Demanding braking zones", "Bumpy surface"],
    sectors: [
      {
        id: 1, name: "Sector 1", description: "Einfahrt, Ford-Kurve, Dunlop",
        yourTime: "0:35.211", refTime: "0:34.891", deltaMs: -320,
        corners: ["T1 Einfahrt Motodrom", "T3 Ford Kurve"],
      },
      {
        id: 2, name: "Sector 2", description: "Veedol, Bit-Kurve through Esses",
        yourTime: "0:31.441", refTime: "0:30.989", deltaMs: -452,
        corners: ["T6/7 Mercedes Arena", "T8/9 Esses"],
      },
      {
        id: 3, name: "Sector 3", description: "Advan, NGK to Hairpin",
        yourTime: "0:36.900", refTime: "0:36.721", deltaMs: -179,
        corners: ["T11 Advan Kurve", "T16 Zielkurve"],
      },
    ],
  },
];

// ─── Cars ─────────────────────────────────────────────────────────────────────

export const mockCars: Car[] = [
  {
    id: "porsche_992_gt3r", name: "992 GT3 R", manufacturer: "Porsche", class: "GT3",
    powerHp: 550, weightKg: 1300, topSpeedKmh: 295, acceleration0to100: 3.2,
    drivetrain: "RWD",
    description: "The benchmark GT3 car. Forgiving on entry, rewards aggressive trail braking, highly traction-sensitive on exit.",
    strengths: ["Stable under braking", "Strong traction on exit", "Predictable rotation", "Excellent aero balance"],
    weaknesses: ["Conservative top speed", "Requires patience on throttle", "Sensitive to rear wing angle"],
    yourBestLap: "1:44.832",
    setupHints: [
      { parameter: "Rear Wing", recommendation: "Run lower than default at Monza. Mid-range at Spa.", impact: "high", category: "aero" },
      { parameter: "Rear Differential", recommendation: "Reduce lock from 75% to 65% to improve rotation mid-corner.", impact: "high", category: "differential" },
      { parameter: "Front Ride Height", recommendation: "Drop 1mm front to sharpen initial turn-in at fast corners.", impact: "medium", category: "suspension" },
      { parameter: "Brake Bias", recommendation: "Move 0.5% rearward at Monza. Prevents early lock at T1.", impact: "medium", category: "brake" },
      { parameter: "Tyre Pressures", recommendation: "Target 27.5 PSI hot FL/FR. Rear 26.0 PSI.", impact: "high", category: "tyres" },
    ],
  },
  {
    id: "ferrari_296_gt3", name: "296 GT3", manufacturer: "Ferrari", class: "GT3",
    powerHp: 600, weightKg: 1280, topSpeedKmh: 300, acceleration0to100: 3.0,
    drivetrain: "RWD",
    description: "High rotation car that rewards aggressive driving style. More oversteer on power than Porsche. Faster raw pace but narrower operating window.",
    strengths: ["Very fast outright", "Responsive steering", "Strong power delivery", "Excellent high-speed stability"],
    weaknesses: ["Tricky rotation balance", "Sensitive to setup changes", "Less forgiving on entry"],
    setupHints: [
      { parameter: "Front Anti-Roll Bar", recommendation: "Stiffen 1 click to control roll in fast corners.", impact: "medium", category: "suspension" },
      { parameter: "Rear Differential Preload", recommendation: "Increase preload 10Nm for better traction on exit.", impact: "high", category: "differential" },
      { parameter: "Rear Wing", recommendation: "1-2 clicks more than Porsche equivalent — needs download through fast corners.", impact: "high", category: "aero" },
      { parameter: "Brake Pressure", recommendation: "Reduce max pressure 5% — easily locks under heavy braking.", impact: "medium", category: "brake" },
    ],
  },
  {
    id: "bmw_m4_gt3", name: "M4 GT3", manufacturer: "BMW", class: "GT3",
    powerHp: 590, weightKg: 1310, topSpeedKmh: 298, acceleration0to100: 3.1,
    drivetrain: "RWD",
    description: "Understeer-biased at turn-in but excellent traction car. Very forgiving, ideal for consistency training. Large tyre contact patch.",
    strengths: ["Excellent traction", "Consistent tyre wear", "Forgiving setup window", "Strong under hard braking"],
    weaknesses: ["Understeer at entry", "Less rotation than rivals", "Top speed limited"],
    setupHints: [
      { parameter: "Front Ride Height", recommendation: "Drop 2mm front to sharpen turn-in. Key for this car.", impact: "high", category: "suspension" },
      { parameter: "Front ARB", recommendation: "Soften 1 click to add rotation on entry.", impact: "high", category: "suspension" },
      { parameter: "Rear Wing", recommendation: "Mid-range at all circuits. Stable but not draggy.", impact: "medium", category: "aero" },
    ],
  },
  {
    id: "mercedes_amg_gt3", name: "AMG GT3 Evo", manufacturer: "Mercedes-AMG", class: "GT3",
    powerHp: 557, weightKg: 1295, topSpeedKmh: 294, acceleration0to100: 3.1,
    drivetrain: "RWD",
    description: "Balanced GT3 with strong aero platform. Great at flowing circuits, less suited to tight technical tracks. Comfortable long-stint car.",
    strengths: ["Aero platform", "Balanced handling", "Strong in long stints", "Good brake performance"],
    weaknesses: ["Average pace at slow circuits", "Heavy steering feel", "Mid-corner understeer"],
    setupHints: [
      { parameter: "Rear Wing", recommendation: "Higher than average. Car needs download to shine.", impact: "high", category: "aero" },
      { parameter: "Brake Bias", recommendation: "0.5% forward for better front bite at slow corners.", impact: "medium", category: "brake" },
    ],
  },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const mockRecentSessions: RecentSession[] = [
  { id: "s1", track: "Monza", car: "Porsche 992 GT3 R", date: "Today", bestLap: "1:44.832", laps: 18, improvement: -0.342, sim: "ACC" },
  { id: "s2", track: "Monza", car: "Porsche 992 GT3 R", date: "Yesterday", bestLap: "1:45.174", laps: 12, improvement: -0.118, sim: "ACC" },
  { id: "s3", track: "Spa", car: "Ferrari 296 GT3", date: "3 days ago", bestLap: "2:19.112", laps: 22, improvement: null, sim: "ACC" },
  { id: "s4", track: "Silverstone", car: "BMW M4 GT3", date: "1 week ago", bestLap: "1:49.441", laps: 15, improvement: 0.227, sim: "iRacing" },
  { id: "s5", track: "Monza", car: "Porsche 992 GT3 R", date: "1 week ago", bestLap: "1:45.516", laps: 20, improvement: -0.891, sim: "ACC" },
];

export const mockWeeklyChallenge: WeeklyChallenge = {
  id: "wc_01", title: "Monza Sector 2 Focus",
  description: "Close the gap in Sector 2 at Monza. Focus on Lesmo entry and Ascari chicane exit.",
  track: "Monza", targetDelta: -0.5, yourDelta: -0.842, endsAt: "2024-06-18",
  participants: 847, yourRank: 124,
};

export const mockNextAction: NextAction = {
  type: "watch_module", title: "Complete Module 3 Exercise",
  description: "You're 60% through Braking Fundamentals. The exercise and practice task remain. Your data shows this is your biggest time loss.",
  moduleId: "m3", priority: "high",
};
