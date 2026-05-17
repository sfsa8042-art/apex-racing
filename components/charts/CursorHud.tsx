"use client";
/**
 * CursorHud — Coach Dave-style live values at cursor position.
 * Shows BIG comparison numbers: user vs ref at current point in lap.
 */

import { cn } from "@/lib/utils";
import type { ParsedLap } from "@/types/telemetry";

interface CursorHudProps {
  userLap:        ParsedLap | null;
  refLap?:        ParsedLap | null;
  cursorProgress: number | null;
}

function valueAt<T extends { time: number; speed: number; throttle: number; brake: number; gear: number; lapDist?: number }>(
  rows: T[], progress: number,
): T | null {
  if (!rows.length) return null;
  const idx = Math.min(Math.round(progress * rows.length), rows.length - 1);
  return rows[idx];
}

function Metric({
  label, userVal, refVal, unit, accent = "lime",
}: {
  label: string; userVal: number; refVal?: number; unit: string;
  accent?: "lime" | "green" | "red" | "yellow" | "blue";
}) {
  const colors = {
    lime: "text-lime-400", green: "text-green-400", red: "text-red-400",
    yellow: "text-yellow-400", blue: "text-blue-400",
  };
  const diff = refVal != null ? userVal - refVal : null;
  const hasDelta = diff != null && Math.abs(diff) > 0.5;
  const isPositive = (diff ?? 0) > 0;
  const isMore = (label === "СКОР" || label === "ГАЗ") ? isPositive : !isPositive;

  return (
    <div className="flex flex-col px-3 py-1.5 border-r border-zinc-800/40 last:border-r-0 min-w-[78px]">
      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.15em] leading-none mb-0.5">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("font-mono font-bold tabular-nums leading-none text-base", colors[accent])}>
          {Math.round(userVal)}
        </span>
        <span className="text-[8px] font-mono text-zinc-700">{unit}</span>
      </div>
      {refVal != null && (
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[9px] font-mono tabular-nums text-zinc-500">
            ref {Math.round(refVal)}
          </span>
          {hasDelta && (
            <span className={cn("text-[8px] font-mono font-bold tabular-nums",
              isMore ? "text-lime-400" : "text-red-400")}>
              {diff > 0 ? "+" : ""}{Math.round(diff)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function CursorHud({ userLap, refLap, cursorProgress }: CursorHudProps) {
  if (!userLap || cursorProgress == null) return null;

  const userRow = valueAt(userLap.rows, cursorProgress);
  const refRow  = refLap ? valueAt(refLap.rows, cursorProgress) : null;
  if (!userRow) return null;

  const distM = userRow.lapDist ?? 0;
  const distPct = (cursorProgress * 100).toFixed(1);

  return (
    <div className="flex items-stretch shrink-0 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-sm overflow-x-auto">
      {/* Position indicator */}
      <div className="flex flex-col px-4 py-1.5 border-r border-zinc-800/60 min-w-[110px]">
        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.15em] leading-none mb-0.5">
          Позиция
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono font-bold tabular-nums leading-none text-base text-zinc-200">
            {Math.round(distM)}
          </span>
          <span className="text-[8px] font-mono text-zinc-700">м</span>
        </div>
        <span className="text-[9px] font-mono text-zinc-500 mt-0.5">{distPct}% круга</span>
      </div>

      <Metric label="СКОР" userVal={userRow.speed} refVal={refRow?.speed} unit="km/h" accent="lime"/>
      <Metric label="ГАЗ"  userVal={userRow.throttle} refVal={refRow?.throttle} unit="%" accent="green"/>
      <Metric label="ТОРМ" userVal={userRow.brake} refVal={refRow?.brake} unit="%" accent="red"/>

      <div className="flex flex-col px-3 py-1.5 border-r border-zinc-800/40 min-w-[60px]">
        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.15em] leading-none mb-0.5">
          ПЕР
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono font-bold tabular-nums leading-none text-base text-yellow-400">
            {userRow.gear < 0 ? "R" : userRow.gear === 0 ? "N" : userRow.gear}
          </span>
        </div>
        {refRow && refRow.gear !== userRow.gear && (
          <span className="text-[9px] font-mono text-zinc-500 mt-0.5">
            ref {refRow.gear < 0 ? "R" : refRow.gear === 0 ? "N" : refRow.gear}
          </span>
        )}
      </div>

      {userRow.steerAngle !== undefined && (
        <Metric
          label="РУЛЬ"
          userVal={Math.abs(userRow.steerAngle)}
          refVal={refRow?.steerAngle !== undefined ? Math.abs(refRow.steerAngle) : undefined}
          unit="°"
          accent="blue"
        />
      )}

      <div className="flex-1 flex items-center justify-end px-4 gap-1.5">
        <div className="w-1 h-1 rounded-full bg-lime-400 animate-pulse"/>
        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">live cursor</span>
      </div>
    </div>
  );
}
