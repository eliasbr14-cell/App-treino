// Persistência: tudo fica salvo no localStorage do aparelho.

const KEY = 'app-treino:v1';

const empty = () => ({
  workouts: [],        // { id, letter, name, color, groups[], items[] }
  customExercises: [], // { id, name, group, equipment, tips, custom: true }
  customMethods: [],   // { id, name, desc, custom: true }
  history: [],         // { id, workoutId, name, letter, color, start, end, doneSets, totalSets }
  session: null,       // { workoutId, start, checks: { itemId: [bool] }, loads: { itemId: string }, swaps: { itemId: exerciseId } }
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
