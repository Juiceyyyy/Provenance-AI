import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/security/request";

const patchSchema = z.object({ text: z.string().trim().min(1).max(16_000) });

export async function PATCH(req: Request, { params }: { params: Promise<{ messageId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { messageId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message edit" }, { status: 400 });

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .select("id,role,conversation_id,position")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (message.role !== "user") return NextResponse.json({ error: "Only your messages can be edited" }, { status: 403 });

  const parts = [{ type: "text", text: parsed.data.text }];
  const { error: updateError } = await supabase
    .from("messages")
    .update({ parts })
    .eq("id", message.id)
    .eq("conversation_id", message.conversation_id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const conversationUpdate: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
  if (message.position === 0) conversationUpdate.title = parsed.data.text.slice(0, 80) || "Conversation";
  const { error: conversationError } = await supabase
    .from("conversations")
    .update(conversationUpdate)
    .eq("id", message.conversation_id)
    .eq("owner_user_id", userId);
  if (conversationError) return NextResponse.json({ error: conversationError.message }, { status: 400 });

  return NextResponse.json({ ok: true, parts });
}
