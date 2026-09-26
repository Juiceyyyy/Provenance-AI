import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-lg border border-border bg-input px-3 py-2.5 text-[16px] leading-6 text-foreground outline-none transition placeholder:text-subtle-foreground hover:border-border-strong focus:border-focus/70 focus:ring-2 focus:ring-focus/15 disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-subtle-foreground sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
