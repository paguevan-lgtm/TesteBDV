
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Shared';

export const TourGuide = ({ steps, currentStep, onNext, onPrev, onClose, theme }: any) => {
    const [targetRect, setTargetRect] = useState<any>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [arrowPos, setArrowPos] = useState<any>({});
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipHeight, setTooltipHeight] = useState(250);
    const tooltipRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (tooltipRef.current) {
            const observer = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    setTooltipHeight(entry.contentRect.height + 48); // + padding
                }
            });
            observer.observe(tooltipRef.current);
            return () => observer.disconnect();
        }
    }, [isVisible]);

    useEffect(() => {
        const step = steps[currentStep];
        if (!step) return;
        
        const findTarget = (retryCount = 0) => {
            if (!step.target) {
                setTargetRect(null);
                setPosition({ 
                    top: window.innerHeight / 2 - 150, 
                    left: window.innerWidth / 2 - (Math.min(320, window.innerWidth * 0.9) / 2) 
                });
                setArrowPos(null);
                setIsVisible(true);
                return;
            }

            const targets = document.querySelectorAll(step.target);
            let target: any = null;
            const isMobile = window.innerWidth < 768;

            for (let t of targets) {
                const r = t.getBoundingClientRect();
                const style = window.getComputedStyle(t);
                if (r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
                    target = t;
                    break;
                }
            }

            if (target) {
                const rect = target.getBoundingClientRect();
                const style = window.getComputedStyle(target);
                const borderRadius = style.borderRadius || '8px';
                const padding = isMobile ? 2 : 4; 
                const currentTargetRect = {
                    top: rect.top - padding,
                    left: rect.left - padding,
                    width: rect.width + (padding * 2),
                    height: rect.height + (padding * 2),
                    bottom: rect.bottom + padding,
                    right: rect.right + padding,
                    borderRadius
                };
                setTargetRect(currentTargetRect);

                const tooltipWidth = Math.min(320, window.innerWidth * 0.9);
                const currentTooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : tooltipHeight;

                let tooltipTop = 0;
                let tooltipLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2); 
                let arrow: any = { top: -8, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };

                const spaceAbove = currentTargetRect.top;
                const spaceBelow = window.innerHeight - currentTargetRect.bottom;

                // On mobile, if target is very large, place tooltip at bottom or top fixed
                const isLargeTarget = isMobile && currentTargetRect.height > window.innerHeight * 0.4;

                if (isLargeTarget) {
                    if (spaceBelow > spaceAbove) {
                        tooltipTop = window.innerHeight - currentTooltipHeight - 20;
                    } else {
                        tooltipTop = 20;
                    }
                    arrow = null;
                } else if (step.placement === 'top' || (isMobile && spaceAbove > spaceBelow)) {
                    tooltipTop = currentTargetRect.top - currentTooltipHeight - 20;
                    arrow = { bottom: -8, left: '50%', transform: 'translateX(-50%) rotate(225deg)' };
                    
                    // If it doesn't fit on top, flip to bottom
                    if (tooltipTop < 10 && spaceBelow > currentTooltipHeight + 40) {
                        tooltipTop = currentTargetRect.bottom + 20;
                        arrow = { top: -8, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
                    }
                } else if (step.placement === 'right' && !isMobile && (window.innerWidth - currentTargetRect.right > tooltipWidth + 40)) {
                    tooltipTop = currentTargetRect.top + (currentTargetRect.height / 2) - 60;
                    tooltipLeft = currentTargetRect.right + 20;
                    arrow = { left: -8, top: 20, transform: 'rotate(-45deg)' };
                } else {
                    tooltipTop = currentTargetRect.bottom + 20;
                    arrow = { top: -8, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };
                    
                    // If it doesn't fit on bottom, flip to top
                    if (tooltipTop + currentTooltipHeight > window.innerHeight - 10 && spaceAbove > currentTooltipHeight + 40) {
                        tooltipTop = currentTargetRect.top - currentTooltipHeight - 20;
                        arrow = { bottom: -8, left: '50%', transform: 'translateX(-50%) rotate(225deg)' };
                    }
                }

                // Horizontal bounds
                if (tooltipLeft < 10) tooltipLeft = 10;
                if (tooltipLeft + tooltipWidth > window.innerWidth - 10) {
                    tooltipLeft = window.innerWidth - tooltipWidth - 10;
                }

                // Final vertical safety check - if still out of bounds, center it but avoid target
                if (tooltipTop < 10 || tooltipTop + currentTooltipHeight > window.innerHeight - 10) {
                    // If it overlaps the target, try to push it up or down
                    const targetCenter = currentTargetRect.top + (currentTargetRect.height / 2);
                    const screenCenter = window.innerHeight / 2;
                    
                    if (targetCenter > screenCenter) {
                        // Target is in bottom half, put tooltip in top half
                        tooltipTop = Math.max(10, currentTargetRect.top - currentTooltipHeight - 20);
                        if (tooltipTop < 10) tooltipTop = 10;
                    } else {
                        // Target is in top half, put tooltip in bottom half
                        tooltipTop = Math.min(window.innerHeight - currentTooltipHeight - 10, currentTargetRect.bottom + 20);
                    }
                    arrow = null; // Hide arrow if we had to force position
                }

                // Arrow alignment
                if (arrow && arrow.left === '50%') {
                    const targetCenter = rect.left + rect.width / 2;
                    let arrowLeft = targetCenter - tooltipLeft;
                    arrowLeft = Math.max(20, Math.min(tooltipWidth - 20, arrowLeft));
                    arrow.left = arrowLeft + 'px';
                    arrow.transform = arrow.transform.replace('translateX(-50%)', 'translateX(0)');
                }

                setPosition({ top: tooltipTop, left: tooltipLeft });
                setArrowPos(arrow);
                setIsVisible(true);
                
                if (retryCount === 0) {
                    const isSidebarItem = document.getElementById('sidebar-scroll-container')?.contains(target);
                    
                    if (isSidebarItem) {
                        // Special scroll for sidebar items to ensure they are visible and have space for tooltip
                        const container = document.getElementById('sidebar-scroll-container');
                        if (container) {
                            const containerRect = container.getBoundingClientRect();
                            const targetRect = target.getBoundingClientRect();
                            const relativeTop = targetRect.top - containerRect.top;
                            const targetCenterInContainer = relativeTop + (targetRect.height / 2);
                            const containerCenter = containerRect.height / 2;
                            
                            // Only scroll if it's not already centered (with a small tolerance)
                            if (Math.abs(targetCenterInContainer - containerCenter) > 20) {
                                container.scrollTo({
                                    top: container.scrollTop + relativeTop - (containerRect.height / 2) + (targetRect.height / 2),
                                    behavior: 'smooth'
                                });
                            }
                        }
                    } else if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }

            } else {
                if (retryCount < 40) {
                    setTimeout(() => findTarget(retryCount + 1), 100);
                } else {
                    setTargetRect(null);
                    setPosition({ 
                        top: window.innerHeight / 2 - 100, 
                        left: window.innerWidth / 2 - (Math.min(320, window.innerWidth * 0.9) / 2) 
                    });
                    setArrowPos(null);
                    setIsVisible(true);
                }
            }
        };

        const handleUpdate = () => findTarget();
        const initialTimer = setTimeout(() => handleUpdate(), 100);
        const secondTimer = setTimeout(() => handleUpdate(), 500); // Second check after sidebar animation
        
        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true);
        
        // Listen for sidebar transitions
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar) {
            sidebar.addEventListener('transitionend', handleUpdate);
        }
        
        return () => {
            clearTimeout(initialTimer);
            clearTimeout(secondTimer);
            window.removeEventListener('resize', handleUpdate);
            window.removeEventListener('scroll', handleUpdate, true);
            if (sidebar) {
                sidebar.removeEventListener('transitionend', handleUpdate);
            }
        };
    }, [currentStep, steps, tooltipHeight]);

    const step = steps[currentStep];
    if (!step) return null;

    return (
        <div style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.3s' }}>
            {targetRect && (
                <>
                    <div key="overlay-top" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: targetRect.top, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000 }} />
                    <div key="overlay-bottom" style={{ position: 'fixed', top: targetRect.top + targetRect.height, left: 0, right: 0, bottom: 0, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000 }} />
                    <div key="overlay-left" style={{ position: 'fixed', top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000 }} />
                    <div key="overlay-right" style={{ position: 'fixed', top: targetRect.top, left: targetRect.left + targetRect.width, right: 0, height: targetRect.height, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10000 }} />
                    
                    <div 
                        className="tour-spotlight-border"
                        style={{
                            position: 'fixed',
                            top: targetRect.top,
                            left: targetRect.left,
                            width: targetRect.width,
                            height: targetRect.height,
                            borderRadius: targetRect.borderRadius || '8px',
                            border: '2px solid #f59e0b',
                            boxShadow: '0 0 15px rgba(245, 158, 11, 0.5)',
                            pointerEvents: 'none',
                            zIndex: 10001
                        }}
                    />
                </>
            )}

            <div 
                ref={tooltipRef}
                className={`tour-tooltip ${theme.card} p-5 rounded-2xl border ${theme.border} shadow-2xl flex flex-col gap-3`}
                style={{ 
                    position: 'fixed',
                    top: position.top, 
                    left: position.left,
                    zIndex: 10002,
                    width: Math.min(320, window.innerWidth * 0.9),
                    maxHeight: '80vh',
                    overflowY: 'auto'
                }}
            >
                {targetRect && arrowPos && <div className={`tour-arrow border-l border-t ${theme.border}`} style={arrowPos}></div>}
                
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-xl text-amber-400">{step.title}</h3>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onClose) onClose();
                        }} 
                        className="p-2 -mr-2 -mt-2 opacity-60 hover:opacity-100 text-white hover:text-red-400 hover:bg-white/10 rounded-full transition-all cursor-pointer"
                        title="Fechar Tour"
                    >
                        <Icons.X size={20}/>
                    </button>
                </div>
                
                <p className="text-sm leading-relaxed opacity-90">{step.content}</p>
                
                <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/10">
                    <div className="text-xs font-bold opacity-50 uppercase tracking-widest">
                        Passo {currentStep + 1} de {steps.length}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={onPrev} 
                            disabled={currentStep === 0}
                            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
                        >
                            <Icons.ChevronLeft size={20}/>
                        </button>
                        <button 
                            onClick={currentStep === steps.length - 1 ? onClose : onNext} 
                            className={`${theme.primary} px-4 py-2 rounded-lg text-sm font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2`}
                        >
                            {currentStep === steps.length - 1 ? 'Concluir 🚀' : 'Próximo'} <Icons.ChevronRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
