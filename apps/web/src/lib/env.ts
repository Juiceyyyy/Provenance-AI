import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  EMBEDDING_MODEL: z.string().default("openai/text-embedding-3-small"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(200),
  MAX_RAG_CHUNKS: z.coerce.number().int().min(1).max(30).default(10),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
  DAILY_MESSAGE_LIMIT: process.env.DAILY_MESSAGE_LIMIT,
  MAX_RAG_CHUNKS: process.env.MAX_RAG_CHUNKS,
});
