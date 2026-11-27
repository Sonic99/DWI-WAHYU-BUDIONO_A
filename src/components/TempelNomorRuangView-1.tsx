import React, { useEffect, useMemo, useState } from 'react';
import {
  KartuUjianSettings,
  SchoolProfile,
  Siswa,
  TempelRuangColorPreset,
  TempelRuangConfigBundle,
  TempelRuangFontModel,
  TempelRuangFrameStyle,
  TempelRuangItem,
  TempelRuangKelompok,
  TempelRuangSettings,
  TempelRuangTingkat,
  User
} from '../types';
import { appendAuditLog } from '../services/storageService';
import {
  computeMatchedRoomDistribution,
  syncTempelRuangBundleWithKartuUjian
} from '../utils/examRoomSync';
import { PemprovJatimLogo, Sman9SurabayaLogoSvg } from './OfficialStamps';
import { ExamCardBarcode, resolveDirectImageUrl } from './ExamCardBarcode';
import { AturKelompokRuangSiswaModal } from './AturKelompokRuangSiswaModal';
import { PrintLineSpacing } from '../utils/printTypography';
import {
  Building2,
  Check,
  CheckSquare,
  DoorOpen,
  FileText,
  Layers,
  LayoutGrid,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Scissors,
  Search,
  Shuffle,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  Users,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface TempelNomorRuangViewProps {
  profile: SchoolProfile;
  currentUser: User;
  siswaList: Siswa[];
  ujianSettings: KartuUjianSettings;
  bundle: TempelRuangConfigBundle;
  onUpdateBundle: (next: TempelRuangConfigBundle) => void;
  onUpdateSiswa?: (list: Siswa[]) => void;
  onUpdateUjianSettings?: (settings: KartuUjianSettings) => void;
}

interface SignageFontMeta {
  id: TempelRuangFontModel;
  label: string;
  category: 'Signage Tegas' | 'Display Blok' | 'Modern Sans' | 'Serif Resmi' | 'Teknis CBT';
  desc: string;
  fontFamily: string;
  weight: number;
  letterSpacingDefault: string;
  sampleNum: string;
}

const SIGNAGE_FONT_GALLERY: SignageFontMeta[] = [
  {
    id: 'outfit_tegas',
    label: 'Outfit Tegas',
    category: 'Signage Tegas',
    desc: 'Geometris tebal & super jelas dari koridor',
    fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    weight: 800,
    letterSpacingDefault: '0.02em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'barlow_signage',
    label: 'Barlow Condensed',
    category: 'Signage Tegas',
    desc: 'Standar papan petunjuk ruang modern',
    fontFamily: "'Barlow Condensed', 'Outfit', sans-serif",
    weight: 800,
    letterSpacingDefault: '0.04em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'oswald_poster',
    label: 'Oswald Poster',
    category: 'Signage Tegas',
    desc: 'Tinggi kokoh, hemat lebar untuk nomor besar',
    fontFamily: "'Oswald', 'Barlow Condensed', sans-serif",
    weight: 700,
    letterSpacingDefault: '0.04em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'bebas_blok',
    label: 'Bebas Neue Blok',
    category: 'Display Blok',
    desc: 'Huruf blok poster berdaya baca maksimal',
    fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
    weight: 700,
    letterSpacingDefault: '0.06em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'bricolage_karakter',
    label: 'Bricolage Grotesque',
    category: 'Display Blok',
    desc: 'Karakter editorial segar & ekspresif',
    fontFamily: "'Bricolage Grotesque', 'Plus Jakarta Sans', sans-serif",
    weight: 800,
    letterSpacingDefault: '-0.01em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'jakarta_resmi',
    label: 'Plus Jakarta Sans',
    category: 'Modern Sans',
    desc: 'Bersih, rapi, selaras dokumen kedinasan',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    weight: 800,
    letterSpacingDefault: '0.01em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'poppins_jelas',
    label: 'Poppins Bulat',
    category: 'Modern Sans',
    desc: 'Proporsi terbuka & ramah dipandang',
    fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif",
    weight: 800,
    letterSpacingDefault: '0.02em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'jetbrains_cbt',
    label: 'JetBrains Mono CBT',
    category: 'Teknis CBT',
    desc: 'Angka tabular presisi untuk Labkom & CBT',
    fontFamily: "'JetBrains Mono', monospace",
    weight: 800,
    letterSpacingDefault: '-0.01em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'playfair_klasik',
    label: 'Playfair Display',
    category: 'Serif Resmi',
    desc: 'Serif klasik tegas & elegan',
    fontFamily: "'Playfair Display', Georgia, serif",
    weight: 800,
    letterSpacingDefault: '0.02em',
    sampleNum: 'RUANG 01'
  },
  {
    id: 'cinzel_piagam',
    label: 'Cinzel Piagam',
    category: 'Serif Resmi',
    desc: 'Gaya ukiran resmi berwibawa',
    fontFamily: "'Cinzel', Georgia, serif",
    weight: 800,
    letterSpacingDefault: '0.06em',
    sampleNum: 'RUANG 01'
  }
];

const BODY_FONT_OPTIONS: {
  id: TempelRuangSettings['fontBodyModel'];
  label: string;
  fontFamily: string;
}[] = [
  { id: 'jakarta', label: 'Plus Jakarta Sans', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { id: 'manrope', label: 'Manrope', fontFamily: "'Manrope', 'Plus Jakarta Sans', sans-serif" },
  { id: 'poppins', label: 'Poppins', fontFamily: "'Poppins', 'Plus Jakarta Sans', sans-serif" },
  { id: 'jetbrains', label: 'JetBrains Mono', fontFamily: "'JetBrains Mono', monospace" }
];

const COLOR_SCHEMES: Record<
  Exclude<TempelRuangColorPreset, 'otomatis_tingkat'>,
  {
    label: string;
    primaryHex: string;
    headerBgHex: string;
    headerTextHex: string;
    softBgHex: string;
    borderHex: string;
    accentTextHex: string;
  }
> = {
  biru_resmi: {
    label: 'Biru Resmi (Tingkat X)',
    primaryHex: '#1e3a8a',
    headerBgHex: '#0f172a',
    headerTextHex: '#ffffff',
    softBgHex: '#eff6ff',
    borderHex: '#1d4ed8',
    accentTextHex: '#1e40af'
  },
  zamrud_hijau: {
    label: 'Zamrud (Tingkat XI)',
    primaryHex: '#065f46',
    headerBgHex: '#064e3b',
    headerTextHex: '#ffffff',
    softBgHex: '#ecfdf5',
    borderHex: '#059669',
    accentTextHex: '#047857'
  },
  amber_emas: {
    label: 'Amber Emas (Tingkat XII)',
    primaryHex: '#92400e',
    headerBgHex: '#78350f',
    headerTextHex: '#ffffff',
    softBgHex: '#fffbeb',
    borderHex: '#d97706',
    accentTextHex: '#b45309'
  },
  marun_tegas: {
    label: 'Merah Marun Tegas',
    primaryHex: '#881337',
    headerBgHex: '#7f1d1d',
    headerTextHex: '#ffffff',
    softBgHex: '#fff1f2',
    borderHex: '#be123c',
    accentTextHex: '#9f1239'
  },
  slate_gelap: {
    label: 'Arang Slate Modern',
    primaryHex: '#0f172a',
    headerBgHex: '#0f172a',
    headerTextHex: '#ffffff',
    softBgHex: '#f8fafc',
    borderHex: '#334155',
    accentTextHex: '#0f172a'
  },
  monokrom_hemat: {
    label: 'Hitam Putih (Hemat Tinta)',
    primaryHex: '#000000',
    headerBgHex: '#ffffff',
    headerTextHex: '#000000',
    softBgHex: '#ffffff',
    borderHex: '#000000',
    accentTextHex: '#000000'
  }
};

const PAPER_DIMS = {
  A4: { widthMm: 210, heightMm: 297, label: 'A4 (210 × 297 mm)' },
  F4: { widthMm: 215, heightMm: 330, label: 'Folio / F4 (215 × 330 mm)' }
};

const resolvePaletteForTingkat = (
  preset: TempelRuangColorPreset,
  tingkat: TempelRuangTingkat,
  kelompokBadge?: TempelRuangKelompok['warnaBadge']
) => {
  if (preset !== 'otomatis_tingkat') {
    return COLOR_SCHEMES[preset];
  }
  if (kelompokBadge === 'emerald' || tingkat === 'XI') return COLOR_SCHEMES.zamrud_hijau;
  if (kelompokBadge === 'amber' || tingkat === 'XII') return COLOR_SCHEMES.amber_emas;
  if (kelompokBadge === 'rose') return COLOR_SCHEMES.marun_tegas;
  if (kelompokBadge === 'slate' || tingkat === 'Gabungan') return COLOR_SCHEMES.slate_gelap;
  return COLOR_SCHEMES.biru_resmi;
};

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const TempelNomorRuangView: React.FC<TempelNomorRuangViewProps> = ({
  profile,
  currentUser,
  siswaList,
  ujianSettings,
  bundle,
  onUpdateBundle,
  onUpdateSiswa,
  onUpdateUjianSettings
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ruang' | 'font_desain' | 'cetak'>('ruang');
  const [tingkatFilter, setTingkatFilter] = useState<'SEMUA' | TempelRuangTingkat>('SEMUA');
  const [kelompokFilter, setKelompokFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [fontCategoryFilter, setFontCategoryFilter] = useState<
    'ALL' | SignageFontMeta['category']
  >('ALL');
  const [previewZoom, setPreviewZoom] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 0.45 : 0.72
  );
  const [spasiBaris, setSpasiBaris] = useState<PrintLineSpacing>(() => {
    try {
      const saved = localStorage.getItem('sman9_tempel_ruang_spasi_v1');
      if (saved === 'padat' || saved === 'nyaman' || saved === 'lega') return saved;
    } catch {
      // ignore
    }
    return 'nyaman';
  });
  const handleChangeSpasiBaris = (next: PrintLineSpacing) => {
    setSpasiBaris(next);
    try {
      localStorage.setItem('sman9_tempel_ruang_spasi_v1', next);
    } catch {
      // ignore
    }
  };
  const [statusToast, setStatusToast] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  // Quick Range Generator State
  const [rangeKelompokId, setRangeKelompokId] = useState<string>(
    bundle.kelompokList[0]?.id || 'kel-x'
  );
  const [rangePrefix, setRangePrefix] = useState<string>('RUANG ');
  const [rangeKodePrefix, setRangeKodePrefix] = useState<string>(
    ujianSettings.defaultRuangPrefix || 'R.'
  );
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(6);
  const [rangeKapasitas, setRangeKapasitas] = useState<number>(
    ujianSettings.kapasitasPerRuang || 20
  );
  const [rangeSesi, setRangeSesi] = useState<string>(
    ujianSettings.sesiTersedia?.[0] || 'Sesi 1 (07.30 - 09.30)'
  );
  const [rangeModeReplace, setRangeModeReplace] = useState<boolean>(false);

  // New Kelompok Form State
  const [newKelompokNama, setNewKelompokNama] = useState('');
  const [newKelompokTingkat, setNewKelompokTingkat] = useState<TempelRuangTingkat>('X');
  const [newKelompokLokasi, setNewKelompokLokasi] = useState('');
  const [isRoomGroupModalOpen, setIsRoomGroupModalOpen] = useState(false);
  const [roomGroupInitialRoom, setRoomGroupInitialRoom] = useState<string | undefined>(undefined);

  const { settings, kelompokList, ruangList } = bundle;

  const showToast = (type: 'success' | 'info' | 'warning', text: string) => {
    setStatusToast({ type, text });
    window.setTimeout(() => {
      setStatusToast(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const updateSettings = (patch: Partial<TempelRuangSettings>) => {
    onUpdateBundle({
      ...bundle,
      settings: {
        ...settings,
        ...patch
      },
      updatedAt: new Date().toISOString()
    });
  };

  const updateKelompokList = (next: TempelRuangKelompok[]) => {
    onUpdateBundle({
      ...bundle,
      kelompokList: next,
      updatedAt: new Date().toISOString()
    });
  };

  const updateRuangList = (next: TempelRuangItem[]) => {
    onUpdateBundle({
      ...bundle,
      ruangList: next,
      updatedAt: new Date().toISOString()
    });
  };

  const kelompokMap = useMemo(() => {
    const map = new Map<string, TempelRuangKelompok>();
    kelompokList.forEach(k => map.set(k.id, k));
    return map;
  }, [kelompokList]);

  const sortedKelompokList = useMemo(
    () => [...kelompokList].sort((a, b) => a.urutan - b.urutan),
    [kelompokList]
  );

  // Filtered rooms for management and printing
  const filteredRuangList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ruangList.filter(item => {
      if (tingkatFilter !== 'SEMUA' && item.tingkatKelas !== tingkatFilter) return false;
      if (kelompokFilter !== 'ALL' && item.kelompokId !== kelompokFilter) return false;
      if (q) {
        const kel = kelompokMap.get(item.kelompokId);
        const hay = `${item.nomorRuang} ${item.labelUtama || ''} ${item.kelasRombel || ''} ${item.lokasiGedung || ''} ${item.rentangNomorPeserta || ''} ${kel?.namaKelompok || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ruangList, tingkatFilter, kelompokFilter, searchQuery, kelompokMap]);

  const selectedPrintRooms = useMemo(() => {
    const checked = filteredRuangList.filter(r => r.dipilihCetak !== false);
    return checked;
  }, [filteredRuangList]);

  const activeFontMeta = useMemo(
    () => SIGNAGE_FONT_GALLERY.find(f => f.id === settings.fontModel) || SIGNAGE_FONT_GALLERY[0],
    [settings.fontModel]
  );

  const activeBodyFontMeta = useMemo(
    () => BODY_FONT_OPTIONS.find(f => f.id === settings.fontBodyModel) || BODY_FONT_OPTIONS[0],
    [settings.fontBodyModel]
  );

  const visibleFontGallery = useMemo(
    () =>
      fontCategoryFilter === 'ALL'
        ? SIGNAGE_FONT_GALLERY
        : SIGNAGE_FONT_GALLERY.filter(f => f.category === fontCategoryFilter),
    [fontCategoryFilter]
  );

  // Summary counts by Tingkat
  const tingkatStats = useMemo(() => {
    const counts: Record<TempelRuangTingkat, { rooms: number; students: number }> = {
      X: { rooms: 0, students: 0 },
      XI: { rooms: 0, students: 0 },
      XII: { rooms: 0, students: 0 },
      Gabungan: { rooms: 0, students: 0 }
    };
    ruangList.forEach(r => {
      const bucket = counts[r.tingkatKelas] || counts.Gabungan;
      bucket.rooms += 1;
      bucket.students += Number(r.jumlahPeserta || 0);
    });
    return counts;
  }, [ruangList]);

  const matchedDist = useMemo(
    () => computeMatchedRoomDistribution(siswaList, ujianSettings),
    [siswaList, ujianSettings]
  );

  // Auto-keep room labels matched with Kartu Peserta Ulangan whenever ikutiSettingKartuUjian is active
  const autoFollowKartuUjian = settings.ikutiSettingKartuUjian !== false;
  useEffect(() => {
    if (!autoFollowKartuUjian || matchedDist.rooms.length === 0) return;
    const synced = syncTempelRuangBundleWithKartuUjian(bundle, siswaList, ujianSettings);
    const sameSignature =
      synced.ruangList.length === bundle.ruangList.length &&
      synced.ruangList.every((r, idx) => {
        const cur = bundle.ruangList[idx];
        return (
          cur &&
          cur.nomorRuang === r.nomorRuang &&
          cur.jumlahPeserta === r.jumlahPeserta &&
          cur.kelasRombel === r.kelasRombel &&
          cur.rentangNomorPeserta === r.rentangNomorPeserta &&
          cur.sesiUjian === r.sesiUjian
        );
      }) &&
      synced.settings.subjudulUjian === bundle.settings.subjudulUjian;
    if (!sameSignature) {
      onUpdateBundle(synced);
    }
  }, [
    autoFollowKartuUjian,
    matchedDist,
    siswaList,
    ujianSettings
  ]);

  // Handlers
  const handleSyncFromSiswa = (forceProject = false) => {
    const synced = syncTempelRuangBundleWithKartuUjian(bundle, siswaList, ujianSettings, {
      forceProjectFromSettings: forceProject
    });
    synced.settings.ikutiSettingKartuUjian = true;
    onUpdateBundle(synced);
    appendAuditLog(
      'SINKRON_TEMPEL_RUANG',
      `${currentUser.name} menyinkronkan ${synced.ruangList.length} ruang ujian agar cocok dengan setting Kartu Peserta Ulangan (${ujianSettings.kapasitasPerRuang} anak/ruang, pola ${ujianSettings.modePembagianRuang || 'sequential'}).`
    );
    showToast(
      'success',
      `Berhasil mencocokkan ${synced.ruangList.length} nomor ruang dengan Kartu Peserta Ulangan (${matchedDist.totalActiveStudents} peserta).`
    );
  };

  const handleCommitProjectionToSiswa = () => {
    if (!onUpdateSiswa) return;
    const projected = computeMatchedRoomDistribution(siswaList, ujianSettings, {
      forceProjectFromSettings: true
    });
    const nextSiswa = siswaList.map(s => {
      const m = projected.studentMap.get(s.id);
      return m
        ? {
            ...s,
            nomorUjian: m.nomorUjian,
            ruangUjian: m.ruangUjian,
            sesiUjian: m.sesiUjian
          }
        : s;
    });
    onUpdateSiswa(nextSiswa);
    const synced = syncTempelRuangBundleWithKartuUjian(bundle, nextSiswa, ujianSettings);
    onUpdateBundle({ ...synced, settings: { ...synced.settings, ikutiSettingKartuUjian: true } });
    appendAuditLog(
      'TERAPKAN_RUANG_KE_SISWA',
      `${currentUser.name} menerapkan pembagian ${projected.rooms.length} ruang (${ujianSettings.kapasitasPerRuang} anak/ruang) ke Master Data Siswa agar Kartu Ujian, Tempel Ruang, dan Daftar Hadir sama persis.`
    );
    showToast(
      'success',
      `Pembagian ${projected.rooms.length} ruang & nomor peserta resmi disimpan ke Master Siswa (Kartu Ujian & Daftar Hadir ikut terbarui).`
    );
  };

  const handleAddKelompok = () => {
    const cleanName = newKelompokNama.trim();
    if (!cleanName) {
      showToast('warning', 'Masukkan nama kelompok ruang terlebih dahulu.');
      return;
    }
    const badgeByTingkat: Record<TempelRuangTingkat, TempelRuangKelompok['warnaBadge']> = {
      X: 'blue',
      XI: 'emerald',
      XII: 'amber',
      Gabungan: 'slate'
    };
    const nextItem: TempelRuangKelompok = {
      id: `kel-${Date.now().toString(36)}`,
      namaKelompok: cleanName,
      tingkatKelas: newKelompokTingkat,
      gedungLokasi: newKelompokLokasi.trim() || 'Gedung Utama',
      warnaBadge: badgeByTingkat[newKelompokTingkat],
      urutan: kelompokList.length + 1
    };
    updateKelompokList([...kelompokList, nextItem]);
    setRangeKelompokId(nextItem.id);
    setNewKelompokNama('');
    setNewKelompokLokasi('');
    showToast('success', `Kelompok "${cleanName}" (Tingkat ${newKelompokTingkat}) ditambahkan.`);
  };

  const handleDeleteKelompok = (kelId: string) => {
    if (kelompokList.length <= 1) {
      showToast('warning', 'Minimal harus ada 1 kelompok ruang ujian.');
      return;
    }
    const fallbackKel = kelompokList.find(k => k.id !== kelId)!;
    const nextKel = kelompokList.filter(k => k.id !== kelId);
    const nextRooms = ruangList.map(r =>
      r.kelompokId === kelId
        ? { ...r, kelompokId: fallbackKel.id, tingkatKelas: fallbackKel.tingkatKelas }
        : r
    );
    onUpdateBundle({
      ...bundle,
      kelompokList: nextKel,
      ruangList: nextRooms,
      updatedAt: new Date().toISOString()
    });
    if (kelompokFilter === kelId) setKelompokFilter('ALL');
    showToast('info', 'Kelompok ruang dihapus dan ruang di dalamnya dipindahkan ke kelompok lain.');
  };

  const handleUpdateKelompokField = (
    kelId: string,
    patch: Partial<TempelRuangKelompok>
  ) => {
    const nextKel = kelompokList.map(k => (k.id === kelId ? { ...k, ...patch } : k));
    let nextRooms = ruangList;
    if (patch.tingkatKelas) {
      nextRooms = ruangList.map(r =>
        r.kelompokId === kelId ? { ...r, tingkatKelas: patch.tingkatKelas! } : r
      );
    }
    onUpdateBundle({
      ...bundle,
      kelompokList: nextKel,
      ruangList: nextRooms,
      updatedAt: new Date().toISOString()
    });
  };

  const handleGenerateRangeRooms = () => {
    const start = Math.max(1, Math.min(999, Math.floor(rangeStart || 1)));
    const end = Math.max(start, Math.min(999, Math.floor(rangeEnd || start)));
    const targetKel = kelompokMap.get(rangeKelompokId) || sortedKelompokList[0];
    if (!targetKel) return;

    const generated: TempelRuangItem[] = [];
    for (let n = start; n <= end; n++) {
      const padded = String(n).padStart(2, '0');
      generated.push({
        id: `tr-gen-${Date.now()}-${n}`,
        nomorRuang: `${rangeKodePrefix}${padded}`,
        labelUtama: `${rangePrefix}${padded}`,
        kelompokId: targetKel.id,
        tingkatKelas: targetKel.tingkatKelas,
        kelasRombel: `Kelas ${targetKel.tingkatKelas}`,
        jumlahPeserta: Math.max(1, rangeKapasitas || 20),
        rentangNomorPeserta: '',
        sesiUjian: rangeSesi,
        lokasiGedung: targetKel.gedungLokasi || 'Gedung Utama',
        dipilihCetak: true
      });
    }

    const baseRooms = rangeModeReplace
      ? ruangList.filter(r => r.kelompokId !== targetKel.id)
      : ruangList;
    updateRuangList([...baseRooms, ...generated]);
    showToast(
      'success',
      `Menambahkan ${generated.length} nomor ruang (${generated[0].labelUtama} s.d. ${generated[generated.length - 1].labelUtama}) ke ${targetKel.namaKelompok}.`
    );
  };

  const handleAddSingleRoom = (kelompokId: string) => {
    const kel = kelompokMap.get(kelompokId) || sortedKelompokList[0];
    if (!kel) return;
    const nextNum = ruangList.length + 1;
    const padded = String(nextNum).padStart(2, '0');
    const newItem: TempelRuangItem = {
      id: `tr-item-${Date.now()}`,
      nomorRuang: `${ujianSettings.defaultRuangPrefix || 'R.'}${padded}`,
      labelUtama: `RUANG ${padded}`,
      kelompokId: kel.id,
      tingkatKelas: kel.tingkatKelas,
      kelasRombel: `Kelas ${kel.tingkatKelas}`,
      jumlahPeserta: ujianSettings.kapasitasPerRuang || 20,
      rentangNomorPeserta: '',
      sesiUjian: ujianSettings.sesiTersedia?.[0] || 'Sesi 1',
      lokasiGedung: kel.gedungLokasi || 'Gedung Utama',
      dipilihCetak: true
    };
    updateRuangList([...ruangList, newItem]);
  };

  const handleUpdateRoom = (id: string, patch: Partial<TempelRuangItem>) => {
    updateRuangList(
      ruangList.map(r => {
        if (r.id !== id) return r;
        const nextKel = patch.kelompokId ? kelompokMap.get(patch.kelompokId) : undefined;
        return {
          ...r,
          ...patch,
          tingkatKelas: nextKel ? nextKel.tingkatKelas : patch.tingkatKelas ?? r.tingkatKelas
        };
      })
    );
  };

  const handleDeleteRoom = (id: string) => {
    updateRuangList(ruangList.filter(r => r.id !== id));
  };

  const handleToggleAllFiltered = (checked: boolean) => {
    const filteredIds = new Set(filteredRuangList.map(r => r.id));
    updateRuangList(
      ruangList.map(r => (filteredIds.has(r.id) ? { ...r, dipilihCetak: checked } : r))
    );
  };

  const handleRandomFontAndStyle = () => {
    const others = SIGNAGE_FONT_GALLERY.filter(f => f.id !== settings.fontModel);
    const picked = others[Math.floor(Math.random() * others.length)] || SIGNAGE_FONT_GALLERY[0];
    const frames: TempelRuangFrameStyle[] = [
      'blok_angka',
      'header_modern',
      'klasik_ganda',
      'minimal_tegas'
    ];
    const pickedFrame = frames[Math.floor(Math.random() * frames.length)];
    updateSettings({
      fontModel: picked.id,
      desainBingkai: pickedFrame
    });
    showToast('info', `Model font diubah ke "${picked.label}" (${picked.category}).`);
  };

  // Print Geometry Computation (A4 / F4, Portrait / Landscape, 1 / 2 / 4 per page)
  const geometry = useMemo(() => {
    const basePaper = PAPER_DIMS[settings.paperSize] || PAPER_DIMS.F4;
    const isLandscape = settings.orientasi === 'landscape';
    const widthMm = isLandscape ? basePaper.heightMm : basePaper.widthMm;
    const heightMm = isLandscape ? basePaper.widthMm : basePaper.heightMm;
    const marginMm = settings.marginMm ?? 10;
    const gapMm = settings.gapMm ?? 6;
    const printableW = widthMm - marginMm * 2;
    const printableH = heightMm - marginMm * 2;

    let cols = 1;
    let rows = 1;
    if (settings.labelPerPage === 2) {
      if (isLandscape) {
        cols = 2;
        rows = 1;
      } else {
        cols = 1;
        rows = 2;
      }
    } else if (settings.labelPerPage === 4) {
      cols = 2;
      rows = 2;
    }

    const cellW = (printableW - gapMm * (cols - 1)) / cols;
    const cellH = (printableH - gapMm * (rows - 1)) / rows;

    return {
      widthMm,
      heightMm,
      marginMm,
      gapMm,
      printableW,
      printableH,
      cols,
      rows,
      perPage: cols * rows,
      cellW,
      cellH
    };
  }, [settings.paperSize, settings.orientasi, settings.labelPerPage, settings.marginMm, settings.gapMm]);

  // Pages for Print Preview
  const printPages = useMemo(() => {
    const rooms = selectedPrintRooms;
    if (rooms.length === 0) return [] as { groupLabel: string; items: TempelRuangItem[] }[];

    if (settings.pisahHalamanPerKelompok) {
      const grouped = new Map<string, { label: string; items: TempelRuangItem[] }>();
      sortedKelompokList.forEach(k => {
        grouped.set(k.id, { label: `${k.namaKelompok} (Tingkat ${k.tingkatKelas})`, items: [] });
      });
      rooms.forEach(r => {
        const entry = grouped.get(r.kelompokId);
        if (entry) {
          entry.items.push(r);
        } else {
          if (!grouped.has('__other')) {
            grouped.set('__other', { label: 'Ruang Lainnya', items: [] });
          }
          grouped.get('__other')!.items.push(r);
        }
      });

      const pages: { groupLabel: string; items: TempelRuangItem[] }[] = [];
      grouped.forEach(g => {
        if (g.items.length === 0) return;
        chunkArray(g.items, geometry.perPage).forEach(chunk => {
          pages.push({ groupLabel: g.label, items: chunk });
        });
      });
      return pages;
    }

    return chunkArray(rooms, geometry.perPage).map(chunk => ({
      groupLabel:
        tingkatFilter === 'SEMUA'
          ? 'Semua Kelompok Tingkat'
          : `Tingkat Kelas ${tingkatFilter}`,
      items: chunk
    }));
  }, [
    selectedPrintRooms,
    settings.pisahHalamanPerKelompok,
    sortedKelompokList,
    geometry.perPage,
    tingkatFilter
  ]);

  const handlePrint = () => {
    if (selectedPrintRooms.length === 0) {
      showToast('warning', 'Centang minimal 1 ruang ujian untuk dicetak.');
      return;
    }
    appendAuditLog(
      'CETAK_TEMPEL_RUANG',
      `Mencetak ${selectedPrintRooms.length} lembar tempel nomor ruang ujian (${settings.paperSize} ${settings.orientasi}, ${settings.labelPerPage}/halaman, font ${activeFontMeta.label}).`
    );
    window.print();
  };

  // Single Room Signage Card Renderer (used in both Live Font Preview & Print Pages)
  const renderSignageCard = (
    item: TempelRuangItem,
    options?: {
      isCompactPreview?: boolean;
      overrideWidthMm?: number;
      overrideHeightMm?: number;
    }
  ) => {
    const kel = kelompokMap.get(item.kelompokId);
    const palette = resolvePaletteForTingkat(
      settings.warnaPreset,
      item.tingkatKelas,
      kel?.warnaBadge
    );
    const isPerPage1 = !options?.isCompactPreview && settings.labelPerPage === 1;
    const isPerPage4 = !options?.isCompactPreview && settings.labelPerPage === 4;

    const angkaScale = (settings.skalaAngkaPct || 100) / 100;
    const teksScale = (settings.skalaTeksPct || 100) / 100;
    const spacingFactor = spasiBaris === 'padat' ? 0.78 : spasiBaris === 'lega' ? 1.28 : 1;
    const cardLineHeight = spasiBaris === 'padat' ? 1.22 : spasiBaris === 'lega' ? 1.56 : 1.38;
    const spacingCss =
      settings.spasiHuruf === 'rapat'
        ? '-0.02em'
        : settings.spasiHuruf === 'lebar'
        ? '0.09em'
        : activeFontMeta.letterSpacingDefault;

    const rawMainLabel = (item.labelUtama || item.nomorRuang || 'RUANG 01').trim();
    const displayMainLabel = settings.kapitalJudul ? rawMainLabel.toUpperCase() : rawMainLabel;

    // Extract large numeric/short suffix if frame style uses "blok_angka"
    const numMatch = rawMainLabel.match(/^(.*?)\s*(\d+[A-Z]?)$/i);
    const roomPrefixWord = numMatch && numMatch[1].trim() ? numMatch[1].trim() : settings.judulAtas || 'RUANG UJIAN';
    const roomBigDigits = numMatch ? numMatch[2].trim() : rawMainLabel;

    const mainNumPx = (isPerPage1 ? 96 : isPerPage4 ? 46 : 68) * angkaScale;
    const mainHeadlinePx = (isPerPage1 ? 76 : isPerPage4 ? 36 : 52) * angkaScale;
    const subTitlePx = (isPerPage1 ? 18 : isPerPage4 ? 10 : 13) * teksScale;
    const metaTextPx = (isPerPage1 ? 15 : isPerPage4 ? 9.5 : 11.5) * teksScale;

    const cutBorderStyle =
      options?.isCompactPreview || settings.garisPotong === 'none'
        ? 'none'
        : settings.garisPotong === 'dashed_gunting'
        ? '1px dashed #94a3b8'
        : '1px solid #cbd5e1';

    const frameBorderCss =
      settings.desainBingkai === 'klasik_ganda'
        ? `3px double ${palette.borderHex}`
        : settings.desainBingkai === 'minimal_tegas'
        ? `2.5px solid ${palette.borderHex}`
        : `2px solid ${palette.borderHex}`;

    const isMonokrom = settings.warnaPreset === 'monokrom_hemat';

    const cardStyle: React.CSSProperties = {
      fontFamily: activeBodyFontMeta.fontFamily,
      border: frameBorderCss,
      backgroundColor: '#ffffff',
      width: options?.overrideWidthMm ? `${options.overrideWidthMm}mm` : '100%',
      height: options?.overrideHeightMm ? `${options.overrideHeightMm}mm` : '100%',
      boxSizing: 'border-box'
    };

    const tingkatBadgeText =
      item.tingkatKelas === 'Gabungan'
        ? 'LINTAS TINGKAT'
        : `TINGKAT KELAS ${item.tingkatKelas}`;

    return (
      <div
        className="relative flex flex-col justify-between overflow-hidden rounded-sm print-card-avoid"
        style={{
          outline: options?.isCompactPreview ? undefined : cutBorderStyle,
          outlineOffset: options?.isCompactPreview ? undefined : '1.5mm',
          ...cardStyle
        }}
      >
        {/* Cut scissor indicator */}
        {!options?.isCompactPreview && settings.garisPotong === 'dashed_gunting' && (
          <div
            className="absolute -top-0.5 right-1.5 text-[8px] text-slate-400 pointer-events-none select-none"
            aria-hidden="true"
          >
            ✂
          </div>
        )}

        {/* Inner Double Line Ornament for Klasik Ganda */}
        {settings.desainBingkai === 'klasik_ganda' && (
          <div
            className="absolute inset-1.5 pointer-events-none rounded-[1px]"
            style={{ border: `1px solid ${palette.borderHex}55` }}
            aria-hidden="true"
          />
        )}

        {/* Top Header Banner */}
        <div
          className={`relative z-10 flex items-center justify-between gap-2 border-b ${
            isPerPage1 ? 'px-6' : isPerPage4 ? 'px-3' : 'px-4'
          }`}
          style={{
            paddingTop: `${((isPerPage1 ? 14 : isPerPage4 ? 7 : 10) * spacingFactor).toFixed(1)}px`,
            paddingBottom: `${((isPerPage1 ? 14 : isPerPage4 ? 7 : 10) * spacingFactor).toFixed(1)}px`,
            backgroundColor:
              settings.desainBingkai === 'minimal_tegas'
                ? '#ffffff'
                : palette.headerBgHex,
            color:
              settings.desainBingkai === 'minimal_tegas'
                ? '#0f172a'
                : palette.headerTextHex,
            borderBottomColor: palette.borderHex
          }}
        >
          {settings.tampilkanKopMini ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`shrink-0 rounded bg-white p-0.5 flex items-center justify-center ${
                  isPerPage1 ? 'w-12 h-12' : isPerPage4 ? 'w-7 h-7' : 'w-9 h-9'
                }`}
              >
                {profile.logoType === 'custom' && profile.logoUrl ? (
                  <img
                    src={resolveDirectImageUrl(profile.logoUrl)}
                    alt={profile.namaSekolah}
                    className="w-full h-full object-contain"
                  />
                ) : profile.logoType === 'default' || profile.logoType === 'default_vector' ? (
                  <Sman9SurabayaLogoSvg customUrl={profile.sekolahLogoUrl} className="w-full h-full" />
                ) : (
                  <PemprovJatimLogo customUrl={profile.pemprovLogoUrl} className="w-full h-full" />
                )}
              </div>
              <div className="min-w-0 leading-tight">
                <div
                  className="font-bold uppercase tracking-wide truncate"
                  style={{ fontSize: `${(isPerPage1 ? 13 : isPerPage4 ? 8 : 9.5) * teksScale}px` }}
                >
                  {profile.namaSekolah}
                </div>
                <div
                  className="font-semibold truncate opacity-90"
                  style={{ fontSize: `${(isPerPage1 ? 11.5 : isPerPage4 ? 7.2 : 8.5) * teksScale}px` }}
                >
                  {settings.subjudulUjian}
                </div>
                <div
                  className="opacity-75 truncate"
                  style={{ fontSize: `${(isPerPage1 ? 10 : isPerPage4 ? 6.5 : 7.5) * teksScale}px` }}
                >
                  {settings.semester} • {settings.tahunPelajaran}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="font-bold uppercase tracking-wider truncate"
              style={{ fontSize: `${subTitlePx}px` }}
            >
              {settings.subjudulUjian}
            </div>
          )}

          {settings.tampilkanKelompokBadge && (
            <div
              className={`shrink-0 text-right font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${
                isPerPage4 ? 'text-[7.5px]' : isPerPage1 ? 'text-xs px-3 py-1.5' : 'text-[9.5px]'
              }`}
              style={{
                backgroundColor:
                  isMonokrom || settings.desainBingkai === 'minimal_tegas'
                    ? palette.softBgHex
                    : 'rgba(255,255,255,0.16)',
                color:
                  isMonokrom || settings.desainBingkai === 'minimal_tegas'
                    ? palette.primaryHex
                    : '#ffffff',
                border:
                  isMonokrom || settings.desainBingkai === 'minimal_tegas'
                    ? `1.5px solid ${palette.borderHex}`
                    : '1px solid rgba(255,255,255,0.35)'
              }}
            >
              <div>{tingkatBadgeText}</div>
              {kel?.namaKelompok && !isPerPage4 && (
                <div className="text-[8px] font-semibold opacity-90 truncate max-w-[150px]">
                  {kel.namaKelompok}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center Hero: Giant Room Number Display */}
        <div
          className={`relative z-10 flex-1 flex flex-col items-center justify-center text-center ${
            isPerPage1 ? 'px-8' : isPerPage4 ? 'px-3' : 'px-5'
          }`}
          style={{
            paddingTop: `${((isPerPage1 ? 20 : isPerPage4 ? 8 : 12) * spacingFactor).toFixed(1)}px`,
            paddingBottom: `${((isPerPage1 ? 20 : isPerPage4 ? 8 : 12) * spacingFactor).toFixed(1)}px`,
            rowGap: `${((isPerPage1 ? 11 : isPerPage4 ? 4 : 6) * spacingFactor).toFixed(1)}px`,
            background:
              isMonokrom || settings.desainBingkai === 'minimal_tegas'
                ? '#ffffff'
                : `linear-gradient(180deg, ${palette.softBgHex} 0%, #ffffff 65%)`
          }}
        >
          {settings.desainBingkai === 'blok_angka' && numMatch ? (
            <>
              <div
                className="font-bold tracking-[0.22em] uppercase"
                style={{
                  color: palette.accentTextHex,
                  fontSize: `${(isPerPage1 ? 20 : isPerPage4 ? 10 : 14) * teksScale}px`,
                  fontFamily: activeFontMeta.fontFamily
                }}
              >
                {settings.kapitalJudul ? roomPrefixWord.toUpperCase() : roomPrefixWord}
              </div>
              <div
                className="leading-none tabular-nums select-none px-6 py-2 rounded-lg"
                style={{
                  fontFamily: activeFontMeta.fontFamily,
                  fontWeight: activeFontMeta.weight,
                  letterSpacing: spacingCss,
                  fontSize: `${mainNumPx}px`,
                  color: palette.primaryHex,
                  backgroundColor: isMonokrom ? '#ffffff' : palette.softBgHex,
                  border: `2.5px solid ${palette.borderHex}`
                }}
              >
                {roomBigDigits}
              </div>
            </>
          ) : (
            <>
              {settings.judulAtas && (
                <div
                  className="font-bold tracking-[0.2em] uppercase"
                  style={{
                    color: palette.accentTextHex,
                    fontSize: `${(isPerPage1 ? 16 : isPerPage4 ? 8.5 : 11) * teksScale}px`
                  }}
                >
                  {settings.judulAtas}
                </div>
              )}
              <div
                className="leading-tight tabular-nums"
                style={{
                  fontFamily: activeFontMeta.fontFamily,
                  fontWeight: activeFontMeta.weight,
                  letterSpacing: spacingCss,
                  fontSize: `${mainHeadlinePx}px`,
                  color: palette.primaryHex
                }}
              >
                {displayMainLabel}
              </div>
            </>
          )}

          {/* Room Identity Details (Kelas, Nopes, Sesi, Lokasi) */}
          <div
            className="w-full max-w-[96%] flex flex-wrap items-center justify-center gap-x-3"
            style={{
              marginTop: `${((isPerPage1 ? 10 : isPerPage4 ? 3 : 5) * spacingFactor).toFixed(1)}px`,
              rowGap: `${(4 * spacingFactor).toFixed(1)}px`,
              fontSize: `${metaTextPx}px`,
              lineHeight: cardLineHeight,
              color: '#1e293b'
            }}
          >
            {settings.tampilkanKelasRombel && item.kelasRombel && (
              <div className="font-bold text-slate-900">
                Kelas / Rombel: <span style={{ color: palette.accentTextHex }}>{item.kelasRombel}</span>
              </div>
            )}
            {settings.tampilkanJumlahPeserta && item.jumlahPeserta ? (
              <div className="font-semibold tabular-nums">
                · Peserta: <strong>{item.jumlahPeserta} Siswa</strong>
              </div>
            ) : null}
          </div>

          {settings.tampilkanRentangNomor && item.rentangNomorPeserta && (
            <div
              className="font-mono font-bold tabular-nums px-2.5 py-0.5 rounded border"
              style={{
                fontSize: `${(isPerPage1 ? 14 : isPerPage4 ? 8.5 : 10.5) * teksScale}px`,
                lineHeight: cardLineHeight,
                backgroundColor: '#f8fafc',
                borderColor: '#cbd5e1',
                color: '#0f172a'
              }}
            >
              No. Peserta: {item.rentangNomorPeserta}
            </div>
          )}

          <div
            className="flex flex-wrap items-center justify-center gap-x-2.5 text-slate-600"
            style={{
              rowGap: `${(2 * spacingFactor).toFixed(1)}px`,
              lineHeight: cardLineHeight,
              fontSize: `${(isPerPage1 ? 13 : isPerPage4 ? 8 : 10) * teksScale}px`
            }}
          >
            {settings.tampilkanSesi && item.sesiUjian && <span>{item.sesiUjian}</span>}
            {settings.tampilkanSesi &&
              item.sesiUjian &&
              settings.tampilkanLokasi &&
              item.lokasiGedung && <span aria-hidden="true">·</span>}
            {settings.tampilkanLokasi && item.lokasiGedung && <span>{item.lokasiGedung}</span>}
          </div>
        </div>

        {/* Footer Strip */}
        <div
          className={`relative z-10 border-t flex items-center justify-between gap-2 ${
            isPerPage1 ? 'px-6' : isPerPage4 ? 'px-3' : 'px-4'
          }`}
          style={{
            paddingTop: `${((isPerPage1 ? 11 : isPerPage4 ? 5 : 8) * spacingFactor).toFixed(1)}px`,
            paddingBottom: `${((isPerPage1 ? 11 : isPerPage4 ? 5 : 8) * spacingFactor).toFixed(1)}px`,
            borderTopColor: `${palette.borderHex}55`,
            backgroundColor: isMonokrom ? '#ffffff' : '#f8fafc'
          }}
        >
          <div className="min-w-0">
            <div
              className="font-bold uppercase tracking-wider truncate"
              style={{
                color: palette.primaryHex,
                fontSize: `${(isPerPage1 ? 12 : isPerPage4 ? 7 : 9) * teksScale}px`
              }}
            >
              {settings.catatanKaki || 'HARAP TENANG • SEDANG BERLANGSUNG UJIAN'}
            </div>
            {item.catatanTambahan && !isPerPage4 && (
              <div
                className="text-slate-600 truncate"
                style={{ fontSize: `${(isPerPage1 ? 11 : 8.5) * teksScale}px` }}
              >
                {item.catatanTambahan}
              </div>
            )}
          </div>

          {settings.tampilkanQrVerifikasi && (
            <div className="shrink-0 flex items-center gap-1.5">
              <span
                className="font-mono font-bold text-slate-500 hidden sm:inline"
                style={{ fontSize: `${isPerPage4 ? 6.5 : 8}px` }}
              >
                {item.nomorRuang}
              </span>
              <ExamCardBarcode
                value={`RUANG|${item.nomorRuang}|KELAS-${item.tingkatKelas}|${item.kelasRombel || ''}|${settings.subjudulUjian}`}
                mode="qr_link"
                size={isPerPage1 ? 48 : isPerPage4 ? 26 : 34}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const samplePreviewItem = useMemo<TempelRuangItem>(() => {
    return (
      selectedPrintRooms[0] ||
      ruangList[0] || {
        id: 'sample-1',
        nomorRuang: 'R.01',
        labelUtama: 'RUANG 01',
        kelompokId: 'kel-x',
        tingkatKelas: 'X',
        kelasRombel: 'X-1 & X-2',
        jumlahPeserta: 20,
        rentangNomorPeserta: '2627101001 – 2627101020',
        sesiUjian: 'Sesi 1 (07.30 - 09.30)',
        lokasiGedung: 'Gedung Utama Sayap Barat'
      }
    );
  }, [selectedPrintRooms, ruangList]);

  return (
    <div className="space-y-5">
      {/* Dynamic Print Stylesheet */}
      <style>{`
        @page {
          size: ${geometry.widthMm}mm ${geometry.heightMm}mm;
          margin: ${geometry.marginMm}mm;
        }
        @media screen {
          .tempel-ruang-sheet {
            width: ${geometry.widthMm}mm;
            height: ${geometry.heightMm}mm;
            padding: ${geometry.marginMm}mm;
            box-sizing: border-box;
          }
        }
        @media print {
          @page {
            size: ${geometry.widthMm}mm ${geometry.heightMm}mm;
            margin: ${geometry.marginMm}mm;
          }
          .tempel-preview-zoom-wrap {
            zoom: 1 !important;
          }
          .tempel-ruang-sheet {
            width: 100% !important;
            height: ${(geometry.printableH - 1.5).toFixed(1)}mm !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            break-after: page;
            page-break-after: always;
          }
          .tempel-ruang-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Top Module Header Bar */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-900 text-amber-400 rounded-lg shrink-0">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Setting Tempel Nomor Ruang Ujian per Kelompok Tingkat Kelas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelompokkan nomor ruang ujian untuk <strong>Tingkat X, XI, dan XII</strong>, pilih model font papan ruang yang terbaca jelas, dan cetak rapi ke kertas <strong>Folio / F4</strong> maupun <strong>A4</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSyncFromSiswa(false)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              title="Cocokkan daftar ruang & rentang nomor peserta dengan setting Kartu Peserta Ulangan"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Cocokkan Kartu Ujian</span>
            </button>

            {onUpdateSiswa && matchedDist.savedRoomStudentCount < matchedDist.totalActiveStudents && (
              <button
                type="button"
                onClick={handleCommitProjectionToSiswa}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                title="Simpan pembagian ruang & nomor peserta ini ke database siswa agar Kartu Ujian & Daftar Hadir 100% sama"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Ruang ke Kartu Ujian</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Tempel Ruang ({selectedPrintRooms.length})</span>
            </button>
          </div>
        </div>

        {/* Kartu Peserta Ulangan Live Sync Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs bg-slate-50/70 -mx-5 px-5 py-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-700 tabular-nums">
            <label className="flex items-center gap-1.5 font-semibold text-slate-900 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={autoFollowKartuUjian}
                onChange={e => updateSettings({ ikutiSettingKartuUjian: e.target.checked })}
                className="rounded text-blue-600"
              />
              <span>Ikuti Setting Kartu Peserta Ulangan:</span>
            </label>
            <span>
              Kapasitas <strong>{ujianSettings.kapasitasPerRuang}</strong> anak/ruang
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Prefix <strong>{ujianSettings.defaultRuangPrefix || 'R.'}</strong> (Mulai{' '}
              <strong>{String(ujianSettings.mulaiNomorRuang || 1).padStart(2, '0')}</strong>)
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Pola{' '}
              <strong>
                {ujianSettings.modePembagianRuang === 'per_kelas'
                  ? 'Pisah per Kelas'
                  : ujianSettings.modePembagianRuang === 'per_sesi'
                  ? 'Reset per Sesi'
                  : 'Berlanjut'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Status Data:{' '}
              <strong className={matchedDist.savedRoomStudentCount > 0 ? 'text-emerald-700' : 'text-amber-700'}>
                {matchedDist.savedRoomStudentCount}/{matchedDist.totalActiveStudents} siswa tersimpan ruangnya
              </strong>
            </span>
          </div>

          {onUpdateUjianSettings && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label className="flex items-center gap-1 text-slate-600 font-medium">
                <span>Anak/Ruang:</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={ujianSettings.kapasitasPerRuang || 20}
                  onChange={e => {
                    const val = Math.max(1, Math.min(200, Number(e.target.value) || 20));
                    onUpdateUjianSettings({ ...ujianSettings, kapasitasPerRuang: val });
                  }}
                  className="w-14 px-2 py-1 border border-slate-300 rounded bg-white font-mono font-bold text-center tabular-nums"
                />
              </label>
              <select
                value={ujianSettings.modePembagianRuang || 'sequential'}
                onChange={e =>
                  onUpdateUjianSettings({
                    ...ujianSettings,
                    modePembagianRuang: e.target.value as 'sequential' | 'per_sesi' | 'per_kelas'
                  })
                }
                className="px-2 py-1 border border-slate-300 rounded bg-white font-semibold"
              >
                <option value="sequential">Pola: Berlanjut</option>
                <option value="per_kelas">Pola: Pisah per Kelas</option>
                <option value="per_sesi">Pola: Reset per Sesi</option>
              </select>
              {onUpdateSiswa && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setRoomGroupInitialRoom(undefined);
                      setIsRoomGroupModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-semibold rounded flex items-center gap-1 whitespace-nowrap shrink-0"
                    title="Atur anggota siswa di setiap ruang secara langsung"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Atur Anak per Ruang</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitProjectionToSiswa}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold rounded whitespace-nowrap shrink-0"
                    title="Hitung ulang semua siswa sesuai kapasitas & pola di atas lalu simpan ke Master Siswa"
                  >
                    Terapkan Ulang Pembagian
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Clean Segmented Sub-Tab Navigation + Unboxed Summary Metadata */}
        <div className="pt-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {[
              { id: 'ruang', label: '1. Kelompok & Daftar Ruang', icon: Layers },
              { id: 'font_desain', label: '2. Model Font & Tampilan', icon: Type },
              { id: 'cetak', label: '3. Pratinjau & Cetak Rapi', icon: LayoutGrid }
            ].map(tab => {
              const Icon = tab.icon;
              const active = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
            <span>
              Total: <strong className="text-slate-900">{ruangList.length} Ruang</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              X: <strong className="text-blue-700">{tingkatStats.X.rooms} R</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              XI: <strong className="text-emerald-700">{tingkatStats.XI.rooms} R</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              XII: <strong className="text-amber-700">{tingkatStats.XII.rooms} R</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Font: <strong className="text-slate-900">{activeFontMeta.label}</strong>
            </span>
          </div>
        </div>

        {statusToast && (
          <div
            className={`px-3.5 py-2.5 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 ${
              statusToast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusToast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <span>{statusToast.text}</span>
            <button
              type="button"
              onClick={() => setStatusToast(null)}
              className="text-[11px] font-semibold underline shrink-0"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: KELOMPOK RUANG PER TINGKAT & DAFTAR NOMOR RUANG */}
      {activeSubTab === 'ruang' && (
        <div className="no-print grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left Column: Kelompok per Tingkat + Generator Rentang */}
          <div className="xl:col-span-4 space-y-4">
            {/* Kelompok Ruang Manager */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Kelompok Ruang per Tingkat</span>
                </h3>
                <span className="text-xs text-slate-500 tabular-nums">
                  {sortedKelompokList.length} Kelompok
                </span>
              </div>

              <div className="space-y-2.5">
                {sortedKelompokList.map(kel => {
                  const roomCount = ruangList.filter(r => r.kelompokId === kel.id).length;
                  const palette = resolvePaletteForTingkat(
                    'otomatis_tingkat',
                    kel.tingkatKelas,
                    kel.warnaBadge
                  );
                  return (
                    <div
                      key={kel.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: palette.borderHex }}
                          />
                          <input
                            type="text"
                            value={kel.namaKelompok}
                            onChange={e =>
                              handleUpdateKelompokField(kel.id, { namaKelompok: e.target.value })
                            }
                            className="w-full px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteKelompok(kel.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Hapus kelompok"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-12 gap-2 text-xs">
                        <div className="col-span-5">
                          <select
                            value={kel.tingkatKelas}
                            onChange={e =>
                              handleUpdateKelompokField(kel.id, {
                                tingkatKelas: e.target.value as TempelRuangTingkat
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs font-semibold"
                          >
                            <option value="X">Tingkat X</option>
                            <option value="XI">Tingkat XI</option>
                            <option value="XII">Tingkat XII</option>
                            <option value="Gabungan">Gabungan</option>
                          </select>
                        </div>
                        <div className="col-span-7">
                          <input
                            type="text"
                            value={kel.gedungLokasi || ''}
                            onChange={e =>
                              handleUpdateKelompokField(kel.id, { gedungLokasi: e.target.value })
                            }
                            placeholder="Lokasi gedung / lantai"
                            className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span className="tabular-nums">{roomCount} ruang terdaftar</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddSingleRoom(kel.id)}
                            className="text-blue-700 hover:underline font-semibold"
                          >
                            + Tambah Ruang
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setKelompokFilter(kel.id);
                              setTingkatFilter('SEMUA');
                            }}
                            className="text-slate-700 hover:underline font-semibold"
                          >
                            Filter
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Kelompok */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-800">Tambah Kelompok Baru</div>
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newKelompokNama}
                    onChange={e => setNewKelompokNama(e.target.value)}
                    placeholder="Nama kelompok (mis. Labkom XII)"
                    className="col-span-8 px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                  <select
                    value={newKelompokTingkat}
                    onChange={e => setNewKelompokTingkat(e.target.value as TempelRuangTingkat)}
                    className="col-span-4 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white font-semibold"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                    <option value="Gabungan">Gabungan</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newKelompokLokasi}
                    onChange={e => setNewKelompokLokasi(e.target.value)}
                    placeholder="Lokasi gedung/lantai (opsional)"
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddKelompok}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Range Room Generator */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                Generator Rentang Nomor Ruang Cepat
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Masukkan ke Kelompok Tingkat
                  </label>
                  <select
                    value={rangeKelompokId}
                    onChange={e => setRangeKelompokId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    {sortedKelompokList.map(k => (
                      <option key={k.id} value={k.id}>
                        {k.namaKelompok} (Tingkat {k.tingkatKelas})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Teks Judul Besar
                    </label>
                    <input
                      type="text"
                      value={rangePrefix}
                      onChange={e => setRangePrefix(e.target.value)}
                      placeholder="RUANG "
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kode Ruang Ringkas
                    </label>
                    <input
                      type="text"
                      value={rangeKodePrefix}
                      onChange={e => setRangeKodePrefix(e.target.value)}
                      placeholder="R."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Dari No.</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={rangeStart}
                      onChange={e => setRangeStart(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Sampai No.</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={rangeEnd}
                      onChange={e => setRangeEnd(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Peserta</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={rangeKapasitas}
                      onChange={e => setRangeKapasitas(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sesi Default</label>
                  <input
                    type="text"
                    value={rangeSesi}
                    onChange={e => setRangeSesi(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rangeModeReplace}
                    onChange={e => setRangeModeReplace(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Ganti ruang lama pada kelompok terpilih</span>
                </label>

                <button
                  type="button"
                  onClick={handleGenerateRangeRooms}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors"
                >
                  Generate Nomor Ruang ({rangePrefix}
                  {String(Math.max(1, rangeStart)).padStart(2, '0')} – {rangePrefix}
                  {String(Math.max(rangeStart, rangeEnd)).padStart(2, '0')})
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Editable Room Table */}
          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['SEMUA', 'X', 'XI', 'XII', 'Gabungan'] as const).map(lv => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => {
                      setTingkatFilter(lv);
                      setKelompokFilter('ALL');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      tingkatFilter === lv && kelompokFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lv === 'SEMUA' ? 'Semua Tingkat' : `Tingkat ${lv}`}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor ruang, kelas..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleAllFiltered(true)}
                  className="text-blue-700 hover:underline font-semibold flex items-center gap-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Pilih Semua Tampil</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAllFiltered(false)}
                  className="text-slate-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Kosongkan Pilihan</span>
                </button>
              </div>
              <div className="text-slate-500 tabular-nums">
                Menampilkan {filteredRuangList.length} ruang ·{' '}
                <strong className="text-slate-900">{selectedPrintRooms.length} dicentang cetak</strong>
              </div>
            </div>

            {filteredRuangList.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700">
                  Belum ada ruang pada filter ini
                </p>
                <p className="text-xs text-slate-500">
                  Gunakan Generator Rentang di sebelah kiri atau klik Sinkron Data Siswa.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[620px] overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-700">
                    <tr>
                      <th className="py-2.5 px-2.5 w-9 text-center">Cetak</th>
                      <th className="py-2.5 px-2.5 w-24">Kode</th>
                      <th className="py-2.5 px-2.5 min-w-[130px]">Teks Tempel Utama</th>
                      <th className="py-2.5 px-2.5 min-w-[165px]">Kelompok Tingkat</th>
                      <th className="py-2.5 px-2.5 min-w-[130px]">Kelas / Rombel</th>
                      <th className="py-2.5 px-2.5 w-16 text-right">Siswa</th>
                      <th className="py-2.5 px-2.5 min-w-[175px]">Rentang No. Peserta</th>
                      <th className="py-2.5 px-2.5 min-w-[135px]">Sesi / Lokasi</th>
                      <th className="py-2.5 px-2.5 w-24 text-center">Kelompok</th>
                      <th className="py-2.5 px-2.5 w-10 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRuangList.map(item => {
                      const isChecked = item.dipilihCetak !== false;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e =>
                                handleUpdateRoom(item.id, { dipilihCetak: e.target.checked })
                              }
                              className="rounded text-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.nomorRuang}
                              onChange={e =>
                                handleUpdateRoom(item.id, { nomorRuang: e.target.value })
                              }
                              className="w-full px-2 py-1 border border-slate-200 rounded font-mono font-bold tabular-nums bg-white"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.labelUtama || ''}
                              onChange={e =>
                                handleUpdateRoom(item.id, { labelUtama: e.target.value })
                              }
                              placeholder="RUANG 01"
                              className="w-full px-2 py-1 border border-slate-200 rounded font-bold bg-white"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <select
                              value={item.kelompokId}
                              onChange={e =>
                                handleUpdateRoom(item.id, { kelompokId: e.target.value })
                              }
                              className="w-full px-2 py-1 border border-slate-200 rounded bg-white font-semibold"
                            >
                              {sortedKelompokList.map(k => (
                                <option key={k.id} value={k.id}>
                                  {k.tingkatKelas} · {k.namaKelompok}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.kelasRombel || ''}
                              onChange={e =>
                                handleUpdateRoom(item.id, { kelasRombel: e.target.value })
                              }
                              placeholder="X-1 & X-2"
                              className="w-full px-2 py-1 border border-slate-200 rounded bg-white"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min={0}
                              max={200}
                              value={item.jumlahPeserta ?? 0}
                              onChange={e =>
                                handleUpdateRoom(item.id, {
                                  jumlahPeserta: Number(e.target.value)
                                })
                              }
                              className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-right tabular-nums bg-white"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={item.rentangNomorPeserta || ''}
                              onChange={e =>
                                handleUpdateRoom(item.id, {
                                  rentangNomorPeserta: e.target.value
                                })
                              }
                              placeholder="2627101001 – 2627101020"
                              className="w-full px-2 py-1 border border-slate-200 rounded font-mono text-[11px] tabular-nums bg-white"
                            />
                          </td>
                          <td className="py-2 px-2 space-y-1">
                            <input
                              type="text"
                              value={item.sesiUjian || ''}
                              onChange={e =>
                                handleUpdateRoom(item.id, { sesiUjian: e.target.value })
                              }
                              placeholder="Sesi 1"
                              className="w-full px-2 py-0.5 border border-slate-200 rounded text-[11px] bg-white"
                            />
                            <input
                              type="text"
                              value={item.lokasiGedung || ''}
                              onChange={e =>
                                handleUpdateRoom(item.id, { lokasiGedung: e.target.value })
                              }
                              placeholder="Gedung / Lantai"
                              className="w-full px-2 py-0.5 border border-slate-200 rounded text-[11px] bg-white"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            {onUpdateSiswa ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setRoomGroupInitialRoom(item.nomorRuang);
                                  setIsRoomGroupModalOpen(true);
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold whitespace-nowrap"
                              >
                                Atur Anak
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRoom(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Hapus ruang ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MODEL FONT & TAMPILAN PAPAN RUANG */}
      {activeSubTab === 'font_desain' && (
        <div className="no-print grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left 7 Cols: Font Gallery & Typography Controls */}
          <div className="xl:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Galeri Model Font Papan Nomor Ruang (Terbaca Jelas)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih jenis huruf dengan tingkat kontras dan keterbacaan tinggi dari jarak koridor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRandomFontAndStyle}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Acak Model Font</span>
                </button>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    'ALL',
                    'Signage Tegas',
                    'Display Blok',
                    'Modern Sans',
                    'Teknis CBT',
                    'Serif Resmi'
                  ] as const
                ).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFontCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap shrink-0 ${
                      fontCategoryFilter === cat
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'ALL' ? `Semua (${SIGNAGE_FONT_GALLERY.length})` : cat}
                  </button>
                ))}
              </div>

              {/* Font Swatch Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {visibleFontGallery.map(font => {
                  const selected = settings.fontModel === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => updateSettings({ fontModel: font.id })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selected
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-blue-500'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-blue-400 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                        <span className={selected ? 'text-amber-300 font-semibold' : 'text-slate-500 font-medium'}>
                          {font.category}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                      </div>
                      <div
                        style={{
                          fontFamily: font.fontFamily,
                          fontWeight: font.weight,
                          letterSpacing: font.letterSpacingDefault
                        }}
                        className="text-2xl leading-none tracking-tight py-1 truncate tabular-nums"
                      >
                        {font.sampleNum}
                      </div>
                      <div className="text-xs font-bold mt-1">{font.label}</div>
                      <div
                        className={`text-[11px] truncate ${
                          selected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {font.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Typography & Frame Adjustments */}
              <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Font Teks Keterangan & Biodata
                  </label>
                  <select
                    value={settings.fontBodyModel}
                    onChange={e =>
                      updateSettings({
                        fontBodyModel: e.target.value as TempelRuangSettings['fontBodyModel']
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    {BODY_FONT_OPTIONS.map(bf => (
                      <option key={bf.id} value={bf.id}>
                        {bf.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Model Bingkai Nomor Ruang
                  </label>
                  <select
                    value={settings.desainBingkai}
                    onChange={e =>
                      updateSettings({
                        desainBingkai: e.target.value as TempelRuangFrameStyle
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="blok_angka">Blok Kotak Angka Besar (Kontras Maksimal)</option>
                    <option value="header_modern">Banner Atas & Judul Tengah Modern</option>
                    <option value="klasik_ganda">Bingkai Garis Ganda Klasik Resmi</option>
                    <option value="minimal_tegas">Minimalis Bersih Hemat Tinta</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Skala Nomor Ruang</label>
                    <span className="font-mono font-bold text-blue-700 tabular-nums">
                      {settings.skalaAngkaPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={140}
                    step={5}
                    value={settings.skalaAngkaPct}
                    onChange={e => updateSettings({ skalaAngkaPct: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Skala Teks Detail</label>
                    <span className="font-mono font-bold text-blue-700 tabular-nums">
                      {settings.skalaTeksPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={85}
                    max={125}
                    step={5}
                    value={settings.skalaTeksPct}
                    onChange={e => updateSettings({ skalaTeksPct: Number(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Skema Warna Kelompok
                  </label>
                  <select
                    value={settings.warnaPreset}
                    onChange={e =>
                      updateSettings({
                        warnaPreset: e.target.value as TempelRuangColorPreset
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="otomatis_tingkat">
                      Otomatis Beda Warna per Tingkat (X Biru, XI Hijau, XII Amber)
                    </option>
                    {Object.entries(COLOR_SCHEMES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Spasi Huruf & Kapitalisasi
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={settings.spasiHuruf}
                      onChange={e =>
                        updateSettings({
                          spasiHuruf: e.target.value as TempelRuangSettings['spasiHuruf']
                        })
                      }
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="rapat">Rapat</option>
                      <option value="standar">Standar</option>
                      <option value="lebar">Lebar</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.kapitalJudul}
                        onChange={e => updateSettings({ kapitalJudul: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      <span>Kapital</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jarak Spasi Baris &amp; Elemen Kartu
                  </label>
                  <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                    {(
                      [
                        { id: 'padat', label: 'Rapat' },
                        { id: 'nyaman', label: 'Nyaman' },
                        { id: 'lega', label: 'Lega' }
                      ] as { id: PrintLineSpacing; label: string }[]
                    ).map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleChangeSpasiBaris(opt.id)}
                        className={`flex-1 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                          spasiBaris === opt.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Text & Visibility Toggles */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-900">
                Judul Ujian & Elemen yang Ditampilkan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Label Atas Nomor Ruang
                  </label>
                  <input
                    type="text"
                    value={settings.judulAtas}
                    onChange={e => updateSettings({ judulAtas: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Ujian</label>
                  <input
                    type="text"
                    value={settings.subjudulUjian}
                    onChange={e => updateSettings({ subjudulUjian: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Semester & Tahun Pelajaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={settings.semester}
                      onChange={e => updateSettings({ semester: e.target.value })}
                      className="px-2 py-1.5 border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={settings.tahunPelajaran}
                      onChange={e => updateSettings({ tahunPelajaran: e.target.value })}
                      className="px-2 py-1.5 border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Kaki</label>
                  <input
                    type="text"
                    value={settings.catatanKaki}
                    onChange={e => updateSettings({ catatanKaki: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                {[
                  { key: 'tampilkanKopMini', label: 'Kop & Logo Sekolah' },
                  { key: 'tampilkanKelompokBadge', label: 'Label Tingkat & Kelompok' },
                  { key: 'tampilkanKelasRombel', label: 'Kelas / Rombel' },
                  { key: 'tampilkanJumlahPeserta', label: 'Jumlah Peserta' },
                  { key: 'tampilkanRentangNomor', label: 'Rentang No. Peserta' },
                  { key: 'tampilkanSesi', label: 'Sesi Ujian' },
                  { key: 'tampilkanLokasi', label: 'Lokasi Gedung' },
                  { key: 'tampilkanQrVerifikasi', label: 'QR Verifikasi Ruang' }
                ].map(opt => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean((settings as any)[opt.key])}
                      onChange={e => updateSettings({ [opt.key]: e.target.checked })}
                      className="rounded text-blue-600"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Live Real-Time Card Preview */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3 sticky top-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pratinjau Langsung</h3>
                <p className="text-xs text-slate-500">
                  {activeFontMeta.label} · Skala Angka {settings.skalaAngkaPct}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateSettings({ skalaAngkaPct: 100, skalaTeksPct: 100 })}
                className="px-2.5 py-1 border border-slate-200 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Skala</span>
              </button>
            </div>

            <div className="bg-slate-100 rounded-lg p-4 border border-slate-200 flex items-center justify-center">
              <div className="w-full h-[290px]">
                {renderSignageCard(samplePreviewItem, { isCompactPreview: true })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                Siap dicetak ke {settings.paperSize} ({settings.labelPerPage}/halaman)
              </span>
              <button
                type="button"
                onClick={() => setActiveSubTab('cetak')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0"
              >
                Lihat Tata Letak Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRATINJAU & CETAK RAPI (Controls hidden on print, Sheets visible on print) */}
      {(activeSubTab === 'cetak' || activeSubTab === 'ruang' || activeSubTab === 'font_desain') && (
        <div className={activeSubTab === 'cetak' ? 'space-y-4' : 'hidden print:block'}>
          {/* Print Controls Toolbar */}
          <div className="no-print bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs">
              {/* Paper Size & Orientation */}
              <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Kertas:
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {(['A4', 'F4'] as const).map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateSettings({ paperSize: sz })}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 ${
                        settings.paperSize === sz
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {PAPER_DIMS[sz].label}
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {(['portrait', 'landscape'] as const).map(ori => (
                    <button
                      key={ori}
                      type="button"
                      onClick={() => updateSettings({ orientasi: ori })}
                      className={`px-2.5 py-1 rounded-md font-semibold capitalize whitespace-nowrap shrink-0 ${
                        settings.orientasi === ori
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ori}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pembagian Tempelan per Halaman */}
              <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 flex items-center gap-1 whitespace-nowrap">
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
                  Pembagian:
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  {[
                    { val: 1 as const, label: '1/Hal (Poster Pintu)' },
                    { val: 2 as const, label: '2/Hal (Sedang)' },
                    { val: 4 as const, label: '4/Hal (Kuartal 2×2)' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => updateSettings({ labelPerPage: opt.val })}
                      className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 ${
                        settings.labelPerPage === opt.val
                          ? 'bg-slate-900 text-amber-400 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Zoom & Spasi Cepat */}
              <div className="lg:col-span-2 flex flex-wrap items-center justify-end gap-1.5">
                <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
                  {(
                    [
                      { id: 'padat', label: 'Rapat' },
                      { id: 'nyaman', label: 'Nyaman' },
                      { id: 'lega', label: 'Lega' }
                    ] as { id: PrintLineSpacing; label: string }[]
                  ).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChangeSpasiBaris(opt.id)}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold whitespace-nowrap ${
                        spasiBaris === opt.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="inline-flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}
                    className="p-1 border border-slate-200 rounded hover:bg-slate-50"
                    title="Perkecil pratinjau"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  {[0.5, 0.65, 0.85, 1].map(zp => (
                    <button
                      key={zp}
                      type="button"
                      onClick={() => setPreviewZoom(zp)}
                      className={`px-1.5 py-0.5 rounded font-mono text-[10.5px] font-bold tabular-nums whitespace-nowrap ${
                        Math.abs(previewZoom - zp) <= 0.03
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {Math.round(zp * 100)}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(z => Math.min(1.15, +(z + 0.1).toFixed(2)))}
                    className="p-1 border border-slate-200 rounded hover:bg-slate-50"
                    title="Perbesar pratinjau"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter Tingkat:</span>
                  <select
                    value={tingkatFilter}
                    onChange={e => {
                      setTingkatFilter(e.target.value as any);
                      setKelompokFilter('ALL');
                    }}
                    className="px-2 py-1 border border-slate-200 rounded bg-white font-semibold"
                  >
                    <option value="SEMUA">Semua Tingkat ({ruangList.length} Ruang)</option>
                    <option value="X">Tingkat X ({tingkatStats.X.rooms} Ruang)</option>
                    <option value="XI">Tingkat XI ({tingkatStats.XI.rooms} Ruang)</option>
                    <option value="XII">Tingkat XII ({tingkatStats.XII.rooms} Ruang)</option>
                    <option value="Gabungan">Gabungan ({tingkatStats.Gabungan.rooms} Ruang)</option>
                  </select>
                </label>

                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Scissors className="w-3.5 h-3.5 text-slate-400" />
                  <span>Garis Potong:</span>
                  <select
                    value={settings.garisPotong}
                    onChange={e =>
                      updateSettings({
                        garisPotong: e.target.value as TempelRuangSettings['garisPotong']
                      })
                    }
                    className="px-2 py-1 border border-slate-200 rounded bg-white font-semibold"
                  >
                    <option value="dashed_gunting">Putus-putus + Gunting</option>
                    <option value="dashed">Garis Tipis</option>
                    <option value="none">Tanpa Garis</option>
                  </select>
                </label>

                <label className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.pisahHalamanPerKelompok}
                    onChange={e =>
                      updateSettings({ pisahHalamanPerKelompok: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Pisah Halaman per Kelompok Tingkat</span>
                </label>
              </div>

              <div className="text-slate-500 tabular-nums">
                Total: <strong className="text-slate-900">{printPages.length} Lembar</strong> (
                {selectedPrintRooms.length} Ruang · {geometry.cellW.toFixed(0)}×
                {geometry.cellH.toFixed(0)} mm/label)
              </div>
            </div>
          </div>

          {/* Printable Pages Container */}
          {printPages.length === 0 ? (
            <div className="no-print bg-white border border-slate-200 rounded-lg p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                Tidak ada nomor ruang yang dicentang untuk dicetak
              </p>
              <button
                type="button"
                onClick={() => handleToggleAllFiltered(true)}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
              >
                Centang Semua Ruang Tersaring
              </button>
            </div>
          ) : (
            <div className="bg-slate-200/80 p-4 sm:p-6 rounded-lg border border-slate-300 overflow-x-auto print:bg-white print:p-0 print:border-none print:overflow-visible">
              <div
                className="tempel-preview-zoom-wrap flex flex-col items-center gap-6 print:block print:gap-0"
                style={{ zoom: previewZoom }}
              >
                {printPages.map((page, pageIdx) => (
                  <div key={`page-${pageIdx}`} className="space-y-1.5 print:space-y-0">
                    <div className="no-print flex items-center justify-between text-xs font-semibold text-slate-600 px-1 tabular-nums">
                      <span>
                        Lembar {pageIdx + 1} / {printPages.length} · {page.groupLabel}
                      </span>
                      <span>
                        {settings.paperSize} {settings.orientasi} · {page.items.length} label
                      </span>
                    </div>

                    <div className="tempel-ruang-sheet bg-white shadow-lg border border-slate-300 mx-auto print:shadow-none print:border-none">
                      <div
                        className="w-full h-full grid"
                        style={{
                          gridTemplateColumns: `repeat(${geometry.cols}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${geometry.rows}, minmax(0, 1fr))`,
                          gap: `${geometry.gapMm}mm`
                        }}
                      >
                        {page.items.map(item => (
                          <div key={item.id} className="w-full h-full min-h-0 min-w-0">
                            {renderSignageCard(item)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {onUpdateSiswa && (
        <AturKelompokRuangSiswaModal
          isOpen={isRoomGroupModalOpen}
          onClose={() => setIsRoomGroupModalOpen(false)}
          siswaList={siswaList}
          ujianSettings={ujianSettings}
          initialSelectedRoom={roomGroupInitialRoom}
          onUpdateUjianSettings={onUpdateUjianSettings}
          onSaveSiswa={(updatedList, msg) => {
            onUpdateSiswa(updatedList);
            const synced = syncTempelRuangBundleWithKartuUjian(bundle, updatedList, ujianSettings);
            onUpdateBundle(synced);
            appendAuditLog('ATUR_KELOMPOK_RUANG_SISWA', msg);
            showToast('success', msg);
          }}
        />
      )}
    </div>
  );
};
