import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, authEnabled, signIn, GROK_PROVIDERS } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"up" | "in">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result =
      mode === "up"
        ? await authClient.signUp.email({ email, password, name: name || email, callbackURL: "/" })
        : await authClient.signIn.email({ email, password, callbackURL: "/" });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Could not sign in.");
      return;
    }
    await navigate({ to: "/" });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl text-gold">Atelier</p>
        <h1 className="mt-3 font-display text-3xl">{mode === "up" ? "Create your studio" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-muted">3 days free. Then £15.99 a month. Your face is never redrawn.</p>
        {!authEnabled ? (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            {mode === "up" && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                className="min-h-11 rounded-xl border border-line bg-surface px-3"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="min-h-11 rounded-xl border border-line bg-surface px-3"
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password, 8+ characters"
              className="min-h-11 rounded-xl border border-line bg-surface px-3"
            />
            {error && <p className="text-sm text-gold">{error}</p>}
            <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-gold text-gold-ink">
              {busy ? "…" : mode === "up" ? "Start free trial" : "Sign in"}
            </button>
            <button
              type="button"
              className="min-h-11 text-sm text-muted"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "I already have an account" : "Create an account"}
            </button>
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="min-h-11 rounded-full border border-line"
              >
                Continue with {p.label}
              </button>
            ))}
          </form>
        )}
      </div>
    </main>
  );
}
