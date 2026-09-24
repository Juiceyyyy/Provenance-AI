import "server-only";
import { openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";

export function languageModel() {
  if (env.AI_GATEWAY_API_KEY) return env.AI_MODEL;
  if (!env.OPENAI_API_KEY) throw new Error("Set AI_GATEWAY_API_KEY or OPENAI_API_KEY.");
  return openai(env.OPENAI_MODEL);
}

export function embeddingModel() {
  if (env.AI_GATEWAY_API_KEY) return env.EMBEDDING_MODEL;
  if (!env.OPENAI_API_KEY) throw new Error("Set AI_GATEWAY_API_KEY or OPENAI_API_KEY.");
  return openai.embeddingModel(env.OPENAI_EMBEDDING_MODEL);
}
