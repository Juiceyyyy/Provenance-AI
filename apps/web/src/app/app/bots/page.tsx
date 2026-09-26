import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/app/page-shell";
import { AssistantIcon } from "@/components/app/assistant-icon";
import { Button } from "@/components/ui/button";

export default async function BotsPage() {
  const { supabase } = await requireUser();
  const { data: bots } = await supabase
    .from("bots")
    .select("id,name,description,bot_type,jurisdiction_country,jurisdiction_region,updated_at")
    .order("name", { ascending: true });

  const sorted = [...(bots ?? [])].sort((a, b) => {
    const aCustom = a.bot_type === "custom";
    const bCustom = b.bot_type === "custom";
    if (aCustom !== bCustom) return aCustom ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Workspace"
        title="Assistants"
        description="Specialists that combine focused behavior with the sources, location and tools you choose."
        actions={<Link href="/app/bots/new"><Button><Plus className="size-4" />New custom</Button></Link>}
      />
      <div className="mt-7 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((bot) => (
          <Link key={bot.id} href={`/app/bots/${bot.id}`} className="group flex min-h-44 flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-border-strong hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/35">
            <div className="flex items-start justify-between gap-3"><AssistantIcon type={bot.bot_type} /><ArrowUpRight className="size-4 text-subtle-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-muted-foreground" /></div>
            <div className="mt-auto pt-7">
              <h2 className="truncate text-sm font-medium text-foreground">{bot.name}</h2>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{bot.description || "Grounded assistant"}</p>
              {bot.jurisdiction_country ? <p className="mt-3 text-[10px] text-subtle-foreground">{[bot.jurisdiction_country, bot.jurisdiction_region].filter(Boolean).join(" · ")}</p> : null}
            </div>
          </Link>
        ))}
        {!sorted.length ? <div className="col-span-full flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">No assistants yet. Create one to start working with your sources.</div> : null}
      </div>
    </PageShell>
  );
}
