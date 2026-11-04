// Modo escuro: persistido no navegador (mesmo padrão de localStorage já usado
// pela barra de acessibilidade em lib/a11y.js), com a preferência do sistema
// operacional como valor inicial quando o usuário nunca escolheu nada.
const THEME_KEY = 'votorantim-saude-tema';

export function getTemaInicial() {
    try {
        const salvo = localStorage.getItem(THEME_KEY);
        if (salvo === 'escuro' || salvo === 'claro') return salvo;
    } catch {
        // localStorage indisponível (modo privado/restrito) — cai pro padrão do sistema.
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    }
    return 'claro';
}

export function aplicarTema(tema) {
    const raiz = document.documentElement;
    if (tema === 'escuro') {
        raiz.classList.add('dark');
    } else {
        raiz.classList.remove('dark');
    }
    try {
        localStorage.setItem(THEME_KEY, tema);
    } catch {
        // localStorage indisponível — o tema ainda se aplica nesta sessão, só não persiste.
    }
}