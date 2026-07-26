import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return new Response("Not configured", { status: 503 });

  const form = await request.formData();
  const values = Object.fromEntries(
    [...form.entries()].map(([key, value]) => [key, String(value)]),
  );
  const signature = request.headers.get("x-twilio-signature") ?? "";
  if (!twilio.validateRequest(authToken, signature, request.url, values)) {
    return new Response("Invalid signature", { status: 403 });
  }

  const messageSid = values.MessageSid;
  const messageStatus = values.MessageStatus?.toLowerCase();
  if (!messageSid || !messageStatus) return new Response(null, { status: 204 });

  const timestamp = new Date().toISOString();
  const statusUpdate =
    messageStatus === "delivered"
      ? { status: "delivered", delivered_at: timestamp, error_message: null }
      : messageStatus === "sent" || messageStatus === "sending"
        ? { status: "sent", sent_at: timestamp, error_message: null }
        : ["failed", "undelivered", "canceled"].includes(messageStatus)
          ? {
              status: "failed",
              error_code: values.ErrorCode || null,
              error_message:
                values.ErrorMessage ||
                `Twilio reported the message as ${messageStatus}.`,
            }
          : null;

  if (statusUpdate) {
    await createAdminClient()
      .from("notification_sends")
      .update(statusUpdate)
      .eq("provider_message_id", messageSid);
  }
  return new Response(null, { status: 204 });
}
