import { X, Calendar, MapPin, ShieldAlert, Info, Star, Clock, Newspaper, Loader2, Check, ArrowLeft } from 'lucide-react';

/**
 * Modal de pré-visualização antes de publicar/salvar um evento ou notícia.
 * Mostra o conteúdo como ele vai aparecer publicamente e só publica/atualiza
 * de fato quando o usuário confirma.
 */
export default function PublishPreviewModal({ isOpen, onClose, onConfirm, type, data, loading, isEditing }) {
  if (!isOpen || !data) return null;

  const confirmLabel = isEditing ? 'Confirmar alterações' : 'Confirmar publicação';
  const loadingLabel = isEditing ? 'Salvando...' : 'Publicando...';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base">Confira antes de {isEditing ? 'salvar' : 'publicar'}</h3>
            <p className="text-slate-300 text-xs">É assim que vai aparecer para quem visitar o portal público.</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Preview content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {type === 'evento' && <EventoPreview data={data} />}
          {type === 'noticia' && <NoticiaPreview data={data} />}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 flex gap-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <ArrowLeft size={16} />
            Voltar e editar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventoPreview({ data }) {
  const hasImages = data.imagens && data.imagens.length > 0;
  return (
    <div className="glass-panel rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
      {hasImages && (
        <div className="relative h-40 overflow-hidden">
          <img src={data.imagens[0]} alt={data.titulo} className="w-full h-full object-cover" />
        </div>
      )}
      <div className={`absolute ${hasImages ? 'top-2 right-2' : 'top-0 right-0'} text-white text-[10px] font-bold px-3 py-1.5 ${hasImages ? 'rounded-lg' : 'rounded-bl-xl'} uppercase tracking-wider ${data.tipo === 'Urgente' ? 'bg-red-500' : 'bg-blue-500'}`}>
        {data.tipo}
      </div>
      <div className={`flex items-start gap-4 ${hasImages ? 'p-5' : 'p-5 mt-2'}`}>
        {!hasImages && (
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${data.tipo === 'Urgente' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            {data.tipo === 'Urgente' ? <ShieldAlert size={24} /> : <Info size={24} />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-slate-800 leading-tight">{data.titulo || <span className="text-slate-300 italic">(sem título)</span>}</h3>
          <p className="text-slate-600 mt-1.5 text-sm leading-relaxed">{data.descricao || <span className="text-slate-300 italic">(sem descrição)</span>}</p>
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar size={14} className="text-slate-400" />
              <span>{data.data_evento || <span className="italic text-slate-300">data não definida</span>}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <MapPin size={14} className="text-slate-400" />
              <span>{data.local_evento || <span className="italic text-slate-300">local não definido</span>}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoticiaPreview({ data }) {
  const image = data.imagens && data.imagens.length > 0 ? data.imagens[0] : null;
  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      {image ? (
        <img src={image} alt={data.titulo} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-500 flex items-center justify-center">
          <Newspaper size={40} className="text-white/30" />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {data.destaque && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Star size={10} className="fill-amber-700" /> Destaque
            </span>
          )}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock size={12} /> agora
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2 leading-tight">
          {data.titulo || <span className="text-slate-300 italic">(sem título)</span>}
        </h2>
        <p className="text-slate-600 text-sm font-medium mb-3 border-l-4 border-blue-500 pl-3">
          {data.resumo || <span className="text-slate-300 italic">(sem resumo)</span>}
        </p>
        {data.conteudo && (
          <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{data.conteudo}</div>
        )}
      </div>
    </div>
  );
}
