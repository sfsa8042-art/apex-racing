import { useState } from "react";
import {
  FolderOpen, Play, Square, CheckCircle2, XCircle, Loader2,
  Clock, RefreshCw, Radio, FileText, Zap,
} from "lucide-react";
import type { UploadTask, AppSettings } from "../types";
import type { FileDetectedEvent } from "../types";

interface Props {
  tasks:           UploadTask[];
  settings:        AppSettings | null;
  watcherActive:   boolean;
  lastDetected:    FileDetectedEvent | null;
  onRetry:         () => void;
  onSelectFolder:  () => void;
  onStartWatching: () => Promise<void>;
  onStopWatching:  () => Promise<void>;
}

function fmtSize(b: number) {
  return b < 1048576 ? `${(b/1024).toFixed(0)} КБ` : `${(b/1048576).toFixed(1)} МБ`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru", { hour:"2-digit", minute:"2-digit" });
}
function fmtAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5)  return "только что";
  if (s < 60) return `${s}с назад`;
  return `${Math.floor(s/60)}м назад`;
}

// ─── Empty / onboarding state ─────────────────────────────────────────────────
function OnboardingState({ onSelectFolder, settings, onStartWatching, onStopWatching, watcherActive }: {
  onSelectFolder: () => void;
  settings: AppSettings | null;
  watcherActive: boolean;
  onStartWatching: () => Promise<void>;
  onStopWatching: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (watcherActive) await onStopWatching();
      else await onStartWatching();
    } finally {
      setLoading(false);
    }
  };

  const hasFolder = !!settings?.watch_folder;

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 gap-5">
      {/* Big status graphic */}
      {!hasFolder ? (
        <>
          {/* Step 1 — select folder */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--surface-3)", border: "1.5px dashed var(--border-strong)" }}>
            <FolderOpen size={26} style={{ color: "var(--text-3)" }}/>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Выбери папку телеметрии</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-3)" }}>
              Новые файлы будут загружаться автоматически после каждой сессии
            </p>
          </div>
          <button onClick={onSelectFolder}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
            style={{ background: "var(--lime)", color: "#09090b", boxShadow: "0 4px 20px rgba(163,230,53,0.25)" }}>
            <FolderOpen size={14}/> Выбрать папку
          </button>
          {/* Simulator hints */}
          <div className="w-full rounded-xl p-3 space-y-1.5"
            style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}>
            {[
              ["iRacing",   "Documents\\iRacing\\telemetry"],
              ["ACC",       "Documents\\Assetto Corsa Competizione\\MoTeC"],
              ["rFactor 2", "rFactor2\\UserData\\Log\\Results"],
            ].map(([sim, path]) => (
              <div key={sim} className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--lime)", minWidth: 56 }}>{sim}</span>
                <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-3)" }}>{path}</span>
              </div>
            ))}
          </div>
        </>
      ) : !watcherActive ? (
        <>
          {/* Step 2 — start watching */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
            style={{ background: "var(--lime-dim)", border: "1.5px solid var(--lime-border)" }}>
            <Radio size={28} style={{ color: "var(--lime)" }}/>
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Готово к запуску</p>
            <p className="text-xs font-mono truncate max-w-[240px]" style={{ color: "var(--text-3)" }}>
              {settings.watch_folder?.split(/[/\\]/).pop()}
            </p>
          </div>
          <button onClick={handleToggle} disabled={loading}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
            style={{ background: "var(--lime)", color: "#09090b", boxShadow: "0 4px 20px rgba(163,230,53,0.25)" }}>
            {loading
              ? <Loader2 size={15} className="animate-spin"/>
              : <Play size={15} fill="currentColor"/>
            }
            Запустить мониторинг
          </button>
          <button onClick={onSelectFolder}
            className="text-[11px] font-mono transition-colors hover:text-zinc-400"
            style={{ color: "var(--text-3)" }}>
            изменить папку
          </button>
        </>
      ) : (
        <>
          {/* Active — no files yet */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center relative"
            style={{ background: "var(--lime-dim)", border: "1.5px solid var(--lime-border)" }}>
            <div className="w-16 h-16 rounded-full absolute" style={{
              background: "var(--lime-dim)",
              animation: "ring-pulse 1.8s ease-out infinite"
            }}/>
            <Radio size={26} style={{ color: "var(--lime)" }}/>
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold" style={{ color: "var(--lime)" }}>Мониторинг активен</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Ожидание новых файлов…</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task }: { task: UploadTask }) {
  const cfg = {
    done:      { icon: CheckCircle2, color: "text-lime-400",  bg: "bg-lime-400/8",  border: "border-lime-400/15",  label: "загружено"   },
    uploading: { icon: Loader2,      color: "text-blue-400",  bg: "bg-blue-400/5",  border: "border-blue-400/15",  label: "загрузка…"   },
    pending:   { icon: Clock,        color: "text-zinc-500",  bg: "bg-zinc-800/40", border: "border-zinc-700/40",  label: "ожидание"    },
    failed:    { icon: XCircle,      color: "text-red-400",   bg: "bg-red-400/6",   border: "border-red-400/15",   label: "ошибка"      },
  }[task.status];

  const Icon = cfg.icon;
  const isUploading = task.status === "uploading";
  const progress = task.progress ?? (isUploading ? null : undefined);

  return (
    <div className={`relative flex items-center gap-3 px-4 py-3 enter ${cfg.bg} border-b`}
      style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      {/* Progress track (behind content) */}
      {isUploading && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="h-full shimmer opacity-40"
            style={{ width: progress ? `${progress}%` : "40%" }}/>
        </div>
      )}

      <div className="relative">
        <Icon size={15} className={`${cfg.color} ${isUploading ? "animate-spin" : ""} shrink-0`}/>
      </div>

      <div className="flex-1 min-w-0 relative">
        <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}
          title={task.filename}>{task.filename}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-mono ${cfg.color}`}>{cfg.label}</span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>
            {fmtSize(task.size)}
          </span>
          {task.status === "done" && (
            <span className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>
              {fmtAgo(task.queued_at)}
            </span>
          )}
          {task.attempts > 1 && task.status !== "done" && (
            <span className="text-[10px] font-mono text-yellow-500">
              попытка {task.attempts}
            </span>
          )}
        </div>
        {task.error && (
          <p className="text-[10px] font-mono text-red-400 truncate mt-0.5" title={task.error}>
            {task.error}
          </p>
        )}
      </div>

      <span className="text-[10px] font-mono shrink-0 relative" style={{ color: "var(--text-3)" }}>
        {fmtTime(task.queued_at)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function UploadQueue({
  tasks, settings, watcherActive, lastDetected,
  onRetry, onSelectFolder, onStartWatching, onStopWatching,
}: Props) {
  const [toggling, setToggling] = useState(false);
  const hasFiles = tasks.length > 0;
  const hasFailed = tasks.some(t => t.status === "failed");
  const pending = tasks.filter(t => t.status === "pending" || t.status === "uploading").length;
  const done    = tasks.filter(t => t.status === "done").length;

  const handleToggle = async () => {
    setToggling(true);
    try {
      if (watcherActive) await onStopWatching();
      else await onStartWatching();
    } finally {
      setToggling(false);
    }
  };

  // Show onboarding if no files and not monitoring
  if (!hasFiles && !watcherActive) {
    return (
      <OnboardingState
        settings={settings}
        watcherActive={watcherActive}
        onSelectFolder={onSelectFolder}
        onStartWatching={onStartWatching}
        onStopWatching={onStopWatching}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Control strip ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] font-mono flex-1">
          {pending > 0 && (
            <span className="text-blue-400 flex items-center gap-1">
              <Loader2 size={10} className="animate-spin"/>
              {pending}
            </span>
          )}
          {done > 0 && (
            <span style={{ color: "var(--lime)" }}>✓ {done}</span>
          )}
          {hasFailed && (
            <span className="text-red-400">✗ {tasks.filter(t=>t.status==="failed").length}</span>
          )}
          {lastDetected && (
            <span className="truncate max-w-[120px]" style={{ color: "var(--text-3)" }}
              title={lastDetected.filename}>
              {lastDetected.filename.split(/[/\\]/).pop()}
            </span>
          )}
        </div>

        {/* Retry failed */}
        {hasFailed && (
          <button onClick={onRetry}
            className="flex items-center gap-1 text-[10px] font-mono text-yellow-500 hover:text-yellow-400 transition-colors">
            <RefreshCw size={10}/> повтор
          </button>
        )}

        {/* Watch toggle */}
        {settings?.watch_folder && (
          <button onClick={handleToggle} disabled={toggling}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              watcherActive
                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                : "text-zinc-950 hover:opacity-90"
            }`}
            style={watcherActive ? {} : { background: "var(--lime)" }}>
            {toggling
              ? <Loader2 size={10} className="animate-spin"/>
              : watcherActive ? <Square size={10} fill="currentColor"/> : <Play size={10} fill="currentColor"/>
            }
            {watcherActive ? "Стоп" : "Старт"}
          </button>
        )}
      </div>

      {/* ── File list ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {[...tasks].reverse().map(task => (
          <TaskRow key={task.id} task={task}/>
        ))}

        {/* Watching but no files yet */}
        {hasFiles === false && watcherActive && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 enter">
            <div className="w-10 h-10 rounded-full relative flex items-center justify-center"
              style={{ background: "var(--lime-dim)", border: "1px solid var(--lime-border)" }}>
              <Radio size={18} style={{ color: "var(--lime)" }}/>
            </div>
            <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
              Слежу за папкой…<br/>
              <span className="font-mono">{settings?.watch_folder?.split(/[/\\]/).pop()}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
