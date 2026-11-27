import React, { useMemo, useState } from 'react';
import {
  BukuIndukActiveConfig,
  BukuIndukEkskulItem,
  BukuIndukKurikulumRepoItem,
  BukuIndukSemesterScore,
  BukuIndukSiswaMeta,
  BukuIndukTahunMeta,
  KurikulumJenis,
  KurikulumMapelItem,
  SchoolProfile,
  Siswa,
  User
} from '../types';
import {
  appendAuditLog,
  cloneKurikulumMapelList,
  computeKurikulumSignature,
  createKurikulumRepoFromConfig,
  ensureCurrentKurikulumArchivedInRepo,
  exportBukuIndukSiswaToExcel,
  getStoredBukuIndukConfig,
  getStoredBukuIndukKurikulumRepo,
  getStoredBukuIndukSiswaMeta,
  saveStoredBukuIndukConfig,
  saveStoredBukuIndukKurikulumRepo,
  saveStoredBukuIndukSiswaMeta
} from '../services/storageService';
import {
  extractTingkatFromKelas,
  resolveSusunanPelajaranUntukSiswa
} from '../utils/kurikulumPresets';
import {
  cleanIndukDisplay,
  normalizeMapelMatchKey,
  parseLembarBukuIndukText,
  sanitizeIndukField
} from '../utils/bukuIndukParser';
import {
  BukuIndukLembarNilaiSheet,
  BukuIndukOrientation,
  BukuIndukPaperSize
} from './BukuIndukLembarNilaiSheet';
import {
  PrintTypographySettings,
  getStoredPrintTypography,
  saveStoredPrintTypography,
  resolvePrintFontOption,
  resolvePrintSpacingMeta
} from '../utils/printTypography';
import { PrintTypographyBar } from './PrintTypographyBar';
import { OfficialKopSurat } from './OfficialKopSurat';
import { KepalaSekolahSignatureSvg, SchoolStampSvg, Sman9WavyWatermarkBg } from './OfficialStamps';
import { ExamCardBarcode, resolveDirectImageUrl } from './ExamCardBarcode';
import {
  Archive,
  BookMarked,
  BookmarkCheck,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  FileSpreadsheet,
  FolderOpen,
  Layers,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Square,
  Trash2,
  Users,
  X,
  AlertCircle
} from 'lucide-react';

interface BukuIndukSiswaViewProps {
  profile: SchoolProfile;
  currentUser: User;
  siswaList: Siswa[];
  fallbackTtdKsUrl?: string;
  fallbackStempelUrl?: string;
  onUpdateSiswa?: (list: Siswa[]) => void;
}

const KURIKULUM_JENIS_OPTIONS: KurikulumJenis[] = [
  'Kurikulum Merdeka',
  'Kurikulum 2013 (K-13)',
  'KTSP 2006',
  'Kurikulum Nasional (Permendikbudristek 12/2024)',
  'Kustom Sekolah'
];

const SEMESTER_KEYS = ['Smt 1', 'Smt 2', 'Smt 3', 'Smt 4', 'Smt 5', 'Smt 6'] as const;

export const BukuIndukSiswaView: React.FC<BukuIndukSiswaViewProps> = ({
  profile,
  siswaList,
  fallbackTtdKsUrl,
  fallbackStempelUrl,
  onUpdateSiswa
}) => {
  const [activeTab, setActiveTab] = useState<'induk' | 'kurikulum' | 'repositori'>('induk');
  const [activeConfig, setActiveConfig] = useState<BukuIndukActiveConfig>(() =>
    getStoredBukuIndukConfig()
  );
  const [kurikulumRepo, setKurikulumRepo] = useState<BukuIndukKurikulumRepoItem[]>(() =>
    getStoredBukuIndukKurikulumRepo()
  );
  const [siswaMetaMap, setSiswaMetaMap] = useState<Record<string, BukuIndukSiswaMeta>>(() =>
    getStoredBukuIndukSiswaMeta()
  );

  // Filter & selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Aktif' | 'Alumni' | 'Pindah'>('all');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(() => siswaList[0]?.id || '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'individu' | 'terpilih' | 'tersaring'>('individu');
  const [activeSheetType, setActiveSheetType] = useState<'identitas' | 'nilai'>('identitas');
  const [sheetFormat, setSheetFormat] = useState<'standar_57' | 'ringkas'>('standar_57');
  const [identitasPaper, setIdentitasPaper] = useState<BukuIndukPaperSize>('F4');
  const [identitasOrientation, setIdentitasOrientation] = useState<BukuIndukOrientation>('portrait');
  const [identitasScalePct, setIdentitasScalePct] = useState<number>(100);
  const [showIdentitasWatermark, setShowIdentitasWatermark] = useState<boolean>(true);
  const [identitasWatermarkOpacity, setIdentitasWatermarkOpacity] = useState<number>(11);
  const [waveRowGapPx, setWaveRowGapPx] = useState<number>(52);
  const [waveWordGapPx, setWaveWordGapPx] = useState<number>(20);
  const [nilaiPaper, setNilaiPaper] = useState<BukuIndukPaperSize>('F4');
  const [nilaiOrientation, setNilaiOrientation] = useState<BukuIndukOrientation>('landscape');
  const [nilaiScalePct, setNilaiScalePct] = useState<number>(100);
  const [typography, setTypography] = useState<PrintTypographySettings>(() =>
    getStoredPrintTypography('sman9_buku_induk_typo_v1')
  );
  const [previewZoomPct, setPreviewZoomPct] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 48 : 85
  );
  const updateTypography = (next: PrintTypographySettings) => {
    setTypography(next);
    saveStoredPrintTypography('sman9_buku_induk_typo_v1', next);
  };

  // Condition preview toggle & semester grade editor
  const [conditionPreviewMode, setConditionPreviewMode] = useState<'auto' | 'all' | 'X' | 'XI' | 'XII'>('auto');
  const [activeGradeSemester, setActiveGradeSemester] = useState<string>('Smt 1');
  const [showGradeEditor, setShowGradeEditor] = useState<boolean>(false);
  const [showDetail57Editor, setShowDetail57Editor] = useState<boolean>(false);
  const [showHal2PerkembanganEditor, setShowHal2PerkembanganEditor] = useState<boolean>(false);
  const [showPasteImportBox, setShowPasteImportBox] = useState<boolean>(false);
  const [pasteRawText, setPasteRawText] = useState<string>('');

  // Repository UI states
  const [repoNameInput, setRepoNameInput] = useState<string>(() =>
    `${activeConfig.jenisKurikulum} (${activeConfig.tahunPelajaran})`
  );
  const [repoDescInput, setRepoDescInput] = useState<string>('');
  const [repoSearchQuery, setRepoSearchQuery] = useState<string>('');
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);
  const [renamingRepoId, setRenamingRepoId] = useState<string | null>(null);
  const [renamingRepoValue, setRenamingRepoValue] = useState<string>('');
  const [confirmDeleteRepoId, setConfirmDeleteRepoId] = useState<string | null>(null);
  const [mapelFilterTingkat, setMapelFilterTingkat] = useState<'Semua' | 'X' | 'XI' | 'XII'>('Semua');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const updateActiveConfig = (next: BukuIndukActiveConfig) => {
    setActiveConfig(next);
    saveStoredBukuIndukConfig(next);
  };

  const updateSiswaMeta = (siswaId: string, patch: Partial<BukuIndukSiswaMeta>) => {
    setSiswaMetaMap(prev => {
      const current = prev[siswaId] || { siswaId };
      const next = {
        ...prev,
        [siswaId]: {
          ...current,
          ...patch,
          siswaId
        }
      };
      saveStoredBukuIndukSiswaMeta(next);
      return next;
    });
  };

  const updateSiswaMapelNilai = (siswaId: string, semester: string, mapelId: string, nilai: string) => {
    setSiswaMetaMap(prev => {
      const current = prev[siswaId] || { siswaId };
      const existingGrades = current.nilaiPerMapel || {};
      const semGrades = existingGrades[semester] || {};
      const next = {
        ...prev,
        [siswaId]: {
          ...current,
          siswaId,
          nilaiPerMapel: {
            ...existingGrades,
            [semester]: {
              ...semGrades,
              [mapelId]: nilai
            }
          }
        }
      };
      saveStoredBukuIndukSiswaMeta(next);
      return next;
    });
  };

  const updateSiswaTranskripScore = (
    siswaId: string,
    mapel: KurikulumMapelItem,
    semIndex1to6: number,
    patch: Partial<BukuIndukSemesterScore> & {
      rataRapor?: string;
      nilaiUs?: string;
      nilaiIjazah?: string;
    }
  ) => {
    const sKey = `S${semIndex1to6}`;
    const legacySemKey = `Smt ${semIndex1to6}`;
    setSiswaMetaMap(prev => {
      const current = prev[siswaId] || { siswaId };
      const transkrip = current.transkripNilai || {};
      const existingRec = transkrip[mapel.id] || {
        mapelKey: mapel.id,
        namaMapel: mapel.namaMapel,
        kelompok: mapel.kelompok,
        kkm: mapel.kkm ? String(mapel.kkm) : '75',
        semesters: {}
      };
      const existingSem = existingRec.semesters[sKey] || {};
      const { rataRapor, nilaiUs, nilaiIjazah, ...semPatch } = patch;
      const updatedSem: BukuIndukSemesterScore = {
        ...existingSem,
        ...semPatch
      };
      const nextNilaiPerMapel = { ...(current.nilaiPerMapel || {}) };
      const syncVal = semPatch.nilaiAkhir ?? semPatch.pengN;
      if (syncVal !== undefined) {
        nextNilaiPerMapel[legacySemKey] = {
          ...(nextNilaiPerMapel[legacySemKey] || {}),
          [mapel.id]: syncVal
        };
      }
      const next: Record<string, BukuIndukSiswaMeta> = {
        ...prev,
        [siswaId]: {
          ...current,
          siswaId,
          nilaiPerMapel: nextNilaiPerMapel,
          transkripNilai: {
            ...transkrip,
            [mapel.id]: {
              ...existingRec,
              ...(rataRapor !== undefined ? { rataRapor } : {}),
              ...(nilaiUs !== undefined ? { nilaiUs } : {}),
              ...(nilaiIjazah !== undefined ? { nilaiIjazah } : {}),
              semesters: {
                ...existingRec.semesters,
                [sKey]: updatedSem
              }
            }
          }
        }
      };
      saveStoredBukuIndukSiswaMeta(next);
      return next;
    });
  };

  const updateTahunAjaranField = (
    siswaId: string,
    yearKey: 'X' | 'XI' | 'XII',
    patch: Partial<BukuIndukTahunMeta>
  ) => {
    setSiswaMetaMap(prev => {
      const current = prev[siswaId] || { siswaId };
      const existingYearMap = current.tahunAjaranMeta || {};
      const next: Record<string, BukuIndukSiswaMeta> = {
        ...prev,
        [siswaId]: {
          ...current,
          siswaId,
          tahunAjaranMeta: {
            ...existingYearMap,
            [yearKey]: {
              ...(existingYearMap[yearKey] || {}),
              ...patch
            }
          }
        }
      };
      saveStoredBukuIndukSiswaMeta(next);
      return next;
    });
  };

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    siswaList.forEach(s => {
      const k = (s.rombelSaatIni || s.kelas || '').trim();
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [siswaList]);

  const filteredSiswa = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return siswaList.filter(s => {
      const kelas = (s.rombelSaatIni || s.kelas || '').trim();
      const meta = siswaMetaMap[s.id];
      const noInduk = (meta?.nomorBukuInduk || s.nipd || s.nis || '').toLowerCase();
      const matchSearch =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        noInduk.includes(q) ||
        (s.nisn || '').toLowerCase().includes(q) ||
        kelas.toLowerCase().includes(q);
      const matchKelas = filterKelas === 'all' || kelas === filterKelas;
      const matchStatus = filterStatus === 'all' || (s.status || 'Aktif') === filterStatus;
      return matchSearch && matchKelas && matchStatus;
    });
  }, [siswaList, searchQuery, filterKelas, filterStatus, siswaMetaMap]);

  const activeSiswa = useMemo(() => {
    return (
      siswaList.find(s => s.id === selectedSiswaId) ||
      filteredSiswa[0] ||
      siswaList[0] ||
      null
    );
  }, [siswaList, selectedSiswaId, filteredSiswa]);

  const activeSignature = useMemo(
    () => computeKurikulumSignature(activeConfig.jenisKurikulum, activeConfig.susunanPelajaran),
    [activeConfig.jenisKurikulum, activeConfig.susunanPelajaran]
  );

  const matchedRepoItem = useMemo(
    () =>
      kurikulumRepo.find(
        r => computeKurikulumSignature(r.jenisKurikulum, r.susunanPelajaran) === activeSignature
      ) || null,
    [kurikulumRepo, activeSignature]
  );

  const linkedRepoItem = useMemo(
    () => kurikulumRepo.find(r => r.id === activeConfig.activeKurikulumRepoId) || null,
    [kurikulumRepo, activeConfig.activeKurikulumRepoId]
  );

  const filteredRepoList = useMemo(() => {
    const q = repoSearchQuery.toLowerCase().trim();
    if (!q) return kurikulumRepo;
    return kurikulumRepo.filter(
      r =>
        r.nama.toLowerCase().includes(q) ||
        r.jenisKurikulum.toLowerCase().includes(q) ||
        r.tahunPelajaran.toLowerCase().includes(q) ||
        (r.deskripsi || '').toLowerCase().includes(q) ||
        r.susunanPelajaran.some(m => m.namaMapel.toLowerCase().includes(q))
    );
  }, [kurikulumRepo, repoSearchQuery]);

  // Resolve effective curriculum & conditional subject list for a specific student
  const resolveCurriculumForStudent = (student: Siswa) => {
    const meta = siswaMetaMap[student.id];
    const overrideRepo = meta?.kurikulumKhususId
      ? kurikulumRepo.find(r => r.id === meta.kurikulumKhususId)
      : undefined;

    const sourceName = overrideRepo ? overrideRepo.nama : activeConfig.namaKurikulumAktif;
    const sourceJenis = overrideRepo ? overrideRepo.jenisKurikulum : activeConfig.jenisKurikulum;
    const sourceTahun = overrideRepo ? overrideRepo.tahunPelajaran : activeConfig.tahunPelajaran;
    const sourceSk = overrideRepo ? overrideRepo.skKurikulum : activeConfig.skKurikulum;
    const rawMapel = overrideRepo ? overrideRepo.susunanPelajaran : activeConfig.susunanPelajaran;

    const resolvedMapel = resolveSusunanPelajaranUntukSiswa(rawMapel, student, {
      showAllIgnoringCondition: conditionPreviewMode === 'all',
      overrideTingkat:
        conditionPreviewMode === 'X' ||
        conditionPreviewMode === 'XI' ||
        conditionPreviewMode === 'XII'
          ? conditionPreviewMode
          : undefined
    });

    return {
      isOverridden: Boolean(overrideRepo),
      sourceName,
      sourceJenis,
      sourceTahun,
      sourceSk,
      resolvedMapel,
      totalRawMapel: rawMapel.length
    };
  };

  // Curriculum Repository Handlers (non-destructive)
  const handleSaveKurikulumAsNew = () => {
    if (activeConfig.susunanPelajaran.length === 0) {
      notify('error', 'Susunan pelajaran masih kosong. Tambahkan minimal 1 mata pelajaran.');
      return;
    }
    const baseName =
      repoNameInput.trim() ||
      `${activeConfig.jenisKurikulum} (${activeConfig.tahunPelajaran})`.trim();
    const dupCount = kurikulumRepo.filter(
      r => r.nama.toLowerCase() === baseName.toLowerCase()
    ).length;
    const finalName = dupCount > 0 ? `${baseName} #${dupCount + 1}` : baseName;

    const newItem = createKurikulumRepoFromConfig(
      { ...activeConfig, namaKurikulumAktif: finalName },
      {
        nama: finalName,
        deskripsi: repoDescInput.trim() || `${activeConfig.susunanPelajaran.length} mata pelajaran`
      }
    );
    const nextRepo = [newItem, ...kurikulumRepo];
    setKurikulumRepo(nextRepo);
    saveStoredBukuIndukKurikulumRepo(nextRepo);
    updateActiveConfig({
      ...activeConfig,
      activeKurikulumRepoId: newItem.id,
      namaKurikulumAktif: finalName
    });
    setRepoDescInput('');
    appendAuditLog(
      'SIMPAN_REPOSITORI_KURIKULUM',
      `Menyimpan paket kurikulum "${newItem.nama}" (${newItem.susunanPelajaran.length} mapel) ke repositori Buku Induk.`
    );
    notify('success', `Kurikulum "${newItem.nama}" tersimpan ke repositori tanpa menimpa data lama.`);
  };

  const handleUpdateLinkedRepoItem = (targetId: string) => {
    const target = kurikulumRepo.find(r => r.id === targetId);
    if (!target) return;
    const nowIso = new Date().toISOString();
    const nextRepo = kurikulumRepo.map(r =>
      r.id === targetId
        ? {
            ...r,
            jenisKurikulum: activeConfig.jenisKurikulum,
            tahunPelajaran: activeConfig.tahunPelajaran,
            faseDefault: activeConfig.faseDefault,
            skKurikulum: activeConfig.skKurikulum,
            skalaNilai: activeConfig.skalaNilai,
            susunanPelajaran: cloneKurikulumMapelList(activeConfig.susunanPelajaran),
            isAutoArchive: false,
            updatedAt: nowIso
          }
        : r
    );
    setKurikulumRepo(nextRepo);
    saveStoredBukuIndukKurikulumRepo(nextRepo);
    appendAuditLog(
      'PERBARUI_REPOSITORI_KURIKULUM',
      `Memperbarui kurikulum "${target.nama}" (${activeConfig.susunanPelajaran.length} mapel).`
    );
    notify('success', `Perubahan kurikulum berhasil diperbarui pada "${target.nama}".`);
  };

  const handleCreateFreshKurikulum = () => {
    const { repo: nextRepo, archivedItem } = ensureCurrentKurikulumArchivedInRepo(
      activeConfig,
      kurikulumRepo,
      'Sebelum Kurikulum Baru'
    );
    if (archivedItem) setKurikulumRepo(nextRepo);

    const starterMapel: KurikulumMapelItem = {
      id: `mapel-${Date.now()}`,
      kode: 'MP-01',
      kelompok: 'A. Mata Pelajaran Wajib',
      namaMapel: 'Pendidikan Agama dan Budi Pekerti',
      jpPerMinggu: 3,
      kkm: 75,
      kondisiTingkat: 'Semua',
      kondisiRumpun: 'Semua',
      kondisiStatus: 'Wajib'
    };

    updateActiveConfig({
      activeKurikulumRepoId: undefined,
      jenisKurikulum: 'Kustom Sekolah',
      namaKurikulumAktif: 'Kurikulum Baru (Draf)',
      tahunPelajaran: activeConfig.tahunPelajaran,
      faseDefault: 'Fase E & F',
      skKurikulum: '',
      skalaNilai: '0-100',
      susunanPelajaran: [starterMapel],
      kotaTanggalCetak: activeConfig.kotaTanggalCetak
    });
    setRepoNameInput('');
    setRepoDescInput('');
    setActiveTab('kurikulum');
    notify(
      'success',
      archivedItem
        ? `Kurikulum sebelumnya diamankan ke repositori ("${archivedItem.nama}"). Lembar kurikulum baru siap disusun.`
        : 'Kurikulum sebelumnya aman di repositori. Lembar susunan pelajaran baru siap diisi.'
    );
  };

  const handleApplyRepoKurikulum = (item: BukuIndukKurikulumRepoItem) => {
    const { repo: nextRepo, archivedItem } = ensureCurrentKurikulumArchivedInRepo(
      activeConfig,
      kurikulumRepo,
      'Cadangan Sebelum Apply'
    );
    if (archivedItem) setKurikulumRepo(nextRepo);

    updateActiveConfig({
      activeKurikulumRepoId: item.id,
      jenisKurikulum: item.jenisKurikulum,
      namaKurikulumAktif: item.nama,
      tahunPelajaran: item.tahunPelajaran,
      faseDefault: item.faseDefault,
      skKurikulum: item.skKurikulum,
      skalaNilai: item.skalaNilai || '0-100',
      susunanPelajaran: cloneKurikulumMapelList(item.susunanPelajaran),
      kotaTanggalCetak: activeConfig.kotaTanggalCetak
    });
    setRepoNameInput(item.nama);
    appendAuditLog(
      'APPLY_KURIKULUM_BUKU_INDUK',
      `Menerapkan kurikulum "${item.nama}" (${item.susunanPelajaran.length} mapel) pada Buku Induk Siswa.`
    );
    notify(
      'success',
      archivedItem
        ? `Kurikulum sebelumnya diamankan ke "${archivedItem.nama}". Kurikulum "${item.nama}" (${item.susunanPelajaran.length} mapel) kini diterapkan.`
        : `Berhasil menerapkan kurikulum "${item.nama}" (${item.susunanPelajaran.length} mapel) ke Buku Induk Siswa.`
    );
  };

  const handleDuplicateRepoKurikulum = (item: BukuIndukKurikulumRepoItem) => {
    const nowIso = new Date().toISOString();
    const copy: BukuIndukKurikulumRepoItem = {
      ...item,
      id: `krepo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      nama: `${item.nama} (Salinan)`,
      isDefaultSeed: false,
      isAutoArchive: false,
      susunanPelajaran: cloneKurikulumMapelList(item.susunanPelajaran),
      createdAt: nowIso,
      updatedAt: nowIso
    };
    const nextRepo = [copy, ...kurikulumRepo];
    setKurikulumRepo(nextRepo);
    saveStoredBukuIndukKurikulumRepo(nextRepo);
    notify('success', `Salinan "${copy.nama}" ditambahkan ke repositori.`);
  };

  const handleSaveRenameRepo = (id: string) => {
    const trimmed = renamingRepoValue.trim();
    if (!trimmed) {
      setRenamingRepoId(null);
      return;
    }
    const nextRepo = kurikulumRepo.map(r =>
      r.id === id ? { ...r, nama: trimmed, updatedAt: new Date().toISOString() } : r
    );
    setKurikulumRepo(nextRepo);
    saveStoredBukuIndukKurikulumRepo(nextRepo);
    if (activeConfig.activeKurikulumRepoId === id) {
      updateActiveConfig({ ...activeConfig, namaKurikulumAktif: trimmed });
    }
    setRenamingRepoId(null);
    notify('success', `Nama kurikulum diubah menjadi "${trimmed}".`);
  };

  const handleDeleteRepo = (id: string) => {
    const target = kurikulumRepo.find(r => r.id === id);
    const nextRepo = kurikulumRepo.filter(r => r.id !== id);
    setKurikulumRepo(nextRepo);
    saveStoredBukuIndukKurikulumRepo(nextRepo);
    setConfirmDeleteRepoId(null);
    if (activeConfig.activeKurikulumRepoId === id) {
      updateActiveConfig({ ...activeConfig, activeKurikulumRepoId: undefined });
    }
    if (target) {
      appendAuditLog('HAPUS_REPOSITORI_KURIKULUM', `Menghapus entri repositori kurikulum "${target.nama}".`);
      notify('success', `Entri "${target.nama}" dihapus dari repositori.`);
    }
  };

  // Susunan Pelajaran CRUD
  const handleAddMapelRow = () => {
    const nextIdx = activeConfig.susunanPelajaran.length + 1;
    const newRow: KurikulumMapelItem = {
      id: `mapel-${Date.now()}`,
      kode: `MP-${String(nextIdx).padStart(2, '0')}`,
      kelompok: 'B. Mata Pelajaran Pilihan',
      namaMapel: `Mata Pelajaran Baru ${nextIdx}`,
      jpPerMinggu: 2,
      kkm: 75,
      kondisiTingkat: mapelFilterTingkat === 'Semua' ? 'Semua' : mapelFilterTingkat,
      kondisiRumpun: 'Semua',
      kondisiStatus: 'Wajib'
    };
    updateActiveConfig({
      ...activeConfig,
      susunanPelajaran: [...activeConfig.susunanPelajaran, newRow]
    });
  };

  const handleUpdateMapelRow = (id: string, patch: Partial<KurikulumMapelItem>) => {
    const next = activeConfig.susunanPelajaran.map(m => (m.id === id ? { ...m, ...patch } : m));
    updateActiveConfig({ ...activeConfig, susunanPelajaran: next });
  };

  const handleRemoveMapelRow = (id: string) => {
    const next = activeConfig.susunanPelajaran.filter(m => m.id !== id);
    updateActiveConfig({ ...activeConfig, susunanPelajaran: next });
  };

  // Print target students
  const studentsToPrint = useMemo(() => {
    if (printMode === 'terpilih' && selectedIds.length > 0) {
      return siswaList.filter(s => selectedIds.includes(s.id));
    }
    if (printMode === 'tersaring') {
      return filteredSiswa;
    }
    return activeSiswa ? [activeSiswa] : [];
  }, [printMode, selectedIds, siswaList, filteredSiswa, activeSiswa]);

  const currentPaper: BukuIndukPaperSize =
    activeSheetType === 'identitas' ? identitasPaper : nilaiPaper;
  const currentOrientation: BukuIndukOrientation =
    activeSheetType === 'identitas' ? identitasOrientation : nilaiOrientation;
  const currentScalePct =
    activeSheetType === 'identitas' ? identitasScalePct : nilaiScalePct;

  const setCurrentPaper = (sz: BukuIndukPaperSize) => {
    if (activeSheetType === 'identitas') setIdentitasPaper(sz);
    else setNilaiPaper(sz);
  };
  const setCurrentOrientation = (ori: BukuIndukOrientation) => {
    if (activeSheetType === 'identitas') setIdentitasOrientation(ori);
    else setNilaiOrientation(ori);
  };
  const setCurrentScalePct = (pct: number) => {
    if (activeSheetType === 'identitas') setIdentitasScalePct(pct);
    else setNilaiScalePct(pct);
  };

  const basePaperDims =
    currentPaper === 'A3'
      ? { w: 297, h: 420 }
      : currentPaper === 'F4'
      ? { w: 215, h: 330 }
      : { w: 210, h: 297 };
  const pageWidthMm = currentOrientation === 'landscape' ? basePaperDims.h : basePaperDims.w;
  const pageHeightMm = currentOrientation === 'landscape' ? basePaperDims.w : basePaperDims.h;
  const pageMarginMm = currentPaper === 'A3' ? 10 : 8;

  const handlePrintBukuInduk = () => {
    appendAuditLog(
      'CETAK_BUKU_INDUK_SISWA',
      `Mencetak ${studentsToPrint.length} lembar ${activeSheetType === 'identitas' ? 'Identitas' : 'Nilai'} Buku Induk (${activeConfig.jenisKurikulum} · ${currentPaper} ${currentOrientation}).`
    );
    window.print();
  };

  // Render Lembar Identitas (terpisah) ATAU Lembar Nilai (terpisah)
  const renderBukuIndukSheet = (student: Siswa, idx: number) => {
    const meta = siswaMetaMap[student.id];
    const resolved = resolveCurriculumForStudent(student);
    const noInduk = meta?.nomorBukuInduk || student.nipd || student.nis || '-';
    const tingkat = extractTingkatFromKelas(student.rombelSaatIni || student.kelas);
    const photoSrc = student.fotoUrl?.trim() ? resolveDirectImageUrl(student.fotoUrl) : '';
    const effectiveTtdUrl = fallbackTtdKsUrl || '';
    const effectiveStempelUrl = fallbackStempelUrl || '';

    if (activeSheetType === 'nilai') {
      return (
        <BukuIndukLembarNilaiSheet
          key={`${student.id}-nilai-${idx}`}
          student={student}
          meta={meta}
          resolved={resolved}
          profile={profile}
          activeConfig={activeConfig}
          paperSize={nilaiPaper}
          orientation={nilaiOrientation}
          printScalePct={nilaiScalePct}
          typography={typography}
          fallbackTtdUrl={effectiveTtdUrl}
          fallbackStempelUrl={effectiveStempelUrl}
        />
      );
    }

    const typoFont = resolvePrintFontOption(typography.fontFamily);
    const typoSp = resolvePrintSpacingMeta(typography.lineSpacing);
    const typoTextScale = (typography.fontScalePct || 100) / 100;
    const spFactor = typoSp.id === 'padat' ? 0.78 : typoSp.id === 'lega' ? 1.32 : 1.0;
    const lhFactor = typoSp.id === 'padat' ? 0.9 : typoSp.id === 'lega' ? 1.15 : 1.0;
    const baseRowPy =
      identitasPaper === 'A3'
        ? 2.8
        : identitasOrientation === 'landscape'
        ? 1.2
        : identitasPaper === 'F4'
        ? 1.9
        : 1.3;
    const baseLh =
      identitasPaper === 'A3'
        ? 1.4
        : identitasOrientation === 'landscape'
        ? 1.18
        : identitasPaper === 'F4'
        ? 1.32
        : 1.24;
    const sheetScopeStyle: React.CSSProperties = {
      fontFamily: typoFont.fontFamily,
      ['--bi-py' as string]: `${(baseRowPy * spFactor * typoTextScale).toFixed(2)}px`,
      ['--bi-lh' as string]: String(+(baseLh * lhFactor).toFixed(2)),
      fontSize: typoTextScale !== 1 ? `${(typoTextScale * 100).toFixed(1)}%` : undefined
    };

    const ttlText =
      student.tempatTanggalLahir ||
      [student.tempatLahir, student.tanggalLahir].filter(Boolean).join(', ') ||
      '-';

    const alamatLengkap = [
      student.alamat,
      student.rt || student.rw ? `RT ${student.rt || '-'} / RW ${student.rw || '-'}` : '',
      student.kelurahan,
      student.kecamatan,
      student.kodePos
    ]
      .filter(Boolean)
      .join(', ');

    if (sheetFormat === 'standar_57') {
      const jkShort = student.jenisKelamin === 'P' ? 'P' : 'L';
      const jkFull = student.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki';
      const kelasVal = cleanIndukDisplay(student.rombelSaatIni || student.kelas);
      const telpCombined =
        [sanitizeIndukField(student.telepon), sanitizeIndukField(student.hp)]
          .filter(Boolean)
          .join(' / ') || '-';
      const tbBbSaatDiterima =
        cleanIndukDisplay(meta?.tinggiBeratSaatDiterima, { fallback: '' }) ||
        (student.tinggiBadan || student.beratBadan
          ? `${cleanIndukDisplay(student.tinggiBadan)} cm / ${cleanIndukDisplay(student.beratBadan)} kg`
          : '-');

      const idSpec = (() => {
        if (identitasOrientation === 'landscape') {
          if (identitasPaper === 'A3') {
            return {
              is3Col: true,
              bodyText: 'text-[10.5px] leading-[1.35]',
              secHeader: 'text-[10.5px] px-2 py-0.5 mb-1',
              titleText: 'text-[15px]',
              subHeaderText: 'text-[11.5px]',
              labelW: 'w-[148px]',
              numW: 'w-6 text-[10px]',
              rowPy: 'py-[2.5px]',
              secGap: 'space-y-2',
              photoBox: 'w-[26mm] h-[34mm]',
              qrSize: 54,
              sigH: 'h-16',
              sigText: 'text-[10.5px]'
            };
          }
          // A4 or F4 Landscape -> 3 columns fit 100% cleanly on 1 Landscape sheet
          return {
            is3Col: true,
            bodyText: identitasPaper === 'F4' ? 'text-[8.2px] leading-[1.2]' : 'text-[7.8px] leading-[1.16]',
            secHeader: 'text-[8.2px] px-1.5 py-[1.5px] mb-0.5',
            titleText: 'text-[12.5px]',
            subHeaderText: 'text-[9.5px]',
            labelW: 'w-[115px]',
            numW: 'w-4 text-[7.8px]',
            rowPy: 'py-[1px]',
            secGap: 'space-y-1',
            photoBox: 'w-[18mm] h-[24mm]',
            qrSize: 40,
            sigH: 'h-12',
            sigText: 'text-[8.5px]'
          };
        }
        // Portrait (A4, F4, A3) -> 2 columns official layout
        if (identitasPaper === 'A3') {
          return {
            is3Col: false,
            bodyText: 'text-[12px] leading-[1.45]',
            secHeader: 'text-[12px] px-2 py-1 mb-1',
            titleText: 'text-[17px]',
            subHeaderText: 'text-[13px]',
            labelW: 'w-[195px]',
            numW: 'w-7 text-[11px]',
            rowPy: 'py-[3px]',
            secGap: 'space-y-3',
            photoBox: 'w-[30mm] h-[38mm]',
            qrSize: 62,
            sigH: 'h-20',
            sigText: 'text-[12px]'
          };
        }
        if (identitasPaper === 'F4') {
          return {
            is3Col: false,
            bodyText: 'text-[9.8px] leading-[1.34]',
            secHeader: 'text-[9.8px] px-1.5 py-0.5 mb-0.5',
            titleText: 'text-[14px]',
            subHeaderText: 'text-[10.5px]',
            labelW: 'w-[152px]',
            numW: 'w-5 text-[9.2px]',
            rowPy: 'py-[2px]',
            secGap: 'space-y-2',
            photoBox: 'w-[25mm] h-[33mm]',
            qrSize: 48,
            sigH: 'h-16',
            sigText: 'text-[10px]'
          };
        }
        // A4 Portrait
        return {
          is3Col: false,
          bodyText: 'text-[9px] leading-[1.24]',
          secHeader: 'text-[9px] px-1.5 py-0.5 mb-0.5',
          titleText: 'text-[13px]',
          subHeaderText: 'text-[10px]',
          labelW: 'w-[138px]',
          numW: 'w-5 text-[8.5px]',
          rowPy: 'py-[1.2px]',
          secGap: 'space-y-1.5',
          photoBox: 'w-[22mm] h-[29mm]',
          qrSize: 44,
          sigH: 'h-14',
          sigText: 'text-[9px]'
        };
      })();

      const renderRow57 = (num: string, label: string, val: string, boldVal = false) => (
        <tr>
          <td className={`${idSpec.numW} ${idSpec.rowPy} align-top text-right pr-1 font-mono text-slate-700`}>
            {num}
          </td>
          <td className={`${idSpec.labelW} ${idSpec.rowPy} align-top text-slate-800`}>{label}</td>
          <td className={`w-2 ${idSpec.rowPy} align-top text-center`}>:</td>
          <td className={`${idSpec.rowPy} align-top ${boldVal ? 'font-bold text-slate-950' : 'text-slate-900'}`}>
            {val}
          </td>
        </tr>
      );

      const secA = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            A. KETERANGAN TENTANG PESERTA DIDIK
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('1.', 'Nama Lengkap Peserta Didik', cleanIndukDisplay(student.nama), true)}
              {renderRow57('', 'Nama Panggilan', cleanIndukDisplay(meta?.namaPanggilan))}
              {renderRow57('2.', 'Jenis Kelamin', jkFull)}
              {renderRow57('3.', 'Tempat dan tanggal lahir', cleanIndukDisplay(ttlText))}
              {renderRow57('4.', 'Agama', cleanIndukDisplay(student.agama || 'Islam'))}
              {renderRow57('5.', 'Kewarganegaraan', cleanIndukDisplay(meta?.kewarganegaraan || 'Indonesia'))}
              {renderRow57('6.', 'Anak ke', cleanIndukDisplay(student.anakKe))}
              {renderRow57('7.', 'Jumlah saudara kandung', cleanIndukDisplay(student.jmlSaudaraKandung))}
              {renderRow57('8.', 'Jumlah saudara tiri', cleanIndukDisplay(meta?.jumlahSaudaraTiri))}
              {renderRow57('9.', 'Jumlah saudara angkat', cleanIndukDisplay(meta?.jumlahSaudaraAngkat))}
              {renderRow57('10.', 'Anak yatim/piatu/yatim piatu', cleanIndukDisplay(meta?.statusYatimPiatu))}
              {renderRow57('11.', 'Bahasa sehari-hari di rumah', cleanIndukDisplay(meta?.bahasaRumah))}
            </tbody>
          </table>
        </div>
      );

      const secB = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            B. KETERANGAN TEMPAT TINGGAL
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('12.', 'Alamat', cleanIndukDisplay(alamatLengkap || student.alamat))}
              {renderRow57('13.', 'Nomor Telepon / HP', telpCombined)}
              {renderRow57(
                '14.',
                'Tinggal dengan Orang Tua / Saudara / Kost',
                cleanIndukDisplay(student.jenisTinggal || 'Bersama orang tua')
              )}
              {renderRow57(
                '15.',
                'Jarak tempat tinggal ke sekolah',
                (() => {
                  const jarak = cleanIndukDisplay(student.jarakSekolah, { fallback: '' });
                  if (!jarak) return '-';
                  return /km/i.test(jarak) ? jarak : `${jarak} km`;
                })()
              )}
            </tbody>
          </table>
        </div>
      );

      const secC = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            C. KETERANGAN KESEHATAN
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('16.', 'Golongan darah', cleanIndukDisplay(meta?.golonganDarah))}
              {renderRow57('17.', 'Penyakit yang pernah diderita', cleanIndukDisplay(meta?.penyakitPernahDiderita))}
              {renderRow57('18.', 'Kelainan jasmani', cleanIndukDisplay(meta?.kelainanJasmani))}
              {renderRow57('19.', 'Tinggi & berat badan (saat diterima)', tbBbSaatDiterima)}
            </tbody>
          </table>
        </div>
      );

      const secD = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            D. KETERANGAN PENDIDIKAN
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('20.', 'Pendidikan sebelumnya', '')}
              {renderRow57('', 'a. Tamatan dari', cleanIndukDisplay(meta?.tamatanDari || student.sekolahAsal, { zeroIsEmpty: true }))}
              {renderRow57('', 'b. Tanggal dan Nomor Ijazah', cleanIndukDisplay(meta?.tglNoIjazahSebelumnya || student.noSeriIjazah, { zeroIsEmpty: true }))}
              {renderRow57('', 'c. Tanggal dan Nomor STTL', cleanIndukDisplay(meta?.tglNoSttlSebelumnya || student.skhun, { zeroIsEmpty: true }))}
              {renderRow57('', 'd. Lama Belajar', cleanIndukDisplay(meta?.lamaBelajarSebelumnya, { zeroIsEmpty: true }))}
              {renderRow57('21.', 'Pindahan', '')}
              {renderRow57('', 'a. Dari sekolah', cleanIndukDisplay(meta?.pindahanDariSekolah))}
              {renderRow57('', 'b. Alasan', cleanIndukDisplay(meta?.alasanPindahan))}
              {renderRow57('22.', 'Diterima di sekolah ini', '')}
              {renderRow57('', 'a. Di kelas', cleanIndukDisplay(meta?.diterimaDiKelas || student.kelas || 'X'))}
              {renderRow57('', 'b. Kelompok', cleanIndukDisplay(meta?.diterimaKelompok || student.jurusan))}
              {renderRow57('', 'c. Tanggal', cleanIndukDisplay(meta?.tanggalDiterima))}
            </tbody>
          </table>
        </div>
      );

      const secEFull = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            E. KETERANGAN TENTANG AYAH KANDUNG
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('23.', 'Nama', cleanIndukDisplay(student.namaAyah || student.namaOrtu, { zeroIsEmpty: true }), true)}
              {renderRow57('24.', 'Tempat dan tanggal lahir', cleanIndukDisplay(meta?.ayahTtl || student.tahunLahirAyah, { zeroIsEmpty: true }))}
              {renderRow57('25.', 'Agama', cleanIndukDisplay(meta?.ayahAgama || 'Islam'))}
              {renderRow57('26.', 'Kewarganegaraan', cleanIndukDisplay(meta?.ayahWargaNegara || 'Indonesia'))}
              {renderRow57('27.', 'Pendidikan', cleanIndukDisplay(student.jenjangPendidikanAyah, { zeroIsEmpty: true }))}
              {renderRow57('28.', 'Pekerjaan', cleanIndukDisplay(student.pekerjaanAyah, { zeroIsEmpty: true }))}
              {renderRow57('29.', 'Penghasilan / Pengeluaran / bln', cleanIndukDisplay(student.penghasilanAyah, { zeroIsEmpty: true }))}
              {renderRow57('30.', 'Alamat rumah / Nomor telp./HP', cleanIndukDisplay(meta?.ayahAlamatTelp || student.alamat))}
              {renderRow57('31.', 'Masih hidup / meninggal dunia', cleanIndukDisplay(meta?.ayahStatusHidup || 'Masih hidup'))}
            </tbody>
          </table>
        </div>
      );

      const secELeft = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            E. KETERANGAN TENTANG AYAH KANDUNG
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('23.', 'Nama', cleanIndukDisplay(student.namaAyah || student.namaOrtu, { zeroIsEmpty: true }), true)}
              {renderRow57('24.', 'Tempat dan tanggal lahir', cleanIndukDisplay(meta?.ayahTtl || student.tahunLahirAyah, { zeroIsEmpty: true }))}
              {renderRow57('25.', 'Agama', cleanIndukDisplay(meta?.ayahAgama || 'Islam'))}
              {renderRow57('26.', 'Kewarganegaraan', cleanIndukDisplay(meta?.ayahWargaNegara || 'Indonesia'))}
              {renderRow57('27.', 'Pendidikan', cleanIndukDisplay(student.jenjangPendidikanAyah, { zeroIsEmpty: true }))}
            </tbody>
          </table>
        </div>
      );

      const secERight = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            E. LANJUTAN AYAH KANDUNG
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('28.', 'Pekerjaan', cleanIndukDisplay(student.pekerjaanAyah, { zeroIsEmpty: true }))}
              {renderRow57('29.', 'Penghasilan / Pengeluaran / bln', cleanIndukDisplay(student.penghasilanAyah, { zeroIsEmpty: true }))}
              {renderRow57('30.', 'Alamat rumah / Nomor telp./HP', cleanIndukDisplay(meta?.ayahAlamatTelp || student.alamat))}
              {renderRow57('31.', 'Masih hidup / meninggal dunia', cleanIndukDisplay(meta?.ayahStatusHidup || 'Masih hidup'))}
            </tbody>
          </table>
        </div>
      );

      const secF = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            F. KETERANGAN TENTANG IBU KANDUNG
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('32.', 'Nama', cleanIndukDisplay(student.namaIbu, { zeroIsEmpty: true }), true)}
              {renderRow57('33.', 'Tempat dan tanggal lahir', cleanIndukDisplay(meta?.ibuTtl || student.tahunLahirIbu, { zeroIsEmpty: true }))}
              {renderRow57('34.', 'Agama', cleanIndukDisplay(meta?.ibuAgama || 'Islam'))}
              {renderRow57('35.', 'Kewarganegaraan', cleanIndukDisplay(meta?.ibuWargaNegara || 'Indonesia'))}
              {renderRow57('36.', 'Pendidikan', cleanIndukDisplay(student.jenjangPendidikanIbu, { zeroIsEmpty: true }))}
              {renderRow57('37.', 'Pekerjaan', cleanIndukDisplay(student.pekerjaanIbu, { zeroIsEmpty: true }))}
              {renderRow57('38.', 'Penghasilan / Pengeluaran / bln', cleanIndukDisplay(student.penghasilanIbu, { zeroIsEmpty: true }))}
              {renderRow57('39.', 'Alamat rumah / Nomor telp./HP', cleanIndukDisplay(meta?.ibuAlamatTelp || student.alamat))}
              {renderRow57('40.', 'Masih hidup / meninggal dunia', cleanIndukDisplay(meta?.ibuStatusHidup || 'Masih hidup'))}
            </tbody>
          </table>
        </div>
      );

      const secG = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            G. KETERANGAN TENTANG WALI
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('41.', 'Nama', cleanIndukDisplay(student.namaWali, { zeroIsEmpty: true }))}
              {renderRow57('42.', 'Tempat dan tanggal lahir', cleanIndukDisplay(meta?.waliTtl || student.tahunLahirWali, { zeroIsEmpty: true }))}
              {renderRow57('43.', 'Agama', cleanIndukDisplay(meta?.waliAgama, { zeroIsEmpty: true }))}
              {renderRow57('44.', 'Kewarganegaraan', cleanIndukDisplay(meta?.waliWargaNegara, { zeroIsEmpty: true }))}
              {renderRow57('45.', 'Pendidikan', cleanIndukDisplay(student.jenjangPendidikanWali, { zeroIsEmpty: true }))}
              {renderRow57('46.', 'Pekerjaan', cleanIndukDisplay(student.pekerjaanWali, { zeroIsEmpty: true }))}
              {renderRow57('47.', 'Penghasilan / Pengeluaran / bln', cleanIndukDisplay(student.penghasilanWali, { zeroIsEmpty: true }))}
              {renderRow57('48.', 'Alamat rumah / Nomor telp./HP', cleanIndukDisplay(meta?.waliAlamatTelp, { zeroIsEmpty: true }))}
            </tbody>
          </table>
        </div>
      );

      const secH = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            H. KEGEMARAN PESERTA DIDIK
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('49.', 'Kesenian', cleanIndukDisplay(meta?.kegemaranKesenian))}
              {renderRow57('50.', 'Olah raga', cleanIndukDisplay(meta?.kegemaranOlahraga))}
              {renderRow57('51.', 'Kemasyarakatan / Organisasi', cleanIndukDisplay(meta?.kegemaranOrganisasi))}
              {renderRow57(
                '52.',
                'Lain-lain',
                cleanIndukDisplay(
                  meta?.kegemaranLain ||
                    (Array.isArray(student.prestasi)
                      ? student.prestasi.join(', ')
                      : student.prestasi)
                )
              )}
            </tbody>
          </table>
        </div>
      );

      const secI = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            I. KETERANGAN PERKEMBANGAN PESERTA DIDIK
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('53.', 'Menerima Bea Siswa', cleanIndukDisplay(meta?.menerimaBeasiswa || (student.layakPip === 'Ya' ? 'PIP / KIP' : '')))}
              {renderRow57('54.', 'Meninggalkan sekolah ini', '')}
              {renderRow57('', 'a. Tanggal meninggalkan sekolah', cleanIndukDisplay(meta?.tanggalKeluarMutasi))}
              {renderRow57('', 'b. Alasan', cleanIndukDisplay(meta?.alasanKeluarMutasi))}
              {renderRow57('55.', 'Akhir Pendidikan', '')}
              {renderRow57('', 'a. Tamat belajar / lulus', cleanIndukDisplay(meta?.tamatBelajarLulus || (student.status === 'Alumni' ? 'Lulus' : '')))}
              {renderRow57('', 'b. Ijazah', cleanIndukDisplay(meta?.noIjazahAkhir))}
              {renderRow57('', 'c. Nomor Surat Tanda Lulus', cleanIndukDisplay(meta?.noSuratTandaLulus))}
              {renderRow57('', 'd. Nilai rata-rata yang dicapai', cleanIndukDisplay(meta?.nilaiRataRataAkhir))}
            </tbody>
          </table>
        </div>
      );

      const secJ = (
        <div>
          <div className={`font-bold uppercase bg-slate-100/60 border border-slate-400 ${idSpec.secHeader}`}>
            J. KETERANGAN SETELAH SELESAI PENDIDIKAN
          </div>
          <table className="bi-table-id w-full border-collapse">
            <tbody>
              {renderRow57('56.', 'Akan melanjutkan ke', cleanIndukDisplay(meta?.akanMelanjutkanKe))}
              {renderRow57('57.', 'Akan bekerja di', cleanIndukDisplay(meta?.akanBekerjaDi))}
            </tbody>
          </table>
        </div>
      );

      return (
        <div
          key={`${student.id}-57-${idx}`}
          style={sheetScopeStyle}
          className="buku-induk-sheet buku-induk-sheet-scope relative overflow-hidden bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col justify-between"
        >
          {showIdentitasWatermark && (
            <Sman9WavyWatermarkBg
              orientation={identitasOrientation}
              paperSize={identitasPaper === 'F4' ? 'F4' : 'A4'}
              opacityPct={identitasWatermarkOpacity}
              waveRowGapPx={waveRowGapPx}
              waveWordGapPx={waveWordGapPx}
              sekolahLogoUrl={profile.sekolahLogoUrl}
            />
          )}
          <div
            className="relative z-10 flex-1 flex flex-col justify-between"
            style={
              identitasScalePct !== 100
                ? {
                    transform: `scale(${identitasScalePct / 100})`,
                    transformOrigin: 'top left',
                    width: `${(100 / identitasScalePct) * 100}%`
                  }
                : undefined
            }
          >
            <div>
              <OfficialKopSurat profile={profile} compact />

            {/* Header Resmi LEMBAR BUKU INDUK PESERTA DIDIK SMA (IDENTITAS SAJA — TERPISAH DARI NILAI) */}
            <div className="border-b-2 border-slate-900 pb-1.5 mb-2 flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className={`${idSpec.titleText} font-black uppercase tracking-wide`}>
                    LEMBAR BUKU INDUK PESERTA DIDIK SMA
                  </h2>
                  <span className="font-mono text-[11.5px] font-black border border-slate-900 px-2 py-0.5 tabular-nums">
                    No. Induk: {cleanIndukDisplay(meta?.nomorUrutInduk || noInduk)}
                  </span>
                </div>
                <div className={`flex flex-wrap items-center justify-between gap-2 mt-1 ${idSpec.subHeaderText}`}>
                  <div className="font-mono font-bold">
                    NIS : {cleanIndukDisplay(student.nis || student.nipd)} - NISN :{' '}
                    {cleanIndukDisplay(student.nisn)}
                  </div>
                  <div className="flex items-center gap-3 font-bold">
                    <span className="font-mono">{jkShort}</span>
                    <span>{kelasVal}</span>
                    <span className="uppercase">{student.nama}</span>
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 mt-0.5">
                  Kurikulum Terdaftar: <strong className="text-slate-900">{resolved.sourceJenis}</strong> —{' '}
                  {resolved.sourceName} ({resolved.sourceTahun}) · Lembar Identitas (Bagian A–J)
                </div>
              </div>

              <div className="flex items-start gap-2 shrink-0">
                <ExamCardBarcode
                  value={`INDUK|${noInduk}|${student.nisn}|${student.nama}|${kelasVal}`}
                  mode="qr_link"
                  size={idSpec.qrSize}
                />
                <div
                  className={`${idSpec.photoBox} border border-slate-700 bg-slate-50 flex items-center justify-center overflow-hidden text-[8px] text-slate-500 text-center`}
                >
                  {photoSrc ? (
                    <img src={photoSrc} alt={student.nama} className="w-full h-full object-cover" />
                  ) : (
                    <span>
                      PAS FOTO
                      <br />3 × 4
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Susunan 2 Kolom (Portrait) atau 3 Kolom (Landscape) Butir 1 - 57 (Bagian A s.d. J) */}
            {idSpec.is3Col ? (
              <div className={`grid grid-cols-3 gap-x-3 ${idSpec.bodyText} mb-2`}>
                <div className={idSpec.secGap}>
                  {secA}
                  {secB}
                  {secC}
                </div>
                <div className={idSpec.secGap}>
                  {secD}
                  {secEFull}
                </div>
                <div className={idSpec.secGap}>
                  {secF}
                  {secG}
                  {secH}
                  {secI}
                  {secJ}
                </div>
              </div>
            ) : (
              <div className={`grid grid-cols-2 gap-x-4 ${idSpec.bodyText} mb-2.5`}>
                <div className={idSpec.secGap}>
                  {secA}
                  {secB}
                  {secC}
                  {secD}
                  {secELeft}
                </div>
                <div className={idSpec.secGap}>
                  {secERight}
                  {secF}
                  {secG}
                  {secH}
                  {secI}
                  {secJ}
                </div>
              </div>
            )}

            </div>

            {/* Pengesahan Kepala Sekolah */}
            <div className={`mt-2 pt-1.5 border-t border-slate-300 flex items-end justify-between ${idSpec.sigText}`}>
              <div className="text-[0.9em] text-slate-600 max-w-[340px]">
                Lembar Identitas Buku Induk Peserta Didik {profile.namaSekolah} · Lembar nilai akademik terlampir terpisah sesuai kurikulum berlaku.
              </div>

              <div className="min-w-[205px] text-left relative">
                <div>{activeConfig.kotaTanggalCetak || 'Surabaya, 20 November 2026'}</div>
                <div className="font-semibold">Kepala Sekolah,</div>
                <div className={`relative ${idSpec.sigH} my-0.5 flex items-center`}>
                  <div
                    className={`absolute pointer-events-none opacity-85 z-20 ${
                      identitasOrientation === 'landscape' && identitasPaper !== 'A3'
                        ? '-left-6 -top-1.5 w-15 h-15'
                        : '-left-8 -top-2 w-20 h-20'
                    }`}
                  >
                    {effectiveStempelUrl ? (
                      <img src={effectiveStempelUrl} alt="Stempel" className="w-full h-full object-contain" />
                    ) : (
                      <SchoolStampSvg className="w-full h-full" />
                    )}
                  </div>
                  {effectiveTtdUrl ? (
                    <img
                      src={effectiveTtdUrl}
                      alt="TTD Kepala Sekolah"
                      className={`${
                        identitasOrientation === 'landscape' && identitasPaper !== 'A3'
                          ? 'h-12 max-w-[140px]'
                          : 'h-16 max-w-[175px]'
                      } object-contain object-left relative z-10`}
                    />
                  ) : (
                    <KepalaSekolahSignatureSvg
                      className={`${
                        identitasOrientation === 'landscape' && identitasPaper !== 'A3' ? 'h-12 w-28' : 'h-16 w-36'
                      } relative z-10`}
                    />
                  )}
                </div>
                <div className="font-bold underline relative z-10">{profile.kepalaSekolah}</div>
                <div className="font-mono text-[0.92em]">NIP. {profile.nipKepalaSekolah}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Format Ringkas (Identitas saja — terpisah dari Lembar Nilai)
    return (
      <div
        key={`${student.id}-ringkas-${idx}`}
        style={sheetScopeStyle}
        className="buku-induk-sheet buku-induk-sheet-scope relative overflow-hidden bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col justify-between"
      >
        {showIdentitasWatermark && (
          <Sman9WavyWatermarkBg
            orientation={identitasOrientation}
            paperSize={identitasPaper === 'F4' ? 'F4' : 'A4'}
            opacityPct={identitasWatermarkOpacity}
            waveRowGapPx={waveRowGapPx}
            waveWordGapPx={waveWordGapPx}
            sekolahLogoUrl={profile.sekolahLogoUrl}
          />
        )}
        <div
          className="relative z-10 flex-1 flex flex-col justify-between"
          style={
            identitasScalePct !== 100
              ? {
                  transform: `scale(${identitasScalePct / 100})`,
                  transformOrigin: 'top left',
                  width: `${(100 / identitasScalePct) * 100}%`
                }
              : undefined
          }
        >
        <div>
        <OfficialKopSurat profile={profile} compact />

        {/* Judul Lembar Induk + Pas Foto + QR */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-2 mb-3">
          <div className="flex-1">
            <div className="text-[14px] font-black uppercase tracking-wide">
              BUKU INDUK PESERTA DIDIK
            </div>
            <div className="text-[11px] font-semibold text-slate-700">
              Nomor Buku Induk / NIPD:{' '}
              <span className="font-mono font-bold text-slate-950">{noInduk}</span>
              {' · '}NISN: <span className="font-mono font-bold">{student.nisn || '-'}</span>
            </div>
            <div className="text-[10.5px] text-slate-700 mt-0.5">
              Kurikulum Berlaku:{' '}
              <strong className="text-slate-950">{resolved.sourceJenis}</strong> —{' '}
              <span>{resolved.sourceName}</span> ({resolved.sourceTahun})
            </div>
          </div>

          <div className="flex items-start gap-2.5 shrink-0">
            <ExamCardBarcode
              value={`INDUK|${noInduk}|${student.nisn}|${student.nama}|${resolved.sourceJenis}`}
              mode="qr_link"
              size={52}
            />
            <div className="w-[24mm] h-[30mm] border border-slate-700 bg-slate-50 flex items-center justify-center overflow-hidden text-[8.5px] text-slate-500 text-center">
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={student.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  PAS FOTO
                  <br />
                  3 × 4 cm
                </span>
              )}
            </div>
          </div>
        </div>

        {/* A. Keterangan Pribadi & Pendidikan Sebelumnya + Orang Tua (2 Kolom Padat Resmi) */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-[10px] leading-snug mb-3">
          {/* Kolom Kiri */}
          <div className="space-y-2">
            <div>
              <div className="font-bold uppercase text-[10px] bg-slate-100 border border-slate-300 px-2 py-0.5 mb-1">
                A. Keterangan Pribadi Peserta Didik
              </div>
              <table className="bi-table-id w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold align-top">Nama Lengkap</td>
                    <td className="w-2 align-top">:</td>
                    <td className="font-bold uppercase">{student.nama}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Jenis Kelamin</td>
                    <td>:</td>
                    <td>{student.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Tempat, Tgl Lahir</td>
                    <td>:</td>
                    <td>{ttlText}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">NIK / No. KK</td>
                    <td>:</td>
                    <td className="font-mono">
                      {student.nik || '-'} / {student.noKk || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Agama</td>
                    <td>:</td>
                    <td>{student.agama || 'Islam'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Anak ke / Sdr</td>
                    <td>:</td>
                    <td className="tabular-nums">
                      Anak ke-{student.anakKe || '-'} ({student.jmlSaudaraKandung ?? '-'} saudara)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold align-top">Alamat</td>
                    <td className="align-top">:</td>
                    <td>{alamatLengkap || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">No. HP / Email</td>
                    <td>:</td>
                    <td className="font-mono">
                      {student.hp || student.telepon || '-'} {student.email ? `· ${student.email}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Data Fisik</td>
                    <td>:</td>
                    <td className="tabular-nums">
                      TB {student.tinggiBadan || '-'} cm · BB {student.beratBadan || '-'} kg · LK{' '}
                      {student.lingkarKepala || '-'} cm
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div className="font-bold uppercase text-[10px] bg-slate-100 border border-slate-300 px-2 py-0.5 mb-1">
                B. Registrasi Masuk & Pendidikan Sebelumnya
              </div>
              <table className="bi-table-id w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Diterima Sebagai</td>
                    <td className="w-2">:</td>
                    <td>{meta?.statusAsalMasuk || 'Siswa Baru'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Tanggal / Th. Masuk</td>
                    <td>:</td>
                    <td className="font-mono">
                      {meta?.tanggalDiterima || '14 Juli 2026'} (TP{' '}
                      {meta?.tahunMasuk || '2026/2027'})
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Kelas Diterima / Kini</td>
                    <td>:</td>
                    <td className="font-semibold">
                      {meta?.diterimaDiKelas || student.kelas || '-'} / Saat ini:{' '}
                      {student.rombelSaatIni || student.kelas || '-'}
                      {tingkat ? ` (Tingkat ${tingkat})` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Sekolah Asal</td>
                    <td>:</td>
                    <td>{student.sekolahAsal || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">No. Ijazah / SKHUN</td>
                    <td>:</td>
                    <td className="font-mono">
                      {student.noSeriIjazah || '-'} / {student.skhun || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Kolom Kanan */}
          <div className="space-y-2">
            <div>
              <div className="font-bold uppercase text-[10px] bg-slate-100 border border-slate-300 px-2 py-0.5 mb-1">
                C. Keterangan Orang Tua / Wali
              </div>
              <table className="bi-table-id w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Nama Ayah</td>
                    <td className="w-2">:</td>
                    <td className="font-semibold">{student.namaAyah || student.namaOrtu || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Pendidikan / Kerja</td>
                    <td>:</td>
                    <td>
                      {student.jenjangPendidikanAyah || '-'} · {student.pekerjaanAyah || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Penghasilan Ayah</td>
                    <td>:</td>
                    <td>{student.penghasilanAyah || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold pt-1">Nama Ibu</td>
                    <td className="pt-1">:</td>
                    <td className="font-semibold pt-1">{student.namaIbu || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Pendidikan / Kerja</td>
                    <td>:</td>
                    <td>
                      {student.jenjangPendidikanIbu || '-'} · {student.pekerjaanIbu || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Penghasilan Ibu</td>
                    <td>:</td>
                    <td>{student.penghasilanIbu || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold pt-1">Nama Wali</td>
                    <td className="pt-1">:</td>
                    <td className="pt-1">{student.namaWali || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Status KIP / PIP</td>
                    <td>:</td>
                    <td>
                      KIP: {student.penerimaKip || 'Tidak'} · Layak PIP: {student.layakPip || 'Tidak'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div className="font-bold uppercase text-[10px] bg-slate-100 border border-slate-300 px-2 py-0.5 mb-1">
                D. Status Akhir / Kelulusan & Mutasi
              </div>
              <table className="bi-table-id w-full border-collapse">
                <tbody>
                  <tr>
                    <td className="w-32 py-0.5 font-semibold">Status Terkini</td>
                    <td className="w-2">:</td>
                    <td className="font-bold">{student.status || 'Aktif'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Nomor Peserta Ujian</td>
                    <td>:</td>
                    <td className="font-mono">{student.nomorUjian || student.noPesertaUN || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Tgl Mutasi / Keluar</td>
                    <td>:</td>
                    <td>
                      {meta?.tanggalKeluarMutasi || '-'}
                      {meta?.alasanKeluarMutasi ? ` (${meta.alasanKeluarMutasi})` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5 font-semibold">Catatan Kelulusan</td>
                    <td>:</td>
                    <td>{meta?.catatanKelulusan || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        </div>

        {/* Pengesahan Kepala Sekolah */}
        <div className="mt-4 flex items-end justify-between text-[10px]">
          <div className="text-[9px] text-slate-600 max-w-[320px]">
            Lembar Identitas Buku Induk Siswa {profile.namaSekolah} · Lembar nilai akademik & perkembangan terpisah pada Lembar Nilai.
          </div>

          <div className="min-w-[215px] text-left relative">
            <div>{activeConfig.kotaTanggalCetak || 'Surabaya, 20 November 2026'}</div>
            <div className="font-semibold">Kepala Sekolah,</div>
            <div className="relative h-18 my-0.5 flex items-center">
              <div className="absolute -left-8 -top-2 w-20 h-20 opacity-85 pointer-events-none z-20">
                {effectiveStempelUrl ? (
                  <img src={effectiveStempelUrl} alt="Stempel" className="w-full h-full object-contain" />
                ) : (
                  <SchoolStampSvg className="w-full h-full" />
                )}
              </div>
              {effectiveTtdUrl ? (
                <img
                  src={effectiveTtdUrl}
                  alt="TTD Kepala Sekolah"
                  className="h-16 max-w-[175px] object-contain object-left relative z-10"
                />
              ) : (
                <KepalaSekolahSignatureSvg className="h-16 w-36 relative z-10" />
              )}
            </div>
            <div className="font-bold underline relative z-10">{profile.kepalaSekolah}</div>
            <div className="font-mono text-[9.5px]">NIP. {profile.nipKepalaSekolah}</div>
          </div>
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <style>{`
        @page {
          size: ${pageWidthMm}mm ${pageHeightMm}mm;
          margin: ${pageMarginMm}mm;
        }
        .buku-induk-nilai-scope table.bn-table-main > thead > tr > th,
        .buku-induk-nilai-scope table.bn-table-main > tbody > tr > td {
          padding-top: var(--bn-py, 2px);
          padding-bottom: var(--bn-py, 2px);
          padding-left: var(--bn-px, 2.5px);
          padding-right: var(--bn-px, 2.5px);
          line-height: var(--bn-lh, 1.2);
        }
        .buku-induk-nilai-scope table.bn-table-lower > thead > tr > th,
        .buku-induk-nilai-scope table.bn-table-lower > tbody > tr > td {
          padding-top: var(--bn-lower-py, 1.8px);
          padding-bottom: var(--bn-lower-py, 1.8px);
          line-height: var(--bn-lh, 1.2);
        }
        .buku-induk-sheet-scope table.bi-table-id td {
          padding-top: var(--bi-py, 1.8px);
          padding-bottom: var(--bi-py, 1.8px);
          line-height: var(--bi-lh, 1.28);
        }
        @media screen {
          .buku-induk-sheet {
            width: ${pageWidthMm}mm;
            min-height: ${pageHeightMm}mm;
            padding: ${pageMarginMm}mm ${pageMarginMm + 2}mm;
          }
        }
        @media print {
          @page {
            size: ${pageWidthMm}mm ${pageHeightMm}mm;
            margin: ${pageMarginMm}mm;
          }
          .buku-induk-preview-zoom-wrap {
            zoom: 1 !important;
          }
          .buku-induk-sheet {
            width: 100% !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            break-after: page;
            page-break-after: always;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .buku-induk-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Header & Navigation Tabs */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-900 text-amber-400 rounded-lg shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Buku Induk Siswa & Repositori Kurikulum
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5 tabular-nums">
                <span>
                  Kurikulum Aktif:{' '}
                  <strong className="text-slate-800">{activeConfig.namaKurikulumAktif}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeConfig.susunanPelajaran.length} Mapel Kondisional</span>
                <span aria-hidden="true">·</span>
                <span>{kurikulumRepo.length} Kurikulum di Repositori</span>
                <span aria-hidden="true">·</span>
                <span>{siswaList.length} Data Siswa</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                exportBukuIndukSiswaToExcel(filteredSiswa, activeConfig, kurikulumRepo, siswaMetaMap)
              }
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrintBukuInduk}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Buku Induk ({studentsToPrint.length})</span>
            </button>
          </div>
        </div>

        {/* Workspace Segmented Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('induk')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'induk'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Buku Induk Siswa ({filteredSiswa.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kurikulum')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'kurikulum'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Susunan Pelajaran Kondisional ({activeConfig.susunanPelajaran.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('repositori')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'repositori'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Repositori Kurikulum ({kurikulumRepo.length})</span>
            </button>
          </div>

          {/* Paper Size (A4/F4/A3), Orientation (Portrait/Landscape) & Separated Sheet Selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setActiveSheetType('identitas')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  activeSheetType === 'identitas'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lembar Identitas (A–J)
              </button>
              <button
                type="button"
                onClick={() => setActiveSheetType('nilai')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  activeSheetType === 'nilai'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lembar Nilai (X–XII)
              </button>
            </div>

            {activeSheetType === 'identitas' && (
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setSheetFormat('standar_57')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    sheetFormat === 'standar_57' ? 'bg-slate-900 text-amber-400' : 'text-slate-600'
                  }`}
                >
                  Standar SMA (57 Butir)
                </button>
                <button
                  type="button"
                  onClick={() => setSheetFormat('ringkas')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    sheetFormat === 'ringkas' ? 'bg-slate-900 text-amber-400' : 'text-slate-600'
                  }`}
                >
                  Ringkas
                </button>
              </div>
            )}

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['A4', 'F4', 'A3'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setCurrentPaper(sz)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    currentPaper === sz ? 'bg-slate-900 text-amber-400' : 'text-slate-600'
                  }`}
                >
                  {sz === 'F4' ? 'Folio / F4' : sz}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['portrait', 'landscape'] as const).map(ori => (
                <button
                  key={ori}
                  type="button"
                  onClick={() => setCurrentOrientation(ori)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    currentOrientation === ori ? 'bg-slate-900 text-amber-400' : 'text-slate-600'
                  }`}
                >
                  {ori === 'portrait' ? 'Portrait' : 'Landscape'}
                </button>
              ))}
            </div>

            <select
              value={currentScalePct}
              onChange={e => setCurrentScalePct(Number(e.target.value))}
              className="px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-700 tabular-nums"
              title="Presisi Skala Cetak Halaman"
            >
              {[85, 90, 95, 100, 105, 110].map(pct => (
                <option key={pct} value={pct}>
                  Skala {pct}%
                </option>
              ))}
            </select>

            <span className="text-[11px] font-mono text-slate-500 tabular-nums px-1.5">
              {pageWidthMm}×{pageHeightMm} mm
            </span>

            {activeSheetType === 'identitas' && (
              <>
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer select-none text-[11px] font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={showIdentitasWatermark}
                    onChange={e => setShowIdentitasWatermark(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span>Halaman Air SMAN 9</span>
                </label>
                {showIdentitasWatermark && (
                  <>
                    <select
                      value={identitasWatermarkOpacity}
                      onChange={e => setIdentitasWatermarkOpacity(Number(e.target.value))}
                      className="px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-700 tabular-nums"
                      title="Transparansi Halaman Air"
                    >
                      {[6, 8, 11, 14, 18, 22].map(op => (
                        <option key={op} value={op}>
                          Transparansi {op}%
                        </option>
                      ))}
                    </select>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 tabular-nums">
                      <span>Kerapatan:</span>
                      <input
                        type="range"
                        min={28}
                        max={116}
                        step={2}
                        value={waveRowGapPx}
                        onChange={e => setWaveRowGapPx(Number(e.target.value))}
                        className="w-16 accent-blue-600 cursor-pointer"
                        title="Atur jarak antar baris tulisan bergelombang"
                      />
                      <span className="font-mono text-[10.5px] text-slate-900 w-8 text-right">
                        {waveRowGapPx}px
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 tabular-nums">
                      <span>Spasi Kata:</span>
                      <input
                        type="range"
                        min={4}
                        max={64}
                        step={2}
                        value={waveWordGapPx}
                        onChange={e => setWaveWordGapPx(Number(e.target.value))}
                        className="w-14 accent-blue-600 cursor-pointer"
                        title="Atur jarak mendatar antar tulisan SMA NEGERI 9 SURABAYA"
                      />
                      <span className="font-mono text-[10.5px] text-slate-900 w-7 text-right">
                        {waveWordGapPx}px
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setPrintMode('individu')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  printMode === 'individu' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                Individu (1)
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('terpilih')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  printMode === 'terpilih' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                Terpilih ({selectedIds.length})
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('tersaring')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  printMode === 'tersaring' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                Semua Tersaring ({filteredSiswa.length})
              </button>
            </div>
          </div>

          <div className="w-full pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <PrintTypographyBar
              value={typography}
              onChange={updateTypography}
              previewZoomPct={previewZoomPct}
              onPreviewZoomChange={setPreviewZoomPct}
              compact
            />
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

      {/* TAB 1: BUKU INDUK SISWA */}
      {activeTab === 'induk' && (
        <div className="space-y-5">
          {/* Search & Student Table */}
          <div className="no-print bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa / NIPD / NISN / kelas..."
                  className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
              >
                <option value="all">Semua Kelas ({availableClasses.length})</option>
                {availableClasses.map(k => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={e =>
                  setFilterStatus(e.target.value as 'all' | 'Aktif' | 'Alumni' | 'Pindah')
                }
                className="px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
              >
                <option value="all">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Alumni">Alumni</option>
                <option value="Pindah">Pindah</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    selectedIds.length === filteredSiswa.length
                      ? []
                      : filteredSiswa.map(s => s.id)
                  )
                }
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700 whitespace-nowrap shrink-0"
              >
                {selectedIds.length === filteredSiswa.length && filteredSiswa.length > 0
                  ? 'Batal Pilih Semua'
                  : 'Pilih Semua Tersaring'}
              </button>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-800 text-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 w-8 text-center">#</th>
                    <th className="px-3 py-2 w-28">No. Induk / NIPD</th>
                    <th className="px-3 py-2 w-28">NISN</th>
                    <th className="px-3 py-2">Nama Peserta Didik</th>
                    <th className="px-3 py-2 w-24">Kelas</th>
                    <th className="px-3 py-2">Kurikulum Berlaku</th>
                    <th className="px-3 py-2 w-28 text-center">Mapel Berlaku</th>
                    <th className="px-3 py-2 w-36 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                        Tidak ada siswa yang sesuai filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSiswa.map(s => {
                      const isSelected = activeSiswa?.id === s.id;
                      const isChecked = selectedIds.includes(s.id);
                      const meta = siswaMetaMap[s.id];
                      const res = resolveCurriculumForStudent(s);
                      return (
                        <tr
                          key={s.id}
                          className={isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedIds(prev =>
                                  prev.includes(s.id)
                                    ? prev.filter(x => x !== s.id)
                                    : [...prev, s.id]
                                )
                              }
                              className="text-slate-500 hover:text-blue-600"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">
                            {meta?.nomorBukuInduk || s.nipd || s.nis || '-'}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-600 tabular-nums">
                            {s.nisn || '-'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {s.nama}
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                            {s.rombelSaatIni || s.kelas}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            <span className="font-medium">{res.sourceJenis}</span>
                            {res.isOverridden && (
                              <span className="text-[10.5px] text-amber-700 ml-1">
                                (Khusus Siswa)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-800 tabular-nums">
                            {res.resolvedMapel.length} Mapel
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSiswaId(s.id);
                                  setPrintMode('individu');
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 hover:bg-blue-100 text-blue-800'
                                }`}
                              >
                                Lihat Induk
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

          {/* Student Registration Metadata & Conditional Curriculum Override + Grade Entry */}
          {activeSiswa && (
            <div className="no-print bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="font-bold text-slate-900">
                  Pengaturan Registrasi Induk & Kurikulum Siswa:{' '}
                  <span className="text-blue-700">{activeSiswa.nama}</span> (
                  {activeSiswa.rombelSaatIni || activeSiswa.kelas})
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasteImportBox(v => !v);
                      setShowDetail57Editor(false);
                      setShowGradeEditor(false);
                      setShowHal2PerkembanganEditor(false);
                    }}
                    className={`px-3 py-1 rounded font-semibold text-[11px] border flex items-center gap-1 whitespace-nowrap ${
                      showPasteImportBox
                        ? 'bg-slate-900 text-amber-400 border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Tempel Lembar Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetail57Editor(v => !v);
                      setShowPasteImportBox(false);
                      setShowGradeEditor(false);
                      setShowHal2PerkembanganEditor(false);
                    }}
                    className={`px-3 py-1 rounded font-semibold text-[11px] border flex items-center gap-1 whitespace-nowrap ${
                      showDetail57Editor
                        ? 'bg-slate-900 text-amber-400 border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{showDetail57Editor ? 'Tutup Butir 1–57' : 'Edit Butir 1–57 (A–J)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGradeEditor(v => !v);
                      setShowDetail57Editor(false);
                      setShowPasteImportBox(false);
                      setShowHal2PerkembanganEditor(false);
                    }}
                    className={`px-3 py-1 rounded font-semibold text-[11px] border whitespace-nowrap ${
                      showGradeEditor
                        ? 'bg-slate-900 text-amber-400 border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {showGradeEditor ? 'Tutup Input Nilai' : 'Input Nilai Mapel (Hal. 2)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowHal2PerkembanganEditor(v => !v);
                      setShowDetail57Editor(false);
                      setShowPasteImportBox(false);
                      setShowGradeEditor(false);
                    }}
                    className={`px-3 py-1 rounded font-semibold text-[11px] border whitespace-nowrap ${
                      showHal2PerkembanganEditor
                        ? 'bg-slate-900 text-amber-400 border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {showHal2PerkembanganEditor ? 'Tutup Sikap & Status' : 'Sikap, Ekskul & Status (Hal. 2)'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Buku Induk</label>
                  <input
                    type="text"
                    value={
                      siswaMetaMap[activeSiswa.id]?.nomorBukuInduk ??
                      (activeSiswa.nipd || activeSiswa.nis || '')
                    }
                    onChange={e =>
                      updateSiswaMeta(activeSiswa.id, { nomorBukuInduk: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Masuk</label>
                  <input
                    type="text"
                    value={siswaMetaMap[activeSiswa.id]?.tahunMasuk ?? '2026/2027'}
                    onChange={e =>
                      updateSiswaMeta(activeSiswa.id, { tahunMasuk: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Diterima</label>
                  <input
                    type="text"
                    value={siswaMetaMap[activeSiswa.id]?.tanggalDiterima ?? '14 Juli 2026'}
                    onChange={e =>
                      updateSiswaMeta(activeSiswa.id, { tanggalDiterima: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kurikulum Kondisional Khusus Siswa Ini
                  </label>
                  <select
                    value={siswaMetaMap[activeSiswa.id]?.kurikulumKhususId || ''}
                    onChange={e =>
                      updateSiswaMeta(activeSiswa.id, {
                        kurikulumKhususId: e.target.value || undefined
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="">
                      Ikut Kurikulum Aktif ({activeConfig.jenisKurikulum})
                    </option>
                    {kurikulumRepo.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.nama} ({r.susunanPelajaran.length} Mapel)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Filter Kondisi Pelajaran
                  </label>
                  <select
                    value={conditionPreviewMode}
                    onChange={e =>
                      setConditionPreviewMode(
                        e.target.value as 'auto' | 'all' | 'X' | 'XI' | 'XII'
                      )
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="auto">Otomatis (Sesuai Kelas Siswa)</option>
                    <option value="all">Semua Mapel Kurikulum</option>
                    <option value="X">Simulasi Kelas X (Fase E)</option>
                    <option value="XI">Simulasi Kelas XI (Fase F)</option>
                    <option value="XII">Simulasi Kelas XII (Fase F)</option>
                  </select>
                </div>
              </div>

              {showPasteImportBox && (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900">
                        Tempel Data Lembar Buku Induk SMA (Hal. 1 Identitas A–J atau Hal. 2 Lembar Nilai)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Otomatis mendeteksi Lembar Identitas (1–57) maupun Lembar Nilai Multi-Tahun (K-13 Peng/Ket, Ekskul, Absensi, Status Akhir Tahun) dan membersihkan #REF!, #N/A, serta 0 kosong.
                      </p>
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    value={pasteRawText}
                    onChange={e => setPasteRawText(e.target.value)}
                    placeholder="Tempel teks salinan Lembar Buku Induk Peserta Didik SMA (Hal. 1 atau Hal. 2 Nilai) di sini..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-[11px] bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseLembarBukuIndukText(pasteRawText);
                        if (parsed.matchedFieldCount === 0) {
                          notify('error', 'Format lembar Buku Induk tidak terdeteksi. Pastikan teks Hal. 1 (1–57) atau Hal. 2 (Nilai/Ekskul) ikut ditempel.');
                          return;
                        }
                        const k13RepoMatch =
                          parsed.detectedKind !== 'identitas' && !/2013|k-?13/i.test(activeConfig.jenisKurikulum)
                            ? kurikulumRepo.find(r => /2013|k-?13/i.test(r.jenisKurikulum))
                            : undefined;
                        const finalMetaPatch: Partial<BukuIndukSiswaMeta> = {
                          ...parsed.metaPatch,
                          ...(k13RepoMatch && !siswaMetaMap[activeSiswa.id]?.kurikulumKhususId
                            ? { kurikulumKhususId: k13RepoMatch.id }
                            : {})
                        };
                        updateSiswaMeta(activeSiswa.id, finalMetaPatch);
                        if (onUpdateSiswa && Object.keys(parsed.siswaPatch).length > 0) {
                          const nextList = siswaList.map(s =>
                            s.id === activeSiswa.id ? { ...s, ...parsed.siswaPatch } : s
                          );
                          onUpdateSiswa(nextList);
                        }
                        if (parsed.detectedKind === 'nilai') {
                          setActiveSheetType('nilai');
                        } else if (parsed.detectedKind === 'identitas') {
                          setActiveSheetType('identitas');
                        }
                        appendAuditLog(
                          'IMPOR_LEMBAR_BUKU_INDUK',
                          `Memperbarui ${parsed.matchedFieldCount} isian Buku Induk (${parsed.detectedKind}) pada siswa ${parsed.siswaPatch.nama || activeSiswa.nama}.`
                        );
                        setShowPasteImportBox(false);
                        setPasteRawText('');
                        notify(
                          'success',
                          `Berhasil memetakan & membersihkan ${parsed.matchedFieldCount} isian (${parsed.detectedKind === 'nilai' ? 'Lembar Nilai' : 'Lembar Identitas'}) ke "${parsed.siswaPatch.nama || activeSiswa.nama}".`
                        );
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Terapkan ke Siswa Terpilih ({activeSiswa.nama})</span>
                    </button>

                    {onUpdateSiswa && (
                      <button
                        type="button"
                        onClick={() => {
                          const parsed = parseLembarBukuIndukText(pasteRawText);
                          if (parsed.matchedFieldCount === 0 || !parsed.siswaPatch.nama) {
                            notify('error', 'Nama peserta didik tidak ditemukan dari teks tempelan.');
                            return;
                          }
                          const newId = `sis-induk-${Date.now()}`;
                          const k13RepoMatch =
                            parsed.detectedKind !== 'identitas' && !/2013|k-?13/i.test(activeConfig.jenisKurikulum)
                              ? kurikulumRepo.find(r => /2013|k-?13/i.test(r.jenisKurikulum))
                              : undefined;
                          const fallbackKelas =
                            parsed.siswaPatch.kelas ||
                            (parsed.metaPatch.programStudi ? `XII-${parsed.metaPatch.programStudi}.1` : 'XII-IPS.1');
                          const newSiswa: Siswa = {
                            id: newId,
                            nisn: parsed.siswaPatch.nisn || '-',
                            nis: parsed.siswaPatch.nis || '-',
                            nipd: parsed.siswaPatch.nipd || parsed.siswaPatch.nis || '-',
                            nama: parsed.siswaPatch.nama,
                            kelas: fallbackKelas,
                            rombelSaatIni: parsed.siswaPatch.rombelSaatIni || fallbackKelas,
                            jenisKelamin: parsed.siswaPatch.jenisKelamin || 'L',
                            agama: parsed.siswaPatch.agama || 'Islam',
                            status: 'Aktif',
                            ...parsed.siswaPatch
                          };
                          onUpdateSiswa([newSiswa, ...siswaList]);
                          updateSiswaMeta(newId, {
                            ...parsed.metaPatch,
                            ...(k13RepoMatch ? { kurikulumKhususId: k13RepoMatch.id } : {})
                          });
                          setSelectedSiswaId(newId);
                          if (parsed.detectedKind === 'nilai') {
                            setActiveSheetType('nilai');
                          } else if (parsed.detectedKind === 'identitas') {
                            setActiveSheetType('identitas');
                          }
                          setShowPasteImportBox(false);
                          setPasteRawText('');
                          notify('success', `Siswa baru "${newSiswa.nama}" ditambahkan ke Master Data & Buku Induk.`);
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded font-semibold flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Sebagai Siswa Baru</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {showDetail57Editor && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="font-bold text-slate-900">
                    Editor Lengkap Butir 1–57 (Bagian A–J) — Otomatis Tersimpan
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {[
                      { key: 'nomorUrutInduk', label: 'No. Urut Lembar Induk', placeholder: 'mis. 365' },
                      { key: 'namaPanggilan', label: '1b. Nama Panggilan', placeholder: '-' },
                      { key: 'kewarganegaraan', label: '5. Kewarganegaraan', placeholder: 'Indonesia' },
                      { key: 'jumlahSaudaraTiri', label: '8. Jml Saudara Tiri', placeholder: '-' },
                      { key: 'jumlahSaudaraAngkat', label: '9. Jml Saudara Angkat', placeholder: '-' },
                      { key: 'statusYatimPiatu', label: '10. Yatim/Piatu', placeholder: '-' },
                      { key: 'bahasaRumah', label: '11. Bahasa di Rumah', placeholder: 'Indonesia' },
                      { key: 'golonganDarah', label: '16. Golongan Darah', placeholder: 'A / B / AB / O' },
                      { key: 'penyakitPernahDiderita', label: '17. Penyakit Pernah Diderita', placeholder: '-' },
                      { key: 'kelainanJasmani', label: '18. Kelainan Jasmani', placeholder: '-' },
                      { key: 'tinggiBeratSaatDiterima', label: '19. TB / BB Saat Diterima', placeholder: '165 cm / 52 kg' },
                      { key: 'tamatanDari', label: '20a. Tamatan Dari (SMP/MTs)', placeholder: 'SMP Negeri ...' },
                      { key: 'tglNoIjazahSebelumnya', label: '20b. Tgl & No. Ijazah', placeholder: '-' },
                      { key: 'tglNoSttlSebelumnya', label: '20c. Tgl & No. STTL', placeholder: '-' },
                      { key: 'lamaBelajarSebelumnya', label: '20d. Lama Belajar', placeholder: '3 Tahun' },
                      { key: 'pindahanDariSekolah', label: '21a. Pindahan Dari Sekolah', placeholder: '-' },
                      { key: 'alasanPindahan', label: '21b. Alasan Pindah', placeholder: '-' },
                      { key: 'diterimaDiKelas', label: '22a. Diterima di Kelas', placeholder: 'X' },
                      { key: 'diterimaKelompok', label: '22b. Kelompok / Peminatan', placeholder: 'Umum / IPS / MIPA' },
                      { key: 'ayahTtl', label: '24. TTL Ayah Kandung', placeholder: 'Surabaya, 1966' },
                      { key: 'ayahAgama', label: '25. Agama Ayah', placeholder: 'Islam' },
                      { key: 'ayahWargaNegara', label: '26. Kewarganegaraan Ayah', placeholder: 'Indonesia' },
                      { key: 'ayahAlamatTelp', label: '30. Alamat/HP Ayah', placeholder: '-' },
                      { key: 'ayahStatusHidup', label: '31. Status Ayah', placeholder: 'Masih hidup' },
                      { key: 'ibuTtl', label: '33. TTL Ibu Kandung', placeholder: 'Surabaya, 1966' },
                      { key: 'ibuAgama', label: '34. Agama Ibu', placeholder: 'Islam' },
                      { key: 'ibuWargaNegara', label: '35. Kewarganegaraan Ibu', placeholder: 'Indonesia' },
                      { key: 'ibuAlamatTelp', label: '39. Alamat/HP Ibu', placeholder: '-' },
                      { key: 'ibuStatusHidup', label: '40. Status Ibu', placeholder: 'Masih hidup' },
                      { key: 'waliTtl', label: '42. TTL Wali', placeholder: '-' },
                      { key: 'waliAgama', label: '43. Agama Wali', placeholder: '-' },
                      { key: 'waliWargaNegara', label: '44. Kewarganegaraan Wali', placeholder: '-' },
                      { key: 'waliAlamatTelp', label: '48. Alamat/HP Wali', placeholder: '-' },
                      { key: 'kegemaranKesenian', label: '49. Kegemaran Kesenian', placeholder: '-' },
                      { key: 'kegemaranOlahraga', label: '50. Kegemaran Olahraga', placeholder: '-' },
                      { key: 'kegemaranOrganisasi', label: '51. Organisasi / Ekskul', placeholder: '-' },
                      { key: 'kegemaranLain', label: '52. Kegemaran Lain-lain', placeholder: '-' },
                      { key: 'menerimaBeasiswa', label: '53. Menerima Beasiswa', placeholder: '-' },
                      { key: 'tanggalKeluarMutasi', label: '54a. Tgl Meninggalkan Sekolah', placeholder: '-' },
                      { key: 'alasanKeluarMutasi', label: '54b. Alasan Meninggalkan', placeholder: '-' },
                      { key: 'tamatBelajarLulus', label: '55a. Tamat Belajar / Lulus', placeholder: '-' },
                      { key: 'noIjazahAkhir', label: '55b. Nomor Ijazah Akhir', placeholder: '-' },
                      { key: 'noSuratTandaLulus', label: '55c. No. Surat Tanda Lulus', placeholder: '-' },
                      { key: 'nilaiRataRataAkhir', label: '55d. Nilai Rata-Rata', placeholder: '-' },
                      { key: 'akanMelanjutkanKe', label: '56. Akan Melanjutkan Ke', placeholder: '-' },
                      { key: 'akanBekerjaDi', label: '57. Akan Bekerja Di', placeholder: '-' }
                    ].map(f => {
                      const currMeta = siswaMetaMap[activeSiswa.id] as unknown as Record<string, unknown> | undefined;
                      const val = (currMeta?.[f.key] as string) || '';
                      return (
                        <div key={f.key}>
                          <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5 truncate">
                            {f.label}
                          </label>
                          <input
                            type="text"
                            value={val}
                            placeholder={f.placeholder}
                            onChange={e =>
                              updateSiswaMeta(activeSiswa.id, {
                                [f.key]: e.target.value
                              } as Partial<BukuIndukSiswaMeta>)
                            }
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {showGradeEditor && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      Input Nilai Buku Induk ({resolveCurriculumForStudent(activeSiswa).sourceJenis} ·{' '}
                      {resolveCurriculumForStudent(activeSiswa).resolvedMapel.length} Mapel):
                    </span>
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                      {SEMESTER_KEYS.map(smt => (
                        <button
                          key={smt}
                          type="button"
                          onClick={() => setActiveGradeSemester(smt)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                            activeGradeSemester === smt
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {smt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const resolvedStu = resolveCurriculumForStudent(activeSiswa);
                    const isK13Active = /2013|k-?13/i.test(resolvedStu.sourceJenis);
                    const semIdx = Math.max(
                      1,
                      SEMESTER_KEYS.indexOf(activeGradeSemester as (typeof SEMESTER_KEYS)[number]) + 1
                    );
                    const sKey = `S${semIdx}`;
                    const metaCurr = siswaMetaMap[activeSiswa.id];

                    return (
                      <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-slate-50 text-slate-700 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                              <th className="px-2.5 py-1.5">Mata Pelajaran</th>
                              <th className="px-2 py-1.5 w-16 text-center">KKM</th>
                              {isK13Active ? (
                                <>
                                  <th className="px-2 py-1.5 w-20 text-center">Peng (N)</th>
                                  <th className="px-2 py-1.5 w-14 text-center">Peng (P)</th>
                                  <th className="px-2 py-1.5 w-20 text-center">Ket (N)</th>
                                  <th className="px-2 py-1.5 w-14 text-center">Ket (P)</th>
                                </>
                              ) : (
                                <>
                                  <th className="px-2 py-1.5 w-24 text-center">Nilai Rapor</th>
                                  <th className="px-2 py-1.5 w-20 text-center">Predikat</th>
                                </>
                              )}
                              <th className="px-2 py-1.5 w-20 text-center">Rata Rapor</th>
                              <th className="px-2 py-1.5 w-20 text-center">Nilai US</th>
                              <th className="px-2 py-1.5 w-20 text-center">Nilai STL</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {resolvedStu.resolvedMapel.map(m => {
                              const transkrip = metaCurr?.transkripNilai || {};
                              const rec =
                                transkrip[m.id] ||
                                Object.values(transkrip).find(
                                  r =>
                                    normalizeMapelMatchKey(r.namaMapel) ===
                                    normalizeMapelMatchKey(m.namaMapel)
                                );
                              const sc = rec?.semesters?.[sKey] || {};
                              const legacyVal =
                                metaCurr?.nilaiPerMapel?.[activeGradeSemester]?.[m.id] || '';
                              const pengN = sc.pengN ?? legacyVal;
                              const pengP = sc.pengP ?? '';
                              const ketN = sc.ketN ?? '';
                              const ketP = sc.ketP ?? '';
                              const nilaiAkhir = sc.nilaiAkhir ?? pengN;
                              const predikat = sc.predikat ?? pengP;
                              const kkmVal = sc.kkm ?? rec?.kkm ?? (m.kkm ? String(m.kkm) : '75');

                              return (
                                <tr key={m.id} className="hover:bg-slate-50/70">
                                  <td className="px-2.5 py-1 font-medium text-slate-900">
                                    {m.namaMapel}
                                    <span className="text-[10px] text-slate-400 ml-1">
                                      ({m.kode || m.kelompok})
                                    </span>
                                  </td>
                                  <td className="px-1.5 py-1 text-center">
                                    <input
                                      type="text"
                                      value={kkmVal}
                                      onChange={e =>
                                        updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                          kkm: e.target.value
                                        })
                                      }
                                      className="w-12 px-1 py-0.5 border border-slate-300 rounded text-center font-mono tabular-nums"
                                    />
                                  </td>
                                  {isK13Active ? (
                                    <>
                                      <td className="px-1.5 py-1 text-center">
                                        <input
                                          type="text"
                                          value={pengN}
                                          onChange={e =>
                                            updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                              pengN: e.target.value,
                                              nilaiAkhir: e.target.value
                                            })
                                          }
                                          placeholder="0-100"
                                          className="w-16 px-1 py-0.5 border border-slate-300 rounded text-center font-mono font-bold tabular-nums"
                                        />
                                      </td>
                                      <td className="px-1.5 py-1 text-center">
                                        <input
                                          type="text"
                                          value={pengP}
                                          onChange={e =>
                                            updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                              pengP: e.target.value.toUpperCase()
                                            })
                                          }
                                          placeholder="A/B/C"
                                          className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center font-mono uppercase"
                                        />
                                      </td>
                                      <td className="px-1.5 py-1 text-center">
                                        <input
                                          type="text"
                                          value={ketN}
                                          onChange={e =>
                                            updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                              ketN: e.target.value
                                            })
                                          }
                                          placeholder="0-100"
                                          className="w-16 px-1 py-0.5 border border-slate-300 rounded text-center font-mono font-bold tabular-nums"
                                        />
                                      </td>
                                      <td className="px-1.5 py-1 text-center">
                                        <input
                                          type="text"
                                          value={ketP}
                                          onChange={e =>
                                            updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                              ketP: e.target.value.toUpperCase()
                                            })
                                          }
                                          placeholder="A/B/C"
                                          className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center font-mono uppercase"
                                        />
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-1.5 py-1 text-center">
                                        <input
                                          type="text"
                                          value={nilaiAkhir}
                                          onChange={e => {
                                            updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                              nilaiAkhir: e.target.value,
                                              pengN: e.target.value
                                            });
                                            updateSiswaMapelNilai(
                                              activeSiswa.id,
                                              activeGradeSemester,
                                              m.id,
                                              e.target.value
                                            );
                                          }}
                                          placeholder="0-100"
                                          className="w-16 px-1 py-0.5 border border-slate-300 rounded text-center font-mono font-bold tabular-nums"
                                        />
                                      </td>
                                      <td className="px-1.5 py-1 text-center">
                                        <input
                                          type="text"
                                          value={predikat}
                                          onChange={e =>
                                            updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                              predikat: e.target.value.toUpperCase()
                                            })
                                          }
                                          placeholder="A/B/C"
                                          className="w-12 px-1 py-0.5 border border-slate-300 rounded text-center font-mono uppercase"
                                        />
                                      </td>
                                    </>
                                  )}
                                  <td className="px-1.5 py-1 text-center">
                                    <input
                                      type="text"
                                      value={rec?.rataRapor || ''}
                                      onChange={e =>
                                        updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                          rataRapor: e.target.value
                                        })
                                      }
                                      placeholder="-"
                                      className="w-14 px-1 py-0.5 border border-slate-300 rounded text-center font-mono tabular-nums"
                                    />
                                  </td>
                                  <td className="px-1.5 py-1 text-center">
                                    <input
                                      type="text"
                                      value={rec?.nilaiUs || ''}
                                      onChange={e =>
                                        updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                          nilaiUs: e.target.value
                                        })
                                      }
                                      placeholder="-"
                                      className="w-14 px-1 py-0.5 border border-slate-300 rounded text-center font-mono tabular-nums"
                                    />
                                  </td>
                                  <td className="px-1.5 py-1 text-center">
                                    <input
                                      type="text"
                                      value={rec?.nilaiIjazah || ''}
                                      onChange={e =>
                                        updateSiswaTranskripScore(activeSiswa.id, m, semIdx, {
                                          nilaiIjazah: e.target.value
                                        })
                                      }
                                      placeholder="-"
                                      className="w-14 px-1 py-0.5 border border-slate-300 rounded text-center font-mono tabular-nums"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {showHal2PerkembanganEditor && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="font-bold text-slate-900">
                    Editor Sikap, Pengembangan Diri, Ketidakhadiran, Status Akhir Tahun & Wali Kelas (Hal. 2)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                        Program Studi / Peminatan
                      </label>
                      <input
                        type="text"
                        value={siswaMetaMap[activeSiswa.id]?.programStudi ?? activeSiswa.jurusan ?? ''}
                        onChange={e =>
                          updateSiswaMeta(activeSiswa.id, { programStudi: e.target.value })
                        }
                        placeholder="IPS / MIPA / Fase F"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                        Tahun Ijazah
                      </label>
                      <input
                        type="text"
                        value={siswaMetaMap[activeSiswa.id]?.tahunAjaranMeta?.ijazahTahun ?? ''}
                        onChange={e =>
                          updateSiswaMeta(activeSiswa.id, {
                            tahunAjaranMeta: {
                              ...(siswaMetaMap[activeSiswa.id]?.tahunAjaranMeta || {}),
                              ijazahTahun: e.target.value
                            }
                          })
                        }
                        placeholder="Tahun 2027"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                        Status Kelulusan Akhir
                      </label>
                      <select
                        value={siswaMetaMap[activeSiswa.id]?.tahunAjaranMeta?.statusKelulusan || ''}
                        onChange={e =>
                          updateSiswaMeta(activeSiswa.id, {
                            tahunAjaranMeta: {
                              ...(siswaMetaMap[activeSiswa.id]?.tahunAjaranMeta || {}),
                              statusKelulusan: e.target.value as 'Lulus' | 'Tidak Lulus' | ''
                            }
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="">Otomatis (Sesuai Status Siswa)</option>
                        <option value="Lulus">Lulus</option>
                        <option value="Tidak Lulus">Tidak Lulus</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">
                        Organisasi Sekolah (Bagian B)
                      </label>
                      <input
                        type="text"
                        value={siswaMetaMap[activeSiswa.id]?.organisasiSekolah ?? ''}
                        onChange={e =>
                          updateSiswaMeta(activeSiswa.id, { organisasiSekolah: e.target.value })
                        }
                        placeholder="OSIS / MPK / ..."
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                      />
                    </div>
                  </div>

                  {/* Per-Tahun X, XI, XII */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {(['X', 'XI', 'XII'] as const).map(yr => {
                      const ym = siswaMetaMap[activeSiswa.id]?.tahunAjaranMeta?.[yr] || {};
                      return (
                        <div key={yr} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 space-y-2">
                          <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                            Data Kelas {yr}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[10px] text-slate-600">Tahun Pelajaran</label>
                              <input
                                type="text"
                                value={ym.tahunPelajaran || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, {
                                    tahunPelajaran: e.target.value
                                  })
                                }
                                placeholder="2024/2025"
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-mono text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-600">Naik ke Kelas</label>
                              <input
                                type="text"
                                value={ym.naikKeKelas || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, {
                                    naikKeKelas: e.target.value,
                                    statusAkhir: 'Naik'
                                  })
                                }
                                placeholder={yr === 'X' ? 'XI-IPS.1' : yr === 'XI' ? 'XII-IPS.1' : 'Lulus'}
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-600">Sikap Spiritual</label>
                              <input
                                type="text"
                                value={ym.sikapSpiritual || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, {
                                    sikapSpiritual: e.target.value
                                  })
                                }
                                placeholder="Baik / Sangat Baik"
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-600">Sikap Sosial</label>
                              <input
                                type="text"
                                value={ym.sikapSosial || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, {
                                    sikapSosial: e.target.value
                                  })
                                }
                                placeholder="Baik / Sangat Baik"
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="block text-[10px] text-slate-600">Sakit (hr)</label>
                              <input
                                type="text"
                                value={ym.sakit || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, { sakit: e.target.value })
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-center font-mono text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-600">Ijin (hr)</label>
                              <input
                                type="text"
                                value={ym.ijin || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, { ijin: e.target.value })
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-center font-mono text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-600">Alpa (hr)</label>
                              <input
                                type="text"
                                value={ym.alpha || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, { alpha: e.target.value })
                                }
                                placeholder="0"
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-center font-mono text-[11px]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[10px] text-slate-600">Jabatan Wali</label>
                              <input
                                type="text"
                                value={ym.waliKelasLabel || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, {
                                    waliKelasLabel: e.target.value
                                  })
                                }
                                placeholder={`Wali Kelas ${yr}`}
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-600">Nama Wali Kelas</label>
                              <input
                                type="text"
                                value={ym.waliKelasNama || ''}
                                onChange={e =>
                                  updateTahunAjaranField(activeSiswa.id, yr, {
                                    waliKelasNama: e.target.value
                                  })
                                }
                                placeholder="Nama Wali Kelas"
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ekstrakurikuler Editor */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        Kegiatan Ekstrakurikuler (Bagian A)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const curr = siswaMetaMap[activeSiswa.id]?.ekskulRecords || [];
                          updateSiswaMeta(activeSiswa.id, {
                            ekskulRecords: [
                              ...curr,
                              { nama: 'Ekstrakurikuler Baru', x: 'Baik', xi: 'Baik', xii: '' }
                            ]
                          });
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Ekskul</span>
                      </button>
                    </div>
                    {(siswaMetaMap[activeSiswa.id]?.ekskulRecords || []).map((ex, eIdx) => (
                      <div key={eIdx} className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          value={ex.nama}
                          onChange={e => {
                            const next: BukuIndukEkskulItem[] = [
                              ...(siswaMetaMap[activeSiswa.id]?.ekskulRecords || [])
                            ];
                            next[eIdx] = { ...next[eIdx], nama: e.target.value };
                            updateSiswaMeta(activeSiswa.id, { ekskulRecords: next });
                          }}
                          className="col-span-5 px-2 py-1 border border-slate-300 rounded text-[11px]"
                          placeholder="Nama Ekstrakurikuler"
                        />
                        {(['x', 'xi', 'xii'] as const).map(yr => (
                          <input
                            key={yr}
                            type="text"
                            value={ex[yr] || ''}
                            onChange={e => {
                              const next: BukuIndukEkskulItem[] = [
                                ...(siswaMetaMap[activeSiswa.id]?.ekskulRecords || [])
                              ];
                              next[eIdx] = { ...next[eIdx], [yr]: e.target.value };
                              updateSiswaMeta(activeSiswa.id, { ekskulRecords: next });
                            }}
                            placeholder={`Predikat ${yr.toUpperCase()}`}
                            className="col-span-2 px-2 py-1 border border-slate-300 rounded text-[11px] text-center"
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const next = (siswaMetaMap[activeSiswa.id]?.ekskulRecords || []).filter(
                              (_, idx) => idx !== eIdx
                            );
                            updateSiswaMeta(activeSiswa.id, { ekskulRecords: next });
                          }}
                          className="col-span-1 p-1 text-rose-600 hover:bg-rose-50 rounded flex justify-center"
                          title="Hapus baris ekskul"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Printable Buku Induk Sheets */}
          <div className="space-y-6 overflow-x-auto pb-6 print:overflow-visible print:pb-0">
            <div
              className="buku-induk-preview-zoom-wrap w-fit mx-auto space-y-6 print:w-full print:space-y-0"
              style={{ zoom: previewZoomPct / 100 }}
            >
              {studentsToPrint.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-400">
                  Pilih minimal 1 siswa untuk menampilkan Lembar Buku Induk Siswa.
                </div>
              ) : (
                studentsToPrint.map((st, idx) => renderBukuIndukSheet(st, idx))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KURIKULUM & SUSUNAN PELAJARAN KONDISIONAL */}
      {activeTab === 'kurikulum' && (
        <div className="no-print space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 text-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pengaturan Jenis Kurikulum & Daftar Susunan Pelajaran Kondisional
                </h3>
                <p className="text-[11px] text-slate-500">
                  Susunan mata pelajaran di bawah akan menyertai kurikulum aktif dan tersaring otomatis per tingkat (X, XI, XII) atau rumpun/peminatan siswa di Buku Induk.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCreateFreshKurikulum}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Buat Kurikulum Baru</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">Jenis Kurikulum</label>
                <select
                  value={activeConfig.jenisKurikulum}
                  onChange={e =>
                    updateActiveConfig({ ...activeConfig, jenisKurikulum: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  {KURIKULUM_JENIS_OPTIONS.map(k => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Paket Kurikulum Aktif
                </label>
                <input
                  type="text"
                  value={activeConfig.namaKurikulumAktif}
                  onChange={e =>
                    updateActiveConfig({ ...activeConfig, namaKurikulumAktif: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Tahun Pelajaran</label>
                <input
                  type="text"
                  value={activeConfig.tahunPelajaran}
                  onChange={e =>
                    updateActiveConfig({ ...activeConfig, tahunPelajaran: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Skala Nilai</label>
                <select
                  value={activeConfig.skalaNilai || '0-100'}
                  onChange={e =>
                    updateActiveConfig({
                      ...activeConfig,
                      skalaNilai: e.target.value as BukuIndukActiveConfig['skalaNilai']
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                >
                  <option value="0-100">0 - 100</option>
                  <option value="Predikat A-D">Predikat A - D</option>
                  <option value="Desimal 0-4">Desimal 0 - 4</option>
                </select>
              </div>
              <div className="md:col-span-5">
                <label className="block font-semibold text-slate-700 mb-1">
                  Dasar Hukum / SK Kurikulum
                </label>
                <input
                  type="text"
                  value={activeConfig.skKurikulum || ''}
                  onChange={e =>
                    updateActiveConfig({ ...activeConfig, skKurikulum: e.target.value })
                  }
                  placeholder="mis: Permendikbudristek No. 12 Tahun 2024"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block font-semibold text-slate-700 mb-1">
                  Keterangan Fase / Program
                </label>
                <input
                  type="text"
                  value={activeConfig.faseDefault || ''}
                  onChange={e =>
                    updateActiveConfig({ ...activeConfig, faseDefault: e.target.value })
                  }
                  placeholder="mis: Fase E (X) & Fase F (XI-XII)"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">
                  Kota & Tanggal Pengesahan
                </label>
                <input
                  type="text"
                  value={activeConfig.kotaTanggalCetak || ''}
                  onChange={e =>
                    updateActiveConfig({ ...activeConfig, kotaTanggalCetak: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Simpan ke Repositori Bar */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-end gap-2.5">
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  Simpan Paket Kurikulum ke Repositori (Anti-Timpa)
                </label>
                <input
                  type="text"
                  value={repoNameInput}
                  onChange={e => setRepoNameInput(e.target.value)}
                  placeholder="Nama kurikulum untuk disimpan ke repositori..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                />
              </div>
              <div className="lg:w-60">
                <label className="block font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
                <input
                  type="text"
                  value={repoDescInput}
                  onChange={e => setRepoDescInput(e.target.value)}
                  placeholder="mis: K-13 MIPA/IPS TP 2023/2024"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {linkedRepoItem && !matchedRepoItem && (
                  <button
                    type="button"
                    onClick={() => handleUpdateLinkedRepoItem(linkedRepoItem.id)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Perbarui Slot Aktif</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveKurikulumAsNew}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-amber-400 rounded font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan ke Repositori</span>
                </button>
              </div>
            </div>

            {/* Tabel Editor Susunan Pelajaran Kondisional */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">
                    Daftar Susunan Pelajaran ({activeConfig.susunanPelajaran.length} Mapel)
                  </span>
                  <div className="inline-flex rounded border border-slate-300 bg-white p-0.5 text-[11px]">
                    {(['Semua', 'X', 'XI', 'XII'] as const).map(tk => (
                      <button
                        key={tk}
                        type="button"
                        onClick={() => setMapelFilterTingkat(tk)}
                        className={`px-2 py-0.5 rounded font-semibold ${
                          mapelFilterTingkat === tk
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tk === 'Semua' ? 'Semua Tingkat' : `Kelas ${tk}`}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddMapelRow}
                  className="px-3 py-1 bg-slate-900 hover:bg-black text-amber-400 rounded font-bold text-[11px] flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Mata Pelajaran</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-800 text-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 w-8 text-center">No</th>
                      <th className="px-2 py-2 w-20">Kode</th>
                      <th className="px-2 py-2 w-48">Kelompok</th>
                      <th className="px-2 py-2">Nama Mata Pelajaran</th>
                      <th className="px-2 py-2 w-16 text-center">JP</th>
                      <th className="px-2 py-2 w-16 text-center">KKTP</th>
                      <th className="px-2 py-2 w-28">Kondisi Tingkat</th>
                      <th className="px-2 py-2 w-36">Kondisi Rumpun/Kelas</th>
                      <th className="px-2 py-2 w-28">Sifat</th>
                      <th className="px-2 py-2 w-10 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {activeConfig.susunanPelajaran
                      .filter(
                        m =>
                          mapelFilterTingkat === 'Semua' ||
                          !m.kondisiTingkat ||
                          m.kondisiTingkat === 'Semua' ||
                          m.kondisiTingkat === mapelFilterTingkat
                      )
                      .map((m, idx) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-2 py-1.5 text-center font-mono text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={m.kode || ''}
                              onChange={e => handleUpdateMapelRow(m.id, { kode: e.target.value })}
                              className="w-full px-1.5 py-1 border border-slate-300 rounded font-mono text-[11px]"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={m.kelompok}
                              onChange={e =>
                                handleUpdateMapelRow(m.id, { kelompok: e.target.value })
                              }
                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-[11px]"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={m.namaMapel}
                              onChange={e =>
                                handleUpdateMapelRow(m.id, { namaMapel: e.target.value })
                              }
                              className="w-full px-1.5 py-1 border border-slate-300 rounded font-semibold"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={m.jpPerMinggu ?? 2}
                              onChange={e =>
                                handleUpdateMapelRow(m.id, {
                                  jpPerMinggu: Number(e.target.value)
                                })
                              }
                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-center font-mono tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={m.kkm ?? 75}
                              onChange={e =>
                                handleUpdateMapelRow(m.id, { kkm: Number(e.target.value) })
                              }
                              className="w-full px-1.5 py-1 border border-slate-300 rounded text-center font-mono tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={m.kondisiTingkat || 'Semua'}
                              onChange={e =>
                                handleUpdateMapelRow(m.id, {
                                  kondisiTingkat: e.target.value as KurikulumMapelItem['kondisiTingkat']
                                })
                              }
                              className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white font-semibold"
                            >
                              <option value="Semua">Semua</option>
                              <option value="X">Kelas X</option>
                              <option value="XI">Kelas XI</option>
                              <option value="XII">Kelas XII</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={m.kondisiRumpun || 'Semua'}
                              onChange={e =>
                                handleUpdateMapelRow(m.id, { kondisiRumpun: e.target.value })
                              }
                              placeholder="Semua / MIPA / IPS"
                              className="w-full px-1.5 py-1 border border-slate-300 rounded font-mono text-[11px]"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={m.kondisiStatus || 'Wajib'}
                              onChange={e =>
                                handleUpdateMapelRow(m.id, {
                                  kondisiStatus: e.target.value as KurikulumMapelItem['kondisiStatus']
                                })
                              }
                              className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white"
                            >
                              <option value="Wajib">Wajib</option>
                              <option value="Pilihan">Pilihan</option>
                              <option value="Muatan Lokal">Muatan Lokal</option>
                              <option value="Kokurikuler">Kokurikuler</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveMapelRow(m.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              title="Hapus mata pelajaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPOSITORI KURIKULUM & SUSUNAN PELAJARAN */}
      {activeTab === 'repositori' && (
        <div className="no-print bg-white border border-slate-200 rounded-lg overflow-hidden text-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Repositori Kurikulum & Daftar Susunan Pelajaran ({kurikulumRepo.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Pilih dan <strong>Apply</strong> kurikulum mana saja (Kurikulum Merdeka, K-13, KTSP 2006, atau Kurikulum Kustom). Perubahan baru otomatis mengarsipkan yang lama agar tidak menimpa data sebelumnya.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={repoSearchQuery}
                  onChange={e => setRepoSearchQuery(e.target.value)}
                  placeholder="Cari kurikulum / mapel..."
                  className="pl-8 pr-3 py-1.5 border border-slate-300 rounded bg-white text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateFreshKurikulum}
                className="px-3 py-1.5 bg-slate-900 hover:bg-black text-amber-400 rounded font-bold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Susun Kurikulum Baru</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredRepoList.map(item => {
              const isApplied =
                computeKurikulumSignature(item.jenisKurikulum, item.susunanPelajaran) ===
                activeSignature;
              const isExpanded = expandedRepoId === item.id;
              const isRenaming = renamingRepoId === item.id;
              const isConfirmDelete = confirmDeleteRepoId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 transition-colors ${
                    isApplied ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={renamingRepoValue}
                            onChange={e => setRenamingRepoValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveRenameRepo(item.id);
                              if (e.key === 'Escape') setRenamingRepoId(null);
                            }}
                            className="px-2 py-1 border border-blue-400 rounded font-bold bg-white min-w-[260px]"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRenameRepo(item.id)}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingRepoId(null)}
                            className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{item.nama}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingRepoId(item.id);
                              setRenamingRepoValue(item.nama);
                            }}
                            className="p-0.5 text-slate-400 hover:text-blue-700"
                            title="Ubah nama paket kurikulum"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isApplied && (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Sedang Diterapkan</span>
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 tabular-nums">
                        <span className="font-semibold text-slate-800">{item.jenisKurikulum}</span>
                        <span aria-hidden="true">·</span>
                        <span>TP {item.tahunPelajaran}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-800">
                          {item.susunanPelajaran.length} Mata Pelajaran
                        </span>
                        {item.skKurikulum && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{item.skKurikulum}</span>
                          </>
                        )}
                      </div>
                      {item.deskripsi && (
                        <p className="text-[11px] text-slate-500">{item.deskripsi}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedRepoId(isExpanded ? null : item.id)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded font-medium text-slate-700 flex items-center gap-1 whitespace-nowrap"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                        <span>Susunan Pelajaran ({item.susunanPelajaran.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateRepoKurikulum(item)}
                        className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600"
                        title="Duplikat kurikulum ini"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {isConfirmDelete ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteRepo(item.id)}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[11px] whitespace-nowrap"
                          >
                            Konfirmasi Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteRepoId(null)}
                            className="px-2 py-1.5 bg-slate-100 rounded text-slate-700"
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
                        onClick={() => {
                          handleApplyRepoKurikulum(item);
                          setActiveTab('induk');
                        }}
                        className={`px-3.5 py-1.5 rounded font-bold flex items-center gap-1.5 whitespace-nowrap ${
                          isApplied
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{isApplied ? 'Terapkan & Buka Induk' : 'Apply Kurikulum'}</span>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200">
                            <th className="py-1 pr-2 w-8">No</th>
                            <th className="py-1 pr-2 w-16">Kode</th>
                            <th className="py-1 pr-2">Kelompok</th>
                            <th className="py-1 pr-2">Mata Pelajaran</th>
                            <th className="py-1 pr-2 w-12">JP</th>
                            <th className="py-1 pr-2 w-14">KKTP</th>
                            <th className="py-1 pr-2">Kondisi Tingkat</th>
                            <th className="py-1">Kondisi Rumpun</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {item.susunanPelajaran.map((m, idx) => (
                            <tr key={`${item.id}-${m.id}-${idx}`}>
                              <td className="py-1 pr-2 font-mono text-slate-400 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-1 pr-2 font-mono text-slate-600">{m.kode || '-'}</td>
                              <td className="py-1 pr-2 text-slate-600">{m.kelompok}</td>
                              <td className="py-1 pr-2 font-semibold text-slate-900">
                                {m.namaMapel}
                              </td>
                              <td className="py-1 pr-2 font-mono tabular-nums">
                                {m.jpPerMinggu ?? '-'}
                              </td>
                              <td className="py-1 pr-2 font-mono tabular-nums">{m.kkm ?? '-'}</td>
                              <td className="py-1 pr-2">{m.kondisiTingkat || 'Semua'}</td>
                              <td className="py-1 font-mono text-[10.5px]">
                                {m.kondisiRumpun || 'Semua'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
