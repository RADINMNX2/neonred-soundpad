
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Download, Check, Monitor, Mic2, Radio, ChevronDown, Package, Zap, Cpu, Scan, AlertTriangle, Settings2, Gamepad2, SlidersHorizontal, Lightbulb, MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AudioDevice } from '../types';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Device handling props
  micInputDeviceId: string;
  injectorDeviceId: string;
  monitorDeviceId: string;
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  onOpenSelector: (type: 'mic' | 'injector' | 'monitor') => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ 
  isOpen, 
  onClose,
  micInputDeviceId,
  injectorDeviceId,
  monitorDeviceId,
  inputDevices,
  outputDevices,
  onOpenSelector
}) => {
  const { t, isRTL } = useLanguage();
  const [step, setStep] = useState(0);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  
  // Auto-Scan States
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'results'>('idle');
  const [detectedDevices, setDetectedDevices] = useState<{
    mic: AudioDevice | null;
    injector: AudioDevice | null;
    monitor: AudioDevice | null;
  }>({ mic: null, injector: null, monitor: null });

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setInstallStatus('idle');
      setScanState('idle');
    }
  }, [isOpen]);

  const handleInstall = async () => {
    if (window.electronAPI) {
      setInstallStatus('installing');
      try {
        const result = await window.electronAPI.installVBCable();
        if (result.success) {
          setInstallStatus('success');
        } else {
          setInstallStatus('error');
          console.error(result.error);
        }
      } catch (e) {
        setInstallStatus('error');
      }
    }
  };

  const performAutoScan = () => {
    setScanState('scanning');
    
    // Simulate complex analysis time
    setTimeout(() => {
        // 1. Detect Real Mic (Ignore Default, Ignore CABLE Output, Ignore Virtual)
        const bestMic = inputDevices.find(d => 
            d.deviceId !== 'default' && 
            d.deviceId !== 'communications' &&
            !d.label.includes('CABLE Output') &&
            (d.label.toLowerCase().includes('mic') || d.label.toLowerCase().includes('input') || d.label.toLowerCase().includes('usb'))
        ) || inputDevices.find(d => d.deviceId !== 'default' && !d.label.includes('CABLE Output')) || null;

        // 2. Detect Injector (Must be CABLE Input)
        const bestInjector = outputDevices.find(d => d.label.includes('CABLE Input')) || null;

        // 3. Detect Monitor (Default or anything that isn't CABLE Input)
        const bestMonitor = outputDevices.find(d => d.deviceId === 'default') || 
                            outputDevices.find(d => !d.label.includes('CABLE Input')) || null;

        setDetectedDevices({
            mic: bestMic,
            injector: bestInjector,
            monitor: bestMonitor
        });
        setScanState('results');

        if (bestMic) onOpenSelector('mic');
        
    }, 2000);
  };

  if (!isOpen) return null;

  // Helper to get device label
  const getLabel = (id: string, list: AudioDevice[], fallback: string) => {
    if (!id || id === 'default') return fallback;
    const found = list.find(d => d.deviceId === id);
    return found ? found.label : fallback;
  };

  // Button-style Device Trigger
  const DeviceTrigger = ({ 
    icon: Icon, 
    color, 
    label, 
    valueLabel,
    onClick,
    placeholder,
    detected 
  }: { 
    icon: any, color: string, label: string, valueLabel: string, onClick: () => void, placeholder: string, detected?: boolean 
  }) => (
    <button 
      onClick={onClick}
      className={`w-full bg-zinc-800/50 hover:bg-zinc-800 border ${detected ? 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'border-white/5'} rounded-xl p-3 flex flex-col gap-2 transition-all text-left group relative overflow-hidden`}
    >
       {detected && <div className="absolute top-0 right-0 p-1 bg-green-500 rounded-bl-lg"><Check size={10} className="text-white" /></div>}
       <div className="flex items-center gap-2">
          <Icon size={16} className={color} />
          <span className="text-xs text-gray-400 font-bold">{label}</span>
       </div>
       <div className="flex justify-between items-center w-full">
          <span className="text-sm text-white font-medium truncate pr-2">
             {valueLabel || placeholder}
          </span>
          <ChevronDown size={14} className="text-gray-500 group-hover:text-white transition-colors" />
       </div>
    </button>
  );

  const steps = [
    // Step 0: Welcome
    {
      icon: <span className="text-4xl">👋</span>,
      title: t('welcomeTitle'),
      desc: t('welcomeDesc'),
      content: (
        <div className="text-center space-y-4">
          <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-xl">
            <h4 className="text-red-400 font-bold mb-1 font-persian">{t('whySetup')}</h4>
            <p className="text-xs text-gray-400 font-persian leading-relaxed">
              {t('whySetupDesc')}
            </p>
          </div>
        </div>
      )
    },
    // Step 1: VB-Audio Install
    {
      icon: <Package className="text-blue-400" size={48} />,
      title: t('step1Title'),
      desc: t('step1Desc'),
      content: (
        <div className="space-y-4 font-persian">
          <p className="text-gray-300 text-sm leading-relaxed">
            {t('step1Content')}
          </p>
          
          <div className="bg-zinc-900/50 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
            
            <div className="flex justify-between items-center relative z-10">
               <div>
                 <h4 className="text-white font-bold text-lg mb-1">VB-CABLE Driver</h4>
                 <p className="text-xs text-blue-300">{installStatus === 'success' ? t('restartNotice') : 'VB-Audio Software'}</p>
               </div>
               
               {installStatus === 'idle' && (
                 <button 
                   onClick={handleInstall}
                   className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-2"
                 >
                   <Download size={18} />
                   {t('installBtn')}
                 </button>
               )}

               {installStatus === 'installing' && (
                 <div className="px-6 py-2 bg-zinc-800 text-gray-400 font-bold rounded-xl border border-white/5 flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                   {t('installing')}
                 </div>
               )}

               {installStatus === 'success' && (
                 <div className="px-4 py-2 bg-green-500/10 text-green-500 font-bold rounded-xl border border-green-500/30 flex items-center gap-2">
                   <Check size={18} />
                   {t('installSuccess')}
                 </div>
               )}

               {installStatus === 'error' && (
                 <div className="px-4 py-2 bg-red-500/10 text-red-500 font-bold rounded-xl border border-red-500/30 flex items-center gap-2">
                   <X size={18} />
                   {t('installError')}
                 </div>
               )}
            </div>

            {installStatus === 'installing' && (
               <div className="absolute bottom-0 left-0 h-1 bg-blue-500 animate-shimmer w-full"></div>
            )}
          </div>
        </div>
      )
    },
    // Step 2: Windows Settings (NEW)
    {
        icon: <SlidersHorizontal className="text-yellow-500" size={48} />,
        title: t('step2Title'),
        desc: t('step2Desc'),
        content: (
            <div className="space-y-4 font-persian">
                 <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl relative overflow-hidden">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-1" size={20} />
                        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                            {t('step2Content')}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 bg-zinc-900 rounded-xl border border-white/5 flex flex-col items-center text-center opacity-50">
                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Windows Input</span>
                        <Mic2 size={24} className="text-gray-400 mb-1" />
                        <span className="text-xs text-gray-400">Real Mic</span>
                    </div>
                    <div className="p-3 bg-zinc-900 rounded-xl border border-white/5 flex flex-col items-center text-center opacity-50">
                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Windows Output</span>
                        <Monitor size={24} className="text-gray-400 mb-1" />
                        <span className="text-xs text-gray-400">Headphones</span>
                    </div>
                </div>
            </div>
        )
    },
    // Step 3: Auto-Configuration (Moved from 2)
    {
      icon: <Cpu className="text-purple-500" size={48} />,
      title: t('step3Title'),
      desc: t('step3Desc'),
      content: (
        <div className="space-y-4 font-persian h-full flex flex-col">
          
          {scanState === 'idle' && (
              <div className="flex flex-col items-center justify-center flex-1 gap-6 py-6 animate-fade-in">
                  <div className="relative group cursor-pointer" onClick={performAutoScan}>
                      <div className="absolute inset-0 bg-purple-600 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                      <div className="relative w-32 h-32 bg-zinc-900 rounded-full border border-purple-500/30 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500">
                          <Scan size={48} className="text-purple-400" />
                          <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
                      </div>
                  </div>
                  <button 
                    onClick={performAutoScan}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-900/40 transition-all active:scale-95 flex items-center gap-3"
                  >
                      <Zap size={20} className="fill-white" />
                      {t('autoScanBtn')}
                  </button>
                  <button onClick={() => setScanState('results')} className="text-xs text-gray-500 hover:text-white underline">
                      {t('manualOverride')}
                  </button>
              </div>
          )}

          {scanState === 'scanning' && (
              <div className="flex flex-col items-center justify-center flex-1 py-10 animate-fade-in">
                  <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-2 border-4 border-r-cyan-500 border-t-transparent border-l-cyan-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Cpu size={32} className="text-white/50 animate-pulse" />
                      </div>
                  </div>
                  <h3 className="text-xl font-bold text-white animate-pulse">{t('scanning')}</h3>
              </div>
          )}

          {scanState === 'results' && (
            <div className="space-y-3 animate-slide-up">
              <div className={`p-3 rounded-xl border flex items-center gap-3 mb-2 ${detectedDevices.injector ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  {detectedDevices.injector ? <Check size={20} className="text-green-500" /> : <AlertTriangle size={20} className="text-red-500" />}
                  <span className={`text-sm font-bold ${detectedDevices.injector ? 'text-green-400' : 'text-red-400'}`}>
                      {detectedDevices.injector ? t('scanSuccess') : t('scanFail')}
                  </span>
              </div>

              <DeviceTrigger 
                icon={Mic2} 
                color="text-purple-400" 
                label={t('micInput')} 
                valueLabel={detectedDevices.mic ? detectedDevices.mic.label : getLabel(micInputDeviceId, inputDevices, 'Default Input')}
                onClick={() => onOpenSelector('mic')}
                placeholder={t('clickToSelect')}
                detected={!!detectedDevices.mic}
              />

              <DeviceTrigger 
                icon={Radio} 
                color="text-red-400" 
                label={t('injector')} 
                valueLabel={detectedDevices.injector ? detectedDevices.injector.label : (t('deviceMissing') + ' (Install VB-Cable)')}
                onClick={() => onOpenSelector('injector')}
                placeholder={t('clickToSelect')}
                detected={!!detectedDevices.injector}
              />

              <DeviceTrigger 
                icon={Monitor} 
                color="text-blue-400" 
                label={t('monitor')} 
                valueLabel={detectedDevices.monitor ? detectedDevices.monitor.label : getLabel(monitorDeviceId, outputDevices, t('monitorDefault'))}
                onClick={() => onOpenSelector('monitor')}
                placeholder={t('clickToSelect')}
                detected={!!detectedDevices.monitor}
              />
              
              <div className="text-center pt-2">
                   <button onClick={performAutoScan} className="text-xs text-gray-500 hover:text-white flex items-center justify-center gap-1 mx-auto">
                       <Settings2 size={12} /> Re-scan
                   </button>
              </div>

            </div>
          )}
        </div>
      )
    },
    // Step 4: Target Apps (NEW)
    {
      icon: <Gamepad2 className="text-pink-500" size={48} />,
      title: t('step4Title'),
      desc: t('step4Desc'),
      content: (
        <div className="space-y-6 font-persian">
          <p className="text-sm text-gray-300">{t('step4Intro')}</p>
          
          {/* Visual Simulation of Discord Settings */}
          <div className="bg-[#2b2d31] rounded-lg p-4 border border-[#1e1f22] shadow-xl relative overflow-hidden">
             {/* Discord Header Sim */}
             <div className="flex items-center gap-2 mb-4 text-[#b5bac1] text-xs font-bold uppercase border-b border-[#3f4147] pb-2">
                <Settings2 size={12} /> Voice & Video Settings
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                 {/* Input Device */}
                 <div className="space-y-1">
                     <span className="text-[10px] font-bold text-[#b5bac1] uppercase">{t('step4InputLabel')}</span>
                     <div className="bg-[#1e1f22] p-2 rounded text-xs text-white border border-green-500/50 flex items-center justify-between">
                         <span className="truncate">{t('step4InputValue')}</span>
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     </div>
                 </div>
                 
                 {/* Output Device */}
                 <div className="space-y-1">
                     <span className="text-[10px] font-bold text-[#b5bac1] uppercase">{t('step4OutputLabel')}</span>
                     <div className="bg-[#1e1f22] p-2 rounded text-xs text-white border border-[#3f4147]">
                         <span className="truncate">{t('step4OutputValue')}</span>
                     </div>
                 </div>
             </div>
             
             {/* Hint Overlay */}
             <div className="mt-4 p-2 bg-green-500/10 rounded border border-green-500/20 text-[10px] text-green-300 flex items-start gap-2">
                <Lightbulb size={12} className="shrink-0 mt-0.5" />
                {t('step4Note')}
             </div>
          </div>
        </div>
      )
    },
    // Step 5: Pro Tips (Moved from 3)
    {
      icon: <Lightbulb className="text-green-500" size={48} />,
      title: t('step5Title'),
      desc: t('step5Desc'),
      content: (
        <div className="space-y-4 font-persian">
          
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
             <AlertTriangle className="text-red-500 shrink-0" size={20} />
             <div className="space-y-2">
                <h4 className="text-sm font-bold text-red-400">{t('step5Why')}</h4>
                <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                    <li>{t('step5Tip1')}</li>
                    <li>{t('step5Tip2')}</li>
                </ul>
             </div>
          </div>

          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-4">
              <MessageCircle size={24} className="text-indigo-400" />
              <div className="text-xs text-indigo-300">
                  Discord &gt; User Settings &gt; Voice &amp; Video &gt; Scroll down to "Advanced"
              </div>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col min-h-[550px] animate-slide-up">
        
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[80px] pointer-events-none"></div>
        
        {/* Header */}
        <div className="p-8 pb-0 relative z-10">
           <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                 <span className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-gray-400">{step + 1}/{steps.length}</span>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
           </div>
           
           <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-white/5 flex items-center justify-center mb-4 shadow-lg shadow-black/50">
                 {currentStep.icon}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 font-persian">{currentStep.title}</h2>
              <p className="text-gray-400 font-persian text-sm">{currentStep.desc}</p>
           </div>
        </div>

        {/* Content Body */}
        <div className="px-8 flex-1 relative z-10">
           {currentStep.content}
        </div>

        {/* Footer Navigation */}
        <div className="p-8 mt-auto flex justify-between items-center border-t border-white/5 bg-zinc-900/30">
           <button 
             onClick={() => {
                 if (step > 0) setStep(prev => prev - 1);
                 // Reset scan if going back to 2 from 3
                 if (step === 3) setScanState('idle'); 
             }}
             disabled={step === 0}
             className="px-4 py-2 rounded-xl text-gray-400 hover:text-white disabled:opacity-0 transition-all flex items-center gap-2 font-persian"
           >
             {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
             {t('back')}
           </button>

           <div className="flex gap-2">
             {steps.map((_, i) => (
               <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-red-500 w-6' : 'bg-gray-700'}`}></div>
             ))}
           </div>

           <button 
             onClick={() => {
               if (step === steps.length - 1) {
                 onClose();
               } else {
                 setStep(prev => Math.min(steps.length - 1, prev + 1));
               }
             }}
             className="px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-white/20 active:scale-95 font-persian"
           >
             {step === steps.length - 1 ? t('finish') : t('next')}
             {step !== steps.length - 1 && (isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />)}
           </button>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;
