# Meu Treino 🏋️

App de celular (PWA) para montar treinos **A, B, C…** totalmente personalizados.

## O que dá pra fazer
- **Treinos prontos por nível**: Iniciante (AB), Intermediário (ABC) e Avançado (ABCDE), já com séries, descanso e métodos. Dá para substituir os seus ou adicionar junto, e depois editar tudo.
- **Arrastar e soltar** (segura no ⠿) para mudar a ordem dos treinos e dos exercícios.
- **Próximo treino**: o app destaca qual treino é o próximo da sequência, pelo último que você fez.
- **Criar treinos** com nome, letra e cor (ex.: *A – Pernas*, *B – Peito e Tríceps*). Tem modelos rápidos.
- **Adicionar exercícios** de uma biblioteca com ~80 exercícios separados por grupo muscular, ou **criar os seus**.
- Em cada exercício: **séries, repetições (ex.: `12-10-8`), carga, descanso, método e observações**.
- **Métodos**: drop-set, rest-pause, bi-set, tri-set, super-série, pirâmide, FST-7, GVT, cluster, negativa… e você pode **criar métodos próprios**.
- **Demonstração de cada exercício** já dentro do app: fotos do início e do fim do movimento alternando (tipo um vídeo curtinho), com a máquina, mais as dicas de execução. Tem também um atalho para buscar vídeos no YouTube.
- **Trocar por variação**: a academia não tem o aparelho ou ele está ocupado? No modo treino, toque em 🔄 *Trocar* e escolha outra variação (ex.: tríceps na máquina → pulley, corda, testa, francês…). A troca pode valer só para hoje ou ficar salva no treino.
- **Modo treino**: checklist das séries, cronômetro de descanso automático (vibra e apita), tela sempre ligada, carga editável na hora.
- **Histórico** dos treinos feitos e **backup** (exportar/importar).
- **Login por @usuário** logo na entrada (Supabase): o administrador cria o usuário no *Painel de testes* com a senha padrão `ABC123` e manda o acesso no WhatsApp; no primeiro acesso o app obriga a criar uma senha própria. Treinos e histórico sincronizam entre aparelhos e, depois de logado, funciona offline.
- **Compartilhar por link no WhatsApp**: mande um treino (📤 na tela do treino) ou todos; o amigo abre o link, entra na conta e adiciona com um toque. Cargas não vão junto.
- Funciona **offline** depois de aberto uma vez.

## Como rodar
Não precisa instalar nada, é HTML/CSS/JS puro:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Como colocar no celular
1. No GitHub: **Settings → Pages → Deploy from a branch**, escolha a branch e a pasta `/ (root)`.
2. Abra o link gerado (`https://<usuario>.github.io/App-treino/`) no celular.
3. **Android (Chrome):** menu ⋮ → *Instalar app*. **iPhone (Safari):** compartilhar → *Adicionar à Tela de Início*.

Sem conta, os dados ficam só no celular. Com conta, também ficam no Supabase (servidor em São Paulo), protegidos por regras de acesso (RLS): cada usuário só lê e altera os próprios dados.

### Configuração do Supabase (uma vez)
Em **Authentication → URL Configuration**, coloque o endereço do app (ex.: `https://<usuario>.github.io/App-treino/`) em *Site URL* e em *Redirect URLs*, para os links de confirmação de e-mail e de nova senha voltarem para o app.

O SQL do banco está em `supabase/migrations/`.

## Recuperação de senha por e-mail (Brevo)
O login é pelo @. Quem quiser cadastra um **e-mail de recuperação** (no cadastro ou em Minha conta). Em *Esqueci minha senha*, a Edge Function `recuperar-senha` (pasta `supabase/functions/`) gera o link e envia pelo **Brevo** (grátis até 300 e-mails/dia).

Para ligar (uma vez):
1. Crie uma conta grátis em brevo.com.
2. Em **Senders, domains & dedicated IPs → Senders**, adicione e confirme o e-mail remetente (ex.: um Gmail só do app).
3. Em **SMTP & API → API Keys**, gere uma chave.
4. No Supabase, projeto *app-treino* → **Edge Functions → Secrets**, crie:
   - `BREVO_API_KEY` = a chave do passo 3
   - `EMAIL_REMETENTE` = o e-mail confirmado no passo 2
5. Em **Authentication → URL Configuration**, coloque o endereço do app em *Site URL* e *Redirect URLs* (o link do e-mail volta pra lá).

Enquanto não estiver ligado, o app avisa para pedir o reset ao administrador.

## Créditos
Fotos dos exercícios: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (domínio público / Unlicense).

## Estrutura
```
index.html            página
css/style.css         visual
js/app.js             telas e lógica
js/data.js            biblioteca de exercícios, métodos e modelos
js/store.js           salvamento local (localStorage)
js/cloud.js           conta e sincronização com o Supabase
js/config.js          URL e chave pública do Supabase
js/vendor/            biblioteca do Supabase (cópia local, funciona offline)
img/ex/               fotos de demonstração dos exercícios
sw.js                 modo offline
manifest.webmanifest  dados para instalar como app
```
