import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Map from './pages/Map';
import Events from './pages/Events';
import Noticias from './pages/Noticias';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Saude from './pages/Saude';
import OfflineBanner from './components/OfflineBanner';

function App() {
  return (
    <BrowserRouter>
      {/* Banner de status offline/online */}
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Map />} />
        <Route path="/eventos" element={<Events />} />
        <Route path="/noticias" element={<Noticias />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/saude" element={<Saude />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
