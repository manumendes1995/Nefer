import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;
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

async function loadAccount(userId: string) {
  const sql = await getSql();
  await sql`insert into atelier_accounts (user_id) values (${userId}) on conflict (user_id) do nothing`;
  const rows = await sql<AccountRow>`select user_id, trial_started::text, plan, paid_until::text, api_key, api_base, api_model from atelier_accounts where user_id = ${userId}`;
  return rows[0];
}

function accessOf(row: AccountRow) {
  const started = new Date(row.trial_started).getTime();
  const trialLeft = Math.max(0, TRIAL_MS - (Date.now() - started));
  const paid = row.plan === "active" && !!row.paid_until && new Date(row.paid_until).getTime() > Date.now();
  return {
    allowed: paid || trialLeft > 0,
    paid,
    trialHoursLeft: Math.ceil(trialLeft / 36e5),
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
    return accessOf(row);
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
    const access = accessOf(row);
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
