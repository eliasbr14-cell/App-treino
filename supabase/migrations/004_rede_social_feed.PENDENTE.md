# Rede social (feed) — PENDENTE

Migração `rede_social_feed` ainda não aplicada: o Supabase pediu confirmação
(ela troca a regra de leitura de perfis) e ninguém respondeu a tempo.

Conteúdo planejado:
- profiles: + bio, + accepted_rules_at; perfis visíveis para quem está logado
- posts (foto, legenda, treino concluído opcional, hidden)
- likes, comments, follows
- blocks (bloquear usuário: some do feed dos dois)
- reports (denúncia; 3 denúncias escondem o post; admin reexibe ou apaga)
- bucket privado `posts` para fotos (até 2 MB, JPEG/WebP; cada um só envia na própria pasta)
