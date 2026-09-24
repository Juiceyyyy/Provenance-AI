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

  const preset = BOT_PRESETS[parsed.data.botType];
  if (preset.requiresJurisdiction && !parsed.data.country) return NextResponse.json({ error: "Jurisdiction is required" }, { status: 400 });

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
      bot_type: parsed.data.botType,
      instructions: parsed.data.instructions,
      jurisdiction_country: parsed.data.country || null,
      jurisdiction_region: parsed.data.region || null,
      web_enabled: parsed.data.webEnabled,
      citations_required: preset.citationsRequired,
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
    .insert({ organization_id: membership.organization_id, owner_user_id: userId, name: `${parsed.data.name} uploads`, kind: "private", visibility: "private" })
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

  if (preset.packSlugs.length) {
    const { data: packs, error: packsError } = await supabase
      .from("knowledge_bases")
      .select("id")
      .in("slug", preset.packSlugs)
      .eq("visibility", "public");
    if (packsError) {
      await rollback();
      return NextResponse.json({ error: `Could not load preset knowledge: ${packsError.message}` }, { status: 400 });
    }
    if (packs?.length) {
      const { error: linkError } = await supabase
        .from("bot_knowledge_bases")
        .insert(packs.map((pack) => ({ bot_id: bot.id, knowledge_base_id: pack.id, priority: 50 })));
      if (linkError) {
        await rollback();
        return NextResponse.json({ error: `Could not attach preset knowledge: ${linkError.message}` }, { status: 400 });
      }
    }
  }

  if (parsed.data.country && (parsed.data.botType === "legal" || parsed.data.botType === "accounting")) {
    const { data: jurisdictionPacks, error: jurisdictionError } = await supabase
      .from("knowledge_bases")
      .select("id,slug,jurisdiction_region")
      .eq("visibility", "public")
      .eq("kind", "jurisdiction")
      .eq("jurisdiction_country", parsed.data.country)
      .like("slug", `${parsed.data.botType}-%`);
    if (jurisdictionError) {
      await rollback();
      return NextResponse.json({ error: `Could not load jurisdiction knowledge: ${jurisdictionError.message}` }, { status: 400 });
    }
    const applicable = (jurisdictionPacks ?? []).filter(
      (pack) => !pack.jurisdiction_region || !parsed.data.region || pack.jurisdiction_region === parsed.data.region,
    );
    if (applicable.length) {
      const { error: linkError } = await supabase.from("bot_knowledge_bases").upsert(
        applicable.map((pack) => ({ bot_id: bot.id, knowledge_base_id: pack.id, priority: pack.jurisdiction_region ? 90 : 80 })),
        { onConflict: "bot_id,knowledge_base_id" },
      );
      if (linkError) {
        await rollback();
        return NextResponse.json({ error: `Could not attach jurisdiction knowledge: ${linkError.message}` }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ id: bot.id }, { status: 201 });
}
