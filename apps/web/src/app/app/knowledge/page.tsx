import { DocumentUpload } from "@/components/knowledge/document-upload";
import { DocumentList, type DocumentRow } from "@/components/knowledge/document-list";
import { PageHeader, PageShell, Surface } from "@/components/app/page-shell";
import { requireUser } from "@/lib/auth";

export default async function KnowledgePage() {
  const { supabase } = await requireUser();
  const [{ data: bots }, { data: docs }] = await Promise.all([
    supabase.from("bots").select("id,name").order("name"),
    supabase.from("documents").select("id,title,status,mime_type,byte_size,created_at,knowledge_bases(name),document_versions(version_number,status,error_message,processed_at)").order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Workspace knowledge"
        title="Knowledge"
        description="Upload private files and attach them to the assistants that should be able to retrieve from them. Files remain scoped to your workspace."
      />
      <div className="mt-6 space-y-5">
        <Surface className="p-4 sm:p-5">
          <DocumentUpload bots={bots ?? []} />
        </Surface>
        <Surface className="overflow-hidden p-3 sm:p-4">
          <DocumentList initialDocuments={(docs ?? []) as DocumentRow[]} />
        </Surface>
      </div>
    </PageShell>
  );
}
