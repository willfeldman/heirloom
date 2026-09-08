import { z } from "zod";
import { endpoint, sameOrigin, jsonBody, HttpError, rateLimit } from "@/lib/api";
import { query, pool } from "@/lib/db";
import { uuid } from "@/lib/validation";
import { randomUUID } from "node:crypto";
const handler = endpoint(async (request) => {
  const [resource, linkToken] = new URL(request.url).pathname.split("/").slice(3);
  z.string().min(40).max(100).parse(linkToken);
  if (resource === "story" && request.method === "GET") {
    const [story] = await query(
      `SELECT s.id,s.title,s.body,s.prompt,s.storyteller,s.created_at,s.transcript,COALESCE((SELECT json_agg(json_build_object('id',m.id,'name',m.name,'kind',m.kind,'size',m.size,'content_type',m.content_type)) FROM media m WHERE m.story_id=s.id),'[]') AS media FROM stories s WHERE s.share_token=$1`,
      [linkToken],
    );
    if (!story) throw new HttpError(404, "This story link is unavailable.");
    return Response.json(story, { headers: { "Cache-Control": "no-store" } });
  }
  if (resource === "record") {
    const [question] = await query(
      "SELECT q.id,q.text,b.storyteller FROM questions q JOIN books b ON b.id=q.book_id WHERE q.token=$1 AND q.expires_at>now() AND q.status!='answered'",
      [linkToken],
    );
    if (!question)
      throw new HttpError(404, "This recording link has expired or has already been used.");
    if (request.method === "GET")
      return Response.json(question, { headers: { "Cache-Control": "no-store" } });
    sameOrigin(request);
    await rateLimit(`record:${question.id}`, 10);
    const data = z
      .object({
        title: z.string().trim().min(1).max(200),
        body: z.string().max(100_000).default(""),
        media_ids: z.array(uuid).max(20).default([]),
      })
      .parse(await jsonBody(request));
    if (!data.body.trim() && !data.media_ids.length)
      throw new HttpError(400, "Add a recording or write a memory first.");
    const client = await pool().connect(),
      storyId = randomUUID();
    try {
      await client.query("BEGIN");
      const active = (
        await client.query(
          "SELECT q.*,b.storyteller FROM questions q JOIN books b ON b.id=q.book_id WHERE q.id=$1 AND q.token=$2 AND q.expires_at>now() AND q.status!='answered' FOR UPDATE OF q",
          [question.id, linkToken],
        )
      ).rows[0];
      if (!active) throw new HttpError(409, "This question has already been answered.");
      const items = (
        await client.query(
          "SELECT id FROM media WHERE id=ANY($1::uuid[]) AND question_id=$2 AND story_id IS NULL FOR UPDATE",
          [data.media_ids, question.id],
        )
      ).rows;
      if (items.length !== data.media_ids.length)
        throw new HttpError(400, "Some attachments are unavailable.");
      await client.query(
        "INSERT INTO stories (id,book_id,title,prompt,body,transcript,storyteller,position) VALUES ($1,$2,$3,$4,$5,$5,$6,(SELECT COALESCE(MAX(position),-1)+1 FROM stories WHERE book_id=$2))",
        [storyId, active.book_id, data.title, active.text, data.body, active.storyteller],
      );
      // Detach from the one-time question: deleting a prompt must not delete a saved recording.
      await client.query("UPDATE media SET story_id=$1,question_id=NULL WHERE id=ANY($2::uuid[])", [
        storyId,
        data.media_ids,
      ]);
      await client.query("UPDATE questions SET status='answered',story_id=$2 WHERE id=$1", [
        question.id,
        storyId,
      ]);
      await client.query("COMMIT");
      return Response.json({ ok: true });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  throw new HttpError(404, "Not found.");
});
export { handler as GET, handler as POST };
