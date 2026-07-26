"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { sendEmail } from "@/lib/email";
import { buildJournalNotificationEmail } from "@/lib/notification-email";
import { createClient } from "@/lib/supabase/server";
import { isTwilioConfigured, sendMms } from "@/lib/twilio";

export async function setSubscriberStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["active", "unsubscribed"].includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("subscribers")
    .update({
      status,
      confirmed_at: status === "active" ? new Date().toISOString() : undefined,
      unsubscribed_at: status === "unsubscribed" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/admin/subscribers");
}

export async function setSmsStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const smsStatus = String(formData.get("smsStatus") ?? "");
  if (!["active", "unsubscribed"].includes(smsStatus)) return;
  const supabase = await createClient();
  await supabase
    .from("subscribers")
    .update({
      sms_status: smsStatus,
      sms_consent_at: smsStatus === "active" ? new Date().toISOString() : undefined,
      sms_unsubscribed_at: smsStatus === "unsubscribed" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/admin/subscribers");
}

export async function deleteSubscriber(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("notification_sends").delete().eq("subscriber_id", id);
  await supabase.from("subscribers").delete().eq("id", id);
  revalidatePath("/admin/subscribers");
}

export async function sendQueuedNotifications() {
  await requireAdmin();
  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
  );
  const mmsConfigured = isTwilioConfigured();
  if (!emailConfigured && !mmsConfigured) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_sends")
    .select(
      "id,subject,channel,attempt_count,subscriber:subscribers(email,name,phone_e164,unsubscribe_token,status,sms_status),post:posts(id,slug,title,excerpt,notification_title,trip_day,entry_date,activity_location_name,cover_image_path)",
    )
    .eq("status", "queued")
    .order("created_at")
    .limit(100);
  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");

  for (const row of data ?? []) {
    const subscriber = Array.isArray(row.subscriber)
      ? row.subscriber[0]
      : row.subscriber;
    const post = Array.isArray(row.post) ? row.post[0] : row.post;
    if (!subscriber || !post) continue;
    let result: { sent: boolean; id?: string; error?: string };

    if (row.channel === "mms") {
      if (
        !mmsConfigured ||
        !subscriber.phone_e164 ||
        subscriber.sms_status !== "active"
      ) {
        continue;
      }
      const hook = post.notification_title?.trim() || row.subject || post.title;
      result = await sendMms(
        subscriber.phone_e164,
        `${hook}\n${site}/journal/${post.slug}`,
        post.cover_image_path ? `${site}/api/mms/${post.id}` : undefined,
      );
    } else {
      if (
        !emailConfigured ||
        !subscriber.email ||
        subscriber.status !== "active"
      ) {
        continue;
      }
      const email = buildJournalNotificationEmail({
        subscriber: {
          email: subscriber.email,
          name: subscriber.name,
          unsubscribeToken: subscriber.unsubscribe_token,
        },
        post: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          notificationTitle: post.notification_title,
          tripDay: post.trip_day,
          entryDate: post.entry_date,
          locationName: post.activity_location_name,
          hasCoverImage: Boolean(post.cover_image_path),
        },
        siteUrl: site,
      });
      result = await sendEmail(
        subscriber.email,
        `Day ${post.trip_day}: ${row.subject}`,
        email.html,
        {
          text: email.text,
          idempotencyKey: `journal-notification-${row.id}`,
          headers: {
            "List-Unsubscribe": `<${email.oneClickUnsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
      );
    }

    await supabase
      .from("notification_sends")
      .update(
        result.sent
          ? {
              status: "sent",
              sent_at: new Date().toISOString(),
              provider_message_id: result.id,
              attempt_count: row.attempt_count + 1,
              error_message: null,
            }
          : {
              status: "failed",
              error_message: result.error,
              attempt_count: row.attempt_count + 1,
            },
      )
      .eq("id", row.id);
  }
  revalidatePath("/admin/subscribers");
}
