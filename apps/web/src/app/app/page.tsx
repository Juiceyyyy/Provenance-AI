import Link from "next/link";
import { ArrowUpRight, Bot, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PRESET_LIST } from "@/lib/bots/presets";

export default async function HomePage() {
  const { supabase } = await requireUser();
  const { data: assistants } = await supabase
    .from("bots")
    .select("id,name,description,bot_type")
    .order("updated_at", { ascending: false })
    .limit(12);

  const hasAssistants = Boolean(assistants?.length);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-5xl flex-col justify-center py-8 sm:py-12 lg:min-h-[calc(100dvh-3rem)]">
      <section className="mx-auto w-full max-w-2xl text-center">
        <p className="text-xs font-medium text-[#8d99ab]">Grounded in evidence.</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">What do you want to work on?</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
          Choose an assistant to start a sourced conversation, or create one around your own documents and instructions.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/app/bots/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#eef4ff] px-4 text-sm font-medium text-[#0b1f3b] transition hover:bg-white"
          >
            <Plus className="size-4" /> New assistant
          </Link>
        </div>
      </section>

      <section className="mt-10 sm:mt-12">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-[#dce5f2]">{hasAssistants ? "Your assistants" : "Start with a specialist"}</h2>
          {hasAssistants ? <Link href="/app/bots" className="text-xs text-muted-foreground hover:text-foreground">View all</Link> : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {hasAssistants ? assistants!.map((assistant) => (
            <Link
              key={assistant.id}
              href={`/app/bots/${assistant.id}`}
              className="group rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition hover:border-[#375681] hover:bg-white/[.045] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#14233a] text-[#9fc1ff]">
                  <Bot className="size-4" />
                </span>
                <ArrowUpRight className="size-4 text-[#647184] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#b6cdf3]" />
              </div>
              <h3 className="mt-4 truncate text-sm font-medium">{assistant.name}</h3>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{assistant.description || "Grounded assistant"}</p>
            </Link>
          )) : PRESET_LIST.slice(0, 6).map((preset) => (
            <Link
              key={preset.key}
              href={`/app/bots/new?preset=${preset.key}`}
              className="group rounded-2xl border border-white/[.08] bg-white/[.025] p-4 transition hover:border-[#375681] hover:bg-white/[.045] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#14233a] text-[#9fc1ff]">
                  <Bot className="size-4" />
                </span>
                <ArrowUpRight className="size-4 text-[#647184] opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#b6cdf3]" />
              </div>
              <h3 className="mt-4 text-sm font-medium">{preset.name}</h3>
              <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{preset.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
