"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ConversationListItem = { id: string; title: string; updated_at: string };

export function ConversationSidebar({ botId, activeId, conversations }: { botId: string; activeId: string; conversations: ConversationListItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function createConversation() {
    setBusy(true);
    try {
      const res = await fetch("/api/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ botId }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not create conversation");
      router.push(`/app/bots/${botId}?conversation=${body.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create conversation");
    } finally {
      setBusy(false);
    }
  }

  async function removeConversation(id: string) {
    if (conversations.length <= 1) {
      toast.error("Keep at least one conversation. Create a new chat before deleting this one.");
      return;
    }
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error || "Could not delete conversation");
      return;
    }
    const fallback = conversations.find((conversation) => conversation.id !== id);
    router.push(`/app/bots/${botId}${fallback ? `?conversation=${fallback.id}` : ""}`);
    router.refresh();
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col overflow-hidden rounded-xl border bg-[#0c0c0e] lg:flex">
      <div className="border-b p-3">
        <Button className="w-full" size="sm" onClick={createConversation} disabled={busy}>
          <MessageSquarePlus className="size-4" /> New chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {conversations.map((conversation) => (
          <div key={conversation.id} className={`group mb-1 flex items-center rounded-lg ${conversation.id === activeId ? "bg-muted" : "hover:bg-muted/60"}`}>
            <Link href={`/app/bots/${botId}?conversation=${conversation.id}`} className="min-w-0 flex-1 px-3 py-2.5">
              <div className="truncate text-xs text-zinc-200">{conversation.title || "New conversation"}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">{new Date(conversation.updated_at).toLocaleDateString()}</div>
            </Link>
            <button
              aria-label="Delete conversation"
              onClick={() => removeConversation(conversation.id)}
              className="mr-2 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="border-t p-2">
        <Link href={`/app/bots/${botId}/settings`} className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
          <Settings2 className="size-3.5" /> Assistant settings
        </Link>
      </div>
    </aside>
  );
}
