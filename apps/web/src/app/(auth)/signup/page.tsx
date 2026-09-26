"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AuthShell } from "@/components/auth/auth-shell";

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
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/login` } });
    setMessage(error ? error.message : "Check your email to confirm your account, then sign in.");
    setLoading(false);
  }

  return (
    <AuthShell title="Create your workspace" description="Start with six specialist assistants, then add your own documents and instructions.">
      <OAuthButtons />
      <form className="space-y-4" onSubmit={submit}>
        <div><label className="field-label" htmlFor="email">Email</label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-11" /></div>
        <div><label className="field-label" htmlFor="password">Password</label><Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11" /><p className="helper-text mt-1.5">Use at least 8 characters and a password you do not reuse elsewhere.</p></div>
        {message ? <p role="status" className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs leading-5 text-[#c6cbd2]">{message}</p> : null}
        <Button className="h-11 w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link className="font-medium text-foreground hover:text-[#c7d9ff]" href="/login">Sign in</Link></p>
    </AuthShell>
  );
}
