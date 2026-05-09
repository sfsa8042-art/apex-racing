import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    const variantClasses = {
      primary: "bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold shadow-sm",
      secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
      ghost: "bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100",
      danger: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
      outline: "bg-transparent hover:bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-500",
    };

    const sizeClasses = {
      sm: "text-xs px-3 py-1.5 rounded-md gap-1.5",
      md: "text-sm px-4 py-2 rounded-lg gap-2",
      lg: "text-base px-6 py-3 rounded-lg gap-2",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center transition-colors duration-150",
          "disabled:opacity-50 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lime-400",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
