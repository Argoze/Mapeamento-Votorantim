import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, checkAuth, logout, createUserWithProfile, listUsersAdmin, setUserStatusAdmin, deleteUserAdmin, registrarAuditoria } from '../lib/supabase';
import {
  Megaphone, Users, Shield, LogOut, Calendar, Trash2, Pencil, XCircle,
  Plus, ExternalLink, LayoutDashboard, Newspaper,
  MapPin, Loader2, Star, Eye, Building2,
  Clock, PhoneOff, ImageOff, FileWarning, ArrowRight,
  Upload, FileSpreadsheet, Download, CheckSquare, Square, AlertTriangle,
  History, MessageSquareWarning, CheckCheck, Ban,
  Phone, SkipForward, PartyPopper, ClipboardList, Camera, Timer,
  TrendingUp, BarChart3, MapPinned, Flame, Filter, Bell, KeyRound, UserX, UserCheck
} from 'lucide-react';
import Toast from '../components/Toast';
import DateTimePickerModal from '../components/DateTimePickerModal';
import ImageUpload from '../components/ImageUpload';
import PublishPreviewModal from '../components/PublishPreviewModal';
import LocationMapPicker from '../components/LocationMapPicker';
import CampanhaTemplateBar from '../components/CampanhaTemplateBar';
import AdminSidebar from '../components/AdminSidebar';

import { parseCsvTexto, construirLinhasImportacao, gerarCsvModelo } from '../lib/importUnidades';
import { csvUnidades, csvEventos, csvNoticias, csvCorrecoes, csvAuditoria, csvMetricas, baixarCsv, nomeArquivoComData } from '../lib/exportarDados';

function tempoRelativo(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} dia(s)`;
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function deriveTipoFromNome(nomeSalvo) {
  const nome = (nomeSalvo || '').trim();
  const lower = nome.toLowerCase();
  const prefixos = [
    { prefix: 'hospital', tipo: 'Hospital' },
    { prefix: 'esf', tipo: 'ESF' },
    { prefix: 'upa', tipo: 'UPA' },
    { prefix: 'ubs', tipo: 'UBS' },
  ];
  for (const { prefix, tipo } of prefixos) {
    if (lower.startsWith(prefix)) {
      return { tipo, resto: nome.substring(prefix.length).trim() };
    }
  }
  return { tipo: 'UBS', resto: nome };
}

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [desc, setDesc] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [local, setLocal] = useState('');
  const [tipo, setTipo] = useState('Informativo');
  const [eventoImagens, setEventoImagens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Agendamento de publicação: em vez de ir ao ar imediatamente, a campanha
  // só aparece no portal público a partir da data/hora escolhida aqui — ver
  // agendamento_templates_setup.sql (coluna eventos.publicar_em).
  const [agendarPublicacao, setAgendarPublicacao] = useState(false);
  const [publicarEm, setPublicarEm] = useState('');

  // Edição de evento
  const [editingEventoId, setEditingEventoId] = useState(null);
  const [showEventoPreview, setShowEventoPreview] = useState(false);

  // States para criação de usuário
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserSenha, setNewUserSenha] = useState('');
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserRole, setNewUserRole] = useState('saude');
  const [userLoading, setUserLoading] = useState(false);
  const [mostrarCriarUsuario, setMostrarCriarUsuario] = useState(false);

  // States para a lista de contas (reset de senha, desativar/reativar, excluir)
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(true);
  const [usuariosErro, setUsuariosErro] = useState(null);
  const [acaoUsuarioId, setAcaoUsuarioId] = useState(null);
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState(null);

  // States para listagem e exclusão de eventos
  const [eventos, setEventos] = useState([]);
  const [eventosLoading, setEventosLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // States para notícias
  const [noticiaTitle, setNoticiaTitle] = useState('');
  const [noticiaResumo, setNoticiaResumo] = useState('');
  const [noticiaConteudo, setNoticiaConteudo] = useState('');
  const [noticiaImagemUrl, setNoticiaImagemUrl] = useState([]);
  const [noticiaDestaque, setNoticiaDestaque] = useState(false);
  const [noticiaLoading, setNoticiaLoading] = useState(false);
  const [noticias, setNoticias] = useState([]);
  const [noticiasLoading, setNoticiasLoading] = useState(true);
  const [deleteNoticiaConfirm, setDeleteNoticiaConfirm] = useState(null);
  const [deleteNoticiaLoading, setDeleteNoticiaLoading] = useState(null);

  // Edição de notícia
  const [editingNoticiaId, setEditingNoticiaId] = useState(null);
  const [showNoticiaPreview, setShowNoticiaPreview] = useState(false);

  // States para locais/unidades
  const [unidadeNome, setUnidadeNome] = useState('');
  const [unidadeCategoria, setUnidadeCategoria] = useState('Saúde');
  const [unidadeTipo, setUnidadeTipo] = useState('UBS');
  const [unidadeEndereco, setUnidadeEndereco] = useState('');
  const [unidadeLat, setUnidadeLat] = useState('');
  const [unidadeLng, setUnidadeLng] = useState('');
  const [unidadeTelefone, setUnidadeTelefone] = useState('');
  const [unidadeImagens, setUnidadeImagens] = useState([]);
  const [unidadePublishLoading, setUnidadePublishLoading] = useState(false);
  const [adminUnidades, setAdminUnidades] = useState([]);
  const [adminUnidadesLoading, setAdminUnidadesLoading] = useState(true);
  const [deleteUnidadeConfirm, setDeleteUnidadeConfirm] = useState(null);
  const [deleteUnidadeLoading, setDeleteUnidadeLoading] = useState(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [mapaRecenterToken, setMapaRecenterToken] = useState(0);

  // Edição de unidade
  const [editingUnidadeId, setEditingUnidadeId] = useState(null);

  // Completar cadastro em lote (telefone/foto) — fila focada, sem precisar
  // abrir o formulário completo de edição para cada local. Pensada para
  // preenchimento manual (nome + endereço já dão pra buscar no Google Maps),
  // sem depender de nenhuma API paga.
  const [completarUnidadeId, setCompletarUnidadeId] = useState(null);
  const [completarTelefone, setCompletarTelefone] = useState('');
  const [completarImagens, setCompletarImagens] = useState([]);
  const [completarSalvando, setCompletarSalvando] = useState(false);
  const [completarPuladas, setCompletarPuladas] = useState(() => new Set());

  // Importação em massa de unidades (CSV)
  const [importNomeArquivo, setImportNomeArquivo] = useState('');
  const [importLinhas, setImportLinhas] = useState([]);
  const [importSelecionadas, setImportSelecionadas] = useState(() => new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importErro, setImportErro] = useState(null);

  // Trilha de auditoria
  const [auditoria, setAuditoria] = useState([]);
  const [auditoriaLoading, setAuditoriaLoading] = useState(true);
  const [auditoriaErro, setAuditoriaErro] = useState(null);
  const [auditoriaFiltro, setAuditoriaFiltro] = useState('Todos');

  // Correções reportadas pelos cidadãos
  const [correcoes, setCorrecoes] = useState([]);
  const [correcoesLoading, setCorrecoesLoading] = useState(true);
  const [correcoesErro, setCorrecoesErro] = useState(null);
  const [correcoesFiltro, setCorrecoesFiltro] = useState('pendente');
  const [moderandoId, setModerandoId] = useState(null);

  // Analytics de uso real do portal público (ver analytics_setup.sql e
  // src/lib/metricas.js) — alimenta o painel "Analytics de Uso".
  const [metricas, setMetricas] = useState([]);
  const [metricasLoading, setMetricasLoading] = useState(true);
  const [metricasErro, setMetricasErro] = useState(null);

  // Alerta proativo de qualidade de dados: dispara um toast UMA vez, assim
  // que os dados terminam de carregar, se houver pendência — pra não
  // depender do admin entrar manualmente no Dashboard/Qualidade dos dados
  // pra descobrir que há algo faltando.
  const [alertaProativoMostrado, setAlertaProativoMostrado] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Active panel for mobile
  const [activePanel, setActivePanel] = useState('dashboard');

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

  // Carregar eventos, notícias, locais e a trilha de auditoria
  useEffect(() => {
    fetchEventos();
    fetchNoticias();
    fetchUnidades();
    fetchAuditoria();
    fetchCorrecoes();
    fetchMetricas();
    fetchUsuarios();
  }, []);

  async function fetchUsuarios() {
    setUsuariosLoading(true);
    setUsuariosErro(null);
    try {
      const usuarios = await listUsersAdmin();
      setListaUsuarios(usuarios);
    } catch (err) {
      console.error(err);
      setUsuariosErro(err.message);
    }
    setUsuariosLoading(false);
  }

  async function fetchAuditoria() {
    setAuditoriaLoading(true);
    setAuditoriaErro(null);
    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(200);

    if (error) {
      setAuditoriaErro('A trilha de auditoria ainda não está disponível. Rode a atualização "trilha de auditoria" em setup_database.sql no SQL Editor do Supabase.');
      setAuditoria([]);
    } else {
      setAuditoria(data || []);
    }
    setAuditoriaLoading(false);
  }

  async function fetchCorrecoes() {
    setCorrecoesLoading(true);
    setCorrecoesErro(null);
    const { data, error } = await supabase
      .from('correcoes')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(500);

    if (error) {
      setCorrecoesErro('A tabela de correções ainda não existe. Execute o script correcoes_setup.sql no SQL Editor do Supabase.');
      setCorrecoes([]);
    } else {
      setCorrecoes(data || []);
    }
    setCorrecoesLoading(false);
  }

  async function fetchMetricas() {
    setMetricasLoading(true);
    setMetricasErro(null);
    const { data, error } = await supabase
      .from('metricas_uso')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(5000);

    if (error) {
      setMetricasErro('O painel de analytics ainda não está disponível. Rode o script analytics_setup.sql no SQL Editor do Supabase.');
      setMetricas([]);
    } else {
      setMetricas(data || []);
    }
    setMetricasLoading(false);
  }

  async function handleModerarCorrecao(id, novoStatus) {
    setModerandoId(id);
    try {
      const { error } = await supabase
        .from('correcoes')
        .update({
          status: novoStatus,
          moderado_por: currentUser.id,
          moderado_em: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      setToast({
        message: novoStatus === 'aprovado'
          ? 'Correção marcada como aprovada. Lembre-se de editar a unidade com a informação correta.'
          : 'Correção descartada.',
        type: novoStatus === 'aprovado' ? 'success' : 'info',
      });
      fetchCorrecoes();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Erro ao moderar: ' + err.message, type: 'error' });
    } finally {
      setModerandoId(null);
    }
  }

  async function fetchEventos() {
    setEventosLoading(true);
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (!error) setEventos(data || []);
    setEventosLoading(false);
  }

  async function fetchNoticias() {
    setNoticiasLoading(true);
    const { data, error } = await supabase
      .from('noticias')
      .select('*')
      .order('criado_em', { ascending: false });

    if (!error) setNoticias(data || []);
    setNoticiasLoading(false);
  }

  async function fetchUnidades() {
    setAdminUnidadesLoading(true);
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('nome', { ascending: true });

    if (!error) setAdminUnidades(data || []);
    setAdminUnidadesLoading(false);
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
        publicar_em: agendarPublicacao && publicarEm ? new Date(publicarEm).toISOString() : null,
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

      const foiAgendado = !!payload.publicar_em;
      setToast({
        message: editingEventoId
          ? "Evento atualizado com sucesso!"
          : foiAgendado
            ? `Campanha agendada! Vai aparecer sozinha no portal em ${new Date(payload.publicar_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`
            : "Campanha publicada com sucesso!",
        type: "success",
      });
      resetEventoForm();
      setShowEventoPreview(false);
      fetchEventos();
      fetchAuditoria();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao publicar: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const resetEventoForm = () => {
    setTitulo(''); setDesc(''); setDataEvento(''); setLocal(''); setTipo('Informativo'); setEventoImagens([]);
    setAgendarPublicacao(false); setPublicarEm('');
    setEditingEventoId(null);
  };

  const handleEditEvento = (evento) => {
    setTitulo(evento.titulo);
    setDesc(evento.descricao);
    setDataEvento(evento.data_evento);
    setLocal(evento.local_evento);
    setTipo(evento.tipo);
    setEventoImagens(evento.imagens || []);
    if (evento.publicar_em && new Date(evento.publicar_em).getTime() > Date.now()) {
      setAgendarPublicacao(true);
      setPublicarEm(new Date(evento.publicar_em).toISOString().slice(0, 16));
    } else {
      setAgendarPublicacao(false);
      setPublicarEm('');
    }
    setEditingEventoId(evento.id);
    setActivePanel('eventos');
  };

  const handleDeleteEvento = async (id) => {
    setDeleteLoading(id);
    const eventoAlvo = eventos.find(e => e.id === id);
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
      fetchEventos();
      fetchAuditoria();
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
      fetchNoticias();
      fetchAuditoria();
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
    setActivePanel('noticias');
  };

  const handleDeleteNoticia = async (id) => {
    setDeleteNoticiaLoading(id);
    const noticiaAlvo = noticias.find(n => n.id === id);
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
      fetchNoticias();
      fetchAuditoria();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao excluir: " + err.message, type: "error" });
    } finally {
      setDeleteNoticiaLoading(null);
    }
  };

  const handleGeocode = async () => {
    if (!unidadeEndereco) {
      setToast({ message: "Por favor, digite o endereço primeiro.", type: "error" });
      return;
    }
    setGeocodeLoading(true);

    const trySearch = async (queryStr) => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}`);
        if (!response.ok) return null;
        return await response.json();
      } catch (e) {
        console.error("Geocode attempt error:", e);
        return null;
      }
    };

    const normalizeText = (str) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const normalizedAddress = normalizeText(unidadeEndereco);

    // Tentativa 1: Endereço completo normalizado + Votorantim - SP
    let query1 = normalizedAddress;
    if (!query1.toLowerCase().includes('votorantim')) {
      query1 += ', Votorantim - SP';
    }
    let data = await trySearch(query1);

    // Tentativa 2: Remove o número/número da casa (geralmente após a vírgula)
    if ((!data || data.length === 0) && normalizedAddress.includes(',')) {
      const streetPart = normalizedAddress.split(',')[0].trim();
      const query2 = `${streetPart}, Votorantim - SP`;
      data = await trySearch(query2);
    }

    // Tentativa 3: Converte abreviações comuns (Av., R., Prof.) para a forma por extenso
    if (!data || data.length === 0) {
      let streetPart = normalizedAddress.split(',')[0].trim();
      streetPart = streetPart
        .replace(/\bav\b\.?/gi, 'Avenida')
        .replace(/\br\b\.?/gi, 'Rua')
        .replace(/\bprof\b\.?/gi, 'Professor')
        .replace(/\bdr\b\.?/gi, 'Doutor');
      const query3 = `${streetPart}, Votorantim - SP`;
      data = await trySearch(query3);
    }

    // Tentativa 4: Busca super relaxada (apenas o nome da rua sem prefixo, ex: "Moacir Oseias Guiti, Votorantim")
    if (!data || data.length === 0) {
      let streetNameOnly = normalizedAddress.split(',')[0].trim();
      streetNameOnly = streetNameOnly.replace(/^(avenida|rua|av\.?|r\.?|travessa|alameda)\s+/gi, '');
      const query4 = `${streetNameOnly}, Votorantim`;
      data = await trySearch(query4);
    }

    if (data && data.length > 0) {
      const foundLat = parseFloat(data[0].lat);
      const foundLng = parseFloat(data[0].lon);
      setUnidadeLat(foundLat.toString());
      setUnidadeLng(foundLng.toString());
      setMapaRecenterToken(t => t + 1);
      setToast({ message: "Coordenadas localizadas com sucesso!", type: "success" });
    } else {
      setToast({
        message: "Endereço não localizado automaticamente. Insira as coordenadas manualmente ou simplifique o endereço (Ex: Av. Moacir Oseias Guiti).",
        type: "error"
      });
    }
    setGeocodeLoading(false);
  };

  // ---------- Unidade: publicar/atualizar / editar / cancelar ----------

  const resetUnidadeForm = () => {
    setUnidadeNome(''); setUnidadeEndereco(''); setUnidadeLat(''); setUnidadeLng(''); setUnidadeImagens([]);
    setUnidadeTelefone('');
    setUnidadeCategoria('Saúde');
    setUnidadeTipo('UBS');
    setEditingUnidadeId(null);
  };

  const handleEditUnidade = (unidade) => {
    const categoria = unidade.categoria || 'Saúde';
    setUnidadeCategoria(categoria);
    if (categoria === 'Saúde') {
      const { tipo: tipoDerivado, resto } = deriveTipoFromNome(unidade.nome);
      setUnidadeTipo(tipoDerivado);
      setUnidadeNome(resto);
    } else {
      setUnidadeTipo('UBS');
      setUnidadeNome(unidade.nome);
    }
    setUnidadeEndereco(unidade.endereco);
    setUnidadeLat(String(unidade.lat));
    setUnidadeLng(String(unidade.lng));
    setUnidadeTelefone(unidade.telefone || '');
    setUnidadeImagens(unidade.imagens || []);
    setEditingUnidadeId(unidade.id);
    setMapaRecenterToken(t => t + 1);
    setActivePanel('unidades');
  };

  // ---------- Completar cadastro em lote (telefone/foto) ----------

  function buildGoogleMapsSearchUrl(unidade) {
    const query = encodeURIComponent(`${unidade.nome}, ${unidade.endereco}, Votorantim - SP`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  function buildStreetViewUrl(unidade) {
    return `https://www.google.com/maps?layer=c&cbll=${unidade.lat},${unidade.lng}`;
  }

  const handleSalvarCompletarCadastro = async () => {
    if (!completarUnidadeId) return;
    setCompletarSalvando(true);
    try {
      const unidadeAtual = adminUnidades.find(u => u.id === completarUnidadeId);
      const payload = {
        telefone: completarTelefone.trim() || null,
        imagens: completarImagens.length > 0 ? completarImagens : null,
      };
      const { error } = await supabase.from('unidades').update(payload).eq('id', completarUnidadeId);
      if (error) throw error;

      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'editar', entidade: 'unidade',
        entidadeId: completarUnidadeId, entidadeTitulo: unidadeAtual?.nome,
      });

      setToast({ message: 'Dados salvos! Indo para o próximo...', type: 'success' });
      setCompletarUnidadeId(null); // libera o efeito para escolher o próximo pendente
      await fetchUnidades();
    } catch (err) {
      setToast({ message: 'Erro ao salvar: ' + err.message, type: 'error' });
    }
    setCompletarSalvando(false);
  };

  const handlePularCompletarCadastro = () => {
    if (!completarUnidadeId) return;
    setCompletarPuladas(prev => new Set(prev).add(completarUnidadeId));
    setCompletarUnidadeId(null);
  };

  const handlePublishUnidade = async (e) => {
    e.preventDefault();
    if (!unidadeLat || !unidadeLng) {
      setToast({ message: "Por favor, defina a latitude e longitude.", type: "error" });
      return;
    }
    setUnidadePublishLoading(true);

    let finalNome = unidadeNome.trim();
    if (unidadeCategoria === 'Saúde') {
      if (unidadeTipo === 'ESF' && !finalNome.toLowerCase().startsWith('esf')) {
        finalNome = `ESF ${finalNome}`;
      } else if (unidadeTipo === 'UPA' && !finalNome.toLowerCase().startsWith('upa')) {
        finalNome = `UPA ${finalNome}`;
      } else if (unidadeTipo === 'Hospital' && !finalNome.toLowerCase().startsWith('hospital')) {
        finalNome = `Hospital ${finalNome}`;
      } else if (unidadeTipo === 'UBS') {
        if (!finalNome.toLowerCase().startsWith('ubs') &&
          !finalNome.toLowerCase().startsWith('esf') &&
          !finalNome.toLowerCase().startsWith('upa') &&
          !finalNome.toLowerCase().startsWith('hospital')) {
          finalNome = `UBS ${finalNome}`;
        }
      }
    }

    try {
      const payload = {
        nome: finalNome,
        categoria: unidadeCategoria,
        endereco: unidadeEndereco,
        lat: parseFloat(unidadeLat),
        lng: parseFloat(unidadeLng),
        telefone: unidadeTelefone.trim() || null,
        imagens: unidadeImagens.length > 0 ? unidadeImagens : null
      };

      let error, data;
      if (editingUnidadeId) {
        ({ error } = await supabase.from('unidades').update(payload).eq('id', editingUnidadeId));
      } else {
        ({ data, error } = await supabase.from('unidades').insert([payload]).select('id').single());
      }

      if (error) throw error;

      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: editingUnidadeId ? 'editar' : 'criar', entidade: 'unidade',
        entidadeId: editingUnidadeId || data?.id, entidadeTitulo: payload.nome,
      });

      setToast({ message: editingUnidadeId ? "Unidade atualizada com sucesso!" : "Unidade cadastrada com sucesso!", type: "success" });
      resetUnidadeForm();
      fetchUnidades();
      fetchAuditoria();
      setActivePanel('gerenciar_unidades');
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao cadastrar unidade: " + err.message, type: "error" });
    } finally {
      setUnidadePublishLoading(false);
    }
  };

  const handleDeleteUnidade = async (id) => {
    setDeleteUnidadeLoading(id);
    const unidadeAlvo = adminUnidades.find(u => u.id === id);
    try {
      const { error } = await supabase.from('unidades').delete().eq('id', id);
      if (error) throw error;
      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'excluir', entidade: 'unidade', entidadeId: id, entidadeTitulo: unidadeAlvo?.nome,
      });
      setToast({ message: "Unidade excluída com sucesso!", type: "success" });
      setDeleteUnidadeConfirm(null);
      if (editingUnidadeId === id) resetUnidadeForm();
      fetchUnidades();
      fetchAuditoria();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao excluir unidade: " + err.message, type: "error" });
    } finally {
      setDeleteUnidadeLoading(null);
    }
  };

  // ---------- Importação em massa de unidades (CSV) ----------

  const resetImportacao = () => {
    setImportNomeArquivo('');
    setImportLinhas([]);
    setImportSelecionadas(new Set());
    setImportErro(null);
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErro(null);
    setImportNomeArquivo(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const matriz = parseCsvTexto(String(evt.target.result || ''));
        const linhas = construirLinhasImportacao(matriz);
        if (linhas.length === 0) {
          setImportErro('Não foi possível reconhecer nenhuma linha de dados neste arquivo. Confira se a primeira linha é o cabeçalho (Nome, Endereco, Latitude, Longitude...) e se há pelo menos uma linha de unidade abaixo dela.');
          setImportLinhas([]);
          setImportSelecionadas(new Set());
          return;
        }
        setImportLinhas(linhas);
        setImportSelecionadas(new Set(linhas.filter(l => l.valido).map(l => l.chave)));
      } catch (err) {
        console.error(err);
        setImportErro('Erro ao ler o arquivo. Confirme que é um CSV válido (exportado do Excel/Google Sheets).');
      }
    };
    reader.onerror = () => setImportErro('Erro ao ler o arquivo do seu computador.');
    reader.readAsText(file, 'UTF-8');
  };

  const toggleImportLinha = (chave) => {
    setImportSelecionadas(prev => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  };

  const selecionarTodasValidas = () => {
    setImportSelecionadas(new Set(importLinhas.filter(l => l.valido).map(l => l.chave)));
  };

  const desmarcarTodas = () => setImportSelecionadas(new Set());

  const handleDownloadTemplate = () => {
    const blob = new Blob([gerarCsvModelo()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_unidades.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------- Exportação em massa (CSV) ----------
  // Caminho inverso da importação em massa: gera um CSV de cada tabela
  // principal, pra relatório pra Prefeitura ou backup manual rápido.
  const EXPORT_CONFIG = {
    unidades: { label: 'Unidades', dados: adminUnidades, gerar: csvUnidades },
    eventos: { label: 'Eventos e campanhas', dados: eventos, gerar: csvEventos },
    noticias: { label: 'Notícias', dados: noticias, gerar: csvNoticias },
    correcoes: { label: 'Correções do cidadão', dados: correcoes, gerar: csvCorrecoes },
    auditoria: { label: 'Trilha de auditoria', dados: auditoria, gerar: csvAuditoria },
    metricas: { label: 'Métricas de uso (analytics)', dados: metricas, gerar: csvMetricas },
  };

  // ---------- Analytics de uso: agregações calculadas a partir de "metricas" ----------
  const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const analyticsAgregados = useMemo(() => {
    const contarPor = (lista, chave) => {
      const mapa = new Map();
      for (const item of lista) {
        const valor = item[chave];
        if (!valor) continue;
        mapa.set(valor, (mapa.get(valor) || 0) + 1);
      }
      return [...mapa.entries()]
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total);
    };

    const visualizacoes = metricas.filter((m) => m.tipo === 'visualizar_unidade');
    const filtrosCategoria = metricas.filter((m) => m.tipo === 'filtro_categoria');
    const paginasVistas = metricas.filter((m) => m.tipo === 'pagina_vista');
    const bairros = metricas.filter((m) => m.tipo === 'bairro_acesso');

    const porHora = new Array(24).fill(0);
    const porDiaSemana = new Array(7).fill(0);
    for (const m of [...visualizacoes, ...paginasVistas]) {
      const d = new Date(m.criado_em);
      if (Number.isNaN(d.getTime())) continue;
      porHora[d.getHours()]++;
      porDiaSemana[d.getDay()]++;
    }
    const maxHora = Math.max(1, ...porHora);
    const maxDiaSemana = Math.max(1, ...porDiaSemana);
    const horaDePico = porHora.indexOf(maxHora);
    const diaDePico = porDiaSemana.indexOf(maxDiaSemana);

    const primeiroRegistro = metricas.length > 0
      ? metricas.reduce((min, m) => (new Date(m.criado_em) < new Date(min.criado_em) ? m : min), metricas[0])
      : null;

    return {
      totalVisualizacoes: visualizacoes.length,
      totalPaginasVistas: paginasVistas.length,
      totalFiltrosCategoria: filtrosCategoria.length,
      unidadesMaisVistas: contarPor(visualizacoes, 'unidade_nome').slice(0, 8),
      categoriasMaisFiltradas: contarPor(filtrosCategoria, 'categoria').slice(0, 8),
      paginasMaisVistas: contarPor(paginasVistas, 'pagina').slice(0, 5),
      bairrosQueMaisAcessam: contarPor(bairros, 'bairro').slice(0, 8),
      porHora,
      maxHora,
      horaDePico: visualizacoes.length + paginasVistas.length > 0 ? horaDePico : null,
      porDiaSemana,
      maxDiaSemana,
      diaDePico: visualizacoes.length + paginasVistas.length > 0 ? DIAS_SEMANA[diaDePico] : null,
      desde: primeiroRegistro ? primeiroRegistro.criado_em : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricas]);

  const handleExportarCsv = (chave) => {
    const config = EXPORT_CONFIG[chave];
    if (!config) return;
    if (!config.dados || config.dados.length === 0) {
      setToast({ message: `Não há dados de "${config.label}" para exportar ainda.`, type: 'error' });
      return;
    }
    baixarCsv(nomeArquivoComData(chave), config.gerar(config.dados));
    setToast({ message: `${config.label}: CSV com ${config.dados.length} registro(s) baixado.`, type: 'success' });
  };

  const handleConfirmarImportacao = async () => {
    const selecionadas = importLinhas.filter(l => l.valido && importSelecionadas.has(l.chave));
    if (selecionadas.length === 0) {
      setToast({ message: "Selecione ao menos uma linha válida para importar.", type: "error" });
      return;
    }

    setImportLoading(true);
    try {
      const payload = selecionadas.map(l => ({
        nome: l.nome,
        categoria: l.categoria,
        endereco: l.endereco,
        lat: l.lat,
        lng: l.lng,
        telefone: l.telefone,
      }));

      const { error } = await supabase.from('unidades').insert(payload);
      if (error) throw error;

      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'criar', entidade: 'importacao_unidades',
        entidadeTitulo: `${selecionadas.length} unidade(s) importada(s) via CSV ("${importNomeArquivo}")`,
      });

      setToast({ message: `${selecionadas.length} unidade(s) importada(s) com sucesso!`, type: "success" });
      resetImportacao();
      fetchUnidades();
      fetchAuditoria();
      setActivePanel('gerenciar_unidades');
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao importar: " + err.message, type: "error" });
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserLoading(true);

    try {
      if (newUserSenha.length < 6) {
        throw new Error("A senha deve ter pelo menos 6 caracteres.");
      }

      const novoUsuario = await createUserWithProfile(newUserEmail, newUserSenha, newUserRole, newUserNome);

      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'criar', entidade: 'usuario',
        entidadeId: novoUsuario?.id, entidadeTitulo: `${newUserNome} (${newUserEmail}) — papel: ${newUserRole}`,
      });

      setToast({ message: "Usuário criado com sucesso! Ele já pode acessar o sistema.", type: "success" });
      setNewUserEmail(''); setNewUserSenha(''); setNewUserNome(''); setNewUserRole('saude');
      setMostrarCriarUsuario(false);
      fetchAuditoria();
      fetchUsuarios();
    } catch (err) {
      console.error(err);
      setToast({ message: err.message, type: "error" });
    } finally {
      setUserLoading(false);
    }
  };

  const handleResetPassword = async (usuario) => {
    if (!usuario.email) {
      setToast({ message: "Este usuário não tem e-mail associado.", type: "error" });
      return;
    }
    setAcaoUsuarioId(usuario.id);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(usuario.email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'editar', entidade: 'usuario',
        entidadeId: usuario.id, entidadeTitulo: `Reset de senha solicitado para ${usuario.nome || usuario.email}`,
      });
      setToast({ message: `E-mail de redefinição de senha enviado para ${usuario.email}.`, type: "success" });
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao enviar redefinição de senha: " + err.message, type: "error" });
    }
    setAcaoUsuarioId(null);
  };

  const handleToggleStatusUsuario = async (usuario) => {
    const desativar = !usuario.desativado;
    setAcaoUsuarioId(usuario.id);
    try {
      await setUserStatusAdmin(usuario.id, desativar);
      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'editar', entidade: 'usuario',
        entidadeId: usuario.id, entidadeTitulo: `${desativar ? 'Desativação' : 'Reativação'} de ${usuario.nome || usuario.email}`,
      });
      setToast({ message: `Conta de ${usuario.nome || usuario.email} ${desativar ? 'desativada' : 'reativada'}.`, type: "success" });
      fetchUsuarios();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao atualizar status: " + err.message, type: "error" });
    }
    setAcaoUsuarioId(null);
  };

  const handleExcluirUsuario = async (usuario) => {
    setAcaoUsuarioId(usuario.id);
    try {
      await deleteUserAdmin(usuario.id);
      registrarAuditoria({
        usuarioId: currentUser.id, usuarioEmail: currentUser.email,
        acao: 'excluir', entidade: 'usuario',
        entidadeId: usuario.id, entidadeTitulo: `${usuario.nome || usuario.email} (papel: ${usuario.role})`,
      });
      setToast({ message: `Conta de ${usuario.nome || usuario.email} excluída permanentemente.`, type: "info" });
      setConfirmarExclusaoId(null);
      fetchUsuarios();
      fetchAuditoria();
    } catch (err) {
      console.error(err);
      setToast({ message: "Erro ao excluir usuário: " + err.message, type: "error" });
    }
    setAcaoUsuarioId(null);
  };

  const getUserInitials = () => {
    if (!currentUser?.email) return 'AD';
    return currentUser.email.substring(0, 2).toUpperCase();
  };

  // Completar cadastro em lote: mantém sempre o primeiro local pendente
  // (sem telefone ou sem foto, e não pulado nesta sessão) carregado no
  // formulário da fila, ajustando o estado durante a renderização — mesmo
  // padrão já usado em UnidadeDetalheModal.jsx para resetar ao trocar de item.
  const unidadePendenteCompletar = adminUnidades.find(u =>
    (!u.telefone || !u.imagens || u.imagens.length === 0) && !completarPuladas.has(u.id)
  );
  if (unidadePendenteCompletar && unidadePendenteCompletar.id !== completarUnidadeId) {
    setCompletarUnidadeId(unidadePendenteCompletar.id);
    setCompletarTelefone(unidadePendenteCompletar.telefone || '');
    setCompletarImagens(unidadePendenteCompletar.imagens || []);
  } else if (!unidadePendenteCompletar && completarUnidadeId !== null) {
    setCompletarUnidadeId(null);
  }

  // Alertas proativos de qualidade de dados: além do resumo "parado no
  // tempo" já mostrado no Dashboard (quantas unidades/notícias estão
  // incompletas no total), aqui a gente destaca o que é NOVO na última
  // semana — é o que realmente precisa de atenção agora, porque o resto já
  // é uma pendência "conhecida" que o admin já viu antes.
  const SETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;
  const criadaNaUltimaSemana = (item) => item.criado_em && (Date.now() - new Date(item.criado_em).getTime()) < SETE_DIAS_MS;

  const unidadesNovasSemana = adminUnidades.filter(criadaNaUltimaSemana);
  const unidadesNovasSemTelefone = unidadesNovasSemana.filter(u => !u.telefone);
  const unidadesNovasSemImagem = unidadesNovasSemana.filter(u => !u.imagens || u.imagens.length === 0);
  const noticiasNovasSemana = noticias.filter(criadaNaUltimaSemana);
  const noticiasNovasSemConteudo = noticiasNovasSemana.filter(n => !n.conteudo || !n.conteudo.trim());
  const correcoesPendentesCount = correcoes.filter(c => c.status === 'pendente').length;

  const alertasProativos = [
    unidadesNovasSemTelefone.length > 0 && {
      chave: 'unidades-sem-telefone-semana',
      mensagem: `${unidadesNovasSemTelefone.length} unidade(s) nova(s) esta semana ainda sem telefone.`,
      painel: 'completar_cadastro',
    },
    unidadesNovasSemImagem.length > 0 && {
      chave: 'unidades-sem-imagem-semana',
      mensagem: `${unidadesNovasSemImagem.length} unidade(s) nova(s) esta semana ainda sem foto.`,
      painel: 'completar_cadastro',
    },
    noticiasNovasSemConteudo.length > 0 && {
      chave: 'noticias-sem-conteudo-semana',
      mensagem: `${noticiasNovasSemConteudo.length} notícia(s) nova(s) esta semana sem conteúdo completo.`,
      painel: 'gerenciar_noticias',
    },
    correcoesPendentesCount > 0 && {
      chave: 'correcoes-pendentes',
      mensagem: `${correcoesPendentesCount} correção(ões) do cidadão aguardando revisão.`,
      painel: 'correcoes',
    },
  ].filter(Boolean);

  const dadosCarregados = !adminUnidadesLoading && !noticiasLoading && !correcoesLoading;
  if (dadosCarregados && !alertaProativoMostrado) {
    if (alertasProativos.length > 0) {
      setToast({
        message: alertasProativos.length === 1
          ? `Atenção: ${alertasProativos[0].mensagem}`
          : `Atenção: ${alertasProativos.length} avisos pendentes no Dashboard (${alertasProativos.map(a => a.mensagem).join(' ')})`,
        type: 'info',
      });
    }
    setAlertaProativoMostrado(true);
  }

  if (!currentUser) return null;

  const totalPendenciasQualidade =
    adminUnidades.filter(u => !u.telefone).length +
    adminUnidades.filter(u => !u.imagens || u.imagens.length === 0).length;

  const sidebarGroups = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'grupo-eventos',
      label: 'Eventos',
      icon: Megaphone,
      children: [
        { id: 'eventos', label: editingEventoId ? 'Editando Evento' : 'Publicar Evento', icon: editingEventoId ? Pencil : Megaphone },
        { id: 'gerenciar', label: 'Gerenciar Eventos', icon: Calendar },
      ],
    },
    {
      id: 'grupo-noticias',
      label: 'Notícias',
      icon: Newspaper,
      children: [
        { id: 'noticias', label: editingNoticiaId ? 'Editando Notícia' : 'Publicar Notícia', icon: editingNoticiaId ? Pencil : Newspaper },
        { id: 'gerenciar_noticias', label: 'Gerenciar Notícias', icon: Eye },
      ],
    },
    {
      id: 'grupo-unidades',
      label: 'Unidades',
      icon: Building2,
      children: [
        { id: 'unidades', label: editingUnidadeId ? 'Editando Unidade' : 'Adicionar Unidade', icon: editingUnidadeId ? Pencil : Building2 },
        { id: 'importar_unidades', label: 'Importar Unidades', icon: Upload },
        { id: 'gerenciar_unidades', label: 'Gerenciar Unidades', icon: MapPin },
        { id: 'completar_cadastro', label: 'Completar Cadastro', icon: ClipboardList, badge: totalPendenciasQualidade || null },
      ],
    },
    {
      id: 'correcoes',
      label: 'Correções do Cidadão',
      icon: MessageSquareWarning,
      badge: correcoes.filter(c => c.status === 'pendente').length || null,
    },
    { id: 'usuarios', label: 'Gerenciar Usuários', icon: Users },
    {
      id: 'grupo-relatorios',
      label: 'Relatórios',
      icon: BarChart3,
      children: [
        { id: 'analytics', label: 'Analytics de Uso', icon: BarChart3 },
        { id: 'auditoria', label: 'Trilha de Auditoria', icon: History },
        { id: 'exportar', label: 'Exportar Dados', icon: Download },
      ],
    },
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
        data={{ titulo, descricao: desc, data_evento: dataEvento, local_evento: local, tipo, imagens: eventoImagens, publicarEm: agendarPublicacao ? publicarEm : null }}
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
              <button
                type="button"
                onClick={() => setActivePanel('dashboard')}
                title={alertasProativos.length > 0 ? `${alertasProativos.length} aviso(s) pendente(s) — ver Dashboard` : 'Nenhum aviso pendente'}
                className="relative h-9 w-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"
              >
                <Bell size={16} className="text-white" />
                {alertasProativos.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-400 text-indigo-900 text-[9px] font-bold flex items-center justify-center">
                    {alertasProativos.length}
                  </span>
                )}
              </button>
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
        <AdminSidebar
          groups={sidebarGroups}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          quickLinks={[
            { to: '/eventos', label: 'Portal de campanhas' },
            { to: '/noticias', label: 'Portal de notícias' },
            { to: '/', label: 'Mapa da cidade' },
          ]}
        />

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 mt-12 lg:mt-0">
          <div className={activePanel === 'dashboard' ? 'max-w-6xl mx-auto' : 'max-w-4xl mx-auto'}>

            {/* Panel: Dashboard */}
            {activePanel === 'dashboard' && (() => {

              const atividadeRecente = [
                ...adminUnidades.map(u => ({ id: `unidade-${u.id}`, tipo: 'Unidade', titulo: u.nome, criado_em: u.criado_em, cor: 'bg-indigo-500', icon: Building2, painel: 'gerenciar_unidades' })),
                ...eventos.map(e => ({ id: `evento-${e.id}`, tipo: 'Evento', titulo: e.titulo, criado_em: e.criado_em, cor: e.tipo === 'Urgente' ? 'bg-red-500' : 'bg-blue-500', icon: Megaphone, painel: 'gerenciar' })),
                ...noticias.map(n => ({ id: `noticia-${n.id}`, tipo: 'Notícia', titulo: n.titulo, criado_em: n.criado_em, cor: 'bg-cyan-500', icon: Newspaper, painel: 'gerenciar_noticias' })),
              ]
                .filter(item => item.criado_em)
                .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
                .slice(0, 8);

              const unidadesSemTelefone = adminUnidades.filter(u => !u.telefone);
              const unidadesSemImagem = adminUnidades.filter(u => !u.imagens || u.imagens.length === 0);
              const noticiasSemConteudo = noticias.filter(n => !n.conteudo || !n.conteudo.trim());

              const totalUnidades = adminUnidades.length || 1; // evita divisão por zero na barra de progresso
              const totalNoticias = noticias.length || 1;

              const qualidadeChecks = [
                {
                  chave: 'telefone',
                  label: 'Unidades sem telefone cadastrado',
                  descricao: 'Sem telefone, o botão "Ligar" não aparece para o cidadão no mapa público.',
                  icon: PhoneOff,
                  faltando: unidadesSemTelefone.length,
                  total: adminUnidades.length,
                  percentualCompleto: adminUnidades.length ? Math.round(((adminUnidades.length - unidadesSemTelefone.length) / totalUnidades) * 100) : 100,
                  painel: 'completar_cadastro',
                },
                {
                  chave: 'imagem-unidade',
                  label: 'Unidades sem foto cadastrada',
                  descricao: 'A foto ajuda o cidadão a reconhecer a unidade ao chegar no local.',
                  icon: ImageOff,
                  faltando: unidadesSemImagem.length,
                  total: adminUnidades.length,
                  percentualCompleto: adminUnidades.length ? Math.round(((adminUnidades.length - unidadesSemImagem.length) / totalUnidades) * 100) : 100,
                  painel: 'completar_cadastro',
                },
                {
                  chave: 'conteudo-noticia',
                  label: 'Notícias sem conteúdo completo',
                  descricao: 'Só têm o resumo; o cidadão não vê um texto completo ao abrir a notícia.',
                  icon: FileWarning,
                  faltando: noticiasSemConteudo.length,
                  total: noticias.length,
                  percentualCompleto: noticias.length ? Math.round(((noticias.length - noticiasSemConteudo.length) / totalNoticias) * 100) : 100,
                  painel: 'gerenciar_noticias',
                },
              ];

              const scoreQualidade = Math.round(
                qualidadeChecks.reduce((soma, c) => soma + c.percentualCompleto, 0) / qualidadeChecks.length
              );

              const kpis = [
                {
                  chave: 'unidades',
                  label: 'Unidades cadastradas',
                  valor: adminUnidades.length,
                  icon: Building2,
                  cor: 'bg-indigo-100 text-indigo-600',
                  painel: 'gerenciar_unidades',
                },
                {
                  chave: 'eventos',
                  label: 'Eventos / campanhas',
                  valor: eventos.length,
                  icon: Megaphone,
                  cor: 'bg-blue-100 text-blue-600',
                  painel: 'gerenciar',
                },
                {
                  chave: 'noticias',
                  label: 'Notícias publicadas',
                  valor: noticias.length,
                  icon: Newspaper,
                  cor: 'bg-cyan-100 text-cyan-600',
                  painel: 'gerenciar_noticias',
                },
                {
                  chave: 'correcoes',
                  label: 'Correções pendentes',
                  valor: correcoesPendentesCount,
                  icon: MessageSquareWarning,
                  cor: correcoesPendentesCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600',
                  painel: 'correcoes',
                  destaque: correcoesPendentesCount > 0,
                },
                {
                  chave: 'qualidade',
                  label: 'Qualidade dos dados',
                  valor: `${scoreQualidade}%`,
                  icon: FileWarning,
                  cor: scoreQualidade >= 90 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600',
                  painel: 'completar_cadastro',
                },
                {
                  chave: 'visualizacoes',
                  label: 'Visualizações no mapa',
                  valor: analyticsAgregados.totalVisualizacoes,
                  icon: BarChart3,
                  cor: 'bg-fuchsia-100 text-fuchsia-600',
                  painel: 'analytics',
                },
              ];

              return (
                <div className="animate-fade-in space-y-6">
                  {/* Alertas proativos */}
                  {alertasProativos.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6 flex items-start gap-3 animate-slide-down">
                      <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Bell className="text-amber-600" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800">Avisos que precisam de atenção</p>
                        <ul className="mt-2 space-y-1">
                          {alertasProativos.map(a => (
                            <li key={a.chave}>
                              <button
                                type="button"
                                onClick={() => setActivePanel(a.painel)}
                                className="w-full flex items-center justify-between gap-2 text-left text-xs sm:text-sm text-amber-700 hover:text-amber-900 font-medium py-1 group"
                              >
                                <span>{a.mensagem}</span>
                                <ArrowRight size={13} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* KPIs: visão geral clicável */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {kpis.map(kpi => {
                      const KpiIcon = kpi.icon;
                      return (
                        <button
                          key={kpi.chave}
                          type="button"
                          onClick={() => setActivePanel(kpi.painel)}
                          className={`text-left glass-panel rounded-2xl border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${kpi.destaque ? 'border-amber-200' : 'border-slate-200'
                            }`}
                        >
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${kpi.cor}`}>
                            <KpiIcon size={17} />
                          </div>
                          <p className="text-xl font-extrabold text-slate-800 leading-none">{kpi.valor}</p>
                          <p className="text-[11px] font-semibold text-slate-500 mt-1.5 leading-tight">{kpi.label}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Atividade recente */}
                    <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                        <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Clock className="text-slate-600" size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-800">Atividade recente</h2>
                          <p className="text-xs text-slate-500">Últimos cadastros e publicações, de todas as áreas.</p>
                        </div>
                      </div>

                      {atividadeRecente.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-slate-500 text-sm font-medium">Nenhuma atividade registrada ainda.</p>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {atividadeRecente.map(item => {
                            const ItemIcon = item.icon;
                            return (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onClick={() => setActivePanel(item.painel)}
                                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                                >
                                  <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${item.cor}`}>
                                    <ItemIcon size={15} />
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-slate-800 truncate">{item.titulo}</span>
                                    <span className="block text-xs text-slate-400">{item.tipo} · {tempoRelativo(item.criado_em)}</span>
                                  </span>
                                  <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    {/* Qualidade dos dados */}
                    <div className="glass-panel p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                        <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                          <FileWarning className="text-amber-600" size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-800">Qualidade dos dados</h2>
                          <p className="text-xs text-slate-500">O que falta validar ou completar antes de considerar o cadastro maduro.</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {qualidadeChecks.map(check => {
                          const CheckIcon = check.icon;
                          return (
                            <div key={check.chave} className="border border-slate-100 rounded-xl p-3.5">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-start gap-2.5">
                                  <CheckIcon size={15} className={check.faltando > 0 ? 'text-amber-500 mt-0.5' : 'text-emerald-500 mt-0.5'} />
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">{check.label}</p>
                                    <p className="text-xs text-slate-500">{check.descricao}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActivePanel(check.painel)}
                                  className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 whitespace-nowrap"
                                >
                                  Revisar <ArrowRight size={12} />
                                </button>
                              </div>
                              {check.total > 0 ? (
                                <>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${check.faltando > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                      style={{ width: `${check.percentualCompleto}%` }}
                                    />
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    {check.faltando === 0
                                      ? 'Completo — nenhuma pendência.'
                                      : `${check.faltando} de ${check.total} pendente(s) (${check.percentualCompleto}% completo)`}
                                  </p>
                                </>
                              ) : (
                                <p className="text-[11px] text-slate-400">Ainda não há registros para avaliar.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Panel: Publicar Evento */}
            {activePanel === 'eventos' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${editingEventoId ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                        {editingEventoId ? <Pencil className="text-amber-600" size={20} /> : <Megaphone className="text-indigo-600" size={20} />}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">{editingEventoId ? 'Editar alerta / campanha' : 'Publicar novo alerta / campanha'}</h2>
                        <p className="text-sm text-slate-500">{editingEventoId ? 'Altere os campos e confirme para salvar.' : 'O evento será publicado no portal público imediatamente.'}</p>
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
                    <CampanhaTemplateBar
                      formData={{ titulo, descricao: desc, local_evento: local, tipo, imagens: eventoImagens }}
                      onAplicarTemplate={(t) => {
                        setTitulo(t.titulo || '');
                        setDesc(t.descricao || '');
                        setLocal(t.local_evento || '');
                        setTipo(t.tipo || 'Informativo');
                        setEventoImagens(t.imagens || []);
                        setToast({ message: `Modelo "${t.nome}" aplicado — confira data/local e publique.`, type: 'info' });
                      }}
                      currentUser={currentUser}
                      onToast={setToast}
                    />
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
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(true)}
                          className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/50 flex items-center gap-2 ${dataEvento ? 'text-slate-800 font-medium' : 'text-slate-400'
                            }`}
                        >
                          <Calendar size={16} className="text-indigo-500 flex-shrink-0" />
                          <span className="truncate">{dataEvento || 'Clique para selecionar...'}</span>
                        </button>
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

                    {/* Agendamento de publicação */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5">
                      <div
                        className="flex items-center justify-between gap-3 cursor-pointer"
                        onClick={() => {
                          setAgendarPublicacao(v => {
                            const next = !v;
                            if (!next) setPublicarEm('');
                            return next;
                          });
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Timer size={18} className="text-indigo-600 flex-shrink-0" />
                          <div>
                            <span className="text-sm font-semibold text-indigo-800">Agendar publicação</span>
                            <p className="text-xs text-indigo-600">Em vez de publicar agora, a campanha fica oculta do portal até a data/hora escolhida.</p>
                          </div>
                        </div>
                        <div className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${agendarPublicacao ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${agendarPublicacao ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
                        </div>
                      </div>
                      {agendarPublicacao && (
                        <div className="mt-3 animate-fade-in">
                          <label className="block text-xs font-semibold text-indigo-700 mb-1.5">Publicar automaticamente em</label>
                          <input
                            type="datetime-local"
                            required={agendarPublicacao}
                            min={new Date().toISOString().slice(0, 16)}
                            value={publicarEm}
                            onChange={e => setPublicarEm(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-medium text-slate-700"
                          />
                        </div>
                      )}
                    </div>

                    {/* Image Upload */}
                    <ImageUpload
                      images={eventoImagens}
                      onImagesChange={setEventoImagens}
                      maxImages={10}
                      folder="eventos"
                    />

                    <button type="submit" disabled={loading || !dataEvento || (agendarPublicacao && !publicarEm)} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {editingEventoId ? <Pencil size={18} /> : agendarPublicacao ? <Timer size={18} /> : <Plus size={18} />}
                      {editingEventoId ? 'Revisar alterações' : agendarPublicacao ? 'Revisar e agendar' : 'Revisar e publicar'}
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
                        <div key={evento.id} className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-all group ${editingEventoId === evento.id ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${evento.tipo === 'Urgente' ? 'bg-red-500' : 'bg-blue-500'
                                  }`}>
                                  {evento.tipo}
                                </span>
                                {evento.publicar_em && new Date(evento.publicar_em).getTime() > Date.now() && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
                                    <Timer size={10} /> Agendado
                                  </span>
                                )}
                                <h4 className="font-bold text-slate-800 text-sm truncate">{evento.titulo}</h4>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-1">{evento.descricao}</p>
                              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1"><Calendar size={11} /> {evento.data_evento}</span>
                                <span className="flex items-center gap-1"><MapPin size={11} /> {evento.local_evento}</span>
                                {evento.imagens && evento.imagens.length > 0 && (
                                  <span className="text-purple-500 font-bold">📷 {evento.imagens.length} img</span>
                                )}
                                {evento.publicar_em && new Date(evento.publicar_em).getTime() > Date.now() && (
                                  <span className="flex items-center gap-1 text-indigo-500 font-semibold">
                                    <Timer size={11} /> publica em {new Date(evento.publicar_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </span>
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
              </div>
            )}

            {/* Panel: Publicar Notícia */}
            {activePanel === 'noticias' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
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
              </div>
            )}

            {/* Panel: Gerenciar Notícias */}
            {activePanel === 'gerenciar_noticias' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Eye className="text-purple-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Gerenciar Notícias</h2>
                      <p className="text-sm text-slate-500">{noticias.length} notícia(s) publicada(s)</p>
                    </div>
                  </div>

                  {noticiasLoading ? (
                    <div className="text-center py-10 text-slate-500">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                      Carregando notícias...
                    </div>
                  ) : noticias.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-3">📰</div>
                      <p className="text-slate-500 font-medium">Nenhuma notícia publicada ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                      {noticias.map(noticia => (
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
              </div>
            )}

            {/* Panel: Cadastrar Usuário */}
            {activePanel === 'usuarios' && (
              <div className="animate-fade-in space-y-6">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Users className="text-emerald-600" size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Contas de usuário</h2>
                        <p className="text-sm text-slate-500">Reset de senha, desativação temporária e exclusão de contas.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarCriarUsuario((v) => !v)}
                      className="shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all"
                    >
                      <Plus size={16} /> Nova conta
                    </button>
                  </div>

                  {mostrarCriarUsuario && (
                    <form onSubmit={handleCreateUser} className="space-y-4 mb-6 pb-6 border-b border-slate-100">
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
                  )}

                  {usuariosLoading ? (
                    <p className="text-sm text-slate-400 flex items-center gap-2 py-6 justify-center">
                      <Loader2 size={16} className="animate-spin" /> Carregando contas...
                    </p>
                  ) : usuariosErro ? (
                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl p-4">{usuariosErro}</p>
                  ) : listaUsuarios.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">Nenhuma conta cadastrada.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {listaUsuarios.map((u) => {
                        const ehEuMesmo = u.id === currentUser?.id;
                        const carregandoAcao = acaoUsuarioId === u.id;
                        return (
                          <div
                            key={u.id}
                            className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border ${u.desativado ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                {u.nome || '(sem nome)'}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${u.role === 'adm' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'}`}>
                                  {u.role === 'adm' ? 'Admin' : 'Saúde'}
                                </span>
                                {u.desativado && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">Desativada</span>
                                )}
                                {ehEuMesmo && (
                                  <span className="text-[10px] font-semibold text-slate-400">(você)</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>

                            {confirmarExclusaoId === u.id ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-semibold text-red-600">Excluir permanentemente?</span>
                                <button
                                  type="button"
                                  disabled={carregandoAcao}
                                  onClick={() => handleExcluirUsuario(u)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-60"
                                >
                                  {carregandoAcao ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar'}
                                </button>
                                <button type="button" onClick={() => setConfirmarExclusaoId(null)} className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600">
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={carregandoAcao}
                                  onClick={() => handleResetPassword(u)}
                                  title="Enviar e-mail de redefinição de senha"
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50"
                                >
                                  <KeyRound size={14} /> Redefinir senha
                                </button>
                                {!ehEuMesmo && (
                                  <button
                                    type="button"
                                    disabled={carregandoAcao}
                                    onClick={() => handleToggleStatusUsuario(u)}
                                    title={u.desativado ? 'Reativar conta' : 'Desativar conta temporariamente'}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 ${u.desativado ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                                  >
                                    {u.desativado ? <UserCheck size={14} /> : <UserX size={14} />}
                                    {u.desativado ? 'Reativar' : 'Desativar'}
                                  </button>
                                )}
                                {!ehEuMesmo && (
                                  <button
                                    type="button"
                                    disabled={carregandoAcao}
                                    onClick={() => setConfirmarExclusaoId(u.id)}
                                    title="Excluir permanentemente"
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel: Adicionar/Editar Unidade */}
            {activePanel === 'unidades' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${editingUnidadeId ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                        {editingUnidadeId ? <Pencil className="text-amber-600" size={20} /> : <Building2 className="text-indigo-600" size={20} />}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">{editingUnidadeId ? 'Editar unidade de saúde' : 'Cadastrar nova unidade de saúde'}</h2>
                        <p className="text-sm text-slate-500">{editingUnidadeId ? 'Altere os campos e salve para atualizar o mapa.' : 'Adicione uma UBS, ESF, Hospital ou UPA no mapa da cidade.'}</p>
                      </div>
                    </div>
                    {editingUnidadeId && (
                      <button
                        type="button"
                        onClick={resetUnidadeForm}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors shrink-0"
                      >
                        <XCircle size={14} /> Cancelar edição
                      </button>
                    )}
                  </div>

                  <form onSubmit={handlePublishUnidade} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome do local</label>
                        <input
                          type="text"
                          required
                          value={unidadeNome}
                          onChange={e => setUnidadeNome(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Ex: Vila Nova, Jardim Serrano, Central"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoria</label>
                        <select
                          value={unidadeCategoria}
                          onChange={e => setUnidadeCategoria(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                          <option value="Saúde">🏥 Saúde</option>
                          <option value="Educação">🎓 Educação</option>
                          <option value="Cultura">🎭 Cultura</option>
                          <option value="Governo">🏛️ Governo</option>
                          <option value="Lazer">🌳 Lazer</option>
                          <option value="Biblioteca">📚 Biblioteca</option>
                        </select>
                      </div>
                    </div>
                    {unidadeCategoria === 'Saúde' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2" />
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tipo de unidade</label>
                          <select
                            value={unidadeTipo}
                            onChange={e => setUnidadeTipo(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          >
                            <option value="UBS">🏥 UBS</option>
                            <option value="ESF">💚 ESF</option>
                            <option value="Hospital">🏨 Hospital</option>
                            <option value="UPA">🚑 UPA</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {unidadeNome && unidadeCategoria === 'Saúde' && (
                      <p className="text-xs text-indigo-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50 animate-slide-down">
                        💡 <strong>Salvo no mapa como:</strong> {
                          unidadeTipo === 'ESF' && !unidadeNome.toLowerCase().startsWith('esf') ? `ESF ${unidadeNome}` :
                            unidadeTipo === 'UPA' && !unidadeNome.toLowerCase().startsWith('upa') ? `UPA ${unidadeNome}` :
                              unidadeTipo === 'Hospital' && !unidadeNome.toLowerCase().startsWith('hospital') ? `Hospital ${unidadeNome}` :
                                unidadeTipo === 'UBS' && !unidadeNome.toLowerCase().startsWith('ubs') && !unidadeNome.toLowerCase().startsWith('esf') && !unidadeNome.toLowerCase().startsWith('upa') && !unidadeNome.toLowerCase().startsWith('hospital') ? `UBS ${unidadeNome}` :
                                  unidadeNome
                        }
                      </p>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Endereço completo</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={unidadeEndereco}
                          onChange={e => setUnidadeEndereco(e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Ex: Avenida São João, 200 - Centro"
                        />
                        <button
                          type="button"
                          disabled={geocodeLoading}
                          onClick={handleGeocode}
                          className="px-4 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-sm transition-all flex items-center gap-1.5 disabled:opacity-60 shrink-0 animate-transition"
                        >
                          {geocodeLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                          <span>Buscar Coordenadas</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Localização no mapa</label>
                      <LocationMapPicker
                        lat={unidadeLat}
                        lng={unidadeLng}
                        recenterToken={mapaRecenterToken}
                        onChange={(novaLat, novaLng) => {
                          setUnidadeLat(String(novaLat));
                          setUnidadeLng(String(novaLng));
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Latitude</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={unidadeLat}
                          onChange={e => setUnidadeLat(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Ex: -23.5451"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Longitude</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={unidadeLng}
                          onChange={e => setUnidadeLng(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="Ex: -47.4412"
                        />
                      </div>
                      <p className="sm:col-span-2 text-xs text-slate-400">
                        Esses campos mostram a coordenada marcada no mapa acima e também aceitam edição manual (ex: pra ajuste fino com valores de outra fonte).
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone (opcional)</label>
                      <input
                        type="tel"
                        value={unidadeTelefone}
                        onChange={e => setUnidadeTelefone(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Ex: (15) 3347-0000"
                      />
                      <p className="text-xs text-slate-400 mt-1">Se preenchido, habilita o botão "Ligar" no mapa público. Requer a coluna "telefone" na tabela unidades (ver setup_database.sql).</p>
                    </div>

                    {/* Image Upload */}
                    <div className="pt-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Imagens do local (opcional)</label>
                      <ImageUpload
                        images={unidadeImagens}
                        onImagesChange={setUnidadeImagens}
                        maxImages={10}
                        folder="unidades"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={unidadePublishLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {unidadePublishLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Salvando local...
                        </>
                      ) : (
                        <>
                          {editingUnidadeId ? <Pencil size={18} /> : <Plus size={18} />}
                          {editingUnidadeId ? 'Salvar alterações' : 'Cadastrar local no mapa'}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Panel: Importação em massa de Unidades */}
            {activePanel === 'importar_unidades' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Upload className="text-teal-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Importação em massa de unidades</h2>
                      <p className="text-sm text-slate-500">Cadastre várias unidades de uma vez a partir de uma planilha, em vez de uma a uma.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-sm text-slate-600 space-y-2">
                    <p>
                      <strong>Como usar:</strong> exporte sua planilha (Excel/Google Sheets) como <strong>CSV</strong> e envie o arquivo abaixo.
                      As colunas reconhecidas são: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">Nome</code>,{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">Endereco</code>,{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">Latitude</code> /{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">Longitude</code> (ou uma única coluna{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">Coordenada</code> no formato "lat, lng") e{' '}
                      <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-xs">Telefone</code> (opcional).
                    </p>
                    <p className="text-xs text-slate-500">
                      Não importamos .xlsx diretamente por segurança (a biblioteca mais usada para isso tem uma falha conhecida sem correção). Exportar como CSV primeiro é rápido e evita esse risco.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors"
                    >
                      <Download size={13} /> Baixar modelo CSV
                    </button>
                  </div>

                  <div className="mb-6">
                    <label
                      htmlFor="import-csv-file"
                      className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-teal-400 hover:bg-teal-50/30 rounded-xl p-8 cursor-pointer transition-all text-center"
                    >
                      <FileSpreadsheet size={28} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">
                        {importNomeArquivo || 'Clique para selecionar um arquivo .csv'}
                      </span>
                      <span className="text-xs text-slate-400">ou arraste o arquivo até aqui</span>
                    </label>
                    <input
                      id="import-csv-file"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleImportFileChange}
                      className="sr-only"
                    />
                  </div>

                  {importErro && (
                    <div role="alert" className="mb-6 bg-red-50 text-red-600 text-sm font-semibold p-3 rounded-xl border border-red-100 flex items-start gap-2">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      {importErro}
                    </div>
                  )}

                  {importLinhas.length > 0 && (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <p className="text-sm text-slate-600">
                          <strong>{importLinhas.length}</strong> linha(s) encontrada(s) ·{' '}
                          <span className="text-emerald-600 font-semibold">{importLinhas.filter(l => l.valido).length} válida(s)</span>
                          {importLinhas.some(l => !l.valido) && (
                            <> · <span className="text-red-600 font-semibold">{importLinhas.filter(l => !l.valido).length} com erro</span></>
                          )}
                        </p>
                        <div className="flex items-center gap-3 text-xs font-semibold">
                          <button type="button" onClick={selecionarTodasValidas} className="text-teal-700 hover:text-teal-900">Selecionar todas válidas</button>
                          <button type="button" onClick={desmarcarTodas} className="text-slate-500 hover:text-slate-700">Desmarcar todas</button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1 mb-6">
                        {importLinhas.map(linha => {
                          const selecionada = importSelecionadas.has(linha.chave);
                          return (
                            <div
                              key={linha.chave}
                              className={`border rounded-xl p-3.5 transition-all ${!linha.valido ? 'bg-red-50/50 border-red-100' : selecionada ? 'bg-teal-50/50 border-teal-200' : 'bg-white border-slate-100'
                                }`}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => linha.valido && toggleImportLinha(linha.chave)}
                                  disabled={!linha.valido}
                                  aria-pressed={selecionada}
                                  aria-label={selecionada ? `Remover ${linha.nome || 'linha ' + linha.linhaPlanilha} da importação` : `Incluir ${linha.nome || 'linha ' + linha.linhaPlanilha} na importação`}
                                  className={`mt-0.5 flex-shrink-0 ${linha.valido ? 'text-teal-600 hover:text-teal-800' : 'text-slate-300 cursor-not-allowed'}`}
                                >
                                  {selecionada ? <CheckSquare size={18} /> : <Square size={18} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-slate-500">
                                      {linha.tipoDetectado}
                                    </span>
                                    <h4 className="font-bold text-slate-800 text-sm">{linha.nome || <em className="text-slate-400 font-normal">(sem nome)</em>}</h4>
                                    {linha.renomeado && (
                                      <span className="text-[10px] text-slate-400">(era "{linha.nomeOriginal}")</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">{linha.endereco || <em className="text-slate-400">Endereço não informado</em>}</p>
                                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono flex-wrap">
                                    <span>Linha {linha.linhaPlanilha}</span>
                                    <span>{linha.lat !== null && linha.lng !== null ? `${linha.lat.toFixed(5)}, ${linha.lng.toFixed(5)}` : 'sem coordenadas'}</span>
                                    {linha.telefone && <span>{linha.telefone}</span>}
                                  </div>
                                  {!linha.valido && (
                                    <p className="text-xs text-red-600 font-semibold mt-1.5 flex items-start gap-1">
                                      <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                                      {linha.erros.join(' · ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-xs text-slate-400 mb-4">
                        Unidades com nome fora do padrão UBS/ESF/Hospital/UPA (ex.: "Zoonoses", "CAPS") são marcadas como UBS por padrão — revise e desmarque as que não devem aparecer no mapa como unidade de atendimento. Se alguma unidade já existir no mapa, importar de novo cria um registro duplicado; confira em "Gerenciar Unidades" antes de confirmar.
                      </p>

                      <button
                        type="button"
                        onClick={handleConfirmarImportacao}
                        disabled={importLoading || importSelecionadas.size === 0}
                        className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {importLoading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Importando...
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            Importar {importSelecionadas.size} unidade(s) selecionada(s)
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Panel: Gerenciar Unidades */}
            {activePanel === 'gerenciar_unidades' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <MapPin className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Gerenciar Unidades de Saúde</h2>
                      <p className="text-sm text-slate-500">{adminUnidades.length} local(is) cadastrado(s)</p>
                    </div>
                  </div>

                  {adminUnidadesLoading ? (
                    <div className="text-center py-10 text-slate-500">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                      Carregando locais...
                    </div>
                  ) : adminUnidades.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-3">📍</div>
                      <p className="text-slate-500 font-medium">Nenhum local cadastrado no mapa ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                      {adminUnidades.map(unidade => (
                        <div key={unidade.id} className={`bg-white border rounded-xl p-4 hover:shadow-sm transition-all group ${editingUnidadeId === unidade.id ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {unidade.imagens && unidade.imagens.length > 0 ? (
                                <img src={unidade.imagens[0]} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 flex-shrink-0">
                                  <Building2 size={24} />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-slate-800 text-sm truncate">{unidade.nome}</h4>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">
                                    {unidade.categoria || 'Saúde'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1">{unidade.endereco}</p>
                                <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                                  Lat: {unidade.lat} | Lng: {unidade.lng}
                                </span>
                              </div>
                            </div>

                            <div className="flex-shrink-0 flex items-center gap-1.5">
                              {deleteUnidadeConfirm === unidade.id ? (
                                <div className="flex items-center gap-2 animate-fade-in">
                                  <button
                                    onClick={() => handleDeleteUnidade(unidade.id)}
                                    disabled={deleteUnidadeLoading === unidade.id}
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                  >
                                    {deleteUnidadeLoading === unidade.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => setDeleteUnidadeConfirm(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditUnidade(unidade)}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-2 rounded-lg transition-all"
                                    title="Editar unidade"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteUnidadeConfirm(unidade.id)}
                                    className="opacity-0 group-hover:opacity-100 bg-red-50 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-all"
                                    title="Excluir local"
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
              </div>
            )}

            {/* Panel: Completar cadastro em lote (telefone/foto) */}
            {activePanel === 'completar_cadastro' && (() => {
              const totalPendentesInicial = adminUnidades.filter(u => !u.telefone || !u.imagens || u.imagens.length === 0).length;
              const restantes = adminUnidades.filter(u =>
                (!u.telefone || !u.imagens || u.imagens.length === 0) && !completarPuladas.has(u.id)
              ).length;
              const concluidos = totalPendentesInicial - restantes;

              return (
                <div className="animate-fade-in">
                  <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-4">
                      <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <ClipboardList className="text-amber-600" size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-slate-800">Completar cadastro</h2>
                        <p className="text-sm text-slate-500">Preencha telefone e foto um local de cada vez, sem precisar abrir o formulário completo.</p>
                      </div>
                    </div>

                    {totalPendentesInicial === 0 ? (
                      <div className="text-center py-14">
                        <PartyPopper size={40} className="text-emerald-500 mx-auto mb-3" />
                        <p className="text-slate-700 font-bold">Tudo certo por aqui!</p>
                        <p className="text-sm text-slate-500 mt-1">Todas as unidades já têm telefone e pelo menos uma foto cadastrados.</p>
                      </div>
                    ) : !unidadePendenteCompletar ? (
                      <div className="text-center py-14">
                        <PartyPopper size={40} className="text-emerald-500 mx-auto mb-3" />
                        <p className="text-slate-700 font-bold">Você completou todos os pendentes desta sessão!</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {completarPuladas.size > 0
                            ? `Ainda restam ${completarPuladas.size} local(is) que você pulou — recarregue a página para revê-los.`
                            : 'Nenhuma unidade pendente no momento.'}
                        </p>
                      </div>
                    ) : (
                      <div className="pt-5">
                        {/* Barra de progresso */}
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
                          <span>{concluidos} de {totalPendentesInicial} concluídos nesta sessão</span>
                          <span>{Math.round((concluidos / totalPendentesInicial) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-6">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${(concluidos / totalPendentesInicial) * 100}%` }}
                          />
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5">
                          <div className="flex items-start gap-3">
                            {unidadePendenteCompletar.imagens && unidadePendenteCompletar.imagens.length > 0 ? (
                              <img src={unidadePendenteCompletar.imagens[0]} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                                <Building2 size={26} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-slate-800">{unidadePendenteCompletar.nome}</h3>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 flex-shrink-0">
                                  {unidadePendenteCompletar.categoria || 'Saúde'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-500">{unidadePendenteCompletar.endereco}</p>
                              <div className="flex flex-wrap gap-2 mt-2.5">
                                <a
                                  href={buildGoogleMapsSearchUrl(unidadePendenteCompletar)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  <ExternalLink size={13} />
                                  Buscar no Google Maps
                                </a>
                                <a
                                  href={buildStreetViewUrl(unidadePendenteCompletar)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  <Camera size={13} />
                                  Ver no Street View
                                </a>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-2">
                                Dica: no Google Maps, copie o telefone do perfil do local; se não tiver foto cadastrada, tire um print do Street View e envie aqui embaixo.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                              <Phone size={14} /> Telefone
                            </label>
                            <input
                              type="tel"
                              value={completarTelefone}
                              onChange={e => setCompletarTelefone(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                              placeholder="Ex: (15) 3347-0000"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                              <Camera size={14} /> Foto do local
                            </label>
                            <ImageUpload
                              images={completarImagens}
                              onImagesChange={setCompletarImagens}
                              maxImages={10}
                              folder="unidades"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handlePularCompletarCadastro}
                            disabled={completarSalvando}
                            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
                          >
                            <SkipForward size={16} />
                            Pular por agora
                          </button>
                          <button
                            type="button"
                            onClick={handleSalvarCompletarCadastro}
                            disabled={completarSalvando}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                          >
                            {completarSalvando ? (
                              <>
                                <Loader2 size={18} className="animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              <>
                                <CheckCheck size={18} />
                                Salvar e avançar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Panel: Correções do Cidadão */}
            {activePanel === 'correcoes' && (() => {
              const CAMPO_LABEL = {
                endereco: 'Endereço',
                telefone: 'Telefone',
                horario: 'Horário de funcionamento',
                outro: 'Outro',
              };
              const STATUS_ESTILO = {
                pendente: { label: 'Pendente', cor: 'bg-amber-100 text-amber-700' },
                aprovado: { label: 'Aprovado', cor: 'bg-emerald-100 text-emerald-700' },
                descartado: { label: 'Descartado', cor: 'bg-slate-100 text-slate-500' },
              };
              const filtros = ['pendente', 'aprovado', 'descartado'];
              const registrosFiltrados = correcoes.filter(c => c.status === correcoesFiltro);
              const totalPendente = correcoes.filter(c => c.status === 'pendente').length;

              return (
                <div className="animate-fade-in">
                  <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                      <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <MessageSquareWarning className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Correções do Cidadão</h2>
                        <p className="text-sm text-slate-500">
                          Relatos de informações incorretas enviados pelo público.
                          {totalPendente > 0 && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-amber-600 font-semibold">
                              <AlertTriangle size={12} /> {totalPendente} pendente(s)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {correcoesErro ? (
                      <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2">
                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Configuração necessária:</strong> {correcoesErro}
                        </div>
                      </div>
                    ) : correcoesLoading ? (
                      <div className="text-center py-10 text-slate-500">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                        Carregando relatos...
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {filtros.map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setCorrecoesFiltro(f)}
                              aria-pressed={correcoesFiltro === f}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${correcoesFiltro === f
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                              {STATUS_ESTILO[f].label} ({correcoes.filter(c => c.status === f).length})
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={fetchCorrecoes}
                            className="ml-auto px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all"
                          >
                            ↻ Atualizar
                          </button>
                        </div>

                        {registrosFiltrados.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="text-4xl mb-3">{correcoesFiltro === 'pendente' ? '✅' : '🗒️'}</div>
                            <p className="text-slate-500 font-medium">
                              {correcoesFiltro === 'pendente'
                                ? 'Nenhum relato pendente de moderação!'
                                : `Nenhum relato ${STATUS_ESTILO[correcoesFiltro].label.toLowerCase()} ainda.`}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                            {registrosFiltrados.map(correcao => {
                              const isModerating = moderandoId === correcao.id;
                              return (
                                <div
                                  key={correcao.id}
                                  className={`border rounded-xl p-4 transition-all ${correcao.status === 'pendente'
                                    ? 'border-amber-200 bg-amber-50/40'
                                    : correcao.status === 'aprovado'
                                      ? 'border-emerald-100 bg-emerald-50/30'
                                      : 'border-slate-100 bg-white opacity-70'
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-3 mb-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_ESTILO[correcao.status].cor}`}>
                                        {STATUS_ESTILO[correcao.status].label}
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                        {CAMPO_LABEL[correcao.campo] || correcao.campo}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 flex-shrink-0">{tempoRelativo(correcao.criado_em)}</span>
                                  </div>

                                  <p className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                                    <MapPin size={11} className="text-indigo-400 flex-shrink-0" />
                                    {correcao.unidade_nome || <em className="text-slate-400 font-normal">unidade não identificada</em>}
                                  </p>

                                  <p className="text-sm text-slate-800 leading-relaxed bg-white border border-slate-100 rounded-lg px-3 py-2.5 mb-3">
                                    {correcao.descricao}
                                  </p>

                                  {correcao.status === 'pendente' ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button
                                        type="button"
                                        disabled={isModerating}
                                        onClick={() => handleModerarCorrecao(correcao.id, 'aprovado')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold transition-colors"
                                      >
                                        {isModerating ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                                        Aprovar
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isModerating}
                                        onClick={() => handleModerarCorrecao(correcao.id, 'descartado')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-600 text-xs font-bold transition-colors"
                                      >
                                        {isModerating ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                                        Descartar
                                      </button>
                                      {correcao.unidade_id && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const u = adminUnidades.find(x => x.id === correcao.unidade_id);
                                            if (u) handleEditUnidade(u);
                                          }}
                                          className="ml-auto flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                        >
                                          Editar unidade <ArrowRight size={11} />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-slate-400">
                                      {correcao.status === 'aprovado' ? '✔ Aprovado' : '✖ Descartado'}
                                      {correcao.moderado_em && ` · ${tempoRelativo(correcao.moderado_em)}`}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Panel: Trilha de Auditoria */}

            {activePanel === 'auditoria' && (() => {
              const ENTIDADE_LABEL = {
                evento: 'Evento',
                noticia: 'Notícia',
                unidade: 'Unidade',
                usuario: 'Usuário',
                importacao_unidades: 'Importação em massa',
              };
              const ACAO_ESTILO = {
                criar: { label: 'Criou', cor: 'bg-emerald-100 text-emerald-700' },
                editar: { label: 'Editou', cor: 'bg-amber-100 text-amber-700' },
                excluir: { label: 'Excluiu', cor: 'bg-red-100 text-red-700' },
              };
              const filtrosEntidade = ['Todos', ...Object.keys(ENTIDADE_LABEL)];
              const registrosFiltrados = auditoriaFiltro === 'Todos'
                ? auditoria
                : auditoria.filter(r => r.entidade === auditoriaFiltro);

              return (
                <div className="animate-fade-in">
                  <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <History className="text-slate-600" size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Trilha de Auditoria</h2>
                        <p className="text-sm text-slate-500">Quem criou, editou ou excluiu cada item, e quando — inclusive itens já excluídos.</p>
                      </div>
                    </div>

                    {auditoriaErro ? (
                      <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2">
                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                        {auditoriaErro}
                      </div>
                    ) : auditoriaLoading ? (
                      <div className="text-center py-10 text-slate-500">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                        Carregando trilha de auditoria...
                      </div>
                    ) : auditoria.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="text-4xl mb-3">🗒️</div>
                        <p className="text-slate-500 font-medium">Nenhuma ação registrada ainda.</p>
                        <p className="text-xs text-slate-400 mt-1">Novas criações, edições e exclusões passam a aparecer aqui a partir de agora.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {filtrosEntidade.map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setAuditoriaFiltro(f)}
                              aria-pressed={auditoriaFiltro === f}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${auditoriaFiltro === f
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                              {f === 'Todos' ? `Todos (${auditoria.length})` : `${ENTIDADE_LABEL[f]} (${auditoria.filter(r => r.entidade === f).length})`}
                            </button>
                          ))}
                        </div>

                        {registrosFiltrados.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-8">Nenhum registro para este filtro.</p>
                        ) : (
                          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                            {registrosFiltrados.map(registro => {
                              const acaoInfo = ACAO_ESTILO[registro.acao] || { label: registro.acao, cor: 'bg-slate-100 text-slate-600' };
                              return (
                                <div key={registro.id} className="flex items-start gap-3 p-3.5 bg-white border border-slate-100 rounded-xl">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${acaoInfo.cor}`}>
                                    {acaoInfo.label}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                      {registro.entidade_titulo || <em className="text-slate-400 font-normal">(sem título registrado)</em>}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {ENTIDADE_LABEL[registro.entidade] || registro.entidade} · {registro.usuario_email || 'usuário desconhecido'} · {tempoRelativo(registro.criado_em)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Correcoes do Cidadao pendentes */}
                  {!correcoesLoading && !correcoesErro && correcoes.filter(c => c.status === 'pendente').length > 0 && (
                    <div className="glass-panel rounded-2xl shadow-sm border border-amber-200 bg-amber-50 overflow-hidden">
                      <div className="flex items-center gap-3 p-5 sm:p-6">
                        <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <MessageSquareWarning className="text-amber-600" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-amber-800">
                            {correcoes.filter(c => c.status === 'pendente').length} correcao(oes) do cidadao aguardando revisao
                          </p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Cidadaos sinalizaram informacoes potencialmente incorretas no mapa publico.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActivePanel('correcoes')}
                          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                        >
                          Revisar <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Panel: Analytics de Uso */}
            {activePanel === 'analytics' && (
              <div className="animate-fade-in space-y-6">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-fuchsia-100 rounded-xl flex items-center justify-center">
                        <BarChart3 className="text-fuchsia-600" size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Analytics de Uso</h2>
                        <p className="text-sm text-slate-500">
                          Uso real e anônimo do portal público
                          {analyticsAgregados.desde && ` — desde ${tempoRelativo(analyticsAgregados.desde)}`}.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={fetchMetricas}
                      className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-all"
                    >
                      ↻ Atualizar
                    </button>
                  </div>

                  {metricasErro ? (
                    <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-start gap-2">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <div><strong>Configuração necessária:</strong> {metricasErro}</div>
                    </div>
                  ) : metricasLoading ? (
                    <div className="text-center py-10 text-slate-500">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                      Carregando dados de uso...
                    </div>
                  ) : metricas.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="text-4xl mb-3">📊</div>
                      <p className="text-slate-500 font-medium">Ainda sem dados de uso registrados.</p>
                      <p className="text-xs text-slate-400 mt-1">Os números começam a aparecer conforme o cidadão navega no portal público (mapa, eventos, notícias).</p>
                    </div>
                  ) : (
                    <>
                      {/* Cards de resumo */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                          <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wide">Unidades vistas</p>
                          <p className="text-2xl font-extrabold text-indigo-800 mt-1">{analyticsAgregados.totalVisualizacoes}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wide">Visitas às páginas</p>
                          <p className="text-2xl font-extrabold text-blue-800 mt-1">{analyticsAgregados.totalPaginasVistas}</p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wide">Filtros de categoria</p>
                          <p className="text-2xl font-extrabold text-amber-800 mt-1">{analyticsAgregados.totalFiltrosCategoria}</p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                          <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wide">Bairros identificados</p>
                          <p className="text-2xl font-extrabold text-emerald-800 mt-1">{analyticsAgregados.bairrosQueMaisAcessam.length}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Unidades mais vistas */}
                        <div className="border border-slate-200 rounded-xl p-4">
                          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-indigo-500" /> Unidades mais vistas
                          </h3>
                          {analyticsAgregados.unidadesMaisVistas.length === 0 ? (
                            <p className="text-xs text-slate-400">Sem visualizações registradas ainda.</p>
                          ) : (
                            <div className="space-y-2">
                              {analyticsAgregados.unidadesMaisVistas.map((item) => (
                                <div key={item.nome}>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-slate-700 truncate pr-2">{item.nome}</span>
                                    <span className="text-slate-400 font-bold flex-shrink-0">{item.total}</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-500 rounded-full"
                                      style={{ width: `${(item.total / analyticsAgregados.unidadesMaisVistas[0].total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Categorias mais filtradas */}
                        <div className="border border-slate-200 rounded-xl p-4">
                          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                            <Filter size={14} className="text-amber-500" /> Categorias mais filtradas
                          </h3>
                          {analyticsAgregados.categoriasMaisFiltradas.length === 0 ? (
                            <p className="text-xs text-slate-400">Sem uso dos filtros de categoria ainda.</p>
                          ) : (
                            <div className="space-y-2">
                              {analyticsAgregados.categoriasMaisFiltradas.map((item) => (
                                <div key={item.nome}>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-slate-700 truncate pr-2">{item.nome}</span>
                                    <span className="text-slate-400 font-bold flex-shrink-0">{item.total}</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-amber-500 rounded-full"
                                      style={{ width: `${(item.total / analyticsAgregados.categoriasMaisFiltradas[0].total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bairros que mais acessam */}
                        <div className="border border-slate-200 rounded-xl p-4">
                          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                            <MapPinned size={14} className="text-emerald-500" /> Bairros que mais acessam
                          </h3>
                          {analyticsAgregados.bairrosQueMaisAcessam.length === 0 ? (
                            <p className="text-xs text-slate-400">
                              Ainda sem dados de bairro — aparecem quando o cidadão usa o botão "Localizar-me" no mapa (a coordenada exata nunca é enviada, só o nome do bairro).
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {analyticsAgregados.bairrosQueMaisAcessam.map((item) => (
                                <div key={item.nome}>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-semibold text-slate-700 truncate pr-2">{item.nome}</span>
                                    <span className="text-slate-400 font-bold flex-shrink-0">{item.total}</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full"
                                      style={{ width: `${(item.total / analyticsAgregados.bairrosQueMaisAcessam[0].total) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Picos de uso */}
                        <div className="border border-slate-200 rounded-xl p-4">
                          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                            <Flame size={14} className="text-red-500" /> Picos de uso
                          </h3>
                          {analyticsAgregados.horaDePico === null ? (
                            <p className="text-xs text-slate-400">Sem dados suficientes ainda.</p>
                          ) : (
                            <>
                              <p className="text-xs text-slate-500 mb-3">
                                Horário com mais acessos: <strong className="text-slate-700">{analyticsAgregados.horaDePico}h</strong>
                                {' · '}Dia da semana com mais acessos: <strong className="text-slate-700">{analyticsAgregados.diaDePico}</strong>
                              </p>
                              <div className="flex items-end gap-[2px] h-16">
                                {analyticsAgregados.porHora.map((total, hora) => (
                                  <div
                                    key={hora}
                                    title={`${hora}h: ${total} acesso(s)`}
                                    className={`flex-1 rounded-sm ${hora === analyticsAgregados.horaDePico ? 'bg-red-500' : 'bg-slate-200'}`}
                                    style={{ height: `${Math.max(4, (total / analyticsAgregados.maxHora) * 100)}%` }}
                                  />
                                ))}
                              </div>
                              <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                                <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {analyticsAgregados.paginasMaisVistas.length > 0 && (
                        <div className="mt-5 border-t border-slate-100 pt-4 flex items-center gap-4 flex-wrap text-xs">
                          <span className="font-bold text-slate-500">Páginas mais visitadas:</span>
                          {analyticsAgregados.paginasMaisVistas.map((item) => (
                            <span key={item.nome} className="px-2.5 py-1 bg-slate-100 rounded-full font-semibold text-slate-600">
                              {item.nome} <span className="text-slate-400">({item.total})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Panel: Exportar Dados */}
            {activePanel === 'exportar' && (
              <div className="animate-fade-in">
                <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="h-10 w-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <Download className="text-teal-600" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Exportar Dados</h2>
                      <p className="text-sm text-slate-500">Baixe qualquer tabela como CSV — abre direto no Excel/Google Sheets. Útil pra relatório pra Prefeitura ou backup manual rápido.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(EXPORT_CONFIG).map(([chave, config]) => (
                      <div key={chave} className="flex items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileSpreadsheet size={16} className="text-teal-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800">{config.label}</p>
                            <p className="text-xs text-slate-400">{config.dados.length} registro(s)</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExportarCsv(chave)}
                          disabled={config.dados.length === 0}
                          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 text-white text-xs font-bold transition-colors"
                        >
                          <Download size={14} /> Baixar CSV
                        </button>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-400 mt-5">
                    O CSV de "Unidades" usa as mesmas colunas reconhecidas pela importação em massa (Nome, Endereço, Categoria, Latitude, Longitude, Telefone) — pode editar numa planilha e reimportar depois, se precisar.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}