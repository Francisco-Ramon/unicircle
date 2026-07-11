
create extension if not exists vector;

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New conversation',
  title_generated boolean not null default false,
  summary text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_user_recent_idx
  on public.conversations (user_id, last_message_at desc);

alter table public.conversations enable row level security;

create policy "own conversations all"
  on public.conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Backfill conversations from existing chat_messages so the FK can be added
insert into public.conversations (id, user_id, title, last_message_at, created_at, updated_at)
select
  cm.conversation_id,
  cm.user_id,
  'Past conversation',
  max(cm.created_at),
  min(cm.created_at),
  max(cm.created_at)
from public.chat_messages cm
where cm.conversation_id is not null
group by cm.conversation_id, cm.user_id
on conflict (id) do nothing;

-- Now add the FK
do $$ begin
  alter table public.chat_messages
    add constraint chat_messages_conversation_fk
    foreign key (conversation_id)
    references public.conversations(id)
    on delete cascade;
exception when duplicate_object then null; end $$;

create index if not exists chat_messages_conversation_created_idx
  on public.chat_messages (conversation_id, created_at);

-- Documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  filename text not null,
  mime_type text,
  size_bytes integer,
  storage_path text not null,
  status text not null default 'ready',
  error text,
  created_at timestamptz not null default now()
);

create index documents_user_idx on public.documents (user_id, created_at desc);
create index documents_conversation_idx on public.documents (conversation_id);

alter table public.documents enable row level security;
create policy "own documents all"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Document chunks
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index document_chunks_document_idx on public.document_chunks (document_id, chunk_index);
create index document_chunks_user_idx on public.document_chunks (user_id);
create index document_chunks_embedding_idx
  on public.document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

alter table public.document_chunks enable row level security;
create policy "own chunks all"
  on public.document_chunks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Similarity search
create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_conversation_id uuid default null,
  match_count int default 6
)
returns table (
  id uuid,
  document_id uuid,
  filename text,
  chunk_index integer,
  content text,
  similarity float
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select
      dc.id,
      dc.document_id,
      d.filename,
      dc.chunk_index,
      dc.content,
      1 - (dc.embedding <=> query_embedding) as similarity
    from public.document_chunks dc
    join public.documents d on d.id = dc.document_id
    where dc.user_id = match_user_id
      and dc.embedding is not null
      and (
        match_conversation_id is null
        or d.conversation_id = match_conversation_id
        or d.conversation_id is null
      )
    order by dc.embedding <=> query_embedding
    limit match_count;
end;
$$;

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists conversations_touch_updated_at on public.conversations;
create trigger conversations_touch_updated_at
  before update on public.conversations
  for each row execute function public.touch_updated_at();

-- Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('chat-files', 'chat-files', false)
on conflict (id) do nothing;

create policy "users read own chat files"
  on storage.objects for select
  using (bucket_id = 'chat-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users upload own chat files"
  on storage.objects for insert
  with check (bucket_id = 'chat-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "users delete own chat files"
  on storage.objects for delete
  using (bucket_id = 'chat-files' and auth.uid()::text = (storage.foldername(name))[1]);
