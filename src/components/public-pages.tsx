"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, BookOpen, Heart } from "lucide-react";
import { api, errorMessage, formatDate } from "@/lib/client";
import type { Story, Media } from "@/lib/types";
import { Logo, Spinner, Field } from "./ui";
import { Recorder } from "./recorder";
import { MediaList } from "./story-editor";
export function SharedStory({ token }: { token: string }) {
  const [story, setStory] = useState<Story | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<Story>(`/api/public/story/${token}`)
      .then(setStory)
      .catch((e) => setError(errorMessage(e)));
  }, [token]);
  return (
    <main className="standalone shared-page">
      <Link href="/">
        <Logo />
      </Link>
      {error ? (
        <div className="panel">
          <h1>This story is tucked away.</h1>
          <p>{error}</p>
        </div>
      ) : !story ? (
        <div className="loading-state">
          <Spinner />
        </div>
      ) : (
        <article className="panel">
          <span className="eyebrow">A MEMORY FROM {story.storyteller.toUpperCase()}</span>
          <h1>{story.title}</h1>
          <div className="shared-date">{formatDate(story.created_at)}</div>
          {story.prompt && <blockquote>{story.prompt}</blockquote>}
          <div className="story-reading">
            {(story.body || story.transcript).split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <MediaList items={story.media} share={token} />
          <footer className="shared-footer">
            <Heart size={16} /> A little piece of a life, kept with Heirloom.
          </footer>
        </article>
      )}
    </main>
  );
}
export function GuestRecord({ token }: { token: string }) {
  const [question, setQuestion] = useState<{
      id: string;
      text: string;
      storyteller: string;
    } | null>(null),
    [error, setError] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [media, setMedia] = useState<Media[]>([]),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    api<{ id: string; text: string; storyteller: string }>(`/api/public/record/${token}`)
      .then((q) => {
        setQuestion(q);
        setTitle(q.text);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [token]);
  useEffect(() => {
    if (done || (!body && !media.length)) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [body, media, done]);
  return (
    <main className="standalone guest-page">
      <Link href="/">
        <Logo />
      </Link>
      <section className="panel">
        {done ? (
          <div className="empty">
            <span className="empty-icon">
              <Check size={32} />
            </span>
            <h1>That&apos;s a memory worth keeping.</h1>
            <p>
              Your story is safely in your family&apos;s collection. Thank you for sharing a little
              piece of your life.
            </p>
            <Heart size={23} />
          </div>
        ) : !question ? (
          <>
            {error ? (
              <>
                <h1>This question is resting.</h1>
                <p>{error}</p>
              </>
            ) : (
              <Spinner />
            )}
          </>
        ) : (
          <>
            <span className="eyebrow">
              A LITTLE QUESTION FOR {question.storyteller.toUpperCase()}
            </span>
            <h1>{question.text}</h1>
            <p>There&apos;s no right answer. Start wherever the memory takes you.</p>
            <Recorder
              questionId={question.id}
              guestToken={token}
              onUpload={(m) => setMedia((items) => [...items, m])}
            />
            {!!media.length && (
              <div className="saved-attachments">
                {media.map((m) => (
                  <div key={m.id}>
                    <Check size={16} />
                    {m.name}
                    <button
                      className="text-button"
                      onClick={() => setMedia((items) => items.filter((i) => i.id !== m.id))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await api(`/api/public/record/${token}`, "POST", {
                    title,
                    body,
                    media_ids: media.map((m) => m.id),
                  });
                  setDone(true);
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Give your memory a title">
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </Field>
              <Field label="Prefer to write? Or add a little more.">
                <textarea
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={100000}
                  placeholder="I remember…"
                />
              </Field>
              <label className="check-label">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />{" "}
                I agree to add this memory and its recordings to this family collection. Family
                editors may use AI to turn it into a written story.
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn primary"
                disabled={busy || !consent || (!body.trim() && !media.length)}
              >
                {busy ? <Spinner /> : <Check size={17} />} Save my memory
              </button>
              <p className="hint">
                This link accepts one story. Download a copy of your recording before leaving if
                you&apos;d like to keep one too. <Link href="/privacy">About your data.</Link>
              </p>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="standalone">
      <Link href="/">
        <Logo />
      </Link>
      <section className="panel invite-accept">
        <span className="empty-icon">
          <BookOpen size={31} />
        </span>
        <span className="eyebrow">THERE'S A PLACE FOR YOU HERE</span>
        <h1>Some stories are better together.</h1>
        <p>
          You&apos;ve been invited to a family collection. Sign in or create an account, then accept
          this invitation to join.
        </p>
        <Link className="btn" href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
          Sign in or create an account <ArrowRight size={15} />
        </Link>
        <button
          className="btn primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await api<{ book_id: string }>(
                `invitations/${token}/accept`,
                "POST",
                {},
              );
              router.push(`/app?book=${result.book_id}`);
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Spinner /> : <Check size={16} />} Accept invitation
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
