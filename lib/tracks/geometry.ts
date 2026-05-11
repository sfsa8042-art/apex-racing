/**
 * lib/tracks/geometry.ts — High-fidelity circuit geometry v2
 * 
 * Each circuit uses real-world coordinate references scaled to a
 * consistent [0.05–0.95] working area. The ASPECT RATIO of each
 * track is preserved — Monza is narrow+long, Spa is wide+tall, etc.
 * 
 * Key fix: normalisePoints now uses SEPARATE x/y scales so layouts
 * fill the viewport, but aspect can be tuned per-circuit via aspectHint.
 */

export interface Vec2 { x: number; y: number }
export interface CornerAnnotation {
  id: string; label: string; lapFrac: number;
  type: "hairpin"|"chicane"|"fast"|"medium"|"slow"; brakeZone: boolean
}
export interface SectorMarker { sectorIdx: number; lapFrac: number }
export interface CircuitGeometry {
  id: string; name: string; country: string; countryEmoji: string; lengthKm: number;
  controlPoints: Vec2[]; trackWidthNorm: number;
  corners: CornerAnnotation[]; sectorMarkers: SectorMarker[];
}

// ─── Spline math ──────────────────────────────────────────────────────────────
function catmullRom(p0:Vec2,p1:Vec2,p2:Vec2,p3:Vec2,t:number):Vec2 {
  const t2=t*t,t3=t2*t
  return {
    x:0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
    y:0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3)
  }
}

export function smoothPoints(ctrl:Vec2[],resolution=16,closed=true):Vec2[] {
  const n=ctrl.length,pts:Vec2[]=[]
  for(let i=0;i<n;i++){
    const p0=ctrl[(i-1+n)%n],p1=ctrl[i],p2=ctrl[(i+1)%n],p3=ctrl[(i+2)%n]
    for(let j=0;j<resolution;j++) pts.push(catmullRom(p0,p1,p2,p3,j/resolution))
  }
  if(!closed) pts.push(ctrl[n-1])
  return pts
}

/**
 * Normalise with two modes:
 *  fill=false (default): preserve aspect ratio relative to viewport — used for full-size view
 *  fill=true: independent X/Y scaling — fills the full preview box, used for compact cards
 */
export function normalisePoints(pts:Vec2[],margin=0.07,fill=false):Vec2[] {
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y)
  const minX=Math.min(...xs),maxX=Math.max(...xs)
  const minY=Math.min(...ys),maxY=Math.max(...ys)
  const rX=maxX-minX||1, rY=maxY-minY||1
  const avail=1-margin*2
  if (fill) {
    // Independent X/Y — fills the box, shows shape not proportion
    return pts.map(p=>({
      x:margin+(p.x-minX)/rX*avail,
      y:margin+(p.y-minY)/rY*avail,
    }))
  }
  // Aspect-preserving relative to SVG viewport (900×540)
  const VP_ASPECT=(900-88)/(540-88)
  const ratio=(rX/rY)/VP_ASPECT
  const sX=ratio>1?avail:avail*ratio
  const sY=ratio>1?avail/ratio:avail
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2
  return pts.map(p=>({x:0.5+(p.x-cx)/rX*sX,y:0.5+(p.y-cy)/rY*sY}))
}

export function getSmoothedLine(id:string,resolution=16,fill=false):Vec2[]|null {
  const c=CIRCUITS[id]; if(!c) return null
  return normalisePoints(smoothPoints(c.controlPoints,resolution,true),0.07,fill)
}
export function getCircuit(id:string):CircuitGeometry|null { return CIRCUITS[id]??null }
export function getPointAtFrac(pts:Vec2[],frac:number):Vec2 {
  const n=pts.length,f=((frac%1)+1)%1
  const idx=Math.min(n-2,Math.floor(f*n)),t=f*n-idx
  return {x:pts[idx].x+(pts[(idx+1)%n].x-pts[idx].x)*t,y:pts[idx].y+(pts[(idx+1)%n].y-pts[idx].y)*t}
}
export function getHeadingAtFrac(pts:Vec2[],frac:number):number {
  const n=pts.length,f=((frac%1)+1)%1
  const i=Math.floor(f*n)%n,j=(i+1)%n
  return Math.atan2(pts[j].y-pts[i].y,pts[j].x-pts[i].x)
}

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT CONTROL POINTS
// Coordinates are in "real" proportional space — each track preserves its
// distinctive silhouette. The normalisePoints() call maps them to screen space.
// Y-axis: 0=top 1=bottom (SVG convention used by renderer)
// ═══════════════════════════════════════════════════════════════════════════════

// ── MONZA ─────────────────────────────────────────────────────────────────────
// Shape: very elongated narrow loop — almost rectangular
// Distinctive: long main straight + Parabolica sweeper bottom-right
// Aspect ratio: ~3:1 wide:tall
const MONZA:Vec2[]=[
  // S/F line → T1 chicane (top-left)
  {x:1.0,y:0.18},{x:1.8,y:0.18},{x:2.6,y:0.18},{x:3.2,y:0.18},
  // T1 Variante del Rettifilo (sharp right-left)
  {x:3.6,y:0.20},{x:3.75,y:0.30},{x:3.65,y:0.40},{x:3.50,y:0.44},
  {x:3.35,y:0.40},{x:3.28,y:0.30},{x:3.35,y:0.22},
  // Curva Grande — long sweeping right arc (top of track)
  {x:3.55,y:0.28},{x:3.72,y:0.36},{x:3.80,y:0.48},{x:3.78,y:0.62},
  {x:3.68,y:0.72},{x:3.52,y:0.80},
  // T2 Variante della Roggia (second chicane)
  {x:3.40,y:0.82},{x:3.28,y:0.90},{x:3.14,y:0.88},{x:3.08,y:0.78},
  {x:3.14,y:0.70},{x:3.28,y:0.68},
  // Lesmo 1
  {x:2.90,y:0.72},{x:2.72,y:0.82},{x:2.56,y:0.86},{x:2.40,y:0.82},
  {x:2.30,y:0.72},{x:2.34,y:0.60},
  // Lesmo 2
  {x:2.20,y:0.64},{x:2.06,y:0.74},{x:1.90,y:0.78},{x:1.74,y:0.74},
  {x:1.64,y:0.62},{x:1.68,y:0.50},
  // Variante Ascari (chicane mid-left)
  {x:1.56,y:0.54},{x:1.42,y:0.64},{x:1.26,y:0.66},{x:1.10,y:0.60},
  {x:1.00,y:0.50},{x:1.04,y:0.38},{x:1.14,y:0.30},
  // Long back straight heading to Parabolica
  {x:0.70,y:0.30},{x:0.36,y:0.32},
  // Curva Parabolica — large right-hand sweeper (bottom-left)
  {x:0.18,y:0.36},{x:0.10,y:0.46},{x:0.10,y:0.60},{x:0.18,y:0.72},
  {x:0.34,y:0.82},{x:0.54,y:0.88},{x:0.76,y:0.90},{x:0.98,y:0.88},
  // Run back to main straight
  {x:0.98,y:0.68},{x:0.98,y:0.44},{x:0.99,y:0.26},{x:1.00,y:0.18},
]

// ── SPA-FRANCORCHAMPS ─────────────────────────────────────────────────────────
// Shape: deeply irregular — famous for dramatic elevation. Wide track.
// Distinctive: La Source hairpin top-right, Eau Rouge valley bottom-left
// Aspect: ~4:3, almost square-ish but very asymmetric
const SPA:Vec2[]=[
  // S/F straight (top-right)
  {x:1.70,y:0.10},{x:2.20,y:0.12},{x:2.65,y:0.14},{x:3.00,y:0.18},
  // La Source hairpin (tight right, top)
  {x:3.20,y:0.24},{x:3.30,y:0.36},{x:3.22,y:0.48},{x:3.08,y:0.54},
  {x:2.90,y:0.50},{x:2.80,y:0.38},{x:2.86,y:0.26},
  // Down to Eau Rouge (steep descent, flowing right-left)
  {x:2.72,y:0.32},{x:2.58,y:0.40},{x:2.44,y:0.52},
  // Eau Rouge / Raidillon (bottom of valley, left then climb right)
  {x:2.32,y:0.60},{x:2.20,y:0.68},{x:2.10,y:0.76},
  // Kemmel straight (climbing back up — bottom-left diagonal)
  {x:1.90,y:0.82},{x:1.64,y:0.88},{x:1.34,y:0.94},{x:1.00,y:0.96},
  // Les Combes (sharp right-left at top of Kemmel)
  {x:0.74,y:0.92},{x:0.56,y:0.86},{x:0.48,y:0.74},{x:0.52,y:0.62},
  {x:0.64,y:0.56},{x:0.78,y:0.58},
  // Malmedy → Rivage (medium corners, upper-middle-left)
  {x:0.82,y:0.70},{x:0.74,y:0.80},{x:0.62,y:0.86},
  // Pouhon (double-apex fast left, left side)
  {x:0.44,y:0.78},{x:0.30,y:0.68},{x:0.22,y:0.56},{x:0.26,y:0.44},
  {x:0.38,y:0.38},{x:0.54,y:0.40},
  // Fagnes chicane + Stavelot (bottom-left → middle)
  {x:0.60,y:0.50},{x:0.68,y:0.42},{x:0.80,y:0.36},{x:0.94,y:0.32},
  {x:1.10,y:0.30},{x:1.26,y:0.26},
  // Bus Stop chicane (right side, before last straight)
  {x:1.46,y:0.22},{x:1.62,y:0.18},{x:1.72,y:0.22},{x:1.76,y:0.32},
  {x:1.70,y:0.42},{x:1.60,y:0.48},{x:1.48,y:0.44},{x:1.44,y:0.32},
  // Return to S/F
  {x:1.52,y:0.20},{x:1.62,y:0.12},{x:1.70,y:0.10},
]

// ── SILVERSTONE ───────────────────────────────────────────────────────────────
// Shape: roughly triangular/kite — very flat circuit
// Distinctive: Maggotts/Becketts S-complex at top, Stowe bottom-right, Luffield bottom-left
// Aspect: ~5:3 wide, flat
const SILVERSTONE:Vec2[]=[
  // S/F → Wellington straight (left-to-right at top)
  {x:0.30,y:0.34},{x:0.60,y:0.34},{x:0.90,y:0.34},{x:1.20,y:0.34},{x:1.50,y:0.34},
  // Copse (fast right, top-right)
  {x:1.72,y:0.36},{x:1.84,y:0.44},{x:1.82,y:0.56},{x:1.72,y:0.64},
  {x:1.58,y:0.66},{x:1.46,y:0.58},{x:1.44,y:0.46},
  // Maggotts — high speed left
  {x:1.48,y:0.36},{x:1.60,y:0.26},{x:1.74,y:0.20},{x:1.86,y:0.14},
  // Becketts S-curves (tight esses, upper-right)
  {x:1.96,y:0.20},{x:2.00,y:0.30},{x:1.94,y:0.40},{x:1.84,y:0.46},
  {x:1.72,y:0.44},{x:1.64,y:0.36},{x:1.68,y:0.24},
  // Chapel (fast right exit of Becketts)
  {x:1.80,y:0.18},{x:1.94,y:0.14},{x:2.06,y:0.18},{x:2.14,y:0.28},
  // Hangar straight (right side, going down)
  {x:2.18,y:0.44},{x:2.20,y:0.62},{x:2.20,y:0.80},
  // Stowe (medium right, bottom-right)
  {x:2.16,y:0.94},{x:2.04,y:1.02},{x:1.88,y:1.04},{x:1.72,y:1.00},
  {x:1.60,y:0.90},{x:1.60,y:0.76},
  // Vale (left kink)
  {x:1.52,y:0.84},{x:1.40,y:0.94},{x:1.24,y:0.98},{x:1.08,y:0.94},
  // Club corner (medium right, bottom)
  {x:0.94,y:0.86},{x:0.82,y:0.76},{x:0.72,y:0.66},{x:0.66,y:0.54},
  // Abbey (fast right, bottom-left area)
  {x:0.62,y:0.42},{x:0.54,y:0.34},{x:0.44,y:0.28},{x:0.34,y:0.26},
  // Farm/Loop → Aintree
  {x:0.22,y:0.30},{x:0.14,y:0.38},{x:0.10,y:0.50},{x:0.14,y:0.62},
  // Luffield (hairpin-ish left, bottom-left)
  {x:0.22,y:0.72},{x:0.34,y:0.78},{x:0.48,y:0.76},{x:0.58,y:0.66},
  {x:0.58,y:0.52},{x:0.48,y:0.44},{x:0.36,y:0.40},{x:0.28,y:0.36},
]

// ── NÜRBURGRING GP ────────────────────────────────────────────────────────────
// Shape: compact modern circuit — almost square, tight infield
// Distinctive: tight hairpin (Dunlop), Mercedes Arena complex bottom
// Aspect: roughly 1:1 square
const NURBURGRING:Vec2[]=[
  // S/F → T1 (top straight, left to right)
  {x:0.40,y:0.14},{x:0.70,y:0.14},{x:0.98,y:0.14},
  // T1 Einfahrt (medium right)
  {x:1.12,y:0.18},{x:1.18,y:0.28},{x:1.14,y:0.38},{x:1.04,y:0.42},
  {x:0.92,y:0.38},{x:0.86,y:0.28},{x:0.92,y:0.18},
  // Ford Kurve (sweeping right)
  {x:1.08,y:0.24},{x:1.22,y:0.32},{x:1.30,y:0.44},{x:1.30,y:0.58},
  {x:1.22,y:0.68},{x:1.10,y:0.74},
  // Dunlop Kehre (hairpin left — sharp, distinctive)
  {x:1.02,y:0.80},{x:0.90,y:0.86},{x:0.76,y:0.88},{x:0.62,y:0.84},
  {x:0.52,y:0.74},{x:0.52,y:0.62},{x:0.60,y:0.54},{x:0.72,y:0.50},
  // NGK Schikane (chicane, upper-left infield)
  {x:0.84,y:0.52},{x:0.92,y:0.44},{x:0.86,y:0.36},{x:0.74,y:0.34},
  {x:0.62,y:0.40},{x:0.56,y:0.50},
  // Veedol-S + infield complex (left)
  {x:0.44,y:0.56},{x:0.30,y:0.62},{x:0.18,y:0.68},{x:0.10,y:0.78},
  {x:0.12,y:0.90},{x:0.24,y:0.98},
  // Mercedes Arena (complex bottom, sharp sequence)
  {x:0.36,y:1.00},{x:0.50,y:0.96},{x:0.60,y:0.86},{x:0.56,y:0.76},
  {x:0.44,y:0.72},{x:0.32,y:0.76},{x:0.24,y:0.86},{x:0.28,y:0.96},
  // Post-Arena → Bit-Kurve (left-right esses)
  {x:0.40,y:1.00},{x:0.54,y:1.00},{x:0.66,y:0.96},{x:0.70,y:0.86},
  {x:0.64,y:0.76},{x:0.52,y:0.72},
  // Advan Kurve (medium right) → back to S/F
  {x:0.44,y:0.68},{x:0.36,y:0.56},{x:0.30,y:0.44},{x:0.28,y:0.32},
  {x:0.30,y:0.20},{x:0.38,y:0.14},
]

// ── SUZUKA ────────────────────────────────────────────────────────────────────
// Shape: FIGURE-OF-EIGHT with overpass — completely unique
// Distinctive: underpass at cross-over, S-curves top-left, tight hairpin bottom-right
// Aspect: ~1:1 but figure-8 makes it visually unmistakable
const SUZUKA:Vec2[]=[
  // S/F (upper-right, going clockwise on top loop)
  {x:1.20,y:0.20},{x:1.46,y:0.20},{x:1.70,y:0.22},
  // T1 (fast right entry)
  {x:1.86,y:0.28},{x:1.94,y:0.40},{x:1.88,y:0.52},{x:1.74,y:0.58},
  {x:1.58,y:0.54},{x:1.50,y:0.42},{x:1.56,y:0.30},
  // S-curves esses (tight right-left-right)
  {x:1.66,y:0.28},{x:1.78,y:0.22},{x:1.88,y:0.28},{x:1.86,y:0.40},
  {x:1.74,y:0.46},{x:1.60,y:0.42},{x:1.52,y:0.30},{x:1.56,y:0.18},
  // Degner 1 & 2 (medium-speed)
  {x:1.68,y:0.14},{x:1.82,y:0.18},{x:1.90,y:0.28},{x:1.86,y:0.40},
  {x:1.76,y:0.50},{x:1.62,y:0.56},{x:1.46,y:0.58},{x:1.30,y:0.54},
  // Hairpin (tight left, bottom-right of figure-8)
  {x:1.18,y:0.60},{x:1.06,y:0.70},{x:0.96,y:0.82},{x:0.88,y:0.94},
  {x:0.80,y:1.00},{x:0.68,y:0.98},{x:0.60,y:0.88},{x:0.62,y:0.76},
  {x:0.72,y:0.68},{x:0.86,y:0.64},
  // Cross-over underpass (going from bottom-right to bottom-left)
  {x:1.00,y:0.58},{x:1.10,y:0.50},{x:1.16,y:0.40},
  // Spoon curve (double apex left, bottom-left)
  {x:1.10,y:0.30},{x:0.96,y:0.22},{x:0.80,y:0.18},{x:0.64,y:0.22},
  {x:0.52,y:0.32},{x:0.48,y:0.44},{x:0.54,y:0.56},{x:0.66,y:0.62},
  {x:0.80,y:0.62},
  // Back straight (long, diagonal top-right)
  {x:0.86,y:0.54},{x:0.90,y:0.42},{x:0.92,y:0.30},
  // 130R (very fast left, top)
  {x:0.90,y:0.18},{x:0.84,y:0.10},{x:0.74,y:0.06},{x:0.62,y:0.08},
  {x:0.52,y:0.14},{x:0.46,y:0.24},{x:0.50,y:0.34},{x:0.60,y:0.40},
  // Casio chicane (right-left before S/F)
  {x:0.72,y:0.42},{x:0.84,y:0.38},{x:0.94,y:0.30},{x:1.00,y:0.20},
  {x:1.08,y:0.14},{x:1.18,y:0.12},{x:1.24,y:0.18},{x:1.22,y:0.28},
  {x:1.16,y:0.34},{x:1.18,y:0.22},
]

// ── IMOLA ─────────────────────────────────────────────────────────────────────
// Shape: elongated loop with deep hairpin cutting bottom
// Distinctive: narrow, Tosa hairpin drops far below main layout
// Aspect: ~2:1 wide:tall, very distinctive bottom hairpin
const IMOLA:Vec2[]=[
  // S/F → Tamburello (top straight, mostly flat)
  {x:0.80,y:0.14},{x:1.10,y:0.14},{x:1.40,y:0.14},{x:1.70,y:0.14},
  // Tamburello chicane (formerly high-speed, now tight)
  {x:1.86,y:0.18},{x:1.96,y:0.28},{x:1.94,y:0.40},{x:1.84,y:0.48},
  {x:1.70,y:0.50},{x:1.58,y:0.44},{x:1.54,y:0.32},{x:1.62,y:0.22},
  // Villeneuve chicane (tight right-left)
  {x:1.78,y:0.24},{x:1.90,y:0.30},{x:1.96,y:0.40},{x:1.90,y:0.50},
  {x:1.76,y:0.54},{x:1.62,y:0.48},{x:1.58,y:0.36},
  // Tosa hairpin (VERY tight left, drops down sharply)
  {x:1.48,y:0.42},{x:1.34,y:0.52},{x:1.16,y:0.64},{x:0.96,y:0.76},
  {x:0.76,y:0.86},{x:0.56,y:0.94},{x:0.38,y:0.96},{x:0.22,y:0.90},
  {x:0.12,y:0.78},{x:0.14,y:0.64},{x:0.24,y:0.54},{x:0.38,y:0.48},
  {x:0.52,y:0.46},
  // Piratella (medium left, climbing back up)
  {x:0.50,y:0.54},{x:0.40,y:0.64},{x:0.28,y:0.72},{x:0.20,y:0.82},
  {x:0.16,y:0.92},{x:0.20,y:1.00},{x:0.30,y:1.04},
  // Acque Minerali (downhill esses)
  {x:0.44,y:1.02},{x:0.58,y:0.94},{x:0.72,y:0.88},{x:0.86,y:0.86},
  {x:0.98,y:0.90},{x:1.04,y:0.98},{x:0.98,y:1.06},{x:0.86,y:1.08},
  // Variante Alta chicane
  {x:0.74,y:1.04},{x:0.62,y:0.96},{x:0.56,y:0.86},{x:0.60,y:0.76},
  {x:0.70,y:0.70},{x:0.82,y:0.70},
  // Rivazza 1 & 2 (double hairpin)
  {x:0.92,y:0.64},{x:1.00,y:0.54},{x:1.02,y:0.44},{x:0.96,y:0.34},
  {x:0.84,y:0.28},{x:0.72,y:0.26},{x:0.64,y:0.28},{x:0.62,y:0.38},
  {x:0.68,y:0.46},{x:0.78,y:0.46},
  // Return main straight
  {x:0.80,y:0.36},{x:0.80,y:0.24},{x:0.80,y:0.14},
]

// ── BARCELONA ─────────────────────────────────────────────────────────────────
// Shape: distinctly square/rounded — almost circular outer boundary
// Distinctive: tight T1, high-speed esses top, long back straight right, hairpin bottom
// Aspect: ~1.1:1, nearly square
const BARCELONA:Vec2[]=[
  // S/F → T1 (long main straight, bottom going right)
  {x:0.40,y:0.90},{x:0.70,y:0.90},{x:1.00,y:0.90},{x:1.30,y:0.90},{x:1.58,y:0.90},
  // T1 (heavy braking, tight right turn — goes from bottom-right UP)
  {x:1.72,y:0.86},{x:1.80,y:0.76},{x:1.78,y:0.64},{x:1.68,y:0.56},
  {x:1.52,y:0.52},{x:1.38,y:0.56},{x:1.30,y:0.66},{x:1.34,y:0.78},
  // Esses T3-T5 (high speed complex, upper-right)
  {x:1.44,y:0.68},{x:1.56,y:0.60},{x:1.68,y:0.56},{x:1.78,y:0.46},
  {x:1.76,y:0.36},{x:1.66,y:0.28},{x:1.52,y:0.26},{x:1.38,y:0.32},
  {x:1.30,y:0.42},{x:1.34,y:0.54},
  // Repsol corner (medium right, top-right area)
  {x:1.46,y:0.50},{x:1.60,y:0.44},{x:1.70,y:0.34},{x:1.68,y:0.22},
  {x:1.58,y:0.14},{x:1.44,y:0.10},{x:1.30,y:0.12},{x:1.18,y:0.20},
  {x:1.12,y:0.32},{x:1.16,y:0.44},
  // La Caixa → running across top
  {x:1.08,y:0.38},{x:0.94,y:0.28},{x:0.78,y:0.20},{x:0.62,y:0.16},
  {x:0.46,y:0.16},{x:0.30,y:0.20},
  // Banc Sabadell hairpin (sharp left, top-left)
  {x:0.16,y:0.28},{x:0.08,y:0.40},{x:0.08,y:0.54},{x:0.16,y:0.66},
  {x:0.28,y:0.72},{x:0.44,y:0.72},{x:0.56,y:0.64},{x:0.58,y:0.52},
  {x:0.50,y:0.42},{x:0.36,y:0.38},{x:0.24,y:0.44},
  // Europa-Lloses (left side, going down)
  {x:0.16,y:0.52},{x:0.10,y:0.64},{x:0.14,y:0.76},{x:0.26,y:0.82},
  {x:0.40,y:0.82},{x:0.52,y:0.76},{x:0.54,y:0.64},{x:0.46,y:0.54},
  // Campsa (fast right, bottom-left)
  {x:0.36,y:0.56},{x:0.26,y:0.62},{x:0.22,y:0.74},{x:0.28,y:0.84},
  {x:0.38,y:0.90},{x:0.40,y:0.90},
]

// ─── CIRCUITS map ─────────────────────────────────────────────────────────────
export const CIRCUITS: Record<string, CircuitGeometry> = {
  monza: {
    id:"monza",name:"Autodromo Nazionale Monza",country:"Italy",countryEmoji:"🇮🇹",lengthKm:5.793,
    controlPoints:MONZA,trackWidthNorm:0.022,
    corners:[
      {id:"t1",  label:"T1",        lapFrac:0.082,type:"chicane",brakeZone:true},
      {id:"cg",  label:"Curva G",   lapFrac:0.185,type:"fast",   brakeZone:false},
      {id:"t2",  label:"T2",        lapFrac:0.270,type:"chicane",brakeZone:true},
      {id:"l1",  label:"Lesmo 1",   lapFrac:0.390,type:"medium", brakeZone:true},
      {id:"l2",  label:"Lesmo 2",   lapFrac:0.458,type:"medium", brakeZone:true},
      {id:"asc", label:"Ascari",    lapFrac:0.560,type:"chicane",brakeZone:true},
      {id:"par", label:"Parabolica",lapFrac:0.785,type:"slow",   brakeZone:true},
    ],
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.33},{sectorIdx:2,lapFrac:0.67}],
  },
  spa: {
    id:"spa",name:"Circuit de Spa-Francorchamps",country:"Belgium",countryEmoji:"🇧🇪",lengthKm:7.004,
    controlPoints:SPA,trackWidthNorm:0.019,
    corners:[
      {id:"src", label:"La Source",  lapFrac:0.058,type:"hairpin",brakeZone:true},
      {id:"eau", label:"Eau Rouge",  lapFrac:0.152,type:"fast",   brakeZone:false},
      {id:"les", label:"Les Combes", lapFrac:0.300,type:"chicane",brakeZone:true},
      {id:"pou", label:"Pouhon",     lapFrac:0.470,type:"fast",   brakeZone:false},
      {id:"bus", label:"Bus Stop",   lapFrac:0.720,type:"chicane",brakeZone:true},
    ],
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.34},{sectorIdx:2,lapFrac:0.70}],
  },
  silverstone: {
    id:"silverstone",name:"Silverstone Circuit",country:"United Kingdom",countryEmoji:"🇬🇧",lengthKm:5.891,
    controlPoints:SILVERSTONE,trackWidthNorm:0.021,
    corners:[
      {id:"cop", label:"Copse",    lapFrac:0.085,type:"fast",   brakeZone:false},
      {id:"mag", label:"Maggotts", lapFrac:0.165,type:"fast",   brakeZone:false},
      {id:"bec", label:"Becketts", lapFrac:0.200,type:"fast",   brakeZone:false},
      {id:"sto", label:"Stowe",    lapFrac:0.360,type:"medium", brakeZone:true},
      {id:"lub", label:"Luffield", lapFrac:0.700,type:"hairpin",brakeZone:true},
    ],
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.36},{sectorIdx:2,lapFrac:0.68}],
  },
  nurburgring: {
    id:"nurburgring",name:"Nürburgring GP-Strecke",country:"Germany",countryEmoji:"🇩🇪",lengthKm:5.148,
    controlPoints:NURBURGRING,trackWidthNorm:0.022,
    corners:[
      {id:"t1",  label:"T1",      lapFrac:0.055,type:"medium", brakeZone:true},
      {id:"for", label:"Ford",    lapFrac:0.160,type:"fast",   brakeZone:false},
      {id:"dun", label:"Dunlop",  lapFrac:0.240,type:"hairpin",brakeZone:true},
      {id:"mer", label:"M-Arena", lapFrac:0.520,type:"chicane",brakeZone:true},
      {id:"adv", label:"Advan",   lapFrac:0.760,type:"medium", brakeZone:true},
    ],
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.38},{sectorIdx:2,lapFrac:0.72}],
  },
  suzuka: {
    id:"suzuka",name:"Suzuka International Racing Course",country:"Japan",countryEmoji:"🇯🇵",lengthKm:5.807,
    controlPoints:SUZUKA,trackWidthNorm:0.020,
    corners:[
      {id:"t1",  label:"T1/T2",   lapFrac:0.060,type:"fast",   brakeZone:false},
      {id:"ess", label:"S-Curves",lapFrac:0.155,type:"fast",   brakeZone:false},
      {id:"deg", label:"Degner",  lapFrac:0.280,type:"medium", brakeZone:true},
      {id:"hp",  label:"Hairpin", lapFrac:0.370,type:"hairpin",brakeZone:true},
      {id:"spo", label:"Spoon",   lapFrac:0.540,type:"medium", brakeZone:true},
      {id:"r130",label:"130R",    lapFrac:0.700,type:"fast",   brakeZone:false},
      {id:"cas", label:"Casio",   lapFrac:0.790,type:"chicane",brakeZone:true},
    ],
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.32},{sectorIdx:2,lapFrac:0.68}],
  },
  imola: {
    id:"imola",name:"Autodromo Enzo e Dino Ferrari",country:"Italy",countryEmoji:"🇮🇹",lengthKm:4.909,
    controlPoints:IMOLA,trackWidthNorm:0.021,
    corners:[
      {id:"tam", label:"Tamburello",lapFrac:0.082,type:"chicane",brakeZone:true},
      {id:"vil", label:"Villeneuve",lapFrac:0.172,type:"chicane",brakeZone:true},
      {id:"tos", label:"Tosa",      lapFrac:0.290,type:"hairpin",brakeZone:true},
      {id:"pir", label:"Piratella", lapFrac:0.420,type:"medium", brakeZone:true},
      {id:"acq", label:"Acque M.",  lapFrac:0.545,type:"medium", brakeZone:false},
      {id:"riv", label:"Rivazza",   lapFrac:0.758,type:"medium", brakeZone:true},
    ],
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.34},{sectorIdx:2,lapFrac:0.68}],
  },
  barcelona: {
    id:"barcelona",name:"Circuit de Barcelona-Catalunya",country:"Spain",countryEmoji:"🇪🇸",lengthKm:4.675,
    controlPoints:BARCELONA,trackWidthNorm:0.022,
    corners:[
      {id:"t1",  label:"T1",      lapFrac:0.075,type:"medium", brakeZone:true},
      {id:"ess", label:"Esses",   lapFrac:0.168,type:"fast",   brakeZone:false},
      {id:"rep", label:"Repsol",  lapFrac:0.250,type:"fast",   brakeZone:false},
      {id:"lca", label:"La Caixa",lapFrac:0.368,type:"medium", brakeZone:true},
      {id:"ban", label:"Banc S.", lapFrac:0.490,type:"hairpin",brakeZone:true},
      {id:"cam", label:"Campsa",  lapFrac:0.765,type:"medium", brakeZone:true},
    ],
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.36},{sectorIdx:2,lapFrac:0.70}],
  },
}
