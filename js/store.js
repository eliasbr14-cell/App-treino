// Persistência: estado geral no localStorage, vídeos gravados no IndexedDB.

const KEY = 'app-treino:v1';

const empty = () => ({
  workouts: [],        // { id, letter, name, color, groups[], items[] }
  customExercises: [], // { id, name, group, equipment, tips, custom: true }
  customMethods: [],   // { id, name, desc, custom: true }
  media: {},           // exerciseId -> { type: 'youtube', url } | { type: 'file', name }
  history: [],         // { id, workoutId, name, letter, color, start, end, doneSets, totalSets }
  session: null,       // { workoutId, start, checks: { itemId: [bool] }, loads: { itemId: string } }
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch (e) { console.warn('Falha ao carregar dados', e); }
  return empty();
}

export function getState() { return state; }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { alert('Não foi possível salvar: ' + e.message); }
}

export function update(fn) { fn(state); save(); }

export function replaceState(next) { state = { ...empty(), ...next }; save(); }

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---------- Vídeos locais (IndexedDB) ----------
let dbPromise;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('app-treino-media', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('videos');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('videos', mode);
    const r = fn(t.objectStore('videos'));
    t.oncomplete = () => resolve(r && r.result);
    t.onerror = () => reject(t.error);
  });
}

export const putVideo = (id, blob) => tx('readwrite', s => s.put(blob, id));
export const getVideo = (id) => tx('readonly', s => s.get(id));
export const deleteVideo = (id) => tx('readwrite', s => s.delete(id));
