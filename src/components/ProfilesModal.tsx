
import React, { useState } from 'react';
import { X, Trash2, Pencil, Check, Folder, Save, ShieldAlert } from 'lucide-react';
import { EQProfile, DEFAULT_PROFILE_IDS } from './EqualizerModal';

interface ProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: EQProfile[];
  onSelect: (profile: EQProfile) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

const ProfilesModal: React.FC<ProfilesModalProps> = ({ 
  isOpen, 
  onClose, 
  profiles, 
  onSelect, 
  onDelete, 
  onRename 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const startEditing = (profile: EQProfile) => {
    setEditingId(profile.id);
    setEditName(profile.name);
    setErrorMsg(null);
  };

  const saveEditing = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
      setEditingId(null);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDeleteClick = (profile: EQProfile) => {
    if (DEFAULT_PROFILE_IDS.includes(profile.id)) {
      setErrorMsg(`"${profile.name}" is a default profile and cannot be deleted`);
      return;
    }
    setErrorMsg(null);
    onDelete(profile.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative bg-zinc-950 border border-purple-500/20 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-900/40 animate-slide-up overflow-hidden flex flex-col max-h-[70vh]">
        
        {/* Header */}
        <div className="relative p-6 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600"></div>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                    <Folder size={20} />
                </div>
                <h2 className="text-xl font-bold text-white font-persian">Saved Profiles</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                <X size={20} />
            </button>
        </div>

        {/* Profile List */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-2">
            {profiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Save size={48} className="opacity-20 mb-4" />
                    <p>No saved profiles yet</p>
                </div>
            ) : (
                profiles.map(profile => (
                    <div 
                        key={profile.id}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-zinc-900/30 border border-white/5 hover:border-purple-500/30 hover:bg-zinc-800/50 transition-all"
                    >
                        <div 
                            className="flex-1 cursor-pointer flex items-center gap-3"
                            onClick={() => onSelect(profile)}
                        >
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-gray-500 font-bold text-xs">
                                EQ
                            </div>
                            
                            {editingId === profile.id ? (
                                <input 
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 bg-black/50 border border-purple-500 rounded px-2 py-1 text-white text-sm outline-none"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing();
                                        if (e.key === 'Escape') cancelEditing();
                                    }}
                                />
                            ) : (
                                <span className="text-gray-200 font-medium">{profile.name}</span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {editingId === profile.id ? (
                                <>
                                    <button 
                                        onClick={saveEditing}
                                        className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors"
                                    >
                                        <Check size={16} />
                                    </button>
                                    <button 
                                        onClick={cancelEditing}
                                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => startEditing(profile)}
                                        className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Rename"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    {/* Don't allow deleting default profiles if you wanted to protect them, logic here */}
                                    <button 
                                        onClick={() => handleDeleteClick(profile)}
                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
        
        {/* Footer info */}
        <div className="p-4 bg-black/20 border-t border-white/5 text-center text-xs text-gray-500 font-mono">
           {errorMsg ? (
             <span className="text-red-400 flex items-center justify-center gap-1.5"><ShieldAlert size={12} />{errorMsg}</span>
           ) : (
             `${profiles.length} PROFILES SAVED`
           )}
        </div>
      </div>
    </div>
  );
};

export default ProfilesModal;
