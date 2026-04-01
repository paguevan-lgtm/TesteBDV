
import React, { useState } from 'react';
import { Icons, Button } from '../components/Shared';
import { handlePrint, formatDisplayDate, dateAddDays, getDayName } from '../utils';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';

const SortableRow = ({ id, children, disabled }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            {children}
            {!disabled && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-6 p-1 opacity-0 group-hover:opacity-40 transition-opacity z-20">
                    <Icons.GripVertical size={16}/>
                </div>
            )}
        </div>
    );
};

export default function TabelaMip({ theme, tableTab, setTableTab, mipDayType, setMipDayType, currentOpDate, getTodayDate, analysisDate, setAnalysisDate, analysisRotatedList, editName, tempName, tempVaga, setEditName, setTempName, setTempVaga, saveDriverName, spList, setSpList, notify, dbOp, systemContext, updateMipDriver, handleMipBaixar, handleMipRiscar, triggerUndo, ganchos, effectiveFolgas, getFolgasForDate, user, rotationBaseDate, cannedMessages, addCannedMessage, updateCannedMessage, deleteCannedMessage }: any) {

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleGeralDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = analysisRotatedList.findIndex((i: any) => (i.id || `vaga-${i.vaga}`) === active.id);
            const newIndex = analysisRotatedList.findIndex((i: any) => (i.id || `vaga-${i.vaga}`) === over.id);
            
            const newRotatedList = arrayMove(analysisRotatedList, oldIndex, newIndex);
            
            const originalList = spList.filter((d: any) => !d.isCopy);
            const copiesList = newRotatedList.filter((d: any) => d.isCopy);
            const rotatedOriginals = newRotatedList.filter((d: any) => !d.isCopy);
            
            const start = new Date(`${rotationBaseDate}T00:00:00`).getTime(); 
            const current = new Date(analysisDate + 'T00:00:00').getTime();
            const diff = Math.floor((current - start) / (86400000));
            const len = originalList.length;
            const mod = ((diff % len) + len) % len;
            
            const unrotatedOriginals = [...rotatedOriginals.slice(len - mod), ...rotatedOriginals.slice(0, len - mod)];
            
            const newList = [...unrotatedOriginals, ...copiesList];
            setSpList(newList);
            dbOp('update', 'drivers_table_list', newList);
        }
    };

    const currentEffectiveFolgas = React.useMemo(() => {
        if (getFolgasForDate) {
            return getFolgasForDate(analysisDate);
        }
        return effectiveFolgas;
    }, [getFolgasForDate, analysisDate, effectiveFolgas]);

    const [isLocked, setIsLocked] = useState(() => localStorage.getItem(`isLocked_${systemContext}`) === 'true');

    React.useEffect(() => {
        setIsLocked(localStorage.getItem(`isLocked_${systemContext}`) === 'true');
    }, [systemContext]);

    const toggleLock = () => {
        const newState = !isLocked;
        setIsLocked(newState);
        localStorage.setItem(`isLocked_${systemContext}`, String(newState));
    };

    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const confirmClear = () => {
        const oldList = [...spList];
        triggerUndo(() => {
            setSpList(oldList);
            dbOp('update', 'drivers_table_list', oldList);
        }, "Tabela limpa");

        setSpList([]);
        dbOp('update', 'drivers_table_list', []);
        notify("Tabela limpa com sucesso!", "success");
        setShowClearConfirm(false);
    };

    const onPrint = async (targetId: string, filename: string, title: string, options: any = {}) => {
        try {
            const currentUserName = user?.username || 'Usuário';
            await handlePrint(targetId, filename, title, { ...options, userName: currentUserName });
        } catch (error: any) {
            notify(error.message, 'error');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto w-full min-h-[70vh]">
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className={`${theme.card} border ${theme.border} p-6 rounded-2xl max-w-sm w-full shadow-2xl anim-scale`}>
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icons.Trash className="text-red-500" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-2">Limpar Tabela?</h3>
                        <p className="text-center opacity-60 text-sm mb-6">
                            Isso removerá todos os motoristas da tabela atual ({tableTab === 'mip6' ? '6:00' : '18:00'} - {mipDayType === 'odd' ? 'Dia Ímpar' : 'Dia Par'}). Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-colors">Cancelar</button>
                            <button onClick={confirmClear} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-lg shadow-red-600/20">Limpar Tudo</button>
                        </div>
                    </div>
                </div>
            )}

            <div id="table-tabs" className="flex flex-col p-1 bg-black/20 rounded-xl border border-white/5 gap-1">
                <div className="flex gap-1">
                    <button onClick={()=>setTableTab('mip6')} className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='mip6' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Tabela 6:00</button>
                    <button onClick={()=>setTableTab('mip18')} className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='mip18' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Tabela 18:00</button>
                </div>
                <div className="flex gap-1">
                    <button onClick={()=>setMipDayType('odd')} className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-black rounded-lg transition-all ${mipDayType==='odd' ? 'bg-blue-600 text-white' : 'bg-white/5 opacity-40 hover:opacity-60'}`}>Dia Ímpar</button>
                    <button onClick={()=>setMipDayType('even')} className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider font-black rounded-lg transition-all ${mipDayType==='even' ? 'bg-blue-600 text-white' : 'bg-white/5 opacity-40 hover:opacity-60'}`}>Dia Par</button>
                </div>
                <button onClick={()=>setTableTab('mensagens')} className={`w-full py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='mensagens' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Mensagens</button>
            </div>
            
            {(tableTab === 'mip6' || tableTab === 'mip18') && (
                <div className={`${theme.card} p-5 rounded-xl border ${theme.border} anim-fade`}>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-2">
                            <Button theme={theme} onClick={() => setShowClearConfirm(true)} icon={Icons.Trash} size="sm" variant="danger">Limpar Tabela</Button>
                            <button onClick={toggleLock} className={`p-2 rounded-lg transition-colors border ${isLocked ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`} title={isLocked ? "Desbloquear organização" : "Bloquear organização"}>
                                {isLocked ? <Icons.Lock size={20} /> : <Icons.Unlock size={20} />}
                            </button>
                        </div>
                        <h3 className="text-lg font-bold opacity-80">
                            {tableTab === 'mip6' ? `Tabela 6:00 (${mipDayType === 'odd' ? 'Dia Ímpar' : 'Dia Par'})` : `Tabela 18:00 (${mipDayType === 'odd' ? 'Dia Ímpar' : 'Dia Par'})`}
                        </h3>
                        <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg">
                            <button onClick={() => setAnalysisDate(dateAddDays(analysisDate, -1))} className="p-2 hover:bg-white/10 rounded-md"><Icons.ChevronLeft size={20}/></button>
                            <div className="px-4 font-mono font-bold text-sm">{formatDisplayDate(analysisDate)}</div>
                            <button onClick={() => setAnalysisDate(dateAddDays(analysisDate, 1))} className="p-2 hover:bg-white/10 rounded-md"><Icons.ChevronRight size={20}/></button>
                            <button onClick={() => setAnalysisDate(currentOpDate)} className="ml-2 text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">{currentOpDate === getTodayDate() ? 'Hoje' : 'Amanhã (Op)'}</button>
                            <button onClick={() => onPrint('print-tabela-list', 'Tabela_MIP', tableTab === 'mip6' ? 'TABELA 6:00' : 'TABELA 18:00', { forceCols: 2, date: analysisDate })} className="ml-4 p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors" title="Salvar como Imagem (2 Colunas)"><Icons.Print size={20}/></button>
                        </div>
                    </div>
                    <div id="print-tabela-list" className="space-y-2">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGeralDragEnd} modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}>
                            <SortableContext items={analysisRotatedList.map((i: any) => i.id || `vaga-${i.vaga}`)} strategy={verticalListSortingStrategy}>
                                {analysisRotatedList && analysisRotatedList.length > 0 ? analysisRotatedList.map((driver:any, idx:number) => {
                                    const dayName = getDayName(analysisDate);
                                    const isFolga = currentEffectiveFolgas && currentEffectiveFolgas[dayName] && currentEffectiveFolgas[dayName].includes(driver.vaga);
                                    const hasGancho = ganchos && ganchos[analysisDate] && ganchos[analysisDate][driver.name];
                                    const isBlocked = isFolga || hasGancho;

                                    return (
                                        <SortableRow key={driver?.id || `vaga-${driver?.vaga}-${idx}`} id={driver?.id || `vaga-${driver?.vaga}`} disabled={isLocked}>
                                            <div className={`p-3 rounded-lg border ${theme.border} flex flex-col sm:flex-row sm:items-center justify-between transition-colors gap-3 bg-white/5 hover:bg-white/10 ${isBlocked ? 'opacity-40 grayscale print:opacity-100 print:grayscale-0' : ''}`}>
                                                <div className="flex items-center gap-4">
                                                    {editName === driver.vaga ? (
                                                        <div className="flex items-center gap-2 hide-on-print">
                                                            <input className="w-12 bg-black/50 border border-white/20 rounded px-2 py-1 text-sm font-mono outline-none focus:border-white/50" value={tempVaga} onChange={e=>setTempVaga(e.target.value)} placeholder="Vaga" />
                                                            <input className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm w-32 outline-none focus:border-white/50" value={tempName} onChange={e=>setTempName(e.target.value)} placeholder="Nome" autoFocus />
                                                            <button onClick={()=>saveDriverName(driver.vaga)} className="text-green-400 hover:text-green-300"><Icons.CheckCircle size={18}/></button>
                                                            <button onClick={()=>setEditName(null)} className="text-red-400 hover:text-red-300"><Icons.X size={18}/></button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className={`w-9 h-9 min-w-[36px] rounded relative flex items-center justify-center flex-shrink-0 ${driver.riscado || isBlocked ? 'opacity-30 border-red-500/50 border' : ''} ${isBlocked && !driver.riscado ? 'print:border-white/20 print:opacity-100' : ''}`}>
                                                                <div className="absolute inset-0 rounded bg-white/10 hide-on-print"></div>
                                                                <div className="absolute inset-0 rounded" data-print-border={(isFolga || driver.riscado) ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)"} data-print-bg={(isFolga || driver.riscado) ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.1)"} data-print-transform="translateY(0px)"></div>
                                                                <span className="font-mono text-sm font-bold opacity-70 leading-none pt-[1px] relative z-10" data-print-decoration={(isFolga || driver.riscado) ? "line-through" : "none"} data-print-line-offset="16px" data-print-size="24px" data-print-color={(isFolga || driver.riscado) ? "#ef4444" : "#ffffff"} data-print-weight="900" data-print-transform="translateY(-12px)">{driver.vaga}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span data-print-size="28px" data-print-weight="bold" data-print-color={(isFolga || driver.riscado) ? "#ef4444" : "#ffffff"} data-print-decoration={(isFolga || driver.riscado || driver.baixou) ? "line-through" : "none"} data-print-line-offset="18px" data-print-transform="translateY(-10px)" className={`inline-block font-bold text-lg ${driver.riscado || isBlocked ? 'line-through text-red-500' : ''} ${driver.baixou ? 'text-blue-400' : ''}`}>{driver.name}</span>
                                                                    <div className="flex items-center gap-1" data-print-transform="translateY(-3px)">
                                                                        {isFolga && <span data-print-size="18px" data-print-color="#ef4444" data-print-weight="900" className="text-[10px] uppercase text-red-500 font-black">(FOLGA)</span>}
                                                                        {hasGancho && <span data-print-size="18px" data-print-color="#ef4444" data-print-weight="900" className="text-[10px] uppercase text-red-500 font-black hide-on-print">(GANCHO)</span>}
                                                                        {driver.riscado && <span data-print-size="18px" data-print-color="#ef4444" data-print-weight="900" className="text-[10px] uppercase text-red-500 font-black">(RISCOU)</span>}
                                                                        {driver.baixou && <span data-print-size="18px" data-print-color="#60a5fa" data-print-weight="900" data-print-opacity="1" className="text-[10px] uppercase text-blue-400 font-black print:opacity-100 opacity-60">(Baixou)</span>}
                                                                    </div>
                                                                    <button onClick={()=>{setEditName(driver.vaga); setTempName(driver.name); setTempVaga(driver.vaga)}} className="opacity-20 hover:opacity-100 transition-opacity hide-on-print"><Icons.Edit3 size={14}/></button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!isBlocked && (
                                                        <div className={`flex items-center gap-1 ${driver.riscado ? 'opacity-30 pointer-events-none' : ''}`}>
                                                            {!driver.baixou ? (
                                                                <>
                                                                    <input className="w-14 bg-black/40 border border-white/10 rounded px-1 py-1 text-xs font-mono text-center outline-none focus:border-white/30 hide-on-print" value={driver.time1 || ''} onChange={(e) => updateMipDriver(driver.id, { time1: e.target.value })} placeholder="00:00" />
                                                                    <input className="w-14 bg-black/40 border border-white/10 rounded px-1 py-1 text-xs font-mono text-center outline-none focus:border-white/30 hide-on-print" value={driver.time2 || ''} onChange={(e) => updateMipDriver(driver.id, { time2: e.target.value })} placeholder="00:00" />
                                                                    <input className="w-8 bg-black/40 border border-white/10 rounded px-1 py-1 text-xs font-mono text-center outline-none focus:border-white/30 hide-on-print" value={driver.num || ''} onChange={(e) => updateMipDriver(driver.id, { num: e.target.value })} placeholder="Nº" />
                                                                    <div className="hidden show-on-print flex items-center gap-2" data-print-display="flex">
                                                                        <div className="w-16 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)"><span data-print-transform="translateY(-11px)">{driver.time1 || ''}</span></div>
                                                                        <div className="w-16 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)"><span data-print-transform="translateY(-11px)">{driver.time2 || ''}</span></div>
                                                                        <div className="w-10 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)"><span data-print-transform="translateY(-11px)">{driver.num || ''}</span></div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="flex items-center gap-1 opacity-50 hide-on-print">
                                                                        <div className="w-14 px-1 py-1 text-xs font-mono text-center border border-white/5 rounded bg-white/5">{driver.time1 || '--:--'}</div>
                                                                        <div className="w-14 px-1 py-1 text-xs font-mono text-center border border-white/5 rounded bg-white/5">{driver.time2 || '--:--'}</div>
                                                                        <div className="w-8 px-1 py-1 text-xs font-mono text-center border border-white/5 rounded bg-white/5">{driver.num || '-'}</div>
                                                                    </div>
                                                                    <div className="hidden show-on-print flex items-center gap-2 opacity-50" data-print-display="flex">
                                                                        <div className="w-16 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)"><span data-print-transform="translateY(-11px)">{driver.time1 || ''}</span></div>
                                                                        <div className="w-16 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)"><span data-print-transform="translateY(-11px)">{driver.time2 || ''}</span></div>
                                                                        <div className="w-10 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)"><span data-print-transform="translateY(-11px)">{driver.num || ''}</span></div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!isBlocked && (
                                                        <button onClick={() => handleMipRiscar(driver.id)} className={`p-1.5 rounded-lg border transition-all hide-on-print ${driver.riscado ? 'bg-red-500 text-white border-red-500' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`} title="Riscar"><Icons.Slash size={14}/></button>
                                                    )}
                                                    <button onClick={() => handleMipBaixar(driver.id)} className={`p-1.5 border rounded-lg transition-all hide-on-print ${driver.baixou ? 'bg-orange-500 text-white border-orange-500' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'}`} title={driver.baixou ? "Cancelar Baixar" : "Baixar"}>{driver.baixou ? <Icons.X size={14}/> : <Icons.ArrowDown size={14}/>}</button>
                                                </div>
                                            </div>
                                        </SortableRow>
                                    );
                                }) : <div className="text-center py-4 opacity-50">Nenhum motorista na lista.</div>}
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            )}
            {tableTab === 'mensagens' && (
                <div className={`${theme.card} p-5 rounded-xl border ${theme.border} anim-fade`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold opacity-80 flex items-center gap-2"><Icons.Message size={20}/> Mensagens Rápidas</h3>
                        <Button theme={theme} onClick={addCannedMessage} icon={Icons.Plus} size="sm" variant="success">Nova Mensagem</Button>
                    </div>
                    <div className="space-y-3">
                        {cannedMessages && cannedMessages.length > 0 ? cannedMessages.map((msg: any) => (
                            <div key={msg.id} className="flex flex-col md:flex-row gap-3 p-4 bg-black/20 border border-white/5 rounded-xl">
                                <div className="flex-1 space-y-2">
                                    <input 
                                        type="text" 
                                        value={msg.title} 
                                        onChange={(e) => updateCannedMessage(msg.id, 'title', e.target.value)}
                                        placeholder="Título da Mensagem"
                                        className="w-full bg-transparent border-none font-bold text-white focus:ring-0 p-0"
                                    />
                                    <textarea 
                                        value={msg.text} 
                                        onChange={(e) => updateCannedMessage(msg.id, 'text', e.target.value)}
                                        placeholder="Conteúdo da mensagem..."
                                        className="w-full bg-transparent border-none text-sm text-white/60 focus:ring-0 p-0 resize-none h-20"
                                    />
                                </div>
                                <div className="flex md:flex-col gap-2 justify-end">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(msg.text);
                                            notify("Mensagem copiada!", "success");
                                        }}
                                        className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors"
                                        title="Copiar Mensagem"
                                    >
                                        <Icons.Copy size={18}/>
                                    </button>
                                    <button 
                                        onClick={() => deleteCannedMessage(msg.id)}
                                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                        title="Excluir Mensagem"
                                    >
                                        <Icons.Trash size={18}/>
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 opacity-30">
                                <Icons.Message size={48} className="mx-auto mb-4" />
                                <p>Nenhuma mensagem rápida cadastrada.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
