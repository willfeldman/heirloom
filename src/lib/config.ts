export function appUrl() {
  return (
    process.env.BETTER_AUTH_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
  ).replace(/\/$/, "");
}
export function trustedOrigins() {
  return [
    ...new Set([
      appUrl(),
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ]),
  ];
}
export const configured = () => Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const smsEnabled = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER,
  );
