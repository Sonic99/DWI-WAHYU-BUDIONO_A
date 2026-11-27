const DB_NAME = 'sip_tu_skp_evidence_db_v1';
const DB_VERSION = 1;
const STORE_FILES = 'evidence_files';

export interface SkpEvidenceBinaryRecord {
  buktiId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: ArrayBuffer;
  savedAt: string;
}

const openEvidenceDb = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES, { keyPath: 'buktiId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const saveSkpEvidenceFile = async (
  buktiId: string,
  file: File
): Promise<{ sizeBytes: number; mimeType: string; fileName: string }> => {
  const buffer = await file.arrayBuffer();
  const mimeType = file.type || 'application/octet-stream';
  const fileName = file.name || `bukti_${buktiId}`;

  const db = await openEvidenceDb();
  if (db) {
    await new Promise<void>(resolve => {
      try {
        const tx = db.transaction([STORE_FILES], 'readwrite');
        const record: SkpEvidenceBinaryRecord = {
          buktiId,
          fileName,
          mimeType,
          sizeBytes: buffer.byteLength,
          buffer,
          savedAt: new Date().toISOString()
        };
        tx.objectStore(STORE_FILES).put(record);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  return {
    sizeBytes: buffer.byteLength,
    mimeType,
    fileName
  };
};

export const getSkpEvidenceFile = async (
  buktiId: string
): Promise<SkpEvidenceBinaryRecord | null> => {
  const db = await openEvidenceDb();
  if (!db) return null;

  return new Promise(resolve => {
    try {
      const tx = db.transaction([STORE_FILES], 'readonly');
      const req = tx.objectStore(STORE_FILES).get(buktiId);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as SkpEvidenceBinaryRecord) || null);
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

export const deleteSkpEvidenceFile = async (buktiId: string): Promise<void> => {
  const db = await openEvidenceDb();
  if (!db) return;

  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction([STORE_FILES], 'readwrite');
      tx.objectStore(STORE_FILES).delete(buktiId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
};

export const formatEvidenceByteSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
