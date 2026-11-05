-- PENDENTE: ainda não aplicada (aguardando confirmação no Supabase).
-- LGPD: o próprio usuário pode apagar a conta e todos os dados dele (cascade).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
