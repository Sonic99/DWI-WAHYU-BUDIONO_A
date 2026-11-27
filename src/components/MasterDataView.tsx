import React, { useState, useMemo, useRef } from 'react';
import { Siswa, Guru, Tendik, User } from '../types';
import { 
  exportDapodikSiswaToExcel,
  downloadDapodikSiswaExcelTemplate,
  parseDapodikSiswaExcel,
  exportDapodikGuruToExcel,
  downloadDapodikGuruExcelTemplate,
  parseDapodikGuruExcel,
  exportDapodikTendikToExcel,
  downloadDapodikTendikExcelTemplate,
  parseDapodikTendikExcel,
  exportDapodikSiswaToCSV, 
  downloadDapodikTemplateCSV, 
  parseDapodikSiswaCSV,
  exportDapodikGuruToCSV,
  downloadDapodikGuruTemplateCSV,
  parseDapodikGuruCSV,
  appendAuditLog,
  saveStoredSiswa,
  saveStoredGuru,
  saveStoredTendik,
  getStoredBukuIndukSiswaMeta,
  saveStoredBukuIndukSiswaMeta
} from '../services/storageService';
import { compressGtkPhotoFileToDataUrl } from '../services/gtkPhotoStorage';
import { resolveDirectImageUrl } from './ExamCardBarcode';
import { 
  Users, 
  GraduationCap, 
  Search, 
  Plus, 
  Download, 
  Upload,
  Edit2, 
  Trash2, 
  FileText, 
  X,
  Phone,
  Award,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Table,
  Columns,
  Eye,
  Info,
  Briefcase,
  UserCheck,
  Camera,
  Contact2,
  UserMinus,
  RotateCcw
} from 'lucide-react';

type ExitModeGtk = 'mutasi' | 'meninggal' | 'berhenti' | 'hapus_permanen';
type ExitModeSiswa = 'mutasi' | 'berhenti' | 'hapus_permanen';

interface ExitModalState {
  entity: 'siswa' | 'guru' | 'tendik';
  record: Siswa | Guru;
  mode: ExitModeGtk | ExitModeSiswa;
  tanggalKeluar: string;
  tujuanMutasi: string;
  alasanKeluar: string;
  nomorSuratMutasi: string;
  error: string;
}

const isSiswaExitedRecord = (s: Siswa): boolean =>
  Boolean(s.status && s.status !== 'Aktif');

const isGtkExitedRecord = (g: Guru): boolean =>
  Boolean(g.statusAktif && g.statusAktif !== 'Aktif');

const formatSiswaExitSummary = (s: Siswa): string => {
  if (!isSiswaExitedRecord(s)) return '';
  if (s.status === 'Mutasi' || s.jenisKeluar === 'Mutasi' || s.status === 'Pindah') {
    const tujuan = s.tujuanMutasi ? ` ke ${s.tujuanMutasi}` : '';
    const alasan = s.alasanKeluar ? ` — ${s.alasanKeluar}` : '';
    return `Mutasi${tujuan}${alasan}`;
  }
  if (s.status === 'Berhenti' || s.jenisKeluar === 'Berhenti Sekolah') {
    return `Berhenti Sekolah${s.alasanKeluar ? `: ${s.alasanKeluar}` : ''}`;
  }
  return s.status || 'Keluar';
};

const formatGtkExitSummary = (g: Guru): string => {
  if (!isGtkExitedRecord(g)) return '';
  if (g.statusAktif === 'Mutasi' || g.jenisKeluar === 'Mutasi') {
    const tujuan = g.tujuanMutasi ? ` ke ${g.tujuanMutasi}` : '';
    const ket = g.alasanKeluar ? ` — ${g.alasanKeluar}` : '';
    return `Mutasi${tujuan}${ket}`;
  }
  if (g.statusAktif === 'Meninggal Dunia' || g.jenisKeluar === 'Meninggal Dunia') {
    return `Meninggal Dunia${g.alasanKeluar ? ` — ${g.alasanKeluar}` : ''}`;
  }
  if (g.statusAktif === 'Berhenti' || g.statusAktif === 'Pensiun' || g.jenisKeluar === 'Berhenti' || g.jenisKeluar === 'Pensiun') {
    return `Berhenti${g.alasanKeluar ? `: ${g.alasanKeluar}` : ''}`;
  }
  return g.statusAktif || 'Keluar';
};

interface MasterDataViewProps {
  siswaList: Siswa[];
  guruList: Guru[];
  tendikList: Tendik[];
  currentUser: User;
  onUpdateSiswa: (list: Siswa[]) => void;
  onUpdateGuru: (list: Guru[]) => void;
  onUpdateTendik: (list: Tendik[]) => void;
  onSelectForLetter?: (target: { type: 'siswa' | 'guru' | 'tendik'; data: Siswa | Guru | Tendik }) => void;
  onOpenProfileCard?: (gtkId: string) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  siswaList,
  guruList,
  tendikList,
  currentUser,
  onUpdateSiswa,
  onUpdateGuru,
  onUpdateTendik,
  onSelectForLetter,
  onOpenProfileCard
}) => {
  const [activeTab, setActiveTab] = useState<'siswa' | 'guru' | 'tendik'>('siswa');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Siswa Filters
  const [filterKelas, setFilterKelas] = useState('SEMUA');
  const [filterJK, setFilterJK] = useState('SEMUA');
  const [filterPip, setFilterPip] = useState('SEMUA');
  const [filterKeaktifanSiswa, setFilterKeaktifanSiswa] = useState<'SEMUA' | 'AKTIF' | 'KELUAR'>('SEMUA');

  // Guru & Tendik Filters
  const [filterStatusGuru, setFilterStatusGuru] = useState('SEMUA');
  const [filterJKGuru, setFilterJKGuru] = useState('SEMUA');
  const [filterStatusTendik, setFilterStatusTendik] = useState('SEMUA');
  const [filterJKTendik, setFilterJKTendik] = useState('SEMUA');
  const [filterKeaktifanGtk, setFilterKeaktifanGtk] = useState<'SEMUA' | 'AKTIF' | 'KELUAR'>('SEMUA');

  // Exit / Mutasi / Delete Modal & Feedback Banner
  const [exitModalState, setExitModalState] = useState<ExitModalState | null>(null);
  const [masterFeedback, setMasterFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  
  // Table View Mode (Ringkas vs Dapodik 51 Kolom)
  const [tableViewMode, setTableViewMode] = useState<'ringkas' | 'dapodik_lengkap'>('ringkas');

  // Modal State for Siswa
  const [isSiswaModalOpen, setIsSiswaModalOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [activeSiswaModalTab, setActiveSiswaModalTab] = useState<'identitas' | 'alamat' | 'ortu' | 'bantuan' | 'periodik'>('identitas');
  const [inspectSiswa, setInspectSiswa] = useState<Siswa | null>(null);

  // Full Dapodik Siswa Form State
  const [siswaFormData, setSiswaFormData] = useState<Partial<Siswa>>({
    nama: '',
    nis: '',
    nipd: '',
    nisn: '',
    kelas: 'X-1',
    rombelSaatIni: 'X-1',
    jurusan: 'Fase E (Umum)',
    jenisKelamin: 'L',
    status: 'Aktif',
    tempatLahir: 'Surabaya',
    tanggalLahir: '2010-01-01',
    nik: '',
    agama: 'Islam',
    alamat: '',
    rt: '0',
    rw: '0',
    dusun: '-',
    kelurahan: '',
    kecamatan: '',
    kodePos: '',
    jenisTinggal: 'Bersama orang tua',
    alatTransportasi: 'Jalan kaki',
    telepon: '',
    hp: '',
    email: '',
    skhun: '',
    penerimaKps: 'Tidak',
    noKps: '',
    namaAyah: '',
    tahunLahirAyah: '',
    jenjangPendidikanAyah: 'SMA / sederajat',
    pekerjaanAyah: 'Wiraswasta',
    penghasilanAyah: 'Rp1.000.001 - Rp3.000.000',
    nikAyah: '',
    namaIbu: '',
    tahunLahirIbu: '',
    jenjangPendidikanIbu: 'SMA / sederajat',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    penghasilanIbu: 'Tidak Berpenghasilan',
    nikIbu: '',
    namaWali: '',
    tahunLahirWali: '',
    jenjangPendidikanWali: 'Tidak sekolah',
    pekerjaanWali: '',
    penghasilanWali: '< Rp1.000.000',
    nikWali: '',
    noPesertaUN: '',
    noSeriIjazah: '',
    penerimaKip: 'Tidak',
    nomorKip: '0',
    namaDiKip: '',
    nomorKks: '',
    noRegAktaLahir: '',
    bank: '',
    noRekeningBank: '',
    rekeningAtasNama: '',
    layakPip: 'Tidak',
    alasanLayakPip: '',
    kebutuhanKhusus: 'Tidak ada',
    sekolahAsal: 'SMP Negeri di Surabaya',
    anakKe: 1,
    lintang: '-7.25',
    bujur: '112.75',
    noKk: '',
    beratBadan: 50,
    tinggiBadan: 165,
    lingkarKepala: 54,
    jmlSaudaraKandung: 1,
    jarakSekolah: 1,
    prestasi: ''
  });

  // Modal State for Guru & Tendik (Shared GTK Structure)
  const [gtkModalEntity, setGtkModalEntity] = useState<'guru' | 'tendik'>('guru');
  const [isGuruModalOpen, setIsGuruModalOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);
  const [activeGuruModalTab, setActiveGuruModalTab] = useState<'kepegawaian' | 'alamat' | 'sk' | 'keluarga' | 'perbankan'>('kepegawaian');
  const [inspectGuru, setInspectGuru] = useState<{ type: 'guru' | 'tendik'; data: Guru | Tendik } | null>(null);

  // Full Dapodik GTK Form State
  const [guruFormData, setGuruFormData] = useState<Partial<Guru>>({
    nip: '',
    nama: '',
    nuptk: '',
    jenisKelamin: 'L',
    tempatLahir: 'SURABAYA',
    tanggalLahir: '1985-01-01',
    status: 'PNS',
    statusKepegawaian: 'PNS',
    jenisPtk: 'Guru Mapel',
    jabatan: 'Guru Mata Pelajaran',
    mapel: '',
    mataPelajaran: '',
    agama: 'Islam',
    alamatJalan: '',
    rt: '0',
    rw: '0',
    namaDusun: '-',
    desaKelurahan: '',
    kecamatan: '',
    kodePos: '',
    telepon: '',
    hp: '',
    noHp: '',
    email: '',
    tugasTambahan: '-',
    skCpns: '',
    tanggalCpns: '',
    skPengangkatan: '',
    tmtPengangkatan: '',
    lembagaPengangkatan: 'Pemerintah Propinsi',
    pangkatGolongan: 'Penata Muda (III/a)',
    sumberGaji: 'APBD Provinsi',
    namaIbuKandung: '',
    statusPerkawinan: 'Kawin',
    namaSuamiIstri: '',
    nipSuamiIstri: '',
    pekerjaanSuamiIstri: '',
    tmtPns: '',
    sudahLisensiKepalaSekolah: 'Tidak',
    pernahDiklatKepengawasan: 'Tidak',
    keahlianBraille: 'Tidak',
    keahlianBahasaIsyarat: 'Tidak',
    npwp: '',
    namaWajibPajak: '',
    kewarganegaraan: 'ID',
    bank: 'Bank Jatim',
    nomorRekeningBank: '',
    rekeningAtasNama: '',
    nik: '',
    noKk: '',
    karpeg: '',
    karisKarsu: '',
    lintang: '',
    bujur: '',
    nuks: ''
  });

  // Siswa Import Modal State
  const [isSiswaImportModalOpen, setIsSiswaImportModalOpen] = useState(false);
  const [siswaImportMode, setSiswaImportMode] = useState<'merge' | 'replace'>('merge');
  const [siswaImportFileName, setSiswaImportFileName] = useState<string>('');
  const [parsedSiswaImportResult, setParsedSiswaImportResult] = useState<{
    success: boolean;
    data: Siswa[];
    message: string;
    errors: string[];
  } | null>(null);
  const siswaFileInputRef = useRef<HTMLInputElement>(null);

  // Guru / Tendik Import Modal State
  const [gtkImportEntity, setGtkImportEntity] = useState<'guru' | 'tendik'>('guru');
  const [isGuruImportModalOpen, setIsGuruImportModalOpen] = useState(false);
  const [guruImportMode, setGuruImportMode] = useState<'merge' | 'replace'>('merge');
  const [guruImportFileName, setGuruImportFileName] = useState<string>('');
  const [parsedGuruImportResult, setParsedGuruImportResult] = useState<{
    success: boolean;
    data: Guru[];
    message: string;
    errors: string[];
  } | null>(null);
  const guruFileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentUser.role === 'admin_tu' || currentUser.role === 'staf_agenda';

  // Dynamic available classes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    siswaList.forEach(s => {
      const cls = s.rombelSaatIni || s.kelas;
      if (cls) set.add(cls);
    });
    return Array.from(set).sort();
  }, [siswaList]);

  // Filtered Siswa
  const filteredSiswa = useMemo(() => {
    return siswaList.filter(s => {
      const nama = s.nama.toLowerCase();
      const nis = (s.nipd || s.nis || '').toLowerCase();
      const nisn = (s.nisn || '').toLowerCase();
      const kelas = (s.rombelSaatIni || s.kelas || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = 
        nama.includes(term) ||
        nis.includes(term) ||
        nisn.includes(term) ||
        kelas.includes(term) ||
        (s.alamat && s.alamat.toLowerCase().includes(term)) ||
        (s.sekolahAsal && s.sekolahAsal.toLowerCase().includes(term)) ||
        (s.tujuanMutasi && s.tujuanMutasi.toLowerCase().includes(term)) ||
        (s.alasanKeluar && s.alasanKeluar.toLowerCase().includes(term));

      const currentClass = s.rombelSaatIni || s.kelas;
      const matchesKelas = filterKelas === 'SEMUA' || currentClass === filterKelas;
      const matchesJK = filterJK === 'SEMUA' || s.jenisKelamin === filterJK;
      
      const isPip = s.layakPip === 'Ya' || s.penerimaKip === 'Ya';
      const matchesPip = 
        filterPip === 'SEMUA' ||
        (filterPip === 'YA' && isPip) ||
        (filterPip === 'TIDAK' && !isPip);

      const exited = isSiswaExitedRecord(s);
      const matchesKeaktifan =
        filterKeaktifanSiswa === 'SEMUA' ||
        (filterKeaktifanSiswa === 'AKTIF' && !exited) ||
        (filterKeaktifanSiswa === 'KELUAR' && exited);

      return matchesSearch && matchesKelas && matchesJK && matchesPip && matchesKeaktifan;
    });
  }, [siswaList, searchTerm, filterKelas, filterJK, filterPip, filterKeaktifanSiswa]);

  // Filtered Guru
  const filteredGuru = useMemo(() => {
    return guruList.filter(g => {
      const mapel = g.mataPelajaran || g.mapel || '';
      const status = g.statusKepegawaian || g.status || '';
      const nama = g.nama.toLowerCase();
      const nip = (g.nip || '').toLowerCase();
      const nuptk = (g.nuptk || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = 
        nama.includes(term) ||
        nip.includes(term) ||
        nuptk.includes(term) ||
        mapel.toLowerCase().includes(term) ||
        g.jabatan.toLowerCase().includes(term) ||
        (g.tugasTambahan && g.tugasTambahan.toLowerCase().includes(term)) ||
        (g.tujuanMutasi && g.tujuanMutasi.toLowerCase().includes(term)) ||
        (g.alasanKeluar && g.alasanKeluar.toLowerCase().includes(term));

      const matchesStatus = filterStatusGuru === 'SEMUA' || status === filterStatusGuru;
      const matchesJK = filterJKGuru === 'SEMUA' || g.jenisKelamin === filterJKGuru;
      const exited = isGtkExitedRecord(g);
      const matchesKeaktifan =
        filterKeaktifanGtk === 'SEMUA' ||
        (filterKeaktifanGtk === 'AKTIF' && !exited) ||
        (filterKeaktifanGtk === 'KELUAR' && exited);

      return matchesSearch && matchesStatus && matchesJK && matchesKeaktifan;
    });
  }, [guruList, searchTerm, filterStatusGuru, filterJKGuru, filterKeaktifanGtk]);

  // Filtered Tendik
  const filteredTendik = useMemo(() => {
    return tendikList.filter(t => {
      const status = t.statusKepegawaian || t.status || '';
      const nama = t.nama.toLowerCase();
      const nip = (t.nip || '').toLowerCase();
      const nuptk = (t.nuptk || '').toLowerCase();
      const nik = (t.nik || '').toLowerCase();
      const tugas = (t.tugasTambahan || t.jabatan || t.jenisPtk || '').toLowerCase();
      const email = (t.email || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch =
        nama.includes(term) ||
        nip.includes(term) ||
        nuptk.includes(term) ||
        nik.includes(term) ||
        tugas.includes(term) ||
        email.includes(term) ||
        (t.tujuanMutasi && t.tujuanMutasi.toLowerCase().includes(term)) ||
        (t.alasanKeluar && t.alasanKeluar.toLowerCase().includes(term));

      const matchesStatus = filterStatusTendik === 'SEMUA' || status === filterStatusTendik;
      const matchesJK = filterJKTendik === 'SEMUA' || t.jenisKelamin === filterJKTendik;
      const exited = isGtkExitedRecord(t);
      const matchesKeaktifan =
        filterKeaktifanGtk === 'SEMUA' ||
        (filterKeaktifanGtk === 'AKTIF' && !exited) ||
        (filterKeaktifanGtk === 'KELUAR' && exited);

      return matchesSearch && matchesStatus && matchesJK && matchesKeaktifan;
    });
  }, [tendikList, searchTerm, filterStatusTendik, filterJKTendik, filterKeaktifanGtk]);

  const activeGtkRows = activeTab === 'tendik' ? filteredTendik : filteredGuru;

  const masterStats = useMemo(() => {
    const activeGuruList = guruList.filter(g => !isGtkExitedRecord(g));
    const activeTendikList = tendikList.filter(t => !isGtkExitedRecord(t));
    const activeSiswaList = siswaList.filter(s => !isSiswaExitedRecord(s));

    const scoreGtkRecord = (g: Guru): { filled: number; total: number; coreComplete: boolean; hasPhoto: boolean } => {
      const checks = [
        Boolean((g.nama || '').trim()),
        Boolean((g.nip || g.nuptk || g.nik || '').trim()),
        Boolean((g.statusKepegawaian || g.status || '').trim() && (g.jenisPtk || g.jabatan || '').trim()),
        Boolean((g.tempatLahir || '').trim() && (g.tanggalLahir || '').trim()),
        Boolean((g.alamatJalan || '').trim()),
        Boolean((g.hp || g.noHp || g.email || '').trim()),
        Boolean((g.skPengangkatan || g.tmtPengangkatan || '').trim()),
        Boolean((g.fotoUrl || '').trim())
      ];
      const coreComplete = checks.slice(0, 7).every(Boolean);
      const hasPhoto = checks[7];
      const filled = checks.filter(Boolean).length;
      return { filled, total: checks.length, coreComplete, hasPhoto };
    };

    const guruScores = activeGuruList.map(scoreGtkRecord);
    const tendikScores = activeTendikList.map(scoreGtkRecord);
    const allGtkScores = [...guruScores, ...tendikScores];

    const calcAvgPct = (scores: typeof guruScores) => {
      if (scores.length === 0) return 0;
      const sum = scores.reduce((acc, s) => acc + s.filled / s.total, 0);
      return Math.round((sum / scores.length) * 100);
    };

    const guruPns = activeGuruList.filter(g => (g.statusKepegawaian || g.status || '').toUpperCase().includes('PNS')).length;
    const guruPppk = activeGuruList.filter(g => (g.statusKepegawaian || g.status || '').toUpperCase().includes('PPPK')).length;
    const guruHonorer = Math.max(0, activeGuruList.length - guruPns - guruPppk);

    const tendikAsn = activeTendikList.filter(t => {
      const st = (t.statusKepegawaian || t.status || '').toUpperCase();
      return st.includes('PNS') || st.includes('PPPK');
    }).length;
    const tendikHonorer = Math.max(0, activeTendikList.length - tendikAsn);

    const totalGtk = activeGuruList.length + activeTendikList.length;
    const gtkBiodataLengkapCount = allGtkScores.filter(s => s.coreComplete).length;
    const gtkFotoCount = allGtkScores.filter(s => s.hasPhoto).length;

    const guruKeluarCount = guruList.length - activeGuruList.length;
    const tendikKeluarCount = tendikList.length - activeTendikList.length;
    const siswaKeluarCount = siswaList.length - activeSiswaList.length;

    return {
      jumlahGuru: activeGuruList.length,
      guruPns,
      guruPppk,
      guruHonorer,
      guruKeluarCount,
      jumlahTendik: activeTendikList.length,
      tendikAsn,
      tendikHonorer,
      tendikKeluarCount,
      jumlahSiswa: activeSiswaList.length,
      siswaKeluarCount,
      jumlahRombel: availableClasses.length,
      totalGtk,
      persenProfilLengkap: calcAvgPct(allGtkScores),
      guruLengkapPct: calcAvgPct(guruScores),
      tendikLengkapPct: calcAvgPct(tendikScores),
      gtkBiodataLengkapCount,
      gtkFotoCount
    };
  }, [guruList, tendikList, siswaList, availableClasses]);

  // ===================== SISWA HANDLERS =====================
  const handleOpenSiswaModal = (siswa?: Siswa) => {
    setActiveSiswaModalTab('identitas');
    if (siswa) {
      setEditingSiswa(siswa);
      setSiswaFormData({
        ...siswa,
        nipd: siswa.nipd || siswa.nis,
        rombelSaatIni: siswa.rombelSaatIni || siswa.kelas,
        prestasi: Array.isArray(siswa.prestasi) ? siswa.prestasi.join(', ') : (siswa.prestasi || '')
      });
    } else {
      setEditingSiswa(null);
      const randomInduk = String(19780 + siswaList.length + 1);
      const randomNisn = `010${Date.now().toString().slice(-7)}`;
      setSiswaFormData({
        nama: '',
        nis: randomInduk,
        nipd: randomInduk,
        nisn: randomNisn,
        kelas: 'X-1',
        rombelSaatIni: 'X-1',
        jurusan: 'Fase E (Umum)',
        jenisKelamin: 'L',
        status: 'Aktif',
        tempatLahir: 'Surabaya',
        tanggalLahir: '2010-01-01',
        nik: `357801${Date.now().toString().slice(-10)}`,
        agama: 'Islam',
        alamat: '',
        rt: '0',
        rw: '0',
        dusun: '-',
        kelurahan: '',
        kecamatan: '',
        kodePos: '60272',
        jenisTinggal: 'Bersama orang tua',
        alatTransportasi: 'Jalan kaki',
        telepon: '',
        hp: '',
        email: '',
        skhun: '',
        penerimaKps: 'Tidak',
        noKps: '',
        namaAyah: '',
        tahunLahirAyah: '1975',
        jenjangPendidikanAyah: 'SMA / sederajat',
        pekerjaanAyah: 'Wiraswasta',
        penghasilanAyah: 'Rp1.000.001 - Rp3.000.000',
        nikAyah: '',
        namaIbu: '',
        tahunLahirIbu: '1978',
        jenjangPendidikanIbu: 'SMA / sederajat',
        pekerjaanIbu: 'Ibu Rumah Tangga',
        penghasilanIbu: 'Tidak Berpenghasilan',
        nikIbu: '',
        namaWali: '',
        tahunLahirWali: '',
        jenjangPendidikanWali: 'Tidak sekolah',
        pekerjaanWali: '',
        penghasilanWali: '< Rp1.000.000',
        nikWali: '',
        noPesertaUN: '',
        noSeriIjazah: '',
        penerimaKip: 'Tidak',
        nomorKip: '0',
        namaDiKip: '',
        nomorKks: '',
        noRegAktaLahir: '',
        bank: '',
        noRekeningBank: '',
        rekeningAtasNama: '',
        layakPip: 'Tidak',
        alasanLayakPip: '',
        kebutuhanKhusus: 'Tidak ada',
        sekolahAsal: 'SMP Negeri di Surabaya',
        anakKe: 1,
        lintang: '-7.25',
        bujur: '112.75',
        noKk: '',
        beratBadan: 52,
        tinggiBadan: 165,
        lingkarKepala: 54,
        jmlSaudaraKandung: 1,
        jarakSekolah: 1,
        prestasi: 'Siswa Aktif SMAN 9 Surabaya'
      });
    }
    setIsSiswaModalOpen(true);
  };

  const handleSaveSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    const safeNis = siswaFormData.nipd || siswaFormData.nis || `2425${String(siswaList.length + 1).padStart(4, '0')}`;
    const safeKelas = siswaFormData.rombelSaatIni || siswaFormData.kelas || 'X-1';
    const ttlCombined = siswaFormData.tempatLahir && siswaFormData.tanggalLahir 
      ? `${siswaFormData.tempatLahir}, ${siswaFormData.tanggalLahir}` 
      : (siswaFormData.tempatLahir || siswaFormData.tanggalLahir || '-');

    if (editingSiswa) {
      const updatedSiswa: Siswa = {
        ...editingSiswa,
        ...(siswaFormData as Siswa),
        id: editingSiswa.id,
        nis: safeNis,
        nipd: safeNis,
        kelas: safeKelas,
        rombelSaatIni: safeKelas,
        tempatTanggalLahir: ttlCombined,
        namaOrtu: siswaFormData.namaAyah || siswaFormData.namaIbu || siswaFormData.namaWali || editingSiswa.namaOrtu || '-'
      };

      const updatedList = siswaList.map(s => s.id === editingSiswa.id ? updatedSiswa : s);
      onUpdateSiswa(updatedList);
      saveStoredSiswa(updatedList);
      appendAuditLog('UPDATE_SISWA', `Memperbarui profil Dapodik siswa ${siswaFormData.nama} (${safeNis}).`);
    } else {
      const newSiswa: Siswa = {
        ...(siswaFormData as Siswa),
        id: `sis-${Date.now()}`,
        nis: safeNis,
        nipd: safeNis,
        kelas: safeKelas,
        rombelSaatIni: safeKelas,
        tempatTanggalLahir: ttlCombined,
        namaOrtu: siswaFormData.namaAyah || siswaFormData.namaIbu || siswaFormData.namaWali || '-'
      };
      const updatedList = [newSiswa, ...siswaList];
      onUpdateSiswa(updatedList);
      saveStoredSiswa(updatedList);
      appendAuditLog('TAMBAH_SISWA', `Menambahkan siswa baru ke database Dapodik: ${newSiswa.nama} (${safeNis}).`);
    }
    setIsSiswaModalOpen(false);
  };

  const openSiswaExitModal = (siswa: Siswa) => {
    const today = new Date().toISOString().slice(0, 10);
    const defaultMode: ExitModeSiswa =
      siswa.status === 'Berhenti' || siswa.jenisKeluar === 'Berhenti Sekolah'
        ? 'berhenti'
        : 'mutasi';
    setExitModalState({
      entity: 'siswa',
      record: siswa,
      mode: defaultMode,
      tanggalKeluar: siswa.tanggalKeluar || today,
      tujuanMutasi: siswa.tujuanMutasi || '',
      alasanKeluar: siswa.alasanKeluar || '',
      nomorSuratMutasi: siswa.nomorSuratMutasi || '',
      error: ''
    });
  };

  const handleSiswaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSiswaImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const parsed = parseDapodikSiswaExcel(buffer);
      setParsedSiswaImportResult(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteSiswaImport = () => {
    if (!parsedSiswaImportResult || !parsedSiswaImportResult.success || parsedSiswaImportResult.data.length === 0) {
      alert('Tidak ada data siswa valid untuk diimpor.');
      return;
    }

    const importedData = parsedSiswaImportResult.data;
    let finalSiswaList: Siswa[] = [];

    if (siswaImportMode === 'replace') {
      finalSiswaList = importedData;
    } else {
      const existingMap = new Map<string, Siswa>();
      siswaList.forEach(s => {
        const key = s.nisn || s.nipd || s.nis || s.id;
        existingMap.set(key, s);
      });

      importedData.forEach(ns => {
        const key = ns.nisn || ns.nipd || ns.nis || ns.id;
        const matched = existingMap.get(key);
        if (matched) {
          existingMap.set(key, { ...matched, ...ns, id: matched.id });
        } else {
          existingMap.set(key, ns);
        }
      });

      finalSiswaList = Array.from(existingMap.values());
    }

    onUpdateSiswa(finalSiswaList);
    saveStoredSiswa(finalSiswaList);
    appendAuditLog(
      'IMPORT_DAPODIK_CSV', 
      `Mengimpor ${importedData.length} data siswa Dapodik (${siswaImportMode === 'replace' ? 'Mode Timpa Semua' : 'Mode Gabung/Perbarui'}). Total akhir: ${finalSiswaList.length} siswa.`
    );

    alert(`Berhasil mengimpor data! Total sekarang terdapat ${finalSiswaList.length} siswa dalam database.`);
    setIsSiswaImportModalOpen(false);
    setParsedSiswaImportResult(null);
    setSiswaImportFileName('');
  };

  // ===================== GURU & TENDIK HANDLERS =====================
  const handleOpenGuruModal = (person?: Guru | Tendik, entity: 'guru' | 'tendik' = 'guru') => {
    setGtkModalEntity(entity);
    setActiveGuruModalTab('kepegawaian');
    if (person) {
      setEditingGuru(person);
      setGuruFormData({
        ...person,
        status: person.statusKepegawaian || person.status || (entity === 'tendik' ? 'Tenaga Honor Sekolah' : 'PNS'),
        statusKepegawaian: person.statusKepegawaian || person.status || (entity === 'tendik' ? 'Tenaga Honor Sekolah' : 'PNS'),
        mapel: person.mataPelajaran || person.mapel || '',
        mataPelajaran: person.mataPelajaran || person.mapel || '',
        hp: person.hp || person.noHp || '',
        noHp: person.noHp || person.hp || ''
      });
    } else {
      setEditingGuru(null);
      const isTendik = entity === 'tendik';
      const randomNip = isTendik ? '' : `1985${Date.now().toString().slice(-14)}`;
      setGuruFormData({
        nip: randomNip,
        nama: '',
        nuptk: '',
        jenisKelamin: 'L',
        tempatLahir: 'SURABAYA',
        tanggalLahir: '1985-01-01',
        status: isTendik ? 'Tenaga Honor Sekolah' : 'PNS',
        statusKepegawaian: isTendik ? 'Tenaga Honor Sekolah' : 'PNS',
        jenisPtk: isTendik ? 'Tenaga Kependidikan' : 'Guru Mapel',
        jabatan: isTendik ? 'Tenaga Kependidikan' : 'Guru Mata Pelajaran',
        mapel: isTendik ? 'Administrasi & Pelayanan Sekolah' : '',
        mataPelajaran: isTendik ? 'Administrasi & Pelayanan Sekolah' : '',
        agama: 'Islam',
        alamatJalan: '',
        rt: '0',
        rw: '0',
        namaDusun: '-',
        desaKelurahan: '',
        kecamatan: '',
        kodePos: '60272',
        telepon: '',
        hp: '',
        noHp: '',
        email: '',
        tugasTambahan: '-',
        skCpns: '',
        tanggalCpns: '',
        skPengangkatan: '',
        tmtPengangkatan: '2022-05-01',
        lembagaPengangkatan: isTendik ? 'Kepala Sekolah' : 'Pemerintah Propinsi',
        pangkatGolongan: isTendik ? '-' : 'Penata Muda (III/a)',
        sumberGaji: isTendik ? 'APBD Kabupaten/Kota' : 'APBD Provinsi',
        namaIbuKandung: '',
        statusPerkawinan: 'Kawin',
        namaSuamiIstri: '',
        nipSuamiIstri: '',
        pekerjaanSuamiIstri: '',
        tmtPns: isTendik ? '' : '2022-05-01',
        sudahLisensiKepalaSekolah: 'Tidak',
        pernahDiklatKepengawasan: 'Tidak',
        keahlianBraille: 'Tidak',
        keahlianBahasaIsyarat: 'Tidak',
        npwp: '',
        namaWajibPajak: '',
        kewarganegaraan: 'ID',
        bank: 'Bank Jatim',
        nomorRekeningBank: '',
        rekeningAtasNama: '',
        nik: '',
        noKk: '',
        karpeg: '',
        karisKarsu: '',
        lintang: '-7.25',
        bujur: '112.75',
        nuks: 'Ya'
      });
    }
    setIsGuruModalOpen(true);
  };

  const handleSaveGuru = (e: React.FormEvent) => {
    e.preventDefault();
    const isTendik = gtkModalEntity === 'tendik';
    const safeHp = guruFormData.hp || guruFormData.noHp || '';
    const safeMapel = guruFormData.mataPelajaran || guruFormData.mapel || (isTendik ? 'Tenaga Kependidikan' : 'Mata Pelajaran Umum');
    const safeStatus = guruFormData.statusKepegawaian || guruFormData.status || (isTendik ? 'Tenaga Honor Sekolah' : 'PNS');

    if (isTendik) {
      if (editingGuru) {
        const updatedTendik: Tendik = {
          ...editingGuru,
          ...(guruFormData as Tendik),
          id: editingGuru.id,
          mapel: safeMapel,
          mataPelajaran: safeMapel,
          status: safeStatus,
          statusKepegawaian: safeStatus,
          hp: safeHp,
          noHp: safeHp
        };
        const updatedList = tendikList.map(t => t.id === editingGuru.id ? updatedTendik : t);
        onUpdateTendik(updatedList);
        saveStoredTendik(updatedList);
        appendAuditLog('UPDATE_TENDIK', `Memperbarui data Dapodik GTK Tendik ${guruFormData.nama}.`);
      } else {
        const newTendik: Tendik = {
          ...(guruFormData as Tendik),
          id: `tdk-${Date.now()}`,
          nip: guruFormData.nip || '',
          nama: guruFormData.nama || '',
          pangkatGolongan: guruFormData.pangkatGolongan || '-',
          jabatan: guruFormData.jabatan || 'Tenaga Kependidikan',
          mapel: safeMapel,
          mataPelajaran: safeMapel,
          status: safeStatus,
          statusKepegawaian: safeStatus,
          hp: safeHp,
          noHp: safeHp
        };
        const updatedList = [newTendik, ...tendikList];
        onUpdateTendik(updatedList);
        saveStoredTendik(updatedList);
        appendAuditLog('TAMBAH_TENDIK', `Menambahkan tenaga kependidikan (Tendik) baru: ${newTendik.nama}.`);
      }
      setIsGuruModalOpen(false);
      return;
    }

    if (editingGuru) {
      const updatedGuru: Guru = {
        ...editingGuru,
        ...(guruFormData as Guru),
        id: editingGuru.id,
        mapel: safeMapel,
        mataPelajaran: safeMapel,
        status: safeStatus,
        statusKepegawaian: safeStatus,
        hp: safeHp,
        noHp: safeHp
      };
      const updatedList = guruList.map(g => g.id === editingGuru.id ? updatedGuru : g);
      onUpdateGuru(updatedList);
      saveStoredGuru(updatedList);
      appendAuditLog('UPDATE_GURU', `Memperbarui data Dapodik GTK guru ${guruFormData.nama} (${guruFormData.nip}).`);
    } else {
      const newGuru: Guru = {
        ...(guruFormData as Guru),
        id: `gur-${Date.now()}`,
        nip: guruFormData.nip || `1985${Date.now().toString().slice(-14)}`,
        nama: guruFormData.nama || '',
        pangkatGolongan: guruFormData.pangkatGolongan || 'Penata Muda (III/a)',
        jabatan: guruFormData.jabatan || 'Guru Mata Pelajaran',
        mapel: safeMapel,
        mataPelajaran: safeMapel,
        status: safeStatus,
        statusKepegawaian: safeStatus,
        hp: safeHp,
        noHp: safeHp
      };
      const updatedList = [newGuru, ...guruList];
      onUpdateGuru(updatedList);
      saveStoredGuru(updatedList);
      appendAuditLog('TAMBAH_GURU', `Menambahkan tenaga pendidik baru ke database Dapodik GTK: ${newGuru.nama} (${newGuru.nip}).`);
    }
    setIsGuruModalOpen(false);
  };

  const openGtkExitModal = (gtk: Guru, entity: 'guru' | 'tendik') => {
    const today = new Date().toISOString().slice(0, 10);
    let defaultMode: ExitModeGtk = 'mutasi';
    if (gtk.statusAktif === 'Meninggal Dunia' || gtk.jenisKeluar === 'Meninggal Dunia') {
      defaultMode = 'meninggal';
    } else if (
      gtk.statusAktif === 'Berhenti' ||
      gtk.statusAktif === 'Pensiun' ||
      gtk.jenisKeluar === 'Berhenti' ||
      gtk.jenisKeluar === 'Pensiun'
    ) {
      defaultMode = 'berhenti';
    }
    setExitModalState({
      entity,
      record: gtk,
      mode: defaultMode,
      tanggalKeluar: gtk.tanggalKeluar || today,
      tujuanMutasi: gtk.tujuanMutasi || '',
      alasanKeluar: gtk.alasanKeluar || '',
      nomorSuratMutasi: '',
      error: ''
    });
  };

  const handleConfirmExitOrDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitModalState) return;
    const { entity, record, mode, tanggalKeluar, tujuanMutasi, alasanKeluar, nomorSuratMutasi } = exitModalState;

    if (entity === 'siswa') {
      const siswa = record as Siswa;
      if (mode === 'hapus_permanen') {
        const updated = siswaList.filter(s => s.id !== siswa.id);
        onUpdateSiswa(updated);
        saveStoredSiswa(updated);
        appendAuditLog('HAPUS_SISWA', `Menghapus permanen data siswa ${siswa.nama}.`);
        setMasterFeedback({ type: 'info', text: `Data siswa "${siswa.nama}" telah dihapus permanen dari database.` });
        setExitModalState(null);
        return;
      }

      if (mode === 'mutasi' && !tujuanMutasi.trim()) {
        setExitModalState(prev => prev ? { ...prev, error: 'Harap jelaskan sekolah/instansi tujuan mutasi siswa.' } : prev);
        return;
      }

      if (mode === 'berhenti' && !alasanKeluar.trim()) {
        setExitModalState(prev => prev ? { ...prev, error: 'Harap tuliskan alasan siswa berhenti sekolah.' } : prev);
        return;
      }

      const nextStatus: Siswa['status'] = mode === 'mutasi' ? 'Mutasi' : 'Berhenti';
      const nextJenisKeluar: Siswa['jenisKeluar'] = mode === 'mutasi' ? 'Mutasi' : 'Berhenti Sekolah';
      const updatedSiswa: Siswa = {
        ...siswa,
        status: nextStatus,
        jenisKeluar: nextJenisKeluar,
        tanggalKeluar: tanggalKeluar || new Date().toISOString().slice(0, 10),
        tujuanMutasi: mode === 'mutasi' ? tujuanMutasi.trim() : undefined,
        alasanKeluar: alasanKeluar.trim() || undefined,
        nomorSuratMutasi: mode === 'mutasi' && nomorSuratMutasi.trim() ? nomorSuratMutasi.trim() : undefined
      };

      const updatedList = siswaList.map(s => (s.id === siswa.id ? updatedSiswa : s));
      onUpdateSiswa(updatedList);
      saveStoredSiswa(updatedList);

      // Sinkronkan ke metadata Buku Induk Siswa
      const metaMap = getStoredBukuIndukSiswaMeta();
      const existingMeta = metaMap[siswa.id] || {};
      const bukuIndukReason =
        mode === 'mutasi'
          ? `Mutasi ke ${tujuanMutasi.trim()}${alasanKeluar.trim() ? ` (${alasanKeluar.trim()})` : ''}${nomorSuratMutasi.trim() ? ` [No. Surat: ${nomorSuratMutasi.trim()}]` : ''}`
          : `Berhenti Sekolah: ${alasanKeluar.trim()}`;
      saveStoredBukuIndukSiswaMeta({
        ...metaMap,
        [siswa.id]: {
          ...existingMeta,
          tanggalKeluarMutasi: updatedSiswa.tanggalKeluar || '',
          alasanKeluarMutasi: bukuIndukReason
        }
      });

      appendAuditLog(
        mode === 'mutasi' ? 'SISWA_MUTASI' : 'SISWA_BERHENTI',
        `Mencatat siswa keluar (${nextJenisKeluar}): ${siswa.nama} — ${bukuIndukReason}.`
      );
      setMasterFeedback({
        type: 'success',
        text: `Status siswa "${siswa.nama}" diperbarui menjadi ${nextJenisKeluar} (${mode === 'mutasi' ? `Tujuan: ${tujuanMutasi.trim()}` : `Alasan: ${alasanKeluar.trim()}`}).`
      });
      setExitModalState(null);
      return;
    }

    // GTK: Guru atau Tendik
    const gtk = record as Guru;
    const entityLabel = entity === 'tendik' ? 'Tendik' : 'Guru';

    if (mode === 'hapus_permanen') {
      if (entity === 'tendik') {
        const updated = tendikList.filter(t => t.id !== gtk.id);
        onUpdateTendik(updated);
        saveStoredTendik(updated);
        appendAuditLog('HAPUS_TENDIK', `Menghapus permanen data tendik ${gtk.nama}.`);
      } else {
        const updated = guruList.filter(g => g.id !== gtk.id);
        onUpdateGuru(updated);
        saveStoredGuru(updated);
        appendAuditLog('HAPUS_GURU', `Menghapus permanen data guru ${gtk.nama}.`);
      }
      setMasterFeedback({ type: 'info', text: `Data ${entityLabel} "${gtk.nama}" telah dihapus permanen dari database.` });
      setExitModalState(null);
      return;
    }

    if (mode === 'mutasi' && !tujuanMutasi.trim()) {
      setExitModalState(prev => prev ? { ...prev, error: 'Harap tuliskan unit kerja / sekolah tujuan mutasi.' } : prev);
      return;
    }

    if (mode === 'berhenti' && !alasanKeluar.trim()) {
      setExitModalState(prev => prev ? { ...prev, error: 'Harap pilih atau tuliskan keterangan berhenti / pensiun.' } : prev);
      return;
    }

    const nextStatusAktif: Guru['statusAktif'] =
      mode === 'mutasi' ? 'Mutasi' : mode === 'meninggal' ? 'Meninggal Dunia' : 'Berhenti';
    const updatedGtk: Guru = {
      ...gtk,
      statusAktif: nextStatusAktif,
      jenisKeluar: nextStatusAktif,
      tanggalKeluar: tanggalKeluar || new Date().toISOString().slice(0, 10),
      tujuanMutasi: mode === 'mutasi' ? tujuanMutasi.trim() : undefined,
      alasanKeluar: alasanKeluar.trim() || undefined
    };

    if (entity === 'tendik') {
      const updatedList = tendikList.map(t => (t.id === gtk.id ? (updatedGtk as Tendik) : t));
      onUpdateTendik(updatedList);
      saveStoredTendik(updatedList);
    } else {
      const updatedList = guruList.map(g => (g.id === gtk.id ? updatedGtk : g));
      onUpdateGuru(updatedList);
      saveStoredGuru(updatedList);
    }

    const detailLog =
      mode === 'mutasi'
        ? `Mutasi ke ${tujuanMutasi.trim()}${alasanKeluar.trim() ? ` (${alasanKeluar.trim()})` : ''}`
        : mode === 'meninggal'
        ? `Meninggal Dunia${alasanKeluar.trim() ? ` (${alasanKeluar.trim()})` : ''}`
        : `Berhenti: ${alasanKeluar.trim()}`;

    appendAuditLog(
      entity === 'tendik' ? 'TENDIK_KELUAR' : 'GURU_KELUAR',
      `Mencatat ${entityLabel} keluar (${nextStatusAktif}): ${gtk.nama} — ${detailLog}.`
    );
    setMasterFeedback({
      type: 'success',
      text: `Status ${entityLabel} "${gtk.nama}" dicatat sebagai ${nextStatusAktif} (${detailLog}).`
    });
    setExitModalState(null);
  };

  const handleRestoreActive = (entity: 'siswa' | 'guru' | 'tendik', record: Siswa | Guru) => {
    if (entity === 'siswa') {
      const siswa = record as Siswa;
      const updatedSiswa: Siswa = {
        ...siswa,
        status: 'Aktif',
        jenisKeluar: undefined,
        tanggalKeluar: undefined,
        tujuanMutasi: undefined,
        alasanKeluar: undefined,
        nomorSuratMutasi: undefined
      };
      const updatedList = siswaList.map(s => (s.id === siswa.id ? updatedSiswa : s));
      onUpdateSiswa(updatedList);
      saveStoredSiswa(updatedList);

      const metaMap = getStoredBukuIndukSiswaMeta();
      if (metaMap[siswa.id]) {
        saveStoredBukuIndukSiswaMeta({
          ...metaMap,
          [siswa.id]: {
            ...metaMap[siswa.id],
            tanggalKeluarMutasi: '',
            alasanKeluarMutasi: ''
          }
        });
      }
      appendAuditLog('AKTIFKAN_SISWA', `Mengaktifkan kembali status siswa ${siswa.nama} menjadi Aktif.`);
      setMasterFeedback({ type: 'success', text: `Siswa "${siswa.nama}" telah diaktifkan kembali.` });
      return;
    }

    const gtk = record as Guru;
    const updatedGtk: Guru = {
      ...gtk,
      statusAktif: 'Aktif',
      jenisKeluar: undefined,
      tanggalKeluar: undefined,
      tujuanMutasi: undefined,
      alasanKeluar: undefined
    };
    if (entity === 'tendik') {
      const updatedList = tendikList.map(t => (t.id === gtk.id ? (updatedGtk as Tendik) : t));
      onUpdateTendik(updatedList);
      saveStoredTendik(updatedList);
      appendAuditLog('AKTIFKAN_TENDIK', `Mengaktifkan kembali status tendik ${gtk.nama} menjadi Aktif.`);
    } else {
      const updatedList = guruList.map(g => (g.id === gtk.id ? updatedGtk : g));
      onUpdateGuru(updatedList);
      saveStoredGuru(updatedList);
      appendAuditLog('AKTIFKAN_GURU', `Mengaktifkan kembali status guru ${gtk.nama} menjadi Aktif.`);
    }
    setMasterFeedback({
      type: 'success',
      text: `${entity === 'tendik' ? 'Tendik' : 'Guru'} "${gtk.nama}" telah diaktifkan kembali.`
    });
  };

  const handleGuruFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setGuruImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const parsed = gtkImportEntity === 'tendik'
        ? parseDapodikTendikExcel(buffer)
        : parseDapodikGuruExcel(buffer);
      setParsedGuruImportResult(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteGuruImport = () => {
    if (!parsedGuruImportResult || !parsedGuruImportResult.success || parsedGuruImportResult.data.length === 0) {
      alert('Tidak ada data GTK valid untuk diimpor.');
      return;
    }

    const importedData = parsedGuruImportResult.data;
    const isTendik = gtkImportEntity === 'tendik';

    if (isTendik) {
      const existingPhotoByKey = new Map<string, string>();
      tendikList.forEach(t => {
        if (t.fotoUrl) {
          const k = (t.nik || t.nip || t.nuptk || t.nama || t.id).toLowerCase();
          existingPhotoByKey.set(k, t.fotoUrl);
        }
      });
      let finalTendikList: Tendik[] = [];
      if (guruImportMode === 'replace') {
        finalTendikList = (importedData as Tendik[]).map(nt => {
          const k = (nt.nik || nt.nip || nt.nuptk || nt.nama || nt.id).toLowerCase();
          return nt.fotoUrl ? nt : { ...nt, fotoUrl: existingPhotoByKey.get(k) || '' };
        });
      } else {
        const existingMap = new Map<string, Tendik>();
        tendikList.forEach(t => {
          const key = (t.nik || t.nip || t.nuptk || t.nama || t.id).toLowerCase();
          existingMap.set(key, t);
        });
        importedData.forEach(nt => {
          const key = (nt.nik || nt.nip || nt.nuptk || nt.nama || nt.id).toLowerCase();
          const matched = existingMap.get(key);
          if (matched) {
            existingMap.set(key, {
              ...matched,
              ...nt,
              id: matched.id,
              fotoUrl: nt.fotoUrl || matched.fotoUrl || ''
            });
          } else {
            existingMap.set(key, nt as Tendik);
          }
        });
        finalTendikList = Array.from(existingMap.values());
      }

      onUpdateTendik(finalTendikList);
      saveStoredTendik(finalTendikList);
      appendAuditLog(
        'IMPORT_DAPODIK_TENDIK_EXCEL',
        `Mengimpor ${importedData.length} data GTK Tendik Dapodik (${guruImportMode === 'replace' ? 'Mode Timpa Semua' : 'Mode Gabung/Perbarui'}). Total akhir: ${finalTendikList.length} tendik.`
      );
      alert(`Berhasil mengimpor data GTK Tendik! Total sekarang terdapat ${finalTendikList.length} tenaga kependidikan dalam database.`);
    } else {
      const existingPhotoByKey = new Map<string, string>();
      guruList.forEach(g => {
        if (g.fotoUrl) {
          const k = (g.nip || g.nuptk || g.nama || g.id).toLowerCase();
          existingPhotoByKey.set(k, g.fotoUrl);
        }
      });
      let finalGuruList: Guru[] = [];
      if (guruImportMode === 'replace') {
        finalGuruList = importedData.map(ng => {
          const k = (ng.nip || ng.nuptk || ng.nama || ng.id).toLowerCase();
          return ng.fotoUrl ? ng : { ...ng, fotoUrl: existingPhotoByKey.get(k) || '' };
        });
      } else {
        const existingMap = new Map<string, Guru>();
        guruList.forEach(g => {
          const key = g.nip || g.nuptk || g.id;
          existingMap.set(key, g);
        });

        importedData.forEach(ng => {
          const key = ng.nip || ng.nuptk || ng.id;
          const matched = existingMap.get(key);
          if (matched) {
            existingMap.set(key, {
              ...matched,
              ...ng,
              id: matched.id,
              fotoUrl: ng.fotoUrl || matched.fotoUrl || ''
            });
          } else {
            existingMap.set(key, ng);
          }
        });

        finalGuruList = Array.from(existingMap.values());
      }

      onUpdateGuru(finalGuruList);
      saveStoredGuru(finalGuruList);
      appendAuditLog(
        'IMPORT_DAPODIK_GURU_CSV',
        `Mengimpor ${importedData.length} data GTK guru Dapodik (${guruImportMode === 'replace' ? 'Mode Timpa Semua' : 'Mode Gabung/Perbarui'}). Total akhir: ${finalGuruList.length} guru.`
      );
      alert(`Berhasil mengimpor data GTK! Total sekarang terdapat ${finalGuruList.length} tenaga pendidik dalam database.`);
    }

    setIsGuruImportModalOpen(false);
    setParsedGuruImportResult(null);
    setGuruImportFileName('');
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Database Induk Siswa, Guru & Tendik SMAN 9 Surabaya
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              <FileSpreadsheet className="w-3 h-3 text-blue-600" />
              Format Standar Dapodik Kemendikbud
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'siswa' 
              ? 'Kelola data pokok 51 kolom peserta didik (NIPD, NISN, NIK, Rombel, Alamat, Orang Tua, Bantuan PIP/KIP, Data Periodik) dengan import & export resmi.'
              : activeTab === 'guru'
              ? 'Kelola data pokok 51 kolom GTK Pendidik / Guru (NUPTK, NIP, Status Kepegawaian, Jenis PTK, SK Pengangkatan, TMT, NPWP, NIK, Karpeg) siap cetak dan SPT.'
              : 'Kelola data pokok 51 kolom Tenaga Kependidikan / Tendik (Staf TU, Kepala Sekolah, Tenaga Honor Sekolah, PPPK, PNS, SK Pengangkatan, NPWP, NIK).'}
          </p>
        </div>

        {/* Tab Switcher & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Main Tab Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('siswa'); setSearchTerm(''); }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'siswa' 
                  ? 'bg-white text-blue-900 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Data Siswa ({siswaList.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('guru'); setSearchTerm(''); }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'guru' 
                  ? 'bg-white text-blue-900 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Data Guru ({guruList.length})</span>
            </button>
            <button
              onClick={() => { setActiveTab('tendik'); setSearchTerm(''); }}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'tendik' 
                  ? 'bg-white text-blue-900 shadow-xs font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Data Tendik ({tendikList.length})</span>
            </button>
          </div>

          {/* Action buttons for Siswa */}
          {activeTab === 'siswa' && (
            <>
              <button
                onClick={downloadDapodikSiswaExcelTemplate}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Unduh berkas template Excel (XLSX) Dapodik Siswa dengan format bertingkat Data Ayah, Data Ibu, Data Wali sesuai contoh"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Template Excel Siswa</span>
              </button>

              {canEdit && (
                <button
                  onClick={() => setIsSiswaImportModalOpen(true)}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Import berkas Excel (.xlsx / .xls) atau CSV Dapodik Siswa"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Import Excel Siswa</span>
                </button>
              )}

              <button
                onClick={() => exportDapodikSiswaToExcel(filteredSiswa)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Ekspor seluruh data siswa ke format Excel (.xlsx) standar Dapodik Kemendikbud"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>

              {canEdit && (
                <button
                  onClick={() => handleOpenSiswaModal()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Siswa</span>
                </button>
              )}
            </>
          )}

          {/* Action buttons for Guru */}
          {activeTab === 'guru' && (
            <>
              <button
                onClick={downloadDapodikGuruExcelTemplate}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Unduh berkas template Excel (XLSX) Dapodik Guru GTK 51 kolom lengkap sesuai contoh"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Template Excel Guru</span>
              </button>

              {canEdit && (
                <button
                  onClick={() => {
                    setGtkImportEntity('guru');
                    setParsedGuruImportResult(null);
                    setGuruImportFileName('');
                    setIsGuruImportModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Import berkas Excel (.xlsx / .xls) atau CSV Dapodik GTK Guru"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Import Excel Guru</span>
                </button>
              )}

              <button
                onClick={() => exportDapodikGuruToExcel(filteredGuru)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Ekspor 51 kolom data GTK Guru ke berkas Excel (.xlsx) resmi"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor Excel Guru (.xlsx)</span>
              </button>

              {canEdit && (
                <button
                  onClick={() => handleOpenGuruModal(undefined, 'guru')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Guru</span>
                </button>
              )}
            </>
          )}

          {/* Action buttons for Tendik */}
          {activeTab === 'tendik' && (
            <>
              <button
                onClick={downloadDapodikTendikExcelTemplate}
                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Unduh berkas template Excel (XLSX) Dapodik Tendik 51 kolom lengkap (14 contoh data sesuai gambar)"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Template Excel Tendik</span>
              </button>

              {canEdit && (
                <button
                  onClick={() => {
                    setGtkImportEntity('tendik');
                    setParsedGuruImportResult(null);
                    setGuruImportFileName('');
                    setIsGuruImportModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Import berkas Excel (.xlsx / .xls) atau CSV Dapodik Tenaga Kependidikan (Tendik)"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Import Excel Tendik</span>
                </button>
              )}

              <button
                onClick={() => exportDapodikTendikToExcel(filteredTendik)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Ekspor 51 kolom data GTK Tendik ke berkas Excel (.xlsx) resmi"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Ekspor Excel Tendik (.xlsx)</span>
              </button>

              {canEdit && (
                <button
                  onClick={() => handleOpenGuruModal(undefined, 'tendik')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tendik</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Ringkasan Statistik Master Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setActiveTab('guru'); setSearchTerm(''); }}
          className={`text-left bg-white border rounded-lg p-4 shadow-xs transition-colors hover:border-emerald-300 ${
            activeTab === 'guru' ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Jumlah Guru
            </span>
            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {masterStats.jumlahGuru}
            </span>
            <span className="text-xs font-medium text-slate-500">pendidik</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-600 tabular-nums">
            PNS {masterStats.guruPns} · PPPK {masterStats.guruPppk} · GTT {masterStats.guruHonorer}
            {masterStats.guruKeluarCount > 0 && ` · ${masterStats.guruKeluarCount} keluar/mutasi`}
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('tendik'); setSearchTerm(''); }}
          className={`text-left bg-white border rounded-lg p-4 shadow-xs transition-colors hover:border-amber-300 ${
            activeTab === 'tendik' ? 'border-amber-400 ring-1 ring-amber-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Jumlah Tendik
            </span>
            <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {masterStats.jumlahTendik}
            </span>
            <span className="text-xs font-medium text-slate-500">pegawai TU</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-600 tabular-nums">
            ASN {masterStats.tendikAsn} · Non-ASN/Honorer {masterStats.tendikHonorer}
            {masterStats.tendikKeluarCount > 0 && ` · ${masterStats.tendikKeluarCount} keluar/mutasi`}
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('siswa'); setSearchTerm(''); }}
          className={`text-left bg-white border rounded-lg p-4 shadow-xs transition-colors hover:border-blue-300 ${
            activeTab === 'siswa' ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Jumlah Peserta Didik
            </span>
            <GraduationCap className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {masterStats.jumlahSiswa}
            </span>
            <span className="text-xs font-medium text-slate-500">siswa aktif</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-600 tabular-nums">
            Tersebar pada {masterStats.jumlahRombel} rombel aktif
            {masterStats.siswaKeluarCount > 0 && ` · ${masterStats.siswaKeluarCount} mutasi/keluar`}
          </div>
        </button>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Profil Lengkap (GTK)
            </span>
            <span className="text-[11px] font-mono font-semibold text-slate-600 tabular-nums">
              {masterStats.gtkBiodataLengkapCount}/{masterStats.totalGtk} siap
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {masterStats.persenProfilLengkap}%
            </span>
            <span className="text-xs font-medium text-slate-500">
              rata-rata kelengkapan
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, masterStats.persenProfilLengkap))}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10.5px] text-slate-500 tabular-nums">
            Guru {masterStats.guruLengkapPct}% · Tendik {masterStats.tendikLengkapPct}% · Foto {masterStats.gtkFotoCount}/{masterStats.totalGtk}
          </div>
        </div>
      </div>

      {masterFeedback && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-xs ${
            masterFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : masterFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {masterFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
            )}
            <span className="font-medium">{masterFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMasterFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-0.5"
            title="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter, Search & View Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              activeTab === 'siswa' 
                ? 'Cari nama siswa, NIPD, NISN, NIK, alamat, atau asal SMP...' 
                : activeTab === 'guru'
                ? 'Cari nama guru, NIP, NUPTK, mapel, atau tugas tambahan...'
                : 'Cari nama tendik, NIK, NIP, NUPTK, jabatan, atau email...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
        </div>

        {activeTab === 'siswa' ? (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Rombel */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Rombel:</span>
              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">Semua Rombel</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Filter JK */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">JK:</span>
              <select
                value={filterJK}
                onChange={e => setFilterJK(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">L & P</option>
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            {/* Filter PIP */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Bantuan PIP:</span>
              <select
                value={filterPip}
                onChange={e => setFilterPip(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">Semua</option>
                <option value="YA">Layak PIP / KIP</option>
                <option value="TIDAK">Bukan Penerima</option>
              </select>
            </div>

            {/* Filter Keaktifan Siswa */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Keaktifan:</span>
              <select
                value={filterKeaktifanSiswa}
                onChange={e => setFilterKeaktifanSiswa(e.target.value as 'SEMUA' | 'AKTIF' | 'KELUAR')}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">Semua</option>
                <option value="AKTIF">Aktif</option>
                <option value="KELUAR">Keluar / Mutasi / Berhenti</option>
              </select>
            </div>

            {/* Toggle Table View Mode */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded border border-slate-200">
              <button
                onClick={() => setTableViewMode('ringkas')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                  tableViewMode === 'ringkas' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
                title="Tampilan Kolom Ringkas Administrasi"
              >
                <Columns className="w-3 h-3" />
                <span>Ringkas</span>
              </button>
              <button
                onClick={() => setTableViewMode('dapodik_lengkap')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                  tableViewMode === 'dapodik_lengkap' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
                title="Tampilan Tabel Dapodik Lengkap (51 Kolom persis template)"
              >
                <Table className="w-3 h-3" />
                <span>Dapodik 51 Kolom</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'guru' ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status Kepegawaian:</span>
              <select
                value={filterStatusGuru}
                onChange={e => setFilterStatusGuru(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="GTT">GTT / Honorer</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">JK:</span>
              <select
                value={filterJKGuru}
                onChange={e => setFilterJKGuru(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">L & P</option>
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Keaktifan:</span>
              <select
                value={filterKeaktifanGtk}
                onChange={e => setFilterKeaktifanGtk(e.target.value as 'SEMUA' | 'AKTIF' | 'KELUAR')}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">Semua</option>
                <option value="AKTIF">Aktif</option>
                <option value="KELUAR">Keluar / Mutasi / Meninggal</option>
              </select>
            </div>

            {/* Toggle Table View Mode for Guru */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded border border-slate-200">
              <button
                onClick={() => setTableViewMode('ringkas')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                  tableViewMode === 'ringkas' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
                title="Tampilan Ringkas Guru"
              >
                <Columns className="w-3 h-3" />
                <span>Ringkas</span>
              </button>
              <button
                onClick={() => setTableViewMode('dapodik_lengkap')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                  tableViewMode === 'dapodik_lengkap' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
                title="Tampilan Tabel Dapodik GTK Lengkap (51 Kolom)"
              >
                <Table className="w-3 h-3" />
                <span>Dapodik GTK 51 Kolom</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Status Kepegawaian:</span>
              <select
                value={filterStatusTendik}
                onChange={e => setFilterStatusTendik(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="Tenaga Honor Sekolah">Tenaga Honor Sekolah</option>
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">JK:</span>
              <select
                value={filterJKTendik}
                onChange={e => setFilterJKTendik(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">L & P</option>
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Keaktifan:</span>
              <select
                value={filterKeaktifanGtk}
                onChange={e => setFilterKeaktifanGtk(e.target.value as 'SEMUA' | 'AKTIF' | 'KELUAR')}
                className="px-2 py-1.5 border border-slate-200 rounded bg-white text-slate-700 font-medium"
              >
                <option value="SEMUA">Semua</option>
                <option value="AKTIF">Aktif</option>
                <option value="KELUAR">Keluar / Mutasi / Meninggal</option>
              </select>
            </div>

            {/* Toggle Table View Mode for Tendik */}
            <div className="inline-flex p-0.5 bg-slate-100 rounded border border-slate-200">
              <button
                onClick={() => setTableViewMode('ringkas')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                  tableViewMode === 'ringkas' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
                title="Tampilan Ringkas Tendik"
              >
                <Columns className="w-3 h-3" />
                <span>Ringkas</span>
              </button>
              <button
                onClick={() => setTableViewMode('dapodik_lengkap')}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 ${
                  tableViewMode === 'dapodik_lengkap' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
                title="Tampilan Tabel Dapodik Tendik Lengkap (51 Kolom)"
              >
                <Table className="w-3 h-3" />
                <span>Dapodik 51 Kolom</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {activeTab === 'siswa' ? (
          tableViewMode === 'ringkas' ? (
            /* Tampilan Ringkas Administrasi Siswa */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-4">Nama Peserta Didik</th>
                    <th className="py-3 px-3">NIPD / NIS</th>
                    <th className="py-3 px-3 text-center">JK</th>
                    <th className="py-3 px-4">NISN</th>
                    <th className="py-3 px-3">Rombel</th>
                    <th className="py-3 px-4">Tempat, Tanggal Lahir</th>
                    <th className="py-3 px-4">Kontak HP / Alamat</th>
                    <th className="py-3 px-3">PIP / KIP</th>
                    <th className="py-3 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
                        Tidak ada data siswa yang cocok dengan filter / pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSiswa.map((s, idx) => {
                      const ttl = s.tempatTanggalLahir || (s.tempatLahir && s.tanggalLahir ? `${s.tempatLahir}, ${s.tanggalLahir}` : (s.tempatLahir || '-'));
                      const rombel = s.rombelSaatIni || s.kelas;
                      const isPip = s.layakPip === 'Ya' || s.penerimaKip === 'Ya';
                      const exited = isSiswaExitedRecord(s);
                      const exitSummary = formatSiswaExitSummary(s);

                      return (
                        <tr key={s.id} className={`transition-colors ${exited ? 'bg-slate-50/70 text-slate-500 hover:bg-slate-100/70' : 'hover:bg-slate-50/80'}`}>
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span className={exited ? 'text-slate-600' : 'text-slate-900'}>{s.nama}</span>
                              {s.nik && <span className="text-[10px] text-slate-400 font-normal">({s.nik})</span>}
                              {exited && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  {s.jenisKeluar || s.status}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Ortu: <span className="font-medium text-slate-700">{s.namaAyah || s.namaOrtu || '-'}</span>
                            </div>
                            {exited && (
                              <div className="text-[10.5px] text-rose-700 mt-0.5 font-medium">
                                {exitSummary}{s.tanggalKeluar ? ` (${s.tanggalKeluar})` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800">{s.nipd || s.nis || '-'}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.jenisKelamin === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {s.jenisKelamin}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">{s.nisn}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex px-2 py-0.5 rounded font-bold text-blue-900 bg-blue-50 border border-blue-200 text-[11px]">
                              {rombel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <div>{ttl}</div>
                            {s.agama && <div className="text-[10px] text-slate-400">{s.agama}</div>}
                          </td>
                          <td className="py-3 px-4 max-w-xs text-slate-600">
                            {s.hp ? (
                              <div className="font-mono text-slate-800 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{s.hp}</span>
                              </div>
                            ) : null}
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{s.alamat || '-'}</div>
                          </td>
                          <td className="py-3 px-3">
                            {isPip ? (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Layak PIP
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setInspectSiswa(s)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Lihat Profil Dapodik Lengkap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {onSelectForLetter && (
                                <button
                                  onClick={() => onSelectForLetter({ type: 'siswa', data: s })}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                  title="Buat Surat Rekomendasi/Keterangan untuk siswa ini"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Surat</span>
                                </button>
                              )}

                              {canEdit && (
                                <>
                                  {exited && (
                                    <button
                                      onClick={() => handleRestoreActive('siswa', s)}
                                      className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                                      title="Aktifkan Kembali Siswa"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenSiswaModal(s)}
                                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit Data Siswa"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openSiswaExitModal(s)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    title="Catat Keluar / Mutasi / Hapus Siswa"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Tampilan Dapodik Siswa 51 Kolom */
            <div className="overflow-x-auto max-h-[600px] border-t border-slate-200">
              <table className="w-max text-left border-collapse text-[11px]">
                <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 shadow-xs">
                  <tr className="text-slate-700 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center sticky left-0 bg-slate-100 z-30">No</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 sticky left-10 bg-slate-100 z-30 min-w-[180px]">Nama</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NIPD</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">JK</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NISN</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tempat Lahir</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tanggal Lahir</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NIK</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Agama</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[200px]">Alamat</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">RT</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">RW</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Kelurahan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Kecamatan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Kode Pos</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Jenis Tinggal</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Alat Transportasi</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">HP</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Penerima KPS</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50 text-blue-950 font-bold min-w-[150px]">Nama Ayah</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50 text-blue-950">Th Lahir Ayah</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50 text-blue-950">Jenjang Ayah</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50 text-blue-950">Pekerjaan Ayah</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50 text-blue-950">Penghasilan Ayah</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-blue-50 text-blue-950">NIK Ayah</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-pink-50 text-pink-950 font-bold min-w-[150px]">Nama Ibu</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-pink-50 text-pink-950">Th Lahir Ibu</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-pink-50 text-pink-950">Jenjang Ibu</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-pink-50 text-pink-950">Pekerjaan Ibu</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-pink-50 text-pink-950">Penghasilan Ibu</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-pink-50 text-pink-950">NIK Ibu</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 bg-amber-50 text-amber-950 font-bold">Rombel Saat Ini</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Penerima KIP</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">No. Akta Lahir</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Layak PIP</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Alasan Layak PIP</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[160px]">Sekolah Asal</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">Anak ke</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Lintang</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Bujur</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">No KK</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">BB (kg)</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">TB (cm)</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">LK (cm)</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">Saudara</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">Jarak (km)</th>
                    <th className="py-2.5 px-3 sticky right-0 bg-slate-100 z-30 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px] whitespace-nowrap">
                  {filteredSiswa.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 border-r border-slate-200 text-center sticky left-0 bg-white font-sans">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-bold font-sans text-slate-900 sticky left-10 bg-white">{s.nama}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-semibold">{s.nipd || s.nis || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center font-bold">
                        <span className={s.jenisKelamin === 'L' ? 'text-blue-700' : 'text-pink-700'}>{s.jenisKelamin}</span>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.nisn || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.tempatLahir || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.tanggalLahir || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.nik || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.agama || 'Islam'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans max-w-xs truncate">{s.alamat || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{s.rt || '0'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{s.rw || '0'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.kelurahan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.kecamatan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.kodePos || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.jenisTinggal || 'Bersama orang tua'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.alatTransportasi || 'Jalan kaki'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.hp || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.penerimaKps || 'Tidak'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-blue-50/30 font-semibold">{s.namaAyah || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 bg-blue-50/30">{s.tahunLahirAyah || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-blue-50/30">{s.jenjangPendidikanAyah || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-blue-50/30">{s.pekerjaanAyah || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-blue-50/30">{s.penghasilanAyah || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 bg-blue-50/30">{s.nikAyah || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-pink-50/30 font-semibold">{s.namaIbu || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 bg-pink-50/30">{s.tahunLahirIbu || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-pink-50/30">{s.jenjangPendidikanIbu || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-pink-50/30">{s.pekerjaanIbu || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-pink-50/30">{s.penghasilanIbu || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 bg-pink-50/30">{s.nikIbu || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans bg-amber-50/40 font-bold text-blue-900">{s.rombelSaatIni || s.kelas}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.penerimaKip || 'Tidak'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.noRegAktaLahir || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.layakPip || 'Tidak'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.alasanLayakPip || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{s.sekolahAsal || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{s.anakKe || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.lintang || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.bujur || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{s.noKk || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{s.beratBadan || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{s.tinggiBadan || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{s.lingkarKepala || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{s.jmlSaudaraKandung || '0'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{s.jarakSekolah || '1'}</td>
                      <td className="py-2 px-3 sticky right-0 bg-white z-30 text-right font-sans">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => setInspectSiswa(s)} className="p-1 text-slate-500 hover:text-blue-600 rounded">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button onClick={() => handleOpenSiswaModal(s)} className="p-1 text-slate-600 hover:text-blue-600 rounded">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB GURU: RINGKAS ATAU DAPODIK GTK 51 KOLOM */
          tableViewMode === 'ringkas' ? (
            /* Tampilan Ringkas Guru */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap & NUPTK</th>
                    <th className="py-3 px-4">NIP</th>
                    <th className="py-3 px-2 text-center">JK</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Jenis PTK / Jabatan</th>
                    <th className="py-3 px-4">Golongan / Sumber Gaji</th>
                    <th className="py-3 px-4">Kontak HP / Email</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeGtkRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        Tidak ada data {activeTab === 'tendik' ? 'tenaga kependidikan' : 'tenaga pendidik'} yang cocok dengan filter / pencarian.
                      </td>
                    </tr>
                  ) : (
                    activeGtkRows.map((g, idx) => {
                      const gtkType: 'guru' | 'tendik' = activeTab === 'tendik' ? 'tendik' : 'guru';
                      const status = g.statusKepegawaian || g.status || 'PNS';
                      const mapel = g.mataPelajaran || g.mapel || g.tugasTambahan || '-';
                      const exited = isGtkExitedRecord(g);
                      const exitSummary = formatGtkExitSummary(g);
                      return (
                        <tr key={g.id} className={`transition-colors ${exited ? 'bg-slate-50/70 text-slate-500 hover:bg-slate-100/70' : 'hover:bg-slate-50/80'}`}>
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-10 rounded border border-slate-200 bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                                {g.fotoUrl ? (
                                  <img
                                    src={resolveDirectImageUrl(g.fotoUrl)}
                                    alt={g.nama}
                                    className="w-full h-full object-cover object-top"
                                  />
                                ) : (
                                  <Camera className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                  <span className={exited ? 'text-slate-600' : 'text-slate-900'}>{g.nama}</span>
                                  {exited && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      {g.statusAktif}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  NUPTK: {g.nuptk || '-'}
                                </div>
                                {exited && (
                                  <div className="text-[10.5px] text-rose-700 font-medium mt-0.5">
                                    {exitSummary}{g.tanggalKeluar ? ` (${g.tanggalKeluar})` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {g.nip || '-'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              g.jenisKelamin === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {g.jenisKelamin || 'L'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              status === 'PNS' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : status === 'PPPK'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{g.jenisPtk || g.jabatan}</div>
                            <div className="text-[10px] text-blue-900 font-medium">{mapel}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <div className="font-medium text-slate-800">{g.pangkatGolongan || '-'}</div>
                            <div className="text-[10px] text-slate-400">{g.sumberGaji || 'APBD Provinsi'}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div className="font-mono text-slate-800 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{g.hp || g.noHp || '-'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{g.email || '-'}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setInspectGuru({ type: gtkType, data: g })}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Lihat Profil Dapodik GTK Lengkap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {onSelectForLetter && (
                                <button
                                  onClick={() => onSelectForLetter({ type: gtkType, data: g })}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                  title="Buatkan Surat Perintah Tugas (SPT)"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Buat SPT</span>
                                </button>
                              )}

                              {canEdit && (
                                <>
                                  {exited && (
                                    <button
                                      onClick={() => handleRestoreActive(gtkType, g)}
                                      className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors"
                                      title={`Aktifkan Kembali ${gtkType === 'tendik' ? 'Tendik' : 'Guru'}`}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenGuruModal(g, gtkType)}
                                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title={gtkType === 'tendik' ? 'Edit Data Tendik' : 'Edit Data Guru'}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openGtkExitModal(g, gtkType)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                    title={gtkType === 'tendik' ? 'Catat Keluar / Mutasi / Hapus Tendik' : 'Catat Keluar / Mutasi / Hapus Guru'}
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Tampilan Dapodik GTK 51 Kolom Persis Screenshot */
            <div className="overflow-x-auto max-h-[600px] border-t border-slate-200">
              <table className="w-max text-left border-collapse text-[11px]">
                <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 shadow-xs">
                  <tr className="text-slate-700 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center sticky left-0 bg-slate-100 z-30">No</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 sticky left-10 bg-slate-100 z-30 min-w-[180px]">Nama</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NUPTK</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">JK</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tempat Lahir</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tanggal Lahir</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NIP</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Status Kepegawaian</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Jenis PTK</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Agama</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 min-w-[200px]">Alamat Jalan</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">RT</th>
                    <th className="py-2.5 px-2 border-r border-slate-200 text-center">RW</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Nama Dusun</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Desa/Kelurahan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Kecamatan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Kode Pos</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Telepon</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">HP</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Email</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tugas Tambahan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">SK CPNS</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tanggal CPNS</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">SK Pengangkatan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">TMT Pengangkatan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Lembaga Pengangkatan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Pangkat Golongan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Sumber Gaji</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Nama Ibu Kandung</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Status Perkawinan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Nama Suami/Istri</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NIP Suami/Istri</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Pekerjaan Suami/Istri</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">TMT PNS</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Sudah Lisensi Kepala Sekolah</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Pernah Diklat Kepengawasan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Keahlian Braille</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Keahlian Bahasa Isyarat</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NPWP</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Nama Wajib Pajak</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Kewarganegaraan</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Bank</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Nomor Rekening Bank</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Rekening Atas Nama</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NIK</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">No KK</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Karpeg</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Karis/Karsu</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Lintang</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Bujur</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">NUKS</th>
                    <th className="py-2.5 px-3 sticky right-0 bg-slate-100 z-30 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px] whitespace-nowrap">
                  {activeGtkRows.map((g, idx) => {
                    const gtkType: 'guru' | 'tendik' = activeTab === 'tendik' ? 'tendik' : 'guru';
                    return (
                    <tr key={g.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-2 px-3 border-r border-slate-200 text-center sticky left-0 bg-white font-sans">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-bold font-sans text-slate-900 sticky left-10 bg-white">{g.nama}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.nuptk || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center font-bold">
                        <span className={g.jenisKelamin === 'L' ? 'text-blue-700' : 'text-pink-700'}>{g.jenisKelamin || 'L'}</span>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.tempatLahir || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.tanggalLahir || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-semibold">{g.nip || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.statusKepegawaian || g.status}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.jenisPtk || g.jabatan}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.agama || 'Islam'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans max-w-xs truncate">{g.alamatJalan || '-'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{g.rt || '0'}</td>
                      <td className="py-2 px-2 border-r border-slate-200 text-center">{g.rw || '0'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.namaDusun || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.desaKelurahan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.kecamatan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.kodePos || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.telepon || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.hp || g.noHp || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.email || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.tugasTambahan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.skCpns || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.tanggalCpns || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.skPengangkatan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.tmtPengangkatan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.lembagaPengangkatan || 'Pemerintah Propinsi'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans font-semibold">{g.pangkatGolongan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.sumberGaji || 'APBD Provinsi'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.namaIbuKandung || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.statusPerkawinan || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans font-semibold">{g.namaSuamiIstri || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.nipSuamiIstri || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.pekerjaanSuamiIstri || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.tmtPns || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.sudahLisensiKepalaSekolah || 'Tidak'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.pernahDiklatKepengawasan || 'Tidak'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.keahlianBraille || 'Tidak'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.keahlianBahasaIsyarat || 'Tidak'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.npwp || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.namaWajibPajak || g.nama}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.kewarganegaraan || 'ID'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.bank || 'Bank Jatim'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.nomorRekeningBank || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200 font-sans">{g.rekeningAtasNama || g.nama}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.nik || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.noKk || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.karpeg || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.karisKarsu || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.lintang || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.bujur || '-'}</td>
                      <td className="py-2 px-3 border-r border-slate-200">{g.nuks || '-'}</td>
                      <td className="py-2 px-3 sticky right-0 bg-white z-30 text-right font-sans">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => setInspectGuru({ type: gtkType, data: g })} className="p-1 text-slate-500 hover:text-blue-600 rounded">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button onClick={() => handleOpenGuruModal(g, gtkType)} className="p-1 text-slate-600 hover:text-blue-600 rounded">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ======================= MODAL IMPORT DAPODIK SISWA ======================= */}
      {isSiswaImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-xs flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Import Database Siswa Dapodik (Excel XLS/XLSX)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mendukung berkas Excel (.xlsx / .xls) dan CSV resmi Kemendikbud dengan format bertingkat Data Ayah, Data Ibu, Data Wali.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsSiswaImportModalOpen(false);
                  setParsedSiswaImportResult(null);
                  setSiswaImportFileName('');
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded text-blue-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Format Excel Standar Kemendikbud:</div>
                  <p className="mt-0.5 text-blue-800 leading-relaxed">
                    Unggah berkas Excel hasil export Dapodik siswa atau unduh template Excel resmi yang telah disesuaikan dengan contoh SMAN 9 Surabaya.
                  </p>
                  <button
                    type="button"
                    onClick={downloadDapodikSiswaExcelTemplate}
                    className="inline-flex items-center gap-1 mt-2 text-blue-700 font-bold hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    <span>Unduh Contoh Template Excel (.xlsx) Dapodik Siswa</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Pilih Berkas Excel / XLS / XLSX / CSV Dapodik Siswa:
                </label>
                <div 
                  onClick={() => siswaFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-lg p-5 text-center cursor-pointer transition-all"
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <span className="font-bold text-slate-700 block">
                    {siswaImportFileName ? siswaImportFileName : 'Klik atau seret berkas Excel / CSV di sini'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Format berkas didukung: .xlsx, .xls, .csv (Maksimal 10 MB)
                  </span>
                  <input
                    ref={siswaFileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                    onChange={handleSiswaFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Metode Sinkronisasi Data:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded border cursor-pointer transition-all ${
                    siswaImportMode === 'merge' ? 'bg-blue-50 border-blue-400 text-blue-950 font-bold' : 'border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="siswaImportMode"
                      value="merge"
                      checked={siswaImportMode === 'merge'}
                      onChange={() => setSiswaImportMode('merge')}
                      className="mr-2"
                    />
                    Gabungkan & Perbarui
                    <span className="block font-normal text-[10px] text-slate-500 mt-1">
                      Data dengan NISN/NIPD sama akan diperbarui, siswa baru akan ditambahkan.
                    </span>
                  </label>

                  <label className={`p-3 rounded border cursor-pointer transition-all ${
                    siswaImportMode === 'replace' ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold' : 'border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="siswaImportMode"
                      value="replace"
                      checked={siswaImportMode === 'replace'}
                      onChange={() => setSiswaImportMode('replace')}
                      className="mr-2"
                    />
                    Timpa Seluruh Data
                    <span className="block font-normal text-[10px] text-slate-500 mt-1">
                      Ganti seluruh data siswa saat ini dengan berkas baru.
                    </span>
                  </label>
                </div>
              </div>

              {parsedSiswaImportResult && (
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      {parsedSiswaImportResult.success ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Pratinjau Data ({parsedSiswaImportResult.data.length} siswa terdeteksi)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span className="text-rose-700">Gagal Membaca Format</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {parsedSiswaImportResult.data.length} baris valid
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    {parsedSiswaImportResult.message}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsSiswaImportModalOpen(false);
                  setParsedSiswaImportResult(null);
                  setSiswaImportFileName('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSiswaImport}
                disabled={!parsedSiswaImportResult || !parsedSiswaImportResult.success || parsedSiswaImportResult.data.length === 0}
                className={`px-4 py-2 rounded font-bold shadow-xs flex items-center gap-1.5 ${
                  parsedSiswaImportResult && parsedSiswaImportResult.success && parsedSiswaImportResult.data.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Eksekusi Import ({parsedSiswaImportResult?.data.length || 0} Siswa)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL IMPORT DAPODIK GURU / TENDIK ======================= */}
      {isGuruImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-xs flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {gtkImportEntity === 'tendik'
                      ? 'Import Database Tendik / Tenaga Kependidikan (Excel XLS/XLSX)'
                      : 'Import Database Guru (Dapodik GTK Excel / XLS / XLSX)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mendukung berkas Excel (.xlsx / .xls) dan CSV 51 kolom lengkap Dapodik GTK Kemendikbud (NUPTK, NIP, SK, TMT, Karpeg, NPWP).
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsGuruImportModalOpen(false);
                  setParsedGuruImportResult(null);
                  setGuruImportFileName('');
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded text-emerald-950 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    {gtkImportEntity === 'tendik' ? 'Format Excel Siap Pakai Tendik:' : 'Format Excel Siap Pakai GTK:'}
                  </div>
                  <p className="mt-0.5 text-emerald-900 leading-relaxed">
                    Unggah berkas Excel hasil export Dapodik GTK atau gunakan berkas template resmi yang telah disiapkan sesuai contoh.
                  </p>
                  <button
                    type="button"
                    onClick={gtkImportEntity === 'tendik' ? downloadDapodikTendikExcelTemplate : downloadDapodikGuruExcelTemplate}
                    className="inline-flex items-center gap-1 mt-2 text-emerald-800 font-bold hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    <span>
                      {gtkImportEntity === 'tendik'
                        ? 'Unduh Contoh Template Excel (.xlsx) Dapodik Tendik'
                        : 'Unduh Contoh Template Excel (.xlsx) Dapodik Guru'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  {gtkImportEntity === 'tendik'
                    ? 'Pilih Berkas Excel / XLS / XLSX / CSV Dapodik Tendik:'
                    : 'Pilih Berkas Excel / XLS / XLSX / CSV Dapodik Guru:'}
                </label>
                <div 
                  onClick={() => guruFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-lg p-5 text-center cursor-pointer transition-all"
                >
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <span className="font-bold text-slate-700 block">
                    {guruImportFileName ? guruImportFileName : 'Klik atau seret berkas Excel / CSV GTK di sini'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Format berkas didukung: .xlsx, .xls, .csv (Maksimal 10 MB)
                  </span>
                  <input
                    ref={guruFileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                    onChange={handleGuruFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Metode Sinkronisasi Data GTK:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded border cursor-pointer transition-all ${
                    guruImportMode === 'merge' ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' : 'border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="guruImportMode"
                      value="merge"
                      checked={guruImportMode === 'merge'}
                      onChange={() => setGuruImportMode('merge')}
                      className="mr-2"
                    />
                    Gabungkan & Perbarui
                    <span className="block font-normal text-[10px] text-slate-500 mt-1">
                      Data dengan NIP/NUPTK sama akan diperbarui, guru baru akan ditambahkan.
                    </span>
                  </label>

                  <label className={`p-3 rounded border cursor-pointer transition-all ${
                    guruImportMode === 'replace' ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold' : 'border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="guruImportMode"
                      value="replace"
                      checked={guruImportMode === 'replace'}
                      onChange={() => setGuruImportMode('replace')}
                      className="mr-2"
                    />
                    Timpa Seluruh Data Guru
                    <span className="block font-normal text-[10px] text-slate-500 mt-1">
                      Ganti seluruh data tenaga pendidik saat ini dengan berkas baru.
                    </span>
                  </label>
                </div>
              </div>

              {parsedGuruImportResult && (
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      {parsedGuruImportResult.success ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Pratinjau Data ({parsedGuruImportResult.data.length} guru/tendik terdeteksi)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span className="text-rose-700">Gagal Membaca Format</span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {parsedGuruImportResult.data.length} baris valid
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    {parsedGuruImportResult.message}
                  </p>

                  {parsedGuruImportResult.data.length > 0 && (
                    <div className="overflow-x-auto max-h-40 border border-slate-200 rounded bg-white mt-2">
                      <table className="w-full text-left text-[10px] border-collapse font-mono">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                          <tr>
                            <th className="p-1.5 border-r border-slate-200">No</th>
                            <th className="p-1.5 border-r border-slate-200">Nama</th>
                            <th className="p-1.5 border-r border-slate-200">NIP</th>
                            <th className="p-1.5 border-r border-slate-200">NUPTK</th>
                            <th className="p-1.5 border-r border-slate-200">Status</th>
                            <th className="p-1.5">Jenis PTK</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedGuruImportResult.data.slice(0, 5).map((g, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-1.5 border-r border-slate-200">{idx + 1}</td>
                              <td className="p-1.5 border-r border-slate-200 font-bold font-sans text-slate-800">{g.nama}</td>
                              <td className="p-1.5 border-r border-slate-200">{g.nip}</td>
                              <td className="p-1.5 border-r border-slate-200">{g.nuptk || '-'}</td>
                              <td className="p-1.5 border-r border-slate-200 font-sans">{g.statusKepegawaian || g.status}</td>
                              <td className="p-1.5 font-sans">{g.jenisPtk || g.jabatan}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsGuruImportModalOpen(false);
                  setParsedGuruImportResult(null);
                  setGuruImportFileName('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteGuruImport}
                disabled={!parsedGuruImportResult || !parsedGuruImportResult.success || parsedGuruImportResult.data.length === 0}
                className={`px-4 py-2 rounded font-bold shadow-xs flex items-center gap-1.5 ${
                  parsedGuruImportResult && parsedGuruImportResult.success && parsedGuruImportResult.data.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Eksekusi Import ({parsedGuruImportResult?.data.length || 0} {gtkImportEntity === 'tendik' ? 'Tendik' : 'Guru'})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL INSPEKTOR DAPODIK SISWA ======================= */}
      {inspectSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-xs flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Buku Induk & Dapodik Siswa
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  {inspectSiswa.nama} ({inspectSiswa.nipd || inspectSiswa.nis})
                </h3>
              </div>
              <button onClick={() => setInspectSiswa(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {isSiswaExitedRecord(inspectSiswa) && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-rose-800 text-xs">
                      Status Peserta Didik: {inspectSiswa.jenisKeluar || inspectSiswa.status}
                    </span>
                    {inspectSiswa.tanggalKeluar && (
                      <span className="font-mono text-[11px] text-rose-700 tabular-nums">
                        Tanggal: {inspectSiswa.tanggalKeluar}
                      </span>
                    )}
                  </div>
                  {inspectSiswa.tujuanMutasi && (
                    <div className="text-slate-800">
                      <span className="text-slate-500">Mutasi Ke:</span>{' '}
                      <span className="font-semibold">{inspectSiswa.tujuanMutasi}</span>
                    </div>
                  )}
                  {inspectSiswa.alasanKeluar && (
                    <div className="text-slate-800">
                      <span className="text-slate-500">Alasan / Keterangan:</span>{' '}
                      <span className="font-medium">{inspectSiswa.alasanKeluar}</span>
                    </div>
                  )}
                  {inspectSiswa.nomorSuratMutasi && (
                    <div className="text-slate-700 font-mono text-[11px]">
                      No. Surat Pindah: {inspectSiswa.nomorSuratMutasi}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <div>
                  <span className="text-slate-400 text-[10px] block">Rombel / Kelas:</span>
                  <span className="font-bold text-blue-900 text-xs">{inspectSiswa.rombelSaatIni || inspectSiswa.kelas}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">NISN:</span>
                  <span className="font-mono font-semibold text-slate-800">{inspectSiswa.nisn || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">NIK Siswa:</span>
                  <span className="font-mono text-slate-800">{inspectSiswa.nik || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Jenis Kelamin:</span>
                  <span className="font-bold text-slate-800">{inspectSiswa.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Identitas Pribadi & Domisili
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Tempat, Tanggal Lahir:</span>
                    <span className="font-medium text-slate-800">{inspectSiswa.tempatTanggalLahir || `${inspectSiswa.tempatLahir || '-'}, ${inspectSiswa.tanggalLahir || '-'}`}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Agama:</span>
                    <span className="font-medium text-slate-800">{inspectSiswa.agama || 'Islam'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">No. Akta Lahir:</span>
                    <span className="font-mono text-slate-800">{inspectSiswa.noRegAktaLahir || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[10px] block">Alamat Rumah:</span>
                    <span className="font-medium text-slate-800">{inspectSiswa.alamat || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">RT / RW:</span>
                    <span className="font-medium text-slate-800">{inspectSiswa.rt || '0'} / {inspectSiswa.rw || '0'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Kelurahan / Kecamatan:</span>
                    <span className="font-medium text-slate-800">{inspectSiswa.kelurahan || '-'}, {inspectSiswa.kecamatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">No HP / WhatsApp:</span>
                    <span className="font-mono font-semibold text-emerald-800">{inspectSiswa.hp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Alat Transportasi:</span>
                    <span className="font-medium text-slate-800">{inspectSiswa.alatTransportasi || 'Jalan kaki'}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Data Orang Tua Kandung
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                    <span className="text-blue-800 font-bold block text-[11px]">Ayah Kandung:</span>
                    <div><span className="text-slate-400 text-[10px]">Nama:</span> <span className="font-bold text-slate-800">{inspectSiswa.namaAyah || '-'}</span></div>
                    <div><span className="text-slate-400 text-[10px]">Tahun Lahir:</span> <span className="text-slate-800">{inspectSiswa.tahunLahirAyah || '-'}</span></div>
                    <div><span className="text-slate-400 text-[10px]">Pendidikan:</span> <span className="text-slate-800">{inspectSiswa.jenjangPendidikanAyah || '-'}</span></div>
                    <div><span className="text-slate-400 text-[10px]">Pekerjaan:</span> <span className="text-slate-800">{inspectSiswa.pekerjaanAyah || '-'}</span></div>
                    <div><span className="text-slate-400 text-[10px]">Penghasilan:</span> <span className="text-slate-800">{inspectSiswa.penghasilanAyah || '-'}</span></div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 space-y-1">
                    <span className="text-pink-800 font-bold block text-[11px]">Ibu Kandung:</span>
                    <div><span className="text-slate-400 text-[10px]">Nama:</span> <span className="font-bold text-slate-800">{inspectSiswa.namaIbu || '-'}</span></div>
                    <div><span className="text-slate-400 text-[10px]">Tahun Lahir:</span> <span className="text-slate-800">{inspectSiswa.tahunLahirIbu || '-'}</span></div>
                    <div><span className="text-slate-400 text-[10px]">Pendidikan:</span> <span className="text-slate-800">{inspectSiswa.jenjangPendidikanIbu || '-'}</span></div>
                    <div><span className="text-slate-400 text-[10px]">Pekerjaan:</span> <span className="text-slate-800">{inspectSiswa.pekerjaanIbu || '-'}</span></div>
                    <div><span className="text-slate-400 text-[10px]">Penghasilan:</span> <span className="text-slate-800">{inspectSiswa.penghasilanIbu || '-'}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-5 py-3 border-t border-slate-100 bg-slate-50">
              {onSelectForLetter ? (
                <button
                  onClick={() => {
                    onSelectForLetter({ type: 'siswa', data: inspectSiswa });
                    setInspectSiswa(null);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Buat Surat Keterangan / Rekomendasi</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setInspectSiswa(null)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-100 text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL INSPEKTOR DAPODIK GTK GURU / TENDIK ======================= */}
      {inspectGuru && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden text-xs flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-14 rounded border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  {inspectGuru.data.fotoUrl ? (
                    <img
                      src={resolveDirectImageUrl(inspectGuru.data.fotoUrl)}
                      alt={inspectGuru.data.nama}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <Camera className="w-4 h-4 text-slate-300" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    {inspectGuru.type === 'tendik'
                      ? 'Data Pokok Tenaga Kependidikan (GTK Tendik)'
                      : 'Data Pokok Pendidik (GTK Guru)'}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {inspectGuru.data.nama} {inspectGuru.data.nip ? `(${inspectGuru.data.nip})` : ''}
                  </h3>
                </div>
              </div>
              <button onClick={() => setInspectGuru(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {isGtkExitedRecord(inspectGuru.data) && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-rose-800 text-xs">
                      Status Keaktifan: {inspectGuru.data.statusAktif}
                    </span>
                    {inspectGuru.data.tanggalKeluar && (
                      <span className="font-mono text-[11px] text-rose-700 tabular-nums">
                        Tanggal: {inspectGuru.data.tanggalKeluar}
                      </span>
                    )}
                  </div>
                  {inspectGuru.data.tujuanMutasi && (
                    <div className="text-slate-800">
                      <span className="text-slate-500">Tujuan Mutasi:</span>{' '}
                      <span className="font-semibold">{inspectGuru.data.tujuanMutasi}</span>
                    </div>
                  )}
                  {inspectGuru.data.alasanKeluar && (
                    <div className="text-slate-800">
                      <span className="text-slate-500">Keterangan / Alasan:</span>{' '}
                      <span className="font-medium">{inspectGuru.data.alasanKeluar}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">NUPTK:</span>
                  <span className="font-mono font-bold text-emerald-900 text-xs">{inspectGuru.data.nuptk || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Status Kepegawaian:</span>
                  <span className="font-bold text-slate-800">{inspectGuru.data.statusKepegawaian || inspectGuru.data.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Pangkat / Golongan:</span>
                  <span className="font-semibold text-slate-800">{inspectGuru.data.pangkatGolongan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Jenis PTK:</span>
                  <span className="font-bold text-slate-800">{inspectGuru.data.jenisPtk || inspectGuru.data.jabatan}</span>
                </div>
              </div>

              {/* Detail Kepegawaian & SK */}
              <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                  Riwayat Pengangkatan & SK Kedinasan
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block">SK Pengangkatan:</span>
                    <span className="font-mono text-slate-800">{inspectGuru.data.skPengangkatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">TMT Pengangkatan:</span>
                    <span className="font-mono text-slate-800">{inspectGuru.data.tmtPengangkatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Lembaga Pengangkat:</span>
                    <span className="text-slate-800">{inspectGuru.data.lembagaPengangkatan || 'Pemerintah Propinsi'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Tugas Tambahan:</span>
                    <span className="text-slate-800 font-semibold">{inspectGuru.data.tugasTambahan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Sumber Gaji:</span>
                    <span className="text-slate-800">{inspectGuru.data.sumberGaji || 'APBD Provinsi'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">TMT PNS:</span>
                    <span className="font-mono text-slate-800">{inspectGuru.data.tmtPns || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Alamat & Kontak */}
              <div className="border border-slate-200 rounded-lg p-3.5 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  Alamat Jalan & Kontak Resmi
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[10px] block">Alamat Jalan:</span>
                    <span className="text-slate-800 font-medium">{inspectGuru.data.alamatJalan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">RT / RW:</span>
                    <span className="text-slate-800">{inspectGuru.data.rt || '0'} / {inspectGuru.data.rw || '0'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Desa/Kelurahan:</span>
                    <span className="text-slate-800">{inspectGuru.data.desaKelurahan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Kecamatan:</span>
                    <span className="text-slate-800">{inspectGuru.data.kecamatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Kode Pos:</span>
                    <span className="font-mono text-slate-800">{inspectGuru.data.kodePos || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">No. HP / WhatsApp:</span>
                    <span className="font-mono font-semibold text-emerald-800">{inspectGuru.data.hp || inspectGuru.data.noHp || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 text-[10px] block">Email:</span>
                    <span className="font-mono text-slate-800">{inspectGuru.data.email || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Data Keluarga & Pajak */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                  <span className="font-bold text-slate-900 block text-xs">Keluarga & Pasangan:</span>
                  <div><span className="text-slate-400 text-[10px]">Ibu Kandung:</span> <span className="font-medium text-slate-800">{inspectGuru.data.namaIbuKandung || '-'}</span></div>
                  <div><span className="text-slate-400 text-[10px]">Status Nikah:</span> <span className="text-slate-800">{inspectGuru.data.statusPerkawinan || 'Kawin'}</span></div>
                  <div><span className="text-slate-400 text-[10px]">Suami / Istri:</span> <span className="font-semibold text-slate-800">{inspectGuru.data.namaSuamiIstri || '-'}</span></div>
                  <div><span className="text-slate-400 text-[10px]">Pekerjaan Pasangan:</span> <span className="text-slate-800">{inspectGuru.data.pekerjaanSuamiIstri || '-'}</span></div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
                  <span className="font-bold text-slate-900 block text-xs">Pajak, Karpeg & NIK:</span>
                  <div><span className="text-slate-400 text-[10px]">NPWP:</span> <span className="font-mono text-slate-800">{inspectGuru.data.npwp || '-'}</span></div>
                  <div><span className="text-slate-400 text-[10px]">NIK:</span> <span className="font-mono text-slate-800">{inspectGuru.data.nik || '-'}</span></div>
                  <div><span className="text-slate-400 text-[10px]">Karpeg:</span> <span className="font-mono text-slate-800">{inspectGuru.data.karpeg || '-'}</span></div>
                  <div><span className="text-slate-400 text-[10px]">No KK:</span> <span className="font-mono text-slate-800">{inspectGuru.data.noKk || '-'}</span></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-5 py-3 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                {onOpenProfileCard && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = inspectGuru.data.id;
                      setInspectGuru(null);
                      onOpenProfileCard(targetId);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1.5"
                  >
                    <Contact2 className="w-3.5 h-3.5" />
                    <span>Buka Kartu Profil</span>
                  </button>
                )}
                {onSelectForLetter && (
                  <button
                    onClick={() => {
                      onSelectForLetter({ type: inspectGuru.type, data: inspectGuru.data });
                      setInspectGuru(null);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Buat Surat Perintah Tugas (SPT)</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setInspectGuru(null)}
                className="px-4 py-1.5 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-100 text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL EDIT/TAMBAH SISWA ======================= */}
      {isSiswaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden text-xs flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingSiswa ? 'Perbarui Profil Siswa (Standar Dapodik)' : 'Tambah Siswa Baru (Standar Dapodik)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Buku Induk & Data Pokok Pendidikan SMAN 9 Surabaya
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSiswaModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 gap-1 pt-2">
              <button
                type="button"
                onClick={() => setActiveSiswaModalTab('identitas')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeSiswaModalTab === 'identitas'
                    ? 'border-blue-600 text-blue-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Identitas Pribadi
              </button>
              <button
                type="button"
                onClick={() => setActiveSiswaModalTab('alamat')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeSiswaModalTab === 'alamat'
                    ? 'border-blue-600 text-blue-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Alamat & Kontak
              </button>
              <button
                type="button"
                onClick={() => setActiveSiswaModalTab('ortu')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeSiswaModalTab === 'ortu'
                    ? 'border-blue-600 text-blue-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Orang Tua & Wali
              </button>
              <button
                type="button"
                onClick={() => setActiveSiswaModalTab('bantuan')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeSiswaModalTab === 'bantuan'
                    ? 'border-blue-600 text-blue-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                4. Bantuan & PIP
              </button>
              <button
                type="button"
                onClick={() => setActiveSiswaModalTab('periodik')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeSiswaModalTab === 'periodik'
                    ? 'border-blue-600 text-blue-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                5. Periodik & Fisik
              </button>
            </div>

            <form onSubmit={handleSaveSiswa} className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeSiswaModalTab === 'identitas' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap Siswa *:</label>
                      <input
                        type="text"
                        required
                        value={siswaFormData.nama || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, nama: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                        placeholder="Contoh: ABDILLAH"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Jenis Kelamin *:</label>
                      <select
                        value={siswaFormData.jenisKelamin || 'L'}
                        onChange={e => setSiswaFormData({ ...siswaFormData, jenisKelamin: e.target.value as 'L' | 'P' })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                      >
                        <option value="L">Laki-laki (L)</option>
                        <option value="P">Perempuan (P)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">NIPD / NIS *:</label>
                      <input
                        type="text"
                        required
                        value={siswaFormData.nipd || siswaFormData.nis || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, nipd: e.target.value, nis: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-semibold"
                        placeholder="19788"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">NISN *:</label>
                      <input
                        type="text"
                        required
                        value={siswaFormData.nisn || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, nisn: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="0102561938"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">NIK Siswa (KTP/KK):</label>
                      <input
                        type="text"
                        value={siswaFormData.nik || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, nik: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="3526052712100001"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Agama:</label>
                      <select
                        value={siswaFormData.agama || 'Islam'}
                        onChange={e => setSiswaFormData({ ...siswaFormData, agama: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Kristen Protestan">Kristen Protestan</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Konghucu">Konghucu</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tempat Lahir:</label>
                      <input
                        type="text"
                        value={siswaFormData.tempatLahir || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, tempatLahir: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="Surabaya"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tanggal Lahir (YYYY-MM-DD):</label>
                      <input
                        type="date"
                        value={siswaFormData.tanggalLahir || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, tanggalLahir: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSiswaModalTab === 'alamat' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Alamat Tempat Tinggal:</label>
                    <input
                      type="text"
                      value={siswaFormData.alamat || ''}
                      onChange={e => setSiswaFormData({ ...siswaFormData, alamat: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      placeholder="GEMBONG SEKOLAHAN 1/3"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">RT:</label>
                      <input
                        type="text"
                        value={siswaFormData.rt || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, rt: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">RW:</label>
                      <input
                        type="text"
                        value={siswaFormData.rw || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, rw: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Kelurahan:</label>
                      <input
                        type="text"
                        value={siswaFormData.kelurahan || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, kelurahan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Kecamatan:</label>
                      <input
                        type="text"
                        value={siswaFormData.kecamatan || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, kecamatan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">No. Handphone / WhatsApp:</label>
                      <input
                        type="text"
                        value={siswaFormData.hp || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, hp: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Alat Transportasi:</label>
                      <input
                        type="text"
                        value={siswaFormData.alatTransportasi || 'Jalan kaki'}
                        onChange={e => setSiswaFormData({ ...siswaFormData, alatTransportasi: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSiswaModalTab === 'ortu' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
                    <span className="font-bold text-blue-900 block text-xs">Ayah Kandung:</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Nama Ayah:</label>
                        <input
                          type="text"
                          value={siswaFormData.namaAyah || ''}
                          onChange={e => setSiswaFormData({ ...siswaFormData, namaAyah: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Pekerjaan Ayah:</label>
                        <input
                          type="text"
                          value={siswaFormData.pekerjaanAyah || ''}
                          onChange={e => setSiswaFormData({ ...siswaFormData, pekerjaanAyah: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Penghasilan:</label>
                        <input
                          type="text"
                          value={siswaFormData.penghasilanAyah || ''}
                          onChange={e => setSiswaFormData({ ...siswaFormData, penghasilanAyah: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-pink-50/50 rounded-lg border border-pink-200 space-y-2">
                    <span className="font-bold text-pink-900 block text-xs">Ibu Kandung:</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Nama Ibu:</label>
                        <input
                          type="text"
                          value={siswaFormData.namaIbu || ''}
                          onChange={e => setSiswaFormData({ ...siswaFormData, namaIbu: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Pekerjaan Ibu:</label>
                        <input
                          type="text"
                          value={siswaFormData.pekerjaanIbu || ''}
                          onChange={e => setSiswaFormData({ ...siswaFormData, pekerjaanIbu: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Penghasilan:</label>
                        <input
                          type="text"
                          value={siswaFormData.penghasilanIbu || ''}
                          onChange={e => setSiswaFormData({ ...siswaFormData, penghasilanIbu: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSiswaModalTab === 'bantuan' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Layak PIP (Usulan Sekolah):</label>
                      <select
                        value={siswaFormData.layakPip || 'Tidak'}
                        onChange={e => setSiswaFormData({ ...siswaFormData, layakPip: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold"
                      >
                        <option value="Tidak">Tidak</option>
                        <option value="Ya">Ya (Diusulkan)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Alasan Layak PIP:</label>
                      <input
                        type="text"
                        value={siswaFormData.alasanLayakPip || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, alasanLayakPip: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="Siswa Miskin / Pemegang PKH"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSiswaModalTab === 'periodik' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Rombel Saat Ini *:</label>
                      <input
                        type="text"
                        required
                        value={siswaFormData.rombelSaatIni || siswaFormData.kelas || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, rombelSaatIni: e.target.value, kelas: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Sekolah Asal (SMP):</label>
                      <input
                        type="text"
                        value={siswaFormData.sekolahAsal || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, sekolahAsal: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">No KK:</label>
                      <input
                        type="text"
                        value={siswaFormData.noKk || ''}
                        onChange={e => setSiswaFormData({ ...siswaFormData, noKk: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setIsSiswaModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingSiswa ? 'Simpan Perubahan' : 'Tambahkan Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL EDIT/TAMBAH GURU (TABBED GTK) ======================= */}
      {isGuruModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden text-xs flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {gtkModalEntity === 'tendik'
                      ? (editingGuru ? 'Perbarui Profil Tendik (Dapodik GTK)' : 'Tambah Tenaga Kependidikan / Tendik Baru')
                      : (editingGuru ? 'Perbarui Profil GTK Guru (Dapodik Kemendikbud)' : 'Tambah Tenaga Pendidik Baru (Dapodik GTK)')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sistem Manajemen Kepegawaian & GTK SMA Negeri 9 Surabaya
                  </p>
                </div>
              </div>
              <button onClick={() => setIsGuruModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs for Guru / Tendik */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 gap-1 pt-2">
              <button
                type="button"
                onClick={() => setActiveGuruModalTab('kepegawaian')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeGuruModalTab === 'kepegawaian'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Identitas & Kepegawaian
              </button>
              <button
                type="button"
                onClick={() => setActiveGuruModalTab('alamat')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeGuruModalTab === 'alamat'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Alamat & Kontak
              </button>
              <button
                type="button"
                onClick={() => setActiveGuruModalTab('sk')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeGuruModalTab === 'sk'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. SK & Pengangkatan
              </button>
              <button
                type="button"
                onClick={() => setActiveGuruModalTab('keluarga')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeGuruModalTab === 'keluarga'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                4. Keluarga & Pasangan
              </button>
              <button
                type="button"
                onClick={() => setActiveGuruModalTab('perbankan')}
                className={`px-3 py-2 border-b-2 font-bold text-xs transition-colors ${
                  activeGuruModalTab === 'perbankan'
                    ? 'border-emerald-600 text-emerald-800 bg-white rounded-t'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                5. Pajak, Bank & Lisensi
              </button>
            </div>

            <form onSubmit={handleSaveGuru} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB 1: IDENTITAS & KEPEGAWAIAN */}
              {activeGuruModalTab === 'kepegawaian' && (
                <div className="space-y-3.5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                    <div className="w-16 h-20 rounded border border-slate-300 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                      {guruFormData.fotoUrl ? (
                        <img
                          src={resolveDirectImageUrl(guruFormData.fotoUrl)}
                          alt="Pas Foto GTK"
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold cursor-pointer inline-flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{guruFormData.fotoUrl ? 'Ganti Pas Foto' : 'Upload Pas Foto'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/jpg"
                            className="hidden"
                            onChange={async ev => {
                              const file = ev.target.files?.[0];
                              if (!file) return;
                              try {
                                const compressed = await compressGtkPhotoFileToDataUrl(file);
                                setGuruFormData(prev => ({ ...prev, fotoUrl: compressed }));
                              } catch {
                                // Ignore invalid image file
                              }
                            }}
                          />
                        </label>
                        {guruFormData.fotoUrl && (
                          <button
                            type="button"
                            onClick={() => setGuruFormData(prev => ({ ...prev, fotoUrl: '' }))}
                            className="px-2.5 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded font-medium"
                          >
                            Hapus Foto
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        value={
                          guruFormData.fotoUrl && !guruFormData.fotoUrl.startsWith('data:image/')
                            ? guruFormData.fotoUrl
                            : ''
                        }
                        onChange={e => setGuruFormData({ ...guruFormData, fotoUrl: e.target.value })}
                        placeholder="Atau tempel link URL / Google Drive pas foto..."
                        className="w-full px-2.5 py-1 border border-slate-300 rounded bg-white text-[11px] font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap beserta Gelar *:</label>
                      <input
                        type="text"
                        required
                        value={guruFormData.nama || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, nama: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                        placeholder={gtkModalEntity === 'tendik' ? 'Contoh: Dhinar Oktavia Larasati' : 'Contoh: Achmad Diran'}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Jenis Kelamin *:</label>
                      <select
                        value={guruFormData.jenisKelamin || 'L'}
                        onChange={e => setGuruFormData({ ...guruFormData, jenisKelamin: e.target.value as 'L' | 'P' })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                      >
                        <option value="L">Laki-laki (L)</option>
                        <option value="P">Perempuan (P)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {gtkModalEntity === 'tendik' ? 'NIP (Jika ASN):' : 'NIP (Nomor Induk Pegawai) *:'}
                      </label>
                      <input
                        type="text"
                        required={gtkModalEntity !== 'tendik'}
                        value={guruFormData.nip || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, nip: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-semibold"
                        placeholder="197906012023211003"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">NUPTK:</label>
                      <input
                        type="text"
                        value={guruFormData.nuptk || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, nuptk: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="0933757659200012"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Status Kepegawaian *:</label>
                      <select
                        value={guruFormData.statusKepegawaian || guruFormData.status || (gtkModalEntity === 'tendik' ? 'Tenaga Honor Sekolah' : 'PNS')}
                        onChange={e => setGuruFormData({ ...guruFormData, statusKepegawaian: e.target.value, status: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold"
                      >
                        <option value="PNS">PNS</option>
                        <option value="PPPK">PPPK</option>
                        <option value="GTT">GTT / Honorer</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Pangkat / Golongan:</label>
                      <input
                        type="text"
                        value={guruFormData.pangkatGolongan || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, pangkatGolongan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                        placeholder="IX / Penata (III/c)"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Jenis PTK:</label>
                      <input
                        type="text"
                        value={guruFormData.jenisPtk || guruFormData.jabatan || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, jenisPtk: e.target.value, jabatan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="Guru Mapel / Guru BK"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Mata Pelajaran Diampu:</label>
                      <input
                        type="text"
                        value={guruFormData.mataPelajaran || guruFormData.mapel || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, mataPelajaran: e.target.value, mapel: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="Pendidikan Agama Islam / PJOK"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tempat Lahir:</label>
                      <input
                        type="text"
                        value={guruFormData.tempatLahir || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, tempatLahir: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="SURABAYA"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tanggal Lahir:</label>
                      <input
                        type="date"
                        value={guruFormData.tanggalLahir || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, tanggalLahir: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Agama:</label>
                      <select
                        value={guruFormData.agama || 'Islam'}
                        onChange={e => setGuruFormData({ ...guruFormData, agama: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Konghucu">Konghucu</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ALAMAT & KONTAK */}
              {activeGuruModalTab === 'alamat' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Alamat Jalan:</label>
                    <input
                      type="text"
                      value={guruFormData.alamatJalan || ''}
                      onChange={e => setGuruFormData({ ...guruFormData, alamatJalan: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      placeholder="Bulak Rukem Timur I/76 Surabaya"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">RT:</label>
                      <input
                        type="text"
                        value={guruFormData.rt || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, rt: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="6"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">RW:</label>
                      <input
                        type="text"
                        value={guruFormData.rw || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, rw: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Desa/Kelurahan:</label>
                      <input
                        type="text"
                        value={guruFormData.desaKelurahan || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, desaKelurahan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="Bulak"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Kecamatan:</label>
                      <input
                        type="text"
                        value={guruFormData.kecamatan || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, kecamatan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="Kec. Bulak"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Kode Pos:</label>
                      <input
                        type="text"
                        value={guruFormData.kodePos || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, kodePos: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="60124"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Telepon Rumah:</label>
                      <input
                        type="text"
                        value={guruFormData.telepon || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, telepon: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="03171079679"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">No. HP / WhatsApp:</label>
                      <input
                        type="text"
                        value={guruFormData.hp || guruFormData.noHp || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, hp: e.target.value, noHp: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="081554377679"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Email Guru / Tendik:</label>
                    <input
                      type="email"
                      value={guruFormData.email || ''}
                      onChange={e => setGuruFormData({ ...guruFormData, email: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      placeholder="guru@sman9surabaya.sch.id"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SK & PENGANGKATAN */}
              {activeGuruModalTab === 'sk' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Tugas Tambahan:</label>
                      <input
                        type="text"
                        value={guruFormData.tugasTambahan || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, tugasTambahan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="Pembina Ekstrakurikuler / Kepala Lab"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Sumber Gaji:</label>
                      <select
                        value={guruFormData.sumberGaji || 'APBD Provinsi'}
                        onChange={e => setGuruFormData({ ...guruFormData, sumberGaji: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      >
                        <option value="APBD Provinsi">APBD Provinsi</option>
                        <option value="APBN">APBN</option>
                        <option value="BOS">BOS Sekolah</option>
                        <option value="Yayasan / Komite">Yayasan / Komite</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">SK Pengangkatan:</label>
                      <input
                        type="text"
                        value={guruFormData.skPengangkatan || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, skPengangkatan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="821/2929/204/2023"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">TMT Pengangkatan:</label>
                      <input
                        type="date"
                        value={guruFormData.tmtPengangkatan || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, tmtPengangkatan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">SK CPNS (Jika PNS):</label>
                      <input
                        type="text"
                        value={guruFormData.skCpns || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, skCpns: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="813.3/2635/436.6"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">TMT PNS:</label>
                      <input
                        type="date"
                        value={guruFormData.tmtPns || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, tmtPns: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: KELUARGA & PASANGAN */}
              {activeGuruModalTab === 'keluarga' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Nama Ibu Kandung:</label>
                      <input
                        type="text"
                        value={guruFormData.namaIbuKandung || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, namaIbuKandung: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                        placeholder="Ngatminah"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Status Perkawinan:</label>
                      <select
                        value={guruFormData.statusPerkawinan || 'Kawin'}
                        onChange={e => setGuruFormData({ ...guruFormData, statusPerkawinan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      >
                        <option value="Kawin">Kawin</option>
                        <option value="Belum Kawin">Belum Kawin</option>
                        <option value="Janda/Duda">Janda / Duda</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Nama Suami / Istri:</label>
                      <input
                        type="text"
                        value={guruFormData.namaSuamiIstri || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, namaSuamiIstri: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
                        placeholder="UMI KUMAIROH"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">NIP Suami / Istri (Bila ASN):</label>
                      <input
                        type="text"
                        value={guruFormData.nipSuamiIstri || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, nipSuamiIstri: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="19910621..."
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Pekerjaan Pasangan:</label>
                      <input
                        type="text"
                        value={guruFormData.pekerjaanSuamiIstri || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, pekerjaanSuamiIstri: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="PNS / Swasta / Tidak bekerja"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: PAJAK, BANK & LISENSI */}
              {activeGuruModalTab === 'perbankan' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">NPWP:</label>
                      <input
                        type="text"
                        value={guruFormData.npwp || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, npwp: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="467256665619000"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">NIK Guru (KTP):</label>
                      <input
                        type="text"
                        value={guruFormData.nik || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, nik: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="3578290106790002"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">No KK:</label>
                      <input
                        type="text"
                        value={guruFormData.noKk || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, noKk: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                        placeholder="3517130111170004"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Bank Penggajian:</label>
                      <input
                        type="text"
                        value={guruFormData.bank || 'Bank Jatim'}
                        onChange={e => setGuruFormData({ ...guruFormData, bank: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        placeholder="Bank Jatim"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Nomor Rekening Bank:</label>
                      <input
                        type="text"
                        value={guruFormData.nomorRekeningBank || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, nomorRekeningBank: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Rekening Atas Nama:</label>
                      <input
                        type="text"
                        value={guruFormData.rekeningAtasNama || ''}
                        onChange={e => setGuruFormData({ ...guruFormData, rekeningAtasNama: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Sudah Lisensi Kepala Sekolah?</label>
                      <select
                        value={guruFormData.sudahLisensiKepalaSekolah || 'Tidak'}
                        onChange={e => setGuruFormData({ ...guruFormData, sudahLisensiKepalaSekolah: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      >
                        <option value="Tidak">Tidak</option>
                        <option value="Ya">Ya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Pernah Diklat Kepengawasan?</label>
                      <select
                        value={guruFormData.pernahDiklatKepengawasan || 'Tidak'}
                        onChange={e => setGuruFormData({ ...guruFormData, pernahDiklatKepengawasan: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      >
                        <option value="Tidak">Tidak</option>
                        <option value="Ya">Ya</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setIsGuruModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {editingGuru
                      ? 'Simpan Perubahan'
                      : gtkModalEntity === 'tendik'
                      ? 'Tambahkan Tendik'
                      : 'Tambahkan Guru'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL KELUAR / MUTASI / HAPUS DATA ======================= */}
      {exitModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-xs flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  {exitModalState.entity === 'siswa'
                    ? 'Pencatatan Siswa Keluar / Hapus'
                    : exitModalState.entity === 'tendik'
                    ? 'Pencatatan Tendik Keluar / Hapus'
                    : 'Pencatatan Guru Keluar / Hapus'}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  {exitModalState.record.nama}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExitModalState(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmExitOrDelete} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  Pilih Jenis Status Keluar / Tindakan
                </label>
                {exitModalState.entity === 'siswa' ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'mutasi' as ExitModeSiswa, label: 'Mutasi / Pindah' },
                      { id: 'berhenti' as ExitModeSiswa, label: 'Berhenti Sekolah' },
                      { id: 'hapus_permanen' as ExitModeSiswa, label: 'Hapus Permanen' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setExitModalState(prev =>
                            prev ? { ...prev, mode: opt.id, error: '' } : prev
                          )
                        }
                        className={`px-2.5 py-2 rounded border text-center font-semibold transition-colors ${
                          exitModalState.mode === opt.id
                            ? opt.id === 'hapus_permanen'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'mutasi' as ExitModeGtk, label: 'Mutasi' },
                      { id: 'meninggal' as ExitModeGtk, label: 'Meninggal Dunia' },
                      { id: 'berhenti' as ExitModeGtk, label: 'Berhenti' },
                      { id: 'hapus_permanen' as ExitModeGtk, label: 'Hapus Permanen' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setExitModalState(prev =>
                            prev ? { ...prev, mode: opt.id, error: '' } : prev
                          )
                        }
                        className={`px-2 py-2 rounded border text-center font-semibold transition-colors ${
                          exitModalState.mode === opt.id
                            ? opt.id === 'hapus_permanen'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {exitModalState.mode === 'hapus_permanen' ? (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Konfirmasi Hapus Permanen</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Data <strong>{exitModalState.record.nama}</strong> akan dihapus permanen dari database tanpa riwayat arsip. Jika orang yang bersangkutan mutasi, berhenti, atau meninggal dunia, pilih status keluar di atas agar riwayat tetap tersimpan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {exitModalState.mode === 'meninggal'
                        ? 'Tanggal Meninggal Dunia'
                        : exitModalState.mode === 'mutasi'
                        ? 'Tanggal Efektif / Mutasi'
                        : 'Tanggal Berhenti'}
                    </label>
                    <input
                      type="date"
                      value={exitModalState.tanggalKeluar}
                      onChange={e =>
                        setExitModalState(prev =>
                          prev ? { ...prev, tanggalKeluar: e.target.value, error: '' } : prev
                        )
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>

                  {exitModalState.mode === 'mutasi' && (
                    <>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          {exitModalState.entity === 'siswa'
                            ? 'Mutasi ke Sekolah Mana? (Wajib diisi)'
                            : 'Mutasi ke Sekolah / Instansi Mana? (Wajib diisi)'}
                        </label>
                        <input
                          type="text"
                          placeholder={
                            exitModalState.entity === 'siswa'
                              ? 'Contoh: SMAN 5 Surabaya / MAN Kota Surabaya'
                              : 'Contoh: SMAN 2 Surabaya / Cabang Dinas Pendidikan Wilayah Surabaya'
                          }
                          value={exitModalState.tujuanMutasi}
                          onChange={e =>
                            setExitModalState(prev =>
                              prev ? { ...prev, tujuanMutasi: e.target.value, error: '' } : prev
                            )
                          }
                          className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        />
                      </div>

                      {exitModalState.entity === 'siswa' && (
                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">
                            Nomor Surat Keterangan Pindah (Opsional)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: 421.3/102/101.6.1.9/2026"
                            value={exitModalState.nomorSuratMutasi}
                            onChange={e =>
                              setExitModalState(prev =>
                                prev ? { ...prev, nomorSuratMutasi: e.target.value, error: '' } : prev
                              )
                            }
                            className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Keterangan / Alasan Mutasi (Opsional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder={
                            exitModalState.entity === 'siswa'
                              ? 'Contoh: Mengikuti kepindahan tugas/domisili orang tua'
                              : 'Contoh: SK Mutasi Gubernur Jatim / Alih tugas kedinasan'
                          }
                          value={exitModalState.alasanKeluar}
                          onChange={e =>
                            setExitModalState(prev =>
                              prev ? { ...prev, alasanKeluar: e.target.value, error: '' } : prev
                            )
                          }
                          className="w-full px-3 py-1.5 border border-slate-300 rounded"
                        />
                      </div>
                    </>
                  )}

                  {exitModalState.mode === 'meninggal' && (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Catatan / Keterangan Tambahan (Opsional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Contoh: Meninggal dunia karena sakit, surat keterangan kematian terlampir"
                        value={exitModalState.alasanKeluar}
                        onChange={e =>
                          setExitModalState(prev =>
                            prev ? { ...prev, alasanKeluar: e.target.value, error: '' } : prev
                          )
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  )}

                  {exitModalState.mode === 'berhenti' && (
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {exitModalState.entity === 'siswa'
                          ? 'Alasan Berhenti Sekolah (Wajib diisi)'
                          : 'Alasan Berhenti / Pensiun (Wajib diisi)'}
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(exitModalState.entity === 'siswa'
                          ? [
                              'Faktor Ekonomi Keluarga',
                              'Bekerja / Membantu Orang Tua',
                              'Masalah Kesehatan',
                              'Pindah Pendidikan Nonformal / Paket C',
                              'Alasan Pribadi / Keluarga'
                            ]
                          : [
                              'Pensiun / Batas Usia Pensiun',
                              'Mengundurkan Diri',
                              'Habis Masa Kontrak',
                              'Alih Profesi / Tugas Lain'
                            ]
                        ).map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() =>
                              setExitModalState(prev =>
                                prev ? { ...prev, alasanKeluar: preset, error: '' } : prev
                              )
                            }
                            className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                              exitModalState.alasanKeluar === preset
                                ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        placeholder={
                          exitModalState.entity === 'siswa'
                            ? 'Tuliskan penjelasan rinci alasan siswa berhenti sekolah...'
                            : 'Tuliskan alasan atau nomor SK berhenti/pensiun...'
                        }
                        value={exitModalState.alasanKeluar}
                        onChange={e =>
                          setExitModalState(prev =>
                            prev ? { ...prev, alasanKeluar: e.target.value, error: '' } : prev
                          )
                        }
                        className="w-full px-3 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  )}
                </div>
              )}

              {exitModalState.error && (
                <div className="px-3 py-2 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{exitModalState.error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setExitModalState(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded font-bold text-white flex items-center gap-1.5 shadow-xs ${
                    exitModalState.mode === 'hapus_permanen'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {exitModalState.mode === 'hapus_permanen' ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Permanen</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Status Keluar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
