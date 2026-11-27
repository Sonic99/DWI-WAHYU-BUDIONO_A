import React, { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  DailyPresensiRecord,
  PresensiConfig,
  PresensiEmployeeItem
} from '../types';
import {
  calculateEmployeeMonthlySummary,
  NAMA_BULAN_ID,
  seedAttendanceMonthForEmployees
} from '../utils/presensiBkd';
import { BarChart3, TrendingUp } from 'lucide-react';

interface PresensiMonthlyTrendChartProps {
  employees: PresensiEmployeeItem[];
  attendanceMap: Record<string, Record<string, DailyPresensiRecord>>;
  config: PresensiConfig;
  selectedYear: number;
  selectedMonth: number;
  onSelectMonth: (month1To12: number) => void;
}

export interface MonthlyTrendDatum {
  month: number;
  bulanSingkat: string;
  bulanPenuh: string;
  hadirGuruPct: number;
  hadirTendikPct: number;
  hadirSemuaPct: number;
  hadirTepatHari: number;
  terlambatHari: number;
  dinasLuarHari: number;
  izinSakitCutiHari: number;
  alpaHari: number;
  avgMenitTelat: number;
  isRecorded: boolean;
}

type ChartViewMode = 'trend' | 'composition';

const BULAN_SINGKAT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des'
];

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
  payload?: MonthlyTrendDatum;
}

const CustomMonthlyTooltip: React.FC<{
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  mode: ChartViewMode;
}> = ({ active, payload, mode }) => {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div className="bg-slate-950 text-white rounded-lg border border-slate-700 shadow-xl px-3.5 py-2.5 text-xs min-w-[230px]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5 mb-2">
        <span className="font-bold text-slate-100">{datum.bulanPenuh}</span>
        <span className="text-[10px] text-slate-400">
          {datum.isRecorded ? 'Data Tersimpan' : 'Basis Kalender Kerja'}
        </span>
      </div>

      {mode === 'trend' ? (
        <div className="space-y-1.5 tabular-nums">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-2 h-2 rounded-xs bg-emerald-400 inline-block" />
              Kehadiran Guru
            </span>
            <span className="font-bold font-mono text-white">{datum.hadirGuruPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-sky-300">
              <span className="w-2 h-2 rounded-xs bg-sky-400 inline-block" />
              Karyawan / Tendik
            </span>
            <span className="font-bold font-mono text-white">{datum.hadirTendikPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-0.5 bg-amber-300 inline-block" />
              Rata-rata GTK
            </span>
            <span className="font-bold font-mono text-amber-300">{datum.hadirSemuaPct}%</span>
          </div>
          <div className="pt-1.5 mt-1 border-t border-slate-800 grid grid-cols-3 gap-1.5 text-[10.5px] text-slate-300">
            <div>
              Telat: <strong className="text-amber-300 font-mono">{datum.terlambatHari}</strong>
            </div>
            <div>
              DL: <strong className="text-teal-300 font-mono">{datum.dinasLuarHari}</strong>
            </div>
            <div>
              Alpa: <strong className="text-rose-300 font-mono">{datum.alpaHari}</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1 tabular-nums">
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-300">Hadir Tepat Waktu</span>
            <span className="font-bold font-mono">{datum.hadirTepatHari} hr</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-amber-300">Terlambat</span>
            <span className="font-bold font-mono">{datum.terlambatHari} hr</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-cyan-300">Dinas Luar</span>
            <span className="font-bold font-mono">{datum.dinasLuarHari} hr</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-indigo-300">Sakit / Izin / Cuti</span>
            <span className="font-bold font-mono">{datum.izinSakitCutiHari} hr</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-rose-300">Tanpa Keterangan (Alpa)</span>
            <span className="font-bold font-mono">{datum.alpaHari} hr</span>
          </div>
        </div>
      )}

      <div className="mt-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
        Klik grafik untuk membuka matriks {datum.bulanPenuh}
      </div>
    </div>
  );
};

export const PresensiMonthlyTrendChart: React.FC<PresensiMonthlyTrendChartProps> = ({
  employees,
  attendanceMap,
  config,
  selectedYear,
  selectedMonth,
  onSelectMonth
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('trend');

  const monthlySeries: MonthlyTrendDatum[] = useMemo(() => {
    if (employees.length === 0) {
      return BULAN_SINGKAT.map((b, idx) => ({
        month: idx + 1,
        bulanSingkat: b,
        bulanPenuh: `${NAMA_BULAN_ID[idx]} ${selectedYear}`,
        hadirGuruPct: 0,
        hadirTendikPct: 0,
        hadirSemuaPct: 0,
        hadirTepatHari: 0,
        terlambatHari: 0,
        dinasLuarHari: 0,
        izinSakitCutiHari: 0,
        alpaHari: 0,
        avgMenitTelat: 0,
        isRecorded: false
      }));
    }

    const guruEmps = employees.filter(e => e.kategori === 'Guru');
    const tendikEmps = employees.filter(e => e.kategori !== 'Guru');

    return BULAN_SINGKAT.map((bShort, idx) => {
      const m = idx + 1;
      const prefix = `${selectedYear}-${String(m).padStart(2, '0')}-`;

      // Check if attendanceMap already contains entries for this month
      let hasRecorded = false;
      for (const emp of employees) {
        const recs = attendanceMap[emp.id];
        if (recs && Object.keys(recs).some(k => k.startsWith(prefix))) {
          hasRecorded = true;
          break;
        }
      }

      const monthMap = hasRecorded
        ? attendanceMap
        : seedAttendanceMonthForEmployees({}, employees, config, selectedYear, m);

      const guruSums = guruEmps.map(emp =>
        calculateEmployeeMonthlySummary(emp, monthMap[emp.id], config, selectedYear, m)
      );
      const tendikSums = tendikEmps.map(emp =>
        calculateEmployeeMonthlySummary(emp, monthMap[emp.id], config, selectedYear, m)
      );
      const allSums = [...guruSums, ...tendikSums];

      const avg = (list: typeof allSums) => {
        if (list.length === 0) return 0;
        const val = list.reduce((acc, s) => acc + s.persentaseHadir, 0) / list.length;
        return Math.round(val * 10) / 10;
      };

      const hadirTepatHari = allSums.reduce((acc, s) => acc + s.hadirTepat, 0);
      const terlambatHari = allSums.reduce((acc, s) => acc + s.terlambatHari, 0);
      const dinasLuarHari = allSums.reduce((acc, s) => acc + s.dinasLuar, 0);
      const izinSakitCutiHari = allSums.reduce(
        (acc, s) => acc + s.sakit + s.izin + s.cuti,
        0
      );
      const alpaHari = allSums.reduce((acc, s) => acc + s.alpa, 0);
      const totalMenitTelat = allSums.reduce((acc, s) => acc + s.totalMenitTerlambat, 0);

      return {
        month: m,
        bulanSingkat: bShort,
        bulanPenuh: `${NAMA_BULAN_ID[idx]} ${selectedYear}`,
        hadirGuruPct: avg(guruSums),
        hadirTendikPct: avg(tendikSums),
        hadirSemuaPct: avg(allSums),
        hadirTepatHari,
        terlambatHari,
        dinasLuarHari,
        izinSakitCutiHari,
        alpaHari,
        avgMenitTelat:
          allSums.length > 0 ? Math.round((totalMenitTelat / allSums.length) * 10) / 10 : 0,
        isRecorded: hasRecorded
      };
    });
  }, [employees, attendanceMap, config, selectedYear]);

  const yearlyInsights = useMemo(() => {
    if (monthlySeries.length === 0 || employees.length === 0) {
      return {
        avgGuru: 0,
        avgTendik: 0,
        bestMonthLabel: '-',
        bestMonthPct: 0,
        activeDatum: monthlySeries[selectedMonth - 1]
      };
    }
    const avgGuru =
      Math.round(
        (monthlySeries.reduce((a, d) => a + d.hadirGuruPct, 0) / monthlySeries.length) * 10
      ) / 10;
    const avgTendik =
      Math.round(
        (monthlySeries.reduce((a, d) => a + d.hadirTendikPct, 0) / monthlySeries.length) * 10
      ) / 10;
    const best = monthlySeries.reduce((prev, cur) =>
      cur.hadirSemuaPct > prev.hadirSemuaPct ? cur : prev
    );
    return {
      avgGuru,
      avgTendik,
      bestMonthLabel: best.bulanSingkat,
      bestMonthPct: best.hadirSemuaPct,
      activeDatum: monthlySeries[selectedMonth - 1]
    };
  }, [monthlySeries, employees.length, selectedMonth]);

  const handleChartClick = (chartState: unknown) => {
    if (!chartState || typeof chartState !== 'object') return;
    const st = chartState as { activeLabel?: string; activeTooltipIndex?: number };
    if (typeof st.activeLabel === 'string') {
      const idx = BULAN_SINGKAT.indexOf(st.activeLabel);
      if (idx >= 0) {
        onSelectMonth(idx + 1);
        return;
      }
    }
    if (typeof st.activeTooltipIndex === 'number' && st.activeTooltipIndex >= 0 && st.activeTooltipIndex < 12) {
      onSelectMonth(st.activeTooltipIndex + 1);
    }
  };

  const activeMonthShort = BULAN_SINGKAT[selectedMonth - 1] || 'Nov';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs print:hidden">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Tren Tingkat Kehadiran Guru &amp; Karyawan Per Bulan ({selectedYear})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Perbandingan Guru vs Karyawan / Tendik sepanjang Januari–Desember · Bulan aktif:{' '}
            <strong className="text-emerald-700">
              {NAMA_BULAN_ID[selectedMonth - 1]} {selectedYear}
            </strong>{' '}
            · Klik titik bulan untuk berpindah periode
          </p>
        </div>

        {/* Mode Segmented Switch */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('trend')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'trend'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tren Kehadiran (%)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('composition')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'composition'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-600" />
            <span>Komposisi Status Harian</span>
          </button>
        </div>
      </div>

      {/* Main Chart Body */}
      {employees.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Belum ada data pegawai untuk divisualisasikan.</p>
          <p className="mt-1">Sinkronkan data Guru &amp; Tendik untuk melihat grafik tren bulanan.</p>
        </div>
      ) : (
        <div className="h-[270px] w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'trend' ? (
              <ComposedChart
                data={monthlySeries}
                onClick={handleChartClick}
                margin={{ top: 10, right: 16, left: -12, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="presensiGuruGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="presensiTendikGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="bulanSingkat"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[75, 100]}
                  tickFormatter={val => `${val}%`}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomMonthlyTooltip mode="trend" />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
                <ReferenceLine
                  y={95}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Target BKD 95%',
                    position: 'insideBottomRight',
                    fill: '#b45309',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                />
                <ReferenceLine
                  x={activeMonthShort}
                  stroke="#0f172a"
                  strokeOpacity={0.35}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="hadirGuruPct"
                  name="Kehadiran Guru (%)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#presensiGuruGrad)"
                  activeDot={{ r: 5, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  dot={{ r: 3, fill: '#059669', strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="hadirTendikPct"
                  name="Karyawan / Tendik (%)"
                  stroke="#0284c7"
                  strokeWidth={2.2}
                  fill="url(#presensiTendikGrad)"
                  activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                  dot={{ r: 3, fill: '#0284c7', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="hadirSemuaPct"
                  name="Rata-rata Semua GTK (%)"
                  stroke="#0f172a"
                  strokeWidth={1.75}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4, fill: '#0f172a' }}
                />
              </ComposedChart>
            ) : (
              <BarChart
                data={monthlySeries}
                onClick={handleChartClick}
                margin={{ top: 10, right: 16, left: -12, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="bulanSingkat"
                  tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomMonthlyTooltip mode="composition" />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
                <ReferenceLine
                  x={activeMonthShort}
                  stroke="#0f172a"
                  strokeOpacity={0.35}
                  strokeWidth={2}
                />
                <Bar
                  dataKey="hadirTepatHari"
                  name="Hadir Tepat (hr)"
                  stackId="a"
                  fill="#059669"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="dinasLuarHari"
                  name="Dinas Luar (hr)"
                  stackId="a"
                  fill="#0d9488"
                />
                <Bar
                  dataKey="terlambatHari"
                  name="Terlambat (hr)"
                  stackId="a"
                  fill="#f59e0b"
                />
                <Bar
                  dataKey="izinSakitCutiHari"
                  name="Sakit/Izin/Cuti (hr)"
                  stackId="a"
                  fill="#6366f1"
                />
                <Bar
                  dataKey="alpaHari"
                  name="Alpa (hr)"
                  stackId="a"
                  fill="#e11d48"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparative Summary Strip */}
      <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
        <div>
          <div className="text-[11px] text-slate-500">Rata-rata Kehadiran Guru ({selectedYear})</div>
          <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
            {yearlyInsights.avgGuru}%
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Rata-rata Karyawan / Tendik ({selectedYear})</div>
          <div className="text-sm font-bold text-sky-700 font-mono mt-0.5">
            {yearlyInsights.avgTendik}%
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">Capaian Tertinggi Tahun {selectedYear}</div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            {yearlyInsights.bestMonthLabel} ·{' '}
            <span className="font-mono text-emerald-700">{yearlyInsights.bestMonthPct}%</span>
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-500">
            Bulan Aktif ({NAMA_BULAN_ID[selectedMonth - 1]})
          </div>
          <div className="text-sm font-bold text-slate-900 mt-0.5">
            Guru {yearlyInsights.activeDatum?.hadirGuruPct ?? 0}% · Tendik{' '}
            {yearlyInsights.activeDatum?.hadirTendikPct ?? 0}%
          </div>
        </div>
      </div>
    </div>
  );
};
