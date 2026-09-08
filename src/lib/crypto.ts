import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
function encryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("A stable encryption secret of at least 32 characters is required.");
  return createHash("sha256").update(`heirloom:api-key:v1:${secret}`).digest();
}
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const payload = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${payload.toString("base64url")}`;
}
export function decrypt(value: string) {
  const [version, iv, tag, payload] = value.split(".");
  if (version !== "v1" || !iv || !tag || !payload) throw new Error("Invalid encrypted key.");
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([cipher.update(Buffer.from(payload, "base64url")), cipher.final()]).toString(
    "utf8",
  );
}
export const token = () => randomBytes(32).toString("base64url");
export function secretEquals(a: string, b: string) {
  const first = Buffer.from(a),
    second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
