import { z } from "zod";
export const uuid = z.uuid();
export const bookSchema = z.object({
  title: z.string().trim().min(1).max(150),
  storyteller: z.string().trim().min(1).max(100),
});
export const bookUpdateSchema = bookSchema.partial().extend({
  subtitle: z.string().max(200).optional(),
  dedication: z.string().max(5000).optional(),
  cover_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  recipient_email: z.union([z.email(), z.literal("")]).optional(),
  phone: z.union([z.string().regex(/^\+[1-9]\d{7,14}$/), z.literal("")]).optional(),
  email_opt_in: z.boolean().optional(),
  sms_opt_in: z.boolean().optional(),
  reminder_day: z.number().int().min(0).max(6).optional(),
  reminder_enabled: z.boolean().optional(),
});
export const storySchema = z.object({
  title: z.string().trim().min(1).max(200),
  prompt: z.string().max(1000).default(""),
  body: z.string().max(100_000).default(""),
  transcript: z.string().max(100_000).default(""),
  storyteller: z.string().trim().min(1).max(100),
  style: z.enum(["first-person", "third-person", "transcript"]).default("first-person"),
  status: z.enum(["draft", "published"]).default("draft"),
  media_ids: z.array(uuid).max(20).default([]),
});
export const mediaTypes: Record<string, "audio" | "video" | "photo"> = {
  "audio/webm": "audio",
  "audio/mp4": "audio",
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/wav": "audio",
  "audio/x-wav": "audio",
  "audio/ogg": "audio",
  "audio/flac": "audio",
  "audio/x-m4a": "audio",
  "video/webm": "video",
  "video/mp4": "video",
  "image/jpeg": "photo",
  "image/png": "photo",
  "image/webp": "photo",
  "image/gif": "photo",
};
export const MAX_MEDIA_SIZE = 24 * 1024 * 1024;
export function canWrite(role: string) {
  return role === "owner" || role === "editor";
}
