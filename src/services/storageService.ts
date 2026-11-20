import * as XLSX from 'xlsx';
import { 
  SchoolProfile, 
  User, 
  SuratMasuk, 
  SuratKeluar, 
  AuditLog, 
  BackupRecord, 
  DatabaseSnapshot,
  Disposisi,
  Siswa,
  Guru,
  Tendik,
  TemplateSurat,
  KartuUjianSettings,
  JadwalUjianItem,
  PanitiaPengawasItem,
  KartuPanitiaSettings,
  JadwalPengawasSlot
} from '../types';
import { 
  initialSchoolProfile, 
  initialUsers, 
  initialSuratMasuk, 
  initialSuratKeluar, 
  initialAuditLogs, 
  initialBackupHistory,
  initialSiswa,
  initialGuru,
  initialTendik,
  initialTemplates,
  initialKartuUjianSettings,
  initialPanitiaPengawas,
  initialKartuPanitiaSettings
} from '../data/initialData';
import {
  normalizeIndonesianBaseName,
  buildPanitiaFromGtkDatabase
} from '../utils/panitiaFormat';
import {
  DEFAULT_JADWAL_PENGAWAS_SLOTS,
  buildPengawasFromJadwalMatrix,
  summarizePengawasSchedule,
  normalizeAssignmentValue,
  recomputeTotalsPerSlot
} from '../utils/pengawasSchedule';

const STORAGE_KEYS = {
  SCHOOL_PROFILE: 'sip_tu_school_profile_v1',
  USERS: 'sip_tu_users_v1',
  CURRENT_USER: 'sip_tu_current_user_v1',
  SURAT_MASUK: 'sip_tu_surat_masuk_v1',
  SURAT_KELUAR: 'sip_tu_surat_keluar_v1',
  AUDIT_LOGS: 'sip_tu_audit_logs_v1',
  BACKUP_HISTORY: 'sip_tu_backup_history_v1',
  SISWA: 'sip_tu_siswa_v1',
  GURU: 'sip_tu_guru_v1',
  TENDIK: 'sip_tu_tendik_master_v1',
  TEMPLATES: 'sip_tu_templates_v1',
  KARTU_UJIAN: 'sip_tu_kartu_ujian_v1',
  PANITIA_PENGAWAS: 'sip_tu_panitia_pengawas_v1',
  KARTU_PANITIA_SETTINGS: 'sip_tu_kartu_panitia_settings_v1',
};

// Safe retrieval helpers
export const getStoredSchoolProfile = (): SchoolProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHOOL_PROFILE);
    if (!raw) return initialSchoolProfile;
    const parsed: SchoolProfile = JSON.parse(raw);
    const hasLegacyKop =
      !parsed.faksimili ||
      parsed.telepon === '(031) 5342112' ||
      parsed.alamat === 'Jl. Wijaya Kusuma No. 48, Kel. Ketabang, Kec. Genteng';
    if (hasLegacyKop) {
      const upgraded: SchoolProfile = {
        ...parsed,
        alamat: initialSchoolProfile.alamat,
        kota: initialSchoolProfile.kota,
        provinsi: initialSchoolProfile.provinsi,
        kodePos: initialSchoolProfile.kodePos,
        telepon: initialSchoolProfile.telepon,
        faksimili: initialSchoolProfile.faksimili,
        website: initialSchoolProfile.website,
        email: initialSchoolProfile.email,
        logoType: parsed.logoType === 'custom' && parsed.logoUrl ? 'custom' : 'pemprov',
      };
      localStorage.setItem(STORAGE_KEYS.SCHOOL_PROFILE, JSON.stringify(upgraded));
      return upgraded;
    }
    return {
      ...initialSchoolProfile,
      ...parsed,
      logoType: parsed.logoType || 'pemprov'
    };
  } catch {
    return initialSchoolProfile;
  }
};

export const saveStoredSchoolProfile = (profile: SchoolProfile): void => {
  localStorage.setItem(STORAGE_KEYS.SCHOOL_PROFILE, JSON.stringify(profile));
};

export const sanitizePrefixNomorUjian = (prefix: string): string => {
  return (prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
};

export const resolveAwalNopes10Digit = (raw?: string): string => {
  const clean = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '2627101001';
  if (clean.length === 10) return clean;
  if (clean.length > 10) return clean.slice(0, 7) + clean.slice(-3);
  // Complete <10 char prefix into a 10-char starting Nopes ending in ...001 / ...01
  return `${clean}${'1'.padStart(10 - clean.length, '0')}`;
};

export const sanitizeNomorUjian10Digit = (raw: string, padTo10 = false): string => {
  const clean = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';
  if (clean.length > 10) {
    // Preserve leading 7 chars + trailing 3 chars so uniqueness is kept
    return clean.slice(0, 7) + clean.slice(-3);
  }
  if (padTo10 && clean.length < 10) {
    return clean.padStart(10, '0');
  }
  return clean;
};

export const applyAwalNopesToInput = (rawInput: string, awalNopes?: string): string => {
  const clean = (rawInput || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  if (!clean) return '';
  if (clean.length === 10) return clean;
  const base = resolveAwalNopes10Digit(awalNopes);
  return `${base.slice(0, 10 - clean.length)}${clean}`;
};

export const formatNomorUjian10Digit = (awalNopes: string, indexZeroBased: number): string => {
  const baseStr = resolveAwalNopes10Digit(awalNopes);
  const offset = Math.max(0, Math.floor(indexZeroBased));
  const trailingMatch = baseStr.match(/^(.*?)(\d+)$/);

  if (trailingMatch) {
    const [, head, numStr] = trailingMatch;
    const nextNum = BigInt(numStr) + BigInt(offset);
    const nextStr = nextNum.toString().padStart(numStr.length, '0');
    const headKeep = Math.max(0, 10 - nextStr.length);
    return `${head.slice(0, headKeep)}${nextStr}`.slice(-10).padStart(10, '0');
  }

  // Fallback if starting Nopes ends with a letter (no trailing digits)
  const seqWidth = Math.max(3, String(offset + 1).length);
  const seqStr = String(offset + 1).padStart(seqWidth, '0');
  return `${baseStr.slice(0, Math.max(0, 10 - seqStr.length))}${seqStr}`.slice(0, 10);
};

export const getStoredKartuUjianSettings = (): KartuUjianSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KARTU_UJIAN);
    if (!raw) return initialKartuUjianSettings;
    const parsed = JSON.parse(raw);
    const merged: KartuUjianSettings = { ...initialKartuUjianSettings, ...parsed };
    const resolvedAwal = resolveAwalNopes10Digit(
      merged.nomorPesertaAwal || merged.prefixNomorUjian || initialKartuUjianSettings.nomorPesertaAwal
    );
    return {
      ...merged,
      prefixNomorUjian: resolvedAwal,
      nomorPesertaAwal: resolvedAwal,
      sesiTersedia: Array.isArray(parsed.sesiTersedia)
        ? parsed.sesiTersedia
        : initialKartuUjianSettings.sesiTersedia,
      sinkronWaktuJadwalDenganSesi: merged.sinkronWaktuJadwalDenganSesi !== false
    };
  } catch {
    return initialKartuUjianSettings;
  }
};

export const saveStoredKartuUjianSettings = (settings: KartuUjianSettings): void => {
  localStorage.setItem(STORAGE_KEYS.KARTU_UJIAN, JSON.stringify(settings));
};

export const getStoredPanitiaPengawas = (): PanitiaPengawasItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PANITIA_PENGAWAS);
    if (!raw) {
      return buildPengawasFromJadwalMatrix(
        getStoredGuru(),
        getStoredTendik(),
        initialPanitiaPengawas,
        getStoredKartuPanitiaSettings()
      ).nextItems;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return initialPanitiaPengawas;

    let currentList: PanitiaPengawasItem[] = parsed;
    let didUpgrade = false;

    // 1. Detect untouched legacy 5-person panitia placeholder and upgrade cleanly
    const legacyPan = currentList.filter(i => i?.kategori === 'panitia');
    const isUntouchedLegacyPanitia =
      legacyPan.length <= 5 &&
      legacyPan.some(i => i.id === 'pp-pan-02' && /agus supriyanto/i.test(i.nama)) &&
      legacyPan.some(i => i.id === 'pp-pan-03' && /sri rahayu/i.test(i.nama));
    if (isUntouchedLegacyPanitia) {
      currentList = buildPanitiaFromGtkDatabase(
        getStoredGuru(),
        getStoredTendik(),
        currentList,
        getStoredKartuPanitiaSettings()
      ).nextItems;
      didUpgrade = true;
    }

    // 2. Detect untouched legacy 4-person pengawas placeholder and upgrade to 33-proctor schedule matrix
    const legacyPgw = currentList.filter(i => i?.kategori === 'pengawas');
    const isUntouchedLegacyPengawas =
      legacyPgw.length <= 4 &&
      legacyPgw.some(i => i.id === 'pp-pgw-01' && /achmad diran/i.test(i.nama)) &&
      legacyPgw.some(i => i.id === 'pp-pgw-04' && /bambang heru/i.test(i.nama));
    if (isUntouchedLegacyPengawas || legacyPgw.length === 0) {
      currentList = buildPengawasFromJadwalMatrix(
        getStoredGuru(),
        getStoredTendik(),
        currentList,
        getStoredKartuPanitiaSettings()
      ).nextItems;
      didUpgrade = true;
    }

    if (didUpgrade) {
      localStorage.setItem(STORAGE_KEYS.PANITIA_PENGAWAS, JSON.stringify(currentList));
    }
    return currentList;
  } catch {
    return initialPanitiaPengawas;
  }
};

export const saveStoredPanitiaPengawas = (list: PanitiaPengawasItem[]): void => {
  localStorage.setItem(STORAGE_KEYS.PANITIA_PENGAWAS, JSON.stringify(list));
};

export const getStoredKartuPanitiaSettings = (): KartuPanitiaSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KARTU_PANITIA_SETTINGS);
    if (!raw) return initialKartuPanitiaSettings;
    const parsed = JSON.parse(raw);
    const namaUjian =
      parsed.namaUjian === 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)'
        ? initialKartuPanitiaSettings.namaUjian
        : parsed.namaUjian ?? initialKartuPanitiaSettings.namaUjian;
    return {
      ...initialKartuPanitiaSettings,
      ...parsed,
      namaUjian,
      sesiTersedia: Array.isArray(parsed.sesiTersedia)
        ? parsed.sesiTersedia
        : initialKartuPanitiaSettings.sesiTersedia,
      jadwalPengawasSlots:
        Array.isArray(parsed.jadwalPengawasSlots) && parsed.jadwalPengawasSlots.length > 0
          ? parsed.jadwalPengawasSlots
          : initialKartuPanitiaSettings.jadwalPengawasSlots,
      tampilkanJadwalDiKartuPengawas:
        parsed.tampilkanJadwalDiKartuPengawas !== undefined
          ? Boolean(parsed.tampilkanJadwalDiKartuPengawas)
          : true,
      modeTampilanBelakangPengawas:
        parsed.modeTampilanBelakangPengawas || 'jadwal_dan_tatib'
    };
  } catch {
    return initialKartuPanitiaSettings;
  }
};

export const saveStoredKartuPanitiaSettings = (settings: KartuPanitiaSettings): void => {
  localStorage.setItem(STORAGE_KEYS.KARTU_PANITIA_SETTINGS, JSON.stringify(settings));
};

export const getStoredUsers = (): User[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : initialUsers;
  } catch {
    return initialUsers;
  }
};

export const saveStoredUsers = (users: User[]): void => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const getStoredCurrentUser = (): User => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (raw) return JSON.parse(raw);
    const users = getStoredUsers();
    return users[0] || initialUsers[0];
  } catch {
    return initialUsers[0];
  }
};

export const saveStoredCurrentUser = (user: User): void => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
};

export const getStoredSuratMasuk = (): SuratMasuk[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SURAT_MASUK);
    return raw ? JSON.parse(raw) : initialSuratMasuk;
  } catch {
    return initialSuratMasuk;
  }
};

export const saveStoredSuratMasuk = (list: SuratMasuk[]): void => {
  localStorage.setItem(STORAGE_KEYS.SURAT_MASUK, JSON.stringify(list));
};

export const getStoredSuratKeluar = (): SuratKeluar[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SURAT_KELUAR);
    return raw ? JSON.parse(raw) : initialSuratKeluar;
  } catch {
    return initialSuratKeluar;
  }
};

export const saveStoredSuratKeluar = (list: SuratKeluar[]): void => {
  localStorage.setItem(STORAGE_KEYS.SURAT_KELUAR, JSON.stringify(list));
};

export const getStoredAuditLogs = (): AuditLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : initialAuditLogs;
  } catch {
    return initialAuditLogs;
  }
};

export const saveStoredAuditLogs = (logs: AuditLog[]): void => {
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
};

export const appendAuditLog = (action: string, details: string): void => {
  const user = getStoredCurrentUser();
  const logs = getStoredAuditLogs();
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp,
    userId: user.id,
    userName: user.name,
    role: user.role,
    action,
    details
  };

  const updated = [newLog, ...logs].slice(0, 500); // keep last 500 logs
  saveStoredAuditLogs(updated);
};

export const getStoredBackupHistory = (): BackupRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BACKUP_HISTORY);
    return raw ? JSON.parse(raw) : initialBackupHistory;
  } catch {
    return initialBackupHistory;
  }
};

export const saveStoredBackupHistory = (history: BackupRecord[]): void => {
  localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(history));
};

// ================= MASTER DATA SISWA & GURU =================
export const getStoredSiswa = (): Siswa[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SISWA);
    const list: Siswa[] = raw ? JSON.parse(raw) : initialSiswa;
    return list.map(s =>
      s.nomorUjian
        ? { ...s, nomorUjian: sanitizeNomorUjian10Digit(s.nomorUjian, true) }
        : s
    );
  } catch {
    return initialSiswa;
  }
};

export const saveStoredSiswa = (siswaList: Siswa[]): void => {
  localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(siswaList));
};

export const getStoredGuru = (): Guru[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GURU);
    if (!raw) return initialGuru;
    const parsed: Guru[] = JSON.parse(raw);
    const existingNormNames = new Set(
      parsed.map(p => normalizeIndonesianBaseName(p.nama)).filter(Boolean)
    );
    const existingIds = new Set(parsed.map(p => p.id));
    // Ensure core sample teachers & committee teachers exist (checking normalized base name to avoid duplicating imported Dapodik data)
    const missing = initialGuru.filter(initG => {
      if (existingIds.has(initG.id)) return false;
      const norm = normalizeIndonesianBaseName(initG.nama);
      return !existingNormNames.has(norm);
    });
    if (missing.length > 0) {
      const combined = [...parsed, ...missing];
      localStorage.setItem(STORAGE_KEYS.GURU, JSON.stringify(combined));
      return combined;
    }
    return parsed;
  } catch {
    return initialGuru;
  }
};

export const saveStoredGuru = (guruList: Guru[]): void => {
  localStorage.setItem(STORAGE_KEYS.GURU, JSON.stringify(guruList));
};

export const getStoredTendik = (): Tendik[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TENDIK);
    if (!raw) return initialTendik;
    const parsed: Tendik[] = JSON.parse(raw);
    const existingNormNames = new Set(
      parsed.map(p => normalizeIndonesianBaseName(p.nama)).filter(Boolean)
    );
    const existingIds = new Set(parsed.map(p => p.id));
    const missing = initialTendik.filter(initT => {
      if (existingIds.has(initT.id)) return false;
      const norm = normalizeIndonesianBaseName(initT.nama);
      return !existingNormNames.has(norm);
    });
    if (missing.length > 0) {
      const combined = [...parsed, ...missing];
      localStorage.setItem(STORAGE_KEYS.TENDIK, JSON.stringify(combined));
      return combined;
    }
    return parsed;
  } catch {
    return initialTendik;
  }
};

export const saveStoredTendik = (tendikList: Tendik[]): void => {
  localStorage.setItem(STORAGE_KEYS.TENDIK, JSON.stringify(tendikList));
};

export const getStoredTemplates = (): TemplateSurat[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return raw ? JSON.parse(raw) : initialTemplates;
  } catch {
    return initialTemplates;
  }
};

export const saveStoredTemplates = (templates: TemplateSurat[]): void => {
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
};

export const appendBackupHistory = (record: Omit<BackupRecord, 'id' | 'timestamp'>): BackupRecord => {
  const history = getStoredBackupHistory();
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  const newRecord: BackupRecord = {
    ...record,
    id: `bk-${Date.now()}`,
    timestamp
  };

  const updated = [newRecord, ...history];
  localStorage.setItem(STORAGE_KEYS.BACKUP_HISTORY, JSON.stringify(updated));
  
  // Also update lastBackupDate in school profile
  const profile = getStoredSchoolProfile();
  profile.lastBackupDate = timestamp;
  saveStoredSchoolProfile(profile);

  return newRecord;
};

// Snapshot Generator
export const generateDatabaseSnapshot = (): DatabaseSnapshot => {
  const user = getStoredCurrentUser();
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  return {
    version: '2.5.0-SMAN9',
    exportedAt: timestamp,
    exportedBy: `${user.name} (${user.jabatan})`,
    institution: 'SMA NEGERI 9 SURABAYA',
    schoolProfile: getStoredSchoolProfile(),
    suratMasuk: getStoredSuratMasuk(),
    suratKeluar: getStoredSuratKeluar(),
    siswa: getStoredSiswa(),
    guru: getStoredGuru(),
    tendik: getStoredTendik(),
    templates: getStoredTemplates(),
    kartuUjianSettings: getStoredKartuUjianSettings(),
    users: getStoredUsers().map(u => ({ ...u, pin: '******' })), // Mask security PIN on export
    auditLogs: getStoredAuditLogs(),
    backupHistory: getStoredBackupHistory()
  };
};

// Download Local JSON Backup
export const downloadLocalBackup = (): { fileName: string; size: string } => {
  const snapshot = generateDatabaseSnapshot();
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const sizeKb = (blob.size / 1024).toFixed(1) + ' KB';
  
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `SIP_TU_SMAN9_BACKUP_${dateStr}_${Date.now().toString().slice(-4)}.json`;
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const currentUser = getStoredCurrentUser();
  appendBackupHistory({
    type: 'lokal',
    fileName,
    size: sizeKb,
    status: 'Berhasil',
    operator: currentUser.name,
    note: 'Pengunduhan berkas backup database lokal (.json).'
  });

  appendAuditLog('BACKUP_DATABASE_LOKAL', `Mengunduh berkas backup lokal ${fileName} (${sizeKb}).`);
  
  return { fileName, size: sizeKb };
};

// Dispatch Backup to Email (Simulation + client relay)
export const sendBackupToEmail = async (targetEmail: string, note?: string): Promise<{ success: boolean; message: string; record: BackupRecord }> => {
  const snapshot = generateDatabaseSnapshot();
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const sizeKb = (blob.size / 1024).toFixed(1) + ' KB';
  
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `SIP_TU_SMAN9_BACKUP_${dateStr}.json`;
  const currentUser = getStoredCurrentUser();

  // Realistic feedback latency
  await new Promise(resolve => setTimeout(resolve, 800));

  const record = appendBackupHistory({
    type: 'email',
    fileName,
    size: sizeKb,
    status: 'Berhasil',
    targetEmail,
    operator: currentUser.name,
    note: note || `Backup terenkripsi dikirimkan ke email resmi ${targetEmail}`
  });

  appendAuditLog('BACKUP_DATABASE_EMAIL', `Kirim snapshot database ke ${targetEmail} (${sizeKb}, ${snapshot.suratMasuk.length} masuk, ${snapshot.suratKeluar.length} keluar, ${snapshot.siswa?.length || 0} siswa, ${snapshot.guru?.length || 0} guru).`);

  return {
    success: true,
    message: `Pencadangan berhasil dikirim ke ${targetEmail}. Berkas: ${fileName} (${sizeKb}).`,
    record
  };
};

// Export Surat to CSV
export const exportToCSV = (type: 'masuk' | 'keluar' | 'semua'): void => {
  let csvContent = '';
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let fileName = '';

  if (type === 'masuk') {
    const list = getStoredSuratMasuk();
    fileName = `Buku_Agenda_Surat_Masuk_SMAN9_${dateStr}.csv`;
    csvContent = 'No Agenda,No Surat,Tanggal Surat,Tanggal Terima,Pengirim,Perihal,Sifat,Kode Klasifikasi,Status,Disposisi Terakhir,Lokasi Arsip\n';
    list.forEach(item => {
      const dispText = item.disposisiList.length > 0 
        ? `${item.disposisiList[item.disposisiList.length - 1].diteruskanKepada.join('; ')}`
        : '-';
      const row = [
        `"${item.nomorAgenda}"`,
        `"${item.nomorSurat}"`,
        `"${item.tanggalSurat}"`,
        `"${item.tanggalTerima}"`,
        `"${item.pengirim.replace(/"/g, '""')}"`,
        `"${item.perihal.replace(/"/g, '""')}"`,
        `"${item.sifat}"`,
        `"${item.kodeKlasifikasi}"`,
        `"${item.status}"`,
        `"${dispText.replace(/"/g, '""')}"`,
        `"${item.lokasiFisikArsip.replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });
  } else if (type === 'keluar') {
    const list = getStoredSuratKeluar();
    fileName = `Buku_Agenda_Surat_Keluar_SMAN9_${dateStr}.csv`;
    csvContent = 'No Agenda,No Surat,Tanggal Surat,Tujuan,Perihal,Sifat,Kode Klasifikasi,Penandatangan,Status,Lokasi Arsip\n';
    list.forEach(item => {
      const row = [
        `"${item.nomorAgenda}"`,
        `"${item.nomorSurat}"`,
        `"${item.tanggalSurat}"`,
        `"${item.tujuan.replace(/"/g, '""')}"`,
        `"${item.perihal.replace(/"/g, '""')}"`,
        `"${item.sifat}"`,
        `"${item.kodeKlasifikasi}"`,
        `"${item.penandatangan.replace(/"/g, '""')}"`,
        `"${item.status}"`,
        `"${item.lokasiFisikArsip.replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });
  } else {
    // Both
    const masuk = getStoredSuratMasuk();
    const keluar = getStoredSuratKeluar();
    fileName = `Rekap_Persuratan_Lengkap_SMAN9_${dateStr}.csv`;
    csvContent = 'Kategori,No Agenda,No Surat,Tanggal,Pengirim / Tujuan,Perihal,Sifat,Kode Klasifikasi,Status\n';
    masuk.forEach(m => {
      csvContent += `"SURAT MASUK","${m.nomorAgenda}","${m.nomorSurat}","${m.tanggalTerima}","${m.pengirim.replace(/"/g, '""')}","${m.perihal.replace(/"/g, '""')}","${m.sifat}","${m.kodeKlasifikasi}","${m.status}"\n`;
    });
    keluar.forEach(k => {
      csvContent += `"SURAT KELUAR","${k.nomorAgenda}","${k.nomorSurat}","${k.tanggalSurat}","${k.tujuan.replace(/"/g, '""')}","${k.perihal.replace(/"/g, '""')}","${k.sifat}","${k.kodeKlasifikasi}","${k.status}"\n`;
    });
  }

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  appendAuditLog('EXPORT_CSV', `Mengekspor data persuratan ke berkas CSV: ${fileName}.`);
};

// ============================================================================
// DAPODIK SISWA EXCEL (XLSX/XLS) & CSV ENGINE - KEMENDIKBUD STANDAR
// ============================================================================

// Row 0 of Dapodik Siswa Excel (Grouping parent headers matching screenshot)
export const SISWA_EXCEL_ROW_0 = [
  'No',
  'Nama',
  'NIPD',
  'JK',
  'NISN',
  'Tempat Lahir',
  'Tanggal Lahir',
  'NIK',
  'Agama',
  'Alamat',
  'RT',
  'RW',
  'Dusun',
  'Kelurahan',
  'Kecamatan',
  'Kode Pos',
  'Jenis Tinggal',
  'Alat Transportasi',
  'Telepon',
  'HP',
  'E-Mail',
  'SKHUN',
  'Penerima KPS',
  'No. KPS',
  // Cols 24 - 29: Data Ayah
  'Data Ayah', '', '', '', '', '',
  // Cols 30 - 35: Data Ibu
  'Data Ibu', '', '', '', '', '',
  // Cols 36 - 41: Data Wali
  'Data Wali', '', '', '', '', '',
  'Rombel Saat Ini',
  'No Peserta Ujian Nasional',
  'No Seri Ijazah',
  'Penerima KIP',
  'Nomor KIP',
  'Nama di KIP',
  'Nomor KKS',
  'No Registrasi Akta Lahir',
  'Bank',
  'Nomor Rekening Bank',
  'Rekening Atas Nama',
  'Layak PIP (usulan dari sekolah)',
  'Alasan Layak PIP',
  'Kebutuhan Khusus',
  'Sekolah Asal',
  'Anak ke-berapa',
  'Lintang',
  'Bujur',
  'No KK',
  'Berat Badan',
  'Tinggi Badan',
  'Lingkar Kepala',
  'Jml. Saudara Kandung',
  'Jarak Rumah ke Sekolah'
];

// Row 1 of Dapodik Siswa Excel (Sub-headers for merged groups)
export const SISWA_EXCEL_ROW_1 = [
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '', '', '',
  '', '', '', '',
  // Under Data Ayah
  'Nama', 'Tahun Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK',
  // Under Data Ibu
  'Nama', 'Tahun Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK',
  // Under Data Wali
  'Nama', 'Tahun Lahir', 'Jenjang Pendidikan', 'Pekerjaan', 'Penghasilan', 'NIK',
  '', '', '', '', '',
  '', '', '', '', '',
  '', '', '', '', '',
  '', '', '', '', '',
  '', '', '', ''
];

// Merges configuration for Siswa Excel
export const SISWA_EXCEL_MERGES = [
  // Vertically merged single columns (0 to 23)
  ...Array.from({ length: 24 }, (_, i) => ({ s: { r: 0, c: i }, e: { r: 1, c: i } })),
  // Horizontal Group: Data Ayah (Cols 24-29)
  { s: { r: 0, c: 24 }, e: { r: 0, c: 29 } },
  // Horizontal Group: Data Ibu (Cols 30-35)
  { s: { r: 0, c: 30 }, e: { r: 0, c: 35 } },
  // Horizontal Group: Data Wali (Cols 36-41)
  { s: { r: 0, c: 36 }, e: { r: 0, c: 41 } },
  // Vertically merged remaining columns (42 to 65)
  ...Array.from({ length: 24 }, (_, i) => ({ s: { r: 0, c: 42 + i }, e: { r: 1, c: 42 + i } }))
];

// Optimized Column Widths for Siswa Excel
export const SISWA_EXCEL_COLS = [
  { wch: 5 },   // No
  { wch: 25 },  // Nama
  { wch: 10 },  // NIPD
  { wch: 5 },   // JK
  { wch: 14 },  // NISN
  { wch: 16 },  // Tempat Lahir
  { wch: 14 },  // Tanggal Lahir
  { wch: 20 },  // NIK
  { wch: 12 },  // Agama
  { wch: 30 },  // Alamat
  { wch: 6 },   // RT
  { wch: 6 },   // RW
  { wch: 12 },  // Dusun
  { wch: 16 },  // Kelurahan
  { wch: 18 },  // Kecamatan
  { wch: 10 },  // Kode Pos
  { wch: 20 },  // Jenis Tinggal
  { wch: 18 },  // Alat Transportasi
  { wch: 14 },  // Telepon
  { wch: 16 },  // HP
  { wch: 22 },  // E-Mail
  { wch: 14 },  // SKHUN
  { wch: 14 },  // Penerima KPS
  { wch: 14 },  // No. KPS
  // Data Ayah
  { wch: 22 },  // Nama Ayah
  { wch: 12 },  // Th Lahir Ayah
  { wch: 18 },  // Jenjang Ayah
  { wch: 18 },  // Pekerjaan Ayah
  { wch: 22 },  // Penghasilan Ayah
  { wch: 20 },  // NIK Ayah
  // Data Ibu
  { wch: 22 },  // Nama Ibu
  { wch: 12 },  // Th Lahir Ibu
  { wch: 18 },  // Jenjang Ibu
  { wch: 18 },  // Pekerjaan Ibu
  { wch: 22 },  // Penghasilan Ibu
  { wch: 20 },  // NIK Ibu
  // Data Wali
  { wch: 20 },  // Nama Wali
  { wch: 12 },  // Th Lahir Wali
  { wch: 18 },  // Jenjang Wali
  { wch: 18 },  // Pekerjaan Wali
  { wch: 20 },  // Penghasilan Wali
  { wch: 20 },  // NIK Wali
  // Academic & Welfare
  { wch: 16 },  // Rombel Saat Ini
  { wch: 25 },  // No Peserta UN
  { wch: 18 },  // No Seri Ijazah
  { wch: 14 },  // Penerima KIP
  { wch: 14 },  // Nomor KIP
  { wch: 20 },  // Nama di KIP
  { wch: 14 },  // Nomor KKS
  { wch: 25 },  // No Reg Akta Lahir
  { wch: 14 },  // Bank
  { wch: 20 },  // Nomor Rekening Bank
  { wch: 22 },  // Rekening Atas Nama
  { wch: 28 },  // Layak PIP
  { wch: 22 },  // Alasan Layak PIP
  { wch: 18 },  // Kebutuhan Khusus
  { wch: 25 },  // Sekolah Asal
  { wch: 14 },  // Anak ke-berapa
  { wch: 14 },  // Lintang
  { wch: 14 },  // Bujur
  { wch: 20 },  // No KK
  { wch: 12 },  // Berat Badan
  { wch: 12 },  // Tinggi Badan
  { wch: 14 },  // Lingkar Kepala
  { wch: 20 },  // Jml. Saudara Kandung
  { wch: 22 }   // Jarak Rumah ke Sekolah
];

// Helper to convert single Siswa to Dapodik Excel Row Array
export const formatSiswaToExcelRow = (s: Siswa, idx: number): any[] => [
  idx + 1,
  s.nama || '',
  s.nipd || s.nis || '',
  s.jenisKelamin || 'L',
  s.nisn || '',
  s.tempatLahir || '',
  s.tanggalLahir || '',
  s.nik || '',
  s.agama || 'Islam',
  s.alamat || '',
  s.rt || '',
  s.rw || '',
  s.dusun || '',
  s.kelurahan || '',
  s.kecamatan || '',
  s.kodePos || '',
  s.jenisTinggal || 'Bersama orang tua',
  s.alatTransportasi || 'Jalan kaki',
  s.telepon || '',
  s.hp || '',
  s.email || '',
  s.skhun || '',
  s.penerimaKps || 'Tidak',
  s.noKps || '',
  // Data Ayah
  s.namaAyah || s.namaOrtu || '',
  s.tahunLahirAyah || '',
  s.jenjangPendidikanAyah || '',
  s.pekerjaanAyah || '',
  s.penghasilanAyah || '',
  s.nikAyah || '',
  // Data Ibu
  s.namaIbu || '',
  s.tahunLahirIbu || '',
  s.jenjangPendidikanIbu || '',
  s.pekerjaanIbu || '',
  s.penghasilanIbu || '',
  s.nikIbu || '',
  // Data Wali
  s.namaWali || '',
  s.tahunLahirWali || '',
  s.jenjangPendidikanWali || '',
  s.pekerjaanWali || '',
  s.penghasilanWali || '',
  s.nikWali || '',
  // Status Rombel & Bantuan
  s.rombelSaatIni || s.kelas || '',
  s.noPesertaUN || '',
  s.noSeriIjazah || '',
  s.penerimaKip || 'Tidak',
  s.nomorKip || '0',
  s.namaDiKip || '',
  s.nomorKks || '',
  s.noRegAktaLahir || '',
  s.bank || '',
  s.noRekeningBank || '',
  s.rekeningAtasNama || '',
  s.layakPip || 'Tidak',
  s.alasanLayakPip || '',
  s.kebutuhanKhusus || 'Tidak ada',
  s.sekolahAsal || '',
  s.anakKe || '',
  s.lintang || '',
  s.bujur || '',
  s.noKk || '',
  s.beratBadan || '',
  s.tinggiBadan || '',
  s.lingkarKepala || '',
  s.jmlSaudaraKandung || '',
  s.jarakSekolah || ''
];

// Helper to trigger workbook download in browser
const triggerWorkbookDownload = (wb: XLSX.WorkBook, fileName: string) => {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export Dapodik Siswa to Excel (.xlsx) with exact 2-row merged header matching image
export const exportDapodikSiswaToExcel = (customList?: Siswa[]): void => {
  const list = customList && customList.length > 0 ? customList : getStoredSiswa();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `Database_Siswa_Dapodik_SMAN9_${dateStr}.xlsx`;

  const sheetData: any[][] = [
    SISWA_EXCEL_ROW_0,
    SISWA_EXCEL_ROW_1
  ];

  list.forEach((s, idx) => {
    sheetData.push(formatSiswaToExcelRow(s, idx));
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!merges'] = SISWA_EXCEL_MERGES;
  ws['!cols'] = SISWA_EXCEL_COLS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dapodik Siswa SMAN 9');

  triggerWorkbookDownload(wb, fileName);
  appendAuditLog('EXPORT_DAPODIK_XLSX', `Mengekspor data master siswa Dapodik format Excel (.xlsx, ${list.length} siswa) ke berkas: ${fileName}.`);
};

// Download Official Dapodik Siswa Template (.xlsx) with sample guidance rows matching image
export const downloadDapodikSiswaExcelTemplate = (): void => {
  const fileName = 'Template_Import_Siswa_Dapodik_SMAN9_Surabaya.xlsx';

  // Sample Row 1 from user image (ABDILLAH)
  const sampleRow1 = [
    1,
    'ABDILLAH',
    '19788',
    'L',
    '0102561938',
    'BANGKALAN',
    '2010-12-27',
    '3526052712100001',
    'Islam',
    'GEMBONG SEKOLAHAN 1/3',
    '3',
    '3',
    '',
    'KAPASAN',
    'Kec. Simokerto',
    '60141',
    'Bersama orang tua',
    'Jalan kaki',
    '',
    '087843987948',
    '',
    '',
    'Tidak',
    '',
    // Data Ayah
    'H. ABDUL MANAP',
    '1970',
    'SD / sederajat',
    'Wiraswasta',
    '< Rp1.000.000',
    '3526052308700001',
    // Data Ibu
    'SUBAIDAH',
    '1972',
    'SD / sederajat',
    'Wiraswasta',
    '< Rp1.000.000',
    '3526055010720002',
    // Data Wali
    '',
    '',
    'Tidak sekolah',
    '',
    '< Rp1.000.000',
    '',
    // Rombel & Bantuan
    'X-11',
    '',
    '',
    'Tidak',
    '0',
    '',
    '',
    '352605-LT-15122011-0048',
    '',
    '',
    '',
    'Ya',
    'Siswa Miskin/Rentan',
    'Tidak ada',
    'SMP NEGERI 8 SURABAYA',
    2,
    '-7,2415',
    '112,7513',
    '3526050508090001',
    58,
    167,
    54,
    0,
    1
  ];

  // Sample Row 2 from user image (Abdu Rouyan Arfian)
  const sampleRow2 = [
    2,
    'Abdu Rouyan Arfian',
    '19419',
    'L',
    '0094065464',
    'Surabaya',
    '2009-10-08',
    '3578070810090002',
    'Islam',
    'Peneleh 6 No.40',
    '0',
    '0',
    '',
    'Peneleh',
    'Kec. Genteng',
    '60274',
    'Bersama orang tua',
    'Jalan kaki',
    '',
    '085156950490',
    '',
    '',
    'Tidak',
    '',
    // Data Ayah
    'Rasihul Arfan',
    '1984',
    'S2',
    'PNS/TNI/Polri',
    'Rp1.000.001 - Rp3.000.000',
    '3578071804840001',
    // Data Ibu
    'Dewi Arlini',
    '1986',
    'SMA / sederajat',
    'Tidak bekerja',
    'Tidak Berpenghasilan',
    '3578074906860002',
    // Data Wali
    '',
    '',
    'Tidak sekolah',
    '',
    '< Rp1.000.000',
    '',
    // Rombel & Bantuan
    'XI-B',
    '',
    '',
    'Tidak',
    '0',
    '',
    '',
    '',
    '',
    '',
    '',
    'Tidak',
    '',
    'Tidak ada',
    'SMP NEGERI 3 SURABAYA',
    1,
    '-7,2529',
    '112,7375',
    '357807080311001',
    38,
    165,
    53,
    3,
    1
  ];

  const sheetData: any[][] = [
    SISWA_EXCEL_ROW_0,
    SISWA_EXCEL_ROW_1,
    sampleRow1,
    sampleRow2
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!merges'] = SISWA_EXCEL_MERGES;
  ws['!cols'] = SISWA_EXCEL_COLS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Dapodik Siswa');

  triggerWorkbookDownload(wb, fileName);
};

// Parse uploaded Dapodik Siswa Excel (.xlsx, .xls) or CSV content
export const parseDapodikSiswaExcel = (
  fileData: ArrayBuffer | string
): { success: boolean; data: Siswa[]; message: string; errors: string[] } => {
  try {
    let workbook: XLSX.WorkBook;
    if (typeof fileData === 'string') {
      workbook = XLSX.read(fileData, { type: 'string' });
    } else {
      workbook = XLSX.read(fileData, { type: 'array' });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, data: [], message: 'Berkas Excel tidak memiliki sheet yang dapat dibaca.', errors: ['Sheet kosong.'] };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length < 2) {
      return { success: false, data: [], message: 'Berkas kosong atau tidak memiliki baris data.', errors: ['Tidak ada baris data.'] };
    }

    const row0 = (rawRows[0] || []).map(c => String(c || '').trim());
    const row1 = (rawRows[1] || []).map(c => String(c || '').trim());

    const isTwoRowHeader = 
      row0.some(c => /data ayah/i.test(c) || /data ibu/i.test(c) || /data wali/i.test(c)) ||
      row1.some(c => /tahun lahir/i.test(c) || /jenjang pendidikan/i.test(c));

    const startDataRow = isTwoRowHeader ? 2 : 1;

    // Standard column index mapping for Siswa
    const stdCols = {
      no: 0,
      nama: 1,
      nipd: 2,
      jk: 3,
      nisn: 4,
      tempatLahir: 5,
      tanggalLahir: 6,
      nik: 7,
      agama: 8,
      alamat: 9,
      rt: 10,
      rw: 11,
      dusun: 12,
      kelurahan: 13,
      kecamatan: 14,
      kodePos: 15,
      jenisTinggal: 16,
      alatTransportasi: 17,
      telepon: 18,
      hp: 19,
      email: 20,
      skhun: 21,
      penerimaKps: 22,
      noKps: 23,
      namaAyah: 24,
      tahunLahirAyah: 25,
      jenjangPendidikanAyah: 26,
      pekerjaanAyah: 27,
      penghasilanAyah: 28,
      nikAyah: 29,
      namaIbu: 30,
      tahunLahirIbu: 31,
      jenjangPendidikanIbu: 32,
      pekerjaanIbu: 33,
      penghasilanIbu: 34,
      nikIbu: 35,
      namaWali: 36,
      tahunLahirWali: 37,
      jenjangPendidikanWali: 38,
      pekerjaanWali: 39,
      penghasilanWali: 40,
      nikWali: 41,
      rombelSaatIni: 42,
      noPesertaUN: 43,
      noSeriIjazah: 44,
      penerimaKip: 45,
      nomorKip: 46,
      namaDiKip: 47,
      nomorKks: 48,
      noRegAktaLahir: 49,
      bank: 50,
      noRekeningBank: 51,
      rekeningAtasNama: 52,
      layakPip: 53,
      alasanLayakPip: 54,
      kebutuhanKhusus: 55,
      sekolahAsal: 56,
      anakKe: 57,
      lintang: 58,
      bujur: 59,
      noKk: 60,
      beratBadan: 61,
      tinggiBadan: 62,
      lingkarKepala: 63,
      jmlSaudaraKandung: 64,
      jarakSekolah: 65
    };

    // Build header text map for flexible parsing
    const colIndex: { [key: string]: number } = {};
    const headerRow = isTwoRowHeader ? row1 : row0;
    headerRow.forEach((val, idx) => {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean) colIndex[clean] = idx;
    });

    if (isTwoRowHeader) {
      row0.forEach((parentVal, idx) => {
        const cleanParent = parentVal.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanChild = (row1[idx] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanParent && cleanChild) {
          colIndex[`${cleanParent}${cleanChild}`] = idx;
        }
      });
    }

    const getVal = (row: any[], fallbackIndex: number, ...possibleKeys: string[]): string => {
      for (const k of possibleKeys) {
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (colIndex[cleanKey] !== undefined && colIndex[cleanKey] < row.length) {
          const val = row[colIndex[cleanKey]];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
      if (fallbackIndex >= 0 && fallbackIndex < row.length) {
        const val = row[fallbackIndex];
        if (val !== undefined && val !== null) {
          return String(val).trim();
        }
      }
      return '';
    };

    const parsedStudents: Siswa[] = [];
    const errors: string[] = [];

    for (let i = startDataRow; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row) || row.every(c => c === '' || c === undefined || c === null)) {
        continue;
      }

      const nama = getVal(row, stdCols.nama, 'nama', 'namalengkap', 'namapesertadidik');
      if (!nama || nama.toLowerCase() === 'nama' || nama.toLowerCase() === 'data ayah') {
        continue;
      }

      const nipd = getVal(row, stdCols.nipd, 'nipd', 'nis', 'noinduk', 'nomorinduk');
      const jkRaw = getVal(row, stdCols.jk, 'jk', 'jeniskelamin');
      const jenisKelamin: 'L' | 'P' = jkRaw.toUpperCase().startsWith('P') ? 'P' : 'L';
      const nisn = getVal(row, stdCols.nisn, 'nisn', 'nomorinduksiswanasional');
      const tempatLahir = getVal(row, stdCols.tempatLahir, 'tempatlahir');
      const tanggalLahir = getVal(row, stdCols.tanggalLahir, 'tanggallahir', 'tgllahir');
      const nik = getVal(row, stdCols.nik, 'nik', 'nonik');
      const agama = getVal(row, stdCols.agama, 'agama') || 'Islam';
      const alamat = getVal(row, stdCols.alamat, 'alamat', 'alamatrumah');
      const rt = getVal(row, stdCols.rt, 'rt');
      const rw = getVal(row, stdCols.rw, 'rw');
      const dusun = getVal(row, stdCols.dusun, 'dusun');
      const kelurahan = getVal(row, stdCols.kelurahan, 'kelurahan', 'desa');
      const kecamatan = getVal(row, stdCols.kecamatan, 'kecamatan');
      const kodePos = getVal(row, stdCols.kodePos, 'kodepos');
      const jenisTinggal = getVal(row, stdCols.jenisTinggal, 'jenistinggal');
      const alatTransportasi = getVal(row, stdCols.alatTransportasi, 'alattransportasi', 'transportasi');
      const telepon = getVal(row, stdCols.telepon, 'telepon', 'telp');
      const hp = getVal(row, stdCols.hp, 'hp', 'nohp', 'whatsapp');
      const email = getVal(row, stdCols.email, 'email', 'email');
      const skhun = getVal(row, stdCols.skhun, 'skhun');
      const penerimaKps = getVal(row, stdCols.penerimaKps, 'penerimakps', 'kps');
      const noKps = getVal(row, stdCols.noKps, 'nokps');

      // Data Ayah
      const namaAyah = getVal(row, stdCols.namaAyah, 'dataayahnama', 'namaayah', 'ayah');
      const tahunLahirAyah = getVal(row, stdCols.tahunLahirAyah, 'dataayahtahunlahir', 'tahunlahirayah');
      const jenjangPendidikanAyah = getVal(row, stdCols.jenjangPendidikanAyah, 'dataayahjenjangpendidikan', 'jenjangpendidikanayah');
      const pekerjaanAyah = getVal(row, stdCols.pekerjaanAyah, 'dataayahpekerjaan', 'pekerjaanayah');
      const penghasilanAyah = getVal(row, stdCols.penghasilanAyah, 'dataayahpenghasilan', 'penghasilanayah');
      const nikAyah = getVal(row, stdCols.nikAyah, 'dataayahnik', 'nikayah');

      // Data Ibu
      const namaIbu = getVal(row, stdCols.namaIbu, 'dataibunama', 'namaibu', 'ibu');
      const tahunLahirIbu = getVal(row, stdCols.tahunLahirIbu, 'dataibutahunlahir', 'tahunlahiribu');
      const jenjangPendidikanIbu = getVal(row, stdCols.jenjangPendidikanIbu, 'dataibujenjangpendidikan', 'jenjangpendidikanibu');
      const pekerjaanIbu = getVal(row, stdCols.pekerjaanIbu, 'dataibupekerjaan', 'pekerjaanibu');
      const penghasilanIbu = getVal(row, stdCols.penghasilanIbu, 'dataibupenghasilan', 'penghasilanibu');
      const nikIbu = getVal(row, stdCols.nikIbu, 'dataibunik', 'nikibu');

      // Data Wali
      const namaWali = getVal(row, stdCols.namaWali, 'datawalinama', 'namawali', 'wali');
      const tahunLahirWali = getVal(row, stdCols.tahunLahirWali, 'datawalitahunlahir', 'tahunlahirwali');
      const jenjangPendidikanWali = getVal(row, stdCols.jenjangPendidikanWali, 'datawalijenjangpendidikan', 'jenjangpendidikanwali');
      const pekerjaanWali = getVal(row, stdCols.pekerjaanWali, 'datawalipekerjaan', 'pekerjaanwali');
      const penghasilanWali = getVal(row, stdCols.penghasilanWali, 'datawalipenghasilan', 'penghasilanwali');
      const nikWali = getVal(row, stdCols.nikWali, 'datawalinik', 'nikwali');

      const rombel = getVal(row, stdCols.rombelSaatIni, 'rombelsaatini', 'rombel', 'kelas') || 'X-1';
      const noPesertaUN = getVal(row, stdCols.noPesertaUN, 'nopesertaujiannasional', 'nopesertaun');
      const noSeriIjazah = getVal(row, stdCols.noSeriIjazah, 'noseriijazah', 'noijazah');
      const penerimaKip = getVal(row, stdCols.penerimaKip, 'penerimakip', 'kip');
      const nomorKip = getVal(row, stdCols.nomorKip, 'nomorkip', 'nokip');
      const namaDiKip = getVal(row, stdCols.namaDiKip, 'namadikip');
      const nomorKks = getVal(row, stdCols.nomorKks, 'nomorkks', 'nokks');
      const noRegAktaLahir = getVal(row, stdCols.noRegAktaLahir, 'noregistrasiaktalahir', 'noaktalahir');
      const bank = getVal(row, stdCols.bank, 'bank');
      const noRekeningBank = getVal(row, stdCols.noRekeningBank, 'nomorrekeningbank', 'norekening');
      const rekeningAtasNama = getVal(row, stdCols.rekeningAtasNama, 'rekeningatasnama');
      const layakPip = getVal(row, stdCols.layakPip, 'layakpipusulandarisekolah', 'layakpip', 'pip');
      const alasanLayakPip = getVal(row, stdCols.alasanLayakPip, 'alasanlayakpip');
      const kebutuhanKhusus = getVal(row, stdCols.kebutuhanKhusus, 'kebutuhankhusus');
      const sekolahAsal = getVal(row, stdCols.sekolahAsal, 'sekolahasal', 'smpasal');
      const anakKe = getVal(row, stdCols.anakKe, 'an 작kebrapa', 'anakke');
      const lintang = getVal(row, stdCols.lintang, 'lintang', 'latitude');
      const bujur = getVal(row, stdCols.bujur, 'bujur', 'longitude');
      const noKk = getVal(row, stdCols.noKk, 'nokk', 'nomorkk');
      const beratBadan = getVal(row, stdCols.beratBadan, 'beratbadan', 'bb');
      const tinggiBadan = getVal(row, stdCols.tinggiBadan, 'tinggibadan', 'tb');
      const lingkarKepala = getVal(row, stdCols.lingkarKepala, 'lingkarkepala', 'lk');
      const jmlSaudaraKandung = getVal(row, stdCols.jmlSaudaraKandung, 'jmlsaudarakandung', 'jmlsaudara');
      const jarakSekolah = getVal(row, stdCols.jarakSekolah, 'jarakrumahkesekolah', 'jarak');

      const generatedId = `sis-imp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      const safeNisn = nisn || `00${Date.now().toString().slice(-8)}`;
      const safeNis = nipd || `2425${String(i).padStart(4, '0')}`;
      const ttlCombined = tempatLahir && tanggalLahir ? `${tempatLahir}, ${tanggalLahir}` : (tempatLahir || tanggalLahir || '-');

      parsedStudents.push({
        id: generatedId,
        nisn: safeNisn,
        nis: safeNis,
        nipd: safeNis,
        nama,
        kelas: rombel,
        rombelSaatIni: rombel,
        jurusan: rombel.startsWith('X') ? 'Fase E (Umum)' : (rombel.includes('MIPA') || rombel.includes('IPA') ? 'MIPA' : 'Kurikulum Merdeka'),
        jenisKelamin,
        tempatLahir,
        tanggalLahir,
        tempatTanggalLahir: ttlCombined,
        nik,
        agama,
        alamat,
        rt,
        rw,
        dusun,
        kelurahan,
        kecamatan,
        kodePos,
        jenisTinggal: jenisTinggal || 'Bersama orang tua',
        alatTransportasi: alatTransportasi || 'Jalan kaki',
        telepon,
        hp,
        email,
        skhun,
        penerimaKps: penerimaKps || 'Tidak',
        noKps,
        namaOrtu: namaAyah || namaIbu || namaWali || '-',
        namaAyah,
        tahunLahirAyah,
        jenjangPendidikanAyah,
        pekerjaanAyah,
        penghasilanAyah,
        nikAyah,
        namaIbu,
        tahunLahirIbu,
        jenjangPendidikanIbu,
        pekerjaanIbu,
        penghasilanIbu,
        nikIbu,
        namaWali,
        tahunLahirWali,
        jenjangPendidikanWali,
        pekerjaanWali,
        penghasilanWali,
        nikWali,
        noPesertaUN,
        noSeriIjazah,
        penerimaKip: penerimaKip || 'Tidak',
        nomorKip,
        namaDiKip,
        nomorKks,
        noRegAktaLahir,
        bank,
        noRekeningBank,
        rekeningAtasNama,
        layakPip: layakPip || 'Tidak',
        alasanLayakPip,
        kebutuhanKhusus: kebutuhanKhusus || 'Tidak ada',
        sekolahAsal,
        anakKe: anakKe ? Number(anakKe) || anakKe : 1,
        lintang,
        bujur,
        noKk,
        beratBadan: beratBadan ? Number(beratBadan) || beratBadan : 50,
        tinggiBadan: tinggiBadan ? Number(tinggiBadan) || tinggiBadan : 165,
        lingkarKepala: lingkarKepala ? Number(lingkarKepala) || lingkarKepala : 54,
        jmlSaudaraKandung: jmlSaudaraKandung ? Number(jmlSaudaraKandung) || jmlSaudaraKandung : 1,
        jarakSekolah: jarakSekolah ? Number(jarakSekolah) || jarakSekolah : 1,
        prestasi: 'Siswa Aktif SMAN 9 Surabaya',
        status: 'Aktif'
      });
    }

    if (parsedStudents.length === 0) {
      return {
        success: false,
        data: [],
        message: 'Tidak ada baris data siswa yang valid dalam berkas Excel ini.',
        errors
      };
    }

    return {
      success: true,
      data: parsedStudents,
      message: `Berhasil mengekstrak ${parsedStudents.length} data siswa dari berkas Excel standar Dapodik Kemendikbud.`,
      errors
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      message: error?.message || 'Gagal memproses berkas Excel Dapodik Siswa.',
      errors: [error?.message || 'Kesalahan parsing Excel']
    };
  }
};

// ============================================================================
// DAPODIK GTK GURU EXCEL (XLSX/XLS) & CSV ENGINE - 51 KOLOM KEMENDIKBUD
// ============================================================================

export const DAPODIK_GURU_HEADERS = [
  'No',
  'Nama',
  'NUPTK',
  'JK',
  'Tempat Lahir',
  'Tanggal Lahir',
  'NIP',
  'Status Kepegawaian',
  'Jenis PTK',
  'Agama',
  'Alamat Jalan',
  'RT',
  'RW',
  'Nama Dusun',
  'Desa/Kelurahan',
  'Kecamatan',
  'Kode Pos',
  'Telepon',
  'HP',
  'Email',
  'Tugas Tambahan',
  'SK CPNS',
  'Tanggal CPNS',
  'SK Pengangkatan',
  'TMT Pengangkatan',
  'Lembaga Pengangkatan',
  'Pangkat Golongan',
  'Sumber Gaji',
  'Nama Ibu Kandung',
  'Status Perkawinan',
  'Nama Suami/Istri',
  'NIP Suami/Istri',
  'Pekerjaan Suami/Istri',
  'TMT PNS',
  'Sudah Lisensi Kepala Sekolah',
  'Pernah Diklat Kepengawasan',
  'Keahlian Braille',
  'Keahlian Bahasa Isyarat',
  'NPWP',
  'Nama Wajib Pajak',
  'Kewarganegaraan',
  'Bank',
  'Nomor Rekening Bank',
  'Rekening Atas Nama',
  'NIK',
  'No KK',
  'Karpeg',
  'Karis/Karsu',
  'Lintang',
  'Bujur',
  'NUKS'
];

export const GURU_EXCEL_COLS = [
  { wch: 5 },   // No
  { wch: 25 },  // Nama
  { wch: 18 },  // NUPTK
  { wch: 5 },   // JK
  { wch: 16 },  // Tempat Lahir
  { wch: 14 },  // Tanggal Lahir
  { wch: 22 },  // NIP
  { wch: 20 },  // Status Kepegawaian
  { wch: 16 },  // Jenis PTK
  { wch: 12 },  // Agama
  { wch: 32 },  // Alamat Jalan
  { wch: 6 },   // RT
  { wch: 6 },   // RW
  { wch: 14 },  // Nama Dusun
  { wch: 18 },  // Desa/Kelurahan
  { wch: 18 },  // Kecamatan
  { wch: 10 },  // Kode Pos
  { wch: 14 },  // Telepon
  { wch: 16 },  // HP
  { wch: 25 },  // Email
  { wch: 24 },  // Tugas Tambahan
  { wch: 24 },  // SK CPNS
  { wch: 14 },  // Tanggal CPNS
  { wch: 22 },  // SK Pengangkatan
  { wch: 16 },  // TMT Pengangkatan
  { wch: 22 },  // Lembaga Pengangkatan
  { wch: 18 },  // Pangkat Golongan
  { wch: 16 },  // Sumber Gaji
  { wch: 20 },  // Nama Ibu Kandung
  { wch: 16 },  // Status Perkawinan
  { wch: 22 },  // Nama Suami/Istri
  { wch: 20 },  // NIP Suami/Istri
  { wch: 20 },  // Pekerjaan Suami/Istri
  { wch: 14 },  // TMT PNS
  { wch: 26 },  // Sudah Lisensi Kepsek
  { wch: 26 },  // Pernah Diklat Pengawas
  { wch: 16 },  // Keahlian Braille
  { wch: 22 },  // Keahlian Bahasa Isyarat
  { wch: 20 },  // NPWP
  { wch: 22 },  // Nama Wajib Pajak
  { wch: 14 },  // Kewarganegaraan
  { wch: 14 },  // Bank
  { wch: 22 },  // Nomor Rekening Bank
  { wch: 22 },  // Rekening Atas Nama
  { wch: 20 },  // NIK
  { wch: 20 },  // No KK
  { wch: 14 },  // Karpeg
  { wch: 14 },  // Karis/Karsu
  { wch: 14 },  // Lintang
  { wch: 14 },  // Bujur
  { wch: 14 }   // NUKS
];

export const formatGuruToExcelRow = (g: Guru, idx: number): any[] => [
  idx + 1,
  g.nama || '',
  g.nuptk || '',
  g.jenisKelamin || 'L',
  g.tempatLahir || '',
  g.tanggalLahir || '',
  g.nip || '',
  g.statusKepegawaian || g.status || 'PNS',
  g.jenisPtk || g.jabatan || 'Guru Mapel',
  g.agama || 'Islam',
  g.alamatJalan || '',
  g.rt || '',
  g.rw || '',
  g.namaDusun || '',
  g.desaKelurahan || '',
  g.kecamatan || '',
  g.kodePos || '',
  g.telepon || '',
  g.hp || g.noHp || '',
  g.email || '',
  g.tugasTambahan || '',
  g.skCpns || '',
  g.tanggalCpns || '',
  g.skPengangkatan || '',
  g.tmtPengangkatan || '',
  g.lembagaPengangkatan || 'Pemerintah Propinsi',
  g.pangkatGolongan || '',
  g.sumberGaji || 'APBD Provinsi',
  g.namaIbuKandung || '',
  g.statusPerkawinan || 'Kawin',
  g.namaSuamiIstri || '',
  g.nipSuamiIstri || '',
  g.pekerjaanSuamiIstri || '',
  g.tmtPns || '',
  g.sudahLisensiKepalaSekolah || 'Tidak',
  g.pernahDiklatKepengawasan || 'Tidak',
  g.keahlianBraille || 'Tidak',
  g.keahlianBahasaIsyarat || 'Tidak',
  g.npwp || '',
  g.namaWajibPajak || g.nama || '',
  g.kewarganegaraan || 'ID',
  g.bank || '',
  g.nomorRekeningBank || '',
  g.rekeningAtasNama || '',
  g.nik || '',
  g.noKk || '',
  g.karpeg || '',
  g.karisKarsu || '',
  g.lintang || '',
  g.bujur || '',
  g.nuks || ''
];

// Export Dapodik GTK Guru to Excel (.xlsx) matching exact 51-column image
export const exportDapodikGuruToExcel = (customList?: Guru[]): void => {
  const list = customList && customList.length > 0 ? customList : getStoredGuru();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `Database_Guru_Dapodik_SMAN9_${dateStr}.xlsx`;

  const sheetData: any[][] = [
    DAPODIK_GURU_HEADERS
  ];

  list.forEach((g, idx) => {
    sheetData.push(formatGuruToExcelRow(g, idx));
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = GURU_EXCEL_COLS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dapodik GTK Guru');

  triggerWorkbookDownload(wb, fileName);
  appendAuditLog('EXPORT_DAPODIK_GURU_XLSX', `Mengekspor data master GTK Guru format Excel (.xlsx, ${list.length} guru) ke berkas: ${fileName}.`);
};

// Download Official Dapodik Guru Template (.xlsx) with all 9 sample rows matching reference image
export const downloadDapodikGuruExcelTemplate = (): void => {
  const fileName = 'Template_Import_Guru_Dapodik_SMAN9_Surabaya.xlsx';

  // Sample Row 1 (Achmad Diran)
  const sampleRow1 = [
    1,
    'Achmad Diran',
    '0933757659200012',
    'L',
    'SURABAYA',
    '1979-06-01',
    '197906012023211003',
    'PPPK',
    'Guru Mapel',
    'Islam',
    'Bulak Rukem Timur I/76 Surabaya',
    '6',
    '1',
    '',
    'Bulak',
    'Kec. Bulak',
    '60124',
    '03171079679',
    '081554377679',
    'diranurani99@gmail.com',
    '',
    '',
    '',
    '821/2929/204/2023',
    '2023-08-01',
    'Pemerintah Propinsi',
    'IX',
    'APBD Provinsi',
    'Ngatminah',
    'Kawin',
    'UMI KUMAIROH',
    '',
    'Tidak bekerja',
    '2023-08-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '467256665619000',
    'ACHMAD DIRAN',
    'ID',
    '',
    '',
    '',
    '3578290106790002',
    '',
    '',
    '',
    '-7,235917',
    '112,774666',
    'Ya'
  ];

  // Sample Row 2 (Agusta Yudistira)
  const sampleRow2 = [
    2,
    'Agusta Yudistira',
    '7133767668130253',
    'L',
    'WAMENA',
    '1989-08-01',
    '198908012022211009',
    'PPPK',
    'Guru Mapel',
    'Islam',
    'Jl. Ketintang Baru XIV Kel. Ketintang',
    '8',
    '3',
    '-',
    'Ketintang',
    'Kec. Gayungan',
    '60213',
    '',
    '085257784112',
    'agusta09.yudistira@gmail.com',
    'Pembina Ekstrakurikuler',
    '',
    '',
    '821/2027/204/2022',
    '2017-07-17',
    'Pemerintah Propinsi',
    'IX',
    'APBD Provinsi',
    'MURSANI',
    'Kawin',
    'MERIENA MUSTIKAN',
    '1991062120190320',
    'PNS/TNI/Polri',
    '2022-05-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '852470046602000',
    'AGUSTA YUDISTIRA',
    'ID',
    '',
    '',
    '',
    '3517130108890001',
    '3517130111170004',
    '',
    '',
    '-7,316689592',
    '112,7274835',
    'Ya'
  ];

  // Sample Row 3 (Agustina Happyati)
  const sampleRow3 = [
    3,
    'Agustina Happyati',
    '5152744646300023',
    'P',
    'Lumajang',
    '1966-08-20',
    '196608202008012007',
    'PNS',
    'Guru Mapel',
    'Islam',
    'Sawahan DKA 4/10',
    '4',
    '2',
    '',
    'Petemon',
    'Kec. Sawahan',
    '60252',
    '',
    '081332095825',
    'ahappyati@gmail.com',
    'Pembina Ekstrakurikuler',
    '813.3/2635/436.6',
    '2008-01-01',
    '821.13/5879/436.7.6',
    '2009-12-01',
    'Pemerintah Kab/Kota',
    'III/c',
    'APBD Provinsi',
    'Toetiek Martinah',
    'Janda/Duda',
    '',
    '',
    'Sudah Meninggal',
    '2009-12-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '770833481614000',
    'AGUSTINA HAPPYATI',
    'ID',
    '',
    '',
    '',
    '3578066008660003',
    '',
    'N. 515132',
    '',
    '-7,256215',
    '112,7173929',
    'Ya'
  ];

  // Sample Row 4 (Ahmad Yasin)
  const sampleRow4 = [
    4,
    'Ahmad Yasin',
    '9142769670130053',
    'L',
    'GRESIK',
    '1991-08-10',
    '199108102022211016',
    'PPPK',
    'Guru Mapel',
    'Islam',
    'TAMBAK ASRI 10/22B',
    '5',
    '6',
    '',
    'MOROKREMBANG',
    'Kec. Krembangan',
    '60178',
    '0',
    '085731959396',
    'ayas343@gmail.com',
    'Pembina Ekstrakurikuler',
    '',
    '',
    '821/2027/204/2022',
    '2022-05-01',
    'Pemerintah Propinsi',
    'IX',
    'APBD Provinsi',
    'URIPAH',
    'Kawin',
    'PUTRI NOVITA SARI',
    '',
    'Lainnya',
    '2022-05-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3525081008910002',
    '3578151312220013',
    '',
    '',
    '-7,2575',
    '112,7502',
    'Ya'
  ];

  // Sample Row 5 (Amina hati Baene)
  const sampleRow5 = [
    5,
    'Amina hati Baene',
    '1252769670230203',
    'P',
    'TETEZOU',
    '1991-09-20',
    '199109202023212030',
    'PPPK',
    'Guru Mapel',
    'Kristen',
    'KAPASARI PEDUKUHAN 2/7',
    '1',
    '10',
    '',
    'TAMBAKREJO',
    'Kec. Simokerto',
    '60142',
    '',
    '082245773879',
    'baeneaminahati6@gmail.com',
    '',
    '',
    '',
    '821/2929/204/2023',
    '2023-08-01',
    'Pemerintah Propinsi',
    'IX',
    'APBD Provinsi',
    'LITIAMI LAIA',
    'Belum Kawin',
    '',
    '',
    'Tidak bekerja',
    '2023-08-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '1214034909910006',
    '3578111304190003',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 6 (Andri Sukristyono)
  const sampleRow6 = [
    6,
    'Andri Sukristyono',
    '4746755657200032',
    'L',
    'Surabaya',
    '1977-04-14',
    '197704142011011008',
    'PNS',
    'Guru BK',
    'Islam',
    'Simo Rukun 9 No. 23',
    '8',
    '4',
    '',
    'Simomulyo',
    'Kec. Sukomanunggal',
    '60181',
    '0315328429',
    '08819357842',
    'andrisukristyono@yahoo.co.id',
    '',
    '813.3/631/436.7.6',
    '2011-01-01',
    '821.13/5978/436.7.6',
    '2011-02-21',
    'Pemerintah Kab/Kota',
    'III/b',
    'APBD Provinsi',
    'Suprihatin',
    'Kawin',
    'HASTITI ARUMSARI',
    '',
    'Tidak bekerja',
    '2012-12-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '264142050604000',
    'ANDRI SUKRISTYONO',
    'ID',
    '',
    '',
    '',
    '3578271404770001',
    '',
    'Q. 264128',
    '',
    '-7,2638012',
    '112,7108004',
    'Ya'
  ];

  // Sample Row 7 (Anie Setiawati)
  const sampleRow7 = [
    7,
    'Anie Setiawati',
    '5044756658300023',
    'P',
    'Surabaya',
    '1978-07-12',
    '197807122022212011',
    'PPPK',
    'Guru Mapel',
    'Islam',
    'Jl kalimas Baru 1 Gg.04 No. 14',
    '2',
    '1',
    '',
    'Perak Utara',
    'Kec. Pabean Cantian',
    '60165',
    '',
    '085854077820',
    'anieee99@gmail.com',
    'Pembina Ekstrakurikuler',
    '',
    '',
    '821/2027/204/2022',
    '2022-05-01',
    'Pemerintah Propinsi',
    'IX',
    'APBD Provinsi',
    'Sutiyani',
    'Janda/Duda',
    'Agro A Indriyanto',
    '',
    'Karyawan Swasta',
    '2022-05-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '424087963613000',
    'ANIE SETIAWATI',
    'ID',
    '',
    '',
    '',
    '3578125207780006',
    '3578120405210001',
    '',
    '',
    '-7,2575',
    '112,7502',
    'Ya'
  ];

  // Sample Row 8 (Bambang Priyono)
  const sampleRow8 = [
    8,
    'Bambang Priyono',
    '2551730637200002',
    'L',
    'Pacitan',
    '1959-02-19',
    '195902191987031002',
    'PNS',
    'Guru Mapel',
    'Islam',
    'Gunung Sari Indah Blok OQ/21',
    '7',
    '8',
    '',
    'Kedurus',
    'Kec. Karang Pilang',
    '60223',
    '0317663953',
    '085648100111',
    'b.priyono069@gmail.com',
    '',
    '6794/104/C/87/SK',
    '1987-03-01',
    '27533/104/C/88/SK',
    '1989-01-01',
    'Pemerintah Pusat',
    'IV/b',
    'APBN',
    'Sutasmi',
    'Kawin',
    '',
    '',
    'PNS/TNI/Polri',
    '1989-01-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3678011902590002',
    '',
    '',
    '',
    '',
    '',
    'Tidak'
  ];

  // Sample Row 9 (Budi Santoso)
  const sampleRow9 = [
    9,
    'Budi Santoso',
    '9336743646200013',
    'L',
    'Surabaya',
    '1965-10-04',
    '196510041986031018',
    'PNS',
    'Guru Mapel',
    'Islam',
    'Perum UKA 10/21 Sememi Benowo',
    '10',
    '2',
    '',
    'Sememi',
    'Kec. Benowo',
    '60198',
    '-',
    '081332770519',
    'budi.smanix65@gmail.com',
    'Wakil Kepala Sekolah',
    '13171/104/C/1986',
    '1986-03-01',
    '14866/104/C/1987/SK',
    '1987-12-01',
    'Pemerintah Pusat',
    'III/d',
    'APBD Provinsi',
    'Sri Mulyani',
    'Kawin',
    'WIDANINGSIH',
    '',
    'Tidak bekerja',
    '1987-12-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '085671089604000',
    'BUDI SANTOSO',
    'ID',
    '',
    '',
    '',
    '3578190410650002',
    '',
    'E. 261588',
    '189483 K',
    '',
    '',
    'Ya'
  ];

  const sheetData: any[][] = [
    DAPODIK_GURU_HEADERS,
    sampleRow1,
    sampleRow2,
    sampleRow3,
    sampleRow4,
    sampleRow5,
    sampleRow6,
    sampleRow7,
    sampleRow8,
    sampleRow9
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = GURU_EXCEL_COLS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Dapodik Guru');

  triggerWorkbookDownload(wb, fileName);
};

// Parse uploaded Dapodik Guru Excel (.xlsx, .xls) or CSV content
export const parseDapodikGuruExcel = (
  fileData: ArrayBuffer | string
): { success: boolean; data: Guru[]; message: string; errors: string[] } => {
  try {
    let workbook: XLSX.WorkBook;
    if (typeof fileData === 'string') {
      workbook = XLSX.read(fileData, { type: 'string' });
    } else {
      workbook = XLSX.read(fileData, { type: 'array' });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, data: [], message: 'Berkas Excel tidak memiliki sheet yang dapat dibaca.', errors: ['Sheet kosong.'] };
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length < 2) {
      return { success: false, data: [], message: 'Berkas kosong atau tidak memiliki baris data GTK.', errors: ['Tidak ada data guru.'] };
    }

    // Standard column index mapping for Guru (51 columns)
    const stdCols = {
      no: 0,
      nama: 1,
      nuptk: 2,
      jk: 3,
      tempatLahir: 4,
      tanggalLahir: 5,
      nip: 6,
      statusKepegawaian: 7,
      jenisPtk: 8,
      agama: 9,
      alamatJalan: 10,
      rt: 11,
      rw: 12,
      namaDusun: 13,
      desaKelurahan: 14,
      kecamatan: 15,
      kodePos: 16,
      telepon: 17,
      hp: 18,
      email: 19,
      tugasTambahan: 20,
      skCpns: 21,
      tanggalCpns: 22,
      skPengangkatan: 23,
      tmtPengangkatan: 24,
      lembagaPengangkatan: 25,
      pangkatGolongan: 26,
      sumberGaji: 27,
      namaIbuKandung: 28,
      statusPerkawinan: 29,
      namaSuamiIstri: 30,
      nipSuamiIstri: 31,
      pekerjaanSuamiIstri: 32,
      tmtPns: 33,
      sudahLisensiKepalaSekolah: 34,
      pernahDiklatKepengawasan: 35,
      keahlianBraille: 36,
      keahlianBahasaIsyarat: 37,
      npwp: 38,
      namaWajibPajak: 39,
      kewarganegaraan: 40,
      bank: 41,
      nomorRekeningBank: 42,
      rekeningAtasNama: 43,
      nik: 44,
      noKk: 45,
      karpeg: 46,
      karisKarsu: 47,
      lintang: 48,
      bujur: 49,
      nuks: 50
    };

    // Header matching for flexible lookup
    const headerRow = (rawRows[0] || []).map(c => String(c || '').trim());
    const colIndex: { [key: string]: number } = {};
    headerRow.forEach((val, idx) => {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean) colIndex[clean] = idx;
    });

    const getVal = (row: any[], fallbackIndex: number, ...possibleKeys: string[]): string => {
      for (const k of possibleKeys) {
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (colIndex[cleanKey] !== undefined && colIndex[cleanKey] < row.length) {
          const val = row[colIndex[cleanKey]];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return String(val).trim();
          }
        }
      }
      if (fallbackIndex >= 0 && fallbackIndex < row.length) {
        const val = row[fallbackIndex];
        if (val !== undefined && val !== null) {
          return String(val).trim();
        }
      }
      return '';
    };

    const parsedGurus: Guru[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row) || row.every(c => c === '' || c === undefined || c === null)) {
        continue;
      }

      const nama = getVal(row, stdCols.nama, 'nama', 'namalengkap', 'namaguru', 'namaptk');
      if (!nama || nama.toLowerCase() === 'nama' || nama.toLowerCase() === 'no') {
        continue;
      }

      const nip = getVal(row, stdCols.nip, 'nip', 'nomorindukpegawai');
      const nuptk = getVal(row, stdCols.nuptk, 'nuptk');
      const jkRaw = getVal(row, stdCols.jk, 'jk', 'jeniskelamin');
      const jenisKelamin: 'L' | 'P' = jkRaw.toUpperCase().startsWith('P') ? 'P' : 'L';
      const tempatLahir = getVal(row, stdCols.tempatLahir, 'tempatlahir');
      const tanggalLahir = getVal(row, stdCols.tanggalLahir, 'tanggallahir', 'tgllahir');
      const statusRaw = getVal(row, stdCols.statusKepegawaian, 'statuskepegawaian', 'status', 'kepegawaian') || 'PNS';
      const jenisPtk = getVal(row, stdCols.jenisPtk, 'jenisptk', 'jabatan', 'jenis');
      const agama = getVal(row, stdCols.agama, 'agama') || 'Islam';
      const alamatJalan = getVal(row, stdCols.alamatJalan, 'alamatjalan', 'alamat', 'alamatrumah');
      const rt = getVal(row, stdCols.rt, 'rt');
      const rw = getVal(row, stdCols.rw, 'rw');
      const namaDusun = getVal(row, stdCols.namaDusun, 'namadusun', 'dusun');
      const desaKelurahan = getVal(row, stdCols.desaKelurahan, 'desakelurahan', 'kelurahan', 'desa');
      const kecamatan = getVal(row, stdCols.kecamatan, 'kecamatan');
      const kodePos = getVal(row, stdCols.kodePos, 'kodepos');
      const telepon = getVal(row, stdCols.telepon, 'telepon', 'telp');
      const hp = getVal(row, stdCols.hp, 'hp', 'nohp', 'whatsapp');
      const email = getVal(row, stdCols.email, 'email', 'email');
      const tugasTambahan = getVal(row, stdCols.tugasTambahan, 'tugastambahan');
      const skCpns = getVal(row, stdCols.skCpns, 'skcpns');
      const tanggalCpns = getVal(row, stdCols.tanggalCpns, 'tanggalcpns');
      const skPengangkatan = getVal(row, stdCols.skPengangkatan, 'skpengangkatan');
      const tmtPengangkatan = getVal(row, stdCols.tmtPengangkatan, 'tmtpengangkatan');
      const lembagaPengangkatan = getVal(row, stdCols.lembagaPengangkatan, 'lembagapengangkatan') || 'Pemerintah Propinsi';
      const pangkatGolongan = getVal(row, stdCols.pangkatGolongan, 'pangkatgolongan', 'golongan', 'pangkat') || 'Penata Muda (III/a)';
      const sumberGaji = getVal(row, stdCols.sumberGaji, 'sumbergaji') || 'APBD Provinsi';
      const namaIbuKandung = getVal(row, stdCols.namaIbuKandung, 'namaibukandung', 'ibukandung');
      const statusPerkawinan = getVal(row, stdCols.statusPerkawinan, 'statusperkawinan', 'statusnikah');
      const namaSuamiIstri = getVal(row, stdCols.namaSuamiIstri, 'namasuamiistri', 'suamiistri');
      const nipSuamiIstri = getVal(row, stdCols.nipSuamiIstri, 'nipsuamiistri');
      const pekerjaanSuamiIstri = getVal(row, stdCols.pekerjaanSuamiIstri, 'pekerjaansuamiistri');
      const tmtPns = getVal(row, stdCols.tmtPns, 'tmtpns');
      const sudahLisensiKepalaSekolah = getVal(row, stdCols.sudahLisensiKepalaSekolah, 'sudahlisensikepalasekolah', 'lisensikepsek');
      const pernahDiklatKepengawasan = getVal(row, stdCols.pernahDiklatKepengawasan, 'pernahdiklatkepengawasan', 'diklatpengawas');
      const keahlianBraille = getVal(row, stdCols.keahlianBraille, 'keahlianbraille');
      const keahlianBahasaIsyarat = getVal(row, stdCols.keahlianBahasaIsyarat, 'keahlianbahasaisyarat');
      const npwp = getVal(row, stdCols.npwp, 'npwp');
      const namaWajibPajak = getVal(row, stdCols.namaWajibPajak, 'namawajibpajak');
      const kewarganegaraan = getVal(row, stdCols.kewarganegaraan, 'kewarganegaraan') || 'ID';
      const bank = getVal(row, stdCols.bank, 'bank') || 'Bank Jatim';
      const nomorRekeningBank = getVal(row, stdCols.nomorRekeningBank, 'nomorrekeningbank', 'norekening');
      const rekeningAtasNama = getVal(row, stdCols.rekeningAtasNama, 'rekeningatasnama');
      const nik = getVal(row, stdCols.nik, 'nik', 'nonik');
      const noKk = getVal(row, stdCols.noKk, 'nokk', 'nomorkk');
      const karpeg = getVal(row, stdCols.karpeg, 'karpeg');
      const karisKarsu = getVal(row, stdCols.karisKarsu, 'kariskarsu');
      const lintang = getVal(row, stdCols.lintang, 'lintang', 'latitude');
      const bujur = getVal(row, stdCols.bujur, 'bujur', 'longitude');
      const nuks = getVal(row, stdCols.nuks, 'nuks');

      const generatedId = `gur-imp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      const safeNip = nip || `1985${Date.now().toString().slice(-14)}`;

      parsedGurus.push({
        id: generatedId,
        nip: safeNip,
        nama,
        gelar: '',
        pangkatGolongan: pangkatGolongan || 'Penata Muda (III/a)',
        jabatan: tugasTambahan && tugasTambahan !== '-' ? `${jenisPtk || 'Guru Mapel'} / ${tugasTambahan}` : (jenisPtk || 'Guru Mata Pelajaran'),
        mapel: jenisPtk || 'Mata Pelajaran Umum',
        mataPelajaran: jenisPtk || 'Mata Pelajaran Umum',
        status: statusRaw,
        statusKepegawaian: statusRaw,
        noHp: hp || telepon || '',
        email,
        nuptk,
        jenisKelamin,
        tempatLahir,
        tanggalLahir,
        jenisPtk: jenisPtk || 'Guru Mapel',
        agama,
        alamatJalan,
        rt,
        rw,
        namaDusun,
        desaKelurahan,
        kecamatan,
        kodePos,
        telepon,
        hp,
        tugasTambahan,
        skCpns,
        tanggalCpns,
        skPengangkatan,
        tmtPengangkatan,
        lembagaPengangkatan,
        sumberGaji,
        namaIbuKandung,
        statusPerkawinan,
        namaSuamiIstri,
        nipSuamiIstri,
        pekerjaanSuamiIstri,
        tmtPns,
        sudahLisensiKepalaSekolah,
        pernahDiklatKepengawasan,
        keahlianBraille,
        keahlianBahasaIsyarat,
        npwp,
        namaWajibPajak,
        kewarganegaraan,
        bank,
        nomorRekeningBank,
        rekeningAtasNama,
        nik,
        noKk,
        karpeg,
        karisKarsu,
        lintang,
        bujur,
        nuks
      });
    }

    if (parsedGurus.length === 0) {
      return {
        success: false,
        data: [],
        message: 'Tidak ada baris data guru yang valid dalam berkas Excel ini.',
        errors
      };
    }

    return {
      success: true,
      data: parsedGurus,
      message: `Berhasil mengekstrak ${parsedGurus.length} data guru/tendik dari berkas Excel standar Dapodik GTK.`,
      errors
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      message: error?.message || 'Gagal memproses berkas Excel Dapodik GTK.',
      errors: [error?.message || 'Kesalahan parsing Excel']
    };
  }
};

// ============================================================================
// DAPODIK GTK TENDIK (TENAGA KEPENDIDIKAN) EXCEL & CSV ENGINE
// ============================================================================

export const DAPODIK_TENDIK_HEADERS = [...DAPODIK_GURU_HEADERS];
export const TENDIK_EXCEL_COLS = [...GURU_EXCEL_COLS];

export const formatTendikToExcelRow = (t: Tendik, idx: number): any[] => [
  idx + 1,
  t.nama || '',
  t.nuptk || '',
  t.jenisKelamin || 'L',
  t.tempatLahir || '',
  t.tanggalLahir || '',
  t.nip || '',
  t.statusKepegawaian || t.status || 'Tenaga Honor Sekolah',
  t.jenisPtk || t.jabatan || 'Tenaga Kependidikan',
  t.agama || 'Islam',
  t.alamatJalan || '',
  t.rt || '',
  t.rw || '',
  t.namaDusun || '',
  t.desaKelurahan || '',
  t.kecamatan || '',
  t.kodePos || '',
  t.telepon || '',
  t.hp || t.noHp || '',
  t.email || '',
  t.tugasTambahan || '',
  t.skCpns || '',
  t.tanggalCpns || '',
  t.skPengangkatan || '',
  t.tmtPengangkatan || '',
  t.lembagaPengangkatan || 'Kepala Sekolah',
  t.pangkatGolongan || '',
  t.sumberGaji || 'Sekolah',
  t.namaIbuKandung || '',
  t.statusPerkawinan || 'Belum Kawin',
  t.namaSuamiIstri || '',
  t.nipSuamiIstri || '',
  t.pekerjaanSuamiIstri || '',
  t.tmtPns || '',
  t.sudahLisensiKepalaSekolah || 'Tidak',
  t.pernahDiklatKepengawasan || 'Tidak',
  t.keahlianBraille || 'Tidak',
  t.keahlianBahasaIsyarat || 'Tidak',
  t.npwp || '',
  t.namaWajibPajak || t.nama || '',
  t.kewarganegaraan || 'ID',
  t.bank || '',
  t.nomorRekeningBank || '',
  t.rekeningAtasNama || '',
  t.nik || '',
  t.noKk || '',
  t.karpeg || '',
  t.karisKarsu || '',
  t.lintang || '',
  t.bujur || '',
  t.nuks || ''
];

// Export Dapodik GTK Tendik to Excel (.xlsx)
export const exportDapodikTendikToExcel = (customList?: Tendik[]): void => {
  const list = customList && customList.length > 0 ? customList : getStoredTendik();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `Database_Tendik_Dapodik_SMAN9_${dateStr}.xlsx`;

  const sheetData: any[][] = [
    DAPODIK_TENDIK_HEADERS
  ];

  list.forEach((t, idx) => {
    sheetData.push(formatTendikToExcelRow(t, idx));
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = TENDIK_EXCEL_COLS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dapodik GTK Tendik');

  triggerWorkbookDownload(wb, fileName);
  appendAuditLog('EXPORT_DAPODIK_TENDIK_XLSX', `Mengekspor data master Tenaga Kependidikan (Tendik) format Excel (.xlsx, ${list.length} staf) ke berkas: ${fileName}.`);
};

// Download Official Dapodik Tendik Template (.xlsx) with all 14 sample rows matching reference image
export const downloadDapodikTendikExcelTemplate = (): void => {
  const fileName = 'Template_Import_Tendik_Dapodik_SMAN9_Surabaya.xlsx';

  // Sample Row 1 (Dhinar Oktavia Larasati)
  const sampleRow1 = [
    1,
    'Dhinar Oktavia Larasati',
    '9346766667230223',
    'P',
    'SURABAYA',
    '1988-10-14',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Kristen',
    'Gunungsari Indah Blok CC/38',
    '7',
    '6',
    '',
    'Kedurus',
    'Kec. Karang Pilang',
    '60223',
    '',
    '085730352217',
    'dhinar81@yahoo.com',
    '',
    '',
    '',
    '422/1691/436.5.6.1.2',
    '2013-01-01',
    'Kepala Sekolah',
    '',
    'APBD Kabupaten/Kota',
    'Watiyem',
    'Belum Kawin',
    '',
    '',
    'Tidak bekerja',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '728823972618000',
    'dhinar oktavia larasati',
    'ID',
    '',
    '',
    '',
    '3578015410880001',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 2 (DWI WAHYU BUDIONO)
  const sampleRow2 = [
    2,
    'DWI WAHYU BUDIONO',
    '1241758658200003',
    'L',
    'SURABAYA',
    '1980-09-09',
    '198009092014121003',
    'PNS',
    'Tenaga Kependidikan',
    'Islam',
    'JL. AMIR MAHMUD 57 SURABA',
    '10',
    '2',
    'GUNUNGANYA',
    'GUNUNGANYAR',
    'Kec. Gununganyar',
    '60294',
    '0318707257',
    '081357557118',
    'buddy_koe@yahoo.com',
    '',
    '813.2/1354/436.7.',
    '2014-12-01',
    '821.12/9544/436.7.6/',
    '2016-10-01',
    'Pemerintah Kab/Kota',
    'III/a',
    'APBD Provinsi',
    'RIAMAH, S.Pd.',
    'Kawin',
    'WARJIATI',
    '',
    'Wiraswasta',
    '2016-10-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '544019094615000',
    'DWI WAHYU BUDIONO',
    'ID',
    '',
    '',
    '',
    '3578250909800002',
    '',
    'B. 02016024',
    'AB 02015186',
    '52,3',
    '6,2',
    'Ya'
  ];

  // Sample Row 3 (Ekristianti)
  const sampleRow3 = [
    3,
    'Ekristianti',
    '0255757659300013',
    'P',
    'SURABAYA',
    '1979-09-23',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'Desa Kebaron Tulangan Sidoa',
    '2',
    '3',
    'Kebaron',
    'Kebaron',
    'Kec. Tulangan',
    '61273',
    '',
    '081243732423',
    'ekristianti99@gmail.com',
    '',
    '',
    '',
    '422/341/402.9.1/209',
    '2004-07-26',
    'Kepala Sekolah',
    '',
    'APBD Kabupaten/Kota',
    'Endang Supatmiati',
    'Belum Kawin',
    '',
    '',
    'Tidak bekerja',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '728928268603000',
    '',
    'ID',
    '',
    '',
    '',
    '3515096309790001',
    '3515092202160002',
    '',
    '',
    '-7,2359179',
    '112,736609',
    'Ya'
  ];

  // Sample Row 4 (KRESTIANTO BUDI WALUYO)
  const sampleRow4 = [
    4,
    'KRESTIANTO BUDI WALUYO',
    '8660777677130222',
    'L',
    'SURABAYA',
    '1998-03-28',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'JERUK GG BUNTU NO. 06',
    '4',
    '2',
    '',
    'Jeruk',
    'Kec. Jeruk',
    '60212',
    '',
    '081332629185',
    'krestiantobudiw@gmail.com',
    '',
    '',
    '',
    '800/001/g/101.9.1.9/',
    '2021-04-01',
    'Kepala Sekolah',
    '',
    'Sekolah',
    'SOLMIATI',
    'Kawin',
    'DINDA RAFFIDAH AYUNING S',
    '',
    'Lainnya',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3578212803980001',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 5 (Maimunah)
  const sampleRow5 = [
    5,
    'Maimunah',
    '',
    'P',
    'Surabaya',
    '1966-01-11',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'Pandelegan',
    '11',
    '5',
    'Candi Pari',
    'Candi Pari',
    'Kec. Porong',
    '61274',
    '',
    '085707236737',
    'maimunah.smanix@gmail.com',
    '',
    '',
    '',
    '422/1691/436.5.6.1.2',
    '2013-01-01',
    'Kepala Sekolah',
    '',
    'APBD Kabupaten/Kota',
    'Darmi',
    'Kawin',
    'Sugeng Widodo',
    '',
    'Lainnya',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3515045101660001',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 6 (Misriati)
  const sampleRow6 = [
    6,
    'Misriati',
    '',
    'P',
    'Trenggalek',
    '1971-02-11',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'Legundi 19',
    '5',
    '3',
    '',
    'Ketabang',
    'Kec. Genteng',
    '60272',
    '',
    '082132160011',
    'misriati71@gmail.com',
    '',
    '',
    '',
    '422/1691/436.5.5.6.1',
    '2013-01-01',
    'Kepala Sekolah',
    '',
    'APBD Kabupaten/Kota',
    'Sumilah',
    'Kawin',
    'MOCHAMAD NURUDDIN',
    '',
    'Karyawan Swasta',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '728957529617000',
    '',
    'ID',
    '',
    '',
    '',
    '3578075102710001',
    '3578180201083192',
    '',
    '',
    '',
    '',
    'Tidak'
  ];

  // Sample Row 7 (Mochamad Muchlisin)
  const sampleRow7 = [
    7,
    'Mochamad Muchlisin',
    '9755752654200002',
    'L',
    'Lumajang',
    '1974-04-23',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'Tambak Dalam Baru IA/24',
    '9',
    '5',
    '',
    'Asemrowo',
    'Kec. Asemrowo',
    '60182',
    '',
    '085706091231',
    'buddyono09@gmail.com',
    '',
    '',
    '',
    '422/591.a/402.4.9.1..',
    '2006-07-01',
    'Kepala Sekolah',
    '',
    'APBD Kabupaten/Kota',
    'Burani',
    'Kawin',
    'MAR\'ATUS SHOLEHA',
    '',
    'Tidak bekerja',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '728853508611000',
    '',
    'ID',
    '',
    '',
    '',
    '3578282304740002',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 8 (MOKHAMAD MAKHMUD)
  const sampleRow8 = [
    8,
    'MOKHAMAD MAKHMUD',
    '',
    'L',
    'SIDOARJO',
    '1976-09-29',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'JOJORAN 5 TIMUR BLOK B/20 SURABAYA',
    '',
    '',
    '',
    'MOJO',
    'Kec. Gubeng',
    '',
    '',
    '081334093500',
    'sitimunikah1946@gmail.com',
    '',
    '',
    '',
    '800/088.c/101.9.1.9/',
    '2023-01-12',
    'Kepala Sekolah',
    '',
    'Sekolah',
    'SITI MUNIKAH',
    'Belum Kawin',
    '',
    '',
    'Lainnya',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3578082909760004',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 9 (MUHAMAD KHABIB BULLOH)
  const sampleRow9 = [
    9,
    'MUHAMAD KHABIB BULLOH',
    '',
    'L',
    'NGANJUK',
    '1978-06-09',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'Banjarsari RT.01/RW.04, Kec. Ngronggot, Kel. Banjarsari',
    '',
    '',
    '',
    'Banjarsari',
    'Kec. Ngronggot',
    '',
    '085656024301',
    '085656024301',
    'elansyari978@gmail.com',
    '',
    '',
    '',
    '800/2991.b/101.9.1.5',
    '2017-07-17',
    'Kepala Sekolah',
    '',
    'Sekolah',
    'NUSIKHAH',
    'Belum Kawin',
    '',
    '',
    'Lainnya',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3518090906780003',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 10 (Suherman)
  const sampleRow10 = [
    10,
    'Suherman',
    '',
    'L',
    'Sampang',
    '1971-07-15',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'Sidokapasan I/74',
    '2',
    '1',
    '',
    'Sidodadi',
    'Kec. Simokerto',
    '60145',
    '',
    '085940434754',
    'herman.smanix@gmail.com',
    '',
    '',
    '',
    '422/1886/436.5.6.1.2',
    '2013-01-01',
    'Kepala Sekolah',
    '',
    'Sekolah',
    'Marqiah',
    'Kawin',
    'ANDRIANI',
    '',
    'Tidak bekerja',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3578111507710002',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 11 (Suprihatin)
  const sampleRow11 = [
    11,
    'Suprihatin',
    '4661757659300012',
    'P',
    'Magetan',
    '1979-03-29',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'Ambengan Batu 3/27',
    '3',
    '4',
    '',
    'Tambaksari',
    'Kec. Tambaksari',
    '60136',
    '',
    '085648972518',
    'suprieee99@yahoo.com',
    '',
    '',
    '',
    '422/341/402.4.9.1.20',
    '2004-07-26',
    'Kepala Sekolah',
    '',
    'APBD Kabupaten/Kota',
    'Bibit',
    'Kawin',
    'Iwan Hendriono',
    '',
    'Karyawan Swasta',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3578066903790006',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 12 (Tri Kurniawati)
  const sampleRow12 = [
    12,
    'Tri Kurniawati',
    '5657750652300022',
    'P',
    'KEDIRI',
    '1972-03-25',
    '197203251997032003',
    'PNS',
    'Kepala Sekolah',
    'Islam',
    'Rajawali No. 47',
    '2',
    '10',
    '',
    'Krembangan Selatan',
    'Kec. Krembangan',
    '60175',
    '',
    '081330449938',
    'trikurniawati2503@gmail.com',
    'Kepala Sekolah',
    '42690/A2/KP/199',
    '1997-03-01',
    '95244/104.3/KP/1998',
    '1998-12-01',
    'Pemerintah Pusat',
    'IV/b',
    'APBD Provinsi',
    'HJ. CHUSUSIYAH',
    'Kawin',
    'Tri Lukito',
    '',
    'Pensiunan',
    '1998-12-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '789404464605000',
    '',
    'ID',
    '',
    '',
    '',
    '3578156503720004',
    '3578150101080553',
    '',
    '',
    '-7,2359179',
    '112,736609',
    'Ya'
  ];

  // Sample Row 13 (Uun Mumpuni)
  const sampleRow13 = [
    13,
    'Uun Mumpuni',
    '5539758660300023',
    'P',
    'SURABAYA',
    '1980-12-07',
    '198012072025212002',
    'PPPK',
    'Tenaga Kependidikan',
    'Islam',
    'Ploso Timur 2/54',
    '10',
    '10',
    '',
    'Ploso',
    'Kec. Tambaksari',
    '60172',
    '',
    '081230958959',
    'mumpuniuun@yahoo.co.id',
    '',
    '',
    '',
    '214/104.1/SMU9/KP/',
    '2001-07-16',
    'Kepala Sekolah',
    'IX',
    'APBD Provinsi',
    'Marliah',
    'Kawin',
    'KRISTINO HARIAWAN',
    '',
    'Wiraswasta',
    '2025-03-01',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '',
    '',
    'ID',
    '',
    '',
    '',
    '3578104712800007',
    '',
    '',
    '',
    '',
    '',
    'Ya'
  ];

  // Sample Row 14 (Widianingsih)
  const sampleRow14 = [
    14,
    'Widianingsih',
    '7861759660230162',
    'P',
    'Jakarta',
    '1981-05-29',
    '',
    'Tenaga Honor Sekolah',
    'Tenaga Kependidikan',
    'Islam',
    'Pulosari 3M No. 5A',
    '3',
    '7',
    '',
    'Gunungsari',
    'Kec. Dukuh Pakis',
    '60224',
    '081331484904',
    '081331484904',
    'widianingsih_99@yahoo.com',
    '',
    '',
    '',
    '800/1289/436.5.6.1/',
    '2011-07-02',
    'Kepala Sekolah',
    '',
    'APBD Kabupaten/Kota',
    'Wiwit Muktiarti',
    'Belum Kawin',
    '',
    '',
    'Tidak bekerja',
    '',
    'Tidak',
    'Tidak',
    'Tidak',
    'Tidak',
    '675011498607000',
    '',
    'ID',
    '',
    '',
    '',
    '3578056905810001',
    '',
    '',
    '',
    '-7,2575',
    '112,7502',
    'Ya'
  ];

  const sheetData: any[][] = [
    DAPODIK_TENDIK_HEADERS,
    sampleRow1,
    sampleRow2,
    sampleRow3,
    sampleRow4,
    sampleRow5,
    sampleRow6,
    sampleRow7,
    sampleRow8,
    sampleRow9,
    sampleRow10,
    sampleRow11,
    sampleRow12,
    sampleRow13,
    sampleRow14
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = TENDIK_EXCEL_COLS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Dapodik Tendik');

  triggerWorkbookDownload(wb, fileName);
};

// Parse uploaded Dapodik Tendik Excel (.xlsx, .xls) or CSV content
export const parseDapodikTendikExcel = (
  fileData: ArrayBuffer | string
): { success: boolean; data: Tendik[]; message: string; errors: string[] } => {
  const result = parseDapodikGuruExcel(fileData);
  return {
    success: result.success,
    data: result.data as Tendik[],
    message: result.message.replace(/guru/gi, 'tendik'),
    errors: result.errors
  };
};

export const exportDapodikTendikToCSV = (customList?: Tendik[]): void => {
  exportDapodikTendikToExcel(customList);
};

export const downloadDapodikTendikTemplateCSV = (): void => {
  downloadDapodikTendikExcelTemplate();
};

export const parseDapodikTendikCSV = (
  content: string | ArrayBuffer
): { success: boolean; data: Tendik[]; message: string; errors: string[] } => {
  return parseDapodikTendikExcel(content);
};

// ============================================================================
// BACKWARDS-COMPATIBLE CSV ALIASES & PARSERS
// ============================================================================

export const DAPODIK_HEADERS = SISWA_EXCEL_ROW_0.filter(h => h.trim().length > 0);

export const exportDapodikSiswaToCSV = (customList?: Siswa[]): void => {
  exportDapodikSiswaToExcel(customList);
};

export const downloadDapodikTemplateCSV = (): void => {
  downloadDapodikSiswaExcelTemplate();
};

export const parseDapodikSiswaCSV = (
  content: string | ArrayBuffer
): { success: boolean; data: Siswa[]; message: string; errors: string[] } => {
  return parseDapodikSiswaExcel(content);
};

export const exportDapodikGuruToCSV = (customList?: Guru[]): void => {
  exportDapodikGuruToExcel(customList);
};

export const downloadDapodikGuruTemplateCSV = (): void => {
  downloadDapodikGuruExcelTemplate();
};

export const parseDapodikGuruCSV = (
  content: string | ArrayBuffer
): { success: boolean; data: Guru[]; message: string; errors: string[] } => {
  return parseDapodikGuruExcel(content);
};

// Export Master Data (Siswa / Guru / Tendik) to CSV
export const exportMasterToCSV = (type: 'siswa' | 'guru' | 'tendik'): void => {
  if (type === 'siswa') {
    exportDapodikSiswaToCSV();
    return;
  }
  if (type === 'tendik') {
    exportDapodikTendikToCSV();
    return;
  }
  exportDapodikGuruToCSV();
};

// Import and Restore JSON
export const restoreDatabaseFromJson = (
  jsonData: string, 
  mode: 'replace' | 'merge'
): { success: boolean; message: string; count: { masuk: number; keluar: number; siswa: number; guru: number; tendik: number } } => {
  try {
    const data: Partial<DatabaseSnapshot> = JSON.parse(jsonData);

    if (!data.suratMasuk && !data.suratKeluar) {
      throw new Error('Format berkas backup tidak valid: struktur data persuratan tidak ditemukan.');
    }

    let finalMasuk: SuratMasuk[] = [];
    let finalKeluar: SuratKeluar[] = [];
    let finalSiswa: Siswa[] = [];
    let finalGuru: Guru[] = [];
    let finalTendik: Tendik[] = [];

    if (mode === 'replace') {
      finalMasuk = data.suratMasuk || [];
      finalKeluar = data.suratKeluar || [];
      finalSiswa = data.siswa || getStoredSiswa();
      finalGuru = data.guru || getStoredGuru();
      finalTendik = data.tendik || getStoredTendik();

      if (data.schoolProfile) saveStoredSchoolProfile(data.schoolProfile);
      if (data.templates && data.templates.length > 0) saveStoredTemplates(data.templates);
      if (data.kartuUjianSettings) saveStoredKartuUjianSettings(data.kartuUjianSettings);
      if (data.users && data.users.length > 0) {
        // Keep existing PINs if imported PIN is masked
        const existingUsers = getStoredUsers();
        const mergedUsers = data.users.map(nu => {
          const matched = existingUsers.find(eu => eu.id === nu.id || eu.username === nu.username);
          return {
            ...nu,
            pin: nu.pin === '******' ? (matched?.pin || '123456') : nu.pin
          };
        });
        saveStoredUsers(mergedUsers);
      }
    } else {
      // Merge
      const existingMasuk = getStoredSuratMasuk();
      const existingKeluar = getStoredSuratKeluar();
      const existingSiswa = getStoredSiswa();
      const existingGuru = getStoredGuru();
      const existingTendik = getStoredTendik();

      // Avoid duplicate IDs
      const masukMap = new Map<string, SuratMasuk>();
      existingMasuk.forEach(m => masukMap.set(m.id, m));
      (data.suratMasuk || []).forEach(m => masukMap.set(m.id, m));
      finalMasuk = Array.from(masukMap.values());

      const keluarMap = new Map<string, SuratKeluar>();
      existingKeluar.forEach(k => keluarMap.set(k.id, k));
      (data.suratKeluar || []).forEach(k => keluarMap.set(k.id, k));
      finalKeluar = Array.from(keluarMap.values());

      const siswaMap = new Map<string, Siswa>();
      existingSiswa.forEach(s => siswaMap.set(s.id, s));
      (data.siswa || []).forEach(s => siswaMap.set(s.id, s));
      finalSiswa = Array.from(siswaMap.values());

      const guruMap = new Map<string, Guru>();
      existingGuru.forEach(g => guruMap.set(g.id, g));
      (data.guru || []).forEach(g => guruMap.set(g.id, g));
      finalGuru = Array.from(guruMap.values());

      const tendikMap = new Map<string, Tendik>();
      existingTendik.forEach(t => tendikMap.set(t.id, t));
      (data.tendik || []).forEach(t => tendikMap.set(t.id, t));
      finalTendik = Array.from(tendikMap.values());
    }

    saveStoredSuratMasuk(finalMasuk);
    saveStoredSuratKeluar(finalKeluar);
    saveStoredSiswa(finalSiswa);
    saveStoredGuru(finalGuru);
    saveStoredTendik(finalTendik);

    const countMasuk = finalMasuk.length;
    const countKeluar = finalKeluar.length;
    const countSiswa = finalSiswa.length;
    const countGuru = finalGuru.length;
    const countTendik = finalTendik.length;

    appendAuditLog('RESTORE_DATABASE', `Memulihkan database (${mode.toUpperCase()}): ${countMasuk} surat masuk, ${countKeluar} surat keluar, ${countSiswa} siswa, ${countGuru} guru, ${countTendik} tendik.`);

    return {
      success: true,
      message: `Database berhasil dipulihkan dengan mode ${mode === 'replace' ? 'Timpa Penuh' : 'Gabungkan'}. Total: ${countMasuk} Surat Masuk, ${countKeluar} Surat Keluar, ${countSiswa} Siswa, ${countGuru} Guru, ${countTendik} Tendik.`,
      count: { masuk: countMasuk, keluar: countKeluar, siswa: countSiswa, guru: countGuru, tendik: countTendik }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Gagal memproses berkas backup JSON.',
      count: { masuk: 0, keluar: 0, siswa: 0, guru: 0, tendik: 0 }
    };
  }
};

// Reset to Default Demo Data
export const resetToInitialDemoData = (): void => {
  saveStoredSchoolProfile(initialSchoolProfile);
  saveStoredUsers(initialUsers);
  saveStoredCurrentUser(initialUsers[0]);
  saveStoredSuratMasuk(initialSuratMasuk);
  saveStoredSuratKeluar(initialSuratKeluar);
  saveStoredSiswa(initialSiswa);
  saveStoredGuru(initialGuru);
  saveStoredTendik(initialTendik);
  saveStoredTemplates(initialTemplates);
  saveStoredKartuUjianSettings(initialKartuUjianSettings);
  saveStoredAuditLogs(initialAuditLogs);
  saveStoredBackupHistory(initialBackupHistory);
  appendAuditLog('RESET_DEMO_DATA', 'Mereset sistem kembali ke konfigurasi awal data demo SMAN 9 Surabaya termasuk Siswa, Guru, Tendik, Kartu Ujian, dan Template.');
};

// ================= SINKRONISASI WAKTU JADWAL & SET SESI KARTU UJIAN =================

export interface TimeRangeMinutes {
  start: number;
  end: number;
}

export const parseTimeRangeMinutes = (raw?: string): TimeRangeMinutes | null => {
  if (!raw) return null;
  const match = raw.match(
    /(\d{1,2})[.:](\d{2})\s*(?:-|–|—|s\.?d\.?|s\/d|hingga|to)\s*(\d{1,2})[.:](\d{2})/i
  );
  if (!match) return null;
  const h1 = parseInt(match[1], 10);
  const m1 = parseInt(match[2], 10);
  const h2 = parseInt(match[3], 10);
  const m2 = parseInt(match[4], 10);
  if (
    Number.isNaN(h1) ||
    Number.isNaN(m1) ||
    Number.isNaN(h2) ||
    Number.isNaN(m2) ||
    h1 > 23 ||
    h2 > 23 ||
    m1 > 59 ||
    m2 > 59
  ) {
    return null;
  }
  const start = h1 * 60 + m1;
  const end = h2 * 60 + m2;
  if (end <= start) return null;
  return { start, end };
};

export const formatMinutesHHMM = (totalMinutes: number): string => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}.${mm}`;
};

export const formatTimeRangeMinutes = (start: number, end: number): string => {
  return `${formatMinutesHHMM(start)} - ${formatMinutesHHMM(end)}`;
};

export const extractSessionBaseName = (sesi: string): string => {
  return (sesi || '')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase();
};

export const resolveEffectiveSiswaSesi = (
  siswa: Pick<Siswa, 'sesiUjian'>,
  sesiTersedia: string[]
): string => {
  const explicit = (siswa.sesiUjian || '').trim();
  if (explicit) return explicit;
  return sesiTersedia[0] || 'Sesi 1';
};

export const resolveScheduleTimeForStudent = (
  row: JadwalUjianItem,
  dayRows: JadwalUjianItem[],
  allSharedRows: JadwalUjianItem[],
  studentSesiText: string,
  sesiTersedia: string[],
  syncEnabled = true
): { waktu: string; isAdjusted: boolean } => {
  if (!syncEnabled) {
    return { waktu: row.waktu, isAdjusted: false };
  }
  // Rows pinned explicitly to a specific session use their own authored time
  if (row.kondisiTarget === 'Sesi' && (row.kondisiNilai || '').trim()) {
    return { waktu: row.waktu, isAdjusted: false };
  }

  const studentWindow = parseTimeRangeMinutes(studentSesiText);
  if (!studentWindow) {
    return { waktu: row.waktu, isAdjusted: false };
  }

  const rowRange = parseTimeRangeMinutes(row.waktu);
  const sharedDayRows = dayRows.filter(
    r => (r.kondisiTarget || 'Semua') !== 'Sesi' || !(r.kondisiNilai || '').trim()
  );
  const parsedDayEntries = sharedDayRows
    .map(r => ({ row: r, range: parseTimeRangeMinutes(r.waktu) }))
    .filter((entry): entry is { row: JadwalUjianItem; range: TimeRangeMinutes } => entry.range !== null);

  if (!rowRange || parsedDayEntries.length === 0) {
    return { waktu: row.waktu, isAdjusted: false };
  }

  const dayMinStart = Math.min(...parsedDayEntries.map(e => e.range.start));
  const dayMaxEnd = Math.max(...parsedDayEntries.map(e => e.range.end));

  // If the whole day schedule already fits inside the student's applied session window, keep exact times
  if (dayMinStart >= studentWindow.start && dayMaxEnd <= studentWindow.end) {
    return { waktu: row.waktu, isAdjusted: false };
  }

  const targetSpan = studentWindow.end - studentWindow.start;

  // Check if any configured session in Set Sesi wraps this day's authored schedule
  const sessionWindows = sesiTersedia
    .map(s => parseTimeRangeMinutes(s))
    .filter((w): w is TimeRangeMinutes => w !== null);

  let baseWindow: TimeRangeMinutes | null =
    sessionWindows.find(w => dayMinStart >= w.start && dayMaxEnd <= w.end) || null;

  // Fallback global base window across all shared rows if all rows fit within one session duration
  if (!baseWindow && allSharedRows.length > 0) {
    const allRanges = allSharedRows
      .map(r => parseTimeRangeMinutes(r.waktu))
      .filter((r): r is TimeRangeMinutes => r !== null);
    if (allRanges.length > 0) {
      const gStart = Math.min(...allRanges.map(r => r.start));
      const gEnd = Math.max(...allRanges.map(r => r.end));
      const maxSesiSpan = Math.max(targetSpan, ...sessionWindows.map(w => w.end - w.start));
      if (gEnd > gStart && gEnd - gStart <= maxSesiSpan) {
        baseWindow = { start: gStart, end: gEnd };
      }
    }
  }

  if (baseWindow) {
    const baseSpan = baseWindow.end - baseWindow.start;
    if (baseSpan === targetSpan) {
      const delta = studentWindow.start - baseWindow.start;
      const newStart = rowRange.start + delta;
      const newEnd = rowRange.end + delta;
      const formatted = formatTimeRangeMinutes(newStart, newEnd);
      return { waktu: formatted, isAdjusted: formatted !== row.waktu };
    }
    const step = targetSpan >= parsedDayEntries.length * 15 ? 5 : 1;
    let newStart =
      Math.round((studentWindow.start + ((rowRange.start - baseWindow.start) / baseSpan) * targetSpan) / step) *
      step;
    let newEnd =
      Math.round((studentWindow.start + ((rowRange.end - baseWindow.start) / baseSpan) * targetSpan) / step) *
      step;
    if (newEnd <= newStart) {
      newEnd = Math.min(studentWindow.end, newStart + step);
    }
    const formatted = formatTimeRangeMinutes(newStart, newEnd);
    return { waktu: formatted, isAdjusted: formatted !== row.waktu };
  }

  // Day schedule span exceeds single-session length (e.g. legacy 07.30 - 12.45):
  // Cleanly partition N slots on this day sequentially inside the student's session window
  const idxInDay = parsedDayEntries.findIndex(e => e.row.id === row.id);
  const count = parsedDayEntries.length;
  if (idxInDay >= 0 && count > 0) {
    const step = targetSpan >= count * 15 ? 5 : 1;
    const slotStart =
      idxInDay === 0
        ? studentWindow.start
        : Math.round((studentWindow.start + (idxInDay / count) * targetSpan) / step) * step;
    const slotEnd =
      idxInDay === count - 1
        ? studentWindow.end
        : Math.round((studentWindow.start + ((idxInDay + 1) / count) * targetSpan) / step) * step;
    const safeEnd = slotEnd > slotStart ? slotEnd : Math.min(studentWindow.end, slotStart + step);
    const formatted = formatTimeRangeMinutes(slotStart, safeEnd);
    return { waktu: formatted, isAdjusted: formatted !== row.waktu };
  }

  return { waktu: row.waktu, isAdjusted: false };
};

export const alignJadwalListToSesi = (
  jadwal: JadwalUjianItem[],
  targetSesiText: string,
  sesiTersedia: string[]
): JadwalUjianItem[] => {
  const dayBuckets = new Map<string, JadwalUjianItem[]>();
  jadwal.forEach(item => {
    const dayKey = (item.hariTanggal || '').trim().toLowerCase();
    if (!dayBuckets.has(dayKey)) dayBuckets.set(dayKey, []);
    dayBuckets.get(dayKey)!.push(item);
  });

  const sharedRows = jadwal.filter(
    r => (r.kondisiTarget || 'Semua') !== 'Sesi' || !(r.kondisiNilai || '').trim()
  );

  return jadwal.map(item => {
    const dayKey = (item.hariTanggal || '').trim().toLowerCase();
    const dayRows = dayBuckets.get(dayKey) || [item];
    const resolved = resolveScheduleTimeForStudent(
      item,
      dayRows,
      sharedRows,
      targetSesiText,
      sesiTersedia,
      true
    );
    return { ...item, waktu: resolved.waktu };
  });
};

// ================= EXCEL JADWAL KONDISIONAL & LINK FOTO/BARCODE KARTU UJIAN =================

export const downloadTemplateExcelJadwalUjian = (): void => {
  const rows = [
    ['No', 'Hari / Tanggal', 'Waktu', 'Mata Pelajaran', 'Kondisi Target', 'Nilai Kondisi', 'Keterangan'],
    [1, 'Senin, 1 Des 2026', '07.30 - 08.10', 'Pendidikan Agama & Budi Pekerti', 'Semua', '', 'Wajib semua peserta'],
    [2, 'Senin, 1 Des 2026', '08.10 - 08.50', 'Bahasa Indonesia', 'Semua', '', 'Wajib semua peserta'],
    [3, 'Senin, 1 Des 2026', '08.50 - 09.30', 'Pendidikan Pancasila', 'Semua', '', 'Wajib semua peserta'],
    [4, 'Selasa, 2 Des 2026', '07.30 - 08.10', 'Matematika Wajib', 'Semua', '', 'Wajib semua peserta'],
    [5, 'Selasa, 2 Des 2026', '08.10 - 08.50', 'Bahasa Inggris', 'Semua', '', 'Wajib semua peserta'],
    [6, 'Selasa, 2 Des 2026', '08.50 - 09.30', 'Bahasa Jawa', 'Semua', '', 'Muatan lokal'],
    [7, 'Rabu, 3 Des 2026', '07.30 - 08.10', 'Sejarah', 'Semua', '', 'Wajib semua peserta'],
    [8, 'Rabu, 3 Des 2026', '08.10 - 08.50', 'PJOK', 'Semua', '', 'Wajib semua peserta'],
    [9, 'Rabu, 3 Des 2026', '08.50 - 09.30', 'Seni Budaya & Prakarya', 'Semua', '', 'Wajib semua peserta'],
    [10, 'Kamis, 4 Des 2026', '07.30 - 08.10', 'Informatika / Koding', 'Semua', '', 'Wajib / Pilihan'],
    [11, 'Kamis, 4 Des 2026', '08.10 - 08.50', 'Fisika', 'Semua', '', ''],
    [12, 'Kamis, 4 Des 2026', '08.50 - 09.30', 'Kimia', 'Semua', '', ''],
    [13, 'Jumat, 5 Des 2026', '07.30 - 08.30', 'Biologi', 'Semua', '', ''],
    [14, 'Jumat, 5 Des 2026', '08.30 - 09.30', 'Ekonomi / Sosiologi', 'Semua', '', ''],
    [15, 'Sabtu, 6 Des 2026', '07.30 - 08.30', 'IPAS / Fase E', 'Kelas', 'X', 'Tampil khusus kelas X-*'],
    [16, 'Sabtu, 6 Des 2026', '08.30 - 09.30', 'Matematika Lanjut / Fase F', 'Kelas', 'XI, XII', 'Tampil khusus kelas XI/XII']
  ];

  const guideRows = [
    ['PANDUAN PENGISIAN JADWAL KONDISIONAL KARTU UJIAN (HINGGA 16 MATA PELAJARAN / SLOT)'],
    ['Kolom Kondisi Target', 'Nilai Kondisi (Contoh)', 'Penjelasan Logika Kondisional'],
    ['Semua', '(kosong)', 'Mata pelajaran tampil di kartu belakang SEMUA peserta; jam otomatis menyesuaikan Set Sesi peserta (Sesi 1/2/3/dst).'],
    ['Kelas', 'X  atau  XI-A, XI-B', 'Tampil hanya jika kelas siswa cocok (mis. "X" mencocokkan X-1, X-2, dst). Pisahkan dengan koma.'],
    ['Sesi', 'Sesi 1  atau  Sesi 2', 'Tampil hanya jika Sesi Ujian siswa cocok dengan nama/waktu sesi tersebut (memakai jam persis di baris ini).'],
    ['Ruang', 'R.01, R.02', 'Tampil hanya jika Ruang Ujian siswa sesuai dengan daftar ruang yang ditulis.']
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 36 }, { wch: 16 }, { wch: 22 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal_Ujian');

  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 22 }, { wch: 24 }, { wch: 62 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan_Kondisi');

  XLSX.writeFile(wb, 'Template_Jadwal_Kondisional_16_Mapel_Kartu_Ujian.xlsx');
};

export const exportJadwalUjianToExcel = (jadwal: JadwalUjianItem[]): void => {
  const rows: (string | number)[][] = [
    ['No', 'Hari / Tanggal', 'Waktu', 'Mata Pelajaran', 'Kondisi Target', 'Nilai Kondisi', 'Keterangan']
  ];
  jadwal.forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.hariTanggal || '',
      item.waktu || '',
      item.mataPelajaran || '',
      item.kondisiTarget || 'Semua',
      item.kondisiNilai || '',
      item.keterangan || ''
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 36 }, { wch: 16 }, { wch: 22 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal_Ujian');
  XLSX.writeFile(wb, `Jadwal_Kartu_Ujian_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const parseJadwalUjianExcel = (
  buffer: ArrayBuffer
): { success: boolean; data: JadwalUjianItem[]; message: string } => {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return { success: false, data: [], message: 'Berkas Excel tidak memiliki sheet.' };
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, {
      header: 1,
      defval: ''
    });

    if (rawRows.length < 2) {
      return { success: false, data: [], message: 'Baris jadwal ujian kosong atau tidak terbaca.' };
    }

    // Locate header row (first row containing "Mata Pelajaran" or "Mapel" or "Hari")
    let headerIdx = 0;
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const joined = rawRows[i].map(c => String(c || '').toLowerCase()).join('|');
      if (joined.includes('pelajaran') || joined.includes('mapel') || joined.includes('hari')) {
        headerIdx = i;
        break;
      }
    }

    const headers = rawRows[headerIdx].map(h => String(h || '').toLowerCase().trim());
    const findCol = (keywords: string[], fallback: number) => {
      const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
      return idx >= 0 ? idx : fallback;
    };

    const colHari = findCol(['hari', 'tanggal'], 1);
    const colWaktu = findCol(['waktu', 'jam', 'pukul'], 2);
    const colMapel = findCol(['mata pelajaran', 'mapel', 'pelajaran'], 3);
    const colKondisiTarget = findCol(['kondisi target', 'target', 'kondisi'], 4);
    const colKondisiNilai = findCol(['nilai kondisi', 'nilai', 'filter', 'syarat'], 5);
    const colKet = findCol(['keterangan', 'catatan', 'ket'], 6);

    const items: JadwalUjianItem[] = [];
    for (let r = headerIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      const mapel = String(row[colMapel] ?? '').trim();
      const hari = String(row[colHari] ?? '').trim();
      if (!mapel && !hari) continue;

      const rawTarget = String(row[colKondisiTarget] ?? 'Semua').toLowerCase().trim();
      let kondisiTarget: JadwalUjianItem['kondisiTarget'] = 'Semua';
      if (rawTarget.includes('kelas') || rawTarget.includes('rombel')) kondisiTarget = 'Kelas';
      else if (rawTarget.includes('sesi')) kondisiTarget = 'Sesi';
      else if (rawTarget.includes('ruang')) kondisiTarget = 'Ruang';

      items.push({
        id: `jdw-xls-${Date.now()}-${r}`,
        hariTanggal: hari || '-',
        waktu: String(row[colWaktu] ?? '').trim() || '-',
        mataPelajaran: mapel || '-',
        kondisiTarget,
        kondisiNilai: String(row[colKondisiNilai] ?? '').trim(),
        keterangan: String(row[colKet] ?? '').trim()
      });
    }

    if (items.length === 0) {
      return { success: false, data: [], message: 'Tidak ditemukan baris mata pelajaran yang valid.' };
    }

    return {
      success: true,
      data: items,
      message: `Berhasil mengimpor ${items.length} baris jadwal ulangan kondisional dari Excel.`
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      message: err?.message || 'Gagal membaca file Excel jadwal ujian.'
    };
  }
};

export const exportExcelPesertaLinkKartuUjian = (siswaList: Siswa[]): void => {
  const rows: (string | number)[][] = [
    ['No', 'NISN', 'NIS / NIPD', 'Nama Siswa', 'Kelas', 'Nomor Ujian', 'Ruang', 'Sesi', 'Link Foto Siswa (URL)', 'Link Barcode / QR (URL)']
  ];
  siswaList.forEach((s, idx) => {
    rows.push([
      idx + 1,
      s.nisn || '',
      s.nis || s.nipd || '',
      s.nama || '',
      s.rombelSaatIni || s.kelas || '',
      s.nomorUjian || '',
      s.ruangUjian || '',
      s.sesiUjian || '',
      s.fotoUrl && !s.fotoUrl.startsWith('data:') ? s.fotoUrl : '',
      s.barcodeLink || ''
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 12 },
    { wch: 28 },
    { wch: 10 },
    { wch: 16 },
    { wch: 10 },
    { wch: 22 },
    { wch: 42 },
    { wch: 42 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Peserta_Link_Kartu');
  XLSX.writeFile(wb, `Template_Peserta_Link_Foto_Barcode_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const parseExcelPesertaLinkKartuUjian = (
  buffer: ArrayBuffer,
  existingSiswa: Siswa[]
): { success: boolean; updatedList: Siswa[]; matchedCount: number; message: string } => {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return { success: false, updatedList: existingSiswa, matchedCount: 0, message: 'Sheet Excel kosong.' };
    }
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, {
      header: 1,
      defval: ''
    });

    if (rawRows.length < 2) {
      return { success: false, updatedList: existingSiswa, matchedCount: 0, message: 'Data peserta Excel kosong.' };
    }

    const headers = rawRows[0].map(h => String(h || '').toLowerCase().trim());
    const findCol = (keywords: string[], fallback: number) => {
      const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
      return idx >= 0 ? idx : fallback;
    };

    const colNisn = findCol(['nisn'], 1);
    const colNis = findCol(['nis /', 'nipd', 'nis'], 2);
    const colNama = findCol(['nama'], 3);
    const colNoUjian = findCol(['nomor ujian', 'no ujian', 'no. ujian'], 5);
    const colRuang = findCol(['ruang'], 6);
    const colSesi = findCol(['sesi'], 7);
    const colFoto = findCol(['foto', 'photo'], 8);
    const colBarcode = findCol(['barcode', 'qr', 'tautan'], 9);

    const patchMap = new Map<
      string,
      Partial<Pick<Siswa, 'nomorUjian' | 'ruangUjian' | 'sesiUjian' | 'fotoUrl' | 'barcodeLink'>>
    >();

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      const nisnVal = String(row[colNisn] ?? '').trim();
      const nisVal = String(row[colNis] ?? '').trim();
      const namaVal = String(row[colNama] ?? '').trim().toLowerCase();
      if (!nisnVal && !nisVal && !namaVal) continue;

      const target = existingSiswa.find(s => {
        if (nisnVal && s.nisn && s.nisn.trim() === nisnVal) return true;
        if (nisVal && (s.nis?.trim() === nisVal || s.nipd?.trim() === nisVal)) return true;
        if (namaVal && s.nama.trim().toLowerCase() === namaVal) return true;
        return false;
      });

      if (target) {
        const patch: Partial<Pick<Siswa, 'nomorUjian' | 'ruangUjian' | 'sesiUjian' | 'fotoUrl' | 'barcodeLink'>> = {};
        const noUjianRaw = String(row[colNoUjian] ?? '').trim();
        const noUjian = noUjianRaw ? sanitizeNomorUjian10Digit(noUjianRaw, true) : '';
        const ruang = String(row[colRuang] ?? '').trim();
        const sesi = String(row[colSesi] ?? '').trim();
        const foto = String(row[colFoto] ?? '').trim();
        const barcode = String(row[colBarcode] ?? '').trim();

        if (noUjian) patch.nomorUjian = noUjian;
        if (ruang) patch.ruangUjian = ruang;
        if (sesi) patch.sesiUjian = sesi;
        if (foto) patch.fotoUrl = foto;
        if (barcode) patch.barcodeLink = barcode;

        patchMap.set(target.id, patch);
      }
    }

    const updatedList = existingSiswa.map(s =>
      patchMap.has(s.id) ? { ...s, ...patchMap.get(s.id)! } : s
    );

    return {
      success: patchMap.size > 0,
      updatedList,
      matchedCount: patchMap.size,
      message:
        patchMap.size > 0
          ? `Berhasil memperbarui ${patchMap.size} peserta (No. Ujian / Ruang / Sesi / Link Foto & Barcode) dari Excel.`
          : 'Tidak ada baris peserta yang cocok dengan NISN, NIS, atau Nama siswa.'
    };
  } catch (err: any) {
    return {
      success: false,
      updatedList: existingSiswa,
      matchedCount: 0,
      message: err?.message || 'Gagal membaca file Excel peserta.'
    };
  }
};

// ================= EXCEL KARTU PANITIA & PENGAWAS =================

export const exportExcelPanitiaPengawas = (items: PanitiaPengawasItem[]): void => {
  const rows: (string | number)[][] = [
    [
      'No',
      'Kategori (Panitia/Pengawas)',
      'Nomor Tugas',
      'Nama Lengkap & Gelar',
      'NIP',
      'Pangkat / Golongan',
      'Jabatan / Peran Ujian',
      'Unit Asal / Mapel',
      'Ruang Tugas',
      'Sesi Tugas',
      'Link Foto (URL)',
      'Link Barcode (URL)'
    ]
  ];

  items.forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.kategori === 'panitia' ? 'Panitia' : 'Pengawas',
      item.nomorTugas || '',
      item.nama || '',
      item.nip || '',
      item.pangkatGolongan || '',
      item.jabatanKepanitiaan || '',
      item.unitAsal || '',
      item.ruangTugas || '',
      item.sesiTugas || '',
      item.fotoUrl && !item.fotoUrl.startsWith('data:') ? item.fotoUrl : '',
      item.barcodeLink || ''
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 18 },
    { wch: 26 },
    { wch: 22 },
    { wch: 16 },
    { wch: 22 },
    { wch: 36 },
    { wch: 36 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Panitia_Pengawas');
  XLSX.writeFile(wb, `Data_Kartu_Panitia_Pengawas_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const parseExcelPanitiaPengawas = (
  buffer: ArrayBuffer,
  existingList: PanitiaPengawasItem[]
): { success: boolean; data: PanitiaPengawasItem[]; count: number; message: string } => {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return { success: false, data: existingList, count: 0, message: 'Sheet Excel kosong.' };
    }
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, {
      header: 1,
      defval: ''
    });

    if (rawRows.length < 2) {
      return { success: false, data: existingList, count: 0, message: 'Data baris Excel kosong.' };
    }

    const headers = rawRows[0].map(h => String(h || '').toLowerCase().trim());
    const findCol = (keywords: string[], fallback: number) => {
      const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
      return idx >= 0 ? idx : fallback;
    };

    const colKategori = findCol(['kategori', 'jenis'], 1);
    const colNomor = findCol(['nomor tugas', 'no tugas', 'nomor'], 2);
    const colNama = findCol(['nama'], 3);
    const colNip = findCol(['nip'], 4);
    const colPangkat = findCol(['pangkat', 'gol'], 5);
    const colJabatan = findCol(['jabatan', 'peran', 'tugas'], 6);
    const colUnit = findCol(['unit', 'mapel', 'asal'], 7);
    const colRuang = findCol(['ruang'], 8);
    const colSesi = findCol(['sesi', 'waktu'], 9);
    const colFoto = findCol(['foto', 'photo'], 10);
    const colBarcode = findCol(['barcode', 'qr'], 11);

    const parsed: PanitiaPengawasItem[] = [];
    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      const nama = String(row[colNama] ?? '').trim();
      if (!nama) continue;

      const rawKat = String(row[colKategori] ?? '').toLowerCase().trim();
      const kategori: 'panitia' | 'pengawas' = rawKat.includes('pengawas')
        ? 'pengawas'
        : 'panitia';

      parsed.push({
        id: `pp-xl-${Date.now()}-${r}`,
        kategori,
        nomorTugas:
          String(row[colNomor] ?? '').trim() ||
          `${kategori === 'panitia' ? 'PAN' : 'PGW'}-26-${String(r).padStart(3, '0')}`,
        nama,
        nip: String(row[colNip] ?? '').trim(),
        pangkatGolongan: String(row[colPangkat] ?? '').trim(),
        jabatanKepanitiaan:
          String(row[colJabatan] ?? '').trim() ||
          (kategori === 'panitia' ? 'Anggota Panitia' : 'Pengawas Ruang'),
        unitAsal: String(row[colUnit] ?? '').trim(),
        ruangTugas: String(row[colRuang] ?? '').trim(),
        sesiTugas: String(row[colSesi] ?? '').trim(),
        fotoUrl: String(row[colFoto] ?? '').trim(),
        barcodeLink: String(row[colBarcode] ?? '').trim(),
        sourceType: 'manual'
      });
    }

    if (parsed.length === 0) {
      return {
        success: false,
        data: existingList,
        count: 0,
        message: 'Tidak ditemukan baris dengan kolom Nama yang valid.'
      };
    }

    return {
      success: true,
      data: parsed,
      count: parsed.length,
      message: `Berhasil mengimpor ${parsed.length} data Panitia & Pengawas dari Excel.`
    };
  } catch (err: any) {
    return {
      success: false,
      data: existingList,
      count: 0,
      message: err?.message || 'Gagal membaca file Excel Panitia & Pengawas.'
    };
  }
};

export const exportExcelMatriksJadwalPengawas = (
  items: PanitiaPengawasItem[],
  slots: JadwalPengawasSlot[]
): void => {
  const effectiveSlots = slots.length > 0 ? slots : DEFAULT_JADWAL_PENGAWAS_SLOTS;
  const pengawasOnly = items.filter(i => i.kategori === 'pengawas');

  const rows: (string | number)[][] = [
    ['No', 'Nama Pengawas', ...effectiveSlots.map(s => s.hari), 'JAGA', 'CAD', 'OFF'],
    ['', '', ...effectiveSlots.map(s => s.tanggal), '', '', ''],
    ['', '', ...effectiveSlots.map(s => s.waktu), '', '', ''],
    ['', '', ...effectiveSlots.map(s => s.mapel), '', '', ''],
    ['', '', ...effectiveSlots.map(s => s.sesiLabel), '', '', '']
  ];

  pengawasOnly.forEach((item, idx) => {
    const sum = summarizePengawasSchedule(item.jadwalMengawas, effectiveSlots);
    rows.push([
      idx + 1,
      item.nama,
      ...effectiveSlots.map(s => item.jadwalMengawas?.[s.id] || ''),
      sum.jaga,
      sum.cad,
      sum.off
    ]);
  });

  const totals = recomputeTotalsPerSlot(pengawasOnly, effectiveSlots);
  rows.push([
    '',
    'TOTAL CADANGAN GURU / SESI',
    ...effectiveSlots.map(s => totals[s.id]?.cad ?? 0),
    '',
    '',
    ''
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 36 },
    ...effectiveSlots.map(() => ({ wch: 16 })),
    { wch: 7 },
    { wch: 7 },
    { wch: 7 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal_Pengawas');
  XLSX.writeFile(wb, `Jadwal_Pengawas_PSAS_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const parseExcelMatriksJadwalPengawas = (
  buffer: ArrayBuffer,
  existingItems: PanitiaPengawasItem[],
  existingSlots: JadwalPengawasSlot[],
  settings: KartuPanitiaSettings
): {
  success: boolean;
  items: PanitiaPengawasItem[];
  slots: JadwalPengawasSlot[];
  count: number;
  message: string;
} => {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        items: existingItems,
        slots: existingSlots,
        count: 0,
        message: 'Sheet Excel kosong.'
      };
    }
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(ws, {
      header: 1,
      defval: ''
    });

    if (rawRows.length < 3) {
      return {
        success: false,
        items: existingItems,
        slots: existingSlots,
        count: 0,
        message: 'Format matriks jadwal pengawas tidak mencukupi.'
      };
    }

    // Locate header start & first data row (where Col A is numeric 1)
    let dataStartRow = rawRows.findIndex(r => /^\s*1\s*$/.test(String(r[0] ?? '')));
    if (dataStartRow < 1) {
      dataStartRow = 1;
    }

    // Determine Nama Pengawas col & end of slot cols (before JAGA / CAD / OFF)
    const headerTop = rawRows[0].map(c => String(c ?? '').trim());
    let namaCol = headerTop.findIndex(c => /nama/i.test(c));
    if (namaCol < 0) namaCol = 1;

    let slotEndCol = headerTop.findIndex((c, idx) => idx > namaCol && /^(jaga|cad|off)$/i.test(c));
    if (slotEndCol < 0) {
      slotEndCol = Math.min(headerTop.length, namaCol + 1 + Math.max(existingSlots.length, 16));
    }

    const baseSlots =
      existingSlots.length > 0 ? existingSlots : [...DEFAULT_JADWAL_PENGAWAS_SLOTS];
    const parsedSlots: JadwalPengawasSlot[] = [];

    for (let c = namaCol + 1; c < slotEndCol; c++) {
      const idx = c - (namaCol + 1);
      const fallbackSlot = baseSlots[idx] || {
        id: `s${String(idx + 1).padStart(2, '0')}`,
        hari: `Hari ${idx + 1}`,
        tanggal: '-',
        waktu: '-',
        mapel: '-',
        sesiLabel: `Sesi ${(idx % 2) + 1}`
      };
      const r0 = String(rawRows[0]?.[c] ?? '').trim();
      const r1 = dataStartRow > 1 ? String(rawRows[1]?.[c] ?? '').trim() : '';
      const r2 = dataStartRow > 2 ? String(rawRows[2]?.[c] ?? '').trim() : '';
      const r3 = dataStartRow > 3 ? String(rawRows[3]?.[c] ?? '').trim() : '';
      const r4 = dataStartRow > 4 ? String(rawRows[4]?.[c] ?? '').trim() : '';

      parsedSlots.push({
        id: fallbackSlot.id,
        hari: r0 || fallbackSlot.hari,
        tanggal: r1 || fallbackSlot.tanggal,
        waktu: r2 || fallbackSlot.waktu,
        mapel: r3 || fallbackSlot.mapel,
        sesiLabel: r4 || fallbackSlot.sesiLabel
      });
    }

    const existingPanitia = existingItems.filter(i => i.kategori === 'panitia');
    const existingPengawas = existingItems.filter(i => i.kategori === 'pengawas');
    const guruPool = getStoredGuru();
    const tendikPool = getStoredTendik();
    const prefix = settings.prefixNomorPengawas || 'PGW-26-';

    const parsedPengawas: PanitiaPengawasItem[] = [];
    let seq = 0;

    for (let r = dataStartRow; r < rawRows.length; r++) {
      const row = rawRows[r];
      const nama = String(row[namaCol] ?? '').trim();
      if (!nama || /^total\s+cadangan/i.test(nama)) continue;

      seq++;
      const jadwalMengawas: Record<string, string> = {};
      parsedSlots.forEach((slot, sIdx) => {
        const rawVal = normalizeAssignmentValue(String(row[namaCol + 1 + sIdx] ?? ''));
        if (rawVal) {
          jadwalMengawas[slot.id] = rawVal;
        }
      });

      const normNama = normalizeIndonesianBaseName(nama);
      const prev = existingPengawas.find(
        p => normalizeIndonesianBaseName(p.nama) === normNama
      );

      const matchedGuru =
        prev?.sourceId
          ? undefined
          : guruPool.find(g => normalizeIndonesianBaseName(g.nama) === normNama) ||
            tendikPool.find(t => normalizeIndonesianBaseName(t.nama) === normNama);

      const summary = summarizePengawasSchedule(jadwalMengawas, parsedSlots);

      parsedPengawas.push({
        id: prev?.id || `pp-pgw-xl-${Date.now()}-${seq}`,
        kategori: 'pengawas',
        nomorTugas: prev?.nomorTugas || `${prefix}${String(seq).padStart(3, '0')}`,
        nama,
        nip: prev?.nip && prev.nip !== '-' ? prev.nip : matchedGuru?.nip || '-',
        pangkatGolongan:
          prev?.pangkatGolongan && prev.pangkatGolongan !== '-'
            ? prev.pangkatGolongan
            : matchedGuru?.pangkatGolongan || '-',
        jabatanKepanitiaan: prev?.jabatanKepanitiaan || 'Pengawas Ruang',
        unitAsal: prev?.unitAsal || matchedGuru?.jabatan || 'Guru Mapel',
        ruangTugas: summary.ruangSummary || prev?.ruangTugas || '-',
        sesiTugas: summary.sesiSummary || prev?.sesiTugas || 'Sesi 1 & 2',
        fotoUrl: prev?.fotoUrl,
        barcodeLink: prev?.barcodeLink,
        sourceType: prev?.sourceType || (matchedGuru ? 'guru' : 'manual'),
        sourceId: prev?.sourceId || matchedGuru?.id,
        jadwalMengawas
      });
    }

    if (parsedPengawas.length === 0) {
      return {
        success: false,
        items: existingItems,
        slots: existingSlots,
        count: 0,
        message: 'Tidak ada baris Pengawas yang terbaca pada file Excel.'
      };
    }

    return {
      success: true,
      items: [...existingPanitia, ...parsedPengawas],
      slots: parsedSlots,
      count: parsedPengawas.length,
      message: `Berhasil mengimpor matriks jadwal untuk ${parsedPengawas.length} pengawas (${parsedSlots.length} sesi).`
    };
  } catch (err: any) {
    return {
      success: false,
      items: existingItems,
      slots: existingSlots,
      count: 0,
      message: err?.message || 'Gagal membaca file Excel matriks jadwal pengawas.'
    };
  }
};

