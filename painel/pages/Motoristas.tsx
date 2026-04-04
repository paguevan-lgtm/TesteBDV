
import React from 'react';
import { Icons, Button, IconButton, PageHeader, EmptyState } from '../components/Shared';
import { getAvatarUrl, formatDisplayDate } from '../utils';

export default function Motoristas({ data, theme, searchTerm, setFormData, setModal, del, notify }: any) {
    
    const filteredList = data.drivers.filter((item:any) => {
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase().trim();
        return (item.name && item.name.toLowerCase().includes(lower)) || (item.phone && item.phone.includes(lower));
    });

    return (
        <div className="space-y-6">
            <PageHeader title="Motoristas" subtitle="Gerencie sua frota de motoristas" />
            <div className="space-y-3">
                {filteredList.map((item:any, i:number) => (
                    <div key={`${item.id}_${i}`} style={{animationDelay: `${i * 50}ms`}} className={`${theme.card} p-4 ${theme.radius} border ${theme.border} relative overflow-hidden flex flex-col gap-4 group stagger-in`}>
                        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider ${item.status === 'Ativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{item.status}</div>
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-full p-1 border-2 ${item.status === 'Ativo' ? 'border-green-500/50' : 'border-red-500/50'} flex-shrink-0`}>
                                <img src={getAvatarUrl(item.name)} alt="Avatar" className="w-full h-full rounded-full bg-slate-700/50"/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg truncate">{item.name}</h3>
                                <div className="flex items-center gap-2 text-sm opacity-60">
                                    <span className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">{item.plate || 'SEM PLACA'}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1"><Icons.Users size={12}/> {item.capacity} lug</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-lg text-xs">
                            <div className="flex flex-col">
                                <span className="opacity-50 text-[10px] uppercase">Telefones</span>
                                {item.phones && item.phones.length > 0 ? (
                                    item.phones.map((p:any, i:number) => (
                                        <span key={i} className="font-mono">{p.name}: {p.phone}</span>
                                    ))
                                ) : (
                                    <span className="font-mono">{item.phone || '-'}</span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="opacity-50 text-[10px] uppercase">CNH Validade</span>
                                <span className={`${item.cnhValidity && new Date(item.cnhValidity) < new Date() ? 'text-red-400 font-bold' : ''}`}>
                                    {item.cnhValidity ? formatDisplayDate(item.cnhValidity) : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary"
                                onClick={() => { const msg = encodeURIComponent(`Olá ${item.name}, tudo bem?`); window.open(`https://wa.me/55${(item.phone||'').replace(/\D/g,'')}?text=${msg}`, '_blank'); }} 
                                className="flex-1 text-green-400 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                            >
                                <Icons.Phone size={14}/> WhatsApp
                            </Button>
                            <Button theme={theme} onClick={()=>{setFormData(item); setModal('driver')}} variant="secondary" className="px-3 py-2 text-xs" icon={Icons.Edit}>Editar</Button>
                            <IconButton theme={theme} variant="danger" onClick={()=>del('drivers', item.id)} icon={Icons.Trash}/>
                        </div>
                    </div>
                ))}
                {!filteredList.length && <EmptyState title="Nenhum motorista" subtitle="Nenhum motorista encontrado." />}
            </div>
        </div>
    );
}
