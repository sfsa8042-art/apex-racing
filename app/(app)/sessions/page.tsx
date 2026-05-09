"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Activity, Clock, CheckCircle, AlertCircle, Loader,
  Monitor, Globe, ChevronRight, RefreshCw, Gauge,
  TrendingDown, Upload, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { TelemetrySession } from "@/lib/storage/sessions";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus = TelemetrySession["status"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(s: SessionStatus) {
  const map = {
    pending:    { label: "В очереди",   icon: Clock,        color: "text-zinc-500",  bg: "bg-zinc-500/10", border: "border-zinc-500/25" },
    processing: { label: "Анализ...",   icon: Loader,       color: "text-blue-400",  bg: "bg-blue-400/10", border: "border-blue-400/25" },
    ready:      { label: "Готово",      icon: CheckCircle,  color: "text-lime-400",  bg: "bg-lime-400/10", border: "border-lime-400/25" },
    error:      { label: "Ошибка",      icon: AlertCircle,  color: "text-red-400",   bg: "bg-red-400/10",  border: "border-red-400/25"  },
  };
  return map[s] ?? map.pending;
}

function formatLapTime(ms: number | null): string {
  if (!ms) return "—";
  const m   = Math.floor(ms / 60000);
  const s   = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "только что";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} ч назад`;
  return new Date(iso).toLocaleDateString("ru");
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: TelemetrySession }) {
  const cfg      = statusConfig(session.status);
  const StatusIcon = cfg.icon;
  const isDesktop = session.source === "desktop";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-all group">
      <div className="flex items-start gap-3 p-4">
        {/* Source icon */}
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
          session.status === "ready" ? "bg-lime-400/10" : "bg-zinc-800"
        )}>
          {isDesktop
            ? <Monitor size={16} className={session.status === "ready" ? "text-lime-400" : "text-zinc-500"} />
            : <Globe   size={16} className={session.status === "ready" ? "text-lime-400" : "text-zinc-500"} />
          }
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="text-sm font-medium text-zinc-100 truncate" title={session.filename}>
                {session.filename}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {session.detectedTrack && (
                  <span className="text-xs text-zinc-400">{session.detectedTrack}</span>
                )}
                {session.detectedCar && (
                  <span className="text-xs text-zinc-500">{session.detectedCar}</span>
                )}
                {!session.detectedTrack && !session.detectedCar && (
                  <span className="text-xs text-zinc-600">Трасса не определена</span>
                )}
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border shrink-0",
              cfg.color, cfg.bg, cfg.border
            )}>
              <StatusIcon
                size={10}
                className={session.status === "processing" ? "animate-spin" : ""}
              />
              {cfg.label}
            </div>
          </div>

          {/* Stats row */}
          {session.status === "ready" && (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {session.lapTimeMs && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Время</p>
                  <p className="text-sm font-mono tabular text-lime-400">{formatLapTime(session.lapTimeMs)}</p>
                </div>
              )}
              {session.totalDeltaMs !== null && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Разрыв</p>
                  <p className={cn("text-sm font-mono tabular", session.totalDeltaMs > 0 ? "text-red-400" : "text-lime-400")}>
                    {session.totalDeltaMs > 0 ? "+" : ""}
                    {(session.totalDeltaMs / 1000).toFixed(3)}с
                  </p>
                </div>
              )}
              {session.overallScore !== null && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Оценка</p>
                  <p className="text-sm font-mono tabular text-zinc-200">{session.overallScore}<span className="text-zinc-600">/100</span></p>
                </div>
              )}
              {session.insightsCount !== null && session.insightsCount > 0 && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Проблем</p>
                  <p className="text-sm font-mono tabular text-yellow-400">{session.insightsCount}</p>
                </div>
              )}
            </div>
          )}

          {session.error && (
            <p className="text-xs text-red-400 mt-1.5 bg-red-400/5 border border-red-400/20 rounded px-2 py-1">
              {session.error}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-mono">
              <span>{isDesktop ? "Десктоп" : "Браузер"}</span>
              <span>·</span>
              <span>{formatSize(session.sizeBytes)}</span>
              <span>·</span>
              <span>{relativeTime(session.uploadedAt)}</span>
            </div>
            {session.status === "ready" && (
              <Link href="/telemetry" className="flex items-center gap-1 text-[11px] font-mono text-lime-400 hover:text-lime-300 transition-colors">
                Анализ <ChevronRight size={11} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ sessions }: { sessions: TelemetrySession[] }) {
  const ready    = sessions.filter((s) => s.status === "ready").length;
  const pending  = sessions.filter((s) => s.status === "pending" || s.status === "processing").length;
  const desktop  = sessions.filter((s) => s.source === "desktop").length;
  const avgScore = sessions.filter((s) => s.overallScore !== null).length > 0
    ? Math.round(sessions.filter((s) => s.overallScore !== null)
        .reduce((a, s) => a + (s.overallScore ?? 0), 0) /
        sessions.filter((s) => s.overallScore !== null).length)
    : null;

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {[
        { label: "Всего сессий",    value: sessions.length, icon: Activity,    color: "text-zinc-100" },
        { label: "Готово к анализу", value: ready,          icon: CheckCircle, color: "text-lime-400" },
        { label: "С десктопа",      value: desktop,         icon: Monitor,     color: "text-blue-400" },
        { label: "Ср. оценка",      value: avgScore ?? "—", icon: Gauge,       color: "text-yellow-400" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon size={12} className={color} />
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</p>
          </div>
          <p className={cn("text-2xl font-semibold tabular tracking-tight font-mono", color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const [sessions, setSessions]   = useState<TelemetrySession[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [filter,   setFilter]     = useState<"all" | "desktop" | "browser" | "ready">("all");

  const fetchSessions = useCallback(async () => {
    try {
      const res  = await fetch("/api/sessions");
      const data = await res.json();
      if (data.ok) setSessions(data.sessions ?? []);
    } catch {
      // silently fail in UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every 5s to pick up processing completions
    const id = setInterval(fetchSessions, 5000);
    return () => clearInterval(id);
  }, [fetchSessions]);

  const filtered = sessions.filter((s) => {
    if (filter === "desktop") return s.source === "desktop";
    if (filter === "browser") return s.source === "browser";
    if (filter === "ready")   return s.status === "ready";
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Сессии</p>
          <h1 className="text-2xl font-semibold text-zinc-100">Загруженные круги</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Все сессии из десктопного клиента и браузера
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchSessions}>
            <RefreshCw size={13} />
            Обновить
          </Button>
          <Link href="/telemetry">
            <Button variant="primary" size="sm">
              <Upload size={13} />
              Загрузить круг
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-lime-400 border-t-transparent animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
            <Activity size={28} className="text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-300 mb-2">Нет загруженных сессий</p>
          <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
            Установите десктопный клиент APEX для автоматической загрузки телеметрии, или загрузите файл вручную.
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-sm text-zinc-400">
              <Monitor size={14} className="text-lime-400" />
              APEX Desktop — авто-загрузка
            </div>
            <Link href="/telemetry">
              <Button variant="primary">
                <Upload size={14} />
                Загрузить файл
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <StatsBar sessions={sessions} />

          {/* Desktop connection hint */}
          {sessions.filter((s) => s.source === "desktop").length === 0 && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-400/20 bg-blue-400/5">
              <Monitor size={15} className="text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-400">Нет сессий с десктопа</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Установите APEX Desktop для автоматической загрузки после каждой поездки.
                </p>
              </div>
              <Button variant="secondary" size="sm">Скачать</Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {([
              ["all",     "Все",         sessions.length],
              ["desktop", "Десктоп",     sessions.filter((s) => s.source === "desktop").length],
              ["browser", "Браузер",     sessions.filter((s) => s.source === "browser").length],
              ["ready",   "Готово",      sessions.filter((s) => s.status === "ready").length],
            ] as const).map(([key, label, count]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filter === key
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                )}>
                {label}
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
                  filter === key ? "bg-zinc-600 text-zinc-200" : "bg-zinc-800 text-zinc-600"
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Session list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">Нет сессий с выбранным фильтром</p>
            ) : (
              filtered.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
