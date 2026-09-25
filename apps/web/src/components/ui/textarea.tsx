import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-24 w-full resize-y rounded-xl border border-white/[.09] bg-[#10151d] px-3 py-2.5 text-[16px] text-foreground outline-none transition placeholder:text-[#677386] focus:border-[#496b9f] focus:ring-2 focus:ring-[#3b82f6]/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm", className)} {...props} />;
}
