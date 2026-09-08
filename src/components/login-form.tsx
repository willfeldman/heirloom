"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Logo, Field, Spinner, DemoArt } from "./ui";
export function LoginForm({
  configured,
  emailEnabled,
}: {
  configured: boolean;
  emailEnabled: boolean;
}) {
  const params = useSearchParams(),
    router = useRouter();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const next = params.get("next"),
    destination =
      next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/app";
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!configured)
        throw new Error(
          "This deployment needs a database and auth secret. Open the setup guide below.",
        );
      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: "/reset-password",
        });
        if (result.error) throw new Error(result.error.message);
        setMessage("If an account exists for that email, a reset link is on its way.");
        return;
      }
      const result =
        mode === "signup"
          ? await authClient.signUp.email({ name, email, password, callbackURL: destination })
          : await authClient.signIn.email({ email, password, callbackURL: destination });
      if (result.error) throw new Error(result.error.message || "Unable to sign in.");
      if (mode === "signup" && emailEnabled) {
        setMessage("Check your email to verify your account, then sign in to begin.");
        return;
      }
      router.push(destination);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-form-side">
        <Link href="/">
          <Logo />
        </Link>
        <div className="auth-content">
          <span className="eyebrow">A PLACE FOR WHAT MATTERS</span>
          <h1>
            {mode === "signup"
              ? "Every life has a story."
              : mode === "forgot"
                ? "Let’s get you back in."
                : "Welcome back."}
          </h1>
          <p>
            {mode === "signup"
              ? "Start keeping the little moments that make it yours."
              : mode === "forgot"
                ? "We'll send a link to reset your password."
                : "Your family's stories are right where you left them."}
          </p>
          <form className="form-stack" onSubmit={submit}>
            {mode === "signup" && (
              <Field label="Your name">
                <input
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {mode !== "forgot" && (
              <Field
                label="Password"
                hint={mode === "signup" ? "At least 10 characters." : undefined}
              >
                <input
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={mode === "signup" ? 10 : 1}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                />
              </Field>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="success" role="status">
                {message}
              </p>
            )}
            <button className="btn primary" disabled={busy || !configured}>
              {busy ? <Spinner /> : <ArrowRight size={17} />}{" "}
              {mode === "signup"
                ? "Create your account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Come on in"}
            </button>
          </form>
          {mode === "login" && emailEnabled && (
            <button
              className="text-button forgot"
              onClick={() => {
                setMode("forgot");
                setError("");
                setMessage("");
              }}
            >
              Forgot your password?
            </button>
          )}
          <p className="auth-switch">
            {mode === "signup"
              ? "Already have an account? "
              : mode === "forgot"
                ? "Remembered it? "
                : "New to Heirloom? "}
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setMessage("");
              }}
            >
              {mode === "login" ? "Start your collection" : "Sign in"}
            </button>
          </p>
          {!configured && (
            <p className="setup-note">
              Running your own copy? <Link href="/setup">Finish the setup</Link> or{" "}
              <Link href="/demo">explore the sample collection</Link>.
            </p>
          )}
          <div className="auth-privacy">
            <ShieldCheck size={15} />
            <Link href="/privacy">Your stories stay in your family's hands.</Link>
          </div>
        </div>
      </div>
      <div className="auth-art-side">
        <DemoArt variant={4} />
        <blockquote>
          “Some things are too precious
          <br />
          to leave to memory alone.”
        </blockquote>
        <span>A LITTLE SPACE FOR A WHOLE LIFE.</span>
      </div>
    </main>
  );
}
