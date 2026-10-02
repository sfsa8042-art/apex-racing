import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDelta(ms: number): string {
  const sign = ms > 0 ? "+" : "";
  const seconds = (ms / 1000).toFixed(3);
  return `${sign}${seconds}s`;
}

export function formatLapTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}

export function deltaColor(ms: number): string {
  if (ms >= 0) return "text-red-400";
  if (ms > -200) return "text-yellow-400";
  return "text-lime-400";
}

export function deltaSign(ms: number): string {
  return ms > 0 ? "+" : "";
}

export function progressPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function severityConfig(severity: string) {
  switch (severity) {
    case "critical":
      return { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", dot: "bg-red-400" };
    case "warning":
      return { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", dot: "bg-yellow-400" };
    default:
      return { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", dot: "bg-blue-400" };
  }
}

export function tierConfig(tier: string) {
  switch (tier) {
    case "beginner":
      return { label: "Beginner", color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/30" };
    case "intermediate":
      return { label: "Intermediate", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" };
    case "advanced":
      return { label: "Advanced", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" };
    default:
      return { label: tier, color: "text-zinc-400", bg: "bg-zinc-400/10", border: "border-zinc-400/30" };
  }
}

export function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return { label: "Completed", color: "text-lime-400", bg: "bg-lime-400/10", border: "border-lime-400/30" };
    case "in_progress":
      return { label: "In Progress", color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" };
    case "available":
      return { label: "Available", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" };
    case "locked":
      return { label: "Locked", color: "text-zinc-500", bg: "bg-zinc-800", border: "border-zinc-700" };
    default:
      return { label: status, color: "text-zinc-400", bg: "bg-zinc-800", border: "border-zinc-700" };
  }
}
