-- Aplicada no projeto Supabase "app-treino" (sa-east-1).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  username text unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "ver o proprio perfil" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "editar o proprio perfil" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 60));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.user_items (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('workout', 'exercise', 'method', 'history')),
  id text not null check (char_length(id) <= 64),
  data jsonb not null default '{}'::jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index user_items_sync_idx on public.user_items (user_id, updated_at);
alter table public.user_items enable row level security;
create policy "ler os proprios itens" on public.user_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "criar os proprios itens" on public.user_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "alterar os proprios itens" on public.user_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger user_items_touch before insert or update on public.user_items
  for each row execute function public.touch_updated_at();
