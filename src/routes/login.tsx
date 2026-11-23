import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [lang, setLang] = useState<"en" | "pt">("en");
  useEffect(() => {
    const saved = localStorage.getItem("atelier-lang");
    if (saved === "en" || saved === "pt") setLang(saved);
    if (new URLSearchParams(window.location.search).get("mode") === "in") setMode("in");
  }, []);
  function setLanguage(next: "en" | "pt") {
    setLang(next);
    localStorage.setItem("atelier-lang", next);
  }
  const pt = lang === "pt";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError(pt ? "Escreve um email válido." : "Enter a valid email.");
      return;
    }
    if (password.length < 8) {
      setError(pt ? "A palavra-passe precisa de pelo menos 8 caracteres." : "Use at least 8 characters.");
      return;
    }
    if (mode === "up" && name.trim().length < 2) {
      setError(pt ? "Escreve o teu nome." : "Enter your name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = mode === "up"
        ? await authClient.signUp.email({ email: mail, password, name: name.trim(), callbackURL: "/" })
        : await authClient.signIn.email({ email: mail, password, callbackURL: "/" });
      if (result.error) {
        setError(result.error.message || (pt ? "Não foi possível entrar." : "Could not sign in."));
        return;
      }
      if (mode === "up") {
        window.location.href = `https://buy.stripe.com/00weVe7yXaQE2qZaz7eEo04?prefilled_email=${encodeURIComponent(mail)}`;
        return;
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : pt ? "Não foi possível entrar." : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex w-fit rounded-full border border-line bg-surface p-1">
          <button type="button" onClick={() => setLanguage("en")} className={`min-h-11 rounded-full px-4 text-sm ${lang === "en" ? "bg-gold text-gold-ink" : "text-muted"}`}>English</button>
          <button type="button" onClick={() => setLanguage("pt")} className={`min-h-11 rounded-full px-4 text-sm ${lang === "pt" ? "bg-gold text-gold-ink" : "text-muted"}`}>Português</button>
        </div>
        <p className="font-display text-4xl text-gold">Nefer</p>
        <h1 className="mt-3 font-display text-3xl">{mode === "up" ? (pt ? "Criar conta" : "Create account") : pt ? "Entrar" : "Sign in"}</h1>
        <p className="mt-2 text-sm text-muted">{mode === "up" ? (pt ? "A seguir validas o cartão. Não és cobrado durante 3 dias." : "Next you confirm your card. You are not charged for 3 days.") : pt ? "O teste que já começou continua. Não há outro." : "The trial already running is the one that counts. There is not a new one."}</p>
        {!authEnabled ? <p className="mt-6 text-sm text-muted">{pt ? "O registo está desligado." : "Sign-in is off."}</p> : (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            {mode === "up" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder={pt ? "Nome" : "Name"} className="min-h-11 rounded-xl border border-line bg-surface px-3" />}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="min-h-11 rounded-xl border border-line bg-surface px-3" />
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={pt ? "Palavra-passe, 8 caracteres" : "Password, 8 characters"} className="min-h-11 rounded-xl border border-line bg-surface px-3" />
            {error && <p className="text-sm text-gold">{error}</p>}
            <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-gold text-gold-ink">{busy ? "…" : mode === "up" ? (pt ? "Criar conta" : "Create account") : pt ? "Entrar" : "Sign in"}</button>
            <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setMode(mode === "up" ? "in" : "up")}>{mode === "up" ? (pt ? "Já tenho conta" : "I already have an account") : pt ? "Criar conta" : "Create an account"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
