export type RetrievedChunk = {
  chunk_id: string;
  content: string;
  document_id: string;
  document_title: string;
  page_start: number | null;
  page_end: number | null;
  heading_path: string[] | null;
  source_url: string | null;
  publisher: string | null;
  authority_level: number | null;
  effective_from: string | null;
  effective_until: string | null;
  score: number;
};
