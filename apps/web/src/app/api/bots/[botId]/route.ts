import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/security/request";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  instructions: z.string().max(8000).optional(),
  country: z.string().trim().max(80).nullable().optional(),
  region: z.string().trim().max(100).nullable().optional(),
  webEnabled: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ botId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { botId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const { data: existing } = await supabase
    .from("bots")
    .select("id,bot_type,jurisdiction_country,jurisdiction_region")
    .eq("id", botId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Assistant not found" }, { status: 404 });

  const data = parsed.data;
  const nextCountry = data.country !== undefined ? data.country : existing.jurisdiction_country;
  const nextRegion = data.region !== undefined ? data.region : existing.jurisdiction_region;
  if ((existing.bot_type === "legal" || existing.bot_type === "accounting") && !nextCountry) {
    return NextResponse.json({ error: "Jurisdiction country is required for this assistant" }, { status: 400 });
  }

  const { error } = await supabase.from("bots").update({
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.instructions !== undefined && { instructions: data.instructions }),
    ...(data.country !== undefined && { jurisdiction_country: data.country }),
    ...(data.region !== undefined && { jurisdiction_region: data.region }),
    ...(data.webEnabled !== undefined && { web_enabled: data.webEnabled }),
  }).eq("id", botId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const jurisdictionChanged = data.country !== undefined || data.region !== undefined;
  if (jurisdictionChanged && (existing.bot_type === "legal" || existing.bot_type === "accounting")) {
    const { data: linkedJurisdictionPacks } = await supabase
      .from("bot_knowledge_bases")
      .select("knowledge_base_id,knowledge_bases!inner(kind,visibility)")
      .eq("bot_id", botId)
      .eq("knowledge_bases.kind", "jurisdiction")
      .eq("knowledge_bases.visibility", "public");
    const oldIds = (linkedJurisdictionPacks ?? []).map((row) => row.knowledge_base_id);
    if (oldIds.length) await supabase.from("bot_knowledge_bases").delete().eq("bot_id", botId).in("knowledge_base_id", oldIds);

    let query = supabase
      .from("knowledge_bases")
      .select("id,jurisdiction_region")
      .eq("visibility", "public")
      .eq("kind", "jurisdiction")
      .eq("jurisdiction_country", nextCountry!)
      .like("slug", `${existing.bot_type}-%`);
    const { data: packs } = await query;
    const applicable = (packs ?? []).filter((pack) => !pack.jurisdiction_region || !nextRegion || pack.jurisdiction_region === nextRegion);
    if (applicable.length) {
      await supabase.from("bot_knowledge_bases").upsert(
        applicable.map((pack) => ({ bot_id: botId, knowledge_base_id: pack.id, priority: pack.jurisdiction_region ? 90 : 80 })),
        { onConflict: "bot_id,knowledge_base_id" },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ botId: string }> }) {
  if (!isTrustedMutation(req)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const { botId } = await params;
  const { supabase, userId } = await requireApiUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: ownedBot } = await supabase.from("bots").select("id,owner_user_id").eq("id", botId).maybeSingle();
  if (!ownedBot) return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
  if (ownedBot.owner_user_id !== userId) return NextResponse.json({ error: "Only the assistant owner can delete it" }, { status: 403 });

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

  const { error: botError } = await supabase.from("bots").delete().eq("id", botId);
  if (botError) return NextResponse.json({ error: botError.message }, { status: 400 });
  if (kbIds.length) {
    const { error: kbError } = await supabase.from("knowledge_bases").delete().in("id", kbIds);
    if (kbError) return NextResponse.json({ error: kbError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
