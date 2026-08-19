import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Newspaper, Clock, Eye, ArrowLeft, Search, ChevronLeft, ChevronRight, Image } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AccessibilityToolbar from '../components/AccessibilityToolbar';
import { onActivateKey } from '../lib/a11y';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia(s)`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function NoticiaCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
      <div className="h-48 animate-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-24 rounded-lg animate-shimmer" />
        <div className="h-5 w-full rounded-lg animate-shimmer" />
        <div className="h-4 w-3/4 rounded-lg animate-shimmer" />
      </div>
    </div>
  );
}

function NoticiaImageGallery({ noticia }) {
  const [currentImg, setCurrentImg] = useState(0);
  const hasImages = noticia.imagens && noticia.imagens.length > 0;
  
  if (!hasImages && !noticia.imagem_url) return null;
  
  if (!hasImages || noticia.imagens.length === 1) {
    return (
      <img
        src={hasImages ? noticia.imagens[0] : noticia.imagem_url}
        alt={noticia.titulo}
        className="w-full h-[300px] sm:h-[450px] object-cover border-b border-slate-100"
      />
    );
  }

  return (
    <div className="relative h-[300px] sm:h-[450px] overflow-hidden group border-b border-slate-100">
      <img
        src={noticia.imagens[currentImg]}
        alt={`${noticia.titulo} - ${currentImg + 1}`}
        className="w-full h-full object-cover transition-all duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentImg(prev => (prev - 1 + noticia.imagens.length) % noticia.imagens.length)}
        aria-label="Imagem anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 hover:bg-white text-slate-800 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-95"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => setCurrentImg(prev => (prev + 1) % noticia.imagens.length)}
        aria-label="Próxima imagem"
        className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 hover:bg-white text-slate-800 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-95"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3.5 py-2 rounded-full">
        {noticia.imagens.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentImg(i)}
            aria-label={`Ver imagem ${i + 1} de ${noticia.imagens.length}`}
            aria-current={i === currentImg}
            className={`h-2 rounded-full transition-all duration-300 ${i === currentImg ? 'bg-white w-5' : 'bg-white/50 w-2 hover:bg-white/85'}`}
          />
        ))}
      </div>

      {/* Number Pill Counter */}
      <span className="absolute top-4 left-4 text-xs font-bold bg-black/60 text-white px-3 py-1.5 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-md">
        <Image size={12} /> {currentImg + 1}/{noticia.imagens.length}
      </span>
    </div>
  );
}

export default function Noticias() {
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNoticia, setSelectedNoticia] = useState(null);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    async function fetchNoticias() {
      const { data, error } = await supabase
        .from('noticias')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao carregar notícias', error);
      } else {
        setNoticias(data || []);
      }
      setLoading(false);
    }
    fetchNoticias();
  }, []);

  const noticiasFiltradas = busca
    ? noticias.filter(n =>
        n.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        n.resumo.toLowerCase().includes(busca.toLowerCase())
      )
    : noticias;

  const destaque = noticiasFiltradas.find(n => n.destaque);
  const demais = noticiasFiltradas.filter(n => n.id !== destaque?.id);

  // Detail view
  if (selectedNoticia) {
    return (
      <div className="text-slate-800 antialiased relative min-h-screen overflow-x-hidden bg-slate-50">
        <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo principal</a>
        <Navbar />
        <main id="conteudo-principal" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
          <button
            onClick={() => setSelectedNoticia(null)}
            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 mb-6 transition-colors animate-slide-down"
          >
            <ArrowLeft size={16} />
            Voltar para notícias
          </button>

          <article className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-slate-100 animate-fade-in">
            <NoticiaImageGallery noticia={selectedNoticia} />
            <div className="p-6 sm:p-10">
              <div className="flex items-center gap-3 mb-4">
                {selectedNoticia.destaque && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    ⭐ Destaque
                  </span>
                )}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  {timeAgo(selectedNoticia.criado_em)}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4 leading-tight">
                {selectedNoticia.titulo}
              </h1>
              <p className="text-slate-600 text-lg font-medium mb-6 border-l-4 border-blue-500 pl-4">
                {selectedNoticia.resumo}
              </p>
              {selectedNoticia.conteudo && (
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedNoticia.conteudo}
                </div>
              )}
            </div>
          </article>
        </main>
        <Footer />
        <AccessibilityToolbar />
      </div>
    );
  }

  return (
    <div className="text-slate-800 antialiased relative min-h-screen overflow-x-hidden bg-slate-50">
      <a href="#conteudo-principal" className="skip-link">Pular para o conteúdo principal</a>
      <Navbar />

      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-50 via-blue-50/50 to-transparent -z-10" />

      <main id="conteudo-principal" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
        {/* Header */}
        <header className="mb-8 animate-slide-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                  <Newspaper className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                  <span className="text-gradient">Notícias</span>
                </h1>
              </div>
              <p className="text-slate-500 text-base sm:text-lg">
                Fique por dentro das novidades da saúde em Votorantim.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <label htmlFor="busca-noticias" className="sr-only">Buscar notícia</label>
              <input
                id="busca-noticias"
                type="text"
                placeholder="Buscar notícia..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="md:col-span-2 lg:col-span-3"><NoticiaCardSkeleton /></div>
            <NoticiaCardSkeleton />
            <NoticiaCardSkeleton />
            <NoticiaCardSkeleton />
          </div>
        ) : noticiasFiltradas.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm animate-scale-in">
            <div className="text-5xl mb-4 animate-float">📰</div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">
              {busca ? 'Nenhuma notícia encontrada' : 'Nenhuma notícia publicada'}
            </h3>
            <p className="text-slate-500 text-sm">
              {busca ? 'Tente buscar por outro termo.' : 'Aguarde novas publicações da equipe de saúde.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Destaque */}
            {destaque && (
              <div
                onClick={() => setSelectedNoticia(destaque)}
                role="button"
                tabIndex={0}
                aria-label={`Ler notícia em destaque: ${destaque.titulo}`}
                onKeyDown={onActivateKey(() => setSelectedNoticia(destaque))}
                className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-slate-100 cursor-pointer group hover:shadow-xl transition-all animate-slide-up"
              >
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {destaque.imagem_url ? (
                    <img
                      src={destaque.imagem_url}
                      alt={destaque.titulo}
                      className="w-full h-[250px] md:h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-[250px] md:h-full bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-500 flex items-center justify-center">
                      <Newspaper size={60} className="text-white/30" />
                    </div>
                  )}
                  <div className="p-6 sm:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        ⭐ Destaque
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {timeAgo(destaque.criado_em)}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-3 leading-tight group-hover:text-blue-700 transition-colors">
                      {destaque.titulo}
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-4">
                      {destaque.resumo}
                    </p>
                    <span className="text-blue-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Ler mais <ArrowLeft size={14} className="rotate-180" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Grid de notícias */}
            {demais.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4">Últimas Notícias</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {demais.map((noticia, index) => (
                    <div
                      key={noticia.id}
                      onClick={() => setSelectedNoticia(noticia)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ler notícia: ${noticia.titulo}`}
                      onKeyDown={onActivateKey(() => setSelectedNoticia(noticia))}
                      className={`glass-panel rounded-2xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer group hover:shadow-lg hover:border-slate-200 transition-all animate-slide-up stagger-${Math.min(index + 1, 6)}`}
                    >
                      {noticia.imagem_url ? (
                        <div className="overflow-hidden h-48">
                          <img
                            src={noticia.imagem_url}
                            alt={noticia.titulo}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                          <Newspaper size={40} className="text-slate-300" />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock size={11} />
                            {timeAgo(noticia.criado_em)}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 leading-tight mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
                          {noticia.titulo}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {noticia.resumo}
                        </p>
                        <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-blue-600 group-hover:gap-2 transition-all">
                          <Eye size={12} /> Ler mais
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
      <AccessibilityToolbar />
    </div>
  );
}
