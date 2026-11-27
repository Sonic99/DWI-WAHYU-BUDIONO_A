import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RotateCw,
  Search,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  BookOpen,
  Link2
} from 'lucide-react';
import { SkpBuktiDukungItem, SkpStatusVerifikasi } from '../types';
import {
  formatEvidenceByteSize,
  getSkpEvidenceFile
} from '../services/skpEvidenceStorage';
import { toPreviewableExternalUrl } from '../utils/skpPresets';

export interface ActiveEvidenceSelection {
  rhkId: string;
  rhkTitle: string;
  bukti: SkpBuktiDukungItem;
}

interface SkpEvidenceReaderPanelProps {
  selection: ActiveEvidenceSelection | null;
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  canVerify: boolean;
  onUpdateVerification: (
    rhkId: string,
    buktiId: string,
    status: SkpStatusVerifikasi,
    catatanPenilai: string
  ) => void;
}

interface ParsedSheetData {
  name: string;
  rows: string[][];
}

export const SkpEvidenceReaderPanel: React.FC<SkpEvidenceReaderPanelProps> = ({
  selection,
  currentIndex,
  totalCount,
  onPrev,
  onNext,
  isFullscreen,
  onToggleFullscreen,
  canVerify,
  onUpdateVerification
}) => {
  const [loadingBinary, setLoadingBinary] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [binaryFileName, setBinaryFileName] = useState<string>('');
  const [binaryMimeType, setBinaryMimeType] = useState<string>('');
  const [textFromFile, setTextFromFile] = useState<string>('');
  const [sheets, setSheets] = useState<ParsedSheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [tableSearch, setTableSearch] = useState('');

  // Reading comfort controls
  const [zoomPct, setZoomPct] = useState(100);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [textScale, setTextScale] = useState<'sm' | 'md' | 'lg'>('md');

  // Assessor note draft
  const [catatanDraft, setCatatanDraft] = useState('');

  const bukti = selection?.bukti || null;

  useEffect(() => {
    setCatatanDraft(bukti?.catatanPenilai || '');
    setZoomPct(100);
    setRotationDeg(0);
    setTableSearch('');
    setActiveSheetIdx(0);
  }, [bukti?.id]);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    setObjectUrl(null);
    setTextFromFile('');
    setSheets([]);
    setBinaryFileName(bukti?.fileName || '');
    setBinaryMimeType(bukti?.mimeType || '');

    if (!bukti || !bukti.hasBinaryBlob) {
      setLoadingBinary(false);
      return;
    }

    setLoadingBinary(true);
    void getSkpEvidenceFile(bukti.id).then(record => {
      if (!active) return;
      setLoadingBinary(false);
      if (!record || !record.buffer) return;

      setBinaryFileName(record.fileName || bukti.fileName || '');
      setBinaryMimeType(record.mimeType || bukti.mimeType || '');

      if (bukti.jenisFile === 'excel') {
        try {
          const wb = XLSX.read(record.buffer, { type: 'array' });
          const parsedSheets: ParsedSheetData[] = wb.SheetNames.map(sheetName => {
            const ws = wb.Sheets[sheetName];
            const aoa = XLSX.utils.sheet_to_json(ws, {
              header: 1,
              raw: false,
              defval: ''
            }) as unknown[][];
            const cleaned = aoa
              .slice(0, 300)
              .map(r => (Array.isArray(r) ? r.map(c => String(c ?? '')) : []));
            return { name: sheetName, rows: cleaned };
          });
          setSheets(parsedSheets);
        } catch {
          setSheets([]);
        }
        return;
      }

      if (bukti.jenisFile === 'text') {
        try {
          const decoder = new TextDecoder('utf-8');
          setTextFromFile(decoder.decode(record.buffer));
        } catch {
          setTextFromFile('');
        }
        return;
      }

      // PDF or Image
      const blob = new Blob([record.buffer], {
        type:
          record.mimeType ||
          (bukti.jenisFile === 'pdf' ? 'application/pdf' : 'image/png')
      });
      createdUrl = URL.createObjectURL(blob);
      setObjectUrl(createdUrl);
    });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [bukti?.id, bukti?.hasBinaryBlob, bukti?.jenisFile]);

  const activeSheet = sheets[activeSheetIdx] || null;
  const filteredSheetRows = useMemo(() => {
    if (!activeSheet) return [];
    const q = tableSearch.trim().toLowerCase();
    if (!q) return activeSheet.rows;
    return activeSheet.rows.filter((row, idx) => {
      if (idx === 0) return true; // Keep header row visible
      return row.some(cell => cell.toLowerCase().includes(q));
    });
  }, [activeSheet, tableSearch]);

  const handleDownloadEvidence = async () => {
    if (!bukti) return;
    if (bukti.hasBinaryBlob) {
      const rec = await getSkpEvidenceFile(bukti.id);
      if (rec?.buffer) {
        const blob = new Blob([rec.buffer], {
          type: rec.mimeType || 'application/octet-stream'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = rec.fileName || bukti.fileName || `${bukti.judul}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    }
    if (bukti.inlinePreviewDataUrl) {
      const a = document.createElement('a');
      a.href = bukti.inlinePreviewDataUrl;
      a.download = bukti.fileName || `${bukti.judul}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    const narrativeText = textFromFile || bukti.teksNarasi;
    if (narrativeText) {
      const blob = new Blob([narrativeText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bukti.judul.replace(/[^a-zA-Z0-9]+/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!selection || !bukti) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 h-full min-h-[460px] flex flex-col items-center justify-center text-center">
        <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
        <h3 className="text-sm font-bold text-slate-800">
          Pembaca Cepat Bukti Dukung SKP
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
          Pilih salah satu berkas bukti dukung pada Rencana Hasil Kerja di sebelah kiri untuk langsung membaca PDF, gambar scan, tabel Excel, ringkasan narasi, atau tautan Drive di sini.
        </p>
      </div>
    );
  }

  const imageSrc = objectUrl || bukti.inlinePreviewDataUrl || '';
  const resolvedLink = bukti.externalUrl ? toPreviewableExternalUrl(bukti.externalUrl) : null;
  const narrativeContent = textFromFile || bukti.teksNarasi || '';
  const textSizeClass =
    textScale === 'lg' ? 'text-[16px] leading-relaxed' : textScale === 'sm' ? 'text-[13px] leading-relaxed' : 'text-[14.5px] leading-relaxed';

  const statusTone =
    bukti.statusVerifikasi === 'Terbaca & Valid'
      ? 'text-emerald-700'
      : bukti.statusVerifikasi === 'Perlu Perbaikan'
      ? 'text-rose-700'
      : 'text-amber-700';

  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden ${
        isFullscreen ? 'fixed inset-3 z-50 shadow-2xl' : 'h-full min-h-[560px]'
      }`}
    >
      {/* Top Reader Navigation & Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={totalCount <= 1 || currentIndex <= 0}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            title="Bukti Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums whitespace-nowrap">
            {totalCount > 0 ? `${currentIndex + 1} / ${totalCount}` : '1 / 1'}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={totalCount <= 1 || currentIndex >= totalCount - 1}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            title="Bukti Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-300 mx-1">|</span>
          <span className="text-xs font-bold text-slate-900 truncate">
            {bukti.judul}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(bukti.jenisFile === 'image' || bukti.jenisFile === 'pdf') && (
            <>
              <button
                type="button"
                onClick={() => setZoomPct(z => Math.max(50, z - 25))}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                title="Perkecil"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-700 w-10 text-center tabular-nums">
                {zoomPct}%
              </span>
              <button
                type="button"
                onClick={() => setZoomPct(z => Math.min(225, z + 25))}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                title="Perbesar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {bukti.jenisFile === 'image' && (
            <button
              type="button"
              onClick={() => setRotationDeg(r => (r + 90) % 360)}
              className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              title="Putar 90 Derajat"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {bukti.jenisFile === 'text' && (
            <div className="inline-flex border border-slate-200 rounded bg-white overflow-hidden">
              {(['sm', 'md', 'lg'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setTextScale(sz)}
                  className={`px-2 py-1 text-[11px] font-semibold ${
                    textScale === sz ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title={`Ukuran teks ${sz.toUpperCase()}`}
                >
                  {sz === 'sm' ? 'A-' : sz === 'md' ? 'A' : 'A+'}
                </button>
              ))}
            </div>
          )}

          {resolvedLink?.openUrl && (
            <a
              href={resolvedLink.openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka</span>
            </a>
          )}

          {(bukti.hasBinaryBlob || bukti.inlinePreviewDataUrl || narrativeContent) && (
            <button
              type="button"
              onClick={handleDownloadEvidence}
              className="px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
              title="Unduh Berkas Asli"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            title={isFullscreen ? 'Keluar Mode Baca Penuh' : 'Mode Baca Layar Penuh'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Executive Summary / Intisari Dokumen */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-slate-500">
          <span className="font-semibold text-slate-700">{bukti.kategori}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            No: {bukti.nomorDokumen || '-'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Tanggal: {bukti.tanggalDokumen || '-'}
          </span>
          {bukti.fileSizeBytes ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatEvidenceByteSize(bukti.fileSizeBytes)}
              </span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className={`font-bold ${statusTone}`}>{bukti.statusVerifikasi}</span>
        </div>

        <p className="text-xs text-slate-800 leading-relaxed">
          <span className="font-semibold text-slate-900">Intisari Bukti: </span>
          {bukti.ringkasanIsi}
        </p>

        <p className="text-[11px] text-slate-500 truncate">
          RHK Terkait: {selection.rhkTitle}
        </p>
      </div>

      {/* Main Content Canvas */}
      <div className="flex-1 bg-slate-100/70 overflow-auto p-4 min-h-[300px]">
        {loadingBinary ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Memuat dokumen bukti dukung...
          </div>
        ) : bukti.jenisFile === 'pdf' ? (
          objectUrl ? (
            <div className="w-full h-full min-h-[420px] bg-white border border-slate-200 rounded overflow-hidden">
              <iframe
                src={objectUrl}
                title={bukti.judul}
                className="w-full h-full min-h-[420px]"
                style={{
                  transform: zoomPct !== 100 ? `scale(${zoomPct / 100})` : undefined,
                  transformOrigin: 'top left',
                  width: zoomPct !== 100 ? `${(100 / zoomPct) * 100}%` : '100%',
                  height: zoomPct !== 100 ? `${(100 / zoomPct) * 100}%` : '100%'
                }}
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded p-6 text-center text-xs text-slate-500">
              Berkas PDF belum tersedia atau tidak ditemukan di penyimpanan lokal.
            </div>
          )
        ) : bukti.jenisFile === 'image' ? (
          imageSrc ? (
            <div className="flex items-start justify-center min-h-[340px]">
              <div className="bg-white border border-slate-200 rounded p-2 shadow-xs overflow-auto max-w-full">
                <img
                  src={imageSrc}
                  alt={bukti.judul}
                  className="block max-w-full h-auto transition-transform duration-150"
                  style={{
                    transform: `scale(${zoomPct / 100}) rotate(${rotationDeg}deg)`,
                    transformOrigin: 'center center'
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded p-6 text-center text-xs text-slate-500">
              <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              Pratinjau gambar tidak tersedia.
            </div>
          )
        ) : bukti.jenisFile === 'excel' ? (
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            {sheets.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <FileSpreadsheet className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                Tidak ada sheet yang dapat ditampilkan. Silakan unduh berkas asli.
              </div>
            ) : (
              <div>
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {sheets.map((s, idx) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => setActiveSheetIdx(idx)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                          activeSheetIdx === idx
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={e => setTableSearch(e.target.value)}
                      placeholder="Cari isi tabel..."
                      className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded bg-white"
                    />
                  </div>
                </div>
                <div className="overflow-auto max-h-[420px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <tbody>
                      {filteredSheetRows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={
                            rIdx === 0
                              ? 'bg-slate-100 font-bold text-slate-800 sticky top-0'
                              : 'border-t border-slate-100 hover:bg-slate-50'
                          }
                        >
                          <td className="px-2.5 py-1.5 border-r border-slate-200 text-slate-400 font-mono text-[11px] w-9 text-center tabular-nums">
                            {rIdx === 0 ? '#' : rIdx}
                          </td>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="px-3 py-1.5 border-r border-slate-100 text-slate-800 whitespace-nowrap"
                            >
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : bukti.jenisFile === 'link' ? (
          <div className="space-y-3 h-full flex flex-col">
            <div className="bg-white border border-slate-200 rounded px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate font-mono text-slate-700">
                  {bukti.externalUrl || '-'}
                </span>
              </div>
              {resolvedLink?.openUrl && (
                <a
                  href={resolvedLink.openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold shrink-0 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Tautan</span>
                </a>
              )}
            </div>

            {resolvedLink?.embedUrl ? (
              <div className="flex-1 min-h-[340px] bg-white border border-slate-200 rounded overflow-hidden">
                <iframe
                  src={resolvedLink.embedUrl}
                  title={bukti.judul}
                  className="w-full h-full min-h-[340px]"
                  allow="autoplay"
                />
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded p-6 text-center text-xs text-slate-500">
                Tautan eksternal belum diisi.
              </div>
            )}

            {bukti.teksNarasi && (
              <div className="bg-white border border-slate-200 rounded p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Catatan Isi Tautan
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                  {bukti.teksNarasi}
                </pre>
              </div>
            )}
          </div>
        ) : (
          /* Mode Baca Teks / Dokumen Narasi */
          <div className="bg-white border border-slate-200 rounded p-6 max-w-[68ch] mx-auto shadow-2xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <h4 className="font-bold text-slate-900 text-sm">{bukti.judul}</h4>
            </div>
            {narrativeContent ? (
              <div className={`whitespace-pre-wrap text-slate-800 ${textSizeClass}`}>
                {narrativeContent}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Tidak ada isi teks narasi. Periksa ringkasan bukti di atas atau unduh lampiran ({binaryFileName || binaryMimeType || 'dokumen'}).
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Assessor Quick Verification Strip */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Verifikasi Keterbacaan & Validitas Bukti
          </span>
          <div className="flex items-center gap-1.5">
            {(
              [
                {
                  val: 'Terbaca & Valid' as SkpStatusVerifikasi,
                  label: 'Terbaca & Valid',
                  activeCls: 'bg-emerald-600 text-white border-emerald-600'
                },
                {
                  val: 'Perlu Perbaikan' as SkpStatusVerifikasi,
                  label: 'Perlu Perbaikan',
                  activeCls: 'bg-rose-600 text-white border-rose-600'
                },
                {
                  val: 'Belum Diperiksa' as SkpStatusVerifikasi,
                  label: 'Belum Diperiksa',
                  activeCls: 'bg-slate-700 text-white border-slate-700'
                }
              ]
            ).map(btn => (
              <button
                key={btn.val}
                type="button"
                disabled={!canVerify}
                onClick={() =>
                  onUpdateVerification(selection.rhkId, bukti.id, btn.val, catatanDraft)
                }
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                  bukti.statusVerifikasi === btn.val
                    ? btn.activeCls
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {btn.val === 'Terbaca & Valid' && (
                  <Check className="w-3 h-3 inline mr-1 -mt-0.5" />
                )}
                {btn.val === 'Perlu Perbaikan' && (
                  <AlertCircle className="w-3 h-3 inline mr-1 -mt-0.5" />
                )}
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={catatanDraft}
            disabled={!canVerify}
            onChange={e => setCatatanDraft(e.target.value)}
            placeholder="Catatan penilai / kepala sekolah terhadap bukti dukung ini..."
            className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {canVerify && (
            <button
              type="button"
              onClick={() =>
                onUpdateVerification(
                  selection.rhkId,
                  bukti.id,
                  bukti.statusVerifikasi,
                  catatanDraft
                )
              }
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shrink-0"
            >
              Simpan Catatan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
