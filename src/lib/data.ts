import { query } from "./db";
import { bookAccess } from "./api";
export async function storyRows(bookId: string) {
  return query(
    `SELECT s.*, COALESCE((SELECT json_agg(json_build_object('id',m.id,'name',m.name,'kind',m.kind,'size',m.size,'content_type',m.content_type) ORDER BY m.created_at) FROM media m WHERE m.story_id=s.id),'[]') AS media,
    (SELECT COUNT(*)::int FROM comments c WHERE c.story_id=s.id) AS comment_count
    FROM stories s WHERE s.book_id=$1 ORDER BY s.position,s.created_at`,
    [bookId],
  );
}
export async function getState(userId: string, selected?: string | null) {
  const books = await query(
    `SELECT b.id,b.title,b.storyteller,b.cover_color,m.role FROM books b JOIN members m ON m.book_id=b.id WHERE m.user_id=$1 ORDER BY b.created_at`,
    [userId],
  );
  const bookId = selected || books[0]?.id;
  if (!bookId)
    return { books, book: null, stories: [], questions: [], members: [], invitations: [] };
  const book = await bookAccess(bookId, userId);
  const [stories, questions, members, invitations] = await Promise.all([
    storyRows(bookId),
    query(
      `SELECT q.*, (SELECT COUNT(*)::int FROM votes v WHERE v.question_id=q.id) AS votes, EXISTS(SELECT 1 FROM votes v WHERE v.question_id=q.id AND v.user_id=$2) AS voted FROM questions q WHERE q.book_id=$1 ORDER BY q.created_at`,
      [bookId, userId],
    ),
    query(
      `SELECT u.id,u.name,u.email,m.role FROM members m JOIN "user" u ON u.id=m.user_id WHERE m.book_id=$1 ORDER BY m.role,u.name`,
      [bookId],
    ),
    book.role === "owner"
      ? query(
          `SELECT id,role,email,token,expires_at FROM invitations WHERE book_id=$1 AND accepted_at IS NULL AND expires_at>now()`,
          [bookId],
        )
      : [],
  ]);
  if (book.role === "viewer") {
    for (const story of stories) delete story.share_token;
    for (const question of questions) delete question.token;
  }
  return { books, book, stories, questions, members, invitations };
}
