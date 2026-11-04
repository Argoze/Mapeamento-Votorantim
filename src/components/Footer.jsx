import { Link } from 'react-router-dom';
import { Heart, MapPin, Newspaper, Megaphone } from 'lucide-react';

export default function Footer() {
  const links = [
    { to: '/', label: 'Mapa de unidades', icon: MapPin },
    { to: '/eventos', label: 'Campanhas', icon: Megaphone },
    { to: '/noticias', label: 'Notícias', icon: Newspaper },
  ];

  return (
    <footer className="mt-20 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      {/* Faixa de destaque */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/15 dark:bg-white/10 dark:bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
              <Heart className="h-5 w-5 text-white" fill="white" />
            </div>
            <div>
              <p className="text-white font-bold text-base sm:text-lg">Cuidando de Votorantim, sempre!</p>
              <p className="text-indigo-100 text-sm">Uma cidade mais saudável, com você.</p>
            </div>
          </div>
          <Link
            to="/"
            className="bg-white dark:bg-slate-900 text-indigo-700 font-bold text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            Conheça mais sobre os serviços →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                <Heart className="h-4 w-4 text-white" fill="white" />
              </div>
              <span className="font-extrabold text-slate-900 dark:text-slate-50">Saúde Votorantim</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 leading-relaxed">
              Mapeamento interativo da rede municipal de saúde e serviços públicos de Votorantim-SP.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Navegação</p>
            <ul className="space-y-2">
              {links.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <Link to={to} className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 dark:text-slate-600 hover:text-indigo-700 transition-colors font-medium">
                    <Icon size={14} className="text-slate-400 dark:text-slate-500" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Sobre o projeto</p>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Trabalho de Conclusão de Curso — FACENS
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
              Gustavo Argoze Lopes da Costa • Victora Mariucha Raulino de Araruna
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span>© {new Date().getFullYear()} Saúde Votorantim — Secretaria de Saúde de Votorantim</span>
          <span>Feito para facilitar o acesso à saúde pública.</span>
        </div>
      </div>
    </footer>
  );
}