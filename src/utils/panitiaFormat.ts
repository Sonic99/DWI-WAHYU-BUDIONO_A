import {
  Guru,
  Tendik,
  PanitiaPengawasItem,
  KartuPanitiaSettings
} from '../types';

export const DEFAULT_JABATAN_PANITIA_OPTIONS: string[] = [
  'Penanggung Jawab',
  'Penasehat',
  'Ketua',
  'Sekretaris',
  'Bendahara',
  'Penyelenggara',
  'Admin CBT',
  'Proktor R1 - R4',
  'Proktor R5 - R6 & LabKom / Tek',
  'Proktor R7 - R10',
  'Proktor R11 - R15',
  'Proktor R16 - R18',
  'Proktor R19 - R22',
  'Sie Ruang dan Kepengawasan',
  'Sie Perlengkapan',
  'Sie Konsumsi',
  'Administrasi',
  'Pembantu Sekretaris',
  'Pembantu Sie Perlengkapan dan Administrasi',
  'Pembantu Sie Konsumsi',
  'Pembantu Sie Ruang',
  'Pembantu Sie Keamanan'
];

export const DEFAULT_JABATAN_PENGAWAS_OPTIONS: string[] = [
  'Pengawas Ruang',
  'Pengawas Cadangan & Logistik',
  'Pengawas Cadangan',
  'Koordinator Pengawas Lantai',
  'Pengawas Laboratorium / CBT',
  'Pengawas Khusus'
];

export interface PanitiaSlotSpec {
  seq: number;
  groupNo: number;
  subNo?: number;
  mergeGroupInTable: boolean;
  displayName: string;
  matchAliases: string[];
  preferredSource: 'guru' | 'tendik';
  jabatanKepanitiaan: string;
  ruangTugas: string;
  sesiTugas: string;
}

export const SUSUNAN_PANITIA_PSAS_SPEC: PanitiaSlotSpec[] = [
  {
    seq: 1,
    groupNo: 1,
    mergeGroupInTable: false,
    displayName: 'Tri Kurniawati, M.Pd.',
    matchAliases: ['Tri Kurniawati'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Penanggung Jawab',
    ruangTugas: 'Sekretariat Pusat',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 2,
    groupNo: 2,
    mergeGroupInTable: false,
    displayName: 'Kardiyono, M.Pd',
    matchAliases: ['Kardiyono'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Penasehat',
    ruangTugas: 'Sekretariat Pusat',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 3,
    groupNo: 3,
    mergeGroupInTable: false,
    displayName: 'Tri Susanto Setiawan, S.Pd. Gr',
    matchAliases: ['Tri Susanto Setiawan'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Ketua',
    ruangTugas: 'Sekretariat Pusat',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 4,
    groupNo: 4,
    mergeGroupInTable: false,
    displayName: 'Rosa Kurnia Widiawati, S.Pd., Gr.',
    matchAliases: ['Rosa Kurnia Widiawati'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Sekretaris',
    ruangTugas: 'Sekretariat Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 5,
    groupNo: 5,
    mergeGroupInTable: false,
    displayName: 'Fatimatuzahro, S.Pd., Gr.',
    matchAliases: ['Fatimatuzahro', 'Fatimatuzzahro', 'Fatimatu Zahro'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Bendahara',
    ruangTugas: 'Sekretariat Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 6,
    groupNo: 6,
    subNo: 1,
    mergeGroupInTable: true,
    displayName: 'Chusnawirya Kurnia Devi, M.Sosio',
    matchAliases: ['Chusnawirya Kurnia Devi', 'Khusnawirya Kurnia Devi'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Penyelenggara',
    ruangTugas: 'Sekretariat Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 7,
    groupNo: 6,
    subNo: 2,
    mergeGroupInTable: true,
    displayName: 'Koekoeh Soebagijo, S.Pd',
    matchAliases: ['Koekoeh Soebagijo', 'Kukuh Subagiyo', 'Koekoeh Subagijo'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Penyelenggara',
    ruangTugas: 'Sekretariat Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 8,
    groupNo: 6,
    subNo: 3,
    mergeGroupInTable: true,
    displayName: 'Ndaru Kurniawan, S.Pd., Gr.',
    matchAliases: ['Ndaru Kurniawan'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Penyelenggara',
    ruangTugas: 'Sekretariat Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 9,
    groupNo: 6,
    subNo: 4,
    mergeGroupInTable: true,
    displayName: 'Nur Hidayat, S.Pd., Gr.',
    matchAliases: ['Nur Hidayat'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Penyelenggara',
    ruangTugas: 'Sekretariat Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 10,
    groupNo: 6,
    subNo: 5,
    mergeGroupInTable: true,
    displayName: 'Stevan Rhama Adhitya, S.Pd., Gr.',
    matchAliases: ['Stevan Rhama Adhitya', 'Stefan Rhama Aditya', 'Stevan Rama Aditya'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Penyelenggara',
    ruangTugas: 'Sekretariat Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 11,
    groupNo: 7,
    mergeGroupInTable: false,
    displayName: 'Irawati, S.Pd',
    matchAliases: ['Irawati'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Admin CBT',
    ruangTugas: 'Ruang Server / CBT Pusat',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 12,
    groupNo: 8,
    mergeGroupInTable: false,
    displayName: 'Ahmad Yasin, S.Pd, Gr',
    matchAliases: ['Ahmad Yasin'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Proktor R1 - R4',
    ruangTugas: 'R1 - R4',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 13,
    groupNo: 8,
    mergeGroupInTable: false,
    displayName: 'Muhammad Syaiful Arif, S.Kom',
    matchAliases: ['Muhammad Syaiful Arif', 'Muhamad Syaiful Arif', 'M Syaiful Arif'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Proktor R5 - R6 & LabKom / Tek',
    ruangTugas: 'R5 - R6 & LabKom / Tek',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 14,
    groupNo: 8,
    mergeGroupInTable: false,
    displayName: 'Arin Novia Shanti, S.Si, Gr.',
    matchAliases: ['Arin Novia Shanti'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Proktor R7 - R10',
    ruangTugas: 'R7 - R10',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 15,
    groupNo: 8,
    mergeGroupInTable: false,
    displayName: 'Fofi Fana, S.Pd., M.Pd., Gr.',
    matchAliases: ['Fofi Fana'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Proktor R11 - R15',
    ruangTugas: 'R11 - R15',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 16,
    groupNo: 8,
    mergeGroupInTable: false,
    displayName: 'Muhamad Yusuf, S.T',
    matchAliases: ['Muhamad Yusuf', 'Muhammad Yusuf'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Proktor R16 - R18',
    ruangTugas: 'R16 - R18',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 17,
    groupNo: 8,
    mergeGroupInTable: false,
    displayName: 'Jefri Dadang Triyoso, S.Pd., Gr.',
    matchAliases: ['Jefri Dadang Triyoso'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Proktor R19 - R22',
    ruangTugas: 'R19 - R22',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 18,
    groupNo: 9,
    subNo: 1,
    mergeGroupInTable: true,
    displayName: 'Muhammad Royhan, S.Pd., Gr.',
    matchAliases: ['Muhammad Royhan', 'Muhamad Royhan'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Sie Ruang dan Kepengawasan',
    ruangTugas: 'R. Pengawasan / Koridor',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 19,
    groupNo: 9,
    subNo: 2,
    mergeGroupInTable: true,
    displayName: 'Widiyanti Sifunita Sufia, S.Pd., Gr.',
    matchAliases: ['Widiyanti Sifunita Sufia'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Sie Ruang dan Kepengawasan',
    ruangTugas: 'R. Pengawasan / Koridor',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 20,
    groupNo: 10,
    mergeGroupInTable: false,
    displayName: 'Candra Septiadi, S.Sn., Gr.',
    matchAliases: ['Candra Septiadi', 'Chandra Septiadi'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Sie Perlengkapan',
    ruangTugas: 'R. Perlengkapan & Logistik',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 21,
    groupNo: 11,
    mergeGroupInTable: false,
    displayName: 'Sutartik, S.Pd.',
    matchAliases: ['Sutartik'],
    preferredSource: 'guru',
    jabatanKepanitiaan: 'Sie Konsumsi',
    ruangTugas: 'R. Konsumsi Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 22,
    groupNo: 12,
    mergeGroupInTable: false,
    displayName: 'Dwi Wahyu Budiono, S.Sos',
    matchAliases: ['Dwi Wahyu Budiono'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Administrasi',
    ruangTugas: 'Sekretariat & TU',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 23,
    groupNo: 13,
    mergeGroupInTable: false,
    displayName: 'Uun Mumpuni, S.Pd',
    matchAliases: ['Uun Mumpuni'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sekretaris',
    ruangTugas: 'Sekretariat Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 24,
    groupNo: 14,
    subNo: 1,
    mergeGroupInTable: true,
    displayName: 'Widianingsih, S.Si',
    matchAliases: ['Widianingsih'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sie Perlengkapan dan Administrasi',
    ruangTugas: 'R. Perlengkapan & TU',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 25,
    groupNo: 14,
    subNo: 2,
    mergeGroupInTable: true,
    displayName: 'Krestanto Budi Waluyo, S.Pd',
    matchAliases: ['Krestanto Budi Waluyo', 'Krestianto Budi Waluyo'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sie Perlengkapan dan Administrasi',
    ruangTugas: 'R. Perlengkapan & TU',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 26,
    groupNo: 15,
    subNo: 1,
    mergeGroupInTable: true,
    displayName: 'Dian Irakandi, A.Md.',
    matchAliases: ['Dian Irakandi'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sie Konsumsi',
    ruangTugas: 'R. Konsumsi Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 27,
    groupNo: 15,
    subNo: 2,
    mergeGroupInTable: true,
    displayName: 'Suprihatin',
    matchAliases: ['Suprihatin'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sie Konsumsi',
    ruangTugas: 'R. Konsumsi Panitia',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 28,
    groupNo: 16,
    subNo: 1,
    mergeGroupInTable: true,
    displayName: 'Suherman',
    matchAliases: ['Suherman'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sie Ruang',
    ruangTugas: 'Area Ruang Ujian',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 29,
    groupNo: 16,
    subNo: 2,
    mergeGroupInTable: true,
    displayName: 'Muhamad Khabib Bulloh',
    matchAliases: ['Muhamad Khabib Bulloh', 'Muhammad Khabib Bulloh', 'Khabib Bulloh'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sie Ruang',
    ruangTugas: 'Area Ruang Ujian',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 30,
    groupNo: 17,
    subNo: 1,
    mergeGroupInTable: true,
    displayName: 'Mochammad Muchlisin',
    matchAliases: ['Mochammad Muchlisin', 'Mochamad Muchlisin', 'Muchlisin'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sie Keamanan',
    ruangTugas: 'Area Keamanan & Gerbang',
    sesiTugas: 'Semua Sesi'
  },
  {
    seq: 31,
    groupNo: 17,
    subNo: 2,
    mergeGroupInTable: true,
    displayName: 'Muhammad Mahmud',
    matchAliases: ['Muhammad Mahmud', 'Mokhamad Makhmud', 'Mochamad Makhmud', 'Muhamad Mahmud'],
    preferredSource: 'tendik',
    jabatanKepanitiaan: 'Pembantu Sie Keamanan',
    ruangTugas: 'Area Keamanan & Gerbang',
    sesiTugas: 'Semua Sesi'
  }
];

const TITLE_TOKEN_PATTERN =
  /\b(drs|dra|dr|prof|ir|h|hj|s\.?\s*pd\.?\s*i?|s\.?\s*kom|s\.?\s*si|s\.?\s*t|s\.?\s*sn|s\.?\s*sos|s\.?\s*e|s\.?\s*h|s\.?\s*ag|s\.?\s*ap|m\.?\s*pd\.?\s*i?|m\.?\s*sosio|m\.?\s*kom|m\.?\s*si|m\.?\s*m|m\.?\s*a|a\.?\s*md\.?\s*kom?|gr)\b/gi;

export const normalizeIndonesianBaseName = (rawName: string): string => {
  const withoutTitles = (rawName || '')
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(TITLE_TOKEN_PATTERN, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Phonetic/orthographic normalization common in Javanese/Indonesian GTK records
  return withoutTitles
    .replace(/\bmokham+ad\b/g, 'muhamad')
    .replace(/\bmochamm*ad\b/g, 'muhamad')
    .replace(/\bmuham+ad\b/g, 'muhamad')
    .replace(/\bmakhmud\b/g, 'mahmud')
    .replace(/\bkhusn/g, 'chusn')
    .replace(/\bkrestanto\b/g, 'krestianto')
    .replace(/oe/g, 'u')
    .replace(/dj/g, 'j')
    .replace(/\s+/g, ' ')
    .trim();
};

export const formatGtkDisplayName = (nama: string, gelar?: string): string => {
  const cleanName = (nama || '').trim();
  const cleanGelar = (gelar || '').trim();
  if (!cleanGelar) return cleanName;
  const lowerName = cleanName.toLowerCase();
  const lowerGelar = cleanGelar.toLowerCase().replace(/^,\s*/, '');
  if (lowerName.includes(lowerGelar)) return cleanName;
  return `${cleanName}, ${cleanGelar.replace(/^,\s*/, '')}`;
};

export interface GtkMatchResult {
  sourceType: 'guru' | 'tendik';
  entry: Guru | Tendik;
}

export const findGtkMatchByAliases = (
  aliases: string[],
  preferredSource: 'guru' | 'tendik',
  guruList: Guru[],
  tendikList: Tendik[]
): GtkMatchResult | null => {
  const normalizedAliases = aliases.map(a => normalizeIndonesianBaseName(a)).filter(Boolean);
  if (normalizedAliases.length === 0) return null;

  const searchPool = (
    list: (Guru | Tendik)[],
    sourceType: 'guru' | 'tendik'
  ): GtkMatchResult | null => {
    // Pass 1: exact normalized match
    for (const item of list) {
      const itemNorm = normalizeIndonesianBaseName(item.nama);
      if (normalizedAliases.some(al => itemNorm === al)) {
        return { sourceType, entry: item };
      }
    }
    // Pass 2: includes normalized match (when alias >= 2 words or full single word match)
    for (const item of list) {
      const itemNorm = normalizeIndonesianBaseName(item.nama);
      if (!itemNorm) continue;
      if (
        normalizedAliases.some(
          al =>
            (al.length >= 6 && itemNorm.includes(al)) ||
            (itemNorm.length >= 6 && al.includes(itemNorm))
        )
      ) {
        return { sourceType, entry: item };
      }
    }
    return null;
  };

  if (preferredSource === 'guru') {
    return searchPool(guruList, 'guru') || searchPool(tendikList, 'tendik');
  }
  return searchPool(tendikList, 'tendik') || searchPool(guruList, 'guru');
};

export interface BuildPanitiaResult {
  nextItems: PanitiaPengawasItem[];
  matchedFromGtkCount: number;
  unmatchedNames: string[];
}

export const buildPanitiaFromGtkDatabase = (
  guruList: Guru[],
  tendikList: Tendik[],
  existingItems: PanitiaPengawasItem[],
  settings: KartuPanitiaSettings
): BuildPanitiaResult => {
  const prefix = settings.prefixNomorPanitia || 'PAN-26-';
  const existingPanitia = existingItems.filter(i => i.kategori === 'panitia');
  const existingPengawas = existingItems.filter(i => i.kategori !== 'panitia');

  let matchedFromGtkCount = 0;
  const unmatchedNames: string[] = [];

  const generatedPanitia: PanitiaPengawasItem[] = SUSUNAN_PANITIA_PSAS_SPEC.map(spec => {
    const match = findGtkMatchByAliases(
      [spec.displayName, ...spec.matchAliases],
      spec.preferredSource,
      guruList,
      tendikList
    );

    const existingSame = existingPanitia.find(prev => {
      if (match && prev.sourceId && prev.sourceId === match.entry.id) return true;
      const prevNorm = normalizeIndonesianBaseName(prev.nama);
      return spec.matchAliases.some(a => normalizeIndonesianBaseName(a) === prevNorm);
    });

    if (match) {
      matchedFromGtkCount++;
    } else {
      unmatchedNames.push(spec.displayName);
    }

    const entry = match?.entry;
    const rawNip = (entry?.nip || '').trim();
    const resolvedUnit =
      match?.sourceType === 'guru'
        ? entry?.mataPelajaran || entry?.mapel || entry?.jabatan || 'Guru Mapel'
        : entry?.jabatan || (entry as Tendik | undefined)?.tugasUtama || 'Tenaga Kependidikan';

    // Preserve formatted SK title & casing while sourcing NIP, pangkat, unit, & GTK ID directly from DB.
    // If matched DB entry already contains explicit gelar/full formatted title matching user's DB, keep it or apply SK displayName cleanly.
    const dbHasTitle = Boolean(
      entry && (entry.gelar?.trim() || /,|\./.test(entry.nama))
    );
    const resolvedName = entry
      ? dbHasTitle && entry.nama.trim().length > 0 && !/^[A-Z\s]+$/.test(entry.nama.trim())
        ? formatGtkDisplayName(entry.nama, entry.gelar)
        : spec.displayName
      : spec.displayName;

    return {
      id: existingSame?.id || `pp-pan-${String(spec.seq).padStart(2, '0')}`,
      kategori: 'panitia',
      nomorTugas: `${prefix}${String(spec.seq).padStart(3, '0')}`,
      nama: resolvedName,
      nip: rawNip || (existingSame?.nip && existingSame.nip !== '-' ? existingSame.nip : '-'),
      pangkatGolongan: entry?.pangkatGolongan || existingSame?.pangkatGolongan || '-',
      jabatanKepanitiaan: spec.jabatanKepanitiaan,
      unitAsal: resolvedUnit,
      ruangTugas: existingSame?.ruangTugas?.trim() || spec.ruangTugas,
      sesiTugas: spec.sesiTugas,
      fotoUrl: existingSame?.fotoUrl,
      barcodeLink: existingSame?.barcodeLink,
      sourceType: match ? match.sourceType : 'manual',
      sourceId: entry?.id
    };
  });

  return {
    nextItems: [...generatedPanitia, ...existingPengawas],
    matchedFromGtkCount,
    unmatchedNames
  };
};

export interface SusunanPanitiaTableRowGroup {
  groupNo: number;
  jabatan: string;
  mergeRows: boolean;
  items: {
    item: PanitiaPengawasItem;
    subNo?: number;
  }[];
}

export const groupPanitiaForSusunanTable = (
  panitiaItems: PanitiaPengawasItem[]
): SusunanPanitiaTableRowGroup[] => {
  const groups: SusunanPanitiaTableRowGroup[] = [];
  let currentGroupNo = 0;

  for (let i = 0; i < panitiaItems.length; i++) {
    const item = panitiaItems[i];
    const jab = (item.jabatanKepanitiaan || 'Penyelenggara').trim();
    const isProktor = /^proktor\b/i.test(jab);

    const lastGroup = groups[groups.length - 1];

    // Check if Proktor group (Group 8 style: `8.` on first Proktor row, blank NO on subsequent Proktor rows, each row keeps its specific `Proktor R...` role)
    if (isProktor) {
      if (lastGroup && /^proktor\b/i.test(lastGroup.jabatan) && !lastGroup.mergeRows) {
        groups.push({
          groupNo: 0, // rendered as blank cell under 8.
          jabatan: jab,
          mergeRows: false,
          items: [{ item }]
        });
      } else {
        currentGroupNo++;
        groups.push({
          groupNo: currentGroupNo,
          jabatan: jab,
          mergeRows: false,
          items: [{ item }]
        });
      }
      continue;
    }

    // Consecutive identical jabatan (e.g., Penyelenggara x5, Sie Ruang x2, Pembantu Sie x2) merge into one numbered group with sub-numbers 1..N
    if (
      lastGroup &&
      !lastGroup.jabatan.toLowerCase().startsWith('proktor') &&
      lastGroup.jabatan.toLowerCase() === jab.toLowerCase()
    ) {
      lastGroup.mergeRows = true;
      if (lastGroup.items.length === 1) {
        lastGroup.items[0].subNo = 1;
      }
      lastGroup.items.push({
        item,
        subNo: lastGroup.items.length + 1
      });
    } else {
      currentGroupNo++;
      groups.push({
        groupNo: currentGroupNo,
        jabatan: jab,
        mergeRows: false,
        items: [{ item }]
      });
    }
  }

  return groups;
};
