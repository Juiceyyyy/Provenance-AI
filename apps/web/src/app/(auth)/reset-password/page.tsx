"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/app/brand";

export default function ResetPasswordPage(){
  const[password,setPassword]=useState("");const[message,setMessage]=useState("");const[loading,setLoading]=useState(false);const router=useRouter();
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setMessage("");const supabase=createClient();const {error}=await supabase.auth.updateUser({password});if(error){setMessage(error.message);setLoading(false);return;}setMessage("Password updated. Redirecting to login…");setTimeout(()=>router.push("/login"),900);setLoading(false);}
  return <main className="grid min-h-screen place-items-center px-6"><div className="w-full max-w-sm"><Link href="/" className="mb-10 inline-flex text-sm font-semibold"><BrandLockup priority /></Link><h1 className="text-2xl font-semibold">Choose a new password</h1><p className="mt-2 text-sm text-muted-foreground">Use a strong password you don’t reuse elsewhere.</p><form className="mt-7 space-y-4" onSubmit={submit}><div><label className="mb-1.5 block text-xs text-muted-foreground">New password</label><Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></div>{message&&<p className="text-sm text-zinc-300">{message}</p>}<Button className="w-full" disabled={loading}>{loading?"Updating…":"Update password"}</Button></form><p className="mt-5 text-center text-sm text-muted-foreground"><Link className="text-foreground underline underline-offset-4" href="/login">Back to sign in</Link></p></div></main>
}
