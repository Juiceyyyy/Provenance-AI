import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Calculator,
  ChartPie,
  ChevronDown,
  FileSearch2,
  GraduationCap,
  HeartPulse,
  Plus,
  Scale,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { BUILTIN_PRESET_KEYS, BOT_PRESETS } from "@/lib/bots/presets";

function AssistantIcon({ type }: { type: string }) {
  const className = "size-[18px]";
  if (type === "general") return <FileSearch2 className={className} />;
  if (type === "health") return <HeartPulse className={className} />;
  if (type === "legal") return <Scale className={className} />;
  if (type === "portfolio") return <ChartPie className={className} />;
  if (type === "study") return <GraduationCap className={className} />;
  if (type === "accounting") return <Calculator className={className} />;
  return <Bot className={className} />;
}

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
    <div className="mx-auto w-full max-w-5xl">
      <section className="relative flex min-h-[calc(100dvh-5.5rem)] items-center justify-center overflow-hidden py-12 lg:min-h-[calc(100dvh-3rem)]">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[42%] size-[34rem] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b82f6]/[.07] blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[11px] font-medium text-[#98a6ba] shadow-sm shadow-black/20">
            <span className="size-1.5 rounded-full bg-[#5c9cff] shadow-[0_0_12px_rgba(92,156,255,.85)]" />
            Your assistants are ready
          </div>
          <h1 className="mt-6 max-w-3xl text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.055em] text-foreground sm:text-5xl lg:text-[3.65rem]">
            What do you want to work on?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#96a2b4] sm:text-base sm:leading-8">
            Choose a specialist that already knows its workflow, sources and context. Start a conversation, add your own files, or create a custom assistant when you need something different.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="#built-in-assistants"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[.1] bg-white/[.035] px-4 text-sm font-medium text-[#dce6f5] transition hover:border-[#3e5f90] hover:bg-white/[.06]"
            >
              Browse assistants
            </Link>
            <Link
              href="/app/bots/new"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3b82f6] px-4 text-sm font-medium text-white shadow-[0_10px_28px_rgba(59,130,246,.2)] transition hover:bg-[#4b90fb]"
            >
              <Plus className="size-4" /> Create custom
            </Link>
          </div>

          <Link
            href="#built-in-assistants"
            aria-label="Scroll to prebuilt assistants"
            className="absolute top-[calc(100%+3.5rem)] flex flex-col items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-[#687589] transition hover:text-[#a5b7cf] sm:top-[calc(100%+4.5rem)]"
          >
            Explore
            <ChevronDown className="size-4 animate-bounce motion-reduce:animate-none" />
          </Link>
        </div>
      </section>

      <section id="built-in-assistants" className="scroll-mt-5 pb-14 pt-8 sm:pb-20 sm:pt-10">
        <div className="mb-5 px-1 text-center sm:text-left">
          <h2 className="text-lg font-semibold tracking-[-0.025em] text-[#e6edf7]">Prebuilt assistants</h2>
          <p className="mt-1.5 text-xs leading-5 text-[#778396] sm:text-sm">Configured by default and ready to use. You can still change their settings whenever you want.</p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {builtinCards.map(({ key, preset, assistant }) => (
            <Link
              key={key}
              href={assistant ? `/app/bots/${assistant.id}` : "/app"}
              className="group min-h-40 rounded-2xl border border-white/[.075] bg-[linear-gradient(180deg,rgba(255,255,255,.028),rgba(255,255,255,.012))] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#375681] hover:bg-white/[.045] hover:shadow-[0_16px_44px_rgba(0,0,0,.16)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#29446b]/60 bg-[#14233a] text-[#9fc1ff]">
                  <AssistantIcon type={key} />
                </span>
                <ArrowUpRight className="size-4 text-[#647184] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#b6cdf3]" />
              </div>
              <h3 className="mt-5 truncate text-sm font-medium text-[#edf2f8]">{assistant?.name || preset.name}</h3>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#8490a1]">{assistant?.description || preset.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {customAssistants.length ? (
        <section className="border-t border-white/[.06] pb-16 pt-8">
          <div className="mb-4 px-1">
            <h2 className="text-sm font-medium text-[#dce5f2]">Your custom assistants</h2>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {customAssistants.map((assistant) => (
              <Link
                key={assistant.id}
                href={`/app/bots/${assistant.id}`}
                className="group rounded-2xl border border-white/[.075] bg-white/[.02] p-5 transition hover:border-[#375681] hover:bg-white/[.04]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#14233a] text-[#9fc1ff]"><Bot className="size-4" /></span>
                  <ArrowUpRight className="size-4 text-[#647184] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#b6cdf3]" />
                </div>
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
