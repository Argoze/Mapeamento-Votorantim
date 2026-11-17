// Guia Inteligente de Acolhimento e Busca por Intenção da Rede Municipal
// Traduz o que o cidadão está sentindo ou precisando (linguagem leiga)
// para o tipo de serviço correto no SUS/Município (UBS, ESF, UPA, Hospital etc.)

export function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Dist\u00e2ncia de Levenshtein entre duas strings: n\u00famero m\u00ednimo de inser\u00e7\u00f5es,
 * remo\u00e7\u00f5es ou substitui\u00e7\u00f5es de caractere para transformar "a" em "b".
 * Implementa\u00e7\u00e3o pr\u00f3pria (sem depend\u00eancia externa) usando apenas um vetor
 * de uma linha para manter custo de mem\u00f3ria baixo.
 */
function distanciaLevenshtein(a, b) {
  if (a === b) return 0;
  const tamA = a.length;
  const tamB = b.length;
  if (tamA === 0) return tamB;
  if (tamB === 0) return tamA;

  let linhaAnterior = Array.from({ length: tamB + 1 }, (_, i) => i);

  for (let i = 1; i <= tamA; i++) {
    const linhaAtual = [i];
    for (let j = 1; j <= tamB; j++) {
      const custoSubstituicao = a[i - 1] === b[j - 1] ? 0 : 1;
      linhaAtual[j] = Math.min(
        linhaAtual[j - 1] + 1, // inser\u00e7\u00e3o
        linhaAnterior[j] + 1, // remo\u00e7\u00e3o
        linhaAnterior[j - 1] + custoSubstituicao // substitui\u00e7\u00e3o
      );
    }
    linhaAnterior = linhaAtual;
  }

  return linhaAnterior[tamB];
}

/**
 * Verifica se duas palavras s\u00e3o "pr\u00f3ximas o suficiente" para serem
 * consideradas a mesma palavra com erro de digita\u00e7\u00e3o. O limite de
 * toler\u00e2ncia cresce com o tamanho da palavra (erros de digita\u00e7\u00e3o s\u00e3o
 * proporcionalmente mais prov\u00e1veis em palavras longas) e palavras muito
 * curtas (3 letras ou menos) n\u00e3o entram na compara\u00e7\u00e3o para evitar falsos
 * positivos (ex: "pe" bateria com muita coisa).
 */
function palavrasSemelhantes(palavraUsuario, palavraKeyword) {
  if (palavraUsuario.length <= 3 || palavraKeyword.length <= 3) {
    return palavraUsuario === palavraKeyword;
  }
  const diferencaTamanho = Math.abs(palavraUsuario.length - palavraKeyword.length);
  const tolerancia = palavraKeyword.length <= 5 ? 1 : 2;
  if (diferencaTamanho > tolerancia) return false;
  return distanciaLevenshtein(palavraUsuario, palavraKeyword) <= tolerancia;
}

/**
 * Palavras comuns do português (preposições, pronomes, advérbios de uso
 * corriqueiro) que nunca devem disparar a tolerância a erro de digitação:
 * são tão frequentes em qualquer frase que, por acaso, acabam "parecidas"
 * (poucos caracteres de diferença) com algum termo técnico da lista de
 * palavras-chave, mesmo sem nenhuma relação de significado — por exemplo
 * "perto" (comum, significa "próximo") fica a 1 letra de "parto" (termo de
 * emergência hospitalar). Ignorá-las no match fuzzy evita falsos positivos
 * em frases do dia a dia que não têm relação com nenhuma das categorias.
 */
const PALAVRAS_COMUNS_IGNORADAS_NO_FUZZY = new Set([
  'para', 'pelo', 'pela', 'pelos', 'pelas', 'como', 'quando', 'onde', 'porque',
  'muito', 'muita', 'muitos', 'muitas', 'tudo', 'nada', 'isso', 'isto', 'aquilo',
  'este', 'esta', 'esse', 'essa', 'aquele', 'aquela', 'perto', 'longe', 'aqui',
  'ali', 'la', 'mais', 'menos', 'ainda', 'entao', 'depois', 'antes', 'hoje',
  'ontem', 'amanha', 'minha', 'minhas', 'suas', 'seus', 'pra', 'pro', 'sobre',
  'quero', 'queria', 'preciso', 'gostaria', 'tenho', 'estou', 'fiquei',
]);

/**
 * Verifica se um termo digitado "corresponde" a um texto-alvo (título de
 * categoria ou palavra-chave), tanto por correspondência exata de substring
 * (comportamento original) quanto, quando isso falhar, por proximidade de
 * digitação palavra a palavra (erro de digitação/abreviação). Usada pela
 * busca por intenção (autocomplete de sugestões) para que um termo digitado
 * com erro, como "vacna" ou "consuta", ainda encontre a categoria certa.
 * Os parâmetros já devem vir normalizados (ver normalizeText).
 */
export function correspondeComTolerancia(alvoNorm, termoNorm) {
  if (!termoNorm) return false;
  if (alvoNorm.includes(termoNorm)) return true;

  const palavrasTermo = termoNorm.split(/\s+/).filter(Boolean);
  const palavrasAlvo = alvoNorm.split(/\s+/).filter(Boolean);

  return palavrasTermo.every((pt) => {
    if (pt.length <= 3 || PALAVRAS_COMUNS_IGNORADAS_NO_FUZZY.has(pt)) {
      return alvoNorm.includes(pt);
    }
    return palavrasAlvo.some((pa) => palavrasSemelhantes(pt, pa));
  });
}

export const SUGESTOES_RAPIDAS = [
  { label: '💉 Tomar vacina', query: 'preciso tomar vacina' },
  { label: '🚨 Machucado / Queda', query: 'meu filho machucou o braço' },
  { label: '💊 Pegar remédio', query: 'onde pegar medicamento com receita' },
  { label: '🩺 Consulta de rotina', query: 'marcar consulta de rotina no clínico geral' },
  { label: '🦷 Dor de dente', query: 'preciso de dentista dor de dente' },
  { label: '👶 Pré-natal / Gestante', query: 'iniciar pré-natal gravidez' },
  { label: '🩸 Pressão / Diabetes', query: 'acompanhamento de pressão alta e diabetes' },
  { label: '🏫 Escola / Creche', query: 'matrícula escolar creche' },
];

export const INTENCOES = [
  // 1. UPA (Pronto Atendimento 24h / Urgências Clínicas e Traumáticas)
  {
    id: 'upa_urgencia',
    titulo: 'UPA (Pronto Atendimento 24 Horas)',
    emoji: '🚑',
    nivel: 'urgencia', // 'emergencia' | 'urgencia' | 'rotina' | 'geral'
    badge: { label: 'Pronto Atendimento 24h', cor: 'bg-amber-500 text-white' },
    tiposAlvo: ['UPA'],
    explicacao:
      'Para machucados, quedas com suspeita de fratura, cortes profundos, febre alta repentina e situações agudas (inclusive fora do horário comercial), o local correto é a UPA.',
    orientacao:
      'A UPA funciona 24 horas por dia, 7 dias por semana, com equipe médica de plantão, raio-X e medicamentos de emergência.',
    alertaGrave: false,
    keywords: [
      'machucou', 'machucado', 'machucada', 'machucar', 'machucando',
      'caiu', 'queda', 'tombo', 'bateu a cabeca', 'bateu o braco',
      'quebrou', 'quebrado', 'quebrada', 'fratura', 'suspeita de fratura', 'trincou',
      'torceu', 'torcao', 'entorse', 'luxacao', 'deslocou',
      'braco', 'perna', 'pe', 'mao', 'ombro', 'joelho', 'punho', 'cotovelo', 'tornozelo',
      'corte', 'cortou', 'sangrando', 'sangramento', 'sutura', 'pontos', 'levar ponto', 'prego', 'ferimento aberto',
      'febre alta', 'febre repentina', 'febre nao baixa', 'crianca com febre',
      'dor forte', 'dor aguda', 'dor insuportavel', 'colica renal', 'pedra no rim',
      'falta de ar', 'crise de asma', 'bronquite aguda', 'cansado falta de ar',
      'queimadura', 'queimou', 'agua quente', 'oleo quente',
      'vomito sem parar', 'vomitando muito', 'diarreia forte', 'desidratacao',
      'pressao alta repentina', 'pressao subiu muito', 'pico hipertensivo', 'tontura forte',
      'picada de escorpiao', 'picada de aranha', 'picada de cobra', 'bicho peconhento',
      'upa', 'pronto atendimento', 'pronto socorro', 'plantao', '24 horas', '24h', 'madrugada', 'fim de semana',
      'doendo muito', 'doendo pra caramba', 'nao aguento de dor', 'socorro', 'urgente',
      'ralado', 'esfolou', 'bati o joelho', 'bati o pe', 'virei o pe', 'rodei o pe',
    ],
  },

  // 2. Hospital Municipal (Emergências Gravíssimas / Risco de Vida / Internação / Parto)
  {
    id: 'hospital_emergencia',
    titulo: 'Hospital Municipal de Votorantim',
    emoji: '🏨',
    nivel: 'emergencia',
    badge: { label: 'Emergência Hospitalar', cor: 'bg-red-600 text-white' },
    tiposAlvo: ['Hospital'],
    explicacao:
      'Para emergências com risco à vida, trabalho de parto, cirurgias ou casos que necessitem de internação hospitalar, procure o Hospital Municipal.',
    orientacao:
      'Em casos gravíssimos ou acidentes de trânsito na via pública, chame imediatamente o resgate ligando para o SAMU (192) ou Bombeiros (193).',
    alertaGrave: true,
    keywords: [
      'infarto', 'ataque cardiaco', 'dor no peito forte', 'dor no peito que irradia',
      'derrame', 'avc', 'boca torta', 'perdeu a fala', 'perdeu os movimentos',
      'inconsciente', 'desmaiou e nao acorda', 'parada cardiaca', 'nao respira',
      'acidente grave', 'atropelamento', 'tiro', 'facada', 'esfaqueado', 'trauma craniano',
      'parto', 'trabalho de parto', 'bolsa estourou', 'ganhar bebe', 'dar a luz',
      'cirurgia', 'internacao', 'internar', 'uti', 'hospital', 'samu', 'ambulancia',
      'vai morrer', 'passando mal muito grave', 'caso grave', 'risco de vida', 'bebe nascendo',
      'contracao', 'contracoes', 'dor de parto',
    ],
  },

  // 3. Vacinas e Imunização (UBS / ESF)
  {
    id: 'ubs_vacina',
    titulo: 'UBS ou ESF (Sala de Vacinação)',
    emoji: '💉',
    nivel: 'rotina',
    badge: { label: 'Atenção Básica / Vacinação', cor: 'bg-blue-600 text-white' },
    tiposAlvo: ['UBS', 'ESF'],
    explicacao:
      'Para tomar vacinas do calendário nacional ou campanhas municipais (inclusive gripe, COVID, tétano, etc.), você deve se dirigir à UBS ou ESF do seu bairro.',
    orientacao:
      'Leve sempre a carteirinha de vacinação e um documento com foto. As salas de vacinação funcionam durante o horário de atendimento da unidade.',
    alertaGrave: false,
    keywords: [
      'vacina', 'vacinacao', 'tomar vacina', 'imunizacao', 'vacinar',
      'vacina da gripe', 'vacina do covid', 'gotinha', 'vacina de bebe',
      'carteira de vacina', 'carteirinha de vacinacao',
      'tetano', 'antitetanica', 'sarampo', 'febre amarela', 'hepatite', 'dengue', 'hpv', 'bcg', 'polio',
      'cartao de vacina', 'tomar a vacina', 'vacina atrasada', 'esquema vacinal', 'reforco da vacina',
    ],
  },

  // 4. Consultas de Rotina, Clínico Geral, Pré-natal e Preventivos (UBS / ESF)
  {
    id: 'ubs_consulta_rotina',
    titulo: 'UBS ou ESF (Posto de Saúde)',
    emoji: '🩺',
    nivel: 'rotina',
    badge: { label: 'Atenção Básica / Consultas', cor: 'bg-blue-600 text-white' },
    tiposAlvo: ['UBS', 'ESF'],
    explicacao:
      'Para consultas com clínico geral, pediatria preventiva, pré-natal, papanicolau e acompanhamento de saúde da família, a UBS ou ESF do seu bairro é a porta de entrada.',
    orientacao:
      'A Atenção Básica é responsável pelo cuidado contínuo da sua saúde e da sua família próximo de onde você mora.',
    alertaGrave: false,
    keywords: [
      'consulta', 'marcar consulta', 'clinico geral', 'consulta de rotina', 'medico',
      'medico da familia', 'posto de saude', 'ubs', 'esf', 'agendar medico',
      'pre-natal', 'prenatal', 'pre natal', 'gravidez', 'gravida', 'gestante', 'teste de gravidez',
      'papanicolau', 'preventivo', 'exame de mama', 'saude da mulher',
      'curativo simples', 'trocar curativo', 'retirar pontos', 'tirar pontos',
      'pressao alta cronica', 'hipertensao', 'diabetes cronica', 'glicemia', 'medir pressao',
      'pesagem bolsa familia', 'pesagem', 'puericultura', 'acompanhar crescimento',
      'marcar medico', 'agendar consulta', 'consulta de pediatria', 'pediatra', 'clinico',
      'check up', 'checkup', 'exame de rotina', 'acompanhamento medico',
    ],
  },

  // 5. Retirada de Medicamentos e Farmácia (UBS / ESF)
  {
    id: 'ubs_remedio',
    titulo: 'Farmácia da UBS / ESF',
    emoji: '💊',
    nivel: 'rotina',
    badge: { label: 'Farmácia Municipal', cor: 'bg-emerald-600 text-white' },
    tiposAlvo: ['UBS', 'ESF'],
    explicacao:
      'Medicamentos básicos prescritos pelo médico do SUS são dispensados gratuitamente na farmácia da sua UBS/ESF de referência.',
    orientacao:
      'Apresente a receita médica válida do SUS, documento com foto e o Cartão SUS do paciente para retirar seus medicamentos.',
    alertaGrave: false,
    keywords: [
      'remedio', 'pegar remedio', 'retirar remedio', 'medicamento', 'pegar medicamento',
      'farmacia', 'farmacia municipal', 'remedio de pressao', 'remedio de diabetes',
      'receita', 'receita medica', 'renovar receita', 'insulina', 'antibiotico',
      'acabou o remedio', 'onde pegar meu remedio', 'remedio continuo', 'remedio de uso continuo',
    ],
  },

  // 6. Odontologia e Dentista (UBS / ESF)
  {
    id: 'ubs_odonto',
    titulo: 'Saúde Bucal / Dentista (UBS / ESF)',
    emoji: '🦷',
    nivel: 'rotina',
    badge: { label: 'Odontologia / Saúde Bucal', cor: 'bg-cyan-600 text-white' },
    tiposAlvo: ['UBS', 'ESF'],
    explicacao:
      'Para atendimento odontológico no SUS (avaliação, dor de dente, limpeza, restauração e extração), procure a UBS ou ESF com consultório odontológico.',
    orientacao:
      'Caso seja necessária uma especialidade odontológica (como canal ou cirurgia especializada), a UBS fará o encaminhamento ao Centro de Especialidades Odontológicas (CEO).',
    alertaGrave: false,
    keywords: [
      'dente', 'dor de dente', 'dentista', 'odontologia', 'odonto',
      'carie', 'arrancar dente', 'obturacao', 'canal', 'limpeza de dente',
      'tartaro', 'gengiva sangrando', 'dente quebrado', 'boca',
      'doendo o dente', 'dente doendo muito', 'marcar dentista', 'avaliacao odontologica',
    ],
  },

  // 7. Exames e Especialistas Médicos
  {
    id: 'especialidades',
    titulo: 'Especialidades e Exames (Encaminhamento)',
    emoji: '📋',
    nivel: 'rotina',
    badge: { label: 'Especialidades / Encaminhamento', cor: 'bg-indigo-600 text-white' },
    tiposAlvo: ['UBS', 'ESF'],
    explicacao:
      'No SUS, para agendar consultas com especialistas (como cardiologista, oftalmologista e ortopedista) ou realizar exames laboratoriais, o primeiro passo é sempre passar pelo médico da sua UBS.',
    orientacao:
      'O médico da UBS faz a avaliação inicial e realiza o pedido regulado para a Policlínica Municipal ou laboratório de referência.',
    alertaGrave: false,
    keywords: [
      'exame de sangue', 'exame de urina', 'ultrassom', 'raio x agendado', 'eletrocardiograma',
      'oftalmologista', 'oculista', 'exame de vista', 'cardiologista', 'ortopedista agendado',
      'fisioterapia', 'dermatologista', 'ginecologista agendado', 'otorrino', 'neurologista',
      'especialista', 'especialidades', 'policlinica', 'encaminhamento',
      'marcar exame', 'agendar exame', 'resultado de exame', 'pedido de exame',
    ],
  },

  // 8. Saúde Mental e Apoio Psicológico
  {
    id: 'saude_mental',
    titulo: 'Saúde Mental e Acolhimento Psicológico',
    emoji: '🧠',
    nivel: 'rotina',
    badge: { label: 'Saúde Mental / Acolhimento', cor: 'bg-purple-600 text-white' },
    tiposAlvo: ['UBS', 'ESF'],
    explicacao:
      'Para apoio psicológico, ansiedade, depressão ou sofrimento emocional, a equipe da sua UBS faz o primeiro acolhimento e o encaminhamento ao CAPS (Centro de Atenção Psicossocial).',
    orientacao:
      'Em caso de crise psiquiátrica aguda com agitação ou risco, a UPA 24h e o SAMU (192) são os serviços de urgência recomendados.',
    alertaGrave: false,
    keywords: [
      'psicologo', 'psiquiatra', 'saude mental', 'ansiedade', 'depressao',
      'crise de panico', 'crise de ansiedade', 'apoio psicologico', 'caps',
      'tristeza profunda', 'sofrimento emocional', 'dependencia quimica', 'alcoolismo',
      'nao aguento mais', 'muito ansioso', 'muito ansiosa', 'preciso de ajuda psicologica',
      'terapia', 'acolhimento emocional',
    ],
  },

  // 9. Escolas e Educação Municipal
  {
    id: 'educacao',
    titulo: 'Educação / Escolas e Creches',
    emoji: '🎓',
    nivel: 'geral',
    badge: { label: 'Educação Municipal', cor: 'bg-purple-600 text-white' },
    tiposAlvo: ['Educação'],
    explicacao:
      'Para matrículas, creches, ensino infantil e fundamental da rede pública municipal de Votorantim.',
    orientacao: 'Consulte a escola mais próxima da sua residência ou a Secretaria de Educação.',
    alertaGrave: false,
    keywords: [
      'escola', 'creche', 'matricula', 'ensino infantil', 'ensino fundamental',
      'emef', 'emeief', 'cmei', 'colegio', 'estudo', 'vaga na creche',
      'matricula escolar', 'inscrever filho na escola', 'transferencia escolar', 'vaga na escola',
    ],
  },

  // 10. Lazer e Parques
  {
    id: 'lazer',
    titulo: 'Lazer e Parques ao Ar Livre',
    emoji: '🌳',
    nivel: 'geral',
    badge: { label: 'Lazer e Esportes', cor: 'bg-emerald-600 text-white' },
    tiposAlvo: ['Lazer'],
    explicacao:
      'Espaços públicos para caminhada, esportes, lazer em família e contato com a natureza.',
    orientacao: 'Aproveite os parques municipais abertos diariamente ao público.',
    alertaGrave: false,
    keywords: [
      'parque', 'caminhada', 'pista de caminhada', 'esporte', 'lazer', 'natureza',
      'passeio', 'pracinha', 'quadra', 'ar livre',
      'lugar para caminhar', 'lugar para correr', 'academia ao ar livre', 'praca',
    ],
  },

  // 11. Cultura e Eventos
  {
    id: 'cultura',
    titulo: 'Cultura, Museus e Turismo',
    emoji: '🎭',
    nivel: 'geral',
    badge: { label: 'Cultura e Turismo', cor: 'bg-pink-600 text-white' },
    tiposAlvo: ['Cultura'],
    explicacao:
      'Espaços de arte, turismo, apresentações, eventos culturais e memória histórica da cidade.',
    orientacao: 'Visite as atrações culturais e centros artísticos de Votorantim.',
    alertaGrave: false,
    keywords: [
      'cultura', 'teatro', 'museu', 'arte', 'apresentacao', 'evento cultural', 'turismo', 'auditorio',
      'ponto turistico', 'exposicao', 'espetaculo', 'show cultural',
    ],
  },

  // 12. Governo e Serviços Administrativos
  {
    id: 'governo',
    titulo: 'Prefeitura e Serviços Governamentais',
    emoji: '🏛️',
    nivel: 'geral',
    badge: { label: 'Administração Municipal', cor: 'bg-slate-600 text-white' },
    tiposAlvo: ['Governo'],
    explicacao:
      'Paço municipal, secretarias e atendimento ao cidadão para impostos, IPTU, certidões e protocolos.',
    orientacao: 'Atendimento nos dias úteis no Paço Municipal e secretarias competentes.',
    alertaGrave: false,
    keywords: [
      'prefeitura', 'governo', 'iptu', 'tributos', 'imposto', 'certidao', 'protocolo',
      'secretaria', 'camara municipal', 'paco municipal',
      'nota fiscal', 'alvara', 'atendimento ao cidadao', 'segunda via', 'declaracao',
    ],
  },

  // 13. Biblioteca Pública
  {
    id: 'biblioteca',
    titulo: 'Biblioteca Pública Municipal',
    emoji: '📚',
    nivel: 'geral',
    badge: { label: 'Biblioteca Municipal', cor: 'bg-cyan-600 text-white' },
    tiposAlvo: ['Biblioteca'],
    explicacao:
      'Empréstimo de livros, acervo literário, espaço para estudos e pesquisas acadêmicas.',
    orientacao: 'Acesso público e gratuito a toda a comunidade de Votorantim.',
    alertaGrave: false,
    keywords: [
      'biblioteca', 'livro', 'livros', 'leitura', 'estudos', 'pesquisa escolar',
      'emprestimo de livro', 'lugar para estudar', 'sala de estudos', 'acervo',
    ],
  },
];

/**
 * Classifica a intenção digitada pelo usuário e retorna a melhor recomendação de serviço.
 */
export function classificarIntencao(textoUsuario) {
  if (!textoUsuario || typeof textoUsuario !== 'string') return null;

  const textoNorm = normalizeText(textoUsuario);
  if (textoNorm.length < 3) return null;

  // Palavras do texto digitado, usadas na comparação com tolerância a erro
  // de digitação (fuzzy matching) quando não há correspondência exata.
  // Palavras comuns do dia a dia (preposições, pronomes etc.) são excluídas
  // para não colidirem por acaso com termos técnicos parecidos.
  const palavrasUsuario = textoNorm
    .split(/\s+/)
    .filter(p => p.length > 0 && !PALAVRAS_COMUNS_IGNORADAS_NO_FUZZY.has(p));

  let melhorIntencao = null;
  let maiorPontuacao = 0;

  for (const intencao of INTENCOES) {
    let score = 0;

    for (const kw of intencao.keywords) {
      const kwNorm = normalizeText(kw);

      // Correspondência exata da frase/termo
      if (textoNorm === kwNorm) {
        score += 25;
      }
      // O termo completo está contido no texto. Para keywords de uma única
      // palavra, exige fronteira de palavra (\b) em vez de substring solta,
      // para que termos curtos (ex: "pe") não batam dentro de outra palavra
      // maior que só contém aquelas letras por coincidência (ex: "perto").
      else if (
        kwNorm.includes(' ')
          ? textoNorm.includes(kwNorm)
          : new RegExp(`(^|[^a-z0-9])${kwNorm}([^a-z0-9]|$)`).test(textoNorm)
      ) {
        // Frases mais longas (ex: "dor no peito", "bateu a cabeca") têm peso maior
        score += kwNorm.includes(' ') ? 15 : 8;
      }
      // Palavras individuais presentes (correspondência exata)
      else {
        const palavrasKw = kwNorm.split(' ');
        const todasPresentes = palavrasKw.every(p => p.length > 2 && textoNorm.includes(p));
        if (todasPresentes) {
          score += 10;
        }
        // Tolerância a erro de digitação: só tenta quando a correspondência
        // exata falhou. Cada palavra da keyword precisa ter alguma palavra
        // "parecida" (poucos caracteres de diferença) no texto do usuário.
        else {
          const todasSemelhantes = palavrasKw.every(
            p => p.length > 3 && palavrasUsuario.some(pu => palavrasSemelhantes(pu, p))
          );
          if (todasSemelhantes) {
            // Peso um pouco menor que a correspondência exata equivalente
            // (8 para termo único, 10 para frase), mas ainda suficiente para
            // sozinho ultrapassar a pontuação mínima de 8 quando for um
            // termo único digitado com erro.
            score += palavrasKw.length === 1 ? 8 : 9;
          }
        }
      }
    }

    if (score > maiorPontuacao) {
      maiorPontuacao = score;
      melhorIntencao = intencao;
    }
  }

  // Pontuação mínima para considerar uma correspondência válida
  if (maiorPontuacao >= 8 && melhorIntencao) {
    return {
      matched: true,
      score: maiorPontuacao,
      ...melhorIntencao,
    };
  }

  return {
    matched: false,
  };
}