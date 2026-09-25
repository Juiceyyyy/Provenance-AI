"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type OAuthProvider = "google" | "github" | "azure";

function GoogleMark() {
  return <span className="grid size-4 place-items-center text-[13px] font-semibold text-foreground">G</span>;
}

function GitHubMark() {
  return <span className="grid min-w-4 place-items-center text-[10px] font-bold tracking-[-0.08em] text-foreground">GH</span>;
}

function MicrosoftMark() {
  return (
    <span className="grid size-4 grid-cols-2 gap-[2px] p-[1px]" aria-hidden="true">
      <span className="bg-[#f25022]" /><span className="bg-[#7fba00]" />
      <span className="bg-[#00a4ef]" /><span className="bg-[#ffb900]" />
    </span>
  );
}

const providers: { id: OAuthProvider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Google", icon: <GoogleMark /> },
  { id: "github", label: "GitHub", icon: <GitHubMark /> },
  { id: "azure", label: "Microsoft", icon: <MicrosoftMark /> },
];

export function OAuthButtons() {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState("");

  async function signIn(provider: OAuthProvider) {
    setBusy(provider);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/app`,
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });
    if (authError) {
      setError(authError.message);
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => signIn(provider.id)}
            disabled={busy !== null}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[.10] bg-white/[.025] px-3 text-sm font-medium text-[#dce5f2] transition hover:border-[#3a557c] hover:bg-white/[.05] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {provider.icon}
            <span>{busy === provider.id ? "Connecting…" : provider.label}</span>
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-center text-xs text-red-300">{error}</p> : null}
      <div className="my-5 flex items-center gap-3 text-[11px] text-[#687487] before:h-px before:flex-1 before:bg-white/[.08] after:h-px after:flex-1 after:bg-white/[.08]">or continue with email</div>
    </div>
  );
}
