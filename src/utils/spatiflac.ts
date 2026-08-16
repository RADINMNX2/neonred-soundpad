import { FullTrackResult, OnlineTrack, QualityOption, SpatiflacExtension } from '../types';
import { loadInstalledRegistryExtensions } from './extensionRegistry';

export const EXTENSIONS_CHANGED_EVENT = 'spatiflac-extensions-changed';

const ENABLED_KEY = 'spatiflac_enabled_extensions';
const SEARCH_API = 'https://itunes.apple.com/search';
const TOP_CHART_API = 'https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json';
const TOP_ALBUMS_API = 'https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/albums.json';
const FALLBACK_CHART_API = 'https://itunes.apple.com/us/rss/topsongs/limit=50/json';
const FALLBACK_ALBUMS_API = 'https://itunes.apple.com/us/rss/topalbums/limit=50/json';

const CHART_CACHE_TTL = 10 * 60 * 1000;
const chartCache = new Map<string, { at: number; items: ITunesChartEntry[] }>();

function normalizeChartEntry(raw: any): ITunesChartEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.name || raw.artistName) return raw as ITunesChartEntry;
  const name = raw['im:name']?.label;
  if (!name) return null;
  let id: string | undefined;
  if (raw.id?.attributes?.['im:id']) id = String(raw.id.attributes['im:id']);
  else if (typeof raw.id?.label === 'string') {
    const match = String(raw.id.label).match(/\/id(\d+)/);
    if (match) id = match[1];
  }
  const images = raw['im:image'];
  const artwork = Array.isArray(images) && images.length > 0 ? images[images.length - 1].label : undefined;
  return {
    id,
    name,
    artistName: raw['im:artist']?.label,
    collectionName: raw['im:collection']?.['im:name']?.label,
    artworkUrl100: artwork,
    url: typeof raw.id?.label === 'string' ? raw.id.label : undefined,
    releaseDate: raw.releaseDate?.label,
    genres: raw.category ? [{ name: String(raw.category.label || raw.category.attributes?.label || '') }] : undefined,
  };
}

async function fetchChart(primaryUrl: string, fallbackUrl: string): Promise<ITunesChartEntry[]> {
  const cached = chartCache.get(primaryUrl);
  if (cached && Date.now() - cached.at < CHART_CACHE_TTL) return cached.items;
  const attempt = async (u: string): Promise<ITunesChartEntry[] | null> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15000);
    try {
      const res = await fetch(u, { signal: ac.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      const raw = data?.feed?.results || data?.feed?.entry || [];
      const entries = raw.map(normalizeChartEntry).filter((e): e is ITunesChartEntry => !!e);
      return entries.length > 0 ? entries : null;
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  let entries = await attempt(primaryUrl);
  if (!entries) entries = await attempt(fallbackUrl);
  if (!entries) entries = [];
  chartCache.set(primaryUrl, { at: Date.now(), items: entries });
  return entries;
}

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

function isRealExtension(ext: SpatiflacExtension): boolean {
  return !ext.builtin && !!ext.packageId;
}

function isRealExtensionTrack(track: OnlineTrack): boolean {
  return !!track.providerId && !!track.providerTrackId;
}

function mapExtensionItem(item: any, ext: SpatiflacExtension): OnlineTrack | null {
  if (!item) return null;
  const providerTrackId = item.id != null ? String(item.id) : '';
  if (!providerTrackId) return null;
  const title = item.name || item.title || '';
  const artist = item.artists || item.artist || '';
  if (!title) return null;
  const durationMs = Number(item.duration_ms || item.duration || 0);
  return {
    id: `${ext.id}-${providerTrackId}`,
    title,
    artist: artist || 'Unknown Artist',
    album: item.album_name || item.album,
    cover: item.cover_url || (Array.isArray(item.images) ? item.images[0]?.url : item.images) || item.artwork_url,
    duration: durationMs > 0 ? durationMs / 1000 : undefined,
    genre: item.genre,
    releaseDate: item.release_date || item.releaseDate,
    sourceUrl: item.external_urls?.spotify || (typeof item.external_urls === 'string' ? item.external_urls : undefined) || item.url,
    extensionId: ext.id,
    extensionName: ext.name,
    extensionColor: ext.color,
    extensionAccent: ext.accent,
    providerId: ext.packageId,
    providerTrackId,
  };
}

async function searchRealExtension(ext: SpatiflacExtension, query: string): Promise<OnlineTrack[]> {
  try {
    const result = await window.electronAPI.extensionsSearch({ packageId: ext.packageId!, query });
    if (!result.success) return [];
    const items = Array.isArray(result.results) ? result.results : [];
    return items.map(i => mapExtensionItem(i, ext)).filter((t): t is OnlineTrack => !!t);
  } catch (e) {
    console.warn(`[spatiflac] ${ext.id} extension search failed`, e);
    return [];
  }
}

async function searchItunes(query: string, ext: SpatiflacExtension): Promise<OnlineTrack[]> {
  const results: OnlineTrack[] = [];
  const url = `${SEARCH_API}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=30`;
  const res = await fetch(url);
  if (!res.ok) return results;
  const data = await res.json();
  (data.results || []).forEach((r: ITunesSearchResult) => {
    if (r.trackName) results.push(toOnlineTrack(r, ext, String(r.trackId)));
  });
  return results;
}

export async function searchTracks(query: string, extensions: SpatiflacExtension[], filter = 'all'): Promise<OnlineTrack[]> {
  const enabled = getEnabledExtensions(extensions, filter);
  if (enabled.length === 0) return [];
  const results: OnlineTrack[] = [];
  await Promise.all(enabled.map(async (ext) => {
    try {
      const found = isRealExtension(ext)
        ? await searchRealExtension(ext, query)
        : await searchItunes(query, ext);
      results.push(...found);
    } catch (e) {
      console.warn(`[spatiflac] ${ext.id} search failed`, e);
    }
  }));
  return results;
}

export async function getFeaturedTracks(extensions: SpatiflacExtension[]): Promise<OnlineTrack[]> {
  const enabled = getEnabledExtensions(extensions, 'all');
  if (enabled.length === 0) return [];
  const entries = await fetchChart(TOP_CHART_API, FALLBACK_CHART_API);
  const results: OnlineTrack[] = [];
  enabled.forEach((ext) => {
    entries.forEach((r, i) => {
      results.push(toOnlineTrack(r, ext, String(r.id || i)));
    });
  });
  return results;
}

export async function getFeaturedAlbums(extensions: SpatiflacExtension[]): Promise<OnlineTrack[]> {
  const enabled = getEnabledExtensions(extensions, 'all');
  if (enabled.length === 0) return [];
  const entries = await fetchChart(TOP_ALBUMS_API, FALLBACK_ALBUMS_API);
  const results: OnlineTrack[] = [];
  enabled.forEach((ext) => {
    entries.forEach((r, i) => {
      results.push(toOnlineTrack(r, ext, String(r.id || i)));
    });
  });
  return results;
}

export function pickQuality(ext: SpatiflacExtension, qualityId: string): QualityOption {
  return ext.qualityOptions.find(q => q.id === qualityId) || ext.qualityOptions[0];
}

function buildSearchQuery(track: OnlineTrack): string {
  return `${track.artist} ${track.title}`.trim();
}

export async function resolveFullTrack(track: OnlineTrack, onProgress?: (percent: number) => void): Promise<FullTrackResult> {
  const downloadId = crypto.randomUUID();
  const cleanup = window.electronAPI.onOnlineDownloadProgress((data) => {
    if (data.downloadId === downloadId && onProgress) onProgress(data.percent);
  });
  try {
    const query = buildSearchQuery(track);
    const cacheKey = `${track.artist} - ${track.title}`;
    const result = await window.electronAPI.onlineFullTrack({ query, cacheKey, downloadId });
    return result;
  } catch (e: any) {
    return { success: false, error: e.message || 'Full-track resolution failed' };
  } finally {
    cleanup();
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

  const tryExtension = async (): Promise<{ success: boolean; path?: string; error?: string; used?: boolean }> => {
    if (!track.providerId || !track.providerTrackId) return { success: false, used: false };
    const ext = (() => {
      try {
        return loadExtensions().find(e => e.id === track.extensionId);
      } catch {
        return undefined;
      }
    })();
    const qualityId = ext && ext.qualityOptions.length > 0
      ? (ext.qualityOptions.find(q => !q.isPreview) || ext.qualityOptions[0]).id
      : (quality.engine === 'flac' ? 'FLAC' : 'BEST');
    const result = await window.electronAPI.extensionsDownload({
      packageId: track.providerId,
      trackId: track.providerTrackId,
      qualityId,
      meta: {
        title: track.title,
        artist: track.artist,
        album: track.album,
        cover: track.cover,
        releaseDate: track.releaseDate,
      },
      filename: safeTitle,
      downloadId,
    });
    if (!result.success) return { success: false, error: result.error, used: true };
    return { success: true, path: result.path, used: true };
  };

  try {
    if (isRealExtensionTrack(track)) {
      const extRes = await tryExtension();
      cleanup();
      if (extRes.used && extRes.success) return { success: true, path: extRes.path, isFallback: false };
      if (extRes.used && extRes.error) {
        console.warn(`[spatiflac] extension download failed, using built-in engine: ${extRes.error}`);
      }
    }
    if (quality.engine === 'flac') {
      const result = await window.electronAPI.onlineDownloadTrack({ query, filename: safeTitle, format: 'flac', downloadId });
      cleanup();
      if (result.success) return { success: true, path: result.path, isFallback: true, fallbackExt: 'flac' };
      return { success: false, error: result.error, isFallback: true };
    }
    if (quality.engine === 'full') {
      const result = await window.electronAPI.onlineDownloadTrack({ query, filename: safeTitle, format: 'best', downloadId });
      cleanup();
      if (result.success) return { success: true, path: result.path, isFallback: true };
      return { success: false, error: result.error, isFallback: true };
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