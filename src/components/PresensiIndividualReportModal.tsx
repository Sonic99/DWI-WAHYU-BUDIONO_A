import React, { useMemo, useState } from 'react';
import {
  DailyPresensiRecord,
  EmployeeMonthlyPresensiSummary,
  PresensiConfig,
  PresensiEmployeeItem,
  PresensiHolidayItem,
  PresensiStatusType,
  SchoolProfile
} from '../types';
import {
  evaluateAttendancePredicate,
  NAMA_HARI_SINGKAT,
  PRESENSI_PREDICATE_SCALE,
  STATUS_PRESENSI_META
} from '../utils/presensiBkd';
import { OfficialKopSurat } from './OfficialKopSurat';
import { KepalaSekolahSignatureSvg, SchoolStampSvg } from './OfficialStamps';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  IdCard,
  LayoutTemplate,
  Palette,
  Printer,
  Type,
  X
} from 'lucide-react';

export type IndividualUiTemplateId =
  | 'klasik-dinas'
  | 'eksekutif-modern'
  | 'jurnal-editorial'
  | 'slip-audit';

export type IndividualFontPresetId =
  | 'auto'
  | 'times-dinas'
  | 'playfair-lora'
  | 'outfit-jakarta'
  | 'bricolage-manrope'
  | 'barlow-inter';

export type IndividualColorThemeId = 'emerald' | 'navy' | 'bronze' | 'mono';

interface FontPairSpec {
  id: IndividualFontPresetId;
  label: string;
  headingFont: string;
  bodyFont: string;
  monoFont: string;
}

const FONT_PAIRS: Record<Exclude<IndividualFontPresetId, 'auto'>, FontPairSpec> = {
  'times-dinas': {
    id: 'times-dinas',
    label: 'Times New Roman · Naskah Dinas',
    headingFont: "'Times New Roman', Georgia, serif",
    bodyFont: "'Times New Roman', Georgia, serif",
    monoFont: "'JetBrains Mono', 'Courier New', monospace"
  },
  'playfair-lora': {
    id: 'playfair-lora',
    label: 'Playfair Display + Lora · Editorial',
    headingFont: "'Playfair Display', Georgia, serif",
    bodyFont: "'Lora', Georgia, serif",
    monoFont: "'JetBrains Mono', monospace"
  },
  'outfit-jakarta': {
    id: 'outfit-jakarta',
    label: 'Outfit + Jakarta Sans · Eksekutif',
    headingFont: "'Outfit', 'Plus Jakarta Sans', sans-serif",
    bodyFont: "'Plus Jakarta Sans', sans-serif",
    monoFont: "'JetBrains Mono', monospace"
  },
  'bricolage-manrope': {
    id: 'bricolage-manrope',
    label: 'Bricolage + Manrope · Kontemporer',
    headingFont: "'Bricolage Grotesque', 'Manrope', sans-serif",
    bodyFont: "'Manrope', sans-serif",
    monoFont: "'JetBrains Mono', monospace"
  },
  'barlow-inter': {
    id: 'barlow-inter',
    label: 'Barlow Condensed + Inter · Padat',
    headingFont: "'Barlow Condensed', 'Inter', sans-serif",
    bodyFont: "'Inter', 'Plus Jakarta Sans', sans-serif",
    monoFont: "'JetBrains Mono', monospace"
  }
};

const TEMPLATE_DEFAULT_FONT: Record<
  IndividualUiTemplateId,
  Exclude<IndividualFontPresetId, 'auto'>
> = {
  'klasik-dinas': 'times-dinas',
  'eksekutif-modern': 'outfit-jakarta',
  'jurnal-editorial': 'playfair-lora',
  'slip-audit': 'barlow-inter'
};

interface ThemePaletteSpec {
  id: IndividualColorThemeId;
  label: string;
  primaryBg: string;
  primaryText: string;
  softBg: string;
  softBorder: string;
  accentText: string;
  tableHeadBg: string;
  tableHeadText: string;
  ruleColor: string;
}

const COLOR_THEMES: Record<IndividualColorThemeId, ThemePaletteSpec> = {
  emerald: {
    id: 'emerald',
    label: 'Zamrud',
    primaryBg: '#064e3b',
    primaryText: '#ffffff',
    softBg: '#ecfdf5',
    softBorder: '#a7f3d0',
    accentText: '#065f46',
    tableHeadBg: '#064e3b',
    tableHeadText: '#ffffff',
    ruleColor: '#059669'
  },
  navy: {
    id: 'navy',
    label: 'Biru Dinas',
    primaryBg: '#0f172a',
    primaryText: '#ffffff',
    softBg: '#f1f5f9',
    softBorder: '#cbd5e1',
    accentText: '#1e3a8a',
    tableHeadBg: '#1e293b',
    tableHeadText: '#ffffff',
    ruleColor: '#1d4ed8'
  },
  bronze: {
    id: 'bronze',
    label: 'Perunggu',
    primaryBg: '#451a03',
    primaryText: '#fef3c7',
    softBg: '#fafaf9',
    softBorder: '#d6d3d1',
    accentText: '#78350f',
    tableHeadBg: '#292524',
    tableHeadText: '#fafaf9',
    ruleColor: '#9a3412'
  },
  mono: {
    id: 'mono',
    label: 'Hitam-Putih',
    primaryBg: '#111827',
    primaryText: '#ffffff',
    softBg: '#f9fafb',
    softBorder: '#9ca3af',
    accentText: '#111827',
    tableHeadBg: '#e5e7eb',
    tableHeadText: '#000000',
    ruleColor: '#111827'
  }
};

const formatRupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Math.round(n || 0));

/**
 * Komponen Tanda Tangan & Stempel Sekolah Menyatu (Wet-Ink Composite):
 * Menempatkan stempel resmi secara absolut melintasi sisi kiri-tengah tanda tangan
 * dengan `mix-blend-multiply` sehingga tinta stempel dan goresan tanda tangan menyatu
 * alami di atas kertas laporan tanpa kotak putih penutup.
 */
export const OfficialMergedSignatureBlock: React.FC<{
  topLabel?: string;
  jabatan: string;
  nama: string;
  nip: string;
  schoolName?: string;
  includeStampAndTtd: boolean;
  resolvedTtdUrl?: string;
  resolvedStempelUrl?: string;
  compact?: boolean;
  monoMode?: boolean;
}> = ({
  topLabel,
  jabatan,
  nama,
  nip,
  schoolName,
  includeStampAndTtd,
  resolvedTtdUrl,
  resolvedStempelUrl,
  compact = false,
  monoMode = false
}) => {
  return (
    <div
      className={`text-center relative select-none ${
        compact ? 'min-w-[185px]' : 'min-w-[225px]'
      }`}
    >
      {topLabel ? (
        <div className={compact ? 'text-[8.5px]' : 'text-[10.5px]'}>{topLabel}</div>
      ) : (
        <div className={compact ? 'text-[8.5px]' : 'text-[10.5px]'}>Mengetahui,</div>
      )}
      <div className={`font-bold leading-snug ${compact ? 'text-[8.5px]' : 'text-[10.5px]'}`}>
        {jabatan}
      </div>

      {/* Kanvas Penggabungan TTD + Stempel Basah */}
      <div
        className={`relative mx-auto flex items-center justify-center overflow-visible isolate ${
          compact ? 'h-[52px] w-[180px]' : 'h-[64px] w-[216px] my-0.5'
        }`}
      >
        {includeStampAndTtd && (
          <>
            {/* Stempel Sekolah: bertumpuk presisi pada sisi kiri-tengah TTD & tepi jabatan */}
            <div
              className={`absolute pointer-events-none select-none z-20 -rotate-6 ${
                compact
                  ? 'left-[20px] -top-[9px] w-[66px] h-[66px]'
                  : 'left-[22px] -top-[10px] w-[78px] h-[78px]'
              } ${monoMode ? 'grayscale contrast-125' : ''}`}
              style={{ mixBlendMode: 'multiply', opacity: 0.88 }}
            >
              {resolvedStempelUrl ? (
                <img
                  src={resolvedStempelUrl}
                  alt="Stempel Resmi Sekolah"
                  className="w-full h-full object-contain"
                />
              ) : (
                <SchoolStampSvg schoolName={schoolName} className="w-full h-full" />
              )}
            </div>

            {/* Tanda Tangan Kepala Sekolah: menyapu ke kanan menembus lingkaran stempel */}
            <div
              className={`relative z-10 pointer-events-none select-none ${
                compact ? 'pl-5' : 'pl-6'
              } ${monoMode ? 'grayscale contrast-150' : ''}`}
              style={{ mixBlendMode: 'multiply' }}
            >
              {resolvedTtdUrl ? (
                <img
                  src={resolvedTtdUrl}
                  alt="Tanda Tangan Kepala Sekolah"
                  className={
                    compact
                      ? 'h-[44px] max-w-[126px] object-contain'
                      : 'h-[54px] max-w-[146px] object-contain'
                  }
                />
              ) : (
                <KepalaSekolahSignatureSvg
                  className={compact ? 'w-[104px] h-[44px]' : 'w-[124px] h-[52px]'}
                />
              )}
            </div>
          </>
        )}
      </div>

      <div
        className={`font-bold underline underline-offset-2 relative z-0 ${
          compact ? 'text-[9px]' : 'text-[11px]'
        }`}
      >
        {nama}
      </div>
      <div
        className={`font-mono tabular-nums ${
          compact ? 'text-[8px]' : 'text-[9.5px]'
        } text-slate-700`}
      >
        NIP. {nip}
      </div>
    </div>
  );
};

export interface PresensiIndividualReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SchoolProfile;
  config: PresensiConfig;
  employees: PresensiEmployeeItem[];
  selectedEmp: PresensiEmployeeItem;
  onSelectEmp: (id: string) => void;
  summary: EmployeeMonthlyPresensiSummary;
  dayColumns: {
    day: number;
    dateStr: string;
    dayName: string;
    isWeekend: boolean;
    holiday?: PresensiHolidayItem;
  }[];
  empRecords: Record<string, DailyPresensiRecord>;
  selectedYear: number;
  selectedMonth: number;
  bulanLabel: string;
  daysCount: number;
  paperSize: 'F4' | 'A4';
  onChangePaperSize: (p: 'F4' | 'A4') => void;
  includeTtdStamp: boolean;
  onChangeIncludeTtdStamp: (v: boolean) => void;
  resolvedTtdUrl?: string;
  resolvedStempelUrl?: string;
  onTriggerPrint: () => void;
}

export const PresensiIndividualReportModal: React.FC<PresensiIndividualReportModalProps> = ({
  isOpen,
  onClose,
  profile,
  config,
  employees,
  selectedEmp,
  onSelectEmp,
  summary,
  dayColumns,
  empRecords,
  selectedYear,
  selectedMonth,
  bulanLabel,
  daysCount,
  paperSize,
  onChangePaperSize,
  includeTtdStamp,
  onChangeIncludeTtdStamp,
  resolvedTtdUrl,
  resolvedStempelUrl,
  onTriggerPrint
}) => {
  const [templateId, setTemplateId] = useState<IndividualUiTemplateId>('eksekutif-modern');
  const [fontPreset, setFontPreset] = useState<IndividualFontPresetId>('auto');
  const [colorThemeId, setColorThemeId] = useState<IndividualColorThemeId>('emerald');
  const [fontScalePct, setFontScalePct] = useState<number>(100);
  const [showKopSurat, setShowKopSurat] = useState<boolean>(true);
  const [showCalendarGrid, setShowCalendarGrid] = useState<boolean>(true);
  const [showNarrative, setShowNarrative] = useState<boolean>(true);
  const [showPredicateSection, setShowPredicateSection] = useState<boolean>(true);

  const effectiveFontKey: Exclude<IndividualFontPresetId, 'auto'> =
    fontPreset === 'auto' ? TEMPLATE_DEFAULT_FONT[templateId] : fontPreset;
  const activeFonts = FONT_PAIRS[effectiveFontKey];
  const theme = COLOR_THEMES[colorThemeId];
  const isMono = colorThemeId === 'mono';

  const currentEmpIdx = useMemo(
    () => employees.findIndex(e => e.id === selectedEmp.id),
    [employees, selectedEmp.id]
  );

  const handlePrevEmp = () => {
    if (employees.length === 0) return;
    const prevIdx = currentEmpIdx <= 0 ? employees.length - 1 : currentEmpIdx - 1;
    onSelectEmp(employees[prevIdx].id);
  };

  const handleNextEmp = () => {
    if (employees.length === 0) return;
    const nextIdx = currentEmpIdx >= employees.length - 1 ? 0 : currentEmpIdx + 1;
    onSelectEmp(employees[nextIdx].id);
  };

  // Calendar alignment offset (Senin = 0 .. Minggu = 6)
  const calendarLeadBlanks = useMemo(() => {
    const firstDayJs = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0=Min,1=Sen
    return firstDayJs === 0 ? 6 : firstDayJs - 1;
  }, [selectedYear, selectedMonth]);

  const firstHalfCols = useMemo(() => dayColumns.slice(0, 16), [dayColumns]);
  const secondHalfCols = useMemo(() => dayColumns.slice(16), [dayColumns]);

  const predicate = useMemo(
    () => evaluateAttendancePredicate(summary),
    [summary]
  );

  const disciplineEvaluation = useMemo(() => {
    const pct = summary.persentaseHadir;
    const dinasLuarCount = summary.dinasLuar;
    const narrative = `${selectedEmp.nama} tercatat melaksanakan kewajiban kedinasan selama ${
      summary.hariKerjaEfektif
    } hari kerja efektif pada bulan ${bulanLabel} ${selectedYear}, dengan capaian kehadiran efektif sebesar ${pct}% (${
      summary.hadirTepat
    } hari hadir tepat waktu${
      summary.terlambatHari > 0
        ? `, ${summary.terlambatHari} kali terlambat dengan akumulasi ${summary.totalMenitTerlambat} menit`
        : ', tanpa catatan keterlambatan'
    }${dinasLuarCount > 0 ? `, serta ${dinasLuarCount} hari penugasan dinas luar` : ''}).${
      summary.potonganPersen > 0
        ? ` Sesuai ketentuan perhitungan bobot TPP, tercatat penyesuaian sebesar ${summary.potonganPersen}% (${formatRupiah(
            summary.potonganNominalRp
          )}).`
        : ' Tidak terdapat pemotongan tunjangan kinerja (TPP utuh 100%).'
    }`;

    return { rating: predicate.shortLabel, narrative, dinasLuarCount };
  }, [summary, selectedEmp.nama, bulanLabel, selectedYear, predicate.shortLabel]);

  if (!isOpen) return null;

  const scaleRatio = fontScalePct / 100;

  const getStatusInlineBadgeStyle = (st: PresensiStatusType): React.CSSProperties => {
    if (isMono) {
      return {
        color: st === 'LIBUR' ? '#6b7280' : '#000000',
        backgroundColor: st === 'LIBUR' ? '#f3f4f6' : 'transparent',
        borderColor: '#9ca3af'
      };
    }
    switch (st) {
      case 'HADIR':
        return { color: '#065f46', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' };
      case 'TERLAMBAT':
        return { color: '#92400e', backgroundColor: '#fffbeb', borderColor: '#fcd34d' };
      case 'DL_PENUH':
      case 'DL_MASUK':
      case 'DL_PULANG':
        return { color: '#1e40af', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' };
      case 'LUPA_ABSEN':
        return { color: '#9a3412', backgroundColor: '#fff7ed', borderColor: '#fed7aa' };
      case 'SAKIT':
      case 'IZIN':
      case 'CUTI':
        return { color: '#5b21b6', backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' };
      case 'ALPA':
        return { color: '#9f1239', backgroundColor: '#fff1f2', borderColor: '#fecdd3' };
      default:
        return { color: '#475569', backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' };
    }
  };

  const renderSplitHalfTable = (cols: typeof dayColumns, variant: 'editorial' | 'modern' | 'slip') => (
    <table className="presensi-individu-table w-full border-collapse text-[10px]">
      <thead>
        <tr
          style={
            variant === 'editorial'
              ? {
                  borderTop: `1.5px solid ${theme.ruleColor}`,
                  borderBottom: `1.5px solid ${theme.ruleColor}`,
                  color: theme.accentText,
                  backgroundColor: isMono ? '#f3f4f6' : theme.softBg
                }
              : {
                  backgroundColor: theme.tableHeadBg,
                  color: theme.tableHeadText
                }
          }
        >
          <th className="py-1.5 px-1.5 text-center font-bold w-8 border border-slate-300">Tgl</th>
          <th className="py-1.5 px-1.5 text-center font-bold w-10 border border-slate-300">Hari</th>
          <th className="py-1.5 px-1.5 text-left font-bold border border-slate-300">Status</th>
          <th className="py-1.5 px-1.5 text-center font-bold w-12 border border-slate-300">Masuk</th>
          <th className="py-1.5 px-1.5 text-center font-bold w-12 border border-slate-300">Pulang</th>
          <th className="py-1.5 px-1 text-center font-bold w-10 border border-slate-300">Telat</th>
        </tr>
      </thead>
      <tbody>
        {cols.map(col => {
          const rec = empRecords[col.dateStr];
          const st: PresensiStatusType =
            rec?.status || (col.isWeekend || col.holiday ? 'LIBUR' : 'HADIR');
          const meta = STATUS_PRESENSI_META[st];
          const isOff = st === 'LIBUR';
          const badgeStyle = getStatusInlineBadgeStyle(st);
          return (
            <tr
              key={col.dateStr}
              className={isOff ? 'bg-slate-50/90 text-slate-500' : 'bg-white text-slate-900'}
            >
              <td
                className="border border-slate-300 py-1 px-1 text-center font-semibold tabular-nums"
                style={{ fontFamily: activeFonts.monoFont }}
              >
                {String(col.day).padStart(2, '0')}
              </td>
              <td className="border border-slate-300 py-1 px-1 text-center text-[9.5px]">
                {col.dayName}
              </td>
              <td className="border border-slate-300 py-1 px-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="font-semibold truncate text-[9.5px]"
                    style={{ color: badgeStyle.color }}
                  >
                    {meta.label}
                  </span>
                  <span
                    className="px-1 py-0.2 rounded-xs border text-[8.5px] font-bold shrink-0"
                    style={{
                      ...badgeStyle,
                      fontFamily: activeFonts.monoFont
                    }}
                  >
                    {meta.code}
                  </span>
                </div>
              </td>
              <td
                className="border border-slate-300 py-1 px-1 text-center tabular-nums text-[9.5px]"
                style={{ fontFamily: activeFonts.monoFont }}
              >
                {rec?.jamDatang || '—'}
              </td>
              <td
                className="border border-slate-300 py-1 px-1 text-center tabular-nums text-[9.5px]"
                style={{ fontFamily: activeFonts.monoFont }}
              >
                {rec?.jamPulang || '—'}
              </td>
              <td
                className="border border-slate-300 py-1 px-1 text-center tabular-nums text-[9.5px] font-semibold"
                style={{
                  fontFamily: activeFonts.monoFont,
                  color: rec?.menitTerlambat ? '#b45309' : undefined
                }}
              >
                {rec?.menitTerlambat ? `${rec.menitTerlambat}m` : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderCalendarHeatmap = () => {
    const blanks = Array.from({ length: calendarLeadBlanks });
    return (
      <div className="mb-3 border border-slate-300 rounded-md p-2.5 bg-white">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ fontFamily: activeFonts.headingFont, color: theme.accentText }}
          >
            Peta Ritme Kehadiran Harian · {bulanLabel} {selectedYear}
          </span>
          <span className="text-[9.5px] text-slate-500 tabular-nums">
            Hadir {summary.hadirTepat} · Telat {summary.terlambatHari} · DL {disciplineEvaluation.dinasLuarCount} · S/I/C {summary.sakit + summary.izin + summary.cuti} · Alpa {summary.alpa}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[8.5px] font-bold text-slate-500 mb-1">
          <div>Sen</div>
          <div>Sel</div>
          <div>Rab</div>
          <div>Kam</div>
          <div>Jum</div>
          <div className="text-rose-700">Sab</div>
          <div className="text-rose-700">Min</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-7 rounded-xs bg-slate-50/40" />
          ))}
          {dayColumns.map(col => {
            const rec = empRecords[col.dateStr];
            const st: PresensiStatusType =
              rec?.status || (col.isWeekend || col.holiday ? 'LIBUR' : 'HADIR');
            const meta = STATUS_PRESENSI_META[st];
            const badge = getStatusInlineBadgeStyle(st);
            return (
              <div
                key={col.dateStr}
                className="h-7 px-1 rounded-xs border flex items-center justify-between text-[9px]"
                style={badge}
              >
                <span className="font-bold tabular-nums" style={{ fontFamily: activeFonts.monoFont }}>
                  {col.day}
                </span>
                <span className="font-extrabold">{meta.code}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPredicateBanner = (compactMode = false) => {
    if (!showPredicateSection) return null;
    const accentColor = isMono ? '#0f172a' : predicate.colorHex;
    const bgColor = isMono ? '#f8fafc' : predicate.softBgHex;
    const borderColor = isMono ? '#475569' : predicate.borderHex;

    return (
      <div
        className={`border rounded-md ${compactMode ? 'p-2 my-2' : 'p-2.5 mb-2.5'}`}
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded border flex items-center justify-center font-black text-[13px] shrink-0"
              style={{
                borderColor: accentColor,
                color: '#ffffff',
                backgroundColor: accentColor,
                fontFamily: activeFonts.headingFont
              }}
            >
              {predicate.grade}
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-600 flex items-center gap-1">
                <Award className="w-3 h-3" style={{ color: accentColor }} />
                <span>
                  Predikat Kehadiran {selectedEmp.kategori} · {bulanLabel} {selectedYear}
                </span>
              </div>
              <div
                className="text-[12px] font-extrabold leading-tight"
                style={{ fontFamily: activeFonts.headingFont, color: accentColor }}
              >
                {predicate.label} ({predicate.grade}) — {predicate.title}
              </div>
            </div>
          </div>

          <div
            className="text-[9px] font-semibold tabular-nums text-right text-slate-700"
            style={{ fontFamily: activeFonts.monoFont }}
          >
            <div>Hadir: {summary.persentaseHadir}% · Telat: {summary.totalMenitTerlambat}m</div>
            <div>Alpa: {summary.alpa} hr · DL: {summary.dinasLuar} hr</div>
          </div>
        </div>

        <div className="mt-1.5 text-[9.5px] leading-snug text-slate-800">
          {predicate.description}{' '}
          <span className="font-semibold text-slate-900">
            Tindak Lanjut:
          </span>{' '}
          {predicate.recommendation}
        </div>

        <div className="mt-1.5 pt-1 border-t border-slate-300/70 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[8.5px] text-slate-600 tabular-nums">
          <span className="font-bold text-slate-700">Skala Predikat:</span>
          {PRESENSI_PREDICATE_SCALE.map(sc => (
            <span
              key={sc.grade}
              className={sc.grade === predicate.grade ? 'font-extrabold underline' : ''}
              style={sc.grade === predicate.grade ? { color: accentColor } : undefined}
            >
              {sc.grade}: {sc.label} ({sc.rule})
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderSignaturesFooter = (leftLabel = 'Koordinator Tata Usaha') => (
    <div className="mt-4 pt-2 flex items-start justify-between gap-6">
      <OfficialMergedSignatureBlock
        topLabel="Telah Diperiksa & Diverifikasi,"
        jabatan={leftLabel}
        nama={config.ttdOperatorNama}
        nip={config.ttdOperatorNip}
        includeStampAndTtd={false}
        monoMode={isMono}
      />
      <OfficialMergedSignatureBlock
        topLabel={`${config.kotaTandaTangan}, ${daysCount} ${bulanLabel} ${selectedYear}`}
        jabatan={config.ttdAtasanJabatan}
        nama={config.ttdAtasanNama}
        nip={config.ttdAtasanNip}
        schoolName={profile.namaSekolah}
        includeStampAndTtd={includeTtdStamp}
        resolvedTtdUrl={resolvedTtdUrl}
        resolvedStempelUrl={resolvedStempelUrl}
        monoMode={isMono}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:static print:bg-white print:p-0">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden print:max-h-none print:max-w-none print:border-none print:shadow-none">
        {/* Studio Control Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 space-y-2.5 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <IdCard className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-sm font-bold leading-tight">
                  Studio Laporan Kehadiran Per Guru &amp; Karyawan
                </div>
                <div className="text-[11px] text-slate-400">
                  Pilih gaya tata letak laporan, pasangan font, warna, dan pratinjau TTD + Stempel menyatu
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevEmp}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                title="Pegawai Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedEmp.id}
                onChange={e => onSelectEmp(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 max-w-[230px]"
              >
                {employees.map((emp, i) => (
                  <option key={emp.id} value={emp.id}>
                    {i + 1}. {emp.nama} ({emp.kategori})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextEmp}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                title="Pegawai Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onTriggerPrint}
                className="ml-1 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Laporan Guru</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
                aria-label="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Design, Fonts, Palette & Paper Controls */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-[11px]">
            {/* Template Gaya UI */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700">
              <span className="px-2 text-slate-400 font-semibold flex items-center gap-1 whitespace-nowrap">
                <LayoutTemplate className="w-3.5 h-3.5 text-emerald-400" />
                Gaya UI:
              </span>
              {(
                [
                  { id: 'eksekutif-modern', label: 'Eksekutif Modern' },
                  { id: 'jurnal-editorial', label: 'Jurnal Editorial' },
                  { id: 'klasik-dinas', label: 'Klasik Kedinasan' },
                  { id: 'slip-audit', label: 'Slip Audit BKD' }
                ] as { id: IndividualUiTemplateId; label: string }[]
              ).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    templateId === t.id
                      ? 'bg-emerald-500 text-slate-950 shadow-2xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Pilihan Pasangan Font */}
            <label className="inline-flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
              <Type className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-slate-400 font-semibold">Font:</span>
              <select
                value={fontPreset}
                onChange={e => setFontPreset(e.target.value as IndividualFontPresetId)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="auto" className="bg-slate-900">
                  Otomatis ({FONT_PAIRS[TEMPLATE_DEFAULT_FONT[templateId]].label.split(' · ')[0]})
                </option>
                {(Object.keys(FONT_PAIRS) as Exclude<IndividualFontPresetId, 'auto'>[]).map(k => (
                  <option key={k} value={k} className="bg-slate-900">
                    {FONT_PAIRS[k].label}
                  </option>
                ))}
              </select>
            </label>

            {/* Warna Aksentuasi */}
            <div className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
              <Palette className="w-3.5 h-3.5 text-amber-300 ml-1.5 mr-0.5 shrink-0" />
              {(Object.keys(COLOR_THEMES) as IndividualColorThemeId[]).map(cId => (
                <button
                  key={cId}
                  type="button"
                  onClick={() => setColorThemeId(cId)}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    colorThemeId === cId
                      ? 'bg-white text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {COLOR_THEMES[cId].label}
                </button>
              ))}
            </div>

            {/* Kertas & Skala */}
            <select
              value={paperSize}
              onChange={e => onChangePaperSize(e.target.value as 'F4' | 'A4')}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-semibold cursor-pointer"
            >
              <option value="F4">Kertas F4</option>
              <option value="A4">Kertas A4</option>
            </select>

            <select
              value={fontScalePct}
              onChange={e => setFontScalePct(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-semibold tabular-nums cursor-pointer"
            >
              <option value={92}>Skala 92%</option>
              <option value={100}>Skala 100%</option>
              <option value={108}>Skala 108%</option>
            </select>

            {/* Toggles */}
            <label className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={showKopSurat}
                onChange={e => setShowKopSurat(e.target.checked)}
              />
              <span>Kop Surat</span>
            </label>
            {templateId !== 'klasik-dinas' && (
              <label className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCalendarGrid}
                  onChange={e => setShowCalendarGrid(e.target.checked)}
                />
                <span>Peta Kalender</span>
              </label>
            )}
            {templateId === 'jurnal-editorial' && (
              <label className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={showNarrative}
                  onChange={e => setShowNarrative(e.target.checked)}
                />
                <span>Narasi Evaluasi</span>
              </label>
            )}
            <label className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={showPredicateSection}
                onChange={e => setShowPredicateSection(e.target.checked)}
              />
              <span>Predikat Bulanan</span>
            </label>
            <label className="inline-flex items-center gap-1 bg-emerald-950/80 border border-emerald-700 px-2 py-1 rounded-lg cursor-pointer text-emerald-200 font-semibold">
              <input
                type="checkbox"
                checked={includeTtdStamp}
                onChange={e => onChangeIncludeTtdStamp(e.target.checked)}
              />
              <span>TTD &amp; Stempel Menyatu</span>
            </label>
          </div>
        </div>

        {/* Document Preview Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/80 print:bg-white print:p-0">
          <div
            id="printable-presensi-individu"
            className="mx-auto shadow-lg border border-slate-300 print:border-none print:shadow-none print:p-0"
            style={{
              width: paperSize === 'F4' ? '205mm' : '198mm',
              maxWidth: '100%',
              backgroundColor:
                templateId === 'jurnal-editorial' && !isMono ? '#fcfbf8' : '#ffffff',
              padding: templateId === 'klasik-dinas' ? '18px 22px' : '20px 24px',
              fontFamily: activeFonts.bodyFont,
              fontSize: `${(11 * scaleRatio).toFixed(2)}px`,
              color: '#0f172a'
            }}
          >
            {/* Optional Kop Surat */}
            {showKopSurat && <OfficialKopSurat profile={profile} compact dense />}

            {/* ==================== TEMPLATE 1: EKSEKUTIF MODERN ==================== */}
            {templateId === 'eksekutif-modern' && (
              <div>
                {/* Masthead */}
                <div
                  className="mt-2 mb-3 rounded-md p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border"
                  style={{
                    backgroundColor: isMono ? '#f9fafb' : theme.primaryBg,
                    color: isMono ? '#0f172a' : theme.primaryText,
                    borderColor: isMono ? '#0f172a' : theme.primaryBg
                  }}
                >
                  <div>
                    <div
                      className="text-[9.5px] uppercase tracking-[0.16em] opacity-80"
                      style={{ fontFamily: activeFonts.monoFont }}
                    >
                      LAPORAN PRESENSI INDIVIDU GTK · {bulanLabel.toUpperCase()} {selectedYear}
                    </div>
                    <h2
                      className="text-[19px] font-extrabold leading-tight mt-0.5"
                      style={{ fontFamily: activeFonts.headingFont }}
                    >
                      {selectedEmp.nama}
                    </h2>
                    <div className="text-[10.5px] opacity-90 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span style={{ fontFamily: activeFonts.monoFont }}>
                        NIP. {selectedEmp.nip}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedEmp.jabatan}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {selectedEmp.kategori} ({selectedEmp.statusKepegawaian})
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-current/20 pt-2 sm:pt-0 sm:pl-4">
                    <div className="text-[9.5px] uppercase tracking-wider opacity-75">
                      Kehadiran Efektif
                    </div>
                    <div
                      className="text-[28px] font-black leading-none tabular-nums mt-0.5"
                      style={{ fontFamily: activeFonts.headingFont }}
                    >
                      {summary.persentaseHadir}%
                    </div>
                    <div className="text-[9.5px] opacity-85 mt-1">
                      {summary.hadirTepat}/{summary.hariKerjaEfektif} hari tepat waktu
                    </div>
                  </div>
                </div>

                {/* 4-Column Unboxed Tabular KPI Strip */}
                <div className="grid grid-cols-4 border border-slate-300 rounded-md divide-x divide-slate-300 mb-3 bg-white">
                  <div className="p-2">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                      Hadir &amp; Dinas Luar
                    </div>
                    <div
                      className="text-[16px] font-extrabold tabular-nums mt-0.5"
                      style={{ fontFamily: activeFonts.headingFont, color: theme.accentText }}
                    >
                      {summary.hadirTepat + disciplineEvaluation.dinasLuarCount} Hari
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Tepat: {summary.hadirTepat} · DL: {disciplineEvaluation.dinasLuarCount}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                      Keterlambatan
                    </div>
                    <div
                      className="text-[16px] font-extrabold tabular-nums mt-0.5"
                      style={{ fontFamily: activeFonts.headingFont }}
                    >
                      {summary.terlambatHari} Kali
                    </div>
                    <div className="text-[9px] text-slate-500 tabular-nums">
                      Akumulasi {summary.totalMenitTerlambat} menit
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                      Izin / Sakit / Alpa
                    </div>
                    <div
                      className="text-[16px] font-extrabold tabular-nums mt-0.5"
                      style={{ fontFamily: activeFonts.headingFont }}
                    >
                      {summary.sakit + summary.izin + summary.cuti} / {summary.alpa}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      S:{summary.sakit} I:{summary.izin} C:{summary.cuti} · A:{summary.alpa}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                      Estimasi TPP ({selectedEmp.jamKerja})
                    </div>
                    <div
                      className="text-[14px] font-extrabold tabular-nums mt-0.5"
                      style={{ fontFamily: activeFonts.headingFont }}
                    >
                      {summary.potonganPersen === 0
                        ? 'Utuh 100%'
                        : `-${summary.potonganPersen}%`}
                    </div>
                    <div className="text-[9px] text-slate-500 tabular-nums">
                      Potongan: {formatRupiah(summary.potonganNominalRp)}
                    </div>
                  </div>
                </div>

                {renderPredicateBanner()}

                {showCalendarGrid && renderCalendarHeatmap()}

                {/* 2-Column Side-by-Side Daily Log (1-16 | 17-31) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>{renderSplitHalfTable(firstHalfCols, 'modern')}</div>
                  <div>{renderSplitHalfTable(secondHalfCols, 'modern')}</div>
                </div>

                {renderSignaturesFooter()}
              </div>
            )}

            {/* ==================== TEMPLATE 2: JURNAL EDITORIAL ==================== */}
            {templateId === 'jurnal-editorial' && (
              <div>
                <div className="mt-2 pb-2.5 border-b-2" style={{ borderColor: theme.ruleColor }}>
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 text-[9.5px] uppercase tracking-[0.15em] text-slate-500 mb-1"
                    style={{ fontFamily: activeFonts.monoFont }}
                  >
                    <span>
                      DOKUMEN DISIPLIN GTK · {profile.namaSekolah.toUpperCase()}
                    </span>
                    <span>
                      PERIODE {bulanLabel.toUpperCase()} {selectedYear} · REF. BKD/{selectedYear}/
                      {String(selectedMonth).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2
                        className="text-[22px] font-bold tracking-tight leading-tight text-slate-950"
                        style={{ fontFamily: activeFonts.headingFont }}
                      >
                        {selectedEmp.nama}
                      </h2>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {selectedEmp.jabatan} · {selectedEmp.kategori} · Status Kepegawaian{' '}
                        <strong className="text-slate-900">{selectedEmp.statusKepegawaian}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[9.5px] uppercase tracking-widest text-slate-500">
                        Indeks Kehadiran
                      </div>
                      <div
                        className="text-[26px] font-bold leading-none tabular-nums"
                        style={{ fontFamily: activeFonts.headingFont, color: theme.accentText }}
                      >
                        {summary.persentaseHadir}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Archival Definition Strip */}
                <div className="grid grid-cols-4 gap-3 py-2 border-b border-slate-300 text-[10px]">
                  <div>
                    <div className="text-slate-500 text-[9px] uppercase tracking-wider">NIP / NI PPPK</div>
                    <div className="font-semibold text-slate-900 tabular-nums" style={{ fontFamily: activeFonts.monoFont }}>
                      {selectedEmp.nip}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[9px] uppercase tracking-wider">Pangkat / Gol.</div>
                    <div className="font-semibold text-slate-900">
                      {selectedEmp.pangkatGolongan || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[9px] uppercase tracking-wider">Pola Jam Kerja</div>
                    <div className="font-semibold text-slate-900">
                      {selectedEmp.jamKerja} ({config.defaultJamMasuk}–{config.defaultJamPulang})
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[9px] uppercase tracking-wider">Predikat Disiplin</div>
                    <div className="font-bold" style={{ color: theme.accentText }}>
                      {disciplineEvaluation.rating}
                    </div>
                  </div>
                </div>

                {/* Editorial Evaluation Prose */}
                {showNarrative && (
                  <div
                    className="my-2.5 py-2 px-3 border-y border-slate-300 text-[10.5px] leading-relaxed italic text-slate-800"
                    style={{
                      backgroundColor: isMono ? '#f9fafb' : theme.softBg
                    }}
                  >
                    <span className="not-italic font-bold uppercase text-[9px] tracking-widest mr-2" style={{ color: theme.accentText }}>
                      Catatan Evaluasi:
                    </span>
                    {disciplineEvaluation.narrative}
                  </div>
                )}

                {renderPredicateBanner(true)}

                {showCalendarGrid && renderCalendarHeatmap()}

                {/* 2-Column Editorial Tables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div>{renderSplitHalfTable(firstHalfCols, 'editorial')}</div>
                  <div>{renderSplitHalfTable(secondHalfCols, 'editorial')}</div>
                </div>

                {renderSignaturesFooter('Koordinator Tata Usaha')}
              </div>
            )}

            {/* ==================== TEMPLATE 3: KLASIK KEDINASAN ==================== */}
            {templateId === 'klasik-dinas' && (
              <div>
                <div className="text-center my-2">
                  <h2
                    className="text-[14.5px] font-extrabold uppercase tracking-wide underline underline-offset-4"
                    style={{ fontFamily: activeFonts.headingFont, color: isMono ? '#000' : theme.accentText }}
                  >
                    LAPORAN REKAPITULASI PRESENSI INDIVIDU PEGAWAI
                  </h2>
                  <div className="text-[10.5px] font-semibold text-slate-700 mt-1">
                    Unit Kerja: {config.namaSubUnit} · Periode: {bulanLabel} {selectedYear}
                  </div>
                </div>

                {/* Official Framed Biodata */}
                <div className="grid grid-cols-2 gap-3 text-[10.5px] border border-slate-900 p-2.5 mb-2.5 bg-white">
                  <div className="space-y-0.5">
                    <div className="grid grid-cols-[105px_8px_1fr]">
                      <span>Nama Pegawai</span>
                      <span>:</span>
                      <strong className="text-slate-950">{selectedEmp.nama}</strong>
                    </div>
                    <div className="grid grid-cols-[105px_8px_1fr]">
                      <span>NIP / NUPTK</span>
                      <span>:</span>
                      <span className="tabular-nums" style={{ fontFamily: activeFonts.monoFont }}>
                        {selectedEmp.nip}
                      </span>
                    </div>
                    <div className="grid grid-cols-[105px_8px_1fr]">
                      <span>Pangkat / Jabatan</span>
                      <span>:</span>
                      <span>
                        {selectedEmp.pangkatGolongan ? `${selectedEmp.pangkatGolongan} · ` : ''}
                        {selectedEmp.jabatan}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="grid grid-cols-[115px_8px_1fr]">
                      <span>Status Pegawai</span>
                      <span>:</span>
                      <strong>
                        {selectedEmp.kategori} ({selectedEmp.statusKepegawaian})
                      </strong>
                    </div>
                    <div className="grid grid-cols-[115px_8px_1fr]">
                      <span>Tingkat Kehadiran</span>
                      <span>:</span>
                      <strong className="tabular-nums">
                        {summary.persentaseHadir}% ({summary.hadirTepat} tepat, {summary.terlambatHari} telat)
                      </strong>
                    </div>
                    <div className="grid grid-cols-[115px_8px_1fr]">
                      <span>Predikat &amp; TPP</span>
                      <span>:</span>
                      <strong className="tabular-nums">
                        {predicate.shortLabel} · Pot. {summary.potonganPersen}% ({formatRupiah(summary.potonganNominalRp)})
                      </strong>
                    </div>
                  </div>
                </div>

                {renderPredicateBanner(true)}

                {/* Full Classic Ledger Table */}
                <table className="presensi-individu-table w-full border-collapse text-[10px]">
                  <thead>
                    <tr
                      className="font-bold text-center"
                      style={{
                        backgroundColor: isMono ? '#f1f5f9' : theme.tableHeadBg,
                        color: isMono ? '#000000' : theme.tableHeadText
                      }}
                    >
                      <th className="border border-slate-900 py-1 px-1 w-8">Tgl</th>
                      <th className="border border-slate-900 py-1 px-1.5 w-14">Hari</th>
                      <th className="border border-slate-900 py-1 px-2 text-left w-36">Status</th>
                      <th className="border border-slate-900 py-1 px-1.5 w-16">Datang</th>
                      <th className="border border-slate-900 py-1 px-1.5 w-16">Pulang</th>
                      <th className="border border-slate-900 py-1 px-1.5 w-14">Telat</th>
                      <th className="border border-slate-900 py-1 px-2 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayColumns.map(col => {
                      const rec = empRecords[col.dateStr];
                      const st: PresensiStatusType =
                        rec?.status || (col.isWeekend || col.holiday ? 'LIBUR' : 'HADIR');
                      const meta = STATUS_PRESENSI_META[st];
                      const isOff = st === 'LIBUR';
                      return (
                        <tr
                          key={col.dateStr}
                          className={isOff ? 'bg-slate-100/80 text-slate-600' : 'bg-white'}
                        >
                          <td
                            className="border border-slate-900 py-[2px] px-1 text-center tabular-nums"
                            style={{ fontFamily: activeFonts.monoFont }}
                          >
                            {col.day}
                          </td>
                          <td className="border border-slate-900 py-[2px] px-1.5 text-center">
                            {col.dayName}
                          </td>
                          <td className="border border-slate-900 py-[2px] px-2 font-semibold">
                            [{meta.code}] {meta.label}
                          </td>
                          <td
                            className="border border-slate-900 py-[2px] px-1.5 text-center tabular-nums"
                            style={{ fontFamily: activeFonts.monoFont }}
                          >
                            {rec?.jamDatang || '-'}
                          </td>
                          <td
                            className="border border-slate-900 py-[2px] px-1.5 text-center tabular-nums"
                            style={{ fontFamily: activeFonts.monoFont }}
                          >
                            {rec?.jamPulang || '-'}
                          </td>
                          <td
                            className="border border-slate-900 py-[2px] px-1.5 text-center tabular-nums"
                            style={{ fontFamily: activeFonts.monoFont }}
                          >
                            {rec?.menitTerlambat ? `${rec.menitTerlambat}m` : '-'}
                          </td>
                          <td className="border border-slate-900 py-[2px] px-2 truncate max-w-[180px]">
                            {rec?.keterangan || (col.holiday ? col.holiday.name : '-')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {renderSignaturesFooter()}
              </div>
            )}

            {/* ==================== TEMPLATE 4: SLIP AUDIT BKD ==================== */}
            {templateId === 'slip-audit' && (
              <div>
                {/* Crisp Audit Ribbon */}
                <div
                  className="mt-2 border-y-2 py-2 px-3 flex flex-wrap items-center justify-between gap-2"
                  style={{
                    borderColor: theme.ruleColor,
                    backgroundColor: isMono ? '#f8fafc' : theme.softBg
                  }}
                >
                  <div>
                    <div
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ fontFamily: activeFonts.monoFont, color: theme.accentText }}
                    >
                      SLIP VERIFIKASI KEHADIRAN BULANAN · {bulanLabel.toUpperCase()} {selectedYear}
                    </div>
                    <div
                      className="text-[18px] font-extrabold tracking-tight text-slate-950"
                      style={{ fontFamily: activeFonts.headingFont }}
                    >
                      {selectedEmp.nama}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      NIP. <span style={{ fontFamily: activeFonts.monoFont }}>{selectedEmp.nip}</span> · {selectedEmp.jabatan} · {selectedEmp.statusKepegawaian}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">Status Audit</div>
                      <div
                        className="text-[11px] font-bold flex items-center gap-1 justify-end"
                        style={{ color: theme.accentText }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Tervalidasi BKD</span>
                      </div>
                      <div className="text-[9.5px] text-slate-600 tabular-nums">
                        TPP Bersih: {formatRupiah(selectedEmp.tppNominal - summary.potonganNominalRp)}
                      </div>
                    </div>
                    <div
                      className="px-3 py-1.5 rounded border text-center"
                      style={{
                        borderColor: theme.ruleColor,
                        backgroundColor: theme.primaryBg,
                        color: theme.primaryText
                      }}
                    >
                      <div className="text-[8.5px] uppercase tracking-wider opacity-80">Capaian</div>
                      <div
                        className="text-[18px] font-black leading-none tabular-nums"
                        style={{ fontFamily: activeFonts.headingFont }}
                      >
                        {summary.persentaseHadir}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* 10-Status Recap Matrix Table */}
                <table className="presensi-individu-table w-full border-collapse text-center text-[9.5px] my-2.5">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: theme.tableHeadBg,
                        color: theme.tableHeadText
                      }}
                    >
                      <th className="border border-slate-300 py-1 px-1">Hari Efektif</th>
                      <th className="border border-slate-300 py-1 px-1">Hadir (V)</th>
                      <th className="border border-slate-300 py-1 px-1">Telat (T)</th>
                      <th className="border border-slate-300 py-1 px-1">Total Mnt</th>
                      <th className="border border-slate-300 py-1 px-1">Dinas Luar</th>
                      <th className="border border-slate-300 py-1 px-1">Lupa Absen</th>
                      <th className="border border-slate-300 py-1 px-1">Sakit (S)</th>
                      <th className="border border-slate-300 py-1 px-1">Izin/Cuti</th>
                      <th className="border border-slate-300 py-1 px-1">Alpa (A)</th>
                      <th className="border border-slate-300 py-1 px-1">Pot. TPP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold tabular-nums bg-white" style={{ fontFamily: activeFonts.monoFont }}>
                      <td className="border border-slate-300 py-1.5">{summary.hariKerjaEfektif}</td>
                      <td className="border border-slate-300 py-1.5 text-emerald-700">{summary.hadirTepat}</td>
                      <td className="border border-slate-300 py-1.5 text-amber-700">{summary.terlambatHari}</td>
                      <td className="border border-slate-300 py-1.5">{summary.totalMenitTerlambat}m</td>
                      <td className="border border-slate-300 py-1.5 text-sky-700">
                        {disciplineEvaluation.dinasLuarCount}
                      </td>
                      <td className="border border-slate-300 py-1.5">{summary.lupaAbsen}</td>
                      <td className="border border-slate-300 py-1.5">{summary.sakit}</td>
                      <td className="border border-slate-300 py-1.5">{summary.izin + summary.cuti}</td>
                      <td className="border border-slate-300 py-1.5 text-rose-700">{summary.alpa}</td>
                      <td className="border border-slate-300 py-1.5">{summary.potonganPersen}%</td>
                    </tr>
                  </tbody>
                </table>

                {renderPredicateBanner(true)}

                {showCalendarGrid && renderCalendarHeatmap()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>{renderSplitHalfTable(firstHalfCols, 'slip')}</div>
                  <div>{renderSplitHalfTable(secondHalfCols, 'slip')}</div>
                </div>

                {renderSignaturesFooter('Koordinator Tata Usaha')}
              </div>
            )}

            {/* Sub-footer metadata */}
            <div className="mt-3 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500">
              <span>
                {NAMA_HARI_SINGKAT[new Date().getDay()]} · Dicetak dari Sistem Informasi Tata Usaha {profile.namaSekolah}
              </span>
              <span style={{ fontFamily: activeFonts.monoFont }}>
                {selectedEmp.nama} · {bulanLabel} {selectedYear}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
