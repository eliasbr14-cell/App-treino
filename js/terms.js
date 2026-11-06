// Termos de uso e política de privacidade.
// Ao mudar o texto de forma relevante, aumente TERMS_VERSION: todo mundo precisa aceitar de novo.
import { APP_NAME } from './brand.js';

export const TERMS_VERSION = '1';
export const TERMS_DATE = '06/11/2026';

export const TERMS_HTML = `
<h3>1. O que é o app</h3>
<p>O ${APP_NAME} é um app para montar e acompanhar treinos de musculação. Ele está em fase de testes. Pode ter falhas, mudar ou sair do ar.</p>

<h3>2. Saúde e responsabilidade</h3>
<p>Os treinos prontos, os métodos e as dicas são <b>sugestões gerais</b> e não substituem a orientação de um profissional de educação física ou de saúde. Se você tem lesão, dor, condição de saúde ou está voltando a treinar, procure um profissional antes. Você treina por sua conta e risco e é responsável por usar cargas e execuções seguras.</p>

<h3>3. Sua conta</h3>
<p>Seu acesso é pessoal. Troque a senha inicial no primeiro acesso e não compartilhe sua senha. Contas podem ser suspensas em caso de uso indevido.</p>

<h3>4. Quais dados guardamos</h3>
<ul>
  <li><b>Conta:</b> nome, @usuário (ou e-mail) e senha (guardada de forma criptografada, ninguém consegue ler).</li>
  <li><b>Treinos:</b> seus treinos, exercícios, cargas, métodos, observações e histórico de treinos feitos.</li>
  <li><b>Registro do aceite</b> destes termos (versão e data).</li>
</ul>
<p>Não coletamos localização, contatos nem dados de pagamento. Não usamos seus dados para anúncios e <b>não vendemos nem repassamos</b> seus dados.</p>

<h3>5. Para que usamos</h3>
<p>Só para o app funcionar: entrar na sua conta, salvar e sincronizar seus treinos entre aparelhos e mostrar seu histórico. A base legal é a execução do serviço que você pediu e o seu consentimento (LGPD, art. 7º, I e V).</p>

<h3>6. Onde ficam</h3>
<p>No seu aparelho e no Supabase, nosso provedor de banco de dados, em servidor em <b>São Paulo</b>. O acesso é protegido por regras de segurança: cada usuário só vê os próprios treinos. Quando você compartilha um treino por link, quem recebe o link vê aquele treino (sem as suas cargas).</p>

<h3>7. Seus direitos (LGPD)</h3>
<p>Você pode, a qualquer momento: saber quais dados temos, corrigir, exportar (Configurações → Exportar backup), revogar o consentimento e <b>pedir a exclusão da conta e de todos os dados</b>. Para isso, fale com o administrador do app (quem criou seu acesso).</p>

<h3>8. Regras de convivência</h3>
<p>Nas funções de compartilhar (e, no futuro, no feed): sem nudez ou conteúdo sexual, sem assédio, ofensa ou discriminação, sem venda ou incentivo a anabolizantes e substâncias proibidas, sem fotos de outras pessoas sem autorização e sem spam. Conteúdo assim pode ser removido e a conta suspensa.</p>

<h3>9. Idade</h3>
<p>O app é para maiores de 16 anos. Menores de 18 devem usar com conhecimento dos responsáveis.</p>

<h3>10. Mudanças</h3>
<p>Se estes termos mudarem, o app avisa e pede um novo aceite.</p>

<p class="hint">Versão ${TERMS_VERSION} · ${TERMS_DATE}</p>
`;
