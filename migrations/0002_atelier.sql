create table if not exists atelier_accounts (
  user_id text primary key,
  trial_started timestamptz not null default now(),
  plan text not null default 'trial',
  paid_until timestamptz,
  api_key text,
  api_base text not null default 'https://api.x.ai/v1',
  api_model text not null default 'grok-3'
);
