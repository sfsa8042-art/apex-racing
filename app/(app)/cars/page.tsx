"use client";
import { useState } from "react";
import { Zap, Weight, Gauge, ChevronRight, AlertCircle, CheckCircle, Info, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { mockCars } from "@/lib/mockData";
import { getTrackSetupPlan, type Condition } from "@/lib/setup/engine";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import type { Car, SetupHint } from "@/types";

const IMPACT_CONFIG = {
  high:   { color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/25"    },
  medium: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/25" },
  low:    { color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/25"   },
};

const CAT_COLORS: Record<SetupHint["category"], string> = {
  suspension: "text-purple-400", aero: "text-blue-400",
  differential: "text-orange-400", brake: "text-red-400", tyres: "text-yellow-400",
};

const TRACKS = [
  { id: "monza",       label: "Monza"       },
  { id: "spa",         label: "Spa"         },
  { id: "silverstone", label: "Silverstone" },
  { id: "nurburgring", label: "Nürburgring" },
];

function CarCard({ car, isSelected, onSelect }: { car: Car; isSelected: boolean; onSelect: () => void }) {
  return (
    <div onClick={onSelect}
      className={cn("rounded-xl border p-4 cursor-pointer transition-all",
        isSelected ? "border-lime-400/40 bg-zinc-900 ring-1 ring-lime-400/20" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700")}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-zinc-400 font-mono">{car.manufacturer.slice(0,2).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-zinc-500 font-mono">{car.manufacturer}</p>
              <p className="text-sm font-medium text-zinc-100">{car.name}</p>
            </div>
            <Badge variant="muted">{car.class}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
              <Zap size={10} className="text-yellow-400" />{car.powerHp}hp
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
              <Gauge size={10} className="text-blue-400" />{car.topSpeedKmh}km/h
            </span>
            {car.yourBestLap && (
              <span className="text-xs font-mono tabular text-lime-400 ml-auto">PB: {car.yourBestLap}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-zinc-500 w-24 shrink-0">{label}</p>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-lime-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-mono tabular text-zinc-400 w-10 text-right">{value}</p>
    </div>
  );
}

function CarDetail({ car }: { car: Car }) {
  const { t } = useLang();
  const [activeTab,    setActiveTab]    = useState<"overview" | "setup" | "tracksetup">("overview");
  const [selectedTrack, setSelectedTrack] = useState("monza");
  const [condition,    setCondition]    = useState<Condition>("dry");

  const trackPlan = getTrackSetupPlan(car.id, selectedTrack, condition);

  const conditionLabels: Record<Condition, string> = {
    dry:          t.cars.conditions.dry,
    wet:          t.cars.conditions.wet,
    intermediate: t.cars.conditions.intermediate,
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-mono text-zinc-500 mb-0.5">{car.manufacturer} · {car.class}</p>
            <h2 className="text-2xl font-semibold text-zinc-100">{car.name}</h2>
            {car.yourBestLap && (
              <p className="text-sm text-zinc-400 mt-1">Best: <span className="text-lime-400 font-mono">{car.yourBestLap}</span></p>
            )}
          </div>
          <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <span className="text-2xl font-bold text-zinc-600 font-mono">{car.manufacturer.slice(0,2).toUpperCase()}</span>
          </div>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">{car.description}</p>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Zap,    label: t.cars.stats.power,    value: `${car.powerHp} hp`,      color: "text-yellow-400" },
          { icon: Weight, label: t.cars.stats.weight,   value: `${car.weightKg} kg`,     color: "text-blue-400"   },
          { icon: Gauge,  label: t.cars.stats.topSpeed, value: `${car.topSpeedKmh} km/h`,color: "text-lime-400"   },
          { icon: ChevronRight, label: t.cars.stats.accel, value: `${car.acceleration0to100}s`, color: "text-red-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon size={12} className={color} />
              <p className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">{label}</p>
            </div>
            <p className="text-sm font-mono font-medium text-zinc-200">{value}</p>
          </div>
        ))}
      </div>

      {/* Performance bars */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <p className="text-xs font-medium text-zinc-400 mb-3">Performance Profile</p>
        <StatBar label={t.cars.stats.power}     value={car.powerHp}       max={650} />
        <StatBar label={t.cars.stats.topSpeed} value={car.topSpeedKmh}   max={320} />
        <StatBar label={"Braking"}   value={100 - Math.round(car.acceleration0to100 * 20)} />
        <StatBar label={"Handling"}  value={car.drivetrain === "AWD" ? 85 : 75} />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 mb-3 flex-wrap">
          {(["overview", "setup", "tracksetup"] as const).map((tab) => {
            const labels = { overview: t.cars.overview, setup: t.cars.setup, tracksetup: t.cars.trackSetup };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                  activeTab === tab ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 border border-zinc-800")}>
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            <div className="rounded-xl border border-lime-400/20 bg-lime-400/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={14} className="text-lime-400" />
                <p className="text-xs font-medium text-lime-400">{t.cars.strengths}</p>
              </div>
              <ul className="space-y-2">
                {car.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-xs text-zinc-300">
                    <span className="text-lime-400 mt-0.5 shrink-0">+</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={14} className="text-red-400" />
                <p className="text-xs font-medium text-red-400">{t.cars.weaknesses}</p>
              </div>
              <ul className="space-y-2">
                {car.weaknesses.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-xs text-zinc-300">
                    <span className="text-red-400 mt-0.5 shrink-0">–</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Generic setup hints */}
        {activeTab === "setup" && (
          <div className="space-y-2 animate-fade-in">
            {car.setupHints.map((hint) => {
              const imp = IMPACT_CONFIG[hint.impact];
              return (
                <div key={hint.parameter} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-mono uppercase tracking-wide", CAT_COLORS[hint.category])}>{hint.category}</span>
                      <span className="text-zinc-700">·</span>
                      <p className="text-sm font-medium text-zinc-200">{hint.parameter}</p>
                    </div>
                    <span className={cn("text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0", imp.color, imp.bg, imp.border)}>
                      {t.cars.impact[hint.impact]}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Info size={12} className="text-zinc-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed">{hint.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Track-specific setup */}
        {activeTab === "tracksetup" && (
          <div className="animate-fade-in space-y-3">
            {/* Track + condition selectors */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <MapPin size={12} className="text-lime-400" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mr-1">{t.cars.selectTrack}</span>
                {TRACKS.map((tr) => (
                  <button key={tr.id} onClick={() => setSelectedTrack(tr.id)}
                    className={cn("px-2.5 py-1 rounded-md text-xs font-mono transition-colors",
                      selectedTrack === tr.id ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>
                    {tr.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 ml-auto">
                {(["dry", "wet", "intermediate"] as Condition[]).map((c) => (
                  <button key={c} onClick={() => setCondition(c)}
                    className={cn("px-2.5 py-1 rounded-md text-xs font-mono transition-colors",
                      condition === c ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")}>
                    {conditionLabels[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-lime-400/20 bg-lime-400/5 p-3">
              <p className="text-xs font-medium text-lime-400 mb-1">
                {trackPlan.trackName} · {conditionLabels[condition]}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">{trackPlan.keySummary}</p>
            </div>

            {/* Recommendations */}
            {trackPlan.recommendations.map((rec, i) => {
              const imp = IMPACT_CONFIG[rec.impact];
              return (
                <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-mono uppercase tracking-wide", CAT_COLORS[rec.category as keyof typeof CAT_COLORS] ?? "text-zinc-500")}>{rec.category}</span>
                      <span className="text-zinc-700">·</span>
                      <p className="text-sm font-medium text-zinc-200">{rec.parameter}</p>
                    </div>
                    <span className={cn("text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0", imp.color, imp.bg, imp.border)}>
                      {t.cars.impact[rec.impact]}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-zinc-200 mb-1">{rec.change}</p>
                  <div className="flex items-start gap-2">
                    <Info size={12} className="text-zinc-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-zinc-400 leading-relaxed">{rec.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Button variant="primary" className="w-full">
        {t.cars.analyzeLaps.replace("{name}", car.name)} <ChevronRight size={14} />
      </Button>
    </div>
  );
}

export default function CarsPage() {
  const { t } = useLang();
  const [selectedCar, setSelectedCar] = useState<Car>(mockCars[0]);

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">{t.cars.title}</p>
        <h1 className="text-2xl font-semibold text-zinc-100">{t.cars.subtitle}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t.cars.available.replace("{n}", String(mockCars.length))}</p>
      </div>
      <div className="flex gap-6">
        <div className="w-64 shrink-0 space-y-2">
          {mockCars.map((car) => (
            <CarCard key={car.id} car={car} isSelected={selectedCar?.id === car.id} onSelect={() => setSelectedCar(car)} />
          ))}
        </div>
        <div className="flex-1 min-w-0">
          {selectedCar && <CarDetail car={selectedCar} />}
        </div>
      </div>
    </div>
  );
}
