"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatBytes } from "@/lib/utils";

export type DocumentRow = {
  id: string;
  title: string;
  status: string;
  mime_type: string | null;
  byte_size: number | string | null;
  created_at: string;
  knowledge_bases?: { name: string } | Array<{ name: string }> | null;
  document_versions?: Array<{ version_number: number; status: string; error_message: string | null; processed_at: string | null }> | null;
};

function latestVersion(document: DocumentRow) {
  return [...(document.document_versions ?? [])].sort((a, b) => b.version_number - a.version_number)[0];
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
      toast.success("Document deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete document");
    } finally {
      setBusyId(null);
    }
  }

  async function retry(id: string) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/documents/${id}/retry`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not retry ingestion");
      setDocuments((rows) => rows.map((row) => row.id === id ? { ...row, status: "queued" } : row));
      toast.success("Document queued for re-indexing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not retry ingestion");
    } finally {
      setBusyId(null);
    }
  }

  if (!documents.length) return <Card className="p-5 text-sm text-muted-foreground">No documents uploaded yet.</Card>;
  return <div className="space-y-2">{documents.map((document) => {
    const version = latestVersion(document);
    const kb = Array.isArray(document.knowledge_bases) ? document.knowledge_bases[0] : document.knowledge_bases;
    return <Card key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{document.title}</div><div className="mt-1 text-xs text-muted-foreground">{formatBytes(Number(document.byte_size || 0))} · {document.mime_type || "unknown"}{kb?.name ? ` · ${kb.name}` : ""}</div>{document.status === "failed" && version?.error_message ? <div className="mt-2 line-clamp-2 text-xs text-red-300">{version.error_message}</div> : null}</div>
      <div className="flex items-center gap-2"><Badge className={document.status === "ready" ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-300" : document.status === "failed" ? "border-red-900/60 bg-red-950/30 text-red-300" : ""}>{document.status}</Badge>{document.status === "failed" ? <Button size="sm" variant="secondary" disabled={busyId === document.id} onClick={() => retry(document.id)}><RefreshCw className="size-3.5" />Retry</Button> : null}<Button size="icon" variant="ghost" aria-label={`Delete ${document.title}`} disabled={busyId === document.id} onClick={() => remove(document.id, document.title)}><Trash2 className="size-4" /></Button></div>
    </Card>;
  })}</div>;
}
