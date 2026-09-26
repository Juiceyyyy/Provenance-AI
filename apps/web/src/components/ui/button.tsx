import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  const variants: Record<Variant, string> = {
    default: "border border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover shadow-[0_1px_0_rgba(255,255,255,.08)_inset]",
    secondary: "border border-border bg-surface-raised text-foreground hover:border-border-strong hover:bg-muted",
    ghost: "border border-transparent bg-transparent text-muted-foreground hover:bg-white/[.04] hover:text-foreground",
    outline: "border border-border bg-transparent text-foreground hover:border-border-strong hover:bg-white/[.025]",
    danger: "border border-red-500/25 bg-red-500/[.08] text-red-200 hover:border-red-400/35 hover:bg-red-500/[.13]",
  };
  const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-4.5 text-sm",
    icon: "size-10",
  };
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium tracking-[-0.01em] transition disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
