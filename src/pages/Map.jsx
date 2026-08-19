import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import {
  Search, Navigation, Building2, Stethoscope, Cross, Siren,
  Filter, Heart, Share2, Info, ChevronDown, ChevronUp, Phone, ShieldAlert
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StatsCard from '../components/StatsCard';
import NewsCarousel from '../components/NewsCarousel';
import { MapSidebarSkeleton } from '../components/LoadingSkeleton';
import AccessibilityToolbar from '../components/AccessibilityToolbar';

// Corrige o ícone padrão do Leaflet no React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Ícones customizados por tipo de unidade
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

const iconUBS = createCustomIcon('#2563eb', '🏥');
const iconESF = createCustomIcon('#059669', '💚');
const iconHospital = createCustomIcon('#dc2626', '🏨');
const iconUPA = createCustomIcon('#f59e0b', '🚑');

function getUnitIcon(nome) {
  const n = nome.toLowerCase();
  if (n.includes('hospital')) return iconHospital;
  if (n.includes('upa')) return iconUPA;
  if (n.includes('esf')) return iconESF;
  return iconUBS;
}

function getUnitType(nome) {
  const n = nome.toLowerCase();
  if (n.includes('hospital')) return { label: 'Hospital', color: 'red' };
  if (n.includes('upa')) return { label: 'UPA', color: 'orange' };
  if (n.includes('esf')) return { label: 'ESF', color: 'green' };
  return { label: 'UBS', color: 'blue' };
}

function badgeClass(color) {
  return color === 'red' ? 'bg-red-500' : color === 'orange' ? 'bg-amber-500' : color === 'green' ? 'bg-emerald-500' : 'bg-blue-500';
}

// ---------- Favoritos (persistidos no navegador, sem exigir login do cidadão) ----------

const FAVORITOS_KEY = 'votorantim-saude-favoritos';

function loadFavoritos() {
  try {
    const raw = localStorage.getItem(FAVORITOS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavoritos(ids) {
  try {
    localStorage.setItem(FAVORITOS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage indisponível (ex.: modo de navegação privada) — favoritos não persistem, mas o app continua funcionando.
  }
}

// ---------- Filtros por tipo ----------

const FILTROS = ['Todos', 'UBS', 'ESF', 'Hospital', 'UPA', 'Favoritos'];

const LEGENDA_TIPOS = [
  { sigla: 'UBS', nome: 'Unidade Básica de Saúde', desc: 'Atendimento de rotina: consultas, vacinas e acompanhamento geral, sem hora marcada de urgência.' },
  { sigla: 'ESF', nome: 'Estratégia Saúde da Família', desc: 'Equipe fixa que acompanha de perto as famílias de um bairro/território específico.' },
  { sigla: 'UPA', nome: 'Unidade de Pronto Atendimento', desc: 'Urgências que não são risco de vida (funciona também fora do horário comercial).' },
  { sigla: 'Hospital', nome: 'Hospital', desc: 'Internações e emergências mais graves.' },
];

function buildWhatsAppShareUrl(unidade) {
  const rotaUrl = `https://www.google.com/maps/dir/?api=1&destination=${unidade.lat},${unidade.lng}`;
  const texto = `${unidade.nome}\n${unidade.endereco}\nComo chegar: ${rotaUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

// Componente auxiliar para ajustar o mapa
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 1.2 });
    }
  }, [center, zoom, map]);
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

  // Filtro por tipo/favoritos
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [favoritos, setFavoritos] = useState(loadFavoritos);
  const [showLegenda, setShowLegenda] = useState(false);

  // Botão de urgência
  const [urgenciaLoading, setUrgenciaLoading] = useState(false);

  useEffect(() => {
    async function fetchUnidades() {
      const { data, error } = await supabase.from('unidades').select('*');
      if (error) {
        console.error("Erro ao buscar unidades", error);
      } else {
        setUnidades(data || []);
      }
      setDataLoading(false);
    }
    async function fetchNoticias() {
      const { data } = await supabase
        .from('noticias')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(10);
      if (data) setNoticias(data);
    }
    fetchUnidades();
    fetchNoticias();
  }, []);

  const toggleFavorito = (id) => {
    setFavoritos(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      saveFavoritos(next);
      return next;
    });
  };

  const matchesFiltro = (unidade) => {
    if (tipoFiltro === 'Favoritos') return favoritos.includes(unidade.id);
    if (tipoFiltro === 'Todos') return true;
    return getUnitType(unidade.nome).label === tipoFiltro;
  };

  const unidadesFiltradas = unidades.filter(matchesFiltro);
  const unidadesProximasFiltradas = unidadesProximas.filter(matchesFiltro);

  const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const focarUnidade = (unidade, zoomAlvo = 15, delay = 0) => {
    const abrir = () => {
      setCenter([unidade.lat, unidade.lng]);
      setZoom(zoomAlvo);
      const marker = markerRefs.current[unidade.id];
      if (marker) marker.openPopup();
    };
    if (delay > 0) setTimeout(abrir, delay);
    else abrir();
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
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const userLat = parseFloat(data[0].lat);
        const userLon = parseFloat(data[0].lon);

        setCenter([userLat, userLon]);
        setZoom(14);
        setUserLocation([userLat, userLon]);

        const unidadesComDistancia = unidades.map(u => ({
          ...u,
          distancia: calcularDistancia(userLat, userLon, u.lat, u.lng)
        })).sort((a, b) => a.distancia - b.distancia);

        setUnidadesProximas(unidadesComDistancia);

        const maisProxima = unidadesComDistancia.filter(matchesFiltro)[0];
        if (maisProxima) {
          focarUnidade(maisProxima, 15, 2000);
        }
      } else {
        setError('Endereço não encontrado. Verifique se digitou corretamente (ex.: "Rua João Walter, Centro").');
      }
    } catch (err) {
      setError('Erro ao buscar o endereço. Verifique sua conexão com a internet e tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Seu navegador não suporta localização automática. Use a busca por endereço acima.');
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

        if (unidades.length > 0) {
          const unidadesComDistancia = unidades.map(u => ({
            ...u,
            distancia: calcularDistancia(userLat, userLon, u.lat, u.lng)
          })).sort((a, b) => a.distancia - b.distancia);

          setUnidadesProximas(unidadesComDistancia);

          const maisProxima = unidadesComDistancia.filter(matchesFiltro)[0];
          if (maisProxima) {
            focarUnidade(maisProxima, 15, 2000);
          }
        }
        setLoading(false);
      },
      () => {
        setError('Não foi possível obter sua localização automaticamente. Verifique se seu navegador tem permissão de localização ativada para este site (geralmente no ícone de cadeado ao lado do endereço) e tente novamente, ou use a busca por endereço acima.');
        setLoading(false);
      }
    );
  };

  // Botão de urgência: localiza e abre direto o Hospital/UPA mais próximo.
  const handleUrgencia = () => {
    if (!navigator.geolocation) {
      setError('Seu navegador não suporta localização automática. Busque pelo endereço para encontrar o Hospital/UPA mais próximo. Em caso de risco de vida, ligue 192 (SAMU).');
      return;
    }

    setUrgenciaLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        setCenter([userLat, userLon]);
        setZoom(14);
        setQuery('Minha localização atual');
        setUserLocation([userLat, userLon]);
        setTipoFiltro('Todos'); // garante que o resultado (Hospital/UPA) fique visível mesmo se outro filtro estava ativo

        const urgentes = unidades
          .filter(u => ['Hospital', 'UPA'].includes(getUnitType(u.nome).label))
          .map(u => ({ ...u, distancia: calcularDistancia(userLat, userLon, u.lat, u.lng) }))
          .sort((a, b) => a.distancia - b.distancia);

        setUnidadesProximas(urgentes);

        if (urgentes.length > 0) {
          focarUnidade(urgentes[0], 16, 1200);
        } else {
          setError('Nenhum Hospital/UPA cadastrado ainda nesta base. Em caso de risco de vida, ligue 192 (SAMU).');
        }
        setUrgenciaLoading(false);
      },
      () => {
        setError('Não foi possível obter sua localização automaticamente. Habilite a permissão de localização do navegador ou use a busca por endereço. Em caso de risco de vida, ligue 192 (SAMU) — não espere pelo aplicativo.');
        setUrgenciaLoading(false);
      }
    );
  };

  // Contadores de unidades por tipo
  const stats = {
    ubs: unidades.filter(u => !u.nome.toLowerCase().includes('esf') && !u.nome.toLowerCase().includes('hospital') && !u.nome.toLowerCase().includes('upa')).length,
    esf: unidades.filter(u => u.nome.toLowerCase().includes('esf')).length,
    hospital: unidades.filter(u => u.nome.toLowerCase().includes('hospital')).length,
    upa: unidades.filter(u => u.nome.toLowerCase().includes('upa')).length,
  };

  const contadorFiltro = (f) => {
    if (f === 'Todos') return unidades.length;
    if (f === 'Favoritos') return favoritos.length;
    return unidades.filter(u => getUnitType(u.nome).label === f).length;
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50">
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo principal</a>
      <Navbar />

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 via-blue-50/50 to-transparent -z-10"></div>

      <main id="conteudo-principal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
        {/* Header */}
        <header className="mb-8 animate-slide-up">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
            <span className="text-gradient">Saúde Votorantim</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xl">
            Encontre a unidade básica de saúde mais próxima de você na rede municipal.
          </p>
        </header>

        {/* News Carousel */}
        {noticias.length > 0 && <NewsCarousel noticias={noticias} />}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatsCard icon={Building2} value={stats.ubs} label="UBS" color="blue" delay={0} />
          <StatsCard icon={Stethoscope} value={stats.esf} label="ESF" color="green" delay={100} />
          <StatsCard icon={Cross} value={stats.hospital} label="Hospital" color="red" delay={200} />
          <StatsCard icon={Siren} value={stats.upa} label="UPA" color="orange" delay={300} />
        </div>

        {/* Botão de urgência */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <button
            id="btn-urgencia"
            onClick={handleUrgencia}
            disabled={urgenciaLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <ShieldAlert size={20} />
            {urgenciaLoading ? 'Localizando UPA/Hospital mais próximo...' : 'Preciso de atendimento agora'}
          </button>
          <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5 max-w-xl">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            Este botão só indica o Hospital/UPA mais próximo. Em caso de risco de vida, ligue{' '}
            <a href="tel:192" className="font-bold text-red-600 hover:underline">192 (SAMU)</a> imediatamente.
          </p>
        </div>

        {/* Search Bar */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl shadow-lg border border-white/50 mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex flex-col md:flex-row gap-3 items-end">
            <div className="w-full md:flex-1">
              <label htmlFor="endereco" className="block text-sm font-bold text-slate-700 mb-2">
                Qual o seu endereço?
              </label>
              <input
                type="text"
                id="endereco"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ex: rua João Walter, Centro"
                className="w-full px-5 py-3.5 text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm text-base"
              />
            </div>
            <div className="w-full md:w-auto flex gap-3">
              <button
                id="btn-search"
                onClick={handleSearch}
                disabled={loading}
                className="flex-1 md:flex-none md:px-8 h-[52px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-60"
              >
                <Search size={18} />
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
              <button
                id="btn-geolocation"
                onClick={handleGeolocation}
                disabled={loading}
                className="flex-1 md:flex-none md:px-6 h-[52px] bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 transition-all flex justify-center items-center gap-2 disabled:opacity-60"
              >
                <Navigation size={18} />
                <span className="hidden sm:inline">Localização</span>
              </button>
            </div>
          </div>
          {error && (
            <div role="alert" className="mt-3 bg-red-50 text-red-600 text-sm font-semibold p-3 rounded-xl border border-red-100 animate-slide-down">
              {error}
            </div>
          )}
        </div>

        {/* Filtros por tipo + legenda */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-slate-400 flex-shrink-0" />
            {FILTROS.map(f => (
              <button
                key={f}
                onClick={() => setTipoFiltro(f)}
                aria-pressed={tipoFiltro === f}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  tipoFiltro === f
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f === 'Favoritos' && <Heart size={13} className={tipoFiltro === f ? 'fill-white' : ''} />}
                {f} ({contadorFiltro(f)})
              </button>
            ))}
            <button
              onClick={() => setShowLegenda(v => !v)}
              aria-expanded={showLegenda}
              aria-controls="legenda-siglas"
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors px-2 py-2"
            >
              <Info size={14} />
              O que significa cada sigla?
              {showLegenda ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showLegenda && (
            <div id="legenda-siglas" className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white border border-slate-200 rounded-xl p-4 animate-slide-down">
              {LEGENDA_TIPOS.map(item => (
                <div key={item.sigla} className="flex items-start gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white mt-0.5 flex-shrink-0 ${badgeClass(getUnitType(item.sigla).color)}`}>
                    {item.sigla}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{item.nome}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="lg:col-span-2 glass-panel p-2 rounded-2xl shadow-lg border border-white/50 relative">
            <MapContainer center={center} zoom={zoom} style={{ height: '550px', width: '100%', borderRadius: '16px' }}>
              <TileLayer
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              <MapController center={center} zoom={zoom} />

              {userLocation && (
                <CircleMarker center={userLocation} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.4, weight: 3 }} radius={12}>
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold text-blue-700 text-sm">📍 Você está aqui</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {unidadesFiltradas.map(unidade => {
                const isFavorito = favoritos.includes(unidade.id);
                return (
                  <Marker
                    key={unidade.id}
                    position={[unidade.lat, unidade.lng]}
                    icon={getUnitIcon(unidade.nome)}
                    ref={(el) => {
                      if (el) {
                        markerRefs.current[unidade.id] = el;
                      }
                    }}
                  >
                    <Popup>
                      <div className="min-w-[210px]">
                        {unidade.imagens && unidade.imagens.length > 0 && (
                          <img src={unidade.imagens[0]} alt={unidade.nome} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                        )}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${badgeClass(getUnitType(unidade.nome).color)}`}>
                            {getUnitType(unidade.nome).label}
                          </span>
                          <button
                            onClick={() => toggleFavorito(unidade.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                            title={isFavorito ? 'Remover dos favoritos' : 'Favoritar'}
                            aria-label={isFavorito ? `Remover ${unidade.nome} dos favoritos` : `Favoritar ${unidade.nome}`}
                            aria-pressed={isFavorito}
                          >
                            <Heart size={16} className={isFavorito ? 'fill-red-500 text-red-500' : ''} />
                          </button>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">{unidade.nome}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{unidade.endereco}</p>
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${unidade.lat},${unidade.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Navigation size={12} />
                            Como chegar
                          </a>
                          <a
                            href={buildWhatsAppShareUrl(unidade)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                          >
                            <Share2 size={12} />
                            Compartilhar
                          </a>
                          {unidade.telefone && (
                            <a
                              href={`tel:${unidade.telefone}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                            >
                              <Phone size={12} />
                              Ligar
                            </a>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Sidebar */}
          <div className="glass-panel p-5 rounded-2xl shadow-lg border border-white/50 lg:col-span-1 h-[566px] flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2 shrink-0">
              <Building2 size={18} className="text-blue-600" />
              Unidades mais próximas
            </h2>

            <div className="overflow-y-auto custom-scrollbar flex-1 pr-1">
              {dataLoading ? (
                <MapSidebarSkeleton />
              ) : unidadesProximas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3 animate-float">🗺️</div>
                  <p className="text-slate-500 text-sm font-medium">
                    Busque seu endereço ou use sua localização para ver as unidades mais próximas.
                  </p>
                </div>
              ) : unidadesProximasFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-slate-500 text-sm font-medium">
                    Nenhuma unidade do filtro "{tipoFiltro}" encontrada nesta busca.
                  </p>
                  <button onClick={() => setTipoFiltro('Todos')} className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800">
                    Ver todas
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {unidadesProximasFiltradas.map((u, index) => {
                    const unitType = getUnitType(u.nome);
                    const isFavorito = favoritos.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Ver ${u.nome} no mapa, ${u.distancia < 1 ? `${(u.distancia * 1000).toFixed(0)} metros` : `${u.distancia.toFixed(1)} quilômetros`} de distância`}
                        className={`p-3.5 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all cursor-pointer animate-slide-up stagger-${Math.min(index + 1, 6)}`}
                        onClick={() => focarUnidade(u, 16, 100)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focarUnidade(u, 16, 100); } }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0 ${badgeClass(unitType.color)}`}>
                              {unitType.label}
                            </span>
                            <h3 className="font-bold text-slate-800 text-sm truncate">{u.nome}</h3>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${
                            index === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.distancia < 1 ? `${(u.distancia * 1000).toFixed(0)}m` : `${u.distancia.toFixed(1)}km`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{u.endereco}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {index === 0 ? (
                            <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ✨ Mais próxima
                            </span>
                          ) : <span />}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFavorito(u.id); }}
                            className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                            title={isFavorito ? 'Remover dos favoritos' : 'Favoritar'}
                            aria-label={isFavorito ? `Remover ${u.nome} dos favoritos` : `Favoritar ${u.nome}`}
                            aria-pressed={isFavorito}
                          >
                            <Heart size={16} className={isFavorito ? 'fill-red-500 text-red-500' : ''} />
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
      </main>

      <Footer />
      <AccessibilityToolbar />
    </div>
  );
}
