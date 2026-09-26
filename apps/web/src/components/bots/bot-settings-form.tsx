"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BOT_PRESETS, isPresetKey } from "@/lib/bots/presets";
import { COUNTRIES } from "@/lib/geo/countries";

export type EditableBot = {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  bot_type: string;
  jurisdiction_country: string | null;
  jurisdiction_region: string | null;
  web_enabled: boolean;
  is_builtin: boolean;
  preset_version: string | null;
  follow_profile_jurisdiction?: boolean | null;
};

type PublicPackOption = {
  id: string;
  name: string;
  slug: string | null;
  domains: string[];
  coverageStatus: string;
  country: string | null;
  region: string | null;
};

export function BotSettingsForm({
  bot,
  publicPacks = [],
  linkedPackIds = [],
}: {
  bot: EditableBot;
  publicPacks?: PublicPackOption[];
  linkedPackIds?: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(bot.name);
  const [description, setDescription] = useState(bot.description || "");
  const [instructions, setInstructions] = useState(bot.instructions || "");
  const [country, setCountry] = useState(bot.jurisdiction_country || "");
  const [region, setRegion] = useState(bot.jurisdiction_region || "");
  const [webEnabled, setWebEnabled] = useState(bot.web_enabled);
  const [followGlobal, setFollowGlobal] = useState(Boolean(bot.follow_profile_jurisdiction));
  const [selectedPackIds, setSelectedPackIds] = useState(() => new Set(linkedPackIds));
  const [packQuery, setPackQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const requiresJurisdiction = bot.bot_type === "legal" || bot.bot_type === "accounting";
  const locationAware = requiresJurisdiction || bot.bot_type === "health";
  const isCustom = bot.bot_type === "custom";
  const canFollowGlobal = bot.is_builtin && locationAware;

  const filteredPacks = useMemo(() => {
    const needle = packQuery.trim().toLocaleLowerCase();
    if (!needle) return publicPacks;
    return publicPacks.filter((pack) =>
      [pack.name, pack.slug || "", pack.country || "", pack.region || "", ...pack.domains]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle),
    );
  }, [packQuery, publicPacks]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          instructions,
          country: locationAware && !followGlobal ? country || null : undefined,
          region: locationAware && !followGlobal ? region || null : undefined,
          webEnabled,
          followGlobalJurisdiction: canFollowGlobal ? followGlobal : undefined,
          packIds: isCustom ? [...selectedPackIds] : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not save assistant");
      toast.success("Assistant settings saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save assistant");
    } finally {
      setSaving(false);
    }
  }

  function restorePreset() {
    if (!bot.is_builtin || !isPresetKey(bot.bot_type)) return;
    const preset = BOT_PRESETS[bot.bot_type];
    setName(preset.name);
    setDescription(preset.description);
    setInstructions("");
    setWebEnabled(preset.webDefault);
    toast.message("Preset restored in the form. Jurisdiction preferences are preserved until you change them.");
  }

  function togglePack(id: string) {
    setSelectedPackIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function remove() {
    if (!window.confirm(`Delete ${bot.name}? This also deletes its private uploaded knowledge and conversation history.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not delete assistant");
      toast.success("Assistant deleted");
      router.push("/app/bots");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete assistant");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      {bot.is_builtin ? (
        <section className="rounded-2xl border border-[#28456c] bg-[#0d1624] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#3b5f91] bg-[#14233a] px-2 py-1 text-[10px] font-medium uppercase tracking-[.12em] text-[#a9c8fb]">Built-in preset</span>
            {bot.preset_version ? <span className="text-[11px] text-[#738095]">Preset {bot.preset_version}</span> : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8e9aab]">Provenance provides the core role and safety behavior by default. Your edits layer on top without removing the built-in specialist safeguards.</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={restorePreset}>Restore preset defaults</Button>
        </section>
      ) : null}

      <section className="space-y-5 rounded-2xl border border-white/[.075] bg-[#0d1118] p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-[#8d98a8]">Name<Input className="mt-2" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="text-xs text-[#8d98a8]">Type<Input className="mt-2" value={bot.bot_type} disabled /></label>
        </div>
        <label className="block text-xs text-[#8d98a8]">Description<Textarea className="mt-2" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="block text-xs text-[#8d98a8]">
          {bot.is_builtin ? "Your additional instructions" : "Custom instructions"}
          <Textarea className="mt-2 min-h-36" maxLength={8000} value={instructions} onChange={(event) => setInstructions(event.target.value)} />
          <span className="mt-1.5 block text-[11px] leading-5 text-[#707c8e]">These preferences cannot override tenant isolation, source access, platform safety or professional-domain safeguards.</span>
        </label>

        {canFollowGlobal ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <div><div className="text-sm font-medium text-[#e1e7ef]">Follow global jurisdiction</div><div className="mt-1 text-xs text-[#7e899a]">Keep this built-in assistant synced to the country and region saved in global Settings.</div></div>
            <Switch checked={followGlobal} onCheckedChange={setFollowGlobal} />
          </div>
        ) : null}

        {locationAware ? (
          <div className={`grid gap-4 sm:grid-cols-2 ${followGlobal ? "opacity-50" : ""}`}>
            <label className="text-xs text-[#8d98a8]">
              {requiresJurisdiction ? "Country / jurisdiction" : "Local guidance country"}
              <select
                className="mt-2 h-10 w-full rounded-lg border border-white/[.09] bg-[#10151d] px-3 text-sm text-[#e1e7ef] outline-none transition focus:border-[#42679f] disabled:cursor-not-allowed"
                required={requiresJurisdiction && !followGlobal}
                value={country}
                disabled={followGlobal}
                onChange={(event) => setCountry(event.target.value)}
              >
                <option value="">{requiresJurisdiction ? "Select country" : "No local guidance country"}</option>
                {COUNTRIES.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-[#8d98a8]">State / region<Input className="mt-2" value={region} disabled={followGlobal} onChange={(event) => setRegion(event.target.value)} placeholder="Optional" /></label>
          </div>
        ) : null}

        {isCustom ? (
          <div className="space-y-3 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <div>
              <div className="text-sm font-medium text-[#e1e7ef]">Shared knowledge packs</div>
              <div className="mt-1 text-xs leading-5 text-[#7e899a]">Choose any indexed public packs this Custom assistant may retrieve. Shared files and embeddings are referenced, not duplicated into your workspace.</div>
            </div>
            <Input value={packQuery} onChange={(event) => setPackQuery(event.target.value)} placeholder="Search country, domain or pack" />
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {filteredPacks.length ? filteredPacks.map((pack) => (
                <label key={pack.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[.06] px-3 py-2.5 hover:bg-white/[.025]">
                  <input type="checkbox" checked={selectedPackIds.has(pack.id)} onChange={() => togglePack(pack.id)} className="mt-0.5 size-4 accent-[#7aa8e8]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-[#d8e0ea]">{pack.name}</span>
                    <span className="mt-0.5 block text-[10px] text-[#768397]">{pack.country || "International / global"}{pack.region ? ` · ${pack.region}` : ""} · {pack.domains.join(", ") || "general"} · {pack.coverageStatus}</span>
                  </span>
                </label>
              )) : <p className="py-3 text-xs text-[#737f90]">No matching indexed packs.</p>}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[.07] bg-white/[.02] p-4"><div><div className="text-sm font-medium text-[#e1e7ef]">Allow live web search</div><div className="mt-1 text-xs text-[#7e899a]">You still choose whether to enable it on each conversation.</div></div><Switch checked={webEnabled} onCheckedChange={setWebEnabled} /></div>
        <Button disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </section>

      {!bot.is_builtin ? (
        <section className="rounded-2xl border border-red-950/60 bg-[#120d10] p-5">
          <h2 className="text-sm font-medium text-[#efe7e9]">Delete assistant</h2>
          <p className="mt-2 text-xs leading-5 text-[#8f8085]">Deletes conversation history and this assistant&apos;s private knowledge base. Shared curated packs are unaffected.</p>
          <Button type="button" variant="danger" className="mt-4" onClick={remove} disabled={deleting}>{deleting ? "Deleting…" : "Delete assistant"}</Button>
        </section>
      ) : null}
    </form>
  );
}
