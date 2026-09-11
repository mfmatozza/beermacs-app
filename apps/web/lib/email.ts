// Transactional email. SERVER-ONLY.
//
// Sends via Resend's HTTP endpoint (no SDK, same reasoning as lib/push.ts:
// one endpoint, one API key, not worth a dependency). Gated on
// RESEND_API_KEY (a Vercel "Sensitive" env var, same treatment as
// BETTER_AUTH_SECRET/DATABASE_URL) because nothing else in this app sends
// email yet — see docs/DECISIONS.md. Without it, this logs the email to the
// server console instead of throwing, so the forgot-password flow this
// exists for stays usable in local dev with zero setup: the reset link
// prints to the terminal running `next dev`.

const RESEND_URL = "https://api.resend.com/emails";

/** Must be a domain verified in the Resend account behind RESEND_API_KEY. */
const FROM = process.env.RESEND_FROM_EMAIL ?? "Beermacs <onboarding@resend.dev>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:dev-fallback] to=${params.to} subject="${params.subject}"\n${params.html}`);
    return;
  }

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: FROM, to: params.to, subject: params.subject, html: params.html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend returned ${res.status}: ${body}`);
  }
}
