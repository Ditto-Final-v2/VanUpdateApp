import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return new Response("Not configured", { status: 503 });
  const form = await request.formData();
  const values = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!twilio.validateRequest(authToken, signature, request.url, values)) return new Response("Invalid signature", { status: 403 });

  const phone = values.From;
  const optOutType = values.OptOutType?.toUpperCase();
  const body = values.Body?.trim().toUpperCase();
  if (phone && (optOutType === "STOP" || ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(body))) {
    await createAdminClient().from("subscribers").update({ sms_status: "unsubscribed", sms_unsubscribed_at: new Date().toISOString() }).eq("phone_e164", phone);
  } else if (phone && (optOutType === "START" || ["START", "UNSTOP", "YES"].includes(body))) {
    await createAdminClient().from("subscribers").update({ sms_status: "active", sms_consent_at: new Date().toISOString(), sms_unsubscribed_at: null }).eq("phone_e164", phone);
  }
  return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
