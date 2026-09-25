"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Globe2, Loader2, MessageSquarePlus, Paperclip, Send, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export type ChatBotInfo = {
  id: string;
  name: string;
  description: string | null;
  bot_type: string;
  web_enabled: boolean;
  jurisdiction_country: string | null;
  jurisdiction_region: string | null;
};

export function ChatShell({ bot, conversationId, initialMessages, starterPrompts }: { bot: ChatBotInfo; conversationId: string; initialMessages: UIMessage[]; starterPrompts: string[] }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [web, setWeb] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop } = useChat({ id: conversationId, messages: initialMessages, transport });
  const busy = status === "streaming" || status === "submitted";

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, status]);
  useEffect(() => { if (error) toast.error(error.message); }, [error]);

  async function submit(text = input) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    await sendMessage({ text: value }, { body: { botId: bot.id, conversationId, webSearch: web } });
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
    <div className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-white/[.08] bg-[#0b0e14] shadow-2xl shadow-black/10 lg:h-[calc(100dvh-3rem)] lg:rounded-2xl">
      <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-white/[.07] px-3 sm:px-4">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium sm:text-sm">{bot.name}</div>
          <div className="mt-0.5 hidden truncate text-[10px] text-muted-foreground sm:block">
            {bot.bot_type}{bot.jurisdiction_country ? ` · ${bot.jurisdiction_country}${bot.jurisdiction_region ? ` / ${bot.jurisdiction_region}` : ""}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {bot.web_enabled ? (
            <div className="flex h-9 items-center gap-2 rounded-lg border border-white/[.08] px-2 text-[11px] text-muted-foreground">
              <Globe2 className="size-3.5" />
              <span className="hidden sm:inline">Web</span>
              <Switch checked={web} onCheckedChange={setWeb} />
            </div>
          ) : (
            <span className="hidden rounded-full border border-white/[.08] px-2 py-1 text-[10px] text-muted-foreground md:inline">Indexed sources only</span>
          )}
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
          {messages.length === 0 ? (
            <div className="flex min-h-[46vh] flex-col items-center justify-center py-8 text-center">
              <div className="grid size-10 place-items-center rounded-xl border border-white/[.08] bg-white/[.035]">
                <Sparkles className="size-4 text-[#9fc1ff]" />
              </div>
              <h2 className="mt-4 text-base font-medium sm:text-lg">Ask {bot.name}</h2>
              <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">{bot.description}</p>
              <div className="mx-auto mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {starterPrompts.slice(0, 4).map((prompt) => (
                  <button
                    type="button"
                    onClick={() => submit(prompt)}
                    key={prompt}
                    className="rounded-xl border border-white/[.08] bg-white/[.025] p-3 text-left text-xs leading-5 text-[#aeb9c9] transition hover:border-[#3a5781] hover:bg-white/[.04] hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
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

      <div className="shrink-0 border-t border-white/[.07] bg-[#090c11] p-2.5 sm:p-3.5">
        <div className="mx-auto max-w-3xl">
          <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="rounded-2xl border border-white/[.09] bg-[#111722] p-2 shadow-lg shadow-black/10 focus-within:border-[#3c5e91]">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}
              rows={1}
              placeholder={`Message ${bot.name}`}
              className="max-h-36 min-h-11 w-full resize-none bg-transparent px-2 py-2.5 text-[16px] leading-6 outline-none placeholder:text-[#6f7a8b] sm:text-sm"
            />
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => toast("Upload documents from Knowledge.")} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/[.06] hover:text-foreground">
                <Paperclip className="size-4" />
              </button>
              {busy ? (
                <Button type="button" size="sm" variant="outline" onClick={() => stop()}>Stop</Button>
              ) : (
                <Button type="submit" size="sm" disabled={!input.trim()} className="rounded-lg"><Send className="size-3.5" /><span className="hidden sm:inline">Send</span></Button>
              )}
            </div>
          </form>
          <p className="mt-1.5 text-center text-[9px] leading-4 text-[#667184] sm:text-[10px]">Verify important claims against the cited source material.</p>
        </div>
      </div>
    </div>
  );
}
