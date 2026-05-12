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

// Cliente secundário (não altera a sessão de quem está logado)
export const supabaseAdminAuth = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Função para o ADM criar novos usuários
export async function createUserWithProfile(email, password, role, nome) {
  // 1. Criar na tabela de auth
  const { data: authData, error: authError } = await supabaseAdminAuth.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("Erro desconhecido ao criar usuário (sem ID retornado).");

  // 2. Criar o perfil usando a sessão principal (que tem permissão ADM)
  const { error: profileError } = await supabase.from('perfis').insert({
    id: authData.user.id,
    role,
    nome
  });

  if (profileError) {
    throw new Error("Usuário criado, mas não foi possível vincular o perfil: " + profileError.message);
  }

  return authData.user;
}
