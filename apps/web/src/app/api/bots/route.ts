import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/security/request";
import { BOT_PRESETS, isPresetKey } from "@/lib/bots/presets";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  instructions: z.string().max(8000).default(""),
  botType: z.string(),
  country: z.string().trim().max(80).nullable().optional(),
  region: z.string().trim().max(100).nullable().optional(),
  webEnabled: z.boolean().default(false),
});

export async function GET() {
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("bots").select("*").order("updated_at", { ascending: false });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid assistant configuration" }, { status: 400 });
  if (!isPresetKey(parsed.data.botType)) return NextResponse.json({ error: "Unknown assistant type" }, { status: 400 });
  if (parsed.data.botType !== "custom") {
    return NextResponse.json(
      { error: "Built-in assistants are provisioned automatically. Edit their settings instead of creating another copy." },
      { status: 409 },
    );
  }

  const preset = BOT_PRESETS.custom;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Workspace not initialized" }, { status: 409 });

  const { data: bot, error } = await supabase
    .from("bots")
    .insert({
      organization_id: membership.organization_id,
      owner_user_id: userId,
      name: parsed.data.name,
      description: parsed.data.description,
      bot_type: "custom",
      instructions: parsed.data.instructions,
      jurisdiction_country: null,
      jurisdiction_region: null,
      web_enabled: parsed.data.webEnabled,
      citations_required: preset.citationsRequired,
      is_builtin: false,
    })
    .select("id")
    .single();
  if (error || !bot) return NextResponse.json({ error: error?.message || "Insert failed" }, { status: 400 });

  let privateKbId: string | null = null;
  const rollback = async () => {
    if (privateKbId) await supabase.from("knowledge_bases").delete().eq("id", privateKbId);
    await supabase.from("bots").delete().eq("id", bot.id);
  };

  const { data: privateKb, error: kbError } = await supabase
    .from("knowledge_bases")
    .insert({
      organization_id: membership.organization_id,
      owner_user_id: userId,
      name: `${parsed.data.name} uploads`,
      kind: "private",
      visibility: "private",
    })
    .select("id")
    .single();
  if (kbError || !privateKb) {
    await rollback();
    return NextResponse.json({ error: kbError?.message || "Could not initialize private knowledge" }, { status: 400 });
  }
  privateKbId = privateKb.id;

  const { error: privateLinkError } = await supabase
    .from("bot_knowledge_bases")
    .insert({ bot_id: bot.id, knowledge_base_id: privateKb.id, priority: 100 });
  if (privateLinkError) {
    await rollback();
    return NextResponse.json({ error: `Could not attach private knowledge: ${privateLinkError.message}` }, { status: 400 });
  }

  return NextResponse.json({ id: bot.id }, { status: 201 });
}
