import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { COUNTRIES, countryLabel } from "@/lib/geo/countries";
import { PageHeader, PageShell, Surface } from "@/components/app/page-shell";
import { GlobalDocumentUpload } from "@/components/knowledge/global-document-upload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function inferredDomain(slug: string, domains: string[] | null) {
  if (domains?.length) return domains.join(", ");
  return slug.split("-")[0]?.replaceAll("_", " ") || "general";
}

export default async function SettingsPage() {
  const { supabase, userId, claims } = await requireUser();
  const [{ data: profile }, requestHeaders] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,default_country,default_region,global_instructions,global_knowledge_base_id")
      .eq("id", userId)
      .maybeSingle(),
    headers(),
  ]);
  const ipCountry = requestHeaders.get("x-vercel-ip-country");
  const ipRegion = requestHeaders.get("x-vercel-ip-country-region");
  const suggestedCountry = countryLabel(ipCountry) || "";
  const selectedCountry = profile?.default_country || suggestedCountry;

  const [{ data: coverage }, { count: globalDocumentCount }] = await Promise.all([
    selectedCountry
      ? supabase
          .from("knowledge_bases")
          .select("id,name,slug,domains,coverage_status,jurisdiction_region")
          .eq("visibility", "public")
          .ilike("jurisdiction_country", selectedCountry)
          .order("name")
      : Promise.resolve({ data: [] }),
    profile?.global_knowledge_base_id
      ? supabase
          .from("knowledge_base_documents")
          .select("document_id", { count: "exact", head: true })
          .eq("knowledge_base_id", profile.global_knowledge_base_id)
      : Promise.resolve({ count: 0 }),
  ]);

  async function save(formData: FormData) {
    "use server";
    const { supabase, userId } = await requireUser();
    await supabase
      .from("profiles")
      .update({
        display_name: String(formData.get("displayName") || "").slice(0, 120) || null,
        default_country: String(formData.get("country") || "").slice(0, 80) || null,
        default_region: String(formData.get("region") || "").slice(0, 100) || null,
        global_instructions: String(formData.get("globalInstructions") || "").slice(0, 12_000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    revalidatePath("/app/settings");
  }

  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Choose your default jurisdiction and optional global context. Specialist assistants can still override jurisdiction individually."
      />

      <form action={save} className="mt-6 space-y-4">
        <Surface className="space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-medium text-[#e2e8f1]">Account & jurisdiction</h2>
            <p className="mt-1 text-xs leading-5 text-[#8591a2]">Your saved country controls which jurisdiction packs are offered by default. It is never inferred silently for legal or tax questions.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-xs text-[#8d98a8]">Display name<Input name="displayName" className="mt-2" defaultValue={profile?.display_name || ""} /></label>
            <label className="block text-xs text-[#8d98a8]">Email<Input className="mt-2" value={String(claims.email || "")} disabled /></label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-xs text-[#8d98a8]">
              Default country / jurisdiction
              <select name="country" defaultValue={selectedCountry} className="mt-2 h-10 w-full rounded-lg border border-white/[.09] bg-[#10151d] px-3 text-sm text-[#e1e7ef] outline-none transition focus:border-[#42679f]">
                <option value="">Select country</option>
                {COUNTRIES.map((country) => <option key={country.code} value={country.name}>{country.name}</option>)}
              </select>
            </label>
            <label className="block text-xs text-[#8d98a8]">Default state / region<Input name="region" className="mt-2" defaultValue={profile?.default_region || ipRegion || ""} placeholder="Optional" /></label>
          </div>
          {!profile?.default_country && suggestedCountry ? (
            <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-xs leading-5 text-[#8692a3]">
              Suggested from coarse request location: {suggestedCountry}{ipRegion ? ` / ${ipRegion}` : ""}. Nothing is stored until you save.
            </div>
          ) : null}

          <div className="rounded-xl border border-white/[.07] bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-[#dbe5f1]">Indexed pack coverage for {selectedCountry || "selected country"}</div>
                <div className="mt-1 text-[11px] text-[#788598]">Countries without an indexed pack remain selectable but are treated as not yet curated, never as silently supported.</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(coverage ?? []).length ? (coverage ?? []).map((pack) => (
                <span key={pack.id} className="rounded-full border border-white/[.08] bg-white/[.025] px-2.5 py-1 text-[11px] text-[#9dabbc]">
                  {inferredDomain(pack.slug || pack.name, pack.domains)} · {pack.coverage_status || "active"}{pack.jurisdiction_region ? ` · ${pack.jurisdiction_region}` : ""}
                </span>
              )) : <span className="text-xs text-[#7f8a9b]">No curated specialist packs indexed yet.</span>}
            </div>
          </div>
        </Surface>

        <Surface className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-medium text-[#e2e8f1]">Global instructions</h2>
            <p className="mt-1 text-xs leading-5 text-[#8591a2]">These preferences are inherited by every existing and future assistant.</p>
          </div>
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3 text-xs leading-5 text-[#b6ad91]">
            Global instructions can change how every Legal, Health, Accounting, Portfolio, Study, Document Analyst and Custom assistant responds. They cannot override platform safety, domain safeguards, source-grounding rules or jurisdiction requirements.
          </div>
          <textarea
            name="globalInstructions"
            defaultValue={profile?.global_instructions || ""}
            rows={7}
            maxLength={12_000}
            placeholder="Example: Prefer concise answers. Use INR by default. Show calculations and distinguish facts from assumptions."
            className="w-full resize-y rounded-xl border border-white/[.09] bg-[#10151d] px-3.5 py-3 text-sm leading-6 text-[#e1e7ef] outline-none placeholder:text-[#667184] focus:border-[#42679f]"
          />
          <div><Button type="submit">Save settings</Button></div>
        </Surface>
      </form>

      <Surface className="mt-4 space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-sm font-medium text-[#e2e8f1]">Global knowledge</h2>
          <p className="mt-1 text-xs leading-5 text-[#8591a2]">Documents uploaded here are indexed once and become retrievable by all of your assistants. They remain private to your workspace.</p>
          <p className="mt-1 text-[11px] text-[#6f7b8d]">{globalDocumentCount ?? 0} global document{globalDocumentCount === 1 ? "" : "s"} currently attached.</p>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.02] p-3 text-xs leading-5 text-[#8793a4]">
          Only place information here if you intentionally want it available across every assistant. For one assistant, use its Knowledge page. For one chat only, attach the file directly in that conversation.
        </div>
        <GlobalDocumentUpload />
      </Surface>

      <Surface className="mt-4 p-5">
        <h2 className="text-sm font-medium text-[#e2e8f1]">Privacy defaults</h2>
        <p className="mt-2 text-xs leading-5 text-[#8591a2]">Assistant uploads stay assistant-scoped, global uploads are inherited by your assistants, and chat attachments remain limited to the conversation where they were attached. Retrieved document text is treated as evidence, never as executable instruction.</p>
      </Surface>
    </PageShell>
  );
}
