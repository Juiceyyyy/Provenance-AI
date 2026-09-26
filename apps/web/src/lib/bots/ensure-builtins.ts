import type { SupabaseClient } from "@supabase/supabase-js";
import { BOT_PRESETS, type BotPresetKey } from "@/lib/bots/presets";

const LOCATION_AWARE_TYPES = new Set<BotPresetKey>(["legal", "accounting", "health"]);

export type RequestJurisdiction = {
  country?: string | null;
  region?: string | null;
};

export async function ensureBuiltinAssistantKnowledge({
  supabase,
  userId,
  jurisdiction,
}: {
  supabase: SupabaseClient;
  userId: string;
  jurisdiction: RequestJurisdiction;
}) {
  const [{ data: bots }, { data: publicPacks }] = await Promise.all([
    supabase
      .from("bots")
      .select("id,bot_type,jurisdiction_country,jurisdiction_region,is_builtin")
      .eq("owner_user_id", userId)
      .eq("is_builtin", true),
    supabase
      .from("knowledge_bases")
      .select("id,slug,domains,jurisdiction_country,jurisdiction_region,coverage_status")
      .eq("visibility", "public")
      .neq("coverage_status", "planned"),
  ]);

  if (!bots?.length) return;

  for (const bot of bots) {
    const type = bot.bot_type as BotPresetKey;
    const preset = BOT_PRESETS[type];
    if (!preset || type === "custom") continue;

    let country = bot.jurisdiction_country as string | null;
    let region = bot.jurisdiction_region as string | null;

    // Initialize location once. Explicit assistant-level edits remain authoritative afterwards.
    if (LOCATION_AWARE_TYPES.has(type) && !country && jurisdiction.country) {
      country = jurisdiction.country;
      region = jurisdiction.region || null;
      await supabase
        .from("bots")
        .update({ jurisdiction_country: country, jurisdiction_region: region })
        .eq("id", bot.id)
        .eq("owner_user_id", userId);
    }

    const requestedCountry = country?.toLocaleLowerCase();
    const requestedRegion = region?.toLocaleLowerCase();
    const explicitSlugs = new Set(preset.packSlugs);
    const links = new Map<string, number>();

    for (const pack of publicPacks ?? []) {
      const packDomains = (pack.domains ?? []) as string[];
      const explicit = Boolean(pack.slug && explicitSlugs.has(pack.slug));
      const domainMatch = packDomains.includes(type);
      if (!explicit && !domainMatch) continue;

      if (!pack.jurisdiction_country) {
        links.set(pack.id, Math.max(links.get(pack.id) ?? 0, 60));
        continue;
      }
      if (!LOCATION_AWARE_TYPES.has(type) || !requestedCountry) continue;
      if (String(pack.jurisdiction_country).toLocaleLowerCase() !== requestedCountry) continue;
      if (pack.jurisdiction_region && (!requestedRegion || String(pack.jurisdiction_region).toLocaleLowerCase() !== requestedRegion)) continue;
      links.set(pack.id, Math.max(links.get(pack.id) ?? 0, pack.jurisdiction_region ? 90 : 80));
    }

    if (links.size) {
      await supabase.from("bot_knowledge_bases").upsert(
        [...links.entries()].map(([knowledgeBaseId, priority]) => ({ bot_id: bot.id, knowledge_base_id: knowledgeBaseId, priority })),
        { onConflict: "bot_id,knowledge_base_id" },
      );
    }
  }
}

export function countryNameFromCode(code: string | null) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}
