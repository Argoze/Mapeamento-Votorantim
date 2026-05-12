import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, checkAuth } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkExisting() {
      const authData = await checkAuth();
      if (authData) {
        if (authData.role === 'adm') navigate('/admin');
        if (authData.role === 'saude') navigate('/saude');
      }
    }
    checkExisting();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      const authData = await checkAuth();
      
      if (authData && authData.role === 'adm') {
        navigate('/admin');
      } else if (authData && authData.role === 'saude') {
        navigate('/saude');
      } else {
        throw new Error("Perfil de acesso não configurado. Contate o administrador.");
      }

    } catch (err) {
      setError(err.message || "E-mail ou senha incorretos.");
      if (err.message.includes("Perfil de acesso não configurado")) {
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-xl border border-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-900 mb-2">Acesso restrito</h1>
          <p className="text-slate-500 text-sm">Portal exclusivo para profissionais da saúde e ADM da prefeitura de Votorantim.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail corporativo</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="nome@votorantim.sp.gov.br"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-70"
          >
            {loading ? 'Autenticando...' : 'Entrar no sistema'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-blue-600 hover:underline font-medium">Voltar para a página pública</Link>
        </div>
      </div>
    </div>
  );
}
