"use client";
/**
 * DiagnosticsPanel — honest, reference-free technique findings.
 * Replaces the old "insights" that were derived from a fabricated reference.
 * Every item is an objectively measured fact with concrete advice — no made-up
 * time deltas.
 */

import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Gauge } from "lucide-react";
import type { DiagnosticsReport, Diagnostic } from "@/types/telemetry";

const SEV: Record<Diagnostic["severity"], { color: string; bg: string; border: string; icon: typeof AlertTriangle; label: string }> = {
  high:   { color: "#f87171", bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.18)", icon: AlertTriangle, label: "важно" },
  medium: { color: "#facc15", bg: "rgba(250,204,21,0.06)",  border: "rgba(250,204,21,0.18)",  icon: AlertCircle,   label: "средне" },
  low:    { color: "#60a5fa", bg: "rgba(96,165,250,0.06)",  border: "rgba(96,165,250,0.18)",  icon: Info,          label: "мелочь" },
};

const CAT_RU: Record<Diagnostic["category"], string> = {
  throttle: "Газ", brake: "Тормоз", steering: "Руль", traction: "Тяга",
};

function StatChip({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warn" | "good" }) {
  const c = tone === "warn" ? "#facc15" : tone === "good" ? "#a3e635" : "#a1a1aa";
  return (
    <div className="flex-1 rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-2.5 py-2">
      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-mono font-bold tabular-nums" style={{ color: c }}>{value}</p>
    </div>
  );
}

export function DiagnosticsPanel({ report }: { report?: DiagnosticsReport }) {
  if (!report || !report.hasData) {
    return (
      <div className="px-4 py-12 text-center text-sm text-zinc-500">Нет данных для анализа техники.</div>
    );
  }

  const { diagnostics } = report;

  return (
    <div>
      {/* Honest summary header */}
      <div className="px-4 py-3 border-b border-zinc-800/60 space-y-2.5">
        <div className="flex items-center gap-2">
          <Gauge size={13} className="text-lime-400" />
          <p className="text-xs font-semibold text-zinc-300">Анализ техники</p>
          <span className="ml-auto text-[10px] font-mono text-zinc-500">
            {diagnostics.length === 0 ? "чисто" : `${diagnostics.length} замечаний`}
          </span>
        </div>
        <div className="flex gap-1.5">
          <StatChip label="Накат" value={`${report.coastingTotalS.toFixed(1)}с`} tone={report.coastingTotalS > 0.8 ? "warn" : "good"} />
          <StatChip label="Газ+тормоз" value={`${report.overlapTotalS.toFixed(1)}с`} tone={report.overlapTotalS > 0.5 ? "warn" : "good"} />
          <StatChip label="Доторм." value={`${report.brakeStabs}`} tone={report.brakeStabs > 0 ? "warn" : "good"} />
          <StatChip label="Плавность" value={`${report.smoothnessScore}`} tone={report.smoothnessScore >= 80 ? "good" : "warn"} />
        </div>
        <p className="text-[10px] text-zinc-500 leading-relaxed">{report.summaryRu}</p>
      </div>

      {/* Findings */}
      {diagnostics.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center px-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center">
            <CheckCircle2 size={22} className="text-lime-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">Чистая техника</p>
            <p className="text-xs text-zinc-500 mt-1">Грубых ошибок ввода не обнаружено</p>
          </div>
        </div>
      ) : (
        <div>
          {diagnostics.map((d) => {
            const s = SEV[d.severity];
            const Icon = s.icon;
            return (
              <div key={d.id} className="px-4 py-3 border-b border-zinc-800/40 last:border-0">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                    <Icon size={10} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-zinc-200">{d.titleRu}</span>
                      {d.corner && <span className="text-[9px] font-mono text-zinc-500">{d.corner}</span>}
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.color }}>{CAT_RU[d.category]}</span>
                      <span className="text-[10px] font-mono font-bold ml-auto shrink-0 tabular-nums" style={{ color: s.color }}>{d.metricRu}</span>
                    </div>
                    <p className="text-[10.5px] text-zinc-400 leading-relaxed">{d.descriptionRu}</p>
                    <p className="text-[10px] text-lime-400/80 leading-relaxed">→ {d.adviceRu}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
