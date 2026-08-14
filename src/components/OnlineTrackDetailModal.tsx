import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ArrowLeft, Play, Pause, Download, Check, Loader2, Disc, Clock, Calendar, Tag, Radio, Music } from 'lucide-react';
import { OnlineTrack, QualityOption, SpatiflacExtension } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface OnlineTrackDetailModalProps {
  track: OnlineTrack | null;
  extensions: SpatiflacExtension[];
  contextTracks: OnlineTrack[];
  onClose: () => void;
  onPlay: (track: OnlineTrack, contextTracks: OnlineTrack[]) => Promise<{ success: boolean; isPreview?: boolean; cached?: boolean; error?: string }>;
  onDownload: (track: OnlineTrack, quality: QualityOption, onProgress?: (percent: number) => void) => Promise<{ success: boolean; path?: string; error?: string; isFallback: boolean; fallbackExt?: string }>;
}

const OnlineTrackDetailModal: React.FC<OnlineTrackDetailModalProps> = ({ track, extensions, contextTracks, onClose, onPlay, onDownload }) => {
  const { t } = useLanguage();
  const ext = track ? extensions.find(e => e.id === track.extensionId) : undefined;
  const [selectedQualityId, setSelectedQualityId] = useState<string>('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [playing, setPlaying] = useState(false);
  const previewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.pause();
      previewRef.current.src = '';
    }
    setIsPreviewPlaying(false);
    setDownloading(false);
    setProgress(0);
    setStatus('idle');
    setStatusMsg('');
    setPlaying(false);
    if (track && ext) {
      const firstAvailable = ext.qualityOptions.find(q => q.available) || ext.qualityOptions[0];
      setSelectedQualityId(firstAvailable ? firstAvailable.id : (ext.qualityOptions[0]?.id || ''));
    }
  }, [track, ext]);

  useEffect(() => {
    return () => {
      if (previewRef.current) previewRef.current.pause();
    };
  }, []);

  const togglePreview = useCallback(() => {
    if (!track?.previewUrl) return;
    const audio = previewRef.current;
    if (!audio) return;
    if (isPreviewPlaying) {
      audio.pause();
      setIsPreviewPlaying(false);
      return;
    }
    if (audio.src !== track.previewUrl) {
      audio.src = track.previewUrl;
    }
    audio.play().catch(() => setIsPreviewPlaying(false));
    setIsPreviewPlaying(true);
  }, [track, isPreviewPlaying]);

  const selectedQuality = ext?.qualityOptions.find(q => q.id === selectedQualityId) || ext?.qualityOptions[0];

  const handlePlay = async () => {
    if (!track || playing) return;
    setPlaying(true);
    setStatus('idle');
    setStatusMsg('');
    const res = await onPlay(track, contextTracks);
    setPlaying(false);
    if (!res.success) {
      setStatus('error');
      setStatusMsg(res.error || t('playFailed'));
    } else if (res.isPreview) {
      setStatus('done');
      setStatusMsg(t('playPreviewFallback'));
    }
  };

  const handleDownload = async () => {
    if (!track || !selectedQuality || downloading) return;
    setDownloading(true);
    setProgress(0);
    setStatus('idle');
    const res = await onDownload(track, selectedQuality, setProgress);
    setDownloading(false);
    if (res.success) {
      setStatus('done');
      setStatusMsg(res.isFallback ? t('fallbackNote').replace('{source}', ext?.name || '') : t('downloadReady'));
    } else {
      setStatus('error');
      setStatusMsg(res.error || t('downloadFailed'));
    }
  };

  if (!track) return null;

  const format = (s?: number) => {
    if (!s || isNaN(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <audio ref={previewRef} />
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={onClose}></div>

      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-zinc-950 border border-white/10 rounded-[2rem] shadow-2xl shadow-pink-900/30 overflow-hidden animate-slide-up">

        {/* Hero */}
        <div className="relative h-56 w-full bg-zinc-900 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-60 scale-110" style={track.cover ? { backgroundImage: `url(${track.cover})` } : {}}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-40 h-40 rounded-2xl shadow-2xl border-4 border-white/10 overflow-hidden group">
              {track.cover ? (
                <img src={track.cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center"><Music size={48} className="text-zinc-600" /></div>
              )}
              <span className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10px] font-black uppercase backdrop-blur-md flex items-center gap-1.5" style={{ color: track.extensionColor, backgroundColor: `${track.extensionColor}33`, border: `1px solid ${track.extensionColor}55` }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: track.extensionColor }}></span>
                {track.extensionName}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors border border-white/10 z-20"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 -mt-4 rounded-t-[2rem] border-t border-white/5 z-10 p-6">
          <h2 className="text-2xl font-black text-white font-persian leading-tight">{track.title}</h2>
          <p className="text-gray-400 font-medium mt-1 font-persian">{track.artist}</p>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {track.album && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/5 text-[11px] text-gray-300"><Disc size={12} className="text-zinc-500" />{track.album}</span>}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/5 text-[11px] text-gray-300"><Clock size={12} className="text-zinc-500" />{format(track.duration)}</span>
            {track.genre && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/5 text-[11px] text-gray-300"><Tag size={12} className="text-zinc-500" />{track.genre}</span>}
            {track.releaseDate && <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/5 text-[11px] text-gray-300"><Calendar size={12} className="text-zinc-500" />{track.releaseDate.slice(0, 10)}</span>}
          </div>

          {/* Extension used */}
          <div className="mt-5 p-4 rounded-2xl bg-black/40 border border-white/5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Radio size={11} />{t('extensionUsed')}</div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: `linear-gradient(135deg, ${track.extensionColor}, ${track.extensionColor}88)` }}>
                {track.extensionName.charAt(0)}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{track.extensionName}</p>
                <p className="text-[11px] text-gray-500">{t('viaExtension')}: {track.extensionId.replace(/-/g, ' ')}</p>
              </div>
            </div>
          </div>

          {/* Quality boxes */}
          <div className="mt-5">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('qualityTitle')}</div>
            <p className="text-xs text-gray-500 mb-3 font-persian">{t('qualityDesc')}</p>
            {selectedQuality?.engine === 'flac' && (
              <div className="mb-3 flex items-start gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-gray-400">
                <Disc size={14} className="text-pink-500 shrink-0 mt-0.5" />
                <span className="font-persian">{t('flacNote')}</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2">
              {ext?.qualityOptions.map(q => {
                const active = q.id === selectedQualityId;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQualityId(q.id)}
                    className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 text-left overflow-hidden ${active ? 'border-white/30 bg-white/5 shadow-lg' : 'border-white/5 bg-black/40 hover:bg-white/5 hover:border-white/15'}`}
                    style={active ? { boxShadow: `0 0 20px ${track.extensionColor}22` } : {}}
                  >
                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${active ? '' : 'opacity-0'}`} style={{ backgroundColor: track.extensionColor }}></div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${active ? 'text-white' : 'text-zinc-500'}`} style={active ? { backgroundColor: `${track.extensionColor}22`, borderColor: `${track.extensionColor}55` } : { backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.08)' }}>
                      {active ? <Check size={18} /> : <span className="text-sm font-black">{q.ext.toUpperCase()}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm ${active ? 'text-white' : 'text-gray-200'}`}>{q.label}</span>
                        {q.bitrate && <span className="text-[10px] font-mono text-zinc-500">{q.bitrate}</span>}
                      </div>
                      <p className="text-xs text-gray-500">{q.description}{q.isPreview ? ` · ${t('previewBadge')}` : ''}</p>
                    </div>
                    {!q.available ? (
                      <span className="shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/30">{t('requiresBadge')}</span>
                    ) : (
                      <span className="shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide" style={{ backgroundColor: `${track.extensionColor}1a`, color: track.extensionColor, border: `1px solid ${track.extensionColor}44` }}>{q.ext.toUpperCase()}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          {status === 'done' && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold">
              <Check size={16} />{statusMsg}
            </div>
          )}
          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold">
              {statusMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-5 pb-1">
            <button onClick={handlePlay} disabled={playing} className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
              {playing ? <><Loader2 size={16} className="animate-spin" />{t('playingFullTrack')}</> : <><Play size={16} className="fill-black" />{t('playOnline')}</>}
            </button>
            <button onClick={togglePreview} disabled={!track.previewUrl} className={`px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 border disabled:opacity-40 disabled:cursor-not-allowed ${isPreviewPlaying ? 'bg-zinc-800 text-white border-white/20' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}>
              {isPreviewPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} />}
              {isPreviewPlaying ? t('stopPreview') : t('playPreview')}
            </button>
            <button onClick={handleDownload} disabled={downloading || !selectedQuality} className="flex-1 px-4 py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${track.extensionColor}, ${track.extensionColor}aa)` }}>
              {downloading && (
                <div className="absolute inset-y-0 left-0 bg-black/40 transition-all" style={{ width: `${progress}%` }}></div>
              )}
              <span className="relative z-10 flex items-center gap-2">
                {downloading ? <><Loader2 size={16} className="animate-spin" />{t('downloadingTrack')} {progress > 0 ? `${Math.round(progress)}%` : ''}</> : <><Download size={16} />{t('download')}</>}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnlineTrackDetailModal;