import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/security/request";

export async function POST(req: Request, { params }: { params: Promise<{ documentId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { documentId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: document } = await supabase
    .from("documents")
    .select("id,status,organization_id,owner_user_id,document_versions(id,version_number,status)")
    .eq("id", documentId)
    .maybeSingle();
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  if (document.status !== "failed") return NextResponse.json({ error: "Only failed documents can be retried" }, { status: 409 });

  const versions = [...((document.document_versions ?? []) as Array<{ id: string; version_number: number; status: string }>)].sort((a, b) => b.version_number - a.version_number);
  const version = versions[0];
  if (!version) return NextResponse.json({ error: "Document version not found" }, { status: 409 });

  const { data: existing } = await supabase
    .from("ingestion_jobs")
    .select("id,status")
    .eq("document_version_id", version.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("ingestion_jobs").update({ status: "queued", attempts: 0, locked_at: null, locked_by: null, started_at: null, completed_at: null, error_message: null }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase.from("ingestion_jobs").insert({ organization_id: document.organization_id, document_version_id: version.id, job_type: "document_ingest", status: "queued" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: versionError } = await supabase.from("document_versions").update({ status: "queued", error_message: null }).eq("id", version.id);
  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 400 });
  const { error: documentError } = await supabase.from("documents").update({ status: "queued" }).eq("id", document.id);
  if (documentError) return NextResponse.json({ error: documentError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
