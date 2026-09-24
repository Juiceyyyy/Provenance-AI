import { headers } from "next/headers";
import { CreateBotForm } from "@/components/bots/create-bot-form";
import { isPresetKey } from "@/lib/bots/presets";
import { requireUser } from "@/lib/auth";

export default async function NewBotPage({searchParams}:{searchParams:Promise<{preset?:string}>}){
  const {preset}=await searchParams;const initial=preset&&isPresetKey(preset)?preset:"general";const{supabase,userId}=await requireUser();
  const [{data:profile},requestHeaders]=await Promise.all([supabase.from("profiles").select("default_country,default_region").eq("id",userId).maybeSingle(),headers()]);
  const code=requestHeaders.get("x-vercel-ip-country");let detectedCountry="";if(code){try{detectedCountry=new Intl.DisplayNames(["en"],{type:"region"}).of(code)||code}catch{detectedCountry=code}}
  const detectedRegion=requestHeaders.get("x-vercel-ip-country-region")||"";
  return <div><div className="mb-7"><h1 className="text-2xl font-semibold">Create an assistant</h1><p className="mt-1 text-sm text-muted-foreground">Pick a specialist, then attach private knowledge and instructions. Any location-derived jurisdiction is only a suggestion and remains editable before creation.</p></div><CreateBotForm initialPreset={initial} initialCountry={profile?.default_country||detectedCountry} initialRegion={profile?.default_region||detectedRegion}/></div>;
}
