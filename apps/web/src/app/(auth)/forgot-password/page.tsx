"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/app/brand";

export default function ForgotPasswordPage(){
  const[email,setEmail]=useState("");const[message,setMessage]=useState("");const[loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setMessage("");const supabase=createClient();const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/reset-password`});setMessage(error?error.message:"Password reset link sent if that email exists.");setLoading(false);}
  return <main className="grid min-h-dvh place-items-center px-4 py-10 sm:px-6"><div className="w-full max-w-[430px]"><Link href="/" className="mb-10 inline-flex"><BrandLockup priority markClassName="size-11" textClassName="text-[21px]" /></Link><h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-[28px]">Reset your password</h1><p className="mt-2 text-sm text-muted-foreground">We’ll email you a secure reset link.</p><form className="mt-7 space-y-4" onSubmit={submit}><div><label className="mb-1.5 block text-xs text-muted-foreground">Email</label><Input className="h-11" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div>{message&&<p className="text-sm text-zinc-300">{message}</p>}<Button className="h-11 w-full rounded-xl" disabled={loading}>{loading?"Sending…":"Send reset link"}</Button></form><p className="mt-6 text-center text-sm text-muted-foreground">Remembered it? <Link className="font-medium text-foreground hover:text-[#bcd3fb]" href="/login">Sign in</Link></p></div></main>
}
