-- Run this once in your Supabase project's SQL Editor (Dashboard →
-- SQL Editor → New query → paste this whole file → Run) to set up the
-- table Encore stores logged sets in.
--
-- Row Level Security (RLS) is what makes this safe to use the public
-- "anon" key in the browser: Postgres itself enforces that every row a
-- signed-in user can see or touch belongs to them, no matter what the
-- client-side code does or doesn't check.

create extension if not exists pgcrypto;

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  artist text not null,
  event text not null,
  date date not null,
  labels text[],
  with_who text,
  note text,
  bucket text not null check (bucket in ('loved', 'good', 'not')),
  score numeric not null,
  venue_bucket text check (venue_bucket in ('loved', 'good', 'not')),
  venue_score numeric,
  created_at timestamptz not null default now()
);

alter table public.logs enable row level security;

create policy "Users can view their own logs"
  on public.logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own logs"
  on public.logs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own logs"
  on public.logs for delete
  using (auth.uid() = user_id);
