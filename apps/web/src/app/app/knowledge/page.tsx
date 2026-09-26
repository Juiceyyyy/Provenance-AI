import { DocumentUpload } from "@/components/knowledge/document-upload";
import { DocumentList, type DocumentRow } from "@/components/knowledge/document-list";
import { PageHeader, PageShell, Surface, SectionHeading } from "@/components/app/page-shell";
import { requireUser } from "@/lib/auth";

export default async function KnowledgePage() {
  const { supabase } = await requireUser();
  const [{ data: bots }, { data: docs }] = await Promise.all([
    supabase.from("bots").select("id,name").order("name"),
    supabase.from("documents").select("id,title,status,mime_type,byte_size,created_at,knowledge_bases(name),document_versions(version_number,status,error_message,processed_at)").order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <PageShell>
      <PageHeader eyebrow="Workspace knowledge" title="Knowledge" description="Add private files to an assistant, then track indexing and retrieval readiness from one place." />
      <div className="mt-7 space-y-4">
        <Surface className="p-5 sm:p-6">
          <SectionHeading title="Add documents" description="Choose the assistant scope first. Raw uploads are temporary after processing; indexed knowledge remains private to your workspace." />
          <div className="mt-5"><DocumentUpload bots={bots ?? []} /></div>
        </Surface>
        <Surface className="overflow-hidden p-4 sm:p-5"><DocumentList initialDocuments={(docs ?? []) as DocumentRow[]} /></Surface>
      </div>
    </PageShell>
  );
}
