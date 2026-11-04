import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function checkAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('role, nome, permissoes')
    .eq('id', session.user.id)
    .single();

  return {
    user: session.user,
    role: perfil ? perfil.role : null,
    nome: perfil?.nome || null,
    // null/undefined/[] = acesso total aos módulos do /admin (admin "master").
    // Só é relevante pra role === 'adm' — ver temAcesso() em Admin.jsx.
    permissoes: perfil?.permissoes || null,
  };
}

// Lista de módulos que podem ser restringidos por admin (ver coluna
// perfis.permissoes e a função SQL public.tem_permissao). Mantida aqui pra
// ficar fácil de reusar nos componentes que montam checkboxes de permissão.
export const MODULOS_ADMIN = [
  { id: 'noticias', label: 'Notícias' },
  { id: 'eventos', label: 'Eventos / Campanhas' },
  { id: 'unidades', label: 'Unidades de saúde' },
  { id: 'correcoes', label: 'Correções do cidadão' },
  { id: 'usuarios', label: 'Gerenciar usuários' },
  { id: 'relatorios', label: 'Relatórios e auditoria' },
  { id: 'home', label: 'Página inicial (hero e destaque)' },
];

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/login';
}

// Função para o ADM criar novos usuários.
//
// IMPORTANTE (segurança): antes, esta função usava a Service Role Key do Supabase
// diretamente aqui no cliente para poder chamar auth.admin.createUser(). Como toda
// variável VITE_* é embutida no bundle JS público, isso expunha a chave mestra do
// projeto (que ignora todas as políticas de RLS) a qualquer pessoa que inspecionasse
// o site publicado.
//
// A criação de usuário agora acontece inteiramente do lado do servidor, em uma
// Supabase Edge Function (supabase/functions/create-user). A Service Role Key fica
// só nos secrets dessa função (nunca em uma env VITE_*), e a própria função confere
// que quem está chamando é um usuário autenticado com papel 'adm' antes de criar
// qualquer conta nova. Ver supabase/functions/create-user/index.ts e o README para
// instruções de deploy e configuração dos secrets.
export async function createUserWithProfile(email, password, role, nome, permissoes = null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: { email, password, role, nome, permissoes },
  });

  if (error) {
    let message = error.message || "Erro ao criar usuário.";
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      }
    } catch {
      // corpo do erro não era JSON válido; mantém a mensagem genérica
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data.user;
}

// Extrai a mensagem de erro de uma chamada a supabase.functions.invoke — o erro
// "de rede" do SDK costuma vir genérico, mas o corpo JSON da resposta (quando a
// função responde com status != 2xx) traz a mensagem real. Usado por todas as
// chamadas às Edge Functions create-user e manage-user.
async function extrairErroDeFuncao(error, fallback) {
  let message = error?.message || fallback;
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    }
  } catch {
    // corpo do erro não era JSON válido; mantém a mensagem genérica
  }
  return message;
}

// Gestão de contas (além da criação): listar, desativar/reativar temporariamente
// (ban nativo do Supabase Auth, em vez de uma coluna customizada que poderia ser
// contornada chamando a API do Supabase Auth diretamente) e excluir permanentemente.
// Tudo roda na mesma Edge Function "manage-user", protegida do mesmo jeito que
// "create-user" — ver supabase/functions/manage-user/index.ts.
export async function listUsersAdmin() {
  const { data, error } = await supabase.functions.invoke('manage-user', {
    body: { action: 'list' },
  });
  if (error) throw new Error(await extrairErroDeFuncao(error, "Erro ao listar usuários."));
  if (data?.error) throw new Error(data.error);
  return data.users;
}

export async function setUserStatusAdmin(id, desativar) {
  const { data, error } = await supabase.functions.invoke('manage-user', {
    body: { action: 'set_status', id, desativar },
  });
  if (error) throw new Error(await extrairErroDeFuncao(error, "Erro ao atualizar status do usuário."));
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function setPermissoesAdmin(id, permissoes) {
  const { data, error } = await supabase.functions.invoke('manage-user', {
    body: { action: 'set_permissions', id, permissoes },
  });
  if (error) throw new Error(await extrairErroDeFuncao(error, "Erro ao atualizar permissões."));
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function deleteUserAdmin(id) {
  const { data, error } = await supabase.functions.invoke('manage-user', {
    body: { action: 'delete', id },
  });
  if (error) throw new Error(await extrairErroDeFuncao(error, "Erro ao excluir usuário."));
  if (data?.error) throw new Error(data.error);
  return data;
}

// Registra uma ação (criar/editar/excluir) na trilha de auditoria — quem fez o quê
// e quando, para governança e conformidade com a LGPD (ver setup_database.sql,
// seção "trilha de auditoria", e a tabela public.auditoria).
//
// Nunca lança erro: se o registro de auditoria falhar (ex.: a tabela ainda não foi
// criada no banco, porque a atualização em setup_database.sql ainda não foi
// aplicada), a ação principal do usuário já foi concluída e não deve ser desfeita
// ou bloqueada por causa disso — só avisamos no console.
export async function registrarAuditoria({ usuarioId, usuarioEmail, acao, entidade, entidadeId, entidadeTitulo }) {
  try {
    const { error } = await supabase.from('auditoria').insert({
      usuario_id: usuarioId,
      usuario_email: usuarioEmail,
      acao,
      entidade,
      entidade_id: entidadeId ?? null,
      entidade_titulo: entidadeTitulo ?? null,
    });
    if (error) {
      console.warn('Não foi possível registrar na trilha de auditoria (a ação principal foi concluída normalmente):', error.message);
    }
  } catch (err) {
    console.warn('Não foi possível registrar na trilha de auditoria (a ação principal foi concluída normalmente):', err);
  }
}