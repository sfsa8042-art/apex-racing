"use client";
import { useCopy } from "../../../shared/i18n/react";
import { Wifi, WifiOff, Upload, Radio } from "lucide-react";
import type { FileDetectedEvent } from "../types";

interface Props {
  watcherActive:  boolean;
  queueDone:      number;
  queueFailed:    number;
  queuePending:   number;
  connected:      boolean | null;
  lastDetected?:  FileDetectedEvent;
}

export function StatusBar({ watcherActive, queueDone, queueFailed, queuePending, connected, lastDetected }: Props) {
  const copy = useCopy();
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 text-[11px] font-mono shrink-0">
      {/* Connection */}
      <div className="flex items-center gap-1.5">
        {connected === null   ? <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
         : connected          ? <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                              : <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
        <span className={connected ? "text-lime-400" : connected === false ? "text-red-400" : "text-zinc-600"}>
          {copy(connected === null ? "не проверено" : connected ? "подключено" : "нет связи")}
        </span>
      </div>

      <div className="flex-1" />

      {/* Queue stats */}
      {(queueDone > 0 || queueFailed > 0 || queuePending > 0) && (
        <div className="flex items-center gap-2">
          {queuePending > 0  && <span className="text-blue-400"><Upload size={9} className="inline mr-0.5"/>{copy(queuePending)}</span>}
          {queueDone > 0     && <span className="text-lime-400">✓{copy(queueDone)}</span>}
          {queueFailed > 0   && <span className="text-red-400">✗{copy(queueFailed)}</span>}
        </div>
      )}

      {/* Last detected file */}
      {lastDetected && (
        <span className="text-zinc-600 max-w-[120px] truncate" title={lastDetected.filename}>
          {lastDetected.filename}
        </span>
      )}

      {/* Watcher */}
      {watcherActive && (
        <div className="flex items-center gap-1 text-lime-400">
          <Radio size={9} className="animate-pulse" />
          <span>{copy("desktop.043")}</span>
        </div>
      )}
    </div>
  );
}
