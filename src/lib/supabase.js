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
        .select('role')
        .eq('id', session.user.id)
        .single();

    return {
        user: session.user,
        role: perfil ? perfil.role : null
    };
}

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
export async function createUserWithProfile(email, password, role, nome) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: { email, password, role, nome },
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
