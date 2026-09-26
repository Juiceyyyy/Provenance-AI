"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function DocumentUpload({ bots }: { bots: Array<{ id: string; name: string }> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [botId, setBotId] = useState(bots[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState(false);

  async function uploadOne(file: File) {
    const prep = await fetch("/api/documents/upload-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ botId, filename: file.name, mimeType: file.type || "text/plain", size: file.size }) });
    const info = await prep.json();
    if (!prep.ok) throw new Error(`${file.name}: ${info.error || "Upload preparation failed"}`);
    const supabase = createClient();
    const { error } = await supabase.storage.from("documents").uploadToSignedUrl(info.path, info.token, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw new Error(`${file.name}: ${error.message}`);
    const finalize = await fetch("/api/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ botId, knowledgeBaseId: info.knowledgeBaseId, reservationId: info.reservationId, path: info.path, filename: file.name, mimeType: file.type || "text/plain", size: file.size }) });
    const body = await finalize.json();
    if (!finalize.ok) throw new Error(`${file.name}: ${body.error || "Could not enqueue document"}`);
  }

  async function upload(files: File[]) {
    if (!botId) { toast.error("Select an assistant first."); return; }
    if (!files.length || busy) return;
    setBusy(true);
    let succeeded = 0;
    const failures: string[] = [];
    try {
      for (let index = 0; index < files.length; index++) {
        setProgress(`${index + 1} of ${files.length}`);
        try { await uploadOne(files[index]); succeeded += 1; }
        catch (error) { failures.push(error instanceof Error ? error.message : `${files[index].name}: failed`); }
      }
      if (succeeded) toast.success(`${succeeded} document${succeeded === 1 ? "" : "s"} queued for indexing`);
      if (failures.length) toast.error(failures.slice(0, 3).join(" · ") + (failures.length > 3 ? ` · +${failures.length - 3} more` : ""));
      if (succeeded) location.reload();
    } finally {
      setBusy(false); setProgress(""); setDragging(false); if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-stretch">
      <div>
        <label className="field-label" htmlFor="knowledge-assistant">Attach to assistant</label>
        <Select id="knowledge-assistant" value={botId} onChange={(event) => setBotId(event.target.value)}>
          <option value="" disabled>Select assistant</option>
          {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
        </Select>
        <p className="helper-text mt-2">Only this assistant can retrieve from files added here. Use Global Knowledge in Settings for cross-assistant context.</p>
      </div>

      <div
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => { event.preventDefault(); if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files || [])); }}
        className={`flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-6 text-center transition ${dragging ? "border-primary/60 bg-primary/[.05]" : "border-border-strong bg-surface-soft"}`}
      >
        <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.html,.png,.jpg,.jpeg" onChange={(event) => void upload(Array.from(event.target.files || []))} />
        <span className="grid size-9 place-items-center rounded-lg border border-border bg-surface-raised text-muted-foreground">{busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}</span>
        <p className="mt-3 text-sm font-medium text-foreground">{busy ? `Uploading ${progress}` : dragging ? "Drop files to upload" : "Drop files here or choose from your device"}</p>
        <p className="mt-1 max-w-lg text-[11px] leading-5 text-subtle-foreground">PDF, Office files, text, CSV, HTML and images · up to 50 MB each</p>
        <Button type="button" size="sm" variant="secondary" className="mt-3" disabled={busy || !botId} onClick={() => inputRef.current?.click()}>{busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}{busy ? "Uploading…" : "Choose files"}</Button>
      </div>
    </div>
  );
}
