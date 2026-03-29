
import React, { useState, useEffect, useRef } from 'react';
import { Icons, Input, Button, IconButton } from '../components/Shared';
import { EditExpirationModal } from '../components/EditExpirationModal';
import { THEMES } from '../constants';
import { getAvatarUrl, generateUniqueId, getTodayDate, compressImage, parseUserAgent } from '../utils';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../components/SubscriptionLock';

export default function Configuracoes({ user, theme, restartTour, setAiModal, geminiKey, setGeminiKey, saveApiKey, ipToBlock, setIpToBlock, blockIp, data, del, ipHistory, ipLabels, saveIpLabel, changeTheme, themeKey, dbOp, notify, showAlert, requestConfirm, setView, daysRemaining, isNearExpiration, systemContext, isRecurringActive }: any) {
    const { logout } = useAuth();
    const { triggerEarlyRenewal } = useSubscription();
    
    const isAdmin = user.role === 'admin';
    const isSuperAdmin = user.username === 'Breno';

    // States for Newsletter
    const [newsTitle, setNewsTitle] = useState('');
    const [newsContent, setNewsContent] = useState('');
    const [newsImage, setNewsImage] = useState<string|null>(null);
    const [editExpModal, setEditExpModal] = useState<{isOpen: boolean, system: string, currentExpiration: string | null}>({
        isOpen: false,
        system: '',
        currentExpiration: null
    });
    const [securityTab, setSecurityTab] = useState('timeline'); // timeline | blocked
    const [activeTab, setActiveTab] = useState('geral');
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [trustedDevices, setTrustedDevices] = useState<any>({});
    const importInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<any>({
        isOpen: false,
        isMinimized: false,
        currentCollection: '',
        currentItem: '',
        added: 0,
        skipped: 0,
        total: 0,
        logs: []
    });

    // Fetch Trusted Devices
    useEffect(() => {
        if (!isSuperAdmin) return;
        // @ts-ignore
        import('../firebase').then(({ db }) => {
            if(db) {
                const ref = db.ref('trusted_devices');
                ref.on('value', (snap:any) => {
                    setTrustedDevices(snap.val() || {});
                });
                return () => ref.off();
            }
        });
    }, [isSuperAdmin]);

    const toggleTrustDevice = (deviceId: string, info: any) => {
        if (!deviceId) return;
        const isCurrentlyTrusted = trustedDevices[deviceId];
        const action = isCurrentlyTrusted ? 'Remover Confiança?' : 'Marcar como Seguro?';
        const msg = isCurrentlyTrusted ? 'Este dispositivo voltará a ser exibido como desconhecido.' : 'Este dispositivo será destacado como seguro na timeline.';
        
        requestConfirm(action, msg, () => {
            // @ts-ignore
            import('../firebase').then(({ db }) => {
                if (isCurrentlyTrusted) {
                    db.ref(`trusted_devices/${deviceId}`).remove();
                } else {
                    db.ref(`trusted_devices/${deviceId}`).set({
                        trustedAt: Date.now(),
                        trustedBy: user.username,
                        info: info || {}
                    });
                }
                notify(isCurrentlyTrusted ? "Confiança removida" : "Dispositivo marcado como seguro", "success");
            });
        });
    };

    const handleClearCache = () => {
        requestConfirm("Limpar Cache Local?", "Isso pode resolver problemas de visualização, mas você terá que refazer login.", () => {
            localStorage.clear();
            window.location.reload();
        });
    };

    const tabs = [
        { id: 'geral', label: 'Geral', icon: Icons.Settings },
        { id: 'financeiro', label: 'Financeiro', icon: Icons.Dollar },
        { id: 'sistema', label: 'Sistema & IA', icon: Icons.Stars },
        { id: 'novidades', label: 'Novidades', icon: Icons.Bell },
    ];

    if (isAdmin) {
        tabs.push({ id: 'usuarios', label: 'Usuários', icon: Icons.Users });
    }

    if (isSuperAdmin) {
        tabs.push({ id: 'admin', label: 'Admin', icon: Icons.Shield });
    }

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleChangePassword = () => {
        if (newPassword.length < 6) {
            return notify("A nova senha deve ter no mínimo 6 caracteres.", "error");
        }
        if (newPassword !== confirmPassword) {
            return notify("As senhas não coincidem.", "error");
        }

        const userToUpdate = data.users.find((u: any) => u.username === user.username);
        if (userToUpdate) {
            const updatedUser = { ...userToUpdate, pass: newPassword };
            dbOp('update', 'users', updatedUser);
            notify("Senha alterada com sucesso!", "success");
            setNewPassword('');
            setConfirmPassword('');
        } else {
            notify("Erro ao encontrar seu usuário para alterar a senha.", "error");
        }
    };


    const handleLogoutClick = () => {
        requestConfirm("Deseja realmente sair?", "Você terá que fazer login novamente.", () => {
            logout();
        });
    };

    const handleImageUpload = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setNewsImage(compressed);
            } catch (err) {
                notify("Erro ao processar imagem", "error");
            }
        }
    };

    const handlePaste = async (e: any) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const compressed = await compressImage(file);
                    setNewsImage(compressed);
                    e.preventDefault(); 
                }
                break;
            }
        }
    };

    const handlePostNews = () => {
        if(!newsTitle || !newsContent) return notify("Título e conteúdo são obrigatórios.", "error");
        
        const payload = {
            id: generateUniqueId(),
            title: newsTitle,
            content: newsContent,
            date: getTodayDate(),
            author: user.username,
            image: newsImage || null,
            timestamp: Date.now()
        };

        dbOp('create', 'newsletter', payload);
        setNewsTitle('');
        setNewsContent('');
        setNewsImage(null);
        notify("Novidade publicada com sucesso!", "success");
    };

    const handleSaveExpiration = (newDate: Date) => {
        const sys = editExpModal.system;
        const updates: any = {};
        updates[`isBlocked_${sys}`] = false;
        updates[`expiresAt_${sys}`] = newDate.toISOString();
        // @ts-ignore
        import('../firebase').then(({ db }) => {
            db.ref('system_settings/subscription').update(updates);
            notify(`Vencimento de ${sys} atualizado para ${newDate.toLocaleDateString()}!`, 'success');
        });
    };

    const handleExportData = () => {
        try {
            if (systemContext === 'Mistura') {
                return showAlert("Ação Bloqueada", "Selecione um sistema específico (Pg, Mip ou Sv) para gerar o backup.", "warning");
            }

            const rawBackup = {
                passengers: data.passengers || [],
                drivers: data.drivers || [],
                trips: data.trips || [],
                notes: data.notes || [],
                lostFound: data.lostFound || [],
                newsletter: data.newsletter || [],
                users: (data.users || []).filter((u: any) => u.username !== 'Breno'),
                generatedAt: new Date().toISOString(),
                exportedBy: user.username,
                system: systemContext
            };

            // Função para remover menções a "Breno" recursivamente em todo o objeto de backup
            const cleanBreno = (obj: any): any => {
                if (obj === null || typeof obj !== 'object') {
                    if (typeof obj === 'string') {
                        return obj.replace(/Breno/g, 'Admin');
                    }
                    return obj;
                }
                if (Array.isArray(obj)) return obj.map(cleanBreno);
                
                const newObj: any = {};
                for (const key in obj) {
                    newObj[key] = cleanBreno(obj[key]);
                }
                return newObj;
            };

            const backup = cleanBreno(rawBackup);

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${systemContext.toLowerCase()}_${getTodayDate()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            notify(`Backup (${systemContext}) gerado com sucesso!`, "success");
        } catch (e) {
            notify("Erro ao gerar backup.", "error");
        }
    };

    const handleImportData = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;

        if (systemContext === 'Mistura') {
            showAlert("Ação Bloqueada", "Selecione um sistema específico (Pg, Mip ou Sv) para importar dados.", "warning");
            if (importInputRef.current) importInputRef.current.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event: any) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // Validação de Sistema
                if (importedData.system && importedData.system !== systemContext) {
                    showAlert("Sistema Incompatível", `Este backup pertence ao sistema ${importedData.system}. Você está no sistema ${systemContext}. Por favor, selecione o sistema correto antes de importar.`, "danger");
                    if (importInputRef.current) importInputRef.current.value = '';
                    return;
                }

                const collections = ['passengers', 'drivers', 'trips', 'notes', 'lostFound', 'newsletter', 'users'];
                let totalItems = 0;
                collections.forEach(col => {
                    if (importedData[col] && Array.isArray(importedData[col])) {
                        totalItems += importedData[col].length;
                    }
                });

                setImportStatus({
                    isOpen: true,
                    isMinimized: false,
                    currentCollection: 'Iniciando...',
                    currentItem: '',
                    added: 0,
                    skipped: 0,
                    total: totalItems,
                    logs: []
                });

                let addedCount = 0;
                let skippedCount = 0;
                
                for (const col of collections) {
                    if (importedData[col] && Array.isArray(importedData[col])) {
                        setImportStatus((prev: any) => ({ ...prev, currentCollection: col }));
                        
                        for (const item of importedData[col]) {
                            const itemName = item.name || item.title || item.username || item.id;
                            setImportStatus((prev: any) => ({ ...prev, currentItem: itemName }));

                            // Safety: Don't import Breno user if somehow present
                            if (col === 'users' && item.username === 'Breno') {
                                skippedCount++;
                                setImportStatus((prev: any) => ({ 
                                    ...prev, 
                                    skipped: skippedCount
                                }));
                                continue;
                            }

                            // Check if item exists by ID
                            const exists = data[col]?.some((existing: any) => existing.id === item.id);
                            if (!exists) {
                                await dbOp('create', col, item);
                                addedCount++;
                                setImportStatus((prev: any) => ({ 
                                    ...prev, 
                                    added: addedCount,
                                    logs: [{ type: 'added', message: `Adicionado: ${itemName} (${col})` }, ...prev.logs].slice(0, 50)
                                }));
                            } else {
                                skippedCount++;
                                setImportStatus((prev: any) => ({ 
                                    ...prev, 
                                    skipped: skippedCount
                                }));
                                // Removido log de duplicado conforme solicitado
                            }
                            // Pequeno delay para visualização do progresso se for muito rápido
                            if (totalItems < 50) await new Promise(r => setTimeout(r, 50));
                        }
                    }
                }
                
                setImportStatus((prev: any) => ({ ...prev, currentCollection: 'Concluído!', currentItem: '' }));
                notify(`Importação concluída! ${addedCount} novos itens adicionados. ${skippedCount} itens ignorados por duplicidade.`, "success");
                
                if (importInputRef.current) importInputRef.current.value = '';
            } catch (err) {
                console.error("Import error:", err);
                notify("Erro ao importar arquivo. Verifique se o formato JSON está correto.", "error");
                setImportStatus((prev: any) => ({ ...prev, isOpen: false }));
            }
        };
        reader.readAsText(file);
    };

    const banDevice = (deviceId: string, reason: string, logData?: any) => {
        if (!deviceId) return;
        requestConfirm("Banir Dispositivo?", "Este aparelho não conseguirá mais fazer login, mesmo trocando de navegador ou aba anônima. Se estiver logado, cairá imediatamente.", () => {
            dbOp('update', `blocked_devices/${deviceId}`, { 
                reason, 
                blockedBy: user.username,
                blockedAt: Date.now(),
                deviceInfo: logData?.deviceInfo || null,
                location: logData?.location || null,
                ip: logData?.ip || null,
                username: logData?.username || null
            });
        });
    };

    const unbanDevice = (deviceId: string) => {
        requestConfirm("Desbloquear?", "O aparelho voltará a ter acesso.", () => {
            dbOp('delete', 'blocked_devices', deviceId);
        });
    };

    const [blockedList, setBlockedList] = useState<any[]>([]);
    
    // Fetch Blocked Devices
    useEffect(() => {
        if (!isSuperAdmin || !dbOp) return;
        // @ts-ignore
        import('../firebase').then(({ db }) => {
            if(db) {
                const ref = db.ref('blocked_devices');
                ref.on('value', (snap:any) => {
                    const val = snap.val();
                    const list = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })) : [];
                    setBlockedList(list);
                });
                return () => ref.off();
            }
        });
    }, [isSuperAdmin]);


    const [prices, setPrices] = useState<any>({ Pg: 4, Mip: 4, Sv: 4 });
    const [blocks, setBlocks] = useState<any>({ Pg: false, Mip: false, Sv: false });

    useEffect(() => {
        // @ts-ignore
        import('../firebase').then(({ db }) => {
            if (!db) return;

            // Fetch Prices (Admin only or if needed)
            if (isSuperAdmin) {
                ['Pg', 'Mip', 'Sv'].forEach(sys => {
                    const node = sys === 'Pg' ? 'system_settings/pricePerPassenger' : `${sys}/system_settings/pricePerPassenger`;
                    db.ref(node).on('value', (snap: any) => {
                        setPrices((prev:any) => ({ ...prev, [sys]: snap.val() || 4 }));
                    });
                });
            }

            // Fetch Subscription Data (For everyone)
            db.ref('system_settings/subscription').on('value', (snap: any) => {
                const val = snap.val() || {};
                setBlocks({
                    Pg: val.isBlocked_Pg || false,
                    Mip: val.isBlocked_Mip || false,
                    Sv: val.isBlocked_Sv || false,
                    expiresAt_Pg: val.expiresAt_Pg,
                    expiresAt_Mip: val.expiresAt_Mip,
                    expiresAt_Sv: val.expiresAt_Sv,
                    isRecurring_Pg: val.isRecurring_Pg || false,
                    isRecurring_Mip: val.isRecurring_Mip || false,
                    isRecurring_Sv: val.isRecurring_Sv || false
                });
            });
        });
    }, [isAdmin]);

    const updatePrice = (sys: string, val: number) => {
        // @ts-ignore
        import('../firebase').then(({ db }) => {
            const node = sys === 'Pg' ? 'system_settings/pricePerPassenger' : `${sys}/system_settings/pricePerPassenger`;
            db.ref(node).set(val);
        });
    };

    const updateBlock = (sys: string, blocked: boolean) => {
        // @ts-ignore
        import('../firebase').then(({ db }) => {
            db.ref('system_settings/subscription').update({ [`isBlocked_${sys}`]: blocked });
            notify(blocked ? `Bloqueio ${sys} ativado` : `Bloqueio ${sys} removido`, blocked ? 'error' : 'success');
        });
    };

    return (
        <div className="space-y-6 pb-20">
            
            {/* 1. PERFIL HEADER */}
            <div className={`relative overflow-hidden rounded-3xl p-6 md:p-8 border ${theme.border} shadow-2xl group stagger-in d-1`}>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 opacity-90"></div>
                <div className={`absolute -top-10 -right-10 p-0 opacity-10 transform rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6 pointer-events-none`}>
                    <Icons.Settings size={200} />
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-amber-500 to-orange-600 shadow-lg">
                                <img src={getAvatarUrl(user.username)} alt="User" className="w-full h-full rounded-full bg-slate-950 object-cover" />
                            </div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-slate-900 rounded-full"></div>
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{user.username}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                    {user.role}
                                </span>
                                <span className="text-xs opacity-50">•</span>
                                <span className="text-xs opacity-50">Renova em: {daysRemaining}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {isNearExpiration && user.username !== 'Breno' && (
                            <button 
                                onClick={triggerEarlyRenewal}
                                className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 px-5 py-3 rounded-xl flex items-center gap-2 font-bold transition-all active:scale-95 text-sm animate-pulse"
                            >
                                <Icons.Check size={18}/> Renovar Agora
                            </button>
                        )}
                        <button onClick={handleLogoutClick} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 px-5 py-3 rounded-xl flex items-center gap-2 font-bold transition-all active:scale-95 text-sm">
                            <Icons.LogOut size={18}/> Sair
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. TABS NAVIGATION */}
            <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border ${
                            activeTab === tab.id 
                            ? `${theme.primary} border-transparent shadow-lg scale-105` 
                            : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 3. TABS CONTENT */}
            <div className="stagger-in d-2">
                
                {/* TAB: GERAL */}
                {activeTab === 'geral' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* MUDAR SENHA */}
                        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-lg`}>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Icons.Lock className="text-yellow-400"/> Segurança da Conta
                            </h3>
                            <div className="space-y-3">
                                <Input 
                                    theme={theme} 
                                    type="password"
                                    placeholder="Nova Senha"
                                    value={newPassword}
                                    onChange={(e: any) => setNewPassword(e.target.value)}
                                />
                                <Input 
                                    theme={theme} 
                                    type="password"
                                    placeholder="Confirmar Nova Senha"
                                    value={confirmPassword}
                                    onChange={(e: any) => setConfirmPassword(e.target.value)}
                                />
                                <Button theme={theme} onClick={handleChangePassword} variant="primary" className="w-full">Alterar Senha</Button>
                            </div>
                        </div>

                        {/* APARÊNCIA */}
                        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-lg`}>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Icons.Stars className="text-amber-400"/> Personalização
                            </h3>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {Object.entries(THEMES).slice(0, 4).map(([key, t]: any) => (
                                    <button 
                                        key={key} 
                                        onClick={() => changeTheme(key)} 
                                        className={`relative group overflow-hidden rounded-xl border transition-all duration-300 ${themeKey === key ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-white/10 hover:border-white/30'}`}
                                    >
                                        <div className={`h-12 w-full ${t.bg} flex items-center justify-center`}>
                                            <div className={`w-6 h-6 rounded-full ${t.primary} shadow-lg flex items-center justify-center`}>
                                                {themeKey === key && <Icons.Check size={12} className="text-white"/>}
                                            </div>
                                        </div>
                                        <div className="py-1.5 px-2 bg-black/20 text-center">
                                            <span className="text-[10px] font-bold opacity-80">{t.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <Button theme={theme} onClick={handleClearCache} variant="secondary" className="w-full" icon={Icons.Trash}>Limpar Cache Local</Button>
                        </div>
                    </div>
                )}

                {/* TAB: FINANCEIRO */}
                {activeTab === 'financeiro' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* CONFIGURAÇÃO DE COBRANÇA */}
                        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-lg`}>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Icons.Dollar className="text-green-400"/> Valores de Cobrança
                            </h3>
                            <div className="space-y-3">
                                <p className="text-sm opacity-70">Defina o valor padrão por passageiro para o sistema atual.</p>
                                
                                {isSuperAdmin ? (
                                    <div className="space-y-4">
                                        {['Pg', 'Mip', 'Sv'].map(sys => (
                                            <div key={sys} className="flex flex-col gap-1">
                                                <label className="text-xs font-bold uppercase opacity-60">{sys}</label>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-bold">R$</span>
                                                    <Input 
                                                        theme={theme} 
                                                        type="number"
                                                        placeholder="4.00"
                                                        value={prices[sys] || 4}
                                                        onChange={(e: any) => updatePrice(sys, Number(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold">R$</span>
                                        <Input 
                                            theme={theme} 
                                            type="number"
                                            placeholder="4.00"
                                            value={data.pricePerPassenger || 4}
                                            onChange={(e: any) => updatePrice(systemContext, Number(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ASSINATURA */}
                        {!isSuperAdmin && (
                            <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-lg border-blue-500/20`}>
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-400">
                                    <Icons.CreditCard className="text-blue-400"/> Plano e Assinatura
                                </h3>
                                
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Sistema {systemContext}</h4>
                                            <p className="text-[10px] opacity-60">Status da conta</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${daysRemaining === 'Expirado' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {daysRemaining === 'Expirado' ? 'Expirado' : 'Ativo'}
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-white/90">{daysRemaining}</div>
                                </div>

                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${ isRecurringActive ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/30' }`}>
                                            <Icons.Refresh size={18} className={isRecurringActive ? 'animate-spin-slow' : ''} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white">Renovação Automática</div>
                                            <div className="text-[10px] opacity-60">Cobrança mensal recorrente</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (isSuperAdmin && !isRecurringActive) {
                                                triggerEarlyRenewal();
                                            } else {
                                                import('../firebase').then(({ db }) => {
                                                    if (!isRecurringActive) notify("Para ativar, use a tela de bloqueio ou aguarde o vencimento.", "warning");
                                                    else {
                                                        requestConfirm("Desativar Renovação?", "Você terá que renovar manualmente.", () => {
                                                            const updates: any = {};
                                                            updates[`isRecurring_${systemContext}`] = false;
                                                            db.ref('system_settings/subscription').update(updates);
                                                            notify("Renovação Automática Desativada", 'success');
                                                        });
                                                    }
                                                });
                                            }
                                        }}
                                        disabled={!isSuperAdmin}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${!isSuperAdmin ? 'bg-gray-500 opacity-50 cursor-not-allowed' : (isRecurringActive ? 'bg-purple-600' : 'bg-white/10')}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${ isRecurringActive ? 'left-6' : 'left-1' }`}></div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: SISTEMA & IA */}
                {activeTab === 'sistema' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* IA CONFIG */}
                        <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-lg`}>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Icons.Stars className="text-purple-400"/> Inteligência Artificial</h3>
                            <p className="text-xs opacity-60 mb-4">Habilite o Cadastro Mágico e automações de voz com sua chave Gemini.</p>
                            <div className="space-y-3">
                                <input 
                                    type="password" 
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500/50 transition-colors" 
                                    placeholder="API Key do Google Gemini" 
                                    value={geminiKey} 
                                    onChange={(e:any)=>setGeminiKey(e.target.value)} 
                                />
                                <Button theme={theme} onClick={()=>saveApiKey(geminiKey)} variant="primary" className="w-full">Salvar Chave API</Button>
                            </div>
                        </div>

                        {/* FERRAMENTAS */}
                        <div className="space-y-6">
                            <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-lg`}>
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Icons.Shield className="text-green-400"/> Backup e Dados</h3>
                                <div className="space-y-3">
                                    <Button theme={theme} onClick={handleExportData} variant="secondary" className="w-full" icon={Icons.Download}>Exportar Backup JSON</Button>
                                    
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            ref={importInputRef} 
                                            onChange={handleImportData} 
                                            accept=".json" 
                                            className="hidden" 
                                        />
                                        <Button 
                                            theme={theme} 
                                            onClick={() => importInputRef.current?.click()} 
                                            variant="secondary" 
                                            className="w-full" 
                                            icon={Icons.Upload}
                                        >
                                            Importar Backup JSON
                                        </Button>
                                    </div>
                                    <p className="text-[10px] opacity-40 text-center italic">Ao importar, itens repetidos serão ignorados automaticamente.</p>
                                </div>

                                {/* SEÇÃO DE PROGRESSO DE IMPORTAÇÃO INTEGRADA */}
                                {importStatus.isOpen && (
                                    <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className={`text-blue-400 ${importStatus.currentCollection !== 'Concluído!' ? 'animate-spin' : ''}`}>
                                                    <Icons.Refresh size={16} />
                                                </div>
                                                <span className="text-xs font-bold text-white">
                                                    {importStatus.currentCollection === 'Concluído!' ? 'Importação Finalizada' : 'Importando Dados...'}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => setImportStatus((prev: any) => ({ ...prev, isOpen: false }))}
                                                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-red-400"
                                                title="Fechar Relatório"
                                            >
                                                <Icons.X size={16} />
                                            </button>
                                        </div>

                                        {/* Progress Stats */}
                                        <div className="grid grid-cols-3 gap-2 py-3 bg-white/5 rounded-xl border border-white/5">
                                            <div className="text-center">
                                                <div className="text-[9px] opacity-40 uppercase font-bold">Total</div>
                                                <div className="text-xs font-bold text-white">{importStatus.total}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] text-green-400 uppercase font-bold">Novos</div>
                                                <div className="text-xs font-bold text-green-400">{importStatus.added}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[9px] text-yellow-400 uppercase font-bold">Pular</div>
                                                <div className="text-xs font-bold text-yellow-400">{importStatus.skipped}</div>
                                            </div>
                                        </div>

                                        {/* Current Activity */}
                                        {importStatus.currentCollection !== 'Concluído!' && (
                                            <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                                <div className="text-[9px] opacity-40 uppercase font-bold mb-1">Processando: {importStatus.currentCollection}</div>
                                                <div className="text-[10px] font-medium text-white/80 truncate">{importStatus.currentItem || 'Aguardando...'}</div>
                                                
                                                {/* Progress Bar */}
                                                <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-500 transition-all duration-300"
                                                        style={{ width: `${Math.min(100, ((importStatus.added + importStatus.skipped) / (importStatus.total || 1)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Logs */}
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar bg-black/40 rounded-xl border border-white/5">
                                            {importStatus.logs.length === 0 ? (
                                                <div className="text-[10px] opacity-30 text-center py-4 italic">Nenhuma atividade registrada...</div>
                                            ) : (
                                                importStatus.logs.map((log: any, i: number) => (
                                                    <div key={i} className="flex items-start gap-2 p-2 border-b border-white/5 last:border-0">
                                                        <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${log.type === 'added' ? 'bg-green-500' : log.type === 'skipped' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                                        <span className="text-[10px] opacity-70 leading-tight">{log.message}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-lg`}>
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Icons.Map className="text-blue-400"/> Ajuda</h3>
                                <Button theme={theme} onClick={() => { localStorage.removeItem(`tour_seen_${user.username}`); restartTour(); }} variant="secondary" className="w-full" icon={Icons.Refresh}>Reiniciar Tour Guiado</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: NOVIDADES */}
                {activeTab === 'novidades' && (
                    <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} shadow-lg`}>
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Icons.Bell className="text-blue-400"/> Central de Novidades</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            {data.newsletter && data.newsletter.length > 0 ? (
                                data.newsletter.sort((a:any,b:any) => b.timestamp - a.timestamp).map((news:any) => (
                                    <div key={news.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 relative hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-lg text-white">{news.title}</h4>
                                            <span className="text-xs opacity-50 bg-black/30 px-3 py-1 rounded-full border border-white/5">{news.date}</span>
                                        </div>
                                        {news.image && (
                                            <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
                                                <img src={news.image} alt="News" className="w-full h-auto object-cover max-h-64" />
                                            </div>
                                        )}
                                        <p className="text-sm opacity-70 whitespace-pre-wrap leading-relaxed">{news.content}</p>
                                        {isSuperAdmin && (
                                            <button onClick={()=>del('newsletter', news.id)} className="absolute top-4 right-4 text-red-400 opacity-20 hover:opacity-100 p-2 hover:bg-red-500/10 rounded-full transition-all"><Icons.Trash size={16}/></button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 opacity-30 text-sm border-2 border-dashed border-white/10 rounded-2xl">Nenhuma novidade registrada.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: USUARIOS */}
                {activeTab === 'usuarios' && isAdmin && (
                    <div className={`${theme.card} p-8 rounded-3xl border ${theme.border} shadow-xl text-center space-y-6`}>
                        <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400">
                            <Icons.Users size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-2xl text-white">Gerenciamento de Usuários</h3>
                            <p className="text-sm opacity-60 max-w-md mx-auto">
                                Como administrador, você pode criar novos usuários, alterar permissões e gerenciar quem tem acesso ao sistema.
                            </p>
                        </div>
                        <div className="pt-4">
                            <Button 
                                theme={theme} 
                                onClick={() => setView('manageUsers')} 
                                variant="primary" 
                                size="lg" 
                                icon={Icons.Users}
                                className="px-10 shadow-lg shadow-blue-500/20"
                            >
                                Abrir Painel de Usuários
                            </Button>
                        </div>
                    </div>
                )}

                {/* TAB: ADMIN */}
                {activeTab === 'admin' && isSuperAdmin && (
                    <div className="space-y-8">
                        {/* BLOQUEIO DE SISTEMAS */}
                        <div className={`${theme.card} rounded-3xl border border-red-500/20 overflow-hidden`}>
                            <div className="bg-red-500/10 p-5 border-b border-red-500/20 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-500/20 p-2.5 rounded-xl text-red-400"><Icons.Lock size={22} /></div>
                                    <div>
                                        <h3 className="font-bold text-red-100">Gestão de Acessos</h3>
                                        <p className="text-xs text-red-300/60">Controle de validade e bloqueios manuais.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {['Pg', 'Mip', 'Sv'].map(sys => {
                                    const expiresAtStr = blocks[`expiresAt_${sys}`];
                                    let statusText = 'Expirado';
                                    let isExpired = true;
                                    if (expiresAtStr) {
                                        const diff = new Date(expiresAtStr).getTime() - Date.now();
                                        if (diff > 0) {
                                            isExpired = false;
                                            const days = Math.floor(diff / 86400000);
                                            statusText = days > 0 ? `${days} dias` : 'Hoje';
                                        }
                                    }
                                    const isBlocked = blocks[sys];
                                    return (
                                        <div key={sys} className="bg-black/30 p-4 rounded-2xl border border-white/5 flex flex-col gap-4">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-white">{sys}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isBlocked || isExpired ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {isBlocked ? 'Bloqueado' : (isExpired ? 'Expirado' : 'Ativo')}
                                                </span>
                                            </div>
                                            <div className="text-xs opacity-50">Expira em: <span className="text-white opacity-100">{statusText}</span></div>
                                            <div className="flex gap-2">
                                                <IconButton theme={theme} onClick={() => setEditExpModal({ isOpen: true, system: sys, currentExpiration: expiresAtStr })} icon={Icons.Calendar} className="flex-1" />
                                                <button 
                                                    onClick={() => updateBlock(sys, !isBlocked)}
                                                    className={`flex-[2] py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isBlocked ? 'bg-green-600 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                                                >
                                                    {isBlocked ? 'Liberar' : 'Bloquear'}
                                                </button>
                                            </div>
                                            { isAdmin && (blocks[`isRecurring_${sys}`]) && (
                                                <button 
                                                    onClick={() => {
                                                        requestConfirm(`Cancelar Assinatura ${sys}?`, `Isso irá cancelar a assinatura do sistema ${sys} no Stripe.`, async () => {
                                                            try {
                                                                const response = await fetch('/api/cancel-subscription', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ systemContext: sys, userId: user.uid })
                                                                });
                                                                if (response.ok) {
                                                                    notify(`Assinatura ${sys} cancelada com sucesso!`, "success");
                                                                } else {
                                                                    notify("Erro ao cancelar assinatura.", "error");
                                                                }
                                                            } catch (error) {
                                                                notify("Erro ao cancelar assinatura.", "error");
                                                            }
                                                        });
                                                    }}
                                                    className="mt-2 w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-all"
                                                >
                                                    Cancelar Assinatura {sys}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SEGURANÇA E AVISOS */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* PUBLICAR AVISO */}
                            <div className={`${theme.card} p-6 rounded-3xl border ${theme.border} shadow-lg`}>
                                <h4 className="font-bold text-white uppercase tracking-widest text-xs mb-4 flex items-center gap-2"><Icons.Message size={14}/> Publicar Novidade</h4>
                                <div className="space-y-3">
                                    <Input theme={theme} placeholder="Título" value={newsTitle} onChange={(e:any)=>setNewsTitle(e.target.value)} />
                                    <textarea 
                                        className="w-full h-32 bg-black/20 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-white/30 resize-none text-sm"
                                        placeholder="Conteúdo... (Cole imagens aqui)"
                                        value={newsContent}
                                        onChange={(e)=>setNewsContent(e.target.value)}
                                        onPaste={handlePaste}
                                    />
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <input type="file" id="news-img-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            <label htmlFor="news-img-upload" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer text-white transition-colors"><Icons.Image size={18}/></label>
                                            {newsImage && <button onClick={() => setNewsImage(null)} className="p-2 bg-red-500/20 text-red-400 rounded-lg"><Icons.X size={18}/></button>}
                                        </div>
                                        <Button theme={theme} onClick={handlePostNews} size="sm" variant="success" icon={Icons.Send}>Postar</Button>
                                    </div>
                                </div>
                            </div>

                            {/* TIMELINE DE ACESSOS */}
                            <div className={`${theme.card} p-6 rounded-3xl border ${theme.border} shadow-lg`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-white uppercase tracking-widest text-xs flex items-center gap-2"><Icons.Shield size={14}/> Segurança</h4>
                                    <div className="flex bg-black/40 p-1 rounded-lg">
                                        <button onClick={()=>setSecurityTab('timeline')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${securityTab==='timeline' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}>Timeline</button>
                                        <button onClick={()=>setSecurityTab('blocked')} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${securityTab==='blocked' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'opacity-40'}`}>Bloqueados</button>
                                    </div>
                                </div>
                                
                                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                                    {securityTab === 'timeline' ? ipHistory.slice(0, 20).map((log:any) => {
                                        const isBanned = blockedList.some(b => b.id === log.deviceId);
                                        const isTrusted = trustedDevices[log.deviceId];
                                        return (
                                            <div 
                                                key={log.id} 
                                                onClick={() => setSelectedLog(log)}
                                                className={`p-3 rounded-xl border flex justify-between items-center group cursor-pointer transition-all hover:scale-[1.01] ${isTrusted ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/5'}`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold truncate ${isTrusted ? 'text-green-400' : 'text-white'}`}>{log.username}</span>
                                                        {isTrusted && <Icons.Check size={10} className="text-green-500" />}
                                                        <span className="text-[9px] opacity-30">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="text-[9px] opacity-40 truncate">{log.deviceInfo?.browser || 'Browser'} • {log.deviceId?.substring(0,8)}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isTrusted && <span className="text-[8px] font-bold text-green-500/60 uppercase tracking-tighter">Seguro</span>}
                                                    {!isBanned && log.deviceId && (
                                                        <button 
                                                            onClick={(e)=>{ e.stopPropagation(); banDevice(log.deviceId, 'Ban Admin', log); }} 
                                                            className="opacity-0 group-hover:opacity-100 text-[9px] bg-red-500/20 text-red-400 px-2 py-1 rounded transition-all"
                                                        >
                                                            Banir
                                                        </button>
                                                    )}
                                                    {isBanned && <Icons.Slash size={12} className="text-red-500" />}
                                                </div>
                                            </div>
                                        );
                                    }) : blockedList.map((dev:any) => (
                                        <div key={dev.id} className="bg-red-900/10 p-3 rounded-xl border border-red-500/20 flex justify-between items-center">
                                            <div className="text-[10px] font-mono text-red-200">{dev.id.substring(0,16)}...</div>
                                            <IconButton theme={theme} onClick={()=>unbanDevice(dev.id)} icon={Icons.Check} size={14} variant="success" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <EditExpirationModal 
                isOpen={editExpModal.isOpen}
                onClose={() => setEditExpModal(prev => ({...prev, isOpen: false}))}
                system={editExpModal.system}
                currentExpiration={editExpModal.currentExpiration}
                onSave={handleSaveExpiration}
                theme={theme}
            />

            {/* MODAL DETALHES DO DISPOSITIVO */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={`${theme.card} w-full max-w-md rounded-3xl border ${theme.border} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${trustedDevices[selectedLog.deviceId] ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    <Icons.Smartphone size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Detalhes do Acesso</h3>
                                    <p className="text-[10px] opacity-50 uppercase tracking-widest">{selectedLog.username}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <Icons.X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="text-[9px] opacity-40 uppercase font-bold mb-1">Navegador</div>
                                    <div className="text-xs font-bold">{selectedLog.deviceInfo?.browser || 'N/A'}</div>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="text-[9px] opacity-40 uppercase font-bold mb-1">Sistema</div>
                                    <div className="text-xs font-bold">{selectedLog.deviceInfo?.os || 'N/A'}</div>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="text-[9px] opacity-40 uppercase font-bold mb-1">Dispositivo</div>
                                    <div className="text-xs font-bold">{selectedLog.deviceInfo?.device || 'N/A'}</div>
                                </div>
                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <div className="text-[9px] opacity-40 uppercase font-bold mb-1">IP</div>
                                    <div className="text-xs font-bold">{selectedLog.ip || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="text-[9px] opacity-40 uppercase font-bold mb-2">Localização</div>
                                <div className="text-[10px] opacity-80 break-words leading-relaxed">
                                    {selectedLog.location?.display_name || selectedLog.location?.exact_address || 'Não identificada'}
                                </div>
                            </div>

                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="text-[9px] opacity-40 uppercase font-bold mb-2">Hardware / GPU</div>
                                <div className="text-[10px] opacity-80 break-words leading-relaxed">
                                    {selectedLog.deviceInfo?.gpu || 'Não identificado'}
                                </div>
                            </div>

                            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                <div className="text-[9px] opacity-40 uppercase font-bold mb-2">ID do Aparelho</div>
                                <div className="text-[10px] font-mono opacity-80 break-all">
                                    {selectedLog.deviceId || 'N/A'}
                                </div>
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button 
                                    onClick={() => toggleTrustDevice(selectedLog.deviceId, selectedLog.deviceInfo)}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                        trustedDevices[selectedLog.deviceId]
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                        : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                                    }`}
                                >
                                    {trustedDevices[selectedLog.deviceId] ? <Icons.X size={16}/> : <Icons.Check size={16}/>}
                                    {trustedDevices[selectedLog.deviceId] ? 'Remover Seguro' : 'Marcar como Seguro'}
                                </button>
                                
                                {!blockedList.some(b => b.id === selectedLog.deviceId) && (
                                    <button 
                                        onClick={() => banDevice(selectedLog.deviceId, 'Ban Admin', selectedLog)}
                                        className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                                    >
                                        Banir
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
