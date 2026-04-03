
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme } from '../types';
import { THEMES, COLORS } from '../constants';
import { formatDisplayDate, parseDisplayDate } from '../utils';

export const Icon = ({ children, size=20, className="" }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{children}</svg>
);

export const LoadingSpinner = ({ size = 24, className = "" }) => (
    <div className={`animate-spin ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    </div>
);

export const EmptyState = ({ icon: IconComp, title, description, action }: any) => (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/5 rounded-2xl border border-white/5">
        {IconComp && <IconComp size={48} className="mb-4 opacity-50" />}
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm opacity-60 mb-6 max-w-xs">{description}</p>
        {action}
    </div>
);

export const PageHeader = ({ title, onBack, children }: any) => (
    <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            {onBack && <IconButton icon={Icons.Back} onClick={onBack} variant="default" />}
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        </div>
        {children}
    </div>
);

export const Icons = {
    History: (p:any) => <Icon {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/><polyline points="12 7 12 12 16 14"/></Icon>,
    Menu: (p:any) => <Icon {...p}><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></Icon>,
    Home: (p:any) => <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></Icon>,
    Users: (p:any) => <Icon {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
    Car: (p:any) => <Icon {...p}><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9"/><path d="M2 12h17a1 1 0 0 0 .9-1.5l-2.4-3.2"/><path d="M2 12v6"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></Icon>,
    Van: (p:any) => <Icon {...p}><rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><line x1="16" y1="8" x2="20" y2="8"/><path d="M16 8h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-6"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></Icon>,
    Map: (p:any) => <Icon {...p}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></Icon>,
    Calendar: (p:any) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Icon>,
    Settings: (p:any) => <Icon {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></Icon>,
    Sliders: (p:any) => <Icon {...p}><line x1="4" x2="20" y1="21" y2="14"/><line x1="4" x2="20" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></Icon>,
    Calculator: (p:any) => <Icon {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></Icon>,
    ShieldAlert: (p:any) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Icon>,
    User: (p:any) => <Icon {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
    Cog: (p:any) => <Icon {...p}><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></Icon>,
    Plus: (p:any) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>,
    Minus: (p:any) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/></Icon>,
    X: (p:any) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>,
    Trash: (p:any) => <Icon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Icon>,
    Copy: (p:any) => <Icon {...p}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></Icon>,
    Phone: (p:any) => <Icon {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></Icon>,
    Edit: (p:any) => <Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>,
    Refresh: (p:any) => <Icon {...p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></Icon>,
    Check: (p:any) => <Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>,
    HelpCircle: (p:any) => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>,
    Back: (p:any) => <Icon {...p}><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></Icon>,
    Send: (p:any) => <Icon {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></Icon>,
    Key: (p:any) => <Icon {...p}><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></Icon>,
    Zap: (p:any) => <Icon {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Icon>,
    Download: (p:any) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></Icon>,
    Upload: (p:any) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></Icon>,
    Mic: (p:any) => <Icon {...p}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></Icon>,
    Stop: (p:any) => <Icon {...p}><rect x="9" y="9" width="6" height="6"/></Icon>,
    Stars: (p:any) => <Icon {...p}><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></Icon>,
    ChevronLeft: (p:any) => <Icon {...p}><polyline points="15 18 9 12 15 6" /></Icon>,
    ChevronRight: (p:any) => <Icon {...p}><polyline points="9 18 15 12 9 6" /></Icon>,
    ChevronDown: (p:any) => <Icon {...p}><polyline points="6 9 12 15 18 9" /></Icon>,
    ChevronUp: (p:any) => <Icon {...p}><polyline points="18 15 12 9 6 15" /></Icon>,
    Search: (p:any) => <Icon {...p}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></Icon>,
    Dollar: (p:any) => <Icon {...p}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></Icon>,
    Clipboard: (p:any) => <Icon {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></Icon>,
    Box: (p:any) => <Icon {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></Icon>,
    Repeat: (p:any) => <Icon {...p}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></Icon>,
    Lock: (p:any) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></Icon>,
    LogOut: (p:any) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></Icon>,
    Shield: (p:any) => <Icon {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>,
    List: (p:any) => <Icon {...p}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></Icon>,
    Bold: (p:any) => <Icon {...p}><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></Icon>,
    Italic: (p:any) => <Icon {...p}><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></Icon>,
    CheckCircle: (p:any) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></Icon>,
    Edit3: (p:any) => <Icon {...p}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></Icon>,
    ArrowUp: (p:any) => <Icon {...p}><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></Icon>,
    ArrowDown: (p:any) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></Icon>,
    ArrowLeft: (p:any) => <Icon {...p}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></Icon>,
    Moon: (p:any) => <Icon {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></Icon>,
    Sun: (p:any) => <Icon {...p}><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></Icon>,
    CalendarX: (p:any) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="10" y1="14" x2="14" y2="18"/><line x1="14" y1="14" x2="10" y2="18"/></Icon>,
    Message: (p:any) => <Icon {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></Icon>,
    Clock: (p:any) => <Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>,
    Print: (p:any) => <Icon {...p}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></Icon>,
    Slash: (p:any) => <Icon {...p}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></Icon>,
    Bell: (p:any) => <Icon {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></Icon>,
    Volume2: (p:any) => <Icon {...p}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></Icon>,
    GripVertical: (p:any) => <Icon {...p}><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></Icon>,
    Command: (p:any) => <Icon {...p}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></Icon>,
    CloudRain: (p:any) => <Icon {...p}><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></Icon>,
    CloudSun: (p:any) => <Icon {...p}><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></Icon>,
    CloudMoon: (p:any) => <Icon {...p}><path d="M10.188 8.5A6 6 0 0 1 20.922 13.5"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></Icon>,
    CloudDrizzle: (p:any) => <Icon {...p}><line x1="8" y1="19" x2="8" y2="21"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="16" y1="19" x2="16" y2="21"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></Icon>,
    CloudSnow: (p:any) => <Icon {...p}><path d="M4 15.25A8 8 0 1 1 16.74 7H18a5 5 0 0 1 2 9.58"/><line x1="8" y1="19" x2="8.01" y2="19"/><line x1="12" y1="21" x2="12.01" y2="21"/><line x1="16" y1="19" x2="16.01" y2="19"/></Icon>,
    CloudLightning: (p:any) => <Icon {...p}><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 11 17 15 17 13 23"/></Icon>,
    Cloud: (p:any) => <Icon {...p}><path d="M17.5 19A4.5 4.5 0 0 0 22 14.5a4.5 4.5 0 0 0-4.5-4.5H16.2a7 7 0 1 0-11.7 4.2"/><path d="M16 19h.5a4.5 4.5 0 0 0 0-9H16a7 7 0 1 0-11.7 4.2"/></Icon>,
    Image: (p:any) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Icon>,
    Fingerprint: (p:any) => <Icon {...p}><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 6" /><path d="M5 15.73A6 6 0 0 1 5 12a7 7 0 0 1 14 0 6 6 0 0 1-1.35 3.73" /><path d="M8.2 18.2A3 3 0 0 1 8 16.5c0-1.66 1.34-3 3-3 .2 0 .39.02.58.05" /><path d="M16.5 12.5a4.5 4.5 0 0 0-9 0 3 3 0 0 0 3 3" /><path d="M12 21v-1" /></Icon>,
    Laptop: (p:any) => <Icon {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="2" y1="20" x2="22" y2="20" /></Icon>,
    Smartphone: (p:any) => <Icon {...p}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></Icon>,
    AlertTriangle: (p:any) => <Icon {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></Icon>,
    QrCode: (p:any) => <Icon {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><line x1="7" y1="7" x2="7" y2="7"/><line x1="9" y1="9" x2="9" y2="9"/><line x1="15" y1="15" x2="15" y2="15"/></Icon>,
    CreditCard: (p:any) => <Icon {...p}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Icon>,
    Unlock: (p:any) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></Icon>,
    Bus: (p:any) => <Icon {...p}><rect x="3" y="6" width="18" height="11" rx="2" /><path d="M14 17v3" /><path d="M10 17v3" /><path d="M2 12h20" /><path d="M6 12v-2" /><path d="M18 12v-2" /></Icon>,
    PlayCircle: (p:any) => <Icon {...p}><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></Icon>,
    DollarSign: (p:any) => <Icon {...p}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Icon>,
    Instagram: (p:any) => <Icon {...p}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></Icon>,
    Facebook: (p:any) => <Icon {...p}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></Icon>,
    Twitter: (p:any) => <Icon {...p}><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" /></Icon>,
    Mail: (p:any) => <Icon {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></Icon>,
    ArrowRight: (p:any) => <Icon {...p}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></Icon>,
    ArrowRightLeft: (p:any) => <Icon {...p}><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></Icon>,
    Screenshot: (p:any) => <Icon {...p}><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><polyline points="16 3 21 3 21 8"/><line x1="14" y1="10" x2="21" y2="3"/></Icon>
};

export const Button = ({ onClick, children, theme, variant='primary', icon:IconComp, disabled, loading, className='', size='md', id='' }: any) => {
    let baseClass = `${theme?.radius || 'rounded-xl'} font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm `;
    
    if (size === 'sm') baseClass += 'px-3 py-1.5 text-xs ';
    else if (size === 'lg') baseClass += 'px-6 py-3 text-lg ';
    else baseClass += 'px-4 py-2 text-sm ';

    if (disabled || loading) baseClass += 'opacity-50 cursor-not-allowed ';
    else baseClass += 'hover:opacity-90 ';

    if (variant === 'primary') baseClass += theme ? theme.primary : 'bg-blue-600 text-white';
    else if (variant === 'secondary') baseClass += 'bg-white/10 hover:bg-white/20 text-white';
    else if (variant === 'success') baseClass += 'bg-green-600 text-white hover:bg-green-500';
    else if (variant === 'danger') baseClass += 'bg-red-500/20 text-red-400 hover:bg-red-500/30';
    else if (variant === 'default') baseClass += 'bg-black/20 text-white hover:bg-black/30 border border-white/10';

    return (
        <button id={id} className={`${baseClass} ${className}`} onClick={onClick} disabled={disabled || loading}>
            {loading ? <LoadingSpinner size={size === 'sm' ? 14 : 18} /> : (IconComp && <IconComp size={size === 'sm' ? 14 : (size === 'lg' ? 24 : 18)} />)}
            {children}
        </button>
    );
};

export const IconButton = ({ onClick, icon:IconComp, theme, variant='default', className='', title, disabled, size=20 }: any) => {
    let baseClass = `p-2 rounded-lg transition-all active:scale-90 flex items-center justify-center `;
    if (variant === 'danger') baseClass += 'bg-red-500/10 text-red-400 hover:bg-red-500/20';
    else if (variant === 'success') baseClass += 'bg-green-500/10 text-green-400 hover:bg-green-500/20';
    else if (variant === 'primary') baseClass += 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20';
    else baseClass += 'bg-white/5 hover:bg-white/10 text-white';

    if (disabled) baseClass += ' opacity-50 cursor-not-allowed';

    return (
        <button className={`${baseClass} ${className}`} onClick={onClick} title={title} disabled={disabled}>
            <IconComp size={size} />
        </button>
    );
};

export const Input = ({ label, value, onChange, type='text', placeholder, theme, themeKey, autoFocus, onFocus, onBlur, autoCapitalize, mask, maxLength, speech }: any) => {
    // If theme not provided but themeKey is, get from THEMES
    const t = theme || (themeKey ? THEMES[themeKey] : THEMES.default);
    
    const [localValue, setLocalValue] = useState(value);
    const [isListening, setIsListening] = useState(false);

    const handleSpeech = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Seu navegador não suporta reconhecimento de voz.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            // Capitalize first letter
            const formatted = transcript.charAt(0).toUpperCase() + transcript.slice(1);
            setLocalValue(formatted);
            onChange({ target: { value: formatted } });
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    useEffect(() => {
        if (mask === 'date' && value && value.includes('-')) {
            setLocalValue(formatDisplayDate(value));
        } else if (mask === 'cpf' && value) {
            let v = value.replace(/\D/g, '');
            if (v.length > 11) v = v.substr(0, 11);
            if (v.length > 9) {
                v = v.substr(0, 3) + '.' + v.substr(3, 3) + '.' + v.substr(6, 3) + '-' + v.substr(9);
            } else if (v.length > 6) {
                v = v.substr(0, 3) + '.' + v.substr(3, 3) + '.' + v.substr(6);
            } else if (v.length > 3) {
                v = v.substr(0, 3) + '.' + v.substr(3);
            }
            setLocalValue(v);
        } else {
            setLocalValue(value);
        }
    }, [value, mask]);

    const handleChange = (e: any) => {
        let v = e.target.value;
        
        if (mask === 'time') {
            v = v.replace(/\D/g, ''); // Remove non-digits
            if (v.length > 4) v = v.substr(0, 4);
            
            if (v.length > 2) {
                v = v.substr(0, 2) + ':' + v.substr(2);
            }
            setLocalValue(v);
            onChange({ target: { value: v } });
        } else if (mask === 'cpf') {
            v = v.replace(/\D/g, ''); // Remove non-digits
            if (v.length > 11) v = v.substr(0, 11);
            
            if (v.length > 9) {
                v = v.substr(0, 3) + '.' + v.substr(3, 3) + '.' + v.substr(6, 3) + '-' + v.substr(9);
            } else if (v.length > 6) {
                v = v.substr(0, 3) + '.' + v.substr(3, 3) + '.' + v.substr(6);
            } else if (v.length > 3) {
                v = v.substr(0, 3) + '.' + v.substr(3);
            }
            
            setLocalValue(v);
            onChange({ target: { value: v } });
        } else if (mask === 'date') {
            v = v.replace(/\D/g, ''); // Remove non-digits
            if (v.length > 8) v = v.substr(0, 8);
            
            if (v.length > 4) {
                v = v.substr(0, 2) + '/' + v.substr(2, 2) + '/' + v.substr(4);
            } else if (v.length > 2) {
                v = v.substr(0, 2) + '/' + v.substr(2);
            }
            
            setLocalValue(v);
            
            if (v.length === 10) {
                const parsed = parseDisplayDate(v);
                if (parsed) onChange({ target: { value: parsed } });
                else onChange({ target: { value: '' } }); // Invalid date
            } else {
                // While typing, we don't update the parent with invalid date, 
                // OR we update with empty string to prevent saving partial date
                // But we need to keep the parent in sync if they rely on it for validation
                // Let's send empty string until complete
                 onChange({ target: { value: '' } });
            }
        } else {
            setLocalValue(v);
            onChange(e);
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            {label && <label className="text-xs font-bold opacity-60 ml-1">{label}</label>}
            <div className="relative">
                <input 
                    type={type} 
                    lang="pt-BR"
                    className={`${t.inner || 'bg-black/20'} ${t.border || 'border border-white/10'} ${t.radius || 'rounded-xl'} px-4 py-3 text-sm outline-none focus:border-amber-500 transition-colors w-full ${speech ? 'pr-12' : ''}`}
                    value={localValue} 
                    onChange={handleChange} 
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    autoCapitalize={autoCapitalize}
                    maxLength={maxLength}
                />
                {speech && (
                    <button 
                        type="button"
                        onClick={handleSpeech}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                        title="Falar para preencher"
                    >
                        <Icons.Mic size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

export const ClockWidget = ({ theme }: any) => {
    const [time, setTime] = useState(new Date());
    
    useEffect(() => {
        const int = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(int);
    }, []);

    const h = time.getHours().toString().padStart(2, '0');
    const m = time.getMinutes().toString().padStart(2, '0');
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const dateStr = `${weekdays[time.getDay()]}, ${time.getDate()} ${months[time.getMonth()]}`;

    return (
        <div className={`${theme.card} p-3 sm:p-4 rounded-2xl border ${theme.border} flex flex-col justify-center items-center text-center text-white relative z-30 min-h-[100px] w-full`} style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
            <div className="text-2xl sm:text-3xl font-black tracking-tighter leading-none text-white">
                {h}:{m}
            </div>
            <div className="text-[10px] sm:text-xs opacity-80 uppercase font-bold tracking-wider mt-2 leading-tight text-white/90">
                {dateStr}
            </div>
        </div>
    );
};

export const WeatherWidget = ({ theme, location }: any) => {
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const coords: any = {
            'PG': { lat: -24.005, lon: -46.408, name: 'Praia Grande' },
            'SV': { lat: -23.963, lon: -46.391, name: 'São Vicente' },
            'Mongaguá': { lat: -24.113, lon: -46.621, name: 'Mongaguá' }
        };
        const loc = coords[location] || coords['PG'];
        
        const fetchWeather = () => {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,is_day,weather_code`)
                .then(res => res.json())
                .then(data => {
                    setWeather(data.current);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 30 * 60 * 1000); // 30 min
        return () => clearInterval(interval);
    }, [location]);

    if (loading) return (
        <div className={`${theme.card} p-3 sm:p-4 rounded-2xl border ${theme.border} flex flex-col justify-center items-center min-h-[100px] h-full text-center text-white w-full`} style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
            <LoadingSpinner size={24} className="text-white opacity-70" />
            <span className="text-[8px] font-bold uppercase mt-2 opacity-50">Carregando...</span>
        </div>
    );
    
    if (!weather) return (
        <div className={`${theme.card} p-3 sm:p-4 rounded-2xl border ${theme.border} flex flex-col justify-center items-center min-h-[100px] h-full text-center text-white w-full opacity-60`} style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
            <Icons.Cloud size={24} className="mb-1 text-white" />
            <span className="text-[8px] font-bold uppercase text-white">Sem Dados</span>
        </div>
    );

    const getWeatherInfo = (code: number, isDay: number) => {
        // WMO Weather interpretation codes (WW)
        if (code === 0) return { 
            icon: isDay ? <Icons.Sun size={32} className="text-amber-400"/> : <Icons.Moon size={32} className="text-blue-200"/>, 
            label: isDay ? 'Ensolarado' : 'Céu Limpo' 
        };
        if (code <= 3) return { 
            icon: isDay ? <Icons.CloudSun size={32} className="text-gray-400"/> : <Icons.CloudMoon size={32} className="text-blue-300"/>, 
            label: 'Parcialmente Nublado' 
        };
        if (code <= 48) return { icon: <Icons.Cloud size={32} className="text-gray-500"/>, label: 'Neblina' };
        if (code <= 57) return { icon: <Icons.CloudDrizzle size={32} className="text-blue-300"/>, label: 'Garoa' };
        if (code <= 67) return { icon: <Icons.CloudRain size={32} className="text-blue-500"/>, label: 'Chuvoso' };
        if (code <= 77) return { icon: <Icons.CloudSnow size={32} className="text-white"/>, label: 'Neve' };
        if (code <= 82) return { icon: <Icons.CloudRain size={32} className="text-blue-600"/>, label: 'Pancadas de Chuva' };
        if (code <= 86) return { icon: <Icons.CloudSnow size={32} className="text-white"/>, label: 'Nevasca' };
        return { icon: <Icons.CloudLightning size={32} className="text-yellow-500"/>, label: 'Tempestade' };
    };

    const info = getWeatherInfo(weather.weather_code, weather.is_day);
    
    return (
        <div className={`${theme.card} p-3 sm:p-4 rounded-2xl border ${theme.border} flex flex-col justify-center items-center relative overflow-hidden group text-center text-white z-30 min-h-[100px] w-full`} style={{ WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="mb-1 shrink-0 flex items-center justify-center text-white">
                {info.icon}
            </div>
            <div className="text-[10px] sm:text-xs font-bold opacity-100 leading-tight w-full text-white">
                {location}
            </div>
            <div className="text-[9px] sm:text-[10px] opacity-80 mt-1 leading-tight w-full text-white/90">
                {weather.temperature_2m}°C • {info.label}
            </div>
        </div>
    );
};

export const PersistentNotifications = ({ notifications, onClose }: any) => {
    return (
        <div className="fixed top-24 left-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {notifications.map((n: any) => (
                    <motion.div 
                        key={n.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 50, scale: 0.9 }}
                        className="bg-amber-500/90 backdrop-blur-xl text-white p-4 rounded-[24px] flex justify-between items-center shadow-2xl border border-white/10 pointer-events-auto max-w-md ml-auto"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                <Icons.AlertTriangle size={16} />
                            </div>
                            <span className="text-sm font-bold leading-tight">{n.message}</span>
                        </div>
                        <button onClick={() => onClose(n.id)} className="ml-4 hover:bg-white/10 p-2 rounded-xl transition-colors">
                            <Icons.X size={18} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export const Toast = ({ message, type, visible, image }: any) => {
    return (
        <AnimatePresence>
            {visible && (
                <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
                    <motion.div 
                        initial={{ opacity: 0, y: -40, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -40, scale: 0.8 }}
                        className="pointer-events-auto px-6 py-4 rounded-[32px] shadow-2xl flex items-center gap-4 text-white font-bold text-sm backdrop-blur-2xl border border-white/10 min-w-[300px] max-w-full"
                        style={{
                            background: type === 'success' ? 'rgba(16, 185, 129, 0.85)' : 
                                        type === 'error' ? 'rgba(239, 68, 68, 0.85)' : 
                                        type === 'warning' ? 'rgba(245, 158, 11, 0.85)' :
                                        'rgba(59, 130, 246, 0.85)',
                            boxShadow: type === 'success' ? '0 20px 40px -10px rgba(16, 185, 129, 0.3)' :
                                       type === 'error' ? '0 20px 40px -10px rgba(239, 68, 68, 0.3)' :
                                       type === 'warning' ? '0 20px 40px -10px rgba(245, 158, 11, 0.3)' :
                                       '0 20px 40px -10px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
                            {image ? (
                                <img src={image} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <>
                                    {type === 'success' && <Icons.CheckCircle size={22}/>}
                                    {type === 'error' && <Icons.X size={22}/>}
                                    {type === 'warning' && <Icons.Bell size={22}/>}
                                    {type === 'info' && <Icons.Bell size={22}/>}
                                </>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mb-0.5 font-black">Sistema</p>
                            <p className="text-sm leading-tight font-black">{message}</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type='danger', theme }: any) => {
    const t = theme || THEMES.default;
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`${t.card} w-full max-w-sm p-8 rounded-[40px] border ${t.border} shadow-2xl relative overflow-hidden`}
                    >
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 blur-3xl rounded-full"></div>
                        
                        <div className="relative z-10">
                            <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mb-6 ${type === 'danger' ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/10' : 'bg-blue-500/20 text-blue-500 shadow-lg shadow-blue-500/10'}`}>
                                {type === 'danger' ? <Icons.Trash size={32}/> : <Icons.Bell size={32}/>}
                            </div>
                            <h3 className="text-2xl font-black tracking-tight mb-3">{title}</h3>
                            <p className="text-sm opacity-60 mb-8 leading-relaxed font-medium">{message}</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={onCancel} 
                                    className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 font-black text-sm transition-all active:scale-95 border border-white/5"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={onConfirm} 
                                    className={`flex-1 py-4 rounded-2xl font-black text-sm text-white shadow-xl transition-all active:scale-95 ${type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export const AlertModal = ({ isOpen, title, message, onClose, theme, type='warning' }: any) => {
    const t = theme || THEMES.default;
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`${t.card} w-full max-w-sm p-8 rounded-[40px] border ${t.border} shadow-2xl relative overflow-hidden`}
                    >
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 blur-3xl rounded-full"></div>
                        
                        <button onClick={onClose} className="absolute top-6 right-6 opacity-40 hover:opacity-100 transition-opacity p-2 hover:bg-white/5 rounded-xl">
                            <Icons.X size={20}/>
                        </button>
                        
                        <div className="relative z-10">
                            <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center mb-6 ${type === 'danger' ? 'bg-red-500/20 text-red-500 shadow-lg shadow-red-500/10' : 'bg-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10'}`}>
                                {type === 'danger' ? <Icons.AlertTriangle size={32}/> : <Icons.Bell size={32}/>}
                            </div>
                            <h3 className="text-2xl font-black tracking-tight mb-3">{title}</h3>
                            <p className="text-sm opacity-60 mb-8 leading-relaxed font-medium">{message}</p>
                            <button 
                                onClick={onClose} 
                                className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-xl transition-all active:scale-95 ${type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'}`}
                            >
                                Entendi
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export const AdminAuthModal = ({ isOpen, onClose, onAuth, theme, users }: any) => {
    const [user, setUser] = useState('');
    const [pass, setPass] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;
    const t = theme || THEMES.default;

    const handleAuth = () => {
        const admin = (users || []).find((u: any) => 
            u.username.toLowerCase() === user.toLowerCase() && 
            u.pass === pass && 
            u.role === 'admin'
        );

        if (admin) {
            onAuth();
            setUser('');
            setPass('');
            setError('');
        } else {
            setError('Usuário ou senha de administrador incorretos.');
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`${t.card} w-full max-w-sm p-6 rounded-2xl border ${t.border} shadow-2xl relative`}>
                <button onClick={onClose} className="absolute top-4 right-4 opacity-40 hover:opacity-100 transition-opacity">
                    <Icons.X size={20}/>
                </button>
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
                    <Icons.Lock size={24}/>
                </div>
                <h3 className="text-xl font-bold mb-2">Autorização Coordenação</h3>
                <p className="text-sm opacity-70 mb-6 leading-relaxed">
                    Comportamento estranho detectado. Para continuar excluindo dados, é necessária a autorização da coordenação.
                </p>
                
                <div className="space-y-4 mb-6">
                    <Input 
                        label="Usuário Coordenação" 
                        value={user} 
                        onChange={(e:any) => setUser(e.target.value)} 
                        placeholder="Nome do usuário"
                        theme={t}
                    />
                    <Input 
                        label="Senha" 
                        type="password"
                        value={pass} 
                        onChange={(e:any) => setPass(e.target.value)} 
                        placeholder="Senha do admin"
                        theme={t}
                    />
                    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleAuth}
                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-transform active:scale-95"
                    >
                        Autorizar
                    </button>
                </div>
            </div>
        </div>
    );
};

export const CommandPalette = ({ isOpen, onClose, theme, actions }: any) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) setTimeout(() => inputRef.current.focus(), 100);
    }, [isOpen]);

    if (!isOpen) return null;
    
    const filtered = actions.filter((a:any) => a.label.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
            <div className={`${theme.card} w-full max-w-lg rounded-xl border ${theme.border} shadow-2xl overflow-hidden flex flex-col max-h-[60vh]`} onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <Icons.Search className="opacity-50"/>
                    <input 
                        ref={inputRef}
                        className="bg-transparent outline-none w-full text-lg placeholder-white/30"
                        placeholder="O que você precisa?"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <div className="text-[10px] font-bold border border-white/10 rounded px-1.5 py-0.5 opacity-50">ESC</div>
                </div>
                <div className="overflow-y-auto p-2">
                    {filtered.map((action:any, i:number) => (
                        <button 
                            key={action.label} 
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/10 group transition-colors"
                            onClick={() => { action.action(); onClose(); }}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-md bg-${action.color || 'gray-500'}/20 text-${action.color || 'gray-400'}`}>
                                    {action.icon}
                                </div>
                                <span className="font-medium">{action.label}</span>
                            </div>
                            {action.shortcut && <span className="text-xs font-mono opacity-40 border border-white/10 px-1 rounded">{action.shortcut}</span>}
                        </button>
                    ))}
                    {filtered.length === 0 && <div className="p-4 text-center opacity-40 text-sm">Nada encontrado.</div>}
                </div>
            </div>
        </div>
    );
};

export const QuickCalculator = ({ isOpen, onClose, theme }: any) => {
    const [expr, setExpr] = useState('');

    if (!isOpen) return null;

    const handleBtn = (v: string) => {
        if (v === 'C') setExpr('');
        else if (v === '=') {
            try {
                // eslint-disable-next-line no-eval
                setExpr(eval(expr).toString());
            } catch {
                setExpr('Erro');
            }
        } else {
            setExpr(prev => prev + v);
        }
    };

    const btns = ['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'];

    return (
        <motion.div 
            drag
            dragMomentum={false}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`fixed top-20 right-4 z-[10000] ${theme.card} w-72 p-4 rounded-2xl border ${theme.border} shadow-2xl cursor-default`}
            style={{ touchAction: 'none' }}
        >
            <div className="flex justify-between items-center mb-2 cursor-move select-none">
                <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest flex items-center gap-1">
                    <Icons.Calculator size={12}/> Calculadora
                </span>
                <button onClick={onClose} className="opacity-40 hover:opacity-100 transition-opacity p-1">
                    <Icons.X size={16}/>
                </button>
            </div>
            <div 
                className="bg-black/40 rounded-xl p-4 mb-4 text-right text-2xl font-mono overflow-x-auto whitespace-nowrap select-text cursor-default"
                onPointerDown={e => e.stopPropagation()}
            >
                {expr || '0'}
            </div>
            <div className="grid grid-cols-4 gap-2" onPointerDown={e => e.stopPropagation()}>
                {btns.map(b => (
                    <button 
                        key={b} 
                        onClick={() => handleBtn(b)}
                        className={`p-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors ${b === '=' ? 'bg-amber-600 text-white col-span-1' : 'bg-white/5'}`}
                    >
                        {b}
                    </button>
                ))}
            </div>
        </motion.div>
    );
};
