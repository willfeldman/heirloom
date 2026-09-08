import { get } from "@vercel/blob";
import { query } from "@/lib/db";
import { endpoint, userFrom, bookAccess, HttpError } from "@/lib/api";
import { uuid } from "@/lib/validation";
export const GET = endpoint(async (request) => {
  const url = new URL(request.url),
    id = url.pathname.split("/").at(-1);
  uuid.parse(id);
  const [item] = await query(
    "SELECT m.*,s.book_id,s.share_token FROM media m LEFT JOIN stories s ON s.id=m.story_id WHERE m.id=$1",
    [id],
  );
  if (!item) throw new HttpError(404, "Media not found.");
  const share = url.searchParams.get("share");
  if (!(share && item.share_token && share === item.share_token)) {
    const user = await userFrom(request);
    if (item.story_id) await bookAccess(item.book_id, user.id);
    else if (item.user_id !== user.id) throw new HttpError(404, "Media not found.");
  }
  const range = request.headers.get("range");
  if (range && !/^bytes=\d*-\d*$/.test(range)) throw new HttpError(416, "Unsupported range.");
  if (range) {
    const [start, end] = range.slice(6).split("-");
    if (
      (!start && !end) ||
      (start && Number(start) >= item.size) ||
      (start && end && Number(start) > Number(end))
    )
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${item.size}` },
      });
  }
  const blob = await get(item.pathname, {
    access: "private",
    ...(range ? { headers: { Range: range } } : {}),
  });
  if (!blob || blob.statusCode !== 200) throw new HttpError(404, "Media not found.");
  const name = item.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const contentRange = blob.headers.get("content-range");
  return new Response(blob.stream, {
    status: contentRange ? 206 : 200,
    headers: {
      "Content-Type": item.content_type,
      "Content-Disposition": `${url.searchParams.has("download") ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      ...(contentRange ? { "Content-Range": contentRange } : {}),
      ...(blob.headers.get("content-length")
        ? { "Content-Length": blob.headers.get("content-length")! }
        : {}),
    },
  });
});
