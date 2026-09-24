import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { RetrievedChunk } from "./types";

const EMBEDDING_DIMENSIONS = 1536;

type GeminiEmbeddingResponse = {
  embedding?: { values?: number[] };
};

async function embedQuery(value: string): Promise<number[]> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Free-tier embeddings are not configured. Set GEMINI_API_KEY.");
  }

  const model = encodeURIComponent(env.GEMINI_EMBEDDING_MODEL);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      content: { parts: [{ text: value.slice(0, 12_000) }] },
      output_dimensionality: EMBEDDING_DIMENSIONS,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(`Gemini embedding request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  const body = (await response.json()) as GeminiEmbeddingResponse;
  const embedding = body.embedding?.values;
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Gemini returned an invalid embedding dimension: ${embedding?.length ?? 0}`);
  }
  return embedding;
}

export async function retrieveChunks(
  supabase: SupabaseClient,
  botId: string,
  query: string,
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];
  const embedding = await embedQuery(query);

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
