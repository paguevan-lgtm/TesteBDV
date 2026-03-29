
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Icons, Button, IconButton } from '../components/Shared';
import { handlePrint, formatDisplayDate, dateAddDays, getDayName } from '../utils';

// Timer Component local to Tabela
const TempTripTimer = ({ date, time }: any) => {
    const [timeLeft, setTimeLeft] = useState('');
    
    useEffect(() => {
        const tick = () => {
            if (!date || !time) return;
            const [y, mo, d] = date.split('-').map(Number);
            // Sanitiza horário para lidar com "05:00/05:45"
            const cleanTime = time.split('/')[0].trim();
            const [h, mi] = cleanTime.split(':').map(Number);
            
            if (isNaN(h) || isNaN(mi)) return;

            // O horário recebido (time) já é Slot + 60 min (Exibido no Card).
            // A viagem expira em Slot + 45 min.
            // Portanto, Expiration = TripTime - 15 min.
            const tripStart = new Date(y, mo - 1, d, h, mi, 0);
            const expiration = new Date(tripStart.getTime() - 15 * 60000); 
            
            const now = new Date();
            const diff = expiration.getTime() - now.getTime();
            
            if (diff <= 0) {
                setTimeLeft('Expirando...');
            } else {
                const m = Math.floor(diff / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${m}m ${s}s`);
            }
        };
        tick(); 
        const int = setInterval(tick, 1000); 
        return () => clearInterval(int);
    }, [date, time]);

    return <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">{timeLeft}</span>;
};

export default function Tabela({ data, theme, tableTab, setTableTab, currentOpDate, getTodayDate, analysisDate, setAnalysisDate, analysisRotatedList, tableStatus, editName, tempName, tempVaga, setEditName, setTempName, setTempVaga, saveDriverName, updateTableStatus, currentRotatedList, confirmedTimes, isTimeExpired, lousaOrder, toggleLousaFromConfirmados, cancelConfirmation, handleLousaAction, startLousaTime, addMadrugadaVaga, madrugadaList, removeMadrugadaVaga, toggleMadrugadaRiscado, spList, setSpList, madrugadaData, openMadrugadaTrip, cannedMessages, addCannedMessage, updateCannedMessage, deleteCannedMessage, addNullLousaItem, addNullMadrugadaItem, notify, getRotatedList, getRotatedMadrugadaList, dbOp, systemContext, updateMipDriver, handleMipBaixar, handleMipRiscar, triggerUndo, ganchos, effectiveFolgas, getFolgasForDate, user }: any) {

    const currentEffectiveFolgas = React.useMemo(() => {
        if (getFolgasForDate) {
            return getFolgasForDate(analysisDate);
        }
        return effectiveFolgas;
    }, [getFolgasForDate, analysisDate, effectiveFolgas]);

    // Estado de bloqueio persistente por sistema
    const [isLocked, setIsLocked] = useState(() => localStorage.getItem(`isLocked_${systemContext}`) === 'true');

    // Atualiza o estado quando o contexto muda
    React.useEffect(() => {
        setIsLocked(localStorage.getItem(`isLocked_${systemContext}`) === 'true');
    }, [systemContext]);

    // Salva no localStorage sempre que mudar
    const toggleLock = () => {
        const newState = !isLocked;
        setIsLocked(newState);
        localStorage.setItem(`isLocked_${systemContext}`, String(newState));
    };
    let lousaEffectiveIndex = 0;

    // Lógica para determinar qual data de Madrugada mostrar INICIALMENTE
    const isLateDay = new Date().getHours() >= 14;
    const initialMadrugadaDate = (currentOpDate === getTodayDate() && isLateDay) 
        ? dateAddDays(currentOpDate, 1) 
        : currentOpDate;

    // Estado local para navegação da data da madrugada
    const [madrugadaDisplayDate, setMadrugadaDisplayDate] = useState(initialMadrugadaDate);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Usa a nova função getRotatedMadrugadaList para calcular a rotação exclusiva da madrugada
    // Se não existir (por algum motivo legado), cai no fallback antigo
    const madrugadaOrderedList = getRotatedMadrugadaList 
        ? getRotatedMadrugadaList(madrugadaDisplayDate) 
        : (getRotatedList ? getRotatedList(madrugadaDisplayDate).filter((d:any) => madrugadaList.includes(d.vaga)) : []);

    // Função auxiliar para filtrar confirmados com segurança
    const getConfirmados = () => {
        if (!currentRotatedList || !tableStatus) return [];
        return currentRotatedList.filter((d:any) => tableStatus[d.vaga] === 'confirmed');
    };

    const confirmadosList = getConfirmados();

    const clearTable = () => {
        setShowClearConfirm(true);
    };

    const confirmClear = () => {
        const oldList = [...spList];
        const oldStatus = { ...tableStatus };
        
        triggerUndo(() => {
            setSpList(oldList);
            dbOp('update', 'drivers_table_list', oldList);
            dbOp('update', 'table_status', oldStatus);
        }, "Tabela limpa");

        setSpList([]);
        dbOp('update', 'drivers_table_list', []);
        dbOp('update', 'table_status', {});
        notify("Tabela limpa com sucesso!", "success");
        setShowClearConfirm(false);
    };

    const addVaga = () => {
        const newVagaNumber = spList.length > 0 ? Math.max(...spList.map((d: any) => parseInt(d.vaga) || 0)) + 1 : 1;
        const newVaga = {
            vaga: newVagaNumber.toString(),
            name: 'Novo Motorista',
            id: uuidv4()
        };
        const newList = [...spList, newVaga];
        setSpList(newList);
        dbOp('update', 'drivers_table_list', newList);
    };

    const removeVaga = (id: string) => {
        const oldList = [...spList];
        const driver = spList.find((d: any) => d.id === id);
        
        triggerUndo(() => {
            setSpList(oldList);
            dbOp('update', 'drivers_table_list', oldList);
        }, `Vaga ${driver?.vaga || ''} (${driver?.name || ''}) removida`);

        const newList = spList.filter((d: any) => d.id !== id);
        setSpList(newList);
        dbOp('update', 'drivers_table_list', newList);
    };


    const onPrint = async (targetId: string, filename: string, title: string, options: any = {}) => {
        try {
            // Use user.username if available, otherwise fallback to 'Usuário'
            const currentUserName = user?.username || 'Usuário';
            await handlePrint(targetId, filename, title, { ...options, userName: currentUserName });
        } catch (error: any) {
            notify(error.message, 'error');
        }
    };

    return (
        <div 
            className="space-y-6 max-w-4xl mx-auto w-full min-h-[70vh]"
        >
            {/* Modal de Confirmação para Limpar Tabela */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className={`${theme.card} border ${theme.border} p-6 rounded-2xl max-w-sm w-full shadow-2xl anim-scale`}>
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Icons.Trash className="text-red-500" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-2">Limpar Tabela?</h3>
                        <p className="text-center opacity-60 text-sm mb-6">
                            Isso removerá todos os motoristas da tabela atual ({tableTab === 'mip6' ? '6:00' : '18:00'}). Esta ação não pode ser desfeita.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmClear}
                                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-lg shadow-red-600/20"
                            >
                                Limpar Tudo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div id="table-tabs" className="flex p-1 bg-black/20 rounded-xl border border-white/5 gap-1 overflow-x-auto">
                {systemContext === 'Mip' ? (
                    <>
                        <button onClick={()=>setTableTab('mip6')} className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='mip6' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Tabela 6:00</button>
                        <button onClick={()=>setTableTab('mip18')} className={`flex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='mip18' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Tabela 18:00</button>
                    </>
                ) : (
                    <>
                        <button onClick={()=>setTableTab('geral')} className={`flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='geral' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Tabela</button>
                        <button onClick={()=>setTableTab('confirmados')} className={`flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='confirmados' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Confirmados</button>
                        <button onClick={()=>setTableTab('lousa')} className={`flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='lousa' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Lousa</button>
                        <button onClick={()=>setTableTab('madrugada')} className={`flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='madrugada' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Madrugada</button>
                    </>
                )}
                <button onClick={()=>setTableTab('mensagens')} className={`flex-1 min-w-[100px] py-2 text-sm font-bold rounded-lg transition-all ${tableTab==='mensagens' ? theme.primary : 'hover:bg-white/5 opacity-60'}`}>Mensagens</button>
            </div>
            
            {(tableTab === 'geral' || tableTab === 'mip6' || tableTab === 'mip18') && (
                <div className={`${theme.card} p-5 rounded-xl border ${theme.border} anim-fade`}>
                                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-2">
                            <Button theme={theme} onClick={() => addVaga()} icon={Icons.Plus} size="sm" variant="success">Adicionar Vaga</Button>
                            <Button theme={theme} onClick={clearTable} icon={Icons.Trash} size="sm" variant="danger">Limpar Tabela</Button>
                            <button 
                                onClick={toggleLock} 
                                className={`p-2 rounded-lg transition-colors border ${isLocked ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                                title={isLocked ? "Desbloquear organização" : "Bloquear organização"}
                            >
                                {isLocked ? <Icons.Lock size={20} /> : <Icons.Unlock size={20} />}
                            </button>
                        </div>
                        <h3 className="text-lg font-bold opacity-80">
                            {tableTab === 'mip6' ? 'Tabela 6:00' : tableTab === 'mip18' ? 'Tabela 18:00' : 'Tabela Geral'}
                        </h3>
                        <div className="flex items-center gap-2 bg-black/30 p-1 rounded-lg">
                            <button onClick={() => setAnalysisDate(dateAddDays(analysisDate, -1))} className="p-2 hover:bg-white/10 rounded-md"><Icons.ChevronLeft size={20}/></button>
                            <div className="px-4 font-mono font-bold text-sm">{formatDisplayDate(analysisDate)}</div>
                            <button onClick={() => setAnalysisDate(dateAddDays(analysisDate, 1))} className="p-2 hover:bg-white/10 rounded-md"><Icons.ChevronRight size={20}/></button>
                            <button onClick={() => setAnalysisDate(currentOpDate)} className="ml-2 text-xs bg-white/10 px-2 py-1 rounded hover:bg-white/20">{currentOpDate === getTodayDate() ? 'Hoje' : 'Amanhã (Op)'}</button>
                            <button onClick={() => onPrint('print-tabela-list', 'Tabela_Geral', 'TABELA GERAL', { forceCols: 2, date: analysisDate })} className="ml-4 p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors" title="Salvar como Imagem (2 Colunas)"><Icons.Print size={20}/></button>
                        </div>
                    </div>
                    <div id="print-tabela-list" className="space-y-2">
                        {analysisRotatedList && analysisRotatedList.length > 0 ? analysisRotatedList.map((driver:any, idx:number) => {
                            const isOperational = analysisDate === currentOpDate;
                            const status = isOperational ? tableStatus[driver.vaga] : null; 
                            
                            const dayName = getDayName(analysisDate);
                            const isFolga = currentEffectiveFolgas && currentEffectiveFolgas[dayName] && currentEffectiveFolgas[dayName].includes(driver.vaga);
                            const hasGancho = ganchos && ganchos[analysisDate] && ganchos[analysisDate][driver.name];
                            const isBlocked = isFolga || hasGancho;

                            return (
                                <div 
                                    key={driver?.id || `vaga-${driver?.vaga}-${idx}`} 
                                    className={`p-3 rounded-lg border ${theme.border} flex flex-col sm:flex-row sm:items-center justify-between transition-colors gap-3 bg-white/5 hover:bg-white/10 ${isBlocked ? 'opacity-40 grayscale print:opacity-100 print:grayscale-0' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {editName === driver.vaga ? (
                                            <div className="flex items-center gap-2 hide-on-print">
                                                <input 
                                                    className="w-12 bg-black/50 border border-white/20 rounded px-2 py-1 text-sm font-mono outline-none focus:border-white/50" 
                                                    value={tempVaga} 
                                                    onChange={e=>setTempVaga(e.target.value)} 
                                                    placeholder="Vaga"
                                                />
                                                <input 
                                                    className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm w-32 outline-none focus:border-white/50" 
                                                    value={tempName} 
                                                    onChange={e=>setTempName(e.target.value)} 
                                                    placeholder="Nome"
                                                    autoFocus 
                                                />
                                                <button onClick={()=>saveDriverName(driver.vaga)} className="text-green-400 hover:text-green-300"><Icons.CheckCircle size={18}/></button>
                                                <button onClick={()=>setEditName(null)} className="text-red-400 hover:text-red-300"><Icons.X size={18}/></button>
                                            </div>
                                        ) : (
                                            <>
                                                <div 
                                                    className={`w-9 h-9 min-w-[36px] rounded relative flex items-center justify-center flex-shrink-0 ${driver.riscado || isBlocked ? 'opacity-30 border-red-500/50 border' : ''} ${isBlocked && !driver.riscado ? 'print:border-white/20 print:opacity-100' : ''}`}
                                                >
                                                    <div className="absolute inset-0 rounded bg-white/10 hide-on-print"></div>
                                                    <div 
                                                        className="absolute inset-0 rounded"
                                                        data-print-border={(isFolga || driver.riscado) ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.1)"}
                                                        data-print-bg={(isFolga || driver.riscado) ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.1)"}
                                                        data-print-transform="translateY(0px)"
                                                    ></div>
                                            <span 
                                                className="font-mono text-sm font-bold opacity-70 leading-none pt-[1px] relative z-10" 
                                                data-print-decoration={(isFolga || driver.riscado) ? "line-through" : "none"}
                                                data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "16px" : "14px"}
                                                data-print-size="24px" 
                                                data-print-color={(isFolga || driver.riscado) ? "#ef4444" : "#ffffff"}
                                                data-print-weight="900" 
                                                data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-12px)" : "translateY(-11px)"}
                                            >
                                                {driver.vaga}
                                            </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span 
                                                            data-print-size="28px" 
                                                            data-print-weight="bold" 
                                                            data-print-color={(isFolga || driver.riscado) ? "#ef4444" : "#ffffff"}
                                                            data-print-decoration={(isFolga || driver.riscado || driver.baixou) ? "line-through" : "none"}
                                                            data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "18px" : "11px"}
                                                            data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-10px)" : "translateY(-7px)"}
                                                            className={`inline-block font-bold text-lg ${driver.riscado || isBlocked ? 'line-through text-red-500' : ''} ${driver.baixou ? 'text-blue-400' : ''}`}
                                                        >
                                                            {driver.name} 
                                                        </span>
                                                        <div className="flex items-center gap-1" data-print-transform="translateY(-3px)">
                                                            {isFolga && <span data-print-size="18px" data-print-color="#ef4444" data-print-weight="900" className="text-[10px] uppercase text-red-500 font-black">(FOLGA)</span>}
                                                            {hasGancho && <span data-print-size="18px" data-print-color="#ef4444" data-print-weight="900" className="text-[10px] uppercase text-red-500 font-black hide-on-print">(GANCHO)</span>}
                                                            {driver.riscado && <span data-print-size="18px" data-print-color="#ef4444" data-print-weight="900" className="text-[10px] uppercase text-red-500 font-black">(RISCOU)</span>}
                                                            {driver.baixou && <span data-print-size="18px" data-print-color="#60a5fa" data-print-weight="900" data-print-opacity="1" className="text-[10px] uppercase text-blue-400 font-black print:opacity-100 opacity-60">(Baixou)</span>}
                                                        </div>
                                                        <button onClick={()=>{setEditName(driver.vaga); setTempName(driver.name); setTempVaga(driver.vaga)}} className="opacity-20 hover:opacity-100 transition-opacity hide-on-print"><Icons.Edit3 size={14}/></button>
                                                        <button onClick={() => removeVaga(driver.id)} className="ml-2 text-red-500 opacity-50 hover:opacity-100 transition-opacity hide-on-print"><Icons.Trash size={14}/></button>
                                                    </div>
                                                    {hasGancho && hasGancho.createdBy && hasGancho.createdBy !== 'Breno' && (
                                                        <span className="text-[10px] opacity-40 -mt-1 hide-on-print">por {hasGancho.createdBy}</span>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {isOperational && (
                                        <div className="flex items-center gap-2">
                                            {(systemContext === 'Mip' || tableTab.startsWith('mip')) ? (
                                                <div className="flex items-center gap-2">
                                                    {!isBlocked && (
                                                        <div className={`flex items-center gap-1 ${driver.riscado ? 'opacity-30 pointer-events-none' : ''}`}>
                                                            {!driver.baixou ? (
                                                                <>
                                                                    {/* Inputs visíveis na tela, ocultos na impressão */}
                                                                    <input 
                                                                        className="w-14 bg-black/40 border border-white/10 rounded px-1 py-1 text-xs font-mono text-center outline-none focus:border-white/30 hide-on-print"
                                                                        value={driver.time1 || ''}
                                                                        onChange={(e) => updateMipDriver(driver.id, { time1: e.target.value })}
                                                                        placeholder="00:00"
                                                                    />
                                                                    <input 
                                                                        className="w-14 bg-black/40 border border-white/10 rounded px-1 py-1 text-xs font-mono text-center outline-none focus:border-white/30 hide-on-print"
                                                                        value={driver.time2 || ''}
                                                                        onChange={(e) => updateMipDriver(driver.id, { time2: e.target.value })}
                                                                        placeholder="00:00"
                                                                    />
                                                                    <input 
                                                                        className="w-8 bg-black/40 border border-white/10 rounded px-1 py-1 text-xs font-mono text-center outline-none focus:border-white/30 hide-on-print"
                                                                        value={driver.num || ''}
                                                                        onChange={(e) => updateMipDriver(driver.id, { num: e.target.value })}
                                                                        placeholder="Nº"
                                                                    />

                                                                    {/* Texto visível APENAS na impressão */}
                                                                    <div className="hidden show-on-print flex items-center gap-2" data-print-display="flex">
                                                                        <div className="w-16 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)">
                                                                            <span data-print-transform="translateY(-11px)">{driver.time1 || ''}</span>
                                                                        </div>
                                                                        <div className="w-16 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)">
                                                                            <span data-print-transform="translateY(-11px)">{driver.time2 || ''}</span>
                                                                        </div>
                                                                        <div className="w-10 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)">
                                                                            <span data-print-transform="translateY(-11px)">{driver.num || ''}</span>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                // Se já baixou, mostra os inputs desabilitados visualmente, mas permite baixar de novo
                                                                <>
                                                                    <div className="flex items-center gap-1 opacity-50 hide-on-print">
                                                                        <div className="w-14 px-1 py-1 text-xs font-mono text-center border border-white/5 rounded bg-white/5">{driver.time1 || '--:--'}</div>
                                                                        <div className="w-14 px-1 py-1 text-xs font-mono text-center border border-white/5 rounded bg-white/5">{driver.time2 || '--:--'}</div>
                                                                        <div className="w-8 px-1 py-1 text-xs font-mono text-center border border-white/5 rounded bg-white/5">{driver.num || '-'}</div>
                                                                    </div>
                                                                    {/* Texto visível APENAS na impressão */}
                                                                    <div className="hidden show-on-print flex items-center gap-2 opacity-50" data-print-display="flex">
                                                                        <div className="w-16 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)">
                                                                            <span data-print-transform="translateY(-11px)">{driver.time1 || ''}</span>
                                                                        </div>
                                                                        <div className="w-16 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)">
                                                                            <span data-print-transform="translateY(-11px)">{driver.time2 || ''}</span>
                                                                        </div>
                                                                        <div className="w-10 text-center font-mono font-bold text-white border border-white/20" data-print-color="#ffffff" data-print-weight="bold" data-print-size="24px" data-print-transform="translateY(3px)">
                                                                            <span data-print-transform="translateY(-11px)">{driver.num || ''}</span>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!isBlocked && (
                                                        <button 
                                                            onClick={() => handleMipRiscar(driver.id)} 
                                                            className={`p-1.5 rounded-lg border transition-all hide-on-print ${driver.riscado ? 'bg-red-500 text-white border-red-500' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                                                            title="Riscar"
                                                        >
                                                            <Icons.Slash size={14}/>
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleMipBaixar(driver.id)} 
                                                        className={`p-1.5 border rounded-lg transition-all hide-on-print ${driver.baixou ? 'bg-orange-500 text-white border-orange-500' : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'}`}
                                                        title={driver.baixou ? "Cancelar Baixar" : "Baixar"}
                                                    >
                                                        {driver.baixou ? <Icons.X size={14}/> : <Icons.ArrowDown size={14}/>}
                                                    </button>
                                                </div>
                                            ) : (
                                                !status ? (
                                                    <>
                                                        <button onClick={() => updateTableStatus(driver.vaga, 'confirmed')} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors hide-on-print"><Icons.CheckCircle size={14}/> Confirmar</button>
                                                        <button onClick={() => updateTableStatus(driver.vaga, 'lousa')} className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors hide-on-print"><Icons.List size={14}/> Lousa</button>
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 hide-on-print">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border flex items-center gap-1 ${status==='confirmed'?'text-green-400 border-green-500/30 bg-green-500/10':'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'}`}>
                                                            {status === 'confirmed' ? <Icons.CheckCircle size={10}/> : <Icons.List size={10}/>}
                                                            {status === 'confirmed' ? 'Confirmado' : 'Na Lousa'}
                                                        </span>
                                                        <button onClick={() => updateTableStatus(driver.vaga, null)} className="p-1 text-red-400 opacity-50 hover:opacity-100" title="Remover status"><Icons.X size={14}/></button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        }) : <div className="text-center py-4 opacity-50">Nenhum motorista na lista.</div>}
                    </div>
                </div>
            )}

            {/* ABA CONFIRMADOS */}
            {tableTab === 'confirmados' && (
                <div className="flex flex-col gap-4 anim-fade">
                    <div className={`${theme.card} p-5 rounded-xl border ${theme.border} border-green-500/30 relative overflow-hidden`}>
                        <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-2 relative z-10">
                            <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> CONFIRMADOS
                            </h3>
                            <button onClick={() => onPrint('print-confirmados-list', 'Confirmados', 'LISTA DE CONFIRMADOS', { mode: 'confirmados', date: currentOpDate })} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white relative z-20" title="Salvar como Imagem"><Icons.Print size={18}/></button>
                        </div>
                        <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none z-0"><Icons.CheckCircle size={64}/></div>
                        
                        <div id="print-confirmados-list" className="space-y-2 min-h-[100px] relative z-10">
                            {confirmadosList.length > 0 ? confirmadosList.map((driver:any, idx: number) => {
                                const timeStr = confirmedTimes?.[driver.vaga];
                                const expired = isTimeExpired ? isTimeExpired(timeStr) : false;
                                const isInLousa = lousaOrder ? lousaOrder.some((i:any) => i.vaga === driver.vaga) : false;
                                const isFolga = driver.name.toUpperCase().includes('(FOLGA)');
                                
                                const trip = data.trips.find((t:any) => 
                                    t.isTemp && 
                                    t.date === currentOpDate && 
                                    String(t.vaga) === String(driver.vaga) &&
                                    t.status !== 'Cancelada'
                                );
                                const isTemp = !!trip;

                                return (
                                    <div key={driver.id || `vaga-${driver.vaga}-${idx}`} className={`h-[48px] flex items-center justify-between gap-4 px-3 rounded-lg border transition-all ${isTemp ? 'border-2 border-dashed border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.1)]' : ''} ${expired ? 'bg-red-900/10 border-red-500/20 opacity-80' : 'bg-black/20 border-white/5'} print:bg-transparent`}>
                                        <div 
                                            className={`w-[40px] h-[40px] rounded relative flex items-center justify-center flex-shrink-0 ${expired ? 'bg-red-500/20 text-red-300' : 'bg-green-900/50 text-green-200'} print:bg-transparent`}
                                            data-print-bg="transparent"
                                        >
                                            <div 
                                                className="absolute inset-0 rounded print:bg-transparent"
                                                data-print-transform="translateY(0px)"
                                                data-print-bg={expired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 78, 59, 0.5)'}
                                            ></div>
                                            <span 
                                                className="font-mono text-sm relative z-10" 
                                                data-print-decoration={(isFolga || driver.riscado) ? "line-through" : "none"}
                                                data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "16px" : "14px"}
                                                data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-12px)" : "translateY(-11px)"}
                                                data-print-size="24px"
                                                data-print-weight="900"
                                            >
                                                {driver.vaga}
                                            </span>
                                        </div>
                                        <div className="flex-1 flex flex-col min-w-0">
                                            <span 
                                                data-print-decoration={expired ? "line-through" : "none"}
                                                data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "18px" : "11px"}
                                                data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-10px)" : "translateY(-7px)"}
                                                className={`font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis ${expired ? 'line-through opacity-60' : ''}`}
                                            >
                                                {driver.name}
                                            </span>
                                            {isTemp && <div className="hide-on-print"><TempTripTimer date={trip.date} time={trip.time} /></div>}
                                        </div>
                                        <div className="flex items-center gap-3 text-right flex-shrink-0">
                                            <span 
                                                data-print-decoration={expired ? "line-through" : "none"}
                                                data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "18px" : "11px"}
                                                data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-10px)" : "translateY(-7px)"}
                                                className={`font-mono font-bold text-lg whitespace-nowrap ${expired ? 'text-red-400 decoration-red-500 line-through' : 'text-green-400'}`}
                                            >
                                                {timeStr || '--:--'}
                                            </span>
                                            {expired ? (
                                                <button 
                                                    onClick={() => toggleLousaFromConfirmados(driver.vaga)} 
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors hide-on-print ${
                                                        isInLousa 
                                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                                                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30 shadow-lg animate-pulse'
                                                    }`}
                                                >
                                                    {isInLousa ? 'Remover da Lousa' : 'Mover p/ Lousa'}
                                                </button>
                                            ) : (
                                                <button onClick={() => cancelConfirmation(driver.vaga)} className="text-red-400 hover:text-red-300 transition-colors p-1 hide-on-print"><Icons.X size={14}/></button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }) : <div className="text-center opacity-30 text-sm py-10">Nenhum confirmado</div>}
                        </div>
                    </div>
                </div>
            )}
            
            {tableTab === 'lousa' && (
                <div className={`${theme.card} p-3 md:p-5 rounded-xl border ${theme.border} border-yellow-500/30 relative anim-fade`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-white/10 pb-2 gap-3 sm:gap-0 relative z-10">
                        <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> LOUSA</h3>
                        <div className="flex w-full sm:w-auto justify-end items-center gap-2">
                            <button 
                                onClick={addNullLousaItem} 
                                className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1 font-bold text-xs" 
                                title="Adicionar Pulo de Horário"
                            >
                                <Icons.Plus size={16}/> Pular Horário
                            </button>
                            <button onClick={() => onPrint('print-lousa-list', 'Lousa', 'LOUSA / FILA', { mode: 'lousa', date: currentOpDate })} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-white relative z-20" title="Salvar como Imagem"><Icons.Print size={18}/></button>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none z-0"><Icons.List size={64}/></div>
                    
                    <div id="print-lousa-list" className="space-y-2 min-h-[300px] relative z-10">
                        {lousaOrder && lousaOrder.map((item:any, index:number) => { 
                            const vaga = item.vaga; 
                            const isNullItem = item.isNull;
                            const driver = isNullItem ? { name: "🚫 HORÁRIO VAGO" } : (spList.find((d:any) => d.vaga === vaga) || { name: '' }); 
                            const isRiscado = item.riscado; 
                            const isBaixou = item.baixou;
                            
                            let displayContent = '---'; 
                            let isExpired = false;
                            let isTimeCrossed = false;
                            let timeClass = 'text-yellow-400';

                            if (isBaixou) {
                                displayContent = 'BAIXOU';
                                timeClass = 'text-orange-500 font-bold';
                                // Note: We do NOT increment lousaEffectiveIndex when "Baixou", effectively skipping the time slot calculation for this row
                            } else if (isRiscado) {
                                displayContent = 'RISCOU';
                                timeClass = 'text-red-500 font-bold';
                            } else if (!isNullItem) {
                                const t = new Date(startLousaTime.getTime() + lousaEffectiveIndex * 30 * 60000); 
                                displayContent = t.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}); 
                                isExpired = isTimeExpired ? isTimeExpired(displayContent) : false;
                                if (isExpired) {
                                    timeClass = 'text-red-400';
                                    isTimeCrossed = true;
                                }
                                lousaEffectiveIndex++; 
                            } else {
                                // isNullItem
                                const t = new Date(startLousaTime.getTime() + lousaEffectiveIndex * 30 * 60000); 
                                displayContent = t.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                                timeClass = 'opacity-50';
                                            lousaEffectiveIndex++;
                            }
                            
                            return ( 
                                <div 
                                    key={item.uid || `lousa-${item.vaga}-${index}`} 
                                    className={`h-[48px] flex items-center justify-between gap-4 px-3 rounded-lg border ${isExpired ? 'bg-red-900/10 border-red-500/20 opacity-80' : (isRiscado ? 'bg-red-900/10 border-red-500/20 opacity-60' : (isBaixou ? 'bg-orange-900/10 border-orange-500/20 opacity-70' : 'bg-black/20 border-white/5'))}`}
                                > 
                                        <div 
                                            className={`w-[40px] h-[40px] rounded relative flex items-center justify-center flex-shrink-0 ${isNullItem ? 'opacity-0' : (isExpired ? 'bg-red-500/20 text-red-300' : 'bg-white/10 opacity-70')}`}
                                            data-print-bg="transparent"
                                        >
                                            <div 
                                                className="absolute inset-0 rounded print:bg-transparent"
                                                data-print-transform="translateY(0px)"
                                                data-print-bg={isExpired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'}
                                            ></div>
                                            <span 
                                                className="font-mono text-sm relative z-10" 
                                                data-print-decoration={(isRiscado || isExpired || isBaixou) ? "line-through" : "none"}
                                                data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "16px" : "14px"}
                                                data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-12px)" : "translateY(-11px)"}
                                                data-print-size="24px"
                                                data-print-weight="900"
                                            >
                                                {!isNullItem && vaga}
                                            </span>
                                        </div>
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <span 
                                            data-print-decoration={(isRiscado || isExpired || isBaixou) ? "line-through" : "none"}
                                            data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "18px" : "11px"}
                                            data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-10px)" : "translateY(-7px)"}
                                            className={`font-bold text-base whitespace-nowrap overflow-hidden text-ellipsis ${isRiscado || isExpired || isBaixou ? 'line-through' : ''} ${isExpired || isBaixou ? 'opacity-60' : ''}`}
                                        >
                                            {driver.name}
                                        </span> 
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0"> 
                                        <span 
                                            data-print-decoration={isTimeCrossed ? "line-through" : "none"}
                                            data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "18px" : "11px"}
                                            data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-10px)" : "translateY(-7px)"}
                                            className={`font-mono font-bold text-lg whitespace-nowrap ${timeClass} ${isTimeCrossed ? 'line-through' : ''}`}
                                        >
                                            {displayContent}
                                        </span> 
                                        
                                        {!isNullItem && (
                                            <>
                                                <button 
                                                    onClick={() => handleLousaAction(item.uid, isBaixou ? 'cancelar_baixar' : 'baixar', vaga)} 
                                                    className={`p-1.5 rounded transition-all hide-on-print flex-shrink-0 ${isBaixou ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-500/20 text-orange-400 border-orange-500/20 hover:bg-orange-500/30'}`}
                                                    title={isBaixou ? "Cancelar Baixar" : "Baixar vaga"}
                                                > 
                                                    {isBaixou ? <Icons.X size={10}/> : <Icons.ArrowDown size={10}/>} 
                                                </button>
                                                {!isBaixou && !isRiscado && (
                                                    <button onClick={() => handleLousaAction(item.uid, 'duplicate', vaga)} className="p-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 hide-on-print flex-shrink-0" title="Duplicar vaga"> <Icons.Plus size={10}/> </button>
                                                )}
                                            </>
                                        )} 
                                        
                                        {!isBaixou && (
                                            <button onClick={() => handleLousaAction(item.uid, 'riscar', vaga)} className={`p-1.5 bg-white/5 rounded hover:bg-white/10 text-white hide-on-print flex-shrink-0 ${isRiscado ? 'text-red-500 bg-red-500/10' : ''}`} title="Riscar"> 
                                                <Icons.Slash size={10}/> 
                                            </button> 
                                        )}
                                        
                                        <button onClick={() => handleLousaAction(item.uid, 'remove', vaga)} className="p-1.5 bg-white/5 rounded hover:bg-red-500/20 text-red-400 hide-on-print flex-shrink-0" title="Remover"><Icons.X size={12}/></button> 
                                    </div> 
                                </div> 
                            ); 
                        })} 
                        {(!lousaOrder || lousaOrder.length === 0) && <div className="text-center opacity-30 text-sm py-10">Lousa vazia</div>} 
                    </div>
                </div>
            )}
            
            {tableTab === 'madrugada' && (
                <div className={`${theme.card} p-3 md:p-5 rounded-xl border ${theme.border} anim-fade overflow-hidden`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3 md:gap-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Icons.Moon size={20}/> Madrugada</h3>
                            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg ml-2">
                                <button onClick={() => setMadrugadaDisplayDate(dateAddDays(madrugadaDisplayDate, -1))} className="p-1.5 hover:bg-white/10 rounded-md"><Icons.ChevronLeft size={16}/></button>
                                <div className="px-2 font-mono font-bold text-xs">{formatDisplayDate(madrugadaDisplayDate)}</div>
                                <button onClick={() => setMadrugadaDisplayDate(dateAddDays(madrugadaDisplayDate, 1))} className="p-1.5 hover:bg-white/10 rounded-md"><Icons.ChevronRight size={16}/></button>
                                <button onClick={() => setMadrugadaDisplayDate(initialMadrugadaDate)} className="ml-1 text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20">Hoje</button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center justify-between md:justify-end w-full md:w-auto">
                            <button 
                                onClick={addNullMadrugadaItem} 
                                className="p-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1 font-bold text-xs" 
                                title="Adicionar Pulo de Horário"
                            >
                                <Icons.Plus size={16}/> Pular Horário
                            </button>
                            <Button theme={theme} onClick={addMadrugadaVaga} icon={Icons.Plus} size="sm" variant="success">Adicionar Motorista</Button>
                            
                            <div className="flex items-center gap-2">
                                <button onClick={() => onPrint('print-madrugada-list', 'Madrugada', 'MADRUGADA', { mode: 'madrugada', date: madrugadaDisplayDate })} className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors" title="Salvar como Imagem"><Icons.Print size={18}/></button>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs opacity-50 mb-3 hide-on-print">Planejamento para a madrugada do dia {formatDisplayDate(madrugadaDisplayDate)}.</p>
                    <div id="print-madrugada-list" className="space-y-2">
                        {/* USANDO LISTA ORDENADA AUTOMATICAMENTE COM BASE NA DATA SELECIONADA */}
                        {madrugadaOrderedList && madrugadaOrderedList.length > 0 ? madrugadaOrderedList.map((driver:any, index:number) => { 
                            const vaga = driver.vaga;
                            const isNullMadrugada = vaga && (vaga.toUpperCase() === 'NULL');
                            const mData = madrugadaData[vaga] || { qtd: '', time: '', riscado: false, comment: '' }; 
                            
                            // Busca viagem específica para a data selecionada
                            const tripId = `mad_${madrugadaDisplayDate}_${vaga}`;
                            const trip = data.trips.find((t:any) => t.id === tripId || (t.isMadrugada && String(t.vaga) === String(vaga) && t.date === madrugadaDisplayDate && t.status !== 'Cancelada'));
                            const isCancelled = trip && trip.status === 'Cancelada';
                            const isFinished = trip && trip.status === 'Finalizada';
                            const isTemp = trip && trip.isTemp;
                            
                            const displayTime = trip ? trip.time : (madrugadaDisplayDate === currentOpDate ? mData.time : '');
                            const displayQtd = trip ? (trip.pCountSnapshot || trip.pCount) : (madrugadaDisplayDate === currentOpDate ? mData.qtd : '');

                            let rowClass = `flex flex-col md:flex-row items-center gap-2 p-3 rounded-lg border`;
                            if (isCancelled) rowClass += ` bg-red-900/10 border-red-500/30 opacity-70`;
                            else if (isFinished) rowClass += ` bg-green-900/10 border-green-500/30`;
                            else if (isTemp) rowClass += ` border-2 border-dashed border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.1)] bg-yellow-400/5`;
                            else rowClass += ` bg-black/20 border-white/5`;

                            return ( 
                                <div key={`madrugada-${vaga}-${index}`} className={rowClass}> 
                                    <div className="flex items-center gap-3 w-full md:w-auto flex-1 relative min-w-0"> 
                                        <div className="opacity-30 hide-on-print flex-shrink-0"><Icons.List size={14}/></div> 
                                        <button onClick={() => removeMadrugadaVaga(vaga)} className="text-red-400 opacity-50 hover:opacity-100 hide-on-print flex-shrink-0"><Icons.Trash size={14}/></button> 
                                        <button onClick={() => toggleMadrugadaRiscado(vaga)} className={`p-1 rounded hover:bg-white/10 flex-shrink-0 ${mData.riscado ? 'text-red-400' : 'text-white/30'} hide-on-print`}> <Icons.Slash size={14}/> </button> 
                                        <div 
                                            className={`relative font-mono text-sm bg-indigo-500/20 text-indigo-300 w-[35px] h-[30px] min-w-[35px] rounded flex items-center justify-center flex-shrink-0 leading-none pt-[1px] print:bg-transparent ${isNullMadrugada ? 'opacity-0' : ''}`}
                                            data-print-bg="transparent"
                                        >
                                            <div 
                                                className="absolute inset-0 rounded print:bg-transparent"
                                                data-print-transform="translateY(0px)"
                                                data-print-bg="rgba(99, 102, 241, 0.2)"
                                            ></div>
                                            <span 
                                                className="relative z-10"
                                                data-print-decoration={(mData.riscado || isCancelled) ? "line-through" : "none"}
                                                data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "16px" : "14px"}
                                                data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-12px)" : "translateY(-11px)"}
                                                data-print-size="24px"
                                                data-print-weight="900"
                                            >
                                                {!isNullMadrugada && vaga}
                                            </span>
                                        </div> 
                                        <div className="flex flex-col min-w-0 flex-1"> 
                                            <div className="flex flex-row items-center gap-2">
                                                <span 
                                                    data-print-decoration={(mData.riscado || isCancelled) ? "line-through" : "none"}
                                                    data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "18px" : "11px"}
                                                    data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-10px)" : "translateY(-7px)"}
                                                    className={`inline-block font-bold text-lg whitespace-nowrap overflow-visible leading-tight ${mData.riscado || isCancelled ? 'line-through opacity-50' : ''}`}
                                                >
                                                    {isNullMadrugada ? "🚫 HORÁRIO VAGO" : driver.name}
                                                </span> 
                                                {isCancelled && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase font-bold">Cancelada</span>}
                                                {isFinished && <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded uppercase font-bold">Finalizada</span>}
                                                {mData.riscado && mData.comment && ( <div className="text-[12px] text-red-300 bg-red-900/30 px-2 py-1 rounded w-fit flex items-center justify-center leading-tight whitespace-nowrap overflow-visible max-w-full relative top-[3px] font-bold">{mData.comment}</div> )} 
                                            </div>
                                            {isTemp && <div className="hide-on-print"><TempTripTimer date={trip.date} time={trip.time} /></div>}
                                        </div> 
                                    </div> 
                                    {!mData.riscado && ( 
                                        <div className="flex items-center gap-2 w-full md:w-auto md:justify-end flex-shrink-0 mt-2 md:mt-0"> 
                                            <div className="flex gap-2 hide-on-print w-full md:w-auto items-center">
                                                <div className="bg-black/30 border border-white/10 rounded px-3 py-2 w-full md:w-20 text-center text-white/70">
                                                    {displayQtd || '-'}
                                                </div>
                                                <div className="bg-black/30 border border-white/10 rounded px-3 py-2 w-full md:w-32 text-center text-white/70 text-sm">
                                                    {displayTime || '-'}
                                                </div>
                                                
                                                <button 
                                                    onClick={() => openMadrugadaTrip(vaga, madrugadaDisplayDate)}
                                                    className="p-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 rounded-lg transition-colors font-bold text-xs flex items-center gap-1"
                                                    title="Editar Viagem"
                                                >
                                                    <Icons.Edit size={14}/> Gerenciar
                                                </button>
                                            </div>
                                            <div className="show-on-print hidden font-bold text-indigo-200 text-lg"> 
                                                <span 
                                                    data-print-decoration={isCancelled ? "line-through" : "none"}
                                                    data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "18px" : "11px"}
                                                    data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-10px)" : "translateY(-7px)"}
                                                >
                                                    {displayTime}
                                                </span> 
                                                {displayQtd && (
                                                    <span 
                                                        className="ml-2 opacity-70" 
                                                        data-print-decoration={isCancelled ? "line-through" : "none"}
                                                        data-print-line-offset={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "18px" : "11px"}
                                                        data-print-transform={(systemContext === 'Mip' || tableTab.startsWith('mip')) ? "translateY(-10px)" : "translateY(-7px)"}
                                                    >
                                                        ({displayQtd})
                                                    </span>
                                                )} 
                                            </div> 
                                        </div> 
                                    )} 
                                </div> 
                            ); 
                        }) : <div className="text-center opacity-30 text-sm py-4">Nenhuma vaga na madrugada para esta data.</div>} 
                    </div>
                </div>
            )}

            {tableTab === 'mensagens' && (
                <div className={`${theme.card} p-5 rounded-xl border ${theme.border} anim-fade`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Icons.Message size={20}/> Mensagens Prontas</h3>
                        <Button theme={theme} onClick={addCannedMessage} icon={Icons.Plus} size="sm">Nova Mensagem</Button>
                    </div>
                    <div className="space-y-3">
                        {cannedMessages && cannedMessages.length > 0 ? cannedMessages.map((msg:any, index:number) => (
                            <div 
                                key={msg.id} 
                                className={`p-4 rounded-lg border ${theme.border} bg-white/5 flex flex-col gap-2 hover:bg-white/10 transition-colors`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="opacity-30"><Icons.List size={14}/></div>
                                        <input 
                                            className="bg-transparent font-bold text-sm w-full outline-none border-b border-transparent focus:border-white/20 transition-colors" 
                                            value={msg.title} 
                                            onChange={(e) => updateCannedMessage(msg.id, 'title', e.target.value)}
                                            placeholder="Título da Mensagem"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { navigator.clipboard.writeText(msg.text); notify("Copiado!", "success"); }} className="p-2 hover:bg-white/10 rounded text-blue-400" title="Copiar"><Icons.Copy size={16}/></button>
                                        <button onClick={() => deleteCannedMessage(msg.id)} className="p-2 hover:bg-red-500/20 rounded text-red-400" title="Excluir"><Icons.Trash size={16}/></button>
                                    </div>
                                </div>
                                <textarea 
                                    className="bg-black/20 w-full rounded-lg p-2 text-xs opacity-80 min-h-[60px] outline-none border border-transparent focus:border-white/10 transition-colors resize-y"
                                    value={msg.text}
                                    onChange={(e) => updateCannedMessage(msg.id, 'text', e.target.value)}
                                    placeholder="Texto da mensagem..."
                                />
                            </div>
                        )) : <div className="text-center opacity-30 text-sm py-10">Nenhuma mensagem salva.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
