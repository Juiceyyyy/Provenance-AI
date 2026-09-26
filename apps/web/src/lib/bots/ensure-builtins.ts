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
  const { data: bots } = await supabase
    .from("bots")
    .select("id,bot_type,jurisdiction_country,jurisdiction_region,is_builtin")
    .eq("owner_user_id", userId)
    .eq("is_builtin", true);

  if (!bots?.length) return;

  for (const bot of bots) {
    const type = bot.bot_type as BotPresetKey;
    const preset = BOT_PRESETS[type];
    if (!preset || type === "custom") continue;

    let country = bot.jurisdiction_country as string | null;
    let region = bot.jurisdiction_region as string | null;

    // Only initialize location once. User edits in assistant settings always win afterwards.
    if (LOCATION_AWARE_TYPES.has(type) && !country && jurisdiction.country) {
      country = jurisdiction.country;
      region = jurisdiction.region || null;
      await supabase
        .from("bots")
        .update({ jurisdiction_country: country, jurisdiction_region: region })
        .eq("id", bot.id)
        .eq("owner_user_id", userId);
    }

    const links: Array<{ bot_id: string; knowledge_base_id: string; priority: number }> = [];

    if (preset.packSlugs.length) {
      const { data: sharedPacks } = await supabase
        .from("knowledge_bases")
        .select("id,slug")
        .eq("visibility", "public")
        .in("slug", preset.packSlugs);
      for (const pack of sharedPacks ?? []) {
        links.push({ bot_id: bot.id, knowledge_base_id: pack.id, priority: 60 });
      }
    }

    if (LOCATION_AWARE_TYPES.has(type) && country) {
      const { data: localPacks } = await supabase
        .from("knowledge_bases")
        .select("id,jurisdiction_region")
        .eq("visibility", "public")
        .eq("kind", "jurisdiction")
        .ilike("jurisdiction_country", country)
        .like("slug", `${type}-%`);
      const requestedRegion = region?.toLocaleLowerCase();

      for (const pack of localPacks ?? []) {
        if (pack.jurisdiction_region && (!requestedRegion || pack.jurisdiction_region.toLocaleLowerCase() !== requestedRegion)) continue;
        links.push({
          bot_id: bot.id,
          knowledge_base_id: pack.id,
          priority: pack.jurisdiction_region ? 90 : 80,
        });
      }
    }

    if (links.length) {
      await supabase.from("bot_knowledge_bases").upsert(links, { onConflict: "bot_id,knowledge_base_id" });
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
