"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function GlobalDocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function uploadOne(file: File) {
    const mimeType = file.type || "text/plain";
    const prep = await fetch("/api/documents/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope: "global", filename: file.name, mimeType, size: file.size }),
    });
    const info = await prep.json();
    if (!prep.ok) throw new Error(info.error || "Upload preparation failed");
    const supabase = createClient();
    const { error } = await supabase.storage.from("documents").uploadToSignedUrl(info.path, info.token, file, { contentType: mimeType });
    if (error) throw new Error(error.message);
    const finalize = await fetch("/api/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scope: "global",
        knowledgeBaseId: info.knowledgeBaseId,
        path: info.path,
        filename: file.name,
        mimeType,
        size: file.size,
      }),
    });
    const body = await finalize.json();
    if (!finalize.ok) throw new Error(body.error || "Could not enqueue document");
  }

  async function upload(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    let succeeded = 0;
    const failures: string[] = [];
    try {
      for (const file of files) {
        try { await uploadOne(file); succeeded += 1; }
        catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : "failed"}`); }
      }
      if (succeeded) toast.success(`${succeeded} global document${succeeded === 1 ? "" : "s"} queued for indexing`);
      if (failures.length) toast.error(failures.slice(0, 2).join(" · "));
      if (succeeded) location.reload();
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,.html,.png,.jpg,.jpeg"
        onChange={(event) => upload(Array.from(event.target.files || []))}
      />
      <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        {busy ? "Uploading…" : "Add global documents"}
      </Button>
    </div>
  );
}
