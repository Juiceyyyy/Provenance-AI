"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DocumentUpload({bots}:{bots:Array<{id:string;name:string}>}){
  const inputRef=useRef<HTMLInputElement>(null);const[botId,setBotId]=useState(bots[0]?.id||"");const[busy,setBusy]=useState(false);const[progress,setProgress]=useState("");
  async function uploadOne(file:File){
    const prep=await fetch("/api/documents/upload-url",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({botId,filename:file.name,mimeType:file.type||"text/plain",size:file.size})});
    const info=await prep.json();if(!prep.ok)throw new Error(`${file.name}: ${info.error||"Upload preparation failed"}`);
    const supabase=createClient();const{error}=await supabase.storage.from("documents").uploadToSignedUrl(info.path,info.token,file,{contentType:file.type||"application/octet-stream"});if(error)throw new Error(`${file.name}: ${error.message}`);
    const finalize=await fetch("/api/documents",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({botId,knowledgeBaseId:info.knowledgeBaseId,path:info.path,filename:file.name,mimeType:file.type||"text/plain",size:file.size})});
    const body=await finalize.json();if(!finalize.ok)throw new Error(`${file.name}: ${body.error||"Could not enqueue document"}`);
  }
  async function upload(files:File[]){if(!botId){toast.error("Create an assistant first.");return}if(!files.length)return;setBusy(true);let succeeded=0;const failures:string[]=[];try{for(let i=0;i<files.length;i++){setProgress(`${i+1}/${files.length}`);try{await uploadOne(files[i]);succeeded++}catch(e){failures.push(e instanceof Error?e.message:`${files[i].name}: failed`)}}if(succeeded)toast.success(`${succeeded} document${succeeded===1?"":"s"} uploaded and queued for indexing`);if(failures.length)toast.error(failures.slice(0,3).join(" · ")+(failures.length>3?` · +${failures.length-3} more`:""));if(succeeded)location.reload();}finally{setBusy(false);setProgress("");if(inputRef.current)inputRef.current.value=""}}
  return <div className="rounded-xl border bg-card p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-end"><div className="flex-1"><label className="mb-1.5 block text-xs text-muted-foreground">Add to assistant</label><select value={botId} onChange={e=>setBotId(e.target.value)} className="h-10 w-full rounded-lg border bg-[#101013] px-3 text-sm outline-none"><option value="" disabled>Select assistant</option>{bots.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div><div><input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.html,.png,.jpg,.jpeg" onChange={e=>upload(Array.from(e.target.files||[]))}/><Button type="button" disabled={busy||!botId} onClick={()=>inputRef.current?.click()}>{busy?<Loader2 className="size-4 animate-spin"/>:<FileUp className="size-4"/>}{busy?`Uploading ${progress}…`:"Upload documents"}</Button></div></div><p className="mt-3 text-[11px] leading-5 text-muted-foreground">PDF, DOCX, PPTX, XLSX, TXT, Markdown, CSV, HTML and images up to 50 MB each. Each file is independently versioned and indexed. Files remain private to your workspace unless explicitly attached to a shared knowledge base.</p></div>;
}
