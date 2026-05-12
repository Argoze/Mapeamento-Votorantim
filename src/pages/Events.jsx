import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Info, Calendar, MapPin, ArrowLeft, Plus } from 'lucide-react';

export default function Events() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="text-slate-800 antialiased relative min-h-screen overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-transparent -z-10"></div>

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-colors">
          <ArrowLeft size={20} />
          Voltar para o mapa
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="mb-10 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
              <span className="text-gradient">Alertas e campanhas</span>
            </h1>
            <p className="text-slate-500 text-lg">Fique por dentro dos mutirões e eventos de saúde em Votorantim.</p>
          </div>
          
          <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all flex items-center gap-2">
            <Plus size={20} />
            Novo evento
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-1 md:col-span-2 text-center text-slate-500 py-10">
              Carregando campanhas...
            </div>
          ) : eventos.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-700">Nenhum evento no momento</h3>
              <p className="text-slate-500">A prefeitura não possui campanhas ativas.</p>
            </div>
          ) : (
            eventos.map(evento => (
              <div key={evento.id} className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className={`absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase ${evento.tipo === 'Urgente' ? 'bg-red-500' : 'bg-blue-500'}`}>
                  {evento.tipo}
                </div>
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${evento.tipo === 'Urgente' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {evento.tipo === 'Urgente' ? <ShieldAlert size={24} /> : <Info size={24} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{evento.titulo}</h3>
                    <p className="text-slate-600 mt-2 text-sm">{evento.descricao}</p>
                    
                    <div className="mt-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar size={16} />
                        <strong>Data:</strong> {evento.data_evento}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin size={16} />
                        <strong>Local:</strong> {evento.local_evento}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
