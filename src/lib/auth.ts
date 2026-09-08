import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { pool } from "./db";
import { appUrl, configured, mailEnabled, trustedOrigins } from "./config";
import { sendEmail } from "./mail";
function createAuth() {
  return betterAuth({
    appName: "Heirloom",
    baseURL: appUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(),
    database: pool(),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      requireEmailVerification: mailEnabled(),
      revokeSessionsOnPasswordReset: true,
      ...(mailEnabled()
        ? {
            sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
              await sendEmail(
                user.email,
                "Reset your Heirloom password",
                `Reset your password using this link:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
              );
            },
          }
        : {}),
    },
    ...(mailEnabled()
      ? {
          emailVerification: {
            sendOnSignUp: true,
            autoSignInAfterVerification: true,
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }) => {
              await sendEmail(
                user.email,
                "Welcome to Heirloom",
                `Verify your email to start saving your stories:\n\n${url}`,
              );
            },
          },
        }
      : {}),
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const allowed = (process.env.ALLOWED_EMAILS || "")
              .split(",")
              .map((e) => e.trim().toLowerCase())
              .filter(Boolean);
            if (allowed.length && !allowed.includes(user.email.toLowerCase()))
              throw new APIError("FORBIDDEN", {
                message: "This email is not on this deployment's signup list.",
              });
            return { data: user };
          },
        },
      },
    },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!configured())
    throw new Error("Authentication is not configured. Follow the deployment guide.");
  return (instance ??= createAuth());
}
