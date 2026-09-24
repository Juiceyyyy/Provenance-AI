import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { isTrustedMutation } from "@/lib/security/request";

const MAX_FILE_BYTES=50*1024*1024;
const allowed=new Set(["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","text/plain","text/markdown","text/csv","text/html","image/png","image/jpeg"]);
const schema=z.object({botId:z.string().uuid(),filename:z.string().min(1).max(240),mimeType:z.string().max(160),size:z.number().int().positive().max(MAX_FILE_BYTES)});
function clean(name:string){return name.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").slice(-180)||"document"}

export async function POST(req:Request){if(!isTrustedMutation(req))return NextResponse.json({error:"Cross-origin request rejected"},{status:403});const{supabase,userId}=await requireApiUser();if(!userId)return NextResponse.json({error:"Unauthorized"},{status:401});const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Invalid upload request or file exceeds 50 MB"},{status:400});if(!allowed.has(p.data.mimeType))return NextResponse.json({error:"Unsupported file type"},{status:415});
  const{data:bot}=await supabase.from("bots").select("id,organization_id").eq("id",p.data.botId).maybeSingle();if(!bot)return NextResponse.json({error:"Assistant not found"},{status:404});
  const{data:link}=await supabase.from("bot_knowledge_bases").select("knowledge_base_id,knowledge_bases!inner(kind,visibility)").eq("bot_id",bot.id).eq("knowledge_bases.kind","private").eq("knowledge_bases.visibility","private").limit(1).maybeSingle();
  if(!link)return NextResponse.json({error:"Private knowledge base not found"},{status:409});
  const path=`${bot.organization_id}/${userId}/${bot.id}/${crypto.randomUUID()}-${clean(p.data.filename)}`;
  const{data,error}=await supabase.storage.from("documents").createSignedUploadUrl(path);if(error||!data)return NextResponse.json({error:error?.message||"Could not create upload URL"},{status:400});
  return NextResponse.json({path,token:data.token,knowledgeBaseId:link.knowledge_base_id});
}
