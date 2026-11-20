import React, { useState } from 'react';
import { SuratMasuk, Disposisi, User } from '../types';
import { targetDisposisiList, instruksiDisposisiOptions } from '../data/initialData';
import { X, Check, Printer, Calendar, AlertCircle } from 'lucide-react';

interface DisposisiModalProps {
  surat: SuratMasuk;
  currentUser: User;
  onClose: () => void;
  onSaveDisposisi: (suratId: string, disposisi: Disposisi, newStatus: string) => void;
  onPrintDisposisi: (surat: SuratMasuk) => void;
}

export const DisposisiModal: React.FC<DisposisiModalProps> = ({
  surat,
  currentUser,
  onClose,
  onSaveDisposisi,
  onPrintDisposisi
}) => {
  const existingDisposisi = surat.disposisiList.length > 0 ? surat.disposisiList[0] : null;

  const [tujuanSelected, setTujuanSelected] = useState<string[]>(
    existingDisposisi ? existingDisposisi.diteruskanKepada : []
  );
  const [instruksiSelected, setInstruksiSelected] = useState<string[]>(
    existingDisposisi ? existingDisposisi.instruksi : []
  );
  const [catatanKhusus, setCatatanKhusus] = useState<string>(
    existingDisposisi ? existingDisposisi.catatanKhusus : ''
  );
  const [tenggatWaktu, setTenggatWaktu] = useState<string>(
    existingDisposisi ? existingDisposisi.tenggatWaktu : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<any>(
    existingDisposisi ? existingDisposisi.status : 'Sedang Diproses'
  );
  const [tindakLanjutCatatan, setTindakLanjutCatatan] = useState<string>(
    existingDisposisi?.tindakLanjutCatatan || ''
  );

  const toggleTujuan = (target: string) => {
    if (tujuanSelected.includes(target)) {
      setTujuanSelected(tujuanSelected.filter(t => t !== target));
    } else {
      setTujuanSelected([...tujuanSelected, target]);
    }
  };

  const toggleInstruksi = (instr: string) => {
    if (instruksiSelected.includes(instr)) {
      setInstruksiSelected(instruksiSelected.filter(i => i !== instr));
    } else {
      setInstruksiSelected([...instruksiSelected, instr]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tujuanSelected.length === 0) {
      alert('Pilihlah sekurang-kurangnya satu tujuan penerima disposisi.');
      return;
    }

    const updatedDisposisi: Disposisi = {
      id: existingDisposisi ? existingDisposisi.id : `disp-${Date.now()}`,
      suratId: surat.id,
      tanggalDisposisi: existingDisposisi ? existingDisposisi.tanggalDisposisi : new Date().toISOString().split('T')[0],
      diberikanOleh: `${currentUser.name} (${currentUser.jabatan})`,
      diteruskanKepada: tujuanSelected,
      instruksi: instruksiSelected,
      catatanKhusus,
      tenggatWaktu,
      status,
      tindakLanjutCatatan,
      tglSelesai: status === 'Selesai' ? new Date().toISOString().split('T')[0] : undefined
    };

    const newSuratStatus = status === 'Selesai' ? 'Selesai' : 'Didisposisikan';
    onSaveDisposisi(surat.id, updatedDisposisi, newSuratStatus);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-3xl w-full my-8 overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <div className="text-[11px] text-amber-400 font-mono">
              LEMBAR DISPOSISI ELEKTRONIK · {surat.nomorAgenda}
            </div>
            <h2 className="text-base font-bold text-white">
              Disposisi Pimpinan / Kepala Sekolah
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintDisposisi(surat)}
              className="px-2.5 py-1 text-xs font-medium text-slate-900 bg-amber-400 hover:bg-amber-300 rounded flex items-center gap-1 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Lembar Disposisi</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Surat */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-slate-500 block">Nomor Surat:</span>
            <span className="font-semibold text-slate-800 font-mono">{surat.nomorSurat}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Asal / Pengirim:</span>
            <span className="font-semibold text-slate-800 truncate block">{surat.pengirim}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Tanggal Surat / Terima:</span>
            <span className="font-semibold text-slate-800">{surat.tanggalSurat} / {surat.tanggalTerima}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Sifat Surat:</span>
            <span className="font-semibold text-amber-700">{surat.sifat}</span>
          </div>
          <div className="col-span-2 sm:col-span-4 pt-1 border-t border-slate-200">
            <span className="text-slate-500">Perihal: </span>
            <span className="font-medium text-slate-900">{surat.perihal}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Section 1: Diteruskan Kepada */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              1. Diteruskan Kepada (Pilih Pejabat Terkait):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {targetDisposisiList.map(target => {
                const checked = tujuanSelected.includes(target);
                return (
                  <button
                    key={target}
                    type="button"
                    onClick={() => toggleTujuan(target)}
                    className={`flex items-center justify-between px-3 py-2 border rounded text-left transition-colors ${
                      checked 
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{target}</span>
                    {checked && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Instruksi / Petunjuk */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">
              2. Petunjuk / Instruksi Pimpinan:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {instruksiDisposisiOptions.map(instr => {
                const checked = instruksiSelected.includes(instr);
                return (
                  <button
                    key={instr}
                    type="button"
                    onClick={() => toggleInstruksi(instr)}
                    className={`flex items-center justify-between px-3 py-2 border rounded text-left transition-colors ${
                      checked 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-medium' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px]">{instr}</span>
                    {checked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Catatan Khusus & Tenggat Waktu */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                3. Catatan Khusus Pimpinan / Arahan Tambahan:
              </label>
              <textarea
                value={catatanKhusus}
                onChange={e => setCatatanKhusus(e.target.value)}
                rows={3}
                placeholder="Tuliskan catatan teknis atau batas pelaksanaan..."
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Batas Waktu (Deadline):
                </label>
                <input
                  type="date"
                  value={tenggatWaktu}
                  onChange={e => setTenggatWaktu(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Status Tindak Lanjut:
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-medium"
                >
                  <option value="Belum Ditindaklanjuti">Belum Ditindaklanjuti</option>
                  <option value="Sedang Diproses">Sedang Diproses</option>
                  <option value="Selesai">Selesai (Tuntas)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Catatan Tindak Lanjut Penerima */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              4. Laporan / Catatan Pelaksanaan dari Penerima Disposisi:
            </label>
            <input
              type="text"
              value={tindakLanjutCatatan}
              onChange={e => setTindakLanjutCatatan(e.target.value)}
              placeholder="Contoh: Telah dikoordinasikan dengan tim sarpras pada tanggal 16 Oktober 2026..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Disposisi dicatat secara permanen di audit trail kearsipan SMAN 9 Surabaya.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-xs transition-colors"
              >
                Simpan & Perbarui Disposisi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
