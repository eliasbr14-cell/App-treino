-- Aplicada no projeto app-treino.
create function public.set_recovery_email(p_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if v_email = '' then
    delete from public.user_contacts where user_id = auth.uid();
    return;
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then raise exception 'e-mail inválido'; end if;
  insert into public.user_contacts (user_id, email) values (auth.uid(), v_email)
  on conflict (user_id) do update set email = excluded.email, created_at = now();
end;
$$;
revoke execute on function public.set_recovery_email(text) from public, anon;
grant execute on function public.set_recovery_email(text) to authenticated;

create table public.recovery_log (
  id bigint generated always as identity primary key,
  username text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index recovery_log_recent_idx on public.recovery_log (created_at);
alter table public.recovery_log enable row level security; -- só a Edge Function (service role)
