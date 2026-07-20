"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { isTwilioConfigured, sendMms } from "@/lib/twilio";

export async function setSubscriberStatus(formData:FormData){await requireAdmin();const id=String(formData.get("id")??"");const status=String(formData.get("status")??"");if(!["active","unsubscribed"].includes(status))return;const supabase=await createClient();await supabase.from("subscribers").update({status,confirmed_at:status==="active"?new Date().toISOString():undefined,unsubscribed_at:status==="unsubscribed"?new Date().toISOString():null}).eq("id",id);revalidatePath("/admin/subscribers");}

export async function setSmsStatus(formData:FormData){await requireAdmin();const id=String(formData.get("id")??"");const smsStatus=String(formData.get("smsStatus")??"");if(!["active","unsubscribed"].includes(smsStatus))return;const supabase=await createClient();await supabase.from("subscribers").update({sms_status:smsStatus,sms_consent_at:smsStatus==="active"?new Date().toISOString():undefined,sms_unsubscribed_at:smsStatus==="unsubscribed"?new Date().toISOString():null}).eq("id",id);revalidatePath("/admin/subscribers");}

export async function deleteSubscriber(formData:FormData){await requireAdmin();const id=String(formData.get("id")??"");const supabase=await createClient();await supabase.from("notification_sends").delete().eq("subscriber_id",id);await supabase.from("subscribers").delete().eq("id",id);revalidatePath("/admin/subscribers");}

export async function sendQueuedNotifications(){
  await requireAdmin();
  const emailConfigured=Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL);
  const mmsConfigured=isTwilioConfigured();
  if(!emailConfigured&&!mmsConfigured)return;
  const supabase=await createClient();
  const {data}=await supabase.from("notification_sends").select("id,subject,channel,attempt_count,subscriber:subscribers(email,name,phone_e164,unsubscribe_token,status,sms_status),post:posts(id,slug,title,excerpt,notification_title,trip_day,cover_image_path)").eq("status","queued").order("created_at").limit(100);
  const site=(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000").replace(/\/$/,"");
  for(const row of data??[]){
    const subscriber=Array.isArray(row.subscriber)?row.subscriber[0]:row.subscriber;
    const post=Array.isArray(row.post)?row.post[0]:row.post;
    if(!subscriber||!post)continue;
    let result:{sent:boolean;id?:string;error?:string};
    if(row.channel==="mms"){
      if(!mmsConfigured||!subscriber.phone_e164||subscriber.sms_status!=="active")continue;
      const hook=post.notification_title||row.subject||post.title;
      const body=`Road & Country — Day ${post.trip_day}: ${hook}\n${site}/journal/${post.slug}\nReply STOP to unsubscribe.`;
      result=await sendMms(subscriber.phone_e164,body,post.cover_image_path?`${site}/api/mms/${post.id}`:undefined);
    }else{
      if(!emailConfigured||!subscriber.email||subscriber.status!=="active")continue;
      result=await sendEmail(subscriber.email,row.subject,`<p>Hello${subscriber.name?` ${subscriber.name}`:""},</p><h1>Day ${post.trip_day}: ${post.title}</h1><p>${post.excerpt}</p><p><a href="${site}/journal/${post.slug}">Read the journal entry</a></p><hr><p><small><a href="${site}/unsubscribe?token=${subscriber.unsubscribe_token}">Unsubscribe</a></small></p>`);
    }
    await supabase.from("notification_sends").update(result.sent?{status:"sent",sent_at:new Date().toISOString(),provider_message_id:result.id,attempt_count:row.attempt_count+1,error_message:null}:{status:"failed",error_message:result.error,attempt_count:row.attempt_count+1}).eq("id",row.id);
  }
  revalidatePath("/admin/subscribers");
}
