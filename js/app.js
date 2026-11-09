import { GROUPS, EXERCISES, METHODS, WORKOUT_TEMPLATES, COLORS, PROGRAMS, STYLE_PROGRAMS } from './data.js';
const ALL_PROGRAMS = [...PROGRAMS, ...STYLE_PROGRAMS];
import { getState, update, replaceState, uid } from './store.js';
import * as cloud from './cloud.js';
import { TERMS_VERSION, TERMS_HTML } from './terms.js';
import { APP_NAME, APP_VERSION } from './brand.js';
import { GOALS, LEVELS, TIMES, PLACES, FOCUS, PAINS, generatePlan } from './planner.js';

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

const isCardio = (exId) => findExercise(exId)?.group === 'cardio';
const fmtReps = (r) => String(r).replace(/^(\d+)\s*-\s*(\d+)$/, '$1 a $2');
const fmtMinutes = (r) => String(r).replace(/\s*min$/, ' minutos');
// tempo estimado: cardio pelos minutos; musculação ≈ 30s por série + descanso
function estMinutes(w) {
  let sec = 0;
  for (const it of w.items) {
    if (isCardio(it.exerciseId)) { sec += (parseInt(it.reps) || 10) * 60; continue; }
    sec += it.sets * (30 + (it.rest || 0)) + 15;
  }
  return Math.max(5, Math.round(sec / 300) * 5);
}

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

// ============ ícones (traço, no estilo da barra flutuante) ============
const ICONS = {
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 7.5h7M9 11h5"/>',
  flask: '<path d="M9 3h6M10 3v6.5L4.8 18.6A1.6 1.6 0 0 0 6.2 21h11.6a1.6 1.6 0 0 0 1.4-2.4L14 9.5V3"/><path d="M7.5 15h9"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
};
const icon = (name, size = 22) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

function openMainMenu() {
  const u = cloud.currentUser();
  const at = cloud.myUsername?.();
  const sh = sheet(`
    <div class="menu-head">
      <span class="avatar">${esc((cloud.myName?.() || '?').slice(0, 1).toUpperCase())}</span>
      <div><h2 style="margin:0">${esc(cloud.myName?.() || 'Minha conta')}</h2><small class="hint">${at ? '@' + esc(at) : u ? '' : 'sem conta'}</small></div>
    </div>
    <button class="menu-item" data-mm="#/conta"><span>${icon('user')}</span>Minha conta</button>
    <button class="menu-item" data-mm="#/metodos"><span>${icon('flask')}</span>Métodos de treino</button>
    <button class="menu-item" data-mm="#/config"><span>${icon('settings')}</span>Configurações e backup</button>
    <button class="menu-item" data-mm="terms"><span>${icon('doc')}</span>Termos de uso e privacidade</button>
    <button class="menu-item" data-mm="#/admin" id="mm-admin" hidden><span>${icon('shield')}</span>Painel de testes</button>
    ${u ? `<button class="menu-item danger" data-mm="logout"><span>${icon('logout')}</span>Sair</button>` : ''}`);
  cloud.amIAdmin?.().then(v => { const b = sh.querySelector('#mm-admin'); if (b && v) b.hidden = false; }).catch(() => {});
  sh.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-mm]')?.dataset.mm;
    if (!a) return;
    sh.close();
    if (a.startsWith('#')) go(a);
    if (a === 'terms') setTimeout(openTerms, 260);
    if (a === 'logout' && confirm('Sair da conta? Seus treinos continuam salvos na nuvem.')) { if (await cloud.signOut()) toast('Você saiu'); }
  });
}

// ============ tema (automático / claro / escuro) ============
const THEME_KEY = 'app-treino:theme';
const getTheme = () => { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; } };
function applyTheme(t = getTheme()) {
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
  const light = t === 'light' || (t === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.getElementById('meta-theme')?.setAttribute('content', light ? '#f3f5f8' : '#0b0f14');
}
applyTheme();
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => applyTheme());

// ============ layout ============
function page({ title, back, backAct, actions = '', body, nav = true, fab = '' }) {
  const hash = location.hash || '#/';
  const tab = (h, ic, label) => {
    const on = hash === h || (h !== '#/' && hash.startsWith(h)) || (h === '#/' && /^#\/(treino|programa)/.test(hash));
    return `<a href="${h}" class="${on ? 'active' : ''}" aria-label="${label}">${icon(ic)}<span>${label}</span></a>`;
  };
  return `
    <header class="top">
      ${back ? `<a class="icon-btn" href="${back}" aria-label="Voltar">←</a>` : backAct ? `<button class="icon-btn" data-act="${backAct}" aria-label="Voltar">←</button>` : ''}
      <h1>${title}</h1>
      <div class="top-actions">${actions}</div>
    </header>
    <main class="${nav ? 'with-nav' : ''}">${body}</main>
    ${fab}
    ${nav ? `<nav class="bottom">
      ${tab('#/', 'dumbbell', 'Treinos')}
      ${tab('#/exercicios', 'book', 'Exercícios')}
      ${tab('#/historico', 'calendar', 'Histórico')}
    </nav>` : ''}`;
}

// ============ telas ============
function viewHome() {
  const { workouts, session } = S();
  const sw = session && findWorkout(session.workoutId);

  const next = nextWorkout();
  const today = new Date().toDateString();
  const doneToday = new Set(S().history.filter(h => new Date(h.end).toDateString() === today).map(h => h.workoutId));
  const list = workouts.length ? `<div data-sortable="workouts">` + workouts.map(w => `
    <div class="card workout ${sw?.id === w.id ? 'next live' : !sw && next?.id === w.id ? 'next' : ''}" style="--c:${esc(w.color)}" data-sort-id="${w.id}" data-press="workout" data-id="${w.id}">
      <a class="workout-main" href="#/treino/${w.id}">
        ${badge(w, 'lg')}
        <div class="grow">
          ${sw?.id === w.id ? '<span class="next-tag">⏱ Em andamento · toque no ▶ para continuar</span>' : doneToday.has(w.id) ? '<span class="done-tag">✅ Feito hoje</span>' : !sw && next?.id === w.id ? '<span class="next-tag">👉 Próximo treino</span>' : ''}
          <h3>${esc(w.name)}</h3>
          <small>${w.items.length ? `~${estMinutes(w)} min · ` : ''}${w.items.length} exercício${w.items.length === 1 ? '' : 's'}${w.groups?.length ? ' · ' + w.groups.map(groupName).join(', ') : ''}</small>
        </div>
      </a>
      <button class="play" data-act="start" data-id="${w.id}" aria-label="Iniciar treino">▶</button>
    </div>`).join('') + `</div>
    <p class="hint center">Segure um treino para ver opções ou arraste para mudar a ordem</p>` : `
    <div class="empty">
      <div class="big">🏋️</div>
      <h2>Monte seu primeiro treino</h2>
      <p>Crie treinos A, B, C… do seu jeito: “Pernas”, “Peito e Tríceps”, o que quiser. Depois é só adicionar os exercícios e os métodos.</p>
      <div class="stack">
        <button class="btn primary" data-act="quiz-start">🎯 Montar meu treino personalizado</button>
        <a class="btn" href="#/programas">📋 Escolher um treino pronto</a>
        <button class="btn" data-act="new-workout">+ Montar do zero</button>
      </div>
    </div>`;

  return page({
    title: `Meus treinos`,
    actions: `<button class="streak-chip ${streakInfo().count ? '' : 'off'} ${streakInfo().atRisk && !streakInfo().trainedToday ? 'risk' : ''}" data-act="streak" aria-label="Ofensiva">🔥 ${streakInfo().count}</button>
              <button class="icon-btn menu-btn" data-act="main-menu" aria-label="Menu">${icon('menu', 26)}</button>`,
    body: list,
    fab: workouts.length ? `<button class="fab" data-act="new-menu">+ Novo treino</button>` : '',
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
      <div class="card item" data-sort-id="${it.id}" data-press="item" data-w="${w.id}" data-id="${it.id}">
        <span class="pos-n">${i + 1}</span>
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
    body: `
      ${w.items.length ? `<button class="btn primary block" data-act="start" data-id="${w.id}">▶ Iniciar treino</button>` : ''}
      ${items ? `<p class="hint center">Segure um exercício para ver opções ou arraste para mudar a ordem</p><div data-sortable="items" data-w="${w.id}">${items}</div>` : ''}
      ${items ? '' : `<div class="empty"><p>Nenhum exercício ainda. Adicione os exercícios desse treino 👇</p></div>`}
      <a class="btn block dashed" href="#/treino/${w.id}/add">+ Adicionar exercícios</a>
      <button class="btn block" data-act="workout-menu" data-id="${w.id}">⋯ Opções do treino</button>`,
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

// ============ compartilhar por link ============
const b64url = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function packShare(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if ('CompressionStream' in window) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return 'z' + b64url(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  return 'j' + b64url(bytes);
}

async function unpackShare(code) {
  const bytes = unb64url(code.slice(1));
  let text;
  if (code[0] === 'z') {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    text = await new Response(stream).text();
  } else text = new TextDecoder().decode(bytes);
  const data = JSON.parse(text);
  if (!Array.isArray(data.w) || !data.w.length) throw new Error('link inválido');
  return data;
}

function pendingImport() {
  try { return localStorage.getItem('app-treino:import'); } catch { return null; }
}
function clearPendingImport() {
  try { localStorage.removeItem('app-treino:import'); } catch {}
}

async function shareWorkouts(ids) {
  const ws = S().workouts.filter(w => ids.includes(w.id));
  if (!ws.length) return;
  const exIds = new Set(ws.flatMap(w => w.items.map(i => i.exerciseId)));
  const mIds = new Set(ws.flatMap(w => w.items.map(i => i.method)));
  const payload = {
    v: 1,
    from: cloud.myName(),
    w: ws.map(w => ({
      letter: w.letter, name: w.name, color: w.color, groups: w.groups || [],
      items: w.items.map(i => ({ exerciseId: i.exerciseId, sets: i.sets, reps: i.reps, rest: i.rest, method: i.method, notes: i.notes || '' })),
    })),
    ce: S().customExercises.filter(e => exIds.has(e.id)),
    cm: S().customMethods.filter(m => mIds.has(m.id)),
  };
  const url = `${location.origin}${location.pathname}#/importar/${await packShare(payload)}`;
  const label = ws.length === 1 ? `o treino ${ws[0].letter} – ${ws[0].name}` : `${ws.length} treinos (${ws.map(w => w.letter).join(', ')})`;
  const text = `💪 ${payload.from || 'Um amigo'} te mandou ${label} no app ${APP_NAME}!\nToca no link pra adicionar:\n${url}`;
  const sh = sheet(`
    <h2>📤 Compartilhar ${esc(label)}</h2>
    <p class="hint">Quem abrir o link vê o treino e adiciona na conta dele com um toque. Cargas não vão junto, cada um usa a sua.</p>
    <div class="stack">
      <a class="btn whatsapp" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Enviar no WhatsApp</a>
      ${navigator.share ? `<button class="btn" data-share-native>Outros apps…</button>` : ''}
      <button class="btn" data-copy>🔗 Copiar link</button>
      <button class="btn" data-close>Fechar</button>
    </div>`);
  sh.querySelector('[data-share-native]')?.addEventListener('click', () => navigator.share({ text }).catch(() => {}));
  sh.querySelector('[data-copy]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copiado ✓'); }
    catch { prompt('Copie o link:', url); }
  });
}

function viewImport() {
  return page({
    title: '📩 Treino recebido',
    back: '#/',
    nav: false,
    body: `<div id="import-box"><div class="empty"><p>Abrindo treino…</p></div></div>`,
  });
}

async function mountImport(code) {
  const box = document.getElementById('import-box');
  let data;
  try { data = await unpackShare(code); }
  catch {
    clearPendingImport();
    box.innerHTML = `<div class="empty"><p>Esse link de treino está incompleto ou quebrado. Peça pra pessoa mandar de novo.</p><a class="btn" href="#/">Voltar</a></div>`;
    return;
  }
  const exName = (id) => findExercise(id)?.name || data.ce?.find(e => e.id === id)?.name || 'Exercício';
  box.innerHTML = `
    <div class="card"><p><b>${esc(data.from || 'Um amigo')}</b> te mandou ${data.w.length === 1 ? 'este treino' : 'estes treinos'}:</p></div>
    ${data.w.map(w => `
      <div class="card">
        <div class="row" style="margin-top:0">${badge(w)}<h3>${esc(w.name)}</h3></div>
        ${w.items.map(it => {
          const e = findExercise(it.exerciseId);
          return `<div class="prog-ex">${thumb(e)}<span class="grow"><b>${esc(exName(it.exerciseId))}</b>
            <small>${it.sets} × ${esc(it.reps)} · ⏱ ${it.rest}s${it.method && it.method !== 'normal' ? ' · ' + esc(findMethod(it.method)?.name || data.cm?.find(m => m.id === it.method)?.name || '') : ''}</small></span></div>`;
        }).join('')}
      </div>`).join('')}
    <div class="stack">
      <button class="btn primary" data-import="add">Adicionar aos meus treinos</button>
      ${S().workouts.length ? `<button class="btn" data-import="replace">Substituir os meus por estes</button>` : ''}
      <button class="btn" data-import="no">Agora não</button>
    </div>`;
  box.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-import]')?.dataset.import;
    if (!c) return;
    clearPendingImport();
    if (c === 'no') return go('#/');
    if (c === 'replace' && !confirm('Seus treinos atuais serão apagados (o histórico continua). Confirmar?')) return;
    update(st => {
      for (const e of data.ce || []) if (!st.customExercises.some(x => x.id === e.id)) st.customExercises.push({ ...e, custom: true });
      for (const m of data.cm || []) if (!st.customMethods.some(x => x.id === m.id)) st.customMethods.push({ ...m, custom: true });
    });
    addWorkouts(data.w, c === 'replace');
    toast('Treino adicionado ✓');
    go('#/');
  });
}

// ============ painel de testes (admin) ============
const appUrl = () => location.origin + location.pathname;

const suggestUsername = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .trim().replace(/\s+/g, '.').replace(/[^a-z0-9_.]/g, '').slice(0, 24);

function viewAdmin() {
  return page({
    title: '🛠️ Painel de testes',
    back: '#/conta',
    nav: false,
    body: `
      <div class="card">
        <h3>Criar usuário</h3>
        <form id="newuser">
          <label>Nome</label><input name="name" maxlength="60" required placeholder="Ex.: Rian">
          <label>Usuário</label>
          <div class="at-input"><span>@</span><input name="username" required pattern="[a-z0-9_.]{3,24}" maxlength="24" autocapitalize="none" spellcheck="false" placeholder="rian"></div>
          <p class="hint">Senha inicial: <b>${cloud.DEFAULT_PASSWORD}</b> — no primeiro acesso o app pede pra pessoa criar a senha dela.</p>
          <p class="hint" id="nuerr"></p>
          <button class="btn primary block">Criar usuário</button>
        </form>
      </div>
      <h3 class="sec">Usuários</h3>
      <div id="users"><p class="hint">Carregando…</p></div>`,
  });
}

async function mountAdmin() {
  if (!(await cloud.amIAdmin())) { go('#/conta'); return; }
  const form = document.getElementById('newuser');
  let touched = false;
  form.username.addEventListener('input', () => { touched = true; form.username.value = form.username.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''); });
  form.name.addEventListener('input', () => { if (!touched) form.username.value = suggestUsername(form.name.value); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('nuerr');
    const btn = form.querySelector('button.primary');
    btn.disabled = true; err.textContent = '';
    const name = form.name.value.trim(), username = form.username.value.trim();
    try {
      await cloud.adminCreateLogin(username, name);
      showCredentials(name, username);
      form.reset(); touched = false;
      loadUsers();
    } catch (ex) { err.textContent = ex.message || String(ex); }
    finally { btn.disabled = false; }
  });
  loadUsers();
}

function showCredentials(name, username, isReset = false) {
  const text = `💪 ${isReset ? `Sua senha do app ${APP_NAME} foi resetada` : `Seu acesso ao app ${APP_NAME}`}${name ? ', ' + name : ''}!\n\n📲 Abre: ${appUrl()}\n👤 Usuário: @${username}\n🔑 Senha: ${cloud.DEFAULT_PASSWORD}\n\nNo primeiro acesso o app pede pra você criar sua própria senha.`;
  const sh = sheet(`
    <h2>✅ ${isReset ? 'Senha resetada' : 'Usuário criado'}</h2>
    <div class="card"><p>👤 <b>@${esc(username)}</b><br>🔑 <b>${cloud.DEFAULT_PASSWORD}</b> <small>(troca no primeiro acesso)</small></p></div>
    <div class="stack">
      <a class="btn whatsapp" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">Enviar no WhatsApp</a>
      <button class="btn" data-copy>📋 Copiar mensagem</button>
      <button class="btn" data-close>Fechar</button>
    </div>`);
  sh.querySelector('[data-copy]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(text); toast('Copiado ✓'); } catch { prompt('Copie:', text); }
  });
}

async function loadUsers() {
  const box = document.getElementById('users');
  if (!box) return;
  try {
    const users = await cloud.adminListLogins();
    const fmt = (t) => t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : 'nunca';
    box.innerHTML = users.map(u => `
      <div class="card user-row">
        <div class="grow"><b>${esc(u.name || '—')}</b>
          <small>${u.username ? '@' + esc(u.username) : esc(u.email)}${u.must_change_password ? ' · ⏳ ainda não trocou a senha' : ''}</small>
          <small>criado ${fmt(u.created_at)} · último acesso ${fmt(u.last_sign_in_at)}</small></div>
        ${u.username ? `<button class="btn small" data-reset="${u.id}" data-username="${esc(u.username)}" data-name="${esc(u.name || '')}">🔑 Resetar</button>` : ''}
      </div>`).join('') || '<p class="hint">Nenhum usuário.</p>';
    box.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(`Voltar a senha de @${b.dataset.username} para ${cloud.DEFAULT_PASSWORD}?`)) return;
      try { await cloud.adminResetLogin(b.dataset.reset); showCredentials(b.dataset.name, b.dataset.username, true); loadUsers(); }
      catch (ex) { alert(ex.message || ex); }
    }));
  } catch (ex) { box.innerHTML = `<p class="hint">Erro: ${esc(ex.message || ex)}</p>`; }
}

// ============ treino personalizado (questionário) ============
const QUIZ = [
  { key: 'goal', title: 'Qual é o seu foco?', sub: 'Escolha o principal. Dá pra mudar depois.', options: GOALS },
  { key: 'level', title: 'Há quanto tempo você treina?', options: LEVELS },
  { key: 'days', title: 'Quantos dias por semana você consegue treinar?', options: [2, 3, 4, 5, 6].map(n => ({ id: n, icon: String(n), name: `${n} dias`, desc: { 2: 'Corpo todo, 2 treinos', 3: 'Ótimo para começar', 4: 'Equilíbrio entre treino e descanso', 5: 'Rotina puxada', 6: 'Para quem vive na academia' }[n] })) },
  { key: 'time', title: 'Quanto tempo você tem por treino?', options: TIMES },
  { key: 'place', title: 'Onde você vai treinar?', options: PLACES },
  { key: 'focus', title: 'Quer dar atenção extra a alguma parte?', sub: 'Opcional. Pode marcar mais de uma.', multi: true, options: FOCUS },
  { key: 'pains', title: 'Sente dor ou tem lesão em algum lugar?', sub: 'O app evita os exercícios que forçam essa região.', multi: true, options: PAINS, none: 'Não tenho' },
];
let quiz = null;      // { step, answers }
let lastPlan = null;  // { answers, workouts, tips }

function startQuiz() {
  quiz = { step: 0, answers: { focus: [], pains: [], ...(S().goalAnswers || {}) } };
  go('#/objetivo');
  render();
}

function viewQuiz() {
  if (!quiz) quiz = { step: 0, answers: { focus: [], pains: [], ...(S().goalAnswers || {}) } };
  const q = QUIZ[quiz.step];
  const a = quiz.answers;
  const sel = (id) => q.multi ? (a[q.key] || []).includes(id) : a[q.key] === id;
  return `
    <main class="quiz">
      <div class="quiz-top">
        <button class="icon-btn" data-act="quiz-back" aria-label="Voltar">←</button>
        <div class="progress grow"><div style="width:${Math.round((quiz.step + 1) / QUIZ.length * 100)}%"></div></div>
        <span class="hint">${quiz.step + 1}/${QUIZ.length}</span>
      </div>
      <h1>${q.title}</h1>
      ${q.sub ? `<p class="hint">${q.sub}</p>` : ''}
      <div class="quiz-options ${q.key === 'days' ? 'grid-days' : ''}">
        ${q.options.map(o => `
          <button class="quiz-opt ${sel(o.id) ? 'on' : ''}" data-act="quiz-pick" data-id="${o.id}">
            ${o.icon ? `<span class="qi">${o.icon}</span>` : ''}
            <span class="grow"><b>${esc(o.name)}</b>${o.desc ? `<small>${esc(o.desc)}</small>` : ''}</span>
            ${q.multi ? `<span class="qcheck">${sel(o.id) ? '✓' : ''}</span>` : ''}
          </button>`).join('')}
        ${q.none ? `<button class="quiz-opt ${(a[q.key] || []).length ? '' : 'on'}" data-act="quiz-none"><span class="grow"><b>${q.none}</b></span></button>` : ''}
      </div>
      ${q.multi ? `<button class="btn primary block quiz-next" data-act="quiz-next">${quiz.step === QUIZ.length - 1 ? 'Gerar meu treino ✨' : 'Continuar'}</button>` : ''}
    </main>`;
}

function quizNext() {
  if (quiz.step < QUIZ.length - 1) { quiz.step++; render(); return; }
  update(st => { st.goalAnswers = { ...quiz.answers }; });
  const plan = generatePlan(quiz.answers, allExercises());
  lastPlan = { answers: { ...quiz.answers }, ...plan };
  go('#/objetivo/plano');
}

function viewPlan() {
  if (!lastPlan) { go('#/objetivo'); return viewQuiz(); }
  const a = lastPlan.answers;
  const goal = GOALS.find(g => g.id === a.goal), level = LEVELS.find(l => l.id === a.level);
  return page({
    title: '✨ Seu treino',
    back: '#/',
    nav: false,
    body: `
      <div class="card plan-head">
        <div class="big">${goal?.icon || '💪'}</div>
        <h2>${esc(goal?.name || '')}</h2>
        <p class="hint">${esc(level?.name || '')} · ${a.days}x por semana · ${esc(TIMES.find(t => t.id === a.time)?.name || '')} · ${a.place === 'casa' ? 'em casa' : 'academia'}</p>
        <p>Montamos ${lastPlan.workouts.length} treinos (${lastPlan.workouts.map(w => w.letter).join(', ')}). Faça em sequência: terminou o último, volta pro A.</p>
      </div>
      ${lastPlan.tips.map(t => `<p class="tip">💡 ${esc(t)}</p>`).join('')}
      ${lastPlan.workouts.map((w, i) => `
        <div class="card">
          <div class="row" style="margin-top:0">${badge({ letter: w.letter, color: COLORS[i % COLORS.length] })}<h3>${esc(w.name)}</h3></div>
          ${w.items.map(it => {
            const e = findExercise(it.exerciseId);
            const m = findMethod(it.method);
            return `<a class="prog-ex" href="#/exercicio/${e.id}">${thumb(e)}<span class="grow"><b>${esc(e.name)}</b>
              <small>${it.sets} × ${esc(it.reps)}${it.rest ? ' · ⏱ ' + it.rest + 's' : ''}${m.id !== 'normal' ? ' · ' + esc(m.name) : ''}</small></span></a>`;
          }).join('')}
        </div>`).join('')}
      <p class="hint">⚠️ Treino gerado automaticamente com base nas suas respostas. É um ponto de partida: ajuste as cargas e, se puder, mostre para um educador físico.</p>
      <div class="stack">
        <button class="btn primary" data-act="use-plan">Usar este treino</button>
        <button class="btn" data-act="quiz-redo">Refazer as perguntas</button>
      </div>`,
  });
}

// ============ segurar para abrir opções ============
const menuItem = (icon, label, act, cls = '') => `<button class="menu-item ${cls}" data-menu="${act}"><span>${icon}</span>${label}</button>`;

function workoutMenu(id) {
  const w = findWorkout(id);
  if (!w) return;
  const sh = sheet(`
    <div class="menu-head">${badge(w, 'lg')}<div><h2 style="margin:0">${esc(w.name)}</h2><small class="hint">${w.items.length} exercícios</small></div></div>
    ${menuItem('▶', 'Iniciar treino', 'start')}
    ${menuItem('✏️', 'Renomear', 'rename')}
    ${menuItem('🎨', 'Letra, cor e grupos', 'edit')}
    ${menuItem('📤', 'Compartilhar', 'share')}
    ${menuItem('📄', 'Duplicar', 'dup')}
    ${menuItem('🗑️', 'Excluir treino', 'delete', 'danger')}`);
  sh.addEventListener('click', (e) => {
    const a = e.target.closest('[data-menu]')?.dataset.menu;
    if (!a) return;
    sh.close();
    if (a === 'start') startWorkout(id);
    if (a === 'rename') renameWorkout(id);
    if (a === 'edit') openWorkoutForm(findWorkout(id));
    if (a === 'share') shareWorkouts([id]);
    if (a === 'dup') {
      update(st => {
        const src = st.workouts.find(x => x.id === id);
        const used = new Set(st.workouts.map(x => x.letter));
        st.workouts.push({ ...structuredClone(src), id: uid(), letter: LETTERS.find(l => !used.has(l)) || src.letter,
          name: (src.name + ' (cópia)').slice(0, 40), items: src.items.map(it => ({ ...structuredClone(it), id: uid() })) });
      });
      toast('Treino duplicado ✓'); render();
    }
    if (a === 'delete') {
      if (!confirm(`Excluir o treino ${w.letter} – ${w.name}?`)) return;
      update(st => { st.workouts = st.workouts.filter(x => x.id !== id); if (st.session?.workoutId === id) st.session = null; });
      toast('Treino excluído'); go('#/'); render();
    }
  });
}

function renameWorkout(id) {
  const w = findWorkout(id);
  const sh = sheet(`
    <form id="rnform"><h2>Renomear treino</h2>
      <div class="row" style="margin-top:0">${badge(w, 'lg')}<input name="name" class="grow" maxlength="40" required value="${esc(w.name)}"></div>
      <div class="row end"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">Salvar</button></div>
    </form>`);
  const f = sh.querySelector('form');
  setTimeout(() => { f.name.focus(); f.name.select(); }, 300);
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    update(st => { st.workouts.find(x => x.id === id).name = f.name.value.trim(); });
    sh.close(); toast('Nome salvo ✓'); render();
  });
}

function itemMenu(wid, iid) {
  const w = findWorkout(wid);
  const it = w?.items.find(i => i.id === iid);
  if (!it) return;
  const e = findExercise(it.exerciseId);
  const sh = sheet(`
    <div class="menu-head">${thumb(e)}<div><h2 style="margin:0">${esc(e?.name || 'Exercício')}</h2><small class="hint">${itemSummary(it)}</small></div></div>
    ${menuItem('✏️', 'Editar séries, carga e método', 'edit')}
    ${menuItem('🔄', 'Trocar por outra variação', 'swap')}
    ${e ? menuItem('📋', 'Ver como faz', 'how') : ''}
    ${menuItem('📄', 'Duplicar', 'dup')}
    ${menuItem('🗑️', 'Remover do treino', 'delete', 'danger')}`);
  sh.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-menu]')?.dataset.menu;
    if (!a) return;
    sh.close();
    if (a === 'edit') go(`#/treino/${wid}/item/${iid}`);
    if (a === 'swap') setTimeout(() => openSwap(wid, iid, true), 260);
    if (a === 'how') go(`#/exercicio/${e.id}`);
    if (a === 'dup') {
      update(st => { const items = st.workouts.find(x => x.id === wid).items; const i = items.findIndex(x => x.id === iid); items.splice(i + 1, 0, { ...structuredClone(items[i]), id: uid() }); });
      toast('Exercício duplicado ✓'); render();
    }
    if (a === 'delete') {
      if (!confirm(`Remover ${e?.name || 'este exercício'} do treino?`)) return;
      update(st => { const ww = st.workouts.find(x => x.id === wid); ww.items = ww.items.filter(x => x.id !== iid); });
      toast('Exercício removido'); render();
    }
  });
}

// Segurar o card (~0,45s): se soltar sem mexer, abre o menu; se arrastar, muda a ordem.
// Deslizar sem segurar continua rolando a tela normalmente.
let press = null, suppressClick = false;
const openPressMenu = (el) => {
  if (el.dataset.press === 'workout') workoutMenu(el.dataset.id);
  if (el.dataset.press === 'item') itemMenu(el.dataset.w, el.dataset.id);
};
const endPress = () => {
  if (!press) return;
  clearTimeout(press.timer); clearTimeout(press.t0);
  press.el.classList.remove('pressing', 'lifted');
  press = null;
};
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-press]');
  if (!el || e.target.closest('[data-drag], button, input, select, textarea')) return;
  press = { el, x: e.clientX, y: e.clientY, armed: false, dragging: false };
  press.t0 = setTimeout(() => el.classList.add('pressing'), 120);
  press.timer = setTimeout(() => {
    if (!press) return;
    press.armed = true;
    suppressClick = true;
    el.classList.remove('pressing');
    el.classList.add('lifted');
    navigator.vibrate?.(15);
  }, 450);
});
document.addEventListener('pointermove', (e) => {
  if (!press || press.dragging) return;
  const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
  if (!press.armed) { if (moved > 10) endPress(); return; }   // deslizou sem segurar: é rolagem
  if (moved > 8 && press.el.closest('[data-sortable]')) {      // segurou e arrastou: reordenar
    press.dragging = true;
    press.el.classList.remove('lifted');
    startDrag(press.el, { clientY: press.y, preventDefault() {} });
    endPress();
  }
});
document.addEventListener('pointerup', () => {
  if (suppressClick) setTimeout(() => { suppressClick = false; }, 400);
  if (press?.armed && !press.dragging) { const el = press.el; endPress(); openPressMenu(el); return; }
  endPress();
});
document.addEventListener('pointercancel', endPress);
// enquanto o card está "levantado", o dedo não rola a tela
document.addEventListener('touchmove', (e) => { if (press?.armed || document.querySelector('.drag-ghost')) e.preventDefault(); }, { passive: false });
window.addEventListener('scroll', () => { if (press && !press.armed) endPress(); }, { passive: true });
// o "clique" que o navegador dispara ao soltar o dedo não pode abrir o treino nem fechar o menu recém-aberto
document.addEventListener('click', (e) => {
  if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); }
}, true);
document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-press]')) e.preventDefault(); });
// o card tem link e foto: impede o "arrastar link/imagem" do navegador, que cancelaria o nosso arrasto
document.addEventListener('dragstart', (e) => { if (e.target.closest?.('[data-press]')) e.preventDefault(); });

// ============ treinos prontos ============
function nextWorkout() {
  const { workouts, history } = S();
  if (!workouts.length) return null;
  const last = history.find(h => workouts.some(w => w.id === h.workoutId));
  if (!last) return workouts[0];
  const i = workouts.findIndex(w => w.id === last.workoutId);
  return workouts[(i + 1) % workouts.length];
}

const LEVEL_ICON = { 'Iniciante': '🌱', 'Intermediário': '🔥', 'Avançado': '🏆' };

const programIcon = (p) => p.icon || LEVEL_ICON[p.level] || '';
const programCard = (p) => `
        <a class="card program" href="#/programa/${p.id}">
          <div class="row between" style="margin-top:0"><h3>${programIcon(p)} ${esc(p.name)}</h3><span>›</span></div>
          <div class="letters-row">${p.workouts.map((w, i) => `<span class="badge" style="--c:${COLORS[i % COLORS.length]}">${w.letter}</span>`).join('')}
            <small>${p.workouts.map(w => esc(w.name)).join(' · ')}</small></div>
          <small>📅 ${esc(p.freq)}${p.style ? ` · nível: ${esc(p.level)}` : ''}</small>
        </a>`;

function viewPrograms() {
  return page({
    title: 'Treinos prontos',
    back: '#/',
    body: `
      <p class="hint">Escolha um programa para começar. Depois você pode mudar tudo: exercícios, séries, cargas e métodos.</p>
      <button class="card program quiz-cta" data-act="quiz-start"><b>🎯 Prefere um treino feito pra você?</b><small>Responda 7 perguntas e o app monta pelo seu objetivo.</small></button>
      <h3 class="sec">Por nível</h3>
      ${PROGRAMS.map(programCard).join('')}
      <h3 class="sec">Por estilo de treino</h3>
      <p class="hint">Estilos famosos que a galera da musculação segue.</p>
      ${STYLE_PROGRAMS.map(programCard).join('')}
      <p class="hint">⚠️ São sugestões gerais. Se tiver lesão, dor ou condição de saúde, procure um educador físico antes de começar.</p>`,
  });
}

function viewProgram(id) {
  const p = ALL_PROGRAMS.find(x => x.id === id);
  if (!p) return viewNotFound();
  return page({
    title: `${programIcon(p)} ${esc(p.name)}`,
    back: '#/programas',
    nav: false,
    body: `
      <div class="card"><p>${esc(p.desc)}</p><p class="hint">📅 ${esc(p.freq)}</p></div>
      ${p.workouts.map((w, i) => `
        <div class="card">
          <div class="row" style="margin-top:0">${badge({ letter: w.letter, color: COLORS[i % COLORS.length] })}<h3>${esc(w.name)}</h3></div>
          ${w.items.map(it => {
            const e = findExercise(it.exerciseId);
            const m = findMethod(it.method);
            return `<a class="prog-ex" href="#/exercicio/${e.id}">${thumb(e)}<span class="grow"><b>${esc(e.name)}</b>
              <small>${it.sets} × ${esc(it.reps)} · ⏱ ${it.rest}s${m.id !== 'normal' ? ' · ' + esc(m.name) : ''}</small></span></a>`;
          }).join('')}
        </div>`).join('')}
      <button class="btn primary block" data-act="use-program" data-id="${p.id}">Usar este programa</button>`,
  });
}

function applyProgram(p, replace) {
  addWorkouts(p.workouts, replace);
  toast(`${p.name} adicionado ✓`);
  go('#/');
}

function addWorkouts(list, replace) {
  update(st => {
    if (replace) {
      st.workouts = [];
      st.session = null;
    }
    const used = new Set(st.workouts.map(w => w.letter));
    list.forEach((w) => {
      const letter = used.has(w.letter) ? (LETTERS.find(l => !used.has(l)) || w.letter) : w.letter;
      used.add(letter);
      st.workouts.push({
        id: uid(), letter, name: w.name, groups: [...w.groups],
        color: w.color || COLORS[(st.workouts.length) % COLORS.length],
        items: w.items.map(it => ({ id: uid(), load: '', notes: '', method: 'normal', ...structuredClone(it) })),
      });
    });
  });
}

// ============ arrastar e soltar (reordenar) ============
function startDrag(handle, ev) {
  const card = handle.closest('[data-sort-id]');
  suppressClick = true;
  const list = card?.parentElement;
  if (!list?.dataset.sortable) return;
  ev.preventDefault();
  const startY = ev.clientY;
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add('drag-ghost');
  Object.assign(ghost.style, { width: rect.width + 'px', left: rect.left + 'px', top: rect.top + 'px' });
  document.body.appendChild(ghost);
  card.classList.add('drag-placeholder');
  navigator.vibrate?.(20);
  let lastY = ev.clientY, raf = null;

  const move = (e) => {
    lastY = e.clientY;
    ghost.style.transform = `translateY(${e.clientY - startY}px) scale(1.03)`;
    const siblings = [...list.children].filter(c => c !== card && c.dataset.sortId);
    const after = siblings.find(c => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
    if (after) { if (card.nextElementSibling !== after) list.insertBefore(card, after); }
    else if (list.lastElementChild !== card) list.appendChild(card);
  };
  // rola a tela quando arrasta perto das bordas
  const scroll = () => {
    const edge = 90;
    if (lastY < edge) window.scrollBy(0, -10);
    else if (lastY > innerHeight - edge) window.scrollBy(0, 10);
    raf = requestAnimationFrame(scroll);
  };
  raf = requestAnimationFrame(scroll);
  const end = () => {
    cancelAnimationFrame(raf);
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', end);
    document.removeEventListener('pointercancel', end);
    ghost.remove();
    card.classList.remove('drag-placeholder');
    const order = [...list.children].map(c => c.dataset.sortId).filter(Boolean);
    update(st => {
      const arr = list.dataset.sortable === 'workouts' ? st.workouts : st.workouts.find(w => w.id === list.dataset.w).items;
      arr.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    });
    render();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
}

document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-drag]');
  if (h) startDrag(h, e);
});

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
    update(s => { s.session = { workoutId: id, start: Date.now(), checks: {}, loads: {}, swaps: {}, active: null }; });
    restReady = null; rest = null;
  }
  go(`#/sessao/${id}`);
}

let restReady = null; // { itemId, secs }: descanso esperando o ▶

const doneSets = (ses, it) => Math.min(it.sets, (ses.checks[it.id] || []).filter(Boolean).length);

function viewSession(id) {
  const w = findWorkout(id);
  const ses = S().session;
  if (!w || !ses || ses.workoutId !== id) return viewWorkout(id);
  const active = ses.active && w.items.find(i => i.id === ses.active);
  return active ? viewSessionExercise(w, ses, active) : viewSessionList(w, ses);
}

// cartão de descanso: aparece depois de terminar uma série, com ▶ para começar
function restBlock() {
  if (rest) return `
    <div class="rest-big" id="restbig">
      <div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="track"/><circle cx="60" cy="60" r="52" class="bar" id="restring"/></svg>
        <div class="ring-txt"><small>Descanso</small><b id="restbig-time">--:--</b></div></div>
      <div class="row center-row"><button class="btn" data-act="rest-add">+15s</button><button class="btn" data-act="rest-skip">Pular descanso</button></div>
    </div>`;
  if (restReady) return `
    <div class="rest-ready">
      <div><small>Hora do descanso</small><b>${fmtDuration(restReady.secs * 1000)}</b></div>
      <button class="rest-play" data-act="rest-play" aria-label="Iniciar descanso">▶</button>
      <button class="link" data-act="rest-dismiss">pular</button>
    </div>`;
  return '';
}

function viewSessionList(w, ses) {
  const { done, total } = sessionProgress();
  const pct = total ? Math.round(done / total * 100) : 0;
  const swaps = ses.swaps || {};
  const cards = w.items.map((it) => {
    const e = findExercise(swaps[it.id] || it.exerciseId);
    const cardio = e?.group === 'cardio';
    const n = doneSets(ses, it);
    const complete = n >= it.sets;
    const running = rest?.itemId === it.id;
    return `
      <div class="card sess2 ${complete ? 'complete' : ''}">
        <div class="sess2-top">
          <button class="chk ${complete ? 'on' : ''}" data-act="check-all" data-id="${it.id}" aria-label="${complete ? 'Desmarcar' : 'Marcar como feito'}">${complete ? '✓' : ''}</button>
          <button class="sess2-main" data-act="ex-start" data-id="${it.id}">
            ${cardio ? `<span class="thumb cardio-thumb">❤️</span>` : thumb(e)}
            <span class="grow">
              <b>${cardio ? 'Cardio – ' : ''}${esc(e?.name || 'Exercício')}</b>
              <small>${cardio ? esc(fmtMinutes(it.reps)) : `${it.sets}x ${esc(fmtReps(it.reps))}`}${!cardio && n && !complete ? ` · ${n}/${it.sets} séries` : ''}</small>
            </span>
            ${cardio ? '' : '<span class="chev">›</span>'}
          </button>
        </div>
        ${cardio || !it.rest ? '' : `
        <div class="sess2-rest ${running ? 'running' : ''}" id="rr-${it.id}">
          <span class="rr-fill"></span>
          <b class="rr-time">${fmtDuration((running ? Math.max(0, Math.ceil((rest.end - Date.now()) / 1000)) : it.rest) * 1000)}</b>
          <small>(Descanso entre séries)</small>
          <button class="rr-play" data-act="rest-row" data-id="${it.id}" aria-label="${running ? 'Parar descanso' : 'Iniciar descanso'}">${running ? '■' : '▶'}</button>
        </div>`}
      </div>`;
  }).join('');

  return page({
    title: `${badge(w)} ${esc(w.name)}`,
    back: `#/treino/${w.id}`,
    nav: false,
    actions: `<span class="clock" id="clock">${fmtDuration(Date.now() - ses.start)}</span>`,
    body: `
      <div class="progress"><div style="width:${pct}%"></div></div>
      <p class="hint center">${done} de ${total} séries · marque o quadradinho quando terminar o exercício, ou toque nele para ir série por série</p>
      ${cards}
      <button class="link center-link" data-act="cancel-session">Descartar treino</button>`,
    fab: `<button class="finish-bar" data-act="finish">Finalizar treino</button>`,
  });
}

function viewSessionExercise(w, ses, it) {
  const swaps = ses.swaps || {};
  const e = findExercise(swaps[it.id] || it.exerciseId);
  const orig = swaps[it.id] ? findExercise(it.exerciseId) : null;
  const m = findMethod(it.method);
  const n = doneSets(ses, it);
  const complete = n >= it.sets;
  const restHere = rest?.itemId === it.id || restReady?.itemId === it.id;
  const main = restHere ? restBlock() : complete
    ? `<div class="ex-complete"><div class="big">✅</div><b>Exercício concluído!</b><button class="btn primary block" data-act="ex-back">Escolher o próximo</button></div>`
    : e?.group === 'cardio'
      ? `<button class="set-done" data-act="set-done" data-id="${it.id}"><small>${esc(fmtMinutes(it.reps))}</small>✓ Terminei o cardio</button>`
      : `<button class="set-done" data-act="set-done" data-id="${it.id}"><small>Série ${n + 1} de ${it.sets}</small>✓ Terminei a série</button>`;
  return page({
    title: esc(e?.name || 'Exercício'),
    backAct: 'ex-back',
    nav: false,
    actions: `<span class="clock" id="clock">${fmtDuration(Date.now() - ses.start)}</span>`,
    body: `
      ${e?.demo ? `<div class="demo ex-demo"><img src="img/ex/${e.id}-0.jpg" alt=""><img class="b" src="img/ex/${e.id}-1.jpg" alt=""></div>` : ''}
      <div class="ex-target">
        <div><b>${esc(fmtReps(it.reps))}</b><small>${/min|s$/.test(it.reps) ? 'tempo' : 'repetições'}</small></div>
        <div><b>${n}/${it.sets}</b><small>séries</small></div>
        <div><b>${it.rest || 0}s</b><small>descanso</small></div>
      </div>
      <div class="big-sets">${Array.from({ length: it.sets }, (_, s) => `<i class="${s < n ? 'on' : s === n && !complete ? 'cur' : ''}">${s < n ? '✓' : s + 1}</i>`).join('')}</div>
      ${main}
      ${m.id !== 'normal' ? `<p class="center"><span class="tag" data-act="method-info" data-id="${m.id}">${esc(m.name)} ⓘ</span></p>` : ''}
      ${orig ? `<p class="swapped center">🔄 Hoje no lugar de <b>${esc(orig.name)}</b> · <button class="link" data-act="unswap" data-id="${it.id}">desfazer</button></p>` : ''}
      ${it.notes ? `<p class="notes center">${esc(it.notes)}</p>` : ''}
      <div class="card ex-tools">
        <label class="load">Carga <input data-load="${it.id}" value="${esc(ses.loads[it.id] ?? it.load)}" placeholder="—"></label>
        <button class="btn small" data-act="swap" data-id="${it.id}" data-w="${w.id}">🔄 Trocar</button>
        ${e ? `<a class="btn small" href="#/exercicio/${e.id}">📋 Como faz</a>` : ''}
      </div>
      <div class="ex-actions">
        <button class="pill-btn" data-act="set-undo" data-id="${it.id}" ${n ? '' : 'disabled'}><span>↩</span>Desfazer série</button>
        <button class="pill-btn ${complete ? '' : 'ok'}" data-act="check-all" data-id="${it.id}"><span>${complete ? '✕' : '✓'}</span>${complete ? 'Desmarcar' : 'Concluir'}</button>
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
  if (left <= 0) {
    rest = null; bar?.remove(); beep(); toast('Bora! Próxima série 💪');
    if (/^#\/sessao\//.test(location.hash)) render();
    return;
  }
  const row = rest.itemId && document.getElementById('rr-' + rest.itemId);
  if (row) {
    bar?.remove();
    row.querySelector('.rr-time').textContent = fmtDuration(left * 1000);
    row.querySelector('.rr-fill').style.width = `${100 - (left / rest.total) * 100}%`;
    return;
  }
  const big = document.getElementById('restbig');
  if (big) {
    bar?.remove();
    document.getElementById('restbig-time').textContent = fmtDuration(left * 1000);
    const c = 2 * Math.PI * 52;
    const ring = document.getElementById('restring');
    ring.style.strokeDasharray = c;
    ring.style.strokeDashoffset = c * (1 - left / rest.total);
    return;
  }
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

function sessionProgress() {
  const ses = S().session;
  const w = ses && findWorkout(ses.workoutId);
  if (!w) return { done: 0, total: 0 };
  const total = w.items.reduce((a, i) => a + i.sets, 0);
  const done = w.items.reduce((a, i) => a + Math.min(i.sets, (ses.checks[i.id] || []).filter(Boolean).length), 0);
  return { done, total };
}

// marcou a última série: conclui o treino sozinho
function autoFinishIfDone() {
  const { done, total } = sessionProgress();
  if (!total || done < total) return false;
  render();
  setTimeout(() => finishWorkout(true), 450);
  return true;
}

// ============ ofensiva (sequência de dias treinados) ============
// Conta DIAS com treino concluído (2 treinos no mesmo dia = 1 dia).
// Pode descansar até 2 dias seguidos; no 3º dia sem treinar a ofensiva acaba.
const MAX_REST = 2;
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const keyToDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const daysBetween = (a, b) => Math.round((keyToDate(b) - keyToDate(a)) / 864e5);

function streakInfo() {
  const days = [...new Set(S().history.map(h => dayKey(h.end)))].sort();
  const today = dayKey(Date.now());
  // todas as sequências (para o recorde)
  let best = 0, run = 0;
  days.forEach((d, i) => { run = i && daysBetween(days[i - 1], d) <= MAX_REST + 1 ? run + 1 : 1; best = Math.max(best, run); });
  const last = days[days.length - 1];
  const since = last ? daysBetween(last, today) : Infinity;
  let count = 0; // ainda viva se o último treino foi há no máximo MAX_REST dias de descanso (hoje ainda dá pra treinar)
  if (last && since <= MAX_REST + 1) {
    count = 1;
    for (let i = days.length - 1; i > 0 && daysBetween(days[i - 1], days[i]) <= MAX_REST + 1; i--) count++;
  }
  // a ofensiva só continua se treinar hoje quando já foram MAX_REST dias de descanso
  const atRisk = count > 0 && since === MAX_REST + 1;
  const trainedToday = last === today;
  // semana atual (seg a dom)
  const now = new Date(); const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  const daySet = new Set(days);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const k = dayKey(d);
    return { label: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i], trained: daySet.has(k), today: k === today, future: k > today };
  });
  return { count, best, atRisk, trainedToday, week, totalDays: days.length };
}

const FLAME = (lit = true) => `
  <svg class="flame ${lit ? '' : 'off'}" viewBox="0 0 120 140" aria-hidden="true">
    <defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset=".55" stop-color="#f97316"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
    <ellipse cx="60" cy="128" rx="34" ry="8" fill="rgba(0,0,0,.35)"/>
    <path d="M60 6c6 22 34 34 34 70a34 34 0 0 1-68 0c0-16 8-26 16-34 1 12 6 18 12 20-4-22 2-40 6-56z" fill="url(#fg)"/>
    <path d="M60 64c4 10 16 15 16 30a16 16 0 0 1-32 0c0-10 8-15 16-30z" fill="#fde68a"/>
  </svg>`;

const STREAK_MSG = (n) => n >= 30 ? 'Isso já virou estilo de vida. Monstro! 🏆' : n >= 14 ? 'Duas semanas firme! Ninguém te segura.' : n >= 7 ? 'Uma semana de foco! O shape agradece.' : n >= 3 ? 'Tá pegando ritmo! Continua assim.' : n === 1 ? 'Primeiro dia da ofensiva! Bora manter?' : 'Mais um dia pra conta! Tá pago! 💪';

function streakSheet({ celebrate = false } = {}) {
  const st = streakInfo();
  const name = cloud.myName?.() || '';
  const text = `🔥 ${st.count} ${st.count === 1 ? 'dia' : 'dias'} de ofensiva no ${APP_NAME}! Tá pago! 💪`;
  const sh = sheet(`
    <div class="streak ${celebrate ? 'pop' : ''}">
      ${FLAME(st.count > 0)}
      <div class="streak-n">${st.count}</div>
      <div class="streak-label">${st.count === 1 ? 'dia' : 'dias'} de ofensiva</div>
      <div class="week">${st.week.map(d => `
        <div class="wd ${d.today ? 'today' : ''}"><small>${d.label}</small>
          <i class="${d.trained ? 'on' : d.future ? 'future' : ''}">${d.trained ? '✓' : ''}</i></div>`).join('')}</div>
      <p class="streak-msg">${st.count ? (st.atRisk && !st.trainedToday ? '⚠️ Treine hoje pra não perder a ofensiva!' : STREAK_MSG(st.count)) : 'Conclua um treino pra acender a ofensiva!'}</p>
      <p class="hint">Conta 1 por dia treinado. Pode descansar até ${MAX_REST} dias seguidos sem perder. Recorde: ${st.best} ${st.best === 1 ? 'dia' : 'dias'}.</p>
      <div class="streak-actions">
        <a class="btn share-btn" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener" aria-label="Compartilhar">📤</a>
        <button class="btn primary grow" data-close>${celebrate ? `TÁ PAGO${name ? ', ' + esc(name.split(' ')[0].toUpperCase()) : ''}!` : 'Fechar'}</button>
      </div>
    </div>`);
  if (celebrate) navigator.vibrate?.([60, 40, 60, 40, 160]);
  return sh;
}

// ============ comemoração ao terminar o treino ============
function celebrationSheet({ w, done, total, mins, next, firstToday }) {
  const st = streakInfo();
  const first = (cloud.myName?.() || '').split(' ')[0];
  const sh = sheet(`
    <div class="streak ${firstToday ? 'pop' : ''}">
      ${FLAME(true)}
      <div class="streak-n">${st.count}</div>
      <div class="streak-label">${st.count === 1 ? 'dia' : 'dias'} de ofensiva</div>
      <div class="week">${st.week.map(d => `
        <div class="wd ${d.today ? 'today' : ''}"><small>${d.label}</small>
          <i class="${d.trained ? 'on' : d.future ? 'future' : ''}">${d.trained ? '✓' : ''}</i></div>`).join('')}</div>
      <p class="streak-msg">${firstToday ? STREAK_MSG(st.count) : 'Hoje já tinha contado na ofensiva. Treino extra é bônus! 💪'}</p>
      <div class="card done-sum">
        ${badge(w)}<div class="grow"><b>Treino ${esc(w.letter)} concluído</b><small>${esc(w.name)} · ${done}/${total} séries · ${mins} min</small></div>
      </div>
      ${next && next.id !== w.id ? `<p class="hint">Próximo: ${badge(next)} ${esc(next.name)}</p>` : ''}
      <div class="share-grid">
        <button class="share-tile" data-cel="photo"><span>📸</span>Foto do tá pago</button>
        <button class="share-tile" data-cel="text"><span>📤</span>Compartilhar ofensiva</button>
        <button class="share-tile soon" data-cel="feed"><span>📰</span>Postar no feed<em>em breve</em></button>
      </div>
      <button class="btn primary block cel-ok" data-close>TÁ PAGO${first ? ', ' + esc(first.toUpperCase()) : ''}!</button>
      <input type="file" accept="image/*" hidden id="cel-photo">
    </div>`);
  if (firstToday) navigator.vibrate?.([60, 40, 60, 40, 160]);
  const summary = { letter: w.letter, name: w.name, done, total, mins, streak: st.count };
  const fileInput = sh.querySelector('#cel-photo');
  sh.addEventListener('click', (e) => {
    const a = e.target.closest('[data-cel]')?.dataset.cel;
    if (a === 'photo') fileInput.click();
    if (a === 'text') shareText(`🔥 ${st.count} ${st.count === 1 ? 'dia' : 'dias'} de ofensiva no ${APP_NAME}! Hoje: treino ${w.letter} – ${w.name} (${done} séries, ${mins} min). Tá pago! 💪`);
    if (a === 'feed') toast('O feed do Tá Pago está chegando! 📰');
  });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try { openPhotoCard(await makeShareCard(f, summary)); }
    catch { alert('Não consegui abrir essa foto. Tente outra.'); }
  });
}

function shareText(text) {
  if (navigator.share) navigator.share({ text }).catch(() => {});
  else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// monta a imagem pra compartilhar: foto + ofensiva + treino + marca do app (1080x1350)
async function makeShareCard(file, sum) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const W = 1080, H = 1350, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const sc = Math.max(W / img.width, H / img.height);
  g.drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
  URL.revokeObjectURL(url);
  const grad = g.createLinearGradient(0, H * 0.45, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,.85)');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const top = g.createLinearGradient(0, 0, 0, 220);
  top.addColorStop(0, 'rgba(0,0,0,.55)'); top.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = top; g.fillRect(0, 0, W, 220);
  const font = (w, px) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  // marca
  g.fillStyle = '#22c55e'; g.beginPath(); g.roundRect(56, 56, 84, 84, 22); g.fill();
  g.fillStyle = '#0b0f14'; g.font = font(900, 54); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✓', 98, 100);
  g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = font(800, 52); g.fillText(APP_NAME, 160, 100);
  // ofensiva
  g.textBaseline = 'alphabetic';
  g.font = font(900, 150);
  const fire = '🔥';
  g.fillText(fire, 56, H - 300);
  const fw = g.measureText(fire).width;
  const ng = g.createLinearGradient(0, H - 430, 0, H - 300);
  ng.addColorStop(0, '#fbbf24'); ng.addColorStop(1, '#ef4444');
  g.fillStyle = ng; g.fillText(String(sum.streak), 56 + fw + 16, H - 300);
  g.fillStyle = '#fb923c'; g.font = font(800, 56);
  g.fillText(`${sum.streak === 1 ? 'dia' : 'dias'} de ofensiva`, 60, H - 225);
  // treino do dia
  g.fillStyle = '#fff'; g.font = font(700, 46);
  g.fillText(`Treino ${sum.letter} · ${sum.name}`.slice(0, 40), 60, H - 140);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = font(500, 38);
  g.fillText(`${sum.done} séries · ${sum.mins} min · tá pago! 💪`, 60, H - 82);
  return await new Promise(res => c.toBlob(res, 'image/jpeg', 0.9));
}

function openPhotoCard(blob) {
  const file = new File([blob], 'ta-pago.jpg', { type: 'image/jpeg' });
  const url = URL.createObjectURL(blob);
  const canShareFile = navigator.canShare?.({ files: [file] });
  const sh = sheet(`
    <h2>📸 Seu tá pago</h2>
    <img class="card-preview" src="${url}" alt="Prévia da imagem">
    <div class="stack">
      ${canShareFile ? `<button class="btn primary" data-pc="share">📤 Compartilhar (WhatsApp, Instagram…)</button>` : ''}
      <a class="btn ${canShareFile ? '' : 'primary'}" href="${url}" download="ta-pago.jpg">💾 Salvar na galeria</a>
      <button class="btn soon-btn" data-pc="feed">📰 Postar no feed do ${APP_NAME} <em>em breve</em></button>
      <button class="btn" data-close>Fechar</button>
    </div>`);
  sh.addEventListener('click', (e) => {
    const a = e.target.closest('[data-pc]')?.dataset.pc;
    if (a === 'share') navigator.share({ files: [file], text: `Tá pago! 🔥 #${APP_NAME.replace(/\s/g, '')}` }).catch(() => {});
    if (a === 'feed') toast('O feed do Tá Pago está chegando! 📰');
  });
}

function finishWorkout(auto = false) {
  const ses = S().session;
  if (!ses) return;
  const w = findWorkout(ses.workoutId);
  const { done, total } = sessionProgress();
  if (!auto && done < total && !confirm(`Você fez ${done} de ${total} séries. Finalizar mesmo assim?`)) return;
  const firstToday = !streakInfo().trainedToday;
  update(st => {
    const wk = st.workouts.find(x => x.id === w.id);
    wk.items.forEach(it => { if (ses.loads[it.id] !== undefined) it.load = ses.loads[it.id]; });
    st.history.unshift({ id: uid(), workoutId: w.id, name: w.name, letter: w.letter, color: w.color, start: ses.start, end: Date.now(), doneSets: done, totalSets: total });
    st.session = null;
  });
  rest = null; restReady = null; stopSessionUi(); renderRest();
  go('#/');
  const next = nextWorkout();
  const mins = Math.max(1, Math.round((Date.now() - ses.start) / 60000));
  celebrationSheet({ w, done, total, mins, next, firstToday });
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
      <button class="card streak-card" data-act="streak">
        ${FLAME(streakInfo().count > 0)}
        <div><b>${streakInfo().count}</b><small>${streakInfo().count === 1 ? 'dia' : 'dias'} de ofensiva · recorde ${streakInfo().best}</small></div>
      </button>
      <div class="stats">
        <div class="card"><b>${streakInfo().totalDays}</b><small>dias treinados</small></div>
        <div class="card"><b>${new Set(h.filter(x => x.end > weekAgo).map(x => dayKey(x.end))).size}</b><small>dias nos últimos 7</small></div>
      </div>
      <p class="hint center">${h.length} treinos concluídos no total</p>
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

const PRIVACY = `<p class="hint">🔒 Seus dados ficam guardados no Supabase (servidor em São Paulo) e são protegidos por regras de acesso: só você vê os seus treinos. Você pode pedir a exclusão da sua conta e de todos os seus dados quando quiser.</p>`;

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
          <p class="hint">${cloud.myUsername() ? '@' + esc(cloud.myUsername()) : esc(u.email)}</p>
          <button class="btn small" data-act="change-pw">🔑 Trocar senha</button>
        </div>
        <div class="card">
          <h3>📧 E-mail de recuperação</h3>
          <p class="hint">Se esquecer a senha, mandamos um link pra esse e-mail. Ninguém mais vê.</p>
          <div class="row" style="margin-top:0"><input id="remail" type="email" placeholder="voce@email.com" class="grow" autocomplete="email"><button class="btn" data-act="save-remail">Salvar</button></div>
        </div>
        <div class="card">
          <h3>☁️ Sincronização</h3>
          <p id="cloud-status" class="hint">${statusText()}</p>
          <button class="btn" data-act="sync-now">Sincronizar agora</button>
        </div>
        <a class="card row between" href="#/admin" id="admin-link" hidden style="margin-top:0"><span>🛠️ Painel de testes (criar logins)</span><span>›</span></a>
        ${PRIVACY}
        <div class="row between">
          <button class="btn" data-act="logout">Sair</button>
          <button class="btn danger" data-act="delete-account">Excluir minha conta</button>
        </div>`,
    });
  }
  return viewWelcome();
}

// campo de senha com botão de mostrar/esconder
const pwField = (name, attrs = '') =>
  `<div class="pw"><input name="${name}" type="password" ${attrs}><button type="button" class="eye" data-eye aria-label="Mostrar senha">👁️</button></div>`;

function authCard() {
  const signup = accountMode === 'signup';
  return `
      <div class="card">
        <div class="chips tabs" style="margin-top:0">
          <button class="chip ${signup ? '' : 'on'}" data-act="acc-mode" data-mode="login">Entrar</button>
          <button class="chip ${signup ? 'on' : ''}" data-act="acc-mode" data-mode="signup">Criar conta</button>
        </div>
        ${signup ? `
        <form id="sform" autocomplete="off">
          <label>Seu nome</label><input name="name" required maxlength="60" autocomplete="name" placeholder="Ex.: Rian Souza">
          <label>Seu @</label>
          <div class="at-input"><span>@</span><input name="username" required maxlength="24" autocapitalize="none" spellcheck="false" autocomplete="username" placeholder="rian.souza"></div>
          <p class="hint" id="ucheck">Letras minúsculas, números, ponto ou _ (3 a 24).</p>
          <label>Senha</label>${pwField('p1', 'required minlength="6" autocomplete="new-password" placeholder="mínimo 6 caracteres"')}
          <label>Repita a senha</label>${pwField('p2', 'required minlength="6" autocomplete="new-password"')}
          <label>E-mail de recuperação <small>(opcional)</small></label>
          <input name="remail" type="email" autocomplete="email" placeholder="voce@email.com">
          <p class="hint">Só usamos para mandar o link se você esquecer a senha. Você entra sempre com o @.</p>
          <p class="hint" id="serr"></p>
          <button class="btn primary block">Criar conta</button>
        </form>` : `
        <form id="aform">
          <label>Usuário</label><input name="login" required autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="@seu.usuario">
          <label>Senha</label>${pwField('password', 'required autocomplete="current-password"')}
          <p class="hint" id="aerr"></p>
          <button class="btn primary block">Entrar</button>
        </form>
        <button class="link center-link" data-act="forgot">Esqueci minha senha</button>`}
      </div>
      ${PRIVACY}`;
}

function mountSignup() {
  const form = document.getElementById('sform');
  if (!form) return;
  const msg = document.getElementById('ucheck');
  let touched = false, timer, lastOk = null;
  const check = () => {
    clearTimeout(timer);
    const u = form.username.value;
    lastOk = null;
    if (!/^[a-z0-9_.]{3,24}$/.test(u)) {
      msg.className = 'hint'; msg.textContent = u ? 'Use 3 a 24 caracteres: letras minúsculas, números, ponto ou _.' : 'Letras minúsculas, números, ponto ou _ (3 a 24).';
      return;
    }
    msg.className = 'hint'; msg.textContent = 'Verificando…';
    timer = setTimeout(async () => {
      try {
        const ok = await cloud.usernameAvailable(u);
        if (form.username.value !== u) return;
        lastOk = ok;
        msg.className = 'hint ' + (ok ? 'ok' : 'bad');
        msg.textContent = ok ? `✓ @${u} está livre` : `✗ @${u} já existe, tente outro`;
      } catch { msg.textContent = 'Sem conexão para verificar.'; }
    }, 350);
  };
  form.username.addEventListener('input', () => {
    touched = true;
    form.username.value = form.username.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    check();
  });
  form.name.addEventListener('input', () => { if (!touched) { form.username.value = suggestUsername(form.name.value); check(); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('serr');
    err.textContent = '';
    if (form.p1.value !== form.p2.value) { err.textContent = 'As senhas não são iguais.'; return; }
    if (lastOk === false) { err.textContent = 'Esse @ já existe, escolha outro.'; return; }
    const btn = form.querySelector('button.primary'); btn.disabled = true;
    try {
      await cloud.signUpUsername(form.username.value, form.name.value.trim(), form.p1.value, TERMS_VERSION);
      if (form.remail.value.trim()) cloud.setRecoveryEmail(form.remail.value.trim()).catch(() => toast('Não deu pra salvar o e-mail; adicione na sua conta.'));
      toast(`Conta criada! Bem-vindo, @${form.username.value} 💪`);
    } catch (ex) { err.textContent = authError(ex); }
    finally { btn.disabled = false; }
  });
}

// Conta antiga (entrou com e-mail): escolher o @
function viewClaimUsername() {
  const sug = suggestUsername(cloud.myName());
  return `
    <main class="welcome">
      <div class="hero">
        <div class="big">@</div>
        <h1>Escolha seu @</h1>
        <p>Novidade: agora todo mundo entra no app com o <b>@</b>, sem precisar de e-mail. Escolha o seu, ele é único e vai aparecer pra galera.</p>
      </div>
      <div class="card">
        <form id="clform" autocomplete="off">
          <label>Seu @</label>
          <div class="at-input"><span>@</span><input name="username" required maxlength="24" autocapitalize="none" spellcheck="false" value="${esc(sug)}"></div>
          <p class="hint" id="ucheck"></p>
          <p class="hint" id="clerr"></p>
          <button class="btn primary block">Salvar meu @</button>
        </form>
        <p class="hint">Sua senha continua a mesma. Seu e-mail fica guardado na sua conta, mas daqui pra frente você entra com <b>@seu.usuario</b> e a senha.</p>
      </div>
    </main>`;
}

function mountClaimUsername() {
  const form = document.getElementById('clform');
  const msg = document.getElementById('ucheck');
  let timer, lastOk = null;
  const check = () => {
    clearTimeout(timer);
    const u = form.username.value;
    lastOk = null;
    if (!/^[a-z0-9_.]{3,24}$/.test(u)) { msg.className = 'hint'; msg.textContent = 'Use 3 a 24 caracteres: letras minúsculas, números, ponto ou _.'; return; }
    msg.className = 'hint'; msg.textContent = 'Verificando…';
    timer = setTimeout(async () => {
      try {
        const ok = await cloud.usernameAvailable(u);
        if (form.username.value !== u) return;
        lastOk = ok;
        msg.className = 'hint ' + (ok ? 'ok' : 'bad');
        msg.textContent = ok ? `✓ @${u} está livre` : `✗ @${u} já existe, tente outro`;
      } catch { msg.textContent = 'Sem conexão para verificar.'; }
    }, 350);
  };
  form.username.addEventListener('input', () => {
    form.username.value = form.username.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    check();
  });
  check();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('clerr');
    if (lastOk === false) { err.textContent = 'Esse @ já existe, escolha outro.'; return; }
    const btn = form.querySelector('button.primary'); btn.disabled = true; err.textContent = '';
    try {
      await cloud.claimUsername(form.username.value);
      sheet(`<div class="done-sheet"><div class="big">✅</div><h2>Pronto, @${esc(form.username.value)}!</h2>
        <p>Da próxima vez, entre com <b>@${esc(form.username.value)}</b> e a sua senha de sempre.</p>
        <div class="stack"><button class="btn primary" data-close>Show!</button></div></div>`);
      render();
    } catch (ex) { err.textContent = authError(ex); }
    finally { btn.disabled = false; }
  });
}

// Primeiro acesso: troca obrigatória da senha padrão
function viewForceChange() {
  return `
    <main class="welcome">
      <div class="hero">
        <div class="big">🔑</div>
        <h1>Crie sua senha</h1>
        <p>Bem-vindo${cloud.myName() ? ', ' + esc(cloud.myName()) : ''}! Você entrou com a senha padrão. Crie uma senha só sua para continuar.</p>
      </div>
      <div class="card">
        <form id="fcform">
          <label>Nova senha</label>${pwField('p1', 'required minlength="6" autocomplete="new-password" placeholder="mínimo 6 caracteres"')}
          <label>Repita a nova senha</label>${pwField('p2', 'required minlength="6" autocomplete="new-password"')}
          <p class="hint" id="fcerr"></p>
          <button class="btn primary block">Salvar e entrar</button>
        </form>
        <button class="link" data-act="logout-now">Sair</button>
      </div>
    </main>`;
}

function mountForceChange() {
  const form = document.getElementById('fcform');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('fcerr');
    if (form.p1.value !== form.p2.value) { err.textContent = 'As senhas não são iguais.'; return; }
    if (form.p1.value.toUpperCase() === cloud.DEFAULT_PASSWORD) { err.textContent = 'Escolha uma senha diferente da padrão.'; return; }
    const btn = form.querySelector('button.primary'); btn.disabled = true; err.textContent = '';
    try {
      await cloud.changeMyPassword(form.p1.value);
      toast('Senha criada ✓ Bora treinar!');
      go('#/'); render();
    } catch (ex) { err.textContent = authError(ex); }
    finally { btn.disabled = false; }
  });
}

// ============ apresentação (primeira vez) ============
const ONB_KEY = 'app-treino:onboarding';      // versão dos termos aceita neste aparelho
const localTermsOk = () => { try { return localStorage.getItem(ONB_KEY) === TERMS_VERSION; } catch { return false; } };
const setLocalTermsOk = () => { try { localStorage.setItem(ONB_KEY, TERMS_VERSION); } catch {} };

const SLIDES = [
  { art: `<img class="onb-logo" src="icons/icon.svg" alt="">`, title: `Bem-vindo ao ${APP_NAME}`,
    text: 'Seu treino de musculação no bolso: A, B, C… do seu jeito, do primeiro dia de academia ao avançado.' },
  { art: `<div class="onb-badges"><span class="badge lg" style="--c:#22c55e">A</span><span class="badge lg" style="--c:#3b82f6">B</span><span class="badge lg" style="--c:#f97316">C</span></div>`,
    title: 'Monte do seu jeito', text: 'Comece com um treino pronto (iniciante, intermediário ou avançado) ou monte do zero. Séries, carga, descanso e métodos como drop-set e pirâmide.' },
  { art: `<div class="demo onb-demo"><img src="img/ex/leg-press-0.jpg" alt=""><img class="b" src="img/ex/leg-press-1.jpg" alt=""></div>`,
    title: 'Veja como faz', text: 'Cada exercício mostra o movimento e a máquina. Não tem o aparelho na sua academia? Troque por uma variação na hora.' },
  { art: `<div class="onb-sets"><span class="set on">✓</span><span class="set on">✓</span><span class="set">3</span><div class="onb-timer">⏱ 01:00</div></div>`,
    title: 'Marque e acompanhe', text: 'Marque as séries, o descanso conta sozinho e avisa. Terminou? O app conclui o treino e já mostra qual é o próximo.' },
  { art: `<div class="onb-share">📤 💬 💪</div>`,
    title: 'Treine com a galera', text: 'Mande seus treinos para os amigos pelo WhatsApp com um toque. Em breve: o feed pra postar o seu tá pago do dia, com foto.' },
];

function viewOnboarding() {
  return `
    <div class="onb">
      <button class="onb-skip" data-onb="skip">Pular</button>
      <div class="onb-track" id="onb-track">
        ${SLIDES.map(sl => `
          <section class="onb-slide">
            <div class="onb-art">${sl.art}</div>
            <h1>${sl.title}</h1>
            <p>${sl.text}</p>
          </section>`).join('')}
        <section class="onb-slide terms-slide">
          <div class="onb-art"><div class="onb-share">📜</div></div>
          <h1>Antes de começar</h1>
          <p>Leia e aceite os termos de uso e a política de privacidade. Resumo: seus dados servem só para o app funcionar, ficam protegidos e você pode pedir para apagar quando quiser.</p>
          <button class="btn block" data-onb="read">📖 Ler os termos completos</button>
          <label class="check"><input type="checkbox" id="onb-accept"> Tenho 16 anos ou mais, li e aceito os termos de uso e a política de privacidade</label>
        </section>
      </div>
      <div class="onb-foot">
        <div class="dots">${[...SLIDES, 0].map((_, i) => `<span class="${i ? '' : 'on'}"></span>`).join('')}</div>
        <button class="btn primary block" id="onb-next">Próximo</button>
      </div>
    </div>`;
}

function mountOnboarding(onDone) {
  const track = document.getElementById('onb-track');
  const next = document.getElementById('onb-next');
  const dots = [...document.querySelectorAll('.dots span')];
  const accept = document.getElementById('onb-accept');
  const total = SLIDES.length + 1;
  const idx = () => Math.round(track.scrollLeft / track.clientWidth);
  const goTo = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  const update = () => {
    const i = idx();
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    const last = i === total - 1;
    next.textContent = last ? 'Aceitar e continuar' : 'Próximo';
    next.disabled = last && !accept.checked;
    document.querySelector('.onb-skip').style.visibility = last ? 'hidden' : 'visible';
  };
  track.addEventListener('scroll', () => requestAnimationFrame(update));
  accept.addEventListener('change', update);
  next.addEventListener('click', () => {
    if (idx() < total - 1) return goTo(idx() + 1);
    if (!accept.checked) return;
    setLocalTermsOk();
    onDone();
  });
  document.querySelector('[data-onb=skip]').addEventListener('click', () => goTo(total - 1));
  document.querySelector('[data-onb=read]').addEventListener('click', openTerms);
  update();
}

function openTerms() {
  sheet(`<div class="terms"><h2>Termos de uso e privacidade</h2>${TERMS_HTML}</div>
    <div class="row end"><button class="btn primary" data-close>Fechar</button></div>`);
}

// Usuário já logado que ainda não aceitou esta versão dos termos
function viewTermsGate() {
  return `
    <main class="welcome">
      <div class="hero"><div class="big">📜</div><h1>Termos de uso</h1>
        <p>Para continuar usando o app, leia e aceite os termos de uso e a política de privacidade.</p></div>
      <div class="card terms">${TERMS_HTML}</div>
      <label class="check"><input type="checkbox" id="tg-accept"> Tenho 16 anos ou mais, li e aceito os termos</label>
      <p class="hint" id="tg-err"></p>
      <button class="btn primary block" id="tg-ok" disabled>Aceitar e continuar</button>
      <button class="link" data-act="logout-now">Sair</button>
    </main>`;
}

function mountTermsGate() {
  const cb = document.getElementById('tg-accept'), ok = document.getElementById('tg-ok');
  cb.addEventListener('change', () => { ok.disabled = !cb.checked; });
  ok.addEventListener('click', async () => {
    ok.disabled = true;
    try { await cloud.acceptTerms(TERMS_VERSION); setLocalTermsOk(); render(); }
    catch (ex) { document.getElementById('tg-err').textContent = 'Não foi possível salvar o aceite: ' + authError(ex); ok.disabled = false; }
  });
}

// Tela de login
function viewWelcome() {
  const pending = pendingImport();
  return `
    <main class="welcome login">
      <div class="hero">
        <img class="onb-logo small" src="icons/icon.svg" alt="">
        <h1>${APP_NAME}</h1>
        <p>${accountMode === 'signup' ? 'Crie sua conta em segundos' : 'Entre para continuar'}</p>
        ${pending ? `<p class="banner-inline">📩 Você recebeu um treino! Entre para adicionar.</p>` : ''}
      </div>
      ${authCard()}
      <button class="link center-link" data-act="show-terms">Termos de uso e privacidade</button>
    </main>`;
}

async function mountAccount() {
  const u = cloud.currentUser();
  if (u) {
    cloud.amIAdmin().then(v => { const l = document.getElementById('admin-link'); if (l && v) l.hidden = false; });
    cloud.getRecoveryEmail().then(v => { const el = document.getElementById('remail'); if (el && !el.value) el.value = v; }).catch(() => {});
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
    const btn = form.querySelector('button.primary');
    btn.disabled = true; err.textContent = '';
    try {
      await cloud.signIn(cloud.loginToEmail(form.login.value), form.password.value);
    } catch (ex) {
      err.textContent = authError(ex);
      const v = form.login.value.trim();
      if (v.includes('@') && !v.startsWith('@') && /invalid login/i.test(ex?.message || ''))
        err.textContent += ' Se você já escolheu seu @, agora entre com ele (ex.: @seu.usuario).';
    } finally { btn.disabled = false; }
  });
}

function authError(ex) {
  const m = (ex?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Usuário ou senha incorretos.';
  if (m.includes('not confirmed')) return 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).';
  if (m.includes('e-mail inválido')) return 'E-mail inválido.';
  if (m.includes('já tem um @') || m.includes('já existe') || m.includes('muitas') || m.includes('muitos') || m.includes('usuário inválido') || m.includes('senha') || m.includes('informe') || m.includes('aceite')) return ex.message;
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
      <button class="card row between block-btn" data-act="show-terms"><span>📜 Termos de uso e privacidade</span><span>›</span></button>
      <div class="card">
        <h3>📲 Instalar no celular</h3>
        <p class="hint"><b>Android (Chrome):</b> menu ⋮ → “Instalar app” / “Adicionar à tela inicial”.<br>
        <b>iPhone (Safari):</b> botão compartilhar → “Adicionar à Tela de Início”.</p>
      </div>
      <div class="card">
        <h3>🎨 Aparência</h3>
        <p class="hint">No automático, o app fica claro ou escuro igual ao seu celular.</p>
        <div class="theme-pick">
          ${[['auto', '📱', 'Automático'], ['light', '☀️', 'Claro'], ['dark', '🌙', 'Escuro']].map(([v, ic, l]) =>
            `<button class="${getTheme() === v ? 'on' : ''}" data-act="theme" data-v="${v}"><span>${ic}</span>${l}</button>`).join('')}
        </div>
      </div>
      <div class="card">
        <h3>ℹ️ Versão</h3>
        <p class="hint">${APP_NAME} · versão ${APP_VERSION}</p>
        <button class="btn small" data-act="force-update">🔄 Procurar atualização</button>
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
    navigator.vibrate?.(30);
    if (nowOn && autoFinishIfDone()) return;
    if (nowOn && item?.rest > 0) rest = { end: Date.now() + item.rest * 1000, total: item.rest };
    render();
  },
  'check-all': (el) => {
    const id = el.dataset.id;
    let nowOn = false;
    update(st => {
      const item = st.workouts.find(w => w.id === st.session.workoutId).items.find(i => i.id === id);
      const arr = st.session.checks[id] || [];
      const all = arr.filter(Boolean).length >= item.sets;
      nowOn = !all;
      st.session.checks[id] = Array.from({ length: item.sets }, () => nowOn);
    });
    navigator.vibrate?.(30);
    if (nowOn) update(st => { st.session.active = null; });
    if (nowOn && autoFinishIfDone()) return;
    render();
  },
  'ex-start': (el) => { if (restReady?.itemId !== el.dataset.id) restReady = null; update(st => { st.session.active = el.dataset.id; }); render(); window.scrollTo(0, 0); },
  'ex-back': () => { update(st => { if (st.session) st.session.active = null; }); render(); },
  'set-done': (el) => {
    const id = el.dataset.id;
    let item, finishedEx = false;
    update(st => {
      item = st.workouts.find(w => w.id === st.session.workoutId).items.find(i => i.id === id);
      const arr = (st.session.checks[id] || []).filter(Boolean);
      arr.push(true);
      st.session.checks[id] = arr;
      if (arr.length >= item.sets) { finishedEx = true; st.session.active = null; }
    });
    navigator.vibrate?.(40);
    if (autoFinishIfDone()) return;
    // terminou a série: o descanso já começa contando, sem precisar tocar no play
    restReady = null;
    rest = item.rest > 0 && !finishedEx ? { end: Date.now() + item.rest * 1000, total: item.rest, itemId: id } : null;
    if (finishedEx) toast('✅ Exercício concluído!');
    render();
  },
  'set-undo': (el) => {
    update(st => { const arr = (st.session.checks[el.dataset.id] || []).filter(Boolean); arr.pop(); st.session.checks[el.dataset.id] = arr; });
    restReady = null; rest = null; render();
  },
  'rest-row': (el) => {
    const id = el.dataset.id;
    if (rest?.itemId === id) { rest = null; render(); return; }
    const w = findWorkout(S().session.workoutId);
    const it = w.items.find(i => i.id === id);
    rest = { end: Date.now() + it.rest * 1000, total: it.rest, itemId: id };
    restReady = null;
    navigator.vibrate?.(20);
    render();
  },
  'rest-play': () => { if (restReady) { rest = { end: Date.now() + restReady.secs * 1000, total: restReady.secs, itemId: restReady.itemId }; restReady = null; render(); renderRest(); } },
  'rest-dismiss': () => { restReady = null; render(); },
  'rest-add': () => { if (rest) { rest.end += 15000; rest.total += 15; renderRest(); } },
  'rest-skip': () => { rest = null; renderRest(); if (/^#\/sessao\//.test(location.hash)) render(); },
  'finish': () => finishWorkout(),
  'cancel-session': () => {
    if (!confirm('Descartar o treino em andamento? Nada será salvo no histórico.')) return;
    const wid = S().session.workoutId;
    update(st => { st.session = null; });
    rest = null; stopSessionUi(); renderRest();
    go(`#/treino/${wid}`);
  },
  'share': (el) => shareWorkouts([el.dataset.id]),
  'workout-menu': (el) => workoutMenu(el.dataset.id),
  'streak': () => streakSheet(),
  'main-menu': () => openMainMenu(),
  'theme': (el) => { try { localStorage.setItem(THEME_KEY, el.dataset.v); } catch {} applyTheme(el.dataset.v); render(); },
  'new-menu': () => {
    const sh = sheet(`
      <h2>Novo treino</h2>
      ${menuItem('🎯', 'Treino personalizado pro meu objetivo', 'quiz')}
      ${menuItem('📋', 'Treinos prontos (iniciante, intermediário, avançado, estilos)', 'programs')}
      ${menuItem('✏️', 'Montar do zero', 'blank')}
      ${menuItem('📤', 'Mandar meus treinos pra um amigo', 'shareall')}`);
    sh.addEventListener('click', (e) => {
      const a = e.target.closest('[data-menu]')?.dataset.menu;
      if (!a) return;
      sh.close();
      if (a === 'quiz') startQuiz();
      if (a === 'programs') go('#/programas');
      if (a === 'blank') setTimeout(() => openWorkoutForm(), 260);
      if (a === 'shareall') setTimeout(() => shareWorkouts(S().workouts.map(w => w.id)), 260);
    });
  },
  'share-all': () => shareWorkouts(S().workouts.map(w => w.id)),
  'quiz-start': () => startQuiz(),
  'quiz-redo': () => startQuiz(),
  'quiz-back': () => { if (quiz.step === 0) { go('#/'); return; } quiz.step--; render(); },
  'quiz-pick': (el) => {
    const q = QUIZ[quiz.step];
    const id = q.key === 'days' ? Number(el.dataset.id) : el.dataset.id;
    if (q.multi) {
      const arr = quiz.answers[q.key] ||= [];
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1); else arr.push(id);
      render();
    } else {
      quiz.answers[q.key] = id;
      render();
      setTimeout(quizNext, 180);
    }
  },
  'quiz-none': () => { quiz.answers[QUIZ[quiz.step].key] = []; render(); },
  'quiz-next': () => quizNext(),
  'use-plan': () => {
    const p = { name: 'seu treino personalizado', workouts: lastPlan.workouts };
    if (!S().workouts.length) { addWorkouts(p.workouts, false); toast('Treino personalizado pronto ✓ Bora!'); go('#/'); return; }
    const sh = sheet(`
      <h2>Você já tem treinos</h2>
      <p>O que fazer com os seus treinos atuais?</p>
      <div class="stack">
        <button class="btn primary" data-choice="replace">Substituir pelo treino personalizado</button>
        <button class="btn" data-choice="add">Manter os meus e adicionar este</button>
        <button class="btn" data-close>Cancelar</button>
      </div>`);
    sh.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-choice]')?.dataset.choice;
      if (!c) return;
      if (c === 'replace' && !confirm('Seus treinos atuais serão apagados (o histórico continua). Confirmar?')) return;
      sh.close();
      addWorkouts(p.workouts, c === 'replace');
      toast('Treino personalizado pronto ✓ Bora!');
      go('#/');
    });
  },
  'use-program': (el) => {
    const p = ALL_PROGRAMS.find(x => x.id === el.dataset.id);
    if (!S().workouts.length) return applyProgram(p, false);
    const sh = sheet(`
      <h2>Você já tem treinos</h2>
      <p>O que fazer com os seus treinos atuais?</p>
      <div class="stack">
        <button class="btn primary" data-choice="replace">Substituir pelos do ${esc(p.name)}</button>
        <button class="btn" data-choice="add">Manter os meus e adicionar estes</button>
        <button class="btn" data-close>Cancelar</button>
      </div>`);
    sh.addEventListener('click', (ev) => {
      const c = ev.target.closest('[data-choice]')?.dataset.choice;
      if (!c) return;
      if (c === 'replace' && !confirm('Seus treinos atuais serão apagados (o histórico continua). Confirmar?')) return;
      sh.close();
      applyProgram(p, c === 'replace');
    });
  },
  'show-terms': () => openTerms(),
  'force-update': async () => {
    toast('Procurando atualização…');
    try {
      const regs = await navigator.serviceWorker?.getRegistrations() || [];
      await Promise.all(regs.map(r => r.unregister()));
      const keys = await caches?.keys() || [];
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
    location.reload();
  },
  'logout-now': async () => { await cloud.signOut(); },
  'change-pw': () => {
    const sh = sheet(`
      <form id="cpform"><h2>🔑 Trocar senha</h2>
        <label>Nova senha</label>${pwField('p1', 'minlength="6" required autocomplete="new-password"')}
        <label>Repita a nova senha</label>${pwField('p2', 'minlength="6" required autocomplete="new-password"')}
        <p class="hint" id="cperr"></p>
        <div class="row end"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary">Salvar</button></div></form>`);
    const f = sh.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = f.querySelector('#cperr');
      if (f.p1.value !== f.p2.value) { err.textContent = 'As senhas não são iguais.'; return; }
      try { await cloud.changeMyPassword(f.p1.value); sh.close(); toast('Senha alterada ✓'); }
      catch (ex) { err.textContent = authError(ex); }
    });
  },
  'acc-mode': (el) => { accountMode = el.dataset.mode; render(); },
  'forgot': () => {
    const typed = document.querySelector('#aform [name=login]')?.value.trim().replace(/^@/, '').toLowerCase() || '';
    const sh = sheet(`
      <form id="fgform"><h2>🔑 Esqueci minha senha</h2>
        <p class="hint">Digite seu @. Se você cadastrou um e-mail de recuperação, mandamos um link pra criar uma nova senha.</p>
        <div class="at-input"><span>@</span><input name="u" required autocapitalize="none" spellcheck="false" value="${esc(typed.includes('@') ? '' : typed)}"></div>
        <p class="hint" id="fgmsg"></p>
        <div class="row end"><button type="button" class="btn" data-close>Fechar</button><button class="btn primary">Enviar link</button></div>
      </form>`);
    const f = sh.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = f.querySelector('#fgmsg');
      const btn = f.querySelector('button.primary'); btn.disabled = true;
      try {
        const r = await cloud.requestRecovery(f.u.value.trim().replace(/^@/, '').toLowerCase());
        msg.className = 'hint';
        msg.innerHTML = r === 'sent'
          ? '📧 Pronto! Se esse @ tem e-mail de recuperação, o link chegou lá. Olhe também a caixa de <b>spam</b>. O link vale por 1 hora.<br>Não cadastrou e-mail? Peça pro administrador resetar sua senha.'
          : r === 'limit' ? 'Muitos pedidos agora. Tente de novo daqui a uma hora.'
          : 'A recuperação por e-mail ainda não está ligada. Peça pro administrador resetar sua senha.';
      } catch (ex) { msg.textContent = 'Erro: ' + authError(ex); }
      finally { btn.disabled = false; }
    });
  },
  'save-remail': async () => {
    const v = document.getElementById('remail').value.trim();
    try { await cloud.setRecoveryEmail(v); toast(v ? 'E-mail de recuperação salvo ✓' : 'E-mail removido'); }
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
  const eye = e.target.closest('[data-eye]');
  if (eye) {
    const inp = eye.parentElement.querySelector('input');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    eye.textContent = show ? '🙈' : '👁️';
    eye.setAttribute('aria-label', show ? 'Esconder senha' : 'Mostrar senha');
    return;
  }
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
let termsSending = false;
function render() {
  // links de confirmação/recuperação do Supabase chegam como #access_token=…; mostra a tela inicial
  const hash = /access_token|error_description/.test(location.hash) ? '#/' : (location.hash || '#/');
  const p = hash.slice(2).split('/');
  const routeKey = p.slice(0, 2).join('/') + (p[3] || '');
  if (routeKey !== lastRoute) { filters.q = ''; filters.groups = null; lastRoute = routeKey; }

  let html, mount;
  // links de treino compartilhado: guarda para importar depois do login
  if (p[0] === 'importar' && p[1]) {
    try { localStorage.setItem('app-treino:import', p[1]); } catch {}
  }
  if (cloud.available() && !cloud.isReady()) {
    app.innerHTML = `<main class="welcome"><div class="hero"><img src="icons/icon.svg" alt="" width="72" height="72"><p>Carregando…</p></div></main>`;
    return;
  }
  // apresentação: aparece uma vez em cada aparelho, para todo mundo (logado ou não)
  if (cloud.available() && !localTermsOk()) {
    app.innerHTML = viewOnboarding();
    app.dataset.hash = '';
    mountOnboarding(() => render());
    return;
  }
  if (cloud.available() && !cloud.currentUser()) {
    app.innerHTML = viewWelcome();
    app.dataset.hash = '';
    mountAccount();
    mountSignup();
    document.getElementById('rest')?.remove();
    return;
  }
  if (cloud.available() && cloud.mustChangePassword()) {
    app.innerHTML = viewForceChange();
    app.dataset.hash = '';
    mountForceChange();
    return;
  }
  if (cloud.available() && cloud.needsUsername()) {
    app.innerHTML = viewClaimUsername();
    app.dataset.hash = '';
    mountClaimUsername();
    return;
  }
  // termos: se aceitou na apresentação antes do login, registra na conta; senão pede o aceite
  const tv = cloud.available() ? cloud.acceptedTermsVersion() : TERMS_VERSION;
  if (tv !== undefined && tv !== TERMS_VERSION) {
    if (localTermsOk() && !termsSending) {
      termsSending = true;
      cloud.acceptTerms(TERMS_VERSION).catch(() => {}).finally(() => { termsSending = false; render(); });
      app.innerHTML = `<main class="welcome"><div class="hero"><p>Carregando…</p></div></main>`;
      return;
    }
    if (!termsSending) {
      app.innerHTML = viewTermsGate();
      app.dataset.hash = '';
      mountTermsGate();
      return;
    }
  }
  if (!p[0] && pendingImport()) return go('#/importar/' + pendingImport());
  if (!p[0]) html = viewHome();
  else if (p[0] === 'importar') { html = viewImport(); mount = () => mountImport(p[1]); }
  else if (p[0] === 'treino' && p[2] === 'add') html = viewAdd(p[1]);
  else if (p[0] === 'treino' && p[2] === 'item') { html = viewItem(p[1], p[3]); mount = () => mountItem(p[1], p[3]); }
  else if (p[0] === 'treino') html = viewWorkout(p[1]);
  else if (p[0] === 'exercicios') html = viewLibrary();
  else if (p[0] === 'programas') html = viewPrograms();
  else if (p[0] === 'objetivo' && p[1] === 'plano') html = viewPlan();
  else if (p[0] === 'objetivo') html = viewQuiz();
  else if (p[0] === 'programa') html = viewProgram(p[1]);
  else if (p[0] === 'exercicio') html = viewExercise(p[1]);
  else if (p[0] === 'metodos') html = viewMethods();
  else if (p[0] === 'historico') html = viewHistory();
  else if (p[0] === 'config') { html = viewConfig(); mount = mountConfig; }
  else if (p[0] === 'conta') { html = viewAccount(); mount = mountAccount; }
  else if (p[0] === 'admin') { html = viewAdmin(); mount = mountAdmin; }
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
  if (['SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION', 'PROFILE'].includes(event)) {
    if (event === 'SIGNED_IN' && location.hash === '#/conta') return go('#/');
    if (event === 'SIGNED_OUT') { if (location.hash !== '#/') return go('#/'); }
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

// modo offline + atualização automática: quando sai versão nova, o app recarrega sozinho
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || S().session) return; // não recarrega no meio do treino
    reloaded = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    setInterval(check, 30 * 60 * 1000);
  }).catch(() => {});
}
