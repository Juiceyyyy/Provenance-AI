import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/security/request";

const schema = z.object({
  botId: z.string().uuid(),
  knowledgeBaseId: z.string().uuid(),
  path: z.string().min(10).max(700),
  filename: z.string().min(1).max(240),
  mimeType: z.string().max(160),
  size: z.number().int().positive().max(50 * 1024 * 1024),
});

export async function GET() {
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("documents")
    .select("id,title,status,mime_type,byte_size,created_at,knowledge_bases(name),document_versions(version_number,status,error_message,processed_at)")
    .order("created_at", { ascending: false })
    .limit(100);
  return error
    ? NextResponse.json({ error: error.message }, { status: 400 })
    : NextResponse.json(data ?? [], { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: Request) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid document metadata" }, { status: 400 });
  const input = parsed.data;

  const { data: bot } = await supabase.from("bots").select("organization_id").eq("id", input.botId).maybeSingle();
  if (!bot) return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
  const expectedPrefix = `${bot.organization_id}/${userId}/${input.botId}/`;
  if (!input.path.startsWith(expectedPrefix)) return NextResponse.json({ error: "Invalid storage path" }, { status: 403 });
  const { data: link } = await supabase
    .from("bot_knowledge_bases")
    .select("knowledge_base_id")
    .eq("bot_id", input.botId)
    .eq("knowledge_base_id", input.knowledgeBaseId)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "Knowledge base mismatch" }, { status: 403 });

  const cleanupFile = async () => { await supabase.storage.from("documents").remove([input.path]); };
  const { data: document, error } = await supabase
    .from("documents")
    .insert({ organization_id: bot.organization_id, owner_user_id: userId, knowledge_base_id: input.knowledgeBaseId, title: input.filename, mime_type: input.mimeType, byte_size: input.size, status: "queued" })
    .select("id")
    .single();
  if (error || !document) {
    await cleanupFile();
    return NextResponse.json({ error: error?.message || "Could not create document" }, { status: 400 });
  }

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({ document_id: document.id, version_number: 1, storage_path: input.path, status: "queued" })
    .select("id")
    .single();
  if (versionError || !version) {
    await supabase.from("documents").delete().eq("id", document.id);
    await cleanupFile();
    return NextResponse.json({ error: versionError?.message || "Could not create document version" }, { status: 400 });
  }

  const { error: jobError } = await supabase
    .from("ingestion_jobs")
    .insert({ organization_id: bot.organization_id, document_version_id: version.id, job_type: "document_ingest", status: "queued" });
  if (jobError) {
    await supabase.from("documents").delete().eq("id", document.id);
    await cleanupFile();
    return NextResponse.json({ error: jobError.message }, { status: 400 });
  }
  return NextResponse.json({ id: document.id }, { status: 201 });
}
