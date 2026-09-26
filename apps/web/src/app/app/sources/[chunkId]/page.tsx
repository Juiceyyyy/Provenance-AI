import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell, Surface } from "@/components/app/page-shell";

export default async function SourcePage({ params }: { params: Promise<{ chunkId: string }> }) {
  const { chunkId } = await params;
  const { supabase } = await requireUser();
  const { data: chunk } = await supabase
    .from("chunks")
    .select("id,content,page_start,page_end,heading_path,document_id,document_version_id,documents(title,source_url,publisher,authority_level,effective_from,effective_until,mime_type)")
    .eq("id", chunkId)
    .maybeSingle();
  if (!chunk) notFound();

  const doc = Array.isArray(chunk.documents) ? chunk.documents[0] : chunk.documents;
  const { data: version } = await supabase.from("document_versions").select("storage_path").eq("id", chunk.document_version_id).maybeSingle();
  let fileUrl: string | null = null;
  if (version?.storage_path && !version.storage_path.startsWith("curated/")) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(version.storage_path, 120);
    fileUrl = data?.signedUrl ?? null;
  }
  const page = chunk.page_start ? `Page ${chunk.page_start}${chunk.page_end && chunk.page_end !== chunk.page_start ? `–${chunk.page_end}` : ""}` : null;

  return (
    <PageShell className="max-w-4xl">
      <Link href="/app/bots" className="inline-flex min-h-9 items-center gap-2 rounded-lg pr-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Back to assistants</Link>
      <header className="mt-5 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface"><FileText className="size-4 text-muted-foreground" /></span><div><p className="text-[10px] uppercase tracking-[.12em] text-subtle-foreground">Retrieved source</p><h1 className="mt-0.5 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{doc?.title || "Source"}</h1></div></div>
          <div className="mt-4 flex flex-wrap gap-1.5">{doc?.authority_level ? <Badge>{doc.authority_level}</Badge> : null}{page ? <Badge>{page}</Badge> : null}{doc?.publisher ? <Badge>{doc.publisher}</Badge> : null}</div>
        </div>
        <div className="flex flex-wrap gap-2">{doc?.source_url ? <a href={doc.source_url} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm">Source URL <ExternalLink className="size-3.5" /></Button></a> : null}{fileUrl ? <a href={fileUrl} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm">Open original <ExternalLink className="size-3.5" /></Button></a> : null}</div>
      </header>

      <Surface className="mt-6 overflow-hidden">
        {(chunk.heading_path?.length || doc?.effective_from) ? <div className="border-b border-border bg-surface-soft px-5 py-3 text-[11px] leading-5 text-subtle-foreground sm:px-6">{chunk.heading_path?.length ? <div>{chunk.heading_path.join(" › ")}</div> : null}{doc?.effective_from ? <div>Effective from {doc.effective_from}{doc.effective_until ? ` to ${doc.effective_until}` : ""}</div> : null}</div> : null}
        <div className="p-5 sm:p-6"><pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[#d7dbe1]">{chunk.content}</pre></div>
      </Surface>
      <p className="mt-4 max-w-3xl text-xs leading-5 text-muted-foreground">This view shows the exact retrieved chunk used for grounding. Open the original document or authoritative source to verify surrounding context.</p>
    </PageShell>
  );
}
