import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  const variants: Record<Variant, string> = {
    default: "bg-[linear-gradient(180deg,#4b90fb,#3b82f6)] text-primary-foreground shadow-[0_8px_24px_rgba(59,130,246,.22)] hover:brightness-105",
    secondary: "bg-muted text-foreground hover:bg-[#1b2533]",
    ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
    outline: "border border-border bg-transparent text-foreground hover:bg-muted hover:border-[#35548e]",
    danger: "bg-red-500/15 text-red-300 border border-red-500/25 hover:bg-red-500/20",
  };
  const sizes: Record<Size, string> = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-sm", icon: "size-9" };
  return <button className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#71a8ff]", variants[variant], sizes[size], className)} {...props} />;
}
