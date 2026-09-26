import { Sidebar } from "@/components/app/sidebar";
import { requireUser } from "@/lib/auth";
import { ensureBuiltinAssistantKnowledge } from "@/lib/bots/ensure-builtins";

const SIDEBAR_CONVERSATION_PAGE_SIZE = 20;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, claims } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_country,default_region")
    .eq("id", userId)
    .maybeSingle();

  await ensureBuiltinAssistantKnowledge({
    supabase,
    userId,
    jurisdiction: { country: profile?.default_country || null, region: profile?.default_region || null },
  });

  const [{ data: assistants }, { data: conversationRows }] = await Promise.all([
    supabase.from("bots").select("id,name,bot_type").order("name", { ascending: true }).limit(100),
    supabase
      .from("conversations")
      .select("id,title,last_message_at,archived_at,bot_id")
      .eq("owner_user_id", userId)
      .not("last_message_at", "is", null)
      .order("last_message_at", { ascending: false })
      .limit(SIDEBAR_CONVERSATION_PAGE_SIZE + 1),
  ]);

  const assistantList = [...(assistants ?? [])].sort((a, b) => {
    const aCustom = a.bot_type === "custom";
    const bCustom = b.bot_type === "custom";
    if (aCustom !== bCustom) return aCustom ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  const names = new Map(assistantList.map((assistant) => [assistant.id, assistant.name]));
  const rawConversations = conversationRows ?? [];
  const conversations = rawConversations.slice(0, SIDEBAR_CONVERSATION_PAGE_SIZE).map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    bot_id: conversation.bot_id,
    bot_name: names.get(conversation.bot_id) ?? "Assistant",
    archived_at: conversation.archived_at,
    last_message_at: conversation.last_message_at,
  }));

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <Sidebar
        assistants={assistantList}
        conversations={conversations}
        hasMoreConversations={rawConversations.length > SIDEBAR_CONVERSATION_PAGE_SIZE}
        email={typeof claims.email === "string" ? claims.email : undefined}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1600px] px-2.5 py-2.5 sm:px-4 sm:py-4 lg:px-5 lg:py-5 xl:px-7 xl:py-7 2xl:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
