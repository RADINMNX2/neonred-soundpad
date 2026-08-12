
import React, { useState, useEffect } from 'react';
import { X, Save, Sliders, Check, FolderOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ProfilesModal from './ProfilesModal';

export type EQProfile = {
  id: string;
  name: string;
  gains: number[]; 
};

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  gains: number[]; 
  onGainChange: (index: number, value: number) => void;
  onLoadProfile: (gains: number[]) => void;
}

const FREQUENCIES = ['60', '170', '310', '600', '1k', '3k', '6k', '12k', '14k', '16k'];

const DEFAULT_PROFILES: EQProfile[] = [
  { id: 'flat', name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'bass', name: 'Bass Boost', gains: [8, 6, 3, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'treble', name: 'Treble Boost', gains: [0, 0, 0, 0, 0, 3, 6, 8, 9, 10] },
  { id: 'rock', name: 'Rock', gains: [4, 3, 1, -2, -4, -2, 1, 3, 4, 5] },
];

const EqualizerModal: React.FC<EqualizerModalProps> = ({ 
  isOpen, 
  onClose, 
  gains, 
  onGainChange,
  onLoadProfile
}) => {
  const { t, isRTL } = useLanguage();
  const [profiles, setProfiles] = useState<EQProfile[]>(() => {
      const saved = localStorage.getItem('eq_profiles');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
  });
  const [newProfileName, setNewProfileName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);

  useEffect(() => {
      localStorage.setItem('eq_profiles', JSON.stringify(profiles));
  }, [profiles]);

  const handleSaveProfile = () => {
      if (!newProfileName.trim()) return;
      const newProfile: EQProfile = {
          id: Date.now().toString(),
          name: newProfileName,
          gains: [...gains]
      };
      setProfiles(prev => [...prev, newProfile]);
      setNewProfileName('');
      setShowSaveInput(false);
  };

  const handleRenameProfile = (id: string, newName: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const handleDeleteProfile = (id: string) => {
      setProfiles(prev => prev.filter(p => p.id !== id));
  };

  const handleSelectProfile = (profile: EQProfile) => {
    onLoadProfile(profile.gains);
    setIsProfilesModalOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity animate-fade-in" onClick={onClose}></div>
      
      <div className="relative bg-zinc-950 border border-purple-500/20 rounded-3xl w-full max-w-4xl shadow-2xl shadow-purple-900/40 animate-slide-up overflow-hidden">
        
        {/* Header */}
        <div className="relative p-6 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600"></div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                    <Sliders size={20} />
                </div>
                <h2 className="text-xl font-bold text-white font-persian">{t('equalizer')}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        {/* Sliders Area - Revamped Layout */}
        <div className="p-10 bg-black/30">
            <div className="flex justify-between items-center gap-1 h-80">
                {gains.map((gain, i) => (
                    <div key={i} className="flex flex-col items-center h-full flex-1 group">
                        {/* Gain Value Display (Top) */}
                        <div className="h-8 mb-4">
                            <span className="text-[10px] font-mono font-bold text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {gain > 0 ? `+${gain}` : gain}dB
                            </span>
                        </div>

                        {/* Slider Container */}
                        <div className="relative flex-1 w-full flex justify-center items-center">
                            {/* Visual Track Line */}
                            <div className="absolute h-full w-0.5 bg-zinc-800 rounded-full"></div>
                            
                            <input 
                                type="range"
                                min="-12"
                                max="12"
                                step="0.5"
                                value={gain}
                                onChange={(e) => onGainChange(i, parseFloat(e.target.value))}
                                className="
                                    absolute -rotate-90 
                                    w-48 h-1.5 bg-transparent appearance-none cursor-pointer 
                                    focus:outline-none z-10
                                    [&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:w-4
                                    [&::-webkit-slider-thumb]:h-4
                                    [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:bg-purple-500
                                    [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(168,85,247,0.6)]
                                    [&::-webkit-slider-thumb]:border-2
                                    [&::-webkit-slider-thumb]:border-white
                                    [&::-webkit-slider-thumb]:transition-transform
                                    [&::-webkit-slider-thumb]:hover:scale-125
                                "
                            />
                        </div>

                        {/* Frequency Display (Bottom) */}
                        <div className="mt-6">
                            <span className="text-[11px] font-mono font-black text-gray-500 group-hover:text-white transition-colors">
                                {FREQUENCIES[i]}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-900/50 border-t border-white/5 flex justify-between items-center">
            <button 
                onClick={() => setIsProfilesModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl text-sm font-bold text-gray-300 hover:text-white transition-all shadow-lg active:scale-95"
            >
                <FolderOpen size={18} />
                {t('eqProfiles')}
            </button>
            
            {showSaveInput ? (
                <div className="flex gap-2 animate-fade-in">
                    <input 
                        type="text" 
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        placeholder="Profile Name"
                        className="bg-black/60 border border-purple-500/50 rounded-xl px-4 py-2 text-sm text-white focus:border-purple-500 outline-none w-48 shadow-inner"
                        autoFocus
                    />
                    <button onClick={handleSaveProfile} className="p-2 bg-green-600 rounded-xl text-white hover:bg-green-500 shadow-lg active:scale-90 transition-all"><Check size={18}/></button>
                    <button onClick={() => setShowSaveInput(false)} className="p-2 bg-zinc-700 rounded-xl text-white hover:bg-zinc-600 shadow-lg active:scale-90 transition-all"><X size={18}/></button>
                </div>
            ) : (
                <button 
                    onClick={() => setShowSaveInput(true)}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/30 active:scale-95 transition-all"
                >
                    <Save size={18} /> {t('saveProfile')}
                </button>
            )}
        </div>

      </div>

      <ProfilesModal 
        isOpen={isProfilesModalOpen}
        onClose={() => setIsProfilesModalOpen(false)}
        profiles={profiles}
        onSelect={handleSelectProfile}
        onDelete={handleDeleteProfile}
        onRename={handleRenameProfile}
      />
    </div>
  );
};

export default EqualizerModal;
