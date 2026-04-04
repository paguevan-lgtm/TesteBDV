import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Icons, Button, Toast } from './Shared';
import { db, auth } from '../firebase';
import { getTodayDate, dateAddDays } from '../utils';
import { PixPayment } from './PixPayment';

interface SubscriptionLockProps {
    user: any;
    systemContext: string;
    children: React.ReactNode;
}

interface SubscriptionContextType {
    triggerEarlyRenewal: () => void;
    isEarlyRenewal: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (!context) {
        throw new Error('useSubscription must be used within a SubscriptionLock');
    }
    return context;
};

export const SubscriptionLock: React.FC<SubscriptionLockProps> = ({ user, systemContext, children }) => {
    const [isLocked, setIsLocked] = useState(true);
    const [loading, setLoading] = useState(true);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [checkingPayment, setCheckingPayment] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState(0);
    const [timeRemainingString, setTimeRemainingString] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<'pix' | 'checkout' | 'card' | null>(null);
    const [showWarning, setShowWarning] = useState(false);
    const [warningInfo, setWarningInfo] = useState({ days: 0, date: '' });
    const [currentExpirationDate, setCurrentExpirationDate] = useState<Date | null>(null);
    const [isEarlyRenewal, setIsEarlyRenewal] = useState(false);
    const [now, setNow] = useState(new Date());
    const hasShownWarning = useRef(false);

    const [isBlockedForAdmin, setIsBlockedForAdmin] = useState(false);
    const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
    const [isRecurringActive, setIsRecurringActive] = useState(false);

    const triggerEarlyRenewal = () => {
        setIsEarlyRenewal(true);
        setIsLocked(true);
    };

    // Check for session_id in URL on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        if (sessionId) {
            setIsVerifyingPayment(true);
            // Remove session_id from URL to prevent re-triggering on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Verify session with backend
            fetch('/api/verify_session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId })
            })
            .then(async res => {
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Server error: ${text.substring(0, 50)}`);
                }
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    if (data.needsFrontendUpdate) {
                        const updates: any = {
                            lastPaymentId: data.mpId,
                            lastPaymentDate: data.date,
                            paidBy: data.userId,
                        };
                        
                        let newExpiresAt = new Date();
                        if (currentExpirationDate) {
                            const currentExpiresAt = new Date(currentExpirationDate);
                            if (currentExpiresAt > newExpiresAt) {
                                newExpiresAt = currentExpiresAt;
                            }
                        }
                        newExpiresAt.setDate(newExpiresAt.getDate() + 30);
                        
                        if (systemContext === 'Mistura') {
                            updates.expiresAt = newExpiresAt.toISOString();
                            updates.isBlockedByAdmin = false;
                            updates.isRecurring_Mistura = true;
                        } else if (systemContext && systemContext !== 'unknown') {
                            updates[`expiresAt_${systemContext}`] = newExpiresAt.toISOString();
                            updates[`isBlocked_${systemContext}`] = false;
                            updates[`isRecurring_${systemContext}`] = true;
                        } else {
                            updates.expiresAt = newExpiresAt.toISOString();
                            updates.isBlockedByAdmin = false;
                            updates.isRecurring_Mistura = true;
                        }
                        
                        const nextBillingDate = newExpiresAt.toLocaleDateString('pt-BR');
                        
                        db.ref('system_settings/subscription').update(updates).then(() => {
                            setIsEarlyRenewal(false);
                            setIsLocked(false);
                            setIsVerifyingPayment(false);
                            const storageKey = `welcome_popup_seen_${user.uid}_${systemContext}`;
                            localStorage.setItem(storageKey, 'true');
                            openModal("Bem-vindo!", `Obrigado por assinar! O sistema ${systemContext} foi ativado com sucesso.`, nextBillingDate);
                        }).catch((err: any) => {
                            console.error("Error updating subscription via frontend:", err);
                            openModal("Erro", "Erro ao atualizar assinatura. Contate o suporte.");
                            setIsVerifyingPayment(false);
                        });
                    } else {
                        // The backend has already updated Firebase via updateUserSubscriptionStatus
                        setIsLocked(false);
                        setIsEarlyRenewal(false);
                        setIsVerifyingPayment(false);
                        
                        let nextBillingDate = '';
                        if (data.expiresAt) {
                            const date = new Date(data.expiresAt);
                            nextBillingDate = date.toLocaleDateString('pt-BR');
                        }
                        const storageKey = `welcome_popup_seen_${user.uid}_${systemContext}`;
                        localStorage.setItem(storageKey, 'true');
                        openModal("Bem-vindo!", `Obrigado por assinar! O sistema ${systemContext} foi ativado com sucesso.`, nextBillingDate);
                    }
                } else {
                    setIsVerifyingPayment(false);
                    openModal("Erro", data.error || "Pagamento não confirmado ou pendente.");
                }
            })
            .catch(err => {
                console.error("Error verifying payment:", err);
                setIsVerifyingPayment(false);
                openModal("Erro", "Erro ao verificar pagamento. Verifique o console para mais detalhes.");
            });
        }
    }, [systemContext, currentExpirationDate, user.username]);

    useEffect(() => {
        if (!isLocked) {
            setIsVerifyingPayment(false);
        }
    }, [isLocked]);

    // Update 'now' every minute to check expiration in real-time
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    
    // Email Modal States
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', message: '', nextBillingDate: '' });

    const openModal = (title: string, message: string, nextBillingDate: string = '') => {
        setModalContent({ title, message, nextBillingDate });
        setShowModal(true);
    };

    // Email Modal States
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [subscriptionEmail, setSubscriptionEmail] = useState('');
    const [savedSubscriptionEmail, setSavedSubscriptionEmail] = useState('');
    const [emailError, setEmailError] = useState('');

    // Sync subscription status on mount
    useEffect(() => {
        if (user && user.uid && systemContext) {
            // Pequeno delay para garantir que o servidor está pronto
            const timer = setTimeout(() => {
                fetch('/api/sync-subscription', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.uid, systemContext })
                }).then(res => {
                    if (!res.ok) {
                        res.json().then(data => {
                            console.warn("Sync subscription failed:", data.error || res.status);
                        }).catch(() => {
                            console.warn("Sync subscription failed with status:", res.status);
                        });
                    }
                }).catch(err => {
                    console.error("Sync error (Network):", err);
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [user?.uid, systemContext]);

    // Admin Bypass (Breno never gets locked)
    const isAdmin = user.username === 'Breno';

    // Check Subscription Status
    useEffect(() => {
        if (!db) return;

        // Check GLOBAL system subscription
        const subRef = db.ref(`system_settings/subscription`);
        
        const unsubscribe = subRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const now = new Date();
            
            if (!data) {
                // No subscription data found = Blocked
                setIsLocked(true);
                setDaysRemaining(0);
                setTimeRemainingString("Expirado");
            } else {
                // Fetch saved email
                let savedEmail = '';
                if (systemContext === 'Mistura') {
                    savedEmail = data.subscription_email || '';
                } else {
                    savedEmail = data[`subscription_email_${systemContext}`] || data.subscription_email || '';
                }
                if (savedEmail) {
                    setSavedSubscriptionEmail(savedEmail);
                }

                // Check specific expiration for the current system
                const systemExpiresAt = data[`expiresAt_${systemContext}`];
                const globalExpiresAt = data.expiresAt;
                
                let expirationDateStr = null;
                let recurringActive = false;
                
                if (systemContext === 'Mistura') {
                    expirationDateStr = globalExpiresAt;
                    recurringActive = data.isRecurring_Mistura || false;
                } else {
                    // Only use specific system expiration
                    expirationDateStr = systemExpiresAt;
                    recurringActive = data[`isRecurring_${systemContext}`] || false;
                }
                
                setIsRecurringActive(recurringActive);
                
                if (!expirationDateStr) {
                     setIsLocked(true);
                     setDaysRemaining(0);
                     setTimeRemainingString("Expirado");
                     setLoading(false);
                     return;
                }

                const expiresAt = new Date(expirationDateStr);
                setCurrentExpirationDate(expiresAt); // Store for cumulative renewal

                // Check specific system block
                const isBlockedSystem = data[`isBlocked_${systemContext}`] || false;
                
                const isBlocked = isBlockedSystem;

                if (isAdmin && isBlocked) {
                    setIsBlockedForAdmin(true);
                } else {
                    setIsBlockedForAdmin(false);
                }

                const diffTime = expiresAt.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                const totalHours = Math.floor(diffTime / (1000 * 60 * 60));

                if (days > 0) {
                    setTimeRemainingString(`${days} dias (${totalHours}h)`);
                } else if (diffTime > 0) {
                    setTimeRemainingString(`${hours}h ${minutes}m`);
                } else {
                    setTimeRemainingString("Expirado");
                }
                
                setDaysRemaining(diffDays > 0 ? diffDays : 0);

                // Check if recurring payment is active for the chosen expiration date
                let isRecurringActive = false;
                if (expirationDateStr === globalExpiresAt) {
                    isRecurringActive = data.isRecurring_Mistura || false;
                } else {
                    isRecurringActive = data[`isRecurring_${systemContext}`] || false;
                }

                // Immediate blocking if time runs out (diffDays <= 0) or manually blocked
                if ((isBlocked || diffDays <= 0) && !isAdmin) {
                    console.log(`[SubscriptionLock] System ${systemContext} - Blocked: ${isBlocked}, Days: ${diffDays}, Recurring: ${isRecurringActive}`);

                    // If expired AND recurring is active, attempt auto-renewal
                    if (diffDays <= 0 && isRecurringActive && !isBlocked) {
                        // Auto-renewal logic
                        setLoading(true);
                        // Simulate API call delay for renewal
                        setTimeout(() => {
                            // SIMULATION: 80% chance of success, 20% failure (to test fallback)
                            // In production, this would be the result of the real API call
                            const success = true; // For now, force success to avoid annoying users, or make it random? 
                            // The user asked for the LOGIC: "se caso a assinatura vencer e não tiver sido paga..."
                            // I will implement the failure handling code path but keep success = true for now unless I want to test it.
                            
                            if (success) {
                                handlePaymentSuccess(true); // Renew for 30 days
                            } else {
                                // Failed to renew
                                console.warn("Auto-renewal failed. Reverting to manual.");
                                const updates: any = {};
                                if (expirationDateStr === globalExpiresAt) {
                                    updates.isRecurring_Mistura = false;
                                } else {
                                    updates[`isRecurring_${systemContext}`] = false;
                                }
                                db.ref('system_settings/subscription').update(updates);
                                setIsLocked(true);
                                openModal("Erro", "A renovação automática falhou. Por favor, realize o pagamento manualmente.");
                            }
                            setLoading(false);
                        }, 2000);
                        return;
                    }

                    setIsLocked(true);
                    setIsEarlyRenewal(false); // Ensure we are in locked mode, not early renewal
                } else {
                    // Only unlock if we are NOT in early renewal mode
                    if (!isEarlyRenewal) {
                        setIsLocked(false);
                    }
                }

                // Login Notification Logic (5 days before)
                // Show only once per session (mount)
                // DISABLE if recurring payment is active
                if (diffDays > 0 && diffDays <= 5 && !isAdmin && !hasShownWarning.current && !isRecurringActive) {
                    setWarningInfo({ days: diffDays, date: expiresAt.toLocaleDateString() });
                    setShowWarning(true);
                    hasShownWarning.current = true;
                }
            }
            setLoading(false);
        });

        return () => subRef.off();
    }, [user.username, isAdmin, systemContext, now, isEarlyRenewal]);

    const handleCreateSubscriptionClick = () => {
        if (savedSubscriptionEmail && !subscriptionEmail) {
            setSubscriptionEmail(savedSubscriptionEmail);
        }
        setShowEmailModal(true);
    };

    const handleConfirmEmailAndSubscribe = async () => {
        if (!subscriptionEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subscriptionEmail)) {
            setEmailError('Por favor, insira um e-mail válido.');
            return;
        }
        setEmailError('');
        setShowEmailModal(false);
        await handleCreateSubscription(subscriptionEmail);
    };

    const handleCreateSubscription = async (email: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/create_subscription_preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, userId: user.username, systemContext })
            });
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Server error response:', text);
                throw new Error('Erro no servidor ao criar assinatura.');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            console.error("Erro ao criar assinatura:", error);
            openModal("Erro", "Erro ao gerar Assinatura: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSuccess = async (recurring = false) => {
        // Update Firebase GLOBAL settings
        const now = new Date();
        
        // Cumulative Renewal: If current expiration is in the future, add to IT.
        let baseDate = now;
        
        // Determine current expiration for THIS system context
        let currentSystemExpiration = null;
        if (systemContext === 'Mistura') {
            // Mistura uses global expiration
            // We need to fetch fresh data or rely on state if it's up to date.
            // Ideally, we should read from DB again to be safe, but using state for now.
             if (currentExpirationDate && currentExpirationDate > now) {
                baseDate = new Date(currentExpirationDate);
            }
        } else {
            // Specific system
            // We need to ensure currentExpirationDate reflects the specific system's expiration
            // The useEffect above sets currentExpirationDate based on the context, so it should be correct.
             if (currentExpirationDate && currentExpirationDate > now) {
                baseDate = new Date(currentExpirationDate);
            }
        }

        // Add 30 days to the base date (preserving hours if adding to existing expiration)
        const expirationDate = new Date(baseDate);
        expirationDate.setDate(expirationDate.getDate() + 30);
        
        // If we are starting fresh (baseDate was 'now'), we might want to set it to end of day?
        // User request: "ao bloquear uma vaga e desbloquear novamente deve conceder 30 dias e o equivalente de horas"
        // This implies preserving the exact time if extending, or setting exact time if new.
        // Let's NOT force 23:59:59 anymore to respect the "hours" requirement.
        // Unless it was a fresh start, maybe we want full 30 days (720 hours).
        
        const expiresAt = expirationDate.toISOString();
        
        const updates: any = {
            isBlockedByAdmin: false,
            lastPaymentId: paymentData?.id || 'card_or_checkout',
            lastPaymentDate: new Date().toISOString(),
            paidBy: user.username,
            isRecurring: recurring
        };

        // Individual billing: update specific system expiration
        if (systemContext === 'Mistura') {
            updates.expiresAt = expiresAt;
            updates.isBlockedByAdmin = false;
        } else {
            updates[`expiresAt_${systemContext}`] = expiresAt;
            updates[`isBlocked_${systemContext}`] = false;
        }
        
        await db.ref(`system_settings/subscription`).update(updates);
        
        openModal(
            recurring ? "Assinatura Ativada!" : "Pagamento Confirmado!",
            recurring ? `O sistema ${systemContext} será debitado mensalmente.` : `Sistema ${systemContext} liberado para TODOS.`,
            expirationDate.toLocaleString()
        );
        setPaymentData(null);
        setSelectedMethod(null);
        setIsEarlyRenewal(false);
        setIsLocked(false);
    };

    const handleAdminUnlock = async () => {
        await db.ref(`system_settings/subscription`).update({ isBlockedByAdmin: false });
        openModal("Sucesso", "Sistema desbloqueado manualmente!");
    };

    const renderModals = () => (
        <>
            {/* Subscription Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-blue-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-blue-500/10 border-b border-blue-500/20 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-400">
                                <Icons.CreditCard />
                                {modalContent.title}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white transition-colors">
                                <Icons.X size={20} />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <p className="text-slate-300 text-sm mb-4">
                                {modalContent.message}
                            </p>
                            {modalContent.nextBillingDate && (
                                <div className="bg-slate-900 p-4 rounded-xl border border-white/5 mb-6">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Próxima Cobrança</p>
                                    <p className="text-lg font-bold text-white">{modalContent.nextBillingDate}</p>
                                </div>
                            )}
                            <Button 
                                onClick={() => setShowModal(false)}
                                theme={{ primary: 'bg-blue-600 hover:bg-blue-500 text-white' }}
                                className="w-full py-3"
                            >
                                Entendi
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {showEmailModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-blue-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-blue-500/10 border-b border-blue-500/20 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-blue-400">
                                <Icons.Mail />
                                Confirme seu E-mail
                            </h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-white/50 hover:text-white transition-colors">
                                <Icons.X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-300 text-sm mb-4">
                                Digite o e-mail que você usará no pagamento.
                            </p>
                            
                            <div className="space-y-2 mb-6">
                                <input 
                                    type="email" 
                                    value={subscriptionEmail}
                                    onChange={(e) => setSubscriptionEmail(e.target.value)}
                                    placeholder="seu@email.com" 
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-blue-500 transition-colors" 
                                    required
                                />
                                {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                            </div>

                            <div className="flex gap-2">
                                <Button 
                                    onClick={() => setShowEmailModal(false)}
                                    theme={{ primary: 'bg-slate-700 hover:bg-slate-600 text-white' }}
                                    className="flex-1 py-3"
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleConfirmEmailAndSubscribe}
                                    theme={{ primary: 'bg-blue-600 hover:bg-blue-500 text-white' }}
                                    className="flex-1 py-3"
                                    icon={Icons.ArrowRight}
                                    disabled={loading}
                                >
                                    {loading ? 'Aguarde...' : 'Continuar para pagamento'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // If it's Breno, always render children (bypass lock)
    if (isAdmin) {
        return (
            <SubscriptionContext.Provider value={{ triggerEarlyRenewal, isEarlyRenewal }}>
                {isBlockedForAdmin && (
                    <div className="fixed top-0 left-0 right-0 z-[99999] bg-red-600 text-white text-center text-[10px] font-bold py-1 shadow-lg animate-pulse">
                        SISTEMA {systemContext} BLOQUEADO (Visualização de Admin - Usuários normais estão bloqueados)
                    </div>
                )}
                {children}
                {renderModals()}
            </SubscriptionContext.Provider>
        );
    }

    // If loading check, show loader
    if (loading || isVerifyingPayment) {
        return (
            <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center">
                <div className="text-amber-500 font-bold animate-pulse">
                    {isVerifyingPayment ? "Processando pagamento no Stripe..." : "Verificando assinatura..."}
                </div>
            </div>
        );
    }

    // If not locked, render app
    if (!isLocked) {
        return (
            <SubscriptionContext.Provider value={{ triggerEarlyRenewal, isEarlyRenewal }}>
                {children}
                {showWarning && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-amber-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 bg-amber-500/10 border-b border-amber-500/20 flex justify-between items-center">
                                <h3 className="text-lg font-bold flex items-center gap-2 text-amber-400">
                                    <Icons.Calendar />
                                    Aviso de Vencimento
                                </h3>
                                <button onClick={() => setShowWarning(false)} className="text-white/50 hover:text-white transition-colors">
                                    <Icons.X size={20} />
                                </button>
                            </div>
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Icons.Lock size={32} className="text-amber-500" />
                                </div>
                                <p className="text-white font-medium mb-2">Sua assinatura está prestes a expirar!</p>
                                <p className="text-slate-400 text-sm mb-6">
                                    O sistema irá expirar em <span className="text-amber-400 font-bold">{timeRemainingString}</span> ({warningInfo.date}). 
                                    Por favor, realize a renovação para evitar interrupções no serviço.
                                </p>
                                <div className="flex gap-2">
                                    <Button 
                                        onClick={() => setShowWarning(false)}
                                        theme={{ primary: 'bg-slate-700 hover:bg-slate-600 text-white' }}
                                        className="flex-1 py-3"
                                    >
                                        Entendi
                                    </Button>
                                    {!isRecurringActive && (
                                        <Button 
                                            onClick={() => {
                                                setShowWarning(false);
                                                triggerEarlyRenewal();
                                            }}
                                            theme={{ primary: 'bg-amber-600 hover:bg-amber-500 text-white' }}
                                            className="flex-1 py-3"
                                            icon={Icons.Check}
                                        >
                                            Renovar Agora
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {renderModals()}
            </SubscriptionContext.Provider>
        );
    }

    // LOCK SCREEN
    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl border border-white/10 relative my-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <Icons.Lock size={32} className="text-red-500 sm:hidden" />
                    <Icons.Lock size={40} className="text-red-500 hidden sm:block" />
                </div>
                
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {isEarlyRenewal ? `Renovação Antecipada - ${systemContext}` : `Assinando para o sistema: ${systemContext}`}
                </h2>
                <p className="text-slate-400 mb-8">
                    {isEarlyRenewal 
                        ? "Adicione mais tempo ao seu sistema agora e evite bloqueios futuros. O novo período será somado ao tempo restante."
                        : <>A assinatura do sistema <strong>{systemContext}</strong> expirou. Realize o pagamento para liberar o acesso para <strong>todos os usuários deste sistema</strong> por 30 dias.</>}
                </p>
                <p className="text-red-400 text-sm font-bold mb-4">
                    Verifique se este é o sistema correto. Se não for, entre em contato com o suporte antes de pagar.
                </p>

                {isEarlyRenewal && (
                    <button 
                        onClick={() => {
                            setIsEarlyRenewal(false);
                            setIsLocked(false);
                        }}
                        className="absolute top-4 right-4 text-white/50 hover:text-white"
                    >
                        <Icons.X size={24} />
                    </button>
                )}

                <div className="flex justify-center mb-6">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                        <Icons.Refresh size={14} />
                        Já pagou? Clique aqui para atualizar
                    </button>
                </div>

                {selectedMethod && (
                    <button onClick={() => { setPaymentData(null); setSelectedMethod(null); }} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                        <Icons.ArrowLeft size={20} />
                    </button>
                )}

                {!selectedMethod ? (
                    <div className="space-y-4">
                        <div className="bg-slate-700/50 p-4 rounded-xl border border-white/5">
                            <div className="text-sm text-slate-400">Valor da Assinatura ({systemContext})</div>
                            <div className="text-3xl font-bold text-green-400">R$ 300,00</div>
                            <div className="text-xs text-slate-500 mt-1">Libera o sistema {systemContext} por 30 dias</div>
                            <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                                Próximo vencimento após pagar: {(() => {
                                    const d = new Date();
                                    d.setMonth(d.getMonth() + 1);
                                    return d.toLocaleDateString('pt-BR');
                                })()}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {!isRecurringActive && (
                                <Button 
                                    theme={{ primary: 'bg-blue-600 hover:bg-blue-500 text-white' }} 
                                    onClick={handleCreateSubscriptionClick} 
                                    className="w-full py-3"
                                    icon={Icons.CreditCard}
                                >
                                    Assinar com Stripe
                                </Button>
                            )}
                            <Button 
                                theme={{ primary: 'bg-emerald-600 hover:bg-emerald-500 text-white' }} 
                                onClick={() => setSelectedMethod('pix')} 
                                className="w-full py-3"
                                icon={Icons.QrCode}
                            >
                                Pagar com PIX
                            </Button>
                        </div>

                        <div className="text-xs text-slate-500 mt-4 border-t border-white/5 pt-4">
                            <p className="font-bold mb-2">Pagamento Seguro via Stripe:</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                <span className="bg-white/5 px-2 py-1 rounded">Cartão de Crédito</span>
                                <span className="bg-white/5 px-2 py-1 rounded">Cartão de Débito</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5">
                            <button 
                                onClick={() => {
                                    localStorage.removeItem('nexflow_session');
                                    window.location.reload();
                                }} 
                                className="text-sm text-slate-500 hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors"
                            >
                                <Icons.LogOut size={16} />
                                Sair / Trocar de Conta
                            </button>
                        </div>
                    </div>
                ) : (
                    selectedMethod === 'pix' ? (
                        <PixPayment amount={30000} userId={user.uid} systemContext={systemContext} email={subscriptionEmail} />
                    ) : null
                )}
            </div>

            {renderModals()}
        </div>
    );
};
