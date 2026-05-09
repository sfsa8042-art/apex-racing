"use client";
import { useState, useEffect } from "react";
import { Download, Monitor, Loader2, ChevronDown, ExternalLink, Shield, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// All downloads go through our own API route — no CORS issues, no placeholder to forget
const DOWNLOAD_EXE  = "/api/download?format=exe";
const DOWNLOAD_MSI  = "/api/download?format=msi";
const DOWNLOAD_INFO = "/api/download?format=info";

interface ReleaseInfo {
  version: string;
  exe: { name: string; url: string; size: number } | null;
  msi: { name: string; url: string; size: number } | null;
}

function fmt(b: number): string {
  return b < 1_048_576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1_048_576).toFixed(1)} MB`;
}

function useRelease() {
  const [info,    setInfo]    = useState<ReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [noRepo,  setNoRepo]  = useState(false);

  useEffect(() => {
    fetch(DOWNLOAD_INFO)
      .then(r => r.json())
      .then((d: ReleaseInfo & { error?: string }) => {
        if (d.error?.includes("not configured")) { setNoRepo(true); }
        else if (!d.error) setInfo(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { info, loading, noRepo };
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
export function DownloadButtonHero({ className }: { className?: string }) {
  const { info, loading, noRepo } = useRelease();
  const [showMore, setShowMore] = useState(false);

  // No release yet → link to /download page which explains the situation
  const href = loading ? "#" : DOWNLOAD_EXE;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <a href={href}
        className={cn(
          "group flex items-center gap-3 px-7 py-4 rounded-2xl font-semibold text-base transition-all duration-200",
          "bg-lime-400 hover:bg-lime-300 text-zinc-950",
          "shadow-xl shadow-lime-400/25 hover:shadow-lime-400/40 hover:-translate-y-0.5",
          loading && "opacity-80 cursor-wait",
        )}>
        {loading
          ? <Loader2 size={20} className="animate-spin shrink-0"/>
          : <Download size={20} className="shrink-0 group-hover:animate-bounce"/>
        }
        <span>{loading ? "Подождите…" : "Скачать для Windows"}</span>
        <Monitor size={18} className="opacity-50 shrink-0"/>
        {info?.version && <span className="text-xs font-mono opacity-60">{info.version}</span>}
      </a>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <Shield size={10} className="text-lime-400/70"/>
        <span>Windows 10/11 · 64-bit</span>
        {info?.exe && <><span>·</span><span>{fmt(info.exe.size)}</span></>}
        <span>·</span>
        <span>Бесплатно</span>
      </div>

      {/* MSI alternative */}
      {info?.msi && (
        <div>
          <button onClick={() => setShowMore(v => !v)}
            className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors font-mono mx-auto">
            <ChevronDown size={11} className={cn("transition-transform", showMore && "rotate-180")}/>
            Другой формат
          </button>
          {showMore && (
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <a href={DOWNLOAD_MSI}
                className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 font-mono transition-colors">
                <Download size={10}/>
                {info.msi.name} ({fmt(info.msi.size)}) — MSI для IT-деплоя
              </a>
              <a href="/download"
                className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 font-mono transition-colors">
                <ExternalLink size={10}/>
                Страница загрузки
              </a>
            </div>
          )}
        </div>
      )}

      {noRepo && (
        <p className="text-[10px] text-zinc-700 font-mono">
          Задайте NEXT_PUBLIC_GITHUB_REPO в переменных окружения
        </p>
      )}
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
export function DownloadButtonNavbar({ className }: { className?: string }) {
  const { info, loading } = useRelease();
  return (
    <a href={DOWNLOAD_EXE}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all",
        "border border-lime-400/30 bg-lime-400/8 text-lime-400 hover:bg-lime-400/15 hover:border-lime-400/50",
        loading && "opacity-60",
        className,
      )}>
      {loading ? <Loader2 size={11} className="animate-spin"/> : <Download size={11}/>}
      {loading ? "…" : `Скачать${info?.version ? ` ${info.version}` : ""}`}
    </a>
  );
}

// ─── SECTION ─────────────────────────────────────────────────────────────────
export function DownloadSection() {
  const { info, loading } = useRelease();

  return (
    <section className="border-t border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-zinc-950 py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lime-400/20 bg-lime-400/8 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"/>
              <span className="text-xs font-mono text-lime-400">Автоматическая загрузка</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4 leading-tight">
              Установи раз —<br/>
              <span className="text-lime-400">загружай автоматически</span>
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              APEX Desktop следит за папкой телеметрии и отправляет каждый
              новый круг на платформу — без кликов, прямо во время вождения.
            </p>

            <ul className="space-y-3 mb-8">
              {[
                ["iRacing",                   "Documents\\iRacing\\telemetry"],
                ["Assetto Corsa Competizione", "Documents\\ACC\\MoTeC"],
                ["rFactor 2",                  "rFactor2\\UserData\\Log\\Results"],
              ].map(([sim, path]) => (
                <li key={sim} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime-400 shrink-0 mt-2"/>
                  <div>
                    <span className="text-sm text-zinc-200 font-medium">{sim}</span>
                    <span className="text-[11px] text-zinc-600 font-mono block">{path}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Download button */}
            <a href={DOWNLOAD_EXE}
              className={cn(
                "group inline-flex items-center gap-3 px-6 py-3.5 rounded-xl font-semibold transition-all duration-150",
                "bg-lime-400 hover:bg-lime-300 text-zinc-950 shadow-lg shadow-lime-400/20 hover:shadow-lime-400/30",
                loading && "opacity-75 cursor-wait",
              )}>
              {loading ? <Loader2 size={18} className="animate-spin"/> : <Download size={18} className="group-hover:-translate-y-0.5 transition-transform"/>}
              {loading ? "Загрузка…" : "Скачать для Windows"}
              {info?.version && <span className="text-xs font-mono opacity-60">{info.version}</span>}
            </a>

            <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-zinc-600 font-mono">
              <span className="flex items-center gap-1"><Shield size={10} className="text-zinc-500"/>Windows 10/11 · 64-bit</span>
              {info?.exe && <span>{fmt(info.exe.size)}</span>}
              {info?.msi && <a href={DOWNLOAD_MSI} className="flex items-center gap-1 hover:text-zinc-400 transition-colors"><Download size={10}/>MSI</a>}
              <a href="/download" className="flex items-center gap-1 hover:text-zinc-400 transition-colors"><ExternalLink size={10}/>Страница загрузки</a>
            </div>
          </div>

          {/* Right — mock app window */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70"/>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"/>
              <div className="w-2.5 h-2.5 rounded-full bg-lime-500/70"/>
              <div className="flex items-center gap-2 ml-2">
                <div className="w-5 h-5 rounded-md bg-lime-400 flex items-center justify-center">
                  <span className="text-zinc-950 text-[9px] font-bold">AP</span>
                </div>
                <span className="text-xs font-mono text-zinc-500">APEX Desktop</span>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"/>
                <span className="text-[10px] font-mono text-lime-400">мониторинг вкл</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-800/50">
                <Monitor size={13} className="text-lime-400 shrink-0"/>
                <span className="text-[11px] font-mono text-zinc-400 truncate">
                  C:\Users\Driver\Documents\iRacing\telemetry
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "monza_porsche_lap01.csv", status: "done",      size: "184 KB", time: "только что" },
                  { name: "monza_porsche_lap02.csv", status: "uploading", size: "191 KB", time: "" },
                  { name: "monza_porsche_lap03.csv", status: "pending",   size: "177 KB", time: "" },
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-800">
                    <div className={cn("w-2 h-2 rounded-full shrink-0",
                      item.status === "done"      && "bg-lime-400",
                      item.status === "uploading" && "bg-blue-400 animate-pulse",
                      item.status === "pending"   && "bg-zinc-600",
                    )}/>
                    <span className="text-[11px] font-mono text-zinc-400 flex-1 truncate">{item.name}</span>
                    <span className="text-[10px] font-mono text-zinc-600">{item.size}</span>
                    <span className={cn("text-[10px] font-mono",
                      item.status === "done"      && "text-lime-400",
                      item.status === "uploading" && "text-blue-400",
                      item.status === "pending"   && "text-zinc-600",
                    )}>
                      {item.status === "done" ? item.time : item.status === "uploading" ? "загрузка…" : "ожидание"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── COMPACT LINK ─────────────────────────────────────────────────────────────
export function DownloadLink({ className }: { className?: string }) {
  const { info, loading } = useRelease();
  return (
    <a href={DOWNLOAD_EXE}
      className={cn("inline-flex items-center gap-2 text-sm text-lime-400 hover:text-lime-300 transition-colors font-medium", className)}>
      <Download size={14}/>
      Скачать APEX Desktop{!loading && info?.version ? ` ${info.version}` : ""}
    </a>
  );
}
