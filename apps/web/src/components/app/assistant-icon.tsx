import { Bot, Calculator, ChartPie, FileSearch2, GraduationCap, HeartPulse, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssistantIcon({ type, className }: { type: string; className?: string }) {
  const iconClassName = "size-[17px]";
  const Icon = type === "general" ? FileSearch2
    : type === "health" ? HeartPulse
      : type === "legal" ? Scale
        : type === "portfolio" ? ChartPie
          : type === "study" ? GraduationCap
            : type === "accounting" ? Calculator
              : Bot;
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-raised text-[#b8c5d8]", className)}>
      <Icon className={iconClassName} />
    </span>
  );
}
