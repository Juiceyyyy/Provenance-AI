import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden rounded-[18px] bg-transparent", className)}>
      <Image
        src="/provenance-mark.png"
        alt="Provenance logo"
        fill
        priority={priority}
        sizes="(max-width: 768px) 40px, 56px"
        className="object-contain"
      />
    </span>
  );
}

export function BrandLockup({ className, markClassName, textClassName, priority = false }: { className?: string; markClassName?: string; textClassName?: string; priority?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark className={cn("size-9", markClassName)} priority={priority} />
      <span className={cn("text-sm font-semibold tracking-tight text-foreground", textClassName)}>Provenance</span>
    </span>
  );
}
