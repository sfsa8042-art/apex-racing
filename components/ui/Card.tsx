import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  accent?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className, hoverable = false, accent = false, padding = "md" }: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900",
        paddingClasses[padding],
        hoverable && "cursor-pointer transition-all duration-150 hover:border-zinc-700 hover:bg-zinc-800/60",
        accent && "border-lime-400/30",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
}

export function CardTitle({ children, className, label }: CardTitleProps) {
  return (
    <div className={className}>
      {label && (
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-0.5">
          {label}
        </p>
      )}
      <h3 className="text-sm font-medium text-zinc-100">{children}</h3>
    </div>
  );
}
