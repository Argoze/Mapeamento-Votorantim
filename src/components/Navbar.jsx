import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Megaphone, Newspaper, Menu, X, Heart, Accessibility } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { to: '/', label: 'Mapa', icon: MapPin },
    { to: '/eventos', label: 'Campanhas', icon: Megaphone },
    { to: '/noticias', label: 'Notícias', icon: Newspaper },
  ];

  const isActive = (path) => location.pathname === path;

  // Abre o painel de acessibilidade flutuante (o botão real fica fixo no
  // canto da tela — ver AccessibilityToolbar.jsx); este atalho na navbar só
  // clica nele programaticamente pra manter um ponto de entrada visível
  // igual o resto do app, sem duplicar toda a lógica do painel aqui.
  const abrirAcessibilidade = () => {
    document.getElementById('botao-acessibilidade')?.click();
  };

  return (
    <nav
      id="navbar-main"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg border-b border-slate-100 dark:border-slate-800'
        : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group min-w-0">
            <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
              <Heart className="h-5 w-5 text-white" fill="white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-tight truncate">
                Saúde <span className="text-gradient">Votorantim</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight hidden sm:block">
                Rede Municipal de Saúde
              </span>
            </div>
            <span className="hidden lg:flex items-center gap-2 pl-3 ml-1 border-l border-slate-200 dark:border-slate-700 flex-shrink-0">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                Secretaria de<br />Saúde de Votorantim
              </span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-current={isActive(to) ? 'page' : undefined}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive(to)
                  ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10'
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </div>

          {/* Ações à direita */}
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={abrirAcessibilidade}
              aria-label="Abrir opções de acessibilidade"
              title="Acessibilidade"
              className="h-10 w-10 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10 transition-colors"
            >
              <Accessibility size={18} />
            </button>
            <ThemeToggle className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10" />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" />
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu-panel"
              aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu-panel" className="md:hidden pb-4 animate-slide-down">
            <div className="flex flex-col gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-slate-100 dark:border-slate-800">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive(to) ? 'page' : undefined}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive(to)
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); abrirAcessibilidade(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
              >
                <Accessibility size={18} />
                Acessibilidade
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}