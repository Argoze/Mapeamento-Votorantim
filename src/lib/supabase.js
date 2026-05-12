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

const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Cliente secundário usando a Service Role Key (chave mestra) para driblar o bloqueio de e-mails
export const supabaseAdminAuth = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseKey, 
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Função para o ADM criar novos usuários
export async function createUserWithProfile(email, password, role, nome) {
  if (!supabaseServiceKey) {
    throw new Error("VITE_SUPABASE_SERVICE_ROLE_KEY não encontrada no .env! Ela é necessária para burlar o limite de e-mails do plano gratuito.");
  }

  // 1. Criar na tabela de auth usando a API de Admin (já confirmando o email automaticamente)
  const { data: authData, error: authError } = await supabaseAdminAuth.auth.admin.createUser({
    email,
    password,
    email_confirm: true // <- ISSO AQUI FAZ O MILAGRE: Não envia email e dribla o Rate Limit!
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("Erro desconhecido ao criar usuário.");

  // 2. Criar o perfil usando a sessão principal (que tem permissão ADM)
  const { error: profileError } = await supabase.from('perfis').insert({
    id: authData.user.id,
    role,
    nome
  });

  if (profileError) {
    throw new Error("Usuário criado no sistema, mas não foi possível vincular o perfil: " + profileError.message);
  }

  return authData.user;
}
