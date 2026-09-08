import { head } from "@vercel/blob";
import { z } from "zod";
import { endpoint, sameOrigin, jsonBody, HttpError } from "@/lib/api";
import { uploadIdentity, safePath } from "@/lib/media";
import { query } from "@/lib/db";
import { MAX_MEDIA_SIZE, mediaTypes } from "@/lib/validation";
export const POST = endpoint(async (request) => {
  sameOrigin(request);
  const data = z
    .object({
      pathname: z.string().max(300),
      name: z.string().min(1).max(200),
      guestToken: z.string().max(100).optional(),
    })
    .parse(await jsonBody(request));
  const identity = await uploadIdentity(request, data.guestToken);
  if (!safePath(data.pathname, identity.prefix))
    throw new HttpError(403, "This upload does not belong to you.");
  const blob = await head(data.pathname);
  const mime = blob.contentType.split(";")[0];
  if (
    !mediaTypes[mime] ||
    blob.size > MAX_MEDIA_SIZE ||
    !blob.url.includes(".private.blob.vercel-storage.com/")
  )
    throw new HttpError(
      400,
      "Use a private Blob store and a supported audio, video, or image file under 24 MB.",
    );
  const [item] = await query(
    `INSERT INTO media (user_id,question_id,pathname,name,content_type,size,kind) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(pathname) DO UPDATE SET pathname=EXCLUDED.pathname RETURNING id,name,content_type,size,kind`,
    [
      identity.userId,
      identity.questionId,
      data.pathname,
      data.name,
      mime,
      blob.size,
      mediaTypes[mime],
    ],
  );
  await query("DELETE FROM upload_intents WHERE pathname=$1", [data.pathname]);
  return Response.json(item);
});
