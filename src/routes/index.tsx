import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Aperture,
  Clapperboard,
  Flame,
  ImagePlus,
  Languages,
  Sparkles,
  Timer,
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
import { confirmCheckout, getAccess, saveApiKey, startCheckout, writeWithKey } from "@/lib/account";

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

type Tool = "hooks" | "short" | "long" | "viral" | "all" | "photo";

const copy = {
  en: {
    kicker: "Premium studio",
    title: "Hooks, films, and pictures that hold attention.",
    sub: "Write the open. Cut the short. Structure the long. Grade the still.",
    topic: "What is this about?",
    placeholder: "A skincare routine that actually fits a workday",
    platform: "Platform",
    length: "Length",
    make: "Make it",
    copy: "Copy",
    copied: "Copied",
    all: "Full pack",
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
    title: "Hooks, filmes e fotos que seguram a atenção.",
    sub: "Escreve a abertura. Corta o curto. Estrutura o longo. Trata a foto.",
    topic: "Sobre o quê?",
    placeholder: "Uma rotina de pele que cabe num dia de trabalho",
    platform: "Plataforma",
    length: "Duração",
    make: "Criar",
    copy: "Copiar",
    copied: "Copiado",
    all: "Pacote completo",
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
  { id: "hooks", icon: Type },
  { id: "short", icon: Timer },
  { id: "long", icon: Clapperboard },
  { id: "viral", icon: Flame },
  { id: "all", icon: Sparkles },
  { id: "photo", icon: Aperture },
];

const backdrops = ["#1a140c", "#d6a15a", "#2c3a34", "#6e2e2a", "#e7e1d6", "#1d2a44"];

function Studio() {
  const { user, isPending } = useCurrentUserState();
  const [lang, setLang] = useState<Lang>("en");
  const [tool, setTool] = useState<Tool>("hooks");
  const [topic, setTopic] = useState("A skin routine for people who work all day");
  const [platform, setPlatform] = useState<Platform>("reels");
  const [seconds, setSeconds] = useState<15 | 30 | 60>(30);
  const [note, setNote] = useState("");
  const [access, setAccess] = useState<{ allowed: boolean; paid: boolean; trialHoursLeft: number; hasKey: boolean } | null>(null);
  const [modelText, setModelText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("https://api.x.ai/v1");
  const [apiModel, setApiModel] = useState("grok-3");
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
  if (!user) return <Navigate to="/login" />;
  if (access && !access.allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
        <div className="w-full max-w-md">
          <p className="font-display text-4xl text-gold">Nefer</p>
          <h1 className="mt-3 font-display text-3xl">{lang === "pt" ? "O teste de 3 dias acabou." : "The 3-day trial is over."}</h1>
          <p className="mt-2 text-muted">£15.99 / {lang === "pt" ? "mês" : "month"}</p>
          <button
            type="button"
            className="mt-6 min-h-11 rounded-full bg-gold px-5 text-gold-ink"
            onClick={() => {
              window.location.href = "https://buy.stripe.com/eVq4gAcTh1g45Db9v3eEo03";
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
    <main className="min-h-screen overflow-x-hidden bg-bg pb-24 text-fg md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 md:grid-cols-[220px_1fr] md:px-8 md:py-10">
        <aside className="flex flex-col gap-6">
          <div>
            <p className="font-display text-2xl text-gold">Nefer</p>
            <p className="mt-1 text-sm text-muted">{t.kicker}</p>
            {access && (
              <p className="mt-2 text-xs text-gold">
                {access.paid
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
          <header className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl leading-tight md:text-5xl">{t.title}</h1>
              <p className="mt-3 max-w-xl text-muted">{t.sub}</p>
            </div>
            <div className="flex shrink-0 rounded-full border border-line bg-surface p-1">
              <button type="button" onClick={() => setLanguage("en")} className={`min-h-11 rounded-full px-4 text-sm ${lang === "en" ? "bg-gold text-gold-ink" : "text-muted"}`}>English</button>
              <button type="button" onClick={() => setLanguage("pt")} className={`min-h-11 rounded-full px-4 text-sm ${lang === "pt" ? "bg-gold text-gold-ink" : "text-muted"}`}>Português</button>
            </div>
          </header>
          <div className="grid gap-2 rounded-2xl border border-line p-4 text-sm">
            <p className="text-muted">
              {lang === "pt"
                ? "Chave opcional. Sem ela, o estúdio escreve aqui. Com ela, pede ao modelo. A foto nunca passa pela chave."
                : "Optional key. Without it, the studio writes here. With it, the model writes. Photos never use the key."}
            </p>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API key"
              type="password"
              className="min-h-11 rounded-xl border border-line bg-bg px-3"
            />
            <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} className="min-h-11 rounded-xl border border-line bg-bg px-3" />
            <input value={apiModel} onChange={(e) => setApiModel(e.target.value)} className="min-h-11 rounded-xl border border-line bg-bg px-3" />
            <button
              type="button"
              className="min-h-11 w-fit rounded-full bg-surface px-4"
              onClick={() => saveApiKey({ data: { apiKey, apiBase, apiModel } }).then(() => setNote(lang === "pt" ? "Chave guardada" : "Key saved"))}
            >
              {lang === "pt" ? "Guardar chave" : "Save key"}
            </button>
          </div>
          {modelText && <pre className="whitespace-pre-wrap rounded-2xl bg-surface p-4 text-sm">{modelText}</pre>}

          {tool !== "photo" ? (
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
                      return;
                    }
                    setModelText("");
                    try {
                      await navigator.clipboard.writeText(local);
                      setNote(t.copied);
                    } catch {
                      setNote(local.slice(0, 80));
                    }
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {note || t.copy}
                </button>
              </div>
            </form>
          ) : (
            <PhotoLab lang={lang} />
          )}

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
        </section>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 overflow-x-auto border-t border-line bg-bg px-2 py-2 md:hidden">
        {tools.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTool(item.id)}
            className={`flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs ${
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

const scenes = [
  { id: "studio", pt: "Estúdio branco", en: "White studio", a: "#f7f1e8", b: "#e4d9c8" },
  { id: "grey", pt: "Cinza suave", en: "Soft grey", a: "#e6e1da", b: "#b7b1a8" },
  { id: "gold", pt: "Dourado", en: "Gold", a: "#f0e2c4", b: "#d6a15a" },
  { id: "night", pt: "Noite", en: "Night", a: "#241c16", b: "#0e0d0b" },
  { id: "sea", pt: "Praia", en: "Beach", a: "#9fd0de", b: "#f0e2c4" },
  { id: "office", pt: "Escritório", en: "Office", a: "#d5ddd8", b: "#7f978c" },
  { id: "green", pt: "Natureza", en: "Nature", a: "#d5e2c4", b: "#6e8f62" },
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
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gold">
        <ImagePlus className="h-4 w-4" />
        {t.upload}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
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
