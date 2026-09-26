import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-input px-3 text-[16px] text-foreground outline-none transition placeholder:text-subtle-foreground hover:border-border-strong focus:border-focus/70 focus:ring-2 focus:ring-focus/15 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-subtle-foreground sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
