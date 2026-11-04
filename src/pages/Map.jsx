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
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { MapSidebarSkeleton } from '../components/LoadingSkeleton';
import AccessibilityToolbar from '../components/AccessibilityToolbar';
import UnidadeDetalheModal from '../components/UnidadeDetalheModal';
import IntentionSearchPanel, { IntentionResultCard } from '../components/IntentionSearchPanel';
import { registrarVisualizacaoUnidade, registrarFiltroCategoria, registrarPaginaVista, registrarBairroPorCoordenada } from '../lib/metricas';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const iconCache = {};

function createCustomIcon(color, emoji) {
  const chave = `${color}|${emoji}`;
  if (iconCache[chave]) return iconCache[chave];

  const icon = L.divIcon({
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
  iconCache[chave] = icon;
  return icon;
}

let selectedIconSingleton = null;

function createSelectedIcon() {
  if (!selectedIconSingleton) {
    selectedIconSingleton = L.divIcon({
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
  return selectedIconSingleton;
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

const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY;
const TILE_URL = CARTO_API_KEY
  ? `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const TILE_ATTRIBUTION = CARTO_API_KEY
  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
  } catch { }
}

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

const CENTRO_VOTORANTIM = [-23.545, -47.44];

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
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
}

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
  const [center, setCenter] = useState(CENTRO_VOTORANTIM);
  const [zoom, setZoom] = useState(13);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [unidadesProximas, setUnidadesProximas] = useState([]);
  const [localizacaoBuscada, setLocalizacaoBuscada] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [eventosDestaque, setEventosDestaque] = useState([]);

  const [intencaoTexto, setIntencaoTexto] = useState('');
  const [intencaoAtiva, setIntencaoAtiva] = useState(null);
  const [showAjudaModal, setShowAjudaModal] = useState(false);

  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [favoritos, setFavoritos] = useState(loadFavoritos);
  const [showLegenda, setShowLegenda] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);

  const [configHome, setConfigHome] = useState(null);

  useEffect(() => {
    async function fetchUnidades() {
      const { data, error } = await supabase.from('unidades').select('*');
      if (error) {
        console.error('Erro ao buscar unidades', error);
      } else {
        const lista = data || [];
        setUnidades(lista);
        const padraoOrdenado = [...lista].sort(
          (a, b) =>
            calcularDistanciaKm(CENTRO_VOTORANTIM[0], CENTRO_VOTORANTIM[1], a.lat, a.lng) -
            calcularDistanciaKm(CENTRO_VOTORANTIM[0], CENTRO_VOTORANTIM[1], b.lat, b.lng)
        );
        setUnidadesProximas(padraoOrdenado);
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
    async function fetchConfigHome() {
      const { data, error } = await supabase
        .from('configuracoes_home')
        .select('*')
        .eq('id', 1)
        .single();
      if (!error && data) setConfigHome(data);
    }
    fetchUnidades();
    fetchNoticias();
    fetchEventosDestaque();
    fetchConfigHome();
    registrarPaginaVista('/');
  }, []);

  const destaque = {
    titulo: configHome?.destaque_titulo || 'Vacinação em dia!',
    texto: configHome?.destaque_texto || 'Confira o calendário de vacinação e as campanhas ativas na cidade.',
    botao_texto: configHome?.destaque_botao_texto || 'Saiba mais',
    botao_link: configHome?.destaque_botao_link || '/eventos',
    tipo_fundo: configHome?.destaque_tipo_fundo || 'cor',
    cor_fundo: configHome?.destaque_cor_fundo || '#4338ca',
    imagem_url: configHome?.destaque_imagem_url || null,
  };

  const toggleFavorito = (id) => {
    setFavoritos((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      saveFavoritos(next);
      return next;
    });
  };

  const matchesFiltro = (unidade) => {
    if (tipoFiltro === 'Favoritos') return favoritos.includes(unidade.id);

    if (intencaoAtiva && intencaoAtiva.matched && intencaoAtiva.tiposAlvo) {
      const tipoUnidade = getUnitType(unidade).label;
      if (!intencaoAtiva.tiposAlvo.includes(tipoUnidade)) return false;
    }

    if (tipoFiltro === 'Todos') return true;
    return getUnitType(unidade).label === tipoFiltro;
  };

  const unidadesFiltradas = unidades.filter(matchesFiltro);
  const unidadesProximasFiltradas = unidadesProximas.filter(matchesFiltro);

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
      const base = unidadesProximas.length > 0 ? unidadesProximas : unidades;
      const recomendadas = base.filter((u) =>
        resultado.tiposAlvo.includes(getUnitType(u).label)
      );
      if (recomendadas.length > 0) {
        focarUnidade(recomendadas[0], 15, 300);
      }

      requestAnimationFrame(() => {
        document.getElementById('busca-unidades')?.scrollIntoView({ behavior: 'smooth' });
      });
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
        setLocalizacaoBuscada(true);

        const unidadesComDistancia = unidades
          .map((u) => ({
            ...u,
            distancia: calcularDistanciaKm(userLat, userLon, u.lat, u.lng),
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
        setLocalizacaoBuscada(true);
        registrarBairroPorCoordenada(userLat, userLon);

        if (unidades.length > 0) {
          const unidadesComDistancia = unidades
            .map((u) => ({
              ...u,
              distancia: calcularDistanciaKm(userLat, userLon, u.lat, u.lng),
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
          'Não foi possível obter sua localização automaticamente. Verifique se seu navegador tem permissão de localização ativada para este site e tente novamente, ou use a busca por endereço acima.'
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
      <section className="relative overflow-hidden bg-slate-900 py-12 sm:py-16 lg:py-20 mb-12 flex items-center">
        {/* Imagem de Fundo cobrindo toda a extensão dinâmica da seção */}
        {configHome?.hero_imagem_url ? (
          <img
            src={configHome.hero_imagem_url}
            alt="Votorantim"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900" />
        )}

        {/* Gradiente branco/escuro com blur cobrindo a lateral do texto */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/98 via-white/85 to-transparent dark:from-slate-950/98 dark:via-slate-950/85 dark:to-transparent backdrop-blur-[1px]" />

        {/* Conteúdo centralizado verticalmente através do padding simétrico (py) */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full">
          <div className="max-w-3xl text-left">

            <span className="inline-flex items-center gap-2 bg-indigo-100/90 dark:bg-indigo-500/20 backdrop-blur-md text-indigo-700 dark:text-indigo-300 text-xs font-bold px-4 py-1.5 rounded-full mb-4 shadow-sm border border-indigo-200/50">
              <Megaphone size={13} /> Bem-vindo(a) a Votorantim!
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-3 drop-shadow-sm">
              Sua cidade,<br /> <span className="text-indigo-600 dark:text-indigo-400">mais perto</span> de você.
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base max-w-2xl mb-6 leading-relaxed font-medium">
              Encontre serviços de saúde, fique por dentro das novidades, e acesse tudo o que você precisa em um só lugar.
            </p>

            {/* Barra de busca expandida */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700 rounded-2xl p-2.5 shadow-2xl w-full max-w-2xl mb-4">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                className="flex flex-col sm:flex-row items-stretch gap-2"
              >
                <div className="flex items-center gap-2 flex-1 px-3 py-1">
                  <Search size={18} className="text-slate-400 flex-shrink-0" />
                  <label htmlFor="busca-endereco-hero" className="sr-only">Buscar por endereço, bairro ou CEP</label>
                  <input
                    id="busca-endereco-hero"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="O que você procura? Ex: UBS, vacina, evento..."
                    className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all flex-shrink-0"
                >
                  {loading ? 'Buscando...' : 'Buscar →'}
                </button>
              </form>
            </div>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-3">{error}</p>
            )}

            {/* Chips de Acesso Rápido */}
            <div className="flex flex-wrap items-center gap-2 max-w-2xl">
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
                    <Icon size={14} className="text-indigo-600 dark:text-indigo-400" /> {chip.label}
                  </>
                );
                const cls = 'inline-flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 backdrop-blur-md border border-slate-200/90 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-full transition-all shadow-sm';
                return chip.to ? (
                  <Link key={chip.label} to={chip.to} className={cls}>{conteudo}</Link>
                ) : (
                  <button key={chip.label} type="button" onClick={chip.onClick} className={cls}>{conteudo}</button>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      <main id="conteudo-principal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 relative z-10">

        <div className="grid sm:grid-cols-2 gap-5 mb-8 animate-slide-up items-stretch" style={{ animationDelay: '0.1s' }}>
          <button
            type="button"
            onClick={() => setShowAjudaModal(true)}
            className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center mb-3 shadow-sm">
                <Sparkles size={18} />
              </div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-1">Não sabe o que procurar?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Conte o que você precisa e te indicamos para onde ir.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-4">
              Começar <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          <div
            className="relative overflow-hidden rounded-2xl p-6 shadow-lg flex flex-col justify-between text-white"
            style={
              destaque.tipo_fundo === 'imagem' && destaque.imagem_url
                ? undefined
                : { backgroundColor: destaque.cor_fundo }
            }
          >
            {destaque.tipo_fundo === 'imagem' && destaque.imagem_url ? (
              <>
                <img src={destaque.imagem_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
              </>
            ) : (
              <div className="absolute -right-8 -bottom-8 h-36 w-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
            )}
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                <Syringe size={18} />
              </div>
              <h3 className="text-lg font-extrabold mb-1">{destaque.titulo}</h3>
              <p className="text-white/90 text-sm mb-5">{destaque.texto}</p>
            </div>
            {/^https?:\/\//i.test(destaque.botao_link) ? (
              <a
                href={destaque.botao_link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex items-center gap-1.5 bg-white text-indigo-700 font-bold text-sm px-4 py-2 rounded-xl w-fit hover:shadow-md transition-shadow"
              >
                {destaque.botao_texto} <ArrowRight size={14} />
              </a>
            ) : (
              <Link
                to={destaque.botao_link}
                className="relative inline-flex items-center gap-1.5 bg-white text-indigo-700 font-bold text-sm px-4 py-2 rounded-xl w-fit hover:shadow-md transition-shadow"
              >
                {destaque.botao_texto} <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        <IntentionSearchPanel
          open={showAjudaModal}
          onClose={() => setShowAjudaModal(false)}
          intencaoTexto={intencaoTexto}
          setIntencaoTexto={setIntencaoTexto}
          intencaoAtiva={intencaoAtiva}
          onSelectIntencao={handleSelectIntencao}
          onClearIntencao={handleClearIntencao}
        />

        <IntentionResultCard
          intencaoAtiva={intencaoAtiva}
          totalRecomendadas={unidadesFiltradas.length}
          onTrocar={() => setShowAjudaModal(true)}
          onClear={handleClearIntencao}
        />

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
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors px-2 py-2"
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
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

          <div className="glass-panel p-5 rounded-2xl shadow-lg border border-white/50 lg:col-span-1 h-[576px] flex flex-col">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <Building2 size={18} className="text-indigo-600 flex-shrink-0" />
                <span className="truncate">
                  {intencaoAtiva && intencaoAtiva.matched
                    ? `Recomendadas (${listaSidebar.length})`
                    : localizacaoBuscada
                      ? 'Unidades mais próximas'
                      : 'Unidades próximas ao centro'}
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
                  <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold mb-1">
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
                  {!localizacaoBuscada && (
                    <div className="bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/30 rounded-xl p-2.5 text-[11px] text-indigo-700 dark:text-indigo-300 leading-snug">
                      💡 Esta lista mostra as unidades mais perto do centro de Votorantim. Digite seu endereço ou clique em{' '}
                      <strong>Minha Localização</strong> para ver a distância até você.
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
                        aria-label={`Ver ${u.nome} no mapa`}
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
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                            >
                              {u.distancia < 1
                                ? `${(u.distancia * 1000).toFixed(0)}m`
                                : `${u.distancia.toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.endereco}</p>
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

        {(noticias.length > 0 || eventosDestaque.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
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
                        <img src={n.imagem_url} alt="" loading="lazy" decoding="async" className="h-14 w-14 rounded-xl object-cover flex-shrink-0" />
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