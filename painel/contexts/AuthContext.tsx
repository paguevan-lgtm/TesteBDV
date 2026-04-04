
import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren, useRef } from 'react';
import { USERS_DB } from '../constants';
import { db, auth } from '../firebase';
import { getDeviceFingerprint, parseUserAgent, getHardwareInfo, getTodayDate } from '../utils';

// Tipagem do Usuário
interface User {
    uid: string;
    username: string;
    role: string;
    displayName: string;
    email?: string;
    system?: string;
    systems?: string[];
    createdBy?: string;
    sessionId?: string;
    ip?: string;
    deviceId?: string;
}

// Tipagem do Contexto
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (u: string, p: string, coords: any, system?: string) => Promise<boolean>;
    findUsersByCredentials: (u: string, p: string) => Promise<User[]>;
    logout: (reason?: string) => void;
    updateActivity: () => void;
    logoutReason: string | null;
    setLogoutReason: (reason: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [logoutReason, setLogoutReason] = useState<string | null>(null);

    // 1. Leitura inicial do token e Auth Anônima
    useEffect(() => {
        const initAuth = async () => {
            // Restore Session
            try {
                const savedSession = localStorage.getItem('nexflow_session');
                if (savedSession) {
                    const parsed = JSON.parse(savedSession);
                    const now = Date.now();
                    
                    // Verifica expiração absoluta (17 horas)
                    const absoluteExpiry = parsed.loginTime + (17 * 60 * 60 * 1000);
                    // Verifica inatividade (6 horas)
                    const inactivityExpiry = parsed.lastActivity + (6 * 60 * 60 * 1000);

                    if (now < absoluteExpiry && now < inactivityExpiry) {
                        setUser(parsed.user);
                    } else {
                        localStorage.removeItem('nexflow_session');
                        if (now >= absoluteExpiry) {
                            setLogoutReason("Login encerrado por motivos de segurança, se ainda esta usando o sistema considere logar novamente");
                        } else {
                            setLogoutReason("Pelo motivo de ficar 6 horas sem nenhuma modificação no site, seu login foi encerrado por inatividade.");
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao restaurar sessão:", error);
                localStorage.removeItem('nexflow_session');
            } finally {
                setIsLoading(false);
            }

            // Firebase Anonymous Auth (Necessário para as Regras de Segurança)
            if (auth) {
                auth.onAuthStateChanged((u: any) => {
                    if (!u) {
                        auth.signInAnonymously().catch((e: any) => {
                            // Ignora erros de configuração se ainda não estiver ativado no console
                            if(e.code !== 'auth/configuration-not-found' && e.code !== 'auth/operation-not-allowed') {
                                console.error("Firebase Auth Error:", e);
                            }
                        });
                    }
                });
            }
        };

        initAuth();
    }, []);

    // 3. Função de Logout
    const logout = (reason?: string) => {
        localStorage.removeItem('nexflow_session');
        setUser(null);
        if (reason) setLogoutReason(reason);
    };

    const lastUpdateRef = useRef<number>(0);

    // Função para atualizar atividade
    const updateActivity = () => {
        if (!user) return;
        const now = Date.now();
        // Throttle para atualizar no máximo a cada 30 segundos
        if (now - lastUpdateRef.current < 30000) return;
        
        lastUpdateRef.current = now;
        const savedSession = localStorage.getItem('nexflow_session');
        if (savedSession) {
            const parsed = JSON.parse(savedSession);
            parsed.lastActivity = now;
            localStorage.setItem('nexflow_session', JSON.stringify(parsed));
        }
    };

    // Timer de verificação forçada (sem refresh)
    useEffect(() => {
        if (!user) return;

        const checkInterval = setInterval(() => {
            const savedSession = localStorage.getItem('nexflow_session');
            if (savedSession) {
                const parsed = JSON.parse(savedSession);
                const now = Date.now();
                
                const absoluteExpiry = parsed.loginTime + (17 * 60 * 60 * 1000);
                const inactivityExpiry = parsed.lastActivity + (6 * 60 * 60 * 1000);

                if (now >= absoluteExpiry) {
                    clearInterval(checkInterval);
                    logout("Login encerrado por motivos de segurança, se ainda esta usando o sistema considere logar novamente");
                } else if (now >= inactivityExpiry) {
                    clearInterval(checkInterval);
                    logout("Pelo motivo de ficar 6 horas sem nenhuma modificação no site, seu login foi encerrado por inatividade.");
                }
            }
        }, 30000); // Checa a cada 30 segundos

        return () => clearInterval(checkInterval);
    }, [user]);

    // NOVO: Listener de Bloqueio em Tempo Real
    useEffect(() => {
        let unsubscribe: any = null;

        const setupBlockListener = async () => {
            // Só ativa o listener se tiver banco de dados
            if (!db) return;

            try {
                const deviceId = await getDeviceFingerprint();
                const blockRef = db.ref(`blocked_devices/${deviceId}`);
                
                // Escuta mudanças em tempo real neste nó
                const callback = blockRef.on('value', (snapshot) => {
                    if (snapshot.exists()) {
                        // Se o nó existir, significa que o dispositivo foi banido
                        // Força logout imediato
                        if (user) {
                            console.warn("Dispositivo banido em tempo real. Deslogando...");
                            logout("Este dispositivo foi bloqueado por um administrador por motivos de segurança.");
                        }
                    }
                });

                unsubscribe = () => blockRef.off('value', callback);
            } catch (e) {
                console.error("Erro ao configurar listener de bloqueio:", e);
            }
        };

        setupBlockListener();

        // Cleanup ao desmontar
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, db]); // Depende de 'user' para reavaliar quando logar/deslogar

    // Helper for Haversine distance (in km)
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
        return R * c;
    };

    // 2. Função de Login (DB First, Fallback to Constant)
    const login = async (u: string, p: string, coords: any, system?: string): Promise<boolean> => {
        try {
            // --- GATHER DEVICE AND LOCATION INFO ---
            const deviceId = await getDeviceFingerprint();
            const uaInfo = parseUserAgent(navigator.userAgent);
            const gpuInfo = getHardwareInfo();
            const currentDeviceInfo = { ...uaInfo, gpu: gpuInfo };
            
            let currentIp = '0.0.0.0';
            let currentLocation: any = { coords: { lat: coords?.latitude, lng: coords?.longitude } };

            // --- SECURITY CHECK (FINGERPRINT ROBUSTO, IP & SIMILARITY) ---
            if (db) {
                // 1. Check Exact Device ID
                const blockedSnap = await db.ref(`blocked_devices/${deviceId}`).once('value');
                if (blockedSnap.exists()) {
                    return false; // Silent Fail
                }

                // 2. Check Similarity across all blocked devices
                const allBlockedSnap = await db.ref('blocked_devices').once('value');
                if (allBlockedSnap.exists()) {
                    const blockedDevices = allBlockedSnap.val();
                    for (const key in blockedDevices) {
                        const blocked = blockedDevices[key];
                        
                        // Check IP match
                        if (blocked.ip && blocked.ip === currentIp && currentIp !== '0.0.0.0') {
                            return false;
                        }

                        // Check Same Username
                        const isSameUser = blocked.username && blocked.username.toLowerCase() === u.toLowerCase();

                        // Check Similarity: Same GPU, Same OS, Same City, Distance
                        const isSameGpu = blocked.deviceInfo?.gpu && blocked.deviceInfo.gpu === currentDeviceInfo.gpu && currentDeviceInfo.gpu !== 'Unknown GPU';
                        const isSameOs = blocked.deviceInfo?.os && blocked.deviceInfo.os === currentDeviceInfo.os;
                        const isSameBrowser = blocked.deviceInfo?.browser && blocked.deviceInfo.browser === currentDeviceInfo.browser;
                        const isSameDeviceType = blocked.deviceInfo?.device && blocked.deviceInfo.device === currentDeviceInfo.device;
                        
                        const blockedCity = blocked.location?.city || blocked.location?.exact_address?.city || blocked.location?.exact_address?.town || blocked.location?.exact_address?.village || blocked.location?.exact_address?.municipality;
                        const currentCity = currentLocation.city || currentLocation.exact_address?.city || currentLocation.exact_address?.town || currentLocation.exact_address?.village || currentLocation.exact_address?.municipality;
                        const isSameCity = blockedCity && currentCity && blockedCity === currentCity;

                        const blockedLat = blocked.location?.coords?.lat;
                        const blockedLng = blocked.location?.coords?.lng;
                        const currentLat = currentLocation.coords?.lat;
                        const currentLng = currentLocation.coords?.lng;
                        
                        const distance = getDistance(blockedLat, blockedLng, currentLat, currentLng);
                        const isVeryClose = distance < 0.2; // Less than 200 meters away

                        // Evasion detection logic
                        let isEvasion = false;
                        let evasionReason = '';

                        if (isSameUser) {
                            isEvasion = true;
                            evasionReason = 'Banido por similaridade (Mesmo usuário tentou logar)';
                        } else if (isSameDeviceType && isSameOs && isSameBrowser && isVeryClose) {
                            isEvasion = true;
                            evasionReason = 'Banido por similaridade (Mesmo aparelho/OS/Browser na mesma localização exata)';
                        } else if (isSameGpu && isSameOs && isSameCity && currentDeviceInfo.gpu !== 'Apple GPU') {
                            isEvasion = true;
                            evasionReason = 'Banido por similaridade (Hardware idêntico na mesma cidade)';
                        }

                        if (isEvasion) {
                            // Automatically ban this new device ID as well
                            await db.ref(`blocked_devices/${deviceId}`).set({
                                reason: evasionReason,
                                blockedBy: 'Sistema',
                                blockedAt: Date.now(),
                                deviceInfo: currentDeviceInfo,
                                location: currentLocation,
                                ip: currentIp,
                                username: u
                            });
                            return false;
                        }
                    }
                }
            }
            // ------------------------------------

            let userData: User | null = null;

            // Garantir Auth Anônima antes de ler o DB (caso o useEffect não tenha terminado)
            if (auth && !auth.currentUser) {
                try { await auth.signInAnonymously(); } catch(e) {}
            }

            // A. Verifica no Firebase Database
            if (db) {
                try {
                    const snapshot = await db.ref('users').once('value');
                    const users = snapshot.val();
                    if (users) {
                        const allUsers = Object.keys(users).map(key => ({ ...users[key], id: key }));
                        const matchingUsers: any[] = [];
                        
                        allUsers.forEach(user => {
                            if (user && user.username && user.pass && user.username.toLowerCase() === u.toLowerCase() && user.pass === p) {
                                if (user.systems && Array.isArray(user.systems)) {
                                    user.systems.forEach((sys: string) => {
                                        matchingUsers.push({ ...user, system: sys });
                                    });
                                } else {
                                    matchingUsers.push(user);
                                }
                            }
                        });

                        let foundUser = null;
                        if (system) {
                            foundUser = matchingUsers.find(user => user.system === system);
                        } else {
                            foundUser = matchingUsers[0];
                        }

                        if (foundUser) {
                            userData = { 
                                uid: foundUser.id || foundUser.uid,
                                username: foundUser.username, 
                                role: foundUser.role,
                                displayName: foundUser.username === 'Breno' ? 'Sistema' : foundUser.username,
                                system: foundUser.system,
                                systems: foundUser.systems,
                                createdBy: foundUser.createdBy,
                                email: foundUser.email
                            };
                        }
                    }
                } catch (dbError) {
                    console.error("Erro leitura login (DB):", dbError);
                }
            }

            // B. Fallback para USERS_DB (Constante Local) se não achou no DB
            if (!userData) {
                const localUser = USERS_DB.find(u_item => 
                    u_item.username.toLowerCase() === u.toLowerCase() && 
                    u_item.pass === p &&
                    (!system || u_item.systems.includes(system))
                );
                if (localUser) {
                    userData = { 
                        uid: 'local_' + u,
                        username: u, 
                        role: localUser.role, 
                        displayName: u === 'Breno' ? 'Sistema' : u,
                        system: system || localUser.systems[0],
                        systems: localUser.systems,
                        createdBy: localUser.createdBy
                    };
                }
            }

            if (userData) {
                let sessionId = '';
                if (db && userData.username !== 'Breno') {
                    sessionId = db.ref('audit_logs').push().key || Date.now().toString();
                }

                const finalUser = { ...userData, sessionId, ip: currentIp, deviceId };

                // Persistência
                const now = Date.now();
                localStorage.setItem('nexflow_session', JSON.stringify({ 
                    user: finalUser, 
                    loginTime: now,
                    lastActivity: now
                }));
                
                // --- LOGGING DE ACESSO COM GEOCODIFICAÇÃO, FINGERPRINT E AUTO-LIMPEZA ---
                (async () => {
                    try {
                        const uaInfo = parseUserAgent(navigator.userAgent);
                        const gpuInfo = getHardwareInfo();

                        const logData: any = {
                            username: finalUser.username,
                            timestamp: Date.now(),
                            ip: '0.0.0.0', // Simplificado para evitar fetch externo
                            device: navigator.userAgent,
                            deviceId: deviceId, 
                            deviceInfo: { ...uaInfo, gpu: gpuInfo } // Adds GPU info to logs
                        };

                        // Geocodificação Reversa (Coords -> Endereço) - Simplificado para usar apenas coords se disponíveis
                        if (coords && coords.latitude && coords.longitude) {
                            logData.location = { coords: { lat: coords.latitude, lng: coords.longitude } };
                        }

                        if (db && finalUser.username !== 'Breno') {
                            // 1. Timeline (Legado/Segurança)
                            const timelineRef = db.ref('access_timeline');
                            await timelineRef.push(logData);

                            // 2. Audit Log (Unificado)
                            if (sessionId) {
                                await db.ref(`audit_logs/${sessionId}`).set({
                                    ...logData,
                                    action: 'Login',
                                    details: `Sessão iniciada via ${logData.deviceInfo?.browser || 'Browser'} (${logData.ip})`,
                                    sessionId: sessionId,
                                    date: getTodayDate()
                                });
                            }
                        }
                        
                        // AUTO-LIMPEZA: Manter apenas os últimos 50 registros
                        try {
                            const timelineRef = db.ref('access_timeline');
                            const snap = await timelineRef.orderByKey().limitToLast(50).once('value');
                                if (snap.exists()) {
                                    let oldestKeyToKeep: string | null = null;
                                    // Firebase retorna em ordem (o primeiro da iteração é o mais antigo do grupo de 50)
                                    snap.forEach((child) => {
                                        if (!oldestKeyToKeep) oldestKeyToKeep = child.key;
                                    });

                                    if (oldestKeyToKeep) {
                                        // Busca tudo que é anterior ao oldestKeyToKeep e deleta
                                        const oldSnap = await timelineRef.orderByKey().endBefore(oldestKeyToKeep).once('value');
                                        if (oldSnap.exists()) {
                                            const updates: any = {};
                                            oldSnap.forEach((child) => {
                                                updates[child.key] = null;
                                            });
                                            await timelineRef.update(updates);
                                            // console.log(`Limpeza concluída. ${Object.keys(updates).length} logs antigos removidos.`);
                                        }
                                    }
                                }
                            } catch (cleanupErr) {
                            console.warn("Erro na limpeza de logs:", cleanupErr);
                        }
                    } catch (err) {
                        console.error("Erro fatal no logging:", err);
                    }
                })();
                // ---------------------------------------------

                setUser(finalUser);
                return true;
            }

        } catch (error) {
            console.error("Login error:", error);
        }
        
        return false;
    };

    const findUsersByCredentials = async (u: string, p: string): Promise<User[]> => {
        const matchingUsers: User[] = [];

        // A. Firebase
        if (db) {
            try {
                const snapshot = await db.ref('users').once('value');
                const users = snapshot.val();
                if (users) {
                    Object.keys(users).forEach(key => {
                        const user = users[key];
                        if (user && user.username && user.pass && user.username.toLowerCase() === u.toLowerCase() && user.pass === p) {
                            if (user.systems && Array.isArray(user.systems)) {
                                user.systems.forEach((sys: string) => {
                                    matchingUsers.push({
                                        uid: key,
                                        username: user.username,
                                        role: user.role,
                                        displayName: user.username === 'Breno' ? 'Sistema' : user.username,
                                        system: sys,
                                        email: user.email,
                                        systems: user.systems,
                                        createdBy: user.createdBy
                                    });
                                });
                            } else {
                                matchingUsers.push({
                                    uid: key,
                                    username: user.username,
                                    role: user.role,
                                    displayName: user.username === 'Breno' ? 'Sistema' : user.username,
                                    system: user.system,
                                    email: user.email,
                                    createdBy: user.createdBy
                                });
                            }
                        }
                    });
                }
            } catch (e) {
                console.error("Erro findUsersByCredentials (DB):", e);
            }
        }

        // B. Local Fallback
        USERS_DB.forEach(localUser => {
            if (localUser.username.toLowerCase() === u.toLowerCase() && localUser.pass === p) {
                localUser.systems.forEach(sys => {
                    const alreadyAdded = matchingUsers.some(mu => mu.username === u && mu.system === sys);
                    if (!alreadyAdded) {
                        matchingUsers.push({
                            uid: 'local_' + u,
                            username: u,
                            role: localUser.role,
                            displayName: u === 'Breno' ? 'Sistema' : u,
                            system: sys,
                            systems: localUser.systems,
                            createdBy: localUser.createdBy
                        });
                    }
                });
            }
        });

        return matchingUsers;
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            isAuthenticated: !!user, 
            isLoading, 
            login, 
            findUsersByCredentials,
            logout, 
            updateActivity, 
            logoutReason, 
            setLogoutReason 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};
