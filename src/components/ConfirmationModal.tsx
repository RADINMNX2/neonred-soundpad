
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  count?: number;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  count
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in" 
        onClick={onClose}
      ></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-sm bg-zinc-950 border border-red-500/20 rounded-3xl shadow-2xl shadow-red-900/40 animate-slide-up overflow-hidden group">
        
        {/* Ambient Glow */}
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-red-600/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-600 to-red-600"></div>

        <div className="p-8 flex flex-col items-center text-center relative z-10">
          
          {/* Animated Icon */}
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse-slow"></div>
            <div className="w-20 h-20 bg-gradient-to-br from-zinc-900 to-black border border-red-500/30 rounded-full flex items-center justify-center shadow-lg relative z-10">
               <AlertTriangle size={36} className="text-red-500" />
            </div>
             {count && count > 0 && (
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold border-4 border-zinc-950 z-20">
                    {count}
                </div>
            )}
          </div>

          <h3 className="text-2xl font-bold text-white mb-2 font-persian">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-8 font-persian">
            {description}
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onClose}
              className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-gray-300 rounded-xl font-medium transition-colors border border-white/5 font-persian"
            >
              {cancelText || t('cancel')}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 font-persian group/btn"
            >
              <Trash2 size={18} className="group-hover/btn:animate-bounce" />
              {confirmText || t('confirmDelete')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
