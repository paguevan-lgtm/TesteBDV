import React, { useState, useEffect } from 'react';
import { Icons, Button } from '../components/Shared';

export default function LandingPage({ onLogin }: { onLogin: () => void }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0f172a]/90 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
                <div className="container mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Icons.Bus size={20} className="text-white" />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Bora de Van</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={onLogin} className="hidden md:block text-sm font-medium text-white/70 hover:text-white transition-colors">
                            Já sou cliente
                        </button>
                        <button 
                            onClick={onLogin}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Acessar Sistema
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] -z-10 opacity-50 animate-pulse-slow" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] -z-10 opacity-30" />

                <div className="container mx-auto px-6 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-300 mb-8 animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        Sistema Completo para Transporte Escolar
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight animate-fade-in-up delay-100">
                        Gerencie sua frota <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 animate-gradient-x">sem dor de cabeça</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
                        Controle passageiros, motoristas, financeiro e rotas em um único lugar. 
                        O sistema definitivo para quem leva o futuro da nação.
                    </p>
                    
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-fade-in-up delay-300">
                        <button onClick={onLogin} className="w-full md:w-auto bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all hover:shadow-xl hover:scale-105 active:scale-95">
                            Começar Agora
                        </button>
                        <button className="w-full md:w-auto px-8 py-4 rounded-full font-bold text-lg border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 group">
                            <Icons.PlayCircle size={20} className="group-hover:text-blue-400 transition-colors" />
                            Ver Demonstração
                        </button>
                    </div>

                    {/* Dashboard Preview */}
                    <div className="mt-20 relative mx-auto max-w-5xl animate-fade-in-up delay-500 perspective-1000">
                        <div className="relative bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl overflow-hidden transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out group">
                            <div className="absolute top-0 left-0 right-0 h-8 bg-[#0f172a] border-b border-white/5 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            </div>
                            <div className="p-8 pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 group-hover:opacity-100 transition-opacity">
                                {/* Fake UI Elements */}
                                <div className="col-span-2 space-y-4">
                                    <div className="h-32 bg-white/5 rounded-xl border border-white/5 animate-pulse" />
                                    <div className="h-64 bg-white/5 rounded-xl border border-white/5" />
                                </div>
                                <div className="space-y-4">
                                    <div className="h-24 bg-blue-500/20 rounded-xl border border-blue-500/20" />
                                    <div className="h-24 bg-purple-500/20 rounded-xl border border-purple-500/20" />
                                    <div className="h-40 bg-white/5 rounded-xl border border-white/5" />
                                </div>
                            </div>
                            
                            {/* Floating Elements */}
                            <div className="absolute top-1/3 left-10 bg-gray-800 p-4 rounded-xl border border-white/10 shadow-xl transform -translate-y-12 group-hover:-translate-y-14 transition-transform duration-500 delay-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                        <Icons.DollarSign size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/50">Receita Mensal</div>
                                        <div className="text-lg font-bold text-white">R$ 12.450,00</div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-10 right-10 bg-gray-800 p-4 rounded-xl border border-white/10 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Icons.Users size={20} />
                                    </div>
                                    <div>
                                        <div className="text-xs text-white/50">Passageiros Ativos</div>
                                        <div className="text-lg font-bold text-white">84 Alunos</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-[#0b1120]">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo que você precisa</h2>
                        <p className="text-white/60 max-w-2xl mx-auto">
                            Ferramentas poderosas para automatizar seu negócio de transporte escolar.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { icon: Icons.Users, title: 'Gestão de Passageiros', desc: 'Cadastro completo com fotos, documentos e contratos digitais.', color: 'blue' },
                            { icon: Icons.Map, title: 'Roteirização Inteligente', desc: 'Otimize suas rotas e economize combustível com nosso sistema de mapas.', color: 'green' },
                            { icon: Icons.Dollar, title: 'Controle Financeiro', desc: 'Fluxo de caixa, mensalidades e relatórios automáticos.', color: 'yellow' },
                            { icon: Icons.Smartphone, title: 'App Mobile', desc: 'Acesse de qualquer lugar. Funciona em Android e iOS.', color: 'purple' },
                            { icon: Icons.Bell, title: 'Notificações', desc: 'Avise os pais quando a van estiver chegando automaticamente.', color: 'red' },
                            { icon: Icons.Shield, title: 'Segurança Total', desc: 'Backups diários e proteção de dados com criptografia de ponta.', color: 'cyan' }
                        ].map((feature, i) => (
                            <div key={feature.title} className="bg-white/5 p-8 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors group cursor-default">
                                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center text-${feature.color}-400 mb-6 group-hover:scale-110 transition-transform`}>
                                    <feature.icon size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-white/60 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-600/10" />
                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8">Pronto para modernizar sua frota?</h2>
                    <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
                        Junte-se a centenas de transportadores que já transformaram a gestão do seu negócio.
                    </p>
                    <button onClick={onLogin} className="bg-white text-blue-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                        Criar Conta Grátis
                    </button>
                    <p className="mt-6 text-sm text-white/40">
                        Teste grátis por 7 dias. Sem cartão de crédito.
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#050914] py-12 border-t border-white/5">
                <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-lg opacity-50">
                        <Icons.Bus size={20} />
                        <span>Bora de Van</span>
                    </div>
                    <div className="text-sm text-white/40">
                        © 2024 Bora de Van. Todos os direitos reservados.
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="text-white/40 hover:text-white transition-colors"><Icons.Instagram size={20} /></a>
                        <a href="#" className="text-white/40 hover:text-white transition-colors"><Icons.Facebook size={20} /></a>
                        <a href="#" className="text-white/40 hover:text-white transition-colors"><Icons.Twitter size={20} /></a>
                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: translate(-50%, 0) scale(1); }
                    50% { opacity: 0.5; transform: translate(-50%, 0) scale(1.1); }
                }
                .animate-pulse-slow { animation: pulse-slow 8s infinite ease-in-out; }
                
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
                .delay-300 { animation-delay: 0.3s; }
                .delay-500 { animation-delay: 0.5s; }

                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 5s ease infinite;
                }
                
                .perspective-1000 { perspective: 1000px; }
                .rotate-x-12 { transform: rotateX(12deg); }
            `}</style>
        </div>
    );
}
