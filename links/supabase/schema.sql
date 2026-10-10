create extension if not exists pgcrypto;

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  url text not null check (char_length(url) between 1 and 2000),
  category text not null check (char_length(category) between 1 and 80),
  created_at timestamptz not null default now()
);

create index if not exists links_user_id_created_at_idx
  on public.links (user_id, created_at desc);

alter table public.links enable row level security;

drop policy if exists "Users can read own links" on public.links;
create policy "Users can read own links"
  on public.links for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own links" on public.links;
create policy "Users can insert own links"
  on public.links for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own links" on public.links;
create policy "Users can update own links"
  on public.links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own links" on public.links;
create policy "Users can delete own links"
  on public.links for delete
  using (auth.uid() = user_id);


create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  content text not null default '',
  category text not null default 'Pessoal' check (char_length(category) between 1 and 60),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_pinned_updated_idx
  on public.notes (user_id, pinned desc, updated_at desc);

alter table public.notes enable row level security;

grant select, insert, update, delete on table public.notes to authenticated;

drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes"
  on public.notes for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes"
  on public.notes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
  on public.notes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
  on public.notes for delete
  to authenticated
  using ((select auth.uid()) = user_id);
