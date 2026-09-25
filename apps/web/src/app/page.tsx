import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, FileText, HeartPulse, PieChart, Scale, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/app/brand";

const assistants = [
  [Scale, "Legal research"],
  [Calculator, "Tax & accounting"],
  [BookOpen, "Study"],
  [HeartPulse, "Health information"],
  [PieChart, "Portfolio analysis"],
  [FileText, "Custom assistants"],
] as const;

export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      <nav className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Provenance home">
          <BrandLockup priority markClassName="size-11" textClassName="text-[21px]" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/login"><Button variant="ghost" className="px-3 sm:px-4">Log in</Button></Link>
          <Link href="/signup"><Button className="px-3 sm:px-4">Get started</Button></Link>
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-14 pt-20 text-center sm:px-6 sm:pb-20 sm:pt-28 lg:pt-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-white/[.025] px-3 py-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-[#8db7ff]" /> Grounded in evidence
        </div>
        <h1 className="mt-6 max-w-4xl text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-[4.8rem]">
          Ask your knowledge.<br className="hidden sm:block" /> See the evidence.
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          Provenance turns your documents and trusted sources into specialist AI assistants that answer with traceable citations.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col justify-center gap-2.5 sm:w-auto sm:max-w-none sm:flex-row">
          <Link href="/signup"><Button size="lg" className="w-full sm:w-auto">Create an assistant <ArrowRight className="size-4" /></Button></Link>
          <Link href="/login"><Button size="lg" variant="outline" className="w-full sm:w-auto">Open workspace</Button></Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-16 sm:px-6 sm:pb-24">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[.08] bg-white/[.08] md:grid-cols-3">
          <div className="bg-[#0b0f16] p-5 sm:p-6">
            <div className="text-sm font-medium">Use your sources</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">Upload private documents or connect curated knowledge packs.</p>
          </div>
          <div className="bg-[#0b0f16] p-5 sm:p-6">
            <div className="text-sm font-medium">Retrieve before answering</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">Hybrid search finds relevant evidence before a response is generated.</p>
          </div>
          <div className="bg-[#0b0f16] p-5 sm:p-6">
            <div className="text-sm font-medium">Inspect every claim</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">Citations keep important answers traceable to the underlying source.</p>
          </div>
        </div>

        <div className="mt-12 sm:mt-16">
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">One workspace, different specialists.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Use a focused assistant or build your own.</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {assistants.map(([Icon, title]) => (
              <div key={title} className="flex min-h-20 items-center gap-3 rounded-xl border border-white/[.08] bg-white/[.02] p-3.5 sm:min-h-24 sm:p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#14233a] text-[#9fc1ff]"><Icon className="size-4" /></span>
                <span className="text-left text-xs font-medium leading-5 sm:text-sm">{title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[.07] px-5 py-7 text-center text-[11px] text-muted-foreground sm:text-xs">
        Private workspaces · Versioned sources · Inline citations · Open source
      </footer>
    </main>
  );
}
