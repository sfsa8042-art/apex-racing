"use client";
import { useLang } from "@/context/LanguageContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Activity, MapPin, Car, Users, Trophy, ChevronRight, Layers, User, Radio, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ru } from "@/lib/i18n/ru";

// NAV_ITEMS built inside component using t() for i18n

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();
  const NAV_ITEMS = [
    { href: "/dashboard",  label: t.nav.dashboard,  icon: LayoutDashboard },
    { href: "/telemetry",  label: t.nav.telemetry,  icon: Activity },
    { href: "/engineer",   label: "AI Engineer",    icon: Radio,  badge: "AI" },
    { href: "/sessions",   label: t.nav.sessions,   icon: Layers },
    { href: "/academy",    label: t.nav.academy,    icon: GraduationCap },
    { href: "/profile",    label: t.nav.profile,    icon: User },
    { href: "/tracks",     label: t.nav.tracks,     icon: MapPin },
    { href: "/cars",       label: t.nav.cars,       icon: Car },
    { href: "/community",  label: t.nav.community,  icon: Users },
    { href: "/download",   label: "Скачать Desktop", icon: Download },
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
      <div className="px-3 mt-4">
        <div className="rounded-lg border border-lime-400/20 bg-lime-400/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy size={12} className="text-lime-400" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-lime-400">Upgrade</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed mb-2">Unlimited uploads, all academy modules, full analysis.</p>
          <button className="w-full text-xs bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold py-1.5 rounded-md transition-colors">Upgrade to Pro</button>
        </div>
      </div>
    </aside>
  );
}
