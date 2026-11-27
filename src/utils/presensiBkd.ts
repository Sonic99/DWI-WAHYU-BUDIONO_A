import * as XLSX from 'xlsx';
import {
  DailyPresensiRecord,
  EmployeeMonthlyPresensiSummary,
  Guru,
  PresensiBuktiIzinItem,
  PresensiConfig,
  PresensiEmployeeItem,
  PresensiHolidayItem,
  PresensiStatusType,
  SchoolProfile,
  Tendik
} from '../types';

export const NAMA_BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export const NAMA_HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const STATUS_PRESENSI_META: Record<
  PresensiStatusType,
  {
    code: string;
    label: string;
    shortDesc: string;
    cellBg: string;
    cellText: string;
    badgeBg: string;
    badgeBorder: string;
  }
> = {
  HADIR: {
    code: 'V',
    label: 'Hadir Tepat Waktu',
    shortDesc: 'Masuk & pulang sesuai ketentuan BKD',
    cellBg: 'bg-emerald-50/75',
    cellText: 'text-emerald-900',
    badgeBg: 'bg-emerald-600 text-white',
    badgeBorder: 'border-emerald-300'
  },
  TERLAMBAT: {
    code: 'T',
    label: 'Terlambat Masuk',
    shortDesc: 'Hadir melewati batas jam masuk kerja',
    cellBg: 'bg-amber-50/85',
    cellText: 'text-amber-900',
    badgeBg: 'bg-amber-500 text-white',
    badgeBorder: 'border-amber-300'
  },
  SAKIT: {
    code: 'S',
    label: 'Sakit (SKD / Surat Dokter)',
    shortDesc: 'Tidak masuk dengan keterangan sakit resmi',
    cellBg: 'bg-sky-50',
    cellText: 'text-sky-900',
    badgeBg: 'bg-sky-600 text-white',
    badgeBorder: 'border-sky-300'
  },
  IZIN: {
    code: 'I',
    label: 'Izin Kepentingan Sah',
    shortDesc: 'Tidak masuk dengan surat izin resmi atasan',
    cellBg: 'bg-indigo-50',
    cellText: 'text-indigo-900',
    badgeBg: 'bg-indigo-600 text-white',
    badgeBorder: 'border-indigo-300'
  },
  CUTI: {
    code: 'C',
    label: 'Cuti Tahunan / Besar / Melahirkan',
    shortDesc: 'Cuti kepegawaian sesuai SK cuti resmi',
    cellBg: 'bg-purple-50',
    cellText: 'text-purple-900',
    badgeBg: 'bg-purple-600 text-white',
    badgeBorder: 'border-purple-300'
  },
  ALPA: {
    code: 'A',
    label: 'Tanpa Keterangan (TK / Alpa)',
    shortDesc: 'Mangkir tanpa keterangan sah (potongan TPP)',
    cellBg: 'bg-rose-50',
    cellText: 'text-rose-900',
    badgeBg: 'bg-rose-600 text-white',
    badgeBorder: 'border-rose-300'
  },
  LIBUR: {
    code: 'L',
    label: 'Libur Nasional / Akhir Pekan',
    shortDesc: 'Sabtu, Minggu, atau Hari Libur Nasional/Sekolah',
    cellBg: 'bg-slate-100',
    cellText: 'text-slate-500',
    badgeBg: 'bg-slate-400 text-white',
    badgeBorder: 'border-slate-300'
  },
  DL_PENUH: {
    code: 'DL',
    label: 'Dinas Luar Penuh',
    shortDesc: 'Melaksanakan tugas kedinasan di luar sekolah sehari penuh',
    cellBg: 'bg-teal-50',
    cellText: 'text-teal-900',
    badgeBg: 'bg-teal-600 text-white',
    badgeBorder: 'border-teal-300'
  },
  DL_MASUK: {
    code: 'DLM',
    label: 'Dinas Luar (Pagi / Masuk)',
    shortDesc: 'Tugas luar di pagi hari, kembali melakukan presensi pulang',
    cellBg: 'bg-cyan-50',
    cellText: 'text-cyan-900',
    badgeBg: 'bg-cyan-600 text-white',
    badgeBorder: 'border-cyan-300'
  },
  DL_PULANG: {
    code: 'DLP',
    label: 'Dinas Luar (Siang / Pulang)',
    shortDesc: 'Presensi datang di sekolah, lanjut tugas luar hingga pulang',
    cellBg: 'bg-cyan-50',
    cellText: 'text-cyan-900',
    badgeBg: 'bg-cyan-700 text-white',
    badgeBorder: 'border-cyan-300'
  },
  LUPA_ABSEN: {
    code: 'LA',
    label: 'Lupa Absen (Dengan SPTJM)',
    shortDesc: 'Lupa rekam wajah/finger, dilengkapi bukti SPTJM atasan',
    cellBg: 'bg-orange-50',
    cellText: 'text-orange-900',
    badgeBg: 'bg-orange-600 text-white',
    badgeBorder: 'border-orange-300'
  }
};

export const DEFAULT_HOLIDAYS_2026: PresensiHolidayItem[] = [
  { id: 'hol-2026-01', date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', type: 'NASIONAL' },
  { id: 'hol-2026-02', date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad SAW', type: 'NASIONAL' },
  { id: 'hol-2026-03', date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'NASIONAL' },
  { id: 'hol-2026-04', date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', type: 'NASIONAL' },
  { id: 'hol-2026-05', date: '2026-03-20', name: 'Idul Fitri 1447 H (Hari ke-1)', type: 'NASIONAL' },
  { id: 'hol-2026-06', date: '2026-03-23', name: 'Cuti Bersama Idul Fitri 1447 H', type: 'NASIONAL' },
  { id: 'hol-2026-07', date: '2026-04-03', name: 'Wafat Yesus Kristus', type: 'NASIONAL' },
  { id: 'hol-2026-08', date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'NASIONAL' },
  { id: 'hol-2026-09', date: '2026-05-14', name: 'Kenaikan Yesus Kristus', type: 'NASIONAL' },
  { id: 'hol-2026-10', date: '2026-05-27', name: 'Hari Raya Idul Adha 1447 H', type: 'NASIONAL' },
  { id: 'hol-2026-11', date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'NASIONAL' },
  { id: 'hol-2026-12', date: '2026-06-16', name: 'Tahun Baru Islam 1448 H', type: 'NASIONAL' },
  { id: 'hol-2026-13', date: '2026-08-17', name: 'Hari Kemerdekaan RI ke-81', type: 'NASIONAL' },
  { id: 'hol-2026-14', date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', type: 'NASIONAL' },
  { id: 'hol-2026-15', date: '2026-11-10', name: 'Kegiatan Evaluasi GTK / Hari Pahlawan (Institusional)', type: 'INSTITUSIONAL' },
  { id: 'hol-2026-16', date: '2026-12-25', name: 'Hari Raya Natal', type: 'NASIONAL' }
];

export const buildDefaultPresensiConfig = (profile: SchoolProfile): PresensiConfig => ({
  namaInstansi: 'PEMERINTAH PROVINSI JAWA TIMUR · DINAS PENDIDIKAN',
  namaSubUnit: profile.namaSekolah || 'SMA NEGERI 9 SURABAYA',
  kodeUnitKerja: profile.npsn || '20532185',
  zonaWaktu: 'WIB',
  defaultJamMasuk: '06:45',
  defaultJamPulang: '15:15',
  defaultJamPulangJumat: '11:30',
  toleransiKeterlambatanMenit: 0,
  potonganTppPerMenitPersen: 0.05,
  potonganAlpaPersen: 3,
  tarifMakanHarian: 37000,
  kotaTandaTangan: profile.kota || 'Surabaya',
  ttdAtasanNama: profile.kepalaSekolah || 'Dr. Kasminah, M.Pd.',
  ttdAtasanNip: profile.nipKepalaSekolah || '196803151992032004',
  ttdAtasanJabatan: `Kepala ${profile.namaSekolah || 'SMA Negeri 9 Surabaya'}`,
  ttdOperatorNama: profile.kepalaTU || 'Dra. Hj. Sri Rahayu',
  ttdOperatorNip: profile.nipKepalaTU || '197405121999032001',
  holidays: DEFAULT_HOLIDAYS_2026.map(h => ({ ...h }))
});

export const formatDateIso = (year: number, month1To12: number, day: number): string =>
  `${year}-${String(month1To12).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const getDaysInMonth = (year: number, month1To12: number): number =>
  new Date(year, month1To12, 0).getDate();

export const parseTimeToMinutes = (timeStr?: string): number | null => {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  const match = clean.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

export const evaluateLatenessStatus = (
  jamDatang: string | undefined,
  defaultJamMasuk = '06:45',
  toleransiMenit = 0
): { isLate: boolean; rawMinutesLate: number; netMinutesLate: number } => {
  const actual = parseTimeToMinutes(jamDatang);
  const target = parseTimeToMinutes(defaultJamMasuk) ?? 6 * 60 + 45;
  if (actual === null) return { isLate: false, rawMinutesLate: 0, netMinutesLate: 0 };
  const rawMinutesLate = Math.max(0, actual - target);
  const netMinutesLate = Math.max(0, rawMinutesLate - Math.max(0, toleransiMenit));
  return {
    isLate: netMinutesLate > 0,
    rawMinutesLate,
    netMinutesLate
  };
};

export const evaluateEarlyLeaveMinutes = (
  jamPulang: string | undefined,
  dateStr: string,
  config: PresensiConfig
): number => {
  const actual = parseTimeToMinutes(jamPulang);
  if (actual === null) return 0;
  const d = new Date(`${dateStr}T00:00:00`);
  const isFriday = !isNaN(d.getTime()) && d.getDay() === 5;
  const targetStr = isFriday ? config.defaultJamPulangJumat : config.defaultJamPulang;
  const target = parseTimeToMinutes(targetStr) ?? (isFriday ? 11 * 60 + 30 : 15 * 60 + 15);
  return Math.max(0, target - actual);
};

const normalizeStatusKepegawaian = (
  raw?: string
): PresensiEmployeeItem['statusKepegawaian'] => {
  const up = (raw || '').toUpperCase();
  if (up.includes('PPPK') && (up.includes('PW') || up.includes('PARUH'))) return 'PPPK PW';
  if (up.includes('PPPK')) return 'PPPK';
  if (up.includes('PNS') || up.includes('ASN')) return 'PNS';
  if (up.includes('GTT')) return 'GTT';
  if (up.includes('PTT')) return 'PTT';
  return 'Honorer';
};

const formatDisplayGtkName = (nama: string, gelar?: string): string => {
  const cleanName = (nama || '').trim();
  const cleanGelar = (gelar || '').trim();
  if (!cleanGelar) return cleanName;
  if (cleanName.toLowerCase().includes(cleanGelar.toLowerCase().replace(/[.,]/g, ''))) {
    return cleanName;
  }
  return `${cleanName}, ${cleanGelar}`;
};

const inferDefaultTpp = (status: PresensiEmployeeItem['statusKepegawaian'], jabatan: string): number => {
  const jabLow = (jabatan || '').toLowerCase();
  if (jabLow.includes('kepala sekolah')) return 7500000;
  if (jabLow.includes('waka') || jabLow.includes('koordinator tu')) return 4800000;
  if (status === 'PNS') return 4200000;
  if (status === 'PPPK') return 3400000;
  if (status === 'PPPK PW') return 2500000;
  return 1500000;
};

export const buildEmployeesFromGtkMaster = (
  guruList: Guru[],
  tendikList: Tendik[]
): PresensiEmployeeItem[] => {
  const items: PresensiEmployeeItem[] = [];

  guruList
    .filter(g => !g.statusAktif || g.statusAktif === 'Aktif')
    .forEach(g => {
    const status = normalizeStatusKepegawaian(g.statusKepegawaian || g.status);
    const jab = g.jabatan || (g.mapel ? `Guru ${g.mapel}` : 'Guru Mata Pelajaran');
    items.push({
      id: `pres-g-${g.id}`,
      nip: g.nip && g.nip !== '-' ? g.nip : '-',
      nama: formatDisplayGtkName(g.nama, g.gelar),
      jabatan: jab,
      kategori: 'Guru',
      statusKepegawaian: status,
      pangkatGolongan: g.pangkatGolongan || '-',
      jamKerja: '5 HK (06:45 - 15:15)',
      tppNominal: inferDefaultTpp(status, jab),
      sourceType: 'guru',
      sourceId: g.id
    });
  });

  tendikList
    .filter(t => !t.statusAktif || t.statusAktif === 'Aktif')
    .forEach(t => {
    const status = normalizeStatusKepegawaian(t.statusKepegawaian || t.status);
    const jab = t.jabatan || t.tugasUtama || 'Staf Tata Usaha';
    items.push({
      id: `pres-t-${t.id}`,
      nip: t.nip && t.nip !== '-' ? t.nip : '-',
      nama: formatDisplayGtkName(t.nama, t.gelar),
      jabatan: jab,
      kategori: 'Karyawan / Tendik',
      statusKepegawaian: status,
      pangkatGolongan: t.pangkatGolongan || '-',
      jamKerja: '5 HK (06:45 - 15:15)',
      tppNominal: inferDefaultTpp(status, jab),
      sourceType: 'tendik',
      sourceId: t.id
    });
  });

  return items;
};

export const syncEmployeesFromGtkDatabase = (
  existing: PresensiEmployeeItem[],
  guruList: Guru[],
  tendikList: Tendik[]
): PresensiEmployeeItem[] => {
  const fromMaster = buildEmployeesFromGtkMaster(guruList, tendikList);
  const existingBySource = new Map<string, PresensiEmployeeItem>();
  existing.forEach(e => {
    if (e.sourceId) existingBySource.set(`${e.sourceType || 'manual'}::${e.sourceId}`, e);
    existingBySource.set(`id::${e.id}`, e);
    if (e.nip && e.nip !== '-') existingBySource.set(`nip::${e.nip}`, e);
  });

  const merged: PresensiEmployeeItem[] = fromMaster.map(m => {
    const match =
      existingBySource.get(`${m.sourceType}::${m.sourceId}`) ||
      existingBySource.get(`id::${m.id}`) ||
      (m.nip !== '-' ? existingBySource.get(`nip::${m.nip}`) : undefined);
    if (match) {
      return {
        ...match,
        nama: m.nama,
        nip: m.nip,
        jabatan: m.jabatan,
        kategori: m.kategori,
        statusKepegawaian: m.statusKepegawaian,
        pangkatGolongan: m.pangkatGolongan,
        sourceType: m.sourceType,
        sourceId: m.sourceId
      };
    }
    return m;
  });

  const mergedIds = new Set(merged.map(m => m.id));
  existing.forEach(e => {
    if (e.sourceType === 'manual' && !mergedIds.has(e.id)) {
      merged.push(e);
    }
  });

  return merged;
};

export const sanitizeHolidaysInAttendanceMap = (
  currentMap: Record<string, Record<string, DailyPresensiRecord>>,
  holidays: PresensiHolidayItem[],
  employeeList: PresensiEmployeeItem[],
  config?: PresensiConfig
): Record<string, Record<string, DailyPresensiRecord>> => {
  const newMap: Record<string, Record<string, DailyPresensiRecord>> = { ...currentMap };
  const holidayDateMap = new Map<string, PresensiHolidayItem>();
  (holidays || []).forEach(h => holidayDateMap.set(h.date, h));

  const defJamMasuk = config?.defaultJamMasuk || '06:45';
  const toleransi = config?.toleransiKeterlambatanMenit || 0;

  for (const emp of employeeList) {
    const empRecords: Record<string, DailyPresensiRecord> = { ...(newMap[emp.id] || {}) };

    holidayDateMap.forEach((hol, dStr) => {
      const existing = empRecords[dStr];
      if (existing) {
        if (existing.status !== 'DL_PENUH' && !existing.hasBukti) {
          empRecords[dStr] = {
            ...existing,
            date: dStr,
            status: 'LIBUR',
            jamDatang: undefined,
            jamPulang: undefined,
            menitTerlambat: 0,
            menitPulangAwal: 0,
            keterangan:
              existing.keterangan && existing.keterangan.startsWith('Libur')
                ? existing.keterangan
                : `${hol.type === 'NASIONAL' ? 'Libur Nasional' : 'Libur Institusional'}: ${hol.name}`
          };
        }
      } else {
        empRecords[dStr] = {
          date: dStr,
          status: 'LIBUR',
          keterangan: `${hol.type === 'NASIONAL' ? 'Libur Nasional' : 'Libur Institusional'}: ${hol.name}`,
          menitTerlambat: 0,
          menitPulangAwal: 0
        };
      }
    });

    Object.keys(empRecords).forEach(dStr => {
      const rec = empRecords[dStr];
      if (!rec) return;

      const dateObj = new Date(`${dStr}T00:00:00`);
      const dayOfWeek = !isNaN(dateObj.getTime()) ? dateObj.getDay() : 1;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWeekend && !rec.hasBukti && rec.status !== 'DL_PENUH') {
        empRecords[dStr] = {
          ...rec,
          status: 'LIBUR',
          jamDatang: undefined,
          jamPulang: undefined,
          menitTerlambat: 0,
          menitPulangAwal: 0,
          keterangan: 'Libur Akhir Pekan'
        };
        return;
      }

      if (
        rec.keterangan &&
        rec.keterangan.includes('Lupa absen datang dan/atau pulang (V)') &&
        !rec.hasBukti
      ) {
        empRecords[dStr] = {
          ...rec,
          keterangan: ''
        };
      }

      if ((rec.status === 'HADIR' || rec.status === 'TERLAMBAT') && rec.jamDatang) {
        const evalRes = evaluateLatenessStatus(rec.jamDatang, defJamMasuk, toleransi);
        empRecords[dStr] = {
          ...empRecords[dStr],
          status: evalRes.isLate ? 'TERLAMBAT' : 'HADIR',
          menitTerlambat: evalRes.isLate ? evalRes.netMinutesLate : 0
        };
      } else if (rec.status === 'HADIR' && rec.menitTerlambat && rec.menitTerlambat > 0) {
        empRecords[dStr] = {
          ...empRecords[dStr],
          menitTerlambat: 0
        };
      }
    });

    newMap[emp.id] = empRecords;
  }

  return newMap;
};

export const seedAttendanceMonthForEmployees = (
  currentMap: Record<string, Record<string, DailyPresensiRecord>>,
  employees: PresensiEmployeeItem[],
  config: PresensiConfig,
  year: number,
  month1To12: number
): Record<string, Record<string, DailyPresensiRecord>> => {
  const days = getDaysInMonth(year, month1To12);
  const holidaySet = new Map<string, PresensiHolidayItem>();
  (config.holidays || []).forEach(h => holidaySet.set(h.date, h));

  const nextMap: Record<string, Record<string, DailyPresensiRecord>> = { ...currentMap };

  employees.forEach((emp, empIdx) => {
    const empRecs: Record<string, DailyPresensiRecord> = { ...(nextMap[emp.id] || {}) };
    for (let day = 1; day <= days; day++) {
      const dateStr = formatDateIso(year, month1To12, day);
      if (empRecs[dateStr]) continue;

      const d = new Date(`${dateStr}T00:00:00`);
      const dow = d.getDay();
      const hol = holidaySet.get(dateStr);

      if (dow === 0 || dow === 6) {
        empRecs[dateStr] = {
          date: dateStr,
          status: 'LIBUR',
          keterangan: 'Libur Akhir Pekan',
          menitTerlambat: 0,
          menitPulangAwal: 0
        };
        continue;
      }

      if (hol) {
        empRecs[dateStr] = {
          date: dateStr,
          status: 'LIBUR',
          keterangan: `${hol.type === 'NASIONAL' ? 'Libur Nasional' : 'Libur Institusional'}: ${hol.name}`,
          menitTerlambat: 0,
          menitPulangAwal: 0
        };
        continue;
      }

      const seed = (empIdx * 17 + day * 11) % 41;
      const isFriday = dow === 5;
      const outBaseH = isFriday ? 11 : 15;
      const outBaseM = isFriday ? 32 + (seed % 18) : 16 + (seed % 24);
      const jamPulang = `${String(outBaseH).padStart(2, '0')}:${String(outBaseM).padStart(2, '0')}`;

      if (seed === 13 && day >= 5 && day <= 22) {
        empRecs[dateStr] = {
          date: dateStr,
          status: 'DL_PENUH',
          polaKerja: emp.jamKerja,
          keterangan: 'Surat Tugas Dinas Luar / MGMP / Rapat Dinas',
          menitTerlambat: 0,
          menitPulangAwal: 0
        };
      } else if (seed === 29 && day >= 8 && day <= 19) {
        empRecs[dateStr] = {
          date: dateStr,
          status: 'IZIN',
          polaKerja: emp.jamKerja,
          keterangan: 'Izin keperluan keluarga resmi',
          menitTerlambat: 0,
          menitPulangAwal: 0
        };
      } else if (seed === 37 && day >= 10 && day <= 20) {
        empRecs[dateStr] = {
          date: dateStr,
          status: 'SAKIT',
          polaKerja: emp.jamKerja,
          keterangan: 'Surat Keterangan Dokter',
          menitTerlambat: 0,
          menitPulangAwal: 0
        };
      } else if (seed === 3 || seed === 21) {
        const lateMins = 4 + (seed % 14);
        const jamDatang = `06:${String(45 + lateMins).padStart(2, '0')}`;
        const evalRes = evaluateLatenessStatus(
          jamDatang,
          config.defaultJamMasuk,
          config.toleransiKeterlambatanMenit
        );
        empRecs[dateStr] = {
          date: dateStr,
          status: evalRes.isLate ? 'TERLAMBAT' : 'HADIR',
          jamDatang,
          jamPulang,
          polaKerja: emp.jamKerja,
          menitTerlambat: evalRes.netMinutesLate,
          menitPulangAwal: 0
        };
      } else {
        const arrivalMin = 18 + (seed % 25); // 06:18 .. 06:42
        const jamDatang = `06:${String(arrivalMin).padStart(2, '0')}`;
        empRecs[dateStr] = {
          date: dateStr,
          status: 'HADIR',
          jamDatang,
          jamPulang,
          polaKerja: emp.jamKerja,
          menitTerlambat: 0,
          menitPulangAwal: 0
        };
      }
    }
    nextMap[emp.id] = empRecs;
  });

  return nextMap;
};

export const recalculateAttendanceMapWithConfig = (
  currentMap: Record<string, Record<string, DailyPresensiRecord>>,
  config: PresensiConfig
): Record<string, Record<string, DailyPresensiRecord>> => {
  const nextMap: Record<string, Record<string, DailyPresensiRecord>> = {};
  Object.entries(currentMap).forEach(([empId, recs]) => {
    const nextRecs: Record<string, DailyPresensiRecord> = {};
    Object.entries(recs).forEach(([dateStr, rec]) => {
      if ((rec.status === 'HADIR' || rec.status === 'TERLAMBAT') && rec.jamDatang) {
        const evalRes = evaluateLatenessStatus(
          rec.jamDatang,
          config.defaultJamMasuk,
          config.toleransiKeterlambatanMenit
        );
        const earlyMins = evaluateEarlyLeaveMinutes(rec.jamPulang, dateStr, config);
        nextRecs[dateStr] = {
          ...rec,
          status: evalRes.isLate ? 'TERLAMBAT' : 'HADIR',
          menitTerlambat: evalRes.isLate ? evalRes.netMinutesLate : 0,
          menitPulangAwal: earlyMins
        };
      } else {
        nextRecs[dateStr] = rec;
      }
    });
    nextMap[empId] = nextRecs;
  });
  return nextMap;
};

export const calculateEmployeeMonthlySummary = (
  employee: PresensiEmployeeItem,
  empRecords: Record<string, DailyPresensiRecord> | undefined,
  config: PresensiConfig,
  year: number,
  month1To12: number
): EmployeeMonthlyPresensiSummary => {
  const days = getDaysInMonth(year, month1To12);
  const holidaySet = new Set((config.holidays || []).map(h => h.date));

  let hariKerjaEfektif = 0;
  let hadirTepat = 0;
  let terlambatHari = 0;
  let totalMenitTerlambat = 0;
  let pulangAwalHari = 0;
  let totalMenitPulangAwal = 0;
  let sakit = 0;
  let izin = 0;
  let cuti = 0;
  let alpa = 0;
  let dinasLuar = 0;
  let lupaAbsen = 0;
  let libur = 0;

  for (let day = 1; day <= days; day++) {
    const dateStr = formatDateIso(year, month1To12, day);
    const d = new Date(`${dateStr}T00:00:00`);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const isHol = holidaySet.has(dateStr);
    const rec = empRecords?.[dateStr];

    if (rec?.status === 'LIBUR' || ((isWeekend || isHol) && !rec)) {
      libur++;
      continue;
    }

    hariKerjaEfektif++;
    const st = rec?.status || 'HADIR';
    if (st === 'HADIR') hadirTepat++;
    else if (st === 'TERLAMBAT') {
      terlambatHari++;
      totalMenitTerlambat += rec?.menitTerlambat || 0;
    } else if (st === 'SAKIT') sakit++;
    else if (st === 'IZIN') izin++;
    else if (st === 'CUTI') cuti++;
    else if (st === 'ALPA') alpa++;
    else if (st === 'DL_PENUH' || st === 'DL_MASUK' || st === 'DL_PULANG') dinasLuar++;
    else if (st === 'LUPA_ABSEN') lupaAbsen++;

    if (rec?.menitPulangAwal && rec.menitPulangAwal > 0) {
      pulangAwalHari++;
      totalMenitPulangAwal += rec.menitPulangAwal;
    }
  }

  const totalHadirSah = hadirTepat + terlambatHari + dinasLuar + lupaAbsen;
  const persentaseHadir =
    hariKerjaEfektif > 0 ? Math.min(100, Math.round((totalHadirSah / hariKerjaEfektif) * 1000) / 10) : 100;

  const totalMenitPelanggaran = totalMenitTerlambat + totalMenitPulangAwal;
  const rawPotongan =
    totalMenitPelanggaran * (config.potonganTppPerMenitPersen || 0.05) +
    alpa * (config.potonganAlpaPersen || 3);
  const potonganPersen = Math.min(100, Math.round(rawPotongan * 100) / 100);
  const potonganNominalRp = Math.round(((employee.tppNominal || 0) * potonganPersen) / 100);
  const uangMakanRp = (hadirTepat + terlambatHari + dinasLuar) * (config.tarifMakanHarian || 37000);

  return {
    employee,
    hariKerjaEfektif,
    hadirTepat,
    terlambatHari,
    totalMenitTerlambat,
    pulangAwalHari,
    totalMenitPulangAwal,
    sakit,
    izin,
    cuti,
    alpa,
    dinasLuar,
    lupaAbsen,
    libur,
    persentaseHadir,
    potonganPersen,
    potonganNominalRp,
    uangMakanRp
  };
};

export interface PresensiPredicateInfo {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  shortLabel: string;
  title: string;
  description: string;
  recommendation: string;
  colorHex: string;
  softBgHex: string;
  borderHex: string;
  badgeClass: string;
}

export const PRESENSI_PREDICATE_SCALE: {
  grade: PresensiPredicateInfo['grade'];
  label: string;
  rule: string;
}[] = [
  { grade: 'A', label: 'Sangat Baik', rule: '≥98%, 0 Alpa, Telat ≤10m' },
  { grade: 'B', label: 'Baik', rule: '92–97,9%, 0 Alpa' },
  { grade: 'C', label: 'Cukup', rule: '85–91,9% / Alpa ≤1' },
  { grade: 'D', label: 'Kurang', rule: '75–84,9% / Alpa ≤2' },
  { grade: 'E', label: 'Pembinaan Khusus', rule: '<75% / Alpa ≥3' }
];

export const evaluateAttendancePredicate = (
  summary: EmployeeMonthlyPresensiSummary
): PresensiPredicateInfo => {
  const isGuru = summary.employee.kategori === 'Guru';
  const roleLabel = isGuru ? 'Guru' : 'Tenaga Kependidikan';
  const pct = summary.persentaseHadir;
  const alpa = summary.alpa;
  const lateMins = summary.totalMenitTerlambat;
  const lateDays = summary.terlambatHari;

  if (alpa >= 3 || pct < 75) {
    return {
      grade: 'E',
      label: 'Pembinaan Khusus',
      shortLabel: 'Pembinaan (E)',
      title: isGuru
        ? 'Perlu Pembinaan Khusus Kehadiran Mengajar'
        : 'Perlu Pembinaan Khusus Disiplin Operasional',
      description: `${roleLabel} memiliki tingkat kehadiran efektif ${pct}% dengan ${alpa} hari tanpa keterangan (alpa). Kondisi ini memerlukan pemanggilan dan pembinaan tertulis atasan langsung sesuai ketentuan disiplin ASN/GTK.`,
      recommendation:
        'Lakukan klarifikasi resmi, buat berita acara pembinaan, dan pantau presensi harian secara intensif pada bulan berikutnya.',
      colorHex: '#9f1239',
      softBgHex: '#fff1f2',
      borderHex: '#fecdd3',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300'
    };
  }

  if (alpa >= 2 || pct < 85) {
    return {
      grade: 'D',
      label: 'Kurang',
      shortLabel: 'Kurang (D)',
      title: isGuru
        ? 'Disiplin Kehadiran Mengajar Kurang Optimal'
        : 'Disiplin Layanan Administrasi Kurang Optimal',
      description: `Capaian kehadiran efektif tercatat ${pct}% (${lateDays} hari terlambat, ${alpa} hari alpa). Diperlukan perbaikan ketepatan waktu dan kelengkapan bukti izin agar tidak mengganggu beban kerja sekolah.`,
      recommendation:
        'Berikan teguran lisan/peringatan ringan serta pastikan pengajuan SPTJM atau surat izin disampaikan tepat waktu.',
      colorHex: '#b45309',
      softBgHex: '#fffbeb',
      borderHex: '#fde68a',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300'
    };
  }

  if (alpa === 1 || pct < 92) {
    return {
      grade: 'C',
      label: 'Cukup',
      shortLabel: 'Cukup (C)',
      title: isGuru
        ? 'Kinerja Kehadiran Guru Cukup Baik'
        : 'Kinerja Kehadiran Tendik Cukup Baik',
      description: `Kehadiran efektif sebesar ${pct}% (${lateDays} kali terlambat, akumulasi ${lateMins} menit). Secara umum tugas kedinasan berjalan, namun konsistensi kedatangan perlu ditingkatkan.`,
      recommendation:
        'Pertahankan kehadiran hari kerja penuh dan kurangi frekuensi keterlambatan untuk mencapai predikat Baik/Sangat Baik.',
      colorHex: '#0369a1',
      softBgHex: '#f0f9ff',
      borderHex: '#bae6fd',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-300'
    };
  }

  if (pct >= 98 && alpa === 0 && lateMins <= 10 && lateDays <= 1) {
    return {
      grade: 'A',
      label: 'Sangat Baik',
      shortLabel: 'Sangat Baik (A)',
      title: isGuru
        ? 'Disiplin Mengajar & Ketepatan Waktu Prima'
        : 'Disiplin Layanan Tata Usaha & Ketepatan Waktu Prima',
      description: `${roleLabel} menunjukkan teladan kedisiplinan tinggi dengan tingkat kehadiran efektif ${pct}% tanpa ketidakhadiran tanpa keterangan dan keterlambatan sangat minimal (${lateMins} menit).`,
      recommendation:
        'Pertahankan prestasi kedisiplinan prima sebagai teladan budaya kerja di lingkungan SMA Negeri 9 Surabaya.',
      colorHex: '#065f46',
      softBgHex: '#ecfdf5',
      borderHex: '#a7f3d0',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300'
    };
  }

  return {
    grade: 'B',
    label: 'Baik',
    shortLabel: 'Baik (B)',
    title: isGuru
      ? 'Memenuhi Standar Kedisiplinan Guru BKD'
      : 'Memenuhi Standar Kedisiplinan Tendik BKD',
    description: `${roleLabel} memenuhi target kehadiran BKD dengan capaian ${pct}% tanpa hari alpa (${summary.hadirTepat} hari hadir tepat waktu${
      lateDays > 0 ? `, ${lateDays} hari terlambat / ${lateMins} menit` : ''
    }).`,
    recommendation:
      'Pertahankan kepatuhan jam masuk dan jam pulang kerja agar capaian mendekati predikat Sangat Baik (A).',
    colorHex: '#0f766e',
    softBgHex: '#f0fdfa',
    borderHex: '#99f6e4',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-300'
  };
};

const resolveShiftHari = (jamKerja?: string): 5 | 6 =>
  (jamKerja || '').includes('6') ? 6 : 5;

const formatBkdUnitKerja = (config: PresensiConfig): string => {
  const kode = (config.kodeUnitKerja || '10531100209').trim();
  const unit = (config.namaSubUnit || 'SMAN 9 SURABAYA').toUpperCase();
  if (unit.includes('DINAS PENDIDIKAN')) return `${kode}-${unit}`;
  return `${kode}-DINAS PENDIDIKAN - CABANG DINAS PENDIDIKAN WILAYAH SIDOARJO - ${unit}`;
};

const formatBkdJenisPegawai = (status: PresensiEmployeeItem['statusKepegawaian']): string =>
  status === 'PPPK PW' ? 'PPPK PWT' : status;

const formatBkdDailyLogCell = (
  rec: DailyPresensiRecord | undefined,
  shiftHari: 5 | 6,
  isOffDayDefault: boolean
): string => {
  const st: PresensiStatusType = rec?.status || (isOffDayDefault ? 'LIBUR' : 'HADIR');
  const shiftPrefix = `SEKOLAH ${shiftHari} HARI_DINDIK`;

  if (st === 'LIBUR') return '';
  if (st === 'ALPA') return 'X';
  if (st === 'IZIN') return 'I Tidak Masuk Kerja Dengan Keterangan';
  if (st === 'SAKIT') return 'S Tidak Masuk Kerja Karena Sakit';
  if (st === 'CUTI') return 'C Cuti Pegawai';

  if (st === 'DL_PENUH') {
    const k = rec?.keterangan?.trim();
    if (k && /^(DLDK|DLLK|KTL|KFM)/i.test(k)) return k;
    return 'DLDK-P Perjalanan Dinas Dalam Kota';
  }
  if (st === 'DL_MASUK') {
    const k = rec?.keterangan?.trim();
    if (k && /^(DLDK|DLLK|KFM)/i.test(k)) return k;
    return 'DLDK-S Perjalanan Dinas Dalam Kota Setengah Hari';
  }
  if (st === 'DL_PULANG') {
    const k = rec?.keterangan?.trim();
    if (k && /^(DLDK|DLLK|KFM)/i.test(k)) return k;
    return 'DLLK-S Perjalanan Dinas Luar Kota Setengah Hari';
  }

  if (st === 'LUPA_ABSEN') {
    if (rec?.jamDatang && !rec?.jamPulang) {
      return `TAP ${shiftPrefix} datang : ${rec.jamDatang}`;
    }
    if (!rec?.jamDatang && rec?.jamPulang) {
      return `TAD ${shiftPrefix} pulang : ${rec.jamPulang}`;
    }
    return 'LA Lupa Absen';
  }

  const datang = rec?.jamDatang || '06:35';
  const pulang = rec?.jamPulang || '15:20';
  const code = st === 'TERLAMBAT' ? 'T' : 'Y';
  return `${code} ${shiftPrefix} datang : ${datang} ${shiftPrefix} pulang : ${pulang}`;
};

const buildBkdExcelRowForEmployee = (
  emp: PresensiEmployeeItem,
  idx: number,
  empRecords: Record<string, DailyPresensiRecord> | undefined,
  summary: EmployeeMonthlyPresensiSummary,
  config: PresensiConfig,
  year: number,
  month1To12: number,
  overrideCells?: Record<number, string>
): Record<string, string | number> => {
  const days = getDaysInMonth(year, month1To12);
  const yy = String(year).slice(-2);
  const shiftHari = resolveShiftHari(emp.jamKerja);
  const holidaySet = new Set((config.holidays || []).map(h => h.date));

  const row: Record<string, string | number> = {
    No: idx + 1,
    Nip: emp.nip && emp.nip !== '-' ? `'${emp.nip.replace(/^'+/, '')}` : '-',
    Nama: emp.nama,
    Jenis: formatBkdJenisPegawai(emp.statusKepegawaian),
    'Unit Kerja': formatBkdUnitKerja(config),
    'Jenis Shift': shiftHari
  };

  let totalOfficeMinutes = 0;
  let totalTad = 0;
  let totalTap = 0;

  for (let day = 1; day <= days; day++) {
    const dateStr = formatDateIso(year, month1To12, day);
    const d = new Date(`${dateStr}T00:00:00`);
    const dow = d.getDay();
    const isOff = dow === 0 || dow === 6 || holidaySet.has(dateStr);
    const rec = empRecords?.[dateStr];
    const header = `${day}/${month1To12}/${yy}`;

    if (overrideCells && overrideCells[day] !== undefined) {
      row[header] = overrideCells[day];
    } else {
      row[header] = formatBkdDailyLogCell(rec, shiftHari, isOff);
    }

    const st: PresensiStatusType = rec?.status || (isOff ? 'LIBUR' : 'HADIR');
    if (st === 'LUPA_ABSEN') {
      if (rec?.jamDatang && !rec?.jamPulang) totalTap++;
      else if (!rec?.jamDatang && rec?.jamPulang) totalTad++;
    }
    if (st !== 'LIBUR' && st !== 'ALPA' && st !== 'SAKIT' && st !== 'IZIN' && st !== 'CUTI') {
      const mIn = parseTimeToMinutes(rec?.jamDatang);
      const mOut = parseTimeToMinutes(rec?.jamPulang);
      if (mIn !== null && mOut !== null && mOut > mIn) {
        totalOfficeMinutes += mOut - mIn;
      } else if (st === 'HADIR' || st === 'TERLAMBAT' || st === 'DL_PENUH') {
        totalOfficeMinutes += 8 * 60;
      }
    }
  }

  const toleransiGanti = Math.min(
    summary.totalMenitTerlambat,
    summary.terlambatHari * (config.toleransiKeterlambatanMenit || 0)
  );
  const netTerlambat = Math.max(0, summary.totalMenitTerlambat - toleransiGanti);
  const tpp = emp.tppNominal || 0;
  const potTad = Math.round(totalTad * tpp * 0.007);
  const potTap = Math.round(totalTap * tpp * 0.007);
  const potAlpha = Math.round(summary.alpa * tpp * ((config.potonganAlpaPersen || 2) / 100));
  const potMenitRp = Math.round(netTerlambat * tpp * ((config.potonganTppPerMenitPersen || 0.05) / 100));
  const potPulangAwal = Math.round(
    summary.totalMenitPulangAwal * tpp * ((config.potonganTppPerMenitPersen || 0.05) / 100)
  );
  const totalPotongan = potMenitRp + potPulangAwal + potTad + potTap + potAlpha;

  row['Total Di Kantor (Jam)'] = Math.round(totalOfficeMinutes / 60);
  row['Total Terlambat (Menit)'] = Number(summary.totalMenitTerlambat.toFixed(2));
  row['Toleransi Ganti (Menit)'] = Number(toleransiGanti.toFixed(2));
  row['Total Terlambat - Toleransi (Menit)'] = Number(netTerlambat.toFixed(2));
  row['Potongan/Menit (Rp)'] = potMenitRp;
  row['Potongan Keterlambatan / Pulang Awal (Rp)'] = potMenitRp + potPulangAwal;
  row['Total TAD'] = totalTad;
  row['Total TAP'] = totalTap;
  row['Total Alpha'] = summary.alpa;
  row['Potongan TAD (0.7%)'] = potTad;
  row['Potongan TAP (0.7%)'] = potTap;
  row['Potongan Alpha (2%)'] = potAlpha;
  row['Potongan Senam'] = 0;
  row['Total Potongan'] = totalPotongan || summary.potonganNominalRp;

  return row;
};

export const exportPresensiToExcel = (
  employees: PresensiEmployeeItem[],
  attendanceMap: Record<string, Record<string, DailyPresensiRecord>>,
  config: PresensiConfig,
  year: number,
  month1To12: number,
  buktiList: PresensiBuktiIzinItem[] = []
): void => {
  const days = getDaysInMonth(year, month1To12);
  const summaries = employees.map(emp =>
    calculateEmployeeMonthlySummary(emp, attendanceMap[emp.id], config, year, month1To12)
  );

  // Sheet 1: Format persis E-Presensi BKD Pemprov Jatim (report-pegawai-log)
  const bkdLogRows = summaries.map((s, idx) =>
    buildBkdExcelRowForEmployee(
      s.employee,
      idx,
      attendanceMap[s.employee.id],
      s,
      config,
      year,
      month1To12
    )
  );

  // Sheet 2: Rekapitulasi & Predikat Kehadiran Bulanan
  const rekapRows = summaries.map((s, idx) => {
    const pred = evaluateAttendancePredicate(s);
    return {
      No: idx + 1,
      NIP: s.employee.nip,
      Nama: s.employee.nama,
      Kategori: s.employee.kategori,
      Status: s.employee.statusKepegawaian,
      Jabatan: s.employee.jabatan,
      'Hari Kerja Efektif': s.hariKerjaEfektif,
      'Hadir Tepat (V)': s.hadirTepat,
      'Terlambat (T)': s.terlambatHari,
      'Menit Terlambat': s.totalMenitTerlambat,
      'Sakit (S)': s.sakit,
      'Izin (I)': s.izin,
      'Cuti (C)': s.cuti,
      'Alpa (A/X)': s.alpa,
      'Dinas Luar (DL)': s.dinasLuar,
      'Lupa Absen (LA)': s.lupaAbsen,
      '% Kehadiran': `${s.persentaseHadir}%`,
      'Predikat Bulanan': pred.shortLabel,
      'Keterangan Predikat': pred.title,
      'Potongan TPP (%)': `${s.potonganPersen}%`,
      'Potongan TPP (Rp)': s.potonganNominalRp
    };
  });

  const wb = XLSX.utils.book_new();
  const wsBkdLog = XLSX.utils.json_to_sheet(bkdLogRows);
  wsBkdLog['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 34 },
    { wch: 11 },
    { wch: 54 },
    { wch: 11 },
    ...Array.from({ length: days }, () => ({ wch: 52 })),
    { wch: 18 },
    { wch: 20 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 32 },
    { wch: 10 },
    { wch: 10 },
    { wch: 11 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsBkdLog, 'Log Presensi BKD');

  const wsRekap = XLSX.utils.json_to_sheet(rekapRows);
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap & Predikat');

  if (buktiList.length > 0) {
    const buktiRows = buktiList.map((b, idx) => ({
      No: idx + 1,
      NIP: b.nip,
      Nama: b.nama,
      Kategori: b.kategoriIjin,
      'Tanggal Mulai': b.tanggalMulai,
      'Tanggal Selesai': b.tanggalSelesai,
      'Nomor Surat / SPTJM': b.nomorSurat,
      Keterangan: b.keterangan
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(buktiRows), 'Bukti Izin & SPTJM');
  }

  const bulanSlug = (NAMA_BULAN_ID[month1To12 - 1] || String(month1To12)).replace(/\s+/g, '_');
  XLSX.writeFile(wb, `Report_Log_Presensi_BKD_${bulanSlug}_${year}.xlsx`);
};

export const exportPresensiToCSV = (
  employees: PresensiEmployeeItem[],
  attendanceMap: Record<string, Record<string, DailyPresensiRecord>>,
  config: PresensiConfig,
  year: number,
  month1To12: number
): void => {
  const days = getDaysInMonth(year, month1To12);
  const yy = String(year).slice(-2);
  const holidaySet = new Set((config.holidays || []).map(h => h.date));
  const headers = [
    'No',
    'Nip',
    'Nama',
    'Jenis',
    'Unit Kerja',
    'Jenis Shift',
    ...Array.from({ length: days }, (_, i) => `${i + 1}/${month1To12}/${yy}`),
    'Total Di Kantor (Jam)',
    'Total Terlambat (Menit)',
    'Total Alpha',
    'Persentase Hadir',
    'Predikat'
  ];

  const rows = employees.map((emp, idx) => {
    const s = calculateEmployeeMonthlySummary(emp, attendanceMap[emp.id], config, year, month1To12);
    const pred = evaluateAttendancePredicate(s);
    const shiftHari = resolveShiftHari(emp.jamKerja);
    const dayCols = Array.from({ length: days }, (_, i) => {
      const dateStr = formatDateIso(year, month1To12, i + 1);
      const d = new Date(`${dateStr}T00:00:00`);
      const isOff = d.getDay() === 0 || d.getDay() === 6 || holidaySet.has(dateStr);
      return formatBkdDailyLogCell(attendanceMap[emp.id]?.[dateStr], shiftHari, isOff);
    });
    return [
      idx + 1,
      emp.nip && emp.nip !== '-' ? `'${emp.nip}` : '-',
      emp.nama,
      formatBkdJenisPegawai(emp.statusKepegawaian),
      formatBkdUnitKerja(config),
      shiftHari,
      ...dayCols,
      s.hadirTepat * 8,
      s.totalMenitTerlambat,
      s.alpa,
      `${s.persentaseHadir}%`,
      pred.shortLabel
    ]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const bulanSlug = (NAMA_BULAN_ID[month1To12 - 1] || String(month1To12)).replace(/\s+/g, '_');
  a.download = `Report_Log_Presensi_BKD_${bulanSlug}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadPresensiExcelTemplate = (
  employees: PresensiEmployeeItem[],
  year: number,
  month1To12: number,
  config?: PresensiConfig
): void => {
  const safeConfig: PresensiConfig = config || {
    namaInstansi: 'PEMERINTAH PROVINSI JAWA TIMUR · DINAS PENDIDIKAN',
    namaSubUnit: 'SMA NEGERI 9 SURABAYA',
    kodeUnitKerja: '10531100209',
    zonaWaktu: 'WIB',
    defaultJamMasuk: '06:45',
    defaultJamPulang: '15:15',
    defaultJamPulangJumat: '11:30',
    toleransiKeterlambatanMenit: 0,
    potonganTppPerMenitPersen: 0.05,
    potonganAlpaPersen: 2,
    tarifMakanHarian: 37000,
    kotaTandaTangan: 'Surabaya',
    ttdAtasanNama: 'Dr. Kasminah, M.Pd.',
    ttdAtasanNip: '196803151992032004',
    ttdAtasanJabatan: 'Kepala SMA Negeri 9 Surabaya',
    ttdOperatorNama: 'Dra. Hj. Sri Rahayu',
    ttdOperatorNip: '197405121999032001',
    holidays: DEFAULT_HOLIDAYS_2026
  };

  const days = getDaysInMonth(year, month1To12);
  const targetList = employees.length > 0 ? employees : [];
  const sampleRows = targetList.map((emp, idx) => {
    const sum = calculateEmployeeMonthlySummary(emp, undefined, safeConfig, year, month1To12);
    const shiftHari = resolveShiftHari(emp.jamKerja);
    const overrides: Record<number, string> = {};
    for (let d = 1; d <= days; d++) {
      const dateStr = formatDateIso(year, month1To12, d);
      const dow = new Date(`${dateStr}T00:00:00`).getDay();
      if (dow === 0 || dow === 6) {
        overrides[d] = '';
      } else {
        overrides[d] = `Y SEKOLAH ${shiftHari} HARI_DINDIK datang : 06:35 SEKOLAH ${shiftHari} HARI_DINDIK pulang : 15:20`;
      }
    }
    return buildBkdExcelRowForEmployee(
      emp,
      idx,
      undefined,
      sum,
      safeConfig,
      year,
      month1To12,
      overrides
    );
  });

  const panduanRows = [
    {
      Kode: 'Y SEKOLAH 5 HARI_DINDIK datang : HH:MM SEKOLAH 5 HARI_DINDIK pulang : HH:MM',
      Keterangan: 'Hadir tepat waktu lengkap datang & pulang'
    },
    {
      Kode: 'T SEKOLAH 5 HARI_DINDIK datang : HH:MM SEKOLAH 5 HARI_DINDIK pulang : HH:MM',
      Keterangan: 'Terlambat masuk (otomatis menghitung menit keterlambatan)'
    },
    {
      Kode: 'TAP SEKOLAH 5 HARI_DINDIK datang : HH:MM',
      Keterangan: 'Tidak Absen Pulang (TAP)'
    },
    {
      Kode: 'TAD SEKOLAH 5 HARI_DINDIK pulang : HH:MM',
      Keterangan: 'Tidak Absen Datang (TAD)'
    },
    {
      Kode: 'LA Lupa Absen',
      Keterangan: 'Lupa Absen dengan SPTJM'
    },
    {
      Kode: 'DLDK-P Perjalanan Dinas Dalam Kota / DLLK Perjalanan Dinas Luar Kota Penuh / KTL Tugas Lapangan',
      Keterangan: 'Dinas Luar Penuh'
    },
    {
      Kode: 'DLDK-S / DLLK-S / KFM-S Setengah Hari',
      Keterangan: 'Dinas Luar / Force Majeur Setengah Hari'
    },
    {
      Kode: 'I Tidak Masuk Kerja Dengan Keterangan',
      Keterangan: 'Izin Resmi'
    },
    {
      Kode: 'S Tidak Masuk Kerja Karena Sakit',
      Keterangan: 'Sakit (Surat Dokter)'
    },
    {
      Kode: 'C Cuti Pegawai',
      Keterangan: 'Cuti Tahunan / Besar / Melahirkan'
    },
    {
      Kode: 'X',
      Keterangan: 'Tanpa Keterangan (Alpha)'
    },
    {
      Kode: '(Kosong)',
      Keterangan: 'Akhir pekan / Hari Libur'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Log_BKD');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(panduanRows), 'Panduan_Kode_BKD');
  const bulanSlug = (NAMA_BULAN_ID[month1To12 - 1] || String(month1To12)).replace(/\s+/g, '_');
  XLSX.writeFile(wb, `Template_Log_Presensi_BKD_${bulanSlug}_${year}.xlsx`);
};

interface ParsedDateColHeader {
  key: string;
  day: number;
  month: number;
  year: number;
}

const parseBkdDateHeaderKey = (
  headerKey: string,
  fallbackYear: number,
  fallbackMonth: number
): ParsedDateColHeader | null => {
  const trimmed = headerKey.trim();

  // Match d/m/yy or dd/mm/yyyy or d-m-yy
  const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    let year = Number(slashMatch[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
      return { key: headerKey, day, month, year };
    }
  }

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { key: headerKey, day, month, year };
    }
  }

  // Match Excel serial date numbers (e.g. 46296 = Oct 2026)
  if (/^\d{5}$/.test(trimmed)) {
    const serial = Number(trimmed);
    if (serial >= 40000 && serial <= 65000) {
      const parsed = XLSX.SSF.parse_date_code(serial);
      if (parsed && parsed.d >= 1 && parsed.m >= 1 && parsed.y >= 2000) {
        return { key: headerKey, day: parsed.d, month: parsed.m, year: parsed.y };
      }
    }
  }

  // Fallback Tgl_01 or simple numeric 1..31
  const tglMatch = trimmed.match(/^(?:tgl[_\s-]?)?(\d{1,2})$/i);
  if (tglMatch) {
    const day = Number(tglMatch[1]);
    if (day >= 1 && day <= 31) {
      return { key: headerKey, day, month: fallbackMonth, year: fallbackYear };
    }
  }

  return null;
};

const parseBkdDailyCellText = (
  rawVal: string,
  dateStr: string,
  empJamKerja: string,
  config: PresensiConfig,
  isHolidayOrWeekend: boolean
): DailyPresensiRecord | null => {
  const text = rawVal.trim();
  if (!text) {
    if (isHolidayOrWeekend) {
      return {
        date: dateStr,
        status: 'LIBUR',
        keterangan: 'Libur Akhir Pekan / Resmi',
        menitTerlambat: 0,
        menitPulangAwal: 0
      };
    }
    return null;
  }

  // Extract times in Pemprov Jatim BKD format: "datang : 06:44 ... pulang : 16:11" OR "HH:MM - HH:MM"
  const datangMatch = text.match(/datang\s*:\s*(\d{1,2}[:.]\d{2})/i);
  const pulangMatch = text.match(/pulang\s*:\s*(\d{1,2}[:.]\d{2})/i);
  const rangeMatch = text.match(/(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})/);

  const jamDatang = (datangMatch?.[1] || rangeMatch?.[1])?.replace('.', ':');
  const jamPulang = (pulangMatch?.[1] || rangeMatch?.[2])?.replace('.', ':');

  const upper = text.toUpperCase();
  const firstToken = upper.split(/[\s([]+/)[0];

  let status: PresensiStatusType = 'HADIR';
  let keterangan: string | undefined;

  if (firstToken === 'L' || firstToken === 'LIBUR') {
    status = 'LIBUR';
  } else if (firstToken === 'X' || firstToken === 'A' || firstToken === 'TK' || firstToken === 'ALPA') {
    status = 'ALPA';
    keterangan = 'Tanpa Keterangan (Alpha)';
  } else if (firstToken === 'TAP') {
    status = 'LUPA_ABSEN';
    keterangan = 'TAP - Tidak Absen Pulang';
  } else if (firstToken === 'TAD') {
    status = 'LUPA_ABSEN';
    keterangan = 'TAD - Tidak Absen Datang';
  } else if (firstToken === 'LA') {
    status = 'LUPA_ABSEN';
    keterangan = text;
  } else if (
    firstToken === 'DLDK-S' ||
    firstToken === 'DLLK-S' ||
    firstToken === 'KFM-S' ||
    firstToken === 'DLM'
  ) {
    status = 'DL_MASUK';
    keterangan = text;
  } else if (firstToken === 'DLP') {
    status = 'DL_PULANG';
    keterangan = text;
  } else if (
    firstToken === 'DLDK-P' ||
    firstToken === 'DLDK' ||
    firstToken === 'DLLK' ||
    firstToken === 'KTL' ||
    firstToken === 'KFM-P' ||
    firstToken === 'KFM' ||
    firstToken === 'DL'
  ) {
    status = 'DL_PENUH';
    keterangan = text;
  } else if (firstToken === 'I' || firstToken === 'IZIN') {
    status = 'IZIN';
    keterangan = text;
  } else if (firstToken === 'S' || firstToken === 'SAKIT') {
    status = 'SAKIT';
    keterangan = text;
  } else if (firstToken === 'C' || firstToken === 'CT' || firstToken === 'CUTI') {
    status = 'CUTI';
    keterangan = text;
  } else if (firstToken === 'T' || firstToken === 'TERLAMBAT') {
    status = 'TERLAMBAT';
  } else if (firstToken === 'Y' || firstToken === 'V' || firstToken === 'HADIR') {
    status = 'HADIR';
  }

  const evalLate =
    (status === 'HADIR' || status === 'TERLAMBAT') && jamDatang
      ? evaluateLatenessStatus(
          jamDatang,
          config.defaultJamMasuk,
          config.toleransiKeterlambatanMenit
        )
      : { isLate: false, netMinutesLate: 0 };

  const finalStatus: PresensiStatusType =
    status === 'HADIR' && evalLate.isLate ? 'TERLAMBAT' : status;

  return {
    date: dateStr,
    status: finalStatus,
    jamDatang: finalStatus === 'LIBUR' || finalStatus === 'ALPA' ? undefined : jamDatang,
    jamPulang: finalStatus === 'LIBUR' || finalStatus === 'ALPA' ? undefined : jamPulang,
    polaKerja: empJamKerja,
    menitTerlambat:
      finalStatus === 'TERLAMBAT' ? Math.max(1, evalLate.netMinutesLate || 5) : 0,
    menitPulangAwal:
      jamPulang && finalStatus !== 'LIBUR' && finalStatus !== 'ALPA'
        ? evaluateEarlyLeaveMinutes(jamPulang, dateStr, config)
        : 0,
    hasBukti: finalStatus === 'LUPA_ABSEN' && firstToken === 'LA',
    keterangan
  };
};

export const parseImportedPresensiExcel = async (
  file: File,
  existingEmployees: PresensiEmployeeItem[],
  config: PresensiConfig,
  year: number,
  month1To12: number
): Promise<{
  employees: PresensiEmployeeItem[];
  attendanceMap: Record<string, Record<string, DailyPresensiRecord>>;
  detectedYear?: number;
  detectedMonth?: number;
}> => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: ''
  });

  if (rows.length === 0) {
    return { employees: [], attendanceMap: {} };
  }

  // Detect all date column headers across row keys (supports 1/10/26, 2026-10-01, serial dates, Tgl_01)
  const headerKeys = Object.keys(rows[0]);
  const parsedDateCols: ParsedDateColHeader[] = [];
  headerKeys.forEach(k => {
    const parsed = parseBkdDateHeaderKey(k, year, month1To12);
    if (parsed) parsedDateCols.push(parsed);
  });

  const detectedYear = parsedDateCols[0]?.year;
  const detectedMonth = parsedDateCols[0]?.month;

  const existingByNip = new Map(
    existingEmployees
      .filter(e => e.nip && e.nip !== '-')
      .map(e => [e.nip.replace(/^'+/, '').trim(), e])
  );
  const existingByName = new Map(
    existingEmployees.map(e => [e.nama.toLowerCase().replace(/[.,]/g, '').trim(), e])
  );

  const holidaySet = new Set((config.holidays || []).map(h => h.date));
  const importedEmployees: PresensiEmployeeItem[] = [];
  const importedMap: Record<string, Record<string, DailyPresensiRecord>> = {};

  rows.forEach((rawRow, idx) => {
    const nama = String(rawRow['Nama'] || rawRow['NAMA'] || rawRow['nama'] || '').trim();
    const rawNip = String(rawRow['Nip'] || rawRow['NIP'] || rawRow['nip'] || '-').trim();
    const nip = rawNip.replace(/^'+/, '').trim() || '-';
    if (!nama) return;

    const normName = nama.toLowerCase().replace(/[.,]/g, '').trim();
    const matched =
      (nip !== '-' ? existingByNip.get(nip) : undefined) || existingByName.get(normName);

    const jenisStr = String(
      rawRow['Jenis'] || rawRow['Status'] || rawRow['STATUS'] || ''
    ).trim();
    const shiftRaw = Number(rawRow['Jenis Shift'] || rawRow['Shift'] || 5);
    const shiftHari = shiftRaw === 6 ? 6 : 5;
    const defaultJamKerja = `${shiftHari} HK (${config.defaultJamMasuk} - ${config.defaultJamPulang})`;

    const kategoriRaw = String(rawRow['Kategori'] || '').toLowerCase();
    const kategori: PresensiEmployeeItem['kategori'] =
      matched?.kategori ||
      (kategoriRaw.includes('tendik') ||
      kategoriRaw.includes('karyawan') ||
      kategoriRaw.includes('tu')
        ? 'Karyawan / Tendik'
        : 'Guru');

    const statusKepegawaian = jenisStr
      ? normalizeStatusKepegawaian(jenisStr)
      : matched?.statusKepegawaian || 'PNS';

    const jabatan = String(
      rawRow['Jabatan'] || matched?.jabatan || (kategori === 'Guru' ? 'Guru Mata Pelajaran' : 'Tenaga Kependidikan')
    ).trim();

    const emp: PresensiEmployeeItem = matched
      ? {
          ...matched,
          nama,
          nip,
          jabatan,
          kategori,
          statusKepegawaian,
          jamKerja: defaultJamKerja
        }
      : {
          id: `pres-imp-${Date.now()}-${idx}`,
          nip,
          nama,
          jabatan,
          kategori,
          statusKepegawaian,
          pangkatGolongan: '-',
          jamKerja: defaultJamKerja,
          tppNominal: inferDefaultTpp(statusKepegawaian, jabatan),
          sourceType: 'manual'
        };

    importedEmployees.push(emp);
    const empRecs: Record<string, DailyPresensiRecord> = {};

    parsedDateCols.forEach(col => {
      const dateStr = formatDateIso(col.year, col.month, col.day);
      const cellVal = String(rawRow[col.key] ?? '').trim();
      const d = new Date(`${dateStr}T00:00:00`);
      const isOff = d.getDay() === 0 || d.getDay() === 6 || holidaySet.has(dateStr);

      const parsedRec = parseBkdDailyCellText(cellVal, dateStr, emp.jamKerja, config, isOff);
      if (parsedRec) {
        empRecs[dateStr] = parsedRec;
      }
    });

    importedMap[emp.id] = empRecs;
  });

  return {
    employees: importedEmployees,
    attendanceMap: importedMap,
    detectedYear,
    detectedMonth
  };
};
