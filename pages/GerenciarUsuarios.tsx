
import React, { useState, useEffect } from 'react';
import { Icons, Button, Input, IconButton, Toast } from '../components/Shared';
import { getAvatarUrl, generateUniqueId } from '../utils';
import { db } from '../firebase';

export default function GerenciarUsuarios({ data, theme, setView, dbOp, notify, user: currentUser, requestConfirm }: any) {
    const [isEditing, setIsEditing] = useState<string|null>(null);
    const [formUser, setFormUser] = useState<any>({ username: '', pass: '', role: 'operador', system: 'Pg' });
    const [showPassword, setShowPassword] = useState(false);
    const [subsData, setSubsData] = useState<any>({});

    // Filtra para não mostrar o Breno
    const userList = (data.users || []).filter((u:any) => u.username !== 'Breno');

    // Fetch subscriptions if admin
    useEffect(() => {
        if (currentUser.username !== 'Breno' || !db) return;
        
        const fetchSubs = async () => {
            const snap = await db.ref('user_data').once('value');
            const val = snap.val() || {};
            const subs:any = {};
            Object.keys(val).forEach(key => {
                if (val[key].subscription) {
                    subs[key] = val[key].subscription;
                }
            });
            setSubsData(subs);
        };
        
        fetchSubs();
    }, [currentUser, data.users]);

    const toggleSystemBlock = (username: string) => {
        const currentStatus = subsData[username]?.isBlockedByAdmin;
        const newStatus = !currentStatus;
        
        db.ref(`user_data/${username}/subscription`).update({ isBlockedByAdmin: newStatus });
        
        setSubsData((prev:any) => ({
            ...prev,
            [username]: { ...prev[username], isBlockedByAdmin: newStatus }
        }));
        
        notify(newStatus ? `Sistema bloqueado para ${username}` : `Sistema liberado para ${username}`, newStatus ? "error" : "success");
    };

    const handleSave = () => {
        if (!formUser.username || !formUser.pass) return notify("Preencha usuário e senha.", "error");

        if (formUser.username.toLowerCase() === 'breno') {
            // Fail silently
            setFormUser({ username: '', pass: '', role: 'operador' });
            setIsEditing(null);
            return;
        }
        
        // Verifica duplicidade de nome (apenas na criação ou se mudou o nome)
        const exists = userList.find((u:any) => u.username.toLowerCase() === formUser.username.toLowerCase() && u.id !== formUser.id);
        if (exists) return notify("Este nome de usuário já existe.", "error");

        dbOp(formUser.id ? 'update' : 'create', 'users', formUser);
        setFormUser({ username: '', pass: '', role: 'operador', system: 'Pg' });
        setIsEditing(null);
        notify(formUser.id ? "Usuário atualizado!" : "Usuário criado!", "success");
    };

    const handleEdit = (u: any) => {
        setFormUser({ ...u });
        setIsEditing(u.id);
    };

    const handleDelete = (id: string, name: string) => {
        requestConfirm(
            'Excluir Usuário?', 
            `Tem certeza que deseja excluir o usuário ${name}?`, 
            () => dbOp('delete', 'users', id)
        );
    };

    const handleCancel = () => {
        setFormUser({ username: '', pass: '', role: 'operador', system: 'Pg' });
        setIsEditing(null);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('settings')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <Icons.Back size={24} />
                </button>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
                    <p className="opacity-50 text-sm">Controle de acesso ao sistema</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Form Section */}
                <div className={`md:col-span-1 ${theme.card} p-5 rounded-2xl border ${theme.border} h-fit`}>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        {isEditing ? <Icons.Edit className="text-blue-400"/> : <Icons.Plus className="text-green-400"/>}
                        {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
                    </h3>
                    
                    <div className="space-y-4">
                        <Input 
                            theme={theme} 
                            label="Nome de Usuário" 
                            value={formUser.username} 
                            onChange={(e:any) => setFormUser({...formUser, username: e.target.value})}
                            placeholder="Ex: JoaoSilva"
                        />
                        
                        <div className="relative">
                            <Input 
                                theme={theme} 
                                label="Senha" 
                                type={showPassword ? "text" : "password"} 
                                value={formUser.pass} 
                                onChange={(e:any) => setFormUser({...formUser, pass: e.target.value})}
                                placeholder="******"
                            />
                            <button 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 opacity-50 hover:opacity-100"
                            >
                                {showPassword ? <Icons.CheckCircle size={16}/> : <Icons.Lock size={16}/>}
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold opacity-60 ml-1">Permissão</label>
                            <select 
                                className="bg-black/10 border border-white/10 text-white rounded-xl px-4 py-3.5 h-14 outline-none focus:border-white/50" 
                                value={formUser.role} 
                                onChange={(e:any)=>setFormUser({...formUser, role:e.target.value})}
                            >
                                <option value="operador" className="bg-slate-900">Operador</option>
                                <option value="admin" className="bg-slate-900">Administrador</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold opacity-60 ml-1">Sistema</label>
                            <select 
                                className="bg-black/10 border border-white/10 text-white rounded-xl px-4 py-3.5 h-14 outline-none focus:border-white/50" 
                                value={formUser.system || 'Pg'} 
                                onChange={(e:any)=>setFormUser({...formUser, system:e.target.value})}
                            >
                                <option value="Pg" className="bg-slate-900">Pg</option>
                                <option value="Mip" className="bg-slate-900">Mip</option>
                                <option value="Sv" className="bg-slate-900">Sv</option>
                            </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                            {isEditing && (
                                <Button theme={theme} onClick={handleCancel} variant="secondary" className="flex-1" size="sm">
                                    Cancelar
                                </Button>
                            )}
                            <Button theme={theme} onClick={handleSave} variant={isEditing ? 'primary' : 'success'} className="flex-1" size="sm">
                                {isEditing ? 'Atualizar' : 'Criar'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="md:col-span-2 space-y-3">
                    {userList.length > 0 ? userList.map((u:any) => (
                        <div key={u.id} className={`${theme.card} p-4 rounded-xl border ${theme.border} flex items-center justify-between group hover:border-white/20 transition-colors`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden border border-white/10">
                                    <img src={getAvatarUrl(u.username)} alt={u.username} className="w-full h-full object-cover"/>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{u.username}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                            {u.role}
                                        </span>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-gray-500/20 text-gray-300 border-gray-500/30`}>
                                            {u.system || 'Pg'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {currentUser.username === 'Breno' && (
                                    <button 
                                        onClick={() => toggleSystemBlock(u.username)}
                                        className={`p-2 rounded-lg border transition-colors ${subsData[u.username]?.isBlockedByAdmin ? 'bg-red-500 text-white border-red-600' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}
                                        title={subsData[u.username]?.isBlockedByAdmin ? "Desbloquear Sistema" : "Bloquear Sistema"}
                                    >
                                        {subsData[u.username]?.isBlockedByAdmin ? <Icons.Lock size={18}/> : <Icons.Unlock size={18}/>}
                                    </button>
                                )}
                                <div className="hidden md:block mr-4 text-xs opacity-40 font-mono">
                                    Senha: {u.pass.substring(0,2)}***
                                </div>
                                <IconButton theme={theme} onClick={() => handleEdit(u)} icon={Icons.Edit} variant="secondary" />
                                <IconButton theme={theme} onClick={() => handleDelete(u.id, u.username)} icon={Icons.Trash} variant="danger" />
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-2 text-center py-12 opacity-30 border-2 border-dashed border-white/10 rounded-xl">
                            Nenhum usuário adicional encontrado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
