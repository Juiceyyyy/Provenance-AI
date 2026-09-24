import "server-only";
import { embed } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embeddingModel } from "@/lib/ai/models";
import { env } from "@/lib/env";
import type { RetrievedChunk } from "./types";

export async function retrieveChunks(
  supabase: SupabaseClient,
  botId: string,
  query: string,
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];
  const { embedding } = await embed({
    model: embeddingModel(),
    value: query.slice(0, 12_000),
    maxRetries: 2,
  });

  const { data, error } = await supabase.rpc("hybrid_search_chunks", {
    p_bot_id: botId,
    p_query_text: query.slice(0, 8_000),
    p_query_embedding: embedding,
    p_match_count: env.MAX_RAG_CHUNKS,
  });
  if (error) throw new Error(`Retrieval failed: ${error.message}`);
  return (data ?? []) as RetrievedChunk[];
}

export function chunksToContext(chunks: RetrievedChunk[]) {
  return chunks
    .map((chunk, index) => {
      const sourceId = `S${index + 1}`;
      const page = chunk.page_start ? `page ${chunk.page_start}${chunk.page_end && chunk.page_end !== chunk.page_start ? `-${chunk.page_end}` : ""}` : null;
      const heading = chunk.heading_path?.length ? chunk.heading_path.join(" > ") : null;
      const meta = [chunk.document_title, page, heading, chunk.publisher, chunk.effective_from ? `effective ${chunk.effective_from}` : null]
        .filter(Boolean)
        .join(" | ");
      return `[${sourceId}] ${meta}\nCitation URL: /app/sources/${chunk.chunk_id}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}
