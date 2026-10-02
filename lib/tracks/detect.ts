/**
 * Canonical ACC / GTWC track detection.
 *
 * The product targets GT3 on Assetto Corsa Competizione, whose roster has ~25
 * circuits — most of which Formula 1 never visits. This resolves a lap's track
 * from its filename to a stable id (used for community-reference matching and
 * any stored geometry) and a proper display name. Unrecognised tracks return
 * id=null and an honest "unknown" name rather than silently becoming Monza.
 */

export interface DetectedTrack {
  id: string | null;     // canonical id (for reference matching / geometry)
  name: string;          // human display name
  known: boolean;        // false when the filename matched nothing
}

// token (lowercase, matched via `includes`) → [canonical id, display name]
// order matters: longer / more specific tokens first.
const TRACKS: [string, string, string][] = [
  ["mount_panorama", "mount_panorama", "Mount Panorama"],
  ["mountpanorama",  "mount_panorama", "Mount Panorama"],
  ["panorama",       "mount_panorama", "Mount Panorama"],
  ["bathurst",       "mount_panorama", "Mount Panorama"],
  ["brands_hatch",   "brands_hatch",   "Brands Hatch"],
  ["brandshatch",    "brands_hatch",   "Brands Hatch"],
  ["brands",         "brands_hatch",   "Brands Hatch"],
  ["paul_ricard",    "paul_ricard",    "Paul Ricard"],
  ["paulricard",     "paul_ricard",    "Paul Ricard"],
  ["ricard",         "paul_ricard",    "Paul Ricard"],
  ["laguna_seca",    "laguna_seca",    "Laguna Seca"],
  ["lagunaseca",     "laguna_seca",    "Laguna Seca"],
  ["laguna",         "laguna_seca",    "Laguna Seca"],
  ["oulton_park",    "oulton_park",    "Oulton Park"],
  ["oulton",         "oulton_park",    "Oulton Park"],
  ["watkins_glen",   "watkins_glen",   "Watkins Glen"],
  ["watkins",        "watkins_glen",   "Watkins Glen"],
  ["red_bull_ring",  "red_bull_ring",  "Red Bull Ring"],
  ["redbull",        "red_bull_ring",  "Red Bull Ring"],
  ["spielberg",      "red_bull_ring",  "Red Bull Ring"],
  ["nurburgring",    "nurburgring",    "Nürburgring"],
  ["nürburgring",    "nurburgring",    "Nürburgring"],
  ["nordschleife",   "nordschleife",   "Nürburgring Nordschleife"],
  ["hungaroring",    "hungaroring",    "Hungaroring"],
  ["budapest",       "hungaroring",    "Hungaroring"],
  ["hungary",        "hungaroring",    "Hungaroring"],
  ["silverstone",    "silverstone",    "Silverstone"],
  ["donington",      "donington",      "Donington Park"],
  ["donnington",     "donington",      "Donington Park"],
  ["snetterton",     "snetterton",     "Snetterton"],
  ["zandvoort",      "zandvoort",      "Zandvoort"],
  ["barcelona",      "barcelona",      "Barcelona-Catalunya"],
  ["catalunya",      "barcelona",      "Barcelona-Catalunya"],
  ["montmelo",       "barcelona",      "Barcelona-Catalunya"],
  ["misano",         "misano",         "Misano"],
  ["mugello",        "mugello",        "Mugello"],
  ["kyalami",        "kyalami",        "Kyalami"],
  ["valencia",       "valencia",       "Valencia"],
  ["indianapolis",   "indianapolis",   "Indianapolis"],
  ["interlagos",     "interlagos",     "Interlagos"],
  ["suzuka",         "suzuka",         "Suzuka"],
  ["imola",          "imola",          "Imola"],
  ["zolder",         "zolder",         "Zolder"],
  ["cota",           "cota",           "COTA"],
  ["americas",       "cota",           "COTA"],
  ["spa",            "spa",            "Spa-Francorchamps"],
  ["monza",          "monza",          "Monza"],
];

export function detectTrack(filename: string | null | undefined): DetectedTrack {
  const lower = (filename ?? "").toLowerCase();
  for (const [token, id, name] of TRACKS) {
    if (lower.includes(token)) return { id, name, known: true };
  }
  return { id: null, name: "Неизвестная трасса", known: false };
}

// ids that have hand-built geometry to fall back on when a lap can't be
// reconstructed from its own telemetry (most laps now derive their own shape).
const GEOMETRY_IDS = new Set(["monza", "spa", "silverstone", "suzuka", "imola", "barcelona"]);
export function hasGeometry(id: string | null): boolean {
  return !!id && GEOMETRY_IDS.has(id);
}
