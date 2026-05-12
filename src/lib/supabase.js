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
