import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ExternalLink, Menu, Shield, X } from 'lucide-react';

// Menu lateral do /admin — redesenhado para o visual "sidebar escura de
// altura total + topbar clara dentro do conteúdo" (ver Admin.jsx, que monta
// a topbar nova). Este componente concentra toda a navegação: no desktop
// (lg+) é uma coluna fixa da altura inteira da tela; no mobile vira um menu
// hambúrguer em tela cheia (mesmo padrão do Navbar.jsx do cidadão), nunca
// uma barra de abas horizontal — isso é o que antes forçava scroll lateral
// na página inteira no mobile.
//
// `groups`: array de { id, label, icon, badge?, children?: [{ id, label,
// icon, badge? }] }. Um item sem "children" é um link direto (ex:
// Dashboard); um item com "children" vira um grupo expansível.
//
// O grupo que contém o item ativo abre sozinho (derivado de activePanel, sem
// useEffect — estado derivado direto no corpo do componente, pra não violar
// a regra de lint do projeto que proíbe setState dentro de useEffect).
// Clicar no cabeçalho de um grupo alterna (abre/fecha) independente disso,
// só pra permitir espiar os itens sem precisar navegar pra lá.
export default function AdminSidebar({ groups, activePanel, setActivePanel, quickLinks = [] }) {
    const [manualToggle, setManualToggle] = useState(() => new Set());
    const [previousActivePanel, setPreviousActivePanel] = useState(activePanel);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileGroupsOpen, setMobileGroupsOpen] = useState(() => new Set());

    if (activePanel !== previousActivePanel) {
        setPreviousActivePanel(activePanel);
        if (manualToggle.size > 0) setManualToggle(new Set());
        if (mobileMenuOpen) setMobileMenuOpen(false);
    }

    // Trava o scroll do body enquanto o menu mobile está aberto, mesmo
    // padrão do Navbar.jsx do cidadão.
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const toggleMobileGroup = (id) => {
        setMobileGroupsOpen((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

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

    const corItem = (ativo) =>
        ativo
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-indigo-200 hover:bg-white/10 hover:text-white';

    // No menu mobile, o grupo que contém o item ativo começa aberto (mesma
    // regra derivada usada no desktop); o toggle manual soma/inverte isso.
    const isMobileGroupOpen = (grupo) => {
        const baseOpen = !!grupo.children?.some((c) => c.id === activePanel);
        const flipped = mobileGroupsOpen.has(grupo.id);
        return flipped ? !baseOpen : baseOpen;
    };

    return (
        <>
            {/* ---------- Mobile: barra fina + botão de hambúrguer (nunca
                rola na horizontal — o menu completo abre em tela cheia,
                igual ao Navbar.jsx do cidadão) ---------- */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-indigo-950 shadow-lg h-14 flex items-center justify-between px-4">
                <button
                    type="button"
                    onClick={() => setActivePanel('dashboard')}
                    title="Ir para o Dashboard"
                    className="flex items-center gap-2.5 min-w-0 -mx-1 px-1 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img src="/logo-votorantim.png" alt="Prefeitura de Votorantim" className="h-9 w-9 object-contain" />
                    </div>
                    <p className="text-white font-extrabold text-sm leading-tight truncate">Painel administrativo</p>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="admin-mobile-menu-panel"
                    aria-label="Abrir menu de navegação"
                    className="p-2 rounded-xl text-indigo-100 hover:bg-white/10 transition-colors flex-shrink-0"
                >
                    <Menu size={22} />
                </button>
            </header>

            {mobileMenuOpen && (
                <div
                    id="admin-mobile-menu-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Navegação do painel administrativo"
                    className="lg:hidden fixed inset-0 z-[60] bg-indigo-950 flex flex-col animate-fade-in"
                >
                    <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 flex-shrink-0">
                        <p className="text-white font-extrabold text-sm">Painel administrativo</p>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            aria-label="Fechar menu de navegação"
                            className="p-2 rounded-xl text-indigo-100 hover:bg-white/10 transition-colors flex-shrink-0"
                        >
                            <X size={22} />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Navegação principal">
                        {groups.map((grupo) => {
                            if (!grupo.children) {
                                const GrupoIcon = grupo.icon;
                                const ativo = activePanel === grupo.id;
                                const badge = itemBadge(grupo);
                                return (
                                    <button
                                        key={grupo.id}
                                        type="button"
                                        onClick={() => { setActivePanel(grupo.id); setMobileMenuOpen(false); }}
                                        aria-current={ativo ? 'page' : undefined}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-bold transition-all ${corItem(ativo)}`}
                                    >
                                        <GrupoIcon size={19} className="flex-shrink-0" />
                                        <span className="flex-1 text-left truncate">{grupo.label}</span>
                                        {badge > 0 && (
                                            <span className="h-5 min-w-5 px-1 rounded-full bg-amber-400 text-indigo-950 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            }

                            const GrupoIcon = grupo.icon;
                            const aberto = isMobileGroupOpen(grupo);
                            const badgeGrupo = itemBadge(grupo);
                            return (
                                <div key={grupo.id}>
                                    <button
                                        type="button"
                                        onClick={() => toggleMobileGroup(grupo.id)}
                                        aria-expanded={aberto}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-bold text-indigo-200 hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        <GrupoIcon size={19} className="flex-shrink-0" />
                                        <span className="flex-1 text-left truncate">{grupo.label}</span>
                                        {badgeGrupo > 0 && (
                                            <span className="h-5 min-w-5 px-1 rounded-full bg-amber-400 text-indigo-950 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {badgeGrupo}
                                            </span>
                                        )}
                                        <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                                    </button>
                                    {aberto && (
                                        <div className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-0.5 animate-slide-down">
                                            {grupo.children.map((item) => {
                                                const ItemIcon = item.icon;
                                                const ativo = activePanel === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => { setActivePanel(item.id); setMobileMenuOpen(false); }}
                                                        aria-current={ativo ? 'page' : undefined}
                                                        className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all ${corItem(ativo)}`}
                                                    >
                                                        <ItemIcon size={15} className="flex-shrink-0" />
                                                        <span className="flex-1 text-left truncate">{item.label}</span>
                                                        {item.badge > 0 && (
                                                            <span className="h-4 min-w-4 px-1 rounded-full bg-amber-400 text-indigo-950 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {quickLinks.length > 0 && (
                        <div className="px-3 pt-2 pb-4 border-t border-white/10 flex-shrink-0">
                            <Link
                                to={quickLinks[0].to}
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl text-sm font-bold text-indigo-100 bg-white/10 hover:bg-white/15 hover:text-white transition-all"
                            >
                                <ExternalLink size={16} className="flex-shrink-0" />
                                <span className="truncate">{quickLinks[0].label}</span>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* ---------- Desktop: coluna fixa de altura total ---------- */}
            <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-gradient-to-b from-indigo-900 via-indigo-950 to-purple-950 flex-col z-40">
                {/* Marca */}
                <button
                    type="button"
                    onClick={() => setActivePanel('dashboard')}
                    title="Ir para o Dashboard"
                    className="flex items-center gap-2.5 px-5 h-16 flex-shrink-0 border-b border-white/10 hover:bg-white/5 transition-colors text-left"
                >
                    <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                        <img src="/logo-votorantim.png" alt="Prefeitura de Votorantim" className="h-10 w-10 object-contain" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-extrabold text-sm leading-tight truncate">Votorantim Inteligente</p>
                        <p className="text-indigo-300 text-[10px] leading-tight truncate">Painel administrativo</p>
                    </div>
                </button>

                {/* Navegação */}
                <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 custom-scrollbar">
                    {groups.map((grupo) => {
                        if (!grupo.children) {
                            const GrupoIcon = grupo.icon;
                            const ativo = activePanel === grupo.id;
                            const badge = itemBadge(grupo);
                            return (
                                <button
                                    key={grupo.id}
                                    type="button"
                                    onClick={() => setActivePanel(grupo.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${corItem(ativo)}`}
                                >
                                    <GrupoIcon size={16} className="flex-shrink-0" />
                                    <span className="flex-1 text-left truncate">{grupo.label}</span>
                                    {badge > 0 && (
                                        <span className="h-5 min-w-5 px-1 rounded-full bg-amber-400 text-indigo-950 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                            {badge}
                                        </span>
                                    )}
                                </button>
                            );
                        }

                        const GrupoIcon = grupo.icon;
                        const aberto = isGroupOpen(grupo);
                        const badgeGrupo = itemBadge(grupo);
                        return (
                            <div key={grupo.id}>
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(grupo.id)}
                                    aria-expanded={aberto}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-indigo-200 hover:bg-white/10 hover:text-white transition-all"
                                >
                                    <GrupoIcon size={16} className="flex-shrink-0" />
                                    <span className="flex-1 text-left truncate">{grupo.label}</span>
                                    {badgeGrupo > 0 && (
                                        <span className="h-5 min-w-5 px-1 rounded-full bg-amber-400 text-indigo-950 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                            {badgeGrupo}
                                        </span>
                                    )}
                                    <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                                </button>
                                {aberto && (
                                    <div className="mt-1 ml-3.5 pl-3.5 border-l border-white/10 space-y-0.5 animate-slide-down">
                                        {grupo.children.map((item) => {
                                            const ItemIcon = item.icon;
                                            const ativo = activePanel === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setActivePanel(item.id)}
                                                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${corItem(ativo)}`}
                                                >
                                                    <ItemIcon size={13} className="flex-shrink-0" />
                                                    <span className="flex-1 text-left truncate">{item.label}</span>
                                                    {item.badge > 0 && (
                                                        <span className="h-4 min-w-4 px-1 rounded-full bg-amber-400 text-indigo-950 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Acesso rápido: visão pública consolidada em um único botão */}
                {quickLinks.length > 0 && (
                    <div className="px-3 pt-2 pb-1 border-t border-white/10 flex-shrink-0">
                        <Link
                            to={quickLinks[0].to}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-indigo-100 bg-white/10 hover:bg-white/15 hover:text-white transition-all"
                        >
                            <ExternalLink size={14} className="flex-shrink-0" />
                            <span className="truncate">{quickLinks[0].label}</span>
                        </Link>
                    </div>
                )}

                {/* Rodapé decorativo */}
                <div className="relative px-5 py-4 flex-shrink-0 border-t border-white/10 overflow-hidden">
                    <svg viewBox="0 0 220 36" className="absolute inset-x-0 bottom-0 w-full h-9 text-white/5" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0 36 L0 20 L15 20 L15 10 L25 10 L25 20 L40 20 L40 5 L55 5 L55 20 L75 20 L75 14 L90 14 L90 20 L110 20 L110 2 L130 2 L130 20 L150 20 L150 12 L165 12 L165 20 L185 20 L185 8 L200 8 L200 20 L220 20 L220 36 Z" fill="currentColor" />
                    </svg>
                    <div className="relative flex items-center gap-2">
                        <Shield size={14} className="text-indigo-300 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold text-indigo-200 truncate">Votorantim Inteligente</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}