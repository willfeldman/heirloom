-- Additive and repeatable. Applied transactionally under an advisory lock.
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE, image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY, "expiresAt" TIMESTAMPTZ NOT NULL, token TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT, "userAgent" TEXT, "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS session_user_idx ON session("userId");
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT, "refreshToken" TEXT, "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ, "refreshTokenExpiresAt" TIMESTAMPTZ, scope TEXT, password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_user_idx ON account("userId");
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);
CREATE TABLE IF NOT EXISTS "rateLimit" (id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, count INTEGER NOT NULL, "lastRequest" BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), owner_id TEXT NOT NULL REFERENCES "user"(id),
  title TEXT NOT NULL, storyteller TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT 'A life, in stories',
  dedication TEXT NOT NULL DEFAULT '', cover_color TEXT NOT NULL DEFAULT '#304c43',
  recipient_email TEXT, phone TEXT, email_opt_in BOOLEAN NOT NULL DEFAULT FALSE, sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_day INTEGER NOT NULL DEFAULT 0 CHECK(reminder_day BETWEEN 0 AND 6),
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS members (
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('owner','editor','viewer')), PRIMARY KEY(book_id,user_id)
);
CREATE INDEX IF NOT EXISTS members_user_idx ON members(user_id);
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES "user"(id) ON DELETE SET NULL, title TEXT NOT NULL, prompt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '', transcript TEXT NOT NULL DEFAULT '', storyteller TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'first-person' CHECK(style IN ('first-person','third-person','transcript')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  position INTEGER NOT NULL DEFAULT 0, share_token TEXT UNIQUE,
  ai_started_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stories_book_idx ON stories(book_id);
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  text TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Your questions', added_by TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','answered')),
  token TEXT UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '90 days',
  story_id UUID REFERENCES stories(id) ON DELETE SET NULL, sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS questions_book_idx ON questions(book_id);
CREATE TABLE IF NOT EXISTS votes (
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  PRIMARY KEY(question_id,user_id)
);
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE, story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  pathname TEXT UNIQUE NOT NULL, name TEXT NOT NULL, content_type TEXT NOT NULL,
  size INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('audio','video','photo')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS media_story_idx ON media(story_id);
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL, role TEXT NOT NULL CHECK(role IN ('editor','viewer')), email TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '7 days', accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE, openai_key TEXT,
  text_model TEXT NOT NULL DEFAULT 'gpt-4.1-mini', transcription_model TEXT NOT NULL DEFAULT 'gpt-4o-mini-transcribe'
);
CREATE TABLE IF NOT EXISTS action_limits (key TEXT NOT NULL, bucket TIMESTAMPTZ NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(key,bucket));
CREATE TABLE IF NOT EXISTS reminder_deliveries (
  book_id UUID REFERENCES books(id) ON DELETE CASCADE, day DATE NOT NULL, question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE, sms_sent BOOLEAN NOT NULL DEFAULT FALSE, completed BOOLEAN NOT NULL DEFAULT FALSE,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(book_id,day)
);
CREATE TABLE IF NOT EXISTS storage_garbage (pathname TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS upload_intents (pathname TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE OR REPLACE FUNCTION queue_deleted_media() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO storage_garbage(pathname) VALUES (OLD.pathname) ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS media_cleanup ON media;
CREATE TRIGGER media_cleanup BEFORE DELETE ON media FOR EACH ROW EXECUTE FUNCTION queue_deleted_media();
