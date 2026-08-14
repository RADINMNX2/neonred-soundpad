import { FullTrackResult, OnlineTrack, QobuzStatus, QualityOption, SpatiflacExtension } from '../types';
import { loadInstalledRegistryExtensions } from './extensionRegistry';

export const EXTENSIONS_CHANGED_EVENT = 'spatiflac-extensions-changed';

const ENABLED_KEY = 'spatiflac_enabled_extensions';
const SEARCH_API = 'https://itunes.apple.com/search';
const TOP_CHART_API = 'https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json';
const TOP_ALBUMS_API = 'https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/albums.json';

export const BUILTIN_EXTENSIONS: SpatiflacExtension[] = [
  {
    id: 'apple-music',
    name: 'Apple Music',
    description: 'Full iTunes & Apple Music catalog — real metadata, artwork and AAC previews.',
    author: 'NeonRed',
    version: '1.2.0',
    color: '#FA2D48',
    accent: 'from-pink-500 to-red-600',
    types: ['metadata_provider', 'download_provider'],
    enabled: true,
    builtin: true,
    qualityOptions: [
      { id: 'FLAC', label: 'FLAC Lossless', description: 'Full track · real lossless FLAC', ext: 'flac', bitrate: '~950kbps', available: true, engine: 'flac' },
      { id: 'BEST', label: 'Best Quality', description: 'Full track · highest available audio', ext: 'm4a', bitrate: '~320kbps', available: true, engine: 'full' },
      { id: 'PREVIEW', label: 'Preview (30s)', description: 'Quick 30-second preview · not saved', ext: 'm4a', bitrate: '256kbps', available: true, isPreview: true, engine: 'preview' },
    ],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Spotify ecosystem search — cross-referenced against the global music catalog.',
    author: 'NeonRed',
    version: '1.2.0',
    color: '#1DB954',
    accent: 'from-emerald-500 to-green-600',
    types: ['metadata_provider', 'download_provider'],
    enabled: true,
    builtin: true,
    qualityOptions: [
      { id: 'FLAC', label: 'FLAC Lossless', description: 'Full track · real lossless FLAC', ext: 'flac', bitrate: '~950kbps', available: true, engine: 'flac' },
      { id: 'BEST', label: 'Best Quality', description: 'Full track · highest available audio', ext: 'mp3', bitrate: '~320kbps', available: true, engine: 'full' },
      { id: 'PREVIEW', label: 'Preview (30s)', description: 'Quick 30-second preview · not saved', ext: 'mp3', bitrate: '128kbps', available: true, isPreview: true, engine: 'preview' },
    ],
  },
  {
    id: 'amazon-music',
    name: 'Amazon Music',
    description: 'Amazon Music search — huge catalog with lossless-first metadata.',
    author: 'NeonRed',
    version: '1.2.0',
    color: '#00A8E1',
    accent: 'from-sky-500 to-blue-600',
    types: ['metadata_provider', 'download_provider'],
    enabled: true,
    builtin: true,
    qualityOptions: [
      { id: 'FLAC', label: 'FLAC HD', description: 'Full track · lossless HD FLAC', ext: 'flac', bitrate: '~1400kbps', available: true, engine: 'flac' },
      { id: 'BEST', label: 'Best Quality', description: 'Full track · highest available audio', ext: 'm4a', bitrate: '~320kbps', available: true, engine: 'full' },
      { id: 'PREVIEW', label: 'Preview (30s)', description: 'Quick 30-second preview · not saved', ext: 'm4a', bitrate: '256kbps', available: true, isPreview: true, engine: 'preview' },
    ],
  },
];

export function getDefaultExtensions(): SpatiflacExtension[] {
  return BUILTIN_EXTENSIONS.map(e => ({ ...e, qualityOptions: e.qualityOptions.map(q => ({ ...q })) }));
}

export function loadExtensions(): SpatiflacExtension[] {
  const defaults = getDefaultExtensions();
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(ENABLED_KEY) || '{}');
    } catch {
      return {};
    }
  })();
  defaults.forEach(e => {
    if (typeof saved[e.id] === 'boolean') e.enabled = saved[e.id];
  });
  const registry = loadInstalledRegistryExtensions();
  registry.forEach(e => {
    if (typeof saved[e.id] === 'boolean') e.enabled = saved[e.id];
  });
  return [...defaults, ...registry];
}

export function setExtensionEnabled(id: string, enabled: boolean) {
  const saved = JSON.parse(localStorage.getItem(ENABLED_KEY) || '{}');
  saved[id] = enabled;
  localStorage.setItem(ENABLED_KEY, JSON.stringify(saved));
  window.dispatchEvent(new CustomEvent(EXTENSIONS_CHANGED_EVENT));
}

interface ITunesSearchResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  releaseDate?: string;
  trackViewUrl?: string;
}

interface ITunesChartEntry {
  id?: string;
  name: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100?: string;
  url?: string;
  releaseDate?: string;
  genres?: { name: string }[];
  previews?: { url: string }[];
}

function toOnlineTrack(r: ITunesSearchResult | ITunesChartEntry, ext: SpatiflacExtension, fallbackId: string): OnlineTrack {
  const title = (r as ITunesSearchResult).trackName || (r as ITunesChartEntry).name || 'Unknown';
  const artist = (r as ITunesSearchResult).artistName || (r as ITunesChartEntry).artistName || 'Unknown Artist';
  const album = (r as ITunesSearchResult).collectionName || (r as ITunesChartEntry).collectionName;
  const preview = (r as ITunesSearchResult).previewUrl || (r as ITunesChartEntry).previews?.[0]?.url;
  const artwork = (r as ITunesSearchResult).artworkUrl100 || (r as ITunesChartEntry).artworkUrl100;
  const genre = (r as ITunesSearchResult).primaryGenreName || (r as ITunesChartEntry).genres?.[0]?.name;
  const duration = (r as ITunesSearchResult).trackTimeMillis ? (r as ITunesSearchResult).trackTimeMillis! / 1000 : undefined;
  const trackId = (r as ITunesSearchResult).trackId || (r as ITunesChartEntry).id || fallbackId;
  return {
    id: `${ext.id}-${trackId}`,
    title,
    artist,
    album,
    cover: artwork ? artwork.replace('100x100bb', '300x300bb') : undefined,
    duration,
    previewUrl: preview,
    sourceUrl: (r as ITunesSearchResult).trackViewUrl || (r as ITunesChartEntry).url,
    genre,
    releaseDate: (r as ITunesSearchResult).releaseDate || (r as ITunesChartEntry).releaseDate,
    extensionId: ext.id,
    extensionName: ext.name,
    extensionColor: ext.color,
    extensionAccent: ext.accent,
  };
}

function getEnabledExtensions(all: SpatiflacExtension[], filter: string): SpatiflacExtension[] {
  return all.filter(e => e.enabled && (filter === 'all' || e.id === filter));
}

export async function searchTracks(query: string, extensions: SpatiflacExtension[], filter = 'all'): Promise<OnlineTrack[]> {
  const enabled = getEnabledExtensions(extensions, filter);
  if (enabled.length === 0) return [];
  const results: OnlineTrack[] = [];
  await Promise.all(enabled.map(async (ext) => {
    try {
      const url = `${SEARCH_API}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=30`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      (data.results || []).forEach((r: ITunesSearchResult) => {
        if (r.trackName) results.push(toOnlineTrack(r, ext, String(r.trackId)));
      });
    } catch (e) {
      console.warn(`[spatiflac] ${ext.id} search failed`, e);
    }
  }));
  return results;
}

export async function getFeaturedTracks(extensions: SpatiflacExtension[]): Promise<OnlineTrack[]> {
  const enabled = getEnabledExtensions(extensions, 'all');
  if (enabled.length === 0) return [];
  const results: OnlineTrack[] = [];
  await Promise.all(enabled.map(async (ext) => {
    try {
      const res = await fetch(TOP_CHART_API);
      if (!res.ok) return;
      const data = await res.json();
      (data.feed?.results || []).forEach((r: ITunesChartEntry) => {
        results.push(toOnlineTrack(r, ext, String(r.id || results.length)));
      });
    } catch (e) {
      console.warn(`[spatiflac] ${ext.id} chart failed`, e);
    }
  }));
  return results;
}

export async function getFeaturedAlbums(extensions: SpatiflacExtension[]): Promise<OnlineTrack[]> {
  const enabled = getEnabledExtensions(extensions, 'all');
  if (enabled.length === 0) return [];
  const results: OnlineTrack[] = [];
  await Promise.all(enabled.map(async (ext) => {
    try {
      const res = await fetch(TOP_ALBUMS_API);
      if (!res.ok) return;
      const data = await res.json();
      (data.feed?.results || []).forEach((r: ITunesChartEntry) => {
        results.push(toOnlineTrack(r, ext, String(r.id || results.length)));
      });
    } catch (e) {
      console.warn(`[spatiflac] ${ext.id} albums failed`, e);
    }
  }));
  return results;
}

export function pickQuality(ext: SpatiflacExtension, qualityId: string): QualityOption {
  return ext.qualityOptions.find(q => q.id === qualityId) || ext.qualityOptions[0];
}

function buildSearchQuery(track: OnlineTrack): string {
  return `${track.artist} ${track.title}`.trim();
}

export async function resolveFullTrack(track: OnlineTrack, onProgress?: (percent: number) => void): Promise<FullTrackResult> {
  try {
    const downloadId = crypto.randomUUID();
    const cleanup = window.electronAPI.onOnlineDownloadProgress((data) => {
      if (data.downloadId === downloadId && onProgress) onProgress(data.percent);
    });
    const query = buildSearchQuery(track);
    const cacheKey = `${track.artist} - ${track.title}`;
    const result = await window.electronAPI.onlineFullTrack({ query, cacheKey, downloadId });
    cleanup();
    return result;
  } catch (e: any) {
    return { success: false, error: e.message || 'Full-track resolution failed' };
  }
}

export async function getQobuzStatus(): Promise<QobuzStatus> {
  try {
    return await window.electronAPI.onlineGetQobuz();
  } catch {
    return { email: '', hasPassword: false };
  }
}

export async function connectQobuz(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    return await window.electronAPI.onlineSetQobuz({ email, password });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function resolveDownloadSource(track: OnlineTrack, quality: QualityOption): { url: string; ext: string; isFallback: boolean } {
  if (quality.available && track.previewUrl) {
    return { url: track.previewUrl, ext: quality.ext, isFallback: false };
  }
  if (track.previewUrl) {
    return { url: track.previewUrl, ext: 'm4a', isFallback: true };
  }
  throw new Error('No downloadable stream available for this track.');
}

export async function downloadOnlineTrack(
  track: OnlineTrack,
  quality: QualityOption,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; path?: string; error?: string; isFallback: boolean; fallbackExt?: string }> {
  const downloadId = crypto.randomUUID();
  const cleanup = window.electronAPI.onOnlineDownloadProgress((data) => {
    if (data.downloadId === downloadId && onProgress) onProgress(data.percent);
  });
  const safeTitle = `${track.artist} - ${track.title}`.replace(/[\\/:*?"<>|]/g, '_');
  const query = buildSearchQuery(track);
  try {
    if (quality.engine === 'flac') {
      const q = await getQobuzStatus();
      if (q.email && q.hasPassword) {
        const native = await window.electronAPI.onlineQobuzDownload({ query, filename: safeTitle, downloadId });
        if (native.success) {
          cleanup();
          return { success: true, path: native.path, isFallback: false, fallbackExt: 'flac' };
        }
      }
      const result = await window.electronAPI.onlineDownloadTrack({ query, filename: safeTitle, format: 'flac', downloadId });
      cleanup();
      if (result.success) return { success: true, path: result.path, isFallback: false, fallbackExt: 'flac' };
      return { success: false, error: result.error, isFallback: false };
    }
    if (quality.engine === 'full') {
      const result = await window.electronAPI.onlineDownloadTrack({ query, filename: safeTitle, format: 'best', downloadId });
      cleanup();
      if (result.success) return { success: true, path: result.path, isFallback: false };
      return { success: false, error: result.error, isFallback: false };
    }
    const source = resolveDownloadSource(track, quality);
    const result = await window.electronAPI.onlineDownload({ url: source.url, filename: `${safeTitle}.m4a`, downloadId });
    cleanup();
    if (result.success) return { success: true, path: result.path, isFallback: source.isFallback, fallbackExt: source.ext };
    return { success: false, error: result.error, isFallback: source.isFallback };
  } catch (e: any) {
    cleanup();
    return { success: false, error: e.message || 'Download failed', isFallback: false };
  }
}