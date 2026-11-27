import {
  Guru,
  SchoolProfile,
  StrukturCrossLink,
  StrukturLevelRule,
  StrukturNodeItem,
  StrukturOrganisasiBundle,
  StrukturOrganisasiSettings,
  StrukturStafWakaItem,
  Tendik
} from '../types';

export const MAX_STAF_WAKA = 5;

export const isWakaNode = (
  node?: Pick<StrukturNodeItem, 'id' | 'jabatan'> | null
): boolean => {
  if (!node) return false;
  if (node.id.startsWith('org-waka-')) return true;
  const jab = (node.jabatan || '').toLowerCase();
  return jab.includes('waka') || jab.includes('wakil kepala');
};

export const DEFAULT_STRUKTUR_LEVEL_RULES: StrukturLevelRule[] = [
  {
    level: 1,
    namaLevel: 'Level 1 · Kepala Sekolah & Komite Sekolah',
    aturanTataLetak: 'sejajar_pusat',
    maksKolom: 3,
    tampilkanLabelLevel: false
  },
  {
    level: 2,
    namaLevel: 'Level 2 · Wakil Kepala Sekolah & Koordinator Tata Usaha',
    aturanTataLetak: 'grid_seimbang',
    maksKolom: 4,
    tampilkanLabelLevel: false
  },
  {
    level: 3,
    namaLevel: 'Level 3 · Guru Mata Pelajaran & Staf Tata Usaha',
    aturanTataLetak: 'grid_seimbang',
    maksKolom: 5,
    tampilkanLabelLevel: false
  },
  {
    level: 4,
    namaLevel: 'Level 4 · OSIS / Siswa',
    aturanTataLetak: 'grid_seimbang',
    maksKolom: 4,
    tampilkanLabelLevel: false
  },
  {
    level: 5,
    namaLevel: 'Level 5 · Unit Tambahan / Sub-Pelaksana',
    aturanTataLetak: 'grid_seimbang',
    maksKolom: 4,
    tampilkanLabelLevel: false
  },
  {
    level: 6,
    namaLevel: 'Level 6 · Organisasi Siswa / Ekstrakurikuler',
    aturanTataLetak: 'grid_seimbang',
    maksKolom: 4,
    tampilkanLabelLevel: false
  }
];

export const DEFAULT_STRUKTUR_SETTINGS: StrukturOrganisasiSettings = {
  modeStruktur: 'kompleks',
  judulBagan: 'STRUKTUR ORGANISASI SMA NEGERI 9 SURABAYA',
  subjudulTahun: 'TAHUN PELAJARAN 2026 / 2027',
  nomorSk: 'Lampiran SK Kepala SMA Negeri 9 Surabaya · Nomor: 800/412/101.6.1.9/2026',
  kotaTanggal: 'Surabaya, 15 Juli 2026',
  tampilkanKopSurat: true,
  tampilkanFoto: true,
  tampilkanNip: true,
  tampilkanPangkat: true,
  tampilkanBidang: true,
  tampilkanLegenda: true,
  tampilkanTtdKs: true,
  tampilkanStempel: true,
  autoSinkronLevelDariAtasan: false,
  autoKelompokkanBawahanSejajarAtasan: true,
  paperSize: 'F4',
  orientasi: 'landscape',
  marginMm: 8,
  autoFitKeKertas: true,
  skalaBaganManualPct: 90,
  cetakBagian: 'semua',
  tupoksiOrientasi: 'portrait',
  tupoksiLayout: 'tabel_resmi',
  judulTupoksi: 'URAIAN TUGAS POKOK DAN FUNGSI (TUPOKSI) MASING-MASING BIDANG',
  tampilkanKopDiTupoksi: true,
  lineStyleMode: 'ortogonal_tegas',
  ketebalanGaris: 2,
  warnaGarisPerintah: '#0f172a',
  warnaGarisKoordinasi: '#0284c7',
  gayaKartu: 'resmi_klasik'
};

export const getDefaultTupoksiForJabatan = (jabatan: string, nodeId?: string): string[] => {
  const key = `${nodeId || ''} ${jabatan || ''}`.toLowerCase();
  if (key.includes('kepala sekolah') || nodeId === 'org-kepsek') {
    return [
      'Menyusun rencana strategis sekolah (RKJM, RKT, dan RKAS) bersama tim manajemen dan komite sekolah.',
      'Melaksanakan supervisi, pemantauan, dan evaluasi kinerja guru, tenaga kependidikan, serta mutu pembelajaran.',
      'Membina koordinasi tata usaha, pengawasan anggaran sekolah (BOS/BPOPP), dan menjalin kemitraan eksternal.',
      'Menetapkan kebijakan resmi sekolah, pembagian tugas mengajar/tambahan, serta menandatangani surat & dokumen kedinasan.'
    ];
  }
  if (key.includes('komite') || nodeId === 'org-komite') {
    return [
      'Memberikan pertimbangan dalam penentuan dan pelaksanaan kebijakan pendidikan di sekolah.',
      'Menggalang dana dan sumber daya pendidikan lainnya dari masyarakat/orang tua secara transparan dan akuntabel.',
      'Melakukan pengawasan terhadap pelayanan pendidikan serta menindaklanjuti keluhan, saran, dan aspirasi warga sekolah.'
    ];
  }
  if (key.includes('tata usaha') || key.includes('ktu') || nodeId === 'org-ktu') {
    return [
      'Menyusun program kerja ketatausahaan sekolah meliputi administrasi persuratan, kearsipan, dan layanan publik.',
      'Mengelola administrasi kepegawaian pendidik & tendik (SKP, DUK, kenaikan pangkat/berkala, absensi, dan Dapodik).',
      'Mengkoordinasikan penyusunan pertanggungjawaban keuangan sekolah (BOS, BPOPP, dan RKAS) bersama bendahara.',
      'Mengawasi ketertiban layanan administrasi kesiswaan, buku induk, sarana prasarana, serta keamanan lingkungan sekolah.'
    ];
  }
  if (key.includes('kurikulum')) {
    return [
      'Menyusun kalender pendidikan sekolah, jadwal pelajaran, serta pembagian tugas mengajar guru setiap semester.',
      'Mengkoordinasikan pengembangan kurikulum satuan pendidikan (KSP), perangkat ajar, dan kegiatan MGMP sekolah.',
      'Mengatur pelaksanaan asesmen/ulangan (PTS, PSAS, PSAJ, TKA/SNBP) beserta pengolahan nilai dan penerbitan rapor.',
      'Melakukan supervisi akademik dan memonitor ketercapaian program literasi-numerasi peserta didik.'
    ];
  }
  if (key.includes('kesiswaan')) {
    return [
      'Menyusun program pembinaan kesiswaan, pelaksanaan MPLS, dan penegakan tata tertib serta budaya positif sekolah.',
      'Mengkoordinasikan kegiatan OSIS, MPK, serta seluruh kegiatan ekstrakurikuler dan pembinaan prestasi lomba/olimpiade.',
      'Mengatur pengelolaan mutasi siswa, beasiswa (PIP/KIP), dan pelaksanaan kegiatan peringatan hari besar.',
      'Berkoordinasi dengan Koordinator BK dan wali kelas dalam penanganan kedisiplinan dan konseling peserta didik.'
    ];
  }
  if (key.includes('sarana') || key.includes('sarpras')) {
    return [
      'Menyusun rencana kebutuhan pengadaan, pemeliharaan, dan perbaikan sarana prasarana ruang belajar maupun kantor.',
      'Mengelola inventarisasi barang milik daerah/sekolah (KIB/KIR) serta penghapusan aset yang rusak berat.',
      'Mengawasi operasional fasilitas penunjang seperti laboratorium, perpustakaan, jaringan internet, dan sanitasi sekolah.'
    ];
  }
  if (key.includes('humas')) {
    return [
      'Menjalin kemitraan strategis dengan komite sekolah, orang tua/wali murid, alumni, perguruan tinggi, dan DUDI.',
      'Mengelola publikasi informasi resmi sekolah, dokumentasi kegiatan, media sosial, serta layanan pengaduan masyarakat.',
      'Mengatur penyelenggaraan rapat pleno wali murid, kunjungan tamu dinas, dan program sosial kemasyarakatan sekolah.'
    ];
  }
  if (key.includes('cbt') || key.includes('staf kurikulum')) {
    return [
      'Menyiapkan jadwal asesmen berbasis komputer/CBT, penataan ruang ujian, kartu peserta, dan daftar hadir ujian.',
      'Mengelola sinkronisasi bank soal, rekapitulasi hasil evaluasi belajar, serta dokumentasi nilai buku induk.'
    ];
  }
  if (key.includes('bk') || key.includes('konseling')) {
    return [
      'Menyusun program layanan bimbingan klasikal, konseling individu/kelompok, dan pemetaan bakat-minat karir/PTN.',
      'Melakukan pendampingan permasalahan belajar, sosial-emosional, dan kehadiran siswa bersama wali kelas dan orang tua.'
    ];
  }
  if (key.includes('perpustakaan')) {
    return [
      'Mengelola pengadaan, katalogisasi, sirkulasi peminjaman buku pelajaran & koleksi bacaan peserta didik.',
      'Menyelenggarakan program gerakan literasi sekolah dan pelaporan pemanfaatan fasilitas perpustakaan secara berkala.'
    ];
  }
  if (key.includes('lab') || key.includes('it')) {
    return [
      'Menyiapkan jadwal pemakaian laboratorium IPA/Bahasa/Komputer beserta kesiapan alat praktikum & jaringan CBT.',
      'Melakukan pemeliharaan berkala perangkat komputer, server lokal, dan menginventarisasi bahan/peralatan laboratorium.'
    ];
  }
  if (key.includes('kepegawaian') || nodeId === 'org-staf-tu') {
    return [
      'Mengelola berkas kepegawaian GTK, pemutakhiran data Dapodik/SIASN, pengajuan cuti, dan usulan kenaikan pangkat/KGB.',
      'Melaksanakan pencatatan agenda surat masuk/keluar, pengarsipan digital & fisik, serta pelayanan legalisir administrasi.'
    ];
  }
  if (
    key.includes('guru mata pelajaran') ||
    key.includes('dewan guru') ||
    key.includes('wali kelas') ||
    nodeId === 'org-dewan-guru'
  ) {
    return [
      'Merencanakan, melaksanakan, dan mengevaluasi proses pembelajaran mata pelajaran serta projek penguatan profil pelajar di bawah arahan seluruh Waka dan Staf Waka.',
      'Melaksanakan tugas wali kelas untuk memantau perkembangan akademik, kehadiran, sikap, dan komunikasi aktif dengan orang tua siswa.'
    ];
  }
  if (
    key.includes('osis') ||
    key.includes('siswa') ||
    key.includes('ekstrakurikuler') ||
    nodeId === 'org-osis'
  ) {
    return [
      'Menjalankan program kerja OSIS/MPK, kegiatan kepemimpinan siswa (LDKS), serta kepanitiaan kegiatan kesiswaan di bawah bimbingan Guru Mata Pelajaran & Waka.',
      'Mengikuti kegiatan pembelajaran, ekstrakurikuler, tata tertib sekolah, serta pengembangan prestasi akademik maupun non-akademik.'
    ];
  }
  if (
    key.includes('layanan') ||
    key.includes('widianingsih') ||
    nodeId === 'org-staf-tu-widianingsih'
  ) {
    return [
      'Melaksanakan pelayanan administrasi umum, pengadministrasian layanan publik sekolah, serta penerimaan tamu kedinasan.',
      'Menyiapkan kelengkapan dokumen layanan administrasi siswa, legalisir surat keterangan, dan pengarsipan berkas layanan tata usaha.'
    ];
  }
  if (key.includes('administrasi') || key.includes('keamanan') || nodeId === 'org-tendik-pelaksana') {
    return [
      'Melaksanakan layanan administrasi harian tata usaha, penataan arsip, dan pengurusan dokumen kesiswaan.',
      'Menjaga keamanan, ketertiban, kebersihan lingkungan sekolah, serta kelancaran operasional harian gedung sekolah.'
    ];
  }
  return [
    `Menyusun rencana kerja operasional sesuai bidang tugas ${jabatan || 'unit kerja'} setiap tahun pelajaran.`,
    'Melaksanakan koordinasi lintas unit dan melaporkan capaian pelaksanaan program secara berkala kepada atasan langsung.'
  ];
};

export const ensureNodeTupoksiDefaults = (nodes: StrukturNodeItem[]): StrukturNodeItem[] =>
  nodes.map(n => ({
    ...n,
    tampilDiSederhana:
      typeof n.tampilDiSederhana === 'boolean' ? n.tampilDiSederhana : n.level <= 2,
    tupoksi:
      Array.isArray(n.tupoksi) && n.tupoksi.length > 0
        ? n.tupoksi
        : getDefaultTupoksiForJabatan(n.jabatan, n.id)
  }));

/**
 * Migrates previously saved default structures so:
 * - Komite (left, Level 1) & Kepala Sekolah (center, Level 1) connect via coordination line.
 * - Koordinator Tata Usaha (right, Level 2) aligns horizontally with Wakil Kepala Sekolah (center, Level 2).
 * - Below Waka/Staf Waka is Guru Mata Pelajaran (Level 3 center), with all Staff TU aligned on Level 3 right wing under KTU.
 * - OSIS / Siswa sits below Guru Mata Pelajaran on Level 4 center.
 */
export const alignLegacyTopRowBundle = (
  bundle: StrukturOrganisasiBundle,
  tendikList: Tendik[] = []
): StrukturOrganisasiBundle => {
  const ver = bundle.topRowSchemaVersion || 1;
  if (ver >= 6) {
    return bundle;
  }

  const kepsek = bundle.nodes.find(n => n.id === 'org-kepsek');
  const komite = bundle.nodes.find(n => n.id === 'org-komite');
  const ktu = bundle.nodes.find(n => n.id === 'org-ktu');
  const wakaKur = bundle.nodes.find(n => n.id === 'org-waka-kur');

  const isLegacyV1Layout =
    kepsek?.level === 1 &&
    komite?.level === 2 &&
    komite?.sidePosition === 'left' &&
    ktu?.level === 2 &&
    ktu?.sidePosition === 'right' &&
    wakaKur?.level === 3;

  const legacyIntermediateIds = new Set([
    'org-koord-kur',
    'org-koord-bk',
    'org-kep-perpus',
    'org-kep-lab'
  ]);

  const isStaffTuRelatedNode = (n: StrukturNodeItem): boolean => {
    const namaLow = (n.nama || '').toLowerCase();
    const jabLow = (n.jabatan || '').toLowerCase();
    return (
      n.id === 'org-staf-tu' ||
      n.id === 'org-staf-tu-widianingsih' ||
      n.id === 'org-tendik-pelaksana' ||
      n.sourceId === 'tendik-14' ||
      namaLow.includes('widianingsih') ||
      n.parentId === 'org-staf-tu' ||
      (n.parentId === 'org-ktu' && n.id !== 'org-ktu') ||
      (n.id !== 'org-ktu' &&
        (jabLow.includes('staf tu') ||
          jabLow.includes('pengadministrasi layanan')))
    );
  };

  // Determine KTU sidePosition (preserve left/right if user already placed it there; default right)
  const resolvedKtuSide: 'left' | 'right' =
    ktu?.sidePosition === 'left' || ktu?.sidePosition === 'right'
      ? ktu.sidePosition
      : 'right';

  // Incremental v5 -> v6 upgrade: preserve all user edits, only align KTU command line & Staff TU wing
  if (ver === 5) {
    const upgradedNodes = bundle.nodes.map(n => {
      if (n.id === 'org-ktu') {
        return {
          ...n,
          parentId: 'org-kepsek',
          relationFromParent: 'perintah' as const,
          level: 2,
          sidePosition: resolvedKtuSide,
          tampilDiSederhana: true
        };
      }
      if (isStaffTuRelatedNode(n)) {
        return {
          ...n,
          parentId: 'org-ktu',
          relationFromParent: 'perintah' as const,
          level: 3,
          sidePosition: resolvedKtuSide
        };
      }
      return n;
    });
    return {
      ...bundle,
      nodes: rebalanceStrukturNodes(ensureNodeTupoksiDefaults(upgradedNodes), true),
      topRowSchemaVersion: 6
    };
  }

  let migratedNodes = bundle.nodes
    .filter(n => !legacyIntermediateIds.has(n.id))
    .map(n => {
      if (n.id === 'org-komite') {
        return {
          ...n,
          parentId: 'org-kepsek',
          relationFromParent: 'koordinasi' as const,
          level: 1,
          urutan: 1,
          sidePosition: 'left' as const,
          tampilDiSederhana: true
        };
      }
      if (n.id === 'org-kepsek') {
        return {
          ...n,
          level: 1,
          urutan: 2,
          sidePosition: 'center' as const,
          tampilDiSederhana: true
        };
      }
      if (n.id === 'org-ktu') {
        return {
          ...n,
          jabatan:
            n.jabatan === 'Kepala Urusan Tata Usaha' ? 'Koordinator Tata Usaha' : n.jabatan,
          parentId: 'org-kepsek',
          relationFromParent: 'perintah' as const,
          level: 2,
          urutan: resolvedKtuSide === 'left' ? 1 : 5,
          sidePosition: resolvedKtuSide,
          tampilDiSederhana: true
        };
      }
      if (isLegacyV1Layout && n.id.startsWith('org-waka-')) {
        return {
          ...n,
          level: 2,
          tampilDiSederhana: true
        };
      }
      if (n.id === 'org-dewan-guru') {
        return {
          ...n,
          jabatan: 'Guru Mata Pelajaran',
          bidang: 'Pendidik & Wali Kelas (MGMP)',
          nama:
            n.nama === 'Pendidik Mapel / MGMP Sekolah'
              ? 'Dewan Guru Mata Pelajaran'
              : n.nama,
          parentId: 'org-waka-kur',
          connectFromAllWaka: true,
          relationFromParent: 'perintah' as const,
          level: 3,
          urutan: 1,
          sidePosition: 'center' as const,
          tampilDiSederhana: true,
          isActive: true
        };
      }
      if (n.id === 'org-osis') {
        return {
          ...n,
          jabatan: 'OSIS / Siswa',
          bidang: 'Organisasi Kesiswaan & Peserta Didik',
          nama:
            n.nama === 'Tim Pembina & Pengurus OSIS'
              ? 'Pengurus OSIS / MPK & Siswa'
              : n.nama,
          pangkatGolongan: 'OSIS / MPK & Ekstrakurikuler',
          parentId: 'org-dewan-guru',
          relationFromParent: 'perintah' as const,
          level: 4,
          urutan: 1,
          sidePosition: 'center' as const,
          tampilDiSederhana: true,
          isActive: true
        };
      }
      if (isStaffTuRelatedNode(n)) {
        const orderHint =
          n.id === 'org-staf-tu'
            ? 2
            : n.id === 'org-staf-tu-widianingsih' ||
              n.sourceId === 'tendik-14' ||
              (n.nama || '').toLowerCase().includes('widianingsih')
            ? 3
            : n.id === 'org-tendik-pelaksana'
            ? 4
            : Math.max(5, n.urutan || 5);
        return {
          ...n,
          parentId: 'org-ktu',
          relationFromParent: 'perintah' as const,
          level: 3,
          urutan: orderHint,
          sidePosition: resolvedKtuSide,
          tampilDiSederhana: false,
          isActive: true
        };
      }
      return n;
    });

  // Ensure Widianingsih exists and is aligned horizontally alongside other Staff Tata Usaha
  const hasWidianingsih = migratedNodes.some(
    n =>
      n.id === 'org-staf-tu-widianingsih' ||
      n.sourceId === 'tendik-14' ||
      (n.nama || '').toLowerCase().includes('widianingsih')
  );
  if (!hasWidianingsih) {
    const tendikWidi = pickMatch(tendikList, ['widianingsih', 'pengadministrasi layanan']);
    const widiNode: StrukturNodeItem = {
      id: 'org-staf-tu-widianingsih',
      jabatan: 'Staf Pengadministrasi Layanan TU',
      bidang: 'Layanan Administrasi Sekolah',
      nama: tendikWidi
        ? formatDisplayName(tendikWidi.nama, tendikWidi.gelar)
        : 'Widianingsih, S.Si',
      nip: tendikWidi?.nip || '-',
      pangkatGolongan:
        tendikWidi?.pangkatGolongan && tendikWidi.pangkatGolongan !== '-'
          ? tendikWidi.pangkatGolongan
          : tendikWidi?.status || 'Tenaga Honor Sekolah',
      parentId: 'org-ktu',
      relationFromParent: 'perintah',
      level: 3,
      urutan: 3,
      sidePosition: 'right',
      warnaAccent: 'teal',
      tampilDiSederhana: false,
      sourceType: tendikWidi ? 'tendik' : 'manual',
      sourceId: tendikWidi?.id,
      isActive: true
    };
    const stafTuIdx = migratedNodes.findIndex(n => n.id === 'org-staf-tu');
    if (stafTuIdx >= 0) {
      migratedNodes.splice(stafTuIdx + 1, 0, widiNode);
    } else {
      migratedNodes.push(widiNode);
    }
  }

  // Ensure default crossLinks referencing removed intermediate nodes or legacy default links are cleaned
  const remainingIds = new Set(migratedNodes.map(n => n.id));
  const legacyDefaultLinkIds = new Set(['xlink-1', 'xlink-2', 'xlink-3']);
  const cleanedCrossLinks = (bundle.crossLinks || []).filter(
    l =>
      !legacyDefaultLinkIds.has(l.id) &&
      remainingIds.has(l.fromId) &&
      remainingIds.has(l.toId)
  );

  migratedNodes = rebalanceStrukturNodes(ensureNodeTupoksiDefaults(migratedNodes), true);

  return {
    ...bundle,
    levelRules: DEFAULT_STRUKTUR_LEVEL_RULES.map(r => ({ ...r })),
    nodes: migratedNodes,
    crossLinks: cleanedCrossLinks,
    topRowSchemaVersion: 6
  };
};

const pickMatch = <T extends { nama: string; jabatan?: string }>(
  list: T[],
  keywords: string[],
  fallbackIndex?: number
): T | undefined => {
  const lowerMatch = list.find(item => {
    const hay = `${item.nama} ${item.jabatan || ''}`.toLowerCase();
    return keywords.some(k => hay.includes(k.toLowerCase()));
  });
  if (lowerMatch) return lowerMatch;
  if (typeof fallbackIndex === 'number' && list[fallbackIndex]) {
    return list[fallbackIndex];
  }
  return undefined;
};

const formatDisplayName = (nama: string, gelar?: string): string => {
  const cleanName = (nama || '').trim();
  const cleanGelar = (gelar || '').trim();
  if (!cleanGelar) return cleanName;
  if (cleanName.toLowerCase().includes(cleanGelar.toLowerCase().replace(/[.,]/g, ''))) {
    return cleanName;
  }
  return `${cleanName}, ${cleanGelar}`;
};

export const createDefaultStrukturOrganisasiBundle = (
  profile: SchoolProfile,
  guruList: Guru[] = [],
  tendikList: Tendik[] = []
): StrukturOrganisasiBundle => {
  const wakaKur = pickMatch(guruList, ['waka bidang kurikulum', 'agus supriyanto']);
  const wakaSis = pickMatch(guruList, ['budi santoso', 'wakil kepala sekolah']);
  const wakaSar = pickMatch(guruList, ['kardiyono']);
  const wakaHum = pickMatch(guruList, ['siti rohmah', 'bk', 'pembina']);
  const tendikKepeg = pickMatch(tendikList, ['dwi wahyu', 'kepegawaian']);
  const tendikWidi = pickMatch(tendikList, ['widianingsih', 'pengadministrasi layanan']);
  const tendikAgenda = pickMatch(tendikList, ['persuratan', 'ekristianti', 'dhinar']);

  const nodes: StrukturNodeItem[] = [
    {
      id: 'org-komite',
      jabatan: 'Komite Sekolah',
      bidang: 'Mitra Pertimbangan & Pengawasan',
      nama: 'Ir. H. Bambang Sudjatmiko, M.M.',
      nip: '-',
      pangkatGolongan: 'Ketua Komite SMAN 9 Surabaya',
      parentId: 'org-kepsek',
      relationFromParent: 'koordinasi',
      level: 1,
      urutan: 1,
      sidePosition: 'left',
      warnaAccent: 'amber',
      catatanTugas: 'Memberi pertimbangan, dukungan, dan pengawasan mutu layanan pendidikan.',
      tampilDiSederhana: true,
      sourceType: 'manual',
      isActive: true
    },
    {
      id: 'org-kepsek',
      jabatan: 'Kepala Sekolah',
      bidang: 'Pimpinan Satuan Pendidikan',
      nama: profile.kepalaSekolah || 'Dr. Kasminah, M.Pd.',
      nip: profile.nipKepalaSekolah || '196803151992032004',
      pangkatGolongan: profile.pangkatKepsek || 'Pembina Utama Muda (IV/c)',
      parentId: null,
      relationFromParent: 'perintah',
      level: 1,
      urutan: 2,
      sidePosition: 'center',
      warnaAccent: 'navy',
      catatanTugas: 'Penanggung jawab penuh penyelenggaraan pendidikan & manajemen sekolah.',
      tampilDiSederhana: true,
      sourceType: 'manual',
      isActive: true
    },
    {
      id: 'org-ktu',
      jabatan: 'Koordinator Tata Usaha',
      bidang: 'Subbagian Tata Usaha',
      nama: profile.kepalaTU || 'Dra. Hj. Sri Rahayu',
      nip: profile.nipKepalaTU || '197405121999032001',
      pangkatGolongan: 'Penata Tingkat I (III/d)',
      parentId: 'org-kepsek',
      relationFromParent: 'perintah',
      level: 2,
      urutan: 5,
      sidePosition: 'right',
      warnaAccent: 'teal',
      catatanTugas: 'Memimpin tata kelola ketatausahaan, kepegawaian, keuangan, dan kearsipan.',
      tampilDiSederhana: true,
      sourceType: 'manual',
      isActive: true
    },
    {
      id: 'org-waka-kur',
      jabatan: 'Waka Bidang Kurikulum',
      bidang: 'Akademik & Evaluasi',
      nama: wakaKur ? formatDisplayName(wakaKur.nama, wakaKur.gelar) : 'Drs. Agus Supriyanto, M.Pd.',
      nip: wakaKur?.nip || '197009141995121002',
      pangkatGolongan: wakaKur?.pangkatGolongan || 'Pembina Tingkat I (IV/b)',
      parentId: 'org-kepsek',
      relationFromParent: 'perintah',
      level: 2,
      urutan: 1,
      sidePosition: 'center',
      warnaAccent: 'navy',
      tampilDiSederhana: true,
      sourceType: wakaKur ? 'guru' : 'manual',
      sourceId: wakaKur?.id,
      isActive: true
    },
    {
      id: 'org-waka-sis',
      jabatan: 'Waka Bidang Kesiswaan',
      bidang: 'Pembinaan Karakter & Prestasi',
      nama: wakaSis ? formatDisplayName(wakaSis.nama, wakaSis.gelar) : 'Budi Santoso, S.Pd.',
      nip: wakaSis?.nip || '196510041986031018',
      pangkatGolongan: wakaSis?.pangkatGolongan || 'Penata Tingkat I (III/d)',
      parentId: 'org-kepsek',
      relationFromParent: 'perintah',
      level: 2,
      urutan: 2,
      sidePosition: 'center',
      warnaAccent: 'emerald',
      tampilDiSederhana: true,
      sourceType: wakaSis ? 'guru' : 'manual',
      sourceId: wakaSis?.id,
      isActive: true
    },
    {
      id: 'org-waka-sar',
      jabatan: 'Waka Bidang Sarana Prasarana',
      bidang: 'Aset, Lab & Infrastruktur',
      nama: wakaSar ? formatDisplayName(wakaSar.nama, wakaSar.gelar) : 'Kardiyono, M.Pd.',
      nip: wakaSar?.nip || '-',
      pangkatGolongan:
        wakaSar?.pangkatGolongan && wakaSar.pangkatGolongan !== '-'
          ? wakaSar.pangkatGolongan
          : 'Pembina (IV/a)',
      parentId: 'org-kepsek',
      relationFromParent: 'perintah',
      level: 2,
      urutan: 3,
      sidePosition: 'center',
      warnaAccent: 'slate',
      tampilDiSederhana: true,
      sourceType: wakaSar ? 'guru' : 'manual',
      sourceId: wakaSar?.id,
      isActive: true
    },
    {
      id: 'org-waka-hum',
      jabatan: 'Waka Bidang Humas',
      bidang: 'Kemitraan & Publikasi',
      nama: wakaHum ? formatDisplayName(wakaHum.nama, wakaHum.gelar) : 'Siti Rohmah, S.Pd.',
      nip: wakaHum?.nip || '198511202010012018',
      pangkatGolongan:
        wakaHum?.pangkatGolongan && wakaHum.pangkatGolongan !== '-'
          ? wakaHum.pangkatGolongan
          : 'Penata Muda Tk. I (III/b)',
      parentId: 'org-kepsek',
      relationFromParent: 'perintah',
      level: 2,
      urutan: 4,
      sidePosition: 'center',
      warnaAccent: 'teal',
      tampilDiSederhana: true,
      sourceType: wakaHum ? 'guru' : 'manual',
      sourceId: wakaHum?.id,
      isActive: true
    },
    {
      id: 'org-dewan-guru',
      jabatan: 'Guru Mata Pelajaran',
      bidang: 'Pendidik & Wali Kelas (MGMP)',
      nama: 'Dewan Guru Mata Pelajaran',
      nip: `${Math.max(guruList.length, 33)} Pendidik`,
      pangkatGolongan: 'Fungsional Guru (III/a – IV/c)',
      parentId: 'org-waka-kur',
      connectFromAllWaka: true,
      relationFromParent: 'perintah',
      level: 3,
      urutan: 1,
      sidePosition: 'center',
      warnaAccent: 'navy',
      tampilDiSederhana: true,
      sourceType: 'manual',
      isActive: true
    },
    {
      id: 'org-staf-tu',
      jabatan: 'Koord. Kepegawaian & TU',
      bidang: 'Administrasi & Bendahara',
      nama: tendikKepeg
        ? formatDisplayName(tendikKepeg.nama, tendikKepeg.gelar)
        : 'Dwi Wahyu Budiono, S.Sos.',
      nip: tendikKepeg?.nip || '198009092014121003',
      pangkatGolongan:
        tendikKepeg?.pangkatGolongan && tendikKepeg.pangkatGolongan !== '-'
          ? tendikKepeg.pangkatGolongan
          : 'Pengatur Muda (III/a)',
      parentId: 'org-ktu',
      relationFromParent: 'perintah',
      level: 3,
      urutan: 2,
      sidePosition: 'right',
      warnaAccent: 'teal',
      tampilDiSederhana: false,
      sourceType: tendikKepeg ? 'tendik' : 'manual',
      sourceId: tendikKepeg?.id,
      isActive: true
    },
    {
      id: 'org-staf-tu-widianingsih',
      jabatan: 'Staf Pengadministrasi Layanan TU',
      bidang: 'Layanan Administrasi Sekolah',
      nama: tendikWidi
        ? formatDisplayName(tendikWidi.nama, tendikWidi.gelar)
        : 'Widianingsih, S.Si',
      nip: tendikWidi?.nip || '-',
      pangkatGolongan:
        tendikWidi?.pangkatGolongan && tendikWidi.pangkatGolongan !== '-'
          ? tendikWidi.pangkatGolongan
          : tendikWidi?.status || 'Tenaga Honor Sekolah',
      parentId: 'org-ktu',
      relationFromParent: 'perintah',
      level: 3,
      urutan: 3,
      sidePosition: 'right',
      warnaAccent: 'teal',
      tampilDiSederhana: false,
      sourceType: tendikWidi ? 'tendik' : 'manual',
      sourceId: tendikWidi?.id,
      isActive: true
    },
    {
      id: 'org-tendik-pelaksana',
      jabatan: 'Staf Administrasi, Arsip & Keamanan',
      bidang: 'Pelaksana Tenaga Kependidikan',
      nama: tendikAgenda ? formatDisplayName(tendikAgenda.nama, tendikAgenda.gelar) : 'Tim Tendik SMAN 9',
      nip: `${Math.max(tendikList.length, 12)} Personil Tendik`,
      pangkatGolongan: 'Pelaksana TU / Kebersihan / Keamanan',
      parentId: 'org-ktu',
      relationFromParent: 'perintah',
      level: 3,
      urutan: 4,
      sidePosition: 'right',
      warnaAccent: 'teal',
      tampilDiSederhana: false,
      sourceType: 'manual',
      isActive: true
    },
    {
      id: 'org-osis',
      jabatan: 'OSIS / Siswa',
      bidang: 'Organisasi Kesiswaan & Peserta Didik',
      nama: 'Pengurus OSIS / MPK & Siswa',
      nip: '-',
      pangkatGolongan: 'OSIS / MPK & Ekstrakurikuler',
      parentId: 'org-dewan-guru',
      relationFromParent: 'perintah',
      level: 4,
      urutan: 1,
      sidePosition: 'center',
      warnaAccent: 'emerald',
      tampilDiSederhana: true,
      sourceType: 'manual',
      isActive: true
    }
  ];

  const crossLinks: StrukturCrossLink[] = [];

  return {
    settings: {
      ...DEFAULT_STRUKTUR_SETTINGS,
      judulBagan: `STRUKTUR ORGANISASI ${profile.namaSekolah || 'SMA NEGERI 9 SURABAYA'}`
    },
    levelRules: DEFAULT_STRUKTUR_LEVEL_RULES.map(r => ({ ...r })),
    nodes: ensureNodeTupoksiDefaults(nodes),
    crossLinks,
    topRowSchemaVersion: 6,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Checks whether setting candidateParentId as parent of nodeId creates a cycle.
 */
export const wouldCreateCycle = (
  nodes: StrukturNodeItem[],
  nodeId: string,
  candidateParentId: string | null
): boolean => {
  if (!candidateParentId) return false;
  if (candidateParentId === nodeId) return true;
  const map = new Map<string, StrukturNodeItem>();
  nodes.forEach(n => map.set(n.id, n));

  const visited = new Set<string>();
  let curr: string | null = candidateParentId;
  while (curr) {
    if (curr === nodeId) return true;
    if (visited.has(curr)) return true;
    visited.add(curr);
    curr = map.get(curr)?.parentId || null;
  }
  return false;
};

/**
 * Computes hierarchical level from parentId (BFS) when autoSinkronLevelDariAtasan is enabled.
 */
export const applyAutoLevelFromParent = (nodes: StrukturNodeItem[]): StrukturNodeItem[] => {
  const map = new Map<string, StrukturNodeItem>();
  nodes.forEach(n => map.set(n.id, { ...n }));

  const depthMemo = new Map<string, number>();
  const resolveDepth = (id: string, stack = new Set<string>()): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!;
    const item = map.get(id);
    if (!item || !item.parentId || !map.has(item.parentId) || stack.has(id)) {
      depthMemo.set(id, 1);
      return 1;
    }
    // Preserve top-row horizontal coordination peers (Komite, Koordinator TU) on Level 1
    if (
      item.level === 1 &&
      item.relationFromParent === 'koordinasi' &&
      (item.sidePosition === 'left' || item.sidePosition === 'right')
    ) {
      depthMemo.set(id, 1);
      return 1;
    }
    // Preserve Staff Tata Usaha aligned horizontally on Level 3 right wing under Koordinator TU
    if (
      item.parentId === 'org-ktu' &&
      item.level === 3 &&
      item.sidePosition === 'right'
    ) {
      depthMemo.set(id, 3);
      return 3;
    }
    stack.add(id);
    const parentDepth = resolveDepth(item.parentId, stack);
    const level = Math.min(6, parentDepth + 1);
    depthMemo.set(id, level);
    return level;
  };

  return nodes.map(n => ({
    ...n,
    level: resolveDepth(n.id)
  }));
};

/**
 * Normalizes `urutan` sequentially per level (1, 2, 3...) without gaps.
 * Optionally aligns children in the same horizontal sequence as their parents to eliminate crossing command lines.
 */
export const rebalanceStrukturNodes = (
  nodes: StrukturNodeItem[],
  alignByParentOrder = true
): StrukturNodeItem[] => {
  const cloned = nodes.map(n => ({ ...n }));
  const byLevel = new Map<number, StrukturNodeItem[]>();
  cloned.forEach(n => {
    const arr = byLevel.get(n.level) || [];
    arr.push(n);
    byLevel.set(n.level, arr);
  });

  const sortedLevels = Array.from(byLevel.keys()).sort((a, b) => a - b);
  const rankMap = new Map<string, number>();

  const sideWeight = (s?: StrukturNodeItem['sidePosition']) =>
    s === 'left' ? -1 : s === 'right' ? 1 : 0;

  sortedLevels.forEach(lvl => {
    const row = byLevel.get(lvl) || [];
    row.sort((a, b) => {
      const sw = sideWeight(a.sidePosition) - sideWeight(b.sidePosition);
      if (sw !== 0) return sw;
      if (alignByParentOrder) {
        const pa = a.parentId ? rankMap.get(a.parentId) ?? 999 : 0;
        const pb = b.parentId ? rankMap.get(b.parentId) ?? 999 : 0;
        if (pa !== pb) return pa - pb;
      }
      return (a.urutan || 0) - (b.urutan || 0);
    });
    row.forEach((item, idx) => {
      item.urutan = idx + 1;
      rankMap.set(item.id, idx + 1);
    });
  });

  return cloned;
};

/**
 * Moves a node left/right within its level or up/down across levels.
 */
export const moveNodePosition = (
  nodes: StrukturNodeItem[],
  nodeId: string,
  direction: 'left' | 'right' | 'up' | 'down'
): StrukturNodeItem[] => {
  const target = nodes.find(n => n.id === nodeId);
  if (!target) return nodes;

  if (direction === 'up' || direction === 'down') {
    const nextLevel = Math.max(1, Math.min(6, target.level + (direction === 'up' ? -1 : 1)));
    if (nextLevel === target.level) return nodes;
    const sameTargetLevel = nodes.filter(n => n.level === nextLevel && n.id !== nodeId);
    const updated = nodes.map(n =>
      n.id === nodeId
        ? { ...n, level: nextLevel, urutan: sameTargetLevel.length + 1 }
        : n
    );
    return rebalanceStrukturNodes(updated, false);
  }

  const peers = nodes
    .filter(n => n.level === target.level)
    .sort((a, b) => a.urutan - b.urutan);
  const idx = peers.findIndex(n => n.id === nodeId);
  if (idx < 0) return nodes;
  const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= peers.length) return nodes;

  const swapped = [...peers];
  const temp = swapped[idx];
  swapped[idx] = swapped[swapIdx];
  swapped[swapIdx] = temp;

  const newOrderMap = new Map<string, number>();
  swapped.forEach((item, i) => newOrderMap.set(item.id, i + 1));

  return nodes.map(n =>
    newOrderMap.has(n.id) ? { ...n, urutan: newOrderMap.get(n.id)! } : n
  );
};

export const syncBundleWithMasterGtk = (
  bundle: StrukturOrganisasiBundle,
  profile: SchoolProfile,
  guruList: Guru[],
  tendikList: Tendik[]
): StrukturOrganisasiBundle => {
  const syncStafList = (list?: StrukturStafWakaItem[]): StrukturStafWakaItem[] | undefined => {
    if (!Array.isArray(list) || list.length === 0) return list;
    return list.map(staf => {
      if (staf.sourceType === 'guru' && staf.sourceId) {
        const g = guruList.find(item => item.id === staf.sourceId);
        if (g) {
          return {
            ...staf,
            nama: formatDisplayName(g.nama, g.gelar),
            nip: g.nip || staf.nip,
            pangkatGolongan:
              g.pangkatGolongan && g.pangkatGolongan !== '-'
                ? g.pangkatGolongan
                : g.status || staf.pangkatGolongan
          };
        }
      }
      if (staf.sourceType === 'tendik' && staf.sourceId) {
        const t = tendikList.find(item => item.id === staf.sourceId);
        if (t) {
          return {
            ...staf,
            nama: formatDisplayName(t.nama, t.gelar),
            nip: t.nip || staf.nip,
            pangkatGolongan:
              t.pangkatGolongan && t.pangkatGolongan !== '-'
                ? t.pangkatGolongan
                : t.status || staf.pangkatGolongan
          };
        }
      }
      return staf;
    });
  };

  const updatedNodes = bundle.nodes.map(node => {
    const syncedStaf = syncStafList(node.stafWaka);
    if (node.id === 'org-kepsek') {
      return {
        ...node,
        nama: profile.kepalaSekolah || node.nama,
        nip: profile.nipKepalaSekolah || node.nip,
        pangkatGolongan: profile.pangkatKepsek || node.pangkatGolongan,
        stafWaka: syncedStaf
      };
    }
    if (node.id === 'org-ktu') {
      return {
        ...node,
        nama: profile.kepalaTU || node.nama,
        nip: profile.nipKepalaTU || node.nip,
        stafWaka: syncedStaf
      };
    }
    if (node.sourceType === 'guru' && node.sourceId) {
      const g = guruList.find(item => item.id === node.sourceId);
      if (g) {
        return {
          ...node,
          nama: formatDisplayName(g.nama, g.gelar),
          nip: g.nip || node.nip,
          pangkatGolongan:
            g.pangkatGolongan && g.pangkatGolongan !== '-'
              ? g.pangkatGolongan
              : node.pangkatGolongan,
          stafWaka: syncedStaf
        };
      }
    }
    if (node.sourceType === 'tendik' && node.sourceId) {
      const t = tendikList.find(item => item.id === node.sourceId);
      if (t) {
        return {
          ...node,
          nama: formatDisplayName(t.nama, t.gelar),
          nip: t.nip || node.nip,
          pangkatGolongan:
            t.pangkatGolongan && t.pangkatGolongan !== '-'
              ? t.pangkatGolongan
              : node.pangkatGolongan,
          stafWaka: syncedStaf
        };
      }
    }
    return syncedStaf !== node.stafWaka ? { ...node, stafWaka: syncedStaf } : node;
  });

  return {
    ...bundle,
    nodes: updatedNodes,
    updatedAt: new Date().toISOString()
  };
};
