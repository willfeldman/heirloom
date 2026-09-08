import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <section className="panel">
        <span className="eyebrow">A LITTLE LOST</span>
        <h1>This page isn&apos;t here.</h1>
        <p>The link may have changed, expired, or been revoked.</p>
        <Link className="btn primary" href="/app">
          Back to your stories
        </Link>
      </section>
    </main>
  );
}
