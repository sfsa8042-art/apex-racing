/**
 * lib/tracks/geometry.ts
 *
 * High-detail track silhouettes, hand-traced from the real circuit layouts
 * (official F1 maps used as proportion reference). Clean smooth curves with
 * accurate topology — including Suzuka's signature figure-8 crossover.
 */

export interface Vec2 { x: number; y: number }
export interface CornerAnnotation {
  id: string; label: string; lapFrac: number;
  type: "hairpin" | "chicane" | "slow" | "medium" | "fast"; brakeZone: boolean;
}
export interface SectorMarker { sectorIdx: number; lapFrac: number; }
export interface CircuitGeometry {
  id: string; name: string; country: string; countryEmoji: string;
  lengthKm: number; centerline: Vec2[];
  corners: CornerAnnotation[]; sectorMarkers: SectorMarker[]; trackWidthNorm: number;
}

function normalisePoints(pts: Vec2[]): Vec2[] {
  if (!pts.length) return pts;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const scale = 1 / Math.max(rangeX, rangeY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return pts.map(p => ({ x: (p.x - cx) * scale + 0.5, y: (p.y - cy) * scale + 0.5 }));
}
function smooth(pts: Vec2[], samples = 16, closed = false): Vec2[] {
  if (pts.length < 3) return pts;
  const out: Vec2[] = []; const n = pts.length;
  const lastI = closed ? n : n - 1;
  for (let i = 0; i < lastI; i++) {
    const p0 = pts[(i-1+n)%n], p1 = pts[i], p2 = pts[(i+1)%n], p3 = pts[(i+2)%n];
    for (let s = 0; s < samples; s++) {
      const t = s/samples, t2 = t*t, t3 = t2*t;
      out.push({
        x: 0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y: 0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
      });
    }
  }
  return out;
}

const MONZA: Vec2[] = [
  { x:0.4397, y:0.1136 },{ x:0.5466, y:0.1078 },{ x:0.6687, y:0.1056 },{ x:0.7847, y:0.1087 },
  { x:0.8824, y:0.1194 },{ x:0.9542, y:0.1414 },{ x:0.9893, y:0.175 },{ x:0.9802, y:0.2085 },
  { x:0.945, y:0.2333 },{ x:0.9176, y:0.2614 },{ x:0.9206, y:0.306 },{ x:0.9496, y:0.3695 },
  { x:0.9817, y:0.4519 },{ x:1.0, y:0.5466 },{ x:1.0, y:0.6412 },{ x:0.9817, y:0.7237 },
  { x:0.9481, y:0.7847 },{ x:0.9053, y:0.8168 },{ x:0.8656, y:0.8137 },{ x:0.8489, y:0.7847 },
  { x:0.8427, y:0.7542 },{ x:0.8122, y:0.7429 },{ x:0.7618, y:0.7447 },{ x:0.7176, y:0.7325 },
  { x:0.6947, y:0.6992 },{ x:0.6809, y:0.666 },{ x:0.6489, y:0.6528 },{ x:0.6046, y:0.6629 },
  { x:0.5695, y:0.6907 },{ x:0.542, y:0.7328 },{ x:0.5084, y:0.7832 },{ x:0.4641, y:0.8321 },
  { x:0.4122, y:0.8724 },{ x:0.3573, y:0.8934 },{ x:0.3105, y:0.8837 },{ x:0.2898, y:0.8498 },
  { x:0.2821, y:0.814 },{ x:0.2537, y:0.7966 },{ x:0.2125, y:0.8073 },{ x:0.1792, y:0.8391 },
  { x:0.145, y:0.8739 },{ x:0.1008, y:0.8944 },{ x:0.055, y:0.8846 },{ x:0.0205, y:0.8412 },
  { x:0.0027, y:0.7771 },{ x:0.0, y:0.7053 },{ x:0.0104, y:0.6305 },{ x:0.0342, y:0.5527 },
  { x:0.0699, y:0.4718 },{ x:0.1139, y:0.3893 },{ x:0.1618, y:0.3099 },{ x:0.2107, y:0.2382 },
  { x:0.258, y:0.1802 },{ x:0.3069, y:0.1426 },{ x:0.3634, y:0.1234 },
];

const SUZUKA: Vec2[] = [
  { x:0.9826, y:0.5939 },{ x:1.0, y:0.5174 },{ x:0.9913, y:0.4391 },{ x:0.9583, y:0.38 },
  { x:0.9061, y:0.3539 },{ x:0.8557, y:0.3678 },{ x:0.8243, y:0.4183 },{ x:0.7965, y:0.4809 },
  { x:0.7548, y:0.5157 },{ x:0.713, y:0.5017 },{ x:0.6957, y:0.4548 },{ x:0.6904, y:0.4061 },
  { x:0.6609, y:0.3817 },{ x:0.6139, y:0.3957 },{ x:0.5757, y:0.4426 },{ x:0.5409, y:0.4965 },
  { x:0.4957, y:0.533 },{ x:0.4417, y:0.5452 },{ x:0.3861, y:0.5348 },{ x:0.3374, y:0.5035 },
  { x:0.313, y:0.4548 },{ x:0.3235, y:0.4061 },{ x:0.3548, y:0.3678 },{ x:0.3757, y:0.3278 },
  { x:0.3635, y:0.2878 },{ x:0.3217, y:0.267 },{ x:0.2939, y:0.2565 },{ x:0.3183, y:0.2339 },
  { x:0.3739, y:0.213 },{ x:0.4296, y:0.2217 },{ x:0.4609, y:0.26 },{ x:0.447, y:0.3017 },
  { x:0.4017, y:0.3348 },{ x:0.3496, y:0.3765 },{ x:0.2939, y:0.4287 },{ x:0.2313, y:0.4687 },
  { x:0.1617, y:0.4843 },{ x:0.0904, y:0.4757 },{ x:0.0313, y:0.4409 },{ x:0.0, y:0.3852 },
  { x:0.0052, y:0.3261 },{ x:0.0452, y:0.2826 },{ x:0.1061, y:0.2704 },{ x:0.1739, y:0.2948 },
  { x:0.2504, y:0.3452 },{ x:0.3374, y:0.4043 },{ x:0.4261, y:0.46 },{ x:0.5113, y:0.5087 },
  { x:0.593, y:0.5539 },{ x:0.6661, y:0.6043 },{ x:0.7183, y:0.6652 },{ x:0.7339, y:0.7278 },
  { x:0.7096, y:0.7643 },{ x:0.6696, y:0.7539 },{ x:0.6504, y:0.7139 },{ x:0.6713, y:0.6826 },
  { x:0.72, y:0.6843 },{ x:0.7739, y:0.7191 },{ x:0.8243, y:0.773 },{ x:0.8696, y:0.787 },
  { x:0.9078, y:0.7278 },{ x:0.9461, y:0.6565 },
];

const SPA: Vec2[] = [
  { x:0.1167, y:0.0 },{ x:0.1572, y:0.0246 },{ x:0.2048, y:0.0687 },{ x:0.2347, y:0.125 },
  { x:0.2276, y:0.1813 },{ x:0.196, y:0.2095 },{ x:0.1783, y:0.2254 },{ x:0.1995, y:0.2711 },
  { x:0.2452, y:0.3398 },{ x:0.291, y:0.4137 },{ x:0.3368, y:0.4912 },{ x:0.3931, y:0.5687 },
  { x:0.4618, y:0.6461 },{ x:0.5375, y:0.7236 },{ x:0.615, y:0.8011 },{ x:0.6871, y:0.8732 },
  { x:0.7435, y:0.9331 },{ x:0.7857, y:0.9789 },{ x:0.8262, y:1.0 },{ x:0.8614, y:0.9824 },
  { x:0.8861, y:0.9366 },{ x:0.9125, y:0.8838 },{ x:0.9354, y:0.8292 },{ x:0.9301, y:0.7782 },
  { x:0.8931, y:0.75 },{ x:0.8438, y:0.7412 },{ x:0.7981, y:0.7165 },{ x:0.7593, y:0.6637 },
  { x:0.7294, y:0.5968 },{ x:0.71, y:0.5264 },{ x:0.7083, y:0.4577 },{ x:0.7329, y:0.3996 },
  { x:0.7769, y:0.3715 },{ x:0.8192, y:0.3609 },{ x:0.8386, y:0.3257 },{ x:0.8245, y:0.2764 },
  { x:0.7822, y:0.2553 },{ x:0.7259, y:0.2588 },{ x:0.6643, y:0.2553 },{ x:0.6009, y:0.2447 },
  { x:0.5375, y:0.2482 },{ x:0.4759, y:0.2694 },{ x:0.4248, y:0.3063 },{ x:0.4002, y:0.3592 },
  { x:0.3984, y:0.4225 },{ x:0.3931, y:0.4912 },{ x:0.3755, y:0.5599 },{ x:0.3544, y:0.6215 },
  { x:0.3298, y:0.6532 },{ x:0.3121, y:0.632 },{ x:0.3051, y:0.5845 },{ x:0.284, y:0.5599 },
  { x:0.254, y:0.5493 },{ x:0.2276, y:0.5141 },{ x:0.1889, y:0.4577 },{ x:0.1396, y:0.3856 },
  { x:0.0974, y:0.2958 },{ x:0.071, y:0.2025 },{ x:0.0646, y:0.1162 },{ x:0.0759, y:0.0493 },
  { x:0.0928, y:0.0088 },
];

const SILVERSTONE: Vec2[] = [
  { x:0.4792, y:0.2653 },{ x:0.5569, y:-0.0 },{ x:0.6561, y:0.0235 },{ x:0.7446, y:0.0668 },
  { x:0.8096, y:0.1282 },{ x:0.8565, y:0.1931 },{ x:0.9052, y:0.2491 },{ x:0.9576, y:0.3051 },
  { x:0.9919, y:0.3718 },{ x:0.9865, y:0.435 },{ x:0.9431, y:0.4675 },{ x:0.8854, y:0.4585 },
  { x:0.8294, y:0.426 },{ x:0.7662, y:0.3953 },{ x:0.685, y:0.3773 },{ x:0.5948, y:0.3755 },
  { x:0.5081, y:0.3917 },{ x:0.4323, y:0.4242 },{ x:0.3764, y:0.4711 },{ x:0.3529, y:0.5307 },
  { x:0.3691, y:0.5884 },{ x:0.4179, y:0.6227 },{ x:0.4829, y:0.6245 },{ x:0.5478, y:0.6209 },
  { x:0.602, y:0.6516 },{ x:0.6309, y:0.7112 },{ x:0.6182, y:0.7671 },{ x:0.5695, y:0.7942 },
  { x:0.5081, y:0.7834 },{ x:0.4504, y:0.7437 },{ x:0.398, y:0.6895 },{ x:0.3439, y:0.6354 },
  { x:0.2825, y:0.5921 },{ x:0.2157, y:0.5614 },{ x:0.1489, y:0.5325 },{ x:0.0894, y:0.491 },
  { x:0.0424, y:0.4314 },{ x:0.0135, y:0.3556 },{ x:0.0081, y:0.2726 },{ x:0.0298, y:0.1986 },
  { x:0.0785, y:0.1498 },{ x:0.1453, y:0.1372 },{ x:0.2139, y:0.1606 },{ x:0.2699, y:0.2094 },
  { x:0.3042, y:0.2708 },{ x:0.3078, y:0.3339 },{ x:0.2861, y:0.3953 },{ x:0.2717, y:0.4585 },
  { x:0.2915, y:0.5162 },{ x:0.3403, y:0.556 },{ x:0.3872, y:0.5921 },{ x:0.4088, y:0.6516 },
  { x:0.4143, y:0.7347 },{ x:0.4197, y:0.8249 },{ x:0.4287, y:0.9134 },{ x:0.4395, y:1.0 },
  { x:0.4486, y:0.7906 },
];

const IMOLA: Vec2[] = [
  { x:0.2144, y:0.8727 },{ x:0.3032, y:0.8844 },{ x:0.4037, y:0.876 },{ x:0.4824, y:0.8476 },
  { x:0.5193, y:0.8007 },{ x:0.5243, y:0.7454 },{ x:0.5477, y:0.6951 },{ x:0.6047, y:0.67 },
  { x:0.6717, y:0.665 },{ x:0.7337, y:0.6449 },{ x:0.7722, y:0.598 },{ x:0.7906, y:0.5427 },
  { x:0.8291, y:0.4975 },{ x:0.8978, y:0.474 },{ x:0.9648, y:0.4858 },{ x:1.0, y:0.5327 },
  { x:0.9883, y:0.5846 },{ x:0.938, y:0.6097 },{ x:0.871, y:0.6047 },{ x:0.799, y:0.5863 },
  { x:0.7286, y:0.5595 },{ x:0.6667, y:0.5176 },{ x:0.6097, y:0.4757 },{ x:0.5544, y:0.4439 },
  { x:0.5193, y:0.402 },{ x:0.5059, y:0.3484 },{ x:0.4791, y:0.3065 },{ x:0.4288, y:0.2915 },
  { x:0.3719, y:0.3032 },{ x:0.3317, y:0.3384 },{ x:0.3132, y:0.3886 },{ x:0.2848, y:0.4221 },
  { x:0.2362, y:0.4121 },{ x:0.1876, y:0.3685 },{ x:0.1541, y:0.3116 },{ x:0.1441, y:0.2513 },
  { x:0.1457, y:0.191 },{ x:0.1273, y:0.139 },{ x:0.0804, y:0.1156 },{ x:0.0285, y:0.134 },
  { x:-0.0, y:0.1859 },{ x:0.005, y:0.2513 },{ x:0.0184, y:0.3183 },{ x:0.0235, y:0.3886 },
  { x:0.0385, y:0.4724 },{ x:0.0687, y:0.5729 },{ x:0.1022, y:0.675 },{ x:0.134, y:0.7638 },
  { x:0.1642, y:0.8325 },
];

const BARCELONA: Vec2[] = [
  { x:0.1313, y:0.0091 },{ x:0.2476, y:0.0 },{ x:0.4054, y:0.0024 },{ x:0.5591, y:0.0134 },
  { x:0.6972, y:0.0386 },{ x:0.8095, y:0.082 },{ x:0.8943, y:0.1463 },{ x:0.9476, y:0.2271 },
  { x:0.9653, y:0.3119 },{ x:0.9495, y:0.3927 },{ x:0.9062, y:0.4637 },{ x:0.8431, y:0.513 },
  { x:0.7662, y:0.5327 },{ x:0.6853, y:0.5367 },{ x:0.6144, y:0.5603 },{ x:0.5513, y:0.6076 },
  { x:0.4842, y:0.6471 },{ x:0.4132, y:0.6589 },{ x:0.3521, y:0.6333 },{ x:0.3265, y:0.5761 },
  { x:0.3521, y:0.5209 },{ x:0.3797, y:0.4815 },{ x:0.3462, y:0.4499 },{ x:0.2713, y:0.4401 },
  { x:0.1944, y:0.4637 },{ x:0.1293, y:0.517 },{ x:0.08, y:0.5899 },{ x:0.0426, y:0.6688 },
  { x:0.0347, y:0.7437 },{ x:0.0741, y:0.7969 },{ x:0.1412, y:0.8088 },{ x:0.2043, y:0.8088 },
  { x:0.2476, y:0.8462 },{ x:0.2792, y:0.9093 },{ x:0.3265, y:0.9625 },{ x:0.4014, y:0.9941 },
  { x:0.4901, y:1.0 },{ x:0.571, y:0.9744 },{ x:0.6144, y:0.9192 },{ x:0.5986, y:0.86 },
  { x:0.5394, y:0.8127 },{ x:0.4645, y:0.7575 },{ x:0.3817, y:0.6767 },{ x:0.2969, y:0.5682 },
  { x:0.222, y:0.4381 },{ x:0.1648, y:0.2942 },{ x:0.1254, y:0.1542 },{ x:0.1017, y:0.0536 },
];

const MONZA_CORNERS: CornerAnnotation[] = [
  { id:"t1", label:"Rettifilo", lapFrac:0.13, type:"chicane", brakeZone:true },
  { id:"cg", label:"Grande",    lapFrac:0.24, type:"fast",    brakeZone:false },
  { id:"rog",label:"Roggia",    lapFrac:0.35, type:"chicane", brakeZone:true },
  { id:"l1", label:"Lesmo1",    lapFrac:0.43, type:"medium",  brakeZone:true },
  { id:"l2", label:"Lesmo2",    lapFrac:0.50, type:"medium",  brakeZone:true },
  { id:"asc",label:"Ascari",    lapFrac:0.66, type:"chicane", brakeZone:true },
  { id:"par",label:"Parabolica",lapFrac:0.84, type:"fast",    brakeZone:true },
];
const SUZUKA_CORNERS: CornerAnnotation[] = [
  { id:"t1", label:"T1",     lapFrac:0.07, type:"medium",  brakeZone:true },
  { id:"esses",label:"Esses",lapFrac:0.17, type:"fast",    brakeZone:false },
  { id:"dunlop",label:"Dunlop",lapFrac:0.28,type:"medium", brakeZone:false },
  { id:"degner",label:"Degner",lapFrac:0.37,type:"medium", brakeZone:true },
  { id:"hairpin",label:"Hairpin",lapFrac:0.47,type:"hairpin",brakeZone:true },
  { id:"spoon",label:"Spoon",lapFrac:0.62, type:"medium",  brakeZone:true },
  { id:"130r",label:"130R",  lapFrac:0.80, type:"fast",    brakeZone:false },
  { id:"casio",label:"Casio",lapFrac:0.90, type:"chicane", brakeZone:true },
];
const SPA_CORNERS: CornerAnnotation[] = [
  { id:"lasource",label:"LaSrc", lapFrac:0.06, type:"hairpin", brakeZone:true },
  { id:"eaurouge",label:"EauRg", lapFrac:0.15, type:"fast",    brakeZone:false },
  { id:"combes",  label:"Combes",lapFrac:0.30, type:"chicane", brakeZone:true },
  { id:"rivage",  label:"Rivage",lapFrac:0.40, type:"hairpin", brakeZone:true },
  { id:"pouhon",  label:"Pouhon",lapFrac:0.50, type:"fast",    brakeZone:false },
  { id:"fagnes",  label:"Fagnes",lapFrac:0.60, type:"chicane", brakeZone:true },
  { id:"stavelot",label:"Stavlt",lapFrac:0.68, type:"medium",  brakeZone:true },
  { id:"blanch",  label:"Blanch",lapFrac:0.82, type:"fast",    brakeZone:false },
  { id:"busstop", label:"BusStp",lapFrac:0.93, type:"chicane", brakeZone:true },
];
const SILVERSTONE_CORNERS: CornerAnnotation[] = [
  { id:"abbey",  label:"Abbey",  lapFrac:0.04, type:"fast",   brakeZone:false },
  { id:"village",label:"Village",lapFrac:0.13, type:"slow",   brakeZone:true },
  { id:"loop",   label:"Loop",   lapFrac:0.18, type:"slow",   brakeZone:true },
  { id:"brookl", label:"Brookl", lapFrac:0.32, type:"medium", brakeZone:true },
  { id:"luffield",label:"Luffld",lapFrac:0.40, type:"slow",   brakeZone:true },
  { id:"copse",  label:"Copse",  lapFrac:0.50, type:"fast",   brakeZone:false },
  { id:"becketts",label:"Beckts",lapFrac:0.59, type:"fast",   brakeZone:false },
  { id:"stowe",  label:"Stowe",  lapFrac:0.74, type:"fast",   brakeZone:true },
  { id:"vale",   label:"Vale",   lapFrac:0.83, type:"slow",   brakeZone:true },
  { id:"club",   label:"Club",   lapFrac:0.90, type:"medium", brakeZone:false },
];
const IMOLA_CORNERS: CornerAnnotation[] = [
  { id:"tamb",   label:"Tambur", lapFrac:0.12, type:"chicane", brakeZone:true },
  { id:"villen", label:"Villen", lapFrac:0.22, type:"chicane", brakeZone:true },
  { id:"tosa",   label:"Tosa",   lapFrac:0.33, type:"hairpin", brakeZone:true },
  { id:"piratel",label:"Pirat",  lapFrac:0.44, type:"medium",  brakeZone:false },
  { id:"acque",  label:"Acque",  lapFrac:0.54, type:"chicane", brakeZone:true },
  { id:"alta",   label:"Alta",   lapFrac:0.64, type:"chicane", brakeZone:true },
  { id:"riv1",   label:"Rivaz1", lapFrac:0.74, type:"medium",  brakeZone:true },
  { id:"riv2",   label:"Rivaz2", lapFrac:0.82, type:"medium",  brakeZone:true },
];
const BARCELONA_CORNERS: CornerAnnotation[] = [
  { id:"t1",  label:"T1",     lapFrac:0.10, type:"medium",  brakeZone:true },
  { id:"t3",  label:"T3",     lapFrac:0.20, type:"fast",    brakeZone:false },
  { id:"t4",  label:"Repsol", lapFrac:0.30, type:"medium",  brakeZone:true },
  { id:"t7",  label:"Wurth",  lapFrac:0.44, type:"hairpin", brakeZone:true },
  { id:"t9",  label:"Campsa", lapFrac:0.58, type:"fast",    brakeZone:false },
  { id:"t10", label:"LaCaixa",lapFrac:0.68, type:"hairpin", brakeZone:true },
  { id:"t13", label:"Chicane",lapFrac:0.84, type:"chicane", brakeZone:true },
];

const CIRCUITS: Record<string, CircuitGeometry> = {
  monza: { id:"monza", name:"Autodromo Nazionale Monza", country:"Italy", countryEmoji:"🇮🇹",
    lengthKm:5.793, centerline:normalisePoints(MONZA), corners:MONZA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.35},{sectorIdx:2,lapFrac:0.66}], trackWidthNorm:0.020 },
  suzuka: { id:"suzuka", name:"Suzuka International Racing Course", country:"Japan", countryEmoji:"🇯🇵",
    lengthKm:5.807, centerline:normalisePoints(SUZUKA), corners:SUZUKA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.40},{sectorIdx:2,lapFrac:0.76}], trackWidthNorm:0.019 },
  spa: { id:"spa", name:"Circuit de Spa-Francorchamps", country:"Belgium", countryEmoji:"🇧🇪",
    lengthKm:7.004, centerline:normalisePoints(SPA), corners:SPA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.32},{sectorIdx:2,lapFrac:0.62}], trackWidthNorm:0.019 },
  silverstone: { id:"silverstone", name:"Silverstone Circuit", country:"United Kingdom", countryEmoji:"🇬🇧",
    lengthKm:5.891, centerline:normalisePoints(SILVERSTONE), corners:SILVERSTONE_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.40},{sectorIdx:2,lapFrac:0.74}], trackWidthNorm:0.020 },
  imola: { id:"imola", name:"Autodromo Enzo e Dino Ferrari", country:"Italy", countryEmoji:"🇮🇹",
    lengthKm:4.909, centerline:normalisePoints(IMOLA), corners:IMOLA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.33},{sectorIdx:2,lapFrac:0.64}], trackWidthNorm:0.018 },
  barcelona: { id:"barcelona", name:"Circuit de Barcelona-Catalunya", country:"Spain", countryEmoji:"🇪🇸",
    lengthKm:4.675, centerline:normalisePoints(BARCELONA), corners:BARCELONA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.40},{sectorIdx:2,lapFrac:0.72}], trackWidthNorm:0.020 },
};

export function getSmoothedLine(id: string, resolution = 16, _compact = false): Vec2[] | null {
  const c = CIRCUITS[id]; if (!c) return null;
  return smooth(c.centerline, resolution, true);
}
export function getCircuit(id: string): CircuitGeometry | null { return CIRCUITS[id] ?? null; }
export function listCircuits(): string[] { return Object.keys(CIRCUITS); }
function resolveLine(src: string | Vec2[] | null | undefined, resolution = 16): Vec2[] {
  if (!src) return [];
  if (typeof src === "string") return getSmoothedLine(src, resolution) ?? [];
  return src;
}
export function getPointAtFrac(src: string | Vec2[] | null | undefined, frac: number, resolution = 16): Vec2 | null {
  const line = resolveLine(src, resolution); if (!line.length) return null;
  const f = ((frac % 1) + 1) % 1;
  return line[Math.min(Math.round(f * line.length), line.length - 1)];
}
export function getHeadingAtFrac(src: string | Vec2[] | null | undefined, frac: number, resolution = 16): number {
  const line = resolveLine(src, resolution); if (line.length < 2) return 0;
  const nn = line.length; const f = ((frac % 1) + 1) % 1;
  const idx = Math.min(Math.round(f * nn), nn - 1);
  const nxt = line[(idx + 1) % nn], cur = line[idx];
  return Math.atan2(-(nxt.y - cur.y), nxt.x - cur.x) * 180 / Math.PI;
}
