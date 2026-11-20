import React, { useState } from 'react';
import { SuratMasuk, SuratKeluar, SchoolProfile, User } from '../types';
import { daftarKlasifikasi } from '../data/initialData';
import { 
  Printer, 
  FileText, 
  Calendar, 
  Filter, 
  BarChart3, 
  CheckCircle2, 
  Download,
  BookOpen,
  Layers
} from 'lucide-react';

interface LaporanCetakViewProps {
  suratMasuk: SuratMasuk[];
  suratKeluar: SuratKeluar[];
  schoolProfile: SchoolProfile;
  currentUser: User;
  onOpenPrintModal: (config: {
    type: 'rekapitulasi' | 'agenda-masuk' | 'agenda-keluar' | 'lembar-disposisi' | 'surat-resmi';
    surat?: SuratMasuk | SuratKeluar;
    periodText?: string;
  }) => void;
  onExportCSV: (type: 'masuk' | 'keluar' | 'semua') => void;
}

export const LaporanCetakView: React.FC<LaporanCetakViewProps> = ({
  suratMasuk,
  suratKeluar,
  schoolProfile,
  currentUser,
  onOpenPrintModal,
  onExportCSV
}) => {
  const [periode, setPeriode] = useState('bulan-ini');
  const [filterKlasifikasi, setFilterKlasifikasi] = useState('all');

  // Compute stats
  const totalMasuk = suratMasuk.length;
  const totalKeluar = suratKeluar.length;
  const totalDisposisi = suratMasuk.reduce((acc, s) => acc + s.disposisiList.length, 0);
  const disposisiSelesai = suratMasuk.filter(s => s.status === 'Selesai').length;
  const persentaseSelesai = totalMasuk > 0 ? Math.round((disposisiSelesai / totalMasuk) * 100) : 0;

  // Breakdown by classification
  const klasifikasiCounts = daftarKlasifikasi.map(k => {
    const masukCount = suratMasuk.filter(s => s.kodeKlasifikasi === k.kode).length;
    const keluarCount = suratKeluar.filter(s => s.kodeKlasifikasi === k.kode).length;
    return {
      ...k,
      total: masukCount + keluarCount,
      masukCount,
      keluarCount
    };
  }).filter(k => k.total > 0);

  const getPeriodeLabel = () => {
    switch (periode) {
      case 'bulan-ini': return 'Oktober 2026';
      case 'triwulan-3': return 'Triwulan III (Juli - September 2026)';
      case 'semester-ganjil': return 'Semester Ganjil TP 2026/2027';
      default: return 'Tahun Anggaran 2026';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Pusat Pelaporan & Percetakan Kedinasan SMAN 9 Surabaya
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cetak rekapitulasi berkala, lembar disposisi kedinasan, register agenda persuratan, dan ekspor arsip.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onExportCSV('semua')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Semua (CSV)</span>
          </button>
          <button
            onClick={() => onOpenPrintModal({ type: 'rekapitulasi', periodText: getPeriodeLabel() })}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Cetak Rekapitulasi Resmi</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Periode Laporan:</span>
          <select
            value={periode}
            onChange={e => setPeriode(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="bulan-ini">Bulan Ini (Oktober 2026)</option>
            <option value="triwulan-3">Triwulan III (Juli - September 2026)</option>
            <option value="semester-ganjil">Semester Ganjil 2026/2027</option>
            <option value="tahun-2026">Tahun Berjalan 2026</option>
          </select>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          Dicetak oleh: {currentUser.name} ({currentUser.jabatan})
        </div>
      </div>

      {/* Stat Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Surat Masuk Teragenda</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-blue-900 mt-1">{totalMasuk}</div>
          <div className="text-[11px] text-slate-500 mt-1">SMAN 9 Surabaya</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Surat Keluar Terbit</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-900 mt-1">{totalKeluar}</div>
          <div className="text-[11px] text-slate-500 mt-1">Tertanda Kepala Sekolah / KTU</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Lembar Disposisi Diterbitkan</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-900 mt-1">{totalDisposisi}</div>
          <div className="text-[11px] text-slate-500 mt-1">{disposisiSelesai} tuntas ditindaklanjuti</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Rasio Penyelesaian Disposisi</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-purple-900 mt-1">{persentaseSelesai}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Efektivitas penanganan surat TU</div>
        </div>
      </div>

      {/* Quick Print Template Cards */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
          Koleksi Dokumen Percetakan Siap Pakai
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Template 1: Buku Agenda Masuk */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-blue-400 transition-colors shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <BookOpen className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900">Buku Agenda Surat Masuk</h4>
              </div>
              <p className="text-xs text-slate-600">
                Format tabel kedinasan berisi register lengkap nomor agenda, asal surat, nomor, tanggal, ringkasan perihal, dan penerima disposisi.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
              <span className="text-[11px] text-slate-500">{totalMasuk} entri aktif</span>
              <button
                onClick={() => onOpenPrintModal({ type: 'agenda-masuk', periodText: getPeriodeLabel() })}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Register Masuk</span>
              </button>
            </div>
          </div>

          {/* Template 2: Buku Agenda Keluar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-amber-400 transition-colors shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <BookOpen className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900">Buku Agenda Surat Keluar</h4>
              </div>
              <p className="text-xs text-slate-600">
                Format register surat dinas keluar ber-nomor resmi 421.3/xxx/101.6.1.9/2026, tanggal terbit, tujuan alamat, perihal, dan penandatangan.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
              <span className="text-[11px] text-slate-500">{totalKeluar} surat terbit</span>
              <button
                onClick={() => onOpenPrintModal({ type: 'agenda-keluar', periodText: getPeriodeLabel() })}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Register Keluar</span>
              </button>
            </div>
          </div>

          {/* Template 3: Rekap Eksekutif Bulanan */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-purple-400 transition-colors shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-purple-700 mb-2">
                <Layers className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900">Rekapitulasi Pelaporan TU</h4>
              </div>
              <p className="text-xs text-slate-600">
                Laporan eksekutif ber-kop resmi lengkap dengan rincian klasifikasi, statistik disposisi, dan lembar pengesahan Kepala Sekolah serta Kepala TU.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
              <span className="text-[11px] text-slate-500">{getPeriodeLabel()}</span>
              <button
                onClick={() => onOpenPrintModal({ type: 'rekapitulasi', periodText: getPeriodeLabel() })}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Laporan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by Classification Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
          Rincian Distribusi Kode Klasifikasi Surat SMAN 9 Surabaya
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-2 px-3 w-16">Kode</th>
                <th className="py-2 px-3">Uraian Klasifikasi</th>
                <th className="py-2 px-3">Kategori</th>
                <th className="py-2 px-3 text-center">Surat Masuk</th>
                <th className="py-2 px-3 text-center">Surat Keluar</th>
                <th className="py-2 px-3 text-right">Total Berkas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {klasifikasiCounts.map(k => (
                <tr key={k.kode} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-bold text-blue-950">{k.kode}</td>
                  <td className="py-2 px-3 font-medium text-slate-900">{k.nama}</td>
                  <td className="py-2 px-3 text-slate-600">{k.kategori}</td>
                  <td className="py-2 px-3 text-center font-mono tabular-nums">{k.masukCount}</td>
                  <td className="py-2 px-3 text-center font-mono tabular-nums">{k.keluarCount}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900">{k.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
