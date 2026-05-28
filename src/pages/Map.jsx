import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { Search, Navigation, Building2, Stethoscope, Cross, Siren } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StatsCard from '../components/StatsCard';
import NewsCarousel from '../components/NewsCarousel';
import { MapSidebarSkeleton } from '../components/LoadingSkeleton';

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

        if (unidadesComDistancia.length > 0) {
          const maisProxima = unidadesComDistancia[0];
          setTimeout(() => {
            setCenter([maisProxima.lat, maisProxima.lng]);
            setZoom(15);
            const marker = markerRefs.current[maisProxima.id];
            if (marker) {
              marker.openPopup();
            }
          }, 2000);
        }
      } else {
        setError('Endereço não encontrado. Verifique se digitou corretamente.');
      }
    } catch (err) {
      setError('Erro ao buscar o endereço.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo seu navegador.');
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

          const maisProxima = unidadesComDistancia[0];
          setTimeout(() => {
            setCenter([maisProxima.lat, maisProxima.lng]);
            setZoom(15);
            const marker = markerRefs.current[maisProxima.id];
            if (marker) {
              marker.openPopup();
            }
          }, 2000);
        }
        setLoading(false);
      },
      () => {
        setError('Não foi possível obter sua localização. Permita o acesso.');
        setLoading(false);
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

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50">
      <Navbar />

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50 via-blue-50/50 to-transparent -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
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

        {/* Search Bar */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl shadow-lg border border-white/50 mb-8 animate-slide-up" style={{ animationDelay: '0.15s' }}>
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
            <div className="mt-3 bg-red-50 text-red-600 text-sm font-semibold p-3 rounded-xl border border-red-100 animate-slide-down">
              {error}
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

              {unidades.map(unidade => (
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
                    <div className="min-w-[200px]">
                      {unidade.imagens && unidade.imagens.length > 0 && (
                        <img src={unidade.imagens[0]} alt={unidade.nome} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                          getUnitType(unidade.nome).color === 'red' ? 'bg-red-500' :
                          getUnitType(unidade.nome).color === 'orange' ? 'bg-amber-500' :
                          getUnitType(unidade.nome).color === 'green' ? 'bg-emerald-500' :
                          'bg-blue-500'
                        }`}>
                          {getUnitType(unidade.nome).label}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">{unidade.nome}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{unidade.endereco}</p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${unidade.lat},${unidade.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Navigation size={12} />
                        Como chegar
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
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
              ) : (
                <div className="flex flex-col gap-3">
                  {unidadesProximas.map((u, index) => {
                    const unitType = getUnitType(u.nome);
                    return (
                      <div
                        key={u.id}
                        className={`p-3.5 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all cursor-pointer animate-slide-up stagger-${Math.min(index + 1, 6)}`}
                        onClick={() => {
                          setCenter([u.lat, u.lng]);
                          setZoom(16);
                          setTimeout(() => {
                            const marker = markerRefs.current[u.id];
                            if (marker) {
                              marker.openPopup();
                            }
                          }, 100);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                              unitType.color === 'red' ? 'bg-red-500' :
                              unitType.color === 'orange' ? 'bg-amber-500' :
                              unitType.color === 'green' ? 'bg-emerald-500' :
                              'bg-blue-500'
                            }`}>
                              {unitType.label}
                            </span>
                            <h3 className="font-bold text-slate-800 text-sm">{u.nome}</h3>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            index === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.distancia < 1 ? `${(u.distancia * 1000).toFixed(0)}m` : `${u.distancia.toFixed(1)}km`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{u.endereco}</p>
                        {index === 0 && (
                          <span className="inline-block mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            ✨ Mais próxima
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
