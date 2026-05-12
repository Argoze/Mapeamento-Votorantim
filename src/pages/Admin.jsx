import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, checkAuth, logout } from '../lib/supabase';
import { Info } from 'lucide-react';

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [local, setLocal] = useState('');
  const [tipo, setTipo] = useState('Informativo');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  useEffect(() => {
    async function verifyAuth() {
      const authData = await checkAuth();
      if (!authData || authData.role !== 'adm') {
        navigate('/login');
        return;
      }
      setCurrentUser(authData.user);
    }
    verifyAuth();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const { error } = await supabase.from('eventos').insert([
        {
          titulo: titulo,
          descricao: desc,
          data_evento: dataEvento,
          local_evento: local,
          tipo: tipo,
          criado_por: currentUser.id
        }
      ]);

      if (error) throw error;

      setMsg({ text: "Campanha publicada com sucesso!", type: "success" });
      setTitulo(''); setDesc(''); setDataEvento(''); setLocal(''); setTipo('Informativo');
    } catch (err) {
      console.error(err);
      setMsg({ text: "Erro ao publicar: " + err.message, type: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg({ text: '', type: '' }), 5000);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="text-slate-800 antialiased min-h-screen pb-10">
      <nav className="bg-indigo-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-white font-bold text-xl">Painel ADM</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-indigo-100 text-sm hidden sm:inline-block">Perfil: administrador</span>
              <button onClick={logout} className="bg-indigo-800 hover:bg-indigo-900 text-white px-3 py-2 rounded-md text-sm font-medium transition">Sair</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-xl mb-8 flex gap-3">
          <Info className="flex-shrink-0" />
          <div>
            <strong>Acesso administrativo concedido.</strong> Você possui controle total sobre os mapas, alertas e gerenciamento do sistema.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2">Publicar novo alerta / campanha</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título</label>
                <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea required rows="3" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data/horário</label>
                  <input type="text" required placeholder="Ex: 20 de Maio, 08h às 16h" value={dataEvento} onChange={e => setDataEvento(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Local</label>
                  <input type="text" required placeholder="Ex: UBS Vila Nova" value={local} onChange={e => setLocal(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de aviso</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="Informativo">Informativo (azul)</option>
                  <option value="Urgente">Urgente (vermelho)</option>
                </select>
              </div>
              
              {msg.text && (
                <div className={`text-sm font-semibold ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {msg.text}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-70">
                {loading ? 'Publicando...' : 'Publicar campanha'}
              </button>
            </form>
          </div>
          
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200 opacity-70">
              <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Cadastrar UBS/ESF no mapa</h2>
              <p className="text-sm text-slate-500 mb-4">Para adicionar um novo posto de saúde no mapa, preencha as coordenadas geográficas precisas.</p>
              <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm font-medium">
                Em construção. Módulo de geocodificação em andamento.
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Acesso rápido</h2>
              <div className="flex gap-4">
                <Link to="/eventos" target="_blank" className="text-indigo-600 hover:underline">Visualizar portal de campanhas</Link>
                <Link to="/" target="_blank" className="text-indigo-600 hover:underline">Ver mapa da cidade</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
