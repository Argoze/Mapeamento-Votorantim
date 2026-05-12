import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Map from './pages/Map';
import Events from './pages/Events';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Saude from './pages/Saude';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Map />} />
        <Route path="/eventos" element={<Events />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/saude" element={<Saude />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
