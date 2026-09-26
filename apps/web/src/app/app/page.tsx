import Link from "next/link";
import { ArrowUpRight, Bot, ChevronDown, Plus } from "lucide-react";
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
    .limit(100);

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
    <div className="relative isolate mx-auto w-full max-w-6xl overflow-clip">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] opacity-70 [background:radial-gradient(circle_at_50%_12%,rgba(72,119,210,.13),transparent_38%),radial-gradient(circle_at_18%_34%,rgba(117,145,193,.07),transparent_28%),radial-gradient(circle_at_82%_28%,rgba(90,120,170,.06),transparent_24%)]" />

      <section className="relative flex min-h-[clamp(360px,54dvh,560px)] items-center justify-center px-2 pb-14 pt-10 text-center sm:px-4 sm:pb-16 sm:pt-14 lg:min-h-[clamp(400px,56dvh,620px)] lg:pt-16">
        <div className="w-full max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[.16em] text-subtle-foreground sm:text-xs">Workspace</p>
          <h1 className="mt-3 text-[2.3rem] font-semibold leading-[1.02] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-[3.7rem]">
            What do you want to work on?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Pick a specialist that already knows its workflow and source rules. Add files in the conversation whenever the task needs more context.
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
            <Link href="#assistants"><Button variant="secondary" className="w-full sm:w-auto">Browse assistants</Button></Link>
            <Link href="/app/bots/new"><Button className="w-full sm:w-auto"><Plus className="size-4" />Create custom</Button></Link>
          </div>
        </div>

        <Link
          href="#assistants"
          aria-label="Scroll to built-in assistants"
          className="home-scroll-cue absolute bottom-3 grid size-10 place-items-center rounded-full border border-white/[.08] bg-white/[.035] text-subtle-foreground backdrop-blur-xl transition hover:border-white/[.13] hover:bg-white/[.055] hover:text-foreground sm:bottom-5"
        >
          <ChevronDown className="size-[18px]" />
        </Link>
      </section>

      <section id="assistants" className="scroll-mt-20 border-t border-white/[.07] py-8 sm:py-10 lg:py-11">
        <div className="mb-5 flex items-end justify-between gap-4 px-0.5">
          <div>
            <h2 className="text-sm font-medium tracking-[-0.01em] text-foreground">Built-in assistants</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Ready by default. Open one and start working.</p>
          </div>
          <Link href="/app/bots" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">View all</Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {builtinCards.map(({ key, preset, assistant }) => (
            <Link
              key={key}
              href={assistant ? `/app/bots/${assistant.id}` : "/app"}
              className="liquid-glass liquid-glass-interactive group flex min-h-40 flex-col rounded-2xl p-4.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/40 sm:min-h-44 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <AssistantIcon type={key} />
                <ArrowUpRight className="size-4 text-subtle-foreground transition duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </div>
              <div className="mt-auto pt-7">
                <h3 className="truncate text-sm font-medium text-foreground">{assistant?.name || preset.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{assistant?.description || preset.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-white/[.07] py-8 sm:py-10 lg:py-11">
        <div className="mb-5 flex flex-col items-start justify-between gap-3 px-0.5 sm:flex-row sm:items-end sm:gap-4">
          <div>
            <h2 className="text-sm font-medium text-foreground">Custom assistants</h2>
            <p className="mt-1 text-xs text-muted-foreground">Use Custom only for workflows that do not fit a built-in specialist.</p>
          </div>
          <Link href="/app/bots/new"><Button size="sm" variant="secondary"><Plus className="size-3.5" />New custom</Button></Link>
        </div>
        {customAssistants.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {customAssistants.map((assistant) => (
              <Link key={assistant.id} href={`/app/bots/${assistant.id}`} className="liquid-glass liquid-glass-interactive group rounded-2xl p-4.5 sm:p-5">
                <div className="flex items-start justify-between gap-3"><AssistantIcon type="custom" /><ArrowUpRight className="size-4 text-subtle-foreground transition duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
                <h3 className="mt-6 truncate text-sm font-medium">{assistant.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{assistant.description || BOT_PRESETS.custom.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <Link href="/app/bots/new" className="liquid-glass liquid-glass-interactive flex min-h-28 items-center justify-between rounded-2xl px-4 py-4 text-sm text-muted-foreground hover:text-foreground sm:min-h-32 sm:px-5">
            <span className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.04]"><Bot className="size-4" /></span><span className="truncate">Create your first custom assistant</span></span>
            <Plus className="size-4 shrink-0" />
          </Link>
        )}
      </section>
    </div>
  );
}
