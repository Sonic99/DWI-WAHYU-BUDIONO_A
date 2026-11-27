import React, { useState } from 'react';
import { 
  SuratKeluar, 
  User, 
  FileAttachment, 
  SifatSurat, 
  StatusSuratKeluar, 
  SchoolProfile 
} from '../types';
import { daftarKlasifikasi } from '../data/initialData';
import { 
  Search, 
  Plus, 
  Printer, 
  FileText, 
  Edit3, 
  Trash2, 
  Paperclip, 
  CheckCircle2, 
  Clock, 
  X,
  Send,
  Download,
  Check
} from 'lucide-react';

interface SuratKeluarViewProps {
  suratList: SuratKeluar[];
  currentUser: User;
  schoolProfile: SchoolProfile;
  onSaveSurat: (surat: SuratKeluar, isNew: boolean) => void;
  onDeleteSurat: (id: string) => void;
  onPrintSuratKeluar: (surat: SuratKeluar) => void;
  onExportCSV: () => void;
}

export const SuratKeluarView: React.FC<SuratKeluarViewProps> = ({
  suratList,
  currentUser,
  schoolProfile,
  onSaveSurat,
  onDeleteSurat,
  onPrintSuratKeluar,
  onExportCSV
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterKlasifikasi, setFilterKlasifikasi] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurat, setEditingSurat] = useState<SuratKeluar | null>(null);

  // Form Fields
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');
  const [tujuan, setTujuan] = useState('');
  const [perihal, setPerihal] = useState('');
  const [isiRingkas, setIsiRingkas] = useState('');
  const [sifat, setSifat] = useState<SifatSurat>('Biasa');
  const [kodeKlasifikasi, setKodeKlasifikasi] = useState('421.3');
  const [penandatangan, setPenandatangan] = useState(schoolProfile.kepalaSekolah);
  const [nipPenandatangan, setNipPenandatangan] = useState(schoolProfile.nipKepalaSekolah);
  const [status, setStatus] = useState<StatusSuratKeluar>('Draf');
  const [tembusanText, setTembusanText] = useState('Kepala Cabang Dinas Pendidikan Wilayah Surabaya - Sidoarjo\nArsip Tata Usaha');
  const [lokasiFisikArsip, setLokasiFisikArsip] = useState('Bantex Surat Keluar 2026 - Rak K1');
  const [lampiranList, setLampiranList] = useState<FileAttachment[]>([]);
  const [newLampiranName, setNewLampiranName] = useState('');

  const canEdit = currentUser.role === 'admin_tu' || currentUser.role === 'staf_agenda' || currentUser.role === 'kepala_sekolah';
  const canDelete = currentUser.role === 'admin_tu';
  const canApprove = currentUser.role === 'kepala_sekolah' || currentUser.role === 'admin_tu';

  // Generate next agenda & nomor surat otomatis
  const generateNextAgenda = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(suratList.length + 1).padStart(3, '0');
    return `SK/${year}/${month}/${seq}`;
  };

  const generateNomorSuratResmi = (kode: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const seq = String(480 + suratList.length + 1);
    // Format standar kedinasan Diknas Jatim: [Kode]/[NoUrut]/101.6.1.9/[Tahun] (101.6.1.9 adalah kode rayon SMAN 9 Surabaya)
    return `${kode}/${seq}/101.6.1.9/${year}`;
  };

  const handleOpenAdd = () => {
    setEditingSurat(null);
    const today = new Date().toISOString().split('T')[0];
    setTanggalSurat(today);
    setTujuan('');
    setPerihal('');
    setIsiRingkas('');
    setSifat('Biasa');
    setKodeKlasifikasi('421.3');
    setNomorSurat(generateNomorSuratResmi('421.3'));
    setPenandatangan(schoolProfile.kepalaSekolah);
    setNipPenandatangan(schoolProfile.nipKepalaSekolah);
    setStatus('Draf');
    setTembusanText('Kepala Cabang Dinas Pendidikan Wilayah Surabaya - Sidoarjo\nArsip Tata Usaha');
    setLokasiFisikArsip('Bantex Surat Keluar 2026 - Rak K1');
    setLampiranList([]);
    setNewLampiranName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (surat: SuratKeluar) => {
    setEditingSurat(surat);
    setNomorSurat(surat.nomorSurat);
    setTanggalSurat(surat.tanggalSurat);
    setTujuan(surat.tujuan);
    setPerihal(surat.perihal);
    setIsiRingkas(surat.isiRingkas);
    setSifat(surat.sifat);
    setKodeKlasifikasi(surat.kodeKlasifikasi);
    setPenandatangan(surat.penandatangan);
    setNipPenandatangan(surat.nipPenandatangan);
    setStatus(surat.status);
    setTembusanText(surat.tembusan.join('\n'));
    setLokasiFisikArsip(surat.lokasiFisikArsip);
    setLampiranList(surat.lampiran);
    setIsModalOpen(true);
  };

  const handleKlasifikasiChange = (kode: string) => {
    setKodeKlasifikasi(kode);
    if (!editingSurat) {
      setNomorSurat(generateNomorSuratResmi(kode));
    }
  };

  const handleAddLampiran = () => {
    if (!newLampiranName.trim()) return;
    const item: FileAttachment = {
      id: `att-sk-${Date.now()}`,
      name: newLampiranName.trim(),
      size: '850 KB',
      type: newLampiranName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setLampiranList([...lampiranList, item]);
    setNewLampiranName('');
  };

  const handleRemoveLampiran = (id: string) => {
    setLampiranList(lampiranList.filter(l => l.id !== id));
  };

  const handleQuickStatusChange = (surat: SuratKeluar, nextStatus: StatusSuratKeluar) => {
    const updated = { ...surat, status: nextStatus };
    onSaveSurat(updated, false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomorSurat.trim() || !tujuan.trim() || !perihal.trim()) {
      alert('Mohon lengkapi Nomor Surat, Tujuan, dan Perihal.');
      return;
    }

    const klasifikasiObj = daftarKlasifikasi.find(k => k.kode === kodeKlasifikasi);
    const namaKlasifikasi = klasifikasiObj ? klasifikasiObj.nama : 'Lain-lain';

    const isNew = !editingSurat;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const tembusanArray = tembusanText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const suratToSave: SuratKeluar = {
      id: editingSurat ? editingSurat.id : `sk-${Date.now()}`,
      nomorAgenda: editingSurat ? editingSurat.nomorAgenda : generateNextAgenda(),
      nomorSurat: nomorSurat.trim(),
      tanggalSurat,
      tujuan: tujuan.trim(),
      perihal: perihal.trim(),
      isiRingkas: isiRingkas.trim(),
      sifat,
      kodeKlasifikasi,
      namaKlasifikasi,
      penandatangan,
      nipPenandatangan,
      status,
      lampiran: lampiranList,
      tembusan: tembusanArray,
      lokasiFisikArsip,
      createdAt: editingSurat ? editingSurat.createdAt : nowStr,
      createdBy: editingSurat ? editingSurat.createdBy : currentUser.name
    };

    onSaveSurat(suratToSave, isNew);
    setIsModalOpen(false);
  };

  const filteredList = suratList.filter(item => {
    const matchQuery = 
      item.perihal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tujuan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorSurat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nomorAgenda.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchKlas = filterKlasifikasi === 'all' || item.kodeKlasifikasi === filterKlasifikasi;

    return matchQuery && matchStatus && matchKlas;
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Agenda Surat Keluar SMAN 9 Surabaya
          </h2>
          <p className="text-xs text-slate-500">
            Penomoran otomatis standar kedinasan, penelaahan draf, pengesahan Kepala Sekolah, dan register surat keluar.
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
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Surat Keluar</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari perihal, tujuan, no. surat keluar, agenda..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500">Status:</span>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
          >
            <option value="all">Semua Status</option>
            <option value="Draf">Draf</option>
            <option value="Review KTU">Review KTU</option>
            <option value="Disetujui Kepsek">Disetujui Kepsek</option>
            <option value="Sudah Dikirim">Sudah Dikirim</option>
            <option value="Diarsipkan">Diarsipkan</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500">Klasifikasi:</span>
          <select
            value={filterKlasifikasi}
            onChange={e => setFilterKlasifikasi(e.target.value)}
            className="px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white max-w-[150px]"
          >
            <option value="all">Semua Kode</option>
            {daftarKlasifikasi.map(k => (
              <option key={k.kode} value={k.kode}>{k.kode} - {k.kategori}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold select-none">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">No. Agenda</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tanggal Surat</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Nomor Surat Resmi</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tujuan / Penerima</th>
                <th className="py-2.5 px-3">Perihal Surat</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Penandatangan</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status Pengesahan</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Tidak ada surat keluar yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredList.map(surat => {
                  return (
                    <tr key={surat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {surat.nomorAgenda}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {surat.tanggalSurat}
                      </td>

                      <td className="py-2.5 px-3 font-mono font-medium text-blue-900 whitespace-nowrap">
                        {surat.nomorSurat}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-800 max-w-[180px] truncate" title={surat.tujuan}>
                        {surat.tujuan}
                      </td>

                      <td className="py-2.5 px-3 min-w-[220px]">
                        <div className="font-semibold text-slate-900 line-clamp-2">
                          {surat.perihal}
                        </div>
                        {surat.lampiran.length > 0 && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Paperclip className="w-3 h-3 text-amber-600" />
                            <span>{surat.lampiran.length} lampiran</span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                        <div className="font-medium truncate max-w-[140px]">{surat.penandatangan}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NIP. {surat.nipPenandatangan}</div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`font-semibold text-[11px] ${
                          surat.status === 'Sudah Dikirim' ? 'text-emerald-700' :
                          surat.status === 'Disetujui Kepsek' ? 'text-blue-700' :
                          surat.status === 'Review KTU' ? 'text-amber-700' :
                          'text-slate-600'
                        }`}>
                          {surat.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Approval Quick Action */}
                          {canApprove && surat.status === 'Review KTU' && (
                            <button
                              onClick={() => handleQuickStatusChange(surat, 'Disetujui Kepsek')}
                              title="Setujui Surat (ACC)"
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-0.5"
                            >
                              <Check className="w-3 h-3" />
                              <span>ACC Kepsek</span>
                            </button>
                          )}

                          {surat.status === 'Disetujui Kepsek' && (
                            <button
                              onClick={() => handleQuickStatusChange(surat, 'Sudah Dikirim')}
                              title="Tandai Sudah Terkirim"
                              className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors flex items-center gap-0.5"
                            >
                              <Send className="w-3 h-3" />
                              <span>Kirim</span>
                            </button>
                          )}

                          {/* Cetak Surat Resmi */}
                          <button
                            onClick={() => onPrintSuratKeluar(surat)}
                            title="Cetak Surat Dinas Resmi SMANIX"
                            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(surat)}
                              title="Edit Surat"
                              className="p-1 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              onClick={() => {
                                if (confirm(`Hapus surat keluar ${surat.nomorAgenda}?`)) {
                                  onDeleteSurat(surat.id);
                                }
                              }}
                              title="Hapus"
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

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredList.length} dari {suratList.length} surat keluar</span>
          <span className="font-mono text-[11px]">Format Penomoran: KODE/NO_URUT/101.6.1.9/TAHUN</span>
        </div>
      </div>

      {/* Modal Input / Edit Surat Keluar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="text-base font-bold text-white">
                {editingSurat ? `Edit Surat Keluar (${editingSurat.nomorAgenda})` : 'Pembuatan Surat Keluar Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Klasifikasi Surat:
                  </label>
                  <select
                    value={kodeKlasifikasi}
                    onChange={e => handleKlasifikasiChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 bg-white font-mono"
                  >
                    {daftarKlasifikasi.map(k => (
                      <option key={k.kode} value={k.kode}>
                        {k.kode} - {k.kategori}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Nomor Surat Resmi (Auto-Generated Standar Jatim):
                  </label>
                  <input
                    type="text"
                    required
                    value={nomorSurat}
                    onChange={e => setNomorSurat(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 font-mono font-bold text-blue-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Tanggal Surat:
                  </label>
                  <input
                    type="date"
                    required
                    value={tanggalSurat}
                    onChange={e => setTanggalSurat(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Sifat Surat:
                  </label>
                  <select
                    value={sifat}
                    onChange={e => setSifat(e.target.value as SifatSurat)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Segera">Segera</option>
                    <option value="Rahasia">Rahasia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Status Dokumen:
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as StatusSuratKeluar)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 bg-white font-medium"
                  >
                    <option value="Draf">Draf Konsep</option>
                    <option value="Review KTU">Review KTU</option>
                    <option value="Disetujui Kepsek">Disetujui Kepsek (Siap Kirim)</option>
                    <option value="Sudah Dikirim">Sudah Dikirim</option>
                    <option value="Diarsipkan">Diarsipkan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tujuan / Kepada Yth. *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kepala Balai Guru Penggerak (BGP) Provinsi Jawa Timur"
                  value={tujuan}
                  onChange={e => setTujuan(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Perihal Surat *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Permohonan Narasumber Workshop Guru SMAN 9 Surabaya"
                  value={perihal}
                  onChange={e => setPerihal(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Isi Ringkas / Batang Tubuh Surat:
                </label>
                <textarea
                  rows={3}
                  placeholder="Uraian ringkas pokok bahasan surat kedinasan..."
                  value={isiRingkas}
                  onChange={e => setIsiRingkas(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Penandatangan:
                  </label>
                  <input
                    type="text"
                    value={penandatangan}
                    onChange={e => setPenandatangan(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    NIP Penandatangan:
                  </label>
                  <input
                    type="text"
                    value={nipPenandatangan}
                    onChange={e => setNipPenandatangan(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tembusan Surat (1 baris per tembusan):
                </label>
                <textarea
                  rows={2}
                  value={tembusanText}
                  onChange={e => setTembusanText(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500 font-mono text-[11px]"
                />
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold shadow-xs"
                >
                  {editingSurat ? 'Simpan Perubahan' : 'Terbitkan Surat Keluar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
