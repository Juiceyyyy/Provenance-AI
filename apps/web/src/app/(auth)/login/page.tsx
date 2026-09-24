"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/app/brand";

export default function LoginPage(){
  const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[error,setError]=useState("");const[loading,setLoading]=useState(false);const router=useRouter();
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setError("");const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setError(error.message);setLoading(false);return;}router.push("/app");router.refresh();}
  return <main className="grid min-h-screen place-items-center px-6"><div className="w-full max-w-sm"><Link href="/" className="mb-10 inline-flex text-sm font-semibold"><BrandLockup priority /></Link><h1 className="text-2xl font-semibold">Welcome back</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to your private knowledge workspace.</p><form className="mt-7 space-y-4" onSubmit={submit}><div><label className="mb-1.5 block text-xs text-muted-foreground">Email</label><Input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div><div><label className="mb-1.5 block text-xs text-muted-foreground">Password</label><Input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></div><div className="-mt-2 text-right"><Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link></div>{error&&<p className="text-sm text-red-300">{error}</p>}<Button className="w-full" disabled={loading}>{loading?"Signing in…":"Sign in"}</Button></form><p className="mt-5 text-center text-sm text-muted-foreground">New here? <Link className="text-foreground underline underline-offset-4" href="/signup">Create an account</Link></p></div></main>
}
