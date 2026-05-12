import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';

// Corrige o ícone padrão do Leaflet no React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Componente auxiliar para ajustar o mapa
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function Map() {
  const [unidades, setUnidades] = useState([]);
  const [query, setQuery] = useState('');
  const [center, setCenter] = useState([-23.545, -47.44]);
  const [zoom, setZoom] = useState(13);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchUnidades() {
      const { data, error } = await supabase.from('unidades').select('*');
      if (error) {
        console.error("Erro ao buscar unidades", error);
      } else {
        setUnidades(data || []);
      }
    }
    fetchUnidades();
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

        const unidadesComDistancia = unidades.map(u => ({
          ...u,
          distancia: calcularDistancia(userLat, userLon, u.lat, u.lng)
        })).sort((a, b) => a.distancia - b.distancia);

        if (unidadesComDistancia.length > 0) {
          const maisProxima = unidadesComDistancia[0];
          setTimeout(() => {
            setCenter([maisProxima.lat, maisProxima.lng]);
            setZoom(16);
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

        if (unidades.length > 0) {
          const unidadesComDistancia = unidades.map(u => ({
            ...u,
            distancia: calcularDistancia(userLat, userLon, u.lat, u.lng)
          })).sort((a, b) => a.distancia - b.distancia);

          const maisProxima = unidadesComDistancia[0];
          setTimeout(() => {
            setCenter([maisProxima.lat, maisProxima.lng]);
            setZoom(16);
          }, 2000);
        }
        setLoading(false);
      },
      (err) => {
        setError('Não foi possível obter sua localização. Permita o acesso.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent -z-10"></div>

      <div className="max-w-7xl mx-auto">
        <header className="mb-10 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
              <span className="text-gradient">Saúde Votorantim</span>
            </h1>
            <p className="text-slate-500 text-lg">Encontre a unidade básica de saúde mais próxima de você.</p>
          </div>
          <div className="flex flex-col gap-3 items-center sm:items-end">
            <div className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100 text-blue-800 font-semibold text-sm shadow-sm whitespace-nowrap">
              Rede de atendimento municipal
            </div>
            <Link to="/eventos" className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors shadow-sm">
              Ver alertas e campanhas
            </Link>
          </div>
        </header>

        <div className="glass-panel p-6 sm:p-8 rounded-3xl shadow-lg border border-white mb-10">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-2/4">
              <label htmlFor="endereco" className="block text-sm font-bold text-slate-700 mb-2">
                Qual o seu endereço?
              </label>
              <input
                type="text"
                id="endereco"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: rua João Walter, Centro"
                className="w-full px-5 py-4 text-slate-800 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-inner text-lg"
              />
            </div>
            <div className="w-full md:w-1/4">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full h-[60px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            <div className="w-full md:w-1/4">
              <button
                onClick={handleGeolocation}
                disabled={loading}
                className="w-full h-[60px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm border border-slate-300 transition-all flex justify-center items-center gap-2"
              >
                Usar localização
              </button>
            </div>
          </div>
          {error && <p className="text-red-500 mt-3 text-sm font-semibold">{error}</p>}
        </div>

        {unidades.length === 0 && !loading && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">
                  Nenhuma unidade de saúde foi encontrada no banco de dados. Você executou o arquivo <strong>setup_database.sql</strong> no painel do Supabase?
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel p-2 rounded-3xl shadow-lg border border-white relative">
          <MapContainer center={center} zoom={zoom} style={{ height: '550px', width: '100%', borderRadius: '20px' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapController center={center} zoom={zoom} />
            {unidades.map(unidade => (
              <Marker key={unidade.id} position={[unidade.lat, unidade.lng]}>
                <Popup>
                  <b>{unidade.nome}</b><br />{unidade.endereco}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
