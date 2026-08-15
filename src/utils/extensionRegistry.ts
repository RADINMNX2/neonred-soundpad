import { ExtensionRegistry, QualityOption, RegistryExtension, SpatiflacExtension } from '../types';

export const DEFAULT_REGISTRY_URLS = [
  'https://raw.githubusercontent.com/spotiflacapp/spotiflac-extension/main/registry.json',
  'https://raw.githubusercontent.com/zarzet/spotiflac-extension/main/registry.json',
];

const REGISTRY_URLS_KEY = 'spatiflac_registry_urls';
const REGISTRY_EXTENSIONS_KEY = 'spatiflac_registry_extensions';

const BRAND_COLORS: Record<string, string> = {
  spotify: '#1DB954',
  'spotify-web': '#1DB954',
  amazon: '#00A8E1',
  'apple-music': '#FA2D48',
  soundcloud: '#FF5500',
  'ytmusic-spotiflac': '#FF0033',
  youtube: '#FF0000',
  deezer: '#A238FF',
  pandora: '#224099',
  'qobuz-web': '#E66DB0',
  qobuz: '#C773E7',
  'tidal-web': '#00FFFF',
  tidal: '#0FF',
};

const ACCENTS = [
  'from-pink-500 to-red-600',
  'from-emerald-500 to-green-600',
  'from-sky-500 to-blue-600',
  'from-purple-500 to-fuchsia-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-teal-600',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function brandColor(id: string): string {
  if (BRAND_COLORS[id]) return BRAND_COLORS[id];
  const palette = [0xff5555, 0x55c2ff, 0xffa055, 0x9d55ff, 0x55ff9d, 0xff55e0];
  return `#${palette[hashString(id) % palette.length].toString(16).padStart(6, '0')}`;
}

export function accentFor(id: string): string {
  return ACCENTS[hashString(id) % ACCENTS.length];
}

function qualityOptionsFor(reg: RegistryExtension): QualityOption[] {
  const isLossless = reg.tags.includes('lossless') || reg.category === 'download';
  return [
    {
      id: 'FLAC',
      label: isLossless ? 'FLAC Lossless' : 'FLAC',
      description: 'Full track · real lossless FLAC',
      ext: 'flac',
      bitrate: isLossless ? '~950kbps' : undefined,
      available: true,
      engine: 'flac',
    },
    {
      id: 'BEST',
      label: 'Best Quality',
      description: 'Full track · highest available audio',
      ext: 'm4a',
      bitrate: '~320kbps',
      available: true,
      engine: 'full',
    },
    {
      id: 'PREVIEW',
      label: 'Preview (30s)',
      description: 'Quick 30-second preview · not saved',
      ext: 'm4a',
      bitrate: '256kbps',
      available: true,
      isPreview: true,
      engine: 'preview',
    },
  ];
}

export function registryToExtension(reg: RegistryExtension, registryUrl: string): SpatiflacExtension {
  const color = brandColor(reg.id);
  const displayName = reg.display_name || reg.name;
  return {
    id: `registry-${reg.id}`,
    name: displayName,
    description: reg.description,
    author: 'Community',
    version: reg.version,
    color,
    accent: accentFor(reg.id),
    types: reg.category === 'integration' ? ['metadata_provider'] : ['metadata_provider', 'download_provider'],
    qualityOptions: qualityOptionsFor(reg),
    enabled: true,
    builtin: false,
    iconUrl: reg.icon_url,
    category: reg.category,
    tags: reg.tags,
    registryUrl,
    sha256: reg.sha256,
    minAppVersion: reg.min_app_version,
    packageId: reg.id,
    downloadUrl: reg.download_url,
  };
}

export async function fetchRegistry(url: string): Promise<ExtensionRegistry> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Registry request failed (${res.status})`);
  const data = await res.json();
  if (!data || !Array.isArray(data.extensions)) throw new Error('Invalid registry format');
  return data as ExtensionRegistry;
}

export async function fetchAllRegistries(urls: string[]): Promise<{ extensions: SpatiflacExtension[]; errors: string[] }> {
  const results = await Promise.allSettled(urls.map(u => fetchRegistry(u)));
  const extensions: SpatiflacExtension[] = [];
  const seen = new Set<string>();
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      r.value.extensions.forEach(reg => {
        if (seen.has(reg.id)) return;
        seen.add(reg.id);
        extensions.push(registryToExtension(reg, urls[i]));
      });
    } else {
      errors.push(urls[i]);
    }
  });
  return { extensions, errors };
}

export function loadInstalledRegistryExtensions(): SpatiflacExtension[] {
  try {
    const raw = localStorage.getItem(REGISTRY_EXTENSIONS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((e: SpatiflacExtension) => ({ ...e, builtin: false }));
  } catch {
    return [];
  }
}

export function saveInstalledRegistryExtension(ext: SpatiflacExtension) {
  const installed = loadInstalledRegistryExtensions().filter(e => e.id !== ext.id);
  installed.push(ext);
  localStorage.setItem(REGISTRY_EXTENSIONS_KEY, JSON.stringify(installed));
}

export function removeInstalledRegistryExtension(id: string) {
  const installed = loadInstalledRegistryExtensions().filter(e => e.id !== id);
  localStorage.setItem(REGISTRY_EXTENSIONS_KEY, JSON.stringify(installed));
}

export function getRegistryUrls(): string[] {
  try {
    const raw = localStorage.getItem(REGISTRY_URLS_KEY);
    if (!raw) return [...DEFAULT_REGISTRY_URLS];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [...DEFAULT_REGISTRY_URLS];
    return arr.filter((u: unknown) => typeof u === 'string' && u.startsWith('http'));
  } catch {
    return [...DEFAULT_REGISTRY_URLS];
  }
}

export function saveRegistryUrls(urls: string[]) {
  localStorage.setItem(REGISTRY_URLS_KEY, JSON.stringify(urls));
}

export async function installExtensionPackage(ext: SpatiflacExtension): Promise<{ success: boolean; error?: string }> {
  if (!ext.packageId || !ext.downloadUrl) return { success: false, error: 'Package metadata missing' };
  try {
    const result = await window.electronAPI.extensionsInstall({
      packageId: ext.packageId,
      download_url: ext.downloadUrl,
      sha256: ext.sha256,
    });
    if (!result.success) return { success: false, error: result.error };
    const installed = { ...ext };
    if (result.extension?.qualityOptions && result.extension.qualityOptions.length > 0) {
      installed.qualityOptions = result.extension.qualityOptions;
    }
    saveInstalledRegistryExtension(installed);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Install failed' };
  }
}

export async function uninstallExtensionPackage(ext: SpatiflacExtension): Promise<{ success: boolean; error?: string }> {
  removeInstalledRegistryExtension(ext.id);
  if (ext.packageId && window.electronAPI?.extensionsUninstall) {
    try {
      await window.electronAPI.extensionsUninstall(ext.packageId);
    } catch (e: any) {
      return { success: false, error: e.message || 'Uninstall failed' };
    }
  }
  return { success: true };
}
