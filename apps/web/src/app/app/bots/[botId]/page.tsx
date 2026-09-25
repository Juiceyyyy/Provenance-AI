import { notFound } from "next/navigation";
import type { UIMessage } from "ai";
import { requireUser } from "@/lib/auth";
import { BOT_PRESETS, type BotPresetKey } from "@/lib/bots/presets";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function BotChatPage({ params, searchParams }: { params: Promise<{ botId: string }>; searchParams: Promise<{ conversation?: string }> }) {
  const { botId } = await params;
  const { conversation: requestedConversationId } = await searchParams;
  const { supabase, userId } = await requireUser();
  const { data: bot } = await supabase
    .from("bots")
    .select("id,name,description,bot_type,web_enabled,jurisdiction_country,jurisdiction_region,organization_id")
    .eq("id", botId)
    .maybeSingle();
  if (!bot) notFound();

  const { data: conversationRows } = await supabase
    .from("conversations")
    .select("id,title,updated_at")
    .eq("bot_id", botId)
    .eq("owner_user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  let conversations = conversationRows ?? [];

  let conversation = requestedConversationId ? conversations.find((item) => item.id === requestedConversationId) : conversations[0];
  if (!conversation) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ organization_id: bot.organization_id, bot_id: botId, owner_user_id: userId, title: "New conversation" })
      .select("id,title,updated_at")
      .single();
    if (error || !data) throw new Error("Could not create conversation");
    conversation = data;
    conversations = [data, ...conversations];
  }

  const { data: stored } = await supabase
    .from("messages")
    .select("id,role,parts")
    .eq("conversation_id", conversation.id)
    .order("position", { ascending: true });
  const initialMessages: UIMessage[] = (stored ?? []).map((message) => ({ id: message.id, role: message.role as UIMessage["role"], parts: message.parts as UIMessage["parts"] }));
  const preset = BOT_PRESETS[bot.bot_type as BotPresetKey] ?? BOT_PRESETS.general;

  return <ChatShell key={conversation.id} bot={bot} conversationId={conversation.id} initialMessages={initialMessages} starterPrompts={preset.starterPrompts} />;
}
