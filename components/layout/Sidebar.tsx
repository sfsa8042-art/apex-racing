"use client";
import { useLang } from "@/context/LanguageContext";
import { loadProfile, getInitials, avatarColor } from "@/lib/profile/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, GraduationCap, Activity, MapPin, Car, Users, ChevronRight, Layers, User, Radio, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ru } from "@/lib/i18n/ru";

// NAV_ITEMS built inside component using t() for i18n

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  useEffect(() => { setProfile(loadProfile()); }, []);
  const NAV_ITEMS = [
    { href: "/dashboard",  label: t.nav.dashboard,  icon: LayoutDashboard },
    { href: "/telemetry",  label: t.nav.telemetry,  icon: Activity },
    { href: "/engineer",   label: t.nav.engineer ?? "AI Engineer", icon: Radio,  badge: "AI" },
    { href: "/sessions",   label: t.nav.sessions,   icon: Layers },
    { href: "/academy",    label: t.nav.academy,    icon: GraduationCap },
    { href: "/profile",    label: t.nav.profile,    icon: User },
    { href: "/tracks",     label: t.nav.tracks,     icon: MapPin },
    { href: "/cars",       label: t.nav.cars,       icon: Car },
    { href: "/community",  label: t.nav.community,  icon: Users },
    { href: "/download",   label: t.nav.download ?? "Скачать Desktop", icon: Download },
  ];
  return (
    <aside className="w-56 shrink-0 h-full border-r border-zinc-800 bg-zinc-950 flex flex-col py-4">
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}
              className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                isActive ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50")}>
              <Icon size={15} className={cn("shrink-0 transition-colors", isActive ? "text-lime-400" : "text-zinc-500 group-hover:text-zinc-300")} />
              <span className="flex-1">{label}</span>
              {badge && <span className={cn("text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border", badge === "AI" ? "bg-lime-400/10 text-lime-400 border-lime-400/25" : "bg-zinc-800 text-zinc-500 border-zinc-700")}>{badge}</span>}
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
              {profile?.name ?? "Создать профиль"}
            </p>
            <p className="text-[10px] text-zinc-600 font-mono">
              {profile ? "профиль" : "нажми чтобы создать"}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
