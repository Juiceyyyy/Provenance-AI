import { consumeStream, convertToModelMessages, createIdGenerator, safeValidateUIMessages, streamText, type UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { languageModel } from "@/lib/ai/models";
import { buildSystemPrompt, type BotRecord } from "@/lib/bots/system-prompt";
import { retrieveChunks, chunksToContext } from "@/lib/rag/retrieve";
import { assertUsageAvailable } from "@/lib/security/usage";
import { isTrustedMutation } from "@/lib/security/request";
import { getPortfolioContext } from "@/lib/portfolio/server";

export const maxDuration = 60;
const bodySchema = z.object({ messages: z.array(z.unknown()).min(1).max(100), botId: z.string().uuid(), conversationId: z.string().uuid(), webSearch: z.boolean().default(false) });
const webSearchTool = openai.tools.webSearch({ searchContextSize: "medium" });
const validationTools = { web_search: webSearchTool };

function latestUserText(messages: UIMessage[]) {
  const message = [...messages].reverse().find((item) => item.role === "user");
  if (!message) return "";
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .slice(0, 16_000);
}

export async function POST(req: Request) {
  try {
    if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
    const { supabase, userId } = await requireApiUser();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (declaredLength > 1_500_000) return NextResponse.json({ error: "Chat request too large" }, { status: 413 });
    const raw = await req.json();
    if (JSON.stringify(raw).length > 1_500_000) return NextResponse.json({ error: "Chat request too large" }, { status: 413 });
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Invalid chat request" }, { status: 400 });

    const validated = await safeValidateUIMessages({ messages: parsed.data.messages, tools: validationTools });
    if (!validated.success) return NextResponse.json({ error: "Invalid chat message structure" }, { status: 400 });
    const messages = validated.data;

    await assertUsageAvailable(supabase, userId);
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("id,name,bot_type,description,instructions,jurisdiction_country,jurisdiction_region,citations_required,web_enabled,organization_id")
      .eq("id", parsed.data.botId)
      .maybeSingle();
    if (botError || !bot) return NextResponse.json({ error: "Assistant not found" }, { status: 404 });

    const { data: conversation } = await supabase
      .from("conversations")
      .select("id,bot_id")
      .eq("id", parsed.data.conversationId)
      .eq("bot_id", bot.id)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    if (parsed.data.webSearch && !bot.web_enabled) return NextResponse.json({ error: "Web search is disabled for this assistant" }, { status: 403 });

    const query = latestUserText(messages);
    const chunks = query ? await retrieveChunks(supabase, bot.id, query) : [];
    const ragContext = chunksToContext(chunks);
    const portfolioContext = bot.bot_type === "portfolio" ? await getPortfolioContext(supabase, userId) : undefined;
    const system = buildSystemPrompt(bot as BotRecord, ragContext, portfolioContext);
    const tools = parsed.data.webSearch ? validationTools : undefined;
    const modelHistory = messages.slice(-40);

    const result = streamText({
      model: languageModel(),
      system,
      messages: await convertToModelMessages(modelHistory),
      tools,
      maxRetries: 2,
      abortSignal: req.signal,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 18 }),
      consumeSseStream: consumeStream,
      onFinish: async ({ messages: complete, isAborted }) => {
        await supabase.rpc("save_conversation_messages", { p_conversation_id: conversation.id, p_messages: complete });
        let usage: Awaited<typeof result.usage> | undefined;
        try {
          usage = await result.usage;
        } catch {
          usage = undefined;
        }
        await supabase.from("usage_events").insert({
          user_id: userId,
          organization_id: bot.organization_id,
          kind: "chat",
          bot_id: bot.id,
          input_tokens: usage?.inputTokens ?? null,
          output_tokens: usage?.outputTokens ?? null,
          metadata: { rag_chunks: chunks.length, web_search: parsed.data.webSearch, aborted: isAborted },
        });
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString(), title: query.slice(0, 80) || "Conversation" })
          .eq("id", conversation.id);
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected chat error";
    const status = message.includes("limit") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
