import "server-only";
import { openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";

function hasGatewayAuth() {
  return Boolean(env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN);
}

export function languageModel() {
  if (hasGatewayAuth()) {
    if (!env.AI_MODEL) throw new Error("Set AI_MODEL when using Vercel AI Gateway.");
    return env.AI_MODEL;
  }
  if (!env.OPENAI_API_KEY) throw new Error("Set Vercel AI Gateway auth or OPENAI_API_KEY.");
  if (!env.OPENAI_MODEL) throw new Error("Set OPENAI_MODEL when using OPENAI_API_KEY directly.");
  return openai(env.OPENAI_MODEL);
}

export function embeddingModel() {
  if (hasGatewayAuth()) return env.EMBEDDING_MODEL;
  if (!env.OPENAI_API_KEY) throw new Error("Set Vercel AI Gateway auth or OPENAI_API_KEY.");
  return openai.embeddingModel(env.OPENAI_EMBEDDING_MODEL);
}
