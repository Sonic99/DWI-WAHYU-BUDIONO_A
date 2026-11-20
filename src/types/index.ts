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
  status: 'Aktif' | 'Alumni' | 'Pindah';

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
  noHp?: string;
  email?: string;

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
  panitiaPengawas?: PanitiaPengawasItem[];
  kartuPanitiaSettings?: KartuPanitiaSettings;
  auditLogs: AuditLog[];
  backupHistory: BackupRecord[];
}
