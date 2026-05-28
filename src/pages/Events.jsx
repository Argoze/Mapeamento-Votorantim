import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Info, Calendar, MapPin, Megaphone, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { EventCardSkeleton } from '../components/LoadingSkeleton';

export default function Events() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) {
        console.error("Erro ao carregar eventos", error);
      } else {
        setEventos(data || []);
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  const isNew = (criado_em) => {
    const diff = Date.now() - new Date(criado_em).getTime();
    return diff < 48 * 60 * 60 * 1000; // 48 horas
  };

  const eventosFiltrados = filtro === 'Todos'
    ? eventos
    : eventos.filter(e => e.tipo === filtro);

  const filters = ['Todos', 'Urgente', 'Informativo'];

  return (
    <div className="text-slate-800 antialiased relative min-h-screen overflow-x-hidden bg-slate-50">
      <Navbar />
      
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-50 via-blue-50/50 to-transparent -z-10"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4">
        {/* Header */}
        <header className="mb-8 animate-slide-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  <span className="text-gradient">Alertas e Campanhas</span>
                </h1>
              </div>
              <p className="text-slate-500 text-base sm:text-lg">
                Fique por dentro dos mutirões e eventos de saúde em Votorantim.
              </p>
            </div>
            
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-2 hover:shadow-lg text-sm"
            >
              <span className="text-lg">+</span>
              Novo evento
            </Link>
          </div>
        </header>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Filter size={16} className="text-slate-400" />
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filtro === f
                  ? f === 'Urgente'
                    ? 'bg-red-500 text-white shadow-md'
                    : f === 'Informativo'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'Todos' ? `Todos (${eventos.length})` : f}
            </button>
          ))}
        </div>

        {/* Grid de Eventos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loading ? (
            <>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </>
          ) : eventosFiltrados.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm animate-scale-in">
              <div className="text-5xl mb-4 animate-float">📋</div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">
                {filtro === 'Todos' ? 'Nenhum evento no momento' : `Nenhum evento "${filtro}" encontrado`}
              </h3>
              <p className="text-slate-500 text-sm">
                {filtro === 'Todos'
                  ? 'A prefeitura não possui campanhas ativas no momento.'
                  : 'Tente selecionar outro filtro para ver mais resultados.'}
              </p>
            </div>
          ) : (
            eventosFiltrados.map((evento, index) => (
              <div
                key={evento.id}
                className={`glass-panel p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-lg hover:border-slate-200 transition-all animate-slide-up stagger-${Math.min(index + 1, 6)}`}
              >
                {/* Badge de tipo */}
                <div className={`absolute top-0 right-0 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl uppercase tracking-wider ${
                  evento.tipo === 'Urgente' ? 'bg-red-500' : 'bg-blue-500'
                }`}>
                  {evento.tipo}
                </div>

                {/* Badge de novo */}
                {isNew(evento.criado_em) && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full animate-badge-pulse">
                      ✨ Novo
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-4 mt-2">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    evento.tipo === 'Urgente' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {evento.tipo === 'Urgente' ? <ShieldAlert size={24} /> : <Info size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{evento.titulo}</h3>
                    <p className="text-slate-600 mt-1.5 text-sm leading-relaxed">{evento.descricao}</p>
                    
                    <div className="mt-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{evento.data_evento}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin size={14} className="text-slate-400" />
                        <span>{evento.local_evento}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
