"use client";
import Link from "next/link";
import { DownloadButtonNavbar } from "@/components/ui/DownloadButton";
import { Bell, Settings, ChevronDown, Globe, Check } from "lucide-react";
import { useState } from "react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useLang, type Lang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { uploadState }    = useTelemetry();
  const { lang, setLang, t } = useLang();
  const [showLang, setShowLang] = useState(false);
  const hasLap = uploadState.status === "done";

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 gap-4">
      <Link href="/" className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-md bg-lime-400 flex items-center justify-center">
          <span className="text-zinc-950 text-xs font-bold tracking-tighter">AP</span>
        </div>
        <span className="text-sm font-semibold text-zinc-100 tracking-tight">APEX</span>
      </Link>

      <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 font-mono">
        {hasLap ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-lime-400">{uploadState.filename}</span>
          </>
        ) : (
          <span>No lap loaded</span>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {/* Language switcher */}
        <div className="relative">
          <button onClick={() => setShowLang((v) => !v)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <Globe size={14} />
            <span className="text-xs font-mono uppercase">{lang}</span>
          </button>
          {showLang && (
            <div className="absolute right-0 top-9 z-50 w-36 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden animate-slide-up">
              {([["en", "English"], ["ru", "Русский"]] as [Lang, string][]).map(([l, label]) => (
                <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <span>{label}</span>
                  {lang === l && <Check size={12} className="text-lime-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <DownloadButtonNavbar />
        <button className="relative w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-lime-400" />
        </button>

        <div className="ml-1 h-6 w-px bg-zinc-800" />

        <Link href="/profile">
          <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors ml-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center">
              <span className="text-zinc-950 text-[10px] font-bold">MB</span>
            </div>
            <ChevronDown size={12} className="text-zinc-500" />
          </button>
        </Link>
      </div>
    </header>
  );
}
