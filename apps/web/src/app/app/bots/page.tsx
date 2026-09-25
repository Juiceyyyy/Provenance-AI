import Link from "next/link";
import { ArrowUpRight, Bot, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/app/page-shell";
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
        description="Each assistant combines focused behavior with the knowledge and tools you choose."
        actions={<Link href="/app/bots/new"><Button><Plus className="size-4" />New assistant</Button></Link>}
      />
      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((bot) => (
          <Link
            key={bot.id}
            href={`/app/bots/${bot.id}`}
            className="group rounded-2xl border border-white/[.075] bg-[#0d1118] p-4 transition hover:border-[#3b5d8d] hover:bg-[#101620] sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#14233a] text-[#9fc1ff]"><Bot className="size-4" /></span>
              <ArrowUpRight className="size-4 text-[#637084] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#b9d0f6]" />
            </div>
            <h2 className="mt-4 truncate text-sm font-medium text-[#e9eef6]">{bot.name}</h2>
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#8995a6]">{bot.description || "Grounded assistant"}</p>
            {bot.jurisdiction_country ? <p className="mt-4 text-[10px] text-[#667286]">{[bot.jurisdiction_country, bot.jurisdiction_region].filter(Boolean).join(" · ")}</p> : null}
          </Link>
        ))}
        {!sorted.length ? <div className="col-span-full rounded-2xl border border-dashed border-white/[.09] p-8 text-center text-sm text-[#8490a1]">No assistants yet. Create one to start chatting with your sources.</div> : null}
      </div>
    </PageShell>
  );
}
