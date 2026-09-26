import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/security/request";

const patchSchema = z.object({ title: z.string().trim().min(1).max(120) });

type AttachedDocument = {
  id: string;
  owner_user_id: string | null;
  metadata: Record<string, unknown> | null;
  document_versions: Array<{ storage_path: string | null }> | null;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { conversationId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation title" }, { status: 400 });
  const { error } = await supabase
    .from("conversations")
    .update({ title: parsed.data.title })
    .eq("id", conversationId)
    .eq("owner_user_id", userId);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { conversationId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const { data: attachmentRows, error: attachmentError } = await supabase
    .from("conversation_documents")
    .select("document_id,documents!inner(id,owner_user_id,metadata,document_versions(storage_path))")
    .eq("conversation_id", conversationId);
  if (attachmentError) return NextResponse.json({ error: attachmentError.message }, { status: 400 });

  const ownedConversationDocs = (attachmentRows ?? []).flatMap((row) => {
    const raw = Array.isArray(row.documents) ? row.documents[0] : row.documents;
    const document = raw as AttachedDocument | null;
    return document && document.owner_user_id === userId && document.metadata?.scope === "conversation" ? [document] : [];
  });
  const storagePaths = ownedConversationDocs.flatMap((document) =>
    (document.document_versions ?? []).map((version) => version.storage_path).filter((path): path is string => Boolean(path)),
  );

  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage.from("documents").remove(storagePaths);
    if (storageError) return NextResponse.json({ error: `Could not remove conversation files: ${storageError.message}` }, { status: 400 });
  }
  if (ownedConversationDocs.length) {
    const { error: documentError } = await supabase
      .from("documents")
      .delete()
      .in("id", ownedConversationDocs.map((document) => document.id));
    if (documentError) return NextResponse.json({ error: documentError.message }, { status: 400 });
  }

  const { error } = await supabase.from("conversations").delete().eq("id", conversationId).eq("owner_user_id", userId);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
