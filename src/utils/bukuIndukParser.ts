import {
  BukuIndukEkskulItem,
  BukuIndukMapelRecord,
  BukuIndukSemesterScore,
  BukuIndukSiswaMeta,
  BukuIndukTahunMeta,
  Siswa
} from '../types';

const EXCEL_ERROR_TOKENS = new Set([
  '#REF!',
  '#N/A',
  '#VALUE!',
  '#NAME?',
  '#DIV/0!',
  '#NUM!',
  '#NULL!'
]);

export const sanitizeIndukField = (raw?: string | number | null): string => {
  if (raw === undefined || raw === null) return '';
  const str = String(raw).trim();
  if (!str) return '';
  const upper = str.toUpperCase();
  if (EXCEL_ERROR_TOKENS.has(upper)) return '';
  return str;
};

export const cleanIndukDisplay = (
  raw?: string | number | null,
  options?: { zeroIsEmpty?: boolean; fallback?: string }
): string => {
  const clean = sanitizeIndukField(raw);
  if (!clean) return options?.fallback ?? '-';
  if (options?.zeroIsEmpty && clean === '0') {
    return options?.fallback ?? '-';
  }
  return clean;
};

export const normalizeMapelMatchKey = (name: string): string =>
  name
    .toLowerCase()
    .replace(/pend\./g, 'pendidikan')
    .replace(/\(wajib\)|\(peminatan\)|\(lintas minat\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export interface ParsedBukuIndukSheetResult {
  siswaPatch: Partial<Siswa>;
  metaPatch: Partial<BukuIndukSiswaMeta>;
  matchedFieldCount: number;
  detectedKind: 'identitas' | 'nilai' | 'lengkap';
}

const isPredikatToken = (v: string): boolean => /^[A-D][+-]?$/i.test(v.trim());
const isNumericToken = (v: string): boolean => /^\d{1,3}([.,]\d+)?$/.test(v.trim());

/**
 * Mem-parsing teks hasil salin-tempel Lembar Nilai / Transkrip Buku Induk (Halaman 2: X, XI, XII + Ijazah + Sikap + Ekskul + Absensi)
 */
export const parseLembarNilaiBukuIndukText = (rawText: string): ParsedBukuIndukSheetResult => {
  const rawLines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
  const siswaPatch: Partial<Siswa> = {};
  const metaPatch: Partial<BukuIndukSiswaMeta> = {};
  let matchedFieldCount = 0;

  const transkripNilai: Record<string, BukuIndukMapelRecord> = {};
  const tahunMeta: {
    X: BukuIndukTahunMeta;
    XI: BukuIndukTahunMeta;
    XII: BukuIndukTahunMeta;
    ijazahTahun?: string;
    statusKelulusan?: 'Lulus' | 'Tidak Lulus' | '';
    lulusKelas?: string;
  } = {
    X: {},
    XI: {},
    XII: {}
  };
  const ekskulRecords: BukuIndukEkskulItem[] = [];

  let section: 'header' | 'mapel' | 'sikap' | 'ekskul' | 'organisasi' | 'absen' | 'status' | 'ttd' =
    'header';
  let currentKelompok = 'KELOMPOK A (UMUM)';

  rawLines.forEach(rawLine => {
    const trimmed = rawLine.trim();
    const cells = rawLine.split('\t').map(c => c.trim());

    // Header: NAMA PESERTA DIDIK / NIS / NISN / PROGRAM STUDI
    if (/NAMA PESERTA DIDIK\s*:/i.test(trimmed)) {
      const namaMatch = trimmed.match(/NAMA PESERTA DIDIK\s*:\s*([^\t:]+?)(?=\t|NIS\s*:|$)/i);
      if (namaMatch) {
        const cleanNama = sanitizeIndukField(namaMatch[1]);
        if (cleanNama) {
          siswaPatch.nama = cleanNama;
          matchedFieldCount++;
        }
      }
      const nisMatch = trimmed.match(/NIS\s*[:=]\s*([A-Z0-9-]+)/i);
      if (nisMatch) {
        siswaPatch.nis = nisMatch[1];
        siswaPatch.nipd = nisMatch[1];
        metaPatch.nomorBukuInduk = nisMatch[1];
        matchedFieldCount++;
      }
      const nisnMatch = trimmed.match(/NISN\s*[:=]\s*([A-Z0-9-]+)/i);
      if (nisnMatch) {
        siswaPatch.nisn = nisnMatch[1];
        matchedFieldCount++;
      }
      const prodiMatch = trimmed.match(/PROGRAM STUDI\s*:\s*([A-Za-z0-9\s./-]+)/i);
      if (prodiMatch) {
        const p = sanitizeIndukField(prodiMatch[1]);
        if (p) {
          metaPatch.programStudi = p;
          siswaPatch.jurusan = p;
          matchedFieldCount++;
        }
      }
      return;
    }

    // Tahun Pelajaran header
    if (/^Tahun Pelajaran/i.test(trimmed)) {
      const years = Array.from(trimmed.matchAll(/(\d{4}\s*\/\s*\d{4})/g)).map(m =>
        m[1].replace(/\s+/g, '')
      );
      if (years[0]) tahunMeta.X.tahunPelajaran = years[0];
      if (years[1]) tahunMeta.XI.tahunPelajaran = years[1];
      if (years[2]) tahunMeta.XII.tahunPelajaran = years[2];
      matchedFieldCount++;
      section = 'mapel';
      return;
    }

    if (/IJAZAH/i.test(trimmed) && /Tahun\s+\d{4}/i.test(trimmed)) {
      const ijMatch = trimmed.match(/(Tahun\s+\d{4})/i);
      if (ijMatch) tahunMeta.ijazahTahun = ijMatch[1];
      return;
    }

    // Section switchers
    if (/^NILAI SIKAP/i.test(trimmed)) {
      section = 'sikap';
      return;
    }
    if (/^PENGEMBANGAN DIRI/i.test(trimmed)) {
      section = 'ekskul';
      return;
    }
    if (/Kegiatan Ekstrakurikuler/i.test(trimmed)) {
      section = 'ekskul';
      return;
    }
    if (/Keikutsertaan Dalam Organisasi/i.test(trimmed)) {
      section = 'organisasi';
      return;
    }
    if (/KETIDAK\s*HADIRAN/i.test(trimmed)) {
      section = 'absen';
      return;
    }
    if (/STATUS AKHIR TAHUN/i.test(trimmed)) {
      section = 'status';
      // Also parse inline Naik ke Kelas tokens on this line
      const naikMatches = Array.from(
        trimmed.matchAll(/Naik ke\s+Kelas\s*:\s*([^\t]+)/gi)
      ).map(m => sanitizeIndukField(m[1]).replace(/\.{3,}/g, '').trim());
      if (naikMatches[0]) {
        tahunMeta.X.statusAkhir = 'Naik';
        tahunMeta.X.naikKeKelas = naikMatches[0];
      }
      if (naikMatches[1]) {
        tahunMeta.XI.statusAkhir = 'Naik';
        tahunMeta.XI.naikKeKelas = naikMatches[1];
      }
      if (naikMatches[2]) {
        tahunMeta.XII.statusAkhir = 'Naik';
        tahunMeta.XII.naikKeKelas = naikMatches[2];
      }
      if (/\bLulus\b/i.test(trimmed) && !/Tidak Lulus/i.test(trimmed)) {
        tahunMeta.statusKelulusan = 'Lulus';
      }
      matchedFieldCount++;
      return;
    }

    if (/Wali Kelas|Kepala Sekolah/i.test(trimmed)) {
      section = 'ttd';
      const waliLabels = Array.from(trimmed.matchAll(/(Wali Kelas[^\t]*)/gi)).map(m =>
        sanitizeIndukField(m[1])
      );
      if (waliLabels[0]) tahunMeta.X.waliKelasLabel = waliLabels[0];
      if (waliLabels[1]) tahunMeta.XI.waliKelasLabel = waliLabels[1];
      if (waliLabels[2]) tahunMeta.XII.waliKelasLabel = waliLabels[2];
      return;
    }

    if (section === 'status' && /Surabaya,|Juli\s+\d{4}|^\w+,\s+.*\d{4}/i.test(trimmed)) {
      section = 'ttd';
      const dateTokens = cells.map(c => sanitizeIndukField(c).replace(/\s+/g, ' ')).filter(Boolean);
      if (dateTokens[0]) tahunMeta.X.tanggalTtd = dateTokens[0];
      if (dateTokens[1]) tahunMeta.XI.tanggalTtd = dateTokens[1];
      if (dateTokens[2]) tahunMeta.XII.tanggalTtd = dateTokens[2];
      return;
    }

    // Group headers in grade table
    if (/^(KELOMPOK\s+[A-C]|LINTAS MINAT|MUATAN LOKAL)/i.test(trimmed)) {
      section = 'mapel';
      currentKelompok = trimmed.replace(/\s+/g, ' ');
      return;
    }

    // Subject rows (1., 2., ..., 16.)
    if (section === 'mapel') {
      if (/^(JUMLAH|RATA-RATA|No\.|Semester|Peng)/i.test(trimmed)) return;
      const numCell = cells[0]?.match(/^(\d{1,2})\.?$/);
      const inlineMatch = !numCell ? trimmed.match(/^(\d{1,2})\.\s*([^\t]+)(.*)$/) : null;

      let mapelName = '';
      let rawScoreCells: string[] = [];

      if (numCell && cells[1]) {
        mapelName = sanitizeIndukField(cells[1]);
        rawScoreCells = cells.slice(2);
      } else if (inlineMatch) {
        mapelName = sanitizeIndukField(inlineMatch[2]);
        rawScoreCells = inlineMatch[3] ? inlineMatch[3].split('\t').map(c => c.trim()) : [];
      } else {
        return;
      }

      if (!mapelName) return;

      // Deteksi offset kolom gabungan (1 sel kosong di depan bila diikuti angka KKM yang tidak diikuti predikat A-D)
      let aligned = [...rawScoreCells];
      if (
        aligned[0] === '' &&
        aligned[1] &&
        isNumericToken(aligned[1]) &&
        !isPredikatToken(aligned[2] || '')
      ) {
        aligned = aligned.slice(1);
      }

      // Setiap blok tahun ajaran terdiri dari 9 kolom: [KKM, S_a PengN, PengP, S_a KetN, KetP, S_b PengN, PengP, S_b KetN, KetP]
      const parseYearBlock = (block: string[]): { kkm?: string; sA: BukuIndukSemesterScore; sB: BukuIndukSemesterScore } => {
        const kkm = sanitizeIndukField(block[0]);
        const sA: BukuIndukSemesterScore = {
          kkm: kkm || undefined,
          pengN: sanitizeIndukField(block[1]) || undefined,
          pengP: sanitizeIndukField(block[2]) || undefined,
          ketN: sanitizeIndukField(block[3]) || undefined,
          ketP: sanitizeIndukField(block[4]) || undefined,
          nilaiAkhir: sanitizeIndukField(block[1]) || undefined,
          predikat: sanitizeIndukField(block[2]) || undefined
        };
        const sB: BukuIndukSemesterScore = {
          kkm: kkm || undefined,
          pengN: sanitizeIndukField(block[5]) || undefined,
          pengP: sanitizeIndukField(block[6]) || undefined,
          ketN: sanitizeIndukField(block[7]) || undefined,
          ketP: sanitizeIndukField(block[8]) || undefined,
          nilaiAkhir: sanitizeIndukField(block[5]) || undefined,
          predikat: sanitizeIndukField(block[6]) || undefined
        };
        return { kkm: kkm || undefined, sA, sB };
      };

      const blkX = parseYearBlock(aligned.slice(0, 9));
      const blkXI = parseYearBlock(aligned.slice(9, 18));
      const blkXII = parseYearBlock(aligned.slice(18, 27));
      const ijazahSlice = aligned.slice(27);

      const mapelSlug = `${currentKelompok.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${normalizeMapelMatchKey(mapelName).replace(/\s+/g, '-')}`;
      transkripNilai[mapelSlug] = {
        mapelKey: mapelSlug,
        namaMapel: mapelName,
        kelompok: currentKelompok,
        kkm: blkX.kkm || blkXI.kkm || blkXII.kkm,
        semesters: {
          S1: blkX.sA,
          S2: blkX.sB,
          S3: blkXI.sA,
          S4: blkXI.sB,
          S5: blkXII.sA,
          S6: blkXII.sB
        },
        rataRapor: sanitizeIndukField(ijazahSlice[0]) || undefined,
        nilaiUs: sanitizeIndukField(ijazahSlice[1]) || undefined,
        nilaiIjazah: sanitizeIndukField(ijazahSlice[2]) || undefined
      };
      matchedFieldCount++;
      return;
    }

    if (section === 'sikap') {
      const vals = cells
        .map(c => sanitizeIndukField(c))
        .filter(c => Boolean(c) && !/^[12]\.\s*(Spiritual|Sosial)$/i.test(c));
      if (/spiritual/i.test(trimmed) && vals.length > 0) {
        tahunMeta.X.sikapSpiritual = vals[0];
        if (vals[1]) tahunMeta.XI.sikapSpiritual = vals[1];
        if (vals[2]) tahunMeta.XII.sikapSpiritual = vals[2];
        matchedFieldCount++;
      } else if (/sosial/i.test(trimmed) && vals.length > 0) {
        tahunMeta.X.sikapSosial = vals[0];
        if (vals[1]) tahunMeta.XI.sikapSosial = vals[1];
        if (vals[2]) tahunMeta.XII.sikapSosial = vals[2];
        matchedFieldCount++;
      }
      return;
    }

    if (section === 'ekskul') {
      const exMatch = trimmed.match(/^\d+\.\s*(.+)$/);
      if (exMatch) {
        const nonEmpty = cells.map(c => sanitizeIndukField(c)).filter(Boolean);
        const titleRaw = nonEmpty[0]?.replace(/^\d+\.\s*/, '').trim() || '';
        if (titleRaw) {
          const preds = nonEmpty.slice(1);
          ekskulRecords.push({
            nama: titleRaw,
            x: preds[0] || undefined,
            xi: preds[1] || undefined,
            xii: preds[2] || undefined
          });
          matchedFieldCount++;
        }
      }
      return;
    }

    if (section === 'absen') {
      const cleanDays = (s: string) => {
        const c = sanitizeIndukField(s).replace(/hari/gi, '').trim();
        return c === '-' ? '0' : c;
      };
      const nonEmpty = cells.map(c => sanitizeIndukField(c)).filter(Boolean);
      const vals = nonEmpty.slice(1).map(cleanDays);
      if (/1\.\s*Sakit/i.test(trimmed)) {
        if (vals[0] !== undefined) tahunMeta.X.sakit = vals[0];
        if (vals[1] !== undefined) tahunMeta.XI.sakit = vals[1];
        if (vals[2] !== undefined) tahunMeta.XII.sakit = vals[2];
        matchedFieldCount++;
      } else if (/2\.\s*Ijin/i.test(trimmed)) {
        if (vals[0] !== undefined) tahunMeta.X.ijin = vals[0];
        if (vals[1] !== undefined) tahunMeta.XI.ijin = vals[1];
        if (vals[2] !== undefined) tahunMeta.XII.ijin = vals[2];
        matchedFieldCount++;
      } else if (/3\.\s*Tanpa Keterangan/i.test(trimmed)) {
        if (vals[0] !== undefined) tahunMeta.X.alpha = vals[0];
        if (vals[1] !== undefined) tahunMeta.XI.alpha = vals[1];
        if (vals[2] !== undefined) tahunMeta.XII.alpha = vals[2];
        matchedFieldCount++;
      }
      return;
    }

    if (section === 'ttd') {
      if (/NIP\./i.test(trimmed)) {
        const nips = cells.map(c => sanitizeIndukField(c)).filter(Boolean);
        // Clean #N/A automatically
        if (nips[0] && !/NIP\./i.test(nips[0])) {
          tahunMeta.X.waliKelasNip = nips[0];
        }
      } else {
        const names = cells.map(c => sanitizeIndukField(c)).filter(Boolean);
        // Ignore pure #N/A lines; only keep real wali names
        if (names.length >= 1 && !/^(XII|XI|X)[-_]/i.test(names[0])) {
          if (names.length === 1) {
            // Usually only Kepala Sekolah present if all wali cells were #N/A
          } else {
            tahunMeta.X.waliKelasNama = names[0];
            if (names[1]) tahunMeta.XI.waliKelasNama = names[1];
            if (names[2]) tahunMeta.XII.waliKelasNama = names[2];
          }
        }
      }
    }
  });

  if (Object.keys(transkripNilai).length > 0) {
    metaPatch.transkripNilai = transkripNilai;
  }
  if (
    tahunMeta.X.tahunPelajaran ||
    tahunMeta.XI.tahunPelajaran ||
    tahunMeta.XII.tahunPelajaran ||
    tahunMeta.X.sakit !== undefined ||
    tahunMeta.X.naikKeKelas
  ) {
    metaPatch.tahunAjaranMeta = tahunMeta;
  }
  if (ekskulRecords.length > 0) {
    metaPatch.ekskulRecords = ekskulRecords;
  }

  return {
    siswaPatch,
    metaPatch,
    matchedFieldCount,
    detectedKind: 'nilai'
  };
};

/**
 * Mem-parsing teks hasil salin-tempel lembar Buku Induk Peserta Didik SMA.
 * Mendukung otomatis:
 *  - Halaman 1: Format 2 kolom A–J (butir 1–57)
 *  - Halaman 2: Lembar Nilai X–XII (K-13 / Kurikulum Merdeka), Sikap, Ekskul, Absensi & Status
 * sekaligus membersihkan error Excel seperti #REF!, #N/A, atau nilai 0 kosong.
 */
export const parseLembarBukuIndukText = (rawText: string): ParsedBukuIndukSheetResult => {
  const hasPage2 =
    /NAMA PESERTA DIDIK\s*:/i.test(rawText) ||
    /KELOMPOK\s+A\s*\(/i.test(rawText) ||
    /PENGEMBANGAN DIRI/i.test(rawText) ||
    /STATUS AKHIR TAHUN/i.test(rawText);

  const hasPage1 =
    /LEMBAR BUKU INDUK/i.test(rawText) ||
    /KETERANGAN TENTANG.*PESERTA DIDIK/i.test(rawText) ||
    /\b23\s*\.\s*Nama\b/i.test(rawText);

  if (hasPage2 && !hasPage1) {
    return parseLembarNilaiBukuIndukText(rawText);
  }

  // Jangan trim leading tabs dulu karena kolom kanan bisa punya indent tab di awal baris
  const rawLines = rawText
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0);

  const siswaPatch: Partial<Siswa> = {};
  const metaPatch: Partial<BukuIndukSiswaMeta> = {};
  let matchedFieldCount = 0;

  const takeValue = (raw?: string, zeroIsEmpty = false): string => {
    const s = sanitizeIndukField(raw);
    if (!s) return '';
    if (zeroIsEmpty && s === '0') return '';
    return s;
  };

  // Header line extraction (NIS / NISN / Kode Urut / Kelas)
  rawLines.forEach(rawLine => {
    const line = rawLine.trim();
    if (/LEMBAR BUKU INDUK/i.test(line)) {
      const numMatch = line.match(/(\d{1,6})\s*$/);
      if (numMatch) {
        metaPatch.nomorUrutInduk = numMatch[1];
        matchedFieldCount++;
      }
    }
    const nisMatch = line.match(/NIS\s*[:=]\s*([A-Z0-9-]+)/i);
    if (nisMatch) {
      siswaPatch.nis = nisMatch[1];
      siswaPatch.nipd = nisMatch[1];
      metaPatch.nomorBukuInduk = nisMatch[1];
      matchedFieldCount++;
    }
    const nisnMatch = line.match(/NISN\s*[:=]\s*([A-Z0-9-]+)/i);
    if (nisnMatch) {
      siswaPatch.nisn = nisnMatch[1];
      matchedFieldCount++;
    }
    const kelasHeaderMatch = line.match(/\b(X|XI|XII)[-\s_.]+([A-Z0-9.]+)\b/);
    if (kelasHeaderMatch && line.length < 40) {
      const k = `${kelasHeaderMatch[1]}-${kelasHeaderMatch[2]}`;
      siswaPatch.kelas = k;
      siswaPatch.rombelSaatIni = k;
      matchedFieldCount++;
    }
  });

  // Track active groups/sections across lines
  let leftParentNum: 20 | 21 | 22 | null = null;
  let rightParentNum: 54 | 55 | null = null;
  let rightSection: 'E' | 'F' | 'G' | 'H' | 'I' | 'J' = 'E';

  const splitBoundaryRegex =
    /(?=(?:^|\t|\s{2,})(?:(?:\d{1,2}\s*\.\s*[A-Za-z])|(?:[a-d]\s*\.\s*[A-Za-z])|(?:[A-J]\s*\.\s*[A-Z]{2,})))/g;

  const extractColonValue = (afterColon: string, multiCellJoin = false): string => {
    if (!afterColon) return '';
    if (afterColon.includes('\t')) {
      const normalized = afterColon.replace(/^\t/, '');
      const cells = normalized.split('\t');
      if (multiCellJoin) {
        const vals = cells
          .slice(0, 2)
          .map(c => sanitizeIndukField(c))
          .filter(Boolean);
        return vals.join(' / ');
      }
      return sanitizeIndukField(cells[0]);
    }
    return sanitizeIndukField(afterColon);
  };

  rawLines.forEach(rawLine => {
    const trimmedStartOffset = rawLine.search(/\S/);
    const chunks: Array<{ text: string; offset: number }> = [];

    const matches = Array.from(rawLine.matchAll(splitBoundaryRegex));
    const boundaries = matches
      .map(m => {
        const idx = m.index ?? 0;
        const wsLen = rawLine.slice(idx).match(/^[\t ]+/)?.[0]?.length ?? 0;
        return idx + wsLen;
      })
      .filter((pos, i, arr) => pos < rawLine.length && (i === 0 || pos > arr[i - 1]));

    if (boundaries.length === 0) {
      chunks.push({ text: rawLine.trim(), offset: Math.max(0, trimmedStartOffset) });
    } else {
      if (boundaries[0] > 0) {
        const prefix = rawLine.slice(0, boundaries[0]).trim();
        if (prefix) chunks.push({ text: prefix, offset: Math.max(0, trimmedStartOffset) });
      }
      for (let i = 0; i < boundaries.length; i++) {
        const start = boundaries[i];
        const end = i + 1 < boundaries.length ? boundaries[i + 1] : rawLine.length;
        const slice = rawLine.slice(start, end).trim();
        if (slice) chunks.push({ text: slice, offset: start });
      }
    }

    chunks.forEach(({ text, offset }) => {
      const secMatch = text.match(/^([A-J])\s*\.\s*([A-Z\s/]+)/);
      if (secMatch) {
        const secLetter = secMatch[1];
        if (
          secLetter === 'E' ||
          secLetter === 'F' ||
          secLetter === 'G' ||
          secLetter === 'H' ||
          secLetter === 'I' ||
          secLetter === 'J'
        ) {
          rightSection = secLetter;
        }
        return;
      }

      const headerOnlyMatch = text.match(/^(\d{1,2})\s*\.\s*([^:]+)$/);
      if (headerOnlyMatch) {
        const hNum = parseInt(headerOnlyMatch[1], 10);
        if (hNum === 20 || hNum === 21 || hNum === 22) leftParentNum = hNum;
        if (hNum === 54 || hNum === 55) rightParentNum = hNum;
        return;
      }

      const colonIdx = text.indexOf(':');
      if (colonIdx === -1) return;

      const leftPart = text.slice(0, colonIdx).trim();
      const afterColonRaw = text.slice(colonIdx + 1);

      let num: number | null = null;
      let subLetter: string | null = null;
      let labelRaw = leftPart;

      const numMarker = leftPart.match(/^(\d{1,2})\s*\.\s*(.+)$/);
      const subMarker = leftPart.match(/^([a-d])\s*\.\s*(.+)$/i);
      if (numMarker) {
        num = parseInt(numMarker[1], 10);
        labelRaw = numMarker[2].trim();
      } else if (subMarker) {
        subLetter = subMarker[1].toLowerCase();
        labelRaw = subMarker[2].trim();
      }

      const label = labelRaw.toLowerCase();
      const val = extractColonValue(afterColonRaw, num === 19);

      if (num === 1 || /nama lengkap peserta didik/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.nama = v;
          matchedFieldCount++;
        }
      } else if (/nama panggilan/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          metaPatch.namaPanggilan = v;
          matchedFieldCount++;
        }
      } else if (num === 2 || /jenis kelamin/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.jenisKelamin = /^p/i.test(v) ? 'P' : 'L';
          matchedFieldCount++;
        }
      } else if (num === 3) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.tempatTanggalLahir = v;
          const parts = v.split(',');
          if (parts.length >= 2) {
            siswaPatch.tempatLahir = parts[0].trim();
            siswaPatch.tanggalLahir = parts.slice(1).join(',').trim();
          }
          matchedFieldCount++;
        }
      } else if (num === 4) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.agama = v;
          matchedFieldCount++;
        }
      } else if (num === 5) {
        const v = takeValue(val);
        if (v) {
          metaPatch.kewarganegaraan = v;
          matchedFieldCount++;
        }
      } else if (num === 6) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.anakKe = v;
          matchedFieldCount++;
        }
      } else if (num === 7) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.jmlSaudaraKandung = v;
          matchedFieldCount++;
        }
      } else if (num === 8) {
        const v = takeValue(val);
        if (v) {
          metaPatch.jumlahSaudaraTiri = v;
          matchedFieldCount++;
        }
      } else if (num === 9) {
        const v = takeValue(val);
        if (v) {
          metaPatch.jumlahSaudaraAngkat = v;
          matchedFieldCount++;
        }
      } else if (num === 10) {
        const v = takeValue(val);
        if (v) {
          metaPatch.statusYatimPiatu = v;
          matchedFieldCount++;
        }
      } else if (num === 11) {
        const v = takeValue(val);
        if (v) {
          metaPatch.bahasaRumah = v;
          matchedFieldCount++;
        }
      } else if (num === 12) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.alamat = v;
          matchedFieldCount++;
        }
      } else if (num === 13) {
        const v = takeValue(val);
        if (v) {
          const parts = v.split('/').map(x => x.trim());
          if (parts[0] && parts[0] !== '-') siswaPatch.telepon = parts[0];
          if (parts[1]) siswaPatch.hp = parts[1];
          else siswaPatch.hp = v;
          matchedFieldCount++;
        }
      } else if (/di asrama|kost|tinggal dengan/i.test(label) || num === 14) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.jenisTinggal = v;
          matchedFieldCount++;
        }
      } else if (num === 15) {
        const v = takeValue(val);
        if (v) {
          siswaPatch.jarakSekolah = v;
          matchedFieldCount++;
        }
      } else if (num === 16) {
        const v = takeValue(val);
        if (v) {
          metaPatch.golonganDarah = v;
          matchedFieldCount++;
        }
      } else if (num === 17) {
        const v = takeValue(val);
        if (v) {
          metaPatch.penyakitPernahDiderita = v;
          matchedFieldCount++;
        }
      } else if (num === 18) {
        const v = takeValue(val);
        if (v) {
          metaPatch.kelainanJasmani = v;
          matchedFieldCount++;
        }
      } else if (num === 19) {
        const v = takeValue(val);
        if (v) {
          metaPatch.tinggiBeratSaatDiterima = v;
          matchedFieldCount++;
        }
      } else if (/tamatan dari/i.test(label)) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.tamatanDari = v;
          matchedFieldCount++;
        }
      } else if (/tanggal dan nomor ijazah/i.test(label)) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.tglNoIjazahSebelumnya = v;
          matchedFieldCount++;
        }
      } else if (/tanggal dan nomor sttl/i.test(label)) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.tglNoSttlSebelumnya = v;
          matchedFieldCount++;
        }
      } else if (/lama belajar/i.test(label)) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.lamaBelajarSebelumnya = v;
          matchedFieldCount++;
        }
      } else if (/dari sekolah/i.test(label)) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.pindahanDariSekolah = v;
          matchedFieldCount++;
        }
      } else if (/alasan/i.test(label)) {
        const v = takeValue(val, true);
        if (v) {
          if (rightSection === 'I' || rightParentNum === 54 || offset > 45) {
            metaPatch.alasanKeluarMutasi = v;
          } else {
            metaPatch.alasanPindahan = v;
          }
          matchedFieldCount++;
        }
      } else if (/di kelas/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          metaPatch.diterimaDiKelas = v;
          matchedFieldCount++;
        }
      } else if (/kelompok/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          metaPatch.diterimaKelompok = v;
          matchedFieldCount++;
        }
      } else if (subLetter === 'c' && leftParentNum === 22 && label === 'tanggal') {
        const v = takeValue(val);
        if (v) {
          metaPatch.tanggalDiterima = v;
          matchedFieldCount++;
        }
      } else if (/tanggal meninggalkan sekolah/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          metaPatch.tanggalKeluarMutasi = v;
          matchedFieldCount++;
        }
      } else if (/tamat belajar/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          metaPatch.tamatBelajarLulus = v;
          matchedFieldCount++;
        }
      } else if (subLetter === 'b' && /ijazah/i.test(label) && !/sebelum/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          metaPatch.noIjazahAkhir = v;
          matchedFieldCount++;
        }
      } else if (/nomor surat tanda lulus/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          metaPatch.noSuratTandaLulus = v;
          matchedFieldCount++;
        }
      } else if (/nilai rata-rata/i.test(label)) {
        const v = takeValue(val);
        if (v) {
          metaPatch.nilaiRataRataAkhir = v;
          matchedFieldCount++;
        }
      } else if (num === 23) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.namaAyah = v;
          matchedFieldCount++;
        }
      } else if (num === 24) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.ayahTtl = v;
          matchedFieldCount++;
        }
      } else if (num === 25) {
        const v = takeValue(val);
        if (v) {
          metaPatch.ayahAgama = v;
          matchedFieldCount++;
        }
      } else if (num === 26) {
        const v = takeValue(val);
        if (v) {
          metaPatch.ayahWargaNegara = v;
          matchedFieldCount++;
        }
      } else if (num === 27) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.jenjangPendidikanAyah = v;
          matchedFieldCount++;
        }
      } else if (num === 28) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.pekerjaanAyah = v;
          matchedFieldCount++;
        }
      } else if (num === 29) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.penghasilanAyah = v;
          matchedFieldCount++;
        }
      } else if (num === 30) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.ayahAlamatTelp = v;
          matchedFieldCount++;
        }
      } else if (num === 31) {
        const v = takeValue(val);
        if (v) {
          metaPatch.ayahStatusHidup = v;
          matchedFieldCount++;
        }
      } else if (num === 32) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.namaIbu = v;
          matchedFieldCount++;
        }
      } else if (num === 33) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.ibuTtl = v;
          matchedFieldCount++;
        }
      } else if (num === 34) {
        const v = takeValue(val);
        if (v) {
          metaPatch.ibuAgama = v;
          matchedFieldCount++;
        }
      } else if (num === 35) {
        const v = takeValue(val);
        if (v) {
          metaPatch.ibuWargaNegara = v;
          matchedFieldCount++;
        }
      } else if (num === 36) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.jenjangPendidikanIbu = v;
          matchedFieldCount++;
        }
      } else if (num === 37) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.pekerjaanIbu = v;
          matchedFieldCount++;
        }
      } else if (num === 38) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.penghasilanIbu = v;
          matchedFieldCount++;
        }
      } else if (num === 39) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.ibuAlamatTelp = v;
          matchedFieldCount++;
        }
      } else if (num === 40) {
        const v = takeValue(val);
        if (v) {
          metaPatch.ibuStatusHidup = v;
          matchedFieldCount++;
        }
      } else if (num === 41) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.namaWali = v;
          matchedFieldCount++;
        }
      } else if (num === 42) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.waliTtl = v;
          matchedFieldCount++;
        }
      } else if (num === 43) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.waliAgama = v;
          matchedFieldCount++;
        }
      } else if (num === 44) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.waliWargaNegara = v;
          matchedFieldCount++;
        }
      } else if (num === 45) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.jenjangPendidikanWali = v;
          matchedFieldCount++;
        }
      } else if (num === 46) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.pekerjaanWali = v;
          matchedFieldCount++;
        }
      } else if (num === 47) {
        const v = takeValue(val, true);
        if (v) {
          siswaPatch.penghasilanWali = v;
          matchedFieldCount++;
        }
      } else if (num === 48) {
        const v = takeValue(val, true);
        if (v) {
          metaPatch.waliAlamatTelp = v;
          matchedFieldCount++;
        }
      } else if (num === 49) {
        const v = takeValue(val);
        if (v) {
          metaPatch.kegemaranKesenian = v;
          matchedFieldCount++;
        }
      } else if (num === 50) {
        const v = takeValue(val);
        if (v) {
          metaPatch.kegemaranOlahraga = v;
          matchedFieldCount++;
        }
      } else if (num === 51) {
        const v = takeValue(val);
        if (v) {
          metaPatch.kegemaranOrganisasi = v;
          matchedFieldCount++;
        }
      } else if (num === 52) {
        const v = takeValue(val);
        if (v) {
          metaPatch.kegemaranLain = v;
          matchedFieldCount++;
        }
      } else if (num === 53) {
        const v = takeValue(val);
        if (v) {
          metaPatch.menerimaBeasiswa = v;
          matchedFieldCount++;
        }
      } else if (num === 56) {
        const v = takeValue(val);
        if (v) {
          metaPatch.akanMelanjutkanKe = v;
          matchedFieldCount++;
        }
      } else if (num === 57) {
        const v = takeValue(val);
        if (v) {
          metaPatch.akanBekerjaDi = v;
          matchedFieldCount++;
        }
      }
    });
  });

  if (hasPage2) {
    const p2 = parseLembarNilaiBukuIndukText(rawText);
    return {
      siswaPatch: { ...p2.siswaPatch, ...siswaPatch },
      metaPatch: { ...p2.metaPatch, ...metaPatch },
      matchedFieldCount: matchedFieldCount + p2.matchedFieldCount,
      detectedKind: 'lengkap'
    };
  }

  return {
    siswaPatch,
    metaPatch,
    matchedFieldCount,
    detectedKind: 'identitas'
  };
};
