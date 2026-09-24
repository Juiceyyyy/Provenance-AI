import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export async function assertUsageAvailable(supabase: SupabaseClient, _userId: string) {
  const { error } = await supabase.rpc("reserve_chat_quota", { p_limit: env.DAILY_MESSAGE_LIMIT });
  if (error) throw new Error(error.message.includes("Daily message limit") ? "Daily message limit reached for this workspace." : error.message);
}
