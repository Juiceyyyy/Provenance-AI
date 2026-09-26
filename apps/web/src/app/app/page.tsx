import Link from "next/link";
import { ArrowUpRight, Bot, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BUILTIN_PRESET_KEYS, BOT_PRESETS } from "@/lib/bots/presets";
import { AssistantIcon } from "@/components/app/assistant-icon";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { supabase } = await requireUser();
  const { data: assistants } = await supabase
    .from("bots")
    .select("id,name,description,bot_type,is_builtin")
    .order("name", { ascending: true })
    .limit(30);

  const builtinsByType = new Map<string, NonNullable<typeof assistants>[number]>();
  const customAssistants: NonNullable<typeof assistants> = [];
  for (const assistant of assistants ?? []) {
    if (assistant.is_builtin && !builtinsByType.has(assistant.bot_type)) builtinsByType.set(assistant.bot_type, assistant);
    if (assistant.bot_type === "custom") customAssistants.push(assistant);
  }

  const builtinCards = BUILTIN_PRESET_KEYS
    .map((key) => ({ key, preset: BOT_PRESETS[key], assistant: builtinsByType.get(key) }))
    .sort((a, b) => a.preset.name.localeCompare(b.preset.name));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <section className="flex min-h-[42vh] items-end border-b border-border pb-8 pt-12 sm:min-h-[48vh] sm:pb-10 lg:pt-16">
        <div className="w-full max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[.14em] text-subtle-foreground">Workspace</p>
          <h1 className="mt-3 text-[2.45rem] font-semibold leading-[1.02] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-[3.7rem]">
            What do you want to work on?
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Pick a specialist that already knows its workflow and source rules. Add files in the conversation when the task needs more context.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="#assistants"><Button variant="secondary">Browse assistants</Button></Link>
            <Link href="/app/bots/new"><Button><Plus className="size-4" />Create custom</Button></Link>
          </div>
        </div>
      </section>

      <section id="assistants" className="scroll-mt-6 py-9 sm:py-11">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium tracking-[-0.01em] text-foreground">Built-in assistants</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Ready by default. Open one and start working.</p>
          </div>
          <Link href="/app/bots" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">View all</Link>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {builtinCards.map(({ key, preset, assistant }) => (
            <Link
              key={key}
              href={assistant ? `/app/bots/${assistant.id}` : "/app"}
              className="group flex min-h-44 flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-border-strong hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40"
            >
              <div className="flex items-start justify-between gap-3">
                <AssistantIcon type={key} />
                <ArrowUpRight className="size-4 text-subtle-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </div>
              <div className="mt-auto pt-7">
                <h3 className="truncate text-sm font-medium text-foreground">{assistant?.name || preset.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{assistant?.description || preset.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-9 sm:py-11">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-foreground">Custom assistants</h2>
            <p className="mt-1 text-xs text-muted-foreground">Use Custom only for workflows that do not fit a built-in specialist.</p>
          </div>
          <Link href="/app/bots/new"><Button size="sm" variant="secondary"><Plus className="size-3.5" />New custom</Button></Link>
        </div>
        {customAssistants.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {customAssistants.map((assistant) => (
              <Link key={assistant.id} href={`/app/bots/${assistant.id}`} className="group rounded-xl border border-border bg-surface p-5 transition hover:border-border-strong hover:bg-surface-raised">
                <div className="flex items-start justify-between gap-3"><AssistantIcon type="custom" /><ArrowUpRight className="size-4 text-subtle-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
                <h3 className="mt-6 truncate text-sm font-medium">{assistant.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{assistant.description || BOT_PRESETS.custom.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <Link href="/app/bots/new" className="flex min-h-32 items-center justify-between rounded-xl border border-dashed border-border px-5 py-4 text-sm text-muted-foreground transition hover:border-border-strong hover:bg-white/[.02] hover:text-foreground">
            <span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg border border-border bg-surface"><Bot className="size-4" /></span>Create your first custom assistant</span>
            <Plus className="size-4" />
          </Link>
        )}
      </section>
    </div>
  );
}
