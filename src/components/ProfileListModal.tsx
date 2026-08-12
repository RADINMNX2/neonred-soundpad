
import React, { useState } from 'react';
import { X, Save, Trash2, Edit2, Play, Check } from 'lucide-react';
import { EQProfile } from './EqualizerModal';
import { useLanguage } from '../context/LanguageContext';

interface ProfileListModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: EQProfile[];
  onSelect: (profile: EQProfile) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  currentProfileId?: string;
}

const ProfileListModal: React.FC<ProfileListModalProps> = ({ 
  isOpen, 
  onClose, 
  profiles, 
  onSelect, 
  onDelete, 
  onRename,
  currentProfileId 
}) => {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const startEdit = (profile: EQProfile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      onRename(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity animate-fade-in" onClick={onClose}></div>
      
      <div className="relative bg-zinc-950 border border-purple-500/20 rounded-3xl w-full max-w-md shadow-2xl shadow-purple-900/30 animate-slide-up overflow-hidden flex flex-col max-h-[70vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center shrink-0">
            <h2 className="text-xl font-bold text-white font-persian">Saved Profiles</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={20}/>
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {profiles.length === 0 ? (
                <div className="text-center text-gray-500 py-8 text-sm">
                    No saved profiles yet.
                </div>
            ) : (
                profiles.map(profile => (
                    <div 
                        key={profile.id} 
                        className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                            currentProfileId === profile.id 
                            ? 'bg-purple-900/20 border-purple-500/50' 
                            : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
                        }`}
                    >
                        {editingId === profile.id ? (
                            <div className="flex-1 flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 bg-black/50 border border-purple-500 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(profile.id)}
                                />
                                <button onClick={() => saveEdit(profile.id)} className="p-1.5 bg-green-600 rounded-lg text-white hover:bg-green-500">
                                    <Check size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2 rounded-full ${currentProfileId === profile.id ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-gray-400'}`}>
                                    <Save size={14} />
                                </div>
                                <span className={`text-sm font-medium truncate ${currentProfileId === profile.id ? 'text-white' : 'text-gray-300'}`}>
                                    {profile.name}
                                </span>
                            </div>
                        )}

                        {!editingId && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => onSelect(profile)}
                                    className="p-2 hover:bg-purple-600 hover:text-white rounded-lg text-gray-400 transition-colors"
                                    title="Load Profile"
                                >
                                    <Play size={14} />
                                </button>
                                <button 
                                    onClick={() => startEdit(profile)}
                                    className="p-2 hover:bg-zinc-700 hover:text-white rounded-lg text-gray-400 transition-colors"
                                    title="Rename"
                                >
                                    <Edit2 size={14} />
                                </button>
                                {/* Prevent deleting default profiles if you wanted, but for now allow all saved ones */}
                                {['flat', 'bass', 'treble', 'vocal', 'rock'].includes(profile.id) ? null : (
                                    <button 
                                        onClick={() => onDelete(profile.id)}
                                        className="p-2 hover:bg-red-600 hover:text-white rounded-lg text-gray-400 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>

        <div className="p-4 border-t border-white/5 bg-zinc-900/30 text-center">
            <span className="text-xs text-gray-500 font-mono">{profiles.length} PROFILES AVAILABLE</span>
        </div>

      </div>
    </div>
  );
};

export default ProfileListModal;
