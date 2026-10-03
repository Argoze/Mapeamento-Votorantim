import { useEffect, useState, useRef } from 'react';
import {
  Accessibility, Plus, Minus, Contrast, X, RotateCcw,
  AlignJustify, Link2, ScanEye, ImageOff,
} from 'lucide-react';

// Painel flutuante de acessibilidade para as páginas públicas (cidadão).
// Frentes cobertas aqui, conforme e-MAG e WCAG (W3C):
//  - Tamanho de fonte ajustável (3 níveis, persistido no navegador).
//  - Alto contraste (persistido no navegador).
//  - Espaçamento de texto ampliado (linhas/palavras) — ajuda dislexia e baixa visão.
//  - Destacar links — para quem tem dificuldade de distinguir link de texto comum.
//  - Guia de leitura — barra que acompanha o cursor, ajuda déficit de atenção.
//  - Ocultar imagens — reduz ruído visual e carga cognitiva.
// Todos operáveis 100% pelo teclado, com rótulos (aria-label) para leitor de tela,
// e todas as preferências persistem no navegador (localStorage).

const FONT_KEY = 'votorantim-a11y-fonte';
const CONTRASTE_KEY = 'votorantim-a11y-contraste';
const ESPACAMENTO_KEY = 'votorantim-a11y-espacamento';
const DESTACAR_LINKS_KEY = 'votorantim-a11y-destacar-links';
const GUIA_LEITURA_KEY = 'votorantim-a11y-guia-leitura';
const OCULTAR_IMAGENS_KEY = 'votorantim-a11y-ocultar-imagens';

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

function lerBooleano(chave) {
  try {
    return localStorage.getItem(chave) === '1';
  } catch {
    return false;
  }
}

function lerPreferenciaContraste() {
  return lerBooleano(CONTRASTE_KEY);
}

export default function AccessibilityToolbar() {
  const [aberto, setAberto] = useState(false);
  const [nivelFonte, setNivelFonte] = useState(lerPreferenciaFonte);
  const [altoContraste, setAltoContraste] = useState(lerPreferenciaContraste);
  const [espacamentoAumentado, setEspacamentoAumentado] = useState(() => lerBooleano(ESPACAMENTO_KEY));
  const [destacarLinks, setDestacarLinks] = useState(() => lerBooleano(DESTACAR_LINKS_KEY));
  const [guiaLeitura, setGuiaLeitura] = useState(() => lerBooleano(GUIA_LEITURA_KEY));
  const [ocultarImagens, setOcultarImagens] = useState(() => lerBooleano(OCULTAR_IMAGENS_KEY));
  const painelRef = useRef(null);
  const botaoRef = useRef(null);
  const guiaBarraRef = useRef(null);

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

  // Persiste e aplica cada preferência booleana simples (espaçamento, links, imagens)
  // via classe no <html>, seguindo o mesmo padrão do alto contraste.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-espacamento-aumentado', espacamentoAumentado);
    try {
      localStorage.setItem(ESPACAMENTO_KEY, espacamentoAumentado ? '1' : '0');
    } catch {
      // localStorage indisponível — preferência não persiste, mas continua aplicada nesta sessão.
    }
  }, [espacamentoAumentado]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-destacar-links', destacarLinks);
    try {
      localStorage.setItem(DESTACAR_LINKS_KEY, destacarLinks ? '1' : '0');
    } catch {
      // localStorage indisponível — preferência não persiste, mas continua aplicada nesta sessão.
    }
  }, [destacarLinks]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-ocultar-imagens', ocultarImagens);
    try {
      localStorage.setItem(OCULTAR_IMAGENS_KEY, ocultarImagens ? '1' : '0');
    } catch {
      // localStorage indisponível — preferência não persiste, mas continua aplicada nesta sessão.
    }
  }, [ocultarImagens]);

  // Guia de leitura: cria uma barra fixa que acompanha a posição vertical do
  // cursor, ajudando quem tem déficit de atenção a manter a linha de leitura.
  useEffect(() => {
    try {
      localStorage.setItem(GUIA_LEITURA_KEY, guiaLeitura ? '1' : '0');
    } catch {
      // localStorage indisponível — preferência não persiste, mas continua aplicada nesta sessão.
    }

    if (!guiaLeitura) return;

    const barra = document.createElement('div');
    barra.className = 'a11y-guia-leitura-barra';
    barra.setAttribute('aria-hidden', 'true');
    document.body.appendChild(barra);
    guiaBarraRef.current = barra;

    const posicionar = (y) => {
      barra.style.top = `${y - 20}px`;
    };
    posicionar(window.innerHeight / 2);

    const handleMouseMove = (e) => posicionar(e.clientY);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      barra.remove();
      guiaBarraRef.current = null;
    };
  }, [guiaLeitura]);

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
    setEspacamentoAumentado(false);
    setDestacarLinks(false);
    setGuiaLeitura(false);
    setOcultarImagens(false);
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

          <div className="mb-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setEspacamentoAumentado(v => !v)}
              aria-pressed={espacamentoAumentado}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                espacamentoAumentado
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlignJustify size={16} />
                Espaçamento de texto
              </span>
              <span className="text-xs">{espacamentoAumentado ? 'Ativado' : 'Desativado'}</span>
            </button>

            <button
              type="button"
              onClick={() => setDestacarLinks(v => !v)}
              aria-pressed={destacarLinks}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                destacarLinks
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Link2 size={16} />
                Destacar links
              </span>
              <span className="text-xs">{destacarLinks ? 'Ativado' : 'Desativado'}</span>
            </button>

            <button
              type="button"
              onClick={() => setGuiaLeitura(v => !v)}
              aria-pressed={guiaLeitura}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                guiaLeitura
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <ScanEye size={16} />
                Guia de leitura
              </span>
              <span className="text-xs">{guiaLeitura ? 'Ativado' : 'Desativado'}</span>
            </button>

            <button
              type="button"
              onClick={() => setOcultarImagens(v => !v)}
              aria-pressed={ocultarImagens}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                ocultarImagens
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <ImageOff size={16} />
                Ocultar imagens
              </span>
              <span className="text-xs">{ocultarImagens ? 'Ativado' : 'Desativado'}</span>
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
        aria-label="Opções de acessibilidade"
        className="h-12 w-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
      >
        <Accessibility size={22} />
      </button>
    </div>
  );
}
