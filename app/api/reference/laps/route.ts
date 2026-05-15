import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

const REF_DIR = path.join(process.env.APEX_STORAGE_PATH ?? "/tmp/apex-uploads", "references");

interface RefMeta {
  track: string; lapTimeMs: number; car?: string;
  driverName?: string; submittedAt: string;
}

const ensureDir = () => { if (!fs.existsSync(REF_DIR)) fs.mkdirSync(REF_DIR, { recursive: true }); };
const metaPath  = (t: string) => path.join(REF_DIR, `${t}.meta.json`);
const csvPath   = (t: string) => path.join(REF_DIR, `${t}.ref.csv`);
const getMeta   = (t: string): RefMeta | null => { try { return JSON.parse(fs.readFileSync(metaPath(t), "utf8")); } catch { return null; } };

export async function GET(req: NextRequest) {
  const track = new URL(req.url).searchParams.get("track");
  if (!track) return NextResponse.json({ error: "Missing track" }, { status: 400 });
  ensureDir();
  const meta = getMeta(track);
  const csv  = (() => { try { return fs.readFileSync(csvPath(track), "utf8"); } catch { return null; } })();
  if (!meta || !csv) return NextResponse.json({ found: false });
  return NextResponse.json({ found: true, lapTimeMs: meta.lapTimeMs, car: meta.car ?? "GT3", driverName: meta.driverName ?? "Community", submittedAt: meta.submittedAt, csv });
}

export async function POST(req: NextRequest) {
  ensureDir();
  try {
    const body = await req.json() as { track: string; lapTimeMs: number; csv: string; car?: string; driverName?: string; };
    if (!body.track || !body.lapTimeMs || !body.csv) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const lines = body.csv.trim().split("\n");
    if (lines.length < 200) return NextResponse.json({ error: "Lap too short (<200 rows)" }, { status: 400 });
    if (!lines[0].toLowerCase().includes("time")) return NextResponse.json({ error: "Invalid CSV" }, { status: 400 });

    const current = getMeta(body.track);
    if (current && current.lapTimeMs <= body.lapTimeMs) {
      return NextResponse.json({ stored: false, currentBestMs: current.lapTimeMs,
        message: `Current best ${(current.lapTimeMs/1000).toFixed(3)}s is faster` });
    }

    const meta: RefMeta = { track: body.track, lapTimeMs: body.lapTimeMs,
      car: body.car, driverName: body.driverName ?? "Anonymous", submittedAt: new Date().toISOString() };
    fs.writeFileSync(metaPath(body.track), JSON.stringify(meta, null, 2));
    fs.writeFileSync(csvPath(body.track), body.csv);

    return NextResponse.json({ stored: true, improved: current ? current.lapTimeMs - body.lapTimeMs : null,
      message: `New reference: ${(body.lapTimeMs/1000).toFixed(3)}s` });
  } catch { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
