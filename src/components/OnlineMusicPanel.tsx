import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, ArrowLeft, Play, Music, Disc, Loader2, Radio, Clock, TrendingUp } from 'lucide-react';
import { OnlineTrack, QualityOption, SpatiflacExtension } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { searchTracks, getFeaturedTracks, getFeaturedAlbums } from '../utils/spatiflac';
import OnlineTrackDetailModal from './OnlineTrackDetailModal';

interface OnlineMusicPanelProps {
  extensions: SpatiflacExtension[];
  onClose: () => void;
  onPlay: (track: OnlineTrack) => void;
  onDownload: (track: OnlineTrack, quality: QualityOption, onProgress?: (percent: number) => void) => Promise<{ success: boolean; path?: string; error?: string; isFallback: boolean; fallbackExt?: string }>;
}

function formatDuration(s?: number) {
  if (!s || isNaN(s)) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function TrackRow({ track, onSelect }: { track: OnlineTrack; onSelect: (t: OnlineTrack) => void }) {
  return (
    <div
      onClick={() => onSelect(track)}
      className="group flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/10 active:scale-[0.99]"
    >
      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-800 border border-white/10 shadow-lg group-hover:shadow-pink-900/20">
        {track.cover ? (
          <img src={track.cover} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Music size={18} className="text-zinc-600" /></div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={20} className="text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-gray-100 truncate group-hover:text-white">{track.title}</h4>
        <p className="text-xs text-gray-500 truncate font-medium">{track.artist} {track.album ? `· ${track.album}` : ''}</p>
      </div>
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span
          className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5"
          style={{ color: track.extensionColor, backgroundColor: `${track.extensionColor}1a`, border: `1px solid ${track.extensionColor}33` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: track.extensionColor }}></span>
          {track.extensionName}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500 font-mono"><Clock size={12} />{formatDuration(track.duration)}</span>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-lg bg-white/5"><Icon size={14} className="text-pink-500" /></div>
      <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
    </div>
  );
}

function CoverCard({ track, onSelect }: { track: OnlineTrack; onSelect: (t: OnlineTrack) => void }) {
  return (
    <div onClick={() => onSelect(track)} className="group w-32 sm:w-36 shrink-0 cursor-pointer">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-800 border border-white/10 shadow-lg shadow-black/40 group-hover:shadow-pink-900/30 group-hover:scale-[1.02] transition-all duration-300">
        {track.cover ? (
          <img src={track.cover} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Disc size={32} className="text-zinc-600" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
          <div className="w-9 h-9 rounded-full bg-pink-600 flex items-center justify-center shadow-lg"><Play size={16} className="text-white fill-white translate-x-0.5" /></div>
        </div>
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase backdrop-blur-sm" style={{ color: track.extensionColor, backgroundColor: `${track.extensionColor}22`, border: `1px solid ${track.extensionColor}44` }}>{track.extensionName}</span>
      </div>
      <p className="mt-2 text-xs font-bold text-gray-200 truncate">{track.title}</p>
      <p className="text-[11px] text-gray-500 truncate">{track.artist}</p>
    </div>
  );
}

const OnlineMusicPanel: React.FC<OnlineMusicPanelProps> = ({ extensions, onClose, onPlay, onDownload }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState<OnlineTrack[]>([]);
  const [featured, setFeatured] = useState<OnlineTrack[]>([]);
  const [albums, setAlbums] = useState<OnlineTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingHome, setLoadingHome] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<OnlineTrack | null>(null);
  const searchTimer = useRef<any>(null);
  const searchSeq = useRef(0);

  const enabledExts = extensions.filter(e => e.enabled);

  const loadHome = useCallback(async () => {
    setLoadingHome(true);
    const [songs, albumList] = await Promise.all([
      getFeaturedTracks(extensions),
      getFeaturedAlbums(extensions),
    ]);
    setFeatured(songs);
    setAlbums(albumList);
    setLoadingHome(false);
  }, [extensions]);

  useEffect(() => {
    loadHome();
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [loadHome]);

  useEffect(() => {
    const q = query.trim();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const found = await searchTracks(q, extensions, filter);
      if (seq === searchSeq.current) {
        setResults(found);
        setSearching(false);
      }
    }, 450);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, filter, extensions]);

  const handleSelect = (track: OnlineTrack) => setSelectedTrack(track);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden animate-slide-in-right">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-red-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 p-4 pb-0 flex items-center gap-3">
        <button onClick={onClose} className="p-2 bg-zinc-800/70 hover:bg-zinc-700 text-gray-300 hover:text-white rounded-xl transition-all border border-white/5 hover:border-white/15">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black text-white tracking-tight font-persian flex items-center gap-2"><Radio size={16} className="text-pink-500" />{t('onlineTitle')}</h3>
          <p className="text-[11px] text-gray-500 truncate font-persian">{t('onlineDesc')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative z-10 px-4 mt-3">
        <div className="relative group">
          <Search size={17} className="absolute top-1/2 -translate-y-1/2 left-3.5 text-gray-500 group-focus-within:text-pink-500 transition-colors" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('onlineSearchPlaceholder')}
            className="w-full pl-11 pr-10 py-3 bg-zinc-900/70 border border-white/10 rounded-2xl text-white placeholder-gray-600 outline-none focus:border-pink-500/50 focus:shadow-[0_0_20px_rgba(236,72,153,0.15)] transition-all font-persian"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute top-1/2 -translate-y-1/2 right-3 p-1 text-gray-500 hover:text-white rounded-full"><X size={15} /></button>
          )}
        </div>

        {/* Extension filter chips */}
        <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
          <button onClick={() => setFilter('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${filter === 'all' ? 'bg-white/10 border-white/30 text-white' : 'bg-zinc-900/60 border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`}>
            {t('allExtensions')}
          </button>
          {enabledExts.map(ext => (
            <button key={ext.id} onClick={() => setFilter(ext.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${filter === ext.id ? 'text-white' : 'bg-zinc-900/60 border-white/5 text-gray-400 hover:text-white hover:border-white/20'}`} style={filter === ext.id ? { backgroundColor: `${ext.color}26`, borderColor: `${ext.color}66`, boxShadow: `0 0 14px ${ext.color}22` } : {}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ext.color }}></span>
              {ext.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-4 pt-3">
        {query.trim().length >= 2 ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 font-mono">{results.length} TRACKS</span>
              {searching && <Loader2 size={13} className="text-pink-500 animate-spin" />}
            </div>
            {searching ? (
              <div className="h-40 flex flex-col items-center justify-center gap-3 text-gray-500">
                <Loader2 size={28} className="animate-spin text-pink-500" />
                <span className="text-sm font-persian">{t('searching')}</span>
              </div>
            ) : results.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center gap-2 text-gray-500 opacity-80">
                <Music size={40} className="text-zinc-700" />
                <p className="font-persian">{t('noResults')}</p>
                <p className="text-xs text-gray-600 font-persian">{t('noResultsDesc')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((track, i) => <TrackRow key={`${track.id}-${i}`} track={track} onSelect={handleSelect} />)}
              </div>
            )}
          </>
        ) : loadingHome ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 size={26} className="animate-spin text-pink-500" />
            <span className="text-sm font-persian">{t('loadingCharts')}</span>
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <div className="mb-6">
                <SectionHeading icon={TrendingUp} title={t('readyMusic')} />
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                  {featured.map((track, i) => <CoverCard key={`${track.id}-${i}`} track={track} onSelect={handleSelect} />)}
                </div>
              </div>
            )}
            {albums.length > 0 && (
              <div>
                <SectionHeading icon={Disc} title={t('topAlbums')} />
                <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                  {albums.map((track, i) => <CoverCard key={`${track.id}-${i}`} track={track} onSelect={handleSelect} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative z-10 absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none"></div>

      <OnlineTrackDetailModal
        track={selectedTrack}
        extensions={enabledExts}
        onClose={() => setSelectedTrack(null)}
        onPlay={onPlay}
        onDownload={onDownload}
      />
    </div>
  );
};

export default OnlineMusicPanel;