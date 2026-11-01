function escaparCelula(valor) {
    if (valor === null || valor === undefined) return '';
    const texto = Array.isArray(valor) ? valor.join(' | ') : String(valor);
    if (/[",\n\r]/.test(texto)) {
        return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
}

function formatarData(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('pt-BR');
    } catch {
        return iso;
    }
}

export function gerarCsv(linhas, colunas) {
    const cabecalho = colunas.map((c) => escaparCelula(c.titulo)).join(',');
    const corpo = (linhas || []).map((linha) =>
        colunas
            .map((c) => escaparCelula(typeof c.valor === 'function' ? c.valor(linha) : linha[c.campo]))
            .join(',')
    );

    return '﻿' + [cabecalho, ...corpo].join('\r\n');
}

export function csvUnidades(unidades) {
    return gerarCsv(unidades, [
        { titulo: 'Nome', campo: 'nome' },
        { titulo: 'Categoria', campo: 'categoria' },
        { titulo: 'Endereco', campo: 'endereco' },
        { titulo: 'Latitude', campo: 'lat' },
        { titulo: 'Longitude', campo: 'lng' },
        { titulo: 'Telefone', campo: 'telefone' },
        { titulo: 'Qtd Imagens', valor: (u) => (u.imagens || []).length },
        { titulo: 'URLs das Imagens', valor: (u) => u.imagens || [] },
        { titulo: 'Criado em', valor: (u) => formatarData(u.criado_em) },
    ]);
}

export function csvEventos(eventos) {
    return gerarCsv(eventos, [
        { titulo: 'Titulo', campo: 'titulo' },
        { titulo: 'Tipo', campo: 'tipo' },
        { titulo: 'Descricao', campo: 'descricao' },
        { titulo: 'Data do evento', campo: 'data_evento' },
        { titulo: 'Local', campo: 'local_evento' },
        { titulo: 'Agendado para publicar em', valor: (e) => formatarData(e.publicar_em) },
        { titulo: 'Qtd Imagens', valor: (e) => (e.imagens || []).length },
        { titulo: 'Criado em', valor: (e) => formatarData(e.criado_em) },
    ]);
}

export function csvNoticias(noticias) {
    return gerarCsv(noticias, [
        { titulo: 'Titulo', campo: 'titulo' },
        { titulo: 'Resumo', campo: 'resumo' },
        { titulo: 'Destaque', valor: (n) => (n.destaque ? 'Sim' : 'Nao') },
        { titulo: 'Qtd Imagens', valor: (n) => (n.imagens || []).length },
        { titulo: 'Criado em', valor: (n) => formatarData(n.criado_em) },
    ]);
}

export function csvCorrecoes(correcoes) {
    return gerarCsv(correcoes, [
        { titulo: 'Unidade', campo: 'unidade_nome' },
        { titulo: 'Campo reportado', campo: 'campo' },
        { titulo: 'Descricao', campo: 'descricao' },
        { titulo: 'Status', campo: 'status' },
        { titulo: 'Criado em', valor: (c) => formatarData(c.criado_em) },
        { titulo: 'Moderado em', valor: (c) => formatarData(c.moderado_em) },
    ]);
}

export function csvAuditoria(auditoria) {
    return gerarCsv(auditoria, [
        { titulo: 'Usuario', campo: 'usuario_email' },
        { titulo: 'Acao', campo: 'acao' },
        { titulo: 'Entidade', campo: 'entidade' },
        { titulo: 'Item', campo: 'entidade_titulo' },
        { titulo: 'Quando', valor: (a) => formatarData(a.criado_em) },
    ]);
}

export function baixarCsv(nomeArquivo, conteudoCsv) {
    const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function nomeArquivoComData(prefixo) {
    const hoje = new Date().toISOString().slice(0, 10);
    return `${prefixo}_${hoje}.csv`;
}