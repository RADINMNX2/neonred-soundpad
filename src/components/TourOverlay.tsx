
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface TourStep {
  targetId: string;
  titleKey: string;
  descKey: string;
}

interface TourOverlayProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onStepChange?: (index: number) => void;
}

const TourOverlay: React.FC<TourOverlayProps> = ({ steps, isOpen, onClose, onStepChange }) => {
  const { t, isRTL } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  // Update target rect when step changes or resize
  const updateRect = () => {
    const step = steps[currentStep];
    if (!step) return;
    
    // Slight delay to allow DOM updates (page switching)
    setTimeout(() => {
        const element = document.getElementById(step.targetId);
        if (element) {
          setTargetRect(element.getBoundingClientRect());
        } else {
            // If element not found immediately, retry once more after a longer delay (animation frame)
            setTimeout(() => {
                 const el = document.getElementById(step.targetId);
                 if (el) setTargetRect(el.getBoundingClientRect());
            }, 300);
        }
    }, 100);
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateRect();
      window.addEventListener('resize', updateRect);
      return () => window.removeEventListener('resize', updateRect);
    }
  }, [currentStep, isOpen, steps]);

  if (!isOpen) return null;

  const stepData = steps[currentStep];

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      {/* 
         Blackout Overlay with "Spotlight" effect using CSS Mask or massive box-shadow.
         Using 4 divs approach is safer for stacking contexts in React.
         Actually, let's use the svg mask approach for smooth rounded spotlight.
      */}
      
      {/* 1. Full Screen Click Handler (Next Step) */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-all duration-500 cursor-pointer"
        onClick={handleNext}
      >
          {/* Masking logic via SVG for smooth spotlight hole */}
          {targetRect && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none fill-black/60">
                <defs>
                    <mask id="tour-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <rect 
                            x={targetRect.left - 8} 
                            y={targetRect.top - 8} 
                            width={targetRect.width + 16} 
                            height={targetRect.height + 16} 
                            rx="12" 
                            fill="black" 
                        />
                    </mask>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" mask="url(#tour-mask)" />
            </svg>
          )}
      </div>

      {/* 2. Spotlight Border (Visual only) */}
      {targetRect && (
          <div 
            className="absolute border-2 border-red-500 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse-slow pointer-events-none transition-all duration-500 ease-out"
            style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
            }}
          ></div>
      )}

      {/* 3. Info Card */}
      {targetRect && (
        <div 
            className="absolute transition-all duration-500 ease-out"
            style={{
                // Auto position logic: If target is in bottom half, put card above. Else below.
                top: targetRect.top > window.innerHeight / 2 
                     ? targetRect.top - 20 
                     : targetRect.bottom + 20,
                left: Math.min(Math.max(20, targetRect.left), window.innerWidth - 340), // Clamp inside screen
                transform: targetRect.top > window.innerHeight / 2 ? 'translateY(-100%)' : 'translateY(0)',
            }}
            onClick={(e) => e.stopPropagation()} // Prevent bg click
        >
            <div className="w-80 bg-zinc-900/90 border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl animate-slide-up relative overflow-hidden group">
                
                {/* Neon Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-pink-600"></div>
                <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-red-600/20 blur-[40px] rounded-full pointer-events-none"></div>

                {/* Content */}
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider">
                            Step {currentStep + 1} / {steps.length}
                         </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2 font-persian">{(t as any)(stepData.titleKey)}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed mb-6 font-persian">{(t as any)(stepData.descKey)}</p>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between">
                        {currentStep > 0 ? (
                            <button 
                                onClick={handlePrev}
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <ArrowLeft size={18} className={isRTL ? "rotate-180" : ""} />
                            </button>
                        ) : <div></div>}

                        <button 
                            onClick={(e) => handleNext(e)}
                            className="px-4 py-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 text-sm shadow-lg active:scale-95 font-persian"
                        >
                            {currentStep === steps.length - 1 ? (t as any)('endTour') : (t as any)('next')}
                            {currentStep !== steps.length - 1 && <ArrowRight size={14} className={isRTL ? "rotate-180" : ""} />}
                        </button>
                    </div>
                </div>

            </div>
            
            {/* Click to continue hint */}
            <div className="mt-2 text-center">
                <span className="text-[10px] text-white/50 uppercase tracking-widest animate-pulse">
                    {(t as any)('clickToContinue')}
                </span>
            </div>
        </div>
      )}

      {/* 4. Global Skip Button (Top Right) */}
      <button 
        onClick={onClose}
        className="fixed top-6 right-6 z-[10000] px-4 py-2 bg-black/40 border border-white/10 rounded-full text-gray-400 hover:text-white hover:border-red-500/50 hover:bg-black/60 transition-all backdrop-blur-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider group"
      >
         <span>{(t as any)('skipTour')}</span>
         <X size={14} className="group-hover:text-red-500 transition-colors" />
      </button>

    </div>
  );
};

export default TourOverlay;
