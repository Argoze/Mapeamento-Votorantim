import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Megaphone, Newspaper, Building2, Menu, X } from 'lucide-react';
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

  // Menu mobile em tela cheia: trava o scroll do body enquanto ele está
  // aberto, senão a página por baixo rola junto (e o próprio menu, sendo
  // fixed inset-0, não precisa rolar o body pra nada).
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const links = [
    { to: '/', label: 'Mapa', icon: MapPin },
    { to: '/equipamentos', label: 'Equipamentos', icon: Building2 },
    { to: '/eventos', label: 'Campanhas', icon: Megaphone },
    { to: '/noticias', label: 'Notícias', icon: Newspaper },
  ];

  const isActive = (path) => location.pathname === path;

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
            <img src="/logo-votorantim.png" alt="Prefeitura de Votorantim" className="h-10 w-10 object-contain" />

            <div className="flex flex-col min-w-0">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-tight truncate">
                Votorantim <span className="text-gradient">Inteligente</span>
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

            <ThemeToggle className="text-slate-500 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-300 bg-transparent dark:bg-slate-950/30 hover:bg-indigo-50/60 dark:hover:bg-indigo-500/20" />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle className="text-slate-500 dark:text-slate-100 bg-transparent dark:bg-slate-950/30 hover:bg-slate-100 dark:hover:bg-slate-800" />
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

      </div>

      {/* Mobile Menu — tela cheia (fora do max-w-7xl acima de propósito, pra
          cobrir a viewport inteira). O botão de acessibilidade não entra
          aqui: o atalho flutuante (AccessibilityToolbar.jsx) já cumpre esse
          papel em qualquer página, inclusive com o menu fechado. */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu-panel"
          className="md:hidden fixed inset-0 z-[60] bg-white dark:bg-slate-900 flex flex-col animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 min-w-0">
              <img src="/logo-votorantim.png" alt="Prefeitura de Votorantim" className="h-9 w-9 object-contain" />
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-50 truncate">
                Votorantim <span className="text-gradient">Inteligente</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu de navegação"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6" aria-label="Navegação principal">
            <div className="flex flex-col gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive(to) ? 'page' : undefined}
                  className={`flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-bold transition-all ${isActive(to)
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  <Icon size={22} />
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </nav>
  );
}