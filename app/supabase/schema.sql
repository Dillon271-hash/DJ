-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor
-- → New query → paste this whole file → Run) to set up everything Encore
-- needs. Safe to re-run any time this file changes — every statement is
-- written to skip cleanly if it's already been applied, so re-running
-- after a pull just applies whatever's new (like media_paths/the
-- set-media bucket below) without erroring on what already exists.
--
-- Row Level Security (RLS) is what makes this safe to use the public
-- "anon" key in the browser: Postgres itself enforces that every row or
-- file a signed-in user can see or touch belongs to them, no matter what
-- the client-side code does or doesn't check.

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

alter table public.logs add column if not exists media_paths text[];

alter table public.logs enable row level security;

drop policy if exists "Users can view their own logs" on public.logs;
create policy "Users can view their own logs"
  on public.logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own logs" on public.logs;
create policy "Users can insert their own logs"
  on public.logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own logs" on public.logs;
create policy "Users can delete their own logs"
  on public.logs for delete
  using (auth.uid() = user_id);

-- Photos/videos attached to a logged set. Public so a plain <img>/<video
-- src> works with no signed-URL dance — write access is still locked
-- down per-user below, this just controls whether *reading* a file
-- requires auth. Files are stored at "<user id>/<random>-<filename>", so
-- the folder-name check in the policies below is what actually enforces
-- "only I can upload/delete into my own folder."
insert into storage.buckets (id, name, public)
values ('set-media', 'set-media', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload their own media" on storage.objects;
create policy "Users can upload their own media"
  on storage.objects for insert
  with check (
    bucket_id = 'set-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own media" on storage.objects;
create policy "Users can delete their own media"
  on storage.objects for delete
  using (
    bucket_id = 'set-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
