import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell, Surface } from "@/components/app/page-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const { supabase, userId, claims } = await requireUser();
  const [{ data: profile }, requestHeaders] = await Promise.all([
    supabase.from("profiles").select("display_name,default_country,default_region").eq("id", userId).maybeSingle(),
    headers(),
  ]);
  const ipCountry = requestHeaders.get("x-vercel-ip-country");
  const ipRegion = requestHeaders.get("x-vercel-ip-country-region");
  let countrySuggestion = ipCountry || "";
  try { if (ipCountry) countrySuggestion = new Intl.DisplayNames(["en"], { type: "region" }).of(ipCountry) || ipCountry; } catch {}

  async function save(formData: FormData) {
    "use server";
    const { supabase, userId } = await requireUser();
    await supabase.from("profiles").update({
      display_name: String(formData.get("displayName") || "").slice(0, 120) || null,
      default_country: String(formData.get("country") || "").slice(0, 80) || null,
      default_region: String(formData.get("region") || "").slice(0, 100) || null,
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    revalidatePath("/app/settings");
  }

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Set workspace defaults used when you create specialist assistants. Matter-specific jurisdiction can always be changed per assistant."
      />
      <form action={save} className="mt-6">
        <Surface className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-xs text-[#8d98a8]">Display name<Input name="displayName" className="mt-2" defaultValue={profile?.display_name || ""} /></label>
            <label className="block text-xs text-[#8d98a8]">Email<Input className="mt-2" value={String(claims.email || "")} disabled /></label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-xs text-[#8d98a8]">Default country / jurisdiction<Input name="country" className="mt-2" defaultValue={profile?.default_country || countrySuggestion} /></label>
            <label className="block text-xs text-[#8d98a8]">Default state / region<Input name="region" className="mt-2" defaultValue={profile?.default_region || ipRegion || ""} /></label>
          </div>
          {!profile?.default_country && ipCountry ? (
            <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-xs leading-5 text-[#8692a3]">
              Suggested from coarse request location: {countrySuggestion}{ipRegion ? ` / ${ipRegion}` : ""}. This is not treated as legal or tax residency until you save it.
            </div>
          ) : null}
          <div className="pt-1"><Button type="submit">Save settings</Button></div>
        </Surface>
      </form>
      <Surface className="mt-4 p-5">
        <h2 className="text-sm font-medium text-[#e2e8f1]">Privacy defaults</h2>
        <p className="mt-2 text-xs leading-5 text-[#8591a2]">Private uploads remain scoped to your workspace. Location is not stored unless you save it. Professional assistants should confirm matter-specific jurisdiction when it differs from your default.</p>
      </Surface>
    </PageShell>
  );
}
