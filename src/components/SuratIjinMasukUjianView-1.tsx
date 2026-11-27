import React, { useMemo, useState, useEffect } from 'react';
import {
  SchoolProfile,
  User,
  Siswa,
  KartuUjianSettings,
  PanitiaPengawasItem
} from '../types';
import { OfficialKopSurat } from './OfficialKopSurat';
import { SchoolStampSvg, PemprovJatimLogo, Sman9SurabayaLogoSvg } from './OfficialStamps';
import { ExamCardBarcode, resolveDirectImageUrl } from './ExamCardBarcode';
import { appendAuditLog } from '../services/storageService';
import {
  FileCheck2,
  Printer,
  Search,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  LayoutGrid,
  FileText,
  ZoomIn,
  ZoomOut,
  Scissors,
  SlidersHorizontal,
  Link2,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  FilePlus2,
  QrCode
} from 'lucide-react';

interface SuratIjinRecord {
  id: string;
  nomorSurat: string;
  tanggalSurat: string;
  siswaId?: string;
  namaSiswa: string;
  nis: string;
  nisn: string;
  kelas: string;
  nomorUjian: string;
  ruangUjian: string;
  sesiUjian: string;
  mataPelajaran: string;
  jamMulai: string;
  jamHadir: string;
  menitTerlambat: number;
  alasan: string;
  keputusan: string;
  petugasNama: string;
  petugasJabatan: string;
  petugasNip?: string;
  createdAt: string;
  isBlanko?: boolean;
}

type SuratSizeMode = 'mini' | 'sedang' | 'penuh';
type MiniDivisionMode = '4up' | '6up';
type PaperSizeMode = 'A4' | 'F4';
type IndividuFillMode = 'single' | 'fill_blanko' | 'fill_copy';
type SuratFontFamily = 'inter' | 'jakarta' | 'arial' | 'times' | 'lora' | 'poppins';
type SuratLineSpacing = 'padat' | 'nyaman' | 'lega';
type SuratLetterSpacing = 'normal' | 'lebar';

interface SuratIjinLayoutConfig {
  paperSize: PaperSizeMode;
  ukuranSurat: SuratSizeMode;
  miniDivision: MiniDivisionMode;
  marginMm: number;
  gapMm: number;
  individuFillMode: IndividuFillMode;
  fontFamily: SuratFontFamily;
  fontScalePct: number;
  lineSpacing: SuratLineSpacing;
  letterSpacing: SuratLetterSpacing;
}

interface SuratIjinMasukUjianViewProps {
  profile: SchoolProfile;
  currentUser: User;
  siswaList: Siswa[];
  settings: KartuUjianSettings;
  panitiaPengawasList: PanitiaPengawasItem[];
  onUpdateSiswa?: (list: Siswa[]) => void;
  isStandalone?: boolean;
}

const STORAGE_KEY_IJIN = 'sip_tu_surat_ijin_ujian_v1';
const STORAGE_KEY_IJIN_LAYOUT = 'sip_tu_surat_ijin_layout_v1';

const DEFAULT_LAYOUT_CONFIG: SuratIjinLayoutConfig = {
  paperSize: 'F4',
  ukuranSurat: 'mini',
  miniDivision: '4up',
  marginMm: 10,
  gapMm: 5,
  individuFillMode: 'single',
  fontFamily: 'inter',
  fontScalePct: 100,
  lineSpacing: 'nyaman',
  letterSpacing: 'normal'
};

const SURAT_FONT_OPTIONS: Record<SuratFontFamily, { label: string; shortLabel: string; css: string }> = {
  inter: {
    label: 'Inter (Bersih & Sangat Jelas)',
    shortLabel: 'Inter',
    css: "'Inter', system-ui, -apple-system, sans-serif"
  },
  jakarta: {
    label: 'Plus Jakarta Sans (Modern Rapi)',
    shortLabel: 'Jakarta Sans',
    css: "'Plus Jakarta Sans', system-ui, sans-serif"
  },
  arial: {
    label: 'Arial / Sans Kedinasan (Tegas)',
    shortLabel: 'Arial',
    css: 'Arial, Helvetica, sans-serif'
  },
  times: {
    label: 'Times New Roman (Resmi Klasik)',
    shortLabel: 'Times New Roman',
    css: "'Times New Roman', Times, serif"
  },
  lora: {
    label: 'Lora / Serif Editorial (Formal Halus)',
    shortLabel: 'Lora Serif',
    css: "'Lora', 'Merriweather', Georgia, serif"
  },
  poppins: {
    label: 'Poppins (Huruf Bulat Mudah Dibaca)',
    shortLabel: 'Poppins',
    css: "'Poppins', system-ui, sans-serif"
  }
};

const LINE_SPACING_SPECS: Record<
  SuratLineSpacing,
  {
    label: string;
    lineHeight: number;
    miniRowPy: string;
    mini6RowPy: string;
    sedangRowPy: string;
    fullRowPy: string;
    sectionGap: string;
  }
> = {
  padat: {
    label: 'Rapat',
    lineHeight: 1.24,
    miniRowPy: 'py-[2px]',
    mini6RowPy: 'py-[1.5px]',
    sedangRowPy: 'py-[2px]',
    fullRowPy: 'py-1',
    sectionGap: 'space-y-1.5'
  },
  nyaman: {
    label: 'Nyaman',
    lineHeight: 1.4,
    miniRowPy: 'py-[4px]',
    mini6RowPy: 'py-[3px]',
    sedangRowPy: 'py-[3.5px]',
    fullRowPy: 'py-1.5',
    sectionGap: 'space-y-2.5'
  },
  lega: {
    label: 'Lega',
    lineHeight: 1.56,
    miniRowPy: 'py-[6px]',
    mini6RowPy: 'py-[4.5px]',
    sedangRowPy: 'py-[5px]',
    fullRowPy: 'py-2',
    sectionGap: 'space-y-3.5'
  }
};

const PAPER_SPECS: Record<PaperSizeMode, { widthMm: number; heightMm: number; label: string; shortLabel: string }> = {
  A4: { widthMm: 210, heightMm: 297, label: 'A4 (210 × 297 mm)', shortLabel: 'A4' },
  F4: { widthMm: 215, heightMm: 330, label: 'Folio / F4 (215 × 330 mm)', shortLabel: 'Folio / F4' }
};

const ALASAN_PRESETS = [
  'Keterlambatan transportasi / kemacetan lalu lintas',
  'Kendaraan mengalami gangguan teknis / ban bocor',
  'Kondisi kesehatan / pemeriksaan medis pagi hari',
  'Bangun kesiangan / kendala keluarga mendadak',
  'Tertinggal kartu ujian & kembali mengambil ke rumah'
];

const KEPUTUSAN_PRESETS = [
  'Diizinkan masuk mengikuti ujian di ruang sesuai jadwal tanpa perpanjangan waktu',
  'Diizinkan masuk mengikuti ujian di ruang sesuai jadwal',
  'Diizinkan mengerjakan ujian di Ruang Sekretariat Panitia (pengawasan khusus)'
];

const computeLateMinutes = (jamMulai: string, jamHadir: string): number => {
  const parseMin = (t: string) => {
    const m = t.trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const a = parseMin(jamMulai);
  const b = parseMin(jamHadir);
  if (a === null || b === null) return 0;
  return Math.max(0, b - a);
};

const formatTanggalIndo = (isoDate: string): string => {
  if (!isoDate) return 'Surabaya, ................................ 2026';
  try {
    const d = new Date(`${isoDate}T08:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return isoDate;
  }
};

export const SuratIjinMasukUjianView: React.FC<SuratIjinMasukUjianViewProps> = ({
  profile,
  currentUser,
  siswaList,
  settings,
  panitiaPengawasList,
  onUpdateSiswa,
  isStandalone = false
}) => {
  const activeSiswa = useMemo(
    () => siswaList.filter(s => s.status === 'Aktif' || !s.status),
    [siswaList]
  );

  const petugasOptions = useMemo(() => {
    return panitiaPengawasList.filter(p => p.kategori === 'panitia' || p.kategori === 'pengawas');
  }, [panitiaPengawasList]);

  const defaultPetugas = useMemo(() => {
    return (
      petugasOptions.find(p => /ketua|sie ruang|sekretaris|koordinator/i.test(p.jabatanKepanitiaan)) ||
      petugasOptions[0] ||
      null
    );
  }, [petugasOptions]);

  const [savedRecords, setSavedRecords] = useState<SuratIjinRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_IJIN);
      return raw ? (JSON.parse(raw) as SuratIjinRecord[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IJIN, JSON.stringify(savedRecords));
    } catch {
      // Ignore storage quota error
    }
  }, [savedRecords]);

  const [layoutConfig, setLayoutConfig] = useState<SuratIjinLayoutConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_IJIN_LAYOUT);
      if (raw) {
        return { ...DEFAULT_LAYOUT_CONFIG, ...(JSON.parse(raw) as Partial<SuratIjinLayoutConfig>) };
      }
    } catch {
      // Ignore parse error
    }
    return DEFAULT_LAYOUT_CONFIG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IJIN_LAYOUT, JSON.stringify(layoutConfig));
    } catch {
      // Ignore storage error
    }
  }, [layoutConfig]);

  const [previewZoom, setPreviewZoom] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 0.45 : 0.6
  );
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);
  const [showPortalQr, setShowPortalQr] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const firstStudent = activeSiswa[0];
  const firstMapel = settings.jadwalUjian?.[0]?.mataPelajaran || 'Mata Pelajaran Sesuai Jadwal';

  const [searchStudent, setSearchStudent] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(firstStudent?.id || '');
  const [nomorSurat, setNomorSurat] = useState<string>(
    `421.3/${String(savedRecords.length + 1).padStart(3, '0')}/IJIN-${(settings.semester || 'PSAS').replace(/\s+/g, '').toUpperCase().slice(0, 6)}/2026`
  );
  const [tanggalSurat, setTanggalSurat] = useState<string>(todayIso);
  const [namaSiswa, setNamaSiswa] = useState<string>(firstStudent?.nama || '');
  const [nis, setNis] = useState<string>(firstStudent?.nis || firstStudent?.nipd || '');
  const [nisn, setNisn] = useState<string>(firstStudent?.nisn || '');
  const [kelas, setKelas] = useState<string>(firstStudent?.rombelSaatIni || firstStudent?.kelas || '');
  const [nomorUjian, setNomorUjian] = useState<string>(firstStudent?.nomorUjian || '');
  const [ruangUjian, setRuangUjian] = useState<string>(firstStudent?.ruangUjian || 'R.01');
  const [sesiUjian, setSesiUjian] = useState<string>(
    firstStudent?.sesiUjian || settings.sesiTersedia?.[0] || 'Sesi 1 (07.30 - 09.30)'
  );
  const [mataPelajaran, setMataPelajaran] = useState<string>(firstMapel);
  const [jamMulai, setJamMulai] = useState<string>('07:30');
  const [jamHadir, setJamHadir] = useState<string>('07:50');
  const [alasan, setAlasan] = useState<string>(ALASAN_PRESETS[0]);
  const [keputusan, setKeputusan] = useState<string>(KEPUTUSAN_PRESETS[0]);
  const [petugasId, setPetugasId] = useState<string>(defaultPetugas?.id || 'current_user');
  const [petugasNama, setPetugasNama] = useState<string>(
    defaultPetugas?.nama || currentUser.name
  );
  const [petugasJabatan, setPetugasJabatan] = useState<string>(
    defaultPetugas ? `${defaultPetugas.jabatanKepanitiaan} Panitia Ujian` : currentUser.jabatan
  );
  const [petugasNip, setPetugasNip] = useState<string>(defaultPetugas?.nip || currentUser.nip);

  const [printScope, setPrintScope] = useState<
    'draft_individu' | 'record_individu' | 'massal' | 'blanko_kosong'
  >('draft_individu');
  const [blankoSheetCount, setBlankoSheetCount] = useState<number>(1);
  const [blankoKosongkanPetugas, setBlankoKosongkanPetugas] = useState<boolean>(true);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const standalonePortalUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://sman9sby.sch.id';
    return `${origin}/?view=izin-ujian`;
  }, []);

  const handleCopyPortalLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(standalonePortalUrl).catch(() => {});
    }
    setCopiedPortalLink(true);
    window.setTimeout(() => setCopiedPortalLink(false), 2500);
  };

  const handleActivateBlanko6Up = () => {
    setPrintScope('blanko_kosong');
    setLayoutConfig(prev => ({
      ...prev,
      ukuranSurat: 'mini',
      miniDivision: '6up'
    }));
  };

  const filteredStudents = useMemo(() => {
    const q = searchStudent.toLowerCase().trim();
    if (!q) return activeSiswa.slice(0, 60);
    return activeSiswa
      .filter(
        s =>
          s.nama.toLowerCase().includes(q) ||
          (s.nis || '').toLowerCase().includes(q) ||
          (s.nisn || '').toLowerCase().includes(q) ||
          (s.nomorUjian || '').toLowerCase().includes(q) ||
          (s.rombelSaatIni || s.kelas || '').toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [activeSiswa, searchStudent]);

  const handlePickStudent = (siswaId: string) => {
    setSelectedSiswaId(siswaId);
    const s = activeSiswa.find(x => x.id === siswaId);
    if (!s) return;
    setNamaSiswa(s.nama);
    setNis(s.nis || s.nipd || '-');
    setNisn(s.nisn || '-');
    setKelas(s.rombelSaatIni || s.kelas || '-');
    setNomorUjian(s.nomorUjian || '-');
    setRuangUjian(s.ruangUjian || 'R.01');
    setSesiUjian(s.sesiUjian || settings.sesiTersedia?.[0] || 'Sesi 1 (07.30 - 09.30)');
  };

  const handlePickPetugas = (val: string) => {
    setPetugasId(val);
    if (val === 'current_user') {
      setPetugasNama(currentUser.name);
      setPetugasJabatan(currentUser.jabatan);
      setPetugasNip(currentUser.nip);
      return;
    }
    const found = petugasOptions.find(p => p.id === val);
    if (found) {
      setPetugasNama(found.nama);
      setPetugasJabatan(`${found.jabatanKepanitiaan} (${found.kategori === 'panitia' ? 'Panitia' : 'Pengawas'})`);
      setPetugasNip(found.nip || '-');
    }
  };

  const menitTerlambat = computeLateMinutes(jamMulai, jamHadir);

  const draftRecord: SuratIjinRecord = useMemo(
    () => ({
      id: 'draft',
      nomorSurat,
      tanggalSurat,
      siswaId: selectedSiswaId || undefined,
      namaSiswa: namaSiswa || '........................................',
      nis: nis || '-',
      nisn: nisn || '-',
      kelas: kelas || '-',
      nomorUjian: nomorUjian || '-',
      ruangUjian: ruangUjian || '-',
      sesiUjian: sesiUjian || '-',
      mataPelajaran: mataPelajaran || '-',
      jamMulai,
      jamHadir,
      menitTerlambat,
      alasan,
      keputusan,
      petugasNama: petugasNama || currentUser.name,
      petugasJabatan: petugasJabatan || currentUser.jabatan,
      petugasNip,
      createdAt: new Date().toISOString()
    }),
    [
      nomorSurat,
      tanggalSurat,
      selectedSiswaId,
      namaSiswa,
      nis,
      nisn,
      kelas,
      nomorUjian,
      ruangUjian,
      sesiUjian,
      mataPelajaran,
      jamMulai,
      jamHadir,
      menitTerlambat,
      alasan,
      keputusan,
      petugasNama,
      currentUser.name,
      currentUser.jabatan,
      petugasJabatan,
      petugasNip
    ]
  );

  // Hitung geometri kertas & pembagian merata berdasarkan A4 / Folio dan Mini / Sedang / Penuh
  const geometry = useMemo(() => {
    const paper = PAPER_SPECS[layoutConfig.paperSize];
    const marginMm = layoutConfig.marginMm;
    const gapMm = layoutConfig.ukuranSurat === 'penuh' ? 0 : layoutConfig.gapMm;

    let cols = 1;
    let rows = 1;
    if (layoutConfig.ukuranSurat === 'sedang') {
      cols = 1;
      rows = 2;
    } else if (layoutConfig.ukuranSurat === 'mini') {
      cols = 2;
      rows = layoutConfig.miniDivision === '6up' ? 3 : 2;
    }

    const perPage = cols * rows;
    const printableW = paper.widthMm - marginMm * 2;
    const printableH = paper.heightMm - marginMm * 2;
    const slotW = (printableW - gapMm * (cols - 1)) / cols;
    const slotH = (printableH - gapMm * (rows - 1)) / rows;

    const sizeLabel =
      layoutConfig.ukuranSurat === 'penuh'
        ? 'Penuh (1/Hal)'
        : layoutConfig.ukuranSurat === 'sedang'
          ? 'Sedang (2/Hal · 1×2)'
          : layoutConfig.miniDivision === '6up'
            ? 'Mini Padat (6/Hal · 2×3)'
            : 'Mini (4/Hal · 2×2)';

    return {
      paper,
      marginMm,
      gapMm,
      cols,
      rows,
      perPage,
      printableW,
      printableH,
      slotW,
      slotH,
      sizeLabel
    };
  }, [layoutConfig]);

  const handleSaveToDaftar = () => {
    if (!namaSiswa.trim()) {
      setStatusMsg({ type: 'error', text: 'Nama siswa wajib diisi sebelum menyimpan surat ijin.' });
      return;
    }

    const newRec: SuratIjinRecord = {
      ...draftRecord,
      id: `ijin-${Date.now()}`
    };

    const nextList = [newRec, ...savedRecords];
    setSavedRecords(nextList);
    setSelectedRecordIds(prev => [newRec.id, ...prev]);

    if (onUpdateSiswa && selectedSiswaId) {
      const target = siswaList.find(s => s.id === selectedSiswaId);
      if (target && (target.ruangUjian !== ruangUjian || target.sesiUjian !== sesiUjian)) {
        onUpdateSiswa(
          siswaList.map(s =>
            s.id === selectedSiswaId ? { ...s, ruangUjian, sesiUjian } : s
          )
        );
      }
    }

    const nextSeq = nextList.length + 1;
    setNomorSurat(
      `421.3/${String(nextSeq).padStart(3, '0')}/IJIN-${(settings.semester || 'PSAS').replace(/\s+/g, '').toUpperCase().slice(0, 6)}/2026`
    );
    appendAuditLog(
      'SURAT_IJIN_MASUK_UJIAN',
      `Menerbitkan Surat Ijin Masuk Ujian ${newRec.nomorSurat} untuk ${newRec.namaSiswa} (${newRec.kelas}, terlambat ${newRec.menitTerlambat} menit).`
    );
    setStatusMsg({
      type: 'success',
      text: `Surat ijin masuk ujian untuk ${newRec.namaSiswa} berhasil disimpan ke daftar antrean cetak.`
    });
  };

  const baseRecordsToPrint = useMemo(() => {
    if (printScope === 'record_individu' && activeRecordId) {
      const found = savedRecords.find(r => r.id === activeRecordId);
      return found ? [found] : [draftRecord];
    }
    if (printScope === 'massal') {
      if (selectedRecordIds.length > 0) {
        return savedRecords.filter(r => selectedRecordIds.includes(r.id));
      }
      return savedRecords.length > 0 ? savedRecords : [draftRecord];
    }
    return [draftRecord];
  }, [printScope, activeRecordId, savedRecords, selectedRecordIds, draftRecord]);

  const makeBlankoTemplate = (suffix: string): SuratIjinRecord => ({
    id: `blanko-${suffix}`,
    nomorSurat: `421.3/...../IJIN-${(settings.semester || 'PSAS').replace(/\s+/g, '').toUpperCase().slice(0, 6)}/2026`,
    tanggalSurat: '',
    namaSiswa: '',
    nis: '',
    nisn: '',
    kelas: '',
    nomorUjian: '',
    ruangUjian: '',
    sesiUjian: '',
    mataPelajaran: '',
    jamMulai: '',
    jamHadir: '',
    menitTerlambat: 0,
    alasan: '',
    keputusan: 'Diizinkan / Tidak Diizinkan* masuk ruang ujian sesuai tata tertib',
    petugasNama: blankoKosongkanPetugas ? '' : draftRecord.petugasNama,
    petugasJabatan: blankoKosongkanPetugas
      ? 'Petugas Piket / Panitia Ujian'
      : draftRecord.petugasJabatan,
    petugasNip: blankoKosongkanPetugas ? '' : draftRecord.petugasNip,
    createdAt: draftRecord.createdAt,
    isBlanko: true
  });

  // Untuk mode blanko_kosong maupun individu pada ukuran mini/sedang
  const recordsToPrint = useMemo(() => {
    if (printScope === 'blanko_kosong') {
      const totalBlanko = geometry.perPage * Math.max(1, blankoSheetCount);
      return Array.from({ length: totalBlanko }, (_, idx) =>
        makeBlankoTemplate(`sheet-${idx + 1}`)
      );
    }

    if (layoutConfig.ukuranSurat === 'penuh') return baseRecordsToPrint;
    if (printScope === 'massal') return baseRecordsToPrint;
    if (baseRecordsToPrint.length !== 1) return baseRecordsToPrint;

    const primary = baseRecordsToPrint[0];
    const perPage = geometry.perPage;
    if (layoutConfig.individuFillMode === 'fill_copy') {
      return Array.from({ length: perPage }, (_, idx) => ({
        ...primary,
        id: `${primary.id}-copy-${idx}`
      }));
    }
    if (layoutConfig.individuFillMode === 'fill_blanko') {
      return [
        primary,
        ...Array.from({ length: perPage - 1 }, (_, idx) =>
          makeBlankoTemplate(`fill-${idx + 1}`)
        )
      ];
    }
    return baseRecordsToPrint;
  }, [
    printScope,
    blankoSheetCount,
    blankoKosongkanPetugas,
    baseRecordsToPrint,
    layoutConfig.ukuranSurat,
    layoutConfig.individuFillMode,
    geometry.perPage,
    settings.semester,
    draftRecord.petugasNama,
    draftRecord.petugasJabatan,
    draftRecord.petugasNip,
    draftRecord.createdAt
  ]);

  const effectiveStempelUrl = settings.stempelUrl || '';

  const handlePrint = () => {
    appendAuditLog(
      'CETAK_IJIN_MASUK_UJIAN',
      `Mencetak ${recordsToPrint.length} Surat Ijin Masuk Ujian (${geometry.paper.shortLabel} · ${geometry.sizeLabel}).`
    );
    window.print();
  };

  const multiPages = useMemo(() => {
    if (layoutConfig.ukuranSurat === 'penuh') return [];
    const pages: SuratIjinRecord[][] = [];
    for (let i = 0; i < recordsToPrint.length; i += geometry.perPage) {
      pages.push(recordsToPrint.slice(i, i + geometry.perPage));
    }
    return pages;
  }, [recordsToPrint, layoutConfig.ukuranSurat, geometry.perPage]);

  const typoSpec = useMemo(() => {
    const fontMeta = SURAT_FONT_OPTIONS[layoutConfig.fontFamily || 'inter'] || SURAT_FONT_OPTIONS.inter;
    const spacingMeta =
      LINE_SPACING_SPECS[layoutConfig.lineSpacing || 'nyaman'] || LINE_SPACING_SPECS.nyaman;
    const scale = (layoutConfig.fontScalePct || 100) / 100;
    const letterSpacingCss = layoutConfig.letterSpacing === 'lebar' ? '0.025em' : '0em';
    return {
      fontMeta,
      spacingMeta,
      scale,
      letterSpacingCss,
      px: (basePx: number) => `${(basePx * scale).toFixed(2)}px`
    };
  }, [
    layoutConfig.fontFamily,
    layoutConfig.fontScalePct,
    layoutConfig.lineSpacing,
    layoutConfig.letterSpacing
  ]);

  const renderBlankLine = (widthClass = 'w-full') => (
    <span
      className={`inline-block border-b border-dotted border-slate-600 align-baseline h-[1.05em] ${widthClass}`}
      aria-hidden="true"
    />
  );

  const renderFullSurat = (rec: SuratIjinRecord, idx: number) => (
    <div
      key={`${rec.id}-${idx}`}
      style={{
        fontFamily: typoSpec.fontMeta.css,
        letterSpacing: typoSpec.letterSpacingCss,
        lineHeight: typoSpec.spacingMeta.lineHeight
      }}
      className="ijin-page ijin-sheet-full bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col justify-between"
    >
      <div>
        <OfficialKopSurat profile={profile} />

        <div className="text-center mt-2 mb-4">
          <div
            style={{ fontSize: typoSpec.px(15) }}
            className="font-black uppercase tracking-wide underline"
          >
            SURAT IZIN MASUK MENGIKUTI UJIAN (SISWA TERLAMBAT)
          </div>
          <div
            style={{ fontSize: typoSpec.px(11.5) }}
            className="font-semibold text-slate-700 mt-1 tabular-nums"
          >
            Nomor: {rec.nomorSurat}
          </div>
        </div>

        <div
          style={{ fontSize: typoSpec.px(12.5), lineHeight: typoSpec.spacingMeta.lineHeight }}
          className={typoSpec.spacingMeta.sectionGap}
        >
          <p>
            Yang bertanda tangan di bawah ini, Petugas Piket / Panitia Penyelenggara{' '}
            <strong>{settings.namaUjian}</strong> Tahun Pelajaran{' '}
            <strong>{settings.tahunPelajaran}</strong> {profile.namaSekolah}, menerangkan bahwa peserta
            didik berikut:
          </p>

          <table
            style={{ fontSize: typoSpec.px(12.5), lineHeight: typoSpec.spacingMeta.lineHeight }}
            className="w-full border-collapse my-2"
          >
            <tbody>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} w-48 font-semibold`}>Nama Peserta Didik</td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} w-4`}>:</td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-bold uppercase`}>
                  {rec.isBlanko ? renderBlankLine('w-full') : rec.namaSiswa}
                </td>
              </tr>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>NIS / NISN</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>:</td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} tabular-nums`}>
                  {rec.isBlanko ? (
                    <span className="inline-flex items-baseline gap-2 w-full">
                      {renderBlankLine('w-36')} <span>/</span> {renderBlankLine('w-40')}
                    </span>
                  ) : (
                    `${rec.nis} / ${rec.nisn}`
                  )}
                </td>
              </tr>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>Kelas / Rombel</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>:</td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>
                  {rec.isBlanko ? renderBlankLine('w-44') : rec.kelas}
                </td>
              </tr>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>Nomor Peserta Ujian</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>:</td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-bold tabular-nums`}>
                  {rec.isBlanko ? renderBlankLine('w-56') : rec.nomorUjian}
                </td>
              </tr>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>Ruang / Sesi Ujian</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>:</td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>
                  {rec.isBlanko ? (
                    <span className="inline-flex items-baseline gap-2">
                      <span>Ruang</span> {renderBlankLine('w-20')} <span>• Sesi</span> {renderBlankLine('w-36')}
                    </span>
                  ) : (
                    `Ruang ${rec.ruangUjian} • ${rec.sesiUjian}`
                  )}
                </td>
              </tr>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>Hari, Tanggal Ujian</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>:</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>
                  {formatTanggalIndo(rec.tanggalSurat)}
                </td>
              </tr>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>Mata Pelajaran</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>:</td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-bold`}>
                  {rec.isBlanko ? renderBlankLine('w-full') : rec.mataPelajaran}
                </td>
              </tr>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold`}>Jadwal Mulai / Jam Hadir</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>:</td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} tabular-nums`}>
                  {rec.isBlanko ? (
                    <span className="inline-flex items-baseline gap-2">
                      <span>Mulai</span> {renderBlankLine('w-16')} <span>WIB / Hadir</span>{' '}
                      {renderBlankLine('w-16')} <span>WIB</span>
                    </span>
                  ) : (
                    <>
                      {rec.jamMulai} WIB / Hadir {rec.jamHadir} WIB{' '}
                      <span className="font-bold text-rose-800">
                        (Terlambat {rec.menitTerlambat} menit)
                      </span>
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <td className={`${typoSpec.spacingMeta.fullRowPy} font-semibold align-top`}>
                  Alasan Keterlambatan
                </td>
                <td className={`${typoSpec.spacingMeta.fullRowPy} align-top`}>:</td>
                <td className={typoSpec.spacingMeta.fullRowPy}>
                  {rec.isBlanko ? (
                    <div className="space-y-2 pt-1">
                      {renderBlankLine('w-full')}
                      {renderBlankLine('w-full')}
                    </div>
                  ) : (
                    rec.alasan
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="p-3.5 border border-slate-800 rounded bg-slate-50/70">
            <div
              style={{ fontSize: typoSpec.px(11) }}
              className="font-bold uppercase tracking-wide text-slate-800 mb-1"
            >
              Keputusan Panitia / Petugas Piket Ujian:
            </div>
            <p className="font-semibold text-slate-950">
              {rec.isBlanko
                ? '☐ Diizinkan   ☐ Tidak Diizinkan  masuk ruang ujian sesuai tata tertib yang berlaku.'
                : `${rec.keputusan}.`}
            </p>
            <p style={{ fontSize: typoSpec.px(11) }} className="text-slate-700 mt-1">
              Kepada Pengawas Ruang <strong>{rec.isBlanko ? '...........' : rec.ruangUjian}</strong> dimohon
              menerima surat izin ini dan mencatat kehadiran peserta pada Berita Acara Pelaksanaan Ujian.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{ fontSize: typoSpec.px(12) }}
        className="mt-6 flex items-end justify-between gap-6"
      >
        <div className="space-y-2">
          <ExamCardBarcode
            value={
              rec.isBlanko
                ? standalonePortalUrl
                : `IJIN-UJIAN|${rec.nomorSurat}|${rec.nomorUjian}|${rec.namaSiswa}|${rec.tanggalSurat}`
            }
            mode="qr_link"
            size={64}
          />
          <div style={{ fontSize: typoSpec.px(10) }} className="text-slate-600 max-w-[190px]">
            {rec.isBlanko
              ? 'Scan QR untuk buka form ijin • Dicatat di Berita Acara'
              : 'Arsip Ruang / Pengawas • Dicatat dalam Berita Acara Ujian'}
          </div>
        </div>

        <div className="text-left min-w-[230px] relative">
          <div>
            {rec.isBlanko ? (
              <span>
                Surabaya, {renderBlankLine('w-28')} 20...
              </span>
            ) : (
              `Surabaya, ${formatTanggalIndo(rec.tanggalSurat).replace(/^[^,]+,\s*/, '')}`
            )}
          </div>
          <div className="font-semibold">{rec.petugasJabatan},</div>
          <div className="relative h-16 my-1 flex items-center">
            {settings.showStempel && (
              <div className="absolute -left-6 -top-1 w-16 h-16 opacity-85 pointer-events-none">
                {effectiveStempelUrl ? (
                  <img src={effectiveStempelUrl} alt="Stempel" className="w-full h-full object-contain" />
                ) : (
                  <SchoolStampSvg className="w-full h-full" />
                )}
              </div>
            )}
          </div>
          {rec.petugasNama ? (
            <div className="font-bold underline relative z-10">{rec.petugasNama}</div>
          ) : (
            <div className="font-bold relative z-10">{renderBlankLine('w-44')}</div>
          )}
          {rec.petugasNip && rec.petugasNip !== '-' && (
            <div style={{ fontSize: typoSpec.px(10.5) }} className="tabular-nums">
              NIP. {rec.petugasNip}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render slip ukuran SEDANG (2 surat / halaman — pembagian merata atas & bawah untuk A4 maupun Folio)
  const renderSedangSlip = (rec: SuratIjinRecord, idx: number) => (
    <div
      key={`${rec.id}-${idx}`}
      style={{
        fontFamily: typoSpec.fontMeta.css,
        letterSpacing: typoSpec.letterSpacingCss,
        lineHeight: typoSpec.spacingMeta.lineHeight
      }}
      className="print-card-avoid border border-dashed border-slate-500 px-4 py-3 bg-white text-slate-950 flex flex-col justify-between h-full w-full box-border overflow-hidden"
    >
      <div className="flex-1 flex flex-col justify-between">
        {/* Kop Surat Sedang Ringkas */}
        <div className="border-b-2 border-slate-900 pb-1.5 mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {profile.logoUrl && !profile.logoUrl.includes('Lambang_Provinsi_Jawa_Timur') ? (
              <img
                src={resolveDirectImageUrl(profile.logoUrl)}
                alt={profile.namaSekolah}
                className="w-9 h-9 object-contain shrink-0"
                onError={e => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : profile.logoType === 'default' || profile.logoType === 'default_vector' ? (
              <Sman9SurabayaLogoSvg customUrl={profile.sekolahLogoUrl} className="w-8 h-9 shrink-0" />
            ) : (
              <PemprovJatimLogo customUrl={profile.pemprovLogoUrl} className="w-8 h-9 shrink-0" />
            )}
            <div className="min-w-0">
              <div
                style={{ fontSize: typoSpec.px(9) }}
                className="font-bold uppercase tracking-wide text-slate-700 truncate"
              >
                PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN
              </div>
              <div
                style={{ fontSize: typoSpec.px(12) }}
                className="font-black uppercase text-slate-950 truncate"
              >
                {profile.namaSekolah} — {settings.namaUjian}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div
              style={{ fontSize: typoSpec.px(11) }}
              className="font-black uppercase underline tracking-tight"
            >
              SURAT IZIN MASUK UJIAN
            </div>
            <div
              style={{ fontSize: typoSpec.px(9.2) }}
              className="font-semibold text-slate-700 tabular-nums"
            >
              No: {rec.nomorSurat}
            </div>
          </div>
        </div>

        {/* Data Siswa 2 Kolom Seimbang */}
        <div
          style={{ fontSize: typoSpec.px(10.5), lineHeight: typoSpec.spacingMeta.lineHeight }}
          className="grid grid-cols-2 gap-x-5 gap-y-1 my-auto"
        >
          <div className={`flex items-baseline gap-1.5 ${typoSpec.spacingMeta.sedangRowPy}`}>
            <span className="w-24 font-semibold shrink-0">Nama Siswa</span>
            <span>:</span>
            <span className="font-bold uppercase truncate flex-1">
              {rec.isBlanko ? renderBlankLine('w-full') : rec.namaSiswa}
            </span>
          </div>
          <div className={`flex items-baseline gap-1.5 ${typoSpec.spacingMeta.sedangRowPy}`}>
            <span className="w-24 font-semibold shrink-0">Hari / Tanggal</span>
            <span>:</span>
            <span className="truncate flex-1">
              {rec.isBlanko
                ? renderBlankLine('w-full')
                : formatTanggalIndo(rec.tanggalSurat).replace(/^[^,]+,\s*/, '')}
            </span>
          </div>
          <div className={`flex items-baseline gap-1.5 ${typoSpec.spacingMeta.sedangRowPy}`}>
            <span className="w-24 font-semibold shrink-0">NIS / Kelas</span>
            <span>:</span>
            <span className="font-semibold truncate flex-1 tabular-nums">
              {rec.isBlanko ? (
                <span className="inline-flex items-baseline gap-1.5 w-full">
                  {renderBlankLine('flex-1')} <span>/</span> {renderBlankLine('w-16')}
                </span>
              ) : (
                `${rec.nis} • ${rec.kelas}`
              )}
            </span>
          </div>
          <div className={`flex items-baseline gap-1.5 ${typoSpec.spacingMeta.sedangRowPy}`}>
            <span className="w-24 font-semibold shrink-0">Mata Pelajaran</span>
            <span>:</span>
            <span className="font-bold truncate flex-1">
              {rec.isBlanko ? renderBlankLine('w-full') : rec.mataPelajaran}
            </span>
          </div>
          <div className={`flex items-baseline gap-1.5 ${typoSpec.spacingMeta.sedangRowPy}`}>
            <span className="w-24 font-semibold shrink-0">No. Peserta</span>
            <span>:</span>
            <span className="font-bold truncate flex-1 tabular-nums">
              {rec.isBlanko ? renderBlankLine('w-full') : rec.nomorUjian}
            </span>
          </div>
          <div className={`flex items-baseline gap-1.5 ${typoSpec.spacingMeta.sedangRowPy}`}>
            <span className="w-24 font-semibold shrink-0">Ruang & Sesi</span>
            <span>:</span>
            <span className="font-semibold truncate flex-1">
              {rec.isBlanko ? (
                <span className="inline-flex items-baseline gap-1.5 w-full">
                  <span>R.</span>
                  {renderBlankLine('w-12')} <span>•</span> {renderBlankLine('flex-1')}
                </span>
              ) : (
                `Ruang ${rec.ruangUjian} • ${rec.sesiUjian}`
              )}
            </span>
          </div>
          <div className={`flex items-baseline gap-1.5 col-span-2 ${typoSpec.spacingMeta.sedangRowPy}`}>
            <span className="w-24 font-semibold shrink-0">Jam Hadir</span>
            <span>:</span>
            <span className="flex-1 tabular-nums">
              {rec.isBlanko ? (
                <span className="inline-flex items-baseline gap-2">
                  <span>Mulai</span> {renderBlankLine('w-14')} <span>WIB • Hadir</span>{' '}
                  {renderBlankLine('w-14')} <span>WIB</span>
                </span>
              ) : (
                <>
                  Mulai {rec.jamMulai} WIB • Hadir {rec.jamHadir} WIB{' '}
                  <strong className="text-rose-800">(Terlambat {rec.menitTerlambat} menit)</strong>
                </>
              )}
            </span>
          </div>
          <div className={`flex items-start gap-1.5 col-span-2 ${typoSpec.spacingMeta.sedangRowPy}`}>
            <span className="w-24 font-semibold shrink-0">Alasan</span>
            <span>:</span>
            <span className="flex-1">
              {rec.isBlanko ? renderBlankLine('w-full') : <span className="line-clamp-2">{rec.alasan}</span>}
            </span>
          </div>
        </div>

        <div
          style={{ fontSize: typoSpec.px(10) }}
          className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-700 mt-1.5"
        >
          <span className="font-bold uppercase text-slate-800">Keputusan Panitia: </span>
          <span className="font-semibold text-slate-950">
            {rec.isBlanko
              ? '☐ Diizinkan   ☐ Tidak Diizinkan  masuk ruang ujian sesuai tata tertib.'
              : `${rec.keputusan}.`}
          </span>
        </div>
      </div>

      {/* Footer TTD & QR */}
      <div
        style={{ fontSize: typoSpec.px(10) }}
        className="pt-2 mt-2 border-t border-slate-200 flex items-end justify-between gap-4"
      >
        <div className="flex items-center gap-2.5">
          <ExamCardBarcode
            value={
              rec.isBlanko
                ? standalonePortalUrl
                : `IJIN|${rec.nomorSurat}|${rec.nomorUjian}|${rec.namaSiswa}`
            }
            mode="qr_link"
            size={44}
          />
          <div style={{ fontSize: typoSpec.px(9) }} className="text-slate-600 max-w-[200px] leading-tight">
            Diserahkan kepada Pengawas Ruang{' '}
            <strong>{rec.isBlanko ? '......' : rec.ruangUjian}</strong> untuk dicatat pada Berita Acara Ujian.
          </div>
        </div>

        <div className="flex items-end gap-8">
          <div className="text-left min-w-[130px]">
            <div>Pengawas Ruang {rec.isBlanko ? '......' : rec.ruangUjian},</div>
            <div className="h-9" />
            <div className="font-semibold text-slate-700">
              ( {renderBlankLine('w-28')} )
            </div>
          </div>

          <div className="text-left min-w-[175px] relative">
            <div>Petugas Piket / Panitia,</div>
            <div className="relative h-9 flex items-center">
              {settings.showStempel && (
                <div className="absolute -left-5 -top-1 w-11 h-11 opacity-80 pointer-events-none">
                  {effectiveStempelUrl ? (
                    <img src={effectiveStempelUrl} alt="Stempel" className="w-full h-full object-contain" />
                  ) : (
                    <SchoolStampSvg className="w-full h-full" />
                  )}
                </div>
              )}
            </div>
            {rec.petugasNama ? (
              <div className="font-bold underline relative z-10">{rec.petugasNama}</div>
            ) : (
              <div className="font-semibold text-slate-700 relative z-10">
                ( {renderBlankLine('w-28')} )
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render slip ukuran MINI (4/Hal 2×2 atau 6/Hal 2×3 — menyesuaikan tinggi A4 maupun Folio secara merata)
  const renderMiniSlip = (rec: SuratIjinRecord, idx: number) => {
    const isDense6 = layoutConfig.miniDivision === '6up';
    const rowPadClass = isDense6
      ? typoSpec.spacingMeta.mini6RowPy
      : typoSpec.spacingMeta.miniRowPy;
    const labelW = isDense6 ? 'w-[66px]' : 'w-[76px]';

    return (
      <div
        key={`${rec.id}-${idx}`}
        style={{
          fontFamily: typoSpec.fontMeta.css,
          letterSpacing: typoSpec.letterSpacingCss,
          lineHeight: typoSpec.spacingMeta.lineHeight
        }}
        className={`print-card-avoid border border-dashed border-slate-500 bg-white text-slate-950 flex flex-col justify-between h-full w-full box-border overflow-hidden ${
          isDense6 ? 'px-2.5 py-2' : 'px-3 py-2.5'
        }`}
      >
        {/* Header 2 Baris Rapi & Tidak Terpotong */}
        <div
          className={`border-b-2 border-slate-900 shrink-0 ${
            isDense6 ? 'pb-1 mb-1' : 'pb-1.5 mb-1.5'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className={`${isDense6 ? 'w-4 h-4.5' : 'w-5 h-5.5'} shrink-0 flex items-center justify-center`}>
                {profile.logoUrl && !profile.logoUrl.includes('Lambang_Provinsi_Jawa_Timur') ? (
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
              <div
                style={{ fontSize: typoSpec.px(isDense6 ? 7.6 : 8.6) }}
                className="font-bold uppercase text-slate-700 truncate"
              >
                {profile.namaSekolah} • {settings.namaUjian}
              </div>
            </div>
            <div
              style={{ fontSize: typoSpec.px(isDense6 ? 7.5 : 8.3) }}
              className="font-semibold text-slate-600 shrink-0 tabular-nums"
            >
              {rec.isBlanko ? 'Tgl: .... / .... / 20...' : rec.tanggalSurat}
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-0.5">
            <div
              style={{ fontSize: typoSpec.px(isDense6 ? 9.8 : 11.2) }}
              className="font-black uppercase tracking-wide leading-tight text-slate-950 whitespace-nowrap"
            >
              SURAT IZIN MASUK UJIAN
            </div>
            <div
              style={{ fontSize: typoSpec.px(isDense6 ? 7.4 : 8.2) }}
              className="font-semibold text-slate-700 text-right shrink-0 tabular-nums"
            >
              {rec.nomorSurat}
            </div>
          </div>
        </div>

        {/* Isi Data Siswa — Distribusi Vertikal Merata & Garis Tulis Bersih */}
        <div className="flex-1 flex flex-col justify-evenly min-h-0">
          <div
            style={{
              fontSize: typoSpec.px(isDense6 ? 8.8 : 9.8),
              lineHeight: typoSpec.spacingMeta.lineHeight
            }}
            className="w-full"
          >
            <div className={`flex items-baseline gap-1.5 ${rowPadClass}`}>
              <span className={`${labelW} font-semibold shrink-0 text-slate-800`}>Nama</span>
              <span className="shrink-0">:</span>
              <span className="flex-1 min-w-0 font-bold uppercase truncate">
                {rec.isBlanko ? renderBlankLine('w-full') : rec.namaSiswa}
              </span>
            </div>

            <div className={`flex items-baseline gap-1.5 ${rowPadClass}`}>
              <span className={`${labelW} font-semibold shrink-0 text-slate-800`}>NIS / Kelas</span>
              <span className="shrink-0">:</span>
              <span className="flex-1 min-w-0 font-semibold truncate tabular-nums">
                {rec.isBlanko ? (
                  <span className="inline-flex items-baseline gap-1.5 w-full">
                    {renderBlankLine('flex-1')}
                    <span className="shrink-0">/</span>
                    {renderBlankLine('w-16')}
                  </span>
                ) : (
                  `${rec.nis} • ${rec.kelas}`
                )}
              </span>
            </div>

            <div className={`flex items-baseline gap-1.5 ${rowPadClass}`}>
              <span className={`${labelW} font-semibold shrink-0 text-slate-800`}>No. Ujian</span>
              <span className="shrink-0">:</span>
              <span className="flex-1 min-w-0 font-bold truncate tabular-nums">
                {rec.isBlanko ? (
                  <span className="inline-flex items-baseline gap-1.5 w-full">
                    {renderBlankLine('flex-1')}
                    <span className="shrink-0 font-semibold text-slate-700">R.</span>
                    {renderBlankLine('w-10')}
                  </span>
                ) : (
                  `${rec.nomorUjian} (R.${rec.ruangUjian})`
                )}
              </span>
            </div>

            <div className={`flex items-baseline gap-1.5 ${rowPadClass}`}>
              <span className={`${labelW} font-semibold shrink-0 text-slate-800`}>Mapel / Sesi</span>
              <span className="shrink-0">:</span>
              <span className="flex-1 min-w-0 truncate">
                {rec.isBlanko ? (
                  <span className="inline-flex items-baseline gap-1.5 w-full">
                    {renderBlankLine('flex-1')}
                    <span className="shrink-0">•</span>
                    {renderBlankLine('w-14')}
                  </span>
                ) : (
                  <>
                    <strong>{rec.mataPelajaran}</strong> • {rec.sesiUjian}
                  </>
                )}
              </span>
            </div>

            <div className={`flex items-baseline gap-1.5 ${rowPadClass}`}>
              <span className={`${labelW} font-semibold shrink-0 text-slate-800`}>Jam Hadir</span>
              <span className="shrink-0">:</span>
              <span className="flex-1 min-w-0 tabular-nums">
                {rec.isBlanko ? (
                  <span className="inline-flex items-baseline gap-1.5 w-full">
                    {renderBlankLine('w-12')}
                    <span className="shrink-0">:</span>
                    {renderBlankLine('w-12')}
                    <span className="shrink-0 font-semibold">WIB</span>
                  </span>
                ) : (
                  <>
                    {rec.jamHadir} WIB{' '}
                    <strong className="text-rose-800">(+{rec.menitTerlambat} mnt)</strong>
                  </>
                )}
              </span>
            </div>

            <div className={`flex items-start gap-1.5 ${rowPadClass}`}>
              <span className={`${labelW} font-semibold shrink-0 text-slate-800`}>Alasan</span>
              <span className="shrink-0">:</span>
              <span className="flex-1 min-w-0">
                {rec.isBlanko ? (
                  <span className="block space-y-1.5 pt-0.5">
                    {renderBlankLine('w-full')}
                    {!isDense6 && renderBlankLine('w-full')}
                  </span>
                ) : (
                  <span className={isDense6 ? 'line-clamp-2' : 'line-clamp-2'}>{rec.alasan}</span>
                )}
              </span>
            </div>
          </div>

          {/* Kotak Keputusan Mudah Dibaca */}
          <div
            style={{ fontSize: typoSpec.px(isDense6 ? 8.2 : 9) }}
            className={`rounded bg-slate-50 border border-slate-500 font-semibold leading-snug ${
              isDense6 ? 'px-2 py-1 mt-1' : 'px-2.5 py-1.5 mt-1.5'
            }`}
          >
            {rec.isBlanko ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="font-bold text-slate-800">Keputusan:</span>
                <span>☐ Diizinkan</span>
                <span>☐ Tidak Diizinkan masuk ruang ujian</span>
              </div>
            ) : (
              <div className="line-clamp-2">
                <span className="font-bold">Keputusan:</span> {rec.keputusan}
              </div>
            )}
          </div>
        </div>

        {/* Footer QR & Tanda Tangan */}
        <div
          style={{ fontSize: typoSpec.px(isDense6 ? 8.2 : 9) }}
          className={`border-t border-slate-300 flex items-end justify-between gap-2 shrink-0 ${
            isDense6 ? 'pt-1.5 mt-1' : 'pt-2 mt-1.5'
          }`}
        >
          <div className="flex items-end gap-2">
            <ExamCardBarcode
              value={
                rec.isBlanko
                  ? standalonePortalUrl
                  : `IJIN|${rec.nomorSurat}|${rec.nomorUjian}|${rec.namaSiswa}`
              }
              mode="qr_link"
              size={isDense6 ? 32 : 40}
            />
            <div
              style={{ fontSize: typoSpec.px(isDense6 ? 7.2 : 7.8) }}
              className="text-slate-600 leading-tight max-w-[100px]"
            >
              {rec.isBlanko ? 'Scan buka form / Serahkan Pengawas' : 'Serahkan ke Pengawas Ruang'}
            </div>
          </div>

          <div className="text-left min-w-[125px] relative">
            <div className="font-medium text-slate-800">Petugas Piket / Panitia,</div>
            <div className={`relative flex items-center ${isDense6 ? 'h-6' : 'h-8'}`}>
              {settings.showStempel && (
                <div
                  className={`absolute pointer-events-none opacity-80 ${
                    isDense6 ? '-left-4 -top-1 w-8 h-8' : '-left-5 -top-1 w-10 h-10'
                  }`}
                >
                  {effectiveStempelUrl ? (
                    <img src={effectiveStempelUrl} alt="Stempel" className="w-full h-full object-contain" />
                  ) : (
                    <SchoolStampSvg className="w-full h-full" />
                  )}
                </div>
              )}
            </div>
            {rec.petugasNama ? (
              <div className="font-bold underline relative z-10 truncate max-w-[145px]">
                {rec.petugasNama}
              </div>
            ) : (
              <div className="font-semibold text-slate-700 relative z-10">
                ( {renderBlankLine('w-24')} )
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={isStandalone ? 'min-h-screen bg-slate-100 p-3 sm:p-5 space-y-4 print:bg-white print:p-0' : 'space-y-4'}>
      <style>{`
        @page {
          size: ${geometry.paper.widthMm}mm ${geometry.paper.heightMm}mm;
          margin: ${geometry.marginMm}mm;
        }
        @media screen {
          .ijin-sheet-multi {
            width: ${geometry.paper.widthMm}mm;
            height: ${geometry.paper.heightMm}mm;
            padding: ${geometry.marginMm}mm;
          }
          .ijin-sheet-full {
            width: ${geometry.paper.widthMm}mm;
            min-height: ${geometry.paper.heightMm}mm;
            padding: ${geometry.marginMm}mm;
          }
        }
        @media print {
          @page {
            size: ${geometry.paper.widthMm}mm ${geometry.paper.heightMm}mm;
            margin: ${geometry.marginMm}mm;
          }
          .ijin-preview-zoom-wrap {
            zoom: 1 !important;
          }
          .ijin-sheet-multi {
            width: 100% !important;
            height: ${(geometry.printableH - 1.5).toFixed(1)}mm !important;
            padding: 0 !important;
            margin: 0 !important;
            break-after: page;
            page-break-after: always;
          }
          .ijin-sheet-multi:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .ijin-sheet-full {
            width: 100% !important;
            min-height: ${(geometry.printableH - 2).toFixed(1)}mm !important;
            padding: 0 !important;
            margin: 0 !important;
            break-after: page;
            page-break-after: always;
          }
          .ijin-sheet-full:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Top Action Header + Direct Link Pengawas / Panitia */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-900 text-amber-400 rounded-lg shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {isStandalone
                    ? 'Portal Mandiri • Surat Keterangan Ijin Masuk Ujian'
                    : 'Surat Ijin Masuk Tempat Ujian / Ulangan'}
                </h2>
                {isStandalone && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10.5px] border border-amber-300">
                    Akses Langsung Pengawas &amp; Panitia
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Isi form di sebelah kiri sambil melihat pratinjau cetak di kanan, atau cetak <strong>Blanko Kosongan (6 Suket/Hal)</strong> untuk pengisian manual.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isStandalone && (
              <a
                href={typeof window !== 'undefined' ? window.location.origin : '/'}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Aplikasi Utama</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleActivateBlanko6Up}
              className={`px-3.5 py-2 font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors ${
                printScope === 'blanko_kosong' &&
                layoutConfig.ukuranSurat === 'mini' &&
                layoutConfig.miniDivision === '6up'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
              }`}
              title="Ubah pratinjau menjadi 6 lembar blanko suket kosongan dalam 1 halaman siap cetak"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>Blanko Kosong (6 Suket/Hal)</span>
            </button>
            <button
              type="button"
              onClick={handleSaveToDaftar}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Antrean</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak ({recordsToPrint.length} Suket)</span>
            </button>
          </div>
        </div>

        {/* Link Mandiri Pengawas & Panitia */}
        <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded bg-blue-100 text-blue-700 shrink-0">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900">
                Link Input Mandiri Pengawas / Panitia (Form + Preview Cetak Langsung)
              </div>
              <div className="font-mono text-[11px] text-blue-800 truncate select-all">
                {standalonePortalUrl}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyPortalLink}
              className="px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-black text-white font-semibold text-[11px] inline-flex items-center gap-1 whitespace-nowrap"
            >
              {copiedPortalLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Link Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Link</span>
                </>
              )}
            </button>
            {!isStandalone && (
              <a
                href={standalonePortalUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-md bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Link Form</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowPortalQr(q => !q)}
              className={`px-2.5 py-1.5 rounded-md border font-semibold text-[11px] inline-flex items-center gap-1 whitespace-nowrap ${
                showPortalQr
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Link</span>
            </button>
          </div>
        </div>

        {showPortalQr && (
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 flex flex-wrap items-center gap-4 text-xs">
            <div className="bg-white p-1.5 rounded border border-blue-200 shrink-0">
              <ExamCardBarcode value={standalonePortalUrl} mode="qr_link" size={76} />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900">
                Scan QR Code untuk Membuka Form &amp; Cetak Ijin Masuk Ujian
              </div>
              <p className="text-[11px] text-slate-600 max-w-md">
                Pengawas atau panitia ruang dapat memindai QR atau menyimpan link{' '}
                <strong className="font-mono text-slate-800">{standalonePortalUrl}</strong> di browser HP/laptop agar dapat mengisi &amp; mencetak surat keterangan maupun blanko 6 item dengan cepat.
              </p>
            </div>
          </div>
        )}

        {/* Pengaturan Ukuran Surat (Mini / Sedang / Penuh) & Kertas (A4 / Folio F4) */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 xl:grid-cols-12 gap-3 text-xs items-center">
          {/* Ukuran Kertas */}
          <div className="xl:col-span-4 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 flex items-center gap-1 whitespace-nowrap">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Kertas:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              {(['A4', 'F4'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setLayoutConfig(prev => ({ ...prev, paperSize: sz }))}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    layoutConfig.paperSize === sz
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {PAPER_SPECS[sz].label}
                </button>
              ))}
            </div>
          </div>

          {/* Ukuran Surat: Mini / Sedang / Penuh */}
          <div className="xl:col-span-5 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 flex items-center gap-1 whitespace-nowrap">
              <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
              Ukuran Surat:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setLayoutConfig(prev => ({ ...prev, ukuranSurat: 'mini' }))}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  layoutConfig.ukuranSurat === 'mini'
                    ? 'bg-slate-900 text-amber-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mini
              </button>
              <button
                type="button"
                onClick={() => setLayoutConfig(prev => ({ ...prev, ukuranSurat: 'sedang' }))}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  layoutConfig.ukuranSurat === 'sedang'
                    ? 'bg-slate-900 text-amber-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sedang (2/Hal)
              </button>
              <button
                type="button"
                onClick={() => setLayoutConfig(prev => ({ ...prev, ukuranSurat: 'penuh' }))}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  layoutConfig.ukuranSurat === 'penuh'
                    ? 'bg-slate-900 text-amber-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Penuh (1/Hal)
              </button>
            </div>

            {layoutConfig.ukuranSurat === 'mini' && (
              <div className="inline-flex rounded-lg border border-blue-200 bg-blue-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setLayoutConfig(prev => ({ ...prev, miniDivision: '4up' }))}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    layoutConfig.miniDivision === '4up'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  4/Hal (2×2)
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutConfig(prev => ({ ...prev, miniDivision: '6up' }))}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    layoutConfig.miniDivision === '6up'
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  6/Hal (2×3)
                </button>
              </div>
            )}
          </div>

          {/* Margin & Celah Pembagian Merata */}
          <div className="xl:col-span-3 flex items-center gap-3 flex-wrap xl:justify-end">
            <label className="flex items-center gap-1.5 text-slate-700 font-medium whitespace-nowrap">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Margin:</span>
              <select
                value={layoutConfig.marginMm}
                onChange={e =>
                  setLayoutConfig(prev => ({ ...prev, marginMm: Number(e.target.value) }))
                }
                className="px-2 py-1 border border-slate-200 rounded bg-white font-mono text-[11px] tabular-nums"
              >
                <option value={8}>8 mm</option>
                <option value={10}>10 mm</option>
                <option value={12}>12 mm</option>
              </select>
            </label>

            {layoutConfig.ukuranSurat !== 'penuh' && (
              <label className="flex items-center gap-1.5 text-slate-700 font-medium whitespace-nowrap">
                <Scissors className="w-3.5 h-3.5 text-slate-400" />
                <span>Celah:</span>
                <select
                  value={layoutConfig.gapMm}
                  onChange={e =>
                    setLayoutConfig(prev => ({ ...prev, gapMm: Number(e.target.value) }))
                  }
                  className="px-2 py-1 border border-slate-200 rounded bg-white font-mono text-[11px] tabular-nums"
                >
                  <option value={4}>4 mm</option>
                  <option value={5}>5 mm</option>
                  <option value={6}>6 mm</option>
                  <option value={8}>8 mm</option>
                </select>
              </label>
            )}
          </div>
        </div>

        {/* Pengaturan Jenis Font, Ukuran Huruf & Jarak Spasi */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 xl:grid-cols-12 gap-3 text-xs items-center">
          {/* Jenis Font */}
          <div className="xl:col-span-4 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 whitespace-nowrap">Jenis Font:</span>
            <select
              value={layoutConfig.fontFamily || 'inter'}
              onChange={e =>
                setLayoutConfig(prev => ({
                  ...prev,
                  fontFamily: e.target.value as SuratFontFamily
                }))
              }
              className="flex-1 min-w-[180px] px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-xs font-semibold text-slate-800"
            >
              {(Object.keys(SURAT_FONT_OPTIONS) as SuratFontFamily[]).map(key => (
                <option key={key} value={key}>
                  {SURAT_FONT_OPTIONS[key].label}
                </option>
              ))}
            </select>
          </div>

          {/* Ukuran Huruf */}
          <div className="xl:col-span-3 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 whitespace-nowrap">Ukuran Font:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              {([90, 100, 110, 120] as const).map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setLayoutConfig(prev => ({ ...prev, fontScalePct: pct }))}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold tabular-nums whitespace-nowrap transition-colors ${
                    (layoutConfig.fontScalePct || 100) === pct
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Jarak Spasi Baris */}
          <div className="xl:col-span-3 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 whitespace-nowrap">Spasi Baris:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              {(['padat', 'nyaman', 'lega'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLayoutConfig(prev => ({ ...prev, lineSpacing: mode }))}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    (layoutConfig.lineSpacing || 'nyaman') === mode
                      ? 'bg-slate-900 text-amber-400 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {LINE_SPACING_SPECS[mode].label}
                </button>
              ))}
            </div>
          </div>

          {/* Kerenggangan Huruf */}
          <div className="xl:col-span-2 flex items-center gap-1.5 flex-wrap xl:justify-end">
            <span className="font-semibold text-slate-700 whitespace-nowrap">Huruf:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setLayoutConfig(prev => ({ ...prev, letterSpacing: 'normal' }))}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  (layoutConfig.letterSpacing || 'normal') === 'normal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setLayoutConfig(prev => ({ ...prev, letterSpacing: 'lebar' }))}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  layoutConfig.letterSpacing === 'lebar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Renggang
              </button>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`px-3.5 py-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Side-by-Side Workspace: Kiri (Form Input & Antrean) | Kanan (Pratinjau & Cetak Langsung) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start print:block">
        {/* KOLOM KIRI (5/12): FORM INPUT + PENGATURAN BLANKO + ANTREAN */}
        <div className="no-print xl:col-span-5 space-y-4">
          {/* Mode Switch: Isian Form vs Blanko Kosongan 6 Suket */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-900">Mode Pengisian &amp; Cetak:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPrintScope('draft_individu')}
                  className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                    printScope === 'draft_individu' || printScope === 'record_individu'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Isi Form
                </button>
                <button
                  type="button"
                  onClick={handleActivateBlanko6Up}
                  className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                    printScope === 'blanko_kosong'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Blanko Kosong (6/Hal)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintScope('massal')}
                  className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
                    printScope === 'massal'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Massal ({selectedRecordIds.length || savedRecords.length})
                </button>
              </div>
            </div>

            {printScope === 'blanko_kosong' && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-amber-950">
                    Mode Blanko Kosongan Siap Tulis Tangan ({geometry.perPage} Suket/Hal)
                  </span>
                  <div className="inline-flex items-center gap-1">
                    {[1, 2, 3, 5].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setBlankoSheetCount(cnt)}
                        className={`px-2 py-0.5 rounded font-mono text-[10.5px] font-bold border ${
                          blankoSheetCount === cnt
                            ? 'bg-slate-900 text-amber-400 border-slate-900'
                            : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {cnt} Hal ({cnt * geometry.perPage})
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[11px] font-medium text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blankoKosongkanPetugas}
                    onChange={e => setBlankoKosongkanPetugas(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <span>Kosongkan nama Petugas Piket / Panitia untuk tanda tangan manual</span>
                </label>
              </div>
            )}

            {printScope !== 'massal' &&
              printScope !== 'blanko_kosong' &&
              layoutConfig.ukuranSurat !== 'penuh' && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="font-semibold text-slate-800">
                    Sisa Slot ({geometry.perPage} slot/{geometry.paper.shortLabel}):
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { id: 'single', label: '1 Slip Saja' },
                        { id: 'fill_blanko', label: `+ ${geometry.perPage - 1} Blanko Kosong` },
                        { id: 'fill_copy', label: `Gandakan ${geometry.perPage}×` }
                      ] as const
                    ).map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setLayoutConfig(prev => ({ ...prev, individuFillMode: opt.id }))
                        }
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                          layoutConfig.individuFillMode === opt.id
                            ? 'bg-slate-900 text-amber-400'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* FORM INPUT DATA SISWA & KEJADIAN */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
            <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Form Input Surat Ijin Masuk Ujian</span>
              </span>
              <span className="font-mono text-[11px] text-rose-700 font-bold tabular-nums">
                Terlambat {menitTerlambat} mnt
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Cari Siswa ({activeSiswa.length})
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                    placeholder="Ketik nama / NIS / kelas..."
                    className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Siswa</label>
                <select
                  value={selectedSiswaId}
                  onChange={e => {
                    handlePickStudent(e.target.value);
                    if (printScope === 'blanko_kosong') setPrintScope('draft_individu');
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value="">-- Input Manual --</option>
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.rombelSaatIni || s.kelas}) {s.ruangUjian ? `• ${s.ruangUjian}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Siswa</label>
                <input
                  type="text"
                  value={namaSiswa}
                  onChange={e => {
                    setNamaSiswa(e.target.value);
                    if (printScope === 'blanko_kosong') setPrintScope('draft_individu');
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    value={kelas}
                    onChange={e => setKelas(e.target.value)}
                    placeholder="Kelas"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Ujian</label>
                  <input
                    type="text"
                    value={nomorUjian}
                    onChange={e => setNomorUjian(e.target.value)}
                    placeholder="No. Ujian"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">NIS</label>
                <input
                  type="text"
                  value={nis}
                  onChange={e => setNis(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ruang</label>
                <input
                  type="text"
                  value={ruangUjian}
                  onChange={e => setRuangUjian(e.target.value)}
                  placeholder="R.01"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Sesi Ujian</label>
                <input
                  type="text"
                  value={sesiUjian}
                  onChange={e => setSesiUjian(e.target.value)}
                  placeholder="Sesi 1"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  list="ijin-mapel-list"
                  value={mataPelajaran}
                  onChange={e => setMataPelajaran(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
                <datalist id="ijin-mapel-list">
                  {(settings.jadwalUjian || []).map(j => (
                    <option key={j.id} value={j.mataPelajaran}>
                      {j.hariTanggal} ({j.waktu})
                    </option>
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jam Mulai</label>
                <input
                  type="time"
                  value={jamMulai}
                  onChange={e => setJamMulai(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jam Hadir</label>
                <input
                  type="time"
                  value={jamHadir}
                  onChange={e => setJamHadir(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Surat</label>
                <input
                  type="text"
                  value={nomorSurat}
                  onChange={e => setNomorSurat(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={tanggalSurat}
                  onChange={e => setTanggalSurat(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Petugas TTD</label>
                <select
                  value={petugasId}
                  onChange={e => handlePickPetugas(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="current_user">
                    {currentUser.name} ({currentUser.jabatan})
                  </option>
                  {petugasOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nama} — {p.jabatanKepanitiaan}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alasan Keterlambatan</label>
                <input
                  type="text"
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded mb-1"
                />
                <div className="flex flex-wrap gap-1">
                  {ALASAN_PRESETS.slice(0, 3).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAlasan(preset)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 whitespace-nowrap"
                    >
                      {preset.split('/')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keputusan Panitia</label>
                <select
                  value={keputusan}
                  onChange={e => setKeputusan(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                >
                  {KEPUTUSAN_PRESETS.map(k => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ANTREAN SURAT TERSIMPAN */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs">
            <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="tabular-nums">Antrean Tersimpan ({savedRecords.length})</span>
              </span>
              {savedRecords.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPrintScope('massal')}
                  className="text-[11px] font-semibold text-blue-700 hover:underline"
                >
                  Cetak Massal ({selectedRecordIds.length || savedRecords.length})
                </button>
              )}
            </div>

            <div className="overflow-y-auto max-h-[210px] divide-y divide-slate-100 border border-slate-200 rounded">
              {savedRecords.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  Belum ada surat tersimpan. Isi form lalu klik <strong>Simpan Antrean</strong>, atau langsung cetak pratinjau di sebelah kanan.
                </div>
              ) : (
                savedRecords.map(rec => {
                  const isChecked = selectedRecordIds.includes(rec.id);
                  return (
                    <div
                      key={rec.id}
                      className={`p-2 flex items-center justify-between gap-2 ${
                        activeRecordId === rec.id && printScope === 'record_individu'
                          ? 'bg-amber-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRecordIds(prev =>
                              prev.includes(rec.id) ? prev.filter(x => x !== rec.id) : [...prev, rec.id]
                            )
                          }
                          className="text-slate-500 hover:text-blue-600 shrink-0"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{rec.namaSiswa}</div>
                          <div className="text-[10.5px] text-slate-500 font-mono truncate tabular-nums">
                            {rec.kelas} • {rec.ruangUjian} • +{rec.menitTerlambat} mnt
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRecordId(rec.id);
                            setPrintScope('record_individu');
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-100 text-blue-800 font-semibold text-[10.5px] whitespace-nowrap"
                        >
                          Lihat
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSavedRecords(prev => prev.filter(x => x.id !== rec.id))
                          }
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* KOLOM KANAN (7/12): PRATINJAU CETAK BERSEBELAHAN LANGSUNG DENGAN FORM */}
        <div className="xl:col-span-7 space-y-3 xl:sticky xl:top-3 print:col-span-12">
          {/* Preview Toolbar: Info Ukuran + Zoom + Cetak */}
          <div className="no-print bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-600 tabular-nums">
              <span className="font-bold text-slate-900">Pratinjau Cetak</span>
              <span aria-hidden="true">·</span>
              <span>{geometry.paper.shortLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-blue-700">{geometry.sizeLabel}</span>
              {printScope === 'blanko_kosong' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10.5px]">
                    BLANKO MANUAL
                  </span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                  className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Perkecil pratinjau"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                {([0.45, 0.6, 0.75, 0.9, 1] as const).map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPreviewZoom(val)}
                    className={`px-2 py-1 rounded text-[10.5px] font-mono font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                      Math.abs(previewZoom - val) < 0.04
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {Math.round(val * 100)}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.min(1.2, Number((z + 0.1).toFixed(2))))}
                  className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Perbesar pratinjau"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md flex items-center gap-1 whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak</span>
              </button>
            </div>
          </div>

          {/* Print Preview Canvas */}
          <div className="bg-slate-200/75 border border-slate-300 rounded-lg p-3 sm:p-4 overflow-x-auto max-h-[84vh] overflow-y-auto print:bg-white print:border-0 print:p-0 print:max-h-none print:overflow-visible">
            <div
              className="ijin-preview-zoom-wrap w-fit mx-auto space-y-5 print:w-full print:space-y-0"
              style={{ zoom: previewZoom }}
            >
              {layoutConfig.ukuranSurat === 'penuh' ? (
                recordsToPrint.map((rec, idx) => renderFullSurat(rec, idx))
              ) : (
                multiPages.map((pageCards, pageIdx) => (
                  <div
                    key={`ijin-sheet-${pageIdx}`}
                    className="ijin-page ijin-sheet-multi bg-white border border-slate-300 shadow-sm mx-auto box-border print:border-0 print:shadow-none"
                  >
                    <div
                      className="w-full h-full grid"
                      style={{
                        gridTemplateColumns: `repeat(${geometry.cols}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${geometry.rows}, minmax(0, 1fr))`,
                        gap: `${geometry.gapMm}mm`
                      }}
                    >
                      {pageCards.map((rec, slotIdx) =>
                        layoutConfig.ukuranSurat === 'sedang'
                          ? renderSedangSlip(rec, pageIdx * geometry.perPage + slotIdx)
                          : renderMiniSlip(rec, pageIdx * geometry.perPage + slotIdx)
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
