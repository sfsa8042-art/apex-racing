/**
 * lib/tracks/geometry.ts
 *
 * REAL circuit silhouettes extracted from official F1 track maps via image
 * skeletonization, resampled to 64 evenly-spaced points and normalised.
 * These are the actual track shapes — not approximations.
 */

export interface Vec2 { x: number; y: number }

export interface CornerAnnotation {
  id: string; label: string; lapFrac: number;
  type: "hairpin" | "chicane" | "slow" | "medium" | "fast";
  brakeZone: boolean;
}
export interface SectorMarker { sectorIdx: number; lapFrac: number; }
export interface CircuitGeometry {
  id: string; name: string; country: string; countryEmoji: string;
  lengthKm: number; centerline: Vec2[];
  corners: CornerAnnotation[]; sectorMarkers: SectorMarker[];
  trackWidthNorm: number;
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
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < samples; s++) {
      const t = s / samples, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y: 0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
      });
    }
  }
  return out;
}

const MONZA: Vec2[] = [
  { x:0.0, y:0.7079 },{ x:0.0377, y:0.7075 },{ x:0.0771, y:0.7195 },{ x:0.118, y:0.7278 },
  { x:0.1599, y:0.7338 },{ x:0.1711, y:0.7536 },{ x:0.176, y:0.7156 },{ x:0.1992, y:0.6808 },
  { x:0.2223, y:0.646 },{ x:0.2455, y:0.6113 },{ x:0.2722, y:0.578 },{ x:0.304, y:0.5478 },
  { x:0.3359, y:0.5176 },{ x:0.3673, y:0.4862 },{ x:0.3991, y:0.456 },{ x:0.431, y:0.4258 },
  { x:0.4599, y:0.3934 },{ x:0.5014, y:0.3953 },{ x:0.5136, y:0.4164 },{ x:0.5284, y:0.3813 },
  { x:0.565, y:0.3672 },{ x:0.6087, y:0.3655 },{ x:0.653, y:0.3655 },{ x:0.6967, y:0.3639 },
  { x:0.7404, y:0.3622 },{ x:0.7847, y:0.3622 },{ x:0.8284, y:0.3605 },{ x:0.8728, y:0.3605 },
  { x:0.9169, y:0.36 },{ x:0.9604, y:0.3579 },{ x:1.0, y:0.3548 },{ x:0.9925, y:0.3414 },
  { x:0.9862, y:0.2996 },{ x:0.958, y:0.2698 },{ x:0.9193, y:0.2563 },{ x:0.877, y:0.2514 },
  { x:0.834, y:0.2481 },{ x:0.7903, y:0.2464 },{ x:0.7459, y:0.2464 },{ x:0.7023, y:0.2481 },
  { x:0.6579, y:0.2481 },{ x:0.6142, y:0.2497 },{ x:0.5699, y:0.2497 },{ x:0.5255, y:0.2497 },
  { x:0.4812, y:0.2497 },{ x:0.4375, y:0.2514 },{ x:0.3938, y:0.2497 },{ x:0.3838, y:0.2846 },
  { x:0.3699, y:0.2596 },{ x:0.329, y:0.2514 },{ x:0.286, y:0.2481 },{ x:0.2423, y:0.2497 },
  { x:0.2025, y:0.2606 },{ x:0.1718, y:0.2797 },{ x:0.1463, y:0.3135 },{ x:0.1278, y:0.3502 },
  { x:0.1191, y:0.3909 },{ x:0.1125, y:0.4325 },{ x:0.1059, y:0.4741 },{ x:0.0993, y:0.5158 },
  { x:0.0825, y:0.5493 },{ x:0.0651, y:0.5816 },{ x:0.0513, y:0.6202 },{ x:0.0347, y:0.6577 },
];

const SUZUKA: Vec2[] = [
  { x:0.0, y:0.6552 },{ x:0.0505, y:0.6552 },{ x:0.1009, y:0.6552 },{ x:0.1514, y:0.6552 },
  { x:0.1864, y:0.6336 },{ x:0.1978, y:0.5879 },{ x:0.2088, y:0.5419 },{ x:0.2235, y:0.4976 },
  { x:0.2437, y:0.4555 },{ x:0.2794, y:0.4198 },{ x:0.315, y:0.3841 },{ x:0.3507, y:0.3484 },
  { x:0.3896, y:0.3205 },{ x:0.4285, y:0.2926 },{ x:0.4653, y:0.2596 },{ x:0.5063, y:0.2368 },
  { x:0.542, y:0.2011 },{ x:0.5809, y:0.1732 },{ x:0.6198, y:0.1453 },{ x:0.6587, y:0.1174 },
  { x:0.6976, y:0.0895 },{ x:0.7411, y:0.0728 },{ x:0.787, y:0.0618 },{ x:0.8329, y:0.0508 },
  { x:0.8788, y:0.0398 },{ x:0.9248, y:0.0288 },{ x:0.9728, y:0.0231 },{ x:1.0, y:0.039 },
  { x:1.0, y:0.0894 },{ x:0.989, y:0.1353 },{ x:0.978, y:0.1812 },{ x:0.967, y:0.2271 },
  { x:0.956, y:0.273 },{ x:0.9451, y:0.319 },{ x:0.9296, y:0.363 },{ x:0.9094, y:0.4051 },
  { x:0.8901, y:0.4476 },{ x:0.8769, y:0.4926 },{ x:0.8568, y:0.5347 },{ x:0.8367, y:0.5768 },
  { x:0.8242, y:0.6221 },{ x:0.8041, y:0.6643 },{ x:0.784, y:0.7064 },{ x:0.7692, y:0.7507 },
  { x:0.7473, y:0.7921 },{ x:0.7363, y:0.838 },{ x:0.7363, y:0.8793 },{ x:0.7473, y:0.9252 },
  { x:0.7641, y:0.9687 },{ x:0.7598, y:0.9769 },{ x:0.7372, y:0.9318 },{ x:0.7146, y:0.8867 },
  { x:0.6782, y:0.864 },{ x:0.6277, y:0.864 },{ x:0.5773, y:0.864 },{ x:0.5314, y:0.853 },
  { x:0.4809, y:0.853 },{ x:0.4305, y:0.853 },{ x:0.3845, y:0.842 },{ x:0.3392, y:0.8296 },
  { x:0.2971, y:0.8095 },{ x:0.255, y:0.7893 },{ x:0.2271, y:0.7504 },{ x:0.207, y:0.7083 },
];

const SPA: Vec2[] = [
  { x:0.1593, y:0.5382 },{ x:0.211, y:0.5346 },{ x:0.2624, y:0.5533 },{ x:0.3067, y:0.5941 },
  { x:0.353, y:0.6329 },{ x:0.4018, y:0.6653 },{ x:0.4546, y:0.6884 },{ x:0.5071, y:0.712 },
  { x:0.5598, y:0.7354 },{ x:0.6127, y:0.758 },{ x:0.6656, y:0.7808 },{ x:0.7183, y:0.8041 },
  { x:0.7656, y:0.8308 },{ x:0.7735, y:0.8203 },{ x:0.8244, y:0.8003 },{ x:0.8786, y:0.8198 },
  { x:0.8958, y:0.8091 },{ x:0.9373, y:0.764 },{ x:0.956, y:0.7094 },{ x:0.8987, y:0.7086 },
  { x:0.8419, y:0.6952 },{ x:0.7892, y:0.6719 },{ x:0.7345, y:0.6537 },{ x:0.6797, y:0.6355 },
  { x:0.642, y:0.5941 },{ x:0.6429, y:0.536 },{ x:0.6813, y:0.4961 },{ x:0.7353, y:0.476 },
  { x:0.7916, y:0.4613 },{ x:0.8473, y:0.4455 },{ x:0.8773, y:0.3956 },{ x:0.8971, y:0.3425 },
  { x:0.9388, y:0.3056 },{ x:0.9906, y:0.2802 },{ x:1.0, y:0.2697 },{ x:0.9797, y:0.2158 },
  { x:0.9442, y:0.1692 },{ x:0.8857, y:0.1764 },{ x:0.8321, y:0.1976 },{ x:0.7841, y:0.2321 },
  { x:0.7408, y:0.2754 },{ x:0.7071, y:0.3238 },{ x:0.6639, y:0.3597 },{ x:0.6283, y:0.4008 },
  { x:0.5735, y:0.4189 },{ x:0.5155, y:0.4273 },{ x:0.4596, y:0.4118 },{ x:0.4086, y:0.3844 },
  { x:0.357, y:0.3587 },{ x:0.2999, y:0.3459 },{ x:0.2414, y:0.3368 },{ x:0.2363, y:0.382 },
  { x:0.2199, y:0.3423 },{ x:0.1672, y:0.319 },{ x:0.1199, y:0.2827 },{ x:0.0726, y:0.2464 },
  { x:0.023, y:0.2159 },{ x:0.0, y:0.2459 },{ x:0.02, y:0.3 },{ x:0.0511, y:0.3494 },
  { x:0.0913, y:0.3951 },{ x:0.1328, y:0.4402 },{ x:0.1685, y:0.4813 },{ x:0.1747, y:0.5039 },
];

const SILVERSTONE: Vec2[] = [
  { x:0.1423, y:0.7448 },{ x:0.1718, y:0.709 },{ x:0.1619, y:0.6759 },{ x:0.121, y:0.635 },
  { x:0.078, y:0.5991 },{ x:0.0306, y:0.5715 },{ x:0.0022, y:0.5269 },{ x:0.0, y:0.5143 },
  { x:0.035, y:0.4722 },{ x:0.082, y:0.4436 },{ x:0.1297, y:0.4165 },{ x:0.1783, y:0.3916 },
  { x:0.227, y:0.3669 },{ x:0.2759, y:0.3428 },{ x:0.3248, y:0.3188 },{ x:0.3735, y:0.2942 },
  { x:0.4106, y:0.2571 },{ x:0.4504, y:0.2233 },{ x:0.4966, y:0.2007 },{ x:0.5479, y:0.2192 },
  { x:0.5705, y:0.2266 },{ x:0.6256, y:0.2173 },{ x:0.6768, y:0.2247 },{ x:0.6949, y:0.2606 },
  { x:0.7377, y:0.2432 },{ x:0.795, y:0.2468 },{ x:0.8516, y:0.2524 },{ x:0.906, y:0.2635 },
  { x:0.9579, y:0.2803 },{ x:0.9994, y:0.3145 },{ x:1.0, y:0.3701 },{ x:0.9945, y:0.4267 },
  { x:0.9871, y:0.4825 },{ x:0.9797, y:0.5384 },{ x:0.9705, y:0.5934 },{ x:0.9477, y:0.6386 },
  { x:0.9006, y:0.6672 },{ x:0.855, y:0.6914 },{ x:0.8014, y:0.6969 },{ x:0.7839, y:0.6906 },
  { x:0.8083, y:0.6451 },{ x:0.8617, y:0.6321 },{ x:0.8672, y:0.5801 },{ x:0.8356, y:0.5343 },
  { x:0.7978, y:0.491 },{ x:0.7614, y:0.4472 },{ x:0.7237, y:0.404 },{ x:0.6864, y:0.3605 },
  { x:0.6495, y:0.3169 },{ x:0.6082, y:0.3196 },{ x:0.5702, y:0.3595 },{ x:0.5533, y:0.4114 },
  { x:0.5169, y:0.4552 },{ x:0.4965, y:0.503 },{ x:0.502, y:0.5596 },{ x:0.5136, y:0.6102 },
  { x:0.4919, y:0.6203 },{ x:0.4471, y:0.6545 },{ x:0.4016, y:0.6867 },{ x:0.3567, y:0.7205 },
  { x:0.3112, y:0.753 },{ x:0.2658, y:0.7855 },{ x:0.2553, y:0.7993 },{ x:0.208, y:0.7792 },
];

const IMOLA: Vec2[] = [
  { x:0.1628, y:0.6328 },{ x:0.2053, y:0.6379 },{ x:0.2465, y:0.6585 },{ x:0.2369, y:0.7006 },
  { x:0.2791, y:0.703 },{ x:0.3249, y:0.715 },{ x:0.3733, y:0.7209 },{ x:0.4216, y:0.7269 },
  { x:0.4715, y:0.7276 },{ x:0.5197, y:0.7213 },{ x:0.5673, y:0.7135 },{ x:0.6132, y:0.7015 },
  { x:0.6621, y:0.706 },{ x:0.7123, y:0.7075 },{ x:0.7625, y:0.709 },{ x:0.7995, y:0.6947 },
  { x:0.8306, y:0.7221 },{ x:0.8739, y:0.7404 },{ x:0.9172, y:0.7583 },{ x:0.9606, y:0.7762 },
  { x:0.9799, y:0.7842 },{ x:1.0, y:0.7431 },{ x:0.995, y:0.7042 },{ x:0.9525, y:0.6842 },
  { x:0.9168, y:0.6582 },{ x:0.8806, y:0.6272 },{ x:0.8457, y:0.5908 },{ x:0.8094, y:0.5559 },
  { x:0.7699, y:0.5284 },{ x:0.727, y:0.5094 },{ x:0.6839, y:0.4908 },{ x:0.6672, y:0.4768 },
  { x:0.6561, y:0.5193 },{ x:0.6236, y:0.4997 },{ x:0.5734, y:0.4982 },{ x:0.5238, y:0.4953 },
  { x:0.4736, y:0.4937 },{ x:0.424, y:0.4908 },{ x:0.3795, y:0.4998 },{ x:0.3725, y:0.4942 },
  { x:0.3481, y:0.4535 },{ x:0.3466, y:0.4364 },{ x:0.3586, y:0.3905 },{ x:0.3692, y:0.3441 },
  { x:0.389, y:0.3293 },{ x:0.3675, y:0.2938 },{ x:0.3496, y:0.2504 },{ x:0.3118, y:0.2337 },
  { x:0.2635, y:0.2397 },{ x:0.2158, y:0.2442 },{ x:0.168, y:0.2397 },{ x:0.1203, y:0.2322 },
  { x:0.0726, y:0.2247 },{ x:0.0255, y:0.2158 },{ x:0.0, y:0.2428 },{ x:0.0347, y:0.2775 },
  { x:0.0715, y:0.3113 },{ x:0.1052, y:0.3465 },{ x:0.0931, y:0.3916 },{ x:0.097, y:0.4013 },
  { x:0.113, y:0.4455 },{ x:0.1284, y:0.4899 },{ x:0.1447, y:0.534 },{ x:0.1606, y:0.5782 },
];

const BARCELONA: Vec2[] = [
  { x:0.0367, y:0.6092 },{ x:0.0847, y:0.6367 },{ x:0.1404, y:0.6459 },{ x:0.1992, y:0.6474 },
  { x:0.2586, y:0.6474 },{ x:0.3175, y:0.6459 },{ x:0.3505, y:0.6313 },{ x:0.3417, y:0.5773 },
  { x:0.2977, y:0.5447 },{ x:0.24, y:0.5403 },{ x:0.1806, y:0.5403 },{ x:0.1248, y:0.5316 },
  { x:0.1188, y:0.5138 },{ x:0.1552, y:0.4746 },{ x:0.202, y:0.444 },{ x:0.2508, y:0.4321 },
  { x:0.287, y:0.4128 },{ x:0.3458, y:0.4113 },{ x:0.39, y:0.4308 },{ x:0.3963, y:0.4864 },
  { x:0.4269, y:0.5332 },{ x:0.4585, y:0.5795 },{ x:0.495, y:0.6224 },{ x:0.5225, y:0.6312 },
  { x:0.5756, y:0.6158 },{ x:0.6232, y:0.5872 },{ x:0.6708, y:0.5587 },{ x:0.7184, y:0.5301 },
  { x:0.7663, y:0.5022 },{ x:0.8141, y:0.4741 },{ x:0.8615, y:0.445 },{ x:0.901, y:0.4308 },
  { x:0.9075, y:0.4847 },{ x:0.8941, y:0.534 },{ x:0.844, y:0.5418 },{ x:0.8079, y:0.5798 },
  { x:0.8158, y:0.6113 },{ x:0.8673, y:0.6232 },{ x:0.9196, y:0.606 },{ x:0.9711, y:0.5868 },
  { x:0.9985, y:0.5456 },{ x:1.0, y:0.4868 },{ x:1.0, y:0.4273 },{ x:0.9897, y:0.3722 },
  { x:0.9392, y:0.3534 },{ x:0.8801, y:0.3526 },{ x:0.8206, y:0.3526 },{ x:0.7612, y:0.3526 },
  { x:0.7017, y:0.3526 },{ x:0.6423, y:0.3526 },{ x:0.5829, y:0.3526 },{ x:0.5234, y:0.3526 },
  { x:0.464, y:0.3526 },{ x:0.4046, y:0.3526 },{ x:0.3451, y:0.3526 },{ x:0.2857, y:0.3526 },
  { x:0.2262, y:0.3526 },{ x:0.1668, y:0.3526 },{ x:0.1364, y:0.3868 },{ x:0.1162, y:0.4344 },
  { x:0.0689, y:0.4597 },{ x:0.0213, y:0.4883 },{ x:0.0, y:0.5389 },{ x:0.0059, y:0.5605 },
];

const MONZA_CORNERS: CornerAnnotation[] = [
  { id:"t1", label:"Rettifilo", lapFrac:0.62, type:"chicane", brakeZone:true },
  { id:"cg", label:"Grande",    lapFrac:0.72, type:"fast",    brakeZone:false },
  { id:"rog",label:"Roggia",    lapFrac:0.80, type:"chicane", brakeZone:true },
  { id:"l1", label:"Lesmo1",    lapFrac:0.86, type:"medium",  brakeZone:true },
  { id:"l2", label:"Lesmo2",    lapFrac:0.90, type:"medium",  brakeZone:true },
  { id:"asc",label:"Ascari",    lapFrac:0.06, type:"chicane", brakeZone:true },
  { id:"par",label:"Parabolica",lapFrac:0.16, type:"fast",    brakeZone:true },
];
const SUZUKA_CORNERS: CornerAnnotation[] = [
  { id:"t1", label:"T1",     lapFrac:0.07, type:"medium",  brakeZone:true },
  { id:"esses",label:"Esses",lapFrac:0.18, type:"fast",    brakeZone:false },
  { id:"dunlop",label:"Dunlop",lapFrac:0.30, type:"medium",brakeZone:false },
  { id:"degner",label:"Degner",lapFrac:0.40, type:"medium",brakeZone:true },
  { id:"hairpin",label:"Hairpin",lapFrac:0.50,type:"hairpin",brakeZone:true },
  { id:"spoon",label:"Spoon",lapFrac:0.65, type:"medium",  brakeZone:true },
  { id:"130r",label:"130R",  lapFrac:0.80, type:"fast",    brakeZone:false },
  { id:"casio",label:"Casio",lapFrac:0.92, type:"chicane", brakeZone:true },
];
const SPA_CORNERS: CornerAnnotation[] = [
  { id:"lasource",label:"LaSrc", lapFrac:0.05, type:"hairpin", brakeZone:true },
  { id:"eaurouge",label:"EauRg", lapFrac:0.13, type:"fast",    brakeZone:false },
  { id:"combes",  label:"Combes",lapFrac:0.27, type:"chicane", brakeZone:true },
  { id:"rivage",  label:"Rivage",lapFrac:0.37, type:"hairpin", brakeZone:true },
  { id:"pouhon",  label:"Pouhon",lapFrac:0.47, type:"fast",    brakeZone:false },
  { id:"fagnes",  label:"Fagnes",lapFrac:0.57, type:"chicane", brakeZone:true },
  { id:"stavelot",label:"Stavlt",lapFrac:0.66, type:"medium",  brakeZone:true },
  { id:"blanch",  label:"Blanch",lapFrac:0.80, type:"fast",    brakeZone:false },
  { id:"busstop", label:"BusStp",lapFrac:0.93, type:"chicane", brakeZone:true },
];
const SILVERSTONE_CORNERS: CornerAnnotation[] = [
  { id:"abbey",  label:"Abbey",  lapFrac:0.03, type:"fast",   brakeZone:false },
  { id:"village",label:"Village",lapFrac:0.12, type:"slow",   brakeZone:true },
  { id:"loop",   label:"Loop",   lapFrac:0.17, type:"slow",   brakeZone:true },
  { id:"brookl", label:"Brookl", lapFrac:0.32, type:"medium", brakeZone:true },
  { id:"luffield",label:"Luffld",lapFrac:0.40, type:"slow",   brakeZone:true },
  { id:"copse",  label:"Copse",  lapFrac:0.50, type:"fast",   brakeZone:false },
  { id:"becketts",label:"Beckts",lapFrac:0.60, type:"fast",   brakeZone:false },
  { id:"stowe",  label:"Stowe",  lapFrac:0.76, type:"fast",   brakeZone:true },
  { id:"vale",   label:"Vale",   lapFrac:0.85, type:"slow",   brakeZone:true },
  { id:"club",   label:"Club",   lapFrac:0.92, type:"medium", brakeZone:false },
];
const IMOLA_CORNERS: CornerAnnotation[] = [
  { id:"tamb",   label:"Tambur", lapFrac:0.10, type:"chicane", brakeZone:true },
  { id:"villen", label:"Villen", lapFrac:0.20, type:"chicane", brakeZone:true },
  { id:"tosa",   label:"Tosa",   lapFrac:0.30, type:"hairpin", brakeZone:true },
  { id:"piratel",label:"Pirat",  lapFrac:0.42, type:"medium",  brakeZone:false },
  { id:"acque",  label:"Acque",  lapFrac:0.54, type:"chicane", brakeZone:true },
  { id:"alta",   label:"Alta",   lapFrac:0.66, type:"chicane", brakeZone:true },
  { id:"riv1",   label:"Rivaz1", lapFrac:0.76, type:"medium",  brakeZone:true },
  { id:"riv2",   label:"Rivaz2", lapFrac:0.84, type:"medium",  brakeZone:true },
];
const BARCELONA_CORNERS: CornerAnnotation[] = [
  { id:"t1",  label:"T1",     lapFrac:0.09, type:"medium",  brakeZone:true },
  { id:"t3",  label:"T3",     lapFrac:0.20, type:"fast",    brakeZone:false },
  { id:"t4",  label:"Repsol", lapFrac:0.30, type:"medium",  brakeZone:true },
  { id:"t7",  label:"Wurth",  lapFrac:0.44, type:"hairpin", brakeZone:true },
  { id:"t9",  label:"Campsa", lapFrac:0.60, type:"fast",    brakeZone:false },
  { id:"t10", label:"LaCaixa",lapFrac:0.70, type:"hairpin", brakeZone:true },
  { id:"t13", label:"Chicane",lapFrac:0.86, type:"chicane", brakeZone:true },
];

const CIRCUITS: Record<string, CircuitGeometry> = {
  monza: { id:"monza", name:"Autodromo Nazionale Monza", country:"Italy", countryEmoji:"🇮🇹",
    lengthKm:5.793, centerline:normalisePoints(MONZA), corners:MONZA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.40},{sectorIdx:2,lapFrac:0.72}], trackWidthNorm:0.020 },
  suzuka: { id:"suzuka", name:"Suzuka International Racing Course", country:"Japan", countryEmoji:"🇯🇵",
    lengthKm:5.807, centerline:normalisePoints(SUZUKA), corners:SUZUKA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.40},{sectorIdx:2,lapFrac:0.76}], trackWidthNorm:0.019 },
  spa: { id:"spa", name:"Circuit de Spa-Francorchamps", country:"Belgium", countryEmoji:"🇧🇪",
    lengthKm:7.004, centerline:normalisePoints(SPA), corners:SPA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.40},{sectorIdx:2,lapFrac:0.78}], trackWidthNorm:0.019 },
  silverstone: { id:"silverstone", name:"Silverstone Circuit", country:"United Kingdom", countryEmoji:"🇬🇧",
    lengthKm:5.891, centerline:normalisePoints(SILVERSTONE), corners:SILVERSTONE_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.40},{sectorIdx:2,lapFrac:0.72}], trackWidthNorm:0.020 },
  imola: { id:"imola", name:"Autodromo Enzo e Dino Ferrari", country:"Italy", countryEmoji:"🇮🇹",
    lengthKm:4.909, centerline:normalisePoints(IMOLA), corners:IMOLA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.38},{sectorIdx:2,lapFrac:0.74}], trackWidthNorm:0.018 },
  barcelona: { id:"barcelona", name:"Circuit de Barcelona-Catalunya", country:"Spain", countryEmoji:"🇪🇸",
    lengthKm:4.675, centerline:normalisePoints(BARCELONA), corners:BARCELONA_CORNERS,
    sectorMarkers:[{sectorIdx:0,lapFrac:0.0},{sectorIdx:1,lapFrac:0.40},{sectorIdx:2,lapFrac:0.74}], trackWidthNorm:0.020 },
};

export function getSmoothedLine(id: string, resolution = 16, _compact = false): Vec2[] | null {
  const c = CIRCUITS[id];
  if (!c) return null;
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
  const line = resolveLine(src, resolution);
  if (!line.length) return null;
  const f = ((frac % 1) + 1) % 1;
  const idx = Math.min(Math.round(f * line.length), line.length - 1);
  return line[idx];
}
export function getHeadingAtFrac(src: string | Vec2[] | null | undefined, frac: number, resolution = 16): number {
  const line = resolveLine(src, resolution);
  if (line.length < 2) return 0;
  const nn = line.length;
  const f = ((frac % 1) + 1) % 1;
  const idx = Math.min(Math.round(f * nn), nn - 1);
  const nxt = line[(idx + 1) % nn], cur = line[idx];
  return Math.atan2(-(nxt.y - cur.y), nxt.x - cur.x) * 180 / Math.PI;
}
