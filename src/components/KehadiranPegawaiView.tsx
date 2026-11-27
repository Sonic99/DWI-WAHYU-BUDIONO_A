import React, { useEffect, useMemo, useState } from 'react';
import {
  DailyPresensiRecord,
  EmployeeMonthlyPresensiSummary,
  Guru,
  PresensiBuktiIzinItem,
  PresensiConfig,
  PresensiEmployeeItem,
  PresensiHolidayItem,
  PresensiMonthlyRepoItem,
  PresensiStatusType,
  SchoolProfile,
  Tendik,
  User
} from '../types';
import {
  appendAuditLog,
  getStoredPresensiBukti,
  getStoredPresensiConfig,
  getStoredPresensiEmployees,
  getStoredPresensiMap,
  saveStoredPresensiBukti,
  saveStoredPresensiConfig,
  saveStoredPresensiEmployees,
  saveStoredPresensiMap
} from '../services/storageService';
import {
  calculateEmployeeMonthlySummary,
  downloadPresensiExcelTemplate,
  evaluateAttendancePredicate,
  evaluateEarlyLeaveMinutes,
  evaluateLatenessStatus,
  exportPresensiToCSV,
  exportPresensiToExcel,
  formatDateIso,
  getDaysInMonth,
  NAMA_BULAN_ID,
  NAMA_HARI_SINGKAT,
  parseImportedPresensiExcel,
  recalculateAttendanceMapWithConfig,
  sanitizeHolidaysInAttendanceMap,
  seedAttendanceMonthForEmployees,
  STATUS_PRESENSI_META,
  syncEmployeesFromGtkDatabase
} from '../utils/presensiBkd';
import { OfficialKopSurat } from './OfficialKopSurat';
import {
  OfficialMergedSignatureBlock,
  PresensiIndividualReportModal
} from './PresensiIndividualReportModal';
import { PresensiMonthlyTrendChart } from './PresensiMonthlyTrendChart';
import { resolveDirectImageUrl } from './ExamCardBarcode';
import { PrintTypographyBar } from './PrintTypographyBar';
import {
  getPrintTypographyStyleVars,
  getScopedPrintTypographyCss,
  getStoredPrintTypography,
  PrintTypographySettings,
  saveStoredPrintTypography
} from '../utils/printTypography';
import {
  buildPresensiMonthlyRepoItem,
  deletePresensiMonthlyRepoItem,
  downloadPresensiMonthlyRepoRawExcel,
  loadPresensiMonthlyRepo,
  updatePresensiMonthlyRepoMeta,
  upsertPresensiMonthlyRepoItem
} from '../services/presensiRepoStorage';
import { PresensiMonthlyRepoModal } from './PresensiMonthlyRepoModal';
import {
  Archive,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Edit3,
  FileCheck2,
  FileSpreadsheet,
  FileUp,
  Filter,
  IdCard,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X
} from 'lucide-react';

interface KehadiranPegawaiViewProps {
  profile: SchoolProfile;
  currentUser: User;
  guruList: Guru[];
  tendikList: Tendik[];
  fallbackTtdKsUrl?: string;
  fallbackStempelUrl?: string;
}

type PrintTargetMode = 'matrix' | 'individual';
type PrintPaperSize = 'F4' | 'A4';

const formatRupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Math.round(n || 0));

export const KehadiranPegawaiView: React.FC<KehadiranPegawaiViewProps> = ({
  profile,
  currentUser,
  guruList,
  tendikList,
  fallbackTtdKsUrl,
  fallbackStempelUrl
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const [config, setConfig] = useState<PresensiConfig>(() => getStoredPresensiConfig());
  const [employees, setEmployees] = useState<PresensiEmployeeItem[]>(() =>
    getStoredPresensiEmployees()
  );
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, Record<string, DailyPresensiRecord>>
  >(() => getStoredPresensiMap(2026, 11));
  const [buktiList, setBuktiList] = useState<PresensiBuktiIzinItem[]>(() =>
    getStoredPresensiBukti()
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<'ALL' | 'Guru' | 'Karyawan / Tendik'>(
    'ALL'
  );
  const [filterStatusPegawai, setFilterStatusPegawai] = useState<string>('ALL');
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [cellEditModal, setCellEditModal] = useState<{
    isOpen: boolean;
    employee: PresensiEmployeeItem | null;
    dateStr: string;
    status: PresensiStatusType;
    jamDatang: string;
    jamPulang: string;
    keterangan: string;
    applyToAll: boolean;
  }>({
    isOpen: false,
    employee: null,
    dateStr: '',
    status: 'HADIR',
    jamDatang: '06:35',
    jamPulang: '15:20',
    keterangan: '',
    applyToAll: false
  });

  const [dateBatchModal, setDateBatchModal] = useState<{
    isOpen: boolean;
    dateStr: string;
    status: PresensiStatusType;
    jamDatang: string;
    jamPulang: string;
    keterangan: string;
    clearHours: boolean;
    targetKategori: 'ALL' | 'Guru' | 'Karyawan / Tendik';
  }>({
    isOpen: false,
    dateStr: '',
    status: 'HADIR',
    jamDatang: '06:35',
    jamPulang: '15:20',
    keterangan: '',
    clearHours: false,
    targetKategori: 'ALL'
  });

  const [isQuickCheckInOpen, setIsQuickCheckInOpen] = useState(false);
  const [quickDateStr, setQuickDateStr] = useState<string>(() =>
    formatDateIso(2026, 11, 23)
  );
  const [quickStatus, setQuickStatus] = useState<PresensiStatusType>('HADIR');
  const [quickJamDatang, setQuickJamDatang] = useState('06:35');
  const [quickJamPulang, setQuickJamPulang] = useState('15:20');
  const [quickKeterangan, setQuickKeterangan] = useState('Presensi serentak harian');
  const [quickSelectedIds, setQuickSelectedIds] = useState<string[]>([]);

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState<PresensiConfig>(config);
  const [configTab, setConfigTab] = useState<'jam' | 'holidays' | 'potongan'>('jam');
  const [recalcAfterSave, setRecalcAfterSave] = useState(true);
  const [newHoliday, setNewHoliday] = useState<{
    date: string;
    name: string;
    type: 'NASIONAL' | 'INSTITUSIONAL';
  }>({
    date: formatDateIso(2026, 11, 25),
    name: 'Hari Guru Nasional / Kegiatan Sekolah',
    type: 'INSTITUSIONAL'
  });

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<PresensiEmployeeItem | null>(null);

  const [isBuktiModalOpen, setIsBuktiModalOpen] = useState(false);
  const [newBukti, setNewBukti] = useState<{
    employeeId: string;
    tanggalMulai: string;
    tanggalSelesai: string;
    kategoriIjin: PresensiBuktiIzinItem['kategoriIjin'];
    nomorSurat: string;
    keterangan: string;
    autoApplyToMatrix: boolean;
  }>({
    employeeId: employees[0]?.id || '',
    tanggalMulai: formatDateIso(2026, 11, 23),
    tanggalSelesai: formatDateIso(2026, 11, 23),
    kategoriIjin: 'Lupa Absen Datang',
    nomorSurat: '800/SPTJM/XI/2026',
    keterangan: 'Hadir mengajar penuh namun lupa rekam presensi',
    autoApplyToMatrix: true
  });

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [autoSaveImportToRepo, setAutoSaveImportToRepo] = useState(true);
  const [importArchiveLabel, setImportArchiveLabel] = useState('');

  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false);
  const [monthlyRepo, setMonthlyRepo] = useState<PresensiMonthlyRepoItem[]>([]);

  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [individualEmpId, setIndividualEmpId] = useState<string>(employees[0]?.id || '');

  const [printMode, setPrintMode] = useState<PrintTargetMode>('matrix');
  const [paperSize, setPaperSize] = useState<PrintPaperSize>('F4');
  const [includeTtdStamp, setIncludeTtdStamp] = useState(true);
  const [typography, setTypography] = useState<PrintTypographySettings>(() =>
    getStoredPrintTypography('sman9_presensi_typo_v1', {
      fontFamily: 'times',
      lineSpacing: 'padat',
      fontScalePct: 100
    })
  );

  const notify = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg(prev => (prev === msg ? null : prev));
    }, 4200);
  };

  // Persist changes
  useEffect(() => {
    saveStoredPresensiConfig(config);
  }, [config]);

  useEffect(() => {
    saveStoredPresensiEmployees(employees);
  }, [employees]);

  useEffect(() => {
    saveStoredPresensiMap(attendanceMap);
  }, [attendanceMap]);

  useEffect(() => {
    saveStoredPresensiBukti(buktiList);
  }, [buktiList]);

  useEffect(() => {
    let active = true;
    loadPresensiMonthlyRepo().then(list => {
      if (active) setMonthlyRepo(list);
    });
    return () => {
      active = false;
    };
  }, []);

  // Seed empty dates cleanly when changing month/year
  useEffect(() => {
    setAttendanceMap(prev =>
      seedAttendanceMonthForEmployees(prev, employees, config, selectedYear, selectedMonth)
    );
  }, [selectedYear, selectedMonth]);

  const handleSyncFromGtkMaster = () => {
    const merged = syncEmployeesFromGtkDatabase(employees, guruList, tendikList);
    const seededMap = seedAttendanceMonthForEmployees(
      attendanceMap,
      merged,
      config,
      selectedYear,
      selectedMonth
    );
    setEmployees(merged);
    setAttendanceMap(seededMap);
    appendAuditLog(
      'SINKRON_PRESENSI_GTK',
      `${currentUser.name} menyinkronkan ${merged.length} data Guru & Tendik ke modul Kehadiran.`
    );
    notify(
      `Berhasil menyinkronkan ${merged.length} Guru & Karyawan dari Master Data GTK.`
    );
  };

  const daysCount = useMemo(
    () => getDaysInMonth(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const holidayMap = useMemo(() => {
    const m = new Map<string, PresensiHolidayItem>();
    (config.holidays || []).forEach(h => m.set(h.date, h));
    return m;
  }, [config.holidays]);

  const dayColumns = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => {
      const day = i + 1;
      const dateStr = formatDateIso(selectedYear, selectedMonth, day);
      const d = new Date(`${dateStr}T00:00:00`);
      const dow = d.getDay();
      const hol = holidayMap.get(dateStr);
      return {
        day,
        dateStr,
        dow,
        dayName: NAMA_HARI_SINGKAT[dow] || '',
        isWeekend: dow === 0 || dow === 6,
        holiday: hol
      };
    });
  }, [daysCount, selectedYear, selectedMonth, holidayMap]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter(e => {
      if (filterKategori !== 'ALL' && e.kategori !== filterKategori) return false;
      if (filterStatusPegawai !== 'ALL' && e.statusKepegawaian !== filterStatusPegawai)
        return false;
      if (!q) return true;
      return `${e.nama} ${e.nip} ${e.jabatan} ${e.statusKepegawaian}`
        .toLowerCase()
        .includes(q);
    });
  }, [employees, searchQuery, filterKategori, filterStatusPegawai]);

  const summaries: EmployeeMonthlyPresensiSummary[] = useMemo(
    () =>
      filteredEmployees.map(emp =>
        calculateEmployeeMonthlySummary(
          emp,
          attendanceMap[emp.id],
          config,
          selectedYear,
          selectedMonth
        )
      ),
    [filteredEmployees, attendanceMap, config, selectedYear, selectedMonth]
  );

  const aggregateStats = useMemo(() => {
    const total = summaries.length;
    if (total === 0) {
      return {
        total: 0,
        guruCount: 0,
        tendikCount: 0,
        avgPct: 100,
        totalHadirTepat: 0,
        totalTerlambatHari: 0,
        totalMenitTerlambat: 0,
        totalSakitIzinCuti: 0,
        totalAlpa: 0,
        totalDl: 0,
        totalPotonganRp: 0,
        totalUangMakanRp: 0
      };
    }
    const avgPct =
      Math.round(
        (summaries.reduce((acc, s) => acc + s.persentaseHadir, 0) / total) * 10
      ) / 10;
    return {
      total,
      guruCount: summaries.filter(s => s.employee.kategori === 'Guru').length,
      tendikCount: summaries.filter(s => s.employee.kategori !== 'Guru').length,
      avgPct,
      totalHadirTepat: summaries.reduce((a, s) => a + s.hadirTepat, 0),
      totalTerlambatHari: summaries.reduce((a, s) => a + s.terlambatHari, 0),
      totalMenitTerlambat: summaries.reduce((a, s) => a + s.totalMenitTerlambat, 0),
      totalSakitIzinCuti: summaries.reduce((a, s) => a + s.sakit + s.izin + s.cuti, 0),
      totalAlpa: summaries.reduce((a, s) => a + s.alpa, 0),
      totalDl: summaries.reduce((a, s) => a + s.dinasLuar, 0),
      totalPotonganRp: summaries.reduce((a, s) => a + s.potonganNominalRp, 0),
      totalUangMakanRp: summaries.reduce((a, s) => a + s.uangMakanRp, 0)
    };
  }, [summaries]);

  // Cell click handler
  const handleOpenCellEdit = (emp: PresensiEmployeeItem, dateStr: string) => {
    const rec = attendanceMap[emp.id]?.[dateStr];
    setCellEditModal({
      isOpen: true,
      employee: emp,
      dateStr,
      status: rec?.status || 'HADIR',
      jamDatang: rec?.jamDatang || '06:35',
      jamPulang: rec?.jamPulang || '15:20',
      keterangan: rec?.keterangan || '',
      applyToAll: false
    });
  };

  const handleSaveCellEdit = () => {
    if (!cellEditModal.employee || !cellEditModal.dateStr) return;
    const { employee, dateStr, status, jamDatang, jamPulang, keterangan, applyToAll } =
      cellEditModal;

    const buildRecForEmp = (targetEmp: PresensiEmployeeItem): DailyPresensiRecord => {
      const noTimes =
        status === 'LIBUR' ||
        status === 'ALPA' ||
        status === 'SAKIT' ||
        status === 'IZIN' ||
        status === 'CUTI';
      const evalLate =
        (status === 'HADIR' || status === 'TERLAMBAT') && !noTimes
          ? evaluateLatenessStatus(
              jamDatang,
              config.defaultJamMasuk,
              config.toleransiKeterlambatanMenit
            )
          : { isLate: false, netMinutesLate: 0 };
      const finalStatus: PresensiStatusType =
        status === 'HADIR' && evalLate.isLate ? 'TERLAMBAT' : status;
      const earlyMins =
        !noTimes && jamPulang
          ? evaluateEarlyLeaveMinutes(jamPulang, dateStr, config)
          : 0;
      return {
        date: dateStr,
        status: finalStatus,
        jamDatang: noTimes ? undefined : jamDatang || undefined,
        jamPulang: noTimes ? undefined : jamPulang || undefined,
        polaKerja: targetEmp.jamKerja,
        menitTerlambat:
          finalStatus === 'TERLAMBAT' ? Math.max(1, evalLate.netMinutesLate || 5) : 0,
        menitPulangAwal: earlyMins,
        keterangan: keterangan.trim() || undefined
      };
    };

    setAttendanceMap(prev => {
      const next = { ...prev };
      if (applyToAll) {
        employees.forEach(e => {
          next[e.id] = { ...(next[e.id] || {}), [dateStr]: buildRecForEmp(e) };
        });
      } else {
        next[employee.id] = {
          ...(next[employee.id] || {}),
          [dateStr]: buildRecForEmp(employee)
        };
      }
      return next;
    });

    setCellEditModal(prev => ({ ...prev, isOpen: false }));
    notify(
      applyToAll
        ? `Status presensi tanggal ${dateStr} diterapkan ke seluruh ${employees.length} GTK.`
        : `Presensi ${employee.nama} tanggal ${dateStr} diperbarui.`
    );
  };

  // Date column batch modal
  const handleOpenDateBatch = (dateStr: string) => {
    const hol = holidayMap.get(dateStr);
    const d = new Date(`${dateStr}T00:00:00`);
    const isWknd = d.getDay() === 0 || d.getDay() === 6;
    setDateBatchModal({
      isOpen: true,
      dateStr,
      status: hol || isWknd ? 'LIBUR' : 'HADIR',
      jamDatang: config.defaultJamMasuk,
      jamPulang: d.getDay() === 5 ? config.defaultJamPulangJumat : config.defaultJamPulang,
      keterangan: hol?.name || (isWknd ? 'Libur Akhir Pekan' : ''),
      clearHours: Boolean(hol || isWknd),
      targetKategori: 'ALL'
    });
  };

  const handleApplyDateBatch = () => {
    const {
      dateStr,
      status,
      jamDatang,
      jamPulang,
      keterangan,
      clearHours,
      targetKategori
    } = dateBatchModal;
    const targets = employees.filter(
      e => targetKategori === 'ALL' || e.kategori === targetKategori
    );
    setAttendanceMap(prev => {
      const next = { ...prev };
      targets.forEach(emp => {
        const evalLate =
          (status === 'HADIR' || status === 'TERLAMBAT') && !clearHours
            ? evaluateLatenessStatus(
                jamDatang,
                config.defaultJamMasuk,
                config.toleransiKeterlambatanMenit
              )
            : { isLate: false, netMinutesLate: 0 };
        next[emp.id] = {
          ...(next[emp.id] || {}),
          [dateStr]: {
            date: dateStr,
            status: status === 'HADIR' && evalLate.isLate ? 'TERLAMBAT' : status,
            jamDatang:
              clearHours || status === 'LIBUR' || status === 'ALPA'
                ? undefined
                : jamDatang,
            jamPulang:
              clearHours || status === 'LIBUR' || status === 'ALPA'
                ? undefined
                : jamPulang,
            polaKerja: emp.jamKerja,
            menitTerlambat: evalLate.netMinutesLate || 0,
            menitPulangAwal: 0,
            keterangan:
              keterangan.trim() ||
              (status === 'LIBUR' ? 'Hari Libur Resmi / Non-Kerja' : undefined)
          }
        };
      });
      return next;
    });
    setDateBatchModal(prev => ({ ...prev, isOpen: false }));
    notify(`Pengaturan tanggal ${dateStr} diterapkan ke ${targets.length} pegawai.`);
  };

  const handleApplyQuickCheckIn = () => {
    const targetIds =
      quickSelectedIds.length > 0 ? quickSelectedIds : filteredEmployees.map(e => e.id);
    if (targetIds.length === 0) return;

    setAttendanceMap(prev => {
      const next = { ...prev };
      targetIds.forEach(id => {
        const emp = employees.find(e => e.id === id);
        if (!emp) return;
        const noHours =
          quickStatus === 'LIBUR' ||
          quickStatus === 'SAKIT' ||
          quickStatus === 'IZIN' ||
          quickStatus === 'CUTI' ||
          quickStatus === 'ALPA';
        const evalLate =
          !noHours && (quickStatus === 'HADIR' || quickStatus === 'TERLAMBAT')
            ? evaluateLatenessStatus(
                quickJamDatang,
                config.defaultJamMasuk,
                config.toleransiKeterlambatanMenit
              )
            : { isLate: false, netMinutesLate: 0 };

        next[id] = {
          ...(next[id] || {}),
          [quickDateStr]: {
            date: quickDateStr,
            status:
              quickStatus === 'HADIR' && evalLate.isLate ? 'TERLAMBAT' : quickStatus,
            jamDatang: noHours ? undefined : quickJamDatang,
            jamPulang: noHours ? undefined : quickJamPulang,
            polaKerja: emp.jamKerja,
            menitTerlambat: evalLate.netMinutesLate || 0,
            menitPulangAwal: noHours
              ? 0
              : evaluateEarlyLeaveMinutes(quickJamPulang, quickDateStr, config),
            keterangan: quickKeterangan.trim() || undefined
          }
        };
      });
      return next;
    });

    setIsQuickCheckInOpen(false);
    notify(
      `Presensi cepat tanggal ${quickDateStr} berhasil dicatat untuk ${targetIds.length} GTK.`
    );
  };

  const handleSanitizeHolidays = () => {
    setAttendanceMap(prev =>
      sanitizeHolidaysInAttendanceMap(prev, config.holidays || [], employees, config)
    );
    notify(
      `Seluruh akhir pekan & ${config.holidays.length} hari libur resmi telah diselaraskan.`
    );
  };

  const handleSaveConfig = () => {
    setConfig(configDraft);
    if (recalcAfterSave) {
      setAttendanceMap(prev =>
        sanitizeHolidaysInAttendanceMap(
          recalculateAttendanceMapWithConfig(prev, configDraft),
          configDraft.holidays || [],
          employees,
          configDraft
        )
      );
    }
    setIsConfigModalOpen(false);
    notify(
      recalcAfterSave
        ? 'Pengaturan jam kerja & hari libur disimpan + presensi dihitung ulang.'
        : 'Pengaturan E-Presensi berhasil disimpan.'
    );
  };

  const handleSaveEmployee = () => {
    if (!editingEmp || !editingEmp.nama.trim()) return;
    setEmployees(prev => {
      const exists = prev.some(e => e.id === editingEmp.id);
      return exists
        ? prev.map(e => (e.id === editingEmp.id ? editingEmp : e))
        : [editingEmp, ...prev];
    });
    setAttendanceMap(prev =>
      seedAttendanceMonthForEmployees(
        prev,
        [editingEmp],
        config,
        selectedYear,
        selectedMonth
      )
    );
    setIsEmployeeModalOpen(false);
    setEditingEmp(null);
    notify(`Data pegawai "${editingEmp.nama}" disimpan.`);
  };

  const handleDeleteEmployee = (empId: string) => {
    const target = employees.find(e => e.id === empId);
    setEmployees(prev => prev.filter(e => e.id !== empId));
    setAttendanceMap(prev => {
      const copy = { ...prev };
      delete copy[empId];
      return copy;
    });
    notify(`Pegawai "${target?.nama || empId}" dihapus dari daftar presensi.`);
  };

  const handleSaveBukti = () => {
    const emp = employees.find(e => e.id === newBukti.employeeId);
    if (!emp || !newBukti.tanggalMulai) return;

    const item: PresensiBuktiIzinItem = {
      id: `bukti-${Date.now()}`,
      employeeId: emp.id,
      nip: emp.nip,
      nama: emp.nama,
      tanggalMulai: newBukti.tanggalMulai,
      tanggalSelesai: newBukti.tanggalSelesai || newBukti.tanggalMulai,
      kategoriIjin: newBukti.kategoriIjin,
      nomorSurat: newBukti.nomorSurat || '-',
      keterangan: newBukti.keterangan,
      verifiedBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    setBuktiList(prev => [item, ...prev]);

    if (newBukti.autoApplyToMatrix) {
      const mappedStatus: PresensiStatusType =
        newBukti.kategoriIjin === 'Sakit'
          ? 'SAKIT'
          : newBukti.kategoriIjin === 'Izin Khusus'
          ? 'IZIN'
          : newBukti.kategoriIjin === 'Dinas Luar'
          ? 'DL_PENUH'
          : 'LUPA_ABSEN';

      const start = new Date(`${item.tanggalMulai}T00:00:00`);
      const end = new Date(`${item.tanggalSelesai}T00:00:00`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        setAttendanceMap(prev => {
          const next = { ...prev };
          const empRecs = { ...(next[emp.id] || {}) };
          const cur = new Date(start);
          let guard = 0;
          while (cur <= end && guard < 31) {
            const iso = formatDateIso(
              cur.getFullYear(),
              cur.getMonth() + 1,
              cur.getDate()
            );
            empRecs[iso] = {
              date: iso,
              status: mappedStatus,
              jamDatang: mappedStatus === 'LUPA_ABSEN' ? config.defaultJamMasuk : undefined,
              jamPulang: mappedStatus === 'LUPA_ABSEN' ? config.defaultJamPulang : undefined,
              polaKerja: emp.jamKerja,
              menitTerlambat: 0,
              menitPulangAwal: 0,
              hasBukti: true,
              kategoriBukti: item.kategoriIjin,
              keterangan: `${item.kategoriIjin} (${item.nomorSurat})`
            };
            cur.setDate(cur.getDate() + 1);
            guard++;
          }
          next[emp.id] = empRecs;
          return next;
        });
      }
    }

    notify(`Bukti ${item.kategoriIjin} untuk ${emp.nama} tercatat & diterapkan.`);
  };

  const handleImportExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawBuffer = await file.arrayBuffer();
      const parsed = await parseImportedPresensiExcel(
        file,
        employees,
        config,
        selectedYear,
        selectedMonth
      );
      if (parsed.employees.length === 0) {
        notify('Tidak ada baris pegawai valid ditemukan di file Excel.');
        return;
      }

      const targetYear = parsed.detectedYear || selectedYear;
      const targetMonth = parsed.detectedMonth || selectedMonth;
      const cleanedImportedMap = sanitizeHolidaysInAttendanceMap(
        parsed.attendanceMap,
        config.holidays || [],
        parsed.employees,
        config
      );

      if (importMode === 'replace') {
        setEmployees(parsed.employees);
        setAttendanceMap(cleanedImportedMap);
      } else {
        setEmployees(prev => {
          const byId = new Map(prev.map(x => [x.id, x]));
          parsed.employees.forEach(x => byId.set(x.id, x));
          return Array.from(byId.values());
        });
        setAttendanceMap(prev => {
          const merged = { ...prev };
          Object.entries(cleanedImportedMap).forEach(([id, recs]) => {
            merged[id] = { ...(merged[id] || {}), ...recs };
          });
          return sanitizeHolidaysInAttendanceMap(
            merged,
            config.holidays || [],
            parsed.employees,
            config
          );
        });
      }

      if (autoSaveImportToRepo) {
        const repoItem = buildPresensiMonthlyRepoItem({
          year: targetYear,
          month: targetMonth,
          label:
            importArchiveLabel.trim() ||
            `Log BKD ${NAMA_BULAN_ID[targetMonth - 1] || targetMonth} ${targetYear}`,
          fileName: file.name,
          fileSizeBytes: file.size,
          sourceType: 'excel_import',
          importMode,
          importedBy: currentUser.name,
          employees: parsed.employees,
          attendanceMap: cleanedImportedMap,
          config,
          hasRawExcelFile: true
        });
        const updatedRepo = await upsertPresensiMonthlyRepoItem(repoItem, {
          buffer: rawBuffer,
          fileName: file.name,
          mimeType: file.type
        });
        setMonthlyRepo(updatedRepo);
        appendAuditLog(
          'SIMPAN_REPO_PRESENSI',
          `${currentUser.name} mengarsipkan file Excel ${file.name} (${NAMA_BULAN_ID[targetMonth - 1] || targetMonth} ${targetYear}) ke Repositori Bulanan.`
        );
      }

      if (parsed.detectedYear && parsed.detectedMonth) {
        setSelectedYear(parsed.detectedYear);
        setSelectedMonth(parsed.detectedMonth);
      }
      setImportArchiveLabel('');
      setIsImportOpen(false);
      const detectedPeriodLabel =
        parsed.detectedYear && parsed.detectedMonth
          ? ` (${NAMA_BULAN_ID[parsed.detectedMonth - 1] || parsed.detectedMonth} ${parsed.detectedYear})`
          : '';
      notify(
        `Berhasil mengimpor log presensi BKD ${parsed.employees.length} GTK${detectedPeriodLabel}${
          autoSaveImportToRepo ? ' & tersimpan di Repositori Bulanan.' : '.'
        }`
      );
    } catch {
      notify('Gagal membaca file Excel. Pastikan menggunakan template Log Presensi BKD yang sesuai.');
    } finally {
      e.target.value = '';
    }
  };

  const handleArchiveCurrentMonthToRepo = async (
    customLabel?: string,
    customNote?: string
  ) => {
    const repoItem = buildPresensiMonthlyRepoItem({
      year: selectedYear,
      month: selectedMonth,
      label: customLabel,
      sourceType: 'manual_snapshot',
      importedBy: currentUser.name,
      employees,
      attendanceMap,
      config,
      catatan: customNote,
      hasRawExcelFile: false
    });
    const nextList = await upsertPresensiMonthlyRepoItem(repoItem);
    setMonthlyRepo(nextList);
    appendAuditLog(
      'ARSIP_PRESENSI_BULANAN',
      `${currentUser.name} mengarsipkan snapshot presensi ${NAMA_BULAN_ID[selectedMonth - 1]} ${selectedYear} ke Repositori Bulanan.`
    );
    notify(
      `Snapshot ${NAMA_BULAN_ID[selectedMonth - 1]} ${selectedYear} berhasil disimpan ke Repositori Bulanan.`
    );
  };

  const handleLoadArchiveFromRepo = (
    item: PresensiMonthlyRepoItem,
    options: { replaceEmployees: boolean; openIndividualReport?: boolean }
  ) => {
    const monthPrefix = `${item.year}-${String(item.month).padStart(2, '0')}-`;

    if (options.replaceEmployees) {
      setEmployees(item.employees.map(e => ({ ...e })));
    } else {
      setEmployees(prev => {
        const byId = new Map(prev.map(x => [x.id, x]));
        item.employees.forEach(x => {
          if (!byId.has(x.id)) {
            byId.set(x.id, { ...x });
          } else {
            byId.set(x.id, { ...byId.get(x.id)!, ...x });
          }
        });
        return Array.from(byId.values());
      });
    }

    setAttendanceMap(prev => {
      const next = { ...prev };
      // Clear any stale entries strictly for the target archive month before applying archive data
      Object.keys(next).forEach(empId => {
        const currentEmpRecs = next[empId];
        if (!currentEmpRecs) return;
        const kept: Record<string, DailyPresensiRecord> = {};
        Object.entries(currentEmpRecs).forEach(([dStr, rec]) => {
          if (!dStr.startsWith(monthPrefix)) {
            kept[dStr] = rec;
          }
        });
        next[empId] = kept;
      });
      // Apply archived month records
      Object.entries(item.monthAttendanceMap || {}).forEach(([empId, monthRecs]) => {
        next[empId] = {
          ...(next[empId] || {}),
          ...monthRecs
        };
      });
      return sanitizeHolidaysInAttendanceMap(
        next,
        config.holidays || [],
        item.employees,
        config
      );
    });

    setSelectedYear(item.year);
    setSelectedMonth(item.month);
    if (item.employees[0]) {
      setIndividualEmpId(item.employees[0].id);
    }
    setIsRepoModalOpen(false);
    if (options.openIndividualReport) {
      window.setTimeout(() => {
        setIsIndividualModalOpen(true);
      }, 80);
    }
    const bln = NAMA_BULAN_ID[item.month - 1] || String(item.month);
    notify(
      `Arsip "${item.label}" (${bln} ${item.year}, ${item.employeeCount} GTK) dimunculkan untuk pelaporan.`
    );
  };

  const handleMergeYearArchivesToChart = (year: number) => {
    const matching = monthlyRepo.filter(r => r.year === year);
    if (matching.length === 0) return;

    setEmployees(prev => {
      const byId = new Map(prev.map(x => [x.id, x]));
      matching.forEach(item => {
        item.employees.forEach(e => {
          if (!byId.has(e.id)) byId.set(e.id, { ...e });
        });
      });
      return Array.from(byId.values());
    });

    setAttendanceMap(prev => {
      const next = { ...prev };
      matching.forEach(item => {
        Object.entries(item.monthAttendanceMap || {}).forEach(([empId, recs]) => {
          next[empId] = { ...(next[empId] || {}), ...recs };
        });
      });
      return next;
    });

    setIsRepoModalOpen(false);
    setIsDashboardOpen(true);
    notify(
      `${matching.length} arsip bulanan tahun ${year} dimuat ke grafik tren & tabel pelaporan.`
    );
  };

  const handleDownloadRepoRawExcel = async (item: PresensiMonthlyRepoItem) => {
    const ok = await downloadPresensiMonthlyRepoRawExcel(item);
    if (ok) {
      notify(`Mengunduh file Excel asli: ${item.fileName || item.label}`);
    } else {
      exportPresensiToExcel(
        item.employees,
        item.monthAttendanceMap,
        config,
        item.year,
        item.month,
        buktiList
      );
      notify(`File mentah tidak tersedia, mengekspor ulang format BKD untuk ${item.label}.`);
    }
  };

  const handleRenameArchive = async (id: string, label: string, catatan: string) => {
    const nextList = await updatePresensiMonthlyRepoMeta(id, { label, catatan });
    setMonthlyRepo(nextList);
    notify('Informasi arsip bulanan berhasil diperbarui.');
  };

  const handleDeleteArchive = async (id: string) => {
    const nextList = await deletePresensiMonthlyRepoItem(id);
    setMonthlyRepo(nextList);
    notify('Arsip bulanan dihapus dari repositori.');
  };

  const triggerPrint = (mode: PrintTargetMode) => {
    setPrintMode(mode);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  const resolvedTtdUrl = resolveDirectImageUrl(fallbackTtdKsUrl);
  const resolvedStempelUrl = resolveDirectImageUrl(fallbackStempelUrl);
  const selectedIndividualEmp =
    employees.find(e => e.id === individualEmpId) || filteredEmployees[0] || employees[0];
  const selectedIndividualSummary = selectedIndividualEmp
    ? calculateEmployeeMonthlySummary(
        selectedIndividualEmp,
        attendanceMap[selectedIndividualEmp.id],
        config,
        selectedYear,
        selectedMonth
      )
    : null;

  const bulanLabel = NAMA_BULAN_ID[selectedMonth - 1] || String(selectedMonth);
  const printPageCss =
    printMode === 'matrix'
      ? paperSize === 'F4'
        ? '330mm 215mm'
        : 'A4 landscape'
      : paperSize === 'F4'
      ? '215mm 330mm'
      : 'A4 portrait';

  return (
    <div className="space-y-4">
      {/* Dynamic Scoped Print Stylesheet */}
      <style>{`
        ${getScopedPrintTypographyCss('.presensi-sheet-scope')}
        @media print {
          @page {
            size: ${printPageCss};
            margin: 6mm 8mm;
          }
          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          ${
            printMode === 'matrix'
              ? `
            body * { visibility: hidden !important; }
            #printable-presensi-report,
            #printable-presensi-report * {
              visibility: visible !important;
            }
            #printable-presensi-report {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
          `
              : `
            body * { visibility: hidden !important; }
            #printable-presensi-individu,
            #printable-presensi-individu * {
              visibility: visible !important;
            }
            #printable-presensi-individu {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
          `
          }
          table.presensi-print-table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: fixed !important;
          }
          table.presensi-print-table th,
          table.presensi-print-table td {
            border: 0.6pt solid #0f172a !important;
            padding: 1.5px 2px !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Top Executive E-Presensi Header Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white rounded-2xl p-4 sm:p-5 border border-emerald-700/60 shadow-lg print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <img
              src="/assets/aistudio/icon_330301f4.svg"
              alt="Ikon E-Presensi"
              className="w-12 h-12 rounded-xl border border-emerald-400/40 shadow-md shrink-0 bg-emerald-950"
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/40 text-emerald-100">
                  E-Presensi BKD &amp; Sekolah
                </span>
                <span className="text-[11px] font-medium text-emerald-200">
                  Jam Baku {config.defaultJamMasuk} – {config.defaultJamPulang} {config.zonaWaktu}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight mt-1">
                Database Presensi Kehadiran Guru &amp; Karyawan
              </h1>
              <p className="text-xs text-emerald-100/85 mt-0.5">
                {config.namaSubUnit} · Periode {bulanLabel} {selectedYear} · Terhubung Master Guru &amp; Tendik ({employees.length} GTK)
                {monthlyRepo.some(r => r.year === selectedYear && r.month === selectedMonth) && (
                  <> · Arsip periode ini tersimpan di Repositori</>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Picker */}
            <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-700 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {NAMA_BULAN_ID.map((m, idx) => (
                  <option key={m} value={idx + 1} className="text-slate-900">
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-mono font-bold text-emerald-200 focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y} className="text-slate-900">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSyncFromGtkMaster}
              className="px-3 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Sinkronkan daftar Guru & Tendik terbaru dari Master Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkron Master GTK</span>
            </button>

            <button
              onClick={() => setIsDashboardOpen(v => !v)}
              className="px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{isDashboardOpen ? 'Tutup Statistik' : 'Buka Statistik'}</span>
              {isDashboardOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-4 pt-3 border-t border-emerald-700/50 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setQuickSelectedIds([]);
              setIsQuickCheckInOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-emerald-950 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Presensi Cepat Harian</span>
          </button>

          <button
            onClick={() => {
              setConfigDraft(config);
              setConfigTab('jam');
              setIsConfigModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>Atur Jam Kerja &amp; TPP</span>
          </button>

          <button
            onClick={() => {
              setConfigDraft(config);
              setConfigTab('holidays');
              setIsConfigModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-rose-300" />
            <span>Hari Libur ({config.holidays.length})</span>
          </button>

          <button
            onClick={handleSanitizeHolidays}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Bersihkan jam kerja nyasar pada hari Sabtu, Minggu, dan tanggal merah"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>Bersihkan Libur</span>
          </button>

          <button
            onClick={() => {
              if (!newBukti.employeeId && employees[0]) {
                setNewBukti(p => ({ ...p, employeeId: employees[0].id }));
              }
              setIsBuktiModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-orange-300" />
            <span>Bukti Izin / SPTJM ({buktiList.length})</span>
          </button>

          <button
            onClick={() => {
              setEditingEmp({
                id: `pres-man-${Date.now()}`,
                nip: '-',
                nama: '',
                jabatan: 'Guru Mata Pelajaran',
                kategori: 'Guru',
                statusKepegawaian: 'PNS',
                pangkatGolongan: 'Penata (III/c)',
                jamKerja: `5 HK (${config.defaultJamMasuk} - ${config.defaultJamPulang})`,
                tppNominal: 3500000,
                sourceType: 'manual'
              });
              setIsEmployeeModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
            <span>Tambah Pegawai</span>
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileUp className="w-3.5 h-3.5 text-cyan-300" />
            <span>Impor Excel</span>
          </button>

          <button
            onClick={() => setIsRepoModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Buka Repositori Arsip Data Excel Kehadiran Per Bulan"
          >
            <Archive className="w-3.5 h-3.5 text-amber-300" />
            <span>Repositori Bulanan ({monthlyRepo.length})</span>
          </button>

          <button
            onClick={() =>
              exportPresensiToExcel(
                filteredEmployees,
                attendanceMap,
                config,
                selectedYear,
                selectedMonth,
                buktiList
              )
            }
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Ekspor workbook Log E-Presensi BKD Pemprov Jatim + Sheet Rekap & Predikat"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-lime-300" />
            <span>Ekspor Excel BKD</span>
          </button>

          <button
            onClick={() =>
              exportPresensiToCSV(
                filteredEmployees,
                attendanceMap,
                config,
                selectedYear,
                selectedMonth
              )
            }
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-200" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setIsLegendOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-600/70 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-yellow-300" />
            <span>Legenda Kode</span>
          </button>

          <button
            onClick={() => {
              if (!individualEmpId && filteredEmployees[0]) {
                setIndividualEmpId(filteredEmployees[0].id);
              }
              setIsIndividualModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <IdCard className="w-3.5 h-3.5" />
            <span>Laporan Per Guru</span>
          </button>

          <button
            onClick={() => setIsPrintReportOpen(true)}
            className="px-3 py-1.5 text-xs font-bold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan Resmi</span>
          </button>
        </div>
      </div>

      {/* Collapsible Dashboard Statistics */}
      {isDashboardOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Total GTK Aktif</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
              {aggregateStats.total}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {aggregateStats.guruCount} Guru · {aggregateStats.tendikCount} Karyawan
            </div>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
              <span>Tingkat Kehadiran</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
              {aggregateStats.avgPct}%
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
              {aggregateStats.totalHadirTepat} hari tepat waktu
            </div>
          </div>

          <div className="bg-white rounded-xl border border-amber-200 p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
              <span>Keterlambatan</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-1 tabular-nums">
              {aggregateStats.totalTerlambatHari}
              <span className="text-xs font-semibold ml-1">hr</span>
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
              Akumulasi {aggregateStats.totalMenitTerlambat} menit
            </div>
          </div>

          <div className="bg-white rounded-xl border border-sky-200 p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 flex items-center justify-between">
              <span>Sakit / Izin / Cuti</span>
              <FileCheck2 className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-sky-700 mt-1 tabular-nums">
              {aggregateStats.totalSakitIzinCuti}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5 tabular-nums">
              +{aggregateStats.totalDl} hari Dinas Luar
            </div>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Tanpa Keterangan
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1 tabular-nums">
              {aggregateStats.totalAlpa}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Potongan Alpa {config.potonganAlpaPersen}% / hari
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Estimasi Potongan TPP
            </div>
            <div className="text-lg font-black text-slate-900 mt-1 tabular-nums truncate">
              {formatRupiah(aggregateStats.totalPotonganRp)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5 tabular-nums truncate">
              Uang Makan: {formatRupiah(aggregateStats.totalUangMakanRp)}
            </div>
          </div>
        </div>
      )}

      {/* Visualisasi Tren Kehadiran Guru & Karyawan Per Bulan (Recharts) */}
      {isDashboardOpen && (
        <PresensiMonthlyTrendChart
          employees={employees}
          attendanceMap={attendanceMap}
          config={config}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[210px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru / karyawan, NIP, jabatan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filterKategori}
              onChange={e =>
                setFilterKategori(e.target.value as 'ALL' | 'Guru' | 'Karyawan / Tendik')
              }
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white"
            >
              <option value="ALL">Semua Kategori (Guru &amp; Karyawan)</option>
              <option value="Guru">Khusus Guru</option>
              <option value="Karyawan / Tendik">Khusus Karyawan / Tendik</option>
            </select>

            <select
              value={filterStatusPegawai}
              onChange={e => setFilterStatusPegawai(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white"
            >
              <option value="ALL">Semua Status (PNS/PPPK/Honorer)</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="PPPK PW">PPPK PW</option>
              <option value="GTT">GTT</option>
              <option value="PTT">PTT</option>
              <option value="Honorer">Honorer</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-600 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-xs bg-emerald-500" />
          <span>Klik sel tanggal untuk edit presensi · Klik angka tanggal (1–{daysCount}) untuk atur jadwal masal</span>
        </div>
      </div>

      {/* Interactive Monthly Attendance Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:hidden">
        <div className="overflow-x-auto max-h-[68vh]">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-900 border border-slate-700 px-2 py-2 text-center w-9">
                  No
                </th>
                <th className="sticky left-9 z-30 bg-slate-900 border border-slate-700 px-2.5 py-2 text-left min-w-[210px] max-w-[230px]">
                  Nama / NIP / Jabatan
                </th>
                <th className="border border-slate-700 px-2 py-2 text-center min-w-[95px]">
                  Kategori &amp; Status
                </th>
                {dayColumns.map(col => (
                  <th
                    key={col.dateStr}
                    onClick={() => handleOpenDateBatch(col.dateStr)}
                    title={
                      col.holiday
                        ? `${col.holiday.name} (Klik untuk atur jadwal masal)`
                        : `${col.dayName}, ${col.dateStr} (Klik untuk atur jadwal masal)`
                    }
                    className={`border border-slate-700 px-1 py-1.5 text-center min-w-[44px] cursor-pointer transition-colors hover:bg-emerald-700 ${
                      col.holiday
                        ? 'bg-rose-900 text-rose-100'
                        : col.isWeekend
                        ? 'bg-slate-800 text-rose-300'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    <div className="font-extrabold tabular-nums leading-none">
                      {col.day}
                    </div>
                    <div className="text-[9px] font-medium opacity-85 mt-0.5 leading-none">
                      {col.holiday ? 'LBR' : col.dayName}
                    </div>
                  </th>
                ))}
                <th className="border border-slate-700 px-1.5 py-2 text-center bg-emerald-950 min-w-[34px]">
                  H
                </th>
                <th className="border border-slate-700 px-1.5 py-2 text-center bg-amber-950 min-w-[34px]">
                  T
                </th>
                <th className="border border-slate-700 px-1.5 py-2 text-center bg-amber-950 min-w-[42px]">
                  Mnt
                </th>
                <th className="border border-slate-700 px-1.5 py-2 text-center bg-sky-950 min-w-[44px]">
                  S/I/C
                </th>
                <th className="border border-slate-700 px-1.5 py-2 text-center bg-rose-950 min-w-[32px]">
                  A
                </th>
                <th className="border border-slate-700 px-1.5 py-2 text-center bg-teal-950 min-w-[34px]">
                  DL
                </th>
                <th className="border border-slate-700 px-1.5 py-2 text-center bg-slate-900 min-w-[46px]">
                  %
                </th>
                <th className="border border-slate-700 px-2 py-2 text-center bg-slate-900 min-w-[96px]">
                  Predikat
                </th>
                <th className="sticky right-0 z-30 bg-slate-900 border border-slate-700 px-2 py-2 text-center min-w-[92px]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.length === 0 ? (
                <tr>
                  <td
                    colSpan={dayColumns.length + 12}
                    className="py-12 text-center text-slate-500 text-xs"
                  >
                    Tidak ada data Guru atau Karyawan yang cocok dengan filter. Klik{' '}
                    <strong>Sinkron Master GTK</strong> untuk menarik data pegawai.
                  </td>
                </tr>
              ) : (
                summaries.map((sum, idx) => {
                  const emp = sum.employee;
                  const empRecs = attendanceMap[emp.id] || {};
                  const pred = evaluateAttendancePredicate(sum);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/90 group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border border-slate-200 px-2 py-1.5 text-center font-mono font-bold text-slate-600 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="sticky left-9 z-10 bg-white group-hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                        <div className="font-bold text-slate-900 leading-tight truncate max-w-[215px]">
                          {emp.nama}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 tabular-nums truncate max-w-[215px]">
                          NIP. {emp.nip}
                        </div>
                        <div className="text-[10px] text-slate-600 truncate max-w-[215px]">
                          {emp.jabatan}
                        </div>
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 text-center">
                        <div className="font-semibold text-[10px] text-slate-800">
                          {emp.kategori === 'Guru' ? 'Guru' : 'Karyawan/TU'}
                        </div>
                        <div className="text-[9.5px] font-bold text-emerald-700">
                          {emp.statusKepegawaian}
                        </div>
                      </td>

                      {dayColumns.map(col => {
                        const rec = empRecs[col.dateStr];
                        const status: PresensiStatusType =
                          rec?.status || (col.isWeekend || col.holiday ? 'LIBUR' : 'HADIR');
                        const meta = STATUS_PRESENSI_META[status];
                        return (
                          <td
                            key={`${emp.id}-${col.dateStr}`}
                            onClick={() => handleOpenCellEdit(emp, col.dateStr)}
                            title={
                              rec?.keterangan
                                ? `${meta.label} — ${rec.keterangan}`
                                : `${meta.label}${rec?.jamDatang ? ` (${rec.jamDatang}–${rec.jamPulang || '-'})` : ''}`
                            }
                            className={`border border-slate-200 px-0.5 py-1 text-center cursor-pointer transition-all hover:ring-2 hover:ring-emerald-500 hover:z-10 ${meta.cellBg} ${meta.cellText}`}
                          >
                            <div className="font-extrabold text-[10.5px] leading-none">
                              {meta.code}
                            </div>
                            {rec?.jamDatang && status !== 'LIBUR' && (
                              <div className="text-[8.5px] font-mono tabular-nums opacity-85 mt-0.5 leading-none">
                                {rec.jamDatang}
                              </div>
                            )}
                            {rec?.menitTerlambat && rec.menitTerlambat > 0 ? (
                              <div className="text-[8px] font-bold text-amber-700 leading-none mt-0.5">
                                +{rec.menitTerlambat}m
                              </div>
                            ) : null}
                          </td>
                        );
                      })}

                      <td className="border border-slate-200 px-1.5 py-1 text-center font-bold text-emerald-700 tabular-nums">
                        {sum.hadirTepat}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-center font-bold text-amber-700 tabular-nums">
                        {sum.terlambatHari}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-center font-mono font-semibold text-amber-800 tabular-nums">
                        {sum.totalMenitTerlambat}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-center font-semibold text-sky-700 tabular-nums">
                        {sum.sakit + sum.izin + sum.cuti}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-center font-bold text-rose-700 tabular-nums">
                        {sum.alpa}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-center font-semibold text-teal-700 tabular-nums">
                        {sum.dinasLuar}
                      </td>
                      <td className="border border-slate-200 px-1.5 py-1 text-center font-extrabold text-slate-900 tabular-nums">
                        {sum.persentaseHadir}%
                      </td>
                      <td
                        className="border border-slate-200 px-1.5 py-1 text-center cursor-pointer"
                        title={pred.title}
                        onClick={() => {
                          setIndividualEmpId(emp.id);
                          setIsIndividualModalOpen(true);
                        }}
                      >
                        <div className="text-[10px] font-bold leading-tight whitespace-nowrap" style={{ color: pred.colorHex }}>
                          {pred.label}
                        </div>
                        <div className="text-[9px] font-mono text-slate-500 tabular-nums">
                          Nilai {pred.grade}
                        </div>
                      </td>
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 border border-slate-200 px-1.5 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setIndividualEmpId(emp.id);
                              setIsIndividualModalOpen(true);
                            }}
                            className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 cursor-pointer"
                            title="Buka Studio Laporan Kehadiran Per Guru"
                          >
                            <IdCard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingEmp({ ...emp });
                              setIsEmployeeModalOpen(true);
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Edit Data Pegawai & TPP"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Edit Sel Presensi Harian */}
      {cellEditModal.isOpen && cellEditModal.employee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-emerald-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Edit Presensi Harian</h3>
                <p className="text-[11px] text-emerald-200">
                  {cellEditModal.employee.nama} · {cellEditModal.dateStr}
                </p>
              </div>
              <button
                onClick={() => setCellEditModal(p => ({ ...p, isOpen: false }))}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Kehadiran</label>
                <select
                  value={cellEditModal.status}
                  onChange={e =>
                    setCellEditModal(p => ({
                      ...p,
                      status: e.target.value as PresensiStatusType
                    }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold bg-white"
                >
                  {(Object.keys(STATUS_PRESENSI_META) as PresensiStatusType[]).map(k => (
                    <option key={k} value={k}>
                      [{STATUS_PRESENSI_META[k].code}] {STATUS_PRESENSI_META[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Datang</label>
                  <input
                    type="time"
                    value={cellEditModal.jamDatang}
                    onChange={e =>
                      setCellEditModal(p => ({ ...p, jamDatang: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Pulang</label>
                  <input
                    type="time"
                    value={cellEditModal.jamPulang}
                    onChange={e =>
                      setCellEditModal(p => ({ ...p, jamPulang: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Keterangan / Nomor Surat Tugas
                </label>
                <textarea
                  rows={2}
                  value={cellEditModal.keterangan}
                  onChange={e =>
                    setCellEditModal(p => ({ ...p, keterangan: e.target.value }))
                  }
                  placeholder="Misal: Mengikuti MGMP Surabaya / Surat Dokter / Lupa finger..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cellEditModal.applyToAll}
                  onChange={e =>
                    setCellEditModal(p => ({ ...p, applyToAll: e.target.checked }))
                  }
                />
                <span className="font-semibold text-amber-900">
                  Terapkan status &amp; jam ini ke SEMUA pegawai pada tanggal {cellEditModal.dateStr}
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCellEditModal(p => ({ ...p, isOpen: false }))}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveCellEdit}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Presensi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Pengaturan Jadwal Tanggal Masal */}
      {dateBatchModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Atur Jadwal Massal Tanggal {dateBatchModal.dateStr}</h3>
                <p className="text-[11px] text-slate-300">
                  Terapkan status libur, dinas luar, atau hadir serentak pada tanggal ini
                </p>
              </div>
              <button
                onClick={() => setDateBatchModal(p => ({ ...p, isOpen: false }))}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sasaran GTK</label>
                <select
                  value={dateBatchModal.targetKategori}
                  onChange={e =>
                    setDateBatchModal(p => ({
                      ...p,
                      targetKategori: e.target.value as 'ALL' | 'Guru' | 'Karyawan / Tendik'
                    }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
                >
                  <option value="ALL">Seluruh Guru &amp; Karyawan ({employees.length} orang)</option>
                  <option value="Guru">Khusus Guru</option>
                  <option value="Karyawan / Tendik">Khusus Karyawan / Tendik</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Massal</label>
                <select
                  value={dateBatchModal.status}
                  onChange={e => {
                    const st = e.target.value as PresensiStatusType;
                    setDateBatchModal(p => ({
                      ...p,
                      status: st,
                      clearHours: st === 'LIBUR' || st === 'ALPA' || st === 'CUTI'
                    }));
                  }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
                >
                  {(Object.keys(STATUS_PRESENSI_META) as PresensiStatusType[]).map(k => (
                    <option key={k} value={k}>
                      [{STATUS_PRESENSI_META[k].code}] {STATUS_PRESENSI_META[k].label}
                    </option>
                  ))}
                </select>
              </div>

              {!dateBatchModal.clearHours && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jam Datang</label>
                    <input
                      type="time"
                      value={dateBatchModal.jamDatang}
                      onChange={e =>
                        setDateBatchModal(p => ({ ...p, jamDatang: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jam Pulang</label>
                    <input
                      type="time"
                      value={dateBatchModal.jamPulang}
                      onChange={e =>
                        setDateBatchModal(p => ({ ...p, jamPulang: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={dateBatchModal.keterangan}
                  onChange={e =>
                    setDateBatchModal(p => ({ ...p, keterangan: e.target.value }))
                  }
                  placeholder="Misal: Libur Sekolah / Rapat Dinas / Workshop Kurikulum"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDateBatchModal(p => ({ ...p, isOpen: false }))}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleApplyDateBatch}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  Terapkan ke Tanggal Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Presensi Cepat Harian */}
      {isQuickCheckInOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-emerald-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">Presensi Cepat Harian (Batch Check-In / Out)</h3>
                <p className="text-[11px] text-emerald-200">
                  Catat kehadiran serentak untuk seluruh atau beberapa Guru &amp; Karyawan terpilih
                </p>
              </div>
              <button
                onClick={() => setIsQuickCheckInOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={quickDateStr}
                    onChange={e => setQuickDateStr(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={quickStatus}
                    onChange={e => setQuickStatus(e.target.value as PresensiStatusType)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white font-semibold"
                  >
                    {(Object.keys(STATUS_PRESENSI_META) as PresensiStatusType[]).map(k => (
                      <option key={k} value={k}>
                        [{STATUS_PRESENSI_META[k].code}] {STATUS_PRESENSI_META[k].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Datang</label>
                  <input
                    type="time"
                    value={quickJamDatang}
                    onChange={e => setQuickJamDatang(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Pulang</label>
                  <input
                    type="time"
                    value={quickJamPulang}
                    onChange={e => setQuickJamPulang(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={quickKeterangan}
                  onChange={e => setQuickKeterangan(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">
                    Pilih Pegawai ({quickSelectedIds.length === 0 ? `Semua (${filteredEmployees.length})` : `${quickSelectedIds.length} terpilih`})
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setQuickSelectedIds(filteredEmployees.map(e => e.id))}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <button
                      onClick={() => setQuickSelectedIds([])}
                      className="text-slate-600 font-semibold hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {filteredEmployees.map(emp => {
                    const checked = quickSelectedIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              setQuickSelectedIds(prev =>
                                e.target.checked
                                  ? [...prev, emp.id]
                                  : prev.filter(id => id !== emp.id)
                              );
                            }}
                          />
                          <div>
                            <div className="font-bold text-slate-900">{emp.nama}</div>
                            <div className="text-[10px] text-slate-500">
                              {emp.kategori} · {emp.statusKepegawaian} · NIP. {emp.nip}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0 text-xs">
              <button
                onClick={() => setIsQuickCheckInOpen(false)}
                className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={handleApplyQuickCheckIn}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer"
              >
                Simpan Presensi Massal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Konfigurasi Jam Kerja, Hari Libur, & Potongan TPP */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Pengaturan Jam Kerja, Hari Libur &amp; Perhitungan TPP</h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 px-5 gap-2 pt-2 text-xs shrink-0">
              {[
                { id: 'jam', label: 'Jam Kerja & Penandatangan' },
                { id: 'holidays', label: `Kalender Libur (${configDraft.holidays.length})` },
                { id: 'potongan', label: 'Aturan TPP & Uang Makan' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setConfigTab(t.id as 'jam' | 'holidays' | 'potongan')}
                  className={`px-3 py-2 font-bold border-b-2 cursor-pointer ${
                    configTab === t.id
                      ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {configTab === 'jam' && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Jam Masuk Baku</label>
                      <input
                        type="time"
                        value={configDraft.defaultJamMasuk}
                        onChange={e =>
                          setConfigDraft(p => ({ ...p, defaultJamMasuk: e.target.value }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pulang Sen–Kam</label>
                      <input
                        type="time"
                        value={configDraft.defaultJamPulang}
                        onChange={e =>
                          setConfigDraft(p => ({ ...p, defaultJamPulang: e.target.value }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Pulang Jumat</label>
                      <input
                        type="time"
                        value={configDraft.defaultJamPulangJumat}
                        onChange={e =>
                          setConfigDraft(p => ({
                            ...p,
                            defaultJamPulangJumat: e.target.value
                          }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Toleransi (Menit)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={configDraft.toleransiKeterlambatanMenit}
                        onChange={e =>
                          setConfigDraft(p => ({
                            ...p,
                            toleransiKeterlambatanMenit: Number(e.target.value || 0)
                          }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nama Atasan (Kepala Sekolah)</label>
                      <input
                        type="text"
                        value={configDraft.ttdAtasanNama}
                        onChange={e =>
                          setConfigDraft(p => ({ ...p, ttdAtasanNama: e.target.value }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">NIP Kepala Sekolah</label>
                      <input
                        type="text"
                        value={configDraft.ttdAtasanNip}
                        onChange={e =>
                          setConfigDraft(p => ({ ...p, ttdAtasanNip: e.target.value }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Admin / Koord. Tata Usaha</label>
                      <input
                        type="text"
                        value={configDraft.ttdOperatorNama}
                        onChange={e =>
                          setConfigDraft(p => ({ ...p, ttdOperatorNama: e.target.value }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">NIP Koord. Tata Usaha</label>
                      <input
                        type="text"
                        value={configDraft.ttdOperatorNip}
                        onChange={e =>
                          setConfigDraft(p => ({ ...p, ttdOperatorNip: e.target.value }))
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recalcAfterSave}
                      onChange={e => setRecalcAfterSave(e.target.checked)}
                    />
                    <span className="font-semibold text-emerald-900">
                      Hitung ulang seluruh log keterlambatan &amp; status hadir sesuai jam masuk baru
                    </span>
                  </label>
                </>
              )}

              {configTab === 'holidays' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={e => setNewHoliday(p => ({ ...p, date: e.target.value }))}
                      className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                    />
                    <input
                      type="text"
                      value={newHoliday.name}
                      onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nama hari libur..."
                      className="sm:col-span-2 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                    />
                    <button
                      onClick={() => {
                        if (!newHoliday.date || !newHoliday.name.trim()) return;
                        setConfigDraft(p => ({
                          ...p,
                          holidays: [
                            {
                              id: `hol-${Date.now()}`,
                              date: newHoliday.date,
                              name: newHoliday.name.trim(),
                              type: newHoliday.type
                            },
                            ...p.holidays.filter(h => h.date !== newHoliday.date)
                          ]
                        }));
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-200 border border-slate-200 rounded-xl">
                    {configDraft.holidays
                      .slice()
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(h => (
                        <div
                          key={h.id}
                          className="px-3 py-2 flex items-center justify-between hover:bg-slate-50"
                        >
                          <div>
                            <span className="font-mono font-bold text-rose-700 mr-2">
                              {h.date}
                            </span>
                            <span className="font-semibold text-slate-900">{h.name}</span>
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {h.type}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setConfigDraft(p => ({
                                ...p,
                                holidays: p.holidays.filter(x => x.id !== h.id)
                              }))
                            }
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {configTab === 'potongan' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Potongan TPP / Menit Telat (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={configDraft.potonganTppPerMenitPersen}
                      onChange={e =>
                        setConfigDraft(p => ({
                          ...p,
                          potonganTppPerMenitPersen: Number(e.target.value || 0)
                        }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Potongan Alpa / Hari (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={configDraft.potonganAlpaPersen}
                      onChange={e =>
                        setConfigDraft(p => ({
                          ...p,
                          potonganAlpaPersen: Number(e.target.value || 0)
                        }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tarif Uang Makan / Hari (Rp)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={configDraft.tarifMakanHarian}
                      onChange={e =>
                        setConfigDraft(p => ({
                          ...p,
                          tarifMakanHarian: Number(e.target.value || 0)
                        }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0 text-xs">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Tambah / Edit Pegawai */}
      {isEmployeeModalOpen && editingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Data Pegawai &amp; Parameter TPP</h3>
              <button
                onClick={() => {
                  setIsEmployeeModalOpen(false);
                  setEditingEmp(null);
                }}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap &amp; Gelar</label>
                  <input
                    type="text"
                    value={editingEmp.nama}
                    onChange={e => setEditingEmp({ ...editingEmp, nama: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIP / NI PPPK</label>
                  <input
                    type="text"
                    value={editingEmp.nip}
                    onChange={e => setEditingEmp({ ...editingEmp, nip: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori GTK</label>
                  <select
                    value={editingEmp.kategori}
                    onChange={e =>
                      setEditingEmp({
                        ...editingEmp,
                        kategori: e.target.value as 'Guru' | 'Karyawan / Tendik'
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="Guru">Guru</option>
                    <option value="Karyawan / Tendik">Karyawan / Tendik</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kepegawaian</label>
                  <select
                    value={editingEmp.statusKepegawaian}
                    onChange={e =>
                      setEditingEmp({
                        ...editingEmp,
                        statusKepegawaian: e.target
                          .value as PresensiEmployeeItem['statusKepegawaian']
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="PPPK PW">PPPK PW</option>
                    <option value="GTT">GTT</option>
                    <option value="PTT">PTT</option>
                    <option value="Honorer">Honorer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">TPP / Tunjangan (Rp)</label>
                  <input
                    type="number"
                    step="50000"
                    value={editingEmp.tppNominal}
                    onChange={e =>
                      setEditingEmp({
                        ...editingEmp,
                        tppNominal: Number(e.target.value || 0)
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={editingEmp.jabatan}
                    onChange={e => setEditingEmp({ ...editingEmp, jabatan: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {employees.some(e => e.id === editingEmp.id) ? (
                  <button
                    onClick={() => {
                      handleDeleteEmployee(editingEmp.id);
                      setIsEmployeeModalOpen(false);
                      setEditingEmp(null);
                    }}
                    className="px-3 py-2 text-rose-700 hover:bg-rose-50 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Pegawai</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEmployeeModalOpen(false);
                      setEditingEmp(null);
                    }}
                    className="px-3.5 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEmployee}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer"
                  >
                    Simpan Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Bukti Izin / SPTJM Lupa Absen */}
      {isBuktiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold">Arsip Bukti Izin, Sakit &amp; SPTJM Lupa Absen</h3>
                <p className="text-[11px] text-slate-300">
                  Pengajuan otomatis menandai sel tanggal pada matriks presensi pegawai
                </p>
              </div>
              <button
                onClick={() => setIsBuktiModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Pegawai</label>
                    <select
                      value={newBukti.employeeId}
                      onChange={e => setNewBukti(p => ({ ...p, employeeId: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nama} ({emp.kategori})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                    <select
                      value={newBukti.kategoriIjin}
                      onChange={e =>
                        setNewBukti(p => ({
                          ...p,
                          kategoriIjin: e.target.value as PresensiBuktiIzinItem['kategoriIjin']
                        }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                    >
                      <option value="Lupa Absen Datang">Lupa Absen Datang</option>
                      <option value="Lupa Absen Pulang">Lupa Absen Pulang</option>
                      <option value="Lupa Keduanya">Lupa Keduanya</option>
                      <option value="Sakit">Sakit (Surat Dokter)</option>
                      <option value="Izin Khusus">Izin Khusus</option>
                      <option value="Dinas Luar">Dinas Luar</option>
                      <option value="Force Majeure">Force Majeure / Kendala Mesin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tgl Mulai</label>
                    <input
                      type="date"
                      value={newBukti.tanggalMulai}
                      onChange={e =>
                        setNewBukti(p => ({ ...p, tanggalMulai: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tgl Selesai</label>
                    <input
                      type="date"
                      value={newBukti.tanggalSelesai}
                      onChange={e =>
                        setNewBukti(p => ({ ...p, tanggalSelesai: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No. Surat / SPTJM</label>
                    <input
                      type="text"
                      value={newBukti.nomorSurat}
                      onChange={e =>
                        setNewBukti(p => ({ ...p, nomorSurat: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <input
                    type="text"
                    value={newBukti.keterangan}
                    onChange={e => setNewBukti(p => ({ ...p, keterangan: e.target.value }))}
                    placeholder="Keterangan alasan..."
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
                  />
                  <button
                    onClick={handleSaveBukti}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer shrink-0"
                  >
                    + Simpan &amp; Terapkan ke Matriks
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2 border-b border-slate-200">Pegawai</th>
                      <th className="p-2 border-b border-slate-200">Kategori &amp; No. Surat</th>
                      <th className="p-2 border-b border-slate-200">Tanggal</th>
                      <th className="p-2 border-b border-slate-200">Keterangan</th>
                      <th className="p-2 border-b border-slate-200 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {buktiList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          Belum ada arsip bukti izin atau SPTJM tercatat.
                        </td>
                      </tr>
                    ) : (
                      buktiList.map(b => (
                        <tr key={b.id}>
                          <td className="p-2 font-bold text-slate-900">
                            {b.nama}
                            <div className="text-[10px] font-mono text-slate-500">{b.nip}</div>
                          </td>
                          <td className="p-2">
                            <span className="font-semibold text-orange-800">{b.kategoriIjin}</span>
                            <div className="text-[10px] text-slate-500">{b.nomorSurat}</div>
                          </td>
                          <td className="p-2 font-mono text-[11px]">
                            {b.tanggalMulai}
                            {b.tanggalSelesai !== b.tanggalMulai ? ` s.d ${b.tanggalSelesai}` : ''}
                          </td>
                          <td className="p-2 text-slate-600">{b.keterangan}</td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() =>
                                setBuktiList(prev => prev.filter(x => x.id !== b.id))
                              }
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Legenda Kode Status */}
      {isLegendOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Legenda Kode Status E-Presensi BKD</h3>
              <button
                onClick={() => setIsLegendOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {(Object.keys(STATUS_PRESENSI_META) as PresensiStatusType[]).map(k => {
                const m = STATUS_PRESENSI_META[k];
                return (
                  <div
                    key={k}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${m.cellBg} ${m.badgeBorder}`}
                  >
                    <span
                      className={`px-2 py-0.5 rounded font-black text-xs shrink-0 ${m.badgeBg}`}
                    >
                      {m.code}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">{m.label}</div>
                      <div className="text-[11px] text-slate-600">{m.shortDesc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal 8: Impor Excel */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Impor Data Presensi dari Excel</h3>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="text-slate-600 space-y-1.5">
                <p>
                  Mendukung <strong>Template Log E-Presensi BKD Pemprov Jatim</strong> (kolom{' '}
                  <strong>No, Nip, Nama, Jenis, Unit Kerja, Jenis Shift, 1/{selectedMonth}/
                  {String(selectedYear).slice(-2)} s.d {daysCount}/{selectedMonth}/
                  {String(selectedYear).slice(-2)}</strong>{' '}
                  beserta rekapitulasi potongan) maupun format legacy{' '}
                  <strong>Tgl_01 s.d Tgl_{daysCount}</strong>.
                </p>
                <p className="text-[11px] text-slate-500">
                  Kode harian terbaca otomatis: <strong>Y, T, TAP, TAD, LA, DLDK-P/S, DLLK, KFM-S, KTL, I, S, C, X</strong> beserta jam datang &amp; pulang serta periode bulan.
                </p>
              </div>

              <button
                onClick={() =>
                  downloadPresensiExcelTemplate(employees, selectedYear, selectedMonth, config)
                }
                className="w-full py-2 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Template Log BKD ({bulanLabel} {selectedYear})</span>
              </button>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mode Impor</label>
                <select
                  value={importMode}
                  onChange={e => setImportMode(e.target.value as 'merge' | 'replace')}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="merge">Gabungkan &amp; Perbarui (Merge)</option>
                  <option value="replace">Ganti Semua Daftar Pegawai</option>
                </select>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer text-slate-800">
                  <input
                    type="checkbox"
                    checked={autoSaveImportToRepo}
                    onChange={e => setAutoSaveImportToRepo(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <strong>Simpan otomatis ke Repositori Bulanan</strong> (beserta file Excel asli agar bisa dimunculkan &amp; dicetak kembali sewaktu-waktu)
                  </span>
                </label>
                {autoSaveImportToRepo && (
                  <input
                    type="text"
                    value={importArchiveLabel}
                    onChange={e => setImportArchiveLabel(e.target.value)}
                    placeholder={`Label arsip opsional (otomatis: Log BKD ${bulanLabel} ${selectedYear})`}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              <label className="block border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center cursor-pointer bg-slate-50">
                <FileUp className="w-7 h-7 text-emerald-700 mx-auto mb-1.5" />
                <div className="font-bold text-slate-800">Pilih File Log BKD (.xlsx / .xls)</div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcelFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Modal 8B: Repositori Arsip Data Excel Kehadiran Per Bulan */}
      <PresensiMonthlyRepoModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        repoList={monthlyRepo}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        config={config}
        buktiList={buktiList}
        onArchiveCurrentMonth={handleArchiveCurrentMonthToRepo}
        onLoadArchive={handleLoadArchiveFromRepo}
        onMergeYearArchivesToChart={handleMergeYearArchivesToChart}
        onDownloadRawExcel={handleDownloadRepoRawExcel}
        onRenameArchive={handleRenameArchive}
        onDeleteArchive={handleDeleteArchive}
        onOpenImportModal={() => setIsImportOpen(true)}
      />

      {/* Modal 9: Studio Laporan Kehadiran Per Guru (Ragam UI, Font & TTD+Stempel Menyatu) */}
      {selectedIndividualEmp && selectedIndividualSummary && (
        <PresensiIndividualReportModal
          isOpen={isIndividualModalOpen}
          onClose={() => setIsIndividualModalOpen(false)}
          profile={profile}
          config={config}
          employees={employees}
          selectedEmp={selectedIndividualEmp}
          onSelectEmp={setIndividualEmpId}
          summary={selectedIndividualSummary}
          dayColumns={dayColumns}
          empRecords={attendanceMap[selectedIndividualEmp.id] || {}}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          bulanLabel={bulanLabel}
          daysCount={daysCount}
          paperSize={paperSize}
          onChangePaperSize={setPaperSize}
          includeTtdStamp={includeTtdStamp}
          onChangeIncludeTtdStamp={setIncludeTtdStamp}
          resolvedTtdUrl={resolvedTtdUrl}
          resolvedStempelUrl={resolvedStempelUrl}
          onTriggerPrint={() => triggerPrint('individual')}
        />
      )}

      {/* Modal 10: Cetak Laporan Rekapitulasi Resmi (Landscape BKD Matrix Sheet) */}
      {isPrintReportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-3 sm:p-5 print:static print:bg-white print:p-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-[96vw] w-full max-h-[94vh] flex flex-col overflow-hidden print:max-h-none print:border-none print:shadow-none">
            <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-bold">
                  Pratinjau Cetak Laporan Resmi E-Presensi ({bulanLabel} {selectedYear})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PrintTypographyBar
                  value={typography}
                  onChange={next => {
                    setTypography(next);
                    saveStoredPrintTypography('sman9_presensi_typo_v1', next);
                  }}
                />
                <select
                  value={paperSize}
                  onChange={e => setPaperSize(e.target.value as PrintPaperSize)}
                  className="bg-slate-800 border border-slate-600 text-white text-xs rounded-lg px-2.5 py-1.5"
                >
                  <option value="F4">F4 / Folio Landscape</option>
                  <option value="A4">A4 Landscape</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs bg-slate-800 px-2.5 py-1.5 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTtdStamp}
                    onChange={e => setIncludeTtdStamp(e.target.checked)}
                  />
                  <span>TTD &amp; Stempel</span>
                </label>
                <button
                  onClick={() => triggerPrint('matrix')}
                  className="px-3.5 py-1.5 bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  onClick={() => setIsPrintReportOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 bg-slate-200 print:bg-white print:p-0">
              <div
                id="printable-presensi-report"
                className="presensi-sheet-scope bg-white text-black mx-auto p-4 border border-slate-300 shadow-lg print:border-none print:shadow-none print:p-0"
                style={{
                  width: paperSize === 'F4' ? '314mm' : '281mm',
                  ...getPrintTypographyStyleVars(typography)
                }}
              >
                <OfficialKopSurat profile={profile} compact dense />

                <div className="text-center my-1.5">
                  <h2 className="text-[13px] font-extrabold uppercase tracking-wide">
                    LAPORAN REKAPITULASI PRESENSI KEHADIRAN GURU &amp; KARYAWAN
                  </h2>
                  <div className="text-[10.5px] font-semibold">
                    Unit Kerja: {config.namaSubUnit} · Periode: {bulanLabel} {selectedYear} · Jumlah GTK: {summaries.length} Orang
                  </div>
                </div>

                <table className="presensi-print-table w-full border-collapse text-[8px] mt-2">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th rowSpan={2} className="border border-slate-900 py-1 px-0.5 w-6">
                        No
                      </th>
                      <th rowSpan={2} className="border border-slate-900 py-1 px-1 text-left w-36">
                        Nama Pegawai / NIP
                      </th>
                      <th rowSpan={2} className="border border-slate-900 py-1 px-0.5 w-12">
                        Status
                      </th>
                      <th colSpan={dayColumns.length} className="border border-slate-900 py-0.5">
                        Tanggal ({bulanLabel} {selectedYear})
                      </th>
                      <th colSpan={8} className="border border-slate-900 py-0.5">
                        Rekapitulasi
                      </th>
                    </tr>
                    <tr className="bg-slate-100 font-bold text-center">
                      {dayColumns.map(col => (
                        <th
                          key={col.dateStr}
                          className={`border border-slate-900 py-0.5 px-0 text-[7px] ${
                            col.isWeekend || col.holiday ? 'bg-slate-200 text-rose-800' : ''
                          }`}
                        >
                          {col.day}
                        </th>
                      ))}
                      <th className="border border-slate-900 px-0.5 w-6">H</th>
                      <th className="border border-slate-900 px-0.5 w-6">T</th>
                      <th className="border border-slate-900 px-0.5 w-7">Mnt</th>
                      <th className="border border-slate-900 px-0.5 w-6">S</th>
                      <th className="border border-slate-900 px-0.5 w-6">I/C</th>
                      <th className="border border-slate-900 px-0.5 w-6">A</th>
                      <th className="border border-slate-900 px-0.5 w-8">%</th>
                      <th className="border border-slate-900 px-0.5 w-11">Pred.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((sum, idx) => {
                      const emp = sum.employee;
                      const empRecs = attendanceMap[emp.id] || {};
                      const pred = evaluateAttendancePredicate(sum);
                      return (
                        <tr key={emp.id}>
                          <td className="border border-slate-900 text-center font-mono">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-900 px-1 py-0.5 leading-tight">
                            <div className="font-bold truncate">{emp.nama}</div>
                            <div className="text-[7px] font-mono">NIP. {emp.nip}</div>
                          </td>
                          <td className="border border-slate-900 text-center text-[7px]">
                            {emp.statusKepegawaian}
                          </td>
                          {dayColumns.map(col => {
                            const rec = empRecs[col.dateStr];
                            const st: PresensiStatusType =
                              rec?.status ||
                              (col.isWeekend || col.holiday ? 'LIBUR' : 'HADIR');
                            const code = STATUS_PRESENSI_META[st].code;
                            return (
                              <td
                                key={col.dateStr}
                                className={`border border-slate-900 text-center font-bold ${
                                  st === 'LIBUR'
                                    ? 'bg-slate-100 text-slate-500'
                                    : st === 'TERLAMBAT'
                                    ? 'bg-amber-100 text-amber-900'
                                    : st === 'ALPA'
                                    ? 'bg-rose-100 text-rose-900'
                                    : ''
                                }`}
                              >
                                {code}
                              </td>
                            );
                          })}
                          <td className="border border-slate-900 text-center font-bold">
                            {sum.hadirTepat}
                          </td>
                          <td className="border border-slate-900 text-center">
                            {sum.terlambatHari}
                          </td>
                          <td className="border border-slate-900 text-center font-mono">
                            {sum.totalMenitTerlambat}
                          </td>
                          <td className="border border-slate-900 text-center">{sum.sakit}</td>
                          <td className="border border-slate-900 text-center">
                            {sum.izin + sum.cuti}
                          </td>
                          <td className="border border-slate-900 text-center">{sum.alpa}</td>
                          <td className="border border-slate-900 text-center font-bold">
                            {sum.persentaseHadir}%
                          </td>
                          <td className="border border-slate-900 text-center font-bold text-[7px]">
                            {pred.grade} ({pred.label === 'Sangat Baik' ? 'SB' : pred.label === 'Pembinaan Khusus' ? 'PK' : pred.label})
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-2 flex items-start justify-between gap-4 text-[9px]">
                  <div className="border border-slate-800 px-2.5 py-1.5 rounded-xs max-w-lg">
                    <div className="font-bold uppercase mb-0.5">Keterangan Kode Status &amp; Predikat:</div>
                    <div>
                      <strong>V</strong> = Hadir · <strong>T</strong> = Terlambat ·{' '}
                      <strong>S</strong> = Sakit · <strong>I</strong> = Izin ·{' '}
                      <strong>C</strong> = Cuti · <strong>A</strong> = Alpa ·{' '}
                      <strong>DL</strong> = Dinas Luar · <strong>LA</strong> = Lupa Absen (SPTJM) ·{' '}
                      <strong>L</strong> = Libur
                    </div>
                    <div className="mt-0.5">
                      <strong>Predikat:</strong> <strong>A (SB)</strong> = Sangat Baik (≥98%) ·{' '}
                      <strong>B</strong> = Baik (92–97,9%) · <strong>C</strong> = Cukup (85–91,9%) ·{' '}
                      <strong>D</strong> = Kurang (75–84,9%) · <strong>E (PK)</strong> = Pembinaan Khusus (&lt;75%)
                    </div>
                  </div>

                  <div className="flex gap-8 items-start">
                    <OfficialMergedSignatureBlock
                      topLabel="Mengetahui,"
                      jabatan="Koordinator Tata Usaha"
                      nama={config.ttdOperatorNama}
                      nip={config.ttdOperatorNip}
                      includeStampAndTtd={false}
                      compact
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
                      compact
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/60 flex items-center gap-3 print:hidden">
          <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-black">
            ✓
          </div>
          <p className="text-xs font-medium text-slate-100 flex-1 leading-snug">
            {toastMsg}
          </p>
          <button
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
