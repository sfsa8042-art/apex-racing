"use client";
/**
 * CornerFactsPanel — objective, reference-free per-corner analysis.
 * Shows measured facts (entry / apex / exit speed, braking point & pressure,
 * throttle pickup, gear, coasting) plus any technique issues located in that
 * corner. No fabricated "vs pro" deltas — everything here is measured from the
 * lap itself. Used in diagnostic mode (no reference lap).
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Gauge, AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { ParsedLap, TrackSegment, DiagnosticsReport, Diagnostic } from "@/types/telemetry";

interface Fact {
  seg: TrackSegment;
  entry: number; apex: number; exit: number;
  peakBrake: number; avgBrake: number; brakeDurS: number;
  brakeBeforeApexM: number;
  throttleAfterApexM: number;
  gearApex: number | null;
  coastS: number;
  timeS: number;
  speeds: number[];
  brakeFrac: number; apexFrac: number;
  issues: Diagnostic[];
}

const SEV = {
  high:   { c: "#f87171", icon: AlertTriangle },
  medium: { c: "#facc15", icon: AlertCircle },
  low:    { c: "#60a5fa", icon: Info },
} as const;

function buildFacts(lap: ParsedLap, segs: TrackSegment[], diag?: DiagnosticsReport): Fact[] {
  const rows = lap.rows;
  const dt = lap.sampleRateHz > 0 ? 1 / lap.sampleRateHz : 0.02;
  return segs.map(s => {
    const a = Math.max(0, s.startIdx), b = Math.min(rows.length - 1, s.endIdx);
    const slice = rows.slice(a, b + 1);
    const speeds = slice.map(r => r.speed);
    let peakBrake = 0, brakeCount = 0, coastCount = 0;
    for (const r of slice) {
      const br = r.brake ?? 0, th = r.throttle ?? 0;
      if (br > peakBrake) peakBrake = br;
      if (br > 10) brakeCount++;
      if (br < 4 && th < 4) coastCount++;
    }
    const apexIdx = s.apexIdx ?? Math.floor((a + b) / 2);
    const apexDist = s.apexDist ?? rows[apexIdx]?.lapDist ?? 0;
    const minLap = rows[a]?.lapDist ?? 0;
    const maxLap = rows[b]?.lapDist ?? minLap + 1;
    const span = Math.max(1, maxLap - minLap);
    const issues = (diag?.diagnostics ?? []).filter(d =>
      (d.corner && d.corner === s.label) ||
      (d.startDist >= minLap - 5 && d.startDist <= maxLap + 5));
    return {
      seg: s,
      entry: Math.round(rows[a]?.speed ?? s.maxSpeed),
      apex: Math.round(s.apexSpeed ?? s.minSpeed),
      exit: Math.round(rows[b]?.speed ?? s.minSpeed),
      peakBrake: Math.round(peakBrake),
      avgBrake: Math.round(s.avgBrake ?? 0),
      brakeDurS: brakeCount * dt,
      brakeBeforeApexM: s.brakeStartDist != null ? Math.max(0, apexDist - s.brakeStartDist) : 0,
      throttleAfterApexM: s.throttleOpenDist != null ? Math.max(0, s.throttleOpenDist - apexDist) : 0,
      gearApex: rows[apexIdx]?.gear ?? null,
      coastS: coastCount * dt,
      timeS: (s.timeMs ?? 0) / 1000,
      speeds,
      brakeFrac: s.brakeStartDist != null ? Math.max(0, Math.min(1, ((s.brakeStartDist) - minLap) / span)) : -1,
      apexFrac: Math.max(0, Math.min(1, (apexDist - minLap) / span)),
      issues,
    };
  });
}

function SpeedTrace({ fact }: { fact: Fact }) {
  const { speeds, brakeFrac, apexFrac } = fact;
  if (speeds.length < 2) return null;
  const W = 320, H = 60, P = 6;
  const lo = Math.min(...speeds), hi = Math.max(...speeds);
  const range = Math.max(1, hi - lo);
  const x = (i: number) => P + (i / (speeds.length - 1)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - lo) / range) * (H - 2 * P);
  const line = speeds.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const bx = brakeFrac >= 0 ? P + brakeFrac * (W - 2 * P) : -1;
  const ax = P + apexFrac * (W - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <polyline points={line} fill="none" stroke="#a3e635" strokeWidth={1.5} strokeLinejoin="round" />
      {bx >= 0 && (
        <g>
          <line x1={bx} y1={P} x2={bx} y2={H - P} stroke="#f87171" strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
          <text x={bx + 2} y={P + 7} fontSize={7} fill="#f87171" fontFamily="monospace">тормоз</text>
        </g>
      )}
      <g>
        <line x1={ax} y1={P} x2={ax} y2={H - P} stroke="#60a5fa" strokeWidth={1} strokeDasharray="3,2" opacity={0.7} />
        <text x={ax + 2} y={H - P - 1} fontSize={7} fill="#60a5fa" fontFamily="monospace">апекс</text>
      </g>
    </svg>
  );
}

function Stat({ label, value, unit, tone }: { label: string; value: string | number; unit?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-2.5 py-2">
      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-mono font-bold tabular-nums" style={{ color: tone ?? "#e4e4e7" }}>
        {value}<span className="text-[9px] text-zinc-600 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

export function CornerFactsPanel({ lap, segments, diagnostics }: {
  lap: ParsedLap | null;
  segments: TrackSegment[];
  diagnostics?: DiagnosticsReport;
}) {
  const facts = useMemo(() => (lap ? buildFacts(lap, segments, diagnostics) : []), [lap, segments, diagnostics]);
  const [sel, setSel] = useState(0);

  if (!lap || facts.length === 0) {
    return (
      <div className="px-4 py-12 text-center space-y-2">
        <p className="text-xs text-zinc-500">Повороты не обнаружены</p>
        <p className="text-[10px] text-zinc-600">На этом круге не выделено отдельных поворотов</p>
      </div>
    );
  }

  const f = facts[Math.min(sel, facts.length - 1)];

  return (
    <div>
      {/* Selector chips */}
      <div className="px-3 py-2.5 border-b border-zinc-800/60 flex flex-wrap gap-1">
        {facts.map((ff, i) => (
          <button key={ff.seg.id} onClick={() => setSel(i)}
            className={cn("px-2 py-1 rounded-lg text-[10px] font-mono border transition-all",
              i === sel ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                        : "border-zinc-800/80 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300")}>
            {ff.seg.label}
            {ff.issues.length > 0 && (
              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: "#facc15" }} />
            )}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3">
        {/* Speed flow */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider mb-2">Скорость по повороту</p>
          <div className="flex items-center justify-between mb-2">
            <div className="text-center">
              <p className="text-lg font-mono font-bold tabular-nums text-zinc-200">{f.entry}</p>
              <p className="text-[8px] text-zinc-500 uppercase">вход</p>
            </div>
            <ArrowRight size={12} className="text-zinc-700" />
            <div className="text-center">
              <p className="text-lg font-mono font-bold tabular-nums text-blue-400">{f.apex}</p>
              <p className="text-[8px] text-zinc-500 uppercase">апекс</p>
            </div>
            <ArrowRight size={12} className="text-zinc-700" />
            <div className="text-center">
              <p className="text-lg font-mono font-bold tabular-nums text-lime-400">{f.exit}</p>
              <p className="text-[8px] text-zinc-500 uppercase">выход</p>
            </div>
            <div className="text-center border-l border-zinc-800 pl-3 ml-1">
              <p className="text-sm font-mono tabular-nums text-zinc-400">{f.gearApex ?? "—"}</p>
              <p className="text-[8px] text-zinc-500 uppercase">перед.</p>
            </div>
          </div>
          <SpeedTrace fact={f} />
          <p className="text-[9px] font-mono text-zinc-600 text-right">км/ч · {f.timeS.toFixed(1)}с в повороте</p>
        </div>

        {/* Braking + throttle facts */}
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Торможение до апекса" value={f.brakeBeforeApexM > 0 ? f.brakeBeforeApexM.toFixed(0) : "—"} unit="м" tone="#f87171" />
          <Stat label="Пиковый тормоз" value={f.peakBrake} unit="%" tone={f.peakBrake >= 90 ? "#a3e635" : "#facc15"} />
          <Stat label="Газ после апекса" value={f.throttleAfterApexM > 0 ? f.throttleAfterApexM.toFixed(0) : "0"} unit="м" tone="#4ade80" />
          <Stat label="Накат в повороте" value={f.coastS.toFixed(1)} unit="с" tone={f.coastS > 0.3 ? "#facc15" : "#a3e635"} />
        </div>

        {/* Issues in this corner */}
        {f.issues.length > 0 ? (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-3 py-2 bg-zinc-900/60 border-b border-zinc-800/60">
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Замечания в этом повороте</p>
            </div>
            {f.issues.map(d => {
              const sev = SEV[d.severity]; const Icon = sev.icon;
              return (
                <div key={d.id} className="px-3 py-2 border-b border-zinc-800/40 last:border-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon size={10} style={{ color: sev.c }} />
                    <span className="text-[11px] font-semibold text-zinc-200">{d.titleRu}</span>
                    <span className="text-[10px] font-mono font-bold ml-auto tabular-nums" style={{ color: sev.c }}>{d.metricRu}</span>
                  </div>
                  <p className="text-[10px] text-lime-400/80 leading-relaxed">→ {d.adviceRu}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-lime-400/5 border border-lime-400/15">
            <Gauge size={11} className="text-lime-400" />
            <p className="text-[10px] text-lime-300">Грубых ошибок в этом повороте не найдено</p>
          </div>
        )}

        <p className="text-[9px] text-zinc-600 leading-relaxed px-1">
          Объективные замеры с твоего круга. Загрузи эталонный круг (или накатай несколько), чтобы видеть разрыв по фазам.
        </p>
      </div>
    </div>
  );
}
