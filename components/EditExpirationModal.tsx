import React, { useState, useEffect } from 'react';
import { Icons, Button } from './Shared';

interface EditExpirationModalProps {
    isOpen: boolean;
    onClose: () => void;
    system: string;
    currentExpiration: string | null;
    onSave: (date: Date) => void;
    theme: any;
}

export const EditExpirationModal: React.FC<EditExpirationModalProps> = ({ 
    isOpen, 
    onClose, 
    system, 
    currentExpiration, 
    onSave,
    theme 
}) => {
    const [mode, setMode] = useState<'add' | 'date' | 'remaining'>('add');
    const [daysToAdd, setDaysToAdd] = useState(30);
    const [remainingDays, setRemainingDays] = useState(30);
    const [selectedDate, setSelectedDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setDaysToAdd(30);
            
            // Calculate current remaining days
            if (currentExpiration) {
                const exp = new Date(currentExpiration);
                const now = new Date();
                const diff = exp.getTime() - now.getTime();
                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                setRemainingDays(days > 0 ? days : 30);
            } else {
                setRemainingDays(30);
            }
            
            // Set initial date for date picker
            if (currentExpiration) {
                const date = new Date(currentExpiration);
                if (!isNaN(date.getTime())) {
                    setSelectedDate(date.toISOString().split('T')[0]);
                } else {
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                }
            } else {
                setSelectedDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [isOpen, currentExpiration]);

    if (!isOpen) return null;

    const handleSave = () => {
        let newDate: Date;

        if (mode === 'add') {
            const now = new Date();
            let baseDate = now;
            
            // If current expiration is in the future, add to it
            if (currentExpiration) {
                const currentExp = new Date(currentExpiration);
                if (currentExp > now) {
                    baseDate = currentExp;
                }
            }
            
            newDate = new Date(baseDate);
            newDate.setDate(baseDate.getDate() + Number(daysToAdd));
            // Preserve original time (do not set to end of day)
        } else if (mode === 'remaining') {
            const now = new Date();
            newDate = new Date(now);
            newDate.setDate(now.getDate() + Number(remainingDays));
            // For "Remaining Days", maybe we want to set it from NOW, so preserving time is implicit (now + X days)
        } else {
            if (!selectedDate) return;
            const [y, m, d] = selectedDate.split('-').map(Number);
            // For specific date picker, end of day is reasonable
            newDate = new Date(y, m - 1, d, 23, 59, 59, 999);
        }

        onSave(newDate);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`${theme.card} w-full max-w-md rounded-2xl border ${theme.border} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
                <div className={`p-6 border-b ${theme.divider} flex justify-between items-center`}>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${theme.text}`}>
                        <Icons.Calendar className={theme.accent} />
                        Editar Vencimento: {system}
                    </h3>
                    <button onClick={onClose} className={`${theme.text} opacity-50 hover:opacity-100 transition-colors`}>
                        <Icons.X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className={`flex ${theme.inner} p-1 rounded-lg`}>
                        <button 
                            onClick={() => setMode('add')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${mode === 'add' ? `${theme.primary} text-white shadow-lg` : `${theme.text} opacity-50 hover:opacity-100 hover:${theme.inner} hover:bg-opacity-50`}`}
                        >
                            + Dias
                        </button>
                        <button 
                            onClick={() => setMode('remaining')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${mode === 'remaining' ? `${theme.primary} text-white shadow-lg` : `${theme.text} opacity-50 hover:opacity-100 hover:${theme.inner} hover:bg-opacity-50`}`}
                        >
                            Restantes
                        </button>
                        <button 
                            onClick={() => setMode('date')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${mode === 'date' ? `${theme.primary} text-white shadow-lg` : `${theme.text} opacity-50 hover:opacity-100 hover:${theme.inner} hover:bg-opacity-50`}`}
                        >
                            Data
                        </button>
                    </div>

                    {mode === 'add' && (
                        <div className="space-y-4">
                            <label className={`block text-sm font-medium ${theme.text} opacity-70`}>Dias a adicionar</label>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setDaysToAdd(prev => prev - 1)} className={`p-2 ${theme.inner} rounded-lg hover:bg-opacity-80`}><Icons.Minus size={20}/></button>
                                <input 
                                    type="number" 
                                    value={daysToAdd} 
                                    onChange={(e) => setDaysToAdd(Number(e.target.value))}
                                    className={`flex-1 ${theme.inner} border ${theme.divider} rounded-xl px-4 py-3 text-center font-bold text-xl outline-none focus:border-opacity-50`}
                                />
                                <button onClick={() => setDaysToAdd(prev => prev + 1)} className={`p-2 ${theme.inner} rounded-lg hover:bg-opacity-80`}><Icons.Plus size={20}/></button>
                            </div>
                            <div className="flex justify-center gap-2 flex-wrap">
                                {[-30, -7, 7, 30].map(d => (
                                    <button 
                                        key={d}
                                        onClick={() => setDaysToAdd(d)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold border ${daysToAdd === d ? `${theme.accent} bg-opacity-20 border-current` : `${theme.inner} border-transparent ${theme.text} opacity-50 hover:opacity-100 hover:bg-opacity-80`}`}
                                    >
                                        {d > 0 ? '+' : ''}{d}d
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === 'remaining' && (
                        <div className="space-y-4">
                            <label className={`block text-sm font-medium ${theme.text} opacity-70`}>Dias restantes para expirar</label>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setRemainingDays(prev => Math.max(0, prev - 1))} className={`p-2 ${theme.inner} rounded-lg hover:bg-opacity-80`}><Icons.Minus size={20}/></button>
                                <input 
                                    type="number" 
                                    value={remainingDays} 
                                    onChange={(e) => setRemainingDays(Number(e.target.value))}
                                    className={`flex-1 ${theme.inner} border ${theme.divider} rounded-xl px-4 py-3 text-center font-bold text-xl outline-none focus:border-opacity-50`}
                                />
                                <button onClick={() => setRemainingDays(prev => prev + 1)} className={`p-2 ${theme.inner} rounded-lg hover:bg-opacity-80`}><Icons.Plus size={20}/></button>
                            </div>
                            <div className="flex justify-center gap-2">
                                {[1, 3, 5, 7, 10].map(d => (
                                    <button 
                                        key={d}
                                        onClick={() => setRemainingDays(d)}
                                        className={`px-3 py-1 rounded-lg text-xs font-bold border ${remainingDays === d ? 'bg-amber-500/20 border-amber-500 text-amber-400' : `${theme.inner} border-transparent ${theme.text} opacity-50 hover:opacity-100 hover:bg-opacity-80`}`}
                                    >
                                        {d}d
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {mode === 'date' && (
                        <div className="space-y-4">
                            <label className={`block text-sm font-medium ${theme.text} opacity-70`}>Nova Data de Vencimento</label>
                            <input 
                                type="date" 
                                value={selectedDate} 
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={`w-full ${theme.inner} border ${theme.divider} rounded-xl px-4 py-3 ${theme.text} outline-none focus:border-opacity-50 [color-scheme:dark]`}
                            />
                        </div>
                    )}

                    <div className={`${theme.accent} bg-opacity-10 border border-current border-opacity-20 rounded-xl p-4`}>
                        <div className={`text-xs ${theme.accent} font-medium mb-1`}>Resultado Previsto:</div>
                        <div className={`text-lg font-bold ${theme.text}`}>
                            {(() => {
                                let d = new Date();
                                if (mode === 'add') {
                                    const now = new Date();
                                    let base = now;
                                    if (currentExpiration) {
                                        const curr = new Date(currentExpiration);
                                        if (curr > now) base = curr;
                                    }
                                    d = new Date(base);
                                    d.setDate(base.getDate() + Number(daysToAdd));
                                } else if (mode === 'remaining') {
                                    const now = new Date();
                                    d = new Date(now);
                                    d.setDate(now.getDate() + Number(remainingDays));
                                } else {
                                    if (selectedDate) {
                                        const [y, m, day] = selectedDate.split('-').map(Number);
                                        d = new Date(y, m - 1, day);
                                    }
                                }
                                return d.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            })()}
                        </div>
                    </div>
                </div>

                <div className={`p-6 border-t ${theme.divider} flex gap-3`}>
                    <Button onClick={onClose} theme={theme} variant="secondary" className="flex-1">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} theme={theme} variant="primary" className="flex-1">
                        Salvar Alterações
                    </Button>
                </div>
            </div>
        </div>
    );
};
