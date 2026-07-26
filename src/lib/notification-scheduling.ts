import "server-only";

import { getNextCentralNotificationTime } from "@/lib/central-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTwilioConfigured, scheduleMms } from "@/lib/twilio";

function getSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);
  return configured?.replace(/\/$/, "") ?? null;
}

export async function schedulePostMmsNotifications(postId: string) {
  if (!isTwilioConfigured()) {
    return { scheduled: 0, failed: 0, error: "Twilio delivery is not configured." };
  }
  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    return {
      scheduled: 0,
      failed: 0,
      error: "NEXT_PUBLIC_SITE_URL is required to schedule journal texts.",
    };
  }

  const supabase = createAdminClient();
  const [{ data: post, error: postError }, { data: rows, error: queueError }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id,slug,title,notification_title,cover_image_path")
        .eq("id", postId)
        .eq("status", "published")
        .maybeSingle(),
      supabase
        .from("notification_sends")
        .select(
          "id,subject,attempt_count,subscriber:subscribers(phone_e164,sms_status)",
        )
        .eq("post_id", postId)
        .eq("channel", "mms")
        .eq("status", "queued")
        .order("created_at"),
    ]);

  if (postError || queueError || !post) {
    return {
      scheduled: 0,
      failed: 0,
      error: postError?.message ?? queueError?.message ?? "Published entry was not found.",
    };
  }

  const sendAt = getNextCentralNotificationTime();
  const entryUrl = `${siteUrl}/journal/${post.slug}`;
  const mediaUrl = post.cover_image_path ? `${siteUrl}/api/mms/${post.id}` : undefined;
  let scheduled = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const subscriber = Array.isArray(row.subscriber)
      ? row.subscriber[0]
      : row.subscriber;
    if (
      !subscriber?.phone_e164 ||
      subscriber.sms_status !== "active"
    ) {
      continue;
    }

    const hook = post.notification_title?.trim() || row.subject || post.title;
    const result = await scheduleMms(
      subscriber.phone_e164,
      `${hook}\n${entryUrl}`,
      sendAt,
      mediaUrl,
      `${siteUrl}/api/twilio/status`,
    );
    const attemptCount = row.attempt_count + 1;

    if (result.sent) {
      scheduled += 1;
      await supabase
        .from("notification_sends")
        .update({
          status: "scheduled",
          scheduled_for: sendAt.toISOString(),
          provider_message_id: result.id,
          attempt_count: attemptCount,
          error_message: null,
        })
        .eq("id", row.id);
    } else {
      failed += 1;
      await supabase
        .from("notification_sends")
        .update({
          attempt_count: attemptCount,
          error_message: result.error,
        })
        .eq("id", row.id);
    }
  }

  return { scheduled, failed, sendAt };
}
