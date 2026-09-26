import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { syncAssistantKnowledgePacks } from "@/lib/bots/ensure-builtins";
import { isTrustedMutation } from "@/lib/security/request";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  instructions: z.string().max(8000).optional(),
  country: z.string().trim().max(80).nullable().optional(),
  region: z.string().trim().max(100).nullable().optional(),
  webEnabled: z.boolean().optional(),
  followGlobalJurisdiction: z.boolean().optional(),
  packIds: z.array(z.string().uuid()).max(100).optional(),
});

const LOCATION_AWARE_TYPES = new Set(["legal", "accounting", "health"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ botId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { botId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const { data: existing } = await supabase
    .from("bots")
    .select("id,owner_user_id,bot_type,jurisdiction_country,jurisdiction_region,is_builtin,follow_profile_jurisdiction")
    .eq("id", botId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Assistant not found" }, { status: 404 });

  const data = parsed.data;
  const locationAware = LOCATION_AWARE_TYPES.has(existing.bot_type);
  const canFollowGlobal = existing.is_builtin && locationAware;
  const followGlobal = canFollowGlobal
    ? (data.followGlobalJurisdiction ?? existing.follow_profile_jurisdiction)
    : false;

  let nextCountry = data.country !== undefined ? data.country : existing.jurisdiction_country;
  let nextRegion = data.region !== undefined ? data.region : existing.jurisdiction_region;
  if (followGlobal) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_country,default_region")
      .eq("id", userId)
      .maybeSingle();
    nextCountry = profile?.default_country || null;
    nextRegion = profile?.default_region || null;
  }

  if ((existing.bot_type === "legal" || existing.bot_type === "accounting") && !nextCountry) {
    return NextResponse.json(
      { error: followGlobal ? "Set a default country in global Settings first, or turn off ‘Follow global jurisdiction’." : "Jurisdiction country is required for this assistant" },
      { status: 400 },
    );
  }

  if (data.packIds !== undefined && existing.bot_type !== "custom") {
    return NextResponse.json({ error: "Manual shared-pack selection is available for Custom assistants." }, { status: 400 });
  }

  let validatedPackIds: string[] | undefined;
  if (data.packIds !== undefined) {
    validatedPackIds = [...new Set(data.packIds)];
    if (validatedPackIds.length) {
      const { data: allowedPacks, error: packsError } = await supabase
        .from("knowledge_bases")
        .select("id")
        .in("id", validatedPackIds)
        .eq("visibility", "public")
        .in("coverage_status", ["active", "partial"]);
      if (packsError) return NextResponse.json({ error: packsError.message }, { status: 400 });
      const allowedIds = new Set((allowedPacks ?? []).map((pack) => String(pack.id)));
      if (validatedPackIds.some((id) => !allowedIds.has(id))) {
        return NextResponse.json({ error: "One or more selected knowledge packs are unavailable." }, { status: 400 });
      }
    }
  }

  const { error } = await supabase
    .from("bots")
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.instructions !== undefined && { instructions: data.instructions }),
      ...(locationAware && { jurisdiction_country: nextCountry, jurisdiction_region: nextRegion }),
      ...(canFollowGlobal && { follow_profile_jurisdiction: followGlobal }),
      ...(data.webEnabled !== undefined && { web_enabled: data.webEnabled }),
    })
    .eq("id", botId)
    .eq("owner_user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (validatedPackIds !== undefined) {
    const { data: currentPublicLinks, error: linksError } = await supabase
      .from("bot_knowledge_bases")
      .select("knowledge_base_id,knowledge_bases!inner(visibility)")
      .eq("bot_id", botId)
      .eq("knowledge_bases.visibility", "public");
    if (linksError) return NextResponse.json({ error: linksError.message }, { status: 400 });
    const currentIds = (currentPublicLinks ?? []).map((link) => String(link.knowledge_base_id));
    if (currentIds.length) {
      const { error: deleteError } = await supabase
        .from("bot_knowledge_bases")
        .delete()
        .eq("bot_id", botId)
        .in("knowledge_base_id", currentIds);
      if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }
    if (validatedPackIds.length) {
      const { error: insertError } = await supabase.from("bot_knowledge_bases").insert(
        validatedPackIds.map((knowledgeBaseId) => ({ bot_id: botId, knowledge_base_id: knowledgeBaseId, priority: 70 })),
      );
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
  }

  if (locationAware) {
    await syncAssistantKnowledgePacks({
      supabase,
      bot: {
        id: existing.id,
        bot_type: existing.bot_type,
        jurisdiction_country: nextCountry,
        jurisdiction_region: nextRegion,
        follow_profile_jurisdiction: followGlobal,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ botId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { botId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: ownedBot } = await supabase
    .from("bots")
    .select("id,owner_user_id,is_builtin")
    .eq("id", botId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (!ownedBot) return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
  if (ownedBot.is_builtin) {
    return NextResponse.json(
      { error: "Built-in assistants stay available in every workspace. You can fully edit their settings instead." },
      { status: 409 },
    );
  }

  const { data: links } = await supabase
    .from("bot_knowledge_bases")
    .select("knowledge_base_id,knowledge_bases!inner(kind,owner_user_id)")
    .eq("bot_id", botId)
    .eq("knowledge_bases.kind", "private")
    .eq("knowledge_bases.owner_user_id", userId);
  const kbIds = (links ?? []).map((row) => row.knowledge_base_id);
  if (kbIds.length) {
    const { data: docs } = await supabase.from("documents").select("id").in("knowledge_base_id", kbIds);
    const docIds = (docs ?? []).map((document) => document.id);
    if (docIds.length) {
      const { data: versions } = await supabase.from("document_versions").select("storage_path").in("document_id", docIds);
      const paths = (versions ?? []).map((version) => version.storage_path).filter((path): path is string => Boolean(path));
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from("documents").remove(paths);
        if (storageError) return NextResponse.json({ error: `Could not remove stored assistant files: ${storageError.message}` }, { status: 400 });
      }
    }
  }

  const { error: botError } = await supabase.from("bots").delete().eq("id", botId).eq("owner_user_id", userId);
  if (botError) return NextResponse.json({ error: botError.message }, { status: 400 });
  if (kbIds.length) {
    const { error: kbError } = await supabase.from("knowledge_bases").delete().in("id", kbIds);
    if (kbError) return NextResponse.json({ error: kbError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
