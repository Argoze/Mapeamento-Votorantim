import { useState, useEffect } from 'react';
import { LayoutTemplate, Save, Trash2, Loader2, ChevronDown, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CampanhaTemplateBar({ formData, onAplicarTemplate, currentUser, onToast }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const [excluindoId, setExcluindoId] = useState(null);
    const [mostrarSalvar, setMostrarSalvar] = useState(false);
    const [nomeTemplate, setNomeTemplate] = useState('');
    const [aberto, setAberto] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    async function fetchTemplates() {
        setLoading(true);
        const { data, error } = await supabase
            .from('campanha_templates')
            .select('*')
            .order('nome', { ascending: true });

        if (error) {
            setErro('Modelos de campanha ainda não configurados. Rode o script agendamento_templates_setup.sql no SQL Editor do Supabase.');
            setTemplates([]);
        } else {
            setErro(null);
            setTemplates(data || []);
        }
        setLoading(false);
    }

    const handleSalvar = async () => {
        if (!nomeTemplate.trim()) return;
        if (!formData.titulo?.trim()) {
            onToast?.({ message: 'Preencha ao menos o título da campanha antes de salvar como modelo.', type: 'error' });
            return;
        }
        setSalvando(true);
        try {
            const payload = {
                nome: nomeTemplate.trim(),
                titulo: formData.titulo,
                descricao: formData.descricao || null,
                local_evento: formData.local_evento || null,
                tipo: formData.tipo || 'Informativo',
                imagens: formData.imagens && formData.imagens.length > 0 ? formData.imagens : null,
                criado_por: currentUser?.id || null,
            };
            const { error } = await supabase.from('campanha_templates').insert([payload]);
            if (error) throw error;
            onToast?.({ message: `Modelo "${nomeTemplate.trim()}" salvo! Já aparece pra toda a equipe.`, type: 'success' });
            setNomeTemplate('');
            setMostrarSalvar(false);
            fetchTemplates();
        } catch (err) {
            onToast?.({ message: 'Erro ao salvar modelo: ' + err.message, type: 'error' });
        }
        setSalvando(false);
    };

    const handleExcluir = async (id, nome) => {
        setExcluindoId(id);
        try {
            const { error } = await supabase.from('campanha_templates').delete().eq('id', id);
            if (error) throw error;
            onToast?.({ message: `Modelo "${nome}" excluído.`, type: 'info' });
            fetchTemplates();
        } catch (err) {
            onToast?.({ message: 'Erro ao excluir modelo: ' + err.message, type: 'error' });
        }
        setExcluindoId(null);
    };

    if (erro) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-400">
                {erro}
            </div>
        );
    }

    return (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3.5">
            <button
                type="button"
                onClick={() => setAberto((a) => !a)}
                className="w-full flex items-center justify-between gap-2 text-left"
            >
                <span className="flex items-center gap-2 text-sm font-semibold text-violet-800">
                    <LayoutTemplate size={16} />
                    Modelos de campanha {templates.length > 0 && `(${templates.length})`}
                </span>
                <ChevronDown size={16} className={`text-violet-500 transition-transform ${aberto ? 'rotate-180' : ''}`} />
            </button>

            {aberto && (
                <div className="mt-3 space-y-2.5 animate-fade-in">
                    {loading ? (
                        <p className="text-xs text-violet-500 flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" /> Carregando modelos...
                        </p>
                    ) : templates.length === 0 ? (
                        <p className="text-xs text-violet-500">
                            Nenhum modelo salvo ainda. Preencha a campanha abaixo e use "Salvar como modelo" pra reaproveitar depois (ex: campanha de vacinação, mutirão de dengue...).
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {templates.map((t) => (
                                <div
                                    key={t.id}
                                    className="group flex items-center gap-1 bg-white border border-violet-200 rounded-lg pl-3 pr-1.5 py-1.5"
                                >
                                    <button
                                        type="button"
                                        onClick={() => onAplicarTemplate(t)}
                                        className="text-xs font-semibold text-violet-700 hover:text-violet-900"
                                        title={`Usar modelo "${t.nome}"`}
                                    >
                                        {t.nome}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExcluir(t.id, t.nome)}
                                        disabled={excluindoId === t.id}
                                        title="Excluir modelo"
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 rounded transition-all"
                                    >
                                        {excluindoId === t.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-violet-200 pt-2.5">
                        {mostrarSalvar ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    autoFocus
                                    value={nomeTemplate}
                                    onChange={(e) => setNomeTemplate(e.target.value)}
                                    placeholder="Nome do modelo (ex: Campanha de vacinação)"
                                    className="flex-1 px-3 py-2 bg-white border border-violet-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-violet-400"
                                />
                                <button
                                    type="button"
                                    onClick={handleSalvar}
                                    disabled={salvando || !nomeTemplate.trim()}
                                    className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60 shrink-0"
                                >
                                    {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMostrarSalvar(false); setNomeTemplate(''); }}
                                    className="px-2 py-2 text-xs text-slate-400 hover:text-slate-600 shrink-0"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setMostrarSalvar(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800"
                            >
                                <Save size={13} /> Salvar os campos atuais como modelo
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}