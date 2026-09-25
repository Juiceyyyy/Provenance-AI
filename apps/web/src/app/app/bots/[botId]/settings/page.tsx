import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BotSettingsForm } from "@/components/bots/bot-settings-form";
import { PageHeader, PageShell } from "@/components/app/page-shell";

export default async function BotSettingsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const { supabase } = await requireUser();
  const { data: bot } = await supabase
    .from("bots")
    .select("id,name,description,instructions,bot_type,jurisdiction_country,jurisdiction_region,web_enabled,is_builtin,preset_version")
    .eq("id", botId)
    .maybeSingle();
  if (!bot) notFound();

  return (
    <PageShell className="max-w-3xl">
      <Link href={`/app/bots/${bot.id}`} className="mb-5 inline-flex items-center gap-2 text-xs text-[#8792a3] hover:text-foreground"><ArrowLeft className="size-3.5" />Back to chat</Link>
      <PageHeader
        eyebrow={bot.is_builtin ? "Built-in assistant settings" : "Assistant settings"}
        title={bot.name}
        description={bot.is_builtin ? "The specialist preset is ready by default. Personalize its name, instructions, location and web access without rebuilding it." : "Adjust this assistant’s scope, instructions and access to live web search."}
      />
      <div className="mt-6"><BotSettingsForm bot={bot} /></div>
    </PageShell>
  );
}
