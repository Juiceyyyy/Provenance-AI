"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

export type DocumentRow = {
  id: string; title: string; status: string; mime_type: string | null; byte_size: number | string | null; created_at: string;
  knowledge_bases?: { name: string } | Array<{ name: string }> | null;
  document_versions?: Array<{ version_number: number; status: string; error_message: string | null; processed_at: string | null }> | null;
};

function latestVersion(document: DocumentRow) { return [...(document.document_versions ?? [])].sort((a, b) => b.version_number - a.version_number)[0]; }

function statusClasses(status: string) {
  if (status === "ready") return "bg-emerald-400/80 text-emerald-200";
  if (status === "failed") return "bg-red-400/80 text-red-200";
  return "bg-amber-300/80 text-amber-100";
}

export function DocumentList({ initialDocuments }: { initialDocuments: DocumentRow[] }) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasPending = useMemo(() => documents.some((document) => document.status === "queued" || document.status === "processing"), [documents]);

  useEffect(() => {
    if (!hasPending) return;
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/documents", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const body = await response.json().catch(() => null);
      if (Array.isArray(body)) setDocuments(body);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasPending]);

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete ${title}? The original file, extracted text, chunks and embeddings will be removed.`)) return;
    setBusyId(id);
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not delete document");
      setDocuments((rows) => rows.filter((row) => row.id !== id));
      toast.success("Document deleted"); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete document"); }
    finally { setBusyId(null); }
  }

  async function retry(id: string) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/documents/${id}/retry`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not retry ingestion");
      setDocuments((rows) => rows.map((row) => row.id === id ? { ...row, status: "queued" } : row));
      toast.success("Document queued for re-indexing");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not retry ingestion"); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1"><div><h2 className="text-sm font-medium text-foreground">Documents</h2><p className="mt-1 text-xs text-muted-foreground">Indexing status and attached knowledge scope.</p></div><span className="text-[11px] text-subtle-foreground">{documents.length} total</span></div>
      {!documents.length ? (
        <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border px-5 text-center"><FileText className="size-5 text-subtle-foreground" /><p className="mt-3 text-sm font-medium">No documents yet</p><p className="mt-1 text-xs text-muted-foreground">Upload a file above and its processing state will appear here.</p></div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface-soft">
          {documents.map((document) => {
            const version = latestVersion(document);
            const kb = Array.isArray(document.knowledge_bases) ? document.knowledge_bases[0] : document.knowledge_bases;
            return (
              <div key={document.id} className="flex flex-col gap-3 px-3.5 py-3.5 transition hover:bg-white/[.015] sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <div className="flex min-w-0 flex-1 gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-subtle-foreground"><FileText className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-[#dfe3e8]">{document.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-subtle-foreground"><span>{formatBytes(Number(document.byte_size || 0))}</span><span aria-hidden>·</span><span>{document.mime_type || "unknown"}</span>{kb?.name ? <><span aria-hidden>·</span><span>{kb.name}</span></> : null}</div>
                    {document.status === "failed" && version?.error_message ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-red-300">{version.error_message}</div> : null}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 pl-12 sm:justify-end sm:pl-0">
                  <span className="inline-flex items-center gap-1.5 text-[11px] capitalize text-muted-foreground"><span className={`size-1.5 rounded-full ${statusClasses(document.status).split(" ")[0]}`} />{document.status}</span>
                  <div className="flex items-center gap-1">
                    {document.status === "failed" ? <Button size="sm" variant="ghost" disabled={busyId === document.id} onClick={() => void retry(document.id)}><RefreshCw className="size-3.5" />Retry</Button> : null}
                    <Button size="icon" variant="ghost" className="size-9" aria-label={`Delete ${document.title}`} disabled={busyId === document.id} onClick={() => void remove(document.id, document.title)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
