import "server-only";

interface EmailOptions {
  text?: string;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options: EmailOptions = {},
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const replyTo = process.env.RESEND_REPLY_TO_EMAIL;
  if (!apiKey || !from) {
    return { sent: false as const, error: "Email delivery is not configured." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(options.text ? { text: options.text } : {}),
        ...(options.headers ? { headers: options.headers } : {}),
      }),
    });
    if (!response.ok) {
      return {
        sent: false as const,
        error: `Email provider returned ${response.status}.`,
      };
    }
    const data = (await response.json()) as { id?: string };
    return { sent: true as const, id: data.id };
  } catch (error) {
    return {
      sent: false as const,
      error: error instanceof Error ? error.message : "Email delivery failed.",
    };
  }
}
