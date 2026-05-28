import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, checkAuth, logout } from '../lib/supabase';
import {
  Megaphone, Stethoscope, LogOut, Calendar, Trash2,
  Plus, ExternalLink, MapPin, Loader2
} from 'lucide-react';
import Toast from '../components/Toast';

export default function Saude() {
  const [currentUser, setCurrentUser] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [local, setLocal] = useState('');
  const [tipo, setTipo] = useState('Informativo');
  const [loading, setLoading] = useState(false);

  // Eventos do usuário
  const [meusEventos, setMeusEventos] = useState([]);
  const [eventosLoading, setEventosLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('publicar');

  const navigate = useNavigate();

  useEffect(() => {
    async function verifyAuth() {
      const authData = await checkAuth();
      if (!authData || (authData.role !== 'saude' && authData.role !== 'adm')) {
        navigate('/login');
        return;
      }
      setCurrentUser(authData.user);
    }
    verifyAuth();
  }, [navigate]);

  // Carregar eventos do usuário logado
  useEffect(() => {
    if (currentUser) {
      fetchMeusEventos();
    }
  }, [currentUser]);

  async function fetchMeusEventos() {
    setEventosLoading(true);
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('criado_por', currentUser.id)
      .order('criado_em', { ascending: false });

    if (!error) setMeusEventos(data || []);
    setEventosLoading(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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

      setToast({ message: "Campanha publicada com sucesso!", type: "success" });
      setTitulo(''); setDesc(''); setDataEvento(''); setLocal(''); setTipo('Informativo');
      fetchMeusEventos();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao publicar: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvento = async (id) => {
    setDeleteLoading(id);
    try {
      const { error } = await supabase.from('eventos').delete().eq('id', id);
      if (error) throw error;
      setToast({ message: "Evento excluído com sucesso!", type: "success" });
      setShowDeleteConfirm(null);
      fetchMeusEventos();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao excluir: " + err.message, type: "error" });
    } finally {
      setDeleteLoading(null);
    }
  };

  const getUserInitials = () => {
    if (!currentUser?.email) return 'S';
    return currentUser.email.substring(0, 2).toUpperCase();
  };

  if (!currentUser) return null;

  return (
    <div className="text-slate-800 antialiased min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Navbar */}
      <nav className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white/15 rounded-xl flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-lg">Painel da Saúde</span>
                <span className="hidden sm:block text-blue-200 text-xs">Publicação de alertas e campanhas</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                  {getUserInitials()}
                </div>
                <span className="text-blue-100 text-sm font-medium">{currentUser.email}</span>
              </div>
              <button
                id="btn-logout-saude"
                onClick={logout}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 animate-slide-down">
          <button
            onClick={() => setActiveTab('publicar')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'publicar'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Megaphone size={16} />
            Publicar Evento
          </button>
          <button
            onClick={() => setActiveTab('meus')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'meus'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Calendar size={16} />
            Meus Eventos ({meusEventos.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tab: Publicar */}
            {activeTab === 'publicar' && (
              <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Megaphone className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Publicar novo alerta / campanha</h2>
                    <p className="text-sm text-slate-500">O evento será publicado no portal público.</p>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título</label>
                    <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ex: Campanha de Vacinação contra Gripe" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição</label>
                    <textarea required rows="3" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none" placeholder="Descreva os detalhes do evento..."></textarea>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data/horário</label>
                      <input type="text" required placeholder="Ex: 20 de Maio, 08h às 16h" value={dataEvento} onChange={e => setDataEvento(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Local</label>
                      <input type="text" required placeholder="Ex: UBS Vila Nova" value={local} onChange={e => setLocal(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de aviso</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                      <option value="Informativo">📘 Informativo (azul)</option>
                      <option value="Urgente">🔴 Urgente (vermelho)</option>
                    </select>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Publicar campanha
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Meus Eventos */}
            {activeTab === 'meus' && (
              <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Calendar className="text-orange-600" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Meus Eventos</h2>
                    <p className="text-sm text-slate-500">{meusEventos.length} evento(s) publicado(s) por você</p>
                  </div>
                </div>

                {eventosLoading ? (
                  <div className="text-center py-10 text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Carregando seus eventos...
                  </div>
                ) : meusEventos.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3 animate-float">📝</div>
                    <p className="text-slate-500 font-medium">Você ainda não publicou nenhum evento.</p>
                    <button onClick={() => setActiveTab('publicar')} className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                      Publicar primeiro evento →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                    {meusEventos.map(evento => (
                      <div key={evento.id} className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-all group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                                evento.tipo === 'Urgente' ? 'bg-red-500' : 'bg-blue-500'
                              }`}>
                                {evento.tipo}
                              </span>
                              <h4 className="font-bold text-slate-800 text-sm truncate">{evento.titulo}</h4>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">{evento.descricao}</p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1"><Calendar size={11} /> {evento.data_evento}</span>
                              <span className="flex items-center gap-1"><MapPin size={11} /> {evento.local_evento}</span>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            {showDeleteConfirm === evento.id ? (
                              <div className="flex items-center gap-2 animate-fade-in">
                                <button
                                  onClick={() => handleDeleteEvento(evento.id)}
                                  disabled={deleteLoading === evento.id}
                                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                >
                                  {deleteLoading === evento.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(null)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDeleteConfirm(evento.id)}
                                className="opacity-0 group-hover:opacity-100 bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-all"
                                title="Excluir evento"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 animate-slide-in-right">
            {/* Quick Links */}
            <div className="glass-panel p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Acesso rápido</h3>
              <div className="space-y-2">
                <Link to="/eventos" target="_blank" className="flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-medium">
                  <ExternalLink size={14} /> Portal de campanhas
                </Link>
                <Link to="/" target="_blank" className="flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-medium">
                  <ExternalLink size={14} /> Mapa da cidade
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="glass-panel p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Resumo</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Seus eventos</span>
                  <span className="text-lg font-bold text-slate-800">{meusEventos.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Urgentes</span>
                  <span className="text-lg font-bold text-red-600">{meusEventos.filter(e => e.tipo === 'Urgente').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Informativos</span>
                  <span className="text-lg font-bold text-blue-600">{meusEventos.filter(e => e.tipo === 'Informativo').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
