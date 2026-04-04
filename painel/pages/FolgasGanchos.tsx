import React, { useState, useMemo } from 'react';
import { Icons, PageHeader, Button } from '../components/Shared';
import { DEFAULT_FOLGAS } from '../constants';
import { getWeekNumber } from '../utils';
import { db } from '../firebase';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableVaga({ vaga, isSwapped, theme }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: vaga });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: isDragging ? 'none' : 'auto',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
    } as React.CSSProperties;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onContextMenu={(e) => e.preventDefault()}
            {...attributes}
            {...listeners}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing select-none transition-colors ${
                isSwapped 
                    ? 'bg-rose-500/30 border-2 border-rose-500/50 text-rose-100 shadow-[0_0_10px_rgba(244,63,94,0.2)]' 
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-100'
            } hover:bg-amber-500/20`}
        >
            Vaga {vaga}
        </div>
    );
}

function DroppableDay({ day, children, theme }: any) {
    const { setNodeRef, isOver } = useDroppable({ id: day });
    
    return (
        <div 
            ref={setNodeRef}
            className={`flex flex-wrap gap-2 min-h-[100px] p-2 rounded-xl transition-all duration-200 ${
                isOver ? 'bg-amber-500/30 border-2 border-dashed border-amber-500/60 scale-[1.02]' : 'bg-black/5 border border-dashed border-white/5'
            }`}
        >
            {children}
            {/* Invisible spacer to ensure the area is always clickable/droppable even when empty */}
            <div className="flex-1 min-w-[60px] min-h-[40px]" />
        </div>
    );
}

export default function FolgasGanchos({ data, theme, dbOp, notify, swaps, ganchos, effectiveFolgas, systemContext, user, folgasDisabled, saturdayFolgaDisabled, customDefaultFolgas, saturdayRotation, tableWeekId }: any) {
    const tableSystemContext = (user?.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
    const isPgSystem = tableSystemContext?.toLowerCase() === 'pg';
    const [activeTab, setActiveTab] = useState<'visualizar' | 'trocar' | 'gancho' | 'configuracoes'>(isPgSystem ? 'visualizar' : 'gancho');
    const [vagaA, setVagaA] = useState('');
    const [vagaB, setVagaB] = useState('');
    const [ganchoDate, setGanchoDate] = useState(new Date().toISOString().split('T')[0]);
    const [ganchoDriver, setGanchoDriver] = useState('');
    const [ganchoMotivo, setGanchoMotivo] = useState('');
    
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    
    // Use tableWeekId from props if available, otherwise fallback to current week with 'W'
    const weekId = tableWeekId || `${new Date().getFullYear()}-W${getWeekNumber(new Date())}`;

    const daysToShow = useMemo(() => {
        const base = ['TERÇA', 'QUARTA', 'QUINTA'];
        if (effectiveFolgas['SÁBADO'] && effectiveFolgas['SÁBADO'].length > 0) {
            base.push('SÁBADO');
        }
        return base;
    }, [effectiveFolgas]);

    const swappedPairs = useMemo(() => {
        const pairs: any[] = [];
        const processed = new Set();
        const currentSwaps = swaps || {};
        
        Object.entries(currentSwaps).forEach(([vaga, newDay]) => {
            if (processed.has(vaga)) return;
            
            // Original day of this vaga
            const originalDay = Object.keys(DEFAULT_FOLGAS).find(d => DEFAULT_FOLGAS[d as keyof typeof DEFAULT_FOLGAS].includes(vaga)) || '';
            
            // Find the partner: the vaga that now has originalDay as its folga
            const partnerVaga = Object.keys(currentSwaps).find(v => 
                v !== vaga && 
                !processed.has(v) &&
                currentSwaps[v] === originalDay
            );
            
            if (partnerVaga) {
                const partnerOriginalDay = Object.keys(DEFAULT_FOLGAS).find(d => DEFAULT_FOLGAS[d as keyof typeof DEFAULT_FOLGAS].includes(partnerVaga)) || '';
                pairs.push({ 
                    vagaA: vaga, 
                    vagaB: partnerVaga, 
                    dayA: originalDay, 
                    dayB: partnerOriginalDay 
                });
                processed.add(vaga);
                processed.add(partnerVaga);
            } else {
                pairs.push({ 
                    vagaA: vaga, 
                    dayA: originalDay, 
                    newDay: newDay 
                });
                processed.add(vaga);
            }
        });
        return pairs;
    }, [swaps]);

    const filteredFolgas = useMemo(() => {
        const result: any = {};
        daysToShow.forEach(day => {
            if (effectiveFolgas[day]) {
                result[day] = effectiveFolgas[day];
            }
        });
        return result;
    }, [effectiveFolgas, daysToShow]);

    const allVagas = useMemo(() => {
        const vagas = new Set<string>();
        Object.values(DEFAULT_FOLGAS).forEach(vagasList => vagasList.forEach(v => vagas.add(v)));
        return Array.from(vagas).sort();
    }, []);

    const allDrivers = useMemo(() => {
        if (!data.drivers) return [];
        return Object.values(data.drivers as Record<string, any>)
            .filter(d => d.status === 'Ativo')
            .map(d => d.name)
            .sort();
    }, [data.drivers]);

    const handleTrocar = () => {
        if (!vagaA || !vagaB || vagaA === vagaB) {
            notify("Selecione duas vagas diferentes.", "error");
            return;
        }

        const currentSwaps = swaps || {};
        
        // Find current days
        const getDayForVaga = (vaga: string) => {
            let day = Object.keys(DEFAULT_FOLGAS).find(d => DEFAULT_FOLGAS[d as keyof typeof DEFAULT_FOLGAS].includes(vaga)) || '';
            if (currentSwaps[vaga]) day = currentSwaps[vaga];
            return day;
        };

        const dayA = getDayForVaga(vagaA);
        const dayB = getDayForVaga(vagaB);

        dbOp('update', `folgas_swaps/${weekId}`, { 
            [vagaA]: dayB,
            [vagaB]: dayA
        });
        notify(`Folgas trocadas: Vaga ${vagaA} agora folga ${dayB}, Vaga ${vagaB} agora folga ${dayA}!`, "success");
        setVagaA('');
        setVagaB('');
    };

    const handleCancelSwap = (vagaA: string, vagaB?: string) => {
        const updates: any = {
            [vagaA]: null
        };
        if (vagaB) updates[vagaB] = null;
        
        dbOp('update', `folgas_swaps/${weekId}`, updates);
        notify("Troca cancelada com sucesso.", "info");
    };

    const handleAddGancho = () => {
        if (!ganchoDate || !ganchoDriver || !ganchoMotivo) {
            notify("Preencha a data, o motorista e o motivo do gancho.", "error");
            return;
        }
        db.ref(`ganchos/${ganchoDate}/${ganchoDriver}`).set({
            driver: ganchoDriver,
            motivo: ganchoMotivo,
            createdBy: user?.username || user?.name || 'Sistema',
            timestamp: Date.now()
        });
        notify(`Gancho aplicado para ${ganchoDriver} no dia ${ganchoDate}`, "success");
        setGanchoDriver('');
        setGanchoMotivo('');
    };

    const handleRemoveGancho = (date: string, driver: string) => {
        db.ref(`ganchos/${date}/${driver}`).remove();
        notify("Gancho removido.", "info");
    };

    const handleToggleFolgas = () => {
        const settingsPath = isPgSystem ? 'system_settings' : `${tableSystemContext}/system_settings`;
        db.ref(`${settingsPath}/folgas_disabled`).set(!folgasDisabled);
        notify(folgasDisabled ? "Folgas reativadas!" : "Todas as folgas foram desativadas.", "info");
    };

    const invisibleSwappedVagas = useMemo(() => {
        return Object.entries(swaps || {}).filter(([vaga, day]) => {
            return day && !daysToShow.includes(day as string);
        });
    }, [swaps, daysToShow]);

    const unassignedVagas = useMemo(() => {
        const assigned = new Set<string>();
        Object.values(effectiveFolgas).forEach((vagas: any) => {
            if (Array.isArray(vagas)) {
                vagas.forEach(v => assigned.add(v));
            }
        });
        return allVagas.filter(v => !assigned.has(v));
    }, [effectiveFolgas, allVagas]);

    const misplacedSpecificVagas = useMemo(() => {
        const misplaced: string[] = [];
        const targets = { '12': 'QUARTA', '15': 'QUARTA', '14': 'QUINTA' };
        
        Object.entries(targets).forEach(([vaga, defaultDay]) => {
            const currentDay = Object.keys(effectiveFolgas).find(day => 
                Array.isArray(effectiveFolgas[day]) && effectiveFolgas[day].includes(vaga)
            );
            if (currentDay && currentDay !== defaultDay) {
                misplaced.push(vaga);
            }
        });
        return misplaced;
    }, [effectiveFolgas]);

    const handleToggleSaturdayFolga = () => {
        const settingsPath = isPgSystem ? 'system_settings' : `${tableSystemContext}/system_settings`;
        db.ref(`${settingsPath}/saturday_folga_disabled`).set(!saturdayFolgaDisabled);
        notify(saturdayFolgaDisabled ? "Folga de sábado reativada!" : "Folga de sábado desativada.", "info");
    };

    const handleResetAll = () => {
        const swapsPath = isPgSystem ? `folgas_swaps/${weekId}` : `${tableSystemContext}/folgas_swaps/${weekId}`;
        const settingsPath = isPgSystem ? 'system_settings' : `${tableSystemContext}/system_settings`;
        
        db.ref(swapsPath).remove();
        db.ref(`${settingsPath}/custom_default_folgas`).remove();
        notify("Sistema resetado para o padrão original.", "success");
        setShowResetConfirm(false);
    };

    const handleForceReset = () => {
        const swapsPath = isPgSystem ? `folgas_swaps/${weekId}` : `${tableSystemContext}/folgas_swaps/${weekId}`;
        const settingsPath = isPgSystem ? 'system_settings' : `${tableSystemContext}/system_settings`;
        
        db.ref(swapsPath).remove();
        db.ref(`${settingsPath}/custom_default_folgas`).remove();
        notify("Correção aplicada: Vagas restauradas para o padrão.", "success");
    };

    const handleUpdateDefaultFolgas = (day: string, vagasStr: string) => {
        const vagas = vagasStr.split(',').map(v => v.trim()).filter(v => v !== '');
        const newDefaults = { ...(customDefaultFolgas || DEFAULT_FOLGAS), [day]: vagas };
        const settingsPath = isPgSystem ? 'system_settings' : `${tableSystemContext}/system_settings`;
        db.ref(`${settingsPath}/custom_default_folgas`).set(newDefaults);
        notify(`Folgas padrão de ${day} atualizadas!`, "success");
    };

    const SATURDAY_CYCLE = ['QUINTA', 'TERÇA', 'QUARTA'];

    const getNextSaturday = () => {
        const d = new Date();
        const day = d.getDay();
        // If today is Saturday (6), we want the next Saturday, so add 7 days.
        // Otherwise, add the difference to reach Saturday.
        const diff = day === 6 ? 7 : (6 - day + 7) % 7;
        const nextSat = new Date(d);
        nextSat.setDate(d.getDate() + diff);
        
        // Format as YYYY-MM-DD using local time
        const year = nextSat.getFullYear();
        const month = String(nextSat.getMonth() + 1).padStart(2, '0');
        const date = String(nextSat.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    };

    const nextSaturdayDate = getNextSaturday();

    const getSaturdayWeekday = (targetDateStr: string) => {
        if (!saturdayRotation) return null;
        const { baseDate, baseWeekday } = saturdayRotation;
        const base = new Date(baseDate + 'T12:00:00');
        const target = new Date(targetDateStr + 'T12:00:00');
        
        const cycleStartIdx = SATURDAY_CYCLE.indexOf(baseWeekday);
        if (cycleStartIdx === -1) return null;

        const diffTime = target.getTime() - base.getTime();
        const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
        
        const idx = (cycleStartIdx + diffWeeks) % SATURDAY_CYCLE.length;
        const normalizedIdx = idx < 0 ? (idx + SATURDAY_CYCLE.length) % SATURDAY_CYCLE.length : idx;
        
        return SATURDAY_CYCLE[normalizedIdx];
    };

    const currentSaturdayOffDay = getSaturdayWeekday(nextSaturdayDate);

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

    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const vagaId = String(active.id);
        const overId = String(over.id);

        // Find which day the overId belongs to
        let targetDay = '';
        // Saturday is NOT a valid drop target for changing folgas
        if (daysToShow.includes(overId) && overId !== 'SÁBADO') {
            targetDay = overId;
        } else {
            // overId is a vaga, find its day in effectiveFolgas (ignoring Saturday to avoid conflicts)
            Object.entries(effectiveFolgas).forEach(([day, vagas]: [string, any]) => {
                if (day !== 'SÁBADO' && vagas && vagas.includes(overId)) {
                    targetDay = day;
                }
            });
        }

        if (!targetDay) return;

        // Find original day of this vaga
        const originalDay = Object.keys(DEFAULT_FOLGAS).find(d => {
            const dayVagas = DEFAULT_FOLGAS[d as keyof typeof DEFAULT_FOLGAS];
            return Array.isArray(dayVagas) && dayVagas.includes(vagaId);
        }) || '';
        
        // If targetDay is the same as current effective day, do nothing
        let currentDay = originalDay;
        if (swaps && swaps[vagaId]) currentDay = swaps[vagaId];
        
        if (targetDay === currentDay) return;

        // Update DB
        // If moving back to original day, remove the swap entry
        const updateValue = targetDay === originalDay ? null : targetDay;
        
        dbOp('update', `folgas_swaps/${weekId}`, { 
            [vagaId]: updateValue
        });
        
        notify(`Folga da Vaga ${vagaId} alterada para ${targetDay}!`, "success");
    };

    const handleUpdateSaturdayRotation = (newWeekday: string) => {
        db.ref('system_settings/saturday_rotation').set({
            baseDate: nextSaturdayDate,
            baseWeekday: newWeekday
        });
        notify(`Rodízio de sábado atualizado para ${newWeekday}!`, "success");
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Folgas e Ganchos" subtitle={isPgSystem ? "Gerenciamento de folgas e ganchos" : "Gerenciamento de ganchos"} />
            
            <div className="overflow-x-auto pb-2">
                <div className="flex gap-2 p-1 bg-black/10 rounded-xl w-fit min-w-max">
                    {isPgSystem && (
                        <>
                            <button 
                                onClick={() => setActiveTab('visualizar')}
                                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${activeTab === 'visualizar' ? 'bg-amber-500 text-white' : 'hover:bg-black/10'}`}
                            >
                                Visualizar
                            </button>
                            <button 
                                onClick={() => setActiveTab('trocar')}
                                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${activeTab === 'trocar' ? 'bg-amber-500 text-white' : 'hover:bg-black/10'}`}
                            >
                                Trocar Folgas
                            </button>
                        </>
                    )}
                    <button 
                        onClick={() => setActiveTab('gancho')}
                        className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${activeTab === 'gancho' ? 'bg-amber-500 text-white' : 'hover:bg-black/10'}`}
                    >
                        Gancho
                    </button>
                    {isPgSystem && (
                        <button 
                            onClick={() => setActiveTab('configuracoes')}
                            className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${activeTab === 'configuracoes' ? 'bg-amber-500 text-white' : 'hover:bg-black/10'}`}
                        >
                            Configurações
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'visualizar' && (
                <div className="space-y-6">
                    {misplacedSpecificVagas.length > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-rose-200">
                                <Icons.AlertTriangle size={20} className="shrink-0" />
                                <p className="text-sm">
                                    As vagas <strong>{misplacedSpecificVagas.join(', ')}</strong> estão fora dos dias padrão.
                                </p>
                            </div>
                            <Button 
                                onClick={handleForceReset} 
                                className="bg-rose-600 hover:bg-rose-700 text-xs py-1.5"
                            >
                                Corrigir Vagas
                            </Button>
                        </div>
                    )}

                    {invisibleSwappedVagas.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-red-200">
                                <Icons.AlertTriangle size={20} className="shrink-0" />
                                <p className="text-sm">
                                    Existem <strong>{invisibleSwappedVagas.length}</strong> vagas movidas para dias que não estão sendo exibidos (Segunda, Sexta ou Domingo).
                                </p>
                            </div>
                            <Button 
                                onClick={handleForceReset} 
                                className="bg-red-600 hover:bg-red-700 text-xs py-1.5"
                            >
                                Resetar Tudo
                            </Button>
                        </div>
                    )}

                    {unassignedVagas.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-amber-200">
                                <Icons.AlertTriangle size={20} className="shrink-0" />
                                <p className="text-sm">
                                    As seguintes vagas estão <strong>sem folga atribuída</strong>: {unassignedVagas.join(', ')}.
                                </p>
                            </div>
                            <Button 
                                onClick={handleForceReset} 
                                className="bg-amber-600 hover:bg-amber-700 text-xs py-1.5"
                            >
                                Corrigir Agora
                            </Button>
                        </div>
                    )}

                    {isPgSystem && (
                        <div className={`${theme.card} p-4 sm:p-6 rounded-2xl border ${theme.border} bg-blue-500/5 border-blue-500/20 overflow-hidden`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                                        <Icons.Calendar size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Rodízio de Sábado</h3>
                                        <p className="text-sm opacity-70">
                                            {saturdayFolgaDisabled ? (
                                                <span className="text-red-400 font-bold">Folga de Sábado Desativada</span>
                                            ) : (
                                                <>Próximo sábado ({nextSaturdayDate.split('-').reverse().join('/')}): vagas de <span className="font-bold text-blue-400">{currentSaturdayOffDay || '---'}</span> folgam.</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                                    {!saturdayFolgaDisabled && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs opacity-50 font-bold uppercase">Mudar para:</span>
                                            <div className="flex flex-wrap gap-1">
                                                {SATURDAY_CYCLE.map(day => (
                                                    <button
                                                        key={day}
                                                        onClick={() => handleUpdateSaturdayRotation(day)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentSaturdayOffDay === day ? 'bg-blue-500 text-white' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                                        <span className={`text-xs font-bold uppercase ${saturdayFolgaDisabled ? 'text-red-500' : 'text-green-500'}`}>
                                            {saturdayFolgaDisabled ? 'Desativado' : 'Ativado'}
                                        </span>
                                        <button 
                                            onClick={handleToggleSaturdayFolga}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${saturdayFolgaDisabled ? 'bg-gray-600' : 'bg-blue-600'}`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${saturdayFolgaDisabled ? 'translate-x-1' : 'translate-x-6'}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={`${theme.card} p-4 sm:p-6 rounded-2xl border ${theme.border} flex items-center justify-between bg-amber-500/5 overflow-hidden`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${folgasDisabled ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                                {folgasDisabled ? <Icons.Slash size={24} /> : <Icons.CheckCircle size={24} />}
                            </div>
                            <div>
                                <h3 className="font-bold">Status das Folgas</h3>
                                <p className="text-xs opacity-60">
                                    {folgasDisabled ? "As folgas estão desativadas globalmente." : "As folgas estão funcionando normalmente."}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleToggleFolgas}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${folgasDisabled ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        >
                            {folgasDisabled ? "Ativar Folgas" : "Desativar Todas"}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            {Object.entries(filteredFolgas).map(([day, vagas]: [string, any]) => (
                                <div key={day} className={`${theme.card} p-6 rounded-2xl border ${theme.border} flex flex-col`}>
                                    <h3 className="font-bold text-lg mb-4 text-amber-500">{day}</h3>
                                    
                                    {day === 'SÁBADO' ? (
                                        <div className="flex flex-wrap gap-2 min-h-[100px] p-2 rounded-xl bg-blue-500/5 border border-dashed border-blue-500/20">
                                            {vagas.map((vaga: string) => (
                                                <div 
                                                    key={`sat-${vaga}`} 
                                                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 border border-blue-500/30 text-blue-100 cursor-default"
                                                >
                                                    Vaga {vaga}
                                                </div>
                                            ))}
                                            {vagas.length === 0 && (
                                                <span className="text-xs opacity-40 italic p-2">Nenhuma folga</span>
                                            )}
                                            <div className="flex-1 min-w-[60px] min-h-[40px]" />
                                        </div>
                                    ) : (
                                        <SortableContext
                                            id={day}
                                            items={vagas}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <DroppableDay day={day} theme={theme}>
                                                {vagas.map((vaga: string) => {
                                                    const isSwapped = !!(swaps && swaps[vaga]);
                                                    return (
                                                        <SortableVaga 
                                                            key={vaga} 
                                                            vaga={vaga} 
                                                            isSwapped={isSwapped} 
                                                            theme={theme} 
                                                        />
                                                    );
                                                })}
                                            </DroppableDay>
                                        </SortableContext>
                                    )}
                                </div>
                            ))}
                            <DragOverlay>
                                {activeId ? (
                                    <div className={`px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-white shadow-xl border border-amber-400`}>
                                        Vaga {activeId}
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </div>
            )}

            {activeTab === 'trocar' && (
                <div className="space-y-6">
                    <div className="flex justify-center">
                        <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} space-y-6 w-full max-w-lg`}>
                            <h3 className="font-bold text-xl">Trocar Folgas entre Vagas</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Vaga A</label>
                                    <select className="w-full p-3 rounded-xl bg-gray-800 text-white border border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" value={vagaA} onChange={(e) => setVagaA(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {allVagas.map(v => <option key={v} value={v}>Vaga {v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Vaga B</label>
                                    <select className="w-full p-3 rounded-xl bg-gray-800 text-white border border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" value={vagaB} onChange={(e) => setVagaB(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {allVagas.map(v => <option key={v} value={v}>Vaga {v}</option>)}
                                    </select>
                                </div>
                                <Button onClick={handleTrocar} className="w-full bg-amber-500 hover:bg-amber-600">
                                    Confirmar Troca
                                </Button>
                            </div>
                        </div>
                    </div>

                    {swappedPairs.length > 0 && (
                        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
                            <h3 className="font-bold text-lg mb-4 text-amber-500">Trocas Ativas nesta semana</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {swappedPairs.map((pair: any, idx: number) => (
                                    <div key={idx} className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs opacity-50 uppercase font-bold">{pair.dayA}</span>
                                                <span className="font-bold text-red-100">Vaga {pair.vagaA}</span>
                                            </div>
                                            <Icons.ArrowRightLeft size={16} className="text-amber-500" />
                                            {pair.vagaB ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs opacity-50 uppercase font-bold">{pair.dayB}</span>
                                                    <span className="font-bold text-red-100">Vaga {pair.vagaB}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-xs opacity-50 uppercase font-bold">NOVA FOLGA</span>
                                                    <span className="font-bold text-red-100">{pair.newDay}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => handleCancelSwap(pair.vagaA, pair.vagaB)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Cancelar Troca"
                                        >
                                            <Icons.X size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'gancho' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} space-y-6`}>
                        <h3 className="font-bold text-xl flex items-center gap-2">
                            <Icons.Calendar size={24} className="text-amber-500" />
                            Aplicar Gancho
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Data do Gancho</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 rounded-xl bg-gray-800 text-white border border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    value={ganchoDate}
                                    onChange={(e) => setGanchoDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Motorista</label>
                                <select 
                                    className="w-full p-3 rounded-xl bg-gray-800 text-white border border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                                    value={ganchoDriver} 
                                    onChange={(e) => setGanchoDriver(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {allDrivers.map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Motivo (Obrigatório)</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: Atraso, Falta, etc."
                                    className="w-full p-3 rounded-xl bg-gray-800 text-white border border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                    value={ganchoMotivo}
                                    onChange={(e) => setGanchoMotivo(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAddGancho} className="w-full bg-red-600 hover:bg-red-700">
                                Aplicar Gancho
                            </Button>
                        </div>
                    </div>

                    <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} space-y-6`}>
                        <h3 className="font-bold text-xl">Ganchos Ativos</h3>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {Object.entries(ganchos || {}).length === 0 ? (
                                <p className="text-sm opacity-50 italic">Nenhum gancho ativo.</p>
                            ) : (
                                Object.entries(ganchos).map(([date, vagas]: [string, any]) => (
                                    <div key={date} className="space-y-2">
                                        <h4 className="text-sm font-bold text-amber-500 border-b border-white/10 pb-1">{date}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(vagas || {}).map(([driver, info]: [string, any]) => (
                                                <div key={driver} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg text-xs">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">{driver}</span>
                                                            {info.createdBy && (
                                                                <span className="text-[10px] opacity-40">por {info.createdBy === 'Breno' ? 'Sistema' : info.createdBy}</span>
                                                            )}
                                                        </div>
                                                        <span className="opacity-60 italic">{info.motivo}</span>
                                                    </div>
                                                    <button onClick={() => handleRemoveGancho(date, driver)} className="text-red-400 hover:text-red-300 ml-2">
                                                        <Icons.X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'configuracoes' && (
                <div className="space-y-6">
                    <div className={`${theme.card} p-4 sm:p-6 md:p-8 rounded-2xl border ${theme.border} space-y-6 overflow-hidden`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-xl flex items-center gap-2">
                                    <Icons.Settings size={24} className="text-amber-500" />
                                    Configurações de Folgas
                                </h3>
                                <p className="text-sm opacity-60 mt-1">
                                    Gerencie as folgas padrão e as trocas da semana.
                                </p>
                            </div>
                            <Button 
                                onClick={() => setShowResetConfirm(true)} 
                                className="bg-red-600 hover:bg-red-700 flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
                                <Icons.Refresh size={18} />
                                Resetar Sistema
                            </Button>
                        </div>

                        {showResetConfirm && (
                            <div className="bg-red-500/20 border border-red-500/30 p-4 rounded-xl space-y-4">
                                <p className="text-sm font-bold text-red-200">
                                    Tem certeza que deseja resetar TUDO? Esta ação é irreversível.
                                </p>
                                <div className="flex gap-3">
                                    <Button onClick={handleResetAll} className="bg-red-600 hover:bg-red-700 text-xs">Sim, Resetar</Button>
                                    <Button onClick={() => setShowResetConfirm(false)} className="bg-gray-600 hover:bg-gray-700 text-xs">Cancelar</Button>
                                </div>
                            </div>
                        )}

                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                            <p className="text-sm text-amber-200 flex items-start gap-2">
                                <Icons.AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                <span>
                                    <strong>Resetar Sistema:</strong> Esta ação remove todas as trocas feitas manualmente nesta semana E restaura a lista de folgas padrão para o original do sistema (removendo suas customizações).
                                </span>
                            </p>
                        </div>

                        <div className="space-y-6 pt-4">
                            <h4 className="font-bold text-lg border-b border-white/10 pb-2">Alterar Lista Padrão</h4>
                            <p className="text-sm opacity-70">
                                Defina as vagas que folgam em cada dia por padrão. Mudanças aqui afetarão todas as semanas futuras.
                                Use vírgulas para separar as vagas (ex: 1, 2, 3).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {['TERÇA', 'QUARTA', 'QUINTA'].map(day => (
                                    <div key={day} className="space-y-2">
                                        <label className="block text-sm font-bold text-amber-500">{day}</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                defaultValue={(customDefaultFolgas || DEFAULT_FOLGAS)[day]?.join(', ')}
                                                placeholder="Ex: 1, 2, 3"
                                                className="flex-1 p-3 rounded-xl bg-gray-800 text-white border border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                                onBlur={(e) => handleUpdateDefaultFolgas(day, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
