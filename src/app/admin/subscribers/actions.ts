"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export async function setSubscriberStatus(formData:FormData){await requireAdmin();const id=String(formData.get("id")??"");const status=String(formData.get("status")??"");if(!["active","unsubscribed"].includes(status))return;const supabase=await createClient();await supabase.from("subscribers").update({status,confirmed_at:status==="active"?new Date().toISOString():undefined,unsubscribed_at:status==="unsubscribed"?new Date().toISOString():null}).eq("id",id);revalidatePath("/admin/subscribers");}

export async function deleteSubscriber(formData:FormData){await requireAdmin();const id=String(formData.get("id")??"");const supabase=await createClient();await supabase.from("notification_sends").delete().eq("subscriber_id",id);await supabase.from("subscribers").delete().eq("id",id);revalidatePath("/admin/subscribers");}

export async function sendQueuedNotifications(){await requireAdmin();if(!process.env.RESEND_API_KEY||!process.env.RESEND_FROM_EMAIL)return;const supabase=await createClient();const {data}=await supabase.from("notification_sends").select("id,subject,attempt_count,subscriber:subscribers(email,name,unsubscribe_token),post:posts(slug,title,excerpt)").eq("status","queued").order("created_at").limit(50);const site=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";for(const row of data??[]){const subscriber=Array.isArray(row.subscriber)?row.subscriber[0]:row.subscriber;const post=Array.isArray(row.post)?row.post[0]:row.post;if(!subscriber||!post)continue;const result=await sendEmail(subscriber.email,row.subject,`<p>Hello${subscriber.name?` ${subscriber.name}`:""},</p><h1>${post.title}</h1><p>${post.excerpt}</p><p><a href="${site}/journal/${post.slug}">Read the journal entry</a></p><hr><p><small><a href="${site}/unsubscribe?token=${subscriber.unsubscribe_token}">Unsubscribe</a></small></p>`);await supabase.from("notification_sends").update(result.sent?{status:"sent",sent_at:new Date().toISOString(),provider_message_id:result.id,attempt_count:row.attempt_count+1}:{status:"failed",error_message:result.error,attempt_count:row.attempt_count+1}).eq("id",row.id);}revalidatePath("/admin/subscribers");}
