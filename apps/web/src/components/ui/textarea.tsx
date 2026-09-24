import * as React from "react";
import { cn } from "@/lib/utils";
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-24 w-full resize-y rounded-lg border border-border bg-[#101013] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-zinc-500", className)} {...props} />;
}
