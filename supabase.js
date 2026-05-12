// Configuração do Supabase
const supabaseUrl = 'https://glsirniungssbwqvodgg.supabase.co';
const supabaseKey = 'sb_publishable_QdUZOyIVbYJU1mSrCVwaBA_0pBiXi8N';

// Cria o cliente do Supabase (A biblioteca do Supabase precisa ser importada no HTML antes)
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Função auxiliar para verificar se o usuário está logado
async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
        return null;
    }
    
    // Buscar o perfil do usuário
    const { data: perfil, error: perfilError } = await supabase
        .from('perfis')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
    return {
        user: session.user,
        role: perfil ? perfil.role : null
    };
}

// Função de Logout
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}
