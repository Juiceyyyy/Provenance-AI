"use client";
import { cn } from "@/lib/utils";
export function Switch({ checked, onCheckedChange, disabled, className }: {checked:boolean; onCheckedChange:(v:boolean)=>void; disabled?:boolean; className?:string}) {
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={()=>onCheckedChange(!checked)} className={cn("relative h-5 w-9 rounded-full border transition", checked ? "border-zinc-400 bg-zinc-200" : "border-zinc-700 bg-zinc-800", className)}><span className={cn("absolute top-0.5 size-3.5 rounded-full transition-all", checked ? "left-[18px] bg-zinc-900" : "left-0.5 bg-zinc-400")}/></button>
}
