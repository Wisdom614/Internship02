-- Run after admin-access.sql. Profiles hold moderation state outside auth.users.
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_verified boolean not null default false,
  suspended boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.user_profiles (user_id)
select id from auth.users on conflict (user_id) do nothing;

create or replace function public.create_user_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.user_profiles (user_id) values (new.id) on conflict (user_id) do nothing; return new; end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute procedure public.create_user_profile();

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 160),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.admin_messages enable row level security;
drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile" on public.user_profiles for select using (auth.uid() = user_id);
drop policy if exists "Administrators manage profiles" on public.user_profiles;
create policy "Administrators manage profiles" on public.user_profiles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users read own messages" on public.admin_messages;
create policy "Users read own messages" on public.admin_messages for select using (auth.uid() = recipient_id or public.is_admin());
drop policy if exists "Administrators send messages" on public.admin_messages;
create policy "Administrators send messages" on public.admin_messages for insert with check (public.is_admin() and sender_id = auth.uid());
