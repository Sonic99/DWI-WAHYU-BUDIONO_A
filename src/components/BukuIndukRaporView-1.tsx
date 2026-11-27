import React, { useEffect, useMemo, useState } from 'react';
import {
  BukuIndukActiveConfig,
  BukuIndukEkskulItem,
  BukuIndukKurikulumRepoItem,
  BukuIndukMapelRecord,
  BukuIndukSemesterScore,
  BukuIndukSiswaMeta,
  BukuIndukTahunMeta,
  Guru,
  KurikulumMapelItem,
  SchoolProfile,
  Siswa,
  User
} from '../types';
import {
  appendAuditLog,
  getStoredBukuIndukConfig,
  getStoredBukuIndukKurikulumRepo,
  getStoredBukuIndukSiswaMeta,
  saveStoredBukuIndukSiswaMeta
} from '../services/storageService';
import {
  extractTingkatFromKelas,
  resolveSusunanPelajaranUntukSiswa
} from '../utils/kurikulumPresets';
import {
  cleanIndukDisplay,
  normalizeMapelMatchKey
} from '../utils/bukuIndukParser';
import { OfficialKopSurat } from './OfficialKopSurat';
import {
  KepalaSekolahSignatureSvg,
  PEMPROV_JATIM_OFFICIAL_LOGO_URL,
  PemprovJatimLogo,
  SchoolStampSvg,
  Sman9SurabayaLogoSvg,
  Sman9WavyWatermarkBg
} from './OfficialStamps';
import { ExamCardBarcode, resolveDirectImageUrl } from './ExamCardBarcode';
import { PrintTypographyBar } from './PrintTypographyBar';
import {
  getPrintTypographyStyleVars,
  getScopedPrintTypographyCss,
  getStoredPrintTypography,
  PrintTypographySettings,
  resolvePrintSpacingMeta,
  saveStoredPrintTypography
} from '../utils/printTypography';
import {
  AlertCircle,
  ArrowRightLeft,
  BookOpenCheck,
  Calculator,
  Check,
  CheckCircle2,
  CheckSquare,
  ClipboardPaste,
  FileSpreadsheet,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Square,
  Trash2,
  X
} from 'lucide-react';

export type RaporPaperSize = 'A4' | 'F4';
export type RaporOrientation = 'portrait' | 'landscape';
export type RaporDocMode = 'paket_lengkap' | 'cover' | 'identitas' | 'nilai' | 'mutasi';

export interface BukuIndukRaporViewProps {
  profile: SchoolProfile;
  currentUser: User;
  siswaList: Siswa[];
  guruList?: Guru[];
  fallbackTtdKsUrl?: string;
  fallbackStempelUrl?: string;
}

interface SemesterOption {
  num: 1 | 2 | 3 | 4 | 5 | 6;
  sKey: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';
  legacyKey: 'Smt 1' | 'Smt 2' | 'Smt 3' | 'Smt 4' | 'Smt 5' | 'Smt 6';
  tingkat: 'X' | 'XI' | 'XII';
  fase: 'Fase E' | 'Fase F';
  label: string;
  shortLabel: string;
  periodeLabel: 'Ganjil' | 'Genap';
}

const SEMESTER_OPTIONS: SemesterOption[] = [
  { num: 1, sKey: 'S1', legacyKey: 'Smt 1', tingkat: 'X', fase: 'Fase E', label: 'Semester 1 (Kelas X · Ganjil)', shortLabel: 'Smt 1 · X Ganjil', periodeLabel: 'Ganjil' },
  { num: 2, sKey: 'S2', legacyKey: 'Smt 2', tingkat: 'X', fase: 'Fase E', label: 'Semester 2 (Kelas X · Genap)', shortLabel: 'Smt 2 · X Genap', periodeLabel: 'Genap' },
  { num: 3, sKey: 'S3', legacyKey: 'Smt 3', tingkat: 'XI', fase: 'Fase F', label: 'Semester 3 (Kelas XI · Ganjil)', shortLabel: 'Smt 3 · XI Ganjil', periodeLabel: 'Ganjil' },
  { num: 4, sKey: 'S4', legacyKey: 'Smt 4', tingkat: 'XI', fase: 'Fase F', label: 'Semester 4 (Kelas XI · Genap)', shortLabel: 'Smt 4 · XI Genap', periodeLabel: 'Genap' },
  { num: 5, sKey: 'S5', legacyKey: 'Smt 5', tingkat: 'XII', fase: 'Fase F', label: 'Semester 5 (Kelas XII · Ganjil)', shortLabel: 'Smt 5 · XII Ganjil', periodeLabel: 'Ganjil' },
  { num: 6, sKey: 'S6', legacyKey: 'Smt 6', tingkat: 'XII', fase: 'Fase F', label: 'Semester 6 (Kelas XII · Genap)', shortLabel: 'Smt 6 · XII Genap', periodeLabel: 'Genap' }
];

const computePredikatFromScore = (rawVal?: string, rawKkm?: string): string => {
  const n = parseFloat((rawVal || '').replace(',', '.'));
  if (Number.isNaN(n) || !Number.isFinite(n)) return '';
  const kkm = parseFloat((rawKkm || '75').replace(',', '.'));
  const threshold = Number.isNaN(kkm) ? 75 : kkm;
  if (n >= 92) return 'A';
  if (n >= 83) return 'B';
  if (n >= threshold) return 'C';
  return 'D';
};

const parseNumericScore = (raw?: string): number | null => {
  const n = parseFloat((raw || '').replace(',', '.'));
  return !Number.isNaN(n) && Number.isFinite(n) ? n : null;
};

export const BukuIndukRaporView: React.FC<BukuIndukRaporViewProps> = ({
  profile,
  currentUser,
  siswaList,
  guruList = [],
  fallbackTtdKsUrl,
  fallbackStempelUrl
}) => {
  const [activeConfig] = useState<BukuIndukActiveConfig>(() => getStoredBukuIndukConfig());
  const [kurikulumRepo] = useState<BukuIndukKurikulumRepoItem[]>(() =>
    getStoredBukuIndukKurikulumRepo()
  );
  const [siswaMetaMap, setSiswaMetaMap] = useState<Record<string, BukuIndukSiswaMeta>>(() =>
    getStoredBukuIndukSiswaMeta()
  );

  // Filter & Selection States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('all');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(() => siswaList[0]?.id || '');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [activeSemesterNum, setActiveSemesterNum] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [mapelScopeMode, setMapelScopeMode] = useState<'sesuai_siswa' | 'semua'>('sesuai_siswa');

  // Print Orientation, Document Mode, Watermark & Paper Settings
  const [activeDocMode, setActiveDocMode] = useState<RaporDocMode>('paket_lengkap');
  const [mutasiMode, setMutasiMode] = useState<'keluar' | 'masuk' | 'keduanya'>('keduanya');
  const [paperSize, setPaperSize] = useState<RaporPaperSize>('A4');
  const [orientation, setOrientation] = useState<RaporOrientation>('portrait');
  const [printScalePct, setPrintScalePct] = useState<number>(100);
  const [previewZoomPct, setPreviewZoomPct] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 48 : 85
  );
  const [typography, setTypography] = useState<PrintTypographySettings>(() =>
    getStoredPrintTypography('sman9_rapor_induk_typo_v1', {
      fontFamily: 'inter',
      lineSpacing: 'nyaman',
      fontScalePct: 100
    })
  );
  const [printScope, setPrintScope] = useState<'individu' | 'terpilih' | 'tersaring'>('individu');

  useEffect(() => {
    saveStoredPrintTypography('sman9_rapor_induk_typo_v1', typography);
  }, [typography]);

  // Watermark ("Halaman Air" Bergelombang SMAN 9 Surabaya) & Print visibility options
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [watermarkOpacityPct, setWatermarkOpacityPct] = useState<number>(12);
  const [waveRowGapPx, setWaveRowGapPx] = useState<number>(52);
  const [waveWordGapPx, setWaveWordGapPx] = useState<number>(20);
  const [watermarkSource, setWatermarkSource] = useState<'sman9' | 'profil'>('sman9');
  const [showKopSurat, setShowKopSurat] = useState<boolean>(true);
  const [showKkmColumn, setShowKkmColumn] = useState<boolean>(true);
  const [showCapaianColumn, setShowCapaianColumn] = useState<boolean>(true);
  const [showNonAkademik, setShowNonAkademik] = useState<boolean>(true);
  const [showTtdOrtu, setShowTtdOrtu] = useState<boolean>(true);

  // Utility modal/inline drawer states
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteScoreText, setPasteScoreText] = useState<string>('');
  const [newExtraMapelName, setNewExtraMapelName] = useState<string>('');
  const [newExtraMapelKelompok, setNewExtraMapelKelompok] = useState<string>('Mapel Tambahan / Lintas Minat');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeSemester = useMemo(
    () => SEMESTER_OPTIONS.find(s => s.num === activeSemesterNum) || SEMESTER_OPTIONS[0],
    [activeSemesterNum]
  );

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    window.setTimeout(() => setStatusMsg(null), 4500);
  };

  // Exact paper dimensions (mm) for screen preview & @page CSS
  const baseWidthMm = paperSize === 'F4' ? 215 : 210;
  const baseHeightMm = paperSize === 'F4' ? 330 : 297;
  const pageWidthMm = orientation === 'landscape' ? baseHeightMm : baseWidthMm;
  const pageHeightMm = orientation === 'landscape' ? baseWidthMm : baseHeightMm;
  const pageMarginMm = orientation === 'landscape' ? 8 : paperSize === 'F4' ? 10 : 9;

  // Classes & Filtered Student List
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
      return matchSearch && matchKelas;
    });
  }, [siswaList, searchQuery, filterKelas, siswaMetaMap]);

  const activeSiswa = useMemo(
    () =>
      siswaList.find(s => s.id === selectedSiswaId) ||
      filteredSiswa[0] ||
      siswaList[0] ||
      null,
    [siswaList, selectedSiswaId, filteredSiswa]
  );

  // Resolve curriculum + subjects for any student and semester
  const resolveCurriculumForStudent = (
    student: Siswa,
    sem: SemesterOption,
    scope: 'sesuai_siswa' | 'semua' = mapelScopeMode
  ) => {
    const meta = siswaMetaMap[student.id];
    const overrideRepo = meta?.kurikulumKhususId
      ? kurikulumRepo.find(r => r.id === meta.kurikulumKhususId)
      : undefined;

    const sourceName = overrideRepo ? overrideRepo.nama : activeConfig.namaKurikulumAktif;
    const sourceJenis = overrideRepo ? overrideRepo.jenisKurikulum : activeConfig.jenisKurikulum;
    const sourceTahun = overrideRepo ? overrideRepo.tahunPelajaran : activeConfig.tahunPelajaran;
    const rawMapel = overrideRepo ? overrideRepo.susunanPelajaran : activeConfig.susunanPelajaran;

    const resolvedFromCurriculum = resolveSusunanPelajaranUntukSiswa(rawMapel, student, {
      showAllIgnoringCondition: scope === 'semua',
      overrideTingkat: scope === 'sesuai_siswa' ? sem.tingkat : undefined
    });

    // Merge any custom subjects saved in student's transkripNilai that aren't in curriculum list
    const existingIds = new Set(resolvedFromCurriculum.map(m => m.id));
    const existingNameKeys = new Set(
      resolvedFromCurriculum.map(m => normalizeMapelMatchKey(m.namaMapel))
    );
    const extraRecords: KurikulumMapelItem[] = [];
    if (meta?.transkripNilai) {
      Object.values(meta.transkripNilai).forEach(rec => {
        if (!rec || !rec.namaMapel) return;
        const nKey = normalizeMapelMatchKey(rec.namaMapel);
        const hasValueInSem = Boolean(
          rec.semesters?.[sem.sKey]?.nilaiAkhir ||
            rec.semesters?.[sem.sKey]?.pengN ||
            rec.semesters?.[sem.sKey]?.ketN ||
            rec.semesters?.[sem.sKey]?.capaian
        );
        if (
          !existingIds.has(rec.mapelKey) &&
          !existingNameKeys.has(nKey) &&
          (hasValueInSem || rec.mapelKey.startsWith('extra-'))
        ) {
          extraRecords.push({
            id: rec.mapelKey,
            kelompok: rec.kelompok || 'Mapel Tambahan',
            namaMapel: rec.namaMapel,
            kkm: rec.kkm ? Number(rec.kkm) : 75,
            kondisiTingkat: 'Semua',
            kondisiRumpun: 'Semua',
            kondisiStatus: 'Pilihan'
          });
        }
      });
    }

    const combinedMapel = [...resolvedFromCurriculum, ...extraRecords];
    const isK13 = /2013|k-?13/i.test(sourceJenis);
    const isKtsp = /ktsp|2006/i.test(sourceJenis);

    return {
      isOverridden: Boolean(overrideRepo),
      sourceName,
      sourceJenis,
      sourceTahun,
      isK13,
      isKtsp,
      mapelList: combinedMapel
    };
  };

  // Read score for a mapel in a specific semester (merges transkripNilai & legacy nilaiPerMapel)
  const getMapelSemesterScore = (
    meta: BukuIndukSiswaMeta | undefined,
    mapel: KurikulumMapelItem,
    sem: SemesterOption
  ): BukuIndukSemesterScore => {
    const transkrip = meta?.transkripNilai || {};
    let rec: BukuIndukMapelRecord | undefined = transkrip[mapel.id];
    if (!rec) {
      const targetNorm = normalizeMapelMatchKey(mapel.namaMapel);
      rec = Object.values(transkrip).find(
        r => r && normalizeMapelMatchKey(r.namaMapel) === targetNorm
      );
    }
    const semData = rec?.semesters?.[sem.sKey] || {};
    const legacyVal = meta?.nilaiPerMapel?.[sem.legacyKey]?.[mapel.id] || '';
    const defaultKkm = semData.kkm || rec?.kkm || (mapel.kkm ? String(mapel.kkm) : '75');
    return {
      ...semData,
      kkm: defaultKkm,
      nilaiAkhir: semData.nilaiAkhir ?? semData.pengN ?? legacyVal,
      predikat:
        semData.predikat ??
        semData.pengP ??
        computePredikatFromScore(semData.nilaiAkhir ?? semData.pengN ?? legacyVal, defaultKkm),
      pengN: semData.pengN ?? semData.nilaiAkhir ?? legacyVal,
      pengP:
        semData.pengP ??
        semData.predikat ??
        computePredikatFromScore(semData.pengN ?? semData.nilaiAkhir ?? legacyVal, defaultKkm),
      ketN: semData.ketN ?? '',
      ketP: semData.ketP ?? computePredikatFromScore(semData.ketN, defaultKkm),
      capaian: semData.capaian ?? ''
    };
  };

  // Persist changes to student metadata
  const updateSiswaMeta = (siswaId: string, patch: Partial<BukuIndukSiswaMeta>) => {
    setSiswaMetaMap(prev => {
      const current = prev[siswaId] || { siswaId };
      const next: Record<string, BukuIndukSiswaMeta> = {
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

  const updateSemesterScoreField = (
    siswaId: string,
    mapel: KurikulumMapelItem,
    sem: SemesterOption,
    patch: Partial<BukuIndukSemesterScore>,
    isK13Mode: boolean
  ) => {
    setSiswaMetaMap(prev => {
      const current = prev[siswaId] || { siswaId };
      const transkrip = { ...(current.transkripNilai || {}) };
      const targetNorm = normalizeMapelMatchKey(mapel.namaMapel);
      const matchedKey =
        transkrip[mapel.id]
          ? mapel.id
          : Object.keys(transkrip).find(
              k => normalizeMapelMatchKey(transkrip[k]?.namaMapel || '') === targetNorm
            ) || mapel.id;

      const existingRec: BukuIndukMapelRecord = transkrip[matchedKey] || {
        mapelKey: mapel.id,
        namaMapel: mapel.namaMapel,
        kelompok: mapel.kelompok,
        kkm: mapel.kkm ? String(mapel.kkm) : '75',
        semesters: {}
      };

      const existingSem = existingRec.semesters?.[sem.sKey] || {};
      const mergedSem: BukuIndukSemesterScore = {
        ...existingSem,
        ...patch
      };

      // Auto-sync predikat when numeric score changes if predikat wasn't manually edited in this call
      const effKkm = mergedSem.kkm || existingRec.kkm || (mapel.kkm ? String(mapel.kkm) : '75');
      if (isK13Mode) {
        if (patch.pengN !== undefined && patch.pengP === undefined) {
          mergedSem.pengP = computePredikatFromScore(patch.pengN, effKkm);
          mergedSem.nilaiAkhir = patch.pengN;
          mergedSem.predikat = mergedSem.pengP;
        }
        if (patch.ketN !== undefined && patch.ketP === undefined) {
          mergedSem.ketP = computePredikatFromScore(patch.ketN, effKkm);
        }
      } else {
        if (patch.nilaiAkhir !== undefined && patch.predikat === undefined) {
          mergedSem.predikat = computePredikatFromScore(patch.nilaiAkhir, effKkm);
          mergedSem.pengN = patch.nilaiAkhir;
          mergedSem.pengP = mergedSem.predikat;
        }
      }

      const nextNilaiPerMapel = { ...(current.nilaiPerMapel || {}) };
      const syncNumeric = mergedSem.nilaiAkhir ?? mergedSem.pengN;
      if (syncNumeric !== undefined) {
        nextNilaiPerMapel[sem.legacyKey] = {
          ...(nextNilaiPerMapel[sem.legacyKey] || {}),
          [mapel.id]: syncNumeric
        };
      }

      transkrip[matchedKey] = {
        ...existingRec,
        ...(patch.kkm !== undefined ? { kkm: patch.kkm } : {}),
        semesters: {
          ...existingRec.semesters,
          [sem.sKey]: mergedSem
        }
      };

      const next: Record<string, BukuIndukSiswaMeta> = {
        ...prev,
        [siswaId]: {
          ...current,
          siswaId,
          nilaiPerMapel: nextNilaiPerMapel,
          transkripNilai: transkrip
        }
      };
      saveStoredBukuIndukSiswaMeta(next);
      return next;
    });
  };

  const updateTahunMeta = (
    siswaId: string,
    tingkat: 'X' | 'XI' | 'XII',
    patch: Partial<BukuIndukTahunMeta>
  ) => {
    setSiswaMetaMap(prev => {
      const current = prev[siswaId] || { siswaId };
      const existingTahun = current.tahunAjaranMeta || {};
      const next: Record<string, BukuIndukSiswaMeta> = {
        ...prev,
        [siswaId]: {
          ...current,
          siswaId,
          tahunAjaranMeta: {
            ...existingTahun,
            [tingkat]: {
              ...(existingTahun[tingkat] || {}),
              ...patch
            }
          }
        }
      };
      saveStoredBukuIndukSiswaMeta(next);
      return next;
    });
  };

  const updateCatatanSemester = (siswaId: string, sKey: string, catatan: string) => {
    setSiswaMetaMap(prev => {
      const current = prev[siswaId] || { siswaId };
      const next: Record<string, BukuIndukSiswaMeta> = {
        ...prev,
        [siswaId]: {
          ...current,
          siswaId,
          catatanWaliKelasPerSemester: {
            ...(current.catatanWaliKelasPerSemester || {}),
            [sKey]: catatan
          }
        }
      };
      saveStoredBukuIndukSiswaMeta(next);
      return next;
    });
  };

  // Active student curriculum & summary statistics
  const activeResolved = useMemo(() => {
    if (!activeSiswa) return null;
    return resolveCurriculumForStudent(activeSiswa, activeSemester, mapelScopeMode);
  }, [activeSiswa, activeSemester, mapelScopeMode, siswaMetaMap, activeConfig, kurikulumRepo]);

  const activeStats = useMemo(() => {
    if (!activeSiswa || !activeResolved) {
      return { totalMapel: 0, terisi: 0, jumlah: 0, rataRata: '-', tuntas: 0, belumTuntas: 0 };
    }
    const meta = siswaMetaMap[activeSiswa.id];
    let terisi = 0;
    let jumlah = 0;
    let tuntas = 0;
    let belumTuntas = 0;

    activeResolved.mapelList.forEach(m => {
      const sc = getMapelSemesterScore(meta, m, activeSemester);
      const valStr = activeResolved.isK13 ? sc.pengN : sc.nilaiAkhir;
      const num = parseNumericScore(valStr);
      const kkmNum = parseNumericScore(sc.kkm) ?? m.kkm ?? 75;
      if (num !== null) {
        terisi += 1;
        jumlah += num;
        if (num >= kkmNum) tuntas += 1;
        else belumTuntas += 1;
      }
    });

    return {
      totalMapel: activeResolved.mapelList.length,
      terisi,
      jumlah: Number.isInteger(jumlah) ? jumlah : Number(jumlah.toFixed(1)),
      rataRata: terisi > 0 ? (jumlah / terisi).toFixed(2) : '-',
      tuntas,
      belumTuntas
    };
  }, [activeSiswa, activeResolved, activeSemester, siswaMetaMap]);

  // Bulk helpers for active student & semester
  const handleFillDefaultKkm = () => {
    if (!activeSiswa || !activeResolved) return;
    activeResolved.mapelList.forEach(m => {
      const defaultKkm = String(m.kkm || 75);
      updateSemesterScoreField(
        activeSiswa.id,
        m,
        activeSemester,
        { kkm: defaultKkm },
        activeResolved.isK13
      );
    });
    notify('success', `KKM/KKTP standar kurikulum diterapkan ke ${activeResolved.mapelList.length} mapel (${activeSemester.shortLabel}).`);
  };

  const handleRecalcPredikat = () => {
    if (!activeSiswa || !activeResolved) return;
    const meta = siswaMetaMap[activeSiswa.id];
    let updatedCount = 0;
    activeResolved.mapelList.forEach(m => {
      const sc = getMapelSemesterScore(meta, m, activeSemester);
      if (activeResolved.isK13) {
        const pPeng = computePredikatFromScore(sc.pengN, sc.kkm);
        const pKet = computePredikatFromScore(sc.ketN, sc.kkm);
        if (pPeng || pKet) {
          updateSemesterScoreField(
            activeSiswa.id,
            m,
            activeSemester,
            { pengP: pPeng, ketP: pKet, predikat: pPeng },
            true
          );
          updatedCount += 1;
        }
      } else {
        const p = computePredikatFromScore(sc.nilaiAkhir, sc.kkm);
        if (p) {
          updateSemesterScoreField(
            activeSiswa.id,
            m,
            activeSemester,
            { predikat: p, pengP: p },
            false
          );
          updatedCount += 1;
        }
      }
    });
    notify('success', `Predikat otomatis dihitung ulang untuk ${updatedCount} mata pelajaran.`);
  };

  const handleAddExtraMapel = () => {
    if (!activeSiswa) return;
    const cleanName = newExtraMapelName.trim();
    if (!cleanName) {
      notify('error', 'Masukkan nama mata pelajaran tambahan terlebih dahulu.');
      return;
    }
    const newItem: KurikulumMapelItem = {
      id: `extra-${Date.now()}`,
      kelompok: newExtraMapelKelompok.trim() || 'Mapel Tambahan',
      namaMapel: cleanName,
      kkm: 75,
      kondisiTingkat: 'Semua',
      kondisiRumpun: 'Semua',
      kondisiStatus: 'Pilihan'
    };
    updateSemesterScoreField(
      activeSiswa.id,
      newItem,
      activeSemester,
      { kkm: '75', nilaiAkhir: '', pengN: '' },
      Boolean(activeResolved?.isK13)
    );
    setNewExtraMapelName('');
    notify('success', `Mata pelajaran "${cleanName}" ditambahkan pada ${activeSiswa.nama}.`);
  };

  const handleRemoveExtraMapel = (mapelId: string, namaMapel: string) => {
    if (!activeSiswa) return;
    setSiswaMetaMap(prev => {
      const current = prev[activeSiswa.id];
      if (!current?.transkripNilai) return prev;
      const nextTranskrip = { ...current.transkripNilai };
      delete nextTranskrip[mapelId];
      const next: Record<string, BukuIndukSiswaMeta> = {
        ...prev,
        [activeSiswa.id]: {
          ...current,
          transkripNilai: nextTranskrip
        }
      };
      saveStoredBukuIndukSiswaMeta(next);
      return next;
    });
    notify('success', `Mapel tambahan "${namaMapel}" dihapus dari transkrip siswa.`);
  };

  const handlePasteScoresFromExcel = () => {
    if (!activeSiswa || !activeResolved) return;
    const lines = pasteScoreText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      notify('error', 'Tempel minimal satu baris nilai (Format: Nama Mapel [TAB] Nilai).');
      return;
    }

    let matched = 0;
    lines.forEach(line => {
      const cols = line.includes('\t') ? line.split('\t') : line.split(/;|,/);
      if (cols.length < 2) return;
      const rawName = (cols[0] || '').replace(/^\d+\.\s*/, '').trim();
      const targetNorm = normalizeMapelMatchKey(rawName);
      if (!targetNorm) return;

      const foundMapel = activeResolved.mapelList.find(m => {
        const mn = normalizeMapelMatchKey(m.namaMapel);
        return mn === targetNorm || mn.includes(targetNorm) || targetNorm.includes(mn);
      });
      if (!foundMapel) return;

      const val1 = (cols[1] || '').trim();
      const val2 = (cols[2] || '').trim();
      const val3 = (cols[3] || '').trim();

      if (activeResolved.isK13) {
        updateSemesterScoreField(
          activeSiswa.id,
          foundMapel,
          activeSemester,
          {
            pengN: val1,
            pengP: computePredikatFromScore(val1, String(foundMapel.kkm || 75)),
            ...(val2 ? { ketN: val2, ketP: computePredikatFromScore(val2, String(foundMapel.kkm || 75)) } : {}),
            ...(val3 ? { capaian: val3 } : {})
          },
          true
        );
      } else {
        updateSemesterScoreField(
          activeSiswa.id,
          foundMapel,
          activeSemester,
          {
            nilaiAkhir: val1,
            predikat: computePredikatFromScore(val1, String(foundMapel.kkm || 75)),
            ...(val2 && isNaN(Number(val2.replace(',', '.'))) ? { capaian: val2 } : val3 ? { capaian: val3 } : {})
          },
          false
        );
      }
      matched += 1;
    });

    if (matched === 0) {
      notify('error', 'Tidak ada nama mata pelajaran yang cocok. Pastikan kolom pertama berisi Nama Mata Pelajaran.');
      return;
    }
    setShowPasteModal(false);
    setPasteScoreText('');
    notify('success', `Berhasil mengimpor ${matched} baris nilai ke ${activeSemester.shortLabel} (${activeSiswa.nama}).`);
  };

  const handleSaveAndAudit = () => {
    if (!activeSiswa) return;
    saveStoredBukuIndukSiswaMeta(siswaMetaMap);
    appendAuditLog(
      'SIMPAN_RAPOR_SEMESTER',
      `${currentUser.name} menyimpan detail nilai rapor ${activeSemester.label} untuk ${activeSiswa.nama} (${activeSiswa.rombelSaatIni || activeSiswa.kelas}).`
    );
    notify('success', `Detail nilai ${activeSemester.shortLabel} (${activeSiswa.nama}) tersimpan & sinkron ke Buku Induk.`);
  };

  const handleExportCsvSemester = () => {
    if (!activeSiswa || !activeResolved) return;
    const meta = siswaMetaMap[activeSiswa.id];
    const headers = activeResolved.isK13
      ? ['No', 'Kelompok', 'Mata Pelajaran', 'KKM', 'Nilai Peng', 'Predikat Peng', 'Nilai Ket', 'Predikat Ket', 'Capaian']
      : ['No', 'Kelompok', 'Mata Pelajaran', 'KKTP/KKM', 'Nilai Akhir', 'Predikat', 'Capaian'];

    const rows = activeResolved.mapelList.map((m, i) => {
      const sc = getMapelSemesterScore(meta, m, activeSemester);
      const escapeCsv = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
      if (activeResolved.isK13) {
        return [
          i + 1,
          escapeCsv(m.kelompok),
          escapeCsv(m.namaMapel),
          escapeCsv(sc.kkm || ''),
          escapeCsv(sc.pengN || ''),
          escapeCsv(sc.pengP || ''),
          escapeCsv(sc.ketN || ''),
          escapeCsv(sc.ketP || ''),
          escapeCsv(sc.capaian || '')
        ].join(',');
      }
      return [
        i + 1,
        escapeCsv(m.kelompok),
        escapeCsv(m.namaMapel),
        escapeCsv(sc.kkm || ''),
        escapeCsv(sc.nilaiAkhir || ''),
        escapeCsv(sc.predikat || ''),
        escapeCsv(sc.capaian || '')
      ].join(',');
    });

    const csv = `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = activeSiswa.nama.replace(/[^a-z0-9]+/gi, '_');
    link.download = `Rapor_${activeSemester.sKey}_${safeName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('success', `CSV ${activeSemester.shortLabel} (${activeSiswa.nama}) berhasil diunduh.`);
  };

  // List of students to print
  const studentsToPrint = useMemo(() => {
    if (printScope === 'tersaring') return filteredSiswa;
    if (printScope === 'terpilih') {
      const picked = filteredSiswa.filter(s => checkedIds.includes(s.id));
      return picked.length > 0 ? picked : activeSiswa ? [activeSiswa] : [];
    }
    return activeSiswa ? [activeSiswa] : [];
  }, [printScope, filteredSiswa, checkedIds, activeSiswa]);

  const handlePrintRapor = () => {
    if (studentsToPrint.length === 0) {
      notify('error', 'Pilih minimal satu siswa untuk dicetak.');
      return;
    }
    const modeLabel =
      activeDocMode === 'paket_lengkap'
        ? 'Paket Lengkap (Muka + Identitas + Nilai)'
        : activeDocMode === 'cover'
          ? 'Halaman Muka Rapor'
          : activeDocMode === 'identitas'
            ? 'Identitas Rapor'
            : activeDocMode === 'mutasi'
              ? `Surat Keterangan Pindah Sekolah (${mutasiMode === 'keluar' ? 'Keluar' : mutasiMode === 'masuk' ? 'Masuk' : 'Keluar & Masuk'})`
              : `Detail Nilai ${activeSemester.label}`;
    appendAuditLog(
      'CETAK_RAPOR_BUKU_INDUK',
      `Mencetak ${modeLabel} (${studentsToPrint.length} siswa · ${paperSize} ${orientation.toUpperCase()}).`
    );
    window.print();
  };

  // Group mapel helper preserving curriculum order
  const groupMapelList = (list: KurikulumMapelItem[]) => {
    const groups: Array<{ kelompok: string; items: KurikulumMapelItem[] }> = [];
    const idxMap = new Map<string, number>();
    list.forEach(item => {
      const grp = item.kelompok || 'Mata Pelajaran';
      if (!idxMap.has(grp)) {
        idxMap.set(grp, groups.length);
        groups.push({ kelompok: grp, items: [] });
      }
      groups[idxMap.get(grp)!].items.push(item);
    });
    return groups;
  };

  const spMeta = resolvePrintSpacingMeta(typography.lineSpacing);
  const textScale = (typography.fontScalePct || 100) / 100;
  const typoStyleVars = getPrintTypographyStyleVars(typography);
  const fs = (basePx: number) => `${(basePx * textScale).toFixed(1)}px`;
  const rowGapStyle = `${Math.round(8 * spMeta.scaleFactor)}px`;

  // Precision print layout metrics per paperSize, orientation & typography spacing
  const sheetLayoutSpec = useMemo(() => {
    const base =
      orientation === 'landscape' && paperSize === 'F4'
        ? {
            isLandscape: true,
            titleBase: 13,
            subBase: 9.5,
            infoBase: 9.5,
            tableBase: 9,
            sideBase: 9,
            sigHeight: 'h-14',
            qrSize: 44
          }
        : orientation === 'landscape' && paperSize === 'A4'
          ? {
              isLandscape: true,
              titleBase: 12,
              subBase: 9,
              infoBase: 8.8,
              tableBase: 8.3,
              sideBase: 8.4,
              sigHeight: 'h-12',
              qrSize: 40
            }
          : orientation === 'portrait' && paperSize === 'F4'
            ? {
                isLandscape: false,
                titleBase: 13.5,
                subBase: 10,
                infoBase: 10,
                tableBase: 9.8,
                sideBase: 9.6,
                sigHeight: 'h-18',
                qrSize: 50
              }
            : {
                isLandscape: false,
                titleBase: 12.5,
                subBase: 9.2,
                infoBase: 9.2,
                tableBase: 9.0,
                sideBase: 8.9,
                sigHeight: 'h-16',
                qrSize: 46
              };

    const padY = (
      (orientation === 'landscape' ? 2.2 : paperSize === 'F4' ? 3.8 : 2.8) *
      spMeta.scaleFactor *
      textScale
    ).toFixed(1);
    const padX = orientation === 'landscape' ? '5px' : '7px';

    return {
      isLandscape: base.isLandscape,
      titleText: '',
      titlePx: `${(base.titleBase * textScale).toFixed(1)}px`,
      subText: '',
      subPx: `${(base.subBase * textScale).toFixed(1)}px`,
      infoText: '',
      infoPx: `${(base.infoBase * textScale).toFixed(1)}px`,
      tableText: '',
      tablePx: `${(base.tableBase * textScale).toFixed(1)}px`,
      sideText: '',
      sidePx: `${(base.sideBase * textScale).toFixed(1)}px`,
      cellPad: 'px-1.5 py-1',
      cellPadStyle: { padding: `${padY}px ${padX}`, lineHeight: spMeta.lineHeight },
      sigHeight: base.sigHeight,
      qrSize: base.qrSize
    };
  }, [paperSize, orientation, spMeta, textScale]);

  const effectiveTtdUrl = fallbackTtdKsUrl || '';
  const effectiveStempelUrl = fallbackStempelUrl || '';

  // Render a single student's printable semester rapor sheet
  const renderPrintableRaporSheet = (student: Siswa, idx: number) => {
    const meta = siswaMetaMap[student.id];
    const resolved = resolveCurriculumForStudent(student, activeSemester, mapelScopeMode);
    const grouped = groupMapelList(resolved.mapelList);
    const tahunMeta = meta?.tahunAjaranMeta?.[activeSemester.tingkat] || {};
    const catatanSem = meta?.catatanWaliKelasPerSemester?.[activeSemester.sKey] || '';
    const ekskulList = (meta?.ekskulRecords || []).filter(ex => {
      const val =
        activeSemester.tingkat === 'X'
          ? ex.x
          : activeSemester.tingkat === 'XI'
            ? ex.xi
            : ex.xii;
      return Boolean((ex.nama || '').trim() || (val || '').trim());
    });

    const noInduk = cleanIndukDisplay(meta?.nomorBukuInduk || student.nipd || student.nis);
    const kelasRombel = student.rombelSaatIni || student.kelas || '-';
    const tahunPelajaran = tahunMeta.tahunPelajaran || resolved.sourceTahun || activeConfig.tahunPelajaran;
    const tglCetak = tahunMeta.tanggalTtd || activeConfig.kotaTanggalCetak || 'Surabaya, 20 Desember 2026';

    let runningNo = 0;
    const numericVals: number[] = [];
    resolved.mapelList.forEach(m => {
      const sc = getMapelSemesterScore(meta, m, activeSemester);
      const n = parseNumericScore(resolved.isK13 ? sc.pengN : sc.nilaiAkhir);
      if (n !== null) numericVals.push(n);
    });
    const totalNilai =
      numericVals.length > 0
        ? numericVals.reduce((acc, v) => acc + v, 0)
        : null;
    const rataNilai =
      totalNilai !== null && numericVals.length > 0
        ? (totalNilai / numericVals.length).toFixed(2)
        : '-';

    const academicTable = (
      <table
        className="pt-table w-full border-collapse border border-slate-800 bg-transparent"
        style={{ fontSize: sheetLayoutSpec.tablePx, lineHeight: spMeta.lineHeight }}
      >
        <thead>
          <tr className="bg-slate-100/55 font-bold text-slate-950">
            <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-7 text-center`} rowSpan={resolved.isK13 ? 2 : 1}>
              No
            </th>
            <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-left`} rowSpan={resolved.isK13 ? 2 : 1}>
              Mata Pelajaran
            </th>
            {showKkmColumn && (
              <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-10 text-center`} rowSpan={resolved.isK13 ? 2 : 1}>
                {resolved.isK13 || resolved.isKtsp ? 'KKM' : 'KKTP'}
              </th>
            )}
            {resolved.isK13 ? (
              <>
                <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center`} colSpan={2}>
                  Pengetahuan
                </th>
                <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center`} colSpan={2}>
                  Keterampilan
                </th>
              </>
            ) : (
              <>
                <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-14 text-center`}>
                  Nilai
                </th>
                <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-14 text-center`}>
                  Predikat
                </th>
              </>
            )}
            {showCapaianColumn && (
              <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-left`} rowSpan={resolved.isK13 ? 2 : 1}>
                Capaian Kompetensi / Catatan
              </th>
            )}
          </tr>
          {resolved.isK13 && (
            <tr className="bg-slate-100/55 font-bold text-slate-900">
              <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-10 text-center`}>Nilai</th>
              <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-9 text-center`}>Pred</th>
              <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-10 text-center`}>Nilai</th>
              <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-9 text-center`}>Pred</th>
            </tr>
          )}
        </thead>
        <tbody>
          {grouped.length === 0 ? (
            <tr>
              <td
                colSpan={
                  (resolved.isK13 ? 6 : 4) +
                  (showKkmColumn ? 1 : 0) +
                  (showCapaianColumn ? 1 : 0)
                }
                className="border border-slate-800 px-3 py-4 text-center text-slate-500"
              >
                Belum ada mata pelajaran untuk kurikulum/tingkat ini.
              </td>
            </tr>
          ) : (
            grouped.map(g => (
              <React.Fragment key={g.kelompok}>
                <tr className="bg-slate-100/45 font-bold text-slate-900">
                  <td
                    colSpan={
                      (resolved.isK13 ? 6 : 4) +
                      (showKkmColumn ? 1 : 0) +
                      (showCapaianColumn ? 1 : 0)
                    }
                    className={`border border-slate-800 ${sheetLayoutSpec.cellPad}`}
                  >
                    {g.kelompok}
                  </td>
                </tr>
                {g.items.map(m => {
                  runningNo += 1;
                  const sc = getMapelSemesterScore(meta, m, activeSemester);
                  return (
                    <tr key={m.id}>
                      <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-mono tabular-nums`}>
                        {runningNo}
                      </td>
                      <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} font-medium`}>
                        {m.namaMapel}
                      </td>
                      {showKkmColumn && (
                        <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-mono tabular-nums`}>
                          {sc.kkm || m.kkm || 75}
                        </td>
                      )}
                      {resolved.isK13 ? (
                        <>
                          <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-mono font-semibold tabular-nums`}>
                            {sc.pengN || '-'}
                          </td>
                          <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-semibold`}>
                            {sc.pengP || '-'}
                          </td>
                          <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-mono font-semibold tabular-nums`}>
                            {sc.ketN || '-'}
                          </td>
                          <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-semibold`}>
                            {sc.ketP || '-'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-mono font-semibold tabular-nums`}>
                            {sc.nilaiAkhir || '-'}
                          </td>
                          <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-semibold`}>
                            {sc.predikat || '-'}
                          </td>
                        </>
                      )}
                      {showCapaianColumn && (
                        <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-slate-700`}>
                          {sc.capaian || '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))
          )}
          <tr className="bg-slate-100/55 font-bold text-slate-950">
            <td
              colSpan={2 + (showKkmColumn ? 1 : 0)}
              className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-right uppercase`}
            >
              Jumlah / Rata-Rata Nilai Semester
            </td>
            <td
              colSpan={resolved.isK13 ? 4 : 2}
              className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-mono tabular-nums`}
            >
              {totalNilai !== null
                ? `${Number.isInteger(totalNilai) ? totalNilai : totalNilai.toFixed(1)} · Rata-rata: ${rataNilai}`
                : '-'}
            </td>
            {showCapaianColumn && (
              <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} font-mono text-slate-700 tabular-nums`}>
                {numericVals.length}/{resolved.mapelList.length} mapel terisi
              </td>
            )}
          </tr>
        </tbody>
      </table>
    );

    const nonAkademikSection = showNonAkademik && (
      <div
        className="space-y-2"
        style={{ fontSize: sheetLayoutSpec.sidePx, lineHeight: spMeta.lineHeight }}
      >
        {/* Sikap & Ketidakhadiran */}
        <div className={`grid ${sheetLayoutSpec.isLandscape ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-2.5'}`}>
          <table className="pt-table w-full border-collapse border border-slate-800 bg-transparent">
            <thead>
              <tr className="bg-slate-100/55 font-bold">
                <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-left`} colSpan={2}>
                  Sikap & Ketidakhadiran
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-32 font-semibold`}>Sikap Spiritual</td>
                <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad}`}>{tahunMeta.sikapSpiritual || 'Baik'}</td>
              </tr>
              <tr>
                <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} font-semibold`}>Sikap Sosial</td>
                <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad}`}>{tahunMeta.sikapSosial || 'Baik'}</td>
              </tr>
              <tr>
                <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} font-semibold`}>Sakit / Ijin / Alpha</td>
                <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} font-mono tabular-nums`}>
                  {tahunMeta.sakit || '0'} hr · {tahunMeta.ijin || '0'} hr · {tahunMeta.alpha || '0'} hr
                </td>
              </tr>
            </tbody>
          </table>

          <table className="pt-table w-full border-collapse border border-slate-800 bg-transparent">
            <thead>
              <tr className="bg-slate-100/55 font-bold">
                <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-left`}>Kegiatan Ekstrakurikuler</th>
                <th className={`border border-slate-800 ${sheetLayoutSpec.cellPad} w-24 text-center`}>Predikat</th>
              </tr>
            </thead>
            <tbody>
              {ekskulList.length === 0 ? (
                <tr>
                  <td colSpan={2} className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-slate-500 text-center`}>
                    Belum ada data ekstrakurikuler
                  </td>
                </tr>
              ) : (
                ekskulList.slice(0, 4).map((ex, i) => {
                  const pred =
                    activeSemester.tingkat === 'X'
                      ? ex.x
                      : activeSemester.tingkat === 'XI'
                        ? ex.xi
                        : ex.xii;
                  return (
                    <tr key={`${ex.nama}-${i}`}>
                      <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad}`}>{ex.nama}</td>
                      <td className={`border border-slate-800 ${sheetLayoutSpec.cellPad} text-center font-semibold`}>
                        {pred || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Catatan Wali Kelas & Keputusan Semester */}
        <div className="border border-slate-800 bg-transparent">
          <div className={`bg-slate-100/55 font-bold border-b border-slate-800 ${sheetLayoutSpec.cellPad}`}>
            Catatan Wali Kelas & Status Akhir Semester
          </div>
          <div className={`${sheetLayoutSpec.cellPad} space-y-1`}>
            <p className="text-slate-800">
              {catatanSem || 'Tingkatkan terus kedisiplinan, motivasi belajar, serta partisipasi aktif di kelas.'}
            </p>
            {(activeSemester.periodeLabel === 'Genap' || tahunMeta.statusAkhir || tahunMeta.naikKeKelas) && (
              <div className="pt-1 border-t border-slate-300 font-semibold text-slate-950">
                Keputusan:{' '}
                {tahunMeta.statusAkhir === 'Lulus'
                  ? 'LULUS'
                  : tahunMeta.statusAkhir === 'Tidak Lulus'
                    ? 'TIDAK LULUS'
                    : tahunMeta.statusAkhir === 'Tinggal'
                      ? `Tinggal di Kelas ${kelasRombel}`
                      : `Naik ke Kelas ${tahunMeta.naikKeKelas || (activeSemester.tingkat === 'X' ? 'XI' : activeSemester.tingkat === 'XI' ? 'XII' : 'Lulus')}`}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    const signatureBlock = (
      <div
        className={`mt-2.5 pt-2 border-t border-slate-300 grid ${
          showTtdOrtu ? 'grid-cols-3' : 'grid-cols-2'
        } gap-4 items-end`}
        style={{ fontSize: sheetLayoutSpec.sidePx, lineHeight: spMeta.lineHeight }}
      >
        {showTtdOrtu && (
          <div className="text-left">
            <div className="text-slate-600">Mengetahui,</div>
            <div className="font-semibold">Orang Tua / Wali Peserta Didik</div>
            <div className={sheetLayoutSpec.sigHeight} />
            <div className="font-bold">
              {student.namaAyah || student.namaIbu || student.namaWali || student.namaOrtu ? (
                <span className="underline">
                  {student.namaAyah || student.namaIbu || student.namaWali || student.namaOrtu}
                </span>
              ) : (
                <span className="inline-block w-36 border-b border-dotted border-slate-600 h-3" />
              )}
            </div>
          </div>
        )}

        <div className="text-left">
          <div className="text-slate-600">&nbsp;</div>
          <div className="font-semibold">
            {tahunMeta.waliKelasLabel || `Wali Kelas ${kelasRombel}`}
          </div>
          <div className={sheetLayoutSpec.sigHeight} />
          <div className="font-bold">
            {tahunMeta.waliKelasNama ? (
              <span className="underline">{tahunMeta.waliKelasNama}</span>
            ) : (
              <span className="inline-block w-36 border-b border-dotted border-slate-600 h-3" />
            )}
          </div>
          <div className="font-mono text-[0.9em]">
            NIP. {tahunMeta.waliKelasNip || '-'}
          </div>
        </div>

        <div className="text-left relative">
          <div>{tglCetak}</div>
          <div className="font-semibold">Kepala {profile.namaSekolah},</div>
          <div className={`relative ${sheetLayoutSpec.sigHeight} my-0.5 flex items-center`}>
            <div
              className={`absolute pointer-events-none opacity-85 z-20 ${
                orientation === 'landscape' ? '-left-6 -top-1.5 w-16 h-16' : '-left-7 -top-2 w-20 h-20'
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
                  orientation === 'landscape' ? 'h-13 max-w-[145px]' : 'h-16 max-w-[175px]'
                } object-contain object-left relative z-10`}
              />
            ) : (
              <KepalaSekolahSignatureSvg
                className={`${orientation === 'landscape' ? 'h-13 w-28' : 'h-16 w-36'} relative z-10`}
              />
            )}
          </div>
          <div className="font-bold underline relative z-10">{profile.kepalaSekolah}</div>
          <div className="font-mono text-[0.9em]">NIP. {profile.nipKepalaSekolah}</div>
        </div>
      </div>
    );

    const renderWatermarkLayer = () => {
      if (!showWatermark) return null;
      const isProfileMode = watermarkSource === 'profil';
      const isProfileCustom = isProfileMode && profile.logoType === 'custom' && Boolean(profile.logoUrl);
      const isProfilePemprov =
        isProfileMode && (!profile.logoType || profile.logoType === 'pemprov' || profile.logoType === 'preset_jatim');
      const useProfileCustomLogo = isProfileCustom || isProfilePemprov;
      const resolvedWatermarkCustomUrl = isProfileCustom
        ? profile.logoUrl
        : isProfilePemprov
          ? profile.pemprovLogoUrl || PEMPROV_JATIM_OFFICIAL_LOGO_URL
          : undefined;
      return (
        <Sman9WavyWatermarkBg
          orientation={orientation}
          paperSize={paperSize}
          opacityPct={watermarkOpacityPct}
          waveRowGapPx={waveRowGapPx}
          waveWordGapPx={waveWordGapPx}
          customLogoUrl={resolvedWatermarkCustomUrl}
          sekolahLogoUrl={profile.sekolahLogoUrl}
          useCustomLogo={useProfileCustomLogo}
        />
      );
    };

    const cleanWebsite = (profile.website || 'sman9sby.sch.id')
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
    const photoSrc = resolveDirectImageUrl(student.fotoUrl);
    const scaleWrapperStyle =
      printScalePct !== 100
        ? {
            transform: `scale(${printScalePct / 100})`,
            transformOrigin: 'top left' as const,
            width: `${(100 / printScalePct) * 100}%`
          }
        : undefined;

    // 1. HALAMAN MUKA RAPOR (SAMPUL)
    const renderCoverPage = () => (
      <div
        key={`${student.id}-cover-${idx}`}
        style={typoStyleVars}
        className="rapor-induk-sheet rapor-sheet-scope relative overflow-hidden bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col"
      >
        {renderWatermarkLayer()}
        <div
          style={scaleWrapperStyle}
          className="relative z-10 flex-1 flex flex-col justify-between border-[3px] border-double border-slate-900 p-6 sm:p-8"
        >
          {/* Atas: Logo SMAN 9 Surabaya & Judul Rapor */}
          <div className="text-center space-y-2.5">
            <div className="flex justify-center">
              {watermarkSource === 'profil' && profile.logoType === 'custom' && profile.logoUrl ? (
                <img
                  src={resolveDirectImageUrl(profile.logoUrl)}
                  alt={profile.namaSekolah}
                  className={orientation === 'landscape' ? 'w-24 h-28 object-contain' : 'w-36 h-40 object-contain'}
                />
              ) : watermarkSource === 'profil' &&
                (!profile.logoType || profile.logoType === 'pemprov' || profile.logoType === 'preset_jatim') ? (
                <PemprovJatimLogo
                  customUrl={profile.pemprovLogoUrl}
                  className={orientation === 'landscape' ? 'w-24 h-28' : 'w-36 h-40'}
                />
              ) : (
                <Sman9SurabayaLogoSvg
                  customUrl={profile.sekolahLogoUrl}
                  className={orientation === 'landscape' ? 'w-24 h-28' : 'w-36 h-40'}
                />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-700">
                PEMERINTAH PROVINSI JAWA TIMUR · DINAS PENDIDIKAN
              </div>
              <h2
                className={`${
                  orientation === 'landscape' ? 'text-[18px]' : 'text-[22px]'
                } font-black uppercase tracking-wide text-slate-950 leading-tight`}
              >
                LAPORAN HASIL BELAJAR
              </h2>
              <div
                className={`${
                  orientation === 'landscape' ? 'text-[13px]' : 'text-[15px]'
                } font-extrabold uppercase tracking-wider text-slate-900`}
              >
                RAPOR PESERTA DIDIK SEKOLAH MENENGAH ATAS (SMA)
              </div>
              <div className="text-[11px] font-semibold text-slate-700">
                {resolved.sourceJenis} · {resolved.sourceName}
              </div>
            </div>
          </div>

          {/* Tengah: Kotak Identitas Pemilik Rapor */}
          <div
            className={`mx-auto w-full ${
              orientation === 'landscape' ? 'max-w-[520px] my-2' : 'max-w-[440px] my-6'
            } space-y-3 text-center`}
          >
            <div className="border-2 border-slate-900 bg-white/60 px-5 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 mb-1">
                NAMA PESERTA DIDIK
              </div>
              <div
                className={`${
                  orientation === 'landscape' ? 'text-[16px]' : 'text-[18px]'
                } font-black uppercase tracking-wide text-slate-950`}
              >
                {student.nama}
              </div>
            </div>

            <div className="border-2 border-slate-900 bg-white/60 px-5 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 mb-0.5">
                NIS / NISN
              </div>
              <div className="font-mono text-[14px] font-bold text-slate-950 tabular-nums tracking-wider">
                {noInduk} / {cleanIndukDisplay(student.nisn)}
              </div>
            </div>

            <div className="text-[11px] font-semibold text-slate-700 tabular-nums">
              Kelas: <strong className="text-slate-950">{kelasRombel}</strong> · Tahun Pelajaran:{' '}
              <strong className="font-mono text-slate-950">{tahunPelajaran}</strong>
            </div>
          </div>

          {/* Bawah: Identitas Instansi Sekolah & QR */}
          <div className="flex items-end justify-between gap-4 border-t border-slate-300 pt-3">
            <div className="flex-1 text-center space-y-0.5">
              <div className="text-[13px] font-black uppercase tracking-wide text-slate-950">
                {profile.namaSekolah}
              </div>
              <div className="text-[10px] font-semibold text-slate-700">
                NPSN: {profile.npsn} · Akreditasi {profile.akreditasi}
              </div>
              <div className="text-[10px] text-slate-700">
                {profile.alamat}, {profile.kota}, {profile.provinsi} {profile.kodePos}
              </div>
              <div className="text-[9.5px] text-slate-600 font-mono">
                {cleanWebsite} · {profile.email}
              </div>
            </div>
            <div className="shrink-0">
              <ExamCardBarcode
                value={`RAPOR_MUKA|${noInduk}|${student.nisn}|${student.nama}`}
                mode="qr_link"
                size={orientation === 'landscape' ? 42 : 48}
              />
            </div>
          </div>
        </div>
      </div>
    );

    // 2. IDENTITAS RAPOR (SEKOLAH & KETERANGAN PESERTA DIDIK 1-16)
    const renderIdentitasPage = () => {
      const ttlStr =
        cleanIndukDisplay(student.tempatTanggalLahir) !== '-'
          ? cleanIndukDisplay(student.tempatTanggalLahir)
          : student.tempatLahir || student.tanggalLahir
            ? `${student.tempatLahir || '-'}, ${student.tanggalLahir || '-'}`
            : '-';
      const alamatSiswaStr =
        [student.alamat, student.rt || student.rw ? `RT ${student.rt || '-'} / RW ${student.rw || '-'}` : '', student.kelurahan, student.kecamatan]
          .filter(Boolean)
          .join(', ') || '-';
      const statusKeluargaStr = cleanIndukDisplay(meta?.statusYatimPiatu) !== '-'
        ? cleanIndukDisplay(meta?.statusYatimPiatu)
        : 'Anak Kandung';

      const idBasePx =
        orientation === 'landscape'
          ? paperSize === 'F4'
            ? 9.2
            : 8.5
          : paperSize === 'F4'
            ? 10.2
            : 9.5;
      const idFontStyle: React.CSSProperties = {
        fontSize: fs(idBasePx),
        lineHeight: spMeta.lineHeight
      };
      const rowPadPx = `${(
        (orientation === 'landscape' ? 1.8 : paperSize === 'F4' ? 3.5 : 2.5) *
        spMeta.scaleFactor
      ).toFixed(1)}px`;
      const rowPad = 'align-top';

      const identitasSekolahBlock = (
        <div className="space-y-1">
          <div className="font-bold uppercase bg-slate-100/60 border border-slate-800 px-2 py-0.5 text-slate-950">
            I. Identitas Satuan Pendidikan
          </div>
          <table className="pt-table w-full border-collapse" style={{ ['--pt-cell-py' as string]: rowPadPx }}>
            <tbody>
              <tr>
                <td className={`${rowPad} w-36 font-semibold align-top`}>Nama Sekolah</td>
                <td className={`${rowPad} w-2.5 align-top`}>:</td>
                <td className={`${rowPad} font-bold uppercase`}>{profile.namaSekolah}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-semibold`}>NPSN / Akreditasi</td>
                <td>:</td>
                <td className="font-mono tabular-nums">
                  {profile.npsn} / Peringkat {profile.akreditasi}
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-semibold align-top`}>Alamat Sekolah</td>
                <td className="align-top">:</td>
                <td>{profile.alamat}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-semibold`}>Kode Pos / Telepon</td>
                <td>:</td>
                <td className="font-mono tabular-nums">
                  {profile.kodePos} · Telp. {profile.telepon}
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-semibold`}>Kecamatan / Kota</td>
                <td>:</td>
                <td>
                  {profile.kecamatan}, {profile.kota}, {profile.provinsi}
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-semibold`}>Laman / Pos-el</td>
                <td>:</td>
                <td className="font-mono">
                  {cleanWebsite} · {profile.email}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );

      const identitasSiswaBlock = (
        <div className="space-y-1">
          <div className="font-bold uppercase bg-slate-100/60 border border-slate-800 px-2 py-0.5 text-slate-950">
            II. Keterangan Tentang Diri Peserta Didik
          </div>
          <table className="pt-table w-full border-collapse" style={{ ['--pt-cell-py' as string]: rowPadPx }}>
            <tbody>
              <tr>
                <td className={`${rowPad} w-6 font-mono`}>1.</td>
                <td className={`${rowPad} w-44 font-semibold`}>Nama Peserta Didik (Lengkap)</td>
                <td className={`${rowPad} w-2.5`}>:</td>
                <td className={`${rowPad} font-bold uppercase`}>{student.nama}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>2.</td>
                <td className={`${rowPad} font-semibold`}>Nomor Induk / NISN</td>
                <td>:</td>
                <td className="font-mono font-semibold tabular-nums">
                  {noInduk} / {cleanIndukDisplay(student.nisn)}
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>3.</td>
                <td className={`${rowPad} font-semibold`}>Tempat, Tanggal Lahir</td>
                <td>:</td>
                <td>{ttlStr}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>4.</td>
                <td className={`${rowPad} font-semibold`}>Jenis Kelamin</td>
                <td>:</td>
                <td>{student.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>5.</td>
                <td className={`${rowPad} font-semibold`}>Agama</td>
                <td>:</td>
                <td>{student.agama || 'Islam'}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>6.</td>
                <td className={`${rowPad} font-semibold`}>Status dalam Keluarga</td>
                <td>:</td>
                <td>{statusKeluargaStr}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>7.</td>
                <td className={`${rowPad} font-semibold`}>Anak ke</td>
                <td>:</td>
                <td className="tabular-nums">{cleanIndukDisplay(student.anakKe)}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono align-top`}>8.</td>
                <td className={`${rowPad} font-semibold align-top`}>Alamat Peserta Didik & Telp</td>
                <td className="align-top">:</td>
                <td>
                  {alamatSiswaStr}
                  {(student.hp || student.telepon) ? ` · Telp/HP: ${student.hp || student.telepon}` : ''}
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>9.</td>
                <td className={`${rowPad} font-semibold`}>Sekolah Asal (SMP/MTs)</td>
                <td>:</td>
                <td>{cleanIndukDisplay(meta?.tamatanDari || student.sekolahAsal)}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono align-top`}>10.</td>
                <td className={`${rowPad} font-semibold align-top`}>Diterima di sekolah ini</td>
                <td className="align-top">:</td>
                <td>
                  Di kelas: <strong>{cleanIndukDisplay(meta?.diterimaDiKelas || 'X')}</strong> · Pada tanggal:{' '}
                  <span>{cleanIndukDisplay(meta?.tanggalDiterima || '14 Juli 2026')}</span>
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono align-top`}>11.</td>
                <td className={`${rowPad} font-semibold align-top`}>Nama Orang Tua</td>
                <td className="align-top">:</td>
                <td>
                  <div>a. Ayah: <strong>{cleanIndukDisplay(student.namaAyah || student.namaOrtu)}</strong></div>
                  <div>b. Ibu: <strong>{cleanIndukDisplay(student.namaIbu)}</strong></div>
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono align-top`}>12.</td>
                <td className={`${rowPad} font-semibold align-top`}>Alamat Orang Tua & Telp/HP</td>
                <td className="align-top">:</td>
                <td>
                  {cleanIndukDisplay(meta?.ayahAlamatTelp || meta?.ibuAlamatTelp || student.alamat)}
                  {(student.hp || student.telepon) ? ` · HP: ${student.hp || student.telepon}` : ''}
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono align-top`}>13.</td>
                <td className={`${rowPad} font-semibold align-top`}>Pekerjaan Orang Tua</td>
                <td className="align-top">:</td>
                <td>
                  <div>a. Ayah: {cleanIndukDisplay(student.pekerjaanAyah)}</div>
                  <div>b. Ibu: {cleanIndukDisplay(student.pekerjaanIbu)}</div>
                </td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>14.</td>
                <td className={`${rowPad} font-semibold`}>Nama Wali Peserta Didik</td>
                <td>:</td>
                <td>{cleanIndukDisplay(student.namaWali)}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>15.</td>
                <td className={`${rowPad} font-semibold`}>Alamat Wali & Telp/HP</td>
                <td>:</td>
                <td>{cleanIndukDisplay(meta?.waliAlamatTelp)}</td>
              </tr>
              <tr>
                <td className={`${rowPad} font-mono`}>16.</td>
                <td className={`${rowPad} font-semibold`}>Pekerjaan Wali Peserta Didik</td>
                <td>:</td>
                <td>{cleanIndukDisplay(student.pekerjaanWali)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );

      const identitasFooterBlock = (
        <div className="flex items-end justify-between gap-3 pt-2 border-t border-slate-300">
          <div className="shrink-0">
            <ExamCardBarcode
              value={`RAPOR_IDENTITAS|${noInduk}|${student.nisn}|${student.nama}`}
              mode="qr_link"
              size={orientation === 'landscape' ? 38 : 48}
            />
          </div>

          <div className="flex items-end gap-2.5 ml-auto">
            <div
              className={`${
                orientation === 'landscape' ? 'w-[22mm] h-[29mm]' : 'w-[28mm] h-[37mm]'
              } border border-slate-800 bg-white/80 flex items-center justify-center overflow-hidden text-[8px] text-slate-500 text-center shrink-0 relative z-10`}
            >
              {photoSrc ? (
                <img src={photoSrc} alt={student.nama} className="w-full h-full object-cover" />
              ) : (
                <span>
                  PAS FOTO
                  <br />3 × 4 cm
                </span>
              )}
            </div>

            <div
              className={`${
                orientation === 'landscape' ? 'min-w-[165px]' : 'min-w-[205px]'
              } text-left relative`}
            >
              <div>{cleanIndukDisplay(meta?.tanggalDiterima) !== '-' ? `${profile.kota}, ${meta?.tanggalDiterima}` : tglCetak}</div>
              <div className="font-semibold">Kepala {profile.namaSekolah},</div>
              <div className={`relative ${sheetLayoutSpec.sigHeight} my-0.5 flex items-center`}>
                <div
                  className={`absolute pointer-events-none opacity-85 z-20 ${
                    orientation === 'landscape' ? '-left-8 -top-1 w-16 h-16' : '-left-10 -top-1 w-20 h-20'
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
                      orientation === 'landscape' ? 'h-13 max-w-[145px]' : 'h-16 max-w-[175px]'
                    } object-contain object-left relative z-10`}
                  />
                ) : (
                  <KepalaSekolahSignatureSvg
                    className={`${orientation === 'landscape' ? 'h-13 w-28' : 'h-16 w-36'} relative z-10`}
                  />
                )}
              </div>
              <div className="font-bold underline relative z-10">{profile.kepalaSekolah}</div>
              <div className="font-mono text-[0.9em]">NIP. {profile.nipKepalaSekolah}</div>
            </div>
          </div>
        </div>
      );

      return (
        <div
          key={`${student.id}-identitas-rapor-${idx}`}
          style={typoStyleVars}
          className="rapor-induk-sheet rapor-sheet-scope relative overflow-hidden bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col"
        >
          {renderWatermarkLayer()}
          <div
            style={scaleWrapperStyle}
            className="relative z-10 flex-1 flex flex-col justify-between"
          >
            <div>
              {showKopSurat && <OfficialKopSurat profile={profile} compact />}

              <div className="border-b-2 border-slate-900 pb-1 mb-2.5 flex items-baseline justify-between gap-2">
                <h3
                  className="font-black uppercase tracking-wide"
                  style={{ fontSize: sheetLayoutSpec.titlePx }}
                >
                  IDENTITAS RAPOR PESERTA DIDIK
                </h3>
                <span className="font-mono text-[9.5px] font-bold text-slate-700 tabular-nums">
                  {paperSize === 'F4' ? 'Folio' : 'A4'} · {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                </span>
              </div>

              {orientation === 'landscape' ? (
                <div className="grid grid-cols-12 gap-4 items-start" style={idFontStyle}>
                  <div className="col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: rowGapStyle }}>
                    {identitasSekolahBlock}
                  </div>
                  <div className="col-span-7">{identitasSiswaBlock}</div>
                </div>
              ) : (
                <div style={{ ...idFontStyle, display: 'flex', flexDirection: 'column', gap: rowGapStyle }}>
                  {identitasSekolahBlock}
                  {identitasSiswaBlock}
                </div>
              )}
            </div>

            <div className="mt-3" style={idFontStyle}>
              {identitasFooterBlock}
            </div>
          </div>
        </div>
      );
    };

    // 3. DETAIL NILAI RAPOR SEMESTER
    const renderNilaiSemesterPage = () => (
      <div
        key={`${student.id}-rapor-${activeSemester.sKey}-${idx}`}
        style={typoStyleVars}
        className="rapor-induk-sheet rapor-sheet-scope relative overflow-hidden bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col"
      >
        {renderWatermarkLayer()}
        <div
          style={scaleWrapperStyle}
          className="relative z-10 flex-1 flex flex-col justify-between"
        >
          <div>
            {showKopSurat && <OfficialKopSurat profile={profile} compact />}

            {/* Judul & Identitas Siswa */}
            <div className="border-b-2 border-slate-900 pb-1.5 mb-2 flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3
                    className="font-black uppercase tracking-wide"
                    style={{ fontSize: sheetLayoutSpec.titlePx }}
                  >
                    DETAIL NILAI RAPOR BUKU INDUK · {activeSemester.label}
                  </h3>
                  <span className="font-mono text-[9.5px] font-bold text-slate-700 tabular-nums">
                    {paperSize === 'F4' ? 'Folio' : 'A4'} · {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
                  </span>
                </div>

                <div
                  className="pt-meta-grid grid grid-cols-2 sm:grid-cols-3 gap-x-4"
                  style={{ fontSize: sheetLayoutSpec.infoPx, lineHeight: spMeta.lineHeight }}
                >
                  <div>
                    <span className="text-slate-600">Nama:</span>{' '}
                    <strong className="uppercase">{student.nama}</strong>
                  </div>
                  <div>
                    <span className="text-slate-600">No. Induk / NISN:</span>{' '}
                    <span className="font-mono font-bold tabular-nums">
                      {noInduk} / {cleanIndukDisplay(student.nisn)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Kelas / Fase:</span>{' '}
                    <strong>{kelasRombel}</strong> ({activeSemester.fase})
                  </div>
                  <div>
                    <span className="text-slate-600">Tahun Pelajaran:</span>{' '}
                    <span className="font-mono font-semibold">{tahunPelajaran}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-600">Kurikulum:</span>{' '}
                    <strong>{resolved.sourceJenis}</strong> — {resolved.sourceName}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <ExamCardBarcode
                  value={`RAPOR|${noInduk}|${student.nisn}|${activeSemester.sKey}|${tahunPelajaran}`}
                  mode="qr_link"
                  size={sheetLayoutSpec.qrSize}
                />
              </div>
            </div>

            {/* Body: Landscape 2-Zone Grid vs Portrait Stacked */}
            {sheetLayoutSpec.isLandscape ? (
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className={showNonAkademik ? 'col-span-7' : 'col-span-12'}>
                  {academicTable}
                </div>
                <div className={showNonAkademik ? 'col-span-5 flex flex-col justify-between gap-2' : 'col-span-12'}>
                  {nonAkademikSection}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: rowGapStyle }}>
                {academicTable}
                {nonAkademikSection}
              </div>
            )}
          </div>

          {signatureBlock}
        </div>
      </div>
    );

    // 4. SURAT KETERANGAN PINDAH SEKOLAH (KELUAR)
    const renderMutasiKeluarPage = () => {
      const ttlStr =
        cleanIndukDisplay(student.tempatTanggalLahir) !== '-'
          ? cleanIndukDisplay(student.tempatTanggalLahir)
          : student.tempatLahir || student.tanggalLahir
            ? `${student.tempatLahir || '-'}, ${student.tanggalLahir || '-'}`
            : '-';
      const kelasKeluar = cleanIndukDisplay(meta?.kelasDitinggalkanMutasi || kelasRombel);
      const tglKeluarStr = cleanIndukDisplay(meta?.tanggalKeluarMutasi);
      const tglSuratKeluar =
        tglKeluarStr !== '-' ? `${profile.kota}, ${tglKeluarStr}` : tglCetak;
      const mutBasePx = orientation === 'landscape' ? 9.8 : paperSize === 'F4' ? 11 : 10.4;
      const mutStyle: React.CSSProperties = {
        fontSize: fs(mutBasePx),
        lineHeight: spMeta.lineHeight
      };

      return (
        <div
          key={`${student.id}-mutasi-keluar-${idx}`}
          style={typoStyleVars}
          className="rapor-induk-sheet rapor-sheet-scope relative overflow-hidden bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col"
        >
          {renderWatermarkLayer()}
          <div style={scaleWrapperStyle} className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              {showKopSurat && <OfficialKopSurat profile={profile} compact />}

              <div className="text-center border-b-2 border-slate-900 pb-2 mb-3">
                <h3 className="font-black uppercase tracking-wider text-slate-950" style={{ fontSize: fs(14.5) }}>
                  SURAT KETERANGAN PINDAH SEKOLAH (KELUAR)
                </h3>
                <div className="font-mono font-semibold text-slate-700 mt-0.5 tabular-nums" style={{ fontSize: fs(10.5) }}>
                  Nomor: {meta?.nomorSuratPindahKeluar?.trim() || '421.3 / ..... / 101.6.1.9 / 2026'}
                </div>
              </div>

              <div className="pt-prose" style={{ ...mutStyle, display: 'flex', flexDirection: 'column', gap: `${Math.round(12 * spMeta.scaleFactor)}px` }}>
                <p className="text-justify">
                  Yang bertanda tangan di bawah ini Kepala <strong>{profile.namaSekolah}</strong>,{' '}
                  {profile.kota}, Provinsi {profile.provinsi} (NPSN: {profile.npsn}), menerangkan dengan
                  sesungguhnya bahwa peserta didik di bawah ini:
                </p>

                <table className="pt-table w-full border-collapse border border-slate-800 bg-white/60">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 w-48 font-semibold bg-slate-100/55">Nama Lengkap Peserta Didik</td>
                      <td className="px-1.5 py-1.5 w-3 text-center">:</td>
                      <td className="px-2.5 py-1.5 font-bold uppercase">{student.nama}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Nomor Induk / NISN</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5 font-mono font-semibold tabular-nums">
                        {noInduk} / {cleanIndukDisplay(student.nisn)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Tempat, Tanggal Lahir</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5">{ttlStr}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Jenis Kelamin</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5">{student.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Kelas / Program Terakhir</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5 font-semibold">
                        {kelasKeluar} (Tahun Pelajaran {tahunPelajaran})
                      </td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Nama Orang Tua / Wali</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5">
                        {cleanIndukDisplay(student.namaAyah || student.namaIbu || student.namaOrtu || student.namaWali)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="space-y-1">
                  <div className="font-bold uppercase bg-slate-100/60 border border-slate-800 px-2.5 py-1 text-slate-950">
                    Rincian Keterangan Pindah / Meninggalkan Sekolah
                  </div>
                  <table className="pt-table w-full border-collapse border border-slate-800 bg-white/60">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="px-2.5 py-1.5 w-48 font-semibold">Tanggal Pindah / Keluar</td>
                        <td className="px-1.5 py-1.5 w-3 text-center">:</td>
                        <td className="px-2.5 py-1.5 font-semibold">{tglKeluarStr}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="px-2.5 py-1.5 font-semibold">Kelas yang Ditinggalkan</td>
                        <td className="px-1.5 py-1.5 text-center">:</td>
                        <td className="px-2.5 py-1.5 font-semibold">{kelasKeluar}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="px-2.5 py-1.5 font-semibold">Sekolah / Instansi Tujuan</td>
                        <td className="px-1.5 py-1.5 text-center">:</td>
                        <td className="px-2.5 py-1.5 font-semibold">
                          {cleanIndukDisplay(meta?.tujuanSekolahPindah)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2.5 py-2 font-semibold align-top">Sebab / Alasan Pindah</td>
                        <td className="px-1.5 py-2 text-center align-top">:</td>
                        <td className="px-2.5 py-2 font-semibold align-top">
                          {cleanIndukDisplay(meta?.alasanKeluarMutasi)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-justify">
                  Surat Keterangan Pindah Sekolah ini diberikan sesuai permohonan resmi Orang Tua/Wali
                  dan tercatat pada Buku Induk Peserta Didik {profile.namaSekolah} untuk dipergunakan
                  sebagai syarat administrasi pendaftaran pada sekolah tujuan.
                </p>
              </div>
            </div>

            {/* Footer QR + TTD Orang Tua/Wali + TTD Kepala Sekolah & Stempel */}
            <div className="pt-4 mt-4 border-t border-slate-300 flex items-end justify-between gap-4" style={mutStyle}>
              <div className="flex items-end gap-4">
                <ExamCardBarcode
                  value={`MUTASI_KELUAR|${noInduk}|${student.nisn}|${student.nama}|${tglKeluarStr}`}
                  mode="qr_link"
                  size={orientation === 'landscape' ? 44 : 50}
                />
                <div className="text-left">
                  <div className="text-slate-600">Mengetahui,</div>
                  <div className="font-semibold">Orang Tua / Wali Peserta Didik,</div>
                  <div className="h-12" />
                  <div className="font-bold">
                    {cleanIndukDisplay(student.namaAyah || student.namaIbu || student.namaOrtu, {
                      fallback: ''
                    }) ? (
                      <span className="underline">
                        {cleanIndukDisplay(student.namaAyah || student.namaIbu || student.namaOrtu)}
                      </span>
                    ) : (
                      <span className="inline-block w-36 border-b border-dotted border-slate-600 h-3" />
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-[215px] text-left relative">
                <div>{tglSuratKeluar}</div>
                <div className="font-semibold">Kepala {profile.namaSekolah},</div>
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
                <div className="font-mono text-[0.92em]">NIP. {profile.nipKepalaSekolah}</div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // 5. SURAT KETERANGAN PINDAH SEKOLAH (MASUK)
    const renderMutasiMasukPage = () => {
      const ttlStr =
        cleanIndukDisplay(student.tempatTanggalLahir) !== '-'
          ? cleanIndukDisplay(student.tempatTanggalLahir)
          : student.tempatLahir || student.tanggalLahir
            ? `${student.tempatLahir || '-'}, ${student.tanggalLahir || '-'}`
            : '-';
      const sekolahAsalPindah = cleanIndukDisplay(meta?.pindahanDariSekolah || student.sekolahAsal);
      const tglMasukStr = cleanIndukDisplay(meta?.tanggalDiterima);
      const kelasMasuk = cleanIndukDisplay(meta?.diterimaDiKelas || kelasRombel);
      const tpMasuk = cleanIndukDisplay(meta?.tahunMasuk || tahunPelajaran);
      const tglSuratMasuk =
        tglMasukStr !== '-' ? `${profile.kota}, ${tglMasukStr}` : tglCetak;
      const mutMasukBasePx = orientation === 'landscape' ? 9.8 : paperSize === 'F4' ? 11 : 10.4;
      const mutMasukStyle: React.CSSProperties = {
        fontSize: fs(mutMasukBasePx),
        lineHeight: spMeta.lineHeight
      };

      return (
        <div
          key={`${student.id}-mutasi-masuk-${idx}`}
          style={typoStyleVars}
          className="rapor-induk-sheet rapor-sheet-scope relative overflow-hidden bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col"
        >
          {renderWatermarkLayer()}
          <div style={scaleWrapperStyle} className="relative z-10 flex-1 flex flex-col justify-between">
            <div>
              {showKopSurat && <OfficialKopSurat profile={profile} compact />}

              <div className="text-center border-b-2 border-slate-900 pb-2 mb-3">
                <h3 className="font-black uppercase tracking-wider text-slate-950" style={{ fontSize: fs(14.5) }}>
                  SURAT KETERANGAN PINDAH SEKOLAH (MASUK)
                </h3>
                <div className="font-mono font-semibold text-slate-700 mt-0.5 tabular-nums" style={{ fontSize: fs(10.5) }}>
                  Nomor: {meta?.nomorSuratPindahMasuk?.trim() || '421.3 / ..... / 101.6.1.9 / 2026'}
                </div>
              </div>

              <div className="pt-prose" style={{ ...mutMasukStyle, display: 'flex', flexDirection: 'column', gap: `${Math.round(12 * spMeta.scaleFactor)}px` }}>
                <p className="text-justify">
                  Yang bertanda tangan di bawah ini Kepala <strong>{profile.namaSekolah}</strong>,{' '}
                  {profile.kota}, Provinsi {profile.provinsi} (NPSN: {profile.npsn}), menerangkan bahwa
                  peserta didik berikut telah diterima sebagai siswa pindahan (masuk):
                </p>

                <table className="pt-table w-full border-collapse border border-slate-800 bg-white/60">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 w-48 font-semibold bg-slate-100/55">Nama Lengkap Peserta Didik</td>
                      <td className="px-1.5 py-1.5 w-3 text-center">:</td>
                      <td className="px-2.5 py-1.5 font-bold uppercase">{student.nama}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Nomor Induk / NISN</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5 font-mono font-semibold tabular-nums">
                        {noInduk} / {cleanIndukDisplay(student.nisn)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Tempat, Tanggal Lahir</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5">{ttlStr}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Jenis Kelamin</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5">{student.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki'}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Alamat Peserta Didik</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5">{cleanIndukDisplay(student.alamat)}</td>
                    </tr>
                    <tr>
                      <td className="px-2.5 py-1.5 font-semibold bg-slate-100/55">Nama Orang Tua / Wali</td>
                      <td className="px-1.5 py-1.5 text-center">:</td>
                      <td className="px-2.5 py-1.5">
                        {cleanIndukDisplay(student.namaAyah || student.namaIbu || student.namaOrtu || student.namaWali)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="space-y-1">
                  <div className="font-bold uppercase bg-slate-100/60 border border-slate-800 px-2.5 py-1 text-slate-950">
                    Rincian Penerimaan Pindah Masuk & Penempatan Kelas
                  </div>
                  <table className="pt-table w-full border-collapse border border-slate-800 bg-white/60">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="px-2.5 py-1.5 w-48 font-semibold">Sekolah Asal (Pindahan Dari)</td>
                        <td className="px-1.5 py-1.5 w-3 text-center">:</td>
                        <td className="px-2.5 py-1.5 font-semibold">{sekolahAsalPindah}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="px-2.5 py-1.5 font-semibold">Diterima Tanggal</td>
                        <td className="px-1.5 py-1.5 text-center">:</td>
                        <td className="px-2.5 py-1.5 font-semibold">{tglMasukStr}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="px-2.5 py-1.5 font-semibold">Diterima di Kelas / Tahun Pelajaran</td>
                        <td className="px-1.5 py-1.5 text-center">:</td>
                        <td className="px-2.5 py-1.5 font-semibold">
                          Kelas {kelasMasuk} · Tahun Pelajaran {tpMasuk}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2.5 py-2 font-semibold align-top">Alasan / Keterangan Pindah Masuk</td>
                        <td className="px-1.5 py-2 text-center align-top">:</td>
                        <td className="px-2.5 py-2 font-semibold align-top">
                          {cleanIndukDisplay(meta?.alasanPindahan)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-justify">
                  Dengan diterbitkannya surat keterangan ini, data peserta didik yang bersangkutan telah
                  terdaftar resmi dalam Buku Induk Peserta Didik dan DAPODIK {profile.namaSekolah} sesuai
                  kurikulum yang berlaku ({resolved.sourceJenis}).
                </p>
              </div>
            </div>

            {/* Footer QR + TTD Kepala Sekolah & Stempel */}
            <div className="pt-4 mt-4 border-t border-slate-300 flex items-end justify-between gap-4" style={mutMasukStyle}>
              <div className="flex items-end gap-3">
                <ExamCardBarcode
                  value={`MUTASI_MASUK|${noInduk}|${student.nisn}|${student.nama}|${tglMasukStr}`}
                  mode="qr_link"
                  size={orientation === 'landscape' ? 44 : 50}
                />
                <div className="text-[9.5px] text-slate-600 leading-snug">
                  <div>Terdaftar pada Buku Induk</div>
                  <div className="font-mono font-bold text-slate-800">No. Induk: {noInduk}</div>
                  <div>Kurikulum: {resolved.sourceJenis}</div>
                </div>
              </div>

              <div className="min-w-[215px] text-left relative">
                <div>{tglSuratMasuk}</div>
                <div className="font-semibold">Kepala {profile.namaSekolah},</div>
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
                <div className="font-mono text-[0.92em]">NIP. {profile.nipKepalaSekolah}</div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    if (activeDocMode === 'cover') return renderCoverPage();
    if (activeDocMode === 'identitas') return renderIdentitasPage();
    if (activeDocMode === 'nilai') return renderNilaiSemesterPage();
    if (activeDocMode === 'mutasi') {
      if (mutasiMode === 'keluar') return renderMutasiKeluarPage();
      if (mutasiMode === 'masuk') return renderMutasiMasukPage();
      return (
        <React.Fragment key={`${student.id}-mutasi-both-${idx}`}>
          {renderMutasiKeluarPage()}
          {renderMutasiMasukPage()}
        </React.Fragment>
      );
    }
    return (
      <React.Fragment key={`${student.id}-paket-${idx}`}>
        {renderCoverPage()}
        {renderIdentitasPage()}
        {renderNilaiSemesterPage()}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-5">
      {/* Dynamic @page CSS matching Portrait/Landscape & A4/Folio + Exact Print Watermarks & Typography */}
      <style>{`
        ${getScopedPrintTypographyCss('.rapor-sheet-scope')}
        @page {
          size: ${pageWidthMm}mm ${pageHeightMm}mm;
          margin: ${pageMarginMm}mm;
        }
        @media screen {
          .rapor-induk-sheet {
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
          .rapor-preview-zoom-wrap {
            zoom: 1 !important;
            width: 100% !important;
          }
          .rapor-induk-sheet {
            width: 100% !important;
            min-height: ${pageHeightMm - pageMarginMm * 2 - 2}mm !important;
            padding: 0 !important;
            margin: 0 !important;
            break-after: page;
            page-break-after: always;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .rapor-induk-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Top Workspace Control Panel */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-900 text-amber-400 rounded-lg shrink-0">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Detail Nilai Rapor Buku Induk Per Semester
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5 tabular-nums">
                <span>
                  Kurikulum:{' '}
                  <strong className="text-slate-800">
                    {activeResolved?.sourceJenis || activeConfig.jenisKurikulum}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeSemester.label}</span>
                <span aria-hidden="true">·</span>
                <span>{filteredSiswa.length} Siswa</span>
                <span aria-hidden="true">·</span>
                <span>
                  Cetak: {paperSize === 'F4' ? 'Folio/F4' : 'A4'} {orientation === 'portrait' ? 'Portrait' : 'Landscape'} ({pageWidthMm}×{pageHeightMm} mm)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsvSemester}
              disabled={!activeSiswa}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-300 text-slate-800 font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Ekspor CSV {activeSemester.sKey}</span>
            </button>
            <button
              type="button"
              onClick={handlePrintRapor}
              disabled={studentsToPrint.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rapor ({studentsToPrint.length})</span>
            </button>
          </div>
        </div>

        {/* Document Mode Selector (Halaman Muka / Identitas Rapor / Nilai Semester / Ket. Pindah / Paket Lengkap) */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 border border-slate-200 gap-0.5">
              {(
                [
                  { id: 'cover', label: 'Halaman Muka Rapor' },
                  { id: 'identitas', label: 'Identitas Rapor' },
                  { id: 'nilai', label: 'Detail Nilai Semester' },
                  { id: 'mutasi', label: 'Ket. Pindah Keluar / Masuk' },
                  { id: 'paket_lengkap', label: 'Paket Lengkap (3 Lembar)' }
                ] as const
              ).map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveDocMode(mode.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    activeDocMode === mode.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {activeDocMode === 'mutasi' && (
              <div className="inline-flex rounded-lg bg-amber-50 p-1 border border-amber-200 gap-0.5">
                {(
                  [
                    { id: 'keluar', label: 'Pindah Keluar' },
                    { id: 'masuk', label: 'Pindah Masuk' },
                    { id: 'keduanya', label: 'Keduanya (Keluar & Masuk)' }
                  ] as const
                ).map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setMutasiMode(sub.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      mutasiMode === sub.id
                        ? 'bg-slate-900 text-amber-400'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Watermark ("Halaman Air" Bergelombang SMA NEGERI 9 SURABAYA + Logo) Settings */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer select-none text-[11px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={e => setShowWatermark(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Halaman Air Bergelombang SMAN 9</span>
            </label>

            {showWatermark && (
              <>
                <select
                  value={watermarkSource}
                  onChange={e => setWatermarkSource(e.target.value as 'sman9' | 'profil')}
                  className="px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-700"
                  title="Sumber Logo Watermark"
                >
                  <option value="sman9">Logo Resmi SMAN 9 Surabaya</option>
                  <option value="profil">Logo Unggahan Profil Sekolah</option>
                </select>
                <select
                  value={watermarkOpacityPct}
                  onChange={e => setWatermarkOpacityPct(Number(e.target.value))}
                  className="px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-700 tabular-nums"
                  title="Transparansi Latar Halaman Air"
                >
                  {[6, 8, 10, 12, 16, 20, 25].map(op => (
                    <option key={op} value={op}>
                      Transparansi {op}%
                    </option>
                  ))}
                </select>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 tabular-nums">
                  <span>Kerapatan Baris:</span>
                  <input
                    type="range"
                    min={28}
                    max={116}
                    step={2}
                    value={waveRowGapPx}
                    onChange={e => setWaveRowGapPx(Number(e.target.value))}
                    className="w-20 accent-blue-600 cursor-pointer"
                    title="Atur jarak vertikal antar baris gelombang SMA NEGERI 9 SURABAYA"
                  />
                  <span className="font-mono text-[10.5px] text-slate-900 w-9 text-right">
                    {waveRowGapPx}px
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 tabular-nums">
                  <span>Jarak Tulisan:</span>
                  <input
                    type="range"
                    min={4}
                    max={64}
                    step={2}
                    value={waveWordGapPx}
                    onChange={e => setWaveWordGapPx(Number(e.target.value))}
                    className="w-16 accent-blue-600 cursor-pointer"
                    title="Atur jarak mendatar antar tulisan SMA NEGERI 9 SURABAYA"
                  />
                  <span className="font-mono text-[10.5px] text-slate-900 w-8 text-right">
                    {waveWordGapPx}px
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Semester Selector Strip (Smt 1 - Smt 6) & Paper/Orientation Controls */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 border border-slate-200 gap-0.5">
            {SEMESTER_OPTIONS.map(sem => (
              <button
                key={sem.sKey}
                type="button"
                onClick={() => setActiveSemesterNum(sem.num)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  activeSemesterNum === sem.num
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sem.shortLabel}
              </button>
            ))}
          </div>

          {/* Paper Size (A4 / Folio F4), Orientation (Portrait / Landscape), Scale & Scope */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['portrait', 'landscape'] as const).map(ori => (
                <button
                  key={ori}
                  type="button"
                  onClick={() => setOrientation(ori)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                    orientation === ori ? 'bg-slate-900 text-amber-400' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ori === 'portrait' ? 'Portrait' : 'Landscape'}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  paperSize === 'A4' ? 'bg-slate-900 text-amber-400' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 (210×297)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  paperSize === 'F4' ? 'bg-slate-900 text-amber-400' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Folio / F4 (215×330)
              </button>
            </div>

            <select
              value={printScalePct}
              onChange={e => setPrintScalePct(Number(e.target.value))}
              className="px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-[11px] font-semibold text-slate-700 tabular-nums"
              title="Skala Cetak Presisi"
            >
              {[85, 90, 95, 100, 105, 110].map(pct => (
                <option key={pct} value={pct}>
                  Skala {pct}%
                </option>
              ))}
            </select>

            <PrintTypographyBar
              value={typography}
              onChange={setTypography}
              previewZoomPct={previewZoomPct}
              onPreviewZoomChange={setPreviewZoomPct}
              zoomPresets={[50, 65, 85, 100]}
              compact
            />

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setPrintScope('individu')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  printScope === 'individu' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                Individu (1)
              </button>
              <button
                type="button"
                onClick={() => setPrintScope('terpilih')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  printScope === 'terpilih' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                Terpilih ({checkedIds.length})
              </button>
              <button
                type="button"
                onClick={() => setPrintScope('tersaring')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                  printScope === 'tersaring' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                Semua ({filteredSiswa.length})
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Visibility Print Sections */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 border-t border-slate-100 text-[11.5px] text-slate-700">
          <span className="font-semibold text-slate-500">Elemen Lembar Cetak:</span>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showKopSurat}
              onChange={e => setShowKopSurat(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Kop Sekolah</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showKkmColumn}
              onChange={e => setShowKkmColumn(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Kolom KKM / KKTP</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCapaianColumn}
              onChange={e => setShowCapaianColumn(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Kolom Capaian Kompetensi</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showNonAkademik}
              onChange={e => setShowNonAkademik(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>Sikap, Ekskul & Absensi</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTtdOrtu}
              onChange={e => setShowTtdOrtu(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span>TTD Orang Tua / Wali</span>
          </label>
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

      {/* Student Selector Table (No-Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari siswa (Nama / NIS / NISN / Kelas)..."
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
          <button
            type="button"
            onClick={() =>
              setCheckedIds(
                checkedIds.length === filteredSiswa.length && filteredSiswa.length > 0
                  ? []
                  : filteredSiswa.map(s => s.id)
              )
            }
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700 whitespace-nowrap shrink-0"
          >
            {checkedIds.length === filteredSiswa.length && filteredSiswa.length > 0
              ? 'Batal Pilih Semua'
              : 'Pilih Semua Tersaring'}
          </button>
        </div>

        <div className="overflow-x-auto max-h-52">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-800 text-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 w-8 text-center">#</th>
                <th className="px-3 py-2 w-28">No. Induk / NIS</th>
                <th className="px-3 py-2">Nama Peserta Didik</th>
                <th className="px-3 py-2 w-24">Kelas</th>
                <th className="px-3 py-2 w-32 text-center">Terisi ({activeSemester.sKey})</th>
                <th className="px-3 py-2 w-28 text-center">Rata-Rata</th>
                <th className="px-3 py-2 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    Tidak ada siswa yang sesuai pencarian.
                  </td>
                </tr>
              ) : (
                filteredSiswa.map(s => {
                  const isCurrent = activeSiswa?.id === s.id;
                  const isChecked = checkedIds.includes(s.id);
                  const meta = siswaMetaMap[s.id];
                  const res = resolveCurriculumForStudent(s, activeSemester, mapelScopeMode);
                  const nums = res.mapelList
                    .map(m => {
                      const sc = getMapelSemesterScore(meta, m, activeSemester);
                      return parseNumericScore(res.isK13 ? sc.pengN : sc.nilaiAkhir);
                    })
                    .filter((v): v is number => v !== null);
                  const avg =
                    nums.length > 0
                      ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
                      : '-';

                  return (
                    <tr
                      key={s.id}
                      className={isCurrent ? 'bg-blue-50/70' : 'hover:bg-slate-50'}
                    >
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setCheckedIds(prev =>
                              prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                            )
                          }
                          className="text-slate-500 hover:text-blue-600"
                          title="Tandai untuk cetak massal"
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
                      <td className="px-3 py-2 font-semibold text-slate-900">{s.nama}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                        {s.rombelSaatIni || s.kelas}
                      </td>
                      <td className="px-3 py-2 text-center font-mono tabular-nums">
                        <span className={nums.length > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                          {nums.length}/{res.mapelList.length} Mapel
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-800 tabular-nums">
                        {avg}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSiswaId(s.id);
                            setPrintScope('individu');
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 hover:bg-blue-100 text-blue-800'
                          }`}
                        >
                          Kelola Nilai
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

      {/* Editor Surat Keterangan Pindah Sekolah (Keluar / Masuk) - No-Print */}
      {activeSiswa && activeDocMode === 'mutasi' && (() => {
        const curMeta = siswaMetaMap[activeSiswa.id] || { siswaId: activeSiswa.id };
        const defaultKelas = activeSiswa.rombelSaatIni || activeSiswa.kelas || '';
        return (
          <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Data Surat Keterangan Pindah Sekolah (Keluar / Masuk) — {activeSiswa.nama}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Perubahan otomatis tersimpan &amp; sinkron dengan Buku Induk Peserta Didik (Butir 21 &amp; Butir 54), lengkap dengan TTD Kepala Sekolah &amp; Stempel.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  saveStoredBukuIndukSiswaMeta(siswaMetaMap);
                  appendAuditLog(
                    'SIMPAN_MUTASI_SISWA',
                    `${currentUser.name} menyimpan data keterangan pindah (keluar/masuk) untuk ${activeSiswa.nama}.`
                  );
                  notify('success', `Data Surat Keterangan Pindah (${activeSiswa.nama}) tersimpan & siap dicetak.`);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Data Pindah</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Panel Kiri: Pindah Keluar */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="font-bold text-slate-900 uppercase text-[11px] tracking-wide border-b border-slate-200 pb-1.5">
                  A. Keterangan Pindah Sekolah (Keluar)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Nomor Surat Pindah Keluar
                    </label>
                    <input
                      type="text"
                      value={curMeta.nomorSuratPindahKeluar || ''}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { nomorSuratPindahKeluar: e.target.value })}
                      placeholder="421.3 / 102 / 101.6.1.9 / 2026"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Tanggal Meninggalkan Sekolah
                    </label>
                    <input
                      type="text"
                      value={curMeta.tanggalKeluarMutasi || ''}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { tanggalKeluarMutasi: e.target.value })}
                      placeholder="Misal: 18 November 2026"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Kelas yang Ditinggalkan
                    </label>
                    <input
                      type="text"
                      value={curMeta.kelasDitinggalkanMutasi ?? defaultKelas}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { kelasDitinggalkanMutasi: e.target.value })}
                      placeholder={defaultKelas || 'XI-F.2'}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Sekolah / Daerah Tujuan
                    </label>
                    <input
                      type="text"
                      value={curMeta.tujuanSekolahPindah || ''}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { tujuanSekolahPindah: e.target.value })}
                      placeholder="Misal: SMA Negeri 1 Sidoarjo"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Sebab / Alasan Pindah Keluar
                    </label>
                    <textarea
                      rows={2}
                      value={curMeta.alasanKeluarMutasi || ''}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { alasanKeluarMutasi: e.target.value })}
                      placeholder="Misal: Mengikuti kepindahan tugas dinas orang tua ke luar kota..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Panel Kanan: Pindah Masuk */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="font-bold text-slate-900 uppercase text-[11px] tracking-wide border-b border-slate-200 pb-1.5">
                  B. Keterangan Pindah Sekolah (Masuk)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Nomor Surat Pindah Masuk
                    </label>
                    <input
                      type="text"
                      value={curMeta.nomorSuratPindahMasuk || ''}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { nomorSuratPindahMasuk: e.target.value })}
                      placeholder="421.3 / 108 / 101.6.1.9 / 2026"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Sekolah Asal (Pindahan Dari)
                    </label>
                    <input
                      type="text"
                      value={curMeta.pindahanDariSekolah || ''}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { pindahanDariSekolah: e.target.value })}
                      placeholder={activeSiswa.sekolahAsal || 'Misal: SMA Negeri 5 Surabaya'}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Tanggal Diterima Masuk
                    </label>
                    <input
                      type="text"
                      value={curMeta.tanggalDiterima || ''}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { tanggalDiterima: e.target.value })}
                      placeholder="Misal: 14 Juli 2026"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Diterima di Kelas &amp; Tahun Masuk
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={curMeta.diterimaDiKelas || ''}
                        onChange={e => updateSiswaMeta(activeSiswa.id, { diterimaDiKelas: e.target.value })}
                        placeholder={defaultKelas || 'XI-F.2'}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                      />
                      <input
                        type="text"
                        value={curMeta.tahunMasuk || ''}
                        onChange={e => updateSiswaMeta(activeSiswa.id, { tahunMasuk: e.target.value })}
                        placeholder={activeConfig.tahunPelajaran || '2026/2027'}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-mono text-[11px]"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                      Sebab / Alasan Pindah Masuk
                    </label>
                    <textarea
                      rows={2}
                      value={curMeta.alasanPindahan || ''}
                      onChange={e => updateSiswaMeta(activeSiswa.id, { alasanPindahan: e.target.value })}
                      placeholder="Misal: Mengikuti perpindahan domisili orang tua ke Kota Surabaya..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Editor Detail Nilai Rapor Per Semester (No-Print) */}
      {activeSiswa && activeResolved ? (
        <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          {/* Header Editor + Live Numeric Telemetry */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Input Nilai Per Mata Pelajaran — {activeSiswa.nama} ({activeSiswa.rombelSaatIni || activeSiswa.kelas})
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-slate-600 mt-0.5 tabular-nums">
                <span>{activeSemester.label}</span>
                <span aria-hidden="true">·</span>
                <span>Mapel Terisi: <strong className="text-slate-900">{activeStats.terisi}/{activeStats.totalMapel}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Jumlah: <strong className="text-slate-900 font-mono">{activeStats.jumlah}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Rata-rata: <strong className="text-blue-700 font-mono">{activeStats.rataRata}</strong></span>
                <span aria-hidden="true">·</span>
                <span>
                  Tuntas KKM: <strong className="text-emerald-700">{activeStats.tuntas}</strong>
                  {activeStats.belumTuntas > 0 && (
                    <span className="text-rose-600 ml-1">({activeStats.belumTuntas} di bawah KKM)</span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setMapelScopeMode('sesuai_siswa')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap ${
                    mapelScopeMode === 'sesuai_siswa' ? 'bg-slate-900 text-amber-400' : 'text-slate-600'
                  }`}
                >
                  Sesuai Tingkat {activeSemester.tingkat}
                </button>
                <button
                  type="button"
                  onClick={() => setMapelScopeMode('semua')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold whitespace-nowrap ${
                    mapelScopeMode === 'semua' ? 'bg-slate-900 text-amber-400' : 'text-slate-600'
                  }`}
                >
                  Semua Mapel Kurikulum
                </button>
              </div>

              <button
                type="button"
                onClick={handleFillDefaultKkm}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700 flex items-center gap-1 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Isi KKM Standar</span>
              </button>

              <button
                type="button"
                onClick={handleRecalcPredikat}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-semibold text-slate-700 flex items-center gap-1 whitespace-nowrap"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                <span>Hitung Predikat</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteModal(v => !v)}
                className={`px-2.5 py-1.5 border rounded font-semibold flex items-center gap-1 whitespace-nowrap ${
                  showPasteModal
                    ? 'bg-slate-900 text-amber-400 border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Tempel Excel</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndAudit}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold flex items-center gap-1 whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Semester</span>
              </button>
            </div>
          </div>

          {/* Inline Paste Excel Helper */}
          {showPasteModal && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  Tempel Daftar Nilai dari Excel ke {activeSemester.shortLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-600">
                Salin kolom dari Excel lalu tempel di bawah. Format Kurikulum Merdeka:{' '}
                <code className="bg-white px-1 border border-slate-200 rounded">Nama Mapel [TAB] Nilai Akhir [TAB] Capaian</code>{' '}
                atau Format K-13:{' '}
                <code className="bg-white px-1 border border-slate-200 rounded">Nama Mapel [TAB] Nilai Peng [TAB] Nilai Ket</code>.
              </p>
              <textarea
                rows={4}
                value={pasteScoreText}
                onChange={e => setPasteScoreText(e.target.value)}
                placeholder={'Bahasa Indonesia\t88\tMampu menyusun teks argumentasi dengan baik\nMatematika\t85'}
                className="w-full p-2 border border-slate-300 rounded bg-white font-mono text-[11px]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-3 py-1.5 border border-slate-300 bg-white rounded font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handlePasteScoresFromExcel}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Terapkan ke {activeSemester.sKey}</span>
                </button>
              </div>
            </div>
          )}

          {/* Subject Grade Input Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-800 text-slate-100">
                <tr>
                  <th className="px-2.5 py-2 w-10 text-center">No</th>
                  <th className="px-2.5 py-2 min-w-[210px]">Mata Pelajaran</th>
                  <th className="px-2 py-2 w-20 text-center">
                    {activeResolved.isK13 || activeResolved.isKtsp ? 'KKM' : 'KKTP'}
                  </th>
                  {activeResolved.isK13 ? (
                    <>
                      <th className="px-2 py-2 w-24 text-center">Peng (Angka)</th>
                      <th className="px-2 py-2 w-20 text-center">Pred. Peng</th>
                      <th className="px-2 py-2 w-24 text-center">Ket (Angka)</th>
                      <th className="px-2 py-2 w-20 text-center">Pred. Ket</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-2 w-28 text-center">Nilai Akhir</th>
                      <th className="px-2 py-2 w-24 text-center">Predikat</th>
                    </>
                  )}
                  <th className="px-2.5 py-2 min-w-[240px]">Capaian Kompetensi / Catatan Guru</th>
                  <th className="px-2 py-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const grouped = groupMapelList(activeResolved.mapelList);
                  const meta = siswaMetaMap[activeSiswa.id];
                  let seq = 0;

                  if (grouped.length === 0) {
                    return (
                      <tr>
                        <td colSpan={activeResolved.isK13 ? 9 : 7} className="px-4 py-6 text-center text-slate-400">
                          Tidak ada mata pelajaran untuk filter saat ini. Coba ganti ke &ldquo;Semua Mapel Kurikulum&rdquo; atau tambah mapel di bawah.
                        </td>
                      </tr>
                    );
                  }

                  return grouped.map(g => (
                    <React.Fragment key={g.kelompok}>
                      <tr className="bg-slate-100 border-y border-slate-200">
                        <td
                          colSpan={activeResolved.isK13 ? 9 : 7}
                          className="px-2.5 py-1.5 font-bold text-slate-800"
                        >
                          {g.kelompok}
                        </td>
                      </tr>
                      {g.items.map(m => {
                        seq += 1;
                        const sc = getMapelSemesterScore(meta, m, activeSemester);
                        const numVal = parseNumericScore(
                          activeResolved.isK13 ? sc.pengN : sc.nilaiAkhir
                        );
                        const kkmNum = parseNumericScore(sc.kkm) ?? m.kkm ?? 75;
                        const isBelowKkm = numVal !== null && numVal < kkmNum;
                        const isExtra = m.id.startsWith('extra-');

                        return (
                          <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                            <td className="px-2.5 py-1.5 text-center font-mono text-slate-500 tabular-nums">
                              {seq}
                            </td>
                            <td className="px-2.5 py-1.5">
                              <div className="font-semibold text-slate-900">{m.namaMapel}</div>
                              <div className="text-[10.5px] text-slate-500">
                                {m.kode ? `${m.kode} · ` : ''}
                                {m.kondisiStatus || 'Wajib'}
                                {m.kondisiTingkat && m.kondisiTingkat !== 'Semua'
                                  ? ` · Tingkat ${m.kondisiTingkat}`
                                  : ''}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="text"
                                value={sc.kkm || ''}
                                onChange={e =>
                                  updateSemesterScoreField(
                                    activeSiswa.id,
                                    m,
                                    activeSemester,
                                    { kkm: e.target.value },
                                    activeResolved.isK13
                                  )
                                }
                                placeholder={String(m.kkm || 75)}
                                className="w-14 px-1.5 py-1 border border-slate-300 rounded text-center font-mono tabular-nums bg-white"
                              />
                            </td>

                            {activeResolved.isK13 ? (
                              <>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    value={sc.pengN || ''}
                                    onChange={e =>
                                      updateSemesterScoreField(
                                        activeSiswa.id,
                                        m,
                                        activeSemester,
                                        { pengN: e.target.value },
                                        true
                                      )
                                    }
                                    placeholder="-"
                                    className={`w-16 px-1.5 py-1 border rounded text-center font-mono font-semibold tabular-nums bg-white ${
                                      isBelowKkm
                                        ? 'border-rose-400 text-rose-700 bg-rose-50/40'
                                        : 'border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    value={sc.pengP || ''}
                                    onChange={e =>
                                      updateSemesterScoreField(
                                        activeSiswa.id,
                                        m,
                                        activeSemester,
                                        { pengP: e.target.value.toUpperCase() },
                                        true
                                      )
                                    }
                                    placeholder="-"
                                    className="w-12 px-1 py-1 border border-slate-300 rounded text-center font-semibold bg-white"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    value={sc.ketN || ''}
                                    onChange={e =>
                                      updateSemesterScoreField(
                                        activeSiswa.id,
                                        m,
                                        activeSemester,
                                        { ketN: e.target.value },
                                        true
                                      )
                                    }
                                    placeholder="-"
                                    className="w-16 px-1.5 py-1 border border-slate-300 rounded text-center font-mono font-semibold tabular-nums bg-white"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    value={sc.ketP || ''}
                                    onChange={e =>
                                      updateSemesterScoreField(
                                        activeSiswa.id,
                                        m,
                                        activeSemester,
                                        { ketP: e.target.value.toUpperCase() },
                                        true
                                      )
                                    }
                                    placeholder="-"
                                    className="w-12 px-1 py-1 border border-slate-300 rounded text-center font-semibold bg-white"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    value={sc.nilaiAkhir || ''}
                                    onChange={e =>
                                      updateSemesterScoreField(
                                        activeSiswa.id,
                                        m,
                                        activeSemester,
                                        { nilaiAkhir: e.target.value },
                                        false
                                      )
                                    }
                                    placeholder="-"
                                    className={`w-20 px-2 py-1 border rounded text-center font-mono font-semibold tabular-nums bg-white ${
                                      isBelowKkm
                                        ? 'border-rose-400 text-rose-700 bg-rose-50/40'
                                        : 'border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                  <input
                                    type="text"
                                    value={sc.predikat || ''}
                                    onChange={e =>
                                      updateSemesterScoreField(
                                        activeSiswa.id,
                                        m,
                                        activeSemester,
                                        { predikat: e.target.value.toUpperCase() },
                                        false
                                      )
                                    }
                                    placeholder="A–D"
                                    className="w-14 px-1.5 py-1 border border-slate-300 rounded text-center font-semibold bg-white"
                                  />
                                </td>
                              </>
                            )}

                            <td className="px-2.5 py-1.5">
                              <input
                                type="text"
                                value={sc.capaian || ''}
                                onChange={e =>
                                  updateSemesterScoreField(
                                    activeSiswa.id,
                                    m,
                                    activeSemester,
                                    { capaian: e.target.value },
                                    activeResolved.isK13
                                  )
                                }
                                placeholder="Catatan capaian kompetensi siswa..."
                                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {isExtra && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExtraMapel(m.id, m.namaMapel)}
                                  title="Hapus mapel tambahan"
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Add Custom / Extra Subject Row */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              type="text"
              value={newExtraMapelKelompok}
              onChange={e => setNewExtraMapelKelompok(e.target.value)}
              placeholder="Kelompok Mapel"
              className="w-52 px-2.5 py-1.5 border border-slate-300 rounded text-xs"
            />
            <input
              type="text"
              value={newExtraMapelName}
              onChange={e => setNewExtraMapelName(e.target.value)}
              placeholder="Tambah mata pelajaran khusus siswa (opsional)..."
              className="flex-1 min-w-[220px] px-2.5 py-1.5 border border-slate-300 rounded text-xs"
            />
            <button
              type="button"
              onClick={handleAddExtraMapel}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Tambah Mapel</span>
            </button>
          </div>

          {/* Non-Akademik, Sikap, Absensi, Ekskul & Wali Kelas Semester */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <div className="font-bold text-slate-900">
                Sikap, Ketidakhadiran & Wali Kelas ({activeSemester.shortLabel})
              </div>
              {(() => {
                const tm = siswaMetaMap[activeSiswa.id]?.tahunAjaranMeta?.[activeSemester.tingkat] || {};
                const catSem =
                  siswaMetaMap[activeSiswa.id]?.catatanWaliKelasPerSemester?.[activeSemester.sKey] || '';
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Tahun Pelajaran
                      </label>
                      <input
                        type="text"
                        value={tm.tahunPelajaran || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                            tahunPelajaran: e.target.value
                          })
                        }
                        placeholder={activeConfig.tahunPelajaran}
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Sikap Spiritual
                      </label>
                      <input
                        type="text"
                        value={tm.sikapSpiritual || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                            sikapSpiritual: e.target.value
                          })
                        }
                        placeholder="Baik / Sangat Baik"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Sikap Sosial
                      </label>
                      <input
                        type="text"
                        value={tm.sikapSosial || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                            sikapSosial: e.target.value
                          })
                        }
                        placeholder="Baik / Sangat Baik"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Sakit (hari)
                      </label>
                      <input
                        type="text"
                        value={tm.sakit || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, { sakit: e.target.value })
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-center text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Ijin (hari)
                      </label>
                      <input
                        type="text"
                        value={tm.ijin || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, { ijin: e.target.value })
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-center text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Alpha (hari)
                      </label>
                      <input
                        type="text"
                        value={tm.alpha || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, { alpha: e.target.value })
                        }
                        placeholder="0"
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-center text-[11px]"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Catatan Wali Kelas ({activeSemester.shortLabel})
                      </label>
                      <input
                        type="text"
                        value={catSem}
                        onChange={e =>
                          updateCatatanSemester(activeSiswa.id, activeSemester.sKey, e.target.value)
                        }
                        placeholder="Catatan pembinaan dan motivasi siswa..."
                        className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                      />
                    </div>
                    {guruList.length > 0 && (
                      <div className="col-span-2 sm:col-span-3">
                        <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                          Pilih Wali Kelas dari Master Guru (Opsional)
                        </label>
                        <select
                          value=""
                          onChange={e => {
                            const g = guruList.find(item => item.id === e.target.value);
                            if (g) {
                              updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                                waliKelasNama: g.nama,
                                waliKelasNip: g.nip
                              });
                            }
                          }}
                          className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                        >
                          <option value="">-- Terapkan Nama & NIP Wali Kelas dari Guru --</option>
                          {guruList.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.nama} ({g.nip || 'Non-NIP'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Nama Wali Kelas
                      </label>
                      <input
                        type="text"
                        value={tm.waliKelasNama || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                            waliKelasNama: e.target.value
                          })
                        }
                        placeholder="Nama & Gelar"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        NIP Wali Kelas
                      </label>
                      <input
                        type="text"
                        value={tm.waliKelasNip || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                            waliKelasNip: e.target.value
                          })
                        }
                        placeholder="NIP."
                        className="w-full px-2 py-1 border border-slate-300 rounded font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Kota & Tanggal Cetak
                      </label>
                      <input
                        type="text"
                        value={tm.tanggalTtd || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                            tanggalTtd: e.target.value
                          })
                        }
                        placeholder="Surabaya, Desember 2026"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Ekstrakurikuler & Status Akhir Semester */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  Ekstrakurikuler (Tingkat {activeSemester.tingkat}) & Keputusan Akhir
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const current = siswaMetaMap[activeSiswa.id]?.ekskulRecords || [];
                    const next: BukuIndukEkskulItem[] = [
                      ...current,
                      { nama: '', x: 'Baik', xi: 'Baik', xii: 'Baik' }
                    ];
                    updateSiswaMeta(activeSiswa.id, { ekskulRecords: next });
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Ekskul</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {(siswaMetaMap[activeSiswa.id]?.ekskulRecords || []).length === 0 ? (
                  <div className="p-3 border border-dashed border-slate-300 rounded text-center text-slate-400 text-[11px]">
                    Belum ada kegiatan ekstrakurikuler tercatat. Klik &ldquo;Tambah Ekskul&rdquo; untuk mengisi.
                  </div>
                ) : (
                  (siswaMetaMap[activeSiswa.id]?.ekskulRecords || []).map((ex, eIdx) => {
                    const fieldKey =
                      activeSemester.tingkat === 'X'
                        ? 'x'
                        : activeSemester.tingkat === 'XI'
                          ? 'xi'
                          : 'xii';
                    return (
                      <div key={eIdx} className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          value={ex.nama}
                          onChange={e => {
                            const next = [...(siswaMetaMap[activeSiswa.id]?.ekskulRecords || [])];
                            next[eIdx] = { ...next[eIdx], nama: e.target.value };
                            updateSiswaMeta(activeSiswa.id, { ekskulRecords: next });
                          }}
                          placeholder="Nama Ekstrakurikuler (misal: Pramuka, PMR)"
                          className="col-span-7 px-2 py-1 border border-slate-300 rounded text-[11px]"
                        />
                        <input
                          type="text"
                          value={ex[fieldKey] || ''}
                          onChange={e => {
                            const next = [...(siswaMetaMap[activeSiswa.id]?.ekskulRecords || [])];
                            next[eIdx] = { ...next[eIdx], [fieldKey]: e.target.value };
                            updateSiswaMeta(activeSiswa.id, { ekskulRecords: next });
                          }}
                          placeholder="Predikat (Sangat Baik / Baik)"
                          className="col-span-4 px-2 py-1 border border-slate-300 rounded text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (siswaMetaMap[activeSiswa.id]?.ekskulRecords || []).filter(
                              (_, i) => i !== eIdx
                            );
                            updateSiswaMeta(activeSiswa.id, { ekskulRecords: next });
                          }}
                          className="col-span-1 p-1 text-rose-600 hover:bg-rose-50 rounded flex justify-center"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {(() => {
                const tm = siswaMetaMap[activeSiswa.id]?.tahunAjaranMeta?.[activeSemester.tingkat] || {};
                const tingkatAuto = extractTingkatFromKelas(activeSiswa.rombelSaatIni || activeSiswa.kelas);
                return (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Status Kenaikan / Kelulusan
                      </label>
                      <select
                        value={tm.statusAkhir || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                            statusAkhir: e.target.value as BukuIndukTahunMeta['statusAkhir']
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
                      >
                        <option value="">Otomatis / Tidak Ditampilkan</option>
                        <option value="Naik">Naik Kelas</option>
                        <option value="Tinggal">Tinggal di Kelas</option>
                        <option value="Lulus">Lulus</option>
                        <option value="Tidak Lulus">Tidak Lulus</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-slate-600 mb-0.5">
                        Tujuan Kelas Berikutnya
                      </label>
                      <input
                        type="text"
                        value={tm.naikKeKelas || ''}
                        onChange={e =>
                          updateTahunMeta(activeSiswa.id, activeSemester.tingkat, {
                            naikKeKelas: e.target.value
                          })
                        }
                        placeholder={
                          tingkatAuto === 'X' ? 'XI-...' : tingkatAuto === 'XI' ? 'XII-...' : 'Lulus SMA'
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-[11px]"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-print bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-400">
          Belum ada data siswa yang dipilih atau sesuai pencarian.
        </div>
      )}

      {/* Printable Preview Area */}
      <div className="w-full overflow-x-auto pb-6 print:overflow-visible print:pb-0">
        {studentsToPrint.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-400">
            Pilih minimal satu siswa untuk pratinjau cetak rapor semester.
          </div>
        ) : (
          <div
            className="rapor-preview-zoom-wrap mx-auto w-fit space-y-6 print:w-full print:space-y-0"
            style={{ zoom: previewZoomPct / 100 }}
          >
            {studentsToPrint.map((st, idx) => renderPrintableRaporSheet(st, idx))}
          </div>
        )}
      </div>
    </div>
  );
};
