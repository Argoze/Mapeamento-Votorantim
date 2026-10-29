import { useState } from 'react';
import { AlertTriangle, Send, X, CheckCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CAMPOS = [
  { value: 'endereco', label: 'Endereço incorreto' },
  { value: 'telefone', label: 'Telefone incorreto ou inexistente' },
  { value: 'horario',  label: 'Horário de funcionamento errado' },
  { value: 'outro',    label: 'Outra informação errada' },
];

// Formulário colapsável para o cidadão reportar uma informação incorreta.
// Renderizado dentro do UnidadeDetalheModal, abaixo dos botões de ação.
export default function ReportarCorrecaoModal({ unidade }) {
  const [aberto, setAberto]       = useState(false);
  const [campo, setCampo]         = useState('endereco');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading]     = useState(false);
  const [enviado, setEnviado]     = useState(false);
  const [erro, setErro]           = useState(null);

  // Reseta o estado ao fechar o painel.
  const fechar = () => {
    setAberto(false);
    setDescricao('');
    setCampo('endereco');
    setErro(null);
    setEnviado(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao.trim()) return;

    setLoading(true);
    setErro(null);
    try {
      const { error } = await supabase.from('correcoes').insert({
        unidade_id:   unidade.id,
        unidade_nome: unidade.nome,
        campo,
        descricao: descricao.trim(),
        status: 'pendente',
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err) {
      console.error(err);
      setErro('Não foi possível enviar. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      {/* Botão gatilho */}
      {!aberto && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-sm transition-colors"
          aria-expanded="false"
          aria-controls="painel-correcao"
        >
          <AlertTriangle size={15} />
          Essa informação está errada?
        </button>
      )}

      {/* Painel colapsável */}
      {aberto && (
        <div
          id="painel-correcao"
          role="region"
          aria-label="Reportar informação incorreta"
          className="border border-amber-200 rounded-xl bg-amber-50 overflow-hidden animate-fade-in"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
              <span className="text-sm font-bold text-amber-800">Reportar informação incorreta</span>
            </div>
            <button
              type="button"
              onClick={fechar}
              aria-label="Fechar formulário de correção"
              className="h-6 w-6 rounded-full flex items-center justify-center text-amber-500 hover:text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Corpo */}
          <div className="p-4">
            {enviado ? (
              // Confirmação de envio
              <div className="flex flex-col items-center gap-2 py-3 text-center animate-fade-in">
                <CheckCircle size={28} className="text-emerald-500" />
                <p className="text-sm font-bold text-slate-800">Obrigado pela contribuição!</p>
                <p className="text-xs text-slate-500 leading-snug">
                  Seu relato foi enviado para revisão. Nossa equipe vai verificar e corrigir em breve.
                </p>
                <button
                  type="button"
                  onClick={fechar}
                  className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Seletor de campo */}
                <div>
                  <label
                    htmlFor={`select-campo-${unidade.id}`}
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    O que está errado?
                  </label>
                  <div className="relative">
                    <select
                      id={`select-campo-${unidade.id}`}
                      value={campo}
                      onChange={e => setCampo(e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 pr-8 bg-white border border-amber-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    >
                      {CAMPOS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label
                    htmlFor={`textarea-descricao-${unidade.id}`}
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Qual é a informação correta?
                  </label>
                  <textarea
                    id={`textarea-descricao-${unidade.id}`}
                    required
                    rows={3}
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    placeholder="Ex: O telefone correto é (15) 3212-4567"
                    className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-slate-400 text-right mt-0.5">{descricao.length}/500</p>
                </div>

                {/* Erro */}
                {erro && (
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} /> {erro}
                  </p>
                )}

                {/* Ações */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="submit"
                    disabled={loading || !descricao.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-sm transition-colors"
                  >
                    {loading ? (
                      <span className="inline-block h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {loading ? 'Enviando...' : 'Enviar relato'}
                  </button>
                  <button
                    type="button"
                    onClick={fechar}
                    className="px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 leading-snug">
                  Suas informações são enviadas anonimamente para revisão da equipe responsável. Nenhum dado pessoal é coletado.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
