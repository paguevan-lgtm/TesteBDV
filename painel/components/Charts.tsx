import React, { useState, useEffect } from 'react';
import { THEMES, COLORS } from '../constants';

export const DonutChart = ({ data, theme }: any) => {
    const t = theme || THEMES.default;
    // Usa a paleta do tema ou cai para as cores padrão
    const palette = t.palette || COLORS;
    
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

    const total = data.reduce((a: number, b: any) => a + b.value, 0);
    let accumulatedCircumference = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius; // aprox 251.32

    return (
        <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                    {data.map((d: any, i: number) => {
                        const percentage = total > 0 ? d.value / total : 0;
                        const strokeDasharray = `${percentage * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedCircumference;
                        accumulatedCircumference += percentage * circumference;
                        
                        return (
                            <circle
                                key={d.label}
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="transparent"
                                stroke={palette[i % palette.length]}
                                strokeWidth="15"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                style={{
                                    transition: 'stroke-dasharray 1s ease-out, stroke 0.5s ease',
                                    strokeDasharray: mounted ? strokeDasharray : `0 ${circumference}`
                                }}
                            />
                        );
                    })}
                </svg>
                    <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none`}>
                    <span className="text-2xl font-bold">{total}</span>
                    <span className="text-[10px] opacity-60 uppercase">Total</span>
                </div>
            </div>
            <div className="flex flex-col gap-2 w-full">
                {data.map((d: any, i: number) => (
                    <div key={d.label} className="flex items-center gap-2 text-xs w-full">
                        <div className="w-3 h-3 rounded-full flex-shrink-0 transition-colors duration-500" style={{ backgroundColor: palette[i % palette.length] }} />
                        <span className="opacity-70 truncate flex-1">{d.label}</span>
                        <span className="font-bold">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const HorizontalBarChart = ({ data, theme }: any) => {
    const t = theme || THEMES.default;
    // Usa a paleta do tema ou cai para as cores padrão
    const palette = t.palette || COLORS;

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

    const max = Math.max(...data.map((d:any)=>d.value)) || 1;
    return (
        <div className="flex flex-col gap-3">
            {data.map((d: any, i: number) => (
                <div key={d.label} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs opacity-70">
                        <span>{d.label}</span>
                        <span className="font-bold">{d.value}</span>
                    </div>
                    <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                        <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{
                                width: mounted ? `${(d.value/max)*100}%` : '0%', 
                                backgroundColor: palette[i % palette.length]
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};