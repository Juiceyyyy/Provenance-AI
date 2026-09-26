"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { FileText, Globe2, Loader2, MessageSquarePlus, Paperclip, Send, Settings2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";

export type ChatBotInfo = {
  id: string;
  name: string;
  description: string | null;
  bot_type: string;
  web_enabled: boolean;
  jurisdiction_country: string | null;
  jurisdiction_region: string | null;
};

type ConversationAttachment = {
  id: string;
  name: string;
  status: string;
  mimeType: string;
};

export function ChatShell({
  bot,
  conversationId,
  initialMessages,
  initialAttachments,
  starterPrompts,
  welcomeTitle,
  welcomeBody,
  placeholder,
}: {
  bot: ChatBotInfo;
  conversationId: string;
  initialMessages: UIMessage[];
  initialAttachments: ConversationAttachment[];
  starterPrompts: string[];
  welcomeTitle: string;
  welcomeBody: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [web, setWeb] = useState(false);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop } = useChat({ id: conversationId, messages: initialMessages, transport });
  const busy = status === "streaming" || status === "submitted";
  const emptyConversation = messages.length === 0;
  const indexing = attachments.some((item) => item.status === "queued" || item.status === "processing");

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, status]);
  useEffect(() => { if (error) toast.error(error.message); }, [error]);

  useEffect(() => {
    if (!indexing) return;
    const timer = window.setInterval(async () => {
      const pending = attachments.filter((item) => item.status === "queued" || item.status === "processing");
      const updates = await Promise.all(pending.map(async (item) => {
        const response = await fetch(`/api/documents/${item.id}`, { cache: "no-store" });
        if (!response.ok) return item;
        const body = await response.json();
        return { ...item, status: String(body.status || item.status) };
      }));
      if (updates.length) {
        const updateMap = new Map(updates.map((item) => [item.id, item]));
        setAttachments((current) => current.map((item) => updateMap.get(item.id) || item));
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [attachments, indexing]);

  async function submit(text = input) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    await sendMessage({ text: value }, { body: { botId: bot.id, conversationId, webSearch: web } });
  }

  async function uploadOne(file: File) {
    const mimeType = file.type || "text/plain";
    const prep = await fetch("/api/documents/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "conversation", botId: bot.id, conversationId, filename: file.name, mimeType, size: file.size }),
    });
    const info = await prep.json();
    if (!prep.ok) throw new Error(info.error || "Upload preparation failed");

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from("documents").uploadToSignedUrl(info.path, info.token, file, { contentType: mimeType });
    if (uploadError) throw new Error(uploadError.message);

    const finalize = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scope: "conversation",
        botId: bot.id,
        conversationId,
        knowledgeBaseId: info.knowledgeBaseId,
        path: info.path,
        filename: file.name,
        mimeType,
        size: file.size,
      }),
    });
    const body = await finalize.json();
    if (!finalize.ok) throw new Error(body.error || "Could not enqueue document");
    return { id: String(body.id), name: file.name, status: String(body.status || "queued"), mimeType } satisfies ConversationAttachment;
  }

  async function uploadFiles(files: File[]) {
    if (!files.length || uploading) return;
    setUploading(true);
    try {
      for (const file of files) {
        try {
          const attachment = await uploadOne(file);
          setAttachments((current) => [...current, attachment]);
        } catch (error) {
          toast.error(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}`);
        }
      }
    } finally {
      setUploading(false);
      setDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAttachment(id: string) {
    const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error || "Could not remove attachment");
      return;
    }
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  async function newChat() {
    const response = await fetch("/api/conversations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ botId: bot.id }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error || "Could not create conversation");
      return;
    }
    router.push(`/app/bots/${bot.id}?conversation=${body.id}`);
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[.075] bg-[#0b0e14] shadow-2xl shadow-black/10 lg:h-[calc(100dvh-3rem)]">
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-white/[.07] px-3 sm:px-4">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium sm:text-sm">{bot.name}</div>
          <div className="mt-0.5 hidden truncate text-[10px] text-muted-foreground sm:block">
            {bot.jurisdiction_country ? `${bot.jurisdiction_country}${bot.jurisdiction_region ? ` · ${bot.jurisdiction_region}` : ""}` : "Grounded assistant"}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {bot.web_enabled ? (
            <div className="flex h-9 items-center gap-2 rounded-lg border border-white/[.08] px-2 text-[11px] text-muted-foreground">
              <Globe2 className="size-3.5" />
              <span className="hidden sm:inline">Web</span>
              <Switch checked={web} onCheckedChange={setWeb} />
            </div>
          ) : null}
          <button type="button" aria-label="New chat" onClick={newChat} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.06] hover:text-foreground">
            <MessageSquarePlus className="size-4" />
          </button>
          <Link aria-label="Assistant settings" href={`/app/bots/${bot.id}/settings`} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.06] hover:text-foreground">
            <Settings2 className="size-4" />
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-5 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6">
          {emptyConversation ? (
            <div className="flex min-h-[38vh] flex-col items-center justify-center px-2 py-10 text-center sm:min-h-[42vh]">
              <div className="grid size-11 place-items-center rounded-2xl border border-white/[.08] bg-white/[.035] shadow-sm shadow-black/20">
                <Sparkles className="size-[18px] text-[#9fc1ff]" />
              </div>
              <h1 className="mt-5 max-w-xl text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{welcomeTitle}</h1>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#929eae]">{welcomeBody}</p>
            </div>
          ) : null}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent className={message.role === "user" ? "max-w-[88%] rounded-2xl bg-[#eaf1fc] px-3.5 py-2.5 text-sm text-[#102038] sm:max-w-[78%] sm:px-4 sm:py-3" : "w-full text-sm"}>
                {message.parts.map((part, index) => {
                  if (part.type === "text") return message.role === "assistant" ? <MessageResponse key={index}>{part.text}</MessageResponse> : <div key={index} className="whitespace-pre-wrap">{part.text}</div>;
                  if (part.type === "source-url") return <a key={index} href={part.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full truncate rounded-full border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground">{part.title || part.url}</a>;
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />Retrieving relevant sources…</div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 bg-[#0b0e14] px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5">
        <div className="mx-auto max-w-3xl">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.html,.png,.jpg,.jpeg"
            onChange={(event) => void uploadFiles(Array.from(event.target.files || []))}
          />
          <form
            onSubmit={(event) => { event.preventDefault(); void submit(); }}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadFiles(Array.from(event.dataTransfer.files || [])); }}
            className={`rounded-[22px] border bg-[#111722] p-2 shadow-[0_14px_40px_rgba(0,0,0,.22)] focus-within:border-[#496b9f] ${dragging ? "border-[#5b82ba] bg-[#141d2a]" : "border-white/[.1]"}`}
          >
            {attachments.length ? (
              <div className="flex flex-wrap gap-1.5 px-1.5 pb-1.5">
                {attachments.map((item) => (
                  <div key={item.id} className="flex max-w-full items-center gap-1.5 rounded-lg border border-white/[.08] bg-white/[.035] px-2 py-1.5 text-[10px] text-[#aab5c4]">
                    <FileText className="size-3.5 shrink-0" />
                    <span className="max-w-48 truncate">{item.name}</span>
                    <span className={item.status === "ready" ? "text-emerald-300/80" : item.status === "failed" ? "text-red-300/80" : "text-amber-200/70"}>
                      {item.status === "ready" ? "Ready" : item.status === "failed" ? "Failed" : "Processing"}
                    </span>
                    <button type="button" aria-label={`Remove ${item.name}`} onClick={() => void removeAttachment(item.id)} className="rounded p-0.5 hover:bg-white/[.08]"><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            ) : null}
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files || []);
                if (files.length) {
                  event.preventDefault();
                  void uploadFiles(files);
                }
              }}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }}
              rows={1}
              placeholder={dragging ? "Drop files to attach to this conversation" : placeholder}
              className="max-h-36 min-h-12 w-full resize-none bg-transparent px-2.5 py-2.5 text-[16px] leading-6 outline-none placeholder:text-[#6f7a8b] sm:text-sm"
            />
            <div className="flex items-center justify-between px-0.5">
              <button type="button" aria-label="Attach files to this conversation" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.06] hover:text-foreground disabled:opacity-50">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              </button>
              {busy ? (
                <Button type="button" size="sm" variant="outline" onClick={() => stop()}>Stop</Button>
              ) : (
                <Button type="submit" size="sm" disabled={!input.trim()} className="rounded-xl px-3"><Send className="size-3.5" /><span className="hidden sm:inline">Send</span></Button>
              )}
            </div>
          </form>

          {indexing ? <p className="mt-1.5 text-center text-[9px] leading-4 text-[#8d846a] sm:text-[10px]">Attached files are conversation-only. The free indexing worker runs periodically; use them once they show Ready.</p> : null}

          {emptyConversation ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">
              {starterPrompts.slice(0, 4).map((prompt) => (
                <button
                  type="button"
                  onClick={() => void submit(prompt)}
                  key={prompt}
                  className="shrink-0 rounded-full border border-white/[.08] bg-white/[.025] px-3 py-2 text-left text-[11px] leading-4 text-[#9ba7b8] transition hover:border-[#3a5781] hover:bg-white/[.04] hover:text-foreground sm:max-w-[48%] sm:whitespace-normal"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <p className="mt-1.5 text-center text-[9px] leading-4 text-[#667184] sm:text-[10px]">Verify important claims against the cited source material.</p>
        </div>
      </div>
    </div>
  );
}
