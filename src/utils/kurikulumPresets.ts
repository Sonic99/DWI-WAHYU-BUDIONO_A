import {
  BukuIndukActiveConfig,
  BukuIndukKurikulumRepoItem,
  KurikulumMapelItem,
  Siswa
} from '../types';

export const DEFAULT_KURIKULUM_MERDEKA_MAPEL: KurikulumMapelItem[] = [
  { id: 'km-01', kode: 'PAI', kelompok: 'A. Mata Pelajaran Wajib', namaMapel: 'Pendidikan Agama dan Budi Pekerti', jpPerMinggu: 3, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-02', kode: 'PP', kelompok: 'A. Mata Pelajaran Wajib', namaMapel: 'Pendidikan Pancasila', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-03', kode: 'IND', kelompok: 'A. Mata Pelajaran Wajib', namaMapel: 'Bahasa Indonesia', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-04', kode: 'MTK', kelompok: 'A. Mata Pelajaran Wajib', namaMapel: 'Matematika', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-05', kode: 'ING', kelompok: 'A. Mata Pelajaran Wajib', namaMapel: 'Bahasa Inggris', jpPerMinggu: 3, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-06', kode: 'PJK', kelompok: 'A. Mata Pelajaran Wajib', namaMapel: 'Pendidikan Jasmani, Olahraga & Kesehatan', jpPerMinggu: 3, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-07', kode: 'SEJ', kelompok: 'A. Mata Pelajaran Wajib', namaMapel: 'Sejarah', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-08', kode: 'SBD', kelompok: 'A. Mata Pelajaran Wajib', namaMapel: 'Seni Budaya dan Prakarya', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-09', kode: 'INF-E', kelompok: 'A. Mata Pelajaran Wajib (Fase E)', namaMapel: 'Informatika / Koding Dasar', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'X', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib', keterangan: 'Wajib di Kelas X Fase E' },
  { id: 'km-10', kode: 'FIS-E', kelompok: 'B. IPA & IPS Terpadu (Fase E)', namaMapel: 'Fisika (IPA Fase E)', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'X', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-11', kode: 'KIM-E', kelompok: 'B. IPA & IPS Terpadu (Fase E)', namaMapel: 'Kimia (IPA Fase E)', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'X', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-12', kode: 'BIO-E', kelompok: 'B. IPA & IPS Terpadu (Fase E)', namaMapel: 'Biologi (IPA Fase E)', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'X', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-13', kode: 'SOS-E', kelompok: 'B. IPA & IPS Terpadu (Fase E)', namaMapel: 'Sosiologi (IPS Fase E)', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'X', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-14', kode: 'EKO-E', kelompok: 'B. IPA & IPS Terpadu (Fase E)', namaMapel: 'Ekonomi (IPS Fase E)', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'X', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-15', kode: 'GEO-E', kelompok: 'B. IPA & IPS Terpadu (Fase E)', namaMapel: 'Geografi (IPS Fase E)', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'X', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'km-16', kode: 'MTK-L', kelompok: 'C. Mata Pelajaran Pilihan (Fase F)', namaMapel: 'Matematika Tingkat Lanjut', jpPerMinggu: 5, kkm: 76, kondisiTingkat: 'XI', kondisiRumpun: 'MIPA, IPA, A, B, Saintek, Semua', kondisiStatus: 'Pilihan', keterangan: 'Fase F Kelas XI' },
  { id: 'km-17', kode: 'FIS-F', kelompok: 'C. Mata Pelajaran Pilihan (Fase F)', namaMapel: 'Fisika Lanjut', jpPerMinggu: 5, kkm: 76, kondisiTingkat: 'XI', kondisiRumpun: 'MIPA, IPA, A, Saintek, Semua', kondisiStatus: 'Pilihan' },
  { id: 'km-18', kode: 'KIM-F', kelompok: 'C. Mata Pelajaran Pilihan (Fase F)', namaMapel: 'Kimia Lanjut', jpPerMinggu: 5, kkm: 76, kondisiTingkat: 'XI', kondisiRumpun: 'MIPA, IPA, A, B, Saintek, Semua', kondisiStatus: 'Pilihan' },
  { id: 'km-19', kode: 'BIO-F', kelompok: 'C. Mata Pelajaran Pilihan (Fase F)', namaMapel: 'Biologi Lanjut', jpPerMinggu: 5, kkm: 76, kondisiTingkat: 'XI', kondisiRumpun: 'MIPA, IPA, B, Saintek, Semua', kondisiStatus: 'Pilihan' },
  { id: 'km-20', kode: 'EKO-F', kelompok: 'C. Mata Pelajaran Pilihan (Fase F)', namaMapel: 'Ekonomi & Akuntansi Lanjut', jpPerMinggu: 5, kkm: 76, kondisiTingkat: 'XI', kondisiRumpun: 'IPS, Soshum, C, D, Semua', kondisiStatus: 'Pilihan' },
  { id: 'km-21', kode: 'SOS-F', kelompok: 'C. Mata Pelajaran Pilihan (Fase F)', namaMapel: 'Sosiologi Lanjut', jpPerMinggu: 5, kkm: 76, kondisiTingkat: 'XII', kondisiRumpun: 'Semua', kondisiStatus: 'Pilihan', keterangan: 'Fase F Kelas XII' },
  { id: 'km-22', kode: 'ING-L', kelompok: 'C. Mata Pelajaran Pilihan (Fase F)', namaMapel: 'Bahasa Inggris Tingkat Lanjut', jpPerMinggu: 5, kkm: 76, kondisiTingkat: 'XII', kondisiRumpun: 'Semua', kondisiStatus: 'Pilihan' },
  { id: 'km-23', kode: 'BJW', kelompok: 'D. Muatan Lokal Provinsi Jawa Timur', namaMapel: 'Bahasa Jawa', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Muatan Lokal' },
  { id: 'km-24', kode: 'P5', kelompok: 'E. Kokurikuler', namaMapel: 'Projek Penguatan Profil Pelajar Pancasila (P5)', jpPerMinggu: 10, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Kokurikuler' }
];

export const DEFAULT_K13_MAPEL: KurikulumMapelItem[] = [
  { id: 'k13-01', kode: 'PAI', kelompok: 'Kelompok A (Umum)', namaMapel: 'Pendidikan Agama dan Budi Pekerti', jpPerMinggu: 3, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-02', kode: 'PPKN', kelompok: 'Kelompok A (Umum)', namaMapel: 'Pendidikan Pancasila dan Kewarganegaraan', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-03', kode: 'IND', kelompok: 'Kelompok A (Umum)', namaMapel: 'Bahasa Indonesia', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-04', kode: 'MTK-W', kelompok: 'Kelompok A (Umum)', namaMapel: 'Matematika (Wajib)', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-05', kode: 'SEJ-I', kelompok: 'Kelompok A (Umum)', namaMapel: 'Sejarah Indonesia', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-06', kode: 'ING', kelompok: 'Kelompok A (Umum)', namaMapel: 'Bahasa Inggris', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-07', kode: 'SBD', kelompok: 'Kelompok B (Umum)', namaMapel: 'Seni Budaya', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-08', kode: 'PJOK', kelompok: 'Kelompok B (Umum)', namaMapel: 'Pendidikan Jasmani, Olahraga, dan Kesehatan', jpPerMinggu: 3, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-09', kode: 'PKWU', kelompok: 'Kelompok B (Umum)', namaMapel: 'Prakarya dan Kewirausahaan', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'k13-10', kode: 'BJW', kelompok: 'Kelompok B (Muatan Lokal)', namaMapel: 'Bahasa Daerah (Bahasa Jawa)', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Muatan Lokal' },
  { id: 'k13-11', kode: 'MTK-P', kelompok: 'Kelompok C (Peminatan MIPA)', namaMapel: 'Matematika Peminatan', jpPerMinggu: 4, kkm: 76, kondisiTingkat: 'Semua', kondisiRumpun: 'MIPA, IPA', kondisiStatus: 'Pilihan' },
  { id: 'k13-12', kode: 'BIO', kelompok: 'Kelompok C (Peminatan MIPA)', namaMapel: 'Biologi', jpPerMinggu: 4, kkm: 76, kondisiTingkat: 'Semua', kondisiRumpun: 'MIPA, IPA', kondisiStatus: 'Pilihan' },
  { id: 'k13-13', kode: 'FIS', kelompok: 'Kelompok C (Peminatan MIPA)', namaMapel: 'Fisika', jpPerMinggu: 4, kkm: 76, kondisiTingkat: 'Semua', kondisiRumpun: 'MIPA, IPA', kondisiStatus: 'Pilihan' },
  { id: 'k13-14', kode: 'KIM', kelompok: 'Kelompok C (Peminatan MIPA)', namaMapel: 'Kimia', jpPerMinggu: 4, kkm: 76, kondisiTingkat: 'Semua', kondisiRumpun: 'MIPA, IPA', kondisiStatus: 'Pilihan' },
  { id: 'k13-15', kode: 'GEO', kelompok: 'Kelompok C (Peminatan IPS)', namaMapel: 'Geografi', jpPerMinggu: 4, kkm: 76, kondisiTingkat: 'Semua', kondisiRumpun: 'IPS', kondisiStatus: 'Pilihan' },
  { id: 'k13-16', kode: 'SEJ-P', kelompok: 'Kelompok C (Peminatan IPS)', namaMapel: 'Sejarah Peminatan', jpPerMinggu: 4, kkm: 76, kondisiTingkat: 'Semua', kondisiRumpun: 'IPS', kondisiStatus: 'Pilihan' },
  { id: 'k13-17', kode: 'SOS', kelompok: 'Kelompok C (Peminatan IPS)', namaMapel: 'Sosiologi', jpPerMinggu: 4, kkm: 76, kondisiTingkat: 'Semua', kondisiRumpun: 'IPS', kondisiStatus: 'Pilihan' },
  { id: 'k13-18', kode: 'EKO', kelompok: 'Kelompok C (Peminatan IPS)', namaMapel: 'Ekonomi', jpPerMinggu: 4, kkm: 76, kondisiTingkat: 'Semua', kondisiRumpun: 'IPS', kondisiStatus: 'Pilihan' },
  { id: 'k13-19', kode: 'LM-ING', kelompok: 'Lintas Minat', namaMapel: 'Bahasa dan Sastra Inggris (Lintas Minat)', jpPerMinggu: 3, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Pilihan' }
];

export const DEFAULT_KTSP_2006_MAPEL: KurikulumMapelItem[] = [
  { id: 'ktsp-01', kode: 'AGM', kelompok: 'Mata Pelajaran Wajib', namaMapel: 'Pendidikan Agama', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'ktsp-02', kode: 'PKN', kelompok: 'Mata Pelajaran Wajib', namaMapel: 'Pendidikan Kewarganegaraan', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'ktsp-03', kode: 'IND', kelompok: 'Mata Pelajaran Wajib', namaMapel: 'Bahasa Indonesia', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'ktsp-04', kode: 'ING', kelompok: 'Mata Pelajaran Wajib', namaMapel: 'Bahasa Inggris', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'ktsp-05', kode: 'MTK', kelompok: 'Mata Pelajaran Wajib', namaMapel: 'Matematika', jpPerMinggu: 4, kkm: 72, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'ktsp-06', kode: 'TIK', kelompok: 'Mata Pelajaran Wajib', namaMapel: 'Teknologi Informasi dan Komunikasi (TIK)', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'ktsp-07', kode: 'PJK', kelompok: 'Mata Pelajaran Wajib', namaMapel: 'Pendidikan Jasmani, Olahraga & Kesehatan', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'ktsp-08', kode: 'SBD', kelompok: 'Mata Pelajaran Wajib', namaMapel: 'Seni Budaya', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Wajib' },
  { id: 'ktsp-09', kode: 'FIS', kelompok: 'Program Ilmu Pengetahuan Alam (IPA)', namaMapel: 'Fisika', jpPerMinggu: 4, kkm: 72, kondisiTingkat: 'XI', kondisiRumpun: 'IPA, MIPA', kondisiStatus: 'Pilihan' },
  { id: 'ktsp-10', kode: 'KIM', kelompok: 'Program Ilmu Pengetahuan Alam (IPA)', namaMapel: 'Kimia', jpPerMinggu: 4, kkm: 72, kondisiTingkat: 'XI', kondisiRumpun: 'IPA, MIPA', kondisiStatus: 'Pilihan' },
  { id: 'ktsp-11', kode: 'BIO', kelompok: 'Program Ilmu Pengetahuan Alam (IPA)', namaMapel: 'Biologi', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'XI', kondisiRumpun: 'IPA, MIPA', kondisiStatus: 'Pilihan' },
  { id: 'ktsp-12', kode: 'EKO', kelompok: 'Program Ilmu Pengetahuan Sosial (IPS)', namaMapel: 'Ekonomi & Akuntansi', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'XI', kondisiRumpun: 'IPS', kondisiStatus: 'Pilihan' },
  { id: 'ktsp-13', kode: 'SOS', kelompok: 'Program Ilmu Pengetahuan Sosial (IPS)', namaMapel: 'Sosiologi', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'XI', kondisiRumpun: 'IPS', kondisiStatus: 'Pilihan' },
  { id: 'ktsp-14', kode: 'GEO', kelompok: 'Program Ilmu Pengetahuan Sosial (IPS)', namaMapel: 'Geografi', jpPerMinggu: 4, kkm: 75, kondisiTingkat: 'XI', kondisiRumpun: 'IPS', kondisiStatus: 'Pilihan' },
  { id: 'ktsp-15', kode: 'MLK', kelompok: 'Muatan Lokal & Pengembangan Diri', namaMapel: 'Bahasa Jawa / Keterampilan Bahasa', jpPerMinggu: 2, kkm: 75, kondisiTingkat: 'Semua', kondisiRumpun: 'Semua', kondisiStatus: 'Muatan Lokal' }
];

export const INITIAL_KURIKULUM_REPO_SEEDS: BukuIndukKurikulumRepoItem[] = [
  {
    id: 'kur-repo-merdeka-2026',
    nama: 'Kurikulum Merdeka · Fase E & F (Permendikbudristek 12/2024)',
    jenisKurikulum: 'Kurikulum Merdeka',
    tahunPelajaran: '2026/2027',
    faseDefault: 'Fase E (Kelas X) & Fase F (Kelas XI–XII)',
    skKurikulum: 'Permendikbudristek No. 12 Tahun 2024',
    skalaNilai: '0-100',
    deskripsi: 'Kurikulum nasional aktif SMAN 9 Surabaya dengan pemisahan otomatis Mapel Wajib, IPA/IPS Terpadu Fase E (Kelas X), Mapel Pilihan Fase F (Kelas XI–XII), Muatan Lokal Jawa Timur, dan Kokurikuler P5.',
    susunanPelajaran: DEFAULT_KURIKULUM_MERDEKA_MAPEL,
    isDefaultSeed: true,
    createdAt: '2026-07-14T08:00:00.000Z',
    updatedAt: '2026-07-14T08:00:00.000Z'
  },
  {
    id: 'kur-repo-k13-mipa-ips',
    nama: 'Kurikulum 2013 (K-13) · Peminatan MIPA & IPS',
    jenisKurikulum: 'Kurikulum 2013 (K-13)',
    tahunPelajaran: '2023/2024',
    faseDefault: 'Tingkat X, XI, XII Peminatan MIPA / IPS',
    skKurikulum: 'Permendikbud No. 36 Tahun 2018',
    skalaNilai: '0-100',
    deskripsi: 'Struktur Kelompok A (Umum), Kelompok B (Umum & Mulok), Kelompok C (Peminatan MIPA/IPS kondisional), serta Lintas Minat untuk arsip angkatan atau kelas K-13.',
    susunanPelajaran: DEFAULT_K13_MAPEL,
    isDefaultSeed: true,
    createdAt: '2024-07-15T08:00:00.000Z',
    updatedAt: '2024-07-15T08:00:00.000Z'
  },
  {
    id: 'kur-repo-ktsp-2006',
    nama: 'KTSP 2006 · Program IPA & IPS (Arsip Historis)',
    jenisKurikulum: 'KTSP 2006',
    tahunPelajaran: '2014/2015',
    faseDefault: 'Kelas X Umum & XI–XII Program IPA/IPS',
    skKurikulum: 'Permendiknas No. 22 Tahun 2006',
    skalaNilai: '0-100',
    deskripsi: 'Susunan mata pelajaran Buku Induk Siswa historis KTSP 2006 beserta pembagian Program IPA dan IPS.',
    susunanPelajaran: DEFAULT_KTSP_2006_MAPEL,
    isDefaultSeed: true,
    createdAt: '2014-07-15T08:00:00.000Z',
    updatedAt: '2014-07-15T08:00:00.000Z'
  }
];

export const INITIAL_BUKU_INDUK_CONFIG: BukuIndukActiveConfig = {
  activeKurikulumRepoId: INITIAL_KURIKULUM_REPO_SEEDS[0].id,
  jenisKurikulum: INITIAL_KURIKULUM_REPO_SEEDS[0].jenisKurikulum,
  namaKurikulumAktif: INITIAL_KURIKULUM_REPO_SEEDS[0].nama,
  tahunPelajaran: INITIAL_KURIKULUM_REPO_SEEDS[0].tahunPelajaran,
  faseDefault: INITIAL_KURIKULUM_REPO_SEEDS[0].faseDefault,
  skKurikulum: INITIAL_KURIKULUM_REPO_SEEDS[0].skKurikulum,
  skalaNilai: '0-100',
  susunanPelajaran: DEFAULT_KURIKULUM_MERDEKA_MAPEL.map(m => ({ ...m })),
  kotaTanggalCetak: 'Surabaya, 20 November 2026'
};

export const extractTingkatFromKelas = (kelasOrRombel?: string): 'X' | 'XI' | 'XII' | '' => {
  const clean = (kelasOrRombel || '').trim().toUpperCase();
  if (!clean) return '';
  if (/^XII(\b|[-_\s/]|$)/.test(clean) || /^12(\b|[-_\s/])/.test(clean)) return 'XII';
  if (/^XI(\b|[-_\s/]|$)/.test(clean) || /^11(\b|[-_\s/])/.test(clean)) return 'XI';
  if (/^X(\b|[-_\s/]|$)/.test(clean) || /^10(\b|[-_\s/])/.test(clean)) return 'X';
  return '';
};

export const resolveSusunanPelajaranUntukSiswa = (
  susunan: KurikulumMapelItem[],
  siswa: Pick<Siswa, 'kelas' | 'rombelSaatIni' | 'jurusan'>,
  options?: { showAllIgnoringCondition?: boolean; overrideTingkat?: 'Semua' | 'X' | 'XI' | 'XII'; overrideRumpun?: string }
): KurikulumMapelItem[] => {
  if (options?.showAllIgnoringCondition) return susunan;

  const tingkatSiswa =
    options?.overrideTingkat && options.overrideTingkat !== 'Semua'
      ? options.overrideTingkat
      : extractTingkatFromKelas(siswa.rombelSaatIni || siswa.kelas);

  const rombelLower = (siswa.rombelSaatIni || siswa.kelas || '').toLowerCase();
  const jurusanLower = (siswa.jurusan || '').toLowerCase();
  const rumpunOverride = (options?.overrideRumpun || '').trim().toLowerCase();

  return susunan.filter(item => {
    const targetTingkat = item.kondisiTingkat || 'Semua';
    if (targetTingkat !== 'Semua' && tingkatSiswa && targetTingkat !== tingkatSiswa) {
      return false;
    }

    const rawRumpun = (item.kondisiRumpun || '').trim();
    if (!rawRumpun || rawRumpun.toLowerCase() === 'semua') {
      return true;
    }

    const tokens = rawRumpun
      .split(/[,;|]+/)
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    if (tokens.includes('semua')) return true;

    const searchHaystack = `${rombelLower} ${jurusanLower} ${rumpunOverride}`.trim();
    if (!searchHaystack) return true;

    return tokens.some(tok => searchHaystack.includes(tok));
  });
};
