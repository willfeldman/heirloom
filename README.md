# Heirloom

An open-source home for family memories: choose a question, record a voice, write an editable story, and print a keepsake book with optional QR links to the original recordings.

Run it on your own account. Bring your own database, private media storage, and AI keys.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwillfeldman%2Fheirloom&project-name=heirloom&repository-name=heirloom&env=DATABASE_URL%2CBETTER_AUTH_SECRET%2CBLOB_READ_WRITE_TOKEN&envDescription=Connect%20PostgreSQL%2C%20a%20random%2032%2B%20character%20auth%20secret%2C%20and%20a%20PRIVATE%20Vercel%20Blob%20store.&envLink=https%3A%2F%2Fgithub.com%2Fwillfeldman%2Fheirloom%23deploy-to-vercel)

## Features

- Email/password accounts with Better Auth, secure sessions, optional email verification, password reset, and signup allowlists.
- Owner, editor, and viewer roles; single-use family invitations; comments; and prompt voting.
- 96 original memory prompts plus custom questions.
- Browser voice/video recording, uploads, private media playback, guest recording links, and photos.
- Optional OpenAI transcription and grounded memoir editing with encrypted per-user keys.
- Private, revocable story links and printable book pages with optional QR codes.
- Optional weekly email prompts through Resend and SMS prompts through Twilio.
- JSON export of written stories and transcripts.

Heirloom is an independent implementation with original code, branding, copy, prompts, and illustrations. It is not affiliated with Remento and includes no Remento code or assets.

## Deploy to Vercel

The deploy button clones this public repository into your GitHub account and opens Vercel's setup form. Create these first:

| Variable                | Setup                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | A PostgreSQL 14+ connection string, for example from Neon. Use a dedicated database.                              |
| `BETTER_AUTH_SECRET`    | Generate with `openssl rand -base64 32`; keep it stable and private.                                              |
| `BLOB_READ_WRITE_TOKEN` | Create a **Private** Vercel Blob store and use its read/write token. Public stores are intentionally unsupported. |

The Vercel build applies the repeatable schema migration before building the app. After deployment, create an account and add an OpenAI key in **Settings & AI keys**. You can record and write manually without one.

Set `BETTER_AUTH_URL=https://your-domain.example` after adding a custom domain, then redeploy. Use the same canonical domain for sign-in, invitations, reminders, and printed QR codes.

For a private family deployment, set `ALLOWED_EMAILS` to a comma-separated signup allowlist before sharing the app URL.

## Optional reminders

For verification, password reset, and weekly email prompts, configure a verified Resend sender plus:

```dotenv
RESEND_API_KEY=your-resend-key
EMAIL_FROM=Heirloom <stories@your-domain.example>
CRON_SECRET=a-random-secret-of-at-least-32-characters
```

The authenticated Vercel cron runs daily at 14:00 UTC and sends one queued, opted-in prompt for each collection scheduled that day. Vercel Hobby timing can vary within its hour. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` to enable opted-in SMS prompts; use an E.164 phone number and respect STOP requests.

## Local development

Requires Node.js 22+, npm, PostgreSQL 14+, and a private Blob store for media uploads.

```bash
git clone https://github.com/willfeldman/heirloom.git
cd heirloom
npm ci
cp .env.example .env.local
# Add your database URL and a 32+ character auth secret.
npm run db:migrate
npm run dev
```

The homepage and `/demo` work without configuration. Account-backed features display setup instructions until the database and auth secret are present.

## Environment variables

| Variable                                                        | Purpose                                                              |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`                                                  | PostgreSQL connection string.                                        |
| `BETTER_AUTH_SECRET`                                            | Required stable 32+ character auth secret.                           |
| `BETTER_AUTH_URL`                                               | Canonical app URL for localhost or custom domains.                   |
| `BLOB_READ_WRITE_TOKEN`                                         | Private Vercel Blob store token.                                     |
| `ENCRYPTION_SECRET`                                             | Optional separate 32+ character key-encryption secret.               |
| `OPENAI_API_KEY`                                                | Optional deployment-wide fallback key. Users can save their own key. |
| `OPENAI_TEXT_MODEL`                                             | Defaults to `gpt-4.1-mini`.                                          |
| `OPENAI_TRANSCRIPTION_MODEL`                                    | Defaults to `gpt-4o-mini-transcribe`.                                |
| `RESEND_API_KEY`, `EMAIL_FROM`                                  | Optional email delivery.                                             |
| `CRON_SECRET`                                                   | Authenticates reminders and storage cleanup.                         |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Optional SMS delivery.                                               |
| `ALLOWED_EMAILS`                                                | Optional comma-separated signup allowlist.                           |

Never expose any of these through `NEXT_PUBLIC_` variables or commit `.env.local`.

## Data and privacy

Stories, transcripts, comments, and account details live in your PostgreSQL database. Recordings and photos live in your private Blob store. The code has no default analytics or advertising trackers.

When you choose **Generate**, media and/or transcripts are sent to OpenAI using your personal saved key or the deployment key. AI output is editable and should be reviewed. Personal keys are AES-256-GCM encrypted at rest and never returned to the browser, but this is not end-to-end encryption: the deployment operator controls the server secret. Use only deployments you trust.

Share links and printed QR codes grant access to an individual story and attached media until revoked. Guest recording links accept one answer and expire after 90 days. Family invitation links require sign-in, can be used once, and expire after 7 days.

Back up your database, Blob store, and stable auth/encryption secrets. JSON export does not include media; download original recordings and photos from each story. Physical files are removed by the authenticated cleanup cron after database deletion.

## Verify

```bash
npm run format:check
npm test
npm run db:migrate
npm run build
npm run typecheck
# with an isolated local database and npm start already running:
npm run test:integration
```

The integration test creates disposable accounts and collections. It must never point at production; it expects no live provider keys or email verification.

## Limits

- This release creates printable PDFs through the browser. It does not order or ship physical books.
- Files are limited to 24 MB, browser recording stops near 20 minutes, and story generation processes at most three recordings at once.
- QR codes continue working only while the original domain, database, and storage remain available.
- Hosting, database, storage, AI, email, and SMS providers can charge independently.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Licensed under [MIT](LICENSE).
