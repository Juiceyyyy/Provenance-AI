"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/app/brand";

export default function ForgotPasswordPage(){
  const[email,setEmail]=useState("");const[message,setMessage]=useState("");const[loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setMessage("");const supabase=createClient();const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/auth/confirm?next=/reset-password`});setMessage(error?error.message:"Password reset link sent if that email exists.");setLoading(false);}
  return <main className="grid min-h-screen place-items-center px-6"><div className="w-full max-w-sm"><Link href="/" className="mb-10 inline-flex text-sm font-semibold"><BrandLockup priority /></Link><h1 className="text-2xl font-semibold">Reset your password</h1><p className="mt-2 text-sm text-muted-foreground">We’ll email you a secure reset link.</p><form className="mt-7 space-y-4" onSubmit={submit}><div><label className="mb-1.5 block text-xs text-muted-foreground">Email</label><Input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>{message&&<p className="text-sm text-zinc-300">{message}</p>}<Button className="w-full" disabled={loading}>{loading?"Sending…":"Send reset link"}</Button></form><p className="mt-5 text-center text-sm text-muted-foreground">Remembered it? <Link className="text-foreground underline underline-offset-4" href="/login">Sign in</Link></p></div></main>
}
