"use client";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, FastForward, Eye } from "lucide-react";
import { getSmoothedLine, getCircuit, getPointAtFrac, getHeadingAtFrac } from "@/lib/tracks/geometry";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import type { ParsedLap } from "@/types/telemetry";

interface TrackAnimationProps {
  trackId:     string;
  userLap?:    ParsedLap | null;
  refLap?:     ParsedLap | null;
  focusRange?: [number, number] | null;
  className?:  string;
  height?:     number;
}

const CW = 640;
const CH_RATIO = 0.62;

// ─── Smooth colour ramp for brake/throttle ────────────────────────────────────
function zoneColor(brake: number, throttle: number): [string, string] {
  if (brake > 8) {
    const i = Math.min(1, brake / 100);
    const r = Math.round(200 + 55 * i);
    const g = Math.round(50 * (1 - i));
    return [`rgba(${r},${g},50,0.82)`, `rgba(${r},${g},50,0.15)`];
  }
  if (throttle > 25) {
    const i = Math.min(1, throttle / 100);
    const g = Math.round(140 + 90 * i);
    return [`rgba(50,${g},50,0.82)`, `rgba(50,${g},50,0.15)`];
  }
  return ["rgba(160,160,160,0.45)", "rgba(160,160,160,0.08)"];
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, heading: number,
  color: string, glowColor: string, size: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);

  // Glow
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.8);
  grd.addColorStop(0, glowColor);
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(0, 0, size * 2.8, 0, Math.PI * 2); ctx.fill();

  // Car body — tapered rectangle
  ctx.beginPath();
  ctx.moveTo( size * 1.8,  0);
  ctx.lineTo( size * 0.6,  size * 0.7);
  ctx.lineTo(-size * 1.4,  size * 0.55);
  ctx.lineTo(-size * 1.4, -size * 0.55);
  ctx.lineTo( size * 0.6, -size * 0.7);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 0.8; ctx.stroke();

  // Cockpit
  ctx.beginPath();
  ctx.ellipse(size * 0.3, 0, size * 0.55, size * 0.32, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fill();

  // Front wing
  ctx.beginPath();
  ctx.moveTo(size * 1.8, -size * 0.9);
  ctx.lineTo(size * 2.2, -size * 0.6);
  ctx.lineTo(size * 2.2,  size * 0.6);
  ctx.lineTo(size * 1.8,  size * 0.9);
  ctx.fillStyle = color; ctx.fill();

  ctx.restore();
}

export function TrackAnimation({
  trackId, userLap, refLap, focusRange, className, height = 300,
}: TrackAnimationProps) {
  const { t }          = useLang();
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const rafRef         = useRef<number>(0);
  const lastTimeRef    = useRef<number>(0);
  const [playing,      setPlaying]  = useState(false);
  const [progress,     setProgress] = useState(0);
  const [speed,        setSpeed]    = useState(1);
  const [showGhost,    setShowGhost] = useState(true);

  const CH = Math.round(CW * CH_RATIO);

  const circuit  = useMemo(() => getCircuit(trackId),          [trackId]);
  const smoothed = useMemo(() => getSmoothedLine(trackId, 18), [trackId]);

  // ── Build zone map from lap rows ──────────────────────────────────────────
  const zoneMap = useMemo(() => {
    if (!userLap || !smoothed) return null;
    const n = smoothed.length;
    return smoothed.map((_, i) => {
      const frac   = i / (n - 1);
      const rowIdx = Math.round(frac * (userLap.rows.length - 1));
      const row    = userLap.rows[rowIdx];
      return { brake: row.brake, throttle: row.throttle };
    });
  }, [userLap, smoothed]);

  // ── Convert normalised track coords → canvas px ──────────────────────────
  const toPx = useCallback((x: number, y: number): [number, number] => {
    const PAD = 36;
    return [
      PAD + x * (CW - PAD * 2),
      PAD + (1 - y) * (CH - PAD * 2),
    ];
  }, [CH]);

  // ── Main draw ─────────────────────────────────────────────────────────────
  const draw = useCallback((frac: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !smoothed || !circuit) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // DPR scaling for crisp Retina rendering
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    if (canvas.dataset.dpr !== String(dpr)) {
      canvas.width  = CW * dpr;
      canvas.height = CH * dpr;
      canvas.dataset.dpr = String(dpr);
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0a0a0b";
    ctx.fillRect(0, 0, CW, CH);

    const n    = smoothed.length;
    const coords: Array<[number, number]> = smoothed.map(p => toPx(p.x, p.y));

    // ── Track shadow (wide, dark) ──
    ctx.beginPath();
    coords.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.strokeStyle = "#1e1e20";
    ctx.lineWidth   = 18; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();

    // ── Track tarmac ──
    ctx.beginPath();
    coords.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.strokeStyle = "#2d2d30"; ctx.lineWidth = 12; ctx.stroke();

    // ── Zone colouring (brake/throttle) ──
    if (zoneMap) {
      for (let i = 0; i < n - 1; i++) {
        const [stroke, fill] = zoneColor(zoneMap[i].brake, zoneMap[i].throttle);
        ctx.beginPath();
        ctx.moveTo(coords[i][0], coords[i][1]);
        ctx.lineTo(coords[i + 1][0], coords[i + 1][1]);
        ctx.strokeStyle = stroke; ctx.lineWidth = 9;
        ctx.lineCap = "round"; ctx.stroke();
      }
    } else {
      // No lap — draw subtle green centreline
      ctx.beginPath();
      coords.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.closePath();
      ctx.strokeStyle = "rgba(163,230,53,0.30)"; ctx.lineWidth = 5; ctx.stroke();
    }

    // ── Track border ──
    ctx.beginPath();
    coords.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,255,255,0.055)"; ctx.lineWidth = 14; ctx.stroke();

    // ── Highlight range ──
    if (focusRange) {
      const [fs, fe] = focusRange;
      const si = Math.round(fs * n); const ei = Math.round(fe * n);
      ctx.beginPath();
      coords.slice(si, ei + 1).forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.strokeStyle = "rgba(163,230,53,0.55)"; ctx.lineWidth = 16;
      ctx.lineCap = "round"; ctx.stroke();
      ctx.strokeStyle = "#a3e635"; ctx.lineWidth = 3; ctx.stroke();
    }

    // ── Corner labels ──
    ctx.font = "bold 8.5px monospace"; ctx.textAlign = "center";
    circuit.corners.forEach(corner => {
      const idx = Math.min(n - 1, Math.round(corner.lapFrac * n));
      const [cx, cy] = coords[idx];
      const color = corner.brakeZone ? "#f87171" : corner.type === "fast" ? "#60a5fa" : "#a1a1aa";
      ctx.fillStyle = "rgba(9,9,11,0.75)";
      ctx.beginPath(); ctx.roundRect?.(cx - 13, cy - 16, 26, 13, 3); ctx.fill();
      ctx.fillStyle = color; ctx.fillText(corner.label, cx, cy - 5);
    });

    // ── S/F line ──
    {
      const [sx, sy] = coords[0];
      ctx.save(); ctx.translate(sx, sy);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(-8, -2, 16, 4);
      ctx.fillStyle = "#71717a"; ctx.font = "8px monospace"; ctx.textAlign = "center";
      ctx.fillText("S/F", 0, -7);
      ctx.restore();
    }

    // ── Sector markers ──
    const SCOLS = ["#a3e635", "#facc15", "#f87171"];
    circuit.sectorMarkers.forEach((sm, i) => {
      const idx = Math.min(n - 1, Math.round(sm.lapFrac * n));
      const [mx, my] = coords[idx];
      ctx.fillStyle = "rgba(9,9,11,0.88)";
      ctx.strokeStyle = SCOLS[i]; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect?.(mx - 13, my - 10, 26, 16, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = SCOLS[i]; ctx.font = "bold 9px monospace";
      ctx.textAlign = "center"; ctx.fillText(`S${i + 1}`, mx, my + 2);
    });

    if (frac <= 0) return;

    // ── Ghost car (reference) ──
    if (showGhost && refLap) {
      // Ref car progresses slightly different from user (same frac for visual clarity)
      const refPt = getPointAtFrac(smoothed, frac);
      const refH  = getHeadingAtFrac(smoothed, frac);
      const [rx, ry] = toPx(refPt.x, refPt.y);
      drawCar(ctx, rx, ry, refH, "rgba(255,255,255,0.55)", "rgba(255,255,255,0.12)", 5);
    }

    // ── User car ──
    const userPt = getPointAtFrac(smoothed, frac);
    const userH  = getHeadingAtFrac(smoothed, frac);
    const [ux, uy] = toPx(userPt.x, userPt.y);

    // Current state label
    const rowIdx = userLap ? Math.round(frac * (userLap.rows.length - 1)) : -1;
    const row    = rowIdx >= 0 ? userLap!.rows[rowIdx] : null;
    const state  = (row?.brake ?? 0) > 10 ? "BRAKE" : (row?.throttle ?? 0) > 50 ? "FULL GAS" : "";

    if (state) {
      ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      const stColor = state === "BRAKE" ? "#f87171" : "#4ade80";
      ctx.fillStyle = "rgba(9,9,11,0.85)";
      ctx.beginPath(); ctx.roundRect?.(ux - 22, uy - 28, 44, 14, 3); ctx.fill();
      ctx.fillStyle = stColor; ctx.fillText(state, ux, uy - 17);
    }

    drawCar(ctx, ux, uy, userH, "#a3e635", "rgba(163,230,53,0.30)", 6);

    // Progress label
    ctx.fillStyle = "#3f3f46"; ctx.font = "9px monospace"; ctx.textAlign = "right";
    ctx.fillText(`${Math.round(frac * 100)}%`, CW - 10, CH - 8);

  }, [smoothed, circuit, toPx, zoneMap, focusRange, showGhost, refLap, userLap, CH]);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const lapDuration = userLap ? userLap.lapTimeMs / 1000 : 90;
    const step = (ts: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = (ts - lastTimeRef.current) / 1000;
      lastTimeRef.current = ts;
      setProgress(p => {
        const next = p + (dt * speed) / lapDuration;
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, userLap]);

  useEffect(() => { draw(progress); }, [progress, draw]);
  useEffect(() => { draw(0); }, [draw]);

  const reset = () => { setPlaying(false); setProgress(0); };

  return (
    <div className={cn("rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="w-full"
        style={{ height }}
      />

      {/* Controls bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/60">
        <button onClick={() => setPlaying(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-semibold transition-colors">
          {playing ? <Pause size={12}/> : <Play size={12}/>}
          {playing ? t.academy.animation.pause : t.academy.animation.play}
        </button>

        <button onClick={reset}
          className="w-7 h-7 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition-colors">
          <RotateCcw size={11}/>
        </button>

        {/* Scrubber */}
        <div className="flex-1 flex items-center gap-2 mx-1">
          <input type="range" min={0} max={1000} value={Math.round(progress * 1000)}
            onChange={e => { setPlaying(false); setProgress(+e.target.value / 1000); }}
            className="flex-1 h-1 accent-lime-400 cursor-pointer"/>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-0.5">
          <FastForward size={10} className="text-zinc-600 mr-0.5"/>
          {[1, 2, 4].map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded transition-all",
                speed === s ? "bg-zinc-600 text-zinc-100" : "text-zinc-600 hover:text-zinc-400")}>
              {s}×
            </button>
          ))}
        </div>

        {/* Ghost toggle */}
        {refLap && (
          <button onClick={() => setShowGhost(v => !v)}
            className={cn("flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-md border transition-all",
              showGhost ? "border-zinc-600 bg-zinc-700 text-zinc-200" : "border-zinc-800 text-zinc-600")}>
            <Eye size={10}/> Ghost
          </button>
        )}

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[9px] font-mono text-zinc-600 ml-1">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-lime-400"/>
            {t.academy.animation.userLap}</div>
          {refLap && <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-zinc-400/50"/>
            {t.academy.animation.reference}</div>}
        </div>
      </div>

      {/* Zone legend */}
      {userLap && (
        <div className="flex items-center gap-4 px-4 pb-2.5 text-[9px] font-mono text-zinc-600 bg-zinc-900/60">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1.5 rounded" style={{background:"rgba(245,60,50,0.82)"}}/>
            {t.academy.animation.braking}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1.5 rounded" style={{background:"rgba(50,200,50,0.82)"}}/>
            {t.academy.animation.throttle}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1.5 rounded" style={{background:"rgba(160,160,160,0.45)"}}/>
            {t.academy.animation.coasting}
          </div>
        </div>
      )}
    </div>
  );
}
