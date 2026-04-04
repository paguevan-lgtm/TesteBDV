import { useState, useEffect } from 'react';
import { 
  MapPin, 
  Calendar, 
  Users, 
  ChevronRight, 
  Menu, 
  X, 
  Star, 
  ShieldCheck, 
  Clock, 
  Map as MapIcon,
  Bus,
  ArrowRight,
  CheckCircle2,
  ArrowLeftRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomSelect } from './components/CustomSelect';
import { CustomDatePicker } from './components/CustomDatePicker';

const destinationOptions = [
  { value: 'jabaquara', label: 'Jabaquara' },
  { value: 'praia_grande', label: 'Praia Grande' },
  { value: 'mongagua', label: 'Mongaguá' },
  { value: 'itanhaem', label: 'Itanhaém' },
  { value: 'cubatao', label: 'Cubatão' },
  { value: 'sao_vicente', label: 'São Vicente' },
  { value: 'santos', label: 'Santos' },
  { value: 'guaruja', label: 'Guarujá' },
];

const tripTypeOptions = [
  { value: 'ida_volta', label: 'Ida e Volta' },
  { value: 'so_ida', label: 'Somente Ida' },
  { value: 'so_volta', label: 'Somente Volta' },
];

const allDestinationsList = [
  { value: 'praia_grande', name: "Praia Grande", price: "R$ 40", img: "https://images.unsplash.com/photo-1596423735880-5c6fa7f0170a?auto=format&fit=crop&w=800&q=80" },
  { value: 'mongagua', name: "Mongaguá", price: "R$ 45", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80" },
  { value: 'itanhaem', name: "Itanhaém", price: "R$ 50", img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80" },
  { value: 'cubatao', name: "Cubatão", price: "R$ 35", img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80" },
  { value: 'sao_vicente', name: "São Vicente", price: "R$ 40", img: "https://images.unsplash.com/photo-1506477331477-33d5d8b3dc85?auto=format&fit=crop&w=800&q=80" },
  { value: 'santos', name: "Santos", price: "R$ 45", img: "https://images.unsplash.com/photo-1543059080-f9b1272213d5?auto=format&fit=crop&w=800&q=80" },
  { value: 'guaruja', name: "Guarujá", price: "R$ 50", img: "https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?auto=format&fit=crop&w=800&q=80" },
];

const generateTimeSlots = (selectedDate: Date | null) => {
  if (!selectedDate) return [];
  
  const isSunday = selectedDate.getDay() === 0;
  
  const slots = [];
  let currentHour = 7;
  let currentMinute = 0;

  while (currentHour < 20 || (currentHour === 20 && currentMinute <= 30)) {
    const startHourStr = currentHour.toString().padStart(2, '0');
    const startMinStr = currentMinute.toString().padStart(2, '0');
    
    let endHour = currentHour;
    let endMinute = currentMinute + 45;
    if (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    const endHourStr = endHour.toString().padStart(2, '0');
    const endMinStr = endMinute.toString().padStart(2, '0');

    slots.push({
      startHour: currentHour,
      startMinute: currentMinute,
      label: `${startHourStr}:${startMinStr} - ${endHourStr}:${endMinStr}`,
      value: `${startHourStr}:${startMinStr}-${endHourStr}:${endMinStr}`
    });

    currentMinute += 30;
    if (currentMinute >= 60) {
      currentHour += 1;
      currentMinute -= 60;
    }
  }

  if (isSunday) {
    slots.push({
      startHour: 21,
      startMinute: 30,
      label: `21:30 - 22:15`,
      value: `21:30-22:15`
    });
  }

  return slots;
};

const isSlotPast = (selectedDate: Date, slotHour: number, slotMinute: number) => {
  const now = new Date();
  const brasiliaTimeStr = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const brasiliaNow = new Date(brasiliaTimeStr);

  if (
    selectedDate.getFullYear() === brasiliaNow.getFullYear() &&
    selectedDate.getMonth() === brasiliaNow.getMonth() &&
    selectedDate.getDate() === brasiliaNow.getDate()
  ) {
    if (brasiliaNow.getHours() > slotHour) return true;
    if (brasiliaNow.getHours() === slotHour && brasiliaNow.getMinutes() >= slotMinute) return true;
  } else {
     const todayMidnight = new Date(brasiliaNow.getFullYear(), brasiliaNow.getMonth(), brasiliaNow.getDate());
     if (selectedDate < todayMidnight) return true;
  }
  
  return false;
};

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isAllDestinationsModalOpen, setIsAllDestinationsModalOpen] = useState(false);

  // Form State
  const [tripType, setTripType] = useState('ida_volta');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [passengers, setPassengers] = useState('1');

  // Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    reference: '',
    observation: '',
    luggageS: '0',
    luggageM: '0',
    luggageL: '0',
    time: ''
  });

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAction = (action: string) => {
    setToast(action);
    setTimeout(() => setToast(null), 3000);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden text-slate-200">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 border border-slate-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="text-brand-pink w-5 h-5" />
            <span className="font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/90 backdrop-blur-md shadow-lg shadow-black/20 py-3 border-b border-slate-800' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-brand rounded-lg flex items-center justify-center shadow-lg transform -rotate-6">
              <Bus className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-display font-extrabold tracking-tight text-white">
              Bora de <span className="text-brand-pink">Van</span>
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {[{id: 'destinos', label: 'Destinos'}, {id: 'como-funciona', label: 'Como Funciona'}, {id: 'sobre', label: 'Sobre'}].map((item) => (
              <a key={item.id} href={`#${item.id}`} onClick={(e) => { e.preventDefault(); scrollToSection(item.id); }} className="text-slate-300 hover:text-brand-pink font-medium transition-colors">
                {item.label}
              </a>
            ))}
            <button onClick={() => scrollToSection('reserva')} className="bg-gradient-brand text-white px-6 py-2.5 rounded-full font-bold shadow-md shadow-brand-purple/20 hover:shadow-lg hover:shadow-brand-purple/40 hover:scale-105 transition-all">
              Reserve Agora
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-slate-950 pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6 text-center">
              {[{id: 'destinos', label: 'Destinos'}, {id: 'como-funciona', label: 'Como Funciona'}, {id: 'sobre', label: 'Sobre'}].map((item) => (
                <a key={item.id} href={`#${item.id}`} onClick={(e) => { e.preventDefault(); scrollToSection(item.id); }} className="text-2xl font-display font-bold text-white">
                  {item.label}
                </a>
              ))}
              <button onClick={() => scrollToSection('reserva')} className="bg-gradient-brand text-white py-4 rounded-2xl font-bold text-xl shadow-xl mt-4">
                Reserve sua viagem agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-10 pointer-events-none">
          <div className="absolute top-20 right-10 w-64 h-64 bg-brand-purple rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-brand-pink rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-block px-4 py-1 bg-brand-purple/20 text-brand-pink rounded-full font-bold text-sm mb-6 uppercase tracking-wider border border-brand-purple/30">
                  Aventura & Conforto
                </span>
                <h1 className="text-5xl md:text-7xl font-display font-extrabold text-white leading-[1.1] mb-6">
                  Bora de Van – <br />
                  <span className="text-gradient-brand">Reserve sua viagem agora!</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0">
                  Descubra destinos incríveis com a segurança e o conforto que você merece. Viagens rápidas, práticas e cheias de diversão.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <button onClick={() => scrollToSection('reserva')} className="w-full sm:w-auto bg-gradient-brand text-white px-8 py-4 rounded-2xl font-extrabold text-lg shadow-xl shadow-brand-purple/20 hover:shadow-brand-purple/40 hover:scale-105 transition-all flex items-center justify-center gap-2">
                    Reserve sua viagem agora <ChevronRight size={20} />
                  </button>
                  <button onClick={() => scrollToSection('destinos')} className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-md hover:shadow-lg transition-all border border-slate-800 hover:border-slate-700">
                    Veja destinos
                  </button>
                </div>
              </motion.div>
            </div>

            <div className="flex-1 relative w-full max-w-2xl">
              {/* Animated Van Illustration Area */}
              <motion.div 
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative z-10"
              >
                {/* Road Shadow */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-black/40 blur-xl rounded-full" />
                
                {/* Stylized Van (SVG) */}
                <div className="relative">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <svg viewBox="0 0 500 300" className="w-full h-auto drop-shadow-2xl">
                      {/* Simplified Cartoon Van Body */}
                      <path d="M50,220 L450,220 L450,150 Q450,100 400,80 L150,80 Q100,80 80,120 L50,150 Z" fill="url(#vanGradient)" />
                      <defs>
                        <linearGradient id="vanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7c3aed" />
                          <stop offset="100%" stopColor="#db2777" />
                        </linearGradient>
                      </defs>
                      {/* Windows */}
                      <path d="M100,100 L250,100 L250,150 L85,150 Q90,120 100,100 Z" fill="white" fillOpacity="0.3" />
                      <path d="M270,100 L420,100 L420,150 L270,150 Z" fill="white" fillOpacity="0.3" />
                      {/* Wheels */}
                      <circle cx="130" cy="220" r="35" fill="#0f172a" />
                      <circle cx="130" cy="220" r="15" fill="#334155" />
                      <circle cx="370" cy="220" r="35" fill="#0f172a" />
                      <circle cx="370" cy="220" r="15" fill="#334155" />
                      {/* Speed Lines */}
                      <motion.g
                        animate={{ x: [-20, 20], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <line x1="20" y1="140" x2="60" y2="140" stroke="#db2777" strokeWidth="4" strokeLinecap="round" />
                        <line x1="10" y1="170" x2="50" y2="170" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
                        <line x1="25" y1="200" x2="65" y2="200" stroke="#db2777" strokeWidth="4" strokeLinecap="round" />
                      </motion.g>
                    </svg>
                  </motion.div>
                </div>

                {/* Floating Elements */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                  className="absolute -top-10 -right-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Segurança</p>
                    <p className="font-bold text-white">100% Garantida</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-6 -left-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center">
                    <Star size={24} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Avaliação</p>
                    <p className="font-bold text-white">4.9/5 Estrelas</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Widget */}
      <section id="reserva" className="container mx-auto px-4 -mt-12 relative z-20">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-900 p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-800"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-slate-400 font-bold text-sm ml-1">
                <ArrowLeftRight size={16} className="text-brand-pink" /> TIPO DE VIAGEM
              </label>
              <CustomSelect 
                options={tripTypeOptions}
                value={tripType}
                onChange={setTripType}
                placeholder="Selecione o tipo"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-slate-400 font-bold text-sm ml-1">
                <MapPin size={16} className="text-brand-pink" /> ORIGEM
              </label>
              <CustomSelect 
                options={destinationOptions}
                value={origin}
                onChange={setOrigin}
                placeholder="De onde saímos?"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-slate-400 font-bold text-sm ml-1">
                <MapPin size={16} className="text-brand-pink" /> DESTINO
              </label>
              <CustomSelect 
                options={destinationOptions}
                value={destination}
                onChange={setDestination}
                placeholder="Para onde vamos?"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-slate-400 font-bold text-sm ml-1">
                <Calendar size={16} className="text-brand-pink" /> DATA
              </label>
              <CustomDatePicker 
                value={date}
                onChange={setDate}
                placeholder="Escolha a data"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-slate-400 font-bold text-sm ml-1">
                <Users size={16} className="text-brand-pink" /> PASSAGEIROS
              </label>
              <input 
                type="number" 
                min="1"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                placeholder="Ex: 2"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 font-bold text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => {
                  if (!origin || !destination || !date || !passengers) {
                    handleAction('Por favor, preencha todos os campos!');
                    return;
                  }
                  setIsBookingModalOpen(true);
                }} 
                className="w-full bg-gradient-brand text-white py-4 rounded-2xl font-extrabold text-lg shadow-lg shadow-brand-purple/20 hover:shadow-brand-pink/40 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="como-funciona" className="py-24 bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-extrabold text-white mb-4">
              Por que viajar com a <span className="text-gradient-brand">Bora de Van</span>?
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Oferecemos a melhor experiência de viagem em grupo, focada no que realmente importa para você.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: <Clock className="text-purple-400" />, title: "Rapidez", desc: "Sinais visuais de velocidade e rotas otimizadas para você chegar logo.", color: "bg-purple-900/10 border-purple-900/30" },
              { icon: <ShieldCheck className="text-pink-400" />, title: "Segurança", desc: "Vans revisadas e motoristas profissionais para sua tranquilidade.", color: "bg-pink-900/10 border-pink-900/30" },
              { icon: <Star className="text-yellow-400" />, title: "Conforto", desc: "Ar-condicionado, poltronas reclináveis e espaço de sobra.", color: "bg-yellow-900/10 border-yellow-900/30" },
              { icon: <MapIcon className="text-blue-400" />, title: "Diversão", desc: "Destinos incríveis e a melhor vibe para sua viagem ser inesquecível.", color: "bg-blue-900/10 border-blue-900/30" },
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className={`${feature.color} p-8 rounded-[2rem] border hover:border-slate-700 transition-all backdrop-blur-sm`}
              >
                <div className="w-14 h-14 bg-slate-900/50 border border-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Preview */}
      <section id="destinos" className="py-24 bg-slate-900 overflow-hidden border-y border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-5xl font-display font-extrabold text-white mb-4">
                Destinos <span className="text-gradient-brand">Populares</span>
              </h2>
              <p className="text-slate-400 text-lg">
                Escolha o seu próximo destino e prepare as malas. A aventura começa aqui!
              </p>
            </div>
            <button onClick={() => setIsAllDestinationsModalOpen(true)} className="flex items-center gap-2 text-brand-pink font-bold text-lg hover:gap-4 transition-all">
              Ver todos os destinos <ArrowRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Santos", price: "R$ 45", img: "https://images.unsplash.com/photo-1543059080-f9b1272213d5?auto=format&fit=crop&w=800&q=80" },
              { name: "Praia Grande", price: "R$ 40", img: "https://images.unsplash.com/photo-1596423735880-5c6fa7f0170a?auto=format&fit=crop&w=800&q=80" },
              { name: "Guarujá", price: "R$ 50", img: "https://images.unsplash.com/photo-1515238152791-8216bfdf89a7?auto=format&fit=crop&w=800&q=80" },
            ].map((dest, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.02 }}
                className="group relative h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50 border border-slate-800"
              >
                <img 
                  src={dest.img} 
                  alt={dest.name} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-90" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="flex items-center justify-between items-end">
                    <div>
                      <p className="text-slate-300 font-bold text-sm uppercase tracking-widest mb-1">Destino</p>
                      <h3 className="text-3xl font-display font-extrabold text-white">{dest.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-brand-pink font-bold text-sm uppercase">A partir de</p>
                      <p className="text-2xl font-extrabold text-white">{dest.price}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setDestination(dest.name.toLowerCase().replace(' ', '_').replace('á', 'a'));
                      scrollToSection('reserva');
                    }} 
                    className="w-full mt-6 bg-white/10 backdrop-blur-md text-white border border-white/20 py-3 rounded-xl font-bold hover:bg-gradient-brand hover:border-transparent transition-all shadow-lg"
                  >
                    Agende sua van
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-brand rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-purple/20 border border-slate-800">
            {/* Abstract Shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-display font-extrabold mb-8">
                Pronto para sua próxima aventura?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 mb-12 font-medium">
                Não perca tempo! Garanta seu lugar agora e viaje com quem entende de diversão e segurança.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                <button onClick={() => scrollToSection('reserva')} className="w-full sm:w-auto bg-slate-950 text-white px-10 py-5 rounded-2xl font-extrabold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all border border-slate-800 hover:border-brand-pink">
                  Reserve sua viagem agora
                </button>
                <button onClick={() => handleAction('Abrindo chat com consultor...')} className="w-full sm:w-auto bg-brand-purple/20 backdrop-blur-md border border-white/30 text-white px-10 py-5 rounded-2xl font-extrabold text-xl hover:bg-white/10 transition-all">
                  Falar com consultor
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="sobre" className="bg-slate-950 text-white pt-20 pb-10 border-t border-slate-900">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-brand rounded-lg flex items-center justify-center shadow-lg transform -rotate-6">
                  <Bus className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-display font-extrabold tracking-tight">
                  Bora de <span className="text-brand-pink">Van</span>
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                A sua agência de viagens especializada em transporte de van. Conforto, segurança e diversão em cada quilômetro.
              </p>
            </div>

            <div>
              <h4 className="text-xl font-bold mb-6">Links Rápidos</h4>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleAction('Navegando para Destinos'); }} className="hover:text-brand-pink transition-colors">Destinos</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleAction('Navegando para Como Funciona'); }} className="hover:text-brand-pink transition-colors">Como Funciona</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleAction('Navegando para Segurança'); }} className="hover:text-brand-pink transition-colors">Segurança</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleAction('Navegando para Agendamento'); }} className="hover:text-brand-pink transition-colors">Agendamento</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xl font-bold mb-6">Suporte</h4>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleAction('Abrindo Central de Ajuda'); }} className="hover:text-brand-pink transition-colors">Central de Ajuda</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleAction('Abrindo Termos de Uso'); }} className="hover:text-brand-pink transition-colors">Termos de Uso</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleAction('Abrindo Privacidade'); }} className="hover:text-brand-pink transition-colors">Privacidade</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); handleAction('Abrindo Contato'); }} className="hover:text-brand-pink transition-colors">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xl font-bold mb-6">Newsletter</h4>
              <p className="text-slate-400 mb-4">Receba promoções e novos destinos no seu e-mail.</p>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleAction('Inscrito na Newsletter!'); }}>
                <input 
                  type="email" 
                  placeholder="Seu e-mail" 
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-brand-purple outline-none text-white"
                  required
                />
                <button type="submit" className="bg-gradient-brand p-3 rounded-xl hover:shadow-lg hover:scale-105 transition-all">
                  <ArrowRight size={20} />
                </button>
              </form>
            </div>
          </div>
          
          <div className="pt-10 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} Bora de Van. Todos os direitos reservados. Viaje com diversão e segurança.</p>
            <div className="flex gap-4">
              {['Instagram', 'Facebook', 'Twitter'].map((social) => (
                <a key={social} href="#" onClick={(e) => { e.preventDefault(); handleAction(`Abrindo ${social}`); }} className="text-slate-500 hover:text-brand-pink transition-colors text-sm font-medium">
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-800 flex-shrink-0 relative">
                <button onClick={() => setIsBookingModalOpen(false)} className="absolute top-6 md:top-8 right-6 md:right-8 text-slate-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
                <h3 className="text-2xl md:text-3xl font-display font-extrabold text-white mb-2 pr-8">Complete sua reserva</h3>
                <p className="text-slate-400 text-sm md:text-base">Falta pouco! Preencha os dados abaixo para confirmar sua viagem.</p>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto space-y-5">
                {destination !== 'jabaquara' ? (
                  <div className="mb-2">
                    <label className="block text-sm font-bold text-slate-400 mb-3">Informação de Saída</label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-slate-300 text-sm leading-relaxed flex items-start gap-3">
                      <Clock className="text-brand-pink shrink-0 mt-0.5" size={20} />
                      <p>
                        Carros e Vans Saindo todos os dias de domingo a domingo de 30 em 30 minutos. A partir das 6:00 da manhã no Mercado Pão de açúcar - Jabaquara
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2">
                    <label className="block text-sm font-bold text-slate-400 mb-3">Horário de Saída</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {generateTimeSlots(date).map((slot) => {
                        const isPast = date ? isSlotPast(date, slot.startHour, slot.startMinute) : false;
                        const isSelected = formData.time === slot.value;
                        
                        return (
                          <button
                            key={slot.value}
                            disabled={isPast}
                            onClick={() => setFormData({ ...formData, time: slot.value })}
                            className={`
                              py-2 px-1 rounded-xl text-xs sm:text-sm font-bold border transition-all
                              ${isPast 
                                ? 'bg-slate-900/50 border-slate-800/50 text-slate-600 line-through cursor-not-allowed' 
                                : isSelected
                                  ? 'bg-brand-purple border-brand-pink text-white shadow-lg shadow-brand-purple/20'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-brand-purple hover:text-white'
                              }
                            `}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" 
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-400 mb-2">Telefone / WhatsApp</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" 
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                
                {destination !== 'jabaquara' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Endereço</label>
                      <input 
                        type="text" 
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" 
                        placeholder="Rua, Número, Bairro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-400 mb-2">Ponto de Referência</label>
                      <input 
                        type="text" 
                        value={formData.reference}
                        onChange={(e) => setFormData({...formData, reference: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" 
                        placeholder="Ex: Próximo ao mercado"
                      />
                    </div>
                  </div>
                )}

                <div>
                   <label className="block text-sm font-bold text-slate-400 mb-2">Quantidade de Malas</label>
                   <div className="grid grid-cols-3 gap-4">
                     <div>
                       <label className="block text-xs text-slate-500 mb-1">Pequena (P)</label>
                       <input 
                         type="number" 
                         min="0" 
                         value={formData.luggageS}
                         onChange={(e) => setFormData({...formData, luggageS: e.target.value})}
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" 
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-slate-500 mb-1">Média (M)</label>
                       <input 
                         type="number" 
                         min="0" 
                         value={formData.luggageM}
                         onChange={(e) => setFormData({...formData, luggageM: e.target.value})}
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" 
                       />
                     </div>
                     <div>
                       <label className="block text-xs text-slate-500 mb-1">Grande (GG)</label>
                       <input 
                         type="number" 
                         min="0" 
                         value={formData.luggageL}
                         onChange={(e) => setFormData({...formData, luggageL: e.target.value})}
                         className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all" 
                       />
                     </div>
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-400 mb-2">Observação (Opcional)</label>
                  <textarea 
                    rows={3} 
                    value={formData.observation}
                    onChange={(e) => setFormData({...formData, observation: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-brand-purple/50 outline-none transition-all resize-none"
                    placeholder="Alguma necessidade especial ou detalhe importante?"
                  ></textarea>
                </div>

                <button 
                  onClick={() => { 
                    if (destination === 'jabaquara' && !formData.time) {
                      handleAction('Selecione um horário de saída!');
                      return;
                    }
                    if (!formData.name || !formData.phone) {
                      handleAction('Preencha nome e telefone!');
                      return;
                    }
                    setIsBookingModalOpen(false); 
                    handleAction('Reserva finalizada com sucesso!'); 
                  }} 
                  className="w-full bg-gradient-brand text-white py-4 rounded-xl font-bold text-lg mt-4 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-brand-purple/20"
                >
                  Finalizar Reserva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Destinations Modal */}
      <AnimatePresence>
        {isAllDestinationsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-6xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 md:p-8 border-b border-slate-800 flex-shrink-0 relative flex justify-between items-center">
                <div>
                  <h3 className="text-2xl md:text-3xl font-display font-extrabold text-white mb-2">Todos os Destinos</h3>
                  <p className="text-slate-400 text-sm md:text-base">Escolha a praia perfeita para sua próxima viagem.</p>
                </div>
                <button onClick={() => setIsAllDestinationsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {allDestinationsList.map((dest, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="group relative h-[350px] rounded-3xl overflow-hidden shadow-xl border border-slate-800"
                    >
                      <img 
                        src={dest.img} 
                        alt={dest.name} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-90" />
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <div className="flex items-center justify-between items-end mb-4">
                          <div>
                            <h3 className="text-2xl font-display font-extrabold text-white">{dest.name}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-brand-pink font-bold text-[10px] uppercase">A partir de</p>
                            <p className="text-xl font-extrabold text-white">{dest.price}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setIsAllDestinationsModalOpen(false);
                            setDestination(dest.value);
                            scrollToSection('reserva');
                          }} 
                          className="w-full bg-white/10 backdrop-blur-md text-white border border-white/20 py-3 rounded-xl font-bold hover:bg-gradient-brand hover:border-transparent transition-all shadow-lg"
                        >
                          Agende sua van
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
