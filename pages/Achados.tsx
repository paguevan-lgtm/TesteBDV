
import React from 'react';
import { Icons, IconButton } from '../components/Shared';
import { formatDisplayDate } from '../utils';

export default function Achados({ data, theme, searchTerm, dbOp, del, notify }: any) {

    const filteredList = data.lostFound.filter((item:any) => {
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase().trim();
        return (item.description && item.description.toLowerCase().includes(lower));
    });

    return (
        <div className="space-y-4">
            {filteredList.map((item:any, i:number) => ( <div key={item.id} style={{animationDelay: `${i * 50}ms`}} className={`${theme.card} p-4 ${theme.radius} border ${theme.border} relative overflow-hidden stagger-in`}><div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === 'Entregue' ? 'bg-green-500' : 'bg-yellow-500'}`}></div><div className="pl-3"><div className="flex justify-between items-start"><h3 className="font-bold text-lg">{item.description}</h3><span className={`text-xs px-2 py-0.5 rounded-full border ${item.status === 'Entregue' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>{item.status}</span></div><p className="text-sm opacity-70 mt-1">📍 {item.location} • 📅 {formatDisplayDate(item.date)}</p></div><div className="pl-3 flex justify-end gap-2 mt-3 pt-2 border-t border-white/10"><button onClick={() => { const newStatus = item.status === 'Pendente' ? 'Entregue' : 'Pendente'; dbOp('update', 'lostFound', { id: item.id, status: newStatus }); }} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">{item.status === 'Pendente' ? 'Marcar Entregue' : 'Marcar Pendente'}</button><IconButton theme={theme} variant="danger" onClick={()=>del('lostFound', item.id)} icon={Icons.Trash}/></div></div> ))}
        </div>
    );
}
