// Gerador de treino personalizado a partir do questionário.
// Regras simples e transparentes: divisão pelos dias, exercícios por "vaga"
// (padrão de movimento), séries/repetições/descanso pelo objetivo e nível,
// filtros por local (academia/casa) e por dores (joelho, lombar, ombro).

export const GOALS = [
  { id: 'emagrecer', icon: '🔥', name: 'Emagrecer', desc: 'Perder gordura e peso' },
  { id: 'barriga', icon: '🎯', name: 'Perder barriga', desc: 'Secar a região do abdômen' },
  { id: 'massa', icon: '💪', name: 'Ganhar massa', desc: 'Hipertrofia, crescer o músculo' },
  { id: 'definir', icon: '✨', name: 'Definir', desc: 'Manter o músculo e secar' },
  { id: 'forca', icon: '🏋️', name: 'Ganhar força', desc: 'Levantar mais peso' },
  { id: 'saude', icon: '❤️', name: 'Saúde e condicionamento', desc: 'Disposição, fôlego e bem-estar' },
  { id: 'gluteos', icon: '🍑', name: 'Glúteos e pernas', desc: 'Foco na parte de baixo' },
];

export const LEVELS = [
  { id: 'iniciante', icon: '🌱', name: 'Estou começando', desc: 'Nunca treinei ou menos de 6 meses' },
  { id: 'intermediario', icon: '🔥', name: 'Já treino', desc: 'De 6 meses a 2 anos' },
  { id: 'avancado', icon: '🏆', name: 'Treino há bastante tempo', desc: 'Mais de 2 anos com constância' },
];

export const TIMES = [
  { id: 'curto', icon: '⚡', name: '30 a 45 min' },
  { id: 'medio', icon: '⏱️', name: '45 a 60 min' },
  { id: 'longo', icon: '🕐', name: '60 a 90 min' },
];

export const PLACES = [
  { id: 'academia', icon: '🏢', name: 'Na academia', desc: 'Máquinas, polias, barras e halteres' },
  { id: 'casa', icon: '🏠', name: 'Em casa', desc: 'Halteres e peso do corpo' },
];

export const FOCUS = [
  { id: 'gluteos', name: 'Glúteos' }, { id: 'pernas', name: 'Pernas' }, { id: 'abdomen', name: 'Abdômen' },
  { id: 'bracos', name: 'Braços' }, { id: 'peito', name: 'Peito' }, { id: 'costas', name: 'Costas' }, { id: 'ombros', name: 'Ombros' },
];

export const PAINS = [
  { id: 'joelho', name: 'Joelho' }, { id: 'lombar', name: 'Lombar' }, { id: 'ombro', name: 'Ombro' },
];

// exercícios possíveis em casa (halteres + peso do corpo)
const HOME = new Set(['flexao', 'agachamento-goblet', 'afundo', 'bulgaro', 'ponte', 'prancha', 'abdominal-crunch',
  'abdominal-infra', 'russian-twist', 'elevacao-lateral', 'elevacao-frontal', 'rosca-alternada', 'rosca-martelo',
  'rosca-concentrada', 'triceps-frances', 'triceps-banco', 'triceps-coice', 'remada-unilateral', 'desenvolvimento-halter',
  'crucifixo-halter', 'stiff', 'encolhimento', 'panturrilha-em-pe', 'sissy']);

// exercícios evitados para cada dor
const AVOID = {
  joelho: ['agachamento-livre', 'agachamento-smith', 'agachamento-hack', 'afundo', 'bulgaro', 'sissy', 'agachamento-goblet'],
  lombar: ['levantamento-terra', 'remada-curvada', 'stiff', 'terra-romeno', 'good-morning', 'agachamento-livre', 'hiperextensao', 'desenvolvimento-barra'],
  ombro: ['desenvolvimento-barra', 'desenvolvimento-halter', 'paralelas-peito', 'paralelas-triceps', 'supino-declinado', 'elevacao-frontal', 'triceps-banco', 'encolhimento'],
};

// vagas: listas de candidatos em ordem de preferência
// (iniciante prefere máquinas: os itens marcados com * sobem para o começo)
const SLOTS = {
  peito: ['supino-reto-barra', '*supino-maquina', 'supino-smith', 'flexao'],
  peitoInc: ['supino-inclinado-halter', '*supino-inclinado-maquina', 'flexao'],
  peitoIso: ['*peck-deck', 'crucifixo-halter', 'crossover'],
  peitoDec: ['supino-declinado', 'crossover', 'paralelas-peito', 'flexao'],
  ombro: ['desenvolvimento-halter', '*desenvolvimento-maquina'],
  lateral: ['elevacao-lateral', 'elevacao-lateral-polia'],
  frontal: ['elevacao-frontal', 'elevacao-lateral-polia'],
  posterior: ['face-pull', '*crucifixo-inverso', 'remada-unilateral'],
  trapezio: ['encolhimento'],
  triceps: ['triceps-pulley', 'triceps-corda', 'triceps-frances', 'triceps-banco'],
  triceps2: ['triceps-testa', 'triceps-frances', 'triceps-coice', 'triceps-corda'],
  puxada: ['*puxada-frente', 'barra-fixa', 'puxada-triangulo', 'remada-unilateral'],
  remada: ['*remada-baixa', 'remada-maquina', 'remada-curvada', 'remada-unilateral'],
  remada2: ['remada-unilateral', 'remada-curvada', '*remada-maquina', 'remada-baixa'],
  pulldown: ['pulldown-braco-reto', 'puxada-triangulo', 'remada-unilateral'],
  lombarEx: ['hiperextensao'],
  biceps: ['rosca-direta', 'rosca-alternada'],
  biceps2: ['rosca-martelo', 'rosca-scott', 'rosca-concentrada'],
  agacha: ['agachamento-livre', '*leg-press', 'agachamento-smith', 'agachamento-goblet', 'leg-press'],
  legpress: ['*leg-press', 'agachamento-hack', 'bulgaro', 'afundo', 'agachamento-goblet'],
  extensora: ['*cadeira-extensora', 'sissy'],
  terra: ['stiff', 'terra-romeno', '*mesa-flexora'],
  flexora: ['*mesa-flexora', 'cadeira-flexora', 'flexora-em-pe', 'stiff'],
  gluteo: ['elevacao-pelvica', 'ponte'],
  gluteo2: ['*abdutora', 'gluteo-polia', 'gluteo-maquina', 'bulgaro', 'ponte'],
  panturrilha: ['panturrilha-em-pe', 'panturrilha-sentado', '*panturrilha-leg'],
  core: ['prancha', 'abdominal-crunch', 'abdominal-polia', 'elevacao-pernas', 'abdominal-infra', 'russian-twist'],
  cardio: ['esteira', 'bike', 'eliptico', 'escada'],
};

// tipos de treino: nome, grupos e vagas em ordem de importância
const DAYS = {
  fullA: { name: 'Corpo todo A', groups: ['quadriceps', 'peito', 'costas', 'ombros'], slots: ['agacha', 'peito', 'puxada', 'terra', 'ombro', 'biceps', 'triceps', 'panturrilha'] },
  fullB: { name: 'Corpo todo B', groups: ['quadriceps', 'gluteos', 'peito', 'costas'], slots: ['legpress', 'peitoInc', 'remada', 'gluteo', 'lateral', 'triceps2', 'biceps2', 'flexora'] },
  fullC: { name: 'Corpo todo C', groups: ['posterior', 'gluteos', 'costas', 'ombros'], slots: ['terra', 'remada2', 'peitoIso', 'extensora', 'gluteo2', 'posterior', 'biceps', 'triceps'] },
  superiores: { name: 'Superiores', groups: ['peito', 'costas', 'ombros', 'biceps', 'triceps'], slots: ['peito', 'puxada', 'ombro', 'remada', 'peitoIso', 'lateral', 'biceps', 'triceps'] },
  superiores2: { name: 'Superiores 2', groups: ['peito', 'costas', 'ombros', 'biceps', 'triceps'], slots: ['peitoInc', 'remada2', 'puxada', 'lateral', 'posterior', 'biceps2', 'triceps2', 'peitoIso'] },
  inferiores: { name: 'Inferiores', groups: ['quadriceps', 'posterior', 'gluteos', 'panturrilha'], slots: ['agacha', 'extensora', 'flexora', 'gluteo', 'legpress', 'panturrilha', 'gluteo2'] },
  inferiores2: { name: 'Inferiores 2', groups: ['posterior', 'gluteos', 'quadriceps', 'panturrilha'], slots: ['terra', 'legpress', 'gluteo2', 'flexora', 'gluteo', 'extensora', 'panturrilha'] },
  push: { name: 'Peito, Ombros e Tríceps', groups: ['peito', 'ombros', 'triceps'], slots: ['peito', 'peitoInc', 'ombro', 'peitoIso', 'lateral', 'triceps', 'triceps2', 'frontal'] },
  pull: { name: 'Costas e Bíceps', groups: ['costas', 'biceps'], slots: ['puxada', 'remada', 'remada2', 'pulldown', 'posterior', 'biceps', 'biceps2', 'lombarEx'] },
  legs: { name: 'Pernas', groups: ['quadriceps', 'posterior', 'gluteos', 'panturrilha'], slots: ['agacha', 'legpress', 'terra', 'extensora', 'flexora', 'gluteo', 'panturrilha', 'gluteo2'] },
  peitoDia: { name: 'Peito', groups: ['peito'], slots: ['peito', 'peitoInc', 'peitoDec', 'peitoIso', 'flexaoFim'] },
  costasDia: { name: 'Costas', groups: ['costas'], slots: ['puxada', 'remada', 'remada2', 'pulldown', 'lombarEx'] },
  ombrosDia: { name: 'Ombros e Abdômen', groups: ['ombros', 'abdomen'], slots: ['ombro', 'lateral', 'posterior', 'frontal', 'trapezio'] },
  bracosDia: { name: 'Braços', groups: ['biceps', 'triceps'], slots: ['biceps', 'triceps', 'biceps2', 'triceps2', 'bicepsFim', 'tricepsFim'] },
  // iniciante: só dois treinos simples, alternados
  iniA: { name: 'Peito, Ombro, Tríceps e Pernas', groups: ['peito', 'ombros', 'triceps', 'quadriceps'], slots: ['peito', 'ombro', 'tricepsMaq', 'extensora', 'legpress', 'lateral', 'panturrilha', 'adutoraEx'] },
  iniB: { name: 'Costas, Bíceps, Pernas e Abdômen', groups: ['costas', 'biceps', 'posterior', 'abdomen'], slots: ['puxada', 'remada', 'biceps', 'flexora', 'gluteo2', 'core'] },
  iniGluteoA: { name: 'Pernas e Glúteos', groups: ['quadriceps', 'gluteos', 'posterior'], slots: ['legpress', 'gluteo', 'extensora', 'flexora', 'gluteo2'] },
  iniGluteoB: { name: 'Superiores', groups: ['peito', 'costas', 'ombros'], slots: ['peito', 'puxada', 'remada', 'ombro', 'triceps'] },
  gluteoDia: { name: 'Glúteos e Posterior', groups: ['gluteos', 'posterior'], slots: ['gluteo', 'terra', 'gluteo2', 'flexora', 'legpress', 'panturrilha'] },
};
SLOTS.flexaoFim = ['flexao', 'crossover'];
SLOTS.tricepsMaq = ['*triceps-maquina', 'triceps-pulley', 'triceps-frances', 'triceps-banco'];
SLOTS.adutoraEx = ['adutora', 'ponte'];
SLOTS.bicepsFim = ['rosca-concentrada', 'rosca-alternada'];
SLOTS.tricepsFim = ['triceps-coice', 'triceps-banco'];

function split(days, level, goal) {
  const glute = goal === 'gluteos';
  // iniciante não tem o gás de quem já treina: dois treinos simples, alternando A e B
  if (level === 'iniciante') return glute ? ['iniGluteoA', 'iniGluteoB'] : ['iniA', 'iniB'];
  if (days <= 2) return ['fullA', 'fullB'];
  if (days === 3) {
    if (glute) return ['inferiores', 'superiores', 'gluteoDia'];
    return level === 'iniciante' ? ['fullA', 'fullB', 'fullC'] : ['push', 'pull', 'legs'];
  }
  if (days === 4) return glute ? ['inferiores', 'superiores', 'gluteoDia', 'superiores2'] : ['superiores', 'inferiores', 'superiores2', 'inferiores2'];
  if (days === 5) {
    if (glute) return ['inferiores', 'superiores', 'gluteoDia', 'superiores2', 'inferiores2'];
    return level === 'iniciante' ? ['superiores', 'inferiores', 'superiores2', 'inferiores2', 'fullA'] : ['peitoDia', 'costasDia', 'legs', 'ombrosDia', 'bracosDia'];
  }
  return glute ? ['inferiores', 'push', 'gluteoDia', 'pull', 'inferiores2', 'superiores2'] : ['push', 'pull', 'legs', 'superiores2', 'inferiores2', 'fullC'];
}

// séries/reps/descanso pelo objetivo
const PARAMS = {
  massa: { sets: 3, reps: '8-12', rest: 75, compoundRest: 90 },
  forca: { sets: 4, reps: '5', rest: 90, compoundRest: 150, compoundReps: '4-6' },
  definir: { sets: 3, reps: '10-15', rest: 50, compoundRest: 60 },
  emagrecer: { sets: 3, reps: '12-15', rest: 40, compoundRest: 45 },
  barriga: { sets: 3, reps: '12-15', rest: 40, compoundRest: 45 },
  saude: { sets: 3, reps: '12', rest: 50, compoundRest: 60 },
  gluteos: { sets: 3, reps: '10-12', rest: 60, compoundRest: 90 },
};
// drop-set só onde dá pra baixar a carga rápido (máquina, polia, halter)
const DROP_OK = new Set(['peck-deck', 'crossover', 'cadeira-extensora', 'mesa-flexora', 'cadeira-flexora', 'elevacao-lateral',
  'elevacao-lateral-polia', 'triceps-corda', 'triceps-pulley', 'rosca-direta', 'rosca-scott', 'rosca-martelo', 'abdutora',
  'gluteo-polia', 'gluteo-maquina', 'crucifixo-inverso', 'triceps-coice', 'rosca-maquina', 'triceps-maquina', 'pulldown-braco-reto',
  'rosca-alternada', 'rosca-concentrada', 'face-pull', 'leg-press']);
const COMPOUND_SLOTS = new Set(['peito', 'peitoInc', 'ombro', 'puxada', 'remada', 'agacha', 'legpress', 'terra', 'gluteo']);
const FOCUS_SLOTS = {
  gluteos: ['gluteo2', 'gluteo'], pernas: ['extensora', 'flexora'], abdomen: ['core'], bracos: ['biceps2', 'triceps2'],
  peito: ['peitoIso'], costas: ['pulldown'], ombros: ['lateral'],
};
const FOCUS_DAYS = {
  gluteos: ['inferiores', 'inferiores2', 'legs', 'fullA', 'fullB', 'fullC', 'gluteoDia'],
  pernas: ['inferiores', 'inferiores2', 'legs', 'fullA', 'fullB', 'fullC', 'gluteoDia'],
  bracos: ['superiores', 'superiores2', 'push', 'pull', 'fullA', 'fullB', 'fullC', 'bracosDia'],
  peito: ['superiores', 'superiores2', 'push', 'fullA', 'fullB', 'peitoDia'],
  costas: ['superiores', 'superiores2', 'pull', 'fullB', 'fullC', 'costasDia'],
  ombros: ['superiores', 'superiores2', 'push', 'fullA', 'ombrosDia'],
};

export function generatePlan(answers, exercises) {
  const { goal, level, days, time, place, focus = [], pains = [] } = answers;
  const exists = new Set(exercises.map(e => e.id));
  const avoid = new Set(pains.flatMap(p => AVOID[p] || []));
  const used = new Set();
  const p = PARAMS[goal] || PARAMS.massa;
  const cardioGoal = ['emagrecer', 'barriga', 'definir', 'saude'].includes(goal);
  // com cardio no fim, um exercício a menos para caber no tempo
  let perDay = ({ curto: 5, medio: 6, longo: 8 }[time] || 6) - (cardioGoal && place !== 'casa' ? 1 : 0);
  if (level === 'iniciante') perDay = { curto: 5, medio: 7, longo: 8 }[time] || 7;

  const pick = (slot) => {
    let list = (SLOTS[slot] || []).slice();
    if (level === 'iniciante') list.sort((a, b) => (b.startsWith('*') - a.startsWith('*')));
    list = list.map(x => x.replace('*', '')).filter(x => exists.has(x) && !avoid.has(x) && (place !== 'casa' || HOME.has(x)));
    return list.find(x => !used.has(x)) || list[0] || null;
  };

  const letters = 'ABCDEF';
  const workouts = split(Number(days), level, goal).map((key, i) => {
    const day = DAYS[key];
    let slots = day.slots.slice(0, perDay);
    // atenção extra: coloca a vaga do foco se o dia combina
    for (const f of focus) {
      if (f === 'abdomen') continue;
      if ((FOCUS_DAYS[f] || []).includes(key)) for (const s of FOCUS_SLOTS[f] || []) if (!slots.includes(s)) { slots.push(s); break; }
    }
    const items = [];
    const seen = new Set();
    for (const slot of slots) {
      const ex = pick(slot);
      if (!ex || seen.has(ex)) continue;
      seen.add(ex); used.add(ex);
      const compound = COMPOUND_SLOTS.has(slot);
      let sets = p.sets + (level === 'avancado' && compound ? 1 : 0);
      let rest = compound ? p.compoundRest : p.rest;
      let reps = compound && p.compoundReps ? p.compoundReps : p.reps;
      // força: só os básicos pesados; os isolados ficam em 3x8-10
      if (goal === 'forca' && !compound) { sets = 3; reps = '8-10'; }
      // iniciante: tudo 3 x 12 a 15, descanso curto, carga leve
      if (level === 'iniciante') { sets = 3; reps = goal === 'forca' ? '10-12' : '12-15'; rest = slot === 'panturrilha' ? 60 : 45; }
      if (ex === 'prancha') reps = '30-45s';
      items.push({ exerciseId: ex, sets, reps, rest, method: 'normal', notes: '', _compound: compound });
    }
    // métodos para quem já treina: drop-set no último isolado
    if (level !== 'iniciante' && ['massa', 'definir', 'gluteos'].includes(goal) && items.length > 3) {
      const last = [...items].reverse().find(it => !it._compound && DROP_OK.has(it.exerciseId));
      if (last) { last.method = 'drop-set'; last.notes = 'Drop-set só na última série'; }
    }
    if (level !== 'iniciante' && ['emagrecer', 'barriga'].includes(goal) && items.length >= 4) {
      items[items.length - 2].method = 'bi-set'; items[items.length - 1].method = 'bi-set';
      items[items.length - 2].notes = 'Bi-set com o próximo exercício, sem descanso entre eles';
    }
    // abdômen: barriga/foco abdômen em todo treino; demais, em dias alternados
    const wantsCore = level !== 'iniciante' && (goal === 'barriga' || focus.includes('abdomen') || i % 2 === 0);
    if (wantsCore && !items.some(it => SLOTS.core.includes(it.exerciseId))) {
      const core = (SLOTS.core.filter(x => exists.has(x) && (place !== 'casa' || HOME.has(x)) && !used.has(x))[0]) || 'prancha';
      used.add(core);
      items.push({ exerciseId: core, sets: 3, reps: core === 'prancha' ? '30-45s' : '15', rest: 40, method: 'normal', notes: '' });
    }
    // iniciante na academia: cardio leve no começo (aquecimento) e no fim
    if (level === 'iniciante' && place !== 'casa') {
      items.unshift({ exerciseId: SLOTS.cardio[(i * 2) % SLOTS.cardio.length], sets: 1, reps: time === 'curto' ? '10 min' : '15 min', rest: 0, method: 'normal', notes: 'Aquecimento em ritmo leve a moderado' });
      if (time !== 'curto' || cardioGoal) items.push({ exerciseId: SLOTS.cardio[(i * 2 + 1) % SLOTS.cardio.length], sets: 1, reps: cardioGoal ? '20 min' : '15 min', rest: 0, method: 'normal', notes: '' });
    } else if (cardioGoal) {
      const min = goal === 'saude' ? '15 min' : time === 'curto' ? '15 min' : '20-30 min';
      // em casa não há aparelho de cardio na lista: vai como dica
      const cardio = place === 'casa' ? null : SLOTS.cardio[i % SLOTS.cardio.length];
      if (cardio) items.push({ exerciseId: cardio, sets: 1, reps: min, rest: 0, method: 'normal', notes: 'Ritmo moderado: dá pra falar, mas não pra cantar' });
    }
    items.forEach(it => delete it._compound);
    return { letter: letters[i], name: day.name, groups: day.groups, items };
  });

  return { workouts, tips: tipsFor(answers) };
}

function tipsFor({ goal, level, place, pains = [], days }) {
  const t = [];
  if (goal === 'barriga') t.push('Sinceridade: não existe perder gordura só da barriga. O abdômen seca quando o corpo todo perde gordura, então o que mais funciona é treinar o corpo todo, fazer cardio e cuidar da alimentação. O abdominal fortalece e deixa o músculo mais aparente quando a gordura baixa.');
  if (goal === 'emagrecer' || goal === 'definir') t.push('O treino ajuda muito, mas quem manda no emagrecimento é a alimentação. Treino + cardio + comer um pouco menos do que gasta é a combinação que funciona.');
  if (goal === 'massa') t.push('Para crescer: aumente a carga aos poucos quando conseguir fazer todas as repetições, coma proteína todo dia e durma bem. Músculo cresce no descanso.');
  if (goal === 'forca') t.push('Nos exercícios principais, descanse bem (2–3 min) e capriche na técnica antes de subir o peso.');
  if (goal === 'gluteos') t.push('Glúteo responde a carga e amplitude: elevação pélvica pesada e controle na descida fazem a diferença.');
  if (level === 'iniciante') t.push(`Começando, o melhor é simples: só dois treinos (A e B) com poucos exercícios. Alterne A e B${Number(days) > 3 ? ' — e 3 ou 4 dias por semana já está ótimo nesse começo, o descanso também faz o músculo crescer' : ` nos seus ${days} dias`}. Depois de 2 ou 3 meses, refaça as perguntas como “Já treino” para subir de nível.`);
  if (level === 'iniciante') t.push('Começando: nas primeiras 2–3 semanas use cargas leves para aprender o movimento. Deixe 2–3 repetições “sobrando” em cada série.');
  if (place === 'casa' && ['emagrecer', 'barriga', 'definir', 'saude'].includes(goal)) t.push('Cardio em casa: no fim de cada treino, 15–30 min de caminhada rápida, corrida, polichinelo ou pular corda.');
  if (place === 'casa') t.push('Em casa: se ficar fácil, faça mais repetições, desça mais devagar ou pegue halteres mais pesados.');
  if (pains.length) t.push(`Evitamos exercícios que forçam ${pains.map(p => ({ joelho: 'o joelho', lombar: 'a lombar', ombro: 'o ombro' }[p])).join(' e ')}. Mesmo assim, se doer, pare e procure um fisioterapeuta ou educador físico.`);
  if (Number(days) >= 5) t.push('Treinando 5 ou mais dias: respeite o descanso, sono e alimentação para não cair o rendimento.');
  return t;
}
