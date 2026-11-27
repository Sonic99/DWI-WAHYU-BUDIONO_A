import React from 'react';
import {
  BukuIndukActiveConfig,
  BukuIndukMapelRecord,
  BukuIndukSemesterScore,
  BukuIndukSiswaMeta,
  KurikulumMapelItem,
  SchoolProfile,
  Siswa
} from '../types';
import { cleanIndukDisplay, normalizeMapelMatchKey, sanitizeIndukField } from '../utils/bukuIndukParser';
import {
  DEFAULT_PRINT_TYPOGRAPHY,
  PrintTypographySettings,
  resolvePrintFontOption,
  resolvePrintSpacingMeta
} from '../utils/printTypography';
import { KepalaSekolahSignatureSvg, SchoolStampSvg } from './OfficialStamps';

export type BukuIndukPaperSize = 'A4' | 'F4' | 'A3';
export type BukuIndukOrientation = 'portrait' | 'landscape';

interface BukuIndukLembarNilaiSheetProps {
  student: Siswa;
  meta?: BukuIndukSiswaMeta;
  resolved: {
    sourceJenis: string;
    sourceName: string;
    sourceTahun: string;
    sourceSk?: string;
    resolvedMapel: KurikulumMapelItem[];
  };
  profile: SchoolProfile;
  activeConfig: BukuIndukActiveConfig;
  paperSize: BukuIndukPaperSize;
  orientation: BukuIndukOrientation;
  printScalePct?: number;
  typography?: PrintTypographySettings;
  fallbackTtdUrl?: string;
  fallbackStempelUrl?: string;
}

interface UnifiedMapelRow {
  key: string;
  namaMapel: string;
  kelompok: string;
  kkmX: string;
  kkmXI: string;
  kkmXII: string;
  semesters: Record<string, BukuIndukSemesterScore>;
  rataRapor: string;
  nilaiUs: string;
  nilaiIjazah: string;
}

const calcNumericSummary = (values: Array<string | undefined>): { sum: string; avg: string } => {
  const nums = values
    .map(v => parseFloat((v || '').replace(',', '.')))
    .filter(n => !Number.isNaN(n) && Number.isFinite(n));
  if (nums.length === 0) return { sum: '-', avg: '-' };
  const total = nums.reduce((acc, n) => acc + n, 0);
  const avg = total / nums.length;
  return {
    sum: Number.isInteger(total) ? String(total) : total.toFixed(1),
    avg: avg.toFixed(2)
  };
};

const computeAutoPredikat = (val?: string): string => {
  const n = parseFloat((val || '').replace(',', '.'));
  if (Number.isNaN(n)) return '';
  if (n >= 92) return 'A';
  if (n >= 83) return 'B';
  if (n >= 75) return 'C';
  return 'D';
};

export const BukuIndukLembarNilaiSheet: React.FC<BukuIndukLembarNilaiSheetProps> = ({
  student,
  meta,
  resolved,
  profile,
  activeConfig,
  paperSize,
  orientation,
  printScalePct = 100,
  typography = DEFAULT_PRINT_TYPOGRAPHY,
  fallbackTtdUrl = '',
  fallbackStempelUrl = ''
}) => {
  const isK13 = /2013|k-?13/i.test(resolved.sourceJenis);
  const isKtsp = /ktsp|2006/i.test(resolved.sourceJenis);
  const isMerdeka = !isK13 && !isKtsp;

  const typoFont = resolvePrintFontOption(typography.fontFamily);
  const typoSp = resolvePrintSpacingMeta(typography.lineSpacing);
  const typoTextScale = (typography.fontScalePct || 100) / 100;
  const spFactor = typoSp.id === 'padat' ? 0.76 : typoSp.id === 'lega' ? 1.38 : 1.0;
  const lhFactor = typoSp.id === 'padat' ? 0.9 : typoSp.id === 'lega' ? 1.15 : 1.0;
  const pxFactor = typoSp.id === 'padat' ? 0.85 : typoSp.id === 'lega' ? 1.15 : 1.0;

  // Presisi ukuran teks, padding, dan lebar kolom berdasarkan kombinasi Kertas (A4/F4/A3), Orientasi, & Spasi Pelaporan
  const layoutSpec = React.useMemo(() => {
    const base = (() => {
      if (paperSize === 'A3' && orientation === 'landscape') {
        return {
          headerPx: 11,
          headerNamePx: 12.5,
          k13Px: 9.5,
          k13SubPx: 8.5,
          simplePx: 10.5,
          lowerPx: 9.8,
          sigPx: 10,
          baseLh: 1.28,
          basePy: 3,
          basePx: 6,
          lowerPy: 2.5,
          sigHeight: 'h-16',
          mapelMinW: 'min-w-[190px]'
        };
      }
      if (paperSize === 'A3' && orientation === 'portrait') {
        return {
          headerPx: 10.5,
          headerNamePx: 11.5,
          k13Px: 8.2,
          k13SubPx: 7.2,
          simplePx: 9.5,
          lowerPx: 9.2,
          sigPx: 9.5,
          baseLh: 1.24,
          basePy: 2.5,
          basePx: 4,
          lowerPy: 2.2,
          sigHeight: 'h-14',
          mapelMinW: 'min-w-[140px]'
        };
      }
      if (paperSize === 'F4' && orientation === 'landscape') {
        return {
          headerPx: 9.5,
          headerNamePx: 10.5,
          k13Px: 7.6,
          k13SubPx: 6.8,
          simplePx: 8.4,
          lowerPx: 8.2,
          sigPx: 8.5,
          baseLh: 1.2,
          basePy: 2,
          basePx: 3,
          lowerPy: 2,
          sigHeight: 'h-12',
          mapelMinW: 'min-w-[138px]'
        };
      }
      if (paperSize === 'A4' && orientation === 'landscape') {
        return {
          headerPx: 9,
          headerNamePx: 10,
          k13Px: 7.1,
          k13SubPx: 6.3,
          simplePx: 7.8,
          lowerPx: 7.6,
          sigPx: 8,
          baseLh: 1.16,
          basePy: 1.5,
          basePx: 2.5,
          lowerPy: 1.5,
          sigHeight: 'h-11',
          mapelMinW: 'min-w-[118px]'
        };
      }
      if (paperSize === 'F4' && orientation === 'portrait') {
        return {
          headerPx: 8.8,
          headerNamePx: 9.8,
          k13Px: 6.4,
          k13SubPx: 5.7,
          simplePx: 7.6,
          lowerPx: 8,
          sigPx: 8.2,
          baseLh: 1.22,
          basePy: 2,
          basePx: 2,
          lowerPy: 2,
          sigHeight: 'h-14',
          mapelMinW: 'min-w-[92px]'
        };
      }
      // A4 Portrait
      return {
        headerPx: 8.4,
        headerNamePx: 9.5,
        k13Px: 6,
        k13SubPx: 5.4,
        simplePx: 7.2,
        lowerPx: 7.5,
        sigPx: 7.8,
        baseLh: 1.18,
        basePy: 1.5,
        basePx: 1.5,
        lowerPy: 1.6,
        sigHeight: 'h-12',
        mapelMinW: 'min-w-[84px]'
      };
    })();

    return {
      ...base,
      headerTextPx: +(base.headerPx * typoTextScale).toFixed(2),
      headerNameTextPx: +(base.headerNamePx * typoTextScale).toFixed(2),
      k13FontPx: +(base.k13Px * typoTextScale).toFixed(2),
      k13SubFontPx: +(base.k13SubPx * typoTextScale).toFixed(2),
      simpleFontPx: +(base.simplePx * typoTextScale).toFixed(2),
      lowerFontPx: +(base.lowerPx * typoTextScale).toFixed(2),
      sigFontPx: +(base.sigPx * typoTextScale).toFixed(2),
      lineHeight: +(base.baseLh * lhFactor).toFixed(2),
      cellPyPx: +(base.basePy * spFactor * typoTextScale).toFixed(2),
      cellPxPx: +(base.basePx * pxFactor).toFixed(2),
      lowerPyPx: +(base.lowerPy * spFactor * typoTextScale).toFixed(2),
      sectionGapPx: +(typoSp.sectionGapPx * 0.72 * typoTextScale).toFixed(1),
      cellPad: '',
      k13Table: '',
      k13HeaderSub: '',
      simpleTable: '',
      lowerTable: '',
      sigText: ''
    };
  }, [paperSize, orientation, typoTextScale, spFactor, lhFactor, pxFactor, typoSp.sectionGapPx]);

  const tahunMeta = meta?.tahunAjaranMeta || {};
  const tpX = tahunMeta.X?.tahunPelajaran || '2024/2025';
  const tpXI = tahunMeta.XI?.tahunPelajaran || '2025/2026';
  const tpXII = tahunMeta.XII?.tahunPelajaran || activeConfig.tahunPelajaran || '2026/2027';
  const ijazahTahun = tahunMeta.ijazahTahun || 'Tahun 2027';

  // Gabungkan mapel kurikulum berlaku + catatan transkripNilai (dan fallback nilaiPerMapel Smt 1..6)
  const unifiedRows: UnifiedMapelRow[] = React.useMemo(() => {
    const transkrip = meta?.transkripNilai || {};
    const transkripEntries = Object.values(transkrip);
    const usedKeys = new Set<string>();

    const fromCurrikulum: UnifiedMapelRow[] = resolved.resolvedMapel.map(m => {
      const mNorm = normalizeMapelMatchKey(m.namaMapel);
      const mGroupNorm = normalizeMapelMatchKey(m.kelompok || '');
      const matchedRecord: BukuIndukMapelRecord | undefined =
        transkrip[m.id] ||
        transkripEntries.find(r => {
          const rNorm = normalizeMapelMatchKey(r.namaMapel);
          if (rNorm !== mNorm) return false;
          const rGroupNorm = normalizeMapelMatchKey(r.kelompok || '');
          return (
            (mGroupNorm.includes('lintas') && rGroupNorm.includes('lintas')) ||
            (!mGroupNorm.includes('lintas') && !rGroupNorm.includes('lintas')) ||
            rGroupNorm === mGroupNorm
          );
        });

      if (matchedRecord) usedKeys.add(matchedRecord.mapelKey);

      const semesters: Record<string, BukuIndukSemesterScore> = {};
      (['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const).forEach((sKey, sIdx) => {
        const legacyKey = `Smt ${sIdx + 1}`;
        const legacyVal = sanitizeIndukField(meta?.nilaiPerMapel?.[legacyKey]?.[m.id]);
        const recSem = matchedRecord?.semesters?.[sKey] || {};
        const pengN = recSem.pengN || legacyVal || '';
        const pengP = recSem.pengP || (pengN ? computeAutoPredikat(pengN) : '');
        const ketN = recSem.ketN || legacyVal || '';
        const ketP = recSem.ketP || (ketN ? computeAutoPredikat(ketN) : '');
        const nilaiAkhir = recSem.nilaiAkhir || recSem.pengN || legacyVal || '';
        const predikat = recSem.predikat || (nilaiAkhir ? computeAutoPredikat(nilaiAkhir) : '');

        semesters[sKey] = {
          kkm: recSem.kkm || matchedRecord?.kkm || (m.kkm ? String(m.kkm) : ''),
          pengN,
          pengP,
          ketN,
          ketP,
          nilaiAkhir,
          predikat
        };
      });

      const defaultKkm = m.kkm ? String(m.kkm) : '75';
      const numericGrades = (['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const)
        .map(s => parseFloat((semesters[s]?.nilaiAkhir || semesters[s]?.pengN || '').replace(',', '.')))
        .filter(n => !Number.isNaN(n));
      const autoRataRapor =
        numericGrades.length > 0
          ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(2)
          : '';

      return {
        key: m.id,
        namaMapel: m.namaMapel,
        kelompok: m.kelompok || 'Mata Pelajaran',
        kkmX: semesters.S1.kkm || semesters.S2.kkm || matchedRecord?.kkm || defaultKkm,
        kkmXI: semesters.S3.kkm || semesters.S4.kkm || matchedRecord?.kkm || defaultKkm,
        kkmXII: semesters.S5.kkm || semesters.S6.kkm || matchedRecord?.kkm || defaultKkm,
        semesters,
        rataRapor: matchedRecord?.rataRapor || autoRataRapor,
        nilaiUs: matchedRecord?.nilaiUs || '',
        nilaiIjazah: matchedRecord?.nilaiIjazah || ''
      };
    });

    const extraFromTranscript: UnifiedMapelRow[] = transkripEntries
      .filter(r => !usedKeys.has(r.mapelKey))
      .map(r => ({
        key: r.mapelKey,
        namaMapel: r.namaMapel,
        kelompok: r.kelompok || 'Lintas Minat / Pilihan',
        kkmX: r.semesters?.S1?.kkm || r.semesters?.S2?.kkm || r.kkm || '',
        kkmXI: r.semesters?.S3?.kkm || r.semesters?.S4?.kkm || r.kkm || '',
        kkmXII: r.semesters?.S5?.kkm || r.semesters?.S6?.kkm || r.kkm || '',
        semesters: r.semesters || {},
        rataRapor: r.rataRapor || '',
        nilaiUs: r.nilaiUs || '',
        nilaiIjazah: r.nilaiIjazah || ''
      }));

    return [...fromCurrikulum, ...extraFromTranscript];
  }, [meta, resolved.resolvedMapel]);

  const groupedRows = React.useMemo(() => {
    const map = new Map<string, UnifiedMapelRow[]>();
    unifiedRows.forEach(r => {
      const grp = r.kelompok || 'Mata Pelajaran';
      if (!map.has(grp)) map.set(grp, []);
      map.get(grp)!.push(r);
    });
    return Array.from(map.entries());
  }, [unifiedRows]);

  const ekskulList =
    meta?.ekskulRecords && meta.ekskulRecords.length > 0
      ? meta.ekskulRecords
      : [
          { nama: '', x: '-', xi: '-', xii: '-' },
          { nama: '', x: '-', xi: '-', xii: '-' },
          { nama: '', x: '-', xi: '-', xii: '-' }
        ];

  const effectiveStempelUrl = fallbackStempelUrl;
  const effectiveTtdUrl = fallbackTtdUrl;

  const summaryColsK13 = [
    calcNumericSummary(unifiedRows.map(r => r.semesters.S1?.pengN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S1?.ketN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S2?.pengN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S2?.ketN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S3?.pengN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S3?.ketN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S4?.pengN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S4?.ketN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S5?.pengN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S5?.ketN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S6?.pengN)),
    calcNumericSummary(unifiedRows.map(r => r.semesters.S6?.ketN))
  ];

  const summaryColsSimple = (['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const).map(sKey =>
    calcNumericSummary(unifiedRows.map(r => r.semesters[sKey]?.nilaiAkhir || r.semesters[sKey]?.pengN))
  );

  let rowNum = 0;

  return (
    <div
      className="buku-induk-sheet buku-induk-nilai-scope bg-white border border-slate-300 shadow-sm mx-auto text-slate-950 box-border print:border-0 print:shadow-none flex flex-col justify-between"
      style={{
        fontFamily: typoFont.fontFamily,
        lineHeight: layoutSpec.lineHeight,
        ['--bn-py' as string]: `${layoutSpec.cellPyPx}px`,
        ['--bn-px' as string]: `${layoutSpec.cellPxPx}px`,
        ['--bn-lower-py' as string]: `${layoutSpec.lowerPyPx}px`,
        ['--bn-lh' as string]: String(layoutSpec.lineHeight),
        ['--bn-gap' as string]: `${layoutSpec.sectionGapPx}px`
      }}
    >
      <div
        className="flex-1 flex flex-col justify-between"
        style={
          printScalePct !== 100
            ? {
                transform: `scale(${printScalePct / 100})`,
                transformOrigin: 'top left',
                width: `${(100 / printScalePct) * 100}%`
              }
            : undefined
        }
      >
        <div>
          {/* Header Identitas Baris Atas Lembar Nilai */}
          <div
            className="border-b-2 border-slate-900 pb-1.5 flex flex-wrap items-center justify-between gap-2"
            style={{
              fontSize: `${layoutSpec.headerTextPx}px`,
              marginBottom: 'var(--bn-gap, 8px)'
            }}
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
              <div>
                <span className="font-semibold text-slate-700">NAMA PESERTA DIDIK : </span>
                <span
                  className="font-black uppercase text-slate-950"
                  style={{ fontSize: `${layoutSpec.headerNameTextPx}px` }}
                >
                  {cleanIndukDisplay(student.nama)}
                </span>
              </div>
              <div className="font-mono">
                <span className="font-semibold text-slate-700">NIS : </span>
                <span className="font-bold">
                  {cleanIndukDisplay(meta?.nomorBukuInduk || student.nis || student.nipd)}
                </span>
                <span className="text-slate-500"> / </span>
                <span className="font-semibold text-slate-700">NISN : </span>
                <span className="font-bold">{cleanIndukDisplay(student.nisn)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <span className="font-semibold text-slate-700">
                  {isMerdeka ? 'FASE / PEMINATAN : ' : 'PROGRAM STUDI : '}
                </span>
                <span className="font-black uppercase">
                  {cleanIndukDisplay(meta?.programStudi || student.jurusan || student.rombelSaatIni || student.kelas)}
                </span>
              </div>
              <span className="font-mono text-[0.85em] px-1.5 py-0.5 border border-slate-700 bg-slate-100 font-bold">
                {resolved.sourceJenis}
              </span>
            </div>
          </div>

          {/* TABEL NILAI KONDISIONAL BERDASARKAN KURIKULUM */}
          {isK13 ? (
            <table
              className="bn-table-main w-full border-collapse border border-slate-900 tabular-nums"
              style={{
                fontSize: `${layoutSpec.k13FontPx}px`,
                lineHeight: layoutSpec.lineHeight,
                marginBottom: 'var(--bn-gap, 8px)'
              }}
            >
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-950">
                <th rowSpan={4} className={`border border-slate-800 ${layoutSpec.cellPad} w-5 text-center`}>
                  No.
                </th>
                <th rowSpan={4} className={`border border-slate-800 ${layoutSpec.cellPad} text-left ${layoutSpec.mapelMinW}`}>
                  Mata Pelajaran
                </th>
                <th colSpan={9} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  TP {tpX}
                </th>
                <th colSpan={9} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  TP {tpXI}
                </th>
                <th colSpan={9} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  TP {tpXII}
                </th>
                <th colSpan={3} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  IJAZAH ({ijazahTahun})
                </th>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <th colSpan={9} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  Kelas X
                </th>
                <th colSpan={9} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  Kelas XI
                </th>
                <th colSpan={9} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  Kelas XII
                </th>
                <th rowSpan={3} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  Rata Rapor
                </th>
                <th rowSpan={3} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  Ujian Sek.
                </th>
                <th rowSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  Lamp. STL
                </th>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                {[0, 1, 2].map(yr => (
                  <React.Fragment key={yr}>
                    <th rowSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                      K
                    </th>
                    <th colSpan={4} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                      Semester 1
                    </th>
                    <th colSpan={4} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                      Semester 2
                    </th>
                  </React.Fragment>
                ))}
              </tr>
              <tr className="bg-slate-50" style={{ fontSize: `${layoutSpec.k13SubFontPx}px` }}>
                {[0, 1, 2, 3, 4, 5].map(semIdx => (
                  <React.Fragment key={semIdx}>
                    <th className={`border border-slate-800 ${layoutSpec.cellPad} text-center`} title="Pengetahuan (Angka)">
                      P.N
                    </th>
                    <th className={`border border-slate-800 ${layoutSpec.cellPad} text-center`} title="Pengetahuan (Predikat)">
                      P.P
                    </th>
                    <th className={`border border-slate-800 ${layoutSpec.cellPad} text-center`} title="Keterampilan (Angka)">
                      K.N
                    </th>
                    <th className={`border border-slate-800 ${layoutSpec.cellPad} text-center`} title="Keterampilan (Predikat)">
                      K.P
                    </th>
                  </React.Fragment>
                ))}
                <th className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>Angka</th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map(([grpName, rows]) => (
                <React.Fragment key={grpName}>
                  <tr className="bg-slate-100/90 font-bold text-slate-900">
                    <td colSpan={32} className={`border border-slate-800 ${layoutSpec.cellPad} uppercase`}>
                      {grpName}
                    </td>
                  </tr>
                  {rows.map(r => {
                    rowNum++;
                    return (
                      <tr key={r.key}>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                          {rowNum}.
                        </td>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} font-medium`}>
                          {r.namaMapel}
                        </td>
                        {/* Kelas X */}
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono text-slate-600`}>
                          {cleanIndukDisplay(r.kkmX, { fallback: '' })}
                        </td>
                        {(['S1', 'S2'] as const).map(sk => {
                          const sc = r.semesters[sk] || {};
                          return (
                            <React.Fragment key={sk}>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(sc.pengN, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(sc.pengP, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(sc.ketN, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(sc.ketP, { fallback: '' })}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* Kelas XI */}
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono text-slate-600`}>
                          {cleanIndukDisplay(r.kkmXI, { fallback: '' })}
                        </td>
                        {(['S3', 'S4'] as const).map(sk => {
                          const sc = r.semesters[sk] || {};
                          return (
                            <React.Fragment key={sk}>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(sc.pengN, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(sc.pengP, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(sc.ketN, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(sc.ketP, { fallback: '' })}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* Kelas XII */}
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono text-slate-600`}>
                          {cleanIndukDisplay(r.kkmXII, { fallback: '' })}
                        </td>
                        {(['S5', 'S6'] as const).map(sk => {
                          const sc = r.semesters[sk] || {};
                          return (
                            <React.Fragment key={sk}>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(sc.pengN, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(sc.pengP, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(sc.ketN, { fallback: '' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(sc.ketP, { fallback: '' })}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* IJAZAH */}
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono font-semibold`}>
                          {cleanIndukDisplay(r.rataRapor, { fallback: '' })}
                        </td>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                          {cleanIndukDisplay(r.nilaiUs, { fallback: '' })}
                        </td>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono font-bold`}>
                          {cleanIndukDisplay(r.nilaiIjazah, { fallback: '' })}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* JUMLAH */}
              <tr className="bg-slate-50 font-bold">
                <td colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-right uppercase`}>
                  JUMLAH
                </td>
                <td className="border border-slate-800" />
                {summaryColsK13.slice(0, 4).map((sc, i) => (
                  <td key={`jx-${i}`} colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                    {sc.sum}
                  </td>
                ))}
                <td className="border border-slate-800" />
                {summaryColsK13.slice(4, 8).map((sc, i) => (
                  <td key={`jxi-${i}`} colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                    {sc.sum}
                  </td>
                ))}
                <td className="border border-slate-800" />
                {summaryColsK13.slice(8, 12).map((sc, i) => (
                  <td key={`jxii-${i}`} colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                    {sc.sum}
                  </td>
                ))}
                <td colSpan={3} className="border border-slate-800" />
              </tr>

              {/* RATA-RATA */}
              <tr className="bg-slate-100 font-bold">
                <td colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-right uppercase`}>
                  RATA-RATA
                </td>
                <td className="border border-slate-800" />
                {summaryColsK13.slice(0, 4).map((sc, i) => (
                  <td key={`rx-${i}`} colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                    {sc.avg}
                  </td>
                ))}
                <td className="border border-slate-800" />
                {summaryColsK13.slice(4, 8).map((sc, i) => (
                  <td key={`rxi-${i}`} colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                    {sc.avg}
                  </td>
                ))}
                <td className="border border-slate-800" />
                {summaryColsK13.slice(8, 12).map((sc, i) => (
                  <td key={`rxii-${i}`} colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                    {sc.avg}
                  </td>
                ))}
                <td colSpan={3} className="border border-slate-800" />
              </tr>
            </tbody>
          </table>
        ) : (
          /* TABEL KURIKULUM MERDEKA / KTSP 2006 KONDISIONAL */
          <table
            className="bn-table-main w-full border-collapse border border-slate-900 tabular-nums"
            style={{
              fontSize: `${layoutSpec.simpleFontPx}px`,
              lineHeight: layoutSpec.lineHeight,
              marginBottom: 'var(--bn-gap, 8px)'
            }}
          >
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-950">
                <th rowSpan={3} className={`border border-slate-800 ${layoutSpec.cellPad} w-6 text-center`}>
                  No.
                </th>
                <th rowSpan={3} className={`border border-slate-800 ${layoutSpec.cellPad} text-left ${layoutSpec.mapelMinW}`}>
                  Mata Pelajaran ({resolved.sourceJenis})
                </th>
                <th colSpan={5} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  TP {tpX} · X {isMerdeka ? '(Fase E)' : ''}
                </th>
                <th colSpan={5} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  TP {tpXI} · XI {isMerdeka ? '(Fase F)' : ''}
                </th>
                <th colSpan={5} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  TP {tpXII} · XII {isMerdeka ? '(Fase F)' : ''}
                </th>
                <th colSpan={3} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  IJAZAH ({ijazahTahun})
                </th>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                {[0, 1, 2].map(yr => (
                  <React.Fragment key={yr}>
                    <th rowSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                      {isMerdeka ? 'KKTP' : 'KKM'}
                    </th>
                    <th colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                      Smt 1
                    </th>
                    <th colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                      Smt 2
                    </th>
                  </React.Fragment>
                ))}
                <th rowSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  Rata Rapor
                </th>
                <th rowSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  {isMerdeka ? 'PSAJ/US' : 'Ujian Sek.'}
                </th>
                <th rowSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>
                  Lamp. STL
                </th>
              </tr>
              <tr className="bg-slate-50 text-[0.88em]">
                {[0, 1, 2, 3, 4, 5].map(semIdx => (
                  <React.Fragment key={semIdx}>
                    <th className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>Nilai</th>
                    <th className={`border border-slate-800 ${layoutSpec.cellPad} text-center`}>Pred</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedRows.map(([grpName, rows]) => (
                <React.Fragment key={grpName}>
                  <tr className="bg-slate-100/90 font-bold text-slate-900">
                    <td colSpan={20} className={`border border-slate-800 ${layoutSpec.cellPad} uppercase`}>
                      {grpName}
                    </td>
                  </tr>
                  {rows.map(r => {
                    rowNum++;
                    return (
                      <tr key={r.key}>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                          {rowNum}.
                        </td>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} font-medium`}>
                          {r.namaMapel}
                        </td>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono text-slate-600`}>
                          {cleanIndukDisplay(r.kkmX, { fallback: '-' })}
                        </td>
                        {(['S1', 'S2'] as const).map(sk => {
                          const sc = r.semesters[sk] || {};
                          const n = sc.nilaiAkhir || sc.pengN || '';
                          const p = sc.predikat || sc.pengP || (n ? computeAutoPredikat(n) : '');
                          return (
                            <React.Fragment key={sk}>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(n, { fallback: '-' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(p, { fallback: '-' })}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono text-slate-600`}>
                          {cleanIndukDisplay(r.kkmXI, { fallback: '-' })}
                        </td>
                        {(['S3', 'S4'] as const).map(sk => {
                          const sc = r.semesters[sk] || {};
                          const n = sc.nilaiAkhir || sc.pengN || '';
                          const p = sc.predikat || sc.pengP || (n ? computeAutoPredikat(n) : '');
                          return (
                            <React.Fragment key={sk}>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(n, { fallback: '-' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(p, { fallback: '-' })}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono text-slate-600`}>
                          {cleanIndukDisplay(r.kkmXII, { fallback: '-' })}
                        </td>
                        {(['S5', 'S6'] as const).map(sk => {
                          const sc = r.semesters[sk] || {};
                          const n = sc.nilaiAkhir || sc.pengN || '';
                          const p = sc.predikat || sc.pengP || (n ? computeAutoPredikat(n) : '');
                          return (
                            <React.Fragment key={sk}>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                                {cleanIndukDisplay(n, { fallback: '-' })}
                              </td>
                              <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-semibold`}>
                                {cleanIndukDisplay(p, { fallback: '-' })}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono font-semibold`}>
                          {cleanIndukDisplay(r.rataRapor, { fallback: '-' })}
                        </td>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                          {cleanIndukDisplay(r.nilaiUs, { fallback: '-' })}
                        </td>
                        <td className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono font-bold`}>
                          {cleanIndukDisplay(r.nilaiIjazah, { fallback: '-' })}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}

              <tr className="bg-slate-50 font-bold">
                <td colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-right uppercase`}>
                  JUMLAH
                </td>
                <td className="border border-slate-800" />
                {summaryColsSimple.map((sc, idx) => (
                  <React.Fragment key={`s-${idx}`}>
                    <td colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                      {sc.sum}
                    </td>
                    {(idx === 1 || idx === 3) && <td className="border border-slate-800" />}
                  </React.Fragment>
                ))}
                <td colSpan={3} className="border border-slate-800" />
              </tr>
              <tr className="bg-slate-100 font-bold">
                <td colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-right uppercase`}>
                  RATA-RATA
                </td>
                <td className="border border-slate-800" />
                {summaryColsSimple.map((sc, idx) => (
                  <React.Fragment key={`r-${idx}`}>
                    <td colSpan={2} className={`border border-slate-800 ${layoutSpec.cellPad} text-center font-mono`}>
                      {sc.avg}
                    </td>
                    {(idx === 1 || idx === 3) && <td className="border border-slate-800" />}
                  </React.Fragment>
                ))}
                <td colSpan={3} className="border border-slate-800" />
              </tr>
            </tbody>
          </table>
        )}

        {/* NILAI SIKAP, PENGEMBANGAN DIRI, KETIDAKHADIRAN & STATUS AKHIR TAHUN */}
        <table
          className="bn-table-lower w-full border-collapse border border-slate-900"
          style={{
            fontSize: `${layoutSpec.lowerFontPx}px`,
            lineHeight: layoutSpec.lineHeight,
            marginBottom: 'var(--bn-gap, 8px)'
          }}
        >
          <thead>
            <tr className="bg-slate-100 font-bold text-slate-950">
              <th className="border border-slate-800 px-2 py-0.5 text-left w-[34%]">
                ASPEK PENILAIAN & PERKEMBANGAN
              </th>
              <th className="border border-slate-800 px-1.5 py-0.5 text-center w-[19%]">
                Kelas X ({tpX})
              </th>
              <th className="border border-slate-800 px-1.5 py-0.5 text-center w-[19%]">
                Kelas XI ({tpXI})
              </th>
              <th className="border border-slate-800 px-1.5 py-0.5 text-center w-[19%]">
                Kelas XII ({tpXII})
              </th>
              <th className="border border-slate-800 px-1.5 py-0.5 text-center w-[9%]">
                Akhir / Ijazah
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50 font-bold">
              <td colSpan={5} className="border border-slate-800 px-2 py-[1.5px] uppercase">
                NILAI SIKAP
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-3 py-[1.5px]">1. Spiritual</td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                {cleanIndukDisplay(tahunMeta.X?.sikapSpiritual, { fallback: 'Baik' })}
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                {cleanIndukDisplay(tahunMeta.XI?.sikapSpiritual, { fallback: 'Baik' })}
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                {cleanIndukDisplay(tahunMeta.XII?.sikapSpiritual, { fallback: '-' })}
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">-</td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-3 py-[1.5px]">2. Sosial</td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                {cleanIndukDisplay(tahunMeta.X?.sikapSosial, { fallback: 'Baik' })}
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                {cleanIndukDisplay(tahunMeta.XI?.sikapSosial, { fallback: 'Baik' })}
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                {cleanIndukDisplay(tahunMeta.XII?.sikapSosial, { fallback: '-' })}
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">-</td>
            </tr>

            <tr className="bg-slate-50 font-bold">
              <td colSpan={5} className="border border-slate-800 px-2 py-[1.5px] uppercase">
                PENGEMBANGAN DIRI — A. KEGIATAN EKSTRAKURIKULER
              </td>
            </tr>
            {ekskulList.map((ex, eIdx) => (
              <tr key={`${ex.nama}-${eIdx}`}>
                <td className="border border-slate-800 px-3 py-[1.5px]">
                  {ex.nama ? (
                    /^\d+\./.test(ex.nama) ? ex.nama : `${eIdx + 1}. ${ex.nama}`
                  ) : (
                    <span>
                      {eIdx + 1}.{' '}
                      <span className="inline-block w-[78%] border-b border-dotted border-slate-400 align-baseline" />
                    </span>
                  )}
                </td>
                <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                  {cleanIndukDisplay(ex.x)}
                </td>
                <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                  {cleanIndukDisplay(ex.xi)}
                </td>
                <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">
                  {cleanIndukDisplay(ex.xii)}
                </td>
                <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">-</td>
              </tr>
            ))}
            <tr>
              <td className="border border-slate-800 px-2 py-[1.5px] font-semibold">
                B. Keikutsertaan Dalam Organisasi di Sekolah
              </td>
              <td colSpan={4} className="border border-slate-800 px-2 py-[1.5px]">
                {cleanIndukDisplay(meta?.organisasiSekolah || meta?.kegemaranOrganisasi)}
              </td>
            </tr>

            <tr className="bg-slate-50 font-bold">
              <td colSpan={5} className="border border-slate-800 px-2 py-[1.5px] uppercase">
                KETIDAKHADIRAN
              </td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-3 py-[1.5px]">1. Sakit</td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.X?.sakit, { fallback: '0' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.XI?.sakit, { fallback: '0' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.XII?.sakit, { fallback: '-' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">-</td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-3 py-[1.5px]">2. Ijin</td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.X?.ijin, { fallback: '0' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.XI?.ijin, { fallback: '0' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.XII?.ijin, { fallback: '-' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">-</td>
            </tr>
            <tr>
              <td className="border border-slate-800 px-3 py-[1.5px]">3. Tanpa Keterangan</td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.X?.alpha, { fallback: '0' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.XI?.alpha, { fallback: '0' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center tabular-nums">
                {cleanIndukDisplay(tahunMeta.XII?.alpha, { fallback: '-' })} hari
              </td>
              <td className="border border-slate-800 px-1.5 py-[1.5px] text-center">-</td>
            </tr>

            <tr className="bg-slate-50 font-semibold">
              <td className="border border-slate-800 px-2 py-[2px] font-bold uppercase">
                STATUS AKHIR TAHUN
              </td>
              <td className="border border-slate-800 px-1.5 py-[2px] text-center">
                {tahunMeta.X?.statusAkhir === 'Tinggal'
                  ? `Tinggal di : ${tahunMeta.X.naikKeKelas || 'X'}`
                  : `Naik ke Kelas : ${cleanIndukDisplay(tahunMeta.X?.naikKeKelas, { fallback: 'XI' })}`}
              </td>
              <td className="border border-slate-800 px-1.5 py-[2px] text-center">
                {tahunMeta.XI?.statusAkhir === 'Tinggal'
                  ? `Tinggal di : ${tahunMeta.XI.naikKeKelas || 'XI'}`
                  : `Naik ke Kelas : ${cleanIndukDisplay(tahunMeta.XI?.naikKeKelas, { fallback: 'XII' })}`}
              </td>
              <td className="border border-slate-800 px-1.5 py-[2px] text-center">
                {tahunMeta.XII?.naikKeKelas
                  ? `${tahunMeta.XII.statusAkhir || 'Naik'} : ${tahunMeta.XII.naikKeKelas}`
                  : 'Lulus / Selesai'}
              </td>
              <td className="border border-slate-800 px-1.5 py-[2px] text-center font-bold">
                {tahunMeta.statusKelulusan || (student.status === 'Alumni' ? 'Lulus' : 'Aktif')}
              </td>
            </tr>
          </tbody>
        </table>

        </div>

        {/* 4 KOLOM PENGESAHAN WALI KELAS X, XI, XII & KEPALA SEKOLAH */}
        <div
          className="grid grid-cols-4 gap-3 pt-1.5"
          style={{ fontSize: `${layoutSpec.sigFontPx}px`, lineHeight: layoutSpec.lineHeight }}
        >
          {(['X', 'XI', 'XII'] as const).map(yr => {
            const ym = tahunMeta[yr];
            const tglRaw = sanitizeIndukField(ym?.tanggalTtd);
            const labelWali = cleanIndukDisplay(ym?.waliKelasLabel, { fallback: `Wali Kelas ${yr}` });
            const namaWaliRaw = sanitizeIndukField(ym?.waliKelasNama);
            const nipWali = cleanIndukDisplay(ym?.waliKelasNip, { fallback: '-' });

            return (
              <div key={yr} className="text-left">
                <div>
                  {tglRaw ? (
                    tglRaw
                  ) : (
                    <span>
                      Surabaya,{' '}
                      <span className="inline-block w-20 border-b border-dotted border-slate-500 align-baseline" />{' '}
                      20...
                    </span>
                  )}
                </div>
                <div className="font-semibold">{labelWali}</div>
                <div className={layoutSpec.sigHeight} />
                {namaWaliRaw ? (
                  <div className="font-bold underline">{namaWaliRaw}</div>
                ) : (
                  <div className="font-bold">
                    ({' '}
                    <span className="inline-block w-24 border-b border-dotted border-slate-600 align-baseline" />{' '}
                    )
                  </div>
                )}
                <div className="font-mono text-[0.92em]">NIP. {nipWali}</div>
              </div>
            );
          })}

          <div className="text-left relative">
            <div>{activeConfig.kotaTanggalCetak || 'Surabaya, 20 November 2026'}</div>
            <div className="font-semibold">Kepala Sekolah,</div>
            <div className={`relative ${layoutSpec.sigHeight} flex items-center`}>
              <div className="absolute -left-7 -top-2 w-16 h-16 opacity-85 pointer-events-none z-20">
                {effectiveStempelUrl ? (
                  <img src={effectiveStempelUrl} alt="Stempel" className="w-full h-full object-contain" />
                ) : (
                  <SchoolStampSvg className="w-full h-full" />
                )}
              </div>
              {effectiveTtdUrl ? (
                <img
                  src={effectiveTtdUrl}
                  alt="TTD Kepala Sekolah"
                  className="h-13 max-w-[145px] object-contain object-left relative z-10"
                />
              ) : (
                <KepalaSekolahSignatureSvg className="h-13 w-32 relative z-10" />
              )}
            </div>
            <div className="font-bold underline relative z-10">{profile.kepalaSekolah}</div>
            <div className="font-mono text-[0.92em]">NIP. {profile.nipKepalaSekolah}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
