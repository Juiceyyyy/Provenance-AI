"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/app/brand";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-[430px]">
        <Link href="/" className="mb-10 inline-flex">
          <BrandLockup priority markClassName="size-11" textClassName="text-[21px]" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-[28px]">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Sign in to your assistants, documents and conversations.</p>

        <div className="mt-7"><OAuthButtons /></div>

        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-xs text-muted-foreground">Email</label>
            <Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Password</label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>
            </div>
            <Input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11" />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button className="h-11 w-full rounded-xl" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">New here? <Link className="font-medium text-foreground hover:text-[#bcd3fb]" href="/signup">Create an account</Link></p>
      </div>
    </main>
  );
}
