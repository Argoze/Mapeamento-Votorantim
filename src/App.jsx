import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// A home (Mapa) fica com import normal — é a primeira tela que o cidadão vê.
// Todas as outras páginas carregam sob demanda (code-splitting por rota),
// principalmente /admin e /saude: são telas grandes, usadas só pela equipe
// interna, que antes eram baixadas por TODO cidadão que só queria ver o
// mapa. Isso reduz bastante o tamanho do primeiro carregamento.
import Map from './pages/Map';
import OfflineBanner from './components/OfflineBanner';

const Events = lazy(() => import('./pages/Events'));
const Noticias = lazy(() => import('./pages/Noticias'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const Saude = lazy(() => import('./pages/Saude'));
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'));

function CarregandoPagina() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="h-10 w-10 rounded-full border-4 border-indigo-200 dark:border-indigo-500/30 border-t-indigo-600 animate-spin" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* Banner de status offline/online */}
      <OfflineBanner />
      <Suspense fallback={<CarregandoPagina />}>
        <Routes>
          <Route path="/" element={<Map />} />
          <Route path="/eventos" element={<Events />} />
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/login" element={<Login />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/saude" element={<Saude />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;