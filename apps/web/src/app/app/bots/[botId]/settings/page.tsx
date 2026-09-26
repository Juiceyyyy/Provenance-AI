import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BotSettingsForm } from "@/components/bots/bot-settings-form";
import { PageHeader, PageShell } from "@/components/app/page-shell";

export default async function BotSettingsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const { supabase } = await requireUser();
  const [{ data: bot }, { data: packs }, { data: links }] = await Promise.all([
    supabase.from("bots").select("id,name,description,instructions,bot_type,jurisdiction_country,jurisdiction_region,web_enabled,is_builtin,preset_version,follow_profile_jurisdiction").eq("id", botId).maybeSingle(),
    supabase.from("knowledge_bases").select("id,name,slug,domains,coverage_status,jurisdiction_country,jurisdiction_region").eq("visibility", "public").in("coverage_status", ["active", "partial"]).order("jurisdiction_country", { ascending: true, nullsFirst: true }).order("name"),
    supabase.from("bot_knowledge_bases").select("knowledge_base_id,knowledge_bases!inner(visibility)").eq("bot_id", botId).eq("knowledge_bases.visibility", "public"),
  ]);
  if (!bot) notFound();

  return (
    <PageShell className="max-w-4xl">
      <Link href={`/app/bots/${bot.id}`} className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-lg pr-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Back to chat</Link>
      <PageHeader eyebrow={bot.is_builtin ? "Built-in assistant settings" : "Assistant settings"} title={bot.name} description={bot.is_builtin ? "Personalize the ready-made specialist without rebuilding its core role or safeguards." : "Adjust this assistant’s role, source access, location and optional web access."} />
      <div className="mt-7">
        <BotSettingsForm
          bot={bot}
          publicPacks={(packs ?? []).map((pack) => ({ id: String(pack.id), name: String(pack.name), slug: pack.slug ? String(pack.slug) : null, domains: Array.isArray(pack.domains) ? pack.domains.map(String) : [], coverageStatus: String(pack.coverage_status || "active"), country: pack.jurisdiction_country ? String(pack.jurisdiction_country) : null, region: pack.jurisdiction_region ? String(pack.jurisdiction_region) : null }))}
          linkedPackIds={(links ?? []).map((link) => String(link.knowledge_base_id))}
        />
      </div>
    </PageShell>
  );
}
