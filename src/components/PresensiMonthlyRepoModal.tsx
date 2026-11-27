import React, { useMemo, useState } from 'react';
import {
  PresensiBuktiIzinItem,
  PresensiConfig,
  PresensiMonthlyRepoItem
} from '../types';
import {
  calculateEmployeeMonthlySummary,
  evaluateAttendancePredicate,
  exportPresensiToExcel,
  NAMA_BULAN_ID
} from '../utils/presensiBkd';
import { formatRepoByteSize } from '../services/presensiRepoStorage';
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  FileSpreadsheet,
  FileUp,
  FolderOpen,
  IdCard,
  Layers,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';

interface PresensiMonthlyRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoList: PresensiMonthlyRepoItem[];
  selectedYear: number;
  selectedMonth: number;
  config: PresensiConfig;
  buktiList: PresensiBuktiIzinItem[];
  onArchiveCurrentMonth: (customLabel?: string, customNote?: string) => Promise<void>;
  onLoadArchive: (
    item: PresensiMonthlyRepoItem,
    options: { replaceEmployees: boolean; openIndividualReport?: boolean }
  ) => void;
  onMergeYearArchivesToChart: (year: number) => void;
  onDownloadRawExcel: (item: PresensiMonthlyRepoItem) => Promise<void>;
  onRenameArchive: (id: string, label: string, catatan: string) => Promise<void>;
  onDeleteArchive: (id: string) => Promise<void>;
  onOpenImportModal: () => void;
}

const formatTimestampId = (iso?: string): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = (NAMA_BULAN_ID[d.getMonth()] || '').slice(0, 3);
  const yr = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${mon} ${yr}, ${hh}:${mm}`;
};

export const PresensiMonthlyRepoModal: React.FC<PresensiMonthlyRepoModalProps> = ({
  isOpen,
  onClose,
  repoList,
  selectedYear,
  selectedMonth,
  config,
  buktiList,
  onArchiveCurrentMonth,
  onLoadArchive,
  onMergeYearArchivesToChart,
  onDownloadRawExcel,
  onRenameArchive,
  onDeleteArchive,
  onOpenImportModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [replaceEmployeesOnLoad, setReplaceEmployeesOnLoad] = useState(false);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNote, setEditNote] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [archiveNoteInput, setArchiveNoteInput] = useState('');
  const [archiveLabelInput, setArchiveLabelInput] = useState('');
  const [showArchiveBar, setShowArchiveBar] = useState(false);

  const availableYears = useMemo(() => {
    const s = new Set<number>([selectedYear, 2025, 2026, 2027]);
    repoList.forEach(item => s.add(item.year));
    return Array.from(s).sort((a, b) => b - a);
  }, [repoList, selectedYear]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return repoList.filter(item => {
      if (yearFilter !== 'ALL' && item.year !== Number(yearFilter)) return false;
      if (!q) return true;
      const bulanName = (NAMA_BULAN_ID[item.month - 1] || '').toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        bulanName.includes(q) ||
        String(item.year).includes(q) ||
        (item.fileName || '').toLowerCase().includes(q) ||
        (item.catatan || '').toLowerCase().includes(q)
      );
    });
  }, [repoList, searchQuery, yearFilter]);

  const statsSummary = useMemo(() => {
    const uniqueMonths = new Set(repoList.map(r => `${r.year}-${r.month}`)).size;
    const rawExcelCount = repoList.filter(r => r.hasRawExcelFile).length;
    const yearCountForSelected = repoList.filter(r => r.year === selectedYear).length;
    return {
      totalArchives: repoList.length,
      uniqueMonths,
      rawExcelCount,
      yearCountForSelected
    };
  }, [repoList, selectedYear]);

  if (!isOpen) return null;

  const activeBulanLabel = NAMA_BULAN_ID[selectedMonth - 1] || String(selectedMonth);

  const handleSaveCurrent = async () => {
    setIsSavingCurrent(true);
    try {
      await onArchiveCurrentMonth(archiveLabelInput, archiveNoteInput);
      setArchiveLabelInput('');
      setArchiveNoteInput('');
      setShowArchiveBar(false);
    } finally {
      setIsSavingCurrent(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 flex items-center justify-center p-3 sm:p-5 print:hidden">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Archive className="w-4.5 h-4.5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                Repositori Data Excel Kehadiran Per Bulan
              </h2>
              <p className="text-[11.5px] text-slate-300 truncate">
                Arsip permanen file impor Excel &amp; rekap bulanan GTK untuk dimunculkan dan dicetak ulang kapan saja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setArchiveLabelInput(`Arsip ${activeBulanLabel} ${selectedYear}`);
                setShowArchiveBar(v => !v);
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Arsipkan {activeBulanLabel} {selectedYear}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Tutup Repositori"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Drawer: Archive Current Month Snapshot */}
        {showArchiveBar && (
          <div className="px-5 py-3.5 bg-emerald-50 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                Label Arsip Bulan Aktif ({activeBulanLabel} {selectedYear})
              </label>
              <input
                type="text"
                value={archiveLabelInput}
                onChange={e => setArchiveLabelInput(e.target.value)}
                placeholder={`Contoh: Rekap BKD Final ${activeBulanLabel} ${selectedYear}`}
                className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                Catatan Pelaporan (Opsional)
              </label>
              <input
                type="text"
                value={archiveNoteInput}
                onChange={e => setArchiveNoteInput(e.target.value)}
                placeholder="Misal: Sudah verifikasi SPTJM & Dinas Luar"
                className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSaveCurrent}
                disabled={isSavingCurrent}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                {isSavingCurrent ? 'Menyimpan...' : 'Simpan ke Repositori'}
              </button>
              <button
                onClick={() => setShowArchiveBar(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Metrics & Filter Strip */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 tabular-nums">
            <div>
              <span className="font-bold text-slate-900">{statsSummary.totalArchives}</span>{' '}
              arsip tersimpan
            </div>
            <span aria-hidden="true" className="text-slate-300">
              |
            </span>
            <div>
              <span className="font-bold text-slate-900">{statsSummary.uniqueMonths}</span>{' '}
              periode bulan unik
            </div>
            <span aria-hidden="true" className="text-slate-300">
              |
            </span>
            <div>
              <span className="font-bold text-emerald-700">{statsSummary.rawExcelCount}</span>{' '}
              file Excel asli tersimpan
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari bulan, file, label..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 cursor-pointer"
            >
              <option value="ALL">Semua Tahun</option>
              {availableYears.map(yr => (
                <option key={yr} value={String(yr)}>
                  Tahun {yr}
                </option>
              ))}
            </select>

            {statsSummary.yearCountForSelected > 0 && (
              <button
                onClick={() => onMergeYearArchivesToChart(selectedYear)}
                className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                title={`Gabungkan seluruh arsip tahun ${selectedYear} agar tampil di grafik tren tahunan`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                <span>Muat Tren {selectedYear}</span>
              </button>
            )}
          </div>
        </div>

        {/* Load Behavior Option Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={replaceEmployeesOnLoad}
              onChange={e => setReplaceEmployeesOnLoad(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              Saat memuat arsip, ganti daftar GTK aktif mengikuti daftar pada arsip bulan tersebut
              (default: gabungkan agar data bulan lain tetap utuh)
            </span>
          </label>

          <button
            onClick={() => {
              onClose();
              onOpenImportModal();
            }}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Impor File Excel Baru</span>
          </button>
        </div>

        {/* Archive List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200 bg-white">
          {filteredList.length === 0 ? (
            <div className="py-14 px-6 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {repoList.length === 0
                  ? 'Belum Ada Arsip Kehadiran Bulanan'
                  : 'Tidak Ada Arsip yang Cocok'}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {repoList.length === 0
                  ? 'Setiap kali Anda mengimpor file Excel Log BKD, atau menekan tombol Arsipkan di atas, data per bulan beserta file Excel aslinya akan tersimpan di sini agar dapat dimunculkan kembali sewaktu-waktu untuk pelaporan.'
                  : 'Coba ubah kata kunci pencarian atau pilih filter Semua Tahun.'}
              </p>
              {repoList.length === 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenImportModal();
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Impor Excel BKD</span>
                  </button>
                  <button
                    onClick={() => {
                      setArchiveLabelInput(`Arsip ${activeBulanLabel} ${selectedYear}`);
                      setShowArchiveBar(true);
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg cursor-pointer"
                  >
                    Arsipkan {activeBulanLabel} {selectedYear}
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredList.map(item => {
              const bulanName = NAMA_BULAN_ID[item.month - 1] || `Bulan ${item.month}`;
              const isCurrentPeriod =
                item.year === selectedYear && item.month === selectedMonth;
              const isExpanded = expandedPreviewId === item.id;
              const isEditing = editingId === item.id;
              const isConfirmingDelete = confirmDeleteId === item.id;

              return (
                <div
                  key={item.id}
                  className={`px-5 py-4 transition-colors ${
                    isCurrentPeriod ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    {/* Left Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {isEditing ? (
                        <div className="space-y-2 max-w-xl">
                          <input
                            type="text"
                            value={editLabel}
                            onChange={e => setEditLabel(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Label arsip"
                          />
                          <input
                            type="text"
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Catatan pelaporan (opsional)"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                await onRenameArchive(item.id, editLabel, editNote);
                                setEditingId(null);
                              }}
                              className="px-3 py-1 text-xs font-semibold bg-emerald-700 text-white rounded-md flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Simpan</span>
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-md cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {bulanName} {item.year}
                            </h4>
                            <span aria-hidden="true" className="text-slate-300">
                              —
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {item.label}
                            </span>
                            {isCurrentPeriod && (
                              <span className="text-[11px] font-semibold text-emerald-700">
                                · Periode Aktif di Layar
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 tabular-nums">
                            <span>
                              {item.sourceType === 'excel_import'
                                ? `Impor Excel${item.fileName ? `: ${item.fileName}` : ''}`
                                : 'Snapshot Manual'}
                            </span>
                            {item.fileSizeBytes ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{formatRepoByteSize(item.fileSizeBytes)}</span>
                              </>
                            ) : null}
                            <span aria-hidden="true">·</span>
                            <span>
                              {item.employeeCount} GTK ({item.guruCount} Guru, {item.tendikCount} Tendik)
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-700">
                              {item.avgPersentaseHadir}% Hadir
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.totalTerlambatHari} Terlambat</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.totalAlpa} Alpha</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-slate-500 tabular-nums">
                            <span>Diarsipkan {formatTimestampId(item.updatedAt || item.importedAt)}</span>
                            {item.importedBy && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Oleh {item.importedBy}</span>
                              </>
                            )}
                            {item.hasRawExcelFile && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-700 font-medium">
                                  File Excel asli tersedia
                                </span>
                              </>
                            )}
                          </div>

                          {item.catatan && (
                            <p className="text-xs text-slate-600 pt-0.5">
                              Catatan: {item.catatan}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        onClick={() =>
                          onLoadArchive(item, {
                            replaceEmployees: replaceEmployeesOnLoad,
                            openIndividualReport: false
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        title="Muat data bulan ini ke tabel dan grafik untuk pelaporan"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Muat &amp; Laporkan</span>
                      </button>

                      <button
                        onClick={() =>
                          onLoadArchive(item, {
                            replaceEmployees: replaceEmployeesOnLoad,
                            openIndividualReport: true
                          })
                        }
                        className="px-2.5 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        title="Muat data dan langsung buka Studio Laporan Per Guru"
                      >
                        <IdCard className="w-3.5 h-3.5" />
                        <span>Per Guru</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (item.hasRawExcelFile) {
                            await onDownloadRawExcel(item);
                          } else {
                            exportPresensiToExcel(
                              item.employees,
                              item.monthAttendanceMap,
                              config,
                              item.year,
                              item.month,
                              buktiList
                            );
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        title={
                          item.hasRawExcelFile
                            ? 'Unduh kembali file Excel asli yang diunggah'
                            : 'Ekspor ulang workbook Log BKD dari snapshot arsip'
                        }
                      >
                        {item.hasRawExcelFile ? (
                          <Download className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                        )}
                        <span>{item.hasRawExcelFile ? 'Excel Asli' : 'Ekspor BKD'}</span>
                      </button>

                      {item.hasRawExcelFile && (
                        <button
                          onClick={() =>
                            exportPresensiToExcel(
                              item.employees,
                              item.monthAttendanceMap,
                              config,
                              item.year,
                              item.month,
                              buktiList
                            )
                          }
                          className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                          title="Ekspor ulang dalam format Log BKD lengkap + Rekap Predikat"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-sky-700" />
                          <span>Format BKD</span>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setExpandedPreviewId(isExpanded ? null : item.id)
                        }
                        className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>Ringkasan</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditLabel(item.label);
                          setEditNote(item.catatan || '');
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg cursor-pointer"
                        title="Ubah label & catatan arsip"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              await onDeleteArchive(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 text-xs text-slate-600 border border-slate-300 rounded-lg cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 rounded-lg cursor-pointer"
                          title="Hapus arsip dari repositori"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Inline Preview Table */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-700 mb-2">
                        Pratinjau Rekap Kehadiran GTK ({bulanName} {item.year})
                      </div>
                      <div className="overflow-x-auto max-h-56 border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead className="bg-slate-100 text-slate-700 sticky top-0">
                            <tr>
                              <th className="px-2.5 py-1.5 border-b border-slate-200 w-8">No</th>
                              <th className="px-2.5 py-1.5 border-b border-slate-200">Nama GTK</th>
                              <th className="px-2.5 py-1.5 border-b border-slate-200">NIP / Status</th>
                              <th className="px-2.5 py-1.5 border-b border-slate-200 text-right tabular-nums">Hadir</th>
                              <th className="px-2.5 py-1.5 border-b border-slate-200 text-right tabular-nums">Telat</th>
                              <th className="px-2.5 py-1.5 border-b border-slate-200 text-right tabular-nums">I/S/C</th>
                              <th className="px-2.5 py-1.5 border-b border-slate-200 text-right tabular-nums">Alpa</th>
                              <th className="px-2.5 py-1.5 border-b border-slate-200 text-right tabular-nums">% Hadir</th>
                              <th className="px-2.5 py-1.5 border-b border-slate-200">Predikat</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 tabular-nums">
                            {item.employees.slice(0, 30).map((emp, idx) => {
                              const sum = calculateEmployeeMonthlySummary(
                                emp,
                                item.monthAttendanceMap[emp.id],
                                config,
                                item.year,
                                item.month
                              );
                              const pred = evaluateAttendancePredicate(sum);
                              return (
                                <tr key={emp.id} className="hover:bg-slate-50">
                                  <td className="px-2.5 py-1 text-slate-500">{idx + 1}</td>
                                  <td className="px-2.5 py-1 font-medium text-slate-900">
                                    {emp.nama}
                                  </td>
                                  <td className="px-2.5 py-1 text-slate-600 font-mono text-[10px]">
                                    {emp.nip} · {emp.statusKepegawaian}
                                  </td>
                                  <td className="px-2.5 py-1 text-right text-emerald-700 font-semibold">
                                    {sum.hadirTepat}
                                  </td>
                                  <td className="px-2.5 py-1 text-right text-amber-700">
                                    {sum.terlambatHari}
                                  </td>
                                  <td className="px-2.5 py-1 text-right text-slate-700">
                                    {sum.izin + sum.sakit + sum.cuti}
                                  </td>
                                  <td className="px-2.5 py-1 text-right text-rose-700">
                                    {sum.alpa}
                                  </td>
                                  <td className="px-2.5 py-1 text-right font-bold text-slate-900">
                                    {sum.persentaseHadir}%
                                  </td>
                                  <td className="px-2.5 py-1 font-semibold text-slate-800">
                                    {pred.shortLabel}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {item.employees.length > 30 && (
                        <div className="text-[11px] text-slate-500 mt-1.5">
                          Menampilkan 30 dari {item.employees.length} GTK. Klik &quot;Muat &amp; Laporkan&quot; untuk melihat dan mencetak seluruh data.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
