-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor
-- → New query → paste this whole file → Run) to set up everything Disko
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
alter table public.logs add column if not exists with_user_ids uuid[];

alter table public.logs enable row level security;

-- Rankings are social: any signed-in user can read anyone's logs (the
-- People page and profiles). Only the owner can add or delete them.
drop policy if exists "Users can view their own logs" on public.logs;
drop policy if exists "Signed-in users can view all logs" on public.logs;
create policy "Signed-in users can view all logs"
  on public.logs for select
  to authenticated
  using (true);

create index if not exists logs_user_id_created_at_idx on public.logs (user_id, created_at);
create index if not exists logs_created_at_idx on public.logs (created_at desc);

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

-- Public display names, so "who were you with?" can suggest other Disko
-- users. Deliberately just the name — never the email — and only visible
-- to signed-in users. Filled in automatically for every new sign-up by
-- the trigger below, and backfilled once for existing accounts.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Signed-in users can see profiles" on public.profiles;
create policy "Signed-in users can see profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Usernames: unique, 3–20 lowercase letters, numbers, "_" or ".".
-- display_name is kept equal to the username, so everywhere that shows a
-- name shows the username. Accounts from before usernames have none yet
-- and get asked to pick one in the app.
alter table public.profiles add column if not exists username text;
do $$
begin
  alter table public.profiles
    add constraint profiles_username_format check (username is null or username ~ '^[a-z0-9_.]{3,20}$');
exception when duplicate_object then null;
end $$;
create unique index if not exists profiles_username_key on public.profiles (username);

-- Lets the sign-up screen check a username before an account exists.
create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(trim(candidate)) ~ '^[a-z0-9_.]{3,20}$'
    and not exists (select 1 from public.profiles where username = lower(trim(candidate)));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uname text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
begin
  -- A taken or malformed username never blocks sign-up: the account is
  -- created without one and the app asks them to pick another.
  if uname !~ '^[a-z0-9_.]{3,20}$' or exists (select 1 from public.profiles where username = uname) then
    uname := null;
  end if;
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(uname, nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'Disko user'),
    uname
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(nullif(trim(raw_user_meta_data ->> 'name'), ''), 'Disko user')
from auth.users
on conflict (id) do nothing;

-- ============================================================
-- Plus-ones (friends). One row per pair: whoever asked is the requester.
-- Pending until the other person accepts; either side can remove it.
-- ============================================================
create table if not exists public.friendships (
  requester uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

alter table public.friendships enable row level security;

drop policy if exists "See your own plus-ones" on public.friendships;
create policy "See your own plus-ones"
  on public.friendships for select
  to authenticated
  using (auth.uid() in (requester, addressee));

drop policy if exists "Send plus-one requests" on public.friendships;
create policy "Send plus-one requests"
  on public.friendships for insert
  to authenticated
  with check (requester = auth.uid() and status = 'pending');

drop policy if exists "Accept plus-one requests" on public.friendships;
create policy "Accept plus-one requests"
  on public.friendships for update
  to authenticated
  using (addressee = auth.uid())
  with check (addressee = auth.uid() and status = 'accepted');

drop policy if exists "Remove plus-ones" on public.friendships;
create policy "Remove plus-ones"
  on public.friendships for delete
  to authenticated
  using (auth.uid() in (requester, addressee));

-- ============================================================
-- Crews (groups). Anyone signed in can see crews and who's in them (the
-- Crews chart is public); members invite people, invitees join or decline.
-- ============================================================
create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  color int not null default 0,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- A crew's photo (shown as the label on its record). Path in the
-- "crew-photos" bucket, always inside that crew's own folder.
alter table public.crews add column if not exists photo_path text;
do $$
begin
  alter table public.crews
    add constraint crews_photo_path_own_folder
    check (photo_path is null or (split_part(photo_path, '/', 1) = id::text and photo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'));
exception when duplicate_object then null;
end $$;

create table if not exists public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'member')),
  invited_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create index if not exists crew_members_user_id_idx on public.crew_members (user_id);

-- Checked from crew_members' own policies, so it runs as the definer to
-- avoid policy recursion.
create or replace function public.is_crew_member(crew uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.crew_members
    where crew_id = crew and user_id = auth.uid() and status = 'member'
  );
$$;

alter table public.crews enable row level security;
alter table public.crew_members enable row level security;

drop policy if exists "Signed-in users can see crews" on public.crews;
create policy "Signed-in users can see crews"
  on public.crews for select
  to authenticated
  using (true);

drop policy if exists "Start a crew" on public.crews;
create policy "Start a crew"
  on public.crews for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Members can rename their crew" on public.crews;
create policy "Members can rename their crew"
  on public.crews for update
  to authenticated
  using (public.is_crew_member(id));

drop policy if exists "Creator can delete their crew" on public.crews;
create policy "Creator can delete their crew"
  on public.crews for delete
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "Signed-in users can see crew members" on public.crew_members;
create policy "Signed-in users can see crew members"
  on public.crew_members for select
  to authenticated
  using (true);

-- Either the creator adding themselves as the first member, or a member
-- inviting someone else.
drop policy if exists "Join your new crew or invite people" on public.crew_members;
create policy "Join your new crew or invite people"
  on public.crew_members for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and (
      (
        user_id = auth.uid()
        and status = 'member'
        and exists (select 1 from public.crews c where c.id = crew_id and c.created_by = auth.uid())
      )
      or (status = 'invited' and public.is_crew_member(crew_id))
    )
  );

drop policy if exists "Accept a crew invite" on public.crew_members;
create policy "Accept a crew invite"
  on public.crew_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status = 'member');

drop policy if exists "Leave or decline a crew" on public.crew_members;
create policy "Leave or decline a crew"
  on public.crew_members for delete
  to authenticated
  using (user_id = auth.uid() or public.is_crew_member(crew_id));

-- ============================================================
-- Spins: points for logging. Keep in sync with src/lib/spins.ts.
--   10 per set, +5 with a note, +5 with photos/videos,
--   +5 for every different artist you've logged.
-- ============================================================
create or replace view public.spins_board
with (security_invoker = true) as
select
  p.id as user_id,
  p.display_name,
  count(l.id)::int as set_count,
  (
    count(l.id) * 10
    + count(l.id) filter (where nullif(trim(l.note), '') is not null) * 5
    + count(l.id) filter (where coalesce(cardinality(l.media_paths), 0) > 0) * 5
    + count(distinct lower(trim(l.artist))) * 5
  )::int as spins
from public.profiles p
left join public.logs l on l.user_id = p.id
group by p.id, p.display_name;

create or replace view public.crew_board
with (security_invoker = true) as
select
  c.id as crew_id,
  c.name,
  c.color,
  count(m.user_id)::int as member_count,
  coalesce(sum(s.spins), 0)::int as spins,
  c.photo_path
from public.crews c
left join public.crew_members m on m.crew_id = c.id and m.status = 'member'
left join public.spins_board s on s.user_id = m.user_id
group by c.id, c.name, c.color, c.photo_path;

grant select on public.spins_board, public.crew_board to authenticated;

-- ============================================================
-- Your city, for "Playing near you" on Discover. Just a place name you
-- type (e.g. "Miami, FL") — never a precise location.
-- ============================================================
alter table public.profiles add column if not exists city text check (city is null or char_length(city) <= 80);

-- ============================================================
-- Profile pictures. Stored in a public "avatars" bucket at
-- "<user id>/<timestamp>.jpg"; the profile keeps just that path (never an
-- arbitrary URL), and it must sit in the owner's own folder.
-- ============================================================
alter table public.profiles add column if not exists avatar_path text;
do $$
begin
  alter table public.profiles
    add constraint profiles_avatar_path_own_folder
    check (avatar_path is null or (split_part(avatar_path, '/', 1) = id::text and avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'));
exception when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Tag invites: when someone tags you in a set, you're invited to rank it
-- too. Dismissing one ("not now") is remembered here.
-- ============================================================
create index if not exists logs_with_user_ids_idx on public.logs using gin (with_user_ids);

create table if not exists public.tag_dismissals (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  log_id uuid not null references public.logs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, log_id)
);

alter table public.tag_dismissals enable row level security;

drop policy if exists "Manage your own tag dismissals" on public.tag_dismissals;
create policy "Manage your own tag dismissals"
  on public.tag_dismissals for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- Delete my account (required by Apple for any app with sign-up).
-- Deleting the auth user cascades to the profile, logs, plus-ones, crew
-- memberships, crews they started and tag dismissals. The app removes the
-- user's photo/video files from Storage first (Storage files must be
-- deleted through the Storage API, not SQL).
-- ============================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- Crew photos. Any member can upload or remove their crew's photo; files
-- live at "<crew id>/<timestamp>.jpg".
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('crew-photos', 'crew-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Crew members can upload the crew photo" on storage.objects;
create policy "Crew members can upload the crew photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'crew-photos'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        then public.is_crew_member(((storage.foldername(name))[1])::uuid)
      else false
    end
  );

drop policy if exists "Crew members can remove the crew photo" on storage.objects;
create policy "Crew members can remove the crew photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'crew-photos'
    and case
      when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
        then public.is_crew_member(((storage.foldername(name))[1])::uuid)
      else false
    end
  );
