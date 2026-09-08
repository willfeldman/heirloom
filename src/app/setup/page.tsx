import Link from "next/link";
import { Logo } from "@/components/ui";
import { Check, ArrowRight } from "lucide-react";
export const metadata = { title: "Make yourself at home" };
export default function Setup() {
  return (
    <main className="standalone setup-page">
      <Link href="/">
        <Logo />
      </Link>
      <section className="panel">
        <span className="eyebrow">YOUR OWN LITTLE CORNER OF THE INTERNET</span>
        <h1>Make yourself at home.</h1>
        <p>
          Heirloom needs a few things to keep your family&apos;s stories safe. The GitHub deploy
          button asks for these during setup.
        </p>
        <ol className="setup-steps">
          <li>
            <strong>A PostgreSQL database</strong>
            <p>
              Create a database with Neon (or another PostgreSQL provider) and set{" "}
              <code>DATABASE_URL</code>. Tables are created automatically by the Vercel build.
            </p>
          </li>
          <li>
            <strong>A secret for sign-in</strong>
            <p>
              Generate a random secret of at least 32 characters and set{" "}
              <code>BETTER_AUTH_SECRET</code>. Keep it stable and private.
            </p>
            <pre>openssl rand -base64 32</pre>
          </li>
          <li>
            <strong>A private home for recordings</strong>
            <p>
              Create a <b>Private</b> Vercel Blob store and set <code>BLOB_READ_WRITE_TOKEN</code>.
              Public stores are not supported.
            </p>
          </li>
          <li>
            <strong>Deploy, then bring your AI key</strong>
            <p>
              Redeploy after changing environment variables. Sign up and add an OpenAI key in
              Settings. Email reminders and password resets are optional; the guide explains how to
              enable them.
            </p>
          </li>
        </ol>
        <p className="hint">
          <Check size={15} /> Using a custom domain? Set <code>BETTER_AUTH_URL</code> to its full
          HTTPS URL. Vercel project domains are detected automatically.
        </p>
        <div className="button-row">
          <a
            className="btn primary"
            href="https://github.com/willfeldman/heirloom#deploy-to-vercel"
          >
            Full deployment guide <ArrowRight size={16} />
          </a>
          <Link className="btn" href="/demo">
            Explore the demo
          </Link>
        </div>
      </section>
    </main>
  );
}
