"use client";
import { useCopy, useLang, locales } from "../../../shared/i18n/react";

import { useState, useEffect, useCallback, useRef } from "react";
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
    pending:    { label: "В очереди",   icon: Clock,        color: "text-zinc-400",  bg: "bg-zinc-500/10", border: "border-zinc-500/25" },
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

function relativeTime(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)    return "только что";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} мин назад`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} ч назад`;
  return new Date(iso).toLocaleDateString(locale);
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: TelemetrySession }) {
  const copy = useCopy();
  const { lang: displayLang } = useLang();
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
            ? <Monitor size={16} className={session.status === "ready" ? "text-lime-400" : "text-zinc-400"} />
            : <Globe   size={16} className={session.status === "ready" ? "text-lime-400" : "text-zinc-400"} />
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
                  <span className="text-xs text-zinc-400">{copy(session.detectedTrack)}</span>
                )}
                {session.detectedCar && (
                  <span className="text-xs text-zinc-400">{copy(session.detectedCar)}</span>
                )}
                {!session.detectedTrack && !session.detectedCar && (
                  <span className="text-xs text-zinc-600">{copy("ui.120")}</span>
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
              {copy(cfg.label)}
            </div>
          </div>

          {/* Stats row */}
          {session.status === "ready" && (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {session.lapTimeMs && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-0.5">{copy("ui.121")}</p>
                  <p className="text-sm font-mono tabular text-lime-400">{copy(formatLapTime(session.lapTimeMs))}</p>
                </div>
              )}
              {session.totalDeltaMs !== null && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-0.5">{copy("ui.122")}</p>
                  <p className={cn("text-sm font-mono tabular", session.totalDeltaMs > 0 ? "text-red-400" : "text-lime-400")}>
                    {copy(session.totalDeltaMs > 0 ? "+" : "")}
                    {copy((session.totalDeltaMs / 1000).toFixed(3))}{copy("ui.106")}</p>
                </div>
              )}
              {session.overallScore !== null && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-0.5">{copy("ui.123")}</p>
                  <p className="text-sm font-mono tabular text-zinc-200">{copy(session.overallScore)}<span className="text-zinc-600">/100</span></p>
                </div>
              )}
              {session.insightsCount !== null && session.insightsCount > 0 && (
                <div>
                  <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-0.5">{copy("ui.124")}</p>
                  <p className="text-sm font-mono tabular text-yellow-400">{copy(session.insightsCount)}</p>
                </div>
              )}
            </div>
          )}

          {session.error && (
            <p className="text-xs text-red-400 mt-1.5 bg-red-400/5 border border-red-400/20 rounded px-2 py-1">
              {copy(session.error)}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2.5">
            <div className="flex items-center gap-2 text-[11px] text-zinc-600 font-mono">
              <span>{copy(isDesktop ? "Десктоп" : "Браузер")}</span>
              <span>·</span>
              <span>{copy(formatSize(session.sizeBytes))}</span>
              <span>·</span>
              <span>{copy(relativeTime(session.uploadedAt, locales[displayLang]))}</span>
            </div>
            {session.status === "ready" && (
              <Link href="/telemetry" className="flex items-center gap-1 text-[11px] font-mono text-lime-400 hover:text-lime-300 transition-colors">
                {copy("Анализ ")}<ChevronRight size={11} />
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
  const copy = useCopy();
  const { lang: displayLang } = useLang();
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
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{copy(label)}</p>
          </div>
          <p className={cn("text-2xl font-semibold tabular tracking-tight font-mono", color)}>{copy(value)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const copy = useCopy();
  const { lang: displayLang } = useLang();
  const [sessions, setSessions]   = useState<TelemetrySession[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [failed, setFailed] = useState(false);
  const pendingRequest = useRef<AbortController | null>(null);
  const [filter,   setFilter]     = useState<"all" | "desktop" | "browser" | "ready">("all");

  const fetchSessions = useCallback(async () => {
    if (document.hidden || pendingRequest.current) return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res  = await fetch("/api/sessions", { signal: controller.signal });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error("Sessions unavailable");
      if (pendingRequest.current !== controller) return;
      setSessions(previous => JSON.stringify(previous) === JSON.stringify(data.sessions ?? []) ? previous : data.sessions ?? []);
      setFailed(false);
    } catch {
      if (pendingRequest.current === controller) setFailed(true);
    } finally {
      clearTimeout(timeout);
      if (pendingRequest.current === controller) {
        pendingRequest.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    // Auto-refresh every 5s to pick up processing completions
    const id = setInterval(fetchSessions, 5000);
    const onVisible = () => { if (!document.hidden) void fetchSessions(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      const pending = pendingRequest.current;
      pendingRequest.current = null;
      pending?.abort();
    };
  }, [fetchSessions]);

  const filtered = sessions.filter((s) => {
    if (filter === "desktop") return s.source === "desktop";
    if (filter === "browser") return s.source === "browser";
    if (filter === "ready")   return s.status === "ready";
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest mb-1">{copy("ui.132")}</p>
          <h1 className="apex-page-title">{copy("Saved uploads")}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {copy("Files uploaded from the browser or desktop app. Local analysis history is shown on the dashboard.")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchSessions}>
            <RefreshCw size={13} />
            {copy("ui.135")}</Button>
          <Link href="/telemetry">
            <Button variant="primary" size="sm">
              <Upload size={13} />
              {copy("ui.136")}</Button>
          </Link>
        </div>
      </div>

      {failed && <p role="alert" className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-200">{copy("performance.sessionsError")}</p>}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-lime-400 border-t-transparent animate-spin" />
        </div>
      ) : failed && sessions.length === 0 ? null : sessions.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 text-center px-5 py-12">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
            <Activity size={28} className="text-zinc-600" />
          </div>
          <p className="text-lg font-medium text-zinc-300 mb-2">{copy("No saved uploads yet")}</p>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
            {copy("ui.138")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/download" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-sm text-zinc-300 hover:border-lime-400">
              <Monitor size={14} className="text-lime-400" />
              {copy("ui.139")}</Link>
            <Link href="/telemetry">
              <Button variant="primary">
                <Upload size={14} />
                {copy("ui.140")}</Button>
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
                <p className="text-xs font-medium text-blue-400">{copy("ui.141")}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {copy("ui.142")}</p>
              </div>
              <Button variant="secondary" size="sm">{copy("ui.143")}</Button>
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
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                )}>
                {copy(label)}
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
                  filter === key ? "bg-zinc-600 text-zinc-200" : "bg-zinc-800 text-zinc-600"
                )}>
                  {copy(count)}
                </span>
              </button>
            ))}
          </div>

          {/* Session list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">{copy("ui.144")}</p>
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
