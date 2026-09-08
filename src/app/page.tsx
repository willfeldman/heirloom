import Link from "next/link";
import { ArrowRight, Mic, BookOpen, Heart, ShieldCheck, ArrowUpRight, Leaf } from "lucide-react";
import { Logo, DemoArt } from "@/components/ui";
export default function Home() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link href="/">
          <Logo />
        </Link>
        <nav>
          <a href="#how-it-works">How it works</a>
          <a href="https://github.com/willfeldman/heirloom">
            Open source <ArrowUpRight size={14} />
          </a>
          <Link className="btn" href="/login">
            Sign in
          </Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="eyebrow">
              <span className="tiny-sun">✳</span> FOR THE STORIES ONLY THEY CAN TELL
            </span>
            <h1>
              A voice you love.
              <br />A story to <em>keep.</em>
            </h1>
            <p>
              Grandma&apos;s kitchen. Dad&apos;s first adventure. The little moments that made a
              life. Give them a place to live on.
            </p>
            <div className="button-row">
              <Link href="/login?mode=signup" className="btn primary">
                Start your collection <ArrowRight size={17} />
              </Link>
              <Link href="/demo" className="text-button">
                Take a look inside <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="landing-promise">
              <ShieldCheck size={16} /> Open source. Your stories. Your own keys.
            </div>
          </div>
          <div className="landing-art">
            <div className="landing-photo">
              <DemoArt />
              <div>
                “I can still picture that blue door.”<span>A LITTLE PIECE OF HOME</span>
              </div>
            </div>
            <div className="voice-sticker">
              <span>
                <Mic size={20} />
              </span>
              <div>
                <strong>In their own voice.</strong>
                <small>A memory worth pressing play on.</small>
              </div>
              <div className="mini-wave">▂▅▃▇▅▂▅▃</div>
            </div>
            <span className="landing-star">✳</span>
          </div>
        </section>
        <section className="landing-strip">
          <span>Made for real families.</span>
          <span>Built for the long run.</span>
          <span>Yours from the first word.</span>
        </section>
        <section id="how-it-works" className="how-section">
          <span className="eyebrow">IT STARTS WITH A LITTLE QUESTION</span>
          <h2>No blank pages. Just a conversation.</h2>
          <div className="how-grid">
            {[
              {
                n: "01",
                icon: Heart,
                title: "Ask something meaningful.",
                text: "Choose a question from the jar, bring out an old photo, or ask the thing you've always wanted to know.",
              },
              {
                n: "02",
                icon: Mic,
                title: "Let the memories find their voice.",
                text: "Record in your browser. With your AI key, turn their words into an editable story that still sounds like them.",
              },
              {
                n: "03",
                icon: BookOpen,
                title: "Make something you can hold.",
                text: "Bring the stories together in a printable book, with QR codes that take you back to their voice.",
              },
            ].map((item) => (
              <div key={item.n}>
                <span className="how-number">{item.n}</span>
                <item.icon size={28} strokeWidth={1.25} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="open-source-section">
          <Leaf size={36} strokeWidth={1} />
          <h2>
            A family keepsake.
            <br />
            An open-source heart.
          </h2>
          <p>
            Run Heirloom on your own Vercel account. Bring a PostgreSQL database, private media
            storage, and your own AI key. Invite your family, keep your memories, and make it yours.
          </p>
          <a className="btn primary" href="https://github.com/willfeldman/heirloom">
            Get Heirloom on GitHub <ArrowUpRight size={16} />
          </a>
          <small>
            MIT licensed. No Heirloom subscription. Your hosting and AI providers may charge for
            usage.
          </small>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <span>Little stories. A lasting legacy.</span>
        <Link href="/privacy">Privacy & your data</Link>
        <a href="https://github.com/willfeldman/heirloom">GitHub</a>
      </footer>
    </div>
  );
}
