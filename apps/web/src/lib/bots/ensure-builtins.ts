import type { SupabaseClient } from "@supabase/supabase-js";
import { BOT_PRESETS, type BotPresetKey } from "@/lib/bots/presets";

const LOCATION_AWARE_TYPES = new Set<BotPresetKey>(["legal", "accounting", "health"]);

type PublicPack = {
  id: string;
  slug: string | null;
  domains: string[] | null;
  jurisdiction_country: string | null;
  jurisdiction_region: string | null;
  coverage_status: string;
};

type AssignableBot = {
  id: string;
  bot_type: string;
  jurisdiction_country: string | null;
  jurisdiction_region: string | null;
  follow_profile_jurisdiction?: boolean | null;
};

export type RequestJurisdiction = {
  country?: string | null;
  region?: string | null;
};

function normalized(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() || null;
}

async function loadActivePublicPacks(supabase: SupabaseClient): Promise<PublicPack[]> {
  const { data } = await supabase
    .from("knowledge_bases")
    .select("id,slug,domains,jurisdiction_country,jurisdiction_region,coverage_status")
    .eq("visibility", "public")
    .in("coverage_status", ["active", "partial"]);
  return (data ?? []) as PublicPack[];
}

export async function syncAssistantKnowledgePacks({
  supabase,
  bot,
  publicPacks,
}: {
  supabase: SupabaseClient;
  bot: AssignableBot;
  publicPacks?: PublicPack[];
}) {
  const type = bot.bot_type as BotPresetKey;
  const preset = BOT_PRESETS[type];
  if (!preset || type === "custom") return;

  const packs = publicPacks ?? await loadActivePublicPacks(supabase);
  const requestedCountry = normalized(bot.jurisdiction_country);
  const requestedRegion = normalized(bot.jurisdiction_region);
  const explicitSlugs = new Set(preset.packSlugs);
  const links = new Map<string, number>();
  const desiredJurisdictionIds = new Set<string>();

  for (const pack of packs) {
    const explicit = Boolean(pack.slug && explicitSlugs.has(pack.slug));
    const domainMatch = (pack.domains ?? []).includes(type);
    if (!explicit && !domainMatch) continue;

    if (!pack.jurisdiction_country) {
      links.set(pack.id, Math.max(links.get(pack.id) ?? 0, 60));
      continue;
    }
    if (!LOCATION_AWARE_TYPES.has(type) || !requestedCountry) continue;
    if (normalized(pack.jurisdiction_country) !== requestedCountry) continue;
    if (pack.jurisdiction_region && normalized(pack.jurisdiction_region) !== requestedRegion) continue;

    desiredJurisdictionIds.add(pack.id);
    links.set(pack.id, Math.max(links.get(pack.id) ?? 0, pack.jurisdiction_region ? 90 : 80));
  }

  if (LOCATION_AWARE_TYPES.has(type)) {
    const { data: currentJurisdictionLinks } = await supabase
      .from("bot_knowledge_bases")
      .select("knowledge_base_id,knowledge_bases!inner(kind,visibility)")
      .eq("bot_id", bot.id)
      .eq("knowledge_bases.kind", "jurisdiction")
      .eq("knowledge_bases.visibility", "public");
    const stale = (currentJurisdictionLinks ?? [])
      .map((row) => String(row.knowledge_base_id))
      .filter((id) => !desiredJurisdictionIds.has(id));
    if (stale.length) {
      await supabase.from("bot_knowledge_bases").delete().eq("bot_id", bot.id).in("knowledge_base_id", stale);
    }
  }

  if (links.size) {
    await supabase.from("bot_knowledge_bases").upsert(
      [...links.entries()].map(([knowledgeBaseId, priority]) => ({ bot_id: bot.id, knowledge_base_id: knowledgeBaseId, priority })),
      { onConflict: "bot_id,knowledge_base_id" },
    );
  }
}

export async function ensureBuiltinAssistantKnowledge({
  supabase,
  userId,
  jurisdiction,
}: {
  supabase: SupabaseClient;
  userId: string;
  jurisdiction: RequestJurisdiction;
}) {
  const [{ data: bots }, publicPacks] = await Promise.all([
    supabase
      .from("bots")
      .select("id,bot_type,jurisdiction_country,jurisdiction_region,is_builtin,follow_profile_jurisdiction")
      .eq("owner_user_id", userId)
      .eq("is_builtin", true),
    loadActivePublicPacks(supabase),
  ]);

  if (!bots?.length) return;

  for (const rawBot of bots) {
    const type = rawBot.bot_type as BotPresetKey;
    if (!BOT_PRESETS[type] || type === "custom") continue;

    const bot: AssignableBot = {
      id: rawBot.id,
      bot_type: rawBot.bot_type,
      jurisdiction_country: rawBot.jurisdiction_country,
      jurisdiction_region: rawBot.jurisdiction_region,
      follow_profile_jurisdiction: rawBot.follow_profile_jurisdiction,
    };

    // Only an explicitly saved profile jurisdiction may drive automatic specialist location.
    // Coarse request/IP location is suggestion-only and is never passed into this function.
    if (LOCATION_AWARE_TYPES.has(type) && bot.follow_profile_jurisdiction) {
      const nextCountry = jurisdiction.country?.trim() || null;
      const nextRegion = jurisdiction.region?.trim() || null;
      if (normalized(bot.jurisdiction_country) !== normalized(nextCountry) || normalized(bot.jurisdiction_region) !== normalized(nextRegion)) {
        await supabase
          .from("bots")
          .update({ jurisdiction_country: nextCountry, jurisdiction_region: nextRegion })
          .eq("id", bot.id)
          .eq("owner_user_id", userId);
        bot.jurisdiction_country = nextCountry;
        bot.jurisdiction_region = nextRegion;
      }
    }

    await syncAssistantKnowledgePacks({ supabase, bot, publicPacks });
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
