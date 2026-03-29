
import React, { useState, useEffect } from 'react';
import { Input, Toast, Icons, Button } from '../components/Shared';
import { useAuth } from '../contexts/AuthContext';
import { USERS_DB } from '../constants'; 
import { db, auth } from '../firebase';

export const LoginScreen = ({ onBack }: { onBack?: () => void }) => {
    const { login } = useAuth(); 
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [geoStatus, setGeoStatus] = useState('');
    
    // Notification State
    const [notification, setNotification] = useState({ message: '', type: 'info', visible: false });

    // Animação States
    const [focusField, setFocusField] = useState<'user' | 'pass' | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [isZooming, setIsZooming] = useState(false);
    
    // Geo Modal State
    const [showGeoPrompt, setShowGeoPrompt] = useState(false);

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

    // 1. Primeiro passo: Validar credenciais (Local + DB) e Checar Permissão
    const handlePreLogin = async () => {
        if(!username || !password) return notify("Preencha usuário e senha", "error");
        
        setLoading(true);
        let userExists = false;

        // A. Verificação Local (Constants)
        if (USERS_DB[username] && USERS_DB[username].pass === password) {
            userExists = true;
        }

        // B. Verificação no Banco de Dados (Firebase)
        if (!userExists && db) {
            // FIX: Ensure Auth is active to satisfy DB rules (read auth != null)
            if (auth && !auth.currentUser) {
                try {
                    await auth.signInAnonymously();
                } catch (e: any) {
                    if (e.code !== 'auth/configuration-not-found' && e.code !== 'auth/operation-not-allowed') {
                        console.error("Auth Error (PreLogin):", e);
                    }
                }
            }

            try {
                const snapshot = await db.ref('users').once('value');
                const users = snapshot.val();
                if (users) {
                    // Busca case-insensitive para username, exata para senha
                    const found = Object.values(users).some((u:any) => 
                        u.username && u.username.toLowerCase() === username.toLowerCase() && 
                        u.pass === password
                    );
                    if (found) userExists = true;
                }
            } catch (error) {
                console.error("Erro ao verificar usuário no DB:", error);
            }
        }

        setLoading(false);

        if (!userExists) {
            notify('Acesso negado. Verifique suas credenciais.', 'error');
            return;
        }

        // Exigir geolocalização imediatamente
        if (navigator.permissions) {
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                if (result.state === 'granted') {
                    executeGeoLogin();
                } else {
                    setShowGeoPrompt(true);
                }
            } catch (e) {
                setShowGeoPrompt(true);
            }
        } else {
            setShowGeoPrompt(true);
        }
    };

    // Função centralizada para pegar Geo e Logar
    const executeGeoLogin = () => {
        setLoading(true);
        setGeoStatus('Sincronizando satélites...');

        if (!navigator.geolocation) {
            notify("Seu dispositivo não suporta GPS.", "error");
            setLoading(false);
            setShowGeoPrompt(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // SUCESSO
                const { latitude, longitude, accuracy } = pos.coords;
                setShowGeoPrompt(false); 
                startEntrySequence({ latitude, longitude, accuracy });
            },
            (err) => {
                // ERRO
                console.warn("Geo bloqueada:", err);
                setLoading(false);
                setGeoStatus('');
                // Se falhar (ex: usuario negou no browser mesmo após clicar em permitir no modal), avisa
                notify("Não foi possível obter localização. Verifique as permissões do navegador.", "error");
                // Força o modal a aparecer caso tenha sido ocultado, para tentar de novo
                setShowGeoPrompt(true);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const startEntrySequence = (coords: any) => {
        setGeoStatus('Motor ligado. Iniciando...');
        setIsZooming(true); // Launch animation

        setTimeout(async () => {
            await login(username, password, coords);
        }, 1000); 
    };

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 ${isTyping ? 'typing' : ''} ${isZooming ? 'zooming' : ''} p-6 text-white overflow-hidden`}>
            
            <Toast message={notification.message} type={notification.type} visible={notification.visible} />

            {/* Road Effect Background */}
            <div className="road-container">
                <div className="road-grid"></div>
            </div>

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

            <div className={`mb-4 flex flex-col items-center relative z-20 transition-all duration-500`}>
                
                {/* NEW FIXED MIRROR VAN WRAPPER */}
                <div className={`van-wrapper ${focusField === 'user' ? 'focus-user' : ''} ${focusField === 'pass' ? 'focus-pass' : ''} ${isTyping ? 'engine-on' : ''}`}>
                    
                    {/* Mirrors attached to the wrapper, positioned absolutely behind A-pillars */}
                    <div className="mirror-assembly left">
                        <div className="mirror-housing"><div className="mirror-signal"></div></div>
                        <div className="mirror-arm"></div>
                    </div>
                    <div className="mirror-assembly right">
                        <div className="mirror-housing"><div className="mirror-signal"></div></div>
                        <div className="mirror-arm"></div>
                    </div>

                    <div className="van-body">
                        {/* Roof */}
                        <div className="roof">
                            <div className="marker-lights">
                                <div className="marker-light"></div>
                                <div className="marker-light"></div>
                                <div className="marker-light"></div>
                            </div>
                        </div>

                        {/* Windshield */}
                        <div className="windshield"></div>

                        {/* Fascia */}
                        <div className="front-fascia">
                            <div className="grille-unit">
                                <div className="headlight-unit left">
                                    <div className="drl-strip"></div>
                                    <div className="projector-lens"></div>
                                    <div className="beam-cone left"></div>
                                </div>
                                
                                <div className="main-grille">
                                    <div className="logo-badge"></div>
                                </div>

                                <div className="headlight-unit right">
                                    <div className="drl-strip"></div>
                                    <div className="projector-lens"></div>
                                    <div className="beam-cone right"></div>
                                </div>
                            </div>

                            <div className="bumper">
                                <div className="fog-light"></div>
                                <div className="plate-box">BORADEVAN</div>
                                <div className="fog-light"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-500 ${isZooming ? 'opacity-0 scale-90' : 'opacity-100'}`}>
                    <h1 className="text-3xl font-black mb-1 tracking-tighter text-white drop-shadow-lg text-center uppercase italic">Bora de Van</h1>
                    <div className="flex items-center justify-center gap-2 opacity-60">
                        <div className="h-[1px] w-8 bg-amber-500"></div>
                        <p className="text-[10px] font-bold tracking-[0.3em] uppercase">System v4.0</p>
                        <div className="h-[1px] w-8 bg-amber-500"></div>
                    </div>
                </div>
            </div>

            <div className={`w-full max-w-xs space-y-4 bg-slate-950/80 p-6 rounded-2xl border border-white/5 backdrop-blur-xl shadow-2xl stagger-in d-1 relative z-20 transition-all duration-500 ${isZooming ? 'translate-y-40 opacity-0' : 'opacity-100'}`}>
                <div onFocus={() => setFocusField('user')} onBlur={() => setFocusField(null)}>
                    <Input 
                        theme={{text: 'text-white', radius: 'rounded-lg', border: 'border-white/10'}} 
                        label="ID Operador" 
                        value={username} 
                        onChange={(e:any) => { setUsername(e.target.value); handleTyping(); }} 
                        autoCapitalize="none"
                        placeholder="Nome de usuário"
                    />
                </div>
                <div onFocus={() => setFocusField('pass')} onBlur={() => setFocusField(null)}>
                    <Input 
                        theme={{text: 'text-white', radius: 'rounded-lg', border: 'border-white/10'}} 
                        label="Chave de Acesso" 
                        type="password" 
                        value={password} 
                        onChange={(e:any) => { setPassword(e.target.value); handleTyping(); }} 
                        placeholder="••••••"
                    />
                </div>
                
                {geoStatus && <p className="text-[10px] uppercase tracking-wider text-center text-amber-400 animate-pulse font-bold">{geoStatus}</p>}

                <Button 
                    onClick={handlePreLogin}
                    disabled={loading}
                    loading={loading}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 text-white font-black italic uppercase tracking-wider py-3.5 shadow-lg hover:shadow-orange-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-2"
                >
                    Validar Acesso
                </Button>
            </div>
            
            <p className={`text-[9px] text-slate-500 mt-6 relative z-20 font-mono transition-opacity ${isZooming ? 'opacity-0' : ''}`}>SECURE CONNECTION ESTABLISHED</p>

            {/* GEO PROMPT MODAL */}
            {showGeoPrompt && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-sm bg-[#1e293b] border border-amber-500/30 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
                        
                        {/* Glow effect */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50"></div>

                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 text-amber-500 animate-pulse">
                            <Icons.Map size={32} />
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">Localização Obrigatória</h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            Para segurança da operação, precisamos registrar sua localização exata antes de liberar o painel.
                        </p>

                        <Button 
                            onClick={executeGeoLogin}
                            disabled={loading}
                            loading={loading}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            {loading ? 'Verificando...' : 'Permitir e Entrar'}
                        </Button>

                        <button 
                            onClick={() => { setShowGeoPrompt(false); setLoading(false); setGeoStatus(''); }}
                            className="mt-4 text-xs text-slate-500 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};
