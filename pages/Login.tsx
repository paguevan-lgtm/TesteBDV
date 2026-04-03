
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

            if (users.length > 1) {
                setMatchingUsers(users);
                setShowSystemSelection(true);
                setLoading(false);
                return;
            }

            // Apenas um usuário encontrado
            setLoading(false);
            startEntrySequence({ latitude: 0, longitude: 0, accuracy: 0 });
        } catch (error) {
            console.error("Erro no pre-login:", error);
            setLoading(false);
            notify("Erro ao processar login.", "error");
        }
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
                                        onClick={() => {
                                            setSelectedSystem(u.system);
                                            setShowSystemSelection(false);
                                            startEntrySequence({ latitude: 0, longitude: 0, accuracy: 0 }, u.system);
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

            </div>
        </div>
    );
};
