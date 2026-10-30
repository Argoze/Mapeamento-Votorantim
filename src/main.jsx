import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.jsx';

// Registra o Service Worker do PWA com atualização automática
registerSW({
  onNeedRefresh() {
    console.log('[PWA] Nova versão da aplicação disponível.');
  },
  onOfflineReady() {
    console.log('[PWA] Aplicativo pronto para uso offline.');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
