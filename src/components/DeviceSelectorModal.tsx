
import React, { useState, useEffect } from 'react';
import { X, Check, Speaker, Mic2, Search, AlertCircle } from 'lucide-react';
import { AudioDevice } from '../types';

interface DeviceSelectorModalProps {
  title: string;
  description: string;
  devices: AudioDevice[];
  selectedDeviceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (deviceId: string) => void;
  type: 'input' | 'output';
  customOptions?: { deviceId: string, label: string }[];
}

const DeviceSelectorModal: React.FC<DeviceSelectorModalProps> = ({ 
  title, 
  description, 
  devices, 
  selectedDeviceId, 
  isOpen, 
  onClose, 
  onSelect,
  type,
  customOptions = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Combine custom options (like "Default" or "None") with real devices
  const allOptions = [
    ...customOptions,
    ...devices.map(d => ({ deviceId: d.deviceId, label: d.label || `Unknown Device (${d.deviceId?.slice(0, 5) || '?'}...)` }))
  ];

  const SELECTED_CLASSES = {
    input: 'bg-purple-900/20 border-purple-500/50',
    output: 'bg-red-900/20 border-red-500/50',
  };

  const filteredDevices = allOptions.filter(d => 
    d.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg h-[80vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/5 bg-zinc-950/50">
           <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${type === 'input' ? 'from-purple-600 to-indigo-600' : 'from-red-600 to-pink-600'}`}></div>
           
           <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                 <div className={`p-3 rounded-xl ${type === 'input' ? 'bg-purple-500/10 text-purple-500' : 'bg-red-500/10 text-red-500'}`}>
                    {type === 'input' ? <Mic2 size={24} /> : <Speaker size={24} />}
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <p className="text-sm text-gray-400">{description}</p>
                 </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
                <X size={20} />
              </button>
           </div>

           {/* Search Bar */}
           <div className="mt-6 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
             <input 
               type="text" 
               placeholder="Search devices..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white/20 transition-all placeholder-gray-600"
               autoFocus
             />
           </div>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
               <AlertCircle size={32} />
               <p>No devices found</p>
            </div>
          ) : (
            filteredDevices.map((device) => {
              const isSelected = device.deviceId === selectedDeviceId;
              return (
                <button
                  key={device.deviceId}
                  onClick={() => handleSelect(device.deviceId)}
                  className={`
                    w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group
                    ${isSelected 
                      ? SELECTED_CLASSES[type] 
                      : 'bg-zinc-800/30 border-white/5 hover:bg-zinc-800 hover:border-white/10'
                    }
                  `}
                >
                  <div className="flex items-center gap-4 text-left">
                     <div className={`
                       w-10 h-10 rounded-full flex items-center justify-center transition-colors
                       ${isSelected 
                          ? `${type === 'input' ? 'bg-purple-500 text-white' : 'bg-red-500 text-white'} shadow-lg` 
                          : 'bg-zinc-700/50 text-gray-400 group-hover:bg-zinc-700 group-hover:text-white'
                       }
                     `}>
                        {type === 'input' ? <Mic2 size={18} /> : <Speaker size={18} />}
                     </div>
                     <div className="flex flex-col items-start">
                        <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                          {device.label}
                        </span>
                        {isSelected && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${type === 'input' ? 'text-purple-400' : 'text-red-400'}`}>
                            Active Device
                          </span>
                        )}
                     </div>
                  </div>
                  
                  {isSelected && (
                    <div className={`p-1 rounded-full ${type === 'input' ? 'bg-purple-500' : 'bg-red-500'}`}>
                       <Check size={14} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
        
        {/* Footer info */}
        <div className="p-4 bg-black/20 border-t border-white/5 text-center text-xs text-gray-500 font-mono">
           {filteredDevices.length} DEVICES DETECTED
        </div>
      </div>
    </div>
  );
};

export default DeviceSelectorModal;
