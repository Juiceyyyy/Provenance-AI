import { Sidebar } from "@/components/app/sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, userId, claims } = await requireUser();

  const [{ data: assistants }, { data: conversationRows }] = await Promise.all([
    supabase
      .from("bots")
      .select("id,name,bot_type")
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("conversations")
      .select("id,title,updated_at,bot_id")
      .eq("owner_user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const assistantList = assistants ?? [];
  const names = new Map(assistantList.map((assistant) => [assistant.id, assistant.name]));
  const conversations = (conversationRows ?? []).map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    bot_id: conversation.bot_id,
    bot_name: names.get(conversation.bot_id) ?? "Assistant",
  }));

  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar
        assistants={assistantList}
        conversations={conversations}
        email={typeof claims.email === "string" ? claims.email : undefined}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1440px] px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
