import React, { useState } from 'react';
import { SuratMasuk, SuratKeluar, SchoolProfile } from '../types';
import { Download, Printer, Search, Calendar, BookOpen } from 'lucide-react';

interface BukuAgendaViewProps {
  suratMasuk: SuratMasuk[];
  suratKeluar: SuratKeluar[];
  schoolProfile: SchoolProfile;
  onPrintAgenda: (type: 'masuk' | 'keluar', year: string, month: string) => void;
  onExportCSV: (type: 'masuk' | 'keluar') => void;
}

export const BukuAgendaView: React.FC<BukuAgendaViewProps> = ({
  suratMasuk,
  suratKeluar,
  schoolProfile,
  onPrintAgenda,
  onExportCSV
}) => {
  const [activeTab, setActiveTab] = useState<'masuk' | 'keluar'>('masuk');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const months = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const filteredMasuk = suratMasuk.filter(s => {
    const [y, m] = s.tanggalTerima.split('-');
    const matchYear = selectedYear === 'all' || y === selectedYear;
    const matchMonth = selectedMonth === 'all' || m === selectedMonth;
    const matchQuery = 
      s.perihal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.pengirim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nomorSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nomorAgenda.toLowerCase().includes(searchQuery.toLowerCase());
    return matchYear && matchMonth && matchQuery;
  });

  const filteredKeluar = suratKeluar.filter(s => {
    const [y, m] = s.tanggalSurat.split('-');
    const matchYear = selectedYear === 'all' || y === selectedYear;
    const matchMonth = selectedMonth === 'all' || m === selectedMonth;
    const matchQuery = 
      s.perihal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tujuan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nomorSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nomorAgenda.toLowerCase().includes(searchQuery.toLowerCase());
    return matchYear && matchMonth && matchQuery;
  });

  return (
    <div className="space-y-4">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Buku Agenda Registrasi Kearsipan Kedinasan
          </h2>
          <p className="text-xs text-slate-500">
            Format register standar kearsipan Sub Bagian Tata Usaha SMA Negeri 9 Surabaya.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onExportCSV(activeTab)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Buku Agenda</span>
          </button>
          <button
            onClick={() => onPrintAgenda(activeTab, selectedYear, selectedMonth)}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Cetak Buku Register</span>
          </button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('masuk')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'masuk'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buku Agenda Masuk ({suratMasuk.length})
          </button>
          <button
            onClick={() => setActiveTab('keluar')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'keluar'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Buku Agenda Keluar ({suratKeluar.length})
          </button>
        </div>

        {/* Date Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari register..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-2.5 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="px-2 py-1 border border-slate-300 rounded text-xs bg-white font-mono"
          >
            <option value="all">Semua Tahun</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      {/* Register Table Format */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {activeTab === 'masuk' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-semibold select-none">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">No. Agenda</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tgl. Diterima</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Alamat Pengirim</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Nomor Surat</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tgl. Surat</th>
                  <th className="py-2.5 px-3">Isi Ringkas / Perihal</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Klasifikasi</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Diteruskan Kepada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredMasuk.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                      Tidak ada data register pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredMasuk.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{item.nomorAgenda}</td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{item.tanggalTerima}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800 whitespace-nowrap max-w-[150px] truncate">{item.pengirim}</td>
                      <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">{item.nomorSurat}</td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{item.tanggalSurat}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-900 max-w-[240px] truncate">{item.perihal}</td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{item.kodeKlasifikasi}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 whitespace-nowrap max-w-[150px] truncate">
                        {item.disposisiList.length > 0 
                          ? item.disposisiList[0].diteruskanKepada.join(', ')
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-semibold select-none">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">No. Agenda</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tgl. Kirim / Surat</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Nomor Surat Resmi</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tujuan / Alamat</th>
                  <th className="py-2.5 px-3">Isi Ringkas / Perihal</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Klasifikasi</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Penandatangan</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredKeluar.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                      Tidak ada data register surat keluar pada periode ini.
                    </td>
                  </tr>
                ) : (
                  filteredKeluar.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{item.nomorAgenda}</td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{item.tanggalSurat}</td>
                      <td className="py-2.5 px-3 font-semibold text-blue-900 whitespace-nowrap">{item.nomorSurat}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800 whitespace-nowrap max-w-[150px] truncate">{item.tujuan}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-900 max-w-[240px] truncate">{item.perihal}</td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">{item.kodeKlasifikasi}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-700 whitespace-nowrap max-w-[140px] truncate">{item.penandatangan}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-emerald-800 whitespace-nowrap">{item.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {activeTab === 'masuk' ? filteredMasuk.length : filteredKeluar.length} berkas registrasi</span>
          <span className="font-mono text-[11px]">Tata Usaha SMAN 9 Surabaya · Arsip Baku</span>
        </div>
      </div>
    </div>
  );
};
