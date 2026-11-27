import * as XLSX from 'xlsx';
import {
  Guru,
  SchoolProfile,
  SkpBuktiFileType,
  SkpDocumentRecord,
  SkpPerilakuItem,
  SkpPredikatKinerja,
  SkpRatingLevel,
  SkpRhkItem,
  Tendik
} from '../types';

export const DEFAULT_BERAKHLAK_LIST: SkpPerilakuItem[] = [
  {
    aspek: '1. Berorientasi Pelayanan',
    ekspektasiKhusus: 'Memberikan layanan pendidikan/administrasi secara ramah, cepat, dan solutif bagi peserta didik, orang tua, dan warga sekolah.',
    umpanBalik: 'Responsif dalam menindaklanjuti kebutuhan layanan sekolah dan siswa.'
  },
  {
    aspek: '2. Akuntabel',
    ekspektasiKhusus: 'Menyelesaikan tugas, administrasi pembelajaran, dan pelaporan bukti dukung secara jujur, cermat, dan dapat dipertanggungjawabkan.',
    umpanBalik: 'Dokumen pertanggungjawaban tertib dan diserahkan tepat waktu.'
  },
  {
    aspek: '3. Kompeten',
    ekspektasiKhusus: 'Terus meningkatkan kompetensi pedagogik, profesional, atau tata kelola administrasi sekolah melalui pelatihan/MGMP.',
    umpanBalik: 'Aktif mengembangkan diri dan membagikan praktik baik kepada rekan sejawat.'
  },
  {
    aspek: '4. Harmonis',
    ekspektasiKhusus: 'Menjaga komunikasi yang santun, saling menghargai perbedaan, serta menciptakan lingkungan kerja kondusif di SMAN 9 Surabaya.',
    umpanBalik: 'Mampu menjaga keharmonisan lintas tim guru dan tenaga kependidikan.'
  },
  {
    aspek: '5. Loyal',
    ekspektasiKhusus: 'Menjaga nama baik satuan pendidikan, mematuhi peraturan perundang-undangan, serta mendukung penuh visi dan kebijakan sekolah.',
    umpanBalik: 'Menunjukkan dedikasi tinggi dalam menyukseskan agenda strategis sekolah.'
  },
  {
    aspek: '6. Adaptif',
    ekspektasiKhusus: 'Cepat menyesuaikan diri dengan pembaruan kurikulum, sistem digital sekolah, dan dinamika kebutuhan belajar siswa.',
    umpanBalik: 'Sigap mengadopsi perangkat digital dalam pengelolaan kinerja dan layanan.'
  },
  {
    aspek: '7. Kolaboratif',
    ekspektasiKhusus: 'Aktif bersinergi dengan pimpinan, tim kurikulum, tata usaha, dan wali murid demi peningkatan mutu sekolah.',
    umpanBalik: 'Kooperatif dalam kepanitiaan maupun tim kerja sekolah.'
  }
];

export const computeSkpPredikatKinerja = (
  hasilKerja: SkpRatingLevel,
  perilaku: SkpRatingLevel
): SkpPredikatKinerja => {
  if (hasilKerja === 'Diatas Ekspektasi' && perilaku === 'Diatas Ekspektasi') {
    return 'Sangat Baik';
  }
  if (hasilKerja === 'Dibawah Ekspektasi' && perilaku === 'Dibawah Ekspektasi') {
    return 'Sangat Kurang';
  }
  if (hasilKerja === 'Dibawah Ekspektasi' || perilaku === 'Dibawah Ekspektasi') {
    if (hasilKerja === 'Diatas Ekspektasi' || perilaku === 'Diatas Ekspektasi') {
      return 'Butuh Perbaikan';
    }
    if (hasilKerja === 'Sesuai Ekspektasi' || perilaku === 'Sesuai Ekspektasi') {
      return 'Kurang';
    }
    return 'Kurang';
  }
  return 'Baik';
};

export const detectSkpFileType = (fileNameOrMime: string): SkpBuktiFileType => {
  const lower = (fileNameOrMime || '').toLowerCase();
  if (lower.includes('pdf') || lower.endsWith('.pdf')) return 'pdf';
  if (
    lower.includes('image/') ||
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg')
  ) {
    return 'image';
  }
  if (
    lower.includes('spreadsheet') ||
    lower.includes('excel') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.csv')
  ) {
    return 'excel';
  }
  return 'text';
};

export const toPreviewableExternalUrl = (rawUrl: string): { embedUrl: string; openUrl: string; isGoogleDrive: boolean } => {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return { embedUrl: '', openUrl: '', isGoogleDrive: false };

  // Google Drive file link: https://drive.google.com/file/d/<ID>/view...
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
  if (driveFileMatch?.[1]) {
    const id = driveFileMatch[1];
    return {
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      openUrl: trimmed,
      isGoogleDrive: true
    };
  }

  // Google Docs / Sheets / Slides
  const googleDocMatch = trimmed.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/?#]+)/i);
  if (googleDocMatch?.[1] && googleDocMatch?.[2]) {
    return {
      embedUrl: `https://docs.google.com/${googleDocMatch[1]}/d/${googleDocMatch[2]}/preview`,
      openUrl: trimmed,
      isGoogleDrive: true
    };
  }

  return {
    embedUrl: trimmed,
    openUrl: trimmed,
    isGoogleDrive: false
  };
};

// Membuat SVG dokumen scan resmi beresolusi tinggi sebagai contoh bukti dukung yang langsung terbaca jelas
const buildSampleOfficialScanSvgDataUrl = (params: {
  judul: string;
  nomor: string;
  tanggal: string;
  pegawaiNama: string;
  pegawaiNip: string;
  poinIsi: string[];
}): string => {
  const { judul, nomor, tanggal, pegawaiNama, pegawaiNip, poinIsi } = params;
  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const linesSvg = poinIsi
    .map((line, i) => {
      const y = 300 + i * 32;
      return `<text x="64" y="${y}" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="14" fill="#1e293b">${i + 1}. ${escapeXml(line)}</text>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="580" viewBox="0 0 800 580">
    <rect width="800" height="580" fill="#ffffff"/>
    <rect x="28" y="24" width="744" height="532" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="400" y="64" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#334155">PEMERINTAH PROVINSI JAWA TIMUR · DINAS PENDIDIKAN</text>
    <text x="400" y="90" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="20" font-weight="800" fill="#0f172a">SMA NEGERI 9 SURABAYA</text>
    <text x="400" y="110" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="11" fill="#475569">Jl. Wijaya Kusuma No. 48 Surabaya · Telp (031) 5341421</text>
    <line x1="56" y1="126" x2="744" y2="126" stroke="#0f172a" stroke-width="2.5"/>
    <line x1="56" y1="130" x2="744" y2="130" stroke="#0f172a" stroke-width="1"/>
    <text x="400" y="168" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="16" font-weight="800" fill="#0f172a">${escapeXml(judul.toUpperCase())}</text>
    <text x="400" y="190" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="12" fill="#334155">Nomor: ${escapeXml(nomor)}</text>
    <text x="64" y="232" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="13" fill="#475569">Nama Pegawai</text>
    <text x="190" y="232" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">: ${escapeXml(pegawaiNama)}</text>
    <text x="64" y="256" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="13" fill="#475569">NIP</text>
    <text x="190" y="256" font-family="JetBrains Mono, monospace" font-size="13" fill="#0f172a">: ${escapeXml(pegawaiNip || '-')}</text>
    ${linesSvg}
    <text x="530" y="458" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" fill="#334155">Surabaya, ${escapeXml(tanggal)}</text>
    <text x="530" y="476" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">Kepala SMAN 9 Surabaya</text>
    <rect x="524" y="486" width="160" height="36" rx="4" fill="#eff6ff" stroke="#93c5fd" stroke-width="1"/>
    <text x="604" y="508" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#1d4ed8">TERVERIFIKASI SKP</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const buildTemplateRhksForRole = (
  roleType: 'guru' | 'tendik' | 'manual',
  tahun: number
): SkpRhkItem[] => {
  const nowIso = new Date().toISOString();
  if (roleType === 'tendik') {
    return [
      {
        id: `rhk-${Date.now()}-1`,
        jenis: 'Utama',
        rhkAtasan: 'Terselenggaranya tata kelola administrasi persuratan, kepegawaian, dan layanan sekolah yang akuntabel.',
        rencanaHasilKerja: 'Terlaksananya pengelolaan arsip surat masuk/keluar, disposisi, dan layanan administrasi kepegawaian/kesiswaan tepat waktu.',
        periodeLabel: `Tahun ${tahun}`,
        indikatorList: [
          {
            id: `ind-${Date.now()}-1`,
            aspek: 'Kuantitas',
            indikator: 'Jumlah berkas surat dinas, SK, dan layanan administrasi yang diagendakan & diarsipkan',
            target: '12 Laporan Bulanan',
            realisasi: '12 Laporan Bulanan',
            capaianPersen: 100
          },
          {
            id: `ind-${Date.now()}-2`,
            aspek: 'Kualitas',
            indikator: 'Tingkat ketepatan klasifikasi kode surat dan kelengkapan arsip digital',
            target: '95%',
            realisasi: '98%',
            capaianPersen: 100
          },
          {
            id: `ind-${Date.now()}-3`,
            aspek: 'Waktu',
            indikator: 'Ketepatan waktu penyelesaian disposisi & penerbitan surat keterangan',
            target: '1 Hari Kerja',
            realisasi: '1 Hari Kerja',
            capaianPersen: 100
          }
        ],
        buktiDukungList: [
          {
            id: `bukti-${Date.now()}-t1`,
            judul: 'Rekapitulasi Agenda Surat Masuk & Keluar SMAN 9 Surabaya',
            ringkasanIsi: 'Berisi rekap nomor agenda, pengirim/tujuan, kode klasifikasi arsip, serta status tindak lanjut disposisi bulan berjalan.',
            kategori: 'Laporan Kegiatan',
            nomorDokumen: `800/045/101.6.1.9/${tahun}`,
            tanggalDokumen: `${tahun}-11-15`,
            jenisFile: 'text',
            teksNarasi:
              `LAPORAN REKAPITULASI TATA USAHA PERSURATAN\nUnit Kerja: Sub Bagian Tata Usaha SMAN 9 Surabaya\n\nRingkasan Capaian:\n1. Total Surat Masuk teragenda dan terdisposisi: 148 berkas (100% ditindaklanjuti).\n2. Total Surat Keluar resmi dengan nomor kode klasifikasi baku: 112 berkas.\n3. Seluruh berkas telah dipindai dan disimpan dalam cadangan arsip digital lokal.\n4. Waktu layanan rata-rata penerbitan surat keterangan siswa/guru: < 1 hari kerja.`,
            statusVerifikasi: 'Terbaca & Valid',
            catatanPenilai: 'Data rekap jelas dan sesuai buku agenda.',
            uploadedAt: nowIso
          }
        ]
      },
      {
        id: `rhk-${Date.now()}-2`,
        jenis: 'Tambahan',
        rhkAtasan: 'Terwujudnya dukungan teknis kegiatan asesmen/ujian dan administrasi GTK sekolah.',
        rencanaHasilKerja: 'Terfasilitasinya pencetakan kartu peserta, daftar hadir, dan berita acara kegiatan sekolah.',
        periodeLabel: `Tahun ${tahun}`,
        indikatorList: [
          {
            id: `ind-${Date.now()}-4`,
            aspek: 'Kuantitas',
            indikator: 'Paket dokumen operasional asesmen/ujian yang tersusun lengkap',
            target: '2 Paket Semester',
            realisasi: '2 Paket Semester',
            capaianPersen: 100
          }
        ],
        buktiDukungList: []
      }
    ];
  }

  return [
    {
      id: `rhk-${Date.now()}-1`,
      jenis: 'Utama',
      rhkAtasan: 'Meningkatnya mutu perencanaan, pelaksanaan, dan evaluasi pembelajaran berpusat pada peserta didik di SMAN 9 Surabaya.',
      rencanaHasilKerja: 'Tersusunnya perangkat pembelajaran (ATP/Modul Ajar) dan terlaksananya kegiatan belajar mengajar serta asesmen sesuai kurikulum yang berlaku.',
      periodeLabel: `Tahun ${tahun}`,
      indikatorList: [
        {
          id: `ind-${Date.now()}-1`,
          aspek: 'Kuantitas',
          indikator: 'Jumlah dokumen perangkat ajar (ATP, Modul Ajar, Program Semester, Kisi-kisi & Bank Soal)',
          target: '2 Paket (Gasal & Genap)',
          realisasi: '2 Paket Lengkap',
          capaianPersen: 100
        },
        {
          id: `ind-${Date.now()}-2`,
          aspek: 'Kualitas',
          indikator: 'Persentase kesesuaian perangkat ajar dengan capaian pembelajaran dan asesmen formatif/sumatif',
          target: '95%',
          realisasi: '98%',
          capaianPersen: 100
        },
        {
          id: `ind-${Date.now()}-3`,
          aspek: 'Waktu',
          indikator: 'Ketepatan waktu pengumpulan perangkat ajar dan nilai rapor semester',
          target: '12 Bulan',
          realisasi: 'Tepat Waktu (12 Bulan)',
          capaianPersen: 100
        }
      ],
      buktiDukungList: []
    },
    {
      id: `rhk-${Date.now()}-2`,
      jenis: 'Tambahan',
      rhkAtasan: 'Terlaksananya pembinaan kesiswaan, tugas tambahan sekolah, dan pengembangan kompetensi berkelanjutan.',
      rencanaHasilKerja: 'Terlaksananya tugas tambahan sebagai Wali Kelas / Pengawas Ujian / Pembina Ekstrakurikuler serta keikutsertaan dalam kegiatan MGMP.',
      periodeLabel: `Tahun ${tahun}`,
      indikatorList: [
        {
          id: `ind-${Date.now()}-4`,
          aspek: 'Kuantitas',
          indikator: 'Jumlah laporan pelaksanaan tugas tambahan / sertifikat pengembangan diri',
          target: '2 Laporan / Sertifikat',
          realisasi: '2 Laporan Lengkap',
          capaianPersen: 100
        }
      ],
      buktiDukungList: []
    }
  ];
};

export const createInitialSkpRecords = (
  profile: SchoolProfile,
  guruList: Guru[],
  tendikList: Tendik[]
): SkpDocumentRecord[] => {
  const tahun = 2026;
  const nowIso = new Date().toISOString();
  const activeGuru = guruList.filter(g => !g.statusAktif || g.statusAktif === 'Aktif');
  const activeTendik = tendikList.filter(t => !t.statusAktif || t.statusAktif === 'Aktif');

  const sampleGuru = activeGuru[0];
  const sampleTendik = activeTendik[0];

  const records: SkpDocumentRecord[] = [];

  if (sampleGuru) {
    const sampleScanUrl = buildSampleOfficialScanSvgDataUrl({
      judul: 'Surat Keputusan Pembagian Tugas Mengajar & Wali Kelas',
      nomor: '421.3/118/101.6.1.9/2026',
      tanggal: '14 Juli 2026',
      pegawaiNama: sampleGuru.nama,
      pegawaiNip: sampleGuru.nip || '-',
      poinIsi: [
        `Mengampu mata pelajaran ${sampleGuru.mataPelajaran || sampleGuru.mapel || 'sesuai bidang studi'} sebanyak 24 JP/minggu.`,
        `Melaksanakan tugas tambahan: ${sampleGuru.tugasTambahan || 'Wali Kelas & Tim Pengembang Kurikulum'}.`,
        'Menyusun Modul Ajar, asesmen formatif/sumatif, serta melakukan refleksi pembelajaran.',
        'Melaporkan capaian hasil belajar siswa secara berkala kepada Kepala Sekolah.'
      ]
    });

    records.push({
      id: `skp-seed-guru-${sampleGuru.id}`,
      pegawaiSourceType: 'guru',
      pegawaiSourceId: sampleGuru.id,
      pegawaiNama: sampleGuru.nama,
      pegawaiNip: sampleGuru.nip || '-',
      pegawaiPangkatGol: sampleGuru.pangkatGolongan || 'Penata / III-c',
      pegawaiJabatan: `${sampleGuru.jenisPtk || 'Guru'} ${sampleGuru.mataPelajaran || sampleGuru.mapel || ''}`.trim(),
      pegawaiUnitKerja: profile.namaSekolah || 'SMAN 9 Surabaya',
      penilaiNama: profile.kepalaSekolah || 'Kepala SMAN 9 Surabaya',
      penilaiNip: profile.nipKepalaSekolah || '-',
      penilaiPangkatGol: profile.pangkatKepsek || 'Pembina Utama Muda / IV-c',
      penilaiJabatan: 'Kepala Sekolah',
      penilaiUnitKerja: profile.namaSekolah || 'SMAN 9 Surabaya',
      tahun,
      periode: `1 Januari s.d. 31 Desember ${tahun}`,
      pendekatan: 'Kuantitatif',
      ratingHasilKerja: 'Sesuai Ekspektasi',
      ratingPerilaku: 'Sesuai Ekspektasi',
      predikatKinerja: 'Baik',
      rhkList: [
        {
          id: 'rhk-seed-g1',
          jenis: 'Utama',
          rhkAtasan: 'Terselenggaranya pembelajaran berdiferensiasi dan asesmen kurikulum yang berkualitas di SMAN 9 Surabaya.',
          rencanaHasilKerja: `Terlaksananya perencanaan, pembelajaran, dan penilaian mata pelajaran ${sampleGuru.mataPelajaran || sampleGuru.mapel || 'inti'} pada semester Gasal & Genap.`,
          periodeLabel: 'Tahunan 2026',
          indikatorList: [
            {
              id: 'ind-seed-g1',
              aspek: 'Kuantitas',
              indikator: 'Dokumen Modul Ajar, ATP, Kisi-kisi, dan Analisis Nilai Sumatif yang disusun',
              target: '2 Paket Semester',
              realisasi: '2 Paket Lengkap',
              capaianPersen: 100
            },
            {
              id: 'ind-seed-g2',
              aspek: 'Kualitas',
              indikator: 'Kesesuaian perangkat ajar terhadap capaian pembelajaran & supervisi akademik',
              target: '95%',
              realisasi: '98%',
              capaianPersen: 100
            },
            {
              id: 'ind-seed-g3',
              aspek: 'Waktu',
              indikator: 'Ketepatan unggah perangkat dan input nilai rapor sesuai kalender akademik',
              target: '12 Bulan',
              realisasi: '12 Bulan (Tepat Waktu)',
              capaianPersen: 100
            }
          ],
          buktiDukungList: [
            {
              id: 'bukti-seed-g1',
              judul: 'SK Pembagian Tugas Mengajar Semester Gasal 2026/2027',
              ringkasanIsi: `Menetapkan beban mengajar 24 JP dan tugas tambahan ${sampleGuru.tugasTambahan || 'Wali Kelas'} di SMAN 9 Surabaya.`,
              kategori: 'SK / Surat Tugas',
              nomorDokumen: '421.3/118/101.6.1.9/2026',
              tanggalDokumen: '2026-07-14',
              jenisFile: 'image',
              fileName: 'SK_Pembagian_Tugas_2026.svg',
              mimeType: 'image/svg+xml',
              inlinePreviewDataUrl: sampleScanUrl,
              statusVerifikasi: 'Terbaca & Valid',
              catatanPenilai: 'SK terbaca jelas, nomor surat dan beban 24 JP sesuai.',
              uploadedAt: nowIso
            },
            {
              id: 'bukti-seed-g2',
              judul: 'Ringkasan Jurnal Mengajar & Ketuntasan Nilai Sumatif',
              ringkasanIsi: 'Rekapitulasi pelaksanaan 36 pertemuan tatap muka, asesmen formatif, dan ketercapaian KKTP peserta didik di 6 rombel binaan.',
              kategori: 'Laporan Kegiatan',
              nomorDokumen: 'JURNAL-KBM/2026/01',
              tanggalDokumen: '2026-11-20',
              jenisFile: 'text',
              teksNarasi:
                `RINGKASAN JURNAL PELAKSANAAN PEMBELAJARAN\nNama Pendidik: ${sampleGuru.nama}\nNIP: ${sampleGuru.nip || '-'}\nMata Pelajaran: ${sampleGuru.mataPelajaran || sampleGuru.mapel || '-'}\n\n1. Keterlaksanaan Pertemuan KBM\n   - Target pertemuan semester berjalan: 36 pertemuan per rombel\n   - Realisasi terlaksana: 36 pertemuan (100%) disertai daftar hadir kelas.\n\n2. Pelaksanaan Asesmen Sumatif\n   - Sumatif Lingkup Materi (3 kali) dan Sumatif Akhir Semester terlaksana tertib.\n   - Rata-rata ketuntasan belajar peserta didik mencapai 94,5% setelah program pengayaan & remedial.\n\n3. Tindak Lanjut Supervisi Akademik\n   - Telah dilakukan observasi kelas bersama tim kurikulum dengan kategori "Baik" dan umpan balik refleksi terlampir.`,
              statusVerifikasi: 'Belum Diperiksa',
              uploadedAt: nowIso
            }
          ]
        },
        {
          id: 'rhk-seed-g2',
          jenis: 'Tambahan',
          rhkAtasan: 'Terwujudnya peningkatan kompetensi GTK dan dukungan kegiatan operasional sekolah.',
          rencanaHasilKerja: 'Keikutsertaan aktif dalam MGMP Kota Surabaya serta penugasan Panitia / Pengawas Asesmen Sumatif.',
          periodeLabel: 'Tahunan 2026',
          indikatorList: [
            {
              id: 'ind-seed-g4',
              aspek: 'Kuantitas',
              indikator: 'Jumlah sertifikat MGMP / SK Kepanitiaan Asesmen yang diselesaikan',
              target: '2 Dokumen',
              realisasi: '2 Dokumen',
              capaianPersen: 100
            }
          ],
          buktiDukungList: [
            {
              id: 'bukti-seed-g3',
              judul: 'Sertifikat & Daftar Hadir Workshop Kurikulum Merdeka MGMP',
              ringkasanIsi: 'Keikutsertaan 32 JP pada penyusunan modul projek penguatan profil pelajar Pancasila & asesmen diagnostik.',
              kategori: 'Sertifikat / Piagam',
              nomorDokumen: 'MGMP-SBY/089/2026',
              tanggalDokumen: '2026-09-10',
              jenisFile: 'text',
              teksNarasi:
                `CATATAN BUKTI KEGIATAN PENGEMBANGAN KOMPETENSI (32 JP)\nPenyelenggara: MGMP SMA Kota Surabaya\nTema: Optimalisasi Asesmen Formatif & Pembelajaran Mendalam\nStatus: Lulus dengan predikat Sangat Baik.\nProduk yang dihasilkan: 1 Modul Ajar Berdiferensiasi siap pakai di kelas.`,
              statusVerifikasi: 'Terbaca & Valid',
              uploadedAt: nowIso
            }
          ]
        }
      ],
      perilakuList: DEFAULT_BERAKHLAK_LIST.map(p => ({ ...p })),
      catatanEvaluasi: 'Kinerja pembelajaran dan kelengkapan bukti dukung konsisten sepanjang tahun berjalan.',
      updatedAt: nowIso
    });
  }

  if (sampleTendik) {
    records.push({
      id: `skp-seed-tendik-${sampleTendik.id}`,
      pegawaiSourceType: 'tendik',
      pegawaiSourceId: sampleTendik.id,
      pegawaiNama: sampleTendik.nama,
      pegawaiNip: sampleTendik.nip || '-',
      pegawaiPangkatGol: sampleTendik.pangkatGolongan || 'Pengatur / II-c',
      pegawaiJabatan: sampleTendik.jenisPtk || sampleTendik.jabatan || 'Tenaga Administrasi Sekolah',
      pegawaiUnitKerja: profile.namaSekolah || 'SMAN 9 Surabaya',
      penilaiNama: profile.kepalaSekolah || 'Kepala SMAN 9 Surabaya',
      penilaiNip: profile.nipKepalaSekolah || '-',
      penilaiPangkatGol: profile.pangkatKepsek || 'Pembina Utama Muda / IV-c',
      penilaiJabatan: 'Kepala Sekolah',
      penilaiUnitKerja: profile.namaSekolah || 'SMAN 9 Surabaya',
      tahun,
      periode: `1 Januari s.d. 31 Desember ${tahun}`,
      pendekatan: 'Kuantitatif',
      ratingHasilKerja: 'Sesuai Ekspektasi',
      ratingPerilaku: 'Sesuai Ekspektasi',
      predikatKinerja: 'Baik',
      rhkList: buildTemplateRhksForRole('tendik', tahun),
      perilakuList: DEFAULT_BERAKHLAK_LIST.map(p => ({ ...p })),
      catatanEvaluasi: 'Layanan ketatausahaan dan penataan arsip berjalan tertib.',
      updatedAt: nowIso
    });
  }

  return records;
};

export const exportSkpDocumentToExcel = (skp: SkpDocumentRecord): void => {
  const wb = XLSX.utils.book_new();

  const headerRows: (string | number)[][] = [
    ['SASARAN KINERJA PEGAWAI (SKP) & REKAP BUKTI DUKUNG'],
    [`UNIT KERJA: ${skp.pegawaiUnitKerja}`],
    [`PERIODE: ${skp.periode} (${skp.tahun})`],
    [],
    ['PEGAWAI YANG DINILAI', skp.pegawaiNama, 'PEJABAT PENILAI KINERJA', skp.penilaiNama],
    ['NIP', skp.pegawaiNip || '-', 'NIP', skp.penilaiNip || '-'],
    ['Pangkat / Golongan', skp.pegawaiPangkatGol || '-', 'Pangkat / Golongan', skp.penilaiPangkatGol || '-'],
    ['Jabatan', skp.pegawaiJabatan || '-', 'Jabatan', skp.penilaiJabatan || '-'],
    ['Predikat Kinerja', skp.predikatKinerja, 'Hasil Kerja / Perilaku', `${skp.ratingHasilKerja} / ${skp.ratingPerilaku}`],
    [],
    [
      'No',
      'Jenis RHK',
      'RHK Pimpinan yang Diintervensi',
      'Rencana Hasil Kerja',
      'Aspek',
      'Indikator Kinerja Individu',
      'Target',
      'Realisasi',
      'Capaian (%)',
      'Daftar Bukti Dukung & Status Verifikasi'
    ]
  ];

  skp.rhkList.forEach((rhk, idx) => {
    const buktiSummary =
      rhk.buktiDukungList.length === 0
        ? 'Belum ada bukti dukung'
        : rhk.buktiDukungList
            .map(
              (b, bIdx) =>
                `${bIdx + 1}. ${b.judul}${b.nomorDokumen ? ` [${b.nomorDokumen}]` : ''} (${b.statusVerifikasi})`
            )
            .join(' | ');

    if (rhk.indikatorList.length === 0) {
      headerRows.push([
        idx + 1,
        rhk.jenis,
        rhk.rhkAtasan,
        rhk.rencanaHasilKerja,
        '-',
        '-',
        '-',
        '-',
        0,
        buktiSummary
      ]);
    } else {
      rhk.indikatorList.forEach((ind, iIdx) => {
        headerRows.push([
          iIdx === 0 ? idx + 1 : '',
          iIdx === 0 ? rhk.jenis : '',
          iIdx === 0 ? rhk.rhkAtasan : '',
          iIdx === 0 ? rhk.rencanaHasilKerja : '',
          ind.aspek,
          ind.indikator,
          ind.target,
          ind.realisasi,
          ind.capaianPersen,
          iIdx === 0 ? buktiSummary : ''
        ]);
      });
    }
  });

  const wsRhk = XLSX.utils.aoa_to_sheet(headerRows);
  wsRhk['!cols'] = [
    { wch: 5 },
    { wch: 11 },
    { wch: 34 },
    { wch: 36 },
    { wch: 12 },
    { wch: 34 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 44 }
  ];
  XLSX.utils.book_append_sheet(wb, wsRhk, 'Matriks SKP');

  const buktiRows: (string | number)[][] = [
    ['DAFTAR BUKTI DUKUNG SKP', skp.pegawaiNama, `Tahun ${skp.tahun}`],
    [],
    ['No', 'RHK Terkait', 'Judul Bukti Dukung', 'Kategori', 'No. Dokumen', 'Tanggal', 'Jenis File', 'Ringkasan Isi', 'Status Verifikasi', 'Catatan Penilai']
  ];

  let bCounter = 1;
  skp.rhkList.forEach(rhk => {
    rhk.buktiDukungList.forEach(b => {
      buktiRows.push([
        bCounter++,
        rhk.rencanaHasilKerja,
        b.judul,
        b.kategori,
        b.nomorDokumen || '-',
        b.tanggalDokumen || '-',
        b.jenisFile.toUpperCase(),
        b.ringkasanIsi,
        b.statusVerifikasi,
        b.catatanPenilai || '-'
      ]);
    });
  });

  const wsBukti = XLSX.utils.aoa_to_sheet(buktiRows);
  wsBukti['!cols'] = [
    { wch: 5 },
    { wch: 32 },
    { wch: 30 },
    { wch: 20 },
    { wch: 22 },
    { wch: 13 },
    { wch: 10 },
    { wch: 42 },
    { wch: 18 },
    { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsBukti, 'Bukti Dukung');

  const safeName = skp.pegawaiNama.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 32);
  XLSX.writeFile(wb, `SKP_${safeName}_${skp.tahun}.xlsx`);
};
