import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { KeyRound, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

// Página que o link do e-mail "Redefinir senha" abre. O Supabase, ao detectar
// o token de recuperação na URL (detectSessionInUrl: true, padrão do cliente
// criado em lib/supabase.js), já autentica automaticamente o usuário numa
// sessão temporária de recuperação — então aqui só precisamos pedir a nova
// senha e chamar supabase.auth.updateUser({ password }).
export default function RedefinirSenha() {
    const [novaSenha, setNovaSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [sessaoValida, setSessaoValida] = useState(null); // null = verificando
    const navigate = useNavigate();

    useEffect(() => {
        // Dá um instante pro cliente Supabase processar o token da URL antes de checar a sessão.
        const verificar = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSessaoValida(!!session);
        };
        verificar();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (novaSenha.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (novaSenha !== confirmarSenha) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha });
            if (updateError) throw updateError;
            setSucesso(true);
        } catch (err) {
            setError(err.message || 'Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 animate-gradient p-4 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-400/20 rounded-full blur-3xl"></div>

            <div className="w-full max-w-md relative z-10 animate-scale-in">
                <Link to="/login" className="inline-flex items-center gap-2 text-white/80 hover:text-white font-medium text-sm mb-6 transition-colors">
                    <ArrowLeft size={16} />
                    Voltar para o login
                </Link>

                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 sm:p-10">
                    <div className="text-center mb-8">
                        <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <KeyRound className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Redefinir senha</h1>
                        <p className="text-slate-500 text-sm">Escolha uma nova senha de acesso.</p>
                    </div>

                    {sessaoValida === null ? (
                        <p className="text-sm text-slate-400 flex items-center gap-2 justify-center py-6">
                            <Loader2 size={16} className="animate-spin" /> Verificando link...
                        </p>
                    ) : sucesso ? (
                        <div className="text-center space-y-4">
                            <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
                            <p className="text-sm text-slate-600 font-medium">Senha atualizada com sucesso!</p>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
                            >
                                Ir para o login
                            </button>
                        </div>
                    ) : !sessaoValida ? (
                        <div className="text-center space-y-3">
                            <p className="text-sm text-red-500 font-semibold">Este link de redefinição é inválido ou já expirou.</p>
                            <p className="text-xs text-slate-400">Peça para um administrador enviar um novo link de redefinição de senha.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nova senha</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={novaSenha}
                                        onChange={(e) => setNovaSenha(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm pr-12"
                                        placeholder="Mín. 6 caracteres"
                                        minLength={6}
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

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmar nova senha</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="Repita a nova senha"
                                    minLength={6}
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 text-sm font-semibold p-3.5 rounded-xl border border-red-100 animate-slide-down">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar nova senha'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}