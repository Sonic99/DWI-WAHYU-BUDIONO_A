import {
  DailyPresensiRecord,
  PresensiConfig,
  PresensiEmployeeItem,
  PresensiMonthlyRepoItem
} from '../types';
import {
  calculateEmployeeMonthlySummary,
  NAMA_BULAN_ID
} from '../utils/presensiBkd';
import {
  getStoredPresensiMonthlyRepo,
  saveStoredPresensiMonthlyRepo
} from './storageService';

const DB_NAME = 'sip_tu_presensi_repo_db_v1';
const DB_VERSION = 1;
const STORE_SNAPSHOTS = 'monthly_snapshots';
const STORE_RAW_FILES = 'raw_excel_files';

interface RawExcelFileRecord {
  repoId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: ArrayBuffer;
  savedAt: string;
}

const openRepoDatabase = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise(resolve => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_RAW_FILES)) {
          db.createObjectStore(STORE_RAW_FILES, { keyPath: 'repoId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const sortRepoList = (list: PresensiMonthlyRepoItem[]): PresensiMonthlyRepoItem[] => {
  return [...list].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    if (b.month !== a.month) return b.month - a.month;
    return new Date(b.updatedAt || b.importedAt).getTime() - new Date(a.updatedAt || a.importedAt).getTime();
  });
};

export const extractMonthAttendanceMap = (
  attendanceMap: Record<string, Record<string, DailyPresensiRecord>>,
  year: number,
  month1To12: number,
  targetEmployees?: PresensiEmployeeItem[]
): Record<string, Record<string, DailyPresensiRecord>> => {
  const monthPrefix = `${year}-${String(month1To12).padStart(2, '0')}-`;
  const allowedIds = targetEmployees ? new Set(targetEmployees.map(e => e.id)) : null;
  const scoped: Record<string, Record<string, DailyPresensiRecord>> = {};

  Object.entries(attendanceMap || {}).forEach(([empId, recMap]) => {
    if (allowedIds && !allowedIds.has(empId)) return;
    if (!recMap || typeof recMap !== 'object') return;
    const filteredDates: Record<string, DailyPresensiRecord> = {};
    Object.entries(recMap).forEach(([dateStr, rec]) => {
      if (dateStr.startsWith(monthPrefix) && rec) {
        filteredDates[dateStr] = rec;
      }
    });
    if (Object.keys(filteredDates).length > 0) {
      scoped[empId] = filteredDates;
    }
  });

  return scoped;
};

export const buildPresensiMonthlyRepoItem = (params: {
  id?: string;
  year: number;
  month: number;
  label?: string;
  fileName?: string;
  fileSizeBytes?: number;
  sourceType: 'excel_import' | 'manual_snapshot';
  importMode?: 'merge' | 'replace';
  importedBy?: string;
  employees: PresensiEmployeeItem[];
  attendanceMap: Record<string, Record<string, DailyPresensiRecord>>;
  config: PresensiConfig;
  catatan?: string;
  hasRawExcelFile?: boolean;
}): PresensiMonthlyRepoItem => {
  const {
    id,
    year,
    month,
    label,
    fileName,
    fileSizeBytes,
    sourceType,
    importMode,
    importedBy,
    employees,
    attendanceMap,
    config,
    catatan,
    hasRawExcelFile
  } = params;

  const bulanName = NAMA_BULAN_ID[month - 1] || `Bulan ${month}`;
  const monthAttendanceMap = extractMonthAttendanceMap(attendanceMap, year, month, employees);
  const clonedEmployees = employees.map(e => ({ ...e }));

  let guruCount = 0;
  let tendikCount = 0;
  let sumPct = 0;
  let totalHadirTepat = 0;
  let totalTerlambatHari = 0;
  let totalAlpa = 0;

  clonedEmployees.forEach(emp => {
    if (emp.kategori === 'Guru') guruCount++;
    else tendikCount++;
    const s = calculateEmployeeMonthlySummary(
      emp,
      monthAttendanceMap[emp.id],
      config,
      year,
      month
    );
    sumPct += s.persentaseHadir;
    totalHadirTepat += s.hadirTepat;
    totalTerlambatHari += s.terlambatHari;
    totalAlpa += s.alpa;
  });

  const avgPersentaseHadir =
    clonedEmployees.length > 0
      ? Number((sumPct / clonedEmployees.length).toFixed(1))
      : 0;

  const nowIso = new Date().toISOString();
  const defaultLabel =
    sourceType === 'excel_import'
      ? `Log BKD ${bulanName} ${year}`
      : `Arsip Presensi ${bulanName} ${year}`;

  return {
    id: id || `prepo-${year}${String(month).padStart(2, '0')}-${Date.now()}`,
    year,
    month,
    label: label?.trim() || defaultLabel,
    fileName,
    fileSizeBytes,
    sourceType,
    importMode,
    importedAt: nowIso,
    updatedAt: nowIso,
    importedBy,
    employeeCount: clonedEmployees.length,
    guruCount,
    tendikCount,
    avgPersentaseHadir,
    totalHadirTepat,
    totalTerlambatHari,
    totalAlpa,
    employees: clonedEmployees,
    monthAttendanceMap,
    catatan: catatan?.trim() || undefined,
    hasRawExcelFile: Boolean(hasRawExcelFile)
  };
};

export const loadPresensiMonthlyRepo = async (): Promise<PresensiMonthlyRepoItem[]> => {
  const lsList = getStoredPresensiMonthlyRepo();
  const db = await openRepoDatabase();
  if (!db) {
    return sortRepoList(lsList);
  }

  return new Promise(resolve => {
    try {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const idbList: PresensiMonthlyRepoItem[] = Array.isArray(req.result) ? req.result : [];
        const byId = new Map<string, PresensiMonthlyRepoItem>();
        lsList.forEach(item => {
          if (item && item.id) byId.set(item.id, item);
        });
        idbList.forEach(item => {
          if (item && item.id) byId.set(item.id, item);
        });
        const merged = sortRepoList(Array.from(byId.values()));
        db.close();
        resolve(merged);
      };
      req.onerror = () => {
        db.close();
        resolve(sortRepoList(lsList));
      };
    } catch {
      db.close();
      resolve(sortRepoList(lsList));
    }
  });
};

export const upsertPresensiMonthlyRepoItem = async (
  item: PresensiMonthlyRepoItem,
  rawFile?: { buffer: ArrayBuffer; fileName: string; mimeType?: string }
): Promise<PresensiMonthlyRepoItem[]> => {
  const existing = await loadPresensiMonthlyRepo();
  const filtered = existing.filter(x => x.id !== item.id);
  const nextItem: PresensiMonthlyRepoItem = {
    ...item,
    hasRawExcelFile: rawFile ? true : Boolean(item.hasRawExcelFile),
    updatedAt: new Date().toISOString()
  };
  const nextList = sortRepoList([nextItem, ...filtered]);
  saveStoredPresensiMonthlyRepo(nextList);

  const db = await openRepoDatabase();
  if (db) {
    await new Promise<void>(resolve => {
      try {
        const stores = rawFile ? [STORE_SNAPSHOTS, STORE_RAW_FILES] : [STORE_SNAPSHOTS];
        const tx = db.transaction(stores, 'readwrite');
        tx.objectStore(STORE_SNAPSHOTS).put(nextItem);
        if (rawFile) {
          const rawRecord: RawExcelFileRecord = {
            repoId: nextItem.id,
            fileName: rawFile.fileName,
            mimeType:
              rawFile.mimeType ||
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            sizeBytes: rawFile.buffer.byteLength,
            buffer: rawFile.buffer,
            savedAt: new Date().toISOString()
          };
          tx.objectStore(STORE_RAW_FILES).put(rawRecord);
        }
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

  return nextList;
};

export const updatePresensiMonthlyRepoMeta = async (
  repoId: string,
  patch: { label?: string; catatan?: string }
): Promise<PresensiMonthlyRepoItem[]> => {
  const existing = await loadPresensiMonthlyRepo();
  const target = existing.find(x => x.id === repoId);
  if (!target) return existing;

  const updated: PresensiMonthlyRepoItem = {
    ...target,
    label: patch.label !== undefined ? patch.label.trim() || target.label : target.label,
    catatan: patch.catatan !== undefined ? patch.catatan.trim() || undefined : target.catatan,
    updatedAt: new Date().toISOString()
  };

  return upsertPresensiMonthlyRepoItem(updated);
};

export const deletePresensiMonthlyRepoItem = async (
  repoId: string
): Promise<PresensiMonthlyRepoItem[]> => {
  const existing = await loadPresensiMonthlyRepo();
  const nextList = sortRepoList(existing.filter(x => x.id !== repoId));
  saveStoredPresensiMonthlyRepo(nextList);

  const db = await openRepoDatabase();
  if (db) {
    await new Promise<void>(resolve => {
      try {
        const tx = db.transaction([STORE_SNAPSHOTS, STORE_RAW_FILES], 'readwrite');
        tx.objectStore(STORE_SNAPSHOTS).delete(repoId);
        tx.objectStore(STORE_RAW_FILES).delete(repoId);
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

  return nextList;
};

export const getPresensiMonthlyRepoRawFile = async (
  repoId: string
): Promise<RawExcelFileRecord | null> => {
  const db = await openRepoDatabase();
  if (!db) return null;

  return new Promise(resolve => {
    try {
      const tx = db.transaction([STORE_RAW_FILES], 'readonly');
      const req = tx.objectStore(STORE_RAW_FILES).get(repoId);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as RawExcelFileRecord) || null);
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

export const downloadPresensiMonthlyRepoRawExcel = async (
  item: PresensiMonthlyRepoItem
): Promise<boolean> => {
  const rec = await getPresensiMonthlyRepoRawFile(item.id);
  if (!rec || !rec.buffer) return false;

  const blob = new Blob([rec.buffer], {
    type:
      rec.mimeType ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = rec.fileName || item.fileName || `Arsip_Presensi_${item.month}_${item.year}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
};

export const formatRepoByteSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
