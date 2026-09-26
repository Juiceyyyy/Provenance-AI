import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AuthErrorPage() {
  return (
    <AuthShell compact title="We couldn’t verify that link" description="The authentication link may have expired or already been used.">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-sm leading-6 text-muted-foreground">Request a fresh confirmation email from the sign-up flow, or sign in if your account is already confirmed.</p>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/login" className="flex-1"><Button className="w-full">Go to sign in</Button></Link>
          <Link href="/signup" className="flex-1"><Button variant="secondary" className="w-full">Create account</Button></Link>
        </div>
      </div>
    </AuthShell>
  );
}
