
import { Theme } from './types';

export const BAIRROS = [ "Forte / Canto do Forte", "Tude Bastos / Chico de Paula", "Boqueirao", "Guilhermina", "Aviação", "Tupi", "Tupiry", "Ocian", "Gloria", "Vila Antartica", "Vila Sonia", "Quietude", "Mirim", "Anhanguera", "Maracana", "Ribeiropolis", "Esmeralda", "Samambaia", "Melvi", "Caiçara", "Imperador", "Real", "Princesa", "Florida", "Cidade das Crianças", "Solemar" ];

export const BAIRROS_MIP = [
    "Agenor de Campos", "Balneário Agenor de Campos", "Regina Maria", "Balneário Regina Maria", "Jardim Primavera", "Parque Verde Mar",
    "Balneário Umuarama", "Umuarama", "Balneário Triesse", "Balneário Samas", "Balneário Marinho", "Jardim Santana", "Jardim Leonor",
    "Santa Eugênia", "Balneário Santa Eugênia", "Jussara", "Balneário Jussara", "Flórida Mirim", "Balneário Flórida Mirim", "Parque Marinho",
    "Jardim Marina", "Jardim Samoa", "Jardim Caiahu", "Jardim Guanabara", "Jardim Aguapeú", "Aguapeú", "Itaguaí", "Balneário Itaguaí",
    "Jardim Itaguaí", "Jardim Marabá", "Jardim Luciana", "Jardim Maria Luiza", "Jardim Cascata", "Jardim Silveira", "Plataforma",
    "Balneário Plataforma", "Centro", "Vila Atlântica", "Vila São Paulo", "Vila Seabra", "Vila Arens", "Vila Anhanguera", "Vila Nova",
    "Vila São José", "Vera Cruz", "Vila Vera Cruz", "Balneário Vera Cruz", "Oceanópolis", "Vila Oceanópolis", "Jardim Oceanópolis",
    "Pedreira", "Jardim Santana II", "Chácara São João", "Chácara São José", "Conjunto Mazzeo", "CDHU Vila Atlântica", "Jardim Praia Grande",
    "Jardim Itapoan", "Copacabana Paulista", "Balneário Verde Mar", "Balneário Barigui", "Estância Balneária Barigui", "Balneário Mar e Sol",
    "Balneário Europa", "Balneário Palmeiras", "Itaóca", "Balneário Itaóca", "Balneário Anchieta", "Balneário América", "Balneário Cascais"
];

export const COLORS = ['#f59e0b', '#d97706', '#b45309', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6'];

// LISTA REORGANIZADA: Vaga 22 (Neto) em primeiro lugar.
export const INITIAL_SP_LIST = [
    {id: '22', vaga: '22', name: 'Wash (Neto)'},
    {id: '08', vaga: '08', name: 'Cristina'},
    {id: '16', vaga: '16', name: 'Sergio'},
    {id: '09', vaga: '09', name: 'Wash (Buda)'},
    {id: '13', vaga: '13', name: 'Rafael'},
    {id: '12', vaga: '12', name: 'Del'},
    {id: '07', vaga: '07', name: 'Sistema'},
    {id: '04', vaga: '04', name: 'Martins'},
    {id: '14', vaga: '14', name: 'Wash'},
    {id: '15', vaga: '15', name: 'Julia'},
    {id: '19', vaga: '19', name: 'Carlão'},
    {id: '18', vaga: '18', name: 'Domingos'},
    {id: '05', vaga: '05', name: 'Fernando'},
    {id: '00', vaga: '00', name: 'Topic'},
    {id: '02', vaga: '02', name: 'Cristian'},
    {id: '20', vaga: '20', name: 'Aquiles'},
    {id: '06', vaga: '06', name: 'Bruno'},
    {id: '21', vaga: '21', name: 'Campos'},
    {id: '01', vaga: '01', name: 'Max'},
    {id: '17', vaga: '17', name: 'Max'},
    {id: '10', vaga: '10', name: 'Salles'},
    {id: '11', vaga: '11', name: 'Reginaldo'},
    {id: '03', vaga: '03', name: 'Chaiene'}
];

const DARK_DEFAULTS = {
    inner: 'bg-black/20 border-white/10 text-white',
    ghost: 'hover:bg-white/5',
    divider: 'border-white/10',
    contentBg: 'bg-black/20'
};

export const THEMES: Record<string, Theme> = {
    default: { 
        name: 'Padrão', bg: 'bg-slate-950', card: 'bg-slate-800 border-slate-700', text: 'text-slate-200', primary: 'bg-amber-600 text-white', accent: 'text-amber-400', border: 'border-slate-700', radius: 'rounded-xl', palette: ['#f59e0b', '#d97706', '#fbbf24', '#b45309', '#78350f'],
        ...DARK_DEFAULTS
    },
    wood: { 
        name: 'Rústico (Madeira)', bg: 'bg-[#1a110e]', card: 'bg-[#2e1f18] border-[#4a342a]', text: 'text-[#e6dace]', primary: 'bg-[#8b5a2b] text-white', accent: 'text-[#d4a373]', border: 'border-[#4a342a]', radius: 'rounded-xl', palette: ['#8b5a2b', '#d4a373', '#6f4e37', '#a67b5b', '#c19a6b'],
        ...DARK_DEFAULTS
    },
    dark: { 
        name: 'Escuro Profundo', bg: 'bg-black', card: 'bg-zinc-900 border-zinc-800', text: 'text-zinc-200', primary: 'bg-orange-600 text-white', accent: 'text-orange-400', border: 'border-zinc-800', radius: 'rounded-xl', palette: ['#ea580c', '#f97316', '#fdba74', '#c2410c', '#7c2d12'],
        ...DARK_DEFAULTS
    },
    cyberpunk: { 
        name: 'Cyberpunk', bg: 'bg-[#0b0c15]', card: 'bg-[#181926] border-[#2f3146]', text: 'text-[#e0def4]', primary: 'bg-[#eb6f92] text-white', accent: 'text-[#f6c177]', border: 'border-[#2f3146]', radius: 'rounded-none', palette: ['#eb6f92', '#f6c177', '#9ccfd8', '#c4a7e7', '#31748f'],
        ...DARK_DEFAULTS
    },
    dracula: { 
        name: 'Drácula', bg: 'bg-[#282a36]', card: 'bg-[#44475a] border-[#6272a4]', text: 'text-[#f8f8f2]', primary: 'bg-[#bd93f9] text-[#282a36]', accent: 'text-[#50fa7b]', border: 'border-[#6272a4]', radius: 'rounded-xl', palette: ['#bd93f9', '#50fa7b', '#ff79c6', '#8be9fd', '#ffb86c'],
        ...DARK_DEFAULTS
    },
    solar: { 
        name: 'Solar (Claro)', 
        bg: 'bg-[#f0f2f5]', // Fundo Cinza Claro Moderno
        card: 'bg-white border-gray-200 shadow-sm', 
        text: 'text-slate-600', 
        primary: 'bg-amber-500 text-white', 
        accent: 'text-amber-600', 
        border: 'border-gray-200', 
        radius: 'rounded-2xl', 
        palette: ['#f59e0b', '#d97706', '#ef4444', '#3b82f6', '#10b981'],
        inner: 'bg-gray-50 border-gray-200 text-slate-800 focus:bg-white',
        ghost: 'hover:bg-gray-100 text-slate-600',
        divider: 'border-gray-200',
        contentBg: 'bg-transparent'
    },
    midnight: { 
        name: 'Meia-noite', bg: 'bg-indigo-950', card: 'bg-indigo-900 border-indigo-800', text: 'text-indigo-100', primary: 'bg-cyan-600 text-white', accent: 'text-cyan-300', border: 'border-indigo-700', radius: 'rounded-xl', palette: ['#0891b2', '#06b6d4', '#67e8f9', '#4338ca', '#3730a3'],
        ...DARK_DEFAULTS,
        inner: 'bg-indigo-950/50 border-indigo-800 text-indigo-100'
    },
    forest: { 
        name: 'Floresta', bg: 'bg-green-950', card: 'bg-green-900 border-green-800', text: 'text-green-100', primary: 'bg-emerald-600 text-white', accent: 'text-emerald-400', border: 'border-green-800', radius: 'rounded-xl', palette: ['#059669', '#10b981', '#34d399', '#065f46', '#064e3b'],
        ...DARK_DEFAULTS,
        inner: 'bg-green-950/50 border-green-800 text-green-100'
    },
};

export interface StaticUser {
    username: string;
    pass: string;
    role: string;
    systems: string[];
    createdBy?: string;
    email?: string;
    displayName?: string;
    system?: string;
}

export const USERS_DB: StaticUser[] = [
    { username: 'Gilson', pass: '123456', role: 'admin', systems: ['SV', 'MIP', 'PG'], createdBy: 'Breno' },
];

export const DEFAULT_FOLGAS = {
    'SEGUNDA': [],
    'TERÇA': ['20', '06', '17', '08', '16', '09', '04'],
    'QUARTA': ['18', '05', '00', '02', '10', '11', '22', '12', '15'],
    'QUINTA': ['21', '01', '03', '13', '07', '14', '19'],
    'SEXTA': [],
    'SÁBADO': [],
    'DOMINGO': []
};
