import {
  JadwalPengawasSlot,
  JadwalUjianItem,
  KartuUjianSettings,
  PanitiaPengawasItem,
  Siswa,
  TempelRuangConfigBundle,
  TempelRuangItem,
  TempelRuangKelompok,
  TempelRuangTingkat
} from '../types';
const extractSessionBaseName = (sesi: string): string =>
  (sesi || '').replace(/\([^)]*\)/g, '').trim().toLowerCase();

const resolveEffectiveSiswaSesi = (
  siswa: Pick<Siswa, 'sesiUjian'>,
  sesiTersedia: string[]
): string => {
  const explicit = (siswa.sesiUjian || '').trim();
  if (explicit) return explicit;
  return sesiTersedia[0] || 'Sesi 1';
};

const resolveAwalNopes10Digit = (raw?: string): string => {
  const clean = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '2627101001';
  if (clean.length === 10) return clean;
  if (clean.length > 10) return clean.slice(0, 7) + clean.slice(-3);
  return `${clean}${'1'.padStart(10 - clean.length, '0')}`;
};

const sanitizeNomorUjian10Digit = (raw: string, padTo10 = false): string => {
  const clean = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return '';
  if (clean.length > 10) return clean.slice(0, 7) + clean.slice(-3);
  if (padTo10 && clean.length < 10) return clean.padStart(10, '0');
  return clean;
};

const formatNomorUjian10Digit = (awalNopes: string, indexZeroBased: number): string => {
  const baseStr = resolveAwalNopes10Digit(awalNopes);
  const offset = Math.max(0, Math.floor(indexZeroBased));
  const trailingMatch = baseStr.match(/^(.*?)(\d+)$/);

  if (trailingMatch) {
    const [, head, numStr] = trailingMatch;
    const nextNum = BigInt(numStr) + BigInt(offset);
    const nextStr = nextNum.toString().padStart(numStr.length, '0');
    const headKeep = Math.max(0, 10 - nextStr.length);
    return `${head.slice(0, headKeep)}${nextStr}`.slice(-10).padStart(10, '0');
  }

  const seqWidth = Math.max(3, String(offset + 1).length);
  const seqStr = String(offset + 1).padStart(seqWidth, '0');
  return `${baseStr.slice(0, Math.max(0, 10 - seqStr.length))}${seqStr}`.slice(0, 10);
};

export const extractTingkatFromKelas = (kelas?: string): 'X' | 'XI' | 'XII' | null => {
  const clean = (kelas || '').trim().toUpperCase();
  if (/^XII(\b|[-_\s/]|$)/.test(clean) || /^12(\b|[-_\s/])/.test(clean)) return 'XII';
  if (/^XI(\b|[-_\s/]|$)/.test(clean) || /^11(\b|[-_\s/])/.test(clean)) return 'XI';
  if (/^X(\b|[-_\s/]|$)/.test(clean) || /^10(\b|[-_\s/])/.test(clean)) return 'X';
  return null;
};

export const extractRoomOrderNumber = (ruang: string): number => {
  const clean = (ruang || '').trim().toUpperCase();
  if (/LABKOM/.test(clean)) return 9000 + (parseInt(clean.match(/\d+/)?.[0] || '0', 10) || 0);
  if (/ABM/.test(clean)) return 9500 + (parseInt(clean.match(/\d+/)?.[0] || '0', 10) || 0);
  const m = clean.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 9999;
};

export const normalizeRoomLookupKey = (rawRoom?: string): string => {
  const clean = (rawRoom || '').trim().toUpperCase();
  if (!clean) return '';
  if (/^CAD/.test(clean)) return clean.replace(/\s+/g, '');
  if (/LABKOM/.test(clean)) {
    const num = clean.match(/\d+/)?.[0];
    return num ? `LABKOM${num}` : 'LABKOM';
  }
  if (/ABM/.test(clean)) {
    const num = clean.match(/\d+/)?.[0];
    return num ? `ABM${num}` : 'ABM';
  }
  const numMatch = clean.match(/^(?:R\.?|RUANG\s*)?0*(\d+)$/i) || clean.match(/0*(\d+)$/);
  if (numMatch) {
    return `NUM_${parseInt(numMatch[1], 10)}`;
  }
  return clean.replace(/[^A-Z0-9]/g, '');
};

export const formatRoomDisplayLabel = (rawRoom: string, defaultPrefix = 'R.'): string => {
  const clean = (rawRoom || '').trim();
  if (!clean) return `${defaultPrefix}01`;
  if (/^ruang/i.test(clean)) return clean.toUpperCase();
  if (/^(labkom|abm)/i.test(clean)) return clean.toUpperCase();
  const stripped = clean.replace(/^R\.?\s*/i, '');
  if (/^\d+$/.test(stripped)) {
    return `RUANG ${stripped.padStart(2, '0')}`;
  }
  return `RUANG ${stripped.toUpperCase()}`;
};

export interface MatchedStudentAssignment {
  nomorUjian: string;
  ruangUjian: string;
  sesiUjian: string;
  isProjected: boolean;
}

export interface MatchedExamRoomBucket {
  nomorRuang: string;
  labelUtama: string;
  tingkatKelas: TempelRuangTingkat;
  kelasRombel: string;
  jumlahPeserta: number;
  rentangNomorPeserta: string;
  sesiUjian: string;
  students: Siswa[];
  isProjected: boolean;
}

export interface MatchedDistributionResult {
  studentMap: Map<string, MatchedStudentAssignment>;
  rooms: MatchedExamRoomBucket[];
  totalActiveStudents: number;
  savedRoomStudentCount: number;
  isMostlyProjected: boolean;
}

/**
 * Menghitung distribusi ruang ujian & nomor peserta siswa agar 100% cocok
 * dengan setting di Kartu Peserta Ulangan (`modePembagianRuang`, `kapasitasPerRuang`,
 * `mulaiNomorRuang`, `defaultRuangPrefix`, `sesiTersedia`, `nomorPesertaAwal`),
 * baik dari data yang sudah tersimpan di master siswa maupun proyeksi otomatis jika belum dibagi.
 */
export const computeMatchedRoomDistribution = (
  siswaList: Siswa[],
  ujianSettings: KartuUjianSettings,
  options?: { forceProjectFromSettings?: boolean }
): MatchedDistributionResult => {
  const activeSiswa = siswaList.filter(s => s.status === 'Aktif' || !s.status);
  const sessions =
    ujianSettings.sesiTersedia && ujianSettings.sesiTersedia.length > 0
      ? ujianSettings.sesiTersedia
      : ['Sesi 1 (07.30 - 09.30)'];
  const cap = Math.max(1, ujianSettings.kapasitasPerRuang || 20);
  const startRoom = Math.max(1, ujianSettings.mulaiNomorRuang || 1);
  const prefixRuang = ujianSettings.defaultRuangPrefix ?? 'R.';
  const mode = ujianSettings.modePembagianRuang || 'sequential';
  const baseAwalNopes = resolveAwalNopes10Digit(
    ujianSettings.nomorPesertaAwal || ujianSettings.prefixNomorUjian
  );

  // Order identically to KartuUjianView.assignParticipants
  const ordered = [...activeSiswa].sort((a, b) => {
    const ka = (a.rombelSaatIni || a.kelas || '').localeCompare(b.rombelSaatIni || b.kelas || '');
    if (ka !== 0) return ka;
    return a.nama.localeCompare(b.nama);
  });

  const savedRoomStudentCount = ordered.filter(s => Boolean((s.ruangUjian || '').trim())).length;
  const forceProject = Boolean(options?.forceProjectFromSettings);
  const useSavedWhereAvailable = !forceProject && savedRoomStudentCount > 0;

  const studentMap = new Map<string, MatchedStudentAssignment>();

  if (useSavedWhereAvailable && savedRoomStudentCount === ordered.length) {
    // 100% saved on students — use exact saved values
    ordered.forEach((s, idx) => {
      const existingNopes = s.nomorUjian?.trim()
        ? sanitizeNomorUjian10Digit(s.nomorUjian, true)
        : formatNomorUjian10Digit(baseAwalNopes, idx);
      studentMap.set(s.id, {
        nomorUjian: existingNopes,
        ruangUjian: s.ruangUjian!.trim(),
        sesiUjian: resolveEffectiveSiswaSesi(s, sessions),
        isProjected: false
      });
    });
  } else {
    // Project using exact KartuUjianView algorithm (respecting partial saved if !forceProject)
    if (mode === 'per_sesi') {
      const sesiCounters = new Map<string, number>();
      ordered.forEach((s, idx) => {
        const sesi =
          !forceProject && s.sesiUjian?.trim()
            ? s.sesiUjian.trim()
            : sessions[idx % sessions.length];
        const posInSesi = sesiCounters.get(sesi) || 0;
        sesiCounters.set(sesi, posInSesi + 1);
        const roomNumber = startRoom + Math.floor(posInSesi / cap);
        const projectedRoom = `${prefixRuang}${String(roomNumber).padStart(2, '0')}`;
        const existingClean =
          !forceProject && s.nomorUjian?.trim()
            ? sanitizeNomorUjian10Digit(s.nomorUjian, true)
            : '';

        studentMap.set(s.id, {
          nomorUjian: existingClean || formatNomorUjian10Digit(baseAwalNopes, idx),
          ruangUjian:
            useSavedWhereAvailable && s.ruangUjian?.trim() ? s.ruangUjian.trim() : projectedRoom,
          sesiUjian: sesi,
          isProjected: !(useSavedWhereAvailable && s.ruangUjian?.trim())
        });
      });
    } else if (mode === 'per_kelas') {
      let currentRoomCursor = startRoom;
      let lastClass = '';
      let posInClass = 0;

      ordered.forEach((s, idx) => {
        const kelas = s.rombelSaatIni || s.kelas || 'Umum';
        if (idx > 0 && kelas !== lastClass) {
          currentRoomCursor += Math.floor((posInClass - 1) / cap) + 1;
          posInClass = 0;
        }
        lastClass = kelas;
        const roomNumber = currentRoomCursor + Math.floor(posInClass / cap);
        posInClass++;
        const projectedRoom = `${prefixRuang}${String(roomNumber).padStart(2, '0')}`;
        const existingClean =
          !forceProject && s.nomorUjian?.trim()
            ? sanitizeNomorUjian10Digit(s.nomorUjian, true)
            : '';

        studentMap.set(s.id, {
          nomorUjian: existingClean || formatNomorUjian10Digit(baseAwalNopes, idx),
          ruangUjian:
            useSavedWhereAvailable && s.ruangUjian?.trim() ? s.ruangUjian.trim() : projectedRoom,
          sesiUjian: !forceProject && s.sesiUjian?.trim() ? s.sesiUjian.trim() : sessions[0],
          isProjected: !(useSavedWhereAvailable && s.ruangUjian?.trim())
        });
      });
    } else {
      // 'sequential'
      ordered.forEach((s, idx) => {
        const roomNumber = startRoom + Math.floor(idx / cap);
        const projectedRoom = `${prefixRuang}${String(roomNumber).padStart(2, '0')}`;
        const existingClean =
          !forceProject && s.nomorUjian?.trim()
            ? sanitizeNomorUjian10Digit(s.nomorUjian, true)
            : '';

        studentMap.set(s.id, {
          nomorUjian: existingClean || formatNomorUjian10Digit(baseAwalNopes, idx),
          ruangUjian:
            useSavedWhereAvailable && s.ruangUjian?.trim() ? s.ruangUjian.trim() : projectedRoom,
          sesiUjian: !forceProject && s.sesiUjian?.trim() ? s.sesiUjian.trim() : sessions[0],
          isProjected: !(useSavedWhereAvailable && s.ruangUjian?.trim())
        });
      });
    }
  }

  // Group into rooms
  const bucketMap = new Map<
    string,
    {
      ruang: string;
      tingkatCounts: Record<'X' | 'XI' | 'XII', number>;
      kelasSet: Set<string>;
      nopesList: string[];
      sesiSet: Set<string>;
      students: Siswa[];
      projectedCount: number;
    }
  >();

  ordered.forEach(s => {
    const assigned = studentMap.get(s.id);
    if (!assigned) return;
    const rawRuang = assigned.ruangUjian;
    const key = rawRuang.toUpperCase();
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        ruang: rawRuang,
        tingkatCounts: { X: 0, XI: 0, XII: 0 },
        kelasSet: new Set<string>(),
        nopesList: [],
        sesiSet: new Set<string>(),
        students: [],
        projectedCount: 0
      });
    }
    const bucket = bucketMap.get(key)!;
    bucket.students.push({
      ...s,
      nomorUjian: assigned.nomorUjian,
      ruangUjian: assigned.ruangUjian,
      sesiUjian: assigned.sesiUjian
    });
    if (assigned.isProjected) bucket.projectedCount += 1;
    const t = extractTingkatFromKelas(s.rombelSaatIni || s.kelas);
    if (t) bucket.tingkatCounts[t] += 1;
    const kVal = (s.rombelSaatIni || s.kelas || '').trim();
    if (kVal) bucket.kelasSet.add(kVal);
    if (assigned.nomorUjian) bucket.nopesList.push(assigned.nomorUjian);
    if (assigned.sesiUjian) bucket.sesiSet.add(assigned.sesiUjian);
  });

  const sortedBuckets = Array.from(bucketMap.values()).sort(
    (a, b) =>
      extractRoomOrderNumber(a.ruang) - extractRoomOrderNumber(b.ruang) ||
      a.ruang.localeCompare(b.ruang)
  );

  const rooms: MatchedExamRoomBucket[] = sortedBuckets.map(b => {
    const nonZero = (['X', 'XI', 'XII'] as const).filter(lv => b.tingkatCounts[lv] > 0);
    let tingkatKelas: TempelRuangTingkat = 'X';
    if (nonZero.length > 1) {
      tingkatKelas = 'Gabungan';
    } else if (nonZero.length === 1) {
      tingkatKelas = nonZero[0];
    }

    const sortedNopes = [...b.nopesList].sort();
    const rentangNomorPeserta =
      sortedNopes.length > 1
        ? `${sortedNopes[0]} – ${sortedNopes[sortedNopes.length - 1]}`
        : sortedNopes[0] || '';

    const kelasArr = Array.from(b.kelasSet).sort();
    const kelasRombel =
      kelasArr.length > 4
        ? `${kelasArr.slice(0, 3).join(', ')} (+${kelasArr.length - 3} kelas)`
        : kelasArr.join(', ') || `Kelas ${tingkatKelas}`;

    const sortedStudents = [...b.students].sort(
      (a, b2) =>
        (a.nomorUjian || '').localeCompare(b2.nomorUjian || '') ||
        a.nama.localeCompare(b2.nama)
    );

    return {
      nomorRuang: b.ruang,
      labelUtama: formatRoomDisplayLabel(b.ruang, prefixRuang),
      tingkatKelas,
      kelasRombel,
      jumlahPeserta: b.students.length,
      rentangNomorPeserta,
      sesiUjian: Array.from(b.sesiSet).join(' · ') || sessions[0] || 'Sesi 1',
      students: sortedStudents,
      isProjected: b.projectedCount > 0
    };
  });

  return {
    studentMap,
    rooms,
    totalActiveStudents: ordered.length,
    savedRoomStudentCount,
    isMostlyProjected: savedRoomStudentCount === 0
  };
};

export const syncTempelRuangBundleWithKartuUjian = (
  prevBundle: TempelRuangConfigBundle,
  siswaList: Siswa[],
  ujianSettings: KartuUjianSettings,
  options?: { forceProjectFromSettings?: boolean }
): TempelRuangConfigBundle => {
  const dist = computeMatchedRoomDistribution(siswaList, ujianSettings, options);
  if (dist.rooms.length === 0) {
    return prevBundle;
  }

  const prevKelByTingkat = new Map<TempelRuangTingkat, TempelRuangKelompok>();
  prevBundle.kelompokList.forEach(k => {
    if (!prevKelByTingkat.has(k.tingkatKelas)) {
      prevKelByTingkat.set(k.tingkatKelas, k);
    }
  });

  const defaultKelMap: Record<TempelRuangTingkat, TempelRuangKelompok> = {
    X: prevKelByTingkat.get('X') || {
      id: 'kel-x',
      namaKelompok: 'Kelompok Ruang Kelas X',
      tingkatKelas: 'X',
      gedungLokasi: 'Gedung Utama Sayap Barat',
      warnaBadge: 'blue',
      catatan: 'Peserta Didik Tingkat X',
      urutan: 1
    },
    XI: prevKelByTingkat.get('XI') || {
      id: 'kel-xi',
      namaKelompok: 'Kelompok Ruang Kelas XI',
      tingkatKelas: 'XI',
      gedungLokasi: 'Gedung Tengah & Sayap Timur',
      warnaBadge: 'emerald',
      catatan: 'Peserta Didik Tingkat XI',
      urutan: 2
    },
    XII: prevKelByTingkat.get('XII') || {
      id: 'kel-xii',
      namaKelompok: 'Kelompok Ruang Kelas XII',
      tingkatKelas: 'XII',
      gedungLokasi: 'Gedung Timur & Lab Komputer',
      warnaBadge: 'amber',
      catatan: 'Peserta Didik Tingkat XII',
      urutan: 3
    },
    Gabungan: prevKelByTingkat.get('Gabungan') || {
      id: 'kel-gabungan',
      namaKelompok: 'Kelompok Ruang Lintas Tingkat',
      tingkatKelas: 'Gabungan',
      gedungLokasi: 'Gedung Utama / Ruang Campuran',
      warnaBadge: 'slate',
      catatan: 'Ruang berisi peserta lintas tingkat kelas',
      urutan: 4
    }
  };

  const hasGabungan = dist.rooms.some(r => r.tingkatKelas === 'Gabungan');
  const existingCustomKels = prevBundle.kelompokList.filter(
    k => !['kel-x', 'kel-xi', 'kel-xii', 'kel-gabungan'].includes(k.id)
  );
  const nextKelompokList: TempelRuangKelompok[] = [
    defaultKelMap.X,
    defaultKelMap.XI,
    defaultKelMap.XII,
    ...(hasGabungan || prevKelByTingkat.has('Gabungan') ? [defaultKelMap.Gabungan] : []),
    ...existingCustomKels
  ];

  const prevRoomByCode = new Map<string, TempelRuangItem>();
  prevBundle.ruangList.forEach(r => {
    prevRoomByCode.set(normalizeRoomLookupKey(r.nomorRuang) || r.nomorRuang.toUpperCase(), r);
  });

  const nextRuangList: TempelRuangItem[] = dist.rooms.map((bucket, idx) => {
    const prevMatch = prevRoomByCode.get(
      normalizeRoomLookupKey(bucket.nomorRuang) || bucket.nomorRuang.toUpperCase()
    );
    const targetKel = defaultKelMap[bucket.tingkatKelas];

    return {
      id: prevMatch?.id || `tr-ku-${idx + 1}`,
      nomorRuang: bucket.nomorRuang,
      labelUtama: bucket.labelUtama,
      kelompokId: prevMatch?.kelompokId && nextKelompokList.some(k => k.id === prevMatch.kelompokId)
        ? prevMatch.kelompokId
        : targetKel.id,
      tingkatKelas: bucket.tingkatKelas,
      kelasRombel: bucket.kelasRombel,
      jumlahPeserta: bucket.jumlahPeserta,
      rentangNomorPeserta: bucket.rentangNomorPeserta,
      sesiUjian: bucket.sesiUjian,
      lokasiGedung: prevMatch?.lokasiGedung || targetKel.gedungLokasi || 'Gedung Utama',
      catatanTambahan: prevMatch?.catatanTambahan || '',
      dipilihCetak: prevMatch?.dipilihCetak !== false,
      autoMatchedFromKartuUjian: true
    };
  });

  return {
    settings: {
      ...prevBundle.settings,
      ikutiSettingKartuUjian: prevBundle.settings.ikutiSettingKartuUjian !== false,
      subjudulUjian: ujianSettings.namaUjian || prevBundle.settings.subjudulUjian,
      tahunPelajaran: ujianSettings.tahunPelajaran || prevBundle.settings.tahunPelajaran,
      semester: ujianSettings.semester || prevBundle.settings.semester
    },
    kelompokList: nextKelompokList,
    ruangList: nextRuangList,
    updatedAt: new Date().toISOString()
  };
};

export const matchConditionalJadwalSiswa = (
  item: JadwalUjianItem,
  siswa: Siswa,
  fallbackSesi = 'Sesi 1'
): boolean => {
  const target = item.kondisiTarget || 'Semua';
  const rawFilter = (item.kondisiNilai || '').trim();
  if (target === 'Semua' || !rawFilter) return true;

  const tokens = rawFilter
    .split(/[,;|]+/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  if (target === 'Kelas') {
    const kelasVal = (siswa.rombelSaatIni || siswa.kelas || '').trim().toLowerCase();
    if (!kelasVal) return false;
    return tokens.some(
      tok =>
        kelasVal === tok ||
        kelasVal.startsWith(`${tok}-`) ||
        kelasVal.startsWith(`${tok} `) ||
        kelasVal.startsWith(`${tok}.`)
    );
  }

  if (target === 'Sesi') {
    const sesiVal = (siswa.sesiUjian || fallbackSesi || '').trim().toLowerCase();
    if (!sesiVal) return false;
    const sesiBase = extractSessionBaseName(sesiVal);
    return tokens.some(tok => {
      const tokBase = extractSessionBaseName(tok);
      return (
        sesiVal === tok ||
        sesiVal.includes(tok) ||
        tok.includes(sesiVal) ||
        Boolean(sesiBase && tokBase && sesiBase === tokBase)
      );
    });
  }

  if (target === 'Ruang') {
    const ruangVal = (siswa.ruangUjian || '').trim().toLowerCase();
    if (!ruangVal) return false;
    return tokens.some(tok => ruangVal === tok || ruangVal.includes(tok));
  }

  return true;
};

export const findScheduledProctorsForRoomAndDay = (
  roomName: string,
  hariTanggal: string,
  panitiaPengawasList: PanitiaPengawasItem[],
  slots: JadwalPengawasSlot[]
): PanitiaPengawasItem[] => {
  const roomKey = normalizeRoomLookupKey(roomName);
  if (!roomKey) return [];
  const cleanDay = (hariTanggal || '').toLowerCase();
  const pengawasOnly = panitiaPengawasList.filter(p => p.kategori === 'pengawas');

  const matchingSlots = slots.filter(slot => {
    const dayName = (slot.hari || '').toLowerCase();
    const dateStr = (slot.tanggal || '').toLowerCase();
    const dateNum = dateStr.match(/\d+/)?.[0];
    if (!cleanDay) return true;
    const dayMatches = dayName && cleanDay.includes(dayName);
    const numMatches = dateNum && cleanDay.includes(dateNum);
    return dayMatches && (numMatches || !cleanDay.match(/\d+/));
  });

  const targetSlots = matchingSlots.length > 0 ? matchingSlots : [];
  if (targetSlots.length === 0) return [];

  const matched = new Map<string, PanitiaPengawasItem>();
  pengawasOnly.forEach(p => {
    targetSlots.forEach(sl => {
      const val = p.jadwalMengawas?.[sl.id];
      if (!val || /^off$/i.test(val.trim()) || /^cad/i.test(val.trim())) return;
      if (normalizeRoomLookupKey(val) === roomKey) {
        matched.set(p.id, p);
      }
    });
  });

  return Array.from(matched.values());
};

export const formatPengawasRoomAssignmentLabel = (rawCode?: string): string => {
  const clean = (rawCode || '').trim().toUpperCase();
  if (!clean) return '-';
  if (clean === 'OFF') return 'OFF (Libur Jaga)';
  if (/^CAD\s*\d*/i.test(clean)) return `Cadangan (${clean})`;
  if (/^(LABKOM|ABM)/i.test(clean)) return clean;
  if (/^\d+$/.test(clean)) return `Ruang ${clean.padStart(2, '0')}`;
  return clean;
};
