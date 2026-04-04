
import React, { useState, useMemo, useEffect } from 'react';
import { Icons, Button, ClockWidget, WeatherWidget, EmptyState } from '../components/Shared';
import { DonutChart, HorizontalBarChart } from '../components/Charts';
import { getTodayDate } from '../utils';

// --- FESTIVE THEME CONFIG ---
const THEME_CONFIGS: any = {
    carnaval: {
        id: 'carnaval', name: 'Carnaval', 
        gradient: 'from-purple-600/30 to-pink-600/30', 
        icon: <span className="text-3xl md:text-4xl animate-bounce">🎭</span>,
        particles: 'confetti',
        phrase: "O bloco do Bora de Van já está na rua! 🎉",
        range: "01/02 a 10/03"
    },
    natal: {
        id: 'natal', name: 'Natal', 
        gradient: 'from-red-600/30 to-green-600/30', 
        icon: <span className="text-3xl md:text-4xl animate-pulse">🎅</span>,
        particles: 'snow',
        phrase: "Ho Ho Ho! O melhor presente é chegar bem! 🎁",
        range: "20/12 a 26/12"
    },
    anonovo: {
        id: 'anonovo', name: 'Ano Novo', 
        gradient: 'from-yellow-400/20 to-white/10', 
        icon: <span className="text-3xl md:text-4xl animate-spin-slow">✨</span>,
        particles: 'sparkle',
        phrase: "365 novas oportunidades de rodagem! 🥂",
        range: "30/12 a 02/01"
    },
    pascoa: {
        id: 'pascoa', name: 'Páscoa', 
        gradient: 'from-pink-400/20 to-blue-400/20', 
        icon: <span className="text-3xl md:text-4xl animate-bounce">🐰</span>,
        particles: 'eggs',
        phrase: "Essa van está recheada de coisas boas! 🍫",
        range: "01/04 a 15/04"
    },
    saojoao: {
        id: 'saojoao', name: 'São João', 
        gradient: 'from-orange-600/30 to-yellow-600/30', 
        icon: <span className="text-3xl md:text-4xl animate-pulse">🌽</span>,
        particles: 'corn',
        phrase: "Olha a chuva! É mentira, teto solar fechado! 🤠",
        range: "15/06 a 30/06"
    },
    halloween: {
        id: 'halloween', name: 'Halloween', 
        gradient: 'from-purple-900/40 to-orange-600/30', 
        icon: <span className="text-3xl md:text-4xl animate-pulse">👻</span>,
        particles: 'ghosts',
        phrase: "Sem sustos na estrada, só gostosuras! 🎃",
        range: "25/10 a 31/10"
    }
};

export default function Dashboard({ data, theme, setView, onOpenModal, dbOp, setAiModal, user, systemContext, notify }: any) {
    const [noteText, setNoteText] = useState('');
    const [greeting, setGreeting] = useState('');
    const [motivational, setMotivational] = useState('');
    
    // Festive State
    const [festiveTheme, setFestiveTheme] = useState<string|null>(null);
    const [showThemeControl, setShowThemeControl] = useState(false);

    // Verifica permissão para ver o faturamento
    const canSeeRevenue = user && (user.role === 'admin' || user.username === 'Breno');
    const isBreno = user && user.username === 'Breno';

    // Auto-Detect Date for Festive Theme
    useEffect(() => {
        const today = new Date();
        const month = today.getMonth() + 1; // 1-12
        const day = today.getDate();
        
        let detected = null;

        // Carnaval (Aprox Fev/Março) - Simplificado
        if (month === 2 || (month === 3 && day <= 10)) detected = 'carnaval';
        // Páscoa (Abril)
        if (month === 4 && day <= 15) detected = 'pascoa';
        // São João (Junho)
        if (month === 6 && day >= 15) detected = 'saojoao';
        // Halloween
        if (month === 10 && day >= 25) detected = 'halloween';
        // Natal
        if (month === 12 && day >= 20 && day <= 26) detected = 'natal';
        // Ano Novo
        if ((month === 12 && day >= 30) || (month === 1 && day <= 2)) detected = 'anonovo';

        if (detected) setFestiveTheme(detected);
    }, []);

    // Define saudação e frase baseada na hora
    useEffect(() => {
        const hour = new Date().getHours();
        const name = user?.username || user?.displayName?.split(' ')[0] || 'Usuário';
        
        const phrases = [
            'Bora acelerar a gestão que o dia promete!',
            'Organização é a chave para um escritório eficiente.',
            'Nosso trabalho no escritório garante o sucesso na estrada.',
            'Foco na gestão, excelência no serviço.',
            'O escritório é o coração da nossa operação.',
            'Planejamento impecável, execução perfeita.',
            'Cada detalhe no sistema faz a diferença no dia a dia.',
            'Trabalho em equipe no escritório, resultados na rua.',
            'Gestão inteligente, transporte de qualidade.',
            'O sucesso da frota começa aqui no escritório.',
            'Comprometimento e agilidade na nossa central.',
            'Mantenha o sistema atualizado, o controle é tudo.',
            'Foco na missão administrativa!',
            'Bom trabalho para todos nós aqui no escritório!',
            'Eficiência no escritório, tranquilidade na operação.',
            'Nossa central é o ponto de partida para a excelência.',
            'A gestão de hoje é o sucesso de amanhã.',
            'Escritório organizado, frota em movimento.',
            'Dedicação total na nossa base administrativa.',
            'O controle da operação está em nossas mãos aqui no escritório.'
        ];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        
        if (hour >= 5 && hour < 12) {
            setGreeting(`Bom dia, ${name}!`);
        } else if (hour >= 12 && hour < 18) {
            setGreeting(`Boa tarde, ${name}!`);
        } else {
            setGreeting(`Boa noite, ${name}!`);
        }
        setMotivational(randomPhrase);
    }, [user]);

    const stats = useMemo(() => {
        const pay: any = {}; const b: any = {};
        let activeRevenue = 0;
        const today = getTodayDate();

        // Filtra passageiros ativos
        data.passengers.forEach((x: any) => { 
            if(x.status==='Ativo') { 
                pay[x.payment] = (pay[x.payment]||0)+1; 
                b[x.neighborhood] = (b[x.neighborhood]||0)+1; 
            } 
        });

        // Calcula faturamento estimado de HOJE
        data.trips.forEach((t:any) => {
            if (t.date === today && t.status !== 'Cancelada') {
                let val = 0;
                if (t.isExtra) {
                    val = parseFloat(t.value) || 0;
                } else {
                    // Tenta pegar snapshot ou calcula na hora
                    let pCount = 0;
                    if (t.pCountSnapshot !== undefined && t.pCountSnapshot !== null) pCount = parseInt(t.pCountSnapshot);
                    else if (t.passengersSnapshot) pCount = t.passengersSnapshot.reduce((acc:number, p:any) => acc + parseInt(p.passengerCount || 1), 0);
                    else pCount = data.passengers.filter((p:any)=>(t.passengerIds||[]).includes(p.realId || p.id)).reduce((a:number,b:any)=>a+parseInt(b.passengerCount||1),0);
                    
                    const unitPrice = t.pricePerPassenger !== undefined ? Number(t.pricePerPassenger) : (t.ticketPrice !== undefined ? Number(t.ticketPrice) : 4); 
                    val = pCount * unitPrice;
                }
                activeRevenue += val;
            }
        });

        return { 
            p: Object.entries(pay).map(([l,v])=>({label:l,value:v})), 
            b: Object.entries(b).map(([l,v]:any)=>({label:l,value:v})).sort((a:any,b:any)=>b.value-a.value).slice(0,5),
            revenue: activeRevenue
        };
    }, [data]);

    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderDate, setReminderDate] = useState(getTodayDate());
    const [reminderTime, setReminderTime] = useState('');
    const [wantsReminder, setWantsReminder] = useState(false);

    const saveNote = () => { 
        if(!noteText.trim()) return; 
        setShowReminderModal(true);
    };

    const confirmSaveNote = (skipReminder = false) => {
        const payload: any = { 
            text: noteText, 
            completed: false, 
            username: user.username,
            reminderTriggered: false
        };
        if (!skipReminder && wantsReminder && reminderDate && reminderTime) {
            payload.reminderDate = reminderDate;
            payload.reminderTime = reminderTime;
        }
        dbOp('create', 'notes', payload); 
        setNoteText('');
        setShowReminderModal(false);
        setWantsReminder(false);
        setReminderTime('');
    };

    const userNotes = data.notes.filter((n: any) => n.username === user.username);

    // --- FESTIVE RENDER HELPERS ---
    const activeFestive = festiveTheme ? THEME_CONFIGS[festiveTheme] : null;

    const renderParticles = () => {
        if (!activeFestive) return null;
        const count = 20;
        const items = [];
        for (let i = 0; i < count; i++) {
            const style: any = {
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 5}s`
            };
            
            let className = "festive-particle ";
            if (activeFestive.particles === 'confetti') className += `bg-${['red','blue','yellow','green','purple'][Math.floor(Math.random()*5)]}-500 w-2 h-2 rounded-sm rotate-confetti`;
            else if (activeFestive.particles === 'snow') className += "bg-white w-1.5 h-1.5 rounded-full opacity-80 fall-straight";
            else if (activeFestive.particles === 'ghosts') { style.fontSize = '20px'; items.push(<div key={`particle-${i}`} style={style} className="festive-emoji absolute top-0 opacity-0 animate-float-up">👻</div>); continue; }
            else if (activeFestive.particles === 'eggs') { style.fontSize = '15px'; items.push(<div key={`particle-${i}`} style={style} className="festive-emoji absolute top-0 opacity-0 animate-fall-rotate">🥚</div>); continue; }
            else if (activeFestive.particles === 'corn') { style.fontSize = '18px'; items.push(<div key={`particle-${i}`} style={style} className="festive-emoji absolute top-0 opacity-0 animate-fall-rotate">🌽</div>); continue; }
            else if (activeFestive.particles === 'flags') { className += "w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[10px] border-t-red-500 fall-sway"; }
            else if (activeFestive.particles === 'sparkle') { className += "bg-yellow-200 w-1 h-1 rounded-full shadow-[0_0_5px_yellow] fall-sparkle"; }
            
            items.push(<div key={`particle-${i}`} style={style} className={`absolute -top-4 ${className}`}></div>);
        }
        return <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">{items}</div>;
    };

    const innerBg = theme.inner || 'bg-black/20';
    const ghostBg = theme.ghost || 'hover:bg-white/5';

    return (
        <div className="space-y-8 pb-10 relative">
            
            {/* INJECTED ANIMATION STYLES */}
            <style>{`
                @keyframes fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(300px) rotate(360deg); opacity: 0; } }
                @keyframes fall-straight { 0% { transform: translateY(-10px); opacity: 0; } 10% { opacity: 0.8; } 100% { transform: translateY(300px); opacity: 0; } }
                @keyframes sway { 0% { transform: translateY(-10px) translateX(0px); opacity: 0; } 50% { transform: translateY(150px) translateX(20px); } 100% { transform: translateY(300px) translateX(-20px); opacity: 0; } }
                @keyframes floatUp { 0% { transform: translateY(300px); opacity: 0; } 50% { opacity: 0.5; } 100% { transform: translateY(-50px); opacity: 0; } }
                
                .rotate-confetti { animation: fall linear infinite; }
                .fall-straight { animation: fall-straight linear infinite; }
                .fall-sway { animation: sway linear infinite; }
                .animate-float-up { animation: floatUp linear infinite; }
                .animate-fall-rotate { animation: fall linear infinite; }
                .fall-sparkle { animation: fall-straight linear infinite; }
            `}</style>

            {/* Breno's Control Panel */}
            {isBreno && (
                <div className="absolute top-[-40px] right-0 z-50">
                    <button 
                        onClick={() => setShowThemeControl(!showThemeControl)} 
                        className={`text-[10px] px-2 py-1 rounded-full border border-white/10 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity ${innerBg}`}
                    >
                        <Icons.Stars size={10}/> Themes
                    </button>
                    {showThemeControl && (
                        <div className={`absolute top-8 right-0 ${theme.card} border ${theme.border} p-2 rounded-xl shadow-xl w-40 flex flex-col gap-1 z-50`}>
                            <button onClick={() => setFestiveTheme(null)} className={`text-xs p-2 rounded text-left ${ghostBg}`}>Padrão</button>
                            {Object.values(THEME_CONFIGS).map((t:any) => (
                                <button key={t.id} onClick={() => setFestiveTheme(t.id)} className={`text-xs p-2 rounded text-left flex items-center gap-2 ${ghostBg}`}>
                                    {t.icon} {t.name.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* HERO SECTION: Greeting & Context */}
            <div className={`relative overflow-hidden rounded-3xl stagger-in d-1 shadow-2xl transition-all duration-700 ${activeFestive ? 'ring-2 ring-white/20' : ''}`} style={{ isolation: 'isolate', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
                
                {/* Background Decor - Base */}
                <div className={`absolute inset-0 ${theme.primary} opacity-20 transition-colors duration-500`}></div>
                
                {/* Festive Gradient Overlay */}
                {activeFestive && <div className={`absolute inset-0 bg-gradient-to-r ${activeFestive.gradient} mix-blend-overlay opacity-80`}></div>}
                
                {/* Background Blur Overlay - Separate div for iOS Safari stability */}
                <div className="absolute inset-0 bg-white/5 backdrop-blur-md z-0" style={{ WebkitBackdropFilter: 'blur(12px)' }}></div>
                
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-amber-500/30 rounded-full blur-3xl"></div>
                <div className="absolute -left-10 bottom-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>

                <div className={`relative z-10 p-5 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border ${theme.border} text-white`}>
                    {/* Particles moved inside to avoid backdrop-blur */}
                    {renderParticles()}
                    
                    {/* Greeting Section - Left (Top on Mobile) */}
                    <div className="flex-1 w-full min-w-0 relative z-10">
                        {/* Wrapper para garantir que o ícone fique alinhado ao topo, à direita do texto */}
                        <div className="flex justify-between items-start mb-3 gap-2">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-md leading-tight max-w-[85%]">
                                {greeting}
                            </h1>
                            {activeFestive && <div className="animate-bounce-in shrink-0 pt-1">{activeFestive.icon}</div>}
                        </div>
                        
                        {/* Phrase / Pill Area */}
                        <div className="min-h-[30px]">
                            {activeFestive ? (
                                <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 bg-white/20 border border-white/30 px-3 py-1.5 rounded-xl shadow-sm max-w-full">
                                    <span className="text-xs md:text-sm font-bold leading-tight">{activeFestive.phrase}</span>
                                    <span className="text-[10px] uppercase font-bold opacity-70 border-l border-white/40 pl-2 tracking-wider whitespace-nowrap">{activeFestive.range}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 font-medium text-sm text-white/90">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                                    <span>{motivational}</span>
                                </div>
                            ) }
                        </div>
                    </div>
                    
                    {/* Widgets Section - Right (Bottom on Mobile) */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full md:w-auto md:min-w-[280px] relative z-20">
                        <ClockWidget key={`clock-${systemContext}`} theme={{...theme, card: `${innerBg} border ${theme.border} text-white`, inner: 'bg-white/10'}} />
                        <WeatherWidget key={`weather-${systemContext}`} location={systemContext === 'Pg' ? 'PG' : systemContext === 'Sv' ? 'SV' : systemContext === 'Mip' ? 'Mongaguá' : 'PG'} theme={{...theme, card: `${innerBg} border ${theme.border} text-white`, inner: 'bg-white/10'}} />
                    </div>
                </div>
            </div>

            {/* QUICK ACTIONS BAR - High Priority */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-in d-2">
                <Button 
                    id="btn-magic-create"
                    onClick={()=>{setAiModal(true)}} 
                    variant="primary"
                    className="col-span-2 md:col-span-2 p-4 shadow-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] group border border-white/10 text-white"
                >
                    <div className="bg-white/20 p-2 rounded-full group-hover:rotate-12 transition-transform"><Icons.Stars size={24} className="text-white"/></div>
                    <div className="text-left">
                        <div className="font-bold text-lg leading-none">Cadastro Mágico</div>
                        <div className="opacity-80 text-xs">Usar Inteligência Artificial</div>
                    </div>
                </Button>

                <Button onClick={()=>{onOpenModal('newPass')}} variant="secondary" className="p-4 rounded-2xl flex items-center gap-3 group active:scale-95">
                    <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400 group-hover:scale-110 transition-transform"><Icons.Users size={20}/></div>
                    <div className="text-left">
                        <div className="font-bold text-sm">Novo Passageiro</div>
                    </div>
                </Button>

                <Button onClick={()=>{onOpenModal('newTrip')}} variant="secondary" className="p-4 rounded-2xl flex items-center gap-3 group active:scale-95">
                    <div className="bg-green-500/20 p-2 rounded-xl text-green-400 group-hover:scale-110 transition-transform"><Icons.Van size={20}/></div>
                    <div className="text-left">
                        <div className="font-bold text-sm">Nova Viagem</div>
                    </div>
                </Button>
            </div>

            {/* STATS OVERVIEW */}
            <div id="dashboard-stats" className={`grid grid-cols-1 ${canSeeRevenue ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 stagger-in d-3`}>
                <div onClick={() => setView('passengers')} className={`${theme.card} p-5 rounded-2xl border ${theme.border} relative overflow-hidden cursor-pointer hover:border-blue-500/50 transition-colors group`}>
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500"><Icons.Users size={80}/></div>
                    <div className="relative z-10">
                        <div className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-1">Base de Passageiros</div>
                        {/* Fix: removed text-white for theme.text */}
                        <div className="text-4xl font-black">{data.passengers.length}</div>
                        <div className="text-xs opacity-50 mt-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Cadastrados</div>
                    </div>
                </div>

                <div onClick={() => setView('trips')} className={`${theme.card} p-5 rounded-2xl border ${theme.border} relative overflow-hidden cursor-pointer hover:border-amber-500/50 transition-colors group`}>
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500"><Icons.Map size={80}/></div>
                    <div className="relative z-10">
                        <div className="text-amber-400 font-bold uppercase tracking-wider text-xs mb-1">Total de Viagens</div>
                        <div className="text-4xl font-black">{data.trips.length}</div>
                        <div className="text-xs opacity-50 mt-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Realizadas</div>
                    </div>
                </div>

                {canSeeRevenue && (
                    <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} relative overflow-hidden group bg-green-500/5 border-green-500/20`}>
                        <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Icons.Dollar size={80}/></div>
                        <div className="relative z-10">
                            <div className="text-green-400 font-bold uppercase tracking-wider text-xs mb-1">Estimativa Hoje</div>
                            <div className="text-4xl font-black">R$ {stats.revenue.toFixed(2).replace('.', ',')}</div>
                            <div className="text-xs opacity-50 mt-2 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Calculado sobre viagens</div>
                        </div>
                    </div>
                )}
            </div>

            {/* CHARTS & ANALYTICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} stagger-in d-4 flex flex-col justify-center min-h-[250px]`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold flex items-center gap-2"><Icons.Dollar size={18} className="text-green-400"/> Formas de Pagamento</h3>
                    </div>
                    {stats.p.length ? <DonutChart data={stats.p} theme={theme}/> : <div className="flex-1 flex items-center justify-center opacity-30 text-sm">Sem dados suficientes</div>}
                </div>

                <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} stagger-in d-5 flex flex-col min-h-[250px]`}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold flex items-center gap-2"><Icons.Map size={18} className="text-blue-400"/> Top Bairros</h3>
                    </div>
                    {stats.b.length ? <HorizontalBarChart data={stats.b} theme={theme}/> : <div className="flex-1 flex items-center justify-center opacity-30 text-sm">Sem dados suficientes</div>}
                </div>
            </div>
            
            {/* PERSONAL NOTES */}
            <div className={`${theme.card} p-6 rounded-2xl border ${theme.border} stagger-in d-5`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold flex items-center gap-2"><Icons.Clipboard size={20} className="text-purple-400"/> Bloco de Notas</h3>
                    <span className="text-xs opacity-40 uppercase font-bold tracking-widest">{user.username}</span>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <input 
                        className={`flex-1 border px-4 py-3 text-sm outline-none focus:border-current transition-all ${theme.radius} ${innerBg} ${theme.border}`}
                        placeholder="Digite um lembrete rápido..." 
                        value={noteText} 
                        onChange={e=>setNoteText(e.target.value)} 
                        onKeyPress={e=> e.key === 'Enter' && saveNote()} 
                    />
                    <button onClick={saveNote} className={`${theme.primary} w-12 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform`} title="Adicionar Nota"><Icons.Plus size={20}/></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {userNotes.filter((n:any) => !n.completed).length > 0 ? userNotes.filter((n:any) => !n.completed).map((note:any) => (
                        <div key={note.id} className={`flex justify-between items-start ${ghostBg} p-3 rounded-xl text-sm border ${theme.border} transition-colors group`}>
                            <div className="flex-1 flex flex-col">
                                <span className="break-words leading-relaxed opacity-90">{note.text}</span>
                                {note.reminderDate && (
                                    <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-1">
                                        <Icons.Clock size={10}/> {note.reminderDate.split('-').reverse().join('/')} às {note.reminderTime}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(note.text); }}
                                    className="text-blue-400 p-1 hover:bg-blue-500/10 rounded-lg transition-all"
                                    title="Copiar"
                                >
                                    <Icons.Copy size={14}/>
                                </button>
                                <button 
                                    onClick={() => dbOp('update', 'notes', { ...note, completed: true })}
                                    className="text-green-400 p-1 hover:bg-green-500/10 rounded-lg transition-all ml-1"
                                    title="Concluído"
                                >
                                    <Icons.Check size={14}/>
                                </button>
                                <button 
                                    onClick={() => dbOp('delete', 'notes', note.id)} 
                                    className="text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-all ml-1"
                                    title="Apagar"
                                >
                                    <Icons.Trash size={14}/>
                                </button>
                            </div>
                        </div>
                    )) : (
                        <EmptyState title="Nenhum lembrete" subtitle="Adicione um novo lembrete acima." />
                    )}
                </div>

                {/* COMPLETED NOTES HISTORY */}
                {userNotes.filter((n:any) => n.completed).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <h4 className="font-bold text-sm opacity-60 mb-3 flex items-center gap-2">
                            <Icons.Clock size={16} /> Histórico de Concluídos
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {userNotes.filter((n:any) => n.completed).map((note:any) => (
                                <div key={note.id} className={`flex justify-between items-center bg-white/5 p-3 rounded-xl text-sm border border-dashed border-white/10 opacity-70 group hover:opacity-100 transition-all`}>
                                    <div className="flex-1 flex flex-col">
                                        <span className="break-words leading-relaxed line-through opacity-80">{note.text}</span>
                                        {note.reminderDate && (
                                            <span className="text-[10px] opacity-40 flex items-center gap-1 mt-1">
                                                <Icons.Clock size={10}/> {note.reminderDate.split('-').reverse().join('/')} às {note.reminderTime}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                        <button 
                                            onClick={() => dbOp('update', 'notes', { ...note, completed: false })} 
                                            className="text-blue-400 p-1 hover:bg-blue-500/10 rounded-lg transition-all"
                                            title="Voltar para notas"
                                        >
                                            <Icons.Repeat size={14}/>
                                        </button>
                                        <button 
                                            onClick={() => dbOp('delete', 'notes', note.id)} 
                                            className="text-red-400 p-1 hover:bg-red-500/10 rounded-lg transition-all ml-1"
                                            title="Apagar"
                                        >
                                            <Icons.Trash size={14}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {/* REMINDER SETUP MODAL */}
            {showReminderModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`${theme.card} border ${theme.border} w-full max-w-md p-6 rounded-2xl shadow-2xl stagger-in`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-amber-500/20 p-2 rounded-xl text-amber-500">
                                <Icons.Bell size={24}/>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Configurar Lembrete?</h3>
                                <p className="text-xs opacity-60">Deseja ser notificado sobre este lembrete?</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <button 
                                onClick={() => setWantsReminder(!wantsReminder)}
                                className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${wantsReminder ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5'}`}
                            >
                                <span className="font-bold">Emitir lembrete sonoro</span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${wantsReminder ? 'border-amber-500 bg-amber-500' : 'border-white/20'}`}>
                                    {wantsReminder && <Icons.Check size={14} className="text-white"/>}
                                </div>
                            </button>

                            {wantsReminder && (
                                <div className="grid grid-cols-2 gap-3 animate-slide-up">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Data</label>
                                        <div className="relative group/input">
                                            <input 
                                                type="date"
                                                value={reminderDate}
                                                onChange={e => setReminderDate(e.target.value)}
                                                className={`w-full ${innerBg} border ${theme.border} rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 transition-all font-bold appearance-none cursor-pointer hover:bg-white/5`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-focus-within/input:text-amber-500 group-focus-within/input:opacity-100 transition-all">
                                                <Icons.Calendar size={18}/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Horário</label>
                                        <div className="relative group/input">
                                            <input 
                                                type="time"
                                                value={reminderTime}
                                                onChange={e => setReminderTime(e.target.value)}
                                                className={`w-full ${innerBg} border ${theme.border} rounded-2xl px-5 py-4 text-sm outline-none focus:border-amber-500 transition-all font-bold appearance-none cursor-pointer hover:bg-white/5`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-focus-within/input:text-amber-500 group-focus-within/input:opacity-100 transition-all">
                                                <Icons.Clock size={18}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => {
                                    confirmSaveNote(true); // Salva sem lembrete
                                }}
                                className="py-3.5 rounded-2xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-all"
                            >
                                Não, só salvar
                            </button>
                            <button 
                                onClick={() => confirmSaveNote(false)}
                                className={`py-3.5 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all ${theme.primary}`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
