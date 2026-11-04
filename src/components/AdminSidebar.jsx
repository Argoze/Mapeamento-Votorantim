import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink } from 'lucide-react';

// Menu lateral do /admin: agrupa itens relacionados em categorias expansíveis
// (ex: "Eventos" → Publicar Evento | Gerenciar Eventos), em vez de uma lista
// longa e plana — isso resolve dois problemas ao mesmo tempo:
//
// 1) Reduz a quantidade de itens de topo (de ~13 pra ~7), facilitando achar
//    o que precisa sem rolar tanto.
// 2) O <aside> do desktop, antes, usava "fixed" + "min-h-[...]" sem nenhum
//    overflow — numa tela menor (ex: notebook com pouca altura, ou com zoom
//    do navegador aumentado), os itens de baixo ficavam cortados e não dava
//    pra rolar até eles de jeito nenhum. Aqui o <aside> tem altura travada
//    (h-[calc(100vh-64px)]) e overflow-y-auto, então agora ele sempre rola.
//
// `groups`: array de { id, label, icon, badge?, children?: [{ id, label,
// icon, badge? }] }. Um item sem "children" é um link direto (ex:
// Dashboard); um item com "children" vira um grupo expansível.
//
// O grupo que contém o item ativo abre sozinho (derivado de activePanel, sem
// useEffect — ver padrão "previousActivePanel" abaixo, igual ao já usado em
// outros pontos deste arquivo pra não violar a regra de lint do projeto que
// proíbe setState dentro de useEffect). Clicar no cabeçalho de um grupo
// alterna (abre/fecha) independente disso, só pra permitir espiar os itens
// sem precisar navegar pra lá.
export default function AdminSidebar({ groups, activePanel, setActivePanel, quickLinks = [] }) {
    const [manualToggle, setManualToggle] = useState(() => new Set());
    const [previousActivePanel, setPreviousActivePanel] = useState(activePanel);

    // Ajuste de estado derivado direto no corpo do componente (não dentro de um
    // useEffect) — assim que o painel ativo muda por qualquer razão externa ao
    // clique no cabeçalho do grupo (ex: um atalho "Revisar" no dashboard), os
    // toggles manuais são descartados, porque o grupo correto já vai abrir
    // sozinho via "baseOpen" (calculado abaixo a partir do próprio activePanel).
    if (activePanel !== previousActivePanel) {
        setPreviousActivePanel(activePanel);
        if (manualToggle.size > 0) setManualToggle(new Set());
    }

    const isGroupOpen = (grupo) => {
        const baseOpen = !!grupo.children?.some((c) => c.id === activePanel);
        const flipped = manualToggle.has(grupo.id);
        return flipped ? !baseOpen : baseOpen;
    };

    const toggleGroup = (id) => {
        setManualToggle((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const itemBadge = (item) => item.badge || (item.children ? item.children.reduce((soma, c) => soma + (c.badge || 0), 0) : 0);

    // Lista plana (sem agrupamento) usada nas abas horizontais do mobile —
    // nesse formato não faz sentido aninhar grupos expansíveis.
    const itensPlanos = groups.flatMap((g) => (g.children ? g.children : [g]));

    return (
        <>
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-[calc(100vh-64px)] fixed left-0 top-16 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-1 flex-1 p-4">
                    {groups.map((grupo) => {
                        const Icon = grupo.icon;
                        const badge = itemBadge(grupo);

                        if (!grupo.children) {
                            return (
                                <button
                                    key={grupo.id}
                                    onClick={() => setActivePanel(grupo.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${activePanel === grupo.id
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="flex-1">{grupo.label}</span>
                                    {badge ? (
                                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                                            {badge}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        }

                        const aberto = isGroupOpen(grupo);
                        const grupoAtivo = grupo.children.some((c) => c.id === activePanel);

                        return (
                            <div key={grupo.id}>
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(grupo.id)}
                                    aria-expanded={aberto}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${grupoAtivo
                                        ? 'text-indigo-700'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="flex-1">{grupo.label}</span>
                                    {badge ? (
                                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                                            {badge}
                                        </span>
                                    ) : null}
                                    <ChevronDown size={15} className={`text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                                </button>

                                {aberto && (
                                    <div className="ml-4 pl-3 border-l-2 border-slate-100 flex flex-col gap-0.5 mt-0.5 mb-1 animate-fade-in">
                                        {grupo.children.map((item) => {
                                            const ItemIcon = item.icon;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActivePanel(item.id)}
                                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all text-left ${activePanel === item.id
                                                        ? 'bg-indigo-50 text-indigo-700'
                                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                                        }`}
                                                >
                                                    <ItemIcon size={15} />
                                                    <span className="flex-1">{item.label}</span>
                                                    {item.badge ? (
                                                        <span className="h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                                                            {item.badge}
                                                        </span>
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {quickLinks.length > 0 && (
                    <div className="border-t border-slate-100 p-4 space-y-2 shrink-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4">Acesso rápido</p>
                        {quickLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-medium"
                            >
                                <ExternalLink size={14} /> {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </aside>

            {/* Mobile Navigation Tabs */}
            <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-slate-200 z-30 flex overflow-x-auto">
                {itensPlanos.map(({ id, label, icon: Icon, badge }) => (
                    <button
                        key={id}
                        onClick={() => setActivePanel(id)}
                        className={`flex-shrink-0 relative flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold transition-all border-b-2 ${activePanel === id
                            ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                            : 'border-transparent text-slate-500'
                            }`}
                    >
                        <Icon size={16} />
                        <span className="hidden sm:inline">{label}</span>
                        {badge ? (
                            <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                                {badge}
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>
        </>
    );
}