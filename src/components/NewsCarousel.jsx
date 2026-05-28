import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Newspaper, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function NewsCarousel({ noticias = [] }) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const destaques = noticias.filter(n => n.destaque);
  const items = destaques.length > 0 ? destaques : noticias.slice(0, 5);

  const nextSlide = useCallback(() => {
    if (items.length <= 1) return;
    setCurrent(prev => (prev + 1) % items.length);
  }, [items.length]);

  const prevSlide = () => {
    if (items.length <= 1) return;
    setCurrent(prev => (prev - 1 + items.length) % items.length);
  };

  // Auto-play
  useEffect(() => {
    if (isHovered || items.length <= 1) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [isHovered, nextSlide, items.length]);

  if (items.length === 0) return null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-xl border border-white/20 group mb-6 animate-slide-up"
      style={{ animationDelay: '0.05s' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      <div className="relative h-[260px] sm:h-[300px]">
        {items.map((noticia, index) => (
          <div
            key={noticia.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === current
                ? 'opacity-100 translate-x-0'
                : index < current
                ? 'opacity-0 -translate-x-full'
                : 'opacity-0 translate-x-full'
            }`}
          >
            {/* Background Image or Gradient */}
            {noticia.imagem_url ? (
              <img
                src={noticia.imagem_url}
                alt={noticia.titulo}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500" />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold bg-blue-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase tracking-wider">
                  📰 Informativo
                </span>
                <span className="text-[11px] text-white/70 flex items-center gap-1">
                  <Clock size={11} />
                  {timeAgo(noticia.criado_em)}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold leading-tight mb-2 line-clamp-2 drop-shadow-lg">
                {noticia.titulo}
              </h3>
              <p className="text-sm text-white/80 line-clamp-2 max-w-2xl">
                {noticia.resumo}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/15 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dots + Link */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-6 sm:px-8">
        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === current
                  ? 'bg-white w-6'
                  : 'bg-white/40 hover:bg-white/60 w-2'
              }`}
            />
          ))}
        </div>

        {/* See all link */}
        <Link
          to="/noticias"
          className="flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg"
        >
          Ver todas
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
