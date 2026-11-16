import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { Building2, MapPin, Layers, PieChart } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AccessibilityToolbar from '../components/AccessibilityToolbar';
import { registrarPaginaVista } from '../lib/metricas';

// Página pública "Equipamentos": visão consolidada de todos os equipamentos
// (unidades de saúde, educação, cultura, governo, lazer, bibliotecas etc.)
// cadastrados no mapa — mapa com todos os marcadores de uma vez (sem o
// painel de busca/intenção da Home) + estatísticas de quantos equipamentos
// existem no total e por categoria, com uma visualização dedicada (barras).
// Reaproveita a mesma classificação de tipo/cor usada em Map.jsx, duplicada
// aqui de propósito para manter esta página independente e simples de ler.

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const EMOJI_POR_TIPO = {
    UBS: { color: '#2563eb', emoji: '🏥' },
    ESF: { color: '#059669', emoji: '💚' },
    Hospital: { color: '#dc2626', emoji: '🏨' },
    UPA: { color: '#f59e0b', emoji: '🚑' },
    Educação: { color: '#7c3aed', emoji: '🎓' },
    Cultura: { color: '#db2777', emoji: '🎭' },
    Governo: { color: '#475569', emoji: '🏛️' },
    Lazer: { color: '#16a34a', emoji: '🌳' },
    Biblioteca: { color: '#0891b2', emoji: '📚' },
};

const iconCache = {};
function createCustomIcon(color, emoji) {
    const chave = `${color}|${emoji}`;
    if (iconCache[chave]) return iconCache[chave];
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
      width: 30px; height: 30px;
      background: ${color};
      border-radius: 50% 50% 50% 4px;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 8px rgba(0,0,0,0.25);
      border: 2px solid white;
    "><span style="transform: rotate(45deg); font-size: 13px;">${emoji}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
    });
    iconCache[chave] = icon;
    return icon;
}

function getUnitType(unidade) {
    const categoria = unidade.categoria || 'Saúde';
    if (categoria !== 'Saúde') {
        return (
            {
                Educação: { label: 'Educação', cor: '#7c3aed' },
                Cultura: { label: 'Cultura', cor: '#db2777' },
                Governo: { label: 'Governo', cor: '#475569' },
                Lazer: { label: 'Lazer', cor: '#16a34a' },
                Biblioteca: { label: 'Biblioteca', cor: '#0891b2' },
            }[categoria] || { label: categoria, cor: '#475569' }
        );
    }
    const n = (unidade.nome || '').toLowerCase();
    if (n.includes('hospital')) return { label: 'Hospital', cor: '#dc2626' };
    if (n.includes('upa')) return { label: 'UPA', cor: '#f59e0b' };
    if (n.includes('esf')) return { label: 'ESF', cor: '#059669' };
    return { label: 'UBS', cor: '#2563eb' };
}

function getUnitIcon(unidade) {
    const { label } = getUnitType(unidade);
    const { color, emoji } = EMOJI_POR_TIPO[label] || EMOJI_POR_TIPO.Governo;
    return createCustomIcon(color, emoji);
}

const CENTRO_VOTORANTIM = [-23.545, -47.44];

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILE_URL = CARTO_API_KEY
    ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = CARTO_API_KEY
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function EquipamentosSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
            <div className="h-8 w-64 rounded-lg animate-shimmer mb-3" />
            <div className="h-4 w-96 rounded-lg animate-shimmer mb-8" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-2xl animate-shimmer" />
                ))}
            </div>
            <div className="h-[420px] rounded-2xl animate-shimmer" />
        </div>
    );
}

export default function Equipamentos() {
    const [unidades, setUnidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');

    useEffect(() => {
        async function fetchUnidades() {
            const { data, error: err } = await supabase.from('unidades').select('*');
            if (err) {
                console.error('Erro ao buscar equipamentos', err);
                setError('Não foi possível carregar os equipamentos agora. Tente novamente em alguns minutos.');
            } else {
                setUnidades(data || []);
            }
            setLoading(false);
        }
        fetchUnidades();
        registrarPaginaVista('/equipamentos');
    }, []);

    const porCategoria = useMemo(() => {
        const contagem = {};
        unidades.forEach((u) => {
            const { label, cor } = getUnitType(u);
            if (!contagem[label]) contagem[label] = { label, cor, total: 0 };
            contagem[label].total += 1;
        });
        return Object.values(contagem).sort((a, b) => b.total - a.total);
    }, [unidades]);

    const total = unidades.length;
    const maiorCategoria = porCategoria[0]?.total || 1;

    const unidadesFiltradas = useMemo(() => {
        if (categoriaAtiva === 'Todas') return unidades;
        return unidades.filter((u) => getUnitType(u).label === categoriaAtiva);
    }, [unidades, categoriaAtiva]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Navbar />
            <AccessibilityToolbar />

            {loading ? (
                <EquipamentosSkeleton />
            ) : (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md flex-shrink-0">
                            <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                                Equipamentos de Votorantim
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Todas as unidades de saúde, educação, cultura, lazer e governo cadastradas no mapa.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-6 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-300 text-sm font-medium rounded-xl p-4">
                            {error}
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{total}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Equipamentos no total</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{porCategoria.length}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Categorias diferentes</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">{porCategoria[0]?.total ?? 0}</p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                                Maior categoria{porCategoria[0] ? ` · ${porCategoria[0].label}` : ''}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                                {unidades.filter((u) => (u.categoria || 'Saúde') === 'Saúde').length}
                            </p>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Unidades de saúde</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 mt-6 items-start">
                        {/* Mapa com todos os equipamentos */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between gap-3 p-5 pb-0">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-indigo-500" />
                                    <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Mapa de equipamentos</h2>
                                </div>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                    {unidadesFiltradas.length} no mapa
                                </span>
                            </div>
                            <div className="h-[420px] mt-4">
                                <MapContainer center={CENTRO_VOTORANTIM} zoom={13} scrollWheelZoom className="h-full w-full">
                                    <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                                    {unidadesFiltradas
                                        .filter((u) => u.lat && u.lng)
                                        .map((u) => (
                                            <Marker key={u.id} position={[u.lat, u.lng]} icon={getUnitIcon(u)}>
                                                <Popup>
                                                    <p className="font-bold text-sm">{u.nome}</p>
                                                    <p className="text-xs text-slate-500">{getUnitType(u).label}</p>
                                                    {u.endereco && <p className="text-xs mt-1">{u.endereco}</p>}
                                                </Popup>
                                            </Marker>
                                        ))}
                                </MapContainer>
                            </div>
                        </div>

                        {/* Estatísticas por categoria */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-5">
                                <PieChart size={16} className="text-indigo-500" />
                                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Por categoria</h2>
                            </div>

                            {porCategoria.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-10">Nenhum equipamento cadastrado ainda.</p>
                            ) : (
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => setCategoriaAtiva('Todas')}
                                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${categoriaAtiva === 'Todas'
                                            ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <Layers size={14} />
                                            Todas as categorias
                                        </span>
                                        <span>{total}</span>
                                    </button>

                                    {porCategoria.map((cat) => {
                                        const pct = Math.round((cat.total / maiorCategoria) * 100);
                                        const ativa = categoriaAtiva === cat.label;
                                        return (
                                            <button
                                                key={cat.label}
                                                type="button"
                                                onClick={() => setCategoriaAtiva(ativa ? 'Todas' : cat.label)}
                                                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${ativa ? 'bg-slate-50 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-3 mb-1.5">
                                                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.cor }} />
                                                        {cat.label}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{cat.total}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{ width: `${pct}%`, backgroundColor: cat.cor }}
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            )}

            <Footer />
        </div>
    );
}