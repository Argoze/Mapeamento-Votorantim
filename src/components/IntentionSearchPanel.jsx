import { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Navigation,
  X,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Clock,
  ShieldAlert,
  Info,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { SUGESTOES_RAPIDAS, classificarIntencao } from '../utils/intentionSearch';

export default function IntentionSearchPanel({
  intencaoTexto,
  setIntencaoTexto,
  intencaoAtiva,
  onSelectIntencao,
  onClearIntencao,
  queryEndereco,
  setQueryEndereco,
  onSearchEndereco,
  onGeolocation,
  loading,
  error,
  totalRecomendadas,
}) {
  const [debouncedInput, setDebouncedInput] = useState(intencaoTexto || '');

  // Atualiza a intenção quando o usuário digita (com debounce de 250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (debouncedInput.trim().length >= 3) {
        const resultado = classificarIntencao(debouncedInput);
        if (resultado && resultado.matched) {
          onSelectIntencao(resultado, debouncedInput);
        } else {
          onSelectIntencao(null, debouncedInput);
        }
      } else if (debouncedInput.trim().length === 0) {
        onClearIntencao();
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [debouncedInput]);

  // Sincroniza se o estado pai mudar externamente
  useEffect(() => {
    setDebouncedInput(intencaoTexto || '');
  }, [intencaoTexto]);

  const handleSugestaoClick = (sugestao) => {
    setDebouncedInput(sugestao.query);
    setIntencaoTexto(sugestao.query);
    const resultado = classificarIntencao(sugestao.query);
    if (resultado && resultado.matched) {
      onSelectIntencao(resultado, sugestao.query);
    }
  };

  const handleClear = () => {
    setDebouncedInput('');
    setIntencaoTexto('');
    onClearIntencao();
  };

  return (
    <div
      className="glass-panel p-5 sm:p-7 rounded-3xl shadow-xl border border-white/60 mb-6 animate-slide-up"
      style={{ animationDelay: '0.15s' }}
    >
      {/* 1. Seção Principal: Busca por Intenção (Linguagem Natural) */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label
            htmlFor="campo-intencao"
            className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles size={16} />
            </div>
            <span>Preciso de ajuda com...</span>
          </label>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
            <HelpCircle size={13} />
            Não precisa saber siglas técnicas
          </span>
        </div>

        {/* Input de Intenção com botão de limpar */}
        <div className="relative">
          <input
            type="text"
            id="campo-intencao"
            value={debouncedInput}
            onChange={(e) => {
              setDebouncedInput(e.target.value);
              setIntencaoTexto(e.target.value);
            }}
            placeholder="Ex: meu filho machucou o braço, preciso tomar vacina, dor de dente..."
            className="w-full pl-5 pr-12 py-4 text-slate-800 bg-white/95 border-2 border-slate-200/90 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm text-base placeholder-slate-400 font-medium"
          />

          {debouncedInput && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpar intenção"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Sugestões Rápidas (Pills de 1 clique) */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
            Sugestões:
          </span>
          {SUGESTOES_RAPIDAS.map((sugestao) => {
            const isSelected = debouncedInput.toLowerCase() === sugestao.query.toLowerCase();
            return (
              <button
                key={sugestao.label}
                type="button"
                onClick={() => handleSugestaoClick(sugestao)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border-slate-200/90'
                }`}
              >
                {sugestao.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Card de Recomendação Inteligente (Exibido quando intenção é reconhecida) */}
      {intencaoAtiva && intencaoAtiva.matched && (
        <div
          role="region"
          aria-label="Recomendação de unidade"
          className={`mb-5 rounded-2xl p-4 sm:p-5 border transition-all animate-scale-in ${
            intencaoAtiva.nivel === 'emergencia'
              ? 'bg-red-50 border-red-200 text-red-950'
              : intencaoAtiva.nivel === 'urgencia'
              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
              : 'bg-blue-50/80 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-2xl" role="img" aria-hidden="true">
                {intencaoAtiva.emoji}
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Local recomendado para seu caso:
                </span>
                <h4 className="text-base sm:text-lg font-extrabold leading-tight text-slate-900">
                  {intencaoAtiva.titulo}
                </h4>
              </div>
            </div>

            <span
              className={`text-[11px] font-extrabold px-3 py-1 rounded-full flex-shrink-0 shadow-sm ${intencaoAtiva.badge.cor}`}
            >
              {intencaoAtiva.badge.label}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2 font-medium">
            {intencaoAtiva.explicacao}
          </p>

          <p className="text-xs text-slate-500 leading-relaxed mt-1 flex items-start gap-1.5">
            <Info size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
            <span>{intencaoAtiva.orientacao}</span>
          </p>

          {/* Alerta de Gravidade Extrema */}
          {intencaoAtiva.alertaGrave && (
            <div className="mt-3 p-3 rounded-xl bg-red-100/90 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
              <span>
                Atenção: Em caso de risco imediato à vida, ligue imediatamente para o{' '}
                <strong className="underline">SAMU (192)</strong> ou Bombeiros (193).
              </span>
            </div>
          )}

          {/* Rodapé da recomendação com status e botão de reset */}
          <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Filtrando {totalRecomendadas} unidade(s) recomendada(s) no mapa
              </span>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              <RotateCcw size={12} />
              Ver todas as unidades
            </button>
          </div>
        </div>
      )}

      {/* 3. Seção Secundária: Endereço do Cidadão e Geolocalização */}
      <div className="pt-4 border-t border-slate-200/80">
        <label htmlFor="endereco" className="block text-xs font-bold text-slate-600 mb-1.5">
          Para ver a mais próxima de você, informe seu endereço ou bairro:
        </label>
        <div className="flex flex-col md:flex-row gap-2.5 items-center">
          <div className="relative w-full md:flex-1">
            <input
              type="text"
              id="endereco"
              value={queryEndereco}
              onChange={(e) => setQueryEndereco(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchEndereco()}
              placeholder="Ex: rua João Walter, Centro, Votorantim"
              className="w-full pl-10 pr-4 py-3 text-slate-800 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-sm text-sm font-medium"
            />
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="w-full md:w-auto flex gap-2">
            <button
              type="button"
              id="btn-search-address"
              onClick={onSearchEndereco}
              disabled={loading}
              className="flex-1 md:flex-none md:px-5 h-[44px] bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex justify-center items-center gap-1.5 disabled:opacity-60"
            >
              <Search size={15} />
              <span>{loading ? 'Buscando...' : 'Localizar'}</span>
            </button>

            <button
              type="button"
              id="btn-geolocation"
              onClick={onGeolocation}
              disabled={loading}
              className="flex-1 md:flex-none md:px-4 h-[44px] bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-sm border border-slate-200 transition-all flex justify-center items-center gap-1.5 disabled:opacity-60"
              title="Usar minha localização atual (GPS)"
            >
              <Navigation size={14} className="text-blue-600" />
              <span>Minha Localização</span>
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-3 bg-red-50 text-red-600 text-xs font-semibold p-3 rounded-xl border border-red-100 animate-slide-down flex items-center gap-2"
          >
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
