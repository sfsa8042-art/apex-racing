/**
 * lib/tracks/geometry.ts
 *
 * Approximate but distinctive silhouettes of major sim racing tracks.
 * Coordinates are in "raw" proportional space — each track preserves its
 * unique outline. normalisePoints() maps them to a unit square (0-1).
 *
 * Render with (1-y) for y-flip if you want north-up.
 *
 * Shapes carefully crafted to match the real circuit silhouettes —
 * compare side-by-side with satellite views of each circuit.
 */

export interface Vec2 { x: number; y: number }

export interface CornerAnnotation {
  id:        string;
  label:     string;
  lapFrac:   number;
  type:      "hairpin" | "chicane" | "slow" | "medium" | "fast";
  brakeZone: boolean;
}

export interface SectorMarker { sectorIdx: number; lapFrac: number; }

export interface CircuitGeometry {
  id:             string;
  name:           string;
  country:        string;
  countryEmoji:   string;
  lengthKm:       number;
  centerline:     Vec2[];
  corners:        CornerAnnotation[];
  sectorMarkers:  SectorMarker[];
  trackWidthNorm: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normalise to fit [0,1] x [0,1] preserving aspect ratio (centred). */
function normalisePoints(pts: Vec2[]): Vec2[] {
  if (!pts.length) return pts;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = 1 / Math.max(rangeX, rangeY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return pts.map(p => ({
    x: (p.x - cx) * scale + 0.5,
    y: (p.y - cy) * scale + 0.5,
  }));
}

/** Catmull-Rom smoothing → SVG-friendly point chain. */
function smooth(pts: Vec2[], samples = 16, closed = false): Vec2[] {
  if (pts.length < 3) return pts;
  const out: Vec2[] = [];
  const n = pts.length;
  const lastI = closed ? n : n - 1;
  for (let i = 0; i < lastI; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y: 0.5 * ((2*p1.y) + (-p0.y+p2.y)*t + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACK COORDINATES — based on real-world circuit silhouettes
// ─────────────────────────────────────────────────────────────────────────────

// ── MONZA ──────────────────────────────────────────────────────────────────
// Real shape: roughly triangular. Main straight runs NE, T1 chicane at NE
// corner, Curva Grande loops SE, Roggia chicane, Lesmos heading west,
// Serraglio straight, Ascari chicane, long Parabolica returning to S/F.
const MONZA: Vec2[] = [
  // Start/finish line — bottom-left, heading east along main straight
  { x: 0.30, y: 0.10 }, { x: 0.60, y: 0.10 }, { x: 0.90, y: 0.10 },
  // T1/T2 Variante del Rettifilo — slow right-left chicane
  { x: 1.05, y: 0.13 }, { x: 1.02, y: 0.20 }, { x: 0.95, y: 0.23 },
  { x: 1.00, y: 0.27 }, { x: 1.10, y: 0.30 },
  // Curva Grande — long right sweeper heading SE
  { x: 1.25, y: 0.36 }, { x: 1.36, y: 0.45 }, { x: 1.42, y: 0.58 },
  { x: 1.42, y: 0.70 }, { x: 1.36, y: 0.82 },
  // Variante della Roggia — chicane
  { x: 1.28, y: 0.88 }, { x: 1.18, y: 0.85 }, { x: 1.14, y: 0.78 },
  // Curva di Lesmo 1
  { x: 1.06, y: 0.82 }, { x: 0.96, y: 0.86 }, { x: 0.86, y: 0.82 },
  { x: 0.82, y: 0.74 },
  // Curva di Lesmo 2
  { x: 0.76, y: 0.76 }, { x: 0.68, y: 0.78 }, { x: 0.60, y: 0.74 },
  { x: 0.58, y: 0.66 },
  // Curva del Serraglio (back straight)
  { x: 0.52, y: 0.62 }, { x: 0.46, y: 0.66 }, { x: 0.42, y: 0.74 },
  // Variante Ascari — flowing right-left-right
  { x: 0.34, y: 0.78 }, { x: 0.22, y: 0.72 }, { x: 0.16, y: 0.62 },
  { x: 0.10, y: 0.56 },
  // Curva Parabolica — long right-hander, the defining Monza corner
  { x: 0.04, y: 0.46 }, { x: 0.02, y: 0.36 }, { x: 0.06, y: 0.26 },
  { x: 0.12, y: 0.18 }, { x: 0.20, y: 0.12 },
];

const MONZA_CORNERS: CornerAnnotation[] = [
  { id:"t1",    label:"T1",     lapFrac:0.10, type:"chicane", brakeZone:true  },
  { id:"cg",    label:"Grande", lapFrac:0.22, type:"fast",    brakeZone:false },
  { id:"rog",   label:"Roggia", lapFrac:0.38, type:"chicane", brakeZone:true  },
  { id:"les1",  label:"Lesmo1", lapFrac:0.48, type:"medium",  brakeZone:true  },
  { id:"les2",  label:"Lesmo2", lapFrac:0.56, type:"medium",  brakeZone:true  },
  { id:"asc",   label:"Ascari", lapFrac:0.72, type:"chicane", brakeZone:true  },
  { id:"par",   label:"Parab",  lapFrac:0.87, type:"medium",  brakeZone:true  },
];

// ── SPA-FRANCORCHAMPS ──────────────────────────────────────────────────────
// Real shape: long, narrow, irregular. La Source hairpin at NW, Eau Rouge
// drops then climbs to the Kemmel straight (long diagonal SE), Les Combes,
// twisty middle section, Stavelot, fast Blanchimont, Bus Stop chicane.
const SPA: Vec2[] = [
  // S/F + run to La Source (top section, going east)
  { x: 0.30, y: 0.92 }, { x: 0.40, y: 0.92 }, { x: 0.50, y: 0.92 },
  // La Source — tight right hairpin
  { x: 0.56, y: 0.91 }, { x: 0.58, y: 0.86 }, { x: 0.54, y: 0.82 },
  { x: 0.48, y: 0.82 },
  // Eau Rouge / Raidillon — sharp left-right-left, then climb
  { x: 0.40, y: 0.78 }, { x: 0.34, y: 0.72 }, { x: 0.32, y: 0.66 },
  { x: 0.38, y: 0.60 },
  // Kemmel Straight — long fast diagonal
  { x: 0.46, y: 0.54 }, { x: 0.54, y: 0.48 }, { x: 0.62, y: 0.42 },
  { x: 0.70, y: 0.36 },
  // Les Combes — right-left-right chicane
  { x: 0.76, y: 0.30 }, { x: 0.84, y: 0.30 }, { x: 0.90, y: 0.34 },
  { x: 0.92, y: 0.40 }, { x: 0.88, y: 0.46 },
  // Malmedy → Rivage → Pouhon — twisty middle
  { x: 0.92, y: 0.52 }, { x: 0.94, y: 0.60 }, { x: 0.88, y: 0.66 },
  { x: 0.82, y: 0.62 }, { x: 0.74, y: 0.60 },
  // Pouhon — fast double-left
  { x: 0.66, y: 0.56 }, { x: 0.60, y: 0.48 }, { x: 0.62, y: 0.40 },
  // Fagnes — right-left chicane
  { x: 0.66, y: 0.32 }, { x: 0.72, y: 0.26 }, { x: 0.70, y: 0.20 },
  // Campus / Stavelot — right
  { x: 0.62, y: 0.16 }, { x: 0.52, y: 0.14 }, { x: 0.42, y: 0.14 },
  // Curve Paul Frère
  { x: 0.32, y: 0.18 }, { x: 0.24, y: 0.24 },
  // Blanchimont — flat-out left
  { x: 0.20, y: 0.34 }, { x: 0.18, y: 0.46 }, { x: 0.16, y: 0.58 },
  { x: 0.16, y: 0.70 },
  // Bus Stop chicane
  { x: 0.18, y: 0.78 }, { x: 0.22, y: 0.82 }, { x: 0.26, y: 0.85 },
  // Pit straight back to S/F
  { x: 0.28, y: 0.90 },
];

const SPA_CORNERS: CornerAnnotation[] = [
  { id:"la-source", label:"LaSrc",   lapFrac:0.05, type:"hairpin", brakeZone:true  },
  { id:"raidillon", label:"EauRg",   lapFrac:0.13, type:"fast",    brakeZone:false },
  { id:"combes",    label:"Combes",  lapFrac:0.30, type:"chicane", brakeZone:true  },
  { id:"rivage",    label:"Rivage",  lapFrac:0.38, type:"medium",  brakeZone:true  },
  { id:"pouhon",    label:"Pouhon",  lapFrac:0.50, type:"fast",    brakeZone:false },
  { id:"fagnes",    label:"Fagnes",  lapFrac:0.60, type:"chicane", brakeZone:true  },
  { id:"stavelot",  label:"Stavel",  lapFrac:0.70, type:"medium",  brakeZone:true  },
  { id:"blanch",    label:"Blanch",  lapFrac:0.85, type:"fast",    brakeZone:false },
  { id:"busstop",   label:"BusStp",  lapFrac:0.95, type:"chicane", brakeZone:true  },
];

// ── SILVERSTONE ────────────────────────────────────────────────────────────
// Real shape: complex, sprawling. New layout w/ Wellington straight.
// Distinctive: Maggotts-Becketts-Chapel high-speed esses, Stowe hairpin.
const SILVERSTONE: Vec2[] = [
  // S/F + Abbey (right) - top
  { x: 0.50, y: 0.92 }, { x: 0.58, y: 0.92 }, { x: 0.66, y: 0.90 },
  // Farm Curve (gentle left)
  { x: 0.72, y: 0.86 }, { x: 0.76, y: 0.78 },
  // Village (medium right) - The Loop (slow left)
  { x: 0.80, y: 0.72 }, { x: 0.84, y: 0.64 }, { x: 0.86, y: 0.56 },
  { x: 0.80, y: 0.50 }, { x: 0.74, y: 0.52 },
  // Aintree (left)
  { x: 0.70, y: 0.58 }, { x: 0.66, y: 0.62 },
  // Wellington Straight (long diagonal to SW)
  { x: 0.60, y: 0.60 }, { x: 0.54, y: 0.56 }, { x: 0.48, y: 0.52 },
  { x: 0.42, y: 0.48 },
  // Brooklands (left)
  { x: 0.36, y: 0.46 }, { x: 0.30, y: 0.50 },
  // Luffield (long right-left)
  { x: 0.26, y: 0.56 }, { x: 0.28, y: 0.64 }, { x: 0.34, y: 0.68 },
  { x: 0.42, y: 0.68 },
  // Woodcote → Copse (right)
  { x: 0.48, y: 0.72 }, { x: 0.52, y: 0.78 }, { x: 0.50, y: 0.82 },
  // Maggotts-Becketts-Chapel — high-speed esses
  { x: 0.42, y: 0.78 }, { x: 0.34, y: 0.72 }, { x: 0.28, y: 0.66 },
  { x: 0.22, y: 0.60 }, { x: 0.18, y: 0.52 },
  // Hangar Straight
  { x: 0.16, y: 0.44 }, { x: 0.14, y: 0.36 }, { x: 0.14, y: 0.28 },
  // Stowe (right)
  { x: 0.18, y: 0.20 }, { x: 0.26, y: 0.16 }, { x: 0.34, y: 0.16 },
  // Vale (left) - Club (long right)
  { x: 0.40, y: 0.20 }, { x: 0.44, y: 0.26 }, { x: 0.44, y: 0.34 },
  { x: 0.40, y: 0.42 }, { x: 0.42, y: 0.50 },
  // Run to S/F
  { x: 0.46, y: 0.58 }, { x: 0.48, y: 0.66 }, { x: 0.49, y: 0.74 },
  { x: 0.50, y: 0.84 },
];

const SILVERSTONE_CORNERS: CornerAnnotation[] = [
  { id:"abbey",    label:"Abbey",  lapFrac:0.02, type:"fast",    brakeZone:false },
  { id:"farm",     label:"Farm",   lapFrac:0.07, type:"medium",  brakeZone:false },
  { id:"village",  label:"Village",lapFrac:0.14, type:"medium",  brakeZone:true  },
  { id:"loop",     label:"Loop",   lapFrac:0.18, type:"slow",    brakeZone:true  },
  { id:"brookl",   label:"Brookl", lapFrac:0.35, type:"medium",  brakeZone:true  },
  { id:"luffield", label:"Luffld", lapFrac:0.42, type:"slow",    brakeZone:true  },
  { id:"copse",    label:"Copse",  lapFrac:0.55, type:"fast",    brakeZone:false },
  { id:"becketts", label:"Beckts", lapFrac:0.62, type:"fast",    brakeZone:false },
  { id:"stowe",    label:"Stowe",  lapFrac:0.80, type:"medium",  brakeZone:true  },
  { id:"vale",     label:"Vale",   lapFrac:0.88, type:"slow",    brakeZone:true  },
  { id:"club",     label:"Club",   lapFrac:0.93, type:"medium",  brakeZone:false },
];

// ── NÜRBURGRING GP ─────────────────────────────────────────────────────────
// Real shape: compact GP layout, tight corners, Mercedes Arena loop in middle.
const NURBURGRING: Vec2[] = [
  // S/F straight
  { x: 0.30, y: 0.80 }, { x: 0.40, y: 0.84 }, { x: 0.50, y: 0.86 },
  // Castrol-S (right-left-right)
  { x: 0.58, y: 0.84 }, { x: 0.62, y: 0.78 }, { x: 0.58, y: 0.72 },
  { x: 0.62, y: 0.66 }, { x: 0.70, y: 0.64 },
  // Mercedes-Arena Hairpin (slow right complex)
  { x: 0.78, y: 0.66 }, { x: 0.84, y: 0.62 }, { x: 0.86, y: 0.56 },
  { x: 0.80, y: 0.52 }, { x: 0.72, y: 0.54 },
  // Yokohama-S (left-right)
  { x: 0.66, y: 0.50 }, { x: 0.62, y: 0.46 }, { x: 0.66, y: 0.40 },
  // Ford-Kurve (long right) → Dunlop-Kehre (hairpin)
  { x: 0.74, y: 0.36 }, { x: 0.82, y: 0.32 }, { x: 0.86, y: 0.26 },
  { x: 0.82, y: 0.20 }, { x: 0.74, y: 0.18 }, { x: 0.66, y: 0.20 },
  // Michael-Schumacher-S
  { x: 0.58, y: 0.24 }, { x: 0.50, y: 0.26 }, { x: 0.42, y: 0.22 },
  // Ravenol Kurve (right) → Bit Kurve (left)
  { x: 0.36, y: 0.18 }, { x: 0.30, y: 0.20 }, { x: 0.26, y: 0.26 },
  { x: 0.28, y: 0.34 }, { x: 0.24, y: 0.40 },
  // RTL-Kurve + Veedol-S
  { x: 0.18, y: 0.46 }, { x: 0.14, y: 0.54 }, { x: 0.16, y: 0.62 },
  // NGK-Schikane
  { x: 0.22, y: 0.66 }, { x: 0.26, y: 0.62 }, { x: 0.30, y: 0.66 },
  // Coca-Cola Kurve (long final right)
  { x: 0.34, y: 0.70 }, { x: 0.30, y: 0.74 },
  { x: 0.28, y: 0.78 },
];

const NURBURGRING_CORNERS: CornerAnnotation[] = [
  { id:"castrol", label:"Castr",  lapFrac:0.08, type:"chicane", brakeZone:true  },
  { id:"mercedes",label:"Mercds", lapFrac:0.22, type:"hairpin", brakeZone:true  },
  { id:"yoko",    label:"Yoko",   lapFrac:0.34, type:"medium",  brakeZone:true  },
  { id:"ford",    label:"Ford",   lapFrac:0.42, type:"medium",  brakeZone:false },
  { id:"dunlop",  label:"Dunlop", lapFrac:0.50, type:"hairpin", brakeZone:true  },
  { id:"michael", label:"MSchu",  lapFrac:0.60, type:"chicane", brakeZone:true  },
  { id:"bit",     label:"Bit",    lapFrac:0.70, type:"medium",  brakeZone:true  },
  { id:"veedol",  label:"Veedol", lapFrac:0.80, type:"medium",  brakeZone:false },
  { id:"ngk",     label:"NGK",    lapFrac:0.88, type:"chicane", brakeZone:true  },
  { id:"coca",    label:"Coca",   lapFrac:0.95, type:"medium",  brakeZone:false },
];

// ── SUZUKA ─────────────────────────────────────────────────────────────────
// THE FAMOUS FIGURE-8: only F1 circuit where the track crosses itself.
// Top loop = first half, bottom loop = second half, crossover bridge in middle.
const SUZUKA: Vec2[] = [
  // S/F straight (top)
  { x: 0.30, y: 0.95 }, { x: 0.40, y: 0.93 }, { x: 0.50, y: 0.90 },
  // T1 (right) + T2 (right)
  { x: 0.56, y: 0.86 }, { x: 0.60, y: 0.80 }, { x: 0.56, y: 0.74 },
  // Esses (S-curves: T3-T7) - distinctive zigzag
  { x: 0.50, y: 0.74 }, { x: 0.46, y: 0.78 }, { x: 0.42, y: 0.74 },
  { x: 0.40, y: 0.68 }, { x: 0.44, y: 0.62 }, { x: 0.38, y: 0.58 },
  { x: 0.32, y: 0.56 }, { x: 0.28, y: 0.60 },
  // Dunlop Curve (T7 - long left)
  { x: 0.22, y: 0.64 }, { x: 0.16, y: 0.62 },
  // Degner 1 + Degner 2
  { x: 0.12, y: 0.56 }, { x: 0.16, y: 0.50 }, { x: 0.22, y: 0.48 },
  { x: 0.26, y: 0.42 },
  // CROSSOVER → bridge passes over the track here
  { x: 0.32, y: 0.40 },
  // Hairpin (T11 - slowest corner)
  { x: 0.40, y: 0.38 }, { x: 0.46, y: 0.34 }, { x: 0.46, y: 0.28 },
  { x: 0.40, y: 0.26 }, { x: 0.34, y: 0.28 },
  // Run to Spoon (T13-14, long left double-apex)
  { x: 0.30, y: 0.24 }, { x: 0.24, y: 0.20 }, { x: 0.20, y: 0.14 },
  { x: 0.26, y: 0.08 }, { x: 0.34, y: 0.08 }, { x: 0.40, y: 0.12 },
  // Long back straight to 130R
  { x: 0.48, y: 0.16 }, { x: 0.56, y: 0.20 }, { x: 0.64, y: 0.24 },
  // 130R (fast left)
  { x: 0.72, y: 0.30 }, { x: 0.78, y: 0.38 },
  // Casio Triangle (chicane)
  { x: 0.82, y: 0.44 }, { x: 0.78, y: 0.50 }, { x: 0.82, y: 0.56 },
  // Final right back to S/F
  { x: 0.86, y: 0.66 }, { x: 0.84, y: 0.76 }, { x: 0.78, y: 0.84 },
  { x: 0.68, y: 0.90 }, { x: 0.50, y: 0.94 },  // duplicate near-start for smooth close
];

const SUZUKA_CORNERS: CornerAnnotation[] = [
  { id:"t1",       label:"T1",     lapFrac:0.06, type:"medium",  brakeZone:true  },
  { id:"esses",    label:"Esses",  lapFrac:0.18, type:"fast",    brakeZone:false },
  { id:"dunlop",   label:"Dunlop", lapFrac:0.30, type:"medium",  brakeZone:false },
  { id:"degner1",  label:"Degn1",  lapFrac:0.36, type:"medium",  brakeZone:true  },
  { id:"degner2",  label:"Degn2",  lapFrac:0.42, type:"medium",  brakeZone:true  },
  { id:"hairpin",  label:"Hairp",  lapFrac:0.50, type:"hairpin", brakeZone:true  },
  { id:"spoon",    label:"Spoon",  lapFrac:0.65, type:"medium",  brakeZone:true  },
  { id:"130r",     label:"130R",   lapFrac:0.82, type:"fast",    brakeZone:false },
  { id:"casio",    label:"Casio",  lapFrac:0.92, type:"chicane", brakeZone:true  },
];

// ── IMOLA ──────────────────────────────────────────────────────────────────
// Long winding loop, multiple esses. Distinctive Tamburello (now chicane),
// Variante Alta, Acque Minerali, Rivazza.
const IMOLA: Vec2[] = [
  // S/F + Tamburello chicane (T1-T2)
  { x: 0.30, y: 0.18 }, { x: 0.40, y: 0.18 }, { x: 0.48, y: 0.20 },
  { x: 0.52, y: 0.26 }, { x: 0.48, y: 0.32 }, { x: 0.52, y: 0.38 },
  { x: 0.60, y: 0.40 }, { x: 0.66, y: 0.36 },
  // Villeneuve chicane
  { x: 0.72, y: 0.38 }, { x: 0.74, y: 0.44 }, { x: 0.70, y: 0.48 },
  { x: 0.74, y: 0.54 },
  // Tosa hairpin (slow right)
  { x: 0.82, y: 0.58 }, { x: 0.86, y: 0.62 }, { x: 0.84, y: 0.68 },
  { x: 0.78, y: 0.70 }, { x: 0.70, y: 0.66 },
  // Piratella (medium left, downhill)
  { x: 0.62, y: 0.68 }, { x: 0.54, y: 0.72 }, { x: 0.48, y: 0.76 },
  // Acque Minerali (right-left chicane)
  { x: 0.42, y: 0.78 }, { x: 0.36, y: 0.74 }, { x: 0.32, y: 0.78 },
  { x: 0.30, y: 0.84 }, { x: 0.26, y: 0.86 },
  // Variante Alta (chicane)
  { x: 0.22, y: 0.82 }, { x: 0.18, y: 0.78 }, { x: 0.22, y: 0.72 },
  // Rivazza 1 (left)
  { x: 0.18, y: 0.66 }, { x: 0.14, y: 0.58 }, { x: 0.10, y: 0.52 },
  // Rivazza 2 (left)
  { x: 0.08, y: 0.44 }, { x: 0.12, y: 0.36 }, { x: 0.18, y: 0.30 },
  // Variante Bassa + Tamburello run-up
  { x: 0.24, y: 0.24 }, { x: 0.28, y: 0.20 },
];

const IMOLA_CORNERS: CornerAnnotation[] = [
  { id:"tamb",     label:"Tamb",   lapFrac:0.10, type:"chicane", brakeZone:true  },
  { id:"villen",   label:"Villen", lapFrac:0.25, type:"chicane", brakeZone:true  },
  { id:"tosa",     label:"Tosa",   lapFrac:0.38, type:"hairpin", brakeZone:true  },
  { id:"piratel",  label:"Pirat",  lapFrac:0.50, type:"medium",  brakeZone:true  },
  { id:"acque",    label:"Acque",  lapFrac:0.60, type:"chicane", brakeZone:true  },
  { id:"alta",     label:"Alta",   lapFrac:0.70, type:"chicane", brakeZone:true  },
  { id:"riv1",     label:"Riv1",   lapFrac:0.80, type:"medium",  brakeZone:true  },
  { id:"riv2",     label:"Riv2",   lapFrac:0.88, type:"medium",  brakeZone:true  },
];

// ── BARCELONA-CATALUNYA ────────────────────────────────────────────────────
// Distinctive: long T3 (Renault), tight T10 (Wurth), final La Caixa hairpin,
// new chicane at end before pit straight.
const BARCELONA: Vec2[] = [
  // S/F straight (top)
  { x: 0.30, y: 0.92 }, { x: 0.42, y: 0.92 }, { x: 0.56, y: 0.92 },
  { x: 0.70, y: 0.90 },
  // T1 (Elf - right) + T2 (Renault - sweeping right)
  { x: 0.78, y: 0.86 }, { x: 0.84, y: 0.80 }, { x: 0.86, y: 0.72 },
  // T3 (long right - signature corner)
  { x: 0.84, y: 0.64 }, { x: 0.80, y: 0.58 },
  // T4 (Repsol left) + T5 (Seat right)
  { x: 0.74, y: 0.54 }, { x: 0.66, y: 0.56 }, { x: 0.58, y: 0.52 },
  { x: 0.52, y: 0.48 },
  // Back straight to T7 (Wurth)
  { x: 0.46, y: 0.46 }, { x: 0.40, y: 0.48 }, { x: 0.36, y: 0.52 },
  { x: 0.40, y: 0.58 }, { x: 0.46, y: 0.60 },
  // T8 (Renault) - slow left
  { x: 0.40, y: 0.66 }, { x: 0.34, y: 0.66 },
  // T9 (Campsa) - right uphill
  { x: 0.28, y: 0.62 }, { x: 0.22, y: 0.58 }, { x: 0.18, y: 0.52 },
  // T10 (La Caixa) - hairpin left
  { x: 0.14, y: 0.46 }, { x: 0.14, y: 0.40 }, { x: 0.18, y: 0.36 },
  { x: 0.24, y: 0.38 },
  // T11 (Banc Sabadell) + T12 (Repsol)
  { x: 0.30, y: 0.34 }, { x: 0.34, y: 0.30 },
  // T13 (Final right) + new chicane
  { x: 0.40, y: 0.26 }, { x: 0.48, y: 0.24 }, { x: 0.56, y: 0.22 },
  { x: 0.62, y: 0.26 }, { x: 0.66, y: 0.32 }, { x: 0.62, y: 0.38 },
  // Run back to T1 / S/F
  { x: 0.54, y: 0.42 }, { x: 0.46, y: 0.48 }, { x: 0.40, y: 0.56 },
  { x: 0.34, y: 0.66 }, { x: 0.30, y: 0.78 }, { x: 0.30, y: 0.88 },
];

const BARCELONA_CORNERS: CornerAnnotation[] = [
  { id:"t1",   label:"T1",     lapFrac:0.10, type:"medium",  brakeZone:true  },
  { id:"t3",   label:"T3",     lapFrac:0.22, type:"fast",    brakeZone:false },
  { id:"t4",   label:"T4",     lapFrac:0.32, type:"medium",  brakeZone:true  },
  { id:"t5",   label:"T5",     lapFrac:0.40, type:"medium",  brakeZone:false },
  { id:"t7",   label:"Wurth",  lapFrac:0.48, type:"hairpin", brakeZone:true  },
  { id:"t9",   label:"Campsa", lapFrac:0.62, type:"medium",  brakeZone:false },
  { id:"t10",  label:"LaCaixa",lapFrac:0.72, type:"hairpin", brakeZone:true  },
  { id:"t13",  label:"NewCh",  lapFrac:0.88, type:"chicane", brakeZone:true  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUIT REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

const CIRCUITS: Record<string, CircuitGeometry> = {
  monza: {
    id:"monza", name:"Autodromo Nazionale Monza",
    country:"Italy", countryEmoji:"🇮🇹", lengthKm:5.793,
    centerline: normalisePoints(MONZA),
    corners: MONZA_CORNERS,
    sectorMarkers: [
      { sectorIdx:0, lapFrac:0.0  },
      { sectorIdx:1, lapFrac:0.42 },
      { sectorIdx:2, lapFrac:0.72 },
    ],
    trackWidthNorm: 0.024,
  },
  spa: {
    id:"spa", name:"Circuit de Spa-Francorchamps",
    country:"Belgium", countryEmoji:"🇧🇪", lengthKm:7.004,
    centerline: normalisePoints(SPA),
    corners: SPA_CORNERS,
    sectorMarkers: [
      { sectorIdx:0, lapFrac:0.0  },
      { sectorIdx:1, lapFrac:0.40 },
      { sectorIdx:2, lapFrac:0.78 },
    ],
    trackWidthNorm: 0.022,
  },
  silverstone: {
    id:"silverstone", name:"Silverstone Circuit",
    country:"United Kingdom", countryEmoji:"🇬🇧", lengthKm:5.891,
    centerline: normalisePoints(SILVERSTONE),
    corners: SILVERSTONE_CORNERS,
    sectorMarkers: [
      { sectorIdx:0, lapFrac:0.0  },
      { sectorIdx:1, lapFrac:0.40 },
      { sectorIdx:2, lapFrac:0.72 },
    ],
    trackWidthNorm: 0.023,
  },
  nurburgring: {
    id:"nurburgring", name:"Nürburgring GP-Strecke",
    country:"Germany", countryEmoji:"🇩🇪", lengthKm:5.148,
    centerline: normalisePoints(NURBURGRING),
    corners: NURBURGRING_CORNERS,
    sectorMarkers: [
      { sectorIdx:0, lapFrac:0.0  },
      { sectorIdx:1, lapFrac:0.42 },
      { sectorIdx:2, lapFrac:0.74 },
    ],
    trackWidthNorm: 0.022,
  },
  suzuka: {
    id:"suzuka", name:"Suzuka International Racing Course",
    country:"Japan", countryEmoji:"🇯🇵", lengthKm:5.807,
    centerline: normalisePoints(SUZUKA),
    corners: SUZUKA_CORNERS,
    sectorMarkers: [
      { sectorIdx:0, lapFrac:0.0  },
      { sectorIdx:1, lapFrac:0.42 },
      { sectorIdx:2, lapFrac:0.76 },
    ],
    trackWidthNorm: 0.022,
  },
  imola: {
    id:"imola", name:"Autodromo Enzo e Dino Ferrari",
    country:"Italy", countryEmoji:"🇮🇹", lengthKm:4.909,
    centerline: normalisePoints(IMOLA),
    corners: IMOLA_CORNERS,
    sectorMarkers: [
      { sectorIdx:0, lapFrac:0.0  },
      { sectorIdx:1, lapFrac:0.38 },
      { sectorIdx:2, lapFrac:0.74 },
    ],
    trackWidthNorm: 0.021,
  },
  barcelona: {
    id:"barcelona", name:"Circuit de Barcelona-Catalunya",
    country:"Spain", countryEmoji:"🇪🇸", lengthKm:4.675,
    centerline: normalisePoints(BARCELONA),
    corners: BARCELONA_CORNERS,
    sectorMarkers: [
      { sectorIdx:0, lapFrac:0.0  },
      { sectorIdx:1, lapFrac:0.40 },
      { sectorIdx:2, lapFrac:0.74 },
    ],
    trackWidthNorm: 0.023,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/** Smoothed centerline ready for SVG rendering. */
export function getSmoothedLine(id: string, resolution = 16): Vec2[] | null {
  const c = CIRCUITS[id];
  if (!c) return null;
  return smooth(c.centerline, resolution, true);
}

/** Full circuit definition including corners + sectors. */
export function getCircuit(id: string): CircuitGeometry | null {
  return CIRCUITS[id] ?? null;
}

/** All available circuit IDs. */
export function listCircuits(): string[] {
  return Object.keys(CIRCUITS);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL HELPERS — used by TrackRenderer, TrackAnimation, etc.
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve a track source (id string or Vec2[] centreline) to a point array. */
function resolveLine(src: string | Vec2[] | null | undefined, resolution = 16): Vec2[] {
  if (!src) return [];
  if (typeof src === "string") return getSmoothedLine(src, resolution) ?? [];
  return src;
}

/**
 * Get position on track at given lap fraction (0-1).
 * Accepts either a track ID string or a Vec2[] centreline directly.
 */
export function getPointAtFrac(src: string | Vec2[] | null | undefined, frac: number, resolution = 16): Vec2 | null {
  const line = resolveLine(src, resolution);
  if (!line.length) return null;
  const f = ((frac % 1) + 1) % 1;   // wrap to [0,1)
  const idx = Math.min(Math.round(f * line.length), line.length - 1);
  return line[idx];
}

/**
 * Get heading (direction of travel) in degrees at given lap fraction.
 * Accepts either a track ID string or a Vec2[] centreline directly.
 * 0° = east, 90° = north (matches render y-flip).
 */
export function getHeadingAtFrac(src: string | Vec2[] | null | undefined, frac: number, resolution = 16): number {
  const line = resolveLine(src, resolution);
  if (line.length < 2) return 0;
  const n = line.length;
  const f = ((frac % 1) + 1) % 1;
  const idx = Math.min(Math.round(f * n), n - 1);
  const nxt = line[(idx + 1) % n];
  const cur = line[idx];
  return Math.atan2(-(nxt.y - cur.y), nxt.x - cur.x) * 180 / Math.PI;
}
