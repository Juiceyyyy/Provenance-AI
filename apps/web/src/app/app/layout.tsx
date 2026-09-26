import { Sidebar } from "@/components/app/sidebar";
import { requireUser } from "@/lib/auth";
import { ensureBuiltinAssistantKnowledge } from "@/lib/bots/ensure-builtins";

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
    supabase.from("bots").select("id,name,bot_type").order("name", { ascending: true }).limit(50),
    supabase
      .from("conversations")
      .select("id,title,updated_at,last_message_at,archived_at,bot_id")
      .eq("owner_user_id", userId)
      .not("last_message_at", "is", null)
      .order("last_message_at", { ascending: false })
      .limit(50),
  ]);

  const assistantList = [...(assistants ?? [])].sort((a, b) => {
    const aCustom = a.bot_type === "custom";
    const bCustom = b.bot_type === "custom";
    if (aCustom !== bCustom) return aCustom ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  const names = new Map(assistantList.map((assistant) => [assistant.id, assistant.name]));
  const conversations = (conversationRows ?? []).map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    bot_id: conversation.bot_id,
    bot_name: names.get(conversation.bot_id) ?? "Assistant",
    archived_at: conversation.archived_at,
    last_message_at: conversation.last_message_at,
  }));

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <Sidebar assistants={assistantList} conversations={conversations} email={typeof claims.email === "string" ? claims.email : undefined} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1560px] px-3 py-3 sm:px-5 sm:py-5 lg:px-7 lg:py-7 xl:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
