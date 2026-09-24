import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({children}:{children:React.ReactNode}){const {claims}=await requireUser();return <div className="flex min-h-screen"><Sidebar/><div className="min-w-0 flex-1"><Topbar email={typeof claims.email==="string"?claims.email:undefined}/><div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div></div></div>}
