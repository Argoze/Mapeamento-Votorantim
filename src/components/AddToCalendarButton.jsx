import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  CalendarPlus,
  Download,
  ExternalLink,
  Check,
  X,
  Clock,
  MapPin,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  downloadIcsFile,
  parseEventoDate,
} from '../utils/calendar';

export default function AddToCalendarButton({ evento, variant = 'default' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  // Fecha o modal ao pressionar a tecla Escape
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Impede a rolagem do fundo enquanto o modal estiver aberto
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!evento) return null;

  const parsed = parseEventoDate(evento.data_evento, evento.criado_em);
  const googleUrl = generateGoogleCalendarUrl(evento);
  const outlookUrl = generateOutlookCalendarUrl(evento);

  const handleDownloadIcs = () => {
    downloadIcsFile(evento);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const isCompact = variant === 'compact';

  const modalContent = isOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${evento.id}`}
    >
      {/* Caixa do Modal */}
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo com gradiente azul e botão de fechar */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                <CalendarPlus size={22} className="text-white" />
              </div>
              <div>
                <h3 id={`modal-title-${evento.id}`} className="font-extrabold text-lg leading-tight">
                  Adicionar ao Calendário
                </h3>
                <p className="text-blue-100 text-xs mt-0.5 flex items-center gap-1">
                  <Sparkles size={12} />
                  Salve um lembrete para não perder a data
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar"
              className="h-8 w-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Resumo do Evento/Campanha */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-snug line-clamp-2">
              {evento.titulo}
            </h4>

            <div className="mt-3 space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-blue-700">
                <Clock size={14} className="flex-shrink-0 text-blue-600" />
                <span>
                  {evento.data_evento ||
                    (parsed.isAllDay ? 'Evento de dia inteiro' : 'Data a confirmar')}
                </span>
              </div>

              {evento.local_evento && (
                <div className="flex items-center gap-2 text-slate-500">
                  <MapPin size={14} className="flex-shrink-0 text-slate-400" />
                  <span className="truncate">{evento.local_evento}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
            Escolha onde deseja salvar:
          </p>

          {/* Opções de Calendário */}
          <div className="space-y-2.5">
            {/* Opção 1: Google Calendar (Destaque Principal) */}
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Calendar size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <span>Google Agenda</span>
                  <ExternalLink size={13} className="text-blue-100" />
                </div>
                <p className="text-[11px] text-blue-100 leading-snug">
                  Adicionar diretamente à sua conta Google (web ou aplicativo)
                </p>
              </div>
            </a>

            {/* Opção 2: Apple Calendar / Celular / Outlook (.ICS) */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              className={`w-full group flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left ${
                downloaded
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm hover:shadow'
              }`}
            >
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  downloaded
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                }`}
              >
                {downloaded ? <Check size={20} /> : <Smartphone size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <span>Apple Calendar / Celular (.ICS)</span>
                  {downloaded && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Arquivo baixado!
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Arquivo para iPhone, Android, iPad, Mac ou Outlook
                </p>
              </div>
              <Download size={16} className={downloaded ? 'text-emerald-600' : 'text-slate-400'} />
            </button>

            {/* Opção 3: Outlook Web */}
            <a
              href={outlookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="group flex items-center gap-3.5 p-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-sm hover:shadow transition-all text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
                <CalendarPlus size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <span>Outlook / Microsoft 365</span>
                  <ExternalLink size={13} className="text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Salvar via Outlook Web no navegador
                </p>
              </div>
            </a>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors py-1 px-4"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Botão Gatilho no Card */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center gap-2 font-semibold transition-all rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          isCompact
            ? 'px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
            : 'px-4 py-2.5 text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-md'
        }`}
        title="Adicionar esta data ao seu calendário"
      >
        <CalendarPlus size={isCompact ? 14 : 16} />
        <span>Adicionar ao calendário</span>
      </button>

      {/* Modal renderizado no document.body via Portal — NUNCA cortado por overflow-hidden ou transform */}
      {typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}
