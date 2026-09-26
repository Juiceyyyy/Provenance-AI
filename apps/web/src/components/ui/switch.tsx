"use client";

import { cn } from "@/lib/utils";

export function Switch({ checked, onCheckedChange, disabled, className }: { checked: boolean; onCheckedChange: (value: boolean) => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 disabled:cursor-not-allowed disabled:opacity-45",
        checked ? "border-primary/60 bg-primary" : "border-border-strong bg-muted",
        className,
      )}
    >
      <span className={cn("absolute top-[3px] size-4 rounded-full bg-white shadow-sm transition-[left]", checked ? "left-[19px]" : "left-[3px]")} />
    </button>
  );
}
