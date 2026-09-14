import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Download, Check, Monitor, Mic2, Radio, ChevronDown, Package, Zap, Cpu, Scan, AlertTriangle, Settings2, Gamepad2, SlidersHorizontal, Lightbulb, MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useReducedMotion } from '../utils/useReducedMotion';
import { AudioDevice } from '../types';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  micInputDeviceId: string;
  injectorDeviceId: string;
  monitorDeviceId: string;
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  onOpenSelector: (type: 'mic' | 'injector' | 'monitor') => void;
}

type InstallStatus = 'idle' | 'installing' | 'success' | 'error';
type ScanState = 'idle' | 'scanning' | 'results';
type StepDirection = 'fwd' | 'back';

interface WizardStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  canProceed: boolean;
  render: () => React.ReactNode;
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
  const prefersReduced = useReducedMotion();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<StepDirection>('fwd');
  const [closing, setClosing] = useState(false);
  const [installStatus, setInstallStatus] = useState<InstallStatus>('idle');

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [detectedDevices, setDetectedDevices] = useState<{
    mic: AudioDevice | null;
    injector: AudioDevice | null;
    monitor: AudioDevice | null;
  }>({ mic: null, injector: null, monitor: null });

  const scanTimerRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const animateEndedRef = useRef(false);

  // Reset wizard state when modal opens / closes
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setDirection('fwd');
      setClosing(false);
      setInstallStatus('idle');
      setScanState('idle');
      setDetectedDevices({ mic: null, injector: null, monitor: null });
      animateEndedRef.current = false;
    }
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, [isOpen]);

  // Move focus to the step title after open / step change so keyboard + screen reader
  // users land on the newly revealed pane.
  useEffect(() => {
    if (isOpen && !closing) {
      const raf = requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, step, closing]);

  const fmt = (template: string, vars: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (match, key) => String(vars[key] ?? match));

  const getLabel = (id: string, list: AudioDevice[], fallback: string) => {
    if (!id || id === 'default') return fallback;
    const found = list.find(d => d.deviceId === id);
    return found ? found.label : fallback;
  };

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
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);

    scanTimerRef.current = window.setTimeout(() => {
      const bestMic = inputDevices.find(d =>
        d.deviceId !== 'default' &&
        d.deviceId !== 'communications' &&
        !d.label.includes('CABLE Output') &&
        (d.label.toLowerCase().includes('mic') || d.label.toLowerCase().includes('input') || d.label.toLowerCase().includes('usb'))
      ) || inputDevices.find(d => d.deviceId !== 'default' && !d.label.includes('CABLE Output')) || null;

      const bestInjector = outputDevices.find(d => d.label.includes('CABLE Input')) || null;

      const bestMonitor = outputDevices.find(d => d.deviceId === 'default') ||
                          outputDevices.find(d => !d.label.includes('CABLE Input')) || null;

      setDetectedDevices({
        mic: bestMic,
        injector: bestInjector,
        monitor: bestMonitor
      });
      setScanState('results');

      if (bestMic) onOpenSelector('mic');

      scanTimerRef.current = null;
    }, 2000);
  };

  // ---- Navigation ---- //

  const goToStep = (next: number, dir: StepDirection = 'fwd') => {
    if (closing || next < 0 || next >= steps.length || next === step) return;
    // Reset the scan UX when backing out of the auto-scan step
    if (step === 3 && next < 3) setScanState('idle');
    setDirection(dir);
    setStep(next);
  };

  const goNext = () => goToStep(step + 1, 'fwd');
  const goBack = () => goToStep(step - 1, 'back');

  const beginClose = () => {
    if (closing) return;
    if (prefersReduced) {
      onClose();
      return;
    }
    setClosing(true);
  };

  const handlePanelAnimationEnd = () => {
    if (closing && !animateEndedRef.current) {
      animateEndedRef.current = true;
      onClose();
    }
  };

  useEscapeKey(isOpen && !closing, beginClose);

  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }

    if (closing) return;

    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const forwardKey = isRTL ? 'ArrowLeft' : 'ArrowRight';
    const backKey = isRTL ? 'ArrowRight' : 'ArrowLeft';

    if (e.key === forwardKey) {
      if (steps[step]?.canProceed) {
        e.preventDefault();
        goNext();
      }
    } else if (e.key === backKey) {
      e.preventDefault();
      goBack();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToStep(0, 'back');
    } else if (e.key === 'End') {
      e.preventDefault();
      goToStep(steps.length - 1, 'fwd');
    }
  };

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
      className={`w-full bg-zinc-800/50 hover:bg-zinc-800 border ${detected ? 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.15)]' : 'border-white/5'} rounded-xl p-3 flex flex-col gap-2 transition-all text-left group relative overflow-hidden focus-visible:ring-2 focus-visible:ring-red-500/50`}
    >
      {detected && <div className="absolute top-0 right-0 p-1 bg-green-500 rounded-bl-lg"><Check size={10} className="text-white" /></div>}
      <div className="flex items-center gap-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-gray-400 font-bold">{label}</span>
      </div>
      <div className="flex justify-between items-center w-full">
        <span className="text-sm text-white font-medium truncate pe-2">
          {valueLabel || placeholder}
        </span>
        <ChevronDown size={14} className="text-gray-500 group-hover:text-white transition-colors" />
      </div>
    </button>
  );

  const steps: WizardStep[] = [
    // Step 0: Welcome
    {
      id: 'welcome',
      icon: <span className="text-4xl">👋</span>,
      title: t('welcomeTitle'),
      desc: t('welcomeDesc'),
      canProceed: true,
      render: () => (
        <div className="space-y-4 wizard-stagger">
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
      id: 'install',
      icon: <Package className="text-blue-400" size={48} />,
      title: t('step1Title'),
      desc: t('step1Desc'),
      canProceed: true,
      render: () => (
        <div className="space-y-4 font-persian wizard-stagger">
          <p className="text-gray-300 text-sm leading-relaxed">
            {t('step1Content')}
          </p>

          <div className="bg-zinc-900/50 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>

            <div className="flex justify-between items-center relative z-10 flex-wrap gap-3">
              <div>
                <h4 className="text-white font-bold text-lg mb-1">{t('vbCableDriver')}</h4>
                <p className="text-xs text-blue-300">{installStatus === 'success' ? t('restartNotice') : t('vbAudioSoftware')}</p>
              </div>

              {installStatus === 'idle' && (
                <button
                  onClick={handleInstall}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-400/60"
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
    // Step 2: Windows Settings
    {
      id: 'windows',
      icon: <SlidersHorizontal className="text-yellow-500" size={48} />,
      title: t('step2Title'),
      desc: t('step2Desc'),
      canProceed: true,
      render: () => (
        <div className="space-y-4 font-persian wizard-stagger">
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
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('windowsInput')}</span>
              <Mic2 size={24} className="text-gray-400 mb-1" />
              <span className="text-xs text-gray-400">{t('realMic')}</span>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl border border-white/5 flex flex-col items-center text-center opacity-50">
              <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t('windowsOutput')}</span>
              <Monitor size={24} className="text-gray-400 mb-1" />
              <span className="text-xs text-gray-400">{t('headphones')}</span>
            </div>
          </div>
        </div>
      )
    },
    // Step 3: Auto-Configuration
    {
      id: 'scan',
      icon: <Cpu className="text-purple-500" size={48} />,
      title: t('step3Title'),
      desc: t('step3Desc'),
      canProceed: scanState === 'results',
      render: () => (
        <div className="space-y-4 font-persian flex flex-col wizard-stagger">

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
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-purple-900/40 transition-all active:scale-95 flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-purple-400/60"
              >
                <Zap size={20} className="fill-white" />
                {t('autoScanBtn')}
              </button>
              <button onClick={() => { setScanState('results'); }} className="text-xs text-gray-500 hover:text-white underline">
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

              {!detectedDevices.mic && !detectedDevices.injector && !detectedDevices.monitor && (
                <div className="p-3 rounded-xl border border-white/10 bg-zinc-900 text-center">
                  <p className="text-xs text-gray-400">{t('wizardNoDevices')}</p>
                  <button onClick={performAutoScan} className="text-xs text-red-400 hover:text-red-300 underline mt-1.5">
                    {t('wizardRetry')}
                  </button>
                </div>
              )}

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
                valueLabel={detectedDevices.injector ? detectedDevices.injector.label : `${t('deviceMissing')} (${t('vbCableDriver')})`}
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
                  <Settings2 size={12} /> {t('rescan')}
                </button>
              </div>
            </div>
          )}
        </div>
      )
    },
    // Step 4: Target Apps
    {
      id: 'targets',
      icon: <Gamepad2 className="text-pink-500" size={48} />,
      title: t('step4Title'),
      desc: t('step4Desc'),
      canProceed: true,
      render: () => (
        <div className="space-y-6 font-persian wizard-stagger">
          <p className="text-sm text-gray-300">{t('step4Intro')}</p>

          <div className="bg-[#2b2d31] rounded-lg p-4 border border-[#1e1f22] shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 text-[#b5bac1] text-xs font-bold uppercase border-b border-[#3f4147] pb-2">
              <Settings2 size={12} /> {t('voiceVideoSettings')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#b5bac1] uppercase">{t('step4InputLabel')}</span>
                <div className="bg-[#1e1f22] p-2 rounded text-xs text-white border border-green-500/50 flex items-center justify-between">
                  <span className="truncate">{t('step4InputValue')}</span>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#b5bac1] uppercase">{t('step4OutputLabel')}</span>
                <div className="bg-[#1e1f22] p-2 rounded text-xs text-white border border-[#3f4147]">
                  <span className="truncate">{t('step4OutputValue')}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-2 bg-green-500/10 rounded border border-green-500/20 text-[10px] text-green-300 flex items-start gap-2">
              <Lightbulb size={12} className="shrink-0 mt-0.5" />
              {t('step4Note')}
            </div>
          </div>
        </div>
      )
    },
    // Step 5: Pro Tips
    {
      id: 'tips',
      icon: <Lightbulb className="text-green-500" size={48} />,
      title: t('step5Title'),
      desc: t('step5Desc'),
      canProceed: true,
      render: () => (
        <div className="space-y-4 font-persian wizard-stagger">
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
            <div className="text-xs text-indigo-300" dir="ltr">
              {t('discordAdvancedPath')}
            </div>
          </div>
        </div>
      )
    },
    // Step 6: Summary
    {
      id: 'summary',
      icon: <span className="text-4xl">🎉</span>,
      title: t('wizardSummaryTitle'),
      desc: t('wizardSummaryDesc'),
      canProceed: true,
      render: () => (
        <div className="space-y-4 font-persian wizard-stagger">
          <div className="space-y-2">
            <DeviceTrigger
              icon={Mic2}
              color="text-purple-400"
              label={t('micInput')}
              valueLabel={detectedDevices.mic ? detectedDevices.mic.label : getLabel(micInputDeviceId, inputDevices, t('clickToSelect'))}
              onClick={() => onOpenSelector('mic')}
              placeholder={t('clickToSelect')}
              detected={!!detectedDevices.mic || !!micInputDeviceId}
            />
            <DeviceTrigger
              icon={Radio}
              color="text-red-400"
              label={t('injector')}
              valueLabel={detectedDevices.injector ? detectedDevices.injector.label : getLabel(injectorDeviceId, outputDevices, t('deviceMissing'))}
              onClick={() => onOpenSelector('injector')}
              placeholder={t('clickToSelect')}
              detected={!!detectedDevices.injector || !!injectorDeviceId}
            />
            <DeviceTrigger
              icon={Monitor}
              color="text-blue-400"
              label={t('monitor')}
              valueLabel={detectedDevices.monitor ? detectedDevices.monitor.label : getLabel(monitorDeviceId, outputDevices, t('monitorDefault'))}
              onClick={() => onOpenSelector('monitor')}
              placeholder={t('clickToSelect')}
              detected={!!detectedDevices.monitor || !!monitorDeviceId}
            />
          </div>
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${installStatus === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
            {installStatus === 'success'
              ? <Check size={16} className="text-green-500" />
              : <Package size={16} className="text-blue-400" />}
            <span className={`text-xs font-bold ${installStatus === 'success' ? 'text-green-400' : 'text-blue-300'}`}>
              {installStatus === 'success' ? t('installSuccess') : t('wizardRestartNote')}
            </span>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const progress = step / (steps.length - 1);
  const stepLabel = fmt(t('wizardStepLabel'), { current: step + 1, total: steps.length });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/90 backdrop-blur-md ${closing ? 'wizard-backdrop-out' : 'wizard-backdrop-in'}`}
        onClick={beginClose}
      ></div>

      <div
        ref={panelRef}
        onKeyDown={handlePanelKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={currentStep.title}
        onAnimationEnd={handlePanelAnimationEnd}
        className={`relative bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-lg min-h-[550px] shadow-2xl shadow-red-950/40 overflow-hidden flex flex-col max-h-[90vh] will-change-transform ${closing ? 'wizard-modal-out' : 'wizard-modal-in'}`}
      >
        {/* Progress Bar */}
        <div className="wizard-progress-track" aria-hidden="true">
          <div className="wizard-progress-bar" style={{ '--wizard-progress': progress } as React.CSSProperties}></div>
        </div>

        {/* Background Decor */}
        <div className="wizard-glow-orb"></div>
        <div className="wizard-glow-orb-2"></div>

        {/* Header */}
        <div className="p-8 pb-0 relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-500/10 rounded text-xs font-mono text-red-300 border border-red-500/20">{stepLabel}</span>
            </div>
            <button
              onClick={beginClose}
              aria-label={t('cancel')}
              className="text-gray-500 hover:text-white hover:bg-red-600/15 hover:text-red-400 hover:rotate-90 transition-all duration-300 rounded-lg p-1.5 focus-visible:ring-2 focus-visible:ring-red-500/50"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <div className="wizard-icon-ring"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl border border-red-500/20 flex items-center justify-center shadow-lg shadow-black/50">
                {currentStep.icon}
              </div>
            </div>
            <h2
              ref={titleRef}
              tabIndex={-1}
              id="wizard-title"
              className="text-2xl font-bold text-white mb-2 font-persian outline-none rounded-lg"
            >
              {currentStep.title}
            </h2>
            <p className="text-gray-400 font-persian text-sm">{currentStep.desc}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-8 flex-1 relative z-10 overflow-y-auto neon-scrollbar min-h-0">
          <div
            key={step}
            className={closing ? '' : direction === 'fwd' ? 'wizard-step-enter-fwd' : 'wizard-step-enter-back'}
          >
            {currentStep.render()}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-8 mt-auto flex justify-between items-center border-t border-white/5 bg-zinc-900/30">
          <button
            onClick={goBack}
            disabled={step === 0}
            aria-label={t('back')}
            className={`px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 font-persian focus-visible:ring-2 focus-visible:ring-red-500/50 ${step === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {isRTL ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
            {t('back')}
          </button>

          <div className="flex items-center gap-1.5" role="group" aria-label={t('wizardProgressLabel')}>
            {steps.map((s, i) => {
              const isCurrent = i === step;
              if (i <= step) {
                return (
                  <button
                    key={s.id}
                    onClick={() => goToStep(i, i < step ? 'back' : 'fwd')}
                    aria-label={fmt(t('wizardGoToStep'), { n: i + 1, title: s.title })}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`wizard-dot ${isCurrent ? 'wizard-dot-active' : 'wizard-dot-done'}`}
                  ></button>
                );
              }
              return (
                <span key={s.id} aria-hidden="true" className="wizard-dot wizard-dot-future"></span>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {!currentStep.canProceed && (
              <span className="text-[10px] text-gray-500 hidden sm:inline font-persian">{t('wizardStepIncomplete')}</span>
            )}
            <button
              onClick={currentStep.canProceed ? (isLast ? beginClose : goNext) : undefined}
              disabled={!currentStep.canProceed}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg active:scale-95 font-persian focus-visible:ring-2 focus-visible:ring-red-500/60 bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-red-900/40 ${currentStep.canProceed ? 'hover:shadow-[0_0_24px_rgba(244,63,94,0.45)] hover:from-red-500 hover:to-pink-500' : 'opacity-40 cursor-not-allowed'}`}
            >
              {isLast ? t('wizardDone') : t('next')}
              {!isLast && (isRTL ? <ArrowLeft size={16} /> : <ArrowRight size={16} />)}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;