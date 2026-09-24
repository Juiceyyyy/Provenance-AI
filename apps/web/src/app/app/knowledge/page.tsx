import { DocumentUpload } from "@/components/knowledge/document-upload";
import { DocumentList, type DocumentRow } from "@/components/knowledge/document-list";
import { requireUser } from "@/lib/auth";

export default async function KnowledgePage() {
  const { supabase } = await requireUser();
  const [{ data: bots }, { data: docs }] = await Promise.all([
    supabase.from("bots").select("id,name").order("name"),
    supabase.from("documents").select("id,title,status,mime_type,byte_size,created_at,knowledge_bases(name),document_versions(version_number,status,error_message,processed_at)").order("created_at", { ascending: false }).limit(100),
  ]);
  return <div><div><h1 className="text-2xl font-semibold">Knowledge</h1><p className="mt-1 text-sm text-muted-foreground">Private files are parsed, chunked, embedded and retrieved only for authorized assistants.</p></div><div className="mt-7"><DocumentUpload bots={bots ?? []} /></div><div className="mt-7"><DocumentList initialDocuments={(docs ?? []) as DocumentRow[]} /></div></div>;
}
