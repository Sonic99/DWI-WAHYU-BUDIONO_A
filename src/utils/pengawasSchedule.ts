import {
  Guru,
  Tendik,
  JadwalPengawasSlot,
  PanitiaPengawasItem,
  KartuPanitiaSettings
} from '../types';
import {
  normalizeIndonesianBaseName,
  findGtkMatchByAliases,
  formatGtkDisplayName
} from './panitiaFormat';

export const DEFAULT_JADWAL_PENGAWAS_SLOTS: JadwalPengawasSlot[] = [
  {
    id: 's01',
    hari: 'Jumat',
    tanggal: '27-Nov-26',
    waktu: '07.00 - 09.30',
    mapel: 'BIOLOGI / INFORMATIKA',
    sesiLabel: 'Sesi 1'
  },
  {
    id: 's02',
    hari: 'Jumat',
    tanggal: '27-Nov-26',
    waktu: '10.00 - 11.30',
    mapel: 'MATEMATIKA',
    sesiLabel: 'Sesi 2'
  },
  {
    id: 's03',
    hari: 'Senin',
    tanggal: '30-Nov-26',
    waktu: '07.00 - 09.30',
    mapel: 'B. INDONESIA / SENI BUDAYA',
    sesiLabel: 'Sesi 1'
  },
  {
    id: 's04',
    hari: 'Senin',
    tanggal: '30-Nov-26',
    waktu: '10.00 - 13.00',
    mapel: 'B. INDONESIA / SENI BUDAYA',
    sesiLabel: 'Sesi 2'
  },
  {
    id: 's05',
    hari: 'Selasa',
    tanggal: '01-Des-26',
    waktu: '07.00 - 09.30',
    mapel: 'B. INGGRIS / SEJARAH',
    sesiLabel: 'Sesi 1'
  },
  {
    id: 's06',
    hari: 'Selasa',
    tanggal: '01-Des-26',
    waktu: '10.30 - 13.00',
    mapel: 'B. INGGRIS / SEJARAH',
    sesiLabel: 'Sesi 2'
  },
  {
    id: 's07',
    hari: 'Rabu',
    tanggal: '02-Des-26',
    waktu: '07.00 - 09.30',
    mapel: 'FISIKA / SOSIOLOGI / PENJASORKES',
    sesiLabel: 'Sesi 1'
  },
  {
    id: 's08',
    hari: 'Rabu',
    tanggal: '02-Des-26',
    waktu: '10.30 - 13.00',
    mapel: 'FISIKA / SOSIOLOGI / PENJASORKES',
    sesiLabel: 'Sesi 2'
  },
  {
    id: 's09',
    hari: 'Kamis',
    tanggal: '03-Des-26',
    waktu: '07.00 - 08.30',
    mapel: 'KIMIA / BAHASA JAWA',
    sesiLabel: 'Sesi 1'
  },
  {
    id: 's10',
    hari: 'Kamis',
    tanggal: '03-Des-26',
    waktu: '10.30 - 13.00',
    mapel: 'KIMIA / EKO / BAHASA JAWA',
    sesiLabel: 'Sesi 2'
  },
  {
    id: 's11',
    hari: 'Jumat',
    tanggal: '04-Des-26',
    waktu: '07.00 - 09.30',
    mapel: 'MATEMATIKA / PEND. PANCASILA',
    sesiLabel: 'Sesi 1'
  },
  {
    id: 's12',
    hari: 'Jumat',
    tanggal: '04-Des-26',
    waktu: '10.30 - 11.30',
    mapel: 'PEND. PANCASILA',
    sesiLabel: 'Sesi 2'
  },
  {
    id: 's13',
    hari: 'Senin',
    tanggal: '07-Des-26',
    waktu: '07.00 - 09.30',
    mapel: 'EKO / MAT LANJUT / SEJARAH / PEND. AGAMA',
    sesiLabel: 'Sesi 1'
  },
  {
    id: 's14',
    hari: 'Senin',
    tanggal: '07-Des-26',
    waktu: '10.30 - 13.00',
    mapel: 'MAT LANJUT / SEJARAH / PEND. AGAMA',
    sesiLabel: 'Sesi 2'
  },
  {
    id: 's15',
    hari: 'Selasa',
    tanggal: '08-Des-26',
    waktu: '07.00 - 08.30',
    mapel: 'GEO / SOSIOLOGI',
    sesiLabel: 'Sesi 1'
  },
  {
    id: 's16',
    hari: 'Selasa',
    tanggal: '08-Des-26',
    waktu: '10.30 - 12.00',
    mapel: 'BIO / INFORMATIKA / GEO',
    sesiLabel: 'Sesi 2'
  }
];

export const DEFAULT_JADWAL_PENGAWAS_KETERANGAN: string[] = [
  'SESI PERTAMA KELAS X DAN XI • SESI KEDUA KELAS XII',
  '1. Pengawas hadir 30 menit sebelum PSAS dimulai.',
  '2. Tidak diperkenankan mengganti atau tukar menukar jadwal.',
  '3. Bila berhalangan hadir, wajib mencari pengganti dan menghubungi Sie Ruang dan pengawasan.'
];

export interface DefaultPengawasMatrixRow {
  seq: number;
  displayName: string;
  matchAliases: string[];
  assignments: string[];
}

export const DEFAULT_JADWAL_PENGAWAS_ROWS: DefaultPengawasMatrixRow[] = [
  {
    seq: 1,
    displayName: 'Sholihatin, S.Pd., M.Si',
    matchAliases: ['Sholihatin'],
    assignments: ['CAD 1', '2', 'LABKOM', 'LABKOM', 'CAD 6', '4', '3', 'OFF', '1', 'OFF', '6', '2', 'CAD 5', '6', '4', 'CAD 4']
  },
  {
    seq: 2,
    displayName: 'Tjatur Rose Diany, S.Pd',
    matchAliases: ['Tjatur Rose Diany'],
    assignments: ['CAD 3', 'LABKOM', '3', 'CAD 3', 'LABKOM', '6', 'CAD 6', '3', '4', 'CAD 6', '4', '5', '4', 'LABKOM', '3', 'OFF']
  },
  {
    seq: 3,
    displayName: 'Dra. Lilis Widarini',
    matchAliases: ['Lilis Widarini'],
    assignments: ['CAD 6', '5', '5', 'OFF', '2', '1', 'CAD 4', '1', '6', '5', 'CAD 5', '3', '5', 'OFF', '2', 'CAD 6']
  },
  {
    seq: 4,
    displayName: 'Nurani, M.Pd',
    matchAliases: ['Nurani'],
    assignments: ['OFF', 'OFF', 'OFF', 'OFF', '1', '5', '4', '2', 'OFF', 'OFF', 'OFF', 'OFF', 'OFF', 'OFF', '1', '2']
  },
  {
    seq: 5,
    displayName: 'Andri Sukristyono, S.Psi., M.Si',
    matchAliases: ['Andri Sukristyono'],
    assignments: ['CAD 2', '6', '1', '3', '3', 'CAD 1', 'OFF', '5', '5', 'OFF', '5', '1', 'CAD 4', '3', '6', 'CAD 5']
  },
  {
    seq: 6,
    displayName: 'Sulistyowati, S.Pd',
    matchAliases: ['Sulistyowati'],
    assignments: ['CAD 5', '4', '6', '6', 'OFF', 'LABKOM', 'CAD 3', '6', 'LABKOM', 'OFF', '1', 'LABKOM', 'CAD 6', '2', 'LABKOM', '6']
  },
  {
    seq: 7,
    displayName: 'Anie Setiawati, S.Pd',
    matchAliases: ['Anie Setiawati'],
    assignments: ['2', 'CAD 2', '13', '5', '5', 'CAD 3', 'OFF', '14', '10', '4', 'CAD 2', '6', '6', '4', 'OFF', '5']
  },
  {
    seq: 8,
    displayName: "Siti A'isyah, S.Pd",
    matchAliases: ["Siti A'isyah", 'Siti Aisyah'],
    assignments: ['3', 'CAD 1', '10', '2', '6', 'OFF', 'CAD 2', '12', '7', 'LABKOM', 'CAD 4', '8', '2', 'OFF', '5', '3']
  },
  {
    seq: 9,
    displayName: 'Dewi Rintan Sari, S.Pd',
    matchAliases: ['Dewi Rintan Sari'],
    assignments: ['4', 'OFF', '9', 'CAD 2', '14', '2', '5', 'ABM 2', '11', '1', 'CAD 3', '19', '3', '18', '9', 'OFF']
  },
  {
    seq: 10,
    displayName: 'Siti Ramlah, S.Pd',
    matchAliases: ['Siti Ramlah'],
    assignments: ['1', '1', '4', '4', 'OFF', 'OFF', '2', '4', '2', '2', 'OFF', 'OFF', 'LABKOM', '5', 'OFF', 'OFF']
  },
  {
    seq: 11,
    displayName: 'Drs. Sriyamil, M.Ag',
    matchAliases: ['Sriyamil'],
    assignments: ['CAD 4', '3', '2', '1', '4', 'OFF', 'CAD 5', 'LABKOM', '3', '3', 'CAD 6', '4', '1', '1', 'OFF', '1']
  },
  {
    seq: 12,
    displayName: 'Amina Hati Baene, S.Pd.',
    matchAliases: ['Amina Hati Baene'],
    assignments: ['6', 'CAD 3', '11', '20', 'OFF', '3', '1', 'ABM 3', '22', '6', 'CAD 1', '14', '15', '13', 'OFF', '4']
  },
  {
    seq: 13,
    displayName: 'Muhammad Fikri, S.Pd',
    matchAliases: ['Muhammad Fikri'],
    assignments: ['5', 'CAD 4', '21', '9', '9', 'ABM 3', 'LABKOM', 'OFF', '8', '19', '2', 'OFF', '12', 'CAD 5', '22', 'LABKOM']
  },
  {
    seq: 14,
    displayName: 'Salisa Nun Shiha, S.Pd',
    matchAliases: ['Salisa Nun Shiha'],
    assignments: ['LABKOM', 'OFF', '15', 'ABM 1', '8', '18', '6', 'CAD 3', '15', '8', 'LABKOM', 'CAD 4', '17', '20', '20', 'OFF']
  },
  {
    seq: 15,
    displayName: 'Himmatul Asfaroh, S.Pd',
    matchAliases: ['Himmatul Asfaroh'],
    assignments: ['14', '20', '20', '11', '17', '10', 'CAD 1', '19', 'OFF', 'OFF', '7', '13', 'CAD 2', '11', '8', 'CAD 3']
  },
  {
    seq: 16,
    displayName: 'Irwan Hidayanto, S.Pd',
    matchAliases: ['Irwan Hidayanto'],
    assignments: ['7', 'CAD 6', '8', '12', '7', 'CAD 4', '14', 'CAD 2', '17', '16', '3', 'CAD 1', '11', 'OFF', '17', '9']
  },
  {
    seq: 17,
    displayName: 'Yustin Wahyu Ameliawati, S.Pd',
    matchAliases: ['Yustin Wahyu Ameliawati'],
    assignments: ['OFF', '17', '14', 'ABM 2', '13', '19', '7', 'CAD 1', '19', '18', '20', 'OFF', '10', 'CAD 6', '10', '7']
  },
  {
    seq: 18,
    displayName: 'Herliyan Widya Aji Wahyu P, S.Pd',
    matchAliases: ['Herliyan Widya Aji Wahyu'],
    assignments: ['20', 'CAD 5', '17', '15', '15', 'OFF', '22', 'ABM 1', '12', 'OFF', '19', '11', '13', 'CAD 4', '12', '17']
  },
  {
    seq: 19,
    displayName: 'Juniva Bunga Widho Arista, S.Pd',
    matchAliases: ['Juniva Bunga Widho Arista'],
    assignments: ['15', '15', 'CAD 6', '18', '11', 'OFF', '13', '17', 'CAD 1', '14', '18', 'CAD 2', '18', 'OFF', '7', '15']
  },
  {
    seq: 20,
    displayName: 'M. Zainal Abidin, S.Pd',
    matchAliases: ['M. Zainal Abidin', 'Zainal Abidin'],
    assignments: ['19', '11', 'OFF', 'ABM 4', '19', '14', '17', '7', 'CAD 6', '7', 'OFF', 'CAD 3', '16', '17', '18', 'CAD 1']
  },
  {
    seq: 21,
    displayName: 'Pranutasani Parameswari, P, S.Pd',
    matchAliases: ['Pranutasani Parameswari'],
    assignments: ['22', '19', 'OFF', 'ABM 3', '10', '12', '9', '9', 'CAD 5', '12', '9', 'CAD 6', '8', '15', '16', 'OFF']
  },
  {
    seq: 22,
    displayName: 'Ismi Fauziatus Solihah, S.Pd',
    matchAliases: ['Ismi Fauziatus Solihah'],
    assignments: ['17', '8', 'CAD 2', '10', '18', 'ABM 2', 'OFF', '10', '14', '9', '13', 'CAD 5', '21', 'OFF', '19', '20']
  },
  {
    seq: 23,
    displayName: 'Muchamad Dyan Febriawan, S.Pd',
    matchAliases: ['Muchamad Dyan Febriawan'],
    assignments: ['8', '13', 'CAD 4', 'OFF', '16', '11', '19', 'OFF', '18', 'CAD 1', '16', '18', '7', 'CAD 2', '13', '13']
  },
  {
    seq: 24,
    displayName: 'Karmila Fairuz Mahdiyyah, S.Pd',
    matchAliases: ['Karmila Fairuz Mahdiyyah'],
    assignments: ['9', '12', 'CAD 1', '13', '21', 'ABM 1', '21', 'OFF', '13', '11', '15', '20', 'CAD 3', '19', '11', 'OFF']
  },
  {
    seq: 25,
    displayName: 'Narita Permata Sari, S.Pd',
    matchAliases: ['Narita Permata Sari'],
    assignments: ['21', 'OFF', '22', 'CAD 1', '20', '8', '15', '18', 'CAD 2', '17', '8', '10', 'OFF', 'CAD 3', '21', '19']
  },
  {
    seq: 26,
    displayName: 'Mia Arfiana, S.Pd, Gr',
    matchAliases: ['Mia Arfiana'],
    assignments: ['OFF', '14', '12', '17', 'CAD 2', '9', '8', '20', 'CAD 4', '10', '14', 'OFF', '9', 'CAD 1', '15', '8']
  },
  {
    seq: 27,
    displayName: 'Dewi Sinta, S.Pd',
    matchAliases: ['Dewi Sinta'],
    assignments: ['18', '7', 'CAD 3', '19', 'OFF', '15', '20', '8', 'OFF', 'CAD 4', '10', '17', '20', '7', 'CAD 5', '16']
  },
  {
    seq: 28,
    displayName: 'Mohammad Nanang Prastyawan, S.Pd',
    matchAliases: ['Mohammad Nanang Prastyawan', 'Nanang Prastyawan'],
    assignments: ['11', '16', 'CAD 5', '14', '12', 'CAD 2', 'OFF', '15', '20', '15', '17', '12', 'OFF', '10', 'CAD 1', '11']
  },
  {
    seq: 29,
    displayName: 'Audria Octavia Sri Anjani, S.Pd',
    matchAliases: ['Audria Octavia Sri Anjani'],
    assignments: ['12', '10', 'OFF', '8', 'CAD 5', '13', '16', 'CAD 4', '9', 'CAD 3', '21', '16', '19', '8', 'CAD 4', '18']
  },
  {
    seq: 30,
    displayName: 'Antonia Zukhruf Kama Duta Aprilia, S.Pd, Gr.',
    matchAliases: ['Antonia Zukhruf Kama Duta Aprilia', 'Antonia Zukhruf'],
    assignments: ['13', '9', '16', 'OFF', 'CAD 4', '16', '18', 'OFF', '16', 'CAD 2', '11', '9', '14', '14', 'CAD 3', '10']
  },
  {
    seq: 31,
    displayName: 'Azizah Eka Putri, S.Pd',
    matchAliases: ['Azizah Eka Putri'],
    assignments: ['16', '18', '18', 'CAD 4', 'CAD 1', '20', '10', '16', 'CAD 3', '13', '12', '15', 'OFF', '9', 'CAD 6', '14']
  },
  {
    seq: 32,
    displayName: 'Naufal Syafa Aflah Dewangga, M.Pd',
    matchAliases: ['Naufal Syafa Aflah Dewangga', 'Naufal Syafa'],
    assignments: ['10', 'OFF', '7', '7', 'CAD 3', '7', '11', '11', 'OFF', 'CAD 5', '22', '7', '22', '12', 'CAD 2', '12']
  },
  {
    seq: 33,
    displayName: 'Fauzia Nurmalasari, S.Pd., Gr',
    matchAliases: ['Fauzia Nurmalasari'],
    assignments: ['OFF', 'OFF', '19', '16', '22', '17', '12', '13', '21', '20', 'OFF', 'OFF', 'CAD 1', '16', '14', 'CAD 2']
  }
];

export type AssignmentKind = 'jaga' | 'cad' | 'off' | 'empty';

export const normalizeAssignmentValue = (raw?: string): string => {
  const clean = (raw || '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (!clean || clean === '-') return '';
  return clean;
};

export const classifyAssignment = (raw?: string): AssignmentKind => {
  const val = normalizeAssignmentValue(raw);
  if (!val) return 'empty';
  if (val === 'OFF' || val === 'LIBUR') return 'off';
  if (val.startsWith('CAD')) return 'cad';
  return 'jaga';
};

export const formatSlotAssignmentShort = (raw?: string): string => {
  const val = normalizeAssignmentValue(raw);
  if (!val) return '-';
  if (/^\d{1,2}$/.test(val)) return `R.${val}`;
  return val;
};

export const formatSlotAssignmentBadgeText = (raw?: string): string => {
  const val = normalizeAssignmentValue(raw);
  if (!val) return '-';
  if (/^\d{1,2}$/.test(val)) return `Ruang ${val}`;
  return val;
};

export interface PengawasScheduleSummary {
  jaga: number;
  cad: number;
  off: number;
  filledSlots: number;
  uniqueRooms: string[];
  hasSesi1: boolean;
  hasSesi2: boolean;
  ruangSummary: string;
  sesiSummary: string;
}

export const summarizePengawasSchedule = (
  jadwalMengawas: Record<string, string> | undefined,
  slots: JadwalPengawasSlot[]
): PengawasScheduleSummary => {
  const map = jadwalMengawas || {};
  let jaga = 0;
  let cad = 0;
  let off = 0;
  let filledSlots = 0;
  let hasSesi1 = false;
  let hasSesi2 = false;
  const roomSet = new Set<string>();

  slots.forEach(slot => {
    const raw = normalizeAssignmentValue(map[slot.id]);
    if (!raw) return;
    filledSlots++;
    const kind = classifyAssignment(raw);
    if (kind === 'off') {
      off++;
      return;
    }
    if (kind === 'cad') {
      cad++;
    } else if (kind === 'jaga') {
      jaga++;
      roomSet.add(formatSlotAssignmentShort(raw));
    }
    if (/sesi\s*1/i.test(slot.sesiLabel)) hasSesi1 = true;
    if (/sesi\s*2/i.test(slot.sesiLabel)) hasSesi2 = true;
  });

  const uniqueRooms = Array.from(roomSet);
  const compactRooms =
    uniqueRooms.length <= 5
      ? uniqueRooms.join(', ')
      : `${uniqueRooms.slice(0, 4).join(', ')} (+${uniqueRooms.length - 4})`;

  const ruangSummary =
    filledSlots === 0
      ? ''
      : uniqueRooms.length > 0
      ? `${compactRooms} (${jaga} Jaga • ${cad} CAD)`
      : `Cadangan (${cad} CAD • ${off} OFF)`;

  const sesiSummary =
    filledSlots === 0
      ? ''
      : hasSesi1 && hasSesi2
      ? `Sesi 1 & 2 (${jaga} Jaga · ${cad} CAD · ${off} OFF)`
      : hasSesi1
      ? `Sesi 1 (${jaga} Jaga · ${cad} CAD)`
      : hasSesi2
      ? `Sesi 2 (${jaga} Jaga · ${cad} CAD)`
      : `${jaga} Jaga · ${cad} CAD · ${off} OFF`;

  return {
    jaga,
    cad,
    off,
    filledSlots,
    uniqueRooms,
    hasSesi1,
    hasSesi2,
    ruangSummary,
    sesiSummary
  };
};

export interface ExamDaySlotGroup {
  dayKey: string;
  hari: string;
  tanggal: string;
  shortLabel: string;
  sesi1?: JadwalPengawasSlot;
  sesi2?: JadwalPengawasSlot;
  extraSlots: JadwalPengawasSlot[];
}

const SHORT_DAY_MAP: Record<string, string> = {
  senin: 'Sen',
  selasa: 'Sel',
  rabu: 'Rab',
  kamis: 'Kam',
  jumat: 'Jum',
  sabtu: 'Sab'
};

export const formatShortDayDate = (hari: string, tanggal: string): string => {
  const shortDay = SHORT_DAY_MAP[hari.toLowerCase().trim()] || hari.slice(0, 3);
  const datePart = tanggal.replace(/-20?\d{2}$/, '').replace('-', ' ');
  return `${shortDay}, ${datePart}`;
};

export const groupSlotsByExamDay = (slots: JadwalPengawasSlot[]): ExamDaySlotGroup[] => {
  const groups: ExamDaySlotGroup[] = [];
  const byKey = new Map<string, ExamDaySlotGroup>();

  slots.forEach(slot => {
    const dayKey = `${slot.hari.trim()}|${slot.tanggal.trim()}`;
    let group = byKey.get(dayKey);
    if (!group) {
      group = {
        dayKey,
        hari: slot.hari,
        tanggal: slot.tanggal,
        shortLabel: formatShortDayDate(slot.hari, slot.tanggal),
        extraSlots: []
      };
      byKey.set(dayKey, group);
      groups.push(group);
    }
    if (/sesi\s*1/i.test(slot.sesiLabel) && !group.sesi1) {
      group.sesi1 = slot;
    } else if (/sesi\s*2/i.test(slot.sesiLabel) && !group.sesi2) {
      group.sesi2 = slot;
    } else {
      group.extraSlots.push(slot);
    }
  });

  return groups;
};

export const recomputeTotalsPerSlot = (
  pengawasItems: PanitiaPengawasItem[],
  slots: JadwalPengawasSlot[]
): Record<string, { jaga: number; cad: number; off: number }> => {
  const totals: Record<string, { jaga: number; cad: number; off: number }> = {};
  slots.forEach(s => {
    totals[s.id] = { jaga: 0, cad: 0, off: 0 };
  });

  pengawasItems.forEach(item => {
    if (item.kategori !== 'pengawas' || !item.jadwalMengawas) return;
    slots.forEach(s => {
      const kind = classifyAssignment(item.jadwalMengawas?.[s.id]);
      if (kind === 'jaga') totals[s.id].jaga++;
      else if (kind === 'cad') totals[s.id].cad++;
      else if (kind === 'off') totals[s.id].off++;
    });
  });

  return totals;
};

export const buildAssignmentRecordFromRow = (
  assignments: string[],
  slots: JadwalPengawasSlot[] = DEFAULT_JADWAL_PENGAWAS_SLOTS
): Record<string, string> => {
  const record: Record<string, string> = {};
  slots.forEach((slot, idx) => {
    const val = assignments[idx];
    if (val !== undefined) {
      record[slot.id] = val;
    }
  });
  return record;
};

export const buildDefaultInitialPengawasItems = (
  prefix = 'PGW-26-'
): PanitiaPengawasItem[] => {
  return DEFAULT_JADWAL_PENGAWAS_ROWS.map(row => {
    const jadwalMengawas = buildAssignmentRecordFromRow(
      row.assignments,
      DEFAULT_JADWAL_PENGAWAS_SLOTS
    );
    const summary = summarizePengawasSchedule(
      jadwalMengawas,
      DEFAULT_JADWAL_PENGAWAS_SLOTS
    );
    return {
      id: `pp-pgw-${String(row.seq).padStart(2, '0')}`,
      kategori: 'pengawas',
      nomorTugas: `${prefix}${String(row.seq).padStart(3, '0')}`,
      nama: row.displayName,
      nip: '-',
      pangkatGolongan: '-',
      jabatanKepanitiaan: 'Pengawas Ruang',
      unitAsal: 'Guru Mapel',
      ruangTugas: summary.ruangSummary || `R.${String(row.seq).padStart(2, '0')}`,
      sesiTugas: summary.sesiSummary || 'Sesi 1 & 2',
      sourceType: 'manual',
      jadwalMengawas
    };
  });
};

export interface BuildPengawasScheduleResult {
  nextItems: PanitiaPengawasItem[];
  matchedFromGtkCount: number;
  unmatchedNames: string[];
}

export const buildPengawasFromJadwalMatrix = (
  guruList: Guru[],
  tendikList: Tendik[],
  existingItems: PanitiaPengawasItem[],
  settings: KartuPanitiaSettings
): BuildPengawasScheduleResult => {
  const prefix = settings.prefixNomorPengawas || 'PGW-26-';
  const slots =
    settings.jadwalPengawasSlots && settings.jadwalPengawasSlots.length > 0
      ? settings.jadwalPengawasSlots
      : DEFAULT_JADWAL_PENGAWAS_SLOTS;

  const existingPanitia = existingItems.filter(i => i.kategori === 'panitia');
  const existingPengawas = existingItems.filter(i => i.kategori === 'pengawas');

  let matchedFromGtkCount = 0;
  const unmatchedNames: string[] = [];

  const generatedPengawas: PanitiaPengawasItem[] = DEFAULT_JADWAL_PENGAWAS_ROWS.map(row => {
    const match = findGtkMatchByAliases(
      [row.displayName, ...row.matchAliases],
      'guru',
      guruList,
      tendikList
    );

    const existingSame = existingPengawas.find(prev => {
      if (match && prev.sourceId && prev.sourceId === match.entry.id) return true;
      const prevNorm = normalizeIndonesianBaseName(prev.nama);
      return [row.displayName, ...row.matchAliases].some(
        a => normalizeIndonesianBaseName(a) === prevNorm
      );
    });

    if (match) {
      matchedFromGtkCount++;
    } else {
      unmatchedNames.push(row.displayName);
    }

    const entry = match?.entry;
    const rawNip = (entry?.nip || '').trim();
    const resolvedUnit =
      match?.sourceType === 'guru'
        ? entry?.mataPelajaran || entry?.mapel || entry?.jabatan || 'Guru Mapel'
        : entry?.jabatan || (entry as Tendik | undefined)?.tugasUtama || 'Guru Mapel';

    const dbHasTitle = Boolean(entry && (entry.gelar?.trim() || /,|\./.test(entry.nama)));
    const resolvedName = entry
      ? dbHasTitle && entry.nama.trim().length > 0 && !/^[A-Z\s]+$/.test(entry.nama.trim())
        ? formatGtkDisplayName(entry.nama, entry.gelar)
        : row.displayName
      : existingSame?.nama?.trim() || row.displayName;

    const baseSchedule = buildAssignmentRecordFromRow(row.assignments, slots);
    const jadwalMengawas =
      existingSame?.jadwalMengawas && Object.keys(existingSame.jadwalMengawas).length > 0
        ? { ...baseSchedule, ...existingSame.jadwalMengawas }
        : baseSchedule;

    const summary = summarizePengawasSchedule(jadwalMengawas, slots);

    return {
      id: existingSame?.id || `pp-pgw-${String(row.seq).padStart(2, '0')}`,
      kategori: 'pengawas',
      nomorTugas: `${prefix}${String(row.seq).padStart(3, '0')}`,
      nama: resolvedName,
      nip: rawNip || (existingSame?.nip && existingSame.nip !== '-' ? existingSame.nip : '-'),
      pangkatGolongan: entry?.pangkatGolongan || existingSame?.pangkatGolongan || '-',
      jabatanKepanitiaan: existingSame?.jabatanKepanitiaan?.trim() || 'Pengawas Ruang',
      unitAsal: resolvedUnit,
      ruangTugas: summary.ruangSummary || existingSame?.ruangTugas || '-',
      sesiTugas: summary.sesiSummary || existingSame?.sesiTugas || 'Sesi 1 & 2',
      fotoUrl: existingSame?.fotoUrl,
      barcodeLink: existingSame?.barcodeLink,
      sourceType: match ? match.sourceType : existingSame?.sourceType || 'manual',
      sourceId: entry?.id || existingSame?.sourceId,
      jadwalMengawas
    };
  });

  // Keep any extra manually-added pengawas beyond the 33 default rows
  const usedIds = new Set(generatedPengawas.map(g => g.id));
  const usedNormNames = new Set(generatedPengawas.map(g => normalizeIndonesianBaseName(g.nama)));
  const extraPengawas = existingPengawas.filter(prev => {
    if (usedIds.has(prev.id)) return false;
    if (/^pp-pgw-0[1-4]$/.test(prev.id) && /achmad diran|agusta yudistira|siti rohmah|bambang heru/i.test(prev.nama)) {
      return false;
    }
    return !usedNormNames.has(normalizeIndonesianBaseName(prev.nama));
  });

  return {
    nextItems: [...existingPanitia, ...generatedPengawas, ...extraPengawas],
    matchedFromGtkCount,
    unmatchedNames
  };
};
