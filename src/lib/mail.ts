import { mailEnabled, smsEnabled } from "./config";
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  idempotencyKey?: string,
) {
  if (!mailEnabled()) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error("Email delivery failed. Check your email provider configuration.");
}
export async function sendSMS(to: string, body: string) {
  if (!smsEnabled()) throw new Error("SMS delivery is not configured.");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM_NUMBER!, Body: body }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) throw new Error("SMS delivery failed.");
}
