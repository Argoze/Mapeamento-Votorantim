export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm font-semibold text-slate-700">
              Trabalho de Conclusão de Curso — FACENS
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Gustavo Argoze Lopes da Costa • Victora Mariucha Raulino de Araruna
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>© {new Date().getFullYear()}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>Saúde Votorantim</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
