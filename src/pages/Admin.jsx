import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, checkAuth, logout, createUserWithProfile } from '../lib/supabase';
import { 
  Megaphone, Users, Shield, LogOut, Calendar, Trash2, 
  Plus, ExternalLink, LayoutDashboard, ChevronDown,
  MapPin, AlertTriangle, Loader2
} from 'lucide-react';
import Toast from '../components/Toast';

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [local, setLocal] = useState('');
  const [tipo, setTipo] = useState('Informativo');
  const [loading, setLoading] = useState(false);
  
  // States para criação de usuário
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserSenha, setNewUserSenha] = useState('');
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserRole, setNewUserRole] = useState('saude');
  const [userLoading, setUserLoading] = useState(false);

  // States para listagem e exclusão de eventos
  const [eventos, setEventos] = useState([]);
  const [eventosLoading, setEventosLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);

  // Active panel for mobile
  const [activePanel, setActivePanel] = useState('eventos');

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

  // Carregar eventos
  useEffect(() => {
    fetchEventos();
  }, []);

  async function fetchEventos() {
    setEventosLoading(true);
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('criado_em', { ascending: false });
    
    if (!error) setEventos(data || []);
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
      fetchEventos();
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
      fetchEventos();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao excluir: " + err.message, type: "error" });
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserLoading(true);

    try {
      if (newUserSenha.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      }
      
      await createUserWithProfile(newUserEmail, newUserSenha, newUserRole, newUserNome);
      
      setToast({ message: "Usuário criado com sucesso! Ele já pode acessar o sistema.", type: "success" });
      setNewUserEmail(''); setNewUserSenha(''); setNewUserNome(''); setNewUserRole('saude');
    } catch (err) {
      console.error(err);
      setToast({ message: err.message, type: "error" });
    } finally {
      setUserLoading(false);
    }
  };

  const getUserInitials = () => {
    if (!currentUser?.email) return 'AD';
    return currentUser.email.substring(0, 2).toUpperCase();
  };

  if (!currentUser) return null;

  const sidebarLinks = [
    { id: 'eventos', label: 'Publicar Evento', icon: Megaphone },
    { id: 'gerenciar', label: 'Gerenciar Eventos', icon: Calendar },
    { id: 'usuarios', label: 'Cadastrar Usuário', icon: Users },
  ];

  return (
    <div className="text-slate-800 antialiased min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Navbar */}
      <nav className="bg-gradient-to-r from-indigo-700 to-indigo-800 shadow-lg fixed top-0 left-0 right-0 z-40">
        <div className="max-w-full mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white/15 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-lg">Painel Administrativo</span>
                <span className="hidden sm:block text-indigo-200 text-xs">Controle total do sistema</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                <div className="h-7 w-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {getUserInitials()}
                </div>
                <span className="text-indigo-100 text-sm font-medium">{currentUser.email}</span>
              </div>
              <button
                id="btn-logout-admin"
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

      <div className="pt-16 flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-64px)] fixed left-0 top-16 p-4">
          <div className="flex flex-col gap-1 flex-1">
            {sidebarLinks.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActivePanel(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                  activePanel === id
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4">Acesso rápido</p>
            <Link to="/eventos" target="_blank" className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-medium">
              <ExternalLink size={14} /> Portal de campanhas
            </Link>
            <Link to="/" target="_blank" className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-medium">
              <ExternalLink size={14} /> Mapa da cidade
            </Link>
          </div>
        </aside>

        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-slate-200 z-30 flex">
          {sidebarLinks.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-all border-b-2 ${
                activePanel === id
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-slate-500'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 mt-12 lg:mt-0">
          <div className="max-w-4xl mx-auto">
            
            {/* Alerta de acesso */}
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-xl mb-6 flex items-start gap-3 animate-slide-down text-sm">
              <LayoutDashboard className="flex-shrink-0 mt-0.5" size={18} />
              <div>
                <strong>Acesso administrativo concedido.</strong>
                <span className="text-indigo-600"> Você possui controle total sobre alertas, eventos e gerenciamento de usuários.</span>
              </div>
            </div>

            {/* Panel: Publicar Evento */}
            {activePanel === 'eventos' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Megaphone className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Publicar novo alerta / campanha</h2>
                      <p className="text-sm text-slate-500">O evento será publicado no portal público imediatamente.</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título</label>
                      <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Ex: Campanha de Vacinação contra Gripe" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descrição</label>
                      <textarea required rows="3" value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" placeholder="Descreva os detalhes do evento..."></textarea>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data/horário</label>
                        <input type="text" required placeholder="Ex: 20 de Maio, 08h às 16h" value={dataEvento} onChange={e => setDataEvento(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Local</label>
                        <input type="text" required placeholder="Ex: UBS Vila Nova" value={local} onChange={e => setLocal(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de aviso</label>
                      <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                        <option value="Informativo">📘 Informativo (azul)</option>
                        <option value="Urgente">🔴 Urgente (vermelho)</option>
                      </select>
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
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
              </div>
            )}

            {/* Panel: Gerenciar Eventos */}
            {activePanel === 'gerenciar' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Calendar className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Gerenciar Eventos</h2>
                      <p className="text-sm text-slate-500">{eventos.length} evento(s) publicado(s)</p>
                    </div>
                  </div>

                  {eventosLoading ? (
                    <div className="text-center py-10 text-slate-500">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                      Carregando eventos...
                    </div>
                  ) : eventos.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-3">📋</div>
                      <p className="text-slate-500 font-medium">Nenhum evento publicado ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                      {eventos.map(evento => (
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
              </div>
            )}

            {/* Panel: Cadastrar Usuário */}
            {activePanel === 'usuarios' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Users className="text-emerald-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Cadastrar novo usuário</h2>
                      <p className="text-sm text-slate-500">O novo usuário poderá acessar o sistema imediatamente.</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome completo</label>
                      <input type="text" required value={newUserNome} onChange={e => setNewUserNome(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Ex: Dr. João Silva" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail corporativo</label>
                      <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="joao@votorantim.sp.gov.br" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Senha provisória</label>
                        <input type="password" required value={newUserSenha} onChange={e => setNewUserSenha(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Mín. 6 caracteres" minLength="6" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Permissão</label>
                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                          <option value="saude">🩺 Saúde (Apenas alertas)</option>
                          <option value="adm">🛡️ Admin (Acesso total)</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" disabled={userLoading} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {userLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Criando usuário...
                        </>
                      ) : (
                        <>
                          <Plus size={18} />
                          Criar conta
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
