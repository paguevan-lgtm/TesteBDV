
import React, { useState, useEffect, useMemo } from 'react';
import { Icons, Button, IconButton, PageHeader, EmptyState } from '../components/Shared';
import { calculateTimeSlot, generateTripListText, generateWhatsappMessage, formatDisplayDate, formatTime } from '../utils';
import { getTodayDate } from '../utils';

// Timer Component local to Viagens
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
                setTimeLeft(`${m}m ${s}s restantes`);
            }
        };
        tick(); 
        const int = setInterval(tick, 1000); 
        return () => clearInterval(int);
    }, [date, time]);

    return <span>{timeLeft}</span>;
};

export default function Viagens({ data, theme, searchTerm, setSearchTerm, setModal, setFormData, openEditTrip, updateTripStatus, del, duplicateTrip, notify, systemContext, pranchetaValue }: any) {
    const [historyDate, setHistoryDate] = useState(new Date());
    const [expandedDays, setExpandedDays] = useState<any>({});

    const activeTrips = useMemo(() => {
        let list = data.trips.filter((t:any) => t.status === 'Em andamento' || t.status === 'Ativo' || t.status === 'Aguardando');
        if (searchTerm) {
            const lower = searchTerm.toLowerCase().trim();
            list = list.filter((t:any) => String(t.id).includes(lower) || (t.driverName && t.driverName.toLowerCase().includes(lower)));
        }
        return list.sort((a:any,b:any) => parseInt(b.id) - parseInt(a.id));
    }, [data.trips, searchTerm]);

    const historyTrips = useMemo(() => {
        let list = data.trips.filter((t:any) => t.status !== 'Em andamento' && t.status !== 'Ativo' && t.status !== 'Aguardando');
        if (searchTerm) {
            const lower = searchTerm.toLowerCase().trim();
            list = list.filter((t:any) => String(t.id).includes(lower) || (t.driverName && t.driverName.toLowerCase().includes(lower)));
        }
        return list.sort((a:any,b:any) => parseInt(b.id) - parseInt(a.id));
    }, [data.trips, searchTerm]);

    const historyGroups = useMemo(() => {
        const targetMonth = historyDate.getMonth();
        const targetYear = historyDate.getFullYear();
        
        const filtered = historyTrips.filter((t:any) => {
            if (searchTerm) return true;
            if(!t.date) return false;
            const [y, m, d] = t.date.split('-').map(Number);
            return (m - 1) === targetMonth && y === targetYear;
        });

        const groups: any = {};
        filtered.forEach((t:any) => {
            if(!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });

        const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
        
        return sortedDates.map(date => ({
            date,
            trips: groups[date].sort((a:any, b:any) => (b.time || '').localeCompare(a.time || ''))
        }));
    }, [historyTrips, historyDate, searchTerm]);

    const copyToClip = (txt: string) => {
        navigator.clipboard.writeText(txt);
        notify('Lista copiada!', 'success');
    };

    const sendWhatsapp = (trip: any) => {
        const d = data.drivers.find((x:any) => x.id === trip.driverId); 
        let p = [];
        if (trip.passengersSnapshot) {
            p = trip.passengersSnapshot;
        } else {
            p = data.passengers.filter((x:any) => (trip.passengerIds||[]).includes(x.realId || x.id));
        }
        
        if (!d) return notify('Motorista não encontrado.', 'error');
        
        const phones = d.phones || (d.phone ? [{name: d.name, phone: d.phone}] : []);
        
        if (phones.length === 0) return notify('Motorista sem telefone.', 'error');
        
        if (phones.length === 1) {
            const msg = encodeURIComponent(generateWhatsappMessage(trip.id, p, d.name, trip.time, trip.date));
            window.open(`https://wa.me/55${phones[0].phone.replace(/\D/g,'')}?text=${msg}`, '_blank');
        } else {
            setFormData({
                phones: phones,
                onSelect: (phone: string) => {
                    const msg = encodeURIComponent(generateWhatsappMessage(trip.id, p, d.name, trip.time, trip.date));
                    window.open(`https://wa.me/55${phone.replace(/\D/g,'')}?text=${msg}`, '_blank');
                }
            });
            setModal('phoneSelection');
        }
    };

    const generateMonthSummary = () => {
        const targetMonth = historyDate.getMonth();
        const targetYear = historyDate.getFullYear();
        
        const monthTrips = data.trips.filter((t:any) => {
            if(!t.date) return false;
            const [y, m, d] = t.date.split('-').map(Number);
            return (m - 1) === targetMonth && y === targetYear;
        });

        const totalTrips = monthTrips.length;
        const cancelledTrips = monthTrips.filter((t:any) => t.status === 'Cancelada').length;
        
        const validTrips = monthTrips.filter((t:any) => t.status !== 'Cancelada');
        const totalPass = validTrips.reduce((acc:number, t:any) => {
            let pCount = 0;
            if (t.pCountSnapshot !== undefined && t.pCountSnapshot !== null) {
                pCount = parseInt(t.pCountSnapshot);
            } else {
                pCount = data.passengers.filter((p:any) => (t.passengerIds || []).includes(p.realId || p.id))
                                          .reduce((a:number, b:any) => a + parseInt(b.passengerCount || 1), 0);
            }
            return acc + pCount;
        }, 0);

        const monthName = historyDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
        
        const summary = `📊 RESUMO DE ${monthName.toUpperCase()}\n\n` +
                        `🚐 Total de Viagens: ${totalTrips}\n` +
                        `👥 Total de Passageiros: ${totalPass}\n` +
                        `🚫 Canceladas: ${cancelledTrips}`;
        
        const blob = new Blob([summary], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Resumo_${monthName.replace(/ /g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const toggleHistoryDay = (date: string) => {
        setExpandedDays((prev:any) => ({...prev, [date]: !prev[date]}));
    };
    const prevHistoryMonth = () => setHistoryDate(new Date(historyDate.getFullYear(), historyDate.getMonth() - 1, 1));
    const nextHistoryMonth = () => setHistoryDate(new Date(historyDate.getFullYear(), historyDate.getMonth() + 1, 1));

    return (
        <div className="space-y-6">
            <PageHeader title="Viagens" subtitle="Gerencie suas viagens e histórico" />
            <div className="space-y-4">
                <h3 className="text-sm font-bold opacity-70 uppercase tracking-widest pl-1">Hoje / Em Andamento</h3>
                {activeTrips.slice().reverse().map((t:any, i:number) => {
                    let pCount = 0;
                    if (t.pCountSnapshot !== undefined && t.pCountSnapshot !== null) pCount = parseInt(t.pCountSnapshot);
                    else if (t.isMadrugada) pCount = parseInt(t.pCount || 0);
                    else if (t.passengersSnapshot) pCount = t.passengersSnapshot.reduce((acc:any, p:any) => acc + parseInt(p.passengerCount || 1), 0);
                    else {
                        const pListRaw = data.passengers.filter((p:any)=>(t.passengerIds||[]).includes(p.realId || p.id));
                        const pListMap = new Map();
                        pListRaw.forEach((p:any) => {
                            const pId = p.realId || p.id;
                            if (!pListMap.has(pId)) pListMap.set(pId, p);
                        });
                        pCount = Array.from(pListMap.values()).reduce((a:any,b:any)=>a+parseInt(b.passengerCount||1),0);
                    }
                    
                    // Preço por passageiro: usa o da viagem se existir (snapshot), senão usa o valor legado ou o atual da configuração
                    const unitPrice = Number(t.pricePerPassenger) || Number(t.ticketPrice) || (data.pricePerPassenger || 4);
                    let totalValue = pCount * unitPrice;

                    // Recupera passageiros (snapshot ou live)
                    let tripPassengers = [];
                    if (t.passengersSnapshot) tripPassengers = t.passengersSnapshot;
                    else {
                        const pListRaw = data.passengers.filter((p:any)=>(t.passengerIds||[]).includes(p.realId || p.id));
                        const pListMap = new Map();
                        pListRaw.forEach((p:any) => {
                            const pId = p.realId || p.id;
                            if (!pListMap.has(pId)) pListMap.set(pId, p);
                        });
                        tripPassengers = Array.from(pListMap.values());
                    }

                    // ATUALIZADO: Borda mais grossa e explícita para Madrugada
                    const borderClass = t.isMadrugada 
                        ? 'border-2 border-dashed border-indigo-500 bg-indigo-500/10' 
                        : (t.isTemp ? 'border-dashed border-yellow-500/50' : `${theme.border}`);

                    return (
                        <div key={`${t.id}_${i}`} style={{animationDelay: `${i * 100}ms`}} className={`${theme.card} ${theme.radius} border ${borderClass} p-5 relative overflow-hidden shadow-lg stagger-in`}>
                            {t.dayType && (
                                <div className="absolute top-0 left-0">
                                    <div className={`${t.dayType === 'odd' ? 'bg-blue-600' : 'bg-purple-600'} text-white text-[10px] px-2 py-0.5 font-bold uppercase rounded-br-lg`}>
                                        {t.dayType === 'odd' ? 'Dia Ímpar' : 'Dia Par'}
                                    </div>
                                </div>
                            )}
                            {t.isMadrugada && <div className="absolute top-0 right-0"><div className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 font-bold uppercase rounded-bl-lg">Madrugada</div></div>}
                            {t.isTemp && !t.isMadrugada && (
                                <div className="absolute top-0 right-0 flex">
                                    <div className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 font-bold uppercase rounded-bl-lg flex items-center gap-1">
                                        <span>Temporária (Auto)</span>
                                        {systemContext !== 'Mip' && (
                                            <>
                                                <span className="w-[1px] h-3 bg-yellow-500/30 mx-1"></span>
                                                <button onClick={(e) => { e.stopPropagation(); openEditTrip(t); }} className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer" title="Clique para editar o horário"> <Icons.Clock size={10}/> <TempTripTimer date={t.date} time={t.time} /> </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4 gap-3">
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold text-lg truncate">Viagem #{t.id.replace('mad_','')}</h3>
                                    <div className={`${theme.accent} font-bold text-sm mt-1`}>{calculateTimeSlot(t.time, systemContext === 'Mip' ? 30 : 45)}</div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <IconButton theme={theme} onClick={()=>openEditTrip(t)} icon={Icons.Edit} variant="default" />
                                    <IconButton theme={theme} onClick={()=>del('trips', t.id)} icon={Icons.Trash} variant="danger" />
                                </div>
                            </div>
                            <div className={`bg-black/20 p-3 rounded-lg mb-4 flex justify-between items-center border ${theme.border}`}>
                                <div className="flex items-center gap-2 text-sm opacity-80"><Icons.Car size={16}/> {t.driverName}</div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm font-bold"><Icons.Users size={16}/> {pCount}</div>
                                    <div className="flex items-center gap-1 text-sm font-bold text-green-400"><Icons.Dollar size={16}/> {totalValue.toFixed(2)}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <Button theme={theme} onClick={()=>updateTripStatus(t.id, 'Finalizada')} variant="success" size="sm" icon={Icons.Check}>Finalizar</Button>
                                <Button theme={theme} disabled={true} className="opacity-50" variant="secondary" size="sm">Andamento</Button>
                                <Button theme={theme} onClick={()=>updateTripStatus(t.id, 'Cancelada')} variant="danger" size="sm" icon={Icons.X}>Cancelar</Button>
                            </div>
                            
                            <div className="flex gap-2">
                                <button onClick={()=>copyToClip(generateTripListText(tripPassengers, t.driverName, t.time))} className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"><Icons.Copy size={18}/> Copiar Lista</button>
                                <button onClick={()=>sendWhatsapp(t)} className="flex-[2] bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"><Icons.Send size={18}/> WhatsApp</button>
                            </div>
                            
                            {!t.isMadrugada && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <button onClick={()=>duplicateTrip(t)} className="w-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"><Icons.Repeat size={16}/> Duplicar para Hoje</button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div className="space-y-4 pt-6 border-t border-white/10">
                <div id="history-section" className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold opacity-50 uppercase tracking-widest pl-1">Histórico</h3>
                        <button onClick={generateMonthSummary} className="bg-white/5 hover:bg-white/10 p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 text-blue-400" title="Gerar Resumo do Mês"><Icons.List size={14}/> Resumo</button>
                    </div>
                    <div className="flex items-center gap-3 bg-black/20 p-1 rounded-lg"><button onClick={prevHistoryMonth} className="p-1 hover:bg-white/10 rounded"><Icons.ChevronLeft size={18}/></button><span className="text-sm font-bold capitalize">{historyDate.toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</span><button onClick={nextHistoryMonth} className="p-1 hover:bg-white/10 rounded"><Icons.ChevronRight size={18}/></button></div>
                </div>

                {historyGroups.length > 0 ? (
                    <div className="space-y-3">
                        {historyGroups.map((group:any) => {
                            const isExpanded = expandedDays[group.date];
                            const dateParts = group.date.split('-');
                            const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                            const dayName = dateObj.toLocaleDateString('pt-BR', {weekday: 'long'});

                            return (
                                <div key={group.date} className={`${theme.card} rounded-xl border border-white/5 overflow-hidden`}>
                                    <div onClick={() => toggleHistoryDay(group.date)} className="p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3"><div className={`text-xs p-1 rounded-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}><Icons.ChevronDown/></div><div><div className="font-bold text-base">{formatDisplayDate(group.date)}</div><div className="text-xs opacity-50 capitalize">{dayName}</div></div></div>
                                        <div className="text-xs font-bold bg-white/10 px-2 py-1 rounded">{group.trips.length} viagens</div>
                                    </div>
                                    {isExpanded && (
                                        <div className="bg-black/20 border-t border-white/5 p-3 space-y-2 anim-fade">
                                            {group.trips.map((t:any, i:number) => {
                                                let pCount = 0;
                                                if (t.pCountSnapshot !== undefined && t.pCountSnapshot !== null) {
                                                    pCount = parseInt(t.pCountSnapshot);
                                                } else if (t.passengersSnapshot) {
                                                    pCount = t.passengersSnapshot.reduce((acc:any, p:any) => acc + parseInt(p.passengerCount || 1), 0);
                                                } else {
                                                    pCount = data.passengers.filter((p:any) => (t.passengerIds || []).includes(p.realId || p.id))
                                                                                .reduce((a:any, b:any) => a + parseInt(b.passengerCount || 1), 0);
                                                }

                                                return (
                                                    <div key={`${t.id}_${i}`} className="bg-white/5 p-3 rounded-lg flex flex-wrap sm:flex-nowrap justify-between items-center gap-3 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                <div className={`w-1 h-8 rounded-full flex-shrink-0 ${t.status === 'Finalizada' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                                <div className="min-w-0">
                                                                <div className="font-bold text-sm truncate">{formatTime(t.time)} - {t.driverName}</div>
                                                                <div className="text-xs opacity-50 flex flex-wrap gap-x-2 gap-y-0.5">
                                                                    <span>#{t.id}</span>
                                                                    <span>•</span>
                                                                    <span>{t.status}</span>
                                                                    <span>•</span>
                                                                    <span>{pCount} pass</span>
                                                                    <span>•</span>
                                                                    <span className="text-green-400 font-bold">R$ {(pCount * (Number(t.pricePerPassenger) || Number(t.ticketPrice) || (data.pricePerPassenger || 4))).toFixed(2)}</span>
                                                                </div>
                                                                </div>
                                                        </div>
                                                        <div className="flex gap-2 flex-shrink-0 ml-auto sm:ml-0">
                                                            <button onClick={()=>updateTripStatus(t.id, 'Em andamento')} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20" title="Reabrir"><Icons.Back size={16}/></button>
                                                            <button onClick={()=>openEditTrip(t)} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20" title="Ver/Editar"><Icons.Edit size={16}/></button>
                                                            <button onClick={()=>del('trips', t.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20" title="Excluir Permanentemente"><Icons.Trash size={16}/></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState title="Nenhuma viagem" subtitle="Nenhuma viagem no histórico deste mês." />
                )}
            </div>
        </div>
    );
}
