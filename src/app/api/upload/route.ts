import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { endpoint, sameOrigin, rateLimit, HttpError } from "@/lib/api";
import { uploadIdentity, safePath } from "@/lib/media";
import { MAX_MEDIA_SIZE, mediaTypes } from "@/lib/validation";
import { query } from "@/lib/db";
export const POST = endpoint(async (request) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new HttpError(
      503,
      "Connect a private Vercel Blob store to upload recordings and photos.",
    );
  const body = (await request.json()) as HandleUploadBody;
  const result = await handleUpload({
    request,
    body,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      sameOrigin(request);
      let guestToken: string | undefined;
      if (clientPayload) {
        try {
          guestToken = JSON.parse(clientPayload).guestToken;
        } catch {
          throw new HttpError(400, "Invalid upload request.");
        }
      }
      const identity = await uploadIdentity(request, guestToken);
      if (!safePath(pathname, identity.prefix))
        throw new HttpError(403, "Invalid upload destination.");
      await rateLimit(`upload:${identity.userId || identity.questionId}`, 40);
      await query("INSERT INTO upload_intents(pathname) VALUES ($1) ON CONFLICT DO NOTHING", [
        pathname,
      ]);
      return {
        allowedContentTypes: Object.keys(mediaTypes),
        maximumSizeInBytes: MAX_MEDIA_SIZE,
        addRandomSuffix: false,
        allowOverwrite: false,
        validUntil: Date.now() + 15 * 60_000,
      };
    },
    onUploadCompleted: async () => {
      /* The authenticated /api/media/complete endpoint registers and validates the private object. */
    },
  });
  return Response.json(result);
});
