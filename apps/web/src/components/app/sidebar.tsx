"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLockup, BrandMark } from "@/components/app/brand";
import { AssistantIcon } from "@/components/app/assistant-icon";
import { createClient } from "@/lib/supabase/client";
import { ASSISTANT_CATALOG } from "@/lib/bots/catalog";
import { cn } from "@/lib/utils";

export type AssistantNavItem = { id: string; name: string; bot_type: string };
export type ConversationNavItem = { id: string; title: string; bot_id: string; bot_name: string; archived_at: string | null; last_message_at: string | null };

function NavLink({ href, children, active, collapsed = false, onNavigate, title }: { href: string; children: React.ReactNode; active?: boolean; collapsed?: boolean; onNavigate?: () => void; title?: string }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={title}
      className={cn(
        "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/35",
        collapsed && "mx-auto size-10 min-h-10 justify-center px-0 py-0",
        active ? "bg-white/[.055] text-foreground" : "text-[#aeb4bd] hover:bg-white/[.035] hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function ConversationRow({ conversation, archived, working, onNavigate, onArchive, onDelete }: {
  conversation: ConversationNavItem;
  archived: boolean;
  working: boolean;
  onNavigate?: () => void;
  onArchive: (conversation: ConversationNavItem, archived: boolean) => void;
  onDelete: (conversation: ConversationNavItem) => void;
}) {
  return (
    <div className="group flex items-center rounded-lg transition hover:bg-white/[.03]">
      <Link href={`/app/bots/${conversation.bot_id}?conversation=${conversation.id}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-start gap-2.5 px-2.5 py-2">
        <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-subtle-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] text-[#bbc0c8]">{conversation.title || "Conversation"}</span>
          <span className="mt-0.5 block truncate text-[10px] text-subtle-foreground">{conversation.bot_name}</span>
        </span>
      </Link>
      <div className="mr-1 flex shrink-0 items-center gap-0.5 opacity-70 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <button type="button" disabled={working} aria-label={archived ? "Restore conversation" : "Archive conversation"} title={archived ? "Restore" : "Archive"} onClick={() => onArchive(conversation, !archived)} className="grid size-7 place-items-center rounded-md text-subtle-foreground hover:bg-white/[.05] hover:text-foreground disabled:opacity-40">
          {archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
        </button>
        <button type="button" disabled={working} aria-label="Delete conversation" title="Delete" onClick={() => onDelete(conversation)} className="grid size-7 place-items-center rounded-md text-subtle-foreground hover:bg-red-500/[.08] hover:text-red-300 disabled:opacity-40">
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function NavigationContent({ assistants, conversations, email, collapsed = false, onToggleCollapse, onNavigate, onClose }: {
  assistants: AssistantNavItem[];
  conversations: ConversationNavItem[];
  email?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [conversationBusy, setConversationBusy] = useState<string | null>(null);
  const assistantsByType = new Map<string, AssistantNavItem>();
  for (const assistant of assistants) if (!assistantsByType.has(assistant.bot_type)) assistantsByType.set(assistant.bot_type, assistant);
  const activeConversations = conversations.filter((conversation) => !conversation.archived_at);
  const archivedConversations = conversations.filter((conversation) => Boolean(conversation.archived_at));

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function setArchived(conversation: ConversationNavItem, archived: boolean) {
    const busyKey = `${archived ? "archive" : "restore"}:${conversation.id}`;
    setConversationBusy(busyKey);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Could not ${archived ? "archive" : "restore"} conversation`);
      const currentConversation = new URLSearchParams(window.location.search).get("conversation");
      if (archived && currentConversation === conversation.id) router.push(`/app/bots/${conversation.bot_id}`);
      router.refresh();
      toast.success(archived ? "Conversation archived" : "Conversation restored");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update conversation");
    } finally { setConversationBusy(null); }
  }

  async function deleteConversation(conversation: ConversationNavItem) {
    if (!window.confirm(`Delete “${conversation.title || "Conversation"}”? This cannot be undone.`)) return;
    setConversationBusy(`delete:${conversation.id}`);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not delete conversation");
      const currentConversation = new URLSearchParams(window.location.search).get("conversation");
      if (currentConversation === conversation.id) router.push(`/app/bots/${conversation.bot_id}`);
      router.refresh();
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete conversation");
    } finally { setConversationBusy(null); }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-soft">
      <div className={cn(
        "shrink-0",
        collapsed ? "flex flex-col items-center gap-1.5 px-2 py-2.5" : "flex h-16 items-center justify-between px-3.5",
      )}>
        <Link href="/app" onClick={onNavigate} aria-label="Provenance home" title={collapsed ? "Provenance" : undefined} className={cn(collapsed && "grid size-10 place-items-center rounded-xl hover:bg-white/[.03]")}>
          {collapsed ? <BrandMark priority className="size-8" /> : <BrandLockup priority markClassName="size-9" textClassName="text-[19px]" />}
        </Link>
        {onClose ? (
          <button onClick={onClose} aria-label="Close navigation" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.04] hover:text-foreground"><X className="size-[18px]" /></button>
        ) : onToggleCollapse ? (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "grid place-items-center rounded-lg border border-transparent text-subtle-foreground transition hover:border-border hover:bg-white/[.035] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/35",
              collapsed ? "size-9" : "size-8",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-[17px]" /> : <PanelLeftClose className="size-4" />}
          </button>
        ) : null}
      </div>

      <div className={cn("shrink-0 pb-2", collapsed ? "px-2.5" : "px-2.5")}>
        <Link
          href="/app/bots/new"
          onClick={onNavigate}
          title={collapsed ? "New custom assistant" : undefined}
          aria-label="New custom assistant"
          className={cn(
            "flex h-10 items-center rounded-lg text-[13px] font-medium text-[#dfe3e9] transition",
            collapsed
              ? "mx-auto size-10 justify-center border border-transparent bg-transparent p-0 hover:border-border hover:bg-surface"
              : "gap-2.5 border border-border bg-surface px-3 hover:border-border-strong hover:bg-surface-raised",
          )}
        >
          <Plus className="size-4 shrink-0 text-[#9dbaf0]" />{!collapsed ? "New custom assistant" : null}
        </Link>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3 [scrollbar-gutter:stable]", collapsed ? "px-2.5" : "px-2.5")}>
        <nav className="space-y-0.5">
          <NavLink href="/app" active={pathname === "/app"} collapsed={collapsed} onNavigate={onNavigate} title={collapsed ? "Home" : undefined}><Home className="size-[18px] shrink-0" />{!collapsed ? "Home" : null}</NavLink>
        </nav>

        <div className={cn("mt-4 border-t border-border pt-3", collapsed && "mx-auto w-10 space-y-1") }>
          {!collapsed ? <div className="mb-1 px-2.5 text-[10px] font-medium uppercase tracking-[.12em] text-subtle-foreground">Assistants</div> : null}
          <div className="space-y-0.5">
            {ASSISTANT_CATALOG.map((preset) => {
              const existing = assistantsByType.get(preset.key);
              const isCustom = preset.key === "custom";
              const href = existing ? `/app/bots/${existing.id}` : isCustom ? "/app/bots/new" : "/app";
              const active = Boolean(existing && pathname.startsWith(`/app/bots/${existing.id}`));
              return (
                <NavLink key={preset.key} href={href} active={active} collapsed={collapsed} onNavigate={onNavigate} title={collapsed ? preset.name : undefined}>
                  <AssistantIcon type={preset.key} className="size-6 rounded-md border-0 bg-transparent text-[#9ea8b8]" />
                  {!collapsed ? <span className="min-w-0 flex-1 truncate">{preset.name}</span> : null}
                  {!collapsed && isCustom && !existing ? <Plus className="size-3 shrink-0 text-subtle-foreground" /> : null}
                </NavLink>
              );
            })}
          </div>
        </div>

        {!collapsed ? (
          <div className="mt-5 border-t border-border pt-3">
            <div className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-[.12em] text-subtle-foreground">Recent chats</div>
            <div className="space-y-0.5">
              {activeConversations.length ? activeConversations.slice(0, 24).map((conversation) => (
                <ConversationRow key={conversation.id} conversation={conversation} archived={false} working={conversationBusy?.endsWith(`:${conversation.id}`) ?? false} onNavigate={onNavigate} onArchive={(item, next) => void setArchived(item, next)} onDelete={(item) => void deleteConversation(item)} />
              )) : <p className="px-2.5 py-2 text-xs leading-5 text-subtle-foreground">Your recent conversations will appear here.</p>}
            </div>
            {archivedConversations.length ? (
              <details className="group mt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2.5 py-2 text-[11px] font-medium text-subtle-foreground hover:bg-white/[.03] hover:text-muted-foreground">
                  <span>Archived · {archivedConversations.length}</span><ChevronDown className="size-3.5 transition group-open:rotate-180" />
                </summary>
                <div className="mt-1 space-y-0.5">
                  {archivedConversations.slice(0, 24).map((conversation) => (
                    <ConversationRow key={conversation.id} conversation={conversation} archived working={conversationBusy?.endsWith(`:${conversation.id}`) ?? false} onNavigate={onNavigate} onArchive={(item, next) => void setArchived(item, next)} onDelete={(item) => void deleteConversation(item)} />
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={cn("shrink-0 border-t border-border bg-surface-soft", collapsed ? "px-2.5 py-2" : "p-2.5")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <div title={email || "Signed in"} className="mb-1 grid size-9 place-items-center rounded-full border border-border bg-surface-raised text-xs font-semibold text-[#dce1e7]">{(email?.[0] || "P").toUpperCase()}</div>
            <Link href="/app/settings" onClick={onNavigate} aria-label="Settings" title="Settings" className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.04] hover:text-foreground"><Settings className="size-[18px]" /></Link>
            <button onClick={signOut} disabled={signingOut} aria-label="Sign out" title="Sign out" className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.04] hover:text-foreground disabled:opacity-50"><LogOut className="size-[18px]" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-xs font-semibold text-[#dce1e7]">{(email?.[0] || "P").toUpperCase()}</div>
            <div className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{email || "Signed in"}</div>
            <Link href="/app/settings" onClick={onNavigate} aria-label="Settings" title="Settings" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.04] hover:text-foreground"><Settings className="size-4" /></Link>
            <button onClick={signOut} disabled={signingOut} aria-label="Sign out" title="Sign out" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.04] hover:text-foreground disabled:opacity-50"><LogOut className="size-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ assistants, conversations, email }: { assistants: AssistantNavItem[]; conversations: ConversationNavItem[]; email?: string }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setCollapsed(window.localStorage.getItem("provenance-sidebar-collapsed") === "1"));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("provenance-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
      <aside className={cn("sticky top-0 z-30 hidden h-dvh max-h-dvh self-start shrink-0 overflow-hidden border-r border-border transition-[width] duration-150 lg:block", collapsed ? "w-[76px]" : "w-[252px]")}>
        <NavigationContent assistants={assistants} conversations={conversations} email={email} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open navigation" className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.04] hover:text-foreground"><Menu className="size-5" /></button>
        <Link href="/app" aria-label="Provenance home"><BrandLockup markClassName="size-8" textClassName="text-[17px]" /></Link>
        <Link href="/app/bots/new" aria-label="New custom assistant" className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.04] hover:text-foreground"><Plus className="size-5" /></Link>
      </header>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,310px)] border-r border-border shadow-2xl shadow-black/50">
            <NavigationContent assistants={assistants} conversations={conversations} email={email} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}