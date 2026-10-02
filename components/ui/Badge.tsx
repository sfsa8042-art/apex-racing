import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "muted";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", className }: BadgeProps) {
  const variantClasses = {
    default: "bg-zinc-800 text-zinc-300 border-zinc-700",
    success: "bg-lime-400/10 text-lime-400 border-lime-400/30",
    warning: "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
    danger: "bg-red-400/10 text-red-400 border-red-400/30",
    info: "bg-blue-400/10 text-blue-400 border-blue-400/30",
    muted: "bg-zinc-900 text-zinc-500 border-zinc-800",
  };

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-mono font-medium tracking-wide uppercase",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}
