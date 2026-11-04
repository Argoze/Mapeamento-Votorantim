// Definições de coluna compartilhadas entre a exportação em planilha (XLSX,
// ver exportarPlanilha.js) de cada tabela do painel admin. Mantidas aqui,
// separadas da geração do arquivo em si, pra servirem de única fonte de
// verdade sobre "quais colunas cada exportação tem".

export function formatarData(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('pt-BR');
    } catch {
        return iso;
    }
}

export const COLUNAS_UNIDADES = [
    { titulo: 'Nome', campo: 'nome' },
    { titulo: 'Categoria', campo: 'categoria' },
    { titulo: 'Endereço', campo: 'endereco' },
    { titulo: 'Latitude', campo: 'lat' },
    { titulo: 'Longitude', campo: 'lng' },
    { titulo: 'Telefone', campo: 'telefone' },
    { titulo: 'Qtd. imagens', valor: (u) => (u.imagens || []).length },
    { titulo: 'URLs das imagens', valor: (u) => (u.imagens || []).join(' | ') },
    { titulo: 'Criado em', valor: (u) => formatarData(u.criado_em) },
];

export const COLUNAS_EVENTOS = [
    { titulo: 'Título', campo: 'titulo' },
    { titulo: 'Tipo', campo: 'tipo' },
    { titulo: 'Descrição', campo: 'descricao' },
    { titulo: 'Data do evento', campo: 'data_evento' },
    { titulo: 'Local', campo: 'local_evento' },
    { titulo: 'Status', campo: 'status' },
    { titulo: 'Agendado para publicar em', valor: (e) => formatarData(e.publicar_em) },
    { titulo: 'Qtd. imagens', valor: (e) => (e.imagens || []).length },
    { titulo: 'Criado em', valor: (e) => formatarData(e.criado_em) },
];

export const COLUNAS_NOTICIAS = [
    { titulo: 'Título', campo: 'titulo' },
    { titulo: 'Resumo', campo: 'resumo' },
    { titulo: 'Status', campo: 'status' },
    { titulo: 'Destaque', valor: (n) => (n.destaque ? 'Sim' : 'Não') },
    { titulo: 'Qtd. imagens', valor: (n) => (n.imagens || []).length },
    { titulo: 'Criado em', valor: (n) => formatarData(n.criado_em) },
];

export const COLUNAS_CORRECOES = [
    { titulo: 'Unidade', campo: 'unidade_nome' },
    { titulo: 'Campo reportado', campo: 'campo' },
    { titulo: 'Descrição', campo: 'descricao' },
    { titulo: 'Status', campo: 'status' },
    { titulo: 'Criado em', valor: (c) => formatarData(c.criado_em) },
    { titulo: 'Moderado em', valor: (c) => formatarData(c.moderado_em) },
];

export const COLUNAS_METRICAS = [
    { titulo: 'Tipo', campo: 'tipo' },
    { titulo: 'Unidade', campo: 'unidade_nome' },
    { titulo: 'Categoria', campo: 'categoria' },
    { titulo: 'Página', campo: 'pagina' },
    { titulo: 'Bairro', campo: 'bairro' },
    { titulo: 'Quando', valor: (m) => formatarData(m.criado_em) },
];

export const COLUNAS_AUDITORIA = [
    { titulo: 'Usuário', campo: 'usuario_email' },
    { titulo: 'Ação', campo: 'acao' },
    { titulo: 'Entidade', campo: 'entidade' },
    { titulo: 'Item', campo: 'entidade_titulo' },
    { titulo: 'Quando', valor: (a) => formatarData(a.criado_em) },
];