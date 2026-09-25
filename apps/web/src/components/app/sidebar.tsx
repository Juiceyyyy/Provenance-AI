"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, ChevronDown, Home, LogOut, Menu, MessageSquare, Plus, Settings, X } from "lucide-react";
import { useState } from "react";
import { BrandLockup } from "@/components/app/brand";
import { createClient } from "@/lib/supabase/client";
import { ASSISTANT_CATALOG } from "@/lib/bots/catalog";
import { cn } from "@/lib/utils";

export type AssistantNavItem = {
  id: string;
  name: string;
  bot_type: string;
};

export type ConversationNavItem = {
  id: string;
  title: string;
  bot_id: string;
  bot_name: string;
};

function NavLink({ href, children, active, onNavigate }: { href: string; children: React.ReactNode; active?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition",
        active ? "bg-white/[.075] text-foreground" : "text-[#b4becd] hover:bg-white/[.055] hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function NavigationContent({
  assistants,
  conversations,
  email,
  onNavigate,
  onClose,
}: {
  assistants: AssistantNavItem[];
  conversations: ConversationNavItem[];
  email?: string;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const assistantsByType = new Map<string, AssistantNavItem>();
  for (const assistant of assistants) {
    if (!assistantsByType.has(assistant.bot_type)) assistantsByType.set(assistant.bot_type, assistant);
  }

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#090c12]">
      <div className="flex h-[66px] shrink-0 items-center justify-between px-3.5">
        <Link href="/app" onClick={onNavigate} aria-label="Provenance home">
          <BrandLockup priority markClassName="size-10" textClassName="text-[20px]" />
        </Link>
        {onClose ? (
          <button onClick={onClose} aria-label="Close navigation" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.06] hover:text-foreground">
            <X className="size-[18px]" />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 px-2.5 pb-2">
        <Link
          href="/app/bots/new"
          onClick={onNavigate}
          className="flex h-10 items-center gap-2.5 rounded-lg border border-[#2d3d56] bg-[#111722] px-3 text-[13px] font-medium text-[#e8eef8] hover:border-[#42679f] hover:bg-[#141c29]"
        >
          <Plus className="size-4 text-[#8bb7ff]" />
          New assistant
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-3">
        <nav className="space-y-0.5">
          <NavLink href="/app" active={pathname === "/app"} onNavigate={onNavigate}>
            <Home className="size-4 shrink-0" />
            Home
          </NavLink>
        </nav>

        <details open className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2.5 py-2 text-[11px] font-medium text-[#7f8a9d] transition hover:bg-white/[.035] hover:text-[#aeb9c8]">
            <span>Assistants</span>
            <ChevronDown className="size-3.5 transition group-open:rotate-180" />
          </summary>
          <div className="mt-1 space-y-0.5">
            {ASSISTANT_CATALOG.map((preset) => {
              const existing = assistantsByType.get(preset.key);
              const href = existing ? `/app/bots/${existing.id}` : `/app/bots/new?preset=${preset.key}`;
              const active = Boolean(existing && pathname.startsWith(`/app/bots/${existing.id}`));
              return (
                <NavLink key={preset.key} href={href} active={active} onNavigate={onNavigate}>
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#14233a] text-[#9fc1ff]">
                    <Bot className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{preset.name}</span>
                  {!existing ? <Plus className="size-3 shrink-0 text-[#657185]" /> : null}
                </NavLink>
              );
            })}
          </div>
        </details>

        <div className="mt-5">
          <div className="px-2.5 pb-1.5 text-[11px] font-medium text-[#7f8a9d]">Conversations</div>
          <div className="space-y-0.5">
            {conversations.length ? conversations.slice(0, 24).map((conversation) => (
              <NavLink key={conversation.id} href={`/app/bots/${conversation.bot_id}?conversation=${conversation.id}`} onNavigate={onNavigate}>
                <MessageSquare className="size-3.5 shrink-0 text-[#7f8a9d]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{conversation.title || "New conversation"}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#687487]">{conversation.bot_name}</span>
                </span>
              </NavLink>
            )) : (
              <p className="px-2.5 py-2 text-xs leading-5 text-[#737f91]">Your conversations will appear here.</p>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[.07] p-2.5">
        <div className="flex items-center gap-2 rounded-xl px-2 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#162238] text-xs font-semibold text-[#d8e6ff]">
            {(email?.[0] || "P").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 truncate text-[11px] text-[#8e9aab]">{email || "Signed in"}</div>
          <Link href="/app/settings" onClick={onNavigate} aria-label="Settings" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#8e9aab] hover:bg-white/[.055] hover:text-foreground">
            <Settings className="size-4" />
          </Link>
          <button onClick={signOut} disabled={signingOut} aria-label="Sign out" className="grid size-8 shrink-0 place-items-center rounded-lg text-[#8e9aab] hover:bg-white/[.055] hover:text-foreground disabled:opacity-50">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ assistants, conversations, email }: { assistants: AssistantNavItem[]; conversations: ConversationNavItem[]; email?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden h-dvh w-[260px] shrink-0 border-r border-white/[.07] lg:block">
        <NavigationContent assistants={assistants} conversations={conversations} email={email} />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[.07] bg-[#090c12]/95 px-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open navigation" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.06] hover:text-foreground">
          <Menu className="size-5" />
        </button>
        <Link href="/app" aria-label="Provenance home">
          <BrandLockup markClassName="size-9" textClassName="text-[18px]" />
        </Link>
        <Link href="/app/bots/new" aria-label="New assistant" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.06] hover:text-foreground">
          <Plus className="size-5" />
        </Link>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,310px)] border-r border-white/[.08] shadow-2xl shadow-black/50">
            <NavigationContent assistants={assistants} conversations={conversations} email={email} onNavigate={() => setOpen(false)} onClose={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
