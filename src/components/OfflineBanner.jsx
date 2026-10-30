import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOffline(true);
      setShowReconnected(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  if (showReconnected) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="fixed top-16 left-0 right-0 z-40 bg-emerald-600 text-white text-xs sm:text-sm font-semibold py-2 px-4 shadow-md flex items-center justify-center gap-2 border-b border-emerald-700 animate-slide-down"
      >
        <Wifi size={15} className="text-emerald-200 flex-shrink-0" />
        <span>Conexão restabelecida! Você está online novamente.</span>
      </aside>
    );
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-16 left-0 right-0 z-40 bg-amber-500 text-amber-950 text-xs sm:text-sm font-medium py-2 px-4 shadow-md flex items-center justify-center gap-2 border-b border-amber-600/30 animate-slide-down"
    >
      <WifiOff size={15} className="text-amber-900 flex-shrink-0 animate-pulse" />
      <span>
        <strong className="font-bold">Modo Offline:</strong> Você está sem conexão. Exibindo dados salvos em cache; algumas informações podem não ser as mais recentes.
      </span>
    </aside>
  );
}
