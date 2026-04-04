import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, auth } from './firebase';
import { THEMES, INITIAL_SP_LIST, BAIRROS, BAIRROS_MIP, DEFAULT_FOLGAS } from './constants';
import { Icons, Toast, PersistentNotifications, ConfirmModal, AlertModal, AdminAuthModal, CommandPalette, QuickCalculator } from './components/Shared';
import { TourGuide } from './components/Tour';
import { LoginScreen } from './pages/Login';
import { getTodayDate, getOperationalDate, getLousaDate, generateUniqueId, callGemini, getAvatarUrl, getBairroIdx, formatDisplayDate, parseDisplayDate, dateAddDays, addMinutes, getWeekNumber, calculateSimilarity } from './utils';

// Context Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import { Sidebar } from './components/Sidebar';
import { GlobalModals } from './components/GlobalModals';

// Pages
import Dashboard from './pages/Dashboard';
import Passageiros from './pages/Passageiros';
import Motoristas from './pages/Motoristas';
import Viagens from './pages/Viagens';
import Agendamentos from './pages/Agendamentos';
import Tabela from './pages/Tabela';
import Financeiro from './pages/Financeiro';
import Achados from './pages/Achados';
import Configuracoes from './pages/Configuracoes';
import FolgasGanchos from './pages/FolgasGanchos';
import GerenciarUsuarios from './pages/GerenciarUsuarios';

import { SubscriptionLock } from './components/SubscriptionLock';

// Componente Interno que consome o Contexto
const AppContent = () => {
    const { user, isAuthenticated, isLoading, logout, updateActivity } = useAuth();
    
    // Listeners de Interação Global para Resetar Timer de Inatividade
    useEffect(() => {
        if (!user) return;

        const handleInteraction = () => {
            updateActivity();
        };

        // Eventos de interação do usuário
        window.addEventListener('mousemove', handleInteraction, { passive: true });
        window.addEventListener('mousedown', handleInteraction, { passive: true });
        window.addEventListener('keydown', handleInteraction, { passive: true });
        window.addEventListener('touchstart', handleInteraction, { passive: true });
        window.addEventListener('scroll', handleInteraction, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('mousedown', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('scroll', handleInteraction);
        };
    }, [user, updateActivity]);
    
    // Estados Globais
    const [isFireConnected, setIsFireConnected] = useState(false);
    const [view, setView] = useState('dashboard');
    const [menuOpen, setMenuOpen] = useState(false);
    const [data, setData] = useState<any>({ passengers: [], drivers: [], trips: [], notes: [], lostFound: [], blocked_ips: [], newsletter: [], users: [], prancheta: [] });
    
    // Estados Específicos
    const [spList, setSpList] = useState<any[]>([]);
    const [rotationBaseDate, setRotationBaseDate] = useState('2026-01-29'); // Data base padrão
    const [tableStatus, setTableStatus] = useState<any>({}); 
    const [lousaOrder, setLousaOrder] = useState<any[]>([]); 
    // generalOrder removido pois agora modificamos a spList diretamente
    const [editName, setEditName] = useState(null);
    const [tempName, setTempName] = useState('');
    const [tempVaga, setTempVaga] = useState('');
    const [tableTab, setTableTab] = useState('geral'); 
    const [mipDayType, setMipDayType] = useState(() => new Date().getDate() % 2 !== 0 ? 'odd' : 'even');
    
    const [currentOpDate, setCurrentOpDate] = useState(getOperationalDate());
    const [lousaDate, setLousaDate] = useState(getLousaDate());
    const [analysisDate, setAnalysisDate] = useState(getOperationalDate());
    
    const [madrugadaData, setMadrugadaData] = useState<any>({}); 
    const [madrugadaList, setMadrugadaList] = useState<string[]>([]); 
    const [tempVagaMadrugada, setTempVagaMadrugada] = useState(''); 
    
    const [cannedMessages, setCannedMessages] = useState<any[]>([]);
    const [tempJustification, setTempJustification] = useState('');
    const [vagaToBlock, setVagaToBlock] = useState<string|null>(null);
    
    // Folgas e Ganchos
    const [swaps, setSwaps] = useState<any>({});
    const [ganchos, setGanchos] = useState<any>({});
    const [folgasDisabled, setFolgasDisabled] = useState(false);
    const [saturdayFolgaDisabled, setSaturdayFolgaDisabled] = useState(false);
    const [customDefaultFolgas, setCustomDefaultFolgas] = useState<any>(null);
    const [saturdayRotation, setSaturdayRotation] = useState<any>(null);
    
    const [uiTicker, setUiTicker] = useState(0);
    
    const currentWeekId = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-W${getWeekNumber(d)}`;
    }, [uiTicker]);

    const dueWeekId = useMemo(() => {
        const d = new Date();
        const day = d.getDay();
        if (day >= 1 && day <= 5) {
            d.setDate(d.getDate() - 7);
        }
        return `${d.getFullYear()}-W${getWeekNumber(d)}`;
    }, [uiTicker]);

    const [pranchetaWeekOffset, setPranchetaWeekOffset] = useState(0);
    const viewedWeekId = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + (pranchetaWeekOffset * 7));
        return `${d.getFullYear()}-W${getWeekNumber(d)}`;
    }, [uiTicker, pranchetaWeekOffset]);

    const tableWeekId = useMemo(() => {
        const d = new Date(currentOpDate + 'T12:00:00');
        return `${d.getFullYear()}-W${getWeekNumber(d)}`;
    }, [currentOpDate]);

    const [currentPranchetaData, setCurrentPranchetaData] = useState<any>({});
    const [viewedPranchetaData, setViewedPranchetaData] = useState<any>({});
    const [duePranchetaData, setDuePranchetaData] = useState<any>({});
    const [themeKey, setThemeKey] = useState('default');
    const [geminiKey, setGeminiKey] = useState(localStorage.getItem('nexflow_gemini_key') || '');
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('nexflow_sound_enabled') !== 'false');
    const [popupsEnabled, setPopupsEnabled] = useState(() => localStorage.getItem('nexflow_popups_enabled') !== 'false');
    
    const [ipHistory, setIpHistory] = useState<any[]>([]);
    const [ipLabels, setIpLabels] = useState<any>({});
    
    const [deletionCount, setDeletionCount] = useState(0);
    const [deletedItemsBuffer, setDeletedItemsBuffer] = useState<any[]>([]);
    const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
    const [adminAuthModal, setAdminAuthModal] = useState({ isOpen: false });
    
    useEffect(() => {
        setDeletionCount(0);
        setDeletedItemsBuffer([]);
        setIsAdminAuthorized(false);
    }, [user?.username]);

    const theme = useMemo(() => THEMES[themeKey] || THEMES.default, [themeKey]);

    useEffect(() => {
        if (theme && theme.palette && theme.palette.length > 0) {
            const primaryColor = theme.palette[0];
            const hoverColor = theme.palette[1] || primaryColor;
            document.documentElement.style.setProperty('--scrollbar-color', primaryColor);
            document.documentElement.style.setProperty('--scrollbar-hover-color', hoverColor);
        }
    }, [theme]);

    const [billingDate, setBillingDate] = useState(new Date());
    const [pricePerPassenger, setPricePerPassenger] = useState(4);
    const [pranchetaValue, setPranchetaValue] = useState(20); // Default value

    // Modais e Formulários
    const [modal, setModal] = useState<string|null>(null); 
    const [aiModal, setAiModal] = useState(false);
    const [showNewsModal, setShowNewsModal] = useState(false); // Modal de Novidades
    const [latestNews, setLatestNews] = useState<any>(null); // Última novidade para exibir

    const [aiInput, setAiInput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPassengerQueue, setAiPassengerQueue] = useState<any[]>([]);
    const [aiPassengerIndex, setAiPassengerIndex] = useState(0);
    const aiPassengerQueueRef = useRef(aiPassengerQueue);
    const aiPassengerIndexRef = useRef(aiPassengerIndex);

    useEffect(() => {
        aiPassengerQueueRef.current = aiPassengerQueue;
    }, [aiPassengerQueue]);

    useEffect(() => {
        aiPassengerIndexRef.current = aiPassengerIndex;
    }, [aiPassengerIndex]);
    const [isListening, setIsListening] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [suggestedTrip, setSuggestedTrip] = useState<any>(null);
    const [searchId, setSearchId] = useState('');
    const [editingTripId, setEditingTripId] = useState<string|null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('Ativo');
    
    const [ipReason, setIpReason] = useState('');
    const [ipToBlock, setIpToBlock] = useState('');
    const [daysRemaining, setDaysRemaining] = useState<string>('');
    const [isNearExpiration, setIsNearExpiration] = useState(false);
    const [isRecurringActive, setIsRecurringActive] = useState(false);
    const [isSystemSelectorExpanded, setIsSystemSelectorExpanded] = useState(true);
    const [subData, setSubData] = useState<any>(null);
    const [systemContext, setSystemContext] = useState('Pg');

    const getFolgasForDate = useCallback((targetDateStr: string) => {
        const tableSystemContext = (user?.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        if (folgasDisabled || tableSystemContext !== 'Pg') return {};
        
        // Use customDefaultFolgas if available, otherwise fallback to DEFAULT_FOLGAS
        const baseFolgas = customDefaultFolgas || DEFAULT_FOLGAS;
        
        // Deep clone to avoid mutating the source
        const result: any = {};
        Object.keys(baseFolgas).forEach(day => {
            const dayFolgas = (baseFolgas as any)[day];
            result[day] = Array.isArray(dayFolgas) ? [...dayFolgas] : [];
        });

        // Saturday Rotation Logic
        const SATURDAY_CYCLE = ['QUINTA', 'TERÇA', 'QUARTA'];
        if (saturdayRotation && !saturdayFolgaDisabled) {
            const { baseDate, baseWeekday } = saturdayRotation;
            const base = new Date(baseDate + 'T12:00:00');
            const cycleStartIdx = SATURDAY_CYCLE.indexOf(baseWeekday);
            
            if (cycleStartIdx !== -1) {
                const target = new Date(targetDateStr + 'T12:00:00');
                const day = target.getDay();
                const diff = (6 - day + 7) % 7;
                const sat = new Date(target);
                sat.setDate(target.getDate() + diff);
                
                const diffTime = sat.getTime() - base.getTime();
                const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));
                
                const idx = (cycleStartIdx + diffWeeks) % SATURDAY_CYCLE.length;
                const normalizedIdx = idx < 0 ? (idx + SATURDAY_CYCLE.length) % SATURDAY_CYCLE.length : idx;
                
                const currentSaturdayWeekday = SATURDAY_CYCLE[normalizedIdx];
                if (currentSaturdayWeekday) {
                    const weekdayFolgas = (baseFolgas as any)[currentSaturdayWeekday];
                    result['SÁBADO'] = Array.isArray(weekdayFolgas) ? [...weekdayFolgas] : [];
                }
            }
        } else if (saturdayFolgaDisabled) {
            // If Saturday folga is disabled, clear it
            result['SÁBADO'] = [];
        }

        Object.entries(swaps).forEach(([vaga, newDay]: [string, any]) => {
            if (!newDay) return;
            
            Object.keys(result).forEach(day => {
                // Saturday is independent of swaps
                if (result[day] && day !== 'SÁBADO') {
                    result[day] = result[day].filter((v: string) => v !== vaga);
                }
            });
            
            // Saturday is independent of swaps
            if (newDay !== 'SÁBADO' && result[newDay]) {
                result[newDay].push(vaga);
            }
        });
        return result;
    }, [folgasDisabled, saturdayFolgaDisabled, swaps, systemContext, saturdayRotation, customDefaultFolgas]);

    const effectiveFolgas = useMemo(() => {
        return getFolgasForDate(currentOpDate);
    }, [getFolgasForDate, currentOpDate]);

    const billingData = useMemo(() => {
        const trips = data.trips || [];
        const month = billingDate.getMonth();
        const year = billingDate.getFullYear();
        
        const filtered = trips.filter((t: any) => {
            if (!t.date) return false;
            const d = new Date(t.date + 'T12:00:00');
            return d.getMonth() === month && d.getFullYear() === year;
        });

        const groups: any = {};
        let pending = 0;
        let paid = 0;

        filtered.forEach((t: any) => {
            // Calculate value if not present or 0
            let val = Number(t.value) || 0;
            if (val === 0 && !t.isExtra) {
                let pCount = 0;
                if (t.isMadrugada) {
                    pCount = t.pCountSnapshot !== undefined ? parseInt(t.pCountSnapshot || 0) : parseInt(t.pCount || 0);
                } else {
                    if (t.pCountSnapshot !== undefined && t.pCountSnapshot !== null) {
                        pCount = parseInt(t.pCountSnapshot || 0);
                    } else if (t.passengersSnapshot) {
                        pCount = t.passengersSnapshot.reduce((acc: number, p: any) => acc + parseInt(p.passengerCount || 1), 0);
                    } else {
                        pCount = (data.passengers || []).filter((p: any) => (t.passengerIds || []).includes(p.realId || p.id)).reduce((a: number, b: any) => a + parseInt(b.passengerCount || 1), 0);
                    }
                }
                const unitPrice = Number(t.pricePerPassenger) || Number(t.ticketPrice) || (pricePerPassenger || 4);
                val = pCount * unitPrice;
            }

            const isPaid = t.paymentStatus === 'Pago';
            if (isPaid) paid += val;
            else pending += val;

            if (!groups[t.date]) groups[t.date] = { date: t.date, totalValue: 0, trips: [] };
            groups[t.date].totalValue += val;
            groups[t.date].trips.push({ ...t, value: val, isPaid });
        });

        return {
            summary: { pending, paid },
            groups: Object.values(groups).sort((a: any, b: any) => b.date.localeCompare(a.date))
        };
    }, [data.trips, data.passengers, billingDate, pricePerPassenger]);

    const [undoAction, setUndoAction] = useState<any>(null);
    const [undoTimer, setUndoTimer] = useState(0);
    const undoTimeoutRef = useRef<any>(null);
    const undoIntervalRef = useRef<any>(null);

    const triggerUndo = (action: () => void, message: string) => {
        if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
        
        setUndoAction({ action, message });
        setUndoTimer(5);

        undoIntervalRef.current = setInterval(() => {
            setUndoTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(undoIntervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        undoTimeoutRef.current = setTimeout(() => {
            setUndoAction(null);
            clearInterval(undoIntervalRef.current);
        }, 5000);
    };

    const handleUndo = () => {
        if (undoAction?.action) {
            undoAction.action();
            setUndoAction(null);
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
            if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
            notify("Ação desfeita!", "success");
        }
    };

    useEffect(() => {
        if (systemContext === 'Mip') {
            setTableTab('mip6');
        } else {
            setTableTab('geral');
        }
    }, [systemContext]);

    // Premium Utils
    const [cmdOpen, setCmdOpen] = useState(false);
    const [calcOpen, setCalcOpen] = useState(false);

    // Notificações e Confirmações
    const [notification, setNotification] = useState({ message: '', type: 'info', visible: false, image: null as string | null });
    const [persistentNotifications, setPersistentNotifications] = useState<{id: string, message: string}[]>([]);
    const [confirmState, setConfirmState] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger' });
    const [alertState, setAlertState] = useState<any>({ isOpen: false, title: '', message: '', type: 'warning' });

    // Tour
    const [runTour, setRunTour] = useState(false);
    const [tourStep, setTourStep] = useState(0);

    const DEFAULT_MENU_ITEMS = useMemo(() => {
        const items = [
            {id:'dashboard',l:'Dashboard',i:Icons.Home}, 
            {id:'appointments', l:'Agendamentos', i:Icons.Calendar}, 
            {id:'passengers',l:'Passageiros',i:Icons.Users}, 
            {id:'table', l: 'Tabela', i: Icons.List}, 
            {id:'drivers',l:'Motoristas',i:Icons.Van}, 
            {id:'trips',l:'Viagens',i:Icons.Map}, 
            {id:'billing', l:'Cobrança', i:Icons.Dollar}, 
            {id:'lostFound', l:'Achados e Perdidos', i:Icons.Box},
            {id:'folgasGanchos', l:'Folgas e Ganchos', i:Icons.Calendar}
        ];

        return items;
    }, [user]);

    const [orderedMenuItems, setOrderedMenuItems] = useState(() => {
        const saved = localStorage.getItem(`menu_order_${user?.username}`);
        if (saved) {
            try {
                const order = JSON.parse(saved);
                return [...DEFAULT_MENU_ITEMS].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
            } catch (e) {
                return DEFAULT_MENU_ITEMS;
            }
        }
        return DEFAULT_MENU_ITEMS;
    });

    // Update ordered menu items when DEFAULT_MENU_ITEMS changes (e.g. user login)
    useEffect(() => {
        const saved = localStorage.getItem(`menu_order_${user?.username}`);
        if (saved) {
            try {
                const order = JSON.parse(saved);
                setOrderedMenuItems([...DEFAULT_MENU_ITEMS].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)));
            } catch (e) {
                setOrderedMenuItems(DEFAULT_MENU_ITEMS);
            }
        } else {
            setOrderedMenuItems(DEFAULT_MENU_ITEMS);
        }
    }, [DEFAULT_MENU_ITEMS, user?.username]);

    const TOUR_STEPS = [
        { 
            title: "Bem-vindo ao Bora de Van! 🚐", 
            content: "O sistema mais completo para gestão de lotação e fretamento. Vamos te mostrar como organizar sua rotina, economizar tempo e profissionalizar seu atendimento em poucos minutos!", 
            target: null 
        },
        { 
            title: "Menu Inteligente & Flexível", 
            content: "Aqui você acessa todas as ferramentas. DICA: Você pode segurar e arrastar os ícones para reorganizar o menu conforme sua preferência de uso diário!", 
            target: "#sidebar-nav, #mobile-sidebar", 
            placement: 'right' 
        },
        { 
            title: "Dashboard: Sua Central de Comando", 
            content: "Acompanhe o crescimento do seu negócio com estatísticas em tempo real. Veja quantos passageiros estão ativos, o total de viagens realizadas e até uma estimativa do seu faturamento diário!", 
            target: "#dashboard-stats", 
            placement: 'top' 
        },
        { 
            title: "Cadastro Mágico com IA ✨", 
            content: "A tecnologia a seu favor! Não perca tempo preenchendo formulários longos. Basta digitar ou ditar a mensagem do cliente e nossa IA identifica nome, bairro, horário e cria o agendamento sozinha.", 
            target: "#btn-magic-create", 
            view: "dashboard", 
            placement: 'top' 
        },
        { 
            title: "Agendamentos Fixos", 
            content: "Gerencie quem viaja com você todos os dias. Aqui ficam os passageiros com horários definidos que ainda não foram alocados em uma viagem específica.", 
            target: "#menu-btn-appointments-mobile, #menu-btn-appointments", 
            view: "appointments", 
            placement: 'right' 
        },
        { 
            title: "Base de Passageiros", 
            content: "Seu cadastro completo de clientes. Pesquise por nome ou bairro, ligue diretamente pelo WhatsApp e veja o histórico de cada um de forma organizada.", 
            target: "#menu-btn-passengers, #menu-btn-passengers-mobile", 
            view: "passengers", 
            placement: 'right' 
        },
        { 
            title: "Tabela e Lousa Digital", 
            content: "O coração da operação! Controle a fila de motoristas, quem já baixou, quem está confirmado e quem está na espera (Lousa). Tudo atualiza instantaneamente para todos os usuários.", 
            target: "#menu-btn-table-mobile, #menu-btn-table", 
            view: "table", 
            placement: 'right' 
        },
        { 
            title: "Abas de Operação", 
            content: "Alterne rapidamente entre a Tabela Geral, Confirmados, Lousa e Madrugada. Cada aba tem uma função específica para organizar o fluxo de saída das vans.", 
            target: "#table-tabs", 
            placement: 'bottom' 
        },
        { 
            title: "Gestão Ativa de Viagens", 
            content: "Crie viagens, aloque motoristas e envie a lista de passageiros formatada diretamente para o WhatsApp do motorista com apenas um clique!", 
            target: "#menu-btn-trips-mobile, #menu-btn-trips", 
            view: "trips", 
            placement: 'right' 
        },
        { 
            title: "Histórico e Relatórios", 
            content: "Nada se perde! Acesse o histórico de meses anteriores e gere relatórios automáticos em TXT para conferência de faturamento e produtividade.", 
            target: "#history-section", 
            view: "trips" 
        },
        { 
            title: "Financeiro & Cobrança 💰", 
            content: "Mantenha o caixa em dia. O sistema identifica quem já pagou e quem está pendente. Você pode cobrar os inadimplentes no WhatsApp de forma profissional e rápida.", 
            target: "#menu-btn-billing-mobile, #menu-btn-billing", 
            view: "billing", 
            placement: 'right' 
        },
        { 
            title: "Achados e Perdidos 📦", 
            content: "Um diferencial no seu atendimento! Registre itens esquecidos nas vans e localize os donos rapidamente, evitando confusões e reclamações.", 
            target: "#menu-btn-lostFound, #menu-btn-lostFound-mobile", 
            view: "lostFound", 
            placement: 'right' 
        },
        { 
            title: "Folgas e Ganchos 🗓️", 
            content: "Controle a escala dos motoristas. Marque folgas programadas ou aplique 'ganchos' (suspensões temporárias) para manter a ordem na fila da lousa digital.", 
            target: "#menu-btn-folgasGanchos-mobile, #menu-btn-folgasGanchos", 
            view: "folgasGanchos", 
            placement: 'right' 
        },
        { 
            title: "Seu Perfil e Configurações ⚙️", 
            content: "Aqui você gerencia sua conta, altera sua senha, personaliza as cores do sistema e acessa as configurações avançadas de faturamento e permissões.", 
            target: "#menu-btn-user, #menu-btn-user-mobile", 
            view: "settings", 
            placement: 'top' 
        },
        { 
            title: "Tudo Pronto! 🚀", 
            content: "Você agora conhece o básico do Bora de Van. Explore cada tela, faça testes e veja como sua operação ficará muito mais organizada. Sucesso na rodagem!", 
            target: null 
        }
    ];

    const timerRef = useRef<any>(null);
    const touchStartPos = useRef({ x: 0, y: 0 });
    const globalTouchRef = useRef({ x: 0, y: 0 });

    // --- LOGIC EXTRACTED HELPERS ---
    const notify = (msg: string, type: 'success' | 'error' | 'info' | 'update' | 'delete' | 'warning' = 'success', image: string | null = null) => {
        // Map types to visual styles
        const visualType = (type === 'update' || type === 'delete') ? (type === 'update' ? 'success' : 'error') : type;
        
        if (popupsEnabled) {
            setNotification({ message: msg, type: visualType as any, visible: true, image });
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 3000);
        }
        
        // Play sound based on type if enabled
        if (soundEnabled) {
            let audioRef = null;
            if (type === 'success') audioRef = successAudioRef;
            else if (type === 'update') audioRef = updateAudioRef;
            else if (type === 'delete') audioRef = deleteAudioRef;
            else if (type === 'error') audioRef = errorAudioRef;
            else if (type === 'info') audioRef = infoAudioRef;

            if (audioRef && audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.warn("Sound blocked:", e));
            }
        }
    };

    const addPersistentNotification = (msg: string) => {
        setPersistentNotifications(prev => [...prev, { id: Date.now().toString(), message: msg }]);
    };

    const removePersistentNotification = (id: string) => {
        setPersistentNotifications(prev => prev.filter(n => n.id !== id));
    };

    const showAlert = (title: string, message: string, type: 'warning' | 'danger' | 'info' = 'warning') => {
        setAlertState({ isOpen: true, title, message, type });
    };

    const requestConfirm = (title: string, message: string, action: () => void, type: 'danger' | 'info' = 'danger') => {
        setConfirmState({ isOpen: true, title, message, onConfirm: () => { action(); setConfirmState((prev:any) => ({ ...prev, isOpen: false })); }, type });
    };

    // Listener de Assinatura Global
    useEffect(() => {
        if (!db || !user) return;
        const subRef = db.ref('system_settings/subscription');
        const unsub = subRef.on('value', (snap) => {
            const data = snap.val();
            setSubData(data);

            // Cleanup: If any expiration is excessively high (old global data), reset it
            const nowTime = Date.now();
            const maxDays = 1000;
            const maxMs = maxDays * 24 * 60 * 60 * 1000;
            
            const keysToCheck = ['expiresAt', 'expiresAt_Pg', 'expiresAt_Mip', 'expiresAt_Sv'];
            keysToCheck.forEach(key => {
                const val = data?.[key];
                if (val && (new Date(val).getTime() - nowTime > maxMs)) {
                    console.log(`Resetting excessive expiration for ${key}`);
                    db.ref(`system_settings/subscription/${key}`).set(null);
                }
            });
            
            // Determine the correct expiration date based on the system context
            let targetExp = null;
            
            const systemExp = data?.[`expiresAt_${systemContext}`];

            if (systemContext === 'Mistura') {
                targetExp = data?.expiresAt;
            } else {
                // Only use specific system expiration
                targetExp = systemExp;
            }
            
            if (targetExp) {
                const expiresAt = new Date(targetExp);
                const now = new Date();
                const diffTime = expiresAt.getTime() - now.getTime();
                
                if (diffTime <= 0) {
                    setDaysRemaining("Expirado");
                    setIsNearExpiration(true);
                } else {
                    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                    const totalHours = Math.floor(diffTime / (1000 * 60 * 60));

                    if (days > 0) {
                        setDaysRemaining(`${days} dias (${totalHours}h)`);
                    } else {
                        setDaysRemaining(`${hours}h ${minutes}m`);
                    }
                    
                    // Check if recurring payment is active
                    let recurringActive = false;
                    if (systemContext === 'Mistura') {
                        recurringActive = data.isRecurring_Mistura || false;
                    } else {
                        recurringActive = data[`isRecurring_${systemContext}`] || false;
                    }
                    setIsRecurringActive(recurringActive);

                    // Only show "Near Expiration" if NOT recurring
                    setIsNearExpiration(days <= 5 && !recurringActive);
                }
            } else {
                setDaysRemaining("Sem Assinatura");
                setIsNearExpiration(true);
            }
        });
        return () => subRef.off('value', unsub);
    }, [user, systemContext]);

    const renewalDate = useMemo(() => {
        if (!subData) return null;
        const systemExp = subData[`expiresAt_${systemContext}`];
        
        let dateStr = null;
        if (systemContext === 'Mistura') {
            dateStr = subData.expiresAt;
        } else {
            // Only use specific system expiration
            dateStr = systemExp;
        }
        
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString('pt-BR');
    }, [subData, systemContext]);

    const getNextId = (col: string) => { 
        const list = data[col] || []; 
        if (list.length === 0) return "1"; 
        if (col === 'notes' || col === 'lostFound' || col === 'blocked_ips' || col === 'newsletter' || col === 'users') return Date.now().toString(); 
        
        // Lowest Available ID Logic
        // Ensure we are working with the most up-to-date data if possible, 
        // but here we rely on the 'data' state which is synced with Firebase.
        const existingIds = new Set(list.map((item: any) => {
            // Se for ID composto (Mistura), pega apenas a parte numérica
            const idStr = String(item.id);
            const id = idStr.includes('_') ? idStr.split('_')[1] : idStr;
            return parseInt(id);
        }).filter((n: number) => !isNaN(n)));

        let nextId = 1;
        while (existingIds.has(nextId)) {
            nextId++;
        }
        return nextId.toString();
    };

    // Helper específico para Viagens para garantir sequencial sem falhas
    const generateNextTripId = () => {
        return getNextId('trips');
    };

    const logAction = useCallback(async (action: string, details: string) => {
        if (!user || user.username === 'Breno' || !db) return;
        
        const logEntry = {
            username: user.username,
            sessionId: user.sessionId || '',
            ip: user.ip || '',
            deviceId: user.deviceId || '',
            action,
            details,
            timestamp: Date.now(),
            date: getTodayDate()
        };
        
        try {
            await db.ref('audit_logs').push(logEntry);
        } catch (e) {
            console.error("Error logging action:", e);
        }
    }, [user]);

    const dbOp = async (type: string, node: string, payload: any) => {
        // Atualiza atividade ao realizar qualquer operação no banco
        updateActivity();

        if(!db) return notify("Sem conexão DB.", "error");

        // Função para remover valores undefined recursivamente (Firebase não aceita undefined)
        const cleanPayload = (obj: any): any => {
            if (obj === null || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) return obj.map(cleanPayload);
            return Object.fromEntries(
                Object.entries(obj)
                    .filter(([_, v]) => v !== undefined)
                    .map(([k, v]) => [k, cleanPayload(v)])
            );
        };

        if (payload && typeof payload === 'object') {
            payload = cleanPayload(payload);
        }

        let targetSystem = systemContext;
        let targetId = payload?.id;

        // Se estivermos no modo Mistura e for uma cobrança extra, salvamos no Pg por padrão
        if (targetSystem === 'Mistura' && payload?.isExtra) {
            targetSystem = 'Pg';
        }

        // Se o ID tem prefixo de sistema (ex: Pg_1), extrai o sistema e o ID real
        if (targetId && typeof targetId === 'string' && targetId.includes('_')) {
            const parts = targetId.split('_');
            if (['Pg', 'Mip', 'Sv'].includes(parts[0])) {
                targetSystem = parts[0];
                targetId = targetId.substring(parts[0].length + 1);
                // Atualizamos o payload com o ID real para salvar corretamente no Firebase
                if (typeof payload === 'object') {
                    payload = { ...payload, id: targetId };
                }
            }
        }

        if (targetSystem === 'Mistura' && ['passengers', 'drivers', 'trips', 'lostFound'].includes(node)) {
            return notify("Selecione um sistema (Pg, Mip, Sv) para criar ou editar.", "error");
        }

        const getPath = (system: string, nodeName: string) => {
            const tableSystemContext = (user.username === 'Breno' && system === 'Mistura') ? 'Pg' : system;

            if (['passengers', 'drivers', 'trips', 'lostFound'].includes(nodeName)) {
                return system === 'Pg' ? nodeName : `${system}/${nodeName}`;
            }
            if (nodeName === 'lousa_order') {
                return tableSystemContext === 'Pg' ? `daily_tables/${lousaDate}/lousaOrder` : `${tableSystemContext}/daily_tables/${lousaDate}/lousaOrder`;
            }
            if (nodeName === 'madrugada_order') {
                return tableSystemContext === 'Pg' ? 'madrugada_config/list' : `${tableSystemContext}/madrugada_config/list`;
            }
            if (nodeName === 'drivers_table_list' || nodeName === 'table_status' || nodeName === 'madrugada_config/list' || nodeName.startsWith('daily_tables') || nodeName.startsWith('system_settings')) {
                if (tableSystemContext === 'Mip' && nodeName === 'drivers_table_list') {
                    const timeSuffix = tableTab === 'mip18' ? '18' : '6';
                    return `Mip/drivers_${timeSuffix}_${mipDayType}`;
                }
                return tableSystemContext === 'Pg' ? nodeName : `${tableSystemContext}/${nodeName}`;
            }
            if (nodeName === 'preferences') {
                return `user_data/${user.username}/preferences`;
            }
            if (nodeName === 'canned_messages_config/list') {
                return system === 'Pg' ? nodeName : `${system}/${nodeName}`;
            }
            return nodeName;
        };

        try {
            const path = getPath(targetSystem, node);
            const ref = db.ref(path);

            if (type === 'create') {
                if (user?.role === 'operador') {
                    setDeletionCount(0);
                    setDeletedItemsBuffer([]);
                }
                const nextId = (node === 'passengers' || node === 'drivers' || node === 'trips') ? getNextId(node) : (targetId || Date.now().toString());
                const finalId = targetId && (node === 'trips' || node === 'newsletter' || node === 'users') ? targetId : nextId;
                
                // Add pricePerPassenger snapshot to trips
                let finalPayload = { ...payload, id: finalId, createdAt: new Date().toISOString() };
                if (node === 'trips') {
                    finalPayload.pricePerPassenger = pricePerPassenger;
                }

                await ref.child(finalId).set(finalPayload);
                
                // Logging
                if (node === 'passengers') logAction('Criou Passageiro', `Nome: ${finalPayload.name}`);
                else if (node === 'drivers') logAction('Criou Motorista', `Nome: ${finalPayload.name}`);
                else if (node === 'trips') logAction('Criou Viagem', `Motorista: ${finalPayload.driverName} - ${finalPayload.time}`);
                else if (node === 'lostFound') logAction('Criou Achados e Perdidos', `Item: ${finalPayload.item}`);
                else if (node === 'users') logAction('Criou Usuário', `Username: ${finalPayload.username}`);
                else if (node === 'notes') logAction('Criou Nota', `Texto: ${finalPayload.text?.substring(0, 30)}...`);

                if (node !== 'notes') notify("Salvo com sucesso!", "success");
            } else if (type === 'update') {
                if (user?.role === 'operador') {
                    setDeletionCount(0);
                    setDeletedItemsBuffer([]);
                }
                if (targetId) {
                    await ref.child(targetId).update(payload);
                } else {
                    // Para listas completas (como drivers_table_list), usamos set para evitar merge de índices
                    if (node === 'drivers_table_list' || node === 'madrugada_config/list' || node === 'canned_messages_config/list' || node === 'lousa_order' || node === 'madrugada_order') {
                        await ref.set(payload);
                    } else {
                        await ref.update(payload);
                    }
                }

                // Logging Updates
                if (node === 'lousa_order') logAction('Reorganizou Lousa', `Data: ${lousaDate}`);
                else if (node === 'madrugada_order') logAction('Reorganizou Madrugada', `Data: ${currentOpDate}`);
                else if (node === 'canned_messages_config/list') logAction('Editou Mensagens Prontas', 'Lista atualizada');
                else if (node.startsWith('system_settings')) logAction('Editou Configurações', `Configuração: ${node}`);
                else if (node === 'passengers') {
                    const pName = payload.name || data.passengers.find((p:any) => p.id === targetId)?.name || 'ID '+targetId;
                    if (payload.status === 'Bloqueado') logAction('Bloqueou Passageiro', `Nome: ${pName}`);
                    else if (payload.status === 'Ativo' && payload.blockReason === null) logAction('Desbloqueou Passageiro', `Nome: ${pName}`);
                    else if (payload.name) logAction('Editou Passageiro', `Nome: ${payload.name}`);
                }
                else if (node === 'drivers' && payload.name) logAction('Editou Motorista', `Nome: ${payload.name}`);
                else if (node === 'drivers_table_list') logAction('Editou Tabela Motoristas', 'Lista de motoristas na tabela atualizada');
                else if (node === 'table_status') logAction('Alterou Status Tabela', 'Status da tabela atualizado');
                else if (node === 'notes') logAction('Editou Nota', `Status: ${payload.completed ? 'Concluída' : 'Pendente'}`);
                else if (node === 'trips') {
                    if (payload.paymentStatus === 'Pago') logAction('Marcou como Pago', `Viagem: ${payload.driverName || 'ID '+targetId}`);
                    else if (payload.paymentStatus === 'Pendente') logAction('Removeu Pagamento', `Viagem: ${payload.driverName || 'ID '+targetId}`);
                    else if (payload.status) logAction('Alterou Status Viagem', `Viagem: ${payload.driverName || 'ID '+targetId} -> ${payload.status}`);
                    else logAction('Editou Viagem', `Motorista: ${payload.driverName || 'ID '+targetId}`);
                }
                else if (node === 'lostFound') logAction('Editou Achados e Perdidos', `Item: ${payload.item || 'ID '+targetId}`);
                else if (node === 'users') logAction('Editou Usuário', `Username: ${payload.username || 'ID '+targetId}`);

                if (node !== 'preferences') notify("Atualizado!", "update");
            } else if (type === 'delete') {
                // Lógica de segurança para Operador: limite de 3 exclusões seguidas de passageiros/motoristas
                if (user?.role === 'operador' && (node === 'passengers' || node === 'drivers')) {
                    if (isAdminAuthorized) {
                        // Se já está autorizado por um admin, permite a exclusão sem incrementar o contador de risco
                    } else if (deletionCount >= 3) {
                        setAlertState({
                            isOpen: true,
                            title: "Segurança do Sistema",
                            message: "Comportamento estranho detectado os dados excluídos serão recuperados, para apagar diversos dados do sistema logue com uma conta admin",
                            type: "danger"
                        });
                        
                        // Recuperar dados do buffer
                        for (const item of deletedItemsBuffer) {
                            const restorePath = getPath(item.system, item.node);
                            await db.ref(restorePath).child(item.id).set(item.data);
                        }
                        
                        // Resetar buffer e contador
                        setDeletedItemsBuffer([]);
                        setDeletionCount(0);
                        
                        // Solicitar autorização de admin
                        setAdminAuthModal({ isOpen: true });
                        
                        return; // Interrompe a 4ª exclusão
                    }
                }

                // Se o payload for o ID (string), verificamos se tem prefixo
                let idToDelete = payload;
                let deleteSystem = targetSystem;
                let deleteId = idToDelete;

                if (typeof idToDelete === 'string' && idToDelete.includes('_')) {
                    const parts = idToDelete.split('_');
                    if (['Pg', 'Mip', 'Sv'].includes(parts[0])) {
                        deleteSystem = parts[0];
                        deleteId = idToDelete.substring(parts[0].length + 1);
                    }
                }

                const deletePath = getPath(deleteSystem, node);
                const snapshot = await db.ref(deletePath).child(deleteId).once('value');
                const itemData = snapshot.val();

                if (itemData) {
                    // Prepara a ação de desfazer
                    const undoAction = async () => {
                        await db.ref(deletePath).child(deleteId).set(itemData);
                        notify("Item recuperado!", "success");
                    };

                    // Se for operador, salva no buffer de segurança
                    if (user?.role === 'operador' && (node === 'passengers' || node === 'drivers') && !isAdminAuthorized) {
                        setDeletedItemsBuffer(prev => [...prev, { system: deleteSystem, node, id: deleteId, data: itemData }]);
                        setDeletionCount(prev => prev + 1);
                    }

                    // Aciona o banner de desfazer
                    triggerUndo(undoAction, `Excluiu ${node === 'passengers' ? 'Passageiro' : node === 'drivers' ? 'Motorista' : 'Item'}`);
                }

                await db.ref(deletePath).child(deleteId).remove();

                // Logging Deletions
                if (node === 'passengers') logAction('Excluiu Passageiro', `ID: ${idToDelete}`);
                else if (node === 'drivers') logAction('Excluiu Motorista', `ID: ${idToDelete}`);
                else if (node === 'trips') logAction('Excluiu Viagem', `ID: ${idToDelete}`);
                else if (node === 'lostFound') logAction('Excluiu Achados e Perdidos', `ID: ${idToDelete}`);
                else if (node === 'users') logAction('Excluiu Usuário', `ID: ${idToDelete}`);
                else if (node === 'notes') logAction('Excluiu Nota', `ID: ${idToDelete}`);

                notify("Excluído.", "delete");
            }
        } catch (e: any) { 
            console.error("dbOp Error:", e);
            notify("Erro na operação: " + e.message, "error"); 
        }
    };

    const togglePranchetaPayment = async (vaga: string) => {
        if (!db || !user) return;
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        const path = tableSystemContext === 'Pg' ? `prancheta/${viewedWeekId}/${vaga}` : `${tableSystemContext}/prancheta/${viewedWeekId}/${vaga}`;
        const ref = db.ref(path);
        const snap = await ref.once('value');
        const current = snap.val();

        if (current && current.paid) {
            // Restriction: Only the person who received it or an admin can unmark
            if (user.role !== 'admin' && current.receivedBy !== user.username) {
                return notify("Apenas quem recebeu ou um ADMIN pode desmarcar este pagamento.", "error");
            }
            await ref.remove();
            logAction('Removeu Pagamento Prancheta', `Vaga: ${vaga} - Semana: ${viewedWeekId}`);
            notify(`Pagamento da vaga ${vaga} removido.`, "delete");
        } else {
            await ref.set({
                paid: true,
                receivedBy: user.username,
                receivedAt: new Date().toISOString()
            });
            logAction('Marcou Pagamento Prancheta', `Vaga: ${vaga} - Semana: ${viewedWeekId}`);
            notify(`Vaga ${vaga} marcada como paga!`, "success");
        }
    };

    // Lógica de Notificações Automáticas (Quarta e Sexta)
    useEffect(() => {
        if (!user) return;
        const now = new Date();
        const day = now.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        
        // Quarta-feira (3): Lembrete de Cobrança
        if (day === 3) {
            const lastNotif = localStorage.getItem(`notif_prancheta_wed_${currentWeekId}`);
            if (lastNotif !== 'true') {
                showAlert("Dia de Cobrança! 💰", "Hoje é quarta-feira, dia de coletar as pranchetas no sistema PG.", "info");
                localStorage.setItem(`notif_prancheta_wed_${currentWeekId}`, 'true');
            }
        }

        // Sexta-feira (5): Último Dia
        if (day === 5) {
            const lastNotif = localStorage.getItem(`notif_prancheta_fri_${currentWeekId}`);
            if (lastNotif !== 'true') {
                showAlert("Último Dia de Pagamento! ⚠️", "Hoje é sexta-feira, o último dia para pagar as pranchetas sem ficar riscado na tabela.", "warning");
                localStorage.setItem(`notif_prancheta_fri_${currentWeekId}`, 'true');
            }
        }
    }, [user, currentWeekId]);

    // Reminder Logic
    const [activeReminder, setActiveReminder] = useState<any>(null);
    const [showSnoozeModal, setShowSnoozeModal] = useState(false);
    const [snoozeDate, setSnoozeDate] = useState(getTodayDate());
    const [snoozeTime, setSnoozeTime] = useState('');
    const reminderAudioRef = useRef<HTMLAudioElement | null>(null);
    const successAudioRef = useRef<HTMLAudioElement | null>(null);
    const updateAudioRef = useRef<HTMLAudioElement | null>(null);
    const deleteAudioRef = useRef<HTMLAudioElement | null>(null);
    const errorAudioRef = useRef<HTMLAudioElement | null>(null);
    const infoAudioRef = useRef<HTMLAudioElement | null>(null);
    const triggeredIdsRef = useRef<Set<string>>(new Set());
    const notesRef = useRef<any[]>([]);
    const dbOpRef = useRef<any>(null);

    useEffect(() => {
        notesRef.current = data.notes || [];
    }, [data.notes]);

    useEffect(() => {
        dbOpRef.current = dbOp;
    }, [dbOp]);

    useEffect(() => {
        if (!user) return;
        
        const interval = setInterval(() => {
            try {
                const now = new Date();
                const today = getTodayDate();
                const h = now.getHours().toString().padStart(2, '0');
                const m = now.getMinutes().toString().padStart(2, '0');
                const currentTime = `${h}:${m}`;
                
                // Filtra lembretes pendentes para o usuário atual que coincidem com a data/hora
                const pendingReminders = notesRef.current.filter((n: any) => 
                    n.username === user.username && 
                    !n.completed && 
                    n.reminderDate === today && 
                    n.reminderTime === currentTime && 
                    !n.reminderTriggered &&
                    !triggeredIdsRef.current.has(n.id)
                );
                
                if (pendingReminders.length > 0) {
                    const reminder = pendingReminders[0];
                    console.log("Triggering reminder:", reminder.text);
                    triggeredIdsRef.current.add(reminder.id);
                    setActiveReminder(reminder);
                    
                    if (dbOpRef.current) {
                        dbOpRef.current('update', 'notes', { ...reminder, reminderTriggered: true });
                    }
                    
                    if (reminderAudioRef.current) {
                        reminderAudioRef.current.currentTime = 0;
                        const playPromise = reminderAudioRef.current.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(e => {
                                console.warn("Audio playback blocked by browser. User interaction needed.", e);
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Error in reminder interval:", err);
            }
        }, 5000); // Check every 5 seconds for better responsiveness
        
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (!activeReminder) return;
        
        const interval = setInterval(() => {
            if (reminderAudioRef.current) {
                reminderAudioRef.current.currentTime = 0;
                const playPromise = reminderAudioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.warn("Re-emit sound blocked:", e));
                }
            }
        }, 30000); // Re-emit sound every 30 seconds if not dismissed
        
        return () => clearInterval(interval);
    }, [activeReminder]);

    const handleSnooze = () => {
        if (!activeReminder || !snoozeDate || !snoozeTime) return;
        dbOp('update', 'notes', { 
            ...activeReminder, 
            reminderDate: snoozeDate, 
            reminderTime: snoozeTime, 
            reminderTriggered: false 
        });
        setActiveReminder(null);
        setShowSnoozeModal(false);
    };

    const changeTheme = (t: string) => { setThemeKey(t); if(user) { dbOp('update', 'preferences', { theme: t }); localStorage.setItem(`${user.username}_nexflow_theme`, t); } };

    // --- EFEITOS E LOGICA ---

    // GLOBAL SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setCmdOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const commandActions = useMemo(() => [
        { label: 'Ir para Dashboard', icon: <Icons.Home size={18}/>, action: () => setView('dashboard'), shortcut: 'D' },
        { label: 'Nova Viagem', icon: <Icons.Plus size={18}/>, action: () => { setSuggestedTrip(null); setEditingTripId(null); setModal('trip'); }, color: 'green-400' },
        { label: 'Novo Passageiro', icon: <Icons.Users size={18}/>, action: () => { 
            const now = new Date();
            const timeToUse = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
            setFormData({neighborhood: systemContext === 'Mip' ? BAIRROS_MIP[0] : BAIRROS[0], status:'Ativo', payment:'Dinheiro', passengerCount:1, luggageCount:0, date:getTodayDate(), time: timeToUse}); 
            setModal('passenger'); 
        }, color: 'blue-400' },
        { label: 'Calculadora Rápida', icon: <Icons.Calculator size={18}/>, action: () => setCalcOpen(true), color: 'yellow-400' },
        { label: 'Tabela de Motoristas', icon: <Icons.List size={18}/>, action: () => setView('table') },
        { label: 'Financeiro', icon: <Icons.Dollar size={18}/>, action: () => setView('billing') },
        { label: 'Cadastro Mágico (IA)', icon: <Icons.Stars size={18}/>, action: () => setAiModal(true), color: 'purple-400' },
        { label: 'Mudar Tema: Padrão', icon: <Icons.Settings size={18}/>, action: () => changeTheme('default') },
        { label: 'Mudar Tema: Escuro', icon: <Icons.Moon size={18}/>, action: () => changeTheme('dark') },
    ], [setView, setModal, setFormData, setAiModal, changeTheme, systemContext]);

    useEffect(() => { setSearchTerm(''); }, [view]);

    // Tour Effect: Controla abertura de menus/abas durante o tour
    useEffect(() => {
        if (!runTour) return;
        const step = TOUR_STEPS[tourStep];
        if (!step) return;

        // Se o passo tiver uma 'view' associada, muda a tela automaticamente
        if (step.view && step.view !== view) {
            setView(step.view);
        }

        // Se estiver no mobile e o alvo for o menu ou um botão do menu, abre o menu
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            const isMenuTarget = step.target && (step.target.includes('sidebar') || step.target.includes('menu-btn'));
            setMenuOpen(!!isMenuTarget);
        }
    }, [tourStep, runTour]);

    useEffect(() => {
        if(auth) {
            const unsub = auth.onAuthStateChanged((u: any) => {
                setIsFireConnected(!!u);
            });
            if (isAuthenticated && !auth.currentUser) {
                // Tenta autenticação anônima, mas ignora erro se não configurado
                auth.signInAnonymously().catch((e:any) => {
                    // Ignora erros específicos de configuração ausente (auth/configuration-not-found)
                    // ou operação não permitida (auth/operation-not-allowed) para não sujar o console
                    if (e.code !== 'auth/configuration-not-found' && e.code !== 'auth/operation-not-allowed') {
                        console.error("Erro re-auth firebase:", e);
                    }
                });
            }
            return () => unsub();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (user) {
            const savedTheme = localStorage.getItem(`${user.username}_nexflow_theme`);
            if(savedTheme) setThemeKey(savedTheme);

            const tourSeen = localStorage.getItem(`tour_seen_${user.username}`);
            if (!tourSeen) setTimeout(() => setRunTour(true), 1500);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            const userSystem = user.system || 'Pg';
            if (user.username === 'Breno') {
                setSystemContext('Mistura');
            } else {
                setSystemContext(userSystem);
            }
        }
    }, [user]);

    // Lógica para verificar Novidades
    useEffect(() => {
        if (data.newsletter && data.newsletter.length > 0 && user) {
            // Ordena para pegar a mais recente
            const sortedNews = [...data.newsletter].sort((a:any, b:any) => b.timestamp - a.timestamp);
            
            // Filtra as notícias que o usuário pode ver
            const visibleNews = sortedNews.filter((news: any) => {
                // Se não tiver targetSystems (antigas), mostra pra todos
                if (!news.targetSystems || news.targetSystems.length === 0) return true;
                
                // Se o usuário for o Breno (SuperAdmin) ou estiver no contexto Mistura, vê tudo
                if (user.username === 'Breno' || systemContext === 'Mistura') return true;
                
                // Caso contrário, verifica se o sistema do usuário está na lista
                return news.targetSystems.includes(systemContext);
            });

            if (visibleNews.length > 0) {
                const latest = visibleNews[0];
                const lastSeenId = localStorage.getItem(`last_news_seen_${user.username}`);
                
                // Se o ID da última notícia for diferente do visto, mostra o modal
                if (lastSeenId !== latest?.id) {
                    setLatestNews(latest);
                    setShowNewsModal(true);
                }
            }
        }
    }, [data.newsletter, user, systemContext]);

    const markNewsAsSeen = () => {
        if (latestNews?.id && user) {
            localStorage.setItem(`last_news_seen_${user.username}`, latestNews.id);
        }
        setShowNewsModal(false);
    };

    // Effect to auto-update dates
    useEffect(() => {
        const checkDates = () => {
            const newOp = getOperationalDate();
            const newLousa = getLousaDate();
            if (newOp !== currentOpDate) {
                setCurrentOpDate(newOp);
                // Reseta a data de análise para a nova data operacional se estivermos vendo "hoje"
                if (analysisDate === currentOpDate) setAnalysisDate(newOp);
            }
            if (newLousa !== lousaDate) setLousaDate(newLousa);
        };
        // Checa a cada minuto se virou o dia (03:00)
        const int = setInterval(checkDates, 60000);
        return () => clearInterval(int);
    }, [currentOpDate, lousaDate, analysisDate]);

    useEffect(() => {
        // CORREÇÃO: Removemos isFireConnected para permitir leitura se o DB for publico ou auth estiver lento
        if(!db || !user) return; 
        
        const path = systemContext === 'Pg' ? 'canned_messages_config/list' : `${systemContext}/canned_messages_config/list`;
        const msgRef = db.ref(path);
        const msgCb = msgRef.on('value', (snap: any) => {
            const val = snap.val();
            let list = [];
            if (Array.isArray(val)) list = val.filter(Boolean); 
            else if (val && typeof val === 'object') list = Object.values(val);
            setCannedMessages(list);
        });

        // Price Per Passenger Listener
        const pricePath = systemContext === 'Pg' ? 'system_settings/pricePerPassenger' : `${systemContext}/system_settings/pricePerPassenger`;
        const priceRef = db.ref(pricePath);
        const priceCb = priceRef.on('value', (snap: any) => {
            const val = snap.val();
            if (val) setPricePerPassenger(Number(val));
            else setPricePerPassenger(4); // Default
        });

        // Ouve a lista global de motoristas
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;

        let driversNode = tableSystemContext === 'Pg' ? 'drivers_table_list' : `${tableSystemContext}/drivers_table_list`;
        if (tableSystemContext === 'Mip') {
            const timeSuffix = tableTab === 'mip18' ? '18' : '6';
            driversNode = `Mip/drivers_${timeSuffix}_${mipDayType}`;
        }

        const driversRef = db.ref(driversNode);
        const driversCb = driversRef.on('value', (snap: any) => {
            const val = snap.val();
            if(val) {
                // CORREÇÃO: Se for Mip ou Sv e a lista for a INITIAL_SP_LIST (por erro de inicialização anterior), limpamos
                if ((tableSystemContext === 'Mip' || tableSystemContext === 'Sv') && 
                    Array.isArray(val) && val.length === INITIAL_SP_LIST.length && 
                    val[0]?.name === 'Wash (Neto)') {
                    db.ref(driversNode).set([]);
                    setSpList([]);
                } else {
                    const list = Array.isArray(val) ? val : Object.values(val);
                    setSpList(list.map((d: any) => ({ ...d, id: d.id || d.uid || d.vaga })));
                }
            } else {
                setSpList([]);
            }
        });

        // Ouve a Data Base de Rotação
        const rotDateRef = db.ref(tableSystemContext === 'Pg' ? 'system_settings/rotation_base_date' : `${tableSystemContext}/system_settings/rotation_base_date`);
        const rotDateCb = rotDateRef.on('value', (snap: any) => {
            const val = snap.val();
            if (val) setRotationBaseDate(val);
        });

        const madConfigRef = db.ref(tableSystemContext === 'Pg' ? 'madrugada_config/list' : `${tableSystemContext}/madrugada_config/list`);
        const madConfigCb = madConfigRef.on('value', (snap: any) => {
            const val = snap.val();
            // CORREÇÃO: Não usar valores padrão se o banco retornar null (lista vazia)
            setMadrugadaList(val || []);
        });

        const dailyRef = db.ref(tableSystemContext === 'Pg' ? `daily_tables/${currentOpDate}` : `${tableSystemContext}/daily_tables/${currentOpDate}`);
        const dailyCb = dailyRef.on('value', (snap: any) => {
            const val = snap.val();
            if(val) {
                setTableStatus(val.status || {});
                setMadrugadaData(val.madrugada || {});
            } else {
                // Se o dia virou (03:00) e não tem dados, reseta o estado
                setTableStatus({});
                setMadrugadaData({});
            }
        });

        const lousaRef = db.ref(tableSystemContext === 'Pg' ? `daily_tables/${lousaDate}/lousaOrder` : `${tableSystemContext}/daily_tables/${lousaDate}/lousaOrder`);
        const lousaCb = lousaRef.on('value', (snap: any) => {
            const val = snap.val();
            if (val) {
                let rawLousa = val || [];
                const cleanLousa = rawLousa.map((item:any) => {
                    if (typeof item === 'string') return { vaga: item, uid: generateUniqueId(), riscado: false };
                    return item;
                });
                setLousaOrder(cleanLousa);
            } else {
                // Reseta lousa se o dia virou
                setLousaOrder([]);
            }
        });

        const logRef = db.ref('access_timeline');
        const logCb = logRef.limitToLast(50).on('value', (snap: any) => {
            const val = snap.val();
            const list = val ? Object.keys(val).map(k => ({ id: k, ...val[k] })).reverse() : [];
            setIpHistory(list);
        });

        const labelsRef = db.ref('ip_labels');
        const labelsCb = labelsRef.on('value', (snap: any) => {
            setIpLabels(snap.val() || {});
        });

        const savedMenuRef = db.ref(`user_data/${user.username}/preferences/menuOrder`); 
        const savedMenuCb = savedMenuRef.on('value', (snap: any) => { 
            const savedOrder = snap.val(); 
            if (savedOrder && Array.isArray(savedOrder)) { 
                // Remove duplicates from savedOrder to prevent duplicate keys in rendering
                const uniqueSavedOrder = Array.from(new Set(savedOrder));
                const reordered = uniqueSavedOrder.map(id => DEFAULT_MENU_ITEMS.find(i => i.id === id)).filter(Boolean); 
                const missing = DEFAULT_MENU_ITEMS.filter(i => !uniqueSavedOrder.includes(i.id)); 
                setOrderedMenuItems([...reordered, ...missing]); 
            } 
        });

        const swapsPath = tableSystemContext === 'Pg' ? `folgas_swaps/${tableWeekId}` : `${tableSystemContext}/folgas_swaps/${tableWeekId}`;
        const swapsRef = db.ref(swapsPath);
        const swapsCb = swapsRef.on('value', (snap: any) => {
            setSwaps(snap.val() || {});
        });

        const ganchosRef = db.ref('ganchos');
        const ganchosCb = ganchosRef.on('value', (snap: any) => {
            setGanchos(snap.val() || {});
        });

        const folgasDisabledPath = tableSystemContext === 'Pg' ? 'system_settings/folgas_disabled' : `${tableSystemContext}/system_settings/folgas_disabled`;
        const satFolgaDisabledPath = tableSystemContext === 'Pg' ? 'system_settings/saturday_folga_disabled' : `${tableSystemContext}/system_settings/saturday_folga_disabled`;
        const customFolgasPath = tableSystemContext === 'Pg' ? 'system_settings/custom_default_folgas' : `${tableSystemContext}/system_settings/custom_default_folgas`;

        const folgasDisabledRef = db.ref(folgasDisabledPath);
        const saturdayFolgaDisabledRef = db.ref(satFolgaDisabledPath);
        const customDefaultFolgasRef = db.ref(customFolgasPath);
        const folgasDisabledCb = folgasDisabledRef.on('value', (snap: any) => {
            setFolgasDisabled(!!snap.val());
        });
        const saturdayFolgaDisabledCb = saturdayFolgaDisabledRef.on('value', (snap: any) => {
            setSaturdayFolgaDisabled(!!snap.val());
        });
        const customDefaultFolgasCb = customDefaultFolgasRef.on('value', (snap: any) => {
            setCustomDefaultFolgas(snap.val());
        });

        const currentPranchetaRef = db.ref(tableSystemContext === 'Pg' ? `prancheta/${currentWeekId}` : `${tableSystemContext}/prancheta/${currentWeekId}`);
        const currentPranchetaCb = currentPranchetaRef.on('value', (snap: any) => {
            setCurrentPranchetaData(snap.val() || {});
        });

        const duePranchetaRef = db.ref(tableSystemContext === 'Pg' ? `prancheta/${dueWeekId}` : `${tableSystemContext}/prancheta/${dueWeekId}`);
        const duePranchetaCb = duePranchetaRef.on('value', (snap: any) => {
            setDuePranchetaData(snap.val() || {});
        });

        const viewedPranchetaRef = db.ref(tableSystemContext === 'Pg' ? `prancheta/${viewedWeekId}` : `${tableSystemContext}/prancheta/${viewedWeekId}`);
        const viewedPranchetaCb = viewedPranchetaRef.on('value', (snap: any) => {
            setViewedPranchetaData(snap.val() || {});
        });

        const satRotRef = db.ref('system_settings/saturday_rotation');
        const satRotCb = satRotRef.on('value', (snap: any) => {
            const val = snap.val();
            if (!val) {
                // Automatic initialization if missing
                const d = new Date();
                const day = d.getDay();
                const diff = (6 - day + 7) % 7;
                const nextSat = new Date(d);
                nextSat.setDate(d.getDate() + diff);
                const baseDate = nextSat.toISOString().split('T')[0];
                
                const defaultRotation = {
                    baseDate,
                    baseWeekday: 'QUINTA'
                };
                satRotRef.set(defaultRotation);
                setSaturdayRotation(defaultRotation);
            } else {
                setSaturdayRotation(val);
            }
        });

        return () => { 
            msgRef.off('value', msgCb); 
            driversRef.off('value', driversCb); 
            rotDateRef.off('value', rotDateCb);
            priceRef.off('value', priceCb);
            madConfigRef.off('value', madConfigCb); 
            dailyRef.off('value', dailyCb);
            lousaRef.off('value', lousaCb);
            logRef.off('value', logCb);
            labelsRef.off('value', labelsCb);
            savedMenuRef.off('value', savedMenuCb);
            swapsRef.off('value', swapsCb);
            ganchosRef.off('value', ganchosCb);
            folgasDisabledRef.off('value', folgasDisabledCb);
            saturdayFolgaDisabledRef.off('value', saturdayFolgaDisabledCb);
            customDefaultFolgasRef.off('value', customDefaultFolgasCb);
            satRotRef.off('value', satRotCb);
            currentPranchetaRef.off('value', currentPranchetaCb);
            duePranchetaRef.off('value', duePranchetaCb);
            viewedPranchetaRef.off('value', viewedPranchetaCb);
        }
    }, [db, user, isFireConnected, currentOpDate, lousaDate, systemContext, tableTab, mipDayType, tableWeekId, currentWeekId, dueWeekId, viewedWeekId]);

    useEffect(() => {
        if (!db || !user) return;

        const systems = ['Pg', 'Mip', 'Sv'];
        const coreNodes = ['passengers', 'drivers', 'trips', 'lostFound', 'prancheta']; // Added lostFound and prancheta here
        const otherNodes = ['notes', 'blocked_ips', 'newsletter', 'users']; // Removed lostFound from here

        const fetchData = (system: string, node: string) => {
            const path = system === 'Pg' ? node : `${system}/${node}`;
            const ref = db.ref(path);
            return ref.once('value').then(snap => {
                const val = snap.val();
                return val ? Object.keys(val).map(key => {
                    // Se estivermos no modo Mistura, prefixamos o ID para garantir unicidade no React
                    const id = (systemContext === 'Mistura' && ['passengers', 'drivers', 'trips', 'lostFound'].includes(node)) 
                        ? `${system}_${key}` 
                        : key;
                    // IMPORTANTE: id e realId devem vir DEPOIS de ...val[key] para garantir que o id prefixado não seja sobrescrito
                    return { ...val[key], id, realId: key, system };
                }) : [];
            });
        };

        let unsubs: any[] = [];

        const setupListeners = async () => {
            // Reset data state to prevent leakage between different system contexts or users
            setData({ 
                passengers: [], 
                drivers: [], 
                trips: [], 
                notes: [], 
                lostFound: [], 
                blocked_ips: [], 
                newsletter: [], 
                users: [], 
                prancheta: [] 
            });

            // Clear previous listeners
            unsubs.forEach(fn => fn());
            unsubs = [];

            const pgSettingsRef = db.ref('system_settings/Pg/pranchetaValue');
            const pgSettingsCallback = pgSettingsRef.on('value', (snap) => {
                if (snap.val() !== null) setPranchetaValue(snap.val());
            });
            unsubs.push(() => pgSettingsRef.off('value', pgSettingsCallback));

            // Listen to non-system-specific nodes
            otherNodes.forEach(node => {
                const ref = db.ref(node);
                const callback = ref.on('value', (snapshot) => {
                    const val = snapshot.val();
                    const list = val ? Object.keys(val).map(key => ({ ...val[key], id: key })) : [];
                    setData((prev: any) => ({ ...prev, [node]: list }));
                });
                unsubs.push(() => ref.off('value', callback));
            });

            if (systemContext === 'Mistura') {
                // Aggregated "Mistura" view
                const allData: any = { passengers: [], drivers: [], trips: [], lostFound: [], prancheta: [] };
                const promises = systems.flatMap(sys => coreNodes.map(node => fetchData(sys, node)));
                const results = await Promise.all(promises);
                
                let i = 0;
                for (const sys of systems) {
                    for (const node of coreNodes) {
                        allData[node] = allData[node].concat(results[i]);
                        i++;
                    }
                }

                coreNodes.forEach(node => {
                    allData[node].sort((a: any, b: any) => {
                        const idA = parseInt(a.realId || a.id);
                        const idB = parseInt(b.realId || b.id);
                        if (isNaN(idA) && isNaN(idB)) return 0;
                        if (isNaN(idA)) return 1;
                        if (isNaN(idB)) return -1;
                        return idB - idA;
                    });
                });
                setData((prev: any) => ({ ...prev, ...allData }));

            } else {
                // Regular user or Breno in a specific context
                coreNodes.forEach(node => {
                    const path = systemContext === 'Pg' ? node : `${systemContext}/${node}`;
                    const ref = db.ref(path);
                    const callback = ref.on('value', (snapshot) => {
                        const val = snapshot.val();
                        const list = val ? Object.keys(val).map(key => ({ ...val[key], id: key })) : [];
                        list.sort((a: any, b: any) => {
                            const idA = parseInt(a.id);
                            const idB = parseInt(b.id);
                            if (isNaN(idA) && isNaN(idB)) return 0;
                            if (isNaN(idA)) return 1;
                            if (isNaN(idB)) return -1;
                            return idB - idA;
                        });
                        setData((prev: any) => ({ ...prev, [node]: list }));
                    });
                    unsubs.push(() => ref.off('value', callback));
                });
            }
        };

        setupListeners();

        return () => unsubs.forEach(fn => fn());
    }, [user, isFireConnected, systemContext]);

    useEffect(() => {
        if (!db || !isFireConnected) return;

        const checkAndClearMipTables = async () => {
            const realOpDate = getOperationalDate();
            const lastClearedRef = db.ref('Mip/system_settings/last_cleared_date');
            const snap = await lastClearedRef.once('value');
            const lastCleared = snap.val();

            if (lastCleared && realOpDate > lastCleared) {
                // Update the date first to prevent race conditions
                await lastClearedRef.set(realOpDate);

                const clearTable = async (node: string) => {
                    const tableSnap = await db.ref(node).once('value');
                    const list = tableSnap.val();
                    if (list && Array.isArray(list)) {
                        // Remove copies that were appended the previous day
                        const originalList = list.filter((d: any) => !d.isCopy);
                        const clearedList = originalList.map((d: any) => ({
                            ...d,
                            time1: '',
                            time2: '',
                            num: '',
                            baixou: false,
                            riscado: false
                        }));
                        await db.ref(node).set(clearedList);
                    }
                };

                await clearTable('Mip/drivers_6_odd');
                await clearTable('Mip/drivers_6_even');
                await clearTable('Mip/drivers_18_odd');
                await clearTable('Mip/drivers_18_even');
                console.log(`Mip tables cleared for new operational date: ${realOpDate}`);
            } else if (!lastCleared) {
                await lastClearedRef.set(realOpDate);
            }
        };

        checkAndClearMipTables();
    }, [currentOpDate, db, isFireConnected]);

    // --- FUNÇÕES ---

    const getRotatedList = (dateStr: string) => {
        if (!spList || spList.length === 0) return [];
        
        // Separate original items and copies
        const originalList = spList.filter((d: any) => !d.isCopy);
        const copiesList = spList.filter((d: any) => d.isCopy);

        if (originalList.length === 0) return copiesList;

        // Usa a data base dinâmica (vinda do Firebase) ou o fallback
        const start = new Date(`${rotationBaseDate}T00:00:00`).getTime(); 
        const current = new Date(dateStr + 'T00:00:00').getTime();
        const diff = Math.floor((current - start) / (86400000));
        const len = originalList.length;
        const mod = ((diff % len) + len) % len;
        
        const rotatedOriginals = [...originalList.slice(mod), ...originalList.slice(0, mod)];
        
        // Append copies at the end
        return [...rotatedOriginals, ...copiesList];
    };

    // NOVA FUNÇÃO: Rotação independente da Madrugada
    const getRotatedMadrugadaList = (dateStr: string) => {
        if (!madrugadaList || madrugadaList.length === 0) return [];

        const start = new Date(`${rotationBaseDate}T00:00:00`).getTime(); 
        const current = new Date(dateStr + 'T00:00:00').getTime();
        const diff = Math.floor((current - start) / (86400000));
        
        // Aplica rotação APENAS na lista de vagas da madrugada
        const len = madrugadaList.length;
        if (len === 0) return [];
        const mod = ((diff % len) + len) % len;
        const rotatedVagas = [...madrugadaList.slice(mod), ...madrugadaList.slice(0, mod)];

        // Mapeia os IDs rotacionados para os objetos completos de motorista
        return rotatedVagas.map((vagaId: string) => {
            return spList.find((sp:any) => sp.vaga === vagaId) || { vaga: vagaId, name: 'Desconhecido' };
        });
    };

    const getTableTimes = () => {
        const list = getRotatedList(currentOpDate); 
        const confirmedTimes: any = {}; 
        let confirmCount = 0;
        
        // Base time is 06:00 of the CURRENT OPERATIONAL DATE
        const [y, m, d] = currentOpDate.split('-').map(Number);
        let lastConfirmTime = new Date(y, m - 1, d, 6, 0, 0); 

        list.forEach((driver:any) => {
            if (tableStatus[driver.vaga] === 'confirmed') {
                const time = new Date(lastConfirmTime.getTime() + confirmCount * 30 * 60000);
                confirmedTimes[driver.vaga] = time.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', hour12: false});
                confirmCount++;
            }
        });

        const startLousaTime = new Date(lastConfirmTime.getTime() + confirmCount * 30 * 60000);
        return { confirmedTimes, startLousaTime };
    };

    const isTimeExpired = (timeStr: string) => {
        if(!timeStr) return false;
        const now = new Date();
        const [h, m] = timeStr.split(':').map(Number);
        const confirmedDate = new Date();
        confirmedDate.setHours(h, m, 0, 0);
        let diff = now.getTime() - confirmedDate.getTime();
        if (diff < -12 * 60 * 60 * 1000) diff += 24 * 60 * 60 * 1000; 
        return diff > 30 * 60000;
    };

    const { confirmedTimes, startLousaTime } = getTableTimes();
    
    // Ticker para forçar atualização das viagens temporárias
    useEffect(() => {
        const interval = setInterval(() => setUiTicker(prev => prev + 1), 15000);
        return () => clearInterval(interval);
    }, []);

    // LÓGICA DE VIAGEM TEMPORÁRIA
    useEffect(() => {
        // CORREÇÃO: Removido !isFireConnected para permitir funcionamento com DB público
        if (!db || !user) return; 

        const manageTempTrips = () => {
            if (systemContext === 'Mip' || systemContext === 'Mistura') return; // Mip uses manual temp trips, Mistura is aggregated view

            // Prevent running with stale data from Mistura mode when switching back to a specific system
            // In Mistura mode, we add a 'system' property to each item.
            const isStaleMisturaData = data.trips.some((t: any) => t.system);
            if (isStaleMisturaData) return;

            const now = new Date();
            const { confirmedTimes, startLousaTime } = getTableTimes();
            
            const activeSlots: any[] = [];

            getRotatedList(currentOpDate).forEach((driver:any) => {
                if (tableStatus[driver.vaga] === 'confirmed') {
                    activeSlots.push({ 
                        vaga: driver.vaga, 
                        time: confirmedTimes[driver.vaga] 
                    });
                }
            });

            let lousaIndex = 0;
            lousaOrder.forEach((item:any) => {
                // If 'baixou', it doesn't consume time, just moves to end.
                if (item.baixou) return;

                if (!item.riscado && !item.isNull) {
                    const t = new Date(startLousaTime.getTime() + lousaIndex * 30 * 60000);
                    const timeStr = t.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', hour12: false});
                    activeSlots.push({ 
                        vaga: item.vaga, 
                        time: timeStr 
                    });
                }
                
                // Increment logic:
                // Normal items increment time.
                // 'isNull' (Skipped slots) ALSO increment time.
                // 'riscado' does NOT increment time (next person takes slot immediately).
                if (item.isNull || !item.riscado) {
                    lousaIndex++;
                }
            });

            // CALCULA O PRÓXIMO ID SEQUENCIAL (INTEIRO) - LOWEST AVAILABLE
            // Use realId if available (Mistura mode) to get the clean numeric ID
            const existingIds = new Set(data.trips.map((t: any) => parseInt(t.realId || t.id)).filter((n: number) => !isNaN(n)));
            let nextIdCandidate = 1;

            // 1. ITERATE ACTIVE SLOTS TO CREATE TRIPS IF IN WINDOW
            activeSlots.forEach((slot:any) => {
                if (!slot.time) return;
                
                const [h, m] = slot.time.split(':').map(Number);
                
                // Construct Date strictly based on Operational Date
                const [yOp, mOp, dOp] = currentOpDate.split('-').map(Number);
                const slotDate = new Date(yOp, mOp - 1, dOp, h, m, 0);

                // Logic: If slot hour is small (e.g. 0, 1, 2, 3, 4) AND OpDate starts at 6, it's the next day.
                if (h < 5) {
                    slotDate.setDate(slotDate.getDate() + 1);
                }

                const diffMinutes = (now.getTime() - slotDate.getTime()) / 60000;

                // --- CRIAÇÃO DA VIAGEM TEMPORÁRIA ---
                // Janela Rígida: Cria APENAS quando chegar a hora (0 min) e mantém por 45 min.
                if (diffMinutes >= 0 && diffMinutes <= 45) {
                    
                    const driverSp = spList.find((d:any) => d.vaga === slot.vaga);
                    const driverDb = driverSp ? data.drivers.find((d:any) => d?.name?.toLowerCase() === driverSp?.name?.toLowerCase()) : null;
                    
                    if (!driverDb) return;

                    const slotDateStr = [
                        slotDate.getFullYear(),
                        String(slotDate.getMonth() + 1).padStart(2, '0'),
                        String(slotDate.getDate()).padStart(2, '0')
                    ].join('-');

                    // CORREÇÃO: Calcular Data Final da Viagem ANTES de checar existência
                    const tripTime = addMinutes(slot.time, 60);
                    const [sH] = slot.time.split(':').map(Number);
                    const [tH] = tripTime.split(':').map(Number);
                    
                    let finalTripDate = slotDateStr;
                    // Se a viagem cruzar a meia noite (Ex: Slot 23:30 -> Trip 00:30), a data avança
                    if (tH < sH) {
                         finalTripDate = dateAddDays(slotDateStr, 1);
                    }

                    // Check if trip exists for THIS driver on THIS *FINAL* date
                    // Use realId for comparison to handle Mistura -> Specific system transitions safely
                    const cleanDriverId = driverDb.realId || driverDb.id;
                    const exists = data.trips.some((t:any) => 
                        (t.driverId === cleanDriverId || (t.driverName && t.driverName.toLowerCase().trim() === driverDb.name.toLowerCase().trim())) && 
                        t.date === finalTripDate && 
                        t.time === tripTime && // Adicionado conforme pedido: "E NAQUELA HORA"
                        (t.isTemp || t.status !== 'Cancelada')
                    );

                    if (!exists) {
                        while (existingIds.has(nextIdCandidate)) {
                            nextIdCandidate++;
                        }
                        const nextId = nextIdCandidate.toString();
                        existingIds.add(nextIdCandidate);

                        const newTrip = {
                            id: nextId, 
                            driverId: cleanDriverId,
                            driverName: driverDb.name,
                            time: tripTime, 
                            date: finalTripDate,
                            passengerIds: [],
                            status: 'Em andamento',
                            isTemp: true,
                            vaga: slot.vaga
                        };
                        db.ref(systemContext === 'Pg' ? 'trips' : `${systemContext}/trips`).child(newTrip.id).set(newTrip);
                    }
                }
            });

            // 2. CLEANUP: REMOVE EXPIRED, INVALID OR REDUNDANT TEMP TRIPS
            const timeToMinutes = (t: string) => {
                if (!t) return -1;
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };

            data.trips.forEach((t:any) => {
                if (t.isTemp && t.status !== 'Finalizada') {
                    
                    // Check if a fixed trip already exists for this driver/time/date
                    const fixedExists = data.trips.some((ft:any) => 
                        !ft.isTemp && 
                        ft.status !== 'Cancelada' &&
                        ft.date === t.date && 
                        ft.time === t.time &&
                        (ft.driverId === t.driverId || (ft.driverName && t.driverName && ft.driverName.toLowerCase().trim() === t.driverName.toLowerCase().trim()))
                    );

                    if (fixedExists) {
                        db.ref(systemContext === 'Pg' ? 'trips' : `${systemContext}/trips`).child(t.realId || t.id).remove();
                        return;
                    }

                    // Find the best matching active slot for this trip (closest time)
                    const activeSlot = activeSlots
                        .filter((s:any) => s.vaga === t.vaga)
                        .sort((a, b) => {
                            const diffA = Math.abs(timeToMinutes(addMinutes(a.time, 60)) - timeToMinutes(t.time));
                            const diffB = Math.abs(timeToMinutes(addMinutes(b.time, 60)) - timeToMinutes(t.time));
                            return diffA - diffB;
                        })[0];

                    if (!activeSlot) {
                        // Only remove if it's strictly the same operational date context
                        if (t.date === getTodayDate() || t.date === currentOpDate) {
                             db.ref(systemContext === 'Pg' ? 'trips' : `${systemContext}/trips`).child(t.realId || t.id).remove();
                        }
                        return;
                    }

                    // Recalculate slot time to check expiration
                    const [h, m] = activeSlot.time.split(':').map(Number);
                    const [yOp, mOp, dOp] = currentOpDate.split('-').map(Number);
                    const slotDate = new Date(yOp, mOp - 1, dOp, h, m, 0);
                    
                    if (h < 5) slotDate.setDate(slotDate.getDate() + 1);
                    
                    const diff = (now.getTime() - slotDate.getTime()) / 60000;
                    
                    // Expiration: Delete exactly after 45 minutes OR if time is invalid (< 0)
                    if (diff > 45 || diff < 0) {
                        db.ref(systemContext === 'Pg' ? 'trips' : `${systemContext}/trips`).child(t.realId || t.id).remove();
                    } else {
                        // Update trip time if slot time changed (keeps it sync with +60 rule)
                        const correctTripTime = addMinutes(activeSlot.time, 60);
                        if (t.time !== correctTripTime) {
                             db.ref(systemContext === 'Pg' ? 'trips' : `${systemContext}/trips`).child(t.realId || t.id).update({ time: correctTripTime });
                        }
                    }
                }
            });
        };

        manageTempTrips();

    }, [uiTicker, data.trips, tableStatus, lousaOrder, spList, data.drivers, currentOpDate, rotationBaseDate]);

    // ... (rest of the file remains unchanged)
    
    // Função de Tour Restart / Complete
    const restartTour = () => { 
        setTourStep(0); 
        setView('dashboard'); 
        setRunTour(true); 
        if(user) localStorage.removeItem(`tour_seen_${user.username}`);
    };

    const completeTour = () => {
        setRunTour(false);
        setTourStep(0);
        setView('dashboard');
        if(user) localStorage.setItem(`tour_seen_${user.username}`, 'true');
    };
    
    const saveApiKey = (k: string) => { setGeminiKey(k); localStorage.setItem('nexflow_gemini_key', k); notify("API Key salva!", "success"); };
    const blockIp = () => { if(!ipToBlock) return notify('Digite um IP', 'error'); dbOp('create', 'blocked_ips', { ip: ipToBlock, reason: ipReason || 'Manual', blockedBy: user.username }); setIpToBlock(''); setIpReason(''); notify('IP Bloqueado!', "delete"); };
    const saveIpLabel = (ip: string, label: string) => { if(!ip) return; const safeIp = ip.replace(/\./g, '_'); db.ref(`ip_labels/${safeIp}`).set(label); };
    
    const del = (col: string, id: string) => {
        if (col === 'passengers' && user?.role === 'operator') {
            if (deletionCount >= 3) {
                return notify("Limite de exclusão atingido (máx 3 por sessão). Contate a Coordenação.", "error");
            }
        }

        const item = data[col]?.find((i:any) => i.id === id);
        
        if (col === 'passengers') {
            requestConfirm('Excluir Passageiro?', `Deseja excluir ${item?.name || 'este passageiro'}?`, () => {
                logAction('Excluiu Passageiro', `Nome: ${item?.name || id}`);
                dbOp('delete', col, id);
            });
            return;
        }

        if (col === 'drivers') {
            requestConfirm('Excluir Motorista?', `Deseja excluir ${item?.name || 'este motorista'}?`, () => {
                logAction('Excluiu Motorista', `Nome: ${item?.name || id}`);
                dbOp('delete', col, id);
            });
            return;
        }

        if (col === 'lostFound') {
            requestConfirm('Excluir Item?', `Deseja excluir ${item?.item || 'este item'}?`, () => {
                logAction('Excluiu Achados e Perdidos', `Item: ${item?.item || id}`);
                dbOp('delete', col, id);
            });
            return;
        }

        if (col === 'trips') {
            const trip = data.trips.find((t:any) => t.id === id);
            
            if (trip) {
                // Mensagem personalizada baseada no status
                const msg = trip.status === 'Finalizada' 
                    ? 'Os passageiros voltarão para a lista de Agendamentos (Pendentes).' 
                    : 'Tem certeza que deseja excluir esta viagem?';

                requestConfirm('Excluir viagem?', msg, () => {
                    logAction('Excluiu Viagem', `Motorista: ${trip.driverName} - ${trip.date} ${trip.time}`);
                    triggerUndo(() => {
                        dbOp('create', col, trip);
                    }, "Viagem excluída");

                    // 1. Libera passageiros se a viagem foi finalizada (volta para pendente)
                    if (trip.status === 'Finalizada' && trip.passengerIds && Array.isArray(trip.passengerIds)) {
                        trip.passengerIds.forEach((pid:string) => {
                            const p = data.passengers.find((x:any) => x.id === pid);
                            const pSystem = p?.system || systemContext;
                            db.ref(pSystem === 'Pg' ? `passengers/${pid}` : `${pSystem}/passengers/${pid}`).update({ 
                                status: 'Ativo',
                                time: trip.time, 
                                date: trip.date 
                            });
                        });
                    }

                    // 2. Limpa dados da Madrugada na Tabela (CORREÇÃO SOLICITADA)
                    // Zera horário e quantidade independentemente do status da viagem
                    if (trip.isMadrugada) { 
                        const sp = spList.find((s:any) => s.name === trip.driverName); 
                        if (sp) {
                            const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
                            db.ref(tableSystemContext === 'Pg' ? `daily_tables/${trip.date}/madrugada/${sp.vaga}` : `${tableSystemContext}/daily_tables/${trip.date}/madrugada/${sp.vaga}`).update({ time: null, qtd: null }); 
                        }
                    }

                    // 3. Deleta a viagem
                    dbOp('delete', col, id);
                });
                return;
            }
        }
        requestConfirm('Excluir item?', 'Tem certeza que deseja remover este item permanentemente?', () => {
            if (col === 'passengers' && user?.role === 'operator') {
                setDeletionCount(prev => prev + 1);
            }
            if (item) {
                triggerUndo(() => {
                    dbOp('create', col, item);
                }, "Item excluído");
            }
            dbOp('delete', col, id);
        });
    };

    const saveDriverName = (oldVaga: string) => { 
        if(!tempName.trim() || !tempVaga.trim()) return; 
        
        if (tempVaga !== oldVaga && spList.some((d:any) => d.vaga === tempVaga)) {
            return notify("Esta vaga já está em uso!", "error");
        }

        const newList = spList.map((d:any) => d.vaga === oldVaga ? { ...d, name: tempName, vaga: tempVaga } : d); 
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        
        let driversNode = tableSystemContext === 'Pg' ? 'drivers_table_list' : `${tableSystemContext}/drivers_table_list`;
        if (tableSystemContext === 'Mip') {
            const timeSuffix = tableTab === 'mip18' ? '18' : '6';
            driversNode = `Mip/drivers_${timeSuffix}_${mipDayType}`;
        }

        db.ref(driversNode).set(newList); 
        logAction('Editou Tabela Geral', `Vaga ${oldVaga} -> ${tempVaga} (Motorista: ${tempName})`);
        
        if (tempVaga !== oldVaga && tableStatus[oldVaga]) {
            const newStatus = { ...tableStatus };
            newStatus[tempVaga] = newStatus[oldVaga];
            delete newStatus[oldVaga];
            const statusPath = tableSystemContext === 'Pg' ? `daily_tables/${currentOpDate}/status` : `${tableSystemContext}/daily_tables/${currentOpDate}/status`;
            db.ref(statusPath).set(newStatus);
        }

        // --- Atualizar Viagens Temporárias (Apenas para MIP) ---
        // Se tableSystemContext for 'Mip' OU se a aba atual for de MIP (mip6 ou mip18), devemos processar
        if (tableSystemContext === 'Mip' || tableTab.startsWith('mip')) {
            const tripsPath = `Mip/trips`;
            
            // Se a vaga mudou, remover as viagens antigas
            if (oldVaga !== tempVaga) {
                db.ref(tripsPath).child(`temp_${currentOpDate}_${mipDayType}_${oldVaga}_1`).remove();
                db.ref(tripsPath).child(`temp_${currentOpDate}_${mipDayType}_${oldVaga}_2`).remove();
            }

            // Criar/Atualizar as novas viagens com o novo nome e vaga
            const driver = newList.find((d:any) => d.vaga === tempVaga);
            if (driver) {
                const updateTempTrip = (suffix: string, time: string, num: string, driverName: string) => {
                    const tripId = `temp_${currentOpDate}_${mipDayType}_${tempVaga}_${suffix}`;
                    const hasData = (time && time.trim()) || (num && num.trim());
                    
                    if (hasData) {
                        db.ref(tripsPath).child(tripId).once('value', (snap) => {
                            if (snap.exists()) {
                                const existing = snap.val();
                                if (existing.status !== 'Finalizada' && existing.status !== 'Cancelada') {
                                    db.ref(tripsPath).child(tripId).update({
                                        driverName: driverName,
                                        vaga: tempVaga,
                                        tripNumber: num || '',
                                        dayType: mipDayType
                                    });
                                }
                            } else {
                                // Check if a fixed trip exists for this driver, date, vaga
                                const driverDb = data.drivers.find((d:any) => d.name.toLowerCase() === driverName.toLowerCase());
                                const cleanDriverId = driverDb?.realId || driverDb?.id;
                                const fixedExists = data.trips.some((t:any) => 
                                    t.driverId === cleanDriverId && 
                                    t.date === currentOpDate && 
                                    t.vaga === tempVaga &&
                                    // REMOVIDO: t.time === time && // Permite que o usuário ajuste o horário sem criar duplicata
                                    !t.isTemp &&
                                    t.status !== 'Cancelada'
                                );

                                if (!fixedExists) {
                                    db.ref(tripsPath).child(tripId).set({
                                        id: tripId,
                                        date: currentOpDate,
                                        time: time || '',
                                        driverName: driverName,
                                        vaga: tempVaga,
                                        status: 'Aguardando',
                                        isTemp: true,
                                        passengerCount: 0,
                                        luggageCount: 0,
                                        paymentStatus: 'Pendente',
                                        tripNumber: num || '',
                                        observation: 'Viagem Temporária',
                                        pricePerPassenger: pricePerPassenger,
                                        dayType: mipDayType,
                                        system: 'Mip',
                                        tripSuffix: suffix
                                    });
                                }
                            }
                        });
                    }
                };
                
                updateTempTrip('1', driver.time1, driver.num, tempName);
                if (driver.time2 && driver.time2.trim()) {
                    updateTempTrip('2', driver.time2, driver.num, tempName);
                }
            }
        }

        setEditName(null); 
        notify("Salvo!", "success"); 
    };

    const updateMipDriver = (id: string, payload: any) => {
        const newList = spList.map((d:any) => d.id === id ? { ...d, ...payload } : d);
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        const timeSuffix = tableTab === 'mip18' ? '18' : '6';
        let node = tableSystemContext === 'Mip' ? `Mip/drivers_${timeSuffix}_${mipDayType}` : (tableSystemContext === 'Pg' ? 'drivers_table_list' : `${tableSystemContext}/drivers_table_list`);
        db.ref(node).set(newList);

        // --- Lógica de Viagem Temporária (Apenas para MIP) ---
        // Se tableSystemContext for 'Mip' OU se a aba atual for de MIP (mip6 ou mip18), devemos processar
        if (tableSystemContext === 'Mip' || tableTab.startsWith('mip')) {
            const driver = newList.find((d:any) => d.id === id);
            if (driver) {
                const vaga = driver.vaga;
                const tripsPath = `Mip/trips`;

                // We need to track used IDs in this batch to avoid collisions
                const existingIds = new Set((data.trips || []).map((t: any) => parseInt(t.id)).filter((n: number) => !isNaN(n)));
                let nextIdCandidate = 1;
                
                const getNextIdLocal = () => {
                    while (existingIds.has(nextIdCandidate)) {
                        nextIdCandidate++;
                    }
                    existingIds.add(nextIdCandidate);
                    return nextIdCandidate.toString();
                };

                const manageTempTrip = (suffix: string, time: string, num: string, driverName: string) => {
                    // Find existing temp trip for this slot/date/suffix in LOCAL data (synced)
                    const existingTrip = (data.trips || []).find((t:any) => 
                        t.isTemp && 
                        t.date === currentOpDate && 
                        t.vaga === vaga && 
                        t.tripSuffix === suffix &&
                        t.dayType === mipDayType
                    );

                    const hasData = (time && time.trim()) || (num && num.trim());
                    
                    if (hasData) {
                        if (existingTrip) {
                            if (existingTrip.status !== 'Finalizada' && existingTrip.status !== 'Cancelada') {
                                db.ref(tripsPath).child(existingTrip.id).update({
                                    time: time || '',
                                    tripNumber: num || '',
                                    driverName: driverName,
                                    dayType: mipDayType
                                });
                            }
                        } else {
                            // Check if a fixed trip exists for this driver, date, vaga
                            const driverDb = data.drivers.find((d:any) => d.name.toLowerCase() === driverName.toLowerCase());
                            const cleanDriverId = driverDb?.realId || driverDb?.id;
                            const fixedExists = data.trips.some((t:any) => 
                                (t.driverId === cleanDriverId || (t.driverName && t.driverName.toLowerCase().trim() === driverName.toLowerCase().trim())) && 
                                t.date === currentOpDate && 
                                t.time === time && // Adicionado conforme pedido: "E NAQUELA HORA"
                                !t.isTemp &&
                                t.status !== 'Cancelada'
                            );

                            if (!fixedExists) {
                                const nextId = getNextIdLocal();
                                const tripData = {
                                    id: nextId,
                                    date: currentOpDate,
                                    time: time || '',
                                    driverName: driverName,
                                    vaga: vaga,
                                    status: 'Aguardando',
                                    isTemp: true,
                                    passengerCount: 0,
                                    luggageCount: 0,
                                    paymentStatus: 'Pendente',
                                    tripNumber: num || '',
                                    observation: 'Viagem Temporária',
                                    pricePerPassenger: pricePerPassenger || 4,
                                    tripSuffix: suffix,
                                    dayType: mipDayType,
                                    system: 'Mip',
                                    passengerIds: []
                                };

                                // AUTO-ASSIGN PASSENGERS ON CREATION (MIP LOGIC)
                                // Busca passageiros que batem com o horário (com janela de 30min)
                                if (suffix === '1' && (tableSystemContext === 'Mip' || tableTab.startsWith('mip'))) { // Só aplica na primeira viagem para evitar confusão
                                    const timeToMinutes = (t: string) => {
                                        if (!t) return -1;
                                        const [h, m] = t.split(':').map(Number);
                                        return h * 60 + m;
                                    };
                                    const tripTimeMins = timeToMinutes(time);
                                    
                                    const candidates = (data.passengers || []).filter((p:any) => {
                                        if (p.status !== 'Ativo' || p.date !== currentOpDate) return false;
                                        const pTimeMins = timeToMinutes(p.time);
                                        // Intervalo [tripTime, tripTime + 30]
                                        return pTimeMins >= tripTimeMins && pTimeMins <= (tripTimeMins + 30);
                                    });
                                    
                                    if (candidates.length > 0) {
                                        tripData.passengerIds = candidates.map((c:any) => c.realId || c.id);
                                    }
                                }

                                db.ref(tripsPath).child(nextId).set(tripData);
                            }
                        }
                    } else if (existingTrip && existingTrip.status !== 'Finalizada' && existingTrip.status !== 'Cancelada') {
                        db.ref(tripsPath).child(existingTrip.id).remove();
                    }
                };

                // Se payload tem time1, num ou name (afeta viagem 1)
                if (payload.time1 !== undefined || payload.num !== undefined || payload.name !== undefined) {
                    manageTempTrip('1', driver.time1, driver.num, driver.name);
                }
                // Se payload tem time2 (afeta viagem 2)
                if (payload.time2 !== undefined || payload.name !== undefined) {
                    // Only create trip 2 if time2 is explicitly provided AND user wants it (MIP logic override?)
                    // User said: "cria uma viagem temporaria somente com o input 1... Ao colocar o input 2 com 6:30 por exemplo ele cria outra viagem temporaria... e não quero isso"
                    // Vamos manter a criação da viagem 2 APENAS se o time2 for diferente do time1 + 30 (ou seja, se for realmente uma outra viagem distinta)
                    // OU se o usuário explicitamente preencheu.
                    // Mas o usuário disse que NÃO quer. Então vamos desabilitar a criação da viagem 2 temporária se for MIP?
                    // "cria uma viagem temporaria somente com o input 1"
                    
                    // NOVA REGRA: Na MIP, ignoramos a criação automática da viagem temporária 2 baseada no input 2.
                    // O input 2 servirá apenas como dado visual na tabela, mas não gera Trip.
                    // A MENOS que seja outro sistema.
                    
                    const isMip = tableSystemContext === 'Mip' || tableTab.startsWith('mip');
                    
                    if (!isMip) {
                        const hasTime2 = driver.time2 && driver.time2.trim();
                        if (hasTime2) {
                            manageTempTrip('2', driver.time2, driver.num, driver.name);
                        } else {
                            // Remove trip 2 if time2 is empty
                            const existingTrip2 = (data.trips || []).find((t:any) => 
                                t.isTemp && t.date === currentOpDate && t.vaga === vaga && t.tripSuffix === '2'
                            );
                            if (existingTrip2 && existingTrip2.status !== 'Finalizada' && existingTrip2.status !== 'Cancelada') {
                                db.ref(tripsPath).child(existingTrip2.id).remove();
                            }
                        }
                    } else {
                        // Se for MIP, garante que a viagem 2 não exista/seja removida se for temporária
                         const existingTrip2 = (data.trips || []).find((t:any) => 
                            t.isTemp && t.date === currentOpDate && t.vaga === vaga && t.tripSuffix === '2'
                        );
                        if (existingTrip2 && existingTrip2.status !== 'Finalizada' && existingTrip2.status !== 'Cancelada') {
                            db.ref(tripsPath).child(existingTrip2.id).remove();
                        }
                    }
                }
            }
        }
    };

    const handleMipBaixar = (id: string) => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        if (tableSystemContext !== 'Mip') return;

        const driver = spList.find((d:any) => d.id === id);
        if (!driver) return;
        const vaga = driver.vaga;

        // Determine source and target nodes
        let sourceNode = tableTab === 'mip18' ? `Mip/drivers_18_${mipDayType}` : `Mip/drivers_6_${mipDayType}`;
        let targetNode = sourceNode; // Default to same table

        // SPECIAL RULE: If downloading from 6:00, copy goes to 18:00
        if (tableTab === 'mip6') {
            targetNode = `Mip/drivers_18_${mipDayType}`;
        }

        // Se já baixou, CANCELAR (remover a cópia e desmarcar original)
        if (driver.baixou) {
            // 1. Desmarcar original na SOURCE
            const newList = spList.map((d:any) => d.id === id ? { ...d, baixou: false } : d);
            db.ref(sourceNode).set(newList);

            // 2. Remover a ÚLTIMA cópia criada na TARGET
            db.ref(targetNode).once('value', (snap) => {
                const list = snap.val() || [];
                // Encontra o índice da última ocorrência desse motorista que é uma cópia
                const reverseList = [...list].reverse();
                const indexToRemove = reverseList.findIndex((d:any) => d.vaga === vaga && d.isCopy);
                
                if (indexToRemove !== -1) {
                    const realIndex = list.length - 1 - indexToRemove;
                    const newListWithoutCopy = [...list];
                    newListWithoutCopy.splice(realIndex, 1);
                    db.ref(targetNode).set(newListWithoutCopy);
                    notify("Baixar cancelado!", "info");
                } else {
                    // Fallback if no isCopy flag (for older copies)
                    const fallbackIndex = reverseList.findIndex((d:any) => d.vaga === vaga && !d.baixou && d.id !== driver.id);
                    if (fallbackIndex !== -1) {
                        const realIndex = list.length - 1 - fallbackIndex;
                        const newListWithoutCopy = [...list];
                        newListWithoutCopy.splice(realIndex, 1);
                        db.ref(targetNode).set(newListWithoutCopy);
                        notify("Baixar cancelado!", "info");
                    }
                }
            });
            return;
        }

        // EXECUTAR BAIXAR (Criar cópia e marcar original)
        // 1. Mark original in SOURCE
        const newListWithBaixou = spList.map((d:any) => d.id === id ? { ...d, baixou: true } : d);
        db.ref(sourceNode).set(newListWithBaixou);

        // 2. Create copy in TARGET
        const copy = { 
            ...driver, 
            id: generateUniqueId(), 
            vaga: driver.vaga, 
            baixou: false, 
            riscado: false, 
            time1: '', 
            time2: '', 
            num: '',
            isCopy: true
        };
        
        db.ref(targetNode).once('value', (snap) => {
            const list = snap.val() || [];
            db.ref(targetNode).set([...list, copy]);
        });

        notify("Baixou!", "success");
    };

    const handleMipRiscar = (id: string) => {
        const oldList = [...spList];
        const driver = spList.find((d:any) => d.id === id);
        
        triggerUndo(() => {
            const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
            const timeSuffix = tableTab === 'mip18' ? '18' : '6';
            let node = tableSystemContext === 'Mip' ? `Mip/drivers_${timeSuffix}_${mipDayType}` : (tableSystemContext === 'Pg' ? 'drivers_table_list' : `${tableSystemContext}/drivers_table_list`);
            db.ref(node).set(oldList);
        }, `Vaga ${driver?.vaga || ''} ${driver?.riscado ? 'desmarcada' : 'riscada'}`);

        const newList = spList.map((d:any) => d.id === id ? { ...d, riscado: !d.riscado } : d);
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        const timeSuffix = tableTab === 'mip18' ? '18' : '6';
        let node = tableSystemContext === 'Mip' ? `Mip/drivers_${timeSuffix}_${mipDayType}` : (tableSystemContext === 'Pg' ? 'drivers_table_list' : `${tableSystemContext}/drivers_table_list`);
        db.ref(node).set(newList);
    };
    
    const addCannedMessage = () => { 
        const newMsg = { id: generateUniqueId(), title: 'Nova Mensagem', text: '' }; 
        const newList = [...cannedMessages, newMsg]; 
        const path = systemContext === 'Pg' ? 'canned_messages_config/list' : `${systemContext}/canned_messages_config/list`;
        db.ref(path).set(newList); 
    };
    const updateCannedMessage = (id:string, field:string, value:any) => { 
        const newList = cannedMessages.map((m:any) => m.id === id ? { ...m, [field]: value } : m); 
        const path = systemContext === 'Pg' ? 'canned_messages_config/list' : `${systemContext}/canned_messages_config/list`;
        db.ref(path).set(newList); 
    };
    const deleteCannedMessage = (id:string) => { 
        requestConfirm('Excluir mensagem?', 'Esta mensagem será removida da lista.', () => { 
            const newList = cannedMessages.filter((m:any) => m.id !== id); 
            const path = systemContext === 'Pg' ? 'canned_messages_config/list' : `${systemContext}/canned_messages_config/list`;
            db.ref(path).set(newList); 
        }); 
    };

    const saveExtraCharge = () => {
        if (!formData.value || !formData.date || !formData.driverName) return notify("Valor, Data e Nome do Motorista são obrigatórios.", "error");
        
        // Garante ID Sequencial
        const nextId = generateNextTripId();

        const payload = {
            id: formData.id || nextId,
            isExtra: true,
            extraType: formData.type || 'Frete',
            driverName: formData.driverName || '',
            extraPhone: formData.phone || '',
            value: Number(formData.value) || 0,
            date: formData.date && formData.date.includes('/') ? parseDisplayDate(formData.date) : (formData.date || getTodayDate()),
            time: formData.time || '12:00',
            notes: formData.notes || '',
            paymentStatus: 'Pendente',
            status: 'Finalizada',
            pCount: 0
        };

        dbOp(formData.id ? 'update' : 'create', 'trips', payload);
        setModal(null);
        setFormData({});
        notify("Cobrança extra salva com sucesso!", "success");
    };

    const autoAssignPassenger = async (pax: any) => {
        // Se já estiver em uma viagem ativa no dia, não tenta alocar novamente
        const isAssigned = data.trips.some((t: any) => 
            t.date === pax.date && 
            t.status !== 'Cancelada' && 
            (t.passengerIds || []).some((pid: any) => String(pid) === String(pax.realId || pax.id))
        );
        if (isAssigned) return;

        const timeToMinutes = (t: string) => {
            if (!t) return -1;
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const isMipContext = systemContext === 'Mip';

        const trip = data.trips.find((t:any) => {
            if (t.date !== pax.date || t.status === 'Cancelada' || t.status === 'Finalizada') return false;
            if (t.passengerIds && t.passengerIds.some((pid: any) => String(pid) === String(pax.realId || pax.id))) return false;

            if (isMipContext && t.isTemp) {
                // MIP Temp Trip Logic: 30 min window + Day Type check
                if (t.dayType && t.dayType !== mipDayType) return false;
                
                const tripTimeMins = timeToMinutes(t.time);
                const paxTimeMins = timeToMinutes(pax.time);
                return paxTimeMins >= tripTimeMins && paxTimeMins <= (tripTimeMins + 30);
            } else {
                // Exact match
                return t.time && t.time.trim() === pax.time.trim();
            }
        });

        if (trip) {
            const currentPassIds = trip.passengerIds || [];
            const newPassIds = [...currentPassIds, pax.realId || pax.id];
            
            await dbOp('update', 'trips', { 
                id: trip.id, 
                passengerIds: newPassIds 
            });
            notify(`Passageiro alocado na viagem de ${trip.driverName}`, "success");
        }
    };

    const advanceQueue = () => {
        const queue = aiPassengerQueueRef.current;
        const index = aiPassengerIndexRef.current;
        if (queue.length > 0 && index < queue.length - 1) {
            const nextIndex = index + 1;
            setAiPassengerIndex(nextIndex);
            setFormData(queue[nextIndex]);
            notify(`Passageiro ${nextIndex + 1}/${queue.length} carregado!`, "success");
            return false; // Não fecha o modal
        } else {
            setAiPassengerQueue([]);
            setAiPassengerIndex(0);
            setModal(null);
            setFormData({});
            return true; // Fechou o modal
        }
    };

    const save = async (collection: string) => {
        try {
            if (collection === 'passengers') {
                if (!formData.name || !formData.neighborhood) return notify("Nome e Bairro obrigatórios", "error");
                
                // Check if a BLOCKED passenger with same name AND phone exists
                const blocked = data.passengers.find((p: any) => {
                    const nameSim = calculateSimilarity(p.name, formData.name);
                    const phoneSim = p.phone && formData.phone ? calculateSimilarity(p.phone, formData.phone) : 0;
                    return p.status === 'Bloqueado' && nameSim > 0.9 && phoneSim > 0.9;
                });

                if (blocked) {
                    return notify(`Passageiro BLOQUEADO encontrado: ${blocked.name}. Motivo: ${blocked.blockReason || 'Não informado'}`, "error");
                }

                const proceedSave = async (): Promise<boolean> => {
                    const id = formData.id || getNextId('passengers');
                    const payload = { ...formData, id, date: formData.date || getTodayDate() };
                    
                    await dbOp(formData.id ? 'update' : 'create', 'passengers', payload);
                    
                    if (!formData.id) { 
                         autoAssignPassenger(payload);
                    }

                    return advanceQueue();
                };

                // Check for duplicates
                const existing = data.passengers.find((p: any) => {
                    const nameSim = calculateSimilarity(p.name, formData.name);
                    const phoneSim = p.phone && formData.phone ? calculateSimilarity(p.phone, formData.phone) : 0;
                    return (nameSim > 0.8 || phoneSim > 0.8) && p.id !== formData.id;
                });

                if (existing) {
                    if (aiPassengerQueueRef.current.length > 0) {
                        addPersistentNotification(`Passageiro pulado, ID ${existing.id} é idêntico`);
                        advanceQueue();
                        return;
                    }
                    setConfirmState({
                        isOpen: true,
                        title: "Passageiro similar encontrado",
                        message: `Verifique o ID ${existing.id} pois estes dados parecem já estar cadastrados. Deseja cadastrar mesmo assim?`,
                        onConfirm: async () => {
                            setConfirmState({ ...confirmState, isOpen: false });
                            await proceedSave();
                        },
                        onCancel: () => {
                            setConfirmState({ ...confirmState, isOpen: false });
                            advanceQueue();
                        },
                        type: 'danger'
                    });
                    return;
                }
                
                const closed = await proceedSave();
                if (!closed) return; // Se não fechou, não continua para o setModal(null) global
            } else if (collection === 'drivers') {
                if (!formData.name) return notify("Nome obrigatório", "error");
                if (!formData.cpf) return notify("CPF obrigatório", "error");
                // Ensure phones is an array
                const phones = formData.phones || [{name: formData.name, phone: formData.phone}];
                await dbOp(formData.id ? 'update' : 'create', 'drivers', {...formData, phones});
            } else if (collection === 'lostFound') {
                if (!formData.description) return notify("Descrição obrigatória", "error");
                await dbOp(formData.id ? 'update' : 'create', 'lostFound', formData);
            } else if (collection === 'reschedule') {
                if (!formData.time) return notify("Horário obrigatório", "error");
                const p = data.passengers.find((x:any) => x.id === formData.id);
                if (p && p.status === 'Bloqueado') {
                    return notify(`Passageiro BLOQUEADO: ${p.name}. Motivo: ${p.blockReason || 'Não informado'}`, "error");
                }
                
                // Verificar se já está em uma viagem
                const isAssigned = data.trips.some((t: any) => 
                    t.date === formData.date && 
                    t.status !== 'Cancelada' && 
                    (t.passengerIds || []).some((pid: any) => String(pid) === String(formData.id))
                );
                if (isAssigned) return notify("Este passageiro já está alocado em uma viagem!", "error");

                await dbOp('update', 'passengers', { 
                    id: formData.id, 
                    time: formData.time, 
                    date: formData.date 
                });
                notify("Reagendado com sucesso!", "success");
            } else if (collection === 'rescheduleAll') {
                if (!formData.sourceTime || !formData.newTime) return notify("Preencha o horário de origem e o novo horário!", "error");
                
                // Identificar passageiros já alocados neste dia para não reagendá-los
                const assignedOnDate = new Set();
                data.trips.forEach((t: any) => {
                    if (t.date === formData.date && t.status !== 'Cancelada') {
                        (t.passengerIds || []).forEach((pid: any) => assignedOnDate.add(String(pid)));
                    }
                });

                const passengersToReschedule = data.passengers.filter((p: any) => {
                    const isSameTime = p.time === formData.sourceTime;
                    const isSameDate = p.date === formData.date;
                    const isNotBlocked = p.status !== 'Bloqueado';
                    const isNotAssigned = !assignedOnDate.has(String(p.realId || p.id));
                    
                    // Se não for Mistura, filtra pelo sistema atual
                    const systemMatch = systemContext === 'Mistura' || (p.system || 'Pg') === systemContext;

                    return isSameTime && isSameDate && isNotBlocked && isNotAssigned && systemMatch;
                });
                
                if (passengersToReschedule.length === 0) return notify("Nenhum passageiro pendente encontrado para este horário!", "error");
                
                for (const p of passengersToReschedule) {
                    await dbOp('update', 'passengers', {
                        id: p.id,
                        time: formData.newTime
                    });
                }
                notify(`${passengersToReschedule.length} passageiros reagendados!`, "success");
                setModal(null);
            } else if (collection === 'appointments') {
                if (!formData.passengerInput || !formData.date || !formData.time) return notify("Preencha todos os campos!", "error");
                const identifiers = formData.passengerInput.split(',').map((s: string) => s.trim()).filter(Boolean);
                
                let foundAny = false;
                for (const idOrName of identifiers) {
                    const p = data.passengers.find((p: any) => String(p.id) === idOrName || p.name.toLowerCase() === idOrName.toLowerCase());
                    if (p) {
                        if (p.status === 'Bloqueado') {
                            notify(`Passageiro BLOQUEADO: ${p.name}. Motivo: ${p.blockReason || 'Não informado'}`, "error");
                            continue;
                        }
                        await dbOp('update', 'passengers', {
                            id: p.id,
                            date: formData.date,
                            time: formData.time
                        });
                        foundAny = true;
                    } else {
                        notify(`Passageiro não encontrado: ${idOrName}`, "error");
                    }
                }
                if (foundAny) notify("Agendamentos criados!", "success");
            } else if (collection === 'blockPassenger') {
                if (!formData.id) return notify("Erro: ID não encontrado", "error");
                await dbOp('update', 'passengers', { 
                    id: formData.id, 
                    status: 'Bloqueado', 
                    blockReason: formData.blockReason || 'Motivo não informado' 
                });
                notify("Passageiro bloqueado com sucesso!", "success");
            }
            setModal(null);
            setFormData({});
        } catch (e: any) {
            notify("Erro ao salvar: " + e.message, "error");
        }
    };

    const handleSmartCreate = async () => {
        if(!aiInput.trim()) return notify("Diga algo!", "error");
        if(!geminiKey) return notify("Configure a API Key nas configurações para usar o Cadastro Mágico.", "error");
        setAiLoading(true);
        try {
            const bairros = (systemContext === 'Mip' ? BAIRROS_MIP : BAIRROS).join(',');
            const prompt = `Extraia um ARRAY JSON de: "${aiInput}". Cada objeto deve ter os campos: name, phone, neighborhood (de: ${bairros}), address, reference, passengerCount (int, pad 1), luggageCount (int, pad 0), payment ("Dinheiro", "Pix", "Cartão"), time (HH:mm). Se faltar use null.`;
            
            const res = await callGemini(prompt, geminiKey);
            
            if (!res) throw new Error("A IA não retornou nada. Verifique sua chave API.");

            const jsonArray = JSON.parse(res.trim());
            if (!Array.isArray(jsonArray)) throw new Error("A IA não retornou um array.");

            const processedPassengers = jsonArray.map((json: any) => {
                const validPayments = ['Dinheiro', 'Pix', 'Cartão'];
                let finalPayment = 'Dinheiro';
                
                if (json.payment) {
                    const found = validPayments.find(p => p.toLowerCase() === json.payment.toLowerCase());
                    if (found) finalPayment = found;
                }

                let timeToUse = json.time;
                if (!timeToUse) {
                    const now = new Date();
                    timeToUse = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                }

                return {
                    ...json,
                    time: timeToUse,
                    payment: finalPayment, 
                    luggageCount: json.luggageCount || 0, 
                    status: 'Ativo', 
                    date: getTodayDate()
                };
            });

            setAiPassengerQueue(processedPassengers);
            setAiPassengerIndex(0);
            setFormData(processedPassengers[0]);
            
            setAiModal(false); 
            setModal('passenger'); 
            setAiInput('');
        } catch(e: any) { 
            notify("Erro IA: " + e.message, "error"); 
            console.error(e); 
        }
        finally { setAiLoading(false); }
    };

    const toggleMic = () => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return notify("Seu navegador não suporta reconhecimento de voz.", "error");
        if (isListening) { if (timerRef.current) timerRef.current.stop(); setIsListening(false); return; }
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR'; recognition.continuous = false; recognition.interimResults = false;
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (e:any) => { setAiInput((prev:string) => (prev ? prev + ' ' : '') + e.results[0][0].transcript); setIsListening(false); };
        recognition.onerror = (e:any) => { console.error("Erro voz:", e); setIsListening(false); };
        recognition.onend = () => setIsListening(false);
        recognition.start(); timerRef.current = recognition;
    };

    const simulate = () => {
        // Relax check: Allow if driverId is present OR (driverName is present AND system is Mip)
        if (!formData.driverId && !(systemContext === 'Mip' && formData.driverName)) {
             // Tenta achar motorista pelo nome antes de falhar
             const drByName = data.drivers.find((d:any) => d.name.toLowerCase().trim() === (formData.driverName||'').toLowerCase().trim());
             if (drByName) {
                 formData.driverId = drByName.id; // Auto-fix ID
             } else {
                 return notify("Selecione um motorista", "error");
             }
        }
        
        let dr = data.drivers.find((d:any) => d.id === formData.driverId);
        if (!dr && formData.driverId) {
            dr = data.drivers.find((d:any) => d.realId === formData.driverId);
        }
        
        // If no driver found by ID (MIP case), construct a dummy driver object from name
        const driverObj = dr || (formData.driverName ? { name: formData.driverName, capacity: 15, id: 'temp' } : null);
        
        if (!driverObj) return notify("Motorista não identificado", "error");

        const driverCapacity = driverObj.capacity ? parseInt(driverObj.capacity, 10) : 15;

        if (formData.isMadrugada) {
             setSuggestedTrip({ driver: driverObj, time: formData.time, passengers: [], occupancy: 0, date: formData.date || getTodayDate() });
             return;
        }
        
        const time = formData.time;
        if (!time) return notify("Selecione um horário", "error");

        let tripDate = formData.date || getTodayDate();
        let tripTime = time;

        // 0. Identificar passageiros já alocados neste dia (em qualquer horário)
        const occupiedPassOnDate = new Set();
        const currentTripId = editingTripId ? String(editingTripId) : null;

        data.trips.forEach((t:any) => {
            if (String(t.id) === currentTripId) return; // PULA A PRÓPRIA VIAGEM
            if (t.date === tripDate && t.status !== 'Cancelada') {
                if (t.passengerIds && Array.isArray(t.passengerIds)) {
                    t.passengerIds.forEach((pid:any) => {
                        occupiedPassOnDate.add(String(pid));
                    });
                }
            }
        });

        // Helper para normalizar hora
        const normalizeTime = (t: string) => t ? t.trim() : '';
        
        // Helper para converter hora em minutos
        const timeToMinutes = (t: string) => {
            if (!t) return -1;
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const tripTimeMins = timeToMinutes(tripTime);
        // Se for MIP e viagem temporária (ou nova), aplica intervalo de 30 min. 
        // Se não, busca exata.
        // O usuário disse "As viagens temporárias na MIP somente devem aparecer com horario de x + 30"
        // Vamos assumir que se o contexto é MIP, aplica essa regra.
        const isMipContext = systemContext === 'Mip';
        
        const isTimeMatch = (pTime: string) => {
            const pTimeMins = timeToMinutes(pTime);
            if (isMipContext) {
                // Intervalo [tripTime, tripTime + 30]
                return pTimeMins >= tripTimeMins && pTimeMins <= (tripTimeMins + 30);
            }
            return normalizeTime(pTime) === normalizeTime(tripTime);
        };

        // 1. Filtrar Candidatos (Livres no dia)
        const candidates = data.passengers.filter((p:any) => {
            const systemMatch = systemContext === 'Mistura' || (p.system || 'Pg') === systemContext;
            return p.status === 'Ativo' && 
                   p.date === tripDate && 
                   isTimeMatch(p.time) &&
                   systemMatch &&
                   !occupiedPassOnDate.has(String(p.realId || p.id));
        });

        if (candidates.length === 0) return notify("Nenhum passageiro livre encontrado para este horário.", "info");

        // 2. Encontrar a "Âncora" (Foco da rota)
        // Lógica: A maior família (passengerCount). Desempate pelo início da cidade.
        const anchor = [...candidates].sort((a:any, b:any) => {
            const countA = parseInt(a.passengerCount || 1);
            const countB = parseInt(b.passengerCount || 1);
            if (countB !== countA) return countB - countA; // Maior grupo primeiro
            return getBairroIdx(a.neighborhood, systemContext) - getBairroIdx(b.neighborhood, systemContext); // Menor índice geográfico
        })[0];

        const anchorIdx = getBairroIdx(anchor.neighborhood, systemContext);

        // 3. Ordenar candidatos baseado na proximidade da Âncora
        // Critérios: Mesmo endereço > Mesmo Bairro > Bairro Vizinho > Tamanho do grupo
        candidates.sort((a:any, b:any) => {
            // Prioridade 1: Mesmo Endereço Exato
            const sameAddrA = a.address && anchor.address && a.address.trim().toLowerCase() === anchor.address.trim().toLowerCase();
            const sameAddrB = b.address && anchor.address && b.address.trim().toLowerCase() === anchor.address.trim().toLowerCase();
            
            if (sameAddrA && !sameAddrB) return -1;
            if (!sameAddrA && sameAddrB) return 1;

            // Prioridade 2: Proximidade do Bairro (Diferença de índice)
            const idxA = getBairroIdx(a.neighborhood, systemContext);
            const idxB = getBairroIdx(b.neighborhood, systemContext);
            const distA = Math.abs(idxA - anchorIdx);
            const distB = Math.abs(idxB - anchorIdx);

            if (distA !== distB) return distA - distB; // Quanto menor a distância, melhor

            // Prioridade 3: Tamanho do grupo (Maiores primeiro para encher logo)
            const countA = parseInt(a.passengerCount || 1);
            const countB = parseInt(b.passengerCount || 1);
            return countB - countA;
        });

        // 4. Preencher a Van (Bucket Fill)
        const selectedPassengers = [];
        let currentOccupancy = 0;

        for (const pax of candidates) {
            const pCount = parseInt(pax.passengerCount || 1, 10);
            if (currentOccupancy + pCount <= driverCapacity) {
                selectedPassengers.push(pax);
                currentOccupancy += pCount;
            }
        }

        setSuggestedTrip((prev: any) => ({
            ...prev,
            driver: driverObj,
            time: tripTime,
            passengers: selectedPassengers,
            occupancy: currentOccupancy,
            date: tripDate
        }));
        
        if (selectedPassengers.length < candidates.length) {
            notify(`Limite de ${driverCapacity} lugares atingido. Priorizando rota da maior família.`, "info");
        } else if (selectedPassengers.length > 0) {
            notify(`${selectedPassengers.length} grupos adicionados.`, "success");
        }
    };
    
    const addById = () => {
        if (!searchId || !suggestedTrip) return;
        const p = data.passengers.find((x:any) => x.id === searchId || x.realId === searchId);
        if (!p) return notify("Passageiro não encontrado", "error");
        
        if (p.status === 'Bloqueado') {
            return notify(`Passageiro BLOQUEADO! Motivo: ${p.blockReason || 'Não informado'}`, "error");
        }

        const pId = p.realId || p.id;
        if (suggestedTrip.passengers.some((x:any) => (x.realId || x.id) === pId)) return notify("Já está na lista atual", "info");
        
        const paxCount = parseInt(p.passengerCount || 1, 10);
        const currentCap = suggestedTrip.driver.capacity ? parseInt(suggestedTrip.driver.capacity, 10) : 15;

        // Check overlap at same time
        const isOccupiedSameTime = data.trips.some((t:any) => 
            t.date === suggestedTrip.date && 
            t.status !== 'Cancelada' && 
            t.time === suggestedTrip.time &&
            t.passengerIds && 
            t.passengerIds.includes(pId)
        );

        if (isOccupiedSameTime) {
            notify(`Aviso: Passageiro já está em outra viagem neste mesmo horário!`, "info");
        }
        
        if (suggestedTrip.occupancy + paxCount > currentCap) {
            return notify(`Capacidade excedida! Restam ${currentCap - suggestedTrip.occupancy} lugares.`, "error");
        }

        const newPassList = [...suggestedTrip.passengers, p].sort((a,b)=>getBairroIdx(a.neighborhood)-getBairroIdx(b.neighborhood));
        const newOcc = suggestedTrip.occupancy + paxCount;
        
        setSuggestedTrip({ ...suggestedTrip, passengers: newPassList, occupancy: newOcc });
        setSearchId('');
    };
    
    const autoFill = () => { simulate(); };
    
    const removePass = (pid: string) => {
        if (!suggestedTrip) return;
        const newPassList = suggestedTrip.passengers.filter((p:any) => p.id !== pid);
        const newOcc = suggestedTrip.occupancy - parseInt(suggestedTrip.passengers.find((x:any)=>x.id===pid)?.passengerCount || 1);
        setSuggestedTrip({ ...suggestedTrip, passengers: newPassList, occupancy: newOcc });
    };
    
    const confirmTrip = () => {
        if (!suggestedTrip) return;
        
        let tripId = editingTripId;
        
        // Se for nova viagem (não edição), gera ID sequencial
        if (!tripId) {
            tripId = generateNextTripId();
        }

        const finalTime = formData.time || suggestedTrip.time;
        if (!finalTime) return notify("Horário é obrigatório.", "error");

        const finalDate = formData.date || suggestedTrip.date || getTodayDate();

        // 1. Prepara lista de passageiros para salvar (Independente se é Madrugada ou não)
        // Isso corrige o problema de duplicidade, pois o addById checa se o passageiro já existe em passengerIds
        const passengerIdsToSave = suggestedTrip.passengers.map((p:any) => p.realId || p.id);
        const passengersSnapshotToSave = suggestedTrip.passengers;

        const sp = spList.find((s:any) => s.name === suggestedTrip.driver.name);
        
        const payload: any = {
            id: tripId,
            driverId: suggestedTrip.driver.realId || suggestedTrip.driver.id,
            driverName: suggestedTrip.driver.name,
            date: finalDate,
            time: finalTime,
            status: 'Em andamento',
            isMadrugada: !!formData.isMadrugada, 
            isTemp: false,
            passengerIds: passengerIdsToSave,
            passengersSnapshot: passengersSnapshotToSave,
            vaga: suggestedTrip.vaga || (sp ? sp.vaga : undefined)
        };

        if (formData.isMadrugada) {
             if (sp) {
                 const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
                 db.ref(tableSystemContext === 'Pg' ? `daily_tables/${finalDate}/madrugada/${sp.vaga}` : `${tableSystemContext}/daily_tables/${finalDate}/madrugada/${sp.vaga}`).update({
                     time: finalTime,
                     qtd: suggestedTrip.occupancy || 0
                 });
                 payload.pCountSnapshot = suggestedTrip.occupancy || 0;
             }
        } 
        
        // Atualiza status do passageiro no banco (histórico de última viagem)
        suggestedTrip.passengers.forEach((p:any) => {
            const pSystem = p.system || systemContext;
            const pId = p.realId || p.id;
            db.ref(pSystem === 'Pg' ? `passengers/${pId}` : `${pSystem}/passengers/${pId}`).update({ time: finalTime, date: finalDate });
            
            // REMOVE PASSAGEIRO DE OUTRAS VIAGENS DO MESMO DIA (EVITA DUPLICIDADE)
            data.trips.forEach((t:any) => {
                if (t.id === tripId) return; // Pula a própria viagem
                if (t.date === finalDate && t.status !== 'Cancelada' && t.passengerIds && t.passengerIds.includes(pId)) {
                    const newIds = t.passengerIds.filter((pid:string) => pid !== pId);
                    const newSnapshot = (t.passengersSnapshot || []).filter((ps:any) => (ps.realId || ps.id) !== pId);
                    dbOp('update', 'trips', { id: t.id, passengerIds: newIds, passengersSnapshot: newSnapshot });
                }
            });
        });
        
        payload.ticketPrice = pricePerPassenger;
        payload.pricePerPassenger = pricePerPassenger;
        
        const pCount = suggestedTrip.occupancy || 0;
        let val = pCount * (pricePerPassenger || 0);
        payload.value = val;

        dbOp(editingTripId ? 'update' : 'create', 'trips', payload);
        
        setModal(null);
        setSuggestedTrip(null);
        setEditingTripId(null);
    };
    
    const openEditTrip = (t:any) => {
        if (t.isExtra) {
            setFormData({
                id: t.id,
                type: t.extraType || 'Frete',
                driverName: t.driverName,
                phone: t.extraPhone,
                value: t.value,
                date: t.date,
                time: t.time,
                notes: t.notes
            });
            setModal('extraCharge');
            return;
        }
        let dr = data.drivers.find((d:any)=>d.id===t.driverId); 
        
        // Se não achou por ID (MIP Temp Trip), tenta achar por nome
        if (!dr && t.driverName) {
            dr = data.drivers.find((d:any) => d.name.toLowerCase().trim() === t.driverName.toLowerCase().trim());
        }

        let pax = []; let occ = 0;
        
        // Tenta carregar passageiros reais primeiro (Snapshot ou Live ID)
        if (t.passengersSnapshot && t.passengersSnapshot.length > 0) {
            pax = t.passengersSnapshot;
            occ = pax.reduce((a:any,b:any)=>a+parseInt(b.passengerCount||1),0);
        } else if (t.passengerIds && t.passengerIds.length > 0) {
            pax = data.passengers.filter((p:any)=>(t.passengerIds||[]).includes(p.realId || p.id));
            occ = pax.reduce((a:any,b:any)=>a+parseInt(b.passengerCount||1),0);
        } else if (t.isMadrugada && (t.pCountSnapshot || t.pCount)) {
            // Fallback APENAS se não houver registro de passageiros reais (Legado)
            occ = parseInt(t.pCountSnapshot || t.pCount || 0); 
            for(let i=0; i<occ; i++) pax.push({ id: `dummy_${i}`, name: 'Passageiro Madrugada', neighborhood: 'Madrugada', passengerCount: 1 });
        }
        
        setFormData({ 
            driverId: dr ? dr.id : t.driverId, 
            driverName: t.driverName,
            time: t.time, 
            date: t.date, 
            isMadrugada: !!t.isMadrugada 
        }); 
        
        setEditingTripId(t.id);
        setSuggestedTrip({ 
            driver: dr || {name: t.driverName || 'Desconhecido', capacity: 0}, 
            time: t.time, 
            passengers: pax, 
            occupancy: occ, 
            date: t.date,
            vaga: t.vaga
        });
        setModal('trip');
    };
    
    const updateTripStatus = (id: string, status: string) => {
        dbOp('update', 'trips', { id, status });
        const trip = data.trips.find((t:any) => t.id === id);
        if (trip && status === 'Finalizada') {
            if (!trip.passengersSnapshot && trip.passengerIds) {
                const pax = data.passengers.filter((p:any) => trip.passengerIds.includes(p.realId || p.id));
                const tripSystem = trip.system || systemContext;
                db.ref(tripSystem === 'Pg' ? `trips/${id}` : `${tripSystem}/trips/${id}`).update({ passengersSnapshot: pax });
            }
        }
    };

    const duplicateTrip = (t: any) => {
        // Garante ID Sequencial
        const newId = generateNextTripId();
        
        const newTrip = {
            ...t,
            id: newId, 
            date: getTodayDate(),
            status: 'Em andamento',
            passengerIds: t.passengerIds || [],
            passengersSnapshot: null,
            pCountSnapshot: null,
            isMadrugada: !!t.isMadrugada, // FIX: Force boolean
            isTemp: false
        };
        
        // CLEANUP: Ensure no undefined values
        Object.keys(newTrip).forEach(key => newTrip[key] === undefined && delete newTrip[key]);
        
        delete newTrip.createdAt;
        dbOp('create', 'trips', newTrip);
        notify('Viagem duplicada para hoje!', 'success');
    };

    const updateTableStatus = (vaga: string, status: string | null) => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        const newStatus = { ...tableStatus };
        if (status) newStatus[vaga] = status; else delete newStatus[vaga];
        let newLousa = [...lousaOrder];
        if (status === 'lousa') {
            const exists = newLousa.some((i:any) => i.vaga === vaga);
            if (!exists) newLousa.push({ vaga, uid: generateUniqueId(), riscado: false });
        } else if (status === 'confirmed') {
            newLousa = newLousa.filter((i:any) => i.vaga !== vaga);
        } else {
            newLousa = newLousa.filter((i:any) => i.vaga !== vaga);
        }
        db.ref(tableSystemContext === 'Pg' ? `daily_tables/${currentOpDate}` : `${tableSystemContext}/daily_tables/${currentOpDate}`).update({ status: newStatus, lousaOrder: newLousa });
    };

    const toggleLousaFromConfirmados = (vaga: string) => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        const isInLousa = lousaOrder.some((i:any) => i.vaga === vaga);
        const days = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
        const dayName = days[new Date(lousaDate + 'T12:00:00').getDay()];
        const isFolga = effectiveFolgas[dayName]?.includes(vaga);
        
        if (isInLousa) {
            const newOrder = lousaOrder.filter((i:any) => i.vaga !== vaga);
            db.ref(tableSystemContext === 'Pg' ? `daily_tables/${lousaDate}/lousaOrder` : `${tableSystemContext}/daily_tables/${lousaDate}/lousaOrder`).set(newOrder);
            notify("Removido da lousa!", "delete");
        } else {
            if (isFolga) return notify("Esta vaga está de folga hoje!", "error");
            const newOrder = [...lousaOrder, { vaga, uid: generateUniqueId(), riscado: false }];
            db.ref(tableSystemContext === 'Pg' ? `daily_tables/${lousaDate}/lousaOrder` : `${tableSystemContext}/daily_tables/${lousaDate}/lousaOrder`).set(newOrder);
            notify("Adicionado à lousa!", "success");
        }
    };

    const cancelConfirmation = (vaga: string) => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        db.ref(tableSystemContext === 'Pg' ? `daily_tables/${currentOpDate}/status/${vaga}` : `${tableSystemContext}/daily_tables/${currentOpDate}/status/${vaga}`).remove();
        notify("Confirmação cancelada!", "delete");
    };

    const removeTempTrip = (vaga: string) => {
        const driverSp = spList.find((d:any) => d.vaga === vaga);
        if (!driverSp) return;
        const trip = data.trips.find((t:any) => 
            t.isTemp && 
            t.date === getTodayDate() && 
            (t.driverName === driverSp.name || t.vaga === vaga)
        );
        if (trip) db.ref(systemContext === 'Pg' ? `trips/${trip.id}` : `${systemContext}/trips/${trip.id}`).remove();
    };

    const addNullLousaItem = () => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        const newItem = { vaga: 'NULL', uid: generateUniqueId(), riscado: false, isNull: true };
        const newOrder = [...lousaOrder, newItem];
        db.ref(tableSystemContext === 'Pg' ? `daily_tables/${lousaDate}/lousaOrder` : `${tableSystemContext}/daily_tables/${lousaDate}/lousaOrder`).set(newOrder);
    };

    const handleLousaAction = (uid: string | null, action: string, vagaRef: string | null = null) => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        let newLousa = [...lousaOrder];
        const itemIndex = newLousa.findIndex((i:any) => i.uid === uid);
        if (itemIndex === -1 && action !== 'duplicate' && action !== 'remove_all') return;
        if (itemIndex > -1) newLousa[itemIndex] = { ...newLousa[itemIndex] };

        if (action === 'riscar') {
            const newRiscadoState = !newLousa[itemIndex].riscado;
            newLousa[itemIndex].riscado = newRiscadoState;
            logAction(newRiscadoState ? 'Riscou Vaga na Lousa' : 'Desriscou Vaga na Lousa', `Vaga: ${newLousa[itemIndex].vaga}`);
        } else if (action === 'remove') {
            const itemToRemove = newLousa[itemIndex];
            if(itemToRemove) {
                removeTempTrip(itemToRemove.vaga);
                logAction('Removeu Vaga da Lousa', `Vaga: ${itemToRemove.vaga}`);
            }
            newLousa.splice(itemIndex, 1);
            // Don't remove status anymore, keep in confirmed list
        } else if (action === 'remove_all') {
            if (vagaRef) {
                removeTempTrip(vagaRef);
                newLousa = newLousa.filter((i:any) => i.vaga !== vagaRef);
                logAction('Removeu Todas as Vagas da Lousa', `Vaga: ${vagaRef}`);
                // Don't remove status anymore, keep in confirmed list
            }
        } else if (action === 'duplicate') {
            if (itemIndex > -1) {
                const original = newLousa[itemIndex];
                newLousa.push({ vaga: original.vaga, uid: generateUniqueId(), riscado: false });
                logAction('Duplicou Vaga na Lousa', `Vaga: ${original.vaga}`);
            } else if (vagaRef) {
                 newLousa.push({ vaga: vagaRef, uid: generateUniqueId(), riscado: false });
                 logAction('Duplicou Vaga na Lousa', `Vaga: ${vagaRef}`);
            }
        } else if (action === 'baixar') {
            // Marca como baixou (não conta mais no horário)
            newLousa[itemIndex].baixou = true;
            // Remove a viagem temporária que estava "pendurada" nessa vaga
            removeTempTrip(newLousa[itemIndex].vaga);
            // Cria uma nova entrada limpa no final da fila
            newLousa.push({ vaga: newLousa[itemIndex].vaga, uid: generateUniqueId(), riscado: false });
            logAction('Baixou Vaga na Lousa', `Vaga: ${newLousa[itemIndex].vaga}`);
        } else if (action === 'cancelar_baixar') {
            if (itemIndex > -1) {
                const vaga = newLousa[itemIndex].vaga;
                newLousa[itemIndex].baixou = false;
                // Encontrar a última ocorrência desta vaga na lousa (que deve ser a cópia criada pelo baixar)
                const lastIndex = [...newLousa].reverse().findIndex((d:any) => d.vaga === vaga);
                if (lastIndex !== -1) {
                    const actualIndex = newLousa.length - 1 - lastIndex;
                    // Só remove se não for o próprio item que estamos desfazendo
                    if (actualIndex !== itemIndex) {
                        newLousa.splice(actualIndex, 1);
                    }
                }
            }
        }
        
        db.ref(tableSystemContext === 'Pg' ? `daily_tables/${lousaDate}/lousaOrder` : `${tableSystemContext}/daily_tables/${lousaDate}/lousaOrder`).set(newLousa);
    };

    const addMadrugadaVaga = () => {
        setTempVagaMadrugada('');
        setModal('madrugadaVaga');
    };

    const addNullMadrugadaItem = () => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        if (!madrugadaList.includes('NULL')) {
            const newList = [...madrugadaList, 'NULL'];
            db.ref(tableSystemContext === 'Pg' ? 'madrugada_config/list' : `${tableSystemContext}/madrugada_config/list`).set(newList);
            notify("Pulo de horário adicionado!", "success");
        } else {
            // Se já existe, apenas avisa ou permite múltiplos? 
            // Na lousa permite múltiplos porque cada um tem um UID.
            // Na madrugadaList é apenas uma lista de strings (vagas).
            // Se quisermos múltiplos pulos, precisamos de algo mais complexo ou apenas permitir 'NULL' uma vez.
            // Mas a madrugadaList parece ser uma lista de vagas fixas que rotacionam.
            // Se for uma vaga fixa, 'NULL' ser fixa faz sentido.
            notify("Pulo de horário já está na lista!", "info");
        }
    };

    const confirmAddMadrugadaVaga = () => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        if (!tempVagaMadrugada) return;
        if (!madrugadaList.includes(tempVagaMadrugada)) {
            const newList = [...madrugadaList, tempVagaMadrugada];
            db.ref(tableSystemContext === 'Pg' ? 'madrugada_config/list' : `${tableSystemContext}/madrugada_config/list`).set(newList);
            notify("Vaga adicionada!", "success");
        }
        setModal(null);
    };

    const removeMadrugadaVaga = (vaga: string) => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        requestConfirm("Remover esta vaga da madrugada?", "Ela sairá da lista da madrugada permanentemente.", () => {
            const newList = madrugadaList.filter((v: string) => v !== vaga);
            db.ref(tableSystemContext === 'Pg' ? 'madrugada_config/list' : `${tableSystemContext}/madrugada_config/list`).set(newList);
            logAction('Removeu Vaga da Madrugada', `Vaga: ${vaga}`);
        });
    };

    const toggleMadrugadaRiscado = (vaga: string) => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        const currentData = madrugadaData[vaga] || {};
        if (currentData.riscado) {
             db.ref(tableSystemContext === 'Pg' ? `daily_tables/${currentOpDate}/madrugada/${vaga}` : `${tableSystemContext}/daily_tables/${currentOpDate}/madrugada/${vaga}`).update({ riscado: false, comment: null });
             logAction('Desriscou Vaga na Madrugada', `Vaga: ${vaga}`);
        } else {
            setVagaToBlock(vaga);
            setTempJustification('');
            setModal('madrugadaBlock');
        }
    };

    const confirmMadrugadaBlock = () => {
        const tableSystemContext = (user.username === 'Breno' && systemContext === 'Mistura') ? 'Pg' : systemContext;
        if (!vagaToBlock) return;
        db.ref(tableSystemContext === 'Pg' ? `daily_tables/${currentOpDate}/madrugada/${vagaToBlock}` : `${tableSystemContext}/daily_tables/${currentOpDate}/madrugada/${vagaToBlock}`).update({ 
            riscado: true, 
            comment: tempJustification 
        });
        logAction('Riscou Vaga na Madrugada', `Vaga: ${vagaToBlock} - Motivo: ${tempJustification}`);
        setModal(null);
        setVagaToBlock(null);
    };

    const openMadrugadaTrip = (vaga: string, date: string) => {
        const sp = spList.find((s:any) => s.vaga === vaga);
        if (!sp) return notify("Vaga não encontrada na lista geral", "error");
        
        const driver = data.drivers.find((d:any) => d.name === sp.name);
        
        // BUSCA A VIAGEM PELOS ATRIBUTOS, NÃO PELO ID
        const existingTrip = data.trips.find((t:any) => 
            t.isMadrugada && 
            t.date === date && 
            t.vaga === vaga && 
            t.status !== 'Cancelada' // Ignora canceladas para permitir recriar
        );
        
        if (existingTrip) {
            openEditTrip(existingTrip);
        } else {
            setFormData({ 
                isMadrugada: true, 
                driverId: driver ? driver.id : '', 
                time: '', // Vazio para forçar a escolha no modal
                date: date 
            });
            setSuggestedTrip(null); // Nulo para abrir o formulário de configuração, não o resumo
            setEditingTripId(null);
            setModal('trip');
        }
    };

    const sendBillingMessage = (trip: any) => {
        if (trip.isExtra) {
            if (!trip.extraPhone) return notify("Motorista sem telefone", "error");
            const msg = `Olá ${trip.driverName}, referente ao ${trip.extraType || 'Frete'} do dia ${formatDisplayDate(trip.date)} às ${trip.time}. Valor: R$ ${Number(trip.value).toFixed(2).replace('.', ',')}. Status: ${trip.isPaid ? 'PAGO' : 'PENDENTE'}.`;
            window.open(`https://wa.me/55${trip.extraPhone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
            return;
        }
        const d = data.drivers.find((x:any) => x.id === trip.driverId);
        
        if (!d) return notify("Motorista não encontrado", "error");
        
        const phones = d.phones || (d.phone ? [{name: d.name, phone: d.phone}] : []);
        
        if (phones.length === 0) return notify("Motorista sem telefone", "error");
        
        const msg = `Olá ${d.name}, referente à viagem #${trip.id} do dia ${formatDisplayDate(trip.date)} às ${trip.time}. Valor: R$ ${Number(trip.value).toFixed(2).replace('.', ',')}. Status: ${trip.isPaid ? 'PAGO' : 'PENDENTE'}.`;
        
        if (phones.length === 1) {
            window.open(`https://wa.me/55${phones[0].phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
        } else {
            setFormData({
                phones: phones,
                onSelect: (phone: string) => {
                    window.open(`https://wa.me/55${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
                }
            });
            setModal('phoneSelection');
        }
    };

    const sendPranchetaBillingMessage = (vaga: string, driverName: string, phone: string) => {
        if (!phone) return notify("Motorista sem telefone", "error");
        
        const template = `📢 AVISO DE VENCIMENTO

Olá ${driverName}, Informamos que o valor da prancheta é de R$ ${pranchetaValue}

Caso o pagamento não seja efetuado até sexta-feira, dentro do horário de funcionamento do escritório das 6:00 até às 20:00, a vaga será automaticamente bloqueado no sábado

⚠️ Importante: enquanto o débito não for quitado, não será possível marcar a vaga,não adiantará insistir!

Agradecemos pela atenção e desejamos um bom trabalho a todos!`;

        const encodedMsg = encodeURIComponent(template)
            .replace(/%F0%9F%93%A2/g, '📢')
            .replace(/%E2%9A%A0%EF%B8%8F/g, '⚠️')
            .replace(/%20/g, ' '); // Use literal spaces for better compatibility

        window.open(`https://wa.me/55${phone.replace(/\D/g,'')}?text=${encodedMsg}`, '_blank');
    };

    const handleGlobalTouchStart = (e:any) => { 
        if(view==='table'||menuOpen) return; 
        globalTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; 
    };
    const handleGlobalTouchEnd = (e:any) => { 
        if(view==='table'||menuOpen) return; 
        const dx = e.changedTouches[0].clientX - globalTouchRef.current.x; 
        const dy = e.changedTouches[0].clientY - globalTouchRef.current.y;
        
        // Gesto mais intencional: 
        // 1. Deve começar perto da borda esquerda (x < 50)
        // 2. O movimento horizontal (dx) deve ser maior que o vertical (dy)
        // 3. O deslocamento deve ser de pelo menos 100px
        if (dx > 100 && Math.abs(dx) > Math.abs(dy) * 2 && globalTouchRef.current.x < 50) {
            setMenuOpen(true);
        }
    };

    if (isLoading) return <div id="app-loader" className="fixed inset-0 bg-black flex items-center justify-center"><div className="text-amber-500 font-bold">CARREGANDO...</div></div>;
    if (!isAuthenticated) return <LoginScreen theme={theme} />;

    // ... (Main Render with updated props)
    return (
        <SubscriptionLock user={user} systemContext={systemContext}>
            <div className={`h-[100dvh] w-full overflow-hidden ${theme.bg} ${theme.text} font-sans flex`} 
                 onTouchStart={handleGlobalTouchStart} 
                 onTouchEnd={handleGlobalTouchEnd}
                 onContextMenu={(e) => { 
                     if (window.matchMedia('(pointer: fine)').matches) {
                         e.preventDefault(); 
                         setCmdOpen(true); 
                     }
                 }} // ACESSO RÁPIDO (BOTÃO DIREITO)
            >
                 {user && user.username === 'Breno' && (
                    <div className={`fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-gray-800/90 backdrop-blur-md p-1 rounded-full flex items-center gap-1 border border-white/10 shadow-xl transition-all duration-300 ${isSystemSelectorExpanded ? 'w-auto px-2' : 'w-10 h-10 justify-center'}`}>
                        {isSystemSelectorExpanded ? (
                            <>
                                {['Mistura', 'Pg', 'Mip', 'Sv'].map(sys => {
                                    // Calculate expiration for this system
                                    let timeLeft = '';
                                    if (subData) {
                                        const systemExp = sys !== 'Mistura' ? subData[`expiresAt_${sys}`] : subData.expiresAt;
                                        
                                        let expiresAtStr = systemExp;
                                        
                                        if (expiresAtStr) {
                                            const exp = new Date(expiresAtStr);
                                            const now = new Date();
                                            const diff = exp.getTime() - now.getTime();
                                            if (diff > 0) {
                                                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                                const totalHours = Math.floor(diff / (1000 * 60 * 60));
                                                timeLeft = `${days}d (${totalHours}h)`;
                                            } else {
                                                timeLeft = 'EXP';
                                            }
                                        }
                                    }

                                    return (
                                        <button 
                                            key={sys}
                                            onClick={() => setSystemContext(sys)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors flex items-center gap-1 ${systemContext === sys ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                                            <span>{sys}</span>
                                            {timeLeft && <span className="text-[9px] opacity-60 bg-black/20 px-1 rounded">{timeLeft}</span>}
                                        </button>
                                    );
                                })}
                                <div className="w-px h-4 bg-white/10 mx-1"></div>
                                <button 
                                    onClick={() => setIsSystemSelectorExpanded(false)}
                                    className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                                    title="Recuar menu"
                                >
                                    <Icons.ChevronUp size={14} />
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => setIsSystemSelectorExpanded(true)}
                                className="w-full h-full flex items-center justify-center text-white/70 hover:text-white"
                                title="Expandir menu"
                            >
                                <Icons.ChevronDown size={18} />
                            </button>
                        )}
                    </div>
                )}
                 <Toast message={notification.message} type={notification.type} visible={notification.visible} image={notification.image} />
                 <ConfirmModal isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState((prev:any) => ({ ...prev, isOpen: false }))} type={confirmState.type} theme={theme} />
                <AlertModal 
                    isOpen={alertState.isOpen} 
                    title={alertState.title} 
                    message={alertState.message} 
                    type={alertState.type} 
                    onClose={() => setAlertState((prev:any) => ({ ...prev, isOpen: false }))} 
                    theme={theme} 
                />

                <AdminAuthModal 
                    isOpen={adminAuthModal.isOpen}
                    onClose={() => setAdminAuthModal({ isOpen: false })}
                    onAuth={() => {
                        setIsAdminAuthorized(true);
                        setAdminAuthModal({ isOpen: false });
                        notify("Autorizado com sucesso! Agora você pode apagar múltiplos dados.", "success");
                    }}
                    theme={theme}
                    users={data.users}
                />
                 
                 {/* Premium Utilities */}
                 <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} theme={theme} actions={commandActions} />
                 <QuickCalculator isOpen={calcOpen} onClose={() => setCalcOpen(false)} theme={theme} />
    
                 {/* Undo Notification */}
                 {undoAction && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] anim-fade">
                        <div className="bg-slate-800 border border-white/10 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[320px]">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-white/90">{undoAction.message}</p>
                            </div>
                            <button 
                                onClick={handleUndo}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-colors flex items-center gap-2"
                            >
                                <span>Desfazer</span>
                                <span className="bg-black/20 px-1.5 rounded text-[10px]">{undoTimer}s</span>
                            </button>
                            <button 
                                onClick={() => setUndoAction(null)}
                                className="text-white/40 hover:text-white"
                            >
                                <Icons.X size={16} />
                            </button>
                        </div>
                    </div>
                 )}

                 <Sidebar 
                    theme={theme} 
                    view={view} 
                    setView={setView} 
                    menuOpen={menuOpen} 
                    setMenuOpen={setMenuOpen} 
                    user={user} 
                    orderedMenuItems={orderedMenuItems}
                    setOrderedMenuItems={setOrderedMenuItems}
                    daysRemaining={daysRemaining}
                    renewalDate={renewalDate}
                    setRunTour={setRunTour}
                    systemContext={systemContext}
                 />
    
                 <div className={`flex-1 flex flex-col h-full min-w-0 ${theme.contentBg || 'bg-black/20'}`}>
                    {/* Header */}
                    <div className={`h-16 flex items-center justify-between px-4 md:px-8 border-b ${theme.border} bg-opacity-80 backdrop-blur-md z-30 flex-shrink-0`}>
                        <div className="flex items-center gap-4 flex-1">
                            <button onClick={() => setMenuOpen(true)} className="md:hidden p-2 -ml-2"><Icons.Menu size={24} /></button>
                            <h2 className={`font-bold text-lg md:text-xl truncate ${['passengers', 'drivers', 'trips', 'achados', 'lostFound'].includes(view) && searchTerm ? 'hidden md:block' : 'block'}`}>{orderedMenuItems.find(i=>i.id===view)?.l || 'Bora de Van'}</h2>
                            {['passengers', 'drivers', 'trips', 'achados', 'lostFound'].includes(view) && (<div className="flex-1 max-w-md ml-auto md:ml-4"><div className="relative group"><div className="absolute inset-y-0 left-0 pl-3 flex items-center opacity-50"><Icons.Search size={16} /></div><input type="text" placeholder={`Pesquisar...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${theme.inner} border ${theme.border} rounded-xl py-2 pl-10 pr-4 text-sm outline-none ${theme.text}`}/>{searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center opacity-50"><Icons.X size={14} /></button>)}</div></div>)}
                        </div>
                        <div className="flex gap-2 ml-2">
                            {/* Calculator Trigger */}
                            <button 
                                onClick={() => setCalcOpen(prev => !prev)} 
                                className={`p-2.5 rounded-xl ${theme.ghost || 'bg-white/5 hover:bg-white/10 text-white/50'} flex items-center gap-2 text-xs font-bold border ${theme.divider || 'border-white/5'}`} 
                                title="Calculadora Rápida"
                            >
                                <Icons.Calculator size={14} />
                            </button>

                            {/* Command Trigger */}
                            <button onClick={() => setCmdOpen(true)} className={`p-2.5 rounded-xl ${theme.ghost || 'bg-white/5 hover:bg-white/10 text-white/50'} hidden md:flex items-center gap-2 text-xs font-bold border ${theme.divider || 'border-white/5'} mr-2`} title="Command Palette">
                                <Icons.Command size={14} /> <span className="opacity-50">CTRL+K</span>
                            </button>
    
                            {view !== 'lostFound' && view !== 'trips' && view !== 'dashboard' && view !== 'settings' && view !== 'billing' && <button onClick={()=>setFilterStatus(filterStatus==='Ativo'?'Todos':'Ativo')} className={`p-2 rounded-lg ${filterStatus==='Ativo'?theme.accent:'opacity-50'}`}><Icons.Refresh size={20}/></button>}
                            <button onClick={()=>{ 
                                if(view==='passengers') { 
                                    const now = new Date();
                                    const timeToUse = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                                    setFormData({neighborhood: systemContext === 'Mip' ? BAIRROS_MIP[0] : BAIRROS[0], status:'Ativo', payment:'Dinheiro', passengerCount:1, luggageCount:0, date:getTodayDate(), time: timeToUse}); 
                                    setModal('passenger'); 
                                } else if(view==='trips') { setSuggestedTrip(null); setEditingTripId(null); setModal('trip'); } else if(view==='appointments') { 
                                    const now = new Date();
                                    const nextHalfHour = new Date(now);
                                    nextHalfHour.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
                                    nextHalfHour.setSeconds(0);
                                    
                                    const dateStr = getTodayDate();
                                    const timeStr = nextHalfHour.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    
                                    setFormData({ date: dateStr, time: timeStr });
                                    setModal('appointment');
                                } else if(view==='billing' || view==='financeiro') {
                                    const now = new Date();
                                    const timeToUse = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                                    setFormData({ date: getTodayDate(), time: timeToUse, type: 'Frete' });
                                    setModal('extraCharge');
                                } else if(view==='lostFound') { setFormData({date: getTodayDate(), status: 'Pendente'}); setModal('lostFound'); } else if(view==='drivers') { setFormData({status: 'Ativo'}); setModal('driver'); } else { setSuggestedTrip(null); setEditingTripId(null); setModal('trip'); } 
                            }} className={`${theme.primary} p-2.5 rounded-xl shadow-lg active:scale-95`}><Icons.Plus/></button>
                        </div>
                    </div>
    
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth relative overscroll-contain">
                        <div className="max-w-6xl mx-auto pb-20">
                            {view === 'dashboard' && <Dashboard data={data} theme={theme} setView={setView} onOpenModal={(t:string)=>{ 
                                if(t==='newPass'){ 
                                    const now = new Date();
                                    const timeToUse = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                                    setFormData({neighborhood: systemContext === 'Mip' ? BAIRROS_MIP[0] : BAIRROS[0], status:'Ativo', payment:'Dinheiro', passengerCount:1, luggageCount: 0, date: getTodayDate(), time: timeToUse}); 
                                    setModal('passenger'); 
                                } else { setModal('trip'); setFormData({}); } 
                            }} dbOp={dbOp} setAiModal={setAiModal} user={user} systemContext={systemContext} notify={notify} />}
                            {view === 'passengers' && <Passageiros data={data} theme={theme} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setFormData={setFormData} setModal={setModal} del={del} notify={notify} systemContext={systemContext} dbOp={dbOp} />}
                            {view === 'drivers' && <Motoristas data={data} theme={theme} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setFormData={setFormData} setModal={setModal} del={del} notify={notify} />}
                            {view === 'trips' && <Viagens data={{...data, pricePerPassenger}} theme={theme} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setModal={setModal} setFormData={setFormData} openEditTrip={openEditTrip} updateTripStatus={updateTripStatus} del={del} duplicateTrip={duplicateTrip} notify={notify} systemContext={systemContext} pranchetaValue={pranchetaValue} />}
                            {view === 'appointments' && <Agendamentos data={data} theme={theme} setFormData={setFormData} setModal={setModal} dbOp={dbOp} setSuggestedTrip={setSuggestedTrip} setEditingTripId={setEditingTripId} notify={notify} requestConfirm={requestConfirm} systemContext={systemContext} />}
                            {view === 'folgasGanchos' && <FolgasGanchos data={data} theme={theme} dbOp={dbOp} notify={notify} effectiveFolgas={effectiveFolgas} swaps={swaps} ganchos={ganchos} systemContext={systemContext} user={user} folgasDisabled={folgasDisabled} saturdayFolgaDisabled={saturdayFolgaDisabled} customDefaultFolgas={customDefaultFolgas} saturdayRotation={saturdayRotation} tableWeekId={tableWeekId} />}

                            
                            {/* Tabela Recebe Função para Calcular Listas Futuras */}
                            {view === 'table' && <Tabela 
                                data={data} 
                                pranchetaData={duePranchetaData}
                                weekId={dueWeekId}
                                uiTicker={uiTicker}
                                theme={theme} tableTab={tableTab} setTableTab={setTableTab} 
                                mipDayType={mipDayType} setMipDayType={setMipDayType}
                                currentOpDate={currentOpDate} getTodayDate={getTodayDate} analysisDate={analysisDate} setAnalysisDate={setAnalysisDate} 
                                analysisRotatedList={getRotatedList(analysisDate)} tableStatus={tableStatus} 
                                editName={editName} tempName={tempName} tempVaga={tempVaga} setEditName={setEditName} setTempName={setTempName} setTempVaga={setTempVaga} saveDriverName={saveDriverName} 
                                updateTableStatus={updateTableStatus} currentRotatedList={getRotatedList(currentOpDate)} confirmedTimes={confirmedTimes} isTimeExpired={isTimeExpired} 
                                lousaOrder={lousaOrder} toggleLousaFromConfirmados={toggleLousaFromConfirmados} cancelConfirmation={cancelConfirmation} handleLousaAction={handleLousaAction} startLousaTime={startLousaTime} 
                                addMadrugadaVaga={addMadrugadaVaga} madrugadaList={madrugadaList} removeMadrugadaVaga={removeMadrugadaVaga} toggleMadrugadaRiscado={toggleMadrugadaRiscado} spList={spList} madrugadaData={madrugadaData} openMadrugadaTrip={openMadrugadaTrip} 
                                cannedMessages={cannedMessages} addCannedMessage={addCannedMessage} updateCannedMessage={updateCannedMessage} deleteCannedMessage={deleteCannedMessage} 
                                addNullLousaItem={addNullLousaItem} addNullMadrugadaItem={addNullMadrugadaItem} notify={notify} 
                                getRotatedList={getRotatedList} 
                                getRotatedMadrugadaList={getRotatedMadrugadaList} // Nova prop
                                setSpList={setSpList}
                                rotationBaseDate={rotationBaseDate}
                                dbOp={dbOp}
                                systemContext={systemContext}
                                updateMipDriver={updateMipDriver}
                                handleMipBaixar={handleMipBaixar}
                                handleMipRiscar={handleMipRiscar}
                                triggerUndo={triggerUndo}
                                ganchos={ganchos}
                                effectiveFolgas={effectiveFolgas}
                                getFolgasForDate={getFolgasForDate}
                                user={user}
                            />}
                            
                            {(view === 'financeiro' || view === 'billing') && <Financeiro 
                                data={data} 
                                spList={spList}
                                pranchetaData={viewedPranchetaData}
                                weekId={viewedWeekId}
                                pranchetaWeekOffset={pranchetaWeekOffset}
                                setPranchetaWeekOffset={setPranchetaWeekOffset}
                                togglePranchetaPayment={togglePranchetaPayment}
                                theme={theme} 
                                 pranchetaValue={pranchetaValue}
                                 setPranchetaValue={(val: number) => {
                                     setPranchetaValue(val);
                                     db.ref('system_settings/Pg/pranchetaValue').set(val);
                                 }}
                                 sendPranchetaBillingMessage={sendPranchetaBillingMessage}
                                 billingData={billingData}
                                billingDate={billingDate} 
                                prevBillingMonth={()=>setBillingDate(new Date(billingDate.getFullYear(), billingDate.getMonth()-1, 1))} 
                                nextBillingMonth={()=>setBillingDate(new Date(billingDate.getFullYear(), billingDate.getMonth()+1, 1))} 
                                togglePaymentStatus={(trip:any) => {
                                    const isPaying = trip.paymentStatus !== 'Pago';
                                    
                                    // Restrição: Só quem recebeu (ou admin) pode desmarcar
                                    if (!isPaying && trip.receivedBy && trip.receivedBy !== user.username && user.role !== 'admin') {
                                        return notify(`Apenas ${trip.receivedBy} ou Coordenação pode desfazer este pagamento.`, 'error');
                                    }
        
                                    const payload:any = { 
                                        id: trip.id, 
                                        paymentStatus: isPaying ? 'Pago' : 'Pendente' 
                                    };
                                    if (isPaying) {
                                        payload.receivedBy = user.username;
                                        payload.receivedAt = getTodayDate(); // Usa data YYYY-MM-DD para facilitar filtro
                                    } else {
                                        payload.receivedBy = null;
                                        payload.receivedAt = null;
                                    }
                                    dbOp('update', 'trips', payload);
                                }} 
                                sendBillingMessage={sendBillingMessage} 
                                del={del} 
                                setFormData={setFormData} 
                                setModal={setModal} 
                                openEditTrip={openEditTrip} 
                                user={user} 
                                notify={notify} 
                                systemContext={systemContext}
                                pricePerPassenger={pricePerPassenger}
                            />}
                            {view === 'achados' && <Achados data={data} theme={theme} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setModal={setModal} dbOp={dbOp} del={del} notify={notify} systemContext={systemContext} />}
                            {view === 'lostFound' && <Achados data={data} theme={theme} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setModal={setModal} dbOp={dbOp} del={del} notify={notify} systemContext={systemContext} />}
                            {view === 'settings' && <Configuracoes 
                                user={user} 
                                theme={theme} 
                                restartTour={restartTour} 
                                setAiModal={setAiModal} 
                                geminiKey={geminiKey} 
                                setGeminiKey={setGeminiKey} 
                                saveApiKey={saveApiKey} 
                                ipToBlock={ipToBlock} 
                                setIpToBlock={setIpToBlock} 
                                blockIp={blockIp} 
                                data={{...data, pricePerPassenger}} 
                                del={del} 
                                ipHistory={ipHistory} 
                                ipLabels={ipLabels} 
                                saveIpLabel={saveIpLabel} 
                                changeTheme={changeTheme} 
                                themeKey={themeKey} 
                                dbOp={dbOp} 
                                notify={notify} 
                                showAlert={showAlert} 
                                requestConfirm={requestConfirm} 
                                setView={setView} 
                                daysRemaining={daysRemaining} 
                                isNearExpiration={isNearExpiration} 
                                systemContext={systemContext} 
                                isRecurringActive={isRecurringActive} 
                                pranchetaValue={pranchetaValue}
                                setPranchetaValue={(val: number) => {
                                    setPranchetaValue(val);
                                    db.ref('system_settings/Pg/pranchetaValue').set(val);
                                }}
                                soundEnabled={soundEnabled}
                                setSoundEnabled={setSoundEnabled}
                                popupsEnabled={popupsEnabled}
                                setPopupsEnabled={setPopupsEnabled}
                            />}
                            {view === 'manageUsers' && <GerenciarUsuarios data={data} theme={theme} setView={setView} dbOp={dbOp} notify={notify} user={user} requestConfirm={requestConfirm} systemContext={systemContext} />}
                        </div>
                    </div>
                 </div>

            <PersistentNotifications notifications={persistentNotifications} onClose={removePersistentNotification} />
            
            <audio ref={reminderAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" preload="auto" />
            <audio ref={successAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3" preload="auto" />
            <audio ref={updateAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" preload="auto" />
            <audio ref={deleteAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" preload="auto" />
            <audio ref={errorAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3" preload="auto" />
            <audio ref={infoAudioRef} src="https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" preload="auto" />

            {/* GLOBAL REMINDER POPUP */}
            {activeReminder && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4 animate-bounce-in">
                    <div className={`${theme.card} border-2 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.5)] p-6 rounded-[2.5rem] flex flex-col gap-5 relative overflow-hidden backdrop-blur-2xl animate-pulse-gentle`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent animate-pulse"></div>
                        <div className="flex items-start gap-5 relative z-10">
                            <div className="bg-amber-500 p-4 rounded-3xl text-white shadow-2xl shadow-amber-500/40 animate-bounce">
                                <Icons.Bell size={28}/>
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <h4 className="font-black text-amber-500 text-[10px] uppercase tracking-[0.3em] mb-2">Atenção: Lembrete</h4>
                                <p className="text-lg font-black leading-tight text-white drop-shadow-md">{activeReminder.text}</p>
                            </div>
                            <button 
                                onClick={() => setActiveReminder(null)}
                                className="p-2.5 hover:bg-white/10 rounded-2xl opacity-40 hover:opacity-100 transition-all active:scale-90"
                            >
                                <Icons.X size={22}/>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <button 
                                onClick={() => {
                                    if (dbOpRef.current) {
                                        dbOpRef.current('update', 'notes', { ...activeReminder, completed: true });
                                    }
                                    setActiveReminder(null);
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl text-sm font-black transition-all shadow-xl shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Icons.Check size={18}/> Concluir
                            </button>
                            <button 
                                onClick={() => {
                                    setSnoozeDate(getTodayDate());
                                    setSnoozeTime(addMinutes(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }), 15));
                                    setShowSnoozeModal(true);
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl text-sm font-black transition-all shadow-xl shadow-amber-500/30 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Icons.Clock size={18}/> Adiar...
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SNOOZE MODAL */}
            {showSnoozeModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className={`${theme.card} border ${theme.border} w-full max-w-xs p-8 rounded-[2.5rem] shadow-2xl stagger-in`}>
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="bg-amber-500/20 p-4 rounded-3xl text-amber-500 mb-4">
                                <Icons.Clock size={32}/>
                            </div>
                            <h3 className="text-xl font-black">Adiar Lembrete</h3>
                            <p className="text-xs opacity-50 mt-1">Escolha um novo horário para o alerta</p>
                        </div>
                        
                        <div className="space-y-5 mb-8">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Nova Data</label>
                                <input 
                                    type="date"
                                    value={snoozeDate}
                                    onChange={e => setSnoozeDate(e.target.value)}
                                    className={`w-full bg-white/5 border ${theme.border} rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 transition-all font-bold`}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Novo Horário</label>
                                <input 
                                    type="time"
                                    value={snoozeTime}
                                    onChange={e => setSnoozeTime(e.target.value)}
                                    className={`w-full bg-white/5 border ${theme.border} rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 transition-all font-bold`}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setShowSnoozeModal(false)} className="py-4 rounded-2xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-all">Cancelar</button>
                            <button onClick={handleSnooze} className={`${theme.primary} py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all`}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            <GlobalModals
                modal={modal} setModal={setModal}
                aiModal={aiModal} setAiModal={setAiModal}
                aiInput={aiInput} setAiInput={setAiInput}
                aiPassengerQueue={aiPassengerQueue} aiPassengerIndex={aiPassengerIndex}
                isListening={isListening} toggleMic={toggleMic} handleSmartCreate={handleSmartCreate} aiLoading={aiLoading}
                theme={theme} themeKey={themeKey}
                formData={formData} setFormData={setFormData}
                suggestedTrip={suggestedTrip} setSuggestedTrip={setSuggestedTrip}
                searchId={searchId} setSearchId={setSearchId}
                addById={addById} autoFill={autoFill} removePass={removePass} confirmTrip={confirmTrip} simulate={simulate}
                save={save} saveExtraCharge={saveExtraCharge}
                data={data} spList={spList} madrugadaList={madrugadaList}
                tempVagaMadrugada={tempVagaMadrugada} setTempVagaMadrugada={setTempVagaMadrugada} confirmAddMadrugadaVaga={confirmAddMadrugadaVaga}
                vagaToBlock={vagaToBlock} tempJustification={tempJustification} setTempJustification={setTempJustification} confirmMadrugadaBlock={confirmMadrugadaBlock}
                showNewsModal={showNewsModal} latestNews={latestNews} markNewsAsSeen={markNewsAsSeen}
                systemContext={systemContext}
            />
            
            {runTour && (
                <TourGuide steps={TOUR_STEPS} currentStep={tourStep} onNext={() => setTourStep(prev => prev + 1)} onPrev={() => setTourStep(prev => prev - 1)} onClose={completeTour} theme={theme} />
            )}
        </div>
        </SubscriptionLock>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}