export type Lang = "en" | "pt";
export type Platform = "tiktok" | "reels" | "shorts" | "youtube" | "linkedin";

const openers = {
  en: [
    "Want to stay on social media? The first line decides it.",
    "Everything your videos need to get engagement starts here.",
    "People leave in two seconds. This is the line that keeps them.",
    "Engagement is not luck. It is the opening.",
    "If the scroll wins, the hook was too quiet.",
  ],
  pt: [
    "Queres ficar nas redes sociais? A primeira frase decide.",
    "Tudo o que os teus vídeos precisam para ter engajamento começa aqui.",
    "As pessoas saem em dois segundos. Esta é a frase que as segura.",
    "Engajamento não é sorte. É a abertura.",
    "Se o dedo passa, o gancho foi demasiado fraco.",
  ],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function seedOf(text: string) {
  return [...text].reduce((n, c) => n + c.charCodeAt(0), 0);
}

export function makeHooks(topic: string, lang: Lang, platform: Platform) {
  const s = seedOf(topic + platform);
  const base = topic.trim() || (lang === "pt" ? "o teu tema" : "your topic");
  const patterns =
    lang === "pt"
      ? [
          `Queres ficar nas redes com ${base}? Começa assim.`,
          `Tudo o que ${base} precisa para ter engajamento.`,
          `As pessoas passam ${base}. Esta frase fá-las parar.`,
          `O teu vídeo de ${base} morre sem este gancho.`,
          `Queres comentários em ${base}? Diz isto primeiro.`,
          `Engajamento em ${base} cabe numa frase.`,
          `Se queres que ${base} fique no ecrã, abre com isto.`,
          `Para de publicar ${base} sem uma razão para ficar.`,
        ]
      : [
          `Want to stay on socials with ${base}? Start like this.`,
          `Everything ${base} needs to get engagement.`,
          `People scroll past ${base}. This line stops them.`,
          `Your ${base} video dies without this hook.`,
          `Want comments on ${base}? Say this first.`,
          `Engagement for ${base} fits in one line.`,
          `If you want ${base} to stay on screen, open with this.`,
          `Stop posting ${base} with nothing to hold them.`,
        ];
  return patterns.map((line, i) => ({
    line,
    why: pick(openers[lang], s + i),
    score: 86 + ((s + i * 3) % 12),
  }));
}

export function label(platform: Platform, lang: Lang) {
  const map = {
    tiktok: "TikTok",
    reels: "Reels",
    shorts: "Shorts",
    youtube: "YouTube",
    linkedin: "LinkedIn",
  } as const;
  return map[platform];
}

export function shortScript(topic: string, lang: Lang, seconds: 15 | 30 | 60, platform: Platform) {
  const base = topic.trim() || (lang === "pt" ? "o tema" : "the topic");
  const hook = makeHooks(base, lang, platform)[0].line;
  if (lang === "pt") {
    return {
      hook,
      beats: [
        { t: "0–2s", shot: "Cara perto da câmara, sem intro.", line: hook },
        { t: seconds <= 15 ? "2–8s" : "2–12s", shot: "Mostra o problema em ação.", line: `Isto é o que acontece quando ignoras ${base}.` },
        { t: seconds <= 15 ? "8–13s" : "12–40s", shot: "Corte seco para a solução.", line: `Faz assim: um passo claro sobre ${base}, sem enrolar.` },
        { t: seconds <= 15 ? "13–15s" : `${seconds - 8}–${seconds}s`, shot: "Texto grande + olhar para a câmara.", line: "Guarda isto. Vais precisar amanhã." },
      ],
      caption: `${hook}\n\n${base} — versão curta, sem floreados.\n\n#conteudo #${platform}`,
    };
  }
  return {
    hook,
    beats: [
      { t: "0–2s", shot: "Face close, no intro card.", line: hook },
      { t: seconds <= 15 ? "2–8s" : "2–12s", shot: "Show the problem happening.", line: `This is what happens when you ignore ${base}.` },
      { t: seconds <= 15 ? "8–13s" : "12–40s", shot: "Hard cut to the fix.", line: `Do it like this: one clear step on ${base}.` },
      { t: seconds <= 15 ? "13–15s" : `${seconds - 8}–${seconds}s`, shot: "Big type, eye contact.", line: "Save this. You will need it tomorrow." },
    ],
    caption: `${hook}\n\n${base} — short cut, no fluff.\n\n#content #${platform}`,
  };
}

export function longScript(topic: string, lang: Lang) {
  const base = topic.trim() || (lang === "pt" ? "o tema" : "the topic");
  if (lang === "pt") {
    return [
      { title: "Abertura", time: "0:00", body: `Promessa: no fim sabes exatamente como usar ${base} sem parecer genérico.` },
      { title: "O erro caro", time: "0:40", body: `A maior parte das pessoas começa ${base} pela ferramenta. Começa pela tensão.` },
      { title: "O método", time: "2:10", body: `Três blocos: gancho, prova, pedido. Um exemplo real de ${base} em cada bloco.` },
      { title: "Demonstração", time: "5:00", body: `Mostra o antes e o depois. Corta tudo o que não muda a decisão de quem vê.` },
      { title: "Fecho", time: "8:30", body: `Resume num frase. Diz o próximo passo. Não peças like — pede uma ação útil.` },
    ];
  }
  return [
    { title: "Open", time: "0:00", body: `Promise: by the end you can use ${base} without sounding generic.` },
    { title: "The expensive mistake", time: "0:40", body: `Most people start ${base} with the tool. Start with the tension.` },
    { title: "The method", time: "2:10", body: `Three blocks: hook, proof, ask. One real example of ${base} in each.` },
    { title: "Demonstration", time: "5:00", body: `Show before and after. Cut anything that does not change the viewer's decision.` },
    { title: "Close", time: "8:30", body: `One-line recap. Name the next step. Do not beg for a like — ask for a useful action.` },
  ];
}

export function viralPack(topic: string, lang: Lang, platform: Platform) {
  const hooks = makeHooks(topic, lang, platform).slice(0, 3);
  const base = topic.trim() || (lang === "pt" ? "isto" : "this");
  const tags =
    lang === "pt"
      ? ["#viral", "#criadores", "#reels", "#dicas", `#${platform}`]
      : ["#viral", "#creators", "#reels", "#tips", `#${platform}`];
  return {
    hooks,
    caption:
      lang === "pt"
        ? `${hooks[0].line}\n\nGuarda ${base} para quando fores gravar. Parte 2 se pedires nos comentários.`
        : `${hooks[0].line}\n\nSave ${base} for the next time you hit record. Part 2 if you ask.`,
    tags,
    thumbnail: lang === "pt" ? `NÃO FAÇAS ${base.toUpperCase()} ASSIM` : `STOP DOING ${base.toUpperCase()} LIKE THIS`,
  };
}
