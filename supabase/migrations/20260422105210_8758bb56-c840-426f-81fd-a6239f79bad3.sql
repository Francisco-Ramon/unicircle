-- 1) Telegram connections
create table if not exists public.telegram_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  telegram_user_id bigint not null,
  telegram_chat_id bigint not null,
  telegram_username text,
  telegram_first_name text,
  status text not null default 'active',
  linked_at timestamptz not null default now(),
  last_message_at timestamptz,
  conversation_id uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists telegram_connections_user_unique on public.telegram_connections(user_id) where status = 'active';
create unique index if not exists telegram_connections_chat_unique on public.telegram_connections(telegram_chat_id) where status = 'active';

alter table public.telegram_connections enable row level security;

create policy "own telegram connection select" on public.telegram_connections
  for select using (auth.uid() = user_id);
create policy "own telegram connection delete" on public.telegram_connections
  for delete using (auth.uid() = user_id);
create policy "own telegram connection update" on public.telegram_connections
  for update using (auth.uid() = user_id);

-- 2) One-time link codes
create table if not exists public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_codes_code_idx on public.telegram_link_codes(code);
create index if not exists telegram_link_codes_user_idx on public.telegram_link_codes(user_id);

alter table public.telegram_link_codes enable row level security;

create policy "own link codes select" on public.telegram_link_codes
  for select using (auth.uid() = user_id);
create policy "own link codes insert" on public.telegram_link_codes
  for insert with check (auth.uid() = user_id);
create policy "own link codes delete" on public.telegram_link_codes
  for delete using (auth.uid() = user_id);

-- 3) Telegram updates audit log (service-role writes)
create table if not exists public.telegram_updates_log (
  id uuid primary key default gen_random_uuid(),
  telegram_update_id bigint unique,
  telegram_chat_id bigint,
  telegram_user_id bigint,
  payload jsonb,
  status text default 'received',
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.telegram_updates_log enable row level security;
-- No public policies; only service role (used by webhook) can read/write.

-- 4) chat_messages: channel + external id
alter table public.chat_messages
  add column if not exists channel text not null default 'web',
  add column if not exists external_message_id text;

create index if not exists chat_messages_external_id_idx on public.chat_messages(external_message_id) where external_message_id is not null;