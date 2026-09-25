"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
};

export function BotSettingsForm({ bot }: { bot: EditableBot }) {
  const router = useRouter();
  const [name, setName] = useState(bot.name);
  const [description, setDescription] = useState(bot.description || "");
  const [instructions, setInstructions] = useState(bot.instructions || "");
  const [country, setCountry] = useState(bot.jurisdiction_country || "");
  const [region, setRegion] = useState(bot.jurisdiction_region || "");
  const [webEnabled, setWebEnabled] = useState(bot.web_enabled);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description, instructions, country: country || null, region: region || null, webEnabled }),
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

  const requiresJurisdiction = bot.bot_type === "legal" || bot.bot_type === "accounting";
  const locationAware = requiresJurisdiction || bot.bot_type === "health";

  return (
    <form onSubmit={save} className="space-y-4">
      {bot.is_builtin ? (
        <section className="rounded-2xl border border-[#28456c] bg-[#0d1624] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#3b5f91] bg-[#14233a] px-2 py-1 text-[10px] font-medium uppercase tracking-[.12em] text-[#a9c8fb]">Built-in preset</span>
            {bot.preset_version ? <span className="text-[11px] text-[#738095]">Preset {bot.preset_version}</span> : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8e9aab]">
            Provenance provides the core role and safety behavior by default. Your edits below layer on top, so you can rename the assistant, add instructions, change its location and control web access without losing the built-in specialist behavior.
          </p>
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
          <span className="mt-1.5 block text-[11px] leading-5 text-[#707c8e]">These preferences are added to the preset. They cannot override tenant isolation, tool permissions, source access or professional safety rules.</span>
        </label>
        {locationAware ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-[#8d98a8]">{requiresJurisdiction ? "Country / jurisdiction" : "Local guidance country"}<Input className="mt-2" required={requiresJurisdiction} value={country} onChange={(event) => setCountry(event.target.value)} placeholder={requiresJurisdiction ? "e.g. India" : "Optional"} /></label>
            <label className="text-xs text-[#8d98a8]">State / region<Input className="mt-2" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Optional" /></label>
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
