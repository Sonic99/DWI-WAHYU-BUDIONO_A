import React, { useEffect, useMemo, useState } from 'react';
import {
  JadwalPengawasSlot,
  JadwalUjianItem,
  KartuPanitiaSettings,
  KartuUjianSettings,
  PanitiaPengawasItem,
  SchoolProfile,
  Siswa,
  User
} from '../types';
import {
  appendAuditLog,
  DaftarHadirStoredMarks,
  exportDaftarHadirPengawasExcel,
  exportDaftarHadirSiswaExcel,
  getStoredDaftarHadirMarks,
  resolveScheduleTimeForStudent,
  saveStoredDaftarHadirMarks
} from '../services/storageService';
import {
  computeMatchedRoomDistribution,
  extractRoomOrderNumber,
  findScheduledProctorsForRoomAndDay,
  formatPengawasRoomAssignmentLabel,
  matchConditionalJadwalSiswa
} from '../utils/examRoomSync';
import { DEFAULT_JADWAL_PENGAWAS_SLOTS } from '../utils/pengawasSchedule';
import { OfficialKopSurat } from './OfficialKopSurat';
import { KepalaSekolahSignatureSvg, SchoolStampSvg } from './OfficialStamps';
import { AturKelompokRuangSiswaModal } from './AturKelompokRuangSiswaModal';
import { PrintTypographyBar } from './PrintTypographyBar';
import {
  getPrintTypographyStyleVars,
  getScopedPrintTypographyCss,
  getStoredPrintTypography,
  PrintTypographySettings,
  resolvePrintSpacingMeta,
  saveStoredPrintTypography
} from '../utils/printTypography';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  DoorOpen,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users
} from 'lucide-react';

interface DaftarHadirUjianViewProps {
  profile: SchoolProfile;
  currentUser: User;
  siswaList: Siswa[];
  ujianSettings: KartuUjianSettings;
  panitiaList: PanitiaPengawasItem[];
  panitiaSettings: KartuPanitiaSettings;
  onUpdateSiswa?: (list: Siswa[]) => void;
}

type MainTab = 'siswa' | 'pengawas';
type SiswaSubMode = 'harian' | 'rekap_hari';
type PengawasSubMode = 'per_slot' | 'per_pengawas' | 'matriks';
type PaperSize = 'A4' | 'F4';
type PrintOrientation = 'portrait' | 'landscape';
type SiswaHadirCode = 'H' | 'S' | 'I' | 'A' | '';
type PengawasHadirCode = 'Hadir' | 'Digantikan' | 'Izin' | '';

export const DaftarHadirUjianView: React.FC<DaftarHadirUjianViewProps> = ({
  profile,
  currentUser,
  siswaList,
  ujianSettings,
  panitiaList,
  panitiaSettings,
  onUpdateSiswa
}) => {
  const [mainTab, setMainTab] = useState<MainTab>('siswa');
  const [paperSize, setPaperSize] = useState<PaperSize>('F4');
  const [orientation, setOrientation] = useState<PrintOrientation>('portrait');
  const [previewZoom, setPreviewZoom] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 50 : 85
  );
  const [typography, setTypography] = useState<PrintTypographySettings>(() =>
    getStoredPrintTypography('sman9_daftar_hadir_typo_v1', {
      fontFamily: 'inter',
      lineSpacing: 'nyaman',
      fontScalePct: 100
    })
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isRoomGroupModalOpen, setIsRoomGroupModalOpen] = useState<boolean>(false);

  useEffect(() => {
    saveStoredPrintTypography('sman9_daftar_hadir_typo_v1', typography);
  }, [typography]);

  // Persistent attendance marks
  const [marks, setMarks] = useState<DaftarHadirStoredMarks>(getStoredDaftarHadirMarks);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(prev => (prev === msg ? null : prev)), 3200);
  };

  const updateMarks = (next: DaftarHadirStoredMarks) => {
    setMarks(next);
    saveStoredDaftarHadirMarks(next);
  };

  // ==================== SISWA DATA & STATE ====================
  const matchedDistribution = useMemo(
    () => computeMatchedRoomDistribution(siswaList, ujianSettings),
    [siswaList, ujianSettings]
  );

  const jadwalList: JadwalUjianItem[] = ujianSettings.jadwalUjian || [];
  const proctorSlots: JadwalPengawasSlot[] =
    panitiaSettings.jadwalPengawasSlots && panitiaSettings.jadwalPengawasSlots.length > 0
      ? panitiaSettings.jadwalPengawasSlots
      : DEFAULT_JADWAL_PENGAWAS_SLOTS;

  const [siswaSubMode, setSiswaSubMode] = useState<SiswaSubMode>('harian');
  const [selectedJadwalId, setSelectedJadwalId] = useState<string>(
    jadwalList[0]?.id || 'BLANKO'
  );
  const [filterTingkat, setFilterTingkat] = useState<'SEMUA' | 'X' | 'XI' | 'XII' | 'Gabungan'>('SEMUA');
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>('ALL');
  const [includeMarksOnPrint, setIncludeMarksOnPrint] = useState<boolean>(false);
  const [includeDigitalTtd, setIncludeDigitalTtd] = useState<boolean>(false);
  const [manualBlankoHari, setManualBlankoHari] = useState<string>('........................................');
  const [manualBlankoWaktu, setManualBlankoWaktu] = useState<string>('07.30 - 09.30 WIB');
  const [manualBlankoMapel, setManualBlankoMapel] = useState<string>('........................................');
  const [pengawasOverride, setPengawasOverride] = useState<
    Record<string, { p1Name: string; p1Nip: string; p2Name: string; p2Nip: string }>
  >({});

  // Sync default jadwal if list changes
  useEffect(() => {
    if (
      selectedJadwalId !== 'BLANKO' &&
      selectedJadwalId !== 'ALL' &&
      !jadwalList.some(j => j.id === selectedJadwalId)
    ) {
      setSelectedJadwalId(jadwalList[0]?.id || 'BLANKO');
    }
  }, [jadwalList, selectedJadwalId]);

  const filteredRooms = useMemo(() => {
    return matchedDistribution.rooms.filter(r => {
      if (filterTingkat !== 'SEMUA' && r.tingkatKelas !== filterTingkat) return false;
      if (selectedRoomCode !== 'ALL' && r.nomorRuang !== selectedRoomCode) return false;
      return true;
    });
  }, [matchedDistribution.rooms, filterTingkat, selectedRoomCode]);

  const activeJadwalItems = useMemo<JadwalUjianItem[]>(() => {
    if (selectedJadwalId === 'BLANKO') {
      return [
        {
          id: 'BLANKO',
          hariTanggal: manualBlankoHari,
          waktu: manualBlankoWaktu,
          mataPelajaran: manualBlankoMapel,
          kondisiTarget: 'Semua',
          kondisiNilai: ''
        }
      ];
    }
    if (selectedJadwalId === 'ALL') {
      return jadwalList.length > 0
        ? jadwalList
        : [
            {
              id: 'BLANKO',
              hariTanggal: manualBlankoHari,
              waktu: manualBlankoWaktu,
              mataPelajaran: manualBlankoMapel,
              kondisiTarget: 'Semua',
              kondisiNilai: ''
            }
          ];
    }
    const found = jadwalList.find(j => j.id === selectedJadwalId);
    return found ? [found] : jadwalList.slice(0, 1);
  }, [selectedJadwalId, jadwalList, manualBlankoHari, manualBlankoWaktu, manualBlankoMapel]);

  // Distinct days for Multi-Day Matrix mode
  const distinctExamDays = useMemo(() => {
    const map = new Map<string, { key: string; label: string; mapelSummary: string }>();
    jadwalList.forEach(j => {
      const k = (j.hariTanggal || '').trim() || j.id;
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label: j.hariTanggal || 'Hari Ujian',
          mapelSummary: j.mataPelajaran || '-'
        });
      } else {
        const existing = map.get(k)!;
        if (j.mataPelajaran && !existing.mapelSummary.includes(j.mataPelajaran)) {
          existing.mapelSummary = `${existing.mapelSummary} / ${j.mataPelajaran}`;
        }
      }
    });
    return Array.from(map.values());
  }, [jadwalList]);

  // Helper: all rows on same day (for resolveScheduleTimeForStudent)
  const sharedJadwalRows = useMemo(
    () =>
      jadwalList.filter(
        r => (r.kondisiTarget || 'Semua') !== 'Sesi' || !(r.kondisiNilai || '').trim()
      ),
    [jadwalList]
  );

  // Build print pages for Siswa Harian mode
  const siswaHarianPages = useMemo(() => {
    const pages: {
      pageKey: string;
      room: (typeof matchedDistribution.rooms)[number];
      jadwal: JadwalUjianItem;
      eligibleStudents: Siswa[];
      resolvedTime: string;
      suggestedProctors: PanitiaPengawasItem[];
    }[] = [];

    activeJadwalItems.forEach(jadwal => {
      const dayRows = jadwalList.filter(
        r => (r.hariTanggal || '').trim() === (jadwal.hariTanggal || '').trim()
      );
      const suggestedMap = new Map<string, PanitiaPengawasItem[]>();

      filteredRooms.forEach(room => {
        const eligibleStudents =
          jadwal.id === 'BLANKO'
            ? room.students
            : room.students.filter(s =>
                matchConditionalJadwalSiswa(jadwal, s, s.sesiUjian || room.sesiUjian)
              );
        if (eligibleStudents.length === 0) return;

        const firstStudentSesi =
          eligibleStudents[0]?.sesiUjian || room.sesiUjian || 'Sesi 1';
        const resolved =
          jadwal.id === 'BLANKO'
            ? { waktu: jadwal.waktu, isAdjusted: false }
            : resolveScheduleTimeForStudent(
                jadwal,
                dayRows.length > 0 ? dayRows : [jadwal],
                sharedJadwalRows,
                firstStudentSesi,
                ujianSettings.sesiTersedia || ['Sesi 1'],
                ujianSettings.sinkronWaktuJadwalDenganSesi !== false
              );

        if (!suggestedMap.has(room.nomorRuang)) {
          suggestedMap.set(
            room.nomorRuang,
            findScheduledProctorsForRoomAndDay(
              room.nomorRuang,
              jadwal.hariTanggal,
              panitiaList,
              proctorSlots
            )
          );
        }

        pages.push({
          pageKey: `${jadwal.id}::${room.nomorRuang}`,
          room,
          jadwal,
          eligibleStudents,
          resolvedTime: resolved.waktu || jadwal.waktu,
          suggestedProctors: suggestedMap.get(room.nomorRuang) || []
        });
      });
    });

    return pages;
  }, [
    activeJadwalItems,
    filteredRooms,
    jadwalList,
    sharedJadwalRows,
    ujianSettings.sesiTersedia,
    ujianSettings.sinkronWaktuJadwalDenganSesi,
    panitiaList,
    proctorSlots
  ]);

  const setSiswaMark = (jadwalId: string, siswaId: string, code: SiswaHadirCode) => {
    const slotKey = jadwalId || 'BLANKO';
    const currSlot = marks.siswaStatus[slotKey] || {};
    const nextSlot = { ...currSlot, [siswaId]: code };
    updateMarks({
      ...marks,
      siswaStatus: {
        ...marks.siswaStatus,
        [slotKey]: nextSlot
      }
    });
  };

  const markAllStudentsInRoomHadir = (jadwalId: string, students: Siswa[]) => {
    const slotKey = jadwalId || 'BLANKO';
    const currSlot = { ...(marks.siswaStatus[slotKey] || {}) };
    students.forEach(s => {
      currSlot[s.id] = 'H';
    });
    updateMarks({
      ...marks,
      siswaStatus: {
        ...marks.siswaStatus,
        [slotKey]: currSlot
      }
    });
    showToast(`Seluruh ${students.length} peserta pada ruang ini ditandai Hadir (H).`);
  };

  const handleCommitRoomsToKartuUjian = () => {
    if (!onUpdateSiswa) return;
    const updated = siswaList.map(s => {
      const assigned = matchedDistribution.studentMap.get(s.id);
      if (!assigned) return s;
      return {
        ...s,
        nomorUjian: assigned.nomorUjian,
        ruangUjian: assigned.ruangUjian,
        sesiUjian: assigned.sesiUjian
      };
    });
    onUpdateSiswa(updated);
    appendAuditLog(
      'SINKRON_RUANG_DARI_DAFTAR_HADIR',
      `Menyimpan pembagian ${matchedDistribution.rooms.length} ruang dan nomor peserta ke data master ${updated.length} siswa sesuai setting Kartu Peserta Ulangan.`
    );
    showToast(
      `Berhasil menyimpan ${matchedDistribution.rooms.length} ruang (${matchedDistribution.totalActiveStudents} siswa) ke Kartu Peserta Ulangan.`
    );
  };

  // ==================== PENGAWAS DATA & STATE ====================
  const pengawasOnly = useMemo(
    () => panitiaList.filter(p => p.kategori === 'pengawas'),
    [panitiaList]
  );

  const [pengawasSubMode, setPengawasSubMode] = useState<PengawasSubMode>('per_slot');
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    proctorSlots[0]?.id || 's01'
  );
  const [pengawasSlotFilter, setPengawasSlotFilter] = useState<'jaga_cad' | 'jaga_only' | 'semua'>(
    'jaga_cad'
  );
  const [selectedPengawasId, setSelectedPengawasId] = useState<string>(
    pengawasOnly[0]?.id || 'ALL'
  );

  useEffect(() => {
    if (
      selectedSlotId !== 'ALL_SLOTS' &&
      !proctorSlots.some(s => s.id === selectedSlotId)
    ) {
      setSelectedSlotId(proctorSlots[0]?.id || 's01');
    }
  }, [proctorSlots, selectedSlotId]);

  useEffect(() => {
    if (
      selectedPengawasId !== 'ALL' &&
      !pengawasOnly.some(p => p.id === selectedPengawasId)
    ) {
      setSelectedPengawasId(pengawasOnly[0]?.id || 'ALL');
    }
  }, [pengawasOnly, selectedPengawasId]);

  const activePengawasSlots = useMemo(() => {
    if (selectedSlotId === 'ALL_SLOTS') return proctorSlots;
    const found = proctorSlots.find(s => s.id === selectedSlotId);
    return found ? [found] : proctorSlots.slice(0, 1);
  }, [selectedSlotId, proctorSlots]);

  const buildPengawasRowsForSlot = (slot: JadwalPengawasSlot) => {
    const rows = pengawasOnly
      .map(item => {
        const assignment = (item.jadwalMengawas?.[slot.id] || '').trim() || 'OFF';
        const isOff = /^off$/i.test(assignment);
        const isCad = /^cad/i.test(assignment);
        return {
          item,
          assignment,
          isOff,
          isCad,
          isJaga: !isOff && !isCad
        };
      })
      .filter(r => {
        if (pengawasSlotFilter === 'jaga_only') return r.isJaga;
        if (pengawasSlotFilter === 'jaga_cad') return !r.isOff;
        return true;
      })
      .sort((a, b) => {
        const rank = (x: typeof a) => (x.isJaga ? 0 : x.isCad ? 1 : 2);
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        if (a.isJaga && b.isJaga) {
          return (
            extractRoomOrderNumber(a.assignment) - extractRoomOrderNumber(b.assignment) ||
            a.assignment.localeCompare(b.assignment)
          );
        }
        if (a.isCad && b.isCad) {
          return a.assignment.localeCompare(b.assignment, undefined, { numeric: true });
        }
        return a.item.nama.localeCompare(b.item.nama);
      });
    return rows;
  };

  const setPengawasMark = (
    slotId: string,
    pengawasId: string,
    patch: Partial<{ status: PengawasHadirCode; jamHadir: string; catatan: string }>
  ) => {
    const currSlot = marks.pengawasMarks[slotId] || {};
    const prevRow = currSlot[pengawasId] || { status: '', jamHadir: '', catatan: '' };
    updateMarks({
      ...marks,
      pengawasMarks: {
        ...marks.pengawasMarks,
        [slotId]: {
          ...currSlot,
          [pengawasId]: {
            ...prevRow,
            ...patch
          }
        }
      }
    });
  };

  const markAllPengawasSlotHadir = (slot: JadwalPengawasSlot) => {
    const rows = buildPengawasRowsForSlot(slot);
    const currSlot = { ...(marks.pengawasMarks[slot.id] || {}) };
    const defaultArrival = (slot.waktu || '').split('-')[0]?.trim() || '06.45';
    rows.forEach(r => {
      if (!r.isOff) {
        currSlot[r.item.id] = {
          status: 'Hadir',
          jamHadir: currSlot[r.item.id]?.jamHadir || defaultArrival,
          catatan: currSlot[r.item.id]?.catatan || ''
        };
      }
    });
    updateMarks({
      ...marks,
      pengawasMarks: {
        ...marks.pengawasMarks,
        [slot.id]: currSlot
      }
    });
    showToast(`Pengawas aktif pada ${slot.hari} (${slot.sesiLabel}) ditandai Hadir.`);
  };

  // Switch recommended orientation automatically for wide matrix views
  const handleChangeMainTab = (tab: MainTab) => {
    setMainTab(tab);
    if (tab === 'siswa' && siswaSubMode === 'rekap_hari') {
      setOrientation('landscape');
    } else if (tab === 'pengawas' && pengawasSubMode === 'matriks') {
      setOrientation('landscape');
    } else {
      setOrientation('portrait');
    }
  };

  const handlePrint = () => {
    window.print();
    appendAuditLog(
      mainTab === 'siswa' ? 'CETAK_DAFTAR_HADIR_SISWA' : 'CETAK_DAFTAR_HADIR_PENGAWAS',
      `Mencetak ${mainTab === 'siswa' ? 'Daftar Hadir Ulangan Siswa' : 'Daftar Hadir Pengawas Ruang'} (${paperSize} ${orientation}) oleh ${currentUser.name}.`
    );
  };

  const handleExportExcel = () => {
    if (mainTab === 'siswa') {
      const firstJadwal = activeJadwalItems[0];
      const statusMap = firstJadwal ? marks.siswaStatus[firstJadwal.id] || {} : {};
      const roomsPayload =
        siswaHarianPages.length > 0
          ? siswaHarianPages.map(p => ({
              nomorRuang: p.room.nomorRuang,
              tingkatKelas: p.room.tingkatKelas,
              sesiUjian: p.room.sesiUjian,
              students: p.eligibleStudents
            }))
          : filteredRooms;
      exportDaftarHadirSiswaExcel({
        namaUjian: ujianSettings.namaUjian || 'PENILAIAN SUMATIF AKHIR SEMESTER',
        jadwalLabel: firstJadwal
          ? `${firstJadwal.hariTanggal} (${firstJadwal.waktu}) - ${firstJadwal.mataPelajaran}`
          : 'Semua Jadwal',
        rooms: roomsPayload,
        statusMap
      });
      showToast('Berkas Excel Daftar Hadir Siswa berhasil diunduh.');
    } else {
      const slot = activePengawasSlots[0] || proctorSlots[0];
      if (!slot) return;
      const rows = buildPengawasRowsForSlot(slot).map(r => {
        const mk = marks.pengawasMarks[slot.id]?.[r.item.id];
        return {
          item: r.item,
          assignment: r.assignment,
          status: mk?.status || '',
          jamHadir: mk?.jamHadir || '',
          catatan: mk?.catatan || ''
        };
      });
      exportDaftarHadirPengawasExcel({
        namaUjian: panitiaSettings.namaUjian || ujianSettings.namaUjian || 'PSAS',
        slot,
        rows
      });
      showToast('Berkas Excel Daftar Hadir Pengawas berhasil diunduh.');
    }
  };

  const pageWidthMm =
    orientation === 'landscape'
      ? paperSize === 'F4'
        ? 330
        : 297
      : paperSize === 'F4'
        ? 215
        : 210;

  const pageMinHeightMm =
    orientation === 'landscape'
      ? paperSize === 'F4'
        ? 215
        : 210
      : paperSize === 'F4'
        ? 330
        : 297;

  const printPageCssSize =
    paperSize === 'F4'
      ? orientation === 'landscape'
        ? '330mm 215mm'
        : '215mm 330mm'
      : `A4 ${orientation}`;

  const kepsekName = profile.kepalaSekolah || 'Hj. Kurniawati, M.Pd';
  const kepsekNip = profile.nipKepalaSekolah || '197203251997032003';
  const printCity = (profile.kota || 'Surabaya').replace(/^Kota\s+/i, '');
  const printDateStr = ujianSettings.kotaTanggalCetak || 'Surabaya, 20 November 2026';

  const ttdUrl = panitiaSettings.ttdKsUrl || ujianSettings.ttdKsUrl;
  const stempelUrl = panitiaSettings.stempelUrl || ujianSettings.stempelUrl;

  const activePengawasListForIndividual = useMemo(() => {
    if (selectedPengawasId === 'ALL') return pengawasOnly;
    const found = pengawasOnly.find(p => p.id === selectedPengawasId);
    return found ? [found] : pengawasOnly.slice(0, 1);
  }, [pengawasOnly, selectedPengawasId]);

  const siePengawasanName =
    panitiaList.find(
      p =>
        p.kategori === 'panitia' &&
        /ruang|pengawas|kepengawasan|sekretaris|ketua/i.test(p.jabatanKepanitiaan)
    )?.nama ||
    panitiaList.find(p => p.kategori === 'panitia')?.nama ||
    'Koordinator Sie Ruang & Kepengawasan';

  const spMeta = resolvePrintSpacingMeta(typography.lineSpacing);
  const textScale = (typography.fontScalePct || 100) / 100;
  const typoStyleVars = getPrintTypographyStyleVars(typography);
  const fs = (basePx: number) => `${(basePx * textScale).toFixed(1)}px`;

  return (
    <div className="space-y-5 pb-12 print:space-y-0 print:pb-0">
      {/* Dynamic Print Styles */}
      <style>{`
        ${getScopedPrintTypographyCss('.dh-sheet-scope')}
        @media print {
          @page {
            size: ${printPageCssSize};
            margin: 10mm 12mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dh-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: ${pageMinHeightMm - 22}mm !important;
            break-after: page;
            page-break-after: always;
          }
          .dh-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .dh-preview-wrapper {
            zoom: 1 !important;
            transform: none !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Inline Toast Feedback */}
      {toastMsg && (
        <div className="no-print print:hidden fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Main Segmented Switch */}
      <div className="no-print print:hidden bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Daftar Hadir Ulangan Siswa & Pengawas Ruang
                </h1>
                <p className="text-xs text-slate-500">
                  Ruang, nomor peserta & sesi otomatis selaras dengan Kartu Peserta Ulangan serta jadwal mengawas panitia.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Segmented Control */}
            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => handleChangeMainTab('siswa')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                  mainTab === 'siswa'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Daftar Hadir Siswa ({matchedDistribution.rooms.length} Ruang)</span>
              </button>
              <button
                onClick={() => handleChangeMainTab('pengawas')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
                  mainTab === 'pengawas'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Daftar Hadir Pengawas ({pengawasOnly.length} Org)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Sync Status Strip */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {mainTab === 'siswa' ? (
            <>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-slate-700 tabular-nums">
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <DoorOpen className="w-3.5 h-3.5 text-blue-600" />
                  Sinkron Kartu Peserta Ulangan
                </span>
                <span>
                  Ruang: <strong className="text-slate-900">{matchedDistribution.rooms.length} Ruang</strong>
                </span>
                <span>
                  Peserta Aktif: <strong className="text-slate-900">{matchedDistribution.totalActiveStudents} Siswa</strong>
                </span>
                <span>
                  Kapasitas: <strong className="text-slate-900">{ujianSettings.kapasitasPerRuang || 20}/ruang</strong>
                </span>
                <span>
                  Mode:{' '}
                  <strong className="text-slate-900">
                    {ujianSettings.modePembagianRuang === 'per_kelas'
                      ? 'Per Kelas'
                      : ujianSettings.modePembagianRuang === 'per_sesi'
                        ? 'Per Sesi'
                        : 'Berurutan'}
                  </strong>
                </span>
                <span className="text-slate-500">
                  ({matchedDistribution.savedRoomStudentCount > 0
                    ? `${matchedDistribution.savedRoomStudentCount} tersimpan di siswa`
                    : 'Proyeksi otomatis dari setting Kartu Ujian'})
                </span>
              </div>

              {onUpdateSiswa && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsRoomGroupModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Atur Kelompok Anak per Ruang</span>
                  </button>
                  <button
                    onClick={handleCommitRoomsToKartuUjian}
                    className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Simpan Ruang ke Master Siswa</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-slate-700 tabular-nums">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Sinkron Matriks Jadwal Pengawas Panitia
              </span>
              <span>
                Total Sesi Jadwal: <strong className="text-slate-900">{proctorSlots.length} Sesi</strong>
              </span>
              <span>
                Pengawas Ruang: <strong className="text-slate-900">{pengawasOnly.length} Guru</strong>
              </span>
              <span className="text-slate-500">
                Kegiatan: <strong className="text-slate-800">{panitiaSettings.namaUjian || ujianSettings.namaUjian}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Control & Print Toolbar */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1 items-end">
          {mainTab === 'siswa' ? (
            <>
              {/* Mode Daftar Hadir Siswa */}
              <div className="xl:col-span-3 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Format Dokumen Siswa
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => {
                      setSiswaSubMode('harian');
                      setOrientation('portrait');
                    }}
                    className={`px-2 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      siswaSubMode === 'harian'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Jadwal & Ruang
                  </button>
                  <button
                    onClick={() => {
                      setSiswaSubMode('rekap_hari');
                      setOrientation('landscape');
                    }}
                    className={`px-2 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      siswaSubMode === 'rekap_hari'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rekap Multi-Hari
                  </button>
                </div>
              </div>

              {/* Jadwal Ujian Selector */}
              {siswaSubMode === 'harian' && (
                <div className="xl:col-span-4 space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Jadwal Mata Pelajaran (Dari Kartu Ujian)
                  </label>
                  <select
                    value={selectedJadwalId}
                    onChange={e => setSelectedJadwalId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {jadwalList.map((j, i) => (
                      <option key={j.id} value={j.id}>
                        {i + 1}. {j.hariTanggal} · {j.waktu} — {j.mataPelajaran}
                        {j.kondisiTarget && j.kondisiTarget !== 'Semua'
                          ? ` [${j.kondisiTarget}: ${j.kondisiNilai}]`
                          : ''}
                      </option>
                    ))}
                    <option value="BLANKO">Formulir Blanko Kosong (Isi Manual)</option>
                    {selectedRoomCode !== 'ALL' && (
                      <option value="ALL">
                        Semua {jadwalList.length} Jadwal Ujian (Cetak Massal Ruang Terpilih)
                      </option>
                    )}
                  </select>
                </div>
              )}

              {/* Tingkat & Ruang Filter */}
              <div className={`${siswaSubMode === 'harian' ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-1`}>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Filter Tingkat
                </label>
                <select
                  value={filterTingkat}
                  onChange={e => {
                    setFilterTingkat(e.target.value as any);
                    setSelectedRoomCode('ALL');
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SEMUA">Semua Tingkat ({matchedDistribution.rooms.length} R)</option>
                  <option value="X">Tingkat X</option>
                  <option value="XI">Tingkat XI</option>
                  <option value="XII">Tingkat XII</option>
                  <option value="Gabungan">Gabungan</option>
                </select>
              </div>

              <div className={`${siswaSubMode === 'harian' ? 'xl:col-span-3' : 'xl:col-span-6'} space-y-1`}>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Pilih Ruang Ujian
                </label>
                <select
                  value={selectedRoomCode}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedRoomCode(val);
                    if (val === 'ALL' && selectedJadwalId === 'ALL') {
                      setSelectedJadwalId(jadwalList[0]?.id || 'BLANKO');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">
                    Semua Ruang Terfilter ({matchedDistribution.rooms.filter(r => filterTingkat === 'SEMUA' || r.tingkatKelas === filterTingkat).length} Ruang)
                  </option>
                  {matchedDistribution.rooms
                    .filter(r => filterTingkat === 'SEMUA' || r.tingkatKelas === filterTingkat)
                    .map(r => (
                      <option key={r.nomorRuang} value={r.nomorRuang}>
                        {r.labelUtama} · Tingkat {r.tingkatKelas} ({r.jumlahPeserta} Siswa — {r.kelasRombel})
                      </option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Mode Daftar Hadir Pengawas */}
              <div className="xl:col-span-4 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                  Mode Daftar Hadir Pengawas
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => {
                      setPengawasSubMode('per_slot');
                      setOrientation('portrait');
                    }}
                    className={`px-2 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      pengawasSubMode === 'per_slot'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Sesi Jadwal
                  </button>
                  <button
                    onClick={() => {
                      setPengawasSubMode('per_pengawas');
                      setOrientation('portrait');
                    }}
                    className={`px-2 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      pengawasSubMode === 'per_pengawas'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Per Pengawas
                  </button>
                  <button
                    onClick={() => {
                      setPengawasSubMode('matriks');
                      setOrientation('landscape');
                    }}
                    className={`px-2 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      pengawasSubMode === 'matriks'
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Matriks Lengkap
                  </button>
                </div>
              </div>

              {pengawasSubMode === 'per_slot' && (
                <>
                  <div className="xl:col-span-5 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      Pilih Sesi Jadwal Mengawas
                    </label>
                    <select
                      value={selectedSlotId}
                      onChange={e => setSelectedSlotId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {proctorSlots.map((sl, i) => (
                        <option key={sl.id} value={sl.id}>
                          Sesi #{i + 1}: {sl.hari}, {sl.tanggal} · {sl.sesiLabel} ({sl.waktu}) — {sl.mapel}
                        </option>
                      ))}
                      <option value="ALL_SLOTS">
                        Cetak Massal Semua {proctorSlots.length} Sesi Jadwal Mengawas
                      </option>
                    </select>
                  </div>

                  <div className="xl:col-span-3 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      Tampilkan Pengawas
                    </label>
                    <select
                      value={pengawasSlotFilter}
                      onChange={e => setPengawasSlotFilter(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="jaga_cad">Jaga Ruang + Cadangan (Resmi)</option>
                      <option value="jaga_only">Hanya Pengawas Jaga Ruang</option>
                      <option value="semua">Semua Pengawas (Termasuk OFF)</option>
                    </select>
                  </div>
                </>
              )}

              {pengawasSubMode === 'per_pengawas' && (
                <div className="xl:col-span-8 space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                    Pilih Nama Pengawas Ruang
                  </label>
                  <select
                    value={selectedPengawasId}
                    onChange={e => setSelectedPengawasId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pengawasOnly.map((p, idx) => (
                      <option key={p.id} value={p.id}>
                        {idx + 1}. {p.nama} ({p.nomorTugas})
                      </option>
                    ))}
                    <option value="ALL">Cetak Massal Semua {pengawasOnly.length} Pengawas Ruang</option>
                  </select>
                </div>
              )}

              {pengawasSubMode === 'matriks' && (
                <div className="xl:col-span-8 flex items-center text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2">
                  Menampilkan matriks rekapitulasi {pengawasOnly.length} pengawas pada {proctorSlots.length} sesi ujian lengkap dengan kolom verifikasi kehadiran & jumlah JAGA/CAD/OFF.
                </div>
              )}
            </>
          )}
        </div>

        {/* Manual Blanko inputs if BLANKO */}
        {mainTab === 'siswa' && siswaSubMode === 'harian' && selectedJadwalId === 'BLANKO' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-amber-50/60 border border-amber-200 rounded-lg p-3">
            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Hari / Tanggal (Blanko)
              </label>
              <input
                type="text"
                value={manualBlankoHari}
                onChange={e => setManualBlankoHari(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Waktu Ujian
              </label>
              <input
                type="text"
                value={manualBlankoWaktu}
                onChange={e => setManualBlankoWaktu(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                Mata Pelajaran
              </label>
              <input
                type="text"
                value={manualBlankoMapel}
                onChange={e => setManualBlankoMapel(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-xs"
              />
            </div>
          </div>
        )}

        {/* Print & Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            {/* Paper size */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {(['F4', 'A4'] as PaperSize[]).map(sz => (
                <button
                  key={sz}
                  onClick={() => setPaperSize(sz)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    paperSize === sz ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  {sz === 'F4' ? 'F4 / Folio' : 'A4'}
                </button>
              ))}
            </div>

            {/* Orientation */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {(['portrait', 'landscape'] as PrintOrientation[]).map(ori => (
                <button
                  key={ori}
                  onClick={() => setOrientation(ori)}
                  className={`px-2.5 py-1 rounded-md font-semibold capitalize transition-colors ${
                    orientation === ori ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  {ori === 'portrait' ? 'Potret' : 'Lanskap'}
                </button>
              ))}
            </div>

            {/* Toggles */}
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeMarksOnPrint}
                onChange={e => setIncludeMarksOnPrint(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Cetak Isian Kehadiran</span>
            </label>

            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDigitalTtd}
                onChange={e => setIncludeDigitalTtd(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>Sertakan TTD & Stempel Digital</span>
            </label>

            <PrintTypographyBar
              value={typography}
              onChange={setTypography}
              previewZoomPct={previewZoom}
              onPreviewZoomChange={setPreviewZoom}
              zoomPresets={[50, 65, 85, 100]}
              compact
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>
                Cetak (
                {mainTab === 'siswa'
                  ? siswaSubMode === 'harian'
                    ? `${siswaHarianPages.length} Lembar`
                    : `${filteredRooms.length} Lembar`
                  : pengawasSubMode === 'per_slot'
                    ? `${activePengawasSlots.length} Lembar`
                    : pengawasSubMode === 'per_pengawas'
                      ? `${activePengawasListForIndividual.length} Lembar`
                      : '1 Lembar'}
                )
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== PRINTABLE PREVIEW AREA ==================== */}
      <div
        id="daftar-hadir-print-area"
        className="w-full overflow-x-auto pb-4 print:overflow-visible print:pb-0"
      >
        <div
          className="dh-preview-wrapper mx-auto w-fit flex flex-col items-center gap-6 print:block print:gap-0 print:w-full"
          style={{
            zoom: previewZoom / 100
          }}
        >
          {/* TAB 1: DAFTAR HADIR SISWA — PER JADWAL & RUANG */}
          {mainTab === 'siswa' &&
            siswaSubMode === 'harian' &&
            (siswaHarianPages.length === 0 ? (
              <div className="no-print bg-white border border-slate-200 rounded-xl p-10 text-center max-w-xl">
                <DoorOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">
                  Tidak Ada Peserta yang Cocok Pada Filter Ruang / Jadwal Ini
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Jadwal mata pelajaran terpilih mungkin memiliki syarat kondisi kelas/sesi khusus yang tidak terdapat pada ruang filter saat ini.
                </p>
              </div>
            ) : (
              siswaHarianPages.map(page => {
                const slotMarks = marks.siswaStatus[page.jadwal.id] || {};
                const presentCount = page.eligibleStudents.filter(
                  s => slotMarks[s.id] === 'H'
                ).length;
                const sickCount = page.eligibleStudents.filter(
                  s => slotMarks[s.id] === 'S'
                ).length;
                const permitCount = page.eligibleStudents.filter(
                  s => slotMarks[s.id] === 'I'
                ).length;
                const alphaCount = page.eligibleStudents.filter(
                  s => slotMarks[s.id] === 'A'
                ).length;

                const overrideKey = `${page.jadwal.hariTanggal}::${page.room.nomorRuang}`;
                const ov = pengawasOverride[overrideKey];
                const defaultP1 = page.suggestedProctors[0];
                const defaultP2 = page.suggestedProctors[1];
                const p1Name =
                  ov?.p1Name ?? defaultP1?.nama ?? '..................................................';
                const p1Nip = ov?.p1Nip ?? (defaultP1?.nip ? `NIP. ${defaultP1.nip}` : 'NIP. ...................................');
                const p2Name =
                  ov?.p2Name ?? defaultP2?.nama ?? '..................................................';
                const p2Nip = ov?.p2Nip ?? (defaultP2?.nip ? `NIP. ${defaultP2.nip}` : 'NIP. ...................................');

                const showTwoProctors = page.suggestedProctors.length > 1 || Boolean(ov?.p2Name);

                return (
                  <section
                    key={page.pageKey}
                    className="dh-sheet dh-sheet-scope bg-white text-black border border-slate-300 shadow-md flex flex-col justify-between print:shadow-none print:border-none"
                    style={{
                      ...typoStyleVars,
                      width: `${pageWidthMm}mm`,
                      minHeight: `${pageMinHeightMm}mm`,
                      padding: '11mm 14mm'
                    }}
                  >
                    <div>
                    {/* Interactive Screen Bar per Room (hidden on print) */}
                    <div className="no-print print:hidden mb-3 pb-2 border-b border-dashed border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 px-3 py-2 rounded-lg">
                      <div className="flex flex-wrap items-center gap-2 text-slate-700">
                        <span className="font-bold text-slate-900">{page.room.labelUtama}</span>
                        <span>· {page.eligibleStudents.length} Peserta</span>
                        {page.suggestedProctors.length > 0 && (
                          <span className="text-emerald-700 font-medium">
                            · Pengawas Jadwal:{' '}
                            {page.suggestedProctors.map(p => p.nama).join(' & ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            markAllStudentsInRoomHadir(page.jadwal.id, page.eligibleStudents)
                          }
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Tandai Semua Hadir</span>
                        </button>
                      </div>
                    </div>

                    <OfficialKopSurat profile={profile} compact />

                    <div className="text-center mb-3">
                      <h2
                        className="font-black uppercase tracking-wide text-black"
                        style={{ fontSize: fs(14) }}
                      >
                        DAFTAR HADIR PESERTA ULANGAN
                      </h2>
                      <p className="font-bold uppercase text-slate-900" style={{ fontSize: fs(11.5) }}>
                        {ujianSettings.namaUjian || 'PENILAIAN SUMATIF AKHIR SEMESTER'} · TAHUN PELAJARAN{' '}
                        {ujianSettings.tahunPelajaran || '2026/2027'}
                      </p>
                    </div>

                    {/* Metadata Grid */}
                    <div
                      className="pt-meta-grid grid grid-cols-2 gap-x-6 mb-3 border border-black px-3 py-2 bg-slate-50/40 print:bg-transparent"
                      style={{ fontSize: fs(11), lineHeight: spMeta.lineHeight }}
                    >
                      <div className="grid grid-cols-[112px_8px_1fr]">
                        <span className="font-semibold">Ruang Ujian</span>
                        <span>:</span>
                        <span className="font-bold">
                          {page.room.labelUtama} (Tingkat {page.room.tingkatKelas})
                        </span>
                      </div>
                      <div className="grid grid-cols-[112px_8px_1fr]">
                        <span className="font-semibold">Hari / Tanggal</span>
                        <span>:</span>
                        <span className="font-bold">{page.jadwal.hariTanggal}</span>
                      </div>
                      <div className="grid grid-cols-[112px_8px_1fr]">
                        <span className="font-semibold">Kelas / Rombel</span>
                        <span>:</span>
                        <span>{page.room.kelasRombel}</span>
                      </div>
                      <div className="grid grid-cols-[112px_8px_1fr]">
                        <span className="font-semibold">Waktu / Pukul</span>
                        <span>:</span>
                        <span className="font-bold tabular-nums">{page.resolvedTime}</span>
                      </div>
                      <div className="grid grid-cols-[112px_8px_1fr]">
                        <span className="font-semibold">Jumlah Peserta</span>
                        <span>:</span>
                        <span className="tabular-nums font-semibold">
                          {page.eligibleStudents.length} Peserta Didik
                        </span>
                      </div>
                      <div className="grid grid-cols-[112px_8px_1fr]">
                        <span className="font-semibold">Mata Pelajaran</span>
                        <span>:</span>
                        <span className="font-bold uppercase">{page.jadwal.mataPelajaran}</span>
                      </div>
                    </div>

                    {/* Attendance Table */}
                    <table
                      className="pt-table w-full border-collapse border border-black"
                      style={{ fontSize: fs(10.5) }}
                    >
                      <thead>
                        <tr className="bg-slate-100 print:bg-slate-100 text-black font-bold text-center">
                          <th className="border border-black px-1.5 py-1.5 w-8">No</th>
                          <th className="border border-black px-2 py-1.5 w-28">No. Peserta</th>
                          <th className="border border-black px-1.5 py-1.5 w-16">NIS</th>
                          <th className="border border-black px-2 py-1.5 text-left">
                            Nama Peserta Didik
                          </th>
                          <th className="border border-black px-2 py-1.5 w-20">Kelas</th>
                          <th className="border border-black px-1.5 py-1.5 w-24 no-print print:hidden">
                            Status (H/S/I/A)
                          </th>
                          {includeMarksOnPrint && (
                            <th className="border border-black px-1.5 py-1.5 w-14 hidden print:table-cell">
                              Status
                            </th>
                          )}
                          <th className="border border-black px-2 py-1.5 w-44" colSpan={2}>
                            Tanda Tangan Peserta
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {page.eligibleStudents.map((siswa, idx) => {
                          const num = idx + 1;
                          const isOdd = num % 2 === 1;
                          const currMark = slotMarks[siswa.id] || '';
                          return (
                            <tr key={siswa.id} className="leading-tight">
                              <td className="border border-black px-1.5 py-1.5 text-center tabular-nums">
                                {num}
                              </td>
                              <td className="border border-black px-2 py-1.5 text-center font-mono text-[10px] tabular-nums">
                                {siswa.nomorUjian || '-'}
                              </td>
                              <td className="border border-black px-1.5 py-1.5 text-center tabular-nums">
                                {siswa.nis || siswa.nipd || '-'}
                              </td>
                              <td className="border border-black px-2 py-1.5 font-medium">
                                {siswa.nama}
                              </td>
                              <td className="border border-black px-2 py-1.5 text-center">
                                {siswa.rombelSaatIni || siswa.kelas}
                              </td>
                              {/* Interactive status buttons on screen */}
                              <td className="border border-black px-1 py-1 text-center no-print print:hidden">
                                <div className="inline-flex gap-0.5">
                                  {(['H', 'S', 'I', 'A'] as const).map(code => (
                                    <button
                                      key={code}
                                      type="button"
                                      onClick={() =>
                                        setSiswaMark(
                                          page.jadwal.id,
                                          siswa.id,
                                          currMark === code ? '' : code
                                        )
                                      }
                                      className={`w-5 h-5 rounded text-[9.5px] font-bold transition-colors ${
                                        currMark === code
                                          ? code === 'H'
                                            ? 'bg-emerald-600 text-white'
                                            : code === 'S'
                                              ? 'bg-amber-500 text-white'
                                              : code === 'I'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-rose-600 text-white'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {code}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              {includeMarksOnPrint && (
                                <td className="border border-black px-1.5 py-1.5 text-center font-bold hidden print:table-cell">
                                  {currMark || ''}
                                </td>
                              )}
                              {/* Zig-Zag 2-column Signature */}
                              <td className="border border-black px-2 py-1.5 w-24 align-middle" style={{ fontSize: fs(9.5) }}>
                                {isOdd ? (
                                  <div className="flex items-end gap-1.5 w-full">
                                    <span className="tabular-nums font-medium shrink-0">{num}.</span>
                                    <span className="flex-1 border-b border-dotted border-slate-500 h-2.5" />
                                  </div>
                                ) : (
                                  ''
                                )}
                              </td>
                              <td className="border border-black px-2 py-1.5 w-24 align-middle" style={{ fontSize: fs(9.5) }}>
                                {!isOdd ? (
                                  <div className="flex items-end gap-1.5 w-full">
                                    <span className="tabular-nums font-medium shrink-0">{num}.</span>
                                    <span className="flex-1 border-b border-dotted border-slate-500 h-2.5" />
                                  </div>
                                ) : (
                                  ''
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>

                    {/* Footer: Rekap Kehadiran + Pengawas TTD */}
                    <div
                      className="mt-4 pt-2 grid grid-cols-12 gap-4 items-start"
                      style={{ fontSize: fs(10.5), lineHeight: spMeta.lineHeight }}
                    >
                      {/* Rekap Box */}
                      <div className="col-span-5 border border-black p-2.5">
                        <p className="font-bold uppercase mb-1.5 border-b border-black pb-1" style={{ fontSize: fs(10) }}>
                          Rekapitulasi Kehadiran Peserta
                        </p>
                        <div className="space-y-1.5 tabular-nums" style={{ fontSize: fs(10) }}>
                          <div className="flex justify-between items-baseline">
                            <span>Jumlah Peserta Terdaftar</span>
                            <span className="font-bold">{page.eligibleStudents.length} Orang</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span>Jumlah Peserta Hadir</span>
                            <span>
                              {includeMarksOnPrint ? (
                                <strong>{presentCount} Orang</strong>
                              ) : (
                                <span className="inline-flex items-baseline gap-1">
                                  <span className="inline-block w-12 border-b border-dotted border-slate-600" />
                                  <span>Orang</span>
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span>Tidak Hadir (S / I / A)</span>
                            <span>
                              {includeMarksOnPrint ? (
                                <strong>{sickCount + permitCount + alphaCount} Orang</strong>
                              ) : (
                                <span className="inline-flex items-baseline gap-1">
                                  <span className="inline-block w-12 border-b border-dotted border-slate-600" />
                                  <span>Orang</span>
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="pt-1 border-t border-dotted border-slate-400 text-slate-700 flex items-baseline gap-1.5" style={{ fontSize: fs(9.5) }}>
                            <span className="shrink-0">No. Peserta Tidak Hadir:</span>
                            <span className="flex-1 border-b border-dotted border-slate-500 h-2.5" />
                          </div>
                        </div>
                      </div>

                      {/* Signature Block */}
                      <div className="col-span-7 grid grid-cols-2 gap-3 text-center">
                        <div>
                          <p className="text-[10px]">
                            {showTwoProctors ? 'Pengawas Ruang 1,' : 'Pengawas Ruang,'}
                          </p>
                          <div className="h-14" />
                          <input
                            type="text"
                            value={p1Name}
                            onChange={e =>
                              setPengawasOverride(prev => ({
                                ...prev,
                                [overrideKey]: {
                                  p1Name: e.target.value,
                                  p1Nip: prev[overrideKey]?.p1Nip ?? p1Nip,
                                  p2Name: prev[overrideKey]?.p2Name ?? p2Name,
                                  p2Nip: prev[overrideKey]?.p2Nip ?? p2Nip
                                }
                              }))
                            }
                            className="w-full text-center font-bold underline bg-transparent border-none focus:outline-none focus:bg-amber-50 text-[10.5px]"
                          />
                          <p className="text-[9.5px]">{p1Nip}</p>
                        </div>

                        {showTwoProctors ? (
                          <div>
                            <p className="text-[10px]">Pengawas Ruang 2,</p>
                            <div className="h-14" />
                            <input
                              type="text"
                              value={p2Name}
                              onChange={e =>
                                setPengawasOverride(prev => ({
                                  ...prev,
                                  [overrideKey]: {
                                    p1Name: prev[overrideKey]?.p1Name ?? p1Name,
                                    p1Nip: prev[overrideKey]?.p1Nip ?? p1Nip,
                                    p2Name: e.target.value,
                                    p2Nip: prev[overrideKey]?.p2Nip ?? p2Nip
                                  }
                                }))
                              }
                              className="w-full text-center font-bold underline bg-transparent border-none focus:outline-none focus:bg-amber-50 text-[10.5px]"
                            />
                            <p className="text-[9.5px]">{p2Nip}</p>
                          </div>
                        ) : (
                          <div className="relative">
                            <p className="text-[10px]">{printDateStr}</p>
                            <p className="text-[10px] font-semibold">Kepala {profile.namaSekolah},</p>
                            <div className="h-14 relative flex items-center justify-center">
                              {includeDigitalTtd && (
                                <>
                                  {stempelUrl ? (
                                    <img
                                      src={stempelUrl}
                                      alt="Stempel Sekolah"
                                      className="w-16 h-16 object-contain absolute left-1 opacity-80"
                                    />
                                  ) : (
                                    <SchoolStampSvg className="w-16 h-16 absolute left-1 opacity-80" />
                                  )}
                                  {ttdUrl ? (
                                    <img
                                      src={ttdUrl}
                                      alt="TTD Kepala Sekolah"
                                      className="h-12 object-contain relative z-10"
                                    />
                                  ) : (
                                    <KepalaSekolahSignatureSvg className="w-24 h-10 relative z-10" />
                                  )}
                                </>
                              )}
                            </div>
                            <p className="font-bold underline text-[10.5px]">{kepsekName}</p>
                            <p className="text-[9.5px]">NIP. {kepsekNip}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })
            ))}

          {/* TAB 1 SUBMODE 2: REKAP MULTI-HARI PER RUANG */}
          {mainTab === 'siswa' &&
            siswaSubMode === 'rekap_hari' &&
            filteredRooms.map(room => (
              <section
                key={`rekap-${room.nomorRuang}`}
                className="dh-sheet dh-sheet-scope bg-white text-black border border-slate-300 shadow-md flex flex-col justify-between print:shadow-none print:border-none"
                style={{
                  ...typoStyleVars,
                  width: `${pageWidthMm}mm`,
                  minHeight: `${pageMinHeightMm}mm`,
                  padding: '10mm 12mm'
                }}
              >
                <div>
                <OfficialKopSurat profile={profile} compact />
                <div className="text-center mb-2.5">
                  <h2
                    className="font-black uppercase tracking-wide"
                    style={{ fontSize: fs(13.5) }}
                  >
                    REKAPITULASI DAFTAR HADIR PESERTA ULANGAN ({room.labelUtama})
                  </h2>
                  <p className="font-bold" style={{ fontSize: fs(11) }}>
                    {ujianSettings.namaUjian} · Tahun Pelajaran {ujianSettings.tahunPelajaran} · Tingkat{' '}
                    {room.tingkatKelas} ({room.kelasRombel})
                  </p>
                </div>

                <table
                  className="pt-table w-full border-collapse border border-black"
                  style={{ fontSize: fs(9.5) }}
                >
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold">
                      <th className="border border-black px-1 py-1.5 w-7" rowSpan={2}>
                        No
                      </th>
                      <th className="border border-black px-1.5 py-1.5 w-24" rowSpan={2}>
                        No. Peserta
                      </th>
                      <th className="border border-black px-2 py-1.5 text-left min-w-[150px]" rowSpan={2}>
                        Nama Peserta Didik
                      </th>
                      <th className="border border-black px-1.5 py-1.5 w-16" rowSpan={2}>
                        Kelas
                      </th>
                      <th
                        className="border border-black px-1 py-1"
                        colSpan={Math.max(1, distinctExamDays.length)}
                      >
                        Tanggal Pelaksanaan Ujian (Paraf / H / S / I / A)
                      </th>
                      <th className="border border-black px-1.5 py-1.5 w-16" rowSpan={2}>
                        Ket.
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-center font-semibold text-[8.5px]">
                      {distinctExamDays.length > 0 ? (
                        distinctExamDays.map((day, dIdx) => (
                          <th key={day.key} className="border border-black px-1 py-1 min-w-[52px]">
                            H{dIdx + 1}: {day.label.split(',')[1]?.trim() || day.label}
                          </th>
                        ))
                      ) : (
                        <th className="border border-black px-1 py-1">Hari Ujian</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {room.students.map((s, idx) => (
                      <tr key={s.id}>
                        <td className="border border-black px-1 py-1 text-center tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center font-mono text-[9px] tabular-nums">
                          {s.nomorUjian || '-'}
                        </td>
                        <td className="border border-black px-2 py-1 font-medium">{s.nama}</td>
                        <td className="border border-black px-1.5 py-1 text-center">
                          {s.rombelSaatIni || s.kelas}
                        </td>
                        {distinctExamDays.length > 0 ? (
                          distinctExamDays.map(day => (
                            <td key={day.key} className="border border-black px-1 py-1 text-center">
                              &nbsp;
                            </td>
                          ))
                        ) : (
                          <td className="border border-black px-1 py-1">&nbsp;</td>
                        )}
                        <td className="border border-black px-1 py-1">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                <div
                  className="mt-4 pt-2 flex justify-between items-start"
                  style={{ fontSize: fs(10) }}
                >
                  <div className="border border-black px-3 py-1.5">
                    <strong>Total Peserta {room.labelUtama}:</strong> {room.jumlahPeserta} Siswa ·{' '}
                    <strong>Rentang Nopes:</strong> {room.rentangNomorPeserta || '-'}
                  </div>
                  <div className="text-center pr-6">
                    <p>{printDateStr}</p>
                    <p className="font-semibold">Koordinator Ruang / Sie Kepengawasan,</p>
                    <div className="h-12" />
                    <p className="font-bold underline">{siePengawasanName}</p>
                  </div>
                </div>
              </section>
            ))}

          {/* TAB 2 SUBMODE 1: DAFTAR HADIR PENGAWAS PER SESI JADWAL */}
          {mainTab === 'pengawas' &&
            pengawasSubMode === 'per_slot' &&
            activePengawasSlots.map((slot, sIdx) => {
              const rows = buildPengawasRowsForSlot(slot);
              const slotMarks = marks.pengawasMarks[slot.id] || {};
              const jagaCount = rows.filter(r => r.isJaga).length;
              const cadCount = rows.filter(r => r.isCad).length;
              const hadirCount = rows.filter(
                r => slotMarks[r.item.id]?.status === 'Hadir'
              ).length;

              return (
                <section
                  key={slot.id}
                  className="dh-sheet dh-sheet-scope bg-white text-black border border-slate-300 shadow-md flex flex-col justify-between print:shadow-none print:border-none"
                  style={{
                    ...typoStyleVars,
                    width: `${pageWidthMm}mm`,
                    minHeight: `${pageMinHeightMm}mm`,
                    padding: '11mm 14mm'
                  }}
                >
                  <div>
                  {/* Screen quick toolbar */}
                  <div className="no-print print:hidden mb-3 pb-2 border-b border-dashed border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-3 text-slate-700">
                      <span className="font-bold text-slate-900">
                        Sesi Jadwal #{sIdx + 1}: {slot.hari}, {slot.tanggal} ({slot.sesiLabel})
                      </span>
                      <span>· {jagaCount} Jaga Ruang</span>
                      <span>· {cadCount} Cadangan</span>
                    </div>
                    <button
                      onClick={() => markAllPengawasSlotHadir(slot)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Tandai Semua Hadir</span>
                    </button>
                  </div>

                  <OfficialKopSurat profile={profile} compact />

                  <div className="text-center mb-3">
                    <h2
                      className="font-black uppercase tracking-wide text-black"
                      style={{ fontSize: fs(14) }}
                    >
                      DAFTAR HADIR PENGAWAS RUANG UJIAN
                    </h2>
                    <p className="font-bold uppercase text-slate-900" style={{ fontSize: fs(11.5) }}>
                      {panitiaSettings.namaUjian || ujianSettings.namaUjian} · TAHUN PELAJARAN{' '}
                      {panitiaSettings.tahunPelajaran || ujianSettings.tahunPelajaran}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div
                    className="pt-meta-grid grid grid-cols-2 gap-x-6 mb-3 border border-black px-3 py-2 bg-slate-50/40 print:bg-transparent"
                    style={{ fontSize: fs(11), lineHeight: spMeta.lineHeight }}
                  >
                    <div className="grid grid-cols-[118px_8px_1fr]">
                      <span className="font-semibold">Hari / Tanggal</span>
                      <span>:</span>
                      <span className="font-bold">
                        {slot.hari}, {slot.tanggal}
                      </span>
                    </div>
                    <div className="grid grid-cols-[118px_8px_1fr]">
                      <span className="font-semibold">Sesi / Waktu</span>
                      <span>:</span>
                      <span className="font-bold tabular-nums">
                        {slot.sesiLabel} ({slot.waktu} WIB)
                      </span>
                    </div>
                    <div className="grid grid-cols-[118px_8px_1fr]">
                      <span className="font-semibold">Mata Pelajaran</span>
                      <span>:</span>
                      <span className="font-bold uppercase">{slot.mapel}</span>
                    </div>
                    <div className="grid grid-cols-[118px_8px_1fr]">
                      <span className="font-semibold">Komposisi Pengawas</span>
                      <span>:</span>
                      <span className="tabular-nums font-semibold">
                        {jagaCount} Jaga Ruang · {cadCount} Cadangan
                      </span>
                    </div>
                  </div>

                  {/* Table */}
                  <table
                    className="pt-table w-full border-collapse border border-black"
                    style={{ fontSize: fs(10.5) }}
                  >
                    <thead>
                      <tr className="bg-slate-100 text-black font-bold text-center">
                        <th className="border border-black px-1.5 py-1.5 w-8">No</th>
                        <th className="border border-black px-1.5 py-1.5 w-22">No. Tugas</th>
                        <th className="border border-black px-2 py-1.5 text-left">
                          Nama Pengawas Ruang
                        </th>
                        <th className="border border-black px-2 py-1.5 w-32">NIP</th>
                        <th className="border border-black px-2 py-1.5 w-28">Tugas / Ruang</th>
                        <th className="border border-black px-1.5 py-1.5 w-20">Jam Hadir</th>
                        <th className="border border-black px-1.5 py-1.5 w-28 no-print print:hidden">
                          Status Kehadiran
                        </th>
                        <th className="border border-black px-2 py-1.5 w-40" colSpan={2}>
                          Tanda Tangan
                        </th>
                        <th className="border border-black px-2 py-1.5 w-24">Ket.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => {
                        const num = idx + 1;
                        const isOdd = num % 2 === 1;
                        const mk = slotMarks[r.item.id] || {
                          status: '',
                          jamHadir: '',
                          catatan: ''
                        };
                        return (
                          <tr
                            key={r.item.id}
                            className={r.isCad ? 'bg-amber-50/40 print:bg-transparent' : ''}
                          >
                            <td className="border border-black px-1.5 py-1.5 text-center tabular-nums">
                              {num}
                            </td>
                            <td className="border border-black px-1.5 py-1.5 text-center font-mono text-[9.5px] tabular-nums">
                              {r.item.nomorTugas}
                            </td>
                            <td className="border border-black px-2 py-1.5 font-medium">
                              {r.item.nama}
                            </td>
                            <td className="border border-black px-2 py-1.5 text-center font-mono text-[9.5px] tabular-nums">
                              {r.item.nip || '-'}
                            </td>
                            <td className="border border-black px-2 py-1.5 text-center font-bold">
                              {formatPengawasRoomAssignmentLabel(r.assignment)}
                            </td>
                            <td className="border border-black px-1.5 py-1.5 text-center tabular-nums">
                              <input
                                type="text"
                                value={mk.jamHadir}
                                placeholder="....."
                                onChange={e =>
                                  setPengawasMark(slot.id, r.item.id, {
                                    jamHadir: e.target.value
                                  })
                                }
                                className={`w-full text-center bg-transparent focus:outline-none focus:bg-blue-50 text-[10px] ${
                                  !includeMarksOnPrint ? 'print:text-transparent' : ''
                                }`}
                              />
                            </td>
                            {/* Screen interactive status */}
                            <td className="border border-black px-1 py-1 text-center no-print print:hidden">
                              <select
                                value={mk.status}
                                onChange={e =>
                                  setPengawasMark(slot.id, r.item.id, {
                                    status: e.target.value as PengawasHadirCode
                                  })
                                }
                                className="w-full px-1 py-0.5 border border-slate-300 rounded text-[10px] bg-white"
                              >
                                <option value="">- Kosong -</option>
                                <option value="Hadir">Hadir</option>
                                <option value="Digantikan">Digantikan</option>
                                <option value="Izin">Izin</option>
                              </select>
                            </td>
                            {/* Zig-zag signature */}
                            <td className="border border-black px-1.5 py-1.5 w-24" style={{ fontSize: fs(9.5) }}>
                              {isOdd ? (
                                <div className="flex items-end gap-1.5 w-full">
                                  <span className="tabular-nums shrink-0">{num}.</span>
                                  <span className="flex-1 border-b border-dotted border-slate-500 h-2.5" />
                                </div>
                              ) : (
                                ''
                              )}
                            </td>
                            <td className="border border-black px-1.5 py-1.5 w-24" style={{ fontSize: fs(9.5) }}>
                              {!isOdd ? (
                                <div className="flex items-end gap-1.5 w-full">
                                  <span className="tabular-nums shrink-0">{num}.</span>
                                  <span className="flex-1 border-b border-dotted border-slate-500 h-2.5" />
                                </div>
                              ) : (
                                ''
                              )}
                            </td>
                            <td className="border border-black px-1.5 py-1.5 text-center" style={{ fontSize: fs(9.5) }}>
                              {includeMarksOnPrint
                                ? mk.catatan || mk.status || ''
                                : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>

                  {/* Footer */}
                  <div
                    className="mt-4 pt-2 grid grid-cols-12 gap-4 items-start"
                    style={{ fontSize: fs(10.5), lineHeight: spMeta.lineHeight }}
                  >
                    <div className="col-span-5 border border-black p-2.5 space-y-1.5 tabular-nums" style={{ fontSize: fs(10) }}>
                      <p className="font-bold uppercase border-b border-black pb-1 mb-1">
                        Rekap Kehadiran Pengawas
                      </p>
                      <div className="flex justify-between">
                        <span>Pengawas Jaga Ruang</span>
                        <span className="font-bold">{jagaCount} Orang</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pengawas Cadangan</span>
                        <span className="font-bold">{cadCount} Orang</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span>Total Hadir Tercatat</span>
                        <span>
                          {includeMarksOnPrint ? (
                            <strong>{hadirCount} Orang</strong>
                          ) : (
                            <span className="inline-flex items-baseline gap-1">
                              <span className="inline-block w-12 border-b border-dotted border-slate-600" />
                              <span>Orang</span>
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-slate-700 pt-1 border-t border-dotted border-slate-400" style={{ fontSize: fs(9) }}>
                        Catatan: Pengawas hadir 30 menit sebelum ujian dimulai.
                      </p>
                    </div>

                    <div className="col-span-7 grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-[10px]">Mengetahui,</p>
                        <p className="text-[10px] font-semibold">Sie Ruang & Kepengawasan</p>
                        <div className="h-14" />
                        <p className="font-bold underline">{siePengawasanName}</p>
                        <p className="text-[9.5px]">Panitia Penyelenggara</p>
                      </div>
                      <div className="relative">
                        <p className="text-[10px]">
                          {printCity}, {slot.tanggal || '20 November 2026'}
                        </p>
                        <p className="text-[10px] font-semibold">Kepala {profile.namaSekolah},</p>
                        <div className="h-14 relative flex items-center justify-center">
                          {includeDigitalTtd && (
                            <>
                              {stempelUrl ? (
                                <img
                                  src={stempelUrl}
                                  alt="Stempel"
                                  className="w-16 h-16 object-contain absolute left-1 opacity-80"
                                />
                              ) : (
                                <SchoolStampSvg className="w-16 h-16 absolute left-1 opacity-80" />
                              )}
                              {ttdUrl ? (
                                <img
                                  src={ttdUrl}
                                  alt="TTD Kepsek"
                                  className="h-12 object-contain relative z-10"
                                />
                              ) : (
                                <KepalaSekolahSignatureSvg className="w-24 h-10 relative z-10" />
                              )}
                            </>
                          )}
                        </div>
                        <p className="font-bold underline">{kepsekName}</p>
                        <p className="text-[9.5px]">NIP. {kepsekNip}</p>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}

          {/* TAB 2 SUBMODE 2: KARTU REKAP DAFTAR HADIR PER PENGAWAS */}
          {mainTab === 'pengawas' &&
            pengawasSubMode === 'per_pengawas' &&
            activePengawasListForIndividual.map(proctor => {
              const totalJaga = proctorSlots.filter(sl => {
                const v = (proctor.jadwalMengawas?.[sl.id] || '').trim();
                return v && !/^off$/i.test(v) && !/^cad/i.test(v);
              }).length;
              const totalCad = proctorSlots.filter(sl =>
                /^cad/i.test((proctor.jadwalMengawas?.[sl.id] || '').trim())
              ).length;

              return (
                <section
                  key={`ind-${proctor.id}`}
                  className="dh-sheet dh-sheet-scope bg-white text-black border border-slate-300 shadow-md flex flex-col justify-between print:shadow-none print:border-none"
                  style={{
                    ...typoStyleVars,
                    width: `${pageWidthMm}mm`,
                    minHeight: `${pageMinHeightMm}mm`,
                    padding: '11mm 14mm'
                  }}
                >
                  <div>
                  <OfficialKopSurat profile={profile} compact />

                  <div className="text-center mb-3">
                    <h2 className="font-black uppercase tracking-wide" style={{ fontSize: fs(14) }}>
                      KARTU DAFTAR HADIR INDIVIDUAL PENGAWAS RUANG
                    </h2>
                    <p className="font-bold" style={{ fontSize: fs(11) }}>
                      {panitiaSettings.namaUjian || ujianSettings.namaUjian} · Tahun Pelajaran{' '}
                      {panitiaSettings.tahunPelajaran || ujianSettings.tahunPelajaran}
                    </p>
                  </div>

                  <div
                    className="pt-meta-grid grid grid-cols-2 gap-x-6 mb-3 border border-black px-3 py-2 bg-slate-50/40 print:bg-transparent"
                    style={{ fontSize: fs(11), lineHeight: spMeta.lineHeight }}
                  >
                    <div className="grid grid-cols-[110px_8px_1fr]">
                      <span className="font-semibold">Nama Pengawas</span>
                      <span>:</span>
                      <span className="font-bold">{proctor.nama}</span>
                    </div>
                    <div className="grid grid-cols-[110px_8px_1fr]">
                      <span className="font-semibold">Nomor Tugas</span>
                      <span>:</span>
                      <span className="font-bold font-mono">{proctor.nomorTugas}</span>
                    </div>
                    <div className="grid grid-cols-[110px_8px_1fr]">
                      <span className="font-semibold">NIP / NUPTK</span>
                      <span>:</span>
                      <span className="font-mono">{proctor.nip || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[110px_8px_1fr]">
                      <span className="font-semibold">Total Tugas</span>
                      <span>:</span>
                      <span className="font-bold tabular-nums">
                        {totalJaga} Jaga Ruang · {totalCad} Cadangan
                      </span>
                    </div>
                  </div>

                  <table
                    className="pt-table w-full border-collapse border border-black"
                    style={{ fontSize: fs(10) }}
                  >
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center">
                        <th className="border border-black px-1.5 py-1.5 w-8">No</th>
                        <th className="border border-black px-2 py-1.5 w-32">Hari / Tanggal</th>
                        <th className="border border-black px-2 py-1.5 w-28">Sesi & Waktu</th>
                        <th className="border border-black px-2 py-1.5 text-left">Mata Pelajaran</th>
                        <th className="border border-black px-2 py-1.5 w-28">Tugas Ruang</th>
                        <th className="border border-black px-2 py-1.5 w-20">Jam Hadir</th>
                        <th className="border border-black px-2 py-1.5 w-28">Paraf Pengawas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proctorSlots.map((sl, idx) => {
                        const rawAssign = (proctor.jadwalMengawas?.[sl.id] || '').trim() || 'OFF';
                        const isOff = /^off$/i.test(rawAssign);
                        const mk = marks.pengawasMarks[sl.id]?.[proctor.id];
                        return (
                          <tr
                            key={sl.id}
                            className={isOff ? 'bg-slate-100/70 text-slate-500' : ''}
                          >
                            <td className="border border-black px-1.5 py-1.5 text-center tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="border border-black px-2 py-1.5 font-medium">
                              {sl.hari}, {sl.tanggal}
                            </td>
                            <td className="border border-black px-2 py-1.5 text-center tabular-nums">
                              {sl.sesiLabel} ({sl.waktu})
                            </td>
                            <td className="border border-black px-2 py-1.5">{sl.mapel}</td>
                            <td className="border border-black px-2 py-1.5 text-center font-bold">
                              {formatPengawasRoomAssignmentLabel(rawAssign)}
                            </td>
                            <td className="border border-black px-2 py-1.5 text-center tabular-nums">
                              {isOff ? '-' : includeMarksOnPrint ? mk?.jamHadir || '' : ''}
                            </td>
                            <td className="border border-black px-2 py-1.5 text-center">
                              {isOff ? 'LIBUR JAGA' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>

                  <div
                    className="mt-6 pt-2 grid grid-cols-2 gap-6 text-center"
                    style={{ fontSize: fs(10.5) }}
                  >
                    <div>
                      <p>Mengetahui,</p>
                      <p className="font-semibold">Sie Ruang & Kepengawasan</p>
                      <div className="h-14" />
                      <p className="font-bold underline">{siePengawasanName}</p>
                    </div>
                    <div>
                      <p>{printDateStr}</p>
                      <p className="font-semibold">Pengawas Ruang Yang Bersangkutan,</p>
                      <div className="h-14" />
                      <p className="font-bold underline">{proctor.nama}</p>
                      <p className="text-[9.5px]">NIP. {proctor.nip || '-'}</p>
                    </div>
                  </div>
                </section>
              );
            })}

          {/* TAB 2 SUBMODE 3: MATRIKS VERIFIKASI KEHADIRAN & JADWAL PENGAWAS LENGKAP */}
          {mainTab === 'pengawas' && pengawasSubMode === 'matriks' && (
            <section
              className="dh-sheet dh-sheet-scope bg-white text-black border border-slate-300 shadow-md flex flex-col justify-between print:shadow-none print:border-none"
              style={{
                ...typoStyleVars,
                width: `${pageWidthMm}mm`,
                minHeight: `${pageMinHeightMm}mm`,
                padding: '8mm 10mm'
              }}
            >
              <div>
              <OfficialKopSurat profile={profile} compact />

              <div className="text-center mb-2">
                <h2 className="font-black uppercase tracking-wide" style={{ fontSize: fs(13) }}>
                  MATRIKS REKAPITULASI JADWAL & VERIFIKASI KEHADIRAN PENGAWAS RUANG
                </h2>
                <p className="font-bold" style={{ fontSize: fs(10.5) }}>
                  {panitiaSettings.namaUjian || ujianSettings.namaUjian} · Tahun Pelajaran{' '}
                  {panitiaSettings.tahunPelajaran || ujianSettings.tahunPelajaran}
                </p>
              </div>

              <table
                className="pt-table-compact w-full border-collapse border border-black"
                style={{ fontSize: fs(8) }}
              >
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-black px-1 py-1 w-6" rowSpan={2}>
                      No
                    </th>
                    <th className="border border-black px-1.5 py-1 text-left min-w-[135px]" rowSpan={2}>
                      Nama Pengawas Ruang
                    </th>
                    {proctorSlots.map(sl => (
                      <th key={sl.id} className="border border-black px-0.5 py-1 min-w-[34px]">
                        <div>{sl.hari}</div>
                        <div className="font-normal">{sl.tanggal}</div>
                      </th>
                    ))}
                    <th className="border border-black px-1 py-1 w-8" rowSpan={2}>
                      JAGA
                    </th>
                    <th className="border border-black px-1 py-1 w-8" rowSpan={2}>
                      CAD
                    </th>
                    <th className="border border-black px-1 py-1 w-8" rowSpan={2}>
                      OFF
                    </th>
                  </tr>
                  <tr className="bg-slate-50 text-center font-semibold text-[7.5px]">
                    {proctorSlots.map(sl => (
                      <th key={sl.id} className="border border-black px-0.5 py-0.5">
                        {sl.sesiLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pengawasOnly.map((p, idx) => {
                    let jaga = 0;
                    let cad = 0;
                    let off = 0;
                    proctorSlots.forEach(sl => {
                      const val = (p.jadwalMengawas?.[sl.id] || '').trim() || 'OFF';
                      if (/^off$/i.test(val)) off++;
                      else if (/^cad/i.test(val)) cad++;
                      else jaga++;
                    });
                    return (
                      <tr key={p.id}>
                        <td className="border border-black px-1 py-1 text-center tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="border border-black px-1.5 py-1 font-medium whitespace-nowrap">
                          {p.nama}
                        </td>
                        {proctorSlots.map(sl => {
                          const val = (p.jadwalMengawas?.[sl.id] || '').trim() || 'OFF';
                          const isOff = /^off$/i.test(val);
                          const isCad = /^cad/i.test(val);
                          const mk = marks.pengawasMarks[sl.id]?.[p.id];
                          return (
                            <td
                              key={sl.id}
                              className={`border border-black px-0.5 py-1 text-center font-semibold tabular-nums ${
                                isCad
                                  ? 'bg-amber-200/80'
                                  : isOff
                                    ? 'bg-stone-600 text-white'
                                    : ''
                              }`}
                            >
                              {val}
                              {includeMarksOnPrint && mk?.status === 'Hadir' ? ' ✓' : ''}
                            </td>
                          );
                        })}
                        <td className="border border-black px-1 py-1 text-center font-bold tabular-nums">
                          {jaga}
                        </td>
                        <td className="border border-black px-1 py-1 text-center font-bold tabular-nums text-amber-800">
                          {cad}
                        </td>
                        <td className="border border-black px-1 py-1 text-center font-bold tabular-nums text-slate-600">
                          {off}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              <div
                className="mt-4 pt-2 flex justify-between items-start"
                style={{ fontSize: fs(9.5), lineHeight: spMeta.lineHeight }}
              >
                <div className="space-y-0.5">
                  <p className="font-bold">Keterangan:</p>
                  <p>1. Pengawas hadir 30 menit sebelum pelaksanaan ujian dimulai.</p>
                  <p>2. Bila berhalangan hadir, wajib menghubungi Sie Ruang dan Kepengawasan.</p>
                </div>
                <div className="text-center pr-8 relative">
                  <p>{printDateStr}</p>
                  <p className="font-semibold">Kepala {profile.namaSekolah},</p>
                  <div className="h-12 relative flex items-center justify-center">
                    {includeDigitalTtd && (
                      <>
                        {stempelUrl ? (
                          <img
                            src={stempelUrl}
                            alt="Stempel"
                            className="w-14 h-14 object-contain absolute left-0 opacity-80"
                          />
                        ) : (
                          <SchoolStampSvg className="w-14 h-14 absolute left-0 opacity-80" />
                        )}
                        {ttdUrl ? (
                          <img
                            src={ttdUrl}
                            alt="TTD Kepsek"
                            className="h-10 object-contain relative z-10"
                          />
                        ) : (
                          <KepalaSekolahSignatureSvg className="w-20 h-9 relative z-10" />
                        )}
                      </>
                    )}
                  </div>
                  <p className="font-bold underline">{kepsekName}</p>
                  <p>NIP. {kepsekNip}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {onUpdateSiswa && (
        <AturKelompokRuangSiswaModal
          isOpen={isRoomGroupModalOpen}
          onClose={() => setIsRoomGroupModalOpen(false)}
          siswaList={siswaList}
          ujianSettings={ujianSettings}
          initialSelectedRoom={selectedRoomCode !== 'ALL' ? selectedRoomCode : undefined}
          onSaveSiswa={(updatedList, msg) => {
            onUpdateSiswa(updatedList);
            appendAuditLog('ATUR_KELOMPOK_RUANG_SISWA', msg);
            showToast(msg);
          }}
        />
      )}
    </div>
  );
};
