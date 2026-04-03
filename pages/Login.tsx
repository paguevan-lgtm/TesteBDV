
import React, { useState, useEffect } from 'react';
import { Input, Toast, Icons, Button, AlertModal } from '../components/Shared';
import { useAuth } from '../contexts/AuthContext';
import { USERS_DB, THEMES } from '../constants'; 
import { db, auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';

export const LoginScreen = ({ onBack, theme: appTheme }: { onBack?: () => void, theme?: any }) => {
    const { login, findUsersByCredentials, logoutReason, setLogoutReason } = useAuth(); 
    const theme = appTheme || THEMES.default;
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [geoStatus, setGeoStatus] = useState('');
    
    // Notification State
    const [notification, setNotification] = useState({ message: '', type: 'info', visible: false });
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [logoutModalMessage, setLogoutModalMessage] = useState('');

    // Multi-system selection
    const [matchingUsers, setMatchingUsers] = useState<any[]>([]);
    const [showSystemSelection, setShowSystemSelection] = useState(false);
    const [selectedSystem, setSelectedSystem] = useState<string | null>(null);

    // Token Verification
    const [showTokenInput, setShowTokenInput] = useState(false);
    const [token, setToken] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [currentUserUid, setCurrentUserUid] = useState('');

    // Device ID for trusted devices
    const getDeviceId = () => {
        try {
            let id = localStorage.getItem('boradevan_device_id');
            if (!id) {
                id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                localStorage.setItem('boradevan_device_id', id);
            }
            return id;
        } catch (e) {
            return 'temp_' + Math.random().toString(36).substring(2, 15);
        }
    };

    // Forgot Password State
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState<'input' | 'token' | 'new_password'>('input');
    const [forgotPasswordInput, setForgotPasswordInput] = useState('');
    const [forgotPasswordUser, setForgotPasswordUser] = useState<any>(null);
    const [newPassword, setNewPassword] = useState('');

    // Efeito para mostrar motivo de logout
    useEffect(() => {
        if (logoutReason) {
            setLogoutModalMessage(logoutReason);
            setShowLogoutModal(true);
            // Limpa o motivo após mostrar para não repetir se o componente remontar
            setLogoutReason(null);
        }
    }, [logoutReason]);

    // Animation States
    const [focusField, setFocusField] = useState<'user' | 'pass' | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [isZooming, setIsZooming] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    
    // Geo Modal State
    const [showGeoPrompt, setShowGeoPrompt] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        let timeout: any;
        if (isTyping) {
            timeout = setTimeout(() => setIsTyping(false), 300);
        }
        return () => clearTimeout(timeout);
    }, [isTyping]);

    const notify = (msg: string, type: 'success' | 'error' | 'info' = 'error') => {
        setNotification({ message: msg, type, visible: true });
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
    };

    const handleTyping = () => {
        setIsTyping(true);
    };

    const handlePreLogin = async () => {
        if(!username || !password) return notify("Preencha usuário e senha", "error");
        
        setLoading(true);
        
        try {
            const users = await findUsersByCredentials(username, password);
            
            if (users.length === 0) {
                setLoading(false);
                notify('Acesso negado. Verifique suas credenciais.', 'error');
                return;
            }

            if (users.length === 1) {
                const user = users[0];
                let targetEmail = user.email;
                if (user.username.toLowerCase() === 'breno') {
                    targetEmail = 'brenoxt2003@gmail.com';
                }
                
                if (!targetEmail) {
                    notify('Usuário não possui email cadastrado.', 'error');
                    setLoading(false);
                    return;
                }
                try {
                    setUserEmail(targetEmail);
                    setCurrentUserUid(user.uid);
                    const result = await sendToken(targetEmail, user.displayName || user.username, 'login', user.uid);
                    
                    if (result && result.trusted) {
                        // Device is trusted, skip token input
                        startEntrySequence({ latitude: 0, longitude: 0, accuracy: 0 }, selectedSystem || undefined);
                    } else {
                        setShowTokenInput(true);
                    }
                } catch (e) {
                    // Error already notified
                }
                setLoading(false);
                return;
            }

            if (users.length > 1) {
                setMatchingUsers(users);
                setShowSystemSelection(true);
                setLoading(false);
                return;
            }
        } catch (error: any) {
            console.error("Erro no pre-login:", error);
            setLoading(false);
            notify(`Erro ao processar login: ${error.message || error}`, "error");
        }
    };

    const sendToken = async (email: string, name: string, type: 'login' | 'reset' = 'login', uid?: string) => {
        try {
            const deviceId = getDeviceId();
            const response = await fetch('/api/send-login-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, type, uid, deviceId })
            });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro ao enviar token');
                
                if (data.trusted) {
                    return data;
                }
                
                notify('Código enviado para o seu email.', 'success');
                return data;
            } else {
                const text = await response.text();
                console.error("Non-JSON response:", text);
                throw new Error('O servidor retornou uma resposta inválida (não JSON). Verifique se o backend está rodando corretamente.');
            }
        } catch (error: any) {
            notify(error.message, 'error');
            throw error; 
        }
    };

    const verifyToken = async () => {
        if (!token) return notify('Preencha o código', 'error');
        setLoading(true);
        try {
            const deviceId = getDeviceId();
            const response = await fetch('/api/verify-login-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, token, uid: currentUserUid, deviceId })
            });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Token inválido');
                
                setShowTokenInput(false);
                startEntrySequence({ latitude: 0, longitude: 0, accuracy: 0 }, selectedSystem || undefined);
            } else {
                const text = await response.text();
                console.error("Non-JSON response:", text);
                throw new Error('O servidor retornou uma resposta inválida (não JSON). Verifique se o backend está rodando corretamente.');
            }
        } catch (error: any) {
            notify(error.message, 'error');
            setLoading(false);
        }
    };

    const handleForgotPasswordSearch = async () => {
        if (!forgotPasswordInput) return notify("Preencha o usuário ou email", "error");
        setLoading(true);
        try {
            let foundUser = null;
            let targetEmail = '';

            // Search in Firebase
            if (db) {
                const snapshot = await db.ref('users').once('value');
                const users = snapshot.val();
                if (users) {
                    for (const key of Object.keys(users)) {
                        const u = users[key];
                        // Exclude Breno, Sistema and specific email
                        if (u.username?.toLowerCase() === 'breno' || u.username?.toLowerCase() === 'sistema' || u.email?.toLowerCase() === 'brenoxt2003@gmail.com') {
                            continue;
                        }

                        if (u.username?.toLowerCase() === forgotPasswordInput.toLowerCase() || u.email?.toLowerCase() === forgotPasswordInput.toLowerCase()) {
                            foundUser = { ...u, uid: key };
                            targetEmail = u.email;
                            break;
                        }
                    }
                }
            }

            // Search in local fallback if not found
            if (!foundUser) {
                for (const u of USERS_DB) {
                    if (u.username?.toLowerCase() === 'breno' || u.username?.toLowerCase() === 'sistema' || u.email?.toLowerCase() === 'brenoxt2003@gmail.com') {
                        continue;
                    }
                    if (u.username?.toLowerCase() === forgotPasswordInput.toLowerCase() || u.email?.toLowerCase() === forgotPasswordInput.toLowerCase()) {
                        foundUser = { ...u, uid: 'local_' + u.username };
                        targetEmail = u.email;
                        break;
                    }
                }
            }

            if (!foundUser || !targetEmail) {
                setLoading(false);
                return notify("Usuário não encontrado ou sem email cadastrado.", "error");
            }

            setForgotPasswordUser(foundUser);
            setUserEmail(targetEmail);
            await sendToken(targetEmail, foundUser.displayName || foundUser.username, 'reset');
            setForgotPasswordStep('token');
        } catch (error: any) {
            console.error("Erro no forgot password:", error);
            notify(`Erro: ${error.message || error}`, "error");
        }
        setLoading(false);
    };

    const handleForgotPasswordVerify = async () => {
        if (!token) return notify('Preencha o código', 'error');
        setLoading(true);
        try {
            const response = await fetch('/api/verify-login-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, token })
            });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Token inválido');
                
                setForgotPasswordStep('new_password');
            } else {
                const text = await response.text();
                console.error("Non-JSON response:", text);
                throw new Error('O servidor retornou uma resposta inválida (não JSON). Verifique se o backend está rodando corretamente.');
            }
        } catch (error: any) {
            notify(error.message, 'error');
        }
        setLoading(false);
    };

    const handleForgotPasswordReset = async () => {
        if (!newPassword || newPassword.length < 6) return notify('A nova senha deve ter pelo menos 6 caracteres', 'error');
        setLoading(true);
        try {
            if (forgotPasswordUser.uid.startsWith('local_')) {
                notify("Não é possível alterar a senha de um usuário local.", "error");
                setLoading(false);
                return;
            }

            await db.ref(`users/${forgotPasswordUser.uid}`).update({ pass: newPassword });
            notify("Senha alterada com sucesso! Faça login.", "success");
            setShowForgotPassword(false);
            setForgotPasswordStep('input');
            setForgotPasswordInput('');
            setNewPassword('');
            setToken('');
        } catch (error: any) {
            console.error("Erro ao alterar senha:", error);
            notify(`Erro ao alterar senha: ${error.message || error}`, "error");
        }
        setLoading(false);
    };

    const executeGeoLogin = () => {
        setLoading(true);
        setGeoStatus('Sincronizando satélites...');

        if (!navigator.geolocation) {
            notify("Seu dispositivo não suporta GPS.", "error");
            setLoading(false);
            setShowGeoPrompt(false);
            return;
        }

        const tryGeo = (highAccuracy: boolean) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude, accuracy } = pos.coords;
                    setShowGeoPrompt(false); 
                    startEntrySequence({ latitude, longitude, accuracy });
                },
                (err) => {
                    if (highAccuracy) {
                        // Fallback para precisão menor se a alta falhar (comum no iOS)
                        tryGeo(false);
                    } else {
                        console.warn("Geo bloqueada:", err);
                        setLoading(false);
                        setGeoStatus('');
                        notify("Não foi possível obter localização. Verifique as permissões do navegador.", "error");
                        setShowGeoPrompt(true);
                    }
                },
                { enableHighAccuracy: highAccuracy, timeout: 20000, maximumAge: 0 }
            );
        };

        tryGeo(true);
    };

    const startEntrySequence = (coords: any, system?: string) => {
        setGeoStatus('Motor ligado. Iniciando...');
        setIsZooming(true); 

        setTimeout(async () => {
            await login(username, password, coords, system || selectedSystem || undefined);
        }, 1200); 
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 text-white overflow-hidden">
            
            <Toast message={notification.message} type={notification.type} visible={notification.visible} />

            <AlertModal 
                isOpen={showLogoutModal}
                title="Sessão Encerrada"
                message={logoutModalMessage}
                onClose={() => setShowLogoutModal(false)}
                theme={theme}
                type="info"
            />

            {/* Immersive Scene */}
            <div className="login-scene">
                <div className="stars-container"></div>
                <div className="ambient-glow"></div>
                <div className="distant-mountains"></div>
                <div className="horizon-line"></div>
                <div className="road-perspective">
                    <div className="road-glow"></div>
                </div>
            </div>

            <div className="relative z-10 w-full h-full overflow-y-auto flex flex-col items-center justify-center p-6">
                {onBack && (
                <button 
                    onClick={onBack}
                    className="absolute top-6 left-6 z-50 text-white/50 hover:text-white flex items-center gap-2 transition-colors group"
                >
                    <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                        <Icons.ArrowLeft size={20} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider hidden md:block">Voltar</span>
                </button>
            )}

            {/* Van Scene */}
            <div className="relative z-10 mb-12 flex flex-col items-center">
                <motion.div 
                    className="van-container"
                    animate={{
                        y: isZooming ? -500 : (focusField === 'pass' ? 10 : (isTyping ? [0, -1, 0] : 0)),
                        rotate: isTyping && !isZooming ? [0, 0.1, 0] : 0,
                        rotateX: focusField === 'pass' ? 5 : 0,
                        scale: isZooming ? 0.1 : (isMobile ? 0.65 : 1),
                        opacity: isZooming ? 0 : 1
                    }}
                    transition={{ 
                        y: isTyping && !isZooming ? { repeat: Infinity, duration: 0.4 } : { type: 'spring', stiffness: 300, damping: 20 },
                        rotate: isTyping && !isZooming ? { repeat: Infinity, duration: 0.4 } : { duration: 0.3 },
                        scale: { duration: 0.5 },
                        opacity: { duration: 0.5 }
                    }}
                >
                    {/* Mirrors */}
                    <div className="van-mirror left"></div>
                    <div className="van-mirror right"></div>

                    {/* Body */}
                    <div className="van-main-body">
                        <div className="van-roof-rack"></div>
                        
                        {/* Windshield with reaction */}
                        <motion.div 
                            className="van-windshield"
                            animate={{
                                background: focusField === 'pass' 
                                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                                    : 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)'
                            }}
                        ></motion.div>

                        {/* Headlights with reaction */}
                        <div className={`van-headlight left ${focusField === 'user' ? 'on' : ''}`}></div>
                        <div className={`van-headlight right ${focusField === 'user' ? 'on' : ''}`}></div>

                        {/* Grille & Plate */}
                        <div className="van-grille">
                            <div className="van-plate">BOR4V4N</div>
                        </div>

                        <div className="van-bumper"></div>

                        {/* Exhaust Smoke */}
                        {isTyping && (
                            <div className="van-exhaust">
                                {[...Array(8)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="smoke-particle" 
                                        style={{ 
                                            animationDelay: `${i * 0.1}s`,
                                            left: `${Math.random() * 10 - 5}px`
                                        }}
                                    ></div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Wheels */}
                    <div className={`van-wheel left ${isTyping ? 'wheel-blur' : ''}`}></div>
                    <div className={`van-wheel right ${isTyping ? 'wheel-blur' : ''}`}></div>
                </motion.div>

                {/* Title */}
                <motion.div 
                    className="mt-8 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] uppercase italic">Bora de Van</h1>
                    <div className="flex items-center justify-center gap-3 mt-2">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-500"></div>
                        <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-amber-500">Premium Fleet</p>
                        <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500"></div>
                    </div>
                </motion.div>
            </div>

            {/* Login Form */}
            <motion.div 
                className={`w-full max-w-sm space-y-5 bg-slate-900/40 p-6 sm:p-8 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-20`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                    opacity: isZooming ? 0 : 1, 
                    scale: isZooming ? 0.8 : 1,
                    y: isZooming ? 100 : 0
                }}
                transition={{ duration: 0.5 }}
            >
                <div onFocus={() => setFocusField('user')} onBlur={() => setFocusField(null)}>
                    <Input 
                        theme={{text: 'text-white', radius: 'rounded-xl', border: 'border-white/10'}} 
                        label="ID Operador" 
                        value={username} 
                        onChange={(e:any) => { setUsername(e.target.value); handleTyping(); }} 
                        autoCapitalize="none"
                        placeholder="Seu usuário"
                    />
                </div>
                <div onFocus={() => setFocusField('pass')} onBlur={() => setFocusField(null)}>
                    <Input 
                        theme={{text: 'text-white', radius: 'rounded-xl', border: 'border-white/10'}} 
                        label="Chave de Acesso" 
                        type="password" 
                        value={password} 
                        onChange={(e:any) => { setPassword(e.target.value); handleTyping(); }} 
                        placeholder="••••••"
                    />
                </div>
                
                {geoStatus && (
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] uppercase tracking-widest text-center text-amber-400 font-black"
                    >
                        {geoStatus}
                    </motion.p>
                )}

                <Button 
                    onClick={handlePreLogin}
                    disabled={loading}
                    loading={loading}
                    variant="primary"
                    theme={{ primary: 'bg-amber-500 text-slate-950', radius: 'rounded-xl' }}
                    className="w-full font-black italic uppercase tracking-widest py-4 shadow-[0_0_30px_rgba(251,191,36,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4"
                >
                    Iniciar Viagem
                </Button>

                <div className="text-center mt-4">
                    <button
                        onClick={() => {
                            setShowForgotPassword(true);
                            setForgotPasswordStep('input');
                            setForgotPasswordInput('');
                            setNewPassword('');
                            setToken('');
                        }}
                        className="text-xs text-slate-400 hover:text-amber-400 transition-colors uppercase tracking-wider font-semibold"
                    >
                        Esqueci minha senha
                    </button>
                </div>
            </motion.div>
            
            <p className="text-[9px] text-slate-500 mt-8 relative z-20 font-mono tracking-widest opacity-50">SYSTEM VERSION 4.0.2 // ENCRYPTED SESSION</p>

            <AnimatePresence>
                {showSystemSelection && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 p-6 backdrop-blur-xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[40px] p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500">
                                <Icons.Zap size={40} />
                            </div>

                            <h3 className="text-2xl font-black text-white mb-3 uppercase italic">Múltiplos Sistemas</h3>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                                Identificamos que seu usuário possui acesso a múltiplos sistemas. Em qual deseja entrar agora?
                            </p>

                            <div className="grid grid-cols-1 gap-3 w-full">
                                {matchingUsers.map((u) => (
                                    <button
                                        key={u.system}
                                        onClick={async () => {
                                            setSelectedSystem(u.system);
                                            setShowSystemSelection(false);
                                            let targetEmail = u.email;
                                            if (u.username.toLowerCase() === 'breno') {
                                                targetEmail = 'brenoxt2003@gmail.com';
                                            }
                                            if (!targetEmail) {
                                                notify('Usuário não possui email cadastrado.', 'error');
                                                return;
                                            }
                                            setLoading(true);
                                            try {
                                                setUserEmail(targetEmail);
                                                setCurrentUserUid(u.uid);
                                                const result = await sendToken(targetEmail, u.displayName || u.username, 'login', u.uid);
                                                
                                                if (result && result.trusted) {
                                                    // Device is trusted, skip token input
                                                    startEntrySequence({ latitude: 0, longitude: 0, accuracy: 0 }, u.system);
                                                } else {
                                                    setShowTokenInput(true);
                                                }
                                            } catch (e) {
                                                // Error already notified
                                            }
                                            setLoading(false);
                                        }}
                                        className="w-full group relative overflow-hidden p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-amber-500 hover:border-amber-500 transition-all duration-300 text-left"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-50 group-hover:text-amber-950">Acessar Sistema</span>
                                                <span className="text-lg font-black uppercase italic group-hover:text-amber-950">{u.system}</span>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-amber-950 transition-colors">
                                                <Icons.ArrowRightLeft size={20} />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={() => { setShowSystemSelection(false); setLoading(false); }}
                                className="mt-8 text-xs text-slate-500 hover:text-white transition-colors uppercase font-bold tracking-widest"
                            >
                                Cancelar Login
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOKEN INPUT MODAL */}
            <AnimatePresence>
                {showTokenInput && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-6 backdrop-blur-xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500">
                                <Icons.Key size={40} />
                            </div>

                            <h3 className="text-2xl font-black text-white mb-3 uppercase italic">Verificação</h3>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                                Enviamos um código de 6 dígitos para o seu email ({userEmail}).
                            </p>

                            <div className="w-full mb-6">
                                <Input 
                                    theme={{text: 'text-white text-center text-2xl tracking-[0.5em] font-mono', radius: 'rounded-xl', border: 'border-white/10'}} 
                                    value={token} 
                                    onChange={(e:any) => setToken(e.target.value)} 
                                    placeholder="000000"
                                    maxLength={6}
                                />
                            </div>

                            <Button 
                                onClick={verifyToken}
                                disabled={loading || token.length !== 6}
                                loading={loading}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest"
                            >
                                {loading ? 'Verificando...' : 'Confirmar Código'}
                            </Button>

                            <button 
                                onClick={() => { setShowTokenInput(false); setLoading(false); setToken(''); }}
                                className="mt-6 text-xs text-slate-500 hover:text-white transition-colors uppercase font-bold tracking-widest"
                            >
                                Cancelar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* GEO PROMPT MODAL */}
            <AnimatePresence>
                {showGeoPrompt && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-6 backdrop-blur-xl"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

                            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500">
                                <Icons.Map size={40} />
                            </div>

                            <h3 className="text-2xl font-black text-white mb-3 uppercase italic">Localização</h3>
                            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                                Protocolo de segurança ativado. Precisamos confirmar sua posição geográfica para autorizar o acesso.
                            </p>

                            <Button 
                                onClick={executeGeoLogin}
                                disabled={loading}
                                loading={loading}
                                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest"
                            >
                                {loading ? 'Sincronizando...' : 'Confirmar Posição'}
                            </Button>

                            <button 
                                onClick={() => { setShowGeoPrompt(false); setLoading(false); setGeoStatus(''); }}
                                className="mt-6 text-xs text-slate-500 hover:text-white transition-colors uppercase font-bold tracking-widest"
                            >
                                Abortar
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FORGOT PASSWORD MODAL */}
            <AnimatePresence>
                {showForgotPassword && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/95 p-6 backdrop-blur-2xl"
                    >
                        {/* Background Elements for Forgot Password */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"></div>
                        </div>

                        <motion.div 
                            initial={{ scale: 0.9, y: 20, rotateX: -10 }}
                            animate={{ scale: 1, y: 0, rotateX: 0 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="w-full max-w-md bg-slate-900/80 border border-amber-500/20 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center text-center relative overflow-hidden backdrop-blur-xl"
                        >
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>

                            <div className="w-24 h-24 bg-amber-500/10 rounded-2xl rotate-3 flex items-center justify-center mb-8 text-amber-400 border border-amber-500/20 shadow-inner">
                                <Icons.ShieldAlert size={48} className="-rotate-3" />
                            </div>

                            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Recuperação</h3>
                            <div className="h-1 w-12 bg-amber-500 rounded-full mb-6"></div>
                            
                            {forgotPasswordStep === 'input' && (
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-full">
                                    <p className="text-sm text-slate-400 mb-8 leading-relaxed px-4">
                                        Informe seu usuário ou e-mail vinculado à conta para iniciarmos o protocolo de segurança.
                                    </p>
                                    <div className="w-full mb-6 relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-amber-500/50">
                                            <Icons.User size={20} />
                                        </div>
                                        <input 
                                            className="w-full bg-slate-950/50 border border-amber-500/20 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-600"
                                            value={forgotPasswordInput} 
                                            onChange={(e:any) => setForgotPasswordInput(e.target.value)} 
                                            placeholder="Usuário ou Email"
                                            autoCapitalize="none"
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleForgotPasswordSearch}
                                        disabled={loading || !forgotPasswordInput}
                                        loading={loading}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 uppercase tracking-wider"
                                    >
                                        Localizar Conta
                                    </Button>
                                </motion.div>
                            )}

                            {forgotPasswordStep === 'token' && (
                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full">
                                    <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                                        Código de segurança enviado para <br/><span className="text-amber-400 font-medium">{userEmail}</span>
                                    </p>
                                    <div className="w-full mb-6">
                                        <input 
                                            className="w-full bg-slate-950/50 border border-amber-500/20 text-white text-center text-3xl tracking-[0.5em] font-mono rounded-xl py-4 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-700"
                                            value={token} 
                                            onChange={(e:any) => setToken(e.target.value)} 
                                            placeholder="000000"
                                            maxLength={6}
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleForgotPasswordVerify}
                                        disabled={loading || token.length !== 6}
                                        loading={loading}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 uppercase tracking-wider"
                                    >
                                        Validar Identidade
                                    </Button>
                                </motion.div>
                            )}

                            {forgotPasswordStep === 'new_password' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                                    <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                                        Identidade confirmada. Defina sua nova credencial de acesso.
                                    </p>
                                    <div className="w-full mb-6 relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-amber-500/50">
                                            <Icons.Key size={20} />
                                        </div>
                                        <input 
                                            className="w-full bg-slate-950/50 border border-amber-500/20 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-600"
                                            value={newPassword} 
                                            onChange={(e:any) => setNewPassword(e.target.value)} 
                                            placeholder="Nova Senha (mín. 6 caracteres)"
                                            type="password"
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleForgotPasswordReset}
                                        disabled={loading || newPassword.length < 6}
                                        loading={loading}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 uppercase tracking-wider"
                                    >
                                        Redefinir Acesso
                                    </Button>
                                </motion.div>
                            )}

                            <button 
                                onClick={() => { setShowForgotPassword(false); setLoading(false); }}
                                className="mt-8 text-xs text-slate-500 hover:text-amber-400 transition-colors uppercase font-bold tracking-widest flex items-center gap-2"
                            >
                                <Icons.ArrowLeft size={14} /> Voltar ao Login
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            </div>
        </div>
    );
};
