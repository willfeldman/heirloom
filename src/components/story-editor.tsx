"use client";
import { useState, useEffect } from "react";
import {
  Mic,
  Sparkles,
  Save,
  Link as LinkIcon,
  Trash2,
  Download,
  MessageCircle,
  Send,
  Check,
} from "lucide-react";
import type { Story, Media, Book } from "@/lib/types";
import { api, errorMessage, formatDate } from "@/lib/client";
import { Modal, Field, Spinner } from "./ui";
import { Recorder } from "./recorder";
export function MediaList({
  items,
  share,
  onRemove,
}: {
  items: Media[];
  share?: string;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="media-list">
      {items.map((item) => {
        const src = `/api/media/${item.id}${share ? `?share=${encodeURIComponent(share)}` : ""}`;
        return (
          <div key={item.id} className={`media-item ${item.kind === "photo" ? "media-photo" : ""}`}>
            {item.kind === "photo" ? (
              <img src={src} alt={item.name} loading="lazy" />
            ) : item.kind === "video" ? (
              <video src={src} controls preload="metadata" />
            ) : (
              <audio src={src} controls preload="metadata" />
            )}
            <div className="media-caption">
              <span>{item.name}</span>
              <a href={`${src}${share ? "&" : "?"}download=1`} aria-label={`Download ${item.name}`}>
                <Download size={15} />
              </a>
              {onRemove && (
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function StoryEditor({
  story,
  book,
  userId,
  prompt = "",
  demo,
  onClose,
  onSaved,
}: {
  story?: Story;
  book: Book;
  userId: string;
  prompt?: string;
  demo: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [id, setId] = useState(story?.id),
    [title, setTitle] = useState(story?.title || ""),
    [body, setBody] = useState(story?.body || ""),
    [transcript, setTranscript] = useState(story?.transcript || ""),
    [style, setStyle] = useState<Story["style"]>(story?.style || "first-person"),
    [status, setStatus] = useState<Story["status"]>(story?.status || "draft"),
    [media, setMedia] = useState<Media[]>(story?.media || []),
    [activeTab, setActiveTab] = useState(story ? "story" : "record"),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [shareToken, setShareToken] = useState(story?.share_token),
    [dirty, setDirty] = useState(false);
  const question = story?.prompt || prompt;
  const writable = book.role !== "viewer";
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function close() {
    if (!dirty || confirm("Discard your unsaved changes?")) onClose();
  }
  function edit<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setDirty(true);
    setMessage("");
  }
  async function save(closeAfter = false) {
    if (demo)
      throw new Error("These are fictional example stories. Sign in to save your own collection.");
    if (!title.trim()) throw new Error("Give your story a title first.");
    const values = {
      title,
      prompt: question,
      body,
      transcript,
      storyteller: book.storyteller,
      style,
      status,
      media_ids: media.map((m) => m.id),
    };
    let storyId = id;
    if (!storyId) {
      const result = await api<{ id: string }>("stories", "POST", { ...values, book_id: book.id });
      storyId = result.id;
      setId(storyId);
    }
    await api(`stories/${storyId}`, "PATCH", values);
    setDirty(false);
    onSaved();
    if (closeAfter) onClose();
    return storyId;
  }
  async function run(task: string, fn: () => Promise<void>) {
    setBusy(task);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <Modal
      title={
        writable
          ? story
            ? "A story worth keeping"
            : "Save a little piece of your life"
          : "Your family's story"
      }
      onClose={close}
      wide
    >
      {question && (
        <div className="question-note">
          <span className="eyebrow">THE QUESTION</span>
          <p>{question}</p>
        </div>
      )}
      {writable ? (
        <div className="editor">
          <Field label="Story title">
            <input
              value={title}
              placeholder="Give this memory a name…"
              onChange={(e) => edit(setTitle, e.target.value)}
              maxLength={200}
            />
          </Field>
          <div className="tabs">
            <button
              onClick={() => setActiveTab("record")}
              className={activeTab === "record" ? "active" : ""}
            >
              <Mic size={16} /> Record & photos
            </button>
            <button
              onClick={() => setActiveTab("story")}
              className={activeTab === "story" ? "active" : ""}
            >
              Your story
            </button>
            <button
              onClick={() => setActiveTab("transcript")}
              className={activeTab === "transcript" ? "active" : ""}
            >
              Transcript
            </button>
          </div>
          {activeTab === "record" ? (
            <>
              <Recorder
                userId={userId}
                disabled={demo}
                onUpload={(item) => {
                  setMedia((items) => [...items, item]);
                  setDirty(true);
                }}
              />
              <MediaList
                items={media}
                onRemove={(id) => {
                  setMedia((items) => items.filter((m) => m.id !== id));
                  setDirty(true);
                }}
              />
            </>
          ) : activeTab === "story" ? (
            <textarea
              className="story-textarea"
              value={body}
              placeholder="Write a memory here, or turn a recording into a story with AI. You can always edit the result."
              onChange={(e) => edit(setBody, e.target.value)}
              maxLength={100000}
              aria-label="Story text"
            />
          ) : (
            <>
              <p className="hint">
                Your original words stay here. Paste a transcript to use AI without a recording.
                Clear it to transcribe the attached recordings again.
              </p>
              <textarea
                className="story-textarea transcript"
                value={transcript}
                onChange={(e) => edit(setTranscript, e.target.value)}
                placeholder="The story in your own words…"
                maxLength={100000}
                aria-label="Original transcript"
              />
            </>
          )}
          <div className="ai-panel">
            <div>
              <Sparkles size={18} />
              <span>Make it a story</span>
            </div>
            <select
              aria-label="Writing style"
              value={style}
              onChange={(e) => edit(setStyle, e.target.value as Story["style"])}
            >
              <option value="first-person">In my own voice</option>
              <option value="third-person">Third person</option>
              <option value="transcript">Word for word</option>
            </select>
            <button
              className="btn"
              disabled={!!busy}
              onClick={() =>
                run("ai", async () => {
                  if (
                    body.trim() &&
                    !confirm(
                      "Generate a new version? This will replace the current story text. The transcript will be kept.",
                    )
                  )
                    return;
                  const savedId = await save();
                  const result = await api<{ body: string; transcript: string }>(
                    `stories/${savedId}/generate`,
                    "POST",
                    {},
                  );
                  setBody(result.body);
                  setTranscript(result.transcript);
                  setActiveTab("story");
                  onSaved();
                  setMessage("Your story is ready. Give it a read and make it your own.");
                })
              }
            >
              {busy === "ai" ? <Spinner /> : <Sparkles size={15} />}{" "}
              {busy === "ai" ? "Writing your story…" : "Generate"}
            </button>
          </div>
          <p className="hint">
            Uses your OpenAI key from Settings. Your recording or transcript is sent to OpenAI when
            you choose Generate. Always review the result.
          </p>
          <div className="editor-footer">
            <select
              aria-label="Story status"
              value={status}
              onChange={(e) => edit(setStatus, e.target.value as Story["status"])}
            >
              <option value="draft">Draft</option>
              <option value="published">Ready for the book</option>
            </select>
            <button
              className="btn primary"
              disabled={!!busy}
              onClick={() =>
                run("save", async () => {
                  await save(true);
                })
              }
            >
              {busy === "save" ? <Spinner /> : <Save size={16} />} Save story
            </button>
          </div>
          {id && (
            <div className="story-actions">
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() =>
                  run("share", async () => {
                    if (demo) throw new Error("Sign in to share your own stories.");
                    if (
                      !shareToken &&
                      !confirm(
                        "Create a private link? Anyone with this link or its QR code can read this story and play all its recordings and photos until you revoke it.",
                      )
                    )
                      return;
                    if (dirty) await save();
                    const result = await api<{ token: string; url: string }>(
                      `stories/${id}/share`,
                      "POST",
                      { enabled: true },
                    );
                    setShareToken(result.token);
                    await navigator.clipboard.writeText(result.url);
                    setMessage("Story link copied. Only share it with people you trust.");
                    onSaved();
                  })
                }
              >
                <LinkIcon size={15} /> Copy story link
              </button>
              {shareToken && (
                <button
                  className="text-button"
                  onClick={() =>
                    run("share", async () => {
                      await api(`stories/${id}/share`, "POST", { enabled: false });
                      setShareToken(null);
                      setMessage(
                        "Link revoked. Printed QR codes for this story will stop working.",
                      );
                      onSaved();
                    })
                  }
                >
                  Revoke link
                </button>
              )}
              <button
                className="text-button danger"
                disabled={!!busy}
                onClick={() =>
                  run("delete", async () => {
                    if (demo) throw new Error("Example stories cannot be deleted.");
                    if (!confirm("Delete this story and its recordings permanently?")) return;
                    await api(`stories/${id}`, "DELETE");
                    onSaved();
                    onClose();
                  })
                }
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="story-reading">
          <h1>{title}</h1>
          {body.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <MediaList items={media} />
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success" role="status">
          <Check size={16} />
          {message}
        </p>
      )}
      {id && <Comments storyId={id} demo={demo} />}
    </Modal>
  );
}
function Comments({ storyId, demo }: { storyId: string; demo: boolean }) {
  const [comments, setComments] = useState<
      { id: string; name: string; body: string; created_at: string }[]
    >([]),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!demo)
      api<typeof comments>(`comments/${storyId}`)
        .then(setComments)
        .catch((e) => setError(errorMessage(e)));
  }, [storyId, demo]);
  async function send() {
    setBusy(true);
    setError("");
    try {
      if (demo) throw new Error("Sign in to leave a note on your family's stories.");
      await api(`comments/${storyId}`, "POST", { body });
      setBody("");
      setComments(await api(`comments/${storyId}`));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="comments">
      <h3>
        <MessageCircle size={17} /> A little note from the family
      </h3>
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <strong>{c.name}</strong>
          <time>{formatDate(c.created_at)}</time>
          <p>{c.body}</p>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="comment-form"
      >
        <input
          aria-label="Your comment"
          placeholder="Add a memory, a thought, a little love…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
        />
        <button className="btn" disabled={busy || !body.trim()} aria-label="Post comment">
          {busy ? <Spinner /> : <Send size={16} />}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
