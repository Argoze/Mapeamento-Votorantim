import { useEffect, useState, useRef } from 'react';
import { Accessibility, Plus, Minus, Contrast, X, RotateCcw } from 'lucide-react';

// Painel flutuante de acessibilidade para as páginas públicas (cidadão).
// Duas frentes cobertas aqui, conforme e-MAG e WCAG (W3C):
//  - Tamanho de fonte ajustável (3 níveis, persistido no navegador).
//  - Alto contraste (persistido no navegador).
// Ambos operáveis 100% pelo teclado, com rótulos (aria-label) para leitor de tela.

const FONT_KEY = 'votorantim-a11y-fonte';
const CONTRASTE_KEY = 'votorantim-a11y-contraste';

const NIVEIS_FONTE = ['normal', 'grande', 'extra-grande'];
const CLASSE_POR_NIVEL = {
  normal: '',
  grande: 'a11y-fonte-grande',
  'extra-grande': 'a11y-fonte-extra-grande',
};

function lerPreferenciaFonte() {
  try {
    const salvo = localStorage.getItem(FONT_KEY);
    return NIVEIS_FONTE.includes(salvo) ? salvo : 'normal';
  } catch {
    return 'normal';
  }
}

function lerPreferenciaContraste() {
  try {
    return localStorage.getItem(CONTRASTE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function AccessibilityToolbar() {
  const [aberto, setAberto] = useState(false);
  const [nivelFonte, setNivelFonte] = useState(lerPreferenciaFonte);
  const [altoContraste, setAltoContraste] = useState(lerPreferenciaContraste);
  const painelRef = useRef(null);
  const botaoRef = useRef(null);

  // Aplica as classes no <html> para que valham para o site inteiro, não só este componente.
  useEffect(() => {
    const root = document.documentElement;
    Object.values(CLASSE_POR_NIVEL).forEach(c => c && root.classList.remove(c));
    const classe = CLASSE_POR_NIVEL[nivelFonte];
    if (classe) root.classList.add(classe);
    try {
      localStorage.setItem(FONT_KEY, nivelFonte);
    } catch {
      // localStorage indisponível — preferência não persiste, mas continua aplicada nesta sessão.
    }
  }, [nivelFonte]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-alto-contraste', altoContraste);
    try {
      localStorage.setItem(CONTRASTE_KEY, altoContraste ? '1' : '0');
    } catch {
      // localStorage indisponível — preferência não persiste, mas continua aplicada nesta sessão.
    }
  }, [altoContraste]);

  // Fecha o painel com a tecla Esc, devolvendo o foco ao botão que o abriu.
  useEffect(() => {
    if (!aberto) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [aberto]);

  const aumentarFonte = () => {
    const idx = NIVEIS_FONTE.indexOf(nivelFonte);
    if (idx < NIVEIS_FONTE.length - 1) setNivelFonte(NIVEIS_FONTE[idx + 1]);
  };
  const diminuirFonte = () => {
    const idx = NIVEIS_FONTE.indexOf(nivelFonte);
    if (idx > 0) setNivelFonte(NIVEIS_FONTE[idx - 1]);
  };
  const resetar = () => {
    setNivelFonte('normal');
    setAltoContraste(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[1000]">
      {aberto && (
        <div
          ref={painelRef}
          role="dialog"
          aria-label="Opções de acessibilidade"
          className="absolute bottom-16 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 mb-1"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800">Acessibilidade</h2>
            <button
              type="button"
              onClick={() => { setAberto(false); botaoRef.current?.focus(); }}
              aria-label="Fechar painel de acessibilidade"
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-600 mb-2" id="a11y-fonte-label">Tamanho do texto</p>
            <div className="flex items-center gap-2" role="group" aria-labelledby="a11y-fonte-label">
              <button
                type="button"
                onClick={diminuirFonte}
                disabled={nivelFonte === 'normal'}
                aria-label="Diminuir tamanho do texto"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus size={14} /> A
              </button>
              <span className="text-xs text-slate-500 w-20 text-center" aria-live="polite">
                {nivelFonte === 'normal' ? 'Normal' : nivelFonte === 'grande' ? 'Grande' : 'Extra'}
              </span>
              <button
                type="button"
                onClick={aumentarFonte}
                disabled={nivelFonte === 'extra-grande'}
                aria-label="Aumentar tamanho do texto"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus size={14} /> A
              </button>
            </div>
          </div>

          <div className="mb-3">
            <button
              type="button"
              onClick={() => setAltoContraste(v => !v)}
              aria-pressed={altoContraste}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                altoContraste
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Contrast size={16} />
                Alto contraste
              </span>
              <span className="text-xs">{altoContraste ? 'Ativado' : 'Desativado'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={resetar}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors pt-1"
          >
            <RotateCcw size={12} />
            Restaurar padrão
          </button>
        </div>
      )}

      <button
        ref={botaoRef}
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-expanded={aberto}
        aria-label="Opções de acessibilidade (tamanho do texto e alto contraste)"
        className="h-12 w-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
      >
        <Accessibility size={22} />
      </button>
    </div>
  );
}
