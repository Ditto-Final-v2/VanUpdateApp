"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

export async function moderateComment(formData:FormData){const admin=await requireAdmin();const id=String(formData.get("id")??"");const status=String(formData.get("status")??"");if(!["approved","hidden","spam"].includes(status))return;const supabase=await createClient();const {data}=await supabase.from("comments").update({status,moderated_by:admin.id,moderated_at:new Date().toISOString()}).eq("id",id).select("post:posts(slug)").maybeSingle();const post=Array.isArray(data?.post)?data.post[0]:data?.post;if(post?.slug)revalidatePath(`/journal/${post.slug}`);revalidatePath("/admin/comments");revalidatePath("/admin");}
export async function deleteComment(formData:FormData){await requireAdmin();const id=String(formData.get("id")??"");const supabase=await createClient();await supabase.from("comments").delete().eq("id",id);revalidatePath("/admin/comments");revalidatePath("/admin");}
