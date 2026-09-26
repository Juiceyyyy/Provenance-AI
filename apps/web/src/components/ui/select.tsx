import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-lg border border-border bg-input px-3 pr-9 text-[16px] text-foreground outline-none transition hover:border-border-strong focus:border-focus/70 focus:ring-2 focus:ring-focus/15 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-subtle-foreground sm:text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
