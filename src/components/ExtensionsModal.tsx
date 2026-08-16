import React, { useState, useEffect, useCallback } from 'react';
import { Plug, Store, X, Plus, Trash2, AlertTriangle, Loader2, Package, Cpu, Check, Download, RefreshCw, Globe } from 'lucide-react';
import { SpatiflacExtension } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { VERSION } from '../constants';
import { loadExtensions, setExtensionEnabled, EXTENSIONS_CHANGED_EVENT } from '../utils/spatiflac';
import { getRegistryUrls, saveRegistryUrls, fetchAllRegistries, installExtensionPackage, uninstallExtensionPackage } from '../utils/extensionRegistry';

interface ExtensionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

const ExtensionsModal: React.FC<ExtensionsModalProps> = ({ isOpen, onClose }) => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'extensions' | 'store'>('extensions');

  const [spatiflacExts, setSpatiflacExts] = useState<SpatiflacExtension[]>(() => loadExtensions());

  const [registryUrls, setRegistryUrls] = useState<string[]>(() => getRegistryUrls());
  const [storeUrlInput, setStoreUrlInput] = useState('');
  const [storeExts, setStoreExts] = useState<SpatiflacExtension[]>([]);
  const [storeInstalledIds, setStoreInstalledIds] = useState<string[]>(() => loadExtensions().filter(e => !e.builtin).map(e => e.id));
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeErrors, setStoreErrors] = useState<string[]>([]);
  const [storeBusyId, setStoreBusyId] = useState<string | null>(null);
  const [storeInstallError, setStoreInstallError] = useState<string | null>(null);

  const refreshStore = useCallback(async () => {
    if (registryUrls.length === 0) return;
    setStoreLoading(true);
    setStoreErrors([]);
    const { extensions, errors } = await fetchAllRegistries(registryUrls);
    setStoreExts(extensions);
    setStoreErrors(errors);
    setStoreLoading(false);
  }, [registryUrls]);

  useEffect(() => {
    refreshStore();
  }, [refreshStore]);

  const updateRegistryUrls = (urls: string[]) => {
    setRegistryUrls(urls);
    saveRegistryUrls(urls);
  };

  const addRegistryUrl = () => {
    const url = storeUrlInput.trim();
    if (!url) return;
    if (!registryUrls.includes(url)) {
      updateRegistryUrls([...registryUrls, url]);
    }
    setStoreUrlInput('');
  };

  const handleInstallExt = async (ext: SpatiflacExtension) => {
    setStoreBusyId(ext.id);
    setStoreInstallError(null);
    try {
      const result = await installExtensionPackage(ext);
      if (!result.success) {
        setStoreInstallError(result.error || 'Install failed');
        return;
      }
      setStoreInstalledIds(prev => [...prev.filter(id => id !== ext.id), ext.id]);
      window.dispatchEvent(new CustomEvent(EXTENSIONS_CHANGED_EVENT));
    } catch (err) {
      console.error("Failed to install extension", err);
      setStoreInstallError(err instanceof Error ? err.message : 'Install failed');
    } finally {
      setStoreBusyId(null);
    }
  };

  const handleUninstallExt = async (ext: SpatiflacExtension) => {
    setStoreBusyId(ext.id);
    setStoreInstallError(null);
    try {
      await uninstallExtensionPackage(ext);
      setStoreInstalledIds(prev => prev.filter(pid => pid !== ext.id));
      window.dispatchEvent(new CustomEvent(EXTENSIONS_CHANGED_EVENT));
    } catch (err) {
      console.error("Failed to uninstall extension", err);
      setStoreInstallError(err instanceof Error ? err.message : 'Uninstall failed');
    } finally {
      setStoreBusyId(null);
    }
  };

  useEffect(() => {
    const handler = () => setSpatiflacExts(loadExtensions());
    window.addEventListener(EXTENSIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(EXTENSIONS_CHANGED_EVENT, handler);
  }, []);

  if (!isOpen) return null;

  const activeExtCount = spatiflacExts.filter(e => e.enabled).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md animate-fade-in" onClick={onClose}></div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[8%] -left-24 w-80 h-80 bg-red-600/15 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[6%] -right-24 w-80 h-80 bg-pink-600/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1.2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-rose-500/5 rounded-full blur-[110px]"></div>
      </div>

      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl shadow-red-950/40 animate-slide-up overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-pink-500 via-red-500 to-violet-500"></div>
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-red-500/10 rounded-full blur-[90px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-16 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative shrink-0 px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-white/5 bg-zinc-950/90 backdrop-blur-xl">
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="relative shrink-0">
              <span className="absolute inset-0 rounded-2xl bg-red-500/25 blur-xl animate-pulse-slow"></span>
              <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/40 ${activeTab === 'store' ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600' : 'bg-gradient-to-br from-pink-600 to-red-600'}`}>
                {activeTab === 'store' ? <Store size={22} className="text-white" /> : <Plug size={22} className="text-white" />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white font-persian truncate">{t('spatiflacTitle')}</h2>
              <p className="text-sm text-gray-400 font-persian truncate">{t('spatiflacDesc')}</p>
            </div>
            <button onClick={onClose} className="shrink-0 p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="relative shrink-0 px-5 sm:px-7 pt-4 pb-2 bg-zinc-950/90">
          <div className={`flex gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/5 w-fit ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button onClick={() => setActiveTab('extensions')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'extensions' ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white shadow-lg shadow-red-900/40' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Plug size={14} />Extensions
            </button>
            <button onClick={() => setActiveTab('store')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'store' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/40' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
              <Store size={14} />Store
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-y-auto px-5 sm:px-7 py-5">
          {activeTab === 'extensions' ? (
            <>
              <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('spatiflacRepoLabel')}</span>
                <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] font-black text-red-400 tracking-widest font-mono">{activeExtCount} ACTIVE</span>
              </div>

              <div className="p-4 bg-black/40 rounded-xl border border-white/5 mb-4">
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-red-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-pink-900/30 shrink-0">S</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{t('spatiflacBuiltinRepo')}</p>
                    <p className="text-[11px] text-gray-500 font-persian truncate">{t('spatiflacBuiltinRepoDesc')}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase ${isRTL ? '' : 'ml-auto'}`}>{t('spatiflacExtensionOn')}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {spatiflacExts.map(ext => (
                  <div key={ext.id} className={`p-4 rounded-xl border transition-all ${ext.enabled ? 'bg-black/40 border-white/10' : 'bg-black/20 border-white/5 opacity-70'}`} style={ext.enabled ? { boxShadow: `0 0 0 1px ${ext.color}22, 0 0 18px ${ext.color}14` } : {}}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0" style={{ background: `linear-gradient(135deg, ${ext.color}, ${ext.color}88)` }}>{ext.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h4 className="text-white font-bold text-sm truncate">{ext.name}</h4>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">v{ext.version}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-persian truncate">{ext.description}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5 truncate font-persian">{t('spatiflacQualityNote')}: {ext.qualityOptions.map(q => q.label).join(' · ')}</p>
                      </div>
                      <button onClick={() => setExtensionEnabled(ext.id, !ext.enabled)} className={`relative w-12 h-6 rounded-full p-1 transition-colors shrink-0 ${ext.enabled ? '' : 'bg-zinc-700'}`} style={ext.enabled ? { backgroundColor: ext.color } : {}} title={ext.enabled ? t('spatiflacExtensionOn') : t('spatiflacExtensionOff')}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${ext.enabled ? (isRTL ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-600 mt-4 leading-relaxed font-persian flex items-start gap-1.5"><Cpu size={12} className="text-zinc-500 shrink-0 mt-0.5" />{t('spatiflacPoweredBy')}</p>
            </>
          ) : (
            <>
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 mb-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('extStoreRegistryLabel')}</span>
                <div className={`flex gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    value={storeUrlInput}
                    onChange={e => setStoreUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addRegistryUrl(); }}
                    placeholder={t('extStoreRegistryPlaceholder')}
                    className="flex-1 min-w-0 px-3 py-2.5 bg-zinc-900/70 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:border-violet-500/50 transition-all font-persian"
                  />
                  <button onClick={addRegistryUrl} className="shrink-0 px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm transition-all active:scale-95 flex items-center gap-2"><Plus size={15} />{t('extStoreAddRegistry')}</button>
                </div>
                {registryUrls.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-3">
                    {registryUrls.map((url, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs text-gray-400 bg-zinc-900/60 rounded-lg px-3 py-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Globe size={12} className="text-zinc-500 shrink-0" />
                        <span className="flex-1 truncate font-mono text-left" dir="ltr">{url}</span>
                        <button onClick={() => updateRegistryUrls(registryUrls.filter(u => u !== url))} className="text-zinc-500 hover:text-red-400 transition-colors shrink-0"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <button onClick={refreshStore} disabled={storeLoading || registryUrls.length === 0} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                    <RefreshCw size={14} className={storeLoading ? 'animate-spin' : ''} />{storeLoading ? t('extStoreLoading') : t('extStoreRefresh')}
                  </button>
                  {storeErrors.length > 0 && <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1"><AlertTriangle size={12} />{t('extStoreRegistryError')} ({storeErrors.length})</span>}
                </div>
              </div>

              {storeInstallError && (
                <div className="flex items-center gap-2 px-4 py-2.5 mb-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span className="font-persian">{t('extStoreInstallError')}: {storeInstallError}</span>
                </div>
              )}

              {storeLoading ? (
                <div className="h-32 flex flex-col items-center justify-center gap-3 text-gray-500">
                  <Loader2 size={26} className="animate-spin text-violet-400" />
                  <span className="text-sm font-persian">{t('extStoreLoading')}</span>
                </div>
              ) : storeExts.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center gap-2 text-gray-500 opacity-80">
                  <Package size={36} className="text-zinc-700" />
                  <p className="font-persian">{t('extStoreEmpty')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {storeExts.map(ext => {
                    const installed = storeInstalledIds.includes(ext.id);
                    const requiresNewer = ext.minAppVersion && compareVersions(VERSION, ext.minAppVersion) < 0;
                    return (
                      <div key={ext.id} className={`p-4 rounded-xl border transition-all ${installed ? 'bg-black/40 border-violet-500/30' : 'bg-black/20 border-white/5 hover:border-white/15'}`} style={installed ? { boxShadow: `0 0 18px ${ext.color}18` } : {}}>
                        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          {ext.iconUrl ? (
                            <img src={ext.iconUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0" style={{ background: `linear-gradient(135deg, ${ext.color}, ${ext.color}88)` }}>{ext.name.charAt(0)}</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <h4 className="text-white font-bold text-sm">{ext.name}</h4>
                              <span className="text-[10px] font-mono text-zinc-500">v{ext.version}</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase" style={{ color: ext.color, backgroundColor: `${ext.color}1a`, border: `1px solid ${ext.color}44` }}>{ext.category || 'extension'}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 font-persian line-clamp-2">{ext.description}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(ext.tags || []).slice(0, 3).map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] text-gray-400">#{tag}</span>
                              ))}
                            </div>
                            {requiresNewer && <span className="inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30"><AlertTriangle size={9} />{t('extStoreRequires')} {ext.minAppVersion}</span>}
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 mt-3 ${isRTL ? 'flex-row-reverse' : 'justify-end'}`}>
                          {installed ? (
                            <>
                              <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><Check size={11} />{t('extStoreInstalled')}</span>
                              <button onClick={() => handleUninstallExt(ext)} disabled={storeBusyId === ext.id} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all flex items-center gap-1.5">{storeBusyId === ext.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}{t('extStoreUninstall')}</button>
                            </>
                          ) : (
                            <button onClick={() => handleInstallExt(ext)} disabled={storeBusyId === ext.id} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5">
                              {storeBusyId === ext.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}{t('extStoreInstall')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="relative shrink-0 px-5 sm:px-7 py-4 border-t border-white/5 bg-zinc-950/90 flex items-center justify-end">
          <button onClick={onClose} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-red-900/40">Done</button>
        </div>
      </div>
    </div>
  );
};

export default ExtensionsModal;