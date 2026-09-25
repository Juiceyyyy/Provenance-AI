"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/app/brand";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/confirm?next=/app` },
    });
    setMessage(error ? error.message : "Check your email to confirm your account, then sign in.");
    setLoading(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-[430px]">
        <Link href="/" className="mb-10 inline-flex">
          <BrandLockup priority markClassName="size-11" textClassName="text-[21px]" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-[28px]">Create your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Build private assistants around trusted sources and your own documents.</p>

        <div className="mt-7"><OAuthButtons /></div>

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Email</label>
            <Input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Password</label>
            <Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11" />
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">Use at least 8 characters and a password you do not reuse elsewhere.</p>
          </div>
          {message ? <p className="text-sm leading-5 text-zinc-300">{message}</p> : null}
          <Button className="h-11 w-full rounded-xl" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link className="font-medium text-foreground hover:text-[#bcd3fb]" href="/login">Sign in</Link></p>
      </div>
    </main>
  );
}
