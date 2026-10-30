import { useState, useEffect } from 'react';
import { X, Navigation, Share2, Phone, Heart, MapPin, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import ReportarCorrecaoModal from './ReportarCorrecaoModal';

// Painel de detalhes de uma unidade/local, aberto ao clicar no marcador do mapa.
// Fica ao lado do mapa (como no Google Maps), ocupando a coluna esquerda do
// cartão do mapa — em vez de um popup pequeno ou um modal flutuando por cima
// de tudo. Precisa ser renderizado DENTRO do mesmo cartão `relative` que
// envolve o MapContainer, para se posicionar corretamente com `absolute`.
export default function UnidadeDetalheModal({ unidade, tipoInfo, badgeClass, isFavorito, onToggleFavorito, buildWhatsAppShareUrl, onClose }) {
  const [imagemAtiva, setImagemAtiva] = useState(0);
  // Guarda qual unidade estava aberta na última renderização, para saber
  // quando resetar a imagem em destaque sem precisar de um efeito à parte
  // (ajuste de estado durante a renderização, conforme recomendado pelo React).
  const [unidadeAnteriorId, setUnidadeAnteriorId] = useState(unidade?.id ?? null);
  if (unidade && unidade.id !== unidadeAnteriorId) {
    setUnidadeAnteriorId(unidade.id);
    setImagemAtiva(0);
  }

  // ---------- Leitura em voz alta (Web Speech API, nativa do navegador) ----------
  // Diferente do leitor de tela do sistema (NVDA/VoiceOver/TalkBack), que exige
  // configuração prévia do usuário, isso funciona em um clique, direto no card.
  const [lendoEmVozAlta, setLendoEmVozAlta] = useState(false);
  const suportaVozAlta = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function montarTextoParaLeitura(u, tipoInfoAtual) {
    const partes = [u.nome];
    if (tipoInfoAtual?.label) partes.push(tipoInfoAtual.label);
    if (u.endereco) partes.push(`Endereço: ${u.endereco}`);
    if (u.telefone) partes.push(`Telefone: ${u.telefone}`);
    return partes.join('. ');
  }

  function alternarLeitura() {
    if (!suportaVozAlta) return;

    if (lendoEmVozAlta) {
      window.speechSynthesis.cancel();
      setLendoEmVozAlta(false);
      return;
    }

    window.speechSynthesis.cancel(); // garante que não haja fala anterior presa
    const utterance = new SpeechSynthesisUtterance(montarTextoParaLeitura(unidade, tipoInfo));
    utterance.lang = 'pt-BR';
    utterance.rate = 0.95;
    utterance.onend = () => setLendoEmVozAlta(false);
    utterance.onerror = () => setLendoEmVozAlta(false);
    window.speechSynthesis.speak(utterance);
    setLendoEmVozAlta(true);
  }

  // Fecha com Esc, como os demais painéis do site, e interrompe a leitura em
  // voz alta ao trocar de unidade ou fechar o card (senão a voz continua
  // falando por cima do resto do site).
  useEffect(() => {
    if (!unidade) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.speechSynthesis?.cancel();
      setLendoEmVozAlta(false);
    };
  }, [unidade, onClose]);

  if (!unidade) return null;

  const imagens = unidade.imagens && unidade.imagens.length > 0 ? unidade.imagens : [];
  const temVariasImagens = imagens.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={unidade.nome}
      className="absolute inset-2 sm:inset-y-2 sm:left-2 sm:right-auto z-[1200] w-auto sm:w-[320px] md:w-[360px] bg-white rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar animate-slide-in-right"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar detalhes"
        className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
      >
        <X size={18} />
      </button>

      {imagens.length > 0 ? (
        <div className="relative">
          <img
            src={imagens[imagemAtiva]}
            alt={unidade.nome}
            className="w-full h-44 sm:h-40 object-cover rounded-t-2xl"
          />
          {temVariasImagens && (
            <>
              <button
                type="button"
                onClick={() => setImagemAtiva(i => (i === 0 ? imagens.length - 1 : i - 1))}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 hover:bg-white shadow-md flex items-center justify-center text-slate-700 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setImagemAtiva(i => (i === imagens.length - 1 ? 0 : i + 1))}
                aria-label="Próxima foto"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/85 hover:bg-white shadow-md flex items-center justify-center text-slate-700 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {imagens.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImagemAtiva(idx)}
                    aria-label={`Ver foto ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all ${idx === imagemAtiva ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full h-28 sm:h-24 rounded-t-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <MapPin size={32} className="text-slate-300" />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${badgeClass(tipoInfo.color)}`}>
            {tipoInfo.label}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {suportaVozAlta && (
              <button
                type="button"
                onClick={alternarLeitura}
                aria-pressed={lendoEmVozAlta}
                aria-label={lendoEmVozAlta ? `Parar leitura de ${unidade.nome}` : `Ouvir informações de ${unidade.nome}`}
                title={lendoEmVozAlta ? 'Parar leitura' : 'Ouvir'}
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${lendoEmVozAlta
                    ? 'bg-blue-600 text-white animate-pulse'
                    : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
              >
                {lendoEmVozAlta ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleFavorito(unidade.id)}
              className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
              title={isFavorito ? 'Remover dos favoritos' : 'Favoritar'}
              aria-label={isFavorito ? `Remover ${unidade.nome} dos favoritos` : `Favoritar ${unidade.nome}`}
              aria-pressed={isFavorito}
            >
              <Heart size={20} className={isFavorito ? 'fill-red-500 text-red-500' : ''} />
            </button>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-1.5 leading-snug">{unidade.nome}</h2>

        <p className="flex items-start gap-1.5 text-slate-500 text-sm mb-5">
          <MapPin size={15} className="mt-0.5 flex-shrink-0" />
          {unidade.endereco}
        </p>

        <div className="flex flex-col gap-2.5">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${unidade.lat},${unidade.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            <Navigation size={16} />
            Como chegar
          </a>
          <a
            href={buildWhatsAppShareUrl(unidade)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-sm transition-colors"
          >
            <Share2 size={16} />
            Compartilhar
          </a>
          {unidade.telefone ? (
            <a
              href={`tel:${unidade.telefone}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
            >
              <Phone size={16} />
              {unidade.telefone}
            </a>
          ) : (
            <span className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-50 text-slate-400 font-semibold text-sm">
              <Phone size={16} />
              Sem telefone cadastrado
            </span>
          )}
        </div>

        {/* Canal de correção: cidadão pode sinalizar informação errada */}
        <ReportarCorrecaoModal unidade={unidade} />
      </div>
    </div>
  );
}