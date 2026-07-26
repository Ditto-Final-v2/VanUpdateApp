import "server-only";

interface JournalNotificationEmailInput {
  subscriber: {
    email: string;
    name: string | null;
    unsubscribeToken: string;
  };
  post: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    notificationTitle: string | null;
    tripDay: number;
    entryDate: string;
    locationName: string;
    hasCoverImage: boolean;
  };
  siteUrl: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatEntryDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  }).format(date);
}

export function buildJournalNotificationEmail({
  subscriber,
  post,
  siteUrl,
}: JournalNotificationEmailInput) {
  const entryUrl = `${siteUrl}/journal/${encodeURIComponent(post.slug)}`;
  const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;
  const oneClickUnsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;
  const coverUrl = `${siteUrl}/api/mms/${post.id}`;
  const greetingName = subscriber.name?.trim() || "road friend";
  const hook = post.notificationTitle?.trim() || post.title;
  const dayLabel = `DAY ${String(post.tripDay).padStart(2, "0")}`;
  const filenameDay = String(post.tripDay).padStart(2, "0");

  const safe = {
    email: escapeHtml(subscriber.email),
    greetingName: escapeHtml(greetingName),
    title: escapeHtml(post.title),
    excerpt: escapeHtml(post.excerpt),
    hook: escapeHtml(hook),
    location: escapeHtml(post.locationName),
    entryDate: escapeHtml(formatEntryDate(post.entryDate)),
    entryUrl: escapeHtml(entryUrl),
    unsubscribeUrl: escapeHtml(unsubscribeUrl),
    coverUrl: escapeHtml(coverUrl),
  };

  const coverImage = post.hasCoverImage
    ? `
      <tr>
        <td style="padding:0 20px 18px 20px;background:#fffaf0;">
          <div style="display:block;border:3px ridge #c7beaa;">
            <img src="${safe.coverUrl}" width="594" alt="${safe.title}" style="display:block;width:100%;height:auto;border:0;line-height:100%;outline:none;text-decoration:none;" />
          </div>
          <div style="padding:6px 8px;background:#e9e4d8;color:#4a4740;font-family:'Courier New',Courier,monospace;font-size:11px;text-align:center;">
            IMG_${filenameDay}_COVER.JPG&nbsp; // &nbsp;ATTACHED TO THIS ROAD LOG
          </div>
        </td>
      </tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safe.title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#303a35;color:#182a24;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${safe.hook} — a new Road &amp; Country journal entry is ready.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#303a35;">
      <tr>
        <td align="center" style="padding:24px 10px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;border:3px outset #d9d4c7;background:#fffaf0;box-shadow:8px 8px 0 #17221e;">
            <tr>
              <td style="padding:7px 9px;background:#173f35;color:#ffffff;border-bottom:2px solid #071b15;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="font-family:Verdana,Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:.3px;">
                      [@] road_mail.exe — new journal transmission
                    </td>
                    <td align="right" style="font-family:Arial,sans-serif;font-size:12px;white-space:nowrap;">
                      <span style="display:inline-block;padding:1px 6px;margin-left:3px;background:#d8d4c8;color:#111;border:2px outset #eee;">_</span>
                      <span style="display:inline-block;padding:1px 5px;margin-left:3px;background:#d8d4c8;color:#111;border:2px outset #eee;">&#9633;</span>
                      <span style="display:inline-block;padding:1px 5px;margin-left:3px;background:#d8d4c8;color:#111;border:2px outset #eee;">X</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:15px 18px;background:#f6e9bb;border-bottom:1px solid #b9ad8e;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="2" border="0" style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.3;color:#171b19;">
                  <tr>
                    <td width="72" valign="top" style="font-weight:bold;">To:</td>
                    <td>${safe.greetingName} &lt;${safe.email}&gt;</td>
                  </tr>
                  <tr>
                    <td valign="top" style="font-weight:bold;">From:</td>
                    <td>Road &amp; Country &lt;curtisroadtrip.com&gt;</td>
                  </tr>
                  <tr>
                    <td valign="top" style="font-weight:bold;">Subject:</td>
                    <td>${dayLabel}: ${safe.title}</td>
                  </tr>
                  <tr>
                    <td valign="top" style="font-weight:bold;">Date:</td>
                    <td>${safe.entryDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:9px 18px;background:#fffdf7;border-bottom:2px ridge #d5cebd;color:#4c504d;font-family:Verdana,Arial,sans-serif;font-size:11px;">
                MESSAGE: road_log_day_${filenameDay}.eml&nbsp;&nbsp;|&nbsp;&nbsp;${post.hasCoverImage ? "1 inline photo" : "text only"}&nbsp;&nbsp;|&nbsp;&nbsp;curtisroadtrip.com
              </td>
            </tr>
            <tr>
              <td style="padding:22px 20px 16px 20px;background:#fffaf0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:12px 15px;background:#4a164f;background-image:linear-gradient(90deg,#4a164f,#9b356d);border:2px solid #2e0b31;color:#fff9e8;font-family:'Courier New',Courier,monospace;">
                      <div style="font-size:11px;font-weight:bold;letter-spacing:1.4px;color:#ffd2e8;">${dayLabel} // INBOX_TRANSMISSION</div>
                      <div style="padding-top:6px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;line-height:1.25;">${safe.hook}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${coverImage}
            <tr>
              <td style="padding:4px 26px 28px 26px;background:#fffaf0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.55;color:#232622;">
                <p style="margin:0 0 16px 0;">Dear ${safe.greetingName},</p>
                <p style="margin:0 0 16px 0;">A new dispatch from the road has landed in your inbox.</p>
                <h1 style="margin:0 0 7px 0;color:#173f35;font-family:Georgia,'Times New Roman',serif;font-size:29px;line-height:1.15;">${safe.title}</h1>
                <p style="margin:0 0 18px 0;color:#6b4d2d;font-family:'Courier New',Courier,monospace;font-size:12px;font-weight:bold;">
                  LOCATION: ${safe.location}&nbsp;&nbsp;|&nbsp;&nbsp;LOGGED: ${safe.entryDate}
                </p>
                <p style="margin:0 0 23px 0;">${safe.excerpt}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background:#173f35;border:3px outset #3f675d;">
                      <a href="${safe.entryUrl}" style="display:inline-block;padding:11px 18px;color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:bold;text-decoration:none;letter-spacing:.4px;">
                        &gt;&gt; OPEN FULL JOURNAL ENTRY
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 10px;background:#d7d2c6;border-top:2px ridge #f4f1e9;color:#343b37;font-family:'Courier New',Courier,monospace;font-size:10px;">
                STATUS: DELIVERED&nbsp; | &nbsp;CONNECTION: CURTISROADTRIP.COM&nbsp; | &nbsp;MODE: WANDERING
              </td>
            </tr>
          </table>
          <p style="margin:18px auto 0 auto;max-width:620px;color:#d7ddd9;font-family:Arial,sans-serif;font-size:11px;line-height:1.5;text-align:center;">
            You received this because you subscribed to Road &amp; Country updates.<br />
            <a href="${safe.unsubscribeUrl}" style="color:#ffd2e8;text-decoration:underline;">Unsubscribe from journal emails and texts</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${dayLabel}: ${post.title}`,
    "",
    hook,
    "",
    post.excerpt,
    "",
    `${post.locationName} | ${formatEntryDate(post.entryDate)}`,
    `Read the full journal entry: ${entryUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { html, text, oneClickUnsubscribeUrl };
}
