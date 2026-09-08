import { endpoint, HttpError } from "@/lib/api";
import { query } from "@/lib/db";
import { appUrl, mailEnabled, smsEnabled } from "@/lib/config";
import { secretEquals } from "@/lib/crypto";
import { sendEmail, sendSMS } from "@/lib/mail";
import { cleanupMedia } from "@/lib/cleanup";
export const maxDuration = 300;
export const GET = endpoint(async (request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !secretEquals(request.headers.get("authorization") || "", `Bearer ${secret}`))
    throw new HttpError(401, "Unauthorized.");
  await cleanupMedia();
  await query("DELETE FROM action_limits WHERE bucket<now()-interval '2 days'");
  const books = await query(
    "SELECT * FROM books WHERE reminder_enabled=true AND reminder_day=EXTRACT(DOW FROM now() AT TIME ZONE 'UTC')::int ORDER BY created_at LIMIT 100",
  );
  let sent = 0,
    failed = 0;
  for (const book of books) {
    const email = mailEnabled() && book.email_opt_in && book.recipient_email;
    const sms = smsEnabled() && book.sms_opt_in && book.phone;
    if (!email && !sms) continue;
    const day = new Date().toISOString().slice(0, 10);
    const [delivery] = await query(
      `INSERT INTO reminder_deliveries (book_id,day,locked_until) VALUES ($1,$2,now()+interval '6 minutes') ON CONFLICT(book_id,day) DO UPDATE SET locked_until=now()+interval '6 minutes' WHERE reminder_deliveries.completed=false AND reminder_deliveries.locked_until<now() RETURNING *`,
      [book.id, day],
    );
    if (!delivery) continue;
    try {
      const [question] = delivery.question_id
        ? await query(
            "SELECT * FROM questions WHERE id=$1 AND status!='answered' AND expires_at>now()",
            [delivery.question_id],
          )
        : await query(
            `SELECT q.* FROM questions q WHERE q.book_id=$1 AND q.status='queued' AND q.expires_at>now() ORDER BY (SELECT count(*) FROM votes v WHERE v.question_id=q.id) DESC,q.created_at LIMIT 1`,
            [book.id],
          );
      if (!question) {
        await query("UPDATE reminder_deliveries SET completed=true WHERE book_id=$1 AND day=$2", [
          book.id,
          day,
        ]);
        continue;
      }
      await query("UPDATE reminder_deliveries SET question_id=$3 WHERE book_id=$1 AND day=$2", [
        book.id,
        day,
        question.id,
      ]);
      const link = `${appUrl()}/record/${question.token}`;
      if (email && !delivery.email_sent) {
        await sendEmail(
          book.recipient_email,
          `A question for ${book.storyteller}`,
          `Take a moment to remember…\n\n${question.text}\n\nRecord your memory here (no login needed):\n${link}\n\nYour family can pause these prompts in Heirloom's collection settings.`,
          `prompt-${book.id}-${day}`,
        );
        await query("UPDATE reminder_deliveries SET email_sent=true WHERE book_id=$1 AND day=$2", [
          book.id,
          day,
        ]);
      }
      if (sms && !delivery.sms_sent) {
        // Mark before sending: Twilio lacks this endpoint's idempotency guarantee. Prefer a missed SMS to a duplicate.
        await query("UPDATE reminder_deliveries SET sms_sent=true WHERE book_id=$1 AND day=$2", [
          book.id,
          day,
        ]);
        await sendSMS(
          book.phone,
          `Heirloom: ${question.text.slice(0, 250)}\nRecord: ${link}\nReply STOP to opt out.`,
        );
      }
      await query(
        "UPDATE questions SET status='sent',sent_at=now() WHERE id=$1 AND status='queued'",
        [question.id],
      );
      await query("UPDATE reminder_deliveries SET completed=true WHERE book_id=$1 AND day=$2", [
        book.id,
        day,
      ]);
      sent++;
    } catch {
      failed++;
      await query("UPDATE reminder_deliveries SET locked_until=now() WHERE book_id=$1 AND day=$2", [
        book.id,
        day,
      ]);
    }
  }
  return Response.json({ sent, failed });
});
