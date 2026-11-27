import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Guru, SchoolProfile, Tendik, User } from '../types';
import { appendAuditLog } from '../services/storageService';
import { compressGtkPhotoFileToDataUrl } from '../services/gtkPhotoStorage';
import { OfficialKopSurat } from './OfficialKopSurat';
import {
  KepalaSekolahSignatureSvg,
  PemprovJatimLogo,
  SchoolStampSvg,
  Sman9SurabayaLogoSvg
} from './OfficialStamps';
import { ExamCardBarcode, resolveDirectImageUrl } from './ExamCardBarcode';
import { PrintTypographyBar } from './PrintTypographyBar';
import {
  PrintTypographySettings,
  getPrintTypographyStyleVars,
  getScopedPrintTypographyCss,
  getStoredPrintTypography,
  saveStoredPrintTypography
} from '../utils/printTypography';
import {
  BadgeCheck,
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Contact2,
  FileText,
  Grid2X2,
  IdCard,
  Image as ImageIcon,
  Link2,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X
} from 'lucide-react';

interface KartuMasterGtkViewProps {
  profile: SchoolProfile;
  currentUser: User;
  guruList: Guru[];
  tendikList: Tendik[];
  fallbackTtdKsUrl?: string;
  fallbackStempelUrl?: string;
  initialSelectedGtkId?: string | null;
  onUpdateGuru: (list: Guru[]) => void;
  onUpdateTendik: (list: Tendik[]) => void;
  onSelectForLetter?: (payload: { type: 'guru' | 'tendik'; data: Guru | Tendik }) => void;
}

type UnifiedGtkItem = {
  id: string;
  entityType: 'guru' | 'tendik';
  raw: Guru | Tendik;
  displayName: string;
  nip: string;
  nuptk: string;
  nik: string;
  statusPegawai: string;
  statusBucket: 'PNS' | 'PPPK' | 'HONORER';
  pangkatGolongan: string;
  jabatan: string;
  tugasUtama: string;
  tugasTambahan: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  alamatLengkap: string;
  hp: string;
  telepon: string;
  email: string;
  fotoUrl: string;
};

type CardLayoutMode = 'profil_individu' | 'kartu_id';
type ScreenBrowseMode = 'fokus' | 'galeri';
type CategoryFilter = 'all' | 'guru' | 'tendik';
type StatusFilter = 'all' | 'PNS' | 'PPPK' | 'HONORER';
type PhotoFilter = 'all' | 'has_photo' | 'no_photo';
type PaperSizeOption = 'A4' | 'F4';

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

const formatTanggalIndo = (rawDate?: string): string => {
  const clean = (rawDate || '').trim();
  if (!clean) return '-';
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${d} ${BULAN_ID[m - 1]} ${y}`;
    }
  }
  const slashMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const d = Number(slashMatch[1]);
    const m = Number(slashMatch[2]);
    const y = Number(slashMatch[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${d} ${BULAN_ID[m - 1]} ${y}`;
    }
  }
  return clean;
};

const formatDisplayName = (g: Guru): string => {
  const base = (g.nama || '').trim();
  const gelar = (g.gelar || '').trim();
  if (!gelar || base.toLowerCase().includes(gelar.toLowerCase())) {
    return base || 'Tanpa Nama';
  }
  return `${base}, ${gelar}`;
};

const getInitials = (name: string): string => {
  const tokens = name
    .replace(/,.*$/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return 'GTK';
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] || ''}${tokens[1][0] || ''}`.toUpperCase();
};

const classifyStatusBucket = (rawStatus?: string): 'PNS' | 'PPPK' | 'HONORER' => {
  const upper = (rawStatus || '').toUpperCase();
  if (upper.includes('PNS') || upper.includes('CPNS')) return 'PNS';
  if (upper.includes('PPPK') || upper.includes('P3K')) return 'PPPK';
  return 'HONORER';
};

const buildAlamatLengkap = (g: Guru): string => {
  const parts: string[] = [];
  if (g.alamatJalan) parts.push(g.alamatJalan.trim());
  const rt = (g.rt || '').trim();
  const rw = (g.rw || '').trim();
  if (rt || rw) {
    parts.push(`RT ${rt || '00'}/RW ${rw || '00'}`);
  }
  if (g.namaDusun && g.namaDusun.trim() && g.namaDusun.trim() !== '-') {
    parts.push(`Dsn. ${g.namaDusun.trim()}`);
  }
  if (g.desaKelurahan) parts.push(`Kel. ${g.desaKelurahan.trim()}`);
  if (g.kecamatan) parts.push(g.kecamatan.trim());
  if (g.kodePos) parts.push(g.kodePos.trim());
  return parts.length > 0 ? parts.join(', ') : '-';
};

const buildUnifiedItem = (g: Guru | Tendik, entityType: 'guru' | 'tendik'): UnifiedGtkItem => {
  const statusPegawai = (g.statusKepegawaian || g.status || (entityType === 'tendik' ? 'Tenaga Honor Sekolah' : 'PNS')).trim();
  const tendikExtra = entityType === 'tendik' ? (g as Tendik).tugasUtama : '';
  const tugasUtama =
    (tendikExtra || g.mataPelajaran || g.mapel || (entityType === 'tendik' ? g.jabatan : 'Guru Mata Pelajaran') || '-').trim();
  return {
    id: g.id,
    entityType,
    raw: g,
    displayName: formatDisplayName(g),
    nip: (g.nip || '').trim() || '-',
    nuptk: (g.nuptk || '').trim() || '-',
    nik: (g.nik || '').trim() || '-',
    statusPegawai,
    statusBucket: classifyStatusBucket(statusPegawai),
    pangkatGolongan: (g.pangkatGolongan || '').trim() || '-',
    jabatan: (g.jenisPtk || g.jabatan || (entityType === 'tendik' ? 'Tenaga Kependidikan' : 'Guru')).trim(),
    tugasUtama,
    tugasTambahan: (g.tugasTambahan || '').trim() || '-',
    jenisKelamin: g.jenisKelamin === 'P' ? 'P' : 'L',
    tempatLahir: (g.tempatLahir || '').trim() || '-',
    tanggalLahir: formatTanggalIndo(g.tanggalLahir),
    agama: (g.agama || 'Islam').trim(),
    alamatLengkap: buildAlamatLengkap(g),
    hp: (g.hp || g.noHp || '').trim() || '-',
    telepon: (g.telepon || '').trim() || '-',
    email: (g.email || '').trim() || '-',
    fotoUrl: resolveDirectImageUrl(g.fotoUrl)
  };
};

export const KartuMasterGtkView: React.FC<KartuMasterGtkViewProps> = ({
  profile,
  currentUser,
  guruList,
  tendikList,
  fallbackTtdKsUrl,
  fallbackStempelUrl,
  initialSelectedGtkId,
  onUpdateGuru,
  onUpdateTendik,
  onSelectForLetter
}) => {
  const canEdit = ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek'].includes(currentUser.role);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [cardMode, setCardMode] = useState<CardLayoutMode>('profil_individu');
  const [browseMode, setBrowseMode] = useState<ScreenBrowseMode>('fokus');
  const [paperSize, setPaperSize] = useState<PaperSizeOption>('A4');

  const [showKop, setShowKop] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showKepegawaian, setShowKepegawaian] = useState(true);
  const [showSensitive, setShowSensitive] = useState(false);
  const [showSignatureStamp, setShowSignatureStamp] = useState(true);
  const [printDateText, setPrintDateText] = useState<string>(() => {
    const now = new Date();
    return `${now.getDate()} ${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`;
  });

  const [printTypography, setPrintTypography] = useState<PrintTypographySettings>(() =>
    getStoredPrintTypography('kartu-gtk', {
      fontFamily: 'jakarta',
      lineSpacing: 'nyaman',
      fontScalePct: 100
    })
  );
  const [previewZoomPct, setPreviewZoomPct] = useState<number>(100);

  const [selectedId, setSelectedId] = useState<string>('');
  const [printScope, setPrintScope] = useState<'single' | 'batch'>('single');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // URL Photo Modal state
  const [urlModalTarget, setUrlModalTarget] = useState<UnifiedGtkItem | null>(null);
  const [urlInputValue, setUrlInputValue] = useState('');

  // Hidden file input ref keyed by active upload target
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadTargetRef = useRef<UnifiedGtkItem | null>(null);

  const unifiedList = useMemo<UnifiedGtkItem[]>(() => {
    const gurus = guruList.map(g => buildUnifiedItem(g, 'guru'));
    const tendiks = tendikList.map(t => buildUnifiedItem(t, 'tendik'));
    return [...gurus, ...tendiks];
  }, [guruList, tendikList]);

  useEffect(() => {
    if (initialSelectedGtkId && unifiedList.some(item => item.id === initialSelectedGtkId)) {
      setSelectedId(initialSelectedGtkId);
      setBrowseMode('fokus');
    }
  }, [initialSelectedGtkId, unifiedList]);

  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return unifiedList.filter(item => {
      if (categoryFilter !== 'all' && item.entityType !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.statusBucket !== statusFilter) return false;
      if (photoFilter === 'has_photo' && !item.fotoUrl) return false;
      if (photoFilter === 'no_photo' && !!item.fotoUrl) return false;
      if (!q) return true;
      return (
        item.displayName.toLowerCase().includes(q) ||
        item.nip.toLowerCase().includes(q) ||
        item.nuptk.toLowerCase().includes(q) ||
        item.jabatan.toLowerCase().includes(q) ||
        item.tugasUtama.toLowerCase().includes(q) ||
        item.pangkatGolongan.toLowerCase().includes(q)
      );
    });
  }, [unifiedList, categoryFilter, statusFilter, photoFilter, searchTerm]);

  const selectedItem = useMemo<UnifiedGtkItem | null>(() => {
    if (filteredList.length === 0) return null;
    return filteredList.find(item => item.id === selectedId) || filteredList[0];
  }, [filteredList, selectedId]);

  useEffect(() => {
    if (selectedItem && selectedItem.id !== selectedId) {
      setSelectedId(selectedItem.id);
    }
  }, [selectedItem, selectedId]);

  const stats = useMemo(() => {
    const total = unifiedList.length;
    const guruCount = unifiedList.filter(i => i.entityType === 'guru').length;
    const tendikCount = unifiedList.filter(i => i.entityType === 'tendik').length;
    const photoCount = unifiedList.filter(i => !!i.fotoUrl).length;
    return { total, guruCount, tendikCount, photoCount };
  }, [unifiedList]);

  const handleUpdateTypography = (next: PrintTypographySettings) => {
    setPrintTypography(next);
    saveStoredPrintTypography('kartu-gtk', next);
  };

  const applyPhotoToGtk = (target: UnifiedGtkItem, nextFotoUrl: string, auditLabel: string) => {
    const trimmed = nextFotoUrl.trim();
    if (target.entityType === 'guru') {
      const updated = guruList.map(g => (g.id === target.id ? { ...g, fotoUrl: trimmed } : g));
      onUpdateGuru(updated);
    } else {
      const updated = tendikList.map(t => (t.id === target.id ? { ...t, fotoUrl: trimmed } : t));
      onUpdateTendik(updated);
    }
    appendAuditLog(
      auditLabel,
      trimmed
        ? `Memperbarui pas foto profil ${target.displayName} (${target.entityType.toUpperCase()}).`
        : `Menghapus pas foto profil ${target.displayName} (${target.entityType.toUpperCase()}).`
    );
  };

  const triggerPhotoUploadFor = (target: UnifiedGtkItem) => {
    pendingUploadTargetRef.current = target;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handlePhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = pendingUploadTargetRef.current;
    if (!file || !target) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'File harus berupa gambar (JPG, PNG, WEBP).' });
      return;
    }

    try {
      const compressed = await compressGtkPhotoFileToDataUrl(file);
      applyPhotoToGtk(target, compressed, 'UPDATE_FOTO_GTK');
      setFeedback({
        type: 'success',
        message: `Pas foto ${target.displayName} berhasil disimpan ke profil master GTK.`
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memproses berkas foto.'
      });
    } finally {
      pendingUploadTargetRef.current = null;
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenUrlModal = (target: UnifiedGtkItem) => {
    setUrlModalTarget(target);
    setUrlInputValue(target.raw.fotoUrl && !target.raw.fotoUrl.startsWith('data:image/') ? target.raw.fotoUrl : '');
  };

  const handleSavePhotoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlModalTarget) return;
    const clean = urlInputValue.trim();
    if (!clean) {
      setFeedback({ type: 'error', message: 'Masukkan URL foto atau tautan Google Drive yang valid.' });
      return;
    }
    applyPhotoToGtk(urlModalTarget, clean, 'UPDATE_FOTO_GTK_URL');
    setFeedback({
      type: 'success',
      message: `Tautan pas foto ${urlModalTarget.displayName} berhasil diperbarui.`
    });
    setUrlModalTarget(null);
    setUrlInputValue('');
  };

  const handleRemovePhoto = (target: UnifiedGtkItem) => {
    applyPhotoToGtk(target, '', 'HAPUS_FOTO_GTK');
    setFeedback({
      type: 'success',
      message: `Pas foto ${target.displayName} telah dihapus.`
    });
  };

  const handlePrintSingle = () => {
    if (!selectedItem) return;
    setPrintScope('single');
    setTimeout(() => window.print(), 80);
  };

  const handlePrintBatch = () => {
    if (filteredList.length === 0) return;
    setPrintScope('batch');
    setTimeout(() => window.print(), 80);
  };

  const selectedIndex = selectedItem ? filteredList.findIndex(i => i.id === selectedItem.id) : -1;
  const goPrev = () => {
    if (selectedIndex > 0) setSelectedId(filteredList[selectedIndex - 1].id);
  };
  const goNext = () => {
    if (selectedIndex >= 0 && selectedIndex < filteredList.length - 1) {
      setSelectedId(filteredList[selectedIndex + 1].id);
    }
  };

  const resolvedTtdSrc = resolveDirectImageUrl(fallbackTtdKsUrl);
  const resolvedStempelSrc = resolveDirectImageUrl(fallbackStempelUrl);
  const resolvedSchoolLogo = resolveDirectImageUrl(profile.sekolahLogoUrl || profile.logoUrl);

  const printItems = printScope === 'single' && selectedItem ? [selectedItem] : filteredList;
  const pageCssSize = paperSize === 'F4' ? '215mm 330mm' : 'A4 portrait';

  const renderPhotoBox = (
    item: UnifiedGtkItem,
    sizeClass: string,
    interactive: boolean
  ) => (
    <div
      className={`relative ${sizeClass} shrink-0 rounded-md overflow-hidden border border-slate-300 bg-slate-100 flex items-center justify-center group`}
    >
      {item.fotoUrl ? (
        <img
          src={item.fotoUrl}
          alt={`Pas Foto ${item.displayName}`}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-2 text-center">
          <span className="text-lg font-bold tracking-tight text-slate-700">
            {getInitials(item.displayName)}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">
            Pas Foto 3×4
          </span>
        </div>
      )}

      {interactive && canEdit && (
        <div className="no-print absolute inset-x-0 bottom-0 p-1.5 bg-slate-900/75 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => triggerPhotoUploadFor(item)}
            className="px-2 py-1 rounded bg-white text-slate-900 hover:bg-blue-50 text-[10px] font-semibold flex items-center gap-1"
            title="Upload Pas Foto dari Perangkat"
          >
            <Upload className="w-3 h-3 text-blue-600" />
            <span>Upload</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenUrlModal(item)}
            className="p-1 rounded bg-slate-800 text-white hover:bg-slate-700"
            title="Tempel URL / Link Google Drive Foto"
          >
            <Link2 className="w-3 h-3" />
          </button>
          {item.fotoUrl && (
            <button
              type="button"
              onClick={() => handleRemovePhoto(item)}
              className="p-1 rounded bg-rose-600 text-white hover:bg-rose-700"
              title="Hapus Foto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Full A4/F4 Individual Dossier Sheet Card
  const renderProfilIndividuCard = (item: UnifiedGtkItem, interactive: boolean) => {
    const raw = item.raw;
    const isGuru = item.entityType === 'guru';
    const qrPayload = `GTK|${item.entityType.toUpperCase()}|${item.displayName}|NIP:${item.nip}|NUPTK:${item.nuptk}|${profile.namaSekolah}`;

    return (
      <article
        key={item.id}
        className="bg-white border border-slate-300 rounded-md p-6 text-slate-900 shadow-xs print:shadow-none print:border-slate-400 print:rounded-none print:p-4"
        style={getPrintTypographyStyleVars(printTypography)}
      >
        {showKop && <OfficialKopSurat profile={profile} compact />}

        {/* Judul Lembar Profil */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-2.5 mb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
              {isGuru
                ? 'Kartu Master Data Pendidik (GTK Guru)'
                : 'Kartu Master Data Tenaga Kependidikan (GTK Tendik)'}
            </div>
            <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-950 mt-0.5">
              Kartu Profil Biodata Individu Pegawai
            </h3>
          </div>
          <div className="text-right font-mono tabular-nums text-[11px] text-slate-700 shrink-0">
            <div className="font-bold text-slate-900">
              {item.nip !== '-' ? `NIP. ${item.nip}` : `NUPTK. ${item.nuptk}`}
            </div>
            <div className="text-[10px] text-slate-500">
              Status: {item.statusPegawai} · {item.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
            </div>
          </div>
        </div>

        {/* Hero Identitas + Pas Foto 3:4 + QR */}
        <div className="flex flex-col sm:flex-row gap-5 items-start pb-4 mb-4 border-b border-slate-200">
          {renderPhotoBox(item, 'w-28 h-36 sm:w-30 sm:h-40', interactive)}

          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
                Nama Lengkap & Gelar
              </div>
              <div className="text-lg font-extrabold text-slate-950 leading-snug">
                {item.displayName}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">
                  NIP / NI PPPK
                </span>
                <span className="font-mono font-bold tabular-nums text-slate-900">
                  {item.nip}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">
                  NUPTK
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-900">
                  {item.nuptk}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">
                  Jenis PTK / Jabatan Pokok
                </span>
                <span className="font-semibold text-slate-900">{item.jabatan}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">
                  Pangkat / Golongan Ruang
                </span>
                <span className="font-semibold text-slate-900">{item.pangkatGolongan}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase tracking-wide text-slate-500 block">
                  {isGuru ? 'Mata Pelajaran Diampu' : 'Bidang Tugas Utama'}
                </span>
                <span className="font-semibold text-slate-900">
                  {item.tugasUtama}
                  {item.tugasTambahan !== '-' ? ` · Tugas Tambahan: ${item.tugasTambahan}` : ''}
                </span>
              </div>
            </div>
          </div>

          {showQrCode && (
            <div className="shrink-0 flex flex-col items-center gap-1 border border-slate-200 rounded p-1.5 bg-slate-50/50">
              <ExamCardBarcode value={qrPayload} mode="qr_link" size={62} />
              <span className="text-[9px] font-mono text-slate-500 uppercase">Verifikasi GTK</span>
            </div>
          )}
        </div>

        {/* Section A: Data Pribadi & Domisili */}
        <div className="space-y-4 text-xs">
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
              A. Identitas Pribadi & Kontak Resmi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Tempat, Tgl Lahir</span>
                <span className="font-medium text-slate-900 text-right tabular-nums">
                  {item.tempatLahir}, {item.tanggalLahir}
                </span>
              </div>
              <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Agama / Kewarganegaraan</span>
                <span className="font-medium text-slate-900 text-right">
                  {item.agama} / {raw.kewarganegaraan || 'Indonesia (ID)'}
                </span>
              </div>
              <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                <span className="text-slate-500">No. Handphone / WA</span>
                <span className="font-mono font-semibold text-slate-900 text-right tabular-nums">
                  {item.hp}
                </span>
              </div>
              <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                <span className="text-slate-500">Pos-el / Email</span>
                <span className="font-mono text-slate-900 text-right truncate max-w-[230px]">
                  {item.email}
                </span>
              </div>
              <div className="sm:col-span-2 flex justify-between gap-4 py-0.5 border-b border-slate-100">
                <span className="text-slate-500 shrink-0">Alamat Domisili</span>
                <span className="font-medium text-slate-900 text-right">{item.alamatLengkap}</span>
              </div>
            </div>
          </section>

          {/* Section B: Riwayat SK & Kepegawaian */}
          {showKepegawaian && (
            <section>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                B. Data Kepegawaian & Riwayat SK Kedinasan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Status Kepegawaian</span>
                  <span className="font-semibold text-slate-900 text-right">{item.statusPegawai}</span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Lembaga Pengangkat</span>
                  <span className="font-medium text-slate-900 text-right">
                    {raw.lembagaPengangkatan || 'Pemerintah Provinsi Jawa Timur'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">SK Pengangkatan</span>
                  <span className="font-mono text-slate-900 text-right tabular-nums">
                    {raw.skPengangkatan || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">TMT Pengangkatan</span>
                  <span className="font-mono text-slate-900 text-right tabular-nums">
                    {formatTanggalIndo(raw.tmtPengangkatan)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">SK CPNS / TMT PNS</span>
                  <span className="font-mono text-slate-900 text-right tabular-nums">
                    {raw.skCpns || '-'} / {formatTanggalIndo(raw.tmtPns)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Sumber Gaji / Karpeg</span>
                  <span className="font-medium text-slate-900 text-right">
                    {raw.sumberGaji || 'APBD Provinsi'} · {raw.karpeg || '-'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Section C: Data Keluarga, Pajak & Bank (Opsional Sensitif) */}
          {showSensitive && (
            <section>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                C. Administrasi Kependudukan, Keluarga & Perbankan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">NIK (KTP) / No. KK</span>
                  <span className="font-mono text-slate-900 text-right tabular-nums">
                    {item.nik} / {raw.noKk || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">NPWP</span>
                  <span className="font-mono text-slate-900 text-right tabular-nums">
                    {raw.npwp || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Ibu Kandung</span>
                  <span className="font-medium text-slate-900 text-right">
                    {raw.namaIbuKandung || '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Status & Pasangan</span>
                  <span className="font-medium text-slate-900 text-right">
                    {raw.statusPerkawinan || '-'} ({raw.namaSuamiIstri || '-'})
                  </span>
                </div>
                <div className="sm:col-span-2 flex justify-between gap-3 py-0.5 border-b border-slate-100">
                  <span className="text-slate-500">Rekening Penggajian</span>
                  <span className="font-mono text-slate-900 text-right tabular-nums">
                    {raw.bank || 'Bank Jatim'} · {raw.nomorRekeningBank || '-'} (a.n. {raw.rekeningAtasNama || item.displayName})
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Pengesahan Kepala Sekolah */}
        {showSignatureStamp && (
          <div className="mt-6 pt-3 flex items-end justify-between gap-4 text-xs">
            <div className="text-[10px] text-slate-500 space-y-0.5 max-w-xs">
              <div>Dokumen ini bersumber dari Database Induk GTK {profile.namaSekolah}.</div>
              <div className="font-mono">
                ID Pegawai: {item.id} · Dicetak: {printDateText}
              </div>
            </div>

            <div className="relative w-64 text-left pl-4">
              <div className="text-[11px] text-slate-800">
                {profile.kota || 'Surabaya'}, {printDateText}
              </div>
              <div className="text-[11px] font-semibold text-slate-900">
                Kepala Sekolah,
              </div>
              <div className="relative h-16 my-0.5 flex items-center">
                {resolvedStempelSrc ? (
                  <img
                    src={resolvedStempelSrc}
                    alt="Stempel Sekolah"
                    className="absolute -left-5 top-0 w-16 h-16 object-contain opacity-85 pointer-events-none"
                  />
                ) : (
                  <SchoolStampSvg
                    schoolName={profile.namaSekolah}
                    className="absolute -left-5 top-0 w-16 h-16 opacity-80 pointer-events-none"
                  />
                )}
                {resolvedTtdSrc ? (
                  <img
                    src={resolvedTtdSrc}
                    alt="Tanda Tangan Kepala Sekolah"
                    className="relative z-10 h-13 w-auto object-contain ml-2"
                  />
                ) : (
                  <KepalaSekolahSignatureSvg className="relative z-10 w-28 h-12 ml-2" />
                )}
              </div>
              <div className="font-bold underline text-slate-950 text-[11px]">
                {profile.kepalaSekolah || 'Kepala Sekolah'}
              </div>
              <div className="font-mono text-[10px] text-slate-700 tabular-nums">
                NIP. {profile.nipKepalaSekolah || '-'}
              </div>
            </div>
          </div>
        )}
      </article>
    );
  };

  // Compact ID-Profile Card (2x2 per page or Gallery Card)
  const renderCompactIdCard = (item: UnifiedGtkItem, interactive: boolean) => {
    const isGuru = item.entityType === 'guru';
    const qrPayload = `GTK|${item.entityType.toUpperCase()}|${item.displayName}|NIP:${item.nip}|${profile.namaSekolah}`;

    return (
      <article
        key={item.id}
        className="print-card-avoid bg-white border border-slate-400 rounded-md overflow-hidden text-slate-900 shadow-xs print:shadow-none flex flex-col justify-between"
        style={getPrintTypographyStyleVars(printTypography)}
      >
        {/* Header Resmi Instansi */}
        <div
          className={`px-3.5 py-2.5 text-white flex items-center justify-between gap-2.5 ${
            isGuru ? 'bg-slate-900' : 'bg-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-white/95 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
              {resolvedSchoolLogo ? (
                <img
                  src={resolvedSchoolLogo}
                  alt={profile.namaSekolah}
                  className="w-full h-full object-contain"
                />
              ) : profile.logoType === 'default' || profile.logoType === 'default_vector' ? (
                <Sman9SurabayaLogoSvg className="w-7 h-7" />
              ) : (
                <PemprovJatimLogo className="w-7 h-7" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-widest text-slate-300 font-semibold truncate">
                Kartu Master Data {isGuru ? 'Guru' : 'Tendik'}
              </div>
              <div className="text-xs font-extrabold uppercase tracking-tight truncate">
                {profile.namaSekolah}
              </div>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/15 border border-white/25 shrink-0">
            {item.statusBucket}
          </span>
        </div>

        {/* Body Kartu: Foto 3:4 + Identitas Utama */}
        <div className="p-3.5 flex gap-3.5 items-start flex-1">
          {renderPhotoBox(item, 'w-22 h-29', interactive)}

          <div className="flex-1 min-w-0 space-y-1.5 text-[11px]">
            <div>
              <div className="font-extrabold text-slate-950 text-[13px] leading-tight">
                {item.displayName}
              </div>
              <div className="text-[10px] font-semibold text-slate-600 mt-0.5">
                {item.jabatan} · {item.tugasUtama}
              </div>
            </div>

            <div className="grid grid-cols-[72px_1fr] gap-y-0.5 text-[10.5px] pt-1 border-t border-slate-200">
              <span className="text-slate-500">NIP</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums truncate">
                : {item.nip}
              </span>

              <span className="text-slate-500">NUPTK</span>
              <span className="font-mono text-slate-800 tabular-nums truncate">
                : {item.nuptk}
              </span>

              <span className="text-slate-500">Golongan</span>
              <span className="font-medium text-slate-900 truncate">
                : {item.pangkatGolongan} ({item.statusPegawai})
              </span>

              <span className="text-slate-500">TTL</span>
              <span className="text-slate-800 truncate">
                : {item.tempatLahir}, {item.tanggalLahir}
              </span>

              <span className="text-slate-500">Kontak HP</span>
              <span className="font-mono text-slate-900 tabular-nums truncate">
                : {item.hp}
              </span>

              <span className="text-slate-500">Alamat</span>
              <span className="text-slate-700 line-clamp-2 leading-tight">
                : {item.alamatLengkap}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Kartu: QR Verifikasi & Pengesahan Mini */}
        <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-[9.5px]">
          <div className="flex items-center gap-2 min-w-0">
            {showQrCode && (
              <div className="bg-white p-0.5 border border-slate-200 rounded shrink-0">
                <ExamCardBarcode value={qrPayload} mode="qr_link" size={34} />
              </div>
            )}
            <div className="min-w-0 text-slate-600 leading-tight">
              <div className="font-semibold text-slate-800 truncate">
                {profile.website?.replace(/^https?:\/\//i, '') || 'sman9surabaya.sch.id'}
              </div>
              <div className="font-mono text-[9px] text-slate-500 truncate">
                Email: {item.email}
              </div>
            </div>
          </div>

          {showSignatureStamp && (
            <div className="text-right shrink-0 leading-tight">
              <div className="text-[8.5px] text-slate-500">Kepala Sekolah,</div>
              <div className="font-bold text-slate-900 text-[9.5px] mt-1 underline">
                {profile.kepalaSekolah || 'Kepala Sekolah'}
              </div>
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-4">
      <style>{`
        ${getScopedPrintTypographyCss('.kartu-gtk-print-scope')}
        @media print {
          @page {
            size: ${pageCssSize};
            margin: 10mm 12mm;
          }
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-kartu-gtk-sheet,
          #printable-kartu-gtk-sheet * {
            visibility: visible !important;
          }
          #printable-kartu-gtk-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .kartu-gtk-page-break {
            break-after: page;
            page-break-after: always;
          }
          .kartu-gtk-page-break:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Hidden File Input shared across individual photo upload buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handlePhotoFileSelected}
        className="hidden"
      />

      {/* Top Workspace Control Card (No Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Contact2 className="w-5 h-5 text-blue-700 shrink-0" />
              <h2 className="text-base font-bold text-slate-900">
                Kartu Master Data & Profil Guru dan Tendik
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data diambil langsung secara otomatis dari Database Induk Guru & Tendik, dilengkapi unggah pas foto individu serta siap cetak per pegawai maupun massal.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBrowseMode('fokus')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                  browseMode === 'fokus'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <IdCard className="w-3.5 h-3.5" />
                <span>Fokus Individu</span>
              </button>
              <button
                type="button"
                onClick={() => setBrowseMode('galeri')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                  browseMode === 'galeri'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid2X2 className="w-3.5 h-3.5" />
                <span>Galeri Kartu</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintSingle}
              disabled={!selectedItem}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5 text-blue-700" />
              <span>Cetak Individu Ini</span>
            </button>

            <button
              type="button"
              onClick={handlePrintBatch}
              disabled={filteredList.length === 0}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Semua ({filteredList.length})</span>
            </button>
          </div>
        </div>

        {/* Inline Feedback Toast */}
        {feedback && (
          <div
            className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-md border text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-500 hover:text-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Compact Summary Strip (Tabular Numerals) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Total GTK Terdaftar
            </div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
              {stats.total} <span className="text-xs font-medium text-slate-500">pegawai</span>
            </div>
          </div>
          <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Tenaga Pendidik (Guru)
            </div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
              {stats.guruCount}
            </div>
          </div>
          <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Tenaga Kependidikan
            </div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
              {stats.tendikCount}
            </div>
          </div>
          <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Pas Foto Terpasang
            </div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums mt-0.5">
              {stats.photoCount}
              <span className="text-xs font-medium text-slate-500"> / {stats.total}</span>
            </div>
          </div>
        </div>

        {/* Filter & Format Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari nama, NIP, NUPTK, mapel, atau jabatan..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-800"
            aria-label="Filter Kategori GTK"
          >
            <option value="all">Semua GTK ({stats.total})</option>
            <option value="guru">Guru / Pendidik ({stats.guruCount})</option>
            <option value="tendik">Tendik / Karyawan ({stats.tendikCount})</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-800"
            aria-label="Filter Status Kepegawaian"
          >
            <option value="all">Semua Status ASN/Non-ASN</option>
            <option value="PNS">PNS</option>
            <option value="PPPK">PPPK</option>
            <option value="HONORER">GTT / PTT / Honorer</option>
          </select>

          <select
            value={photoFilter}
            onChange={e => setPhotoFilter(e.target.value as PhotoFilter)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-800"
            aria-label="Filter Status Foto"
          >
            <option value="all">Semua Status Foto</option>
            <option value="has_photo">Sudah Ada Foto</option>
            <option value="no_photo">Belum Ada Foto</option>
          </select>

          <select
            value={cardMode}
            onChange={e => setCardMode(e.target.value as CardLayoutMode)}
            className="px-2.5 py-1.5 border border-blue-300 rounded-md bg-blue-50 font-semibold text-blue-900"
            aria-label="Format Kartu"
          >
            <option value="profil_individu">Format 1: Profil Biodata Lengkap (1/Hal)</option>
            <option value="kartu_id">Format 2: Kartu ID GTK Ringkas (4/Hal)</option>
          </select>

          <select
            value={paperSize}
            onChange={e => setPaperSize(e.target.value as PaperSizeOption)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-800"
            aria-label="Ukuran Kertas"
          >
            <option value="A4">Kertas A4</option>
            <option value="F4">Kertas F4 / Folio</option>
          </select>
        </div>

        {/* Toggle Visibility & Typography Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-[11px]">
          <div className="flex flex-wrap items-center gap-3 text-slate-700">
            {cardMode === 'profil_individu' && (
              <>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showKop}
                    onChange={e => setShowKop(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Kop Surat Resmi</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showKepegawaian}
                    onChange={e => setShowKepegawaian(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Riwayat SK & TMT</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSensitive}
                    onChange={e => setShowSensitive(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Data NIK, NPWP, Keluarga & Bank</span>
                </label>
              </>
            )}
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showQrCode}
                onChange={e => setShowQrCode(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>QR Verifikasi</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSignatureStamp}
                onChange={e => setShowSignatureStamp(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>TTD & Stempel Kepala Sekolah</span>
            </label>
            {showSignatureStamp && cardMode === 'profil_individu' && (
              <input
                type="text"
                value={printDateText}
                onChange={e => setPrintDateText(e.target.value)}
                className="px-2 py-0.5 border border-slate-300 rounded text-[11px] font-medium w-36"
                title="Tanggal Pengesahan Kartu"
              />
            )}
          </div>

          <PrintTypographyBar
            value={printTypography}
            onChange={handleUpdateTypography}
            previewZoomPct={browseMode === 'fokus' ? previewZoomPct : undefined}
            onPreviewZoomChange={browseMode === 'fokus' ? setPreviewZoomPct : undefined}
            zoomPresets={[75, 85, 100]}
            compact
          />
        </div>
      </div>

      {/* Main Content Area (No Print - Screen Workspace) */}
      <div className="no-print">
        {filteredList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-500">
            Tidak ada data guru atau tendik yang cocok dengan pencarian/filter saat ini.
          </div>
        ) : browseMode === 'fokus' && selectedItem ? (
          <div className="grid grid-cols-1 lg:grid-cols-[310px_1fr] gap-4 items-start">
            {/* Left Directory Roster */}
            <aside className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Daftar GTK ({filteredList.length})</span>
                <span className="text-[10px] font-mono text-slate-500">
                  Klik nama untuk lihat kartu
                </span>
              </div>
              <div className="max-h-[720px] overflow-y-auto divide-y divide-slate-100">
                {filteredList.map(item => {
                  const active = item.id === selectedItem.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                        active ? 'bg-blue-50/90' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-9 h-11 rounded overflow-hidden border border-slate-200 bg-slate-100 shrink-0 flex items-center justify-center">
                        {item.fotoUrl ? (
                          <img
                            src={item.fotoUrl}
                            alt={item.displayName}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">
                            {getInitials(item.displayName)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-bold truncate ${
                            active ? 'text-blue-950' : 'text-slate-900'
                          }`}
                        >
                          {item.displayName}
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate">
                          {item.entityType === 'guru' ? 'Guru' : 'Tendik'} · {item.tugasUtama}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate tabular-nums">
                          {item.nip !== '-' ? item.nip : `NUPTK ${item.nuptk}`}
                        </div>
                      </div>
                      {item.fotoUrl ? (
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Camera className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Right Active Individual Card Workspace */}
            <div className="space-y-3">
              {/* Individual Action Bar */}
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={selectedIndex <= 0}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                    title="Pegawai Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-[11px] text-slate-600 tabular-nums px-1.5">
                    {selectedIndex + 1} / {filteredList.length}
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={selectedIndex < 0 || selectedIndex >= filteredList.length - 1}
                    className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                    title="Pegawai Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => triggerPhotoUploadFor(selectedItem)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{selectedItem.fotoUrl ? 'Ganti Pas Foto' : 'Upload Pas Foto'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenUrlModal(selectedItem)}
                        className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded font-medium flex items-center gap-1.5"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Link URL Foto</span>
                      </button>
                      {selectedItem.fotoUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(selectedItem)}
                          className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded font-medium flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Foto</span>
                        </button>
                      )}
                    </>
                  )}
                  {onSelectForLetter && (
                    <button
                      type="button"
                      onClick={() =>
                        onSelectForLetter({ type: selectedItem.entityType, data: selectedItem.raw })
                      }
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-semibold flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Buat SPT</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card Preview Surface */}
              <div
                className="kartu-gtk-print-scope origin-top transition-transform"
                style={{
                  transform: previewZoomPct !== 100 ? `scale(${previewZoomPct / 100})` : undefined
                }}
              >
                {cardMode === 'profil_individu' ? (
                  renderProfilIndividuCard(selectedItem, true)
                ) : (
                  <div className="max-w-lg mx-auto">
                    {renderCompactIdCard(selectedItem, true)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Gallery Mode: Grid of Individual Cards */
          <div
            className={`kartu-gtk-print-scope grid gap-4 ${
              cardMode === 'kartu_id'
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 xl:grid-cols-2'
            }`}
          >
            {filteredList.map(item => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800 truncate">{item.displayName}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => triggerPhotoUploadFor(item)}
                        className="px-2 py-0.5 border border-slate-300 bg-white hover:bg-slate-50 rounded font-medium flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3 text-blue-600" />
                        <span>{item.fotoUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        setPrintScope('single');
                        setTimeout(() => window.print(), 80);
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Cetak</span>
                    </button>
                  </div>
                </div>
                {cardMode === 'profil_individu'
                  ? renderProfilIndividuCard(item, true)
                  : renderCompactIdCard(item, true)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dedicated Hidden-on-Screen Printable Sheet */}
      <div id="printable-kartu-gtk-sheet" className="hidden print:block kartu-gtk-print-scope">
        {cardMode === 'profil_individu' ? (
          <div>
            {printItems.map(item => (
              <div key={`print-prof-${item.id}`} className="kartu-gtk-page-break">
                {renderProfilIndividuCard(item, false)}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {printItems.map(item => (
              <div key={`print-id-${item.id}`} className="print-card-avoid">
                {renderCompactIdCard(item, false)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URL Photo Input Modal */}
      {urlModalTarget && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Tautan Foto Profil GTK</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{urlModalTarget.displayName}</p>
              </div>
              <button
                type="button"
                onClick={() => setUrlModalTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePhotoUrl} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  URL Gambar / Tautan Berbagi Google Drive:
                </label>
                <input
                  type="url"
                  required
                  value={urlInputValue}
                  onChange={e => setUrlInputValue(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view"
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs"
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Tautan Google Drive yang dibagikan publik otomatis dikonversi menjadi pratinjau pas foto.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUrlModalTarget(null)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold"
                >
                  Simpan Foto URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
