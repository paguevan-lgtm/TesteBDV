
import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { USERS_DB } from '../constants';
import { db, auth } from '../firebase';
import { getDeviceFingerprint, parseUserAgent, getHardwareInfo } from '../utils';

// Tipagem do Usuário
interface User {
    username: string;
    role: string;
    system?: string;
}

// Tipagem do Contexto
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (u: string, p: string, coords: any) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren<{}>) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Leitura inicial do token e Auth Anônima
    useEffect(() => {
        const initAuth = async () => {
            // Restore Session
            try {
                const savedSession = localStorage.getItem('nexflow_session');
                if (savedSession) {
                    const parsed = JSON.parse(savedSession);
                    const now = Date.now();
                    
                    // Verifica expiração (12 horas)
                    if (parsed.expiry && now < parsed.expiry) {
                        setUser(parsed.user);
                    } else {
                        localStorage.removeItem('nexflow_session');
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
    const logout = () => {
        localStorage.removeItem('nexflow_session');
        setUser(null);
    };

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
                            logout();
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
    const login = async (u: string, p: string, coords: any): Promise<boolean> => {
        try {
            // --- GATHER DEVICE AND LOCATION INFO ---
            const deviceId = await getDeviceFingerprint();
            const uaInfo = parseUserAgent(navigator.userAgent);
            const gpuInfo = getHardwareInfo();
            const currentDeviceInfo = { ...uaInfo, gpu: gpuInfo };
            
            let currentIp = 'Detectando...';
            try {
                const ipReq = await fetch('https://api.ipify.org?format=json');
                const ipRes = await ipReq.json();
                if (ipRes.ip) currentIp = ipRes.ip;
            } catch (e) {
                console.warn("Falha ao obter IP", e);
            }

            let currentLocation: any = { coords: { lat: coords?.latitude, lng: coords?.longitude } };
            if (coords && coords.latitude && coords.longitude) {
                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`;
                    const geoReq = await fetch(url, { headers: { 'User-Agent': 'BoraDeVanApp/1.0' } });
                    const geoRes = await geoReq.json();
                    if (geoRes && geoRes.address) {
                        currentLocation = {
                            exact_address: geoRes.address, 
                            display_name: geoRes.display_name,
                            city: geoRes.address.city || geoRes.address.town || geoRes.address.village || geoRes.address.municipality || '',
                            coords: { lat: coords.latitude, lng: coords.longitude }
                        };
                    }
                } catch (e) {}
            }

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
                        if (blocked.ip && blocked.ip === currentIp && currentIp !== 'Detectando...') {
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
                        const foundKey = Object.keys(users).find(key => 
                            users[key].username.toLowerCase() === u.toLowerCase() && 
                            users[key].pass === p
                        );
                        if (foundKey) {
                            userData = { 
                                username: users[foundKey].username, 
                                role: users[foundKey].role,
                                system: users[foundKey].system
                            };
                        }
                    }
                } catch (dbError) {
                    console.error("Erro leitura login (DB):", dbError);
                }
            }

            // B. Fallback para USERS_DB (Constante Local) se não achou no DB
            if (!userData && USERS_DB[u] && USERS_DB[u].pass === p) {
                // @ts-ignore
                userData = { username: u, role: USERS_DB[u].role, system: USERS_DB[u].system };
            }

            if (userData) {
                // Persistência
                const expiry = Date.now() + 12 * 60 * 60 * 1000; // 12 horas
                localStorage.setItem('nexflow_session', JSON.stringify({ user: userData, expiry }));
                
                // --- LOGGING DE ACESSO COM GEOCODIFICAÇÃO, FINGERPRINT E AUTO-LIMPEZA ---
                (async () => {
                    try {
                        const uaInfo = parseUserAgent(navigator.userAgent);
                        const gpuInfo = getHardwareInfo();

                        const logData: any = {
                            username: userData.username,
                            timestamp: Date.now(),
                            ip: 'Detectando...',
                            device: navigator.userAgent,
                            deviceId: deviceId, 
                            deviceInfo: { ...uaInfo, gpu: gpuInfo } // Adds GPU info to logs
                        };

                        // 1. Obter IP Público
                        try {
                            const ipReq = await fetch('https://api.ipify.org?format=json');
                            const ipRes = await ipReq.json();
                            if (ipRes.ip) logData.ip = ipRes.ip;
                        } catch (e) {
                            console.warn("Falha ao obter IP", e);
                        }

                        // 2. Geocodificação Reversa (Coords -> Endereço)
                        if (coords && coords.latitude && coords.longitude) {
                            try {
                                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`;
                                const geoReq = await fetch(url, { headers: { 'User-Agent': 'BoraDeVanApp/1.0' } });
                                const geoRes = await geoReq.json();

                                if (geoRes && geoRes.address) {
                                    logData.location = {
                                        exact_address: geoRes.address, 
                                        display_name: geoRes.display_name,
                                        coords: { lat: coords.latitude, lng: coords.longitude }
                                    };
                                } else {
                                    logData.location = { coords: { lat: coords.latitude, lng: coords.longitude } };
                                }
                            } catch (e) {
                                logData.location = { coords: { lat: coords.latitude, lng: coords.longitude } };
                            }
                        }

                        if (db) {
                            const timelineRef = db.ref('access_timeline');
                            
                            // Adiciona novo log
                            await timelineRef.push(logData);

                            // AUTO-LIMPEZA: Manter apenas os últimos 50 registros
                            try {
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
                        }

                    } catch (err) {
                        console.error("Erro fatal no logging:", err);
                    }
                })();
                // ---------------------------------------------

                setUser(userData);
                return true;
            }

        } catch (error) {
            console.error("Login error:", error);
        }
        
        return false;
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
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
