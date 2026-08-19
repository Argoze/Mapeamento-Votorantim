import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, checkAuth, logout, registrarAuditoria } from '../lib/supabase';
import {
  Megaphone, Stethoscope, LogOut, Calendar, Trash2, Pencil, XCircle,
  Plus, ExternalLink, MapPin, Loader2, Newspaper, Star, Eye
} from 'lucide-react';
import Toast from '../components/Toast';
import DateTimePickerModal from '../components/DateTimePickerModal';
import ImageUpload from '../components/ImageUpload';
import PublishPreviewModal from '../components/PublishPreviewModal';

export default function Saude() {
  const [currentUser, setCurrentUser] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [local, setLocal] = useState('');
  const [tipo, setTipo] = useState('Informativo');
  const [eventoImagens, setEventoImagens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Edição de evento
  const [editingEventoId, setEditingEventoId] = useState(null);
  const [showEventoPreview, setShowEventoPreview] = useState(false);

  // Eventos do usuário
  const [meusEventos, setMeusEventos] = useState([]);
  const [eventosLoading, setEventosLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Notícias
  const [noticiaTitle, setNoticiaTitle] = useState('');
  const [noticiaResumo, setNoticiaResumo] = useState('');
  const [noticiaConteudo, setNoticiaConteudo] = useState('');
  const [noticiaImagemUrl, setNoticiaImagemUrl] = useState([]);
  const [noticiaDestaque, setNoticiaDestaque] = useState(false);
  const [noticiaLoading, setNoticiaLoading] = useState(false);
  const [minhasNoticias, setMinhasNoticias] = useState([]);
  const [noticiasLoading, setNoticiasLoading] = useState(true);
  const [deleteNoticiaConfirm, setDeleteNoticiaConfirm] = useState(null);
  const [deleteNoticiaLoading, setDeleteNoticiaLoading] = useState(null);

  // Edição de notícia
  const [editingNoticiaId, setEditingNoticiaId] = useState(null);
  const [showNoticiaPreview, setShowNoticiaPreview] = useState(false);

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

  // Carregar eventos e notícias do usuário logado
  useEffect(() => {
    if (currentUser) {
      fetchMeusEventos();
      fetchMinhasNoticias();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function fetchMinhasNoticias() {
    setNoticiasLoading(true);
    const { data, error } = await supabase
      .from('noticias')
      .select('*')
      .eq('criado_por', currentUser.id)
      .order('criado_em', { ascending: false });

    if (!error) setMinhasNoticias(data || []);
    setNoticiasLoading(false);
  }

  // ---------- Evento: abrir preview / confirmar / editar / cancelar ----------

  const openEventoPreview = (e) => {
    e.preventDefault();
    setShowEventoPreview(true);
  };

  const confirmPublishEvento = async () => {
    setLoading(true);

    try {
      const payload = {
        titulo: titulo,
        descricao: desc,
        data_evento: dataEvento,
        local_evento: local,
        tipo: tipo,
        imagens: eventoImagens.length > 0 ? eventoImagens : null,
      };

      let error, data;
      if (editingEventoId) {
        ({ error } = await supabase.from('eventos').update(payload).eq('id', editingEventoId));
      } else {
        ({ data, error } = await supabase.from('eventos').insert([{ ...payload, criado_por: currentUser.id }]).select('id').single());
      }

      if (error) throw error;

      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: editingEventoId ? 'editar' : 'criar', entidade: 'evento',
        entidadeId: editingEventoId || data?.id, entidadeTitulo: payload.titulo,
      });

      setToast({ message: editingEventoId ? "Evento atualizado com sucesso!" : "Campanha publicada com sucesso!", type: "success" });
      resetEventoForm();
      setShowEventoPreview(false);
      fetchMeusEventos();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao publicar: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const resetEventoForm = () => {
    setTitulo(''); setDesc(''); setDataEvento(''); setLocal(''); setTipo('Informativo'); setEventoImagens([]);
    setEditingEventoId(null);
  };

  const handleEditEvento = (evento) => {
    setTitulo(evento.titulo);
    setDesc(evento.descricao);
    setDataEvento(evento.data_evento);
    setLocal(evento.local_evento);
    setTipo(evento.tipo);
    setEventoImagens(evento.imagens || []);
    setEditingEventoId(evento.id);
    setActiveTab('publicar');
  };

  const handleDeleteEvento = async (id) => {
    setDeleteLoading(id);
    const eventoAlvo = meusEventos.find(e => e.id === id);
    try {
      const { error } = await supabase.from('eventos').delete().eq('id', id);
      if (error) throw error;
      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'excluir', entidade: 'evento', entidadeId: id, entidadeTitulo: eventoAlvo?.titulo,
      });
      setToast({ message: "Evento excluído com sucesso!", type: "success" });
      setShowDeleteConfirm(null);
      if (editingEventoId === id) resetEventoForm();
      fetchMeusEventos();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao excluir: " + err.message, type: "error" });
    } finally {
      setDeleteLoading(null);
    }
  };

  // ---------- Notícia: abrir preview / confirmar / editar / cancelar ----------

  const openNoticiaPreview = (e) => {
    e.preventDefault();
    setShowNoticiaPreview(true);
  };

  const confirmPublishNoticia = async () => {
    setNoticiaLoading(true);

    try {
      const payload = {
        titulo: noticiaTitle,
        resumo: noticiaResumo,
        conteudo: noticiaConteudo || null,
        imagem_url: noticiaImagemUrl.length > 0 ? noticiaImagemUrl[0] : null,
        imagens: noticiaImagemUrl.length > 0 ? noticiaImagemUrl : null,
        destaque: noticiaDestaque,
      };

      let error, data;
      if (editingNoticiaId) {
        ({ error } = await supabase.from('noticias').update(payload).eq('id', editingNoticiaId));
      } else {
        ({ data, error } = await supabase.from('noticias').insert([{ ...payload, criado_por: currentUser.id }]).select('id').single());
      }

      if (error) throw error;

      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: editingNoticiaId ? 'editar' : 'criar', entidade: 'noticia',
        entidadeId: editingNoticiaId || data?.id, entidadeTitulo: payload.titulo,
      });

      setToast({ message: editingNoticiaId ? "Notícia atualizada com sucesso!" : "Notícia publicada com sucesso!", type: "success" });
      resetNoticiaForm();
      setShowNoticiaPreview(false);
      fetchMinhasNoticias();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao publicar notícia: " + err.message, type: "error" });
    } finally {
      setNoticiaLoading(false);
    }
  };

  const resetNoticiaForm = () => {
    setNoticiaTitle(''); setNoticiaResumo(''); setNoticiaConteudo(''); setNoticiaImagemUrl([]); setNoticiaDestaque(false);
    setEditingNoticiaId(null);
  };

  const handleEditNoticia = (noticia) => {
    setNoticiaTitle(noticia.titulo);
    setNoticiaResumo(noticia.resumo);
    setNoticiaConteudo(noticia.conteudo || '');
    setNoticiaImagemUrl(noticia.imagens && noticia.imagens.length > 0 ? noticia.imagens : (noticia.imagem_url ? [noticia.imagem_url] : []));
    setNoticiaDestaque(!!noticia.destaque);
    setEditingNoticiaId(noticia.id);
    setActiveTab('noticia');
  };

  const handleDeleteNoticia = async (id) => {
    setDeleteNoticiaLoading(id);
    const noticiaAlvo = minhasNoticias.find(n => n.id === id);
    try {
      const { error } = await supabase.from('noticias').delete().eq('id', id);
      if (error) throw error;
      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'excluir', entidade: 'noticia', entidadeId: id, entidadeTitulo: noticiaAlvo?.titulo,
      });
      setToast({ message: "Notícia excluída com sucesso!", type: "success" });
      setDeleteNoticiaConfirm(null);
      if (editingNoticiaId === id) resetNoticiaForm();
      fetchMinhasNoticias();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao excluir: " + err.message, type: "error" });
    } finally {
      setDeleteNoticiaLoading(null);
    }
  };

  const getUserInitials = () => {
    if (!currentUser?.email) return 'S';
    return currentUser.email.substring(0, 2).toUpperCase();
  };

  if (!currentUser) return null;

  const tabs = [
    { id: 'publicar', label: editingEventoId ? 'Editando Evento' : 'Publicar Evento', icon: editingEventoId ? Pencil : Megaphone },
    { id: 'meus', label: `Meus Eventos (${meusEventos.length})`, icon: Calendar },
    { id: 'noticia', label: editingNoticiaId ? 'Editando Notícia' : 'Publicar Notícia', icon: editingNoticiaId ? Pencil : Newspaper },
    { id: 'minhas_noticias', label: `Minhas Notícias (${minhasNoticias.length})`, icon: Eye },
  ];

  return (
    <div className="text-slate-800 antialiased min-h-screen bg-slate-50">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(formatted) => setDataEvento(formatted)}
      />

      {/* Preview Modals */}
      <PublishPreviewModal
        isOpen={showEventoPreview}
        onClose={() => setShowEventoPreview(false)}
        onConfirm={confirmPublishEvento}
        type="evento"
        loading={loading}
        isEditing={!!editingEventoId}
        data={{ titulo, descricao: desc, data_evento: dataEvento, local_evento: local, tipo, imagens: eventoImagens }}
      />
      <PublishPreviewModal
        isOpen={showNoticiaPreview}
        onClose={() => setShowNoticiaPreview(false)}
        onConfirm={confirmPublishNoticia}
        type="noticia"
        loading={noticiaLoading}
        isEditing={!!editingNoticiaId}
        data={{ titulo: noticiaTitle, resumo: noticiaResumo, conteudo: noticiaConteudo, imagens: noticiaImagemUrl, destaque: noticiaDestaque }}
      />

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
                <span className="hidden sm:block text-blue-200 text-xs">Publicação de alertas, campanhas e notícias</span>
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
        <div className="flex items-center gap-2 mb-6 animate-slide-down overflow-x-auto pb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tab: Publicar Evento */}
            {activeTab === 'publicar' && (
              <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${editingEventoId ? 'bg-amber-100' : 'bg-blue-100'}`}>
                      {editingEventoId ? <Pencil className="text-amber-600" size={20} /> : <Megaphone className="text-blue-600" size={20} />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{editingEventoId ? 'Editar alerta / campanha' : 'Publicar novo alerta / campanha'}</h2>
                      <p className="text-sm text-slate-500">{editingEventoId ? 'Altere os campos e confirme para salvar.' : 'O evento será publicado no portal público.'}</p>
                    </div>
                  </div>
                  {editingEventoId && (
                    <button
                      type="button"
                      onClick={resetEventoForm}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors shrink-0"
                    >
                      <XCircle size={14} /> Cancelar edição
                    </button>
                  )}
                </div>

                <form onSubmit={openEventoPreview} className="space-y-4">
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
                      <button
                        type="button"
                        onClick={() => setShowDatePicker(true)}
                        className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left transition-all hover:border-blue-400 hover:bg-blue-50/50 flex items-center gap-2 ${
                          dataEvento ? 'text-slate-800 font-medium' : 'text-slate-400'
                        }`}
                      >
                        <Calendar size={16} className="text-blue-500 flex-shrink-0" />
                        <span className="truncate">{dataEvento || 'Clique para selecionar...'}</span>
                      </button>
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

                  {/* Image Upload */}
                  <ImageUpload
                    images={eventoImagens}
                    onImagesChange={setEventoImagens}
                    maxImages={10}
                    folder="eventos"
                  />

                  <button type="submit" disabled={loading || !dataEvento} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {editingEventoId ? <Pencil size={18} /> : <Plus size={18} />}
                    {editingEventoId ? 'Revisar alterações' : 'Revisar e publicar'}
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
                      <div key={evento.id} className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-all group ${editingEventoId === evento.id ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100'}`}>
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
                              {evento.imagens && evento.imagens.length > 0 && (
                                <span className="text-purple-500 font-bold">📷 {evento.imagens.length} img</span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0 flex items-center gap-1.5">
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
                              <>
                                <button
                                  onClick={() => handleEditEvento(evento)}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-2 rounded-lg transition-all"
                                  title="Editar evento"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(evento.id)}
                                  className="opacity-0 group-hover:opacity-100 bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-all"
                                  title="Excluir evento"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Publicar Notícia */}
            {activeTab === 'noticia' && (
              <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${editingNoticiaId ? 'bg-amber-100' : 'bg-cyan-100'}`}>
                      {editingNoticiaId ? <Pencil className="text-amber-600" size={20} /> : <Newspaper className="text-cyan-600" size={20} />}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{editingNoticiaId ? 'Editar Notícia' : 'Publicar Notícia'}</h2>
                      <p className="text-sm text-slate-500">A notícia será exibida no portal público e na página inicial.</p>
                    </div>
                  </div>
                  {editingNoticiaId && (
                    <button
                      type="button"
                      onClick={resetNoticiaForm}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors shrink-0"
                    >
                      <XCircle size={14} /> Cancelar edição
                    </button>
                  )}
                </div>

                <form onSubmit={openNoticiaPreview} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Título da notícia</label>
                    <input type="text" required value={noticiaTitle} onChange={e => setNoticiaTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all" placeholder="Ex: Novo posto de vacinação aberto no centro" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Resumo</label>
                    <textarea required rows="2" value={noticiaResumo} onChange={e => setNoticiaResumo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none" placeholder="Breve descrição que aparece na listagem..."></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Conteúdo completo (opcional)</label>
                    <textarea rows="5" value={noticiaConteudo} onChange={e => setNoticiaConteudo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all resize-none" placeholder="Texto completo da notícia..."></textarea>
                  </div>

                  {/* Image Upload for news */}
                  <ImageUpload
                    images={noticiaImagemUrl}
                    onImagesChange={setNoticiaImagemUrl}
                    maxImages={10}
                    folder="noticias"
                  />

                  {/* Destaque toggle */}
                  <div
                    className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => setNoticiaDestaque(!noticiaDestaque)}
                  >
                    <div className="flex items-center gap-3">
                      <Star size={18} className={noticiaDestaque ? 'text-amber-500 fill-amber-500' : 'text-amber-400'} />
                      <div>
                        <span className="text-sm font-semibold text-amber-800">Marcar como destaque</span>
                        <p className="text-xs text-amber-600">Aparece no carousel da página inicial</p>
                      </div>
                    </div>
                    <div className={`w-11 h-6 rounded-full transition-all relative ${noticiaDestaque ? 'bg-amber-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${noticiaDestaque ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
                    </div>
                  </div>

                  <button type="submit" disabled={noticiaLoading} className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {editingNoticiaId ? <Pencil size={18} /> : <Plus size={18} />}
                    {editingNoticiaId ? 'Revisar alterações' : 'Revisar e publicar'}
                  </button>
                </form>
              </div>
            )}

            {/* Tab: Minhas Notícias */}
            {activeTab === 'minhas_noticias' && (
              <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Eye className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Minhas Notícias</h2>
                    <p className="text-sm text-slate-500">{minhasNoticias.length} notícia(s) publicada(s) por você</p>
                  </div>
                </div>

                {noticiasLoading ? (
                  <div className="text-center py-10 text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Carregando suas notícias...
                  </div>
                ) : minhasNoticias.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-3 animate-float">📰</div>
                    <p className="text-slate-500 font-medium">Você ainda não publicou nenhuma notícia.</p>
                    <button onClick={() => setActiveTab('noticia')} className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                      Publicar primeira notícia →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                    {minhasNoticias.map(noticia => (
                      <div key={noticia.id} className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-all group ${editingNoticiaId === noticia.id ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {noticia.imagem_url && (
                              <img src={noticia.imagem_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {noticia.destaque && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⭐ Destaque</span>
                                )}
                                <h4 className="font-bold text-slate-800 text-sm truncate">{noticia.titulo}</h4>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-1">{noticia.resumo}</p>
                              <span className="text-[11px] text-slate-400 mt-1 block">
                                {new Date(noticia.criado_em).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>

                          <div className="flex-shrink-0 flex items-center gap-1.5">
                            {deleteNoticiaConfirm === noticia.id ? (
                              <div className="flex items-center gap-2 animate-fade-in">
                                <button
                                  onClick={() => handleDeleteNoticia(noticia.id)}
                                  disabled={deleteNoticiaLoading === noticia.id}
                                  className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                >
                                  {deleteNoticiaLoading === noticia.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => setDeleteNoticiaConfirm(null)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditNoticia(noticia)}
                                  className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-2 rounded-lg transition-all"
                                  title="Editar notícia"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => setDeleteNoticiaConfirm(noticia.id)}
                                  className="opacity-0 group-hover:opacity-100 bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-all"
                                  title="Excluir notícia"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
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
                <Link to="/noticias" target="_blank" className="flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-medium">
                  <ExternalLink size={14} /> Portal de notícias
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
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Suas notícias</span>
                  <span className="text-lg font-bold text-cyan-600">{minhasNoticias.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
