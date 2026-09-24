import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzePortfolio, analyticsToPrompt, type PortfolioPosition } from "./analytics";

export async function getPortfolioContext(supabase: SupabaseClient, userId: string) {
  const { data: portfolio } = await supabase
    .from("portfolios")
    .select("id,name")
    .eq("owner_user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!portfolio) return undefined;

  const { data: rows } = await supabase
    .from("portfolio_positions")
    .select("symbol,name,current_value,sector,industry,asset_class,region,currency,account_name")
    .eq("portfolio_id", portfolio.id);
  if (!rows?.length) return undefined;

  const positions: PortfolioPosition[] = rows.map((r) => ({
    symbol: r.symbol ?? undefined,
    name: r.name,
    value: Number(r.current_value),
    sector: r.sector ?? undefined,
    industry: r.industry ?? undefined,
    assetClass: r.asset_class ?? undefined,
    region: r.region ?? undefined,
    currency: r.currency ?? undefined,
    account: r.account_name ?? undefined,
  }));
  return `Portfolio: ${portfolio.name}\n${analyticsToPrompt(analyzePortfolio(positions))}`;
}
