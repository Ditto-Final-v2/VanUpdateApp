import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getMmsDeliveryStatus, isTwilioConfigured } from "@/lib/twilio";
import { campaignSlug, invitation } from "./campaign";
import { sendHalloweenInvitation } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function HalloweenInvitation() {
  const db = await createClient();
  const { count, error: subscriberError } = await db.from("subscribers").select("id", { count: "exact", head: true }).eq("sms_status", "active").not("phone_e164", "is", null);
  const { data: post, error: campaignError } = await db.from("posts").select("id").eq("slug", campaignSlug).maybeSingle();
  if (subscriberError || campaignError) throw Error("Could not load campaign details.");
  const result = post ? await db.from("notification_sends").select("id,status,provider_message_id,error_message").eq("post_id", post.id).eq("channel", "mms") : { data: [], error: null };
  if (result.error) throw Error("Could not load delivery log.");
  const rows = result.data ?? [];
  const statuses = await Promise.all(rows.map(async row => row.provider_message_id ? await getMmsDeliveryStatus(row.provider_message_id) : null));
  const tally: Record<string, number> = {};
  rows.forEach((row, i) => { const provider = statuses[i]; const status = provider?.found ? provider.status : row.status; tally[status] = (tally[status] ?? 0) + 1; });
  const remaining = Math.max(0, (count ?? 0) - rows.length);
  return <div className="space-y-5"><h1 className="font-serif text-3xl">Halloween photo invitation</h1><p>{count ?? 0} active text subscribers. Sends immediately with the attached photo.</p><Image src="/images/halloween-invitation.jpg" alt="Abandoned buildings at Poinsettia Mines" width={700} height={526} className="w-full max-w-xl" /><p className="whitespace-pre-wrap border-2 border-forest bg-white p-4">{invitation}</p><p role="status">{rows.length ? `Delivery log: ${rows.length} recipients processed. ${Object.entries(tally).map(([status, n]) => `${n} ${status}`).join(" · ")}.` : "Ready to send. No messages sent for this campaign."}</p>{rows.filter(row => row.error_message).map(row => <p key={row.id} className="text-red-800">{row.error_message}</p>)}<form action={sendHalloweenInvitation}><button className="button-primary" disabled={!isTwilioConfigured() || remaining === 0}>{remaining ? "Send Halloween photo message now" : "All recipients processed"}</button></form><p>Each recipient is recorded once. Previously attempted recipients are skipped on repeated submissions.</p></div>;
}
