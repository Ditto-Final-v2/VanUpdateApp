"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getMmsDeliveryStatus,
  isTwilioConfigured,
  sendMms,
} from "@/lib/twilio";

export async function cleanAbandonedPhotos(){await requireAdmin();const supabase=await createClient();const {data:used}=await supabase.from("post_photos").select("storage_path");const usedPaths=new Set((used??[]).map((row)=>row.storage_path));const {data:folders}=await supabase.storage.from("trip-photos").list("staged",{limit:100});const cutoff=Date.now()-24*60*60*1000;const abandoned:string[]=[];for(const folder of folders??[]){if(folder.id)continue;const {data:files}=await supabase.storage.from("trip-photos").list(`staged/${folder.name}`,{limit:100});for(const file of files??[]){const path=`staged/${folder.name}/${file.name}`;if(file.id&&!usedPaths.has(path)&&new Date(file.created_at??0).getTime()<cutoff)abandoned.push(path);}}if(abandoned.length)await supabase.storage.from("trip-photos").remove(abandoned);revalidatePath("/admin/posts");}

export async function retryFailedPostMms(formData: FormData) {
  await requireAdmin();
  const postId = String(formData.get("postId") ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(postId) || !isTwilioConfigured()) {
    redirect("/admin/posts?mms=unavailable");
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://curtisroadtrip.com"
  ).replace(/\/$/, "");
  const supabase = await createClient();
  const [{ data: post }, { data: rows }] = await Promise.all([
    supabase
      .from("posts")
      .select("id,slug,title,notification_title,cover_image_path,status")
      .eq("id", postId)
      .eq("status", "published")
      .maybeSingle(),
    supabase
      .from("notification_sends")
      .select(
        "id,status,provider_message_id,attempt_count,subscriber:subscribers(phone_e164,sms_status)",
      )
      .eq("post_id", postId)
      .eq("channel", "mms"),
  ]);
  if (!post) redirect("/admin/posts?mms=unavailable");

  const retryableStatuses = new Set(["failed", "undelivered", "canceled"]);
  let resent = 0;
  let failed = 0;
  let skipped = 0;
  let unverified = 0;

  for (const row of rows ?? []) {
    const subscriber = Array.isArray(row.subscriber)
      ? row.subscriber[0]
      : row.subscriber;
    if (!subscriber?.phone_e164 || subscriber.sms_status !== "active") {
      skipped += 1;
      continue;
    }

    let shouldRetry = row.status === "failed" && !row.provider_message_id;
    if (row.provider_message_id) {
      const provider = await getMmsDeliveryStatus(row.provider_message_id);
      if (!provider.found) {
        unverified += 1;
        continue;
      }
      const missingExpectedMedia =
        Boolean(post.cover_image_path) &&
        ["sent", "delivered"].includes(provider.status) &&
        provider.numMedia === 0;
      shouldRetry =
        retryableStatuses.has(provider.status) ||
        Boolean(provider.errorCode) ||
        missingExpectedMedia;
    }
    if (!shouldRetry) {
      skipped += 1;
      continue;
    }

    let claim = supabase
      .from("notification_sends")
      .update({
        status: "scheduled",
        error_message: "Manual MMS retry in progress.",
      })
      .eq("id", row.id)
      .eq("status", row.status);
    claim = row.provider_message_id
      ? claim.eq("provider_message_id", row.provider_message_id)
      : claim.is("provider_message_id", null);
    const { data: claimed } = await claim.select("id").maybeSingle();
    if (!claimed) {
      skipped += 1;
      continue;
    }

    const hook = post.notification_title?.trim() || post.title;
    const result = await sendMms(
      subscriber.phone_e164,
      `${hook}\n${siteUrl}/journal/${post.slug}`,
      post.cover_image_path
        ? `${siteUrl}/api/mms/${post.id}`
        : undefined,
    );
    if (result.sent) {
      resent += 1;
      await supabase
        .from("notification_sends")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result.id,
          attempt_count: row.attempt_count + 1,
          error_code: null,
          error_message: null,
        })
        .eq("id", row.id);
    } else {
      failed += 1;
      await supabase
        .from("notification_sends")
        .update({
          status: "failed",
          attempt_count: row.attempt_count + 1,
          error_message: result.error,
        })
        .eq("id", row.id);
    }
  }

  revalidatePath("/admin/posts");
  revalidatePath("/admin/subscribers");
  redirect(
    `/admin/posts?mms=complete&resent=${resent}&failed=${failed}&skipped=${skipped}&unverified=${unverified}`,
  );
}
