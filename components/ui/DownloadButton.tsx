"use client";
import { useCopy } from "../../shared/i18n/react";

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
  const copy = useCopy();
  const { info, loading, noRepo } = useRelease();
  const [showMore, setShowMore] = useState(false);

  // No release yet → link to /download page which explains the situation
  const href = info?.exe ? DOWNLOAD_EXE : info?.msi ? DOWNLOAD_MSI : "/dashboard";

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
        <span>{copy(loading ? "Подождите…" : info?.exe || info?.msi ? "Скачать для Windows" : "Open web app")}</span>
        <Monitor size={18} className="opacity-50 shrink-0"/>
        {info?.version && <span className="text-xs font-mono opacity-60">{info.version}</span>}
      </a>

      {!loading && !info?.exe && !info?.msi && <p role="status" className="max-w-sm text-center text-sm text-zinc-400">{copy("Desktop download is currently unavailable. You can analyse a lap in the web app.")}</p>}
      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
        <Shield size={10} className="text-lime-400/70"/>
        <span>{copy("ui.273")}</span>
        {info?.exe && <><span>·</span><span>{copy(fmt(info.exe.size))}</span></>}
        <span>·</span>
        <span>{copy("ui.275")}</span>
      </div>

      {/* MSI alternative */}
      {info?.msi && (
        <div>
          <button onClick={() => setShowMore(v => !v)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-400 transition-colors font-mono mx-auto">
            <ChevronDown size={11} className={cn("transition-transform", showMore && "rotate-180")}/>
            {copy("ui.570")}</button>
          {showMore && (
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <a href={DOWNLOAD_MSI}
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-300 font-mono transition-colors">
                <Download size={10}/>
                {info.msi.name} ({copy(fmt(info.msi.size))}{copy("ui.571")}</a>
              <a href="/download"
                className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-400 font-mono transition-colors">
                <ExternalLink size={10}/>
                {copy("ui.572")}</a>
            </div>
          )}
        </div>
      )}

      {noRepo && (
        <p className="text-[10px] text-zinc-700 font-mono">
          {copy("ui.573")}</p>
      )}
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
export function DownloadButtonNavbar({ className }: { className?: string }) {
  const copy = useCopy();
  const { info, loading } = useRelease();
  return (
    <a href={info?.exe ? DOWNLOAD_EXE : info?.msi ? DOWNLOAD_MSI : "/download"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all",
        "border border-lime-400/30 bg-lime-400/8 text-lime-400 hover:bg-lime-400/15 hover:border-lime-400/50",
        loading && "opacity-60",
        className,
      )}>
      {loading ? <Loader2 size={11} className="animate-spin"/> : <Download size={11}/>}
      {loading ? "…" : copy("Windows app")}
    </a>
  );
}

// ─── SECTION ─────────────────────────────────────────────────────────────────
export function DownloadSection() {
  const copy = useCopy();
  const { info, loading } = useRelease();

  return (
    <section className="border-t border-zinc-800 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="apex-eyebrow">{copy("ui.575")}</p>
            <h2 className="apex-section-title">
              {copy("ui.576")}{" "}
              <span className="text-lime-400">{copy("ui.577")}</span>
            </h2>
            <p className="apex-intro">{copy("ui.578")}</p>

            <ul className="mt-8 space-y-3">
              {[
                ["iRacing",                   "Documents\\iRacing\\telemetry"],
                ["Assetto Corsa Competizione", "Documents\\ACC\\MoTeC"],
                ["rFactor 2",                  "rFactor2\\UserData\\Log\\Results"],
              ].map(([sim, path]) => (
                <li key={sim} className="border-t border-zinc-800 pt-3 first:border-t-0 first:pt-0">
                  <span className="text-sm font-medium text-zinc-200">{copy(sim)}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-zinc-400">{path}</span>
                </li>
              ))}
            </ul>

            {!loading && !info?.exe && !info?.msi && <p role="status" className="mt-6 text-sm leading-relaxed text-zinc-400">{copy("Desktop download is currently unavailable. You can analyse a lap in the web app.")}</p>}
            <a href={info?.exe ? DOWNLOAD_EXE : info?.msi ? DOWNLOAD_MSI : "/dashboard"}
              className={cn(
                "mt-8 inline-flex items-center gap-3 rounded-lg bg-lime-400 px-6 py-3.5 font-semibold text-zinc-950 transition-colors duration-150 hover:bg-lime-300",
                loading && "cursor-wait opacity-75",
              )}>
              {loading ? <Loader2 size={18} className="animate-spin"/> : <Download size={18} />}
              {copy(loading ? "Загрузка…" : info?.exe || info?.msi ? "Скачать для Windows" : "Open web app")}
              {info?.version && <span className="font-mono text-xs opacity-60">{info.version}</span>}
            </a>

            <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs text-zinc-400">
              <span className="flex items-center gap-1"><Shield size={10} className="text-zinc-400"/>{copy("ui.273")}</span>
              {info?.exe && <span>{fmt(info.exe.size)}</span>}
              {info?.msi && <a href={DOWNLOAD_MSI} className="flex items-center gap-1 transition-colors hover:text-zinc-400"><Download size={10}/>{copy("ui.580")}</a>}
              <a href="/download" className="flex items-center gap-1 transition-colors hover:text-zinc-400"><ExternalLink size={10}/>{copy("ui.572")}</a>
            </div>
          </div>

          {/* Product preview — flat panel, no fake OS chrome */}
          <div className="overflow-hidden border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-lime-400">
                <span className="text-[9px] font-bold text-zinc-950">{copy("ui.268")}</span>
              </div>
              <span className="font-mono text-xs text-zinc-400">{copy("ui.271")}</span>
              <span className="ml-auto font-mono text-[10px] text-lime-400">{copy("ui.581")}</span>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                <Monitor size={13} className="shrink-0 text-lime-400"/>
                <span className="truncate font-mono text-[11px] text-zinc-400">
                  {copy("ui.582")}</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "monza_porsche_lap01.csv", status: "done",      size: "184 KB", time: "только что" },
                  { name: "monza_porsche_lap02.csv", status: "uploading", size: "191 KB", time: "" },
                  { name: "monza_porsche_lap03.csv", status: "pending",   size: "177 KB", time: "" },
                ].map(item => (
                  <div key={item.name} className="flex items-center gap-3 border border-zinc-800 px-3 py-2">
                    <div className={cn("h-2 w-2 shrink-0 rounded-full",
                      item.status === "done"      && "bg-lime-400",
                      item.status === "uploading" && "bg-zinc-300",
                      item.status === "pending"   && "bg-zinc-600",
                    )}/>
                    <span className="flex-1 truncate font-mono text-[11px] text-zinc-400">{item.name}</span>
                    <span className="font-mono text-[10px] text-zinc-400">{item.size}</span>
                    <span className={cn("font-mono text-[10px]",
                      item.status === "done"      && "text-lime-400",
                      item.status === "uploading" && "text-zinc-300",
                      item.status === "pending"   && "text-zinc-400",
                    )}>
                      {copy(item.status === "done" ? item.time : item.status === "uploading" ? "загрузка…" : "ожидание")}
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
  const copy = useCopy();
  const { info, loading } = useRelease();
  return (
    <a href={info?.exe ? DOWNLOAD_EXE : info?.msi ? DOWNLOAD_MSI : "/download"}
      className={cn("inline-flex items-center gap-2 text-sm text-lime-400 hover:text-lime-300 transition-colors font-medium", className)}>
      <Download size={14}/>
      {copy(info?.exe || info?.msi ? "ui.279" : "Desktop app")}{!loading && info?.version ? ` ${info.version}` : ""}
    </a>
  );
}
