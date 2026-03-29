import React, { useState, useMemo } from 'react';
import { Icons, PageHeader, Button } from '../components/Shared';
import { DEFAULT_FOLGAS } from '../constants';
import { getWeekNumber } from '../utils';
import { db } from '../firebase';

export default function FolgasGanchos({ data, theme, dbOp, notify, swaps, ganchos, effectiveFolgas, systemContext, user, folgasDisabled, saturdayRotation }: any) {
    const isPgSystem = systemContext?.toLowerCase() === 'pg';
    const [activeTab, setActiveTab] = useState<'visualizar' | 'trocar' | 'gancho'>(isPgSystem ? 'visualizar' : 'gancho');
    const [vagaA, setVagaA] = useState('');
    const [vagaB, setVagaB] = useState('');
    const [ganchoDate, setGanchoDate] = useState(new Date().toISOString().split('T')[0]);
    const [ganchoDriver, setGanchoDriver] = useState('');
    const [ganchoMotivo, setGanchoMotivo] = useState('');
    const weekId = `${new Date().getFullYear()}-${getWeekNumber(new Date())}`;

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
        db.ref('system_settings/folgas_disabled').set(!folgasDisabled);
        notify(folgasDisabled ? "Folgas reativadas!" : "Todas as folgas foram desativadas.", "info");
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
            
            <div className="flex gap-2 p-1 bg-black/10 rounded-xl w-fit">
                {isPgSystem && (
                    <>
                        <button 
                            onClick={() => setActiveTab('visualizar')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'visualizar' ? 'bg-amber-500 text-white' : 'hover:bg-black/10'}`}
                        >
                            Visualizar
                        </button>
                        <button 
                            onClick={() => setActiveTab('trocar')}
                            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'trocar' ? 'bg-amber-500 text-white' : 'hover:bg-black/10'}`}
                        >
                            Trocar Folgas
                        </button>
                    </>
                )}
                <button 
                    onClick={() => setActiveTab('gancho')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'gancho' ? 'bg-amber-500 text-white' : 'hover:bg-black/10'}`}
                >
                    Gancho
                </button>
            </div>

            {activeTab === 'visualizar' && (
                <div className="space-y-6">
                    {isPgSystem && (
                        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} bg-blue-500/5 border-blue-500/20`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
                                        <Icons.Calendar size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Rodízio de Sábado</h3>
                                        <p className="text-sm opacity-70">
                                            Próximo sábado ({nextSaturdayDate.split('-').reverse().join('/')}): vagas de <span className="font-bold text-blue-400">{currentSaturdayOffDay || '---'}</span> folgam.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs opacity-50 font-bold uppercase">Mudar para:</span>
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
                        </div>
                    )}

                    <div className={`${theme.card} p-4 rounded-2xl border ${theme.border} flex items-center justify-between bg-amber-500/5`}>
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
                        {Object.entries(filteredFolgas).map(([day, vagas]) => (
                            <div key={day} className={`${theme.card} p-6 rounded-2xl border ${theme.border}`}>
                                <h3 className="font-bold text-lg mb-4 text-amber-500">{day}</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(vagas as string[]).map((vaga: string) => {
                                        const isSwapped = Object.keys(swaps || {}).includes(vaga);
                                        return (
                                            <div key={vaga} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isSwapped ? 'bg-red-500/20 border border-red-500/30 text-red-100' : 'bg-amber-500/10 border border-amber-500/20 text-amber-100'}`}>
                                                Vaga {vaga}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'trocar' && (
                <div className="space-y-6">
                    <div className={`${theme.card} p-8 rounded-2xl border ${theme.border} space-y-6 max-w-lg`}>
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
                                                            {info.createdBy && info.createdBy !== 'Breno' && (
                                                                <span className="text-[10px] opacity-40">por {info.createdBy}</span>
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
        </div>
    );
}
