import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl py-1 sm:py-2", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-medium uppercase tracking-[.14em] text-subtle-foreground">{eyebrow}</p> : null}
        <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-2.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Surface({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-border bg-surface", className)}>{children}</section>;
}

export function SectionHeading({ title, description, aside }: { title: string; description?: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-medium tracking-[-0.01em] text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
