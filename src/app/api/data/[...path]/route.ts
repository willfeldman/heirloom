import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  endpoint,
  userFrom,
  bookAccess,
  sameOrigin,
  jsonBody,
  HttpError,
  rateLimit,
} from "@/lib/api";
import { query, pool } from "@/lib/db";
import { bookSchema, bookUpdateSchema, storySchema, uuid } from "@/lib/validation";
import { getState } from "@/lib/data";
import { encrypt, token } from "@/lib/crypto";
import { generateStory } from "@/lib/ai";
import { appUrl, mailEnabled, smsEnabled } from "@/lib/config";
export const maxDuration = 300;

const handler = endpoint(async (request) => {
  const url = new URL(request.url),
    parts = url.pathname.split("/").slice(3);
  const [resource, id, action] = parts;
  if (request.method !== "GET") sameOrigin(request);
  const user = await userFrom(request);
  if (request.method === "GET") {
    if (resource === "state")
      return Response.json({
        ...(await getState(user.id, url.searchParams.get("book"))),
        user,
        capabilities: {
          email: mailEnabled(),
          sms: smsEnabled(),
          storage: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        },
      });
    if (resource === "settings") {
      const [settings] = await query(
        "SELECT openai_key IS NOT NULL AS has_key,text_model,transcription_model FROM user_settings WHERE user_id=$1",
        [user.id],
      );
      return Response.json({
        has_key: settings?.has_key || false,
        server_key: Boolean(process.env.OPENAI_API_KEY),
        text_model: settings?.text_model || process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini",
        transcription_model:
          settings?.transcription_model ||
          process.env.OPENAI_TRANSCRIPTION_MODEL ||
          "gpt-4o-mini-transcribe",
        email: mailEnabled(),
      });
    }
    if (resource === "comments") {
      uuid.parse(id);
      const [story] = await query("SELECT book_id FROM stories WHERE id=$1", [id]);
      if (!story) throw new HttpError(404, "Story not found.");
      await bookAccess(story.book_id, user.id);
      return Response.json(
        await query(
          `SELECT c.id,c.body,c.created_at,u.name,c.user_id FROM comments c JOIN "user" u ON u.id=c.user_id WHERE c.story_id=$1 ORDER BY c.created_at`,
          [id],
        ),
      );
    }
    if (resource === "export") {
      uuid.parse(id);
      const state = await getState(user.id, id);
      // Capabilities stay out of portable exports. Media are downloaded separately through authenticated routes.
      const stories = state.stories.map(({ share_token, ai_started_at, ...story }) => {
        void share_token;
        void ai_started_at;
        return story;
      });
      return Response.json(
        {
          format: "heirloom-v1",
          exported_at: new Date().toISOString(),
          book: {
            title: state.book!.title,
            storyteller: state.book!.storyteller,
            subtitle: state.book!.subtitle,
            dedication: state.book!.dedication,
            cover_color: state.book!.cover_color,
          },
          stories,
        },
        { headers: { "Content-Disposition": `attachment; filename="heirloom-stories.json"` } },
      );
    }
    throw new HttpError(404, "Not found.");
  }
  await rateLimit(`write:${user.id}`, 300);
  if (resource === "settings" && request.method === "PATCH") {
    const data = z
      .object({
        key: z.string().trim().min(10).max(500).optional(),
        remove_key: z.boolean().optional(),
        text_model: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/),
        transcription_model: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/),
      })
      .parse(await jsonBody(request));
    await query(
      `INSERT INTO user_settings (user_id,openai_key,text_model,transcription_model) VALUES ($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET openai_key=CASE WHEN $5 THEN NULL WHEN $2::text IS NOT NULL THEN $2 ELSE user_settings.openai_key END,text_model=$3,transcription_model=$4`,
      [
        user.id,
        data.key ? encrypt(data.key) : null,
        data.text_model,
        data.transcription_model,
        data.remove_key || false,
      ],
    );
    return Response.json({ ok: true });
  }
  if (resource === "books") {
    if (request.method === "POST" && !id) {
      const data = bookSchema.parse(await jsonBody(request));
      const bookId = randomUUID(),
        client = await pool().connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO books (id,owner_id,title,storyteller) VALUES ($1,$2,$3,$4)",
          [bookId, user.id, data.title, data.storyteller],
        );
        await client.query("INSERT INTO members (book_id,user_id,role) VALUES ($1,$2,'owner')", [
          bookId,
          user.id,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return Response.json({ id: bookId }, { status: 201 });
    }
    uuid.parse(id);
    await bookAccess(id, user.id, true, true);
    if (request.method === "PATCH") {
      const data = bookUpdateSchema.parse(await jsonBody(request));
      const entries = Object.entries(data);
      if (entries.length)
        await query(
          `UPDATE books SET ${entries.map(([key], i) => `${key}=$${i + 2}`).join(",")} WHERE id=$1`,
          [id, ...entries.map(([, v]) => v)],
        );
      return Response.json({ ok: true });
    }
    if (request.method === "DELETE") {
      await query(
        `WITH removed AS (DELETE FROM books WHERE id=$1 RETURNING id) SELECT id FROM removed`,
        [id],
      );
      return Response.json({ ok: true });
    }
  }
  if (resource === "stories") {
    if (request.method === "POST" && !id) {
      const data = storySchema.extend({ book_id: uuid }).parse(await jsonBody(request));
      await bookAccess(data.book_id, user.id, true);
      const [story] = await query(
        `INSERT INTO stories (book_id,author_id,title,prompt,body,transcript,storyteller,style,status,position) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,(SELECT COALESCE(MAX(position),-1)+1 FROM stories WHERE book_id=$1)) RETURNING id`,
        [
          data.book_id,
          user.id,
          data.title,
          data.prompt,
          data.body,
          data.transcript,
          data.storyteller,
          data.style,
          data.status,
        ],
      );
      return Response.json(story, { status: 201 });
    }
    uuid.parse(id);
    const [story] = await query("SELECT * FROM stories WHERE id=$1", [id]);
    if (!story) throw new HttpError(404, "Story not found.");
    await bookAccess(story.book_id, user.id, true);
    if (action === "generate" && request.method === "POST") {
      await rateLimit(`ai:${user.id}`, 20);
      const [locked] = await query(
        "UPDATE stories SET ai_started_at=now() WHERE id=$1 AND (ai_started_at IS NULL OR ai_started_at<now()-interval '6 minutes') RETURNING *",
        [id],
      );
      if (!locked)
        throw new HttpError(
          409,
          "This story is already being processed. Please wait a few minutes.",
        );
      try {
        const result = await generateStory(story, user.id);
        await query("UPDATE stories SET body=$2,transcript=$3,updated_at=now() WHERE id=$1", [
          id,
          result.body,
          result.transcript,
        ]);
        return Response.json(result);
      } finally {
        await query("UPDATE stories SET ai_started_at=NULL WHERE id=$1", [id]);
      }
    }
    if (action === "share" && request.method === "POST") {
      const { enabled } = z.object({ enabled: z.boolean() }).parse(await jsonBody(request));
      const shareToken = enabled ? story.share_token || token() : null;
      await query("UPDATE stories SET share_token=$2 WHERE id=$1", [id, shareToken]);
      return Response.json({
        url: shareToken ? `${appUrl()}/s/${shareToken}` : null,
        token: shareToken,
      });
    }
    if (request.method === "PATCH" && !action) {
      if (story.ai_started_at && new Date(story.ai_started_at).getTime() > Date.now() - 360_000)
        throw new HttpError(409, "Wait for story generation to finish before editing.");
      const data = storySchema.parse(await jsonBody(request)),
        client = await pool().connect();
      try {
        await client.query("BEGIN");
        const current = (
          await client.query("SELECT ai_started_at FROM stories WHERE id=$1 FOR UPDATE", [id])
        ).rows[0];
        if (!current) throw new HttpError(404, "Story not found.");
        if (
          current.ai_started_at &&
          new Date(current.ai_started_at).getTime() > Date.now() - 360_000
        )
          throw new HttpError(409, "Wait for story generation to finish before editing.");
        if (data.media_ids.length) {
          const media = (
            await client.query(
              "SELECT id FROM media WHERE id=ANY($1::uuid[]) AND (user_id=$2 OR story_id=$3) AND (story_id IS NULL OR story_id=$3) FOR UPDATE",
              [data.media_ids, user.id, id],
            )
          ).rows;
          if (media.length !== data.media_ids.length)
            throw new HttpError(400, "One or more attachments are unavailable.");
        }
        await client.query(
          "UPDATE stories SET title=$2,prompt=$3,body=$4,transcript=$5,storyteller=$6,style=$7,status=$8,updated_at=now() WHERE id=$1",
          [
            id,
            data.title,
            data.prompt,
            data.body,
            data.transcript,
            data.storyteller,
            data.style,
            data.status,
          ],
        );
        await client.query(
          "UPDATE media SET story_id=NULL WHERE story_id=$1 AND NOT(id=ANY($2::uuid[]))",
          [id, data.media_ids],
        );
        await client.query("UPDATE media SET story_id=$1 WHERE id=ANY($2::uuid[])", [
          id,
          data.media_ids,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return Response.json({ ok: true });
    }
    if (request.method === "DELETE") {
      await query("DELETE FROM stories WHERE id=$1", [id]);
      return Response.json({ ok: true });
    }
  }
  if (resource === "reorder" && request.method === "POST") {
    uuid.parse(id);
    await bookAccess(id, user.id, true);
    const { ids } = z.object({ ids: z.array(uuid).max(1000) }).parse(await jsonBody(request));
    if (new Set(ids).size !== ids.length) throw new HttpError(400, "Duplicate chapter IDs.");
    await query(
      "UPDATE stories s SET position=p.ordinality::int-1 FROM unnest($2::uuid[]) WITH ORDINALITY p(id,ordinality) WHERE s.id=p.id AND s.book_id=$1",
      [id, ids],
    );
    return Response.json({ ok: true });
  }
  if (resource === "questions") {
    if (request.method === "POST" && !id) {
      const data = z
        .object({
          book_id: uuid,
          text: z.string().trim().min(3).max(1000),
          category: z.string().max(100).default("Your questions"),
        })
        .parse(await jsonBody(request));
      await bookAccess(data.book_id, user.id, true);
      const [question] = await query(
        "INSERT INTO questions (book_id,text,category,added_by,token) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [data.book_id, data.text, data.category, user.id, token()],
      );
      return Response.json(question, { status: 201 });
    }
    uuid.parse(id);
    const [question] = await query("SELECT * FROM questions WHERE id=$1", [id]);
    if (!question) throw new HttpError(404, "Question not found.");
    await bookAccess(question.book_id, user.id, action !== "vote");
    if (action === "vote" && request.method === "POST") {
      const { voted } = z.object({ voted: z.boolean() }).parse(await jsonBody(request));
      if (voted)
        await query(
          "INSERT INTO votes (question_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
          [id, user.id],
        );
      else await query("DELETE FROM votes WHERE question_id=$1 AND user_id=$2", [id, user.id]);
      return Response.json({ ok: true });
    }
    if (action === "link" && request.method === "POST") {
      if (question.status === "answered")
        throw new HttpError(
          400,
          "This question has already been answered. Add it again for another recording.",
        );
      const linkToken = token();
      await query("UPDATE questions SET token=$2,expires_at=now()+interval '90 days' WHERE id=$1", [
        id,
        linkToken,
      ]);
      return Response.json({ url: `${appUrl()}/record/${linkToken}` });
    }
    if (request.method === "DELETE") {
      await query("DELETE FROM questions WHERE id=$1", [id]);
      return Response.json({ ok: true });
    }
  }
  if (resource === "invitations") {
    if (request.method === "POST" && !id) {
      const data = z
        .object({
          book_id: uuid,
          role: z.enum(["editor", "viewer"]),
          email: z.union([z.email(), z.literal("")]).optional(),
        })
        .parse(await jsonBody(request));
      await bookAccess(data.book_id, user.id, true, true);
      const inviteToken = token();
      await query("INSERT INTO invitations (book_id,role,email,token) VALUES ($1,$2,$3,$4)", [
        data.book_id,
        data.role,
        data.email?.toLowerCase() || null,
        inviteToken,
      ]);
      return Response.json({ url: `${appUrl()}/invite/${inviteToken}` });
    }
    if (action === "accept" && request.method === "POST") {
      z.string().min(40).max(100).parse(id);
      const client = await pool().connect();
      try {
        await client.query("BEGIN");
        const invite = (
          await client.query(
            "SELECT * FROM invitations WHERE token=$1 AND accepted_at IS NULL AND expires_at>now() FOR UPDATE",
            [id],
          )
        ).rows[0];
        if (!invite) throw new HttpError(404, "This invitation has expired or already been used.");
        if (invite.email && invite.email !== user.email.toLowerCase())
          throw new HttpError(
            403,
            `Sign in with the email address this invitation was created for.`,
          );
        if (invite.email && !user.emailVerified)
          throw new HttpError(
            403,
            "Verify your email before accepting an invitation restricted to that address. The deployment must have email configured.",
          );
        await client.query(
          "INSERT INTO members (book_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
          [invite.book_id, user.id, invite.role],
        );
        await client.query("UPDATE invitations SET accepted_at=now() WHERE id=$1", [invite.id]);
        await client.query("COMMIT");
        return Response.json({ book_id: invite.book_id });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    if (request.method === "DELETE") {
      uuid.parse(id);
      const [invite] = await query("SELECT book_id FROM invitations WHERE id=$1", [id]);
      if (!invite) throw new HttpError(404, "Invitation not found.");
      await bookAccess(invite.book_id, user.id, true, true);
      await query("DELETE FROM invitations WHERE id=$1", [id]);
      return Response.json({ ok: true });
    }
  }
  if (resource === "members" && request.method === "DELETE") {
    const { book_id, user_id } = z
      .object({ book_id: uuid, user_id: z.string().min(1).max(100) })
      .parse(await jsonBody(request));
    await bookAccess(book_id, user.id, true, true);
    await query("DELETE FROM members WHERE book_id=$1 AND user_id=$2 AND role!='owner'", [
      book_id,
      user_id,
    ]);
    return Response.json({ ok: true });
  }
  if (resource === "comments" && request.method === "POST") {
    uuid.parse(id);
    const { body } = z
      .object({ body: z.string().trim().min(1).max(5000) })
      .parse(await jsonBody(request));
    const [story] = await query("SELECT book_id FROM stories WHERE id=$1", [id]);
    if (!story) throw new HttpError(404, "Story not found.");
    await bookAccess(story.book_id, user.id);
    await query("INSERT INTO comments (story_id,user_id,body) VALUES ($1,$2,$3)", [
      id,
      user.id,
      body,
    ]);
    return Response.json({ ok: true });
  }
  throw new HttpError(404, "Not found.");
});
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
