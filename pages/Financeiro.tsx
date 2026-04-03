
import React from 'react';
import { Icons, Button } from '../components/Shared';
import { formatDisplayDate, getTodayDate } from '../utils';

export default function Financeiro({ data, theme, billingData, billingDate, prevBillingMonth, nextBillingMonth, togglePaymentStatus, sendBillingMessage, del, setFormData, setModal, openEditTrip, user, notify, systemContext, spList, pranchetaData, togglePranchetaPayment, weekId, pranchetaWeekOffset, setPranchetaWeekOffset, pranchetaValue, setPranchetaValue, sendPranchetaBillingMessage, pricePerPassenger }: any) {
    
    const [financeiroTab, setFinanceiroTab] = React.useState('geral');

    // Verifica permissão para ver o total recebido
    const canSeeRevenue = user && (user.role === 'admin' || user.username === 'Breno');

    const formatCurrency = (val: any) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '0,00';
        return num.toFixed(2).replace('.', ',');
    };

    // --- Lógica do Caixa Diário ---
    const today = getTodayDate();
    const dailyTrips = (data.trips || []).filter((t:any) => t.paymentStatus === 'Pago' && t.receivedAt === today);

    const calcTripValue = (t:any) => {
        let value = 0;
        let pCount = 0;
        if (t.isExtra) { 
            value = parseFloat(t.value) || 0; 
        } else if (t.isMadrugada) { 
            pCount = t.pCountSnapshot !== undefined ? parseInt(t.pCountSnapshot || 0) : parseInt(t.pCount || 0); 
            const unitPrice = Number(t.pricePerPassenger) || Number(t.ticketPrice) || (pricePerPassenger || 4); 
            value = pCount * unitPrice; 
        } else { 
            if (t.pCountSnapshot !== undefined && t.pCountSnapshot !== null) {
                pCount = parseInt(t.pCountSnapshot || 0);
            } else if (t.passengersSnapshot) {
                pCount = t.passengersSnapshot.reduce((acc:number, p:any) => acc + parseInt(p.passengerCount || 1), 0);
            } else {
                pCount = data.passengers.filter((p:any) => (t.passengerIds||[]).includes(p.realId || p.id)).reduce((a:number,b:any) => a + parseInt(b.passengerCount||1), 0);
            }
            const unitPrice = Number(t.pricePerPassenger) || Number(t.ticketPrice) || (pricePerPassenger || 4); 
            value = pCount * unitPrice; 
            if (pCount === 0 && t.value) value = parseFloat(t.value); 
        }
        return value;
    };

    const operatorTotals: Record<string, number> = {};
    let grandTotal = 0;

    dailyTrips.forEach((t:any) => {
        const val = calcTripValue(t);
        const receiver = t.receivedBy || 'Desconhecido';
        if (!operatorTotals[receiver]) operatorTotals[receiver] = 0;
        operatorTotals[receiver] += val;
        grandTotal += val;
    });

    const myTotal = operatorTotals[user.username] || 0;
    // -----------------------------

    return (
        <div className="space-y-6">
            {/* Cabeçalho com Navegação de Mês */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10 stagger-in d-1">
                <h3 className="text-lg font-bold opacity-80 flex items-center gap-2"><Icons.Dollar size={20}/> Financeiro</h3>
                
                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
                    <button onClick={prevBillingMonth} className="p-1.5 hover:bg-white/10 rounded transition-colors"><Icons.ChevronLeft size={18}/></button>
                    <span className="text-sm font-bold capitalize w-32 text-center">{billingDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span>
                    <button onClick={nextBillingMonth} className="p-1.5 hover:bg-white/10 rounded transition-colors"><Icons.ChevronRight size={18}/></button>
                </div>
            </div>

            {/* Seletor de Abas (Geral / Prancheta) */}
            {systemContext === 'Pg' && (
                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 stagger-in d-1.5">
                    <button 
                        onClick={() => setFinanceiroTab('geral')}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${financeiroTab === 'geral' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <Icons.Dollar size={16}/> Geral
                    </button>
                    <button 
                        onClick={() => setFinanceiroTab('prancheta')}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${financeiroTab === 'prancheta' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <Icons.Clipboard size={16}/> Prancheta
                    </button>
                </div>
            )}

            {financeiroTab === 'geral' ? (
                <>
                    {/* CAIXA DIÁRIO (NOVO) */}
            <div className="stagger-in d-2">
                <div className={`${theme.card} p-6 rounded-xl border ${theme.border} bg-blue-500/10 border-blue-500/20 relative overflow-hidden`}>
                    <div className="flex justify-between items-start z-10 relative">
                        <div>
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">
                                Caixa Diário ({canSeeRevenue ? 'Geral' : 'Meu'})
                            </div>
                            <div className="text-4xl font-bold text-white">
                                R$ {formatCurrency(canSeeRevenue ? grandTotal : myTotal)}
                            </div>
                            <div className="text-sm opacity-50 mt-1">
                                {canSeeRevenue ? dailyTrips.length : dailyTrips.filter((t:any) => t.receivedBy === user.username).length} pagamentos hoje
                            </div>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                            <Icons.Dollar size={24} />
                        </div>
                    </div>
                    
                    {/* Detalhamento para Admin */}
                    {canSeeRevenue && Object.keys(operatorTotals).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
                            {Object.entries(operatorTotals)
                                .map(([op, val]) => (
                                <div key={op} className="flex justify-between items-center text-sm">
                                    <span className="opacity-60">{op === 'Breno' ? 'Sistema' : op}</span>
                                    <span className="font-bold">R$ {formatCurrency(val)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Resumo Topo (Mensal) */}
            <div className={`grid ${canSeeRevenue ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                <div className={`${theme.card} p-4 rounded-xl border ${theme.border} bg-red-500/10 border-red-500/20 stagger-in d-2`}>
                    <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">A Receber (Pendente)</div>
                    <div className="text-3xl font-bold text-white">R$ {formatCurrency(billingData.summary.pending)}</div>
                </div>
                
                {canSeeRevenue && (
                    <div className={`${theme.card} p-4 rounded-xl border ${theme.border} bg-green-500/10 border-green-500/20 stagger-in d-3`}>
                        <div className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Recebido (Pago)</div>
                        <div className="text-3xl font-bold text-white">R$ {formatCurrency(billingData.summary.paid)}</div>
                    </div>
                )}
            </div>

            {/* Lista Agrupada por Dia */}
            <div className="space-y-6 stagger-in d-4">
                {billingData.groups.length > 0 ? billingData.groups.map((group:any, idx:number) => {
                    const [y, m, d] = group.date.split('-');
                    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                    const displayDate = `${d} de ${monthNames[parseInt(m)-1]}`;

                    return (
                        <div key={group.date} className="anim-fade" style={{animationDelay: `${idx * 100}ms`}}>
                            <h3 className="flex items-center gap-3 text-sm font-bold opacity-60 uppercase tracking-widest mb-3 pl-1">
                                <span>{displayDate}</span>
                                <div className="h-[1px] bg-white/10 flex-1"></div>
                                {/* Só mostra o total do dia se for admin, pois contém valores pagos */}
                                {canSeeRevenue && <span className="text-white/40">Total: R$ {formatCurrency(group.totalValue)}</span>}
                            </h3>
                            
                            <div className="space-y-3">
                                {group.trips.map((trip:any) => (
                                    <div key={trip.id} className={`${theme.card} p-4 rounded-xl border ${theme.border} flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden`}>
                                        {/* Indicador Lateral de Status */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${trip.isPaid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                                     <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold bg-white/5 border border-white/10 shrink-0 ${(!trip.isExtra && !trip.isMadrugada && trip.time && trip.time.length > 3) ? 'text-xs' : 'text-lg'}`}>
                                                {trip.isExtra ? <Icons.Car size={24}/> : (trip.isMadrugada ? <Icons.Moon size={24}/> : (
                                                     trip.time && trip.time.toLowerCase().includes('madrugada') ? 'Mad.' : (trip.time && trip.time.includes(':') ? trip.time.split(':')[0] + 'h' : trip.time)
                                                 ))}
                                             </div>
                                             <div className="min-w-0 flex-1">
                                                 {trip.isExtra ? (
                                                     <>
                                                         <div className="font-bold text-lg flex items-center gap-2 flex-wrap min-w-0">
                                                             <span className="truncate">{trip.driverName}</span>
                                                             <div className="flex gap-1 shrink-0">
                                                                 <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30 uppercase shrink-0">Extra</span>
                                                                 <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase shrink-0">{trip.extraType || 'Frete'}</span>
                                                             </div>
                                                         </div>
                                                         <div className="text-sm opacity-60 flex items-center gap-2">
                                                             <Icons.Calendar size={12} className="opacity-50 shrink-0"/>
                                                             <span className="truncate">{formatDisplayDate(trip.date)} às {trip.time}</span>
                                                         </div>
                                                         <div className="text-sm opacity-60 italic max-w-[200px] truncate mt-1">
                                                             {trip.notes || 'Sem observação'}
                                                         </div>
                                                     </>
                                                 ) : trip.isMadrugada ? (
                                                     <>
                                                             <div className="font-bold text-lg flex items-center gap-2 min-w-0">
                                                             <span className="truncate">{trip.driverName}</span>
                                                             <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase shrink-0">Madrugada</span>
                                                         </div>
                                                         <div className="text-sm opacity-60 flex items-center gap-2">
                                                             <span className="truncate">{trip.pCount} passageiros</span>
                                                             <span className="shrink-0">•</span>
                                                             <span className="shrink-0">Vaga {trip.vaga}</span>
                                                         </div>
                                                     </>
                                                 ) : (
                                                     <>
                                                         <div className="font-bold text-lg flex items-center gap-2 min-w-0">
                                                             <span className="truncate">{trip.driverName}</span>
                                                             {trip.isTemp && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30 uppercase shrink-0">Temp</span>}
                                                         </div>
                                                         <div className="text-sm opacity-60 flex items-center gap-2">
                                                             <span className="truncate">{trip.pCount} passageiros</span>
                                                             <span className="shrink-0">•</span>
                                                             <span className="font-mono shrink-0">#{trip.id}</span>
                                                         </div>
                                                     </>
                                                 )}
                                                 {/* Mostra quem recebeu o pagamento se estiver pago */}
                                                 {trip.isPaid && trip.receivedBy && (
                                                     <div className="text-[10px] text-green-500/70 font-medium mt-1 flex items-center gap-1">
                                                         <Icons.CheckCircle size={10} className="shrink-0"/> <span className="truncate">Recebido por {trip.receivedBy}</span>
                                                     </div>
                                                 )}
                                             </div>
                                         </div>

                                        <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3 md:gap-6 bg-black/20 p-3 md:p-0 md:bg-transparent rounded-lg">
                                            <div className="flex flex-col items-start md:items-end px-1 md:px-0">
                                                <div className="text-xs opacity-50 uppercase font-bold">Valor</div>
                                                <div className="text-xl font-bold text-yellow-400 whitespace-nowrap">R$ {formatCurrency(trip.value)}</div>
                                            </div>

                                            <div className="flex gap-2 items-center ml-auto md:ml-0">
                                                <button 
                                                    onClick={() => togglePaymentStatus(trip)}
                                                    className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 border transition-all active:scale-95 ${trip.isPaid ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}
                                                >
                                                    {trip.isPaid ? <Icons.CheckCircle size={14}/> : <Icons.Clock size={14}/>}
                                                    {trip.isPaid ? 'PAGO' : 'PENDENTE'}
                                                </button>
                                                
                                                {/* Botão de Editar */}
                                                <button 
                                                    onClick={() => openEditTrip(trip)}
                                                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex-shrink-0"
                                                    title="Editar Viagem/Cobrança"
                                                >
                                                    <Icons.Edit size={16}/>
                                                </button>

                                                <button 
                                                    onClick={() => sendBillingMessage(trip)}
                                                    className="px-3 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 transition-colors shadow-lg active:scale-95 flex-shrink-0"
                                                    title="Cobrar no WhatsApp"
                                                >
                                                    <Icons.Phone size={16}/>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => del('trips', trip.id)} 
                                                    className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0"
                                                    title="Excluir Cobrança/Viagem"
                                                >
                                                    <Icons.Trash size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }) : (<div className="text-center py-10 opacity-30 text-sm border-2 border-dashed border-white/10 rounded-xl">Nenhuma viagem registrada em {billingDate.toLocaleDateString('pt-BR', {month:'long'})}.</div>)}
            </div>
            </>
            ) : (
                /* SEÇÃO PRANCHETA (NOVA) */
                <div className="space-y-6 stagger-in d-5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <h3 className="text-lg font-bold opacity-80 flex items-center gap-2">
                            <Icons.Clipboard size={20}/> Cobrança Prancheta (Sistema PG)
                        </h3>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setPranchetaWeekOffset(pranchetaWeekOffset - 1)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                title="Semana Anterior"
                            >
                                <Icons.ChevronLeft size={16} />
                            </button>
                            <div className="text-xs font-mono opacity-50 bg-white/5 px-2 py-1 rounded">
                                Semana: {weekId}
                            </div>
                            <button 
                                onClick={() => setPranchetaWeekOffset(pranchetaWeekOffset + 1)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                title="Próxima Semana"
                            >
                                <Icons.ChevronRight size={16} />
                            </button>
                            {pranchetaWeekOffset !== 0 && (
                                <button 
                                    onClick={() => setPranchetaWeekOffset(0)}
                                    className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 ml-2"
                                >
                                    Atual
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Editor de Valor da Prancheta (PG) - MOVIDO PARA MENU DO USUÁRIO */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array.from({ length: 23 }, (_, i) => i.toString().padStart(2, '0')).map(vaga => {
                            const driverInVaga = spList.find((s:any) => s.vaga === vaga);
                            const payment = pranchetaData[vaga];
                            const isPaid = payment?.paid;
                            const driverInfo = driverInVaga ? data.drivers.find((d:any) => d.name === driverInVaga.name) : null;

                            return (
                                <div key={vaga} className={`${theme.card} p-3 rounded-xl border ${theme.border} flex items-center justify-between gap-3 transition-all hover:bg-white/5`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm border ${isPaid ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                            {vaga}
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`font-bold truncate ${isPaid ? 'opacity-50 line-through' : ''}`}>
                                                {driverInVaga ? driverInVaga.name : <span className="opacity-20 italic">Vazia</span>}
                                            </div>
                                            {isPaid && (
                                                <div className="text-[10px] text-green-500/70 font-medium">
                                                    Recebido por {payment.receivedBy === 'Breno' ? 'Sistema' : payment.receivedBy}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        {driverInVaga && (
                                            <button 
                                                onClick={() => {
                                                    const phone = driverInfo?.phone || '';
                                                    sendPranchetaBillingMessage(vaga, driverInVaga.name, phone);
                                                }}
                                                className="p-2 rounded-lg bg-green-600/20 text-green-500 hover:bg-green-600/30 transition-colors"
                                                title="WhatsApp"
                                            >
                                                <Icons.Phone size={14}/>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => togglePranchetaPayment(vaga)}
                                            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] border transition-all active:scale-95 ${isPaid ? 'bg-green-500 text-white border-green-500' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                                        >
                                            {isPaid ? 'PAGO' : 'PENDENTE'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
