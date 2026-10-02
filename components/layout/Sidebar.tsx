"use client";
import { useCopy } from "../../shared/i18n/react";

import { useLang } from "@/context/LanguageContext";
import { loadProfile, getInitials, avatarColor } from "@/lib/profile/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, GraduationCap, Activity, MapPin, Car, ChevronRight, Layers, User, Download, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

// NAV_ITEMS built inside component using t() for i18n

export function Sidebar() {
  const copy = useCopy();
  const pathname = usePathname();
  const { t, lang } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  useEffect(() => { setProfile(loadProfile()); }, []);
  const NAV_ITEMS = [
    { href: "/dashboard",  label: t.nav.dashboard,  icon: LayoutDashboard },
    { href: "/telemetry",  label: t.nav.telemetry,  icon: Activity, highlight: true },
    { href: "/sessions",   label: t.nav.sessions,   icon: Layers },
    { href: "/academy",    label: t.nav.academy,    icon: GraduationCap },
    { href: "/profile",    label: t.nav.profile,    icon: User },
    { href: "/tracks",     label: t.nav.tracks,     icon: MapPin },
    { href: "/cars",       label: t.nav.cars,       icon: Car },
    { href: "/download",   label: t.nav.download ?? "Скачать Desktop", icon: Download },
  ];
  return (
    <>
    <div className="md:hidden relative shrink-0 border-b border-zinc-800 bg-zinc-950 z-30" onKeyDown={event => { if (event.key === "Escape") setMobileOpen(false); }}>
      <button type="button" aria-expanded={mobileOpen} aria-controls="mobile-app-navigation" onClick={() => setMobileOpen(v => !v)} className="flex items-center justify-between w-full min-h-12 px-4 text-sm text-zinc-200 focus-visible:outline-lime-400">
        <span>{copy(NAV_ITEMS.find(item => item.href === pathname)?.label ?? (lang === "ru" ? "Навигация" : "Navigation"))}</span>
        <span className="flex items-center gap-2 text-zinc-400">{lang === "ru" ? "Меню" : "Menu"}{mobileOpen ? <X size={18}/> : <Menu size={18}/>}</span>
      </button>
      {mobileOpen && <nav id="mobile-app-navigation" aria-label={lang === "ru" ? "Разделы сайта" : "Site navigation"} className="absolute top-full inset-x-0 max-h-[65dvh] overflow-y-auto bg-zinc-900 border-b border-zinc-700 p-3 shadow-2xl">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={pathname === href ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-3 text-sm", pathname === href ? "bg-lime-400/10 text-lime-300" : "text-zinc-300 hover:bg-zinc-800")}><Icon size={18}/>{copy(label)}</Link>)}
      </nav>}
    </div>
    <aside className="hidden md:flex w-56 shrink-0 h-full border-r border-zinc-800 bg-zinc-950 flex-col py-4">
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge, highlight }: any) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          if (highlight) {
            return (
              <Link key={href} href={href}
                className={cn("flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all group mt-1 mb-1 border",
                  isActive
                    ? "bg-lime-400/12 text-lime-400 border-lime-400/30 shadow-sm shadow-lime-400/10"
                    : "text-zinc-300 border-zinc-800 hover:border-lime-400/20 hover:bg-lime-400/6 hover:text-lime-400"
                )}>
                <Icon size={16} className={cn("shrink-0", isActive ? "text-lime-400" : "text-zinc-400 group-hover:text-lime-400")} />
                <span className="flex-1">{copy(label)}</span>
                <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-lime-400" : "bg-zinc-700 group-hover:bg-lime-400/50")} />
              </Link>
            );
          }
          return (
            <Link key={href} href={href}
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50")}>
              <Icon size={15} className={cn("shrink-0 transition-colors", isActive ? "text-lime-400" : "text-zinc-500 group-hover:text-zinc-300")} />
              <span className="flex-1">{copy(label)}</span>
              {badge && <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-zinc-500">{copy(badge)}</span>}
              {isActive && <ChevronRight size={12} className="text-zinc-600" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile mini card */}
      <div className="px-3 pb-3 pt-2 border-t border-zinc-800">
        <Link href="/profile" className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-zinc-800/60 transition-colors group">
          {profile ? (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: `${avatarColor(profile.name)}20`, color: avatarColor(profile.name) }}>
              {getInitials(profile.name)}
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <span className="text-zinc-600 text-xs">?</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-300 truncate group-hover:text-zinc-100 transition-colors">
              {profile?.name ?? copy("Создать профиль")}
            </p>
            <p className="text-[10px] text-zinc-600 font-mono">
              {copy(profile ? "профиль" : "нажми чтобы создать")}
            </p>
          </div>
        </Link>
      </div>
    </aside>
    </>
  );
}
