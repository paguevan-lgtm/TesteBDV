
import React from 'react';
import { Icons } from './Shared';
import { getAvatarUrl } from '../utils';
import { motion } from 'motion/react';

export const Sidebar = ({ 
    theme, 
    view, 
    setView, 
    menuOpen, 
    setMenuOpen, 
    user, 
    orderedMenuItems, 
    daysRemaining,
    renewalDate,
    setRunTour,
    systemContext
}: any) => {

    const renderMenuContent = (isMobile: boolean) => (
        <>
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white">
                        <Icons.Van size={24}/>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold">Bora de Van</h1>
                        <div className="text-xs font-bold uppercase tracking-widest opacity-50">{systemContext}</div>
                    </div>
                </div>
                {isMobile && <button onClick={() => setMenuOpen(false)}><Icons.X /></button>}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
                {orderedMenuItems.map((item:any, index:number) => (
                    <motion.div 
                        key={item.id} 
                        className="relative rounded-xl"
                    >
                        <button 
                            id={`menu-btn-${item.id}${isMobile ? '-mobile' : ''}`} 
                            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') e.stopPropagation(); }}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent Ctrl+K trigger
                                setView(item.id);
                                if(isMobile) setMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative z-10 ${view === item.id ? `${theme.primary} shadow-lg` : 'hover:bg-white/5 opacity-70 hover:opacity-100'}`}
                        >
                            <item.i size={20}/>
                            <div className="flex-1 text-left">
                                <div className="text-sm font-bold">{item.l}</div>
                                <div className="text-[10px] opacity-50">{item.d}</div>
                            </div>
                        </button>
                    </motion.div>
                ))}
            </div>

            <div className="p-4 border-t border-white/5 mt-auto">
                <button onClick={() => { setView('dashboard'); setRunTour(true); if(isMobile) setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors rounded-xl mb-2">
                    <Icons.HelpCircle size={20}/>
                    <span className="text-sm font-bold">Como usar (Tour)</span>
                </button>
                <button 
                    id={`menu-btn-user${isMobile ? '-mobile' : ''}`}
                    onClick={() => { setView('settings'); if(isMobile) setMenuOpen(false); }} 
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-all duration-200 rounded-xl border border-white/10 shadow-sm hover:shadow-md active:scale-95 active:border-white/20"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden ring-2 ring-white/10">
                        <img src={getAvatarUrl(user?.username || 'User')} alt="User" />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm font-bold">{user?.username}</div>
                        <div className="text-[10px] opacity-70">{user?.role}</div>
                        {daysRemaining !== null && (
                            <div className={`text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${daysRemaining === 'Expirado' || daysRemaining === 'Sem Assinatura' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                {daysRemaining === 'Expirado' || daysRemaining === 'Sem Assinatura' ? 'Expirado' : 'Ativo'}
                            </div>
                        )}
                    </div>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div id="sidebar-nav" className={`hidden md:flex w-64 ${theme.card} border-r ${theme.border} flex-col flex-shrink-0 z-20`}>
                {renderMenuContent(false)}
            </div>

            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
                onClick={() => setMenuOpen(false)}
            >
                <div 
                    id="mobile-sidebar" 
                    className={`absolute top-0 bottom-0 left-0 w-64 ${theme.card} border-r ${theme.border} transform transition-transform ${menuOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl`} 
                    onClick={e => e.stopPropagation()}
                >
                    {renderMenuContent(true)}
                </div>
            </div>
        </>
    );
};
