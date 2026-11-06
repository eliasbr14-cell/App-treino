-- Aplicada no projeto app-treino: registro do aceite dos termos (LGPD).
alter table public.profiles
  add column terms_version text,
  add column terms_accepted_at timestamptz;

create function public.accept_terms(p_version text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'não autenticado'; end if;
  if char_length(coalesce(p_version, '')) not between 1 and 20 then raise exception 'versão inválida'; end if;
  update public.profiles set terms_version = p_version, terms_accepted_at = now() where id = auth.uid();
end;
$$;
revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;
