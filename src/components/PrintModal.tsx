import React, { useEffect, useState } from 'react';
import { SuratMasuk, SuratKeluar, SchoolProfile, User } from '../types';
import { OfficialKopSurat } from './OfficialKopSurat';
import { OfficialQrStamp } from './OfficialQrStamp';
import { targetDisposisiList, instruksiDisposisiOptions } from '../data/initialData';
import { PrintTypographyBar } from './PrintTypographyBar';
import {
  getPrintTypographyStyleVars,
  getScopedPrintTypographyCss,
  getStoredPrintTypography,
  PrintTypographySettings,
  resolvePrintSpacingMeta,
  saveStoredPrintTypography
} from '../utils/printTypography';
import { Printer, X } from 'lucide-react';

export interface PrintConfig {
  type: 'lembar-disposisi' | 'surat-resmi' | 'rekapitulasi' | 'agenda-masuk' | 'agenda-keluar';
  surat?: SuratMasuk | SuratKeluar;
  periodText?: string;
}

interface PrintModalProps {
  config: PrintConfig;
  profile: SchoolProfile;
  currentUser: User;
  suratMasukList: SuratMasuk[];
  suratKeluarList: SuratKeluar[];
  onClose: () => void;
}

type PrintPaper = 'A4' | 'F4';
type PrintOri = 'portrait' | 'landscape';

export const PrintModal: React.FC<PrintModalProps> = ({
  config,
  profile,
  currentUser,
  suratMasukList,
  suratKeluarList,
  onClose
}) => {
  const defaultOri: PrintOri =
    config.type === 'agenda-masuk' || config.type === 'agenda-keluar' ? 'landscape' : 'portrait';
  const defaultFont = config.type === 'surat-resmi' ? 'times' : 'inter';

  const [paperSize, setPaperSize] = useState<PrintPaper>('F4');
  const [orientation, setOrientation] = useState<PrintOri>(defaultOri);
  const [previewZoomPct, setPreviewZoomPct] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 48 : 85
  );
  const [typography, setTypography] = useState<PrintTypographySettings>(() =>
    getStoredPrintTypography(`sman9_print_modal_typo_${config.type}`, {
      fontFamily: defaultFont,
      lineSpacing: 'nyaman',
      fontScalePct: 100
    })
  );

  useEffect(() => {
    saveStoredPrintTypography(`sman9_print_modal_typo_${config.type}`, typography);
  }, [config.type, typography]);

  const handlePrint = () => {
    window.print();
  };

  const isMasuk = (surat: SuratMasuk | SuratKeluar | undefined): surat is SuratMasuk => {
    return !!surat && 'tanggalTerima' in surat;
  };

  const isKeluar = (surat: SuratMasuk | SuratKeluar | undefined): surat is SuratKeluar => {
    return !!surat && 'tujuan' in surat;
  };

  const pageWidthMm =
    orientation === 'landscape' ? (paperSize === 'F4' ? 330 : 297) : paperSize === 'F4' ? 215 : 210;
  const pageHeightMm =
    orientation === 'landscape' ? (paperSize === 'F4' ? 215 : 210) : paperSize === 'F4' ? 330 : 297;
  const printCssSize =
    paperSize === 'F4'
      ? orientation === 'landscape'
        ? '330mm 215mm'
        : '215mm 330mm'
      : `A4 ${orientation}`;

  const spMeta = resolvePrintSpacingMeta(typography.lineSpacing);
  const scale = (typography.fontScalePct || 100) / 100;
  const typoStyle = getPrintTypographyStyleVars(typography);

  const fs = (basePx: number) => `${(basePx * scale).toFixed(1)}px`;
  const gapPx = (basePx: number) => `${Math.round(basePx * spMeta.scaleFactor)}px`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-xs overflow-hidden print:static print:block print:bg-white print:overflow-visible">
      <style>{`
        ${getScopedPrintTypographyCss('.pm-sheet-scope')}
        @media print {
          @page {
            size: ${printCssSize};
            margin: 12mm 14mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pm-preview-zoom-wrap {
            zoom: 1 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .pm-sheet {
            width: 100% !important;
            min-height: ${pageHeightMm - 26}mm !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Top Sticky Action & Proportional Spacing Bar (Hidden on print) */}
      <div className="no-print shrink-0 z-50 bg-slate-900/95 border-b border-slate-700 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          {/* Paper size */}
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-0.5 text-[11px]">
            {(['F4', 'A4'] as PrintPaper[]).map(sz => (
              <button
                key={sz}
                type="button"
                onClick={() => setPaperSize(sz)}
                className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  paperSize === sz ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {sz === 'F4' ? 'F4 / Folio' : 'A4'}
              </button>
            ))}
          </div>

          {/* Orientation */}
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-800 p-0.5 text-[11px]">
            {(['portrait', 'landscape'] as PrintOri[]).map(ori => (
              <button
                key={ori}
                type="button"
                onClick={() => setOrientation(ori)}
                className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  orientation === ori ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {ori === 'portrait' ? 'Potret' : 'Lanskap'}
              </button>
            ))}
          </div>

          <PrintTypographyBar
            value={typography}
            onChange={setTypography}
            previewZoomPct={previewZoomPct}
            onPreviewZoomChange={setPreviewZoomPct}
            zoomPresets={[50, 65, 85, 100]}
            darkSurface
            compact
          />
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Tutup Pratinjau"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Proportional Preview Canvas */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 print:p-0 print:overflow-visible">
        <div
          className="pm-preview-zoom-wrap mx-auto w-fit print:w-full"
          style={{ zoom: previewZoomPct / 100 }}
        >
          {/* Printable Sheet Wrapper */}
          <div
            className="pm-sheet pm-sheet-scope bg-white text-black shadow-2xl rounded-sm box-border flex flex-col justify-between print-container"
            style={{
              ...typoStyle,
              width: `${pageWidthMm}mm`,
              minHeight: `${pageHeightMm}mm`,
              padding: '13mm 15mm'
            }}
          >
            {/* ===================== FORMAT 1: LEMBAR DISPOSISI RESMI ===================== */}
            {config.type === 'lembar-disposisi' && config.surat && isMasuk(config.surat) && (
              <div
                className="flex-1 flex flex-col justify-between"
                style={{ fontSize: fs(12), rowGap: gapPx(14) }}
              >
                <div className="pt-stack" style={{ display: 'flex', flexDirection: 'column', gap: gapPx(14) }}>
                  <OfficialKopSurat profile={profile} />

                  <div className="text-center py-1">
                    <h2
                      className="font-bold uppercase tracking-wider underline"
                      style={{ fontSize: fs(16) }}
                    >
                      LEMBAR DISPOSISI
                    </h2>
                    <p className="font-mono text-slate-700 mt-0.5 tabular-nums" style={{ fontSize: fs(11) }}>
                      NO. AGENDA: <strong className="text-slate-900">{config.surat.nomorAgenda}</strong>
                    </p>
                  </div>

                  {/* Tabel Identitas Surat Masuk */}
                  <table className="w-full border-collapse border border-black pt-table" style={{ fontSize: fs(11.5) }}>
                    <tbody>
                      <tr>
                        <td className="border border-black w-1/2 align-top">
                          <span className="font-semibold block text-slate-700" style={{ fontSize: fs(10.5) }}>
                            Surat Dari:
                          </span>
                          <span className="font-bold" style={{ fontSize: fs(12.5) }}>
                            {config.surat.pengirim}
                          </span>
                        </td>
                        <td className="border border-black w-1/2 align-top">
                          <div className="grid grid-cols-2 gap-2" style={{ fontSize: fs(11) }}>
                            <div>
                              <span className="text-slate-600 block">Diterima Tanggal:</span>
                              <span className="font-mono font-bold tabular-nums">{config.surat.tanggalTerima}</span>
                            </div>
                            <div>
                              <span className="text-slate-600 block">No. Agenda:</span>
                              <span className="font-mono font-bold tabular-nums">{config.surat.nomorAgenda}</span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="border border-black align-top">
                          <div className="grid grid-cols-2 gap-2" style={{ fontSize: fs(11) }}>
                            <div>
                              <span className="text-slate-600 block">Nomor Surat:</span>
                              <span className="font-mono font-bold tabular-nums">{config.surat.nomorSurat}</span>
                            </div>
                            <div>
                              <span className="text-slate-600 block">Tanggal Surat:</span>
                              <span className="font-mono font-bold tabular-nums">{config.surat.tanggalSurat}</span>
                            </div>
                          </div>
                        </td>
                        <td className="border border-black align-top">
                          <span className="font-semibold block mb-1" style={{ fontSize: fs(10.5) }}>
                            Sifat Surat:
                          </span>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ fontSize: fs(11) }}>
                            {(['Sangat Segera', 'Segera', 'Biasa', 'Rahasia'] as const).map(sf => (
                              <span
                                key={sf}
                                className={
                                  config.surat?.sifat === sf ? 'font-black underline' : 'text-slate-600'
                                }
                              >
                                [{config.surat?.sifat === sf ? '✔' : ' '}] {sf}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td colSpan={2} className="border border-black">
                          <span className="font-semibold block text-slate-700" style={{ fontSize: fs(10.5) }}>
                            Perihal / Isi Ringkas:
                          </span>
                          <p className="font-bold mt-0.5 leading-snug" style={{ fontSize: fs(13) }}>
                            {config.surat.perihal}
                          </p>
                          {config.surat.ringkasan && (
                            <p className="text-slate-700 mt-1 italic" style={{ fontSize: fs(11) }}>
                              {config.surat.ringkasan}
                            </p>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Checklist Penerima & Petunjuk Disposisi */}
                  {(() => {
                    const disp = config.surat.disposisiList[0];
                    const diteruskan = disp ? disp.diteruskanKepada : [];
                    const instruksi = disp ? disp.instruksi : [];

                    return (
                      <div
                        className="grid grid-cols-2 border border-black divide-x divide-black"
                        style={{ fontSize: fs(11.5) }}
                      >
                        <div className="p-3.5" style={{ display: 'flex', flexDirection: 'column', gap: gapPx(6) }}>
                          <h4
                            className="font-bold uppercase pb-1.5 border-b border-black mb-1"
                            style={{ fontSize: fs(11) }}
                          >
                            Diteruskan Kepada Sdr:
                          </h4>
                          {targetDisposisiList.map(target => (
                            <div key={target} className="flex items-start gap-2">
                              <span className="font-mono w-4 shrink-0">
                                {diteruskan.includes(target) ? '☑' : '☐'}
                              </span>
                              <span className={diteruskan.includes(target) ? 'font-bold' : 'text-slate-800'}>
                                {target}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="p-3.5" style={{ display: 'flex', flexDirection: 'column', gap: gapPx(6) }}>
                          <h4
                            className="font-bold uppercase pb-1.5 border-b border-black mb-1"
                            style={{ fontSize: fs(11) }}
                          >
                            Petunjuk / Arahan:
                          </h4>
                          {instruksiDisposisiOptions.map(instr => (
                            <div key={instr} className="flex items-start gap-2">
                              <span className="font-mono w-4 shrink-0">
                                {instruksi.includes(instr) ? '☑' : '☐'}
                              </span>
                              <span className={instruksi.includes(instr) ? 'font-bold' : 'text-slate-800'}>
                                {instr}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Catatan Khusus Pimpinan */}
                  <div className="border border-black p-3.5 space-y-2">
                    <h4 className="font-bold uppercase" style={{ fontSize: fs(11) }}>
                      Catatan Khusus Kepala Sekolah / Pejabat Disposisi:
                    </h4>
                    <div
                      className="min-h-[82px] p-3 bg-slate-50 border border-slate-300 rounded"
                      style={{ fontSize: fs(12), lineHeight: spMeta.lineHeight }}
                    >
                      {config.surat.disposisiList[0]?.catatanKhusus || (
                        <span className="text-slate-400 italic">
                          (Tidak ada catatan tambahan - laksanakan instruksi di atas sesuai SOP yang berlaku)
                        </span>
                      )}
                    </div>
                    {config.surat.disposisiList[0]?.tenggatWaktu && (
                      <div className="font-mono text-slate-800 tabular-nums" style={{ fontSize: fs(11) }}>
                        Batas Waktu Penyelesaian: <strong>{config.surat.disposisiList[0].tenggatWaktu}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kotak Pengesahan & Validasi TTE */}
                <div className="flex items-end justify-between pt-6 mt-4 border-t border-slate-200">
                  <OfficialQrStamp
                    code={config.surat.nomorAgenda}
                    label="Lembar Disposisi Sah"
                    verifier={profile.kepalaSekolah}
                  />

                  <div className="text-center min-w-[210px]" style={{ fontSize: fs(11.5) }}>
                    <p className="tabular-nums">
                      {(profile.kota || 'Surabaya').replace(/^Kota\s+/i, '')}, {config.surat.tanggalTerima}
                    </p>
                    <p className="font-bold mt-0.5">Kepala {profile.namaSekolah}</p>
                    <div className="h-16 flex items-center justify-center">
                      <span className="font-serif italic text-blue-900 font-bold text-sm">
                        {profile.kepalaSekolah}
                      </span>
                    </div>
                    <p className="font-bold underline">{profile.kepalaSekolah}</p>
                    <p className="font-mono" style={{ fontSize: fs(10.5) }}>
                      {profile.pangkatKepsek}
                    </p>
                    <p className="font-mono tabular-nums" style={{ fontSize: fs(10.5) }}>
                      NIP. {profile.nipKepalaSekolah}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== FORMAT 2: SURAT KELUAR RESMI ===================== */}
            {config.type === 'surat-resmi' && config.surat && isKeluar(config.surat) && (
              <div
                className="flex-1 flex flex-col justify-between pt-prose"
                style={{ fontSize: fs(12.5), lineHeight: spMeta.lineHeight }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: gapPx(14) }}>
                  <OfficialKopSurat profile={profile} />

                  {/* Meta Nomor / Sifat / Lampiran / Perihal */}
                  <div className="flex justify-between items-start pt-1" style={{ fontSize: fs(12) }}>
                    <div className="space-y-1">
                      <div className="flex gap-3">
                        <span className="w-20 text-slate-700 shrink-0">Nomor</span>
                        <span className="font-bold font-mono tabular-nums">: {config.surat.nomorSurat}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="w-20 text-slate-700 shrink-0">Sifat</span>
                        <span>: {config.surat.sifat}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="w-20 text-slate-700 shrink-0">Lampiran</span>
                        <span>
                          :{' '}
                          {(config.surat.lampiran?.length || 0) > 0
                            ? `${config.surat.lampiran?.length} Berkas`
                            : '-'}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <span className="w-20 text-slate-700 shrink-0">Perihal</span>
                        <span className="font-bold">: {config.surat.perihal}</span>
                      </div>
                    </div>

                    <div className="text-right tabular-nums shrink-0">
                      <p>
                        {(profile.kota || 'Surabaya').replace(/^Kota\s+/i, '')}, {config.surat.tanggalSurat}
                      </p>
                    </div>
                  </div>

                  {/* Alamat Penerima */}
                  <div style={{ paddingTop: gapPx(10), fontSize: fs(12.5), lineHeight: spMeta.lineHeight }}>
                    <div>Kepada Yth.</div>
                    <div className="font-bold" style={{ fontSize: fs(13.5) }}>
                      {config.surat.tujuan}
                    </div>
                    <div>di Tempat</div>
                  </div>

                  {/* Isi Batang Tubuh Surat */}
                  {(config.surat as any).customBody ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: gapPx(12), fontSize: fs(12.5) }}>
                      {(config.surat as any).customBody.dasarHukum && (
                        <div
                          className="p-3 bg-slate-50 border-l-2 border-slate-500 italic text-slate-800"
                          style={{ fontSize: fs(11.5), lineHeight: spMeta.lineHeight }}
                        >
                          <span className="font-bold not-italic">Dasar: </span>
                          {(config.surat as any).customBody.dasarHukum}
                        </div>
                      )}

                      <p className="text-justify" style={{ lineHeight: spMeta.lineHeight }}>
                        {(config.surat as any).customBody.pembuka}
                      </p>

                      {/* Tabel Guru Terpilih jika ada */}
                      {(config.surat as any).customBody.gurus?.length > 0 && (
                        <div className="my-1">
                          <div className="font-bold text-slate-800 uppercase mb-1.5" style={{ fontSize: fs(10.5) }}>
                            Daftar Tenaga Pendidik Yang Ditugaskan:
                          </div>
                          <table className="w-full border-collapse border border-black pt-table" style={{ fontSize: fs(11) }}>
                            <thead>
                              <tr className="bg-slate-100 border-b border-black text-slate-900">
                                <th className="border border-black text-center w-8">No</th>
                                <th className="border border-black text-left">Nama & Gelar</th>
                                <th className="border border-black text-left">NIP</th>
                                <th className="border border-black text-left">Pangkat / Gol.</th>
                                <th className="border border-black text-left">Jabatan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(config.surat as any).customBody.gurus.map((g: any, idx: number) => (
                                <tr key={g.id || idx}>
                                  <td className="border border-black text-center tabular-nums">{idx + 1}</td>
                                  <td className="border border-black font-bold">{g.nama}</td>
                                  <td className="border border-black font-mono tabular-nums">{g.nip}</td>
                                  <td className="border border-black">{g.pangkatGolongan}</td>
                                  <td className="border border-black">{g.jabatan}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tabel Siswa Terpilih jika ada */}
                      {(config.surat as any).customBody.siswas?.length > 0 && (
                        <div className="my-1">
                          <div className="font-bold text-slate-800 uppercase mb-1.5" style={{ fontSize: fs(10.5) }}>
                            Daftar Siswa Peserta / Delegasi:
                          </div>
                          <table className="w-full border-collapse border border-black pt-table" style={{ fontSize: fs(11) }}>
                            <thead>
                              <tr className="bg-slate-100 border-b border-black text-slate-900">
                                <th className="border border-black text-center w-8">No</th>
                                <th className="border border-black text-left">Nama Siswa</th>
                                <th className="border border-black text-center">NIS / NISN</th>
                                <th className="border border-black text-center">Kelas</th>
                                <th className="border border-black text-left">Keterangan / Prestasi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(config.surat as any).customBody.siswas.map((s: any, idx: number) => {
                                const safeNis = s.nipd || s.nis || '-';
                                const safeNisn = s.nisn ? ` / ${s.nisn}` : '';
                                const safeKelas = s.rombelSaatIni || s.kelas || '-';
                                const safePrestasi =
                                  typeof s.prestasi === 'string'
                                    ? s.prestasi
                                    : Array.isArray(s.prestasi) && s.prestasi.length > 0
                                      ? s.prestasi.join(', ')
                                      : 'Peserta / Delegasi Siswa';
                                return (
                                  <tr key={s.id || idx}>
                                    <td className="border border-black text-center tabular-nums">{idx + 1}</td>
                                    <td className="border border-black font-bold">{s.nama}</td>
                                    <td className="border border-black text-center font-mono tabular-nums">
                                      {safeNis}
                                      {safeNisn}
                                    </td>
                                    <td className="border border-black text-center font-semibold">{safeKelas}</td>
                                    <td className="border border-black">{safePrestasi}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div
                        className="pt-para text-justify whitespace-pre-line"
                        style={{ lineHeight: spMeta.lineHeight }}
                      >
                        {(config.surat as any).customBody.isi}
                      </div>

                      {(config.surat as any).customBody.diktumTugas && (
                        <div className="p-3 bg-slate-50 border border-slate-300 rounded">
                          <span className="font-bold">Ketentuan & Tugas:</span>
                          <div className="whitespace-pre-line mt-1" style={{ lineHeight: spMeta.lineHeight }}>
                            {(config.surat as any).customBody.diktumTugas}
                          </div>
                        </div>
                      )}

                      <p className="text-justify" style={{ lineHeight: spMeta.lineHeight }}>
                        {(config.surat as any).customBody.penutup}
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: gapPx(12),
                        fontSize: fs(13),
                        lineHeight: spMeta.lineHeight
                      }}
                      className="text-justify pt-2"
                    >
                      <p>Dengan hormat,</p>
                      <p>
                        Menindaklanjuti program kerja dan tertib administrasi persuratan {profile.namaSekolah},
                        dengan ini kami sampaikan hal-hal sebagai berikut:
                      </p>
                      <div className="p-4 bg-slate-50 border-l-2 border-slate-500 my-1 text-slate-900">
                        {config.surat.ringkasanIsi || config.surat.perihal}
                      </div>
                      <p>
                        Demikian surat ini kami sampaikan untuk menjadi perhatian dan dapat dipergunakan
                        sebagaimana mestinya. Atas kerja sama dan perhatian yang diberikan, kami ucapkan terima
                        kasih.
                      </p>
                    </div>
                  )}
                </div>

                {/* Penandatangan & Tembusan Bawah */}
                <div className="pt-8">
                  <div className="flex items-end justify-between">
                    <OfficialQrStamp
                      code={config.surat.nomorSurat}
                      label="Dokumen Resmi Sekolah"
                      verifier={config.surat.penandatangan || profile.kepalaSekolah}
                    />

                    <div className="text-center min-w-[215px]" style={{ fontSize: fs(12) }}>
                      <p className="font-semibold">Kepala {profile.namaSekolah}</p>
                      <div className="h-16 flex items-center justify-center">
                        <span className="font-serif italic text-blue-950 font-bold text-sm">
                          {config.surat.penandatangan || profile.kepalaSekolah}
                        </span>
                      </div>
                      <p className="font-bold underline">
                        {config.surat.penandatangan || profile.kepalaSekolah}
                      </p>
                      <p className="font-mono" style={{ fontSize: fs(10.5) }}>
                        {profile.pangkatKepsek}
                      </p>
                      <p className="font-mono tabular-nums" style={{ fontSize: fs(10.5) }}>
                        NIP. {profile.nipKepalaSekolah}
                      </p>
                    </div>
                  </div>

                  {((config.surat as any).customBody?.tembusan || config.surat.tembusan || []).length > 0 && (
                    <div
                      className="pt-4 mt-5 border-t border-slate-300 text-slate-700"
                      style={{ fontSize: fs(10.5), lineHeight: spMeta.lineHeight }}
                    >
                      <p className="font-bold">Tembusan disampaikan kepada Yth:</p>
                      <ol className="list-decimal pl-5 mt-1 space-y-0.5">
                        {((config.surat as any).customBody?.tembusan || config.surat.tembusan || []).map(
                          (t: string, idx: number) => (
                            <li key={idx}>{t}</li>
                          )
                        )}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================== FORMAT 3: REKAPITULASI LAPORAN PERSURATAN ===================== */}
            {config.type === 'rekapitulasi' && (
              <div
                className="flex-1 flex flex-col justify-between"
                style={{ fontSize: fs(11.5), rowGap: gapPx(14) }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: gapPx(14) }}>
                  <OfficialKopSurat profile={profile} />

                  <div className="text-center py-1">
                    <h2
                      className="font-bold uppercase tracking-wider underline"
                      style={{ fontSize: fs(15.5) }}
                    >
                      LAPORAN REKAPITULASI PENGELOLAAN PERSURATAN
                    </h2>
                    <p className="text-slate-700 font-semibold mt-0.5" style={{ fontSize: fs(11.5) }}>
                      PERIODE: {config.periodText || 'Bulan Oktober 2026'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 border border-black rounded-sm">
                      <span className="block text-slate-600" style={{ fontSize: fs(10.5) }}>
                        Total Surat Masuk
                      </span>
                      <span className="font-bold font-mono tabular-nums" style={{ fontSize: fs(20) }}>
                        {suratMasukList.length}
                      </span>
                    </div>
                    <div className="p-3 border border-black rounded-sm">
                      <span className="block text-slate-600" style={{ fontSize: fs(10.5) }}>
                        Total Surat Keluar
                      </span>
                      <span className="font-bold font-mono tabular-nums" style={{ fontSize: fs(20) }}>
                        {suratKeluarList.length}
                      </span>
                    </div>
                    <div className="p-3 border border-black rounded-sm">
                      <span className="block text-slate-600" style={{ fontSize: fs(10.5) }}>
                        Disposisi Selesai
                      </span>
                      <span
                        className="font-bold font-mono text-emerald-800 tabular-nums"
                        style={{ fontSize: fs(20) }}
                      >
                        {suratMasukList.filter(s => s.status === 'Selesai').length}
                      </span>
                    </div>
                  </div>

                  {/* Rincian Surat Masuk */}
                  <div>
                    <h4
                      className="font-bold uppercase pb-1 mb-2 border-b border-black"
                      style={{ fontSize: fs(11.5) }}
                    >
                      1. Daftar Surat Masuk Utama
                    </h4>
                    <table className="w-full border-collapse border border-black pt-table" style={{ fontSize: fs(10.8) }}>
                      <thead className="bg-slate-100 font-bold">
                        <tr>
                          <th className="border border-black w-8 text-center">No</th>
                          <th className="border border-black">No. Agenda</th>
                          <th className="border border-black">Asal Surat</th>
                          <th className="border border-black">Perihal</th>
                          <th className="border border-black">Status Disposisi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suratMasukList.map((s, idx) => (
                          <tr key={s.id}>
                            <td className="border border-black text-center font-mono tabular-nums">{idx + 1}</td>
                            <td className="border border-black font-mono font-semibold tabular-nums">
                              {s.nomorAgenda}
                            </td>
                            <td className="border border-black font-medium">{s.pengirim}</td>
                            <td className="border border-black">{s.perihal}</td>
                            <td className="border border-black font-medium">{s.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Rincian Surat Keluar */}
                  <div>
                    <h4
                      className="font-bold uppercase pb-1 mb-2 border-b border-black"
                      style={{ fontSize: fs(11.5) }}
                    >
                      2. Daftar Surat Keluar Utama
                    </h4>
                    <table className="w-full border-collapse border border-black pt-table" style={{ fontSize: fs(10.8) }}>
                      <thead className="bg-slate-100 font-bold">
                        <tr>
                          <th className="border border-black w-8 text-center">No</th>
                          <th className="border border-black">No. Surat Keluar</th>
                          <th className="border border-black">Tujuan</th>
                          <th className="border border-black">Perihal</th>
                          <th className="border border-black">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suratKeluarList.map((k, idx) => (
                          <tr key={k.id}>
                            <td className="border border-black text-center font-mono tabular-nums">{idx + 1}</td>
                            <td className="border border-black font-mono font-semibold tabular-nums">
                              {k.nomorSurat}
                            </td>
                            <td className="border border-black font-medium">{k.tujuan}</td>
                            <td className="border border-black">{k.perihal}</td>
                            <td className="border border-black font-medium">{k.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Kolom Tanda Tangan Ganda: Kepala TU & Kepala Sekolah */}
                <div
                  className="grid grid-cols-2 pt-8 mt-4 border-t border-slate-200 text-center"
                  style={{ fontSize: fs(11.5) }}
                >
                  <div>
                    <p>Mengetahui / Memeriksa,</p>
                    <p className="font-bold">Kepala Urusan Tata Usaha</p>
                    <div className="h-16 flex items-center justify-center">
                      <span className="font-serif italic text-slate-800 font-semibold">{profile.kepalaTU}</span>
                    </div>
                    <p className="font-bold underline">{profile.kepalaTU}</p>
                    <p className="font-mono tabular-nums" style={{ fontSize: fs(10.5) }}>
                      NIP. {profile.nipKepalaTU}
                    </p>
                  </div>

                  <div>
                    <p className="tabular-nums">
                      {(profile.kota || 'Surabaya').replace(/^Kota\s+/i, '')},{' '}
                      {new Date().toISOString().split('T')[0]}
                    </p>
                    <p className="font-bold">Kepala {profile.namaSekolah}</p>
                    <div className="h-16 flex items-center justify-center">
                      <span className="font-serif italic text-blue-900 font-semibold">{profile.kepalaSekolah}</span>
                    </div>
                    <p className="font-bold underline">{profile.kepalaSekolah}</p>
                    <p className="font-mono tabular-nums" style={{ fontSize: fs(10.5) }}>
                      NIP. {profile.nipKepalaSekolah}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ===================== FORMAT 4: BUKU AGENDA REGISTER MASUK / KELUAR ===================== */}
            {(config.type === 'agenda-masuk' || config.type === 'agenda-keluar') && (
              <div
                className="flex-1 flex flex-col justify-between"
                style={{ fontSize: fs(11), rowGap: gapPx(12) }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: gapPx(12) }}>
                  <OfficialKopSurat profile={profile} compact={true} />

                  <div className="text-center py-1">
                    <h2
                      className="font-bold uppercase tracking-wider underline"
                      style={{ fontSize: fs(14.5) }}
                    >
                      {config.type === 'agenda-masuk'
                        ? 'BUKU REGISTER AGENDA SURAT MASUK KEDINASAN'
                        : 'BUKU REGISTER AGENDA SURAT KELUAR KEDINASAN'}
                    </h2>
                    <p className="text-slate-700 font-mono mt-0.5" style={{ fontSize: fs(10.5) }}>
                      Satuan Kerja: {profile.namaSekolah} · {config.periodText || 'Tahun 2026'}
                    </p>
                  </div>

                  <table
                    className="w-full border-collapse border border-black pt-table"
                    style={{ fontSize: fs(10.3) }}
                  >
                    <thead className="bg-slate-100 font-bold select-none">
                      <tr>
                        <th className="border border-black w-8 text-center">No</th>
                        <th className="border border-black">No. Agenda</th>
                        <th className="border border-black">Tanggal</th>
                        <th className="border border-black">
                          {config.type === 'agenda-masuk' ? 'Pengirim' : 'Tujuan'}
                        </th>
                        <th className="border border-black">No. Surat</th>
                        <th className="border border-black">Perihal</th>
                        <th className="border border-black text-center">Kode</th>
                        <th className="border border-black">
                          {config.type === 'agenda-masuk' ? 'Disposisi' : 'Status'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.type === 'agenda-masuk'
                        ? suratMasukList.map((item, idx) => (
                            <tr key={item.id}>
                              <td className="border border-black text-center font-mono tabular-nums">{idx + 1}</td>
                              <td className="border border-black font-mono font-semibold tabular-nums">
                                {item.nomorAgenda}
                              </td>
                              <td className="border border-black font-mono tabular-nums">{item.tanggalTerima}</td>
                              <td className="border border-black font-medium">{item.pengirim}</td>
                              <td className="border border-black font-mono tabular-nums">{item.nomorSurat}</td>
                              <td className="border border-black">{item.perihal}</td>
                              <td className="border border-black font-mono text-center tabular-nums">
                                {item.kodeKlasifikasi}
                              </td>
                              <td className="border border-black">
                                {item.disposisiList.length > 0
                                  ? item.disposisiList[0].diteruskanKepada.join(', ')
                                  : '-'}
                              </td>
                            </tr>
                          ))
                        : suratKeluarList.map((item, idx) => (
                            <tr key={item.id}>
                              <td className="border border-black text-center font-mono tabular-nums">{idx + 1}</td>
                              <td className="border border-black font-mono font-semibold tabular-nums">
                                {item.nomorAgenda}
                              </td>
                              <td className="border border-black font-mono tabular-nums">{item.tanggalSurat}</td>
                              <td className="border border-black font-medium">{item.tujuan}</td>
                              <td className="border border-black font-mono tabular-nums">{item.nomorSurat}</td>
                              <td className="border border-black">{item.perihal}</td>
                              <td className="border border-black font-mono text-center tabular-nums">
                                {item.kodeKlasifikasi}
                              </td>
                              <td className="border border-black font-semibold">{item.status}</td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>

                <div
                  className="flex items-end justify-between pt-6 mt-4 border-t border-slate-200"
                  style={{ fontSize: fs(11) }}
                >
                  <div>
                    <p className="tabular-nums">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
                    <p className="font-mono">
                      Operator: {currentUser.name} ({currentUser.jabatan})
                    </p>
                  </div>

                  <div className="text-center min-w-[200px]">
                    <p>Kepala Urusan Tata Usaha,</p>
                    <div className="h-14 flex items-center justify-center">
                      <span className="font-serif italic font-semibold">{profile.kepalaTU}</span>
                    </div>
                    <p className="font-bold underline">{profile.kepalaTU}</p>
                    <p className="font-mono tabular-nums">NIP. {profile.nipKepalaTU}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
