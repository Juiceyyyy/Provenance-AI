import "server-only";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";

const gemini = env.GEMINI_API_KEY
  ? createOpenAI({
      apiKey: env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      name: "gemini",
    })
  : null;

function hasGatewayAuth() {
  return Boolean(env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN);
}

export function languageModel() {
  if (gemini) return gemini(env.GEMINI_MODEL);

  if (!env.ALLOW_BILLABLE_AI) {
    throw new Error("Free-tier AI is not configured. Set GEMINI_API_KEY. Paid AI fallbacks are disabled by default.");
  }

  if (hasGatewayAuth()) {
    if (!env.AI_MODEL) throw new Error("Set AI_MODEL when using Vercel AI Gateway.");
    return env.AI_MODEL;
  }

  if (!env.OPENAI_API_KEY) throw new Error("Set GEMINI_API_KEY, or explicitly enable and configure a paid AI provider.");
  if (!env.OPENAI_MODEL) throw new Error("Set OPENAI_MODEL when using OPENAI_API_KEY directly.");
  return openai(env.OPENAI_MODEL);
}
