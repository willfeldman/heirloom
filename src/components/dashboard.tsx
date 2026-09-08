"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Mic,
  MessageSquare,
  Users,
  Settings,
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Heart,
  Leaf,
  Check,
  Link as LinkIcon,
  ThumbsUp,
  Trash2,
  Download,
  Printer,
  ArrowUp,
  ArrowDown,
  KeyRound,
  ShieldCheck,
  Mail,
  Calendar,
  FileText,
  Copy,
  Sparkles,
} from "lucide-react";
import { api, errorMessage, formatDate, initials } from "@/lib/client";
import { authClient } from "@/lib/auth-client";
import { prompts, promptGroups } from "@/lib/prompts";
import { demoState } from "@/lib/demo";
import type { AppState, Story, Book } from "@/lib/types";
import { Logo, Spinner, Modal, Field, Empty, SectionHeading, DemoArt } from "./ui";
import { StoryEditor } from "./story-editor";

type Tab = "stories" | "prompts" | "book" | "family" | "settings";
const nav = [
  { id: "stories", label: "Your stories", icon: BookOpen },
  { id: "prompts", label: "The question jar", icon: MessageSquare },
  { id: "book", label: "Your keepsake book", icon: Leaf },
  { id: "family", label: "Family circle", icon: Users },
] as const;
export function Dashboard({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<AppState | null>(demo ? structuredClone(demoState) : null),
    [tab, setTab] = useState<Tab>("stories"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [mobile, setMobile] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [create, setCreate] = useState(false),
    [editor, setEditor] = useState<{ story?: Story; prompt?: string } | null>(null),
    [selected, setSelected] = useState("");
  const refresh = useCallback(async () => {
    if (demo) return;
    try {
      const query = new URLSearchParams(window.location.search);
      const book = selected || query.get("book") || "";
      const next = await api<AppState>(`state${book ? `?book=${encodeURIComponent(book)}` : ""}`);
      setState(next);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [demo, selected]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  function notify(message: string) {
    setToast(message);
  }
  function requireLive() {
    if (demo) {
      notify("You're exploring a sample collection. Create an account to start your own.");
      return false;
    }
    return true;
  }
  function navigate(next: Tab) {
    setTab(next);
    setSearch("");
    setMobile(false);
  }
  const book = state?.book,
    writable = book?.role !== "viewer";
  const displayStories =
    state?.stories.filter(
      (s) =>
        (filter === "all" || s.status === filter) &&
        `${s.title} ${s.body} ${s.prompt}`.toLowerCase().includes(search.toLowerCase()),
    ) || [];
  const ready = state?.stories.filter((s) => s.status === "published").length || 0;
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <Link href="/" aria-label="Heirloom home">
          <Logo />
        </Link>
        <div className="sidebar-label">YOUR FAMILY ARCHIVE</div>
        <button className="collection-select" onClick={() => setCreate(true)}>
          <span className="collection-icon">
            <BookOpen size={19} />
          </span>
          <span>
            <strong>{book?.title || "Your first collection"}</strong>
            <small>{demo ? "A sample family collection" : "Made to be remembered"}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} strokeWidth={1.6} />
              {n.label}
              {n.id === "stories" && !!state?.stories.length && (
                <span className="nav-count">{state.stories.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-keepsake">
          <span className="small-sprout">
            <Leaf size={24} strokeWidth={1.2} />
          </span>
          <p>
            Little stories.
            <br />A lasting legacy.
          </p>
          <small>
            The things that make a life,
            <br />
            all in one place.
          </small>
        </div>
        <div className="sidebar-bottom">
          <button
            className={tab === "settings" ? "active" : ""}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} /> Settings & AI keys
          </button>
          <div className="user-line">
            <span className="avatar">{initials(state?.user.name || "You")}</span>
            <div>
              <strong>{state?.user.name || "Your account"}</strong>
              <small>{demo ? "Exploring Heirloom" : "Your private space"}</small>
            </div>
            <button
              className="icon-button"
              aria-label={demo ? "Sign in" : "Sign out"}
              onClick={async () => {
                if (demo) {
                  router.push("/login");
                  return;
                }
                await authClient.signOut();
                router.push("/");
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Your collection <span>/</span>{" "}
              {tab === "settings" ? "Settings" : nav.find((n) => n.id === tab)?.label}
            </span>
          </div>
          <div className="topbar-right">
            <span className="privacy-pill">
              <ShieldCheck size={14} /> Private by nature
            </span>
            <a
              href="https://github.com/willfeldman/heirloom"
              target="_blank"
              rel="noreferrer"
              className="text-button github-link"
            >
              Open source <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <Sparkles size={14} /> A little look inside. These are fictional sample stories.
            </span>
            <Link href="/login?mode=signup">
              Start your own <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <main className="main-content">
          {error && (
            <div className="error" role="alert">
              {error}{" "}
              <button className="text-button" onClick={() => void refresh()}>
                Try again
              </button>
            </div>
          )}
          {!state ? (
            <div className="loading-state">
              <Spinner />
              <p>Opening your family archive…</p>
            </div>
          ) : !book ? (
            <>
              <SectionHeading
                eyebrow="YOUR STORY STARTS HERE"
                title={`Welcome, ${state.user.name.split(" ")[0]}.`}
                description="A place for the stories only your family can tell."
              />
              <Empty
                icon={<BookOpen size={34} />}
                title="Every life is a collection of stories."
                description="Make a collection for yourself or someone you love. Then choose a question, press record, and see where the memory takes you."
              >
                <button className="btn primary" onClick={() => setCreate(true)}>
                  <Plus size={17} /> Create your first collection
                </button>
              </Empty>
            </>
          ) : (
            <>
              {tab === "stories" && (
                <>
                  <SectionHeading
                    eyebrow="A LIFE, IN THEIR OWN WORDS"
                    title={book.title}
                    description="The big adventures. The everyday magic. All worth keeping."
                  >
                    {writable && (
                      <button className="btn primary" onClick={() => setEditor({})}>
                        <Plus size={17} /> Add a story
                      </button>
                    )}
                  </SectionHeading>
                  <section className="prompt-hero">
                    <div className="hero-copy">
                      <div className="eyebrow">
                        <span className="tiny-sun">✳</span> A LITTLE INSPIRATION
                      </div>
                      <h2>
                        {state.questions.find((q) => q.status === "queued")?.text ||
                          "What did your childhood home feel like?"}
                      </h2>
                      <p>Sometimes the smallest question opens the biggest door.</p>
                      <div className="button-row">
                        <button
                          className="btn primary"
                          onClick={() =>
                            writable
                              ? setEditor({
                                  prompt:
                                    state.questions.find((q) => q.status === "queued")?.text ||
                                    "What did your childhood home feel like?",
                                })
                              : navigate("prompts")
                          }
                        >
                          <Mic size={16} /> Tell this story
                        </button>
                        <button className="text-button" onClick={() => navigate("prompts")}>
                          Find another question <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="hero-decoration" aria-hidden="true">
                      <div className="question-paper">
                        <span>THE QUESTION JAR</span>
                        <Leaf size={34} strokeWidth={1} />
                        <p>
                          There&apos;s a whole life
                          <br />
                          in the little things.
                        </p>
                        <i>one memory at a time</i>
                      </div>
                      <span className="hero-star star-one">✳</span>
                      <span className="hero-star star-two">✳</span>
                    </div>
                  </section>
                  <div className="story-toolbar">
                    <div className="filter-tabs">
                      <button
                        className={filter === "all" ? "active" : ""}
                        onClick={() => setFilter("all")}
                      >
                        All stories <span>{state.stories.length}</span>
                      </button>
                      <button
                        className={filter === "published" ? "active" : ""}
                        onClick={() => setFilter("published")}
                      >
                        Book ready <span>{ready}</span>
                      </button>
                      <button
                        className={filter === "draft" ? "active" : ""}
                        onClick={() => setFilter("draft")}
                      >
                        Drafts <span>{state.stories.length - ready}</span>
                      </button>
                    </div>
                    <label className="search">
                      <Search size={17} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Find a memory…"
                        aria-label="Search stories"
                      />
                    </label>
                  </div>
                  {displayStories.length ? (
                    <div className="story-grid">
                      {displayStories.map((s, i) => {
                        const photo = s.media.find((m) => m.kind === "photo");
                        return (
                          <button
                            key={s.id}
                            className="story-card"
                            onClick={() => setEditor({ story: s })}
                          >
                            <div className="story-card-image">
                              {photo ? (
                                <img src={`/api/media/${photo.id}`} alt="" loading="lazy" />
                              ) : demo ? (
                                <DemoArt variant={state.stories.indexOf(s)} />
                              ) : (
                                <div className={`story-card-blank blank-${i % 3}`}>
                                  <span>“</span>
                                  <p>{s.prompt || s.title}</p>
                                  <Leaf size={26} strokeWidth={1} />
                                </div>
                              )}
                              <span
                                className={`status-badge ${s.status === "draft" ? "draft" : ""}`}
                              >
                                {s.status === "draft" ? (
                                  <FileText size={11} />
                                ) : (
                                  <Check size={11} />
                                )}{" "}
                                {s.status === "draft" ? "Draft" : "Book ready"}
                              </span>
                            </div>
                            <div className="story-card-copy">
                              <div className="card-date">
                                {formatDate(s.created_at)}
                                <span>
                                  {s.media.some((m) => m.kind === "audio" || m.kind === "video") ? (
                                    <Mic size={13} />
                                  ) : (
                                    <FileText size={13} />
                                  )}
                                </span>
                              </div>
                              <h3>{s.title}</h3>
                              <p>
                                {s.body ||
                                  "A memory in the making. Open it to add a recording or start writing."}
                              </p>
                              <div className="card-footer">
                                <span>
                                  <span className="mini-avatar">{initials(s.storyteller)}</span>
                                  {s.storyteller}
                                </span>
                                <span>
                                  {s.comment_count > 0 && (
                                    <>
                                      <MessageSquare size={13} />
                                      {s.comment_count}
                                    </>
                                  )}
                                  <ArrowUpRight size={16} />
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty
                      icon={<BookOpen size={30} />}
                      title={
                        search
                          ? "That memory is still waiting to be found."
                          : "The first story is a special one."
                      }
                      description={
                        search
                          ? "Try another word, or switch to All stories."
                          : "Start with a familiar place, a favorite person, or a moment that still makes you smile."
                      }
                    >
                      {writable && !search && (
                        <button className="btn primary" onClick={() => setEditor({})}>
                          <Mic size={16} /> Record your first story
                        </button>
                      )}
                    </Empty>
                  )}
                  <div className="collection-footnote">
                    <Heart size={14} /> Every story you save is something someone will treasure.
                  </div>
                </>
              )}
              {tab === "prompts" && (
                <PromptsView
                  state={state}
                  demo={demo}
                  notify={notify}
                  refresh={refresh}
                  onRecord={(prompt) => setEditor({ prompt })}
                />
              )}
              {tab === "book" && (
                <BookView state={state} demo={demo} notify={notify} refresh={refresh} />
              )}
              {tab === "family" && (
                <FamilyView state={state} demo={demo} notify={notify} refresh={refresh} />
              )}
              {tab === "settings" && (
                <SettingsView state={state} demo={demo} notify={notify} refresh={refresh} />
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <Logo />
          <span>Your stories belong to you. Always.</span>
          <Link href="/privacy">Privacy</Link>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {editor && book && (
        <StoryEditor
          {...editor}
          book={book}
          userId={state!.user.id}
          demo={demo}
          onClose={() => setEditor(null)}
          onSaved={() => void refresh()}
        />
      )}
      {create && (
        <Modal title="Your family collections" onClose={() => setCreate(false)}>
          <div className="collection-list">
            {state?.books.map((b) => (
              <button
                className="collection-choice"
                key={b.id}
                onClick={() => {
                  setSelected(b.id);
                  setCreate(false);
                }}
              >
                <BookOpen size={20} />
                <span>
                  {b.title}
                  <small>{b.storyteller}</small>
                </span>
                {b.id === book?.id && <Check size={17} />}
              </button>
            ))}
          </div>
          <CreateCollection
            onCreate={async (title, storyteller) => {
              if (!requireLive()) return;
              const result = await api<{ id: string }>("books", "POST", { title, storyteller });
              setSelected(result.id);
              setCreate(false);
              notify("Your collection is ready for its first story.");
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function CreateCollection({
  onCreate,
}: {
  onCreate: (title: string, storyteller: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onCreate(title, name);
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Start a new collection</h3>
      <Field label="Whose stories are we keeping?">
        <input
          required
          placeholder="E.g. Grandma Eleanor"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!title || title === `${name}'s stories`) setTitle(`${e.target.value}'s stories`);
          }}
          maxLength={100}
        />
      </Field>
      <Field label="Collection name">
        <input
          required
          placeholder="A life worth remembering"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
        />
      </Field>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn primary" disabled={busy}>
        {busy ? <Spinner /> : <Plus size={16} />} Create collection
      </button>
    </form>
  );
}
function PromptsView({
  state,
  demo,
  notify,
  refresh,
  onRecord,
}: {
  state: AppState;
  demo: boolean;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
  onRecord: (s: string) => void;
}) {
  const [category, setCategory] = useState("All questions"),
    [search, setSearch] = useState(""),
    [custom, setCustom] = useState(""),
    [busy, setBusy] = useState("");
  const writable = state.book!.role !== "viewer";
  async function act(key: string, fn: () => Promise<void>) {
    if (demo) {
      notify("Create your own collection to choose questions and invite a storyteller.");
      return;
    }
    setBusy(key);
    try {
      await fn();
      await refresh();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy("");
    }
  }
  const filtered = prompts.filter(
    (p) =>
      (category === "All questions" || p.category === category) &&
      p.text.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <SectionHeading
        eyebrow="GOOD QUESTIONS. GREAT STORIES."
        title="The question jar"
        description="A little nudge for memories you might never think to ask about."
      />
      <section className="panel queue-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">UP NEXT</span>
            <h2>Your family&apos;s questions</h2>
          </div>
          <span className="count-pill">
            {state.questions.filter((q) => q.status !== "answered").length} waiting
          </span>
        </div>
        {!state.questions.length && (
          <p className="muted">Choose questions below, or add one only your family would ask.</p>
        )}
        {state.questions
          .filter((q) => q.status !== "answered")
          .map((q) => (
            <div className="queue-row" key={q.id}>
              <button
                className={`vote-button ${q.voted ? "voted" : ""}`}
                disabled={!!busy}
                aria-label={`Vote for ${q.text}`}
                onClick={() =>
                  act(q.id, async () => {
                    await api(`questions/${q.id}/vote`, "POST", { voted: !q.voted });
                  })
                }
              >
                <ThumbsUp size={15} />
                {q.votes}
              </button>
              <div>
                <strong>{q.text}</strong>
                <small>
                  {q.category} · {q.status === "sent" ? "Sent to your storyteller" : "In the queue"}
                </small>
              </div>
              {writable && (
                <>
                  <button
                    className="icon-button"
                    title="Create a recording link (expires in 90 days)"
                    aria-label={`Copy recording link for ${q.text}`}
                    onClick={() =>
                      act(q.id, async () => {
                        const result = await api<{ url: string }>(
                          `questions/${q.id}/link`,
                          "POST",
                          {},
                        );
                        await navigator.clipboard.writeText(result.url);
                        notify(
                          "Recording link copied. Anyone with it can submit one story; no login needed.",
                        );
                      })
                    }
                  >
                    <LinkIcon size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove question ${q.text}`}
                    onClick={() =>
                      act(q.id, async () => {
                        await api(`questions/${q.id}`, "DELETE");
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        {writable && (
          <form
            className="custom-question"
            onSubmit={(e) => {
              e.preventDefault();
              void act("custom", async () => {
                await api("questions", "POST", { book_id: state.book!.id, text: custom });
                setCustom("");
              });
            }}
          >
            <input
              aria-label="Your own question"
              placeholder="Or ask a question of your own…"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              minLength={3}
              maxLength={1000}
              required
            />
            <button className="btn" disabled={!!busy || custom.trim().length < 3}>
              <Plus size={16} /> Add
            </button>
          </form>
        )}
      </section>
      <div className="browse-heading">
        <h2>A good place to begin</h2>
        <label className="search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 96 questions…"
            aria-label="Search prompt library"
          />
        </label>
      </div>
      <div className="category-pills">
        {["All questions", ...Object.keys(promptGroups)].map((c) => (
          <button className={category === c ? "active" : ""} key={c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="prompt-grid">
        {filtered.map((p) => {
          const queued = state.questions.some((q) => q.text === p.text && q.status !== "answered");
          return (
            <div className="prompt-card" key={p.id}>
              <span className="eyebrow">{p.category}</span>
              <h3>{p.text}</h3>
              {writable && (
                <div>
                  <button className="text-button" onClick={() => onRecord(p.text)}>
                    <Mic size={14} /> Tell this story
                  </button>
                  <button
                    className="icon-button"
                    disabled={!!busy || queued}
                    aria-label={`Add to queue: ${p.text}`}
                    onClick={() =>
                      act(p.id, async () => {
                        await api("questions", "POST", {
                          book_id: state.book!.id,
                          text: p.text,
                          category: p.category,
                        });
                        notify("Added to your family's question queue.");
                      })
                    }
                  >
                    {queued ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
function BookView({
  state,
  demo,
  notify,
  refresh,
}: {
  state: AppState;
  demo: boolean;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
}) {
  const book = state.book!,
    [title, setTitle] = useState(book.title),
    [subtitle, setSubtitle] = useState(book.subtitle),
    [dedication, setDedication] = useState(book.dedication),
    [color, setColor] = useState(book.cover_color),
    [busy, setBusy] = useState(false);
  const ready = state.stories.filter((s) => s.status === "published");
  async function act(fn: () => Promise<void>) {
    if (demo) {
      notify("This sample shows what your book can look like. Sign in to make your own.");
      return;
    }
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function move(id: string, delta: number) {
    const ids = state.stories.map((s) => s.id),
      i = ids.indexOf(id);
    if (i + delta < 0 || i + delta >= ids.length) return;
    [ids[i], ids[i + delta]] = [ids[i + delta], ids[i]];
    await act(async () => {
      await api(`reorder/${book.id}`, "POST", { ids });
    });
  }
  return (
    <>
      <SectionHeading
        eyebrow="FROM LITTLE MOMENTS TO SOMETHING LASTING"
        title="A life between the covers"
        description="Gather your stories into a book you can read, print, and pass down."
      >
        <a
          className="btn primary"
          href={demo ? "/demo/print" : `/print/${book.id}`}
          target="_blank"
          rel="noreferrer"
        >
          <Printer size={17} /> Preview & print
        </a>
      </SectionHeading>
      <div className="book-workspace">
        <div className="book-stage">
          <div className="book-object" style={{ backgroundColor: color }}>
            <div className="book-border">
              <span className="book-kicker">A COLLECTION OF MEMORIES</span>
              <Leaf size={43} strokeWidth={0.9} />
              <h2>{title}</h2>
              <p>{subtitle}</p>
              <div className="book-author">TOLD BY {book.storyteller.toUpperCase()}</div>
            </div>
          </div>
          <span className="book-stage-caption">
            {ready.length} {ready.length === 1 ? "chapter" : "chapters"} · Made with love, kept for
            always
          </span>
        </div>
        <div className="panel form-stack">
          <h2>Make it yours</h2>
          <Field label="Book title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              disabled={book.role !== "owner"}
            />
          </Field>
          <Field label="A few words for the cover">
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={200}
              disabled={book.role !== "owner"}
            />
          </Field>
          <Field label="Dedication">
            <textarea
              value={dedication}
              onChange={(e) => setDedication(e.target.value)}
              placeholder="For the people who made it all worth remembering…"
              maxLength={5000}
              rows={3}
              disabled={book.role !== "owner"}
            />
          </Field>
          <div>
            <span className="field-label">Cover color</span>
            <div className="color-swatches">
              {["#304c43", "#466078", "#80564c", "#77633f", "#41454a", "#785e77"].map((c) => (
                <button
                  key={c}
                  aria-label={`Cover color ${c}`}
                  aria-pressed={color === c}
                  disabled={book.role !== "owner"}
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                >
                  {color === c && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
          {book.role === "owner" && (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await api(`books/${book.id}`, "PATCH", {
                    title,
                    subtitle,
                    dedication,
                    cover_color: color,
                  });
                  notify("Your book cover is saved.");
                })
              }
            >
              {busy ? <Spinner /> : <Check size={16} />} Save book details
            </button>
          )}
        </div>
      </div>
      <section className="panel chapters">
        <div className="panel-title">
          <h2>One chapter at a time</h2>
          <span className="count-pill">{ready.length} book ready</span>
        </div>
        {state.stories.length ? (
          state.stories.map((s, i) => (
            <div className="chapter-row" key={s.id}>
              <span className="chapter-number">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <strong>{s.title}</strong>
                <small>
                  {s.status === "published" ? "Included in your book" : "Draft · not included yet"}
                  {s.share_token ? " · Voice link enabled" : ""}
                </small>
              </div>
              {book.role !== "viewer" && (
                <>
                  <button
                    className="icon-button"
                    disabled={busy || i === 0}
                    aria-label={`Move ${s.title} up`}
                    onClick={() => move(s.id, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy || i === state.stories.length - 1}
                    aria-label={`Move ${s.title} down`}
                    onClick={() => move(s.id, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                </>
              )}
            </div>
          ))
        ) : (
          <p className="muted">
            Your stories will appear here. Mark a story as “Ready for the book” to include it.
          </p>
        )}
      </section>
      <div className="book-export-grid">
        <div className="panel">
          <LinkIcon size={24} strokeWidth={1.3} />
          <h3>Hear the voice behind the words.</h3>
          <p>
            Add QR codes that open the original recordings. Anyone with a printed code can access
            that story until the link is revoked. Keep your deployment and storage running for the
            codes to work.
          </p>
          {book.role !== "viewer" && (
            <button
              className="btn"
              disabled={busy || !ready.length}
              onClick={() =>
                act(async () => {
                  if (
                    !confirm(
                      "Enable share links for all book-ready stories? Anyone with a printed QR code can read the linked story and play its recordings.",
                    )
                  )
                    return;
                  for (const s of ready)
                    await api(`stories/${s.id}/share`, "POST", { enabled: true });
                  notify("Voice links enabled. Your print preview now includes QR codes.");
                })
              }
            >
              <LinkIcon size={15} /> Enable book voice links
            </button>
          )}
        </div>
        <div className="panel">
          <Download size={24} strokeWidth={1.3} />
          <h3>Your memories, to keep.</h3>
          <p>
            Export the collection as JSON, including written stories and original transcripts.
            Download original recordings and photos from each story. Use your browser&apos;s print
            dialog to save the book as a PDF.
          </p>
          <a
            className="btn"
            href={demo ? "#" : `/api/data/export/${book.id}`}
            onClick={(e) => {
              if (demo) {
                e.preventDefault();
                notify("Exports are available for your own collections.");
              }
            }}
          >
            <Download size={15} /> Export stories & transcripts
          </a>
        </div>
      </div>
    </>
  );
}
function FamilyView({
  state,
  demo,
  notify,
  refresh,
}: {
  state: AppState;
  demo: boolean;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
}) {
  const [role, setRole] = useState("editor"),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState("");
  const owner = state.book!.role === "owner";
  async function act(fn: () => Promise<void>) {
    if (demo) {
      notify("Create your collection to invite family and friends.");
      return;
    }
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionHeading
        eyebrow="THE PEOPLE WHO MAKE IT A STORY"
        title="Your family circle"
        description="Some stories get even better when you remember them together."
      />
      <div className="family-layout">
        <section className="panel">
          <h2>A seat at the table</h2>
          {state.members.map((m) => (
            <div className="family-member" key={m.id}>
              <span className="avatar large">{initials(m.name)}</span>
              <div>
                <strong>
                  {m.name}
                  {m.id === state.user.id ? " (you)" : ""}
                </strong>
                <small>{m.email}</small>
              </div>
              <span className="role-pill">{m.role}</span>
              {owner && m.role !== "owner" && (
                <button
                  className="icon-button danger"
                  aria-label={`Remove ${m.name}`}
                  onClick={() =>
                    act(async () => {
                      if (!confirm(`Remove ${m.name} from this collection?`)) return;
                      await api("members", "DELETE", { book_id: state.book!.id, user_id: m.id });
                    })
                  }
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </section>
        <section className="panel invitation-panel">
          <Users size={28} strokeWidth={1.3} />
          <h2>Make room for someone you love.</h2>
          <p>
            Editors can add stories, photos, and questions. Viewers can read, listen, vote on
            questions, and leave a note.
          </p>
          {owner ? (
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  const result = await api<{ url: string }>("invitations", "POST", {
                    book_id: state.book!.id,
                    role,
                    email,
                  });
                  setLink(result.url);
                  notify("Invitation created. Share the link with your family member.");
                });
              }}
            >
              <Field label="Their role">
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="editor">Editor — add and edit memories</option>
                  <option value="viewer">Viewer — read, listen, and comment</option>
                </select>
              </Field>
              {state.capabilities.email && (
                <Field
                  label="Restrict to an email address (optional)"
                  hint="The recipient must verify this email before accepting."
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="someone@yourfamily.com"
                  />
                </Field>
              )}
              <button className="btn primary" disabled={busy}>
                {busy ? <Spinner /> : <Plus size={16} />} Create invitation link
              </button>
              <small>
                Each invitation can be used once and expires in 7 days. The recipient signs in
                before joining.
              </small>
              {link && (
                <div className="copy-field">
                  <input value={link} readOnly aria-label="Invitation link" />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Copy invitation"
                    onClick={async () => {
                      await navigator.clipboard.writeText(link);
                      notify("Invitation link copied.");
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              )}
            </form>
          ) : (
            <p className="hint">The collection owner can invite new family members.</p>
          )}
        </section>
      </div>
      {!!state.invitations.length && (
        <section className="panel">
          <h2>Invitations waiting to be opened</h2>
          {state.invitations.map((inv) => (
            <div className="queue-row" key={inv.id}>
              <Mail size={19} />
              <div>
                <strong>{inv.email || "A family invitation"}</strong>
                <small>
                  {inv.role} · Expires {formatDate(inv.expires_at)}
                </small>
              </div>
              <button
                className="icon-button"
                aria-label="Copy invitation link"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/invite/${inv.token}`,
                  );
                  notify("Invitation copied.");
                }}
              >
                <Copy size={16} />
              </button>
              <button
                className="text-button danger"
                onClick={() =>
                  act(async () => {
                    await api(`invitations/${inv.id}`, "DELETE");
                  })
                }
              >
                Revoke
              </button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
function SettingsView({
  state,
  demo,
  notify,
  refresh,
}: {
  state: AppState;
  demo: boolean;
  notify: (s: string) => void;
  refresh: () => Promise<void>;
}) {
  const book = state.book!,
    [key, setKey] = useState(""),
    [textModel, setTextModel] = useState("gpt-4.1-mini"),
    [transcriptionModel, setTranscriptionModel] = useState("gpt-4o-mini-transcribe"),
    [hasKey, setHasKey] = useState(false),
    [serverKey, setServerKey] = useState(false),
    [busy, setBusy] = useState(false),
    [recipient, setRecipient] = useState(book.recipient_email || ""),
    [phone, setPhone] = useState(book.phone || ""),
    [emailOpt, setEmailOpt] = useState(book.email_opt_in),
    [smsOpt, setSmsOpt] = useState(book.sms_opt_in),
    [day, setDay] = useState(book.reminder_day),
    [enabled, setEnabled] = useState(book.reminder_enabled);
  useEffect(() => {
    if (demo) return;
    api<{ has_key: boolean; server_key: boolean; text_model: string; transcription_model: string }>(
      "settings",
    )
      .then((s) => {
        setHasKey(s.has_key);
        setServerKey(s.server_key);
        setTextModel(s.text_model);
        setTranscriptionModel(s.transcription_model);
      })
      .catch((e) => notify(errorMessage(e)));
  }, [demo]); // Settings are private to the signed-in account.
  async function act(fn: () => Promise<void>) {
    if (demo) {
      notify("Sign in to configure your own AI key and reminder schedule.");
      return;
    }
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      notify(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionHeading
        eyebrow="A SPACE THAT'S YOURS"
        title="Just the way you like it"
        description="Your keys, your family, your pace."
      />
      <div className="settings-grid">
        <section className="panel form-stack">
          <div className="panel-icon">
            <KeyRound size={23} />
          </div>
          <h2>Bring your own AI</h2>
          <p>
            Connect OpenAI to turn recordings into transcripts and stories. Your API key is
            encrypted on the server and is never returned to your browser. The deployment owner can
            access the server; only use a deployment you trust.
          </p>
          <span className={`connection-status ${hasKey || serverKey ? "connected" : ""}`}>
            <span />
            {hasKey
              ? "Your personal key is saved"
              : serverKey
                ? "A deployment key is available"
                : "No AI key connected"}
          </span>
          <Field
            label={hasKey ? "Replace your OpenAI API key" : "OpenAI API key"}
            hint="API usage is billed by OpenAI to the key's account."
          >
            <input
              type="password"
              autoComplete="off"
              placeholder="sk-…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </Field>
          <div className="two-fields">
            <Field label="Story model">
              <input
                value={textModel}
                onChange={(e) => setTextModel(e.target.value)}
                maxLength={100}
              />
            </Field>
            <Field label="Transcription model">
              <input
                value={transcriptionModel}
                onChange={(e) => setTranscriptionModel(e.target.value)}
                maxLength={100}
              />
            </Field>
          </div>
          <div className="button-row">
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await api("settings", "PATCH", {
                    key: key || undefined,
                    text_model: textModel,
                    transcription_model: transcriptionModel,
                  });
                  if (key) setHasKey(true);
                  setKey("");
                  notify("AI settings saved.");
                })
              }
            >
              {busy ? <Spinner /> : <ShieldCheck size={16} />} Save AI settings
            </button>
            {hasKey && (
              <button
                className="text-button danger"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await api("settings", "PATCH", {
                      remove_key: true,
                      text_model: textModel,
                      transcription_model: transcriptionModel,
                    });
                    setHasKey(false);
                    notify("Your personal key has been removed.");
                  })
                }
              >
                Remove key
              </button>
            )}
          </div>
          <a
            className="text-button"
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
          >
            Get an OpenAI API key <ArrowUpRight size={14} />
          </a>
        </section>
        <section className="panel form-stack">
          <div className="panel-icon">
            <Calendar size={23} />
          </div>
          <h2>A little reminder to remember</h2>
          <p>
            Send one queued question each week. The storyteller opens a recording link and can
            respond without signing in.
          </p>
          {book.role !== "owner" ? (
            <p className="hint">Your collection owner manages the reminder schedule.</p>
          ) : (
            <>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />{" "}
                Send weekly prompts
              </label>
              <Field
                label="Day of the week"
                hint="Delivered around 14:00 UTC; Vercel Hobby schedules can vary within the hour."
              >
                <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((d, i) => (
                    <option value={i} key={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Storyteller's email">
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="someone@yourfamily.com"
                />
              </Field>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={emailOpt}
                  onChange={(e) => setEmailOpt(e.target.checked)}
                />{" "}
                They agreed to receive email prompts.
              </label>
              {!state.capabilities.email && (
                <p className="setup-note">
                  Email needs RESEND_API_KEY and EMAIL_FROM in your deployment settings. Add
                  CRON_SECRET to enable the schedule.
                </p>
              )}
              <details>
                <summary>Text message reminders</summary>
                <Field label="Phone number" hint="International format, e.g. +12125551234">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1…"
                  />
                </Field>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={smsOpt}
                    onChange={(e) => setSmsOpt(e.target.checked)}
                  />{" "}
                  They explicitly agreed to receive automated SMS prompts and can reply STOP.
                </label>
                {!state.capabilities.sms && (
                  <p className="setup-note">
                    SMS needs your own Twilio account and phone number. See the deployment guide.
                  </p>
                )}
              </details>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await api(`books/${book.id}`, "PATCH", {
                      reminder_enabled: enabled,
                      reminder_day: day,
                      recipient_email: recipient,
                      phone,
                      email_opt_in: emailOpt,
                      sms_opt_in: smsOpt,
                    });
                    notify("Reminder preferences saved.");
                  })
                }
              >
                <Check size={16} /> Save reminder preferences
              </button>
            </>
          )}
        </section>
      </div>
      <section className="panel ownership-note">
        <ShieldCheck size={26} strokeWidth={1.3} />
        <div>
          <h3>Your family&apos;s stories belong to your family.</h3>
          <p>
            No subscription to Heirloom. You control your database, media storage, and AI provider.
            Hosting and provider charges depend on the services you choose.{" "}
            <Link href="/privacy">Read how your data is handled.</Link>
          </p>
        </div>
        <a
          className="btn"
          href="https://github.com/willfeldman/heirloom#deploy-to-vercel"
          target="_blank"
          rel="noreferrer"
        >
          Deployment guide <ArrowUpRight size={15} />
        </a>
      </section>
      {book.role === "owner" && (
        <section className="panel danger-zone">
          <h3>Delete this collection</h3>
          <p>
            This removes all stories, members, invitations, and recording access. Download your
            memories first.
          </p>
          <button
            className="btn danger"
            disabled={busy}
            onClick={() =>
              act(async () => {
                if (
                  prompt(
                    `This cannot be undone. Type the collection name to delete it:\n${book.title}`,
                  ) !== book.title
                )
                  return;
                await api(`books/${book.id}`, "DELETE");
                window.location.href = "/app";
              })
            }
          >
            <Trash2 size={15} /> Delete collection
          </button>
        </section>
      )}
    </>
  );
}
