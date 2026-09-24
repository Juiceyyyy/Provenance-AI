import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/security/request";

export async function DELETE(req: Request, { params }: { params: Promise<{ documentId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { documentId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: document } = await supabase
    .from("documents")
    .select("id,owner_user_id,document_versions(storage_path)")
    .eq("id", documentId)
    .maybeSingle();
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (document.owner_user_id !== userId) return NextResponse.json({ error: "Only the document owner can delete the stored file" }, { status: 403 });

  const paths = ((document.document_versions ?? []) as Array<{ storage_path: string | null }>)
    .map((version) => version.storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from("documents").remove(paths);
    if (storageError) return NextResponse.json({ error: `Could not remove stored file: ${storageError.message}` }, { status: 400 });
  }
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
