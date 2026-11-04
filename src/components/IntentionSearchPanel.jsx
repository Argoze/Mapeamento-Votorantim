import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Info,
  Siren,
  Bone,
  Syringe,
  Stethoscope,
  Pill,
  Smile,
  Baby,
  Brain,
} from 'lucide-react';
import { INTENCOES, normalizeText } from '../utils/intentionSearch';

// Opções em destaque: cobrem os motivos mais comuns de busca, com seleção
// direta por clique (sem depender de o texto digitado "bater" com palavras-
// chave). O texto livre abaixo continua disponível pra quem não se encaixa
// em nenhuma delas, agora com sugestões visíveis em vez de um resultado
// que aparece (ou não) silenciosamente.
const TILES = [
  { label: 'Emergência grave', texto: 'emergência com risco de vida', intencaoId: 'hospital_emergencia', icon: Siren, cor: 'red' },
  { label: 'Machucado / Acidente', texto: 'me machuquei, caí ou torci', intencaoId: 'upa_urgencia', icon: Bone, cor: 'amber' },
  { label: 'Tomar vacina', texto: 'preciso tomar vacina', intencaoId: 'ubs_vacina', icon: Syringe, cor: 'blue' },
  { label: 'Consulta de rotina', texto: 'marcar consulta de rotina', intencaoId: 'ubs_consulta_rotina', icon: Stethoscope, cor: 'blue' },
  { label: 'Pegar remédio', texto: 'pegar remédio com receita', intencaoId: 'ubs_remedio', icon: Pill, cor: 'emerald' },
  { label: 'Dor de dente', texto: 'dor de dente, preciso de dentista', intencaoId: 'ubs_odonto', icon: Smile, cor: 'cyan' },
  { label: 'Pré-natal / Gestante', texto: 'iniciar pré-natal, estou grávida', intencaoId: 'ubs_consulta_rotina', icon: Baby, cor: 'pink' },
  { label: 'Saúde mental', texto: 'apoio psicológico, ansiedade', intencaoId: 'saude_mental', icon: Brain, cor: 'purple' },
];

const COR_TILE = {
  red: 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
  purple: 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400',
  pink: 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400',
};

// ---------------------------------------------------------------------
// Modal de seleção: é aqui que o cidadão escolhe um tile ou digita o que
// precisa. Ao selecionar, o modal se fecha sozinho e o resultado aparece
// como um card na página (ver IntentionResultCard, abaixo) — assim a seção
// fica compacta por padrão e só "cresce" quando o usuário pede.
export default function IntentionSearchPanel({
  open,
  onClose,
  intencaoTexto,
  setIntencaoTexto,
  intencaoAtiva,
  onSelectIntencao,
  onClearIntencao,
}) {
  const texto = intencaoTexto || '';
  const [showSugestoes, setShowSugestoes] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  // Sugestões de autocomplete: busca por substring (normalizada, sem acento)
  // no título ou nas palavras-chave de cada categoria. Diferente da versão
  // anterior, o usuário sempre VÊ o que vai ser selecionado antes de confirmar
  // — nada de classificação silenciosa em segundo plano.
  const sugestoes = useMemo(() => {
    const termo = normalizeText(texto);
    if (termo.length < 2) return [];
    return INTENCOES.filter((intencao) => {
      if (normalizeText(intencao.titulo).includes(termo)) return true;
      return intencao.keywords.some((kw) => normalizeText(kw).includes(termo));
    }).slice(0, 6);
  }, [texto]);

  if (!open) return null;

  const selecionarIntencao = (intencao, textoExibicao) => {
    setIntencaoTexto(textoExibicao);
    setShowSugestoes(false);
    onSelectIntencao({ matched: true, score: 100, ...intencao }, textoExibicao);
    onClose();
  };

  const handleTileClick = (tile) => {
    const intencao = INTENCOES.find((i) => i.id === tile.intencaoId);
    if (!intencao) return;
    selecionarIntencao(intencao, tile.texto);
  };

  const handleSugestaoClick = (intencao) => {
    selecionarIntencao(intencao, intencao.titulo);
  };

  const handleInputChange = (e) => {
    const valor = e.target.value;
    setIntencaoTexto(valor);
    setShowSugestoes(true);
    if (valor.trim().length === 0) onClearIntencao();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sugestoes.length > 0) handleSugestaoClick(sugestoes[0]);
    } else if (e.key === 'Escape') {
      setShowSugestoes(false);
    }
  };

  const handleClear = () => {
    setIntencaoTexto('');
    setShowSugestoes(false);
    onClearIntencao();
  };

  const tileAtivo = (tile) =>
    intencaoAtiva && intencaoAtiva.matched && intencaoAtiva.id === tile.intencaoId && texto === tile.texto;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="intencao-modal-titulo"
    >
      <div
        className="relative w-full max-w-xl my-6 sm:my-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="intencao-modal-titulo" className="text-lg font-extrabold text-slate-900 dark:text-slate-50 leading-tight">
              Não sabe o que procurar?
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Escolha abaixo o que você precisa, sem precisar saber nomes ou siglas técnicas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* Seleção por tiles (forma principal, confiável) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TILES.map((tile) => {
              const Icon = tile.icon;
              const ativo = tileAtivo(tile);
              return (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() => handleTileClick(tile)}
                  aria-pressed={ativo}
                  className={`group flex flex-col items-center gap-2 rounded-2xl p-3 border transition-all ${ativo
                    ? 'border-indigo-300 bg-indigo-50/70 dark:bg-indigo-500/10 dark:border-indigo-500/40 shadow-sm'
                    : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                >
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${COR_TILE[tile.cor]}`}>
                    <Icon size={19} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 text-center leading-tight">
                    {tile.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
              ou descreva com suas palavras
            </span>
            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
          </div>

          {/* Texto livre com autocomplete visível */}
          <div className="relative">
            <label htmlFor="campo-intencao" className="sr-only">
              Descreva o que você precisa
            </label>
            <input
              type="text"
              id="campo-intencao"
              value={texto}
              onChange={handleInputChange}
              onFocus={() => texto.trim().length >= 2 && setShowSugestoes(true)}
              onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoFocus
              placeholder="Ex: meu filho machucou o braço, dor de dente, consulta..."
              className="w-full pl-4 pr-12 py-3.5 text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm placeholder-slate-400 font-medium"
            />
            {texto && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Limpar"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            )}

            {showSugestoes && (
              <div
                role="listbox"
                className="absolute z-20 top-full mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-slide-down"
              >
                {sugestoes.length > 0 ? (
                  sugestoes.map((intencao) => (
                    <button
                      key={intencao.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSugestaoClick(intencao)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 border-b border-slate-50 dark:border-slate-800 last:border-b-0 transition-colors"
                    >
                      <span className="text-lg flex-shrink-0" aria-hidden="true">{intencao.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{intencao.titulo}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{intencao.badge.label}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Não encontramos nada parecido com "{texto}". Tente outro termo ou escolha uma das opções acima.
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <ArrowRight size={12} className="flex-shrink-0" />
            Prefere buscar por endereço? Use a busca no topo da página.
          </p>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

// ---------------------------------------------------------------------
// Card de resultado: renderizado na própria página (fora do modal) quando
// há uma intenção selecionada. Mostra a recomendação e permite trocar a
// resposta (reabrindo o modal) ou limpar e ver tudo de novo.
export function IntentionResultCard({ intencaoAtiva, totalRecomendadas, onTrocar, onClear }) {
  if (!intencaoAtiva || !intencaoAtiva.matched) return null;

  return (
    <div
      role="region"
      aria-label="Recomendação de unidade"
      className={`mb-8 rounded-2xl p-4 sm:p-5 border transition-all animate-scale-in ${intencaoAtiva.nivel === 'emergencia'
        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-950 dark:text-red-100'
        : intencaoAtiva.nivel === 'urgencia'
          ? 'bg-amber-50/90 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-950 dark:text-amber-100'
          : 'bg-blue-50/80 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-950 dark:text-blue-100'
        }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-2xl" role="img" aria-hidden="true">
            {intencaoAtiva.emoji}
          </span>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Local recomendado para seu caso:
            </span>
            <h4 className="text-base sm:text-lg font-extrabold leading-tight text-slate-900 dark:text-slate-50">
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

      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed mt-2 font-medium">
        {intencaoAtiva.explicacao}
      </p>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 flex items-start gap-1.5">
        <Info size={14} className="flex-shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
        <span>{intencaoAtiva.orientacao}</span>
      </p>

      {intencaoAtiva.alertaGrave && (
        <div className="mt-3 p-3 rounded-xl bg-red-100/90 dark:bg-red-500/15 border border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-200 text-xs font-bold flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <span>
            Atenção: Em caso de risco imediato à vida, ligue imediatamente para o{' '}
            <strong className="underline">SAMU (192)</strong> ou Bombeiros (193).
          </span>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Filtrando {totalRecomendadas} unidade(s) recomendada(s) no mapa</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTrocar}
            className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 underline transition-colors"
          >
            Trocar resposta
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 underline transition-colors"
          >
            <RotateCcw size={12} />
            Ver todas as unidades
          </button>
        </div>
      </div>
    </div>
  );
}