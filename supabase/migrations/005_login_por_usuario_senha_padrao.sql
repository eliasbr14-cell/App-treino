-- Aplicada no projeto app-treino.
-- Login por @usuário: contas criadas pelo admin usam e-mail interno <usuario>@treino.local
-- (nenhum e-mail é enviado). Senha padrão ABC123 e troca obrigatória no primeiro acesso.
alter table public.profiles add column must_change_password boolean not null default false;

-- funções (security definer, conferem am_i_admin()):
--   admin_create_login(p_username, p_name) -> cria conta confirmada, senha ABC123, must_change_password = true
--   admin_reset_login(p_user)              -> volta a senha para ABC123 e exige troca
--   admin_list_logins()                    -> id, email, username, name, must_change_password, created_at, last_sign_in_at
--   change_my_password(p_new)              -> o próprio usuário troca (mín. 6, diferente de ABC123) e libera o acesso
-- (SQL completo no histórico de migrações do Supabase: login_por_usuario_senha_padrao)

-- perfil_editar_so_nome: o usuário só pode alterar o próprio nome
revoke update on public.profiles from authenticated, anon;
grant update (name) on public.profiles to authenticated;
