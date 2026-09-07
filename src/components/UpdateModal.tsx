import React from 'react';
import { Download, RefreshCw, X, Check, ArrowRight, Zap, Rocket, Gauge, Clock, ShieldCheck, HardDrive } from 'lucide-react';
import { UpdateInfo, UpdateProgress } from '../types';
import { useEscapeKey } from '../utils/useEscapeKey';
import { useLanguage } from '../context/LanguageContext';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void; // Triggered if user says "No"
  updateInfo: UpdateInfo | null;
  progress: UpdateProgress | null;
  isDownloaded: boolean;
  onDownload: () => void;
  onInstall: () => void;
}

const fmtBytes = (bytes: number) => (bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '— MB');
const fmtSpeed = (bps: number) => (bps > 0 ? `${(bps / 1024 / 1024).toFixed(1)} MB/s` : '— MB/s');
const fmtEta = (sec: number) => {
  if (!isFinite(sec) || sec <= 0) return '—';
  if (sec < 60) return `${Math.max(1, Math.round(sec))}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  progress,
  isDownloaded,
  onDownload,
  onInstall
}) => {
  useEscapeKey(isOpen, onClose);
  const { t, isRTL } = useLanguage();
  if (!isOpen || !updateInfo) return null;

  const isDownloading = progress !== null && progress.percent < 100 && !isDownloaded;
  const pct = isDownloading && progress ? Math.max(0, Math.min(100, progress.percent)) : 100;
  const speed = isDownloading && progress ? progress.bytesPerSecond : 0;
  const remaining = isDownloading && progress && progress.total > 0 ? progress.total - progress.transferred : 0;
  const eta = speed > 0 ? remaining / speed : 0;
  const R = 34;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-2xl animate-fade-in"></div>

      {/* Modal Window */}
      <div className="relative w-full max-w-md bg-zinc-950/90 border border-emerald-500/20 rounded-[2rem] shadow-[0_0_80px_rgba(16,185,129,0.18)] animate-slide-up overflow-hidden backdrop-blur-2xl">
        {/* Ambient glows */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-500/10 blur-[70px] rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-pink-600/10 blur-[70px] rounded-full pointer-events-none"></div>
        {/* Animated accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-[length:200%_100%] animate-gradient-x"></div>

        <div className="p-8 text-center relative z-10" dir={isRTL ? 'rtl' : 'ltr'}>

          {/* Phase pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-6">
            {isDownloaded ? (
              <><Check size={11} className="text-emerald-400" /><span className="text-emerald-300">{t('updatePhaseReady')}</span></>
            ) : isDownloading ? (
              <><RefreshCw size={11} className="text-teal-300 animate-spin" /><span className="text-teal-300">{t('updatePhaseDl')}</span></>
            ) : (
              <><Zap size={11} className="text-amber-300" /><span className="text-amber-200">{t('updatePhaseNew')}</span></>
            )}
          </div>

          {/* Icon / Progress Ring */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
              <circle cx="40" cy="40" r={R} fill="none" strokeWidth="5.5" className="stroke-white/10" />
              <circle
                cx="40" cy="40" r={R} fill="none" strokeWidth="5.5" strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - pct / 100)}
                className={isDownloaded ? 'stroke-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]' : 'stroke-emerald-400'}
                style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isDownloaded ? (
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
                  <Check size={26} className="text-emerald-400" />
                </div>
              ) : isDownloading ? (
                <span className="font-mono font-black text-white text-lg tabular-nums">{Math.round(pct)}<span className="text-xs text-gray-400">%</span></span>
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
                  <Download size={24} className="text-emerald-400" />
                </div>
              )}
            </div>
            {isDownloaded ? (
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-ping"></div>
            ) : isDownloading ? (
              <div className="absolute inset-0 rounded-full border border-teal-400/30 animate-pulse"></div>
            ) : (
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping"></div>
            )}
          </div>

          <h2 className="text-xl font-black text-white mb-2 font-persian tracking-tight">
            {isDownloaded ? t('updateReady') : isDownloading ? t('updateDownloading') : t('updateAvailable')}
          </h2>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-300 font-mono text-sm font-bold mb-4">
            <Rocket size={14} />
            v{updateInfo.version}
          </div>

          {!isDownloading && !isDownloaded && (
            <p className="text-gray-400 text-sm mb-6 font-persian leading-relaxed">
              {t('updateAvailableDesc')}
            </p>
          )}

          {isDownloading && progress && (
            <div className="space-y-4 mb-6">
              {/* Live stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <Gauge size={14} className="text-teal-300 mb-1 mx-auto" />
                  <div className="font-mono font-bold text-white text-sm tabular-nums">{fmtSpeed(speed)}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">{t('updateSpeed')}</div>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <HardDrive size={14} className="text-emerald-300 mb-1 mx-auto" />
                  <div className="font-mono font-bold text-white text-sm tabular-nums">{fmtBytes(progress.transferred)}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">{t('updateOf')} {fmtBytes(progress.total)}</div>
                </div>
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3">
                  <Clock size={14} className="text-amber-300 mb-1 mx-auto" />
                  <div className="font-mono font-bold text-white text-sm tabular-nums">{fmtEta(eta)}</div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">{t('updateRemaining')}</div>
                </div>
              </div>

              {/* Bar */}
              <div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 bg-[length:200%_100%] animate-gradient-x transition-[width] duration-300 relative"
                    style={{ width: `${pct}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                  </div>
                </div>
              </div>

              {/* Engine chip */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-emerald-300/80">
                <ShieldCheck size={11} /> {t('updateDiffDl')}
              </div>
            </div>
          )}

          {!isDownloading && !isDownloaded && (
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-emerald-300/70 mb-6">
              <ShieldCheck size={11} /> {t('updateDiff')}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            {isDownloaded ? (
              <button
                onClick={onInstall}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/40 transition-all active:scale-[0.97] flex items-center justify-center gap-2 group"
              >
                <Zap size={20} className="fill-white group-hover:animate-pulse" />
                {t('updateInstall')}
              </button>
            ) : isDownloading ? (
              <div className="w-full py-4 bg-white/[0.04] text-gray-500 font-bold rounded-2xl border border-white/5 cursor-wait flex items-center justify-center gap-2">
                <RefreshCw size={18} className="animate-spin" />
                {t('updateWait')}
              </div>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-white/[0.05] hover:bg-white/10 text-gray-300 font-bold rounded-2xl border border-white/10 transition-colors active:scale-95"
                >
                  {t('updateLater')}
                </button>
                <button
                  onClick={onDownload}
                  className="flex-[2] py-3.5 bg-white text-black hover:bg-gray-200 font-black rounded-2xl shadow-lg shadow-black/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {t('updateYes')}
                  <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
                </button>
              </>
            )}
          </div>

          {/* Close (only when not busy) */}
          {!isDownloading && (
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-all">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;