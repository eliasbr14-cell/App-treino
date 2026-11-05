# Meu Treino 🏋️

App de celular (PWA) para montar treinos **A, B, C…** totalmente personalizados.

## O que dá pra fazer
- **Criar treinos** com nome, letra e cor (ex.: *A – Pernas*, *B – Peito e Tríceps*). Tem modelos rápidos.
- **Adicionar exercícios** de uma biblioteca com ~80 exercícios separados por grupo muscular, ou **criar os seus**.
- Em cada exercício: **séries, repetições (ex.: `12-10-8`), carga, descanso, método e observações**.
- **Métodos**: drop-set, rest-pause, bi-set, tri-set, super-série, pirâmide, FST-7, GVT, cluster, negativa… e você pode **criar métodos próprios**.
- **Demonstração de cada exercício** já dentro do app: fotos do início e do fim do movimento alternando (tipo um vídeo curtinho), com a máquina, mais as dicas de execução. Tem também um atalho para buscar vídeos no YouTube.
- **Trocar por variação**: a academia não tem o aparelho ou ele está ocupado? No modo treino, toque em 🔄 *Trocar* e escolha outra variação (ex.: tríceps na máquina → pulley, corda, testa, francês…). A troca pode valer só para hoje ou ficar salva no treino.
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

## Créditos
Fotos dos exercícios: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (domínio público / Unlicense).

## Estrutura
```
index.html            página
css/style.css         visual
js/app.js             telas e lógica
js/data.js            biblioteca de exercícios, métodos e modelos
js/store.js           salvamento (localStorage)
img/ex/               fotos de demonstração dos exercícios
sw.js                 modo offline
manifest.webmanifest  dados para instalar como app
```
