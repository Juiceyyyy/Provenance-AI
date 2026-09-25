"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BOT_PRESETS, PRESET_LIST, type BotPresetKey } from "@/lib/bots/presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function CreateBotForm({ initialPreset = "general", initialCountry = "", initialRegion = "" }: { initialPreset?: BotPresetKey; initialCountry?: string; initialRegion?: string }) {
  const router = useRouter();
  const [preset, setPreset] = useState<BotPresetKey>(initialPreset);
  const info = useMemo(() => BOT_PRESETS[preset], [preset]);
  const [name, setName] = useState(BOT_PRESETS[initialPreset].name);
  const [description, setDescription] = useState(BOT_PRESETS[initialPreset].description);
  const [instructions, setInstructions] = useState("");
  const [country, setCountry] = useState(initialCountry);
  const [region, setRegion] = useState(initialRegion);
  const [webEnabled, setWebEnabled] = useState(BOT_PRESETS[initialPreset].webDefault);
  const [loading, setLoading] = useState(false);

  function choose(value: BotPresetKey) {
    setPreset(value);
    const selected = BOT_PRESETS[value];
    setName(selected.name);
    setDescription(selected.description);
    setWebEnabled(selected.webDefault);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (info.requiresJurisdiction && !country.trim()) {
      toast.error("Choose a jurisdiction country for this assistant.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description, instructions, botType: preset, country: country || null, region: region || null, webEnabled }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(body.error || "Could not create assistant");
      setLoading(false);
      return;
    }
    router.push(`/app/bots/${body.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(260px,.72fr)_minmax(0,1.28fr)]">
      <div>
        <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[.14em] text-[#738095]">Assistant type</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {PRESET_LIST.map((item) => (
            <button
              type="button"
              onClick={() => choose(item.key)}
              key={item.key}
              className={`rounded-2xl border p-4 text-left transition ${preset === item.key ? "border-[#496b9f] bg-[#121a27] shadow-sm shadow-black/20" : "border-white/[.07] bg-[#0d1118] hover:border-[#314967] hover:bg-[#10151e]"}`}
            >
              <div className="text-sm font-medium text-[#e7edf5]">{item.name}</div>
              <div className="mt-1.5 text-xs leading-5 text-[#8490a1]">{item.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="h-fit rounded-2xl border border-white/[.075] bg-[#0d1118] p-4 sm:p-6">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-[.14em] text-[#738095]">Configuration</div>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#edf2f8]">{info.name}</h2>
          <p className="mt-2 text-xs leading-5 text-[#8490a1]">{info.welcomeBody}</p>
        </div>

        <div className="grid gap-5">
          <div>
            <label className="mb-1.5 block text-xs text-[#8d98a8]">Assistant name</label>
            <Input value={name} maxLength={80} required onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#8d98a8]">Description</label>
            <Textarea value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#8d98a8]">Custom instructions</label>
            <Textarea value={instructions} maxLength={8000} placeholder="Optional behavior, terminology, format, scope or priorities…" onChange={(event) => setInstructions(event.target.value)} />
            <p className="mt-1.5 text-[11px] leading-5 text-[#707c8e]">Instructions shape responses but never override workspace security or source permissions.</p>
          </div>
          {info.requiresJurisdiction ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-xs text-[#8d98a8]">Country / jurisdiction</label><Input value={country} required placeholder="e.g. India" onChange={(event) => setCountry(event.target.value)} /></div>
              <div><label className="mb-1.5 block text-xs text-[#8d98a8]">State / region</label><Input value={region} placeholder="e.g. Maharashtra" onChange={(event) => setRegion(event.target.value)} /></div>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <div><div className="text-sm font-medium text-[#e1e7ef]">Allow web search</div><div className="mt-1 text-xs leading-5 text-[#7e899a]">Lets the user enable live web search per conversation.</div></div>
            <Switch checked={webEnabled} onCheckedChange={setWebEnabled} />
          </div>
          <Button size="lg" disabled={loading} className="w-full sm:w-auto sm:justify-self-start">{loading ? "Creating…" : "Create assistant"}</Button>
        </div>
      </div>
    </form>
  );
}
