import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, authEnabled } from "@/lib/auth/client";

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
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError("Escreve um email válido.");
      return;
    }
    if (password.length < 8) {
      setError("A palavra-passe precisa de pelo menos 8 caracteres.");
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setError("Escreve o teu nome.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({ email: mail, password, name: name.trim(), callbackURL: "/" })
          : await authClient.signIn.email({ email: mail, password, callbackURL: "/" });
      if (result.error) {
        const message = result.error.message || "Não foi possível entrar.";
        setError(/origin/i.test(message) ? "Na Vercel, BETTER_AUTH_URL tem de ser exatamente o link do site, com https." : message);
        return;
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <p className="font-display text-4xl text-gold">Nefer</p>
        <h1 className="mt-3 font-display text-3xl">{mode === "up" ? "Criar conta" : "Entrar"}</h1>
        <p className="mt-2 text-sm text-muted">3 dias grátis. Depois £15.99 por mês. O teu email entra sem pagar.</p>
        {!authEnabled ? (
          <p className="mt-6 text-sm text-muted">O registo está desligado.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            {mode === "up" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="min-h-11 rounded-xl border border-line bg-surface px-3" />
            )}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="min-h-11 rounded-xl border border-line bg-surface px-3" />
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Palavra-passe, 8 caracteres" className="min-h-11 rounded-xl border border-line bg-surface px-3" />
            {error && <p className="text-sm text-gold">{error}</p>}
            <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-gold text-gold-ink">{busy ? "…" : mode === "up" ? "Criar conta" : "Entrar"}</button>
            <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setMode(mode === "up" ? "in" : "up")}>{mode === "up" ? "Já tenho conta" : "Criar conta"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
