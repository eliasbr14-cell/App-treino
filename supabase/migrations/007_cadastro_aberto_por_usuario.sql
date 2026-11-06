-- Aplicada no projeto app-treino.
-- Cadastro aberto por @usuário (sem e-mail): e-mail interno <usuario>@treino.local.
-- O @ é único (profiles.username unique + e-mail interno único em auth.users).
--
-- signup_log (ip_hash, created_at): limite de 3 contas por IP/hora e 30 contas a cada 10 min.
-- username_available(p_username) -> boolean            (anon e authenticated)
-- sign_up(p_username, p_name, p_password, p_terms_version)
--   valida @, nome, senha (mín. 6, diferente de ABC123) e aceite dos termos,
--   cria a conta já confirmada e grava @ e aceite no perfil.
-- (SQL completo no histórico de migrações do Supabase: cadastro_aberto_por_usuario)

-- desliga_funcoes_admin_antigas
revoke execute on function public.admin_create_user(text, text, text) from authenticated;
revoke execute on function public.admin_set_password(uuid, text) from authenticated;
revoke execute on function public.admin_list_users() from authenticated;
