import { supabase } from './supabase';

async function registrar(evento) {
    try {
        await supabase.from('metricas_uso').insert([evento]);
    } catch {
    }
}

export function registrarVisualizacaoUnidade(unidade) {
    if (!unidade) return;
    registrar({
        tipo: 'visualizar_unidade',
        unidade_id: unidade.id,
        unidade_nome: unidade.nome,
        categoria: unidade.categoria || null,
    });
}

export function registrarFiltroCategoria(categoria) {
    if (!categoria) return;
    registrar({ tipo: 'filtro_categoria', categoria });
}

export function registrarPaginaVista(pagina) {
    registrar({ tipo: 'pagina_vista', pagina });
}

// Só é chamado quando o cidadão já clicou em "Localizar-me" (ou seja, já deu
// permissão de geolocalização pra esse recurso, que é anterior a esse
// painel). Converte a coordenada em nome de bairro usando reverse geocoding
// da Nominatim/OpenStreetMap — tudo no navegador do cidadão — e manda só o
// nome do bairro pro banco. A coordenada em si nunca é enviada.
export async function registrarBairroPorCoordenada(lat, lng) {
    if (lat == null || lng == null) return;
    try {
        const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
        );
        if (!resp.ok) return;
        const data = await resp.json();
        const bairro =
            data?.address?.suburb ||
            data?.address?.neighbourhood ||
            data?.address?.city_district ||
            data?.address?.town ||
            data?.address?.village ||
            null;
        if (bairro) {
            await registrar({ tipo: 'bairro_acesso', bairro });
        }
    } catch {
    }
}