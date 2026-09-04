// Importação em massa de unidades de saúde a partir de um arquivo CSV.
//
// Por quê CSV (e não .xlsx diretamente): a biblioteca mais usada para ler .xlsx
// no navegador (SheetJS/"xlsx" no npm) tem vulnerabilidades conhecidas sem correção
// disponível na versão distribuída pelo registro do npm. Para não introduzir esse
// risco, o admin exporta a planilha como CSV primeiro (Excel/Google Sheets:
// "Salvar como" / "Fazer download" → CSV) e importa o CSV aqui.
//
// O parser é tolerante ao formato comum de planilhas brasileiras: aceita tanto
// vírgula quanto ponto-e-vírgula como separador de coluna, e reconhece uma coluna
// "Coordenada" combinada (ex.: "-23.54, -47.44"), formato usado na planilha oficial
// de equipamentos da Prefeitura de Votorantim.

function detectarSeparador(linhaCabecalho) {
  const virgulas = (linhaCabecalho.match(/,/g) || []).length;
  const pontoEVirgulas = (linhaCabecalho.match(/;/g) || []).length;
  return pontoEVirgulas > virgulas ? ';' : ',';
}

// Parser CSV simples com suporte a campos entre aspas (RFC 4180 básico).
function parseLinhaCsv(linha, separador) {
  const resultado = [];
  let atual = '';
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (linha[i + 1] === '"') { atual += '"'; i++; }
        else dentroDeAspas = false;
      } else {
        atual += c;
      }
    } else if (c === '"') {
      dentroDeAspas = true;
    } else if (c === separador) {
      resultado.push(atual);
      atual = '';
    } else {
      atual += c;
    }
  }
  resultado.push(atual);
  return resultado;
}

// Converte o texto bruto do arquivo CSV em uma matriz de células (linhas x colunas).
export function parseCsvTexto(texto) {
  const semBom = texto.replace(/^\uFEFF/, ''); // remove BOM do UTF-8, comum em CSV exportado pelo Excel
  const linhas = semBom.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
  if (linhas.length === 0) return [];
  const separador = detectarSeparador(linhas[0]);
  return linhas.map(l => parseLinhaCsv(l, separador));
}

function normalizarCabecalho(h) {
  return (h || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const ALIASES_COLUNA = {
  nome: ['nome', 'local', 'unidade', 'nome da unidade', 'nome unidade'],
  endereco: ['endereco', 'address', 'logradouro', 'endereco completo'],
  categoria: ['categoria', 'categoria do local', 'tipo de local', 'area'],
  telefone: ['telefone', 'fone', 'tel', 'phone', 'contato'],
  lat: ['lat', 'latitude'],
  lng: ['lng', 'lon', 'long', 'longitude'],
  coordenada: ['coordenada', 'coordenadas', 'coords', 'coordinate', 'coordinates'],
};

// Categorias de local público reconhecidas pelo sistema (ver também setup_database.sql
// e Map.jsx). "Saúde" é o padrão para manter compatibilidade com planilhas antigas,
// que só cadastravam unidades de saúde e não tinham essa coluna.
export const CATEGORIAS_VALIDAS = ['Saúde', 'Educação', 'Cultura', 'Governo', 'Lazer', 'Biblioteca'];

function normalizarCategoria(bruta) {
  const c = (bruta || '').toString().trim();
  if (!c) return 'Saúde';
  const encontrada = CATEGORIAS_VALIDAS.find(v => v.toLowerCase() === c.toLowerCase());
  return encontrada || c; // mantém o valor original se não reconhecido, para o admin revisar
}

function detectarColunas(linhaCabecalho) {
  const normalizadas = linhaCabecalho.map(normalizarCabecalho);
  const colunas = {};
  for (const [campo, aliases] of Object.entries(ALIASES_COLUNA)) {
    const idx = normalizadas.findIndex(h => aliases.includes(h));
    if (idx !== -1) colunas[campo] = idx;
  }
  return colunas;
}

// Detecta o tipo de unidade (mesma lógica usada no mapa público, Map.jsx) a partir do nome.
export function detectarTipo(nome) {
  const n = (nome || '').toLowerCase();
  if (n.includes('hospital')) return 'Hospital';
  if (n.includes('upa')) return 'UPA';
  if (n.includes('esf')) return 'ESF';
  return 'UBS';
}

// Faixa aproximada de coordenadas válidas para a região de Votorantim/Sorocaba-SP,
// só para pegar erro grosseiro (ex.: latitude/longitude trocadas ou fora do Brasil).
const LAT_MIN = -24.5, LAT_MAX = -22.5;
const LNG_MIN = -48.5, LNG_MAX = -46.5;

// Recebe a matriz (primeira linha = cabeçalho) e devolve uma linha por unidade,
// já validada, pronta para exibir em uma tabela de pré-visualização.
export function construirLinhasImportacao(matriz) {
  if (!matriz || matriz.length < 2) return [];
  const [cabecalho, ...linhasDeDados] = matriz;
  const colunas = detectarColunas(cabecalho);

  return linhasDeDados
    .filter(linha => linha.some(cel => (cel ?? '').toString().trim() !== ''))
    .map((linha, i) => {
      const celula = (idx) => (idx !== undefined ? (linha[idx] ?? '').toString().trim() : '');

      const nomeOriginal = celula(colunas.nome);
      const endereco = celula(colunas.endereco);
      const telefoneBruto = celula(colunas.telefone);
      const categoria = normalizarCategoria(celula(colunas.categoria));

      let lat = null;
      let lng = null;
      if (colunas.lat !== undefined && colunas.lng !== undefined) {
        lat = parseFloat(celula(colunas.lat));
        lng = parseFloat(celula(colunas.lng));
      } else if (colunas.coordenada !== undefined) {
        const bruto = celula(colunas.coordenada);
        const partes = bruto.split(',').map(s => parseFloat(s.trim()));
        if (partes.length === 2 && !Number.isNaN(partes[0]) && !Number.isNaN(partes[1])) {
          [lat, lng] = partes;
        }
      }
      if (Number.isNaN(lat)) lat = null;
      if (Number.isNaN(lng)) lng = null;

      // "PSF" é o nome antigo (pré-2006) da Estratégia Saúde da Família — normaliza
      // para "ESF" para que o marcador seja identificado corretamente no mapa público.
      let nome = nomeOriginal;
      if (/^psf\b/i.test(nome)) {
        nome = nome.replace(/^psf\b/i, 'ESF').trim();
      }

      const erros = [];
      if (!nome) erros.push('Nome ausente');
      if (!endereco) erros.push('Endereço ausente');
      if (lat === null || lng === null) {
        erros.push('Coordenadas ausentes ou não reconhecidas');
      } else {
        if (lat < LAT_MIN || lat > LAT_MAX) erros.push('Latitude fora da faixa esperada para a região');
        if (lng < LNG_MIN || lng > LNG_MAX) erros.push('Longitude fora da faixa esperada para a região');
      }
      if (!CATEGORIAS_VALIDAS.includes(categoria)) {
        erros.push(`Categoria "${categoria}" não reconhecida (use: ${CATEGORIAS_VALIDAS.join(', ')})`);
      }

      return {
        chave: `linha-${i}`,
        linhaPlanilha: i + 2, // +2: a linha 1 é o cabeçalho, e a contagem de planilha começa em 1
        nomeOriginal,
        nome,
        renomeado: nome !== nomeOriginal,
        endereco,
        categoria,
        telefone: telefoneBruto || null,
        lat,
        lng,
        // Só faz sentido sub-classificar em UBS/ESF/Hospital/UPA dentro da categoria Saúde;
        // para as demais categorias, o "tipo" exibido é a própria categoria.
        tipoDetectado: categoria === 'Saúde' ? detectarTipo(nome) : categoria,
        valido: erros.length === 0,
        erros,
      };
    });
}

export function gerarCsvModelo() {
  const linhas = [
    'Nome,Endereco,Categoria,Latitude,Longitude,Telefone',
    '"UBS Exemplo","Rua das Flores, 100 - Centro",Saúde,-23.5451,-47.4412,"(15) 3347-0000"',
    '"EMEF Exemplo","Rua das Palmeiras, 200 - Centro",Educação,-23.5461,-47.4422,',
  ];
  return linhas.join('\r\n');
}
