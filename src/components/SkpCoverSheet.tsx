import React from 'react';
import garudaEmblemImg from '../assets/images/garuda_pancasila_emblem_1795771704117.jpg';
import { SchoolProfile, SkpDocumentRecord } from '../types';

interface SkpCoverSheetProps {
  profile: SchoolProfile;
  skp: SkpDocumentRecord;
  withPageBreakAfter?: boolean;
}

export const SkpCoverSheet: React.FC<SkpCoverSheetProps> = ({
  profile,
  skp,
  withPageBreakAfter = false
}) => {
  const schoolName = (profile.namaSekolah || 'SMA NEGERI 9 SURABAYA').toUpperCase();
  const schoolAddress =
    profile.alamat || 'Jl. Wijaya Kusuma No. 48, Ketabang, Genteng, Surabaya';

  return (
    <div
      className={`print-container bg-white border border-slate-200 rounded-lg p-5 md:p-8 text-black ${
        withPageBreakAfter ? 'print-page-break mb-6' : ''
      }`}
    >
      {/* Bingkai Ganda Resmi Cover SKP */}
      <div className="border-[4px] border-double border-slate-900 p-6 md:p-10 min-h-[252mm] flex flex-col justify-between bg-white">
        {/* Bagian Atas: Lambang Negara Garuda Pancasila & Instansi */}
        <div className="text-center space-y-4 pt-2">
          <div className="flex justify-center">
            <img
              src={garudaEmblemImg}
              alt="Lambang Negara Republik Indonesia Garuda Pancasila"
              referrerPolicy="no-referrer"
              className="w-28 h-28 md:w-32 md:h-32 object-contain mix-blend-multiply"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs md:text-sm font-bold tracking-[0.18em] uppercase text-slate-900">
              PEMERINTAH PROVINSI JAWA TIMUR
            </div>
            <div className="text-xs md:text-sm font-bold tracking-[0.14em] uppercase text-slate-800">
              DINAS PENDIDIKAN
            </div>
            <div className="text-sm md:text-base font-extrabold tracking-wider uppercase text-slate-950">
              {schoolName}
            </div>
          </div>

          <div className="w-40 h-0.5 bg-slate-900 mx-auto" />
        </div>

        {/* Bagian Tengah: Judul Utama SKP */}
        <div className="text-center space-y-6 my-8">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide uppercase text-slate-950 leading-tight">
              SASARAN KINERJA PEGAWAI
            </h1>
            <div className="text-base md:text-lg font-bold tracking-[0.28em] text-slate-800">
              ( S K P )
            </div>
            <p className="text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-700 pt-1">
              DOKUMEN PERENCANAAN, PELAKSANAAN, DAN EVALUASI KINERJA PEGAWAI
            </p>
          </div>

          <div className="inline-block border-2 border-slate-900 px-8 py-3 bg-slate-50/70">
            <div className="text-sm md:text-base font-extrabold uppercase tracking-widest text-slate-950 tabular-nums">
              TAHUN {skp.tahun}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">
              Periode Penilaian: {skp.periode}
            </div>
          </div>
        </div>

        {/* Bagian Identitas Pegawai & Pejabat Penilai */}
        <div className="max-w-xl w-full mx-auto space-y-5 my-4">
          <div className="border border-slate-900">
            <div className="bg-slate-100 border-b border-slate-900 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 text-center">
              PEGAWAI YANG DINILAI
            </div>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="py-2 px-4 w-40 font-semibold text-slate-700">
                    Nama Lengkap
                  </td>
                  <td className="py-2 px-2 w-4 text-center">:</td>
                  <td className="py-2 px-4 font-bold text-slate-950">
                    {skp.pegawaiNama}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="py-2 px-4 font-semibold text-slate-700">
                    NIP / NRPTT
                  </td>
                  <td className="py-2 px-2 text-center">:</td>
                  <td className="py-2 px-4 font-mono tabular-nums text-slate-900">
                    {skp.pegawaiNip || '-'}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="py-2 px-4 font-semibold text-slate-700">
                    Pangkat / Gol. Ruang
                  </td>
                  <td className="py-2 px-2 text-center">:</td>
                  <td className="py-2 px-4 text-slate-900">
                    {skp.pegawaiPangkatGol || '-'}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="py-2 px-4 font-semibold text-slate-700">
                    Jabatan
                  </td>
                  <td className="py-2 px-2 text-center">:</td>
                  <td className="py-2 px-4 text-slate-900">
                    {skp.pegawaiJabatan}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-semibold text-slate-700">
                    Unit Kerja
                  </td>
                  <td className="py-2 px-2 text-center">:</td>
                  <td className="py-2 px-4 text-slate-900">
                    {skp.pegawaiUnitKerja}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-slate-900">
            <div className="bg-slate-100 border-b border-slate-900 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 text-center">
              PEJABAT PENILAI KINERJA
            </div>
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="py-2 px-4 w-40 font-semibold text-slate-700">
                    Nama Lengkap
                  </td>
                  <td className="py-2 px-2 w-4 text-center">:</td>
                  <td className="py-2 px-4 font-bold text-slate-950">
                    {skp.penilaiNama}
                  </td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="py-2 px-4 font-semibold text-slate-700">
                    NIP
                  </td>
                  <td className="py-2 px-2 text-center">:</td>
                  <td className="py-2 px-4 font-mono tabular-nums text-slate-900">
                    {skp.penilaiNip || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-semibold text-slate-700">
                    Jabatan
                  </td>
                  <td className="py-2 px-2 text-center">:</td>
                  <td className="py-2 px-4 text-slate-900">
                    {skp.penilaiJabatan} · {skp.penilaiUnitKerja}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bagian Bawah: Alamat Sekolah & Tahun */}
        <div className="text-center space-y-1 pt-6 border-t border-slate-300">
          <div className="text-xs font-extrabold tracking-wider uppercase text-slate-950">
            {schoolName}
          </div>
          <div className="text-[11px] text-slate-700">{schoolAddress}</div>
          <div className="text-xs font-bold tracking-widest text-slate-900 pt-1 tabular-nums">
            {profile.kota?.toUpperCase() || 'SURABAYA'} — {skp.tahun}
          </div>
        </div>
      </div>
    </div>
  );
};
