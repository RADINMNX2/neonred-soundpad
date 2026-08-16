import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { activeLineProgress, detectMode, findActiveIndex, parseLrc } from '../utils/lyrics';

interface LyricsOverlayProps {
  lyricsRaw: string;
  currentTime: number;
  duration?: number;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  compact?: boolean;
  loading?: boolean;
}

interface LyricLineViewProps {
  text: string;
  state: 'active' | 'past' | 'future';
  progress: number;
  seekTime?: number;
  onSeek?: (time: number) => void;
  isRTL: boolean;
  dataIndex: number;
}

const LyricLineView = memo(function LyricLineView({ text, state, progress, seekTime, onSeek, isRTL, dataIndex }: LyricLineViewProps) {
  const cls = state === 'active' ? 'lyric-line-active' : state === 'past' ? 'lyric-line-past' : 'lyric-line-future';
  const base = `relative w-full text-center font-semibold leading-relaxed cursor-default ${isRTL ? 'font-persian' : ''} ${cls}`;
  const inner = (
    <>
      <span dir="auto">{text}</span>
      {state === 'active' && (
        <span className="lyric-progress" style={{ '--lyric-progress': progress } as React.CSSProperties} />
      )}
    </>
  );
  const onClick = useCallback(() => {
    if (seekTime !== undefined && onSeek) onSeek(seekTime);
  }, [seekTime, onSeek]);
  if (seekTime !== undefined && onSeek) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={state === 'active'}
        data-line-index={dataIndex}
        className={`${base} rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70`}
      >
        {inner}
      </button>
    );
  }
  return (
    <div aria-current={state === 'active'} data-line-index={dataIndex} className={base}>
      {inner}
    </div>
  );
});

const LyricsOverlay: React.FC<LyricsOverlayProps> = ({ lyricsRaw, currentTime, duration, isPlaying, onSeek, compact, loading }) => {
  const { isRTL } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [readIndex, setReadIndex] = useState(0);

  const rawLines = useMemo(() => parseLrc(lyricsRaw), [lyricsRaw]);
  const mode = useMemo(() => detectMode(lyricsRaw), [lyricsRaw]);
  const timed = mode === 'timed';
  const lines = useMemo(() => rawLines.filter((l) => l.text.trim().length > 0), [rawLines]);

  const activeIndex = useMemo(() => (timed ? findActiveIndex(lines, currentTime) : -1), [timed, lines, currentTime]);
  const activeProgress = useMemo(
    () => (timed && activeIndex >= 0 ? activeLineProgress(lines, activeIndex, currentTime) : 0),
    [timed, lines, activeIndex, currentTime]
  );

  const markUserScroll = useCallback(() => {
    userScrolledRef.current = true;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      userScrolledRef.current = false;
      scrollTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const scrollToActive = useCallback((index: number) => {
    if (userScrolledRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const lineEl = container.querySelector<HTMLElement>(`[data-line-index="${index}"]`);
    lineEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  useEffect(() => {
    if (timed && activeIndex >= 0) scrollToActive(activeIndex);
  }, [timed, activeIndex, scrollToActive]);

  useEffect(() => {
    if (timed || !isPlaying || lines.length === 0) {
      setReadIndex(0);
      return;
    }
    const total = duration && duration > 0 ? duration : 240;
    const pace = Math.max(2000, Math.min(6000, (total / Math.max(1, lines.length)) * 1000));
    let acc = 0;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      acc += now - last;
      last = now;
      if (acc >= pace) {
        acc = 0;
        setReadIndex((prev) => (prev < lines.length - 1 ? prev + 1 : prev));
      }
    }, 250);
    return () => clearInterval(id);
  }, [timed, isPlaying, lines.length, duration]);

  useEffect(() => {
    if (!timed && lines.length > 0) scrollToActive(readIndex);
  }, [timed, readIndex, lines.length, scrollToActive]);

  const getState = (i: number): 'active' | 'past' | 'future' => {
    if (timed) {
      if (i === activeIndex) return 'active';
      return i < activeIndex ? 'past' : 'future';
    }
    if (i === readIndex) return 'active';
    return i < readIndex ? 'past' : 'future';
  };

  const renderIndexes = useMemo(() => {
    if (!compact) return lines.map((_, i) => i);
    const anchor = timed ? activeIndex : readIndex;
    const from = Math.max(0, anchor - 1);
    const to = Math.min(lines.length, anchor + 2);
    const out: number[] = [];
    for (let i = from; i < to; i++) out.push(i);
    return out;
  }, [compact, lines, timed, activeIndex, readIndex]);

  if (loading) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 w-3/4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 rounded-full bg-zinc-700/80"
              style={{ width: `${82 - i * 12}%`, animation: `lyric-shimmer 1.4s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (lines.length === 0) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" dir="ltr">
      <div
        ref={containerRef}
        dir="ltr"
        onWheel={markUserScroll}
        onPointerDown={markUserScroll}
        onTouchStart={markUserScroll}
        role="region"
        aria-label="Lyrics"
        className={`w-full h-full overflow-y-auto custom-scrollbar px-6 ${compact ? 'py-2' : 'py-6'}`}
      >
        <div className={`flex flex-col items-center justify-center min-h-full ${compact ? 'gap-3' : 'gap-7'} py-4`}>
          {renderIndexes.map((i) => {
            const line = lines[i];
            const state = getState(i);
            return (
              <LyricLineView
                key={i}
                text={line.text}
                state={state}
                progress={state === 'active' ? activeProgress : 0}
                seekTime={timed && onSeek ? line.time : undefined}
                onSeek={timed && onSeek ? onSeek : undefined}
                isRTL={isRTL}
                dataIndex={i}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LyricsOverlay;