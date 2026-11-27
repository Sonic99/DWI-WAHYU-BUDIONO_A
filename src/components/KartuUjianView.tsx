import React, { useState, useMemo, useRef } from 'react';
import {
  Siswa,
  SchoolProfile,
  KartuUjianSettings,
  User,
  JadwalUjianItem,
  JadwalUlanganRepoItem,
  CustomCardTheme,
  CardEmbossStyle,
  CardAccentPattern
} from '../types';
import { initialKartuUjianSettings } from '../data/initialData';
import {
  PemprovJatimLogo,
  SchoolStampSvg,
  KepalaSekolahSignatureSvg,
  Sman9SurabayaLogoSvg
} from './OfficialStamps';
import {
  ExamCardBarcode,
  resolveDirectImageUrl,
  resolveStudentTemplateUrl
} from './ExamCardBarcode';
import { AturKelompokRuangSiswaModal } from './AturKelompokRuangSiswaModal';
import {
  CARD_EMBOSS_OPTIONS,
  CARD_PATTERN_OPTIONS,
  CURATED_DESAIN_PRESETS,
  resolveCardDesign,
  CardBackgroundLayers,
  CardFontStudioPanel,
  CardFontStudioValue,
  CardDimensionsStudioPanel,
  CardDimensionsStudioValue,
  scaleCardFontPx
} from './CardDesignLayers';
import {
  appendAuditLog,
  downloadTemplateExcelJadwalUjian,
  exportJadwalUjianToExcel,
  parseJadwalUjianExcel,
  exportExcelPesertaLinkKartuUjian,
  parseExcelPesertaLinkKartuUjian,
  sanitizePrefixNomorUjian,
  sanitizeNomorUjian10Digit,
  formatNomorUjian10Digit,
  resolveAwalNopes10Digit,
  applyAwalNopesToInput,
  parseTimeRangeMinutes,
  extractSessionBaseName,
  resolveEffectiveSiswaSesi,
  resolveScheduleTimeForStudent,
  alignJadwalListToSesi,
  getStoredJadwalUlanganRepo,
  saveStoredJadwalUlanganRepo,
  ensureCurrentJadwalArchivedInRepo,
  createJadwalRepoSnapshotFromSettings,
  computeJadwalSignature,
  cloneJadwalItems
} from '../services/storageService';
import {
  IdCard,
  Printer,
  Upload,
  Wand2,
  Search,
  Settings,
  Stamp,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  RotateCcw,
  Users,
  CheckCircle2,
  AlertCircle,
  Camera,
  DoorOpen,
  SlidersHorizontal,
  Scissors,
  CalendarDays,
  QrCode,
  FileSpreadsheet,
  Link2,
  FlipHorizontal,
  Download,
  Layers,
  Sparkles,
  Loader2,
  Clock,
  Pencil,
  Check,
  X,
  RefreshCw,
  Archive,
  Save,
  Copy,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  FolderOpen
} from 'lucide-react';

interface KartuUjianViewProps {
  siswaList: Siswa[];
  profile: SchoolProfile;
  settings: KartuUjianSettings;
  currentUser: User;
  onUpdateSiswa: (list: Siswa[]) => void;
  onUpdateSettings: (settings: KartuUjianSettings) => void;
  onSyncTypographyToAllCards?: (typo: CardFontStudioValue) => void;
  onSyncDimensionsToAllCards?: (dims: CardDimensionsStudioValue) => void;
}

const compressImageFile = (file: File, maxDim = 320, preserveAlpha = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mime = preserveAlpha || file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, 0.82));
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar'));
    reader.readAsDataURL(file);
  });
};

const normalizeKey = (val: string) =>
  val.toLowerCase().replace(/[^a-z0-9]/g, '');

const matchConditionalSchedule = (
  item: JadwalUjianItem,
  siswa: Siswa,
  fallbackSesi = 'Sesi 1'
): boolean => {
  const target = item.kondisiTarget || 'Semua';
  const rawFilter = (item.kondisiNilai || '').trim();
  if (target === 'Semua' || !rawFilter) return true;

  const tokens = rawFilter
    .split(/[,;|]+/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  if (target === 'Kelas') {
    const kelasVal = (siswa.rombelSaatIni || siswa.kelas || '').trim().toLowerCase();
    if (!kelasVal) return false;
    return tokens.some(tok =>
      kelasVal === tok ||
      kelasVal.startsWith(`${tok}-`) ||
      kelasVal.startsWith(`${tok} `) ||
      kelasVal.startsWith(`${tok}.`)
    );
  }

  if (target === 'Sesi') {
    const sesiVal = (siswa.sesiUjian || fallbackSesi || '').trim().toLowerCase();
    if (!sesiVal) return false;
    const sesiBase = extractSessionBaseName(sesiVal);
    return tokens.some(tok => {
      const tokBase = extractSessionBaseName(tok);
      return (
        sesiVal === tok ||
        sesiVal.includes(tok) ||
        tok.includes(sesiVal) ||
        Boolean(sesiBase && tokBase && sesiBase === tokBase)
      );
    });
  }

  if (target === 'Ruang') {
    const ruangVal = (siswa.ruangUjian || '').trim().toLowerCase();
    if (!ruangVal) return false;
    return tokens.some(tok => ruangVal === tok || ruangVal.includes(tok));
  }

  return true;
};

const mirrorGridCardsForDuplex = (cards: Siswa[], cols: number): (Siswa | null)[] => {
  if (cols <= 1) return cards;
  const mirrored: (Siswa | null)[] = [];
  for (let i = 0; i < cards.length; i += cols) {
    const row: (Siswa | null)[] = cards.slice(i, i + cols);
    while (row.length < cols) {
      row.push(null);
    }
    row.reverse();
    mirrored.push(...row);
  }
  return mirrored;
};

const isValidCardMm = (val: unknown, min: number): val is number =>
  typeof val === 'number' && Number.isFinite(val) && val >= min;

const computePesertaPaperGeometry = (settings: KartuUjianSettings) => {
  const paperCode = settings.ukuranKertas || 'A4';
  const isLandscape = settings.orientasiCetak === 'landscape';
  const baseDims =
    paperCode === 'F4'
      ? { w: 215, h: 330 }
      : paperCode === 'Letter'
      ? { w: 216, h: 279 }
      : { w: 210, h: 297 };
  const paperWidthMm = isLandscape ? baseDims.h : baseDims.w;
  const paperHeightMm = isLandscape ? baseDims.w : baseDims.h;
  const marginMm =
    settings.marginCetak === 'sempit' ? 6 : settings.marginCetak === 'lebar' ? 15 : 10;
  const cssPageSize =
    paperCode === 'F4'
      ? isLandscape
        ? '330mm 215mm'
        : '215mm 330mm'
      : paperCode === 'Letter'
      ? isLandscape
        ? 'letter landscape'
        : 'letter portrait'
      : isLandscape
      ? 'A4 landscape'
      : 'A4 portrait';

  const cols = settings.jumlahKolom || 2;
  const perPage = Math.max(1, settings.layoutPerPage || 6);
  const rowsPerPage = Math.max(1, Math.ceil(perPage / cols));
  const gapMm =
    settings.jarakAntarKartu === 'rapat'
      ? 2
      : settings.jarakAntarKartu === 'lega'
      ? 5
      : 3.5;
  const printableWidthMm = paperWidthMm - marginMm * 2;
  const printableHeightMm = paperHeightMm - marginMm * 2;
  const safePrintableHeightMm = Math.max(60, printableHeightMm - 2);
  const autoCardWidthMm =
    Math.floor(((printableWidthMm - gapMm * (cols - 1)) / cols) * 10) / 10;
  const autoCardHeightMm =
    Math.floor(((safePrintableHeightMm - gapMm * (rowsPerPage - 1)) / rowsPerPage) * 10) / 10;

  return {
    paperCode,
    isLandscape,
    paperWidthMm,
    paperHeightMm,
    marginMm,
    cssPageSize,
    cols,
    perPage,
    rowsPerPage,
    gapMm,
    printableWidthMm,
    printableHeightMm,
    autoCardWidthMm,
    autoCardHeightMm
  };
};

export const KartuUjianView: React.FC<KartuUjianViewProps> = ({
  siswaList,
  profile,
  settings,
  onUpdateSiswa,
  onUpdateSettings,
  onSyncTypographyToAllCards,
  onSyncDimensionsToAllCards
}) => {
  // Active configuration subtab
  const [activeConfigTab, setActiveConfigTab] = useState<
    'ujian' | 'jadwal' | 'cetak' | 'ttd' | 'foto' | 'none'
  >('ujian');

  // Filtering & selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [filterSesi, setFilterSesi] = useState('all');
  const [filterRuang, setFilterRuang] = useState('all');
  const [filterFoto, setFilterFoto] = useState<'all' | 'has_foto' | 'no_foto'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'filtered' | 'selected' | 'individual'>('filtered');
  const [individualPrintId, setIndividualPrintId] = useState<string | null>(null);

  // Auto-assign session & room draft state
  const [autoAssignSesiMode, setAutoAssignSesiMode] = useState<string>('rotate');
  const [newSesiInput, setNewSesiInput] = useState('');
  const [editingSesiKey, setEditingSesiKey] = useState<string | null>(null);
  const [editingSesiValue, setEditingSesiValue] = useState('');
  const [alignTargetSesi, setAlignTargetSesi] = useState<string>(settings.sesiTersedia[0] || '');
  const [kapasitasInput, setKapasitasInput] = useState<string>(
    String(settings.kapasitasPerRuang || 20)
  );
  const [awalNopesDraft, setAwalNopesDraft] = useState<string>(() =>
    resolveAwalNopes10Digit(settings.nomorPesertaAwal || settings.prefixNomorUjian)
  );
  const appliedAwalNopes = resolveAwalNopes10Digit(
    settings.nomorPesertaAwal || settings.prefixNomorUjian
  );
  const effectiveAwalNopes = resolveAwalNopes10Digit(awalNopesDraft || appliedAwalNopes);
  const effectiveAlignTargetSesi = settings.sesiTersedia.includes(alignTargetSesi)
    ? alignTargetSesi
    : settings.sesiTersedia[0] || '';

  // Status feedback, AI theme & file refs
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [aiThemePrompt, setAiThemePrompt] = useState(
    'Elegan akademik SMAN 9 Surabaya, kontras tinggi, cerah & bersih'
  );
  const [isGeneratingAiTheme, setIsGeneratingAiTheme] = useState(false);
  const [aiThemeError, setAiThemeError] = useState<string | null>(null);
  const batchPhotoInputRef = useRef<HTMLInputElement>(null);
  const excelJadwalInputRef = useRef<HTMLInputElement>(null);
  const excelPesertaLinkInputRef = useRef<HTMLInputElement>(null);

  // Repositori Jadwal Ulangan (agar jadwal baru tidak menimpa jadwal lama)
  const [jadwalRepo, setJadwalRepo] = useState<JadwalUlanganRepoItem[]>(() =>
    getStoredJadwalUlanganRepo(settings)
  );
  const [repoNameInput, setRepoNameInput] = useState<string>(() =>
    `${settings.namaUjian || 'Jadwal Ulangan'} (${settings.semester || 'Gasal'} ${settings.tahunPelajaran || '2026/2027'})`.trim()
  );
  const [repoNoteInput, setRepoNoteInput] = useState<string>('');
  const [repoSearchQuery, setRepoSearchQuery] = useState<string>('');
  const [applyIncludeMetaAndSesi, setApplyIncludeMetaAndSesi] = useState<boolean>(false);
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);
  const [renamingRepoId, setRenamingRepoId] = useState<string | null>(null);
  const [renamingRepoValue, setRenamingRepoValue] = useState<string>('');
  const [confirmDeleteRepoId, setConfirmDeleteRepoId] = useState<string | null>(null);
  const [isRoomGroupModalOpen, setIsRoomGroupModalOpen] = useState<boolean>(false);
  const [roomGroupInitialRoom, setRoomGroupInitialRoom] = useState<string | undefined>(undefined);
  const [confirmResetRuangTarget, setConfirmResetRuangTarget] = useState<'none' | 'panel' | 'bar'>('none');

  const activeSiswa = useMemo(
    () => siswaList.filter(s => s.status === 'Aktif' || !s.status),
    [siswaList]
  );

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    activeSiswa.forEach(s => {
      const k = s.rombelSaatIni || s.kelas;
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [activeSiswa]);

  const roomDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    let unassignedCount = 0;
    activeSiswa.forEach(s => {
      const r = (s.ruangUjian || '').trim();
      if (!r) {
        unassignedCount++;
      } else {
        counts.set(r, (counts.get(r) || 0) + 1);
      }
    });
    const rooms = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([room, count]) => ({ room, count }));
    return { rooms, unassignedCount };
  }, [activeSiswa]);

  const orphanedSessions = useMemo(() => {
    const activeSet = new Set(settings.sesiTersedia);
    const extra = new Set<string>();
    activeSiswa.forEach(s => {
      const val = (s.sesiUjian || '').trim();
      if (val && !activeSet.has(val)) extra.add(val);
    });
    return Array.from(extra);
  }, [activeSiswa, settings.sesiTersedia]);

  const filteredSiswa = useMemo(() => {
    return activeSiswa.filter(s => {
      const kelas = s.rombelSaatIni || s.kelas || '';
      const ruang = (s.ruangUjian || '').trim();
      const sesi = (s.sesiUjian || '').trim();
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q) ||
        (s.nipd || '').toLowerCase().includes(q) ||
        (s.nisn || '').toLowerCase().includes(q) ||
        (s.nomorUjian || '').toLowerCase().includes(q) ||
        ruang.toLowerCase().includes(q);
      const matchKelas = filterKelas === 'all' || kelas === filterKelas;
      const matchSesi =
        filterSesi === 'all'
          ? true
          : filterSesi === '__unassigned__'
          ? !sesi
          : filterSesi === '__mismatch__'
          ? Boolean(sesi) && !settings.sesiTersedia.includes(sesi)
          : sesi === filterSesi;
      const matchRuang =
        filterRuang === 'all' ||
        (filterRuang === '__unassigned__' ? !ruang : ruang === filterRuang);
      const matchFoto =
        filterFoto === 'all' ||
        (filterFoto === 'has_foto' && Boolean(s.fotoUrl)) ||
        (filterFoto === 'no_foto' && !s.fotoUrl);
      return matchSearch && matchKelas && matchSesi && matchRuang && matchFoto;
    });
  }, [activeSiswa, searchQuery, filterKelas, filterSesi, filterRuang, filterFoto, settings.sesiTersedia]);

  const cardsToPrint = useMemo(() => {
    if (printMode === 'individual') {
      const target =
        activeSiswa.find(s => s.id === individualPrintId) || filteredSiswa[0] || activeSiswa[0];
      return target ? [target] : [];
    }
    const base =
      printMode === 'selected' && selectedIds.length > 0
        ? activeSiswa.filter(s => selectedIds.includes(s.id))
        : [...filteredSiswa];

    const sortMode = settings.urutanCetak || 'ruang_nama';
    if (sortMode === 'tabel') return base;

    return [...base].sort((a, b) => {
      if (sortMode === 'nomor_ujian') {
        return (a.nomorUjian || '').localeCompare(b.nomorUjian || '', undefined, {
          numeric: true
        });
      }
      if (sortMode === 'kelas_nama') {
        const ka = a.rombelSaatIni || a.kelas || '';
        const kb = b.rombelSaatIni || b.kelas || '';
        const cmp = ka.localeCompare(kb, undefined, { numeric: true });
        return cmp !== 0 ? cmp : a.nama.localeCompare(b.nama);
      }
      // default: 'ruang_nama'
      const ra = (a.ruangUjian || '').trim();
      const rb = (b.ruangUjian || '').trim();
      const cmp = ra.localeCompare(rb, undefined, { numeric: true });
      if (cmp !== 0) return cmp;
      return (a.nomorUjian || a.nama).localeCompare(b.nomorUjian || b.nama, undefined, {
        numeric: true
      });
    });
  }, [printMode, individualPrintId, selectedIds, activeSiswa, filteredSiswa, settings.urutanCetak]);

  // Paginate cards cleanly into print sheets (optionally breaking page when room changes)
  const printPages = useMemo(() => {
    const perPage = Math.max(1, settings.layoutPerPage || 6);
    const pages: { label: string; cards: Siswa[] }[] = [];

    if (settings.pisahHalamanPerRuang) {
      const grouped = new Map<string, Siswa[]>();
      cardsToPrint.forEach(s => {
        const room = (s.ruangUjian || '').trim() || 'Belum Diatur';
        if (!grouped.has(room)) grouped.set(room, []);
        grouped.get(room)!.push(s);
      });
      grouped.forEach((students, room) => {
        for (let i = 0; i < students.length; i += perPage) {
          pages.push({
            label: `Ruang ${room}`,
            cards: students.slice(i, i + perPage)
          });
        }
      });
    } else {
      for (let i = 0; i < cardsToPrint.length; i += perPage) {
        pages.push({
          label: `Semua Ruang`,
          cards: cardsToPrint.slice(i, i + perPage)
        });
      }
    }

    return pages;
  }, [cardsToPrint, settings.layoutPerPage, settings.pisahHalamanPerRuang, settings.defaultRuangPrefix]);

  const jadwalList = useMemo(
    () => settings.jadwalUjian ?? initialKartuUjianSettings.jadwalUjian ?? [],
    [settings.jadwalUjian]
  );

  const currentJadwalSig = useMemo(() => computeJadwalSignature(jadwalList), [jadwalList]);
  const matchedSavedRepo = useMemo(
    () => jadwalRepo.find(r => computeJadwalSignature(r.jadwalUjian) === currentJadwalSig) || null,
    [jadwalRepo, currentJadwalSig]
  );
  const activeLinkedRepo = useMemo(
    () => jadwalRepo.find(r => r.id === settings.activeJadwalRepoId) || null,
    [jadwalRepo, settings.activeJadwalRepoId]
  );
  const filteredJadwalRepo = useMemo(() => {
    const q = repoSearchQuery.toLowerCase().trim();
    if (!q) return jadwalRepo;
    return jadwalRepo.filter(
      r =>
        r.nama.toLowerCase().includes(q) ||
        (r.namaUjian || '').toLowerCase().includes(q) ||
        (r.semester || '').toLowerCase().includes(q) ||
        (r.tahunPelajaran || '').toLowerCase().includes(q) ||
        (r.keterangan || '').toLowerCase().includes(q) ||
        r.jadwalUjian.some(j => j.mataPelajaran.toLowerCase().includes(q))
    );
  }, [jadwalRepo, repoSearchQuery]);

  const resolveSiswaPhotoSrc = (siswa: Siswa): string => {
    if (siswa.fotoUrl?.trim()) {
      return resolveDirectImageUrl(siswa.fotoUrl);
    }
    if (settings.fotoLinkTemplate?.trim()) {
      return resolveDirectImageUrl(resolveStudentTemplateUrl(settings.fotoLinkTemplate, siswa));
    }
    return '';
  };

  const resolveSiswaBarcodeValue = (siswa: Siswa): string => {
    if (siswa.barcodeLink?.trim()) {
      return siswa.barcodeLink.trim();
    }
    if (settings.barcodeLinkTemplate?.trim()) {
      return resolveStudentTemplateUrl(settings.barcodeLinkTemplate, siswa);
    }
    return siswa.nomorUjian || siswa.nisn || siswa.nis || siswa.nama;
  };

  // Stats
  const stats = useMemo(() => {
    const total = activeSiswa.length;
    const withNomor = activeSiswa.filter(s => Boolean(s.nomorUjian?.trim())).length;
    const withFoto = activeSiswa.filter(
      s => Boolean(s.fotoUrl?.trim() || settings.fotoLinkTemplate?.trim())
    ).length;
    const withSesi = activeSiswa.filter(s => Boolean(s.sesiUjian?.trim())).length;
    const withRuang = activeSiswa.filter(s => Boolean((s.ruangUjian || '').trim())).length;
    const totalRooms = roomDistribution.rooms.length;
    return { total, withNomor, withFoto, withSesi, withRuang, totalRooms };
  }, [activeSiswa, roomDistribution, settings.fotoLinkTemplate]);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleGenerateAiThemes = async (overridePrompt?: string) => {
    const promptToUse = (overridePrompt ?? aiThemePrompt).trim();
    setIsGeneratingAiTheme(true);
    setAiThemeError(null);
    try {
      const resp = await fetch('/api/ai/generate-card-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse || 'Variatif elegan resmi sekolah',
          targetType: 'Kartu Peserta Ujian',
          schoolName: profile.namaSekolah
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success || !Array.isArray(data?.themes)) {
        throw new Error(data?.message || 'Gagal menghasilkan variasi tema kartu AI.');
      }
      const generated: CustomCardTheme[] = data.themes;
      onUpdateSettings({
        ...settings,
        temaWarnaKartu: 'ai_custom',
        aiCustomTheme: generated[0] || settings.aiCustomTheme || null,
        aiThemePresets: generated,
        desainFont: undefined,
        desainFontBody: undefined,
        desainEmboss: undefined,
        desainPolaBg: undefined
      });
      appendAuditLog(
        'AI_TEMA_KARTU_UJIAN',
        `Generate ${generated.length} variasi tema kartu ujian via Gemini AI (${promptToUse || 'Default'}).`
      );
      notify(
        'success',
        `${generated.length} variasi tema AI berhasil dibuat. Tema "${generated[0]?.name || 'Kustom'}" aktif.`
      );
    } catch (err: any) {
      const msg = err?.message || 'Gagal menghubungi layanan AI Tema Kartu.';
      setAiThemeError(msg);
      notify('error', msg);
    } finally {
      setIsGeneratingAiTheme(false);
    }
  };

  // Update single student exam field
  const handleUpdateSiswaField = (
    id: string,
    field: 'nomorUjian' | 'sesiUjian' | 'ruangUjian' | 'fotoUrl' | 'barcodeLink',
    value: string
  ) => {
    const nextValue =
      field === 'nomorUjian' ? sanitizeNomorUjian10Digit(value, false) : value;
    const updated = siswaList.map(s => (s.id === id ? { ...s, [field]: nextValue } : s));
    onUpdateSiswa(updated);
  };

  // Conditional Schedule CRUD & Excel handlers
  const handleAddJadwalRow = () => {
    const newRow: JadwalUjianItem = {
      id: `jdw-${Date.now()}`,
      hariTanggal: 'Senin, 1 Des 2026',
      waktu: '07.30 - 09.00',
      mataPelajaran: 'Mata Pelajaran Baru',
      kondisiTarget: 'Semua',
      kondisiNilai: '',
      keterangan: ''
    };
    onUpdateSettings({ ...settings, jadwalUjian: [...jadwalList, newRow] });
  };

  const handleUpdateJadwalRow = (
    id: string,
    patch: Partial<JadwalUjianItem>
  ) => {
    const next = jadwalList.map(item => (item.id === id ? { ...item, ...patch } : item));
    onUpdateSettings({ ...settings, jadwalUjian: next });
  };

  const handleRemoveJadwalRow = (id: string) => {
    const next = jadwalList.filter(item => item.id !== id);
    onUpdateSettings({ ...settings, jadwalUjian: next });
  };

  const handleResetDefaultJadwal = () => {
    const { repo: nextRepo, archivedItem } = ensureCurrentJadwalArchivedInRepo(
      settings,
      jadwalRepo,
      'Sebelum Reset 16 Mapel'
    );
    if (archivedItem) setJadwalRepo(nextRepo);

    onUpdateSettings({
      ...settings,
      jadwalUjian: cloneJadwalItems(initialKartuUjianSettings.jadwalUjian || []),
      activeJadwalRepoId: nextRepo.find(
        r => computeJadwalSignature(r.jadwalUjian) === computeJadwalSignature(initialKartuUjianSettings.jadwalUjian || [])
      )?.id
    });
    notify(
      'success',
      archivedItem
        ? `Jadwal sebelumnya diamankan ke repositori ("${archivedItem.nama}"), lalu jadwal dikembalikan ke contoh standar 16 mapel.`
        : 'Jadwal ulangan kondisional dikembalikan ke contoh standar 16 mata pelajaran SMAN 9 Surabaya.'
    );
  };

  // Simpan jadwal aktif sebagai item baru di repositori (tanpa menimpa jadwal lama)
  const handleSaveCurrentJadwalAsNew = () => {
    if (jadwalList.length === 0) {
      notify('error', 'Tabel jadwal masih kosong. Tambahkan minimal 1 mata pelajaran sebelum menyimpan ke repositori.');
      return;
    }
    const baseTitle =
      repoNameInput.trim() ||
      `${settings.namaUjian || 'Jadwal Ulangan'} (${settings.semester || 'Semester'} ${settings.tahunPelajaran || ''})`.trim();
    const duplicateCount = jadwalRepo.filter(
      r => r.nama.toLowerCase() === baseTitle.toLowerCase()
    ).length;
    const finalName = duplicateCount > 0 ? `${baseTitle} #${duplicateCount + 1}` : baseTitle;

    const newEntry = createJadwalRepoSnapshotFromSettings(settings, {
      nama: finalName,
      keterangan: repoNoteInput.trim() || `${jadwalList.length} mata pelajaran`
    });
    const nextRepo = [newEntry, ...jadwalRepo];
    setJadwalRepo(nextRepo);
    saveStoredJadwalUlanganRepo(nextRepo);
    onUpdateSettings({ ...settings, activeJadwalRepoId: newEntry.id });
    setRepoNoteInput('');
    appendAuditLog(
      'SIMPAN_REPOSITORI_JADWAL',
      `Menyimpan jadwal ulangan "${newEntry.nama}" (${newEntry.jadwalUjian.length} mapel) ke repositori.`
    );
    notify('success', `Jadwal "${newEntry.nama}" tersimpan di repositori tanpa menimpa jadwal lain.`);
  };

  // Perbarui entri repositori yang sedang tertaut (eksplisit oleh user)
  const handleUpdateLinkedRepoItem = (targetId: string) => {
    const target = jadwalRepo.find(r => r.id === targetId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const updatedRepo = jadwalRepo.map(item =>
      item.id === targetId
        ? {
            ...item,
            namaUjian: settings.namaUjian,
            tahunPelajaran: settings.tahunPelajaran,
            semester: settings.semester,
            judulBelakang: settings.judulBelakang,
            catatanBelakang: settings.catatanBelakang,
            maksJadwalBelakang: settings.maksJadwalBelakang,
            tataLetakJadwalBelakang: settings.tataLetakJadwalBelakang,
            sinkronWaktuJadwalDenganSesi: settings.sinkronWaktuJadwalDenganSesi !== false,
            sesiTersedia: [...settings.sesiTersedia],
            jadwalUjian: cloneJadwalItems(jadwalList),
            isAutoArchive: false,
            updatedAt: nowIso
          }
        : item
    );
    setJadwalRepo(updatedRepo);
    saveStoredJadwalUlanganRepo(updatedRepo);
    appendAuditLog(
      'PERBARUI_REPOSITORI_JADWAL',
      `Memperbarui snapshot repositori "${target.nama}" (${jadwalList.length} mapel).`
    );
    notify('success', `Perubahan jadwal berhasil diperbarui pada slot repositori "${target.nama}".`);
  };

  // Mulai susun jadwal baru dengan mengamankan jadwal lama terlebih dahulu ke repositori
  const handleCreateFreshJadwal = () => {
    const { repo: nextRepo, archivedItem } = ensureCurrentJadwalArchivedInRepo(
      settings,
      jadwalRepo,
      'Arsip Sebelum Jadwal Baru'
    );
    if (archivedItem) setJadwalRepo(nextRepo);

    const starterRow: JadwalUjianItem = {
      id: `jdw-${Date.now()}`,
      hariTanggal: 'Senin, ...',
      waktu: '07.30 - 09.00',
      mataPelajaran: 'Mata Pelajaran 1',
      kondisiTarget: 'Semua',
      kondisiNilai: '',
      keterangan: ''
    };
    onUpdateSettings({
      ...settings,
      jadwalUjian: [starterRow],
      activeJadwalRepoId: undefined
    });
    setRepoNameInput('');
    setRepoNoteInput('');
    notify(
      'success',
      archivedItem
        ? `Jadwal lama diamankan ke repositori ("${archivedItem.nama}"). Silakan susun jadwal baru di tabel bawah.`
        : 'Jadwal lama sudah aman di repositori. Lembar jadwal baru siap diisi.'
    );
  };

  // Apply jadwal dari repositori (juga mengamankan draft aktif yang belum tersimpan agar tidak hilang)
  const handleApplyRepoJadwal = (item: JadwalUlanganRepoItem) => {
    const { repo: nextRepo, archivedItem } = ensureCurrentJadwalArchivedInRepo(
      settings,
      jadwalRepo,
      'Cadangan Sebelum Apply'
    );
    if (archivedItem) setJadwalRepo(nextRepo);

    const nextSettings: KartuUjianSettings = {
      ...settings,
      jadwalUjian: cloneJadwalItems(item.jadwalUjian),
      judulBelakang: item.judulBelakang ?? settings.judulBelakang,
      catatanBelakang: item.catatanBelakang ?? settings.catatanBelakang,
      maksJadwalBelakang: item.maksJadwalBelakang ?? settings.maksJadwalBelakang,
      tataLetakJadwalBelakang: item.tataLetakJadwalBelakang ?? settings.tataLetakJadwalBelakang,
      sinkronWaktuJadwalDenganSesi:
        item.sinkronWaktuJadwalDenganSesi !== undefined
          ? item.sinkronWaktuJadwalDenganSesi
          : settings.sinkronWaktuJadwalDenganSesi,
      activeJadwalRepoId: item.id
    };

    if (applyIncludeMetaAndSesi) {
      if (item.namaUjian) nextSettings.namaUjian = item.namaUjian;
      if (item.semester) nextSettings.semester = item.semester;
      if (item.tahunPelajaran) nextSettings.tahunPelajaran = item.tahunPelajaran;
      if (item.sesiTersedia && item.sesiTersedia.length > 0) {
        nextSettings.sesiTersedia = [...item.sesiTersedia];
      }
    }

    onUpdateSettings(nextSettings);
    appendAuditLog(
      'APPLY_REPOSITORI_JADWAL',
      `Menerapkan jadwal ulangan "${item.nama}" (${item.jadwalUjian.length} mapel) dari repositori.`
    );
    notify(
      'success',
      archivedItem
        ? `Jadwal sebelumnya diamankan ke "${archivedItem.nama}". Berhasil menerapkan "${item.nama}" (${item.jadwalUjian.length} mapel).`
        : `Berhasil menerapkan jadwal "${item.nama}" (${item.jadwalUjian.length} mapel) ke kartu ujian.`
    );
  };

  const handleDuplicateRepoItem = (item: JadwalUlanganRepoItem) => {
    const nowIso = new Date().toISOString();
    const copy: JadwalUlanganRepoItem = {
      ...item,
      id: `jrepo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      nama: `${item.nama} (Salinan)`,
      isAutoArchive: false,
      jadwalUjian: cloneJadwalItems(item.jadwalUjian),
      sesiTersedia: item.sesiTersedia ? [...item.sesiTersedia] : [],
      createdAt: nowIso,
      updatedAt: nowIso
    };
    const nextRepo = [copy, ...jadwalRepo];
    setJadwalRepo(nextRepo);
    saveStoredJadwalUlanganRepo(nextRepo);
    notify('success', `Salinan "${copy.nama}" ditambahkan ke repositori.`);
  };

  const handleSaveRenameRepoItem = (id: string) => {
    const trimmed = renamingRepoValue.trim();
    if (!trimmed) {
      setRenamingRepoId(null);
      return;
    }
    const nextRepo = jadwalRepo.map(r =>
      r.id === id ? { ...r, nama: trimmed, updatedAt: new Date().toISOString() } : r
    );
    setJadwalRepo(nextRepo);
    saveStoredJadwalUlanganRepo(nextRepo);
    setRenamingRepoId(null);
    notify('success', `Nama jadwal di repositori diubah menjadi "${trimmed}".`);
  };

  const handleDeleteRepoItem = (id: string) => {
    const target = jadwalRepo.find(r => r.id === id);
    const nextRepo = jadwalRepo.filter(r => r.id !== id);
    setJadwalRepo(nextRepo);
    saveStoredJadwalUlanganRepo(nextRepo);
    setConfirmDeleteRepoId(null);
    if (settings.activeJadwalRepoId === id) {
      onUpdateSettings({ ...settings, activeJadwalRepoId: undefined });
    }
    if (target) {
      appendAuditLog('HAPUS_REPOSITORI_JADWAL', `Menghapus entri repositori jadwal "${target.nama}".`);
      notify('success', `Entri "${target.nama}" dihapus dari repositori.`);
    }
  };

  const handleFill16Slots = () => {
    if (jadwalList.length >= 16) {
      notify('success', 'Daftar jadwal sudah memiliki 16 mata pelajaran atau lebih.');
      return;
    }
    const next = [...jadwalList];
    const defaults = initialKartuUjianSettings.jadwalUjian || [];
    for (let i = next.length; i < 16; i++) {
      const sample = defaults[i];
      next.push(
        sample
          ? { ...sample, id: `jdw-${Date.now()}-${i}` }
          : {
              id: `jdw-${Date.now()}-${i}`,
              hariTanggal: 'Hari / Tanggal',
              waktu: '07.30 - 09.00',
              mataPelajaran: `Mata Pelajaran ${i + 1}`,
              kondisiTarget: 'Semua',
              kondisiNilai: '',
              keterangan: ''
            }
      );
    }
    onUpdateSettings({ ...settings, jadwalUjian: next, maksJadwalBelakang: 16 });
    notify('success', 'Berhasil melengkapi tabel jadwal menjadi 16 slot mata pelajaran.');
  };

  const handleImportExcelJadwal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const result = parseJadwalUjianExcel(buffer);
      if (result.success) {
        const { repo: nextRepo, archivedItem } = ensureCurrentJadwalArchivedInRepo(
          settings,
          jadwalRepo,
          'Sebelum Impor Excel'
        );
        if (archivedItem) setJadwalRepo(nextRepo);

        onUpdateSettings({
          ...settings,
          jadwalUjian: result.data,
          activeJadwalRepoId: undefined
        });
        appendAuditLog(
          'IMPORT_JADWAL_KARTU_UJIAN',
          `Mengimpor ${result.data.length} baris jadwal kondisional dari ${file.name}.`
        );
        notify(
          'success',
          archivedItem
            ? `${result.message} Jadwal sebelumnya tetap diamankan di repositori ("${archivedItem.nama}").`
            : result.message
        );
      } else {
        notify('error', result.message);
      }
    } catch {
      notify('error', 'Gagal membaca file Excel jadwal ujian.');
    }
  };

  const handleImportExcelPesertaLink = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelPesertaLinkKartuUjian(buffer, siswaList);
      if (result.success) {
        onUpdateSiswa(result.updatedList);
        appendAuditLog(
          'IMPORT_LINK_KARTU_UJIAN',
          `Memperbarui ${result.matchedCount} link foto/barcode peserta dari ${file.name}.`
        );
        notify('success', result.message);
      } else {
        notify('error', result.message);
      }
    } catch {
      notify('error', 'Gagal membaca file Excel daftar link peserta.');
    }
  };

  // Single photo upload
  const handleSinglePhotoUpload = async (siswaId: string, file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 280, false);
      handleUpdateSiswaField(siswaId, 'fotoUrl', dataUrl);
      notify('success', 'Foto peserta 3x4 berhasil diunggah dan dikompresi.');
    } catch {
      notify('error', 'Gagal memproses file foto siswa.');
    }
  };

  // Batch photo upload auto-matched by NISN / NIS / NIPD / Nama
  const handleBatchPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let matchedCount = 0;
    const unmatched: string[] = [];
    const photoMap = new Map<string, string>();

    for (const file of files) {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const normFile = normalizeKey(baseName);

      const target = activeSiswa.find(s => {
        const candidates = [s.nisn, s.nis, s.nipd, s.nama]
          .filter(Boolean)
          .map(v => normalizeKey(String(v)));
        return candidates.some(c => c && (c === normFile || normFile.includes(c)));
      });

      if (target) {
        try {
          const dataUrl = await compressImageFile(file, 280, false);
          photoMap.set(target.id, dataUrl);
          matchedCount++;
        } catch {
          unmatched.push(file.name);
        }
      } else {
        unmatched.push(file.name);
      }
    }

    if (photoMap.size > 0) {
      const updated = siswaList.map(s =>
        photoMap.has(s.id) ? { ...s, fotoUrl: photoMap.get(s.id) } : s
      );
      onUpdateSiswa(updated);
      appendAuditLog(
        'UPLOAD_FOTO_KARTU_UJIAN',
        `Mengunggah massal ${matchedCount} foto peserta ulangan.`
      );
    }

    if (unmatched.length > 0) {
      notify(
        matchedCount > 0 ? 'success' : 'error',
        `${matchedCount} foto berhasil dipasangkan. ${unmatched.length} file tidak cocok (${unmatched.slice(0, 3).join(', ')}${unmatched.length > 3 ? '...' : ''}).`
      );
    } else {
      notify('success', `Seluruh ${matchedCount} foto peserta berhasil dipasangkan otomatis!`);
    }

    e.target.value = '';
  };

  // Shared room & exam number computation supporting per-N-students modes
  const assignParticipants = (overwriteNomorAndSesi: boolean) => {
    const rawTargets =
      selectedIds.length > 0
        ? filteredSiswa.filter(s => selectedIds.includes(s.id))
        : filteredSiswa;

    if (rawTargets.length === 0) {
      notify('error', 'Tidak ada peserta aktif yang dipilih atau tampil.');
      return;
    }

    const sessions = settings.sesiTersedia.length > 0 ? settings.sesiTersedia : ['Sesi 1'];
    const cap = Math.max(1, settings.kapasitasPerRuang || 20);
    const startRoom = Math.max(1, settings.mulaiNomorRuang || 1);
    const prefixRuang = settings.defaultRuangPrefix ?? 'R.';
    const mode = settings.modePembagianRuang || 'sequential';
    const targetIdSet = new Set(rawTargets.map(t => t.id));

    // Order targets deterministically by class then name
    const orderedTargets = [...rawTargets].sort((a, b) => {
      const ka = (a.rombelSaatIni || a.kelas || '').localeCompare(b.rombelSaatIni || b.kelas || '');
      if (ka !== 0) return ka;
      return a.nama.localeCompare(b.nama);
    });

    const assignmentMap = new Map<
      string,
      { nomorUjian: string; ruangUjian: string; sesiUjian: string }
    >();

    // Determine target sessions first
    const resolvedSessions = orderedTargets.map((s, idx) => {
      if (!overwriteNomorAndSesi && s.sesiUjian?.trim()) {
        return s.sesiUjian.trim();
      }
      return autoAssignSesiMode === 'rotate'
        ? sessions[idx % sessions.length]
        : autoAssignSesiMode;
    });

    const baseAwalNopes = resolveAwalNopes10Digit(
      awalNopesDraft || settings.nomorPesertaAwal || settings.prefixNomorUjian
    );
    if (
      settings.nomorPesertaAwal !== baseAwalNopes ||
      settings.prefixNomorUjian !== baseAwalNopes
    ) {
      onUpdateSettings({
        ...settings,
        nomorPesertaAwal: baseAwalNopes,
        prefixNomorUjian: baseAwalNopes
      });
      setAwalNopesDraft(baseAwalNopes);
    }

    const roomCountSummary = new Map<string, number>();

    if (mode === 'per_sesi') {
      const sesiCounters = new Map<string, number>();
      orderedTargets.forEach((s, idx) => {
        const sesi = resolvedSessions[idx];
        const posInSesi = sesiCounters.get(sesi) || 0;
        sesiCounters.set(sesi, posInSesi + 1);
        const roomNumber = startRoom + Math.floor(posInSesi / cap);
        const ruangUjian = `${prefixRuang}${String(roomNumber).padStart(2, '0')}`;
        const existingClean = s.nomorUjian?.trim()
          ? sanitizeNomorUjian10Digit(s.nomorUjian, true)
          : '';
        const nomorUjian =
          !overwriteNomorAndSesi && existingClean
            ? existingClean
            : formatNomorUjian10Digit(baseAwalNopes, idx);
        assignmentMap.set(s.id, { nomorUjian, ruangUjian, sesiUjian: sesi });
        roomCountSummary.set(ruangUjian, (roomCountSummary.get(ruangUjian) || 0) + 1);
      });
    } else if (mode === 'per_kelas') {
      let currentRoomCursor = startRoom;
      let lastClass = '';
      let posInClass = 0;

      orderedTargets.forEach((s, idx) => {
        const kelas = s.rombelSaatIni || s.kelas || 'Umum';
        if (idx > 0 && kelas !== lastClass) {
          currentRoomCursor += Math.floor((posInClass - 1) / cap) + 1;
          posInClass = 0;
        }
        lastClass = kelas;
        const roomNumber = currentRoomCursor + Math.floor(posInClass / cap);
        posInClass++;
        const ruangUjian = `${prefixRuang}${String(roomNumber).padStart(2, '0')}`;
        const existingClean = s.nomorUjian?.trim()
          ? sanitizeNomorUjian10Digit(s.nomorUjian, true)
          : '';
        const nomorUjian =
          !overwriteNomorAndSesi && existingClean
            ? existingClean
            : formatNomorUjian10Digit(baseAwalNopes, idx);
        assignmentMap.set(s.id, {
          nomorUjian,
          ruangUjian,
          sesiUjian: resolvedSessions[idx]
        });
        roomCountSummary.set(ruangUjian, (roomCountSummary.get(ruangUjian) || 0) + 1);
      });
    } else {
      // 'sequential': Fill R.01 with `cap` students, then R.02, etc.
      orderedTargets.forEach((s, idx) => {
        const roomNumber = startRoom + Math.floor(idx / cap);
        const ruangUjian = `${prefixRuang}${String(roomNumber).padStart(2, '0')}`;
        const existingClean = s.nomorUjian?.trim()
          ? sanitizeNomorUjian10Digit(s.nomorUjian, true)
          : '';
        const nomorUjian =
          !overwriteNomorAndSesi && existingClean
            ? existingClean
            : formatNomorUjian10Digit(baseAwalNopes, idx);
        assignmentMap.set(s.id, {
          nomorUjian,
          ruangUjian,
          sesiUjian: resolvedSessions[idx]
        });
        roomCountSummary.set(ruangUjian, (roomCountSummary.get(ruangUjian) || 0) + 1);
      });
    }

    const updated = siswaList.map(s => {
      if (targetIdSet.has(s.id) && assignmentMap.has(s.id)) {
        return { ...s, ...assignmentMap.get(s.id)! };
      }
      return s;
    });

    onUpdateSiswa(updated);
    setFilterRuang('all');

    const totalRoomsCreated = roomCountSummary.size;
    appendAuditLog(
      overwriteNomorAndSesi ? 'GENERATE_KARTU_UJIAN' : 'BAGI_RUANG_KARTU_UJIAN',
      `${overwriteNomorAndSesi ? `Generate No. Ujian (${baseAwalNopes} dst.), Ruang & Sesi` : 'Pembagian ruang'} untuk ${orderedTargets.length} peserta (${cap} anak/ruang → ${totalRoomsCreated} ruang).`
    );
    notify(
      'success',
      `Berhasil membagi ${orderedTargets.length} peserta ke dalam ${totalRoomsCreated} ruang (maks ${cap} anak/ruang)${
        overwriteNomorAndSesi ? ` dengan Nopes mulai ${baseAwalNopes}` : ''
      }.`
    );
  };

  const handleApplyAwalNopes = () => {
    const resolved = resolveAwalNopes10Digit(awalNopesDraft);
    setAwalNopesDraft(resolved);
    onUpdateSettings({
      ...settings,
      nomorPesertaAwal: resolved,
      prefixNomorUjian: resolved
    });
    notify(
      'success',
      `Setting Awal Nopes diterapkan: ${resolved}. Input nomor peserta kini menyesuaikan setting awal ini.`
    );
  };

  const handleGenerateNopesOnly = () => {
    const rawTargets =
      selectedIds.length > 0
        ? filteredSiswa.filter(s => selectedIds.includes(s.id))
        : filteredSiswa;

    if (rawTargets.length === 0) {
      notify('error', 'Tidak ada peserta aktif yang dipilih atau tampil.');
      return;
    }

    const resolvedAwal = resolveAwalNopes10Digit(
      awalNopesDraft || settings.nomorPesertaAwal || settings.prefixNomorUjian
    );
    setAwalNopesDraft(resolvedAwal);
    onUpdateSettings({
      ...settings,
      nomorPesertaAwal: resolvedAwal,
      prefixNomorUjian: resolvedAwal
    });

    const orderedTargets = [...rawTargets].sort((a, b) => {
      const ka = (a.rombelSaatIni || a.kelas || '').localeCompare(b.rombelSaatIni || b.kelas || '');
      if (ka !== 0) return ka;
      return a.nama.localeCompare(b.nama);
    });

    const nopesMap = new Map<string, string>();
    orderedTargets.forEach((s, idx) => {
      nopesMap.set(s.id, formatNomorUjian10Digit(resolvedAwal, idx));
    });

    const updated = siswaList.map(s =>
      nopesMap.has(s.id) ? { ...s, nomorUjian: nopesMap.get(s.id)! } : s
    );
    onUpdateSiswa(updated);

    const lastGenerated = formatNomorUjian10Digit(resolvedAwal, orderedTargets.length - 1);
    appendAuditLog(
      'GENERATE_NOPES_KARTU_UJIAN',
      `Generate Nopes 10 digit untuk ${orderedTargets.length} peserta (${resolvedAwal} s.d. ${lastGenerated}).`
    );
    notify(
      'success',
      `Berhasil generate ${orderedTargets.length} Nomor Peserta (10 digit): ${resolvedAwal} s.d. ${lastGenerated}.`
    );
  };

  const handleApplyRoomDivision = () => assignParticipants(false);
  const handleAutoGenerateAll = () => assignParticipants(true);

  const handleResetPengaturanRuang = (scope: 'all' | 'selected') => {
    if (scope === 'selected') {
      if (selectedIds.length === 0) {
        notify('error', 'Pilih minimal 1 peserta terlebih dahulu.');
        return;
      }
      const selectedSet = new Set(selectedIds);
      const updated = siswaList.map(s =>
        selectedSet.has(s.id) ? { ...s, ruangUjian: '' } : s
      );
      onUpdateSiswa(updated);
      setFilterRuang('all');
      setConfirmResetRuangTarget('none');
      appendAuditLog(
        'RESET_RUANG_PESERTA_TERPILIH',
        `Mengosongkan pengaturan ruang ${selectedIds.length} peserta ke awal (belum tersetting ruang).`
      );
      notify(
        'success',
        `Ruang ujian untuk ${selectedIds.length} peserta terpilih berhasil dikosongkan (belum tersetting ruang).`
      );
      return;
    }

    const updated = siswaList.map(s => ({ ...s, ruangUjian: '' }));
    onUpdateSiswa(updated);
    onUpdateSettings({
      ...settings,
      defaultRuangPrefix: initialKartuUjianSettings.defaultRuangPrefix,
      kapasitasPerRuang: initialKartuUjianSettings.kapasitasPerRuang,
      mulaiNomorRuang: initialKartuUjianSettings.mulaiNomorRuang,
      modePembagianRuang: initialKartuUjianSettings.modePembagianRuang,
      pisahHalamanPerRuang: initialKartuUjianSettings.pisahHalamanPerRuang
    });
    setKapasitasInput(String(initialKartuUjianSettings.kapasitasPerRuang));
    setFilterRuang('all');
    setSelectedIds([]);
    setConfirmResetRuangTarget('none');
    appendAuditLog(
      'RESET_PENGATURAN_RUANG_NOL',
      `Reset seluruh pengaturan ruang Kartu Peserta Siswa (${updated.length} siswa) kembali ke awal (0 / belum tersetting ruang).`
    );
    notify(
      'success',
      'Pengaturan ruang Kartu Peserta Siswa di-reset ke awal (0 / belum tersetting ruang).'
    );
  };

  const handleKapasitasChange = (valStr: string) => {
    setKapasitasInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      onUpdateSettings({
        ...settings,
        kapasitasPerRuang: Math.min(200, parsed)
      });
    }
  };

  const handlePresetKapasitas = (preset: number) => {
    setKapasitasInput(String(preset));
    onUpdateSettings({ ...settings, kapasitasPerRuang: preset });
  };

  // Custom TTD KS / Stempel image upload
  const handleSealOrSignUpload = async (
    field: 'ttdKsUrl' | 'stempelUrl',
    file?: File
  ) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 360, true);
      onUpdateSettings({ ...settings, [field]: dataUrl });
      notify(
        'success',
        field === 'ttdKsUrl'
          ? 'Gambar tanda tangan Kepala Sekolah diperbarui.'
          : 'Gambar stempel sekolah diperbarui.'
      );
    } catch {
      notify('error', 'Gagal memproses gambar pengesahan.');
    }
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredSiswa.map(s => s.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredIds]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAddSesi = () => {
    const trimmed = newSesiInput.trim();
    if (!trimmed) {
      notify('error', 'Masukkan nama/waktu sesi baru terlebih dahulu.');
      return;
    }
    if (settings.sesiTersedia.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      notify('error', `Sesi "${trimmed}" sudah ada dalam daftar.`);
      return;
    }
    onUpdateSettings({
      ...settings,
      sesiTersedia: [...settings.sesiTersedia, trimmed]
    });
    setNewSesiInput('');
    notify('success', `Sesi "${trimmed}" berhasil ditambahkan.`);
  };

  const handleStartEditSesi = (sesi: string) => {
    setEditingSesiKey(sesi);
    setEditingSesiValue(sesi);
  };

  const handleSaveEditSesi = (oldSesi: string) => {
    const clean = editingSesiValue.trim();
    if (!clean) {
      notify('error', 'Nama/waktu sesi tidak boleh kosong.');
      return;
    }
    if (
      clean !== oldSesi &&
      settings.sesiTersedia.some(s => s !== oldSesi && s.toLowerCase() === clean.toLowerCase())
    ) {
      notify('error', `Sesi "${clean}" sudah ada dalam daftar.`);
      return;
    }
    if (clean === oldSesi) {
      setEditingSesiKey(null);
      return;
    }

    const nextSesiList = settings.sesiTersedia.map(s => (s === oldSesi ? clean : s));
    const nextJadwal = jadwalList.map(row => {
      if (row.kondisiTarget === 'Sesi' && row.kondisiNilai) {
        const updatedTokens = row.kondisiNilai
          .split(/[,;|]+/)
          .map(tok => tok.trim())
          .filter(Boolean)
          .map(tok => (tok.toLowerCase() === oldSesi.toLowerCase() ? clean : tok));
        return { ...row, kondisiNilai: updatedTokens.join(', ') };
      }
      return row;
    });

    onUpdateSettings({
      ...settings,
      sesiTersedia: nextSesiList,
      jadwalUjian: nextJadwal
    });

    let affectedStudents = 0;
    const nextSiswa = siswaList.map(s => {
      if ((s.sesiUjian || '').trim() === oldSesi) {
        affectedStudents++;
        return { ...s, sesiUjian: clean };
      }
      return s;
    });
    if (affectedStudents > 0) {
      onUpdateSiswa(nextSiswa);
    }

    if (autoAssignSesiMode === oldSesi) setAutoAssignSesiMode(clean);
    if (filterSesi === oldSesi) setFilterSesi(clean);
    if (alignTargetSesi === oldSesi) setAlignTargetSesi(clean);
    setEditingSesiKey(null);
    notify(
      'success',
      `Sesi "${oldSesi}" diperbarui menjadi "${clean}"${
        affectedStudents > 0 ? ` (${affectedStudents} peserta ikut disinkronkan)` : ''
      }.`
    );
  };

  const handleRemoveSesi = (sesi: string) => {
    const nextList = settings.sesiTersedia.filter(s => s !== sesi);
    onUpdateSettings({
      ...settings,
      sesiTersedia: nextList
    });
    let clearedCount = 0;
    const nextSiswa = siswaList.map(s => {
      if ((s.sesiUjian || '').trim() === sesi) {
        clearedCount++;
        return { ...s, sesiUjian: '' };
      }
      return s;
    });
    if (clearedCount > 0) {
      onUpdateSiswa(nextSiswa);
    }
    if (editingSesiKey === sesi) {
      setEditingSesiKey(null);
    }
    if (autoAssignSesiMode === sesi) {
      setAutoAssignSesiMode('rotate');
    }
    if (filterSesi === sesi) {
      setFilterSesi('all');
    }
    notify(
      'success',
      `Sesi "${sesi}" dihapus dari daftar${
        clearedCount > 0
          ? ` (${clearedCount} peserta dikembalikan mengikuti sesi aktif pertama)`
          : ''
      }.`
    );
  };

  const handleResetDefaultSesi = () => {
    const defaults = initialKartuUjianSettings.sesiTersedia || [
      'Sesi 1 (07.30 - 09.30)',
      'Sesi 2 (10.00 - 12.00)',
      'Sesi 3 (13.00 - 15.00)'
    ];
    onUpdateSettings({
      ...settings,
      sesiTersedia: [...defaults]
    });
    setEditingSesiKey(null);
    notify('success', 'Daftar pilihan sesi dikembalikan ke bawaan.');
  };

  const handleBatchApplySesiSiswa = (targetSesi: string) => {
    const targetIds =
      selectedIds.length > 0 ? new Set(selectedIds) : new Set(filteredSiswa.map(s => s.id));
    if (targetIds.size === 0) {
      notify('error', 'Tidak ada peserta yang dipilih.');
      return;
    }
    onUpdateSiswa(
      siswaList.map(s => (targetIds.has(s.id) ? { ...s, sesiUjian: targetSesi } : s))
    );
    if (filterSesi !== 'all' && filterSesi !== targetSesi) {
      setFilterSesi('all');
    }
    notify(
      'success',
      `Sesi "${targetSesi}" diterapkan ke ${targetIds.size} peserta & jam jadwal kartu belakang otomatis mengikuti sesi ini.`
    );
  };

  const handleSyncOrphanedSiswaSessions = () => {
    if (settings.sesiTersedia.length === 0) {
      notify('error', 'Daftar Set Sesi kosong. Tambahkan minimal 1 sesi terlebih dahulu.');
      return;
    }
    const activeSet = new Set(settings.sesiTersedia);
    const defaultFallback = settings.sesiTersedia[0];
    let updatedCount = 0;

    const updated = siswaList.map(s => {
      const current = (s.sesiUjian || '').trim();
      if (!current || activeSet.has(current)) return s;
      const curBase = extractSessionBaseName(current);
      const matched = settings.sesiTersedia.find(
        opt =>
          opt.toLowerCase() === current.toLowerCase() ||
          (curBase && extractSessionBaseName(opt) === curBase)
      );
      updatedCount++;
      return { ...s, sesiUjian: matched || defaultFallback };
    });

    if (updatedCount > 0) {
      onUpdateSiswa(updated);
      if (filterSesi === '__mismatch__' || (filterSesi !== 'all' && !activeSet.has(filterSesi))) {
        setFilterSesi('all');
      }
      notify('success', `${updatedCount} peserta berhasil disinkronkan dengan daftar Set Sesi aktif.`);
    }
  };

  const handleAlignJadwalTableToSesi = (targetSesi: string) => {
    if (!targetSesi) {
      notify('error', 'Pilih target sesi acuan terlebih dahulu.');
      return;
    }
    const aligned = alignJadwalListToSesi(jadwalList, targetSesi, settings.sesiTersedia);
    onUpdateSettings({ ...settings, jadwalUjian: aligned });
    notify(
      'success',
      `Jam pada tabel jadwal berhasil diselaraskan dengan ${targetSesi}.`
    );
  };

  const handleToggleJadwalSesiConditionToken = (item: JadwalUjianItem, sesiOption: string) => {
    const existingTokens = (item.kondisiNilai || '')
      .split(/[,;|]+/)
      .map(t => t.trim())
      .filter(Boolean);
    const exists = existingTokens.some(t => t.toLowerCase() === sesiOption.toLowerCase());
    const nextTokens = exists
      ? existingTokens.filter(t => t.toLowerCase() !== sesiOption.toLowerCase())
      : [...existingTokens, sesiOption];
    handleUpdateJadwalRow(item.id, { kondisiNilai: nextTokens.join(', ') });
  };

  const handlePrintCards = () => {
    appendAuditLog(
      'CETAK_KARTU_UJIAN',
      `Mencetak ${cardsToPrint.length} Kartu Peserta Ulangan (${
        printMode === 'individual' ? 'Individu' : 'Massal'
      } • ${settings.namaUjian}).`
    );
    window.print();
  };

  const applyPesertaLayoutPreset = (preset: 'standar_id' | 'standar_6' | 'a4_4_orang') => {
    if (preset === 'a4_4_orang') {
      onUpdateSettings({
        ...settings,
        ukuranKertas: 'A4',
        orientasiCetak: 'portrait',
        jumlahKolom: 2,
        layoutPerPage: 4,
        lebarKartuMm: undefined,
        tinggiKartuMm: undefined
      });
      setStatusMsg({
        type: 'success',
        text: 'Tata letak Kartu Peserta diatur ke Kertas A4 untuk 4 Orang per lembar (2×2).'
      });
      return;
    }
    if (preset === 'standar_id') {
      onUpdateSettings({
        ...settings,
        ukuranKertas: 'F4',
        orientasiCetak: 'portrait',
        jumlahKolom: 3,
        layoutPerPage: 9,
        lebarKartuMm: 58,
        tinggiKartuMm: 95
      });
      setStatusMsg({
        type: 'success',
        text: 'Ukuran Kartu Peserta diatur ke Standar ID Card (58×95 mm • 3 kolom).'
      });
      return;
    }
    onUpdateSettings({
      ...settings,
      ukuranKertas: 'A4',
      orientasiCetak: 'portrait',
      jumlahKolom: 2,
      layoutPerPage: 6,
      lebarKartuMm: undefined,
      tinggiKartuMm: undefined
    });
    setStatusMsg({
      type: 'success',
      text: 'Tata letak Kartu Peserta diatur ke Standar A4 (6 Orang per lembar).'
    });
  };

  const isCompactLayout = settings.layoutPerPage === 8;

  return (
    <div className="space-y-6">
      {/* Top Action & Metric Header (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-900 text-amber-400 rounded-lg shrink-0">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kartu Peserta Ulangan & Pengesahan Kepala Sekolah
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cetak kartu peserta ulangan lengkap dengan pas foto 3x4, nomor ujian, jadwal sesi, ruang, tanda tangan Kepala Sekolah, dan stempel resmi {profile.namaSekolah}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutoGenerateAll}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              title="Generate otomatis Nomor Ujian, Ruang, dan Sesi"
            >
              <Wand2 className="w-4 h-4" />
              <span>Generate No. Ujian & Sesi</span>
            </button>

            <button
              onClick={handlePrintCards}
              disabled={cardsToPrint.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak {cardsToPrint.length} Kartu Ulangan</span>
            </button>
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">Total Peserta Aktif</div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {stats.total} <span className="text-xs font-sans font-normal text-slate-500">siswa</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">Memiliki No. Ujian</div>
            <div className="text-lg font-bold text-blue-700 font-mono tabular-nums">
              {stats.withNomor} <span className="text-xs font-sans font-normal text-slate-500">/ {stats.total}</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">Terpasang Foto 3x4</div>
            <div className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
              {stats.withFoto} <span className="text-xs font-sans font-normal text-slate-500">/ {stats.total}</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">Terjadwal Sesi Ujian</div>
            <div className="text-lg font-bold text-amber-700 font-mono tabular-nums">
              {stats.withSesi} <span className="text-xs font-sans font-normal text-slate-500">/ {stats.total}</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">Tersetting Ruang</div>
            <div
              className={`text-lg font-bold font-mono tabular-nums ${
                stats.withRuang > 0 ? 'text-indigo-700' : 'text-slate-500'
              }`}
            >
              {stats.withRuang} <span className="text-xs font-sans font-normal text-slate-500">/ {stats.total}</span>
            </div>
            <div className="text-[10.5px] text-slate-500 tabular-nums">
              {stats.totalRooms > 0 ? `${stats.totalRooms} ruang aktif` : 'Belum tersetting (0 ruang)'}
            </div>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`px-3.5 py-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Configuration Tabs (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveConfigTab(activeConfigTab === 'ujian' ? 'none' : 'ujian')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'ujian'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan Ujian, Ruang & Sesi</span>
            </button>
            <button
              onClick={() => setActiveConfigTab(activeConfigTab === 'jadwal' ? 'none' : 'jadwal')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'jadwal'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Form Belakang & Excel Kondisional</span>
            </button>
            <button
              onClick={() => setActiveConfigTab(activeConfigTab === 'cetak' ? 'none' : 'cetak')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'cetak'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Setting Pencetakan</span>
            </button>
            <button
              onClick={() => setActiveConfigTab(activeConfigTab === 'ttd' ? 'none' : 'ttd')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'ttd'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Stamp className="w-3.5 h-3.5" />
              <span>TTD KS & Stempel</span>
            </button>
            <button
              onClick={() => setActiveConfigTab(activeConfigTab === 'foto' ? 'none' : 'foto')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'foto'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Foto, Barcode & Link Excel</span>
            </button>
          </div>
          {activeConfigTab !== 'none' && (
            <button
              onClick={() => setActiveConfigTab('none')}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
            >
              Tutup Panel
            </button>
          )}
        </div>

        {/* Panel 1: Exam, Room Division, Numbering & Session Settings */}
        {activeConfigTab === 'ujian' && (
          <div className="p-4 space-y-4 text-xs">
            {/* Highlighted Room Division Config Box */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500 text-slate-950 rounded">
                    <DoorOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      Pengaturan Pembagian Ruang Ujian (Per ... Anak)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Atur kapasitas peserta per ruang dan klik Terapkan untuk membagi peserta secara otomatis.
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmResetRuangTarget(prev => (prev === 'panel' ? 'none' : 'panel'))
                    }
                    className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0 whitespace-nowrap"
                    title="Reset pengaturan ruang & kosongkan penempatan ruang siswa kembali ke awal (0)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Ruang (Nol)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoomGroupInitialRoom(filterRuang !== 'all' ? filterRuang : undefined);
                      setIsRoomGroupModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Atur Kelompok Anak per Ruang</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyRoomDivision}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-amber-400 font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0 whitespace-nowrap"
                  >
                    <DoorOpen className="w-3.5 h-3.5" />
                    <span>
                      Terapkan Pembagian ({settings.kapasitasPerRuang} Anak/Ruang)
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                {/* Kapasitas Anak per Ruang + Quick Presets */}
                <div className="lg:col-span-5 space-y-1.5">
                  <label className="block font-bold text-slate-800">
                    Pembagian Per Ruang (Jumlah Anak / Ruang)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center border border-slate-300 rounded bg-white overflow-hidden">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={kapasitasInput}
                        onChange={e => handleKapasitasChange(e.target.value)}
                        onBlur={() =>
                          setKapasitasInput(String(Math.max(1, settings.kapasitasPerRuang || 20)))
                        }
                        className="w-16 px-2.5 py-1.5 font-mono font-bold text-slate-950 text-center focus:outline-none"
                      />
                      <span className="px-2.5 py-1.5 bg-slate-100 border-l border-slate-200 font-semibold text-slate-700">
                        Anak / Ruang
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {[15, 20, 25, 30, 32, 36].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handlePresetKapasitas(preset)}
                          className={`px-2 py-1 rounded border font-mono font-semibold text-[11px] transition-colors ${
                            settings.kapasitasPerRuang === preset
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Prefix & Start Number */}
                <div className="lg:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Prefix Ruang</label>
                  <input
                    type="text"
                    value={settings.defaultRuangPrefix}
                    onChange={e =>
                      onUpdateSettings({ ...settings, defaultRuangPrefix: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                    placeholder="R."
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Mulai Ruang No.</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={settings.mulaiNomorRuang || 1}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        mulaiNomorRuang: Math.max(1, parseInt(e.target.value, 10) || 1)
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                  />
                </div>

                {/* Pola Pembagian Ruang */}
                <div className="lg:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Pola Pembagian Ruang</label>
                  <select
                    value={settings.modePembagianRuang || 'sequential'}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        modePembagianRuang: e.target.value as 'sequential' | 'per_sesi' | 'per_kelas'
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-800"
                  >
                    <option value="sequential">Berlanjut Semua Peserta</option>
                    <option value="per_sesi">Reset Ruang per Sesi</option>
                    <option value="per_kelas">Pisah per Kelas (Maks N/Ruang)</option>
                  </select>
                </div>
              </div>

              {/* Estimasi Kalkulasi Pembagian */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/80 text-[11px] text-slate-700">
                <div>
                  Target saat ini:{' '}
                  <strong className="font-mono text-slate-950">
                    {selectedIds.length > 0 ? selectedIds.length : filteredSiswa.length} peserta
                  </strong>{' '}
                  ÷{' '}
                  <strong className="font-mono text-slate-950">
                    {settings.kapasitasPerRuang} anak/ruang
                  </strong>{' '}
                  ={' '}
                  <strong className="font-mono text-blue-800">
                    {Math.max(
                      1,
                      Math.ceil(
                        (selectedIds.length > 0 ? selectedIds.length : filteredSiswa.length) /
                          Math.max(1, settings.kapasitasPerRuang || 20)
                      )
                    )}{' '}
                    Ruang
                  </strong>{' '}
                  ({settings.defaultRuangPrefix}
                  {String(settings.mulaiNomorRuang || 1).padStart(2, '0')} dst.)
                </div>
                <div className="text-slate-500">
                  {selectedIds.length > 0
                    ? `Berlaku untuk ${selectedIds.length} peserta terpilih`
                    : 'Berlaku untuk seluruh peserta yang tampil di tabel'}
                </div>
              </div>

              {confirmResetRuangTarget === 'panel' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="text-rose-900">
                    <strong>Konfirmasi Reset Pengaturan Ruang:</strong> Kolom Ruang Ujian peserta akan dikosongkan ke awal (<strong>0 / belum tersetting ruang</strong>) dan konfigurasi pembagian ruang kembali ke setelan awal.
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleResetPengaturanRuang('selected')}
                        className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded-md whitespace-nowrap"
                      >
                        Kosongkan {selectedIds.length} Terpilih
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleResetPengaturanRuang('all')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-md whitespace-nowrap"
                    >
                      Ya, Reset Semua ke Nol
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetRuangTarget('none')}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded-md"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Judul / Nama Ujian</label>
                  <input
                    type="text"
                    value={settings.namaUjian}
                    onChange={e => onUpdateSettings({ ...settings, namaUjian: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tahun Pelajaran</label>
                    <input
                      type="text"
                      value={settings.tahunPelajaran}
                      onChange={e => onUpdateSettings({ ...settings, tahunPelajaran: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Semester</label>
                    <input
                      type="text"
                      value={settings.semester}
                      onChange={e => onUpdateSettings({ ...settings, semester: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kota & Tanggal Penetapan</label>
                  <input
                    type="text"
                    value={settings.kotaTanggalCetak}
                    onChange={e => onUpdateSettings({ ...settings, kotaTanggalCetak: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-2.5">
                <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block font-bold text-slate-800">
                      Setting Awal Nopes (10 Digit)
                    </label>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-blue-200 text-blue-800 font-semibold">
                      {awalNopesDraft.length}/10 (Angka/Huruf)
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="text"
                    maxLength={10}
                    value={awalNopesDraft}
                    onChange={e => {
                      const clean = sanitizePrefixNomorUjian(e.target.value);
                      setAwalNopesDraft(clean);
                      if (clean.length === 10) {
                        onUpdateSettings({
                          ...settings,
                          nomorPesertaAwal: clean,
                          prefixNomorUjian: clean
                        });
                      }
                    }}
                    onBlur={() => {
                      const resolved = resolveAwalNopes10Digit(awalNopesDraft);
                      setAwalNopesDraft(resolved);
                      onUpdateSettings({
                        ...settings,
                        nomorPesertaAwal: resolved,
                        prefixNomorUjian: resolved
                      });
                    }}
                    className="w-full px-2.5 py-1.5 border border-blue-300 bg-white rounded font-mono font-bold uppercase text-slate-900 tracking-wider focus:outline-none focus:ring-1 focus:ring-blue-600"
                    placeholder="2627101001 / PSAS260001"
                  />
                  <p className="text-[10px] text-slate-600 font-mono">
                    Urutan:{' '}
                    <span className="font-bold text-slate-900">
                      {formatNomorUjian10Digit(effectiveAwalNopes, 0)}
                    </span>
                    ,{' '}
                    <span className="font-bold text-slate-900">
                      {formatNomorUjian10Digit(effectiveAwalNopes, 1)}
                    </span>
                    , dst.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleApplyAwalNopes}
                      className="flex-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded font-semibold text-[11px] transition-colors"
                    >
                      Terapkan Awal
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateNopesOnly}
                      className="flex-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Generate Nopes</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kepadatan Cetak</label>
                  <select
                    value={settings.layoutPerPage}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        layoutPerPage: Number(e.target.value) as 4 | 6 | 8 | 9
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value={4}>4 Kartu / Halaman (Besar)</option>
                    <option value={6}>6 Kartu / Halaman (Standar)</option>
                    <option value={8}>8 Kartu / Halaman (Padat)</option>
                    <option value={9}>9 Kartu / Halaman (3x3)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mode Pembagian Sesi Otomatis</label>
                  <select
                    value={autoAssignSesiMode}
                    onChange={e => setAutoAssignSesiMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="rotate">Bagi Rata Semua Sesi</option>
                    {settings.sesiTersedia.map(s => (
                      <option key={s} value={s}>
                        Set Semua: {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Kaki Kartu</label>
                  <input
                    type="text"
                    value={settings.catatanKaki}
                    onChange={e => onUpdateSettings({ ...settings, catatanKaki: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="md:col-span-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">Daftar Pilihan Sesi Ulangan</label>
                  <button
                    type="button"
                    onClick={handleResetDefaultSesi}
                    className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Sesi</span>
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newSesiInput}
                    onChange={e => setNewSesiInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSesi();
                      }
                    }}
                    placeholder="Tambah sesi, mis: Sesi 4 (15.15 - 17.00)"
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddSesi}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {settings.sesiTersedia.length === 0 ? (
                    <div className="px-2.5 py-2 bg-slate-50 border border-dashed border-slate-300 rounded text-[11px] text-slate-500 text-center">
                      Daftar sesi kosong. Tambahkan sesi baru di atas atau klik Reset Sesi.
                    </div>
                  ) : (
                    settings.sesiTersedia.map(sesi => {
                      const assignedCount = activeSiswa.filter(
                        s => (s.sesiUjian || '').trim() === sesi
                      ).length;
                      const isEditing = editingSesiKey === sesi;
                      return (
                        <div
                          key={sesi}
                          className="flex items-center justify-between gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded"
                        >
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-1">
                              <input
                                type="text"
                                value={editingSesiValue}
                                onChange={e => setEditingSesiValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEditSesi(sesi);
                                  } else if (e.key === 'Escape') {
                                    setEditingSesiKey(null);
                                  }
                                }}
                                autoFocus
                                className="flex-1 px-2 py-0.5 text-[11px] border border-blue-400 rounded bg-white text-slate-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditSesi(sesi)}
                                className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                                title="Simpan perubahan sesi"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSesiKey(null)}
                                className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                                title="Batal edit"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-medium text-slate-800 truncate">{sesi}</span>
                                {assignedCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold shrink-0">
                                    {assignedCount}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditSesi(sesi)}
                                  className="text-slate-600 hover:text-blue-700 p-0.5 rounded hover:bg-blue-50"
                                  title={`Edit waktu/nama ${sesi}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSesi(sesi)}
                                  className="text-rose-600 hover:text-rose-800 p-0.5 rounded hover:bg-rose-50"
                                  title={`Hapus ${sesi}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel 1B: Back Side Form & Conditional Excel Schedule */}
        {activeConfigTab === 'jadwal' && (
          <div className="p-4 space-y-4 text-xs">
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Form Sisi Belakang (Jadwal Ulangan & Setting Excel Kondisional)</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Atur daftar mata pelajaran yang tampil di sisi belakang kartu. Gunakan kolom{' '}
                  <strong className="text-slate-900">Kondisi Target</strong> &{' '}
                  <strong className="text-slate-900">Nilai Kondisi</strong> (atau edit via Excel) agar jadwal tampil dinamis sesuai{' '}
                  <span className="font-mono font-semibold">Kelas</span>,{' '}
                  <span className="font-mono font-semibold">Sesi</span>, atau{' '}
                  <span className="font-mono font-semibold">Ruang</span> peserta.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <input
                  ref={excelJadwalInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportExcelJadwal}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={downloadTemplateExcelJadwalUjian}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-800 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Template Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportJadwalUjianToExcel(jadwalList)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-800 flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => excelJadwalInputRef.current?.click()}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Impor Excel Jadwal</span>
                </button>
              </div>
            </div>

            {/* Repositori Jadwal Ulangan (Simpan, Arsip Otomatis, & Apply Kapan Saja) */}
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Archive className="w-4 h-4 text-slate-700 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                      <span>Repositori Jadwal Ulangan ({jadwalRepo.length})</span>
                      <span className="text-[11px] font-medium text-slate-500">
                        ·{' '}
                        {matchedSavedRepo ? (
                          <span className="text-emerald-700 font-semibold">
                            Jadwal aktif tersimpan ({matchedSavedRepo.nama})
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold">
                            Perubahan editor belum disimpan ke repositori
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Simpan beberapa paket jadwal ulangan (PSAS, STS, US, Try Out) dan{' '}
                      <strong className="text-slate-700">Apply</strong> kembali kapan saja tanpa menimpa jadwal lama.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCreateFreshJadwal}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-md font-semibold text-[11px] flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                    title="Amankan jadwal aktif ke repositori lalu mulai tabel jadwal baru"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Buat Jadwal Baru</span>
                  </button>
                </div>
              </div>

              {/* Form Simpan Jadwal Aktif ke Repositori */}
              <div className="p-3 bg-slate-50/50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-end gap-2.5">
                <div className="flex-1 min-w-0">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Paket Jadwal untuk Disimpan ke Repositori
                  </label>
                  <input
                    type="text"
                    value={repoNameInput}
                    onChange={e => setRepoNameInput(e.target.value)}
                    placeholder="Contoh: PSAS Gasal 2026/2027 · STS Genap · Try Out XII"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  />
                </div>
                <div className="lg:w-56">
                  <label className="block font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
                  <input
                    type="text"
                    value={repoNoteInput}
                    onChange={e => setRepoNoteInput(e.target.value)}
                    placeholder="mis: 16 mapel reguler"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {activeLinkedRepo && !matchedSavedRepo && (
                    <button
                      type="button"
                      onClick={() => handleUpdateLinkedRepoItem(activeLinkedRepo.id)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      title={`Perbarui slot repositori "${activeLinkedRepo.nama}"`}
                    >
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>Perbarui Slot Aktif</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCurrentJadwalAsNew}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-amber-400 rounded font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan sebagai Baru di Repositori</span>
                  </button>
                </div>
              </div>

              {/* Filter & Opsi Apply */}
              <div className="px-3 py-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={repoSearchQuery}
                    onChange={e => setRepoSearchQuery(e.target.value)}
                    placeholder="Cari jadwal di repositori..."
                    className="w-full pl-8 pr-2.5 py-1 border border-slate-200 rounded text-[11px] bg-white"
                  />
                </div>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyIncludeMetaAndSesi}
                    onChange={e => setApplyIncludeMetaAndSesi(e.target.checked)}
                    className="w-3.5 h-3.5 accent-blue-700 rounded"
                  />
                  <span>Saat Apply, ikut terapkan Nama Ujian, Semester & Set Sesi</span>
                </label>
              </div>

              {/* Daftar Jadwal di Repositori */}
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto bg-white">
                {filteredJadwalRepo.length === 0 ? (
                  <div className="px-4 py-5 text-center text-slate-400 text-[11px]">
                    {jadwalRepo.length === 0
                      ? 'Belum ada jadwal di repositori. Klik "Simpan sebagai Baru di Repositori" untuk menyimpan jadwal saat ini.'
                      : 'Tidak ada jadwal repositori yang cocok dengan pencarian.'}
                  </div>
                ) : (
                  filteredJadwalRepo.map(item => {
                    const isCurrentlyApplied =
                      computeJadwalSignature(item.jadwalUjian) === currentJadwalSig;
                    const isExpanded = expandedRepoId === item.id;
                    const isRenaming = renamingRepoId === item.id;
                    const isConfirmDelete = confirmDeleteRepoId === item.id;
                    const formattedDate = (() => {
                      try {
                        return new Date(item.updatedAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      } catch {
                        return item.updatedAt;
                      }
                    })();

                    return (
                      <div
                        key={item.id}
                        className={`px-3.5 py-2.5 transition-colors ${
                          isCurrentlyApplied ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="min-w-0 space-y-0.5">
                            {isRenaming ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={renamingRepoValue}
                                  onChange={e => setRenamingRepoValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveRenameRepoItem(item.id);
                                    if (e.key === 'Escape') setRenamingRepoId(null);
                                  }}
                                  className="px-2 py-0.5 border border-blue-400 rounded text-xs font-semibold bg-white min-w-[220px]"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRenameRepoItem(item.id)}
                                  className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                                  title="Simpan nama"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingRepoId(null)}
                                  className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                                  title="Batal"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">
                                  {item.nama}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingRepoId(item.id);
                                    setRenamingRepoValue(item.nama);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-blue-700 rounded"
                                  title="Ubah nama paket jadwal"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                {isCurrentlyApplied && (
                                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Sedang Diterapkan</span>
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 tabular-nums">
                              <span className="font-semibold text-slate-700">
                                {item.jadwalUjian.length} Mapel
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {item.namaUjian || 'Ujian'} ({item.semester || '-'}{' '}
                                {item.tahunPelajaran || '-'})
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>Diperbarui {formattedDate}</span>
                              {item.keterangan && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate max-w-[260px]">{item.keterangan}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRepoId(isExpanded ? null : item.id)
                              }
                              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-700 flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              <span>Lihat ({item.jadwalUjian.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateRepoItem(item)}
                              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600"
                              title="Duplikat jadwal ini"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {isConfirmDelete ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRepoItem(item.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10.5px] font-bold whitespace-nowrap"
                                >
                                  Konfirmasi Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRepoId(null)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10.5px] font-medium"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteRepoId(item.id)}
                                className="p-1.5 bg-white hover:bg-rose-50 border border-slate-200 rounded text-slate-500 hover:text-rose-600"
                                title="Hapus dari repositori"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleApplyRepoJadwal(item)}
                              className={`px-3 py-1 rounded font-bold text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                                isCurrentlyApplied
                                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>{isCurrentlyApplied ? 'Terapkan Ulang' : 'Apply Jadwal'}</span>
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-slate-200/80 overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="text-slate-500 border-b border-slate-200">
                                  <th className="py-1 pr-2 w-7">No</th>
                                  <th className="py-1 pr-2">Hari / Tanggal</th>
                                  <th className="py-1 pr-2">Waktu</th>
                                  <th className="py-1 pr-2">Mata Pelajaran</th>
                                  <th className="py-1">Target Kondisi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {item.jadwalUjian.map((row, rIdx) => (
                                  <tr key={`${item.id}-${row.id || rIdx}`}>
                                    <td className="py-1 pr-2 font-mono text-slate-400 tabular-nums">
                                      {rIdx + 1}
                                    </td>
                                    <td className="py-1 pr-2 text-slate-700">{row.hariTanggal}</td>
                                    <td className="py-1 pr-2 font-mono text-slate-700 tabular-nums">
                                      {row.waktu}
                                    </td>
                                    <td className="py-1 pr-2 font-semibold text-slate-900">
                                      {row.mataPelajaran}
                                    </td>
                                    <td className="py-1 text-slate-600">
                                      {row.kondisiTarget && row.kondisiTarget !== 'Semua'
                                        ? `${row.kondisiTarget}: ${row.kondisiNilai || '-'}`
                                        : 'Semua Peserta'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Back Card Title, Layout (Up to 16 Columns/Slots) & Notes Settings */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="md:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">Judul Sisi Belakang</label>
                <input
                  type="text"
                  value={settings.judulBelakang ?? 'FORM JADWAL ULANGAN'}
                  onChange={e => onUpdateSettings({ ...settings, judulBelakang: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold uppercase"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">Catatan Kaki Belakang</label>
                <input
                  type="text"
                  value={
                    settings.catatanBelakang ??
                    'Peserta wajib mengikuti ujian sesuai jadwal, sesi, dan ruang yang tercantum.'
                  }
                  onChange={e => onUpdateSettings({ ...settings, catatanBelakang: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Maks. Slot Mapel</label>
                <select
                  value={settings.maksJadwalBelakang ?? 16}
                  onChange={e =>
                    onUpdateSettings({
                      ...settings,
                      maksJadwalBelakang: Number(e.target.value)
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value={8}>8 Mata Pelajaran</option>
                  <option value={12}>12 Mata Pelajaran</option>
                  <option value={16}>16 Mata Pelajaran (Maks)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Tata Letak Tabel</label>
                <select
                  value={settings.tataLetakJadwalBelakang || 'otomatis'}
                  onChange={e =>
                    onUpdateSettings({
                      ...settings,
                      tataLetakJadwalBelakang: e.target.value as
                        | 'otomatis'
                        | '1_tabel'
                        | '2_tabel'
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value="otomatis">Otomatis (2 Kolom &gt;8 Mapel)</option>
                  <option value="2_tabel">2 Kolom (1-8 | 9-16)</option>
                  <option value="1_tabel">1 Kolom Memanjang</option>
                </select>
              </div>
            </div>

            {/* Session-Time Synchronization Control Strip */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1">
                <label className="inline-flex items-center gap-2 font-bold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.sinkronWaktuJadwalDenganSesi !== false}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        sinkronWaktuJadwalDenganSesi: e.target.checked
                      })
                    }
                    className="w-4 h-4 accent-emerald-700 rounded"
                  />
                  <Clock className="w-4 h-4 text-emerald-700" />
                  <span>Sinkronkan Waktu Jadwal dengan Set Sesi yang Diterapkan</span>
                </label>
                <p className="text-[11px] text-slate-600 pl-6">
                  {settings.sinkronWaktuJadwalDenganSesi !== false
                    ? 'Aktif: jam pada kartu belakang tiap siswa otomatis menyesuaikan rentang jam Set Sesi miliknya (misal Sesi 2 / Sesi 3 atau jam sesi hasil edit), kecuali baris berkondisi "Filter Sesi" khusus.'
                    : 'Nonaktif: kartu belakang memakai teks jam persis dari kolom Waktu pada tabel jadwal di bawah.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {settings.sesiTersedia.length > 0 && (
                  <>
                    <select
                      value={effectiveAlignTargetSesi}
                      onChange={e => setAlignTargetSesi(e.target.value)}
                      className="px-2 py-1.5 border border-emerald-300 rounded bg-white text-[11px] font-semibold text-slate-800"
                    >
                      {settings.sesiTersedia.map(sesi => (
                        <option key={sesi} value={sesi}>
                          {sesi}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAlignJadwalTableToSesi(effectiveAlignTargetSesi)}
                      className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-[11px] flex items-center gap-1 shadow-xs"
                      title="Sesuaikan langsung isi kolom Waktu di tabel jadwal di bawah agar cocok dengan sesi terpilih"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Terapkan Jam Sesi ke Tabel</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Conditional Schedule Table Editor */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-800">
                  Tabel Jadwal & Aturan Kondisional ({jadwalList.length} Mata Pelajaran • Tampil maks.{' '}
                  {settings.maksJadwalBelakang ?? 16} slot)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {jadwalList.length < 16 && (
                    <button
                      type="button"
                      onClick={handleFill16Slots}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Lengkapi 16 Slot</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetDefaultJadwal}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset 16 Mapel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddJadwalRow}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-black text-amber-400 rounded text-[11px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Jadwal</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-800 text-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-2.5 py-2 w-8 text-center">No</th>
                      <th className="px-2.5 py-2 w-36">Hari / Tanggal</th>
                      <th className="px-2.5 py-2 w-32">Waktu</th>
                      <th className="px-2.5 py-2">Mata Pelajaran</th>
                      <th className="px-2.5 py-2 w-32">Kondisi Target</th>
                      <th className="px-2.5 py-2 w-48">Nilai Kondisi</th>
                      <th className="px-2.5 py-2 w-36">Keterangan</th>
                      <th className="px-2.5 py-2 w-10 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {jadwalList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          Belum ada baris jadwal ulangan. Klik "Tambah Jadwal" atau "Impor Excel Jadwal".
                        </td>
                      </tr>
                    ) : (
                      jadwalList.map((item, idx) => {
                        const firstSesiRange = parseTimeRangeMinutes(settings.sesiTersedia[0]);
                        const rowRange = parseTimeRangeMinutes(item.waktu);
                        const isOutsideBaseSession =
                          item.kondisiTarget !== 'Sesi' &&
                          firstSesiRange &&
                          rowRange &&
                          (rowRange.start < firstSesiRange.start || rowRange.end > firstSesiRange.end);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50 align-top">
                            <td className="px-2.5 py-2 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={item.hariTanggal}
                                onChange={e =>
                                  handleUpdateJadwalRow(item.id, { hariTanggal: e.target.value })
                                }
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={item.waktu}
                                onChange={e =>
                                  handleUpdateJadwalRow(item.id, { waktu: e.target.value })
                                }
                                className={`w-full px-2 py-1 border rounded font-mono bg-white ${
                                  isOutsideBaseSession && settings.sinkronWaktuJadwalDenganSesi === false
                                    ? 'border-amber-400 bg-amber-50/40'
                                    : 'border-slate-300'
                                }`}
                              />
                              {isOutsideBaseSession && (
                                <div className="text-[9.5px] mt-0.5 text-amber-700 font-medium">
                                  {settings.sinkronWaktuJadwalDenganSesi !== false
                                    ? 'Auto ikut Set Sesi'
                                    : 'Di luar jam Sesi 1'}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={item.mataPelajaran}
                                onChange={e =>
                                  handleUpdateJadwalRow(item.id, { mataPelajaran: e.target.value })
                                }
                                className="w-full px-2 py-1 border border-slate-300 rounded font-semibold bg-white"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <select
                                value={item.kondisiTarget || 'Semua'}
                                onChange={e =>
                                  handleUpdateJadwalRow(item.id, {
                                    kondisiTarget: e.target.value as JadwalUjianItem['kondisiTarget'],
                                    kondisiNilai:
                                      e.target.value === 'Semua' ? '' : item.kondisiNilai
                                  })
                                }
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-semibold"
                              >
                                <option value="Semua">Semua Peserta</option>
                                <option value="Kelas">Filter Kelas</option>
                                <option value="Sesi">Filter Sesi</option>
                                <option value="Ruang">Filter Ruang</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5 space-y-1">
                              <input
                                type="text"
                                disabled={!item.kondisiTarget || item.kondisiTarget === 'Semua'}
                                value={item.kondisiNilai || ''}
                                onChange={e =>
                                  handleUpdateJadwalRow(item.id, { kondisiNilai: e.target.value })
                                }
                                placeholder={
                                  item.kondisiTarget === 'Kelas'
                                    ? 'mis: X atau XI, XII'
                                    : item.kondisiTarget === 'Sesi'
                                    ? 'Pilih / ketik sesi...'
                                    : item.kondisiTarget === 'Ruang'
                                    ? 'mis: R.01, R.02'
                                    : '(semua tampil)'
                                }
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                              />
                              {item.kondisiTarget === 'Sesi' && settings.sesiTersedia.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {settings.sesiTersedia.map(sesiOpt => {
                                    const active = (item.kondisiNilai || '')
                                      .split(/[,;|]+/)
                                      .map(t => t.trim().toLowerCase())
                                      .some(t => t === sesiOpt.toLowerCase());
                                    return (
                                      <button
                                        key={sesiOpt}
                                        type="button"
                                        onClick={() =>
                                          handleToggleJadwalSesiConditionToken(item, sesiOpt)
                                        }
                                        className={`px-1.5 py-0.5 rounded border text-[9.5px] font-semibold transition-colors ${
                                          active
                                            ? 'bg-blue-700 text-white border-blue-800'
                                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-blue-50'
                                        }`}
                                        title={`Klik untuk ${active ? 'lepas' : 'pilih'} ${sesiOpt}`}
                                      >
                                        {extractSessionBaseName(sesiOpt).replace(/^sesi\s*/i, 'Sesi ') ||
                                          sesiOpt}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={item.keterangan || ''}
                                onChange={e =>
                                  handleUpdateJadwalRow(item.id, { keterangan: e.target.value })
                                }
                                placeholder="Opsional"
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveJadwalRow(item.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                title="Hapus baris jadwal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Comprehensive Print Settings */}
        {activeConfigTab === 'cetak' && (
          <div className="p-4 space-y-4 text-xs">
            {/* Highlighted Two-Sided Duplex Print Bar */}
            <div className="bg-slate-900 text-slate-100 rounded-lg p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded shrink-0 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white">
                    Mode Sisi Kartu & Pencetakan Bolak-Balik (Depan + Belakang)
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Sisi Depan memuat identitas peserta, Sisi Belakang memuat Form Jadwal Ulangan.
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={settings.modeSisiCetak || 'pratinjau_berdampingan'}
                  onChange={e =>
                    onUpdateSettings({
                      ...settings,
                      modeSisiCetak: e.target.value as KartuUjianSettings['modeSisiCetak']
                    })
                  }
                  className="px-3 py-1.5 rounded bg-slate-800 border border-slate-600 text-amber-300 font-bold focus:outline-none"
                >
                  <option value="pratinjau_berdampingan">
                    Pratinjau Berdampingan (Cetak Bolak-Balik)
                  </option>
                  <option value="dua_sisi_bergantian">
                    Lembar Bergantian (Hal. Depan lalu Belakang)
                  </option>
                  <option value="depan_saja">Cetak Sisi Depan Saja</option>
                  <option value="belakang_saja">Cetak Sisi Belakang Saja (Jadwal)</option>
                </select>

                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.mirrorDuplexBelakang !== false}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        mirrorDuplexBelakang: e.target.checked
                      })
                    }
                    className="rounded text-amber-500"
                  />
                  <span>Cerminkan Kolom Belakang (Duplex)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Paper, Orientation & Margins */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ukuran Kertas & Margin Halaman</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ukuran Kertas</label>
                    <select
                      value={settings.ukuranKertas || 'A4'}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          ukuranKertas: e.target.value as 'A4' | 'F4' | 'Letter'
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="A4">A4 (210 x 297 mm)</option>
                      <option value="F4">F4 / Folio (215 x 330 mm)</option>
                      <option value="Letter">Letter (216 x 279 mm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Orientasi Kertas</label>
                    <select
                      value={settings.orientasiCetak || 'portrait'}
                      onChange={e => {
                        const nextOrient = e.target.value as 'portrait' | 'landscape';
                        const curCols = settings.jumlahKolom || 2;
                        const nextCols =
                          nextOrient === 'landscape'
                            ? curCols === 2
                              ? 3
                              : curCols
                            : curCols === 3 && settings.layoutPerPage !== 9
                            ? 2
                            : curCols;
                        onUpdateSettings({
                          ...settings,
                          orientasiCetak: nextOrient,
                          jumlahKolom: nextCols as 1 | 2 | 3
                        });
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="portrait">Portrait (Tegak)</option>
                      <option value="landscape">Landscape (Mendatar)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Margin Halaman</label>
                    <select
                      value={settings.marginCetak || 'standar'}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          marginCetak: e.target.value as 'sempit' | 'standar' | 'lebar'
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="sempit">Sempit (6 mm)</option>
                      <option value="standar">Standar (10 mm)</option>
                      <option value="lebar">Lebar (15 mm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Urutan Cetak Kartu</label>
                    <select
                      value={settings.urutanCetak || 'ruang_nama'}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          urutanCetak: e.target.value as 'tabel' | 'ruang_nama' | 'kelas_nama' | 'nomor_ujian'
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="ruang_nama">Urut Ruang lalu Nama</option>
                      <option value="kelas_nama">Urut Kelas lalu Nama</option>
                      <option value="nomor_ujian">Urut Nomor Ujian</option>
                      <option value="tabel">Sesuai Tampilan Tabel</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.pisahHalamanPerRuang)}
                    onChange={e =>
                      onUpdateSettings({ ...settings, pisahHalamanPerRuang: e.target.checked })
                    }
                    className="mt-0.5 rounded text-blue-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Pisah Halaman Baru per Ruang
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Setiap pindah ruang otomatis ganti lembar kertas agar mudah dibagikan ke pengawas.
                    </span>
                  </div>
                </label>
              </div>

              {/* Column 2: Grid Density, Columns, Cut Guides & Theme */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                  <Scissors className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tata Letak Grid, Tema & Garis Potong</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jumlah Kolom</label>
                    <select
                      value={settings.jumlahKolom || 2}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          jumlahKolom: Number(e.target.value) as 1 | 2 | 3
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value={1}>1 Kolom (Kartu Besar)</option>
                      <option value={2}>2 Kolom (Standar A4)</option>
                      <option value={3}>3 Kolom (Landscape/Mini)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kartu / Lembar</label>
                    <select
                      value={settings.layoutPerPage}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          layoutPerPage: Number(e.target.value) as 4 | 6 | 8 | 9
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value={4}>4 Kartu / Halaman</option>
                      <option value={6}>6 Kartu / Halaman</option>
                      <option value={8}>8 Kartu / Halaman</option>
                      <option value={9}>9 Kartu / Halaman (3x3)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jarak Antar Kartu</label>
                    <select
                      value={settings.jarakAntarKartu || 'standar'}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          jarakAntarKartu: e.target.value as 'rapat' | 'standar' | 'lega'
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="rapat">Rapat (8 px)</option>
                      <option value="standar">Standar (14 px)</option>
                      <option value="lega">Lega (20 px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Garis Bantu Potong</label>
                    <select
                      value={settings.garisPotong || 'dashed_gunting'}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          garisPotong: e.target.value as 'dashed_gunting' | 'dashed' | 'none'
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="dashed_gunting">Putus-putus + Gunting</option>
                      <option value="dashed">Putus-putus Saja</option>
                      <option value="none">Tanpa Garis Potong</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Tema Warna Cetak Kartu
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {[
                      { id: 'hijau', label: 'Hijau', swatch: 'bg-emerald-600' },
                      { id: 'kuning', label: 'Kuning', swatch: 'bg-amber-400' },
                      { id: 'merah', label: 'Merah', swatch: 'bg-rose-600' },
                      { id: 'biru', label: 'Biru', swatch: 'bg-blue-600' },
                      { id: 'abu_abu', label: 'Abu-abu', swatch: 'bg-slate-500' },
                      { id: 'monokrom', label: 'Hitam Putih', swatch: 'bg-white border border-slate-900' }
                    ].map(tema => (
                      <button
                        key={tema.id}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            temaWarnaKartu: tema.id as KartuUjianSettings['temaWarnaKartu']
                          })
                        }
                        className={`px-2 py-1.5 rounded border text-[11px] font-semibold text-left transition-colors flex items-center gap-1.5 ${
                          (settings.temaWarnaKartu || 'biru') === tema.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-xs shrink-0 ${tema.swatch}`} />
                        <span className="truncate">{tema.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Studio Desain Background, Font, Emboss, Gradasi & AI */}
                  <div className="mt-2.5 p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/60 space-y-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-indigo-950 flex items-center gap-1 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Desain Background, Font, Emboss & Gradasi AI</span>
                      </span>
                      {settings.temaWarnaKartu === 'ai_custom' && settings.aiCustomTheme && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-700 text-white text-[9.5px] font-bold truncate max-w-[130px]">
                          Aktif: {settings.aiCustomTheme.name}
                        </span>
                      )}
                    </div>

                    {/* Manual Emboss, Pattern & Gradient Fine-tuning */}
                    <div className="p-2 rounded bg-white border border-indigo-200/80 space-y-1.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-700 mb-0.5">
                            Emboss / Foil 3D
                          </label>
                          <select
                            value={settings.desainEmboss || ''}
                            onChange={e =>
                              onUpdateSettings({
                                ...settings,
                                desainEmboss: (e.target.value || undefined) as
                                  | CardEmbossStyle
                                  | undefined
                              })
                            }
                            className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white text-[10.5px] font-semibold"
                          >
                            <option value="">Otomatis Tema</option>
                            {CARD_EMBOSS_OPTIONS.map(em => (
                              <option key={em.id} value={em.id}>
                                {em.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9.5px] font-bold text-slate-700 mb-0.5">
                            Pola Background
                          </label>
                          <select
                            value={settings.desainPolaBg || ''}
                            onChange={e =>
                              onUpdateSettings({
                                ...settings,
                                desainPolaBg: (e.target.value || undefined) as
                                  | CardAccentPattern
                                  | undefined
                              })
                            }
                            className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white text-[10.5px] font-semibold"
                          >
                            <option value="">Otomatis Tema</option>
                            {CARD_PATTERN_OPTIONS.map(pat => (
                              <option key={pat.id} value={pat.id}>
                                {pat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 pt-0.5">
                        <label className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.desainGradasiAktif !== false}
                            onChange={e =>
                              onUpdateSettings({
                                ...settings,
                                desainGradasiAktif: e.target.checked
                              })
                            }
                            className="rounded text-indigo-600"
                          />
                          <span>Gradasi Warna</span>
                        </label>
                        <label className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.desainWatermarkLogo !== false}
                            onChange={e =>
                              onUpdateSettings({
                                ...settings,
                                desainWatermarkLogo: e.target.checked
                              })
                            }
                            className="rounded text-indigo-600"
                          />
                          <span>Watermark Logo Emboss</span>
                        </label>
                      </div>
                    </div>

                    {/* Curated Instant Designer Presets */}
                    <div>
                      <div className="text-[9.5px] font-bold text-indigo-900 uppercase tracking-wider mb-1">
                        Preset Kurasi Siap Pakai:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {CURATED_DESAIN_PRESETS.map(preset => {
                          const isActive =
                            settings.temaWarnaKartu === 'ai_custom' &&
                            settings.aiCustomTheme?.id === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() =>
                                onUpdateSettings({
                                  ...settings,
                                  temaWarnaKartu: 'ai_custom',
                                  aiCustomTheme: preset,
                                  desainFont: undefined,
                                  desainFontBody: undefined,
                                  desainEmboss: undefined,
                                  desainPolaBg: undefined
                                })
                              }
                              className={`p-1.5 rounded border text-left transition-all flex items-start gap-1.5 ${
                                isActive
                                  ? 'bg-slate-900 text-white border-slate-900 ring-1 ring-indigo-400'
                                  : 'bg-white text-slate-800 border-indigo-200 hover:border-indigo-400'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-xs shrink-0 border mt-0.5"
                                style={{
                                  background: `linear-gradient(135deg, ${preset.bannerBgHex}, ${preset.bannerBgEndHex || preset.bannerBgHex})`,
                                  borderColor: preset.outerBorderHex
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[10px] font-bold truncate">
                                  {preset.name}
                                </div>
                                <div
                                  className={`text-[8.5px] truncate ${
                                    isActive ? 'text-slate-300' : 'text-slate-500'
                                  }`}
                                >
                                  {preset.embossStyle?.replace('_', ' ')} •{' '}
                                  {preset.accentPattern?.replace('_', ' ')}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1 border-t border-indigo-200/70">
                      {[
                        'Safir Foil Emas Resmi',
                        'Batik Geometris Gradasi Segar',
                        'Hexagon CBT Modern Tegas',
                        'Klasik Serif Ukir Piagam'
                      ].map(mood => (
                        <button
                          key={mood}
                          type="button"
                          disabled={isGeneratingAiTheme}
                          onClick={() => {
                            setAiThemePrompt(mood);
                            handleGenerateAiThemes(mood);
                          }}
                          className="px-1.5 py-0.5 rounded border border-indigo-200 bg-white hover:bg-indigo-100 text-[10px] font-semibold text-indigo-800 disabled:opacity-50"
                        >
                          {mood}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={aiThemePrompt}
                        onChange={e => setAiThemePrompt(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !isGeneratingAiTheme) {
                            e.preventDefault();
                            handleGenerateAiThemes();
                          }
                        }}
                        placeholder="Konsep warna, gradasi, font, emboss AI..."
                        className="flex-1 min-w-0 px-2 py-1 border border-indigo-200 rounded bg-white text-[11px]"
                      />
                      <button
                        type="button"
                        disabled={isGeneratingAiTheme}
                        onClick={() => handleGenerateAiThemes()}
                        className="px-2.5 py-1 rounded bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
                      >
                        {isGeneratingAiTheme ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        <span>{isGeneratingAiTheme ? 'Proses...' : 'Buat 4 Desain AI'}</span>
                      </button>
                    </div>

                    {aiThemeError && (
                      <div className="text-[10.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                        {aiThemeError}
                      </div>
                    )}

                    {settings.aiThemePresets && settings.aiThemePresets.length > 0 && (
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        {settings.aiThemePresets.map((preset, idx) => {
                          const isActive =
                            settings.temaWarnaKartu === 'ai_custom' &&
                            settings.aiCustomTheme?.id === preset.id;
                          return (
                            <button
                              key={preset.id || idx}
                              type="button"
                              onClick={() =>
                                onUpdateSettings({
                                  ...settings,
                                  temaWarnaKartu: 'ai_custom',
                                  aiCustomTheme: preset,
                                  desainFont: undefined,
                                  desainFontBody: undefined,
                                  desainEmboss: undefined,
                                  desainPolaBg: undefined
                                })
                              }
                              className={`p-1.5 rounded border text-left transition-all flex items-start gap-1.5 ${
                                isActive
                                  ? 'bg-slate-900 text-white border-slate-900 ring-1 ring-indigo-400'
                                  : 'bg-white text-slate-800 border-indigo-200 hover:border-indigo-400'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-xs shrink-0 border mt-0.5"
                                style={{
                                  background: `linear-gradient(135deg, ${preset.bannerBgHex}, ${preset.bannerBgEndHex || preset.bannerBgHex})`,
                                  borderColor: preset.outerBorderHex
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[10.5px] font-bold truncate">
                                  {preset.name}
                                </div>
                                <div
                                  className={`text-[8.5px] truncate ${
                                    isActive ? 'text-slate-300' : 'text-slate-500'
                                  }`}
                                >
                                  {preset.embossStyle?.replace('_', ' ') || 'soft relief'} •{' '}
                                  {preset.fontStyle?.replace('_', ' ') || 'sans'}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 3: Visible Card Fields & Custom Title */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 pb-1.5 border-b border-slate-200">
                  <IdCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Elemen & Judul pada Kartu</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Judul Banner Kartu</label>
                  <input
                    type="text"
                    value={settings.judulKartu ?? 'KARTU PESERTA ULANGAN'}
                    onChange={e => onUpdateSettings({ ...settings, judulKartu: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold uppercase"
                    placeholder="KARTU PESERTA ULANGAN"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center gap-1.5 font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tampilkanKop !== false}
                      onChange={e =>
                        onUpdateSettings({ ...settings, tampilkanKop: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Mini Kop Sekolah</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tampilkanFoto !== false}
                      onChange={e =>
                        onUpdateSettings({ ...settings, tampilkanFoto: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Pas Foto 3x4</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tampilkanRuang !== false}
                      onChange={e =>
                        onUpdateSettings({ ...settings, tampilkanRuang: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Baris Ruang</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tampilkanSesi !== false}
                      onChange={e =>
                        onUpdateSettings({ ...settings, tampilkanSesi: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Baris Sesi</span>
                  </label>
                  <label className="flex items-center gap-1.5 font-medium text-slate-800 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={settings.tampilkanTataTertib !== false}
                      onChange={e =>
                        onUpdateSettings({ ...settings, tampilkanTataTertib: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Tata Tertib Singkat di Kiri Bawah</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                  <span>
                    Total estimasi cetak:{' '}
                    <strong className="font-mono text-slate-900">{printPages.length} lembar</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handlePrintCards}
                    disabled={cardsToPrint.length === 0}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Cetak Sekarang</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pengaturan Lebar & Tinggi Kartu Presisi (Peserta Didik) */}
            {(() => {
              const g = computePesertaPaperGeometry(settings);
              return (
                <CardDimensionsStudioPanel
                  mode="peserta"
                  value={{
                    sharedWidthMm: settings.lebarKartuMm,
                    sharedHeightMm: settings.tinggiKartuMm
                  }}
                  autoWidthMm={g.autoCardWidthMm}
                  autoHeightMm={g.autoCardHeightMm}
                  cols={g.cols}
                  rowsPerPage={g.rowsPerPage}
                  gapMm={g.gapMm}
                  printableWidthMm={g.printableWidthMm}
                  printableHeightMm={g.printableHeightMm}
                  paperLabel={`${g.paperCode} ${g.isLandscape ? 'Landscape' : 'Portrait'}`}
                  onChange={patch =>
                    onUpdateSettings({
                      ...settings,
                      ...('sharedWidthMm' in patch ? { lebarKartuMm: patch.sharedWidthMm } : {}),
                      ...('sharedHeightMm' in patch ? { tinggiKartuMm: patch.sharedHeightMm } : {})
                    })
                  }
                  onApplyToAllCardTypes={
                    onSyncDimensionsToAllCards
                      ? () => {
                          onSyncDimensionsToAllCards({
                            sharedWidthMm: settings.lebarKartuMm,
                            sharedHeightMm: settings.tinggiKartuMm
                          });
                          setStatusMsg({
                            type: 'success',
                            text: 'Ukuran lebar & tinggi kartu berhasil diterapkan ke Kartu Panitia, Pengawas, dan Peserta Didik.'
                          });
                        }
                      : undefined
                  }
                />
              );
            })()}

            {/* Galeri Macam Font, Pengaturan Ukuran/Ketebalan/Spasi & Generator Kombinasi */}
            <CardFontStudioPanel
              mode="peserta"
              value={{
                headingFont: settings.desainFont,
                bodyFont: settings.desainFontBody,
                fontScale: settings.desainFontScale,
                fontWeight: settings.desainFontWeight,
                letterSpacing: settings.desainLetterSpacing,
                uppercaseTitle: settings.desainJudulKapital
              }}
              onChange={patch =>
                onUpdateSettings({
                  ...settings,
                  ...('headingFont' in patch ? { desainFont: patch.headingFont } : {}),
                  ...('bodyFont' in patch ? { desainFontBody: patch.bodyFont } : {}),
                  ...('fontScale' in patch ? { desainFontScale: patch.fontScale } : {}),
                  ...('fontWeight' in patch ? { desainFontWeight: patch.fontWeight } : {}),
                  ...('letterSpacing' in patch
                    ? { desainLetterSpacing: patch.letterSpacing }
                    : {}),
                  ...('uppercaseTitle' in patch
                    ? { desainJudulKapital: patch.uppercaseTitle }
                    : {})
                })
              }
              onGenerateAiFontAndTheme={hint => {
                setAiThemePrompt(hint);
                handleGenerateAiThemes(hint);
              }}
              isGeneratingAi={isGeneratingAiTheme}
              onApplyToAllCardTypes={
                onSyncTypographyToAllCards
                  ? () =>
                      onSyncTypographyToAllCards({
                        headingFont: settings.desainFont,
                        bodyFont: settings.desainFontBody,
                        fontScale: settings.desainFontScale,
                        fontWeight: settings.desainFontWeight,
                        letterSpacing: settings.desainLetterSpacing,
                        uppercaseTitle: settings.desainJudulKapital
                      })
                  : undefined
              }
            />
          </div>
        )}

        {/* Panel 3: TTD Kepala Sekolah & Stempel */}
        {activeConfigTab === 'ttd' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* TTD Kepala Sekolah */}
            <div className="border border-slate-200 rounded-lg p-3.5 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Tanda Tangan Kepala Sekolah (KS)</div>
                  <div className="text-[11px] text-slate-500">
                    {profile.kepalaSekolah} • NIP. {profile.nipKepalaSekolah}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showTtdKs}
                    onChange={e => onUpdateSettings({ ...settings, showTtdKs: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Tampilkan TTD</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32 h-16 bg-white border border-slate-200 rounded flex items-center justify-center p-1">
                  {settings.ttdKsUrl ? (
                    <img
                      src={settings.ttdKsUrl}
                      alt="TTD Kepala Sekolah"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <KepalaSekolahSignatureSvg className="w-24 h-12" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Unggah TTD PNG/JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleSealOrSignUpload('ttdKsUrl', e.target.files?.[0])}
                    />
                  </label>
                  {settings.ttdKsUrl && (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, ttdKsUrl: '' })}
                      className="block text-[11px] text-amber-700 hover:underline font-medium flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Kembali ke TTD Vektor Digital</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stempel Sekolah */}
            <div className="border border-slate-200 rounded-lg p-3.5 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Stempel Resmi Sekolah</div>
                  <div className="text-[11px] text-slate-500">
                    Ditampilkan bertumpuk di atas area tanda tangan Kepala Sekolah
                  </div>
                </div>
                <label className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showStempel}
                    onChange={e => onUpdateSettings({ ...settings, showStempel: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Tampilkan Stempel</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white border border-slate-200 rounded flex items-center justify-center p-1">
                  {settings.stempelUrl ? (
                    <img
                      src={settings.stempelUrl}
                      alt="Stempel Sekolah"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <SchoolStampSvg schoolName={profile.namaSekolah} className="w-16 h-16" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-purple-600" />
                    <span>Unggah Stempel PNG Transparan</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleSealOrSignUpload('stempelUrl', e.target.files?.[0])}
                    />
                  </label>
                  {settings.stempelUrl && (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, stempelUrl: '' })}
                      className="block text-[11px] text-amber-700 hover:underline font-medium flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Kembali ke Stempel Vektor SMAN 9</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel 4: Photo Batch Upload, Photo/Barcode Links & Excel Mapping */}
        {activeConfigTab === 'foto' && (
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Box: Photo Batch Upload + URL Pattern + Excel Participant Link */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-blue-50/40 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Sumber Foto Peserta (Upload File / Link URL)</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Unggah banyak file foto (cocok otomatis ke <code className="bg-white px-1 rounded border">NISN</code> /{' '}
                      <code className="bg-white px-1 rounded border">NIS</code> /{' '}
                      <code className="bg-white px-1 rounded border">Nama</code>) atau pakai pola Link URL / Google Drive.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <input
                      ref={batchPhotoInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleBatchPhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => batchPhotoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded flex items-center gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload Foto Massal</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pola Link Foto Otomatis (Opsional, berlaku jika siswa belum unggah foto)
                  </label>
                  <input
                    type="text"
                    value={settings.fotoLinkTemplate || ''}
                    onChange={e =>
                      onUpdateSettings({ ...settings, fotoLinkTemplate: e.target.value })
                    }
                    placeholder="Contoh: https://sman9sby.sch.id/foto-siswa/{nisn}.jpg"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                  />
                  <div className="text-[10.5px] text-slate-500 mt-1">
                    Placeholder didukung: <code>{'{nisn}'}</code>, <code>{'{nis}'}</code>,{' '}
                    <code>{'{nomorUjian}'}</code>, <code>{'{kelas}'}</code>. Link Google Drive otomatis dikonversi.
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Kelola Link Foto & Barcode via Excel:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={excelPesertaLinkInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportExcelPesertaLink}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => exportExcelPesertaLinkKartuUjian(activeSiswa)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-800 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-blue-700" />
                      <span>Unduh Excel Link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => excelPesertaLinkInputRef.current?.click()}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Impor Excel Link</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Box: Barcode / QR Link Configuration */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-slate-800" />
                    <span>Pengaturan Barcode / QR Code dengan Link</span>
                  </div>
                  <label className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.tampilkanBarcode !== false}
                      onChange={e =>
                        onUpdateSettings({ ...settings, tampilkanBarcode: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Tampilkan Barcode</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Barcode</label>
                    <select
                      value={settings.jenisBarcode || 'qr_link'}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          jenisBarcode: e.target.value as KartuUjianSettings['jenisBarcode']
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="qr_link">QR Code (Scan Link Otomatis)</option>
                      <option value="barcode_1d">Barcode Batang 1D (Code-39)</option>
                      <option value="gambar_url">Gambar Barcode dari Link URL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Posisi pada Kartu</label>
                    <select
                      value={settings.posisiBarcode || 'keduanya'}
                      onChange={e =>
                        onUpdateSettings({
                          ...settings,
                          posisiBarcode: e.target.value as KartuUjianSettings['posisiBarcode']
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="keduanya">Sisi Depan & Belakang</option>
                      <option value="depan">Sisi Depan Saja</option>
                      <option value="belakang">Sisi Belakang Saja</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Template Link / Data Barcode Default
                  </label>
                  <input
                    type="text"
                    value={
                      settings.barcodeLinkTemplate ??
                      'https://sman9sby.sch.id/ujian/verifikasi?no={nomorUjian}&nisn={nisn}'
                    }
                    onChange={e =>
                      onUpdateSettings({ ...settings, barcodeLinkTemplate: e.target.value })
                    }
                    placeholder="https://sman9sby.sch.id/ujian/verifikasi?no={nomorUjian}&nisn={nisn}"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono bg-white"
                  />
                  <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10.5px] text-slate-500">
                    <span>Variabel:</span>
                    {['{nomorUjian}', '{nisn}', '{nis}', '{kelas}', '{ruang}', '{sesi}'].map(
                      token => (
                        <button
                          key={token}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              barcodeLinkTemplate: `${settings.barcodeLinkTemplate || ''}${token}`
                            })
                          }
                          className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-slate-700 hover:bg-slate-100"
                        >
                          {token}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participant Data Management Table (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Toolbar Filters */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NIS/NISN, no. ujian, ruang..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
              >
                <option value="all">Semua Kelas ({activeSiswa.length})</option>
                {availableClasses.map(k => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>

              <select
                value={filterRuang}
                onChange={e => setFilterRuang(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
              >
                <option value="all">Semua Ruang ({stats.totalRooms} ruang)</option>
                {roomDistribution.rooms.map(({ room, count }) => (
                  <option key={room} value={room}>
                    {room} ({count} anak)
                  </option>
                ))}
                {roomDistribution.unassignedCount > 0 && (
                  <option value="__unassigned__">
                    Belum Ada Ruang ({roomDistribution.unassignedCount})
                  </option>
                )}
              </select>

              <select
                value={filterSesi}
                onChange={e => setFilterSesi(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
              >
                <option value="all">Semua Sesi</option>
                <option value="__unassigned__">Belum Diatur Sesi</option>
                {settings.sesiTersedia.map(sesi => (
                  <option key={sesi} value={sesi}>
                    {sesi}
                  </option>
                ))}
                {orphanedSessions.length > 0 && (
                  <option value="__mismatch__">
                    Di Luar Daftar Set Sesi ({orphanedSessions.length} jenis)
                  </option>
                )}
                {orphanedSessions.map(sesi => (
                  <option key={`orphan-${sesi}`} value={sesi}>
                    [Lama] {sesi}
                  </option>
                ))}
              </select>

              <select
                value={filterFoto}
                onChange={e => setFilterFoto(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700"
              >
                <option value="all">Semua Status Foto</option>
                <option value="has_foto">Sudah Ada Foto</option>
                <option value="no_foto">Belum Ada Foto</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-blue-200 bg-blue-50/80 text-blue-900">
                <span className="text-[11px] font-semibold">Awal Nopes:</span>
                <span className="font-mono font-bold tabular-nums">{appliedAwalNopes}</span>
                <button
                  type="button"
                  onClick={handleGenerateNopesOnly}
                  className="ml-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Generate Nomor Peserta 10 digit mengikuti Setting Awal Nopes"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Generate</span>
                </button>
              </div>
              <span className="text-slate-500 font-medium">Mode Cetak:</span>
              <button
                type="button"
                onClick={() => setPrintMode('filtered')}
                className={`px-2.5 py-1 rounded border font-semibold ${
                  printMode === 'filtered'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Massal Terfilter ({filteredSiswa.length})
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('selected')}
                disabled={selectedIds.length === 0}
                className={`px-2.5 py-1 rounded border font-semibold disabled:opacity-40 ${
                  printMode === 'selected'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Massal Terpilih ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!individualPrintId && (filteredSiswa[0] || activeSiswa[0])) {
                    setIndividualPrintId((filteredSiswa[0] || activeSiswa[0]).id);
                  }
                  setPrintMode('individual');
                }}
                className={`px-2.5 py-1 rounded border font-semibold ${
                  printMode === 'individual'
                    ? 'bg-slate-900 text-amber-400 border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Individu (1 Siswa)
              </button>
              {printMode === 'individual' && activeSiswa.length > 0 && (
                <select
                  value={individualPrintId || filteredSiswa[0]?.id || activeSiswa[0]?.id || ''}
                  onChange={e => setIndividualPrintId(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded bg-white font-semibold max-w-[190px]"
                >
                  {activeSiswa.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.nama} ({st.rombelSaatIni || st.kelas})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Quick Set Sesi Bar (Add, Remove & Batch Apply) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-600 mr-1 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                Set Sesi ({selectedIds.length > 0 ? `${selectedIds.length} terpilih` : 'semua tampil'}):
              </span>
              {settings.sesiTersedia.map(sesi => (
                <div
                  key={sesi}
                  className="inline-flex items-center rounded border border-blue-200 bg-blue-50 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => handleBatchApplySesiSiswa(sesi)}
                    title={`Terapkan "${sesi}" ke peserta`}
                    className="px-2 py-0.5 font-semibold text-blue-900 hover:bg-blue-100 transition-colors"
                  >
                    {sesi}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSesi(sesi)}
                    title={`Hapus "${sesi}"`}
                    className="px-1.5 py-0.5 border-l border-blue-200 text-blue-500 hover:text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {settings.sesiTersedia.length === 0 && (
                <span className="text-slate-400 italic">Belum ada sesi. Tambah di sebelah kanan.</span>
              )}
              {orphanedSessions.length > 0 && settings.sesiTersedia.length > 0 && (
                <button
                  type="button"
                  onClick={handleSyncOrphanedSiswaSessions}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded font-semibold flex items-center gap-1"
                  title="Ada peserta yang memakai sesi lama/tidak ada di Set Sesi. Klik untuk menyelaraskan."
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rapikan Sesi Lama</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newSesiInput}
                onChange={e => setNewSesiInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSesi();
                  }
                }}
                placeholder="Tambah sesi baru..."
                className="w-44 px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
              />
              <button
                type="button"
                onClick={handleAddSesi}
                className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>Tambah Sesi</span>
              </button>
              <button
                type="button"
                onClick={handleResetDefaultSesi}
                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded font-semibold"
                title="Kembalikan sesi bawaan"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Room Filter & Distribution Summary */}
          <div className="pt-2 border-t border-slate-100 space-y-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <DoorOpen className="w-3.5 h-3.5 text-amber-600" />
                Distribusi Ruang:
              </span>
              <button
                type="button"
                onClick={() => {
                  setRoomGroupInitialRoom(filterRuang !== 'all' ? filterRuang : undefined);
                  setIsRoomGroupModalOpen(true);
                }}
                className="px-2.5 py-0.5 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
              >
                <Users className="w-3 h-3" />
                <span>Atur Kelompok Anak/Ruang</span>
              </button>

              {(roomDistribution.rooms.length > 0 ||
                settings.kapasitasPerRuang !== initialKartuUjianSettings.kapasitasPerRuang ||
                settings.defaultRuangPrefix !== initialKartuUjianSettings.defaultRuangPrefix ||
                (settings.mulaiNomorRuang || 1) !== 1 ||
                (settings.modePembagianRuang || 'sequential') !== 'sequential') && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmResetRuangTarget(prev => (prev === 'bar' ? 'none' : 'bar'))
                  }
                  className="px-2.5 py-0.5 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                  title="Reset pengaturan ruang & kosongkan penempatan ruang siswa kembali ke awal (0)"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Ruang (Nol)</span>
                </button>
              )}

              {roomDistribution.rooms.length === 0 ? (
                <span className="text-slate-600 font-medium px-2 py-0.5 bg-slate-100 border border-slate-200 rounded tabular-nums">
                  0 Ruang (Belum tersetting ruang · {roomDistribution.unassignedCount} siswa belum memiliki ruang)
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setFilterRuang('all')}
                    className={`px-2 py-0.5 rounded border font-semibold transition-colors ${
                      filterRuang === 'all'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Semua ({activeSiswa.length})
                  </button>
                  {roomDistribution.rooms.map(({ room, count }) => (
                    <button
                      key={room}
                      type="button"
                      onClick={() => setFilterRuang(room)}
                      className={`px-2 py-0.5 rounded border font-mono font-semibold transition-colors ${
                        filterRuang === room
                          ? 'bg-amber-500 text-slate-950 border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {room} ({count} anak)
                    </button>
                  ))}
                  {roomDistribution.unassignedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterRuang('__unassigned__')}
                      className={`px-2 py-0.5 rounded border font-semibold transition-colors ${
                        filterRuang === '__unassigned__'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Belum Diatur ({roomDistribution.unassignedCount})
                    </button>
                  )}
                </>
              )}
            </div>

            {confirmResetRuangTarget === 'bar' && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-rose-900">
                  Reset pengaturan ruang &amp; kosongkan ruang ujian seluruh peserta kembali ke <strong>0 (belum tersetting)</strong>?
                </span>
                <div className="flex items-center gap-1.5">
                  {selectedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleResetPengaturanRuang('selected')}
                      className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded"
                    >
                      Kosongkan {selectedIds.length} Terpilih
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleResetPengaturanRuang('all')}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded"
                  >
                    Ya, Reset ke Nol
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetRuangTarget('none')}
                    className="px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded font-semibold"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Editable Table */}
        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-900 text-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 w-9 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    className="text-slate-200 hover:text-amber-400"
                    title="Pilih semua yang tampil"
                  >
                    {filteredSiswa.length > 0 &&
                    filteredSiswa.every(s => selectedIds.includes(s.id)) ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2.5 w-20">Foto 3x4</th>
                <th className="px-3 py-2.5">Identitas Peserta</th>
                <th className="px-3 py-2.5 w-24">Kelas</th>
                <th className="px-3 py-2.5 w-40">Nomor Ujian (10 Digit)</th>
                <th className="px-3 py-2.5 w-44">Sesi Ujian</th>
                <th className="px-3 py-2.5 w-24">Ruang</th>
                <th className="px-3 py-2.5 w-52">Link Foto & Barcode (URL)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    <Users className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                    Tidak ada peserta ulangan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((s, rowIdx) => {
                  const isSelected = selectedIds.includes(s.id);
                  const kelas = s.rombelSaatIni || s.kelas || '-';
                  const resolvedPhoto = resolveSiswaPhotoSrc(s);
                  const suggestedNopes = formatNomorUjian10Digit(effectiveAwalNopes, rowIdx);
                  return (
                    <tr
                      key={s.id}
                      className={isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'}
                    >
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(s.id)}
                          className="text-slate-500 hover:text-blue-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <label
                            className="w-9 h-12 rounded border border-slate-300 bg-slate-100 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 shrink-0 relative group"
                            title="Klik untuk unggah pas foto 3x4"
                          >
                            {resolvedPhoto ? (
                              <img
                                src={resolvedPhoto}
                                alt={s.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleSinglePhotoUpload(s.id, e.target.files?.[0])}
                            />
                          </label>
                          {s.fotoUrl && (
                            <button
                              type="button"
                              onClick={() => handleUpdateSiswaField(s.id, 'fotoUrl', '')}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                              title="Hapus foto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{s.nama}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              NIS: {s.nis || s.nipd || '-'} • NISN: {s.nisn || '-'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIndividualPrintId(s.id);
                              setPrintMode('individual');
                              setStatusMsg({
                                type: 'success',
                                text: `Mode Cetak Individu aktif untuk ${s.nama}. Pratinjau di bawah hanya menampilkan 1 kartu ini.`
                              });
                            }}
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors ${
                              printMode === 'individual' && individualPrintId === s.id
                                ? 'bg-slate-900 text-amber-400 border-slate-900'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                            title="Cetak individu (khusus 1 siswa ini)"
                          >
                            <Printer className="w-2.5 h-2.5" />
                            <span>Cetak 1</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-700">{kelas}</td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="text"
                          maxLength={10}
                          value={s.nomorUjian || ''}
                          onChange={e =>
                            handleUpdateSiswaField(s.id, 'nomorUjian', e.target.value)
                          }
                          onBlur={e => {
                            const rawVal = e.target.value.trim();
                            if (rawVal) {
                              const formatted = applyAwalNopesToInput(rawVal, effectiveAwalNopes);
                              if (formatted !== s.nomorUjian) {
                                handleUpdateSiswaField(s.id, 'nomorUjian', formatted);
                              }
                            }
                          }}
                          placeholder={suggestedNopes}
                          className={`w-full px-2 py-1 border rounded font-mono font-semibold uppercase text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 tabular-nums ${
                            s.nomorUjian && s.nomorUjian.length !== 10
                              ? 'border-amber-400 bg-amber-50/40'
                              : 'border-slate-300'
                          }`}
                        />
                        {s.nomorUjian && s.nomorUjian.length !== 10 && (
                          <div className="text-[10px] text-amber-700 mt-0.5 font-mono">
                            {s.nomorUjian.length}/10 karakter
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={s.sesiUjian || ''}
                          onChange={e =>
                            handleUpdateSiswaField(s.id, 'sesiUjian', e.target.value)
                          }
                          className={`w-full px-2 py-1 border rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                            s.sesiUjian && !settings.sesiTersedia.includes(s.sesiUjian)
                              ? 'border-amber-400 bg-amber-50/40'
                              : 'border-slate-300'
                          }`}
                        >
                          <option value="">
                            -- Default ({settings.sesiTersedia[0] || 'Sesi 1'}) --
                          </option>
                          {settings.sesiTersedia.map(sesi => (
                            <option key={sesi} value={sesi}>
                              {sesi}
                            </option>
                          ))}
                          {s.sesiUjian && !settings.sesiTersedia.includes(s.sesiUjian) && (
                            <option value={s.sesiUjian}>[Lama] {s.sesiUjian}</option>
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={s.ruangUjian || ''}
                          onChange={e =>
                            handleUpdateSiswaField(s.id, 'ruangUjian', e.target.value)
                          }
                          placeholder="Belum diatur"
                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-blue-600 shrink-0" />
                            <input
                              type="text"
                              value={s.fotoUrl?.startsWith('data:') ? '' : s.fotoUrl || ''}
                              onChange={e =>
                                handleUpdateSiswaField(s.id, 'fotoUrl', e.target.value)
                              }
                              placeholder={
                                s.fotoUrl?.startsWith('data:')
                                  ? 'Foto file terpasang'
                                  : 'Link URL foto / GDrive...'
                              }
                              className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-[11px] font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <QrCode className="w-3 h-3 text-slate-600 shrink-0" />
                            <input
                              type="text"
                              value={s.barcodeLink || ''}
                              onChange={e =>
                                handleUpdateSiswaField(s.id, 'barcodeLink', e.target.value)
                              }
                              placeholder="Link barcode khusus (opsional)..."
                              className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-[11px] font-mono bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Preview Section */}
      {(() => {
        const {
          paperCode,
          isLandscape,
          paperWidthMm,
          paperHeightMm,
          marginMm,
          cssPageSize,
          cols,
          rowsPerPage,
          gapMm,
          printableWidthMm,
          autoCardWidthMm,
          autoCardHeightMm
        } = computePesertaPaperGeometry(settings);

        const cardWidthMm = isValidCardMm(settings.lebarKartuMm, 40)
          ? settings.lebarKartuMm
          : autoCardWidthMm;
        const cardHeightMm = isValidCardMm(settings.tinggiKartuMm, 35)
          ? settings.tinggiKartuMm
          : autoCardHeightMm;

        // Shape & size-adaptive font tier (adapts to A4/F4/Letter, Portrait/Landscape, cols & density)
        type CardFontTier = 'xl' | 'lg' | 'md' | 'sm';
        const fontTier: CardFontTier =
          (cols === 1 && !isValidCardMm(settings.lebarKartuMm, 40)) ||
          (cardWidthMm >= 122 && cardHeightMm >= 95)
            ? 'xl'
            : cardWidthMm >= 95 && cardHeightMm >= 90
            ? 'lg'
            : cardWidthMm >= 80 && cardHeightMm >= 78
            ? 'md'
            : 'sm';

        const isNarrowCard = cardWidthMm < 75;
        const isShortCard = cardHeightMm < 72;
        const isVeryShortCard = cardHeightMm <= 62;

        const fontScale =
          fontTier === 'xl'
            ? {
                label: 'XL (Lega)',
                pad: 'p-3.5',
                kopGap: 'gap-2.5 pb-2',
                logo: 'w-10 h-11',
                kopGov: 'text-[8.5px]',
                kopSchool: 'text-[13px]',
                kopAddr: 'text-[8.5px]',
                bannerPad: 'px-2.5 py-1.5 mt-1.5',
                bannerTitle: 'text-[11px]',
                bannerMeta: 'text-[9px]',
                subBanner: 'text-[9.5px] py-1',
                bodyGap: 'gap-3.5 mt-2.5',
                photo: 'w-[78px] h-[104px]',
                photoPlaceholder: 'text-[8.5px]',
                photoPlaceholderRatio: 'text-[10.5px]',
                infoTable: 'text-[11px] leading-[1.35]',
                infoLabelW: 'w-[74px]',
                infoCellPad: 'py-[2px]',
                examNo: 'text-[12.5px]',
                footerTop: 'mt-2.5 pt-2',
                tataTertib: 'text-[8.5px]',
                ttdBox: 'min-w-[160px] text-[9.5px]',
                ttdArea: 'h-11',
                stampSize: 'w-14 h-14',
                ttdImg: 'h-10 max-w-[110px]',
                ttdSvg: 'w-26 h-10',
                ksName: 'text-[10.5px]',
                ksNip: 'text-[8.8px]',
                barcode: 44,
                backTitle: 'text-[10px]',
                backMeta: 'text-[8.5px]',
                backSub: 'text-[8.5px] py-1',
                sched2Col: 'text-[8px] leading-[1.2]',
                sched1Col: 'text-[9px] leading-[1.25]',
                schedTime: 'text-[7px]',
                schedCellPad: 'py-[2px] px-1.5',
                schedHeadPad: 'py-1 px-1.5',
                schedDateMaxW: 'max-w-[96px]',
                backNotes: 'text-[8.5px]'
              }
            : fontTier === 'lg'
            ? {
                label: 'L (Folio/Wide)',
                pad: 'p-3',
                kopGap: 'gap-2 pb-1.5',
                logo: 'w-8 h-9',
                kopGov: 'text-[7.8px]',
                kopSchool: 'text-[11.5px]',
                kopAddr: 'text-[7.5px]',
                bannerPad: 'px-2.5 py-1 mt-1.5',
                bannerTitle: 'text-[9.8px]',
                bannerMeta: 'text-[8px]',
                subBanner: 'text-[8.5px] py-0.5',
                bodyGap: 'gap-2.5 mt-2',
                photo: 'w-[68px] h-[90px]',
                photoPlaceholder: 'text-[8px]',
                photoPlaceholderRatio: 'text-[9.5px]',
                infoTable: 'text-[10px] leading-[1.3]',
                infoLabelW: 'w-[66px]',
                infoCellPad: 'py-[1.5px]',
                examNo: 'text-[11.2px]',
                footerTop: 'mt-2 pt-1.5',
                tataTertib: 'text-[7.8px]',
                ttdBox: 'min-w-[144px] text-[8.5px]',
                ttdArea: 'h-10',
                stampSize: 'w-12 h-12',
                ttdImg: 'h-9 max-w-[96px]',
                ttdSvg: 'w-22 h-9',
                ksName: 'text-[9.5px]',
                ksNip: 'text-[8px]',
                barcode: 40,
                backTitle: 'text-[9px]',
                backMeta: 'text-[7.8px]',
                backSub: 'text-[7.8px] py-0.5',
                sched2Col: 'text-[7.4px] leading-[1.15]',
                sched1Col: 'text-[8.4px] leading-[1.22]',
                schedTime: 'text-[6.5px]',
                schedCellPad: 'py-[1.8px] px-1',
                schedHeadPad: 'py-[2.5px] px-1',
                schedDateMaxW: 'max-w-[84px]',
                backNotes: 'text-[7.8px]'
              }
            : fontTier === 'md'
            ? {
                label: 'M (Standar)',
                pad: 'p-2.5',
                kopGap: 'gap-1.5 pb-1',
                logo: 'w-7 h-8',
                kopGov: 'text-[7.2px]',
                kopSchool: 'text-[10.8px]',
                kopAddr: 'text-[7px]',
                bannerPad: 'px-2 py-1 mt-1',
                bannerTitle: 'text-[9.2px]',
                bannerMeta: 'text-[7.5px]',
                subBanner: 'text-[8px] py-0.5',
                bodyGap: 'gap-2 mt-1.5',
                photo: 'w-[62px] h-[82px]',
                photoPlaceholder: 'text-[7.5px]',
                photoPlaceholderRatio: 'text-[9px]',
                infoTable: 'text-[9.4px] leading-[1.26]',
                infoLabelW: 'w-[60px]',
                infoCellPad: 'py-[1.2px]',
                examNo: 'text-[10.5px]',
                footerTop: 'mt-1.5 pt-1',
                tataTertib: 'text-[7.4px]',
                ttdBox: 'min-w-[132px] text-[8px]',
                ttdArea: 'h-9',
                stampSize: 'w-11 h-11',
                ttdImg: 'h-8 max-w-[88px]',
                ttdSvg: 'w-20 h-8',
                ksName: 'text-[8.8px]',
                ksNip: 'text-[7.5px]',
                barcode: 36,
                backTitle: 'text-[8.4px]',
                backMeta: 'text-[7.4px]',
                backSub: 'text-[7.5px] py-0.5',
                sched2Col: 'text-[6.9px] leading-[1.14]',
                sched1Col: 'text-[8px] leading-[1.2]',
                schedTime: 'text-[6px]',
                schedCellPad: 'py-[1.5px] px-1',
                schedHeadPad: 'py-[2px] px-1',
                schedDateMaxW: 'max-w-[78px]',
                backNotes: 'text-[7.4px]'
              }
            : {
                label: isVeryShortCard ? 'XS (Kompak)' : isNarrowCard ? 'S (3-Kolom)' : 'S (Padat)',
                pad: isVeryShortCard ? 'p-1' : isShortCard ? 'p-1.5' : 'p-2',
                kopGap: isVeryShortCard ? 'gap-1 pb-0.5' : 'gap-1 pb-1',
                logo: isVeryShortCard
                  ? 'w-5 h-5.5'
                  : isNarrowCard || isShortCard
                  ? 'w-5.5 h-6.5'
                  : 'w-6.5 h-7.5',
                kopGov: isNarrowCard ? 'text-[5.8px]' : 'text-[6.5px]',
                kopSchool: isNarrowCard ? 'text-[8.5px]' : 'text-[9.5px]',
                kopAddr: isNarrowCard ? 'text-[5.5px]' : 'text-[6.3px]',
                bannerPad: isVeryShortCard ? 'px-1.5 py-[1px] mt-0.5' : 'px-1.5 py-0.5 mt-1',
                bannerTitle: isNarrowCard ? 'text-[7px]' : 'text-[8px]',
                bannerMeta: isNarrowCard ? 'text-[6px]' : 'text-[6.6px]',
                subBanner: isNarrowCard ? 'text-[6.5px] py-0' : 'text-[7px] py-0.5',
                bodyGap: isVeryShortCard ? 'gap-1 mt-0.5' : 'gap-1.5 mt-1',
                photo: isVeryShortCard
                  ? 'w-[34px] h-[45px]'
                  : isShortCard
                  ? 'w-[44px] h-[58px]'
                  : isNarrowCard
                  ? 'w-[42px] h-[56px]'
                  : 'w-[50px] h-[66px]',
                photoPlaceholder: 'text-[6.5px]',
                photoPlaceholderRatio: 'text-[7.8px]',
                infoTable: isNarrowCard
                  ? 'text-[7.4px] leading-[1.15]'
                  : 'text-[8.2px] leading-[1.18]',
                infoLabelW: isNarrowCard ? 'w-[44px]' : 'w-[52px]',
                infoCellPad: 'py-[0.5px]',
                examNo: isNarrowCard ? 'text-[8px]' : 'text-[9px]',
                footerTop: isVeryShortCard ? 'mt-0.5 pt-0.5' : 'mt-1 pt-0.5',
                tataTertib: isNarrowCard ? 'text-[5.8px]' : 'text-[6.4px]',
                ttdBox: isNarrowCard
                  ? 'min-w-[94px] text-[6.3px]'
                  : 'min-w-[114px] text-[7px]',
                ttdArea: isVeryShortCard ? 'h-4.5' : isShortCard ? 'h-6' : 'h-7',
                stampSize: isVeryShortCard ? 'w-7 h-7' : isShortCard ? 'w-9 h-9' : 'w-10 h-10',
                ttdImg: isVeryShortCard ? 'h-4 max-w-[60px]' : isShortCard ? 'h-5.5 max-w-[70px]' : 'h-6.5 max-w-[78px]',
                ttdSvg: isVeryShortCard ? 'w-12 h-4' : isShortCard ? 'w-14 h-5.5' : 'w-16 h-6.5',
                ksName: isNarrowCard ? 'text-[6.8px]' : 'text-[7.8px]',
                ksNip: isNarrowCard ? 'text-[5.8px]' : 'text-[6.5px]',
                barcode: isVeryShortCard ? 22 : isShortCard ? 26 : 30,
                backTitle: isNarrowCard ? 'text-[6.8px]' : 'text-[7.6px]',
                backMeta: isNarrowCard ? 'text-[6px]' : 'text-[6.8px]',
                backSub: isNarrowCard ? 'text-[6.3px] py-0' : 'text-[7px] py-0.5',
                sched2Col: isShortCard
                  ? 'text-[5.7px] leading-[1.06]'
                  : isNarrowCard
                  ? 'text-[5.6px] leading-[1.08]'
                  : 'text-[6.3px] leading-[1.12]',
                sched1Col: isNarrowCard
                  ? 'text-[6.8px] leading-[1.15]'
                  : 'text-[7.4px] leading-[1.18]',
                schedTime: 'text-[5.3px]',
                schedCellPad: isShortCard ? 'py-[0.5px] px-0.5' : 'py-[1px] px-1',
                schedHeadPad: 'py-[1.2px] px-1',
                schedDateMaxW: isNarrowCard ? 'max-w-[48px]' : 'max-w-[66px]',
                backNotes: isNarrowCard ? 'text-[5.8px]' : 'text-[6.4px]'
              };

        const handleSwitchOrientasi = (nextOrient: 'portrait' | 'landscape') => {
          const curCols = settings.jumlahKolom || 2;
          const nextCols =
            nextOrient === 'landscape'
              ? curCols === 2
                ? 3
                : curCols
              : curCols === 3 && settings.layoutPerPage !== 9
              ? 2
              : curCols;
          onUpdateSettings({
            ...settings,
            orientasiCetak: nextOrient,
            jumlahKolom: nextCols as 1 | 2 | 3
          });
        };

        return (
          <div className="space-y-3">
            {/* Dynamic Print Page Size, Orientation & Precision Duplex Sheet Rules */}
            <style>{`
              @page {
                size: ${cssPageSize};
                margin: ${marginMm}mm;
              }
              @media screen {
                .preview-paper-sheet {
                  width: ${paperWidthMm}mm;
                  min-height: ${paperHeightMm}mm;
                  padding: ${marginMm}mm;
                  box-sizing: border-box;
                }
              }
              @media print {
                @page {
                  size: ${cssPageSize};
                  margin: ${marginMm}mm;
                }
                html,
                body,
                #root {
                  background: #ffffff !important;
                  background-color: #ffffff !important;
                }
                .preview-paper-sheet {
                  width: 100% !important;
                  min-height: auto !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: #ffffff !important;
                  box-shadow: none !important;
                  border: none !important;
                  box-sizing: border-box;
                }
                .print-page-break {
                  break-after: page !important;
                  page-break-after: always !important;
                }
                .print-container,
                .print-container *:not(.card-keep-emboss) {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  box-shadow: none !important;
                }
                .card-keep-emboss {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            `}</style>

            <div className="no-print flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pratinjau Cetak ({cardsToPrint.length} Peserta • {paperCode}{' '}
                  {isLandscape ? 'Landscape' : 'Portrait'} {paperWidthMm}×{paperHeightMm} mm)
                </h3>
                <span
                  className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10.5px] font-bold"
                  title="Dimensi identik antara halaman depan dan halaman belakang untuk cetak bolak-balik presisi"
                >
                  Presisi Depan=Belakang: {cardWidthMm}×{cardHeightMm} mm ({cols}×{rowsPerPage}) • Font {fontScale.label}
                </span>

                {/* Quick Portrait / Landscape Toggle */}
                <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSwitchOrientasi('portrait')}
                    className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1 transition-colors ${
                      !isLandscape
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="inline-block w-2 h-3 border border-current rounded-[1px]" />
                    <span>Portrait</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchOrientasi('landscape')}
                    className={`px-2 py-0.5 rounded font-semibold flex items-center gap-1 transition-colors ${
                      isLandscape
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="inline-block w-3 h-2 border border-current rounded-[1px]" />
                    <span>Landscape</span>
                  </button>
                </div>

                {/* Quick Paper Size Pills */}
                <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-[11px]">
                  {(['A4', 'F4', 'Letter'] as const).map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, ukuranKertas: sz })}
                      className={`px-2 py-0.5 rounded font-mono font-semibold transition-colors ${
                        paperCode === sz
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                {/* Quick Standar vs A4 4-Orang Presets */}
                <div className="inline-flex flex-wrap rounded-md border border-amber-300 bg-amber-50/60 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => applyPesertaLayoutPreset('standar_id')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      settings.lebarKartuMm === 58 && settings.tinggiKartuMm === 95
                        ? 'bg-slate-900 text-amber-400'
                        : 'text-slate-700 hover:bg-amber-100'
                    }`}
                  >
                    Standar ID (58×95)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPesertaLayoutPreset('standar_6')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      paperCode === 'A4' &&
                      !isLandscape &&
                      (settings.jumlahKolom || 2) === 2 &&
                      settings.layoutPerPage === 6 &&
                      !isValidCardMm(settings.lebarKartuMm, 40)
                        ? 'bg-slate-900 text-amber-400'
                        : 'text-slate-700 hover:bg-amber-100'
                    }`}
                  >
                    Standar A4 (6 Orang)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPesertaLayoutPreset('a4_4_orang')}
                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                      paperCode === 'A4' &&
                      !isLandscape &&
                      (settings.jumlahKolom || 2) === 2 &&
                      settings.layoutPerPage === 4 &&
                      !isValidCardMm(settings.lebarKartuMm, 40)
                        ? 'bg-emerald-700 text-white'
                        : 'text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    A4 (4 Orang / Hal)
                  </button>
                </div>

                {/* Quick Individual vs Mass Scope */}
                <div className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/70 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPrintMode('filtered')}
                    className={`px-2 py-0.5 rounded font-bold ${
                      printMode !== 'individual'
                        ? 'bg-blue-700 text-white'
                        : 'text-blue-900 hover:bg-blue-100'
                    }`}
                  >
                    Massal ({printMode === 'selected' ? selectedIds.length : filteredSiswa.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!individualPrintId && (filteredSiswa[0] || activeSiswa[0])) {
                        setIndividualPrintId((filteredSiswa[0] || activeSiswa[0]).id);
                      }
                      setPrintMode('individual');
                    }}
                    className={`px-2 py-0.5 rounded font-bold ${
                      printMode === 'individual'
                        ? 'bg-slate-900 text-amber-400'
                        : 'text-blue-900 hover:bg-blue-100'
                    }`}
                  >
                    Individu (1)
                  </button>
                </div>

                {/* Two-Sided Mode Pills */}
                <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-[11px]">
                  {[
                    { id: 'pratinjau_berdampingan', label: 'Depan + Belakang' },
                    { id: 'dua_sisi_bergantian', label: 'Hal. Bergantian' },
                    { id: 'depan_saja', label: 'Depan Saja' },
                    { id: 'belakang_saja', label: 'Belakang Saja' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          modeSisiCetak: m.id as KartuUjianSettings['modeSisiCetak']
                        })
                      }
                      className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                        (settings.modeSisiCetak || 'pratinjau_berdampingan') === m.id
                          ? 'bg-slate-900 text-amber-400'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveConfigTab('cetak')}
                className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Setting Pencetakan & Duplex</span>
              </button>
            </div>

            <div className="print-container bg-slate-100/80 border border-slate-200 rounded-lg p-3 sm:p-5 shadow-xs overflow-x-auto print:bg-white print:border-0 print:shadow-none print:rounded-none print:p-0 print:m-0 print:overflow-visible">
              {cardsToPrint.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs bg-white rounded border border-slate-200">
                  Belum ada peserta yang siap dicetak.
                </div>
              ) : (
                (() => {
                  const tema = settings.temaWarnaKartu || 'biru';
                  const customAiTheme =
                    tema === 'ai_custom' && settings.aiCustomTheme
                      ? settings.aiCustomTheme
                      : null;
                  const themePalette =
                    tema === 'hijau'
                      ? {
                          outerBorder: 'border-emerald-800',
                          kopDivider: 'border-emerald-800',
                          banner: 'bg-emerald-700 text-white',
                          titleHighlight: 'text-emerald-50',
                          subBanner: 'bg-emerald-50 text-emerald-950 border-emerald-300',
                          tableHeader: 'bg-emerald-50 text-emerald-950'
                        }
                      : tema === 'kuning'
                      ? {
                          outerBorder: 'border-amber-700',
                          kopDivider: 'border-amber-600',
                          banner: 'bg-amber-400 text-slate-950 border-y border-amber-600',
                          titleHighlight: 'text-slate-950',
                          subBanner: 'bg-amber-50 text-amber-950 border-amber-300',
                          tableHeader: 'bg-amber-50 text-amber-950'
                        }
                      : tema === 'merah'
                      ? {
                          outerBorder: 'border-rose-800',
                          kopDivider: 'border-rose-800',
                          banner: 'bg-rose-700 text-white',
                          titleHighlight: 'text-rose-50',
                          subBanner: 'bg-rose-50 text-rose-950 border-rose-300',
                          tableHeader: 'bg-rose-50 text-rose-950'
                        }
                      : tema === 'biru'
                      ? {
                          outerBorder: 'border-blue-800',
                          kopDivider: 'border-blue-800',
                          banner: 'bg-blue-700 text-white',
                          titleHighlight: 'text-sky-100',
                          subBanner: 'bg-blue-50 text-blue-950 border-blue-300',
                          tableHeader: 'bg-blue-50 text-blue-950'
                        }
                      : tema === 'abu_abu'
                      ? {
                          outerBorder: 'border-slate-700',
                          kopDivider: 'border-slate-600',
                          banner: 'bg-slate-600 text-white',
                          titleHighlight: 'text-slate-100',
                          subBanner: 'bg-slate-100 text-slate-900 border-slate-300',
                          tableHeader: 'bg-slate-100 text-slate-900'
                        }
                      : tema === 'monokrom'
                      ? {
                          outerBorder: 'border-black',
                          kopDivider: 'border-black',
                          banner: 'bg-white text-black border-y border-black',
                          titleHighlight: 'text-black',
                          subBanner: 'bg-white text-black border-black',
                          tableHeader: 'bg-white text-black'
                        }
                      : {
                          outerBorder: 'border-slate-900',
                          kopDivider: 'border-slate-900',
                          banner: 'bg-slate-900 text-white',
                          titleHighlight: 'text-amber-400',
                          subBanner: 'bg-slate-100 text-slate-900 border-slate-300',
                          tableHeader: 'bg-slate-100 text-slate-900'
                        };

                  const resolvedDesign = resolveCardDesign({
                    themeKey: tema,
                    customTheme: customAiTheme,
                    overrideFont: settings.desainFont,
                    overrideFontBody: settings.desainFontBody,
                    overrideFontScale: settings.desainFontScale,
                    overrideFontWeight: settings.desainFontWeight,
                    overrideLetterSpacing: settings.desainLetterSpacing,
                    overrideJudulKapital: settings.desainJudulKapital,
                    overrideEmboss: settings.desainEmboss,
                    overridePattern: settings.desainPolaBg,
                    overrideGradasi: settings.desainGradasiAktif,
                    overrideWatermark: settings.desainWatermarkLogo
                  });

                  const tierIdx = fontTier === 'xl' ? 0 : fontTier === 'lg' ? 1 : fontTier === 'md' ? 2 : 3;
                  const fs = (sizes: [number, number, number, number]) =>
                    scaleCardFontPx(sizes[tierIdx], resolvedDesign.fontScaleMultiplier);

                  const cutMode = settings.garisPotong || 'dashed_gunting';
                  const sisiMode = settings.modeSisiCetak || 'pratinjau_berdampingan';
                  const showBarcode = settings.tampilkanBarcode !== false;
                  const barcodePos = settings.posisiBarcode || 'keduanya';
                  const barcodeType = settings.jenisBarcode || 'qr_link';
                  const barcodeSize = fontScale.barcode;

                  // Identical outer wrapper & inner card padding for Front & Back symmetry
                  const outerCutWrapperClass = `print-card-avoid bg-white relative w-full box-border ${
                    cutMode === 'none' ? 'p-0' : 'border border-dashed border-slate-400 p-[3px]'
                  }`;
                  const innerCardPadClass = fontScale.pad;

                  const syncedGridStyle: React.CSSProperties = {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, ${cardWidthMm}mm)`,
                    gridAutoRows: `${cardHeightMm}mm`,
                    gap: `${gapMm}mm`,
                    justifyContent: 'center',
                    width: '100%'
                  };

                  const syncedSlotStyle: React.CSSProperties = {
                    height: `${cardHeightMm}mm`,
                    width: '100%',
                    boxSizing: 'border-box'
                  };

                  const renderFrontCard = (siswa: Siswa, sideBadge?: string) => {
                    const kelas = siswa.rombelSaatIni || siswa.kelas || '-';
                    const sesiText = resolveEffectiveSiswaSesi(siswa, settings.sesiTersedia);
                    const ruangText = (siswa.ruangUjian || '').trim() || '-';
                    const photoSrc = resolveSiswaPhotoSrc(siswa);
                    const barcodeVal = resolveSiswaBarcodeValue(siswa);

                    return (
                      <div style={syncedSlotStyle} className={outerCutWrapperClass}>
                        {cutMode === 'dashed_gunting' && (
                          <span
                            className="absolute -top-2 left-1.5 bg-white px-0.5 text-[9px] text-slate-500 leading-none select-none z-20"
                            aria-hidden="true"
                          >
                            ✂
                          </span>
                        )}
                        {sideBadge && (
                          <span className="no-print absolute -top-2 right-2 bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider z-20">
                            {sideBadge}
                          </span>
                        )}

                        <div
                          style={{
                            borderColor: resolvedDesign.outerBorderHex,
                            backgroundImage: resolvedDesign.cardBackgroundCss,
                            fontFamily: resolvedDesign.bodyFontFamily,
                            boxShadow: resolvedDesign.outerEmbossShadowCss
                          }}
                          className={`card-keep-emboss relative border-[1.5px] ${customAiTheme ? '' : themePalette.outerBorder} bg-white text-slate-950 h-full w-full box-border overflow-hidden ${innerCardPadClass}`}
                        >
                          <CardBackgroundLayers design={resolvedDesign} profile={profile} />
                          <div className="relative z-10 flex flex-col justify-between h-full w-full">
                            <div>
                              {/* Mini Kop Pemprov Jatim */}
                              {settings.tampilkanKop !== false && (
                                <div
                                  style={{ borderBottomColor: resolvedDesign.outerBorderHex }}
                                  className={`flex items-center ${fontScale.kopGap} border-b-2 ${customAiTheme ? '' : themePalette.kopDivider}`}
                                >
                                  <div className="shrink-0">
                                    {profile.logoType === 'custom' && profile.logoUrl ? (
                                      <img
                                        src={resolveDirectImageUrl(profile.logoUrl)}
                                        alt="Logo"
                                        className={`${fontScale.logo} object-contain`}
                                      />
                                    ) : profile.logoType === 'default' || profile.logoType === 'default_vector' ? (
                                      <Sman9SurabayaLogoSvg customUrl={profile.sekolahLogoUrl} className={fontScale.logo} />
                                    ) : (
                                      <PemprovJatimLogo customUrl={profile.pemprovLogoUrl} className={fontScale.logo} />
                                    )}
                                  </div>
                                  <div className="flex-1 text-center leading-tight min-w-0">
                                    <div
                                      style={{ fontSize: fs([8.5, 7.8, 7.2, isNarrowCard ? 5.8 : 6.5]) }}
                                      className="font-bold tracking-wider uppercase text-slate-900"
                                    >
                                      PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN
                                    </div>
                                    <div
                                      style={{
                                        fontFamily: resolvedDesign.headingFontFamily,
                                        fontSize: fs([13, 11.5, 10.8, isNarrowCard ? 8.5 : 9.5]),
                                        fontWeight: resolvedDesign.headingFontWeightCss
                                      }}
                                      className="tracking-wide uppercase text-slate-950"
                                    >
                                      {profile.namaSekolah}
                                    </div>
                                    <div
                                      style={{ fontSize: fs([8.5, 7.5, 7, isNarrowCard ? 5.5 : 6.3]) }}
                                      className="text-slate-800 font-medium truncate"
                                    >
                                      Jalan Wijayakusuma Nomor 48, Surabaya • Telp. {profile.telepon}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Title Banner */}
                              <div
                                style={{
                                  background: resolvedDesign.bannerBackgroundCss,
                                  color: resolvedDesign.bannerTextHex,
                                  borderBottom:
                                    resolvedDesign.embossStyle !== 'flat_clean'
                                      ? `1.5px solid ${resolvedDesign.foilHex}`
                                      : undefined
                                }}
                                className={`${
                                  settings.tampilkanKop !== false ? fontScale.bannerPad : 'px-2 py-1'
                                } flex items-center justify-between gap-1`}
                              >
                                <span
                                  style={{
                                    color: resolvedDesign.accentTextHex,
                                    fontFamily: resolvedDesign.headingFontFamily,
                                    fontSize: fs([11, 9.8, 9.2, isNarrowCard ? 7 : 8]),
                                    fontWeight: resolvedDesign.headingFontWeightCss,
                                    letterSpacing: resolvedDesign.headingLetterSpacingCss,
                                    textTransform: resolvedDesign.headingTextTransformCss,
                                    textShadow: resolvedDesign.headingEmbossTextShadow
                                  }}
                                  className="truncate"
                                >
                                  {settings.judulKartu || 'KARTU PESERTA ULANGAN'}
                                </span>
                                <span
                                  style={{ fontSize: fs([9, 8, 7.5, isNarrowCard ? 6 : 6.6]) }}
                                  className="font-semibold truncate max-w-[48%]"
                                >
                                  {settings.semester} • {settings.tahunPelajaran}
                                </span>
                              </div>
                              <div
                                style={{
                                  background: resolvedDesign.subBannerBackgroundCss,
                                  color: resolvedDesign.subBannerTextHex,
                                  borderColor: resolvedDesign.outerBorderHex,
                                  fontSize: fs([9.5, 8.5, 8, isNarrowCard ? 6.5 : 7]),
                                  textTransform: resolvedDesign.headingTextTransformCss
                                }}
                                className="text-center py-0.5 font-bold tracking-wide border-x border-b truncate px-1"
                              >
                                {settings.namaUjian}
                              </div>

                              {/* Main Content: 3x4 Photo + Student Metadata */}
                              <div className={`flex items-start ${fontScale.bodyGap}`}>
                                {settings.tampilkanFoto !== false && (
                                  <div
                                    className={`shrink-0 border border-slate-800 bg-white/95 flex flex-col items-center justify-center overflow-hidden ${fontScale.photo}`}
                                  >
                                    {photoSrc ? (
                                      <img
                                        src={photoSrc}
                                        alt={siswa.nama}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div
                                        className={`text-center px-1 ${fontScale.photoPlaceholder} font-semibold text-slate-500 leading-tight`}
                                      >
                                        PAS FOTO
                                        <div
                                          className={`${fontScale.photoPlaceholderRatio} font-bold text-slate-700 mt-0.5`}
                                        >
                                          3 x 4
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <table
                                  style={{
                                    fontSize: fs([11, 10, 9.4, isNarrowCard ? 7.4 : 8.2]),
                                    lineHeight: 1.24
                                  }}
                                  className="flex-1 border-collapse"
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        className={`${fontScale.infoCellPad} pr-1 text-slate-800 font-semibold ${fontScale.infoLabelW} align-top whitespace-nowrap`}
                                      >
                                        No. Ujian
                                      </td>
                                      <td className={`${fontScale.infoCellPad} pr-1 align-top font-semibold text-slate-900`}>
                                        :
                                      </td>
                                      <td
                                        style={{ fontSize: fs([12.5, 11.2, 10.5, isNarrowCard ? 8 : 9]) }}
                                        className={`${fontScale.infoCellPad} font-extrabold text-slate-950 tabular-nums tracking-tight`}
                                      >
                                        {siswa.nomorUjian ? sanitizeNomorUjian10Digit(siswa.nomorUjian, true) : '-'}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td
                                        className={`${fontScale.infoCellPad} pr-1 text-slate-800 font-semibold align-top`}
                                      >
                                        Nama
                                      </td>
                                      <td className={`${fontScale.infoCellPad} pr-1 align-top font-semibold text-slate-900`}>
                                        :
                                      </td>
                                      <td
                                        style={{ fontWeight: resolvedDesign.bodyStrongFontWeightCss }}
                                        className={`${fontScale.infoCellPad} uppercase text-slate-950 leading-tight line-clamp-2`}
                                      >
                                        {siswa.nama}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td
                                        className={`${fontScale.infoCellPad} pr-1 text-slate-800 font-semibold align-top whitespace-nowrap`}
                                      >
                                        NIS / NISN
                                      </td>
                                      <td className={`${fontScale.infoCellPad} pr-1 align-top font-semibold text-slate-900`}>
                                        :
                                      </td>
                                      <td
                                        className={`${fontScale.infoCellPad} font-semibold tabular-nums text-slate-950`}
                                      >
                                        {siswa.nis || siswa.nipd || '-'} / {siswa.nisn || '-'}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td
                                        className={`${fontScale.infoCellPad} pr-1 text-slate-800 font-semibold align-top`}
                                      >
                                        Kelas
                                      </td>
                                      <td className={`${fontScale.infoCellPad} pr-1 align-top font-semibold text-slate-900`}>
                                        :
                                      </td>
                                      <td
                                        className={`${fontScale.infoCellPad} font-extrabold text-slate-950`}
                                      >
                                        {kelas}
                                      </td>
                                    </tr>
                                    {settings.tampilkanRuang !== false && (
                                      <tr>
                                        <td
                                          className={`${fontScale.infoCellPad} pr-1 text-slate-800 font-semibold align-top`}
                                        >
                                          Ruang
                                        </td>
                                        <td className={`${fontScale.infoCellPad} pr-1 align-top font-semibold text-slate-900`}>
                                          :
                                        </td>
                                        <td
                                          className={`${fontScale.infoCellPad} font-extrabold tabular-nums text-slate-950`}
                                        >
                                          {ruangText}
                                        </td>
                                      </tr>
                                    )}
                                    {settings.tampilkanSesi !== false && (
                                      <tr>
                                        <td
                                          className={`${fontScale.infoCellPad} pr-1 text-slate-800 font-semibold align-top`}
                                        >
                                          Sesi
                                        </td>
                                        <td className={`${fontScale.infoCellPad} pr-1 align-top font-semibold text-slate-900`}>
                                          :
                                        </td>
                                        <td
                                          className={`${fontScale.infoCellPad} font-bold text-slate-950`}
                                        >
                                          {sesiText}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Bottom Footer: Barcode + Tata Tertib + TTD Kepala Sekolah & Stempel */}
                            <div
                              className={`${fontScale.footerTop} border-t border-slate-400/90 flex items-end justify-between gap-1.5`}
                            >
                              <div className="flex items-end gap-1.5 max-w-[52%]">
                                {showBarcode && barcodePos !== 'belakang' && (
                                  <div className="bg-white/95 p-0.5 rounded-[2px] border border-slate-200/80 shrink-0">
                                    <ExamCardBarcode
                                      value={barcodeVal}
                                      mode={barcodeType}
                                      size={barcodeSize}
                                    />
                                  </div>
                                )}
                                {settings.tampilkanTataTertib !== false && (
                                  <div
                                    style={{ fontSize: fs([8.5, 7.8, 7.4, isNarrowCard ? 5.8 : 6.4]) }}
                                    className="text-slate-800 leading-tight space-y-0.5"
                                  >
                                    <div className="font-bold text-slate-950">
                                      Tata Tertib:
                                    </div>
                                    <div className="line-clamp-3">{settings.catatanKaki}</div>
                                  </div>
                                )}
                              </div>

                              {/* Signature & Stamp Block */}
                              <div
                                style={{ fontSize: fs([9.5, 8.5, 8, isNarrowCard ? 6.3 : 7]) }}
                                className={`text-left ${
                                  isNarrowCard ? 'min-w-[94px]' : fontTier === 'sm' ? 'min-w-[114px]' : fontTier === 'md' ? 'min-w-[132px]' : fontTier === 'lg' ? 'min-w-[144px]' : 'min-w-[160px]'
                                } leading-tight relative shrink-0 text-slate-900`}
                              >
                                <div className="truncate font-medium">{settings.kotaTanggalCetak}</div>
                                <div className="font-bold text-slate-950">
                                  Kepala Sekolah,
                                </div>

                                <div
                                  className={`relative ${fontScale.ttdArea} flex items-center my-0.5`}
                                >
                                  {settings.showStempel && (
                                    <div className="absolute -left-4 -top-1.5 pointer-events-none select-none opacity-85 -rotate-6">
                                      {settings.stempelUrl ? (
                                        <img
                                          src={settings.stempelUrl}
                                          alt="Stempel Sekolah"
                                          className={`${fontScale.stampSize} object-contain`}
                                        />
                                      ) : (
                                        <SchoolStampSvg
                                          schoolName={profile.namaSekolah}
                                          className={fontScale.stampSize}
                                        />
                                      )}
                                    </div>
                                  )}

                                  {settings.showTtdKs && (
                                    <div className="relative z-10 pl-3">
                                      {settings.ttdKsUrl ? (
                                        <img
                                          src={settings.ttdKsUrl}
                                          alt="TTD Kepala Sekolah"
                                          className={`${fontScale.ttdImg} object-contain`}
                                        />
                                      ) : (
                                        <KepalaSekolahSignatureSvg className={fontScale.ttdSvg} />
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div
                                  style={{
                                    fontSize: fs([10.5, 9.5, 8.8, isNarrowCard ? 6.8 : 7.8]),
                                    fontWeight: resolvedDesign.bodyStrongFontWeightCss
                                  }}
                                  className="underline text-slate-950"
                                >
                                  {profile.kepalaSekolah}
                                </div>
                                <div
                                  style={{ fontSize: fs([8.8, 8, 7.5, isNarrowCard ? 5.8 : 6.5]) }}
                                  className="font-semibold tabular-nums text-slate-900"
                                >
                                  NIP. {profile.nipKepalaSekolah}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  const renderBackCard = (siswa: Siswa, sideBadge?: string) => {
                    const kelas = siswa.rombelSaatIni || siswa.kelas || '-';
                    const ruangText = (siswa.ruangUjian || '').trim() || '-';
                    const sesiText = resolveEffectiveSiswaSesi(siswa, settings.sesiTersedia);
                    const fallbackSesi = settings.sesiTersedia[0] || 'Sesi 1';
                    const syncEnabled = settings.sinkronWaktuJadwalDenganSesi !== false;
                    const maxSlots = Math.min(16, Math.max(1, settings.maksJadwalBelakang ?? 16));
                    const filteredJadwal = jadwalList
                      .filter(item => matchConditionalSchedule(item, siswa, fallbackSesi))
                      .slice(0, maxSlots);

                    const dayBuckets = new Map<string, JadwalUjianItem[]>();
                    filteredJadwal.forEach(item => {
                      const dayKey = (item.hariTanggal || '').trim().toLowerCase();
                      if (!dayBuckets.has(dayKey)) dayBuckets.set(dayKey, []);
                      dayBuckets.get(dayKey)!.push(item);
                    });

                    const sharedRowsForSync = jadwalList.filter(
                      r => (r.kondisiTarget || 'Semua') !== 'Sesi' || !(r.kondisiNilai || '').trim()
                    );

                    const studentJadwal = filteredJadwal.map(item => {
                      const dayKey = (item.hariTanggal || '').trim().toLowerCase();
                      const dayRows = dayBuckets.get(dayKey) || [item];
                      const resolved = resolveScheduleTimeForStudent(
                        item,
                        dayRows,
                        sharedRowsForSync,
                        sesiText,
                        settings.sesiTersedia,
                        syncEnabled
                      );
                      return resolved.isAdjusted ? { ...item, waktu: resolved.waktu } : item;
                    });
                    const barcodeVal = resolveSiswaBarcodeValue(siswa);

                    const layoutMode = settings.tataLetakJadwalBelakang || 'otomatis';
                    const useTwoColumns =
                      layoutMode === '2_tabel' ||
                      (layoutMode === 'otomatis' && studentJadwal.length > 8);

                    const splitIdx = Math.ceil(studentJadwal.length / 2);
                    const leftRows = useTwoColumns ? studentJadwal.slice(0, splitIdx) : studentJadwal;
                    const rightRows = useTwoColumns ? studentJadwal.slice(splitIdx) : [];

                    const renderScheduleSubTable = (rows: JadwalUjianItem[], startNo: number) => (
                      <table
                        style={{
                          fontSize: useTwoColumns
                            ? fs([8, 7.4, 6.9, isShortCard ? 5.7 : isNarrowCard ? 5.6 : 6.3])
                            : fs([9, 8.4, 8, isNarrowCard ? 6.8 : 7.4]),
                          lineHeight: 1.15
                        }}
                        className="w-full border-collapse bg-white/85"
                      >
                        <thead>
                          <tr
                            style={{
                              background: resolvedDesign.subBannerBackgroundCss,
                              color: resolvedDesign.subBannerTextHex
                            }}
                          >
                            <th
                              className={`border border-slate-500 ${fontScale.schedHeadPad} w-4 text-center font-bold`}
                            >
                              No
                            </th>
                            <th
                              className={`border border-slate-500 ${fontScale.schedHeadPad} text-left font-bold ${
                                useTwoColumns ? 'w-[39%]' : 'w-[35%]'
                              }`}
                            >
                              Hari & Jam
                            </th>
                            <th
                              className={`border border-slate-500 ${fontScale.schedHeadPad} text-left font-bold`}
                            >
                              Mata Pelajaran
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => (
                            <tr key={row.id}>
                              <td
                                className={`border border-slate-400 ${fontScale.schedCellPad} text-center font-bold tabular-nums text-slate-900`}
                              >
                                {startNo + idx}
                              </td>
                              <td
                                className={`border border-slate-400 ${fontScale.schedCellPad} leading-[1.12]`}
                              >
                                <div
                                  className={`font-bold text-slate-950 truncate ${fontScale.schedDateMaxW}`}
                                >
                                  {row.hariTanggal}
                                </div>
                                <div
                                  style={{ fontSize: fs([7, 6.5, 6, 5.3]) }}
                                  className="font-semibold tabular-nums text-slate-800 truncate"
                                >
                                  {row.waktu}
                                </div>
                              </td>
                              <td
                                className={`border border-slate-400 ${fontScale.schedCellPad} font-semibold text-slate-950 leading-[1.12]`}
                              >
                                <div className="line-clamp-1">{row.mataPelajaran}</div>
                                {!useTwoColumns && !isShortCard && row.keterangan ? (
                                  <span className="block text-[6.5px] font-medium text-slate-700 truncate">
                                    {row.keterangan}
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );

                    return (
                      <div style={syncedSlotStyle} className={outerCutWrapperClass}>
                        {cutMode === 'dashed_gunting' && (
                          <span
                            className="absolute -top-2 left-1.5 bg-white px-0.5 text-[9px] text-slate-500 leading-none select-none z-20"
                            aria-hidden="true"
                          >
                            ✂
                          </span>
                        )}
                        {sideBadge && (
                          <span className="no-print absolute -top-2 right-2 bg-blue-700 text-white px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider z-20">
                            {sideBadge}
                          </span>
                        )}

                        <div
                          style={{
                            borderColor: resolvedDesign.outerBorderHex,
                            backgroundImage: resolvedDesign.cardBackgroundCss,
                            fontFamily: resolvedDesign.bodyFontFamily,
                            boxShadow: resolvedDesign.outerEmbossShadowCss
                          }}
                          className={`card-keep-emboss relative border-[1.5px] ${customAiTheme ? '' : themePalette.outerBorder} bg-white text-slate-950 h-full w-full box-border overflow-hidden ${innerCardPadClass}`}
                        >
                          <CardBackgroundLayers design={resolvedDesign} profile={profile} />
                          <div className="relative z-10 flex flex-col justify-between h-full w-full">
                            <div>
                              {/* Back Header Banner */}
                              <div
                                style={{
                                  background: resolvedDesign.bannerBackgroundCss,
                                  color: resolvedDesign.bannerTextHex,
                                  borderBottom:
                                    resolvedDesign.embossStyle !== 'flat_clean'
                                      ? `1.5px solid ${resolvedDesign.foilHex}`
                                      : undefined
                                }}
                                className="px-2 py-0.5 flex items-center justify-between gap-1"
                              >
                                <span
                                  style={{
                                    color: resolvedDesign.accentTextHex,
                                    fontFamily: resolvedDesign.headingFontFamily,
                                    fontSize: fs([10, 9, 8.4, isNarrowCard ? 6.8 : 7.6]),
                                    fontWeight: resolvedDesign.headingFontWeightCss,
                                    letterSpacing: resolvedDesign.headingLetterSpacingCss,
                                    textTransform: resolvedDesign.headingTextTransformCss,
                                    textShadow: resolvedDesign.headingEmbossTextShadow
                                  }}
                                  className="truncate"
                                >
                                  {settings.judulBelakang || 'FORM JADWAL MATA PELAJARAN ULANGAN'}
                                </span>
                                <span
                                  style={{ fontSize: fs([8.5, 7.8, 7.4, isNarrowCard ? 6 : 6.8]) }}
                                  className="font-bold tabular-nums shrink-0"
                                >
                                  {ruangText} • {kelas}
                                </span>
                              </div>
                              <div
                                style={{
                                  background: resolvedDesign.subBannerBackgroundCss,
                                  color: resolvedDesign.subBannerTextHex,
                                  borderColor: resolvedDesign.outerBorderHex,
                                  fontSize: fs([8.5, 7.8, 7.5, isNarrowCard ? 6.3 : 7]),
                                  textTransform: resolvedDesign.headingTextTransformCss
                                }}
                                className="py-0.5 font-bold border-x border-b px-2 flex items-center justify-between gap-2"
                              >
                                <span className="truncate max-w-[68%]">
                                  {settings.namaUjian}
                                </span>
                                <span className="tabular-nums truncate shrink-0">{sesiText}</span>
                              </div>

                              {/* Conditional Schedule Table (Supports up to 16 subjects in 1 or 2 columns) */}
                              {studentJadwal.length === 0 ? (
                                <div className="mt-1.5 border border-slate-400 bg-white/85 px-2 py-3 text-center text-[8px] text-slate-700 italic">
                                  Tidak ada jadwal mapel yang cocok dengan kondisi peserta ini.
                                </div>
                              ) : useTwoColumns ? (
                                <div className="grid grid-cols-2 gap-1 mt-1 items-start">
                                  <div>{renderScheduleSubTable(leftRows, 1)}</div>
                                  <div>
                                    {rightRows.length > 0 &&
                                      renderScheduleSubTable(rightRows, splitIdx + 1)}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1">{renderScheduleSubTable(studentJadwal, 1)}</div>
                              )}
                            </div>

                            {/* Back Footer: Notes + Barcode/QR */}
                            <div
                              className={`${fontScale.footerTop} border-t border-slate-400/90 flex items-end justify-between gap-2`}
                            >
                              <div
                                style={{ fontSize: fs([8.5, 7.8, 7.4, isNarrowCard ? 5.8 : 6.4]) }}
                                className="text-slate-800 leading-tight"
                              >
                                <div className="font-bold text-slate-950">
                                  Catatan Peserta:
                                </div>
                                <div className="line-clamp-2">
                                  {settings.catatanBelakang ||
                                    'Peserta wajib mengikuti ujian sesuai jadwal, sesi, dan ruang yang tercantum.'}
                                </div>
                              </div>
                              {showBarcode && barcodePos !== 'depan' && (
                                <div className="bg-white/95 p-0.5 rounded-[2px] border border-slate-200/80 shrink-0">
                                  <ExamCardBarcode
                                    value={barcodeVal}
                                    mode={barcodeType}
                                    size={barcodeSize}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  };

                  const renderSheetPages = (modeToRender: 'depan' | 'belakang' | 'bergantian') =>
                    printPages.map((page, pageIdx) => {
                      const mirroredBackCards =
                        settings.mirrorDuplexBelakang !== false
                          ? mirrorGridCardsForDuplex(page.cards, cols)
                          : page.cards;

                      return (
                        <React.Fragment key={`sheet-frag-${pageIdx}-${modeToRender}`}>
                          {(modeToRender === 'depan' || modeToRender === 'bergantian') && (
                            <div
                              className={
                                modeToRender === 'bergantian' || pageIdx < printPages.length - 1
                                  ? 'mb-6 print:mb-0 print-page-break'
                                  : ''
                              }
                            >
                              <div className="preview-paper-sheet mx-auto bg-white border border-slate-300 shadow-sm print:border-0 print:shadow-none print:m-0">
                                <div className="no-print mb-2.5 flex items-center justify-between text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                                  <span className="font-bold text-slate-900">
                                    SISI DEPAN — Lembar {pageIdx + 1} dari {printPages.length}
                                  </span>
                                  <span>
                                    {paperCode} {isLandscape ? 'Landscape' : 'Portrait'} ({cardWidthMm}×{cardHeightMm} mm/kartu) • {cols} Kolom • {page.cards.length} kartu
                                  </span>
                                </div>
                                <div style={syncedGridStyle}>
                                  {page.cards.map(siswa => (
                                    <div key={`front-${siswa.id}`} style={syncedSlotStyle}>
                                      {renderFrontCard(siswa)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {(modeToRender === 'belakang' || modeToRender === 'bergantian') && (
                            <div
                              className={
                                pageIdx < printPages.length - 1
                                  ? 'mb-6 print:mb-0 print-page-break'
                                  : ''
                              }
                            >
                              <div className="preview-paper-sheet mx-auto bg-white border border-slate-300 shadow-sm print:border-0 print:shadow-none print:m-0">
                                <div className="no-print mb-2.5 flex items-center justify-between text-[11px] font-mono text-blue-800 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                                  <span className="font-bold flex items-center gap-1">
                                    <FlipHorizontal className="w-3.5 h-3.5" />
                                    SISI BELAKANG (FORM JADWAL) — Lembar {pageIdx + 1} dari {printPages.length}
                                  </span>
                                  <span>
                                    {paperCode} {isLandscape ? 'Landscape' : 'Portrait'} ({cardWidthMm}×{cardHeightMm} mm/kartu) •{' '}
                                    {settings.mirrorDuplexBelakang !== false
                                      ? 'Duplex Cermin'
                                      : 'Standar'}{' '}
                                    • {page.cards.length} kartu
                                  </span>
                                </div>
                                <div style={syncedGridStyle}>
                                  {mirroredBackCards.map((siswa, slotIdx) =>
                                    siswa ? (
                                      <div key={`back-${siswa.id}`} style={syncedSlotStyle}>
                                        {renderBackCard(siswa)}
                                      </div>
                                    ) : (
                                      <div
                                        key={`empty-slot-${pageIdx}-${slotIdx}`}
                                        style={syncedSlotStyle}
                                        aria-hidden="true"
                                      />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    });

                  if (sisiMode === 'depan_saja') {
                    return <div className="space-y-4 print:space-y-0">{renderSheetPages('depan')}</div>;
                  }
                  if (sisiMode === 'belakang_saja') {
                    return <div className="space-y-4 print:space-y-0">{renderSheetPages('belakang')}</div>;
                  }
                  if (sisiMode === 'dua_sisi_bergantian') {
                    return <div className="space-y-4 print:space-y-0">{renderSheetPages('bergantian')}</div>;
                  }

                  // Default: 'pratinjau_berdampingan'
                  // On screen: displays Front & Back side-by-side at 1:1 exact physical card dimensions (cardWidthMm x cardHeightMm).
                  // On print: outputs synchronized Sheet Front -> Sheet Back (duplex-aligned) with identical grid coordinates!
                  const previewPairCardWidthMm =
                    cols === 1 && !isValidCardMm(settings.lebarKartuMm, 40)
                      ? printableWidthMm
                      : cardWidthMm;
                  const canShowSideBySide =
                    previewPairCardWidthMm * 2 + 4 <= printableWidthMm + 1;

                  return (
                    <div>
                      <div className="print:hidden space-y-6">
                        {printPages.map((page, pageIdx) => (
                          <div
                            key={`sidebyside-${pageIdx}`}
                            className="preview-paper-sheet mx-auto bg-white border border-slate-300 shadow-sm space-y-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded border border-slate-200">
                              <span className="font-bold text-slate-900">
                                PRATINJAU DUA SISI 1:1 — Set {pageIdx + 1} dari {printPages.length}
                              </span>
                              <span>
                                {paperCode} {isLandscape ? 'Landscape' : 'Portrait'} • Ukuran Presisi: {cardWidthMm}×{cardHeightMm} mm •{' '}
                                {page.cards.length} peserta
                              </span>
                            </div>
                            <div className="space-y-2.5">
                              {page.cards.map(siswa => (
                                <div
                                  key={`pair-${siswa.id}`}
                                  className={`flex ${
                                    canShowSideBySide
                                      ? 'flex-row items-stretch justify-center'
                                      : 'flex-col items-center'
                                  } gap-2 p-2 rounded-lg bg-slate-50/70 border border-slate-200`}
                                >
                                  <div
                                    style={{
                                      width: `${previewPairCardWidthMm}mm`,
                                      height: `${cardHeightMm}mm`,
                                      flexShrink: 0
                                    }}
                                  >
                                    {renderFrontCard(siswa, 'Depan')}
                                  </div>
                                  <div
                                    style={{
                                      width: `${previewPairCardWidthMm}mm`,
                                      height: `${cardHeightMm}mm`,
                                      flexShrink: 0
                                    }}
                                  >
                                    {renderBackCard(siswa, 'Belakang • Jadwal')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="hidden print:block">{renderSheetPages('bergantian')}</div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        );
      })()}

      <AturKelompokRuangSiswaModal
        isOpen={isRoomGroupModalOpen}
        onClose={() => setIsRoomGroupModalOpen(false)}
        siswaList={siswaList}
        ujianSettings={settings}
        initialSelectedRoom={roomGroupInitialRoom}
        onUpdateUjianSettings={onUpdateSettings}
        onSaveSiswa={(updatedList, msg) => {
          onUpdateSiswa(updatedList);
          appendAuditLog('ATUR_KELOMPOK_RUANG_SISWA', msg);
          notify('success', msg);
        }}
      />
    </div>
  );
};
