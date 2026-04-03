
import React from 'react';
import { Icons } from './Shared';
import { getAvatarUrl } from '../utils';
import { motion } from 'motion/react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

const SortableMenuItem = ({ item, isMobile, view, setView, setMenuOpen, theme }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.3 : 1,
        touchAction: isDragging ? 'none' : 'auto',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
    } as React.CSSProperties;

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            className="relative rounded-xl mb-1 group cursor-grab active:cursor-grabbing select-none"
            onContextMenu={(e) => e.preventDefault()}
            {...attributes}
            {...listeners}
        >
            <button 
                id={`menu-btn-${item.id}${isMobile ? '-mobile' : ''}`} 
                onClick={(e) => {
                    e.stopPropagation();
                    setView(item.id);
                    if(isMobile) setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative z-10 ${view === item.id ? `${theme.primary} shadow-lg` : 'hover:bg-white/5 opacity-70 hover:opacity-100'}`}
            >
                <item.i size={20}/>
                <div className="flex-1 text-left">
                    <div className="text-sm font-bold">{item.l}</div>
                    <div className="text-[10px] opacity-50">{item.d}</div>
                </div>
                <div className="p-1 opacity-0 group-hover:opacity-40 transition-opacity">
                    <Icons.GripVertical size={14}/>
                </div>
            </button>
        </div>
    );
};

export const Sidebar = ({ 
    theme, 
    view, 
    setView, 
    menuOpen, 
    setMenuOpen, 
    user, 
    orderedMenuItems, 
    setOrderedMenuItems,
    daysRemaining,
    renewalDate,
    setRunTour,
    systemContext
}: any) => {

    const [activeId, setActiveId] = React.useState<string | null>(null);
    
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 20,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);
        if (active.id !== over?.id) {
            const oldIndex = orderedMenuItems.findIndex((i: any) => i.id === active.id);
            const newIndex = orderedMenuItems.findIndex((i: any) => i.id === over.id);
            const newList = arrayMove(orderedMenuItems, oldIndex, newIndex);
            setOrderedMenuItems(newList);
            // Persist order
            localStorage.setItem(`menu_order_${user?.username}`, JSON.stringify(newList.map((i: any) => i.id)));
        }
    };

    const renderMenuContent = (isMobile: boolean) => (
        <div onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') e.stopPropagation(); }} className="flex flex-col h-full">
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

            <div id="sidebar-scroll-container" className="flex-1 overflow-y-auto px-4 py-2 pb-4 space-y-1">
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                >
                    <SortableContext 
                        items={orderedMenuItems.map((i: any) => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {orderedMenuItems.map((item: any) => (
                            <SortableMenuItem 
                                key={item.id}
                                item={item}
                                isMobile={isMobile}
                                view={view}
                                setView={setView}
                                setMenuOpen={setMenuOpen}
                                theme={theme}
                            />
                        ))}
                    </SortableContext>
                    <DragOverlay>
                        {activeId ? (
                            <div className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${theme.primary} shadow-2xl opacity-80 scale-105 pointer-events-none`}>
                                {(() => {
                                    const item = orderedMenuItems.find((i: any) => i.id === activeId);
                                    if (!item) return null;
                                    return (
                                        <>
                                            <item.i size={20}/>
                                            <div className="flex-1 text-left">
                                                <div className="text-sm font-bold">{item.l}</div>
                                                <div className="text-[10px] opacity-50">{item.d}</div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
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
                        <div className="text-[10px] opacity-70">{user?.role === 'admin' ? 'Coordenação' : user?.role}</div>
                        {daysRemaining !== null && (
                            <div className={`text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full inline-block ${daysRemaining === 'Expirado' || daysRemaining === 'Sem Assinatura' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                {daysRemaining === 'Expirado' || daysRemaining === 'Sem Assinatura' ? 'Expirado' : 'Ativo'}
                            </div>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <div id="sidebar-nav" className={`hidden md:flex w-64 h-full ${theme.card} border-r ${theme.border} flex-col flex-shrink-0 z-20`}>
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
