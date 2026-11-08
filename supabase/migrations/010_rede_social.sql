-- Tá Pago · Rede social (feed, posts com foto, curtidas, comentários, seguir, bloquear, denunciar)
-- Rodar UMA vez no Supabase: projeto app-treino → SQL Editor → New query → colar tudo → Run.

-- ===== Perfis públicos (só nome, @ e bio; o resto continua privado) =====
alter table public.profiles add column if not exists bio text not null default '' check (char_length(bio) <= 150);
create policy "ver perfis de todos" on public.profiles for select to authenticated using (true);
revoke select on public.profiles from authenticated, anon;
grant select (id, name, username, bio, avatar_url, created_at) on public.profiles to authenticated;
grant update (name, bio) on public.profiles to authenticated;

create or replace function public.my_profile() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('name', name, 'username', username, 'bio', bio,
    'must_change_password', must_change_password, 'terms_version', terms_version)
  from public.profiles where id = auth.uid();
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ===== Bloqueios =====
create table public.blocks (
  blocker uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
create policy "ver meus bloqueios" on public.blocks for select to authenticated using (blocker = (select auth.uid()));
create policy "bloquear" on public.blocks for insert to authenticated with check (blocker = (select auth.uid()));
create policy "desbloquear" on public.blocks for delete to authenticated using (blocker = (select auth.uid()));

create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

create or replace function public.can_post() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and username is not null and terms_version is not null);
$$;
revoke execute on function public.can_post() from public, anon;
grant execute on function public.can_post() to authenticated;

-- ===== Posts =====
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 500),
  photo_path text check (photo_path is null or char_length(photo_path) <= 200),
  workout jsonb check (workout is null or pg_column_size(workout) < 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (photo_path is not null or char_length(caption) > 0)
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_user_idx on public.posts (user_id, created_at desc);
alter table public.posts enable row level security;
create policy "ver posts" on public.posts for select to authenticated using (
  (not hidden or user_id = (select auth.uid()) or (select public.am_i_admin()))
  and not public.is_blocked_between((select auth.uid()), user_id)
);
create policy "postar" on public.posts for insert to authenticated with check (
  user_id = (select auth.uid()) and hidden = false and (select public.can_post())
  and (photo_path is null or photo_path like (select auth.uid())::text || '/%')
);
create policy "apagar post" on public.posts for delete to authenticated using (
  user_id = (select auth.uid()) or (select public.am_i_admin())
);

-- ===== Curtidas =====
create table public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index likes_user_idx on public.likes (user_id);
alter table public.likes enable row level security;
create policy "ver curtidas" on public.likes for select to authenticated using (true);
create policy "curtir" on public.likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "descurtir" on public.likes for delete to authenticated using (user_id = (select auth.uid()));

-- ===== Comentários =====
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_user_idx on public.comments (user_id);
alter table public.comments enable row level security;
create policy "ver comentarios" on public.comments for select to authenticated using (
  not public.is_blocked_between((select auth.uid()), user_id)
);
create policy "comentar" on public.comments for insert to authenticated with check (
  user_id = (select auth.uid()) and (select public.can_post())
);
create policy "apagar comentario" on public.comments for delete to authenticated using (
  user_id = (select auth.uid())
  or exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()))
  or (select public.am_i_admin())
);

-- ===== Seguir =====
create table public.follows (
  follower uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  following uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, following),
  check (follower <> following)
);
create index follows_following_idx on public.follows (following);
alter table public.follows enable row level security;
create policy "ver quem segue" on public.follows for select to authenticated using (true);
create policy "seguir" on public.follows for insert to authenticated with check (follower = (select auth.uid()));
create policy "deixar de seguir" on public.follows for delete to authenticated using (follower = (select auth.uid()));

-- ===== Denúncias: 3 pessoas diferentes escondem o post até o admin revisar =====
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (reporter, post_id)
);
create index reports_post_idx on public.reports (post_id);
alter table public.reports enable row level security;
create policy "denunciar" on public.reports for insert to authenticated with check (reporter = (select auth.uid()));
create policy "admin ve denuncias" on public.reports for select to authenticated using ((select public.am_i_admin()));

create or replace function public.hide_reported_post() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports where post_id = new.post_id) >= 3 then
    update public.posts set hidden = true where id = new.post_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.hide_reported_post() from public, anon, authenticated;
create trigger reports_hide after insert on public.reports
  for each row execute function public.hide_reported_post();

create or replace function public.admin_resolve_post(p_post uuid, p_keep boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.am_i_admin() then raise exception 'apenas administradores'; end if;
  if p_keep then
    update public.posts set hidden = false where id = p_post;
    delete from public.reports where post_id = p_post;
  else
    delete from public.posts where id = p_post;
  end if;
end;
$$;
revoke execute on function public.admin_resolve_post(uuid, boolean) from public, anon;
grant execute on function public.admin_resolve_post(uuid, boolean) to authenticated;

-- ===== Feed (roda como quem pede: respeita bloqueios e posts escondidos) =====
create or replace function public.get_feed(p_before timestamptz default null, p_following boolean default false,
                                p_user uuid default null, p_limit int default 15)
returns table (id uuid, user_id uuid, name text, username text, caption text, photo_path text, workout jsonb,
               hidden boolean, created_at timestamptz, like_count bigint, comment_count bigint, liked boolean)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.user_id, pr.name, pr.username, p.caption, p.photo_path, p.workout, p.hidden, p.created_at,
    (select count(*) from public.likes l where l.post_id = p.id),
    (select count(*) from public.comments c where c.post_id = p.id),
    exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.uid())
  from public.posts p join public.profiles pr on pr.id = p.user_id
  where (p_before is null or p.created_at < p_before)
    and (p_user is null or p.user_id = p_user)
    and (not p_following or p.user_id = auth.uid()
         or exists (select 1 from public.follows f where f.follower = auth.uid() and f.following = p.user_id))
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 15), 1), 50);
$$;
revoke execute on function public.get_feed(timestamptz, boolean, uuid, int) from public, anon;
grant execute on function public.get_feed(timestamptz, boolean, uuid, int) to authenticated;

create or replace function public.profile_stats(p_user uuid) returns json
language sql stable security invoker set search_path = '' as $$
  select json_build_object(
    'posts', (select count(*) from public.posts where user_id = p_user and not hidden),
    'followers', (select count(*) from public.follows where following = p_user),
    'following', (select count(*) from public.follows where follower = p_user),
    'i_follow', exists (select 1 from public.follows where follower = auth.uid() and following = p_user),
    'blocked', exists (select 1 from public.blocks where blocker = auth.uid() and blocked = p_user));
$$;
revoke execute on function public.profile_stats(uuid) from public, anon;
grant execute on function public.profile_stats(uuid) to authenticated;

-- ===== Fotos: bucket privado, só quem está logado vê; cada um envia na própria pasta =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', false, 2097152, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;
create policy "ver fotos dos posts" on storage.objects for select to authenticated
  using (bucket_id = 'posts');
create policy "enviar foto na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "apagar propria foto" on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.am_i_admin())));
