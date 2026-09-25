import { headers } from "next/headers";
import { CreateBotForm } from "@/components/bots/create-bot-form";
import { PageHeader, PageShell } from "@/components/app/page-shell";
import { isPresetKey } from "@/lib/bots/presets";
import { requireUser } from "@/lib/auth";

export default async function NewBotPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const { preset } = await searchParams;
  const initial = preset && isPresetKey(preset) ? preset : "general";
  const { supabase, userId } = await requireUser();
  const [{ data: profile }, requestHeaders] = await Promise.all([
    supabase.from("profiles").select("default_country,default_region").eq("id", userId).maybeSingle(),
    headers(),
  ]);
  const code = requestHeaders.get("x-vercel-ip-country");
  let detectedCountry = "";
  if (code) { try { detectedCountry = new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { detectedCountry = code; } }
  const detectedRegion = requestHeaders.get("x-vercel-ip-country-region") || "";

  return (
    <PageShell>
      <PageHeader
        eyebrow="New assistant"
        title="Choose what you want help with"
        description="Start from a specialist, then customize its knowledge, instructions and jurisdiction."
      />
      <div className="mt-6">
        <CreateBotForm initialPreset={initial} initialCountry={profile?.default_country || detectedCountry} initialRegion={profile?.default_region || detectedRegion} />
      </div>
    </PageShell>
  );
}
