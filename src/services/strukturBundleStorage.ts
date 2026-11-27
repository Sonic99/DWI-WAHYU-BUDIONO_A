import { StrukturOrganisasiBundle } from '../types';

const DB_NAME = 'sip_tu_struktur_org_db_v1';
const DB_VERSION = 1;
const STORE_BUNDLES = 'bundles';
const ACTIVE_KEY = 'active_struktur_bundle';

interface StoredStrukturRecord {
  id: string;
  bundle: StrukturOrganisasiBundle;
  savedAt: string;
}

const openStrukturDb = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_BUNDLES)) {
          db.createObjectStore(STORE_BUNDLES, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const saveStrukturOrganisasiToIdb = async (
  bundle: StrukturOrganisasiBundle
): Promise<boolean> => {
  const db = await openStrukturDb();
  if (!db) return false;

  return new Promise(resolve => {
    try {
      const tx = db.transaction([STORE_BUNDLES], 'readwrite');
      const store = tx.objectStore(STORE_BUNDLES);
      const record: StoredStrukturRecord = {
        id: ACTIVE_KEY,
        bundle,
        savedAt: new Date().toISOString()
      };
      store.put(record);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
};

export const loadStrukturOrganisasiFromIdb = async (): Promise<StrukturOrganisasiBundle | null> => {
  const db = await openStrukturDb();
  if (!db) return null;

  return new Promise(resolve => {
    try {
      const tx = db.transaction([STORE_BUNDLES], 'readonly');
      const req = tx.objectStore(STORE_BUNDLES).get(ACTIVE_KEY);
      req.onsuccess = () => {
        db.close();
        const rec = req.result as StoredStrukturRecord | undefined;
        resolve(rec?.bundle || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
};

export const countInlinePhotoDataUrls = (bundle?: Partial<StrukturOrganisasiBundle> | null): number => {
  if (!bundle || !Array.isArray(bundle.nodes)) return 0;
  let count = 0;
  bundle.nodes.forEach(n => {
    if (n.fotoUrl && n.fotoUrl.startsWith('data:image/')) count++;
    if (Array.isArray(n.stafWaka)) {
      n.stafWaka.forEach(s => {
        if (s.fotoUrl && s.fotoUrl.startsWith('data:image/')) count++;
      });
    }
  });
  return count;
};

export const compactStrukturBundleForLocalStorage = (
  bundle: StrukturOrganisasiBundle
): StrukturOrganisasiBundle => ({
  ...bundle,
  settings: {
    ...bundle.settings,
    ttdKsUrl:
      bundle.settings?.ttdKsUrl && bundle.settings.ttdKsUrl.startsWith('data:image/')
        ? ''
        : bundle.settings?.ttdKsUrl,
    stempelUrl:
      bundle.settings?.stempelUrl && bundle.settings.stempelUrl.startsWith('data:image/')
        ? ''
        : bundle.settings?.stempelUrl
  },
  nodes: bundle.nodes.map(n => ({
    ...n,
    fotoUrl: n.fotoUrl && n.fotoUrl.startsWith('data:image/') ? '' : n.fotoUrl,
    stafWaka: Array.isArray(n.stafWaka)
      ? n.stafWaka.map(s => ({
          ...s,
          fotoUrl: s.fotoUrl && s.fotoUrl.startsWith('data:image/') ? '' : s.fotoUrl
        }))
      : n.stafWaka
  }))
});
