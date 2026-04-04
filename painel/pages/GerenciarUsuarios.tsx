
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons, Button, Input, IconButton, Toast } from '../components/Shared';
import { getAvatarUrl, generateUniqueId } from '../utils';
import { db } from '../firebase';

export default function GerenciarUsuarios({ data, theme, setView, dbOp, notify, user: currentUser, requestConfirm, systemContext }: any) {
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [isEditing, setIsEditing] = useState<string|null>(null);
    const [formUser, setFormUser] = useState<any>({ username: '', email: '', pass: '', role: 'operador', systems: [systemContext || 'Pg'] });
    const [showPassword, setShowPassword] = useState(false);
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [subsData, setSubsData] = useState<any>({});
    const [showEmailConfirm, setShowEmailConfirm] = useState(false);
    const [showTokenModal, setShowTokenModal] = useState(false);
    const [token, setToken] = useState('');
    const [isSendingToken, setIsSendingToken] = useState(false);
    const roleMenuRef = useRef<HTMLDivElement>(null);

    // Close role menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
                setShowRoleMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtra para não mostrar o Breno e filtra pelo sistema atual (se não for o Breno logado)
    const userList = (data.users || []).filter((u:any) => 
        u.username !== 'Breno' && 
        (currentUser.username === 'Breno' || (u.systems && u.systems.includes(systemContext)) || u.system === systemContext)
    );

    const currentUserSystems = currentUser.username === 'Breno' ? ['Pg', 'Mip', 'Sv'] : (currentUser.systems || [currentUser.system || 'Pg']);
    const canManageSystems = currentUser.username === 'Breno' || !isEditing || formUser.createdBy === currentUser.username;

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

    const handleSaveInitial = () => {
        if (!formUser.username || !formUser.pass || !formUser.email || !formUser.systems || formUser.systems.length === 0) {
            return notify("Preencha todos os campos obrigatórios (Usuário, E-mail, Senha e pelo menos um Sistema).", "error");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formUser.email)) {
            return notify("Por favor, insira um e-mail válido.", "error");
        }

        if (formUser.username.toLowerCase() === 'breno') {
            setFormUser({ username: '', email: '', pass: '', role: 'operador', systems: [systemContext || 'Pg'] });
            setIsEditing(null);
            setViewMode('list');
            return;
        }
        
        // Check for duplicates
        const exists = (data.users || []).find((u:any) => 
            u.username.toLowerCase() === formUser.username.toLowerCase() && 
            u.id !== formUser.id
        );
        if (exists) return notify(`O usuário ${formUser.username} já existe.`, "error");

        // Security check: user can only allocate systems they have access to
        if (currentUser.username !== 'Breno') {
            const invalidSystems = formUser.systems.filter((sys: string) => !currentUserSystems.includes(sys));
            if (invalidSystems.length > 0) {
                return notify(`Você não tem permissão para alocar os sistemas: ${invalidSystems.join(', ')}`, "error");
            }
            
            // Security check: only creator can edit
            if (isEditing && formUser.createdBy !== currentUser.username) {
                return notify("Você não tem permissão para editar este usuário.", "error");
            }
        }

        if (!isEditing) {
            setShowEmailConfirm(true);
        } else {
            handleSaveFinal();
        }
    };

    const handleSendToken = async () => {
        setIsSendingToken(true);
        try {
            const response = await fetch('/api/send-login-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formUser.email, name: formUser.username, type: 'new_user' })
            });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro ao enviar token');
                
                setShowEmailConfirm(false);
                setShowTokenModal(true);
                notify('Código enviado para o e-mail.', 'success');
            } else {
                const text = await response.text();
                console.error("Non-JSON response:", text);
                throw new Error('O servidor retornou uma resposta inválida (não JSON). Verifique se o backend está rodando corretamente.');
            }
        } catch (error: any) {
            notify(error.message, 'error');
        }
        setIsSendingToken(false);
    };

    const handleVerifyTokenAndSave = async () => {
        if (!token) return notify('Preencha o código', 'error');
        setIsSendingToken(true);
        try {
            const response = await fetch('/api/verify-login-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formUser.email, token })
            });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Token inválido');
                
                setShowTokenModal(false);
                setToken('');
                handleSaveFinal();
            } else {
                const text = await response.text();
                console.error("Non-JSON response:", text);
                throw new Error('O servidor retornou uma resposta inválida (não JSON). Verifique se o backend está rodando corretamente.');
            }
        } catch (error: any) {
            notify(error.message, 'error');
        }
        setIsSendingToken(false);
    };

    const handleSaveFinal = () => {
        setShowEmailConfirm(false);
        const userToSave = { ...formUser };
        
        if (!isEditing) {
            userToSave.createdBy = currentUser.username;
        }

        // We don't need the single 'system' field anymore, we use 'systems'
        // But for backward compatibility with existing logic that might expect 'system', we can set it to the first one
        if (userToSave.systems && userToSave.systems.length > 0) {
            userToSave.system = userToSave.systems[0];
        }

        dbOp(isEditing ? 'update' : 'create', 'users', userToSave);

        setFormUser({ username: '', email: '', pass: '', role: 'operador', systems: [systemContext || 'Pg'] });
        setIsEditing(null);
        setViewMode('list');
        notify(isEditing ? "Usuário atualizado!" : "Usuário criado!", isEditing ? "update" : "success");
    };

    const handleEdit = (u: any) => {
        const systems = u.systems || (u.system ? [u.system] : ['Pg']);
        setFormUser({ ...u, systems });
        setIsEditing(u.id);
        setViewMode('form');
    };

    const handleAddNew = () => {
        setFormUser({ username: '', email: '', pass: '', role: 'operador', systems: [systemContext || 'Pg'] });
        setIsEditing(null);
        setViewMode('form');
    };

    const handleDelete = (id: string, name: string) => {
        requestConfirm(
            'Excluir Usuário?', 
            `Tem certeza que deseja excluir o usuário ${name}?`, 
            () => dbOp('delete', 'users', id)
        );
    };

    const handleCancel = () => {
        setFormUser({ username: '', email: '', pass: '', role: 'operador', systems: [systemContext || 'Pg'] });
        setIsEditing(null);
        setViewMode('list');
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20 px-4 md:px-0">
            {/* Header Principal */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => viewMode === 'form' ? setViewMode('list') : setView('settings')} 
                        className="p-2.5 hover:bg-white/10 rounded-2xl transition-all active:scale-95 bg-white/5 border border-white/10"
                    >
                        <Icons.Back size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">
                            {viewMode === 'list' ? 'Gestão de Acessos' : (isEditing ? 'Personalizar Usuário' : 'Novo Cadastro')}
                        </h2>
                        <p className="opacity-50 text-xs font-bold uppercase tracking-widest">
                            {viewMode === 'list' ? `Usuários do Sistema ${systemContext}` : 'Configurações de Perfil e Permissões'}
                        </p>
                    </div>
                </div>

                {viewMode === 'list' && (
                    <Button 
                        theme={theme} 
                        onClick={handleAddNew} 
                        variant="success" 
                        className="shadow-lg shadow-green-500/20"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Plus size={18} />
                            <span className="hidden md:inline">Novo Usuário</span>
                        </div>
                    </Button>
                )}
            </div>

            {viewMode === 'list' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 gap-4">
                        {userList.length > 0 ? userList.map((u:any) => (
                            <div 
                                key={u.id} 
                                className={`${theme.card} p-5 rounded-3xl border ${theme.border} flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-white/30 transition-all hover:shadow-xl hover:shadow-black/20`}
                            >
                                <div className="flex items-center gap-5">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden border-2 border-white/10 shadow-inner">
                                            <img src={getAvatarUrl(u.username)} alt={u.username} className="w-full h-full object-cover"/>
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${u.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-xl leading-none mb-1 truncate">{u.username}</h4>
                                        <p className="text-xs opacity-40 font-medium mb-2 truncate">{u.email || 'Sem e-mail cadastrado'}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-lg border ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                                {u.role === 'admin' ? 'Coordenação' : u.role}
                                            </span>
                                            {(u.systems || [u.system || 'Pg']).map((sys: string) => (
                                                <span key={sys} className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-lg border bg-white/5 text-white/50 border-white/10`}>
                                                    {sys}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0">
                                    <div className="hidden lg:flex flex-col items-end mr-4">
                                        <span className="text-[10px] opacity-30 font-bold uppercase tracking-tighter">Acesso</span>
                                        <span className="text-xs font-mono opacity-60">{u.pass.substring(0,2)}••••••</span>
                                    </div>

                                    {currentUser.username === 'Breno' && (
                                        <button 
                                            onClick={() => toggleSystemBlock(u.username)}
                                            className={`p-3 rounded-2xl border transition-all active:scale-90 ${subsData[u.username]?.isBlockedByAdmin ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20' : 'bg-white/5 text-green-400 border-white/10 hover:bg-green-500/10 hover:border-green-500/20'}`}
                                            title={subsData[u.username]?.isBlockedByAdmin ? "Desbloquear Sistema" : "Bloquear Sistema"}
                                        >
                                            {subsData[u.username]?.isBlockedByAdmin ? <Icons.Lock size={18}/> : <Icons.Unlock size={18}/>}
                                        </button>
                                    )}
                                    
                                    {(currentUser.username === 'Breno' || u.createdBy === currentUser.username) && (
                                        <>
                                            <button 
                                                onClick={() => handleEdit(u)}
                                                className="p-3 bg-white/5 border border-white/10 rounded-2xl text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all active:scale-90"
                                            >
                                                <Icons.Edit size={18} />
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleDelete(u.id, u.username)}
                                                className="p-3 bg-white/5 border border-white/10 rounded-2xl text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-90"
                                            >
                                                <Icons.Trash size={18} />
                                            </button>
                                        </>
                                    )}
                                    {currentUser.username !== 'Breno' && u.createdBy !== currentUser.username && (
                                        <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] opacity-40 font-bold uppercase">
                                            Criado por: {u.createdBy === 'Breno' ? 'Sistema' : (u.createdBy || 'Sistema')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-20 opacity-30 border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center gap-4">
                                <Icons.Users size={48} />
                                <p className="font-bold">Nenhum usuário encontrado para o sistema {systemContext}.</p>
                                <Button theme={theme} onClick={handleAddNew} variant="secondary" size="sm">Começar Agora</Button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                    <div className={`${theme.card} p-8 rounded-[40px] border ${theme.border} shadow-2xl shadow-black/40 relative overflow-hidden`}>
                        {/* Background Decor */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row gap-10">
                                {/* Left Side: Avatar Preview */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-32 h-32 rounded-[32px] bg-gradient-to-br from-slate-700 to-slate-900 p-1 shadow-2xl">
                                        <div className="w-full h-full rounded-[28px] overflow-hidden border-2 border-white/10">
                                            <img 
                                                src={getAvatarUrl(formUser.username || 'default')} 
                                                alt="Preview" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Avatar Automático</p>
                                </div>

                                {/* Right Side: Form */}
                                <div className="flex-1 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Input 
                                            theme={theme} 
                                            label="Nome de Usuário" 
                                            value={formUser.username} 
                                            onChange={(e:any) => setFormUser({...formUser, username: e.target.value})}
                                            placeholder="Ex: joaosilva"
                                            className="!rounded-2xl"
                                        />
                                        
                                        <Input 
                                            theme={theme} 
                                            label="E-mail (Obrigatório)" 
                                            type="email"
                                            value={formUser.email} 
                                            onChange={(e:any) => setFormUser({...formUser, email: e.target.value})}
                                            placeholder="joao@exemplo.com"
                                            className="!rounded-2xl"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="relative">
                                            <Input 
                                                theme={theme} 
                                                label="Senha de Acesso" 
                                                type={showPassword ? "text" : "password"} 
                                                value={formUser.pass} 
                                                onChange={(e:any) => setFormUser({...formUser, pass: e.target.value})}
                                                placeholder="******"
                                                className="!rounded-2xl"
                                            />
                                            <button 
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-10 text-white/30 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <Icons.CheckCircle size={18}/> : <Icons.Lock size={18}/>}
                                            </button>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-black uppercase tracking-widest opacity-40 ml-1">Nível de Permissão</label>
                                            <div className="relative" ref={roleMenuRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRoleMenu(!showRoleMenu)}
                                                    className={`w-full h-14 px-5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${formUser.role === 'admin' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-blue-500/10 border-blue-500/30 text-blue-300'} hover:bg-white/5`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {formUser.role === 'admin' ? <Icons.Shield size={20} /> : <Icons.Users size={20} />}
                                                        <span className="font-black text-sm uppercase tracking-wider">
                                                            {formUser.role === 'admin' ? 'Coordenação' : 'Operador'}
                                                        </span>
                                                    </div>
                                                    <motion.div
                                                        animate={{ rotate: showRoleMenu ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Icons.ChevronDown size={20} className="opacity-40" />
                                                    </motion.div>
                                                </button>

                                                <AnimatePresence>
                                                    {showRoleMenu && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-2"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => { setFormUser({...formUser, role: 'operador'}); setShowRoleMenu(false); }}
                                                                className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${formUser.role === 'operador' ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-white/5 text-white/60'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formUser.role === 'operador' ? 'bg-blue-500 text-white' : 'bg-white/5'}`}>
                                                                        <Icons.Users size={20} />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <p className="font-black text-sm uppercase tracking-wider">Operador</p>
                                                                        <p className="text-[10px] opacity-50 font-bold">Acesso padrão ao sistema</p>
                                                                    </div>
                                                                </div>
                                                                {formUser.role === 'operador' && <Icons.Check size={18} />}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => { setFormUser({...formUser, role: 'admin'}); setShowRoleMenu(false); }}
                                                                className={`w-full p-4 rounded-2xl flex items-center justify-between mt-1 transition-all ${formUser.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-white/5 text-white/60'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formUser.role === 'admin' ? 'bg-purple-500 text-white' : 'bg-white/5'}`}>
                                                                        <Icons.Shield size={20} />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <p className="font-black text-sm uppercase tracking-wider">Coordenação</p>
                                                                        <p className="text-[10px] opacity-50 font-bold">Acesso total e configurações</p>
                                                                    </div>
                                                                </div>
                                                                {formUser.role === 'admin' && <Icons.Check size={18} />}
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-black uppercase tracking-widest opacity-40 ml-1">Sistemas Alocados</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['Pg', 'Mip', 'Sv'].map(sys => {
                                                const isSelected = formUser.systems?.includes(sys);
                                                const canSelectThisSystem = currentUserSystems.includes(sys);
                                                const isDisabled = !canManageSystems || !canSelectThisSystem;

                                                return (
                                                    <button
                                                        key={sys}
                                                        disabled={isDisabled}
                                                        onClick={() => {
                                                            const currentSystems = formUser.systems || [];
                                                            if (isSelected) {
                                                                // Don't allow removing the last system
                                                                if (currentSystems.length > 1) {
                                                                    setFormUser({...formUser, systems: currentSystems.filter((s:string) => s !== sys)});
                                                                } else {
                                                                    notify("Pelo menos um sistema deve ser selecionado.", "info");
                                                                }
                                                            } else {
                                                                setFormUser({...formUser, systems: [...currentSystems, sys]});
                                                            }
                                                        }}
                                                        className={`py-3 rounded-2xl border font-black text-sm transition-all ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'} ${isDisabled && !isSelected ? 'opacity-20 cursor-not-allowed' : ''} ${!canManageSystems && isSelected ? 'cursor-not-allowed opacity-80' : ''}`}
                                                    >
                                                        <div className="flex items-center justify-center gap-2">
                                                            {isSelected && <Icons.CheckCircle size={14} />}
                                                            {sys}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {!canManageSystems && (
                                            <p className="text-[10px] text-amber-400 font-bold mt-1 italic">
                                                Apenas o criador ({formUser.createdBy}) ou Breno podem alterar os sistemas deste usuário.
                                            </p>
                                        )}
                                        {canManageSystems && currentUser.username !== 'Breno' && (
                                            <p className="text-[10px] opacity-40 font-bold mt-1 italic">Você só pode alocar sistemas que você tem acesso ({currentUserSystems.join(', ')}).</p>
                                        )}
                                    </div>

                                    <div className="flex gap-4 pt-6">
                                        <Button 
                                            theme={theme} 
                                            onClick={handleCancel} 
                                            variant="secondary" 
                                            className="flex-1 !rounded-2xl py-4"
                                        >
                                            Descartar
                                        </Button>
                                        <Button 
                                            theme={theme} 
                                            onClick={handleSaveInitial} 
                                            variant="success" 
                                            className="flex-1 !rounded-2xl py-4 shadow-xl shadow-green-500/20"
                                        >
                                            {isEditing ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EMAIL CONFIRMATION MODAL */}
            <AnimatePresence>
                {showEmailConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500">
                                    <Icons.Mail size={40} />
                                </div>

                                <h3 className="text-2xl font-black text-white mb-3 uppercase italic">Confirmar E-mail</h3>
                                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                    Por favor, verifique se o e-mail abaixo está correto. Um código de validação será enviado para este endereço.
                                </p>

                                <div className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 mb-8">
                                    <p className="text-lg font-mono text-white break-all">{formUser.email}</p>
                                </div>

                                <div className="flex gap-4 w-full">
                                    <Button 
                                        onClick={() => setShowEmailConfirm(false)}
                                        variant="secondary"
                                        className="flex-1 !rounded-xl"
                                    >
                                        Corrigir
                                    </Button>
                                    <Button 
                                        onClick={handleSendToken}
                                        disabled={isSendingToken}
                                        loading={isSendingToken}
                                        variant="primary"
                                        theme={{ primary: 'bg-amber-600 text-white' }}
                                        className="flex-1 !rounded-xl"
                                    >
                                        Confirmar
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOKEN VALIDATION MODAL */}
            <AnimatePresence>
                {showTokenModal && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500">
                                    <Icons.Key size={40} />
                                </div>

                                <h3 className="text-2xl font-black text-white mb-3 uppercase italic">Verificar E-mail</h3>
                                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                    Enviamos um código de 6 dígitos para o e-mail <br/><span className="text-amber-400 font-medium">{formUser.email}</span>
                                </p>

                                <div className="w-full mb-8">
                                    <Input 
                                        theme={{text: 'text-white text-center text-3xl tracking-[0.5em] font-mono', radius: 'rounded-xl', border: 'border-white/10'}} 
                                        value={token} 
                                        onChange={(e:any) => setToken(e.target.value)} 
                                        placeholder="000000"
                                        maxLength={6}
                                    />
                                </div>

                                <div className="flex gap-4 w-full">
                                    <Button 
                                        onClick={() => { setShowTokenModal(false); setToken(''); }}
                                        variant="secondary"
                                        className="flex-1 !rounded-xl"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button 
                                        onClick={handleVerifyTokenAndSave}
                                        disabled={isSendingToken || token.length !== 6}
                                        loading={isSendingToken}
                                        variant="primary"
                                        theme={{ primary: 'bg-amber-600 text-white' }}
                                        className="flex-1 !rounded-xl"
                                    >
                                        Validar
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
