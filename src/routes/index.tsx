import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Aperture,
  Clapperboard,
  Sparkles,
  Type,
} from "lucide-react";
import {
  label,
  longScript,
  makeHooks,
  shortScript,
  viralPack,
  type Lang,
  type Platform,
} from "@/lib/studio";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { clipStatus, confirmCheckout, getAccess, makeCopy, makeStill, startClip, writeWithKey } from "@/lib/account";

function packText(
  tool: Tool,
  hooks: { line: string }[],
  short: { hook: string; beats: { t: string; line: string; shot: string }[]; caption: string },
  long: { title: string; time: string; body: string }[],
  viral: { caption: string; thumbnail: string; tags: string[] },
) {
  if (tool === "hooks") return hooks.map((h) => h.line).join("\n");
  if (tool === "short") return [short.hook, ...short.beats.map((b) => `${b.t} ${b.line}`), short.caption].join("\n");
  if (tool === "long") return long.map((c) => `${c.time} ${c.title}\n${c.body}`).join("\n\n");
  return [viral.thumbnail, ...hooks.slice(0, 3).map((h) => h.line), viral.caption, viral.tags.join(" ")].join("\n");
}

export const Route = createFileRoute("/")({ component: Studio });

type Tool = "video" | "photo" | "hooks" | "short" | "long" | "viral" | "all";

const copy = {
  en: {
    kicker: "Premium studio",
    title: "Make the film. Then the still.",
    sub: "Bring a product clip or a picture. Say what you want. Hooks only if you ask.",
    topic: "What is this about?",
    placeholder: "A skincare routine that actually fits a workday",
    platform: "Platform",
    length: "Length",
    make: "Make it",
    copy: "Copy",
    copied: "Copied",
    all: "Full pack",
    video: "Video",
    hooks: "Hooks",
    short: "Short film",
    long: "Long film",
    viral: "Viral pack",
    photo: "Photo",
    score: "hold",
    download: "Download still",
    upload: "Upload a photo",
    clarity: "Clarity",
    warmth: "Warmth",
    contrast: "Contrast",
    backdrop: "Backdrop",
    plain: "Nothing on the face or body is redrawn. Sharpness only cleans detail. Crop and background run only if you turn them on.",
    replace: "Change background",
    sharp: "Sharpness",
    crop: "Crop",
    cropHint: "Moves the frame. It does not resize the person.",
    bgPrompt: "Describe the background",
    bgPlaceholder: "Soft daylight studio, pale wall",
    suggestions: "Suggestions",
  },
  pt: {
    kicker: "Estúdio premium",
    title: "Faz o vídeo. Depois a foto.",
    sub: "Traz um vídeo do produto ou uma foto. Diz o que queres. Os hooks só se pedires.",
    topic: "Sobre o quê?",
    placeholder: "Uma rotina de pele que cabe num dia de trabalho",
    platform: "Plataforma",
    length: "Duração",
    make: "Criar",
    copy: "Copiar",
    copied: "Copiado",
    all: "Pacote completo",
    video: "Vídeo",
    hooks: "Hooks",
    short: "Vídeo curto",
    long: "Vídeo longo",
    viral: "Conteúdo viral",
    photo: "Foto",
    score: "retenção",
    download: "Descarregar",
    upload: "Carregar foto",
    clarity: "Nitidez",
    warmth: "Calor",
    contrast: "Contraste",
    backdrop: "Fundo",
    plain: "A cara e o corpo não são redesenhados. A nitidez só limpa o detalhe. O corte e o fundo só entram se os ligares.",
    replace: "Mudar o fundo",
    sharp: "Nitidez",
    crop: "Cortar",
    cropHint: "Muda o enquadramento. Não muda o tamanho da pessoa.",
    bgPrompt: "Como queres o fundo",
    bgPlaceholder: "Estúdio com luz de dia, parede clara",
    suggestions: "Sugestões",
  },
};

const tools: { id: Tool; icon: typeof Type }[] = [
  { id: "video", icon: Clapperboard },
  { id: "photo", icon: Aperture },
  { id: "hooks", icon: Type },
];

const backdrops = ["#1a140c", "#d6a15a", "#2c3a34", "#6e2e2a", "#e7e1d6", "#1d2a44"];

function NeferMark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="h-10 w-10 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#1c1a16" stroke="#d6a15a" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="#d6a15a" strokeWidth="1.4" />
        <circle cx="16" cy="16" r="2.2" fill="#d6a15a" />
      </svg>
      <span className="font-display text-xl text-gold">Nefer</span>
    </span>
  );
}

function HomeGate({ lang, setLanguage }: { lang: Lang; setLanguage: (next: Lang) => void }) {
  const pt = lang === "pt";
  const lines = pt
    ? [
        "Queres ficar nas redes sociais?",
        "Tudo o que os teus vídeos precisam para ter engajamento.",
        "A primeira frase decide se ficam ou se passam.",
      ]
    : [
        "Want to stay on social media?",
        "Everything your videos need to get engagement.",
        "The first line decides if they stay or scroll.",
      ];
  const cards = pt
    ? [
        { name: "Vídeo", text: "Carregas o produto, dizes o que queres, e sai um clipe com legenda." },
        { name: "Foto", text: "Luz de hotel, parede limpa, quarto suave. A cara e o corpo ficam os teus." },
        { name: "Hooks", text: "Frases para as pessoas ficarem. Só se quiseres mais engajamento." },
      ]
    : [
        { name: "Video", text: "Upload the product, say what you want, and a clip comes back with a caption." },
        { name: "Photo", text: "Hotel light, a clean wall, a soft room. The face and body stay yours." },
        { name: "Hooks", text: "Lines that make people stay. Only if you want more engagement." },
      ];
  const [line, setLine] = useState(0);
  const [open, setOpen] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setLine((n) => (n + 1) % lines.length), 3200);
    return () => window.clearInterval(id);
  }, [lines.length]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg px-4 py-8 text-fg">
      <div className="nefer-glow pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
      <div className="nefer-drift pointer-events-none absolute right-0 bottom-0 h-40 w-[140%] bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
      <div className="relative mx-auto grid max-w-3xl gap-8">
        <div className="flex items-center justify-between gap-3">
          <NeferMark />
          <div className="flex rounded-full border border-line bg-surface p-1">
            <button type="button" onClick={() => setLanguage("en")} className={`min-h-11 rounded-full px-4 text-sm ${lang === "en" ? "bg-gold text-gold-ink" : "text-muted"}`}>English</button>
            <button type="button" onClick={() => setLanguage("pt")} className={`min-h-11 rounded-full px-4 text-sm ${lang === "pt" ? "bg-gold text-gold-ink" : "text-muted"}`}>Português</button>
          </div>
        </div>
        <p key={line} className="nefer-in max-w-xl font-display text-4xl leading-tight md:text-6xl">
          {lines[line]}
        </p>
        <p className="max-w-xl text-muted">
          {pt
            ? "Na primeira página vês o que o estúdio faz. Toca num cartão. Depois crias a conta, confirmas o cartão, e entras. Três dias sem cobrança."
            : "The first page shows what the studio does. Tap a card. Then you create the account, confirm the card, and you are in. Three days with no charge."}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {cards.map((card, i) => (
            <button
              key={card.name}
              type="button"
              onClick={() => setOpen(i)}
              className={`nefer-in min-h-28 rounded-2xl border p-4 text-left transition ${open === i ? "border-gold bg-surface" : "border-line bg-bg"}`}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <p className="text-sm text-gold">{card.name}</p>
              <p className={`mt-2 text-sm ${open === i ? "text-fg" : "text-muted"}`}>{card.text}</p>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a href="/login" className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-gold-ink">
            {pt ? "Começar teste grátis" : "Start free trial"}
          </a>
          <a href="/login?mode=in" className="text-sm text-muted">
            {pt ? "Já tenho conta" : "I already have an account"}
          </a>
        </div>
      </div>
    </main>
  );
}

function Studio() {
  const { user, isPending } = useCurrentUserState();
  const [lang, setLang] = useState<Lang>("en");
  const [tool, setTool] = useState<Tool>("video");
  const [topic, setTopic] = useState("Slow turn, clean wall, hold the flowers, warm hotel light");
  const [platform, setPlatform] = useState<Platform>("reels");
  const [seconds, setSeconds] = useState<15 | 30 | 60>(30);
  const [note, setNote] = useState("");
  const [access, setAccess] = useState<{ allowed: boolean; paid: boolean; owner?: boolean; trialHoursLeft: number; hasKey: boolean } | null>(null);
  const [modelText, setModelText] = useState("");
  const t = copy[lang];

  useEffect(() => {
    const saved = localStorage.getItem("atelier-lang");
    if (saved === "en" || saved === "pt") setLang(saved);
  }, []);

  useEffect(() => {
    if (!user) return;
    getAccess()
      .then(setAccess)
      .catch(() => setAccess(null));
    const session = new URLSearchParams(window.location.search).get("session_id");
    if (session) {
      confirmCheckout({ data: session }).then(() => getAccess().then(setAccess));
    }
  }, [user]);

  function setLanguage(next: Lang) {
    setLang(next);
    localStorage.setItem("atelier-lang", next);
  }

  const hooks = useMemo(() => makeHooks(topic, lang, platform), [topic, lang, platform]);
  const short = useMemo(() => shortScript(topic, lang, seconds, platform), [topic, lang, seconds, platform]);
  const long = useMemo(() => longScript(topic, lang), [topic, lang]);
  const viral = useMemo(() => viralPack(topic, lang, platform), [topic, lang, platform]);

  if (isPending) return <main className="grid min-h-screen place-items-center bg-bg text-muted">Nefer</main>;
  if (!user) return <HomeGate lang={lang} setLanguage={setLanguage} />;
  if (access && !access.allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
        <div className="w-full max-w-md">
          <NeferMark />
          <h1 className="mt-3 font-display text-3xl">{lang === "pt" ? "O teste de 3 dias acabou." : "The 3-day trial is over."}</h1>
          <p className="mt-2 text-muted">£15.99 / {lang === "pt" ? "mês" : "month"}</p>
          <button
            type="button"
            className="mt-6 min-h-11 rounded-full bg-gold px-5 text-gold-ink"
            onClick={() => {
              window.location.href = "https://buy.stripe.com/8x214o7yXbUId5D8qZeEo05";
            }}
          >
            {lang === "pt" ? "Assinar" : "Subscribe"}
          </button>
          {note && <p className="mt-3 text-sm text-gold">{note}</p>}
          <div className="mt-6">
            <UserButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-bg pb-28 text-fg md:pb-0" style={{ paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom))" }}>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <NeferMark />
        </div>
        <div className="flex shrink-0 rounded-full border border-line bg-surface p-1" aria-label="Language">
          <button type="button" onClick={() => setLanguage("en")} className={`min-h-11 rounded-full px-3 text-sm md:px-4 ${lang === "en" ? "bg-gold text-gold-ink" : "text-muted"}`}>
            EN
          </button>
          <button type="button" onClick={() => setLanguage("pt")} className={`min-h-11 rounded-full px-3 text-sm md:px-4 ${lang === "pt" ? "bg-gold text-gold-ink" : "text-muted"}`}>
            PT
          </button>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 md:grid-cols-[220px_1fr] md:px-8 md:py-10">
        <aside className="flex flex-col gap-6">
          <div>
            {access && (
              <p className="text-xs text-gold">
                {access.owner
                  ? lang === "pt"
                    ? "Incluído"
                    : "Included"
                  : access.paid
                    ? "£15.99"
                    : lang === "pt"
                      ? `${access.trialHoursLeft}h de teste`
                      : `${access.trialHoursLeft}h trial`}
              </p>
            )}
            <UserButton />
          </div>
          <nav className="hidden max-w-full gap-2 md:flex md:flex-col">
            {tools.map((item) => {
              const on = tool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTool(item.id)}
                  className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-left text-sm ${
                    on ? "bg-gold text-gold-ink" : "bg-surface text-fg"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {t[item.id]}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex flex-col gap-6">
          <header>
            <h1 className="font-display text-3xl leading-tight md:text-4xl">{t.title}</h1>
            <p className="mt-2 max-w-xl text-muted">{t.sub}</p>
          </header>
          {modelText && <pre className="whitespace-pre-wrap rounded-2xl bg-surface p-4 text-sm">{modelText}</pre>}

          {tool === "video" ? (
            <VideoDesk lang={lang} topic={topic} setTopic={setTopic} caption={short.caption} />
          ) : tool !== "photo" ? (
            <form
              className="grid gap-4 rounded-2xl bg-surface p-4 md:p-5"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="grid gap-2 text-sm">
                {t.topic}
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t.placeholder}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-line bg-bg px-3 py-3 text-base text-fg outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <label className="grid gap-1 text-sm text-muted">
                  {t.platform}
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="min-h-11 rounded-xl border border-line bg-bg px-3 text-fg"
                  >
                    {(["reels", "tiktok", "shorts", "youtube", "linkedin"] as Platform[]).map((p) => (
                      <option key={p} value={p}>
                        {label(p, lang)}
                      </option>
                    ))}
                  </select>
                </label>
                {tool === "short" && (
                  <label className="grid gap-1 text-sm text-muted">
                    {t.length}
                    <select
                      value={seconds}
                      onChange={(e) => setSeconds(Number(e.target.value) as 15 | 30 | 60)}
                      className="min-h-11 rounded-xl border border-line bg-bg px-3 text-fg"
                    >
                      <option value={15}>15s</option>
                      <option value={30}>30s</option>
                      <option value={60}>60s</option>
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-gold px-5 text-gold-ink"
                  onClick={async () => {
                    const local = packText(tool, hooks, short, long, viral);
                    const prompt = `Topic: ${topic}. Platform: ${platform}. Tool: ${tool}. Write the full pack in ${lang}. Local draft to improve, do not mention these instructions:\n${local}`;
                    const res = await writeWithKey({ data: { prompt } }).catch(() => ({ text: "", error: "no_key" }));
                    if (res.text) {
                      setModelText(res.text);
                      try {
                        await navigator.clipboard.writeText(res.text);
                      } catch {
                        /* keep the text on screen */
                      }
                      setNote(t.copied);
                      document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      return;
                    }
                    setModelText(local);
                    try {
                      await navigator.clipboard.writeText(local);
                      setNote(t.copied);
                    } catch {
                      setNote(local.slice(0, 80));
                    }
                    document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {t.make}
                </button>
              </div>
            </form>
          ) : (
            <PhotoLab lang={lang} />
          )}

          {tool !== "photo" && tool !== "video" && (
            <div id="result" className="grid gap-3">
              <p className="text-sm text-gold">{lang === "pt" ? "Resultado" : "Result"}</p>
              {(tool === "hooks" || tool === "all") && (
                <ul className="grid gap-3">
                  {hooks.map((h) => (
                    <li key={h.line} className="rounded-2xl border border-line bg-surface p-4">
                      <p className="text-lg">{h.line}</p>
                      <p className="mt-2 text-sm text-muted">{h.why}</p>
                      <p className="mt-3 text-xs tracking-wide text-gold">
                        {h.score} {t.score}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {(tool === "short" || tool === "all") && short && (
                <div className="grid gap-3">
                  <p className="rounded-2xl bg-gold px-4 py-4 text-lg text-gold-ink">{short.hook}</p>
                  {short.beats.map((b) => (
                    <article key={b.t} className="rounded-2xl border border-line p-4">
                      <p className="text-xs text-gold">{b.t}</p>
                      <p className="mt-1">{b.line}</p>
                      <p className="mt-1 text-sm text-muted">{b.shot}</p>
                    </article>
                  ))}
                  <pre className="whitespace-pre-wrap rounded-2xl bg-surface p-4 text-sm">{short.caption}</pre>
                </div>
              )}
              {(tool === "long" || tool === "all") && (
                <ol className="grid gap-3">
                  {long.map((c) => (
                    <li key={c.title} className="rounded-2xl border border-line p-4">
                      <p className="text-xs text-gold">{c.time}</p>
                      <h2 className="font-display text-2xl">{c.title}</h2>
                      <p className="mt-2 text-muted">{c.body}</p>
                    </li>
                  ))}
                </ol>
              )}
              {(tool === "viral" || tool === "all") && viral && (
                <div className="grid gap-3">
                  {viral.hooks.map((h) => (
                    <p key={h.line} className="rounded-2xl bg-surface p-4 text-lg">
                      {h.line}
                    </p>
                  ))}
                  <p className="rounded-2xl border border-gold px-4 py-6 text-center font-display text-3xl">{viral.thumbnail}</p>
                  <pre className="whitespace-pre-wrap rounded-2xl bg-surface p-4 text-sm">{viral.caption}</pre>
                  <p className="text-sm text-gold">{viral.tags.join("  ")}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-1 border-t border-line bg-bg px-2 pt-2 md:hidden" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        {tools.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTool(item.id)}
            className={`flex min-h-12 w-full items-center justify-center gap-1 rounded-full px-2 text-sm ${
              tool === item.id ? "bg-gold text-gold-ink" : "text-muted"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {t[item.id]}
          </button>
        ))}
      </nav>
    </main>
  );
}

function VideoDesk({
  lang,
  topic,
  setTopic,
  caption,
}: {
  lang: Lang;
  topic: string;
  setTopic: (value: string) => void;
  caption: string;
}) {
  const pt = lang === "pt";
  const pick = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<"video" | "image" | "">("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [clip, setClip] = useState("");
  const [still, setStill] = useState("");
  const [words, setWords] = useState(caption);
  const [prompts, setPrompts] = useState<string[]>([topic]);

  function writePrompts(next: string[]) {
    setPrompts(next);
    const line = next.map((item) => item.trim()).filter(Boolean).join(". ");
    if (line) setTopic(line);
  }

  async function localAd(dataUrl: string, line: string) {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 1152;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.fillStyle = "#12110e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / img.width, 960 / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (canvas.width - w) / 2, 36, w, h);
    ctx.fillStyle = "#d6a15a";
    ctx.font = "600 32px Georgia, serif";
    ctx.fillText(line.slice(0, 42), 36, 1060);
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  async function run(mode: "photo" | "video" | "words") {
    setBusy(true);
    setStatus(pt ? "A preparar…" : "Preparing…");
    if (!file && mode !== "words") {
      setStatus(pt ? "Carrega primeiro o vídeo ou a foto." : "Upload the video or photo first.");
      setBusy(false);
      return;
    }
    let imageUrl = "";
    if (file && mode !== "words") {
      try {
        imageUrl = await pictureFromFile(file);
      } catch {
        setStatus(pt ? "Não consegui ler esse ficheiro." : "Could not read that file.");
        setBusy(false);
        return;
      }
    }
    if (mode === "photo") {
      const made = await makeStill({ data: { prompt: topic, imageUrl } }).catch(() => ({ url: "", error: "off" }));
      const url = made.url || (await localAd(imageUrl, topic));
      setStill(url);
      setStatus(made.url ? (pt ? "Anúncio pronto." : "Ad is ready.") : pt ? "Anúncio pronto neste aparelho." : "Ad is ready on this device.");
      setBusy(false);
      return;
    }
    if (mode === "words") {
      const made = await makeCopy({ data: { prompt: topic } }).catch(() => ({ text: "", error: "off" }));
      setWords(made.text || caption);
      setStatus(made.text ? (pt ? "Texto pronto." : "Copy is ready.") : pt ? "Texto pronto neste aparelho." : "Copy is ready on this device.");
      setBusy(false);
      return;
    }
    setClip("");
    const started = await startClip({ data: { prompt: topic, imageUrl } }).catch(() => ({
      id: "",
      error: pt ? "Não foi possível começar." : "Could not start.",
    }));
    if (!started.id) {
      setStatus(started.error || (pt ? "Não foi possível começar o vídeo." : "Could not start the video."));
      setBusy(false);
      return;
    }
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const row = await clipStatus({ data: started.id }).catch(() => ({ status: "failed", url: "", error: "" }));
      if (row.url) {
        setClip(row.url);
        setStatus(pt ? "Vídeo pronto." : "Video is ready.");
        setBusy(false);
        return;
      }
      if (row.status === "failed" || row.status === "expired") {
        setStatus(row.error || (pt ? "O vídeo falhou." : "The video failed."));
        setBusy(false);
        return;
      }
      setStatus(pt ? "A criar o vídeo…" : "Creating the video…");
    }
    setStatus(pt ? "Ainda está a criar. Tenta outra vez daqui a um minuto." : "Still creating. Try again in a minute.");
    setBusy(false);
  }
  async function pictureFromFile(source: File) {
    const objectUrl = URL.createObjectURL(source);
    const canvas = document.createElement("canvas");
    const draw = (width: number, height: number, el: CanvasImageSource) => {
      const scale = Math.min(1, 1280 / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.86);
    };
    if (source.type.startsWith("video")) {
      const video = document.createElement("video");
      video.src = objectUrl;
      video.muted = true;
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("bad video"));
      });
      video.currentTime = Math.min(0.4, video.duration || 0);
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.onseeked = done;
        window.setTimeout(done, 800);
      });
      return draw(video.videoWidth, video.videoHeight, video);
    }
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    return draw(img.naturalWidth, img.naturalHeight, img);
  }

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-4 rounded-2xl bg-surface p-4 md:p-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="relative flex min-h-28 w-full cursor-pointer items-center justify-center rounded-2xl border border-dashed border-gold bg-bg px-4 text-center text-lg text-gold">
          <span className="pointer-events-none px-2">{file ? file.name : pt ? "Carregar vídeo ou foto" : "Upload video or photo"}</span>
          <input
            ref={pick}
            type="file"
            accept="video/*,image/*"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              const next = e.target.files?.[0];
              if (!next) return;
              setFile(next);
              setKind(next.type.startsWith("video") ? "video" : "image");
              setFileUrl(URL.createObjectURL(next));
            }}
          />
        </label>
        {fileUrl && kind === "video" && <video src={fileUrl} controls className="max-h-80 w-full rounded-2xl bg-black" />}
        {fileUrl && kind === "image" && <img src={fileUrl} alt="" className="max-h-80 w-full rounded-2xl object-contain" />}
        <div className="grid gap-3">
          <p className="text-sm text-gold">{pt ? "Prompt do vídeo" : "Video prompt"}</p>
          {prompts.map((line, i) => (
            <textarea
              key={i}
              value={line}
              rows={3}
              placeholder={pt ? "Viragem lenta, parede limpa, luz de hotel" : "Slow turn, clean wall, warm hotel light"}
              onChange={(e) => writePrompts(prompts.map((item, n) => (n === i ? e.target.value : item)))}
              className="w-full resize-none rounded-xl border border-line bg-bg px-3 py-3 text-base text-fg outline-none"
            />
          ))}
          <div className="grid grid-cols-1 gap-2">
            <button type="button" onClick={() => writePrompts([...prompts, ""])} className="min-h-12 w-full rounded-full bg-gold px-5 text-gold-ink">
              {pt ? "Adicionar" : "Add"}
            </button>
            <button type="button" onClick={() => writePrompts(prompts.length > 1 ? prompts.slice(0, -1) : prompts)} className="min-h-12 w-full rounded-full border border-line px-5">
              {pt ? "Remover" : "Remove"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <button type="button" disabled={busy} onClick={() => void run("video")} className="min-h-12 w-full rounded-full bg-gold px-5 text-gold-ink">
            {busy ? "…" : pt ? "Criar vídeo" : "Create video"}
          </button>
          <button type="button" disabled={busy} onClick={() => void run("photo")} className="min-h-12 w-full rounded-full border border-gold px-5 text-gold">
            {pt ? "Criar anúncio" : "Create ad"}
          </button>
          <button type="button" disabled={busy} onClick={() => void run("words")} className="min-h-12 w-full rounded-full border border-line px-5">
            {pt ? "Criar texto" : "Create copy"}
          </button>
        </div>
        {status && <p className="text-sm text-gold">{status}</p>}
      </form>
      <div className="rounded-2xl border border-line p-4">
        <p className="text-xs text-gold">{pt ? "Texto" : "Copy"}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{words}</p>
      </div>
      {still && (
        <a href={still} download="nefer-ad.jpg" className="block">
          <img src={still} alt="" className="max-h-96 w-full rounded-2xl object-contain" />
          <p className="mt-2 text-sm text-gold">{pt ? "Descarregar anúncio" : "Download ad"}</p>
        </a>
      )}
      {clip && (
        <video src={clip} controls className="max-h-96 w-full rounded-2xl bg-black" />
      )}
      <p className="text-sm text-muted">
        {pt
          ? "A cara e o corpo ficam iguais, a não ser que o pedido diga o contrário. Os hooks estão na terceira opção, só se quiseres."
          : "The face and body stay the same unless the request says otherwise. Hooks are the third option, only if you want them."}
      </p>
    </div>
  );
}

const scenes = [
  { id: "wall", pt: "Parede limpa", en: "Clean wall", a: "#f4f1ec", b: "#e7e2da" },
  { id: "hotel", pt: "Hotel, luz quente", en: "Hotel, warm light", a: "#f3e6cf", b: "#c4a574" },
  { id: "room", pt: "Quarto suave", en: "Soft bedroom", a: "#efe4d4", b: "#8d735c" },
  { id: "studio", pt: "Estúdio branco", en: "White studio", a: "#f7f1e8", b: "#e4d9c8" },
  { id: "grey", pt: "Cinza suave", en: "Soft grey", a: "#e6e1da", b: "#b7b1a8" },
  { id: "gold", pt: "Dourado", en: "Gold", a: "#f0e2c4", b: "#d6a15a" },
  { id: "night", pt: "Noite", en: "Night", a: "#241c16", b: "#0e0d0b" },
];

function PhotoLab({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const [src, setSrc] = useState<string | null>(null);
  const [sharp, setSharp] = useState(22);
  const [improve, setImprove] = useState(true);
  const [replaceBg, setReplaceBg] = useState(false);
  const [cropOn, setCropOn] = useState(false);
  const [crop, setCrop] = useState({ t: 0, r: 0, b: 0, l: 0 });
  const [wish, setWish] = useState("");
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [made, setMade] = useState("");
  const [making, setMaking] = useState(false);
  const [sceneId, setSceneId] = useState("studio");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;
    const img = new Image();
    img.onload = () => {
      const max = 1200;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const hold = document.createElement("canvas");
      hold.width = w;
      hold.height = h;
      const hctx = hold.getContext("2d", { willReadFrequently: true });
      if (!hctx) return;
      hctx.drawImage(img, 0, 0, w, h);
      const frame = hctx.getImageData(0, 0, w, h);
      const px = frame.data;
      if (improve) sharpen(px, w, h, sharp / 50);
      const mask = replaceBg ? backgroundMask(px, w, h) : null;
      const left = cropOn ? Math.round((w * crop.l) / 100) : 0;
      const right = cropOn ? Math.round((w * crop.r) / 100) : 0;
      const top = cropOn ? Math.round((h * crop.t) / 100) : 0;
      const bottom = cropOn ? Math.round((h * crop.b) / 100) : 0;
      const cw = Math.max(1, w - left - right);
      const ch = Math.max(1, h - top - bottom);
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (replaceBg && mask) {
        const grad = ctx.createLinearGradient(0, 0, 0, ch);
        grad.addColorStop(0, scene.a);
        grad.addColorStop(1, scene.b);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, cw, ch);
      }
      const out = ctx.getImageData(0, 0, cw, ch);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const sp = (y + top) * w + (x + left);
          if (mask && mask[sp]) continue;
          const si = sp * 4;
          const di = (y * cw + x) * 4;
          out.data[di] = px[si];
          out.data[di + 1] = px[si + 1];
          out.data[di + 2] = px[si + 2];
          out.data[di + 3] = 255;
        }
      }
      ctx.putImageData(out, 0, 0);
    };
    img.src = src;
  }, [src, sharp, improve, replaceBg, cropOn, crop, scene, wish]);

  function applyWish(text: string) {
    setWish(text);
    const hit = matchScene(text);
    if (hit) setSceneId(hit);
    if (text.trim()) setReplaceBg(true);
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">{t.plain}</p>
      <label className="relative flex min-h-28 w-full cursor-pointer items-center justify-center rounded-2xl border border-dashed border-gold bg-bg px-4 text-center text-lg text-gold">
        <span className="pointer-events-none">{t.upload}</span>
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setSrc(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {src ? (
        <canvas ref={canvasRef} className="h-auto w-full max-w-full rounded-2xl" />
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-8 text-muted">{t.upload}</p>
      )}
      <div className="grid gap-3 rounded-2xl border border-line p-4">
        <p className="text-sm text-gold">{lang === "pt" ? "Prompts da imagem" : "Image prompts"}</p>
        {prompts.map((line, i) => (
          <textarea
            key={i}
            value={line}
            rows={2}
            placeholder={lang === "pt" ? "Luz de hotel, parede limpa, sem mudar a cara" : "Hotel light, clean wall, do not change the face"}
            onChange={(e) => setPrompts(prompts.map((item, n) => (n === i ? e.target.value : item)))}
            className="w-full resize-none rounded-xl border border-line bg-bg px-3 py-3 text-base text-fg outline-none"
          />
        ))}
        <div className="grid grid-cols-1 gap-2">
          <button type="button" onClick={() => setPrompts([...prompts, ""])} className="min-h-12 w-full rounded-full bg-gold px-5 text-gold-ink">
            {lang === "pt" ? "Adicionar" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setPrompts(prompts.length > 1 ? prompts.slice(0, -1) : [""])}
            className="min-h-12 w-full rounded-full border border-line px-5"
          >
            {lang === "pt" ? "Remover" : "Remove"}
          </button>
          <button
            type="button"
            disabled={making || !src}
            onClick={() => {
              const text = prompts.map((p) => p.trim()).filter(Boolean).join(". ");
              if (!src || text.length < 3) return;
              setMaking(true);
              void makeStill({ data: { prompt: text, imageUrl: src } })
                .then((res) => setMade(res.url))
                .catch(() => setMade(""))
                .finally(() => setMaking(false));
            }}
            className="min-h-12 w-full rounded-full border border-gold px-5 text-gold"
          >
            {making ? "…" : lang === "pt" ? "Gerar imagem" : "Generate image"}
          </button>
        </div>
      </div>
      {made && <img src={made} alt="" className="max-h-96 w-full rounded-2xl object-contain" />}
      <button
        type="button"
        onClick={() => setImprove((v) => !v)}
        className={`min-h-11 w-fit rounded-full px-5 ${improve ? "bg-gold text-gold-ink" : "bg-surface text-fg"}`}
      >
        {t.sharp}
      </button>
      {improve && <Slider label={t.sharp} value={sharp} max={40} onChange={setSharp} />}
      <button
        type="button"
        onClick={() => setCropOn((v) => !v)}
        className={`min-h-11 w-fit rounded-full px-5 ${cropOn ? "bg-gold text-gold-ink" : "bg-surface text-fg"}`}
      >
        {t.crop}
      </button>
      {cropOn && (
        <div className="grid gap-3">
          <p className="text-sm text-muted">{t.cropHint}</p>
          <Slider label={lang === "pt" ? "Topo" : "Top"} value={crop.t} max={35} onChange={(n) => setCrop({ ...crop, t: n })} />
          <Slider label={lang === "pt" ? "Base" : "Bottom"} value={crop.b} max={35} onChange={(n) => setCrop({ ...crop, b: n })} />
          <Slider label={lang === "pt" ? "Esquerda" : "Left"} value={crop.l} max={35} onChange={(n) => setCrop({ ...crop, l: n })} />
          <Slider label={lang === "pt" ? "Direita" : "Right"} value={crop.r} max={35} onChange={(n) => setCrop({ ...crop, r: n })} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setReplaceBg((v) => !v)}
        className={`min-h-11 w-fit rounded-full px-5 ${replaceBg ? "bg-gold text-gold-ink" : "bg-surface text-fg"}`}
      >
        {t.replace}
      </button>
      {replaceBg && (
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm">
            {t.bgPrompt}
            <textarea
              value={wish}
              rows={2}
              placeholder={t.bgPlaceholder}
              onChange={(e) => applyWish(e.target.value)}
              className="w-full resize-none rounded-xl border border-line bg-bg px-3 py-3 text-base text-fg outline-none"
            />
          </label>
          <p className="text-sm text-muted">{t.suggestions}</p>
          <div className="flex flex-wrap gap-2">
            {scenes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSceneId(item.id);
                  setWish(lang === "pt" ? item.pt : item.en);
                }}
                className={`min-h-11 rounded-full px-4 text-sm ${sceneId === item.id ? "bg-gold text-gold-ink" : "bg-surface text-fg"}`}
              >
                {lang === "pt" ? item.pt : item.en}
              </button>
            ))}
          </div>
        </div>
      )}
      {src && (
        <button
          type="button"
          className="min-h-11 w-fit rounded-full bg-gold px-5 text-gold-ink"
          onClick={() => {
            const url = canvasRef.current?.toDataURL("image/jpeg", 0.95);
            if (!url) return;
            const a = document.createElement("a");
            a.href = url;
            a.download = "atelier.jpg";
            a.click();
          }}
        >
          {t.download}
        </button>
      )}
    </div>
  );
}

function matchScene(text: string) {
  const q = text.toLowerCase();
  if (/praia|mar|beach|sea/.test(q)) return "sea";
  if (/noite|night|escuro|dark/.test(q)) return "night";
  if (/escrit|office|trabalho/.test(q)) return "office";
  if (/natur|verde|floresta|green|park/.test(q)) return "green";
  if (/dour|gold|quente/.test(q)) return "gold";
  if (/cinza|grey|gray/.test(q)) return "grey";
  if (/branco|estudio|estúdio|studio|white|claro/.test(q)) return "studio";
  return "";
}

function backgroundMask(data: Uint8ClampedArray, w: number, h: number) {
  const corners = [0, w - 1, (h - 1) * w, (h - 1) * w + (w - 1)];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of corners) {
    r += data[p * 4];
    g += data[p * 4 + 1];
    b += data[p * 4 + 2];
  }
  r /= 4;
  g /= 4;
  b /= 4;
  const mask = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  const stack = [0, w - 1, (h - 1) * w, h * w - 1];
  while (stack.length) {
    const p = stack.pop() as number;
    if (seen[p]) continue;
    seen[p] = 1;
    const i = p * 4;
    const dist = Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);
    if (dist > 48) continue;
    mask[p] = 1;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  return mask;
}

function clamp(n: number) {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

function sharpen(data: Uint8ClampedArray, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[i + c];
        const blur =
          (copy[i - 4 + c] +
            copy[i + 4 + c] +
            copy[i - w * 4 + c] +
            copy[i + w * 4 + c] +
            center) /
          5;
        data[i + c] = clamp(center + (center - blur) * amount * 1.6);
      }
    }
  }
}

function Slider({
  label,
  value,
  max = 40,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="grid gap-1 text-sm text-muted">
      {label}
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-gold"
      />
    </label>
  );
}
