import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accentColor?: string;
  className?: string;
}

export function StatCard({
  label, value, subValue, icon: Icon, trend, trendValue, accentColor = "text-lime-400", className,
}: StatCardProps) {
  const trendColors = {
    up: "text-lime-400",
    down: "text-red-400",
    neutral: "text-zinc-500",
  };

  return (
    <div
      className={cn(
        "rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Icon size={14} className={accentColor} />
          </div>
        )}
      </div>
      <div>
        <p className={cn("text-2xl font-semibold tabular tracking-tight", accentColor)}>{value}</p>
        {subValue && <p className="text-xs text-zinc-500 mt-0.5">{subValue}</p>}
      </div>
      {trend && trendValue && (
        <p className={cn("text-xs font-mono", trendColors[trend])}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
        </p>
      )}
    </div>
  );
}
