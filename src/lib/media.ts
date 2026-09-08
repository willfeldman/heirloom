import { query } from "./db";
import { userFrom, HttpError } from "./api";
export async function uploadIdentity(request: Request, guestToken?: string) {
  if (guestToken) {
    const [question] = await query(
      "SELECT id,book_id FROM questions WHERE token=$1 AND expires_at>now() AND status!='answered'",
      [guestToken],
    );
    if (!question)
      throw new HttpError(404, "This recording link is unavailable or has already been used.");
    return { prefix: `guest/${question.id}/`, userId: null, questionId: question.id as string };
  }
  const user = await userFrom(request);
  return { prefix: `user/${user.id}/`, userId: user.id, questionId: null };
}
export function safePath(path: string, prefix: string) {
  return (
    path.startsWith(prefix) &&
    /^[a-zA-Z0-9/_\-.]+$/.test(path) &&
    !path.includes("..") &&
    path.length < 300
  );
}
