"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { commentSchema } from "@/validation/forms";

export interface CommentState{message:string;success:boolean}
export async function submitComment(_state:CommentState,formData:FormData):Promise<CommentState>{if(String(formData.get("website")??""))return{message:"Thanks. Your comment is awaiting review.",success:true};const started=Number(formData.get("startedAt"));if(!Number.isFinite(started)||Date.now()-started<2500)return{message:"Please take a moment before submitting.",success:false};const parsed=commentSchema.safeParse({displayName:formData.get("displayName"),body:formData.get("body")});if(!parsed.success)return{message:parsed.error.issues[0]?.message??"Check your comment.",success:false};const postId=String(formData.get("postId")??"");const slug=String(formData.get("slug")??"");const requestHeaders=await headers();const identity=`${requestHeaders.get("x-forwarded-for")??"local"}|${requestHeaders.get("user-agent")??"unknown"}|${process.env.COMMENT_HASH_SALT??"road-log"}`;const fingerprint=createHash("sha256").update(identity).digest("hex");const supabase=await createClient();const {error}=await supabase.rpc("submit_journal_comment",{p_post_id:postId,p_display_name:parsed.data.displayName,p_body:parsed.data.body,p_fingerprint_hash:fingerprint});if(error)return{message:error.message,success:false};revalidatePath(`/journal/${slug}`);return{message:"Thanks for leaving a note. Your comment is awaiting review.",success:true};}
