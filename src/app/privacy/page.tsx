import Link from "next/link";
import { Logo } from "@/components/ui";
export const metadata = { title: "Your stories, your data" };
export default function Privacy() {
  return (
    <main className="standalone prose">
      <Link href="/">
        <Logo />
      </Link>
      <article className="panel">
        <span className="eyebrow">PRIVATE BY NATURE</span>
        <h1>Your stories, your data.</h1>
        <p>
          Heirloom is open-source software you run on your own infrastructure. This page explains
          the default behavior of the code. The person operating a deployment is responsible for its
          hosting, retention, access, and privacy practices.
        </p>
        <h2>Where your memories live</h2>
        <p>
          Account details, stories, transcripts, comments, and collection settings live in the
          deployment&apos;s PostgreSQL database. Recordings and photos live in its private Vercel
          Blob store. Signed-in family members get access according to their collection role.
        </p>
        <h2>When AI sees your stories</h2>
        <p>
          When you choose Generate, the app sends recordings to OpenAI for transcription and/or
          transcripts to OpenAI for story editing. A transcript already saved on the story is
          reused. No AI request is made just by recording or saving. OpenAI&apos;s own API data
          policies apply; Heirloom cannot control provider retention.
        </p>
        <h2>Your API key</h2>
        <p>
          Personal API keys are encrypted with AES-256-GCM before storage and decrypted only on the
          server to make a request. Keys are never included in browser responses. The server
          operator controls the encryption secret and can access stored data, so only use a
          deployment you trust. This is not end-to-end encryption.
        </p>
        <h2>Sharing and recording links</h2>
        <p>
          Stories are accessible to collection members. Creating a share link lets anyone with that
          link or printed QR code read the story and access its media. You can revoke it. Recording
          links allow one submission without a login and expire after 90 days. Family invitations
          require sign-in, expire after 7 days, and can be used once. Do not post private links
          publicly.
        </p>
        <h2>Email and text messages</h2>
        <p>
          If configured, Resend delivers verification, password reset, and opted-in prompt emails.
          Twilio delivers opted-in SMS prompts. Your contact details and message content are sent to
          the relevant provider. Pause prompts in collection settings; SMS recipients can reply
          STOP.
        </p>
        <h2>Cookies and tracking</h2>
        <p>
          Heirloom uses authentication cookies to keep you signed in. The default source contains no
          advertising trackers or analytics. Hosting and service providers may keep operational
          logs.
        </p>
        <h2>Export and deletion</h2>
        <p>
          Export written memories and transcripts from the book screen. Download recordings and
          photos from each story. Collection owners can delete a collection, and editors can delete
          stories. Media deletion is queued in the database and processed by the authenticated
          cleanup cron. Without a configured cron, the operator must run cleanup or remove files
          from storage manually. Provider backups may retain data according to the operator&apos;s
          backup policies. Contact your deployment operator to delete your account or request an
          export of all account data.
        </p>
        <h2>Keeping voices available</h2>
        <p>
          Printed QR codes depend on the original deployment URL, database, and storage remaining
          available. Keep backups of your memories and encryption secret. Heirloom does not promise
          permanent hosting.
        </p>
        <Link className="btn" href="/">
          Back to Heirloom
        </Link>
      </article>
    </main>
  );
}
