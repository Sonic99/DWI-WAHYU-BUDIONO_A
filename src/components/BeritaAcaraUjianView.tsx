import React, { useEffect, useMemo, useState } from 'react';
import {
  BeritaAcaraSiswaAbsenItem,
  BeritaAcaraUjianRecord,
  Guru,
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
  exportBeritaAcaraUjianExcel,
  getStoredBeritaAcaraUjian,
  getStoredDaftarHadirMarks,
  saveStoredBeritaAcaraUjian
} from '../services/storageService';
import {
  computeMatchedRoomDistribution,
  findScheduledProctorsForRoomAndDay,
  MatchedExamRoomBucket
} from '../utils/examRoomSync';
import { DEFAULT_JADWAL_PENGAWAS_SLOTS } from '../utils/pengawasSchedule';
import { OfficialKopSurat } from './OfficialKopSurat';
import { KepalaSekolahSignatureSvg, SchoolStampSvg } from './OfficialStamps';
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
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Edit3,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  UserCheck,
  Users,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface BeritaAcaraUjianViewProps {
  profile: SchoolProfile;
  currentUser: User;
  siswaList: Siswa[];
  guruList: Guru[];
  ujianSettings: KartuUjianSettings;
  panitiaList: PanitiaPengawasItem[];
  panitiaSettings: KartuPanitiaSettings;
  fallbackTtdKsUrl?: string;
  fallbackStempelUrl?: string;
}

type BeritaAcaraMode = 'form_kosongan' | 'form_isian';
type KosonganScope = 'master_kosong' | 'per_ruang_jadwal';
type PaperSize = 'A4' | 'F4';

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_ID = [
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

const formatTanggalIndo = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${HARI_ID[d.getDay()]}, ${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
};

const parseHariTanggalParts = (
  hariTanggal: string,
  tanggalIso?: string
): { hari: string; tanggal: string; bulan: string; tahun: string } => {
  if (tanggalIso) {
    const d = new Date(`${tanggalIso}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return {
        hari: HARI_ID[d.getDay()],
        tanggal: String(d.getDate()),
        bulan: BULAN_ID[d.getMonth()],
        tahun: String(d.getFullYear())
      };
    }
  }
  const clean = (hariTanggal || '').trim();
  const match = clean.match(/^([A-Za-z]+),?\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (match) {
    return {
      hari: match[1],
      tanggal: match[2],
      bulan: match[3],
      tahun: match[4]
    };
  }
  return { hari: '', tanggal: '', bulan: '', tahun: '' };
};

const parseWaktuPair = (waktuText?: string): { mulai: string; selesai: string } => {
  const clean = (waktuText || '').replace(/\s*WIB/gi, '').trim();
  const parts = clean.split(/\s*[-–—s/d]+\s*/i);
  if (parts.length >= 2) {
    return { mulai: parts[0].trim(), selesai: parts[1].trim() };
  }
  return { mulai: clean || '07.30', selesai: '09.30' };
};

const createInitialRecord = (
  profile: SchoolProfile,
  ujianSettings: KartuUjianSettings,
  firstJadwal?: JadwalUjianItem,
  firstRoom?: MatchedExamRoomBucket
): BeritaAcaraUjianRecord => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const parsedWaktu = parseWaktuPair(firstJadwal?.waktu);
  return {
    id: `ba-${Date.now()}`,
    nomorBeritaAcara: `421.3/${String(Math.floor(100 + Math.random() * 800))}/101.6.1.9/${new Date().getFullYear()}`,
    namaUjian: ujianSettings.namaUjian || 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)',
    tahunPelajaran: ujianSettings.tahunPelajaran || 'Tahun Pelajaran 2026/2027',
    semester: ujianSettings.semester || 'Semester Ganjil',
    tanggalIso: todayIso,
    hariTanggalText: firstJadwal?.hariTanggal || formatTanggalIndo(todayIso),
    waktuMulai: parsedWaktu.mulai,
    waktuSelesai: parsedWaktu.selesai,
    sesiUjian: firstRoom?.sesiUjian || ujianSettings.sesiTersedia?.[0] || 'Sesi 1',
    mataPelajaran: firstJadwal?.mataPelajaran || '',
    tingkatKelas: firstRoom?.tingkatKelas || 'X',
    kelasRombel: firstRoom?.kelasRombel || '',
    ruangUjian: firstRoom?.nomorRuang || 'R.01',
    jumlahSeharusnya: firstRoom?.jumlahPeserta || 0,
    jumlahHadir: firstRoom?.jumlahPeserta || 0,
    jumlahTidakHadir: 0,
    siswaTidakHadirList: [],
    kondisiSampulNaskah: 'baik_tersegel',
    kesesuaianJumlahSoal: 'lengkap_cukup',
    selisihSoalQty: '',
    keadaanRuangDanPelaksanaan: 'tertib_aman_lancar',
    catatanKejadianKhusus:
      'Pelaksanaan penilaian berjalan dengan tertib, aman, dan lancar sesuai ketentuan tata tertib ujian.',
    pengawas1Nama: '',
    pengawas1Nip: '',
    pengawas2Nama: '',
    pengawas2Nip: '',
    kotaTanggalTtd:
      ujianSettings.kotaTanggalCetak ||
      `${profile.kota || 'Surabaya'}, ${new Date().getDate()} ${BULAN_ID[new Date().getMonth()]} ${new Date().getFullYear()}`,
    pengetahuiJabatan: `Kepala ${profile.namaSekolah || 'SMA Negeri 9 Surabaya'}`,
    pengetahuiNama: profile.kepalaSekolah || 'Dr. Kasminah, M.Pd.',
    pengetahuiNip: profile.nipKepalaSekolah || '196803151992032004',
    updatedAt: new Date().toISOString()
  };
};

export const BeritaAcaraUjianView: React.FC<BeritaAcaraUjianViewProps> = ({
  profile,
  currentUser,
  siswaList,
  guruList,
  ujianSettings,
  panitiaList,
  panitiaSettings,
  fallbackTtdKsUrl,
  fallbackStempelUrl
}) => {
  const matchedDistribution = useMemo(
    () => computeMatchedRoomDistribution(siswaList, ujianSettings),
    [siswaList, ujianSettings]
  );
  const jadwalList: JadwalUjianItem[] = ujianSettings.jadwalUjian || [];
  const proctorSlots: JadwalPengawasSlot[] =
    panitiaSettings.jadwalPengawasSlots && panitiaSettings.jadwalPengawasSlots.length > 0
      ? panitiaSettings.jadwalPengawasSlots
      : DEFAULT_JADWAL_PENGAWAS_SLOTS;

  const [mode, setMode] = useState<BeritaAcaraMode>('form_kosongan');
  const [kosonganScope, setKosonganScope] = useState<KosonganScope>('master_kosong');
  const [kosonganCount, setKosonganCount] = useState<number>(1);
  const [selectedKosonganJadwalId, setSelectedKosonganJadwalId] = useState<string>(
    jadwalList[0]?.id || 'BLANK'
  );
  const [selectedKosonganRoom, setSelectedKosonganRoom] = useState<string>('ALL');
  const [prefillRoomIdentOnBlanko, setPrefillRoomIdentOnBlanko] = useState<boolean>(true);
  const [prefillProctorOnBlanko, setPrefillProctorOnBlanko] = useState<boolean>(true);

  const [paperSize, setPaperSize] = useState<PaperSize>('F4');
  const [marginMm, setMarginMm] = useState<number>(10);
  const [includeDigitalTtd, setIncludeDigitalTtd] = useState<boolean>(false);
  const [includeKopSurat, setIncludeKopSurat] = useState<boolean>(true);
  const [previewZoom, setPreviewZoom] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 52 : 82
  );
  const [typography, setTypography] = useState<PrintTypographySettings>(() =>
    getStoredPrintTypography('sman9_berita_acara_typo_v1', {
      fontFamily: 'times',
      lineSpacing: 'nyaman',
      fontScalePct: 100
    })
  );

  useEffect(() => {
    saveStoredPrintTypography('sman9_berita_acara_typo_v1', typography);
  }, [typography]);

  const [records, setRecords] = useState<BeritaAcaraUjianRecord[]>(getStoredBeritaAcaraUjian);
  const [draft, setDraft] = useState<BeritaAcaraUjianRecord>(() =>
    createInitialRecord(
      profile,
      ujianSettings,
      jadwalList[0],
      matchedDistribution.rooms[0]
    )
  );
  const [selectedSyncJadwalId, setSelectedSyncJadwalId] = useState<string>(
    jadwalList[0]?.id || ''
  );
  const [printArchiveBatch, setPrintArchiveBatch] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg(prev => (prev === msg ? null : prev));
    }, 3400);
  };

  const updateDraft = (patch: Partial<BeritaAcaraUjianRecord>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      if (patch.jumlahSeharusnya !== undefined || patch.jumlahHadir !== undefined) {
        const seharusnya = Math.max(0, Number(next.jumlahSeharusnya) || 0);
        const hadir = Math.max(0, Math.min(seharusnya, Number(next.jumlahHadir) || 0));
        next.jumlahSeharusnya = seharusnya;
        next.jumlahHadir = hadir;
        next.jumlahTidakHadir = Math.max(0, seharusnya - hadir);
      }
      return next;
    });
  };

  const handleApplyJadwalToDraft = (jadwalId: string) => {
    setSelectedSyncJadwalId(jadwalId);
    const jd = jadwalList.find(j => j.id === jadwalId);
    if (!jd) return;
    const parsedWaktu = parseWaktuPair(jd.waktu);
    updateDraft({
      hariTanggalText: jd.hariTanggal || draft.hariTanggalText,
      waktuMulai: parsedWaktu.mulai,
      waktuSelesai: parsedWaktu.selesai,
      mataPelajaran: jd.mataPelajaran || draft.mataPelajaran
    });
    notify(`Identitas jadwal "${jd.mataPelajaran}" diterapkan ke form.`);
  };

  const handleApplyRoomToDraft = (roomCode: string) => {
    const room = matchedDistribution.rooms.find(r => r.nomorRuang === roomCode);
    if (!room) {
      updateDraft({ ruangUjian: roomCode });
      return;
    }
    const proctors = findScheduledProctorsForRoomAndDay(
      room.nomorRuang,
      draft.hariTanggalText,
      panitiaList,
      proctorSlots
    );
    updateDraft({
      ruangUjian: room.nomorRuang,
      tingkatKelas: room.tingkatKelas,
      kelasRombel: room.kelasRombel,
      sesiUjian: room.sesiUjian,
      jumlahSeharusnya: room.jumlahPeserta,
      jumlahHadir: Math.max(0, room.jumlahPeserta - draft.siswaTidakHadirList.length),
      jumlahTidakHadir: Math.min(room.jumlahPeserta, draft.siswaTidakHadirList.length),
      ...(proctors[0]
        ? { pengawas1Nama: proctors[0].nama, pengawas1Nip: proctors[0].nip || '-' }
        : {}),
      ...(proctors[1]
        ? { pengawas2Nama: proctors[1].nama, pengawas2Nip: proctors[1].nip || '-' }
        : {})
    });
    notify(`Data ruang ${room.nomorRuang} (${room.jumlahPeserta} peserta) diterapkan.`);
  };

  const handlePullFromDaftarHadir = () => {
    const marks = getStoredDaftarHadirMarks();
    const jadwalKey = selectedSyncJadwalId || jadwalList[0]?.id || 'BLANKO';
    const statusMap = marks.siswaStatus[jadwalKey] || {};
    const room = matchedDistribution.rooms.find(r => r.nomorRuang === draft.ruangUjian);
    if (!room) {
      notify('Pilih ruang ujian terlebih dahulu untuk menarik data Daftar Hadir.');
      return;
    }

    const total = room.students.length;
    const absenList: BeritaAcaraSiswaAbsenItem[] = [];
    let hadirCount = 0;

    room.students.forEach(s => {
      const st = statusMap[s.id] || '';
      if (st === 'S' || st === 'I' || st === 'A') {
        absenList.push({
          id: `abs-${s.id}`,
          nomorPeserta: s.nomorUjian || '-',
          nama: s.nama,
          kelas: s.rombelSaatIni || s.kelas || '-',
          keterangan: st === 'S' ? 'Sakit' : st === 'I' ? 'Izin' : 'Alpa',
          catatan: ''
        });
      } else {
        hadirCount += 1;
      }
    });

    const proctors = findScheduledProctorsForRoomAndDay(
      room.nomorRuang,
      draft.hariTanggalText,
      panitiaList,
      proctorSlots
    );

    setDraft(prev => ({
      ...prev,
      jumlahSeharusnya: total,
      jumlahHadir: total - absenList.length,
      jumlahTidakHadir: absenList.length,
      siswaTidakHadirList: absenList,
      ...(proctors[0]
        ? { pengawas1Nama: proctors[0].nama, pengawas1Nip: proctors[0].nip || '-' }
        : {}),
      ...(proctors[1]
        ? { pengawas2Nama: proctors[1].nama, pengawas2Nip: proctors[1].nip || '-' }
        : {}),
      updatedAt: new Date().toISOString()
    }));

    notify(
      absenList.length > 0
        ? `Tersinkron ${total} peserta (${hadirCount} hadir, ${absenList.length} tidak hadir) dari Daftar Hadir.`
        : `Tersinkron ${total} peserta dari ruang ${room.nomorRuang} (semua hadir / nihil absen).`
    );
  };

  const handleAddAbsenRow = () => {
    setDraft(prev => {
      const nextList: BeritaAcaraSiswaAbsenItem[] = [
        ...prev.siswaTidakHadirList,
        {
          id: `abs-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          nomorPeserta: '',
          nama: '',
          kelas: '',
          keterangan: 'Sakit'
        }
      ];
      return {
        ...prev,
        siswaTidakHadirList: nextList,
        jumlahTidakHadir: Math.max(prev.jumlahTidakHadir, nextList.length),
        jumlahHadir: Math.max(0, prev.jumlahSeharusnya - Math.max(prev.jumlahTidakHadir, nextList.length))
      };
    });
  };

  const handleUpdateAbsenRow = (
    absId: string,
    patch: Partial<BeritaAcaraSiswaAbsenItem>
  ) => {
    setDraft(prev => ({
      ...prev,
      siswaTidakHadirList: prev.siswaTidakHadirList.map(row =>
        row.id === absId ? { ...row, ...patch } : row
      )
    }));
  };

  const handleRemoveAbsenRow = (absId: string) => {
    setDraft(prev => {
      const nextList = prev.siswaTidakHadirList.filter(row => row.id !== absId);
      return {
        ...prev,
        siswaTidakHadirList: nextList
      };
    });
  };

  const handleSaveDraftToArchive = () => {
    const cleanRecord: BeritaAcaraUjianRecord = {
      ...draft,
      updatedAt: new Date().toISOString()
    };
    const existsIdx = records.findIndex(r => r.id === cleanRecord.id);
    const nextRecords =
      existsIdx >= 0
        ? records.map(r => (r.id === cleanRecord.id ? cleanRecord : r))
        : [cleanRecord, ...records];
    setRecords(nextRecords);
    saveStoredBeritaAcaraUjian(nextRecords);
    appendAuditLog(
      'SIMPAN_BERITA_ACARA_UJIAN',
      `${currentUser.name} menyimpan Berita Acara ${cleanRecord.namaUjian} (${cleanRecord.ruangUjian || 'Umum'} · ${cleanRecord.mataPelajaran || 'PSAS'}).`
    );
    notify('Berita Acara Ulangan PSAS berhasil disimpan ke arsip.');
  };

  const handleDeleteArchive = (id: string) => {
    const nextRecords = records.filter(r => r.id !== id);
    setRecords(nextRecords);
    saveStoredBeritaAcaraUjian(nextRecords);
    notify('Arsip Berita Acara dihapus.');
  };

  const handleNewDraft = () => {
    const fresh = createInitialRecord(
      profile,
      ujianSettings,
      jadwalList[0],
      matchedDistribution.rooms[0]
    );
    setDraft(fresh);
    setPrintArchiveBatch(false);
    notify('Form isian baru siap diisi.');
  };

  // Build printable sheets depending on active mode
  const sheetsToRender = useMemo<
    { key: string; isBlanko: boolean; record: BeritaAcaraUjianRecord }[]
  >(() => {
    if (mode === 'form_kosongan') {
      const selectedJd =
        selectedKosonganJadwalId !== 'BLANK'
          ? jadwalList.find(j => j.id === selectedKosonganJadwalId)
          : undefined;
      const baseBlank = createInitialRecord(profile, ujianSettings, selectedJd, undefined);
      baseBlank.nomorBeritaAcara = '';
      baseBlank.hariTanggalText = selectedJd?.hariTanggal || '';
      baseBlank.mataPelajaran = selectedJd?.mataPelajaran || '';
      if (!selectedJd) {
        baseBlank.waktuMulai = '';
        baseBlank.waktuSelesai = '';
        baseBlank.tanggalIso = '';
      }
      baseBlank.ruangUjian = '';
      baseBlank.tingkatKelas = '';
      baseBlank.kelasRombel = '';
      baseBlank.sesiUjian = '';
      baseBlank.jumlahSeharusnya = 0;
      baseBlank.jumlahHadir = 0;
      baseBlank.jumlahTidakHadir = 0;
      baseBlank.catatanKejadianKhusus = '';
      baseBlank.pengawas1Nama = '';
      baseBlank.pengawas1Nip = '';
      baseBlank.pengawas2Nama = '';
      baseBlank.pengawas2Nip = '';
      baseBlank.kotaTanggalTtd = `${profile.kota || 'Surabaya'}, ..............................`;

      if (kosonganScope === 'master_kosong') {
        return Array.from({ length: Math.max(1, Math.min(25, kosonganCount)) }).map(
          (_, idx) => ({
            key: `blanko-master-${idx}`,
            isBlanko: true,
            record: { ...baseBlank, id: `blanko-master-${idx}` }
          })
        );
      }

      const targetRooms = matchedDistribution.rooms.filter(
        r => selectedKosonganRoom === 'ALL' || r.nomorRuang === selectedKosonganRoom
      );
      if (targetRooms.length === 0) {
        return [{ key: 'blanko-empty', isBlanko: true, record: baseBlank }];
      }

      return targetRooms.map((room, rIdx) => {
        const proctors =
          prefillProctorOnBlanko && selectedJd
            ? findScheduledProctorsForRoomAndDay(
                room.nomorRuang,
                selectedJd.hariTanggal,
                panitiaList,
                proctorSlots
              )
            : [];
        return {
          key: `blanko-room-${room.nomorRuang}-${rIdx}`,
          isBlanko: true,
          record: {
            ...baseBlank,
            id: `blanko-room-${room.nomorRuang}`,
            ruangUjian: prefillRoomIdentOnBlanko ? room.nomorRuang : '',
            tingkatKelas: prefillRoomIdentOnBlanko ? room.tingkatKelas : '',
            kelasRombel: prefillRoomIdentOnBlanko ? room.kelasRombel : '',
            sesiUjian: prefillRoomIdentOnBlanko ? room.sesiUjian : '',
            jumlahSeharusnya: prefillRoomIdentOnBlanko ? room.jumlahPeserta : 0,
            pengawas1Nama: proctors[0]?.nama || '',
            pengawas1Nip: proctors[0]?.nip || '',
            pengawas2Nama: proctors[1]?.nama || '',
            pengawas2Nip: proctors[1]?.nip || ''
          }
        };
      });
    }

    if (printArchiveBatch && records.length > 0) {
      return records.map(rec => ({
        key: `archive-${rec.id}`,
        isBlanko: false,
        record: rec
      }));
    }

    return [{ key: `draft-${draft.id}`, isBlanko: false, record: draft }];
  }, [
    mode,
    kosonganScope,
    kosonganCount,
    selectedKosonganJadwalId,
    selectedKosonganRoom,
    prefillRoomIdentOnBlanko,
    prefillProctorOnBlanko,
    matchedDistribution.rooms,
    jadwalList,
    panitiaList,
    proctorSlots,
    profile,
    ujianSettings,
    printArchiveBatch,
    records,
    draft
  ]);

  const paperDims =
    paperSize === 'F4'
      ? { wMm: 215, hMm: 330, label: 'F4 / Folio (215 × 330 mm)' }
      : { wMm: 210, hMm: 297, label: 'A4 (210 × 297 mm)' };

  const pageCssSize =
    paperSize === 'F4' ? `${paperDims.wMm}mm ${paperDims.hMm}mm` : 'A4 portrait';

  const resolvedTtdUrl = resolveDirectImageUrl(
    ujianSettings.ttdKsUrl || fallbackTtdKsUrl
  );
  const resolvedStempelUrl = resolveDirectImageUrl(
    ujianSettings.stempelUrl || fallbackStempelUrl
  );

  const renderBeritaAcaraSheet = (
    item: { key: string; isBlanko: boolean; record: BeritaAcaraUjianRecord },
    index: number,
    totalCount: number
  ) => {
    const { isBlanko, record } = item;
    const isLast = index === totalCount - 1;
    const dayParts = isBlanko && !record.hariTanggalText
      ? { hari: '', tanggal: '', bulan: '', tahun: '' }
      : parseHariTanggalParts(record.hariTanggalText, record.tanggalIso);

    const blankDots = (minWidthPx: number, val?: string) =>
      val && val.trim() ? (
        <span className="font-semibold text-slate-950 px-1 border-b border-dotted border-slate-700">
          {val}
        </span>
      ) : (
        <span
          className="inline-block border-b border-dotted border-slate-700 align-baseline"
          style={{ minWidth: `${minWidthPx}px`, height: '1em' }}
        />
      );

    const checkMarkBox = (checked: boolean, label: string) => (
      <span className="inline-flex items-center gap-1.5 mr-3">
        <span className="inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-900 text-[10px] font-bold leading-none">
          {checked ? '✓' : ''}
        </span>
        <span>{label}</span>
      </span>
    );

    const emptyAbsentSlots = isBlanko ? 5 : Math.max(3, record.siswaTidakHadirList.length);
    const absenRowsToRender = Array.from({ length: emptyAbsentSlots }).map(
      (_, idx) => record.siswaTidakHadirList[idx] || null
    );

    return (
      <div
        key={item.key}
        className={`ba-sheet-page bg-white text-slate-950 border border-slate-300 shadow-lg mx-auto print:shadow-none print:border-none ${
          !isLast ? 'mb-6 print:mb-0' : ''
        }`}
        style={{
          width: `${paperDims.wMm}mm`,
          minHeight: `${paperDims.hMm}mm`,
          padding: `${marginMm}mm`,
          boxSizing: 'border-box',
          pageBreakAfter: isLast ? 'auto' : 'always',
          breakAfter: isLast ? 'auto' : 'page',
          ...getPrintTypographyStyleVars(typography)
        }}
      >
        <div className="ba-sheet-scope flex flex-col justify-between h-full text-[12px] leading-relaxed">
          <div>
            {includeKopSurat && <OfficialKopSurat profile={profile} compact />}

            {/* Title Block */}
            <div className="text-center mb-3">
              <h1 className="text-[15px] font-extrabold uppercase tracking-wide text-slate-950 underline underline-offset-4">
                BERITA ACARA PENYELENGGARAAN UJIAN
              </h1>
              <div className="text-[12.5px] font-bold uppercase text-slate-900 mt-1">
                {record.namaUjian || 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)'}
              </div>
              <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                {record.tahunPelajaran}
                {record.semester ? ` · ${record.semester}` : ''}
              </div>
              <div className="text-[11px] text-slate-700 mt-0.5">
                Nomor:{' '}
                {isBlanko && !record.nomorBeritaAcara ? (
                  blankDots(175)
                ) : (
                  <span className="font-mono font-semibold text-slate-950">
                    {record.nomorBeritaAcara}
                  </span>
                )}
              </div>
            </div>

            {/* Formal Opening Statement */}
            <p className="text-justify mb-2.5">
              Pada hari ini {blankDots(75, dayParts.hari)}, tanggal{' '}
              {blankDots(32, dayParts.tanggal)} bulan {blankDots(75, dayParts.bulan)} tahun{' '}
              {blankDots(45, dayParts.tahun)}, bertempat di{' '}
              <span className="font-semibold">{profile.namaSekolah}</span> telah diselenggarakan{' '}
              <span className="font-semibold">
                {record.namaUjian || 'Penilaian Sumatif Akhir Semester (PSAS)'}
              </span>{' '}
              dengan rincian pelaksanaan sebagai berikut:
            </p>

            {/* Section 1: Identitas Pelaksanaan */}
            <table className="w-full border-collapse text-[11.5px] mb-2.5">
              <tbody>
                <tr>
                  <td className="w-[26%] py-1 pr-2 font-semibold align-top">
                    1. Mata Pelajaran
                  </td>
                  <td className="w-[3%] py-1 align-top">:</td>
                  <td className="w-[33%] py-1 pr-3 align-top">
                    {record.mataPelajaran ? (
                      <span className="font-bold text-slate-950">{record.mataPelajaran}</span>
                    ) : (
                      blankDots(170)
                    )}
                  </td>
                  <td className="w-[15%] py-1 pr-2 font-semibold align-top">
                    Ruang Ujian
                  </td>
                  <td className="w-[3%] py-1 align-top">:</td>
                  <td className="w-[20%] py-1 align-top font-bold tabular-nums">
                    {record.ruangUjian || blankDots(80)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-2 font-semibold align-top">
                    2. Waktu / Pukul
                  </td>
                  <td className="py-1 align-top">:</td>
                  <td className="py-1 pr-3 align-top tabular-nums">
                    {isBlanko && !record.waktuMulai ? (
                      <>
                        {blankDots(48)} s.d. {blankDots(48)} WIB
                      </>
                    ) : (
                      <span className="font-semibold">
                        {record.waktuMulai || '.....'} – {record.waktuSelesai || '.....'} WIB
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-2 font-semibold align-top">
                    Tingkat / Kelas
                  </td>
                  <td className="py-1 align-top">:</td>
                  <td className="py-1 align-top">
                    {record.tingkatKelas || record.kelasRombel ? (
                      <span className="font-semibold">
                        {record.tingkatKelas}
                        {record.kelasRombel ? ` (${record.kelasRombel})` : ''}
                      </span>
                    ) : (
                      blankDots(80)
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 pr-2 font-semibold align-top">
                    3. Sesi / Gelombang
                  </td>
                  <td className="py-1 align-top">:</td>
                  <td className="py-1 pr-3 align-top" colSpan={4}>
                    {record.sesiUjian ? (
                      <span className="font-semibold">{record.sesiUjian}</span>
                    ) : (
                      blankDots(170)
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Section 2: Rekapitulasi Kehadiran Peserta */}
            <div className="mb-2.5">
              <div className="font-bold text-[11.5px] uppercase tracking-wide mb-1">
                A. Rekapitulasi Kehadiran Peserta Ujian
              </div>
              <table className="w-full border border-slate-900 border-collapse text-center text-[11.5px]">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th className="border border-slate-900 py-1.5 px-2 w-1/3">
                      Jumlah Peserta Terdaftar
                    </th>
                    <th className="border border-slate-900 py-1.5 px-2 w-1/3">
                      Jumlah Peserta Hadir
                    </th>
                    <th className="border border-slate-900 py-1.5 px-2 w-1/3">
                      Jumlah Peserta Tidak Hadir
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold text-[13px] tabular-nums">
                    <td className="border border-slate-900 py-2 px-2">
                      {isBlanko && record.jumlahSeharusnya <= 0 ? (
                        <span className="font-normal text-[11.5px]">
                          ................ peserta
                        </span>
                      ) : (
                        `${record.jumlahSeharusnya} peserta`
                      )}
                    </td>
                    <td className="border border-slate-900 py-2 px-2">
                      {isBlanko ? (
                        <span className="font-normal text-[11.5px]">
                          ................ peserta
                        </span>
                      ) : (
                        `${record.jumlahHadir} peserta`
                      )}
                    </td>
                    <td className="border border-slate-900 py-2 px-2">
                      {isBlanko ? (
                        <span className="font-normal text-[11.5px]">
                          ................ peserta
                        </span>
                      ) : (
                        `${record.jumlahTidakHadir} peserta`
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 3: Rincian Peserta Tidak Hadir */}
            <div className="mb-2.5">
              <div className="font-bold text-[11.5px] uppercase tracking-wide mb-1">
                B. Daftar Peserta Tidak Hadir / Terlambat
              </div>
              <table className="w-full border border-slate-900 border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-slate-900 py-1 px-1.5 w-[6%]">No</th>
                    <th className="border border-slate-900 py-1 px-2 w-[22%]">
                      Nomor Peserta
                    </th>
                    <th className="border border-slate-900 py-1 px-2 w-[34%]">
                      Nama Peserta Didik
                    </th>
                    <th className="border border-slate-900 py-1 px-2 w-[14%]">Kelas</th>
                    <th className="border border-slate-900 py-1 px-2 w-[24%]">
                      Keterangan (S/I/A/Ket.)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!isBlanko && record.siswaTidakHadirList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-slate-900 py-2 px-2 text-center italic text-slate-700"
                      >
                        — NIHIL (Seluruh peserta yang terdaftar hadir mengikuti ujian) —
                      </td>
                    </tr>
                  ) : (
                    absenRowsToRender.map((row, rIdx) => (
                      <tr key={`abs-row-${rIdx}`} className="h-[22px]">
                        <td className="border border-slate-900 py-0.5 px-1.5 text-center tabular-nums">
                          {rIdx + 1}
                        </td>
                        <td className="border border-slate-900 py-0.5 px-2 font-mono tabular-nums">
                          {row?.nomorPeserta || ''}
                        </td>
                        <td className="border border-slate-900 py-0.5 px-2 font-semibold">
                          {row?.nama || ''}
                        </td>
                        <td className="border border-slate-900 py-0.5 px-2 text-center">
                          {row?.kelas || ''}
                        </td>
                        <td className="border border-slate-900 py-0.5 px-2">
                          {row
                            ? `${row.keterangan}${row.catatan ? ` (${row.catatan})` : ''}`
                            : ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 4: Kondisi Sampul Soal / CBT & Catatan Kejadian */}
            <div className="mb-3 border border-slate-900 p-2.5 text-[11px] space-y-1.5">
              <div className="font-bold uppercase tracking-wide text-[11.5px]">
                C. Kelengkapan Berkas Soal / CBT &amp; Catatan Selama Ujian Berlangsung
              </div>
              <div className="flex flex-wrap items-center">
                <span className="font-semibold w-44 shrink-0">
                  1. Kondisi Sampul / Token CBT:
                </span>
                <div className="flex flex-wrap">
                  {checkMarkBox(
                    !isBlanko && record.kondisiSampulNaskah === 'baik_tersegel',
                    'Tersegel Utuh & Baik'
                  )}
                  {checkMarkBox(
                    !isBlanko && record.kondisiSampulNaskah === 'cbt_lancar',
                    'CBT / Server Lancar'
                  )}
                  {checkMarkBox(
                    !isBlanko && record.kondisiSampulNaskah === 'rusak_terbuka',
                    'Terbuka / Terkendala'
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center">
                <span className="font-semibold w-44 shrink-0">
                  2. Kesesuaian Jumlah Soal:
                </span>
                <div className="flex flex-wrap">
                  {checkMarkBox(
                    !isBlanko && record.kesesuaianJumlahSoal === 'lengkap_cukup',
                    'Lengkap / Cukup'
                  )}
                  {checkMarkBox(
                    !isBlanko && record.kesesuaianJumlahSoal === 'kurang',
                    `Kurang (${!isBlanko && record.kesesuaianJumlahSoal === 'kurang' ? record.selisihSoalQty || '...' : '....'})`
                  )}
                  {checkMarkBox(
                    !isBlanko && record.kesesuaianJumlahSoal === 'lebih',
                    `Lebih (${!isBlanko && record.kesesuaianJumlahSoal === 'lebih' ? record.selisihSoalQty || '...' : '....'})`
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center">
                <span className="font-semibold w-44 shrink-0">
                  3. Ketertiban Pelaksanaan:
                </span>
                <div className="flex flex-wrap">
                  {checkMarkBox(
                    !isBlanko &&
                      record.keadaanRuangDanPelaksanaan === 'tertib_aman_lancar',
                    'Tertib, Aman & Lancar'
                  )}
                  {checkMarkBox(
                    !isBlanko && record.keadaanRuangDanPelaksanaan === 'ada_kendala',
                    'Ada Kejadian Khusus / Catatan'
                  )}
                </div>
              </div>
              <div className="pt-1">
                <div className="font-semibold mb-1">
                  4. Uraian Kejadian Khusus / Pelanggaran Tata Tertib / Catatan Pengawas:
                </div>
                {isBlanko && !record.catatanKejadianKhusus ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="border-b border-dotted border-slate-700 h-4" />
                    <div className="border-b border-dotted border-slate-700 h-4" />
                    <div className="border-b border-dotted border-slate-700 h-4" />
                  </div>
                ) : (
                  <div className="min-h-[42px] border border-slate-300 rounded px-2 py-1.5 bg-slate-50/40 whitespace-pre-wrap">
                    {record.catatanKejadianKhusus || '-'}
                  </div>
                )}
              </div>
            </div>

            <p className="text-justify text-[11.5px]">
              Demikian berita acara ini dibuat dengan sesungguhnya untuk dapat
              dipergunakan sebagaimana mestinya.
            </p>
          </div>

          {/* Signature Block */}
          <div className="mt-3 pt-1 text-[11.5px]">
            <div className="text-right mb-2">
              {record.kotaTanggalTtd ||
                `${profile.kota || 'Surabaya'}, ..............................`}
            </div>

            <div className="grid grid-cols-2 gap-8 text-center mb-4">
              <div>
                <div className="font-semibold">Pengawas Ruang I,</div>
                <div className="h-14" />
                <div className="font-bold text-slate-950 underline underline-offset-2">
                  {record.pengawas1Nama || '( ............................................ )'}
                </div>
                <div className="text-[10.5px] font-mono tabular-nums text-slate-700">
                  NIP. {record.pengawas1Nip || '....................................'}
                </div>
              </div>
              <div>
                <div className="font-semibold">Pengawas Ruang II,</div>
                <div className="h-14" />
                <div className="font-bold text-slate-950 underline underline-offset-2">
                  {record.pengawas2Nama || '( ............................................ )'}
                </div>
                <div className="text-[10.5px] font-mono tabular-nums text-slate-700">
                  NIP. {record.pengawas2Nip || '....................................'}
                </div>
              </div>
            </div>

            <div className="flex justify-center text-center">
              <div className="min-w-[260px]">
                <div>Mengetahui,</div>
                <div className="font-semibold">
                  {record.pengetahuiJabatan ||
                    `Kepala ${profile.namaSekolah || 'SMA Negeri 9 Surabaya'}`}
                </div>

                <div className="relative h-14 flex items-center justify-center my-0.5">
                  {includeDigitalTtd && (
                    <>
                      {resolvedStempelUrl ? (
                        <img
                          src={resolvedStempelUrl}
                          alt="Stempel Sekolah"
                          className="absolute left-4 top-0 w-16 h-16 object-contain opacity-85 pointer-events-none"
                        />
                      ) : (
                        <div className="absolute left-4 -top-1 opacity-75 pointer-events-none">
                          <SchoolStampSvg
                            schoolName={profile.namaSekolah}
                            className="w-16 h-16"
                          />
                        </div>
                      )}
                      {resolvedTtdUrl ? (
                        <img
                          src={resolvedTtdUrl}
                          alt="TTD Kepala Sekolah"
                          className="max-h-13 object-contain relative z-10 pointer-events-none"
                        />
                      ) : (
                        <KepalaSekolahSignatureSvg className="w-28 h-12 relative z-10 pointer-events-none" />
                      )}
                    </>
                  )}
                </div>

                <div className="font-bold text-slate-950 underline underline-offset-2">
                  {record.pengetahuiNama || profile.kepalaSekolah}
                </div>
                <div className="text-[10.5px] font-mono tabular-nums text-slate-700">
                  NIP. {record.pengetahuiNip || profile.nipKepalaSekolah}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Precision Print Stylesheet */}
      <style>{`
        ${getScopedPrintTypographyCss('.ba-sheet-scope')}
        @media print {
          @page {
            size: ${pageCssSize};
            margin: ${marginMm}mm;
          }
          html,
          body {
            font-size: 16px !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .ba-zoom-wrap {
            zoom: 1 !important;
            transform: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .ba-sheet-page {
            width: 100% !important;
            max-width: 100% !important;
            min-height: ${Math.max(100, paperDims.hMm - marginMm * 2 - 2)}mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Top Toolbar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-slate-900 text-amber-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Berita Acara Ulangan (PSAS) · Form Kosongan &amp; Form Isian
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Cetak blanko berita acara kosongan siap tulis tangan atau isi berita acara digital terhubung ke Jadwal, Ruang &amp; Daftar Hadir.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Mode Switcher */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setMode('form_kosongan');
                  setPrintArchiveBatch(false);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'form_kosongan'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Form Kosongan</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('form_isian')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'form_isian'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Form Untuk Isian</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Cetak Berita Acara ({sheetsToRender.length} Hal.)</span>
            </button>
          </div>
        </div>

        {/* Paper, Margin, Zoom & Typography Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Kertas:</span>
              <select
                value={paperSize}
                onChange={e => setPaperSize(e.target.value as PaperSize)}
                className="px-2 py-1 border border-slate-300 rounded-md bg-white font-semibold text-slate-800"
              >
                <option value="F4">F4 / Folio (215×330mm)</option>
                <option value="A4">A4 (210×297mm)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-600">Margin:</span>
              <select
                value={marginMm}
                onChange={e => setMarginMm(Number(e.target.value))}
                className="px-2 py-1 border border-slate-300 rounded-md bg-white font-semibold text-slate-800"
              >
                <option value={8}>8 mm (Luas)</option>
                <option value={10}>10 mm (Standar)</option>
                <option value={12}>12 mm (Lebar)</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 bg-slate-50 border border-slate-200 rounded-md">
              <input
                type="checkbox"
                checked={includeKopSurat}
                onChange={e => setIncludeKopSurat(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="font-medium text-slate-700">Kop Surat Resmi</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 bg-slate-50 border border-slate-200 rounded-md">
              <input
                type="checkbox"
                checked={includeDigitalTtd}
                onChange={e => setIncludeDigitalTtd(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="font-medium text-slate-700">TTD &amp; Stempel KS</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewZoom(z => Math.max(45, z - 10))}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              title="Perkecil Pratinjau"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-bold text-slate-800 w-10 text-center tabular-nums">
              {previewZoom}%
            </span>
            <button
              type="button"
              onClick={() => setPreviewZoom(z => Math.min(115, z + 10))}
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              title="Perbesar Pratinjau"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <PrintTypographyBar value={typography} onChange={setTypography} />

        {toastMsg && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>

      {/* Mode 1 Controls: Form Kosongan */}
      {mode === 'form_kosongan' && (
        <div className="no-print bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-800">Jenis Form Kosongan:</span>
              <button
                type="button"
                onClick={() => setKosonganScope('master_kosong')}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                  kosonganScope === 'master_kosong'
                    ? 'bg-amber-50 border-amber-400 text-amber-900'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Blanko Kosongan Umum (Siap Fotokopi)
              </button>
              <button
                type="button"
                onClick={() => setKosonganScope('per_ruang_jadwal')}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-colors ${
                  kosonganScope === 'per_ruang_jadwal'
                    ? 'bg-blue-50 border-blue-400 text-blue-900'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Blanko Kosongan Otomatis Per Ruang ({matchedDistribution.rooms.length} Ruang)
              </button>
            </div>

            {kosonganScope === 'master_kosong' ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Jumlah Rangkap:</span>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={kosonganCount}
                  onChange={e =>
                    setKosonganCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))
                  }
                  className="w-16 px-2 py-1 border border-slate-300 rounded-md text-center font-mono font-bold"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={selectedKosonganJadwalId}
                  onChange={e => setSelectedKosonganJadwalId(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-medium text-slate-800 max-w-xs"
                >
                  <option value="BLANK">— Biarkan Mapel &amp; Hari Kosong —</option>
                  {jadwalList.map(jd => (
                    <option key={jd.id} value={jd.id}>
                      {jd.hariTanggal} · {jd.mataPelajaran} ({jd.waktu})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedKosonganRoom}
                  onChange={e => setSelectedKosonganRoom(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-semibold text-slate-800"
                >
                  <option value="ALL">
                    Semua Ruang ({matchedDistribution.rooms.length})
                  </option>
                  {matchedDistribution.rooms.map(r => (
                    <option key={r.nomorRuang} value={r.nomorRuang}>
                      {r.nomorRuang} ({r.tingkatKelas} · {r.jumlahPeserta} sis)
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefillRoomIdentOnBlanko}
                    onChange={e => setPrefillRoomIdentOnBlanko(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Isi Ruang &amp; Jml Terdaftar</span>
                </label>
                <label className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefillProctorOnBlanko}
                    onChange={e => setPrefillProctorOnBlanko(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Isi Nama Pengawas Jadwal</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workspace Split: Form Isian Editor (left) + Live Document Preview (right) */}
      <div
        className={
          mode === 'form_isian'
            ? 'grid grid-cols-1 xl:grid-cols-12 gap-5 items-start print:block'
            : 'block'
        }
      >
        {mode === 'form_isian' && (
          <div className="no-print xl:col-span-5 bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
            {/* Quick Sync Strip */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Isi Cepat dari Jadwal, Ruang &amp; Daftar Hadir</span>
                <button
                  type="button"
                  onClick={handleNewDraft}
                  className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Form Baru
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <select
                  value={selectedSyncJadwalId}
                  onChange={e => handleApplyJadwalToDraft(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800"
                >
                  <option value="">-- Pilih Jadwal Mapel PSAS --</option>
                  {jadwalList.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.mataPelajaran} · {j.hariTanggal}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.ruangUjian}
                  onChange={e => handleApplyRoomToDraft(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-md bg-white font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Ruang Ujian --</option>
                  {matchedDistribution.rooms.map(r => (
                    <option key={r.nomorRuang} value={r.nomorRuang}>
                      {r.nomorRuang} · Kelas {r.tingkatKelas} ({r.jumlahPeserta} peserta)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePullFromDaftarHadir}
                  className="px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Tarik Kehadiran dari Daftar Hadir
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraftToArchive}
                  className="px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan ke Arsip
                </button>
              </div>
            </div>

            {/* Section 1 Inputs */}
            <div className="space-y-2.5 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                1. Identitas Pelaksanaan Ujian
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Nama Kegiatan Ujian
                  </label>
                  <input
                    type="text"
                    value={draft.namaUjian}
                    onChange={e => updateDraft({ namaUjian: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Nomor Berita Acara
                  </label>
                  <input
                    type="text"
                    value={draft.nomorBeritaAcara}
                    onChange={e => updateDraft({ nomorBeritaAcara: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Semester &amp; Tahun
                  </label>
                  <input
                    type="text"
                    value={`${draft.tahunPelajaran} (${draft.semester})`}
                    onChange={e => updateDraft({ tahunPelajaran: e.target.value, semester: '' })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Tanggal Pelaksanaan
                  </label>
                  <input
                    type="date"
                    value={draft.tanggalIso}
                    onChange={e =>
                      updateDraft({
                        tanggalIso: e.target.value,
                        hariTanggalText: formatTanggalIndo(e.target.value)
                      })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Hari, Tanggal Teks
                  </label>
                  <input
                    type="text"
                    value={draft.hariTanggalText}
                    onChange={e => updateDraft({ hariTanggalText: e.target.value })}
                    placeholder="Senin, 1 Desember 2026"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={draft.mataPelajaran}
                    onChange={e => updateDraft({ mataPelajaran: e.target.value })}
                    placeholder="Misal: Matematika Wajib"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Jam Mulai
                    </label>
                    <input
                      type="text"
                      value={draft.waktuMulai}
                      onChange={e => updateDraft({ waktuMulai: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Jam Selesai
                    </label>
                    <input
                      type="text"
                      value={draft.waktuSelesai}
                      onChange={e => updateDraft({ waktuSelesai: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Ruang Ujian
                  </label>
                  <input
                    type="text"
                    value={draft.ruangUjian}
                    onChange={e => updateDraft({ ruangUjian: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Tingkat / Rombel Kelas
                  </label>
                  <input
                    type="text"
                    value={draft.kelasRombel}
                    onChange={e => updateDraft({ kelasRombel: e.target.value })}
                    placeholder="X-1, X-2"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Attendance & Absent Students */}
            <div className="space-y-2.5 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                <span>2. Rekap Kehadiran &amp; Peserta Tidak Hadir</span>
                <span className="font-mono text-slate-600 tabular-nums">
                  {draft.jumlahHadir}/{draft.jumlahSeharusnya} Hadir
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Seharusnya
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.jumlahSeharusnya}
                    onChange={e =>
                      updateDraft({ jumlahSeharusnya: Number(e.target.value) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Hadir
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={draft.jumlahSeharusnya}
                    value={draft.jumlahHadir}
                    onChange={e =>
                      updateDraft({ jumlahHadir: Number(e.target.value) || 0 })
                    }
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono font-bold text-center text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Tidak Hadir
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.jumlahTidakHadir}
                    readOnly
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md bg-slate-100 font-mono font-bold text-center text-rose-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    Daftar Siswa Tidak Hadir / Terlambat
                  </span>
                  <button
                    type="button"
                    onClick={handleAddAbsenRow}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah Baris
                  </button>
                </div>
                {draft.siswaTidakHadirList.length === 0 ? (
                  <div className="text-[11px] italic text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded p-2">
                    Belum ada peserta tidak hadir (Nihil). Klik &ldquo;Tambah Baris&rdquo; atau &ldquo;Tarik Kehadiran dari Daftar Hadir&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {draft.siswaTidakHadirList.map(row => (
                      <div
                        key={row.id}
                        className="grid grid-cols-12 gap-1 items-center bg-slate-50 p-1.5 rounded border border-slate-200"
                      >
                        <input
                          type="text"
                          value={row.nomorPeserta}
                          onChange={e =>
                            handleUpdateAbsenRow(row.id, { nomorPeserta: e.target.value })
                          }
                          placeholder="No. Pes"
                          className="col-span-3 px-1.5 py-1 border border-slate-300 rounded bg-white font-mono text-[11px]"
                        />
                        <input
                          type="text"
                          value={row.nama}
                          onChange={e =>
                            handleUpdateAbsenRow(row.id, { nama: e.target.value })
                          }
                          placeholder="Nama Siswa"
                          className="col-span-4 px-1.5 py-1 border border-slate-300 rounded bg-white text-[11px]"
                        />
                        <input
                          type="text"
                          value={row.kelas || ''}
                          onChange={e =>
                            handleUpdateAbsenRow(row.id, { kelas: e.target.value })
                          }
                          placeholder="Kelas"
                          className="col-span-2 px-1.5 py-1 border border-slate-300 rounded bg-white text-[11px]"
                        />
                        <select
                          value={row.keterangan}
                          onChange={e =>
                            handleUpdateAbsenRow(row.id, {
                              keterangan: e.target.value as BeritaAcaraSiswaAbsenItem['keterangan']
                            })
                          }
                          className="col-span-2 px-1 py-1 border border-slate-300 rounded bg-white text-[11px]"
                        >
                          <option value="Sakit">Sakit</option>
                          <option value="Izin">Izin</option>
                          <option value="Alpa">Alpa</option>
                          <option value="Terlambat">Terlambat</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveAbsenRow(row.id)}
                          className="col-span-1 p-1 text-rose-600 hover:bg-rose-50 rounded flex justify-center"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Conditions & Notes */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                3. Kondisi Soal / CBT &amp; Catatan Pelaksanaan
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Kondisi Sampul / Token CBT
                  </label>
                  <select
                    value={draft.kondisiSampulNaskah}
                    onChange={e =>
                      updateDraft({
                        kondisiSampulNaskah: e.target.value as BeritaAcaraUjianRecord['kondisiSampulNaskah']
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="baik_tersegel">Tersegel Utuh &amp; Baik</option>
                    <option value="cbt_lancar">CBT / Token &amp; Server Lancar</option>
                    <option value="rusak_terbuka">Terbuka / Terkendala</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Kesesuaian Jumlah Soal
                  </label>
                  <select
                    value={draft.kesesuaianJumlahSoal}
                    onChange={e =>
                      updateDraft({
                        kesesuaianJumlahSoal: e.target.value as BeritaAcaraUjianRecord['kesesuaianJumlahSoal']
                      })
                    }
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="lengkap_cukup">Lengkap / Cukup</option>
                    <option value="kurang">Kurang</option>
                    <option value="lebih">Lebih</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Ketertiban &amp; Catatan Kejadian Khusus
                </label>
                <select
                  value={draft.keadaanRuangDanPelaksanaan}
                  onChange={e =>
                    updateDraft({
                      keadaanRuangDanPelaksanaan: e.target.value as BeritaAcaraUjianRecord['keadaanRuangDanPelaksanaan']
                    })
                  }
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-md bg-white mb-1.5"
                >
                  <option value="tertib_aman_lancar">Tertib, Aman &amp; Lancar</option>
                  <option value="ada_kendala">Ada Kejadian Khusus / Catatan</option>
                </select>
                <textarea
                  rows={3}
                  value={draft.catatanKejadianKhusus}
                  onChange={e => updateDraft({ catatanKejadianKhusus: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                  placeholder="Tuliskan catatan pelaksanaan, pergantian pengawas, kendala teknis CBT, atau pelanggaran tata tertib..."
                />
              </div>
            </div>

            {/* Section 4: Proctors & Signoff */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1">
                4. Pengawas Ruang &amp; Pengesahan
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Pengawas Ruang I
                  </label>
                  <input
                    type="text"
                    list="ba-guru-list"
                    value={draft.pengawas1Nama}
                    onChange={e => {
                      const val = e.target.value;
                      const matchGuru = guruList.find(g => val.startsWith(g.nama));
                      updateDraft({
                        pengawas1Nama: val,
                        ...(matchGuru ? { pengawas1Nip: matchGuru.nip || '-' } : {})
                      });
                    }}
                    placeholder="Nama Pengawas 1"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md mb-1"
                  />
                  <input
                    type="text"
                    value={draft.pengawas1Nip}
                    onChange={e => updateDraft({ pengawas1Nip: e.target.value })}
                    placeholder="NIP Pengawas 1"
                    className="w-full px-2.5 py-1 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Pengawas Ruang II
                  </label>
                  <input
                    type="text"
                    list="ba-guru-list"
                    value={draft.pengawas2Nama}
                    onChange={e => {
                      const val = e.target.value;
                      const matchGuru = guruList.find(g => val.startsWith(g.nama));
                      updateDraft({
                        pengawas2Nama: val,
                        ...(matchGuru ? { pengawas2Nip: matchGuru.nip || '-' } : {})
                      });
                    }}
                    placeholder="Nama Pengawas 2"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md mb-1"
                  />
                  <input
                    type="text"
                    value={draft.pengawas2Nip}
                    onChange={e => updateDraft({ pengawas2Nip: e.target.value })}
                    placeholder="NIP Pengawas 2"
                    className="w-full px-2.5 py-1 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <datalist id="ba-guru-list">
                  {guruList.map(g => (
                    <option
                      key={g.id}
                      value={g.gelar ? `${g.nama}, ${g.gelar}` : g.nama}
                    />
                  ))}
                </datalist>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Kota &amp; Tanggal TTD
                    </label>
                    <input
                      type="text"
                      value={draft.kotaTanggalTtd}
                      onChange={e => updateDraft({ kotaTanggalTtd: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Pejabat Mengetahui
                    </label>
                    <input
                      type="text"
                      value={draft.pengetahuiNama}
                      onChange={e => updateDraft({ pengetahuiNama: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Area */}
        <div
          className={`${
            mode === 'form_isian' ? 'xl:col-span-7' : ''
          } overflow-x-auto pb-4 print:overflow-visible print:p-0`}
        >
          <div
            className="ba-zoom-wrap mx-auto"
            style={{
              zoom: previewZoom / 100
            }}
          >
            {sheetsToRender.map((item, idx) =>
              renderBeritaAcaraSheet(item, idx, sheetsToRender.length)
            )}
          </div>
        </div>
      </div>

      {/* Saved Berita Acara Archive Table */}
      {mode === 'form_isian' && (
        <div className="no-print bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Arsip Berita Acara Tersimpan ({records.length})
              </h3>
              <p className="text-xs text-slate-500">
                Klik dokumen tersimpan untuk memuat ke editor, mencetak massal semua arsip, atau mengekspor rekap Excel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {records.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintArchiveBatch(prev => !prev);
                      notify(
                        !printArchiveBatch
                          ? `Menampilkan ${records.length} halaman arsip siap cetak massal.`
                          : 'Kembali ke pratinjau form aktif.'
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${
                      printArchiveBatch
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {printArchiveBatch
                        ? 'Pratinjau Form Aktif Saja'
                        : `Gabung Cetak Semua Arsip (${records.length})`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportBeritaAcaraUjianExcel(records)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Ekspor Rekap Excel</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {records.length === 0 ? (
            <div className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-4 text-center">
              Belum ada Berita Acara tersimpan. Isi form di atas lalu klik &ldquo;Simpan ke Arsip&rdquo;.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-left text-slate-700">
                    <th className="py-2 px-2.5">Ruang</th>
                    <th className="py-2 px-2.5">Hari / Tanggal</th>
                    <th className="py-2 px-2.5">Mata Pelajaran</th>
                    <th className="py-2 px-2.5 text-center">Kehadiran</th>
                    <th className="py-2 px-2.5">Pengawas Ruang</th>
                    <th className="py-2 px-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 font-bold text-slate-900">
                        {rec.ruangUjian || '-'}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700">
                        <div>{rec.hariTanggalText || rec.tanggalIso}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {rec.waktuMulai} – {rec.waktuSelesai} WIB
                        </div>
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-slate-900">
                        {rec.mataPelajaran || '-'}
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono tabular-nums">
                        <span className="font-bold text-emerald-700">{rec.jumlahHadir}</span>/
                        <span>{rec.jumlahSeharusnya}</span>{' '}
                        {rec.jumlahTidakHadir > 0 && (
                          <span className="text-rose-600 font-semibold">
                            (-{rec.jumlahTidakHadir})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-slate-700">
                        <div>1. {rec.pengawas1Nama || '-'}</div>
                        {rec.pengawas2Nama && (
                          <div className="text-[11px] text-slate-500">
                            2. {rec.pengawas2Nama}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(rec);
                            setPrintArchiveBatch(false);
                            notify(`Memuat Berita Acara ${rec.ruangUjian} ke editor.`);
                          }}
                          className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold"
                        >
                          Muat / Cetak
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArchive(rec.id)}
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
