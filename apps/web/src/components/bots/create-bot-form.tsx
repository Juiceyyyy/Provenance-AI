"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BOT_PRESETS, PRESET_LIST, type BotPresetKey } from "@/lib/bots/presets";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function CreateBotForm({initialPreset="general",initialCountry="",initialRegion=""}:{initialPreset?:BotPresetKey;initialCountry?:string;initialRegion?:string}) {
  const router=useRouter();
  const [preset,setPreset]=useState<BotPresetKey>(initialPreset);
  const info=useMemo(()=>BOT_PRESETS[preset],[preset]);
  const [name,setName]=useState(BOT_PRESETS[initialPreset].name);
  const [description,setDescription]=useState(BOT_PRESETS[initialPreset].description);
  const [instructions,setInstructions]=useState("");
  const [country,setCountry]=useState(initialCountry);
  const [region,setRegion]=useState(initialRegion);
  const [webEnabled,setWebEnabled]=useState(BOT_PRESETS[initialPreset].webDefault);
  const [loading,setLoading]=useState(false);

  function choose(value:BotPresetKey){setPreset(value);const p=BOT_PRESETS[value];setName(p.name);setDescription(p.description);setWebEnabled(p.webDefault)}
  async function submit(e:React.FormEvent){e.preventDefault();if(info.requiresJurisdiction&&!country.trim()){toast.error("Choose a jurisdiction country for this assistant.");return;}setLoading(true);const response=await fetch("/api/bots",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name,description,instructions,botType:preset,country:country||null,region:region||null,webEnabled})});const body=await response.json().catch(()=>({}));if(!response.ok){toast.error(body.error||"Could not create assistant");setLoading(false);return;}router.push(`/app/bots/${body.id}`);router.refresh();}

  return <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
    <div className="space-y-2">{PRESET_LIST.map(p=><button type="button" onClick={()=>choose(p.key)} key={p.key} className={`w-full rounded-xl border p-4 text-left transition ${preset===p.key?"border-zinc-500 bg-card":"bg-[#0d0d0f] hover:border-zinc-700"}`}><div className="text-sm font-medium">{p.name}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{p.description}</div></button>)}</div>
    <Card className="h-fit p-6"><div className="grid gap-5"><div><label className="mb-1.5 block text-xs text-muted-foreground">Assistant name</label><Input value={name} maxLength={80} required onChange={e=>setName(e.target.value)}/></div><div><label className="mb-1.5 block text-xs text-muted-foreground">Description</label><Textarea value={description} maxLength={500} onChange={e=>setDescription(e.target.value)}/></div><div><label className="mb-1.5 block text-xs text-muted-foreground">Custom instructions</label><Textarea value={instructions} maxLength={8000} placeholder="Optional behavior, terminology, format, scope or priorities…" onChange={e=>setInstructions(e.target.value)}/><p className="mt-1.5 text-[11px] text-muted-foreground">Instructions affect response behavior; they never override workspace security or source permissions.</p></div>{info.requiresJurisdiction&&<div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-xs text-muted-foreground">Country / jurisdiction</label><Input value={country} required placeholder="e.g. India" onChange={e=>setCountry(e.target.value)}/></div><div><label className="mb-1.5 block text-xs text-muted-foreground">State / region</label><Input value={region} placeholder="e.g. Maharashtra" onChange={e=>setRegion(e.target.value)}/></div></div>}<div className="flex items-center justify-between rounded-lg border p-4"><div><div className="text-sm font-medium">Allow web search</div><div className="mt-1 text-xs text-muted-foreground">User can enable live web search per conversation.</div></div><Switch checked={webEnabled} onCheckedChange={setWebEnabled}/></div><Button size="lg" disabled={loading}>{loading?"Creating…":"Create assistant"}</Button></div></Card>
  </form>
}
