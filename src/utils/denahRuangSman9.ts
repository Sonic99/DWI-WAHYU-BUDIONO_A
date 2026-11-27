import { PanitiaPengawasItem, Siswa } from '../types';

export type DenahRoomCategory =
  | 'ruang_ujian'
  | 'laboratorium'
  | 'kantor_admin'
  | 'fasilitas_umum'
  | 'taman_lapangan'
  | 'parkir'
  | 'non_aktif'
  | 'batas_wilayah';

export type DenahRoomStatusOverride = 'default' | 'exam_active' | 'reserved_red' | 'maintenance';

export interface DenahRoomItem {
  id: string;
  label: string;
  sublabel?: string;
  category: DenahRoomCategory;
  examRoomNumber?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotateLabel?: boolean;
  labelAngle?: number;
  defaultFill: string;
  textColor?: string;
  fontSize?: number;
  clickable?: boolean;
  description?: string;
}

export interface DenahRoomOverride {
  customLabel?: string;
  customSublabel?: string;
  statusOverride?: DenahRoomStatusOverride;
  note?: string;
}

export interface DenahRuangConfig {
  title: string;
  subtitle: string;
  showExamOccupancy: boolean;
  showLegend: boolean;
  showCompass: boolean;
  paperSize: 'A4' | 'F4';
  overrides: Record<string, DenahRoomOverride>;
}

const DENAH_STORAGE_KEY = 'sip_tu_denah_ruang_sman9_v1';

export const DEFAULT_DENAH_TITLE =
  'DENAH RUANG PENILAIAN SUMATIF AKHIR SEMESTER GASAL SMA NEGERI 9 SURABAYA';

export const createDefaultDenahConfig = (tahunAjaran = '2026 - 2027'): DenahRuangConfig => ({
  title: DEFAULT_DENAH_TITLE,
  subtitle: `TAHUN PELAJARAN : ${tahunAjaran}`,
  showExamOccupancy: true,
  showLegend: true,
  showCompass: true,
  paperSize: 'A4',
  overrides: {}
});

export const getStoredDenahConfig = (tahunAjaran?: string): DenahRuangConfig => {
  const fallback = createDefaultDenahConfig(tahunAjaran || '2026 - 2027');
  try {
    const raw = localStorage.getItem(DENAH_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DenahRuangConfig>;
    return {
      ...fallback,
      ...parsed,
      overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {}
    };
  } catch {
    return fallback;
  }
};

export const saveStoredDenahConfig = (config: DenahRuangConfig): void => {
  try {
    localStorage.setItem(DENAH_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota issues for lightweight config
  }
};

// Base architectural coordinates matching SMAN 9 Surabaya campus map (viewBox 0 0 1200 660)
export const SMAN9_DENAH_ROOMS: DenahRoomItem[] = [
  // Parking / Field background strips drawn first
  {
    id: 'parkir-mobil-barat',
    label: 'HALAMAN PARKIR MOBIL',
    category: 'parkir',
    x: 58,
    y: 560,
    w: 788,
    h: 82,
    defaultFill: '#a9d08e',
    textColor: '#0f172a',
    fontSize: 9,
    clickable: true,
    description: 'Area parkir mobil & akses halaman selatan SMAN 9 Surabaya'
  },
  {
    id: 'parkir-mobil-timur',
    label: 'HALAMAN PARKIR MOBIL',
    category: 'parkir',
    x: 902,
    y: 554,
    w: 278,
    h: 88,
    defaultFill: '#a9d08e',
    textColor: '#0f172a',
    fontSize: 9,
    clickable: true,
    description: 'Area parkir mobil sisi timur'
  },

  // Top-left & Top-right Neighbor School Boundaries
  {
    id: 'batas-sman1',
    label: 'SMAN 1 SBY',
    category: 'batas_wilayah',
    x: 20,
    y: 18,
    w: 282,
    h: 234,
    defaultFill: '#f4b183',
    textColor: '#1e293b',
    fontSize: 10,
    clickable: false
  },
  {
    id: 'batas-sman5',
    label: 'SMAN 5 SBY',
    category: 'batas_wilayah',
    x: 902,
    y: 18,
    w: 278,
    h: 248,
    defaultFill: '#ffff00',
    textColor: '#1e293b',
    fontSize: 10,
    clickable: false
  },

  // Top-Center Wing (Gudang, Masjid, Toilet Putra, ABM 1-2, Aula)
  {
    id: 'gudang-utara',
    label: 'GUDANG',
    category: 'fasilitas_umum',
    x: 302,
    y: 18,
    w: 80,
    h: 28,
    defaultFill: '#bdd7ee',
    fontSize: 9,
    clickable: true
  },
  {
    id: 'masjid',
    label: 'MASJID',
    category: 'fasilitas_umum',
    x: 302,
    y: 56,
    w: 80,
    h: 54,
    defaultFill: '#b8860b',
    textColor: '#0f172a',
    fontSize: 10,
    clickable: true,
    description: 'Masjid sekolah SMAN 9 Surabaya'
  },
  {
    id: 'gd-masjid',
    label: 'GD',
    category: 'fasilitas_umum',
    x: 302,
    y: 110,
    w: 19,
    h: 26,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 8,
    clickable: true
  },
  {
    id: 'wudlu',
    label: 'WUDLU',
    category: 'fasilitas_umum',
    x: 321,
    y: 110,
    w: 19,
    h: 26,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 7.5,
    clickable: true
  },
  {
    id: 'toilet-putra-masjid',
    label: 'TOILET PUTRA',
    category: 'fasilitas_umum',
    x: 302,
    y: 136,
    w: 38,
    h: 68,
    rotateLabel: true,
    defaultFill: '#e6c8c0',
    fontSize: 9,
    clickable: true
  },
  {
    id: 'abm-2',
    label: 'ABM 2',
    category: 'fasilitas_umum',
    x: 302,
    y: 204,
    w: 38,
    h: 32,
    defaultFill: '#bdd7ee',
    fontSize: 9,
    clickable: true
  },
  {
    id: 'abm-1',
    label: 'ABM 1',
    category: 'fasilitas_umum',
    x: 302,
    y: 236,
    w: 38,
    h: 32,
    defaultFill: '#bdd7ee',
    fontSize: 9,
    clickable: true
  },
  {
    id: 'util-abm-top',
    label: '',
    category: 'fasilitas_umum',
    x: 340,
    y: 204,
    w: 22,
    h: 32,
    defaultFill: '#cbd5e1',
    clickable: false
  },
  {
    id: 'util-abm-bot',
    label: '',
    category: 'fasilitas_umum',
    x: 340,
    y: 236,
    w: 22,
    h: 32,
    defaultFill: '#cbd5e1',
    clickable: false
  },

  // Aula & North-West Vertical Wing (BK, Perpus, R. Guru, R-7..R-12)
  {
    id: 'aula',
    label: 'AULA',
    category: 'fasilitas_umum',
    x: 382,
    y: 18,
    w: 88,
    h: 88,
    defaultFill: '#9dc3e6',
    fontSize: 10.5,
    clickable: true,
    description: 'Aula utama kegiatan dan briefing pengawas/peserta'
  },
  {
    id: 'bk-barat',
    label: 'BK',
    category: 'kantor_admin',
    x: 382,
    y: 118,
    w: 50,
    h: 70,
    rotateLabel: true,
    defaultFill: '#d9ead3',
    fontSize: 13,
    clickable: true,
    description: 'Ruang Bimbingan & Konseling (Sayap Tengah)'
  },
  {
    id: 'perpus',
    label: 'PERPUS',
    category: 'fasilitas_umum',
    x: 382,
    y: 188,
    w: 50,
    h: 70,
    defaultFill: '#f4b183',
    fontSize: 9.5,
    clickable: true,
    description: 'Perpustakaan Sekolah'
  },
  {
    id: 'r-guru',
    label: 'R. GURU',
    category: 'kantor_admin',
    x: 382,
    y: 258,
    w: 50,
    h: 66,
    defaultFill: '#bf9000',
    fontSize: 9.5,
    clickable: true,
    description: 'Ruang Dewan Guru SMAN 9 Surabaya'
  },
  {
    id: 'r-7',
    label: 'R-7',
    category: 'ruang_ujian',
    examRoomNumber: 7,
    x: 432,
    y: 118,
    w: 38,
    h: 41,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 12,
    clickable: true
  },
  {
    id: 'r-8',
    label: 'R-8',
    category: 'ruang_ujian',
    examRoomNumber: 8,
    x: 432,
    y: 159,
    w: 38,
    h: 41,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 12,
    clickable: true
  },
  {
    id: 'r-9',
    label: 'R-9',
    category: 'ruang_ujian',
    examRoomNumber: 9,
    x: 432,
    y: 200,
    w: 38,
    h: 41,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 12,
    clickable: true
  },
  {
    id: 'r-10',
    label: 'R-10',
    category: 'ruang_ujian',
    examRoomNumber: 10,
    x: 432,
    y: 241,
    w: 38,
    h: 41,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 11.5,
    clickable: true
  },
  {
    id: 'r-11',
    label: 'R-11',
    category: 'ruang_ujian',
    examRoomNumber: 11,
    x: 432,
    y: 282,
    w: 38,
    h: 42,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 11.5,
    clickable: true
  },
  {
    id: 'r-12',
    label: 'R-12',
    category: 'ruang_ujian',
    examRoomNumber: 12,
    x: 382,
    y: 324,
    w: 88,
    h: 30,
    defaultFill: '#bdd7ee',
    fontSize: 12,
    clickable: true
  },

  // North Strip (GD, UKS, IKOM, KANTIN, ABM 3, ABM 4) + Lapangan I & 2
  {
    id: 'gd-uks',
    label: 'GD',
    category: 'fasilitas_umum',
    x: 470,
    y: 18,
    w: 20,
    h: 28,
    defaultFill: '#9dc3e6',
    fontSize: 8.5,
    clickable: true
  },
  {
    id: 'uks',
    label: 'UKS',
    category: 'fasilitas_umum',
    x: 490,
    y: 18,
    w: 52,
    h: 28,
    defaultFill: '#9dc3e6',
    fontSize: 9.5,
    clickable: true,
    description: 'Unit Kesehatan Sekolah'
  },
  {
    id: 'ikom',
    label: 'IKOM',
    category: 'fasilitas_umum',
    x: 542,
    y: 18,
    w: 20,
    h: 28,
    rotateLabel: true,
    defaultFill: '#9dc3e6',
    fontSize: 7.5,
    clickable: true
  },
  {
    id: 'kantin',
    label: 'KANTIN',
    category: 'fasilitas_umum',
    x: 562,
    y: 18,
    w: 264,
    h: 36,
    defaultFill: '#9dc3e6',
    fontSize: 12.5,
    clickable: true,
    description: 'Area Kantin Sekolah'
  },
  {
    id: 'abm-3',
    label: 'ABM 3',
    category: 'fasilitas_umum',
    x: 826,
    y: 18,
    w: 38,
    h: 28,
    defaultFill: '#f8fafc',
    fontSize: 9,
    clickable: true
  },
  {
    id: 'abm-4',
    label: 'ABM 4',
    category: 'fasilitas_umum',
    x: 864,
    y: 18,
    w: 38,
    h: 28,
    defaultFill: '#f8fafc',
    fontSize: 9,
    clickable: true
  },
  {
    id: 'lapangan-1',
    label: 'LAPANGAN I',
    category: 'taman_lapangan',
    x: 490,
    y: 66,
    w: 206,
    h: 200,
    defaultFill: '#a9d08e',
    fontSize: 10,
    clickable: true,
    description: 'Lapangan Olahraga & Upacara Sisi Barat'
  },
  {
    id: 'lapangan-2',
    label: 'LAPANGAN 2',
    category: 'taman_lapangan',
    x: 696,
    y: 66,
    w: 206,
    h: 200,
    defaultFill: '#a9d08e',
    fontSize: 10,
    clickable: true,
    description: 'Lapangan Olahraga Sisi Timur'
  },

  // Middle-Left Taman & Toilets below SMAN 1 SBY
  {
    id: 'strip-hijau-1',
    label: '',
    category: 'taman_lapangan',
    x: 20,
    y: 252,
    w: 38,
    h: 26,
    defaultFill: '#d9ead3',
    clickable: false
  },
  {
    id: 'toilet-putra-atas',
    label: 'Toilet Putra',
    category: 'fasilitas_umum',
    x: 58,
    y: 252,
    w: 76,
    h: 26,
    defaultFill: '#00b0f0',
    fontSize: 9.5,
    clickable: true
  },
  {
    id: 'strip-hijau-2',
    label: '',
    category: 'taman_lapangan',
    x: 134,
    y: 252,
    w: 56,
    h: 26,
    defaultFill: '#d9ead3',
    clickable: false
  },
  {
    id: 'toilet-putri-atas',
    label: 'Toilet Putri',
    category: 'fasilitas_umum',
    x: 190,
    y: 252,
    w: 70,
    h: 26,
    defaultFill: '#92d050',
    fontSize: 9.5,
    clickable: true
  },
  {
    id: 'strip-hijau-3',
    label: '',
    category: 'taman_lapangan',
    x: 260,
    y: 252,
    w: 42,
    h: 26,
    defaultFill: '#d9ead3',
    clickable: false
  },
  {
    id: 'toilet-putra-kiri',
    label: 'TOILET PUTRA',
    category: 'fasilitas_umum',
    x: 20,
    y: 278,
    w: 38,
    h: 50,
    defaultFill: '#00b0f0',
    fontSize: 8.5,
    clickable: true
  },
  {
    id: 'taman-barat-blok',
    label: 'TAMAN',
    category: 'taman_lapangan',
    x: 58,
    y: 278,
    w: 282,
    h: 50,
    defaultFill: '#92d050',
    fontSize: 12,
    clickable: true
  },

  // West Wing: Koperasi & 5 Red Rooms along Lorong Menuju Lab Kom
  {
    id: 'koperasi',
    label: 'KOPERASI',
    category: 'fasilitas_umum',
    x: 20,
    y: 368,
    w: 38,
    h: 86,
    labelAngle: -65,
    defaultFill: '#ffffff',
    fontSize: 8.5,
    clickable: true,
    description: 'Koperasi Siswa SMAN 9 Surabaya'
  },
  {
    id: 'ruang-merah-1',
    label: 'R. Non-Aktif 1',
    category: 'non_aktif',
    x: 58,
    y: 368,
    w: 78,
    h: 70,
    defaultFill: '#ff0000',
    textColor: '#ffffff',
    fontSize: 9,
    clickable: true,
    description: 'Blok Merah Sayap Barat (Tidak Dipakai / Renovasi)'
  },
  {
    id: 'ruang-merah-2',
    label: 'R. Non-Aktif 2',
    category: 'non_aktif',
    x: 136,
    y: 368,
    w: 78,
    h: 70,
    defaultFill: '#ff0000',
    textColor: '#ffffff',
    fontSize: 9,
    clickable: true,
    description: 'Blok Merah Sayap Barat (Tidak Dipakai / Renovasi)'
  },
  {
    id: 'ruang-merah-3',
    label: 'R. Non-Aktif 3',
    category: 'non_aktif',
    x: 214,
    y: 368,
    w: 78,
    h: 70,
    defaultFill: '#ff0000',
    textColor: '#ffffff',
    fontSize: 9,
    clickable: true,
    description: 'Blok Merah Sayap Barat (Tidak Dipakai / Renovasi)'
  },
  {
    id: 'ruang-merah-4',
    label: 'R. Non-Aktif 4',
    category: 'non_aktif',
    x: 292,
    y: 368,
    w: 78,
    h: 70,
    defaultFill: '#ff0000',
    textColor: '#ffffff',
    fontSize: 9,
    clickable: true,
    description: 'Blok Merah Sayap Barat (Tidak Dipakai / Renovasi)'
  },
  {
    id: 'ruang-merah-5',
    label: 'R. Non-Aktif 5',
    category: 'non_aktif',
    x: 370,
    y: 368,
    w: 80,
    h: 70,
    defaultFill: '#ff0000',
    textColor: '#ffffff',
    fontSize: 9,
    clickable: true,
    description: 'Blok Merah Sayap Barat (Tidak Dipakai / Renovasi)'
  },
  {
    id: 'toilet-putri-barat-1',
    label: 'TOILET PUTRI',
    category: 'fasilitas_umum',
    x: 20,
    y: 438,
    w: 38,
    h: 40,
    defaultFill: '#ffd966',
    fontSize: 8.5,
    clickable: true
  },
  {
    id: 'toilet-putri-barat-2',
    label: 'TOILET PUTRI',
    category: 'fasilitas_umum',
    x: 20,
    y: 502,
    w: 38,
    h: 32,
    defaultFill: '#ffd966',
    fontSize: 8.5,
    clickable: true
  },
  {
    id: 'sandy',
    label: 'SANDY',
    category: 'fasilitas_umum',
    x: 20,
    y: 534,
    w: 38,
    h: 108,
    rotateLabel: true,
    defaultFill: '#c65911',
    textColor: '#0f172a',
    fontSize: 10,
    clickable: true
  },

  // Center Classroom & Management Cluster (R-13..R-15, Kurikulum, Sarpras, R-1, Wk Siswa, OSIS, Songomania)
  {
    id: 'r-13',
    label: 'R-13',
    category: 'ruang_ujian',
    examRoomNumber: 13,
    x: 490,
    y: 328,
    w: 75,
    h: 42,
    defaultFill: '#bdd7ee',
    fontSize: 13,
    clickable: true
  },
  {
    id: 'r-14',
    label: 'R-14',
    category: 'ruang_ujian',
    examRoomNumber: 14,
    x: 565,
    y: 328,
    w: 75,
    h: 42,
    defaultFill: '#bdd7ee',
    fontSize: 13,
    clickable: true
  },
  {
    id: 'r-15',
    label: 'R-15',
    category: 'ruang_ujian',
    examRoomNumber: 15,
    x: 640,
    y: 328,
    w: 74,
    h: 42,
    defaultFill: '#bdd7ee',
    fontSize: 13,
    clickable: true
  },
  {
    id: 'r-kurikulum',
    label: 'R. KURIKULUM',
    category: 'kantor_admin',
    x: 490,
    y: 370,
    w: 75,
    h: 68,
    defaultFill: '#bdd7ee',
    fontSize: 8.5,
    clickable: true,
    description: 'Ruang Kurikulum & Panitia Naskah Ujian'
  },
  {
    id: 'r-sarpras',
    label: 'R. SARPRAS',
    category: 'kantor_admin',
    x: 565,
    y: 370,
    w: 75,
    h: 68,
    defaultFill: '#bdd7ee',
    fontSize: 8.5,
    clickable: true,
    description: 'Ruang Sarana & Prasarana'
  },
  {
    id: 'r-1',
    label: 'R-1',
    category: 'ruang_ujian',
    examRoomNumber: 1,
    x: 640,
    y: 370,
    w: 36,
    h: 68,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 13,
    clickable: true
  },
  {
    id: 'r-wk-siswa',
    label: 'R. WK SISWA',
    category: 'kantor_admin',
    x: 676,
    y: 370,
    w: 19,
    h: 68,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 7.5,
    clickable: true
  },
  {
    id: 'r-osis',
    label: 'R. OSIS',
    category: 'fasilitas_umum',
    x: 695,
    y: 370,
    w: 19,
    h: 34,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 7,
    clickable: true
  },
  {
    id: 'songomania',
    label: 'SONGOMANIA',
    category: 'fasilitas_umum',
    x: 695,
    y: 404,
    w: 19,
    h: 34,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 5.5,
    clickable: true
  },
  {
    id: 'gubug-wifi',
    label: 'GUBUG WIFI',
    category: 'fasilitas_umum',
    x: 732,
    y: 370,
    w: 76,
    h: 68,
    defaultFill: '#ffe699',
    fontSize: 9,
    clickable: true,
    description: 'Gubug WiFi & Area Belajar Terbuka'
  },
  {
    id: 'taman-tengah',
    label: 'TAMAN',
    category: 'taman_lapangan',
    x: 508,
    y: 456,
    w: 206,
    h: 34,
    defaultFill: '#92d050',
    fontSize: 12,
    clickable: true
  },

  // Bottom Row: Garasi, Gudang, GD/WC, Lab Kom 2, R-6..R-2, and R.16..R.18
  {
    id: 'garasi',
    label: 'GARASI',
    category: 'fasilitas_umum',
    x: 152,
    y: 504,
    w: 38,
    h: 56,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 9,
    clickable: true
  },
  {
    id: 'gudang-bawah',
    label: 'GUDANG',
    category: 'fasilitas_umum',
    x: 190,
    y: 504,
    w: 36,
    h: 56,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 10,
    clickable: true
  },
  {
    id: 'gd-bawah',
    label: 'GD',
    category: 'fasilitas_umum',
    x: 226,
    y: 504,
    w: 22,
    h: 28,
    defaultFill: '#bdd7ee',
    fontSize: 8.5,
    clickable: true
  },
  {
    id: 'wc-bawah',
    label: 'WC',
    category: 'fasilitas_umum',
    x: 226,
    y: 532,
    w: 22,
    h: 28,
    defaultFill: '#bdd7ee',
    fontSize: 8.5,
    clickable: true
  },
  {
    id: 'lab-kom-2',
    label: 'Lab Kom 2',
    category: 'laboratorium',
    x: 248,
    y: 504,
    w: 76,
    h: 56,
    defaultFill: '#bdd7ee',
    fontSize: 10.5,
    clickable: true,
    description: 'Laboratorium Komputer 2 (ANBK / CBT)'
  },
  {
    id: 'r-6',
    label: 'R-6',
    category: 'ruang_ujian',
    examRoomNumber: 6,
    x: 324,
    y: 504,
    w: 84,
    h: 56,
    defaultFill: '#bdd7ee',
    fontSize: 14,
    clickable: true
  },
  {
    id: 'r-5',
    label: 'R-5',
    category: 'ruang_ujian',
    examRoomNumber: 5,
    x: 408,
    y: 504,
    w: 84,
    h: 56,
    defaultFill: '#bdd7ee',
    fontSize: 14,
    clickable: true
  },
  {
    id: 'r-4',
    label: 'R-4',
    category: 'ruang_ujian',
    examRoomNumber: 4,
    x: 492,
    y: 504,
    w: 74,
    h: 56,
    defaultFill: '#bdd7ee',
    fontSize: 14,
    clickable: true
  },
  {
    id: 'r-3',
    label: 'R-3',
    category: 'ruang_ujian',
    examRoomNumber: 3,
    x: 566,
    y: 504,
    w: 74,
    h: 56,
    defaultFill: '#bdd7ee',
    fontSize: 14,
    clickable: true
  },
  {
    id: 'r-2',
    label: 'R-2',
    category: 'ruang_ujian',
    examRoomNumber: 2,
    x: 640,
    y: 504,
    w: 74,
    h: 56,
    defaultFill: '#bdd7ee',
    fontSize: 14,
    clickable: true
  },
  {
    id: 'r-16',
    label: 'R.16',
    category: 'ruang_ujian',
    examRoomNumber: 16,
    x: 492,
    y: 560,
    w: 74,
    h: 32,
    defaultFill: '#bdd7ee',
    fontSize: 14,
    clickable: true
  },
  {
    id: 'r-17',
    label: 'R.17',
    category: 'ruang_ujian',
    examRoomNumber: 17,
    x: 566,
    y: 560,
    w: 74,
    h: 32,
    defaultFill: '#bdd7ee',
    fontSize: 14,
    clickable: true
  },
  {
    id: 'r-18',
    label: 'R.18',
    category: 'ruang_ujian',
    examRoomNumber: 18,
    x: 640,
    y: 560,
    w: 74,
    h: 32,
    defaultFill: '#bdd7ee',
    fontSize: 14,
    clickable: true
  },

  // Center-Right Executive Offices (Monitor, Waka, Kepsek, Koordinasi)
  {
    id: 'r-monitor',
    label: 'R. MONITOR',
    category: 'kantor_admin',
    x: 714,
    y: 456,
    w: 18,
    h: 42,
    defaultFill: '#bdd7ee',
    fontSize: 6.5,
    clickable: true
  },
  {
    id: 'gd-admin',
    label: 'GD',
    category: 'fasilitas_umum',
    x: 714,
    y: 498,
    w: 18,
    h: 30,
    defaultFill: '#bdd7ee',
    fontSize: 7.5,
    clickable: true
  },
  {
    id: 'km-admin',
    label: 'KM',
    category: 'fasilitas_umum',
    x: 714,
    y: 528,
    w: 18,
    h: 32,
    defaultFill: '#bdd7ee',
    fontSize: 7.5,
    clickable: true
  },
  {
    id: 'r-waka',
    label: 'R. WAKA',
    category: 'kantor_admin',
    x: 732,
    y: 456,
    w: 96,
    h: 48,
    defaultFill: '#9dc3e6',
    fontSize: 9.5,
    clickable: true,
    description: 'Ruang Wakil Kepala Sekolah'
  },
  {
    id: 'km-waka',
    label: 'KM',
    category: 'fasilitas_umum',
    x: 828,
    y: 456,
    w: 18,
    h: 26,
    defaultFill: '#9dc3e6',
    fontSize: 8,
    clickable: true
  },
  {
    id: 'r-kepsek',
    label: 'R. KEPSEK',
    category: 'kantor_admin',
    x: 732,
    y: 504,
    w: 96,
    h: 24,
    defaultFill: '#9dc3e6',
    fontSize: 9.5,
    clickable: true,
    description: 'Ruang Kepala Sekolah'
  },
  {
    id: 'kolam',
    label: 'kolam',
    category: 'taman_lapangan',
    x: 828,
    y: 504,
    w: 18,
    h: 24,
    defaultFill: '#92d050',
    fontSize: 6.5,
    clickable: true
  },
  {
    id: 'r-koordinasi',
    label: 'R. KOORDINASI',
    category: 'kantor_admin',
    x: 732,
    y: 528,
    w: 114,
    h: 28,
    defaultFill: '#9dc3e6',
    fontSize: 9,
    clickable: true,
    description: 'Ruang Koordinasi Pimpinan & Panitia'
  },

  // East Wing: Gazebo, Eco Green, Taman Timur, R. BK, R. TU, Dapur
  {
    id: 'gazebo',
    label: 'GAZEBO',
    category: 'fasilitas_umum',
    x: 902,
    y: 266,
    w: 96,
    h: 62,
    defaultFill: '#f4b183',
    fontSize: 10,
    clickable: true
  },
  {
    id: 'km-putra-timur',
    label: 'KM. PUTRA',
    category: 'fasilitas_umum',
    x: 998,
    y: 266,
    w: 36,
    h: 14,
    defaultFill: '#9dc3e6',
    fontSize: 5.8,
    clickable: true
  },
  {
    id: 'km-putri-timur',
    label: 'KM. PUTRI',
    category: 'fasilitas_umum',
    x: 998,
    y: 280,
    w: 36,
    h: 14,
    defaultFill: '#9dc3e6',
    fontSize: 5.8,
    clickable: true
  },
  {
    id: 'r-eco-green',
    label: 'R. ECO GREEN',
    category: 'taman_lapangan',
    x: 998,
    y: 294,
    w: 36,
    h: 34,
    defaultFill: '#92d050',
    fontSize: 7.5,
    clickable: true
  },
  {
    id: 'taman-timur',
    label: 'TAMAN',
    category: 'taman_lapangan',
    x: 902,
    y: 368,
    w: 150,
    h: 70,
    defaultFill: '#92d050',
    fontSize: 13,
    clickable: true
  },
  {
    id: 'r-bk-timur',
    label: 'R. BK',
    category: 'kantor_admin',
    x: 902,
    y: 456,
    w: 75,
    h: 49,
    defaultFill: '#9dc3e6',
    fontSize: 9.5,
    clickable: true,
    description: 'Ruang Bimbingan & Konseling (Timur)'
  },
  {
    id: 'r-tu-atas',
    label: 'R. TU',
    category: 'kantor_admin',
    x: 977,
    y: 456,
    w: 39,
    h: 49,
    defaultFill: '#ffd966',
    fontSize: 9.5,
    clickable: true,
    description: 'Ruang Tata Usaha & Kesekretariatan'
  },
  {
    id: 'r-tu-bawah',
    label: 'R. TU',
    category: 'kantor_admin',
    x: 902,
    y: 505,
    w: 75,
    h: 49,
    defaultFill: '#ffd966',
    fontSize: 9.5,
    clickable: true,
    description: 'Ruang Tata Usaha & Layanan Administrasi'
  },
  {
    id: 'gd-tu',
    label: 'GD',
    category: 'fasilitas_umum',
    x: 977,
    y: 505,
    w: 39,
    h: 49,
    defaultFill: '#9dc3e6',
    fontSize: 9.5,
    clickable: true
  },
  {
    id: 'km-tu',
    label: 'KM',
    category: 'fasilitas_umum',
    x: 1016,
    y: 505,
    w: 24,
    h: 49,
    defaultFill: '#9dc3e6',
    fontSize: 9,
    clickable: true
  },
  {
    id: 'dapur',
    label: 'DAPUR',
    category: 'fasilitas_umum',
    x: 1040,
    y: 505,
    w: 30,
    h: 49,
    defaultFill: '#9dc3e6',
    fontSize: 8,
    clickable: true
  },

  // Far-Right Science Labs & R-19..R-22 + Parkir Guru & Siswa
  {
    id: 'lab-fisika',
    label: 'LAB FISIKA',
    category: 'laboratorium',
    x: 1070,
    y: 266,
    w: 58,
    h: 96,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 11,
    clickable: true,
    description: 'Laboratorium Fisika'
  },
  {
    id: 'lab-biologi',
    label: 'LAB BIOLOGI',
    category: 'laboratorium',
    x: 1070,
    y: 362,
    w: 58,
    h: 96,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 11,
    clickable: true,
    description: 'Laboratorium Biologi'
  },
  {
    id: 'lab-kimia',
    label: 'LAB. KIMIA',
    category: 'laboratorium',
    x: 1070,
    y: 458,
    w: 58,
    h: 96,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 11,
    clickable: true,
    description: 'Laboratorium Kimia'
  },
  {
    id: 'r-19',
    label: 'R-19',
    category: 'ruang_ujian',
    examRoomNumber: 19,
    x: 1128,
    y: 266,
    w: 52,
    h: 64,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 13.5,
    clickable: true
  },
  {
    id: 'r-20',
    label: 'R-20',
    category: 'ruang_ujian',
    examRoomNumber: 20,
    x: 1128,
    y: 330,
    w: 52,
    h: 68,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 13.5,
    clickable: true
  },
  {
    id: 'r-21',
    label: 'R-21',
    category: 'ruang_ujian',
    examRoomNumber: 21,
    x: 1128,
    y: 398,
    w: 52,
    h: 70,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 13.5,
    clickable: true
  },
  {
    id: 'r-22',
    label: 'R-22',
    category: 'ruang_ujian',
    examRoomNumber: 22,
    x: 1128,
    y: 468,
    w: 52,
    h: 86,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 13.5,
    clickable: true
  },
  {
    id: 'parkir-guru',
    label: 'PARKIR GURU',
    category: 'parkir',
    x: 1070,
    y: 554,
    w: 66,
    h: 48,
    defaultFill: '#bdd7ee',
    fontSize: 8.5,
    clickable: true
  },
  {
    id: 'parkir-siswa',
    label: 'PARKIR SISWA',
    category: 'parkir',
    x: 1136,
    y: 554,
    w: 44,
    h: 74,
    rotateLabel: true,
    defaultFill: '#bdd7ee',
    fontSize: 8.5,
    clickable: true
  }
];

export interface ExamRoomOccupancyInfo {
  roomNumber: number;
  studentCount: number;
  rombels: string[];
  tingkatSet: Set<'X' | 'XI' | 'XII'>;
  proctors: string[];
}

export const extractRoomNumber = (raw?: string): number | null => {
  const s = (raw || '').trim();
  if (!s) return null;
  const match = s.match(/(\d{1,2})/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const detectTingkatFromKelas = (kelas?: string): 'X' | 'XI' | 'XII' | null => {
  const upper = (kelas || '').trim().toUpperCase();
  if (upper.startsWith('XII')) return 'XII';
  if (upper.startsWith('XI')) return 'XI';
  if (upper.startsWith('X')) return 'X';
  return null;
};

export const buildExamRoomOccupancyMap = (
  siswaList: Siswa[],
  panitiaList: PanitiaPengawasItem[] = []
): Record<number, ExamRoomOccupancyInfo> => {
  const map: Record<number, ExamRoomOccupancyInfo> = {};

  const ensureRoom = (num: number): ExamRoomOccupancyInfo => {
    if (!map[num]) {
      map[num] = {
        roomNumber: num,
        studentCount: 0,
        rombels: [],
        tingkatSet: new Set(),
        proctors: []
      };
    }
    return map[num];
  };

  siswaList.forEach(s => {
    const num = extractRoomNumber(s.ruangUjian);
    if (!num) return;
    const entry = ensureRoom(num);
    entry.studentCount += 1;
    const kelas = (s.rombelSaatIni || s.kelas || '').trim();
    if (kelas && !entry.rombels.includes(kelas)) {
      entry.rombels.push(kelas);
    }
    const tingkat = detectTingkatFromKelas(kelas);
    if (tingkat) entry.tingkatSet.add(tingkat);
  });

  panitiaList.forEach(p => {
    const num = extractRoomNumber(p.ruangTugas);
    if (!num) return;
    const entry = ensureRoom(num);
    if (p.nama && !entry.proctors.includes(p.nama)) {
      entry.proctors.push(p.nama);
    }
  });

  Object.values(map).forEach(info => {
    info.rombels.sort();
  });

  return map;
};
