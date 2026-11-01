"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { isTwilioConfigured, sendMms } from "@/lib/twilio";
import { campaignSlug, invitation, invitationImage } from "./campaign";

export async function sendHalloweenInvitation() {
  const admin = await requireAdmin();
  if (!isTwilioConfigured()) throw Error("Text delivery is not configured.");
  // This fixed invitation expires after Halloween night; it cannot become a stale campaign.
  if (Date.now() > Date.parse("2026-11-01T10:00:00Z")) throw Error("This invitation has expired.");
  const db = await createClient();
  const { data: existingPost, error: postError } = await db.from("posts").select("id").eq("slug", campaignSlug).maybeSingle();
  let post = existingPost;
  if (postError) throw Error("Could not check campaign history.");
  if (!post) {
    const { data: trip, error } = await db.from("trips").select("id,current_latitude,current_longitude").eq("status", "active").limit(1).single();
    if (error || !trip) throw Error("Could not find the active trip.");
    // A private draft provides a durable campaign ID for the existing delivery ledger.
    const result = await db.from("posts").insert({ trip_id: trip.id, slug: campaignSlug, title: "Halloween party MMS invitation (private delivery log)", excerpt: invitation, body: invitation, entry_date: "2026-10-31", location_name: "Poinsettia Mines", latitude: trip.current_latitude, longitude: trip.current_longitude, trip_day: 1, status: "draft", created_by: admin.id }).select("id").single();
    if (result.error && result.error.code !== "23505") throw Error("Could not create delivery log.");
    const existing = result.data ?? (await db.from("posts").select("id").eq("slug", campaignSlug).single()).data;
    if (!existing) throw Error("Could not find delivery log.");
    post = existing;
  }
  const { data: subscribers, error } = await db.from("subscribers").select("id,phone_e164").eq("sms_status", "active").not("phone_e164", "is", null);
  if (error) throw Error("Could not load text subscribers.");
  for (const subscriber of subscribers ?? []) {
    // The unique post/subscriber/channel key claims each recipient exactly once,
    // even with repeated clicks. Uncertain attempts are never automatically retried.
    const { data: claim, error: claimError } = await db.from("notification_sends").insert({ post_id: post.id, subscriber_id: subscriber.id, subject: "Halloween party invitation", channel: "mms", status: "scheduled", attempt_count: 1, error_message: "Immediate invitation send in progress; review provider before retrying." }).select("id").single();
    if (claimError?.code === "23505") continue;
    if (claimError || !claim) throw Error("Could not claim recipient; sending stopped.");
    // Recheck consent immediately before submission.
    const { data: current, error: consentError } = await db.from("subscribers").select("phone_e164,sms_status").eq("id", subscriber.id).single();
    if (consentError || current?.sms_status !== "active" || !current.phone_e164) {
      const { error: logError } = await db.from("notification_sends").update({ status: "failed", error_message: "Skipped: active text consent could not be verified." }).eq("id", claim.id);
      if (logError) throw Error("Could not save delivery status; sending stopped.");
      continue;
    }
    const result = await sendMms(current.phone_e164, invitation, invitationImage);
    const { error: logError } = await db.from("notification_sends").update(result.sent ? { status: "sent", provider_message_id: result.id, sent_at: new Date().toISOString(), error_message: null } : { status: "failed", error_message: result.error }).eq("id", claim.id);
    if (logError) throw Error("Could not save delivery status; review provider before retrying.");
  }
  redirect("/admin/halloween-invite?submitted=1");
}
