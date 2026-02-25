import "server-only";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(input: {
  headline: string;
  message: string;
  imageUrl: string | null;
  recipientName: string;
}) {
  const safeHeadline = escapeHtml(input.headline);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br/>");
  const safeRecipientName = escapeHtml(input.recipientName || "Customer");
  const imageBlock = input.imageUrl
    ? `<div style="margin-top:20px;"><img src="${escapeHtml(input.imageUrl)}" alt="Promotion" style="width:100%;max-width:640px;border-radius:16px;display:block;border:1px solid #e2e8f0;"/></div>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:18px;border:1px solid #e2e8f0;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#f8fafc;">
                <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#cbd5e1;">Kittisap ATV</div>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${safeHeadline}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;color:#0f172a;">
                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;">สวัสดีคุณ ${safeRecipientName}</p>
                <p style="margin:0;font-size:15px;line-height:1.8;color:#334155;">${safeMessage}</p>
                ${imageBlock}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendBroadcastEmail(input: {
  toEmail: string;
  recipientName: string;
  subject: string;
  headline: string;
  message: string;
  imageUrl: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.BROADCAST_FROM_EMAIL?.trim();
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  if (!from) {
    throw new Error("Missing BROADCAST_FROM_EMAIL");
  }

  const html = renderHtml({
    headline: input.headline,
    message: input.message,
    imageUrl: input.imageUrl,
    recipientName: input.recipientName,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.toEmail],
      subject: input.subject,
      html,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Email provider rejected request (${response.status}): ${payload || "Unknown error"}`);
  }
}
