import "server-only";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { env } from "@/lib/env";

const workersAi = env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN
  ? createOpenAI({
      apiKey: env.CLOUDFLARE_API_TOKEN,
      baseURL: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
      name: "cloudflare-workers-ai",
    })
  : null;

function hasGatewayAuth() {
  return Boolean(env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN);
}

export function languageModel() {
  if (workersAi) return workersAi(env.CLOUDFLARE_AI_MODEL);

  if (!env.ALLOW_BILLABLE_AI) {
    throw new Error(
      "Free-tier AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN. Paid AI fallbacks are disabled by default.",
    );
  }

  if (hasGatewayAuth()) {
    if (!env.AI_MODEL) throw new Error("Set AI_MODEL when using Vercel AI Gateway.");
    return env.AI_MODEL;
  }

  if (!env.OPENAI_API_KEY) {
    throw new Error("Configure Cloudflare Workers AI, or explicitly enable and configure a paid AI provider.");
  }
  if (!env.OPENAI_MODEL) throw new Error("Set OPENAI_MODEL when using OPENAI_API_KEY directly.");
  return openai(env.OPENAI_MODEL);
}
