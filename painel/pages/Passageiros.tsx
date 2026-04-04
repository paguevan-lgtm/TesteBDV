
import React, { useState } from 'react';
import { Icons, Button, IconButton } from '../components/Shared';
import { formatDisplayDate, getTodayDate, formatTime } from '../utils';

export default function Passageiros({ data, theme, searchTerm, setFormData, setModal, del, notify, systemContext, dbOp }: any) {
    const [expandedPass, setExpandedPass] = useState<string|null>(null);
    const [activeTab, setActiveTab] = useState<'ativos' | 'bloqueados'>('ativos');

    const filteredList = data.passengers.filter((item:any) => {
        const isBlocked = item.status === 'Bloqueado';
        if (activeTab === 'ativos' && isBlocked) return false;
        if (activeTab === 'bloqueados' && !isBlocked) return false;

        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase().trim();
        return (item.name && item.name.toLowerCase().includes(lower)) || (item.neighborhood && item.neighborhood.toLowerCase().includes(lower)) || (item.phone && item.phone.includes(lower)) || (String(item.id).toLowerCase().includes(lower));
    });

    const copyPassengerData = (p: any) => {
        const txt = `*PASSAGEIRO*\n• Nome: ${p.name}\n• Tel: ${p.phone}\n• End: ${p.address}\n• Ref: ${p.reference||''}\n• Bairro: ${p.neighborhood}\n• Pagamento: ${p.payment}\n• Data: ${formatDisplayDate(p.date)} - ${formatTime(p.time)}\n• Qtd: ${p.passengerCount} pessoa(s)`;
        navigator.clipboard.writeText(txt);
        notify('Dados copiados para a área de transferência!', 'success');
    };

    const callPhone = (ph: string) => { 
        if(!ph) return notify("Passageiro sem telefone cadastrado.", "error"); 
        window.location.href = `tel:${ph.replace(/\D/g,'')}`; 
    }

    const handleEdit = (e: any, item: any) => {
        e.stopPropagation();
        let timeToUse = item.time;
        
        const now = new Date();
        timeToUse = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        
        setFormData({...item, date: getTodayDate(), time: timeToUse});
        setModal('passenger');
    };

    return (
        <div className="space-y-3">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-black/20 rounded-xl border border-white/10 mb-4">
                <button 
                    onClick={() => setActiveTab('ativos')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'ativos' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                >
                    Ativos
                </button>
                <button 
                    onClick={() => setActiveTab('bloqueados')}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'bloqueados' ? 'bg-red-500/20 text-red-400 shadow-lg border border-red-500/30' : 'text-white/40 hover:text-white/60'}`}
                >
                    Bloqueados
                </button>
            </div>

            {filteredList.map((item:any, i:number) => (
                <div 
                    key={item.id} 
                    style={{animationDelay: `${i * 50}ms`}} 
                    onClick={() => setExpandedPass(expandedPass === item.id ? null : item.id)} 
                    className={`${theme.card} p-4 ${theme.radius} border ${item.status === 'Bloqueado' ? 'border-red-500/30 bg-red-500/5' : theme.border} relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform stagger-in`}
                >
                    <div className="absolute top-1 right-8 text-4xl font-bold opacity-[0.07] pointer-events-none">#{item.id}</div>
                    <div className="absolute top-3 right-3 text-xs opacity-50">{expandedPass === item.id ? <Icons.ChevronUp size={18}/> : <Icons.ChevronDown size={18}/>}</div>
                    <div className="pr-8">
                        <div className="flex flex-wrap gap-2 mb-1">
                            {item.status === 'Bloqueado' && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase border border-red-500/30">BLOQUEADO</span>}
                            {item.tags && item.tags.split(',').map((tag:string, i:number) => (
                                <span key={`${tag}_${i}`} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-bold uppercase">{tag.trim()}</span>
                            ))}
                        </div>
                        <h3 className={`font-bold text-lg ${item.status === 'Bloqueado' ? 'text-red-400' : ''}`}>{item.name}</h3>
                        <p className="text-sm opacity-70">{item.neighborhood}</p>
                    </div>
                    {expandedPass === item.id && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm expand-content anim-fade">
                            {item.status === 'Bloqueado' && item.blockReason && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                                    <span className="block text-[10px] font-bold text-red-400 uppercase mb-1">MOTIVO DO BLOQUEIO</span>
                                    <p className="text-red-200 italic">"{item.blockReason}"</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="block opacity-50 text-xs">TELEFONE</span>{item.phone}</div>
                                <div><span className="block opacity-50 text-xs">PAGAMENTO</span>{item.payment}</div>
                                <div className="col-span-2"><span className="block opacity-50 text-xs">ENDEREÇO</span>{item.address} {item.reference ? `(${item.reference})` : ''}</div>
                                <div><span className="block opacity-50 text-xs">DATA/HORA</span>{formatDisplayDate(item.date)} - {formatTime(item.time)}</div>
                                <div><span className="block opacity-50 text-xs">DETALHES</span>{item.passengerCount} pass | {item.luggageCount || 0} malas</div>
                                <div><span className="block opacity-50 text-xs">STATUS</span><span className={item.status === 'Bloqueado' ? 'text-red-500 font-bold' : item.status === 'Ativo' ? 'text-green-400' : 'text-red-400'}>{item.status}</span></div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-4 mt-2">
                                <Button theme={theme} onClick={(e:any)=>handleEdit(e, item)} variant="secondary" className="flex-1 min-w-[140px] py-2 text-sm" icon={Icons.Edit}>Editar/Agendar</Button>
                                <div className="flex gap-2">
                                    <IconButton theme={theme} variant="default" onClick={(e:any)=>{e.stopPropagation(); copyPassengerData(item)}} icon={Icons.Copy}/>
                                    {item.phone && <IconButton theme={theme} variant="success" onClick={(e:any)=>{e.stopPropagation(); callPhone(item.phone)}} icon={Icons.Phone}/>}
                                    {item.status === 'Bloqueado' ? (
                                        <IconButton theme={theme} variant="success" onClick={(e:any)=>{e.stopPropagation(); dbOp('update', 'passengers', { id: item.id, status: 'Ativo', blockReason: null }); notify('Passageiro desbloqueado!', 'success')}} icon={Icons.Check} title="Desbloquear"/>
                                    ) : (
                                        <IconButton theme={theme} variant="danger" onClick={(e:any)=>{e.stopPropagation(); setFormData(item); setModal('blockPassenger')}} icon={Icons.Slash} title="Bloquear"/>
                                    )}
                                    <IconButton theme={theme} variant="danger" onClick={(e:any)=>{e.stopPropagation(); del('passengers', item.id)}} icon={Icons.Trash}/>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {!filteredList.length && <div className="text-center opacity-50 py-10">Nenhum passageiro {activeTab === 'bloqueados' ? 'bloqueado' : ''}.</div>}
        </div>
    );
}
