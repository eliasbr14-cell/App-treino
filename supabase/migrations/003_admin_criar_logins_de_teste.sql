-- Aplicada no projeto app-treino. Painel de testes: administradores criam contas
-- já confirmadas (sem e-mail), listam contas e definem nova senha.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security; -- sem políticas: ninguém acessa pela API

insert into public.admins (user_id)
select id from auth.users where email = 'eliasviana18@icloud.com';

create function public.am_i_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function public.am_i_admin() from public, anon;
grant execute on function public.am_i_admin() to authenticated;

create function public.admin_create_user(p_email text, p_password text, p_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not public.am_i_admin() then raise exception 'apenas administradores'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'e-mail inválido'; end if;
  if char_length(coalesce(p_password, '')) < 6 then raise exception 'senha precisa de pelo menos 6 caracteres'; end if;
  if exists (select 1 from auth.users where email = v_email) then raise exception 'esse e-mail já tem conta'; end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, phone_change, phone_change_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', left(coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)), 60)),
    now(), now(), '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id,
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
          'email', now(), now(), now());
  return v_id;
end;
$$;
revoke execute on function public.admin_create_user(text, text, text) from public, anon;
grant execute on function public.admin_create_user(text, text, text) to authenticated;

create function public.admin_list_users()
returns table (id uuid, email text, name text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.am_i_admin() then raise exception 'apenas administradores'; end if;
  return query
    select u.id, u.email::text, p.name, u.created_at, u.last_sign_in_at
    from auth.users u left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;
revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create function public.admin_set_password(p_user uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.am_i_admin() then raise exception 'apenas administradores'; end if;
  if char_length(coalesce(p_password, '')) < 6 then raise exception 'senha precisa de pelo menos 6 caracteres'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
  where id = p_user;
end;
$$;
revoke execute on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
