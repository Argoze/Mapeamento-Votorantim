import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ShieldAlert,
  Info,
  Calendar,
  MapPin,
  Megaphone,
  Filter,
  ChevronLeft,
  ChevronRight,
  Image,
  Heart,
  Share2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import { EventCardSkeleton } from '../components/LoadingSkeleton';
import AccessibilityToolbar from '../components/AccessibilityToolbar';
import AddToCalendarButton from '../components/AddToCalendarButton';

const FAVORITOS_KEY = 'votorantim-campanhas-favoritas';

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
    // Modo privado/restrito
  }
}

export default function Events() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [favoritos, setFavoritos] = useState(loadFavoritos);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao carregar eventos', error);
      } else {
        // Campanhas agendadas pra uma data futura (publicar_em) ainda não
        // devem aparecer pro cidadão — somem sozinhas da lista até a data
        // chegar, sem precisar de ninguém publicando manualmente no dia certo.
        const agora = Date.now();
        const visiveis = (data || []).filter(
          (e) => !e.publicar_em || new Date(e.publicar_em).getTime() <= agora
        );
        setEventos(visiveis);
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  const toggleFavorito = (id) => {
    setFavoritos((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      saveFavoritos(next);
      if (!exists) {
        setToast({
          message:
            'Campanha favoritada! Use o botão "Adicionar ao calendário" para salvar a data e não esquecer.',
          type: 'success',
          duration: 5000,
        });
      }
      return next;
    });
  };

  const isNew = (criado_em) => {
    const diff = Date.now() - new Date(criado_em).getTime();
    return diff < 48 * 60 * 60 * 1000; // 48 horas
  };

  const eventosFiltrados = (() => {
    if (filtro === 'Favoritos') {
      return eventos.filter((e) => favoritos.includes(e.id));
    }
    if (filtro === 'Todos') {
      return eventos;
    }
    return eventos.filter((e) => e.tipo === filtro);
  })();

  const filters = ['Todos', 'Urgente', 'Informativo', 'Favoritos'];

  return (
    <div className="text-slate-800 antialiased relative min-h-screen overflow-x-hidden bg-slate-50">
      <a href="#conteudo-principal" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Navbar />

      {/* Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}

      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-50 via-blue-50/50 to-transparent -z-10" />

      <main id="conteudo-principal" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
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
                Fique por dentro dos mutirões e eventos de saúde em Votorantim. Adicione lembretes direto ao seu calendário!
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
        <div className="flex flex-wrap items-center gap-2 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Filter size={16} className="text-slate-400 mr-1" />
          {filters.map((f) => {
            const count =
              f === 'Todos'
                ? eventos.length
                : f === 'Favoritos'
                  ? favoritos.length
                  : eventos.filter((e) => e.tipo === f).length;

            const isSelected = filtro === f;

            return (
              <button
                key={f}
                type="button"
                onClick={() => setFiltro(f)}
                aria-pressed={isSelected}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isSelected
                  ? f === 'Urgente'
                    ? 'bg-red-500 text-white shadow-md'
                    : f === 'Informativo'
                      ? 'bg-blue-500 text-white shadow-md'
                      : f === 'Favoritos'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {f === 'Favoritos' && (
                  <Heart
                    size={14}
                    className={isSelected ? 'fill-white text-white' : 'text-rose-500 fill-rose-500'}
                  />
                )}
                <span>
                  {f} ({count})
                </span>
              </button>
            );
          })}
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
            <div className="col-span-1 md:col-span-2 text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm animate-scale-in p-6">
              <div className="text-5xl mb-4 animate-float">
                {filtro === 'Favoritos' ? '❤️' : '📋'}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {filtro === 'Favoritos'
                  ? 'Você ainda não favoritou nenhuma campanha'
                  : filtro === 'Todos'
                    ? 'Nenhum evento no momento'
                    : `Nenhum evento "${filtro}" encontrado`}
              </h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                {filtro === 'Favoritos'
                  ? 'Clique no ícone de coração em qualquer campanha para salvá-la aqui e adicionar lembretes ao seu calendário facilmente.'
                  : filtro === 'Todos'
                    ? 'A prefeitura não possui campanhas ativas no momento.'
                    : 'Tente selecionar outro filtro para ver mais resultados.'}
              </p>
              {filtro === 'Favoritos' && (
                <button
                  type="button"
                  onClick={() => setFiltro('Todos')}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors"
                >
                  Ver todas as campanhas
                </button>
              )}
            </div>
          ) : (
            eventosFiltrados.map((evento, index) => (
              <EventCard
                key={evento.id}
                evento={evento}
                index={index}
                isNew={isNew}
                isFavorito={favoritos.includes(evento.id)}
                onToggleFavorito={toggleFavorito}
              />
            ))
          )}
        </div>
      </main>

      <Footer />
      <AccessibilityToolbar />
    </div>
  );
}

// Card de Evento
function EventCard({ evento, index, isNew, isFavorito, onToggleFavorito }) {
  const [currentImg, setCurrentImg] = useState(0);
  const hasImages = evento.imagens && evento.imagens.length > 0;

  const buildWhatsAppShareUrl = () => {
    const text = `*${evento.titulo}*\n📅 *Data:* ${evento.data_evento || 'Consulte detalhes'}\n📍 *Local:* ${evento.local_evento || 'Votorantim'}\n\nSaiba mais no Portal de Saúde de Votorantim: ${window.location.origin}/eventos`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  return (
    <div
      className={`glass-panel rounded-2xl shadow-sm border border-slate-100 relative group hover:shadow-lg hover:border-slate-200 transition-all flex flex-col justify-between animate-slide-up stagger-${Math.min(
        index + 1,
        6
      )}`}
    >
      <div>
        {/* Galeria de imagens */}
        {hasImages && (
          <div className="relative h-48 overflow-hidden bg-slate-100 rounded-t-2xl">
            <img
              src={evento.imagens[currentImg]}
              alt={evento.titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

            {/* Navegação da imagem */}
            {evento.imagens.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImg(
                      (prev) => (prev - 1 + evento.imagens.length) % evento.imagens.length
                    );
                  }}
                  aria-label="Imagem anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 bg-white/80 hover:bg-white text-slate-700 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImg((prev) => (prev + 1) % evento.imagens.length);
                  }}
                  aria-label="Próxima imagem"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 bg-white/80 hover:bg-white text-slate-700 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                >
                  <ChevronRight size={14} />
                </button>
                {/* Dots */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                  {evento.imagens.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImg(i);
                      }}
                      aria-label={`Ver imagem ${i + 1} de ${evento.imagens.length}`}
                      aria-current={i === currentImg}
                      className={`h-1.5 rounded-full transition-all ${i === currentImg ? 'bg-white w-4' : 'bg-white/50 w-1.5'
                        }`}
                    />
                  ))}
                </div>
                {/* Contador */}
                <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/50 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Image size={10} /> {currentImg + 1}/{evento.imagens.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* Badge de tipo e Botão Favorito no topo */}
        <div
          className={`absolute ${hasImages ? 'top-2 right-2' : 'top-0 right-0'} flex items-center gap-1.5 z-10`}
        >
          {/* Botão Favoritar no topo */}
          <button
            type="button"
            onClick={() => onToggleFavorito(evento.id)}
            aria-label={isFavorito ? `Remover ${evento.titulo} dos favoritos` : `Favoritar ${evento.titulo}`}
            aria-pressed={isFavorito}
            title={isFavorito ? 'Remover dos favoritos' : 'Favoritar campanha'}
            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${hasImages
              ? 'bg-white/90 hover:bg-white text-slate-600 shadow-sm'
              : 'mr-2 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
          >
            <Heart
              size={15}
              className={isFavorito ? 'fill-rose-500 text-rose-500' : 'text-slate-400 hover:text-rose-500'}
            />
          </button>

          {/* Badge de tipo */}
          <div
            className={`text-white text-[10px] font-bold px-3 py-1.5 ${hasImages ? 'rounded-lg shadow-sm' : 'rounded-bl-xl'
              } uppercase tracking-wider ${evento.tipo === 'Urgente' ? 'bg-red-500' : 'bg-blue-500'
              }`}
          >
            {evento.tipo}
          </div>
        </div>

        {/* Badge de novo */}
        {isNew(evento.criado_em) && (
          <div className={`absolute ${hasImages ? 'top-2' : 'top-3'} left-3 z-10`}>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full animate-badge-pulse shadow-sm">
              ✨ Novo
            </span>
          </div>
        )}

        {/* Conteúdo textual */}
        <div className={`flex items-start gap-4 ${hasImages ? 'p-5 pb-3' : 'p-5 pt-8 pb-3'}`}>
          {!hasImages && (
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${evento.tipo === 'Urgente' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}
            >
              {evento.tipo === 'Urgente' ? <ShieldAlert size={24} /> : <Info size={24} />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-800 leading-tight">{evento.titulo}</h2>
            <p className="text-slate-600 mt-1.5 text-sm leading-relaxed">{evento.descricao}</p>

            <div className="mt-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                <Calendar size={15} className="text-blue-500 flex-shrink-0" />
                <span>{evento.data_evento}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                <span>{evento.local_evento}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ações Inferior: Adicionar ao Calendário, Compartilhar, Favoritar */}
      <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2 flex-wrap">
        {/* Botão de Adicionar ao Calendário (Google Calendar / ICS / Outlook) */}
        <AddToCalendarButton evento={evento} />

        <div className="flex items-center gap-1.5">
          {/* Compartilhar no WhatsApp */}
          <a
            href={buildWhatsAppShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors"
            title="Compartilhar campanha no WhatsApp"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">Compartilhar</span>
          </a>

          {/* Favoritar */}
          <button
            type="button"
            onClick={() => onToggleFavorito(evento.id)}
            aria-pressed={isFavorito}
            aria-label={isFavorito ? 'Remover dos favoritos' : 'Favoritar campanha'}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs transition-colors ${isFavorito
              ? 'bg-rose-50 text-rose-700 border border-rose-200'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            title={isFavorito ? 'Campanha salva nos favoritos' : 'Salvar nos favoritos'}
          >
            <Heart size={13} className={isFavorito ? 'fill-rose-500 text-rose-500' : ''} />
            <span className="hidden sm:inline">{isFavorito ? 'Salva' : 'Favoritar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}