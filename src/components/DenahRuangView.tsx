import React, { useMemo, useState } from 'react';
import { KartuUjianSettings, PanitiaPengawasItem, SchoolProfile, Siswa, User } from '../types';
import { appendAuditLog } from '../services/storageService';
import {
  DenahRoomItem,
  DenahRoomStatusOverride,
  DenahRuangConfig,
  SMAN9_DENAH_ROOMS,
  buildExamRoomOccupancyMap,
  createDefaultDenahConfig,
  getStoredDenahConfig,
  saveStoredDenahConfig
} from '../utils/denahRuangSman9';
import {
  CheckCircle2,
  Compass,
  DoorOpen,
  Edit3,
  MapPin,
  Printer,
  RotateCcw,
  Search,
  Users,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface DenahRuangViewProps {
  profile: SchoolProfile;
  currentUser: User;
  siswaList: Siswa[];
  ujianSettings: KartuUjianSettings;
  panitiaList: PanitiaPengawasItem[];
}

type HighlightMode = 'all' | 'ujian_only' | 'tingkat_X' | 'tingkat_XI' | 'tingkat_XII' | 'blueprint';

const CATEGORY_LABEL: Record<DenahRoomItem['category'], string> = {
  ruang_ujian: 'Ruang Kelas / Ujian',
  laboratorium: 'Laboratorium',
  kantor_admin: 'Kantor & Pimpinan',
  fasilitas_umum: 'Fasilitas & Ibadah',
  taman_lapangan: 'Taman & Lapangan',
  parkir: 'Area Parkir',
  non_aktif: 'Blok Non-Aktif / Cadangan',
  batas_wilayah: 'Batas Wilayah'
};

export const DenahRuangView: React.FC<DenahRuangViewProps> = ({
  profile,
  currentUser,
  siswaList,
  ujianSettings,
  panitiaList
}) => {
  const canEdit = ['admin_tu', 'staf_agenda', 'kepala_sekolah', 'wakasek'].includes(currentUser.role);

  const [config, setConfig] = useState<DenahRuangConfig>(() =>
    getStoredDenahConfig(ujianSettings.tahunPelajaran || '2026 - 2027')
  );
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>('r-1');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const occupancyMap = useMemo(
    () => buildExamRoomOccupancyMap(siswaList, panitiaList),
    [siswaList, panitiaList]
  );

  const updateConfig = (updater: (prev: DenahRuangConfig) => DenahRuangConfig) => {
    setConfig(prev => {
      const next = updater(prev);
      saveStoredDenahConfig(next);
      return next;
    });
  };

  const resetToDefault = () => {
    const fresh = createDefaultDenahConfig(ujianSettings.tahunPelajaran || '2026 - 2027');
    setConfig(fresh);
    saveStoredDenahConfig(fresh);
    appendAuditLog('RESET_DENAH_RUANG', 'Mengembalikan tata letak & label Denah Ruang SMAN 9 Surabaya ke bawaan.');
    setFeedback('Denah dikembalikan ke pengaturan awal SMAN 9 Surabaya.');
  };

  const examRoomsSummary = useMemo(() => {
    const rooms = SMAN9_DENAH_ROOMS.filter(r => typeof r.examRoomNumber === 'number');
    let occupiedCount = 0;
    let totalAssignedStudents = 0;
    rooms.forEach(r => {
      const info = r.examRoomNumber ? occupancyMap[r.examRoomNumber] : undefined;
      if (info && info.studentCount > 0) {
        occupiedCount++;
        totalAssignedStudents += info.studentCount;
      }
    });
    return {
      totalRooms: rooms.length,
      occupiedCount,
      totalAssignedStudents
    };
  }, [occupancyMap]);

  const matchingRoomIds = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return new Set<string>();
    const matches = new Set<string>();
    SMAN9_DENAH_ROOMS.forEach(room => {
      const override = config.overrides[room.id];
      const displayLabel = (override?.customLabel || room.label || '').toLowerCase();
      const info = room.examRoomNumber ? occupancyMap[room.examRoomNumber] : undefined;
      const rombelText = info ? info.rombels.join(' ').toLowerCase() : '';
      if (displayLabel.includes(q) || rombelText.includes(q)) {
        matches.add(room.id);
      }
    });
    return matches;
  }, [searchTerm, config.overrides, occupancyMap]);

  const selectedRoom = useMemo(
    () => SMAN9_DENAH_ROOMS.find(r => r.id === selectedRoomId) || null,
    [selectedRoomId]
  );

  const selectedRoomOverride = selectedRoom ? config.overrides[selectedRoom.id] || {} : {};
  const selectedRoomOccupancy =
    selectedRoom?.examRoomNumber ? occupancyMap[selectedRoom.examRoomNumber] : undefined;

  const resolveRoomFillAndOpacity = (room: DenahRoomItem): { fill: string; opacity: number; textColor: string } => {
    const ov = config.overrides[room.id];
    let fill = room.defaultFill;
    let textColor = room.textColor || '#0f172a';

    if (ov?.statusOverride === 'exam_active') {
      fill = '#bfdbfe';
      textColor = '#0f172a';
    } else if (ov?.statusOverride === 'reserved_red') {
      fill = '#ff0000';
      textColor = '#ffffff';
    } else if (ov?.statusOverride === 'maintenance') {
      fill = '#fed7aa';
      textColor = '#7c2d12';
    }

    if (highlightMode === 'blueprint') {
      if (room.category === 'ruang_ujian') fill = '#dbeafe';
      else if (room.category === 'laboratorium') fill = '#e0f2fe';
      else if (room.category === 'taman_lapangan' || room.category === 'parkir') fill = '#f1f5f9';
      else if (room.category === 'batas_wilayah') fill = '#f8fafc';
      else if (room.category === 'non_aktif') fill = '#fee2e2';
      else fill = '#ffffff';
      textColor = '#0f172a';
    }

    let opacity = 1;
    const hasSearch = searchTerm.trim().length > 0;
    if (hasSearch) {
      opacity = matchingRoomIds.has(room.id) ? 1 : 0.28;
    } else if (highlightMode === 'ujian_only') {
      opacity = room.category === 'ruang_ujian' ? 1 : 0.35;
    } else if (highlightMode.startsWith('tingkat_')) {
      const targetTingkat = highlightMode.replace('tingkat_', '') as 'X' | 'XI' | 'XII';
      const occ = room.examRoomNumber ? occupancyMap[room.examRoomNumber] : undefined;
      const matchesTingkat = Boolean(occ && occ.tingkatSet.has(targetTingkat));
      if (matchesTingkat) {
        fill = targetTingkat === 'X' ? '#bbf7d0' : targetTingkat === 'XI' ? '#bae6fd' : '#fde68a';
        opacity = 1;
      } else {
        opacity = room.category === 'ruang_ujian' ? 0.45 : 0.25;
      }
    }

    return { fill, opacity, textColor };
  };

  const handleUpdateRoomOverride = (roomId: string, patch: Partial<DenahRuangConfig['overrides'][string]>) => {
    updateConfig(prev => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        [roomId]: {
          ...(prev.overrides[roomId] || {}),
          ...patch
        }
      }
    }));
  };

  const pageCssSize = config.paperSize === 'F4' ? '330mm 215mm' : 'A4 landscape';

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          @page {
            size: ${pageCssSize};
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-denah-sman9,
          #printable-denah-sman9 * {
            visibility: visible !important;
          }
          #printable-denah-sman9 {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Top Controls (No Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-700 shrink-0" />
              <h2 className="text-base font-bold text-slate-900">
                Denah Ruang Kelas & Ujian {profile.namaSekolah}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Peta tata letak ruang kelas R-1 sampai R-22, laboratorium, kantor, dan fasilitas sekolah yang tersinkronisasi dengan penempatan ruang ujian siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditingHeader(v => !v)}
                className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingHeader ? 'Tutup Judul' : 'Ubah Judul Denah'}</span>
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={resetToDefault}
                className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Bawaan</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Denah ({config.paperSize} Landscape)</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-md border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button type="button" onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Header Title Editor */}
        {isEditingHeader && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Judul Utama Denah:</label>
              <input
                type="text"
                value={config.title}
                onChange={e => updateConfig(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-semibold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subjudul / Tahun Pelajaran:</label>
              <input
                type="text"
                value={config.subtitle}
                onChange={e => updateConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-semibold"
              />
            </div>
          </div>
        )}

        {/* Compact Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Ruang Kelas / Ujian
            </div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
              {examRoomsSummary.totalRooms} <span className="text-xs font-medium text-slate-500">ruang (R-1 s.d. R-22)</span>
            </div>
          </div>
          <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Ruang Terisi Peserta
            </div>
            <div className="text-lg font-extrabold text-blue-800 tabular-nums mt-0.5">
              {examRoomsSummary.occupiedCount} <span className="text-xs font-medium text-slate-500">ruang aktif</span>
            </div>
          </div>
          <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Peserta Terpetakan
            </div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums mt-0.5">
              {examRoomsSummary.totalAssignedStudents} <span className="text-xs font-medium text-slate-500">siswa</span>
            </div>
          </div>
          <div className="border border-slate-200 rounded-md px-3 py-2 bg-slate-50/70">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Laboratorium
            </div>
            <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
              4 <span className="text-xs font-medium text-slate-500">Lab Kom 2, Fis, Bio, Kim</span>
            </div>
          </div>
        </div>

        {/* Filter, Highlight, Search & Display Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[210px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari R-1..R-22, XII-1, Lab, R. TU..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <select
              value={highlightMode}
              onChange={e => setHighlightMode(e.target.value as HighlightMode)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-semibold text-slate-800"
              aria-label="Mode Sorot Zona Denah"
            >
              <option value="all">Warna Asli Denah SMAN 9</option>
              <option value="ujian_only">Fokus Ruang Ujian (R-1 – R-22)</option>
              <option value="tingkat_X">Sorot Ruang Kelas X</option>
              <option value="tingkat_XI">Sorot Ruang Kelas XI</option>
              <option value="tingkat_XII">Sorot Ruang Kelas XII</option>
              <option value="blueprint">Mode Cetak Bersih (Biru Muda)</option>
            </select>

            <select
              value={config.paperSize}
              onChange={e => updateConfig(prev => ({ ...prev, paperSize: e.target.value as 'A4' | 'F4' }))}
              className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-700"
            >
              <option value="A4">Kertas A4 Landscape</option>
              <option value="F4">Kertas F4 Landscape</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-700">
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.showExamOccupancy}
                onChange={e => updateConfig(prev => ({ ...prev, showExamOccupancy: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Tampilkan Kelas & Jumlah Siswa di R-1..R-22</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.showLegend}
                onChange={e => updateConfig(prev => ({ ...prev, showLegend: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Legenda</span>
            </label>

            <div className="inline-flex items-center border border-slate-200 rounded-md bg-slate-50">
              <button
                type="button"
                onClick={() => setZoomPct(z => Math.max(70, z - 10))}
                className="p-1.5 hover:bg-slate-200/70 text-slate-700"
                title="Perkecil"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono font-semibold tabular-nums">{zoomPct}%</span>
              <button
                type="button"
                onClick={() => setZoomPct(z => Math.min(130, z + 10))}
                className="p-1.5 hover:bg-slate-200/70 text-slate-700"
                title="Perbesar"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Focal Floor Plan + Interactive Room Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Printable Floor Plan Sheet */}
        <div
          id="printable-denah-sman9"
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs overflow-x-auto"
        >
          {/* Formal Centered Serif Header matching SMAN 9 Surabaya template */}
          <div className="text-center mb-3 text-black select-none">
            <h1
              className="text-base sm:text-xl font-bold tracking-tight uppercase leading-snug"
              style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
            >
              {config.title}
            </h1>
            <div
              className="text-sm sm:text-lg font-bold uppercase tracking-wide mt-0.5"
              style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
            >
              {config.subtitle}
            </div>
          </div>

          {/* Interactive SVG Map */}
          <div
            className="mx-auto transition-all"
            style={{ width: `${zoomPct}%`, minWidth: '760px' }}
          >
            <svg
              viewBox="0 0 1200 660"
              className="w-full h-auto block select-none bg-white"
              role="img"
              aria-label="Denah Ruang Kelas dan Ujian SMAN 9 Surabaya"
            >
              {/* Outer Frame & Corridor Gray Ground */}
              <rect
                x={10}
                y={10}
                width={1180}
                height={640}
                fill="#b3b3b3"
                stroke="#0f172a"
                strokeWidth={1.6}
              />

              {/* Render All Architectural Rooms & Zones */}
              {SMAN9_DENAH_ROOMS.map(room => {
                const { fill, opacity, textColor } = resolveRoomFillAndOpacity(room);
                const ov = config.overrides[room.id];
                const displayLabel = ov?.customLabel || room.label;
                const isSelected = selectedRoomId === room.id;
                const occ = room.examRoomNumber ? occupancyMap[room.examRoomNumber] : undefined;
                const showOccBadge =
                  config.showExamOccupancy &&
                  room.category === 'ruang_ujian' &&
                  occ &&
                  occ.studentCount > 0;

                const cx = room.x + room.w / 2;
                const cy = room.y + room.h / 2;
                const angle =
                  typeof room.labelAngle === 'number'
                    ? room.labelAngle
                    : room.rotateLabel
                    ? -90
                    : 0;

                const isVerticalRoom = angle === -90;
                const labelY = showOccBadge && !isVerticalRoom ? cy - 5 : cy + 3.5;

                return (
                  <g
                    key={room.id}
                    opacity={opacity}
                    onClick={() => {
                      if (room.clickable !== false) setSelectedRoomId(room.id);
                    }}
                    className={room.clickable !== false ? 'cursor-pointer' : 'cursor-default'}
                  >
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      fill={fill}
                      stroke={isSelected ? '#1d4ed8' : '#0f172a'}
                      strokeWidth={isSelected ? 2.8 : 0.9}
                    />
                    {displayLabel && (
                      <text
                        x={cx}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={textColor}
                        fontSize={room.fontSize || 10}
                        fontWeight={room.category === 'ruang_ujian' ? 700 : 600}
                        fontFamily="'Source Serif 4', Georgia, serif"
                        transform={angle !== 0 ? `rotate(${angle} ${cx} ${cy})` : undefined}
                      >
                        {displayLabel}
                      </text>
                    )}
                    {showOccBadge && !isVerticalRoom && (
                      <text
                        x={cx}
                        y={cy + 11}
                        textAnchor="middle"
                        fill="#1e3a8a"
                        fontSize={7.5}
                        fontWeight={700}
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {occ.rombels.slice(0, 2).join('/')} ({occ.studentCount})
                      </text>
                    )}
                    {showOccBadge && isVerticalRoom && (
                      <text
                        x={cx}
                        y={room.y + room.h - 6}
                        textAnchor="middle"
                        fill="#1e3a8a"
                        fontSize={6.8}
                        fontWeight={700}
                        fontFamily="'JetBrains Mono', monospace"
                      >
                        {occ.studentCount} sis
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Small decorative architectural detail tiles matching original map */}
              {/* 5 white veranda strips under the 5 red rooms */}
              {[0, 1, 2, 3, 4].map(idx => (
                <rect
                  key={`terrace-${idx}`}
                  x={58 + idx * 78.4}
                  y={438}
                  width={78.4}
                  height={16}
                  fill="#ffffff"
                  stroke="#0f172a"
                  strokeWidth={0.9}
                />
              ))}

              {/* West Taman detail partitions */}
              <rect x={58} y={278} width={17} height={50} fill="#ffd966" stroke="#0f172a" strokeWidth={0.8} />
              <rect x={152} y={278} width={16} height={12.5} fill="#8ea9db" stroke="#0f172a" strokeWidth={0.7} />
              <rect x={152} y={290.5} width={16} height={12.5} fill="#d9e1f2" stroke="#0f172a" strokeWidth={0.7} />
              <rect x={152} y={303} width={16} height={12.5} fill="#fce4d6" stroke="#0f172a" strokeWidth={0.7} />
              <rect x={152} y={315.5} width={16} height={12.5} fill="#2f75b5" stroke="#0f172a" strokeWidth={0.7} />
              <rect x={168} y={278} width={19} height={50} fill="#a9d08e" stroke="#0f172a" strokeWidth={0.8} />
              <text
                x={177.5}
                y={303}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={6.5}
                fontWeight={600}
                fill="#0f172a"
                transform="rotate(-90 177.5 303)"
              >
                TOILET PUTRI
              </text>
              <rect x={187} y={278} width={17} height={50} fill="#bf9000" stroke="#0f172a" strokeWidth={0.8} />

              {/* Walkway Label: LORONG MENUJU LAB KOM */}
              <text
                x={255}
                y={477}
                textAnchor="middle"
                fill="#0f172a"
                fontSize={12.5}
                fontWeight={800}
                letterSpacing={0.5}
                fontFamily="'Source Serif 4', Georgia, serif"
              >
                LORONG MENUJU LAB KOM
              </text>

              {/* North Compass Arrow (U ↑) inside SMAN 5 SBY */}
              {config.showCompass && (
                <g transform="translate(1140, 32)">
                  <text
                    x={0}
                    y={12}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize={20}
                    fontWeight={800}
                    fontFamily="'Plus Jakarta Sans', sans-serif"
                  >
                    U
                  </text>
                  <line x1={0} y1={78} x2={0} y2={26} stroke="#0f172a" strokeWidth={5} />
                  <polygon points="0,18 -8,32 8,32" fill="#0f172a" />
                </g>
              )}
            </svg>
          </div>

          {/* Printable Legend Footer */}
          {config.showLegend && (
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-700">
              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 inline-block border border-slate-700 bg-[#bdd7ee]" />
                  <span>Ruang Kelas / Ujian (R-1 – R-22) & Lab</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 inline-block border border-slate-700 bg-[#9dc3e6]" />
                  <span>Kantor Pimpinan, Aula, Kantin & UKS</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 inline-block border border-slate-700 bg-[#ffd966]" />
                  <span>R. TU, Gubug WiFi & Toilet</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 inline-block border border-slate-700 bg-[#92d050]" />
                  <span>Taman, Lapangan & Halaman Parkir</span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 inline-block border border-slate-700 bg-[#ff0000]" />
                  <span>Blok Non-Aktif / Renovasi</span>
                </div>
              </div>
              <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                <span>Arah Utara (U) ke atas</span>
              </div>
            </div>
          )}
        </div>

        {/* Right-Hand Interactive Room Inspector (No Print) */}
        <aside className="no-print bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4 text-xs">
          {selectedRoom ? (
            <>
              <div className="border-b border-slate-100 pb-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  {CATEGORY_LABEL[selectedRoom.category]}
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {selectedRoomOverride.customLabel || selectedRoom.label || selectedRoom.id}
                </h3>
                {selectedRoom.description && (
                  <p className="text-[11px] text-slate-500 mt-1">{selectedRoom.description}</p>
                )}
              </div>

              {/* Exam Room Live Occupancy from Database */}
              {selectedRoom.examRoomNumber && (
                <div className="border border-slate-200 rounded-md p-3 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <DoorOpen className="w-3.5 h-3.5 text-blue-700" />
                      Data Ruang Ujian {String(selectedRoom.examRoomNumber).padStart(2, '0')}
                    </span>
                    <span className="font-mono tabular-nums text-blue-800">
                      {selectedRoomOccupancy?.studentCount || 0} siswa
                    </span>
                  </div>

                  {selectedRoomOccupancy && selectedRoomOccupancy.studentCount > 0 ? (
                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Kelas / Rombel Peserta:</span>
                        <span className="font-semibold text-slate-900">
                          {selectedRoomOccupancy.rombels.join(', ') || '-'}
                        </span>
                      </div>
                      {selectedRoomOccupancy.proctors.length > 0 && (
                        <div>
                          <span className="text-slate-500 block">Pengawas Terjadwal:</span>
                          <span className="font-medium text-slate-800">
                            {selectedRoomOccupancy.proctors.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Belum ada peserta ujian yang ditempatkan ke ruang ini di Kartu Ujian / Tempel Ruang.
                    </p>
                  )}
                </div>
              )}

              {/* Room Customization Form */}
              {canEdit && selectedRoom.clickable !== false && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Label Tampilan di Denah:
                    </label>
                    <input
                      type="text"
                      value={selectedRoomOverride.customLabel ?? selectedRoom.label}
                      onChange={e =>
                        handleUpdateRoomOverride(selectedRoom.id, { customLabel: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Status / Warna Blok Ruang:
                    </label>
                    <select
                      value={selectedRoomOverride.statusOverride || 'default'}
                      onChange={e =>
                        handleUpdateRoomOverride(selectedRoom.id, {
                          statusOverride: e.target.value as DenahRoomStatusOverride
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium"
                    >
                      <option value="default">Warna Bawaan Denah</option>
                      <option value="exam_active">Aktif Ruang Ujian (Biru Terang)</option>
                      <option value="maintenance">Perbaikan / Cadangan (Oranye)</option>
                      <option value="reserved_red">Non-Aktif / Ditutup (Merah)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Catatan Lokasi / Kapasitas:
                    </label>
                    <textarea
                      rows={2}
                      value={selectedRoomOverride.note || ''}
                      onChange={e =>
                        handleUpdateRoomOverride(selectedRoom.id, { note: e.target.value })
                      }
                      placeholder="Contoh: Kapasitas 36 kursi, lantai 1 sayap selatan..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>
                </div>
              )}

              {/* Quick Jump List for Exam Rooms R-1 to R-22 */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Pilih Cepat R-1 – R-22
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {SMAN9_DENAH_ROOMS.filter(r => typeof r.examRoomNumber === 'number')
                    .sort((a, b) => (a.examRoomNumber || 0) - (b.examRoomNumber || 0))
                    .map(r => {
                      const active = r.id === selectedRoomId;
                      const count = r.examRoomNumber
                        ? occupancyMap[r.examRoomNumber]?.studentCount || 0
                        : 0;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedRoomId(r.id)}
                          className={`py-1 px-1.5 rounded border text-[11px] font-mono font-bold tabular-nums transition-colors ${
                            active
                              ? 'bg-blue-700 text-white border-blue-700'
                              : count > 0
                              ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                          title={`${r.label}${count > 0 ? ` (${count} siswa)` : ''}`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-400">
              Klik salah satu ruangan pada denah untuk melihat detail atau mengubah labelnya.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
