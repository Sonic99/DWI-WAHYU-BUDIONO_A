/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Employee, 
  DailyAttendance, 
  AttendanceConfig, 
  EmployeeMonthlySummary,
  KopSuratConfig,
  BuktiIzinItem,
  HolidayItem,
  AttendanceStatusType
} from './types/attendance';
import { 
  DEFAULT_CONFIG, 
  INITIAL_EMPLOYEES, 
  generateInitialAttendanceMap 
} from './data/initialData';
import { DEFAULT_BUKTI_IZIN_LIST } from './data/buktiIzinData';
import { 
  calculateEmployeeSummary, 
  recalculateAttendanceMapWithConfig,
  evaluateLatenessStatus 
} from './utils/attendanceCalculations';
import { 
  exportAttendanceToExcel, 
  exportAttendanceToCSV, 
  downloadExcelTemplate 
} from './utils/excelExport';

import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { AttendanceMatrixTable } from './components/AttendanceMatrixTable';
import { CellEditModal } from './components/CellEditModal';
import { QuickCheckInModal } from './components/QuickCheckInModal';
import { EmployeeManagementModal } from './components/EmployeeManagementModal';
import { ConfigSettingsModal } from './components/ConfigSettingsModal';
import { PrintReportModal } from './components/PrintReportModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { IndividualAttendanceModal } from './components/IndividualAttendanceModal';
import { AdminScheduleModal } from './components/AdminScheduleModal';
import { TableLegendModal } from './components/TableLegendModal';
import { BuktiIzinModal } from './components/BuktiIzinModal';
import { ExportFormatModal } from './components/ExportFormatModal';
import { DateScheduleManagementModal } from './components/DateScheduleManagementModal';
import { ShareAppModal } from './components/ShareAppModal';

const STORAGE_KEY_EMPLOYEES = 'epresensi_employees_v3';
const STORAGE_KEY_ATTENDANCE = 'epresensi_attendance_map_v3';
const STORAGE_KEY_CONFIG = 'epresensi_config_v3';
const STORAGE_KEY_BUKTI_IZIN = 'epresensi_bukti_izin_v3';

// Helper pembersih hari libur & akurasi data: pastikan hari libur nasional, institusional & akhir pekan tidak salah status
export function sanitizeHolidaysInAttendanceMap(
  currentMap: Record<string, Record<string, DailyAttendance>>,
  holidays: HolidayItem[],
  employeeList: Employee[],
  config?: AttendanceConfig
): Record<string, Record<string, DailyAttendance>> {
  const newMap = { ...currentMap };
  const holidayDateMap = new Map<string, HolidayItem>();
  (holidays || []).forEach(h => holidayDateMap.set(h.date, h));

  const defJamMasuk = config?.defaultJamMasuk || '06:45';
  const toleransi = config?.toleransiKeterlambatanMenit || 0;

  for (const emp of employeeList) {
    if (!newMap[emp.id]) newMap[emp.id] = {};
    const empRecords = { ...newMap[emp.id] };

    // 1. Bersihkan setiap tanggal libur resmi agar tidak ada jam kerja tertulis
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
            keterangan: existing.keterangan && existing.keterangan.startsWith('Libur') 
              ? existing.keterangan 
              : `${hol.type === 'NASIONAL' ? 'Libur Nasional' : 'Libur Institusional'}: ${hol.name}`,
          };
        }
      } else {
        empRecords[dStr] = {
          date: dStr,
          status: 'LIBUR',
          keterangan: `${hol.type === 'NASIONAL' ? 'Libur Nasional' : 'Libur Institusional'}: ${hol.name}`,
          menitTerlambat: 0,
          menitPulangAwal: 0,
        };
      }
    });

    // 2. Bersihkan rekaman untuk setiap tanggal dalam bulan agar tidak ada kontradiksi data
    Object.keys(empRecords).forEach(dStr => {
      const rec = empRecords[dStr];
      if (!rec) return;

      const dateObj = new Date(dStr);
      const dayOfWeek = !isNaN(dateObj.getTime()) ? dateObj.getDay() : 1;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Akhir pekan (Sabtu & Minggu)
      if (isWeekend && !rec.hasBukti && rec.status !== 'DL_PENUH') {
        empRecords[dStr] = {
          ...rec,
          status: 'LIBUR',
          jamDatang: undefined,
          jamPulang: undefined,
          menitTerlambat: 0,
          menitPulangAwal: 0,
          keterangan: 'Libur Akhir Pekan',
        };
        return;
      }

      // Bersihkan keterangan palsu 'Lupa absen datang dan/atau pulang (V)' yang terbaca dari checkmark V
      if (rec.keterangan && rec.keterangan.includes('Lupa absen datang dan/atau pulang (V)') && !rec.hasBukti) {
        empRecords[dStr] = {
          ...rec,
          keterangan: '',
        };
      }

      // Pastikan konsistensi keterlambatan dan status HADIR vs TERLAMBAT
      if (rec.status === 'HADIR' && rec.menitTerlambat && rec.menitTerlambat > 0) {
        if (rec.jamDatang) {
          const evalRes = evaluateLatenessStatus(rec.jamDatang, defJamMasuk, toleransi);
          if (evalRes.isLate) {
            empRecords[dStr] = {
              ...rec,
              status: 'TERLAMBAT',
              menitTerlambat: evalRes.netMinutesLate || evalRes.rawMinutesLate,
            };
          } else {
            empRecords[dStr] = {
              ...rec,
              menitTerlambat: 0,
            };
          }
        } else {
          empRecords[dStr] = {
            ...rec,
            menitTerlambat: 0,
          };
        }
      }
    });

    newMap[emp.id] = empRecords;
  }

  return newMap;
}

export default function App() {
  // Load state from localStorage with fallbacks
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      if (saved !== null) {
        const parsed: Employee[] = JSON.parse(saved);
        if (!parsed.some(e => e.status === 'PPPK PW')) {
          return parsed.map(e => {
            if (e.id === 'emp-109' || e.id === 'emp-110') {
              return { 
                ...e, 
                status: 'PPPK PW' as const, 
                jabatan: e.jabatan.includes('(PW)') ? e.jabatan : e.jabatan.replace('Guru Ahli Pertama', 'Guru Ahli Pertama (PW)'),
                tppNominal: 2500000 
              };
            }
            return e;
          });
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load employees from localStorage', e);
    }
    return INITIAL_EMPLOYEES;
  });

  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, DailyAttendance>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        return sanitizeHolidaysInAttendanceMap(parsed, DEFAULT_CONFIG.holidays || [], INITIAL_EMPLOYEES);
      }
    } catch (e) {
      console.warn('Failed to load attendances from localStorage', e);
    }
    return generateInitialAttendanceMap();
  });

  const [config, setConfig] = useState<AttendanceConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          kopSurat: {
            ...DEFAULT_CONFIG.kopSurat,
            ...(parsed.kopSurat || {}),
          },
          holidays: (parsed.holidays && Array.isArray(parsed.holidays) && parsed.holidays.length > 0)
            ? parsed.holidays
            : DEFAULT_CONFIG.holidays,
        };
      }
    } catch (e) {
      console.warn('Failed to load config from localStorage', e);
    }
    return DEFAULT_CONFIG;
  });

  // Selected period (default September 2026 as in image.png)
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // Modals state
  const [cellEditState, setCellEditState] = useState<{
    isOpen: boolean;
    employee: Employee | null;
    dateStr: string;
    record?: DailyAttendance;
  }>({
    isOpen: false,
    employee: null,
    dateStr: '',
  });

  const [isQuickCheckInOpen, setIsQuickCheckInOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configModalTab, setConfigModalTab] = useState<'jam' | 'holidays' | 'kop' | 'potongan'>('jam');

  const handleOpenConfigWithTab = (tab: 'jam' | 'holidays' | 'kop' | 'potongan' = 'jam') => {
    setConfigModalTab(tab);
    setIsConfigOpen(true);
  };
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  
  // Individual Report Modal
  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [individualEmployeeId, setIndividualEmployeeId] = useState<string>('');

  // Legend & Admin Schedule Modals
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [isAdminScheduleOpen, setIsAdminScheduleOpen] = useState(false);
  const [isBuktiIzinOpen, setIsBuktiIzinOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedDateForSchedule, setSelectedDateForSchedule] = useState<string | null>(null);

  // Bukti Izin List State (SPTJM / Lupa Absen / Force Majeur / Izin)
  const [buktiList, setBuktiList] = useState<BuktiIzinItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BUKTI_IZIN);
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load bukti izin from localStorage', e);
    }
    return DEFAULT_BUKTI_IZIN_LIST;
  });

  const handleAddBukti = (item: BuktiIzinItem) => {
    setBuktiList(prev => [item, ...prev]);
    showToast(`Bukti izin untuk ${item.nama} (${item.kategoriIjin}) berhasil ditambahkan.`);
  };

  const handleUpdateBukti = (item: BuktiIzinItem) => {
    setBuktiList(prev => prev.map(b => b.id === item.id ? item : b));
    showToast(`Bukti izin untuk ${item.nama} berhasil diperbarui.`);
  };

  const handleDeleteBukti = (id: string) => {
    const item = buktiList.find(b => b.id === id);
    setBuktiList(prev => prev.filter(b => b.id !== id));
    showToast(`Bukti izin untuk ${item?.nama || 'pegawai'} telah dihapus.`, 'info');
  };

  // Dashboard Toggle Panel State (Buka / Tutup)
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSaveAdminSchedule = (newConfig: AttendanceConfig, recalculate: boolean) => {
    setConfig(newConfig);
    if (recalculate) {
      setAttendanceMap(prev => recalculateAttendanceMapWithConfig(prev, newConfig));
      showToast(`Pengaturan jam kerja (${newConfig.defaultJamMasuk} - ${newConfig.defaultJamPulang} ${newConfig.zonaWaktu}) berhasil disimpan & data presensi telah disesuaikan.`);
    } else {
      showToast(`Pengaturan jam kerja (${newConfig.defaultJamMasuk} - ${newConfig.defaultJamPulang} ${newConfig.zonaWaktu}) berhasil diperbarui.`);
    }
  };

  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('epresensi_dashboard_open');
      if (saved !== null) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return true;
  });

  const handleToggleDashboard = () => {
    setIsDashboardOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('epresensi_dashboard_open', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Auto-sanitize on mount to guarantee data accuracy & consistency
  useEffect(() => {
    setAttendanceMap((prev) => sanitizeHolidaysInAttendanceMap(prev, config.holidays || [], employees, config));
  }, []);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
    } catch (e) {
      console.error(e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceMap));
    } catch (e) {
      console.error(e);
    }
  }, [attendanceMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BUKTI_IZIN, JSON.stringify(buktiList));
    } catch (e) {
      console.error(e);
    }
  }, [buktiList]);

  // Summaries calculation
  const summaries: EmployeeMonthlySummary[] = employees.map((emp) =>
    calculateEmployeeSummary(emp, attendanceMap[emp.id], config, selectedYear, selectedMonth)
  );

  // Cell Edit Handlers
  const handleCellClick = (employee: Employee, dateStr: string, currentRecord?: DailyAttendance) => {
    setCellEditState({
      isOpen: true,
      employee,
      dateStr,
      record: currentRecord,
    });
  };

  const handleSaveCellRecord = (employeeId: string, dateStr: string, updatedRecord: DailyAttendance | null) => {
    setAttendanceMap((prev) => {
      const copy = { ...prev };
      if (!copy[employeeId]) {
        copy[employeeId] = {};
      }
      if (updatedRecord) {
        copy[employeeId] = {
          ...copy[employeeId],
          [dateStr]: updatedRecord,
        };
      } else {
        const empRecs = { ...copy[employeeId] };
        delete empRecs[dateStr];
        copy[employeeId] = empRecs;
      }
      return copy;
    });
  };

  // Simpan record satu tanggal ke SEMUA pegawai sekaligus
  const handleBatchSaveCellToAll = (dateStr: string, updatedRecord: DailyAttendance | null) => {
    setAttendanceMap((prev) => {
      const copy = { ...prev };
      employees.forEach((emp) => {
        if (!copy[emp.id]) copy[emp.id] = {};
        if (updatedRecord) {
          copy[emp.id] = {
            ...copy[emp.id],
            [dateStr]: {
              ...updatedRecord,
              date: dateStr,
              polaKerja: updatedRecord.polaKerja || emp.jamKerja,
            },
          };
        } else {
          const empRecs = { ...copy[emp.id] };
          delete empRecs[dateStr];
          copy[emp.id] = empRecs;
        }
      });
      return copy;
    });
    showToast(`Perubahan tanggal ${dateStr} berhasil diterapkan ke seluruh ${employees.length} pegawai.`);
  };

  // Pengaturan jadwal / jam kerja masal untuk suatu tanggal
  const handleBatchUpdateDate = (
    dateStr: string, 
    update: { 
      status: AttendanceStatusType; 
      jamDatang?: string; 
      jamPulang?: string; 
      polaKerja?: string; 
      keterangan?: string; 
      clearHours?: boolean; 
      employeeIds?: string[] 
    }
  ) => {
    const targetEmployees = update.employeeIds 
      ? employees.filter(e => update.employeeIds!.includes(e.id))
      : employees;

    setAttendanceMap((prev) => {
      const copy = { ...prev };
      targetEmployees.forEach((emp) => {
        if (!copy[emp.id]) copy[emp.id] = {};
        copy[emp.id] = {
          ...copy[emp.id],
          [dateStr]: {
            date: dateStr,
            status: update.status,
            jamDatang: (update.clearHours || update.status === 'LIBUR') ? undefined : update.jamDatang,
            jamPulang: (update.clearHours || update.status === 'LIBUR') ? undefined : update.jamPulang,
            polaKerja: update.polaKerja || emp.jamKerja,
            keterangan: update.keterangan || (update.status === 'LIBUR' ? 'Hari Libur Resmi / Non-Kerja' : undefined),
            menitTerlambat: 0,
            menitPulangAwal: 0,
          },
        };
      });
      return copy;
    });

    showToast(`Pengaturan tanggal ${dateStr} berhasil diterapkan ke ${targetEmployees.length} pegawai.`);
  };

  // Bersihkan dan sesuaikan semua tanggal hari libur resmi untuk semua pegawai
  const handleSanitizeAllHolidays = () => {
    const holidaysList = config.holidays || [];
    setAttendanceMap((prev) => {
      const cleaned = sanitizeHolidaysInAttendanceMap(prev, holidaysList, employees);
      return cleaned;
    });
    showToast(`Berhasil! Seluruh jam kerja pada hari libur resmi (${holidaysList.length} hari) telah dihapus dan disesuaikan menjadi status LIBUR untuk semua ${employees.length} pegawai.`);
  };

  // Tambah / update hari libur dari modal tanggal
  const handleAddOrUpdateHolidayFromModal = (holiday: HolidayItem) => {
    setConfig((prev) => {
      const currentHolidays = prev.holidays || [];
      const exists = currentHolidays.some(h => h.id === holiday.id || h.date === holiday.date);
      const updatedHolidays = exists
        ? currentHolidays.map(h => (h.id === holiday.id || h.date === holiday.date) ? holiday : h)
        : [...currentHolidays, holiday];
      return { ...prev, holidays: updatedHolidays };
    });
    setAttendanceMap((prev) => sanitizeHolidaysInAttendanceMap(prev, [holiday], employees));
    showToast(`Hari libur "${holiday.name}" berhasil didaftarkan dan jam kerja pegawai telah disesuaikan.`);
  };

  // Bulk Attendance Update
  const handleBulkAttendanceUpdate = (records: { employeeId: string; dateStr: string; record: DailyAttendance }[]) => {
    setAttendanceMap((prev) => {
      const copy = { ...prev };
      records.forEach(({ employeeId, dateStr, record }) => {
        if (!copy[employeeId]) {
          copy[employeeId] = {};
        }
        copy[employeeId] = {
          ...copy[employeeId],
          [dateStr]: record,
        };
      });
      return copy;
    });
  };

  // Employee CRUD Handlers
  const handleSaveEmployee = (emp: Employee) => {
    setEmployees((prev) => {
      const exists = prev.some((e) => e.id === emp.id);
      if (exists) {
        return prev.map((e) => (e.id === emp.id ? emp : e));
      }
      return [...prev, emp];
    });
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    setAttendanceMap((prev) => {
      const copy = { ...prev };
      delete copy[employeeId];
      return copy;
    });
  };

  const handleEditEmployee = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenAddEmployee = () => {
    setEmployeeToEdit(null);
    setIsEmployeeModalOpen(true);
  };

  // Excel Import Handler
  const handleImportComplete = (
    importedEmployees: Employee[],
    importedAttendanceMap: Record<string, Record<string, DailyAttendance>>,
    mode: 'replace' | 'merge'
  ) => {
    const cleanedAttendance = sanitizeHolidaysInAttendanceMap(
      importedAttendanceMap,
      config.holidays || [],
      importedEmployees,
      config
    );

    if (mode === 'replace') {
      setEmployees(importedEmployees);
      setAttendanceMap(cleanedAttendance);
      if (importedEmployees.length > 0) {
        setIndividualEmployeeId(importedEmployees[0].id);
      }
    } else {
      // Merge
      setEmployees((prev) => {
        const map = new Map(prev.map(e => [e.nip, e]));
        importedEmployees.forEach(newEmp => {
          map.set(newEmp.nip, newEmp);
        });
        return Array.from(map.values());
      });

      setAttendanceMap((prev) => {
        const copy = { ...prev };
        Object.keys(cleanedAttendance).forEach(empId => {
          copy[empId] = {
            ...(copy[empId] || {}),
            ...cleanedAttendance[empId],
          };
        });
        return copy;
      });
      if (importedEmployees.length > 0) {
        setIndividualEmployeeId(importedEmployees[0].id);
      }
    }

    showToast(
      `Berhasil mengimpor data ${importedEmployees.length} pegawai! Seluruh log presensi harian telah disesuaikan dan siap diproses pada kartu individu masing-masing.`
    );
  };

  // Clear data / Reset Dummy
  const handleClearAllData = () => {
    if (confirm('Kosongkan semua data pegawai dan riwayat presensi? Anda dapat mengimpor file Excel baru setelah ini.')) {
      setEmployees([]);
      setAttendanceMap({});
    }
  };

  const handleLoadSampleData = () => {
    setEmployees(INITIAL_EMPLOYEES);
    setAttendanceMap(generateInitialAttendanceMap());
  };

  // Open Individual Report Modal
  const handleOpenIndividualReport = (employeeId?: string) => {
    if (employees.length === 0) return;
    const targetId = employeeId || individualEmployeeId || employees[0]?.id || '';
    setIndividualEmployeeId(targetId);
    setIsIndividualModalOpen(true);
  };

  // Excel & CSV Exports
  const handleExportExcel = () => {
    exportAttendanceToExcel(employees, attendanceMap, config, selectedYear, selectedMonth);
  };

  const handleExportCSV = () => {
    exportAttendanceToCSV(employees, attendanceMap, config, selectedYear, selectedMonth);
  };

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(config, selectedYear, selectedMonth);
  };

  // Update KOP Surat
  const handleUpdateKopSurat = (newKop: KopSuratConfig) => {
    setConfig(prev => ({
      ...prev,
      namaInstansi: newKop.baris1 || prev.namaInstansi,
      namaSubUnit: newKop.baris3 || prev.namaSubUnit,
      kodeUnitKerja: newKop.kodeUnitKerja || prev.kodeUnitKerja,
      kopSurat: newKop,
    }));
  };

  // Backup & Reset
  const handleRestore = (data: {
    employees: Employee[];
    attendanceMap: Record<string, Record<string, DailyAttendance>>;
    config: AttendanceConfig;
  }) => {
    setEmployees(data.employees);
    setAttendanceMap(data.attendanceMap);
    setConfig(data.config);
  };

  const handleResetToDefault = () => {
    setEmployees(INITIAL_EMPLOYEES);
    setAttendanceMap(generateInitialAttendanceMap());
    setConfig(DEFAULT_CONFIG);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header & Navigation */}
      <Header
        config={config}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        employeeCount={employees.length}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onOpenImportExcel={() => setIsExcelImportOpen(true)}
        onOpenQuickCheckIn={() => setIsQuickCheckInOpen(true)}
        onOpenAddEmployee={handleOpenAddEmployee}
        onOpenConfig={() => handleOpenConfigWithTab('jam')}
        onOpenKopSettings={() => handleOpenConfigWithTab('kop')}
        onOpenHolidays={() => handleOpenConfigWithTab('holidays')}
        onOpenPrint={() => setIsPrintOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onClearAllData={handleClearAllData}
        onLoadSampleData={handleLoadSampleData}
        onOpenIndividualReport={() => handleOpenIndividualReport()}
        onOpenAdminSchedule={() => setIsAdminScheduleOpen(true)}
        onOpenLegend={() => setIsLegendModalOpen(true)}
        onOpenBuktiIzin={() => setIsBuktiIzinOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenShare={() => setIsShareModalOpen(true)}
        onDownloadTemplate={handleDownloadTemplate}
        isDashboardOpen={isDashboardOpen}
        onToggleDashboard={handleToggleDashboard}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Top Summary Cards (Collapsible Panel Dashboard) */}
        {employees.length > 0 && (
          <DashboardStats
            summaries={summaries}
            totalEmployees={employees.length}
            isOpen={isDashboardOpen}
            onToggle={handleToggleDashboard}
            onOpenShare={() => setIsShareModalOpen(true)}
          />
        )}

        {/* Matrix Table with Sticky Columns and Exact Structure from image.png */}
        <AttendanceMatrixTable
          employees={employees}
          attendanceMap={attendanceMap}
          config={config}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onCellClick={handleCellClick}
          onEditEmployee={handleEditEmployee}
          onOpenIndividualReport={handleOpenIndividualReport}
          onOpenImportExcel={() => setIsExcelImportOpen(true)}
          onOpenAddEmployee={handleOpenAddEmployee}
          onDownloadTemplate={handleDownloadTemplate}
          onLoadSampleData={handleLoadSampleData}
          onOpenLegend={() => setIsLegendModalOpen(true)}
          onOpenBuktiIzin={() => setIsBuktiIzinOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenConfigHolidays={() => handleOpenConfigWithTab('holidays')}
          onOpenDateSchedule={(dateStr) => setSelectedDateForSchedule(dateStr)}
          onSanitizeAllHolidays={handleSanitizeAllHolidays}
        />
      </main>

      {/* Modals */}
      <ExcelImportModal
        isOpen={isExcelImportOpen}
        onClose={() => setIsExcelImportOpen(false)}
        config={config}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        existingEmployees={employees}
        attendanceMap={attendanceMap}
        onImportComplete={handleImportComplete}
      />

      <CellEditModal
        isOpen={cellEditState.isOpen}
        onClose={() => setCellEditState((prev) => ({ ...prev, isOpen: false }))}
        employee={cellEditState.employee}
        dateStr={cellEditState.dateStr}
        currentRecord={cellEditState.record}
        config={config}
        onSave={handleSaveCellRecord}
        onSaveToAll={handleBatchSaveCellToAll}
        totalEmployeesCount={employees.length}
      />

      <QuickCheckInModal
        isOpen={isQuickCheckInOpen}
        onClose={() => setIsQuickCheckInOpen(false)}
        employees={employees}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        config={config}
        onBulkUpdate={handleBulkAttendanceUpdate}
      />

      <EmployeeManagementModal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEmployeeToEdit(null);
        }}
        employees={employees}
        initialEmployeeToEdit={employeeToEdit}
        config={config}
        onSaveEmployee={handleSaveEmployee}
        onDeleteEmployee={handleDeleteEmployee}
      />

      <ConfigSettingsModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={setConfig}
        initialTab={configModalTab}
        employees={employees}
      />

      <PrintReportModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        employees={employees}
        attendanceMap={attendanceMap}
        config={config}
        onUpdateKopSurat={handleUpdateKopSurat}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      <IndividualAttendanceModal
        isOpen={isIndividualModalOpen}
        onClose={() => setIsIndividualModalOpen(false)}
        employees={employees}
        selectedEmployeeId={individualEmployeeId}
        onSelectEmployeeId={setIndividualEmployeeId}
        attendanceMap={attendanceMap}
        config={config}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      <BackupRestoreModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        employees={employees}
        attendanceMap={attendanceMap}
        config={config}
        onRestore={handleRestore}
        onResetToDefault={handleResetToDefault}
      />

      <AdminScheduleModal
        isOpen={isAdminScheduleOpen}
        onClose={() => setIsAdminScheduleOpen(false)}
        config={config}
        onSaveConfig={handleSaveAdminSchedule}
        employeeCount={employees.length}
      />

      <TableLegendModal
        isOpen={isLegendModalOpen}
        onClose={() => setIsLegendModalOpen(false)}
      />

      <BuktiIzinModal
        isOpen={isBuktiIzinOpen}
        onClose={() => setIsBuktiIzinOpen(false)}
        employees={employees}
        attendanceMap={attendanceMap}
        config={config}
        buktiList={buktiList}
        onAddBukti={handleAddBukti}
        onUpdateBukti={handleUpdateBukti}
        onDeleteBukti={handleDeleteBukti}
      />

      <ExportFormatModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        employees={employees}
        attendanceMap={attendanceMap}
        config={config}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        buktiList={buktiList}
      />

      <DateScheduleManagementModal
        isOpen={selectedDateForSchedule !== null}
        onClose={() => setSelectedDateForSchedule(null)}
        dateStr={selectedDateForSchedule || ''}
        config={config}
        employees={employees}
        attendanceMap={attendanceMap}
        onBatchUpdateDate={handleBatchUpdateDate}
        onAddOrUpdateHoliday={handleAddOrUpdateHolidayFromModal}
      />

      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        appName={config.namaInstansi || 'Database Presensi Kehadiran Pegawai'}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
            ✓
          </div>
          <p className="text-xs font-medium text-slate-100 flex-1 leading-snug">
            {toastMessage.text}
          </p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
