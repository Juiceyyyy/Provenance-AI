import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { RetrievedChunk } from "./types";

const EMBEDDING_DIMENSIONS = 1024;

type CloudflareEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
};

async function embedQuery(value: string): Promise<number[]> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    throw new Error("Free-tier embeddings are not configured. Set Cloudflare Workers AI credentials.");
  }
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1/embeddings`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ model: env.CLOUDFLARE_EMBEDDING_MODEL, input: value.slice(0, 24_000) }),
      cache: "no-store",
    },
  );
  const body = (await response.json().catch(() => null)) as CloudflareEmbeddingResponse | null;
  if (!response.ok) {
    const detail = body?.error?.message?.slice(0, 500);
    throw new Error(`Cloudflare embedding request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  const embedding = body?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Cloudflare returned an invalid embedding dimension: ${embedding?.length ?? 0}`);
  }
  return embedding;
}

export async function retrieveChunks(
  supabase: SupabaseClient,
  botId: string,
  query: string,
  conversationId?: string | null,
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];
  const embedding = await embedQuery(query);
  const { data, error } = await supabase.rpc("hybrid_search_chunks_scoped", {
    p_bot_id: botId,
    p_conversation_id: conversationId ?? null,
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
      const page = chunk.page_start
        ? `page ${chunk.page_start}${chunk.page_end && chunk.page_end !== chunk.page_start ? `-${chunk.page_end}` : ""}`
        : null;
      const heading = chunk.heading_path?.length ? chunk.heading_path.join(" > ") : null;
      const meta = [chunk.document_title, page, heading, chunk.publisher, chunk.effective_from ? `effective ${chunk.effective_from}` : null]
        .filter(Boolean)
        .join(" | ");
      return `[${sourceId}] ${meta}\nCitation URL: /app/sources/${chunk.chunk_id}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
}
