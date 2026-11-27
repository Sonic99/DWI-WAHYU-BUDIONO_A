import React, { useEffect, useState } from 'react';
import {
  Check,
  ClipboardCheck,
  FileText,
  ListChecks,
  Loader2,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import {
  SkpBuktiKategori,
  SkpDocumentRecord,
  SkpIndikatorKinerja,
  SkpPerilakuItem,
  SkpRhkItem
} from '../types';

export type SkpAiMode =
  | 'generate_rhk'
  | 'draft_bukti'
  | 'generate_berakhlak'
  | 'review_kelayakan';

interface GeneratedRhkPayload {
  rhkAtasan: string;
  rencanaHasilKerja: string;
  periodeLabel: string;
  indikatorList: Array<{
    aspek: 'Kuantitas' | 'Kualitas' | 'Waktu' | 'Biaya';
    indikator: string;
    target: string;
    realisasi: string;
    capaianPersen: number;
  }>;
  saranBuktiDukung: Array<{
    judul: string;
    kategori: SkpBuktiKategori;
    ringkasanIsi: string;
  }>;
}

interface GeneratedBuktiPayload {
  judul: string;
  kategori: SkpBuktiKategori;
  ringkasanIsi: string;
  teksNarasi: string;
}

interface GeneratedBerakhlakPayload {
  perilakuList: SkpPerilakuItem[];
  catatanEvaluasi: string;
}

interface AuditKelayakanPayload {
  statusKesiapan: string;
  ringkasanAudit: string;
  kekuatan: string[];
  saranPerbaikan: Array<{
    bagian: string;
    masalah: string;
    rekomendasi: string;
  }>;
}

interface SkpAiAssistModalProps {
  isOpen: boolean;
  initialMode?: SkpAiMode;
  activeSkp: SkpDocumentRecord;
  onClose: () => void;
  onApplyRhk: (
    rhk: SkpRhkItem,
    includeSuggestedBukti: boolean,
    saranBukti: GeneratedRhkPayload['saranBuktiDukung']
  ) => void;
  onApplyBukti: (rhkId: string, bukti: GeneratedBuktiPayload) => void;
  onApplyBerakhlak: (
    perilakuList: SkpPerilakuItem[],
    catatanEvaluasi: string
  ) => void;
}

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

const QUICK_TASK_PROMPTS_GURU = [
  'Perencanaan, pelaksanaan pembelajaran, dan asesmen sumatif mata pelajaran 1 tahun ajaran',
  'Pembinaan siswa sebagai Wali Kelas serta koordinasi orang tua/wali murid',
  'Pengembangan diri melalui workshop/PMM dan penyusunan modul ajar Kurikulum Merdeka',
  'Tugas tambahan sebagai Panitia Ujian / Pembina Ekstrakurikuler sekolah'
];

const QUICK_TASK_PROMPTS_TENDIK = [
  'Pengelolaan administrasi persuratan masuk/keluar, agenda surat, dan pengarsipan digital sekolah',
  'Pelayanan administrasi kepegawaian, presensi GTK, dan pemutakhiran data Dapodik/e-Kinerja',
  'Pengelolaan sarana prasarana, inventaris barang milik daerah, atau layanan laboratorium/perpustakaan',
  'Pelayanan administrasi kesiswaan, mutasi, legalisir ijazah, dan dukungan ujian sekolah'
];

export const SkpAiAssistModal: React.FC<SkpAiAssistModalProps> = ({
  isOpen,
  initialMode = 'generate_rhk',
  activeSkp,
  onClose,
  onApplyRhk,
  onApplyBukti,
  onApplyBerakhlak
}) => {
  const [activeTab, setActiveTab] = useState<SkpAiMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'error' | 'success';
    text: string;
  } | null>(null);

  // Tab 1: Generate RHK
  const [jenisRhk, setJenisRhk] = useState<'Utama' | 'Tambahan'>('Utama');
  const [deskripsiTugas, setDeskripsiTugas] = useState('');
  const [rhkResult, setRhkResult] = useState<GeneratedRhkPayload | null>(null);
  const [includeSuggestedBukti, setIncludeSuggestedBukti] = useState(true);

  // Tab 2: Draft Bukti Dukung
  const [targetRhkId, setTargetRhkId] = useState<string>(
    activeSkp.rhkList[0]?.id || ''
  );
  const [kategoriBukti, setKategoriBukti] =
    useState<SkpBuktiKategori>('Laporan Kegiatan');
  const [catatanKegiatan, setCatatanKegiatan] = useState('');
  const [buktiResult, setBuktiResult] = useState<GeneratedBuktiPayload | null>(
    null
  );

  // Tab 3: BerAKHLAK & Evaluasi
  const [arahanPimpinan, setArahanPimpinan] = useState('');
  const [berakhlakResult, setBerakhlakResult] =
    useState<GeneratedBerakhlakPayload | null>(null);

  // Tab 4: Audit Kelengkapan SKP
  const [auditResult, setAuditResult] = useState<AuditKelayakanPayload | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setStatusMessage(null);
      if (!activeSkp.rhkList.some(r => r.id === targetRhkId)) {
        setTargetRhkId(activeSkp.rhkList[0]?.id || '');
      }
    }
  }, [isOpen, initialMode, activeSkp.id]);

  if (!isOpen) return null;

  const normalizeKategori = (raw?: string): SkpBuktiKategori => {
    const matched = BUKTI_KATEGORI_LIST.find(
      k => k.toLowerCase() === String(raw || '').trim().toLowerCase()
    );
    return matched || 'Laporan Kegiatan';
  };

  const normalizeAspek = (
    raw?: string
  ): SkpIndikatorKinerja['aspek'] => {
    const lower = String(raw || '').toLowerCase();
    if (lower.includes('kualitas') || lower.includes('mutu')) return 'Kualitas';
    if (lower.includes('waktu') || lower.includes('tepat')) return 'Waktu';
    if (lower.includes('biaya') || lower.includes('anggaran')) return 'Biaya';
    return 'Kuantitas';
  };

  const callSkpAiEndpoint = async (mode: SkpAiMode, payload: Record<string, any>) => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const response = await fetch('/api/ai/skp-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          pegawaiNama: activeSkp.pegawaiNama,
          pegawaiJabatan: activeSkp.pegawaiJabatan,
          pegawaiPangkatGol: activeSkp.pegawaiPangkatGol,
          pegawaiRoleType: activeSkp.pegawaiSourceType,
          tahun: activeSkp.tahun,
          ...payload
        })
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Gagal menghubungi asisten AI.');
      }

      setStatusMessage({
        type: data.source === 'gemini-4-hydrogen' ? 'success' : 'info',
        text: data.message || 'Rekomendasi SKP berhasil disusun.'
      });

      return data.result;
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Terjadi kesalahan saat menyusun rekomendasi AI.'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRhk = async () => {
    const result = await callSkpAiEndpoint('generate_rhk', {
      jenisRhk,
      deskripsiTugas:
        deskripsiTugas.trim() ||
        `Tugas ${jenisRhk.toLowerCase()} sebagai ${activeSkp.pegawaiJabatan}`
    });
    if (!result) return;
    setRhkResult({
      rhkAtasan: result.rhkAtasan || '-',
      rencanaHasilKerja: result.rencanaHasilKerja || '',
      periodeLabel: result.periodeLabel || `Tahun ${activeSkp.tahun}`,
      indikatorList: Array.isArray(result.indikatorList)
        ? result.indikatorList.map((ind: any) => ({
            aspek: normalizeAspek(ind.aspek),
            indikator: ind.indikator || '',
            target: ind.target || '100%',
            realisasi: ind.realisasi || '100%',
            capaianPersen: Number(ind.capaianPersen) || 100
          }))
        : [],
      saranBuktiDukung: Array.isArray(result.saranBuktiDukung)
        ? result.saranBuktiDukung.map((s: any) => ({
            judul: s.judul || 'Dokumen Bukti Dukung',
            kategori: normalizeKategori(s.kategori),
            ringkasanIsi: s.ringkasanIsi || ''
          }))
        : []
    });
  };

  const handleDraftBukti = async () => {
    const selectedRhk = activeSkp.rhkList.find(r => r.id === targetRhkId);
    const result = await callSkpAiEndpoint('draft_bukti', {
      rhkTitle: selectedRhk?.rencanaHasilKerja || 'Pelaksanaan tugas pokok SKP',
      kategoriBukti,
      catatanKegiatan:
        catatanKegiatan.trim() ||
        'Pelaksanaan kegiatan berjalan tertib, terdokumentasi, dan mencapai target.'
    });
    if (!result) return;
    setBuktiResult({
      judul: result.judul || 'Laporan Bukti Dukung SKP',
      kategori: normalizeKategori(result.kategori || kategoriBukti),
      ringkasanIsi: result.ringkasanIsi || '',
      teksNarasi: result.teksNarasi || ''
    });
  };

  const handleGenerateBerakhlak = async () => {
    const skpSummaryData = activeSkp.rhkList.map(r => ({
      jenis: r.jenis,
      rencanaHasilKerja: r.rencanaHasilKerja,
      jumlahIndikator: r.indikatorList.length,
      jumlahBukti: r.buktiDukungList.length
    }));
    const result = await callSkpAiEndpoint('generate_berakhlak', {
      arahanPimpinan: arahanPimpinan.trim(),
      skpSummaryData
    });
    if (!result) return;
    setBerakhlakResult({
      perilakuList: Array.isArray(result.perilakuList)
        ? result.perilakuList
        : [],
      catatanEvaluasi: result.catatanEvaluasi || ''
    });
  };

  const handleRunAudit = async () => {
    const skpSummaryData = {
      rhks: activeSkp.rhkList.map(r => ({
        title: r.rencanaHasilKerja,
        jenis: r.jenis,
        indicatorCount: r.indikatorList.length,
        buktiCount: r.buktiDukungList.length,
        buktiSummaries: r.buktiDukungList.map(b => ({
          judul: b.judul,
          status: b.statusVerifikasi,
          hasRingkasan: Boolean(b.ringkasanIsi?.trim())
        }))
      })),
      ratingHasilKerja: activeSkp.ratingHasilKerja,
      ratingPerilaku: activeSkp.ratingPerilaku,
      predikatKinerja: activeSkp.predikatKinerja
    };
    const result = await callSkpAiEndpoint('review_kelayakan', {
      skpSummaryData
    });
    if (!result) return;
    setAuditResult({
      statusKesiapan: result.statusKesiapan || 'Perlu Ditinjau',
      ringkasanAudit: result.ringkasanAudit || '',
      kekuatan: Array.isArray(result.kekuatan) ? result.kekuatan : [],
      saranPerbaikan: Array.isArray(result.saranPerbaikan)
        ? result.saranPerbaikan
        : []
    });
  };

  const quickPrompts =
    activeSkp.pegawaiSourceType === 'tendik'
      ? QUICK_TASK_PROMPTS_TENDIK
      : QUICK_TASK_PROMPTS_GURU;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden text-xs max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                Asisten AI Penyusun SKP — {activeSkp.pegawaiNama}
              </h3>
              <p className="text-[11px] text-slate-300">
                {activeSkp.pegawaiJabatan} · Tahun {activeSkp.tahun} · PermenPANRB No. 6/2022
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Tabs */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
          {[
            {
              id: 'generate_rhk' as const,
              label: '1. Susun RHK & Indikator',
              icon: ListChecks
            },
            {
              id: 'draft_bukti' as const,
              label: '2. Naskah Bukti Dukung',
              icon: FileText
            },
            {
              id: 'generate_berakhlak' as const,
              label: '3. BerAKHLAK & Evaluasi',
              icon: ShieldCheck
            },
            {
              id: 'review_kelayakan' as const,
              label: '4. Audit Kelengkapan SKP',
              icon: ClipboardCheck
            }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setStatusMessage(null);
                }}
                className={`px-3 py-2 rounded-t-md border-b-2 font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-white border-indigo-600 text-indigo-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {statusMessage && (
            <div
              className={`px-3.5 py-2.5 rounded border text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* TAB 1: GENERATE RHK */}
          {activeTab === 'generate_rhk' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jenis RHK
                  </label>
                  <select
                    value={jenisRhk}
                    onChange={e =>
                      setJenisRhk(e.target.value as 'Utama' | 'Tambahan')
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white font-semibold"
                  >
                    <option value="Utama">Utama</option>
                    <option value="Tambahan">Tambahan</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    Uraian Tugas / Fokus Kinerja yang Ingin Disusun
                  </label>
                  <textarea
                    rows={2}
                    value={deskripsiTugas}
                    onChange={e => setDeskripsiTugas(e.target.value)}
                    placeholder="Contoh: Mengajar mata pelajaran Matematika kelas XI sebanyak 24 JP, menyusun modul ajar, melaksanakan asesmen, dan analisis nilai..."
                    className="w-full px-3 py-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500">
                  Atau klik contoh topik cepat sesuai jabatan:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map(prompt => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setDeskripsiTugas(prompt)}
                      className="px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-[11px] text-slate-700 text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void handleGenerateRhk()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded font-bold flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isLoading
                      ? 'Menyusun RHK & Indikator...'
                      : 'Susun RHK + 3 Indikator + Saran Bukti'}
                  </span>
                </button>
              </div>

              {rhkResult && (
                <div className="border border-indigo-200 rounded-lg bg-indigo-50/30 p-4 space-y-3.5">
                  <div className="font-bold text-indigo-950 text-xs uppercase tracking-wide">
                    Pratinjau Hasil (Dapat diedit sebelum diterapkan)
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        RHK Pimpinan yang Diintervensi
                      </label>
                      <input
                        type="text"
                        value={rhkResult.rhkAtasan}
                        onChange={e =>
                          setRhkResult(prev =>
                            prev ? { ...prev, rhkAtasan: e.target.value } : prev
                          )
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Periode
                      </label>
                      <input
                        type="text"
                        value={rhkResult.periodeLabel}
                        onChange={e =>
                          setRhkResult(prev =>
                            prev
                              ? { ...prev, periodeLabel: e.target.value }
                              : prev
                          )
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Rencana Hasil Kerja Pegawai
                    </label>
                    <textarea
                      rows={2}
                      value={rhkResult.rencanaHasilKerja}
                      onChange={e =>
                        setRhkResult(prev =>
                          prev
                            ? { ...prev, rencanaHasilKerja: e.target.value }
                            : prev
                        )
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-slate-800">
                      Indikator Kinerja ({rhkResult.indikatorList.length})
                    </div>
                    {rhkResult.indikatorList.map((ind, idx) => (
                      <div
                        key={`${ind.aspek}-${idx}`}
                        className="p-2.5 bg-white border border-slate-200 rounded grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                      >
                        <div className="md:col-span-2 font-bold text-indigo-800">
                          {ind.aspek}
                        </div>
                        <input
                          type="text"
                          value={ind.indikator}
                          onChange={e => {
                            const val = e.target.value;
                            setRhkResult(prev =>
                              prev
                                ? {
                                    ...prev,
                                    indikatorList: prev.indikatorList.map(
                                      (item, i) =>
                                        i === idx
                                          ? { ...item, indikator: val }
                                          : item
                                    )
                                  }
                                : prev
                            );
                          }}
                          className="md:col-span-6 px-2.5 py-1 border border-slate-200 rounded"
                        />
                        <input
                          type="text"
                          value={ind.target}
                          onChange={e => {
                            const val = e.target.value;
                            setRhkResult(prev =>
                              prev
                                ? {
                                    ...prev,
                                    indikatorList: prev.indikatorList.map(
                                      (item, i) =>
                                        i === idx ? { ...item, target: val } : item
                                    )
                                  }
                                : prev
                            );
                          }}
                          className="md:col-span-2 px-2 py-1 border border-slate-200 rounded font-mono"
                          title="Target"
                        />
                        <input
                          type="text"
                          value={ind.realisasi}
                          onChange={e => {
                            const val = e.target.value;
                            setRhkResult(prev =>
                              prev
                                ? {
                                    ...prev,
                                    indikatorList: prev.indikatorList.map(
                                      (item, i) =>
                                        i === idx
                                          ? { ...item, realisasi: val }
                                          : item
                                    )
                                  }
                                : prev
                            );
                          }}
                          className="md:col-span-2 px-2 py-1 border border-slate-200 rounded font-mono"
                          title="Realisasi"
                        />
                      </div>
                    ))}
                  </div>

                  {rhkResult.saranBuktiDukung.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <label className="inline-flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeSuggestedBukti}
                          onChange={e =>
                            setIncludeSuggestedBukti(e.target.checked)
                          }
                          className="rounded border-slate-300"
                        />
                        <span>
                          Sekaligus tambahkan {rhkResult.saranBuktiDukung.length}{' '}
                          saran bukti dukung sebagai draf narasi terbaca di RHK ini
                        </span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {rhkResult.saranBuktiDukung.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-slate-200 rounded space-y-0.5"
                          >
                            <div className="font-bold text-slate-900">
                              {s.judul}
                            </div>
                            <div className="text-[11px] text-indigo-700 font-semibold">
                              {s.kategori}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {s.ringkasanIsi}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-indigo-200">
                    <button
                      type="button"
                      onClick={() => {
                        const now = Date.now();
                        const newRhk: SkpRhkItem = {
                          id: `rhk-${now}`,
                          jenis: jenisRhk,
                          rhkAtasan: rhkResult.rhkAtasan.trim() || '-',
                          rencanaHasilKerja:
                            rhkResult.rencanaHasilKerja.trim(),
                          periodeLabel:
                            rhkResult.periodeLabel.trim() ||
                            `Tahun ${activeSkp.tahun}`,
                          indikatorList: rhkResult.indikatorList.map(
                            (ind, i) => ({
                              id: `ind-${now}-${i}`,
                              aspek: ind.aspek,
                              indikator: ind.indikator,
                              target: ind.target,
                              realisasi: ind.realisasi,
                              capaianPersen: ind.capaianPersen
                            })
                          ),
                          buktiDukungList: []
                        };
                        onApplyRhk(
                          newRhk,
                          includeSuggestedBukti,
                          rhkResult.saranBuktiDukung
                        );
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Terapkan RHK ke SKP</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DRAFT BUKTI DUKUNG */}
          {activeTab === 'draft_bukti' && (
            <div className="space-y-4">
              {activeSkp.rhkList.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-300 rounded text-center text-slate-500">
                  Belum ada RHK pada SKP ini. Susun atau tambahkan RHK terlebih dahulu pada tab 1.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">
                        Pilih RHK Tujuan
                      </label>
                      <select
                        value={targetRhkId}
                        onChange={e => setTargetRhkId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded bg-white font-semibold"
                      >
                        {activeSkp.rhkList.map((r, i) => (
                          <option key={r.id} value={r.id}>
                            {i + 1}. {r.rencanaHasilKerja}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Kategori Dokumen
                      </label>
                      <select
                        value={kategoriBukti}
                        onChange={e =>
                          setKategoriBukti(e.target.value as SkpBuktiKategori)
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                      >
                        {BUKTI_KATEGORI_LIST.map(k => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Poin / Fakta Singkat Kegiatan yang Sudah Dilaksanakan
                    </label>
                    <textarea
                      rows={3}
                      value={catatanKegiatan}
                      onChange={e => setCatatanKegiatan(e.target.value)}
                      placeholder="Contoh: Telah mengajar 6 kelas (210 siswa) selama 2 semester, menyusun 12 modul ajar, melaksanakan PTS & PAS, persentase ketuntasan belajar 96%."
                      className="w-full px-3 py-2 border border-slate-300 rounded"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isLoading || !targetRhkId}
                      onClick={() => void handleDraftBukti()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded font-bold flex items-center gap-1.5"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isLoading
                          ? 'Menyusun Naskah Bukti...'
                          : 'Tulis Judul, Intisari & Laporan Bukti Dukung'}
                      </span>
                    </button>
                  </div>

                  {buktiResult && (
                    <div className="border border-indigo-200 rounded-lg bg-indigo-50/30 p-4 space-y-3">
                      <div className="font-bold text-indigo-950 uppercase tracking-wide">
                        Pratinjau Dokumen Bukti Dukung (Siap Dibaca di Panel Pembaca)
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block font-semibold text-slate-700 mb-1">
                            Judul Dokumen
                          </label>
                          <input
                            type="text"
                            value={buktiResult.judul}
                            onChange={e =>
                              setBuktiResult(prev =>
                                prev ? { ...prev, judul: e.target.value } : prev
                              )
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Kategori
                          </label>
                          <select
                            value={buktiResult.kategori}
                            onChange={e =>
                              setBuktiResult(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      kategori: e.target
                                        .value as SkpBuktiKategori
                                    }
                                  : prev
                              )
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                          >
                            {BUKTI_KATEGORI_LIST.map(k => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Intisari / Ringkasan Cepat (Langsung terbaca penilai)
                        </label>
                        <textarea
                          rows={2}
                          value={buktiResult.ringkasanIsi}
                          onChange={e =>
                            setBuktiResult(prev =>
                              prev
                                ? { ...prev, ringkasanIsi: e.target.value }
                                : prev
                            )
                          }
                          className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Naskah Lengkap Bukti Dukung
                        </label>
                        <textarea
                          rows={7}
                          value={buktiResult.teksNarasi}
                          onChange={e =>
                            setBuktiResult(prev =>
                              prev
                                ? { ...prev, teksNarasi: e.target.value }
                                : prev
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded bg-white leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end pt-2 border-t border-indigo-200">
                        <button
                          type="button"
                          onClick={() =>
                            onApplyBukti(targetRhkId, buktiResult)
                          }
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan ke RHK & Buka di Pembaca</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 3: BERAKHLAK & EVALUASI */}
          {activeTab === 'generate_berakhlak' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan / Arahan Pimpinan untuk Pegawai (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={arahanPimpinan}
                  onChange={e => setArahanPimpinan(e.target.value)}
                  placeholder="Contoh: Pegawai sangat disiplin, kooperatif dalam tim kurikulum, responsif melayani wali murid, serta adaptif menggunakan aplikasi sekolah."
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void handleGenerateBerakhlak()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded font-bold flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isLoading
                      ? 'Menyusun 7 Aspek BerAKHLAK...'
                      : 'Susun 7 Nilai BerAKHLAK & Catatan Evaluasi'}
                  </span>
                </button>
              </div>

              {berakhlakResult && (
                <div className="border border-indigo-200 rounded-lg bg-indigo-50/30 p-4 space-y-3">
                  <div className="font-bold text-indigo-950 uppercase tracking-wide">
                    Pratinjau Ekspektasi & Umpan Balik BerAKHLAK
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {berakhlakResult.perilakuList.map((p, idx) => (
                      <div
                        key={p.aspek}
                        className="p-2.5 bg-white border border-slate-200 rounded grid grid-cols-1 md:grid-cols-12 gap-2 text-[11.5px]"
                      >
                        <div className="md:col-span-3 font-bold text-slate-900">
                          {p.aspek}
                        </div>
                        <textarea
                          rows={2}
                          value={p.ekspektasiKhusus}
                          onChange={e => {
                            const val = e.target.value;
                            setBerakhlakResult(prev =>
                              prev
                                ? {
                                    ...prev,
                                    perilakuList: prev.perilakuList.map(
                                      (item, i) =>
                                        i === idx
                                          ? { ...item, ekspektasiKhusus: val }
                                          : item
                                    )
                                  }
                                : prev
                            );
                          }}
                          className="md:col-span-4 px-2 py-1 border border-slate-200 rounded"
                        />
                        <textarea
                          rows={2}
                          value={p.umpanBalik}
                          onChange={e => {
                            const val = e.target.value;
                            setBerakhlakResult(prev =>
                              prev
                                ? {
                                    ...prev,
                                    perilakuList: prev.perilakuList.map(
                                      (item, i) =>
                                        i === idx
                                          ? { ...item, umpanBalik: val }
                                          : item
                                    )
                                  }
                                : prev
                            );
                          }}
                          className="md:col-span-5 px-2 py-1 border border-slate-200 rounded"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Catatan Evaluasi / Rekomendasi Kepala Sekolah
                    </label>
                    <textarea
                      rows={2}
                      value={berakhlakResult.catatanEvaluasi}
                      onChange={e =>
                        setBerakhlakResult(prev =>
                          prev
                            ? { ...prev, catatanEvaluasi: e.target.value }
                            : prev
                        )
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-indigo-200">
                    <button
                      type="button"
                      onClick={() =>
                        onApplyBerakhlak(
                          berakhlakResult.perilakuList,
                          berakhlakResult.catatanEvaluasi
                        )
                      }
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Terapkan ke Evaluasi & BerAKHLAK</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT KELENGKAPAN SKP */}
          {activeTab === 'review_kelayakan' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">
                    Pemeriksaan Kesiapan Dokumen SKP Sebelum Verifikasi Kepala Sekolah
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
                    Saat ini tercatat {activeSkp.rhkList.length} RHK dan{' '}
                    {activeSkp.rhkList.reduce(
                      (sum, r) => sum + r.buktiDukungList.length,
                      0
                    )}{' '}
                    dokumen bukti dukung.
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void handleRunAudit()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded font-bold flex items-center gap-1.5 shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isLoading ? 'Menganalisis SKP...' : 'Audit Kelengkapan Sekarang'}
                  </span>
                </button>
              </div>

              {auditResult && (
                <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Status Kesiapan SKP
                      </div>
                      <div className="text-sm font-extrabold text-slate-900">
                        {auditResult.statusKesiapan}
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed">
                    {auditResult.ringkasanAudit}
                  </p>

                  {auditResult.kekuatan.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="font-bold text-emerald-800">
                        Kelebihan Dokumen Saat Ini
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-slate-700">
                        {auditResult.kekuatan.map((k, idx) => (
                          <li key={idx}>{k}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {auditResult.saranPerbaikan.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-bold text-amber-800">
                        Rekomendasi Perbaikan & Kelengkapan
                      </div>
                      <div className="space-y-2">
                        {auditResult.saranPerbaikan.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded border border-amber-200 bg-amber-50/50 space-y-1"
                          >
                            <div className="font-bold text-slate-900">
                              {s.bagian}
                            </div>
                            <div className="text-slate-700">
                              Temuan: {s.masalah}
                            </div>
                            <div className="text-indigo-900 font-medium">
                              Saran: {s.rekomendasi}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Seluruh hasil AI bersifat draf bantu dan dapat Anda sesuaikan sebelum dicetak atau diajukan.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
