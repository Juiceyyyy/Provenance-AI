import Link from "next/link";
import { ArrowUpRight, Bot, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BUILTIN_PRESET_KEYS, BOT_PRESETS, type BotPresetKey } from "@/lib/bots/presets";

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
    <div className="mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-5xl flex-col justify-center py-8 sm:py-12 lg:min-h-[calc(100dvh-3rem)]">
      <section className="mx-auto w-full max-w-2xl text-center">
        <p className="text-xs font-medium text-[#8d99ab]">Grounded in evidence.</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">What do you want to work on?</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
          Your specialist assistants are ready to use. Open one to start a sourced conversation, or create a custom assistant for a different workflow.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/app/bots/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#eef4ff] px-4 text-sm font-medium text-[#0b1f3b] transition hover:bg-white"
          >
            <Plus className="size-4" /> Create custom assistant
          </Link>
        </div>
      </section>

      <section className="mt-10 sm:mt-12">
        <div className="mb-3 px-1">
          <h2 className="text-sm font-medium text-[#dce5f2]">Built-in assistants</h2>
          <p className="mt-1 text-xs text-[#707c8e]">Preset by Provenance, personalized by you.</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {builtinCards.map(({ key, preset, assistant }) => (
            <Link
              key={key}
              href={assistant ? `/app/bots/${assistant.id}` : "/app"}
              className="group rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition hover:border-[#375681] hover:bg-white/[.045] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#14233a] text-[#9fc1ff]">
                  <Bot className="size-4" />
                </span>
                <ArrowUpRight className="size-4 text-[#647184] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#b6cdf3]" />
              </div>
              <h3 className="mt-4 truncate text-sm font-medium">{assistant?.name || preset.name}</h3>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{assistant?.description || preset.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {customAssistants.length ? (
        <section className="mt-8">
          <div className="mb-3 px-1"><h2 className="text-sm font-medium text-[#dce5f2]">Custom assistants</h2></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {customAssistants.map((assistant) => (
              <Link key={assistant.id} href={`/app/bots/${assistant.id}`} className="group rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition hover:border-[#375681] hover:bg-white/[.045] sm:p-5">
                <div className="flex items-start justify-between gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#14233a] text-[#9fc1ff]"><Bot className="size-4" /></span><ArrowUpRight className="size-4 text-[#647184] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#b6cdf3]" /></div>
                <h3 className="mt-4 truncate text-sm font-medium">{assistant.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{assistant.description || BOT_PRESETS.custom.description}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
