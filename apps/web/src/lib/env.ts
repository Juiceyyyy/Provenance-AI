import "server-only";
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),
  CLOUDFLARE_AI_MODEL: z.string().min(1).default("@cf/zai-org/glm-4.7-flash"),
  CLOUDFLARE_EMBEDDING_MODEL: z.string().min(1).default("@cf/baai/bge-m3"),
  ALLOW_BILLABLE_AI: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  AI_GATEWAY_API_KEY: z.string().optional(),
  VERCEL_OIDC_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(200),
  MAX_RAG_CHUNKS: z.coerce.number().int().min(1).max(30).default(10),
  EMBEDDING_TIMEOUT_MS: z.coerce.number().int().min(500).max(10_000).default(2500),
  CHAT_HISTORY_MESSAGES: z.coerce.number().int().min(8).max(40).default(20),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_AI_MODEL: process.env.CLOUDFLARE_AI_MODEL,
  CLOUDFLARE_EMBEDDING_MODEL: process.env.CLOUDFLARE_EMBEDDING_MODEL,
  ALLOW_BILLABLE_AI: process.env.ALLOW_BILLABLE_AI,
  AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
  VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_MODEL: process.env.AI_MODEL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  DAILY_MESSAGE_LIMIT: process.env.DAILY_MESSAGE_LIMIT,
  MAX_RAG_CHUNKS: process.env.MAX_RAG_CHUNKS,
  EMBEDDING_TIMEOUT_MS: process.env.EMBEDDING_TIMEOUT_MS,
  CHAT_HISTORY_MESSAGES: process.env.CHAT_HISTORY_MESSAGES,
});
