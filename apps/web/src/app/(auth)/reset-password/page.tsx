"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setMessage(error.message); setLoading(false); return; }
    setMessage("Password updated. Redirecting to sign in…");
    window.setTimeout(() => router.push("/login"), 900);
    setLoading(false);
  }

  return (
    <AuthShell compact title="Choose a new password" description="Use a strong password that you don’t use for another service.">
      <form className="space-y-4" onSubmit={submit}>
        <div><label className="field-label" htmlFor="password">New password</label><Input id="password" className="h-11" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /><p className="helper-text mt-1.5">Minimum 8 characters.</p></div>
        {message ? <p role="status" className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs leading-5 text-[#c6cbd2]">{message}</p> : null}
        <Button className="h-11 w-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground"><Link className="font-medium text-foreground hover:text-[#c7d9ff]" href="/login">Back to sign in</Link></p>
    </AuthShell>
  );
}
