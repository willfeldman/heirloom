# Architecture

Heirloom is a Next.js App Router app using PostgreSQL, Better Auth, private Vercel Blob storage, and optional OpenAI, Resend, and Twilio integrations.

| Module                                  | Responsibility                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/auth.ts`                       | Email/password authentication, sessions, optional verification and allowlists.    |
| `src/lib/api.ts`                        | Session, collection role, exact-origin, rate-limit, and input-error helpers.      |
| `src/app/api/data/[...path]/route.ts`   | Authenticated collection, story, family, settings, export, and AI operations.     |
| `src/app/api/upload/route.ts`           | Signed direct uploads scoped to a user or active guest recording question.        |
| `src/app/api/media/[id]/route.ts`       | Authorized private media streaming with byte-range support.                       |
| `src/app/api/public/[...path]/route.ts` | Revocable story sharing and atomic one-time guest responses.                      |
| `src/lib/ai.ts`                         | Key selection, transcription, grounded story editing, and transcript persistence. |
| `src/app/api/cron/reminders/route.ts`   | Authenticated, consent-aware reminders and media cleanup.                         |
| `db/001_initial.sql`                    | Repeatable schema, constraints, indexes, and storage-deletion trigger.            |

Owners manage membership, collection/book settings, and reminders. Editors add and edit stories/prompts. Viewers read, listen, vote, and comment. Every server route checks membership; hiding a browser control is never relied on for authorization.

Personal keys are AES-256-GCM encrypted with a domain-separated key derived from `ENCRYPTION_SECRET` or `BETTER_AUTH_SECRET`. Changing that secret makes previous personal keys unreadable. Provider origins are fixed in code; model names cannot configure arbitrary hosts.

The app records an upload intent before issuing a direct Blob upload token and validates the private object before registering media. Delete triggers queue objects for retryable cleanup. Guest media are detached from the source question once saved so prompt cleanup cannot delete story recordings.

This version is designed for small family deployments. Larger installs should add a durable job queue for AI, deployment-wide cost controls, monitoring, backups, pagination, and retention policies.
