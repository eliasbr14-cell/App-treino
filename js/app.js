import { GROUPS, EXERCISES, METHODS, WORKOUT_TEMPLATES, COLORS } from './data.js';
import { getState, update, replaceState, uid } from './store.js';
import * as cloud from './cloud.js';

// ============ utilitários ============
const app = document.getElementById('app');
const S = () => getState();
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const go = (hash) => { location.hash = hash; };
const groupName = (id) => GROUPS.find(g => g.id === id)?.name || 'Outro';
const allExercises = () => [...EXERCISES, ...S().customExercises];
const findExercise = (id) => allExercises().find(e => e.id === id);
const allMethods = () => [...METHODS, ...S().customMethods];
const findMethod = (id) => allMethods().find(m => m.id === id) || METHODS[0];
const findWorkout = (id) => S().workouts.find(w => w.id === id);
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 1800);
}

function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const ytSearch = (name) => `https://www.youtube.com/results?search_query=${encodeURIComponent('como fazer ' + name + ' execução correta')}`;

function itemSummary(it) {
  const parts = [`${it.sets} × ${esc(it.reps)}`];
  if (it.load) parts.push(esc(it.load));
  if (it.rest) parts.push(`⏱ ${it.rest}s`);
  return parts.join(' · ');
}

const thumb = (e) => e?.demo
  ? `<img class="thumb" src="img/ex/${e.id}-0.jpg" alt="" loading="lazy">`
  : `<span class="thumb ph">🏋️</span>`;

// Demonstração: alterna a foto do início e do fim do movimento, como um vídeo curtinho
function demoBox(e) {
  if (!e) return '';
  const media = e.demo
    ? `<div class="demo" role="img" aria-label="Demonstração: ${esc(e.name)}">
         <img src="img/ex/${e.id}-0.jpg" alt=""><img class="b" src="img/ex/${e.id}-1.jpg" alt="">
         <span class="demo-tag">início ⇄ fim</span>
       </div>`
    : `<div class="demo ph"><div><div class="big">🏋️</div><small>Exercício personalizado, sem demonstração.</small></div></div>`;
  return `${media}
    <a class="yt-link" href="${ytSearch(e.name)}" target="_blank" rel="noopener">▶ Ver vídeos desse exercício no YouTube</a>`;
}

// Variações: primeiro as da mesma família (ex.: outros tríceps de extensão), depois o resto do grupo
function alternatives(exId) {
  const e = findExercise(exId);
  if (!e) return { similar: [], others: [] };
  const rest = allExercises().filter(x => x.id !== e.id && x.group === e.group);
  const similar = e.fam ? rest.filter(x => x.fam === e.fam) : [];
  return { similar, others: rest.filter(x => !similar.includes(x)) };
}

const badge = (w, size = '') => `<span class="badge ${size}" style="--c:${esc(w.color)}">${esc(w.letter)}</span>`;

// ============ folha (bottom sheet) ============
function sheet(html) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet" role="dialog">${html}</div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 250); };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) close();
  });
  wrap.close = close;
  return wrap;
}

// ============ layout ============
function page({ title, back, actions = '', body, nav = true, fab = '' }) {
  const hash = location.hash || '#/';
  const tab = (h, icon, label) =>
    `<a href="${h}" class="${hash === h || (h !== '#/' && hash.startsWith(h)) ? 'active' : ''}"><span>${icon}</span>${label}</a>`;
  return `
    <header class="top">
      ${back ? `<a class="icon-btn" href="${back}" aria-label="Voltar">←</a>` : ''}
      <h1>${title}</h1>
      <div class="top-actions">${actions}</div>
    </header>
    <main class="${nav ? 'with-nav' : ''}">${body}</main>
    ${fab}
    ${nav ? `<nav class="bottom">
      ${tab('#/', '🏋️', 'Treinos')}
      ${tab('#/exercicios', '📚', 'Exercícios')}
      ${tab('#/metodos', '🧪', 'Métodos')}
      ${tab('#/historico', '📅', 'Histórico')}
    </nav>` : ''}`;
}

// ============ telas ============
function viewHome() {
  const { workouts, session } = S();
  const sw = session && findWorkout(session.workoutId);
  const banner = sw ? `
    <a class="banner" href="#/sessao/${sw.id}">
      ${badge(sw)} <div><b>Treino em andamento</b><small>${esc(sw.name)} — toque para continuar</small></div><span>▶</span>
    </a>` : '';

  const list = workouts.length ? workouts.map(w => `
    <div class="card workout" style="--c:${esc(w.color)}">
      <a class="workout-main" href="#/treino/${w.id}">
        ${badge(w, 'lg')}
        <div class="grow">
          <h3>${esc(w.name)}</h3>
          <small>${w.items.length} exercício${w.items.length === 1 ? '' : 's'}${w.groups?.length ? ' · ' + w.groups.map(groupName).join(', ') : ''}</small>
        </div>
      </a>
      <button class="play" data-act="start" data-id="${w.id}" aria-label="Iniciar treino">▶</button>
    </div>`).join('') : `
    <div class="empty">
      <div class="big">🏋️</div>
      <h2>Monte seu primeiro treino</h2>
      <p>Crie treinos A, B, C… do seu jeito: “Pernas”, “Peito e Tríceps”, o que quiser. Depois é só adicionar os exercícios e os métodos.</p>
      <button class="btn primary" data-act="new-workout">+ Criar treino</button>
    </div>`;

  return page({
    title: 'Meus treinos',
    actions: `<a class="icon-btn" href="#/conta" aria-label="Conta">${cloud.currentUser() ? '☁️' : '👤'}</a>
              <a class="icon-btn" href="#/config" aria-label="Configurações">⚙️</a>`,
    body: banner + list,
    fab: workouts.length ? `<button class="fab" data-act="new-workout">+ Novo treino</button>` : '',
  });
}

function workoutForm(w) {
  const used = S().workouts.filter(x => x.id !== w?.id).map(x => x.letter);
  const letter = w?.letter || LETTERS.find(l => !used.includes(l)) || 'A';
  const color = w?.color || COLORS[S().workouts.length % COLORS.length];
  const groups = w?.groups || [];
  return `
    <form id="wform">
      <h2>${w ? 'Editar treino' : 'Novo treino'}</h2>
      ${w ? '' : `<label>Modelos rápidos</label>
      <div class="chips">${WORKOUT_TEMPLATES.map((t, i) => `<button type="button" class="chip" data-tpl="${i}">${esc(t.name)}</button>`).join('')}</div>`}
      <label for="wname">Nome do treino</label>
      <input id="wname" name="name" required maxlength="40" placeholder="Ex.: Pernas, Peito e Tríceps…" value="${esc(w?.name)}">
      <label>Letra</label>
      <div class="chips letters">${LETTERS.slice(0, 8).map(l => `
        <label class="chip ${used.includes(l) ? 'dim' : ''}"><input type="radio" name="letter" value="${l}" ${l === letter ? 'checked' : ''}>${l}</label>`).join('')}</div>
      <label>Cor</label>
      <div class="chips colors">${COLORS.map(c => `
        <label class="swatch" style="--c:${c}"><input type="radio" name="color" value="${c}" ${c === color ? 'checked' : ''}></label>`).join('')}</div>
      <label>Grupos musculares <small>(filtra a lista de exercícios)</small></label>
      <div class="chips">${GROUPS.map(g => `
        <label class="chip"><input type="checkbox" name="groups" value="${g.id}" ${groups.includes(g.id) ? 'checked' : ''}>${g.name}</label>`).join('')}</div>
      <div class="row end">
        <button type="button" class="btn" data-close>Cancelar</button>
        <button class="btn primary">${w ? 'Salvar' : 'Criar treino'}</button>
      </div>
    </form>`;
}

function openWorkoutForm(w) {
  const sh = sheet(workoutForm(w));
  const form = sh.querySelector('#wform');
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tpl]');
    if (!b) return;
    const t = WORKOUT_TEMPLATES[b.dataset.tpl];
    form.name.value = t.name;
    form.querySelectorAll('[name=groups]').forEach(cb => { cb.checked = t.groups.includes(cb.value); });
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {
      name: fd.get('name').trim(),
      letter: fd.get('letter'),
      color: fd.get('color'),
      groups: fd.getAll('groups'),
    };
    let id = w?.id;
    update(st => {
      if (w) Object.assign(st.workouts.find(x => x.id === w.id), data);
      else { id = uid(); st.workouts.push({ id, items: [], ...data }); }
    });
    sh.close();
    if (w) render(); else go(`#/treino/${id}/add`);
  });
  setTimeout(() => form.name.focus(), 300);
}

function viewWorkout(id) {
  const w = findWorkout(id);
  if (!w) return viewNotFound();
  const items = w.items.map((it, i) => {
    const e = findExercise(it.exerciseId);
    const m = findMethod(it.method);
    return `
      <div class="card item">
        <div class="order">
          <button data-act="move" data-id="${it.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">▲</button>
          <span>${i + 1}</span>
          <button data-act="move" data-id="${it.id}" data-dir="1" ${i === w.items.length - 1 ? 'disabled' : ''} aria-label="Descer">▼</button>
        </div>
        <a class="grow" href="#/treino/${w.id}/item/${it.id}">
          <h3>${esc(e?.name || 'Exercício removido')}</h3>
          <small>${itemSummary(it)}</small>
          ${m.id !== 'normal' ? `<span class="tag">${esc(m.name)}</span>` : ''}
          ${it.notes ? `<p class="notes">${esc(it.notes)}</p>` : ''}
        </a>
        ${e ? `<a href="#/exercicio/${e.id}" aria-label="Ver como faz">${thumb(e)}</a>` : ''}
      </div>`;
  }).join('');

  return page({
    title: `${badge(w)} ${esc(w.name)}`,
    back: '#/',
    actions: `<button class="icon-btn" data-act="edit-workout" data-id="${w.id}" aria-label="Editar">✏️</button>
              <button class="icon-btn" data-act="delete-workout" data-id="${w.id}" aria-label="Excluir">🗑️</button>`,
    body: `
      ${w.items.length ? `<button class="btn primary block" data-act="start" data-id="${w.id}">▶ Iniciar treino</button>` : ''}
      ${items || `<div class="empty"><p>Nenhum exercício ainda. Adicione os exercícios desse treino 👇</p></div>`}
      <a class="btn block dashed" href="#/treino/${w.id}/add">+ Adicionar exercícios</a>`,
  });
}

function exerciseList(exs, { workout } = {}) {
  if (!exs.length) return `<div class="empty"><p>Nenhum exercício encontrado.</p></div>`;
  const inW = new Set(workout?.items.map(i => i.exerciseId));
  return exs.map(e => `
    <div class="card ex">
      <a href="#/exercicio/${e.id}">${thumb(e)}</a>
      <a class="grow" href="#/exercicio/${e.id}">
        <h3>${esc(e.name)}</h3>
        <small>${groupName(e.group)} · ${esc(e.equipment || '')}${e.custom ? ' · <i>personalizado</i>' : ''}</small>
      </a>
      ${workout ? `<button class="add ${inW.has(e.id) ? 'on' : ''}" data-act="add-ex" data-id="${e.id}" aria-label="Adicionar">${inW.has(e.id) ? '✓' : '+'}</button>` : ''}
    </div>`).join('');
}

// filtros de lista guardados entre renders
const filters = { q: '', groups: null };

function filterBar(defaultGroups) {
  const active = filters.groups ?? defaultGroups ?? [];
  return `
    <input type="search" class="search" id="q" placeholder="Buscar exercício…" value="${esc(filters.q)}">
    <div class="chips scroll">
      <button class="chip ${active.length ? '' : 'on'}" data-act="filter-all">Todos</button>
      ${GROUPS.map(g => `<button class="chip ${active.includes(g.id) ? 'on' : ''}" data-act="filter" data-g="${g.id}">${g.name}</button>`).join('')}
    </div>`;
}

function filtered(defaultGroups) {
  const active = filters.groups ?? defaultGroups ?? [];
  const q = norm(filters.q.trim());
  return allExercises().filter(e =>
    (!active.length || active.includes(e.group)) &&
    (!q || norm(e.name + ' ' + (e.equipment || '')).includes(q)));
}

function viewAdd(id) {
  const w = findWorkout(id);
  if (!w) return viewNotFound();
  return page({
    title: `Adicionar em ${badge(w)}`,
    back: `#/treino/${w.id}`,
    nav: false,
    body: `
      ${filterBar(w.groups)}
      <div id="list">${exerciseList(filtered(w.groups), { workout: w })}</div>
      <button class="btn block dashed" data-act="new-exercise">+ Criar exercício personalizado</button>`,
    fab: `<a class="fab" href="#/treino/${w.id}">Pronto (${w.items.length})</a>`,
  });
}

function viewLibrary() {
  return page({
    title: 'Exercícios',
    body: `
      ${filterBar([])}
      <div id="list">${exerciseList(filtered([]))}</div>
      <button class="btn block dashed" data-act="new-exercise">+ Criar exercício personalizado</button>`,
  });
}

function methodOptions(selected) {
  return allMethods().map(m => `<option value="${m.id}" ${m.id === selected ? 'selected' : ''}>${esc(m.name)}</option>`).join('')
    + `<option value="__new">+ Criar novo método…</option>`;
}

function viewItem(wid, iid) {
  const w = findWorkout(wid);
  const it = w?.items.find(i => i.id === iid);
  if (!it) return viewNotFound();
  const e = findExercise(it.exerciseId);
  const m = findMethod(it.method);
  return page({
    title: esc(e?.name || 'Exercício'),
    back: `#/treino/${w.id}`,
    nav: false,
    body: `
      ${demoBox(e)}
      <button type="button" class="btn block" data-act="swap" data-id="${it.id}" data-w="${w.id}" data-perm="1">🔄 Trocar por outra variação</button>
      <form id="iform" class="card form">
        <div class="grid2">
          <div><label>Séries</label>
            <div class="stepper"><button type="button" data-step="-1">−</button><input name="sets" type="number" min="1" max="20" value="${it.sets}" inputmode="numeric"><button type="button" data-step="1">+</button></div>
          </div>
          <div><label>Repetições</label><input name="reps" value="${esc(it.reps)}" placeholder="12 ou 12-10-8"></div>
        </div>
        <div class="grid2">
          <div><label>Carga</label><input name="load" value="${esc(it.load)}" placeholder="Ex.: 20kg, placa 8"></div>
          <div><label>Descanso (s)</label><input name="rest" type="number" min="0" step="5" value="${it.rest}" inputmode="numeric"></div>
        </div>
        <div class="chips">${[30, 45, 60, 90, 120, 180].map(s => `<button type="button" class="chip" data-rest="${s}">${s}s</button>`).join('')}</div>
        <label>Método</label>
        <select name="method">${methodOptions(it.method)}</select>
        <p class="hint" id="mdesc">${esc(m.desc)}</p>
        <label>Observações</label>
        <textarea name="notes" rows="2" placeholder="Ex.: banco na posição 4, pegada aberta…">${esc(it.notes)}</textarea>
        <div class="row between">
          <button type="button" class="btn danger" data-act="remove-item" data-w="${w.id}" data-id="${it.id}">Remover</button>
          <button class="btn primary">Salvar</button>
        </div>
      </form>`,
  });
}

function mountItem(wid, iid) {
  const form = document.getElementById('iform');
  if (!form) return;
  form.addEventListener('click', (e) => {
    const st = e.target.closest('[data-step]');
    if (st) form.sets.value = Math.max(1, Math.min(20, (+form.sets.value || 0) + +st.dataset.step));
    const r = e.target.closest('[data-rest]');
    if (r) form.rest.value = r.dataset.rest;
  });
  form.method.addEventListener('change', () => {
    if (form.method.value === '__new') {
      openMethodForm((m) => {
        form.method.innerHTML = methodOptions(m ? m.id : 'normal');
        document.getElementById('mdesc').textContent = findMethod(form.method.value).desc;
      });
      return;
    }
    document.getElementById('mdesc').textContent = findMethod(form.method.value).desc;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    update(st => {
      const it = st.workouts.find(w => w.id === wid).items.find(i => i.id === iid);
      Object.assign(it, {
        sets: Math.max(1, +form.sets.value || 1),
        reps: form.reps.value.trim() || '12',
        load: form.load.value.trim(),
        rest: Math.max(0, +form.rest.value || 0),
        method: form.method.value === '__new' ? 'normal' : form.method.value,
        notes: form.notes.value.trim(),
      });
    });
    toast('Salvo ✓');
    go(`#/treino/${wid}`);
  });
}

function viewExercise(id) {
  const e = findExercise(id);
  if (!e) return viewNotFound();
  const usedIn = S().workouts.filter(w => w.items.some(i => i.exerciseId === id));
  return page({
    title: esc(e.name),
    back: history.length > 1 ? 'javascript:history.back()' : '#/exercicios',
    actions: e.custom ? `<button class="icon-btn" data-act="edit-exercise" data-id="${e.id}" aria-label="Editar">✏️</button>` : '',
    nav: false,
    body: `
      ${demoBox(e)}
      <div class="card">
        <p><span class="tag">${groupName(e.group)}</span></p>
        <h3>🛠️ Equipamento / máquina</h3>
        <p>${esc(e.equipment || '—')}</p>
        <h3>📋 Como fazer</h3>
        <p>${esc(e.tips || 'Sem dicas ainda.')}</p>
        ${alternatives(e.id).similar.length ? `<h3>🔄 Variações (se não tiver o aparelho)</h3>
          <div class="chips">${alternatives(e.id).similar.map(x => `<a class="chip" href="#/exercicio/${x.id}">${esc(x.name)}</a>`).join('')}</div>` : ''}
        ${usedIn.length ? `<h3>📌 Está nos treinos</h3><p>${usedIn.map(w => `<a href="#/treino/${w.id}">${badge(w)} ${esc(w.name)}</a>`).join(' ')}</p>` : ''}
      </div>`,
  });
}

function openSwap(wid, itemId, permanent) {
  const w = findWorkout(wid);
  const it = w.items.find(i => i.id === itemId);
  const current = (!permanent && S().session?.swaps?.[itemId]) || it.exerciseId;
  const e = findExercise(it.exerciseId);
  const { similar, others } = alternatives(it.exerciseId);
  const row = (x) => `
    <button class="pick ${x.id === current ? 'on' : ''}" data-pick="${x.id}">
      ${thumb(x)}<span class="grow"><b>${esc(x.name)}</b><small>${esc(x.equipment || '')}</small></span>
    </button>`;
  const sh = sheet(`
    <h2>Trocar ${esc(e?.name || 'exercício')}</h2>
    <p class="hint">${permanent ? 'Escolha a variação que vai ficar no treino.' : 'A academia não tem o aparelho ou tá ocupado? Escolha uma variação só pra hoje.'}</p>
    ${permanent ? '' : `<label class="check"><input type="checkbox" id="swap-perm"> Deixar essa troca salva no treino</label>`}
    ${!permanent && current !== it.exerciseId ? `<button class="pick" data-pick="${it.exerciseId}">${thumb(e)}<span class="grow"><b>↩ Voltar para ${esc(e.name)}</b></span></button>` : ''}
    ${similar.length ? `<h3 class="sec">Mais parecidos</h3>${similar.map(row).join('')}` : ''}
    ${others.length ? `<h3 class="sec">Outros de ${groupName(e?.group)}</h3>${others.map(row).join('')}` : ''}
    <div class="row end"><button class="btn" data-close>Cancelar</button></div>`);
  sh.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pick]');
    if (!b) return;
    const pick = b.dataset.pick;
    const perm = permanent || sh.querySelector('#swap-perm')?.checked;
    update(st => {
      const item = st.workouts.find(x => x.id === wid).items.find(i => i.id === itemId);
      if (perm) {
        item.exerciseId = pick;
        if (st.session?.swaps) delete st.session.swaps[itemId];
      } else {
        st.session.swaps ||= {};
        if (pick === item.exerciseId) delete st.session.swaps[itemId];
        else st.session.swaps[itemId] = pick;
      }
    });
    sh.close();
    toast(perm ? 'Exercício trocado no treino ✓' : 'Trocado só pra hoje ✓');
    render();
  });
}

function viewMethods() {
  return page({
    title: 'Métodos de treino',
    body: `
      <p class="hint">Escolha o método em cada exercício do seu treino. Você também pode criar os seus.</p>
      ${allMethods().map(m => `
        <div class="card">
          <div class="row between"><h3>${esc(m.name)}</h3>
            ${m.custom ? `<button class="icon-btn" data-act="delete-method" data-id="${m.id}" aria-label="Excluir">🗑️</button>` : ''}</div>
          <p>${esc(m.desc)}</p>
        </div>`).join('')}
      <button class="btn block dashed" data-act="new-method">+ Criar método</button>`,
  });
}

function openMethodForm(done) {
  const sh = sheet(`
    <form id="mform">
      <h2>Novo método</h2>
      <label>Nome</label><input name="name" required maxlength="40" placeholder="Ex.: 21, Pré-exaustão…">
      <label>Como funciona</label><textarea name="desc" rows="3" placeholder="Descreva o método"></textarea>
      <div class="row end"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">Criar</button></div>
    </form>`);
  let created = null;
  const form = sh.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    created = { id: 'm-' + uid(), name: form.name.value.trim(), desc: form.desc.value.trim() || 'Método personalizado.', custom: true };
    update(st => st.customMethods.push(created));
    sh.close();
  });
  const obs = new MutationObserver(() => { if (!document.body.contains(sh)) { obs.disconnect(); done?.(created); } });
  obs.observe(document.body, { childList: true });
}

function openExerciseForm(e, onCreate) {
  const sh = sheet(`
    <form id="eform">
      <h2>${e ? 'Editar exercício' : 'Novo exercício'}</h2>
      <label>Nome</label><input name="name" required maxlength="60" value="${esc(e?.name)}" placeholder="Ex.: Leg press horizontal">
      <label>Grupo muscular</label>
      <select name="group">${GROUPS.map(g => `<option value="${g.id}" ${g.id === (e?.group || filters.groups?.[0]) ? 'selected' : ''}>${g.name}</option>`).join('')}</select>
      <label>Equipamento / máquina</label><input name="equipment" value="${esc(e?.equipment)}" placeholder="Ex.: máquina azul do fundo">
      <label>Como fazer</label><textarea name="tips" rows="3" placeholder="Dicas de execução">${esc(e?.tips)}</textarea>
      <div class="row ${e ? 'between' : 'end'}">
        ${e ? `<button type="button" class="btn danger" data-del>Excluir</button>` : `<button type="button" class="btn" data-close>Cancelar</button>`}
        <button class="btn primary">${e ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>`);
  const form = sh.querySelector('form');
  form.querySelector('[data-del]')?.addEventListener('click', () => {
    if (!confirm('Excluir este exercício? Ele também sai dos treinos.')) return;
    update(st => {
      st.customExercises = st.customExercises.filter(x => x.id !== e.id);
      st.workouts.forEach(w => { w.items = w.items.filter(i => i.exerciseId !== e.id); });
    });
    sh.close();
    go('#/exercicios');
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = { name: form.name.value.trim(), group: form.group.value, equipment: form.equipment.value.trim(), tips: form.tips.value.trim() };
    if (e) update(st => Object.assign(st.customExercises.find(x => x.id === e.id), data));
    else {
      const ne = { id: 'c-' + uid(), custom: true, ...data };
      update(st => st.customExercises.push(ne));
      onCreate?.(ne);
    }
    sh.close();
    render();
  });
}

function addItem(wid, exId) {
  update(st => {
    st.workouts.find(w => w.id === wid).items.push({
      id: uid(), exerciseId: exId, sets: 3, reps: '12', load: '', rest: 60, method: 'normal', notes: '',
    });
  });
}

// ============ modo treino ============
let tick = null;
let rest = null; // { end, total }
let wakeLock = null;

function startWorkout(id) {
  const st = S();
  if (st.session && st.session.workoutId !== id) {
    if (!confirm('Já tem um treino em andamento. Descartar e começar este?')) return go(`#/sessao/${st.session.workoutId}`);
  }
  if (!st.session || st.session.workoutId !== id) {
    update(s => { s.session = { workoutId: id, start: Date.now(), checks: {}, loads: {}, swaps: {} }; });
  }
  go(`#/sessao/${id}`);
}

function viewSession(id) {
  const w = findWorkout(id);
  const ses = S().session;
  if (!w || !ses || ses.workoutId !== id) return viewWorkout(id);
  const total = w.items.reduce((a, i) => a + i.sets, 0);
  const done = w.items.reduce((a, i) => a + (ses.checks[i.id] || []).filter(Boolean).length, 0);
  const pct = total ? Math.round(done / total * 100) : 0;

  const swaps = ses.swaps || {};
  const cards = w.items.map((it) => {
    const e = findExercise(swaps[it.id] || it.exerciseId);
    const orig = swaps[it.id] ? findExercise(it.exerciseId) : null;
    const m = findMethod(it.method);
    const checks = ses.checks[it.id] || [];
    const complete = checks.filter(Boolean).length >= it.sets;
    return `
      <div class="card session-item ${complete ? 'complete' : ''}">
        <div class="row between">
          <div class="grow">
            <h3>${complete ? '✅ ' : ''}${esc(e?.name || 'Exercício')}</h3>
            <small>${it.sets} × ${esc(it.reps)} · ⏱ ${it.rest}s</small>
            ${m.id !== 'normal' ? `<span class="tag" data-act="method-info" data-id="${m.id}">${esc(m.name)} ⓘ</span>` : ''}
          </div>
          ${e ? `<a href="#/exercicio/${e.id}" aria-label="Ver como faz">${thumb(e)}</a>` : ''}
        </div>
        ${orig ? `<p class="swapped">🔄 Hoje no lugar de <b>${esc(orig.name)}</b> · <button class="link" data-act="unswap" data-id="${it.id}">desfazer</button></p>` : ''}
        ${it.notes ? `<p class="notes">${esc(it.notes)}</p>` : ''}
        <div class="row">
          <label class="load">Carga <input data-load="${it.id}" value="${esc(ses.loads[it.id] ?? it.load)}" placeholder="—"></label>
          <button class="btn small" data-act="swap" data-id="${it.id}" data-w="${w.id}">🔄 Trocar</button>
        </div>
        <div class="sets">${Array.from({ length: it.sets }, (_, s) => `
          <button class="set ${checks[s] ? 'on' : ''}" data-act="check" data-id="${it.id}" data-s="${s}">${checks[s] ? '✓' : s + 1}</button>`).join('')}
        </div>
      </div>`;
  }).join('');

  return page({
    title: `${badge(w)} ${esc(w.name)}`,
    back: `#/treino/${w.id}`,
    nav: false,
    actions: `<span class="clock" id="clock">${fmtDuration(Date.now() - ses.start)}</span>`,
    body: `
      <div class="progress"><div style="width:${pct}%"></div></div>
      <p class="hint center">${done} de ${total} séries · ${pct}%</p>
      ${cards}
      <div class="row between">
        <button class="btn danger" data-act="cancel-session">Descartar</button>
        <button class="btn primary" data-act="finish">🏁 Finalizar treino</button>
      </div>`,
  });
}

function ensureTick() {
  if (tick) return;
  tick = setInterval(() => {
    const c = document.getElementById('clock');
    const ses = S().session;
    if (c && ses) c.textContent = fmtDuration(Date.now() - ses.start);
    renderRest();
  }, 500);
}

function mountSession() {
  ensureTick();
  if ('wakeLock' in navigator && !wakeLock) {
    navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
  }
  document.querySelectorAll('[data-load]').forEach(inp => inp.addEventListener('change', () => {
    update(st => { st.session.loads[inp.dataset.load] = inp.value.trim(); });
  }));
  renderRest();
}

function stopSessionUi() {
  clearInterval(tick); tick = null;
  wakeLock?.release().catch(() => {}); wakeLock = null;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {}
  navigator.vibrate?.([300, 120, 300]);
}

function renderRest() {
  let bar = document.getElementById('rest');
  const visible = /^#\/(sessao|exercicio)\//.test(location.hash);
  if (!rest || !visible) { bar?.remove(); if (rest && Date.now() >= rest.end) rest = null; return; }
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0) { rest = null; bar?.remove(); beep(); toast('Bora! Próxima série 💪'); return; }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'rest';
    bar.className = 'rest';
    bar.innerHTML = `<div class="rest-fill"></div><span>Descanso</span><b></b>
      <button data-act="rest-add">+15s</button><button data-act="rest-skip">Pular</button>`;
    document.body.appendChild(bar);
  }
  bar.querySelector('b').textContent = fmtDuration(left * 1000);
  bar.querySelector('.rest-fill').style.width = `${100 - (left / rest.total) * 100}%`;
}

function finishWorkout() {
  const ses = S().session;
  const w = findWorkout(ses.workoutId);
  const total = w.items.reduce((a, i) => a + i.sets, 0);
  const done = w.items.reduce((a, i) => a + (ses.checks[i.id] || []).filter(Boolean).length, 0);
  if (done < total && !confirm(`Você fez ${done} de ${total} séries. Finalizar mesmo assim?`)) return;
  update(st => {
    const wk = st.workouts.find(x => x.id === w.id);
    wk.items.forEach(it => { if (ses.loads[it.id] !== undefined) it.load = ses.loads[it.id]; });
    st.history.unshift({ id: uid(), workoutId: w.id, name: w.name, letter: w.letter, color: w.color, start: ses.start, end: Date.now(), doneSets: done, totalSets: total });
    st.session = null;
  });
  rest = null; stopSessionUi(); renderRest();
  toast('Treino concluído! 🔥');
  go('#/historico');
}

// ============ histórico / config ============
function viewHistory() {
  const h = S().history;
  const weekAgo = Date.now() - 7 * 864e5;
  const week = h.filter(x => x.end > weekAgo).length;
  const fmtDate = (t) => new Date(t).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  return page({
    title: 'Histórico',
    body: `
      <div class="stats">
        <div class="card"><b>${h.length}</b><small>treinos feitos</small></div>
        <div class="card"><b>${week}</b><small>nos últimos 7 dias</small></div>
      </div>
      ${h.length ? h.map(x => `
        <div class="card hist">
          ${badge(x)}
          <div class="grow"><h3>${esc(x.name)}</h3><small>${fmtDate(x.end)} · ${fmtDuration(x.end - x.start)} · ${x.doneSets}/${x.totalSets} séries</small></div>
        </div>`).join('') : `<div class="empty"><p>Nenhum treino finalizado ainda.</p></div>`}`,
  });
}

// ============ conta ============
let accountMode = 'login';

function statusText() {
  const st = cloud.status;
  if (st.state === 'syncing') return '🔄 Sincronizando…';
  if (st.state === 'ok') return `✅ Tudo salvo na nuvem${st.at ? ' · ' + new Date(st.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`;
  if (st.state === 'error') return `⚠️ Erro ao sincronizar: ${esc(st.error)}`;
  return '📴 Sem conexão — salva no aparelho e envia quando voltar a internet';
}

const PRIVACY = `<p class="hint">🔒 Seus dados ficam guardados no Supabase (servidor em São Paulo) e são protegidos por regras de acesso: só você vê os seus treinos. Você pode excluir sua conta e todos os seus dados a qualquer momento.</p>`;

function viewAccount() {
  if (!cloud.available()) {
    return page({ title: 'Conta', back: '#/', body: `<div class="empty"><p>Não foi possível carregar o login. Verifique a internet e abra o app de novo.</p></div>` });
  }
  const u = cloud.currentUser();
  if (u) {
    return page({
      title: 'Minha conta',
      back: '#/',
      body: `
        <div class="card">
          <label>Nome</label>
          <div class="row" style="margin-top:0"><input id="pname" placeholder="Seu nome" maxlength="60" class="grow"><button class="btn" data-act="save-name">Salvar</button></div>
          <p class="hint">${esc(u.email)}</p>
        </div>
        <div class="card">
          <h3>☁️ Sincronização</h3>
          <p id="cloud-status" class="hint">${statusText()}</p>
          <button class="btn" data-act="sync-now">Sincronizar agora</button>
        </div>
        ${PRIVACY}
        <div class="row between">
          <button class="btn" data-act="logout">Sair</button>
          <button class="btn danger" data-act="delete-account">Excluir minha conta</button>
        </div>`,
    });
  }
  const signup = accountMode === 'signup';
  return page({
    title: 'Conta',
    back: '#/',
    body: `
      <div class="card">
        <p>Entre para <b>salvar seus treinos na nuvem</b> e não perder nada se trocar de celular. Em breve: compartilhar treinos e grupo com os amigos 💪</p>
        <div class="chips tabs">
          <button class="chip ${signup ? '' : 'on'}" data-act="acc-mode" data-mode="login">Entrar</button>
          <button class="chip ${signup ? 'on' : ''}" data-act="acc-mode" data-mode="signup">Criar conta</button>
        </div>
        <form id="aform">
          ${signup ? `<label>Seu nome</label><input name="name" required maxlength="60" autocomplete="name">` : ''}
          <label>E-mail</label><input name="email" type="email" required autocomplete="email">
          <label>Senha</label><input name="password" type="password" required minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'mínimo 6 caracteres' : ''}">
          <p class="hint" id="aerr"></p>
          <button class="btn primary block">${signup ? 'Criar conta' : 'Entrar'}</button>
        </form>
        ${signup ? '' : `<button class="link" data-act="forgot">Esqueci minha senha</button>`}
      </div>
      ${signup ? `<p class="hint">Ao criar a conta você concorda que seus treinos sejam guardados para funcionar a sincronização.</p>` : ''}
      ${PRIVACY}`,
  });
}

async function mountAccount() {
  const u = cloud.currentUser();
  if (u) {
    const prof = await cloud.getProfile().catch(() => null);
    const inp = document.getElementById('pname');
    if (inp && prof) inp.value = prof.name || '';
    return;
  }
  const form = document.getElementById('aform');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('aerr');
    const btn = form.querySelector('button');
    btn.disabled = true; err.textContent = '';
    try {
      if (accountMode === 'signup') {
        const r = await cloud.signUp(form.name.value.trim(), form.email.value.trim(), form.password.value);
        if (r.needsConfirmation) {
          sheet(`<h2>📧 Confirme seu e-mail</h2><p>Enviamos um link para <b>${esc(form.email.value)}</b>. Abra o e-mail, toque no link e depois entre aqui com seu e-mail e senha.</p><div class="row end"><button class="btn primary" data-close>Ok</button></div>`);
          accountMode = 'login';
          render();
        }
      } else {
        await cloud.signIn(form.email.value.trim(), form.password.value);
        toast('Bem-vindo! ☁️');
      }
    } catch (ex) {
      err.textContent = authError(ex);
    } finally { btn.disabled = false; }
  });
}

function authError(ex) {
  const m = (ex?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('not confirmed')) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (m.includes('already registered')) return 'Esse e-mail já tem conta. Use “Entrar”.';
  if (m.includes('password')) return 'Senha fraca: use pelo menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Espere alguns minutos.';
  if (m.includes('fetch')) return 'Sem conexão com a internet.';
  return ex?.message || 'Erro desconhecido.';
}

function openNewPassword() {
  const sh = sheet(`
    <form id="npform"><h2>Nova senha</h2>
      <label>Digite a nova senha</label><input name="password" type="password" minlength="6" required autocomplete="new-password">
      <div class="row end"><button class="btn primary">Salvar senha</button></div></form>`);
  sh.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await cloud.setNewPassword(e.target.password.value); sh.close(); toast('Senha alterada ✓'); }
    catch (ex) { alert(authError(ex)); }
  });
}

function viewConfig() {
  return page({
    title: 'Configurações',
    back: '#/',
    body: `
      <a class="card row between" href="#/conta" style="margin-top:0">
        <span>${cloud.currentUser() ? '☁️ Conta: ' + esc(cloud.currentUser().email) : '👤 Entrar / criar conta'}</span><span>›</span>
      </a>
      <div class="card">
        <h3>💾 Backup</h3>
        <p class="hint">Seus treinos ficam salvos neste aparelho. Exporte um backup para não perder ou para passar para outro celular.</p>
        <div class="row"><button class="btn" data-act="export">Exportar backup</button>
        <label class="btn">Importar backup<input type="file" accept="application/json,.json" hidden id="import"></label></div>
      </div>
      <div class="card">
        <h3>📲 Instalar no celular</h3>
        <p class="hint"><b>Android (Chrome):</b> menu ⋮ → “Instalar app” / “Adicionar à tela inicial”.<br>
        <b>iPhone (Safari):</b> botão compartilhar → “Adicionar à Tela de Início”.</p>
      </div>
      <div class="card">
        <h3>⚠️ Zona de perigo</h3>
        <button class="btn danger" data-act="reset">Apagar todos os dados</button>
      </div>`,
  });
}

function mountConfig() {
  document.getElementById('import')?.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.workouts)) throw new Error('arquivo inválido');
      if (!confirm('Isso substitui seus dados atuais. Continuar?')) return;
      replaceState(data);
      toast('Backup importado ✓');
      go('#/');
    } catch (err) { alert('Não foi possível importar: ' + err.message); }
  });
}

function viewNotFound() {
  return page({ title: 'Ops', back: '#/', body: `<div class="empty"><p>Não encontrado.</p><a class="btn" href="#/">Voltar</a></div>` });
}

// ============ ações (cliques) ============
const actions = {
  'new-workout': () => openWorkoutForm(),
  'edit-workout': (el) => openWorkoutForm(findWorkout(el.dataset.id)),
  'delete-workout': (el) => {
    const w = findWorkout(el.dataset.id);
    if (!confirm(`Excluir o treino ${w.letter} – ${w.name}?`)) return;
    update(st => {
      st.workouts = st.workouts.filter(x => x.id !== w.id);
      if (st.session?.workoutId === w.id) st.session = null;
    });
    go('#/');
  },
  'move': (el) => {
    const wid = location.hash.split('/')[2];
    update(st => {
      const items = st.workouts.find(w => w.id === wid).items;
      const i = items.findIndex(x => x.id === el.dataset.id), j = i + +el.dataset.dir;
      if (j < 0 || j >= items.length) return;
      [items[i], items[j]] = [items[j], items[i]];
    });
    render();
  },
  'add-ex': (el) => {
    const wid = location.hash.split('/')[2];
    const w = findWorkout(wid);
    const existing = w.items.find(i => i.exerciseId === el.dataset.id);
    if (existing) {
      if (!confirm('Esse exercício já está no treino. Adicionar de novo?')) return;
    }
    addItem(wid, el.dataset.id);
    toast(`Adicionado em ${w.letter} ✓`);
    rerenderList();
  },
  'filter': (el) => {
    const def = currentDefaultGroups();
    const cur = new Set(filters.groups ?? def);
    cur.has(el.dataset.g) ? cur.delete(el.dataset.g) : cur.add(el.dataset.g);
    filters.groups = [...cur];
    render();
  },
  'filter-all': () => { filters.groups = []; render(); },
  'new-exercise': () => openExerciseForm(null, (ne) => {
    const parts = location.hash.split('/');
    if (parts[1] === 'treino' && parts[3] === 'add') { addItem(parts[2], ne.id); toast('Criado e adicionado ✓'); }
  }),
  'edit-exercise': (el) => openExerciseForm(findExercise(el.dataset.id)),
  'remove-item': (el) => {
    if (!confirm('Remover este exercício do treino?')) return;
    update(st => { const w = st.workouts.find(x => x.id === el.dataset.w); w.items = w.items.filter(i => i.id !== el.dataset.id); });
    go(`#/treino/${el.dataset.w}`);
  },
  'swap': (el) => openSwap(el.dataset.w, el.dataset.id, !!el.dataset.perm),
  'unswap': (el) => { update(st => { delete st.session.swaps?.[el.dataset.id]; }); render(); },
  'new-method': () => openMethodForm(() => render()),
  'delete-method': (el) => {
    if (!confirm('Excluir este método?')) return;
    update(st => {
      st.customMethods = st.customMethods.filter(m => m.id !== el.dataset.id);
      st.workouts.forEach(w => w.items.forEach(i => { if (i.method === el.dataset.id) i.method = 'normal'; }));
    });
    render();
  },
  'method-info': (el) => { const m = findMethod(el.dataset.id); sheet(`<h2>${esc(m.name)}</h2><p>${esc(m.desc)}</p><div class="row end"><button class="btn primary" data-close>Entendi</button></div>`); },
  'start': (el) => startWorkout(el.dataset.id),
  'check': (el) => {
    const { id, s } = el.dataset;
    let nowOn = false, item;
    update(st => {
      const arr = st.session.checks[id] ||= [];
      arr[s] = !arr[s];
      nowOn = arr[s];
      item = st.workouts.find(w => w.id === st.session.workoutId).items.find(i => i.id === id);
    });
    if (nowOn && item?.rest > 0) rest = { end: Date.now() + item.rest * 1000, total: item.rest };
    navigator.vibrate?.(30);
    render();
  },
  'rest-add': () => { if (rest) { rest.end += 15000; rest.total += 15; renderRest(); } },
  'rest-skip': () => { rest = null; renderRest(); },
  'finish': () => finishWorkout(),
  'cancel-session': () => {
    if (!confirm('Descartar o treino em andamento? Nada será salvo no histórico.')) return;
    const wid = S().session.workoutId;
    update(st => { st.session = null; });
    rest = null; stopSessionUi(); renderRest();
    go(`#/treino/${wid}`);
  },
  'acc-mode': (el) => { accountMode = el.dataset.mode; render(); },
  'forgot': async () => {
    const email = document.querySelector('#aform [name=email]')?.value.trim() || prompt('Seu e-mail:');
    if (!email) return;
    try { await cloud.resetPassword(email); alert('Se esse e-mail tiver conta, enviamos um link para criar uma nova senha.'); }
    catch (ex) { alert(authError(ex)); }
  },
  'save-name': async () => {
    const v = document.getElementById('pname').value.trim();
    try { await cloud.updateName(v); toast('Nome salvo ✓'); } catch (ex) { alert(authError(ex)); }
  },
  'sync-now': () => cloud.sync(),
  'logout': async () => {
    if (!confirm('Sair da conta? Seus treinos continuam salvos na nuvem e voltam quando você entrar de novo.')) return;
    if (await cloud.signOut()) { toast('Você saiu'); go('#/'); }
  },
  'delete-account': async () => {
    if (!confirm('Excluir sua conta e TODOS os seus dados da nuvem? Isso não tem volta.')) return;
    if (prompt('Para confirmar, digite EXCLUIR') !== 'EXCLUIR') return;
    try { await cloud.deleteAccount(); toast('Conta excluída'); go('#/'); }
    catch (ex) { alert('Não foi possível excluir: ' + authError(ex)); }
  },
  'export': () => {
    const blob = new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `treinos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  },
  'reset': () => {
    if (!confirm('Apagar TODOS os treinos, histórico e configurações?')) return;
    replaceState({});
    go('#/');
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !actions[el.dataset.act]) return;
  e.preventDefault();
  actions[el.dataset.act](el, e);
});

// busca com atualização sem perder o foco
document.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  filters.q = e.target.value;
  rerenderList();
});

function currentDefaultGroups() {
  const p = location.hash.split('/');
  return p[1] === 'treino' && p[3] === 'add' ? findWorkout(p[2])?.groups || [] : [];
}

function rerenderList() {
  const list = document.getElementById('list');
  if (!list) return render();
  const p = location.hash.split('/');
  const w = p[1] === 'treino' && p[3] === 'add' ? findWorkout(p[2]) : null;
  list.innerHTML = exerciseList(filtered(currentDefaultGroups()), { workout: w });
  const fab = document.querySelector('.fab');
  if (fab && w) fab.textContent = `Pronto (${w.items.length})`;
}

// ============ roteador ============
let lastRoute = '';
function render() {
  // links de confirmação/recuperação do Supabase chegam como #access_token=…; mostra a tela inicial
  const hash = /access_token|error_description/.test(location.hash) ? '#/' : (location.hash || '#/');
  const p = hash.slice(2).split('/');
  const routeKey = p.slice(0, 2).join('/') + (p[3] || '');
  if (routeKey !== lastRoute) { filters.q = ''; filters.groups = null; lastRoute = routeKey; }

  let html, mount;
  if (!p[0]) html = viewHome();
  else if (p[0] === 'treino' && p[2] === 'add') html = viewAdd(p[1]);
  else if (p[0] === 'treino' && p[2] === 'item') { html = viewItem(p[1], p[3]); mount = () => mountItem(p[1], p[3]); }
  else if (p[0] === 'treino') html = viewWorkout(p[1]);
  else if (p[0] === 'exercicios') html = viewLibrary();
  else if (p[0] === 'exercicio') html = viewExercise(p[1]);
  else if (p[0] === 'metodos') html = viewMethods();
  else if (p[0] === 'historico') html = viewHistory();
  else if (p[0] === 'config') { html = viewConfig(); mount = mountConfig; }
  else if (p[0] === 'conta') { html = viewAccount(); mount = mountAccount; }
  else if (p[0] === 'sessao') { html = viewSession(p[1]); if (S().session?.workoutId === p[1]) mount = mountSession; }
  else html = viewNotFound();

  const scroll = window.scrollY;
  const same = app.dataset.hash === hash;
  app.innerHTML = html;
  app.dataset.hash = hash;
  window.scrollTo(0, same ? scroll : 0);
  mount?.();
  // o cronômetro de descanso continua visível no treino e ao abrir o vídeo de um exercício
  if (p[0] === 'sessao' || p[0] === 'exercicio') renderRest();
  else document.getElementById('rest')?.remove();
}

window.addEventListener('hashchange', render);

render();

cloud.initAuth((event) => {
  if (event === 'recovery') { go('#/conta'); setTimeout(openNewPassword, 300); return; }
  if (['SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION'].includes(event)) {
    if (event === 'SIGNED_IN' && location.hash === '#/conta') return go('#/');
    render();
  }
});
// dados novos vindos de outro aparelho: redesenha, a não ser que a pessoa esteja digitando
window.addEventListener('cloud-changed', () => {
  if (!document.activeElement?.matches('input, textarea, select')) render();
});
cloud.onStatus(() => {
  const el = document.getElementById('cloud-status');
  if (el) el.innerHTML = statusText();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
