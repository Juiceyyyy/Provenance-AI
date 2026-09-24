import Link from "next/link";
import { Bot, Files, LayoutDashboard, LogOut, Menu, PieChart, Plus, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/app/brand";

const mobileLinks = [
  [LayoutDashboard, "Overview", "/app"],
  [Bot, "Assistants", "/app/bots"],
  [Files, "Knowledge", "/app/knowledge"],
  [PieChart, "Portfolio", "/app/portfolio"],
  [Settings, "Settings", "/app/settings"],
] as const;

export function Topbar({email}:{email?:string}){
  async function logout(){"use server";const supabase=await createClient();await supabase.auth.signOut();redirect("/login");}
  return <header className="relative flex h-16 items-center justify-between border-b border-[#1f2e42] bg-background/80 px-4 backdrop-blur md:px-6"><div className="flex items-center gap-3"><details className="group relative md:hidden"><summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><Menu className="size-5"/></summary><div className="absolute left-0 top-11 z-50 w-72 rounded-xl border border-[#28426d] bg-[#0c121c] p-2 shadow-2xl"><div className="mb-2 px-2 py-2"><BrandLockup markClassName="size-8"/></div>{mobileLinks.map(([Icon,label,href])=><Link key={href} href={href} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-[#142034] hover:text-foreground"><Icon className="size-4 text-[#7baeff]"/>{label}</Link>)}<Link href="/app/bots/new" className="mt-2 flex h-10 items-center gap-3 rounded-lg border border-dashed border-[#36558d] px-3 text-sm text-muted-foreground hover:bg-[#142034] hover:text-foreground"><Plus className="size-4 text-[#7baeff]"/>New assistant</Link></div></details><div className="hidden md:block"><span className="text-xs tracking-[.18em] text-muted-foreground uppercase">Private workspace</span></div><div className="md:hidden"><Link href="/app"><BrandLockup markClassName="size-8" textClassName="text-xs"/></Link></div></div><div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:block">{email}</span><form action={logout}><button aria-label="Sign out" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4"/></button></form></div></header>;
}
