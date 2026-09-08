"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, Leaf, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Book, Story } from "@/lib/types";
export function PrintBook({
  book,
  stories,
  baseUrl,
  demo = false,
}: {
  book: Book;
  stories: Story[];
  baseUrl: string;
  demo?: boolean;
}) {
  const [codes, setCodes] = useState<Record<string, string>>({}),
    [error, setError] = useState("");
  const chapters = stories.filter((s) => s.status === "published");
  useEffect(() => {
    Promise.all(
      stories
        .filter((s) => s.share_token)
        .map(async (s) => [
          s.id,
          await QRCode.toDataURL(`${baseUrl}/s/${s.share_token}`, {
            width: 180,
            margin: 2,
            errorCorrectionLevel: "M",
          }),
        ]),
    )
      .then((entries) => setCodes(Object.fromEntries(entries)))
      .catch(() => setError("QR codes could not be generated. Please reload before printing."));
  }, [stories, baseUrl]);
  return (
    <main className="print-book">
      <div className="print-toolbar">
        <Link className="btn" href={demo ? "/demo" : "/app"}>
          <ArrowLeft size={16} /> Your collection
        </Link>
        <span>
          {demo
            ? "Sample book · fictional stories"
            : "Choose Save as PDF in the print dialog. Enable background graphics for your cover."}
        </span>
        <button
          className="btn primary"
          disabled={!!error || chapters.some((s) => s.share_token && !codes[s.id])}
          onClick={() => window.print()}
        >
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="print-cover" style={{ backgroundColor: book.cover_color }}>
        <div>
          <span className="book-kicker">A COLLECTION OF MEMORIES</span>
          <Leaf size={55} strokeWidth={0.8} />
          <h1>{book.title}</h1>
          <p>{book.subtitle}</p>
          <span className="book-author">TOLD BY {book.storyteller.toUpperCase()}</span>
        </div>
      </section>
      {book.dedication && (
        <section className="print-dedication">
          <Leaf size={30} strokeWidth={1} />
          <p>{book.dedication}</p>
        </section>
      )}
      <section className="print-contents">
        <span className="eyebrow">A LIFE, IN STORIES</span>
        <h2>The memories within</h2>
        {chapters.map((s, i) => (
          <div key={s.id}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <strong>{s.title}</strong>
          </div>
        ))}
        {!chapters.length && <p>Mark stories as “Ready for the book” to include them.</p>}
      </section>
      {chapters.map((s, i) => (
        <article className="print-chapter" key={s.id}>
          <span className="eyebrow">CHAPTER {String(i + 1).padStart(2, "0")}</span>
          <h2>{s.title}</h2>
          {s.prompt && <blockquote>{s.prompt}</blockquote>}
          <div className="print-story">
            {(s.body || s.transcript).split("\n\n").map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </div>
          {s.media
            .filter((m) => m.kind === "photo")
            .map((m) => (
              <figure key={m.id}>
                <img src={`/api/media/${m.id}`} alt={m.name} />
                <figcaption>{m.name}</figcaption>
              </figure>
            ))}
          {codes[s.id] && (
            <div className="print-qr">
              <img src={codes[s.id]} alt={`QR code for ${s.title}`} />
              <div>
                <strong>A story you can hear.</strong>
                <p>Scan to open the story and its original recordings.</p>
                <small>
                  Keep this code within your family. Access depends on the original Heirloom
                  deployment.
                </small>
              </div>
            </div>
          )}
        </article>
      ))}
      <div className="print-end">
        <Leaf size={32} strokeWidth={1} />
        <p>
          The end of these pages.
          <br />
          Never the end of the stories.
        </p>
        <small>Made with Heirloom · Open-source memory keeping</small>
      </div>
    </main>
  );
}
