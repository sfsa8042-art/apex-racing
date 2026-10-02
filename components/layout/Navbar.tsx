"use client";
import { useCopy } from "../../shared/i18n/react";

import Link from "next/link";
import { DownloadButtonNavbar } from "@/components/ui/DownloadButton";
import { ChevronDown, Globe, Check, User } from "lucide-react";
import { useState, useEffect } from "react";
import { loadProfile, getInitials, avatarColor } from "@/lib/profile/store";
import { useTelemetry } from "@/context/TelemetryContext";
import { useLang, type Lang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function Navbar() {
  const copy = useCopy();
  const { uploadState }    = useTelemetry();
  const { lang, setLang, t } = useLang();
  const [showLang, setShowLang] = useState(false);
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  useEffect(() => { setProfile(loadProfile()); }, []);
  const hasLap = uploadState.status === "done";

  return (
    <header className="h-14 shrink-0 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 gap-4">
      <Link href="/" className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-md bg-lime-400 flex items-center justify-center">
          <span className="text-zinc-950 text-xs font-bold tracking-tighter">{copy("ui.268")}</span>
        </div>
        <span className="font-display text-sm font-semibold text-zinc-100 tracking-tight">{copy("ui.269")}</span>
      </Link>

      <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 font-mono">
        {hasLap ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-lime-400">{uploadState.filename}</span>
          </>
        ) : (
          <span>{copy("ui.541")}</span>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        {/* Language switcher */}
        <div className="relative">
          <button onClick={() => setShowLang((v) => !v)} aria-label={lang === "ru" ? "Язык интерфейса" : "Interface language"} aria-expanded={showLang}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
            <Globe size={14} />
            <span className="text-xs font-mono uppercase">{copy(lang)}</span>
          </button>
          {showLang && (
            <div className="absolute right-0 top-9 z-50 w-36 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden animate-slide-up">
              {([["en", "English"], ["ru", "Русский"]] as [Lang, string][]).map(([l, label]) => (
                <button key={l} onClick={() => { setLang(l); setShowLang(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <span>{copy(label)}</span>
                  {lang === l && <Check size={12} className="text-lime-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden sm:block"><DownloadButtonNavbar /></div>

        <div className="ml-1 h-6 w-px bg-zinc-800" />

        <Link href="/profile">
          <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors ml-1">
            {profile ? (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: `${avatarColor(profile.name)}25`, color: avatarColor(profile.name) }}>
                {getInitials(profile.name)}
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <User size={11} className="text-zinc-500"/>
              </div>
            )}
            <ChevronDown size={12} className="text-zinc-500" />
          </button>
        </Link>
      </div>
    </header>
  );
}
