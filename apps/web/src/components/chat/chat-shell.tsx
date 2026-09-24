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

export type ChatBotInfo={id:string;name:string;description:string|null;bot_type:string;web_enabled:boolean;jurisdiction_country:string|null;jurisdiction_region:string|null};

export function ChatShell({bot,conversationId,initialMessages,starterPrompts}:{bot:ChatBotInfo;conversationId:string;initialMessages:UIMessage[];starterPrompts:string[]}){
  const router=useRouter();
  const [input,setInput]=useState("");
  const [web,setWeb]=useState(false);
  const endRef=useRef<HTMLDivElement>(null);
  const transport=useMemo(()=>new DefaultChatTransport({api:"/api/chat"}),[]);
  const {messages,sendMessage,status,error,stop}=useChat({id:conversationId,messages:initialMessages,transport});
  const busy=status==="streaming"||status==="submitted";
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth",block:"end"})},[messages,status]);
  useEffect(()=>{if(error)toast.error(error.message)},[error]);
  async function submit(text=input){const value=text.trim();if(!value||busy)return;setInput("");await sendMessage({text:value},{body:{botId:bot.id,conversationId,webSearch:web}})}
  async function newChat(){const response=await fetch("/api/conversations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({botId:bot.id})});const body=await response.json().catch(()=>({}));if(!response.ok){toast.error(body.error||"Could not create conversation");return;}router.push(`/app/bots/${bot.id}?conversation=${body.id}`);router.refresh();}

  return <div className="flex h-[calc(100vh-8.5rem)] min-h-[620px] flex-col overflow-hidden rounded-xl border bg-[#0c0c0e]">
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3"><div className="min-w-0"><div className="truncate text-sm font-medium">{bot.name}</div><div className="mt-0.5 truncate text-[11px] text-muted-foreground">{bot.bot_type}{bot.jurisdiction_country?` · ${bot.jurisdiction_country}${bot.jurisdiction_region?` / ${bot.jurisdiction_region}`:""}`:""}</div></div><div className="flex items-center gap-2"><button type="button" aria-label="New chat" onClick={newChat} className="grid size-8 place-items-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"><MessageSquarePlus className="size-3.5"/></button><Link aria-label="Assistant settings" href={`/app/bots/${bot.id}/settings`} className="grid size-8 place-items-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"><Settings2 className="size-3.5"/></Link>{bot.web_enabled?<div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs text-muted-foreground"><Globe2 className="size-3.5"/><span className="hidden sm:inline">Web</span><Switch checked={web} onCheckedChange={setWeb}/></div>:<span className="hidden rounded-full border px-2 py-1 text-[10px] text-muted-foreground sm:inline">Indexed sources only</span>}</div></div>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.length===0&&<div className="py-16 text-center"><div className="mx-auto grid size-10 place-items-center rounded-xl border bg-card"><Sparkles className="size-4"/></div><h2 className="mt-4 font-medium">Ask {bot.name}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{bot.description}</p><div className="mx-auto mt-6 grid max-w-xl gap-2 sm:grid-cols-2">{starterPrompts.slice(0,4).map(p=><button onClick={()=>submit(p)} key={p} className="rounded-lg border bg-card p-3 text-left text-xs leading-5 text-muted-foreground transition hover:border-zinc-600 hover:text-foreground">{p}</button>)}</div></div>}
        {messages.map(message=><Message from={message.role} key={message.id}><MessageContent className={message.role==="user"?"rounded-xl bg-zinc-100 px-4 py-3 text-zinc-950":"w-full"}>{message.parts.map((part,index)=>{if(part.type==="text")return message.role==="assistant"?<MessageResponse key={index}>{part.text}</MessageResponse>:<div key={index} className="whitespace-pre-wrap">{part.text}</div>;if(part.type==="source-url")return <a key={index} href={part.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full truncate rounded-full border px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground">{part.title||part.url}</a>;return null})}</MessageContent></Message>)}
        {status==="submitted"&&<div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin"/>Retrieving relevant sources…</div>}
        <div ref={endRef}/>
      </div>
    </div>
    <div className="border-t bg-[#0b0b0d] p-3 md:p-4"><div className="mx-auto max-w-3xl"><form onSubmit={e=>{e.preventDefault();submit()}} className="rounded-xl border bg-card p-2 focus-within:border-zinc-600"><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submit()}}} rows={2} placeholder="Ask from your knowledge…" className="max-h-40 min-h-14 w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"/><div className="flex items-center justify-between"><button type="button" onClick={()=>toast("Upload documents from the Knowledge tab.")} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Paperclip className="size-4"/></button>{busy?<Button type="button" size="sm" variant="outline" onClick={()=>stop()}>Stop</Button>:<Button type="submit" size="sm" disabled={!input.trim()}><Send className="size-3.5"/>Send</Button>}</div></form><p className="mt-2 text-center text-[10px] text-muted-foreground">AI can make mistakes. Verify important claims against the cited source material.</p></div></div>
  </div>
}
