
import React, { useState, useEffect } from 'react';
// Sidebar import removed
import SoundPad from './pages/SoundPad';
import Settings from './pages/Settings';
import MusicPlayer from './pages/MusicPlayer';
import MiniPlayer from './pages/MiniPlayer'; // Import MiniPlayer
import TitleBar from './components/TitleBar';
import LoadingScreen from './components/LoadingScreen';
import TrayMenu from './components/TrayMenu'; // Keep TrayMenu for context menu if needed later, but mainly unused in this flow
import HelpModal from './components/HelpModal';
import DeviceSelectorModal from './components/DeviceSelectorModal';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import UpdateModal from './components/UpdateModal';
import WhatsNewModal from './components/WhatsNewModal';
import { Page, MicEqSettings, AudioDevice, UpdateInfo, UpdateProgress } from './types';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { SmartCoreProvider, useSmartCore } from './context/SmartCoreContext'; // IMPORT CORE
import { Language } from './utils/translations';
import { VERSION } from './constants';

const AppContent: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const isTrayMode = urlParams.get('mode') === 'tray';
  const isMiniMode = urlParams.get('mode') === 'mini'; // Check for Mini Player Mode

  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>(Page.PAD);
  const [incomingMusicFile, setIncomingMusicFile] = useState<string | undefined>(undefined);
  
  const { setLanguage } = useLanguage();
  const { reportActivity } = useSmartCore(); 

  // Report navigation to Core
  useEffect(() => {
    reportActivity(currentPage);
  }, [currentPage, reportActivity]);

  // App Settings State
  const [monitorDeviceId, setMonitorDeviceId] = useState<string>(() => localStorage.getItem('monitorDeviceId') || '');
  const [injectorDeviceId, setInjectorDeviceId] = useState<string>(() => localStorage.getItem('injectorDeviceId') || '');
  const [micInputDeviceId, setMicInputDeviceId] = useState<string>(() => localStorage.getItem('micInputDeviceId') || 'default');
  const [masterVolume, setMasterVolume] = useState<number>(() => parseFloat(localStorage.getItem('masterVolume') || '1.0'));
  const [micVolume, setMicVolume] = useState<number>(() => parseFloat(localStorage.getItem('micVolume') || '1.0'));
  
  const [stopKeybind, setStopKeybind] = useState<string | null>(() => localStorage.getItem('stopKeybind') || null);

  // Mic EQ State
  const [micEqSettings, setMicEqSettings] = useState<MicEqSettings>(() => {
    const saved = localStorage.getItem('micEqSettings');
    return saved ? JSON.parse(saved) : { 
      micGain: 1.0, 
      voiceClarity: 0,
      noiseSuppression: false,
      noiseGateThreshold: -100, // Default OFF
      echoCancellation: false,
      compressor: false
    };
  });

  // Device Lists
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);

  // Modals State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [activeDeviceSelector, setActiveDeviceSelector] = useState<'mic' | 'injector' | 'monitor' | null>(null);

  // Update State
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  // Persistence
  useEffect(() => {
    if (isTrayMode || isMiniMode) return;
    localStorage.setItem('monitorDeviceId', monitorDeviceId);
    localStorage.setItem('injectorDeviceId', injectorDeviceId);
    localStorage.setItem('micInputDeviceId', micInputDeviceId);
    localStorage.setItem('masterVolume', masterVolume.toString());
    localStorage.setItem('micVolume', micVolume.toString());
    localStorage.setItem('micEqSettings', JSON.stringify(micEqSettings));

    if (stopKeybind) localStorage.setItem('stopKeybind', stopKeybind);
    else localStorage.removeItem('stopKeybind');
  }, [monitorDeviceId, injectorDeviceId, micInputDeviceId, masterVolume, micVolume, micEqSettings, stopKeybind, isTrayMode, isMiniMode]);

  // --- DEVICE FETCHING ---
  const getDevices = async () => {
    setIsRefreshingDevices(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }).catch(console.warn);
      const dev = await navigator.mediaDevices.enumerateDevices();
      setInputDevices(dev.filter(d => d.kind === 'audioinput') as any);
      setOutputDevices(dev.filter(d => d.kind === 'audiooutput') as any);
    } catch (err) {
      console.error("Error fetching devices", err);
    } finally {
      setIsRefreshingDevices(false);
    }
  };

  useEffect(() => {
    if (!isTrayMode && !isMiniMode) getDevices();
  }, [isTrayMode, isMiniMode]);

  // Startup checks
  useEffect(() => {
    if (!isTrayMode && !isMiniMode && !isLoading) {
      const hasPickedLanguage = localStorage.getItem('hasPickedLanguage');
      const hasSeenHelp = localStorage.getItem('hasSeenHelp');
      const lastVersion = localStorage.getItem('last_version');

      if (!hasPickedLanguage) setIsLanguageModalOpen(true);
      else if (!hasSeenHelp) setIsHelpOpen(true);
      else if (lastVersion !== VERSION) {
          setIsWhatsNewOpen(true);
          localStorage.setItem('last_version', VERSION);
      }

      if (window.electronAPI) {
          window.electronAPI.checkForUpdates();
          const cleanupFile = window.electronAPI.onFileOpened((path) => {
             setIncomingMusicFile(path);
             setCurrentPage(Page.MUSIC);
          });
          return cleanupFile;
      }
    }
  }, [isLoading, isTrayMode, isMiniMode]);

  // RENDER MODES
  if (isMiniMode) return <MiniPlayer />;
  if (isTrayMode) return <TrayMenu />; // Fallback if tray mode is ever used directly

  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      
      <div className={`flex flex-col h-screen w-screen overflow-hidden bg-black text-white selection:bg-red-500 selection:text-white border border-red-900/20 rounded-lg transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        
        <TitleBar 
            currentPage={currentPage} 
            setPage={setCurrentPage} 
            showUpdateIcon={!!updateInfo && !isUpdateModalOpen}
            isUpdateReady={updateDownloaded}
            onUpdateClick={() => setIsUpdateModalOpen(true)}
        />

        <div className="flex flex-1 overflow-hidden relative">
          <main className="flex-1 relative overflow-hidden bg-zinc-950 transition-all duration-300">
            
            <div className={`absolute inset-0 transition-all duration-500 ease-out ${currentPage === Page.PAD ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-10 scale-95 -z-10 pointer-events-none'}`}>
              <SoundPad 
                monitorDeviceId={monitorDeviceId} 
                injectorDeviceId={injectorDeviceId}
                micInputDeviceId={micInputDeviceId}
                masterVolume={masterVolume}
                micVolume={micVolume}
                micEqSettings={micEqSettings}
                stopKeybind={stopKeybind}
                onStopKeybindChange={setStopKeybind}
              />
            </div>

            <div className={`absolute inset-0 transition-all duration-500 ease-out ${currentPage === Page.MUSIC ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-10 scale-95 -z-10 pointer-events-none'}`}>
               <MusicPlayer 
                  monitorDeviceId={monitorDeviceId}
                  masterVolume={masterVolume}
                  initialFile={incomingMusicFile}
               />
            </div>

            <div className={`absolute inset-0 transition-all duration-500 ease-out ${currentPage === Page.SETTINGS ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-10 scale-95 -z-10 pointer-events-none'}`}>
              <Settings 
                monitorDeviceId={monitorDeviceId} 
                injectorDeviceId={injectorDeviceId}
                micInputDeviceId={micInputDeviceId}
                onMonitorChange={setMonitorDeviceId}
                onInjectorChange={setInjectorDeviceId}
                onMicInputChange={setMicInputDeviceId}
                masterVolume={masterVolume}
                onMasterVolumeChange={setMasterVolume}
                micVolume={micVolume}
                onMicVolumeChange={setMicVolume}
                micEqSettings={micEqSettings}
                onMicEqChange={setMicEqSettings}
                onOpenHelp={() => { setIsHelpOpen(true); getDevices(); }}
                onOpenWhatsNew={() => setIsWhatsNewOpen(true)}
                inputDevices={inputDevices}
                outputDevices={outputDevices}
                onRefreshDevices={getDevices}
                isRefreshingDevices={isRefreshingDevices}
                onOpenSelector={setActiveDeviceSelector}
              />
            </div>
          </main>
        </div>

        {isLanguageModalOpen && <LanguageSelectorModal isOpen={isLanguageModalOpen} onSelect={(l) => { setLanguage(l); setIsLanguageModalOpen(false); setTimeout(() => setIsHelpOpen(true), 300); }} />}
        {isHelpOpen && <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} micInputDeviceId={micInputDeviceId} injectorDeviceId={injectorDeviceId} monitorDeviceId={monitorDeviceId} inputDevices={inputDevices} outputDevices={outputDevices} onOpenSelector={setActiveDeviceSelector} />}
        <UpdateModal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} updateInfo={updateInfo} progress={updateProgress} isDownloaded={updateDownloaded} onDownload={() => window.electronAPI.downloadUpdate()} onInstall={() => window.electronAPI.installUpdate()} />
        {isWhatsNewOpen && <WhatsNewModal isOpen={isWhatsNewOpen} onClose={() => setIsWhatsNewOpen(false)} />}

        <DeviceSelectorModal isOpen={activeDeviceSelector === 'mic'} onClose={() => setActiveDeviceSelector(null)} title="Microphone Input" description="Select your Real Microphone." devices={inputDevices} selectedDeviceId={micInputDeviceId} onSelect={setMicInputDeviceId} type="input" customOptions={[{ deviceId: 'default', label: 'Default Input' }]} />
        <DeviceSelectorModal isOpen={activeDeviceSelector === 'injector'} onClose={() => setActiveDeviceSelector(null)} title="Injector Output" description="Select CABLE Input (VB-Audio)." devices={outputDevices} selectedDeviceId={injectorDeviceId} onSelect={setInjectorDeviceId} type="output" customOptions={[{ deviceId: '', label: 'None (Don\'t inject)' }]} />
        <DeviceSelectorModal isOpen={activeDeviceSelector === 'monitor'} onClose={() => setActiveDeviceSelector(null)} title="Monitor Output" description="Where YOU hear sounds." devices={outputDevices} selectedDeviceId={monitorDeviceId} onSelect={setMonitorDeviceId} type="output" customOptions={[{ deviceId: '', label: 'Default System Output' }]} />
      </div>
    </>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <SmartCoreProvider>
      <AppContent />
    </SmartCoreProvider>
  </LanguageProvider>
);

export default App;
