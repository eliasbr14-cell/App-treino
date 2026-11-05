// Biblioteca base de exercícios e métodos de treino.
// Cada exercício: id, nome, grupo, equipamento e dicas rápidas de execução.

export const GROUPS = [
  { id: 'peito', name: 'Peito', emoji: '🫁' },
  { id: 'costas', name: 'Costas', emoji: '🔙' },
  { id: 'ombros', name: 'Ombros', emoji: '🏔️' },
  { id: 'biceps', name: 'Bíceps', emoji: '💪' },
  { id: 'triceps', name: 'Tríceps', emoji: '🦾' },
  { id: 'quadriceps', name: 'Quadríceps', emoji: '🦵' },
  { id: 'posterior', name: 'Posterior', emoji: '🦿' },
  { id: 'gluteos', name: 'Glúteos', emoji: '🍑' },
  { id: 'panturrilha', name: 'Panturrilha', emoji: '🦶' },
  { id: 'abdomen', name: 'Abdômen', emoji: '🧱' },
  { id: 'cardio', name: 'Cardio', emoji: '🏃' },
];

const ex = (id, name, group, equipment, tips) => ({ id, name, group, equipment, tips });

const BASE = [
  // Peito
  ex('supino-reto-barra', 'Supino reto com barra', 'peito', 'Banco reto + barra', 'Escápulas encaixadas, pés firmes no chão. Desça a barra até a linha do mamilo e empurre sem tirar o quadril do banco.'),
  ex('supino-inclinado-halter', 'Supino inclinado com halteres', 'peito', 'Banco inclinado (30–45°) + halteres', 'Cotovelos a ~45° do tronco. Desça controlando até alongar o peitoral e suba unindo os halteres por cima.'),
  ex('supino-declinado', 'Supino declinado', 'peito', 'Banco declinado + barra', 'Prenda bem as pernas. Desça a barra na parte baixa do peito, sempre com controle.'),
  ex('supino-maquina', 'Supino na máquina (chest press)', 'peito', 'Máquina de supino sentado', 'Ajuste o banco para a pegada ficar na altura do meio do peito. Empurre sem travar os cotovelos.'),
  ex('crucifixo-halter', 'Crucifixo com halteres', 'peito', 'Banco reto + halteres', 'Cotovelos levemente flexionados o tempo todo. Abra em arco até sentir o alongamento e feche “abraçando”.'),
  ex('peck-deck', 'Peck deck (voador)', 'peito', 'Máquina voador', 'Costas coladas no encosto, braços na altura dos ombros. Junte as mãos à frente e volte devagar.'),
  ex('crossover', 'Crossover na polia', 'peito', 'Polia dupla (crossover)', 'Passo à frente, tronco levemente inclinado. Traga as mãos para baixo e ao centro, contraindo o peito.'),
  ex('flexao', 'Flexão de braço', 'peito', 'Peso corporal', 'Corpo alinhado da cabeça ao calcanhar. Desça até o peito quase tocar o chão.'),
  ex('paralelas-peito', 'Paralelas (foco peito)', 'peito', 'Barras paralelas', 'Incline o tronco à frente e desça até os ombros ficarem na linha dos cotovelos.'),

  // Costas
  ex('puxada-frente', 'Puxada frontal (pulley)', 'costas', 'Polia alta (pulldown)', 'Peito aberto, puxe a barra até a parte de cima do peito levando os cotovelos para baixo e para trás.'),
  ex('puxada-triangulo', 'Puxada com triângulo', 'costas', 'Polia alta + triângulo', 'Tronco levemente inclinado para trás, puxe até o peito e segure 1s na contração.'),
  ex('remada-curvada', 'Remada curvada com barra', 'costas', 'Barra livre', 'Tronco inclinado ~45°, coluna neutra. Puxe a barra até o umbigo e controle a descida.'),
  ex('remada-baixa', 'Remada baixa (sentada)', 'costas', 'Polia baixa + triângulo', 'Coluna ereta, puxe o triângulo até o abdômen juntando as escápulas.'),
  ex('remada-unilateral', 'Remada unilateral com halter (serrote)', 'costas', 'Banco + halter', 'Apoie mão e joelho no banco. Puxe o halter em direção ao quadril.'),
  ex('remada-maquina', 'Remada na máquina articulada', 'costas', 'Máquina de remada', 'Peito apoiado, puxe as alavancas levando os cotovelos para trás.'),
  ex('barra-fixa', 'Barra fixa', 'costas', 'Barra fixa / graviton', 'Pegada um pouco mais aberta que os ombros, suba até o queixo passar a barra.'),
  ex('pulldown-braco-reto', 'Pulldown com braços estendidos', 'costas', 'Polia alta + barra/corda', 'Braços quase retos, leve a barra até as coxas usando as costas.'),
  ex('levantamento-terra', 'Levantamento terra', 'costas', 'Barra livre + anilhas', 'Barra rente às canelas, coluna neutra. Empurre o chão com as pernas e estenda o quadril.'),
  ex('hiperextensao', 'Hiperextensão lombar', 'costas', 'Banco romano', 'Desça com a coluna neutra e suba até alinhar o tronco com as pernas, sem hiperestender.'),

  // Ombros
  ex('desenvolvimento-halter', 'Desenvolvimento com halteres', 'ombros', 'Banco com encosto + halteres', 'Comece com halteres na altura das orelhas e empurre para cima sem bater um no outro.'),
  ex('desenvolvimento-maquina', 'Desenvolvimento na máquina', 'ombros', 'Máquina de desenvolvimento', 'Ajuste o banco para as pegadas ficarem na altura dos ombros. Empurre sem travar.'),
  ex('elevacao-lateral', 'Elevação lateral', 'ombros', 'Halteres', 'Cotovelos levemente flexionados, suba até a linha dos ombros, como quem “derrama água”.'),
  ex('elevacao-lateral-polia', 'Elevação lateral na polia', 'ombros', 'Polia baixa', 'Puxe o cabo por trás/frente do corpo até a linha do ombro, tensão constante.'),
  ex('elevacao-frontal', 'Elevação frontal', 'ombros', 'Halteres ou anilha', 'Suba os braços à frente até a altura dos olhos, sem balançar o tronco.'),
  ex('crucifixo-inverso', 'Crucifixo inverso (posterior)', 'ombros', 'Peck deck invertido ou halteres', 'Abra os braços para trás focando no deltoide posterior.'),
  ex('face-pull', 'Face pull', 'ombros', 'Polia alta + corda', 'Puxe a corda em direção ao rosto abrindo as mãos e girando os ombros para fora.'),
  ex('encolhimento', 'Encolhimento (trapézio)', 'ombros', 'Halteres ou barra', 'Suba os ombros em direção às orelhas, segure 1s e desça devagar.'),

  // Bíceps
  ex('rosca-direta', 'Rosca direta com barra', 'biceps', 'Barra reta ou W', 'Cotovelos colados ao corpo, suba sem balançar o tronco.'),
  ex('rosca-alternada', 'Rosca alternada com halteres', 'biceps', 'Halteres', 'Gire o punho (supinação) durante a subida. Um braço de cada vez.'),
  ex('rosca-martelo', 'Rosca martelo', 'biceps', 'Halteres', 'Pegada neutra (palmas uma de frente para a outra), cotovelos fixos.'),
  ex('rosca-scott', 'Rosca Scott', 'biceps', 'Banco Scott + barra W', 'Axilas encaixadas no apoio, desça até quase estender o braço.'),
  ex('rosca-concentrada', 'Rosca concentrada', 'biceps', 'Halter', 'Cotovelo apoiado na parte interna da coxa, suba contraindo bem.'),
  ex('rosca-polia', 'Rosca na polia', 'biceps', 'Polia baixa + barra', 'Tensão constante. Cotovelos parados ao lado do corpo.'),

  // Tríceps
  ex('triceps-pulley', 'Tríceps pulley (barra)', 'triceps', 'Polia alta + barra', 'Cotovelos colados ao corpo, estenda totalmente e volte até 90°.'),
  ex('triceps-corda', 'Tríceps corda', 'triceps', 'Polia alta + corda', 'No final, abra a corda para os lados para contrair mais.'),
  ex('triceps-testa', 'Tríceps testa', 'triceps', 'Banco + barra W', 'Cotovelos apontando para o teto, desça a barra em direção à testa.'),
  ex('triceps-frances', 'Tríceps francês', 'triceps', 'Halter', 'Halter atrás da cabeça, cotovelos fechados, estenda para cima.'),
  ex('triceps-banco', 'Mergulho no banco', 'triceps', 'Banco', 'Mãos no banco atrás do corpo, desça até os cotovelos fazerem 90°.'),
  ex('triceps-coice', 'Tríceps coice', 'triceps', 'Halter ou polia', 'Tronco inclinado, braço paralelo ao corpo, estenda o cotovelo para trás.'),
  ex('supino-fechado', 'Supino fechado', 'triceps', 'Banco reto + barra', 'Pegada na largura dos ombros, cotovelos perto do corpo.'),

  // Quadríceps
  ex('agachamento-livre', 'Agachamento livre', 'quadriceps', 'Barra + rack', 'Pés na largura dos ombros, desça com o quadril para trás mantendo o peito aberto e joelhos alinhados com os pés.'),
  ex('agachamento-smith', 'Agachamento no Smith', 'quadriceps', 'Máquina Smith', 'Pés levemente à frente da barra. Desça controlando até coxas paralelas ao chão.'),
  ex('agachamento-hack', 'Agachamento hack', 'quadriceps', 'Máquina hack', 'Costas apoiadas, desça fundo sem tirar o calcanhar da plataforma.'),
  ex('leg-press', 'Leg press 45°', 'quadriceps', 'Máquina leg press', 'Pés na largura do quadril no meio da plataforma. Desça até ~90° sem tirar a lombar do encosto. Não trave os joelhos.'),
  ex('cadeira-extensora', 'Cadeira extensora', 'quadriceps', 'Máquina extensora', 'Ajuste o encosto para o joelho ficar alinhado ao eixo da máquina. Estenda e segure 1s no topo.'),
  ex('afundo', 'Afundo / passada', 'quadriceps', 'Halteres ou peso corporal', 'Passo largo, desça até o joelho de trás quase tocar o chão. Tronco ereto.'),
  ex('bulgaro', 'Agachamento búlgaro', 'quadriceps', 'Banco + halteres', 'Pé de trás apoiado no banco. Desça na vertical com o peso na perna da frente.'),
  ex('agachamento-goblet', 'Agachamento goblet', 'quadriceps', 'Halter ou kettlebell', 'Segure o peso junto ao peito e desça fundo com os cotovelos entre os joelhos.'),
  ex('sissy', 'Sissy squat', 'quadriceps', 'Peso corporal / aparelho sissy', 'Joelhos vão à frente enquanto o tronco inclina para trás, alinhado com as coxas.'),

  // Posterior
  ex('mesa-flexora', 'Mesa flexora', 'posterior', 'Máquina flexora deitada', 'Quadril colado no banco. Flexione levando o calcanhar em direção ao glúteo.'),
  ex('cadeira-flexora', 'Cadeira flexora', 'posterior', 'Máquina flexora sentada', 'Trave bem as coxas, flexione e volte devagar.'),
  ex('stiff', 'Stiff', 'posterior', 'Barra ou halteres', 'Joelhos semiflexionados, leve o quadril para trás descendo a barra rente às pernas até alongar o posterior.'),
  ex('terra-romeno', 'Levantamento terra romeno', 'posterior', 'Barra', 'Igual ao stiff, mas com joelhos um pouco mais flexionados e foco na dobradiça do quadril.'),
  ex('flexora-em-pe', 'Flexora em pé (unilateral)', 'posterior', 'Máquina flexora em pé', 'Uma perna de cada vez, sem compensar com o quadril.'),
  ex('good-morning', 'Good morning', 'posterior', 'Barra', 'Barra nas costas, incline o tronco à frente com coluna neutra e volte.'),

  // Glúteos
  ex('elevacao-pelvica', 'Elevação pélvica (hip thrust)', 'gluteos', 'Banco + barra', 'Costas apoiadas no banco, empurre o quadril para cima até alinhar tronco e coxas. Contraia o glúteo no topo.'),
  ex('gluteo-polia', 'Glúteo na polia (coice)', 'gluteos', 'Polia baixa + tornozeleira', 'Leve a perna para trás sem arquear a lombar.'),
  ex('gluteo-maquina', 'Glúteo na máquina (coice)', 'gluteos', 'Máquina de glúteo', 'Empurre a plataforma para trás com o calcanhar.'),
  ex('abdutora', 'Cadeira abdutora', 'gluteos', 'Máquina abdutora', 'Abra as pernas contra a resistência, tronco levemente inclinado à frente foca mais no glúteo.'),
  ex('adutora', 'Cadeira adutora', 'gluteos', 'Máquina adutora', 'Feche as pernas controlando, sem bater as almofadas.'),
  ex('ponte', 'Ponte de glúteo', 'gluteos', 'Peso corporal / anilha', 'Deitado, pés no chão, suba o quadril contraindo o glúteo.'),

  // Panturrilha
  ex('panturrilha-em-pe', 'Panturrilha em pé', 'panturrilha', 'Máquina ou Smith', 'Suba na ponta dos pés o máximo possível e desça alongando bem.'),
  ex('panturrilha-sentado', 'Panturrilha sentado', 'panturrilha', 'Máquina sentada (sóleo)', 'Amplitude total, segure 1s em cima.'),
  ex('panturrilha-leg', 'Panturrilha no leg press', 'panturrilha', 'Leg press', 'Só a ponta dos pés na plataforma, empurre estendendo o tornozelo.'),

  // Abdômen
  ex('abdominal-crunch', 'Abdominal crunch', 'abdomen', 'Colchonete', 'Tire só as escápulas do chão, contraindo o abdômen.'),
  ex('prancha', 'Prancha', 'abdomen', 'Colchonete', 'Antebraços no chão, corpo reto, contraia abdômen e glúteos. Conte o tempo.'),
  ex('elevacao-pernas', 'Elevação de pernas', 'abdomen', 'Banco ou barra fixa', 'Suba as pernas sem embalo, controlando a descida.'),
  ex('abdominal-polia', 'Abdominal na polia (crunch ajoelhado)', 'abdomen', 'Polia alta + corda', 'Ajoelhado, flexione o tronco levando os cotovelos às coxas.'),
  ex('abdominal-infra', 'Abdominal infra', 'abdomen', 'Colchonete', 'Deitado, leve os joelhos ao peito tirando o quadril do chão.'),
  ex('russian-twist', 'Russian twist', 'abdomen', 'Anilha ou peso corporal', 'Sentado com tronco inclinado, gire de um lado para o outro.'),

  // Cardio
  ex('esteira', 'Esteira', 'cardio', 'Esteira', 'Caminhada inclinada ou corrida. Defina tempo e velocidade.'),
  ex('bike', 'Bicicleta ergométrica', 'cardio', 'Bike', 'Ajuste o banco na altura do quadril. Ritmo constante ou intervalado.'),
  ex('escada', 'Escada / simulador', 'cardio', 'Simulador de escada', 'Postura ereta, sem se apoiar demais no corrimão.'),
  ex('eliptico', 'Elíptico (transport)', 'cardio', 'Elíptico', 'Movimento contínuo, use os braços junto.'),

  // Variações extras (para trocar quando a academia não tem a máquina)
  ex('supino-smith', 'Supino reto no Smith', 'peito', 'Máquina Smith', 'Banco centralizado sob a barra. Desça até o peito e empurre na linha reta do Smith.'),
  ex('supino-inclinado-maquina', 'Supino inclinado na máquina', 'peito', 'Máquina articulada inclinada', 'Ajuste o banco para a pegada ficar na parte alta do peito. Empurre sem travar os cotovelos.'),
  ex('desenvolvimento-barra', 'Desenvolvimento com barra', 'ombros', 'Barra + banco ou em pé', 'Barra na altura do queixo, empurre para cima passando perto do rosto.'),
  ex('rosca-maquina', 'Rosca na máquina', 'biceps', 'Máquina de rosca (Scott articulado)', 'Cotovelos alinhados ao eixo da máquina, suba e desça controlando.'),
  ex('triceps-maquina', 'Tríceps na máquina', 'triceps', 'Máquina de extensão de tríceps', 'Cotovelos apoiados e alinhados ao eixo, estenda os braços sem tirar as costas do encosto.'),
  ex('triceps-mergulho-maquina', 'Mergulho na máquina (tríceps)', 'triceps', 'Máquina de dips sentado', 'Empurre as alças para baixo até estender os braços, cotovelos perto do corpo.'),
  ex('triceps-inverso', 'Tríceps pulley pegada invertida', 'triceps', 'Polia alta + barra', 'Palmas para cima, cotovelos colados no corpo, estenda até o fim.'),
  ex('triceps-polia-cabeca', 'Tríceps na polia acima da cabeça', 'triceps', 'Polia + corda', 'De costas para a polia, estenda a corda para frente e para cima mantendo os cotovelos fixos.'),
  ex('paralelas-triceps', 'Paralelas (foco tríceps)', 'triceps', 'Barras paralelas', 'Tronco reto, cotovelos para trás, desça até 90° e empurre.'),
];

// Imagens de demonstração (início e fim do movimento) vindas da Free Exercise DB
// (github.com/yuhonas/free-exercise-db, domínio público), salvas em img/ex/.
// fam = família de variação: usada para sugerir trocas quando a academia não tem o aparelho.
const META = {
  'supino-reto-barra': ['Barbell_Bench_Press_-_Medium_Grip', 'supino'],
  'supino-inclinado-halter': ['Incline_Dumbbell_Press', 'supino-inclinado'],
  'supino-declinado': ['Decline_Barbell_Bench_Press', 'supino'],
  'supino-maquina': ['Machine_Bench_Press', 'supino'],
  'crucifixo-halter': ['Dumbbell_Flyes', 'crucifixo'],
  'peck-deck': ['Butterfly', 'crucifixo'],
  'crossover': ['Cable_Crossover', 'crucifixo'],
  'flexao': ['Pushups', 'supino'],
  'paralelas-peito': ['Dips_-_Chest_Version', 'supino'],
  'supino-smith': ['Smith_Machine_Bench_Press', 'supino'],
  'supino-inclinado-maquina': ['Leverage_Incline_Chest_Press', 'supino-inclinado'],
  'puxada-frente': ['Wide-Grip_Lat_Pulldown', 'puxada'],
  'puxada-triangulo': ['V-Bar_Pulldown', 'puxada'],
  'barra-fixa': ['Pullups', 'puxada'],
  'pulldown-braco-reto': ['Straight-Arm_Pulldown', 'puxada'],
  'remada-curvada': ['Bent_Over_Barbell_Row', 'remada'],
  'remada-baixa': ['Seated_Cable_Rows', 'remada'],
  'remada-unilateral': ['One-Arm_Dumbbell_Row', 'remada'],
  'remada-maquina': ['Leverage_Iso_Row', 'remada'],
  'levantamento-terra': ['Barbell_Deadlift', 'lombar'],
  'hiperextensao': ['Hyperextensions_Back_Extensions', 'lombar'],
  'desenvolvimento-halter': ['Dumbbell_Shoulder_Press', 'desenvolvimento'],
  'desenvolvimento-maquina': ['Machine_Shoulder_Military_Press', 'desenvolvimento'],
  'desenvolvimento-barra': ['Barbell_Shoulder_Press', 'desenvolvimento'],
  'elevacao-lateral': ['Side_Lateral_Raise', 'lateral'],
  'elevacao-lateral-polia': ['Cable_Seated_Lateral_Raise', 'lateral'],
  'elevacao-frontal': ['Front_Dumbbell_Raise', 'frontal'],
  'crucifixo-inverso': ['Reverse_Machine_Flyes', 'posterior-ombro'],
  'face-pull': ['Face_Pull', 'posterior-ombro'],
  'encolhimento': ['Dumbbell_Shrug', 'trapezio'],
  'rosca-direta': ['Barbell_Curl', 'rosca'],
  'rosca-alternada': ['Dumbbell_Alternate_Bicep_Curl', 'rosca'],
  'rosca-martelo': ['Hammer_Curls', 'rosca'],
  'rosca-scott': ['Preacher_Curl', 'rosca'],
  'rosca-concentrada': ['Concentration_Curls', 'rosca'],
  'rosca-polia': ['Standing_Biceps_Cable_Curl', 'rosca'],
  'rosca-maquina': ['Machine_Bicep_Curl', 'rosca'],
  'triceps-pulley': ['Triceps_Pushdown', 'triceps-extensao'],
  'triceps-corda': ['Triceps_Pushdown_-_Rope_Attachment', 'triceps-extensao'],
  'triceps-inverso': ['Reverse_Grip_Triceps_Pushdown', 'triceps-extensao'],
  'triceps-maquina': ['Machine_Triceps_Extension', 'triceps-extensao'],
  'triceps-testa': ['EZ-Bar_Skullcrusher', 'triceps-extensao'],
  'triceps-frances': ['Standing_Dumbbell_Triceps_Extension', 'triceps-extensao'],
  'triceps-polia-cabeca': ['Cable_Rope_Overhead_Triceps_Extension', 'triceps-extensao'],
  'triceps-coice': ['Tricep_Dumbbell_Kickback', 'triceps-extensao'],
  'triceps-banco': ['Bench_Dips', 'triceps-empurrar'],
  'triceps-mergulho-maquina': ['Dip_Machine', 'triceps-empurrar'],
  'paralelas-triceps': ['Dips_-_Triceps_Version', 'triceps-empurrar'],
  'supino-fechado': ['Close-Grip_Barbell_Bench_Press', 'triceps-empurrar'],
  'agachamento-livre': ['Barbell_Squat', 'agachamento'],
  'agachamento-smith': ['Smith_Machine_Squat', 'agachamento'],
  'agachamento-hack': ['Hack_Squat', 'agachamento'],
  'leg-press': ['Leg_Press', 'agachamento'],
  'agachamento-goblet': ['Goblet_Squat', 'agachamento'],
  'cadeira-extensora': ['Leg_Extensions', 'extensora'],
  'sissy': ['Weighted_Sissy_Squat', 'extensora'],
  'afundo': ['Dumbbell_Lunges', 'unilateral'],
  'bulgaro': ['Split_Squat_with_Dumbbells', 'unilateral'],
  'mesa-flexora': ['Lying_Leg_Curls', 'flexora'],
  'cadeira-flexora': ['Seated_Leg_Curl', 'flexora'],
  'flexora-em-pe': ['Standing_Leg_Curl', 'flexora'],
  'stiff': ['Stiff-Legged_Barbell_Deadlift', 'stiff'],
  'terra-romeno': ['Romanian_Deadlift', 'stiff'],
  'good-morning': ['Good_Morning', 'stiff'],
  'elevacao-pelvica': ['Barbell_Hip_Thrust', 'pelvica'],
  'ponte': ['Barbell_Glute_Bridge', 'pelvica'],
  'gluteo-polia': ['One-Legged_Cable_Kickback', 'coice'],
  'gluteo-maquina': ['Glute_Kickback', 'coice'],
  'abdutora': ['Thigh_Abductor', 'abdutora'],
  'adutora': ['Thigh_Adductor', 'adutora'],
  'panturrilha-em-pe': ['Standing_Calf_Raises', 'panturrilha'],
  'panturrilha-sentado': ['Seated_Calf_Raise', 'panturrilha'],
  'panturrilha-leg': ['Calf_Press_On_The_Leg_Press_Machine', 'panturrilha'],
  'abdominal-crunch': ['Crunches', 'abd'],
  'abdominal-polia': ['Cable_Crunch', 'abd'],
  'prancha': ['Plank', 'abd'],
  'elevacao-pernas': ['Hanging_Leg_Raise', 'abd-infra'],
  'abdominal-infra': ['Reverse_Crunch', 'abd-infra'],
  'russian-twist': ['Russian_Twist', 'abd'],
  'esteira': ['Walking_Treadmill', 'cardio'],
  'bike': ['Bicycling_Stationary', 'cardio'],
  'escada': ['Stairmaster', 'cardio'],
  'eliptico': ['Elliptical_Trainer', 'cardio'],
};

export const EXERCISES = BASE.map(e => ({ ...e, demo: !!META[e.id], fam: META[e.id]?.[1] }));
export const DEMO_SOURCE = META;

export const METHODS = [
  { id: 'normal', name: 'Normal', desc: 'Séries e repetições tradicionais com descanso entre as séries.' },
  { id: 'drop-set', name: 'Drop-set', desc: 'Vá até a falha, reduza a carga (~20–30%) e continue sem descanso. Repita 2–3 vezes.' },
  { id: 'rest-pause', name: 'Rest-pause', desc: 'Vá até a falha, descanse 10–20s e faça mais repetições com a mesma carga.' },
  { id: 'bi-set', name: 'Bi-set', desc: 'Dois exercícios seguidos sem descanso entre eles (geralmente mesmo grupo muscular).' },
  { id: 'tri-set', name: 'Tri-set', desc: 'Três exercícios seguidos sem descanso entre eles.' },
  { id: 'super-serie', name: 'Super-série', desc: 'Dois exercícios de grupos opostos (ex.: bíceps e tríceps) sem descanso.' },
  { id: 'piramide-cresc', name: 'Pirâmide crescente', desc: 'A cada série aumenta a carga e diminui as repetições (ex.: 12-10-8-6).' },
  { id: 'piramide-decresc', name: 'Pirâmide decrescente', desc: 'Começa pesado com poucas reps e vai tirando carga e aumentando reps.' },
  { id: 'fst7', name: 'FST-7', desc: '7 séries de 8–12 reps com 30–45s de descanso, normalmente no último exercício.' },
  { id: 'gvt', name: 'GVT (10x10)', desc: '10 séries de 10 repetições com a mesma carga (~60% da máxima) e 60–90s de descanso.' },
  { id: 'cluster', name: 'Cluster set', desc: 'Divide a série em mini-blocos (ex.: 3+3+3) com 10–20s de pausa entre eles.' },
  { id: 'negativa', name: 'Negativa / excêntrica', desc: 'Foco na descida lenta (3–5s) do movimento.' },
  { id: 'isometria', name: 'Isometria', desc: 'Segura a posição de maior tensão por alguns segundos em cada repetição.' },
  { id: 'parcial', name: 'Repetições parciais', desc: 'Após a falha, faz repetições com meia amplitude para estender a série.' },
  { id: 'myo-reps', name: 'Myo-reps', desc: 'Uma série de ativação até perto da falha, depois mini-séries de 3–5 reps com 5 respirações de pausa.' },
];

export const WORKOUT_TEMPLATES = [
  { name: 'Pernas', groups: ['quadriceps', 'posterior', 'gluteos', 'panturrilha'] },
  { name: 'Peito e Tríceps', groups: ['peito', 'triceps'] },
  { name: 'Costas e Bíceps', groups: ['costas', 'biceps'] },
  { name: 'Ombros e Abdômen', groups: ['ombros', 'abdomen'] },
  { name: 'Glúteos e Posterior', groups: ['gluteos', 'posterior'] },
  { name: 'Full body', groups: ['peito', 'costas', 'quadriceps', 'ombros'] },
];

export const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ef4444', '#eab308', '#14b8a6', '#ec4899'];

// ---------- Programas prontos por nível ----------
// Cada exercício: [id, séries, repetições, descanso(s), método?, observação?]
const P = (letter, name, groups, list) => ({
  letter, name, groups,
  items: list.map(([exerciseId, sets, reps, rest, method = 'normal', notes = '']) => ({ exerciseId, sets, reps, rest, method, notes })),
});

export const PROGRAMS = [
  {
    id: 'iniciante-ab',
    level: 'Iniciante',
    name: 'Iniciante · AB',
    freq: '3x por semana, alternando A e B (ex.: seg A, qua B, sex A…)',
    desc: 'Para quem está começando ou voltando. Máquinas na maior parte, para aprender o movimento com segurança. Use uma carga que dê para fazer todas as repetições com boa técnica, deixando 2–3 repetições “sobrando”.',
    workouts: [
      P('A', 'Superiores', ['peito', 'costas', 'ombros', 'biceps', 'triceps'], [
        ['supino-maquina', 3, '12', 60], ['puxada-frente', 3, '12', 60], ['desenvolvimento-maquina', 3, '12', 60],
        ['remada-baixa', 3, '12', 60], ['rosca-direta', 3, '12', 45], ['triceps-pulley', 3, '12', 45],
        ['prancha', 3, '30s', 45, 'normal', 'Segure 30 segundos'],
      ]),
      P('B', 'Inferiores e abdômen', ['quadriceps', 'posterior', 'gluteos', 'panturrilha', 'abdomen'], [
        ['leg-press', 3, '12', 75], ['cadeira-extensora', 3, '12', 60], ['mesa-flexora', 3, '12', 60],
        ['elevacao-pelvica', 3, '12', 60], ['abdutora', 3, '15', 45], ['panturrilha-em-pe', 3, '15', 45],
        ['abdominal-crunch', 3, '15', 45],
      ]),
    ],
  },
  {
    id: 'intermediario-abc',
    level: 'Intermediário',
    name: 'Intermediário · ABC',
    freq: '3 a 6x por semana (A, B, C, descanso… ou A, B, C, A, B, C)',
    desc: 'Para quem já treina há alguns meses e domina os movimentos básicos. Mais pesos livres, mais volume e o primeiro método avançado (drop-set) no fim do treino de pernas.',
    workouts: [
      P('A', 'Peito, Ombros e Tríceps', ['peito', 'ombros', 'triceps'], [
        ['supino-reto-barra', 4, '10', 90], ['supino-inclinado-halter', 3, '10', 75], ['peck-deck', 3, '12', 60],
        ['desenvolvimento-halter', 3, '10', 75], ['elevacao-lateral', 3, '12', 45],
        ['triceps-corda', 3, '12', 45], ['triceps-testa', 3, '10', 60],
      ]),
      P('B', 'Costas e Bíceps', ['costas', 'biceps'], [
        ['puxada-frente', 4, '10', 75], ['remada-curvada', 4, '10', 90], ['remada-unilateral', 3, '10', 60],
        ['pulldown-braco-reto', 3, '12', 45], ['face-pull', 3, '15', 45],
        ['rosca-direta', 3, '10', 60], ['rosca-martelo', 3, '12', 45],
      ]),
      P('C', 'Pernas', ['quadriceps', 'posterior', 'gluteos', 'panturrilha'], [
        ['agachamento-livre', 4, '10', 120], ['leg-press', 4, '12', 90], ['cadeira-extensora', 3, '12', 60, 'drop-set', 'Drop-set só na última série'],
        ['stiff', 4, '10', 90], ['mesa-flexora', 3, '12', 60], ['elevacao-pelvica', 3, '10', 75],
        ['panturrilha-sentado', 4, '15', 45],
      ]),
    ],
  },
  {
    id: 'avancado-abcde',
    level: 'Avançado',
    name: 'Avançado · ABCDE',
    freq: '5x por semana, um grupo por dia (seg a sex)',
    desc: 'Para quem treina há mais de 1 ano com constância. Cada grupo muscular tem o seu dia, com métodos de intensidade (pirâmide, drop-set, rest-pause, FST-7). Exige boa recuperação: sono e alimentação em dia.',
    workouts: [
      P('A', 'Peito', ['peito'], [
        ['supino-reto-barra', 4, '12-10-8-6', 120, 'piramide-cresc'], ['supino-inclinado-halter', 4, '10', 90],
        ['supino-declinado', 3, '10', 90], ['crossover', 3, '12', 60], ['peck-deck', 3, '12', 60, 'drop-set'],
        ['paralelas-peito', 3, 'falha', 75],
      ]),
      P('B', 'Costas', ['costas'], [
        ['barra-fixa', 4, '8', 90], ['remada-curvada', 4, '8', 120], ['puxada-triangulo', 3, '10', 75],
        ['remada-baixa', 3, '12', 60, 'rest-pause'], ['pulldown-braco-reto', 3, '12', 45], ['hiperextensao', 3, '15', 45],
      ]),
      P('C', 'Pernas', ['quadriceps', 'posterior', 'gluteos', 'panturrilha'], [
        ['agachamento-livre', 5, '10-8-8-6-6', 150, 'piramide-cresc'], ['agachamento-hack', 4, '10', 90],
        ['leg-press', 4, '12', 90, 'rest-pause'], ['stiff', 4, '10', 90], ['mesa-flexora', 3, '12', 60],
        ['cadeira-extensora', 7, '10', 30, 'fst7', 'FST-7: 7 séries com 30s de descanso'],
        ['panturrilha-em-pe', 5, '12', 45],
      ]),
      P('D', 'Ombros e Abdômen', ['ombros', 'abdomen'], [
        ['desenvolvimento-halter', 4, '8', 90], ['elevacao-lateral', 4, '12', 45, 'drop-set'],
        ['elevacao-lateral-polia', 3, '15', 45], ['crucifixo-inverso', 4, '12', 45], ['encolhimento', 4, '12', 60],
        ['abdominal-polia', 4, '15', 45], ['elevacao-pernas', 3, '12', 45],
      ]),
      P('E', 'Braços', ['biceps', 'triceps'], [
        ['rosca-direta', 4, '10', 60, 'super-serie', 'Super-série com o tríceps testa'], ['triceps-testa', 4, '10', 60, 'super-serie'],
        ['rosca-scott', 3, '12', 60], ['triceps-corda', 3, '12', 45, 'drop-set'],
        ['rosca-martelo', 3, '12', 45], ['triceps-frances', 3, '12', 45], ['rosca-concentrada', 3, '12', 45],
      ]),
    ],
  },
];
