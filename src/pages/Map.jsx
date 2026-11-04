import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import {
  Building2,
  Filter,
  Heart,
  Info,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Newspaper,
  Navigation,
  ArrowRight,
  Clock,
  Calendar,
  Search,
  Syringe,
  Zap,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { MapSidebarSkeleton } from '../components/LoadingSkeleton';
import AccessibilityToolbar from '../components/AccessibilityToolbar';
import UnidadeDetalheModal from '../components/UnidadeDetalheModal';
import IntentionSearchPanel from '../components/IntentionSearchPanel';
import { registrarVisualizacaoUnidade, registrarFiltroCategoria, registrarPaginaVista, registrarBairroPorCoordenada } from '../lib/metricas';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createCustomIcon(color, emoji) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 36px; height: 36px;
      background: ${color};
      border-radius: 50% 50% 50% 4px;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      border: 2.5px solid white;
    "><span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function createSelectedIcon() {
  return L.divIcon({
    className: 'custom-marker-selecionado',
    html: `<div class="custom-marker-selecionado-pin">
      <svg width="40" height="54" viewBox="0 0 40 54" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
        <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 34 20 34s20-19 20-34C40 8.95 31.05 0 20 0z" fill="#EA4335"/>
        <circle cx="20" cy="20" r="7.5" fill="#ffffff"/>
      </svg>
    </div>`,
    iconSize: [40, 54],
    iconAnchor: [20, 54],
    popupAnchor: [0, -54],
  });
}

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

function getUnitIcon(unidade, selecionado = false) {
  if (selecionado) return createSelectedIcon();

  const categoria = unidade.categoria || 'Saúde';
  let tipo = categoria;
  if (categoria === 'Saúde') {
    const n = unidade.nome.toLowerCase();
    if (n.includes('hospital')) tipo = 'Hospital';
    else if (n.includes('upa')) tipo = 'UPA';
    else if (n.includes('esf')) tipo = 'ESF';
    else tipo = 'UBS';
  }
  const { color, emoji } = EMOJI_POR_TIPO[tipo] || EMOJI_POR_TIPO.Governo;
  return createCustomIcon(color, emoji);
}

function getUnitType(unidade) {
  const categoria = unidade.categoria || 'Saúde';
  if (categoria !== 'Saúde') {
    return (
      {
        Educação: { label: 'Educação', color: 'purple' },
        Cultura: { label: 'Cultura', color: 'pink' },
        Governo: { label: 'Governo', color: 'slate' },
        Lazer: { label: 'Lazer', color: 'emerald' },
        Biblioteca: { label: 'Biblioteca', color: 'cyan' },
      }[categoria] || { label: categoria, color: 'slate' }
    );
  }
  const n = unidade.nome.toLowerCase();
  if (n.includes('hospital')) return { label: 'Hospital', color: 'red' };
  if (n.includes('upa')) return { label: 'UPA', color: 'orange' };
  if (n.includes('esf')) return { label: 'ESF', color: 'green' };
  return { label: 'UBS', color: 'blue' };
}

function badgeClass(color) {
  const map = {
    red: 'bg-red-500',
    orange: 'bg-amber-500',
    green: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-600',
    pink: 'bg-pink-600',
    slate: 'bg-slate-600',
    emerald: 'bg-emerald-600',
    cyan: 'bg-cyan-600',
  };
  return map[color] || 'bg-blue-500';
}

// ---------- Fundo do mapa (tiles) ----------
const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILE_URL = CARTO_API_KEY
  ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const TILE_ATTRIBUTION = CARTO_API_KEY
  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// ---------- Favoritos (persistidos no navegador, sem exigir login do cidadão) ----------
const FAVORITOS_KEY = 'votorantim-saude-favoritos';

function loadFavoritos() {
  try {
    const raw = localStorage.getItem(FAVORITOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavoritos(ids) {
  try {
    localStorage.setItem(FAVORITOS_KEY, JSON.stringify(ids));
  } catch {
    // Modo privado/restrito: localStorage pode não estar disponível.
  }
}

// ---------- Filtros por tipo ----------
const FILTROS = [
  'Todos',
  'UBS',
  'ESF',
  'Hospital',
  'UPA',
  'Educação',
  'Cultura',
  'Governo',
  'Lazer',
  'Biblioteca',
  'Favoritos',
];

const LEGENDA_TIPOS = [
  {
    sigla: 'UBS',
    cor: 'blue',
    nome: 'Unidade Básica de Saúde',
    desc: 'Atendimento de rotina: consultas, vacinas e acompanhamento geral, sem hora marcada de urgência.',
  },
  {
    sigla: 'ESF',
    cor: 'green',
    nome: 'Estratégia Saúde da Família',
    desc: 'Equipe fixa que acompanha de perto as famílias de um bairro/território específico.',
  },
  {
    sigla: 'UPA',
    cor: 'orange',
    nome: 'Unidade de Pronto Atendimento',
    desc: 'Urgências que não são risco de vida (funciona 24 horas, inclusive noites e fins de semana).',
  },
  {
    sigla: 'Hospital',
    cor: 'red',
    nome: 'Hospital',
    desc: 'Internações e emergências mais graves com risco à vida e trabalho de parto.',
  },
  {
    sigla: 'Educação',
    cor: 'purple',
    nome: 'Educação',
    desc: 'Escolas e centros de educação infantil da rede municipal (EMEF, EMEIEF, CMEI).',
  },
  {
    sigla: 'Cultura',
    cor: 'pink',
    nome: 'Cultura',
    desc: 'Centros culturais, museus, auditórios e espaços de arte e turismo.',
  },
  {
    sigla: 'Governo',
    cor: 'slate',
    nome: 'Governo',
    desc: 'Prefeitura, câmara municipal e sedes de secretarias.',
  },
  {
    sigla: 'Lazer',
    cor: 'emerald',
    nome: 'Lazer',
    desc: 'Parques e áreas de lazer e esporte ao ar livre.',
  },
  {
    sigla: 'Biblioteca',
    cor: 'cyan',
    nome: 'Biblioteca',
    desc: 'Bibliotecas públicas municipais.',
  },
];

function buildWhatsAppShareUrl(unidade) {
  const rotaUrl = `https://www.google.com/maps/dir/?api=1&destination=${unidade.lat},${unidade.lng}`;
  const texto = `${unidade.nome}\n${unidade.endereco}\nComo chegar: ${rotaUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia(s)`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Componente auxiliar para ajustar o mapa
function MapController({ center, zoom, deslocarComPainel }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;

    if (deslocarComPainel && window.innerWidth >= 1024) {
      const zoomAtual = zoom || map.getZoom();
      const targetPoint = map.project(center, zoomAtual).subtract([160, 0]);
      const targetLatLng = map.unproject(targetPoint, zoomAtual);
      map.flyTo(targetLatLng, zoomAtual, { duration: 1.2, easeLinearity: 0.25 });
    } else {
      map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
    }
  }, [center, zoom, deslocarComPainel, map]);
  return null;
}

export default function Map() {
  const markerRefs = useRef({});
  const [unidades, setUnidades] = useState([]);
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState([-23.545, -47.44]);
  const [zoom, setZoom] = useState(13);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [unidadesProximas, setUnidadesProximas] = useState([]);
  const [noticias, setNoticias] = useState([]);
  const [eventosDestaque, setEventosDestaque] = useState([]);

  // Busca Inteligente por Intenção (sintomas, necessidades, linguagem leiga)
  const [intencaoTexto, setIntencaoTexto] = useState('');
  const [intencaoAtiva, setIntencaoAtiva] = useState(null);

  // Filtro por tipo/favoritos
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [favoritos, setFavoritos] = useState(loadFavoritos);
  const [showLegenda, setShowLegenda] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);

  useEffect(() => {
    async function fetchUnidades() {
      const { data, error } = await supabase.from('unidades').select('*');
      if (error) {
        console.error('Erro ao buscar unidades', error);
      } else {
        setUnidades(data || []);
      }
      setDataLoading(false);
    }
    async function fetchNoticias() {
      const { data } = await supabase
        .from('noticias')
        .select('*')
        .eq('status', 'publicado')
        .order('criado_em', { ascending: false })
        .limit(10);
      if (data) setNoticias(data);
    }
    async function fetchEventosDestaque() {
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'publicado')
        .order('criado_em', { ascending: false })
        .limit(6);
      if (data) {
        const agora = Date.now();
        setEventosDestaque(
          data.filter((e) => !e.publicar_em || new Date(e.publicar_em).getTime() <= agora).slice(0, 3)
        );
      }
    }
    fetchUnidades();
    fetchNoticias();
    fetchEventosDestaque();
    registrarPaginaVista('/');
  }, []);

  const toggleFavorito = (id) => {
    setFavoritos((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      saveFavoritos(next);
      return next;
    });
  };

  const matchesFiltro = (unidade) => {
    if (tipoFiltro === 'Favoritos') return favoritos.includes(unidade.id);

    // Se houver intenção inteligente ativa, filtra pelos tipos recomendados
    if (intencaoAtiva && intencaoAtiva.matched && intencaoAtiva.tiposAlvo) {
      const tipoUnidade = getUnitType(unidade).label;
      if (!intencaoAtiva.tiposAlvo.includes(tipoUnidade)) return false;
    }

    if (tipoFiltro === 'Todos') return true;
    return getUnitType(unidade).label === tipoFiltro;
  };

  const unidadesFiltradas = unidades.filter(matchesFiltro);
  const unidadesProximasFiltradas = unidadesProximas.filter(matchesFiltro);

  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const focarUnidade = (unidade, zoomAlvo = 15, delay = 0) => {
    const abrir = () => {
      setCenter([unidade.lat, unidade.lng]);
      setZoom(zoomAlvo);
      setUnidadeSelecionada(unidade);
      registrarVisualizacaoUnidade(unidade);
    };
    if (delay > 0) setTimeout(abrir, delay);
    else abrir();
  };

  const handleSelectIntencao = (resultado, texto) => {
    setIntencaoTexto(texto);
    setIntencaoAtiva(resultado);

    if (resultado && resultado.matched) {
      // Se houver unidades recomendadas, foca na primeira/mais próxima
      const base = unidadesProximas.length > 0 ? unidadesProximas : unidades;
      const recomendadas = base.filter((u) =>
        resultado.tiposAlvo.includes(getUnitType(u).label)
      );
      if (recomendadas.length > 0) {
        focarUnidade(recomendadas[0], 15, 300);
      }
    }
  };

  const handleClearIntencao = () => {
    setIntencaoTexto('');
    setIntencaoAtiva(null);
  };

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError(null);

    let searchQuery = query.toLowerCase();
    if (!searchQuery.includes('votorantim')) {
      searchQuery += ', Votorantim - SP';
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const userLat = parseFloat(data[0].lat);
        const userLon = parseFloat(data[0].lon);

        setCenter([userLat, userLon]);
        setZoom(14);
        setUserLocation([userLat, userLon]);

        const unidadesComDistancia = unidades
          .map((u) => ({
            ...u,
            distancia: calcularDistancia(userLat, userLon, u.lat, u.lng),
          }))
          .sort((a, b) => a.distancia - b.distancia);

        setUnidadesProximas(unidadesComDistancia);

        const maisProxima = unidadesComDistancia.filter(matchesFiltro)[0];
        if (maisProxima) {
          focarUnidade(maisProxima, 15, 1200);
        }
      } else {
        setError(
          'Endereço não encontrado. Verifique se digitou corretamente (ex.: "Rua João Walter, Centro").'
        );
      }
    } catch (err) {
      setError(
        'Erro ao buscar o endereço. Verifique sua conexão com a internet e tente novamente.'
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError(
        'Seu navegador não suporta localização automática. Use a busca por endereço acima.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        setCenter([userLat, userLon]);
        setZoom(14);
        setQuery('Minha localização atual');
        setUserLocation([userLat, userLon]);
        registrarBairroPorCoordenada(userLat, userLon);

        if (unidades.length > 0) {
          const unidadesComDistancia = unidades
            .map((u) => ({
              ...u,
              distancia: calcularDistancia(userLat, userLon, u.lat, u.lng),
            }))
            .sort((a, b) => a.distancia - b.distancia);

          setUnidadesProximas(unidadesComDistancia);

          const maisProxima = unidadesComDistancia.filter(matchesFiltro)[0];
          if (maisProxima) {
            focarUnidade(maisProxima, 15, 1200);
          }
        }
        setLoading(false);
      },
      () => {
        setError(
          'Não foi possível obter sua localização automaticamente. Verifique se seu navegador tem permissão de localização ativada para este site (geralmente no ícone de cadeado ao lado do endereço) e tente novamente, ou use a busca por endereço acima.'
        );
        setLoading(false);
      }
    );
  };

  const contadorFiltro = (f) => {
    if (f === 'Todos') return unidades.length;
    if (f === 'Favoritos') return favoritos.length;
    return unidades.filter((u) => getUnitType(u).label === f).length;
  };

  const listaSidebar =
    unidadesProximas.length > 0
      ? unidadesProximasFiltradas
      : intencaoAtiva && intencaoAtiva.matched
        ? unidadesFiltradas
        : [];

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      <a href="#conteudo-principal" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Navbar />

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 pt-28 pb-14 sm:pt-32 sm:pb-16">
        <div className="absolute top-[-10%] right-[-5%] w-[380px] h-[380px] bg-indigo-200/30 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center">
            {/* Coluna da esquerda: texto + busca */}
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-4 py-1.5 rounded-full mb-5 animate-slide-down">
                <Megaphone size={13} /> Bem-vindo(a) a Votorantim!
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.05] mb-4 animate-slide-up">
                Sua cidade,<br className="hidden sm:block" />{' '}
                <span className="text-gradient">mais perto</span> de você.
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-7 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Diga o que você precisa ou informe seu endereço. A gente mostra a unidade de saúde (ou outro serviço público) ideal, em segundos.
              </p>

              <form
                onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                className="flex flex-col sm:flex-row items-stretch gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-lg shadow-indigo-900/5 max-w-xl mx-auto lg:mx-0 mb-3 animate-slide-up"
                style={{ animationDelay: '0.15s' }}
              >
                <div className="flex items-center gap-2 flex-1 px-3">
                  <Search size={18} className="text-slate-400 flex-shrink-0" />
                  <label htmlFor="busca-endereco-hero" className="sr-only">Buscar por endereço, bairro ou CEP</label>
                  <input
                    id="busca-endereco-hero"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Digite seu endereço, bairro ou CEP..."
                    className="w-full py-2.5 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm transition-colors flex-shrink-0"
                >
                  {loading ? 'Buscando...' : 'Buscar'}
                </button>
              </form>
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-3 max-w-xl mx-auto lg:mx-0">{error}</p>
              )}

              <div className="flex flex-wrap justify-center lg:justify-start gap-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                {[
                  { label: 'Vacinação', icon: Syringe, to: '/eventos' },
                  { label: 'UBS', icon: Building2, onClick: () => { setTipoFiltro('UBS'); document.getElementById('busca-unidades')?.scrollIntoView({ behavior: 'smooth' }); } },
                  { label: 'Eventos', icon: Megaphone, to: '/eventos' },
                  { label: 'Notícias', icon: Newspaper, to: '/noticias' },
                  { label: 'Equipamentos próximos', icon: Navigation, onClick: handleGeolocation },
                ].map((chip) => {
                  const Icon = chip.icon;
                  const conteudo = (
                    <>
                      <Icon size={14} /> {chip.label}
                    </>
                  );
                  const cls = 'inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-full hover:border-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors';
                  return chip.to ? (
                    <Link key={chip.label} to={chip.to} className={cls}>{conteudo}</Link>
                  ) : (
                    <button key={chip.label} type="button" onClick={chip.onClick} className={cls}>{conteudo}</button>
                  );
                })}
              </div>
            </div>

            {/* Coluna da direita: ilustração (sem foto real do município — composição gráfica própria) */}
            <div className="relative hidden lg:block animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="relative rounded-[2.5rem] rounded-bl-none overflow-hidden aspect-[4/3] bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 shadow-2xl">
                <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
                  <circle cx="320" cy="60" r="38" fill="white" fillOpacity="0.15" />
                  <rect x="40" y="140" width="46" height="130" fill="white" fillOpacity="0.18" rx="4" />
                  <rect x="96" y="100" width="54" height="170" fill="white" fillOpacity="0.25" rx="4" />
                  <rect x="160" y="160" width="40" height="110" fill="white" fillOpacity="0.15" rx="4" />
                  <rect x="210" y="80" width="58" height="190" fill="white" fillOpacity="0.3" rx="4" />
                  <rect x="278" y="130" width="48" height="140" fill="white" fillOpacity="0.2" rx="4" />
                  <rect x="334" y="170" width="40" height="100" fill="white" fillOpacity="0.15" rx="4" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-24 w-24 rounded-3xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl animate-float">
                    <Heart className="h-11 w-11 text-indigo-600" fill="currentColor" />
                  </div>
                </div>
                <div className="absolute bottom-5 left-5 right-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl p-3.5 shadow-lg flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">UBS Vila Garcia</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">a 850m de você</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main id="conteudo-principal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 relative z-10">


        {/* Acesso rápido + Vacinação em dia */}
        <div className="grid lg:grid-cols-3 gap-5 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Zap size={16} />
              </div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Acesso rápido</h2>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">O que você precisa, em poucos cliques</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: 'Campanhas de Vacinação', icon: Syringe, to: '/eventos' },
                { label: 'Eventos na Cidade', icon: Megaphone, to: '/eventos' },
                { label: 'Notícias', icon: Newspaper, to: '/noticias' },
                { label: 'Buscar Equipamentos', icon: Building2, onClick: () => document.getElementById('busca-unidades')?.scrollIntoView({ behavior: 'smooth' }) },
                { label: 'Agendar Atendimento', icon: Calendar, onClick: () => { setTipoFiltro('UBS'); document.getElementById('busca-unidades')?.scrollIntoView({ behavior: 'smooth' }); } },
                { label: 'Cuidados com a Saúde', icon: Heart, to: '/noticias' },
              ].map((item) => {
                const Icon = item.icon;
                const conteudo = (
                  <>
                    <div className="h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Icon size={18} />
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">{item.label}</span>
                  </>
                );
                const className = 'group flex flex-col items-center gap-2 rounded-2xl p-2 hover:-translate-y-0.5 transition-all';
                return item.to ? (
                  <Link key={item.label} to={item.to} className={className}>{conteudo}</Link>
                ) : (
                  <button key={item.label} type="button" onClick={item.onClick} className={className}>{conteudo}</button>
                );
              })}
            </div>
          </div>

          {/* Vacinação em dia */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-indigo-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between text-white">
            <div className="absolute -right-8 -bottom-8 h-36 w-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                <Syringe size={18} />
              </div>
              <h3 className="text-lg font-extrabold mb-1">Vacinação em dia!</h3>
              <p className="text-indigo-100 text-sm mb-5">Confira o calendário de vacinação e as campanhas ativas na cidade.</p>
            </div>
            <Link
              to="/eventos"
              className="relative inline-flex items-center gap-1.5 bg-white text-indigo-700 font-bold text-sm px-4 py-2 rounded-xl w-fit hover:shadow-md transition-shadow"
            >
              Saiba mais <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Painel Inteligente: Busca por Intenção (sintomas/necessidades) — seção
            própria, separada da busca por endereço (que já fica no hero). */}
        <IntentionSearchPanel
          intencaoTexto={intencaoTexto}
          setIntencaoTexto={setIntencaoTexto}
          intencaoAtiva={intencaoAtiva}
          onSelectIntencao={handleSelectIntencao}
          onClearIntencao={handleClearIntencao}
          totalRecomendadas={unidadesFiltradas.length}
        />

        {/* Filtros por tipo + legenda de siglas */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
            {FILTROS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setTipoFiltro(f);
                  if (f !== 'Favoritos') registrarFiltroCategoria(f);
                }}
                aria-pressed={tipoFiltro === f}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${tipoFiltro === f
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800'
                  }`}
              >
                {f === 'Favoritos' && (
                  <Heart size={13} className={tipoFiltro === f ? 'fill-white' : ''} />
                )}
                {f} ({contadorFiltro(f)})
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowLegenda((v) => !v)}
              aria-expanded={showLegenda}
              aria-controls="legenda-siglas"
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-colors px-2 py-2"
            >
              <Info size={14} />
              O que significa cada sigla?
              {showLegenda ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showLegenda && (
            <div
              id="legenda-siglas"
              className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 animate-slide-down"
            >
              {LEGENDA_TIPOS.map((item) => (
                <div key={item.sigla} className="flex items-start gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white mt-0.5 flex-shrink-0 ${badgeClass(
                      item.cor
                    )}`}
                  >
                    {item.sigla}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.nome}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map + Sidebar */}
        <div
          id="busca-unidades"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in scroll-mt-24"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="lg:col-span-2 glass-panel p-2 rounded-2xl shadow-lg border border-white/50 relative">
            <MapContainer
              center={center}
              zoom={zoom}
              style={{ height: '560px', width: '100%', borderRadius: '16px' }}
            >
              <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
              <MapController center={center} zoom={zoom} deslocarComPainel={!!unidadeSelecionada} />

              {userLocation && (
                <CircleMarker
                  center={userLocation}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.4,
                    weight: 3,
                  }}
                  radius={12}
                >
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold text-blue-700 text-sm">📍 Você está aqui</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {unidadesFiltradas.map((unidade) => {
                const isSelecionada = unidadeSelecionada?.id === unidade.id;
                return (
                  <Marker
                    key={unidade.id}
                    position={[unidade.lat, unidade.lng]}
                    icon={getUnitIcon(unidade, isSelecionada)}
                    zIndexOffset={isSelecionada ? 1000 : 0}
                    ref={(el) => {
                      if (el) {
                        markerRefs.current[unidade.id] = el;
                      }
                    }}
                    eventHandlers={{
                      click: () => focarUnidade(unidade, 16, 0),
                    }}
                  />
                );
              })}
            </MapContainer>

            <UnidadeDetalheModal
              unidade={unidadeSelecionada}
              tipoInfo={
                unidadeSelecionada
                  ? getUnitType(unidadeSelecionada)
                  : { label: '', color: 'blue' }
              }
              badgeClass={badgeClass}
              isFavorito={
                unidadeSelecionada ? favoritos.includes(unidadeSelecionada.id) : false
              }
              onToggleFavorito={toggleFavorito}
              buildWhatsAppShareUrl={buildWhatsAppShareUrl}
              onClose={() => setUnidadeSelecionada(null)}
            />
          </div>

          {/* Sidebar */}
          <div className="glass-panel p-5 rounded-2xl shadow-lg border border-white/50 lg:col-span-1 h-[576px] flex flex-col">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <Building2 size={18} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">
                  {intencaoAtiva && intencaoAtiva.matched
                    ? `Recomendadas (${listaSidebar.length})`
                    : 'Unidades mais próximas'}
                </span>
              </div>
              {intencaoAtiva && intencaoAtiva.matched && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex-shrink-0">
                  {intencaoAtiva.emoji} {intencaoAtiva.tiposAlvo.join('/')}
                </span>
              )}
            </h2>

            <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
              {dataLoading ? (
                <MapSidebarSkeleton />
              ) : listaSidebar.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="text-4xl mb-3 animate-float">🗺️</div>
                  <p className="text-slate-600 dark:text-slate-300 dark:text-slate-600 text-sm font-semibold mb-1">
                    {tipoFiltro !== 'Todos'
                      ? `Nenhuma unidade com o filtro "${tipoFiltro}".`
                      : 'Nenhuma unidade encontrada.'}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">
                    Digite o que precisa no campo acima ou informe seu endereço para ver as unidades mais próximas.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Dica de proximidade se o usuário ainda não buscou endereço */}
                  {unidadesProximas.length === 0 && intencaoAtiva && (
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 text-[11px] text-indigo-700 leading-snug">
                      💡 Digite seu endereço ou clique em <strong>Minha Localização</strong> para ordenar por distância.
                    </div>
                  )}

                  {listaSidebar.map((u, index) => {
                    const unitType = getUnitType(u);
                    const isFavorito = favoritos.includes(u.id);
                    const hasDistancia = u.distancia !== undefined;

                    return (
                      <div
                        key={u.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver ${u.nome} no mapa${hasDistancia
                          ? `, ${u.distancia < 1
                            ? `${(u.distancia * 1000).toFixed(0)} metros`
                            : `${u.distancia.toFixed(1)} quilômetros`
                          } de distância`
                          : ''
                          }`}
                        className={`p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer animate-slide-up stagger-${Math.min(
                          index + 1,
                          6
                        )}`}
                        onClick={() => focarUnidade(u, 16, 100)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            focarUnidade(u, 16, 100);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0 ${badgeClass(
                                unitType.color
                              )}`}
                            >
                              {unitType.label}
                            </span>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{u.nome}</h3>
                          </div>
                          {hasDistancia && (
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${index === 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 dark:text-slate-600'
                                }`}
                            >
                              {u.distancia < 1
                                ? `${(u.distancia * 1000).toFixed(0)}m`
                                : `${u.distancia.toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{u.endereco}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {hasDistancia && index === 0 ? (
                            <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✨ Mais próxima de você
                            </span>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorito(u.id);
                            }}
                            className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors flex-shrink-0"
                            title={isFavorito ? 'Remover dos favoritos' : 'Favoritar'}
                            aria-label={
                              isFavorito
                                ? `Remover ${u.nome} dos favoritos`
                                : `Favoritar ${u.nome}`
                            }
                            aria-pressed={isFavorito}
                          >
                            <Heart
                              size={16}
                              className={isFavorito ? 'fill-red-500 text-red-500' : ''}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notícias & Eventos em destaque */}
        {(noticias.length > 0 || eventosDestaque.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Notícias */}
            <div className="glass-panel rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                    <Newspaper size={16} />
                  </div>
                  Notícias
                </h2>
                <Link to="/noticias" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  Ver todas <ArrowRight size={13} />
                </Link>
              </div>
              {noticias.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">Nenhuma notícia publicada ainda.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {noticias.slice(0, 3).map((n) => (
                    <Link
                      key={n.id}
                      to="/noticias"
                      className="flex items-center gap-3 py-3 group first:pt-0 last:pb-0"
                    >
                      {n.imagem_url ? (
                        <img src={n.imagem_url} alt="" className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <Newspaper size={18} className="text-slate-300 dark:text-slate-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-700 transition-colors">{n.titulo}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock size={11} /> {timeAgo(n.criado_em)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Eventos */}
            <div className="glass-panel rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <div className="h-8 w-8 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600">
                    <Megaphone size={16} />
                  </div>
                  Eventos
                </h2>
                <Link to="/eventos" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  Ver todos <ArrowRight size={13} />
                </Link>
              </div>
              {eventosDestaque.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">Nenhum evento no momento.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {eventosDestaque.map((ev) => (
                    <Link
                      key={ev.id}
                      to="/eventos"
                      className="flex items-center gap-3 py-3 group first:pt-0 last:pb-0"
                    >
                      <div className={`h-14 w-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${ev.tipo === 'Urgente' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Calendar size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-700 transition-colors">{ev.titulo}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{ev.local_evento}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
      <AccessibilityToolbar />
    </div>
  );
}