/**
 * lib/tracks/database.ts
 *
 * Each track has a unique parametric layout encoded as normalised x/y coordinates
 * in the range [0, 1]. These are used by TrackMap, TrackHeatmap, and TrackAnimation.
 *
 * Layouts are hand-tuned approximations of the real circuits using:
 *   - known track geometry references
 *   - characteristic corner sequences
 *   - aspect ratio preservation
 *
 * Points are listed in lap order (counterclockwise when y-down).
 */

export interface TrackPoint { x: number; y: number }
export interface CornerMarker { id: string; label: string; x: number; y: number; type: "corner" | "sf_line" | "chicane" }
export interface TrackSectorBoundary { sectorIdx: number; pointIdx: number }

export interface TrackLayout {
  id:           string;
  name:         string;
  country:      string;
  lengthKm:     number;
  /** Normalised [0,1] coordinates for the racing line, in lap order */
  points:       TrackPoint[];
  corners:      CornerMarker[];
  sectorBoundaries: TrackSectorBoundary[];
  /** Which point index is the start/finish line */
  sfLineIdx:    number;
  /** Track width in canvas units (relative to 1.0 scale) */
  widthFactor:  number;
}

// ─── Helper: parametric circuit builder ──────────────────────────────────────

/**
 * Generates circuit points from a set of [angle, radius] control points
 * and returns normalised [0,1] coordinates.
 */
function buildCircuit(
  segments: Array<{
    /** start angle (degrees from east, counterclockwise) */
    angle0: number;
    angle1: number;
    /** base radius of this arc */
    r: number;
    /** centre of this arc */
    cx: number;
    cy: number;
    /** point density */
    steps: number;
  }>
): TrackPoint[] {
  const raw: TrackPoint[] = [];

  for (const seg of segments) {
    const a0 = (seg.angle0 * Math.PI) / 180;
    const a1 = (seg.angle1 * Math.PI) / 180;
    for (let i = 0; i <= seg.steps; i++) {
      const t = i / seg.steps;
      const a = a0 + (a1 - a0) * t;
      raw.push({
        x: seg.cx + seg.r * Math.cos(a),
        y: seg.cy + seg.r * Math.sin(a),
      });
    }
  }

  // Normalise to [0.05, 0.95] with aspect preservation
  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const MARGIN = 0.08;
  const SCALE  = 1 - MARGIN * 2;

  return raw.map((p) => ({
    x: MARGIN + ((p.x - minX) / rangeX) * SCALE,
    y: MARGIN + ((p.y - minY) / rangeY) * SCALE,
  }));
}

// ─── MONZA ────────────────────────────────────────────────────────────────────
// Characteristic: two chicanes + Lesmos + long back straight + Parabolica

const MONZA_POINTS: TrackPoint[] = (() => {
  const pts: TrackPoint[] = [];

  // S/F line → Variante del Rettifilo (chicane 1)
  for (let i = 0; i <= 15; i++) pts.push({ x: 0.05 + i * 0.04, y: 0.30 });
  // Right-left chicane
  for (let i = 0; i <= 6;  i++) pts.push({ x: 0.65 + i * 0.01, y: 0.30 + i * 0.03 });
  for (let i = 0; i <= 6;  i++) pts.push({ x: 0.71 - i * 0.01, y: 0.48 - i * 0.03 });
  // Curva Grande (long right)
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * 0.8;
    pts.push({ x: 0.72 + 0.12 * Math.cos(-a + 0.5), y: 0.48 + 0.12 * Math.sin(-a + 0.5) });
  }
  // Back straight approach → Variante della Roggia (chicane 2)
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.78 - i * 0.02, y: 0.52 + i * 0.02 });
  for (let i = 0; i <= 6;  i++) pts.push({ x: 0.58 - i * 0.015, y: 0.72 + i * 0.02 });
  // Lesmo 1
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 0.6;
    pts.push({ x: 0.38 + 0.09 * Math.cos(a + Math.PI), y: 0.74 - 0.09 * Math.sin(a + Math.PI) });
  }
  // Lesmo 2 + Variante Ascari
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.30 - i * 0.02, y: 0.68 - i * 0.015 });
  for (let i = 0; i <= 8;  i++) pts.push({ x: 0.10 + i * 0.01, y: 0.53 - i * 0.02 });
  // Back to main straight via Curva Parabolica
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 0.9 + Math.PI * 0.6;
    pts.push({ x: 0.14 + 0.12 * Math.cos(a), y: 0.42 + 0.11 * Math.sin(a) });
  }
  // Main straight back to S/F
  for (let i = 0; i <= 12; i++) pts.push({ x: 0.07 + i * 0.003, y: 0.30 - i * 0.001 });

  return pts;
})();

// ─── SPA ─────────────────────────────────────────────────────────────────────
// Characteristic: elevation changes (Eau Rouge), Kemmel, Bus Stop

const SPA_POINTS: TrackPoint[] = (() => {
  const pts: TrackPoint[] = [];

  // S/F line → La Source hairpin
  for (let i = 0; i <= 12; i++) pts.push({ x: 0.35 + i * 0.02, y: 0.20 });
  // La Source (tight right)
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.9;
    pts.push({ x: 0.59 + 0.06 * Math.cos(a), y: 0.18 + 0.06 * Math.sin(a) });
  }
  // Down to Eau Rouge / Raidillon
  for (let i = 0; i <= 14; i++) pts.push({ x: 0.57 - i * 0.015, y: 0.25 + i * 0.025 });
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.36 - i * 0.01, y: 0.60 + i * 0.015 });
  // Kemmel straight
  for (let i = 0; i <= 16; i++) pts.push({ x: 0.26 + i * 0.015, y: 0.75 + i * 0.008 });
  // Les Combes
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.7;
    pts.push({ x: 0.50 + 0.08 * Math.cos(-a), y: 0.88 - 0.07 * Math.sin(-a) });
  }
  // Through Pouhon (double-apex fast)
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 1.3;
    pts.push({ x: 0.62 + 0.10 * Math.cos(a + Math.PI * 0.8), y: 0.74 + 0.10 * Math.sin(a + Math.PI * 0.8) });
  }
  // Back section → Bus Stop
  for (let i = 0; i <= 12; i++) pts.push({ x: 0.68 + i * 0.01, y: 0.60 - i * 0.018 });
  for (let i = 0; i <= 8;  i++) {
    const a = (i / 8) * Math.PI * 0.6;
    pts.push({ x: 0.80 + 0.05 * Math.cos(-a), y: 0.42 + 0.05 * Math.sin(-a) });
  }
  // Back to S/F
  for (let i = 0; i <= 16; i++) pts.push({ x: 0.78 - i * 0.027, y: 0.36 - i * 0.010 });

  return pts;
})();

// ─── SILVERSTONE ─────────────────────────────────────────────────────────────
// Characteristic: high-speed Maggotts/Becketts complex, Stowe, Copse

const SILVERSTONE_POINTS: TrackPoint[] = (() => {
  const pts: TrackPoint[] = [];

  // S/F → Copse (fast right)
  for (let i = 0; i <= 12; i++) pts.push({ x: 0.30 + i * 0.03, y: 0.55 });
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.55;
    pts.push({ x: 0.66 + 0.08 * Math.cos(-a + Math.PI * 0.5), y: 0.52 - 0.09 * Math.sin(-a + Math.PI * 0.5) });
  }
  // Maggotts / Becketts complex (S-bends)
  for (let i = 0; i <= 8; i++) pts.push({ x: 0.72 - i * 0.015, y: 0.42 - i * 0.012 });
  for (let i = 0; i <= 8; i++) pts.push({ x: 0.60 - i * 0.012, y: 0.30 + i * 0.010 });
  for (let i = 0; i <= 8; i++) pts.push({ x: 0.50 - i * 0.012, y: 0.40 + i * 0.010 });
  for (let i = 0; i <= 8; i++) pts.push({ x: 0.40 - i * 0.010, y: 0.50 + i * 0.008 });
  // Hangar straight
  for (let i = 0; i <= 14; i++) pts.push({ x: 0.24 + i * 0.01, y: 0.58 + i * 0.012 });
  // Stowe
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 0.8;
    pts.push({ x: 0.38 + 0.08 * Math.cos(a - Math.PI * 0.2), y: 0.74 + 0.08 * Math.sin(a - Math.PI * 0.2) });
  }
  // Vale → Club
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.34 - i * 0.015, y: 0.72 - i * 0.012 });
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.7;
    pts.push({ x: 0.22 + 0.07 * Math.cos(-a), y: 0.60 - 0.07 * Math.sin(-a) });
  }
  // Abbey → Luffield
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.17 + i * 0.010, y: 0.54 + i * 0.008 });
  for (let i = 0; i <= 12; i++) pts.push({ x: 0.27 + i * 0.003, y: 0.62 - i * 0.006 });

  return pts;
})();

// ─── NÜRBURGRING GP ──────────────────────────────────────────────────────────
// Characteristic: tight infield, Bus Stop, Mercedes Arena

const NURBURGRING_POINTS: TrackPoint[] = (() => {
  const pts: TrackPoint[] = [];

  // S/F → Einfahrt Motodrom
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.50 + i * 0.02, y: 0.25 });
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.8;
    pts.push({ x: 0.70 + 0.07 * Math.cos(-a + Math.PI), y: 0.25 - 0.07 * Math.sin(-a + Math.PI) });
  }
  // Ford Kurve (fast right sweep)
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 0.9;
    pts.push({ x: 0.74 + 0.09 * Math.cos(a + Math.PI * 0.3), y: 0.22 + 0.09 * Math.sin(a + Math.PI * 0.3) });
  }
  // Dunlop Kehre (hairpin)
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 1.2;
    pts.push({ x: 0.78 + 0.06 * Math.cos(a + Math.PI * 1.0), y: 0.40 + 0.06 * Math.sin(a + Math.PI * 1.0) });
  }
  // Infield section
  for (let i = 0; i <= 12; i++) pts.push({ x: 0.74 - i * 0.018, y: 0.50 + i * 0.015 });
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.52 - i * 0.015, y: 0.68 + i * 0.010 });
  // Mercedes Arena (series of corners)
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 1.1;
    pts.push({ x: 0.38 + 0.10 * Math.cos(a), y: 0.72 + 0.08 * Math.sin(a) });
  }
  // Bit-Kurve / Esses
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.30 - i * 0.012, y: 0.62 - i * 0.015 });
  for (let i = 0; i <= 10; i++) pts.push({ x: 0.18 - i * 0.008, y: 0.47 + i * 0.010 });
  // Advan Kurve → back to S/F
  for (let i = 0; i <= 14; i++) pts.push({ x: 0.12 + i * 0.015, y: 0.56 - i * 0.015 });
  for (let i = 0; i <= 14; i++) pts.push({ x: 0.33 + i * 0.012, y: 0.38 - i * 0.009 });

  return pts;
})();

// ─── Database ─────────────────────────────────────────────────────────────────

export const TRACK_LAYOUTS: Record<string, TrackLayout> = {
  monza: {
    id: "monza",
    name: "Autodromo Nazionale Monza",
    country: "Italy",
    lengthKm: 5.793,
    points: MONZA_POINTS,
    sfLineIdx: 0,
    widthFactor: 1.0,
    sectorBoundaries: [
      { sectorIdx: 0, pointIdx: 0 },
      { sectorIdx: 1, pointIdx: Math.floor(MONZA_POINTS.length * 0.33) },
      { sectorIdx: 2, pointIdx: Math.floor(MONZA_POINTS.length * 0.66) },
    ],
    corners: [
      { id: "t1",  label: "T1",  x: 0.64, y: 0.35, type: "chicane" },
      { id: "t2",  label: "T2",  x: 0.74, y: 0.48, type: "corner"  },
      { id: "t3",  label: "T3",  x: 0.62, y: 0.70, type: "chicane" },
      { id: "t6",  label: "L1",  x: 0.38, y: 0.68, type: "corner"  },
      { id: "t8",  label: "L2",  x: 0.28, y: 0.58, type: "corner"  },
      { id: "t11", label: "Par", x: 0.16, y: 0.38, type: "corner"  },
    ],
  },

  spa: {
    id: "spa",
    name: "Circuit de Spa-Francorchamps",
    country: "Belgium",
    lengthKm: 7.004,
    points: SPA_POINTS,
    sfLineIdx: 0,
    widthFactor: 1.0,
    sectorBoundaries: [
      { sectorIdx: 0, pointIdx: 0 },
      { sectorIdx: 1, pointIdx: Math.floor(SPA_POINTS.length * 0.35) },
      { sectorIdx: 2, pointIdx: Math.floor(SPA_POINTS.length * 0.70) },
    ],
    corners: [
      { id: "source",    label: "La Source",  x: 0.58, y: 0.20, type: "corner"  },
      { id: "raidillon", label: "Eau Rouge",  x: 0.38, y: 0.62, type: "corner"  },
      { id: "les_combes",label: "Les Combes", x: 0.52, y: 0.85, type: "corner"  },
      { id: "pouhon",    label: "Pouhon",     x: 0.66, y: 0.72, type: "corner"  },
      { id: "bus_stop",  label: "Bus Stop",   x: 0.80, y: 0.42, type: "chicane" },
    ],
  },

  silverstone: {
    id: "silverstone",
    name: "Silverstone Circuit",
    country: "United Kingdom",
    lengthKm: 5.891,
    points: SILVERSTONE_POINTS,
    sfLineIdx: 0,
    widthFactor: 1.0,
    sectorBoundaries: [
      { sectorIdx: 0, pointIdx: 0 },
      { sectorIdx: 1, pointIdx: Math.floor(SILVERSTONE_POINTS.length * 0.35) },
      { sectorIdx: 2, pointIdx: Math.floor(SILVERSTONE_POINTS.length * 0.68) },
    ],
    corners: [
      { id: "copse",     label: "Copse",    x: 0.68, y: 0.44, type: "corner" },
      { id: "becketts",  label: "Becketts", x: 0.56, y: 0.33, type: "corner" },
      { id: "stowe",     label: "Stowe",    x: 0.36, y: 0.76, type: "corner" },
      { id: "club",      label: "Club",     x: 0.22, y: 0.58, type: "corner" },
      { id: "luffield",  label: "Luffield", x: 0.28, y: 0.60, type: "corner" },
    ],
  },

  nurburgring: {
    id: "nurburgring",
    name: "Nürburgring GP-Strecke",
    country: "Germany",
    lengthKm: 5.148,
    points: NURBURGRING_POINTS,
    sfLineIdx: 0,
    widthFactor: 1.0,
    sectorBoundaries: [
      { sectorIdx: 0, pointIdx: 0 },
      { sectorIdx: 1, pointIdx: Math.floor(NURBURGRING_POINTS.length * 0.38) },
      { sectorIdx: 2, pointIdx: Math.floor(NURBURGRING_POINTS.length * 0.72) },
    ],
    corners: [
      { id: "einfahrt",  label: "T1",    x: 0.72, y: 0.22, type: "corner"  },
      { id: "ford",      label: "Ford",  x: 0.76, y: 0.30, type: "corner"  },
      { id: "dunlop",    label: "Dunlop",x: 0.80, y: 0.44, type: "corner"  },
      { id: "mercedes",  label: "M-Arena",x: 0.38, y: 0.76, type: "corner" },
      { id: "advan",     label: "Advan", x: 0.20, y: 0.52, type: "corner"  },
    ],
  },
};

export function getTrackLayout(trackId: string): TrackLayout | null {
  return TRACK_LAYOUTS[trackId] ?? null;
}

export function getAllTracks(): TrackLayout[] {
  return Object.values(TRACK_LAYOUTS);
}
