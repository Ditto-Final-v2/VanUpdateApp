import "server-only";

import twilio from "twilio";

export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function isTwilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_MESSAGING_SERVICE_SID);
}

export async function sendMms(to: string, body: string, mediaUrl?: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!accountSid || !authToken || !messagingServiceSid) return { sent: false as const, error: "Twilio delivery is not configured." };
  try {
    const message = await twilio(accountSid, authToken).messages.create({
      to,
      messagingServiceSid,
      body,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    });
    return { sent: true as const, id: message.sid };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Twilio rejected the message.";
    return { sent: false as const, error: detail };
  }
}

export async function getMmsDeliveryStatus(messageSid: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { found: false as const, error: "Twilio delivery is not configured." };
  }
  if (!/^(SM|MM)[a-f0-9]{32}$/i.test(messageSid)) {
    return { found: false as const, error: "Invalid Twilio message identifier." };
  }
  try {
    const message = await twilio(accountSid, authToken)
      .messages(messageSid)
      .fetch();
    return {
      found: true as const,
      status: message.status,
      numMedia: Number(message.numMedia ?? "0"),
      errorCode: message.errorCode ? String(message.errorCode) : null,
      errorMessage: message.errorMessage ?? null,
    };
  } catch (error) {
    return {
      found: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Twilio message status could not be checked.",
    };
  }
}

export async function scheduleMms(
  to: string,
  body: string,
  sendAt: Date,
  mediaUrl?: string,
  statusCallback?: string,
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!accountSid || !authToken || !messagingServiceSid) {
    return { sent: false as const, error: "Twilio delivery is not configured." };
  }
  try {
    const message = await twilio(accountSid, authToken).messages.create({
      to,
      messagingServiceSid,
      body,
      scheduleType: "fixed",
      sendAt,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
      ...(statusCallback ? { statusCallback } : {}),
    });
    return { sent: true as const, id: message.sid };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Twilio rejected the scheduled message.";
    return { sent: false as const, error: detail };
  }
}
