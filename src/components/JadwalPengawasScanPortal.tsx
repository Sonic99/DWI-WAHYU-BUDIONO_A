import React, { useMemo, useState } from 'react';
import {
  PanitiaPengawasItem,
  JadwalPengawasSlot,
  SchoolProfile,
  KartuPanitiaSettings
} from '../types';
import {
  DEFAULT_JADWAL_PENGAWAS_SLOTS,
  DEFAULT_JADWAL_PENGAWAS_KETERANGAN,
  DEFAULT_JADWAL_PENGAWAS_ROWS,
  summarizePengawasSchedule,
  groupSlotsByExamDay,
  classifyAssignment,
  formatSlotAssignmentBadgeText
} from '../utils/pengawasSchedule';
import { ExamCardBarcode } from './ExamCardBarcode';
import {
  QrCode,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CalendarDays,
  X,
  Copy,
  Check,
  ExternalLink,
  Printer,
  ArrowLeft
} from 'lucide-react';

export const buildProctorScheduleScanUrl = (
  item: PanitiaPengawasItem,
  slots: JadwalPengawasSlot[],
  customTemplate?: string
): string => {
  const manualBarcode = (item.barcodeLink || '').trim();
  if (manualBarcode) return manualBarcode;

  const defaultLegacyTpl = 'https://sman9sby.sch.id/ujian/petugas?no={nomorTugas}&nip={nip}';
  const tpl = (customTemplate || '').trim();

  // If user configured a custom non-default external template URL, honor it
  if (tpl && tpl !== defaultLegacyTpl && !tpl.includes('view=jadwal-pengawas')) {
    return tpl
      .replace(/\{nomorTugas\}/gi, encodeURIComponent(item.nomorTugas || ''))
      .replace(/\{nip\}/gi, encodeURIComponent(item.nip || ''))
      .replace(/\{nama\}/gi, encodeURIComponent(item.nama || ''))
      .replace(/\{kategori\}/gi, encodeURIComponent(item.kategori))
      .replace(/\{ruang\}/gi, encodeURIComponent(item.ruangTugas || ''));
  }

  // Live direct shortcut URL pointing to the zoomable interactive proctor schedule portal
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://sman9sby.sch.id';
  const effectiveSlots = slots.length > 0 ? slots : DEFAULT_JADWAL_PENGAWAS_SLOTS;
  const serializedAssignments = effectiveSlots
    .map(s => (item.jadwalMengawas?.[s.id] || '').trim())
    .join(',');

  const params = new URLSearchParams();
  params.set('view', 'jadwal-pengawas');
  params.set('no', item.nomorTugas || '');
  if (item.nama) params.set('nama', item.nama);
  if (serializedAssignments.replace(/,/g, '').length > 0) {
    params.set('s', serializedAssignments);
  }
  return `${origin}/?${params.toString()}`;
};

export const resolveScannedProctorFromQuery = (
  allItems: PanitiaPengawasItem[],
  slots: JadwalPengawasSlot[],
  search: string
): {
  proctor: PanitiaPengawasItem | null;
  allProctors: PanitiaPengawasItem[];
} => {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  if (view !== 'jadwal-pengawas') {
    return { proctor: null, allProctors: [] };
  }

  const no = (params.get('no') || '').trim();
  const namaParam = (params.get('nama') || '').trim();
  const serialized = params.get('s');

  const effectiveSlots = slots.length > 0 ? slots : DEFAULT_JADWAL_PENGAWAS_SLOTS;
  const pengawasList = allItems.filter(i => i.kategori === 'pengawas');

  let matched =
    (no &&
      pengawasList.find(
        p => p.nomorTugas.toLowerCase() === no.toLowerCase()
      )) ||
    (namaParam &&
      pengawasList.find(
        p => p.nama.toLowerCase() === namaParam.toLowerCase()
      )) ||
    null;

  // Fallback against master 33 proctor table if needed
  if (!matched && (no || namaParam)) {
    const seqMatch = no.match(/(\d+)$/);
    const seqNum = seqMatch ? Number(seqMatch[1]) : 0;
    const masterRow =
      DEFAULT_JADWAL_PENGAWAS_ROWS.find(r => r.seq === seqNum) ||
      DEFAULT_JADWAL_PENGAWAS_ROWS.find(
        r => namaParam && r.displayName.toLowerCase().includes(namaParam.toLowerCase())
      );
    if (masterRow) {
      const map: Record<string, string> = {};
      effectiveSlots.forEach((slot, idx) => {
        if (masterRow.assignments[idx]) {
          map[slot.id] = masterRow.assignments[idx];
        }
      });
      matched = {
        id: `scan-${masterRow.seq}`,
        kategori: 'pengawas',
        nomorTugas: no || `PGW-26-${String(masterRow.seq).padStart(3, '0')}`,
        nama: masterRow.displayName,
        nip: '-',
        jabatanKepanitiaan: 'Pengawas Ruang',
        unitAsal: 'Guru Mapel',
        jadwalMengawas: map
      };
    }
  }

  // If QR carried live serialized assignments (?s=...), merge them cleanly so custom edits reflect even on another phone
  if (serialized && (matched || namaParam || no)) {
    const tokens = serialized.split(',');
    const overrideMap: Record<string, string> = {};
    effectiveSlots.forEach((slot, idx) => {
      const val = (tokens[idx] || '').trim();
      if (val) overrideMap[slot.id] = val;
    });
    matched = matched
      ? { ...matched, jadwalMengawas: { ...(matched.jadwalMengawas || {}), ...overrideMap } }
      : {
          id: `scan-custom-${no || '0'}`,
          kategori: 'pengawas',
          nomorTugas: no || 'PGW-26',
          nama: namaParam || 'Pengawas Ruang',
          nip: '-',
          jabatanKepanitiaan: 'Pengawas Ruang',
          unitAsal: 'SMA Negeri 9 Surabaya',
          jadwalMengawas: overrideMap
        };
  }

  return {
    proctor: matched || pengawasList[0] || null,
    allProctors: pengawasList
  };
};

interface JadwalPengawasScanPortalProps {
  proctor: PanitiaPengawasItem;
  allProctors?: PanitiaPengawasItem[];
  slots: JadwalPengawasSlot[];
  profile: SchoolProfile;
  settings: KartuPanitiaSettings;
  isStandalone?: boolean;
  onSelectProctor?: (item: PanitiaPengawasItem) => void;
  onClose?: () => void;
}

export const JadwalPengawasScanPortal: React.FC<JadwalPengawasScanPortalProps> = ({
  proctor,
  allProctors = [],
  slots,
  profile,
  settings,
  isStandalone = false,
  onSelectProctor,
  onClose
}) => {
  const [zoomPct, setZoomPct] = useState<number>(isStandalone ? 100 : 100);
  const [filterKind, setFilterKind] = useState<'all' | 'jaga' | 'cad'>('all');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const effectiveSlots = slots.length > 0 ? slots : DEFAULT_JADWAL_PENGAWAS_SLOTS;
  const summary = useMemo(
    () => summarizePengawasSchedule(proctor.jadwalMengawas, effectiveSlots),
    [proctor.jadwalMengawas, effectiveSlots]
  );
  const dayGroups = useMemo(
    () => groupSlotsByExamDay(effectiveSlots),
    [effectiveSlots]
  );

  const scanUrl = useMemo(
    () => buildProctorScheduleScanUrl(proctor, effectiveSlots, settings.barcodeLinkTemplate),
    [proctor, effectiveSlots, settings.barcodeLinkTemplate]
  );

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Fallback noop if clipboard restricted
    }
  };

  const renderSlotCell = (slot?: JadwalPengawasSlot) => {
    if (!slot) {
      return <div className="text-slate-400 text-center py-2">—</div>;
    }
    const raw = proctor.jadwalMengawas?.[slot.id] || '-';
    const kind = classifyAssignment(raw);
    const matchesFilter =
      filterKind === 'all' ||
      (filterKind === 'jaga' && kind === 'jaga') ||
      (filterKind === 'cad' && kind === 'cad');

    const pillClass =
      kind === 'cad'
        ? 'bg-amber-300 text-slate-950 border-amber-500 font-extrabold'
        : kind === 'off'
        ? 'bg-slate-600 text-white border-slate-700 font-bold'
        : 'bg-emerald-50 text-emerald-950 border-emerald-400 font-extrabold';

    return (
      <div className={`space-y-1 transition-opacity ${matchesFilter ? 'opacity-100' : 'opacity-25'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-bold text-slate-600">{slot.waktu}</span>
          <span className={`px-2 py-0.5 rounded border text-xs font-mono tabular-nums ${pillClass}`}>
            {formatSlotAssignmentBadgeText(raw)}
          </span>
        </div>
        <div className="text-[11px] font-semibold text-slate-800 leading-tight">
          {slot.mapel}
        </div>
      </div>
    );
  };

  const content = (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="no-print px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate">
              Portal Jadwal Mengawas (Hasil Scan Barcode / QR)
            </h3>
            <p className="text-[11px] text-slate-300 truncate">
              {profile.namaSekolah} • {settings.namaUjian} ({settings.tahunPelajaran})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStandalone ? (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = window.location.origin;
                }
              }}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Buka Aplikasi Utama</span>
            </button>
          ) : (
            onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800"
                title="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            )
          )}
        </div>
      </div>

      {/* Proctor Identity + Zoom Controls Bar */}
      <div className="no-print px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          {allProctors.length > 1 && onSelectProctor ? (
            <select
              value={proctor.id}
              onChange={e => {
                const picked = allProctors.find(p => p.id === e.target.value);
                if (picked) onSelectProctor(picked);
              }}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-bold text-slate-900 max-w-[280px]"
            >
              {allProctors.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  {idx + 1}. {p.nama} ({p.nomorTugas})
                </option>
              ))}
            </select>
          ) : (
            <div className="font-bold text-slate-900 text-sm">{proctor.nama}</div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 tabular-nums">
              Jaga: {summary.jaga}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-bold border border-amber-400 tabular-nums">
              CAD: {summary.cad}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-700 text-white font-bold tabular-nums">
              OFF: {summary.off}
            </span>
          </div>
        </div>

        {/* Zoom Out / Zoom In Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-md border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setFilterKind('all')}
              className={`px-2 py-1 rounded text-[11px] font-semibold ${
                filterKind === 'all' ? 'bg-slate-900 text-white' : 'text-slate-700'
              }`}
            >
              Semua ({effectiveSlots.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterKind('jaga')}
              className={`px-2 py-1 rounded text-[11px] font-semibold ${
                filterKind === 'jaga' ? 'bg-emerald-700 text-white' : 'text-slate-700'
              }`}
            >
              Jaga ({summary.jaga})
            </button>
            <button
              type="button"
              onClick={() => setFilterKind('cad')}
              className={`px-2 py-1 rounded text-[11px] font-semibold ${
                filterKind === 'cad' ? 'bg-amber-400 text-slate-950' : 'text-slate-700'
              }`}
            >
              Cadangan ({summary.cad})
            </button>
          </div>

          <div className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-1.5 py-1">
            <button
              type="button"
              onClick={() => setZoomPct(z => Math.max(50, z - 15))}
              className="p-1 rounded hover:bg-slate-100 text-slate-700"
              title="Zoom Out (perkecil tampilan agar semua muat)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-[11px] text-slate-900 w-10 text-center tabular-nums">
              {zoomPct}%
            </span>
            <button
              type="button"
              onClick={() => setZoomPct(z => Math.min(180, z + 15))}
              className="p-1 rounded hover:bg-slate-100 text-slate-700"
              title="Zoom In (perbesar tulisan)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-0.5" />
            {[65, 85, 100, 125].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setZoomPct(preset)}
                className={`px-1.5 py-0.5 rounded font-mono text-[10.5px] font-bold ${
                  zoomPct === preset
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {preset}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => setZoomPct(100)}
              className="p-1 rounded hover:bg-slate-100 text-slate-500"
              title="Reset Zoom 100%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Jadwal</span>
          </button>
        </div>
      </div>

      {/* Scrollable + Zoomable Schedule Canvas */}
      <div className="flex-1 overflow-auto p-5 bg-slate-100/70">
        <div
          style={{ zoom: zoomPct / 100 }}
          className="mx-auto max-w-4xl bg-white border border-slate-300 rounded-xl p-5 shadow-sm print:shadow-none print:border-0"
        >
          {/* Formal Header & QR Shortcut Info */}
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b-2 border-slate-800">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-50 border border-teal-300 text-teal-900 font-bold text-[11px]">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>JADWAL MENGAWAS PRIBADI • {proctor.nomorTugas}</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-950 leading-snug">
                {proctor.nama}
              </h2>
              <div className="text-xs text-slate-700 font-medium flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  NIP: <strong className="font-mono">{proctor.nip || '-'}</strong>
                </span>
                <span>
                  Peran: <strong>{proctor.jabatanKepanitiaan}</strong>
                </span>
                <span>
                  Unit: <strong>{proctor.unitAsal || 'Guru Mapel'}</strong>
                </span>
              </div>
              <div className="text-[11px] font-bold text-slate-800 pt-1">
                {settings.namaUjian} • {profile.namaSekolah} ({settings.tahunPelajaran})
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-300 rounded-lg p-2.5 shrink-0">
              <div className="bg-white p-1 rounded border border-slate-300">
                <ExamCardBarcode value={scanUrl} mode="qr_link" size={64} />
              </div>
              <div className="text-[10.5px] space-y-1 max-w-[165px]">
                <div className="font-extrabold text-slate-900 uppercase">
                  QR Pintasan Jadwal Jaga
                </div>
                <div className="text-slate-600 leading-tight">
                  Scan dengan kamera HP untuk membuka jadwal lengkap pengawas ini kapan saja.
                </div>
                <div className="no-print flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-black text-white font-bold text-[10px] inline-flex items-center gap-1"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-[10px] inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Tab Baru</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Crystal-Clear 8-Day × 2-Session Personal Schedule Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="border border-slate-700 px-3 py-2 text-center w-10">No</th>
                  <th className="border border-slate-700 px-3 py-2 text-left min-w-[140px]">
                    Hari &amp; Tanggal
                  </th>
                  <th className="border border-slate-700 px-3 py-2 text-left w-[38%]">
                    Sesi 1 (Kelas X &amp; XI)
                  </th>
                  <th className="border border-slate-700 px-3 py-2 text-left w-[38%]">
                    Sesi 2 (Kelas XII)
                  </th>
                </tr>
              </thead>
              <tbody>
                {dayGroups.map((dg, idx) => (
                  <tr key={dg.dayKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="border border-slate-400 px-3 py-2.5 text-center font-mono font-bold text-slate-700 tabular-nums align-top">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-400 px-3 py-2.5 align-top">
                      <div className="font-extrabold text-slate-950 text-sm">{dg.hari}</div>
                      <div className="font-mono text-xs font-semibold text-slate-600">
                        {dg.tanggal}
                      </div>
                    </td>
                    <td className="border border-slate-400 px-3 py-2.5 align-top">
                      {renderSlotCell(dg.sesi1)}
                    </td>
                    <td className="border border-slate-400 px-3 py-2.5 align-top">
                      {renderSlotCell(dg.sesi2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Keterangan & Summary */}
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
            <div className="font-bold text-slate-950">Keterangan &amp; Ketentuan Pengawasan:</div>
            {DEFAULT_JADWAL_PENGAWAS_KETERANGAN.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-6 flex items-start justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      {content}
    </div>
  );
};
