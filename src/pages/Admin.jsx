import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, checkAuth, logout, createUserWithProfile, registrarAuditoria } from '../lib/supabase';
import {
  Megaphone, Users, Shield, LogOut, Calendar, Trash2, Pencil, XCircle,
  Plus, ExternalLink, LayoutDashboard, Newspaper,
  MapPin, Loader2, Star, Eye, Building2,
  Clock, PhoneOff, ImageOff, FileWarning, ArrowRight,
  Upload, FileSpreadsheet, Download, CheckSquare, Square, AlertTriangle,
  History
} from 'lucide-react';
import Toast from '../components/Toast';
import DateTimePickerModal from '../components/DateTimePickerModal';
import ImageUpload from '../components/ImageUpload';
import PublishPreviewModal from '../components/PublishPreviewModal';
import StatsCard from '../components/StatsCard';
import { parseCsvTexto, construirLinhasImportacao, gerarCsvModelo } from '../lib/importUnidades';

// Tempo relativo simples (ex.: "há 3h", "há 2 dia(s)") para a atividade recente do dashboard.
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

// Deriva o tipo (UBS/ESF/UPA/Hospital) e o "resto" do nome a partir do nome salvo,
// para pré-preencher corretamente o formulário ao editar uma unidade existente.
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

  // Edição de evento
  const [editingEventoId, setEditingEventoId] = useState(null);
  const [showEventoPreview, setShowEventoPreview] = useState(false);

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

  // Edição de unidade
  const [editingUnidadeId, setEditingUnidadeId] = useState(null);

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
  }, []);

  async function fetchAuditoria() {
    setAuditoriaLoading(true);
    setAuditoriaErro(null);
    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(200);

    if (error) {
      // Provavelmente a tabela "auditoria" ainda não existe (atualização do
      // setup_database.sql ainda não aplicada) — não é um erro grave, só falta configurar.
      setAuditoriaErro('A trilha de auditoria ainda não está disponível. Rode a atualização "trilha de auditoria" em setup_database.sql no SQL Editor do Supabase.');
      setAuditoria([]);
    } else {
      setAuditoria(data || []);
    }
    setAuditoriaLoading(false);
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

    // Remove acentuações para evitar problemas com buscas exatas
    const normalizeText = (str) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const normalizedAddress = normalizeText(unidadeEndereco);

    let data = null;

    // Tentativa 1: Endereço completo normalizado + Votorantim - SP
    let query1 = normalizedAddress;
    if (!query1.toLowerCase().includes('votorantim')) {
      query1 += ', Votorantim - SP';
    }
    data = await trySearch(query1);

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
    setActivePanel('unidades');
  };

  const handlePublishUnidade = async (e) => {
    e.preventDefault();
    if (!unidadeLat || !unidadeLng) {
      setToast({ message: "Por favor, defina a latitude e longitude.", type: "error" });
      return;
    }
    setUnidadePublishLoading(true);

    // A sub-classificação por prefixo no nome (UBS/ESF/Hospital/UPA) só se aplica
    // à categoria Saúde. Para as demais categorias (Educação, Cultura, Governo,
    // Lazer, Biblioteca) o nome é salvo como digitado.
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
      fetchAuditoria();
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'eventos', label: editingEventoId ? 'Editando Evento' : 'Publicar Evento', icon: editingEventoId ? Pencil : Megaphone },
    { id: 'gerenciar', label: 'Gerenciar Eventos', icon: Calendar },
    { id: 'noticias', label: editingNoticiaId ? 'Editando Notícia' : 'Publicar Notícia', icon: editingNoticiaId ? Pencil : Newspaper },
    { id: 'gerenciar_noticias', label: 'Gerenciar Notícias', icon: Eye },
    { id: 'unidades', label: editingUnidadeId ? 'Editando Unidade' : 'Adicionar Unidade', icon: editingUnidadeId ? Pencil : Building2 },
    { id: 'importar_unidades', label: 'Importar Unidades', icon: Upload },
    { id: 'gerenciar_unidades', label: 'Gerenciar Unidades', icon: MapPin },
    { id: 'usuarios', label: 'Cadastrar Usuário', icon: Users },
    { id: 'auditoria', label: 'Trilha de Auditoria', icon: History },
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
            <Link to="/noticias" target="_blank" className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-medium">
              <ExternalLink size={14} /> Portal de notícias
            </Link>
            <Link to="/" target="_blank" className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-medium">
              <ExternalLink size={14} /> Mapa da cidade
            </Link>
          </div>
        </aside>

        {/* Mobile Navigation Tabs */}
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-slate-200 z-30 flex overflow-x-auto">
          {sidebarLinks.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className={`flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold transition-all border-b-2 ${
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

            {/* Panel: Dashboard */}
            {activePanel === 'dashboard' && (() => {
              const statsUnidades = {
                ubs: adminUnidades.filter(u => !u.nome.toLowerCase().includes('esf') && !u.nome.toLowerCase().includes('hospital') && !u.nome.toLowerCase().includes('upa')).length,
                esf: adminUnidades.filter(u => u.nome.toLowerCase().includes('esf')).length,
                hospital: adminUnidades.filter(u => u.nome.toLowerCase().includes('hospital')).length,
                upa: adminUnidades.filter(u => u.nome.toLowerCase().includes('upa')).length,
              };

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
                  painel: 'gerenciar_unidades',
                },
                {
                  chave: 'imagem-unidade',
                  label: 'Unidades sem foto cadastrada',
                  descricao: 'A foto ajuda o cidadão a reconhecer a unidade ao chegar no local.',
                  icon: ImageOff,
                  faltando: unidadesSemImagem.length,
                  total: adminUnidades.length,
                  percentualCompleto: adminUnidades.length ? Math.round(((adminUnidades.length - unidadesSemImagem.length) / totalUnidades) * 100) : 100,
                  painel: 'gerenciar_unidades',
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

              return (
                <div className="animate-fade-in space-y-6">
                  {/* Panorama territorial */}
                  <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                      <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <LayoutDashboard className="text-indigo-600" size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Panorama territorial</h2>
                        <p className="text-sm text-slate-500">Visão agregada da rede de saúde cadastrada no sistema.</p>
                      </div>
                    </div>

                    {adminUnidadesLoading ? (
                      <div className="text-center py-6 text-slate-500">
                        <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                        Carregando indicadores...
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <StatsCard icon={Building2} value={statsUnidades.ubs} label="UBS" color="indigo" delay={0} />
                          <StatsCard icon={Building2} value={statsUnidades.esf} label="ESF" color="green" delay={100} />
                          <StatsCard icon={Building2} value={statsUnidades.hospital} label="Hospital" color="red" delay={200} />
                          <StatsCard icon={Building2} value={statsUnidades.upa} label="UPA" color="orange" delay={300} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                            <span className="text-sm font-semibold text-slate-600">Total de unidades</span>
                            <span className="text-lg font-extrabold text-slate-800">{adminUnidades.length}</span>
                          </div>
                          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                            <span className="text-sm font-semibold text-slate-600">Eventos/campanhas</span>
                            <span className="text-lg font-extrabold text-slate-800">{eventos.length}</span>
                          </div>
                          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                            <span className="text-sm font-semibold text-slate-600">Notícias publicadas</span>
                            <span className="text-lg font-extrabold text-slate-800">{noticias.length}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Atividade recente */}
                  <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Clock className="text-slate-600" size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Atividade recente</h2>
                        <p className="text-sm text-slate-500">Últimos cadastros e publicações, de todas as áreas.</p>
                      </div>
                    </div>

                    {atividadeRecente.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-slate-500 text-sm font-medium">Nenhuma atividade registrada ainda.</p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {atividadeRecente.map(item => {
                          const ItemIcon = item.icon;
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => setActivePanel(item.painel)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
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
                  <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                      <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <FileWarning className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800">Qualidade dos dados</h2>
                        <p className="text-sm text-slate-500">O que falta validar ou completar antes de considerar o cadastro maduro.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {qualidadeChecks.map(check => {
                        const CheckIcon = check.icon;
                        return (
                          <div key={check.chave} className="border border-slate-100 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-start gap-3">
                                <CheckIcon size={16} className={check.faltando > 0 ? 'text-amber-500 mt-0.5' : 'text-emerald-500 mt-0.5'} />
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
                          className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/50 flex items-center gap-2 ${
                            dataEvento ? 'text-slate-800 font-medium' : 'text-slate-400'
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

                    {/* Image Upload */}
                    <ImageUpload
                      images={eventoImagens}
                      onImagesChange={setEventoImagens}
                      maxImages={10}
                      folder="eventos"
                    />

                    <button type="submit" disabled={loading || !dataEvento} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                      {editingEventoId ? <Pencil size={18} /> : <Plus size={18} />}
                      {editingEventoId ? 'Revisar alterações' : 'Revisar e publicar'}
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
                              className={`border rounded-xl p-3.5 transition-all ${
                                !linha.valido ? 'bg-red-50/50 border-red-100' : selecionada ? 'bg-teal-50/50 border-teal-200' : 'bg-white border-slate-100'
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
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                auditoriaFiltro === f
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
                </div>
              );
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}
