"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <section className="panel">
        <h1>We couldn&apos;t open this page.</h1>
        <p>
          Please try again. If you run this deployment, check the database connection and
          environment settings.
        </p>
        <button className="btn primary" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
