// Conta e sincronização com o Supabase.
// O app continua funcionando offline: tudo é salvo no aparelho e, quando há
// internet e o usuário está logado, as mudanças sobem e descem do servidor.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { getState, save, onChange, replaceState } from './store.js';

const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// tipo do item no banco -> lista no estado local
const KINDS = { workout: 'workouts', exercise: 'customExercises', method: 'customMethods', history: 'history' };

let user = null;
let ready = false;          // já sabemos se tem alguém logado?
let profileName = '';
let profile = null;          // { name, username, must_change_password }
let profileReady = false;
const MC_KEY = 'app-treino:must-change';
export const status = { state: 'offline', at: null, error: null }; // offline | syncing | ok | error
const statusListeners = new Set();
export const onStatus = (fn) => statusListeners.add(fn);
const setStatus = (state, error = null) => {
  Object.assign(status, { state, error, at: state === 'ok' ? Date.now() : status.at });
  statusListeners.forEach(l => l());
};

export const available = () => !!client;
export const currentUser = () => user;
export const isReady = () => ready && (!user || profileReady);
export const myUsername = () => profile?.username || '';
// versão dos termos aceita (null = ainda não aceitou; undefined = perfil não carregou, ex. offline)
export const acceptedTermsVersion = () => (profile ? profile.terms_version || null : undefined);

export async function acceptTerms(version) {
  const { error } = await client.rpc('accept_terms', { p_version: version });
  if (error) throw error;
  if (profile) profile.terms_version = version;
}
// precisa trocar a senha padrão? (guardado também no aparelho para valer offline)
export const mustChangePassword = () => {
  if (profile) return !!profile.must_change_password;
  try { return localStorage.getItem(MC_KEY) === user?.id; } catch { return false; }
};
export const myName = () => profileName || user?.user_metadata?.name || user?.email?.split('@')[0] || '';

function hash(obj) {
  const str = JSON.stringify(obj);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + str.length.toString(36);
}

function localItems(st) {
  const map = new Map();
  for (const [kind, key] of Object.entries(KINDS)) {
    for (const item of st[key] || []) map.set(`${kind}:${item.id}`, { kind, item, h: hash(item) });
  }
  return map;
}

// ---------- sincronização ----------
let running = null;
let again = false;

export function sync() {
  if (!client || !user) return Promise.resolve();
  if (running) { again = true; return running; }
  running = doSync()
    .then(() => setStatus('ok'))
    .catch((e) => {
      console.warn('sync', e);
      setStatus(navigator.onLine ? 'error' : 'offline', e.message || String(e));
    })
    .finally(() => {
      running = null;
      if (again) { again = false; sync(); }
    });
  return running;
}

async function doSync() {
  setStatus('syncing');
  const st = getState();

  // dados locais de outra conta neste aparelho: já estão na nuvem daquela conta, então limpa
  if (st.sync && st.sync.userId !== user.id) {
    replaceState({});
  }
  const s = getState();
  s.sync ||= { userId: user.id, lastPulled: null, known: {} };
  s.sync.userId = user.id;
  const known = s.sync.known;

  // 1) envia o que mudou ou foi excluído aqui
  const local = localItems(s);
  const rows = [];
  for (const [key, { kind, item, h }] of local) {
    if (known[key] !== h) rows.push({ user_id: user.id, kind, id: String(item.id), data: item, deleted: false, _key: key, _h: h });
  }
  for (const key of Object.keys(known)) {
    if (!local.has(key)) {
      const [kind, ...rest] = key.split(':');
      rows.push({ user_id: user.id, kind, id: rest.join(':'), data: {}, deleted: true, _key: key, _h: null });
    }
  }
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await client.from('user_items')
      .upsert(chunk.map(({ _key, _h, ...r }) => r), { onConflict: 'user_id,kind,id' });
    if (error) throw error;
    chunk.forEach(r => { if (r._h) known[r._key] = r._h; else delete known[r._key]; });
    save();
  }

  // 2) baixa o que mudou em outros aparelhos
  let changed = false;
  for (;;) {
    let q = client.from('user_items').select('kind,id,data,deleted,updated_at')
      .order('updated_at', { ascending: true }).limit(500);
    if (s.sync.lastPulled) q = q.gt('updated_at', s.sync.lastPulled);
    const { data, error } = await q;
    if (error) throw error;
    for (const r of data) {
      const key = `${r.kind}:${r.id}`;
      const list = s[KINDS[r.kind]];
      if (!list) continue;
      const idx = list.findIndex(x => String(x.id) === r.id);
      if (r.deleted) {
        if (idx >= 0) { list.splice(idx, 1); changed = true; }
        delete known[key];
      } else {
        const h = hash(r.data);
        if (idx < 0) { list.push(r.data); changed = true; }
        else if (hash(list[idx]) !== h) { list[idx] = r.data; changed = true; }
        known[key] = h;
      }
      s.sync.lastPulled = r.updated_at;
    }
    if (data.length < 500) break;
  }
  if (changed) s.history.sort((a, b) => b.end - a.end);
  save();
  if (changed) window.dispatchEvent(new Event('cloud-changed'));
}

// sobe as mudanças pouco depois de cada alteração
let timer;
onChange(() => {
  if (!user) return;
  clearTimeout(timer);
  timer = setTimeout(sync, 1500);
});
window.addEventListener('online', () => sync());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });

// ---------- conta ----------
export async function initAuth(onAuth) {
  if (!client) { setStatus('offline', 'Biblioteca do Supabase não carregou'); return; }
  client.auth.onAuthStateChange((event, session) => {
    const prev = user?.id;
    user = session?.user || null;
    ready = true;
    if (user && user.id !== prev) {
      profileReady = false; profile = null;
      // fora do callback (o supabase-js trava se chamar a API dentro dele)
      setTimeout(async () => {
        try {
          profile = await getProfile();
          if (profile?.name) profileName = profile.name;
          try {
            if (profile?.must_change_password) localStorage.setItem(MC_KEY, user.id);
            else if (profile) localStorage.removeItem(MC_KEY);
          } catch {}
        } catch {}
        profileReady = true;
        onAuth?.('PROFILE');
      });
    }
    if (!user) { profileName = ''; profile = null; profileReady = true; }
    if (event === 'PASSWORD_RECOVERY') onAuth?.('recovery');
    if (user && user.id !== prev) sync();
    if (!user) setStatus('offline');
    onAuth?.(event);
  });
}

const redirectTo = () => location.origin + location.pathname;

export async function signUp(name, email, password) {
  const { data, error } = await client.auth.signUp({
    email, password, options: { data: { name }, emailRedirectTo: redirectTo() },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function signIn(email, password) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  if (error) throw error;
}

export async function setNewPassword(password) {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function getProfile() {
  if (!user) return null;
  // com a rede social, os campos privados do perfil vêm por my_profile(); antes dela, pela tabela
  const r = await client.rpc('my_profile');
  if (!r.error) return r.data;
  const { data } = await client.from('profiles').select('name, username, must_change_password, terms_version').eq('id', user.id).maybeSingle();
  return data;
}

export async function updateName(name) {
  const { error } = await client.from('profiles').update({ name }).eq('id', user.id);
  if (error) throw error;
  profileName = name;
}

// sair: sincroniza antes e limpa os dados do aparelho (eles continuam salvos na conta)
export async function signOut() {
  await sync();
  if (status.state === 'error' || status.state === 'offline') {
    if (!confirm('Algumas mudanças ainda não foram enviadas (sem conexão). Sair mesmo assim e perder essas mudanças?')) return false;
  }
  await client.auth.signOut();
  replaceState({});
  return true;
}

export async function deleteAccount() {
  const { error } = await client.rpc('delete_my_account');
  if (error) throw error;
  await client.auth.signOut().catch(() => {});
  replaceState({});
}

// ---------- administração (permissão conferida no banco) ----------
let adminCache = null;
export async function amIAdmin() {
  if (!user) return false;
  if (adminCache?.id === user.id) return adminCache.v;
  const { data, error } = await client.rpc('am_i_admin');
  const v = !error && data === true;
  adminCache = { id: user.id, v };
  return v;
}

export const DEFAULT_PASSWORD = 'ABC123';

export async function adminCreateLogin(username, name) {
  const { data, error } = await client.rpc('admin_create_login', { p_username: username, p_name: name });
  if (error) throw error;
  return data;
}

export async function adminListLogins() {
  const { data, error } = await client.rpc('admin_list_logins');
  if (error) throw error;
  return data;
}

export async function adminResetLogin(userId) {
  const { error } = await client.rpc('admin_reset_login', { p_user: userId });
  if (error) throw error;
}

export async function changeMyPassword(password) {
  const { error } = await client.rpc('change_my_password', { p_new: password });
  if (error) throw error;
  if (profile) profile.must_change_password = false;
  try { localStorage.removeItem(MC_KEY); } catch {}
}

// "@rian" ou "rian" -> e-mail interno; e-mail de verdade passa direto
export const loginToEmail = (v) => {
  const t = v.trim().toLowerCase().replace(/^@/, '');
  return t.includes('@') ? t : `${t}@treino.local`;
};

// ---------- cadastro por @usuário (sem e-mail) ----------
export async function usernameAvailable(username) {
  const { data, error } = await client.rpc('username_available', { p_username: username });
  if (error) throw error;
  return data === true;
}

export async function signUpUsername(username, name, password, termsVersion) {
  const { error } = await client.rpc('sign_up', { p_username: username, p_name: name, p_password: password, p_terms_version: termsVersion });
  if (error) throw error;
  await signIn(loginToEmail(username), password);
}

// conta antiga (e-mail) escolhe o @ e passa a entrar com ele
export async function claimUsername(username) {
  const { error } = await client.rpc('claim_username', { p_username: username });
  if (error) throw error;
  if (profile) profile.username = username;
}
// perfil carregou e não tem @ (conta antiga criada com e-mail)
export const needsUsername = () => !!(user && profile && !profile.username);

// ---------- e-mail de recuperação ----------
export async function getRecoveryEmail() {
  if (!user) return '';
  const { data } = await client.from('user_contacts').select('email').eq('user_id', user.id).maybeSingle();
  return data?.email || '';
}

export async function setRecoveryEmail(email) {
  const { error } = await client.rpc('set_recovery_email', { p_email: email });
  if (error) throw error;
}

// "esqueci minha senha": o servidor manda o link para o e-mail de recuperação do @
export async function requestRecovery(username) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/recuperar-senha`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ username, redirectTo: location.origin + location.pathname }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 503) return 'off';
  if (res.status === 429) return 'limit';
  if (!res.ok) throw new Error(data.error || 'erro ao pedir recuperação');
  return 'sent';
}
