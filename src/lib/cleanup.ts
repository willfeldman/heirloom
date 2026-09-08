import { del } from "@vercel/blob";
import { query } from "./db";
export async function cleanupMedia() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  // Unattached uploads expire after a day; deletions are queued by a database trigger.
  await query("DELETE FROM media WHERE story_id IS NULL AND created_at<now()-interval '1 day'");
  await query(
    "WITH expired AS (DELETE FROM upload_intents WHERE created_at<now()-interval '1 day' RETURNING pathname) INSERT INTO storage_garbage(pathname) SELECT pathname FROM expired WHERE NOT EXISTS(SELECT 1 FROM media WHERE media.pathname=expired.pathname) ON CONFLICT DO NOTHING",
  );
  const items = await query("SELECT pathname FROM storage_garbage ORDER BY created_at LIMIT 100");
  for (const item of items) {
    try {
      await del(item.pathname);
      await query("DELETE FROM storage_garbage WHERE pathname=$1", [item.pathname]);
    } catch {
      /* Retried by the next cron run. */
    }
  }
}
