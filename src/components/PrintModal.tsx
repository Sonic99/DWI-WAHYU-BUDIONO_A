import React from 'react';
import { SuratMasuk, SuratKeluar, SchoolProfile, User } from '../types';
import { OfficialKopSurat } from './OfficialKopSurat';
import { OfficialQrStamp } from './OfficialQrStamp';
import { targetDisposisiList, instruksiDisposisiOptions } from '../data/initialData';
import { Printer, X, Download } from 'lucide-react';

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

export const PrintModal: React.FC<PrintModalProps> = ({
  config,
  profile,
  currentUser,
  suratMasukList,
  suratKeluarList,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isMasuk = (surat: SuratMasuk | SuratKeluar | undefined): surat is SuratMasuk => {
    return !!surat && 'tanggalTerima' in surat;
  };

  const isKeluar = (surat: SuratMasuk | SuratKeluar | undefined): surat is SuratKeluar => {
    return !!surat && 'tujuan' in surat;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:static print:block print:bg-white print:p-0 print:overflow-visible">
      {/* Floating Action Bar (Hidden during print) */}
      <div className="fixed top-4 right-6 z-50 flex items-center gap-2 no-print bg-slate-900/90 p-2 rounded-lg shadow-xl border border-slate-700">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Dokumen Sekarang</span>
        </button>
        <button
          onClick={onClose}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Tutup Pratinjau"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Printable Sheet Wrapper */}
      <div className="bg-white text-black w-full max-w-4xl min-h-[90vh] my-10 p-8 sm:p-12 shadow-2xl rounded-sm print-container print:p-0 print:m-0 print:shadow-none print:w-full">
        {/* ===================== FORMAT 1: LEMBAR DISPOSISI RESMI ===================== */}
        {config.type === 'lembar-disposisi' && config.surat && isMasuk(config.surat) && (
          <div className="space-y-4 text-xs font-sans">
            <OfficialKopSurat profile={profile} />

            <div className="text-center py-1">
              <h2 className="text-base font-bold uppercase tracking-wider underline">
                LEMBAR DISPOSISI
              </h2>
              <p className="text-[11px] font-mono text-slate-700 mt-0.5">
                NO. AGENDA: <strong className="text-slate-900">{config.surat.nomorAgenda}</strong>
              </p>
            </div>

            {/* Tabel Identitas Surat Masuk */}
            <table className="w-full border-collapse border border-black text-xs">
              <tbody>
                <tr>
                  <td className="border border-black p-2 w-1/2">
                    <span className="font-semibold block text-[11px]">Surat Dari:</span>
                    <span className="font-bold text-[12px]">{config.surat.pengirim}</span>
                  </td>
                  <td className="border border-black p-2 w-1/2">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-600 block">Diterima Tanggal:</span>
                        <span className="font-mono font-bold">{config.surat.tanggalTerima}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block">No. Agenda:</span>
                        <span className="font-mono font-bold">{config.surat.nomorAgenda}</span>
                      </div>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td className="border border-black p-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-600 block">Nomor Surat:</span>
                        <span className="font-mono font-bold">{config.surat.nomorSurat}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block">Tanggal Surat:</span>
                        <span className="font-mono font-bold">{config.surat.tanggalSurat}</span>
                      </div>
                    </div>
                  </td>
                  <td className="border border-black p-2">
                    <span className="font-semibold block text-[11px] mb-1">Sifat Surat:</span>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className={config.surat.sifat === 'Sangat Segera' ? 'font-black underline' : 'text-slate-600'}>
                        [{config.surat.sifat === 'Sangat Segera' ? '✔' : ' '}] Sangat Segera
                      </span>
                      <span className={config.surat.sifat === 'Segera' ? 'font-black underline' : 'text-slate-600'}>
                        [{config.surat.sifat === 'Segera' ? '✔' : ' '}] Segera
                      </span>
                      <span className={config.surat.sifat === 'Biasa' ? 'font-black underline' : 'text-slate-600'}>
                        [{config.surat.sifat === 'Biasa' ? '✔' : ' '}] Biasa
                      </span>
                      <span className={config.surat.sifat === 'Rahasia' ? 'font-black underline' : 'text-slate-600'}>
                        [{config.surat.sifat === 'Rahasia' ? '✔' : ' '}] Rahasia
                      </span>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td colSpan={2} className="border border-black p-2.5">
                    <span className="font-semibold block text-[11px] text-slate-700">Perihal / Isi Ringkas:</span>
                    <p className="font-bold text-sm mt-0.5 leading-snug">{config.surat.perihal}</p>
                    {config.surat.ringkasan && (
                      <p className="text-[11px] text-slate-700 mt-1 italic">{config.surat.ringkasan}</p>
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
                <div className="grid grid-cols-2 border border-black divide-x divide-black text-xs">
                  {/* Kolom 1: Diteruskan Kepada */}
                  <div className="p-3 space-y-1.5">
                    <h4 className="font-bold uppercase text-[11px] pb-1 border-b border-black mb-2">
                      Diteruskan Kepada Sdr:
                    </h4>
                    {targetDisposisiList.map(target => (
                      <div key={target} className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono text-xs w-4">
                          {diteruskan.includes(target) ? '☑' : '☐'}
                        </span>
                        <span className={diteruskan.includes(target) ? 'font-bold' : 'text-slate-800'}>
                          {target}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Kolom 2: Petunjuk / Instruksi */}
                  <div className="p-3 space-y-1.5">
                    <h4 className="font-bold uppercase text-[11px] pb-1 border-b border-black mb-2">
                      Petunjuk / Arahan:
                    </h4>
                    {instruksiDisposisiOptions.map(instr => (
                      <div key={instr} className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono text-xs w-4">
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

            {/* Catatan Khusus Pimpinan & Tanda Tangan */}
            <div className="border border-black p-3 space-y-2">
              <h4 className="font-bold uppercase text-[11px]">
                Catatan Khusus Kepala Sekolah / Pejabat Disposisi:
              </h4>
              <div className="min-h-[60px] p-2 bg-slate-50 border border-slate-200 rounded text-xs font-serif leading-relaxed">
                {config.surat.disposisiList[0]?.catatanKhusus || (
                  <span className="text-slate-400 italic">
                    (Tidak ada catatan tambahan - laksanakan instruksi di atas sesuai SOP yang berlaku)
                  </span>
                )}
              </div>
              {config.surat.disposisiList[0]?.tenggatWaktu && (
                <div className="text-[11px] font-mono text-slate-800">
                  Batas Waktu Penyelesaian: <strong>{config.surat.disposisiList[0].tenggatWaktu}</strong>
                </div>
              )}
            </div>

            {/* Kotak Pengesahan & Validasi TTE */}
            <div className="flex items-end justify-between pt-4">
              <OfficialQrStamp 
                code={config.surat.nomorAgenda} 
                label="Lembar Disposisi Sah" 
                verifier={profile.kepalaSekolah}
              />

              <div className="text-center text-xs">
                <p>Surabaya, {config.surat.tanggalTerima}</p>
                <p className="font-bold mt-0.5">Kepala SMA Negeri 9 Surabaya</p>
                <div className="h-14 flex items-center justify-center">
                  <span className="font-serif italic text-blue-900 font-bold text-sm">
                    {profile.kepalaSekolah}
                  </span>
                </div>
                <p className="font-bold underline text-xs">{profile.kepalaSekolah}</p>
                <p className="text-[11px] font-mono">{profile.pangkatKepsek}</p>
                <p className="text-[11px] font-mono">NIP. {profile.nipKepalaSekolah}</p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== FORMAT 2: SURAT KELUAR RESMI ===================== */}
        {config.type === 'surat-resmi' && config.surat && isKeluar(config.surat) && (
          <div className="space-y-5 text-xs font-serif leading-relaxed">
            <OfficialKopSurat profile={profile} />

            <div className="flex justify-between items-start pt-2">
              <div className="space-y-1 font-sans text-xs">
                <div className="flex gap-4">
                  <span className="w-20 text-slate-600">Nomor</span>
                  <span className="font-bold font-mono">: {config.surat.nomorSurat}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-20 text-slate-600">Sifat</span>
                  <span>: {config.surat.sifat}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-20 text-slate-600">Lampiran</span>
                  <span>: {(config.surat.lampiran?.length || 0) > 0 ? `${config.surat.lampiran?.length} Berkas` : '-'}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-20 text-slate-600">Perihal</span>
                  <span className="font-bold">: {config.surat.perihal}</span>
                </div>
              </div>

              <div className="text-right font-sans text-xs">
                <p>Surabaya, {config.surat.tanggalSurat}</p>
              </div>
            </div>

            {/* Alamat Penerima */}
            <div className="pt-4 space-y-1 font-sans text-xs">
              <p>Kepada Yth.</p>
              <p className="font-bold text-sm">{config.surat.tujuan}</p>
              <p>di Tempat</p>
            </div>

            {/* Isi Batang Tubuh Surat */}
            {(config.surat as any).customBody ? (
              <div className="pt-2 space-y-3 font-sans text-xs">
                {(config.surat as any).customBody.dasarHukum && (
                  <div className="p-2.5 bg-slate-50 border-l-2 border-slate-400 italic text-slate-800 text-[11px]">
                    <span className="font-bold not-italic">Dasar: </span>
                    {(config.surat as any).customBody.dasarHukum}
                  </div>
                )}

                <p className="text-justify leading-relaxed">
                  {(config.surat as any).customBody.pembuka}
                </p>

                {/* Tabel Guru Terpilih jika ada */}
                {(config.surat as any).customBody.gurus?.length > 0 && (
                  <div className="my-2">
                    <div className="text-[10px] font-bold text-slate-800 uppercase mb-1">
                      Daftar Tenaga Pendidik Yang Ditugaskan:
                    </div>
                    <table className="w-full border-collapse border border-black text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-black text-slate-800">
                          <th className="border border-black px-2 py-1 text-center w-8">No</th>
                          <th className="border border-black px-2 py-1 text-left">Nama & Gelar</th>
                          <th className="border border-black px-2 py-1 text-left">NIP</th>
                          <th className="border border-black px-2 py-1 text-left">Pangkat / Gol.</th>
                          <th className="border border-black px-2 py-1 text-left">Jabatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(config.surat as any).customBody.gurus.map((g: any, idx: number) => (
                          <tr key={g.id || idx}>
                            <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                            <td className="border border-black px-2 py-1 font-bold">{g.nama}</td>
                            <td className="border border-black px-2 py-1 font-mono">{g.nip}</td>
                            <td className="border border-black px-2 py-1">{g.pangkatGolongan}</td>
                            <td className="border border-black px-2 py-1">{g.jabatan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tabel Siswa Terpilih jika ada */}
                {(config.surat as any).customBody.siswas?.length > 0 && (
                  <div className="my-2">
                    <div className="text-[10px] font-bold text-slate-800 uppercase mb-1">
                      Daftar Siswa Peserta / Delegasi:
                    </div>
                    <table className="w-full border-collapse border border-black text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-black text-slate-800">
                          <th className="border border-black px-2 py-1 text-center w-8">No</th>
                          <th className="border border-black px-2 py-1 text-left">Nama Siswa</th>
                          <th className="border border-black px-2 py-1 text-center">NIS / NISN</th>
                          <th className="border border-black px-2 py-1 text-center">Kelas</th>
                          <th className="border border-black px-2 py-1 text-left">Keterangan / Prestasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(config.surat as any).customBody.siswas.map((s: any, idx: number) => {
                          const safeNis = s.nipd || s.nis || '-';
                          const safeNisn = s.nisn ? ` / ${s.nisn}` : '';
                          const safeKelas = s.rombelSaatIni || s.kelas || '-';
                          const safePrestasi = typeof s.prestasi === 'string' 
                            ? s.prestasi 
                            : (Array.isArray(s.prestasi) && s.prestasi.length > 0 ? s.prestasi.join(', ') : 'Peserta / Delegasi Siswa SMANIX');
                          return (
                            <tr key={s.id || idx}>
                              <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                              <td className="border border-black px-2 py-1 font-bold">{s.nama}</td>
                              <td className="border border-black px-2 py-1 text-center font-mono">{safeNis}{safeNisn}</td>
                              <td className="border border-black px-2 py-1 text-center font-semibold">{safeKelas}</td>
                              <td className="border border-black px-2 py-1">{safePrestasi}</td>
                            </tr>
                          );
                        })}

                      </tbody>
                    </table>
                  </div>
                )}

                <div className="text-justify leading-relaxed whitespace-pre-line text-xs">
                  {(config.surat as any).customBody.isi}
                </div>

                {(config.surat as any).customBody.diktumTugas && (
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded text-xs">
                    <span className="font-bold">Ketentuan & Tugas:</span>
                    <div className="whitespace-pre-line mt-1">{(config.surat as any).customBody.diktumTugas}</div>
                  </div>
                )}

                <p className="text-justify leading-relaxed text-xs">
                  {(config.surat as any).customBody.penutup}
                </p>
              </div>
            ) : (
              <div className="pt-4 space-y-3 text-justify text-[13px] leading-relaxed">
                <p>Dengan hormat,</p>
                <p>
                  Menindaklanjuti program kerja dan tertib administrasi persuratan SMA Negeri 9 Surabaya, dengan ini kami sampaikan hal-hal sebagai berikut:
                </p>
                <div className="p-4 bg-slate-50 border-l-2 border-slate-400 my-2 text-slate-800">
                  {config.surat.ringkasanIsi || config.surat.perihal}
                </div>
                <p>
                  Demikian surat ini kami sampaikan untuk menjadi perhatian dan dapat dipergunakan sebagaimana mestinya. Atas kerja sama dan perhatian yang diberikan, kami ucapkan terima kasih.
                </p>
              </div>
            )}

            {/* Penandatangan & TTE */}
            <div className="flex items-end justify-between pt-8 font-sans">
              <OfficialQrStamp 
                code={config.surat.nomorSurat} 
                label="Dokumen Resmi SMANIX" 
                verifier={config.surat.penandatangan || profile.kepalaSekolah}
              />

              <div className="text-center text-xs min-w-[200px]">
                <p>Kepala SMA Negeri 9 Surabaya</p>
                <div className="h-14 flex items-center justify-center">
                  <span className="font-serif italic text-blue-950 font-bold text-sm">
                    {config.surat.penandatangan || profile.kepalaSekolah}
                  </span>
                </div>
                <p className="font-bold underline text-xs">{config.surat.penandatangan || profile.kepalaSekolah}</p>
                <p className="text-[11px] font-mono">{profile.pangkatKepsek}</p>
                <p className="text-[11px] font-mono">NIP. {profile.nipKepalaSekolah}</p>
              </div>
            </div>

            {/* Tembusan */}
            {((config.surat as any).customBody?.tembusan || config.surat.tembusan || []).length > 0 && (
              <div className="pt-4 border-t border-slate-300 font-sans text-[10px] text-slate-700">
                <p className="font-bold">Tembusan disampaikan kepada Yth:</p>
                <ol className="list-decimal pl-5 mt-0.5 space-y-0.5">
                  {((config.surat as any).customBody?.tembusan || config.surat.tembusan || []).map((t: string, idx: number) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ===================== FORMAT 3: REKAPITULASI LAPORAN PERSURATAN ===================== */}
        {config.type === 'rekapitulasi' && (
          <div className="space-y-5 text-xs font-sans">
            <OfficialKopSurat profile={profile} />

            <div className="text-center py-2">
              <h2 className="text-base font-bold uppercase tracking-wider underline">
                LAPORAN REKAPITULASI PENGELOLAAN PERSURATAN
              </h2>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">
                PERIODE: {config.periodText || 'Bulan Oktober 2026'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center py-2">
              <div className="p-3 border border-black rounded">
                <span className="text-[11px] block text-slate-600">Total Surat Masuk</span>
                <span className="text-xl font-bold font-mono">{suratMasukList.length}</span>
              </div>
              <div className="p-3 border border-black rounded">
                <span className="text-[11px] block text-slate-600">Total Surat Keluar</span>
                <span className="text-xl font-bold font-mono">{suratKeluarList.length}</span>
              </div>
              <div className="p-3 border border-black rounded">
                <span className="text-[11px] block text-slate-600">Disposisi Selesai</span>
                <span className="text-xl font-bold font-mono text-emerald-800">
                  {suratMasukList.filter(s => s.status === 'Selesai').length}
                </span>
              </div>
            </div>

            {/* Rincian Surat Masuk */}
            <h4 className="font-bold text-xs uppercase pt-2 border-b border-black">
              1. Daftar Surat Masuk Utama
            </h4>
            <table className="w-full border-collapse border border-black text-[11px]">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-black p-1.5 w-8">No</th>
                  <th className="border border-black p-1.5">No. Agenda</th>
                  <th className="border border-black p-1.5">Asal Surat</th>
                  <th className="border border-black p-1.5">Perihal</th>
                  <th className="border border-black p-1.5">Status Disposisi</th>
                </tr>
              </thead>
              <tbody>
                {suratMasukList.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                    <td className="border border-black p-1 font-mono font-semibold">{s.nomorAgenda}</td>
                    <td className="border border-black p-1 font-medium">{s.pengirim}</td>
                    <td className="border border-black p-1">{s.perihal}</td>
                    <td className="border border-black p-1 font-medium">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Rincian Surat Keluar */}
            <h4 className="font-bold text-xs uppercase pt-4 border-b border-black">
              2. Daftar Surat Keluar Utama
            </h4>
            <table className="w-full border-collapse border border-black text-[11px]">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="border border-black p-1.5 w-8">No</th>
                  <th className="border border-black p-1.5">No. Surat Keluar</th>
                  <th className="border border-black p-1.5">Tujuan</th>
                  <th className="border border-black p-1.5">Perihal</th>
                  <th className="border border-black p-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {suratKeluarList.map((k, idx) => (
                  <tr key={k.id}>
                    <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                    <td className="border border-black p-1 font-mono font-semibold">{k.nomorSurat}</td>
                    <td className="border border-black p-1 font-medium">{k.tujuan}</td>
                    <td className="border border-black p-1">{k.perihal}</td>
                    <td className="border border-black p-1 font-medium">{k.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Kolom Tanda Tangan Ganda: Kepala TU & Kepala Sekolah */}
            <div className="grid grid-cols-2 pt-10 text-center text-xs">
              <div>
                <p>Mengetahui / Memeriksa,</p>
                <p className="font-bold">Kepala Urusan Tata Usaha</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="font-serif italic text-slate-800 font-semibold">{profile.kepalaTU}</span>
                </div>
                <p className="font-bold underline">{profile.kepalaTU}</p>
                <p className="text-[11px] font-mono">NIP. {profile.nipKepalaTU}</p>
              </div>

              <div>
                <p>Surabaya, {new Date().toISOString().split('T')[0]}</p>
                <p className="font-bold">Kepala SMA Negeri 9 Surabaya</p>
                <div className="h-16 flex items-center justify-center">
                  <span className="font-serif italic text-blue-900 font-semibold">{profile.kepalaSekolah}</span>
                </div>
                <p className="font-bold underline">{profile.kepalaSekolah}</p>
                <p className="text-[11px] font-mono">NIP. {profile.nipKepalaSekolah}</p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== FORMAT 4: BUKU AGENDA REGISTER MASUK / KELUAR ===================== */}
        {(config.type === 'agenda-masuk' || config.type === 'agenda-keluar') && (
          <div className="space-y-4 text-xs font-sans">
            <OfficialKopSurat profile={profile} compact={true} />

            <div className="text-center py-1">
              <h2 className="text-sm font-bold uppercase tracking-wider underline">
                {config.type === 'agenda-masuk' 
                  ? 'BUKU REGISTER AGENDA SURAT MASUK KEDINASAN' 
                  : 'BUKU REGISTER AGENDA SURAT KELUAR KEDINASAN'}
              </h2>
              <p className="text-[11px] text-slate-700 font-mono">
                Satuan Kerja: SMA Negeri 9 Surabaya · {config.periodText || 'Tahun 2026'}
              </p>
            </div>

            <table className="w-full border-collapse border border-black text-[10px]">
              <thead className="bg-slate-100 font-bold select-none">
                <tr>
                  <th className="border border-black p-1.5 w-8">No</th>
                  <th className="border border-black p-1.5">No. Agenda</th>
                  <th className="border border-black p-1.5">Tanggal</th>
                  <th className="border border-black p-1.5">{config.type === 'agenda-masuk' ? 'Pengirim' : 'Tujuan'}</th>
                  <th className="border border-black p-1.5">No. Surat</th>
                  <th className="border border-black p-1.5">Perihal</th>
                  <th className="border border-black p-1.5">Kode</th>
                  <th className="border border-black p-1.5">{config.type === 'agenda-masuk' ? 'Disposisi' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {config.type === 'agenda-masuk' ? (
                  suratMasukList.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-black p-1 font-mono font-semibold">{item.nomorAgenda}</td>
                      <td className="border border-black p-1 font-mono">{item.tanggalTerima}</td>
                      <td className="border border-black p-1 font-medium">{item.pengirim}</td>
                      <td className="border border-black p-1 font-mono">{item.nomorSurat}</td>
                      <td className="border border-black p-1">{item.perihal}</td>
                      <td className="border border-black p-1 font-mono text-center">{item.kodeKlasifikasi}</td>
                      <td className="border border-black p-1">
                        {item.disposisiList.length > 0 ? item.disposisiList[0].diteruskanKepada.join(', ') : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  suratKeluarList.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-black p-1 font-mono font-semibold">{item.nomorAgenda}</td>
                      <td className="border border-black p-1 font-mono">{item.tanggalSurat}</td>
                      <td className="border border-black p-1 font-medium">{item.tujuan}</td>
                      <td className="border border-black p-1 font-mono">{item.nomorSurat}</td>
                      <td className="border border-black p-1">{item.perihal}</td>
                      <td className="border border-black p-1 font-mono text-center">{item.kodeKlasifikasi}</td>
                      <td className="border border-black p-1 font-semibold">{item.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between pt-6 text-[11px]">
              <div>
                <p>Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
                <p className="font-mono">Operator: {currentUser.name} ({currentUser.jabatan})</p>
              </div>

              <div className="text-center">
                <p>Kepala Urusan Tata Usaha,</p>
                <div className="h-12 flex items-center justify-center">
                  <span className="font-serif italic font-semibold">{profile.kepalaTU}</span>
                </div>
                <p className="font-bold underline">{profile.kepalaTU}</p>
                <p className="font-mono">NIP. {profile.nipKepalaTU}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
