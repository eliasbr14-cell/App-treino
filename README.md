# Meu Treino 🏋️

App de celular (PWA) para montar treinos **A, B, C…** totalmente personalizados.

## O que dá pra fazer
- **Criar treinos** com nome, letra e cor (ex.: *A – Pernas*, *B – Peito e Tríceps*). Tem modelos rápidos.
- **Adicionar exercícios** de uma biblioteca com ~75 exercícios separados por grupo muscular, ou **criar os seus**.
- Em cada exercício: **séries, repetições (ex.: `12-10-8`), carga, descanso, método e observações**.
- **Métodos**: drop-set, rest-pause, bi-set, tri-set, super-série, pirâmide, FST-7, GVT, cluster, negativa… e você pode **criar métodos próprios**.
- **Vídeo de cada exercício**: busca no YouTube e cola o link (o vídeo fica embutido no app), ou **grava a máquina da sua academia** com a câmera do celular (fica salvo no aparelho).
- **Modo treino**: checklist das séries, cronômetro de descanso automático (vibra e apita), tela sempre ligada, carga editável na hora.
- **Histórico** dos treinos feitos e **backup** (exportar/importar).
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

Os dados ficam salvos no próprio celular.

## Estrutura
```
index.html            página
css/style.css         visual
js/app.js             telas e lógica
js/data.js            biblioteca de exercícios, métodos e modelos
js/store.js           salvamento (localStorage + vídeos no IndexedDB)
sw.js                 modo offline
manifest.webmanifest  dados para instalar como app
```
