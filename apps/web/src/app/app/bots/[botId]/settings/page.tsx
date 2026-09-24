import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BotSettingsForm } from "@/components/bots/bot-settings-form";

export default async function BotSettingsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const { supabase } = await requireUser();
  const { data: bot } = await supabase
    .from("bots")
    .select("id,name,description,instructions,bot_type,jurisdiction_country,jurisdiction_region,web_enabled")
    .eq("id", botId)
    .maybeSingle();
  if (!bot) notFound();

  return <div className="mx-auto max-w-3xl"><Link href={`/app/bots/${bot.id}`} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Back to assistant</Link><div className="mb-7 mt-5"><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">Assistant settings</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{bot.name}</h1></div><BotSettingsForm bot={bot} /></div>;
}
