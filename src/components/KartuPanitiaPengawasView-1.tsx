import React, { useState, useMemo, useRef } from 'react';
import {
  Guru,
  Tendik,
  SchoolProfile,
  User,
  PanitiaPengawasItem,
  PanitiaPengawasRole,
  KartuPanitiaSettings,
  JadwalPengawasSlot,
  CustomCardTheme,
  CardFontStyle,
  CardEmbossStyle,
  CardAccentPattern
} from '../types';
import {
  PemprovJatimLogo,
  SchoolStampSvg,
  KepalaSekolahSignatureSvg,
  Sman9SurabayaLogoSvg
} from './OfficialStamps';
import { ExamCardBarcode, resolveDirectImageUrl } from './ExamCardBarcode';
import {
  JadwalPengawasScanPortal,
  buildProctorScheduleScanUrl
} from './JadwalPengawasScanPortal';
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
  exportExcelPanitiaPengawas,
  parseExcelPanitiaPengawas,
  exportExcelMatriksJadwalPengawas,
  parseExcelMatriksJadwalPengawas
} from '../services/storageService';
import {
  formatGtkDisplayName,
  buildPanitiaFromGtkDatabase,
  groupPanitiaForSusunanTable,
  DEFAULT_JABATAN_PANITIA_OPTIONS,
  DEFAULT_JABATAN_PENGAWAS_OPTIONS
} from '../utils/panitiaFormat';
import {
  DEFAULT_JADWAL_PENGAWAS_SLOTS,
  DEFAULT_JADWAL_PENGAWAS_KETERANGAN,
  buildPengawasFromJadwalMatrix,
  buildAssignmentRecordFromRow,
  DEFAULT_JADWAL_PENGAWAS_ROWS,
  summarizePengawasSchedule,
  groupSlotsByExamDay,
  recomputeTotalsPerSlot,
  classifyAssignment,
  formatSlotAssignmentShort,
  normalizeAssignmentValue
} from '../utils/pengawasSchedule';
import {
  BadgeCheck,
  ShieldCheck,
  Printer,
  Plus,
  Trash2,
  Search,
  Users,
  UserPlus,
  Wand2,
  Settings,
  SlidersHorizontal,
  Stamp,
  Camera,
  Upload,
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  Scissors,
  RotateCcw,
  FlipHorizontal,
  X,
  ClipboardList,
  Sparkles,
  Loader2,
  Clock,
  Layers,
  ListOrdered,
  Pencil,
  Check,
  ArrowUp,
  ArrowDown,
  Briefcase,
  CalendarDays,
  Table2,
  ZoomIn,
  ZoomOut,
  QrCode,
  Maximize2
} from 'lucide-react';

interface KartuPanitiaPengawasViewProps {
  items: PanitiaPengawasItem[];
  guruList: Guru[];
  tendikList: Tendik[];
  profile: SchoolProfile;
  settings: KartuPanitiaSettings;
  currentUser: User;
  fallbackTtdKsUrl?: string;
  fallbackStempelUrl?: string;
  onUpdateItems: (list: PanitiaPengawasItem[]) => void;
  onUpdateSettings: (settings: KartuPanitiaSettings) => void;
  onSyncTypographyToAllCards?: (typo: CardFontStudioValue) => void;
  onSyncDimensionsToAllCards?: (dims: CardDimensionsStudioValue) => void;
}

type ThemeKey = 'hijau' | 'kuning' | 'merah' | 'biru' | 'abu_abu';

const THEME_PALETTES: Record<
  ThemeKey,
  {
    label: string;
    swatch: string;
    outerBorder: string;
    kopDivider: string;
    banner: string;
    titleHighlight: string;
    subBanner: string;
    rolePill: string;
    accentBorder: string;
  }
> = {
  hijau: {
    label: 'Hijau',
    swatch: 'bg-emerald-700',
    outerBorder: 'border-emerald-800',
    kopDivider: 'border-emerald-800',
    banner: 'bg-emerald-800 text-white',
    titleHighlight: 'text-emerald-100',
    subBanner: 'bg-emerald-50 text-emerald-950 border-emerald-300',
    rolePill: 'bg-emerald-700 text-white',
    accentBorder: 'border-emerald-300'
  },
  kuning: {
    label: 'Kuning',
    swatch: 'bg-amber-400',
    outerBorder: 'border-amber-600',
    kopDivider: 'border-amber-600',
    banner: 'bg-amber-400 text-slate-950',
    titleHighlight: 'text-slate-950',
    subBanner: 'bg-amber-50 text-amber-950 border-amber-300',
    rolePill: 'bg-amber-500 text-slate-950',
    accentBorder: 'border-amber-300'
  },
  merah: {
    label: 'Merah',
    swatch: 'bg-rose-700',
    outerBorder: 'border-rose-800',
    kopDivider: 'border-rose-800',
    banner: 'bg-rose-800 text-white',
    titleHighlight: 'text-rose-100',
    subBanner: 'bg-rose-50 text-rose-950 border-rose-300',
    rolePill: 'bg-rose-700 text-white',
    accentBorder: 'border-rose-300'
  },
  biru: {
    label: 'Biru',
    swatch: 'bg-blue-700',
    outerBorder: 'border-blue-800',
    kopDivider: 'border-blue-800',
    banner: 'bg-blue-800 text-white',
    titleHighlight: 'text-blue-100',
    subBanner: 'bg-blue-50 text-blue-950 border-blue-300',
    rolePill: 'bg-blue-700 text-white',
    accentBorder: 'border-blue-300'
  },
  abu_abu: {
    label: 'Abu-abu',
    swatch: 'bg-slate-600',
    outerBorder: 'border-slate-700',
    kopDivider: 'border-slate-600',
    banner: 'bg-slate-600 text-white',
    titleHighlight: 'text-slate-100',
    subBanner: 'bg-slate-100 text-slate-900 border-slate-300',
    rolePill: 'bg-slate-700 text-white',
    accentBorder: 'border-slate-300'
  }
};

const compressImageFile = (file: File, maxDim = 280, preserveAlpha = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(
          preserveAlpha
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.85)
        );
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const normalizeKey = (val: string) =>
  val
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

const padFrontGridCardsForDuplex = (
  cards: PanitiaPengawasItem[],
  cols: number
): (PanitiaPengawasItem | null)[] => {
  if (cols <= 1) return cards;
  const padded: (PanitiaPengawasItem | null)[] = [...cards];
  const remainder = padded.length % cols;
  if (remainder !== 0) {
    for (let k = 0; k < cols - remainder; k++) {
      padded.push(null);
    }
  }
  return padded;
};

const mirrorGridCardsForDuplex = (
  cards: PanitiaPengawasItem[],
  cols: number
): (PanitiaPengawasItem | null)[] => {
  if (cols <= 1) return cards;
  const mirrored: (PanitiaPengawasItem | null)[] = [];
  for (let i = 0; i < cards.length; i += cols) {
    const row: (PanitiaPengawasItem | null)[] = cards.slice(i, i + cols);
    while (row.length < cols) {
      row.push(null);
    }
    row.reverse();
    mirrored.push(...row);
  }
  return mirrored;
};

const DEFAULT_SESI_OPTIONS = [
  'Sesi 1 (07.30 - 09.30)',
  'Sesi 2 (10.00 - 12.00)',
  'Sesi 3 (13.00 - 15.00)'
];

const parseSelectedSessions = (rawValue: string | undefined, available: string[]): string[] => {
  const val = (rawValue || '').trim();
  if (!val || /^semua\s*sesi$/i.test(val)) return ['Semua Sesi'];
  const parts = val
    .split(/\s*[+,]\s*/)
    .map(p => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];
  // Normalize known tokens back to full option string if matched by prefix like "Sesi 1"
  return parts.map(p => {
    const matched = available.find(
      opt =>
        opt.toLowerCase() === p.toLowerCase() ||
        opt.toLowerCase().startsWith(p.toLowerCase()) ||
        p.toLowerCase().startsWith(opt.split('(')[0].trim().toLowerCase())
    );
    return matched || p;
  });
};

const getShortSessionLabel = (sesi: string, idx: number): string => {
  const match = sesi.match(/sesi\s*([a-z0-9]+)/i);
  if (match) return `S${match[1]}`;
  return `S${idx + 1}`;
};

const isValidCardMm = (val: unknown, min: number): val is number =>
  typeof val === 'number' && Number.isFinite(val) && val >= min;

const computePanitiaPaperGeometry = (settings: KartuPanitiaSettings) => {
  const paperBase =
    settings.ukuranKertas === 'F4'
      ? { w: 215, h: 330, css: '215mm 330mm', label: 'F4 / Folio' }
      : settings.ukuranKertas === 'Letter'
      ? { w: 215.9, h: 279.4, css: 'letter', label: 'Letter' }
      : { w: 210, h: 297, css: 'A4', label: 'A4' };

  const isLandscape = settings.orientasiCetak === 'landscape';
  const paperWidthMm = isLandscape ? paperBase.h : paperBase.w;
  const paperHeightMm = isLandscape ? paperBase.w : paperBase.h;
  const cssPageSize = `${paperBase.css} ${isLandscape ? 'landscape' : 'portrait'}`;

  const cols =
    settings.jumlahKolom || (isLandscape ? 3 : settings.layoutPerPage === 9 ? 3 : 2);
  const rowsPerPage = Math.max(1, Math.ceil((settings.layoutPerPage || 6) / cols));
  const marginMm =
    settings.marginCetak === 'sempit' ? 5 : settings.marginCetak === 'lebar' ? 12 : 8;
  const gapMm =
    settings.jarakAntarKartu === 'rapat' ? 2 : settings.jarakAntarKartu === 'lega' ? 5 : 3;

  const availHeightMm = paperHeightMm - marginMm * 2 - 4;
  const availWidthMm = paperWidthMm - marginMm * 2;
  const autoCardWidthMm = Math.floor((availWidthMm - gapMm * (cols - 1)) / cols);
  const autoCardHeightMm = Math.floor((availHeightMm - gapMm * (rowsPerPage - 1)) / rowsPerPage);

  return {
    paperBase,
    isLandscape,
    paperWidthMm,
    paperHeightMm,
    cssPageSize,
    cols,
    rowsPerPage,
    marginMm,
    gapMm,
    availWidthMm,
    availHeightMm,
    autoCardWidthMm,
    autoCardHeightMm
  };
};

const getPanitiaCardMetrics = (cardWidthMm: number, cardHeightMm: number) => {
  const fontTier: 'xl' | 'lg' | 'md' | 'sm' =
    cardHeightMm >= 108 && cardWidthMm >= 95
      ? 'xl'
      : cardHeightMm >= 92 && cardWidthMm >= 82
      ? 'lg'
      : cardHeightMm >= 80 && cardWidthMm >= 74
      ? 'md'
      : 'sm';
  const tierIdx = fontTier === 'xl' ? 0 : fontTier === 'lg' ? 1 : fontTier === 'md' ? 2 : 3;
  const isNarrowCard = cardWidthMm < 75;
  const isShortCard = cardHeightMm < 72;
  const isVeryShortCard = cardHeightMm <= 62;

  const fontScale =
    fontTier === 'xl'
      ? {
          pad: 'p-3.5',
          kopGap: 'gap-2.5 pb-1.5',
          logo: 'w-9 h-10',
          kopGov: 'text-[8px]',
          kopSchool: 'text-[12.5px]',
          kopAddr: 'text-[8px]',
          bannerPad: 'px-2.5 py-1 mt-1.5',
          bannerTitle: 'text-[10.5px]',
          bannerMeta: 'text-[8.5px]',
          subBanner: 'text-[9px] py-0.5',
          bodyGap: 'gap-3 mt-2.5',
          photo: 'w-[74px] h-[98px]',
          infoTable: 'text-[10.5px] leading-[1.32]',
          infoLabelW: 'w-[68px]',
          jabatanSize: 'text-[11px]',
          footerTop: 'mt-2 pt-1.5',
          notes: 'text-[8px]',
          ttdBox: 'min-w-[150px] text-[9px]',
          ttdArea: 'h-10',
          stampSize: 'w-13 h-13',
          ttdImg: 'h-9 max-w-[100px]',
          ttdSvg: 'w-24 h-9',
          ksName: 'text-[10px]',
          ksNip: 'text-[8.5px]',
          barcode: 42
        }
      : fontTier === 'lg'
      ? {
          pad: 'p-3',
          kopGap: 'gap-2 pb-1',
          logo: 'w-8 h-9',
          kopGov: 'text-[7.5px]',
          kopSchool: 'text-[11px]',
          kopAddr: 'text-[7.2px]',
          bannerPad: 'px-2 py-1 mt-1',
          bannerTitle: 'text-[9.5px]',
          bannerMeta: 'text-[7.8px]',
          subBanner: 'text-[8.2px] py-0.5',
          bodyGap: 'gap-2.5 mt-2',
          photo: 'w-[64px] h-[85px]',
          infoTable: 'text-[9.5px] leading-[1.28]',
          infoLabelW: 'w-[60px]',
          jabatanSize: 'text-[10px]',
          footerTop: 'mt-1.5 pt-1',
          notes: 'text-[7.4px]',
          ttdBox: 'min-w-[138px] text-[8.2px]',
          ttdArea: 'h-9',
          stampSize: 'w-11 h-11',
          ttdImg: 'h-8 max-w-[90px]',
          ttdSvg: 'w-20 h-8',
          ksName: 'text-[9.2px]',
          ksNip: 'text-[7.8px]',
          barcode: 38
        }
      : fontTier === 'md'
      ? {
          pad: 'p-2.5',
          kopGap: 'gap-1.5 pb-1',
          logo: 'w-7 h-8',
          kopGov: 'text-[7px]',
          kopSchool: 'text-[10.2px]',
          kopAddr: 'text-[6.8px]',
          bannerPad: 'px-2 py-0.5 mt-1',
          bannerTitle: 'text-[8.8px]',
          bannerMeta: 'text-[7.2px]',
          subBanner: 'text-[7.6px] py-0.5',
          bodyGap: 'gap-2 mt-1.5',
          photo: 'w-[58px] h-[76px]',
          infoTable: 'text-[9px] leading-[1.22]',
          infoLabelW: 'w-[56px]',
          jabatanSize: 'text-[9.5px]',
          footerTop: 'mt-1.5 pt-1',
          notes: 'text-[7px]',
          ttdBox: 'min-w-[126px] text-[7.6px]',
          ttdArea: 'h-8',
          stampSize: 'w-10 h-10',
          ttdImg: 'h-7 max-w-[82px]',
          ttdSvg: 'w-18 h-7',
          ksName: 'text-[8.5px]',
          ksNip: 'text-[7.2px]',
          barcode: 34
        }
      : {
          pad: isVeryShortCard ? 'p-1' : isShortCard ? 'p-1.5' : 'p-2',
          kopGap: isVeryShortCard ? 'gap-1 pb-0' : 'gap-1 pb-0.5',
          logo: isVeryShortCard
            ? 'w-5 h-5.5'
            : isNarrowCard || isShortCard
            ? 'w-5.5 h-6.5'
            : 'w-6.5 h-7.5',
          kopGov: isNarrowCard ? 'text-[5.8px]' : 'text-[6.3px]',
          kopSchool: isNarrowCard ? 'text-[8.4px]' : 'text-[9.2px]',
          kopAddr: isNarrowCard ? 'text-[5.4px]' : 'text-[6px]',
          bannerPad: isVeryShortCard ? 'px-1.5 py-[1px] mt-0.5' : 'px-1.5 py-0.5 mt-0.5',
          bannerTitle: isNarrowCard ? 'text-[7px]' : 'text-[7.8px]',
          bannerMeta: isNarrowCard ? 'text-[5.8px]' : 'text-[6.5px]',
          subBanner: isNarrowCard ? 'text-[6.3px] py-0' : 'text-[6.8px] py-0.5',
          bodyGap: isVeryShortCard ? 'gap-1 mt-0.5' : 'gap-1.5 mt-1',
          photo: isVeryShortCard
            ? 'w-[34px] h-[45px]'
            : isShortCard
            ? 'w-[42px] h-[56px]'
            : 'w-[48px] h-[64px]',
          infoTable: isNarrowCard
            ? 'text-[7.2px] leading-[1.14]'
            : 'text-[8px] leading-[1.18]',
          infoLabelW: isNarrowCard ? 'w-[44px]' : 'w-[50px]',
          jabatanSize: isNarrowCard ? 'text-[7.6px]' : 'text-[8.4px]',
          footerTop: isVeryShortCard ? 'mt-0.5 pt-0.5' : 'mt-1 pt-0.5',
          notes: isNarrowCard ? 'text-[5.6px]' : 'text-[6.2px]',
          ttdBox: isNarrowCard ? 'min-w-[92px] text-[6.2px]' : 'min-w-[110px] text-[6.8px]',
          ttdArea: isVeryShortCard ? 'h-4.5' : isShortCard ? 'h-6' : 'h-7',
          stampSize: isVeryShortCard ? 'w-7 h-7' : isShortCard ? 'w-8 h-8' : 'w-9 h-9',
          ttdImg: isVeryShortCard ? 'h-4 max-w-[60px]' : isShortCard ? 'h-5 max-w-[68px]' : 'h-6 max-w-[76px]',
          ttdSvg: isVeryShortCard ? 'w-12 h-4' : isShortCard ? 'w-14 h-5' : 'w-16 h-6',
          ksName: isNarrowCard ? 'text-[6.6px]' : 'text-[7.6px]',
          ksNip: isNarrowCard ? 'text-[5.6px]' : 'text-[6.3px]',
          barcode: isVeryShortCard ? 22 : isShortCard ? 26 : 30
        };

  return { fontTier, tierIdx, isNarrowCard, isShortCard, isVeryShortCard, fontScale };
};

export const KartuPanitiaPengawasView: React.FC<KartuPanitiaPengawasViewProps> = ({
  items,
  guruList,
  tendikList,
  profile,
  settings,
  fallbackTtdKsUrl,
  fallbackStempelUrl,
  onUpdateItems,
  onUpdateSettings,
  onSyncTypographyToAllCards,
  onSyncDimensionsToAllCards
}) => {
  const [activeConfigTab, setActiveConfigTab] = useState<
    'umum' | 'cetak' | 'jadwal' | 'ttd' | 'tatib' | 'none'
  >('umum');
  const [filterKategori, setFilterKategori] = useState<'all' | 'panitia' | 'pengawas'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'filtered' | 'selected' | 'individual'>('filtered');
  const [individualPrintId, setIndividualPrintId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Master Guru & Tendik Picker Modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSourceFilter, setPickerSourceFilter] = useState<'all' | 'guru' | 'tendik'>('all');
  const [pickerRoleTarget, setPickerRoleTarget] = useState<PanitiaPengawasRole>('pengawas');
  const [pickerDefaultJabatan, setPickerDefaultJabatan] = useState('Pengawas Ruang');
  const [pickerDefaultSesi, setPickerDefaultSesi] = useState('Sesi 1 (07.30 - 09.30)');
  const [pickerSelectedKeys, setPickerSelectedKeys] = useState<string[]>([]);

  // Back side tata tertib draft
  const [newTatibPanitia, setNewTatibPanitia] = useState('');
  const [newTatibPengawas, setNewTatibPengawas] = useState('');

  // Custom session draft & AI theme state
  const [newSesiDraft, setNewSesiDraft] = useState('');
  const [aiThemePrompt, setAiThemePrompt] = useState(
    'Elegan tegas resmi SMAN 9 Surabaya, pembeda Panitia & Pengawas jelas, bersih di kertas putih'
  );
  const [isGeneratingAiTheme, setIsGeneratingAiTheme] = useState(false);
  const [aiThemeError, setAiThemeError] = useState<string | null>(null);
  const [previewOutputMode, setPreviewOutputMode] = useState<
    'kartu' | 'susunan_tabel' | 'matriks_pengawas'
  >('kartu');

  // Jadwal Pengawas matrix & zoom/scan portal state
  const [jadwalSearch, setJadwalSearch] = useState('');
  const [showSlotEditor, setShowSlotEditor] = useState(false);
  const [previewZoomPct, setPreviewZoomPct] = useState<number>(100);
  const [scanPreviewProctorId, setScanPreviewProctorId] = useState<string | null>(null);

  // Menu Edit Jenis Jabatan Modal state
  const [isJabatanModalOpen, setIsJabatanModalOpen] = useState(false);
  const [jabatanModalTab, setJabatanModalTab] = useState<PanitiaPengawasRole>('panitia');
  const [newJabatanInput, setNewJabatanInput] = useState('');
  const [editingJabatanIdx, setEditingJabatanIdx] = useState<number | null>(null);
  const [editingJabatanDraft, setEditingJabatanDraft] = useState('');

  const batchPhotoInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const matriksExcelInputRef = useRef<HTMLInputElement>(null);

  const availableSesiOptions = useMemo(() => {
    return Array.isArray(settings.sesiTersedia) ? settings.sesiTersedia : DEFAULT_SESI_OPTIONS;
  }, [settings.sesiTersedia]);

  const activeJadwalSlots = useMemo(() => {
    return Array.isArray(settings.jadwalPengawasSlots) && settings.jadwalPengawasSlots.length > 0
      ? settings.jadwalPengawasSlots
      : DEFAULT_JADWAL_PENGAWAS_SLOTS;
  }, [settings.jadwalPengawasSlots]);

  const availableJabatanPanitia = useMemo(() => {
    return Array.isArray(settings.jabatanPanitiaTersedia) &&
      settings.jabatanPanitiaTersedia.length > 0
      ? settings.jabatanPanitiaTersedia
      : DEFAULT_JABATAN_PANITIA_OPTIONS;
  }, [settings.jabatanPanitiaTersedia]);

  const availableJabatanPengawas = useMemo(() => {
    return Array.isArray(settings.jabatanPengawasTersedia) &&
      settings.jabatanPengawasTersedia.length > 0
      ? settings.jabatanPengawasTersedia
      : DEFAULT_JABATAN_PENGAWAS_OPTIONS;
  }, [settings.jabatanPengawasTersedia]);

  const defaultJabatanPanitia = useMemo(
    () =>
      availableJabatanPanitia.includes('Penyelenggara')
        ? 'Penyelenggara'
        : availableJabatanPanitia[0] || 'Penyelenggara',
    [availableJabatanPanitia]
  );

  const defaultJabatanPengawas = useMemo(
    () => availableJabatanPengawas[0] || 'Pengawas Ruang',
    [availableJabatanPengawas]
  );

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const openJabatanModal = (tab?: PanitiaPengawasRole) => {
    if (tab) setJabatanModalTab(tab);
    setEditingJabatanIdx(null);
    setEditingJabatanDraft('');
    setNewJabatanInput('');
    setIsJabatanModalOpen(true);
  };

  const getJabatanListByRole = (role: PanitiaPengawasRole) =>
    role === 'panitia' ? availableJabatanPanitia : availableJabatanPengawas;

  const saveJabatanListByRole = (role: PanitiaPengawasRole, nextList: string[]) => {
    if (role === 'panitia') {
      onUpdateSettings({ ...settings, jabatanPanitiaTersedia: nextList });
    } else {
      onUpdateSettings({ ...settings, jabatanPengawasTersedia: nextList });
    }
  };

  const handleAddJabatanOption = () => {
    const clean = newJabatanInput.trim();
    if (!clean) {
      notify('error', 'Masukkan nama jenis jabatan baru terlebih dahulu.');
      return;
    }
    const current = getJabatanListByRole(jabatanModalTab);
    if (current.some(j => j.toLowerCase() === clean.toLowerCase())) {
      notify('error', `Jenis jabatan "${clean}" sudah ada dalam daftar.`);
      return;
    }
    saveJabatanListByRole(jabatanModalTab, [...current, clean]);
    setNewJabatanInput('');
    notify(
      'success',
      `Jenis jabatan "${clean}" ditambahkan ke daftar ${
        jabatanModalTab === 'panitia' ? 'Panitia' : 'Pengawas'
      }.`
    );
  };

  const handleSaveRenameJabatan = (idx: number) => {
    const clean = editingJabatanDraft.trim();
    if (!clean) {
      notify('error', 'Nama jenis jabatan tidak boleh kosong.');
      return;
    }
    const current = getJabatanListByRole(jabatanModalTab);
    const oldName = current[idx];
    if (!oldName) return;
    if (
      clean.toLowerCase() !== oldName.toLowerCase() &&
      current.some((j, i) => i !== idx && j.toLowerCase() === clean.toLowerCase())
    ) {
      notify('error', `Jenis jabatan "${clean}" sudah ada.`);
      return;
    }
    const nextList = current.map((j, i) => (i === idx ? clean : j));
    saveJabatanListByRole(jabatanModalTab, nextList);

    // Sync any existing items using the renamed jabatan
    let syncedCount = 0;
    const nextItems = items.map(it => {
      if (
        it.kategori === jabatanModalTab &&
        it.jabatanKepanitiaan.trim().toLowerCase() === oldName.trim().toLowerCase()
      ) {
        syncedCount++;
        return { ...it, jabatanKepanitiaan: clean };
      }
      return it;
    });
    if (syncedCount > 0) {
      onUpdateItems(nextItems);
    }
    if (pickerRoleTarget === jabatanModalTab && pickerDefaultJabatan === oldName) {
      setPickerDefaultJabatan(clean);
    }
    setEditingJabatanIdx(null);
    setEditingJabatanDraft('');
    notify(
      'success',
      `Jenis jabatan diubah menjadi "${clean}"${
        syncedCount > 0 ? ` (${syncedCount} data kartu ikut diperbarui)` : ''
      }.`
    );
  };

  const handleMoveJabatanOption = (idx: number, dir: -1 | 1) => {
    const current = [...getJabatanListByRole(jabatanModalTab)];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const [picked] = current.splice(idx, 1);
    current.splice(targetIdx, 0, picked);
    saveJabatanListByRole(jabatanModalTab, current);
    setEditingJabatanIdx(null);
  };

  const handleDeleteJabatanOption = (targetName: string) => {
    const current = getJabatanListByRole(jabatanModalTab);
    if (current.length <= 1) {
      notify('error', 'Minimal harus ada 1 jenis jabatan tersedia.');
      return;
    }
    const nextList = current.filter(j => j !== targetName);
    saveJabatanListByRole(jabatanModalTab, nextList);
    if (pickerRoleTarget === jabatanModalTab && pickerDefaultJabatan === targetName) {
      setPickerDefaultJabatan(nextList[0]);
    }
    notify('success', `Jenis jabatan "${targetName}" dihapus dari daftar pilihan.`);
  };

  const handleResetDefaultJabatan = (role: PanitiaPengawasRole) => {
    const defaults =
      role === 'panitia'
        ? [...DEFAULT_JABATAN_PANITIA_OPTIONS]
        : [...DEFAULT_JABATAN_PENGAWAS_OPTIONS];
    saveJabatanListByRole(role, defaults);
    if (pickerRoleTarget === role) {
      setPickerDefaultJabatan(
        role === 'panitia'
          ? defaults.includes('Penyelenggara')
            ? 'Penyelenggara'
            : defaults[0]
          : defaults[0]
      );
    }
    setEditingJabatanIdx(null);
    notify(
      'success',
      `Daftar jenis jabatan ${
        role === 'panitia' ? 'Panitia (22 jabatan default)' : 'Pengawas'
      } dikembalikan ke pengaturan default.`
    );
  };

  const handleAddSessionOption = () => {
    const clean = newSesiDraft.trim();
    if (!clean) {
      notify('error', 'Masukkan nama/waktu sesi baru terlebih dahulu.');
      return;
    }
    if (availableSesiOptions.some(s => s.toLowerCase() === clean.toLowerCase())) {
      notify('error', `Sesi "${clean}" sudah ada dalam daftar.`);
      return;
    }
    onUpdateSettings({
      ...settings,
      sesiTersedia: [...availableSesiOptions, clean]
    });
    setNewSesiDraft('');
    notify('success', `Sesi baru "${clean}" ditambahkan dan siap dipilih.`);
  };

  const handleRemoveSessionOption = (sesiToRemove: string) => {
    const nextList = availableSesiOptions.filter(s => s !== sesiToRemove);
    onUpdateSettings({
      ...settings,
      sesiTersedia: nextList
    });
    let affected = 0;
    const nextItems = items.map(it => {
      const val = (it.sesiTugas || '').trim();
      if (!val || /^semua\s*sesi$/i.test(val)) return it;
      const parts = parseSelectedSessions(val, availableSesiOptions);
      if (parts.some(p => p.toLowerCase() === sesiToRemove.toLowerCase())) {
        affected++;
        const remaining = parts.filter(p => p.toLowerCase() !== sesiToRemove.toLowerCase());
        return { ...it, sesiTugas: remaining.length > 0 ? remaining.join(' + ') : '' };
      }
      return it;
    });
    if (affected > 0) {
      onUpdateItems(nextItems);
    }
    if (pickerDefaultSesi === sesiToRemove) {
      setPickerDefaultSesi(nextList[0] || 'Semua Sesi');
    }
    notify(
      'success',
      `Sesi "${sesiToRemove}" dihapus dari daftar opsi sesi${
        affected > 0 ? ` (${affected} petugas ikut disinkronkan)` : ''
      }.`
    );
  };

  const handleResetDefaultSessionOptions = () => {
    onUpdateSettings({
      ...settings,
      sesiTersedia: [...DEFAULT_SESI_OPTIONS]
    });
    notify('success', 'Daftar sesi dikembalikan ke 3 sesi bawaan (Sesi 1, Sesi 2, Sesi 3).');
  };

  const handleToggleItemSession = (item: PanitiaPengawasItem, targetSesi: string) => {
    if (targetSesi === 'Semua Sesi') {
      handleUpdateField(item.id, 'sesiTugas', 'Semua Sesi');
      return;
    }
    const currentList = parseSelectedSessions(item.sesiTugas, availableSesiOptions).filter(
      s => s !== 'Semua Sesi'
    );
    const exists = currentList.some(s => s.toLowerCase() === targetSesi.toLowerCase());
    let nextList: string[];
    if (exists) {
      nextList = currentList.filter(s => s.toLowerCase() !== targetSesi.toLowerCase());
    } else {
      nextList = [...currentList, targetSesi];
      // Sort following availableSesiOptions order so Sesi 1 + Sesi 2 reads chronologically
      nextList.sort((a, b) => {
        const ia = availableSesiOptions.indexOf(a);
        const ib = availableSesiOptions.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }
    handleUpdateField(
      item.id,
      'sesiTugas',
      nextList.length > 0 ? nextList.join(' + ') : ''
    );
  };

  const handleBatchApplySession = (targetSesi: string) => {
    const targetIds =
      selectedIds.length > 0 ? new Set(selectedIds) : new Set(filteredItems.map(i => i.id));
    if (targetIds.size === 0) {
      notify('error', 'Tidak ada baris petugas untuk diterapkan sesi.');
      return;
    }
    onUpdateItems(
      items.map(it => (targetIds.has(it.id) ? { ...it, sesiTugas: targetSesi } : it))
    );
    notify('success', `Sesi "${targetSesi}" diterapkan ke ${targetIds.size} petugas.`);
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
          prompt: promptToUse || 'Variatif elegan resmi panitia & pengawas sekolah',
          targetType: 'Kartu Panitia & Pengawas Ujian',
          schoolName: profile.namaSekolah
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data?.success || !Array.isArray(data?.themes)) {
        throw new Error(data?.message || 'Gagal menghasilkan variasi tema AI.');
      }
      const generated: CustomCardTheme[] = data.themes;
      onUpdateSettings({
        ...settings,
        aiThemePresets: generated,
        temaWarnaPanitia: 'ai_custom',
        temaWarnaPengawas: 'ai_custom',
        aiCustomThemePanitia: generated[0] || settings.aiCustomThemePanitia || null,
        aiCustomThemePengawas: generated[1] || generated[0] || settings.aiCustomThemePengawas || null,
        desainFont: undefined,
        desainFontBody: undefined,
        desainFontPanitia: undefined,
        desainFontPengawas: undefined,
        desainEmboss: undefined,
        desainPolaBg: undefined
      });
      appendAuditLog(
        'AI_TEMA_PANITIA_PENGAWAS',
        `Generate ${generated.length} variasi tema kartu Panitia & Pengawas via Gemini AI.`
      );
      notify(
        'success',
        `${generated.length} variasi desain kartu AI dibuat! Panitia: "${generated[0]?.name}", Pengawas: "${generated[1]?.name || generated[0]?.name}".`
      );
    } catch (err: any) {
      const msg = err?.message || 'Gagal menghubungi layanan AI Tema Kartu.';
      setAiThemeError(msg);
      notify('error', msg);
    } finally {
      setIsGeneratingAiTheme(false);
    }
  };

  const panitiaOnlyItems = useMemo(
    () => items.filter(i => i.kategori === 'panitia'),
    [items]
  );

  const pengawasOnlyItems = useMemo(
    () => items.filter(i => i.kategori === 'pengawas'),
    [items]
  );

  const filteredPengawasMatrix = useMemo(() => {
    const q = jadwalSearch.toLowerCase().trim();
    if (!q) return pengawasOnlyItems;
    return pengawasOnlyItems.filter(
      p =>
        p.nama.toLowerCase().includes(q) ||
        p.nomorTugas.toLowerCase().includes(q) ||
        (p.nip || '').toLowerCase().includes(q)
    );
  }, [pengawasOnlyItems, jadwalSearch]);

  const slotTotals = useMemo(
    () => recomputeTotalsPerSlot(pengawasOnlyItems, activeJadwalSlots),
    [pengawasOnlyItems, activeJadwalSlots]
  );

  const susunanTableGroups = useMemo(
    () => groupPanitiaForSusunanTable(panitiaOnlyItems),
    [panitiaOnlyItems]
  );

  const stats = useMemo(() => {
    const total = items.length;
    const panitia = items.filter(i => i.kategori === 'panitia').length;
    const pengawas = items.filter(i => i.kategori === 'pengawas').length;
    const withFoto = items.filter(i => Boolean(i.fotoUrl?.trim())).length;
    return { total, panitia, pengawas, withFoto };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return items.filter(item => {
      if (filterKategori !== 'all' && item.kategori !== filterKategori) return false;
      if (!q) return true;
      return (
        item.nama.toLowerCase().includes(q) ||
        (item.nip || '').toLowerCase().includes(q) ||
        item.nomorTugas.toLowerCase().includes(q) ||
        item.jabatanKepanitiaan.toLowerCase().includes(q) ||
        (item.ruangTugas || '').toLowerCase().includes(q) ||
        (item.unitAsal || '').toLowerCase().includes(q)
      );
    });
  }, [items, filterKategori, searchQuery]);

  const cardsToPrint = useMemo(() => {
    if (printMode === 'individual') {
      const target = items.find(i => i.id === individualPrintId) || filteredItems[0] || items[0];
      return target ? [target] : [];
    }
    if (printMode === 'selected' && selectedIds.length > 0) {
      return items.filter(i => selectedIds.includes(i.id));
    }
    return filteredItems;
  }, [printMode, individualPrintId, selectedIds, items, filteredItems]);

  const printPages = useMemo(() => {
    const perPage = Math.max(1, settings.layoutPerPage || 6);
    const pages: PanitiaPengawasItem[][] = [];
    for (let i = 0; i < cardsToPrint.length; i += perPage) {
      pages.push(cardsToPrint.slice(i, i + perPage));
    }
    return pages;
  }, [cardsToPrint, settings.layoutPerPage]);

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    const visibleIds = filteredItems.map(i => i.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleUpdateField = <K extends keyof PanitiaPengawasItem>(
    id: string,
    field: K,
    value: PanitiaPengawasItem[K]
  ) => {
    onUpdateItems(
      items.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddManualRow = (kategori: PanitiaPengawasRole) => {
    const sameCatCount = items.filter(i => i.kategori === kategori).length;
    const prefix =
      kategori === 'panitia'
        ? settings.prefixNomorPanitia || 'PAN-26-'
        : settings.prefixNomorPengawas || 'PGW-26-';
    const nextNo = `${prefix}${String(sameCatCount + 1).padStart(3, '0')}`;

    const newItem: PanitiaPengawasItem = {
      id: `pp-${kategori}-${Date.now()}`,
      kategori,
      nomorTugas: nextNo,
      nama: kategori === 'panitia' ? 'Nama Panitia Baru' : 'Nama Pengawas Baru',
      nip: '-',
      pangkatGolongan: '-',
      jabatanKepanitiaan:
        kategori === 'panitia' ? defaultJabatanPanitia : defaultJabatanPengawas,
      unitAsal: 'SMA Negeri 9 Surabaya',
      ruangTugas:
        kategori === 'panitia'
          ? 'Sekretariat Panitia'
          : `R.${String(sameCatCount + 1).padStart(2, '0')}`,
      sesiTugas: kategori === 'panitia' ? 'Semua Sesi' : 'Sesi 1 (07.30 - 09.30)',
      sourceType: 'manual'
    };
    onUpdateItems([newItem, ...items]);
    notify(
      'success',
      `Menambahkan baris ${kategori === 'panitia' ? 'Panitia' : 'Pengawas'} baru (${nextNo}).`
    );
  };

  const handleRemoveItem = (id: string) => {
    onUpdateItems(items.filter(i => i.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const handleAutoGenerateNumbersAndRooms = () => {
    if (items.length === 0) {
      notify('error', 'Daftar Panitia & Pengawas masih kosong.');
      return;
    }
    let panSeq = 0;
    let pgwSeq = 0;
    const updated = items.map(item => {
      if (item.kategori === 'panitia') {
        panSeq++;
        return {
          ...item,
          nomorTugas: `${settings.prefixNomorPanitia || 'PAN-26-'}${String(panSeq).padStart(3, '0')}`
        };
      } else {
        pgwSeq++;
        return {
          ...item,
          nomorTugas: `${settings.prefixNomorPengawas || 'PGW-26-'}${String(pgwSeq).padStart(3, '0')}`,
          ruangTugas: item.ruangTugas?.trim() || `R.${String(pgwSeq).padStart(2, '0')}`
        };
      }
    });
    onUpdateItems(updated);
    appendAuditLog(
      'GENERATE_KARTU_PANITIA_PENGAWAS',
      `Generate nomor tugas (${panSeq} Panitia, ${pgwSeq} Pengawas) & ruang pengawasan.`
    );
    notify(
      'success',
      `Berhasil generate ulang nomor tugas (${panSeq} Panitia, ${pgwSeq} Pengawas).`
    );
  };

  const handleSinglePhotoUpload = async (id: string, file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 280, false);
      handleUpdateField(id, 'fotoUrl', dataUrl);
      notify('success', 'Pas foto 3x4 berhasil diunggah.');
    } catch {
      notify('error', 'Gagal memproses file foto.');
    }
  };

  const handleBatchPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    let matched = 0;
    const unmatched: string[] = [];
    const photoMap = new Map<string, string>();

    for (const file of files) {
      const base = file.name.replace(/\.[^/.]+$/, '');
      const normFile = normalizeKey(base);
      const target = items.find(it => {
        const candidates = [it.nip, it.nomorTugas, it.nama]
          .filter(Boolean)
          .map(v => normalizeKey(String(v)));
        return candidates.some(c => c && (c === normFile || normFile.includes(c)));
      });
      if (target) {
        try {
          const dataUrl = await compressImageFile(file, 280, false);
          photoMap.set(target.id, dataUrl);
          matched++;
        } catch {
          unmatched.push(file.name);
        }
      } else {
        unmatched.push(file.name);
      }
    }

    if (photoMap.size > 0) {
      onUpdateItems(
        items.map(it => (photoMap.has(it.id) ? { ...it, fotoUrl: photoMap.get(it.id) } : it))
      );
    }

    notify(
      matched > 0 ? 'success' : 'error',
      matched > 0
        ? `${matched} foto petugas berhasil dipasangkan otomatis.${
            unmatched.length > 0 ? ` ${unmatched.length} file tidak cocok.` : ''
          }`
        : `Tidak ada nama file foto yang cocok dengan NIP, No. Tugas, atau Nama petugas.`
    );
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const res = parseExcelPanitiaPengawas(buf, items);
      if (res.success) {
        onUpdateItems(res.data);
        appendAuditLog(
          'IMPORT_EXCEL_PANITIA_PENGAWAS',
          `Mengimpor ${res.count} data Panitia & Pengawas dari ${file.name}.`
        );
        notify('success', res.message);
      } else {
        notify('error', res.message);
      }
    } catch {
      notify('error', 'Gagal membaca file Excel Panitia & Pengawas.');
    }
  };

  const handleSignAssetUpload = async (
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
          ? 'Tanda tangan Kepala Sekolah berhasil diperbarui.'
          : 'Stempel resmi berhasil diperbarui.'
      );
    } catch {
      notify('error', 'Gagal memproses gambar tanda tangan / stempel.');
    }
  };

  // Master Guru + Tendik Picker list
  const gtkDirectory = useMemo(() => {
    const combined: {
      key: string;
      sourceType: 'guru' | 'tendik';
      sourceId: string;
      nama: string;
      nip: string;
      pangkat: string;
      unit: string;
    }[] = [];

    guruList.forEach(g => {
      combined.push({
        key: `guru:${g.id}`,
        sourceType: 'guru',
        sourceId: g.id,
        nama: formatGtkDisplayName(g.nama, g.gelar),
        nip: g.nip || '-',
        pangkat: g.pangkatGolongan || '-',
        unit: g.mataPelajaran || g.mapel || g.jabatan || 'Guru Mapel'
      });
    });

    tendikList.forEach(t => {
      combined.push({
        key: `tendik:${t.id}`,
        sourceType: 'tendik',
        sourceId: t.id,
        nama: formatGtkDisplayName(t.nama, t.gelar),
        nip: t.nip || '-',
        pangkat: t.pangkatGolongan || '-',
        unit: t.jabatan || t.tugasUtama || 'Tenaga Kependidikan'
      });
    });

    const q = pickerSearch.toLowerCase().trim();
    return combined.filter(entry => {
      if (pickerSourceFilter !== 'all' && entry.sourceType !== pickerSourceFilter) return false;
      if (!q) return true;
      return (
        entry.nama.toLowerCase().includes(q) ||
        entry.nip.toLowerCase().includes(q) ||
        entry.unit.toLowerCase().includes(q)
      );
    });
  }, [guruList, tendikList, pickerSearch, pickerSourceFilter]);

  const handleConfirmPickerImport = () => {
    if (pickerSelectedKeys.length === 0) {
      notify('error', 'Pilih minimal satu Guru atau Tendik terlebih dahulu.');
      return;
    }

    const existingSameCatCount = items.filter(i => i.kategori === pickerRoleTarget).length;
    const prefix =
      pickerRoleTarget === 'panitia'
        ? settings.prefixNomorPanitia || 'PAN-26-'
        : settings.prefixNomorPengawas || 'PGW-26-';

    const selectedEntries = gtkDirectory.filter(e => pickerSelectedKeys.includes(e.key));
    const newlyAdded: PanitiaPengawasItem[] = selectedEntries.map((entry, idx) => {
      const seq = existingSameCatCount + idx + 1;
      return {
        id: `pp-${pickerRoleTarget}-${Date.now()}-${idx}`,
        kategori: pickerRoleTarget,
        nomorTugas: `${prefix}${String(seq).padStart(3, '0')}`,
        nama: entry.nama,
        nip: entry.nip,
        pangkatGolongan: entry.pangkat,
        jabatanKepanitiaan:
          pickerDefaultJabatan ||
          (pickerRoleTarget === 'panitia' ? defaultJabatanPanitia : defaultJabatanPengawas),
        unitAsal: entry.unit,
        ruangTugas:
          pickerRoleTarget === 'panitia'
            ? 'Sekretariat Panitia'
            : `R.${String(seq).padStart(2, '0')}`,
        sesiTugas:
          pickerDefaultSesi ||
          (pickerRoleTarget === 'panitia'
            ? 'Semua Sesi'
            : availableSesiOptions[0] || 'Sesi 1 (07.30 - 09.30)'),
        sourceType: entry.sourceType,
        sourceId: entry.sourceId
      };
    });

    onUpdateItems([...items, ...newlyAdded]);
    setIsPickerOpen(false);
    setPickerSelectedKeys([]);
    appendAuditLog(
      'TAMBAH_PANITIA_PENGAWAS_GTK',
      `Menambahkan ${newlyAdded.length} ${
        pickerRoleTarget === 'panitia' ? 'Panitia' : 'Pengawas'
      } dari Master Data Guru & Tendik.`
    );
    notify(
      'success',
      `Berhasil menambahkan ${newlyAdded.length} ${
        pickerRoleTarget === 'panitia' ? 'Panitia Ujian' : 'Pengawas Ruang'
      } dari Master GTK.`
    );
  };

  const handleSusunPanitiaDariGtk = () => {
    const result = buildPanitiaFromGtkDatabase(
      guruList,
      tendikList,
      items,
      settings
    );
    onUpdateItems(result.nextItems);
    if (
      !settings.namaUjian?.trim() ||
      settings.namaUjian === 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)'
    ) {
      onUpdateSettings({
        ...settings,
        namaUjian: 'PENILAIAN SUMATIF AKHIR SEMESTER GASAL'
      });
    }
    appendAuditLog(
      'SUSUN_PANITIA_DARI_GTK',
      `Menyusun 31 Panitia PSAS (No. 1–17) dari Database Guru & Tendik (${result.matchedFromGtkCount} cocok otomatis dari GTK).`
    );
    notify(
      'success',
      `Susunan Panitia (31 petugas, No. 1–17) berhasil disusun dari Database Guru & Tendik (${result.matchedFromGtkCount}/31 terhubung langsung ke Master GTK).`
    );
  };

  const handleMuatJadwalPengawas = (resetToMasterMatrix = false) => {
    const baseSlots = resetToMasterMatrix
      ? [...DEFAULT_JADWAL_PENGAWAS_SLOTS]
      : activeJadwalSlots;

    const existingForMerge = resetToMasterMatrix
      ? items.map(it => {
          if (it.kategori !== 'pengawas') return it;
          const matchRow = DEFAULT_JADWAL_PENGAWAS_ROWS.find(
            r =>
              r.displayName.toLowerCase() === it.nama.toLowerCase() ||
              it.id === `pp-pgw-${String(r.seq).padStart(2, '0')}`
          );
          return matchRow
            ? {
                ...it,
                jadwalMengawas: buildAssignmentRecordFromRow(matchRow.assignments, baseSlots)
              }
            : it;
        })
      : items;

    const result = buildPengawasFromJadwalMatrix(
      guruList,
      tendikList,
      existingForMerge,
      {
        ...settings,
        jadwalPengawasSlots: baseSlots
      }
    );

    onUpdateItems(result.nextItems);
    onUpdateSettings({
      ...settings,
      jadwalPengawasSlots: baseSlots,
      tampilkanJadwalDiKartuPengawas: settings.tampilkanJadwalDiKartuPengawas !== false
    });
    appendAuditLog(
      'MUAT_JADWAL_PENGAWAS_OTOMATIS',
      `Memuat & menyinkronkan jadwal mengawas 16 sesi untuk ${
        result.nextItems.filter(i => i.kategori === 'pengawas').length
      } pengawas (${result.matchedFromGtkCount} terhubung DB GTK).`
    );
    notify(
      'success',
      `${
        resetToMasterMatrix
          ? 'Matriks jadwal pengawas bawaan (33 pengawas × 16 sesi) berhasil dimuat ulang'
          : 'Jadwal pengawas 16 sesi disinkronkan ke Kartu Pengawas'
      } (${result.matchedFromGtkCount}/33 terhubung langsung DB GTK).`
    );
  };

  const handleUpdateJadwalCell = (itemId: string, slotId: string, rawValue: string) => {
    const cleanVal = normalizeAssignmentValue(rawValue);
    onUpdateItems(
      items.map(it => {
        if (it.id !== itemId) return it;
        const nextMap = { ...(it.jadwalMengawas || {}) };
        if (cleanVal) {
          nextMap[slotId] = cleanVal;
        } else {
          delete nextMap[slotId];
        }
        const summary = summarizePengawasSchedule(nextMap, activeJadwalSlots);
        return {
          ...it,
          jadwalMengawas: nextMap,
          ruangTugas: summary.ruangSummary || it.ruangTugas,
          sesiTugas: summary.sesiSummary || it.sesiTugas
        };
      })
    );
  };

  const handleUpdateSlotMeta = (slotId: string, patch: Partial<JadwalPengawasSlot>) => {
    const nextSlots = activeJadwalSlots.map(s => (s.id === slotId ? { ...s, ...patch } : s));
    onUpdateSettings({
      ...settings,
      jadwalPengawasSlots: nextSlots
    });
  };

  const handleAddJadwalSlot = () => {
    const nextIndex = activeJadwalSlots.length + 1;
    const newSlot: JadwalPengawasSlot = {
      id: `s-custom-${Date.now()}`,
      hari: 'Hari Baru',
      tanggal: '-',
      waktu: '07.00 - 09.30',
      mapel: 'MAPEL UJIAN',
      sesiLabel: `Sesi ${(nextIndex % 2) === 1 ? '1' : '2'}`
    };
    onUpdateSettings({
      ...settings,
      jadwalPengawasSlots: [...activeJadwalSlots, newSlot]
    });
    notify('success', `Slot sesi jadwal ke-${nextIndex} ditambahkan.`);
  };

  const handleRemoveJadwalSlot = (slotId: string) => {
    if (activeJadwalSlots.length <= 1) {
      notify('error', 'Minimal harus ada 1 slot jadwal pengawas.');
      return;
    }
    const nextSlots = activeJadwalSlots.filter(s => s.id !== slotId);
    onUpdateSettings({
      ...settings,
      jadwalPengawasSlots: nextSlots
    });
    onUpdateItems(
      items.map(it => {
        if (it.kategori !== 'pengawas' || !it.jadwalMengawas) return it;
        const nextMap = { ...it.jadwalMengawas };
        delete nextMap[slotId];
        const summary = summarizePengawasSchedule(nextMap, nextSlots);
        return {
          ...it,
          jadwalMengawas: nextMap,
          ruangTugas: summary.ruangSummary || it.ruangTugas,
          sesiTugas: summary.sesiSummary || it.sesiTugas
        };
      })
    );
    notify('success', 'Slot jadwal pengawas dihapus & rekapitulasi disinkronkan.');
  };

  const handleImportMatriksExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const res = parseExcelMatriksJadwalPengawas(buf, items, activeJadwalSlots, settings);
      if (res.success) {
        onUpdateSettings({
          ...settings,
          jadwalPengawasSlots: res.slots,
          tampilkanJadwalDiKartuPengawas: true
        });
        onUpdateItems(res.items);
        appendAuditLog(
          'IMPORT_MATRIKS_JADWAL_PENGAWAS',
          `Mengimpor matriks jadwal untuk ${res.count} pengawas dari ${file.name}.`
        );
        notify('success', res.message);
      } else {
        notify('error', res.message);
      }
    } catch {
      notify('error', 'Gagal membaca file Excel matriks jadwal pengawas.');
    }
  };

  const handlePrintCards = () => {
    if (previewOutputMode === 'susunan_tabel') {
      if (panitiaOnlyItems.length === 0) {
        notify('error', 'Daftar Panitia masih kosong untuk dicetak.');
        return;
      }
      appendAuditLog(
        'CETAK_SUSUNAN_PANITIA',
        `Mencetak Daftar Susunan Panitia Penyelenggara (${panitiaOnlyItems.length} petugas).`
      );
      window.print();
      return;
    }
    if (previewOutputMode === 'matriks_pengawas') {
      if (pengawasOnlyItems.length === 0) {
        notify('error', 'Daftar Pengawas masih kosong untuk dicetak.');
        return;
      }
      appendAuditLog(
        'CETAK_MATRIKS_PENGAWAS',
        `Mencetak Matriks Jadwal Pengawas (${pengawasOnlyItems.length} pengawas × ${activeJadwalSlots.length} sesi).`
      );
      window.print();
      return;
    }
    if (cardsToPrint.length === 0) {
      notify('error', 'Tidak ada Kartu Panitia / Pengawas yang siap dicetak.');
      return;
    }
    appendAuditLog(
      'CETAK_KARTU_PANITIA_PENGAWAS',
      `Mencetak ${cardsToPrint.length} Kartu Panitia & Pengawas (${
        printMode === 'individual' ? 'Individu' : 'Massal'
      } • ${settings.namaUjian}).`
    );
    window.print();
  };

  const handlePrintIndividualItem = (item: PanitiaPengawasItem) => {
    setIndividualPrintId(item.id);
    setPrintMode('individual');
    setPreviewOutputMode('kartu');
    notify(
      'success',
      `Mode Cetak Individu aktif untuk ${item.nama}. Pratinjau di bawah menampilkan 1 kartu ini.`
    );
  };

  const applyLayoutPreset = (preset: 'standar_id' | 'standar_6' | 'a4_4_orang') => {
    if (preset === 'a4_4_orang') {
      onUpdateSettings({
        ...settings,
        ukuranKertas: 'A4',
        orientasiCetak: 'portrait',
        jumlahKolom: 2,
        layoutPerPage: 4,
        lebarKartuMm: undefined,
        tinggiKartuMm: undefined,
        lebarKartuPanitiaMm: undefined,
        tinggiKartuPanitiaMm: undefined,
        lebarKartuPengawasMm: undefined,
        tinggiKartuPengawasMm: undefined
      });
      notify('success', 'Tata letak diatur ke Kertas A4 untuk 4 Orang per lembar (2×2).');
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
        tinggiKartuMm: 95,
        lebarKartuPanitiaMm: undefined,
        tinggiKartuPanitiaMm: undefined,
        lebarKartuPengawasMm: undefined,
        tinggiKartuPengawasMm: undefined
      });
      notify('success', 'Ukuran kartu diatur ke Standar ID Card (58×95 mm • 3 kolom).');
      return;
    }
    onUpdateSettings({
      ...settings,
      ukuranKertas: 'A4',
      orientasiCetak: 'portrait',
      jumlahKolom: 2,
      layoutPerPage: 6,
      lebarKartuMm: undefined,
      tinggiKartuMm: undefined,
      lebarKartuPanitiaMm: undefined,
      tinggiKartuPanitiaMm: undefined,
      lebarKartuPengawasMm: undefined,
      tinggiKartuPengawasMm: undefined
    });
    notify('success', 'Tata letak diatur ke Standar A4 (6 Orang per lembar).');
  };

  const resolvePetugasBarcodeValue = (item: PanitiaPengawasItem): string => {
    if (
      item.kategori === 'pengawas' &&
      item.jadwalMengawas &&
      Object.keys(item.jadwalMengawas).length > 0
    ) {
      return buildProctorScheduleScanUrl(
        item,
        activeJadwalSlots,
        settings.barcodeLinkTemplate
      );
    }
    const tpl = (settings.barcodeLinkTemplate || '').trim();
    if (!tpl) return `${item.nomorTugas} | ${item.nama}`;
    return tpl
      .replace(/\{nomorTugas\}/gi, encodeURIComponent(item.nomorTugas || ''))
      .replace(/\{nip\}/gi, encodeURIComponent(item.nip || ''))
      .replace(/\{nama\}/gi, encodeURIComponent(item.nama || ''))
      .replace(/\{kategori\}/gi, encodeURIComponent(item.kategori))
      .replace(/\{ruang\}/gi, encodeURIComponent(item.ruangTugas || ''));
  };

  const effectiveTtdUrl = settings.ttdKsUrl || fallbackTtdKsUrl || '';
  const effectiveStempelUrl = settings.stempelUrl || fallbackStempelUrl || '';

  return (
    <div className="space-y-6">
      {/* Top Action & Stats Card (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-900 text-amber-400 rounded-lg shrink-0">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kartu Panitia Ujian & Pengawas Ruang
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Buat dan cetak tanda pengenal resmi untuk <strong>Panitia Ujian</strong> &{' '}
                <strong>Pengawas Ruang</strong> lengkap dengan warna pembeda, SK Tugas, pas foto 3x4,
                QR verifikasi, dan pengesahan Kepala Sekolah {profile.namaSekolah}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSusunPanitiaDariGtk}
              className="px-3 py-2 bg-slate-900 hover:bg-black text-amber-400 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0"
              title="Ambil nama-nama dari Database Guru & Tendik lalu susun otomatis sesuai Format Kepanitiaan No. 1–17"
            >
              <ListOrdered className="w-4 h-4" />
              <span>Susun Panitia dari GTK (Format 1–17)</span>
            </button>

            <button
              type="button"
              onClick={() => handleMuatJadwalPengawas(false)}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0"
              title="Muat & sinkronkan jadwal mengawas 16 sesi (33 pengawas) otomatis ke Kartu Pengawas dan DB Guru"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Sinkron Jadwal Pengawas (33 Guru)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPickerSelectedKeys([]);
                const listForRole = getJabatanListByRole(pickerRoleTarget);
                if (!listForRole.includes(pickerDefaultJabatan)) {
                  setPickerDefaultJabatan(
                    pickerRoleTarget === 'panitia'
                      ? defaultJabatanPanitia
                      : defaultJabatanPengawas
                  );
                }
                setIsPickerOpen(true);
              }}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Users className="w-4 h-4" />
              <span>Ambil dari Guru & Tendik</span>
            </button>

            <button
              type="button"
              onClick={handleAutoGenerateNumbersAndRooms}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0"
              title="Generate ulang nomor tugas Panitia/Pengawas dan ruang pengawasan"
            >
              <Wand2 className="w-4 h-4" />
              <span>Generate No. Tugas</span>
            </button>

            <button
              type="button"
              onClick={handlePrintCards}
              disabled={
                previewOutputMode === 'susunan_tabel'
                  ? panitiaOnlyItems.length === 0
                  : previewOutputMode === 'matriks_pengawas'
                  ? pengawasOnlyItems.length === 0
                  : cardsToPrint.length === 0
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>
                {previewOutputMode === 'susunan_tabel'
                  ? `Cetak Daftar Panitia (${panitiaOnlyItems.length})`
                  : previewOutputMode === 'matriks_pengawas'
                  ? `Cetak Matriks Pengawas (${pengawasOnlyItems.length})`
                  : `Cetak ${cardsToPrint.length} Kartu`}
              </span>
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">Total Petugas Terdaftar</div>
            <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {stats.total} <span className="text-xs font-sans font-normal text-slate-500">orang</span>
            </div>
          </div>
          <div className="bg-rose-50/70 border border-rose-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-rose-700">Kartu Panitia Ujian</div>
            <div className="text-lg font-bold text-rose-800 font-mono tabular-nums">
              {stats.panitia} <span className="text-xs font-sans font-normal text-rose-600">petugas</span>
            </div>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-emerald-700">Kartu Pengawas Ruang</div>
            <div className="text-lg font-bold text-emerald-800 font-mono tabular-nums">
              {stats.pengawas} <span className="text-xs font-sans font-normal text-emerald-600">pengawas</span>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] font-medium text-slate-500">Terpasang Foto 3x4</div>
            <div className="text-lg font-bold text-blue-700 font-mono tabular-nums">
              {stats.withFoto} <span className="text-xs font-sans font-normal text-slate-500">/ {stats.total}</span>
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
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* Configuration Tabs Panel (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveConfigTab(activeConfigTab === 'umum' ? 'none' : 'umum')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'umum'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pengaturan SK, Judul & Prefix</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveConfigTab(activeConfigTab === 'cetak' ? 'none' : 'cetak')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'cetak'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Kertas, Warna Kartu & Tata Letak</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveConfigTab(activeConfigTab === 'jadwal' ? 'none' : 'jadwal')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'jadwal'
                  ? 'bg-teal-800 text-white'
                  : 'bg-teal-50 text-teal-900 border border-teal-300 hover:bg-teal-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Jadwal Pengawas ({activeJadwalSlots.length} Sesi)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveConfigTab(activeConfigTab === 'tatib' ? 'none' : 'tatib')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'tatib'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Tugas & Tata Tertib (Belakang)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveConfigTab(activeConfigTab === 'ttd' ? 'none' : 'ttd')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeConfigTab === 'ttd'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Stamp className="w-3.5 h-3.5" />
              <span>TTD KS, Stempel & QR</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportExcelPanitiaPengawas(items)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => excelInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Impor Excel</span>
            </button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportExcel}
            />

            <button
              type="button"
              onClick={() => batchPhotoInputRef.current?.click()}
              className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-md flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Unggah Massal Foto</span>
            </button>
            <input
              ref={batchPhotoInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleBatchPhotoUpload}
            />
          </div>
        </div>

        {/* Tab 1: General SK & Titles */}
        {activeConfigTab === 'umum' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
            <div className="md:col-span-4 space-y-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kegiatan / Ujian</label>
                <input
                  type="text"
                  value={settings.namaUjian}
                  onChange={e => onUpdateSettings({ ...settings, namaUjian: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
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
                <label className="block font-semibold text-slate-700 mb-1">Nomor SK Panitia / Pengawas</label>
                <input
                  type="text"
                  value={settings.nomorSkPanitia || ''}
                  onChange={e => onUpdateSettings({ ...settings, nomorSkPanitia: e.target.value })}
                  placeholder="421.3/482/101.6.1.9/2026"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            <div className="md:col-span-4 space-y-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Kartu Panitia</label>
                <input
                  type="text"
                  value={settings.judulKartuPanitia}
                  onChange={e =>
                    onUpdateSettings({ ...settings, judulKartuPanitia: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold uppercase"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Kartu Pengawas</label>
                <input
                  type="text"
                  value={settings.judulKartuPengawas}
                  onChange={e =>
                    onUpdateSettings({ ...settings, judulKartuPengawas: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prefix No. Panitia</label>
                  <input
                    type="text"
                    value={settings.prefixNomorPanitia}
                    onChange={e =>
                      onUpdateSettings({ ...settings, prefixNomorPanitia: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prefix No. Pengawas</label>
                  <input
                    type="text"
                    value={settings.prefixNomorPengawas}
                    onChange={e =>
                      onUpdateSettings({ ...settings, prefixNomorPengawas: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-4 space-y-2.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kota & Tanggal Penetapan</label>
                <input
                  type="text"
                  value={settings.kotaTanggalCetak}
                  onChange={e => onUpdateSettings({ ...settings, kotaTanggalCetak: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Kartu Panitia</label>
                <input
                  type="text"
                  value={settings.catatanPanitia}
                  onChange={e => onUpdateSettings({ ...settings, catatanPanitia: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Kartu Pengawas</label>
                <input
                  type="text"
                  value={settings.catatanPengawas}
                  onChange={e => onUpdateSettings({ ...settings, catatanPengawas: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Session Roster Management */}
            <div className="md:col-span-12 pt-3 border-t border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Penyediaan Pilihan Sesi (Semua Sesi / 3 Sesi Bawaan / Tambah Sesi Berikutnya)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newSesiDraft}
                    onChange={e => setNewSesiDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSessionOption();
                      }
                    }}
                    placeholder="Tambah sesi baru, misal: Sesi 4 (15.30 - 17.00)"
                    className="w-60 px-2.5 py-1 border border-slate-300 rounded bg-white text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSessionOption}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Sesi</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaultSessionOptions}
                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold text-[11px] flex items-center gap-1"
                    title="Kembalikan 3 sesi bawaan"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-md bg-slate-900 text-amber-400 font-bold text-[11px]">
                  Semua Sesi (Otomatis)
                </span>
                {availableSesiOptions.length === 0 ? (
                  <span className="text-[11px] text-slate-500 italic">
                    Belum ada sesi tambahan. Tambahkan di kolom sebelah kanan atau klik Reset.
                  </span>
                ) : (
                  availableSesiOptions.map(sesi => (
                    <span
                      key={sesi}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-[11px]"
                    >
                      <span>{sesi}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSessionOption(sesi)}
                        className="p-0.5 rounded text-blue-500 hover:text-rose-700 hover:bg-rose-100 transition-colors"
                        title={`Hapus ${sesi}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Menu Ringkas Jenis Jabatan Default */}
            <div className="md:col-span-12 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-700 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  <strong>Jenis Jabatan Default:</strong>{' '}
                  <span className="font-semibold text-rose-800">
                    {availableJabatanPanitia.length} Jabatan Panitia
                  </span>{' '}
                  (Penanggung Jawab s/d Pembantu Sie Keamanan) •{' '}
                  <span className="font-semibold text-emerald-800">
                    {availableJabatanPengawas.length} Jabatan Pengawas
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => openJabatanModal('panitia')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[11px] flex items-center gap-1.5"
              >
                <Pencil className="w-3 h-3" />
                <span>Menu Edit Jenis Jabatan</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Paper, Color Themes & Layout */}
        {activeConfigTab === 'cetak' && (
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Theme Color Panitia */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="block font-bold text-slate-800">
                  Warna Tema Kartu Panitia
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(THEME_PALETTES) as ThemeKey[]).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, temaWarnaPanitia: key })}
                      className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center gap-1.5 ${
                        settings.temaWarnaPanitia === key
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${THEME_PALETTES[key].swatch}`} />
                      <span>{THEME_PALETTES[key].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Color Pengawas */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="block font-bold text-slate-800">
                  Warna Tema Kartu Pengawas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(THEME_PALETTES) as ThemeKey[]).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, temaWarnaPengawas: key })}
                      className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center gap-1.5 ${
                        settings.temaWarnaPengawas === key
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${THEME_PALETTES[key].swatch}`} />
                      <span>{THEME_PALETTES[key].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Size & Orientation */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="block font-bold text-slate-800">Kertas & Orientasi</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={settings.ukuranKertas}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        ukuranKertas: e.target.value as 'A4' | 'F4' | 'Letter'
                      })
                    }
                    className="px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="A4">A4</option>
                    <option value="F4">F4 / Folio</option>
                    <option value="Letter">Letter</option>
                  </select>
                  <select
                    value={settings.orientasiCetak}
                    onChange={e => {
                      const nextOrient = e.target.value as 'portrait' | 'landscape';
                      onUpdateSettings({
                        ...settings,
                        orientasiCetak: nextOrient,
                        jumlahKolom:
                          nextOrient === 'landscape'
                            ? 3
                            : settings.layoutPerPage === 9
                            ? 3
                            : 2
                      });
                    }}
                    className="px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={settings.jumlahKolom}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        jumlahKolom: Number(e.target.value) as 1 | 2 | 3
                      })
                    }
                    className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value={1}>1 Kolom</option>
                    <option value={2}>2 Kolom</option>
                    <option value={3}>3 Kolom</option>
                  </select>
                  <select
                    value={settings.layoutPerPage}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        layoutPerPage: Number(e.target.value) as 4 | 6 | 8 | 9
                      })
                    }
                    className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value={4}>4 Kartu / Hal</option>
                    <option value={6}>6 Kartu / Hal</option>
                    <option value={8}>8 Kartu / Hal</option>
                    <option value={9}>9 Kartu / Hal</option>
                  </select>
                </div>
              </div>

              {/* Print Mode & Toggles */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="block font-bold text-slate-800">Mode Sisi & Garis Potong</label>
                <select
                  value={settings.modeSisiCetak}
                  onChange={e =>
                    onUpdateSettings({
                      ...settings,
                      modeSisiCetak: e.target.value as KartuPanitiaSettings['modeSisiCetak']
                    })
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value="dua_sisi_bergantian">Bolak-Balik Presisi (Hal. Depan → Belakang)</option>
                  <option value="gabung_lipat">Gabung Depan + Belakang (1 Baris Potong & Lipat)</option>
                  <option value="pratinjau_berdampingan">2 Sisi Berdampingan (Cetak Duplex)</option>
                  <option value="depan_saja">1 Sisi (Depan Saja)</option>
                </select>
                <select
                  value={settings.garisPotong}
                  onChange={e =>
                    onUpdateSettings({
                      ...settings,
                      garisPotong: e.target.value as 'dashed_gunting' | 'dashed' | 'none'
                    })
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="dashed_gunting">Garis Putus + Ikon Gunting</option>
                  <option value="dashed">Garis Putus Saja</option>
                  <option value="none">Tanpa Garis Potong</option>
                </select>
              </div>
            </div>

            {/* Pengaturan Lebar & Tinggi Kartu Presisi (Panitia & Pengawas) */}
            {(() => {
              const g = computePanitiaPaperGeometry(settings);
              return (
                <CardDimensionsStudioPanel
                  mode="panitia_pengawas"
                  value={{
                    sharedWidthMm: settings.lebarKartuMm,
                    sharedHeightMm: settings.tinggiKartuMm,
                    panitiaWidthMm: settings.lebarKartuPanitiaMm,
                    panitiaHeightMm: settings.tinggiKartuPanitiaMm,
                    pengawasWidthMm: settings.lebarKartuPengawasMm,
                    pengawasHeightMm: settings.tinggiKartuPengawasMm
                  }}
                  autoWidthMm={g.autoCardWidthMm}
                  autoHeightMm={g.autoCardHeightMm}
                  cols={g.cols}
                  rowsPerPage={g.rowsPerPage}
                  gapMm={g.gapMm}
                  printableWidthMm={g.availWidthMm}
                  printableHeightMm={g.availHeightMm}
                  paperLabel={`${g.paperBase.label} ${g.isLandscape ? 'Landscape' : 'Portrait'}`}
                  onChange={patch =>
                    onUpdateSettings({
                      ...settings,
                      ...('sharedWidthMm' in patch ? { lebarKartuMm: patch.sharedWidthMm } : {}),
                      ...('sharedHeightMm' in patch ? { tinggiKartuMm: patch.sharedHeightMm } : {}),
                      ...('panitiaWidthMm' in patch
                        ? { lebarKartuPanitiaMm: patch.panitiaWidthMm }
                        : {}),
                      ...('panitiaHeightMm' in patch
                        ? { tinggiKartuPanitiaMm: patch.panitiaHeightMm }
                        : {}),
                      ...('pengawasWidthMm' in patch
                        ? { lebarKartuPengawasMm: patch.pengawasWidthMm }
                        : {}),
                      ...('pengawasHeightMm' in patch
                        ? { tinggiKartuPengawasMm: patch.pengawasHeightMm }
                        : {})
                    })
                  }
                  onApplyToAllCardTypes={
                    onSyncDimensionsToAllCards
                      ? () => {
                          onSyncDimensionsToAllCards({
                            sharedWidthMm: settings.lebarKartuMm,
                            sharedHeightMm: settings.tinggiKartuMm,
                            panitiaWidthMm: settings.lebarKartuPanitiaMm,
                            panitiaHeightMm: settings.tinggiKartuPanitiaMm,
                            pengawasWidthMm: settings.lebarKartuPengawasMm,
                            pengawasHeightMm: settings.tinggiKartuPengawasMm
                          });
                          notify(
                            'success',
                            'Ukuran lebar & tinggi kartu berhasil disinkronkan ke Kartu Panitia, Pengawas, dan Siswa!'
                          );
                        }
                      : undefined
                  }
                />
              );
            })()}

            {/* Dedicated Interactive Font Studio (10 Macam Font + Penyesuaian Ukuran/Ketebalan/Spasi + Generator) */}
            <CardFontStudioPanel
              mode="panitia_pengawas"
              value={{
                headingFont: settings.desainFont,
                bodyFont: settings.desainFontBody,
                panitiaFont: settings.desainFontPanitia,
                pengawasFont: settings.desainFontPengawas,
                fontScale: settings.desainFontScale ?? 100,
                fontWeight: settings.desainFontWeight || 'tebal',
                letterSpacing: settings.desainLetterSpacing || 'standar',
                uppercaseTitle: settings.desainJudulKapital !== false
              }}
              onChange={patch =>
                onUpdateSettings({
                  ...settings,
                  ...('headingFont' in patch ? { desainFont: patch.headingFont } : {}),
                  ...('bodyFont' in patch ? { desainFontBody: patch.bodyFont } : {}),
                  ...('panitiaFont' in patch ? { desainFontPanitia: patch.panitiaFont } : {}),
                  ...('pengawasFont' in patch ? { desainFontPengawas: patch.pengawasFont } : {}),
                  ...('fontScale' in patch ? { desainFontScale: patch.fontScale } : {}),
                  ...('fontWeight' in patch ? { desainFontWeight: patch.fontWeight } : {}),
                  ...('letterSpacing' in patch ? { desainLetterSpacing: patch.letterSpacing } : {}),
                  ...('uppercaseTitle' in patch ? { desainJudulKapital: patch.uppercaseTitle } : {})
                })
              }
              onGenerateAiFontAndTheme={hint => {
                setAiThemePrompt(hint);
                handleGenerateAiThemes(hint);
              }}
              isGeneratingAi={isGeneratingAiTheme}
              onApplyToAllCardTypes={
                onSyncTypographyToAllCards
                  ? () => {
                      onSyncTypographyToAllCards({
                        headingFont: settings.desainFont,
                        bodyFont: settings.desainFontBody,
                        panitiaFont: settings.desainFontPanitia,
                        pengawasFont: settings.desainFontPengawas,
                        fontScale: settings.desainFontScale ?? 100,
                        fontWeight: settings.desainFontWeight || 'tebal',
                        letterSpacing: settings.desainLetterSpacing || 'standar',
                        uppercaseTitle: settings.desainJudulKapital !== false
                      });
                      notify(
                        'success',
                        'Pengaturan font berhasil diterapkan ke Kartu Panitia, Pengawas, dan Peserta Didik!'
                      );
                    }
                  : undefined
              }
            />

            {/* Studio Desain Background, Emboss, Gradasi & AI (Panitia & Pengawas) */}
            <div className="p-3.5 rounded-lg border border-indigo-200 bg-indigo-50/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Studio Desain Background, Emboss & Gradasi AI (Gemini)</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                  {settings.temaWarnaPanitia === 'ai_custom' && settings.aiCustomThemePanitia && (
                    <span className="px-2 py-0.5 rounded bg-rose-700 text-white font-bold">
                      Panitia: {settings.aiCustomThemePanitia.name}
                    </span>
                  )}
                  {settings.temaWarnaPengawas === 'ai_custom' && settings.aiCustomThemePengawas && (
                    <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold">
                      Pengawas: {settings.aiCustomThemePengawas.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Manual Emboss, Pattern & Gradient Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-2.5 rounded-lg bg-white border border-indigo-200/80">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                    Efek Emboss & Foil 3D
                  </label>
                  <select
                    value={settings.desainEmboss || ''}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        desainEmboss: (e.target.value || undefined) as CardEmbossStyle | undefined
                      })
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px] font-semibold"
                  >
                    <option value="">Ikuti Tema / Emboss 3D</option>
                    {CARD_EMBOSS_OPTIONS.map(em => (
                      <option key={em.id} value={em.id}>
                        {em.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                    Pola Sekuriti Background
                  </label>
                  <select
                    value={settings.desainPolaBg || ''}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        desainPolaBg: (e.target.value || undefined) as CardAccentPattern | undefined
                      })
                    }
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px] font-semibold"
                  >
                    <option value="">Ikuti Tema / Guilloche</option>
                    {CARD_PATTERN_OPTIONS.map(pat => (
                      <option key={pat.id} value={pat.id}>
                        {pat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-center gap-1.5 sm:col-span-2 lg:col-span-2 pl-1">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.desainGradasiAktif !== false}
                      onChange={e =>
                        onUpdateSettings({ ...settings, desainGradasiAktif: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Aktifkan Gradasi Banner & Kertas Kartu</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.desainWatermarkLogo !== false}
                      onChange={e =>
                        onUpdateSettings({ ...settings, desainWatermarkLogo: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Watermark Emblem Logo Sekolah Emboss</span>
                  </label>
                </div>
              </div>

              {/* Curated Instant Designer Presets */}
              <div className="space-y-1.5">
                <div className="text-[10.5px] font-bold text-indigo-900 uppercase tracking-wider">
                  Preset Desain Kurasi Siap Pakai (Emboss + Foil + Gradasi + Pola):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {CURATED_DESAIN_PRESETS.map(preset => (
                    <div
                      key={preset.id}
                      className="p-2 rounded-lg border border-indigo-200/90 bg-white space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded shrink-0 border-2"
                          style={{
                            background: `linear-gradient(135deg, ${preset.bannerBgHex}, ${preset.bannerBgEndHex || preset.bannerBgHex})`,
                            borderColor: preset.outerBorderHex
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-[11px] truncate">
                            {preset.name}
                          </div>
                          <div className="text-[9.5px] text-slate-500 truncate">
                            {preset.embossStyle?.replace('_', ' ')} • {preset.accentPattern?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              temaWarnaPanitia: 'ai_custom',
                              aiCustomThemePanitia: preset,
                              desainFont: undefined,
                              desainEmboss: undefined,
                              desainPolaBg: undefined
                            })
                          }
                          className={`py-0.5 px-1 rounded font-bold border ${
                            settings.temaWarnaPanitia === 'ai_custom' &&
                            settings.aiCustomThemePanitia?.id === preset.id
                              ? 'bg-rose-700 text-white border-rose-700'
                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          Panitia
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              temaWarnaPengawas: 'ai_custom',
                              aiCustomThemePengawas: preset,
                              desainFont: undefined,
                              desainEmboss: undefined,
                              desainPolaBg: undefined
                            })
                          }
                          className={`py-0.5 px-1 rounded font-bold border ${
                            settings.temaWarnaPengawas === 'ai_custom' &&
                            settings.aiCustomThemePengawas?.id === preset.id
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          Pengawas
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              temaWarnaPanitia: 'ai_custom',
                              temaWarnaPengawas: 'ai_custom',
                              aiCustomThemePanitia: preset,
                              aiCustomThemePengawas: preset,
                              desainFont: undefined,
                              desainEmboss: undefined,
                              desainPolaBg: undefined
                            })
                          }
                          className="py-0.5 px-1 rounded font-bold border bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
                        >
                          Keduanya
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-indigo-200/70">
                {[
                  'Pembeda Tegas Panitia vs Pengawas Foil Emas',
                  'Akademik Resmi Safir Emboss 3D',
                  'Batik Geometris Gradasi Zamrud & Marun',
                  'Futuristik CBT Hexagon Kontras Tinggi'
                ].map(mood => (
                  <button
                    key={mood}
                    type="button"
                    disabled={isGeneratingAiTheme}
                    onClick={() => {
                      setAiThemePrompt(mood);
                      handleGenerateAiThemes(mood);
                    }}
                    className="px-2 py-1 rounded border border-indigo-200 bg-white hover:bg-indigo-100 text-[10.5px] font-semibold text-indigo-800 disabled:opacity-50"
                  >
                    {mood}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
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
                  placeholder="Tulis konsep desain background, font & emboss AI (misal: Marun Emas Foil Batik)..."
                  className="flex-1 min-w-[220px] px-2.5 py-1.5 border border-indigo-200 rounded bg-white text-xs"
                />
                <button
                  type="button"
                  disabled={isGeneratingAiTheme}
                  onClick={() => handleGenerateAiThemes()}
                  className="px-3.5 py-1.5 rounded bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  {isGeneratingAiTheme ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeneratingAiTheme ? 'Merancang Desain AI...' : 'Buat 4 Variasi Desain AI'}</span>
                </button>
              </div>

              {aiThemeError && (
                <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-2.5 py-1.5">
                  {aiThemeError}
                </div>
              )}

              {settings.aiThemePresets && settings.aiThemePresets.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                  {settings.aiThemePresets.map((preset, idx) => (
                    <div
                      key={preset.id || idx}
                      className="p-2 rounded-lg border border-indigo-200 bg-white space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="w-6 h-6 rounded shrink-0 border-2 mt-0.5"
                          style={{
                            background: `linear-gradient(135deg, ${preset.bannerBgHex}, ${preset.bannerBgEndHex || preset.bannerBgHex})`,
                            borderColor: preset.outerBorderHex
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-[11px] truncate">
                            {preset.name}
                          </div>
                          <div className="text-[9.5px] text-slate-500 line-clamp-1">
                            {preset.embossStyle?.replace('_', ' ') || 'soft relief'} •{' '}
                            {preset.fontStyle?.replace('_', ' ') || 'modern sans'}
                          </div>
                          <div className="text-[9.5px] text-slate-600 line-clamp-1">
                            {preset.description || preset.accentPattern || 'Variasi AI'}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              temaWarnaPanitia: 'ai_custom',
                              aiCustomThemePanitia: preset,
                              desainFont: undefined,
                              desainEmboss: undefined,
                              desainPolaBg: undefined
                            })
                          }
                          className={`py-1 px-1.5 rounded font-bold border ${
                            settings.temaWarnaPanitia === 'ai_custom' &&
                            settings.aiCustomThemePanitia?.id === preset.id
                              ? 'bg-rose-700 text-white border-rose-700'
                              : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          Panitia
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              temaWarnaPengawas: 'ai_custom',
                              aiCustomThemePengawas: preset,
                              desainFont: undefined,
                              desainEmboss: undefined,
                              desainPolaBg: undefined
                            })
                          }
                          className={`py-1 px-1.5 rounded font-bold border ${
                            settings.temaWarnaPengawas === 'ai_custom' &&
                            settings.aiCustomThemePengawas?.id === preset.id
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          Pengawas
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              temaWarnaPanitia: 'ai_custom',
                              temaWarnaPengawas: 'ai_custom',
                              aiCustomThemePanitia: preset,
                              aiCustomThemePengawas: preset,
                              desainFont: undefined,
                              desainEmboss: undefined,
                              desainPolaBg: undefined
                            })
                          }
                          className="py-1 px-1.5 rounded font-bold border bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
                        >
                          Keduanya
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              {[
                { key: 'tampilkanKop', label: 'Tampilkan Kop Sekolah' },
                { key: 'tampilkanFoto', label: 'Tampilkan Pas Foto 3x4' },
                { key: 'tampilkanNip', label: 'Tampilkan NIP' },
                { key: 'tampilkanRuang', label: 'Tampilkan Ruang Tugas' },
                { key: 'tampilkanSesi', label: 'Tampilkan Sesi' },
                { key: 'tampilkanBarcode', label: 'Tampilkan QR / Barcode' }
              ].map(opt => (
                <label
                  key={opt.key}
                  className="flex items-center gap-1.5 font-medium text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Boolean((settings as any)[opt.key])}
                    onChange={e =>
                      onUpdateSettings({ ...settings, [opt.key]: e.target.checked })
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
              {(settings.modeSisiCetak === 'dua_sisi_bergantian' ||
                settings.modeSisiCetak === 'pratinjau_berdampingan') && (
                <label className="flex items-center gap-1.5 font-semibold text-blue-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.mirrorDuplexBelakang !== false}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        mirrorDuplexBelakang: e.target.checked
                      })
                    }
                    className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Balik Urutan Kolom Belakang (Presisi Duplex)</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Tab: Jadwal Pengawas (16 Sesi × 33 Pengawas) */}
        {activeConfigTab === 'jadwal' && (
          <div className="p-4 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                  <CalendarDays className="w-4 h-4 text-teal-700" />
                  <span>
                    Matriks Jadwal Pengawas Otomatis ({pengawasOnlyItems.length} Pengawas ×{' '}
                    {activeJadwalSlots.length} Sesi)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Setiap sel (`1–22`, `LABKOM`, `ABM 1–4`, `CAD 1–6`, `OFF`) langsung masuk secara
                  otomatis ke Kartu Pengawas (ringkasan depan & tabel jadwal pribadi di sisi belakang).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowSlotEditor(prev => !prev)}
                  className={`px-2.5 py-1.5 rounded border font-semibold text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    showSlotEditor
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{showSlotEditor ? 'Tutup Editor Sesi' : 'Edit Slot Hari & Mapel'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    exportExcelMatriksJadwalPengawas(items, activeJadwalSlots)
                  }
                  className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export Matriks</span>
                </button>

                <button
                  type="button"
                  onClick={() => matriksExcelInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Impor Matriks Excel</span>
                </button>
                <input
                  ref={matriksExcelInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportMatriksExcel}
                />

                <button
                  type="button"
                  onClick={() => handleMuatJadwalPengawas(true)}
                  className="px-2.5 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] flex items-center gap-1 whitespace-nowrap shrink-0"
                  title="Muat ulang seluruh matriks 33 pengawas × 16 sesi sesuai format resmi & cocokkan DB GTK"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Muat Matriks Bawaan (33 Guru)</span>
                </button>
              </div>
            </div>

            {/* Card Back Display Controls & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.tampilkanJadwalDiKartuPengawas !== false}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        tampilkanJadwalDiKartuPengawas: e.target.checked
                      })
                    }
                    className="rounded border-slate-300 text-teal-600"
                  />
                  <span>Tampilkan Jadwal Mengawas Otomatis di Sisi Belakang Kartu Pengawas</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-600">Tampilan Belakang:</span>
                  <select
                    value={settings.modeTampilanBelakangPengawas || 'jadwal_dan_tatib'}
                    disabled={settings.tampilkanJadwalDiKartuPengawas === false}
                    onChange={e =>
                      onUpdateSettings({
                        ...settings,
                        modeTampilanBelakangPengawas: e.target.value as
                          | 'jadwal_dan_tatib'
                          | 'jadwal_saja'
                          | 'tatib_saja'
                      })
                    }
                    className="px-2 py-1 border border-slate-300 rounded bg-white text-[11px] font-semibold disabled:opacity-50"
                  >
                    <option value="jadwal_dan_tatib">Tabel Jadwal + Tata Tertib Ringkas</option>
                    <option value="jadwal_saja">Fokus Tabel Jadwal Lengkap + Keterangan</option>
                    <option value="tatib_saja">Tata Tertib Saja</option>
                  </select>
                </div>
              </div>

              <div className="relative min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={jadwalSearch}
                  onChange={e => setJadwalSearch(e.target.value)}
                  placeholder="Filter nama / no. tugas pengawas..."
                  className="w-full pl-8 pr-3 py-1 text-[11px] border border-slate-300 rounded bg-white"
                />
              </div>
            </div>

            {/* Collapsible Slot Metadata Editor */}
            {showSlotEditor && (
              <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/40 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-teal-950 text-[11px] uppercase tracking-wide">
                    Konfigurasi {activeJadwalSlots.length} Slot Hari, Tanggal, Jam & Mapel Ujian
                  </div>
                  <button
                    type="button"
                    onClick={handleAddJadwalSlot}
                    className="px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Slot Sesi</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-[260px] overflow-y-auto pr-1">
                  {activeJadwalSlots.map((slot, sIdx) => (
                    <div
                      key={slot.id}
                      className="p-2 rounded border border-teal-200 bg-white space-y-1 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-1 font-bold text-slate-800">
                        <span className="font-mono text-teal-800">Slot #{sIdx + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveJadwalSlot(slot.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Hapus slot sesi ini"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={slot.hari}
                          onChange={e => handleUpdateSlotMeta(slot.id, { hari: e.target.value })}
                          placeholder="Hari"
                          className="px-1.5 py-0.5 border border-slate-300 rounded text-[11px]"
                        />
                        <input
                          type="text"
                          value={slot.tanggal}
                          onChange={e => handleUpdateSlotMeta(slot.id, { tanggal: e.target.value })}
                          placeholder="Tanggal"
                          className="px-1.5 py-0.5 border border-slate-300 rounded text-[11px] font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={slot.waktu}
                          onChange={e => handleUpdateSlotMeta(slot.id, { waktu: e.target.value })}
                          placeholder="Waktu"
                          className="px-1.5 py-0.5 border border-slate-300 rounded text-[11px] font-mono"
                        />
                        <input
                          type="text"
                          value={slot.sesiLabel}
                          onChange={e =>
                            handleUpdateSlotMeta(slot.id, { sesiLabel: e.target.value })
                          }
                          placeholder="Sesi 1 / Sesi 2"
                          className="px-1.5 py-0.5 border border-slate-300 rounded text-[11px] font-semibold"
                        />
                      </div>
                      <input
                        type="text"
                        value={slot.mapel}
                        onChange={e => handleUpdateSlotMeta(slot.id, { mapel: e.target.value })}
                        placeholder="Mata Pelajaran"
                        className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-[11px] font-semibold uppercase"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Suggestion Datalist */}
            <datalist id="jadwal-tugas-suggestions">
              {Array.from({ length: 22 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)} />
              ))}
              <option value="LABKOM" />
              <option value="ABM 1" />
              <option value="ABM 2" />
              <option value="ABM 3" />
              <option value="ABM 4" />
              <option value="CAD 1" />
              <option value="CAD 2" />
              <option value="CAD 3" />
              <option value="CAD 4" />
              <option value="CAD 5" />
              <option value="CAD 6" />
              <option value="OFF" />
            </datalist>

            {/* Interactive Sticky-Left Matrix Table */}
            <div className="border border-slate-300 rounded-lg overflow-auto max-h-[460px] bg-white">
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-900">
                  <tr>
                    <th
                      rowSpan={5}
                      className="sticky left-0 z-30 bg-slate-900 text-white border border-slate-400 px-2 py-1 text-center w-9 align-middle"
                    >
                      No
                    </th>
                    <th
                      rowSpan={5}
                      className="sticky left-9 z-30 bg-slate-900 text-white border border-slate-400 px-2.5 py-1 text-left min-w-[215px] align-middle"
                    >
                      Nama Pengawas
                    </th>
                    {activeJadwalSlots.map(s => (
                      <th
                        key={`h-hari-${s.id}`}
                        className="border border-slate-400 px-1 py-0.5 text-center font-bold bg-slate-100 min-w-[74px]"
                      >
                        {s.hari}
                      </th>
                    ))}
                    <th
                      rowSpan={5}
                      className="border border-slate-400 px-2 py-1 text-center font-bold bg-slate-900 text-white align-middle"
                    >
                      JAGA
                    </th>
                    <th
                      rowSpan={5}
                      className="border border-slate-400 px-2 py-1 text-center font-bold bg-amber-300 text-slate-950 align-middle"
                    >
                      CAD
                    </th>
                    <th
                      rowSpan={5}
                      className="border border-slate-400 px-2 py-1 text-center font-bold bg-slate-700 text-white align-middle"
                    >
                      OFF
                    </th>
                  </tr>
                  <tr>
                    {activeJadwalSlots.map(s => (
                      <th
                        key={`h-tgl-${s.id}`}
                        className="border border-slate-400 px-1 py-0.5 text-center font-bold font-mono text-[10px] bg-white"
                      >
                        {s.tanggal}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {activeJadwalSlots.map(s => (
                      <th
                        key={`h-wkt-${s.id}`}
                        className="border border-slate-400 px-1 py-0.5 text-center font-medium font-mono text-[9.5px] bg-slate-50"
                      >
                        {s.waktu}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {activeJadwalSlots.map(s => (
                      <th
                        key={`h-mpl-${s.id}`}
                        className="border border-slate-400 px-1 py-1 text-center font-bold text-[9px] leading-tight bg-white max-w-[82px]"
                        title={s.mapel}
                      >
                        <div className="line-clamp-2">{s.mapel}</div>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {activeJadwalSlots.map(s => (
                      <th
                        key={`h-ses-${s.id}`}
                        className="border border-slate-400 px-1 py-0.5 text-center font-bold text-[9.5px] bg-teal-50 text-teal-900"
                      >
                        {s.sesiLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPengawasMatrix.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeJadwalSlots.length + 5}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Belum ada Pengawas. Klik <strong>Muat Matriks Bawaan (33 Guru)</strong> di
                        atas.
                      </td>
                    </tr>
                  ) : (
                    filteredPengawasMatrix.map((pgw, rIdx) => {
                      const sum = summarizePengawasSchedule(pgw.jadwalMengawas, activeJadwalSlots);
                      return (
                        <tr key={`mtx-${pgw.id}`} className="hover:bg-blue-50/40">
                          <td className="sticky left-0 z-10 bg-slate-50 border border-slate-300 px-2 py-1 text-center font-mono font-bold text-slate-700 tabular-nums">
                            {rIdx + 1}
                          </td>
                          <td className="sticky left-9 z-10 bg-white border border-slate-300 px-2.5 py-1 font-semibold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate max-w-[185px]" title={pgw.nama}>
                                {pgw.nama}
                              </span>
                              <span className="text-[9.5px] font-mono text-slate-400">
                                {pgw.nomorTugas}
                              </span>
                            </div>
                          </td>
                          {activeJadwalSlots.map(slot => {
                            const val = pgw.jadwalMengawas?.[slot.id] || '';
                            const kind = classifyAssignment(val);
                            const cellClass =
                              kind === 'cad'
                                ? 'bg-amber-300 text-slate-950 font-bold'
                                : kind === 'off'
                                ? 'bg-slate-600 text-white font-bold'
                                : 'bg-white text-slate-900 font-semibold';
                            return (
                              <td
                                key={`cell-${pgw.id}-${slot.id}`}
                                className={`border border-slate-300 p-0 ${cellClass}`}
                              >
                                <input
                                  type="text"
                                  list="jadwal-tugas-suggestions"
                                  value={val}
                                  onChange={e =>
                                    handleUpdateJadwalCell(pgw.id, slot.id, e.target.value)
                                  }
                                  className={`w-full px-1 py-1 text-center bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-[10.5px] font-mono ${
                                    kind === 'off' ? 'text-white' : 'text-slate-950'
                                  }`}
                                  placeholder="-"
                                />
                              </td>
                            );
                          })}
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold text-slate-900 bg-slate-50 tabular-nums">
                            {sum.jaga}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold text-amber-900 bg-amber-50 tabular-nums">
                            {sum.cad}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold text-slate-700 bg-slate-100 tabular-nums">
                            {sum.off}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {pengawasOnlyItems.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold text-slate-900">
                    <tr>
                      <td className="sticky left-0 z-10 bg-slate-200 border border-slate-400 px-2 py-1.5" />
                      <td className="sticky left-9 z-10 bg-slate-200 border border-slate-400 px-2.5 py-1.5 text-[10.5px] uppercase tracking-wide">
                        TOTAL CADANGAN GURU / SESI
                      </td>
                      {activeJadwalSlots.map(s => (
                        <td
                          key={`tot-${s.id}`}
                          className="border border-slate-400 px-1 py-1.5 text-center font-mono tabular-nums bg-amber-100 text-amber-950"
                        >
                          {slotTotals[s.id]?.cad ?? 0}
                        </td>
                      ))}
                      <td
                        colSpan={3}
                        className="border border-slate-400 px-2 py-1.5 text-center text-[10px] text-slate-600"
                      >
                        {pengawasOnlyItems.length} Pengawas
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Back Side Tata Tertib */}
        {activeConfigTab === 'tatib' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="border border-rose-200 bg-rose-50/30 rounded-lg p-3 space-y-2">
              <div className="font-bold text-rose-900">
                Tugas & Tata Tertib Panitia (Sisi Belakang Kartu)
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTatibPanitia}
                  onChange={e => setNewTatibPanitia(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTatibPanitia.trim()) {
                      onUpdateSettings({
                        ...settings,
                        tataTertibPanitia: [...settings.tataTertibPanitia, newTatibPanitia.trim()]
                      });
                      setNewTatibPanitia('');
                    }
                  }}
                  placeholder="Tambah poin tugas panitia..."
                  className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTatibPanitia.trim()) return;
                    onUpdateSettings({
                      ...settings,
                      tataTertibPanitia: [...settings.tataTertibPanitia, newTatibPanitia.trim()]
                    });
                    setNewTatibPanitia('');
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 text-white rounded font-semibold"
                >
                  Tambah
                </button>
              </div>
              <ul className="space-y-1">
                {settings.tataTertibPanitia.map((poin, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-2 bg-white border border-slate-200 rounded px-2.5 py-1.5"
                  >
                    <span>
                      {idx + 1}. {poin}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          tataTertibPanitia: settings.tataTertibPanitia.filter((_, i) => i !== idx)
                        })
                      }
                      className="text-rose-600 hover:text-rose-800 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-emerald-200 bg-emerald-50/30 rounded-lg p-3 space-y-2">
              <div className="font-bold text-emerald-900">
                Tugas & Tata Tertib Pengawas Ruang (Sisi Belakang Kartu)
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTatibPengawas}
                  onChange={e => setNewTatibPengawas(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTatibPengawas.trim()) {
                      onUpdateSettings({
                        ...settings,
                        tataTertibPengawas: [...settings.tataTertibPengawas, newTatibPengawas.trim()]
                      });
                      setNewTatibPengawas('');
                    }
                  }}
                  placeholder="Tambah poin tata tertib pengawas..."
                  className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTatibPengawas.trim()) return;
                    onUpdateSettings({
                      ...settings,
                      tataTertibPengawas: [...settings.tataTertibPengawas, newTatibPengawas.trim()]
                    });
                    setNewTatibPengawas('');
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 text-white rounded font-semibold"
                >
                  Tambah
                </button>
              </div>
              <ul className="space-y-1">
                {settings.tataTertibPengawas.map((poin, idx) => (
                  <li
                    key={idx}
                    className="flex items-start justify-between gap-2 bg-white border border-slate-200 rounded px-2.5 py-1.5"
                  >
                    <span>
                      {idx + 1}. {poin}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          tataTertibPengawas: settings.tataTertibPengawas.filter(
                            (_, i) => i !== idx
                          )
                        })
                      }
                      className="text-rose-600 hover:text-rose-800 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 4: Signatures, Stamps & QR */}
        {activeConfigTab === 'ttd' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="border border-slate-200 rounded-lg p-3 space-y-2.5">
              <label className="flex items-center justify-between font-bold text-slate-800">
                <span>Tanda Tangan Kepala Sekolah</span>
                <input
                  type="checkbox"
                  checked={settings.showTtdKs}
                  onChange={e => onUpdateSettings({ ...settings, showTtdKs: e.target.checked })}
                />
              </label>
              <div className="h-16 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center p-1">
                {effectiveTtdUrl ? (
                  <img src={effectiveTtdUrl} alt="TTD KS" className="max-h-14 object-contain" />
                ) : (
                  <KepalaSekolahSignatureSvg className="w-28 h-12" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 text-center py-1.5 bg-slate-900 hover:bg-black text-white rounded cursor-pointer font-semibold">
                  Unggah TTD PNG
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleSignAssetUpload('ttdKsUrl', e.target.files?.[0])}
                  />
                </label>
                {settings.ttdKsUrl && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, ttdKsUrl: '' })}
                    className="p-1.5 border border-slate-300 rounded text-slate-600 hover:text-rose-600"
                    title="Reset TTD"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 space-y-2.5">
              <label className="flex items-center justify-between font-bold text-slate-800">
                <span>Stempel Resmi Sekolah</span>
                <input
                  type="checkbox"
                  checked={settings.showStempel}
                  onChange={e => onUpdateSettings({ ...settings, showStempel: e.target.checked })}
                />
              </label>
              <div className="h-16 border border-dashed border-slate-300 rounded bg-slate-50 flex items-center justify-center p-1">
                {effectiveStempelUrl ? (
                  <img src={effectiveStempelUrl} alt="Stempel" className="max-h-14 object-contain" />
                ) : (
                  <SchoolStampSvg className="w-14 h-14" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex-1 text-center py-1.5 bg-slate-900 hover:bg-black text-white rounded cursor-pointer font-semibold">
                  Unggah Stempel PNG
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleSignAssetUpload('stempelUrl', e.target.files?.[0])}
                  />
                </label>
                {settings.stempelUrl && (
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, stempelUrl: '' })}
                    className="p-1.5 border border-slate-300 rounded text-slate-600 hover:text-rose-600"
                    title="Reset Stempel"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="font-bold text-slate-800">Pengaturan QR / Barcode Petugas</div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Kode</label>
                <select
                  value={settings.jenisBarcode}
                  onChange={e =>
                    onUpdateSettings({
                      ...settings,
                      jenisBarcode: e.target.value as 'qr_link' | 'barcode_1d' | 'gambar_url'
                    })
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white"
                >
                  <option value="qr_link">QR Code Verifikasi (Otomatis)</option>
                  <option value="barcode_1d">Barcode 1D Batang</option>
                  <option value="gambar_url">Gambar Barcode URL</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Link QR</label>
                <input
                  type="text"
                  value={settings.barcodeLinkTemplate}
                  onChange={e =>
                    onUpdateSettings({ ...settings, barcodeLinkTemplate: e.target.value })
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Placeholder: <code>{'{nomorTugas}'}</code>, <code>{'{nip}'}</code>,{' '}
                  <code>{'{nama}'}</code>, <code>{'{kategori}'}</code>, <code>{'{ruang}'}</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Table Management (Hidden on Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Category Pills */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {[
                  { id: 'all', label: `Semua (${stats.total})` },
                  { id: 'panitia', label: `Panitia (${stats.panitia})` },
                  { id: 'pengawas', label: `Pengawas (${stats.pengawas})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterKategori(tab.id as any)}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      filterKategori === tab.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NIP, no. tugas, jabatan, ruang..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAddManualRow('panitia')}
                className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-md flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Panitia</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddManualRow('pengawas')}
                className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Pengawas</span>
              </button>

              <button
                type="button"
                onClick={() => openJabatanModal(filterKategori === 'pengawas' ? 'pengawas' : 'panitia')}
                className="px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md flex items-center gap-1"
                title="Kelola, ubah, tambah, atau reset daftar jenis jabatan default Panitia & Pengawas"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Edit Jenis Jabatan</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
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
                Massal Semua ({filteredItems.length})
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('selected')}
                className={`px-2.5 py-1 rounded border font-semibold ${
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
                  if (!individualPrintId && (filteredItems[0] || items[0])) {
                    setIndividualPrintId((filteredItems[0] || items[0]).id);
                  }
                  setPrintMode('individual');
                  setPreviewOutputMode('kartu');
                }}
                className={`px-2.5 py-1 rounded border font-semibold ${
                  printMode === 'individual'
                    ? 'bg-slate-900 text-amber-400 border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Individu (1 Orang)
              </button>
              {printMode === 'individual' && items.length > 0 && (
                <select
                  value={individualPrintId || filteredItems[0]?.id || items[0]?.id || ''}
                  onChange={e => setIndividualPrintId(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded bg-white font-semibold max-w-[200px]"
                >
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.nomorTugas} — {it.nama}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Quick Multi-Session Toolbar + Inline Add & Delete Session */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1 mr-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Set Sesi ({selectedIds.length > 0 ? `${selectedIds.length} terpilih` : 'semua tampil'}):</span>
              </span>
              <button
                type="button"
                onClick={() => handleBatchApplySession('Semua Sesi')}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-black text-amber-400 font-bold text-[11px]"
              >
                Semua Sesi
              </button>
              {availableSesiOptions.map((sesi, sIdx) => (
                <div
                  key={sesi}
                  className="inline-flex items-center rounded border border-blue-200 bg-blue-50 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => handleBatchApplySession(sesi)}
                    title={`Terapkan "${sesi}"`}
                    className="px-2 py-1 hover:bg-blue-100 text-blue-900 font-semibold text-[11px] transition-colors"
                  >
                    {getShortSessionLabel(sesi, sIdx)}: {sesi}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSessionOption(sesi)}
                    title={`Hapus sesi "${sesi}"`}
                    className="px-1.5 py-1 border-l border-blue-200 text-blue-500 hover:text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newSesiDraft}
                onChange={e => setNewSesiDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSessionOption();
                  }
                }}
                placeholder="Tambah sesi baru..."
                className="w-44 px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
              />
              <button
                type="button"
                onClick={handleAddSessionOption}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-[11px] flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-amber-400" />
                <span>Tambah</span>
              </button>
              <button
                type="button"
                onClick={handleResetDefaultSessionOptions}
                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded font-semibold text-[11px] flex items-center gap-1"
                title="Reset ke 3 sesi bawaan"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
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
                    title="Pilih semua"
                  >
                    {filteredItems.length > 0 &&
                    filteredItems.every(i => selectedIds.includes(i.id)) ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2.5 w-16">Foto</th>
                <th className="px-3 py-2.5 w-28">Kategori</th>
                <th className="px-3 py-2.5 w-32">No. Tugas</th>
                <th className="px-3 py-2.5 min-w-[200px]">Nama & NIP Petugas</th>
                <th className="px-3 py-2.5 min-w-[200px]">
                  <div className="flex items-center justify-between gap-1.5">
                    <span>Jabatan / Peran Ujian</span>
                    <button
                      type="button"
                      onClick={() =>
                        openJabatanModal(filterKategori === 'pengawas' ? 'pengawas' : 'panitia')
                      }
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-indigo-600 text-amber-300 hover:text-white text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Edit / tambah / reset jenis jabatan default"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>Edit Jenis</span>
                    </button>
                  </div>
                </th>
                <th className="px-3 py-2.5 w-36">Ruang Tugas</th>
                <th className="px-3 py-2.5 w-40">Sesi / Waktu</th>
                <th className="px-3 py-2.5 w-12 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Belum ada data Panitia atau Pengawas. Klik{' '}
                    <strong>Ambil dari Guru & Tendik</strong> atau tombol tambah di atas.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isSelected = selectedIds.includes(item.id);
                  const photoSrc = resolveDirectImageUrl(item.fotoUrl);
                  return (
                    <tr
                      key={item.id}
                      className={isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'}
                    >
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(item.id)}
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
                        <div className="flex items-center gap-1">
                          <label
                            className="w-8 h-10 rounded border border-slate-300 bg-slate-100 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 shrink-0"
                            title="Unggah pas foto 3x4"
                          >
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt={item.nama}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleSinglePhotoUpload(item.id, e.target.files?.[0])}
                            />
                          </label>
                          {item.fotoUrl && (
                            <button
                              type="button"
                              onClick={() => handleUpdateField(item.id, 'fotoUrl', '')}
                              className="text-slate-400 hover:text-rose-600"
                              title="Hapus foto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 space-y-1">
                        <select
                          value={item.kategori}
                          onChange={e =>
                            handleUpdateField(
                              item.id,
                              'kategori',
                              e.target.value as PanitiaPengawasRole
                            )
                          }
                          className={`w-full px-2 py-1 rounded border font-bold text-[11px] ${
                            item.kategori === 'panitia'
                              ? 'bg-rose-50 border-rose-300 text-rose-900'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          }`}
                        >
                          <option value="panitia">PANITIA</option>
                          <option value="pengawas">PENGAWAS</option>
                        </select>
                        <div className="flex justify-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                              item.sourceType === 'guru'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : item.sourceType === 'tendik'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {item.sourceType === 'guru'
                              ? 'DB Guru'
                              : item.sourceType === 'tendik'
                              ? 'DB Tendik'
                              : 'Manual'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.nomorTugas}
                          onChange={e => handleUpdateField(item.id, 'nomorTugas', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono font-semibold text-slate-900 bg-white"
                        />
                      </td>
                      <td className="px-3 py-2 space-y-1">
                        <input
                          type="text"
                          value={item.nama}
                          onChange={e => handleUpdateField(item.id, 'nama', e.target.value)}
                          className="w-full px-2 py-0.5 border border-slate-300 rounded font-bold text-slate-900 bg-white"
                          placeholder="Nama lengkap & gelar"
                        />
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={item.nip || ''}
                            onChange={e => handleUpdateField(item.id, 'nip', e.target.value)}
                            className="flex-1 px-2 py-0.5 border border-slate-200 rounded font-mono text-[11px] text-slate-600 bg-white"
                            placeholder="NIP / NUPTK"
                          />
                          <input
                            type="text"
                            value={item.unitAsal || ''}
                            onChange={e => handleUpdateField(item.id, 'unitAsal', e.target.value)}
                            className="w-28 px-2 py-0.5 border border-slate-200 rounded text-[11px] text-slate-600 bg-white"
                            placeholder="Unit / Mapel"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {(() => {
                          const roleOptions =
                            item.kategori === 'panitia'
                              ? availableJabatanPanitia
                              : availableJabatanPengawas;
                          const hasCustomLegacy =
                            Boolean(item.jabatanKepanitiaan?.trim()) &&
                            !roleOptions.includes(item.jabatanKepanitiaan);
                          return (
                            <select
                              value={item.jabatanKepanitiaan}
                              onChange={e =>
                                handleUpdateField(item.id, 'jabatanKepanitiaan', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded font-semibold text-slate-800 bg-white text-[11px]"
                            >
                              {hasCustomLegacy && (
                                <option value={item.jabatanKepanitiaan}>
                                  {item.jabatanKepanitiaan}
                                </option>
                              )}
                              {roleOptions.map(opt => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.ruangTugas || ''}
                          onChange={e => handleUpdateField(item.id, 'ruangTugas', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-slate-900 bg-white"
                          placeholder="R.01 / Sekretariat"
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[210px]">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleItemSession(item, 'Semua Sesi')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                /^semua\s*sesi$/i.test((item.sesiTugas || '').trim())
                                  ? 'bg-slate-900 text-amber-400 border-slate-900'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                              }`}
                              title="Aktif semua sesi ujian"
                            >
                              Semua
                            </button>
                            {availableSesiOptions.map((sesi, sIdx) => {
                              const selectedList = parseSelectedSessions(
                                item.sesiTugas,
                                availableSesiOptions
                              );
                              const isChecked = selectedList.some(
                                s => s.toLowerCase() === sesi.toLowerCase()
                              );
                              return (
                                <button
                                  key={sesi}
                                  type="button"
                                  onClick={() => handleToggleItemSession(item, sesi)}
                                  title={`${sesi} (klik untuk pilih/tambah sesi berikutnya)`}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                    isChecked
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'
                                  }`}
                                >
                                  {getShortSessionLabel(sesi, sIdx)}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={item.sesiTugas || ''}
                              onChange={e => handleUpdateField(item.id, 'sesiTugas', e.target.value)}
                              className="flex-1 min-w-0 px-2 py-0.5 border border-slate-300 rounded text-[11px] text-slate-800 bg-white"
                              placeholder="Semua Sesi / Sesi 1 + Sesi 2"
                            />
                            {item.sesiTugas && (
                              <button
                                type="button"
                                onClick={() => handleUpdateField(item.id, 'sesiTugas', '')}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 shrink-0"
                                title="Hapus / kosongkan sesi petugas ini"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {item.kategori === 'pengawas' && item.jadwalMengawas && (
                            <div className="flex items-center justify-between gap-1.5 pt-0.5">
                              {(() => {
                                const sum = summarizePengawasSchedule(
                                  item.jadwalMengawas,
                                  activeJadwalSlots
                                );
                                return (
                                  <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5 tabular-nums">
                                    {sum.jaga} Jaga · {sum.cad} CAD · {sum.off} OFF
                                  </span>
                                );
                              })()}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setScanPreviewProctorId(item.id)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-bold text-emerald-800"
                                  title="Buka pintasan jadwal QR & zoom jelas"
                                >
                                  <QrCode className="w-3 h-3" />
                                  <span>QR &amp; Zoom</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveConfigTab('jadwal')}
                                  className="text-[10px] font-bold text-blue-700 hover:underline shrink-0"
                                >
                                  Edit Matriks
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handlePrintIndividualItem(item)}
                            className={`px-2 py-1 rounded border text-[10.5px] font-bold flex items-center gap-1 transition-colors ${
                              printMode === 'individual' && individualPrintId === item.id
                                ? 'bg-slate-900 text-amber-400 border-slate-900'
                                : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                            }`}
                            title="Cetak individu (khusus 1 petugas ini saja)"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Cetak 1</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ================= PRINT & LIVE PREVIEW AREA ================= */}
      {(() => {
        const {
          paperBase,
          isLandscape,
          paperWidthMm,
          paperHeightMm,
          cssPageSize,
          cols,
          rowsPerPage,
          marginMm,
          gapMm,
          availWidthMm,
          availHeightMm,
          autoCardWidthMm,
          autoCardHeightMm
        } = computePanitiaPaperGeometry(settings);

        const resolveCardDim = (kategori: PanitiaPengawasRole) => {
          const w =
            kategori === 'panitia'
              ? (isValidCardMm(settings.lebarKartuPanitiaMm, 40)
                  ? settings.lebarKartuPanitiaMm
                  : undefined) ??
                (isValidCardMm(settings.lebarKartuMm, 40) ? settings.lebarKartuMm : undefined) ??
                autoCardWidthMm
              : (isValidCardMm(settings.lebarKartuPengawasMm, 40)
                  ? settings.lebarKartuPengawasMm
                  : undefined) ??
                (isValidCardMm(settings.lebarKartuMm, 40) ? settings.lebarKartuMm : undefined) ??
                autoCardWidthMm;
          const h =
            kategori === 'panitia'
              ? (isValidCardMm(settings.tinggiKartuPanitiaMm, 35)
                  ? settings.tinggiKartuPanitiaMm
                  : undefined) ??
                (isValidCardMm(settings.tinggiKartuMm, 35) ? settings.tinggiKartuMm : undefined) ??
                autoCardHeightMm
              : (isValidCardMm(settings.tinggiKartuPengawasMm, 35)
                  ? settings.tinggiKartuPengawasMm
                  : undefined) ??
                (isValidCardMm(settings.tinggiKartuMm, 35) ? settings.tinggiKartuMm : undefined) ??
                autoCardHeightMm;
          return { w, h };
        };

        const panitiaDim = resolveCardDim('panitia');
        const pengawasDim = resolveCardDim('pengawas');
        const cardWidthMm =
          filterKategori === 'panitia'
            ? panitiaDim.w
            : filterKategori === 'pengawas'
            ? pengawasDim.w
            : Math.max(panitiaDim.w, pengawasDim.w);
        const cardHeightMm =
          filterKategori === 'panitia'
            ? panitiaDim.h
            : filterKategori === 'pengawas'
            ? pengawasDim.h
            : Math.max(panitiaDim.h, pengawasDim.h);

        const hasDistinctDims =
          filterKategori === 'all' &&
          (panitiaDim.w !== pengawasDim.w || panitiaDim.h !== pengawasDim.h);
        const activeDimLabel = hasDistinctDims
          ? `Panitia ${panitiaDim.w}×${panitiaDim.h} • Pengawas ${pengawasDim.w}×${pengawasDim.h} mm`
          : `${cardWidthMm}×${cardHeightMm} mm`;

        const cutMode = settings.garisPotong || 'dashed_gunting';
        const sisiMode = settings.modeSisiCetak || 'dua_sisi_bergantian';

        const outerCutWrapperClass = `print-card-avoid bg-white relative box-border ${
          cutMode === 'none' ? 'p-0' : 'border border-dashed border-slate-400 p-[3px]'
        }`;
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        };

        const resolveCardAppearance = (kategori: PanitiaPengawasRole) => {
          const themeKey =
            kategori === 'panitia'
              ? settings.temaWarnaPanitia || 'merah'
              : settings.temaWarnaPengawas || 'hijau';
          const customTheme =
            themeKey === 'ai_custom'
              ? kategori === 'panitia'
                ? settings.aiCustomThemePanitia || null
                : settings.aiCustomThemePengawas || null
              : null;
          const presetKey: ThemeKey =
            themeKey === 'ai_custom'
              ? kategori === 'panitia'
                ? 'merah'
                : 'hijau'
              : (themeKey as ThemeKey);
          const palette = THEME_PALETTES[presetKey] || THEME_PALETTES.merah;
          const roleFontOverride =
            kategori === 'panitia'
              ? settings.desainFontPanitia || settings.desainFont
              : settings.desainFontPengawas || settings.desainFont;
          const design = resolveCardDesign({
            themeKey,
            customTheme,
            overrideFont: roleFontOverride,
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

          return { palette, customTheme, design };
        };

        const renderFrontCard = (
          item: PanitiaPengawasItem,
          sideBadge?: string,
          suppressOuterCut?: boolean,
          explicitDim?: { w: number; h: number }
        ) => {
          const { palette, customTheme, design } = resolveCardAppearance(item.kategori);
          const photoSrc = resolveDirectImageUrl(item.fotoUrl);
          const barcodeVal = resolvePetugasBarcodeValue(item);
          const dim = explicitDim || resolveCardDim(item.kategori);
          const { fontScale, tierIdx, isNarrowCard } = getPanitiaCardMetrics(dim.w, dim.h);
          const m = design.fontScaleMultiplier;
          const fs = (sizes: [number, number, number, number]) => scaleCardFontPx(sizes[tierIdx], m);

          return (
            <div
              style={
                suppressOuterCut
                  ? { height: '100%', width: '100%', boxSizing: 'border-box' }
                  : { width: `${dim.w}mm`, height: `${dim.h}mm`, boxSizing: 'border-box' }
              }
              className={
                suppressOuterCut
                  ? 'print-card-avoid bg-white relative w-full h-full box-border p-0'
                  : outerCutWrapperClass
              }
            >
              {!suppressOuterCut && cutMode === 'dashed_gunting' && (
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
                  borderColor: design.outerBorderHex,
                  backgroundImage: design.cardBackgroundCss,
                  fontFamily: design.bodyFontFamily,
                  boxShadow: design.outerEmbossShadowCss
                }}
                className={`card-keep-emboss relative border-[1.5px] ${
                  customTheme ? '' : palette.outerBorder
                } bg-white text-slate-950 h-full w-full box-border overflow-hidden ${fontScale.pad}`}
              >
                <CardBackgroundLayers design={design} profile={profile} />
                <div className="relative z-10 flex flex-col justify-between h-full w-full">
                  <div>
                    {/* Kop Pemprov Jatim */}
                    {settings.tampilkanKop && (
                      <div
                        style={{ borderBottomColor: design.outerBorderHex }}
                        className={`flex items-center ${fontScale.kopGap} border-b-2 ${
                          customTheme ? '' : palette.kopDivider
                        }`}
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
                            style={{ fontSize: fs([8, 7.5, 7, isNarrowCard ? 5.8 : 6.3]) }}
                            className="font-bold tracking-wider uppercase text-slate-900"
                          >
                            PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN
                          </div>
                          <div
                            style={{
                              fontFamily: design.headingFontFamily,
                              fontSize: fs([12.5, 11, 10.2, isNarrowCard ? 8.4 : 9.2]),
                              fontWeight: design.headingFontWeightCss,
                              letterSpacing: design.headingLetterSpacingCss,
                              textTransform: design.headingTextTransformCss
                            }}
                            className="tracking-wide text-slate-950"
                          >
                            {profile.namaSekolah}
                          </div>
                          <div
                            style={{ fontSize: fs([8, 7.2, 6.8, isNarrowCard ? 5.4 : 6]) }}
                            className="text-slate-800 font-medium truncate"
                          >
                            Jalan Wijayakusuma Nomor 48, Surabaya • Telp. {profile.telepon}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Category Banner */}
                    <div
                      style={{
                        background: design.bannerBackgroundCss,
                        color: design.bannerTextHex,
                        borderBottom:
                          design.embossStyle !== 'flat_clean'
                            ? `1.5px solid ${design.foilHex}`
                            : undefined
                      }}
                      className={`${
                        settings.tampilkanKop ? fontScale.bannerPad : 'px-2 py-1'
                      } flex items-center justify-between gap-1`}
                    >
                      <span
                        style={{
                          color: design.accentTextHex,
                          fontFamily: design.headingFontFamily,
                          fontSize: fs([10.5, 9.5, 8.8, isNarrowCard ? 7 : 7.8]),
                          fontWeight: design.headingFontWeightCss,
                          letterSpacing: design.headingLetterSpacingCss,
                          textTransform: design.headingTextTransformCss,
                          textShadow: design.headingEmbossTextShadow
                        }}
                        className="truncate"
                      >
                        {item.kategori === 'panitia'
                          ? settings.judulKartuPanitia
                          : settings.judulKartuPengawas}
                      </span>
                      <span
                        style={{ fontSize: fs([8.5, 7.8, 7.2, isNarrowCard ? 5.8 : 6.5]) }}
                        className="font-semibold truncate max-w-[46%]"
                      >
                        {settings.semester} • {settings.tahunPelajaran}
                      </span>
                    </div>
                    <div
                      style={{
                        background: design.subBannerBackgroundCss,
                        color: design.subBannerTextHex,
                        borderColor: design.outerBorderHex,
                        fontSize: fs([9, 8.2, 7.6, isNarrowCard ? 6.3 : 6.8]),
                        textTransform: design.headingTextTransformCss
                      }}
                      className="text-center py-0.5 font-bold tracking-wide border-x border-b truncate px-1"
                    >
                      {settings.namaUjian}
                    </div>

                    {/* Photo & Petugas Identity */}
                    <div className={`flex items-start ${fontScale.bodyGap}`}>
                      {settings.tampilkanFoto && (
                        <div
                          className={`shrink-0 border border-slate-800 bg-white/95 flex flex-col items-center justify-center overflow-hidden ${fontScale.photo}`}
                        >
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={item.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center px-1 text-[7.5px] font-semibold text-slate-500 leading-tight">
                              PAS FOTO
                              <div className="text-[9px] font-bold text-slate-700 mt-0.5">3 x 4</div>
                            </div>
                          )}
                        </div>
                      )}

                      <table
                        style={{
                          fontSize: fs([10.5, 9.5, 9, isNarrowCard ? 7.2 : 8]),
                          lineHeight: 1.24
                        }}
                        className="flex-1 border-collapse min-w-0"
                      >
                        <tbody>
                          <tr>
                            <td className={`py-[1.5px] pr-1 text-slate-800 font-semibold ${fontScale.infoLabelW} align-top whitespace-nowrap`}>
                              No. Tugas
                            </td>
                            <td className="py-[1.5px] pr-1 align-top font-semibold text-slate-900">:</td>
                            <td className="py-[1.5px] font-extrabold font-mono text-slate-950 tabular-nums">
                              {item.nomorTugas}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-[1.5px] pr-1 text-slate-800 font-semibold align-top">Nama</td>
                            <td className="py-[1.5px] pr-1 align-top font-semibold text-slate-900">:</td>
                            <td
                              style={{ fontWeight: design.bodyStrongFontWeightCss }}
                              className="py-[1.5px] text-slate-950 leading-tight line-clamp-2"
                            >
                              {item.nama}
                            </td>
                          </tr>
                          {settings.tampilkanNip && (
                            <tr>
                              <td className="py-[1.5px] pr-1 text-slate-800 font-semibold align-top">NIP</td>
                              <td className="py-[1.5px] pr-1 align-top font-semibold text-slate-900">:</td>
                              <td className="py-[1.5px] font-mono font-semibold tabular-nums text-slate-900">
                                {item.nip || '-'}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td className="py-[1.5px] pr-1 text-slate-800 font-semibold align-top">Jabatan</td>
                            <td className="py-[1.5px] pr-1 align-top font-semibold text-slate-900">:</td>
                            <td
                              style={{
                                fontFamily: design.headingFontFamily,
                                fontSize: fs([11, 10, 9.5, isNarrowCard ? 7.6 : 8.4]),
                                fontWeight: design.headingFontWeightCss
                              }}
                              className="py-[1.5px] uppercase text-slate-950 leading-tight"
                            >
                              {item.jabatanKepanitiaan}
                            </td>
                          </tr>
                          {settings.tampilkanRuang && (
                            <tr>
                              <td className="py-[1.5px] pr-1 text-slate-800 font-semibold align-top">
                                {item.kategori === 'pengawas' ? 'R. Tugas' : 'Lokasi'}
                              </td>
                              <td className="py-[1.5px] pr-1 align-top font-semibold text-slate-900">:</td>
                              <td className="py-[1.5px] font-bold text-slate-950">
                                {item.ruangTugas || '-'}
                              </td>
                            </tr>
                          )}
                          {settings.tampilkanSesi && item.sesiTugas && (
                            <tr>
                              <td className="py-[1.5px] pr-1 text-slate-800 font-semibold align-top">Sesi</td>
                              <td className="py-[1.5px] pr-1 align-top font-semibold text-slate-900">:</td>
                              <td className="py-[1.5px] font-semibold text-slate-900 leading-tight line-clamp-2">
                                {item.sesiTugas}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer: SK + QR + Kepala Sekolah Signature */}
                  <div
                    className={`${fontScale.footerTop} border-t border-slate-300/90 flex items-end justify-between gap-2`}
                  >
                    <div className="flex items-end gap-1.5 flex-1 min-w-0">
                      {settings.tampilkanBarcode && (
                        <div className="bg-white/95 p-0.5 rounded-[2px] border border-slate-200/80 shrink-0">
                          <ExamCardBarcode
                            value={barcodeVal}
                            mode={settings.jenisBarcode}
                            size={fontScale.barcode}
                          />
                        </div>
                      )}
                      <div
                        style={{ fontSize: fs([8, 7.4, 7, isNarrowCard ? 5.6 : 6.2]) }}
                        className="text-slate-800 leading-tight min-w-0"
                      >
                        {settings.nomorSkPanitia && (
                          <div className="font-mono font-bold text-slate-900 truncate">
                            SK: {settings.nomorSkPanitia}
                          </div>
                        )}
                        <div className="line-clamp-2 text-slate-700 mt-0.5">
                          {item.kategori === 'panitia'
                            ? settings.catatanPanitia
                            : settings.catatanPengawas}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{ fontSize: fs([9, 8.2, 7.6, isNarrowCard ? 6.2 : 6.8]) }}
                      className="text-left shrink-0 relative min-w-[96px]"
                    >
                      <div className="leading-tight font-medium text-slate-900">
                        <div>{settings.kotaTanggalCetak}</div>
                        <div className="font-semibold">Kepala Sekolah,</div>
                      </div>
                      <div className={`relative ${fontScale.ttdArea} flex items-center`}>
                        {settings.showStempel && (
                          <div
                            className={`absolute -left-5 -top-1 opacity-85 pointer-events-none ${fontScale.stampSize}`}
                          >
                            {effectiveStempelUrl ? (
                              <img
                                src={effectiveStempelUrl}
                                alt="Stempel"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <SchoolStampSvg className="w-full h-full" />
                            )}
                          </div>
                        )}
                        {settings.showTtdKs &&
                          (effectiveTtdUrl ? (
                            <img
                              src={effectiveTtdUrl}
                              alt="TTD Kepala Sekolah"
                              className={`${fontScale.ttdImg} object-contain relative z-10`}
                            />
                          ) : (
                            <KepalaSekolahSignatureSvg className={`${fontScale.ttdSvg} relative z-10`} />
                          ))}
                      </div>
                      <div className="leading-tight relative z-10 text-slate-950">
                        <div
                          style={{
                            fontSize: fs([10, 9.2, 8.5, isNarrowCard ? 6.6 : 7.6]),
                            fontWeight: design.bodyStrongFontWeightCss
                          }}
                          className="underline"
                        >
                          {profile.kepalaSekolah}
                        </div>
                        <div
                          style={{ fontSize: fs([8.5, 7.8, 7.2, isNarrowCard ? 5.6 : 6.3]) }}
                          className="font-mono font-medium text-slate-800"
                        >
                          NIP. {profile.nipKepalaSekolah}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        };

        const renderBackCard = (
          item: PanitiaPengawasItem,
          sideBadge?: string,
          suppressOuterCut?: boolean,
          explicitDim?: { w: number; h: number }
        ) => {
          const { palette, customTheme, design } = resolveCardAppearance(item.kategori);
          const tatibList =
            item.kategori === 'panitia'
              ? settings.tataTertibPanitia
              : settings.tataTertibPengawas;
          const barcodeVal = resolvePetugasBarcodeValue(item);
          const dim = explicitDim || resolveCardDim(item.kategori);
          const { fontScale, tierIdx, isNarrowCard, isShortCard, isVeryShortCard } =
            getPanitiaCardMetrics(dim.w, dim.h);
          const m = design.fontScaleMultiplier;
          const fs = (sizes: [number, number, number, number]) => scaleCardFontPx(sizes[tierIdx], m);

          const hasProctorSchedule =
            item.kategori === 'pengawas' &&
            Boolean(item.jadwalMengawas && Object.keys(item.jadwalMengawas).length > 0);
          const proctorBackMode = settings.modeTampilanBelakangPengawas || 'jadwal_dan_tatib';
          const showAutoScheduleOnBack =
            hasProctorSchedule &&
            settings.tampilkanJadwalDiKartuPengawas !== false &&
            proctorBackMode !== 'tatib_saja';

          const scheduleSummary = showAutoScheduleOnBack
            ? summarizePengawasSchedule(item.jadwalMengawas, activeJadwalSlots)
            : null;
          const examDayGroups = showAutoScheduleOnBack
            ? groupSlotsByExamDay(activeJadwalSlots)
            : [];
          const halfPoint = Math.ceil(examDayGroups.length / 2);
          const leftDayGroups = examDayGroups.slice(0, halfPoint);
          const rightDayGroups = examDayGroups.slice(halfPoint);

          const renderScheduleCellBadge = (slot?: JadwalPengawasSlot) => {
            if (!slot) return <span className="text-slate-400">-</span>;
            const raw = item.jadwalMengawas?.[slot.id];
            const kind = classifyAssignment(raw);
            const label = formatSlotAssignmentShort(raw);
            if (kind === 'cad') {
              return (
                <span className="inline-block w-full px-0.5 py-[0.5px] rounded-[2px] bg-amber-200 text-amber-950 font-bold font-mono text-center">
                  {label}
                </span>
              );
            }
            if (kind === 'off') {
              return (
                <span className="inline-block w-full px-0.5 py-[0.5px] rounded-[2px] bg-slate-600 text-white font-semibold font-mono text-center">
                  OFF
                </span>
              );
            }
            return (
              <span className="inline-block w-full px-0.5 py-[0.5px] rounded-[2px] bg-white text-slate-950 font-extrabold font-mono text-center border border-slate-200">
                {label}
              </span>
            );
          };

          const renderScheduleHalfTable = (days: ReturnType<typeof groupSlotsByExamDay>) => (
            <table
              style={{
                fontSize: fs([
                  7.4,
                  6.9,
                  6.4,
                  isVeryShortCard ? 5.1 : isShortCard ? 5.5 : 5.9
                ]),
                lineHeight: 1.15
              }}
              className="w-full border-collapse bg-white text-slate-950"
            >
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-600 px-1 py-[1.5px] text-left font-bold">
                    Hari/Tgl
                  </th>
                  <th className="border border-slate-600 px-0.5 py-[1.5px] text-center font-bold">
                    Sesi 1
                  </th>
                  <th className="border border-slate-600 px-0.5 py-[1.5px] text-center font-bold">
                    Sesi 2
                  </th>
                </tr>
              </thead>
              <tbody>
                {days.map(dg => (
                  <tr key={`${item.id}-${dg.dayKey}`}>
                    <td className="border border-slate-500 px-1 py-[1px] font-bold text-slate-950 whitespace-nowrap">
                      {dg.shortLabel}
                    </td>
                    <td className="border border-slate-500 p-[1px] text-center">
                      {renderScheduleCellBadge(dg.sesi1)}
                    </td>
                    <td className="border border-slate-500 p-[1px] text-center">
                      {renderScheduleCellBadge(dg.sesi2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );

          return (
            <div
              style={
                suppressOuterCut
                  ? { height: '100%', width: '100%', boxSizing: 'border-box' }
                  : { width: `${dim.w}mm`, height: `${dim.h}mm`, boxSizing: 'border-box' }
              }
              className={
                suppressOuterCut
                  ? 'print-card-avoid bg-white relative w-full h-full box-border p-0'
                  : outerCutWrapperClass
              }
            >
              {!suppressOuterCut && cutMode === 'dashed_gunting' && (
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
                  borderColor: design.outerBorderHex,
                  backgroundImage: design.cardBackgroundCss,
                  fontFamily: design.bodyFontFamily,
                  boxShadow: design.outerEmbossShadowCss
                }}
                className={`card-keep-emboss relative border-[1.5px] ${
                  customTheme ? '' : palette.outerBorder
                } bg-white text-slate-950 h-full w-full box-border overflow-hidden ${fontScale.pad}`}
              >
                <CardBackgroundLayers design={design} profile={profile} />
                <div className="relative z-10 flex flex-col justify-between h-full w-full">
                  <div>
                    <div
                      style={{
                        background: design.bannerBackgroundCss,
                        color: design.bannerTextHex,
                        borderBottom:
                          design.embossStyle !== 'flat_clean'
                            ? `1.5px solid ${design.foilHex}`
                            : undefined
                      }}
                      className="px-2 py-0.5 flex items-center justify-between gap-1"
                    >
                      <span
                        style={{
                          color: design.accentTextHex,
                          fontFamily: design.headingFontFamily,
                          fontSize: fs([9.5, 8.8, 8.2, isNarrowCard ? 6.5 : 7.2]),
                          fontWeight: design.headingFontWeightCss,
                          letterSpacing: design.headingLetterSpacingCss,
                          textTransform: design.headingTextTransformCss,
                          textShadow: design.headingEmbossTextShadow
                        }}
                        className="truncate"
                      >
                        {item.kategori === 'panitia'
                          ? 'TUGAS & TATA TERTIB PANITIA'
                          : showAutoScheduleOnBack
                          ? proctorBackMode === 'jadwal_saja'
                            ? 'JADWAL TUGAS MENGAWAS PSAS'
                            : 'JADWAL MENGAWAS & TATA TERTIB'
                          : 'TUGAS & TATA TERTIB PENGAWAS'}
                      </span>
                      <span
                        style={{ fontSize: fs([8.5, 7.8, 7.2, isNarrowCard ? 5.8 : 6.5]) }}
                        className="font-mono font-bold shrink-0 tabular-nums"
                      >
                        {item.nomorTugas}
                      </span>
                    </div>
                    <div
                      style={{
                        background: design.subBannerBackgroundCss,
                        color: design.subBannerTextHex,
                        borderColor: design.outerBorderHex,
                        fontSize: fs([8.5, 7.8, 7.2, isNarrowCard ? 6 : 6.5]),
                        textTransform: design.headingTextTransformCss
                      }}
                      className="text-center font-bold border-x border-b px-1 py-[1px] truncate"
                    >
                      {settings.namaUjian} • {profile.namaSekolah}
                    </div>

                    {/* Identity Strip */}
                    <div
                      style={{
                        ...(customTheme
                          ? { backgroundColor: customTheme.tableHeaderBgHex || '#f8fafc' }
                          : {}),
                        fontSize: fs([8.5, 7.8, 7.4, isVeryShortCard ? 6.2 : 6.9])
                      }}
                      className="mt-1 px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50/95 flex items-center justify-between gap-1.5"
                    >
                      <span
                        style={{ fontWeight: design.bodyStrongFontWeightCss }}
                        className="text-slate-950 truncate"
                      >
                        {item.nama}
                      </span>
                      {showAutoScheduleOnBack && scheduleSummary ? (
                        <span className="font-mono font-bold text-slate-900 shrink-0 tabular-nums bg-white px-1 rounded border border-slate-300">
                          Jaga {scheduleSummary.jaga} • CAD {scheduleSummary.cad} • OFF{' '}
                          {scheduleSummary.off}
                        </span>
                      ) : (
                        <span className="font-bold uppercase text-slate-700 shrink-0">
                          {item.jabatanKepanitiaan}
                        </span>
                      )}
                    </div>

                    {showAutoScheduleOnBack ? (
                      <div className="mt-1 space-y-1">
                        <div
                          className={
                            examDayGroups.length > 4 && !isNarrowCard
                              ? 'grid grid-cols-2 gap-1 items-start'
                              : 'space-y-1'
                          }
                        >
                          {examDayGroups.length > 4 && !isNarrowCard ? (
                            <>
                              {renderScheduleHalfTable(leftDayGroups)}
                              {renderScheduleHalfTable(rightDayGroups)}
                            </>
                          ) : (
                            renderScheduleHalfTable(examDayGroups)
                          )}
                        </div>

                        {proctorBackMode === 'jadwal_saja' ? (
                          <div
                            style={{ fontSize: fs([7.1, 6.6, 6.2, 5.4]) }}
                            className="px-1.5 py-0.5 rounded bg-white/85 border border-slate-200 text-slate-800 leading-tight"
                          >
                            <span className="font-bold">Ket:</span> Hadir 30 mnt sblm PSAS • Tdk
                            diperkenankan tukar jadwal • Bila berhalangan wajib cari pengganti &amp;
                            lapor Sie Ruang.
                          </div>
                        ) : (
                          !isVeryShortCard && (
                            <ol
                              style={{ fontSize: fs([7, 6.5, 6.1, 5.4]) }}
                              className="pl-3.5 pr-1 py-0.5 rounded bg-white/80 list-decimal leading-tight text-slate-900 font-medium space-y-[1px]"
                            >
                              {tatibList.slice(0, isShortCard ? 2 : 3).map((poin, idx) => (
                                <li key={idx} className="line-clamp-1">
                                  {poin}
                                </li>
                              ))}
                            </ol>
                          )
                        )}
                      </div>
                    ) : (
                      <ol
                        style={{ fontSize: fs([8.6, 8.2, 7.8, 7.3]) }}
                        className="mt-1.5 space-y-0.5 pl-4 pr-1 py-0.5 rounded bg-white/75 list-decimal leading-snug text-slate-900 font-medium"
                      >
                        {tatibList.map((poin, idx) => (
                          <li key={idx}>{poin}</li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <div
                    style={{ fontSize: fs([8, 7.5, 7.1, 6.3]) }}
                    className="pt-1 border-t border-slate-400/90 flex items-center justify-between gap-1.5 text-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-950 truncate">
                        {item.kategori === 'pengawas' ? 'Ruang / Rekap' : 'Lokasi Tugas'}:{' '}
                        <span className="font-mono">{item.ruangTugas || '-'}</span>
                      </div>
                      <div className="font-semibold text-slate-700 truncate opacity-95">
                        {showAutoScheduleOnBack
                          ? 'S1: Kls X–XI (07.00) • S2: Kls XII (10.00)'
                          : `Sesi: ${item.sesiTugas || 'Semua Sesi'}`}
                      </div>
                      {showAutoScheduleOnBack && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            style={{ fontSize: fs([6.6, 6.2, 5.8, 5.1]) }}
                            className="font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded px-1 py-[0.5px] truncate"
                          >
                            Scan QR di kanan utk jadwal jaga jelas
                          </span>
                          <button
                            type="button"
                            onClick={() => setScanPreviewProctorId(item.id)}
                            className="no-print inline-flex items-center gap-0.5 px-1 py-[0.5px] rounded bg-slate-900 hover:bg-blue-700 text-white font-bold shrink-0 cursor-pointer"
                            style={{ fontSize: fs([6.4, 6, 5.6, 5]) }}
                            title="Buka portal jadwal pengawas jelas & bisa di-zoom"
                          >
                            <Maximize2 className="w-2 h-2" />
                            <span>Buka</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {settings.tampilkanBarcode && (
                      <div
                        className={`bg-white shrink-0 ${
                          showAutoScheduleOnBack
                            ? 'p-0.5 rounded border border-slate-900 flex items-center gap-1 shadow-2xs'
                            : 'p-0.5 rounded-[2px] border border-slate-200/80'
                        }`}
                      >
                        <ExamCardBarcode
                          value={barcodeVal}
                          mode={showAutoScheduleOnBack ? 'qr_link' : settings.jenisBarcode}
                          size={
                            showAutoScheduleOnBack
                              ? Math.max(24, fontScale.barcode - 4)
                              : fontScale.barcode
                          }
                        />
                        {showAutoScheduleOnBack && (
                          <div className="flex flex-col justify-center leading-none pr-0.5">
                            <span
                              style={{ fontSize: fs([6.4, 6, 5.6, 4.9]) }}
                              className="font-black uppercase tracking-tight text-slate-950"
                            >
                              SCAN QR
                            </span>
                            <span
                              style={{ fontSize: fs([5.8, 5.4, 5, 4.4]) }}
                              className="font-bold text-emerald-800 mt-[1px]"
                            >
                              Pintasan
                            </span>
                            <span
                              style={{ fontSize: fs([5.8, 5.4, 5, 4.4]) }}
                              className="font-bold text-slate-700"
                            >
                              Jadwal
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        };

        // Fold-Combine Pagination (2 panels [Depan | Belakang] per row)
        const foldRowsPerPage = Math.max(1, Math.ceil((settings.layoutPerPage || 6) / 2));
        const foldPairWidthMm = Math.floor(availWidthMm);
        const foldPanelWidthMm = Math.floor((foldPairWidthMm - 2) / 2);
        const foldCardHeightMm = Math.floor(
          (availHeightMm - gapMm * (foldRowsPerPage - 1)) / foldRowsPerPage
        );
        const hasCustomDimForRole = (kategori: PanitiaPengawasRole) =>
          kategori === 'panitia'
            ? isValidCardMm(settings.lebarKartuPanitiaMm, 40) ||
              isValidCardMm(settings.tinggiKartuPanitiaMm, 35) ||
              isValidCardMm(settings.lebarKartuMm, 40) ||
              isValidCardMm(settings.tinggiKartuMm, 35)
            : isValidCardMm(settings.lebarKartuPengawasMm, 40) ||
              isValidCardMm(settings.tinggiKartuPengawasMm, 35) ||
              isValidCardMm(settings.lebarKartuMm, 40) ||
              isValidCardMm(settings.tinggiKartuMm, 35);
        const getFoldItemDim = (kategori: PanitiaPengawasRole) => {
          if (hasCustomDimForRole(kategori)) {
            const d = resolveCardDim(kategori);
            return { w: Math.min(d.w, foldPanelWidthMm), h: d.h };
          }
          return { w: foldPanelWidthMm, h: foldCardHeightMm };
        };
        const foldPages: PanitiaPengawasItem[][] = [];
        for (let i = 0; i < cardsToPrint.length; i += foldRowsPerPage) {
          foldPages.push(cardsToPrint.slice(i, i + foldRowsPerPage));
        }

        const renderDuplexSheets = () =>
          printPages.map((pageCards, pageIdx) => {
            const frontSlots = padFrontGridCardsForDuplex(pageCards, cols);
            const useMirror = settings.mirrorDuplexBelakang !== false;
            const backSlots = useMirror
              ? mirrorGridCardsForDuplex(pageCards, cols)
              : padFrontGridCardsForDuplex(pageCards, cols);

            return (
              <div key={`pp-duplex-${pageIdx}`} className="space-y-4 print:space-y-0">
                <div className="panitia-paper-sheet bg-white border border-slate-300 shadow-sm mx-auto print:p-0 print:border-0 print:shadow-none print-page-break">
                  <div className="no-print flex items-center justify-between text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                    <span>Sisi Depan — Lembar {pageIdx + 1}</span>
                    <span>
                      {paperBase.label} • {activeDimLabel} • {pageCards.length} kartu
                    </span>
                  </div>
                  <div style={syncedGridStyle}>
                    {frontSlots.map((item, slotIdx) =>
                      item ? (
                        <div key={`d-front-${item.id}`} style={syncedSlotStyle}>
                          {renderFrontCard(item)}
                        </div>
                      ) : (
                        <div
                          key={`front-empty-${pageIdx}-${slotIdx}`}
                          style={syncedSlotStyle}
                          aria-hidden="true"
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="panitia-paper-sheet bg-white border border-blue-300 shadow-sm mx-auto print:p-0 print:border-0 print:shadow-none print-page-break">
                  <div className="no-print flex items-center justify-between text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-2 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                    <span className="flex items-center gap-1">
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      Sisi Belakang (Tugas & Tata Tertib) — Lembar {pageIdx + 1}
                    </span>
                    <span>
                      {activeDimLabel} •{' '}
                      {useMirror ? 'Urutan Cermin Presisi Bolak-Balik' : 'Urutan Standar'}
                    </span>
                  </div>
                  <div style={syncedGridStyle}>
                    {backSlots.map((item, slotIdx) =>
                      item ? (
                        <div key={`d-back-${item.id}`} style={syncedSlotStyle}>
                          {renderBackCard(item)}
                        </div>
                      ) : (
                        <div
                          key={`back-empty-${pageIdx}-${slotIdx}`}
                          style={syncedSlotStyle}
                          aria-hidden="true"
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          });

        return (
          <div className="space-y-3">
            <style>{`
              @page {
                size: ${cssPageSize};
                margin: ${marginMm}mm;
              }
              @media screen {
                .panitia-paper-sheet {
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
                html, body, #root {
                  background: #ffffff !important;
                  background-color: #ffffff !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .panitia-preview-zoom-wrap {
                  zoom: 1 !important;
                }
                .panitia-paper-sheet {
                  width: 100% !important;
                  min-height: auto !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: #ffffff !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .panitia-print-container,
                .panitia-print-container *:not(.card-keep-emboss) {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  box-shadow: none !important;
                }
                .card-keep-emboss {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-page-break {
                  page-break-after: always !important;
                  break-after: page !important;
                }
                .print-page-break:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                }
                .print-card-avoid {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            `}</style>

            {/* Preview Header, Output Mode Toggle (Kartu vs Susunan Panitia) & Print Side Mode Bar */}
            <div className="no-print flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                {/* Output Mode Switcher: Kartu ID vs Format Daftar Susunan Panitia 1-17 vs Matriks Jadwal Pengawas */}
                <div className="inline-flex flex-wrap rounded-md border border-slate-300 bg-white p-0.5 text-[11px] shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPreviewOutputMode('kartu')}
                    className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-colors ${
                      previewOutputMode === 'kartu'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>Tampilan Kartu ({cardsToPrint.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOutputMode('susunan_tabel')}
                    className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-colors ${
                      previewOutputMode === 'susunan_tabel'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Format Susunan Panitia ({panitiaOnlyItems.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOutputMode('matriks_pengawas')}
                    className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-colors ${
                      previewOutputMode === 'matriks_pengawas'
                        ? 'bg-teal-700 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    <span>Matriks Jadwal Pengawas ({pengawasOnlyItems.length})</span>
                  </button>
                </div>

                {previewOutputMode === 'kartu' && (
                  <>
                    <Scissors className="w-4 h-4 text-slate-500" />
                    <span>
                      Pratinjau ({paperBase.label}{' '}
                      <strong>{isLandscape ? 'Landscape' : 'Portrait'}</strong> •{' '}
                      <span className="font-mono font-semibold text-slate-800">
                        {sisiMode === 'gabung_lipat'
                          ? `${getFoldItemDim('panitia').w * 2}×${getFoldItemDim('panitia').h} mm (Lipat)`
                          : `${activeDimLabel} (${cols} Kolom)`}
                      </span>{' '}
                      • <strong>{cardsToPrint.length}</strong> kartu)
                    </span>

                    {/* Prominent Side Mode Switcher */}
                    <div className="inline-flex flex-wrap rounded-md border border-slate-300 bg-white p-0.5 text-[11px]">
                      {[
                        { id: 'dua_sisi_bergantian', label: 'Bolak-Balik Presisi' },
                        { id: 'gabung_lipat', label: 'Gabung Depan|Belakang (Lipat)' },
                        { id: 'pratinjau_berdampingan', label: 'Berdampingan' },
                        { id: 'depan_saja', label: 'Depan Saja' }
                      ].map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...settings,
                              modeSisiCetak: m.id as KartuPanitiaSettings['modeSisiCetak']
                            })
                          }
                          className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                            sisiMode === m.id
                              ? 'bg-slate-900 text-amber-400'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Paper Size */}
                    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-[11px]">
                      {(['A4', 'F4', 'Letter'] as const).map(sz => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => onUpdateSettings({ ...settings, ukuranKertas: sz })}
                          className={`px-2 py-0.5 rounded font-mono font-semibold ${
                            settings.ukuranKertas === sz
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
                        onClick={() => applyLayoutPreset('standar_id')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors ${
                          (settings.lebarKartuMm === 58 && settings.tinggiKartuMm === 95) ||
                          (settings.lebarKartuPengawasMm === 58 &&
                            settings.tinggiKartuPengawasMm === 95)
                            ? 'bg-slate-900 text-amber-400'
                            : 'text-slate-700 hover:bg-amber-100'
                        }`}
                        title="Ukuran ID Card Standar 58×95 mm (3 kolom)"
                      >
                        Standar ID (58×95)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyLayoutPreset('standar_6')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors ${
                          settings.ukuranKertas === 'A4' &&
                          settings.orientasiCetak === 'portrait' &&
                          settings.jumlahKolom === 2 &&
                          settings.layoutPerPage === 6 &&
                          !isValidCardMm(settings.lebarKartuMm, 40)
                            ? 'bg-slate-900 text-amber-400'
                            : 'text-slate-700 hover:bg-amber-100'
                        }`}
                        title="Standar Kertas A4 isi 6 Orang per lembar (2×3)"
                      >
                        Standar A4 (6 Orang)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyLayoutPreset('a4_4_orang')}
                        className={`px-2 py-0.5 rounded font-bold transition-colors ${
                          settings.ukuranKertas === 'A4' &&
                          settings.orientasiCetak === 'portrait' &&
                          settings.jumlahKolom === 2 &&
                          settings.layoutPerPage === 4 &&
                          !isValidCardMm(settings.lebarKartuMm, 40) &&
                          !isValidCardMm(settings.lebarKartuPanitiaMm, 40) &&
                          !isValidCardMm(settings.lebarKartuPengawasMm, 40)
                            ? 'bg-emerald-700 text-white'
                            : 'text-emerald-900 hover:bg-emerald-100'
                        }`}
                        title="Jadikan Kertas A4 untuk 4 Orang per lembar (2×2 besar & jelas)"
                      >
                        A4 (4 Orang / Hal)
                      </button>
                    </div>

                    {/* Quick Individual vs Mass Scope Switch */}
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
                        Massal ({printMode === 'selected' ? selectedIds.length : filteredItems.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!individualPrintId && (filteredItems[0] || items[0])) {
                            setIndividualPrintId((filteredItems[0] || items[0]).id);
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
                      {printMode === 'individual' && items.length > 0 && (
                        <select
                          value={individualPrintId || filteredItems[0]?.id || items[0]?.id || ''}
                          onChange={e => setIndividualPrintId(e.target.value)}
                          className="px-1.5 py-0.5 rounded border border-blue-300 bg-white font-semibold text-slate-900 max-w-[165px]"
                        >
                          {items.map(it => (
                            <option key={it.id} value={it.id}>
                              {it.nama}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                {/* Preview Screen Zoom Out / Zoom In Control */}
                <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPreviewZoomPct(z => Math.max(40, z - 10))}
                    className="p-1 rounded hover:bg-slate-100 text-slate-700"
                    title="Zoom Out Pratinjau"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  {[50, 65, 75, 100, 125, 150].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPreviewZoomPct(pct)}
                      className={`px-1.5 py-0.5 rounded font-mono font-bold transition-colors tabular-nums ${
                        previewZoomPct === pct
                          ? 'bg-slate-900 text-amber-400'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPreviewZoomPct(z => Math.min(180, z + 10))}
                    className="p-1 rounded hover:bg-slate-100 text-slate-700"
                    title="Zoom In Pratinjau"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {previewZoomPct !== 100 && (
                    <button
                      type="button"
                      onClick={() => setPreviewZoomPct(100)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {pengawasOnlyItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScanPreviewProctorId(pengawasOnlyItems[0].id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold shadow-2xs"
                    title="Buka tampilan layar penuh/zoom jadwal pengawas dari pintasan QR"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Portal QR Jadwal Jelas</span>
                  </button>
                )}

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      settings.temaWarnaPanitia === 'ai_custom'
                        ? ''
                        : THEME_PALETTES[(settings.temaWarnaPanitia as ThemeKey) || 'merah'].swatch
                    }`}
                    style={
                      settings.temaWarnaPanitia === 'ai_custom' && settings.aiCustomThemePanitia
                        ? { backgroundColor: settings.aiCustomThemePanitia.bannerBgHex }
                        : undefined
                    }
                  />
                  Panitia:{' '}
                  {settings.temaWarnaPanitia === 'ai_custom' && settings.aiCustomThemePanitia
                    ? settings.aiCustomThemePanitia.name
                    : THEME_PALETTES[(settings.temaWarnaPanitia as ThemeKey) || 'merah'].label}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      settings.temaWarnaPengawas === 'ai_custom'
                        ? ''
                        : THEME_PALETTES[(settings.temaWarnaPengawas as ThemeKey) || 'hijau'].swatch
                    }`}
                    style={
                      settings.temaWarnaPengawas === 'ai_custom' && settings.aiCustomThemePengawas
                        ? { backgroundColor: settings.aiCustomThemePengawas.bannerBgHex }
                        : undefined
                    }
                  />
                  Pengawas:{' '}
                  {settings.temaWarnaPengawas === 'ai_custom' && settings.aiCustomThemePengawas
                    ? settings.aiCustomThemePengawas.name
                    : THEME_PALETTES[(settings.temaWarnaPengawas as ThemeKey) || 'hijau'].label}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2 print:overflow-visible print:pb-0">
              <div
                style={{ zoom: previewZoomPct / 100 }}
                className="panitia-preview-zoom-wrap"
              >
            {previewOutputMode === 'susunan_tabel' ? (
              <div className="panitia-print-container space-y-4 overflow-x-auto pb-4 print:overflow-visible print:pb-0">
                <div className="panitia-paper-sheet bg-white border border-slate-300 shadow-sm mx-auto print:p-0 print:border-0 print:shadow-none">
                  <div className="no-print flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-100 border border-slate-200 rounded px-3 py-1.5 mb-4">
                    <span className="font-bold text-slate-800">
                      Format Daftar Susunan Panitia (Sinkron Otomatis dengan Database Guru & Tendik)
                    </span>
                    <span className="text-slate-600 font-medium">
                      Terhubung DB GTK:{' '}
                      <strong className="text-emerald-700">
                        {panitiaOnlyItems.filter(p => p.sourceType === 'guru' || p.sourceType === 'tendik').length}
                      </strong>{' '}
                      / {panitiaOnlyItems.length} petugas
                    </span>
                  </div>

                  {/* Header SK Susunan Panitia */}
                  <div className="text-center text-slate-950 font-bold uppercase tracking-wide leading-snug mb-3 text-[13px]">
                    <div>SUSUNAN PANITIA PENYELENGGARA</div>
                    <div>{settings.namaUjian || 'PENILAIAN SUMATIF AKHIR SEMESTER GASAL'}</div>
                    <div>{settings.tahunPelajaran || 'TAHUN PELAJARAN 2026/2027'}</div>
                    <div>{profile.namaSekolah || 'SMA NEGERI 9 SURABAYA'}</div>
                  </div>

                  {panitiaOnlyItems.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-xs text-slate-500">
                      Belum ada daftar Panitia. Klik tombol <strong>Susun Panitia dari GTK (Format 1–17)</strong> di atas.
                    </div>
                  ) : (
                    <table className="w-full border-collapse border border-slate-900 text-[12px] text-slate-950">
                      <thead>
                        <tr className="bg-[#2B4C7E] text-white">
                          <th className="border border-slate-900 px-2.5 py-1.5 w-12 text-center font-bold uppercase">
                            NO
                          </th>
                          <th className="border border-slate-900 px-3 py-1.5 text-center font-bold uppercase">
                            NAMA
                          </th>
                          <th className="border border-slate-900 px-3 py-1.5 w-[42%] text-center font-bold uppercase">
                            JABATAN DALAM PANITIA
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {susunanTableGroups.map((grp, grpIdx) => (
                          <tr key={`susunan-grp-${grpIdx}`} className="align-middle bg-white">
                            <td className="border border-slate-900 px-2 py-1 text-center font-semibold tabular-nums">
                              {grp.groupNo > 0 ? `${grp.groupNo}.` : ''}
                            </td>
                            <td className="border border-slate-900 px-2.5 py-1">
                              {grp.mergeRows && grp.items.length > 1 ? (
                                <div className="space-y-0.5 leading-snug">
                                  {grp.items.map(({ item, subNo }) => (
                                    <div key={item.id} className="flex items-baseline gap-1.5">
                                      <span className="w-4 shrink-0 tabular-nums">{subNo}.</span>
                                      <span>{item.nama}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="leading-snug">{grp.items[0]?.item.nama}</div>
                              )}
                            </td>
                            <td className="border border-slate-900 px-2.5 py-1 leading-snug">
                              {grp.jabatan}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : previewOutputMode === 'matriks_pengawas' ? (
              <div className="panitia-print-container space-y-4 overflow-x-auto pb-4 print:overflow-visible print:pb-0">
                <div className="panitia-paper-sheet bg-white border border-slate-300 shadow-sm mx-auto print:p-0 print:border-0 print:shadow-none">
                  <div className="no-print flex flex-wrap items-center justify-between gap-2 text-[11px] bg-teal-50 border border-teal-200 rounded px-3 py-1.5 mb-3">
                    <span className="font-bold text-teal-950">
                      Matriks Jadwal Tugas Pengawas PSAS ({pengawasOnlyItems.length} Pengawas ×{' '}
                      {activeJadwalSlots.length} Sesi) — Sinkron Otomatis ke Kartu Pengawas
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveConfigTab('jadwal')}
                      className="px-2 py-0.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold"
                    >
                      Edit Matriks Jadwal
                    </button>
                  </div>

                  <div className="text-center text-slate-950 font-bold uppercase tracking-wide leading-tight mb-2.5 text-[11.5px]">
                    <div>JADWAL PENGAWAS RUANG UJIAN</div>
                    <div>{settings.namaUjian || 'PENILAIAN SUMATIF AKHIR SEMESTER GASAL'}</div>
                    <div>
                      {profile.namaSekolah || 'SMA NEGERI 9 SURABAYA'} •{' '}
                      {settings.tahunPelajaran || 'TAHUN PELAJARAN 2026/2027'}
                    </div>
                  </div>

                  {pengawasOnlyItems.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-xs text-slate-500">
                      Belum ada daftar Pengawas. Klik{' '}
                      <strong>Sinkron Jadwal Pengawas (33 Guru)</strong> di atas.
                    </div>
                  ) : (
                    <>
                      <table className="w-full border-collapse border border-slate-900 text-[7.6px] leading-tight text-slate-950">
                        <thead>
                          <tr className="bg-slate-100">
                            <th rowSpan={6} className="border border-slate-900 px-1 py-0.5 text-center font-bold">
                              No
                            </th>
                            <th rowSpan={6} className="border border-slate-900 px-1.5 py-0.5 text-center font-bold min-w-[120px]">
                              Nama Pengawas
                            </th>
                            {activeJadwalSlots.map(s => (
                              <th key={`pr-h-${s.id}`} className="border border-slate-900 px-0.5 py-0.5 text-center font-bold">
                                {s.hari}
                              </th>
                            ))}
                            <th rowSpan={6} className="border border-slate-900 px-1 py-0.5 text-center font-bold">
                              JAGA
                            </th>
                            <th rowSpan={6} className="border border-slate-900 px-1 py-0.5 text-center font-bold">
                              CAD
                            </th>
                            <th rowSpan={6} className="border border-slate-900 px-1 py-0.5 text-center font-bold">
                              OFF
                            </th>
                          </tr>
                          <tr>
                            {activeJadwalSlots.map(s => (
                              <th key={`pr-d-${s.id}`} className="border border-slate-900 px-0.5 py-0.5 text-center font-bold">
                                {s.tanggal}
                              </th>
                            ))}
                          </tr>
                          <tr>
                            {activeJadwalSlots.map(s => (
                              <th key={`pr-w-${s.id}`} className="border border-slate-900 px-0.5 py-0.5 text-center font-medium">
                                {s.waktu}
                              </th>
                            ))}
                          </tr>
                          <tr>
                            {activeJadwalSlots.map(s => (
                              <th key={`pr-m-${s.id}`} className="border border-slate-900 px-0.5 py-0.5 text-center font-bold text-[6.8px]">
                                {s.mapel}
                              </th>
                            ))}
                          </tr>
                          <tr>
                            {activeJadwalSlots.map(s => (
                              <th key={`pr-s-${s.id}`} className="border border-slate-900 px-0.5 py-0.5 text-center font-bold">
                                {s.sesiLabel}
                              </th>
                            ))}
                          </tr>
                          <tr>
                            {activeJadwalSlots.map(s => (
                              <th key={`pr-r-${s.id}`} className="border border-slate-900 px-0.5 py-0.5 text-center font-semibold">
                                Ruang
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pengawasOnlyItems.map((pgw, idx) => {
                            const sum = summarizePengawasSchedule(
                              pgw.jadwalMengawas,
                              activeJadwalSlots
                            );
                            return (
                              <tr key={`pr-row-${pgw.id}`}>
                                <td className="border border-slate-900 px-1 py-[1.5px] text-center font-semibold tabular-nums">
                                  {idx + 1}
                                </td>
                                <td className="border border-slate-900 px-1.5 py-[1.5px] font-medium whitespace-nowrap">
                                  {pgw.nama}
                                </td>
                                {activeJadwalSlots.map(s => {
                                  const raw = pgw.jadwalMengawas?.[s.id] || '-';
                                  const kind = classifyAssignment(raw);
                                  return (
                                    <td
                                      key={`pr-c-${pgw.id}-${s.id}`}
                                      className={`border border-slate-900 px-0.5 py-[1.5px] text-center tabular-nums ${
                                        kind === 'cad'
                                          ? 'bg-[#FFF200] font-bold text-slate-950'
                                          : kind === 'off'
                                          ? 'bg-[#63594A] font-semibold text-white'
                                          : 'bg-white text-slate-950'
                                      }`}
                                    >
                                      {raw}
                                    </td>
                                  );
                                })}
                                <td className="border border-slate-900 px-1 py-[1.5px] text-center font-bold tabular-nums">
                                  {sum.jaga}
                                </td>
                                <td className="border border-slate-900 px-1 py-[1.5px] text-center font-bold tabular-nums">
                                  {sum.cad}
                                </td>
                                <td className="border border-slate-900 px-1 py-[1.5px] text-center font-bold tabular-nums">
                                  {sum.off}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="font-bold bg-slate-50">
                            <td colSpan={2} className="border border-slate-900 px-1.5 py-1 text-left uppercase">
                              TOTAL CADANGAN GURU / SESI
                            </td>
                            {activeJadwalSlots.map(s => (
                              <td
                                key={`pr-tot-${s.id}`}
                                className="border border-slate-900 px-0.5 py-1 text-center font-bold tabular-nums"
                              >
                                {slotTotals[s.id]?.cad ?? 0}
                              </td>
                            ))}
                            <td colSpan={3} className="border border-slate-900 px-1 py-1" />
                          </tr>
                        </tbody>
                      </table>

                      {/* Keterangan & TTD Kepala Sekolah */}
                      <div className="mt-3 flex items-start justify-between gap-4 text-[8.5px] leading-snug text-slate-950">
                        <div className="space-y-0.5">
                          <div className="font-bold">Keterangan:</div>
                          {DEFAULT_JADWAL_PENGAWAS_KETERANGAN.map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                        <div className="text-left min-w-[175px] shrink-0 relative">
                          <div>{settings.kotaTanggalCetak || 'Surabaya, 20 November 2026'}</div>
                          <div className="font-semibold">Kepala {profile.namaSekolah}</div>
                          <div className="relative h-10 flex items-center my-0.5">
                            {settings.showStempel && (
                              <div className="absolute -left-5 -top-1 opacity-85 w-11 h-11 pointer-events-none">
                                {effectiveStempelUrl ? (
                                  <img
                                    src={effectiveStempelUrl}
                                    alt="Stempel"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <SchoolStampSvg className="w-full h-full" />
                                )}
                              </div>
                            )}
                            {settings.showTtdKs &&
                              (effectiveTtdUrl ? (
                                <img
                                  src={effectiveTtdUrl}
                                  alt="TTD KS"
                                  className="h-9 object-contain relative z-10"
                                />
                              ) : (
                                <KepalaSekolahSignatureSvg className="w-24 h-9 relative z-10" />
                              ))}
                          </div>
                          <div className="font-bold underline relative z-10">
                            {profile.kepalaSekolah}
                          </div>
                          {profile.pangkatKepsek && (
                            <div className="relative z-10">{profile.pangkatKepsek.replace(/\s*\([^)]*\)/, '')}</div>
                          )}
                          <div className="font-mono relative z-10">
                            NIP {profile.nipKepalaSekolah}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : cardsToPrint.length === 0 ? (
              <div className="no-print bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center text-sm text-slate-500">
                Pilih atau tambahkan data Panitia & Pengawas terlebih dahulu untuk melihat pratinjau kartu.
              </div>
            ) : (
              <div className="panitia-print-container space-y-6 overflow-x-auto pb-4 print:space-y-0 print:overflow-visible print:pb-0">
                {sisiMode === 'gabung_lipat' ? (
                  foldPages.map((pageCards, pageIdx) => (
                    <div
                      key={`pp-fold-${pageIdx}`}
                      className="panitia-paper-sheet bg-white border border-slate-300 shadow-sm mx-auto print:p-0 print:border-0 print:shadow-none print-page-break"
                    >
                      <div className="no-print flex items-center justify-between text-[11px] font-bold text-indigo-900 uppercase tracking-wider mb-2 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          Gabung Depan | Belakang (Potong Luar & Lipat Garis Tengah) — Hal. {pageIdx + 1}
                        </span>
                        <span>
                          {pageCards[0]
                            ? `${getFoldItemDim(pageCards[0].kategori).w}×${getFoldItemDim(pageCards[0].kategori).h} mm per sisi`
                            : `${foldPanelWidthMm}×${foldCardHeightMm} mm per sisi`}{' '}
                          • {pageCards.length} kartu
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: `${gapMm}mm`
                        }}
                      >
                        {pageCards.map(item => {
                          const foldDim = getFoldItemDim(item.kategori);
                          return (
                            <div
                              key={`fold-pair-${item.id}`}
                              className={`print-card-avoid relative bg-white box-border ${
                                cutMode === 'none'
                                  ? 'p-0'
                                  : 'border border-dashed border-slate-500 p-[3px]'
                              }`}
                              style={{
                                width: `${foldDim.w * 2 + 2}mm`,
                                height: `${foldDim.h}mm`
                              }}
                            >
                              {cutMode === 'dashed_gunting' && (
                                <span
                                  className="absolute -top-2 left-1.5 bg-white px-0.5 text-[9px] text-slate-600 leading-none select-none z-10"
                                  aria-hidden="true"
                                >
                                  ✂ Potong Luar
                                </span>
                              )}
                              <div
                                className="grid grid-cols-2 h-full w-full relative"
                                style={{ gap: '0mm' }}
                              >
                                <div className="h-full overflow-hidden border-r-[1.5px] border-dashed border-slate-500">
                                  {renderFrontCard(item, 'DEPAN', true, foldDim)}
                                </div>
                                <div className="h-full overflow-hidden">
                                  {renderBackCard(item, 'BELAKANG', true, foldDim)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : sisiMode === 'pratinjau_berdampingan' ? (
                  <>
                    <div className="print:hidden space-y-6">
                      {printPages.map((pageCards, pageIdx) => (
                        <div
                          key={`pp-side-${pageIdx}`}
                          className="panitia-paper-sheet bg-white border border-slate-300 shadow-sm mx-auto space-y-2.5"
                        >
                          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                            Pratinjau 1:1 Berdampingan — Halaman {pageIdx + 1} ({pageCards.length} Kartu • {activeDimLabel})
                          </div>
                          <div className="space-y-2">
                            {pageCards.map(item => {
                              const itemDim = resolveCardDim(item.kategori);
                              return (
                                <div
                                  key={`pair-${item.id}`}
                                  className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded bg-slate-50/70 border border-slate-200"
                                >
                                  <div style={{ width: `${itemDim.w}mm`, height: `${itemDim.h}mm` }}>
                                    {renderFrontCard(item, 'DEPAN')}
                                  </div>
                                  <div style={{ width: `${itemDim.w}mm`, height: `${itemDim.h}mm` }}>
                                    {renderBackCard(item, 'BELAKANG')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden print:block">{renderDuplexSheets()}</div>
                  </>
                ) : sisiMode === 'dua_sisi_bergantian' ? (
                  renderDuplexSheets()
                ) : (
                  printPages.map((pageCards, pageIdx) => (
                    <div
                      key={`pp-front-${pageIdx}`}
                      className="panitia-paper-sheet bg-white border border-slate-300 shadow-sm mx-auto print:p-0 print:border-0 print:shadow-none print-page-break"
                    >
                      <div style={syncedGridStyle}>
                        {pageCards.map(item => (
                          <div key={item.id} style={syncedSlotStyle}>
                            {renderFrontCard(item)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Master Guru & Tendik Picker Modal */}
      {isPickerOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">
                    Ambil Panitia / Pengawas dari Master Guru & Tendik
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Pilih pegawai yang bertugas, tentukan kategori kartu & jabatan ujian.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Masukkan Sebagai</label>
                <select
                  value={pickerRoleTarget}
                  onChange={e => {
                    const role = e.target.value as PanitiaPengawasRole;
                    setPickerRoleTarget(role);
                    setPickerDefaultJabatan(
                      role === 'panitia' ? defaultJabatanPanitia : defaultJabatanPengawas
                    );
                    setPickerDefaultSesi(
                      role === 'panitia'
                        ? 'Semua Sesi'
                        : availableSesiOptions[0] || 'Sesi 1 (07.30 - 09.30)'
                    );
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-bold"
                >
                  <option value="pengawas">Kartu Pengawas Ruang</option>
                  <option value="panitia">Kartu Panitia Ujian</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Jabatan Default</label>
                  <button
                    type="button"
                    onClick={() => openJabatanModal(pickerRoleTarget)}
                    className="text-[10px] font-bold text-indigo-700 hover:underline flex items-center gap-0.5"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Edit Jenis</span>
                  </button>
                </div>
                <select
                  value={pickerDefaultJabatan}
                  onChange={e => setPickerDefaultJabatan(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  {(pickerRoleTarget === 'panitia'
                    ? availableJabatanPanitia
                    : availableJabatanPengawas
                  ).map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sesi Tugas Default</label>
                <select
                  value={pickerDefaultSesi}
                  onChange={e => setPickerDefaultSesi(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value="Semua Sesi">Semua Sesi</option>
                  {availableSesiOptions.map(sesi => (
                    <option key={sesi} value={sesi}>
                      {sesi}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cari GTK</label>
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Nama / NIP / Mapel..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>

            <div className="px-4 py-2 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: 'Semua GTK' },
                  { id: 'guru', label: `Guru (${guruList.length})` },
                  { id: 'tendik', label: `Tendik / TU (${tendikList.length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPickerSourceFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded border font-semibold ${
                      pickerSourceFilter === f.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const allKeys = gtkDirectory.map(g => g.key);
                  const allChecked =
                    allKeys.length > 0 && allKeys.every(k => pickerSelectedKeys.includes(k));
                  setPickerSelectedKeys(allChecked ? [] : allKeys);
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                {gtkDirectory.length > 0 &&
                gtkDirectory.every(g => pickerSelectedKeys.includes(g.key))
                  ? 'Batal Pilih Semua'
                  : `Pilih Semua (${gtkDirectory.length})`}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {gtkDirectory.map(entry => {
                const checked = pickerSelectedKeys.includes(entry.key);
                return (
                  <label
                    key={entry.key}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-xs ${
                      checked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setPickerSelectedKeys(prev =>
                          prev.includes(entry.key)
                            ? prev.filter(k => k !== entry.key)
                            : [...prev, entry.key]
                        )
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{entry.nama}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        NIP: {entry.nip} • {entry.unit}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        entry.sourceType === 'guru'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {entry.sourceType === 'guru' ? 'Guru' : 'Tendik'}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">
                Terpilih: <strong className="text-slate-900">{pickerSelectedKeys.length}</strong> pegawai
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 bg-white rounded-md font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPickerImport}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambahkan ke Daftar Kartu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Edit Jenis Jabatan Modal */}
      {isJabatanModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">Menu Edit Jenis Jabatan</h3>
                  <p className="text-[11px] text-slate-300">
                    Daftar bawaan dikunci sesuai format resmi (22 jabatan Panitia). Gunakan menu
                    ini jika ingin mengubah, menambah, atau mengatur ulang urutan jenis jabatan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJabatanModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setJabatanModalTab('panitia');
                    setEditingJabatanIdx(null);
                  }}
                  className={`px-3 py-1 rounded-md font-bold transition-colors ${
                    jabatanModalTab === 'panitia'
                      ? 'bg-rose-700 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Jabatan Panitia ({availableJabatanPanitia.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJabatanModalTab('pengawas');
                    setEditingJabatanIdx(null);
                  }}
                  className={`px-3 py-1 rounded-md font-bold transition-colors ${
                    jabatanModalTab === 'pengawas'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Jabatan Pengawas ({availableJabatanPengawas.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleResetDefaultJabatan(jabatanModalTab)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded font-semibold text-[11px] flex items-center gap-1"
                title="Kembalikan daftar jabatan tepat seperti default bawaan"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset ke Default Bawaan</span>
              </button>
            </div>

            {/* Add New Jabatan Bar */}
            <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-2 text-xs">
              <input
                type="text"
                value={newJabatanInput}
                onChange={e => setNewJabatanInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddJabatanOption();
                  }
                }}
                placeholder={
                  jabatanModalTab === 'panitia'
                    ? 'Tambah jenis jabatan panitia baru...'
                    : 'Tambah jenis jabatan pengawas baru...'
                }
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
              <button
                type="button"
                onClick={handleAddJabatanOption}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Jabatan</span>
              </button>
            </div>

            {/* Editable Jabatan List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-5 py-2">
              {getJabatanListByRole(jabatanModalTab).map((jab, idx, arr) => {
                const isEditing = editingJabatanIdx === idx;
                return (
                  <div
                    key={`${jabatanModalTab}-${idx}-${jab}`}
                    className="py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="w-6 text-right font-mono text-[11px] font-bold text-slate-400 shrink-0">
                        {idx + 1}.
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingJabatanDraft}
                          onChange={e => setEditingJabatanDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveRenameJabatan(idx);
                            } else if (e.key === 'Escape') {
                              setEditingJabatanIdx(null);
                              setEditingJabatanDraft('');
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2.5 py-1 border border-indigo-400 rounded bg-indigo-50/40 font-semibold text-slate-900"
                        />
                      ) : (
                        <span className="font-semibold text-slate-900 truncate">{jab}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveRenameJabatan(idx)}
                            className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                            title="Simpan perubahan nama jabatan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJabatanIdx(null);
                              setEditingJabatanDraft('');
                            }}
                            className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveJabatanOption(idx, -1)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                            title="Geser ke atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() => handleMoveJabatanOption(idx, 1)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30"
                            title="Geser ke bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJabatanIdx(idx);
                              setEditingJabatanDraft(jab);
                            }}
                            className="p-1.5 rounded text-indigo-600 hover:bg-indigo-50"
                            title="Ubah nama jenis jabatan ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteJabatanOption(jab)}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus jenis jabatan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-600">
                Perubahan nama jenis jabatan akan otomatis memperbarui kartu petugas yang memakai
                jabatan tersebut.
              </span>
              <button
                type="button"
                onClick={() => setIsJabatanModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-md font-bold"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Jadwal Mengawas Pintasan QR & Zoom */}
      {(() => {
        if (!scanPreviewProctorId) return null;
        const targetProctor =
          pengawasOnlyItems.find(p => p.id === scanPreviewProctorId) ||
          pengawasOnlyItems[0];
        if (!targetProctor) return null;
        return (
          <JadwalPengawasScanPortal
            proctor={targetProctor}
            allProctors={pengawasOnlyItems}
            slots={activeJadwalSlots}
            profile={profile}
            settings={settings}
            onSelectProctor={item => setScanPreviewProctorId(item.id)}
            onClose={() => setScanPreviewProctorId(null)}
          />
        );
      })()}
    </div>
  );
};
