"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Logo, Field, Spinner } from "@/components/ui";
function Reset() {
  const params = useSearchParams(),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <main className="standalone">
      <Link href="/">
        <Logo />
      </Link>
      <section className="panel form-stack">
        <h1>A fresh start.</h1>
        {done ? (
          <p>
            Your password is updated. <Link href="/login">Sign in to your collection.</Link>
          </p>
        ) : (
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const result = await authClient.resetPassword({
                  newPassword: password,
                  token: params.get("token") || "",
                });
                if (result.error) throw new Error(result.error.message);
                setDone(true);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to reset password.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="New password">
              <input
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary" disabled={busy}>
              {busy && <Spinner />} Reset password
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
export default function ResetPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}
