
import React, { useState, useEffect, useRef } from 'react';
import { Mic2, Radio, Headphones, Volume2, RefreshCw, Monitor, Download, ShieldCheck, Waves, Zap, ChevronDown, Globe, HelpCircle, Heart, Mail, MessageCircle, Code, FileJson, Check, Sparkles, ChevronRight, Plug, Store, Sliders } from 'lucide-react';
import { AudioDevice, MicEqSettings } from '../types';
import MicSettingModal from '../components/MicSettingModal';
import AdvancedAudioModal from '../components/AdvancedAudioModal';
import Mic10BandEqualizerModal from '../components/Mic10BandEqualizerModal';
import ExtensionsModal from '../components/ExtensionsModal';
import { useLanguage } from '../context/LanguageContext';
import { VERSION } from '../constants';
import { loadExtensions } from '../utils/spatiflac';

interface SettingsProps {
  monitorDeviceId: string;
  injectorDeviceId: string;
  micInputDeviceId: string;
  onMonitorChange: (id: string) => void;
  onInjectorChange: (id: string) => void;
  onMicInputChange: (id: string) => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  micVolume: number;
  onMicVolumeChange: (vol: number) => void;
  micEqSettings: MicEqSettings;
  onMicEqChange: (settings: MicEqSettings) => void;
  onOpenHelp: () => void;
  onOpenWhatsNew: () => void;
  
  // Visualizer props removed

  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  onRefreshDevices: () => void;
  isRefreshingDevices: boolean;
  onOpenSelector: (type: 'mic' | 'injector' | 'monitor') => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  monitorDeviceId, 
  injectorDeviceId, 
  micInputDeviceId,
  onMonitorChange, 
  onInjectorChange,
  onMicInputChange,
  masterVolume,
  onMasterVolumeChange,
  micVolume,
  onMicVolumeChange,
  micEqSettings,
  onMicEqChange,
  onOpenHelp,
  onOpenWhatsNew,
  inputDevices,
  outputDevices,
  onRefreshDevices,
  isRefreshingDevices,
  onOpenSelector
}) => {
  const { t, language, setLanguage, isRTL } = useLanguage();

  const [startWithWindows, setStartWithWindows] = useState(() => localStorage.getItem('startWithWindows') === 'true');
  const [minimizeToTray, setMinimizeToTray] = useState(() => localStorage.getItem('minimizeToTray') === 'true');
  const [sourceDownloadStatus, setSourceDownloadStatus] = useState<'idle' | 'downloading' | 'success'>('idle');
  const sourceStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (sourceStatusTimeoutRef.current) { clearTimeout(sourceStatusTimeoutRef.current); sourceStatusTimeoutRef.current = null; }
  }, []);

  const [isExtensionsModalOpen, setIsExtensionsModalOpen] = useState(false);
  const [installedExtCount, setInstalledExtCount] = useState(() => loadExtensions().filter(e => !e.builtin).length);

  const [isGainModalOpen, setIsGainModalOpen] = useState(false);
  const [isClarityModalOpen, setIsClarityModalOpen] = useState(false);
  const [isAdvancedAudioOpen, setIsAdvancedAudioOpen] = useState(false);
  const [is10BandEqOpen, setIs10BandEqOpen] = useState(false);
  
  const toggleStartWithWindows = () => {
    const newVal = !startWithWindows;
    setStartWithWindows(newVal);
    localStorage.setItem('startWithWindows', String(newVal));
    if (window.electronAPI) window.electronAPI.setStartAtLogin(newVal);
  };

  const toggleMinimizeToTray = () => {
    const newVal = !minimizeToTray;
    setMinimizeToTray(newVal);
    localStorage.setItem('minimizeToTray', String(newVal));
  };

  const handleGainChange = (val: number) => onMicEqChange({ ...micEqSettings, micGain: val });
  const handleClarityChange = (val: number) => onMicEqChange({ ...micEqSettings, voiceClarity: val });

  const getDeviceLabel = (id: string, devices: AudioDevice[], defaultLabel: string) => {
    if (!id || id === 'default') return defaultLabel;
    const dev = devices.find(d => d.deviceId === id);
    return dev ? dev.label : defaultLabel;
  };

  const handleGetSource = async () => {
    if (window.electronAPI) {
      if (sourceStatusTimeoutRef.current) { clearTimeout(sourceStatusTimeoutRef.current); sourceStatusTimeoutRef.current = null; }
      setSourceDownloadStatus('downloading');
      const result = await window.electronAPI.saveSourceCode();
      if (result.success) {
        setSourceDownloadStatus('success');
        sourceStatusTimeoutRef.current = setTimeout(() => { sourceStatusTimeoutRef.current = null; setSourceDownloadStatus('idle'); }, 3000);
      } else {
        setSourceDownloadStatus('idle');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto w-full z-10 pb-8 page-stagger">
        <div className="flex justify-between items-center mb-2">
            <h2 className="text-3xl font-bold text-white font-persian">{t('settingsTitle')}</h2>
            <div className="flex gap-2">
                <button onClick={onOpenHelp} className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-900/50 hover:text-white transition-all active:scale-95"><HelpCircle size={18} /><span className="text-sm font-bold">Guide</span></button>
                <button onClick={onRefreshDevices} disabled={isRefreshingDevices} className="p-2 bg-zinc-800 rounded-lg text-gray-400 hover:text-white hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50" title={t('refreshDevices')}><RefreshCw size={20} className={isRefreshingDevices ? "animate-spin" : ""} /></button>
            </div>
        </div>
        <p className="text-gray-400 mb-8 font-persian">{t('settingsDesc')}</p>

        {/* Language Selection */}
        <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md mb-8">
            <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-white/5 rounded-xl"><Globe size={24} className="text-white" /></div><div><h3 className="text-xl font-semibold text-white font-persian">{t('languageTitle')}</h3><p className="text-sm text-gray-400 font-persian">{t('languageDesc')}</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button onClick={() => setLanguage('en')} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${language === 'en' ? 'bg-red-900/20 border-red-500' : 'bg-black/40 border-transparent hover:bg-black/60'}`}><span className={`font-medium ${language === 'en' ? 'text-white' : 'text-gray-400'}`}>{t('langEn')}</span>{language === 'en' && <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red]"></div>}</button>
               <button onClick={() => setLanguage('fa')} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${language === 'fa' ? 'bg-red-900/20 border-red-500' : 'bg-black/40 border-transparent hover:bg-black/60'}`}><span className={`font-medium ${language === 'fa' ? 'text-white' : 'text-gray-400'}`}>{t('langFa')}</span>{language === 'fa' && <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red]"></div>}</button>
            </div>
        </section>

        {/* Visualizer Studio Configuration Removed - Moved to MusicPlayer */}

        {/* System Integration */}
        <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md mb-8">
            <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-white/5 rounded-xl"><Monitor size={24} className="text-white" /></div><div><h3 className="text-xl font-semibold text-white font-persian">{t('sysIntegration')}</h3><p className="text-sm text-gray-400 font-persian">{t('sysIntegrationDesc')}</p></div></div>
            <div className="flex flex-col gap-4">
                <label onClick={toggleStartWithWindows} className="flex items-center justify-between p-4 bg-black/40 rounded-xl cursor-pointer hover:bg-black/60 transition-colors"><div className="flex items-center gap-3"><Download size={20} className="text-gray-400" /><span className="text-white font-medium font-persian">{t('startWindows')}</span></div><div className={`w-12 h-6 rounded-full p-1 transition-colors ${startWithWindows ? 'bg-red-600' : 'bg-gray-700'}`} onClick={(e) => { e.preventDefault(); }}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${startWithWindows ? (isRTL ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`}></div></div></label>
                <label onClick={toggleMinimizeToTray} className="flex items-center justify-between p-4 bg-black/40 rounded-xl cursor-pointer hover:bg-black/60 transition-colors"><div className="flex items-center gap-3"><Monitor size={20} className="text-gray-400" /><span className="text-white font-medium font-persian">{t('minToTray')}</span></div><div className={`w-12 h-6 rounded-full p-1 transition-colors ${minimizeToTray ? 'bg-red-600' : 'bg-gray-700'}`} onClick={(e) => { e.preventDefault(); }}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${minimizeToTray ? (isRTL ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`}></div></div></label>
            </div>
        </section>

        {/* Spatiflac Extensions */}
        <button onClick={() => setIsExtensionsModalOpen(true)} className="group relative w-full mb-8 rounded-2xl p-px bg-gradient-to-r from-pink-500 via-red-500 to-violet-500 transition-shadow duration-300 hover:shadow-[0_0_35px_rgba(239,68,68,0.25)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600/15 via-red-600/15 to-violet-600/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          <div className={`relative flex items-center gap-4 p-6 rounded-[calc(1rem-1px)] bg-zinc-950/90 backdrop-blur-md text-left ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex items-center gap-2 shrink-0">
              <div className="p-3 bg-gradient-to-br from-pink-600 to-red-600 rounded-xl shadow-lg shadow-pink-900/40"><Plug size={24} className="text-white" /></div>
              <div className="p-2.5 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl shadow-lg shadow-violet-900/40"><Store size={18} className="text-white" /></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-xl font-semibold text-white font-persian">{t('spatiflacTitle')}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">{installedExtCount} {t('extStoreInstalled')}</span>
              </div>
              <p className="text-sm text-gray-400 font-persian truncate">{t('spatiflacDesc')}</p>
            </div>
            <ChevronRight size={20} className={`shrink-0 text-zinc-500 group-hover:text-white transition-all duration-300 group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Audio Configuration Card */}
        <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md mb-8 relative overflow-hidden group">
          <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1 h-full bg-gradient-to-b from-blue-500 via-purple-500 to-red-500`}></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex flex-col h-full"><div className="flex items-start gap-4 mb-4"><div className="p-3 bg-purple-500/10 rounded-xl text-purple-500"><Mic2 size={24} /></div><div><h3 className="text-xl font-semibold text-white font-persian">{t('micInput')}</h3><p className="text-sm text-gray-400 mt-1 font-persian">{t('micInputDesc')}</p></div></div><div className="space-y-4"><button onClick={() => onOpenSelector('mic')} className="w-full p-4 bg-black border border-white/10 rounded-xl text-white hover:border-purple-500 hover:bg-white/5 transition-all flex items-center justify-between group"><div className="flex flex-col items-start truncate pr-2"><span className="text-xs text-zinc-500 uppercase font-mono mb-1">{t('selectedDevice')}</span><span className={`font-medium truncate w-full ${isRTL ? 'text-right' : 'text-left'}`}>{getDeviceLabel(micInputDeviceId, inputDevices, 'Default Input')}</span></div><ChevronDown size={18} className="text-zinc-500 group-hover:text-white transition-colors" /></button><div className="grid grid-cols-3 gap-2 mt-4"><button onClick={() => setIsGainModalOpen(true)} className={`relative overflow-hidden p-3 rounded-xl border transition-all duration-300 group flex flex-col items-center justify-center gap-1 ${micEqSettings.micGain > 1.0 ? 'bg-emerald-950/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-black border-white/5 hover:border-white/10 hover:bg-white/5'} `}><Zap size={18} className={micEqSettings.micGain > 1.0 ? "text-emerald-500" : "text-zinc-500"} /><span className={`text-[10px] font-bold tracking-wider ${micEqSettings.micGain > 1.0 ? "text-emerald-400" : "text-zinc-500"}`}>{t('micGain')}</span>{micEqSettings.micGain > 1.0 && <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>}</button><button onClick={() => setIsClarityModalOpen(true)} className={`relative overflow-hidden p-3 rounded-xl border transition-all duration-300 group flex flex-col items-center justify-center gap-1 ${micEqSettings.voiceClarity > 0 ? 'bg-cyan-950/30 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-black border-white/5 hover:border-white/10 hover:bg-white/5'} `}><Waves size={18} className={micEqSettings.voiceClarity > 0 ? "text-cyan-500" : "text-zinc-500"} /><span className={`text-[10px] font-bold tracking-wider ${micEqSettings.voiceClarity > 0 ? "text-cyan-400" : "text-zinc-500"}`}>{t('micClarity')}</span>{micEqSettings.voiceClarity > 0 && <div className="absolute inset-0 bg-cyan-500/5 animate-pulse"></div>}</button><button onClick={() => setIsAdvancedAudioOpen(true)} className={`relative overflow-hidden p-3 rounded-xl border transition-all duration-300 group flex flex-col items-center justify-center gap-1 ${micEqSettings.noiseGateThreshold > -100 || micEqSettings.echoCancellation || micEqSettings.compressor ? 'bg-orange-950/30 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-black border-white/5 hover:border-white/10 hover:bg-white/5'} `}><Sliders size={18} className={micEqSettings.noiseGateThreshold > -100 || micEqSettings.echoCancellation || micEqSettings.compressor ? "text-orange-500" : "text-zinc-500"} /><span className={`text-[10px] font-bold tracking-wider ${micEqSettings.noiseGateThreshold > -100 || micEqSettings.echoCancellation || micEqSettings.compressor ? "text-orange-400" : "text-zinc-500"}`}>{t('micNoise')}</span>{(micEqSettings.noiseGateThreshold > -100 || micEqSettings.echoCancellation || micEqSettings.compressor) && <div className="absolute inset-0 bg-orange-500/5 animate-pulse"></div>}</button></div><button onClick={() => setIs10BandEqOpen(true)} className="w-full mt-3 p-3 bg-gradient-to-r from-red-950/60 via-amber-950/40 to-red-950/60 hover:from-red-900/80 hover:to-amber-900/60 border border-red-500/40 hover:border-red-500 rounded-xl text-white transition-all flex items-center justify-between group shadow-lg shadow-red-950/40 active:scale-95"><div className="flex items-center gap-2.5"><div className="p-1.5 bg-red-500/20 rounded-lg text-red-400 group-hover:text-red-300"><Sliders size={16} /></div><span className="text-xs font-bold font-persian">{t('micEq10BandTitle')}</span></div><span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">PRO DSP</span></button></div></div>
             <div><div className="flex items-start gap-4 mb-4"><div className="p-3 bg-red-500/10 rounded-xl text-red-500"><Radio size={24} /></div><div><h3 className="text-xl font-semibold text-white font-persian">{t('injector')}</h3><p className="text-sm text-gray-400 mt-1 font-persian">{t('injectorDesc')}</p></div></div><button onClick={() => onOpenSelector('injector')} className="w-full p-4 bg-black border border-white/10 rounded-xl text-white hover:border-red-500 hover:bg-white/5 transition-all flex items-center justify-between group"><div className="flex flex-col items-start truncate pr-2"><span className="text-xs text-zinc-500 uppercase font-mono mb-1">{t('selectedDevice')}</span><span className={`font-medium truncate w-full ${isRTL ? 'text-right' : 'text-left'}`}>{getDeviceLabel(injectorDeviceId, outputDevices, t('injectorNone'))}</span></div><ChevronDown size={18} className="text-zinc-500 group-hover:text-white transition-colors" /></button></div>
              <div><div className="flex items-start gap-4 mb-4"><div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><Headphones size={24} /></div><div><h3 className="text-xl font-semibold text-white font-persian">{t('monitor')}</h3><p className="text-sm text-gray-400 mt-1 font-persian">{t('monitorDesc')}</p></div></div><button onClick={() => onOpenSelector('monitor')} className="w-full p-4 bg-black border border-white/10 rounded-xl text-white hover:border-blue-500 hover:bg-white/5 transition-all flex items-center justify-between group"><div className="flex flex-col items-start truncate pr-2"><span className="text-xs text-zinc-500 uppercase font-mono mb-1">{t('selectedDevice')}</span><span className={`font-medium truncate w-full ${isRTL ? 'text-right' : 'text-left'}`}>{getDeviceLabel(monitorDeviceId, outputDevices, t('monitorDefault'))}</span></div><ChevronDown size={18} className="text-zinc-500 group-hover:text-white transition-colors" /></button></div>
           </div>
        </section>

        {/* Global Volume */}
        <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md mb-8">
            <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-white/5 rounded-xl"><Volume2 size={24} className="text-white" /></div><div><h3 className="text-xl font-semibold text-white font-persian">{t('masterVol')}</h3><p className="text-sm text-gray-400 font-persian">{t('masterVolDesc')}</p></div></div>
            <div className="flex items-center gap-4"><span className="text-zinc-500 text-sm">0%</span><input type="range" min="0" max="1" step="0.01" value={masterVolume} onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-500" /><span className="text-red-500 font-bold min-w-[3rem] text-right">{Math.round(masterVolume * 100)}%</span></div>
        </section>

        {/* Application Info */}
        <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden mb-8">
           <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} w-1 h-full bg-gray-600`}></div>
           <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-white/5 rounded-xl"><ShieldCheck size={24} className="text-white" /></div><h3 className="text-xl font-semibold text-white font-persian">{t('appInfo')}</h3></div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-400">
             <div className="p-4 bg-black/40 rounded-xl flex justify-between font-persian"><span>{t('version')}</span><span className="text-white font-mono">{VERSION}</span></div>
             <div className="p-4 bg-black/40 rounded-xl flex justify-between font-persian"><span>{t('engine')}</span><span className="text-white font-mono">Node / Electron / React</span></div>
             <button onClick={handleGetSource} disabled={sourceDownloadStatus !== 'idle'} className="group relative p-4 bg-black/40 hover:bg-red-950/20 rounded-xl border border-white/5 hover:border-red-500/30 flex items-center justify-between transition-all overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="flex items-center gap-2 relative z-10"><Code size={16} className="text-red-500" /><span className="font-bold text-gray-200 group-hover:text-white transition-colors font-persian">{sourceDownloadStatus === 'downloading' ? t('downloading') : sourceDownloadStatus === 'success' ? t('sourceSaved') : t('getSource')}</span></div><div className="relative z-10 p-1.5 bg-zinc-800 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">{sourceDownloadStatus === 'downloading' ? (<RefreshCw size={14} className="animate-spin" />) : sourceDownloadStatus === 'success' ? (<Check size={14} />) : (<FileJson size={14} />)}</div></button>
             <button onClick={onOpenWhatsNew} className="group relative p-4 bg-black/40 hover:bg-purple-950/20 rounded-xl border border-white/5 hover:border-purple-500/30 flex items-center justify-between transition-all overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="flex items-center gap-2 relative z-10"><Sparkles size={16} className="text-purple-500" /><span className="font-bold text-gray-200 group-hover:text-white transition-colors font-persian">What's New</span></div></button>
           </div>
        </section>

        {/* Footer */}
        <footer className="mt-12"><div className="h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent mb-8"></div><div className="relative bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 rounded-2xl p-8 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)] overflow-hidden group"><div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-pink-600 to-red-600"></div><div className={`absolute ${isRTL ? '-left-20' : '-right-20'} -bottom-20 w-64 h-64 bg-red-600/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-red-600/20 transition-colors duration-500`}></div><div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8"><div className="flex items-center gap-4"><div className="relative"><div className="w-14 h-14 bg-gradient-to-br from-red-600 to-pink-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/40 animate-pulse-slow"><Heart className="w-7 h-7 text-white fill-white" /></div><div className={`absolute -top-1 ${isRTL ? '-left-1' : '-right-1'} w-3 h-3 bg-red-500 rounded-full animate-ping`}></div><div className={`absolute -top-1 ${isRTL ? '-left-1' : '-right-1'} w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900`}></div></div><div className={`text-center ${isRTL ? 'md:text-right' : 'md:text-left'}`}><p className="text-zinc-400 text-xs font-mono tracking-wider mb-1">DESIGNED & DEVELOPED BY</p><h3 className="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-500">RADINMNX</h3></div></div><div className="flex flex-wrap justify-center gap-3"><a href="mailto:radinmnx@gmail.com" className="group/btn relative px-4 py-2 bg-black/40 hover:bg-black/60 border border-white/5 hover:border-red-500/30 rounded-xl transition-all flex items-center gap-3 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div><div className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 group-hover/btn:text-white group-hover/btn:bg-red-600 transition-colors"><Mail size={16} /></div><span className="text-sm font-medium text-zinc-300 group-hover/btn:text-white transition-colors">radinmnx@gmail.com</span></a><a href="https://discord.gg/Fu3zVrkc" target="_blank" rel="noreferrer" className="group/btn relative px-4 py-2 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 hover:from-indigo-600 hover:to-purple-600 border border-indigo-500/30 rounded-xl transition-all flex items-center gap-3 shadow-lg shadow-indigo-900/20 hover:shadow-indigo-600/40 hover:-translate-y-1"><div className="p-1.5 bg-white/10 rounded-lg text-indigo-300 group-hover/btn:text-white transition-colors"><MessageCircle size={16} /></div><span className="text-sm font-bold text-indigo-100 group-hover/btn:text-white transition-colors">MNX Server</span></a></div></div><div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500"><div className="flex items-center gap-2"><span>© 2024 RADINMNX</span><span className="w-1 h-1 bg-zinc-600 rounded-full"></span><span>All rights reserved</span></div><div className="flex items-center gap-4"><div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-emerald-500 font-bold">SYSTEM ONLINE</span></div><span className="opacity-50">v{VERSION}</span></div></div></div></footer>
      </div>

      <MicSettingModal isOpen={isGainModalOpen} onClose={() => setIsGainModalOpen(false)} title={t('micGain')} description={t('micInputDesc')} value={micEqSettings.micGain} min={0} max={5} step={0.1} unit="x" icon={Zap} colorClass="text-emerald-500" gradientClass="from-emerald-600 to-green-600" onSave={handleGainChange} />
      <MicSettingModal isOpen={isClarityModalOpen} onClose={() => setIsClarityModalOpen(false)} title={t('micClarity')} description={t('micInputDesc')} value={micEqSettings.voiceClarity} min={0} max={15} step={1} unit="dB" icon={Waves} colorClass="text-cyan-500" gradientClass="from-cyan-600 to-blue-600" onSave={handleClarityChange} />
      <AdvancedAudioModal isOpen={isAdvancedAudioOpen} onClose={() => setIsAdvancedAudioOpen(false)} settings={micEqSettings} onUpdate={onMicEqChange} />
      <Mic10BandEqualizerModal isOpen={is10BandEqOpen} onClose={() => setIs10BandEqOpen(false)} gains={micEqSettings.eq10Bands || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]} onChange={(gains) => onMicEqChange({ ...micEqSettings, eq10Bands: gains })} />
      <ExtensionsModal isOpen={isExtensionsModalOpen} onClose={() => setIsExtensionsModalOpen(false)} />
    </div>
  );
};

export default Settings;
