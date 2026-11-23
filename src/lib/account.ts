import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

const OWNER_EMAIL = "manumendes199514@gmail.com";
const PRICE = 1599;

type AccountRow = {
  user_id: string;
  trial_started: string;
  plan: string;
  paid_until: string | null;
  api_key: string | null;
  api_base: string;
  api_model: string;
};

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

async function isOwner(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ email: string }>`select email from "user" where id = ${userId}`;
  return (rows[0]?.email || "").toLowerCase() === OWNER_EMAIL;
}
async function loadAccount(userId: string) {
  const sql = await getSql();
  await sql`insert into atelier_accounts (user_id) values (${userId}) on conflict (user_id) do nothing`;
  const rows = await sql<AccountRow>`select user_id, trial_started::text, plan, paid_until::text, api_key, api_base, api_model from atelier_accounts where user_id = ${userId}`;
  return rows[0];
}

function accessOf(row: AccountRow, owner: boolean) {
  const started = new Date(row.trial_started).getTime();
  const trialLeft = Math.max(0, TRIAL_MS - (Date.now() - started));
  const paid = owner || (row.plan === "active" && !!row.paid_until && new Date(row.paid_until).getTime() > Date.now());
  return {
    allowed: owner || paid || trialLeft > 0,
    paid,
    owner,
    trialHoursLeft: owner ? 0 : Math.ceil(trialLeft / 36e5),
    price: "£15.99",
    hasKey: Boolean(row.api_key),
    apiBase: row.api_base,
    apiModel: row.api_model,
  };
}

export const getAccess = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const row = await loadAccount(context.userId);
    return accessOf(row, await isOwner(context.userId));
  });

export const saveApiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { apiKey: string; apiBase: string; apiModel: string }) => ({
    apiKey: input.apiKey.trim(),
    apiBase: (input.apiBase || "https://api.x.ai/v1").trim().replace(/\/$/, ""),
    apiModel: (input.apiModel || "grok-3").trim(),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await loadAccount(context.userId);
    if (data.apiKey) {
      await sql`update atelier_accounts set api_key = ${data.apiKey}, api_base = ${data.apiBase}, api_model = ${data.apiModel} where user_id = ${context.userId}`;
    } else {
      await sql`update atelier_accounts set api_base = ${data.apiBase}, api_model = ${data.apiModel} where user_id = ${context.userId}`;
    }
    return { ok: true };
  });

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((origin: string) => origin)
  .handler(async ({ context, data: origin }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { url: "", error: "Add STRIPE_SECRET_KEY on the host to take payment." };
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${origin}/`);
    params.set("client_reference_id", context.userId);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", "gbp");
    params.set("line_items[0][price_data][unit_amount]", String(PRICE));
    params.set("line_items[0][price_data][recurring][interval]", "month");
    params.set("line_items[0][price_data][product_data][name]", "Atelier");
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const body = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !body.url) return { url: "", error: body.error?.message || "Stripe refused the checkout." };
    return { url: body.url, error: "" };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((sessionId: string) => sessionId)
  .handler(async ({ context, data: sessionId }) => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || !sessionId.startsWith("cs_")) return { ok: false };
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = (await res.json()) as { payment_status?: string; client_reference_id?: string; status?: string };
    if (body.client_reference_id !== context.userId) return { ok: false };
    if (body.status !== "complete" && body.payment_status !== "paid") return { ok: false };
    const until = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString();
    const sql = await getSql();
    await sql`update atelier_accounts set plan = 'active', paid_until = ${until} where user_id = ${context.userId}`;
    return { ok: true };
  });

export const writeWithKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { prompt: string }) => ({ prompt: input.prompt.slice(0, 4000) }))
  .handler(async ({ context, data }) => {
    const row = await loadAccount(context.userId);
    const access = accessOf(row, await isOwner(context.userId));
    if (!access.allowed) return { text: "", error: "trial_ended" };
    if (!row.api_key) return { text: "", error: "no_key" };
    const res = await fetch(`${row.api_base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${row.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: row.api_model,
        messages: [
          {
            role: "system",
            content:
              "You write premium short-form and long-form content. Never invent that a face was altered. Reply in the user's language. Plain text, no markdown fences.",
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });
    if (!res.ok) return { text: "", error: "The model refused the key or the base URL." };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: body.choices?.[0]?.message?.content || "", error: "" };
  });

export const startClip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { prompt: string; imageUrl: string }) => {
    const prompt = input.prompt.trim().slice(0, 500);
    const imageUrl = input.imageUrl.trim();
    if (prompt.length < 3) throw new Error("Say what you want.");
    const ok = imageUrl.startsWith("https://") || imageUrl.startsWith("data:image/");
    if (!ok || imageUrl.length > 1_800_000) throw new Error("Use the uploaded picture.");
    return { prompt, imageUrl };
  })
  .handler(async ({ context, data }) => {
    const row = await loadAccount(context.userId);
    const access = accessOf(row, await isOwner(context.userId));
    if (!access.allowed) return { id: "", error: "trial_ended" };
    const key = process.env.XAI_API_KEY;
    if (!key) return { id: "", error: "Video render is not turned on for this host." };
    const res = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-imagine-video-1.5",
        prompt: `${data.prompt}. Keep the person's face and body the same unless the request explicitly asks to change them. High detail, steady camera, clean light.`,
        image: { url: data.imageUrl },
        duration: 8,
        resolution: "1080p",
      }),
    });
    const body = (await res.json()) as { request_id?: string; error?: { message?: string } };
    if (!res.ok || !body.request_id) return { id: "", error: body.error?.message || "The video service refused the picture." };
    return { id: body.request_id, error: "" };
  });

export const clipStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: string) => {
    if (!/^[\w-]{8,}$/.test(id)) throw new Error("Bad id.");
    return id;
  })
  .handler(async ({ data: id }) => {
    const key = process.env.XAI_API_KEY;
    if (!key) return { status: "failed", url: "", error: "Video render is not turned on for this host." };
    const res = await fetch(`https://api.x.ai/v1/videos/${id}`, { headers: { Authorization: `Bearer ${key}` } });
    const body = (await res.json()) as { status?: string; video?: { url?: string }; error?: { message?: string } };
    if (!res.ok) return { status: "failed", url: "", error: body.error?.message || "Could not check the video." };
    return { status: body.status || "pending", url: body.video?.url || "", error: "" };
  });

async function studioKey(userId: string) {
  const row = await loadAccount(userId);
  const access = accessOf(row, await isOwner(userId));
  if (!access.allowed) return { key: "", error: "trial_ended" };
  const key = process.env.XAI_API_KEY;
  if (!key) return { key: "", error: "This render is not turned on for this host." };
  return { key, error: "" };
}

export const makeStill = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { prompt: string; imageUrl: string }) => {
    const prompt = input.prompt.trim().slice(0, 500);
    const imageUrl = input.imageUrl.trim();
    if (prompt.length < 3) throw new Error("Say what you want.");
    if ((!imageUrl.startsWith("data:image/") && !imageUrl.startsWith("https://")) || imageUrl.length > 1_800_000) {
      throw new Error("Use the uploaded picture.");
    }
    return { prompt, imageUrl };
  })
  .handler(async ({ context, data }) => {
    const gate = await studioKey(context.userId);
    if (!gate.key) return { url: "", error: gate.error };
    const res = await fetch("https://api.x.ai/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${gate.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-imagine-image-2.0",
        prompt: `Premium social ad still. ${data.prompt}. Keep the product and the person's face and body unchanged unless the request explicitly asks to change them. Clean light, high detail.`,
        image: { url: data.imageUrl, type: "image_url" },
      }),
    });
    const body = (await res.json()) as { url?: string; data?: { url?: string }[]; error?: { message?: string } };
    const url = body.url || body.data?.[0]?.url || "";
    if (!res.ok || !url) return { url: "", error: body.error?.message || "The image service refused the picture." };
    return { url, error: "" };
  });

export const makeCopy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { prompt: string }) => {
    const prompt = input.prompt.trim().slice(0, 500);
    if (prompt.length < 3) throw new Error("Say what you want.");
    return { prompt };
  })
  .handler(async ({ context, data }) => {
    const gate = await studioKey(context.userId);
    if (!gate.key) return { text: "", error: gate.error };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${gate.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "Write a social ad pack in the user's language: one hook, one caption, one call to action. Plain text. Do not say the face was changed.",
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    const text = body.choices?.[0]?.message?.content || "";
    if (!res.ok || !text) return { text: "", error: body.error?.message || "The copy service refused." };
    return { text, error: "" };
  });
