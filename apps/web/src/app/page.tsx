import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, FileText, HeartPulse, PieChart, Scale, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLockup, BrandMark } from "@/components/app/brand";

const assistants = [
  [Scale, "Legal research", "Jurisdiction-aware research with authoritative-source citations."],
  [Calculator, "Tax & accounting", "Separate accounting and tax treatment with current-source grounding."],
  [BookOpen, "Study", "Turn your own notes and course material into a personal tutor."],
  [HeartPulse, "Health information", "Plain-language explanations grounded in curated and uploaded material."],
  [PieChart, "Portfolio manager", "Weights, concentration and diversification analysis—no market predictions."],
  [FileText, "Custom assistants", "Build any private assistant from your documents and instructions."],
] as const;

export default function LandingPage() {
  return (
    <main>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-sm font-semibold tracking-tight"><BrandLockup priority /></Link>
        <div className="flex gap-2"><Link href="/login"><Button variant="ghost">Log in</Button></Link><Link href="/signup"><Button>Start building</Button></Link></div>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#33558f]/50 bg-card/80 px-3 py-1 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-[#7baeff]"/> Evidence first</div>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">AI that answers from what it can trace.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Provenance turns your documents, trusted sources and specialist workflows into assistants that can answer, analyze and explain with citations you can inspect.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup"><Button size="lg">Create an assistant <ArrowRight className="size-4"/></Button></Link><a href="#assistants"><Button size="lg" variant="outline">Explore assistants</Button></a></div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted-foreground"><span>Hybrid retrieval</span><span>Private workspaces</span><span>Versioned sources</span><span>Optional web search</span><span>Inline citations</span></div>
        </div>
        <div className="brand-glow rounded-[28px] border border-[#27436f] bg-[linear-gradient(180deg,rgba(11,31,59,.92),rgba(10,15,24,.98))] p-4 shadow-2xl shadow-black/40">
          <div className="rounded-[22px] border border-[#2d4a77] bg-card/70 p-5">
            <div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-3"><BrandMark className="size-10 rounded-2xl" priority /><div><div className="text-sm font-medium">Legal Research Assistant</div><div className="mt-1 text-xs text-muted-foreground">India · Maharashtra · 18 indexed sources</div></div></div><span className="rounded-full border border-[#35548e] bg-[#10203b] px-2 py-1 text-[10px] text-[#b7cdf4]">Web off</span></div>
            <div className="space-y-4 text-sm">
              <div className="ml-auto max-w-[85%] rounded-2xl bg-[linear-gradient(180deg,#edf4ff,#dce9ff)] px-4 py-3 text-[#0b1f3b]">Does this termination clause override the statutory notice requirement?</div>
              <div className="rounded-2xl border border-[#243b60] bg-[#0d1521] p-4 leading-7 text-[#d8e3f6]">Not automatically. Clause 12 allows contractual termination, but the statutory minimum remains relevant where it applies <span className="rounded bg-[#17273d] px-1.5 py-0.5 text-xs text-[#b9d1fb]">S1</span>. Your agreement also creates a separate notice obligation in clause 8.2 <span className="rounded bg-[#17273d] px-1.5 py-0.5 text-xs text-[#b9d1fb]">S2</span>…</div>
              <div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-[#253754] bg-[#0d131d] p-3 text-xs text-muted-foreground"><b className="text-[#dde9ff]">S1</b><br/>Official statute · current version</div><div className="rounded-xl border border-[#253754] bg-[#0d131d] p-3 text-xs text-muted-foreground"><b className="text-[#dde9ff]">S2</b><br/>Employment Agreement · p.14</div></div>
            </div>
          </div>
        </div>
      </section>
      <section id="assistants" className="border-t border-[#1e2a3c] bg-[#0c1119]/70 py-20">
        <div className="mx-auto max-w-7xl px-6"><div className="mb-10"><p className="text-xs uppercase tracking-[.2em] text-muted-foreground">Built-in expertise</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">One platform, many knowledge systems.</h2></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{assistants.map(([Icon,title,description])=><div key={title} className="brand-card rounded-xl border border-border p-5"><Icon className="mb-6 size-5 text-[#8cb5ff]"/><h3 className="font-medium">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>)}</div></div>
      </section>
    </main>
  );
}
