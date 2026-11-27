import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link2,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
  X,
  AlertCircle,
  BookOpen,
  Loader2,
  Sparkles
} from 'lucide-react';
import {
  Guru,
  SchoolProfile,
  SkpBuktiDukungItem,
  SkpBuktiFileType,
  SkpBuktiKategori,
  SkpDocumentRecord,
  SkpIndikatorKinerja,
  SkpRatingLevel,
  SkpRhkItem,
  SkpStatusVerifikasi,
  Tendik,
  User
} from '../types';
import {
  deleteSkpEvidenceFile,
  formatEvidenceByteSize,
  saveSkpEvidenceFile
} from '../services/skpEvidenceStorage';
import {
  appendAuditLog,
  getStoredSkpRecords,
  saveStoredSkpRecords
} from '../services/storageService';
import {
  buildTemplateRhksForRole,
  computeSkpPredikatKinerja,
  DEFAULT_BERAKHLAK_LIST,
  detectSkpFileType,
  exportSkpDocumentToExcel
} from '../utils/skpPresets';
import { OfficialKopSurat } from './OfficialKopSurat';
import { resolveDirectImageUrl } from './ExamCardBarcode';
import {
  ActiveEvidenceSelection,
  SkpEvidenceReaderPanel
} from './SkpEvidenceReaderPanel';
import { SkpAiAssistModal, SkpAiMode } from './SkpAiAssistModal';
import { SkpCoverSheet } from './SkpCoverSheet';

interface SkpPegawaiViewProps {
  profile: SchoolProfile;
  currentUser: User;
  guruList: Guru[];
  tendikList: Tendik[];
  fallbackTtdKsUrl?: string;
  fallbackStempelUrl?: string;
}

type WorkspaceMode = 'rhk_bukti' | 'evaluasi_berakhlak' | 'cetak_resmi';

const BUKTI_KATEGORI_LIST: SkpBuktiKategori[] = [
  'SK / Surat Tugas',
  'Perangkat Ajar / Modul',
  'Laporan Kegiatan',
  'Daftar Hadir / Rekap',
  'Sertifikat / Piagam',
  'Dokumentasi Foto',
  'Tautan Drive / e-Kinerja',
  'Lainnya'
];

export const SkpPegawaiView: React.FC<SkpPegawaiViewProps> = ({
  profile,
  currentUser,
  guruList,
  tendikList,
  fallbackTtdKsUrl,
  fallbackStempelUrl
}) => {
  const [skpRecords, setSkpRecords] = useState<SkpDocumentRecord[]>(() =>
    getStoredSkpRecords()
  );
  const [selectedSkpId, setSelectedSkpId] = useState<string>(
    () => getStoredSkpRecords()[0]?.id || ''
  );
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('rhk_bukti');
  const [selectedEvidenceRef, setSelectedEvidenceRef] = useState<{
    rhkId: string;
    buktiId: string;
  } | null>(null);
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false);

  // Filter / search inside RHK & Bukti
  const [searchBukti, setSearchBukti] = useState('');
  const [filterStatusVerif, setFilterStatusVerif] = useState<
    'SEMUA' | SkpStatusVerifikasi
  >('SEMUA');

  // Inline feedback & delete confirm
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);
  const [confirmDeleteSkpId, setConfirmDeleteSkpId] = useState<string | null>(null);

  // Modals
  const [isNewSkpModalOpen, setIsNewSkpModalOpen] = useState(false);
  const [newSkpGtkKey, setNewSkpGtkKey] = useState('');
  const [newSkpTahun, setNewSkpTahun] = useState(2026);
  const [newSkpPeriode, setNewSkpPeriode] = useState(
    '1 Januari s.d. 31 Desember 2026'
  );
  const [newSkpManualNama, setNewSkpManualNama] = useState('');
  const [newSkpManualNip, setNewSkpManualNip] = useState('');
  const [newSkpManualJabatan, setNewSkpManualJabatan] = useState('');
  const [newSkpManualRole, setNewSkpManualRole] = useState<'guru' | 'tendik'>('guru');

  const [isEditIdentityOpen, setIsEditIdentityOpen] = useState(false);
  const [identityDraft, setIdentityDraft] = useState<Partial<SkpDocumentRecord>>({});

  // RHK Modal
  const [rhkModal, setRhkModal] = useState<{
    editingId: string | null;
    jenis: 'Utama' | 'Tambahan';
    rhkAtasan: string;
    rencanaHasilKerja: string;
    periodeLabel: string;
    indikatorList: SkpIndikatorKinerja[];
    error: string;
  } | null>(null);

  // Bukti Dukung Upload / Create Modal
  const [buktiModal, setBuktiModal] = useState<{
    rhkId: string;
    editingBuktiId: string | null;
    judul: string;
    ringkasanIsi: string;
    kategori: SkpBuktiKategori;
    nomorDokumen: string;
    tanggalDokumen: string;
    inputMethod: 'file' | 'text' | 'link';
    externalUrl: string;
    teksNarasi: string;
    pendingFile: File | null;
    detectedFileType: SkpBuktiFileType;
    error: string;
  } | null>(null);

  // Print options
  const [tampilkanTtdStempel, setTampilkanTtdStempel] = useState(true);
  const [printSectionMode, setPrintSectionMode] = useState<
    'cover_dan_isi' | 'cover_saja' | 'isi_saja'
  >('cover_dan_isi');

  // AI Assistant state
  const [aiAssistModal, setAiAssistModal] = useState<{
    open: boolean;
    mode: SkpAiMode;
  }>({ open: false, mode: 'generate_rhk' });
  const [isInlineAiRhkLoading, setIsInlineAiRhkLoading] = useState(false);
  const [isInlineAiBuktiLoading, setIsInlineAiBuktiLoading] = useState(false);

  const canEdit = ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek', 'guru_staf'].includes(
    currentUser.role
  );
  const canVerify = ['admin_tu', 'kepala_sekolah', 'wakasek', 'staf_agenda'].includes(
    currentUser.role
  );

  const activeSkp = useMemo(() => {
    return skpRecords.find(r => r.id === selectedSkpId) || skpRecords[0] || null;
  }, [skpRecords, selectedSkpId]);

  useEffect(() => {
    if (!activeSkp && skpRecords[0]) {
      setSelectedSkpId(skpRecords[0].id);
    }
  }, [activeSkp, skpRecords]);

  // Flat list of evidence for prev/next navigation in reader
  const flatEvidenceList = useMemo<ActiveEvidenceSelection[]>(() => {
    if (!activeSkp) return [];
    const list: ActiveEvidenceSelection[] = [];
    activeSkp.rhkList.forEach(rhk => {
      rhk.buktiDukungList.forEach(bukti => {
        list.push({
          rhkId: rhk.id,
          rhkTitle: rhk.rencanaHasilKerja,
          bukti
        });
      });
    });
    return list;
  }, [activeSkp]);

  // Auto-select first evidence when switching SKP
  useEffect(() => {
    if (!activeSkp) {
      setSelectedEvidenceRef(null);
      return;
    }
    const stillExists =
      selectedEvidenceRef &&
      flatEvidenceList.some(
        e =>
          e.rhkId === selectedEvidenceRef.rhkId &&
          e.bukti.id === selectedEvidenceRef.buktiId
      );
    if (!stillExists) {
      const first = flatEvidenceList[0];
      setSelectedEvidenceRef(
        first ? { rhkId: first.rhkId, buktiId: first.bukti.id } : null
      );
    }
  }, [activeSkp?.id, flatEvidenceList]);

  const activeEvidenceIndex = useMemo(() => {
    if (!selectedEvidenceRef) return -1;
    return flatEvidenceList.findIndex(
      e =>
        e.rhkId === selectedEvidenceRef.rhkId &&
        e.bukti.id === selectedEvidenceRef.buktiId
    );
  }, [flatEvidenceList, selectedEvidenceRef]);

  const activeEvidenceSelection =
    activeEvidenceIndex >= 0 ? flatEvidenceList[activeEvidenceIndex] : null;

  // Persist helper
  const commitSkpRecords = (next: SkpDocumentRecord[]) => {
    setSkpRecords(next);
    saveStoredSkpRecords(next);
  };

  const updateActiveSkp = (updater: (prev: SkpDocumentRecord) => SkpDocumentRecord) => {
    if (!activeSkp) return;
    const updated = {
      ...updater(activeSkp),
      updatedAt: new Date().toISOString()
    };
    const nextList = skpRecords.map(r => (r.id === updated.id ? updated : r));
    commitSkpRecords(nextList);
  };

  // Active Guru & Tendik combined options
  const activeGtkOptions = useMemo(() => {
    const gOpts = guruList
      .filter(g => !g.statusAktif || g.statusAktif === 'Aktif')
      .map(g => ({
        key: `guru:${g.id}`,
        sourceType: 'guru' as const,
        data: g,
        label: `${g.nama} — Guru (${g.mataPelajaran || g.mapel || g.jabatan})`
      }));
    const tOpts = tendikList
      .filter(t => !t.statusAktif || t.statusAktif === 'Aktif')
      .map(t => ({
        key: `tendik:${t.id}`,
        sourceType: 'tendik' as const,
        data: t,
        label: `${t.nama} — Tendik (${t.jenisPtk || t.jabatan})`
      }));
    return [...gOpts, ...tOpts];
  }, [guruList, tendikList]);

  // Summary metrics for active SKP
  const skpSummary = useMemo(() => {
    if (!activeSkp) {
      return {
        rhkCount: 0,
        totalBukti: 0,
        validBukti: 0,
        perluPerbaikan: 0,
        avgCapaian: 0
      };
    }
    let totalBukti = 0;
    let validBukti = 0;
    let perluPerbaikan = 0;
    let capaianSum = 0;
    let indCount = 0;

    activeSkp.rhkList.forEach(rhk => {
      rhk.indikatorList.forEach(ind => {
        capaianSum += Number(ind.capaianPersen) || 0;
        indCount++;
      });
      rhk.buktiDukungList.forEach(b => {
        totalBukti++;
        if (b.statusVerifikasi === 'Terbaca & Valid') validBukti++;
        if (b.statusVerifikasi === 'Perlu Perbaikan') perluPerbaikan++;
      });
    });

    return {
      rhkCount: activeSkp.rhkList.length,
      totalBukti,
      validBukti,
      perluPerbaikan,
      avgCapaian: indCount > 0 ? Math.round(capaianSum / indCount) : 0
    };
  }, [activeSkp]);

  // Create New SKP Document
  const handleCreateNewSkp = (e: React.FormEvent) => {
    e.preventDefault();
    let pegawaiNama = newSkpManualNama.trim();
    let pegawaiNip = newSkpManualNip.trim() || '-';
    let pegawaiPangkatGol = 'Penata / III-c';
    let pegawaiJabatan = newSkpManualJabatan.trim() || 'Guru / Staf Sekolah';
    let sourceType: 'guru' | 'tendik' | 'manual' = newSkpManualRole;
    let sourceId: string | undefined;

    if (newSkpGtkKey && newSkpGtkKey !== 'manual') {
      const found = activeGtkOptions.find(o => o.key === newSkpGtkKey);
      if (found) {
        sourceType = found.sourceType;
        sourceId = found.data.id;
        pegawaiNama = found.data.nama;
        pegawaiNip = found.data.nip || '-';
        pegawaiPangkatGol = found.data.pangkatGolongan || '-';
        pegawaiJabatan =
          found.sourceType === 'guru'
            ? `${found.data.jenisPtk || 'Guru'} ${found.data.mataPelajaran || found.data.mapel || ''}`.trim()
            : found.data.jenisPtk || found.data.jabatan || 'Tendik';
      }
    }

    if (!pegawaiNama) {
      setFeedback({ type: 'error', text: 'Pilih pegawai atau isi nama pegawai terlebih dahulu.' });
      return;
    }

    const newRecord: SkpDocumentRecord = {
      id: `skp-${Date.now()}`,
      pegawaiSourceType: sourceType,
      pegawaiSourceId: sourceId,
      pegawaiNama,
      pegawaiNip,
      pegawaiPangkatGol,
      pegawaiJabatan,
      pegawaiUnitKerja: profile.namaSekolah || 'SMAN 9 Surabaya',
      penilaiNama: profile.kepalaSekolah || 'Kepala SMAN 9 Surabaya',
      penilaiNip: profile.nipKepalaSekolah || '-',
      penilaiPangkatGol: profile.pangkatKepsek || 'Pembina Utama Muda / IV-c',
      penilaiJabatan: 'Kepala Sekolah',
      penilaiUnitKerja: profile.namaSekolah || 'SMAN 9 Surabaya',
      tahun: newSkpTahun,
      periode: newSkpPeriode.trim() || `1 Januari s.d. 31 Desember ${newSkpTahun}`,
      pendekatan: 'Kuantitatif',
      ratingHasilKerja: 'Sesuai Ekspektasi',
      ratingPerilaku: 'Sesuai Ekspektasi',
      predikatKinerja: 'Baik',
      rhkList: buildTemplateRhksForRole(sourceType, newSkpTahun),
      perilakuList: DEFAULT_BERAKHLAK_LIST.map(p => ({ ...p })),
      updatedAt: new Date().toISOString()
    };

    const nextList = [newRecord, ...skpRecords];
    commitSkpRecords(nextList);
    setSelectedSkpId(newRecord.id);
    setIsNewSkpModalOpen(false);
    setNewSkpGtkKey('');
    setNewSkpManualNama('');
    setNewSkpManualNip('');
    setNewSkpManualJabatan('');
    appendAuditLog('TAMBAH_SKP', `Membuat dokumen SKP ${newRecord.tahun} untuk ${newRecord.pegawaiNama}.`);
    setFeedback({
      type: 'success',
      text: `Dokumen SKP "${newRecord.pegawaiNama}" (${newRecord.tahun}) berhasil dibuat beserta template RHK.`
    });
  };

  const handleDeleteSkp = async (skpId: string) => {
    const target = skpRecords.find(r => r.id === skpId);
    if (!target) return;

    // Cleanup IndexedDB blobs for evidence inside deleted SKP
    for (const rhk of target.rhkList) {
      for (const b of rhk.buktiDukungList) {
        if (b.hasBinaryBlob) {
          await deleteSkpEvidenceFile(b.id);
        }
      }
    }

    const nextList = skpRecords.filter(r => r.id !== skpId);
    commitSkpRecords(nextList);
    setConfirmDeleteSkpId(null);
    setSelectedSkpId(nextList[0]?.id || '');
    appendAuditLog('HAPUS_SKP', `Menghapus dokumen SKP ${target.pegawaiNama} (${target.tahun}).`);
    setFeedback({
      type: 'info',
      text: `Dokumen SKP "${target.pegawaiNama}" telah dihapus.`
    });
  };

  // Save RHK Modal
  const openRhkModal = (rhk?: SkpRhkItem) => {
    if (rhk) {
      setRhkModal({
        editingId: rhk.id,
        jenis: rhk.jenis,
        rhkAtasan: rhk.rhkAtasan,
        rencanaHasilKerja: rhk.rencanaHasilKerja,
        periodeLabel: rhk.periodeLabel,
        indikatorList: rhk.indikatorList.map(i => ({ ...i })),
        error: ''
      });
    } else {
      setRhkModal({
        editingId: null,
        jenis: 'Utama',
        rhkAtasan: 'Terselenggaranya layanan pendidikan/administrasi bermutu di SMAN 9 Surabaya.',
        rencanaHasilKerja: '',
        periodeLabel: `Tahun ${activeSkp?.tahun || 2026}`,
        indikatorList: [
          {
            id: `ind-${Date.now()}`,
            aspek: 'Kuantitas',
            indikator: '',
            target: '1 Laporan',
            realisasi: '1 Laporan',
            capaianPersen: 100
          }
        ],
        error: ''
      });
    }
  };

  const handleSaveRhk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rhkModal || !activeSkp) return;
    if (!rhkModal.rencanaHasilKerja.trim()) {
      setRhkModal(prev =>
        prev ? { ...prev, error: 'Rencana Hasil Kerja wajib diisi.' } : prev
      );
      return;
    }

    const cleanIndicators = rhkModal.indikatorList
      .filter(i => i.indikator.trim())
      .map(i => ({
        ...i,
        indikator: i.indikator.trim(),
        target: i.target.trim() || '-',
        realisasi: i.realisasi.trim() || '-'
      }));

    if (rhkModal.editingId) {
      updateActiveSkp(prev => ({
        ...prev,
        rhkList: prev.rhkList.map(r =>
          r.id === rhkModal.editingId
            ? {
                ...r,
                jenis: rhkModal.jenis,
                rhkAtasan: rhkModal.rhkAtasan.trim(),
                rencanaHasilKerja: rhkModal.rencanaHasilKerja.trim(),
                periodeLabel: rhkModal.periodeLabel.trim() || `Tahun ${prev.tahun}`,
                indikatorList: cleanIndicators
              }
            : r
        )
      }));
      setFeedback({ type: 'success', text: 'RHK & indikator kinerja diperbarui.' });
    } else {
      const newRhk: SkpRhkItem = {
        id: `rhk-${Date.now()}`,
        jenis: rhkModal.jenis,
        rhkAtasan: rhkModal.rhkAtasan.trim() || '-',
        rencanaHasilKerja: rhkModal.rencanaHasilKerja.trim(),
        periodeLabel: rhkModal.periodeLabel.trim() || `Tahun ${activeSkp.tahun}`,
        indikatorList: cleanIndicators,
        buktiDukungList: []
      };
      updateActiveSkp(prev => ({
        ...prev,
        rhkList: [...prev.rhkList, newRhk]
      }));
      setFeedback({ type: 'success', text: 'RHK baru ditambahkan ke SKP.' });
    }
    setRhkModal(null);
  };

  const handleDeleteRhk = async (rhkId: string) => {
    if (!activeSkp) return;
    const targetRhk = activeSkp.rhkList.find(r => r.id === rhkId);
    if (targetRhk) {
      for (const b of targetRhk.buktiDukungList) {
        if (b.hasBinaryBlob) await deleteSkpEvidenceFile(b.id);
      }
    }
    updateActiveSkp(prev => ({
      ...prev,
      rhkList: prev.rhkList.filter(r => r.id !== rhkId)
    }));
    setFeedback({ type: 'info', text: 'RHK beserta bukti dukungnya dihapus.' });
  };

  // Bukti Dukung Modal Handlers
  const openAddBuktiModal = (rhkId: string) => {
    setBuktiModal({
      rhkId,
      editingBuktiId: null,
      judul: '',
      ringkasanIsi: '',
      kategori: 'Laporan Kegiatan',
      nomorDokumen: '',
      tanggalDokumen: new Date().toISOString().slice(0, 10),
      inputMethod: 'file',
      externalUrl: '',
      teksNarasi: '',
      pendingFile: null,
      detectedFileType: 'pdf',
      error: ''
    });
  };

  const openEditBuktiModal = (rhkId: string, b: SkpBuktiDukungItem) => {
    setBuktiModal({
      rhkId,
      editingBuktiId: b.id,
      judul: b.judul,
      ringkasanIsi: b.ringkasanIsi,
      kategori: b.kategori,
      nomorDokumen: b.nomorDokumen || '',
      tanggalDokumen: b.tanggalDokumen || new Date().toISOString().slice(0, 10),
      inputMethod:
        b.jenisFile === 'link' ? 'link' : b.jenisFile === 'text' && !b.hasBinaryBlob ? 'text' : 'file',
      externalUrl: b.externalUrl || '',
      teksNarasi: b.teksNarasi || '',
      pendingFile: null,
      detectedFileType: b.jenisFile,
      error: ''
    });
  };

  const handleSaveBuktiDukung = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buktiModal || !activeSkp) return;

    if (!buktiModal.judul.trim()) {
      setBuktiModal(prev =>
        prev ? { ...prev, error: 'Judul bukti dukung wajib diisi agar mudah dibaca.' } : prev
      );
      return;
    }

    if (!buktiModal.ringkasanIsi.trim()) {
      setBuktiModal(prev =>
        prev
          ? {
              ...prev,
              error: 'Tuliskan intisari/ringkasan isi dokumen (1-2 kalimat) agar penilai langsung memahami isi bukti.'
            }
          : prev
      );
      return;
    }

    if (buktiModal.inputMethod === 'link' && !buktiModal.externalUrl.trim()) {
      setBuktiModal(prev =>
        prev ? { ...prev, error: 'Masukkan tautan Google Drive / Docs / e-Kinerja.' } : prev
      );
      return;
    }

    if (buktiModal.inputMethod === 'text' && !buktiModal.teksNarasi.trim()) {
      setBuktiModal(prev =>
        prev ? { ...prev, error: 'Tuliskan isi teks dokumen / laporan singkat.' } : prev
      );
      return;
    }

    if (
      buktiModal.inputMethod === 'file' &&
      !buktiModal.editingBuktiId &&
      !buktiModal.pendingFile
    ) {
      setBuktiModal(prev =>
        prev
          ? {
              ...prev,
              error: 'Pilih berkas (PDF, Gambar, Excel, atau Teks) atau ubah metode menjadi Teks / Tautan.'
            }
          : prev
      );
      return;
    }

    const buktiId = buktiModal.editingBuktiId || `bukti-${Date.now()}`;
    let fileMeta: {
      fileName?: string;
      mimeType?: string;
      fileSizeBytes?: number;
      hasBinaryBlob?: boolean;
      jenisFile: SkpBuktiFileType;
    } = {
      jenisFile:
        buktiModal.inputMethod === 'link'
          ? 'link'
          : buktiModal.inputMethod === 'text'
          ? 'text'
          : buktiModal.detectedFileType
    };

    if (buktiModal.inputMethod === 'file' && buktiModal.pendingFile) {
      const saved = await saveSkpEvidenceFile(buktiId, buktiModal.pendingFile);
      fileMeta = {
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        fileSizeBytes: saved.sizeBytes,
        hasBinaryBlob: true,
        jenisFile: detectSkpFileType(saved.fileName || saved.mimeType)
      };
    }

    const nowIso = new Date().toISOString();

    updateActiveSkp(prev => ({
      ...prev,
      rhkList: prev.rhkList.map(rhk => {
        if (rhk.id !== buktiModal.rhkId) return rhk;

        if (buktiModal.editingBuktiId) {
          return {
            ...rhk,
            buktiDukungList: rhk.buktiDukungList.map(old =>
              old.id === buktiModal.editingBuktiId
                ? {
                    ...old,
                    judul: buktiModal.judul.trim(),
                    ringkasanIsi: buktiModal.ringkasanIsi.trim(),
                    kategori: buktiModal.kategori,
                    nomorDokumen: buktiModal.nomorDokumen.trim() || undefined,
                    tanggalDokumen: buktiModal.tanggalDokumen,
                    jenisFile:
                      buktiModal.inputMethod === 'file' && !buktiModal.pendingFile
                        ? old.jenisFile
                        : fileMeta.jenisFile,
                    fileName: fileMeta.fileName ?? old.fileName,
                    mimeType: fileMeta.mimeType ?? old.mimeType,
                    fileSizeBytes: fileMeta.fileSizeBytes ?? old.fileSizeBytes,
                    hasBinaryBlob: fileMeta.hasBinaryBlob ?? old.hasBinaryBlob,
                    externalUrl:
                      buktiModal.inputMethod === 'link'
                        ? buktiModal.externalUrl.trim()
                        : undefined,
                    teksNarasi:
                      buktiModal.inputMethod === 'text' || buktiModal.inputMethod === 'link'
                        ? buktiModal.teksNarasi.trim() || undefined
                        : undefined
                  }
                : old
            )
          };
        }

        const newItem: SkpBuktiDukungItem = {
          id: buktiId,
          judul: buktiModal.judul.trim(),
          ringkasanIsi: buktiModal.ringkasanIsi.trim(),
          kategori: buktiModal.kategori,
          nomorDokumen: buktiModal.nomorDokumen.trim() || undefined,
          tanggalDokumen: buktiModal.tanggalDokumen,
          jenisFile: fileMeta.jenisFile,
          fileName: fileMeta.fileName,
          mimeType: fileMeta.mimeType,
          fileSizeBytes: fileMeta.fileSizeBytes,
          hasBinaryBlob: fileMeta.hasBinaryBlob,
          externalUrl:
            buktiModal.inputMethod === 'link'
              ? buktiModal.externalUrl.trim()
              : undefined,
          teksNarasi:
            buktiModal.inputMethod === 'text' || buktiModal.inputMethod === 'link'
              ? buktiModal.teksNarasi.trim() || undefined
              : undefined,
          statusVerifikasi: 'Belum Diperiksa',
          uploadedAt: nowIso
        };

        return {
          ...rhk,
          buktiDukungList: [...rhk.buktiDukungList, newItem]
        };
      })
    }));

    setSelectedEvidenceRef({ rhkId: buktiModal.rhkId, buktiId });
    setBuktiModal(null);
    appendAuditLog(
      'BUKTI_SKP',
      `Menyimpan bukti dukung SKP "${buktiModal.judul.trim()}" untuk ${activeSkp.pegawaiNama}.`
    );
    setFeedback({
      type: 'success',
      text: `Bukti dukung "${buktiModal.judul.trim()}" tersimpan dan langsung dibuka di panel pembaca.`
    });
  };

  const handleDeleteBukti = async (rhkId: string, bukti: SkpBuktiDukungItem) => {
    if (bukti.hasBinaryBlob) {
      await deleteSkpEvidenceFile(bukti.id);
    }
    updateActiveSkp(prev => ({
      ...prev,
      rhkList: prev.rhkList.map(r =>
        r.id === rhkId
          ? { ...r, buktiDukungList: r.buktiDukungList.filter(b => b.id !== bukti.id) }
          : r
      )
    }));
    setFeedback({
      type: 'info',
      text: `Bukti dukung "${bukti.judul}" dihapus.`
    });
  };

  const handleUpdateEvidenceVerification = (
    rhkId: string,
    buktiId: string,
    status: SkpStatusVerifikasi,
    catatanPenilai: string
  ) => {
    updateActiveSkp(prev => ({
      ...prev,
      rhkList: prev.rhkList.map(r =>
        r.id === rhkId
          ? {
              ...r,
              buktiDukungList: r.buktiDukungList.map(b =>
                b.id === buktiId
                  ? {
                      ...b,
                      statusVerifikasi: status,
                      catatanPenilai: catatanPenilai.trim() || undefined
                    }
                  : b
              )
            }
          : r
      )
    }));
    setFeedback({
      type: 'success',
      text: `Status verifikasi bukti dukung disimpan: ${status}.`
    });
  };

  // Inline AI helper inside Tambah/Edit RHK Modal
  const handleInlineAiRhkAssist = async () => {
    if (!rhkModal || !activeSkp) return;
    setIsInlineAiRhkLoading(true);
    try {
      const response = await fetch('/api/ai/skp-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate_rhk',
          pegawaiNama: activeSkp.pegawaiNama,
          pegawaiJabatan: activeSkp.pegawaiJabatan,
          pegawaiPangkatGol: activeSkp.pegawaiPangkatGol,
          pegawaiRoleType: activeSkp.pegawaiSourceType,
          tahun: activeSkp.tahun,
          jenisRhk: rhkModal.jenis,
          deskripsiTugas:
            rhkModal.rencanaHasilKerja.trim() ||
            rhkModal.rhkAtasan.trim() ||
            `Tugas ${rhkModal.jenis.toLowerCase()} ${activeSkp.pegawaiJabatan}`
        })
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.result) {
        throw new Error(data?.message || 'Gagal merumuskan RHK dengan AI.');
      }
      const res = data.result;
      const now = Date.now();
      const mappedIndikators: SkpIndikatorKinerja[] = Array.isArray(res.indikatorList)
        ? res.indikatorList.map((ind: any, idx: number) => ({
            id: `ind-${now}-${idx}`,
            aspek:
              ind.aspek === 'Kualitas' || ind.aspek === 'Waktu' || ind.aspek === 'Biaya'
                ? ind.aspek
                : 'Kuantitas',
            indikator: ind.indikator || '',
            target: ind.target || '100%',
            realisasi: ind.realisasi || '100%',
            capaianPersen: Number(ind.capaianPersen) || 100
          }))
        : rhkModal.indikatorList;

      setRhkModal(prev =>
        prev
          ? {
              ...prev,
              rhkAtasan: res.rhkAtasan || prev.rhkAtasan,
              rencanaHasilKerja: res.rencanaHasilKerja || prev.rencanaHasilKerja,
              periodeLabel: res.periodeLabel || prev.periodeLabel,
              indikatorList: mappedIndikators,
              error: ''
            }
          : prev
      );
    } catch (err: any) {
      setRhkModal(prev =>
        prev
          ? { ...prev, error: err?.message || 'Gagal menghubungi Asisten AI.' }
          : prev
      );
    } finally {
      setIsInlineAiRhkLoading(false);
    }
  };

  // Inline AI helper inside Upload/Tambah Bukti Dukung Modal
  const handleInlineAiBuktiAssist = async () => {
    if (!buktiModal || !activeSkp) return;
    setIsInlineAiBuktiLoading(true);
    try {
      const targetRhk = activeSkp.rhkList.find(r => r.id === buktiModal.rhkId);
      const response = await fetch('/api/ai/skp-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'draft_bukti',
          pegawaiNama: activeSkp.pegawaiNama,
          pegawaiJabatan: activeSkp.pegawaiJabatan,
          pegawaiPangkatGol: activeSkp.pegawaiPangkatGol,
          pegawaiRoleType: activeSkp.pegawaiSourceType,
          tahun: activeSkp.tahun,
          rhkTitle: targetRhk?.rencanaHasilKerja || 'Pelaksanaan tugas pokok SKP',
          kategoriBukti: buktiModal.kategori,
          catatanKegiatan:
            [buktiModal.judul, buktiModal.ringkasanIsi, buktiModal.teksNarasi]
              .map(s => s.trim())
              .filter(Boolean)
              .join(' — ') ||
            `Bukti dukung ${buktiModal.kategori} untuk ${targetRhk?.rencanaHasilKerja || 'SKP'}`
        })
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.result) {
        throw new Error(data?.message || 'Gagal menyusun naskah bukti dukung.');
      }
      const res = data.result;
      const matchedKategori =
        BUKTI_KATEGORI_LIST.find(
          k => k.toLowerCase() === String(res.kategori || '').toLowerCase()
        ) || buktiModal.kategori;

      setBuktiModal(prev =>
        prev
          ? {
              ...prev,
              judul: res.judul || prev.judul,
              kategori: matchedKategori,
              ringkasanIsi: res.ringkasanIsi || prev.ringkasanIsi,
              teksNarasi: res.teksNarasi || prev.teksNarasi,
              inputMethod:
                prev.inputMethod === 'file' && !prev.pendingFile ? 'text' : prev.inputMethod,
              error: ''
            }
          : prev
      );
    } catch (err: any) {
      setBuktiModal(prev =>
        prev
          ? { ...prev, error: err?.message || 'Gagal menghubungi Asisten AI.' }
          : prev
      );
    } finally {
      setIsInlineAiBuktiLoading(false);
    }
  };

  // Filtered RHK & Bukti view
  const filteredRhks = useMemo(() => {
    if (!activeSkp) return [];
    const q = searchBukti.trim().toLowerCase();
    return activeSkp.rhkList.map(rhk => {
      const rhkMatches =
        !q ||
        rhk.rencanaHasilKerja.toLowerCase().includes(q) ||
        rhk.rhkAtasan.toLowerCase().includes(q);
      const filteredBukti = rhk.buktiDukungList.filter(b => {
        const matchStatus =
          filterStatusVerif === 'SEMUA' || b.statusVerifikasi === filterStatusVerif;
        const matchText =
          !q ||
          rhkMatches ||
          b.judul.toLowerCase().includes(q) ||
          b.ringkasanIsi.toLowerCase().includes(q) ||
          (b.nomorDokumen || '').toLowerCase().includes(q);
        return matchStatus && matchText;
      });
      return {
        rhk,
        filteredBukti,
        showRhk: rhkMatches || filteredBukti.length > 0
      };
    });
  }, [activeSkp, searchBukti, filterStatusVerif]);

  const ttdKsSrc = resolveDirectImageUrl(fallbackTtdKsUrl || '');
  const stempelSrc = resolveDirectImageUrl(fallbackStempelUrl || '');

  const getBuktiTypeIcon = (type: SkpBuktiFileType) => {
    if (type === 'image') return <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    if (type === 'excel') return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />;
    if (type === 'link') return <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    return <FileText className="w-3.5 h-3.5 text-blue-700 shrink-0" />;
  };

  return (
    <div className="space-y-5">
      {/* Header & Pegawai Switcher */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Sasaran Kinerja Pegawai (SKP) & Pembaca Bukti Dukung
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Kelola Rencana Hasil Kerja, indikator capaian, perilaku BerAKHLAK, serta baca langsung bukti dukung PDF, gambar scan, Excel, atau tautan Drive tanpa mengunduh terpisah.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeSkp && (
              <>
                <button
                  type="button"
                  onClick={() => exportSkpDocumentToExcel(activeSkp)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel SKP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceMode('cetak_resmi');
                    setTimeout(() => window.print(), 150);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak SKP</span>
                </button>
              </>
            )}

            {activeSkp && canEdit && (
              <button
                type="button"
                onClick={() =>
                  setAiAssistModal({ open: true, mode: 'generate_rhk' })
                }
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Asisten AI SKP</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsNewSkpModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat SKP Pegawai</span>
              </button>
            )}
          </div>
        </div>

        {/* Pegawai Selector & Segmented Mode Switcher */}
        <div className="pt-3 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <label className="text-xs font-semibold text-slate-600 shrink-0">
              Dokumen SKP:
            </label>
            <select
              value={activeSkp?.id || ''}
              onChange={e => setSelectedSkpId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-semibold text-slate-900 max-w-md w-full sm:w-auto"
            >
              {skpRecords.length === 0 ? (
                <option value="">Belum ada dokumen SKP</option>
              ) : (
                skpRecords.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.pegawaiNama} — {r.tahun} ({r.predikatKinerja})
                  </option>
                ))
              )}
            </select>

            {activeSkp && canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIdentityDraft({ ...activeSkp });
                    setIsEditIdentityOpen(true);
                  }}
                  className="px-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1"
                  title="Ubah identitas pegawai & pejabat penilai"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Identitas</span>
                </button>

                {confirmDeleteSkpId === activeSkp.id ? (
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded px-2 py-1 text-xs">
                    <span className="text-rose-800 font-semibold">Hapus SKP ini?</span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSkp(activeSkp.id)}
                      className="px-2 py-0.5 bg-rose-600 text-white rounded font-semibold"
                    >
                      Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSkpId(null)}
                      className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded"
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteSkpId(activeSkp.id)}
                    className="p-1.5 border border-slate-200 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Hapus Dokumen SKP"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>

          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setWorkspaceMode('rhk_bukti')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                workspaceMode === 'rhk_bukti'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              RHK & Pembaca Bukti
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('evaluasi_berakhlak')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                workspaceMode === 'evaluasi_berakhlak'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Evaluasi & BerAKHLAK
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('cetak_resmi')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                workspaceMode === 'cetak_resmi'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pratinjau & Cetak Resmi
            </button>
          </div>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`no-print flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!activeSkp ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Belum Ada Dokumen SKP</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Mulai dengan membuat dokumen SKP baru dari daftar Guru atau Tendik SMAN 9 Surabaya.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsNewSkpModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Buat SKP Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Ringkasan Identitas & Capaian SKP */}
          <div className="no-print bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="md:col-span-2 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pegawai yang Dinilai
              </div>
              <div className="text-sm font-bold text-slate-900">
                {activeSkp.pegawaiNama}
              </div>
              <div className="text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-mono tabular-nums">NIP {activeSkp.pegawaiNip || '-'}</span>
                <span aria-hidden="true">·</span>
                <span>{activeSkp.pegawaiPangkatGol || '-'}</span>
                <span aria-hidden="true">·</span>
                <span>{activeSkp.pegawaiJabatan}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pejabat Penilai & Periode
              </div>
              <div className="font-bold text-slate-900">{activeSkp.penilaiNama}</div>
              <div className="text-slate-600 tabular-nums">
                {activeSkp.periode}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Ringkasan Bukti & Predikat
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-slate-900 tabular-nums">
                  {activeSkp.predikatKinerja}
                </span>
                <span className="text-slate-500 tabular-nums">
                  ({skpSummary.avgCapaian}% capaian)
                </span>
              </div>
              <div className="text-slate-600 tabular-nums">
                {skpSummary.rhkCount} RHK · {skpSummary.validBukti}/{skpSummary.totalBukti} bukti valid
                {skpSummary.perluPerbaikan > 0 ? ` · ${skpSummary.perluPerbaikan} perlu perbaikan` : ''}
              </div>
            </div>
          </div>

          {/* MODE 1: RHK & PEMBACA BUKTI DUKUNG (SPLIT VIEW) */}
          {workspaceMode === 'rhk_bukti' && (
            <div className="no-print grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* Left Column: RHK Cards + Evidence List */}
              <div className="xl:col-span-6 space-y-4">
                {/* Filter & Tambah RHK Bar */}
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={searchBukti}
                      onChange={e => setSearchBukti(e.target.value)}
                      placeholder="Cari RHK, judul bukti, nomor dokumen..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                  <select
                    value={filterStatusVerif}
                    onChange={e =>
                      setFilterStatusVerif(
                        e.target.value as 'SEMUA' | SkpStatusVerifikasi
                      )
                    }
                    className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
                  >
                    <option value="SEMUA">Semua Status Bukti</option>
                    <option value="Terbaca & Valid">Terbaca & Valid</option>
                    <option value="Belum Diperiksa">Belum Diperiksa</option>
                    <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                  </select>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openRhkModal()}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah RHK</span>
                    </button>
                  )}
                </div>

                {/* Daftar RHK */}
                {filteredRhks.filter(x => x.showRhk).length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-500">
                    Tidak ada RHK atau bukti dukung yang cocok dengan filter pencarian.
                  </div>
                ) : (
                  filteredRhks
                    .filter(x => x.showRhk)
                    .map(({ rhk, filteredBukti }, rhkIdx) => (
                      <div
                        key={rhk.id}
                        className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                      >
                        {/* RHK Header */}
                        <div className="p-4 border-b border-slate-100 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="text-[11px] text-slate-500 font-medium">
                                <span className="font-bold text-slate-800">
                                  {String(rhkIdx + 1).padStart(2, '0')}. RHK {rhk.jenis}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span>{rhk.periodeLabel}</span>
                              </div>
                              <h3 className="text-[13.5px] font-bold text-slate-900 leading-snug">
                                {rhk.rencanaHasilKerja}
                              </h3>
                              <p className="text-[11.5px] text-slate-500">
                                Intervensi RHK Pimpinan: {rhk.rhkAtasan}
                              </p>
                            </div>
                            {canEdit && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openRhkModal(rhk)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Ubah RHK & Indikator"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteRhk(rhk.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Hapus RHK"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Indikator Ringkas */}
                          {rhk.indikatorList.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                              {rhk.indikatorList.map(ind => (
                                <div
                                  key={ind.id}
                                  className="grid grid-cols-12 gap-2 text-[11.5px] items-baseline"
                                >
                                  <div className="col-span-2 font-semibold text-slate-500">
                                    {ind.aspek}
                                  </div>
                                  <div className="col-span-6 text-slate-800">
                                    {ind.indikator}
                                  </div>
                                  <div className="col-span-4 text-right font-mono text-slate-700 tabular-nums">
                                    {ind.realisasi} / {ind.target} ({ind.capaianPersen}%)
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Daftar Bukti Dukung untuk RHK ini */}
                        <div className="p-4 bg-slate-50/40 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 tabular-nums">
                              Bukti Dukung ({filteredBukti.length})
                            </span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openAddBuktiModal(rhk.id)}
                                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3" />
                                <span>Unggah / Tambah Bukti</span>
                              </button>
                            )}
                          </div>

                          {filteredBukti.length === 0 ? (
                            <div className="py-4 px-3 bg-white border border-dashed border-slate-200 rounded text-center text-xs text-slate-400">
                              Belum ada bukti dukung untuk RHK ini.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {filteredBukti.map(b => {
                                const isSelected =
                                  selectedEvidenceRef?.rhkId === rhk.id &&
                                  selectedEvidenceRef?.buktiId === b.id;
                                const verifClass =
                                  b.statusVerifikasi === 'Terbaca & Valid'
                                    ? 'text-emerald-700'
                                    : b.statusVerifikasi === 'Perlu Perbaikan'
                                    ? 'text-rose-700'
                                    : 'text-amber-700';
                                return (
                                  <div
                                    key={b.id}
                                    onClick={() =>
                                      setSelectedEvidenceRef({
                                        rhkId: rhk.id,
                                        buktiId: b.id
                                      })
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedEvidenceRef({
                                          rhkId: rhk.id,
                                          buktiId: b.id
                                        });
                                      }
                                    }}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors space-y-1.5 ${
                                      isSelected
                                        ? 'bg-blue-50/70 border-blue-400 ring-1 ring-blue-200'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2 min-w-0">
                                        <div className="mt-0.5">{getBuktiTypeIcon(b.jenisFile)}</div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-slate-900 leading-snug">
                                            {b.judul}
                                          </div>
                                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                                            <span>{b.kategori}</span>
                                            <span aria-hidden="true">·</span>
                                            <span className="font-mono tabular-nums">
                                              {b.tanggalDokumen || '-'}
                                            </span>
                                            {b.nomorDokumen && (
                                              <>
                                                <span aria-hidden="true">·</span>
                                                <span className="font-mono">{b.nomorDokumen}</span>
                                              </>
                                            )}
                                            <span aria-hidden="true">·</span>
                                            <span className={`font-semibold ${verifClass}`}>
                                              {b.statusVerifikasi}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div
                                        className="flex items-center gap-1 shrink-0"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedEvidenceRef({
                                              rhkId: rhk.id,
                                              buktiId: b.id
                                            })
                                          }
                                          className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1"
                                          title="Baca Bukti Dukung"
                                        >
                                          <Eye className="w-3 h-3" />
                                          <span>Baca</span>
                                        </button>
                                        {canEdit && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => openEditBuktiModal(rhk.id, b)}
                                              className="p-1 text-slate-500 hover:text-blue-600 rounded"
                                              title="Ubah Keterangan Bukti"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => void handleDeleteBukti(rhk.id, b)}
                                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                              title="Hapus Bukti"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <p className="text-[11.5px] text-slate-700 leading-relaxed pl-5">
                                      {b.ringkasanIsi}
                                    </p>

                                    {b.catatanPenilai && (
                                      <p className="text-[11px] text-slate-600 pl-5 italic">
                                        Catatan penilai: {b.catatanPenilai}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Right Column: Sticky High-Legibility Document Reader */}
              <div className="xl:col-span-6 xl:sticky xl:top-4">
                <SkpEvidenceReaderPanel
                  selection={activeEvidenceSelection}
                  currentIndex={activeEvidenceIndex}
                  totalCount={flatEvidenceList.length}
                  onPrev={() => {
                    if (activeEvidenceIndex > 0) {
                      const prevItem = flatEvidenceList[activeEvidenceIndex - 1];
                      setSelectedEvidenceRef({
                        rhkId: prevItem.rhkId,
                        buktiId: prevItem.bukti.id
                      });
                    }
                  }}
                  onNext={() => {
                    if (
                      activeEvidenceIndex >= 0 &&
                      activeEvidenceIndex < flatEvidenceList.length - 1
                    ) {
                      const nextItem = flatEvidenceList[activeEvidenceIndex + 1];
                      setSelectedEvidenceRef({
                        rhkId: nextItem.rhkId,
                        buktiId: nextItem.bukti.id
                      });
                    }
                  }}
                  isFullscreen={isReaderFullscreen}
                  onToggleFullscreen={() => setIsReaderFullscreen(f => !f)}
                  canVerify={canVerify}
                  onUpdateVerification={handleUpdateEvidenceVerification}
                />
              </div>
            </div>
          )}

          {/* MODE 2: EVALUASI & PERILAKU BERAKHLAK */}
          {workspaceMode === 'evaluasi_berakhlak' && (
            <div className="no-print space-y-5">
              {/* Rating Kuadran PermenPANRB 6/2022 */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Penilaian & Predikat Kinerja Pegawai (PermenPANRB 6/2022)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tentukan rating Hasil Kerja dan Perilaku Kerja BerAKHLAK untuk menghasilkan Predikat Kinerja secara otomatis.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Predikat Kinerja Akhir
                    </div>
                    <div className="text-lg font-extrabold text-blue-900">
                      {activeSkp.predikatKinerja}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Rating Hasil Kerja (RHK & Bukti Dukung)
                    </label>
                    <select
                      value={activeSkp.ratingHasilKerja}
                      disabled={!canVerify}
                      onChange={e => {
                        const ratingHasilKerja = e.target.value as SkpRatingLevel;
                        updateActiveSkp(prev => ({
                          ...prev,
                          ratingHasilKerja,
                          predikatKinerja: computeSkpPredikatKinerja(
                            ratingHasilKerja,
                            prev.ratingPerilaku
                          )
                        }));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="Diatas Ekspektasi">Diatas Ekspektasi</option>
                      <option value="Sesuai Ekspektasi">Sesuai Ekspektasi</option>
                      <option value="Dibawah Ekspektasi">Dibawah Ekspektasi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Rating Perilaku Kerja (BerAKHLAK)
                    </label>
                    <select
                      value={activeSkp.ratingPerilaku}
                      disabled={!canVerify}
                      onChange={e => {
                        const ratingPerilaku = e.target.value as SkpRatingLevel;
                        updateActiveSkp(prev => ({
                          ...prev,
                          ratingPerilaku,
                          predikatKinerja: computeSkpPredikatKinerja(
                            prev.ratingHasilKerja,
                            ratingPerilaku
                          )
                        }));
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white font-semibold"
                    >
                      <option value="Diatas Ekspektasi">Diatas Ekspektasi</option>
                      <option value="Sesuai Ekspektasi">Sesuai Ekspektasi</option>
                      <option value="Dibawah Ekspektasi">Dibawah Ekspektasi</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Catatan Evaluasi / Rekomendasi Kepala Sekolah
                  </label>
                  <textarea
                    rows={2}
                    disabled={!canVerify}
                    value={activeSkp.catatanEvaluasi || ''}
                    onChange={e =>
                      updateActiveSkp(prev => ({
                        ...prev,
                        catatanEvaluasi: e.target.value
                      }))
                    }
                    placeholder="Tuliskan catatan pembinaan atau apresiasi pimpinan..."
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Tabel 7 Aspek BerAKHLAK */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    Perilaku Kerja ASN BerAKHLAK
                  </h3>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        setAiAssistModal({
                          open: true,
                          mode: 'generate_berakhlak'
                        })
                      }
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Bantu Isi BerAKHLAK & Evaluasi dengan AI</span>
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-3 px-4 w-56">Nilai Dasar BerAKHLAK</th>
                        <th className="py-3 px-4">Ekspektasi Khusus Pimpinan</th>
                        <th className="py-3 px-4">Umpan Balik Berkelanjutan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeSkp.perilakuList.map((item, idx) => (
                        <tr key={item.aspek}>
                          <td className="py-3 px-4 font-bold text-slate-900 align-top">
                            {item.aspek}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <textarea
                              rows={2}
                              disabled={!canEdit}
                              value={item.ekspektasiKhusus}
                              onChange={e => {
                                const val = e.target.value;
                                updateActiveSkp(prev => ({
                                  ...prev,
                                  perilakuList: prev.perilakuList.map((p, i) =>
                                    i === idx ? { ...p, ekspektasiKhusus: val } : p
                                  )
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                            />
                          </td>
                          <td className="py-3 px-4 align-top">
                            <textarea
                              rows={2}
                              disabled={!canVerify}
                              value={item.umpanBalik}
                              onChange={e => {
                                const val = e.target.value;
                                updateActiveSkp(prev => ({
                                  ...prev,
                                  perilakuList: prev.perilakuList.map((p, i) =>
                                    i === idx ? { ...p, umpanBalik: val } : p
                                  )
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: PRATINJAU & CETAK RESMI */}
          {workspaceMode === 'cetak_resmi' && (
            <div className="space-y-4">
              <div className="no-print bg-white border border-slate-200 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="inline-flex p-1 bg-slate-100 rounded border border-slate-200 font-semibold">
                    {[
                      { id: 'cover_dan_isi' as const, label: 'Cover Garuda + Isi SKP' },
                      { id: 'cover_saja' as const, label: 'Cover Garuda Saja' },
                      { id: 'isi_saja' as const, label: 'Isi SKP Saja' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPrintSectionMode(opt.id)}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          printSectionMode === opt.id
                            ? 'bg-white text-blue-900 shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {printSectionMode !== 'cover_saja' && (
                    <label className="inline-flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tampilkanTtdStempel}
                        onChange={e => setTampilkanTtdStempel(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <span>Tampilkan TTD Digital & Stempel Kepala Sekolah</span>
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>
                    {printSectionMode === 'cover_saja'
                      ? 'Cetak Cover SKP'
                      : 'Cetak Dokumen SKP'}
                  </span>
                </button>
              </div>

              {/* Halaman Depan / Cover SKP Berlogo Garuda Pancasila */}
              {printSectionMode !== 'isi_saja' && (
                <SkpCoverSheet
                  profile={profile}
                  skp={activeSkp}
                  withPageBreakAfter={printSectionMode === 'cover_dan_isi'}
                />
              )}

              {/* Printable Sheet: Isi Evaluasi SKP */}
              {printSectionMode !== 'cover_saja' && (
                <div className="print-container bg-white border border-slate-200 rounded-lg p-6 md:p-8 text-black text-[11px] leading-snug space-y-4">
                  <OfficialKopSurat profile={profile} compact />

                <div className="text-center space-y-0.5">
                  <div className="text-sm font-extrabold uppercase tracking-wide">
                    EVALUASI KINERJA PEGAWAI — SASARAN KINERJA PEGAWAI (SKP)
                  </div>
                  <div className="text-xs font-semibold">
                    PERIODE PENILAIAN: {activeSkp.periode.toUpperCase()} · PENDEKATAN {activeSkp.pendekatan.toUpperCase()}
                  </div>
                </div>

                {/* Identitas 2 Kolom */}
                <table className="w-full border-collapse border border-black text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="border border-black px-2 py-1 text-left w-10">NO</th>
                      <th className="border border-black px-2 py-1 text-left w-1/2">
                        PEGAWAI YANG DINILAI
                      </th>
                      <th className="border border-black px-2 py-1 text-left w-10">NO</th>
                      <th className="border border-black px-2 py-1 text-left w-1/2">
                        PEJABAT PENILAI KINERJA
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">1</td>
                      <td className="border border-black px-2 py-1">
                        Nama: <strong>{activeSkp.pegawaiNama}</strong>
                      </td>
                      <td className="border border-black px-2 py-1 text-center">1</td>
                      <td className="border border-black px-2 py-1">
                        Nama: <strong>{activeSkp.penilaiNama}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">2</td>
                      <td className="border border-black px-2 py-1 font-mono">
                        NIP: {activeSkp.pegawaiNip || '-'}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">2</td>
                      <td className="border border-black px-2 py-1 font-mono">
                        NIP: {activeSkp.penilaiNip || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">3</td>
                      <td className="border border-black px-2 py-1">
                        Pangkat / Gol: {activeSkp.pegawaiPangkatGol || '-'}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">3</td>
                      <td className="border border-black px-2 py-1">
                        Pangkat / Gol: {activeSkp.penilaiPangkatGol || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">4</td>
                      <td className="border border-black px-2 py-1">
                        Jabatan: {activeSkp.pegawaiJabatan}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">4</td>
                      <td className="border border-black px-2 py-1">
                        Jabatan: {activeSkp.penilaiJabatan}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 text-center">5</td>
                      <td className="border border-black px-2 py-1">
                        Unit Kerja: {activeSkp.pegawaiUnitKerja}
                      </td>
                      <td className="border border-black px-2 py-1 text-center">5</td>
                      <td className="border border-black px-2 py-1">
                        Unit Kerja: {activeSkp.penilaiUnitKerja}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tabel Hasil Kerja & Bukti Dukung */}
                <table className="w-full border-collapse border border-black text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black px-1.5 py-1.5 w-7">NO</th>
                      <th className="border border-black px-2 py-1.5">RHK PIMPINAN</th>
                      <th className="border border-black px-2 py-1.5">RENCANA HASIL KERJA</th>
                      <th className="border border-black px-1.5 py-1.5 w-16">ASPEK</th>
                      <th className="border border-black px-2 py-1.5">INDIKATOR KINERJA INDIVIDU</th>
                      <th className="border border-black px-1.5 py-1.5 w-20">TARGET</th>
                      <th className="border border-black px-1.5 py-1.5 w-24">REALISASI & BUKTI DUKUNG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSkp.rhkList.map((rhk, idx) => {
                      const rows = rhk.indikatorList.length > 0 ? rhk.indikatorList : [null];
                      return rows.map((ind, iIdx) => (
                        <tr key={`${rhk.id}-${iIdx}`}>
                          {iIdx === 0 && (
                            <>
                              <td
                                rowSpan={rows.length}
                                className="border border-black px-1.5 py-1.5 text-center align-top font-mono"
                              >
                                {idx + 1}
                              </td>
                              <td
                                rowSpan={rows.length}
                                className="border border-black px-2 py-1.5 align-top"
                              >
                                {rhk.rhkAtasan}
                              </td>
                              <td
                                rowSpan={rows.length}
                                className="border border-black px-2 py-1.5 align-top font-semibold"
                              >
                                [{rhk.jenis}] {rhk.rencanaHasilKerja}
                              </td>
                            </>
                          )}
                          <td className="border border-black px-1.5 py-1.5 align-top">
                            {ind ? ind.aspek : '-'}
                          </td>
                          <td className="border border-black px-2 py-1.5 align-top">
                            {ind ? ind.indikator : '-'}
                          </td>
                          <td className="border border-black px-1.5 py-1.5 align-top font-mono">
                            {ind ? ind.target : '-'}
                          </td>
                          <td className="border border-black px-2 py-1.5 align-top">
                            {ind ? (
                              <div className="font-mono font-semibold">
                                {ind.realisasi} ({ind.capaianPersen}%)
                              </div>
                            ) : (
                              '-'
                            )}
                            {iIdx === 0 && rhk.buktiDukungList.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-slate-300 space-y-0.5 text-[9.5px]">
                                <div className="font-bold">Bukti Dukung:</div>
                                {rhk.buktiDukungList.map((b, bi) => (
                                  <div key={b.id}>
                                    {bi + 1}. {b.judul}
                                    {b.nomorDokumen ? ` (${b.nomorDokumen})` : ''} —{' '}
                                    <strong>{b.statusVerifikasi}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ));
                    })}
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={6} className="border border-black px-2 py-1.5">
                        RATING HASIL KERJA
                      </td>
                      <td className="border border-black px-2 py-1.5 uppercase">
                        {activeSkp.ratingHasilKerja}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tabel Perilaku Kerja & Predikat Akhir */}
                <table className="w-full border-collapse border border-black text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold">
                      <th className="border border-black px-2 py-1 text-left">
                        PERILAKU KERJA BERAKHLAK
                      </th>
                      <th className="border border-black px-2 py-1 text-left">
                        EKSPEKTASI KHUSUS PIMPINAN
                      </th>
                      <th className="border border-black px-2 py-1 text-left">
                        UMPAN BALIK BERKELANJUTAN
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSkp.perilakuList.map(p => (
                      <tr key={p.aspek}>
                        <td className="border border-black px-2 py-1 font-semibold">
                          {p.aspek}
                        </td>
                        <td className="border border-black px-2 py-1">
                          {p.ekspektasiKhusus}
                        </td>
                        <td className="border border-black px-2 py-1">
                          {p.umpanBalik}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold">
                      <td colSpan={2} className="border border-black px-2 py-1.5">
                        RATING PERILAKU KERJA
                      </td>
                      <td className="border border-black px-2 py-1.5 uppercase">
                        {activeSkp.ratingPerilaku}
                      </td>
                    </tr>
                    <tr className="bg-slate-100 font-extrabold text-xs">
                      <td colSpan={2} className="border border-black px-2 py-2">
                        PREDIKAT KINERJA PEGAWAI
                      </td>
                      <td className="border border-black px-2 py-2 uppercase">
                        {activeSkp.predikatKinerja}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tanda Tangan 2 Kolom */}
                <div className="grid grid-cols-2 gap-8 pt-6 text-[11px]">
                  <div className="text-center space-y-1">
                    <div>&nbsp;</div>
                    <div>Pegawai yang Dinilai,</div>
                    <div className="h-16" />
                    <div className="font-bold underline">{activeSkp.pegawaiNama}</div>
                    <div className="font-mono">NIP. {activeSkp.pegawaiNip || '-'}</div>
                  </div>

                  <div className="text-center space-y-1 relative">
                    <div>
                      {profile.kota || 'Surabaya'},{' '}
                      {new Date().toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div>Pejabat Penilai Kinerja,</div>
                    <div className="h-16 relative flex items-center justify-center">
                      {tampilkanTtdStempel && stempelSrc && (
                        <img
                          src={stempelSrc}
                          alt="Stempel Sekolah"
                          className="h-16 w-auto object-contain opacity-80 -ml-10"
                        />
                      )}
                      {tampilkanTtdStempel && ttdKsSrc && (
                        <img
                          src={ttdKsSrc}
                          alt="TTD Kepala Sekolah"
                          className="h-14 w-auto object-contain"
                        />
                      )}
                    </div>
                    <div className="font-bold underline">{activeSkp.penilaiNama}</div>
                    <div className="font-mono">NIP. {activeSkp.penilaiNip || '-'}</div>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL BUAT SKP BARU */}
      {isNewSkpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Buat Dokumen SKP Pegawai Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsNewSkpModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateNewSkp} className="p-5 space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Pegawai (dari Database Guru & Tendik)
                </label>
                <select
                  value={newSkpGtkKey}
                  onChange={e => setNewSkpGtkKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                >
                  <option value="">-- Pilih Guru / Tendik --</option>
                  {activeGtkOptions.map(o => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                  <option value="manual">+ Input Pegawai Manual</option>
                </select>
              </div>

              {(newSkpGtkKey === 'manual' || !newSkpGtkKey) && (
                <div className="p-3 rounded bg-slate-50 border border-slate-200 space-y-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Pegawai Manual
                    </label>
                    <input
                      type="text"
                      value={newSkpManualNama}
                      onChange={e => setNewSkpManualNama(e.target.value)}
                      placeholder="Nama lengkap beserta gelar"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">NIP</label>
                      <input
                        type="text"
                        value={newSkpManualNip}
                        onChange={e => setNewSkpManualNip(e.target.value)}
                        placeholder="1980..."
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Template RHK
                      </label>
                      <select
                        value={newSkpManualRole}
                        onChange={e =>
                          setNewSkpManualRole(e.target.value as 'guru' | 'tendik')
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="guru">Guru / Pendidik</option>
                        <option value="tendik">Tendik / Staf TU</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jabatan</label>
                    <input
                      type="text"
                      value={newSkpManualJabatan}
                      onChange={e => setNewSkpManualJabatan(e.target.value)}
                      placeholder="Guru Mapel / Pengadministrasi Perkantoran"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={newSkpTahun}
                    onChange={e => setNewSkpTahun(Number(e.target.value) || 2026)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Periode Penilaian
                  </label>
                  <input
                    type="text"
                    value={newSkpPeriode}
                    onChange={e => setNewSkpPeriode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewSkpModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                >
                  Buat SKP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT IDENTITAS PEGAWAI & PENILAI */}
      {isEditIdentityOpen && activeSkp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Ubah Identitas Pegawai & Pejabat Penilai
              </h3>
              <button
                type="button"
                onClick={() => setIsEditIdentityOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                updateActiveSkp(prev => ({
                  ...prev,
                  ...identityDraft
                }));
                setIsEditIdentityOpen(false);
                setFeedback({ type: 'success', text: 'Identitas SKP diperbarui.' });
              }}
              className="p-5 overflow-y-auto space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <div className="font-bold text-slate-800 border-b border-slate-100 pb-1">
                    Pegawai yang Dinilai
                  </div>
                  <input
                    type="text"
                    placeholder="Nama Pegawai"
                    value={identityDraft.pegawaiNama || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({ ...d, pegawaiNama: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="NIP"
                    value={identityDraft.pegawaiNip || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({ ...d, pegawaiNip: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Pangkat / Golongan"
                    value={identityDraft.pegawaiPangkatGol || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({
                        ...d,
                        pegawaiPangkatGol: e.target.value
                      }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Jabatan"
                    value={identityDraft.pegawaiJabatan || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({ ...d, pegawaiJabatan: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="font-bold text-slate-800 border-b border-slate-100 pb-1">
                    Pejabat Penilai Kinerja
                  </div>
                  <input
                    type="text"
                    placeholder="Nama Pejabat Penilai"
                    value={identityDraft.penilaiNama || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({ ...d, penilaiNama: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="NIP Penilai"
                    value={identityDraft.penilaiNip || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({ ...d, penilaiNip: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Pangkat / Golongan Penilai"
                    value={identityDraft.penilaiPangkatGol || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({
                        ...d,
                        penilaiPangkatGol: e.target.value
                      }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Jabatan Penilai"
                    value={identityDraft.penilaiJabatan || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({ ...d, penilaiJabatan: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={identityDraft.tahun || 2026}
                    onChange={e =>
                      setIdentityDraft(d => ({
                        ...d,
                        tahun: Number(e.target.value) || 2026
                      }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Periode</label>
                  <input
                    type="text"
                    value={identityDraft.periode || ''}
                    onChange={e =>
                      setIdentityDraft(d => ({ ...d, periode: e.target.value }))
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditIdentityOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                >
                  Simpan Identitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT RHK & INDIKATOR */}
      {rhkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {rhkModal.editingId
                  ? 'Ubah Rencana Hasil Kerja (RHK)'
                  : 'Tambah Rencana Hasil Kerja (RHK) Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setRhkModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRhk} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis RHK</label>
                  <select
                    value={rhkModal.jenis}
                    onChange={e =>
                      setRhkModal(prev =>
                        prev
                          ? { ...prev, jenis: e.target.value as 'Utama' | 'Tambahan' }
                          : prev
                      )
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    <option value="Utama">Utama</option>
                    <option value="Tambahan">Tambahan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Periode</label>
                  <input
                    type="text"
                    value={rhkModal.periodeLabel}
                    onChange={e =>
                      setRhkModal(prev =>
                        prev ? { ...prev, periodeLabel: e.target.value } : prev
                      )
                    }
                    placeholder="Contoh: Tahunan 2026 / Triwulan I"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  RHK Pimpinan yang Diintervensi
                </label>
                <input
                  type="text"
                  value={rhkModal.rhkAtasan}
                  onChange={e =>
                    setRhkModal(prev =>
                      prev ? { ...prev, rhkAtasan: e.target.value } : prev
                    )
                  }
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block font-semibold text-slate-700">
                    Rencana Hasil Kerja Pegawai (Wajib diisi)
                  </label>
                  <button
                    type="button"
                    disabled={isInlineAiRhkLoading}
                    onClick={() => void handleInlineAiRhkAssist()}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded font-semibold flex items-center gap-1 disabled:opacity-60"
                    title="Tuliskan kata kunci tugas di kotak RHK lalu klik agar AI menyusun RHK Atasan, redaksi RHK baku, dan 3 indikatornya"
                  >
                    {isInlineAiRhkLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>
                      {isInlineAiRhkLoading
                        ? 'Merumuskan...'
                        : 'Bantu Rumuskan dengan AI'}
                    </span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={rhkModal.rencanaHasilKerja}
                  onChange={e =>
                    setRhkModal(prev =>
                      prev
                        ? { ...prev, rencanaHasilKerja: e.target.value, error: '' }
                        : prev
                    )
                  }
                  placeholder="Contoh: Tersusunnya perangkat pembelajaran dan terlaksananya asesmen sumatif (atau tulis kata kunci lalu klik Bantu Rumuskan dengan AI)"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Indikator Kinerja Individu</span>
                  <button
                    type="button"
                    onClick={() =>
                      setRhkModal(prev =>
                        prev
                          ? {
                              ...prev,
                              indikatorList: [
                                ...prev.indikatorList,
                                {
                                  id: `ind-${Date.now()}`,
                                  aspek: 'Kualitas',
                                  indikator: '',
                                  target: '100%',
                                  realisasi: '100%',
                                  capaianPersen: 100
                                }
                              ]
                            }
                          : prev
                      )
                    }
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700"
                  >
                    + Tambah Indikator
                  </button>
                </div>

                {rhkModal.indikatorList.map((ind, idx) => (
                  <div
                    key={ind.id}
                    className="p-3 rounded border border-slate-200 bg-slate-50/50 space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2">
                      <select
                        value={ind.aspek}
                        onChange={e => {
                          const val = e.target.value as SkpIndikatorKinerja['aspek'];
                          setRhkModal(prev =>
                            prev
                              ? {
                                  ...prev,
                                  indikatorList: prev.indikatorList.map((item, i) =>
                                    i === idx ? { ...item, aspek: val } : item
                                  )
                                }
                              : prev
                          );
                        }}
                        className="col-span-3 px-2 py-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="Kuantitas">Kuantitas</option>
                        <option value="Kualitas">Kualitas</option>
                        <option value="Waktu">Waktu</option>
                        <option value="Biaya">Biaya</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Uraian indikator kinerja..."
                        value={ind.indikator}
                        onChange={e => {
                          const val = e.target.value;
                          setRhkModal(prev =>
                            prev
                              ? {
                                  ...prev,
                                  indikatorList: prev.indikatorList.map((item, i) =>
                                    i === idx ? { ...item, indikator: val } : item
                                  )
                                }
                              : prev
                          );
                        }}
                        className="col-span-8 px-2.5 py-1 border border-slate-300 rounded bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRhkModal(prev =>
                            prev
                              ? {
                                  ...prev,
                                  indikatorList: prev.indikatorList.filter(
                                    (_, i) => i !== idx
                                  )
                                }
                              : prev
                          )
                        }
                        className="col-span-1 text-slate-400 hover:text-rose-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Target (misal: 2 Paket)"
                        value={ind.target}
                        onChange={e => {
                          const val = e.target.value;
                          setRhkModal(prev =>
                            prev
                              ? {
                                  ...prev,
                                  indikatorList: prev.indikatorList.map((item, i) =>
                                    i === idx ? { ...item, target: val } : item
                                  )
                                }
                              : prev
                          );
                        }}
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Realisasi (misal: 2 Paket)"
                        value={ind.realisasi}
                        onChange={e => {
                          const val = e.target.value;
                          setRhkModal(prev =>
                            prev
                              ? {
                                  ...prev,
                                  indikatorList: prev.indikatorList.map((item, i) =>
                                    i === idx ? { ...item, realisasi: val } : item
                                  )
                                }
                              : prev
                          );
                        }}
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="number"
                        min={0}
                        max={200}
                        placeholder="Capaian %"
                        value={ind.capaianPersen}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setRhkModal(prev =>
                            prev
                              ? {
                                  ...prev,
                                  indikatorList: prev.indikatorList.map((item, i) =>
                                    i === idx ? { ...item, capaianPersen: val } : item
                                  )
                                }
                              : prev
                          );
                        }}
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {rhkModal.error && (
                <div className="px-3 py-2 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {rhkModal.error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRhkModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                >
                  Simpan RHK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNGGAH / TAMBAH BUKTI DUKUNG */}
      {buktiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {buktiModal.editingBuktiId
                  ? 'Ubah Bukti Dukung SKP'
                  : 'Unggah / Tambah Bukti Dukung SKP'}
              </h3>
              <button
                type="button"
                onClick={() => setBuktiModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBuktiDukung} className="p-5 overflow-y-auto space-y-3.5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block font-semibold text-slate-700">
                    Judul Dokumen Bukti Dukung (Wajib diisi)
                  </label>
                  <button
                    type="button"
                    disabled={isInlineAiBuktiLoading}
                    onClick={() => void handleInlineAiBuktiAssist()}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded font-semibold flex items-center gap-1 disabled:opacity-60"
                    title="Tuliskan kata kunci kegiatan di judul/intisari lalu klik untuk menyusun judul resmi, intisari padat, dan naskah laporan"
                  >
                    {isInlineAiBuktiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>
                      {isInlineAiBuktiLoading
                        ? 'Menyusun...'
                        : 'Bantu Tulis Judul, Intisari & Naskah dengan AI'}
                    </span>
                  </button>
                </div>
                <input
                  type="text"
                  value={buktiModal.judul}
                  onChange={e =>
                    setBuktiModal(prev =>
                      prev ? { ...prev, judul: e.target.value, error: '' } : prev
                    )
                  }
                  placeholder="Contoh: SK Pembagian Tugas Mengajar Semester Gasal 2026"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Intisari / Ringkasan Isi Dokumen (Wajib diisi agar mudah dibaca penilai)
                </label>
                <textarea
                  rows={2}
                  value={buktiModal.ringkasanIsi}
                  onChange={e =>
                    setBuktiModal(prev =>
                      prev ? { ...prev, ringkasanIsi: e.target.value, error: '' } : prev
                    )
                  }
                  placeholder="Jelaskan singkat isi dokumen & angka capaian utamanya (1-2 kalimat)..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={buktiModal.kategori}
                    onChange={e =>
                      setBuktiModal(prev =>
                        prev
                          ? { ...prev, kategori: e.target.value as SkpBuktiKategori }
                          : prev
                      )
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  >
                    {BUKTI_KATEGORI_LIST.map(k => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. Dokumen
                  </label>
                  <input
                    type="text"
                    value={buktiModal.nomorDokumen}
                    onChange={e =>
                      setBuktiModal(prev =>
                        prev ? { ...prev, nomorDokumen: e.target.value } : prev
                      )
                    }
                    placeholder="421.3/..."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Dokumen
                  </label>
                  <input
                    type="date"
                    value={buktiModal.tanggalDokumen}
                    onChange={e =>
                      setBuktiModal(prev =>
                        prev ? { ...prev, tanggalDokumen: e.target.value } : prev
                      )
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Sumber / Format Bukti Dukung
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'file' as const, label: 'Unggah Berkas (PDF/Foto/Excel)' },
                    { id: 'text' as const, label: 'Tulis Dokumen / Ringkasan' },
                    { id: 'link' as const, label: 'Tautan Drive / e-Kinerja' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setBuktiModal(prev =>
                          prev ? { ...prev, inputMethod: opt.id, error: '' } : prev
                        )
                      }
                      className={`px-2.5 py-2 rounded border font-semibold text-center ${
                        buktiModal.inputMethod === opt.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {buktiModal.inputMethod === 'file' && (
                <div className="p-3.5 rounded border border-dashed border-slate-300 bg-slate-50 space-y-2">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.txt,.md"
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      if (!f) return;
                      setBuktiModal(prev =>
                        prev
                          ? {
                              ...prev,
                              pendingFile: f,
                              detectedFileType: detectSkpFileType(f.name || f.type),
                              judul:
                                prev.judul || f.name.replace(/\.[^/.]+$/, ''),
                              error: ''
                            }
                          : prev
                      );
                    }}
                    className="block w-full text-xs text-slate-700"
                  />
                  <div className="text-[11px] text-slate-500">
                    Mendukung PDF, gambar scan (PNG/JPG/WebP), Excel/CSV (otomatis terbaca sebagai tabel), dan file teks.
                    {buktiModal.pendingFile && (
                      <span className="block font-semibold text-slate-800 mt-1">
                        Berkas terpilih: {buktiModal.pendingFile.name} (
                        {formatEvidenceByteSize(buktiModal.pendingFile.size)})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {buktiModal.inputMethod === 'text' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Isi Lengkap Dokumen / Laporan (Langsung terbaca rapi di panel baca)
                  </label>
                  <textarea
                    rows={6}
                    value={buktiModal.teksNarasi}
                    onChange={e =>
                      setBuktiModal(prev =>
                        prev ? { ...prev, teksNarasi: e.target.value, error: '' } : prev
                      )
                    }
                    placeholder="Tuliskan poin-poin laporan, rincian kegiatan, jumlah peserta, atau hasil capaian..."
                    className="w-full px-3 py-2 border border-slate-300 rounded leading-relaxed"
                  />
                </div>
              )}

              {buktiModal.inputMethod === 'link' && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      URL Google Drive / Google Docs / Sheets / e-Kinerja
                    </label>
                    <input
                      type="url"
                      value={buktiModal.externalUrl}
                      onChange={e =>
                        setBuktiModal(prev =>
                          prev ? { ...prev, externalUrl: e.target.value, error: '' } : prev
                        )
                      }
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Catatan Isi Tautan (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={buktiModal.teksNarasi}
                      onChange={e =>
                        setBuktiModal(prev =>
                          prev ? { ...prev, teksNarasi: e.target.value } : prev
                        )
                      }
                      placeholder="Misal: Halaman 1-5 berisi SK, halaman 6-12 lampiran pembagian jam..."
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                    />
                  </div>
                </div>
              )}

              {buktiModal.error && (
                <div className="px-3 py-2 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {buktiModal.error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBuktiModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                >
                  Simpan & Baca Bukti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL ASISTEN AI PENYUSUN SKP */}
      {activeSkp && (
        <SkpAiAssistModal
          isOpen={aiAssistModal.open}
          initialMode={aiAssistModal.mode}
          activeSkp={activeSkp}
          onClose={() => setAiAssistModal(prev => ({ ...prev, open: false }))}
          onApplyRhk={(newRhk, includeSuggestedBukti, saranBukti) => {
            const nowIso = new Date().toISOString();
            const todayDate = nowIso.slice(0, 10);
            const seededBukti: SkpBuktiDukungItem[] =
              includeSuggestedBukti && saranBukti.length > 0
                ? saranBukti.map((s, idx) => ({
                    id: `bukti-ai-${Date.now()}-${idx}`,
                    judul: s.judul,
                    ringkasanIsi: s.ringkasanIsi,
                    kategori: s.kategori,
                    tanggalDokumen: todayDate,
                    jenisFile: 'text',
                    teksNarasi: `DRAF BUKTI DUKUNG (${s.kategori.toUpperCase()})\nJudul: ${s.judul}\nPegawai: ${activeSkp.pegawaiNama} (${activeSkp.pegawaiJabatan})\nRHK Terkait: ${newRhk.rencanaHasilKerja}\n\nRingkasan Awal:\n${s.ringkasanIsi}\n\nCatatan: Anda dapat melengkapi naskah ini atau menggantinya dengan unggahan berkas PDF/Foto/Excel melalui tombol Edit.`,
                    statusVerifikasi: 'Belum Diperiksa',
                    uploadedAt: nowIso
                  }))
                : [];

            const rhkWithBukti: SkpRhkItem = {
              ...newRhk,
              buktiDukungList: seededBukti
            };

            updateActiveSkp(prev => ({
              ...prev,
              rhkList: [...prev.rhkList, rhkWithBukti]
            }));
            if (seededBukti[0]) {
              setSelectedEvidenceRef({
                rhkId: rhkWithBukti.id,
                buktiId: seededBukti[0].id
              });
            }
            setWorkspaceMode('rhk_bukti');
            setAiAssistModal(prev => ({ ...prev, open: false }));
            appendAuditLog(
              'AI_SKP_RHK',
              `Menambahkan RHK hasil Asisten AI "${rhkWithBukti.rencanaHasilKerja}" untuk ${activeSkp.pegawaiNama}.`
            );
            setFeedback({
              type: 'success',
              text: `RHK baru beserta ${rhkWithBukti.indikatorList.length} indikator${
                seededBukti.length > 0
                  ? ` dan ${seededBukti.length} draf bukti dukung`
                  : ''
              } berhasil diterapkan.`
            });
          }}
          onApplyBukti={(rhkId, buktiDraft) => {
            const nowIso = new Date().toISOString();
            const buktiId = `bukti-ai-${Date.now()}`;
            const newBukti: SkpBuktiDukungItem = {
              id: buktiId,
              judul: buktiDraft.judul.trim(),
              ringkasanIsi: buktiDraft.ringkasanIsi.trim(),
              kategori: buktiDraft.kategori,
              tanggalDokumen: nowIso.slice(0, 10),
              jenisFile: 'text',
              teksNarasi: buktiDraft.teksNarasi.trim(),
              statusVerifikasi: 'Belum Diperiksa',
              uploadedAt: nowIso
            };

            updateActiveSkp(prev => ({
              ...prev,
              rhkList: prev.rhkList.map(r =>
                r.id === rhkId
                  ? { ...r, buktiDukungList: [...r.buktiDukungList, newBukti] }
                  : r
              )
            }));
            setSelectedEvidenceRef({ rhkId, buktiId });
            setWorkspaceMode('rhk_bukti');
            setAiAssistModal(prev => ({ ...prev, open: false }));
            appendAuditLog(
              'AI_SKP_BUKTI',
              `Menyimpan naskah bukti dukung AI "${newBukti.judul}" untuk ${activeSkp.pegawaiNama}.`
            );
            setFeedback({
              type: 'success',
              text: `Naskah bukti dukung "${newBukti.judul}" tersimpan dan langsung dibuka di panel pembaca.`
            });
          }}
          onApplyBerakhlak={(perilakuList, catatanEvaluasi) => {
            updateActiveSkp(prev => ({
              ...prev,
              perilakuList:
                perilakuList.length > 0 ? perilakuList : prev.perilakuList,
              catatanEvaluasi: catatanEvaluasi || prev.catatanEvaluasi
            }));
            setWorkspaceMode('evaluasi_berakhlak');
            setAiAssistModal(prev => ({ ...prev, open: false }));
            appendAuditLog(
              'AI_SKP_BERAKHLAK',
              `Menerapkan rekomendasi BerAKHLAK & evaluasi AI untuk ${activeSkp.pegawaiNama}.`
            );
            setFeedback({
              type: 'success',
              text: 'Ekspektasi, umpan balik BerAKHLAK, dan catatan evaluasi kepala sekolah telah diterapkan.'
            });
          }}
        />
      )}
    </div>
  );
};
