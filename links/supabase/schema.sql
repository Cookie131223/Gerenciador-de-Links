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
