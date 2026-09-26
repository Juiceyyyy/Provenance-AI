import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UploadScope = "assistant" | "global" | "conversation";

async function personalOrganizationId(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.organization_id) throw new Error("Workspace not found");
  return String(data.organization_id);
}

async function ensureNamedPrivateKb(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  name: string,
  description: string,
) {
  const { data: existing } = await supabase
    .from("knowledge_bases")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("organization_id", organizationId)
    .eq("kind", "private")
    .eq("visibility", "private")
    .eq("name", name)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return String(existing.id);

  const { data, error } = await supabase
    .from("knowledge_bases")
    .insert({
      organization_id: organizationId,
      owner_user_id: userId,
      name,
      description,
      kind: "private",
      visibility: "private",
    })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(error?.message || `Could not create ${name}`);
  return String(data.id);
}

export async function resolveUploadScope({
  supabase,
  userId,
  scope,
  botId,
  conversationId,
}: {
  supabase: SupabaseClient;
  userId: string;
  scope: UploadScope;
  botId?: string | null;
  conversationId?: string | null;
}) {
  if (scope === "assistant") {
    if (!botId) throw new Error("Assistant is required");
    const { data: bot } = await supabase
      .from("bots")
      .select("id,organization_id")
      .eq("id", botId)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (!bot) throw new Error("Assistant not found");
    const { data: link } = await supabase
      .from("bot_knowledge_bases")
      .select("knowledge_base_id,knowledge_bases!inner(kind,visibility,owner_user_id)")
      .eq("bot_id", bot.id)
      .eq("knowledge_bases.kind", "private")
      .eq("knowledge_bases.visibility", "private")
      .eq("knowledge_bases.owner_user_id", userId)
      .limit(1)
      .maybeSingle();
    if (!link?.knowledge_base_id) throw new Error("Private assistant knowledge base not found");
    return {
      organizationId: String(bot.organization_id),
      knowledgeBaseId: String(link.knowledge_base_id),
      storagePrefix: `${bot.organization_id}/${userId}/${bot.id}/`,
    };
  }

  if (scope === "conversation") {
    if (!conversationId) throw new Error("Conversation is required");
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id,organization_id,bot_id")
      .eq("id", conversationId)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (!conversation) throw new Error("Conversation not found");
    if (botId && conversation.bot_id !== botId) throw new Error("Conversation does not belong to this assistant");
    const knowledgeBaseId = await ensureNamedPrivateKb(
      supabase,
      userId,
      String(conversation.organization_id),
      "Conversation attachments",
      "Private transient documents retrievable only from conversations that explicitly attach them.",
    );
    return {
      organizationId: String(conversation.organization_id),
      knowledgeBaseId,
      storagePrefix: `${conversation.organization_id}/${userId}/conversations/${conversation.id}/`,
    };
  }

  const organizationId = await personalOrganizationId(supabase, userId);
  const { data: profile } = await supabase
    .from("profiles")
    .select("global_knowledge_base_id")
    .eq("id", userId)
    .maybeSingle();
  let knowledgeBaseId = profile?.global_knowledge_base_id ? String(profile.global_knowledge_base_id) : "";
  if (!knowledgeBaseId) {
    knowledgeBaseId = await ensureNamedPrivateKb(
      supabase,
      userId,
      organizationId,
      "Global knowledge",
      "Private documents inherited by every assistant owned by this user.",
    );
    const { error } = await supabase
      .from("profiles")
      .update({ global_knowledge_base_id: knowledgeBaseId, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) throw new Error(error.message);
  }
  return {
    organizationId,
    knowledgeBaseId,
    storagePrefix: `${organizationId}/${userId}/global/`,
  };
}
