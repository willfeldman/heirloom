import { ZodError } from "zod";
import { getAuth } from "./auth";
import { configured, trustedOrigins } from "./config";
import { query } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function userFrom(request: Request) {
  if (!configured()) throw new HttpError(503, "Finish deployment setup before signing in.");
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "Please sign in to continue.");
  return session.user;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !trustedOrigins().includes(origin))
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function jsonBody(request: Request) {
  const text = await request.text();
  if (text.length > 250_000) throw new HttpError(413, "This request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export async function bookAccess(bookId: string, userId: string, write = false, owner = false) {
  const [book] = await query(
    `SELECT b.*, m.role FROM books b JOIN members m ON m.book_id=b.id WHERE b.id=$1 AND m.user_id=$2`,
    [bookId, userId],
  );
  if (!book || (write && book.role === "viewer") || (owner && book.role !== "owner"))
    throw new HttpError(404, "This collection is unavailable.");
  return book;
}
export async function rateLimit(key: string, limit = 30) {
  const [result] = await query(
    `INSERT INTO action_limits (key,bucket,count) VALUES ($1,date_trunc('hour',now()),1) ON CONFLICT(key,bucket) DO UPDATE SET count=action_limits.count+1 RETURNING count`,
    [key],
  );
  if (result.count > limit)
    throw new HttpError(
      429,
      "Please try again in an hour. This action has reached its hourly limit.",
    );
}
export function endpoint(handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof HttpError)
        return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof ZodError)
        return Response.json(
          { error: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
          { status: 400 },
        );
      console.error(
        "Heirloom request failed",
        error instanceof Error ? error.name : "UnknownError",
      );
      return Response.json(
        {
          error:
            "Something went wrong. Please try again. If it continues, check your deployment configuration.",
        },
        { status: 500 },
      );
    }
  };
}
