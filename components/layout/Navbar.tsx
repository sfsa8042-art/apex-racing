"use client";
import { useCopy } from "../../shared/i18n/react";

import Link from "next/link";
import { DownloadButtonNavbar } from "@/components/ui/DownloadButton";
import { ChevronDown, User } from "lucide-react";
import { useState, useEffect } from "react";
import { loadProfile, getInitials, avatarColor } from "@/lib/profile/store";
import { useTelemetry } from "@/context/TelemetryContext";
import { LanguageSwitch } from "@/context/LanguageContext";

export function Navbar() {
  const copy = useCopy();
  const { uploadState }    = useTelemetry();
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
        <LanguageSwitch compact />

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
