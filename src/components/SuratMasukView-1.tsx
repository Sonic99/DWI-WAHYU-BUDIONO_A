import React, { useState } from 'react';
import { 
  SuratMasuk, 
  User, 
  FileAttachment, 
  SifatSurat, 
  StatusSuratMasuk 
} from '../types';
import { daftarKlasifikasi } from '../data/initialData';
import { 
  Search, 
  Plus, 
  Filter, 
  Printer, 
  FileText, 
  Edit3, 
  Trash2, 
  Paperclip, 
  CheckCircle, 
  Clock, 
  X,
  FileCheck2,
  Download
} from 'lucide-react';

interface SuratMasukViewProps {
  suratList: SuratMasuk[];
  currentUser: User;
  onSaveSurat: (surat: SuratMasuk, isNew: boolean) => void;
  onDeleteSurat: (id: string) => void;
  onOpenDisposisiModal: (surat: SuratMasuk) => void;
  onPrintLembarDisposisi: (surat: SuratMasuk) => void;
  onExportCSV: () => void;
}

export const SuratMasukView: React.FC<SuratMasukViewProps> = ({
  suratList,
  currentUser,
  onSaveSurat,
  onDeleteSurat,
  onOpenDisposisiModal,
  onPrintLembarDisposisi,
  onExportCSV
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSifat, setFilterSifat] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterKlasifikasi, setFilterKlasifikasi] = useState<string>('all');

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurat, setEditingSurat] = useState<SuratMasuk | null>(null);

  // Form Fields
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');
  const [tanggalTerima, setTanggalTerima] = useState('');
  const [pengirim, setPengirim] = useState('');
  const [perihal, setPerihal] = useState('');
  const [ringkasan, setRingkasan] = useState('');
  const [sifat, setSifat] = useState<SifatSurat>('Biasa');
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState('421.3');
  const [status, setStatus] = useState<StatusSuratMasuk>('Baru');
  const [lokasiFisikArsip, setLokasiFisikArsip] = useState('Bantex Persuratan - Rak A1');
  const [lampiranList, setLampiranList] = useState<FileAttachment[]>([]);
  const [newLampiranName, setNewLampiranName] = useState('');

  const canEdit = currentUser.role === 'admin_tu' || currentUser.role === 'staf_agenda';
  const canDelete = currentUser.role === 'admin_tu';
  const canDisposisi = currentUser.role === 'kepala_sekolah' || currentUser.role === 'admin_tu' || currentUser.role === 'staf_agenda' || currentUser.role === 'wakasek';

  // Generate next agenda number
  const generateNextAgenda = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(suratList.length + 1).padStart(3, '0');
    return `SM/${year}/${month}/${seq}`;
  };

  const handleOpenAdd = () => {
    setEditingSurat(null);
    setNomorSurat('');
    const today = new Date().toISOString().split('T')[0];
    setTanggalSurat(today);
    setTanggalTerima(today);
    setPengirim('');
    setPerihal('');
    setRingkasan('');
    setSifat('Biasa');
    setKodeKlasifikasi('421.3');
    setStatus('Baru');
    setLokasiFisikArsip('Bantex Persuratan Umum - Rak B');
    setLampiranList([]);
    setNewLampiranName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (surat: SuratMasuk) => {
    setEditingSurat(surat);
    setNomorSurat(surat.nomorSurat);
    setTanggalSurat(surat.tanggalSurat);
    setTanggalTerima(surat.tanggalTerima);
    setPengirim(surat.pengirim);
    setPerihal(surat.perihal);
    setRingkasan(surat.ringkasan);
    setSifat(surat.sifat);
    setKodeKlasifikasi(surat.kodeKlasifikasi);
    setStatus(surat.status);
    setLokasiFisikArsip(surat.lokasiFisikArsip);
    setLampiranList(surat.lampiran);
    setIsModalOpen(true);
  };

  const handleAddLampiran = () => {
    if (!newLampiranName.trim()) return;
    const item: FileAttachment = {
      id: `att-${Date.now()}`,
      name: newLampiranName.trim(),
      size: '1.2 MB',
      type: newLampiranName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setLampiranList([...lampiranList, item]);
    setNewLampiranName('');
  };

  const handleRemoveLampiran = (id: string) => {
    setLampiranList(lampiranList.filter(l => l.id !== id));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorSurat.trim() || !pengirim.trim() || !perihal.trim()) {
      alert('Mohon lengkapi Nomor Surat, Pengirim, dan Perihal.');
      return;
    }

    const klasifikasiObj = daftarKlasifikasi.find(k => k.kode === kodeKlasifikasi);
    const namaKlasifikasi = klasifikasiObj ? klasifikasiObj.nama : 'Lain-lain';

    const isNew = !editingSurat;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const suratToSave: SuratMasuk = {
      id: editingSurat ? editingSurat.id : `sm-${Date.now()}`,
      nomorAgenda: editingSurat ? editingSurat.nomorAgenda : generateNextAgenda(),
      nomorSurat: nomorSurat.trim(),
      tanggalSurat,
      tanggalTerima,
      pengirim: pengirim.trim(),
      perihal: perihal.trim(),
      ringkasan: ringkasan.trim(),
      sifat,
      kodeKlasifikasi,
      namaKlasifikasi,
      status,
      lampiran: lampiranList,
      disposisiList: editingSurat ? editingSurat.disposisiList : [],
      lokasiFisikArsip,
      createdAt: editingSurat ? editingSurat.createdAt : nowStr,
      createdBy: editingSurat ? editingSurat.createdBy : currentUser.name
    };

    onSaveSurat(suratToSave, isNew);
    setIsModalOpen(false);
  };

  // Filtered List
  const filteredList = suratList.filter(item => {
    const matchQuery = 
      item.perihal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pengirim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorAgenda.toLowerCase().includes(searchQuery.toLowerCase());

    const matchSifat = filterSifat === 'all' || item.sifat === filterSifat;
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchKlas = filterKlasifikasi === 'all' || item.kodeKlasifikasi === filterKlasifikasi;

    return matchQuery && matchSifat && matchStatus && matchKlas;
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Agenda Surat Masuk SMAN 9 Surabaya
          </h2>
          <p className="text-xs text-slate-500">
            Pencatatan surat masuk, penerimaan berkas kedinasan, dan pengelolaan lembar disposisi.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onExportCSV}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>
          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Input Surat Masuk</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        {/* Search Field */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari perihal, pengirim, no. surat, no. agenda..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filter Sifat */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500">Sifat:</span>
          <select
            value={filterSifat}
            onChange={e => setFilterSifat(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="all">Semua Sifat</option>
            <option value="Biasa">Biasa</option>
            <option value="Penting">Penting</option>
            <option value="Segera">Segera</option>
            <option value="Sangat Segera">Sangat Segera</option>
            <option value="Rahasia">Rahasia</option>
          </select>
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500">Status:</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="Baru">Baru</option>
            <option value="Menunggu Disposisi">Menunggu Disposisi</option>
            <option value="Didisposisikan">Didisposisikan</option>
            <option value="Dalam Proses">Dalam Proses</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>

        {/* Filter Klasifikasi */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500">Klasifikasi:</span>
          <select
            value={filterKlasifikasi}
            onChange={e => setFilterKlasifikasi(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px]"
          >
            <option value="all">Semua Kode</option>
            {daftarKlasifikasi.map(k => (
              <option key={k.kode} value={k.kode}>{k.kode} - {k.kategori}</option>
            ))}
          </select>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold select-none">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">No. Agenda</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tgl. Terima / Surat</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Asal Pengirim</th>
                <th className="py-2.5 px-3">Perihal & Nomor Surat</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Klasifikasi</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Sifat</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status & Disposisi</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Tidak ada surat masuk yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map(surat => {
                  const hasDisposisi = surat.disposisiList.length > 0;
                  const latestDisp = hasDisposisi ? surat.disposisiList[0] : null;

                  return (
                    <tr key={surat.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* No Agenda */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {surat.nomorAgenda}
                      </td>

                      {/* Tgl Terima & Surat */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        <div>{surat.tanggalTerima}</div>
                        <div className="text-[10px] text-slate-400">Surat: {surat.tanggalSurat}</div>
                      </td>

                      {/* Asal Pengirim */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[180px] truncate" title={surat.pengirim}>
                        {surat.pengirim}
                      </td>

                      {/* Perihal & No Surat */}
                      <td className="py-2.5 px-3 min-w-[240px]">
                        <div className="font-semibold text-slate-900 line-clamp-2">
                          {surat.perihal}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>No: {surat.nomorSurat}</span>
                          {surat.lampiran.length > 0 && (
                            <span className="flex items-center gap-0.5 text-blue-600">
                              <Paperclip className="w-3 h-3" />
                              <span>{surat.lampiran.length} berkas</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Klasifikasi */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-mono text-slate-700">{surat.kodeKlasifikasi}</span>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {surat.namaKlasifikasi}
                        </div>
                      </td>

                      {/* Sifat Surat */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-medium ${
                          surat.sifat === 'Sangat Segera' || surat.sifat === 'Rahasia' ? 'text-red-700 font-bold' :
                          surat.sifat === 'Penting' || surat.sifat === 'Segera' ? 'text-amber-700 font-semibold' :
                          'text-slate-700'
                        }`}>
                          {surat.sifat}
                        </span>
                      </td>

                      {/* Status & Disposisi */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">
                          {surat.status}
                        </div>
                        {hasDisposisi && latestDisp ? (
                          <div className="text-[10px] text-slate-500 truncate max-w-[160px]" title={latestDisp.diteruskanKepada.join(', ')}>
                            Kepada: {latestDisp.diteruskanKepada.join(', ')}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-700 italic">Belum didisposisi</span>
                        )}
                      </td>

                      {/* Aksi Controls */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Disposisi Button */}
                          {canDisposisi && (
                            <button
                              onClick={() => onOpenDisposisiModal(surat)}
                              title="Buka / Atur Disposisi"
                              className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors flex items-center gap-1"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span>Disposisi</span>
                            </button>
                          )}

                          {/* Print Lembar Disposisi */}
                          <button
                            onClick={() => onPrintLembarDisposisi(surat)}
                            title="Cetak Lembar Disposisi Kedinasan"
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Surat */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(surat)}
                              title="Edit Detail Surat"
                              className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Surat */}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus surat masuk nomor agenda ${surat.nomorAgenda}?`)) {
                                  onDeleteSurat(surat.id);
                                }
                              }}
                              title="Hapus Surat"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredList.length} dari {suratList.length} surat masuk</span>
          <span className="font-mono text-[11px]">Format Agenda: SM/TAHUN/BULAN/URUT</span>
        </div>
      </div>

      {/* Modal Input / Edit Surat Masuk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="text-base font-bold text-white">
                {editingSurat ? `Edit Surat Masuk (${editingSurat.nomorAgenda})` : 'Registrasi Surat Masuk Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nomor Surat Asal *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 420/1234/101.1/2026"
                    value={nomorSurat}
                    onChange={e => setNomorSurat(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Pengirim / Asal Surat *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dinas Pendidikan Provinsi Jawa Timur"
                    value={pengirim}
                    onChange={e => setPengirim(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Tanggal Surat *:
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggalSurat}
                    onChange={e => setTanggalSurat(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Tanggal Diterima TU *:
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggalTerima}
                    onChange={e => setTanggalTerima(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Sifat Surat:
                  </label>
                  <select
                    value={sifat}
                    onChange={e => setSifat(e.target.value as SifatSurat)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Segera">Segera</option>
                    <option value="Sangat Segera">Sangat Segera</option>
                    <option value="Rahasia">Rahasia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Perihal / Hal Surat *:
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Isi ringkas pokok surat..."
                  value={perihal}
                  onChange={e => setPerihal(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Kode Klasifikasi Arsip:
                  </label>
                  <select
                    value={kodeKlasifikasi}
                    onChange={e => setKodeKlasifikasi(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                  >
                    {daftarKlasifikasi.map(k => (
                      <option key={k.kode} value={k.kode}>
                        {k.kode} - {k.nama} ({k.kategori})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Lokasi Fisik Berkas / Bantex:
                  </label>
                  <input
                    type="text"
                    value={lokasiFisikArsip}
                    onChange={e => setLokasiFisikArsip(e.target.value)}
                    placeholder="Contoh: Bantex Kurikulum 2026 - Rak B1"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Lampiran File Simulasi */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-slate-700 font-semibold mb-1">
                  Lampiran Berkas Digital (PDF / Dokumen):
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newLampiranName}
                    onChange={e => setNewLampiranName(e.target.value)}
                    placeholder="Nama berkas (misal: Juknis_Lomba_2026.pdf)"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddLampiran}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded font-medium hover:bg-slate-700"
                  >
                    + Tambah Lampiran
                  </button>
                </div>

                {lampiranList.length > 0 && (
                  <div className="space-y-1">
                    {lampiranList.map(l => (
                      <div key={l.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded">
                        <span className="font-mono text-slate-800">{l.name} ({l.size})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveLampiran(l.id)}
                          className="text-red-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs"
                >
                  {editingSurat ? 'Simpan Perubahan' : 'Simpan Surat Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
