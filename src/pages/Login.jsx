import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, checkAuth } from '../lib/supabase';
import { Heart, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 animate-gradient p-4 relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-400/20 rounded-full blur-3xl"></div>
      <div className="absolute top-[30%] right-[15%] w-[200px] h-[200px] bg-cyan-400/10 rounded-full blur-2xl animate-float"></div>

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium text-sm mb-6 transition-colors">
          <ArrowLeft size={16} />
          Voltar para a página pública
        </Link>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 sm:p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Heart className="h-8 w-8 text-white" fill="white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Acesso Restrito</h1>
            <p className="text-slate-500 text-sm">
              Portal exclusivo para profissionais da saúde e administradores da prefeitura.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">E-mail corporativo</label>
              <input 
                type="email" 
                id="login-email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="nome@votorantim.sp.gov.br"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-semibold p-3.5 rounded-xl border border-red-100 animate-slide-down">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              id="btn-login"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Autenticando...
                </>
              ) : (
                'Entrar no sistema'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Sistema protegido • Apenas usuários autorizados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
