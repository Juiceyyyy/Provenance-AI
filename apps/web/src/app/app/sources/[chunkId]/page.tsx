import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SourcePage({params}:{params:Promise<{chunkId:string}>}){
  const {chunkId}=await params;const{supabase}=await requireUser();
  const {data:chunk}=await supabase.from("chunks").select("id,content,page_start,page_end,heading_path,document_id,document_version_id,documents(title,source_url,publisher,authority_level,effective_from,effective_until,mime_type)").eq("id",chunkId).maybeSingle();
  if(!chunk)notFound();
  const doc=Array.isArray(chunk.documents)?chunk.documents[0]:chunk.documents;
  const {data:version}=await supabase.from("document_versions").select("storage_path").eq("id",chunk.document_version_id).maybeSingle();
  let fileUrl:string|null=null;
  if(version?.storage_path&&!version.storage_path.startsWith("curated/")){const{data}=await supabase.storage.from("documents").createSignedUrl(version.storage_path,120);fileUrl=data?.signedUrl??null;}
  const page=chunk.page_start?`Page ${chunk.page_start}${chunk.page_end&&chunk.page_end!==chunk.page_start?`–${chunk.page_end}`:""}`:null;
  return <div className="mx-auto max-w-4xl"><Link href="/app/bots" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5"/>Back</Link><div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><FileText className="size-4 text-muted-foreground"/><h1 className="text-xl font-semibold">{doc?.title||"Source"}</h1></div><div className="mt-2 flex flex-wrap gap-2">{doc?.authority_level&&<Badge>{doc.authority_level}</Badge>}{page&&<Badge>{page}</Badge>}{doc?.publisher&&<Badge>{doc.publisher}</Badge>}</div></div><div className="flex gap-2">{doc?.source_url&&<a href={doc.source_url} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm">Official/source URL<ExternalLink className="size-3.5"/></Button></a>}{fileUrl&&<a href={fileUrl} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm">Open original<ExternalLink className="size-3.5"/></Button></a>}</div></div><Card className="mt-6 p-6"><div className="mb-4 space-y-1 text-xs text-muted-foreground">{chunk.heading_path?.length?<div>{chunk.heading_path.join(" › ")}</div>:null}{doc?.effective_from?<div>Effective from {doc.effective_from}{doc.effective_until?` to ${doc.effective_until}`:""}</div>:null}</div><pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-zinc-200">{chunk.content}</pre></Card><p className="mt-4 text-xs text-muted-foreground">This view shows the exact retrieved chunk used for grounding. Open the original document or authoritative source to verify surrounding context.</p></div>
}
