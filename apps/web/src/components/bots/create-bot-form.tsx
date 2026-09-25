"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BOT_PRESETS } from "@/lib/bots/presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const CUSTOM = BOT_PRESETS.custom;

export function CreateBotForm() {
  const router = useRouter();
  const [name, setName] = useState(CUSTOM.name);
  const [description, setDescription] = useState(CUSTOM.description);
  const [instructions, setInstructions] = useState("");
  const [webEnabled, setWebEnabled] = useState(CUSTOM.webDefault);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const response = await fetch("/api/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        instructions,
        botType: "custom",
        country: null,
        region: null,
        webEnabled,
      }),
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
    <form onSubmit={submit} className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-white/[.075] bg-[#0d1118] p-4 sm:p-6">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-[.14em] text-[#738095]">Custom assistant</div>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.02em] text-[#edf2f8]">Configure your own specialist</h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-[#8490a1]">
            The built-in assistants are already available. Use Custom when you need a different role, workflow, terminology or source collection.
          </p>
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
            <label className="mb-1.5 block text-xs text-[#8d98a8]">Instructions</label>
            <Textarea
              value={instructions}
              maxLength={8000}
              placeholder="Describe the role, scope, terminology, preferred output format and any workflow rules…"
              onChange={(event) => setInstructions(event.target.value)}
              className="min-h-40"
            />
            <p className="mt-1.5 text-[11px] leading-5 text-[#707c8e]">
              Instructions shape responses but never override workspace security, source permissions or platform safety rules.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[.07] bg-white/[.02] p-4">
            <div>
              <div className="text-sm font-medium text-[#e1e7ef]">Allow web search</div>
              <div className="mt-1 text-xs leading-5 text-[#7e899a]">Lets this assistant use live web search when you enable it in a conversation.</div>
            </div>
            <Switch checked={webEnabled} onCheckedChange={setWebEnabled} />
          </div>
          <Button size="lg" disabled={loading} className="w-full sm:w-auto sm:justify-self-start">
            {loading ? "Creating…" : "Create custom assistant"}
          </Button>
        </div>
      </div>
    </form>
  );
}
