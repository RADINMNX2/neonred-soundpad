export interface LyricLine {
  time: number;
  text: string;
}

export type LyricsMode = 'loading' | 'timed' | 'reading' | 'empty';

const TIME_TAG = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/;

export const buildLrcPath = (audioPath: string): string => {
  return audioPath.replace(/\.[^.]+$/, '.lrc');
};

export const hasLyrics = (raw?: string): boolean => {
  if (!raw) return false;
  return raw.trim().length > 0;
};

export const detectMode = (raw: string): LyricsMode => {
  if (!raw || raw.trim().length === 0) return 'empty';
  if (TIME_TAG.test(raw)) return 'timed';
  return 'reading';
};

export const parseLrc = (raw: string): LyricLine[] => {
  if (!raw) return [];

  let offset = 0;
  const lines: LyricLine[] = [];
  const rawLines = raw.split(/\r?\n/);

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const metaMatch = trimmed.match(/^\[(ti|ar|al|by|re|ve|length|offset):/i);
    if (metaMatch) {
      if (metaMatch[1].toLowerCase() === 'offset') {
        const parsed = parseInt(trimmed.replace(/^\[offset:/i, '').replace(/\]$/, ''), 10);
        if (!isNaN(parsed)) offset = Math.max(-30000, Math.min(30000, parsed));
      }
      continue;
    }

    const stamps: number[] = [];
    const text = trimmed.replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g, (_, m, s, ms) => {
      stamps.push(parseInt(m, 10) * 60 + parseInt(s, 10) + (ms ? parseInt(ms.padEnd(3, '0').slice(0, 3), 10) / 1000 : 0));
      return '';
    }).trim();

    if (stamps.length === 0) continue;
    for (const stamp of stamps) {
      lines.push({ time: Math.max(0, stamp + offset / 1000), text });
    }
  }

  lines.sort((a, b) => a.time - b.time);
  return lines;
};

export const findActiveIndex = (lines: LyricLine[], currentTime: number): number => {
  let low = 0;
  let high = lines.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].time <= currentTime) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  if (result === -1) return -1;
  while (result > 0 && lines[result].text.length === 0) result--;
  return result;
};

export const activeLineProgress = (lines: LyricLine[], index: number, currentTime: number): number => {
  if (index < 0 || index >= lines.length) return 0;
  const start = lines[index].time;
  const end = index + 1 < lines.length ? lines[index + 1].time : start + 4;
  const span = Math.max(0.25, Math.min(8, end - start));
  return Math.max(0, Math.min(1, (currentTime - start) / span));
};