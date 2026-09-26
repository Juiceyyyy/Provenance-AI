"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DocumentUpload({ bots }: { bots: Array<{ id: string; name: string }> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [botId, setBotId] = useState(bots[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

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
    if (!botId) { toast.error("Create an assistant first."); return; }
    if (!files.length) return;
    setBusy(true);
    let succeeded = 0;
    const failures: string[] = [];
    try {
      for (let index = 0; index < files.length; index++) {
        setProgress(`${index + 1}/${files.length}`);
        try { await uploadOne(files[index]); succeeded++; } catch (error) { failures.push(error instanceof Error ? error.message : `${files[index].name}: failed`); }
      }
      if (succeeded) toast.success(`${succeeded} document${succeeded === 1 ? "" : "s"} uploaded and queued for indexing`);
      if (failures.length) toast.error(failures.slice(0, 3).join(" · ") + (failures.length > 3 ? ` · +${failures.length - 3} more` : ""));
      if (succeeded) location.reload();
    } finally {
      setBusy(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-medium text-[#e2e8f1]">Add documents</h2>
        <p className="mt-1 text-xs leading-5 text-[#818d9e]">Choose which assistant can retrieve from these files.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs text-[#8d98a8]">Assistant</label>
          <select value={botId} onChange={(event) => setBotId(event.target.value)} className="h-10 w-full rounded-lg border border-white/[.09] bg-[#10151d] px-3 text-sm text-[#e1e7ef] outline-none transition focus:border-[#42679f]">
            <option value="" disabled>Select assistant</option>
            {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
          </select>
        </div>
        <div>
          <input ref={inputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.html,.png,.jpg,.jpeg" onChange={(event) => upload(Array.from(event.target.files || []))} />
          <Button type="button" className="w-full sm:w-auto" disabled={busy || !botId} onClick={() => inputRef.current?.click()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}{busy ? `Uploading ${progress}…` : "Upload documents"}</Button>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#707c8e]">PDF, DOCX, PPTX, XLSX, TXT, Markdown, CSV, HTML and images up to 50 MB each. Raw files are temporary; the private indexed knowledge remains available to the selected assistant.</p>
    </div>
  );
}
