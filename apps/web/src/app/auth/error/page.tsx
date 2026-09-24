import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  return <main className="grid min-h-screen place-items-center px-6"><div className="w-full max-w-md rounded-xl border bg-card p-6"><h1 className="text-xl font-semibold">Authentication link could not be verified</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">The link may have expired or already been used. Request a fresh confirmation email from the sign-up flow or sign in if your account is already confirmed.</p><div className="mt-6 flex gap-2"><Link href="/login"><Button>Go to sign in</Button></Link><Link href="/signup"><Button variant="secondary">Create account</Button></Link></div></div></main>;
}
