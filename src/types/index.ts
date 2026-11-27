export type UserRole = 'admin_tu' | 'staf_agenda' | 'kepala_sekolah' | 'wakasek' | 'guru_staf';

export interface User {
  id: string;
  username: string;
  name: string;
  nip: string;
  role: UserRole;
  jabatan: string;
  email: string;
  isActive: boolean;
  pin: string;
}

export type SifatSurat = 'Biasa' | 'Penting' | 'Segera' | 'Sangat Segera' | 'Rahasia';

export type StatusSuratMasuk = 
  | 'Baru' 
  | 'Menunggu Disposisi' 
  | 'Didisposisikan' 
  | 'Dalam Proses' 
  | 'Selesai' 
  | 'Diarsipkan';

export type StatusSuratKeluar = 
  | 'Draf' 
  | 'Review KTU' 
  | 'Disetujui Kepsek' 
  | 'Sudah Dikirim' 
  | 'Diarsipkan'
  | 'Terkirim';

export type StatusDisposisi = 'Belum Ditindaklanjuti' | 'Sedang Diproses' | 'Selesai';

export interface FileAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
}

export interface Disposisi {
  id: string;
  suratId: string;
  tanggalDisposisi: string;
  diberikanOleh: string;
  diteruskanKepada: string[];
  instruksi: string[];
  catatanKhusus: string;
  tenggatWaktu: string;
  status: StatusDisposisi;
  tindakLanjutCatatan?: string;
  tglSelesai?: string;
}

export interface SuratMasuk {
  id: string;
  nomorAgenda: string;
  nomorSurat: string;
  tanggalSurat: string;
  tanggalTerima: string;
  pengirim: string;
  perihal: string;
  ringkasan: string;
  sifat: SifatSurat;
  kodeKlasifikasi: string;
  namaKlasifikasi: string;
  status: StatusSuratMasuk;
  lampiran: FileAttachment[];
  disposisiList: Disposisi[];
  lokasiFisikArsip: string;
  createdAt: string;
  createdBy: string;
}

export interface SuratKeluar {
  id: string;
  nomorAgenda: string;
  nomorSurat: string;
  tanggalSurat: string;
  tujuan: string;
  perihal: string;
  isiRingkas: string;
  ringkasanIsi?: string;
  sifat: SifatSurat;
  kodeKlasifikasi: string;
  namaKlasifikasi?: string;
  penandatangan: string;
  nipPenandatangan: string;
  status: StatusSuratKeluar;
  lampiran: FileAttachment[];
  lampiranCount?: number;
  tembusan: string[];
  lokasiFisikArsip: string;
  createdAt?: string;
  createdBy?: string;
}

export interface KlasifikasiSurat {
  kode: string;
  kategori: string;
  nama: string;
  keterangan: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  type: 'lokal' | 'email';
  fileName: string;
  size: string;
  status: 'Berhasil' | 'Gagal';
  targetEmail?: string;
  operator: string;
  note?: string;
}

export interface SchoolProfile {
  namaSekolah: string;
  npsn: string;
  akreditasi: string;
  alamat: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kodePos: string;
  telepon: string;
  faksimili?: string;
  email: string;
  website: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  pangkatKepsek: string;
  kepalaTU: string;
  nipKepalaTU: string;
  emailBackupDefault: string;
  autoBackupInterval: 'daily' | 'weekly' | 'manual';
  lastBackupDate?: string;
  logoUrl?: string;
  logoType?: 'default_vector' | 'custom_upload' | 'preset_jatim' | 'preset_adiwiyata' | 'custom' | 'default' | 'pemprov' | 'tutwuri' | 'adiwiyata';
  pemprovLogoUrl?: string;
  sekolahLogoUrl?: string;
}

export interface Siswa {
  id: string;
  nisn: string;
  nis: string;
  nama: string;
  kelas: string;
  jurusan?: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string;
  tempatTanggalLahir?: string;
  namaOrtu?: string;
  alamat?: string;
  prestasi?: string | string[];
  status: 'Aktif' | 'Alumni' | 'Pindah' | 'Mutasi' | 'Berhenti' | string;
  jenisKeluar?: 'Mutasi' | 'Berhenti Sekolah' | 'Lulus';
  tanggalKeluar?: string;
  tujuanMutasi?: string;
  alasanKeluar?: string;
  nomorSuratMutasi?: string;

  // Data Kartu Peserta Ulangan
  fotoUrl?: string;
  barcodeLink?: string;
  nomorUjian?: string;
  sesiUjian?: string;
  ruangUjian?: string;
  
  // Fields Dapodik Lengkap (Kemendikbud / Buku Induk)
  nipd?: string;
  nik?: string;
  agama?: string;
  rt?: string;
  rw?: string;
  dusun?: string;
  kelurahan?: string;
  kecamatan?: string;
  kodePos?: string;
  jenisTinggal?: string;
  alatTransportasi?: string;
  telepon?: string;
  hp?: string;
  email?: string;
  skhun?: string;
  penerimaKps?: string;
  noKps?: string;
  
  // Data Ayah
  namaAyah?: string;
  tahunLahirAyah?: string;
  jenjangPendidikanAyah?: string;
  pekerjaanAyah?: string;
  penghasilanAyah?: string;
  nikAyah?: string;
  
  // Data Ibu
  namaIbu?: string;
  tahunLahirIbu?: string;
  jenjangPendidikanIbu?: string;
  pekerjaanIbu?: string;
  penghasilanIbu?: string;
  nikIbu?: string;
  
  // Data Wali
  namaWali?: string;
  tahunLahirWali?: string;
  jenjangPendidikanWali?: string;
  pekerjaanWali?: string;
  penghasilanWali?: string;
  nikWali?: string;
  
  // Rombel & Ijazah
  rombelSaatIni?: string;
  noPesertaUN?: string;
  noSeriIjazah?: string;
  
  // Bantuan / KIP / PIP / KKS
  penerimaKip?: string;
  nomorKip?: string;
  namaDiKip?: string;
  nomorKks?: string;
  noRegAktaLahir?: string;
  bank?: string;
  noRekeningBank?: string;
  rekeningAtasNama?: string;
  layakPip?: string;
  alasanLayakPip?: string;
  kebutuhanKhusus?: string;
  
  // Periodik & Lokasi
  sekolahAsal?: string;
  anakKe?: string | number;
  lintang?: string;
  bujur?: string;
  noKk?: string;
  beratBadan?: string | number;
  tinggiBadan?: string | number;
  lingkarKepala?: string | number;
  jmlSaudaraKandung?: string | number;
  jarakSekolah?: string | number;
}

export interface Guru {
  id: string;
  nip: string;
  nama: string;
  gelar?: string;
  pangkatGolongan: string;
  jabatan: string;
  mapel?: string;
  mataPelajaran?: string;
  status?: 'PNS' | 'PPPK' | 'GTT' | string;
  statusKepegawaian?: 'PNS' | 'PPPK' | 'GTT' | string;
  statusAktif?: 'Aktif' | 'Mutasi' | 'Meninggal Dunia' | 'Berhenti' | 'Pensiun';
  jenisKeluar?: 'Mutasi' | 'Meninggal Dunia' | 'Berhenti' | 'Pensiun';
  tanggalKeluar?: string;
  tujuanMutasi?: string;
  alasanKeluar?: string;
  noHp?: string;
  email?: string;
  fotoUrl?: string;

  // Fields Dapodik GTK Kemendikbud Lengkap
  nuptk?: string;
  jenisKelamin?: 'L' | 'P';
  tempatLahir?: string;
  tanggalLahir?: string;
  jenisPtk?: string;
  agama?: string;
  alamatJalan?: string;
  rt?: string;
  rw?: string;
  namaDusun?: string;
  desaKelurahan?: string;
  kecamatan?: string;
  kodePos?: string;
  telepon?: string;
  hp?: string;
  tugasTambahan?: string;
  skCpns?: string;
  tanggalCpns?: string;
  skPengangkatan?: string;
  tmtPengangkatan?: string;
  lembagaPengangkatan?: string;
  sumberGaji?: string;
  namaIbuKandung?: string;
  statusPerkawinan?: string;
  namaSuamiIstri?: string;
  nipSuamiIstri?: string;
  pekerjaanSuamiIstri?: string;
  tmtPns?: string;
  sudahLisensiKepalaSekolah?: string;
  pernahDiklatKepengawasan?: string;
  keahlianBraille?: string;
  keahlianBahasaIsyarat?: string;
  npwp?: string;
  namaWajibPajak?: string;
  kewarganegaraan?: string;
  bank?: string;
  nomorRekeningBank?: string;
  rekeningAtasNama?: string;
  nik?: string;
  noKk?: string;
  karpeg?: string;
  karisKarsu?: string;
  lintang?: string;
  bujur?: string;
  nuks?: string;
}

// Tenaga Kependidikan (Tendik / TU / Staf Administrasi / Laboran / Pustakawan)
export interface Tendik extends Guru {
  tugasUtama?: string;
}

export type JenisTemplateSurat = 
  | 'surat_tugas_guru'
  | 'surat_keterangan_lomba'
  | 'surat_keterangan_aktif'
  | 'surat_rekomendasi_prestasi'
  | 'surat_keterangan_kelakuan_baik'
  | 'surat_panggilan_ortu'
  | 'surat_edaran_resmi';

export interface TemplateSurat {
  id: string;
  kode?: JenisTemplateSurat | string;
  nama?: string;
  judul?: string;
  kategori: string;
  kodeKlasifikasi: string;
  deskripsi?: string;
  formatNomor?: string;
  perihalDefault?: string;
  pembukaDefault?: string;
  isiDefault?: string;
  penutupDefault?: string;
  tembusanDefault?: string[];
  dasarHukum?: string;
  pembuka?: string;
  isi?: string;
  diktumTugas?: string;
  penutup?: string;
  tembusan?: string[];
}

export interface JadwalUjianItem {
  id: string;
  hariTanggal: string;
  waktu: string;
  mataPelajaran: string;
  kondisiTarget?: 'Semua' | 'Kelas' | 'Sesi' | 'Ruang';
  kondisiNilai?: string;
  keterangan?: string;
}

export interface JadwalUlanganRepoItem {
  id: string;
  nama: string;
  keterangan?: string;
  namaUjian?: string;
  tahunPelajaran?: string;
  semester?: string;
  judulBelakang?: string;
  catatanBelakang?: string;
  maksJadwalBelakang?: number;
  tataLetakJadwalBelakang?: 'otomatis' | '1_tabel' | '2_tabel';
  sinkronWaktuJadwalDenganSesi?: boolean;
  sesiTersedia?: string[];
  jadwalUjian: JadwalUjianItem[];
  isAutoArchive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CardFontStyle =
  | 'modern_sans'
  | 'classic_serif'
  | 'editorial_bold'
  | 'tech_mono'
  | 'royal_cinzel'
  | 'clean_inter'
  | 'humanist_poppins'
  | 'formal_merriweather'
  | 'condensed_oswald'
  | 'academic_lora';

export type CardFontWeight = 'normal' | 'tebal' | 'ekstra';
export type CardLetterSpacing = 'rapat' | 'standar' | 'lebar';

export type CardEmbossStyle = 'flat_clean' | 'soft_relief' | 'gold_foil' | 'classic_engraved';
export type CardAccentPattern =
  | 'classic_solid'
  | 'double_border'
  | 'corner_ribbon'
  | 'minimal_stripe'
  | 'guilloche_wave'
  | 'batik_geometris'
  | 'hex_tech'
  | 'diagonal_silk';

export interface CustomCardTheme {
  id: string;
  name: string;
  description?: string;
  outerBorderHex: string;
  bannerBgHex: string;
  bannerBgEndHex?: string;
  bannerTextHex: string;
  accentTextHex: string;
  subBannerBgHex: string;
  subBannerTextHex: string;
  tableHeaderBgHex: string;
  cardBgHex?: string;
  cardBgEndHex?: string;
  gradientAngle?: number;
  embossHighlightHex?: string;
  fontStyle?: CardFontStyle;
  fontBodyStyle?: CardFontStyle;
  embossStyle?: CardEmbossStyle;
  accentPattern?: CardAccentPattern;
  showWatermark?: boolean;
}

export interface KartuUjianSettings {
  namaUjian: string;
  judulKartu?: string;
  tahunPelajaran: string;
  semester: string;
  kotaTanggalCetak: string;
  prefixNomorUjian: string;
  nomorPesertaAwal?: string;
  sesiTersedia: string[];
  defaultRuangPrefix: string;
  kapasitasPerRuang: number;
  modePembagianRuang?: 'sequential' | 'per_sesi' | 'per_kelas';
  mulaiNomorRuang?: number;
  showTtdKs: boolean;
  showStempel: boolean;
  ttdKsUrl?: string;
  stempelUrl?: string;
  catatanKaki: string;
  layoutPerPage: 4 | 6 | 8 | 9;
  // Pengaturan Pencetakan
  ukuranKertas?: 'A4' | 'F4' | 'Letter';
  orientasiCetak?: 'portrait' | 'landscape';
  jumlahKolom?: 1 | 2 | 3;
  marginCetak?: 'sempit' | 'standar' | 'lebar';
  jarakAntarKartu?: 'rapat' | 'standar' | 'lega';
  lebarKartuMm?: number;
  tinggiKartuMm?: number;
  temaWarnaKartu?: 'hijau' | 'kuning' | 'merah' | 'biru' | 'abu_abu' | 'navy' | 'monokrom' | 'ai_custom';
  aiCustomTheme?: CustomCardTheme | null;
  aiThemePresets?: CustomCardTheme[];
  desainFont?: CardFontStyle;
  desainFontBody?: CardFontStyle;
  desainFontScale?: number;
  desainFontWeight?: CardFontWeight;
  desainLetterSpacing?: CardLetterSpacing;
  desainJudulKapital?: boolean;
  desainEmboss?: CardEmbossStyle;
  desainPolaBg?: CardAccentPattern;
  desainGradasiAktif?: boolean;
  desainWatermarkLogo?: boolean;
  garisPotong?: 'dashed_gunting' | 'dashed' | 'none';
  pisahHalamanPerRuang?: boolean;
  urutanCetak?: 'tabel' | 'ruang_nama' | 'kelas_nama' | 'nomor_ujian';
  tampilkanKop?: boolean;
  tampilkanFoto?: boolean;
  tampilkanRuang?: boolean;
  tampilkanSesi?: boolean;
  tampilkanTataTertib?: boolean;
  // Pengaturan Dua Sisi (Depan & Belakang) + Jadwal Kondisional
  modeSisiCetak?: 'depan_saja' | 'belakang_saja' | 'dua_sisi_bergantian' | 'pratinjau_berdampingan';
  mirrorDuplexBelakang?: boolean;
  judulBelakang?: string;
  subjudulBelakang?: string;
  tampilkanKolomParaf?: boolean;
  maksJadwalBelakang?: number;
  tataLetakJadwalBelakang?: 'otomatis' | '1_tabel' | '2_tabel';
  catatanBelakang?: string;
  sinkronWaktuJadwalDenganSesi?: boolean;
  jadwalUjian?: JadwalUjianItem[];
  activeJadwalRepoId?: string;
  // Pengaturan Foto & Barcode Link
  fotoLinkTemplate?: string;
  tampilkanBarcode?: boolean;
  posisiBarcode?: 'depan' | 'belakang' | 'keduanya';
  jenisBarcode?: 'qr_link' | 'barcode_1d' | 'gambar_url';
  barcodeLinkTemplate?: string;
}

export type PanitiaPengawasRole = 'panitia' | 'pengawas';

export interface JadwalPengawasSlot {
  id: string;
  hari: string;
  tanggal: string;
  waktu: string;
  mapel: string;
  sesiLabel: string;
}

export interface PanitiaPengawasItem {
  id: string;
  kategori: PanitiaPengawasRole;
  nomorTugas: string;
  nama: string;
  nip?: string;
  pangkatGolongan?: string;
  jabatanKepanitiaan: string;
  unitAsal?: string;
  ruangTugas?: string;
  sesiTugas?: string;
  tanggalTugas?: string;
  fotoUrl?: string;
  barcodeLink?: string;
  sourceType?: 'guru' | 'tendik' | 'manual';
  sourceId?: string;
  jadwalMengawas?: Record<string, string>;
}

export interface KartuPanitiaSettings {
  namaUjian: string;
  tahunPelajaran: string;
  semester: string;
  kotaTanggalCetak: string;
  nomorSkPanitia?: string;
  judulKartuPanitia: string;
  judulKartuPengawas: string;
  prefixNomorPanitia: string;
  prefixNomorPengawas: string;
  sesiTersedia?: string[];
  jabatanPanitiaTersedia?: string[];
  jabatanPengawasTersedia?: string[];
  jadwalPengawasSlots?: JadwalPengawasSlot[];
  tampilkanJadwalDiKartuPengawas?: boolean;
  modeTampilanBelakangPengawas?: 'jadwal_dan_tatib' | 'jadwal_saja' | 'tatib_saja';
  temaWarnaPanitia: 'hijau' | 'kuning' | 'merah' | 'biru' | 'abu_abu' | 'ai_custom';
  temaWarnaPengawas: 'hijau' | 'kuning' | 'merah' | 'biru' | 'abu_abu' | 'ai_custom';
  aiCustomThemePanitia?: CustomCardTheme | null;
  aiCustomThemePengawas?: CustomCardTheme | null;
  aiThemePresets?: CustomCardTheme[];
  desainFont?: CardFontStyle;
  desainFontBody?: CardFontStyle;
  desainFontPanitia?: CardFontStyle;
  desainFontPengawas?: CardFontStyle;
  desainFontScale?: number;
  desainFontWeight?: CardFontWeight;
  desainLetterSpacing?: CardLetterSpacing;
  desainJudulKapital?: boolean;
  desainEmboss?: CardEmbossStyle;
  desainPolaBg?: CardAccentPattern;
  desainGradasiAktif?: boolean;
  desainWatermarkLogo?: boolean;
  ukuranKertas: 'A4' | 'F4' | 'Letter';
  orientasiCetak: 'portrait' | 'landscape';
  jumlahKolom: 1 | 2 | 3;
  layoutPerPage: 4 | 6 | 8 | 9;
  marginCetak: 'sempit' | 'standar' | 'lebar';
  jarakAntarKartu: 'rapat' | 'standar' | 'lega';
  lebarKartuMm?: number;
  tinggiKartuMm?: number;
  lebarKartuPanitiaMm?: number;
  tinggiKartuPanitiaMm?: number;
  lebarKartuPengawasMm?: number;
  tinggiKartuPengawasMm?: number;
  garisPotong: 'dashed_gunting' | 'dashed' | 'none';
  modeSisiCetak: 'depan_saja' | 'dua_sisi_bergantian' | 'pratinjau_berdampingan' | 'gabung_lipat';
  mirrorDuplexBelakang?: boolean;
  tampilkanKop: boolean;
  tampilkanFoto: boolean;
  tampilkanNip: boolean;
  tampilkanRuang: boolean;
  tampilkanSesi: boolean;
  tampilkanBarcode: boolean;
  jenisBarcode: 'qr_link' | 'barcode_1d' | 'gambar_url';
  barcodeLinkTemplate: string;
  showTtdKs: boolean;
  showStempel: boolean;
  ttdKsUrl?: string;
  stempelUrl?: string;
  catatanPanitia: string;
  catatanPengawas: string;
  tataTertibPanitia: string[];
  tataTertibPengawas: string[];
}

export type KurikulumJenis =
  | 'Kurikulum Merdeka'
  | 'Kurikulum 2013 (K-13)'
  | 'KTSP 2006'
  | 'Kurikulum Nasional (Permendikbudristek 12/2024)'
  | 'Kustom Sekolah';

export interface KurikulumMapelItem {
  id: string;
  kode?: string;
  kelompok: string;
  namaMapel: string;
  jpPerMinggu?: number;
  kkm?: number;
  kondisiTingkat?: 'Semua' | 'X' | 'XI' | 'XII';
  kondisiRumpun?: string;
  kondisiStatus?: 'Wajib' | 'Pilihan' | 'Muatan Lokal' | 'Kokurikuler';
  keterangan?: string;
}

export interface BukuIndukKurikulumRepoItem {
  id: string;
  nama: string;
  jenisKurikulum: KurikulumJenis | string;
  tahunPelajaran: string;
  faseDefault?: string;
  skKurikulum?: string;
  skalaNilai?: '0-100' | 'Predikat A-D' | 'Desimal 0-4';
  deskripsi?: string;
  susunanPelajaran: KurikulumMapelItem[];
  isDefaultSeed?: boolean;
  isAutoArchive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BukuIndukActiveConfig {
  activeKurikulumRepoId?: string;
  jenisKurikulum: KurikulumJenis | string;
  namaKurikulumAktif: string;
  tahunPelajaran: string;
  faseDefault?: string;
  skKurikulum?: string;
  skalaNilai?: '0-100' | 'Predikat A-D' | 'Desimal 0-4';
  susunanPelajaran: KurikulumMapelItem[];
  kotaTanggalCetak?: string;
}

export interface BukuIndukSemesterScore {
  kkm?: string;
  pengN?: string;
  pengP?: string;
  ketN?: string;
  ketP?: string;
  nilaiAkhir?: string;
  predikat?: string;
  capaian?: string;
}

export interface BukuIndukMapelRecord {
  mapelKey: string;
  namaMapel: string;
  kelompok: string;
  kkm?: string;
  semesters: Record<string, BukuIndukSemesterScore>;
  rataRapor?: string;
  nilaiUs?: string;
  nilaiIjazah?: string;
}

export interface BukuIndukTahunMeta {
  tahunPelajaran?: string;
  kelasLabel?: string;
  kkm?: string;
  sikapSpiritual?: string;
  sikapSosial?: string;
  sakit?: string;
  ijin?: string;
  alpha?: string;
  statusAkhir?: 'Naik' | 'Tinggal' | 'Lulus' | 'Tidak Lulus' | '';
  naikKeKelas?: string;
  tanggalTtd?: string;
  waliKelasLabel?: string;
  waliKelasNama?: string;
  waliKelasNip?: string;
}

export interface BukuIndukEkskulItem {
  nama: string;
  x?: string;
  xi?: string;
  xii?: string;
}

export interface BukuIndukSiswaMeta {
  siswaId: string;
  nomorBukuInduk?: string;
  nomorUrutInduk?: string;
  tanggalDiterima?: string;
  diterimaDiKelas?: string;
  diterimaKelompok?: string;
  statusAsalMasuk?: 'Siswa Baru' | 'Pindahan / Mutasi Masuk';
  tahunMasuk?: string;
  kurikulumKhususId?: string;
  programStudi?: string;
  catatanKelulusan?: string;
  tanggalKeluarMutasi?: string;
  alasanKeluarMutasi?: string;
  nomorSuratPindahKeluar?: string;
  kelasDitinggalkanMutasi?: string;
  tujuanSekolahPindah?: string;
  nomorSuratPindahMasuk?: string;
  nilaiPerMapel?: Record<string, Record<string, string>>;
  // Halaman 2: Lembar Nilai Multi-Tahun (X, XI, XII) & Perkembangan
  transkripNilai?: Record<string, BukuIndukMapelRecord>;
  catatanWaliKelasPerSemester?: Record<string, string>;
  tahunAjaranMeta?: {
    X?: BukuIndukTahunMeta;
    XI?: BukuIndukTahunMeta;
    XII?: BukuIndukTahunMeta;
    ijazahTahun?: string;
    statusKelulusan?: 'Lulus' | 'Tidak Lulus' | '';
    lulusKelas?: string;
    tanggalLulus?: string;
  };
  ekskulRecords?: BukuIndukEkskulItem[];
  organisasiSekolah?: string;
  // Butir Resmi SMA Buku Induk (A s.d. J, 1 s.d. 57)
  namaPanggilan?: string;
  kewarganegaraan?: string;
  jumlahSaudaraTiri?: string;
  jumlahSaudaraAngkat?: string;
  statusYatimPiatu?: string;
  bahasaRumah?: string;
  golonganDarah?: string;
  penyakitPernahDiderita?: string;
  kelainanJasmani?: string;
  tinggiBeratSaatDiterima?: string;
  tamatanDari?: string;
  tglNoIjazahSebelumnya?: string;
  tglNoSttlSebelumnya?: string;
  lamaBelajarSebelumnya?: string;
  pindahanDariSekolah?: string;
  alasanPindahan?: string;
  ayahTtl?: string;
  ayahAgama?: string;
  ayahWargaNegara?: string;
  ayahAlamatTelp?: string;
  ayahStatusHidup?: string;
  ibuTtl?: string;
  ibuAgama?: string;
  ibuWargaNegara?: string;
  ibuAlamatTelp?: string;
  ibuStatusHidup?: string;
  waliTtl?: string;
  waliAgama?: string;
  waliWargaNegara?: string;
  waliAlamatTelp?: string;
  kegemaranKesenian?: string;
  kegemaranOlahraga?: string;
  kegemaranOrganisasi?: string;
  kegemaranLain?: string;
  menerimaBeasiswa?: string;
  tamatBelajarLulus?: string;
  noIjazahAkhir?: string;
  noSuratTandaLulus?: string;
  nilaiRataRataAkhir?: string;
  akanMelanjutkanKe?: string;
  akanBekerjaDi?: string;
}

export type TempelRuangFontModel =
  | 'outfit_tegas'
  | 'barlow_signage'
  | 'oswald_poster'
  | 'bebas_blok'
  | 'bricolage_karakter'
  | 'jakarta_resmi'
  | 'jetbrains_cbt'
  | 'playfair_klasik'
  | 'cinzel_piagam'
  | 'poppins_jelas';

export type TempelRuangTingkat = 'X' | 'XI' | 'XII' | 'Gabungan';

export type TempelRuangColorPreset =
  | 'otomatis_tingkat'
  | 'biru_resmi'
  | 'zamrud_hijau'
  | 'amber_emas'
  | 'marun_tegas'
  | 'slate_gelap'
  | 'monokrom_hemat';

export type TempelRuangFrameStyle =
  | 'blok_angka'
  | 'header_modern'
  | 'klasik_ganda'
  | 'minimal_tegas';

export interface TempelRuangKelompok {
  id: string;
  namaKelompok: string;
  tingkatKelas: TempelRuangTingkat;
  gedungLokasi?: string;
  warnaBadge?: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate';
  catatan?: string;
  urutan: number;
}

export interface TempelRuangItem {
  id: string;
  nomorRuang: string;
  labelUtama?: string;
  kelompokId: string;
  tingkatKelas: TempelRuangTingkat;
  kelasRombel?: string;
  jumlahPeserta?: number;
  rentangNomorPeserta?: string;
  sesiUjian?: string;
  lokasiGedung?: string;
  catatanTambahan?: string;
  dipilihCetak?: boolean;
  autoMatchedFromKartuUjian?: boolean;
}

export interface TempelRuangSettings {
  paperSize: 'A4' | 'F4';
  orientasi: 'portrait' | 'landscape';
  labelPerPage: 1 | 2 | 4;
  marginMm: number;
  gapMm: number;
  garisPotong: 'dashed_gunting' | 'dashed' | 'none';
  pisahHalamanPerKelompok: boolean;
  ikutiSettingKartuUjian?: boolean;
  fontModel: TempelRuangFontModel;
  fontBodyModel: 'jakarta' | 'manrope' | 'poppins' | 'jetbrains';
  skalaAngkaPct: number;
  skalaTeksPct: number;
  spasiHuruf: 'rapat' | 'standar' | 'lebar';
  kapitalJudul: boolean;
  desainBingkai: TempelRuangFrameStyle;
  warnaPreset: TempelRuangColorPreset;
  judulAtas: string;
  subjudulUjian: string;
  tahunPelajaran: string;
  semester: string;
  catatanKaki: string;
  tampilkanKopMini: boolean;
  tampilkanKelompokBadge: boolean;
  tampilkanKelasRombel: boolean;
  tampilkanRentangNomor: boolean;
  tampilkanJumlahPeserta: boolean;
  tampilkanSesi: boolean;
  tampilkanLokasi: boolean;
  tampilkanQrVerifikasi: boolean;
}

export interface TempelRuangConfigBundle {
  settings: TempelRuangSettings;
  kelompokList: TempelRuangKelompok[];
  ruangList: TempelRuangItem[];
  updatedAt: string;
}

export type StrukturRelationType = 'perintah' | 'koordinasi';

export interface StrukturLevelRule {
  level: number;
  namaLevel: string;
  aturanTataLetak: 'sejajar_pusat' | 'grid_seimbang' | 'cabang_bertingkat';
  maksKolom: number;
  tampilkanLabelLevel: boolean;
}

export interface StrukturStafWakaItem {
  id: string;
  nama: string;
  nip?: string;
  jabatanStaf?: string;
  pangkatGolongan?: string;
  fotoUrl?: string;
  sourceType?: 'guru' | 'tendik' | 'manual';
  sourceId?: string;
}

export interface StrukturNodeItem {
  id: string;
  jabatan: string;
  bidang?: string;
  nama: string;
  nip: string;
  pangkatGolongan: string;
  fotoUrl?: string;
  parentId: string | null;
  additionalParentIds?: string[];
  connectFromAllWaka?: boolean;
  relationFromParent: StrukturRelationType;
  level: number;
  urutan: number;
  sidePosition?: 'center' | 'left' | 'right';
  warnaAccent?: 'navy' | 'slate' | 'emerald' | 'amber' | 'teal' | 'rose';
  catatanTugas?: string;
  tupoksi?: string[];
  stafWaka?: StrukturStafWakaItem[];
  tampilkanStafWaka?: boolean;
  tampilDiSederhana?: boolean;
  sourceType?: 'guru' | 'tendik' | 'manual';
  sourceId?: string;
  isActive?: boolean;
}

export interface StrukturCrossLink {
  id: string;
  fromId: string;
  toId: string;
  relationType: StrukturRelationType;
  label?: string;
  anchorStyle?: 'auto' | 'top' | 'bottom' | 'side';
}

export interface StrukturOrganisasiSettings {
  modeStruktur?: 'sederhana' | 'kompleks';
  judulBagan: string;
  subjudulTahun: string;
  nomorSk: string;
  kotaTanggal: string;
  tampilkanKopSurat: boolean;
  tampilkanFoto: boolean;
  tampilkanNip: boolean;
  tampilkanPangkat: boolean;
  tampilkanBidang: boolean;
  tampilkanLegenda: boolean;
  tampilkanTtdKs: boolean;
  tampilkanStempel: boolean;
  autoSinkronLevelDariAtasan: boolean;
  autoKelompokkanBawahanSejajarAtasan: boolean;
  paperSize: 'A4' | 'F4' | 'A3';
  orientasi: 'landscape' | 'portrait';
  marginMm?: number;
  autoFitKeKertas?: boolean;
  skalaBaganManualPct?: number;
  cetakBagian?: 'semua' | 'bagan_saja' | 'tupoksi_saja';
  tupoksiOrientasi?: 'sama_bagan' | 'portrait' | 'landscape';
  tupoksiLayout?: 'tabel_resmi' | 'kartu_2_kolom';
  judulTupoksi?: string;
  tampilkanKopDiTupoksi?: boolean;
  lineStyleMode: 'ortogonal_tegas' | 'siku_halus';
  ketebalanGaris: number;
  warnaGarisPerintah: string;
  warnaGarisKoordinasi: string;
  gayaKartu: 'resmi_klasik' | 'modern_bersih' | 'monokrom_cetak';
  ttdKsUrl?: string;
  stempelUrl?: string;
}

export interface StrukturOrganisasiBundle {
  settings: StrukturOrganisasiSettings;
  levelRules: StrukturLevelRule[];
  nodes: StrukturNodeItem[];
  crossLinks: StrukturCrossLink[];
  topRowSchemaVersion?: number;
  updatedAt: string;
}

export interface BeritaAcaraSiswaAbsenItem {
  id: string;
  nomorPeserta: string;
  nama: string;
  kelas?: string;
  keterangan: 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat' | 'Lainnya';
  catatan?: string;
}

export interface BeritaAcaraUjianRecord {
  id: string;
  nomorBeritaAcara: string;
  namaUjian: string;
  tahunPelajaran: string;
  semester: string;
  tanggalIso: string;
  hariTanggalText: string;
  waktuMulai: string;
  waktuSelesai: string;
  sesiUjian: string;
  mataPelajaran: string;
  tingkatKelas: string;
  kelasRombel: string;
  ruangUjian: string;
  jumlahSeharusnya: number;
  jumlahHadir: number;
  jumlahTidakHadir: number;
  siswaTidakHadirList: BeritaAcaraSiswaAbsenItem[];
  kondisiSampulNaskah: 'baik_tersegel' | 'rusak_terbuka' | 'cbt_lancar' | 'lainnya';
  kesesuaianJumlahSoal: 'lengkap_cukup' | 'kurang' | 'lebih';
  selisihSoalQty?: string;
  keadaanRuangDanPelaksanaan: 'tertib_aman_lancar' | 'ada_kendala';
  catatanKejadianKhusus: string;
  pengawas1Nama: string;
  pengawas1Nip: string;
  pengawas2Nama: string;
  pengawas2Nip: string;
  kotaTanggalTtd: string;
  pengetahuiJabatan: string;
  pengetahuiNama: string;
  pengetahuiNip: string;
  updatedAt: string;
}

export type PresensiStatusType =
  | 'HADIR'
  | 'TERLAMBAT'
  | 'SAKIT'
  | 'IZIN'
  | 'CUTI'
  | 'ALPA'
  | 'LIBUR'
  | 'DL_PENUH'
  | 'DL_MASUK'
  | 'DL_PULANG'
  | 'LUPA_ABSEN';

export interface PresensiEmployeeItem {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  kategori: 'Guru' | 'Karyawan / Tendik';
  statusKepegawaian: 'PNS' | 'PPPK' | 'PPPK PW' | 'GTT' | 'PTT' | 'Honorer';
  pangkatGolongan: string;
  jamKerja: string;
  tppNominal: number;
  sourceType?: 'guru' | 'tendik' | 'manual';
  sourceId?: string;
}

export interface DailyPresensiRecord {
  date: string; // YYYY-MM-DD
  status: PresensiStatusType;
  jamDatang?: string;
  jamPulang?: string;
  polaKerja?: string;
  menitTerlambat?: number;
  menitPulangAwal?: number;
  keterangan?: string;
  hasBukti?: boolean;
  kategoriBukti?: string;
}

export interface PresensiHolidayItem {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'NASIONAL' | 'INSTITUSIONAL';
}

export interface PresensiBuktiIzinItem {
  id: string;
  employeeId: string;
  nip: string;
  nama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  kategoriIjin:
    | 'Lupa Absen Datang'
    | 'Lupa Absen Pulang'
    | 'Lupa Keduanya'
    | 'Sakit'
    | 'Izin Khusus'
    | 'Dinas Luar'
    | 'Force Majeure';
  nomorSurat: string;
  keterangan: string;
  verifiedBy?: string;
  createdAt: string;
}

export interface PresensiConfig {
  namaInstansi: string;
  namaSubUnit: string;
  kodeUnitKerja: string;
  zonaWaktu: 'WIB' | 'WITA' | 'WIT';
  defaultJamMasuk: string;
  defaultJamPulang: string;
  defaultJamPulangJumat: string;
  toleransiKeterlambatanMenit: number;
  potonganTppPerMenitPersen: number;
  potonganAlpaPersen: number;
  tarifMakanHarian: number;
  kotaTandaTangan: string;
  ttdAtasanNama: string;
  ttdAtasanNip: string;
  ttdAtasanJabatan: string;
  ttdOperatorNama: string;
  ttdOperatorNip: string;
  holidays: PresensiHolidayItem[];
}

export interface EmployeeMonthlyPresensiSummary {
  employee: PresensiEmployeeItem;
  hariKerjaEfektif: number;
  hadirTepat: number;
  terlambatHari: number;
  totalMenitTerlambat: number;
  pulangAwalHari: number;
  totalMenitPulangAwal: number;
  sakit: number;
  izin: number;
  cuti: number;
  alpa: number;
  dinasLuar: number;
  lupaAbsen: number;
  libur: number;
  persentaseHadir: number;
  potonganPersen: number;
  potonganNominalRp: number;
  uangMakanRp: number;
}

export interface PresensiMonthlyRepoItem {
  id: string;
  year: number;
  month: number; // 1..12
  label: string;
  fileName?: string;
  fileSizeBytes?: number;
  sourceType: 'excel_import' | 'manual_snapshot';
  importMode?: 'merge' | 'replace';
  importedAt: string;
  updatedAt: string;
  importedBy?: string;
  employeeCount: number;
  guruCount: number;
  tendikCount: number;
  avgPersentaseHadir: number;
  totalHadirTepat: number;
  totalTerlambatHari: number;
  totalAlpa: number;
  employees: PresensiEmployeeItem[];
  monthAttendanceMap: Record<string, Record<string, DailyPresensiRecord>>;
  catatan?: string;
  hasRawExcelFile?: boolean;
}

export type SkpStatusVerifikasi = 'Belum Diperiksa' | 'Terbaca & Valid' | 'Perlu Perbaikan';

export type SkpBuktiFileType = 'pdf' | 'image' | 'excel' | 'text' | 'link';

export type SkpBuktiKategori =
  | 'SK / Surat Tugas'
  | 'Perangkat Ajar / Modul'
  | 'Laporan Kegiatan'
  | 'Daftar Hadir / Rekap'
  | 'Sertifikat / Piagam'
  | 'Dokumentasi Foto'
  | 'Tautan Drive / e-Kinerja'
  | 'Lainnya';

export interface SkpBuktiDukungItem {
  id: string;
  judul: string;
  ringkasanIsi: string;
  kategori: SkpBuktiKategori;
  nomorDokumen?: string;
  tanggalDokumen: string;
  jenisFile: SkpBuktiFileType;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  externalUrl?: string;
  teksNarasi?: string;
  statusVerifikasi: SkpStatusVerifikasi;
  catatanPenilai?: string;
  hasBinaryBlob?: boolean;
  inlinePreviewDataUrl?: string;
  uploadedAt: string;
}

export interface SkpIndikatorKinerja {
  id: string;
  aspek: 'Kuantitas' | 'Kualitas' | 'Waktu' | 'Biaya';
  indikator: string;
  target: string;
  realisasi: string;
  capaianPersen: number;
  umpanBalik?: string;
}

export interface SkpRhkItem {
  id: string;
  jenis: 'Utama' | 'Tambahan';
  rhkAtasan: string;
  rencanaHasilKerja: string;
  periodeLabel: string;
  indikatorList: SkpIndikatorKinerja[];
  buktiDukungList: SkpBuktiDukungItem[];
}

export interface SkpPerilakuItem {
  aspek: string;
  ekspektasiKhusus: string;
  umpanBalik: string;
}

export type SkpRatingLevel = 'Diatas Ekspektasi' | 'Sesuai Ekspektasi' | 'Dibawah Ekspektasi';

export type SkpPredikatKinerja =
  | 'Sangat Baik'
  | 'Baik'
  | 'Butuh Perbaikan'
  | 'Kurang'
  | 'Sangat Kurang';

export interface SkpDocumentRecord {
  id: string;
  pegawaiSourceType: 'guru' | 'tendik' | 'manual';
  pegawaiSourceId?: string;
  pegawaiNama: string;
  pegawaiNip: string;
  pegawaiPangkatGol: string;
  pegawaiJabatan: string;
  pegawaiUnitKerja: string;
  penilaiNama: string;
  penilaiNip: string;
  penilaiPangkatGol: string;
  penilaiJabatan: string;
  penilaiUnitKerja: string;
  tahun: number;
  periode: string;
  pendekatan: 'Kuantitatif' | 'Kualitatif';
  ratingHasilKerja: SkpRatingLevel;
  ratingPerilaku: SkpRatingLevel;
  predikatKinerja: SkpPredikatKinerja;
  rhkList: SkpRhkItem[];
  perilakuList: SkpPerilakuItem[];
  catatanEvaluasi?: string;
  updatedAt: string;
}

export interface DatabaseSnapshot {
  version: string;
  exportedAt: string;
  exportedBy: string;
  institution: string;
  schoolProfile: SchoolProfile;
  suratMasuk: SuratMasuk[];
  suratKeluar: SuratKeluar[];
  users: User[];
  siswa?: Siswa[];
  guru?: Guru[];
  tendik?: Tendik[];
  templates?: TemplateSurat[];
  kartuUjianSettings?: KartuUjianSettings;
  jadwalUlanganRepo?: JadwalUlanganRepoItem[];
  bukuIndukConfig?: BukuIndukActiveConfig;
  bukuIndukKurikulumRepo?: BukuIndukKurikulumRepoItem[];
  bukuIndukSiswaMeta?: Record<string, BukuIndukSiswaMeta>;
  tempelRuangConfig?: TempelRuangConfigBundle;
  strukturOrganisasi?: StrukturOrganisasiBundle;
  beritaAcaraUjian?: BeritaAcaraUjianRecord[];
  presensiPegawai?: {
    employees: PresensiEmployeeItem[];
    attendanceMap: Record<string, Record<string, DailyPresensiRecord>>;
    config: PresensiConfig;
    buktiList: PresensiBuktiIzinItem[];
    monthlyRepo?: PresensiMonthlyRepoItem[];
  };
  presensiMonthlyRepo?: PresensiMonthlyRepoItem[];
  panitiaPengawas?: PanitiaPengawasItem[];
  kartuPanitiaSettings?: KartuPanitiaSettings;
  skpRecords?: SkpDocumentRecord[];
  auditLogs: AuditLog[];
  backupHistory: BackupRecord[];
}
