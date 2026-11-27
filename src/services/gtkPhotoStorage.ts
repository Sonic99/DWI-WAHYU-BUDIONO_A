import { Guru, Tendik } from '../types';

const DB_NAME = 'sip_tu_gtk_photos_db_v1';
const DB_VERSION = 1;
const STORE_PHOTOS = 'gtk_photos';
const ACTIVE_MAP_KEY = 'active_gtk_photo_map';

interface StoredGtkPhotoMapRecord {
  id: string;
  photos: Record<string, string>;
  savedAt: string;
}

const openGtkPhotoDb = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const loadGtkPhotoMapFromIdb = async (): Promise<Record<string, string>> => {
  const db = await openGtkPhotoDb();
  if (!db) return {};

  return new Promise(resolve => {
    try {
      const tx = db.transaction([STORE_PHOTOS], 'readonly');
      const req = tx.objectStore(STORE_PHOTOS).get(ACTIVE_MAP_KEY);
      req.onsuccess = () => {
        db.close();
        const rec = req.result as StoredGtkPhotoMapRecord | undefined;
        resolve(rec?.photos && typeof rec.photos === 'object' ? rec.photos : {});
      };
      req.onerror = () => {
        db.close();
        resolve({});
      };
    } catch {
      db.close();
      resolve({});
    }
  });
};

export const saveGtkPhotoMapToIdb = async (photos: Record<string, string>): Promise<boolean> => {
  const db = await openGtkPhotoDb();
  if (!db) return false;

  return new Promise(resolve => {
    try {
      const tx = db.transaction([STORE_PHOTOS], 'readwrite');
      const store = tx.objectStore(STORE_PHOTOS);
      const record: StoredGtkPhotoMapRecord = {
        id: ACTIVE_MAP_KEY,
        photos,
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

export const upsertGtkPhotosToIdb = async (
  entries: Array<{ id: string; fotoUrl?: string }>
): Promise<boolean> => {
  const existing = await loadGtkPhotoMapFromIdb();
  const next: Record<string, string> = { ...existing };

  entries.forEach(item => {
    const clean = (item.fotoUrl || '').trim();
    if (clean) {
      next[item.id] = clean;
    } else if (item.id in next) {
      delete next[item.id];
    }
  });

  return saveGtkPhotoMapToIdb(next);
};

export const stripInlineGtkPhotos = <T extends Guru>(list: T[]): T[] =>
  list.map(item =>
    item.fotoUrl && item.fotoUrl.startsWith('data:image/')
      ? { ...item, fotoUrl: '' }
      : item
  );

export const mergeGtkPhotosFromMap = <T extends Guru>(
  list: T[],
  photoMap: Record<string, string>
): { list: T[]; changed: boolean } => {
  let changed = false;
  const merged = list.map(item => {
    const current = (item.fotoUrl || '').trim();
    const stored = (photoMap[item.id] || '').trim();
    if (!current && stored) {
      changed = true;
      return { ...item, fotoUrl: stored };
    }
    return item;
  });
  return { list: merged, changed };
};

export const compressGtkPhotoFileToDataUrl = (
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<string> => {
  const maxWidth = options?.maxWidth ?? 270;
  const maxHeight = options?.maxHeight ?? 360;
  const quality = options?.quality ?? 0.84;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = ev => {
      const rawDataUrl = typeof ev.target?.result === 'string' ? ev.target.result : '';
      if (!rawDataUrl) {
        reject(new Error('Berkas gambar kosong.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || img.width || maxWidth;
          const naturalH = img.naturalHeight || img.height || maxHeight;
          const scale = Math.min(1, maxWidth / naturalW, maxHeight / naturalH);
          const targetW = Math.max(1, Math.round(naturalW * scale));
          const targetH = Math.max(1, Math.round(naturalH * scale));

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed || rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => reject(new Error('Format gambar tidak didukung browser.'));
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
};

export type { Guru, Tendik };
