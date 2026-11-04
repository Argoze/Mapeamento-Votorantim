// Exportação de dados do painel admin como planilha XLSX formatada:
// cabeçalho em negrito com fundo colorido, colunas com largura automática,
// linha de cabeçalho congelada e filtro automático, zebrado nas linhas —
// bem mais legível que um CSV cru ao abrir no Excel/Google Sheets.
//
// A biblioteca exceljs só é carregada quando o admin realmente clica em
// exportar (import dinâmico), pra não pesar no bundle que o cidadão baixa
// ao visitar o site.

const COR_CABECALHO = 'FF4F46E5'; // indigo-600
const COR_BORDA_CABECALHO = 'FF3730A3'; // indigo-800
const COR_ZEBRA = 'FFF1F5F9'; // slate-100
const COR_BORDA_LINHA = 'FFE2E8F0'; // slate-200

function valorColuna(linha, coluna) {
    const bruto = typeof coluna.valor === 'function' ? coluna.valor(linha) : linha[coluna.campo];
    return bruto === null || bruto === undefined ? '' : bruto;
}

function larguraColuna(coluna, linhas) {
    const maiorConteudo = linhas.reduce((max, linha) => {
        const texto = String(valorColuna(linha, coluna));
        return Math.max(max, texto.length);
    }, coluna.titulo.length);
    return Math.min(Math.max(maiorConteudo + 2, 12), 60);
}

function montarAba(workbook, nomeAba, linhas, colunas) {
    const planilha = workbook.addWorksheet(nomeAba.slice(0, 31), {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    planilha.columns = colunas.map((c) => ({
        header: c.titulo,
        key: c.titulo,
        width: larguraColuna(c, linhas),
    }));

    for (const linha of linhas) {
        const obj = {};
        colunas.forEach((c) => {
            obj[c.titulo] = valorColuna(linha, c);
        });
        planilha.addRow(obj);
    }

    const cabecalho = planilha.getRow(1);
    cabecalho.height = 24;
    cabecalho.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_CABECALHO } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = { bottom: { style: 'medium', color: { argb: COR_BORDA_CABECALHO } } };
    });

    planilha.eachRow((row, numero) => {
        if (numero === 1) return;
        row.height = 19;
        row.eachCell((cell) => {
            cell.alignment = { vertical: 'middle' };
            cell.border = { bottom: { style: 'hair', color: { argb: COR_BORDA_LINHA } } };
            if (numero % 2 === 0) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_ZEBRA } };
            }
        });
    });

    if (linhas.length > 0) {
        planilha.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: colunas.length },
        };
    }

    return planilha;
}

async function baixarWorkbook(workbook, nomeArquivo) {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Exporta uma única tabela como planilha XLSX formatada.
 */
export async function baixarPlanilhaUnica(nomeArquivo, nomeAba, linhas, colunas) {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Saúde Votorantim';
    workbook.created = new Date();
    montarAba(workbook, nomeAba, linhas, colunas);
    await baixarWorkbook(workbook, nomeArquivo);
}

/**
 * Exporta várias tabelas de uma vez, cada uma em sua própria aba, num único
 * arquivo XLSX — usado pelo botão "Exportar todos os dados".
 */
export async function baixarPlanilhaCompleta(nomeArquivo, abas) {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Saúde Votorantim';
    workbook.created = new Date();
    for (const aba of abas) {
        montarAba(workbook, aba.nome, aba.linhas, aba.colunas);
    }
    await baixarWorkbook(workbook, nomeArquivo);
}

export function nomeArquivoXlsxComData(prefixo) {
    const hoje = new Date().toISOString().slice(0, 10);
    return `${prefixo}_${hoje}.xlsx`;
}